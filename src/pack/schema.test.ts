import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { validatePackJson } from './schema.js';
import { BOOLEAN_TYPED_FIELDS } from './types.js';
import { parseStrictJson } from '../json/parse-strict.js';
import { packDir } from '../paths.js';

const codes = (r: { bag: { items: readonly { code: string }[] } }): string[] =>
  r.bag.items.map((d) => d.code);

/** A minimal pack that validates cleanly, as a base for negative cases. */
function base(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const anatomy: Record<string, unknown> = {};
  for (const p of [
    'process', 'roles', 'documentTemplates', 'conventions', 'coordination',
    'behaviouralGuidelines', 'folderScaffolding', 'skillsAndAutomations', 'autonomyContract',
  ]) {
    anatomy[p] = { paths: [`${p}/**`] };
  }
  return {
    formatVersion: 1,
    name: 'demo',
    version: '1.0.0',
    title: 'Demo',
    minCliVersion: '1.0.0',
    anatomy,
    ...overrides,
  };
}

const check = (o: unknown, name = 'demo') =>
  validatePackJson(o as never, name);

test('a minimal well-formed pack validates with no diagnostics', () => {
  const r = check(base());
  assert.deepEqual(codes(r), []);
  assert.ok(r.pack);
});

/* ── rule 1: unknown KEYS warn ──────────────────────────────────────── */

// C-16. A key this CLI does not know is a pack talking to a future
// version; refusing it would make every forward-compatible addition a
// breaking change.
test('an unknown key warns, does not fail, and is defect class', () => {
  const r = check(base({ futureThing: 1 }));
  assert.deepEqual(codes(r), ['W-UNKNOWN-KEY']);
  assert.equal(r.bag.items[0]?.class, 'defect');
  assert.equal(r.bag.exitCode(), 0, 'a warning is not a failure');
  assert.equal(r.bag.exitCode(true), 1, 'but --strict promotes a defect');
  assert.ok(r.pack, 'and the pack is still usable');
});

// F1 US-1 asks for exactly this test, and until v4.3 there was no code to
// assert it with.
test('provenance does NOT trip the unknown-key warning', () => {
  const r = check(base({ provenance: { source: 'x', commit: 'abc' } }));
  assert.deepEqual(codes(r), [], 'provenance is a defined optional field (Q-60)');
});

/* ── rule 2: unknown VALUES are fatal ───────────────────────────────── */

test('an unrecognised anatomy status is E-UNKNOWN-VALUE, not a warning', () => {
  const a = base();
  (a['anatomy'] as Record<string, unknown>)['process'] = { paths: ['x'], status: 'maybe' };
  const r = check(a);
  assert.deepEqual(codes(r), ['E-UNKNOWN-VALUE']);
  assert.equal(r.bag.exitCode(), 2);
  assert.equal(r.pack, undefined, 'zero bytes: nothing usable comes back');
});

test('an unrecognised parameter type is fatal', () => {
  const r = check(base({ parameters: [{ id: 'x', prompt: 'p', type: 'colour' }] }));
  assert.ok(codes(r).includes('E-UNKNOWN-VALUE'));
});

/* ── rule 3: boolean-typed fields, C-34 ─────────────────────────────── */

// The finding, restated: "false" is TRUTHY in JavaScript, so a string here
// does not mistype a value, it inverts one. notASecret disables C-15's
// credential ban.
test('a string in a boolean-typed field is fatal, with no coercion', () => {
  for (const bad of ['false', 'no', 'true', 0, 1, null]) {
    const r = check(base({ parameters: [{ id: 'x', prompt: 'p', type: 'boolean', notASecret: bad }] }));
    assert.ok(codes(r).includes('E-UNKNOWN-VALUE'), `notASecret: ${JSON.stringify(bad)}`);
    assert.equal(r.pack, undefined, JSON.stringify(bad));
  }
});

test('a real boolean is accepted in both directions', () => {
  for (const good of [true, false]) {
    const r = check(base({ parameters: [{ id: 'x', prompt: 'p', type: 'boolean', required: good }] }));
    assert.deepEqual(codes(r), [], String(good));
  }
});

