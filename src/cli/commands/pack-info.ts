/**
 * `lintel harness pack info <name> [--json]`. T-0906, US-29.
 *
 * ── One report, two surfaces ──────────────────────────────────────────
 *
 * `renderPackInfo` takes the **same `PackReport`** `validate --json`
 * emits. There is exactly one report code path, so the two surfaces cannot
 * disagree — and that is structural rather than conventional: this module
 * imports the report type and **computes no row of its own**. It reads the
 * pack only, writes nothing, needs no applied project, no manifest and no
 * network.
 *
 * ── What it renders, and one thing it must not ────────────────────────
 *
 * Identity; all nine anatomy parts in fixed order with each `provisional`
 * part's note and each `absent` part's reason; scaffolds grouped by
 * category and **labelled as alternatives**; parameters with any `flag`
 * alias and an `enum`'s permitted values; **every recipe step in order**
 * as `<op>  <from> → <to>` with conditional steps marked by their `when`;
 * `parameterVaryingSteps`; and the security disclosure **in full and
 * verbatim**, through `renderDisclosure` — never re-rendered here, because
 * a second renderer is a second thing that can disagree with `init`'s
 * pre-write summary.
 *
 * **No settings section and no consent prompt.** No v1.0 pack can write
 * `.claude/settings.json` at all (US-3 stage 2 reserves both basenames
 * under every `.claude` segment), so there is no owned key to disclose and
 * nothing to consent to (Q-54). A section rendered anyway would advertise
 * a capability the product does not have.
 *
 * **Where a list is empty the command says so** rather than printing
 * nothing — a section that vanishes when empty is indistinguishable from a
 * section that was never computed.
 *
 * ── The complete step list is the control ─────────────────────────────
 *
 * §3.1 refused a script primitive on the ground that this rendering shows
 * the *complete* list of what an apply will do. That makes the rendering a
 * **control**, not a convenience, and it is why `E-RECIPE-TOO-MANY-STEPS`
 * exists (C-30): an unbounded list degrades the control continuously while
 * naming no point at which a reviewer should stop trusting it.
 *
 * ── Prose in a command module ─────────────────────────────────────────
 *
 * `DEVELOPING.md` rule 2 keeps user-facing strings in `src/diag/`, because
 * F1 makes the **code** the stable contract and a module composing its own
 * sentence has created a second contract nobody versions. `pack info` is
 * the hardest case in the product for that rule, and it is worth saying
 * what the reading is rather than leaving it implied:
 *
 *   - **every finding** this command shows is still a catalogue message,
 *     carried on the report and never re-worded here;
 *   - **the disclosure's prose is `consent.ts`'s**, reused rather than
 *     restated, so the three surfaces render identical wording;
 *   - what remains is **section headings and column labels for a report
 *     F1 specifies the content of and not the layout of.** There is no
 *     code to attach them to, and inventing one would put presentation
 *     into the error catalogue. They live in one table, `PACK_INFO_TEXT`,
 *     which is the same exception `consent.ts` documents for
 *     `DISCLOSURE_TEXT` — and no test asserts their wording, only the
 *     structure they carry.
 *
 * ── Escaping ──────────────────────────────────────────────────────────
 *
 * Every value on this page is **pack content**, which is the untrusted
 * input. A title, a description, a prompt, a `when` value and a path all
 * pass `escapeValue`; headings pass `escapeLine`. `renderDisclosure`
 * returns lines that are already escaped and are not escaped again.
 */
import { escapeLine, escapeValue } from '../../diag/escape.js';
import { renderDisclosure } from '../../security/consent.js';
import { packReportJson, type PackReportJson } from './validate.js';
import type { PackReport, ScaffoldSummary, StepSummary } from '../../validate/validate-pack.js';
import type { AnatomyRow } from '../../pack/anatomy.js';
import type { ParameterDecl } from '../../pack/types.js';
import type { StepWhen } from '../../recipe/types.js';

/** The one place `pack info`'s own prose lives. See the module header. */
export const PACK_INFO_TEXT = {
  empty: '  (none)',
  anatomy: 'Anatomy — the nine parts:',
  scaffolds: 'Scaffolds:',
  alternatives: 'alternatives — pick at most one',
  parameters: 'Parameters:',
  steps: 'What an apply would do, step by step:',
  varying: 'Steps whose inclusion depends on an answer:',
  combinations: 'Parameter combinations:',
  folderReadme: 'Folder README basename:',
  writes: 'writes',
  when: 'when',
  values: 'values',
  flag: 'flag',
  required: 'required',
  matched: 'payload files matched',
} as const;

/**
 * `pack info <name> --json` — **the `PackReport` verbatim**.
 *
 * The same document `validate --json` emits for one pack, through the same
 * function, so F6 and CI consume the structure rather than the rendering.
 */
export function packInfoJson(report: PackReport): PackReportJson {
  return packReportJson(report);
}

/** The human rendering, one line per element, in US-29's fixed order. */
export function renderPackInfo(report: PackReport): readonly string[] {
  return [
    ...identity(report),
    '',
    ...section(PACK_INFO_TEXT.anatomy, report.anatomy.map(anatomyLine)),
    '',
    ...section(PACK_INFO_TEXT.scaffolds, scaffoldLines(report.scaffolds)),
    '',
    ...section(PACK_INFO_TEXT.parameters, report.parameters.map(parameterLine)),
    '',
    ...section(PACK_INFO_TEXT.steps, report.steps.map(stepLine)),
    '',
    ...section(
      PACK_INFO_TEXT.varying,
      report.parameterVaryingSteps.map(
        (v) =>
          `  ${pad(String(v.index), 4)}${escapeLine(PACK_INFO_TEXT.when)} ${whenText(v.when)}   ` +
          `${escapeLine(PACK_INFO_TEXT.writes)} ${v.writes.map(escapeValue).join(', ')}`,
      ),
    ),
    '',
    // Verbatim, and NOT re-rendered here. `init`'s pre-write summary and
    // `validate --json` render this same object through this same
    // function; a local rendering would be a second wording of a
    // security disclosure, which is the one place two wordings are worst.
    ...renderDisclosure(report.disclosure),
  ];
}

