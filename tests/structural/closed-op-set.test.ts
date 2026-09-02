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

/**
 * **Every command and flag a remedy names must exist.**
 *
 * This project has now paid five times for one fault, in five different
 * places:
 *
 *   v2.9  `E-JOURNAL-PRESENT` said `init --rollback` unconditionally,
 *         which after a crashed `update` names a command that answers
 *         `E-ALREADY-APPLIED`.
 *   v5.5  `W-ROLLBACK-KEPT` said "it has changed" on a row where nothing
 *         had.
 *   v5.6  `E-UPDATE-PARAM-UNANSWERED` said `update --set`, a flag the
 *         command refuses.
 *   v5.9  `E-TARGET-RACE` and `E-WRITE-FAILED` hardcoded `init`.
 *   v6.3  `E-UPDATE-AVAILABLE` said `→ lintel harness update` **to see
 *         what would change** — and `update` writes. A user who followed
 *         it performed the apply they were inspecting.
 *
 * Every one was found by **building the thing that raises the code**, and
 * none by reading. So the property is asserted here instead: a remedy line
 * naming a command names a **real** command, and a remedy naming a flag
 * names one that command **accepts**.
 *
 * It cannot catch a remedy that is merely wrong about the world — v5.5's
 * was a sentence, not a command — but four of the five were exactly this
 * shape, and the fifth was worse than the four.
 */
test('every command and flag a remedy names is real and accepted', async () => {
  const { MESSAGES, COMMANDS, accepts } = await import('../../dist/index.js');

  const known = new Set<string>(COMMANDS);
  const failures: string[] = [];

  for (const [code, lines] of Object.entries(MESSAGES)) {
    for (const line of lines as readonly string[]) {
      // **Remedy lines only** — the ones beginning `→`, which are the
      // ones a user is told to type. Prose elsewhere in a message may
      // mention a command without offering it: `E-RECIPE-PRIMITIVE-UNKNOWN`
      // says *"a new primitive is a change to the CLI"*, and reading that
      // as an invocation is how a guard produces a false finding on its
      // first run — which this one did.
      if (!line.includes('→')) continue;
      for (const m of line.matchAll(/lintel harness ([a-z]+)((?:\s+--[a-z-]+)*)/g)) {
        const command = m[1] as string;
        // `{command}` is a slot, resolved by the emitter from the journal.
        if (command === 'command') continue;
        if (!known.has(command)) {
          failures.push(`${code}: names "${command}", which is not a command`);
          continue;
        }
        for (const flag of (m[2] ?? '').split(/\s+/).filter(Boolean)) {
          const name = flag.slice(2);
          if (!accepts(command as never, name)) {
            failures.push(`${code}: names "${command} ${flag}", which that command refuses`);
          }
        }
      }
    }
  }

  assert.deepEqual(
    failures,
    [],
    `a remedy that cannot work is worse than none:\n  ${failures.join('\n  ')}`,
  );
});
