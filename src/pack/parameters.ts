/**
 * Parameters: the pack-wide declaration rules, and answers. T-0308.
 *
 * The **per-declaration** rules already live in `schema.ts`, where they
 * belong — `pattern` anchored and free of backreference and lookaround,
 * `maxLength` within its ceiling, `flag` kebab-case and not reserved. What
 * is here is everything those checks cannot see from inside one entry:
 *
 *   PACK-WIDE   duplicate `id`s, duplicate `flag`s, the credential ban.
 *   RECIPE-WIDE `E-PARAM-UNDECIDABLE` and the combination bound, both of
 *               which are facts about which parameters a `when` names.
 *   ANSWERS     collection, read-back, and the C-29 split between them.
 *
 * ── C-29, the two-code split ──────────────────────────────────────────
 *
 * One check, two occasions, **two codes**, because §Error States' rule is
 * that *severity is a property of the code, not of the occasion*:
 *
 *   COLLECTION  `E-PARAM-INVALID`, **exit 1**. A user typed it and can
 *               retype it.
 *   READ-BACK   `E-MANIFEST-ANSWER-INVALID`, **exit 2**. Nobody typed it.
 *               The manifest carries no self-integrity check *by design*,
 *               and `verify` replays recorded answers on every run — so an
 *               answer that no longer satisfies its own declaration means
 *               the manifest was edited or the declaration moved under it.
 *               That is a manifest-integrity fault, which is what exit
 *               class 2 means.
 *
 * ── C-7, and why the order of two checks is load-bearing ──────────────
 *
 * **`maxLength` is checked BEFORE `pattern` runs.** Not for tidiness: it
 * is what bounds pattern evaluation *by construction*. A declared pattern
 * is author input compiled by the regex engine, and the only reliable
 * defence against a catastrophic-backtracking input is that the input
 * cannot be long. Reversing these two lines would leave the anchoring and
 * no-backreference rules defending alone against an unbounded subject.
 */
import { DiagnosticBag } from '../diag/diagnostic.js';
import { RESERVED_FLAGS, type Alias, type Aliases } from '../cli/flags.js';
import { declarationLooksSecret, valueLooksSecret } from '../security/secret-heuristic.js';
import { MAX_LENGTH_DEFAULT } from './schema.js';
import type { PackJson, ParameterDecl } from './types.js';

/**
 * C-7's two bounds, **re-exported rather than restated**.
 *
 * `schema.ts` enforces the ceiling on the *declaration*; this module
 * applies the default to an *answer*. Two definitions of one bound is how
 * a validator and the thing it validates end up disagreeing about what
 * they agreed on.
 */
export { MAX_LENGTH_CEILING, MAX_LENGTH_DEFAULT } from './schema.js';

/** US-8. Above this, `validate` refuses rather than rendering. */
export const MAX_COMBINATIONS = 32;

/** An answer as recorded. `boolean` parameters record a boolean; every
 *  other type records a string. */
export type Answer = string | boolean;

/**
 * Which of the two occasions a value is being checked on.
 *
 * This is the **only** input that decides between `E-PARAM-INVALID` and
 * `E-MANIFEST-ANSWER-INVALID`, and it is a parameter rather than a
 * property of the value so that a caller cannot get it by accident.
 */
export type Occasion = 'collection' | 'read-back';

/* ── pack-wide declaration rules ─────────────────────────────────────── */

/**
 * The rules one parameter cannot see.
 *
 * `schema.ts` validates each entry alone; this validates the **set**. The
 * credential ban is here rather than there for the same reason: it is the
 * one declaration rule whose remedy (`notASecret`) is a security gate, and
 * keeping it beside the answer path makes the pair visible together.
 */
export function checkParameterSet(pack: PackJson): DiagnosticBag {
  const bag = new DiagnosticBag();
  const params = pack.parameters ?? [];

  const ids = new Set<string>();
  const flags = new Map<string, string>();

  for (const p of params) {
    if (ids.has(p.id)) {
      bag.add('E-UNKNOWN-VALUE', {
        values: { value: p.id, field: 'parameter id', allowed: 'a unique id within the pack' },
      });
    }
    ids.add(p.id);

    if (p.flag !== undefined) {
      // The reserved collision is schema.ts's; this is the OTHER half of
      // the same rule — an alias already claimed by a sibling parameter,
      // which no per-entry check can see.
      const owner = flags.get(p.flag);
      if (owner !== undefined) {
        bag.add('E-PARAM-FLAG-INVALID', {
          values: { id: p.id, flag: p.flag, reason: `is already declared by parameter "${owner}"` },
        });
      } else {
        flags.set(p.flag, p.id);
      }
    }

    // C-15. Exit 2 and the pack's fault: caught before anybody runs it.
    if (declarationLooksSecret(p)) {
      bag.add('E-PARAM-SECRET-SUSPECTED', { values: { id: p.id } });
    }
  }

  return bag;
}

