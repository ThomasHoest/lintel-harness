/**
 * Answer resolution — **one ordered function**. T-2002, T-2003, T-2005,
 * `F2-ADR-003` §1.
 *
 * ── Why this is its own module ────────────────────────────────────────
 *
 * The order is where a precedence bug hides **silently**: a default that
 * quietly beats a `--set` produces a valid manifest recording the wrong
 * answer, an applied tree that is internally consistent, and a `verify`
 * that passes. Nothing downstream can catch it, because everything
 * downstream is entitled to the answers it is handed.
 *
 * So the order lives in one **pure** function with the prompt **injected**
 * — `prompt === null` is the whole of the non-interactive path — and the
 * function can be exercised exhaustively with no terminal. That
 * testability is the module boundary's only justification and its whole
 * one.
 *
 * ── The order, and where each step comes from ─────────────────────────
 *
 *   1  --set <id>=<value>          `F2-ADR-003` §1
 *   2  the pack-declared alias     F1 US-8 — **the same precedence level**
 *   3  a prompt                    iff stdin AND stderr are both a TTY
 *   4  the declared default        F2 §Answer resolution
 *   5  E-PARAM-MISSING             when `required`
 *   6  the type's empty value      Q-65 — `string` and `boolean` only
 *   7  E-PARAM-UNANSWERABLE        Q-65 — `enum` only
 *
 * **Steps 1 and 2 are indistinguishable here, structurally.** `parsePass2`
 * resolves an alias into the same `<id>=<value>` token `--set` produces
 * (`flags.ts`), so by the time this module sees them there is no way to
 * prefer one — which is exactly what F1 US-8 asks for, and is why the
 * conflict rule below is *"two argv answers disagree"* rather than *"the
 * alias lost"*.
 *
 * **Step 5 before step 6, deliberately.** A parameter declared both
 * `required` and optional-by-type does not exist; a parameter declared
 * `required` with no answer is `E-PARAM-MISSING` and never silently `""`.
 * Reversing these two lines would turn every missing required string into
 * an empty substitution, which is a wrong project rather than a refused
 * one.
 *
 * ── Q-65's asymmetry is the decision, not an oversight ────────────────
 *
 * A `string` or `boolean` that is neither `required` nor defaulted records
 * the type's empty value. That is safe **because F1 US-8 already forbids
 * such a parameter from appearing in a `when`** (`E-PARAM-UNDECIDABLE`),
 * so it can only be a *substitution* parameter and empty text is defined
 * behaviour the pack author chose by making it optional.
 *
 * An `enum` has no empty value. Inventing one **selects a branch nobody
 * authorised**, so it is `E-PARAM-UNANSWERABLE`, exit 1, zero bytes —
 * and it fires **with or without a terminal**, because a prompt for an
 * optional enum with no default offers no "skip" answer either.
 * `F2-ADR-003` §5 records that F1's message text for the code still reads
 * as TTY-scoped; the **code** is the contract and it is raised unchanged.
 *
 * ── No retry loop, at a prompt or from a flag ─────────────────────────
 *
 * The first answer failing `maxLength`, `pattern` or `values` is
 * `E-PARAM-INVALID`, exit 1, zero bytes — *"the user typed it and can
 * retype it"*, which is a re-run (F2 §Resolved Decisions, US-43). One code
 * path for both entry points is what keeps the flag surface and the prompt
 * surface indistinguishable to a test.
 */
import { DiagnosticBag } from '../diag/diagnostic.js';
import { checkAnswer, warnIfSecretAnswer, type Answer } from '../pack/parameters.js';
import type { ParameterDecl } from '../pack/types.js';

/**
 * The injected prompt.
 *
 * Returns `null` for *"nothing was typed"* — an empty line, which US-43
 * defines as *accept the declared default*. Resolution then falls through
 * to step 4, so an empty line at a defaulted parameter takes the default
 * and an empty line at an undefaulted one is exactly the same position as
 * having no terminal at all.
 */
export type PromptFn = (decl: ParameterDecl) => Promise<Answer | null>;

export interface AnswerInputs {
  /**
   * Every parameter this run must answer: the base pack's, then each
   * **selected** scaffold's, in `pack.json`-declared order
   * (`parametersFor`). A parameter of an unselected scaffold is neither
   * collected nor recorded (F1 US-9).
   */
  readonly declarations: readonly ParameterDecl[];
  /**
   * `--set` and resolved aliases, merged by `parsePass2` into one list of
   * `<id>=<value>` tokens **in argv order**.
   *
   * A list and not a `Record<string, string>` — which is what
   * `F2-ADR-003`'s printed contract says — because a record **collapses
   * duplicates**, and `--set x=a --set x=b` is `E-PARAM-INVALID` (US-40).
   * A shape that cannot represent the fault cannot report it.
   */
  readonly set: readonly string[];
  /** For `E-SET-UNKNOWN-PARAM`'s message. */
  readonly packName: string;
  readonly packVersion: string;
  /**
   * Every parameter id the pack declares, **selected or not** (Q-66).
   *
   * A scaffold's parameter counts as declared even when that scaffold is
   * not selected: the id exists in `pack.json` and the user's mistake is
   * selection, not naming, so `E-SET-UNKNOWN-PARAM` would be the wrong
   * diagnostic for it.
   */
  readonly declaredIds: readonly string[];
}

export interface ResolvedAnswers {
  /** Insertion order is declared order, which is the manifest's
   *  serialization order (F1 US-10). */
  readonly answers: ReadonlyMap<string, Answer>;
  readonly bag: DiagnosticBag;
}

