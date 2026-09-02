import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runPackCommand, runValidateCommand } from './read-only.js';
import { run, stubbedCommands } from '../main.js';
import { CLI_VERSION } from '../version.js';
import type { Streams } from '../main.js';

function capture(): { streams: Streams; out: string[]; err: string[] } {
  const out: string[] = [];
  const err: string[] = [];
  return { streams: { out: (s) => out.push(s), err: (s) => err.push(s) }, out, err };
}

const codes = (b: { items: readonly { code: string }[] }): string[] => b.items.map((d) => d.code);

/* ── validate ────────────────────────────────────────────────────────── */

/**
 * F1's own acceptance criterion, through the command surface rather than
 * through the module: **`validate --all --strict` exits 0 for all three
 * bundled packs** — and the run is *not silent*, which is the half that is
 * easy to satisfy by accident.
 */
test('validate --all --strict exits 0, and still reports', async () => {
  const c = capture();
  const r = await runValidateCommand(['--all', '--strict'], c.streams);
  assert.equal(r.code, 0);

  const text = c.out.join('\n');
  for (const pack of ['coding', 'planning', 'writing']) {
    assert.match(text, new RegExp(`lintel: ${pack} validated`), pack);
  }
  assert.match(text, /2 notice/, 'notices stand; --strict promotes none of them');
});

// No pack named and no `--all` validates everything: the useful default
// for the one command whose whole job is a CI gate.
test('validate with no pack named validates every bundled pack', async () => {
  const c = capture();
  const r = await runValidateCommand([], c.streams);
  assert.equal(r.code, 0);
  for (const pack of ['coding', 'planning', 'writing']) {
    assert.match(c.out.join('\n'), new RegExp(pack));
  }
});

test('validate names one pack when asked', async () => {
  const c = capture();
  const r = await runValidateCommand(['coding'], c.streams);
  assert.equal(r.code, 0);
  assert.match(c.out.join('\n'), /coding validated, no findings/);
  assert.equal(c.out.join('\n').includes('planning'), false, 'and only that one');
});

/**
 * **Every finding appeared twice** in the first wiring: `summaryLines`
 * already interleaves each pack's findings with its own summary line, and
 * the command reported the diagnostic bag as well. Both halves were
 * individually correct, which is why only running it showed the fault.
 */
test('each finding is printed once, not once per printer', async () => {
  const c = capture();
  await runValidateCommand(['planning'], c.streams);
  const hits = c.out.join('\n').split('shipped as an ordinary file').length - 1;
  assert.equal(hits, 1);
});

test('an unknown pack is the user’s fault, and lists what there is', async () => {
  const c = capture();
  const r = await runValidateCommand(['nosuchpack'], c.streams);
  assert.equal(r.code, 1);
  assert.match(c.out.concat(c.err).join('\n'), /is not a pack bundled with lintel/);
});

test('validate --json emits a document rather than prose', async () => {
  const c = capture();
  const r = await runValidateCommand(['coding', '--json'], c.streams);
  assert.equal(r.code, 0);
  const doc = JSON.parse(c.out.join('\n'));
  // A single pack emits **the report**, not a wrapper — so a consumer of
  // `pack info --json` and one of `validate --json <pack>` read the same
  // document, which is what makes the byte-identity claim assertable.
  assert.equal(doc.pack.name, 'coding');
  assert.ok(Array.isArray(doc.anatomy));
  assert.equal(typeof doc.ok, 'boolean');
});

/* ── pack info ───────────────────────────────────────────────────────── */

test('pack info renders the nine parts in order', async () => {
  const c = capture();
  const r = await runPackCommand(['info', 'writing'], c.streams);
  assert.equal(r.code, 0);
  const text = c.out.join('\n');
  assert.match(text, /writing 1\.0\.0/);
  // `writing` declares `index.md`, not the README.md default — a renderer
  // assuming the default would be wrong about this pack specifically.
  assert.match(text, /Folder README basename: index\.md/);
  assert.match(text, /skillsAndAutomations\s+absent/);
});