/**
 * The alias table for argv pass 2.
 *
 * **Built from `pack.json` data, which is what keeps S5 testable**: the
 * CLI holds no pack-specific knowledge, so `--calibration high-floor` is
 * exactly `--set constraintFloor=high-floor` and nothing in `flags.ts`
 * knows the word `calibration`.
 *
 * A `boolean` parameter's alias is a bare flag; every other type's takes a
 * value. Malformed and colliding aliases are **excluded** here rather than
 * reported — reporting is `checkParameterSet`'s and `schema.ts`'s, and an
 * alias table that registered a reserved name would be the shadowing this
 * whole rule exists to prevent.
 */
export function aliasesFor(params: readonly ParameterDecl[] = []): Aliases {
  const out: Record<string, Alias> = {};
  const reserved = new Set<string>(RESERVED_FLAGS);
  for (const p of params) {
    if (p.flag === undefined || reserved.has(p.flag) || p.flag in out) continue;
    out[p.flag] = p.type === 'boolean' ? { id: p.id, arity: 'boolean' } : { id: p.id, arity: 'value' };
  }
  return out;
}

/* ── the recipe-wide rules ───────────────────────────────────────────── */

/** Parameter id → the distinct values `when` clauses compare it against.
 *  Supplied by the caller rather than read here: this module holds no
 *  recipe types, and the dependency runs the other way. */
export type WhenValues = ReadonlyMap<string, ReadonlySet<string>>;

/**
 * A parameter named in a `when` must be `required` or carry a `default`.
 *
 * The reason is one sentence: **no branch may ever be evaluated against
 * `undefined`**. A `when` on an unanswerable parameter does not fail
 * loudly, it simply never matches — so the step silently vanishes, and the
 * user discovers it as a missing file rather than as an error.
 */
export function checkWhenParameters(pack: PackJson, when: WhenValues): DiagnosticBag {
  const bag = new DiagnosticBag();
  const byId = new Map((pack.parameters ?? []).map((p) => [p.id, p]));
  for (const id of when.keys()) {
    const p = byId.get(id);
    if (p === undefined) continue; // an undeclared id is E-RECIPE-STEP-INVALID, T-0405's.
    if (p.required !== true && p.default === undefined) {
      bag.add('E-PARAM-UNDECIDABLE', { values: { id } });
    }
  }
  return bag;
}

/**
 * The combinations `validate` must render the pack across.
 *
 * **A parameter's domain is the set of answers the recipe can tell
 * apart**, not the set of answers it can hold — which is what makes this
 * finite for a `string`:
 *
 *   enum     the declared `values`. Already exactly the partition.
 *   boolean  `true` and `false`.
 *   string   each value some `when` compares it against, **plus one
 *            representative of "none of them"** — since a string answer
 *            matching no `when` is a distinct branch of the recipe and
 *            rendering only the named values would never exercise it.
 *
 * The sentinel for that last class is `null`, and it is `null` rather than
 * a string precisely because **no string can be trusted not to collide**
 * with a value some `when` names.
 */
export function combinations(
  pack: PackJson,
  when: WhenValues,
): { readonly combos: readonly ReadonlyMap<string, Answer | null>[]; readonly bag: DiagnosticBag } {
  const bag = new DiagnosticBag();
  const byId = new Map((pack.parameters ?? []).map((p) => [p.id, p]));

  const axes: { id: string; domain: readonly (Answer | null)[] }[] = [];
  for (const [id, values] of when) {
    const p = byId.get(id);
    if (p === undefined) continue;
    axes.push({ id, domain: domainOf(p, values) });
  }

  let n = 1;
  for (const a of axes) n *= a.domain.length;

  if (n > MAX_COMBINATIONS) {
    // Refuse rather than render: the bound exists so that "every
    // combination passes every other rule" stays a claim somebody can
    // check, and past 32 it stops being one.
    bag.add('E-PARAM-COMBINATORICS', { values: { name: pack.name, n: String(n) } });
    return { combos: [], bag };
  }

  let combos: ReadonlyMap<string, Answer | null>[] = [new Map()];
  for (const axis of axes) {
    const next: ReadonlyMap<string, Answer | null>[] = [];
    for (const base of combos) {
      for (const v of axis.domain) next.push(new Map([...base, [axis.id, v]]));
    }
    combos = next;
  }
  return { combos, bag };
}

function domainOf(p: ParameterDecl, whenValues: ReadonlySet<string>): readonly (Answer | null)[] {
  if (p.type === 'boolean') return [true, false];
  if (p.type === 'enum') return [...(p.values ?? [])];
  return [...whenValues, null];
}

/* ── answers ─────────────────────────────────────────────────────────── */

/**
 * Check one answer against its declaration.
 *
 * Returns the bag rather than throwing, and the bag holds **at most one**
 * diagnostic: an answer that fails two rules is still one wrong answer,
 * and reporting it twice would make a user fix the first, rerun, and be
 * told the second.
 */
