/**
 * E-17 — scaffolds: one at v1.0, and what left with the other two.
 * T-1702, T-1703.
 *
 * ── Read the epic's preamble before reading this file ─────────────────
 *
 * **Q-82 emptied most of E-17, and the emptying is the point.** `coding`'s
 * `backend-azure` and `backend-aws` became add-ons in `addons/`, which
 * nothing applies. Three consequences shape every assertion below:
 *
 *   1. **`writing-workstream` is the only scaffold in the product**, and
 *      it is alone in its category. So *no v1.0 apply composes two
 *      scaffolds*, and the same-category exclusivity rule (US-37,
 *      `E-SCAFFOLD-EXCLUSIVE`) has **no bundled subject at all**. T-1701
 *      is retired for that reason and its assertion lives on as F1's
 *      **T-1220(b)**, against a fixture pack. Nothing here reconstructs
 *      it: a test that restored a scaffold to a pack in order to have
 *      something to assert would be the tail wagging the dog.
 *
 *   2. **No bundled pack ships an executable.** All four `0755` scripts
 *      were in the Azure branch. T-1703 is therefore written as a
 *      **negative**: every applied path of every pack, in every scaffold
 *      selection, is `0644`. The positive cases — an executable inside a
 *      declared root, and one outside it raising
 *      `E-EXEC-DEST-FORBIDDEN` — are F1's **T-1220(c)** and **(d)**.
 *
 *   3. **An empty disclosure section is the expected output**, not a
 *      rendering bug. That is asserted here explicitly, because the next
 *      reader to meet `Files this apply would make executable (0755):`
 *      followed by `(none)` for all three packs will reasonably wonder
 *      whether the section is broken, and a test saying *no, that is
 *      correct* is cheaper than the fix that would break it.
 *
 * ── Saying "no bundled subject" beats pretending coverage ─────────────
 *
 * Where a rule has no v1.0 instance this file says so and names the
 * fixture task that carries it, rather than asserting some weaker
 * property that happens to pass. A green test over an empty set is the
 * single most expensive kind of false comfort in a suite whose whole job
 * is to catch pack drift.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  CLI,
  allBundled,
  appliedPaths,
  createdDirectories,
  filesOnDisk,
  loadBundled,
  modeOnDisk,
  posixModes,
  readApplied,
  withApplied,
  type AppliedProject,
  type BundledPack,
} from './apply-harness.js';

import { validatePackByName } from '../../dist/validate/validate-pack.js';
import { toolOwned } from '../../dist/validate/folder-readmes.js';
import { renderPackInfo } from '../../dist/cli/commands/pack-info.js';
import { DISCLOSURE_TEXT } from '../../dist/security/consent.js';
import { DEFAULT_FOLDER_README } from '../../dist/validate/folder-readmes.js';
import type { RecipeStep } from '../../dist/recipe/types.js';

const PACKS = ['coding', 'planning', 'writing'] as const;

/** Every **declared** step — base plus every scaffold, selected or not,
 *  `when`-kept or not. A rule about what a pack *declares* has to be read
 *  off the recipe: a step filtered out of one plan is invisible to it. */
function declaredSteps(bundled: BundledPack): readonly RecipeStep[] {
  return [...bundled.recipe.steps, ...Object.values(bundled.recipe.scaffolds ?? {}).flat()];
}

/* ── T-1702 — the half of US-21 that survives ────────────────────────── */

/**
 * **A bare `init <pack>` produces a whole project, for all three packs.**
 *
 * This is US-21's first criterion and the only one Q-82 left with a
 * bundled subject: *a pack applied with no scaffold produces no optional
 * tree, and what it does produce is complete.* The counts are pinned
 * because they are the numbers F5 §7b states — **`coding` 23** and
 * **`planning` 32** — and a pack that silently grew or lost an applied
 * path would otherwise pass every property below while producing a
 * different project.
 *
 * `writing`'s **16** is read off the recipe rather than quoted: §7b gives
 * `writing` no phase-2 file count at all, which is a gap in the document
 * rather than in the pack, and inventing a number to match would hide it.
 */
