/**
 * The two-pass argv walk, from outside. T-0110.
 *
 * The unit tests in `src/cli/flags.test.ts` cover the parser; these cover
 * the claims that are about **the surface a user meets** — the command's
 * position, and the one failure mode the two-pass shape exists to prevent.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EXIT, runCli, withTempDir } from '../harness/cli.js';
import { parsePass1, parsePass2 } from '../../dist/index.js';

const codes = (r: { bag: { items: readonly { code: string }[] } }): string[] =>
  r.bag.items.map((d) => d.code);

// Q-63. The group is the first positional; the command is the SECOND.
test('the command is the second positional, after the group', async () => {
  await withTempDir(async (dir) => {
    const good = await runCli(['harness', 'validate'], dir);
    assert.ok(!/is not a lintel harness command/.test(good.stderr), 'validate must resolve');

    // The same word in the FIRST slot is a group, not a command.
    const swapped = await runCli(['validate', 'harness'], dir);
    assert.equal(swapped.code, EXIT.userFault);
    assert.match(swapped.stderr, /usage: lintel harness/);
  });
});

// The failure the two-pass walk exists to prevent, stated as a test.
test('a pack-declared alias never reports a false E-CLI-UNKNOWN-FLAG', () => {
  const argv = ['--calibration', 'high-floor'];

  // Pass 1 sees an unknown token and says nothing about it.
  const p1 = parsePass1(argv, 'init');
  assert.deepEqual(codes(p1), [], 'pass 1 must not judge an unknown token');
  assert.deepEqual(p1.parsed.deferred, ['--calibration']);

  // Pass 2, with the pack resolved, accepts it — and records it under the
  // parameter ID rather than the flag name.
  const p2 = parsePass2(argv, 'init', { calibration: { id: 'constraintFloor' } });
  assert.deepEqual(codes(p2), []);
  assert.deepEqual(p2.parsed.flags['set'], ['constraintFloor=high-floor']);
});

test('an undeclared flag survives pass 1 and is refused in pass 2', () => {
  const argv = ['--not-a-thing'];
  assert.deepEqual(codes(parsePass1(argv, 'validate')), []);
  assert.deepEqual(codes(parsePass2(argv, 'validate', {})), ['E-CLI-UNKNOWN-FLAG']);
});

// A known flag on the wrong command is refused rather than ignored,
// because a user who typed it believed it did something.
test('E-FLAG-NOT-PERMITTED for a known flag on the wrong command', () => {
  const r = parsePass1(['--all'], 'verify');
  assert.deepEqual(codes(r), ['E-FLAG-NOT-PERMITTED']);
  assert.match(r.bag.items[0]?.message ?? '', /validate/, 'names where it IS accepted');
});

// Q-54: the consent gate is deleted, so these two are not reserved and
// reach the general rule.
test('--accept-hooks and --accept-permissions reach E-CLI-UNKNOWN-FLAG', () => {
  for (const f of ['--accept-hooks', '--accept-permissions']) {
    assert.deepEqual(codes(parsePass2([f], 'init', {})), ['E-CLI-UNKNOWN-FLAG'], f);
  }
});

test('an alias cannot shadow a reserved flag, because reserved wins', () => {
  // A pack declaring `force` as an alias must be refused at validate time
  // (F1 US-8, E-PARAM-FLAG-INVALID). If one ever reaches the parser, the
  // reserved meaning is what applies — assert the parser does not let a
  // pack redefine `--force`.
  const p2 = parsePass2(['--force'], 'init', { force: { id: 'somethingElse' } });
  assert.deepEqual(p2.parsed.flags['force'], true, 'reserved meaning must win');
  assert.equal(p2.parsed.flags['set'], undefined);
});
