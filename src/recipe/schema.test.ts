import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { usageOf, validateRecipe } from './schema.js';
import { OPS, registryAgreesWithTypes } from './ops/index.js';
import {
  EDITING_OPS,
  MAX_RECIPE_STEPS,
  PLACING_OPS,
  RECIPE_OPS,
  SUPPORTED_RECIPE_FORMAT_VERSION,
} from './types.js';
import { parseStrictJson } from '../json/parse-strict.js';
import { exitClassFor } from '../diag/codes.js';
import { packDir } from '../paths.js';

const codes = (b: { items: readonly { code: string }[] }): string[] => b.items.map((d) => d.code);

const recipe = (steps: unknown[], extra: Record<string, unknown> = {}) =>
  validateRecipe({ formatVersion: 1, steps, ...extra } as never, 'demo');

const COPY = { op: 'copy', from: 'a/', to: 'b/' };

/* ── the closed set ──────────────────────────────────────────────────── */

test('the six are the six, and the registry agrees with the types', () => {
  assert.deepEqual([...RECIPE_OPS], [
    'copy', 'rename', 'strip-suffix', 'rewrite-path', 'substitute', 'generate',
  ]);
  assert.equal(Object.keys(OPS).length, 6);
  assert.ok(registryAgreesWithTypes(), 'placing/editing is declared twice and must not drift');
  assert.deepEqual([...PLACING_OPS, ...EDITING_OPS].sort(), [...RECIPE_OPS].sort());
});

test('an op outside the set is refused, and the message says the set is closed', () => {
  const { recipe: r, bag } = recipe([{ op: 'exec', from: 'a', to: 'b' }]);
  assert.deepEqual(codes(bag), ['E-RECIPE-PRIMITIVE-UNKNOWN']);
  assert.equal(exitClassFor('E-RECIPE-PRIMITIVE-UNKNOWN'), 2);
  assert.equal(r, undefined, 'and nothing narrows — the validator fails closed');
  const m = bag.items[0]!.message;
  assert.match(m, /The set is closed/);
  assert.match(m, /copy, rename, strip-suffix, rewrite-path, substitute, generate/);
});

/**
 * C-25. **A parser that trims is a parser that accepts a step a reviewer
 * read as invalid** — and the reviewer is the control, since `pack info`
 * renders the plan for a human to approve.
 */
test('op is matched literally: no trimming, no case folding, no normalization', () => {
  for (const op of ['copy ', ' copy', 'Copy', 'COPY', 'ｃｏｐｙ', 'copy\n']) {
    const { bag } = recipe([{ op, from: 'a/', to: 'b/' }]);
    assert.deepEqual(codes(bag), ['E-RECIPE-PRIMITIVE-UNKNOWN'], JSON.stringify(op));
  }
});

// US-31 requires merge-json to be THIS code "like any other unknown value"
// — so a second code is forbidden — and requires the message to say it was
// withdrawn. One code, one extra line.
test('merge-json is told it was withdrawn, not left to look like a typo', () => {
  const { bag } = recipe([{ op: 'merge-json', from: 'a', to: 'b' }]);
  assert.deepEqual(codes(bag), ['E-RECIPE-PRIMITIVE-UNKNOWN']);
  assert.match(bag.items[0]!.message, /merge-json does not ship at v1.0; it is deferred to v1.1/);

  const other = recipe([{ op: 'exec' }]).bag.items[0]!.message;
  assert.equal(other.includes('deferred to v1.1'), false, 'and only merge-json gets that line');
  assert.equal(other.split('\n').length, 4);
  assert.equal(bag.items[0]!.message.split('\n').length, 5);
});

/* ── the two formatVersion gates are two codes ───────────────────────── */

