/**
 * E-14 — the three recipes produce what they claim.
 * T-1401, T-1402, T-1403, T-1404.
 *
 * ── The recipe is the fact; the table is the claim ────────────────────
 *
 * T-1406 states the adjudication rule for this epic: *"where a table and
 * a recipe disagree, the recipe is the fact and the table is the claim."*
 * Every assertion below is therefore taken from `recipe.json` — loaded,
 * schema-validated and planned through the real modules — and **never**
 * from a sentence in F1 or F5. Where a spec sentence disagrees with what
 * the recipe holds, that is a finding reported against the document, not
 * a reason to weaken a number here.
 *
 * ── Declared, planned and applied are three different counts ──────────
 *
 * A recipe **declares** steps; a plan **keeps** the ones a given answer
 * set and scaffold selection select; an apply **writes** what those keep.
 * The three coincide only where a pack has no `when` and no scaffold, and
 * exactly one pack is in that position — `coding`, since Q-82 moved its
 * two backend kits to `addons/`. Every count below says which of the
 * three it is, because conflating them is how "23 steps" became a claim
 * about an apply that runs 22.
 *
 * ── What T-1405 would add, and why it is not here ─────────────────────
 *
 * T-1405 compares the produced tree against §7b **and** each README's
 * produced-tree block. It depends on F1 T-1108 — the write path — which
 * does not exist in this build, so nothing here writes a byte to disk.
 * The rendering below is entirely in memory, exactly as
 * `tests/integration/primitives.test.ts` does it.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

import {
  CLOSING_LINE,
  MAX_RECIPE_STEPS,
  bundledPackNames,
  loadPack,
  openingLine,
  packDir,
  parseStrictJson,
  planSteps,
  renderStep,
  resolveAnswers,
  selectScaffolds,
  stepWriteSet,
  validateRecipe,
  walk,
  type Answer,
  type AppliedPath,
  type PackJson,
  type Recipe,
  type RecipeStep,
} from '../../dist/index.js';

/** The CLI version every load runs at; all three packs floor at `1.0.0`,
 *  which `declaration.test.ts` asserts rather than this file. */
const CLI = '1.0.0';

/** `generate` narrowed out of the closed six-arm union. Taken as an
 *  `Extract` rather than imported, so this file names no type the public
 *  contract in `src/index.ts` does not export. */
type GenerateStep = Extract<RecipeStep, { op: 'generate' }>;

interface Bundled {
  readonly name: string;
  readonly pack: PackJson;
  /** Schema-validated, so every step has narrowed to one of the six arms
   *  and a field read below cannot be a survivor of a malformed step. */
  readonly recipe: Recipe;
  /** Absolute path to the pack directory, for the payload reader. */
  readonly dir: string;
  /** Pack-relative POSIX paths of every payload file. */
  readonly payload: readonly string[];
}

async function bundled(): Promise<readonly Bundled[]> {
  const out: Bundled[] = [];
  for (const name of await bundledPackNames()) {
    const { loaded, bag } = await loadPack(name, CLI);
    assert.deepEqual(
      bag.items.map((d) => d.code),
      [],
      `${name} must load with no diagnostic`,
    );
    assert.ok(loaded, `${name} must load`);

    const parsed = parseStrictJson(loaded.recipeText, `${name}/recipe.json`, 'E-RECIPE-INVALID');
    assert.deepEqual(
      parsed.bag.items.map((d) => d.code),
      [],
      `${name}/recipe.json must parse`,
    );
    const { recipe, bag: schemaBag } = validateRecipe(parsed.value!, name);
    assert.deepEqual(
      schemaBag.items.map((d) => d.code),
      [],
      `${name}/recipe.json must validate`,
    );
    assert.ok(recipe, `${name}'s recipe must validate`);

    // `skip: []` because a pack's payload is the whole directory: the
    // default skip list is a scanner convenience, and a payload file it
    // hid would make every write set below quietly short.
    const dir = fileURLToPath(packDir(name));
    const w = await walk(dir, { skip: [] });
    assert.equal(w.truncated, false, `${name}: the payload walk must be complete`);

    out.push({
      name,
      pack: loaded.pack,
      recipe,
      dir,
      payload: w.entries.filter((e) => e.kind === 'file').map((e) => e.path),
    });
  }
  return out;
}