test('each pack applies with no scaffold at all, and every planned file lands', async () => {
  const counts: Record<string, number> = {};
  for (const name of PACKS) {
    await withApplied([{ name }], async ([project]) => {
      const p = project as AppliedProject;
      counts[name] = p.plan.files.filter((f) => f.phase === 2).length;

      // Bytes, not existence: a file present with different content is
      // the failure mode a `find` would miss.
      for (const f of p.plan.files) {
        const onDisk = readFileSync(join(p.dir, ...String(f.path).split('/')));
        assert.equal(Buffer.compare(onDisk, f.bytes), 0, `${p.label}: ${String(f.path)}`);
      }
      // And nothing arrived that the plan did not put there.
      assert.deepEqual(filesOnDisk(p.dir, true).length, p.plan.files.length + 1, `${p.label}: manifest plus the plan, and nothing else`);
    });
  }

  assert.deepEqual(counts, { coding: 23, planning: 32, writing: 16 });
});

/**
 * **A no-scaffold apply leaves nothing for the user to finish by hand**
 * — except the paths the pack declared they must.
 *
 * Three properties, and each is one of the manual-apply steps the
 * generator exists to absorb (`CLAUDE.md` §*What the manual apply
 * actually required*):
 *
 *   - **no `.template` survives into the project.** Step 4 of the log was
 *     a filename transform performed by hand; a `.template.md` in the
 *     applied tree means the transform did not happen.
 *   - **no `{{harness:` token survives.** An unresolved token is a
 *     substitution that silently did not fire, and the produced document
 *     reads as if the pack had forgotten to fill it in.
 *   - **every `fillExpected` path exists and has content.** The state
 *     means *shipped incomplete, on purpose*; a missing one would make
 *     `verify` report `missing` for a file the pack intended to place.
 *
 * The first two are quantified over **every applied file's bytes**, not
 * over a sample: the token check in `recipe-shape.test.ts` covers
 * `CLAUDE.md` only, because that is the file its task is about.
 */
test('a no-scaffold apply leaves no template name, no unresolved token, and every fill-expected file in place', async () => {
  for (const name of PACKS) {
    await withApplied([{ name }], async ([project]) => {
      const p = project as AppliedProject;

      for (const path of appliedPaths(p)) {
        assert.equal(
          /\.template(\.|$)/.test(path),
          false,
          `${p.label}: ${path} still carries a .template suffix`,
        );
        const text = readApplied(p, path).toString('utf8');
        assert.equal(
          text.includes('{{harness:'),
          false,
          `${p.label}: ${path} carries an unresolved harness token`,
        );
      }

      for (const path of p.steps.fillExpected) {
        const bytes = readApplied(p, String(path));
        assert.notEqual(bytes.length, 0, `${p.label}: ${String(path)} is fill-expected but empty`);
      }
    });
  }
});

/**
 * **Q-50, checked against the produced tree rather than against a plan.**
 *
 * `validate` step 12 already runs this rule over the *planned* write set,
 * per parameter combination — and passing it is part of T-1901's gate. It
 * is re-asserted here over **what is on disk**, because the two are
 * different claims and only the second is the one a newcomer meets: a
 * folder that exists and is empty of explanation is the `.gitkeep`-shaped
 * outcome Q-50 exists to prevent, and no amount of plan-level correctness
 * shows it did not happen.
 *
 * `.claude/` at any segment and `.harness/` at the first are tool-owned
 * and outside the rule — matched through the CLI's own `toolOwned`, so a
 * change to that boundary cannot leave this test asserting the old one.
 */
test('every folder a no-scaffold apply creates carries the pack’s declared folder README', async () => {
  for (const name of PACKS) {
    await withApplied([{ name }], async ([project]) => {
      const p = project as AppliedProject;
      const basename = p.bundled.pack.folderReadme ?? DEFAULT_FOLDER_README;
      const onDisk = new Set(filesOnDisk(p.dir));

      const missing = createdDirectories([...onDisk]).filter(
        (dir) => !toolOwned(`${dir}/`) && !onDisk.has(`${dir}/${basename}`),
      );
      assert.deepEqual(missing, [], `${p.label}: folders created with no ${basename}`);
    });
  }
});

