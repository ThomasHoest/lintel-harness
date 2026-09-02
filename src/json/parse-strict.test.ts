import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseStrictJson } from './parse-strict.js';

const codes = (r: { bag: { items: readonly { code: string }[] } }): string[] =>
  r.bag.items.map((d) => d.code);

const parse = (text: string, file = 'pack.json') =>
  parseStrictJson(text, file, 'E-PACK-INVALID');

/* ── the reason this parser exists ────────────────────────────────────
   C-25. JSON.parse collapses duplicates and keeps the LAST; the threat
   model's actor 1 is caught by "a JSON diff review", and a reviewer reads
   the FIRST occurrence and stops. A parser that silently picks a winner
   voids that control by name — so this one refuses. */

test('a duplicate key is refused, naming the key and BOTH lines', () => {
  const text = ['{', '  "name": "coding",', '  "version": "1.0.0",', '  "name": "evil"', '}'].join('\n');
  const r = parse(text);
  assert.equal(r.value, undefined, 'a duplicate must not parse to a value');
  assert.deepEqual(codes(r), ['E-JSON-DUPLICATE-KEY']);
  const msg = r.bag.items[0]?.message ?? '';
  assert.ok(msg.includes('"name"'), msg);
  assert.ok(msg.includes('2') && msg.includes('4'), `must name both lines: ${msg}`);
  assert.ok(!/\{[A-Za-z][A-Za-z0-9]*\}/.test(msg), `unfilled placeholder: ${msg}`);
});

// "At any depth" is the requirement, and the reason is the same one: a
// duplicate three levels down is exactly as invisible to a diff reader.
test('a duplicate is caught at any depth', () => {
  const nested = '{\n "a": {\n  "b": {\n   "k": 1,\n   "k": 2\n  }\n }\n}';
  assert.deepEqual(codes(parse(nested)), ['E-JSON-DUPLICATE-KEY']);
  const inArray = '{\n "xs": [\n  { "k": 1, "k": 2 }\n ]\n}';
  assert.deepEqual(codes(parse(inArray)), ['E-JSON-DUPLICATE-KEY']);
});

// The check is per object, not global — two objects may each have an `a`.
test('the same key in two different objects is legal', () => {
  const r = parse('{"a": 1, "b": {"a": 2}}');
  assert.deepEqual(r.value, { a: 1, b: { a: 2 } });
  assert.equal(r.bag.length, 0);
});

test('JSON.parse would have accepted what this refuses', () => {
  const text = '{"k": 1, "k": 2}';
  assert.deepEqual(JSON.parse(text), { k: 2 }, 'the stdlib keeps the last, silently');
  assert.equal(parse(text).value, undefined, 'this parser refuses instead');
});

/* ── ordinary parsing ─────────────────────────────────────────────── */

test('it parses the JSON value grammar', () => {
  const r = parse('{"s":"x","n":-1.5e3,"t":true,"f":false,"z":null,"a":[1,"2",[]],"o":{}}');
  assert.deepEqual(r.value, {
    s: 'x',
    n: -1500,
    t: true,
    f: false,
    z: null,
    a: [1, '2', []],
    o: {},
  });
});

test('it handles string escapes, including \\u', () => {
  const r = parse('{"k":"a\\"b\\\\c\\n\\t\\u00e9"}');
  assert.deepEqual(r.value, { k: 'a"b\\c\n\té' });
});

test('a BOM is stripped rather than refused', () => {
  // Invisible in an editor; refusing it reports a syntax error a user
  // cannot see.
  const r = parse(String.fromCharCode(0xfeff) + '{"a":1}');
  assert.deepEqual(r.value, { a: 1 });
});

/* ── strictness ───────────────────────────────────────────────────── */

test('it refuses what other JSON tools refuse', () => {
  const bad: [string, string][] = [
    ['{"a":1,}', 'trailing comma in an object'],
    ['[1,2,]', 'trailing comma in an array'],
    ['{a:1}', 'unquoted key'],
    ["{'a':1}", 'single quotes'],
    ['{"a":01}', 'leading zero'],
    ['{"a":NaN}', 'NaN'],
    ['{"a":1} trailing', 'trailing content'],
    ['{"a":1', 'unterminated object'],
    ['{"a":"x', 'unterminated string'],
    ['// c\n{"a":1}', 'a comment'],
    ['', 'empty input'],
  ];
  for (const [text, why] of bad) {
    const r = parse(text);
    assert.equal(r.value, undefined, `${why} must be refused`);
    assert.deepEqual(codes(r), ['E-PACK-INVALID'], why);
  }
});

test('a raw control character in a string is refused', () => {
  const r = parse('{"a":"xy"}');
  assert.deepEqual(codes(r), ['E-PACK-INVALID']);
});

/* ── the code differs by document ─────────────────────────────────── */

// One fault, one code, per this catalogue's rule — and the three messages
// must not be interchangeable, since the file and the remedy differ.
test('the malformed code is the caller\'s document, not a single generic one', () => {
  assert.deepEqual(codes(parseStrictJson('{', 'pack.json', 'E-PACK-INVALID')), ['E-PACK-INVALID']);
  assert.deepEqual(codes(parseStrictJson('{', 'recipe.json', 'E-RECIPE-INVALID')), ['E-RECIPE-INVALID']);
  assert.deepEqual(
    codes(parseStrictJson('{', '.harness/manifest.json', 'E-MANIFEST-CORRUPT')),
    ['E-MANIFEST-CORRUPT'],
  );
});

// E-PACK-INVALID was added at F1 v4.0 because building this parser found
// pack.json had no code for a syntax fault while the other two documents
// each had one.
test('every malformed message names its file and carries no unfilled placeholder', () => {
  for (const [file, code] of [
    ['pack.json', 'E-PACK-INVALID'],
    ['recipe.json', 'E-RECIPE-INVALID'],
  ] as const) {
    const r = parseStrictJson('{', file, code);
    const msg = r.bag.items[0]?.message ?? '';
    assert.ok(msg.includes(file), `${code} must name the file: ${msg}`);
    assert.ok(!/\{[A-Za-z][A-Za-z0-9]*\}/.test(msg), `unfilled placeholder: ${msg}`);
  }
});

test('line numbers survive multi-line input', () => {
  const r = parse('{\n\n\n  "a": ???\n}');
  const msg = r.bag.items[0]?.message ?? '';
  assert.ok(msg.includes('line 4'), `must report the failing line: ${msg}`);
});

/* ── the real packs parse ─────────────────────────────────────────── */

test('the three bundled pack declarations parse cleanly', async () => {
  const { readFile } = await import('node:fs/promises');
  const { fileURLToPath } = await import('node:url');
  const { packDir } = await import('../paths.js');
  for (const name of ['coding', 'writing', 'planning']) {
    const p = fileURLToPath(new URL('pack.json', packDir(name)));
    const r = parseStrictJson(await readFile(p, 'utf8'), `${name}/pack.json`, 'E-PACK-INVALID');
    assert.equal(r.bag.length, 0, `${name}: ${r.bag.items[0]?.message}`);
    assert.ok(r.value && typeof r.value === 'object');
  }
});