test('a newer recipe format is its own code, distinct from pack.json’s', () => {
  const { bag } = validateRecipe(
    { formatVersion: SUPPORTED_RECIPE_FORMAT_VERSION + 1, steps: [] } as never,
    'demo',
  );
  assert.deepEqual(codes(bag), ['E-RECIPE-FORMAT-NEWER']);
  // Two files, two version axes: a user told to upgrade needs to know
  // which of the two declarations was newer.
  assert.match(bag.items[0]!.message, /demo's recipe declares format version 2/);
});

test('equal or lower proceeds', () => {
  assert.ok(validateRecipe({ formatVersion: 1, steps: [] } as never, 'demo').recipe);
});

test('a missing or non-integer formatVersion is E-RECIPE-INVALID', () => {
  for (const fv of [undefined, '1', 1.5, null]) {
    const { bag } = validateRecipe({ formatVersion: fv, steps: [] } as never, 'demo');
    assert.deepEqual(codes(bag), ['E-RECIPE-INVALID'], String(fv));
  }
});

/* ── the step bound ──────────────────────────────────────────────────── */

/**
 * An **inspectability** control, not a DoS control. There is no remote
 * attacker and `E-PAYLOAD-TOO-LARGE` already bounds the bytes; what this
 * protects is the argument that made a script primitive refusable — that
 * `pack info` renders the complete list of what an apply will do.
 */
test('the bound counts total declared steps, before any when filtering', () => {
  const many = Array.from({ length: MAX_RECIPE_STEPS }, () => ({ ...COPY }));
  assert.ok(recipe(many).recipe, 'exactly at the bound passes');

  // Every one of these is skipped by `when`, and they still count: the
  // list being bounded is the list pack info PRINTS.
  const skipped = Array.from({ length: MAX_RECIPE_STEPS + 1 }, () => ({
    ...COPY,
    when: { mode: 'never' },
  }));
  const { bag } = recipe(skipped);
  assert.deepEqual(codes(bag), ['E-RECIPE-TOO-MANY-STEPS']);
  assert.match(bag.items[0]!.message, /declares 257 recipe steps/);
});

test('scaffold steps count toward the same bound', () => {
  const half = Array.from({ length: 200 }, () => ({ ...COPY }));
  const { bag } = recipe(half, { scaffolds: { extra: half } });
  assert.deepEqual(codes(bag), ['E-RECIPE-TOO-MANY-STEPS']);
  assert.match(bag.items[0]!.message, /declares 400 recipe steps/);
});

/* ── per-step narrowing ──────────────────────────────────────────────── */

test('a missing required field names the field', () => {
  const { bag } = recipe([{ op: 'strip-suffix', from: 'a/', to: 'b/' }]);
  assert.deepEqual(codes(bag), ['E-RECIPE-STEP-INVALID']);
  assert.match(bag.items[0]!.message, /it declares no "suffix"/);
});

// A field the primitive does not take is a step that has misunderstood the
// primitive, not one that merely said something extra — so it is exit 2
// rather than the unknown-key warning.
test('a field the primitive does not take is fatal, not a warning', () => {
  const { bag } = recipe([{ op: 'substitute', in: ['*.md'], to: 'x.md' }]);
  assert.deepEqual(codes(bag), ['E-RECIPE-STEP-INVALID']);
  assert.match(bag.items[0]!.message, /"to" is not a field of substitute/);
});

// F1 v4.7: this line was `{usage for that primitive}` — not an identifier,
// so it rendered literally. Every step diagnostic would have printed those
// five words where the usage belongs.
test('the usage line is real content, derived from the field table', () => {
  const { bag } = recipe([{ op: 'rename' }]);
  const m = bag.items[0]!.message;
  assert.equal(m.includes('usage for that primitive'), false);
  assert.ok(m.includes(usageOf('rename')));
  assert.match(m, /rename takes from, to/);
});

/* ── the boolean-typed fields ────────────────────────────────────────── */

/**
 * No coercion, no truthiness. For `fillExpected` a non-boolean does more
 * than mis-report a state: it silently disarms the prohibition that stops
 * `update` overwriting a filled `project-brief.md`.
 */
test('a string where a boolean belongs is E-UNKNOWN-VALUE, not a truthy true', () => {
  for (const field of ['adaptExpected', 'fillExpected', 'executable']) {
    const { recipe: r, bag } = recipe([{ ...COPY, [field]: 'true' }]);
    assert.deepEqual(codes(bag), ['E-UNKNOWN-VALUE'], field);
    assert.equal(exitClassFor('E-UNKNOWN-VALUE'), 2);
    assert.equal(r, undefined, field);
  }
  assert.ok(recipe([{ ...COPY, adaptExpected: true }]).recipe, 'a real boolean is fine');
});

// A file is either the skill's to adapt or the user's to fill. A step
// claiming both has not decided which.
test('adaptExpected and fillExpected are mutually exclusive on one step', () => {
  const { bag } = recipe([{ ...COPY, adaptExpected: true, fillExpected: true }]);
  assert.deepEqual(codes(bag), ['E-RECIPE-STEP-INVALID']);
  assert.match(bag.items[0]!.message, /declares both "adaptExpected" and "fillExpected"/);

  assert.ok(recipe([{ ...COPY, adaptExpected: true, fillExpected: false }]).recipe);
});

/* ── when ────────────────────────────────────────────────────────────── */

// Single equality only. The restriction is what keeps the rendered plan
// readable: pack info must be able to say "this step runs when X is Y", in
// those words, for every step.
test('a compound when is refused', () => {
  for (const when of [{ a: 'x', b: 'y' }, {}, { a: true }, { a: ['x'] }, 'a=x']) {
    const { bag } = recipe([{ ...COPY, when }]);
    assert.deepEqual(codes(bag), ['E-RECIPE-STEP-INVALID'], JSON.stringify(when));
  }
  assert.ok(recipe([{ ...COPY, when: { mode: 'high' } }]).recipe);
});

/* ── field grammar ───────────────────────────────────────────────────── */

test('suffix must match the declared grammar', () => {
  for (const suffix of ['template', '.TEMPLATE', '.', '.a_b', `.${'a'.repeat(17)}`]) {
    const { bag } = recipe([{ op: 'strip-suffix', from: 'a/', to: 'b/', suffix }]);
    assert.deepEqual(codes(bag), ['E-RECIPE-STEP-INVALID'], suffix);
  }
  assert.ok(recipe([{ op: 'strip-suffix', from: 'a/', to: 'b/', suffix: '.template' }]).recipe);
});

// C-9. All four separators: U+2028 and U+2029 are line terminators to a
// JavaScript reader and invisible to a human one.
test('a line break in find or replace is refused, including the invisible ones', () => {
  for (const ch of ['\n', '\r', ' ', ' ']) {
    const step = { op: 'rewrite-path', in: ['*.md'], find: `a${ch}b`, replace: 'c' };
    assert.deepEqual(codes(recipe([step]).bag), ['E-RECIPE-STEP-INVALID'], JSON.stringify(ch));
  }
});

test('an empty in, anchors or find is refused', () => {
  assert.deepEqual(codes(recipe([{ op: 'substitute', in: [] }]).bag), ['E-RECIPE-STEP-INVALID']);
  assert.deepEqual(
    codes(recipe([{ op: 'generate', template: 't', to: 'x', anchors: [] }]).bag),
    ['E-RECIPE-STEP-INVALID'],
  );
  assert.deepEqual(
    codes(recipe([{ op: 'rewrite-path', in: ['*'], find: '', replace: 'c' }]).bag),
    ['E-RECIPE-STEP-INVALID'],
  );
});

/* ── the real packs ─────────────────────────────────────────────────── */

test('every bundled recipe validates clean through the strict reader', async () => {
  for (const name of ['coding', 'writing', 'planning']) {
    const text = await readFile(fileURLToPath(new URL('recipe.json', packDir(name))), 'utf8');
    const parsed = parseStrictJson(text, `packs/${name}/recipe.json`, 'E-RECIPE-INVALID');
    assert.deepEqual(codes(parsed.bag), [], name);

    const { recipe: r, bag } = validateRecipe(parsed.value!, name);
    assert.deepEqual(codes(bag), [], name);
    assert.ok(r, name);
    assert.ok(r.steps.length > 0);
  }
});

// Q-82 left `writing` as the only pack with a scaffold, so this is the
// only bundled subject the scaffolds branch has at all.
test('writing is the only bundled recipe declaring scaffolds', async () => {
  const found: string[] = [];
  for (const name of ['coding', 'writing', 'planning']) {
    const text = await readFile(fileURLToPath(new URL('recipe.json', packDir(name))), 'utf8');
    const { recipe: r } = validateRecipe(
      parseStrictJson(text, name, 'E-RECIPE-INVALID').value!,
      name,
    );
    if (r?.scaffolds) found.push(name);
  }
  assert.deepEqual(found, ['writing']);
});
