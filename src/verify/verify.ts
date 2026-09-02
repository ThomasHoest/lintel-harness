/**
 * `verify` — recomputation, the digest gate, six states. T-1001.
 *
 * ── What makes this a check rather than a claim ───────────────────────
 *
 * `verify` reads `.harness/manifest.json` and `.harness/pack/`, **re-runs
 * phase 2 entirely in memory**, and compares to disk. It **writes
 * nothing, ever** — no lock, no journal, no network — and does not need
 * the CLI that performed the apply to still be installed.
 *
 * That is the whole of Q-43's bet: the manifest holds **no per-file
 * hashes**, because applied state is *recomputable* from payload + recipe
 * + answers. This function is that recomputation, and it is also the
 * identity `update` uses to compute `expected_old`.
 *
 * ── Three gates, in order, and two of them suppress the comparison ────
 *
 *   1. `payloadDigest` — **fail closed**. On mismatch,
 *      `E-PAYLOAD-DIGEST-MISMATCH`, exit 2, and the tree comparison is
 *      **suppressed entirely**: `entries` empty, zero per-path rows.
 *      Not a convenience — the expectation is computed **from** the
 *      payload, so an untrusted payload makes every row downstream a
 *      confident statement derived from unknown input.
 *   2. Recorded answers, re-validated against their own declarations
 *      (C-29). `E-MANIFEST-ANSWER-INVALID`, exit 2, comparison **also
 *      suppressed**, on the same reasoning: the answers are the other
 *      input to the recomputation.
 *   3. Only then, recompute and compare.
 *
 * ── What is not reported ──────────────────────────────────────────────
 *
 * **Files the recipe does not produce are not reported.** A project has
 * its own content; `verify` is not an inventory of the repository, it is a
 * statement about the paths this pack claims to produce.
 */
import { DiagnosticBag } from '../diag/diagnostic.js';
import { checkRecordedAnswers, type Answer } from '../pack/parameters.js';
import { isTreeDigest, type TreeDigest } from '../hash/digest.js';
import { compareOne, countByState, failingEntries, type VerifyEntry, type VerifyState } from './compare.js';
import type { AppliedPath } from '../security/confine.js';
import type { ParameterDecl } from '../pack/types.js';

export interface VerifyInput {
  /** The digest recorded in the manifest. */
  readonly recordedDigest: string;
  /** The digest computed over `.harness/pack/` **now**. */
  readonly computedDigest: TreeDigest;
  readonly declarations: readonly ParameterDecl[];
  readonly recordedAnswers: ReadonlyMap<string, Answer>;
  /**
   * The recomputation: what phase 2 produces for each path it claims,
   * with the two declared sets. Supplied by the caller because this
   * module runs no plan — E-04 and E-05 own that, and a `verify` that
   * re-derived it would be a second implementation of the apply.
   */
  readonly recomputed: readonly RecomputedPath[];
  /** What is on disk, for the paths above only. */
  readonly onDisk: (path: AppliedPath) => { bytes: Buffer; mode: number | null } | null;
}

export interface RecomputedPath {
  readonly path: AppliedPath;
  readonly bytes: Buffer;
  readonly mode: number;
  readonly adaptExpected: boolean;
  readonly fillExpected: boolean;
}

export interface VerifyResult {
  /** **Empty whenever a gate suppressed the comparison.** A caller must
   *  not read emptiness as "nothing to check". */
  readonly entries: readonly VerifyEntry[];
  readonly counts: Readonly<Record<VerifyState, number>>;
  /** True iff a gate fired and the tree comparison did not run. */
  readonly suppressed: boolean;
  readonly digest: {
    readonly recorded: string;
    readonly computed: string;
    readonly matched: boolean;
  };
  readonly bag: DiagnosticBag;
}

export function verifyProject(input: VerifyInput): VerifyResult {
  const bag = new DiagnosticBag();
  const digestMatched =
    isTreeDigest(input.recordedDigest) && input.recordedDigest === input.computedDigest;

  const empty = (): VerifyResult => ({
    entries: [],
    counts: countByState([]),
    suppressed: true,
    digest: { recorded: input.recordedDigest, computed: input.computedDigest, matched: digestMatched },
    bag,
  });

  // GATE 1. Fail closed, and suppress: every row below would be derived
  // from a payload nobody can vouch for.
  if (!digestMatched) {
    bag.add('E-PAYLOAD-DIGEST-MISMATCH', {
      values: { recorded: input.recordedDigest, computed: input.computedDigest },
    });
    return empty();
  }

  // GATE 2. C-29's read-back half. The answers are the recomputation's
  // other input, so the same suppression rule applies for the same reason.
  const answerFaults = checkRecordedAnswers(input.declarations, input.recordedAnswers);
  if (answerFaults.length > 0) {
    for (const d of answerFaults.items) bag.push(d);
    return empty();
  }

  const entries: VerifyEntry[] = [];
  for (const r of input.recomputed) {
    const found = input.onDisk(r.path);
    entries.push(
      compareOne({
        path: r.path,
        expected: r.bytes,
        actual: found?.bytes ?? null,
        expectedMode: r.mode,
        actualMode: found?.mode ?? null,
        adaptExpected: r.adaptExpected,
        fillExpected: r.fillExpected,
      }),
    );
  }

  const failing = failingEntries(entries);
  if (failing.length > 0) {
    // `adapted`, `filled` and `unfilled` are neither listed nor counted —
    // a report that counted them would make a correct project look wrong.
    bag.add('E-VERIFY-MISMATCH', {
      values: { n: String(failing.length), total: String(entries.length) },
      // A LIST slot, not a value: expansion is the emitter's decision
      // about a slot it built, and a value containing newlines would be a
      // forged line (C-50). F1 v5.2.
      lists: { paths: failing.slice(0, 10).map((e) => `${e.path} — ${e.state}`) },
    });
  }

  return {
    entries,
    counts: countByState(entries),
    suppressed: false,
    digest: { recorded: input.recordedDigest, computed: input.computedDigest, matched: true },
    bag,
  };
}
