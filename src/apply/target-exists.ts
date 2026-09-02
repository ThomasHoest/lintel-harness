/**
 * `E-TARGET-EXISTS` and `--force`. T-1108, N-5, C-13, C-36.
 *
 * `init` into a tree where any target applied path already exists fails,
 * listing the first ten colliding paths and the total. `--force` proceeds
 * **only** for paths whose existing content is **byte-identical** — it is
 * not "overwrite anyway", it is "these files are already what I would
 * write, so writing them changes nothing."
 *
 * ── Every comparison resolves by `collisionKey`, unconditionally ──────
 *
 * All three of them: the **existence** test, the **byte-identity** test,
 * and the journal's **`preExisting`** determination. On every platform,
 * with no `process.platform` check anywhere.
 *
 * **This is a rollback-safety requirement, not tidiness.** Under exact
 * string comparison, a project holding `.claude/Settings.json` and a step
 * writing `.claude/settings.json` are **the same file** on macOS and
 * Windows. So:
 *
 *   1. the existence test misses it — the paths differ as strings;
 *   2. the apply silently **overwrites the user's file**;
 *   3. the journal records `preExisting: false`, so **no backup is taken**;
 *   4. `--rollback` then **deletes a file it did not create**.
 *
 * That is the exact invariant C-13 and G-F1-6 both state, broken by one
 * `===`. And it must be unconditional rather than platform-gated, because
 * a plan computed on Linux is rolled back on the machine that ran it — but
 * a repository is shared, and the case-folding filesystem is not
 * necessarily the one that planned.
 */
import { DiagnosticBag } from '../diag/diagnostic.js';
import { collisionKey } from '../security/confine.js';
import { hashBytes } from '../hash/sha256.js';
import type { PlannedFile } from './plan.js';

/** What is on disk, keyed however the caller found it. The **key** is
 *  what matters; the caller supplies the real spelling so a diagnostic can
 *  name the file as the user has it (C-36). */
export interface ExistingFile {
  /** The on-disk spelling, which may differ in case from the planned one. */
  readonly path: string;
  readonly bytes: Buffer;
}

export interface TargetCheck {
  /** True iff the apply may proceed. */
  readonly ok: boolean;
  /** Paths that exist and are **not** byte-identical — the ones `--force`
   *  does not excuse. */
  readonly blocking: readonly string[];
  /** Paths that exist and **are** byte-identical. Under `--force` these
   *  proceed; without it they still block, because the user did not ask
   *  to apply into a non-empty tree. */
  readonly identical: readonly string[];
  readonly bag: DiagnosticBag;
}

/**
 * Check a plan's phase-2 destinations against what is on disk.
 *
 * Phase 1 is excluded: `.harness/pack/` is the CLI's own tree, and an
 * existing one is `E-ALREADY-APPLIED`'s business rather than this check's.
 */
export function checkTargets(
  files: readonly PlannedFile[],
  existing: readonly ExistingFile[],
  force: boolean,
): TargetCheck {
  const bag = new DiagnosticBag();

  // Keyed by `collisionKey` on BOTH sides. See the header for what a
  // string comparison here costs.
  const onDisk = new Map(existing.map((e) => [collisionKey(e.path), e]));

  const blocking: string[] = [];
  const identical: string[] = [];

  for (const f of files) {
    if (f.phase !== 2) continue;
    const found = onDisk.get(collisionKey(f.path));
    if (found === undefined) continue;

    // Byte-identity, also decided after the key match — so the file
    // compared is the one that will actually be overwritten.
    if (hashBytes(found.bytes) === hashBytes(f.bytes)) {
      identical.push(found.path);
    } else {
      blocking.push(found.path);
    }
  }

  // Without `--force`, an existing target blocks whether or not it is
  // identical: the user asked to apply into a directory and it was not
  // empty, which is a fact they should learn before anything is written.
  const refused = force ? blocking : [...blocking, ...identical];

  if (refused.length > 0) {
    bag.add('E-TARGET-EXISTS', {
      values: { n: String(refused.length) },
      lists: { paths: refused.slice(0, 10) },
    });
  }

  return { ok: refused.length === 0, blocking, identical, bag };
}

/**
 * Whether a planned file should be journalled as pre-existing.
 *
 * **The third of the three comparisons**, and the one whose failure is
 * silent: a wrong `false` here means no backup is taken, and rollback
 * deletes a file it did not create.
 */
export function preExistingByKey(
  path: string,
  existing: readonly ExistingFile[],
): ExistingFile | null {
  const key = collisionKey(path);
  return existing.find((e) => collisionKey(e.path) === key) ?? null;
}
