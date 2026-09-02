/**
 * The ordered plan: merge, filter, order, and the two declared sets.
 * T-0405, T-0406, T-0407, T-0410.
 *
 * ── Merge order is a determinism property ─────────────────────────────
 *
 * Base `steps` first, then each **selected** scaffold's steps in
 * **`pack.json`-declared scaffold order** — never the order typed on the
 * command line. Two users typing `--scaffold a --scaffold b` in opposite
 * orders must get byte-identical projects, and steps write files, so the
 * merge order *is* the tree.
 *
 * ── The collision rule, and the obvious wrong fix ─────────────────────
 *
 * `E-MAP-COLLISION` is *"two steps **place** the same applied path"*,
 * computed over the **placing** primitives only. It must **not** widen to
 * "two steps have the path in their write sets": a `substitute` whose `in`
 * matches a path an earlier `copy` placed is legitimate and is the shape
 * every v1.0 pack uses. §F1.2 names this wrong fix explicitly, because it
 * reads like a tightening and breaks all three bundled packs.
 *
 * The placing/editing split is also what the **edit-before-place** check
 * runs on: a recipe that edits before it places fails validation rather
 * than silently doing nothing.
 *
 * ── Two declared sets, one quantifier ─────────────────────────────────
 *
 * The adapt-expected and fill-expected sets are the **union of the write
 * sets** of the steps declaring them — the same quantifier every
 * destination rule uses, and for the same reason: `rewrite-path` and
 * `substitute` have no `to`, so a rule over `to` would exempt exactly the
 * two primitives that change a file's bytes after it was placed.
 *
 * Both are resolved **at plan time from the recipe alone**, and neither
 * changes anything about the apply — the bytes, the printed plan, the
 * disclosure, the confinement gate, the collision rule and the
 * recomputation are identical with and without them. `adaptExpected` has
 * one consumer (`verify`); `fillExpected` has two, the second being
 * `update`'s **absolute prohibition** on overwriting the path.
 */
import { DiagnosticBag } from '../diag/diagnostic.js';
import { collisionKey, type AppliedPath } from '../security/confine.js';
import { OPS } from './ops/index.js';
import { stepWriteSet, unionWriteSets } from './write-set.js';
import { isPlacing, type Recipe, type RecipeStep } from './types.js';
import type { Answer } from '../pack/parameters.js';
import type { PackJson, ScaffoldDecl } from '../pack/types.js';

export interface PlannedStep {
  readonly step: RecipeStep;
  /** 0-based index in the merged plan. Diagnostics name it, and it is what
   *  `pack info` prints beside each line. */
  readonly index: number;
  /** The scaffold that contributed the step, or `null` for a base step. */
  readonly scaffold: string | null;
  readonly writeSet: readonly AppliedPath[];
}

export interface Plan {
  readonly steps: readonly PlannedStep[];
  /** Every applied path the plan places or edits, in plan order. */
  readonly written: readonly AppliedPath[];
  /** Q-56. One consumer: `verify`. */
  readonly adaptExpected: readonly AppliedPath[];
  /** Q-79. Two consumers: `verify`'s report state, and `update`'s
   *  prohibition on overwriting. */
  readonly fillExpected: readonly AppliedPath[];
  readonly bag: DiagnosticBag;
}

export interface PlanInput {
  readonly pack: PackJson;
  readonly recipe: Recipe;
  /** Selected scaffold declarations, already in `pack.json` order — the
   *  output of `selectScaffolds`. */
  readonly selected: readonly ScaffoldDecl[];
  readonly answers: ReadonlyMap<string, Answer>;
  /** Pack-relative POSIX paths of every payload file. */
  readonly payload: readonly string[];
}

/** Declared steps in merge order, before `when` filtering. Separated so
 *  the scaffold-mismatch check can run over the declaration and the
 *  filter can run over the result — two questions, two passes. */
interface Declared {
  readonly step: RecipeStep;
  readonly scaffold: string | null;
}

