/**
 * `lintel harness verify [--json]`. T-1003.
 *
 * **The first command that does something.** It reads
 * `.harness/manifest.json` and `.harness/pack/`, re-runs phase 2 in
 * memory, and compares to disk — and it **writes nothing, ever**: no
 * lock, no journal, no network, no temp file. That is not a policy this
 * module follows, it is a fact about what it imports: nothing here can
 * open a file for writing.
 *
 * ── Two axes, both emitted ────────────────────────────────────────────
 *
 * `state` (`match | adapted | filled | unfilled | differs | missing`) is
 * what `verify` **found**; `class` (`defect | notice`) is what a
 * diagnostic **is**. They answer different questions and `--json` carries
 * both, because collapsing them is how a consumer ends up inferring one
 * from the other and being wrong at the first exception.
 *
 * ── The exit rule, stated over all six states ─────────────────────────
 *
 * Exit **0** when every path is `match`, `adapted`, `filled` or
 * `unfilled`; exit **1** on any `differs` or `missing`; exit **2** when a
 * gate suppressed the comparison.
 *
 * **T-1003's own text enumerates four of the six** — *"exit 0 when every
 * path is `match` or `adapted` … exit 1 on any `differs` or `missing`"* —
 * which leaves `filled` and `unfilled` in neither clause. The behaviour is
 * not in doubt: §F1's `verify` section says both are non-failure and
 * neither moves the exit code. But the task's sentence is a closed
 * enumeration written before Q-79 added two states, and it is recorded
 * here rather than quietly satisfied.
 */
import { DiagnosticBag } from '../../diag/diagnostic.js';
import { countByState, failingEntries, type VerifyEntry, type VerifyState } from '../../verify/compare.js';
import type { VerifyResult } from '../../verify/verify.js';
import { exitClassFor } from '../../diag/codes.js';

/** The `--json` document. Shaped here rather than at the call site so the
 *  contract has one definition — F3 and F6 both read it. */
export interface VerifyJson {
  readonly command: 'verify';
  /** Explicitly, all three parts: a consumer must be able to tell a
   *  digest that matched from one that was never compared. */
  readonly digest: {
    readonly recorded: string;
    readonly computed: string;
    readonly matched: boolean;
  };
  /** True iff a gate fired and no path was compared. **A consumer that
   *  read `entries: []` as "nothing to check" would report a tampered
   *  payload as a clean project.** */
  readonly suppressed: boolean;
  readonly counts: Readonly<Record<VerifyState, number>>;
  readonly entries: readonly {
    readonly path: string;
    readonly state: VerifyState;
    readonly modeChecked: boolean;
  }[];
  readonly diagnostics: readonly {
    readonly code: string;
    readonly severity: string;
    /** The **other** axis. Absent on an error, as the catalogue has it. */
    readonly class?: string;
    readonly exit: number;
  }[];
}

export function verifyExitCode(result: VerifyResult): 0 | 1 | 2 {
  if (result.suppressed) return 2;
  return failingEntries(result.entries).length > 0 ? 1 : 0;
}

export function toJson(result: VerifyResult): VerifyJson {
  return {
    command: 'verify',
    digest: result.digest,
    suppressed: result.suppressed,
    counts: countByState(result.entries),
    entries: result.entries.map((e) => ({
      path: e.path,
      state: e.state,
      modeChecked: e.modeChecked,
    })),
    diagnostics: result.bag.items.map((d) => ({
      code: d.code,
      severity: d.severity,
      // `d.class`, not `classOf(d.code)`. The latter is **total** — it
      // returns `'defect'` for an error, which every other caller avoids
      // by gating on severity first, and which would have put a
      // meaningless `"class": "defect"` on every error in this JSON
      // contract. The `Diagnostic`'s own field is already absent on an
      // error, exactly as `CodeEntry.class` documents.
      ...(d.class === undefined ? {} : { class: d.class }),
      exit: exitClassFor(d.code),
    })),
  };
}

/**
 * The human summary.
 *
 * It prints the count checked **and, separately, the count reported
 * `adapted`** — separately because they answer different questions, and a
 * single "12 checked" hides the one number a project owner asked for. The
 * two fill states are printed for the same reason, and `unfilled` is the
 * line most worth having: it is the only state that reports *matching* as
 * the finding.
 */
export function summaryLines(result: VerifyResult): readonly string[] {
  if (result.suppressed) return [];
  const c = countByState(result.entries);
  const lines = [`lintel: ${result.entries.length} applied paths checked.`];
  if (c.adapted > 0) lines.push(`  ${c.adapted} adapted — edited as the pack expects.`);
  if (c.filled > 0) lines.push(`  ${c.filled} filled in.`);
  if (c.unfilled > 0) {
    lines.push(`  ${c.unfilled} still at the template — these are yours to fill in.`);
  }
  return lines;
}

/** Paths a caller may print. `adapted`, `filled` and `unfilled` are
 *  excluded, as `E-VERIFY-MISMATCH` excludes them: listing them would make
 *  a correct project look wrong. */
export function reportableFailures(entries: readonly VerifyEntry[]): readonly VerifyEntry[] {
  return failingEntries(entries);
}

/** An empty bag typed for callers that need one before a gate runs. */
export const emptyBag = (): DiagnosticBag => new DiagnosticBag();
