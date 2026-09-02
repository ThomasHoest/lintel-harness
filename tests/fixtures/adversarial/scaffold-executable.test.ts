/**
 * T-1220 — four fixtures Q-82 stopped being redundant.
 *
 * Moving `coding`'s two backend scaffolds to `addons/` (Q-82) left
 * `writing-workstream` as the only scaffold any v1.0 pack ships, and it
 * has no category and no executable step — so scaffold composition,
 * scaffold exclusivity, `executableRoots` and the 0755 disclosure now have
 * **no bundled pack exercising them at all**. `CLAUDE.md`'s own note on
 * the fold: *"no rule is weakened and none is removed... the adversarial
 * fixture suite becomes their sole coverage."* These four fixtures are
 * that coverage.
 *
 * ── (a) first, on purpose ──────────────────────────────────────────────
 *
 * T-1220 names (a) — two-scaffold composition — as "the one to write first
 * and the one most likely to be skipped": (b), (c) and (d) are error
 * paths, which get written because a red test demands it; (a) is ordinary
 * success-path step merging that no shipping pack performs any more, so it
 * can regress with nothing going red. It is first here too.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import {
  exitCodeFor,
  planSteps,
  readPackPayload,
  selectScaffolds,
  validatePack,
  type Answer,
  type PackJson,
  type Recipe,
} from '../../../dist/index.js';
import { assertFixture, basePack, baseRecipe, materialise, type Fixture } from '../run-fixtures.js';

/* ── (a) two-scaffold composition: base, then scaffolds in pack.json order ─ */

test('fixture: two scaffolds in different categories, both selected, merge base-then-scaffolds in pack.json order', () => {
  // `beta` is declared BEFORE `alpha` in pack.json on purpose: if the
  // merge read selection order (the order flags were typed) instead of
  // declaration order, requesting ['alpha', 'beta'] would put alpha's
  // step first and this assertion would catch it silently agreeing with
  // the wrong rule.
  const pack = basePack({
    scaffolds: [
      { id: 'beta', description: 'beta scaffold', category: 'cat-b' },
      { id: 'alpha', description: 'alpha scaffold', category: 'cat-a' },
    ],
  }) as unknown as PackJson;

  const recipe = baseRecipe(
    [{ op: 'copy', from: 'base/', to: 'base-out/' }],
    {
      scaffolds: {
        alpha: [{ op: 'copy', from: 'alpha/', to: 'alpha-out/' }],
        beta: [{ op: 'copy', from: 'beta/', to: 'beta-out/' }],
      },
    },
  ) as unknown as Recipe;

  // Requested in the OPPOSITE order to pack.json's declaration, so a
  // selection-order bug and a declaration-order-respecting implementation
  // produce different, distinguishable results.
  const { selected, bag: selectBag } = selectScaffolds(pack, ['alpha', 'beta']);
  assert.equal(selectBag.length, 0);
  assert.deepEqual(
    selected.map((s) => s.id),
    ['beta', 'alpha'],
    'selectScaffolds returns the selection in pack.json-declared order, not requested order',
  );

  const plan = planSteps({
    pack,
    recipe,
    selected,
    answers: new Map<string, Answer>(),
    payload: ['base/a.md', 'alpha/a.md', 'beta/a.md'],
  });
  assert.equal(plan.bag.errors.length, 0, plan.bag.items.map((d) => d.code).join(', '));

  assert.deepEqual(
    plan.steps.map((s) => s.scaffold),
    [null, 'beta', 'alpha'],
    'merged order must be base steps first, then each scaffold\'s in pack.json-declared order',
  );
});

/* ── (b) same-category collision — E-SCAFFOLD-EXCLUSIVE, exit 1 ──────── */

test('fixture: two scaffolds sharing a category, both selected — E-SCAFFOLD-EXCLUSIVE, exit 1', () => {
  const pack = basePack({
    scaffolds: [
      { id: 'small', description: 'small floor', category: 'floor' },
      { id: 'large', description: 'large floor', category: 'floor' },
    ],
  }) as unknown as PackJson;

  const { selected, bag } = selectScaffolds(pack, ['small', 'large']);

  assert.deepEqual(bag.items.map((d) => d.code), ['E-SCAFFOLD-EXCLUSIVE']);
  // The class is the point (T-1220): a user picked two of a choose-one
  // and can pick again — exit 1, a usage fault, never exit 2.
  assert.equal(exitCodeFor(bag.items), 1);
  // And selection itself still returns both — refusal is the caller's
  // job (`init`/`update`), not silent narrowing by this function.
  assert.deepEqual(selected.map((s) => s.id).sort(), ['large', 'small']);
});

/* ── (c) and (d): executable inside / outside a declared root, via a scaffold ─ */

