import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import { run, stubbedCommands } from './main.js';
import { COMMANDS, OWNER } from './surface.js';

/**
 * The stub set, asserted so it **shrinks visibly**.
 *
 * `main.ts` has claimed since T-0106 that *"the stub set is asserted by a
 * test"*. It was not: no test named `stubbedCommands`, so nothing noticed
 * that `isStub` tested **ownership** rather than **whether the command was
 * built** — a table that agreed with a documentation table instead of with
 * the build. F2 is the first feature that could have been printed as
 * unimplemented while working. The claim is true from here.
 */

const capture = async (argv: readonly string[], cwd = tmpdir()) => {
  const out: string[] = [];
  const err: string[] = [];
  const r = await run(argv, { out: (s) => out.push(s), err: (s) => err.push(s) }, cwd);
  return { ...r, out: out.join('\n'), err: err.join('\n') };
};

test('init is no longer a stub, and the set has shrunk to five', () => {
  const stubs = stubbedCommands();
  assert.ok(!stubs.includes('init'), 'F2 landed it');
  assert.deepEqual([...stubs], ['update', 'skill', 'validate', 'verify', 'pack']);
  assert.equal(stubs.length, COMMANDS.length - 1, 'exactly one command has left the set');
});

test('every remaining stub is a command nothing dispatches yet', () => {
  // Two different reasons live in this set and both are honest: `update`
  // and `skill` are unbuilt features, while `validate`, `verify` and
  // `pack` have command modules that `run` does not call yet.
  for (const c of stubbedCommands()) {
    assert.ok(OWNER[c] !== undefined, `${c} must still have an owner`);
  }
});

test('a stubbed command still exits 1 and writes nothing to stdout', async () => {
  const r = await capture(['harness', 'update']);
  assert.equal(r.code, 1);
  assert.match(r.err, /is not implemented in this build/);
  assert.equal(r.out, '', 'stdout stays clean for machine consumers');
});

test('init dispatches: it reaches its own diagnostics rather than the stub note', async () => {
  // The whole point of the wiring. An unknown pack is `init`'s
  // `E-CLI-UNKNOWN-PACK`, which the stub note could never produce.
  const r = await capture(['harness', 'init', 'no-such-pack']);
  assert.ok(!/is not implemented in this build/.test(r.err), r.err);
  assert.match(r.err, /is not a pack bundled with lintel/);
  assert.equal(r.code, 1, 'a user typed a name and can retype it');
});
