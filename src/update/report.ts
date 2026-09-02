/**
 * The update report — one builder, two channels. T-2501, T-2502, T-2504,
 * T-2508.
 *
 * ── This is the whole of the handover, and it is why `update` exits 0 ──
 *
 * `update` builds no merge engine (Q-62). It replaces the unedited, leaves
 * everything else, and **the report is the entire mechanism by which the
 * left-alone paths reach anybody** — a person reading a terminal, or F6
 * reconciling them one at a time in conversation (§F3.4, IM-31). A path
 * missing from this report is a path nobody will ever look at again, which
 * is why nothing here is ranked, summarised away, or dropped for brevity.
 *
 * ── The exit rule lives here, and it looks backwards ──────────────────
 *
 *   > **The writing command reports; the read-only mode gates.**
 *   > `update` exits **0** on a completed run, **including when it leaves
 *   > edited paths outstanding**. `update --dry-run` exits **1** with
 *   > `E-UPDATE-AVAILABLE` when there is anything to do.
 *
 * Exit 1 for *"edited paths outstanding"* is the intuitive choice and it
 * **disables the feature Q-62 created** (Q-78, `F3-ADR-004` §3.1): F6's
 * IM-7 stops the skill on any non-zero exit and IM-31 requires it to
 * reconcile exactly those paths, so the skill would halt precisely when
 * its work begins. The accepted cost is stated rather than hidden — a
 * script checking only `update`'s exit code learns nothing about the
 * edited paths, and gets this report and `--json`'s counts instead.
 *
 * ── Nothing here is presented as damage (IM-30, US-61) ────────────────
 *
 * No kept path is a conflict, a failure, a rejection or a loss, none
 * appears under a heading implying one, and none moves the exit code in
 * the writing mode. `kept-fill-expected` carries **its own reason** —
 * *shipped to be filled in* rather than *edited* — so a user is never left
 * wondering why their brief was skipped (T-2501).
 *
 * ── Where the prose lives ─────────────────────────────────────────────
 *
 * The documented exception `consent.ts`, `summary.ts` and `pack-info.ts`
 * carry: F1 makes the **code** the stable contract, and there is no F1
 * code for *"here is what an update did"* — so there is no catalogue entry
 * to render from. F1 and IM-30 specify the **content** of this report and
 * not its wording. One exported table, so no call site composes a
 * sentence and a change lands in one place.
 */
import { exitClassFor } from '../diag/codes.js';
import { diagnostic, exitCodeFor, type Diagnostic, type ExitCode } from '../diag/diagnostic.js';
import { escapeLine, escapeValue } from '../diag/escape.js';
import { isBinary } from '../hash/normalize.js';
import { DISPOSITIONS, type Disposition, type UpdateEntry } from './classify.js';
import type { VerifyState } from '../verify/compare.js';
import type { UpdatePlan } from './plan-update.js';

/** The writing mode and the read-only one. The **same** builder serves
 *  both (US-63): only the verb forms differ, so the two surfaces cannot
 *  come to describe different classifications. */
export type ReportMode = 'apply' | 'dry-run';

/* ── the excerpt bound (T-2508, C-54) ────────────────────────────────── */

/**
 * Lines of `expectedNew` the **human** report prints per path.
 *
 * ── What an unbounded excerpt costs ───────────────────────────────────
 *
 * `UpdateEntry.expectedNew` is a whole rendered file, and there is one per
 * `kept-edited` path. A pack bump that changes a dozen documents a user
 * has also edited would put a dozen whole documents on the terminal —
 * several thousand lines of **pack-controlled content** — and three things
 * break at once:
 *
 *   1. **The actionable part scrolls away.** The counts and the list of
 *      paths are what a person acts on; burying them under the content
 *      makes IM-30's *"reads as work handed over"* false in practice
 *      however carefully the sentences are worded.
 *   2. **Pack content sits adjacent to CLI-composed lines.** That is the
 *      disclosure-forgery shape (C-1/C-49) outside the delimiters: the
 *      more untrusted text printed beside the CLI's own, the more of it a
 *      reader has to tell apart. Escaping (C-50) stops a forged **line**;
 *      it does not stop a forged **impression** made of thousands of them.
 *   3. **It duplicates a channel that already exists losslessly.**
 *      `--json` carries every byte, which is the whole reason a cap here
 *      costs nothing.
 *
 * **Bounded and labelled, never silently short.** F1's rule for the
 * disclosure is *never summarised, never truncated, never counted*, and a
 * report that quietly drops content while looking complete is the fault
 * the Mode A review's C-1 opened with. Every truncation names how many
 * lines were withheld and where the complete content is.
 *
 * **RECORDED RESIDUAL — line *width* is not bounded.** A rendered file may
 * hold one very long line (up to `MAX_FILE_BYTES`), and this cap counts
 * lines rather than characters, so a single-line 4 MB file is printed
 * whole. C-54 specifies *"a stated line cap"* and nothing about width; a
 * width bound would be a second control invented in an implementation
 * file, so it is **recorded rather than added**. Closing it means deciding
 * the marker a partial line carries, which is a spec decision.
 */
