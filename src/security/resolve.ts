/**
 * Confinement stages 3 and 4 — the halves that touch a filesystem.
 * T-0204, T-0205.
 *
 * **Confinement is by resolution, not by string** (F1 §Technical Context,
 * C-4). Stages 1 and 2 in `confine.ts` inspect a declared path and say
 * nothing about the filesystem it will meet; these two look.
 *
 * The split matters operationally: `validate` has **no project root**, so
 * it runs stages 1–2 and stops. Only `plan` and the writer reach here.
 */
import { lstat, realpath } from 'node:fs/promises';
import { isAbsolute, resolve as resolvePath, sep } from 'node:path';
import { DiagnosticBag } from '../diag/diagnostic.js';
import type { AppliedPath, ConfineContext } from './confine.js';

/** A project root resolved **once per run** with `realpath()`. Resolving
 *  per path would let the root itself change under the apply. */
declare const RootBrand: unique symbol;
export type ProjectRoot = string & { readonly [RootBrand]: 'ProjectRoot' };

export interface RootResult {
  readonly root?: ProjectRoot;
  readonly bag: DiagnosticBag;
}

/**
 * Resolve the project root, once.
 *
 * `realpath` and not `resolve`: if the root is itself reached through a
 * symlink, every descendant check below must compare against where it
 * really is, or a path that is "inside" by string is outside in fact.
 */
export async function resolveRoot(dir: string): Promise<RootResult> {
  const bag = new DiagnosticBag();
  try {
    const real = await realpath(resolvePath(dir));
    return { root: real as ProjectRoot, bag };
  } catch (e) {
    bag.add('E-WRITE-FAILED', {
      values: { path: dir, errno: (e as NodeJS.ErrnoException).code ?? 'ENOENT' },
    });
    return { bag };
  }
}

export interface ResolveResult {
  /** The absolute path to write, present iff every check passed. */
  readonly absolute?: string;
  readonly bag: DiagnosticBag;
}

/**
 * **Stage 3** — resolution confinement, at plan time.
 *
 * Walks the ancestors **top-down**, `lstat`ing each, and refuses any
 * reparse point. Then joins the resolved parent with the final basename
 * and requires the result to be a **strict descendant** of the resolved
 * root.
 *
 * **Top-down, and `lstat` rather than `stat`**, both deliberately.
 * `stat` follows links, so it answers a question about the target rather
 * than about the path — a symlinked ancestor would report as an ordinary
 * directory and the escape would pass. Walking top-down means the first
 * link encountered is reported, rather than a deeper failure whose cause
 * is an ancestor the message never names.
 *
 * **A missing ancestor is not a fault.** The apply creates directories as
 * it goes; a path whose parents do not exist yet is the normal case, and
 * only what *does* exist can be checked.
 */
export async function confineResolved(
  root: ProjectRoot,
  path: AppliedPath,
  ctx: ConfineContext,
): Promise<ResolveResult> {
  const bag = new DiagnosticBag();
  const segments = path.split('/');
  const basename = segments[segments.length - 1] as string;
  const ancestors = segments.slice(0, -1);

  let current = root as string;
  for (const seg of ancestors) {
    current = resolvePath(current, seg);
    let st;
    try {
      st = await lstat(current);
    } catch {
      // Does not exist yet. The apply will create it, and a directory
      // that is not there cannot be a link.
      continue;
    }
    if (st.isSymbolicLink()) {
      // `component` is the ancestor that IS the link, not the destination
      // — the whole value of the message is naming which one, since a user
      // looking at the destination would see an ordinary path.
      bag.add('E-DEST-SYMLINK', { step: ctx.index, values: { component: seg, path } });
      return { bag };
    }
  }

  const absolute = resolvePath(current, basename);
  if (!isStrictDescendant(root, absolute)) {
    bag.add('E-MAP-ESCAPES-ROOT', { step: ctx.index, values: { index: String(ctx.index), to: path } });
    return { bag };
  }
  return { absolute, bag };
}

/**
 * Strict descendant, compared on **path boundaries**.
 *
 * `absolute.startsWith(root)` is the obvious test and is wrong: a root of
 * `/tmp/proj` would accept `/tmp/proj-evil/x`, which shares a prefix and
 * is a different tree. The separator is what makes it a boundary rather
 * than a prefix, and `absolute !== root` is what makes it *strict* — the
 * root itself is not a destination.
 */
export function isStrictDescendant(root: string, absolute: string): boolean {
  if (absolute === root) return false;
  if (!isAbsolute(absolute)) return false;
  const prefix = root.endsWith(sep) ? root : root + sep;
  return absolute.startsWith(prefix);
}

/**
 * **Stage 4** — `confineAtWrite()`, immediately before each write.
 *
 * C-14: **the plan's `lstat` is stale by the time the write happens.**
 * Between planning and writing, an ancestor can become a symlink — the
 * window is small and entirely sufficient, and nothing else closes it.
 * Re-running stage 3 here is the whole of the mitigation.
 *
 * Returns the absolute path the caller may write, or diagnostics. It does
 * **not** open the file: exclusive creation belongs to the atomic writer
 * (E-11), and splitting them keeps this module free of any write.
 */
export async function confineAtWrite(
  root: ProjectRoot,
  path: AppliedPath,
  ctx: ConfineContext,
): Promise<ResolveResult> {
  return confineResolved(root, path, ctx);
}
