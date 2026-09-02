/**
 * `lintel harness validate <pack> | --all [--strict] [--json]`. T-0905.
 *
 * **Shaping only.** Like `verify.ts`, this module holds pure functions —
 * the `--json` document, the exit code and the human summary — and touches
 * no process and no filesystem beyond the one `runValidate` needs to load
 * the packs. That is what makes the whole surface testable in-process,
 * which is the property the exit contract is asserted through.
 *
 * ── The exit rule, and the flag that does not exist ───────────────────
 *
 *   0  no findings
 *   0  `notice`-class findings only — **under every flag, `--strict`
 *      included**. A notice reports a state the pack declared on purpose;
 *      a flag that could promote one would recreate exactly the problem
 *      Q-60 split the severity to solve, which is `validate --all
 *      --strict` being unable to exit 0 for a correct pack.
 *   1  `defect`-class warnings, **and only under `--strict`**
 *   2  any error
 *
 * All four are `exitCodeFor`'s, which is where the rule lives. This module
 * chooses the flag, not the semantics.
 *
 * **There is no `--allow-stale-shared`, and no flag anywhere in this CLI
 * downgrades an integrity check** (IM-41; C-10 collapsed into that
 * stronger form). `--strict` only ever makes the exit code *worse*.
 *
 * ── Prose in a command module ─────────────────────────────────────────
 *
 * `DEVELOPING.md` rule 2 puts every user-facing string in `src/diag/`,
 * because F1 makes the **code** the stable contract. The findings obey it
 * — every one of them is a catalogue message. The two summary lines below
 * do not, and they are here for the reason `consent.ts` gives for
 * `DISCLOSURE_TEXT`: **F1 specifies no code for them**, and inventing one
 * would put a presentational line into the product's only error
 * catalogue. US-8 requires the combination count to be printed and US-16
 * requires a run to be readable; neither has a code. They are kept in one
 * table so a change lands in one place, and no test asserts their prose.
 */
import { exitClassFor } from '../../diag/codes.js';
import { escapeLine, escapeValue } from '../../diag/escape.js';
import { exitCodeFor, type Diagnostic, type ExitCode } from '../../diag/diagnostic.js';
import { bundledPackNames } from '../../pack/load-pack.js';
import { validatePackByName, type PackReport, type ValidateResult } from '../../validate/validate-pack.js';

/** The one place `validate`'s own prose lives. See the module header. */
export const VALIDATE_TEXT = {
  ok: 'validated, no findings.',
  findings: 'validated:',
  combinations: 'parameter combinations:',
  unreadable: 'could not be read as a pack.',
} as const;

/* ── the `--json` document ───────────────────────────────────────────── */

/** A diagnostic as either surface emits it.
 *
 *  `class` is present iff the diagnostic **has** one — it is absent on an
 *  error, exactly as the catalogue has it. `classOf` is total and would
 *  return `'defect'` for an error, putting a meaningless class on every
 *  error in a contract CI reads to count *promotable* findings. */
export interface DiagnosticJson {
  readonly code: string;
  readonly severity: string;
  readonly class?: string;
  readonly exit: number;
  readonly message: string;
  readonly path?: string;
  readonly line?: number;
  readonly step?: number;
}

/** The `PackReport` as JSON: the report, with its diagnostics shaped.
 *  **Both surfaces emit this** — `validate --json` for one pack and
 *  `pack info --json` — so the two cannot disagree about a byte. */
export type PackReportJson = Omit<PackReport, 'diagnostics'> & {
  readonly diagnostics: readonly DiagnosticJson[];
};

export function diagnosticJson(d: Diagnostic): DiagnosticJson {
  return {
    code: d.code,
    severity: d.severity,
    ...(d.class === undefined ? {} : { class: d.class }),
    exit: exitClassFor(d.code),
    message: d.message,
    ...(d.path === undefined ? {} : { path: d.path }),
    ...(d.line === undefined ? {} : { line: d.line }),
    ...(d.step === undefined ? {} : { step: d.step }),
  };
}

export function packReportJson(report: PackReport): PackReportJson {
  return { ...report, diagnostics: report.diagnostics.map(diagnosticJson) };
}