export const EXCERPT_LINE_CAP = 24;

/** A bounded excerpt of pack-rendered content, with what it withheld. */
export interface Excerpt {
  /** Escaped, ready to print. Empty for binary content. */
  readonly lines: readonly string[];
  /** Lines this excerpt did **not** print. Named in the report, always. */
  readonly withheld: number;
  /** True where the bytes are binary and no excerpt is attempted — the
   *  size is reported instead. Printing a binary file to a terminal is the
   *  cost this cap exists to bound, in its purest form. */
  readonly binary: boolean;
  readonly bytes: number;
}

/**
 * Bound one rendered file for the terminal.
 *
 * Lines pass **`escapeValue`**, not `escapeLine`, and the stricter choice
 * is deliberate: this is pack-rendered content — a **value** — and F1's
 * value rule exists precisely for text the CLI does not control. The
 * visible cost is that a horizontal tab prints as `\t`; the alternative is
 * an exemption written for CLI-composed templates being applied to pack
 * output, which is how C-50 gets holes in it.
 */
export function excerptOf(bytes: Buffer): Excerpt {
  if (isBinary(bytes)) return { lines: [], withheld: 0, binary: true, bytes: bytes.length };

  const text = bytes.toString('utf8');
  const all = text.split(/\r\n|\n|\r/);
  // A file ending in a newline splits to a trailing empty element that is
  // not a line of the file. Dropping it keeps the withheld count honest.
  if (all.length > 1 && all[all.length - 1] === '') all.pop();

  const shown = all.slice(0, EXCERPT_LINE_CAP);
  return {
    lines: shown.map(escapeValue),
    withheld: all.length - shown.length,
    binary: false,
    bytes: bytes.length,
  };
}

/* ── the prose ───────────────────────────────────────────────────────── */

/** The one place this module's wording lives. */
export const REPORT_TEXT = {
  updated: 'updated',
  available: 'is available.',
  current: 'is already the version this lintel bundles. Nothing to update.',

  replaced: 'replaced',
  wouldReplace: 'would be replaced',
  added: 'added',
  wouldAdd: 'would be added',
  unchanged: 'unchanged',

  kept: 'left for you, exactly as you have them:',
  wouldKeep: 'would be left for you, exactly as you have them:',

  /** One per kept disposition. `kept-fill-expected` says *shipped to be
   *  filled in*, never *edited* — §F3.3's own distinction, and the reason
   *  T-2501 names it separately. */
  reasons: {
    'kept-edited': 'you changed this one',
    'kept-adapted': 'the pack expects you to adapt this one',
    'kept-fill-expected': 'shipped for you to fill in — update never overwrites it',
    orphaned: 'no longer shipped by the newer pack; left where it is',
  } as const satisfies Readonly<Record<string, string>>,

  /** The second fact only a recomputation knows (US-61, US-72). Printed
   *  only where both expectations hold the path, since "the pack also
   *  changed it" is meaningless where one side never had it. */
  packAlsoChanged: 'the pack changed it too',
  packUnchanged: 'the pack left it alone',

  /** IM-32: the CLI reports; it does not decide, rank or recommend. This
   *  line says who does, and says the CLI did not. */
  handover: 'lintel changed none of these. They are yours to reconcile.',

  payloadRemoved: 'files the newer pack no longer ships, removed from .harness/pack/',
  wouldRemovePayload:
    'files the newer pack no longer ships, to be removed from .harness/pack/',

  excerptHeading: 'produces here:',
  excerptBinary: 'binary content — not excerpted.',
  withheld: 'more lines withheld.',
  wholeFile: '--dry-run --json carries the whole file.',
} as const;