/**
 * Every **declared** step — base plus every scaffold, whether or not the
 * scaffold is selected and whether or not a `when` would keep it.
 *
 * This is the quantifier T-1402 and T-1403 need and a plan cannot give.
 * A `when`-gated step declaring `adaptExpected` is invisible to a plan
 * run in the other branch, so a rule about *what a pack declares* has to
 * be read off the recipe, not off one apply of it.
 */
function declaredSteps(recipe: Recipe): readonly RecipeStep[] {
  return [...recipe.steps, ...Object.values(recipe.scaffolds ?? {}).flat()];
}

/**
 * The answer variants a pack can be applied under, one per value of each
 * required enum parameter.
 *
 * Derived from `pack.json` rather than hard-coded, so a pack that gains a
 * branching parameter is covered here without an edit. Only `planning`
 * has one, which is why this returns a single empty variant for the other
 * two — and why the adapt- and fill-expected sets below are asserted
 * against **both** calibration branches rather than whichever one
 * `values[0]` happens to be.
 */
function answerVariants(pack: PackJson): readonly ReadonlyMap<string, Answer>[] {
  let out: (readonly [string, Answer])[][] = [[]];
  for (const p of pack.parameters ?? []) {
    if (p.type !== 'enum' || p.required !== true) continue;
    const next: (readonly [string, Answer])[][] = [];
    for (const base of out) for (const v of p.values ?? []) next.push([...base, [p.id, v]]);
    out = next;
  }
  return out.map((pairs) => new Map(pairs));
}

/** Every scaffold selection worth planning: none, then each scaffold
 *  alone. With one scaffold in the product (Q-82) that is exhaustive; a
 *  second scaffold would make it a proper subset, and the day that
 *  happens the combinatorics belong in F1's `combinations`, not here. */
function scaffoldSelections(pack: PackJson): readonly (readonly string[])[] {
  return [[], ...(pack.scaffolds ?? []).map((s) => [s.id])];
}

interface Applied {
  readonly label: string;
  readonly plan: ReturnType<typeof planSteps>;
  readonly files: ReadonlyMap<string, Buffer>;
}

/**
 * Plan — and optionally render — one pack under one selection.
 *
 * A required parameter has no default by definition, so an apply must
 * supply one; leaving one unanswered would raise `E-PARAM-MISSING` and
 * that would be **this test's fault, not the pack's**. The variant's
 * answers win, and anything still unanswered gets a demo value.
 */
function applyPack(
  b: Bundled,
  scaffolds: readonly string[],
  variant: ReadonlyMap<string, Answer>,
  render: boolean,
): Applied {
  const supplied = new Map<string, Answer>(variant);
  for (const p of b.pack.parameters ?? []) {
    if (p.required !== true || supplied.has(p.id)) continue;
    supplied.set(
      p.id,
      p.type === 'boolean' ? true : p.type === 'enum' ? (p.values ?? [''])[0]! : 'Demo Project',
    );
  }

  const { answers, bag: answerBag } = resolveAnswers(b.pack.parameters, supplied);
  assert.deepEqual(
    answerBag.items.map((d) => d.code),
    [],
    `${b.name}: answers must be valid`,
  );
  const { selected, bag: scaffoldBag } = selectScaffolds(b.pack, scaffolds);
  assert.deepEqual(
    scaffoldBag.items.map((d) => d.code),
    [],
    `${b.name}: scaffold selection must be valid`,
  );

  const plan = planSteps({
    pack: b.pack,
    recipe: b.recipe,
    selected,
    answers,
    payload: b.payload,
  });
  const answerLabel = [...variant].map(([k, v]) => `${k}=${String(v)}`).join(',');
  const label = `${b.name}[${scaffolds.join('+') || 'no scaffold'}${answerLabel ? ` ${answerLabel}` : ''}]`;
  assert.deepEqual(
    plan.bag.items.map((d) => d.code),
    [],
    `${label}: planning must raise nothing`,
  );

  const files = new Map<string, Buffer>();
  if (render) {
    for (const planned of plan.steps) {
      const r = renderStep(planned.step, planned.writeSet, {
        index: planned.index,
        payload: b.payload,
        readPayload: (p) => {
          try {
            return readFileSync(join(b.dir, p));
          } catch {
            return null;
          }
        },
        written: files as Map<AppliedPath, Buffer>,
        answers,
        packName: b.pack.name,
        packVersion: b.pack.version,
        cliVersion: CLI,
      });
      assert.deepEqual(
        r.bag.items.map((d) => d.code),
        [],
        `${label}: rendering step ${planned.index} must raise nothing`,
      );
      for (const w of r.writes) files.set(w.path, w.bytes);
    }
  }

  return { label, plan, files };
}

