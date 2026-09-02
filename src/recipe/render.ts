/**
 * The shared rendering context for the six primitives. E-05.
 *
 * ── The ops take bytes and produce bytes, and touch no disk ───────────
 *
 * Every op is a **pure function**: it reads the payload through a
 * callback and returns the writes it wants made. Nothing here opens a
 * file, and that is the same discipline the glob matcher and the write
 * set follow (C-27) — a renderer that could stat would let a pack's output
 * depend on what happened to be on the machine, and `validate` could not
 * compute the result in CI with nothing checked out.
 *
 * The **write path** — journalling, atomic replace, rollback — is E-11's.
 * Splitting them is what lets `pack info` render an apply *completely*
 * without performing it, which is the claim the whole no-script-primitive
 * argument rests on.
 *
 * ── Why this file is not in `ops/` ────────────────────────────────────
 *
 * `tests/structural/closed-op-set.test.ts` permits exactly `index.ts` and
 * one file per primitive inside `ops/`. A shared `context.ts` there would
 * fail it — correctly, since the test cannot tell a helper from a seventh
 * primitive, and a rule that has to distinguish them is a rule that can be
 * argued with.
 */
import type { DiagnosticBag } from '../diag/diagnostic.js';
import type { AppliedPath } from '../security/confine.js';
import type { Answer } from '../pack/parameters.js';

/** `0644` for everything, `0755` where a step declares `executable` and
 *  T-0508's rules permit it. Phase 1 uses a fixed `0644` (C-26); this is
 *  phase 2's, and the two are separate on purpose. */
export type FileMode = 0o644 | 0o755;

export interface RenderContext {
  /** Step index in the merged plan. Every diagnostic names it. */
  readonly index: number;
  /** Pack-relative POSIX paths of every payload **file**. */
  readonly payload: readonly string[];
  /**
   * Read one payload file, or `null` if it is not there.
   *
   * A callback rather than a directory handle: the op cannot compose a
   * path of its own, so *"read something outside the pack"* is not
   * expressible from inside a primitive.
   */
  readonly readPayload: (packRelativePath: string) => Buffer | null;
  /**
   * Applied path → the bytes written so far, in plan order.
   *
   * The editing ops read from here and write back to here, which is what
   * makes *"operates on paths that already exist"* a fact about the data
   * rather than a convention the ops agree to follow.
   */
  readonly written: Map<AppliedPath, Buffer>;
  readonly answers: ReadonlyMap<string, Answer>;
  readonly packName: string;
  readonly packVersion: string;
  readonly cliVersion: string;
}

export interface Write {
  readonly path: AppliedPath;
  readonly bytes: Buffer;
  readonly mode: FileMode;
}

/**
 * One resolved `{{harness:param.<id>}}`, recorded where it landed.
 *
 * T-0804's by-product: the disclosure `init` shows has to say *which
 * answer went into which file*, and the only moment that is known is the
 * moment it is substituted. Reconstructing it afterwards would mean
 * searching output for values, which finds coincidences.
 */
export interface Substitution {
  readonly path: AppliedPath;
  readonly id: string;
  readonly value: string;
}

export interface RenderResult {
  readonly writes: readonly Write[];
  readonly substitutions: readonly Substitution[];
  readonly bag: DiagnosticBag;
}
