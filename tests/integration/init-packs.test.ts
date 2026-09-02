/**
 * T-2201 — the three stand-ups. US-53, US-54, US-55.
 *
 * Every other test of `init` asserts a mechanism. This asserts the
 * **product**: each bundled pack, stood up into an empty directory by the
 * spawned binary, against F5 §7b's applied tree.
 *
 * ── Why the spawned binary rather than `runInit` ──────────────────────
 *
 * `src/cli/commands/init.test.ts` already drives `runInit` in-process with
 * its own snapshot. Two things it cannot see, and both are contracts:
 * **the exit class** — 0/1/2/3 is what CI and the F6 skill branch on
 * (IM-7, IM-39) and no in-process call produces one — and **the on-disk
 * spelling** of every path it wrote (C-36), which `snapshot()` reads from
 * `readdir` rather than composing.
 *
 * ── The trees below are closed listings, and that is deliberate ───────
 *
 * `CONTRIBUTING.md` warns that closed enumerations go false silently, and
 * F5's own §7b is the standing proof — four rounds of amendments, the last
 * of which found `coding`'s applied tree still showing an `infrastructure/`
 * subtree Q-82 removed. A closed listing in prose rots unnoticed; a closed
 * listing in a test fails the moment the recipe and the claim disagree,
 * which is the only form of the claim worth writing down.
 *
 * **Read against F5 §7b, not transcribed from it.** Where §7b is current
 * these agree; where §7b is stale (`coding`'s `infrastructure/` block and
 * its executables paragraph, both recorded as stale at F5 v3.7/v3.8 and
 * not repaired) the recipe is the fact and this is what the recipe
 * produces.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { EXIT, runCli, snapshot, withTempDir, type Entry } from '../harness/cli.js';
import { packDir, type PackManifest } from '../../dist/index.js';

/** Every answer by flag: these runs have no TTY, and US-55's determinism
 *  claim is over answers that were *given*, not defaulted by accident. */
const ANSWERS: Readonly<Record<string, readonly string[]>> = {
  coding: ['--set', 'projectName=Demo Project'],
  writing: [
    '--set',
    'projectName=Demo Project',
    '--set',
    'projectPurpose=How organisations absorb change',
    '--set',
    'authorName=A Writer',
  ],
  // The pack-declared alias, not `--set`: `planning` is the one pack that
  // declares a `flag`, and the alias is the surface a user meets.
  planning: ['--calibration', 'high-floor'],
};

/** Applied files only — `.harness/` is phase 1 and the tool's own, and
 *  F5 §7b's tree is the phase-2 half. Directories are asserted separately,
 *  because "not one empty directory" is a claim about them. */
function appliedFiles(entries: readonly Entry[]): string[] {
  return entries
    .filter((e) => e.kind === 'file' && !e.path.startsWith('.harness/'))
    .map((e) => e.path)
    .sort();
}

const CODING = [
  '.claude/agents/architect.md',
  '.claude/agents/copywriter.md',
  '.claude/agents/designer.md',
  '.claude/agents/implementer.md',
  '.claude/agents/researcher.md',
  '.claude/agents/reviewer.md',
  '.claude/agents/securityreviewer.md',
  '.claude/agents/specwriter.md',
  '.claude/agents/target-reviewer.md',
  '.claude/agents/testwriter.md',
  '.claude/commands/target.md',
  'AgentTeams/Implement.md',
  'AgentTeams/README.md',
  'AgentTeams/Specify.md',
  'CLAUDE.md',
  'copy/README.md',
  'copy/tone-of-voice.md',
  'specifications/README.md',
  'specifications/general/README.md',
  'specifications/project-brief.md',
  'specifications/v1.0/README.md',
  'targets/README.md',
  'targets/Run.md',
].sort();

const WRITING_BASE = [
  '.claude/agents/analyst.md',
  '.claude/agents/critic.md',
  '.claude/agents/editor.md',
  '.claude/agents/librarian.md',
  '.claude/agents/outliner.md',
  '.claude/agents/researcher.md',
  '.claude/agents/scout.md',
  '.claude/agents/writer.md',
  'CLAUDE.md',
  'Home.md',
  'project-brief.md',
  'writing-guide/README.md',
  'writing-guide/ai-tells.md',
  'writing-guide/bilingual-publishing.md',
  'writing-guide/index.md',
  'writing-guide/tone-of-voice.md',
].sort();

/** The twelve pre-authored `index.md` files the scaffold's five `copy`
 *  steps carry in. F5 v3.0 corrected the mechanism — one `index.md`
 *  rename in the recipe, twelve files in the payload — and this is that
 *  correction made checkable. */
const WRITING_SCAFFOLD = [
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
].sort();

