/**
 * The atomic writer. T-1101, C-14, U-11.
 *
 * ── `link` then `unlink`, not `rename` — and the difference is real ───
 *
 * A destination the plan expects to be **new** is claimed by
 * `link(tmp, dest)` followed by `unlink(tmp)`. `link` fails **`EEXIST`**
 * if the destination appeared between planning and writing;
 * **`rename` silently overwrites it**. That window is not theoretical —
 * a plan is computed, a disclosure is shown, a human reads it, and only
 * then does the write happen.
 *
 * So the two cases are genuinely different operations:
 *
 *   NEW         `link` + `unlink`. Exclusive-create semantics: if the
 *               path exists now, the plan was wrong about the project and
 *               the run stops.
 *   OVERWRITE   `rename`. The plan already knows the file is there, it is
 *               journalled with its pre-hash and its backup, and
 *               replacing it is the intent.
 *
 * ── The fallback narrows the guarantee, and says so ───────────────────
 *
 * Where `link` is unavailable (`EPERM`, `ENOSYS` — some Windows volumes,
 * some container filesystems) it falls back to `open(dest, 'wx')` then
 * `rename`, which is still atomic but no longer proves exclusivity across
 * the same instant. **`W-LINK-FALLBACK`, class `notice`** — the CLI is
 * reporting a narrowing it could not avoid, and no pack or user change
 * would clear it, which is exactly what `notice` means.
 *
 * That code exists because US-13 required *"record the narrowed
 * guarantee"* from v2.0 while providing no code, making the requirement
 * assertable only by **string-matching a message** — the one thing
 * §Error States forbids.
 *
 * ── `WritablePath`, never `string` (C-14) ─────────────────────────────
 *
 * The only two ways to obtain one are `confinePath` and `harnessPath`, so
 * *"write to a path that skipped the gate"* is a **compile error** rather
 * than a rule somebody remembers.
 */
import { link, mkdir, open, rename, rm, stat, unlink, writeFile } from 'node:fs/promises';
import { dirname, join, sep } from 'node:path';
import { DiagnosticBag } from '../diag/diagnostic.js';
import type { WritablePath } from '../security/harness-paths.js';

export interface WriteRequest {
  /**
   * Which command is writing — `'init'` or `'update'`.
   *
   * **Required, and deliberately not defaulted.** `E-WRITE-FAILED` and
   * `E-TARGET-RACE` both render `→ lintel harness {command} --rollback`,
   * and a default of `'init'` would send a user recovering a crashed
   * `update` to a command that answers `E-ALREADY-APPLIED` and leaves the
   * journal exactly where it was. That is the fault F3-R3 raised, fixed
   * once for `E-JOURNAL-PRESENT` and found again in these two codes
   * (F1 v5.9) — *a remedy that cannot work is worse than none, because
   * the user believes they tried it.*
   *
   * This module cannot know the command, so it is told. Making the field
   * required is what stops the next caller forgetting.
   */
  readonly command: 'init' | 'update';
  readonly path: WritablePath;
  readonly bytes: Buffer;
  readonly mode: number;
  /** True when the plan says this path does not exist. Selects
   *  exclusive-create semantics; see the header. */
  readonly expectNew: boolean;
}

export interface WriteOutcome {
  /** Directories this write created, **in creation order** — the journal
   *  records them so rollback can remove them in reverse. */
  readonly createdDirs: readonly string[];
  readonly bag: DiagnosticBag;
  /** False when nothing was written and the caller must stop. */
  readonly ok: boolean;
}

/** `0755` for every directory the CLI creates, reading no source mode —
 *  the same C-26 reasoning phase 1 uses for files. */
export const DIR_MODE = 0o755;

/**
 * Write one file atomically under `root`.
 *
 * The temp file is a **sibling** of the destination, never in `/tmp`:
 * `rename` and `link` are only atomic within one filesystem, and a temp
 * directory is routinely on another.
 */
