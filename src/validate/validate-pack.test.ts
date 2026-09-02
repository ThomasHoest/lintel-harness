import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { readPackPayload, validatePack, validatePackByName, type PackPayload } from './validate-pack.js';
import { planPayloadCopy } from '../payload/copy-payload.js';
import { bundledPackNames } from '../pack/load-pack.js';
import { exitCodeFor } from '../diag/diagnostic.js';
import type { LoadedPack } from '../pack/load-pack.js';
import type { PackJson } from '../pack/types.js';
import type { Recipe } from '../recipe/types.js';

const CLI = '0.1.0';

/** The glob matcher compares **segment by segment** and requires equal
 *  segment counts — there is no `**`. A fixture's anatomy globs therefore
 *  enumerate depths rather than writing one recursive pattern. */
const PATHS = ['*', '*/*', '*/*/*'];

const nine = {
  process: { paths: PATHS },
  roles: { paths: PATHS },
  documentTemplates: { paths: PATHS },
  conventions: { paths: PATHS },
  coordination: { paths: PATHS },
  behaviouralGuidelines: { paths: PATHS },
  folderScaffolding: { declaredBy: 'recipe' as const },
  skillsAndAutomations: { paths: PATHS },
  autonomyContract: { paths: PATHS },
};

/**
 * A pack built in memory.
 *
 * `validatePack` reads no filesystem — `loaded.dir` is used only by
 * `readPackPayload`, which is a separate function — so the fourteen steps
 * are exercised against a `LoadedPack` a test composes. That is the same
 * property that lets `validate` run in CI with nothing checked out.
 */
function fixture(
  files: Record<string, string>,
  over: Partial<PackJson> = {},
  recipe: Recipe | string = { formatVersion: 1, steps: [] },
): { loaded: LoadedPack; payload: PackPayload } {
  const pack: PackJson = {
    formatVersion: 1,
    name: 'fix',
    version: '1.0.0',
    title: 'fixture',
    minCliVersion: '1.0.0',
    anatomy: nine,
    ...over,
  };
  const bytes = new Map<string, Buffer>();
  const entries = Object.entries(files).map(([path, text]) => {
    const b = Buffer.from(text, 'utf8');
    bytes.set(path, b);
    return { path, kind: 'file' as const, size: b.length };
  });
  return {
    loaded: {
      name: pack.name,
      dir: new URL('file:///nowhere/'),
      pack,
      recipePath: 'recipe.json',
      recipeText: typeof recipe === 'string' ? recipe : JSON.stringify(recipe),
    },
    payload: { entries, bytes, truncated: false },
  };
}

const codes = (files: Record<string, string>, over?: Partial<PackJson>, recipe?: Recipe | string) => {
  const f = fixture(files, over, recipe);
  return validatePack({ loaded: f.loaded, payload: f.payload, cliVersion: CLI }).diagnostics.map(
    (d) => d.code,
  );
};

/* ── the shipping criterion ──────────────────────────────────────────── */

/**
 * **US-16's most useful sentence, asserted rather than believed:**
 * *"`lintel harness validate --all --strict` is runnable in this repo's CI
 * and exits `0` for all three v1.0 packs before release."*
 *
 * And Q-60's whole point beside it: the run is not silent. At least two
 * findings stand, and **every one of them is `notice`** — `planning`'s
 * provisional role set and its inert hook script are states those packs
 * declare on purpose, and a `--strict` run that punished a pack for saying
 * so is the failure the severity split exists to remove.
 */
test('validate --all --strict exits 0 for every bundled pack, with notices standing', async () => {
  const names = await bundledPackNames();
  assert.deepEqual(names, ['coding', 'planning', 'writing']);

  const all = [];
  for (const name of names) {
    const { report, bag } = await validatePackByName(name, CLI);
    assert.ok(report !== undefined, `${name} failed to load: ${bag.items.map((d) => d.code).join(', ')}`);
    assert.equal(report.ok, true, `${name}: ${report.diagnostics.map((d) => d.code).join(', ')}`);
    all.push(...report.diagnostics);
  }

  assert.equal(exitCodeFor(all, true), 0);
  assert.ok(all.length >= 2, 'the run must not be silent');
  assert.deepEqual([...new Set(all.map((d) => d.class))], ['notice']);
});

/**
 * **C-43's total enumeration, at the count, the membership and the
 * exclusion.** Asserting all three is the only shape that fails when the
 * rule is wrong: the classifier this replaced passed a test asserting
 * `CLAUDE.md` alone while missing two paths, and passed a strengthened one
 * asserting three while missing two more.
 */