/**
 * `validate --json`.
 *
 * **One pack emits the report itself, not a wrapper.** US-29 requires
 * `pack info --json` to emit *"the `PackReport` verbatim"*, and T-0908
 * asserts the two surfaces produce identical bytes for one pack — a
 * wrapper here would make that assertion false while both surfaces were
 * correct. `--all` has no such constraint and emits the array.
 */
export function validateJson(reports: readonly PackReport[]): PackReportJson | readonly PackReportJson[] {
  const all = reports.map(packReportJson);
  return all.length === 1 ? (all[0] as PackReportJson) : all;
}

/* ── the exit code ───────────────────────────────────────────────────── */

/** Every diagnostic across every pack, including packs that never loaded
 *  far enough to produce a report. */
export function allDiagnostics(results: readonly ValidateResult[]): readonly Diagnostic[] {
  return results.flatMap((r) => (r.report === undefined ? r.bag.items : r.report.diagnostics));
}

export function validateExitCode(results: readonly ValidateResult[], strict: boolean): ExitCode {
  return exitCodeFor(allDiagnostics(results), strict);
}

/* ── the human summary ───────────────────────────────────────────────── */

/**
 * The lines a run prints, in order: each pack's findings, then its
 * one-line verdict.
 *
 * Findings are printed **in the order they were found**, which is US-16's
 * fixed check order — a reader following the fourteen steps needs the
 * output to match them, so nothing here sorts by severity.
 */
export function summaryLines(named: readonly { name: string; result: ValidateResult }[]): readonly string[] {
  const lines: string[] = [];
  for (const { name, result } of named) {
    const diagnostics = result.report === undefined ? result.bag.items : result.report.diagnostics;
    for (const d of diagnostics) {
      // Already escaped by the catalogue. Escaping a second time would
      // render a `\n` a user cannot read back to the message they got.
      for (const line of d.message.split('\n')) lines.push(line);
    }

    if (result.report === undefined) {
      lines.push(`lintel: ${escapeValue(name)} ${escapeLine(VALIDATE_TEXT.unreadable)}`);
      continue;
    }
    const counts = countFindings(result.report.diagnostics);
    lines.push(
      diagnostics.length === 0
        ? `lintel: ${escapeValue(name)} ${escapeLine(VALIDATE_TEXT.ok)}`
        : `lintel: ${escapeValue(name)} ${escapeLine(VALIDATE_TEXT.findings)} ` +
          `${counts.errors} error, ${counts.defects} defect, ${counts.notices} notice`,
    );
    // US-8: the combination count is printed.
    lines.push(
      `  ${escapeLine(VALIDATE_TEXT.combinations)} ${String(result.report.combinations)}`,
    );
  }
  return lines;
}

/** The three numbers CI cares about. **Counted from the class field**, not
 *  from a code list a consumer would have to maintain — which is the whole
 *  point of emitting `class` (Q-60). */
export function countFindings(diagnostics: readonly Diagnostic[]): {
  readonly errors: number;
  readonly defects: number;
  readonly notices: number;
} {
  let errors = 0;
  let defects = 0;
  let notices = 0;
  for (const d of diagnostics) {
    if (d.severity === 'error') errors += 1;
    else if (d.class === 'notice') notices += 1;
    else defects += 1;
  }
  return { errors, defects, notices };
}

/* ── running it ──────────────────────────────────────────────────────── */

export interface RunValidateInput {
  /** Pack names, or `--all`'s resolution. Empty ⇒ every bundled pack. */
  readonly packs?: readonly string[];
  readonly cliVersion: string;
}

export interface RunValidateOutput {
  readonly named: readonly { name: string; result: ValidateResult }[];
  readonly reports: readonly PackReport[];
}

/**
 * Load and validate the named packs, in name order.
 *
 * Name order rather than argument order: `--all` and an explicit list must
 * produce the same output for the same set, or CI comparing two runs is
 * comparing an argument order.
 */
export async function runValidate(input: RunValidateInput): Promise<RunValidateOutput> {
  const names = [...(input.packs ?? (await bundledPackNames()))].sort();
  const named: { name: string; result: ValidateResult }[] = [];
  for (const name of names) {
    named.push({ name, result: await validatePackByName(name, input.cliVersion) });
  }
  return {
    named,
    reports: named.flatMap((n) => (n.result.report === undefined ? [] : [n.result.report])),
  };
}
