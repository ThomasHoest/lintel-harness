import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeText } from './normalize.js';

const buf = (s: string): Buffer => Buffer.from(s, 'utf8');

/** The three-byte UTF-8 BOM, written as bytes rather than as a decoded
 *  character, so the test exercises the decode as well as the strip. */
const BOM_BYTES = Buffer.from([0xef, 0xbb, 0xbf]);

test('CRLF and lone CR both become LF', () => {
  assert.equal(normalizeText(buf('a\r\nb')), 'a\nb');
  assert.equal(normalizeText(buf('a\rb')), 'a\nb');
  assert.equal(normalizeText(buf('a\r\nb\rc\nd')), 'a\nb\nc\nd');
});

// A CRLF is one line ending, not two. Replacing `\r` first and `\n`
// never would double every line on a Windows checkout — the whole file
// would read as changed, which is the fault this module exists to avoid.
test('a CRLF is consumed whole, not as CR then LF', () => {
  assert.equal(normalizeText(buf('a\r\nb')).split('\n').length, 2);
  assert.equal(normalizeText(buf('\r\n\r\n')), '\n\n');
  assert.equal(normalizeText(buf('\r\r\n')), '\n\n', 'a lone CR before a CRLF is its own ending');
});

test('a leading UTF-8 BOM is stripped', () => {
  assert.equal(normalizeText(Buffer.concat([BOM_BYTES, buf('hello')])), 'hello');
  assert.equal(normalizeText(Buffer.concat([BOM_BYTES, buf('a\r\nb')])), 'a\nb');
});

// U+FEFF is only a byte-order mark in the first position. Anywhere else
// it is ZWNBSP, which is content the author wrote; stripping it would be
// an edit the normalizer is not entitled to make, and would make two
// genuinely different files hash alike.
test('a U+FEFF that is not leading is content, and a second leading one is too', () => {
  assert.equal(normalizeText(buf('a\uFEFFb')), 'a\uFEFFb');
  assert.equal(normalizeText(buf('\uFEFF\uFEFFa')), '\uFEFFa', 'only the first is a BOM');
  assert.equal(normalizeText(buf('a\uFEFF')), 'a\uFEFF');
});

// Q-26, and it is the whole of what this module refuses to do. Each of
// these is real content: a template a user filled in by deleting a
// trailing space HAS been edited, and a normalizer that trimmed would
// make `verify` report `match` on a file that changed.
test('trailing whitespace, blank lines and the final newline are all significant', () => {
  assert.equal(normalizeText(buf('a   ')), 'a   ', 'trailing spaces survive');
  assert.equal(normalizeText(buf('a\t')), 'a\t', 'a trailing tab survives');
  assert.equal(normalizeText(buf('a\n\n\nb')), 'a\n\n\nb', 'blank lines survive');
  assert.equal(normalizeText(buf('a\n')), 'a\n', 'a final newline survives');
  assert.equal(normalizeText(buf('a')), 'a', 'and its absence is not repaired');
  assert.equal(normalizeText(buf('  a')), '  a', 'leading whitespace survives');
  assert.equal(normalizeText(buf('a \r\n b \r\n')), 'a \n b \n', 'both at once');
});

test('LF-only text is unchanged, and the function is idempotent', () => {
  const once = normalizeText(buf('\uFEFFa\r\nb\rc\n'));
  assert.equal(once, 'a\nb\nc\n');
  assert.equal(normalizeText(buf(once)), once);
});

test('an empty buffer normalizes to the empty string', () => {
  assert.equal(normalizeText(Buffer.alloc(0)), '');
  assert.equal(normalizeText(BOM_BYTES), '', 'a file holding only a BOM is empty text');
});

// The property the module is FOR, asserted directly rather than left to
// be inferred from the rules: a CRLF checkout and an editor that added a
// BOM must both compare equal to the original.
test('two files differing only in line endings or a BOM normalize equal', () => {
  const unix = buf('# Title\n\nBody\n');
  const windows = buf('# Title\r\n\r\nBody\r\n');
  const bommed = Buffer.concat([BOM_BYTES, windows]);
  assert.equal(normalizeText(unix), normalizeText(windows));
  assert.equal(normalizeText(unix), normalizeText(bommed));
});

// The accepted cost, pinned so nobody later reads the CRLF immunity as
// free. F1 §F1.9 records it as a known limit: a pure line-ending edit is
// undetectable, and that is the price of the test above.
test('a pure line-ending edit is undetectable — the stated cost', () => {
  assert.equal(normalizeText(buf('a\nb')), normalizeText(buf('a\r\nb')));
});

// Non-ASCII must survive intact: normalization is about line endings and
// a BOM, not about Unicode. Anything else here would silently rewrite a
// pack's content.
test('non-ASCII text passes through unchanged', () => {
  assert.equal(normalizeText(buf('héllo — naïve 😀')), 'héllo — naïve 😀');
  assert.equal(normalizeText(buf('a\u2028b\u2029c')), 'a\u2028b\u2029c', 'LS and PS are not line endings here');
  assert.equal(normalizeText(buf('a\u0085b')), 'a\u0085b', 'NEL is not a line ending here either');
});
