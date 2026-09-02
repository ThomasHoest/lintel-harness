import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { planSteps } from './plan-steps.js';
import { validateRecipe } from './schema.js';
import { parseStrictJson } from '../json/parse-strict.js';
import { loadPack } from '../pack/load-pack.js';
import { resolveAnswers } from '../pack/parameters.js';
import { selectScaffolds } from '../pack/scaffolds.js';
import { walk } from '../fs/walk.js';
import { packDir } from '../paths.js';
import type { Answer } from '../pack/parameters.js';
import type { PackJson, ScaffoldDecl } from '../pack/types.js';
import type { Recipe } from './types.js';

const codes = (b: { items: readonly { code: string }[] }): string[] => b.items.map((d) => d.code);

const plan = (
  steps: unknown[],
  opts: {
    payload?: string[];
    answers?: [string, Answer][];
    scaffolds?: Record<string, unknown[]>;
    selected?: string[];
    packScaffolds?: ScaffoldDecl[];
  } = {},
) => {
  const raw: Record<string, unknown> = { formatVersion: 1, steps };
  if (opts.scaffolds) raw['scaffolds'] = opts.scaffolds;
  const { recipe, bag } = validateRecipe(raw as never, 'demo');
  assert.deepEqual(codes(bag), [], 'the fixture recipe must itself be valid');
  const declared = opts.packScaffolds ?? [];
  return planSteps({
    pack: { name: 'demo', scaffolds: declared } as unknown as PackJson,
    recipe: recipe as Recipe,
    selected: declared.filter((s) => (opts.selected ?? []).includes(s.id)),
    answers: new Map(opts.answers ?? []),
    payload: opts.payload ?? [],
  });
};

/* ── write sets, per op ──────────────────────────────────────────────── */

test('a directory copy expands to every payload path under it', () => {
  const p = plan([{ op: 'copy', from: 'agents/', to: '.claude/agents/' }], {
    payload: ['agents/architect.md', 'agents/reviewer.md', 'other/x.md'],
  });
  assert.deepEqual(p.steps[0]!.writeSet, ['.claude/agents/architect.md', '.claude/agents/reviewer.md']);
});

test('exclude globs are relative to from, not to the pack root', () => {
  const p = plan([{ op: 'copy', from: 'a/', to: 'b/', exclude: ['skip.md'] }], {
    payload: ['a/keep.md', 'a/skip.md'],
  });
  assert.deepEqual(p.steps[0]!.writeSet, ['b/keep.md']);
});

test('strip-suffix drops the suffix from the basename only', () => {
  const p = plan([{ op: 'strip-suffix', from: 'c/', to: 'copy/', suffix: '.template' }], {
    payload: ['c/tone-of-voice.template.md', 'c/plain.md'],
  });
  assert.deepEqual(p.steps[0]!.writeSet, ['copy/tone-of-voice.md', 'copy/plain.md']);
});

test('rename and generate each write exactly their to', () => {
  const p = plan(
    [
      { op: 'rename', from: 'a.md', to: 'b.md' },
      { op: 'generate', template: 't.md', to: 'CLAUDE.md', anchors: ['x'] },
    ],
    { payload: ['a.md', 't.md'] },
  );
  assert.deepEqual(p.steps[0]!.writeSet, ['b.md']);
  assert.deepEqual(p.steps[1]!.writeSet, ['CLAUDE.md']);
});

/**
 * **Matched, not hit.** The set is computed at plan time, before any bytes
 * exist to search — a set defined by what a step turns out to change could
 * only be known after changing it, which would make it useless as a gate.
 */
test('an editing step’s write set is what its globs MATCH, not what it changes', () => {
  const p = plan(
    [
      { op: 'copy', from: 'a/', to: 'b/' },
      { op: 'rewrite-path', in: ['b/*.md'], find: 'zzz-not-present', replace: 'q' },
    ],
    { payload: ['a/one.md', 'a/two.md'] },
  );
  assert.deepEqual(p.steps[1]!.writeSet, ['b/one.md', 'b/two.md']);
});

