import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const manifestPath = fileURLToPath(new URL('../package.json', import.meta.url));

async function manifest(): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(manifestPath, 'utf8')) as Record<string, unknown>;
}

// Q-81. The published package declares NO runtime dependency. This is a
// requirement, not a preference: the CLI writes files into a user's
// repository, four review rounds bounded what a *pack* may do through it,
// and a runtime dependency is code inside that same boundary that no pack
// rule governs.
//
// Asserted as "empty or absent", NOT as a literal `{}` — F1 v3.0 said the
// latter and npm disagrees: `npm install` NORMALISES an empty
// `dependencies` object out of package.json. The requirement is that
// nothing is declared; both forms express it.
test('the package declares no runtime dependency', async () => {
  const m = await manifest();
  const deps = m['dependencies'];
  assert.ok(
    deps === undefined || (typeof deps === 'object' && deps !== null && Object.keys(deps).length === 0),
    `dependencies must be empty or absent, found ${JSON.stringify(deps)}`,
  );
});

// U-12. Dev dependencies are a separate and looser budget (§7.1) — but the
// build must TYPE-CHECK rather than strip, because the path brands and the
// total RecipeStep union are compile-time controls. That is only true if
// the thing in `build` is a type checker.
test('the build type-checks rather than strips', async () => {
  const m = await manifest();
  const scripts = m['scripts'] as Record<string, string>;

  // Assert the PROPERTY, not the literal command. An earlier version of
  // this test pinned `typecheck === 'tsc --noEmit'` and broke the moment a
  // second tsconfig was added — the same mistake F1 §NFR made by specifying
  // an empty `dependencies` object instead of "no runtime dependency".
  // What must hold is that the build compiles with a type checker and that
  // typecheck does so without emitting.
  assert.match(scripts['build'] ?? '', /(^|\s)tsc(\s|$)/, 'build must run tsc');
  assert.match(scripts['typecheck'] ?? '', /(^|\s)tsc(\s|$)/, 'typecheck must run tsc');
  assert.match(scripts['typecheck'] ?? '', /--noEmit/, 'typecheck must not emit');

  const dev = m['devDependencies'] as Record<string, string>;
  assert.ok('typescript' in dev, 'typescript must be a dev dependency');
  for (const bundler of ['esbuild', 'tsup', 'rollup', 'webpack', 'vite']) {
    assert.ok(!(bundler in dev), `${bundler} strips types; U-12 chose tsc`);
  }
});

// U-12 packaging half: packs/ ships, addons/ does not — add-ons are v1.1
// and nothing applies them (Q-82).
test('packs ship and addons do not', async () => {
  const m = await manifest();
  const files = m['files'] as string[];
  assert.ok(files.includes('packs'), 'packs/ must be in the published artefact');
  assert.ok(files.includes('dist'), 'dist/ must be in the published artefact');
  assert.ok(!files.includes('addons'), 'addons/ is v1.1 and must not ship');
});

test('the binary is lintel and Node 22 is the floor', async () => {
  const m = await manifest();
  assert.deepEqual(Object.keys(m['bin'] as object), ['lintel']);
  assert.equal((m['engines'] as Record<string, string>)['node'], '>=22');
  assert.equal(m['type'], 'module');
});