/* ── the human report (T-2501, T-2502, T-2508) ───────────────────────── */

/**
 * The report a person reads. **Pure**, and stdout's — the same division
 * `init` makes, so `lintel harness update > out.txt` leaves the report in
 * the file and the diagnostics and the disclosure on the terminal.
 *
 * **Empty when the classification was suppressed.** A gate fired, the
 * diagnostic said so, and every row this function could print would be
 * derived from an input nobody can vouch for — the same reason `verify`'s
 * summary is empty in that case.
 */
export function reportLines(plan: UpdatePlan, mode: ReportMode): readonly string[] {
  if (plan.suppressed) return [];

  const v = (s: string): string => escapeValue(s);

  if (plan.upToDate) {
    return [
      `lintel: ${v(plan.from.pack)} ${v(plan.from.version)} ${escapeLine(REPORT_TEXT.current)}`,
    ];
  }

  const dry = mode === 'dry-run';
  const lines: string[] = [
    dry
      ? `lintel: ${v(plan.to.pack)} ${v(plan.from.version)} → ${v(plan.to.version)} ` +
        escapeLine(REPORT_TEXT.available)
      : `lintel: ${escapeLine(REPORT_TEXT.updated)} ${v(plan.to.pack)} ` +
        `${v(plan.from.version)} → ${v(plan.to.version)}.`,
  ];

  const wrote: string[] = [];
  const count = (n: number, label: string): void => {
    if (n > 0) wrote.push(`${String(n)} ${escapeLine(label)}`);
  };
  count(plan.counts.replaced, dry ? REPORT_TEXT.wouldReplace : REPORT_TEXT.replaced);
  count(plan.counts.added, dry ? REPORT_TEXT.wouldAdd : REPORT_TEXT.added);
  count(plan.counts.unchanged, REPORT_TEXT.unchanged);
  if (wrote.length > 0) lines.push(`  ${wrote.join(', ')}.`);

  if (plan.payloadDeletes.length > 0) {
    lines.push(
      `  ${String(plan.payloadDeletes.length)} ` +
        escapeLine(dry ? REPORT_TEXT.wouldRemovePayload : REPORT_TEXT.payloadRemoved),
    );
  }

  if (plan.kept.length > 0) {
    lines.push(
      `  ${String(plan.kept.length)} ${escapeLine(dry ? REPORT_TEXT.wouldKeep : REPORT_TEXT.kept)}`,
    );
    for (const e of plan.kept) lines.push(`    ${keptLine(e)}`);
    lines.push(`  ${escapeLine(REPORT_TEXT.handover)}`);
  }

  // The excerpts last, after everything a reader acts on. Their bound is
  // what keeps that ordering meaningful rather than notional.
  for (const e of plan.kept) {
    if (e.expectedNew === undefined) continue;
    lines.push('', `  ${v(plan.to.pack)} ${v(plan.to.version)} ` +
      `${escapeLine(REPORT_TEXT.excerptHeading)} ${v(e.path)}`);
    lines.push(...excerptBlock(e.expectedNew));
  }

  return lines;
}

/** One kept path: the path, its reason, and — where both expectations held
 *  it — whether the pack changed it too. */
function keptLine(e: UpdateEntry): string {
  const reason = REPORT_TEXT.reasons[e.disposition as keyof typeof REPORT_TEXT.reasons];
  /* c8 ignore next — `plan.kept` holds only the four kept dispositions, so
     every entry has a reason; the fallback exists so an eighth disposition
     cannot print `undefined` at a user. */
  const text = reason ?? e.disposition;
  // `state === null` means the path was in only one expectation (§F3.3's
  // first two rows), and `packAlsoChanged` is `false` there because there
  // was nothing to compare — printing it would be a claim about a
  // comparison that did not happen. `orphaned` has no new side at all.
  const comparable = e.state !== null && e.disposition !== 'orphaned';
  const also = comparable
    ? `; ${escapeLine(e.packAlsoChanged ? REPORT_TEXT.packAlsoChanged : REPORT_TEXT.packUnchanged)}`
    : '';
  return `${escapeValue(e.path)} — ${escapeLine(text)}${also}`;
}