/** Every (scaffold selection × answer variant) plan for one pack. This is
 *  the quantifier the two declared-set tests use: a set that is right in
 *  one branch and wrong in another is not a declared set. */
function everyPlan(b: Bundled, render = false): readonly Applied[] {
  const out: Applied[] = [];
  for (const scaffolds of scaffoldSelections(b.pack)) {
    for (const variant of answerVariants(b.pack)) {
      out.push(applyPack(b, scaffolds, variant, render));
    }
  }
  return out;
}

/* ── T-1401 — the declared step counts, off `recipe.json` ─────────────── */

/**
 * The headline, and it is deliberately three numbers rather than a total.
 *
 * **`coding` 15, with no scaffolds at all.** Q-82 moved `backend-azure`
 * and `backend-aws` to `addons/`, so all fifteen steps run on every apply
 * and `coding` is the first pack in the product for which a single number
 * describes what an apply does. **`writing` 8 base + 5 scaffold** is
 * still the case where it does not: nothing between 8 and 13 is wrong,
 * because the scaffold is opt-in. **`planning` 23 base**, no scaffold —
 * but see the branch test below, because 23 is not what an apply runs
 * either, for a different reason.
 */
test('the declared step counts are what the three recipes hold', async () => {
  const declared: Record<string, { base: number; scaffolds: Record<string, number> }> = {};
  for (const b of await bundled()) {
    const scaffolds: Record<string, number> = {};
    for (const [id, steps] of Object.entries(b.recipe.scaffolds ?? {})) scaffolds[id] = steps.length;
    declared[b.name] = { base: b.recipe.steps.length, scaffolds };
  }

  assert.deepEqual(declared, {
    coding: { base: 15, scaffolds: {} },
    planning: { base: 23, scaffolds: {} },
    writing: { base: 8, scaffolds: { 'writing-workstream': 5 } },
  });
});

/**
 * Declared, planned and applied, per pack — the distinction the counts
 * above cannot carry on their own.
 *
 * `planning` declares **23** and every apply of it runs **22**: the two
 * calibration `copy` steps are mutually exclusive `when` branches, so
 * exactly one is ever kept. That is not a discrepancy — it is what a
 * `when` is — but it is why F1's step bound is defined over the declared
 * count *before* filtering, and why a sentence saying "planning applies
 * 23 steps" would be false about both branches.
 */
test('what each pack declares, and what each apply of it actually runs', async () => {
  const ran: Record<string, readonly number[]> = {};
  for (const b of await bundled()) {
    ran[b.name] = everyPlan(b).map((a) => a.plan.steps.length);
  }

  assert.deepEqual(ran['coding'], [15], 'no when, no scaffold: declared equals run');
  assert.deepEqual(ran['writing'], [8, 13], 'base, then base + the one bundled scaffold');
  assert.deepEqual(
    ran['planning'],
    [22, 22],
    'both calibration branches run 22 of 23 — one of the two when-gated copies is always dropped',
  );
});

