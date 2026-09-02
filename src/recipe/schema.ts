/**
 * The `recipe.json` validator — **fail-closed and total**. T-0402, US-31.
 *
 * Every step is narrowed to **exactly one** union arm or rejected. There
 * is no "unrecognised but harmless" path, because the whole safety
 * argument is that a pack cannot express something the format did not
 * anticipate — and a validator that shrugs at a step it does not
 * understand has conceded that argument quietly.
 *
 * ── `op` is matched literally, and that is a rule, not an omission ────
 *
 * No trimming, no case folding, no Unicode normalization (C-25). `"copy "`
 * with a trailing space, `"Copy"` and the fullwidth `"ｃｏｐｙ"` are each
 * `E-RECIPE-PRIMITIVE-UNKNOWN`. **A parser that trims is a parser that
 * accepts a step a reviewer read as invalid** — and the reviewer is the
 * control here, since `pack info` renders the plan for a human to approve.
 *
 * `merge-json` gets the same code as any other unknown op (US-31 is
 * explicit that it must), with **one extra message line** saying it was
 * withdrawn — so an author is told rather than left to assume a typo.
 *
 * ── Order, and one thing counted before another ───────────────────────
 *
 * `E-RECIPE-TOO-MANY-STEPS` counts the **total declared** steps — base
 * plus every declared scaffold — **before any `when` filtering**, because
 * that is what `pack info` prints. The bound is an **inspectability**
 * control, not a DoS control: there is no remote attacker, and
 * `E-PAYLOAD-TOO-LARGE` already bounds the bytes. What it protects is the
 * argument that made a script primitive refusable in the first place.
 *
 * ── A rule that lands here rather than where the plan is built ────────
 *
 * F1 assigns the `fillExpected`/`adaptExpected` mutual exclusion to
 * T-0410, in `plan-steps.ts`. It is checked **here** instead, because it
 * is a property of the *declaration* and needs no plan, no write set and
 * no project — and a rule checkable at declaration time that waits for the
 * plan is a rule `validate` reports later than it could. T-0410's *other*
 * rule, the empty write set, genuinely needs the plan and stays there.
 */
import { DiagnosticBag } from '../diag/diagnostic.js';
import type { JsonValue } from '../json/parse-strict.js';
import {
  COMMON_STEP_FIELDS,
  MAX_RECIPE_STEPS,
  RECIPE_OPS,
  STEP_BOOLEAN_FIELDS,
  STEP_FIELDS,
  SUPPORTED_RECIPE_FORMAT_VERSION,
  type Recipe,
  type RecipeOp,
  type RecipeStep,
} from './types.js';

type Obj = Record<string, JsonValue>;

const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);

/** `^\.[a-z0-9-]{1,16}$` — the declared `strip-suffix` grammar. */
const SUFFIX_RE = /^\.[a-z0-9-]{1,16}$/;

/** C-9. A line break in a `find`, a `replace` or a substituted value turns
 *  one line of a generated file into two. All four separators, not just
 *  `\n`: `U+2028` and `U+2029` are line terminators to a JavaScript
 *  reader and invisible to a human one. */
const LINE_BREAK = /[\n\r\u2028\u2029]/;

export interface ValidateRecipeResult {
  /** Present iff **every** step narrowed. A partially-valid recipe is the
   *  shape that lets a later stage plan half a pack. */
  readonly recipe?: Recipe;
  readonly bag: DiagnosticBag;
}

/**
 * `packName` names the pack in messages; `file` is the path shown for a
 * malformed document. Two arguments for the same reason `validatePackJson`
 * has two — one cannot be both the identity and the location.
 */
