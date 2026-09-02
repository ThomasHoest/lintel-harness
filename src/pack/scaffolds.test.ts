import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import {
  checkScaffoldCollisions,
  parametersFor,
  selectScaffolds,
  selectedIds,
} from './scaffolds.js';
import { exitClassFor } from '../diag/codes.js';
import { packDir } from '../paths.js';
import type { PackJson, ScaffoldDecl } from './types.js';

const codes = (b: { items: readonly { code: string }[] }): string[] => b.items.map((d) => d.code);

const sc = (id: string, category?: string): ScaffoldDecl =>
  ({ id, description: id, ...(category === undefined ? {} : { category }) }) as ScaffoldDecl;

const pack = (scaffolds: readonly ScaffoldDecl[]): PackJson =>
  ({ name: 'demo', scaffolds }) as unknown as PackJson;

/* ── selection ───────────────────────────────────────────────────────── */

test('with no flag, nothing is selected', () => {
  const { selected, bag } = selectScaffolds(pack([sc('a'), sc('b')]), []);
  assert.deepEqual(selected, []);
  assert.deepEqual(codes(bag), []);
});

test('an unknown id lists the available ones verbatim', () => {
  const { bag, selected } = selectScaffolds(pack([sc('backend-azure'), sc('backend-aws')]), ['nope']);
  assert.deepEqual(codes(bag), ['E-SCAFFOLD-UNKNOWN']);
  assert.match(bag.items[0]!.message, /Available: backend-azure, backend-aws/);
  assert.equal(exitClassFor('E-SCAFFOLD-UNKNOWN'), 1, "the user's, not the pack's");
  assert.deepEqual(selected, []);
});

test('a pack declaring no scaffolds says so rather than showing an empty list', () => {
  const { bag } = selectScaffolds(pack([]), ['x']);
  assert.match(bag.items[0]!.message, /Available: \(none\)/);
});

/* Order-independence is a CORRECTNESS property, not a presentational one:
   scaffold steps write files, so two users typing the flags in opposite
   orders must get byte-identical projects. */
test('selection is in pack.json order, never the order typed', () => {
  const p = pack([sc('one'), sc('two'), sc('three')]);
  assert.deepEqual(selectedIds(selectScaffolds(p, ['three', 'one']).selected), ['one', 'three']);
  assert.deepEqual(selectedIds(selectScaffolds(p, ['one', 'three']).selected), ['one', 'three']);
});

test('a repeated id selects once and is not a fault', () => {
  const { selected, bag } = selectScaffolds(pack([sc('a')]), ['a', 'a']);
  assert.deepEqual(selectedIds(selected), ['a']);
  assert.deepEqual(codes(bag), []);
});

/* ── exclusivity ─────────────────────────────────────────────────────── */

// Q-82: fixture-covered, deliberately. The only same-category pair v1.0
// ever had was the two backend kits, and both are now add-ons — so no
// bundled pack can reach this code and a test claiming otherwise would be
// asserting against a subject that does not exist.
test('two scaffolds of one category are alternatives, not additions', () => {
  const p = pack([sc('backend-azure', 'backend'), sc('backend-aws', 'backend')]);
  const { bag } = selectScaffolds(p, ['backend-aws', 'backend-azure']);
  assert.deepEqual(codes(bag), ['E-SCAFFOLD-EXCLUSIVE']);
  assert.equal(exitClassFor('E-SCAFFOLD-EXCLUSIVE'), 1);
  const m = bag.items[0]!.message;
  assert.match(m, /"backend-azure" and "backend-aws" are alternatives/, 'named in declared order');
  assert.match(m, /Pick one/);
  assert.match(m, /Available backend scaffolds: backend-azure, backend-aws/);
});

test('the pair named is stable however the flags were typed', () => {
  const p = pack([sc('a', 'k'), sc('b', 'k')]);
  const one = selectScaffolds(p, ['a', 'b']).bag.items[0]!.message;
  const other = selectScaffolds(p, ['b', 'a']).bag.items[0]!.message;
  assert.equal(one, other);
});

test('a scaffold with no category composes with everything', () => {
  const p = pack([sc('plain'), sc('other'), sc('third')]);
  assert.deepEqual(codes(selectScaffolds(p, ['plain', 'other', 'third']).bag), []);
});