/** The excerpt, with its truncation notice. Never silently short. */
function excerptBlock(bytes: Buffer): readonly string[] {
  const ex = excerptOf(bytes);
  if (ex.binary) {
    return [`    ${escapeLine(REPORT_TEXT.excerptBinary)} ${String(ex.bytes)} bytes.`];
  }
  const out = ex.lines.map((l) => `    │ ${l}`);
  if (ex.withheld > 0) {
    out.push(
      `    … ${String(ex.withheld)} ${escapeLine(REPORT_TEXT.withheld)} ` +
        escapeLine(REPORT_TEXT.wholeFile),
    );
  }
  return out;
}

/* ── `--json` (T-2504) ───────────────────────────────────────────────── */

/**
 * How `expectedNew` travels in JSON.
 *
 * **JSON has no bytes, and F3 specifies neither encoding** — recorded as a
 * decision taken here rather than inherited. `utf8` where the rendered
 * file is text, `base64` where it is not, and the field says which so a
 * consumer never has to guess or sniff. Two shapes rather than one, and
 * the discriminator is what makes that safe: a single always-base64
 * encoding would make the common case unreadable to the human who runs
 * `--dry-run --json` to see what the pack produces, and a single
 * always-utf8 one would be **lossy** for a binary file the recipe copies.
 */
export type ExpectedNewEncoding = 'utf8' | 'base64';

export interface UpdateJsonEntry {
  readonly path: string;
  /** `null` where the path is in only one expectation — §F3.3's first two
   *  rows, whose `State vs expected_old` column reads `—`. **Not a state
   *  invented to fill the field**, which would be a claim about a
   *  comparison that never ran. */
  readonly state: VerifyState | null;
  readonly disposition: Disposition;
  /** The second axis US-61, US-62 and US-71 all require, and the one only
   *  a recomputation can supply. */
  readonly packAlsoChanged: boolean;
  /** Present iff `disposition === 'kept-edited'`. **Complete** — this is
   *  the lossless channel the human report's cap defers to (C-54). */
  readonly expectedNew?: string;
  readonly expectedNewEncoding?: ExpectedNewEncoding;
}

export interface UpdateJson {
  readonly command: 'update';
  /** `--json` exists **only** alongside `--dry-run` (US-63), so the mode
   *  is a constant rather than a variable. It is emitted anyway: a
   *  consumer that one day meets a second mode should read it, not infer
   *  it from the field's absence. */
  readonly mode: 'dry-run';
  readonly from: { readonly pack: string; readonly version: string };
  readonly to: { readonly pack: string; readonly version: string };
  /** All three parts, as `verify --json` carries them: a consumer must be
   *  able to tell a digest that matched from one never compared. */
  readonly digest: {
    readonly recorded: string;
    readonly computed: string;
    readonly matched: boolean;
  };
  /** True iff a gate fired and nothing was classified. **A consumer that
   *  read `entries: []` as "nothing to do" would report a tampered payload
   *  as a project with no update available.** */
  readonly suppressed: boolean;
  /** True iff the bundled version equals the applied one — the other
   *  reason `entries` can be empty, and a different one. */
  readonly upToDate: boolean;
  readonly counts: Readonly<Record<Disposition, number>>;
  readonly entries: readonly UpdateJsonEntry[];
  /** Payload paths under `.harness/pack/`. **Not applied paths, and not a
   *  disposition** (`F3-ADR-004` §10) — carried separately so nothing can
   *  read them as files removed from the user's project. */
  readonly payloadDeletes: readonly string[];
  readonly diagnostics: readonly {
    readonly code: string;
    readonly severity: string;
    /** The third axis, on `W-` findings only. Absent on an error, as the
     *  catalogue has it. */
    readonly class?: string;
    readonly exit: number;
  }[];
}

/**
 * The machine report. **The same `UpdatePlan` the human report renders**,
 * which is the single-builder property US-71 asks a test to assert
 * structurally — neither surface computes a row of its own.
 *
 * The digest is a parameter rather than a field of `UpdatePlan`: the plan
 * takes both digests as *inputs to its first gate* and does not carry the
 * comparison, and adding a field to a module E-23 owns in order to shorten
 * one call site is the wrong direction.
 *
 * **Parameters dropped from the rewritten manifest are deliberately
 * absent.** US-69 drops them *silently*; a `--json` field naming them
 * would make the silence a matter of which channel you read.
 */