export function validateRecipe(
  value: JsonValue,
  packName: string,
  file: string = `${packName}/recipe.json`,
): ValidateRecipeResult {
  const bag = new DiagnosticBag();

  if (!isObj(value)) {
    bag.add('E-RECIPE-INVALID', { values: { path: file, detail: 'the top level is not an object' } });
    return { bag };
  }

  const fv = value['formatVersion'];
  if (typeof fv !== 'number' || !Number.isInteger(fv)) {
    bag.add('E-RECIPE-INVALID', { values: { path: file, detail: '"formatVersion" is not an integer' } });
    return { bag };
  }
  if (fv > SUPPORTED_RECIPE_FORMAT_VERSION) {
    // C-24, and a DIFFERENT code from pack.json's: two files, two version
    // axes, and a user told to upgrade needs to know which declaration was
    // newer. Before v2.3 the recipe declared a version no rule checked —
    // fail-open in the one position the closed-enumeration rule closes.
    bag.add('E-RECIPE-FORMAT-NEWER', {
      values: { pack: packName, declared: String(fv), supported: String(SUPPORTED_RECIPE_FORMAT_VERSION) },
    });
    return { bag };
  }

  const rawSteps = value['steps'];
  if (!Array.isArray(rawSteps)) {
    bag.add('E-RECIPE-INVALID', { values: { path: file, detail: '"steps" is not an array' } });
    return { bag };
  }

  const rawScaffolds = value['scaffolds'];
  if (rawScaffolds !== undefined && !isObj(rawScaffolds)) {
    bag.add('E-RECIPE-INVALID', { values: { path: file, detail: '"scaffolds" is not an object' } });
    return { bag };
  }
  const scaffoldEntries: [string, JsonValue[]][] = [];
  if (isObj(rawScaffolds)) {
    for (const [id, v] of Object.entries(rawScaffolds)) {
      if (!Array.isArray(v)) {
        bag.add('E-RECIPE-INVALID', {
          values: { path: file, detail: `scaffold "${id}" is not an array of steps` },
        });
        return { bag };
      }
      scaffoldEntries.push([id, v]);
    }
  }

  // Counted BEFORE any `when` filtering, because that is what pack info
  // prints — the list a reviewer reads is the list being bounded.
  const declared = rawSteps.length + scaffoldEntries.reduce((n, [, v]) => n + v.length, 0);
  if (declared > MAX_RECIPE_STEPS) {
    bag.add('E-RECIPE-TOO-MANY-STEPS', { values: { name: packName, n: String(declared) } });
    return { bag };
  }

  const steps: RecipeStep[] = [];
  let ok = true;

  // Step indices are GLOBAL across base and scaffolds, in declared order,
  // so an index in a diagnostic identifies one step in the printed plan.
  let index = 0;
  for (const raw of rawSteps) {
    const step = validateStep(bag, raw, index++);
    if (step === null) ok = false;
    else steps.push(step);
  }

  const scaffolds: Record<string, RecipeStep[]> = {};
  for (const [id, arr] of scaffoldEntries) {
    const out: RecipeStep[] = [];
    for (const raw of arr) {
      const step = validateStep(bag, raw, index++);
      if (step === null) ok = false;
      else out.push(step);
    }
    scaffolds[id] = out;
  }

  if (!ok) return { bag };

  const recipe: Recipe = scaffoldEntries.length > 0
    ? { formatVersion: fv, steps, scaffolds }
    : { formatVersion: fv, steps };
  return { recipe, bag };
}

/** The usage line every `E-RECIPE-STEP-INVALID` carries, derived from the
 *  field table rather than written out six times — a table and a message
 *  that must agree is a table and a message that will not. */
export function usageOf(op: RecipeOp): string {
  const { required, optional } = STEP_FIELDS[op];
  const opt = [...optional, ...COMMON_STEP_FIELDS.filter((f) => f !== 'op')];
  return `${op} takes ${required.join(', ')}${opt.length > 0 ? `, and optionally ${opt.join(', ')}` : ''}.`;
}

function stepInvalid(bag: DiagnosticBag, index: number, op: string, reason: string): null {
  bag.add('E-RECIPE-STEP-INVALID', {
    step: index,
    values: {
      index: String(index),
      op,
      reason,
      usage: (RECIPE_OPS as readonly string[]).includes(op) ? usageOf(op as RecipeOp) : '',
    },
  });
  return null;
}