test('coding discloses exactly the five applied paths a parameter answer reaches', async () => {
  const { report } = await validatePackByName('coding', CLI);
  const paths = [...new Set(report?.disclosure.substitutions.map((s) => s.path) ?? [])].sort();
  assert.deepEqual(paths, [
    'AgentTeams/Implement.md',
    'AgentTeams/Specify.md',
    'CLAUDE.md',
    'specifications/README.md',
    'specifications/project-brief.md',
  ]);
  assert.ok(!paths.some((x) => x === 'AgentTeams/README.md'));
});

/** C-32b, C-40, C-45: ten blocks, whole and verbatim — two declaring
 *  `Bash`, three declaring `permissionMode: readonly`. A count alone would
 *  pass under a renderer that printed `tools:` and dropped the mode key,
 *  which is the defect C-40 was. */
test('coding discloses all ten agent frontmatter blocks in full', async () => {
  const { report } = await validatePackByName('coding', CLI);
  const agents = report?.disclosure.agents ?? [];
  assert.equal(agents.length, 10);
  assert.equal(agents.filter((a) => /^tools:.*\bBash\b/m.test(a.frontmatter)).length, 2);
  assert.equal(agents.filter((a) => /^permissionMode: readonly$/m.test(a.frontmatter)).length, 3);
  assert.equal(agents.filter((a) => /WebSearch/.test(a.frontmatter)).length, 1);
  for (const a of agents) assert.ok(a.frontmatter.startsWith('---'), `${a.path} is not the whole block`);
});

/** US-29's promise, on the only pack that varies: a reader sees what
 *  `--calibration high-floor` changes without running it. */
test('planning reports both conditional steps and what each writes', async () => {
  const { report } = await validatePackByName('planning', CLI);
  assert.equal(report?.combinations, 2);
  assert.deepEqual(
    report?.parameterVaryingSteps.map((v) => v.when['constraintFloor']),
    ['high-floor', 'near-zero-floor'],
  );
  for (const v of report?.parameterVaryingSteps ?? []) assert.ok(v.writes.length > 0);
});

/* ── the fourteen steps ──────────────────────────────────────────────── */

/**
 * **The order is the contract**, so a pack fails on the earliest and most
 * explicable cause. A pack that is wrong at step 2 *and* step 6 reports
 * the anatomy fault first.
 */
test('findings are emitted in step order, earliest cause first', () => {
  const found = codes(
    { 'a.md': 'x' },
    { anatomy: { ...nine, roles: {} } as unknown as PackJson['anatomy'] },
    { formatVersion: 1, steps: [{ op: 'copy', from: 'a.md', to: '.envrc' }] },
  );
  assert.ok(found.indexOf('E-ANATOMY-MISSING') < found.indexOf('E-MAP-RESERVED-DEST'));
});

/** Step 3 — the payload quantifier of the `.claude` gate (C-39c). A pack
 *  that merely **ships** the file, naming it in no recipe step, still
 *  lands it live at `.harness/pack/.claude/commands/x.md` inside the
 *  committed project. */
test('step 3 refuses a permission grant in a payload file no step names', () => {
  const found = codes({ '.claude/commands/x.md': '---\nallowed-tools: Bash\n---\n' });
  assert.ok(found.includes('E-CLAUDE-TOOL-GRANT'));
});

/** Step 11 — the write-set quantifier, on **rendered** bytes. A later
 *  `substitute` or `rewrite-path` can change what the runtime reads, so
 *  the payload source is the wrong subject. */
test('step 11 refuses a permission grant a rewrite introduces after the copy', () => {
  const found = codes(
    { 'cmd.md': '---\nPLACEHOLDER: Bash\n---\n' },
    {},
    {
      formatVersion: 1,
      steps: [
        { op: 'copy', from: 'cmd.md', to: '.claude/commands/cmd.md' },
        { op: 'rewrite-path', in: ['.claude/*/*'], find: 'PLACEHOLDER', replace: 'allowed-tools' },
      ],
    },
  );
  assert.ok(found.includes('E-CLAUDE-TOOL-GRANT'));
});

/** Step 6 — over the **write set**, so a directory recursion's output is
 *  gated by every route and not only where a step names it. */
test('step 6 refuses a reserved destination a recursion produces', () => {
  const found = codes(
    { 'tree/workflows/ci.yml': 'x' },
    {},
    { formatVersion: 1, steps: [{ op: 'copy', from: 'tree/', to: '.github/' }] },
  );
  assert.ok(found.includes('E-MAP-RESERVED-DEST'));
});

/** Step 8 — `notice`, because shipping an inert `0644` hook is permitted
 *  and intended, and no change an author could make would clear it short
 *  of deleting content the pack means to ship. */
test('step 8 reports a shipped hook script as a notice, never a defect', () => {
  const f = fixture(
    { 'guard.sh': '#!/bin/sh\n' },
    {},
    { formatVersion: 1, steps: [{ op: 'copy', from: 'guard.sh', to: '.claude/hooks/guard.sh' }] },
  );
  const report = validatePack({ loaded: f.loaded, payload: f.payload, cliVersion: CLI });
  const hook = report.diagnostics.find((d) => d.code === 'W-HOOK-SCRIPT-INERT');
  assert.equal(hook?.class, 'notice');
  assert.equal(exitCodeFor(report.diagnostics, true), 0);
});