const PLANNING = [
  '.claude/agents/bet-framer.md',
  '.claude/agents/discovery-lead.md',
  '.claude/agents/gate-reviewer.md',
  '.claude/agents/horizon-analyst.md',
  '.claude/agents/learning-synthesiser.md',
  '.claude/agents/portfolio-steward.md',
  '.claude/agents/target-reviewer.md',
  '.claude/commands/bet.md',
  '.claude/commands/horizon.md',
  '.claude/commands/review.md',
  '.claude/commands/target.md',
  '.claude/hooks/kill-criteria-guard.sh',
  'CLAUDE.md',
  'background/README.md',
  'background/capacity/README.md',
  'background/company/README.md',
  'background/constraints/README.md',
  'background/market/README.md',
  'background/performance/README.md',
  'background/products/README.md',
  'background/strategy/README.md',
  'calibration.md',
  'portfolio/README.md',
  'portfolio/absorption-gate.md',
  'portfolio/bets/README.md',
  'portfolio/cadence.md',
  'portfolio/decisions.md',
  'portfolio/horizons.md',
  'portfolio/register.md',
  'project-brief.md',
  'targets/README.md',
  'targets/Run.md',
].sort();

const TREES: Readonly<Record<string, readonly string[]>> = {
  coding: CODING,
  writing: WRITING_BASE,
  planning: PLANNING,
};

for (const pack of ['coding', 'writing', 'planning']) {
  test(`${pack} stands up into an empty directory and exits 0`, async () => {
    await withTempDir(async (dir) => {
      const r = await runCli(['harness', 'init', pack, ...(ANSWERS[pack] ?? [])], dir);
      assert.equal(r.code, EXIT.ok, r.stderr);

      const entries = await snapshot(dir);
      assert.deepEqual(appliedFiles(entries), [...(TREES[pack] ?? [])]);
    });
  });

  /**
   * F5 v3.7 (c): **no v1.0 pack ships an executable.** `coding` declared
   * `executableRoots` and four `0755` scripts until Q-82 moved both
   * backend kits to `addons/`; §7b still says otherwise in prose, and this
   * is the mechanical form of the claim that replaced it.
   */
  test(`${pack} writes every applied path 0644 and creates no empty directory`, async () => {
    if (process.platform === 'win32') return; // no mode to represent
    await withTempDir(async (dir) => {
      const r = await runCli(['harness', 'init', pack, ...(ANSWERS[pack] ?? [])], dir);
      assert.equal(r.code, EXIT.ok, r.stderr);

      const entries = await snapshot(dir);
      for (const e of entries) {
        if (e.kind !== 'file' || e.path.startsWith('.harness/')) continue;
        assert.equal(e.mode, 0o644, `${e.path} must land 0644`);
      }

      // Q-50: every folder an apply creates carries a README (or the
      // pack's declared basename), so no directory is left empty.
      const dirs = entries.filter((e) => e.kind === 'dir').map((e) => e.path);
      const files = entries.filter((e) => e.kind !== 'dir').map((e) => e.path);
      for (const d of dirs) {
        assert.ok(
          files.some((f) => f.startsWith(`${d}/`)),
          `${d} is empty`,
        );
      }
    });
  });

  /**
   * US-54. The block is stdout's, appears on a `0`-exit run, and claims
   * no judgment work — it names the three outstanding items and says the
   * manifest is committed and public (IM-14, IM-15, Q-1, IM-9).
   */
  test(`${pack}'s successful run reports what is still outstanding, on stdout`, async () => {
    await withTempDir(async (dir) => {
      const r = await runCli(['harness', 'init', pack, ...(ANSWERS[pack] ?? [])], dir);
      assert.equal(r.code, EXIT.ok, r.stderr);

      assert.match(r.stdout, new RegExp(`applied ${pack} `), 'the block names the pack');
      assert.match(r.stdout, /project-brief\.md/);
      assert.match(r.stdout, /voice guide/);
      assert.match(r.stdout, /\.harness\/ included/);
      assert.match(r.stdout, /committed by design/);
      assert.match(r.stdout, /as public as this repository/);

      // Q-1, IM-9: it must not claim the judgment work was done. The three
      // items are stated as outstanding — an imperative — and never in a
      // tense that says they happened.
      assert.ok(!/\badapted\b/i.test(r.stdout), 'it never says CLAUDE.md was adapted');
      assert.ok(!/\bfilled\b/i.test(r.stdout), 'it never says anything was filled in');
    });
  });

  /**
   * The manifest is the last write, and a completed apply leaves no
   * journal and no lock: between those two moments the project is
   * mid-apply, and a residue of either would claim it still is.
   */
  test(`${pack} records a minimal manifest and leaves no journal or lock`, async () => {
    await withTempDir(async (dir) => {
      const r = await runCli(['harness', 'init', pack, ...(ANSWERS[pack] ?? [])], dir);
      assert.equal(r.code, EXIT.ok, r.stderr);

      const entries = await snapshot(dir).then((e) => e.map((x) => x.path));
      assert.ok(entries.includes('.harness/manifest.json'));
      assert.ok(!entries.includes('.harness/journal.json'), 'a journal would claim an interrupted apply');
      assert.ok(!entries.includes('.harness/lock'), 'the lock is released on a completed apply');

      const manifest = JSON.parse(
        await readFile(join(dir, '.harness', 'manifest.json'), 'utf8'),
      ) as PackManifest;
      assert.equal(manifest.pack.name, pack);

      // Q-43: no per-file hashes. Applied state is recomputed, and a
      // hash table here would be the thing `update` was built not to need.
      assert.ok(!('files' in manifest), 'the manifest is minimal');
      assert.ok(!('hashes' in manifest));

      // F1 US-10: every declared parameter of the base pack is recorded,
      // defaults included.
      const packJson = JSON.parse(
        await readFile(join(fileURLToPath(packDir(pack)), 'pack.json'), 'utf8'),
      ) as { parameters?: readonly { id: string }[] };
      for (const p of packJson.parameters ?? []) {
        assert.ok(p.id in manifest.parameters, `${p.id} must be recorded`);
      }
    });
  });

  /** F5 US-18, in its mechanically checkable form: no pack can reach a
   *  settings file at all, because Q-54 removed the primitive. */
  test(`${pack} writes no .claude/settings.json`, async () => {
    await withTempDir(async (dir) => {
      await runCli(['harness', 'init', pack, ...(ANSWERS[pack] ?? [])], dir);
      const paths = (await snapshot(dir)).map((e) => e.path);
      assert.ok(!paths.some((p) => /(^|\/)\.claude\/settings\.json$/.test(p)));
    });
  });
}