/**
 * F1 US-31's inspectability bound, checked from the pack side.
 *
 * The bound is over the **declared** total — base plus every scaffold,
 * before any `when` filtering — because that is what `pack info` prints,
 * and the printed list is the control that justifies refusing a script
 * primitive. The largest pack in the product sits an order of magnitude
 * below it, which is the headroom F1 claims; asserting it here is what
 * would catch a pack that grew past the point a reviewer reads the plan.
 */
test('no bundled recipe approaches the 256-step inspectability bound', async () => {
  const totals: Record<string, number> = {};
  for (const b of await bundled()) totals[b.name] = declaredSteps(b.recipe).length;

  assert.deepEqual(totals, { coding: 15, planning: 23, writing: 13 });
  for (const [name, n] of Object.entries(totals)) {
    assert.ok(n <= MAX_RECIPE_STEPS, `${name} declares ${n} steps against a bound of ${MAX_RECIPE_STEPS}`);
  }
});

/* ── T-1402 — the adapt-expected set ─────────────────────────────────── */

/**
 * **Exactly three adapt-expected paths in the product: the generated
 * `CLAUDE.md`, one per pack.** Q-56, F5 US-38.
 *
 * Asserted over **every** scaffold selection and **both** calibration
 * branches, because `adaptExpected` is a claim about the pack rather than
 * about one apply of it. A fourth path appearing in some branch would be
 * a blanket suppression arriving through a side door: `adapted` is the
 * one `verify` state that is not a failure, so every path in this set is
 * a path whose unexpected edits stop being reported.
 */
test('the adapt-expected set is exactly three paths, one CLAUDE.md per pack', async () => {
  const found: string[] = [];
  for (const b of await bundled()) {
    for (const applied of everyPlan(b)) {
      assert.deepEqual(
        [...applied.plan.adaptExpected],
        ['CLAUDE.md'],
        `${applied.label}: adapt-expected must be the generated CLAUDE.md and nothing else`,
      );
    }
    // One entry per pack, not per branch — the set does not vary by
    // branch, which the loop above is what establishes.
    found.push(`${b.name}: CLAUDE.md`);
  }
  assert.deepEqual(found, ['coding: CLAUDE.md', 'planning: CLAUDE.md', 'writing: CLAUDE.md']);
});

/**
 * The same rule from the declaration side: **no pack declares
 * `adaptExpected` on a `copy`, `rename`, `strip-suffix`, `rewrite-path`
 * or `substitute` step.**
 *
 * This is not the previous test restated. That one reads the resolved
 * path set out of a plan; this one reads the raw declarations, so it also
 * covers a step a `when` filtered out and a scaffold nobody selected.
 * `adaptExpected` is legal on all six primitives (F1 §F1.2) — the field
 * is general and only the *usage* is confined to `generate` — so nothing
 * in the CLI reports this, and a test is the only thing that holds it.
 */
test('adaptExpected is declared on nothing but a generate step, anywhere in the product', async () => {
  const misplaced: string[] = [];
  for (const b of await bundled()) {
    declaredSteps(b.recipe).forEach((step, i) => {
      if (step.adaptExpected === true && step.op !== 'generate') {
        misplaced.push(`${b.name} step ${i}: ${step.op}`);
      }
    });
  }
  assert.deepEqual(misplaced, [], 'only generate may carry adaptExpected in a v1.0 pack');
});

/* ── T-1403 — the fill-expected set ──────────────────────────────────── */

/**
 * **Exactly four fill-expected paths, and they are a different set with a
 * different meaning.** Q-79, F5 US-38.
 *
 * `adaptExpected` says *the skill will rewrite this*; `fillExpected` says
 * *this shipped incomplete and the person who applied it is expected to
 * finish it*. The second has the heavier consequence: `update` may
 * **never** overwrite a path in this set, under any flag, so a path that
 * does not belong here is a document `update` will destroy, and a path
 * missing from it is a document `update` is forbidden to maintain.
 */