// SEC (C-27): writtenSoFar is the SOLE resolution domain. A glob matching a
// payload path that no step placed resolves to nothing.
test('in resolves only against what earlier steps wrote', () => {
  const p = plan(
    [
      { op: 'copy', from: 'a/', to: 'b/' },
      { op: 'substitute', in: ['a/*.md'] },
    ],
    { payload: ['a/one.md'] },
  );
  assert.deepEqual(codes(p.bag), ['E-RECIPE-STEP-INVALID'], 'the payload path is not in the domain');
  assert.match(p.bag.items[0]!.message, /matches no path written by an earlier step/);
});

/* ── the confinement gate over the write set (C-19) ──────────────────── */

/**
 * The whole reason the write set is a named concept: a rule quantified
 * over `to` has two silent exemptions, and that is how the reserved
 * destination denylist lapsed while remaining literally true.
 */
test('every path in a write set passes the gate, including ops with no to', () => {
  const p = plan([{ op: 'copy', from: 'a/', to: '../escape/' }], { payload: ['a/x.md'] });
  assert.deepEqual(codes(p.bag), ['E-MAP-PATH-GRAMMAR']);
  assert.deepEqual(p.steps[0]!.writeSet, [], 'and the path does not survive into the plan');
});

test('a reserved destination is refused even reached through an in glob', () => {
  const p = plan(
    [
      { op: 'copy', from: 'a/', to: '.claude/' },
      { op: 'substitute', in: ['.claude/*.json'] },
    ],
    { payload: ['a/settings.json'] },
  );
  // Placed AND re-checked: C-27's second mechanism exists because the
  // first is an implicit chain, and a control that holds only because of a
  // chain nobody re-states is one that lapses when a link is added.
  assert.ok(codes(p.bag).filter((c) => c === 'E-MAP-RESERVED-DEST').length >= 1);
});

/* ── collisions ──────────────────────────────────────────────────────── */

test('two steps placing one path collide', () => {
  const p = plan(
    [
      { op: 'rename', from: 'a.md', to: 'x.md' },
      { op: 'rename', from: 'b.md', to: 'x.md' },
    ],
    { payload: ['a.md', 'b.md'] },
  );
  assert.deepEqual(codes(p.bag), ['E-MAP-COLLISION']);
  assert.match(p.bag.items[0]!.message, /step 0: rename a.md/);
  assert.match(p.bag.items[0]!.message, /step 1: rename b.md/);
});

/**
 * **The obvious wrong fix, named because it reads like a tightening.**
 * Widening E-MAP-COLLISION to "two steps have the path in their write
 * sets" breaks all three bundled packs: a substitute over a path an
 * earlier copy placed is the shape every one of them uses.
 */
test('a substitute over a path an earlier copy placed is NOT a collision', () => {
  const p = plan(
    [
      { op: 'copy', from: 'a/', to: 'b/' },
      { op: 'substitute', in: ['b/*.md'] },
    ],
    { payload: ['a/x.md'] },
  );
  assert.deepEqual(codes(p.bag), []);
  assert.deepEqual(p.steps[1]!.writeSet, ['b/x.md'], 'it is in the write set all the same');
});

test('paths differing only by case, or only by normalization, are two codes', () => {
  const cased = plan(
    [
      { op: 'rename', from: 'a.md', to: 'Readme.md' },
      { op: 'rename', from: 'b.md', to: 'README.md' },
    ],
    { payload: ['a.md', 'b.md'] },
  );
  assert.deepEqual(codes(cased.bag), ['E-MAP-CASE-COLLISION']);
  assert.match(cased.bag.items[0]!.message, /On macOS and Windows these are the same file/);
});

/* ── ordering ────────────────────────────────────────────────────────── */

test('a recipe that edits before it places is refused', () => {
  const p = plan([{ op: 'substitute', in: ['*.md'] }, { op: 'rename', from: 'a.md', to: 'b.md' }], {
    payload: ['a.md'],
  });
  assert.ok(codes(p.bag).includes('E-RECIPE-STEP-INVALID'));
  assert.ok(p.bag.items.some((d) => /edits applied files before any step has placed one/.test(d.message)));
});

/* ── when ────────────────────────────────────────────────────────────── */