// Five, since Q-79. A validator built against four leaves fillExpected
// uncovered — the field gating whether update may overwrite a filled
// project-brief.md.
test('the boolean-typed list is five and names fillExpected', () => {
  assert.equal(BOOLEAN_TYPED_FIELDS.length, 5);
  assert.ok(BOOLEAN_TYPED_FIELDS.includes('RecipeStep.fillExpected'));
});

/* ── anatomy ────────────────────────────────────────────────────────── */

test('all nine parts are required — G-F1-3', () => {
  const a = base();
  delete (a['anatomy'] as Record<string, unknown>)['coordination'];
  const r = check(a);
  assert.deepEqual(codes(r), ['E-ANATOMY-MISSING']);
  assert.ok(r.bag.items[0]?.message.includes('coordination'));
});

test('a present part must say where its content is', () => {
  const a = base();
  (a['anatomy'] as Record<string, unknown>)['roles'] = { status: 'present' };
  assert.deepEqual(codes(check(a)), ['E-ANATOMY-MISSING']);
});

test('absent needs a reason; provisional needs a note', () => {
  const a = base();
  (a['anatomy'] as Record<string, unknown>)['roles'] = { status: 'absent' };
  assert.deepEqual(codes(check(a)), ['E-ANATOMY-NO-REASON']);

  const b = base();
  (b['anatomy'] as Record<string, unknown>)['roles'] = { paths: ['x'], status: 'provisional' };
  assert.deepEqual(codes(check(b)), ['E-ANATOMY-NO-NOTE']);
});

// Not the unknown-key rule: these are keys whose MEANINGS collide, and the
// format cannot pick one.
test('a content source alongside absent is a contradiction, not an unknown key', () => {
  const a = base();
  (a['anatomy'] as Record<string, unknown>)['roles'] = {
    status: 'absent', reason: 'none', paths: ['x'],
  };
  assert.deepEqual(codes(check(a)), ['E-ANATOMY-SOURCE-ON-ABSENT']);
});

/* ── parameters, C-7 ────────────────────────────────────────────────── */

test('a string parameter must declare an anchored pattern', () => {
  const r = check(base({ parameters: [{ id: 'x', prompt: 'p', type: 'string' }] }));
  assert.deepEqual(codes(r), ['E-PARAM-NO-PATTERN']);
});

test('a pattern must be anchored, bounded, and free of backreferences and lookaround', () => {
  const cases: [string, string][] = [
    ['[a-z]+$', 'begin'],
    ['^[a-z]+', 'end'],
    [`^${'a'.repeat(210)}$`, 'characters'],
    ['^(a)\\1$', 'backreference'],
    ['^(?=x)a$', 'lookaround'],
    ['^(?<!x)a$', 'lookaround'],
    ['^(a$', 'compile'],
  ];
  for (const [pattern, why] of cases) {
    const r = check(base({ parameters: [{ id: 'x', prompt: 'p', type: 'string', pattern }] }));
    assert.deepEqual(codes(r), ['E-PARAM-PATTERN-INVALID'], `${pattern} (${why})`);
    assert.ok(r.bag.items[0]?.message.includes(why), `${pattern}: message must say why`);
  }
});

// The recommended default from E-PARAM-NO-PATTERN's own message must
// itself be a pattern this validator accepts — otherwise the CLI advises
// something it then refuses.
test('the pattern the CLI recommends passes its own validator', () => {
  const recommended = '^[\\p{L}\\p{N} ._-]{1,64}$';
  const r = check(base({ parameters: [{ id: 'x', prompt: 'p', type: 'string', pattern: recommended }] }));
  assert.deepEqual(codes(r), [], 'the CLI must not refuse its own advice');
});

test('pattern is refused on enum and boolean, where it means nothing', () => {
  for (const type of ['enum', 'boolean']) {
    const p: Record<string, unknown> = { id: 'x', prompt: 'p', type, pattern: '^a$' };
    if (type === 'enum') p['values'] = ['a'];
    assert.ok(codes(check(base({ parameters: [p] }))).includes('E-PARAM-PATTERN-INVALID'), type);
  }
});

test('maxLength is bounded by the ceiling', () => {
  const r = check(base({
    parameters: [{ id: 'x', prompt: 'p', type: 'string', pattern: '^a$', maxLength: 99999 }],
  }));
  assert.deepEqual(codes(r), ['E-PARAM-PATTERN-INVALID']);
});