/* ── the step counts E-22 names, read off the recipes that ran ────────── */

interface RecipeFile {
  readonly steps: readonly { readonly when?: unknown }[];
  readonly scaffolds?: Readonly<Record<string, readonly unknown[]>>;
}

async function recipe(pack: string): Promise<RecipeFile> {
  return JSON.parse(
    await readFile(join(fileURLToPath(packDir(pack)), 'recipe.json'), 'utf8'),
  ) as RecipeFile;
}

test('coding declares fifteen steps and no branch of any kind', async () => {
  const r = await recipe('coding');
  assert.equal(r.steps.length, 15);
  assert.equal(r.steps.filter((s) => s.when !== undefined).length, 0);
  assert.equal(Object.keys(r.scaffolds ?? {}).length, 0, 'Q-82 took both backend kits');
});

test('writing declares eight base steps and five under its one scaffold', async () => {
  const r = await recipe('writing');
  assert.equal(r.steps.length, 8);
  assert.deepEqual(Object.keys(r.scaffolds ?? {}), ['writing-workstream']);
  assert.equal((r.scaffolds ?? {})['writing-workstream']?.length, 5);
});

test('planning declares twenty-three steps with exactly one when pair', async () => {
  const r = await recipe('planning');
  assert.equal(r.steps.length, 23);
  const gated = r.steps.filter((s) => s.when !== undefined);
  assert.equal(gated.length, 2, 'the two calibration copies, and nothing else');
  assert.deepEqual(gated.map((s) => s.when), [
    { constraintFloor: 'high-floor' },
    { constraintFloor: 'near-zero-floor' },
  ]);
});

/* ── the two branch shapes, applied ───────────────────────────────────── */

test('writing --scaffold writing-workstream adds exactly the twelve index files', async () => {
  await withTempDir(async (dir) => {
    const r = await runCli(
      ['harness', 'init', 'writing', ...(ANSWERS['writing'] ?? []), '--scaffold', 'writing-workstream'],
      dir,
    );
    assert.equal(r.code, EXIT.ok, r.stderr);
    assert.deepEqual(appliedFiles(await snapshot(dir)), [...WRITING_BASE, ...WRITING_SCAFFOLD].sort());

    const manifest = JSON.parse(
      await readFile(join(dir, '.harness', 'manifest.json'), 'utf8'),
    ) as PackManifest;
    assert.deepEqual(manifest.scaffolds, ['writing-workstream']);
  });
});

/**
 * F5 v2.5: **both calibration branches produce the identical folder set
 * and 32 applied paths each**, and only the two calibration copies are
 * `when`-gated. The identical path set is the *reason* the folder-README
 * rule holds per parameter combination (F1 US-16 step 12) — so it is
 * asserted as a path-set identity, and the differing bytes are asserted
 * separately so "identical" cannot be read as "the same file".
 */
test('planning’s two calibration branches differ in one file and in no path', async () => {
  const trees: string[][] = [];
  const calibration: string[] = [];
  for (const floor of ['high-floor', 'near-zero-floor']) {
    await withTempDir(async (dir) => {
      const r = await runCli(['harness', 'init', 'planning', '--calibration', floor], dir);
      assert.equal(r.code, EXIT.ok, r.stderr);
      trees.push(appliedFiles(await snapshot(dir)));
      calibration.push(await readFile(join(dir, 'calibration.md'), 'utf8'));
    });
  }
  assert.deepEqual(trees[0], trees[1], 'both branches produce the same paths');
  assert.equal(trees[0]?.length, 32);
  assert.notEqual(calibration[0], calibration[1], 'and different calibration content');
});