export function planSteps(input: PlanInput): Plan {
  const bag = new DiagnosticBag();
  const { pack, recipe, selected, answers, payload } = input;

  checkScaffoldAgreement(bag, pack, recipe);

  const declared: Declared[] = recipe.steps.map((step) => ({ step, scaffold: null }));
  for (const s of selected) {
    for (const step of recipe.scaffolds?.[s.id] ?? []) {
      declared.push({ step, scaffold: s.id });
    }
  }

  // `when` filtering. A step whose parameter has no recorded answer is
  // SKIPPED rather than run: E-PARAM-UNDECIDABLE already made an
  // unanswerable `when` a validate-time fault, so reaching here with no
  // answer means the parameter was answered with something else.
  const kept = declared.filter(({ step }) => selects(step, answers));

  const steps: PlannedStep[] = [];
  const written: AppliedPath[] = [];

  kept.forEach(({ step, scaffold }, index) => {
    const { paths, bag: stepBag } = stepWriteSet({ step, index, payload, writtenSoFar: written });
    for (const d of stepBag.items) bag.push(d);

    // Only PLACING ops extend the written-set: an editing op changes bytes
    // at paths that are already in it, and adding them again would let a
    // later `in` glob resolve against a path twice.
    if (isPlacing(step.op)) written.push(...paths);

    steps.push({ step, index, scaffold, writeSet: paths });
  });

  checkEditBeforePlace(bag, steps);
  checkPlacementCollisions(bag, steps);
  checkSources(bag, steps, payload);

  return {
    steps,
    written,
    adaptExpected: declaredSet(bag, steps, 'adaptExpected'),
    fillExpected: declaredSet(bag, steps, 'fillExpected'),
    bag,
  };
}

/** `"when": { "<paramId>": "<value>" }`, single equality. The value is
 *  compared as a **string**, which is why a `boolean` parameter's `when`
 *  compares against `"true"` — the recipe is JSON text and the comparison
 *  has to be expressible in it. */
function selects(step: RecipeStep, answers: ReadonlyMap<string, Answer>): boolean {
  if (step.when === undefined) return true;
  const [id, want] = Object.entries(step.when)[0] as [string, string];
  const got = answers.get(id);
  return got !== undefined && String(got) === want;
}

/**
 * A `pack.json`/`recipe.json` scaffold mismatch **in either direction**.
 *
 * A pack declaring a scaffold the recipe has no steps for would apply
 * nothing and say nothing; a recipe key naming no declared scaffold is
 * steps no `--scaffold` can ever select. Both are the pack author's, both
 * are exit 2, and `E-SCAFFOLD-UNKNOWN` is deliberately **not** used —
 * that one is reserved for a name the *user* typed.
 */
function checkScaffoldAgreement(bag: DiagnosticBag, pack: PackJson, recipe: Recipe): void {
  const declaredIds = new Set((pack.scaffolds ?? []).map((s) => s.id));
  const recipeIds = new Set(Object.keys(recipe.scaffolds ?? {}));

  for (const id of declaredIds) {
    if (!recipeIds.has(id)) {
      bag.add('E-RECIPE-STEP-INVALID', {
        values: {
          index: '-',
          op: 'scaffolds',
          reason: `pack.json declares the scaffold "${id}" and recipe.json has no steps for it`,
          usage: '',
        },
      });
    }
  }
  for (const id of recipeIds) {
    if (!declaredIds.has(id)) {
      bag.add('E-RECIPE-STEP-INVALID', {
        values: {
          index: '-',
          op: 'scaffolds',
          reason: `recipe.json declares steps for "${id}", which pack.json does not declare`,
          usage: '',
        },
      });
    }
  }
}

/** A recipe that edits before it places fails validation rather than
 *  silently doing nothing. The write set already reports an `in` matching
 *  nothing; this reports the *ordering* fault by name, which is the one an
 *  author can act on. */
function checkEditBeforePlace(bag: DiagnosticBag, steps: readonly PlannedStep[]): void {
  let placed = false;
  for (const { step, index } of steps) {
    if (isPlacing(step.op)) {
      placed = true;
      continue;
    }
    if (!placed) {
      bag.add('E-RECIPE-STEP-INVALID', {
        step: index,
        values: {
          index: String(index),
          op: step.op,
          reason: 'it edits applied files before any step has placed one',
          usage: '',
        },
      });
    }
  }
}