test('the fill-expected set is exactly the four paths Q-79 names', async () => {
  const found: string[] = [];
  for (const b of await bundled()) {
    for (const applied of everyPlan(b)) {
      const expected =
        b.name === 'coding'
          ? ['specifications/project-brief.md']
          : b.name === 'planning'
            ? ['project-brief.md']
            : ['writing-guide/tone-of-voice.md', 'project-brief.md'];
      assert.deepEqual([...applied.plan.fillExpected], expected, applied.label);
    }
    found.push(...everyPlan(b)[0]!.plan.fillExpected.map((p) => `${b.name}: ${p}`));
  }

  assert.deepEqual(found, [
    'coding: specifications/project-brief.md',
    'planning: project-brief.md',
    'writing: writing-guide/tone-of-voice.md',
    'writing: project-brief.md',
  ]);
  assert.equal(found.length, 4, 'four applied paths, three of them a project brief');
});

/**
 * **The two flags are mutually exclusive on one step** (F1 US-31,
 * `E-RECIPE-STEP-INVALID`), and no pack declares both anywhere.
 *
 * The CLI's schema refuses the pair, so this cannot be the only guard —
 * but the schema answers *"is this recipe legal"* and this answers *"do
 * the shipping packs use the fields as the format intends"*, which is a
 * different question and the one F5 owns. A step claiming both has not
 * decided whether the file is the skill's to adapt or the user's to fill.
 */
test('no step in any pack declares both adaptExpected and fillExpected', async () => {
  const both: string[] = [];
  for (const b of await bundled()) {
    declaredSteps(b.recipe).forEach((step, i) => {
      if (step.adaptExpected === true && step.fillExpected === true) {
        both.push(`${b.name} step ${i}: ${step.op}`);
      }
    });
  }
  assert.deepEqual(both, []);

  // And the sets themselves are disjoint per pack, which is the property
  // the per-step rule buys: one applied path cannot be in both states,
  // because `verify` would have to report it as two things at once.
  for (const b of await bundled()) {
    for (const applied of everyPlan(b)) {
      const adapt = new Set<string>(applied.plan.adaptExpected);
      const overlap = applied.plan.fillExpected.filter((p) => adapt.has(p));
      assert.deepEqual([...overlap], [], applied.label);
    }
  }
});

/**
 * **The shape that makes the fourth path correct.**
 *
 * `writing`'s `strip-suffix` over `writing-guide/` is **two steps**, the
 * first excluding `tone-of-voice.template.md` and the second carrying
 * `fillExpected` alone. A single step would have been legal, shorter, and
 * would have marked **four** files fill-expected — three of which
 * (`README.md`, `ai-tells.md`, `bilingual-publishing.md`) are reference
 * content complete as shipped. `verify` would then report three
 * permanently `unfilled` paths, which is the exact false signal the state
 * exists to give truthfully, and `update` would be forbidden from ever
 * refreshing three files the pack owns outright.
 *
 * The counterfactual is computed rather than described: the single merged
 * step is built here and its write set taken through the real
 * `stepWriteSet`, so the three files the split keeps out are named by the
 * code path that would have let them in. **This is the kind of split an
 * implementer collapses back**, and the collapse looks like a tidy-up.
 */
