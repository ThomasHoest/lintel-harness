/**
 * T-1216 and T-1217 — US-16's two positive assertions, over the real
 * `coding` pack.
 *
 * ── Why three parts, and why each one is load-bearing (T-1216) ────────
 *
 * F1's spec is explicit about the history here: the v2.3 test asserted
 * `agentInstructionSubstitutions` named `CLAUDE.md` alone and passed under
 * a classifier that missed two of the five paths; the v2.4 test asserted
 * three paths and passed under a classifier that missed two more (C-43).
 * Both were *correct as far as they went* — which is exactly the failure
 * mode. **Count, membership and exclusion together are the only shape
 * that fails when the rule is wrong**: a classifier that silently drops a
 * path passes a membership-only check (the path was never claimed), and a
 * classifier that silently adds one passes a count-only check (the count
 * still adds up if something else was dropped). Only asserting all three
 * — exactly five, these five, and not this specific sixth one that a
 * `rename` step (not `substitute`) also touches — fails on the shapes
 * that actually recurred.
 *
 * ── T-1217, and where it diverges from the spec's own worked example ──
 *
 * F1's US-16 example cites "four 0755 applied paths in a backend
 * combination and none in the base combination" for `coding`. That was
 * true when it was written and stopped being true at Q-82: `coding`'s two
 * backend scaffolds (`backend-azure`, `backend-aws`) moved to `addons/`,
 * and `packs/coding/pack.json` now declares no `scaffolds` at all —
 * confirmed below by reading the pack. There is no "backend combination"
 * to apply, so that half of T-1217 is asserted as `skip`, with the
 * reasoning recorded at the test rather than silently dropped. The rule
 * itself is not weakened: T-1220 (Q-82) is where it is fixture-covered
 * now, per `CLAUDE.md`'s own note on the fold.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { CLI_VERSION, packDir, validatePackByName } from '../../dist/index.js';
import { EXIT, runCli, withTempDir } from '../harness/cli.js';

/* ── shared: the report both `init` and `pack info` render from ───────── */

async function codingReport() {
  const { report, bag } = await validatePackByName('coding', CLI_VERSION);
  assert.equal(bag.length, 0, `loadPack must not fault: ${bag.items.map((d) => d.code).join(', ')}`);
  assert.ok(report, 'coding must produce a PackReport');
  return report!;
}

/* ── T-1216: positive assertion 1 ──────────────────────────────────── */

/** The exact five, from C-43 and confirmed against the real pack: every
 *  applied path a `substitute` step's `in` glob matches. */
const EXPECTED_SUBSTITUTED_PATHS = [
  'CLAUDE.md',
  'AgentTeams/Specify.md',
  'AgentTeams/Implement.md',
  'specifications/README.md',
  'specifications/project-brief.md',
].sort();

test('pack info: agentInstructionSubstitutions names exactly five applied paths, and AgentTeams/README.md is absent', async () => {
  const report = await codingReport();
  // Widening `AppliedPath` to `string` — never narrowing back, which is
  // the direction C-14 forbids (`update.ts`'s own comment on the rule).
  const paths: readonly string[] = [
    ...new Set(report.disclosure.substitutions.map((s): string => s.path)),
  ].sort();

  assert.equal(paths.length, 5, `expected exactly 5 unique substituted paths, got ${paths.length}: ${paths.join(', ')}`);
  assert.deepEqual(paths, EXPECTED_SUBSTITUTED_PATHS);
  assert.ok(
    !paths.includes('AgentTeams/README.md'),
    'AgentTeams/README.md is produced by a rename step, not a substitute step, and must be absent',
  );

  // Every row names its parameter id and carries a non-undefined value —
  // "with its parameter id and the answer verbatim" (US-16).
  for (const row of report.disclosure.substitutions) {
    assert.ok(row.id.length > 0, `row for ${row.path} carries no parameter id`);
    assert.equal(typeof row.value, 'string');
  }

  // `pack info` has no answer to substitute (no --set), so the representative
  // ladder's leading candidate is the parameter's own id (combinations.ts,
  // CANDIDATES) — asserted here so the "verbatim" claim is checked against
  // what this surface actually renders, not against init's answer.
  const projectNameRows = report.disclosure.substitutions.filter((s) => s.id === 'projectName');
  assert.ok(projectNameRows.length > 0);
  for (const row of projectNameRows) assert.equal(row.value, 'projectName');
});