test('an enum must declare a non-empty values array', () => {
  assert.ok(codes(check(base({ parameters: [{ id: 'x', prompt: 'p', type: 'enum' }] }))).includes('E-UNKNOWN-VALUE'));
  assert.ok(codes(check(base({ parameters: [{ id: 'x', prompt: 'p', type: 'enum', values: [] }] }))).includes('E-UNKNOWN-VALUE'));
});

// US-8. The reserved list is the WHOLE list, whether or not the command
// being run accepts the flag — a pack claiming `force` would shadow a CLI
// flag whose meaning F1 fixes.
test('a flag colliding with a reserved CLI flag is refused', () => {
  for (const flag of ['force', 'dry-run', 'json', 'all']) {
    const r = check(base({ parameters: [{ id: 'x', prompt: 'p', type: 'boolean', flag }] }));
    assert.deepEqual(codes(r), ['E-PARAM-FLAG-INVALID'], flag);
  }
});

test('a well-formed flag is accepted', () => {
  const r = check(base({ parameters: [{ id: 'x', prompt: 'p', type: 'boolean', flag: 'calibration' }] }));
  assert.deepEqual(codes(r), []);
});

/* ── the rest ───────────────────────────────────────────────────────── */

test('name must match the directory it sits in', () => {
  const r = check(base({ name: 'elsewhere' }), 'demo');
  assert.ok(codes(r).includes('E-PACK-INVALID'));
});

test('folderReadme is one segment, under a step\'s grammar', () => {
  assert.deepEqual(codes(check(base({ folderReadme: 'index.md' }))), []);
  assert.ok(codes(check(base({ folderReadme: 'a/b.md' }))).includes('E-MAP-PATH-GRAMMAR'));
  assert.ok(codes(check(base({ folderReadme: '../x.md' }))).includes('E-MAP-PATH-GRAMMAR'));
});

test('provenance accepts a string or an object of short strings, and nothing else', () => {
  assert.deepEqual(codes(check(base({ provenance: 'migrated from x' }))), []);
  assert.deepEqual(codes(check(base({ provenance: { source: 'x' } }))), []);
  // The exact shapes the packs got wrong before v3.1: an array value, and
  // a note over 200 characters.
  assert.ok(codes(check(base({ provenance: { xs: ['a'] } }))).includes('E-UNKNOWN-VALUE'));
  assert.ok(codes(check(base({ provenance: { note: 'x'.repeat(201) } }))).includes('E-UNKNOWN-VALUE'));
  assert.ok(codes(check(base({ provenance: 7 }))).includes('E-UNKNOWN-VALUE'));
});

test('executableRoots entries end in / and pass the denylist', () => {
  assert.deepEqual(codes(check(base({ executableRoots: ['scripts/'] }))), []);
  assert.ok(codes(check(base({ executableRoots: ['scripts'] }))).includes('E-UNKNOWN-VALUE'));
  assert.ok(codes(check(base({ executableRoots: ['.github/'] }))).includes('E-MAP-RESERVED-DEST'));
});

/* ── the real packs ─────────────────────────────────────────────────── */

test('all three bundled packs validate with no error', async () => {
  for (const name of ['coding', 'writing', 'planning']) {
    const p = fileURLToPath(new URL('pack.json', packDir(name)));
    const parsed = parseStrictJson(await readFile(p, 'utf8'), `${name}/pack.json`, 'E-PACK-INVALID');
    assert.ok(parsed.value, `${name} must parse`);
    const r = validatePackJson(parsed.value, name);
    assert.deepEqual(
      r.bag.errors.map((d) => `${d.code}: ${d.message.split('\n')[0]}`),
      [],
      `${name} must validate`,
    );
    assert.ok(r.pack, name);
  }
});

// The bundled packs must also be clean under --strict, which is F1's own
// acceptance criterion for validate --all --strict (Q-60).
test('no bundled pack raises a defect-class warning', async () => {
  for (const name of ['coding', 'writing', 'planning']) {
    const p = fileURLToPath(new URL('pack.json', packDir(name)));
    const parsed = parseStrictJson(await readFile(p, 'utf8'), `${name}/pack.json`, 'E-PACK-INVALID');
    const r = validatePackJson(parsed.value as never, name);
    assert.deepEqual(
      r.bag.promotable.map((d) => d.message.split('\n')[0]),
      [],
      `${name} must be clean under --strict`,
    );
  }
});