/**
 * **The one scaffold in the product adds exactly the corpus and
 * workstream trees, and nothing else.**
 *
 * Two halves, and the second is the one worth having. Asserting that the
 * scaffold *adds* twelve `index.md` files is the easy direction; asserting
 * that it **changes nothing else** is what makes `--scaffold` opt-in
 * rather than a different pack. Every path the no-scaffold apply produced
 * is compared **byte for byte** against the scaffolded one, so a scaffold
 * step that reached back into base content — a `substitute` widening its
 * `in` globs, say — fails here and nowhere else in the suite.
 *
 * The twelve pre-authored indexes are the shape F5 corrected at v3.0: the
 * scaffold ships them as ordinary payload rather than renaming one
 * template twelve times, which would have produced twelve identical
 * stubs. That correction is asserted from the recipe side by
 * `recipe-shape.test.ts`; this is the same fact from the applied side.
 */
test('writing --scaffold writing-workstream adds exactly the corpus and workstream trees', async () => {
  await withApplied(
    [
      { name: 'writing' },
      { name: 'writing', scaffolds: ['writing-workstream'] },
    ],
    async ([bare, scaffolded]) => {
      const a = bare as AppliedProject;
      const b = scaffolded as AppliedProject;

      const before = appliedPaths(a);
      const after = appliedPaths(b);
      const added = after.filter((p) => !before.includes(p));
      const removed = before.filter((p) => !after.includes(p));

      assert.deepEqual(removed, [], 'a scaffold may only add');
      assert.deepEqual(added, [
        'analyses/index.md',
        'notes/index.md',
        'sources/_scouting/index.md',
        'sources/inbox/index.md',
        'sources/index.md',
        'tasks/index.md',
        'workstreams/example-workstream/drafts/index.md',
        'workstreams/example-workstream/index.md',
        'workstreams/example-workstream/outlines/index.md',
        'workstreams/example-workstream/published/index.md',
        'workstreams/example-workstream/reviews/index.md',
        'workstreams/index.md',
      ]);
      assert.equal(added.length, 12, 'twelve pre-authored index.md files, one per created folder');

      // Every added path is an index.md under one of the five roots the
      // scaffold's five `copy` steps declare — so the scaffold cannot
      // reach outside its own tree even by one file.
      const roots = ['sources/', 'analyses/', 'notes/', 'tasks/', 'workstreams/'];
      for (const path of added) {
        assert.ok(roots.some((r) => path.startsWith(r)), `${path} is outside the scaffold's roots`);
        assert.ok(path.endsWith('/index.md'), `${path} is not a folder index`);
      }

      // And the base content is untouched, byte for byte.
      for (const path of before) {
        assert.equal(
          Buffer.compare(readApplied(a, path), readApplied(b, path)),
          0,
          `${path} differs between a scaffolded and an unscaffolded apply`,
        );
      }
    },
  );
});

/**
 * **The backend half of US-21 has no v1.0 subject, and this test says so
 * rather than asserting around it.**
 *
 * `lintel harness init coding` producing no `infrastructure/` directory
 * is still a true criterion — but it is true because `coding` declares no
 * scaffolds *at all* now, not because a scaffold went unselected. Stating
 * the stronger fact is honest; asserting the weaker one would read like
 * coverage of the branch that no longer exists.
 */
test('coding declares no scaffolds, so its no-scaffold apply is its only apply', async () => {
  const coding = await loadBundled('coding');
  assert.deepEqual(coding.pack.scaffolds ?? [], [], 'Q-82 moved both backends to addons/');
  assert.deepEqual(Object.keys(coding.recipe.scaffolds ?? {}), []);

  await withApplied([{ name: 'coding' }], async ([project]) => {
    const p = project as AppliedProject;
    assert.deepEqual(
      appliedPaths(p).filter((path) => path.startsWith('infrastructure/')),
      [],
      'the backend tree left with the scaffolds',
    );
  });
});

/* ── T-1703 — the executable rule, as a negative ─────────────────────── */

/**
 * **No v1.0 pack declares an executable root, and no step in the product
 * declares `executable: true`.**
 *
 * Read off the declarations rather than off a plan, for the reason every
 * declared-set test in this directory gives: a step a `when` filtered out
 * or a scaffold nobody selected is invisible to a plan and is still part
 * of what the pack declares.
 *
 * `executableRoots` is checked over the raw `pack.json` object, because
 * the claim is that the key is **absent** — a defaulted read cannot tell
 * an absent optional key from an empty one, and the difference matters:
 * an empty declared root would mean `E-EXEC-DEST-FORBIDDEN` refuses every
 * executable, which is a different pack from one that declares nothing.
 */