test('different categories compose', () => {
  const p = pack([sc('a', 'backend'), sc('b', 'workstream')]);
  assert.deepEqual(codes(selectScaffolds(p, ['a', 'b']).bag), []);
});

/* ── the collision matrix ────────────────────────────────────────────── */

test('two selectable scaffolds writing one path is an authoring defect', () => {
  const p = pack([sc('a', 'backend'), sc('b', 'workstream')]);
  const bag = checkScaffoldCollisions(p, new Map([
    ['a', ['infra/deploy.md', 'infra/a.md']],
    ['b', ['infra/deploy.md']],
  ]));
  assert.deepEqual(codes(bag), ['E-SCAFFOLD-COLLISION']);
  assert.equal(exitClassFor('E-SCAFFOLD-COLLISION'), 2, "the author's — no user did anything wrong");
  assert.match(bag.items[0]!.message, /both write "infra\/deploy.md"/);
});

// Two alternatives can never both be applied, so a shared path between
// them is not a collision — it is what alternatives do.
test('a same-category pair sharing a path is not a collision', () => {
  const p = pack([sc('a', 'backend'), sc('b', 'backend')]);
  const bag = checkScaffoldCollisions(p, new Map([
    ['a', ['infra/deploy.md']],
    ['b', ['infra/deploy.md']],
  ]));
  assert.deepEqual(codes(bag), []);
});

test('two uncategorised scaffolds sharing a path do collide', () => {
  const bag = checkScaffoldCollisions(pack([sc('a'), sc('b')]), new Map([
    ['a', ['x.md']],
    ['b', ['x.md']],
  ]));
  assert.deepEqual(codes(bag), ['E-SCAFFOLD-COLLISION']);
});

test('the matrix is pairwise across every permitted pair', () => {
  const p = pack([sc('a', 'x'), sc('b', 'y'), sc('c', 'z')]);
  const bag = checkScaffoldCollisions(p, new Map([
    ['a', ['shared.md']],
    ['b', ['shared.md']],
    ['c', ['shared.md']],
  ]));
  assert.deepEqual(codes(bag), Array(3).fill('E-SCAFFOLD-COLLISION'), 'a·b, a·c, b·c');
});

/* ── parameters ──────────────────────────────────────────────────────── */

test('a scaffold’s parameters join only when it is selected', () => {
  const base = { id: 'projectName', prompt: 'Name', type: 'string' as const, pattern: '^.{1,8}$' };
  const own = { id: 'region', prompt: 'Region', type: 'string' as const, pattern: '^.{1,8}$' };
  const p = {
    name: 'demo',
    parameters: [base],
    scaffolds: [{ id: 'a', description: 'a', parameters: [own] }],
  } as unknown as PackJson;

  assert.deepEqual(parametersFor(p, []).map((x) => x.id), ['projectName']);
  assert.deepEqual(
    parametersFor(p, selectScaffolds(p, ['a']).selected).map((x) => x.id),
    ['projectName', 'region'],
  );
});

/* ── the real packs ─────────────────────────────────────────────────── */

/**
 * Q-82 left **one scaffold in the whole product**, and it is alone in its
 * category. This asserts that rather than assuming it — the branch
 * coverage above is fixture-only *because* of this fact, and if a pack
 * ever grows a second scaffold this test is where that becomes visible.
 */
test('the product ships exactly one scaffold, alone in its category', async () => {
  const found: { pack: string; id: string; category?: string }[] = [];
  for (const name of ['coding', 'writing', 'planning']) {
    const p = JSON.parse(
      await readFile(fileURLToPath(new URL('pack.json', packDir(name))), 'utf8'),
    ) as PackJson;
    for (const s of p.scaffolds ?? []) found.push({ pack: name, id: s.id, ...(s.category ? { category: s.category } : {}) });

    // And selecting everything a pack declares must never be exclusive —
    // a pack whose own full set cannot be chosen would be undeployable.
    const all = (p.scaffolds ?? []).map((s) => s.id);
    if (all.length > 1) assert.deepEqual(codes(selectScaffolds(p, all).bag), [], name);
  }
  assert.deepEqual(found, [{ pack: 'writing', id: 'writing-workstream', category: 'workstream' }]);
});
