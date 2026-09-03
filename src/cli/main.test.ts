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

/**
 * **The remedy that could not work, instance six.**
 *
 * `E-CLI-UNKNOWN-COMMAND` has always ended `→ lintel harness --help`, and
 * that command produced the same error — whose remedy was to run it again.
 * The five earlier instances of this class were fixed by correcting the
 * message; this one is fixed by making the message true, so the test that
 * guards it asserts **both halves together**: the remedy is offered, and
 * the thing it names works.
 *
 * Asserting them apart is what let this survive — the structural guard
 * checks that a remedy names a real command, and `--help` *is* real at the
 * top level. It was only unreachable in the command slot.
 */
test('every spelling of help works in the command slot, and the remedy says so', async () => {
  for (const spelling of ['--help', '-h', 'help']) {
    const r = await capture(['harness', spelling]);
    assert.equal(r.code, 0, `${spelling} is help, not a fault`);
    assert.match(r.out, /usage: lintel harness <command>/, spelling);
    assert.equal(r.err, '', `${spelling} must not write to stderr`);
    for (const c of COMMANDS) assert.ok(r.out.includes(c), `${spelling} lists ${c}`);
  }
});

test('the unknown-command remedy names a command that actually runs', async () => {
  const bad = await capture(['harness', 'nosuchcommand']);
  assert.notEqual(bad.code, 0);

  // Pull the remedy out of the message rather than restating it, so this
  // follows the catalogue if the wording changes.
  const remedy = /→ lintel harness (\S+)/.exec(bad.err)?.[1];
  assert.ok(remedy, `no remedy found in: ${bad.err}`);

  const offered = await capture(['harness', remedy]);
  assert.equal(offered.code, 0, `the remedy "lintel harness ${remedy}" must work`);
});

/**
 * **Instance seven, and the one that did work: `--help` on a command.**
 *
 * `E-CLI-FLAG-UNKNOWN`'s remedy is `→ lintel harness <command> --help`, and
 * before this it worked for **none** of the six. The case that makes this
 * test non-negotiable is `validate` and `verify`, where `--help` parsed as
 * nothing and the command **ran** — asking `validate` what it does
 * validated a pack and exited 0. Help that silently does the work is worse
 * than help that errors, because nothing tells the user it happened.
 *
 * Quantified over `COMMANDS` rather than a written list, so a seventh
 * command cannot be added without answering `--help`.
 */
test('every command answers --help, and none of them does its work instead', async () => {
  for (const c of COMMANDS) {
    for (const spelling of ['--help', '-h']) {
      const r = await capture(['harness', c, spelling]);
      assert.equal(r.code, 0, `${c} ${spelling} must be help, not a fault`);
      assert.match(r.out, new RegExp(`usage: lintel harness ${c} `), `${c} ${spelling}`);
      assert.match(r.out, /Flags:/, `${c} ${spelling} lists its flags`);
      assert.equal(r.err, '', `${c} ${spelling} must not write to stderr`);
    }
  }
});

/**
 * A literal `--help` passed **as a value** is a value.
 *
 * The scan steps over the token after a value-taking flag. Without this,
 * `--set x=--help` — and worse, `--set` followed by `--help` — would print
 * usage and exit 0 while the user believed they had run an apply.
 */
test('--help in a value position is not a request for help', async () => {
  const r = await capture(['harness', 'init', 'coding', '--set', 'x=--help']);
  assert.ok(!/usage: lintel harness init/.test(r.out), 'a value must not trigger help');
});