/** Step 12, end to end: a directory the apply creates with no folder
 *  README, promoted to exit 1 only under `--strict`. */
test('step 12 is a defect: exit 0 normally, exit 1 under --strict', () => {
  const f = fixture(
    { 'docs/a.md': 'x' },
    {},
    { formatVersion: 1, steps: [{ op: 'copy', from: 'docs/', to: 'docs/' }] },
  );
  const report = validatePack({ loaded: f.loaded, payload: f.payload, cliVersion: CLI });
  assert.ok(report.diagnostics.some((d) => d.code === 'W-FOLDER-README-MISSING'));
  assert.equal(exitCodeFor(report.diagnostics, false), 0);
  assert.equal(exitCodeFor(report.diagnostics, true), 1);
});

/**
 * **Stage 3 of confinement is not in the list, and its absence is the
 * property.** Nothing in the runner resolves a project root, which is what
 * makes a pack checkable in CI with nothing checked out — asserted by
 * validating a pack whose `dir` does not exist.
 */
test('a pack validates with no project and no readable pack directory', () => {
  const f = fixture({ 'a.md': 'x' }, {}, { formatVersion: 1, steps: [{ op: 'copy', from: 'a.md', to: 'a.md' }] });
  const report = validatePack({ loaded: f.loaded, payload: f.payload, cliVersion: CLI });
  assert.equal(report.ok, true);
  assert.deepEqual(report.steps.map((s) => s.op), ['copy']);
});

/**
 * A recipe that does not parse stops the runner after step 4. **A
 * partially planned pack is the shape that lets a later stage reason about
 * half a declaration**, which is the rule `loadPack` and `validateRecipe`
 * already follow by returning no value on any fault.
 */
test('an unparseable recipe reports steps 1-4 and plans nothing', () => {
  const f = fixture({ 'a.md': 'x' }, {}, '{ not json');
  const report = validatePack({ loaded: f.loaded, payload: f.payload, cliVersion: CLI });
  assert.equal(report.ok, false);
  assert.deepEqual(report.steps, []);
  assert.equal(report.combinations, 0);
  assert.deepEqual(report.disclosure.substitutions, []);
});

/** Q-50's basename is **declared, not guessed** — `writing` is the pack
 *  that proves the default is not universal. */
test('the report carries the folder README basename the pack declared', async () => {
  const w = await validatePackByName('writing', CLI);
  const c = await validatePackByName('coding', CLI);
  assert.equal(w.report?.folderReadme, 'index.md');
  assert.equal(c.report?.folderReadme, 'README.md');
});

/** An unknown pack name never reaches `packDir()`: the grammar and the
 *  on-disk membership are both checked, and the result carries no report
 *  to reason about. */
test('an unknown pack name yields no report', async () => {
  const { report, bag } = await validatePackByName('../etc', CLI);
  assert.equal(report, undefined);
  assert.deepEqual(bag.items.map((d) => d.code), ['E-CLI-UNKNOWN-PACK']);
});

/* ── reading a pack directory ────────────────────────────────────────── */

/**
 * **`walk` reports a skipped symlink as `W-SCAN-SYMLINK-SKIPPED` with the
 * path only inside the rendered message**, so no consumer can recover it
 * from the bag — and `E-SYMLINK-IN-PACK` needs the path. `readPackPayload`
 * therefore re-reads the directories the bounded walk already found, which
 * follows nothing and adds no traversal of its own.
 *
 * A **directory** link is the case worth asserting: `walk` neither follows
 * nor lists it, so a reader of `entries` alone would never learn it was
 * there.
 */
test('a symlink anywhere in a pack is found and named, files and directories alike', async () => {
  const root = await mkdtemp(join(tmpdir(), 'lintel-pack-'));
  try {
    await mkdir(join(root, 'sub'));
    await writeFile(join(root, 'a.md'), 'hi\n');
    await symlink('a.md', join(root, 'link.md'));
    await symlink('..', join(root, 'sub', 'up'));

    const payload = await readPackPayload(pathToFileURL(`${root}/`));
    const links = payload.entries.filter((e) => e.symlink === true).map((e) => e.path).sort();
    assert.deepEqual(links, ['link.md', 'sub/up']);
    assert.deepEqual(
      planPayloadCopy('fix', payload.entries, payload.truncated).bag.items.map((d) => d.code),
      ['E-SYMLINK-IN-PACK', 'E-SYMLINK-IN-PACK'],
    );
    assert.deepEqual([...payload.bytes.keys()], ['a.md']);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