test('a when step is skipped unless the recorded answer matches', () => {
  const steps = [
    { op: 'copy', from: 'hi/', to: 'p/', when: { mode: 'high' } },
    { op: 'copy', from: 'lo/', to: 'p/', when: { mode: 'low' } },
  ];
  const payload = ['hi/a.md', 'lo/a.md'];

  const high = plan(steps, { payload, answers: [['mode', 'high']] });
  assert.equal(high.steps.length, 1);
  assert.deepEqual(high.written, ['p/a.md']);

  // Both branches write p/a.md, and it is NOT a collision because only one
  // of them is ever in the plan. This is the planning pack's calibration
  // shape, and a collision check run before `when` filtering would refuse
  // a pack that is correct.
  const low = plan(steps, { payload, answers: [['mode', 'low']] });
  assert.deepEqual(codes(low.bag), []);
  assert.equal(low.steps.length, 1);

  assert.equal(plan(steps, { payload, answers: [['mode', 'other']] }).steps.length, 0);
});

/* ── scaffolds ───────────────────────────────────────────────────────── */

const SC = (id: string): ScaffoldDecl => ({ id, description: id }) as ScaffoldDecl;

test('scaffold steps merge after the base, in pack.json order', () => {
  const p = plan([{ op: 'rename', from: 'base.md', to: '0.md' }], {
    payload: ['base.md', 'a.md', 'b.md'],
    packScaffolds: [SC('alpha'), SC('beta')],
    scaffolds: {
      alpha: [{ op: 'rename', from: 'a.md', to: '1.md' }],
      beta: [{ op: 'rename', from: 'b.md', to: '2.md' }],
    },
    selected: ['beta', 'alpha'],
  });
  assert.deepEqual(p.written, ['0.md', '1.md', '2.md'], 'declared order, never the order typed');
  assert.deepEqual(p.steps.map((s) => s.scaffold), [null, 'alpha', 'beta']);
});

test('an unselected scaffold contributes nothing', () => {
  const p = plan([], {
    payload: ['a.md'],
    packScaffolds: [SC('alpha')],
    scaffolds: { alpha: [{ op: 'rename', from: 'a.md', to: '1.md' }] },
  });
  assert.deepEqual(p.written, []);
});

// Reserved for the pack author. E-SCAFFOLD-UNKNOWN is the USER-facing code
// and is deliberately not used here.
test('a pack.json / recipe.json scaffold mismatch is a pack defect, in both directions', () => {
  const missing = plan([], { packScaffolds: [SC('alpha')] });
  assert.deepEqual(codes(missing.bag), ['E-RECIPE-STEP-INVALID']);
  assert.match(missing.bag.items[0]!.message, /recipe.json has no steps for it/);

  const orphan = plan([], { scaffolds: { ghost: [] } });
  assert.deepEqual(codes(orphan.bag), ['E-RECIPE-STEP-INVALID']);
  assert.match(orphan.bag.items[0]!.message, /which pack.json does not declare/);
});

/* ── sources (C-38) ──────────────────────────────────────────────────── */

test('a missing source is reported at whichever field carries it', () => {
  const p = plan(
    [
      { op: 'rename', from: 'nope.md', to: 'x.md' },
      { op: 'generate', template: 'gone.md', to: 'y.md', anchors: ['a'] },
    ],
    { payload: ['other.md'] },
  );
  assert.deepEqual(codes(p.bag), ['E-RECIPE-SOURCE-MISSING', 'E-RECIPE-SOURCE-MISSING']);
  assert.match(p.bag.items[0]!.message, /reads "nope.md" from "from"/);
  // C-38: through v2.3 generate's only input had no named code for the
  // commonest authoring mistake on that primitive.
  assert.match(p.bag.items[1]!.message, /reads "gone.md" from "template"/);
});

/* ── the two declared sets ───────────────────────────────────────────── */

