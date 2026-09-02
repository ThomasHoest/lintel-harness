import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SHA256_HEX_LENGTH, hashBytes, hashText } from './sha256.js';

// Published NIST/FIPS-180-4 vectors, not values captured from this
// implementation. A self-captured expectation would pass against a wrong
// algorithm just as happily, which is the one thing a hash test must not
// do.
const EMPTY = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
const ABC = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';

test('it is SHA-256, checked against published vectors', () => {
  assert.equal(hashText(''), EMPTY);
  assert.equal(hashText('abc'), ABC);
  assert.equal(hashBytes(Buffer.alloc(0)), EMPTY);
  assert.equal(hashBytes(Buffer.from('abc', 'utf8')), ABC);
});

// 64 lowercase hex, no truncation, no prefix. The manifest pins the form
// `sha256-<64 lowercase hex>` and re-validates it on read-back, so the
// case and the length are contract rather than presentation.
test('the output is exactly 64 lowercase hex characters, unprefixed', () => {
  for (const s of ['', 'abc', 'a'.repeat(10_000), '😀 — ünïcøde']) {
    const h = hashText(s);
    assert.equal(h.length, SHA256_HEX_LENGTH);
    assert.match(h, /^[0-9a-f]{64}$/, s.slice(0, 16));
    assert.equal(h.startsWith('sha256-'), false, 'the prefix belongs to treeDigest, not here');
  }
});

// No salt. `payloadDigest` is written into a manifest and recomputed by a
// LATER run on a DIFFERENT machine; a salted or per-process hash would
// make `verify` fail on a correct tree, and it would fail intermittently,
// which is the worst way for an integrity check to be wrong.
test('it is unsalted and stable across calls', () => {
  assert.equal(hashText('lintel'), hashText('lintel'));
  assert.equal(hashBytes(Buffer.from([1, 2, 3])), hashBytes(Buffer.from([1, 2, 3])));
});

// The text path must encode UTF-8 and nothing else. If `hashText` ever
// encoded as latin1 or UTF-16, a pack with a non-ASCII byte would digest
// differently here from the payload copy that produced it — and only on
// files with non-ASCII content, so the ASCII test suite would stay green.
test('hashText hashes the UTF-8 encoding, agreeing with hashBytes over the same bytes', () => {
  for (const s of ['abc', 'héllo', '😀', '\uFEFFbom-as-content']) {
    assert.equal(hashText(s), hashBytes(Buffer.from(s, 'utf8')), s);
  }
  assert.notEqual(hashText('é'), hashBytes(Buffer.from('é', 'latin1')));
});

test('distinct inputs give distinct digests, including one-bit differences', () => {
  assert.notEqual(hashText('a'), hashText('b'));
  assert.notEqual(hashBytes(Buffer.from([0x00])), hashBytes(Buffer.from([0x01])));
  assert.notEqual(hashText('a\n'), hashText('a'), 'a final newline is content');
});
