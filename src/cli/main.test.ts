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

/**
 * **The set shrinks, and this test is how that is visible.**
 *
 * It said five when `init` landed, three when `validate` and `pack` were
 * wired, and two now that `skill install` is — and it *failed* on the way
 * each time, which is the whole value: a set that changed without anything
 * saying so is how `main.ts` came to claim two built commands were
 * unimplemented.
 */
test('five commands are dispatched, and only verify remains', () => {
  const stubs = stubbedCommands();
  for (const built of ['init', 'validate', 'pack', 'skill', 'update'] as const) {
    assert.ok(!stubs.includes(built), `${built} is dispatched`);
  }
  assert.deepEqual([...stubs], ['verify']);
  assert.equal(stubs.length, COMMANDS.length - 5);
});

test('every remaining stub is a command nothing dispatches yet', () => {
  // One left, and it is the interesting one. `verify`'s shaping functions
  // exist, but its command layer must recompute from
  // `.harness/pack/` rather than from a plan it was handed — the property
  // that makes it an *independent* check rather than a restatement — so
  // wiring it would be work, not wiring.
  for (const c of stubbedCommands()) {
    assert.ok(OWNER[c] !== undefined, `${c} must still have an owner`);
  }
});

test('the last stubbed command exits 1 and writes nothing to stdout', async () => {
  // `update` used to be this test's subject and is now dispatched, so the
  // subject moved to `verify` — which is the fifth time this file has been
  // edited by a feature landing, and each edit is the set announcing
  // itself rather than drifting.
  const r = await capture(['harness', 'verify']);
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
