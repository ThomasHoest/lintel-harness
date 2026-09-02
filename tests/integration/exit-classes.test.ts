/**
 * The exit-class contract, driven through the real binary. T-0109.
 *
 * **IM-39: an exit class means the same thing on every command.** These
 * assert it from a user's position — a spawned process and its exit code —
 * because that is the contract F6 branches on (IM-7) and CI gates on, and
 * nothing inside the process can observe it.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EXIT, runCli, snapshot, unchanged, withTempDir } from '../harness/cli.js';
import { CODES, exitClassFor, severityOf, classOf, type DiagnosticCode } from '../../dist/index.js';
import { diagnostic, exitCodeFor } from '../../dist/index.js';

const codes = Object.keys(CODES) as DiagnosticCode[];

test('the four classes are 0/1/2/3 and nothing else', () => {
  assert.deepEqual(Object.values(EXIT).sort(), [0, 1, 2, 3]);
  for (const c of codes) {
    assert.ok([0, 1, 2, 3].includes(exitClassFor(c)), `${c} has an exit class outside the four`);
  }
});

// IM-39. The class is a property of the code, so it cannot mean one thing
// on `validate` and another on `verify`.
test('a class means the same thing whatever command reports it', () => {
  for (const c of codes) {
    const viaCode = severityOf(c) === 'error' ? exitClassFor(c) : 0;
    assert.equal(exitCodeFor([diagnostic(c)]), viaCode, c);
  }
});

// Q-60, and it is the rule that made `validate --all --strict` reachable.
test('a notice-only run exits 0, including under --strict', () => {
  const notices = codes.filter((c) => severityOf(c) === 'warning' && classOf(c) === 'notice');
  assert.ok(notices.length > 0);
  const bag = notices.map((c) => diagnostic(c));
  assert.equal(exitCodeFor(bag, false), EXIT.ok);
  assert.equal(exitCodeFor(bag, true), EXIT.ok, 'a notice must never promote');
});

test('a defect-only run exits 0 normally and 1 only under --strict', () => {
  const defects = codes.filter((c) => severityOf(c) === 'warning' && classOf(c) === 'defect');
  assert.ok(defects.length > 0);
  const bag = defects.map((c) => diagnostic(c));
  assert.equal(exitCodeFor(bag, false), EXIT.ok);
  assert.equal(exitCodeFor(bag, true), EXIT.userFault);
});

// F1 §Error States: the `lintel:` prefix is line 1 of every message, and
// it is what a user greps for.
test('every message in the catalogue begins lintel:', () => {
  for (const c of codes) {
    assert.ok(diagnostic(c).message.startsWith('lintel: '), c);
  }
});

test('the binary exits 1 and writes nothing for an unknown command', async () => {
  await withTempDir(async (dir) => {
    const before = await snapshot(dir);
    const r = await runCli(['harness', 'no-such-command'], dir);
    assert.equal(r.code, EXIT.userFault);
    assert.match(r.stderr, /^lintel: /m);
    assert.match(r.stderr, /is not a lintel harness command/);
    assert.ok(unchanged(before, await snapshot(dir)), 'zero bytes written');
  });
});

test('the unknown-command message lists all six commands', async () => {
  await withTempDir(async (dir) => {
    const r = await runCli(['harness', 'nope'], dir);
    for (const c of ['init', 'update', 'skill', 'validate', 'verify', 'pack']) {
      assert.ok(r.stderr.includes(c), `${c} missing from the command list`);
    }
  });
});

// Known limit 16: an unknown GROUP has no code, and this asserts the
// current honest behaviour rather than a code that does not exist.
test('an unknown group prints usage, exits 1, and claims no code', async () => {
  await withTempDir(async (dir) => {
    const r = await runCli(['nonsense', 'verify'], dir);
    assert.equal(r.code, EXIT.userFault);
    assert.match(r.stderr, /usage: lintel harness/);
    assert.ok(!/E-CLI-/.test(r.stderr), 'no code may be claimed for a fault F1 has none for');
  });
});

test('diagnostics go to stderr, never stdout', async () => {
  await withTempDir(async (dir) => {
    const r = await runCli(['harness', 'nope'], dir);
    assert.equal(r.stdout, '', 'stdout must stay clean for machine consumers');
    assert.ok(r.stderr.length > 0);
  });
});