test("writing's writing-guide strip-suffix is split in two, and the split is load-bearing", async () => {
  const writing = (await bundled()).find((b) => b.name === 'writing')!;
  const guideSteps = writing.recipe.steps.filter(
    (s) => s.op === 'strip-suffix' && s.from.startsWith('writing-guide/'),
  );
  assert.equal(guideSteps.length, 2, 'two steps, one declaration');

  const [reference, voice] = guideSteps as [
    Extract<RecipeStep, { op: 'strip-suffix' }>,
    Extract<RecipeStep, { op: 'strip-suffix' }>,
  ];
  assert.equal(reference.fillExpected, undefined, 'the reference sweep declares nothing');
  assert.deepEqual(
    [...(reference.exclude ?? [])],
    ['tone-of-voice.template.md'],
    'the first step must exclude the voice guide, or the split does nothing',
  );
  assert.equal(voice.fillExpected, true);
  assert.equal(voice.from, 'writing-guide/tone-of-voice.template.md', 'the voice guide alone');

  // What one merged step would have declared. Built and measured, not
  // asserted from prose — the three names below are the cost of the
  // collapse, and they are read out of the payload the pack ships.
  const merged: RecipeStep = {
    op: 'strip-suffix',
    from: 'writing-guide/',
    to: 'writing-guide/',
    suffix: '.template',
  };
  const wouldWrite = stepWriteSet({
    step: merged,
    index: 0,
    payload: writing.payload,
    writtenSoFar: [],
  });
  assert.deepEqual(
    [...wouldWrite.paths],
    [
      'writing-guide/README.md',
      'writing-guide/ai-tells.md',
      'writing-guide/bilingual-publishing.md',
      'writing-guide/tone-of-voice.md',
    ],
    'a single step marks four files; three of them are complete as shipped',
  );

  // And the split delivers the same four files — the correction costs a
  // step and changes no output, which is the whole argument for it.
  const applied = applyPack(writing, [], new Map(), true);
  assert.deepEqual(
    [...applied.files.keys()].filter((p) => p.startsWith('writing-guide/') && p.endsWith('.md')),
    [
      'writing-guide/README.md',
      'writing-guide/ai-tells.md',
      'writing-guide/bilingual-publishing.md',
      'writing-guide/tone-of-voice.md',
      'writing-guide/index.md',
    ],
    'four stripped files plus the one rendered index; the split loses nothing',
  );
});

/* ── T-1404 — the anchor counts ──────────────────────────────────────── */

/** The nineteen ids, per pack, in declared order. F5 US-38 and F1 US-32
 *  state the same list; it is written once here and asserted against the
 *  recipe, which is the only place it is a fact. */
const ANCHORS: Readonly<Record<string, readonly string[]>> = {
  coding: ['overview', 'layout', 'process', 'agents', 'conventions', 'targets'],
  writing: ['overview', 'voice', 'layout', 'workflow', 'coordination', 'standing-instructions'],
  planning: ['overview', 'loop', 'gate', 'practices', 'conventions', 'roles', 'targets'],
};

/** `<id>` matches `^[a-z][a-z0-9-]{0,31}$` (F1 US-32). */
const ANCHOR_ID = /^[a-z][a-z0-9-]{0,31}$/;

function generateSteps(recipe: Recipe): readonly GenerateStep[] {
  return declaredSteps(recipe).filter((s): s is GenerateStep => s.op === 'generate');
}

/**
 * **Exactly three `generate` steps in the product, one per pack, each
 * writing `CLAUDE.md`** (Q-61).
 *
 * `generate` is the only primitive that emits anchors — `rename` neither
 * substitutes nor asserts them — so "every pack has anchors" and "one
 * pack generates" could never both be true. F1 US-32 carried the second
 * claim through v2.6 and corrected it at v2.7; this is the assertion that
 * stops it coming back, and it is quantified over the whole product
 * rather than per pack so that a *fourth* generate step anywhere fails it
 * too.
 */
test('exactly three generate steps ship, one per pack, each writing CLAUDE.md', async () => {
  const rows: string[] = [];
  for (const b of await bundled()) {
    for (const step of generateSteps(b.recipe)) {
      rows.push(`${b.name}: ${step.template} -> ${step.to} (${step.anchors.length} anchors)`);
      // Q-56 rides on the same step for the same reason: `update` learns
      // from data which file the project was expected to have edited.
      assert.equal(step.adaptExpected, true, `${b.name}: the generate step must be adapt-expected`);
      assert.equal(step.fillExpected, undefined, `${b.name}: and must not also be fill-expected`);
    }
  }
  assert.deepEqual(rows, [
    'coding: CLAUDE.md.template -> CLAUDE.md (6 anchors)',
    'planning: CLAUDE.md.template -> CLAUDE.md (7 anchors)',
    'writing: CLAUDE.md.template -> CLAUDE.md (6 anchors)',
  ]);
});

