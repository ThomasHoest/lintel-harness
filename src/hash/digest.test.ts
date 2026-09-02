import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isTreeDigest, treeDigest, type TreeEntry } from './digest.js';
import { hashText } from './sha256.js';

const H = (s: string): string => hashText(s);

const entry = (path: string, content: string): TreeEntry => ({ path, sha256: H(content) });

test('the digest has the wire form the manifest validates', () => {
  const d = treeDigest([entry('a.md', 'a'), entry('b.md', 'b')]);
  assert.match(d, /^sha256-[0-9a-f]{64}$/);
  assert.equal(isTreeDigest(d), true);
});

// The canonical listing, pinned. F1 §NFR names the parts — one line per
// file, path then hash, `\n`-joined — but NOT the character between the
// path and the hash. This test is where that choice is fixed, because it
// is a compatibility contract: a `payloadDigest` written today is
// recomputed by a later CLI, and a future build that picked a tab would
// report every existing project as a tampered payload.
test('the listing is `<path> <hash>` per line, joined with \\n', () => {
  const a = H('a');
  const b = H('b');
  assert.equal(treeDigest([entry('a.md', 'a'), entry('b.md', 'b')]), `sha256-${H(`a.md ${a}\nb.md ${b}`)}`);
});

test('the empty file set still yields a well-formed digest', () => {
  assert.equal(treeDigest([]), `sha256-${H('')}`);
  assert.equal(isTreeDigest(treeDigest([])), true);
});

// The caller hands over whatever order the walk produced; sorting here
// rather than trusting it is what makes the digest a pure function of the
// file SET. If it depended on iteration order, two applies of the same
// pack could disagree and F1's determinism guarantee would be false.
test('the digest is independent of the order the entries arrive in', () => {
  const es = [entry('b.md', 'b'), entry('a/x.md', 'x'), entry('a.md', 'a'), entry('z/y/w.md', 'w')];
  const expected = treeDigest(es);
  assert.equal(treeDigest([...es].reverse()), expected);
  assert.equal(treeDigest([es[2]!, es[1]!, es[3]!, es[0]!]), expected);
});

// Byte-ascending, NOT JavaScript's `<`. They are different orders and the
// difference is reachable: `<` compares UTF-16 code units, so an astral
// character (surrogate pair beginning 0xD800) sorts BEFORE U+E000–U+FFFF,
// while its UTF-8 bytes (F0 90 80 80) sort AFTER (EF BF BF). A JS-native
// sort agrees with the spec on every ASCII path in the bundled packs and
// disagrees on the first emoji in a filename — so the bug would ship
// green and surface as a false tamper report on one user's machine.
test('paths sort by UTF-8 bytes, not by UTF-16 code units', () => {
  const bmp = 'a\uFFFF.md'; // EF BF BF — lower in UTF-8
  const astral = 'a\u{10000}.md'; // F0 90 80 80 — higher in UTF-8, lower in UTF-16
  assert.ok(astral < bmp, 'precondition: JS `<` orders these the other way round');

  const hb = H('bmp');
  const ha = H('astral');
  const byteOrder = `${bmp} ${hb}\n${astral} ${ha}`;
  const codeUnitOrder = `${astral} ${ha}\n${bmp} ${hb}`;

  const d = treeDigest([
    { path: astral, sha256: ha },
    { path: bmp, sha256: hb },
  ]);
  assert.equal(d, `sha256-${H(byteOrder)}`);
  assert.notEqual(d, `sha256-${H(codeUnitOrder)}`);
});

test('a path segment boundary sorts by its byte, so `a.md` precedes `a/x.md`', () => {
  // '.' is 0x2E and '/' is 0x2F, so this is byte order and not a special
  // case for directories — there is no directory concept here at all.
  const ha = H('a');
  const hx = H('x');
  assert.equal(
    treeDigest([entry('a/x.md', 'x'), entry('a.md', 'a')]),
    `sha256-${H(`a.md ${ha}\na/x.md ${hx}`)}`,
  );
});

// The four things the digest exists to notice. The rename case is why the
// path is in the listing at all: hashing the file hashes alone would let a
// pack move its content around and still report an unchanged payload.
test('content, addition, removal and rename each move the digest', () => {
  const base = [entry('a.md', 'a'), entry('b.md', 'b')];
  const d = treeDigest(base);

  assert.notEqual(treeDigest([entry('a.md', 'a!'), entry('b.md', 'b')]), d, 'content changed');
  assert.notEqual(treeDigest([...base, entry('c.md', 'c')]), d, 'file added');
  assert.notEqual(treeDigest([entry('a.md', 'a')]), d, 'file removed');
  assert.notEqual(treeDigest([entry('renamed.md', 'a'), entry('b.md', 'b')]), d, 'file renamed');
});

// Swapping which file holds which content must move the digest. It is the
// case a path-blind or hash-blind listing would miss, and it is exactly
// what a hostile edit of a payload would look like.
test('two files exchanging their contents changes the digest', () => {
  assert.notEqual(
    treeDigest([entry('a.md', 'a'), entry('b.md', 'b')]),
    treeDigest([entry('a.md', 'b'), entry('b.md', 'a')]),
  );
});

test('the input array is not mutated', () => {
  const es = [entry('b.md', 'b'), entry('a.md', 'a')];
  treeDigest(es);
  assert.deepEqual(
    es.map((e) => e.path),
    ['b.md', 'a.md'],
  );
});

// The manifest's read-back check (T-0704) refuses anything that is not
// `sha256-<64 lowercase hex>`. Uppercase hex is the interesting rejection:
// it is a valid hash of the right value in the wrong spelling, and
// accepting it would mean two byte-different manifests both pass.
test('isTreeDigest accepts only `sha256-<64 lowercase hex>`', () => {
  const hex = H('a');
  assert.equal(isTreeDigest(`sha256-${hex}`), true);
  assert.equal(isTreeDigest(`sha256-${hex.toUpperCase()}`), false, 'case is part of the form');
  assert.equal(isTreeDigest(hex), false, 'the prefix is required');
  assert.equal(isTreeDigest(`sha256-${hex.slice(1)}`), false, '63 characters');
  assert.equal(isTreeDigest(`sha256-${hex}0`), false, '65 characters');
  assert.equal(isTreeDigest(`sha1-${hex}`), false);
  assert.equal(isTreeDigest(`sha256-${hex}\n`), false, 'a trailing newline is not tolerated');
  assert.equal(isTreeDigest(''), false);
});