export async function atomicWrite(
  root: string,
  req: WriteRequest,
  existingDirs: Set<string> = new Set(),
): Promise<WriteOutcome> {
  const bag = new DiagnosticBag();
  const dest = join(root, ...req.path.split('/'));
  const dir = dirname(dest);

  const createdDirs = await ensureDir(dir, existingDirs);

  // `wx` on the temp file too: a leftover temp from a crashed run must not
  // be silently reused, because its contents are unknown.
  const tmp = `${dest}.lintel-${process.pid}-${counter++}.tmp`;
  try {
    const handle = await open(tmp, 'wx', req.mode);
    try {
      await handle.writeFile(req.bytes);
    } finally {
      await handle.close();
    }
  } catch (e) {
    bag.add('E-WRITE-FAILED', { values: { path: req.path, errno: errnoOf(e), command: req.command } });
    return { createdDirs, bag, ok: false };
  }

  try {
    if (req.expectNew) {
      await claimNew(tmp, dest, req, bag);
    } else {
      await rename(tmp, dest);
    }
  } catch (e) {
    await rm(tmp, { force: true });
    if (isEexist(e)) {
      bag.add('E-TARGET-RACE', {
        values: {
          path: req.path,
          detail: 'the plan expected to create it, and it exists now',
          command: req.command,
        },
      });
    } else {
      bag.add('E-WRITE-FAILED', { values: { path: req.path, errno: errnoOf(e), command: req.command } });
    }
    return { createdDirs, bag, ok: false };
  }

  return { createdDirs, bag, ok: true };
}

let counter = 0;

/**
 * Claim a destination the plan expects to be new.
 *
 * `link` is tried first because it is the only call that **fails** when
 * the destination exists. The fallback is atomic but weaker, and the
 * weakening is reported rather than absorbed.
 */
async function claimNew(
  tmp: string,
  dest: string,
  req: WriteRequest,
  bag: DiagnosticBag,
): Promise<void> {
  try {
    await link(tmp, dest);
    await unlink(tmp);
    return;
  } catch (e) {
    if (isEexist(e)) throw e; // a real race — not a reason to fall back.
    const code = errnoOf(e);
    if (code !== 'EPERM' && code !== 'ENOSYS' && code !== 'EXDEV') throw e;

    // The narrowed guarantee, reported with a code so it is assertable
    // without string-matching a message.
    bag.add('W-LINK-FALLBACK', { values: { path: req.path, errno: code } });
  }

  // `wx` still refuses an existing destination; what it cannot do is prove
  // the check and the claim happened in the same instant.
  const handle = await open(dest, 'wx', req.mode);
  await handle.close();
  await rename(tmp, dest);
}

/**
 * Create a directory and its missing ancestors, returning them **in
 * creation order**.
 *
 * Order is the contract: rollback removes them in reverse, and a set with
 * no order would leave a caller guessing which to remove first.
 */
export async function ensureDir(dir: string, known: Set<string>): Promise<readonly string[]> {
  const missing: string[] = [];
  let cur = dir;
  while (cur !== dirname(cur)) {
    if (known.has(cur)) break;
    try {
      await stat(cur);
      break;
    } catch {
      missing.push(cur);
      cur = dirname(cur);
    }
  }

  const created = missing.reverse();
  for (const d of created) {
    await mkdir(d, { mode: DIR_MODE });
    known.add(d);
  }
  return created;
}

/** Write a file with no atomicity claim — for a backup inside
 *  `.harness/journal.d/`, which nothing else reads concurrently. */
export async function writePlain(path: string, bytes: Buffer, mode = 0o644): Promise<void> {
  await mkdir(dirname(path), { recursive: true, mode: DIR_MODE });
  await writeFile(path, bytes, { mode });
}

function errnoOf(e: unknown): string {
  return (e as NodeJS.ErrnoException)?.code ?? 'unknown';
}

function isEexist(e: unknown): boolean {
  return errnoOf(e) === 'EEXIST';
}

/** Exported for the tests: the separator a `WritablePath` is joined on is
 *  POSIX, and the destination uses the platform's. */
export const PATH_SEP = sep;