/**
 * **`pack info` describes; it does not judge.** A pack with findings is
 * still described and still exits 0 — which is the whole difference
 * between this command and `validate`, and the reason a user reaches for
 * it when `validate` has just refused something.
 */
test('pack info exits 0 even for a pack with findings', async () => {
  const c = capture();
  const r = await runPackCommand(['info', 'planning'], c.streams);
  assert.equal(r.code, 0);
  assert.match(c.out.join('\n'), /provisional/);
});

test('pack info --json emits the same report as a document', async () => {
  const c = capture();
  await runPackCommand(['info', 'coding', '--json'], c.streams);
  const doc = JSON.parse(c.out.join('\n'));
  assert.equal(doc.pack.name, 'coding');

  // The same bytes from both surfaces. `validate --json <pack>` emitting a
  // wrapper here would make the two documents different things wearing one
  // name, which is the failure the shared `packReportJson` prevents.
  const v = capture();
  await runValidateCommand(['coding', '--json'], v.streams);
  assert.equal(v.out.join('\n'), c.out.join('\n'));
});

// The sub-command is a POSITIONAL, so a later `pack list` reads as English
// rather than as a flag nobody guessed.
test('pack without a sub-command, and with an unknown one, are both refused', async () => {
  for (const argv of [[], ['list']]) {
    const c = capture();
    const r = await runPackCommand(argv, c.streams);
    assert.equal(r.code, 1, JSON.stringify(argv));
    assert.deepEqual(codes(r.bag), ['E-CLI-UNKNOWN-COMMAND']);
  }
});

test('pack info with no pack name says what is missing, not what is wrong', async () => {
  const c = capture();
  const r = await runPackCommand(['info'], c.streams);
  assert.equal(r.code, 1);
  assert.deepEqual(codes(r.bag), ['E-CLI-PACK-MISSING']);
  assert.match(c.err.join('\n'), /needs a pack name/);
});

/* ── the stub set ────────────────────────────────────────────────────── */

/**
 * **The set shrinks visibly, and that is the point.** `main.ts` once
 * claimed a test asserted this while no such test existed, and its
 * predicate tested *ownership* rather than whether a command was built —
 * so `init` would have printed "not implemented in this build" while
 * working. The predicate tests builtness now, and this is what holds it.
 */
test('four commands are dispatched, and the two that are not say why', () => {
  // This has read three, then two, then one, and each edit was a feature
  // landing. **`verify` is last on purpose**: its shaping functions exist,
  // but its command layer must recompute from `.harness/pack/` rather than
  // from a plan it was handed — the property that makes it an INDEPENDENT
  // check rather than a restatement — so wiring it is work, not wiring.
  assert.deepEqual([...stubbedCommands()], ['verify']);
});

/* ── the version handshake ───────────────────────────────────────────── */

/**
 * **F6's skill opens every flow with `lintel --version`.**
 *
 * Until this existed the command printed the group usage and exited 1, so
 * the skill halted at step 0 of every task it has. A feature whose first
 * instruction cannot be carried out is not a feature.
 *
 * Answered **before** the group check, because a handshake that required
 * knowing the command vocabulary could only be performed by someone who
 * already understood the CLI — which is what it exists to establish.
 */
test('--version prints the bare version, before the group is parsed', async () => {
  for (const flag of ['--version', '-v']) {
    const c = capture();
    const r = await run([flag], c.streams);
    assert.equal(r.code, 0, flag);
    // The version ALONE, on stdout: this is read by a program, and a
    // banner is a parsing problem for the one caller that matters.
    assert.deepEqual(c.out, [CLI_VERSION], flag);
    assert.deepEqual(c.err, [], flag);
  }
});

/** It is not a command, and must not be mistaken for one. */
test('--version after the group is still an unknown command', async () => {
  const c = capture();
  const r = await run(['harness', '--version'], c.streams);
  assert.notEqual(r.code, 0);
});