test('the declared sets are the union of their steps’ write sets', () => {
  const p = plan(
    [
      { op: 'copy', from: 'a/', to: 'b/', fillExpected: true },
      { op: 'generate', template: 't.md', to: 'CLAUDE.md', anchors: ['x'], adaptExpected: true },
      { op: 'rename', from: 'p.md', to: 'q.md' },
    ],
    { payload: ['a/one.md', 'a/two.md', 't.md', 'p.md'] },
  );
  assert.deepEqual(p.fillExpected, ['b/one.md', 'b/two.md']);
  assert.deepEqual(p.adaptExpected, ['CLAUDE.md']);
  assert.deepEqual(codes(p.bag), []);
});

// The same quantifier every destination rule uses — an editing op has no
// `to`, and a rule over `to` would exempt exactly the two primitives that
// change a file's bytes after it was placed.
test('an editing step can declare a set, and it lands on what it matched', () => {
  const p = plan(
    [
      { op: 'copy', from: 'a/', to: 'b/' },
      { op: 'substitute', in: ['b/*.md'], adaptExpected: true },
    ],
    { payload: ['a/one.md'] },
  );
  assert.deepEqual(p.adaptExpected, ['b/one.md']);
});

/**
 * A declaration covering no path is an authoring mistake. For
 * `fillExpected` the cost is more than a mis-report: the set is what
 * `update` is forbidden to overwrite, so an empty one is a prohibition
 * protecting nothing.
 */
test('declaring a set while writing nothing is refused', () => {
  for (const field of ['adaptExpected', 'fillExpected']) {
    const p = plan([{ op: 'copy', from: 'empty/', to: 'b/', [field]: true }], { payload: ['x.md'] });
    assert.ok(codes(p.bag).includes('E-RECIPE-STEP-INVALID'), field);
    assert.ok(p.bag.items.some((d) => d.message.includes(`declares "${field}" and writes nothing`)));
  }
});

/* ── the real packs ─────────────────────────────────────────────────── */

/**
 * The plan, end to end, over the packs that ship. This is the first point
 * at which the recipe, the payload, the parameters and the scaffolds are
 * all exercised together — and every one of them planning clean is F5's
 * conformance claim reduced to an assertion.
 */
test('every bundled pack plans clean, with no answers beyond its defaults', async () => {
  for (const name of ['coding', 'writing', 'planning']) {
    const { loaded } = await loadPack(name, '1.0.0');
    assert.ok(loaded, name);

    const parsed = parseStrictJson(loaded.recipeText, `${name}/recipe.json`, 'E-RECIPE-INVALID');
    const { recipe } = validateRecipe(parsed.value!, name);
    assert.ok(recipe, name);

    const { entries } = await walk(fileURLToPath(packDir(name)));
    const payload = entries.filter((e) => e.kind === 'file').map((e) => e.path);

    const { answers } = resolveAnswers(loaded.pack.parameters, new Map());
    const { selected } = selectScaffolds(loaded.pack, []);

    const p = planSteps({ pack: loaded.pack, recipe, selected, answers, payload });
    assert.deepEqual(codes(p.bag), [], `${name}: ${p.bag.items.map((d) => d.message).join('\n')}`);
    assert.ok(p.written.length > 0, name);
  }
});

// All three packs declare adaptExpected on their generate step (Q-56,
// Q-61), and all three ship a project-brief to be filled (Q-79).
test('every bundled pack declares both sets, and they do not overlap', async () => {
  for (const name of ['coding', 'writing', 'planning']) {
    const { loaded } = await loadPack(name, '1.0.0');
    const parsed = parseStrictJson(loaded!.recipeText, name, 'E-RECIPE-INVALID');
    const { recipe } = validateRecipe(parsed.value!, name);
    const { entries } = await walk(fileURLToPath(packDir(name)));
    const payload = entries.filter((e) => e.kind === 'file').map((e) => e.path);
    const { answers } = resolveAnswers(loaded!.pack.parameters, new Map());

    const p = planSteps({ pack: loaded!.pack, recipe: recipe!, selected: [], answers, payload });
    assert.ok(p.adaptExpected.length > 0, `${name} adapt`);
    assert.ok(p.fillExpected.length > 0, `${name} fill`);
    const overlap = p.adaptExpected.filter((x) => p.fillExpected.includes(x));
    assert.deepEqual(overlap, [], `${name}: a path is the skill's to adapt or the user's to fill`);
  }
});