export function updateJson(
  plan: UpdatePlan,
  digest: { readonly recorded: string; readonly computed: string; readonly matched: boolean },
): UpdateJson {
  return {
    command: 'update',
    mode: 'dry-run',
    from: plan.from,
    to: plan.to,
    digest,
    suppressed: plan.suppressed,
    upToDate: plan.upToDate,
    counts: plan.counts,
    entries: plan.entries.map(jsonEntry),
    // No cast: a branded path **widens** to `string` freely, and it is
    // only narrowing back that C-14 forbids.
    payloadDeletes: plan.payloadDeletes,
    diagnostics: plan.diagnostics.map((d) => ({
      code: d.code,
      severity: d.severity,
      // `d.class`, not `classOf(d.code)`: the latter is total and would
      // put a meaningless `"class": "defect"` on every error.
      ...(d.class === undefined ? {} : { class: d.class }),
      exit: exitClassFor(d.code),
    })),
  };
}

function jsonEntry(e: UpdateEntry): UpdateJsonEntry {
  const base = {
    path: e.path,
    state: e.state,
    disposition: e.disposition,
    packAlsoChanged: e.packAlsoChanged,
  };
  if (e.expectedNew === undefined) return base;
  const utf8 = !isBinary(e.expectedNew);
  return {
    ...base,
    expectedNew: e.expectedNew.toString(utf8 ? 'utf8' : 'base64'),
    expectedNewEncoding: utf8 ? 'utf8' : 'base64',
  };
}

/* ── the exit-class contract (T-2503, T-2505) ────────────────────────── */

/**
 * `E-UPDATE-AVAILABLE`, raised by **`--dry-run` only**.
 *
 * In the writing mode the same condition is not a fault — it is the run's
 * whole purpose — and F1's severity rule is *one code, one occasion*. So
 * this is a function the read-only branch calls and the writing branch
 * cannot: there is no flag or argument through which the writing mode
 * reaches it.
 */
export function updateAvailable(plan: UpdatePlan, cliVersion: string): Diagnostic {
  return diagnostic('E-UPDATE-AVAILABLE', {
    values: {
      pack: plan.to.pack,
      applied: plan.from.version,
      bundled: plan.to.version,
      cliVersion,
    },
  });
}

/**
 * The exit class, as a pure function of the plan and the mode.
 *
 * **Read the rule at the top of this file before changing anything here.**
 * The clause that looks wrong — a completed writing run exiting `0` with
 * edited paths outstanding — is the one that keeps F6 able to work at all
 * (Q-78).
 *
 * `duringWrite` carries diagnostics raised **after** planning:
 * `E-TARGET-RACE` (2), `E-WRITE-FAILED` (3), `E-LOCK-HELD` (1) and the
 * warnings, which contribute nothing. There is no `--strict` on this
 * command (US-69, IM-22), so a `defect`-class warning prints and leaves
 * the exit code alone; `exitCodeFor`'s default `strict = false` is that
 * rule, not an omission.
 */
export function updateExitCode(
  plan: UpdatePlan,
  mode: ReportMode,
  duringWrite: readonly Diagnostic[] = [],
): ExitCode {
  const worst = exitCodeFor([...plan.diagnostics, ...duringWrite]);
  if (worst !== 0) return worst;

  // The read-only mode gates. `upToDate` is the only 0: a newer bundled
  // version always means there is something to do — at minimum the payload
  // and the manifest move — so "an update is available" and "there is work"
  // are the same condition and do not need two tests.
  //
  // This agrees with `E-UPDATE-AVAILABLE`'s own exit class by construction
  // rather than by coincidence, and a test asserts the agreement so that
  // changing one without the other fails.
  if (mode === 'dry-run') return plan.upToDate ? 0 : 1;

  // The writing command reports. A completed run is 0 whatever it left.
  return 0;
}

/** Every disposition, in the enumeration's order, for a caller that wants
 *  to print or iterate counts without restating the list. Exported so no
 *  surface hard-codes a subset and quietly stops reporting an eighth. */
export const REPORTED_DISPOSITIONS: readonly Disposition[] = DISPOSITIONS;