async function withFixturePack<T>(f: Fixture, body: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), 'lintel-fx-scaffold-'));
  try {
    await materialise(f, dir);
    return await body(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test('fixture: a scaffold-declared executable inside its declared root applies cleanly and is disclosed', async () => {
  const f: Fixture = {
    name: 'executable inside a declared root, via a scaffold',
    because: 'Q-82 — the only bundled subject for this rule moved to addons/',
    packJson: basePack({
      executableRoots: ['scaffold-out/'],
      scaffolds: [{ id: 'exec-good', description: 'ships one executable inside its root' }],
    }),
    recipeJson: baseRecipe([], {
      scaffolds: {
        'exec-good': [
          { op: 'copy', from: 'bin/deploy.sh', to: 'scaffold-out/deploy.sh', executable: true },
        ],
      },
    }),
    // `executableFiles`, not `files`: `materialise` writes these at 0755
    // from creation. Writing via `files` (0644) and then `chmod`-ing
    // after the fact does not reproduce the source condition this fixture
    // is about, and a subsequent `writeFile` to an EXISTING path does not
    // even change the mode — Node applies a `mode` option only when the
    // call creates the inode.
    executableFiles: ['bin/deploy.sh'],
    expect: [],
    exit: 0,
  };

  await withFixturePack(f, async (dir) => {
    // The source really is 0755 — or the disclosure and mode assertions
    // below prove nothing about the bit (T-1210's sibling fixture makes
    // the same check for a base-recipe executable).
    if (process.platform !== 'win32') {
      const { stat } = await import('node:fs/promises');
      const st = await stat(join(dir, 'bin', 'deploy.sh'));
      assert.equal(st.mode & 0o777, 0o755);
    }

    // `validatePack` treats every declared scaffold as part of the one
    // combination it checks (`planCombinations`: `selected = pack.scaffolds
    // ?? []`, unconditionally) — scaffold selection is a user/init-time
    // question, not a validate-time one — so this exercises the rule
    // exactly as `validate` and `pack info` do, with no manual selection.
    const payload = await readPackPayload(pathToFileURL(`${dir}/`));
    const report = validatePack({
      loaded: {
        name: "fixture", // double-quoted: keeps this LoadedPack field out of coverage.test.ts's name/because scan, which is a Fixture-object convention this is not
        dir: pathToFileURL(`${dir}/`),
        pack: f.packJson as unknown as PackJson,
        recipePath: 'recipe.json',
        recipeText: `${JSON.stringify(f.recipeJson, null, 2)}\n`,
      },
      payload,
      cliVersion: '1.0.0',
    });

    // A fixture pack with every anatomy part declared `absent` (US-16's
    // own base, `BASE_ANATOMY`) prints notice/defect-class findings for
    // that alone — expected and not this fixture's concern. What matters
    // is that nothing about the SCAFFOLD-DECLARED EXECUTABLE raised an
    // error, and that the run exits clean.
    assert.deepEqual(
      report.diagnostics.filter((d) => d.severity === 'error').map((d) => d.code),
      [],
      report.diagnostics.map((d) => d.code).join(', '),
    );
    assert.equal(exitCodeFor(report.diagnostics), 0);

    // US-13's pre-write disclosure: the 0755 path, with the payload path
    // it comes from.
    assert.equal(report.disclosure.executables.length, 1);
    assert.equal(report.disclosure.executables[0]?.path, 'scaffold-out/deploy.sh');
    assert.equal(report.disclosure.executables[0]?.from, 'bin/deploy.sh');
  });
});

test('fixture: a scaffold-declared executable outside its declared root — E-EXEC-ROOT-UNDECLARED, exit 2', async () => {
  await assertFixture({
    name: 'executable outside every declared root, via a scaffold',
    because: 'Q-82 — the roots are the bound on where a pack may write 0755, exercised through a scaffold',
    // No `name` override: `run-fixtures.ts`'s harness validates every
    // fixture as if its directory were named "fixture" (T-1201's own
    // convention), so a pack declaring a different name fails at the
    // schema's name-matches-directory rule before this fixture's actual
    // attack is ever reached — the wrong-reason trap US-16 itself warns
    // about.
    packJson: basePack({
      executableRoots: ['scaffold-out/'],
      scaffolds: [{ id: 'exec-bad', description: 'ships one executable outside its root' }],
    }),
    recipeJson: baseRecipe([], {
      scaffolds: {
        'exec-bad': [{ op: 'copy', from: 'bin/deploy.sh', to: 'elsewhere/deploy.sh', executable: true }],
      },
    }),
    files: { 'bin/deploy.sh': '#!/bin/sh\necho hi\n' },
    expect: ['E-EXEC-ROOT-UNDECLARED'],
    exit: 2,
  });
});

test('fixture: a scaffold-declared executable landing in a forbidden segment — E-EXEC-DEST-FORBIDDEN, exit 2', async () => {
  await assertFixture({
    name: 'executable inside a declared root but under .claude — via a scaffold',
    because: 'Q-82, C-39b — a declared root does not exempt a forbidden segment',
    packJson: basePack({
      executableRoots: ['scaffold-out/'],
      scaffolds: [{ id: 'exec-forbidden', description: 'ships one executable under .claude' }],
    }),
    recipeJson: baseRecipe([], {
      scaffolds: {
        'exec-forbidden': [
          {
            op: 'copy',
            from: 'bin/deploy.sh',
            to: 'scaffold-out/.claude/hooks/deploy.sh',
            executable: true,
          },
        ],
      },
    }),
    files: { 'bin/deploy.sh': '#!/bin/sh\necho hi\n' },
    expect: ['E-EXEC-DEST-FORBIDDEN'],
    reject: ['E-MAP-RESERVED-DEST'],
    exit: 2,
  });
});
