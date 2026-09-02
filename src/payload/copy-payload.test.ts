import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_FILE_BYTES,
  MAX_PAYLOAD_BYTES,
  PAYLOAD_DIR_MODE,
  PAYLOAD_FILE_MODE,
  planPayloadCopy,
  type PayloadEntry,
} from './copy-payload.js';

const codes = (b: { items: readonly { code: string }[] }): string[] => b.items.map((d) => d.code);
const file = (path: string, size = 10): PayloadEntry => ({ path, kind: 'file', size });

test('every payload file gets a .harness/pack/ destination, verbatim', () => {
  const r = planPayloadCopy('demo', [file('agents/a.md'), file('recipe.json')]);
  assert.deepEqual(codes(r.bag), []);
  assert.deepEqual(r.copies.map((c) => c.to), ['.harness/pack/agents/a.md', '.harness/pack/recipe.json']);
});

/**
 * **No file is skipped** — not by scaffold selection, not by anything.
 * `.harness/pack/` is *what the pack shipped*, so `verify` and `update`
 * can recompute against it without asking what this particular apply chose
 * to do.
 */
test('nothing is filtered out, including a scaffold nobody selected', () => {
  const r = planPayloadCopy('demo', [
    file('base.md'),
    file('scaffolds/backend/deploy.sh'),
    file('calibrations/high-floor/x.md'),
    file('calibrations/near-zero-floor/x.md'),
  ]);
  assert.equal(r.copies.length, 4, 'both calibration branches ship; only one is copied OUT');
});

test('directories contribute no copy of their own', () => {
  const r = planPayloadCopy('demo', [{ path: 'agents', kind: 'dir', size: 0 }, file('agents/a.md')]);
  assert.equal(r.copies.length, 1);
});

/* ── the modes are constants, not defaults (C-26) ────────────────────── */

/**
 * Preserving source modes would make phase 1 carry a permission decision
 * derived from **the authoring machine's umask** — and a `0755` payload
 * file would land under `.harness/` with **no declared root, no cap, no
 * disclosure and no diagnostic**, invisible to a content-only digest.
 */
test('the fixed modes are what the spec fixes them at', () => {
  assert.equal(PAYLOAD_FILE_MODE, 0o644);
  assert.equal(PAYLOAD_DIR_MODE, 0o755);
});

/* ── what it validates ───────────────────────────────────────────────── */

test('an illegal pack path is reported with the pack’s name', () => {
  const r = planPayloadCopy('demo', [file('../escape.md')]);
  assert.deepEqual(codes(r.bag), ['E-PAYLOAD-PATH-INVALID']);
  assert.match(r.bag.items[0]!.message, /in pack demo/);
  assert.deepEqual(r.copies, []);
});

// Pack content must be regular files: a link is content the pack does not
// actually hold, and following one would copy from outside it.
test('a symlink in the pack is refused', () => {
  const r = planPayloadCopy('demo', [{ path: 'link.md', kind: 'file', size: 1, symlink: true }]);
  assert.deepEqual(codes(r.bag), ['E-SYMLINK-IN-PACK']);
});

test('an over-large file is refused, and the rest still plan', () => {
  const r = planPayloadCopy('demo', [file('huge.bin', MAX_FILE_BYTES + 1), file('ok.md')]);
  assert.deepEqual(codes(r.bag), ['E-CONTENT-TOO-LARGE']);
  assert.deepEqual(r.copies.map((c) => c.from), ['ok.md'], 'validate reports all faults, not the first');
});

// The payload is copied into and COMMITTED BY every project that applies
// the pack, which is what sets the bound.
test('an over-large payload is refused as a whole', () => {
  const many = Array.from({ length: 10 }, (_, i) => file(`f${i}.bin`, MAX_FILE_BYTES));
  const r = planPayloadCopy('demo', many);
  assert.ok(codes(r.bag).includes('E-PAYLOAD-TOO-LARGE'));
  assert.ok(r.totalBytes > MAX_PAYLOAD_BYTES);
});

/**
 * A truncated walk means `entries` is **partial**, and copying a partial
 * payload would produce a `.harness/pack/` that silently differs from the
 * pack — which every later recomputation would then be measured against.
 */
test('a truncated walk plans nothing at all', () => {
  const r = planPayloadCopy('demo', [file('a.md')], true);
  assert.deepEqual(codes(r.bag), ['E-TRAVERSAL-LIMIT']);
  assert.deepEqual(r.copies, []);
});

/* ── what it deliberately does not do ────────────────────────────────── */

// It reads no recipe, resolves no parameter and evaluates no `when`. A
// copier that understood the recipe would be a copier that could disagree
// with it.
test('a template keeps its name — no suffix is stripped in phase 1', () => {
  const r = planPayloadCopy('demo', [file('copy/tone-of-voice.template.md')]);
  assert.deepEqual(r.copies.map((c) => c.to), ['.harness/pack/copy/tone-of-voice.template.md']);
});
