/**
 * Reserved-destination fixtures. T-1202 – T-1205.
 *
 * These are the rows of US-16's table that say `E-MAP-RESERVED-DEST`, and
 * they fall into four families. **The families matter more than the
 * count**, because three of the four exist for holes that were once open:
 *
 *   BY NAME       the destination is the reserved path.
 *   BY ROUTE      no step names it; a directory recursion **produces** it.
 *                 A rule checked against `to` misses every one of these.
 *   BY SEGMENT    the reserved name is nested — `docs/.claude/…`,
 *                 `x/.circleci/…`. Under first-segment scoping these
 *                 passed every stage.
 *   BY CLASS      the class-2 execution surfaces: CI configs, task
 *                 runners, `.envrc`, `.mcp.json`.
 */
import { test } from 'node:test';
import { assertFixture, basePack, baseRecipe, type Fixture } from '../run-fixtures.js';

const pack = (steps: unknown[], files: Record<string, string> = {}) => ({
  packJson: basePack(),
  recipeJson: baseRecipe(steps),
  files: { 'src/a.md': 'a\n', ...files },
});

const reserved = (name: string, because: string, steps: unknown[], files?: Record<string, string>): Fixture => ({
  name,
  because,
  ...pack(steps, files),
  expect: ['E-MAP-RESERVED-DEST'],
  exit: 2,
});

/* ── T-1202: the settings files, by name ─────────────────────────────── */

const BY_NAME: Fixture[] = [
  reserved(
    'copy to .claude/settings.json',
    'US-3 stage 2 — the pack rewrites the agent runtime it is applied into',
    [{ op: 'copy', from: 'src/a.md', to: '.claude/settings.json' }],
  ),
  reserved(
    'rename to .claude/Settings.json',
    'the collisionKey match — on macOS and Windows this IS settings.json',
    [{ op: 'rename', from: 'src/a.md', to: '.claude/Settings.json' }],
  ),
  {
    // `anchors` may not be empty, so the fixture declares one and the
    // template carries it. **A fixture that fails its own schema has
    // stopped testing its attack** — this one failed
    // `E-RECIPE-STEP-INVALID` on the empty array before the destination
    // rule was ever reached, which is the trap this harness is about.
    name: 'generate to .claude/settings.local.json',
    because: 'the local override is as powerful as the committed one',
    packJson: basePack(),
    recipeJson: baseRecipe([
      { op: 'generate', template: 'tpl.md', to: '.claude/settings.local.json', anchors: ['a'] },
    ]),
    files: {
      'src/a.md': 'a\n',
      'tpl.md': '<!-- harness:region id=a -->\n{}\n<!-- harness:end -->\n',
    },
    expect: ['E-MAP-RESERVED-DEST'],
    exit: 2,
  },
  reserved(
    'copy to docs/.claude/settings.json',
    'C-39a — under v2.4 two-exact-paths reservation this passed EVERY stage',
    [{ op: 'copy', from: 'src/a.md', to: 'docs/.claude/settings.json' }],
  ),
  reserved(
    'copy to package.json',
    'US-3 stage 2 — scripts in package.json run on npm install',
    [{ op: 'copy', from: 'src/a.md', to: 'package.json' }],
  ),
];

/* ── T-1203: by route rather than by name ────────────────────────────── */

/**
 * **The by-any-route property**, and the reason the write set exists as a
 * named concept. No step here names the reserved path — a directory
 * recursion produces it. A rule quantified over `to` sees only the
 * directory and lets every one of these through.
 */
const BY_ROUTE: Fixture[] = [
  {
    name: 'copy of a directory whose recursion produces .claude/settings.json',
    because: 'C-19 — no step names it; the rule must be over the WRITE SET',
    ...pack([{ op: 'copy', from: 'kit/', to: '.claude/' }], { 'kit/settings.json': '{}\n' }),
    expect: ['E-MAP-RESERVED-DEST'],
    exit: 2,
  },
  {
    name: 'strip-suffix whose recursion produces .github/workflows/x.yml',
    because: 'C-31 — the by-route property proved on class 2, not only on the settings files',
    ...pack([{ op: 'strip-suffix', from: 'ci/', to: '.github/workflows/', suffix: '.tpl' }], {
      'ci/x.tpl.yml': 'on: push\n',
    }),
    expect: ['E-MAP-RESERVED-DEST'],
    exit: 2,
  },
  {
    name: 'strip-suffix whose recursion produces sub/.claude/settings.local.json',
    because: 'C-39a — the any-segment property, proved by route rather than by name',
    ...pack([{ op: 'strip-suffix', from: 'kit/', to: 'sub/.claude/', suffix: '.tpl' }], {
      'kit/settings.local.tpl.json': '{}\n',
    }),
    expect: ['E-MAP-RESERVED-DEST'],
    exit: 2,
  },
];

/* ── T-1204: class 2, by name ────────────────────────────────────────── */

/**
 * The execution surfaces. `.github/workflows/` is the sharpest: a workflow
 * **runs attacker-chosen code on the next push, with `GITHUB_TOKEN`** —
 * so a pack that could write one would have a route to the repository's
 * own credentials.
 */
const CLASS_TWO: Fixture[] = [
  ['.github/workflows/ci.yml', 'C-31 — runs attacker code on the next push, with GITHUB_TOKEN'],
  ['.vscode/tasks.json', 'C-31 — an editor task runs on open'],
  ['.envrc', 'C-31 — direnv executes it on cd'],
  ['.mcp.json', 'C-41 — MCP servers are command lines the runtime launches'],
  ['.gitlab-ci.yml', 'C-41'],
  ['Jenkinsfile', 'C-41'],
  ['azure-pipelines.yml', 'C-41'],
  ['bitbucket-pipelines.yml', 'C-41'],
  ['GNUmakefile', 'C-41'],
  ['.justfile', 'C-41'],
].map(([to, because]) =>
  reserved(`copy to ${to}`, because as string, [{ op: 'copy', from: 'src/a.md', to }]),
);

/* ── T-1205: the any-segment property ────────────────────────────────── */

/**
 * **Nested deliberately**, so each fixture tests the *quantifier* as well
 * as the membership. Under v2.3's first-segment scoping
 * `docs/.git/hooks/pre-commit` passed; nested `node_modules/` is real
 * under npm workspaces, and `verify`'s scan skips it at any depth.
 */
const ANY_SEGMENT: Fixture[] = [
  ['docs/.git/hooks/pre-commit', 'C-33 — the any-segment property; under v2.3 first-segment scoping this passed'],
  ['pkg/node_modules/.bin/foo', 'C-39d — nested node_modules is real under npm workspaces'],
  ['x/.circleci/config.yml', 'C-41, C-39d — nested, so the fixture tests the quantifier too'],
  ['x/.devcontainer/devcontainer.json', 'C-41, C-39d'],
].map(([to, because]) =>
  reserved(`copy to ${to}`, because as string, [{ op: 'copy', from: 'src/a.md', to }]),
);

for (const f of [...BY_NAME, ...BY_ROUTE, ...CLASS_TWO, ...ANY_SEGMENT]) {
  test(`fixture: ${f.name}`, async () => {
    await assertFixture(f);
  });
}
