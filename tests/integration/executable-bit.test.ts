/**
 * T-0510 — the executable rules as **one gate**, not three functions.
 *
 * The unit tests check each rule alone. What matters at apply time is
 * their composition: a step declares the bit, a directory recursion
 * expands it to many paths, and every one of those has to clear the roots,
 * the forbidden destinations and the cap **together**. C-12, C-33, C-39b.
 *
 * ── The one that a `to`-keyed check would miss ────────────────────────
 *
 * A `copy` with a directory `from` sets **one** bit in the step and
 * produces **many** applied paths. A rule evaluated against `to` sees one
 * destination — the directory — and lets the recursion carry the bit
 * anywhere underneath it that the declared root never named. That is
 * C-19's quantifier applied to file permissions, and it is why the check
 * runs per applied path and not per step.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_EXECUTABLES,
  checkExecutableCap,
  checkExecutablePaths,
  checkExecutableRoots,
  confinePath,
  type AppliedPath,
} from '../../dist/index.js';

const ap = (p: string): AppliedPath => confinePath(p, { index: 0 }).path!;
const codes = (b: { items: readonly { code: string }[] }): string[] =>
  b.items.map((d: { code: string }) => d.code);

/** Everything a pack must clear before one `0755` file is written. */
function gate(roots: readonly string[], paths: readonly string[]) {
  const all: string[] = [
    ...codes(checkExecutableRoots(roots)),
    ...codes(checkExecutablePaths(paths.map(ap), roots, 7)),
    ...codes(checkExecutableCap(paths.length)),
  ];
  return all;
}

test('a well-formed declaration passes every rule at once', () => {
  assert.deepEqual(gate(['scripts/'], ['scripts/deploy.sh', 'scripts/setup.sh']), []);
});

/**
 * The composed failure the whole apparatus exists for: a legal root, a
 * legal step, and a recursion that reaches somewhere the root never named.
 * The step is not wrong; the *expansion* is.
 */
test('a recursion under a legal root cannot smuggle the bit into .claude', () => {
  const found = gate(['scripts/'], [
    'scripts/deploy.sh',
    'scripts/.claude/agents/hook.sh',
  ]);
  assert.deepEqual(found, ['E-EXEC-DEST-FORBIDDEN']);
});

test('a path outside every root fails even when the root itself is fine', () => {
  assert.deepEqual(gate(['scripts/'], ['tools/run.sh']), ['E-EXEC-ROOT-UNDECLARED']);
});

// Checked at declaration AND per applied path — so a forbidden root is
// caught before any expansion, and a forbidden expansion is caught even
// under a permitted root. Two chances, deliberately.
test('a forbidden root is refused at declaration, before any path is considered', () => {
  assert.ok(codes(checkExecutableRoots(['.claude/'])).includes('E-EXEC-DEST-FORBIDDEN'));
});

test('the cap is over the whole apply, not per step', () => {
  const many = Array.from({ length: MAX_EXECUTABLES + 1 }, (_, i) => `scripts/s${i}.sh`);
  assert.deepEqual(gate(['scripts/'], many), ['E-EXEC-TOO-MANY']);
  // Splitting one step into two must not buy headroom, which is why the
  // count is taken over the apply rather than accumulated per step.
  assert.deepEqual(codes(checkExecutableCap(MAX_EXECUTABLES)), []);
});

/**
 * **The apparatus has no bundled subject** (Q-82), and F1 v5.0 corrected
 * both the task text and the spec that said otherwise. Asserted in
 * `src/recipe/executable.test.ts` against the real packs; noted here so a
 * reader of these tests does not mistake fixture coverage for pack
 * coverage.
 */
test('a pack declaring no roots can set no bit at all', () => {
  assert.deepEqual(gate([], ['scripts/x.sh']), ['E-EXEC-ROOT-UNDECLARED']);
});
