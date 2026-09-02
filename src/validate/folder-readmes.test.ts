import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkFolderReadmes, directoryPrefixes, toolOwned } from './folder-readmes.js';

const run = (paths: string[], basename = 'README.md', combination = 'c'): readonly string[] =>
  checkFolderReadmes({ packName: 'p', basename, paths, combination }).items.map((d) => d.path ?? '');

/* ── "proper", the word the rule turns on ────────────────────────────── */

/**
 * **The `infrastructure/` defect, at the unit level.** `coding` shipped a
 * backend scaffold that created `infrastructure/backend-deploy/` and wrote
 * a README only into the leaf. Every reading of the rule that stopped at
 * the leaf agreed the pack was clean; US-16 quantifies over **proper**
 * prefixes, which is what makes the intermediate directory visible.
 */
test('a proper prefix includes every intermediate directory, not just the leaf', () => {
  assert.deepEqual(directoryPrefixes(['a/b/c.md']), ['a/', 'a/b/']);
});

/** A file at the root implies no directory: `x.md` has no proper prefix,
 *  and a loop to `length` rather than `length - 1` would demand a README
 *  inside a file. */
test('a root-level file implies no directory', () => {
  assert.deepEqual(directoryPrefixes(['x.md']), []);
});

/* ── the rule ────────────────────────────────────────────────────────── */

test('a directory with no folder README is one finding, naming the directory', () => {
  assert.deepEqual(run(['docs/guide.md']), ['docs/']);
});

test('the same combination writing the README clears the finding', () => {
  assert.deepEqual(run(['docs/guide.md', 'docs/README.md']), []);
});

/**
 * `writing` declares `index.md`. **Declared rather than guessed** is the
 * point: a checker accepting either basename could not report a missing
 * one, so `README.md` must NOT satisfy a pack that declared `index.md`.
 */
test('the declared basename is the only one that satisfies the rule', () => {
  assert.deepEqual(run(['docs/a.md', 'docs/README.md'], 'index.md'), ['docs/']);
  assert.deepEqual(run(['docs/a.md', 'docs/index.md'], 'index.md'), []);
});

/**
 * **Per combination, never over the merged step set** — US-16's own worked
 * example. A folder step in one branch and its README step in another both
 * appear merged, which hides the gap; given one combination's paths the
 * gap is visible, and given the other it is not.
 */
test('the gap is visible in the combination that creates the folder alone', () => {
  assert.deepEqual(run(['w/a.md']), ['w/']);
  assert.deepEqual(run(['w/a.md', 'w/README.md']), []);
});

/* ── tool-owned trees ────────────────────────────────────────────────── */

/** `.claude` at **any** segment — F1 asserts the runtime reads a `.claude`
 *  tree wherever it finds one, so anchoring the exclusion at the root
 *  would re-create C-33 in a rule written after C-33 was found. */
test('.claude is excluded at any segment and .harness at the first', () => {
  assert.equal(toolOwned('.claude/agents/'), true);
  assert.equal(toolOwned('docs/.claude/'), true);
  assert.equal(toolOwned('.harness/pack/'), true);
  assert.equal(toolOwned('docs/'), false);
  assert.deepEqual(run(['.claude/agents/a.md']), []);
  // `docs/` itself is not tool-owned and is still reported — the
  // exclusion covers the `.claude` subtree, not the directory holding it.
  assert.deepEqual(run(['docs/.claude/x.md', 'docs/README.md']), []);
});

/* ── the class, which is what `--strict` reads ───────────────────────── */

/**
 * **`defect`, not `notice`** — the remedy is a recipe step the author
 * adds, which is what the third message line says. The
 * over-approximation governs the *severity* (warning, not error) and not
 * the class, and getting that backwards would make `--strict` silent in
 * the one place F1 says it should have teeth.
 */
test('the finding is a defect-class warning, so --strict promotes it', () => {
  const [d] = checkFolderReadmes({
    packName: 'p',
    basename: 'README.md',
    paths: ['docs/a.md'],
    combination: 'c',
  }).items;
  assert.equal(d?.severity, 'warning');
  assert.equal(d?.class, 'defect');
});

/** `collisionKey`, like every other path comparison in the product: on
 *  macOS and Windows these are one file, and reporting a missing README
 *  beside the one that satisfies it is a finding nobody can act on. */
test('the README matches case-insensitively, as the filesystem would', () => {
  assert.deepEqual(run(['docs/a.md', 'docs/Readme.md']), []);
});
