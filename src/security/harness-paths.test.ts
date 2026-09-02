import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HARNESS_ROOT, OWNED_ENTRIES, harness, harnessPath, isHarnessOwned, payloadPath } from './harness-paths.js';
import { confinePath } from './confine.js';
import { missingPlaceholders } from '../diag/catalogue.js';

const CTX = { index: 0 } as const;

test('the owned list is five and complete', () => {
  assert.equal(OWNED_ENTRIES.length, 5);
  assert.deepEqual(
    OWNED_ENTRIES.map((e) => e.at).sort(),
    ['journal.d', 'journal.json', 'lock', 'manifest.json', 'pack'],
  );
});

test('the four fixed entries and the two subtrees construct', () => {
  assert.equal(harness.manifest(), '.harness/manifest.json');
  assert.equal(harness.journal(), '.harness/journal.json');
  assert.equal(harness.lock(), '.harness/lock');
  assert.equal(harnessPath('.harness/pack/a/b.md'), '.harness/pack/a/b.md');
  assert.equal(harness.backup('abc123'), '.harness/journal.d/abc123');
});

// A subtree ROOT is a legitimate CLI-owned path: the payload copier
// creates `.harness/pack/` and rollback removes it, so both need to name
// it. Only the FILE entries take no children.
test('a subtree root is constructible; a file entry takes no children', () => {
  assert.equal(harnessPath('.harness/pack'), '.harness/pack');
  assert.equal(harnessPath('.harness/journal.d'), '.harness/journal.d');
  assert.equal(harnessPath('.harness/manifest.json/deeper'), undefined);
  assert.equal(harnessPath('.harness/lock/x'), undefined);
});

test('anything outside the five is not constructible', () => {
  for (const p of [
    '.harness/nonsense',
    '.harness',
    'CLAUDE.md',
    '.harness/manifest.json/deeper', // a file entry takes no children
    '.harness/../escape',
  ]) {
    assert.equal(harnessPath(p), undefined, p);
  }
});

// The whole reason the second brand exists (C-5, C-14). The two rules
// must PARTITION: everything under .harness/ is the CLI's and nothing
// else is, so the denylist can forbid it absolutely without deadlocking
// the payload copier.
test('the denylist and the harness brand partition rather than overlap', () => {
  const harnessOwned = ['.harness/manifest.json', '.harness/pack/x.md', '.harness/lock'];
  for (const p of harnessOwned) {
    assert.ok(isHarnessOwned(p), p);
    // A recipe step may never reach it...
    assert.equal(confinePath(p, CTX).path, undefined, `${p} must be denied to a recipe step`);
    // ...and the CLI always may.
    assert.ok(harnessPath(p), `${p} must be constructible as a CLI write`);
  }
  const applied = ['CLAUDE.md', 'specifications/README.md'];
  for (const p of applied) {
    assert.equal(isHarnessOwned(p), false, p);
    assert.ok(confinePath(p, CTX).path, p);
    assert.equal(harnessPath(p), undefined, `${p} is not a CLI write`);
  }
});

test('the brand check folds case, so .HARNESS cannot evade either rule', () => {
  assert.ok(isHarnessOwned('.HARNESS/manifest.json'));
  assert.equal(confinePath('.HARNESS/x', CTX).path, undefined);
});

/* ── payloadPath, the one diagnostic in the module ──────────────────── */

test('a legal pack path becomes a payload destination', () => {
  const r = payloadPath('coding', 'agents/architect.md');
  assert.equal(r.path, '.harness/pack/agents/architect.md');
  assert.equal(r.bag.length, 0);
});

test('an illegal pack path is E-PAYLOAD-PATH-INVALID, named and complete', () => {
  const cases: [string, string][] = [
    ['a/../b', 'a "." or ".." segment'],
    ['a\\b', 'a backslash'],
    ['a/b./c', 'a segment ending in "." or whitespace'],
    ['a//b', 'an empty segment'],
    ['étude.md', 'a non-NFC name'],
  ];
  for (const [sub, construct] of cases) {
    const r = payloadPath('coding', sub);
    assert.equal(r.path, undefined, sub);
    assert.deepEqual(r.bag.items.map((d) => d.code), ['E-PAYLOAD-PATH-INVALID'], sub);
    const msg = r.bag.items[0]?.message ?? '';
    assert.ok(msg.includes(construct), `${sub}: message must name the construct`);
    assert.ok(msg.includes('coding'), `${sub}: message must name the pack`);
    assert.ok(!/\{[A-Za-z][A-Za-z0-9]*\}/.test(msg), `${sub}: unfilled placeholder in ${msg}`);
  }
});

test('the payload diagnostic fills every placeholder its message declares', () => {
  assert.deepEqual(
    missingPlaceholders('E-PAYLOAD-PATH-INVALID', { path: 'p', name: 'n', construct: 'c' }),
    [],
  );
});

// harnessPath is a type-level constructor over a closed list, so a caller
// passing something else has a bug rather than a fault to report. It must
// stay silent — inventing a code for it would put a programming error in
// the product's only message catalogue.
test('harnessPath emits no diagnostic, ever', () => {
  assert.equal(harnessPath('.harness/nonsense'), undefined);
  assert.equal(typeof harnessPath('.harness/nonsense'), 'undefined');
});

test('HARNESS_ROOT is the single spelling used everywhere', () => {
  assert.equal(HARNESS_ROOT, '.harness');
  assert.ok(harness.manifest().startsWith(`${HARNESS_ROOT}/`));
});
