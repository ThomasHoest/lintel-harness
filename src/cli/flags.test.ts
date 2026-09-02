import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RESERVED_FLAGS, accepts, commandsAccepting, parsePass1, parsePass2 } from './flags.js';
import { COMMANDS } from './surface.js';

const codes = (r: { bag: { items: readonly { code: string }[] } }): string[] =>
  r.bag.items.map((d) => d.code);

// T-0112. Nine, global rather than per-command.
test('the reserved list is exactly the eight names F1 fixes', () => {
  assert.deepEqual(
    [...RESERVED_FLAGS].sort(),
    ['all', 'dry-run', 'force', 'json', 'rollback', 'scaffold', 'set', 'strict'],
  );
});

// Q-54. The consent gate is deleted, so these are NOT reserved and reach
// E-CLI-UNKNOWN-FLAG by the general rule.
test('--accept-permissions and --accept-hooks are not reserved', () => {
  for (const f of ['accept-permissions', 'accept-hooks']) {
    assert.equal((RESERVED_FLAGS as readonly string[]).includes(f), false, f);
  }
});

// The whole reason the walk is two passes.
test('pass 1 defers an unrecognised token and never reports it', () => {
  const r = parsePass1(['--calibration', 'high-floor'], 'init');
  assert.deepEqual(r.parsed.deferred, ['--calibration']);
  assert.deepEqual(codes(r), [], 'pass 1 must not judge an unknown token');
});

test('pass 2 resolves a pack alias to its parameter id, never to the flag name', () => {
  const argv = ['--calibration', 'high-floor'];
  const p1 = parsePass1(argv, 'init');
  assert.deepEqual(p1.parsed.deferred, ['--calibration']);
  // Pass 1 also parked the VALUE as a positional — which is why pass 2
  // re-parses the original argv rather than pass 1's leftovers.
  assert.deepEqual(p1.parsed.positionals, ['high-floor']);
  const p2 = parsePass2(argv, 'init', { calibration: { id: 'constraintFloor' } });
  assert.deepEqual(p2.parsed.positionals, [], 'the value is no longer a positional');
  assert.deepEqual(p2.parsed.flags['set'], ['constraintFloor=high-floor']);
  assert.deepEqual(p2.parsed.deferred, []);
  assert.deepEqual(codes(p2), [], 'a declared alias must not report as unknown');
});

test('an alias merges with an explicit --set rather than replacing it', () => {
  const argv = ['--set', 'projectName=Acme', '--calibration', 'near-zero-floor'];
  parsePass1(argv, 'init');
  const p2 = parsePass2(argv, 'init', { calibration: { id: 'constraintFloor' } });
  assert.deepEqual(p2.parsed.flags['set'], ['projectName=Acme', 'constraintFloor=near-zero-floor']);
});

test('only pass 2 reports an unknown flag, and only when no alias claims it', () => {
  const p1 = parsePass1(['--nonsense'], 'validate');
  assert.deepEqual(codes(p1), []);
  const p2 = parsePass2(['--nonsense'], 'validate', {});
  assert.deepEqual(codes(p2), ['E-CLI-UNKNOWN-FLAG']);
});

// Q-54, end to end.
test('--accept-hooks reaches E-CLI-UNKNOWN-FLAG', () => {
  const p2 = parsePass2(['--accept-hooks'], 'init', {});
  assert.deepEqual(codes(p2), ['E-CLI-UNKNOWN-FLAG']);
});

// A known flag on the wrong command is refused, not ignored: a user who
// typed it believed it did something.
test('a known flag on the wrong command is E-FLAG-NOT-PERMITTED, in pass 1', () => {
  const r = parsePass1(['--all'], 'verify');
  assert.deepEqual(codes(r), ['E-FLAG-NOT-PERMITTED']);
  assert.ok(r.bag.items[0]?.message.includes('validate'), 'the message names where it is accepted');
});

test('a value flag with no value is E-CLI-FLAG-VALUE-MISSING, including before another flag', () => {
  assert.deepEqual(codes(parsePass1(['--set'], 'init')), ['E-CLI-FLAG-VALUE-MISSING']);
  assert.deepEqual(codes(parsePass1(['--set', '--force'], 'init')), ['E-CLI-FLAG-VALUE-MISSING']);
});

test('--flag=value is one token, and repeatable flags accumulate', () => {
  const r = parsePass1(['--set=a=1', '--set', 'b=2', '--scaffold=x'], 'init');
  assert.deepEqual(r.parsed.flags['set'], ['a=1', 'b=2']);
  assert.deepEqual(r.parsed.flags['scaffold'], ['x']);
});

test('boolean flags are true, and positionals survive', () => {
  const r = parsePass1(['coding', '--force'], 'init');
  assert.deepEqual(r.parsed.positionals, ['coding']);
  assert.equal(r.parsed.flags['force'], true);
});

test('the accepts table is total over the six commands', () => {
  for (const c of COMMANDS) {
    assert.doesNotThrow(() => accepts(c, 'json'), c);
  }
  assert.deepEqual(commandsAccepting('all'), ['validate']);
  assert.deepEqual(commandsAccepting('dry-run'), ['update']);
});

// --dry-run is reserved although no F1 command accepts it (T-0112).
test('--dry-run is reserved but only update accepts it', () => {
  assert.ok((RESERVED_FLAGS as readonly string[]).includes('dry-run'));
  assert.equal(accepts('validate', 'dry-run'), false);
  assert.deepEqual(codes(parsePass1(['--dry-run'], 'validate')), ['E-FLAG-NOT-PERMITTED']);
});

// A boolean parameter's alias is a bare flag; every other type's takes a
// value. Both record under the parameter ID.
test('a boolean alias is a bare flag and still records under the id', () => {
  const p2 = parsePass2(['--verbose'], 'init', { verbose: { id: 'chatty', arity: 'boolean' } });
  assert.deepEqual(p2.parsed.flags['set'], ['chatty=true']);
  assert.deepEqual(codes(p2), []);
});
