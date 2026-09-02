/**
 * The op set is closed, and this asserts it **structurally** — over the
 * source text, not by importing the union. T-0403.
 *
 * *"We did not add an `exec` primitive"* and *"an `exec` primitive cannot
 * be added without somebody noticing"* are different promises, and only
 * the second survives a year of maintenance. The whole safety argument for
 * shipping arbitrary pack content into a repository is that the vocabulary
 * is finite and a reviewer of `pack info` can hold it in their head — so
 * the count is a **product property**, not an implementation detail.
 *
 * Read as source rather than imported for the same reason `brands.test.ts`
 * is: the claim is about the shape of the codebase.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const RECIPE = fileURLToPath(new URL('../../src/recipe/', import.meta.url));
const OPS_DIR = join(RECIPE, 'ops');

/** The six, restated here on purpose: a test that imported the list it is
 *  checking would pass however that list changed. */
const SIX = ['copy', 'rename', 'strip-suffix', 'rewrite-path', 'substitute', 'generate'];

test('types.ts declares exactly the six primitives', async () => {
  const src = await readFile(join(RECIPE, 'types.ts'), 'utf8');
  const block = /export const RECIPE_OPS = \[([\s\S]*?)\] as const;/.exec(src)?.[1];
  assert.ok(block, 'RECIPE_OPS must stay a literal array a reader can count');

  const declared = [...block.matchAll(/'([a-z-]+)'/g)].map((m) => m[1]);
  assert.deepEqual(declared, SIX, 'the closed set changed — this needs a superseding ADR');
});

test('the registry has one entry per primitive and no others', async () => {
  const src = await readFile(join(OPS_DIR, 'index.ts'), 'utf8');
  const block = /export const OPS[\s\S]*?^};$/m.exec(src)?.[0];
  assert.ok(block);
  const keys = [...block.matchAll(/^ {2}'?([a-z-]+)'?: \{$/gm)].map((m) => m[1]);
  assert.deepEqual(keys, SIX);
});

/**
 * No seventh op module of any name. The forbidden list is about
 * **capability**, not spelling: anything that could run a command is the
 * escape hatch US-31 refuses, whatever it is called.
 */
test('there is no exec, script, shell or run module beside the registry', async () => {
  const entries = await readdir(OPS_DIR);
  // E-05 gives each op a renderer, so per-op files are expected to appear.
  // What may never appear is a module for an op outside the closed set.
  const permitted = new Set(['index.ts', ...SIX.map((op) => `${op}.ts`)]);
  const unexpected = entries.filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts') && !permitted.has(f));
  assert.deepEqual(
    unexpected,
    [],
    'a module here that is not one of the six is a seventh primitive by another name',
  );
});

/**
 * The registry's closedness is worth nothing if a primitive can shell out
 * from inside its own implementation. Six declared ops and one
 * `child_process` import is an escape hatch with extra steps.
 */
test('nothing in the recipe layer imports a process-spawning module', async () => {
  const files: string[] = [];
  for (const e of await readdir(RECIPE, { withFileTypes: true, recursive: true })) {
    if (e.isFile() && e.name.endsWith('.ts') && !e.name.endsWith('.test.ts')) {
      files.push(join(e.parentPath, e.name));
    }
  }
  assert.ok(files.length >= 5, 'the walk must actually find the sources');

  for (const f of files) {
    const src = await readFile(f, 'utf8');
    for (const banned of ['child_process', 'node:vm', 'worker_threads', 'node:cluster']) {
      assert.equal(src.includes(`from '${banned}'`), false, `${f} imports ${banned}`);
      assert.equal(src.includes(`import('${banned}')`), false, `${f} imports ${banned}`);
    }
  }
});