/* ── sections ────────────────────────────────────────────────────────── */

function identity(report: PackReport): readonly string[] {
  const p = report.pack;
  return [
    `${escapeValue(p.name)} ${escapeValue(p.version)} — ${escapeValue(p.title)}`,
    `  formatVersion ${String(p.formatVersion)}   minCliVersion ${escapeValue(p.minCliVersion)}`,
    `  ${escapeLine(PACK_INFO_TEXT.combinations)} ${String(report.combinations)}` +
      `   ${escapeLine(PACK_INFO_TEXT.folderReadme)} ${escapeValue(report.folderReadme)}`,
  ];
}

/** A heading, then the body — or the empty marker. **US-29 requires the
 *  command to say a list is empty**, so this is the only place a body may
 *  be absent, and it never is. */
function section(heading: string, body: readonly string[]): readonly string[] {
  return [escapeLine(heading), ...(body.length === 0 ? [escapeLine(PACK_INFO_TEXT.empty)] : body)];
}

/** One anatomy row: the part, its status, and the text that status
 *  carries — `note` for `provisional`, `reason` for `absent`. Both are
 *  pack content and both are escaped. */
function anatomyLine(row: AnatomyRow): string {
  const detail = row.note ?? row.reason;
  return (
    `  ${pad(row.part, 24)}${pad(row.status, 13)}` +
    `${String(row.matched)} ${escapeLine(PACK_INFO_TEXT.matched)}` +
    (detail === undefined ? '' : `   ${escapeValue(detail)}`)
  );
}

/**
 * Scaffolds, **grouped by category, with same-category groups labelled as
 * alternatives**.
 *
 * The label is the point of the grouping: two scaffolds sharing a category
 * are a choose-one (`E-SCAFFOLD-EXCLUSIVE`), and a reader shown a flat
 * list would reasonably conclude they compose. Uncategorised scaffolds
 * compose with everything and are listed last, ungrouped.
 */
function scaffoldLines(scaffolds: readonly ScaffoldSummary[]): readonly string[] {
  const out: string[] = [];
  const categories: string[] = [];
  for (const s of scaffolds) {
    if (s.category !== null && !categories.includes(s.category)) categories.push(s.category);
  }

  for (const category of categories) {
    const group = scaffolds.filter((s) => s.category === category);
    out.push(
      `  [${escapeValue(category)}]` +
        (group.length > 1 ? `  ${escapeLine(PACK_INFO_TEXT.alternatives)}` : ''),
    );
    for (const s of group) out.push(scaffoldLine(s, '    '));
  }
  for (const s of scaffolds) {
    if (s.category === null) out.push(scaffoldLine(s, '  '));
  }
  return out;
}

function scaffoldLine(s: ScaffoldSummary, indent: string): string {
  return `${indent}${pad(s.id, 24)}${pad(`${s.steps} steps`, 12)}${escapeValue(s.description)}`;
}

/** A parameter with its `flag` alias and, for an `enum`, its permitted
 *  values — **verbatim**, because a user comparing what they typed against
 *  a paraphrase cannot see the difference that matters. */
function parameterLine(p: ParameterDecl): string {
  const bits: string[] = [];
  if (p.flag !== undefined) bits.push(`${escapeLine(PACK_INFO_TEXT.flag)} --${escapeValue(p.flag)}`);
  if (p.required === true) bits.push(escapeLine(PACK_INFO_TEXT.required));
  if (p.type === 'enum') {
    bits.push(`${escapeLine(PACK_INFO_TEXT.values)} ${(p.values ?? []).map(escapeValue).join(' | ')}`);
  }
  return (
    `  ${pad(p.id, 24)}${pad(p.type, 10)}${escapeValue(p.prompt)}` +
    (bits.length === 0 ? '' : `\n${' '.repeat(26)}${bits.join('   ')}`)
  );
}

/** `<op>  <from> → <to>`, with a conditional step marked by its `when`. */
function stepLine(s: StepSummary): string {
  const arrow = s.to === null ? '' : ` → ${escapeValue(s.to)}`;
  return (
    `  ${pad(String(s.index), 4)}${pad(s.op, 14)}${escapeValue(s.from ?? '')}${arrow}` +
    (s.scaffold === null ? '' : `   [${escapeValue(s.scaffold)}]`) +
    (s.when === null ? '' : `   ${escapeLine(PACK_INFO_TEXT.when)} ${whenText(s.when)}`)
  );
}

/** `when` is a single equality by construction (`StepWhen` permits no
 *  operators), so this renders the one pair rather than a general form. */
function whenText(when: StepWhen): string {
  return Object.entries(when)
    .map(([id, value]) => `${escapeValue(id)}=${escapeValue(value)}`)
    .join(' ');
}

/** Column padding. Applied to values **after** escaping, so an escaped
 *  value's true width is what lines up — padding first would align a
 *  column against characters the terminal never shows. */
function pad(s: string, width: number): string {
  const escaped = escapeValue(s);
  return escaped.length >= width ? `${escaped} ` : escaped + ' '.repeat(width - escaped.length);
}