/** One `--set` token, split. */
interface Assignment {
  readonly id: string;
  readonly value: string;
}

/**
 * Split the `<id>=<value>` tokens.
 *
 * A token with **no `=`** is read as the id with an empty value rather
 * than refused here. F1 has no code for a malformed `--set` token, and
 * inventing one is not this module's to do — so the token takes the
 * ordinary path and reports the fault it actually has: an id the pack does
 * not declare is `E-SET-UNKNOWN-PARAM`, and one it does declare is judged
 * against its declaration like any other answer. Recorded rather than
 * papered over.
 */
function assignmentsOf(tokens: readonly string[]): readonly Assignment[] {
  return tokens.map((token) => {
    const eq = token.indexOf('=');
    return eq < 0
      ? { id: token, value: '' }
      : { id: token.slice(0, eq), value: token.slice(eq + 1) };
  });
}

/**
 * A `boolean` parameter's answer, arriving as text.
 *
 * Both entry points produce a string: `--set ship=true` is typed as one,
 * and `aliasesFor` turns a bare boolean alias into the literal token
 * `<id>=true` (`parameters.ts`). Anything that is not exactly `true` or
 * `false` is left as the string it is, so `checkAnswer` reports it as
 * `E-PARAM-INVALID` rather than this function guessing at an intent.
 */
function coerce(decl: ParameterDecl, value: string): Answer {
  if (decl.type !== 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
}

/**
 * Resolve every declared parameter, in order.
 *
 * `prompt` is `null` when either stdin or stderr is not a TTY (T-2005).
 * **Both streams, not just stdin**: prompts go to stderr, so a redirected
 * stderr means the user cannot read the question they are being asked, and
 * a prompt nobody can see is a hang.
 */
export async function resolveAnswers(
  inputs: AnswerInputs,
  prompt: PromptFn | null,
): Promise<ResolvedAnswers> {
  const bag = new DiagnosticBag();
  const answers = new Map<string, Answer>();

  /* ── steps 1 and 2: the argv answers, one precedence level ─────────── */

  const declared = new Set(inputs.declaredIds);
  const fromArgv = new Map<string, string>();

  for (const a of assignmentsOf(inputs.set)) {
    if (!declared.has(a.id)) {
      // Q-66. Exit 1, and the id is the fault rather than the value —
      // which is why this is not `E-PARAM-INVALID`, whose message is about
      // a value and whose remedy would send the user to fix the wrong half
      // of what they typed.
      bag.add('E-SET-UNKNOWN-PARAM', {
        values: {
          pack: inputs.packName,
          version: inputs.packVersion,
          id: a.id,
          ids: inputs.declaredIds.join(', ') || '(none)',
        },
      });
      continue;
    }

    const prior = fromArgv.get(a.id);
    if (prior === undefined) {
      fromArgv.set(a.id, a.value);
      continue;
    }
    // Same value twice is the same request and exits 0 (US-40). Two
    // different values is `E-PARAM-INVALID` whichever forms carried them,
    // because steps 1 and 2 are one precedence level and neither wins.
    if (prior !== a.value) {
      bag.add('E-PARAM-INVALID', {
        values: {
          value: a.value,
          id: a.id,
          values: `a single answer; "${prior}" was already given`,
        },
      });
    }
  }

  /* ── steps 3–7, per declaration, in declared order ─────────────────── */

  for (const decl of inputs.declarations) {
    const given = fromArgv.get(decl.id);

    if (given !== undefined) {
      record(bag, answers, decl, coerce(decl, given));
      continue;
    }

    if (prompt !== null) {
      const typed = await prompt(decl);
      if (typed !== null) {
        record(bag, answers, decl, typeof typed === 'string' ? coerce(decl, typed) : typed);
        continue;
      }
      // An empty line. US-43 defines it as *accept the default*, so this
      // falls through to step 4 rather than recording "".
    }

    if (decl.default !== undefined) {
      // Defaults are **recorded, not inherited** (F1 US-8): an unrecorded
      // default makes the applied tree non-recomputable the moment the
      // pack's default changes — the tree stays right and `verify` stops
      // being able to say so.
      record(bag, answers, decl, decl.default);
      continue;
    }

    if (decl.required === true) {
      bag.add('E-PARAM-MISSING', { values: { id: decl.id, prompt: decl.prompt } });
      continue;
    }

    // Q-65, and the split by type is the decision.
    if (decl.type === 'string') {
      answers.set(decl.id, '');
    } else if (decl.type === 'boolean') {
      answers.set(decl.id, false);
    } else {
      bag.add('E-PARAM-UNANSWERABLE', { values: { id: decl.id } });
    }
  }

  return { answers, bag };
}

/**
 * Validate one collected answer and record it.
 *
 * `maxLength` before `pattern` is `checkAnswer`'s, not repeated here —
 * C-7's ordering is a bound on regex evaluation and it belongs with the
 * rule it bounds. A failing answer is **not recorded**, so a run that
 * continues to report further faults cannot also carry a value nobody
 * accepted.
 */
function record(
  bag: DiagnosticBag,
  into: Map<string, Answer>,
  decl: ParameterDecl,
  value: Answer,
): void {
  const faults = checkAnswer(decl, value, 'collection');
  for (const d of faults.items) bag.push(d);
  // A `defect`, and the apply proceeds: the answer is already going into a
  // committed file and the user is told so (IM-15), but refusing it would
  // be a heuristic deciding what a project may be called.
  warnIfSecretAnswer(bag, decl, value);
  if (faults.length === 0) into.set(decl.id, value);
}
