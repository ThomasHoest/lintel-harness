import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import {
  MAX_EXECUTABLES,
  checkExecutableCap,
  checkExecutablePaths,
  checkExecutableRoots,
  forbiddenReason,
} from './executable.js';
import { confinePath, type AppliedPath } from '../security/confine.js';
import { packDir } from '../paths.js';
import type { PackJson } from '../pack/types.js';

const codes = (b: { items: readonly { code: string }[] }): string[] => b.items.map((d) => d.code);
const ap = (p: string): AppliedPath => confinePath(p, { index: 0 }).path!;

const ROOTS = ['scripts/'];

/* ── the forbidden destinations ──────────────────────────────────────── */

/**
 * **At any depth**, not just at the root. `docs/.claude/hook.sh` is
 * exactly as readable by an agent as `.claude/hook.sh` is, so a check
 * anchored at the first segment would miss the one an author is most
 * likely to reach for when the obvious path is refused.
 */
test('an executable is forbidden inside .claude at any depth', () => {
  for (const p of ['.claude/x.sh', 'docs/.claude/x.sh', 'a/b/.claude/c/x.sh']) {
    assert.notEqual(forbiddenReason(p), null, p);
  }
});

test('the same holds for .git, .hg and .svn, and for .harness as a root', () => {
  for (const p of ['.git/hooks/pre-commit', 'a/.hg/x.sh', 'a/.svn/x.sh', '.harness/x.sh']) {
    assert.notEqual(forbiddenReason(p), null, p);
  }
  // `.harness` only as a FIRST segment — it is the CLI's own tree, and a
  // pack writing an executable into it would be writing into the record of
  // what it wrote. Elsewhere the name is ordinary.
  assert.equal(forbiddenReason('docs/.harness/x.sh'), null);
});

test('an ordinary path is allowed', () => {
  assert.equal(forbiddenReason('scripts/deploy.sh'), null);
});

/* ── declared roots ──────────────────────────────────────────────────── */

// A root is a destination like any other, and one that skipped the gate
// would be a gate with a hole in it.
test('a declared root passes the same grammar and denylist as any destination', () => {
  assert.deepEqual(codes(checkExecutableRoots(['scripts/'])), []);
  assert.deepEqual(codes(checkExecutableRoots(['../escape/'])), ['E-MAP-PATH-GRAMMAR']);
  assert.deepEqual(
    codes(checkExecutableRoots(['.claude/'])),
    ['E-EXEC-DEST-FORBIDDEN'],
    'forbidden, and NOT also a grammar fault',
  );
});

/**
 * F1 v5.0. The rule refused everything it permitted.
 *
 * `executableRoots` declares prefixes *"each ending `/`, each subject to
 * the stage 1 grammar"* — and stage 1 refuses an **empty segment**, which
 * a prefix ending `/` has by construction. So every legal root was refused
 * by the rule that governs it, inside a **security** control: these roots
 * are the bound on where a pack may write `0755`.
 *
 * It read perfectly well because each half is correct alone. The fix is
 * that a root names a **directory** while stage 1 is an **applied-path**
 * grammar, and the separator is exactly what distinguishes them.
 */
test('a root ending "/" is legal — the separator is stripped before the grammar runs', () => {
  assert.deepEqual(codes(checkExecutableRoots(['scripts/'])), [], 'the shape the spec requires');
  assert.deepEqual(codes(checkExecutableRoots(['a/b/c/'])), []);
  // And the grammar still bites on everything else it should.
  assert.deepEqual(codes(checkExecutableRoots(['a//b/'])), ['E-MAP-PATH-GRAMMAR']);
  assert.deepEqual(codes(checkExecutableRoots(['/abs/'])), ['E-MAP-PATH-GRAMMAR']);
});

/* ── per applied path, not per `to` ──────────────────────────────────── */

/**
 * **This is the half that matters.** A `copy` with a directory `from` sets
 * one bit in the step and produces many applied paths, so a rule checked
 * against `to` would see one destination — the directory — and let the
 * recursion carry the bit anywhere underneath that the declared root never
 * named. C-19's quantifier, applied to the executable bit.
 */
test('a recursion cannot reach a forbidden destination its root did not name', () => {
  const paths = [ap('scripts/ok.sh'), ap('scripts/.claude/sneaky.sh')];
  const bag = checkExecutablePaths(paths, ROOTS, 3);
  assert.deepEqual(codes(bag), ['E-EXEC-DEST-FORBIDDEN']);
  assert.match(bag.items[0]!.message, /scripts\/\.claude\/sneaky\.sh/);
});

test('a path outside every declared root is refused, and the message lists them', () => {
  const bag = checkExecutablePaths([ap('tools/run.sh')], ROOTS, 3);
  assert.deepEqual(codes(bag), ['E-EXEC-ROOT-UNDECLARED']);
  assert.match(bag.items[0]!.message, /Declared: scripts\//);
});

test('a pack declaring no roots can set no bit at all', () => {
  const bag = checkExecutablePaths([ap('scripts/run.sh')], [], 0);
  assert.deepEqual(codes(bag), ['E-EXEC-ROOT-UNDECLARED']);
  assert.match(bag.items[0]!.message, /Declared: \(none\)/);
});

/* ── the cap ─────────────────────────────────────────────────────────── */

// Over the whole apply rather than per step: 32 executables is a fact
// about what lands in the project, and a per-step bound would be satisfied
// by splitting one step into two.
test('more than 32 executables in one apply is refused', () => {
  assert.deepEqual(codes(checkExecutableCap(MAX_EXECUTABLES)), []);
  assert.deepEqual(codes(checkExecutableCap(MAX_EXECUTABLES + 1)), ['E-EXEC-TOO-MANY']);
});

/* ── the real packs ─────────────────────────────────────────────────── */

/**
 * **T-0508's task text names a consumer that no longer exists.** It says
 * *"`coding` declares `executableRoots: ["infrastructure/backend-deploy/"]`
 * and each backend scaffold sets the bit on four scripts"* — true when it
 * was written, and false since **Q-82** moved both backend kits to
 * `addons/` as v1.1 add-ons.
 *
 * So this apparatus has **no bundled subject**, exactly like the
 * scaffold-exclusivity rules Q-82 emptied. Asserting the emptiness is the
 * honest form: the rules stay in full because the add-on mechanism
 * inherits them, and if a pack ever declares a root this test is where
 * that stops being a fixture-only concern.
 */
test('no v1.0 pack declares executableRoots or sets the bit', async () => {
  for (const name of ['coding', 'writing', 'planning']) {
    const pack = JSON.parse(
      await readFile(fileURLToPath(new URL('pack.json', packDir(name))), 'utf8'),
    ) as PackJson;
    assert.equal(pack.executableRoots, undefined, `${name} declares executableRoots`);

    const recipe = JSON.parse(
      await readFile(fileURLToPath(new URL('recipe.json', packDir(name))), 'utf8'),
    ) as { steps: { executable?: boolean }[]; scaffolds?: Record<string, { executable?: boolean }[]> };
    const all = [...recipe.steps, ...Object.values(recipe.scaffolds ?? {}).flat()];
    assert.deepEqual(
      all.filter((s) => s.executable === true),
      [],
      `${name} sets executable: true`,
    );
  }
});