export function checkAnswer(decl: ParameterDecl, value: Answer, occasion: Occasion): DiagnosticBag {
  const bag = new DiagnosticBag();
  const reason = answerFault(decl, value);
  if (reason === null) return bag;

  if (occasion === 'read-back') {
    bag.add('E-MANIFEST-ANSWER-INVALID', {
      values: { id: decl.id, reason: reason.reason, value: String(value) },
    });
  } else {
    bag.add('E-PARAM-INVALID', {
      values: { value: String(value), id: decl.id, values: reason.allowed },
    });
  }
  return bag;
}

/** The fault, or `null`. Split out because the two codes want the same
 *  decision worded two ways, and computing it twice is how they would
 *  drift apart. */
function answerFault(decl: ParameterDecl, value: Answer): { reason: string; allowed: string } | null {
  if (decl.type === 'boolean') {
    return typeof value === 'boolean'
      ? null
      : { reason: 'it is not a boolean', allowed: 'true, false' };
  }

  if (typeof value !== 'string') {
    return { reason: `it is a ${typeof value}, not a string`, allowed: 'a string' };
  }

  if (decl.type === 'enum') {
    const values = decl.values ?? [];
    // "listing the permitted values verbatim" (US-8) — verbatim, because a
    // user comparing what they typed against a paraphrase cannot see the
    // difference that matters.
    return values.includes(value) ? null : { reason: 'it is not one of the declared values', allowed: values.join(', ') };
  }

  // C-7, and the ORDER is the control. See the module header.
  const max = decl.maxLength ?? MAX_LENGTH_DEFAULT;
  if (value.length > max) {
    return {
      reason: `it is ${value.length} characters; the limit is ${max}`,
      allowed: `at most ${max} characters`,
    };
  }

  const pattern = decl.pattern;
  if (pattern === undefined) {
    // Unreachable for a validated pack — E-PARAM-NO-PATTERN is exit 2 and
    // fires first — so fail CLOSED rather than accept anything.
    return { reason: 'the pack declares no "pattern" for it', allowed: 'nothing, until the pack declares a pattern' };
  }

  let re: RegExp;
  try {
    re = new RegExp(pattern, 'u');
  } catch {
    return { reason: 'the pack\'s declared "pattern" does not compile', allowed: pattern };
  }
  return re.test(value) ? null : { reason: 'it does not match the declared pattern', allowed: pattern };
}

/** Does an answer look like a credential? A **warning**, never a refusal —
 *  see `secret-heuristic.ts` for why the two directions differ. */
export function warnIfSecretAnswer(bag: DiagnosticBag, decl: ParameterDecl, value: Answer): void {
  if (typeof value === 'string' && valueLooksSecret(value)) {
    bag.add('W-ANSWER-LOOKS-SECRET', { values: { id: decl.id } });
  }
}

export interface ResolvedAnswers {
  readonly answers: ReadonlyMap<string, Answer>;
  readonly bag: DiagnosticBag;
}

/**
 * Resolve supplied answers against the declarations.
 *
 * **Defaults are recorded, not inherited** (US-8: *"all answers are
 * recorded verbatim in the manifest, including defaults accepted without
 * being typed"*). An unrecorded default would make the applied tree
 * non-recomputable the moment the pack's default changed — the tree would
 * still be right and `verify` would no longer be able to say so.
 *
 * `E-PARAM-UNANSWERABLE` is **not** raised here: it is a fact about there
 * being no TTY to ask on, which is F2's to know, and this module has no
 * business inspecting a terminal.
 */
export function resolveAnswers(
  params: readonly ParameterDecl[] = [],
  supplied: ReadonlyMap<string, Answer> = new Map(),
): ResolvedAnswers {
  const bag = new DiagnosticBag();
  const answers = new Map<string, Answer>();

  for (const p of params) {
    const given = supplied.get(p.id);
    if (given !== undefined) {
      const faults = checkAnswer(p, given, 'collection');
      for (const d of faults.items) bag.push(d);
      warnIfSecretAnswer(bag, p, given);
      if (faults.length === 0) answers.set(p.id, given);
      continue;
    }

    if (p.default !== undefined) {
      answers.set(p.id, p.default);
      continue;
    }

    if (p.required === true) {
      bag.add('E-PARAM-MISSING', { values: { id: p.id, prompt: p.prompt } });
    }
  }

  return { answers, bag };
}

/**
 * Re-check every recorded answer on read-back.
 *
 * Called by `verify` and by `update` **before** recomputing, because a
 * recomputation from an answer that does not satisfy its own declaration
 * would produce a tree and report it confidently.
 */
export function checkRecordedAnswers(
  params: readonly ParameterDecl[] = [],
  recorded: ReadonlyMap<string, Answer> = new Map(),
): DiagnosticBag {
  const bag = new DiagnosticBag();
  for (const p of params) {
    const value = recorded.get(p.id);
    if (value === undefined) continue; // a missing answer is the manifest's own rule, T-0704's.
    for (const d of checkAnswer(p, value, 'read-back').items) bag.push(d);
  }
  return bag;
}