test('no bundled pack declares an executable root, and no step declares an executable', async () => {
  const declaredRoots: string[] = [];
  const executableSteps: string[] = [];

  for (const bundled of await allBundled()) {
    const raw = JSON.parse(
      readFileSync(join(bundled.dir, 'pack.json'), 'utf8'),
    ) as Readonly<Record<string, unknown>>;
    if ('executableRoots' in raw) declaredRoots.push(bundled.name);

    declaredSteps(bundled).forEach((step, i) => {
      if ((step as { executable?: boolean }).executable === true) {
        executableSteps.push(`${bundled.name} step ${String(i)}: ${step.op}`);
      }
    });
  }

  assert.deepEqual(declaredRoots, [], 'Q-82: `infrastructure/backend-deploy/` left with the backends');
  assert.deepEqual(executableSteps, []);
});

/**
 * **Every applied path of every bundled pack, in every scaffold
 * selection, is `0644`.**
 *
 * Quantified over the plan *and* over disk, and the two are not the same
 * assertion. `PlannedFile.executable` is what `execute.ts` reads to choose
 * `0o755` or `0o644`; the mode on disk is what a user's shell sees. A
 * writer that ignored the flag would pass the first and fail the second.
 *
 * **The disk half runs on POSIX only.** Windows reports synthesised mode
 * bits, so asserting `0644` there would be asserting a fiction — the same
 * reason T-1904 says "modulo the executable bit". The plan half runs
 * everywhere and is the platform-independent form of the claim.
 *
 * Phase 1 is included deliberately: F1 US-30 flattens every payload file
 * to `0644` and preserves no source mode, so `.harness/pack/` is part of
 * "every applied path" for this rule even though it is not part of the
 * applied *tree* for any other.
 */
test('every path every bundled pack writes lands 0644, in every scaffold selection', async () => {
  const selections: readonly { name: string; scaffolds?: readonly string[] }[] = [
    { name: 'coding' },
    { name: 'planning' },
    { name: 'writing' },
    { name: 'writing', scaffolds: ['writing-workstream'] },
  ];

  for (const spec of selections) {
    await withApplied([spec], async ([project]) => {
      const p = project as AppliedProject;
      const executable = p.plan.files.filter((f) => f.executable).map((f) => String(f.path));
      assert.deepEqual(executable, [], `${p.label}: a v1.0 pack writes no executable`);

      if (!posixModes) return;
      for (const path of filesOnDisk(p.dir, true)) {
        assert.equal(
          modeOnDisk(p.dir, path).toString(8),
          '644',
          `${p.label}: ${path} did not land 0644`,
        );
      }
    });
  }
});

/**
 * **US-13's pre-write disclosure lists zero executable paths for every
 * bundled pack — and an empty section is the correct output.**
 *
 * The second half is the one this test is really for. `renderDisclosure`
 * prints the heading and `(none)` rather than omitting the section,
 * because "a section that vanishes when empty is indistinguishable from a
 * section that was never computed" (US-29). With Q-82 having removed the
 * product's only executables, **all three packs now render that empty
 * section on every run** — which looks exactly like a bug to someone who
 * does not know Q-82, and the obvious "fix" is to hide the section. That
 * fix would remove the one line telling a reader that this apply makes
 * nothing executable.
 *
 * The inert-hook row is asserted alongside it as the contrast: `planning`
 * has exactly one, so the disclosure is demonstrably capable of listing
 * something and the empty executables list is a fact about the packs.
 */
test('the pre-write disclosure lists no executable for any pack, and still prints the section', async () => {
  for (const name of PACKS) {
    const { report } = await validatePackByName(name, CLI);
    assert.ok(report, `${name} must produce a report`);
    assert.deepEqual(report.disclosure.executables, [], `${name} discloses an executable`);

    const lines = renderPackInfo(report);
    const heading = lines.indexOf(DISCLOSURE_TEXT.executables.heading);
    assert.notEqual(heading, -1, `${name}: pack info must still print the executables heading`);
    assert.equal(
      lines[heading + 1],
      DISCLOSURE_TEXT.executables.empty,
      `${name}: the empty marker is the expected output, not a missing section`,
    );
  }

  // The contrast: one pack ships one inert hook, so the disclosure is not
  // simply empty everywhere for want of ever being populated.
  const planning = await validatePackByName('planning', CLI);
  assert.deepEqual(
    planning.report?.disclosure.inertHooks.map((h) => h.path),
    ['.claude/hooks/kill-criteria-guard.sh'],
  );
});