/**
 * The ids themselves — **6 / 6 / 7, nineteen across three templates.**
 *
 * The total is asserted alongside the per-pack lists rather than instead
 * of them, and both are needed for the same reason `declaration.test.ts`
 * keeps its anatomy count beside its per-part test: nineteen would still
 * hold if two of `coding`'s ids swapped with two of `writing`'s, and the
 * ids are what v1.1's `update` reads from data.
 */
test('the declared anchor ids are the nineteen the format spec names', async () => {
  const declared: Record<string, readonly string[]> = {};
  for (const b of await bundled()) {
    const steps = generateSteps(b.recipe);
    assert.equal(steps.length, 1, `${b.name}: one generate step`);
    declared[b.name] = [...steps[0]!.anchors];
  }

  assert.deepEqual(declared, ANCHORS);
  assert.equal(
    Object.values(declared).reduce((n, ids) => n + ids.length, 0),
    19,
    'nineteen anchors across three templates',
  );
});

/**
 * Each id is well-formed and unique **within its pack**.
 *
 * Uniqueness is per pack rather than product-wide on purpose: `overview`
 * appears in all three, `conventions` and `targets` in two, and that is
 * correct — the ids name sections of one document, not entries in a
 * global namespace. Within a template a repeated id is fatal, because the
 * assertion `generate` performs is *appears exactly once*, and a template
 * declaring one twice would fail its own step.
 */
test('every anchor id is well-formed, and unique inside its own template', async () => {
  for (const b of await bundled()) {
    const ids = generateSteps(b.recipe)[0]!.anchors;
    for (const id of ids) assert.ok(ANCHOR_ID.test(id), `${b.name}: "${id}" is not a valid anchor id`);
    assert.equal(new Set(ids).size, ids.length, `${b.name}: a repeated id cannot appear exactly once`);
  }
});

/**
 * **Declared is not the same as built.** The recipe says six; the
 * template has to carry six.
 *
 * `generate` already asserts this at render time, so a mismatch would
 * surface as `E-ANCHOR-INVALID` from `applyPack` above. It is re-asserted
 * here over the *bytes* — literal opening lines and `<!-- harness:end -->`
 * counts — because the render assertion and the document a reader opens
 * are two different claims, and F5 US-38's promise is about the second:
 * v1.1's `update` finds markers in a file, not diagnostics in a bag.
 *
 * The counting is deliberately trivial and inherits the stated limit: a
 * marker inside a fenced code block **is** counted (Q-45, no parser). No
 * bundled template documents the anchor syntax with a declared id, so the
 * limitation has no subject here — which is a fact about the packs, not a
 * property of the check.
 */
test('each generated CLAUDE.md carries the anchors its step declares', async () => {
  for (const b of await bundled()) {
    const anchors = generateSteps(b.recipe)[0]!.anchors;
    const applied = applyPack(b, [], answerVariants(b.pack)[0]!, true);

    const claudeMd = applied.files.get('CLAUDE.md');
    assert.ok(claudeMd, `${b.name}: the apply must produce CLAUDE.md`);
    const lines = claudeMd.toString('utf8').split('\n').map((l) => l.trim());

    for (const id of anchors) {
      assert.equal(
        lines.filter((l) => l === openingLine(id)).length,
        1,
        `${b.name}: "${id}" must open exactly once in the rendered CLAUDE.md`,
      );
    }
    assert.equal(
      lines.filter((l) => l === CLOSING_LINE).length,
      anchors.length,
      `${b.name}: ${anchors.length} anchors declared, so ${anchors.length} closing markers`,
    );

    // Anchors are inert (Q-45), which means they survive substitution
    // untouched — a token-resolving pass that ate a marker would leave a
    // file `update` cannot navigate and nothing at v1.0 would say so.
    assert.equal(
      /\{\{harness:/.test(claudeMd.toString('utf8')),
      false,
      `${b.name}: CLAUDE.md still carries an unresolved token`,
    );
  }
});
