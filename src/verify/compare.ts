/**
 * The six states, and the rule that inverts between two pairs. T-1002.
 *
 * ── The enumeration is closed, and it is six ──────────────────────────
 *
 *   match      recomputed bytes equal what is on disk.
 *   adapted    differs, and the path is in the **adapt-expected** set.
 *   filled     differs, and the path is in the **fill-expected** set.
 *   unfilled   MATCHES, and the path is in the fill-expected set.
 *   differs    differs, and the path is in neither set.
 *   missing    the recipe produces it and it is not on disk.
 *
 * ── The inversion, which is the thing to get right ────────────────────
 *
 * `adapted` and `filled` both mean *differs, and that was expected*.
 * **`unfilled` means MATCHES, and that is the finding.**
 *
 * For an adapt-expected path, matching is unremarkable: nothing has
 * rewritten `CLAUDE.md` yet. For a fill-expected path, matching means the
 * user **has not done the thing the pack asked of them** — which is the
 * single most useful thing `verify` can tell a project owner, and is
 * invisible under `match`.
 *
 * **Implementing it the same way round as `adapted` would silently report
 * every unfilled brief as `match`**, which is precisely the defect Q-79
 * exists to fix: through v2.9, US-33's green run — the acceptance test for
 * S7 — passed only because nobody had filled in a `project-brief.md`. The
 * first person to fill one would have turned the release gate red, and the
 * gate would have been right by its own rules and useless.
 *
 * ── The state names what was found, never what was permitted ──────────
 *
 * A path in the adapt-expected set that still matches byte for byte is
 * **`match`, not `adapted`**. The distinction is what keeps the report a
 * statement about the project rather than about the recipe.
 *
 * ── Comparison, and what it deliberately ignores ──────────────────────
 *
 * Normalized for text, raw for binary — so a CRLF checkout and an added
 * BOM both read `match`. Same rule as the payload digest, and the same
 * stated cost: a pure line-ending edit is undetectable.
 *
 * The executable bit is compared **only where the platform represents
 * it**. On Windows the row carries `modeChecked: false`, so the report
 * **says a check did not run** rather than implying one did.
 */
import { normalizeText, isBinary } from '../hash/normalize.js';
import type { AppliedPath } from '../security/confine.js';

/** **Closed at six** (Q-56, Q-79). A seventh state is a spec change. */
export const VERIFY_STATES = [
  'match',
  'adapted',
  'filled',
  'unfilled',
  'differs',
  'missing',
] as const;

export type VerifyState = (typeof VERIFY_STATES)[number];

/**
 * The three states that are **not** failures.
 *
 * `adapted`, `filled` and `unfilled` are each a declared, expected
 * condition of a working project. None counts toward
 * `E-VERIFY-MISMATCH`, and none moves the exit code.
 */
export const NON_FAILING_STATES: readonly VerifyState[] = ['match', 'adapted', 'filled', 'unfilled'];

export interface VerifyEntry {
  readonly path: AppliedPath;
  readonly state: VerifyState;
  /** False where the platform does not represent a mode — Windows. The
   *  report says so rather than implying a check ran. */
  readonly modeChecked: boolean;
  /** Present only when the mode was checked and disagreed. */
  readonly modeDiffers?: boolean;
}

export interface CompareInput {
  readonly path: AppliedPath;
  /** What phase 2 recomputes for this path. */
  readonly expected: Buffer;
  /** What is on disk, or `null` when the path is absent. */
  readonly actual: Buffer | null;
  readonly expectedMode: number;
  /** `null` where the platform does not represent a mode. */
  readonly actualMode: number | null;
  readonly adaptExpected: boolean;
  readonly fillExpected: boolean;
}

/**
 * Compare one recomputed path against disk.
 *
 * `fillExpected` is checked **before** `adaptExpected` in the differing
 * branch. It cannot matter for a valid pack — a step declaring both is
 * `E-RECIPE-STEP-INVALID` — but an order that only works because a
 * validator ran first is an order that breaks when someone calls this
 * directly.
 */
export function compareOne(input: CompareInput): VerifyEntry {
  const { path, expected, actual, adaptExpected, fillExpected } = input;
  const modeChecked = input.actualMode !== null;

  if (actual === null) {
    return { path, state: 'missing', modeChecked: false };
  }

  const same = contentEqual(expected, actual);

  // THE INVERSION. A fill-expected path that matches is the finding, not
  // the quiet case — see the header.
  const state: VerifyState = same
    ? fillExpected
      ? 'unfilled'
      : 'match'
    : fillExpected
      ? 'filled'
      : adaptExpected
        ? 'adapted'
        : 'differs';

  const modeDiffers = modeChecked && input.actualMode !== input.expectedMode;
  return modeDiffers
    ? { path, state, modeChecked, modeDiffers }
    : { path, state, modeChecked };
}

/**
 * Content equality under the text/binary rule.
 *
 * **Both sides are classified, not just one.** A file that is text in the
 * payload and binary on disk has been replaced with something else, and
 * comparing a normalized string against raw bytes would be comparing two
 * different kinds of thing.
 */
export function contentEqual(expected: Buffer, actual: Buffer): boolean {
  const expectedBinary = isBinary(expected);
  if (expectedBinary !== isBinary(actual)) return false;
  if (expectedBinary) return Buffer.compare(expected, actual) === 0;
  return normalizeText(expected) === normalizeText(actual);
}

/** Counts per state, all six present so a reader never has to infer a
 *  zero from an absent key — `--json` emits this verbatim. */
export function countByState(entries: readonly VerifyEntry[]): Readonly<Record<VerifyState, number>> {
  const counts = Object.fromEntries(VERIFY_STATES.map((s) => [s, 0])) as Record<VerifyState, number>;
  for (const e of entries) counts[e.state]++;
  return counts;
}

/** The paths that fail. `adapted`, `filled` and `unfilled` are **neither
 *  listed nor counted** — a report that listed them would make a correct
 *  project look wrong. */
export function failingEntries(entries: readonly VerifyEntry[]): readonly VerifyEntry[] {
  return entries.filter((e) => !NON_FAILING_STATES.includes(e.state));
}