test('init: agentInstructionSubstitutions names exactly five applied paths with the real answer, and AgentTeams/README.md is absent', async () => {
  await withTempDir(async (dir) => {
    const answer = 'Demo Project';
    const r = await runCli(['harness', 'init', 'coding', '--set', `projectName=${answer}`], dir);
    assert.equal(r.code, EXIT.ok, r.stderr);

    const begin = /^--- lintel disclosure begin ([0-9a-f]{16,}) ---$/m.exec(r.stderr);
    assert.ok(begin, 'no disclosure begin line');
    const nonce = begin![1];
    const block = r.stderr.slice(
      r.stderr.indexOf(`--- lintel disclosure begin ${nonce} ---`),
      r.stderr.indexOf(`--- lintel disclosure end ${nonce} ---`),
    );
    const rows = block.split('\n');

    const subLines = rows.filter((l) => / {2}\S.*= /.test(l) && !l.startsWith('  ---') && !l.trimStart().startsWith('name:'));
    // Every row of the substitution section carries the applied path as
    // its first token. Extract the unique set.
    const pathsNamed = new Set<string>();
    for (const line of subLines) {
      const m = /^ {2}(\S+) {3}\w+ = /.exec(line);
      if (m) pathsNamed.add(m[1] as string);
    }

    assert.equal(pathsNamed.size, 5, `expected 5 unique substituted paths in init's disclosure, got: ${[...pathsNamed].join(', ')}`);
    assert.deepEqual([...pathsNamed].sort(), EXPECTED_SUBSTITUTED_PATHS);
    assert.ok(!pathsNamed.has('AgentTeams/README.md'));

    // The answer appears verbatim, at least once, on a CLAUDE.md row.
    assert.ok(
      rows.some((l) => l.includes('CLAUDE.md') && l.includes(`projectName = ${answer}`)),
      'the real answer must appear verbatim beside its parameter id',
    );
  });
});

/* ── T-1217: positive assertion 2 ──────────────────────────────────── */

/** The whole frontmatter block, fences included, read from the pack
 *  source itself — so this test fails if the disclosure builder diverges
 *  from what the pack actually declares, not merely if a hand-copied
 *  string goes stale. */
/**
 * LF-normalised, because **git checks the pack out with CRLF on Windows**.
 *
 * Both sides of the comparison are normalised, not just this one: on
 * Windows the CLI reads the very same bytes, so its disclosure carries the
 * `\r` too. Normalising only the expectation would swap a real failure for
 * a confusing one rather than fixing anything.
 */
const lf = (text: string): string => text.replaceAll('\r\n', '\n');

async function sourceFrontmatter(agentBasename: string): Promise<string> {
  const url = new URL(`agents/${agentBasename}`, packDir('coding'));
  const text = lf(await readFile(fileURLToPath(url), 'utf8'));
  const lines = text.split('\n');
  assert.equal(lines[0], '---', `${agentBasename} must open with ---`);
  const closeAt = lines.indexOf('---', 1);
  assert.ok(closeAt > 0, `${agentBasename} must close its frontmatter with ---`);
  return lines.slice(0, closeAt + 1).join('\n');
}

const TEN_AGENTS = [
  'architect.md',
  'copywriter.md',
  'designer.md',
  'implementer.md',
  'researcher.md',
  'reviewer.md',
  'securityreviewer.md',
  'specwriter.md',
  'target-reviewer.md',
  'testwriter.md',
] as const;

