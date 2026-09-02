/**
 * T-0409 — the write set's **properties**, not its cases.
 *
 * `stepWriteSet` is the quantifier every destination rule in the product
 * is stated over (C-19). Its per-op behaviour is asserted elsewhere; what
 * this file asserts is what makes it usable *as* a quantifier:
 *
 *   TOTAL     defined for all six arms, with no arm falling through.
 *   PURE      no project, no filesystem handle, same set twice.
 *   MATCHED   for the two `in` primitives, the set is what the globs
 *             match — never what the step turns out to change.
 *
 * If any of those fails, every rule quantified over the write set is
 * quietly weaker than it reads, which is the exact failure C-19 was
 * written about: the reserved-destination denylist and the deleted
 * settings policy both lapsed while remaining literally true.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  RECIPE_OPS,
  confinePath,
  stepWriteSet,
  unionWriteSets,
  type AppliedPath,
  type RecipeOp,
  type RecipeStep,
} from '../../dist/index.js';

const ap = (p: string): AppliedPath => confinePath(p, { index: 0 }).path!;
const PAYLOAD = ['a/one.md', 'a/two.md', 't.md', 'p.md'];

/** One valid step per arm, so totality can be asserted over the union
 *  rather than over a list somebody remembered to keep up to date. */
const ONE_PER_ARM: Readonly<Record<RecipeOp, RecipeStep>> = {
  copy: { op: 'copy', from: 'a/', to: 'b/' },
  rename: { op: 'rename', from: 'p.md', to: 'q.md' },
  'strip-suffix': { op: 'strip-suffix', from: 'a/', to: 'b/', suffix: '.md' },
  'rewrite-path': { op: 'rewrite-path', in: ['b/*.md'], find: 'x', replace: 'y' },
  substitute: { op: 'substitute', in: ['b/*.md'] },
  generate: { op: 'generate', template: 't.md', to: 'CLAUDE.md', anchors: ['a'] },
};

const WRITTEN = [ap('b/one.md'), ap('b/two.md')];

const run = (step: RecipeStep) =>
  stepWriteSet({ step, index: 0, payload: PAYLOAD, writtenSoFar: WRITTEN });

/* ── total ───────────────────────────────────────────────────────────── */

test('every arm of the union has a write set, and no arm falls through', () => {
  for (const op of RECIPE_OPS) {
    const r = run(ONE_PER_ARM[op]);
    assert.deepEqual(r.bag.items.map((d: { code: string }) => d.code), [], op);
    assert.ok(r.paths.length > 0, `${op} produced no write set`);
  }
});

// The table above must cover the union, or "total" is asserted over a
// subset somebody forgot to extend.
test('the fixture table covers exactly the six arms', () => {
  assert.deepEqual(Object.keys(ONE_PER_ARM).sort(), [...RECIPE_OPS].sort());
});

/* ── pure ────────────────────────────────────────────────────────────── */

/**
 * **There is no parameter through which disk could enter.** Not "we do not
 * read disk" — the signature cannot express it, which is the same
 * discipline the glob matcher follows (C-27). A write set that could stat
 * would make a pack's declared destinations depend on what happened to be
 * on the machine, and `validate` could not compute it in CI.
 */
test('the same inputs give the same set, twice, with no project present', () => {
  for (const op of RECIPE_OPS) {
    const a = run(ONE_PER_ARM[op]);
    const b = run(ONE_PER_ARM[op]);
    assert.deepEqual(a.paths, b.paths, op);
  }
});

test('the payload is an argument, so a different payload gives a different set', () => {
  const wide = stepWriteSet({
    step: ONE_PER_ARM.copy,
    index: 0,
    payload: [...PAYLOAD, 'a/three.md'],
    writtenSoFar: WRITTEN,
  });
  assert.deepEqual(wide.paths, ['b/one.md', 'b/two.md', 'b/three.md']);
  assert.deepEqual(run(ONE_PER_ARM.copy).paths, ['b/one.md', 'b/two.md']);
});

/* ── matched, not hit ────────────────────────────────────────────────── */

