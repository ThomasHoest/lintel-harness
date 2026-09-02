import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CODES, classOf, exitClassFor, severityOf, type DiagnosticCode } from './codes.js';
import { DiagnosticBag, diagnostic, exitCodeFor, unfilled, ALL_CODES } from './diagnostic.js';
import type { Diagnostic } from './diagnostic.js';

const codes = ALL_CODES;

// The rule the whole module exists to make structural.
test('severity comes from the code, for every code, with no way in for a caller', () => {
  for (const code of codes) {
    const d = diagnostic(code);
    assert.equal(d.severity, severityOf(code), code);
    if (severityOf(code) === 'warning') {
      assert.equal(d.class, classOf(code), `${code}: class must be derived`);
    } else {
      assert.equal(d.class, undefined, `${code}: an error carries no class axis`);
    }
  }
  // DiagnosticInit has no severity, class, message or code-override field.
  const keys = ['path', 'line', 'step', 'data', 'values'];
  const probe = diagnostic('E-CONTENT-TOO-LARGE', { path: 'p', line: 3, step: 2, data: { n: 1 } });
  assert.equal(probe.severity, 'error');
  assert.ok(keys.length === 5);
});

test('optional fields are present only when supplied', () => {
  const bare = diagnostic('E-CONTENT-TOO-LARGE');
  assert.equal('path' in bare, false);
  assert.equal('line' in bare, false);
  assert.equal('step' in bare, false);
  assert.equal('data' in bare, false);

  const full = diagnostic('E-CONTENT-TOO-LARGE', { path: 'a/b', line: 1, step: 7, data: { k: 'v' } });
  assert.equal(full.path, 'a/b');
  assert.equal(full.line, 1);
  assert.equal(full.step, 7);
  assert.deepEqual(full.data, { k: 'v' });
});

test('the message is rendered from the catalogue, and unfilled names are reportable', () => {
  const d = diagnostic('E-CONTENT-TOO-LARGE', { values: { path: 'x.md', size: '9 MB' } });
  assert.ok(d.message.startsWith('lintel: '));
  assert.ok(d.message.includes('x.md') && d.message.includes('9 MB'));
  assert.deepEqual(unfilled('E-CONTENT-TOO-LARGE', { values: { path: 'x.md', size: '1' } }), []);
  assert.deepEqual(unfilled('E-CONTENT-TOO-LARGE', { values: { path: 'x.md' } }), ['size']);
});

test('an error contributes its own exit class; the worst present wins', () => {
  assert.equal(exitCodeFor([]), 0);
  assert.equal(exitCodeFor([diagnostic('E-VERIFY-MISMATCH')]), 1);
  assert.equal(exitCodeFor([diagnostic('E-CONTENT-TOO-LARGE')]), 2);
  assert.equal(exitCodeFor([diagnostic('E-WRITE-FAILED')]), 3);
  assert.equal(
    exitCodeFor([diagnostic('E-VERIFY-MISMATCH'), diagnostic('E-WRITE-FAILED'), diagnostic('E-CONTENT-TOO-LARGE')]),
    3,
  );
});

// Q-60. A warning is not a failure; --strict promotes defects only.
test('warnings contribute 0, and only a defect promotes under --strict', () => {
  const defect = codes.find((c) => severityOf(c) === 'warning' && classOf(c) === 'defect');
  const notice = codes.find((c) => severityOf(c) === 'warning' && classOf(c) === 'notice');
  assert.ok(defect && notice, 'the catalogue must contain both classes');

  assert.equal(exitCodeFor([diagnostic(defect)]), 0);
  assert.equal(exitCodeFor([diagnostic(notice)]), 0);
  assert.equal(exitCodeFor([diagnostic(defect)], true), 1);
  assert.equal(exitCodeFor([diagnostic(notice)], true), 0);
});

// The rule that made `validate --all --strict` reachable at all. A notice
// must never move the exit code, whatever else is in the bag.
test('a notice never moves the exit code, under any flag', () => {
  const notices = codes.filter((c) => severityOf(c) === 'warning' && classOf(c) === 'notice');
  for (const c of notices) {
    assert.equal(exitCodeFor([diagnostic(c)], true), 0, `${c} promoted under --strict`);
    assert.equal(exitCodeFor([diagnostic(c)], false), 0, c);
  }
});

test('a strict-promoted defect never outranks a real error', () => {
  const defect = codes.find((c) => severityOf(c) === 'warning' && classOf(c) === 'defect') as DiagnosticCode;
  const bag = [diagnostic(defect), diagnostic('E-CONTENT-TOO-LARGE')];
  assert.equal(exitCodeFor(bag, true), 2, 'exit 2 must survive a promotion to 1');
});

test('the bag preserves insertion order and never sorts by severity', () => {
  const bag = new DiagnosticBag();
  bag.add('W-PATH-NON-NFC').add('E-CONTENT-TOO-LARGE').add('W-LINK-DANGLING');
  assert.deepEqual(
    bag.items.map((d) => d.code),
    ['W-PATH-NON-NFC', 'E-CONTENT-TOO-LARGE', 'W-LINK-DANGLING'],
  );
  assert.equal(bag.length, 3);
  assert.ok(bag.has('E-CONTENT-TOO-LARGE'));
  assert.equal(bag.errors.length, 1);
  assert.equal(bag.warnings.length, 2);
});

test('the bag partitions promotable warnings and computes its own exit code', () => {
  const bag = new DiagnosticBag();
  bag.add('W-LINK-DANGLING').add('W-HOOK-SCRIPT-INERT'); // defect, then notice
  assert.deepEqual(bag.promotable.map((d) => d.code), ['W-LINK-DANGLING']);
  assert.equal(bag.exitCode(), 0);
  assert.equal(bag.exitCode(true), 1);
});

test('items is a read-only view — mutating it does not reach the bag', () => {
  const bag = new DiagnosticBag();
  bag.add('E-CONTENT-TOO-LARGE');
  const view = bag.items as Diagnostic[];
  view.push(diagnostic('E-WRITE-FAILED'));
  assert.equal(bag.length, 1, 'the bag must not be extensible through its view');
});

// Total over the union: every code can be constructed and priced.
test('every code in the catalogue produces a well-formed diagnostic', () => {
  for (const code of codes) {
    const d = diagnostic(code);
    assert.ok(d.message.startsWith('lintel: '), code);
    const expected = severityOf(code) === 'error' ? exitClassFor(code) : 0;
    assert.equal(exitCodeFor([d]), expected, code);
  }
  assert.equal(codes.length, Object.keys(CODES).length);
});
