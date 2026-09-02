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
test('every command is dispatched, and the stub set is empty', () => {
  // **The last edit this test will need.** It has read five, then three,
  // then two, then one, and each change was a feature landing — which is
  // the whole reason it exists: a set that changed without anything saying
  // so is how `main.ts` came to claim two built commands were
  // unimplemented, while its predicate tested *ownership* rather than
  // whether a command was built.
  assert.deepEqual([...stubbedCommands()], []);
  assert.equal(stubbedCommands().length, 0, `${COMMANDS.length} commands, none stubbed`);
});

/**
 * **Nothing reaches the stub note any more**, so the note itself is dead
 * code — and `main.ts` says its block can go when this set empties. Kept
 * as an assertion rather than deleted with it: a seventh command added
 * without a dispatch would land back on the note, and this is what would
 * say so.
 */
test('no command reaches the stub note', async () => {
  for (const c of COMMANDS) {
    const r = await capture(['harness', c]);
    assert.equal(
      r.err.includes('is not implemented in this build'),
      false,
      `${c} still reaches the stub note`,
    );
  }
});

test('init dispatches: it reaches its own diagnostics rather than the stub note', async () => {
  // The whole point of the wiring. An unknown pack is `init`'s
  // `E-CLI-UNKNOWN-PACK`, which the stub note could never produce.
  const r = await capture(['harness', 'init', 'no-such-pack']);
  assert.ok(!/is not implemented in this build/.test(r.err), r.err);
  assert.match(r.err, /is not a pack bundled with lintel/);
  assert.equal(r.code, 1, 'a user typed a name and can retype it');
});