/**
 * *"A path whose content lacks `find` is still in the set."* The set is
 * computed at **plan time**, before any bytes exist to search — a set
 * defined by what a step turns out to change could only be known after
 * changing it, which would make it useless as a gate.
 */
test('an editing step’s set is what its globs match, independent of content', () => {
  for (const step of [ONE_PER_ARM['rewrite-path'], ONE_PER_ARM.substitute]) {
    assert.deepEqual(run(step).paths, ['b/one.md', 'b/two.md']);
  }
});

test('an in glob matching nothing is an authoring mistake, not an empty set', () => {
  const r = stepWriteSet({
    step: { op: 'substitute', in: ['nowhere/*.md'] },
    index: 4,
    payload: PAYLOAD,
    writtenSoFar: WRITTEN,
  });
  assert.deepEqual(r.bag.items.map((d: { code: string }) => d.code), ['E-RECIPE-STEP-INVALID']);
  assert.deepEqual(r.paths, []);
});

/* ── the gate, over the set rather than over `to` ────────────────────── */

/**
 * C-19 in one assertion. `rewrite-path` and `substitute` have **no `to`**,
 * so a destination rule keyed on `to` exempts them silently — which is
 * precisely how two rules lapsed while remaining true of the text they
 * were written about.
 *
 * ── What writing this test found ──────────────────────────────────────
 *
 * The obvious version — put `.claude/settings.json` in the written-set
 * and watch the re-check fire — **cannot be written**, because
 * `confinePath` refuses to mint an `AppliedPath` for a reserved
 * destination. The written-set is `AppliedPath[]`, so a reserved path
 * **cannot be in it**, and C-14's claim that *"a path that skipped the
 * gate is a compile error"* holds here at the type level rather than by
 * argument.
 *
 * That is what F1 says the re-check is for: *"the written-set argument
 * already implies no reserved path can be there; the re-check exists
 * because that implication is a chain of three statements in three
 * sections, and an invariant C-5 calls absolute deserves a check as well
 * as an argument."* So the second mechanism is **unreachable while the
 * chain holds**, and reaching it requires deliberately breaking the brand
 * — which the cast below does, in a test file, where the structural guard
 * on `as AppliedPath` does not apply.
 */
test('a reserved destination cannot even be minted as an applied path', () => {
  const r = confinePath('.claude/settings.json', { index: 0 });
  assert.equal(r.path, undefined, 'the written-set is AppliedPath[], so this can never be in one');
  assert.deepEqual(r.bag.items.map((d: { code: string }) => d.code), ['E-MAP-RESERVED-DEST']);
});

test('and if the brand were broken, the per-path re-check still catches it', () => {
  const r = stepWriteSet({
    // `.claude/*`, not `*`: the dialect's `*` is SINGLE-SEGMENT, so `*`
    // does not match a two-segment path at all. Worth stating, because the
    // first draft of this test used `*`, saw no diagnostic, and briefly
    // looked like a missing re-check rather than a glob doing its job.
    step: { op: 'substitute', in: ['.claude/*', '*'] },
    index: 0,
    payload: [],
    // Forced past the minter on purpose: this is the only way to reach
    // C-27's second mechanism, and defence in depth that no test can
    // reach is defence nobody can show works.
    writtenSoFar: ['.claude/settings.json' as AppliedPath, ap('ok.md')],
  });
  assert.ok(r.bag.items.some((d: { code: string }) => d.code === 'E-MAP-RESERVED-DEST'));
  assert.deepEqual(r.paths, ['ok.md'], 'and the reserved path does not survive into the set');
});

/* ── union ───────────────────────────────────────────────────────────── */

// The adapt-expected and fill-expected sets are exactly this over the
// steps carrying the declaration, so order and de-duplication are part of
// their contract too.
test('unionWriteSets preserves plan order and de-duplicates', () => {
  const a = [ap('x.md'), ap('y.md')];
  const b = [ap('y.md'), ap('z.md')];
  assert.deepEqual(unionWriteSets([a, b]), ['x.md', 'y.md', 'z.md']);
  assert.deepEqual(unionWriteSets([]), []);
});