/**
 * Three collisions over the **placing** steps, by `collisionKey`.
 *
 * `collisionKey` is NFC plus ASCII case-folding (known limit 17), which is
 * what makes one comparison answer all three questions: exact, case-only
 * and normalization-only collisions all key alike, and the codes differ
 * only in what they tell the author to do about it.
 */
function checkPlacementCollisions(bag: DiagnosticBag, steps: readonly PlannedStep[]): void {
  const seen = new Map<string, { path: string; step: PlannedStep }>();

  for (const planned of steps) {
    if (!isPlacing(planned.step.op)) continue;
    for (const path of planned.writeSet) {
      const key = collisionKey(path);
      const first = seen.get(key);
      if (first === undefined) {
        seen.set(key, { path, step: planned });
        continue;
      }

      if (first.path === path) {
        bag.add('E-MAP-COLLISION', {
          values: {
            path,
            a: String(first.step.index),
            opA: first.step.step.op,
            fromA: sourceOf(first.step.step) ?? '',
            b: String(planned.index),
            opB: planned.step.op,
            fromB: sourceOf(planned.step) ?? '',
          },
        });
      } else if (first.path.normalize('NFC') === path.normalize('NFC')) {
        // Same code points after normalization: two byte sequences for one
        // filename, which macOS stores as a single file.
        bag.add('E-MAP-NORM-COLLISION', { values: { a: first.path, b: path } });
      } else {
        bag.add('E-MAP-CASE-COLLISION', { values: { a: first.path, b: path } });
      }
    }
  }
}

/**
 * C-38. One fault, one code, **at whichever field carries the source**.
 *
 * Through v2.3 `generate`'s only input had no named code for the commonest
 * authoring mistake on that primitive, because the rule was written for
 * `from` and `generate` does not have one. The registry names each op's
 * source field precisely so this check can be quantified over the field
 * rather than over the word `from`.
 */
function checkSources(
  bag: DiagnosticBag,
  steps: readonly PlannedStep[],
  payload: readonly string[],
): void {
  const files = new Set(payload);
  const dirs = new Set<string>();
  for (const p of payload) {
    const parts = p.split('/');
    for (let i = 1; i < parts.length; i++) dirs.add(`${parts.slice(0, i).join('/')}/`);
  }

  for (const { step, index } of steps) {
    const field = OPS[step.op].sourceField;
    if (field === null) continue;
    const path = (step as unknown as Record<string, string>)[field] as string;
    const present = path.endsWith('/') ? dirs.has(path) : files.has(path);
    if (!present) {
      bag.add('E-RECIPE-SOURCE-MISSING', {
        step: index,
        values: { index: String(index), op: step.op, path, field },
      });
    }
  }
}

/**
 * The adapt-expected or fill-expected set.
 *
 * **A declaring step whose write set is empty is `E-RECIPE-STEP-INVALID`**
 * — the same reasoning as an `in` that matches nothing: a declaration that
 * covers no path is an authoring mistake, and silently accepting it is how
 * a pack ends up believing it declared something it did not. For
 * `fillExpected` the cost is higher than a mis-report: the set is what
 * `update` is forbidden to overwrite, so an empty one is a prohibition
 * that protects nothing.
 */
function declaredSet(
  bag: DiagnosticBag,
  steps: readonly PlannedStep[],
  field: 'adaptExpected' | 'fillExpected',
): readonly AppliedPath[] {
  const sets: (readonly AppliedPath[])[] = [];
  for (const { step, index, writeSet } of steps) {
    if (step[field] !== true) continue;
    if (writeSet.length === 0) {
      bag.add('E-RECIPE-STEP-INVALID', {
        step: index,
        values: {
          index: String(index),
          op: step.op,
          reason: `it declares "${field}" and writes nothing`,
          usage: '',
        },
      });
      continue;
    }
    sets.push(writeSet);
  }
  return unionWriteSets(sets);
}

function sourceOf(step: RecipeStep): string | null {
  const field = OPS[step.op].sourceField;
  return field === null ? null : ((step as unknown as Record<string, string>)[field] as string);
}
