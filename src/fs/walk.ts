/**
 * The **one** bounded, non-symlink-following walk. T-0208, C-17.
 *
 * **Exactly two call sites**: the phase-1 payload walk and the `verify`
 * project scan. One implementation because the two must agree — a scan
 * that saw a file the payload walk skipped would make `verify` report
 * against a tree the apply never wrote.
 *
 * Three properties, each closing something specific:
 *
 *   BOUNDED     depth ≤ 32, ≤ 10 000 entries. `E-TRAVERSAL-LIMIT` names
 *               which bound was hit, because "the walk was too big" is
 *               not actionable and "depth 32" is.
 *   NO SYMLINKS `lstat`, never `stat`, and a link is **reported and
 *               skipped** rather than followed. Following one leaves the
 *               project — C-17's whole subject — and doing it silently is
 *               how a scan starts describing somebody else's filesystem.
 *   SKIP LIST   `.git/`, `.hg/`, `.svn/`, `node_modules/` for the project
 *               scan. Not a bound: a repository's own metadata is not
 *               applied content, and walking it would make every `verify`
 *               proportional to the user's history.
 */
import { lstat, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { DiagnosticBag } from '../diag/diagnostic.js';

export const MAX_DEPTH = 32;
export const MAX_ENTRIES = 10_000;

/** Skipped by the project scan. The payload walk passes `skip: []` —
 *  a pack shipping a `node_modules/` directory is content, and the
 *  denylist is what refuses it, not the walk. */
export const SCAN_SKIP = ['.git', '.hg', '.svn', 'node_modules'] as const;

export interface WalkEntry {
  /** Path relative to the walk root, POSIX-separated. */
  readonly path: string;
  readonly kind: 'file' | 'dir';
  /** Permission bits, or `null` where the platform does not represent
   *  them. Windows is why F1's determinism claim says "modulo the
   *  executable bit". */
  readonly mode: number | null;
  readonly size: number;
}

export interface WalkResult {
  readonly entries: readonly WalkEntry[];
  readonly bag: DiagnosticBag;
  /** True iff a bound stopped the walk. `entries` is then partial and no
   *  caller may treat it as a complete picture. */
  readonly truncated: boolean;
}

export interface WalkOptions {
  /** Directory names skipped at any depth. Defaults to `SCAN_SKIP`. */
  readonly skip?: readonly string[];
}

const REPRESENTS_MODE = process.platform !== 'win32';

/**
 * **Byte-ascending, which is not what `<` gives.**
 *
 * F1 §NFR requires a directory recursion to be walked in *byte-ascending
 * path order*, and JavaScript's `<` on strings is **UTF-16 code-unit**
 * order. The two disagree wherever an astral character is involved: a
 * surrogate pair leads with 0xD800–0xDBFF, so `<` sorts it **before**
 * U+E000–U+FFFF while its UTF-8 bytes sort it **after**.
 *
 * Invisible on every path in the three bundled packs, all of which are
 * ASCII — which is exactly why it is worth fixing rather than noticing
 * later. Walk order is a determinism claim: two applies of one pack
 * version must produce byte-identical trees, and `copy`'s directory
 * recursion consumes this order directly.
 */
function byteAscending(a: { name: string }, b: { name: string }): number {
  return Buffer.compare(Buffer.from(a.name, 'utf8'), Buffer.from(b.name, 'utf8'));
}

/**
 * Walk `root`, bounded and without following links.
 *
 * Breadth-ish, directory by directory, sorted — the order is stable
 * across platforms, which matters because two walks of the same tree must
 * produce the same list for the digest and the comparison to agree.
 */
export async function walk(root: string, options: WalkOptions = {}): Promise<WalkResult> {
  const skip = new Set(options.skip ?? SCAN_SKIP);
  const bag = new DiagnosticBag();
  const entries: WalkEntry[] = [];
  let count = 0;
  let truncated = false;

  async function visit(dir: string, rel: string, depth: number): Promise<void> {
    if (truncated) return;
    if (depth > MAX_DEPTH) {
      bag.add('E-TRAVERSAL-LIMIT', {
        values: { root, limit: 'depth', n: String(MAX_DEPTH) },
      });
      truncated = true;
      return;
    }

    let dirents;
    try {
      dirents = await readdir(dir, { withFileTypes: true });
    } catch {
      return; // unreadable is not a walk fault; the caller's checks report it
    }

    for (const d of [...dirents].sort(byteAscending)) {
      if (truncated) return;
      const childRel = rel === '' ? d.name : `${rel}/${d.name}`;
      const childAbs = join(dir, d.name);

      // lstat, never stat: stat follows the link and reports the target,
      // so a symlinked directory would be walked as if it were one.
      let st;
      try {
        st = await lstat(childAbs);
      } catch {
        continue;
      }

      if (st.isSymbolicLink()) {
        bag.add('W-SCAN-SYMLINK-SKIPPED', { values: { path: childRel } });
        continue;
      }

      if (++count > MAX_ENTRIES) {
        bag.add('E-TRAVERSAL-LIMIT', {
          values: { root, limit: 'entries', n: String(MAX_ENTRIES) },
        });
        truncated = true;
        return;
      }

      if (st.isDirectory()) {
        if (skip.has(d.name)) continue;
        entries.push({ path: childRel, kind: 'dir', mode: REPRESENTS_MODE ? st.mode & 0o777 : null, size: 0 });
        await visit(childAbs, childRel, depth + 1);
      } else if (st.isFile()) {
        entries.push({
          path: childRel,
          kind: 'file',
          mode: REPRESENTS_MODE ? st.mode & 0o777 : null,
          size: st.size,
        });
      }
      // Anything else — fifo, socket, device — is neither walked nor
      // recorded. A pack cannot ship one and a project containing one has
      // nothing the apply produced.
    }
  }

  await visit(root, '', 1);
  return { entries, bag, truncated };
}