test('pack info: all ten coding agents are disclosed with their whole frontmatter blocks verbatim', async () => {
  const report = await codingReport();
  const rows = report.disclosure.agents;

  assert.equal(rows.length, 10, `expected exactly ten agent rows, got ${rows.length}`);

  const byPath = new Map(rows.map((r) => [r.path, r.frontmatter]));
  for (const basename of TEN_AGENTS) {
    const path = `.claude/agents/${basename}`;
    const expected = await sourceFrontmatter(basename);
    assert.ok(byPath.has(path), `no disclosure row for ${path}`);
    assert.equal(lf(byPath.get(path) ?? ''), expected, `${path}: frontmatter must be verbatim, whole block`);
  }

  // Bash on exactly two: implementer and testwriter.
  const bashAgents = rows.filter((r) => /^tools:.*\bBash\b/m.test(r.frontmatter)).map((r) => r.path);
  assert.deepEqual(
    bashAgents.sort(),
    ['.claude/agents/implementer.md', '.claude/agents/testwriter.md'].sort(),
    'Bash must appear on exactly implementer and testwriter',
  );

  // researcher's WebSearch, WebFetch — the only network capability any
  // v1.0 pack ships.
  const researcher = byPath.get('.claude/agents/researcher.md') ?? '';
  assert.match(researcher, /tools:.*WebSearch, WebFetch/);
  const webCapable = rows.filter((r) => /WebSearch|WebFetch/.test(r.frontmatter)).map((r) => r.path);
  assert.deepEqual(webCapable, ['.claude/agents/researcher.md']);

  // permissionMode: readonly on exactly architect, reviewer, securityreviewer.
  const readonlyAgents = rows
    .filter((r) => /^permissionMode: readonly$/m.test(r.frontmatter))
    .map((r) => r.path)
    .sort();
  assert.deepEqual(readonlyAgents, [
    '.claude/agents/architect.md',
    '.claude/agents/reviewer.md',
    '.claude/agents/securityreviewer.md',
  ]);
});

/**
 * **Skipped — the spec's own worked example is stale against the real
 * pack, and this task must not edit `packs/` to make it true again.**
 *
 * T-1217 (`specifications/v1.0/F1-epics-and-tasks-pack-format-and-manifest.md`)
 * and US-16 (`F1-spec-pack-format-and-manifest.md`) both require "four 0755
 * applied paths in a backend combination and none in the base combination"
 * for the `coding` pack. Q-82 (`CLAUDE.md`, folded 2026-09-01) moved
 * `coding`'s two backend scaffolds — the only place any v1.0 pack ever set
 * `executable: true` — out to `addons/` as v1.1 add-ons. Confirmed against
 * the shipped pack immediately below: `packs/coding/pack.json` declares no
 * `scaffolds` and `packs/coding/recipe.json` sets `executable` nowhere, so
 * there is no "backend combination" of `coding` left to select or apply.
 *
 * The rule itself is not weakened — it is fixture-covered instead, at
 * T-1220 (`E-EXEC-DEST-FORBIDDEN`, `executableRoots`, and the 0755
 * disclosure, exercised against a synthetic pack with a declared scaffold).
 * This test is left in place, `skip`ped with this reasoning, rather than
 * deleted, so a reader hits the explanation rather than silence.
 */
test('pack info: four 0755 paths in a backend combination, none in base (coding)', { skip: 'Q-82 removed coding\'s only executable-bearing scaffolds to addons/ — no backend combination exists to assert against; see T-1220 for the fixture-covered replacement — T-1217' }, async () => {
  // Left unimplemented deliberately; see the skip reason above.
});

test('confirmation: coding declares no scaffolds and no executable step (why the above is skipped)', async () => {
  const packJsonUrl = new URL('pack.json', packDir('coding'));
  const recipeJsonUrl = new URL('recipe.json', packDir('coding'));
  const pack = JSON.parse(await readFile(fileURLToPath(packJsonUrl), 'utf8')) as { scaffolds?: unknown };
  const recipe = JSON.parse(await readFile(fileURLToPath(recipeJsonUrl), 'utf8')) as {
    steps: readonly { executable?: boolean }[];
  };

  assert.equal(pack.scaffolds, undefined, 'coding/pack.json must declare no scaffolds (Q-82)');
  assert.ok(
    recipe.steps.every((s) => s.executable !== true),
    'coding/recipe.json must set executable on no step (Q-82)',
  );

  // And the property T-1217 actually can assert against the real pack:
  // zero 0755 applied paths in the one combination that exists.
  const report = await codingReport();
  assert.equal(report.disclosure.executables.length, 0);
});