function validateStep(bag: DiagnosticBag, raw: JsonValue, index: number): RecipeStep | null {
  if (!isObj(raw)) {
    return stepInvalid(bag, index, '?', 'it is not an object');
  }

  const op = raw['op'];
  if (typeof op !== 'string' || !(RECIPE_OPS as readonly string[]).includes(op)) {
    // The `note` line is the whole reason this code carries a slot: one
    // code, two messages, and an author who typed `merge-json` is told it
    // was withdrawn rather than left to hunt for a typo.
    bag.add('E-RECIPE-PRIMITIVE-UNKNOWN', {
      step: index,
      values: {
        index: String(index),
        op: typeof op === 'string' ? op : JSON.stringify(op),
        note: op === 'merge-json' ? 'merge-json does not ship at v1.0; it is deferred to v1.1.' : '',
      },
    });
    return null;
  }

  const { required, optional } = STEP_FIELDS[op as RecipeOp];
  const known = new Set<string>([...required, ...optional, ...COMMON_STEP_FIELDS]);

  for (const key of Object.keys(raw)) {
    if (!known.has(key)) {
      // A field the primitive does not take is E-RECIPE-STEP-INVALID, not
      // a warning: US-31 names it among the wrong-inputs faults, and a
      // step carrying `to` on a `substitute` has misunderstood the
      // primitive rather than merely said something extra.
      return stepInvalid(bag, index, op, `"${key}" is not a field of ${op}`);
    }
  }

  for (const key of required) {
    if (!(key in raw)) return stepInvalid(bag, index, op, `it declares no "${key}"`);
  }

  // US-1's boolean-typed fields. `"true"` is E-UNKNOWN-VALUE and not a
  // coercion — for `fillExpected` a non-boolean does more than mis-report
  // a state, it silently disarms the prohibition that stops `update`
  // overwriting a filled project-brief.md.
  for (const key of STEP_BOOLEAN_FIELDS) {
    const v = raw[key];
    if (v !== undefined && typeof v !== 'boolean') {
      bag.add('E-UNKNOWN-VALUE', {
        step: index,
        values: { value: JSON.stringify(v), field: `step ${index} ${key}`, allowed: 'true, false' },
      });
      return null;
    }
  }

  if (raw['adaptExpected'] === true && raw['fillExpected'] === true) {
    return stepInvalid(
      bag,
      index,
      op,
      'it declares both "adaptExpected" and "fillExpected", which is a file the skill adapts and the user fills at once',
    );
  }

  const whenFault = validateWhen(raw['when']);
  if (whenFault !== null) return stepInvalid(bag, index, op, whenFault);

  const typeFault = validateFields(raw, op as RecipeOp);
  if (typeFault !== null) return stepInvalid(bag, index, op, typeFault);

  return raw as unknown as RecipeStep;
}

/**
 * `when` is **single equality only** — no operators, no negation, no
 * second key.
 *
 * The restriction is what keeps the rendered plan readable: `pack info`
 * must be able to say *this step runs when X is Y*, in those words, for
 * every step. A compound `when` is not merely unsupported, it is a step
 * whose condition cannot be printed.
 */
function validateWhen(v: JsonValue | undefined): string | null {
  if (v === undefined) return null;
  if (!isObj(v)) return '"when" is not an object';
  const keys = Object.keys(v);
  if (keys.length !== 1) {
    return `"when" declares ${keys.length} conditions; only single equality is supported`;
  }
  const only = keys[0] as string;
  if (typeof v[only] !== 'string') return `"when.${only}" is not a string`;
  return null;
}

function validateFields(raw: Obj, op: RecipeOp): string | null {
  for (const key of ['from', 'to', 'template', 'suffix', 'find', 'replace'] as const) {
    if (key in raw && typeof raw[key] !== 'string') return `"${key}" is not a string`;
  }
  for (const key of ['in', 'exclude', 'anchors'] as const) {
    const v = raw[key];
    if (v === undefined) continue;
    if (!Array.isArray(v) || v.some((x) => typeof x !== 'string')) {
      return `"${key}" is not an array of strings`;
    }
    if (key !== 'exclude' && v.length === 0) return `"${key}" is empty`;
  }

  if ('tokens' in raw) {
    const t = raw['tokens'];
    if (!isObj(t) || Object.values(t).some((x) => typeof x !== 'string')) {
      return '"tokens" is not an object of strings';
    }
  }

  if (op === 'strip-suffix' && !SUFFIX_RE.test(raw['suffix'] as string)) {
    return `"suffix" must match ${SUFFIX_RE.source}`;
  }

  // C-9. A single find or replace may not become two lines of a file.
  if (op === 'rewrite-path') {
    for (const key of ['find', 'replace'] as const) {
      if (LINE_BREAK.test(raw[key] as string)) return `"${key}" contains a line break`;
    }
    if ((raw['find'] as string).length === 0) return '"find" is empty';
  }

  return null;
}
