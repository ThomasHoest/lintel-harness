import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import {
  MAX_COMBINATIONS,
  MAX_LENGTH_DEFAULT,
  aliasesFor,
  checkAnswer,
  checkParameterSet,
  checkRecordedAnswers,
  checkWhenParameters,
  combinations,
  resolveAnswers,
} from './parameters.js';
import { RESERVED_FLAGS } from '../cli/flags.js';
import { exitClassFor } from '../diag/codes.js';
import { MESSAGES } from '../diag/catalogue.js';
import { packDir } from '../paths.js';
import type { PackJson, ParameterDecl } from './types.js';

const codes = (b: { items: readonly { code: string }[] }): string[] => b.items.map((d) => d.code);

const enumP = (id: string, values: string[], over: Partial<ParameterDecl> = {}): ParameterDecl => ({
  id,
  prompt: `Pick ${id}`,
  type: 'enum',
  values,
  ...over,
});

const str = (over: Partial<ParameterDecl> = {}): ParameterDecl => ({
  id: 'projectName',
  prompt: 'Project name',
  type: 'string',
  pattern: '^[A-Za-z0-9 ._-]{1,64}$',
  ...over,
});

const pack = (params: readonly ParameterDecl[]): PackJson =>
  ({ name: 'demo', parameters: params }) as unknown as PackJson;

/* ── pack-wide declaration rules ─────────────────────────────────────── */

test('a duplicate id is reported', () => {
  const b = checkParameterSet(pack([str(), str({ prompt: 'again' })]));
  assert.deepEqual(codes(b), ['E-UNKNOWN-VALUE']);
});

// The half no per-entry check can see. schema.ts owns the reserved
// collision; this owns the sibling collision.
test('two parameters claiming one alias collide', () => {
  const b = checkParameterSet(
    pack([str({ id: 'a', flag: 'name' }), str({ id: 'b', flag: 'name' })]),
  );
  assert.deepEqual(codes(b), ['E-PARAM-FLAG-INVALID']);
  assert.match(b.items[0]!.message, /already declared by parameter "a"/);
});

test('a credential-named parameter is refused unless it says otherwise', () => {
  assert.deepEqual(codes(checkParameterSet(pack([str({ id: 'apiKey' })]))), [
    'E-PARAM-SECRET-SUSPECTED',
  ]);
  assert.deepEqual(codes(checkParameterSet(pack([str({ id: 'apiKey', notASecret: true })]))), []);
});

test('a clean set reports nothing', () => {
  assert.deepEqual(codes(checkParameterSet(pack([str(), str({ id: 'tagline', flag: 'tagline' })]))), []);
});

/* ── aliases ─────────────────────────────────────────────────────────── */

test('aliases carry arity by type and are keyed by flag', () => {
  const a = aliasesFor([
    enumP('constraintFloor', ['high', 'low'], { flag: 'calibration' }),
    { id: 'verbose', prompt: 'Verbose?', type: 'boolean', flag: 'loud' },
  ]);
  assert.deepEqual(a, {
    calibration: { id: 'constraintFloor', arity: 'value' },
    loud: { id: 'verbose', arity: 'boolean' },
  });
});

// S5: the CLI holds no pack-specific knowledge, so a pack could otherwise
// hand it a table that shadows a reserved name. Excluded by construction.
test('a reserved name never enters the alias table', () => {
  for (const flag of RESERVED_FLAGS) {
    assert.deepEqual(aliasesFor([str({ flag })]), {}, flag);
  }
});

/* ── the recipe-wide rules ───────────────────────────────────────────── */

test('a when parameter must be required or have a default', () => {
  const w = new Map([['mode', new Set(['a'])]]);
  const bare = enumP('mode', ['a', 'b']);
  assert.deepEqual(codes(checkWhenParameters(pack([bare]), w)), ['E-PARAM-UNDECIDABLE']);
  assert.deepEqual(codes(checkWhenParameters(pack([{ ...bare, required: true }]), w)), []);
  assert.deepEqual(codes(checkWhenParameters(pack([{ ...bare, default: 'a' }]), w)), []);
});

test('an enum domain is its declared values; a boolean is two', () => {
  const p = pack([
    enumP('mode', ['a', 'b', 'c'], { required: true }),
    { id: 'loud', prompt: 'Loud?', type: 'boolean', required: true },
  ]);
  const { combos, bag } = combinations(p, new Map([
    ['mode', new Set(['a'])],
    ['loud', new Set(['true'])],
  ]));
  assert.deepEqual(codes(bag), []);
  assert.equal(combos.length, 6, '3 × 2');
});

// The class a string answer falls into when it matches no `when` is a real
// branch of the recipe, and rendering only the named values would never
// exercise it.
test('a string domain is its when-values plus one representative of "none of them"', () => {
  const { combos } = combinations(
    pack([str({ id: 'flavour', required: true })]),
    new Map([['flavour', new Set(['x', 'y'])]]),
  );
  assert.equal(combos.length, 3);
  assert.deepEqual(combos.map((c) => c.get('flavour')), ['x', 'y', null]);
});

test('a parameter no when names contributes no axis', () => {
  const { combos } = combinations(pack([str()]), new Map());
  assert.equal(combos.length, 1);
  assert.equal(combos[0]!.size, 0);
});

test('past the bound validate refuses rather than rendering', () => {
  const params: ParameterDecl[] = [];
  const when = new Map<string, Set<string>>();
  for (let i = 0; i < 6; i++) {
    params.push({ id: `p${i}`, prompt: 'x', type: 'boolean', required: true });
    when.set(`p${i}`, new Set(['true']));
  }
  const { combos, bag } = combinations(pack(params), when);
  assert.deepEqual(codes(bag), ['E-PARAM-COMBINATORICS'], '2^6 = 64');
  assert.deepEqual(combos, [], 'and nothing is rendered');
  assert.match(bag.items[0]!.message, /64 parameter combinations/);

  when.delete('p5');
  params.pop();
  assert.equal(combinations(pack(params), when).combos.length, MAX_COMBINATIONS, 'exactly at the bound passes');
});

/* ── answers, and the C-29 split ─────────────────────────────────────── */

test('the same fault is two codes on the two occasions', () => {
  const p = str();
  const collected = checkAnswer(p, 'no/slashes/here', 'collection');
  const read = checkAnswer(p, 'no/slashes/here', 'read-back');
  assert.deepEqual(codes(collected), ['E-PARAM-INVALID']);
  assert.deepEqual(codes(read), ['E-MANIFEST-ANSWER-INVALID']);
  assert.equal(exitClassFor(collected.items[0]!.code), 1, 'the user typed it and can retype it');
  assert.equal(exitClassFor(read.items[0]!.code), 2, 'nobody typed it — the manifest moved');
  assert.match(read.items[0]!.message, /Nobody typed this/);
});

test('one wrong answer is one diagnostic, not one per rule', () => {
  const b = checkAnswer(str({ maxLength: 4 }), 'way too long and also has a $ in it', 'collection');
  assert.equal(b.length, 1);
});

/* C-7. The ORDER is the control, not a tidiness preference: maxLength runs
   FIRST so that pattern evaluation is bounded by construction. A 5000-char
   answer must be refused for its length, never handed to the engine. */
test('maxLength is checked before pattern runs', () => {
  const b = checkAnswer(str({ maxLength: 8 }), 'a'.repeat(5000), 'collection');
  assert.deepEqual(codes(b), ['E-PARAM-INVALID']);
  assert.match(b.items[0]!.message, /at most 8 characters/, 'refused for length, not for shape');
});

test('the default maxLength applies when none is declared', () => {
  const wide = str({ pattern: '^.*$' });
  assert.equal(checkAnswer(wide, 'a'.repeat(MAX_LENGTH_DEFAULT), 'collection').length, 0);
  assert.equal(checkAnswer(wide, 'a'.repeat(MAX_LENGTH_DEFAULT + 1), 'collection').length, 1);
});

test('an enum lists its permitted values verbatim', () => {
  const p = enumP('mode', ['high-floor', 'near-zero-floor']);
  const b = checkAnswer(p, 'medium', 'collection');
  assert.deepEqual(codes(b), ['E-PARAM-INVALID']);
  assert.match(b.items[0]!.message, /high-floor, near-zero-floor/);
});

test('a boolean answer must be a boolean, and a string one a string', () => {
  const bool: ParameterDecl = { id: 'loud', prompt: 'Loud?', type: 'boolean' };
  assert.equal(checkAnswer(bool, true, 'collection').length, 0);
  assert.deepEqual(codes(checkAnswer(bool, 'true', 'collection')), ['E-PARAM-INVALID']);
  assert.deepEqual(codes(checkAnswer(str(), true, 'collection')), ['E-PARAM-INVALID']);
});

// Unreachable for a validated pack — E-PARAM-NO-PATTERN is exit 2 and
// fires first — so the question is only which way it fails.
test('a string parameter with no pattern fails closed', () => {
  assert.deepEqual(codes(checkAnswer({ id: 'x', prompt: 'x', type: 'string' }, 'anything', 'collection')), [
    'E-PARAM-INVALID',
  ]);
});

/* ── resolution ──────────────────────────────────────────────────────── */

test('a required parameter with no answer and no default is missing', () => {
  const { bag, answers } = resolveAnswers([str({ required: true })]);
  assert.deepEqual(codes(bag), ['E-PARAM-MISSING']);
  assert.equal(answers.size, 0);
});

test('an optional parameter with no answer and no default is simply absent', () => {
  const { bag, answers } = resolveAnswers([str()]);
  assert.deepEqual(codes(bag), []);
  assert.equal(answers.has('projectName'), false);
});

// US-8: recorded verbatim, INCLUDING defaults accepted without being typed.
// An unrecorded default stops being recomputable the moment the pack
// changes it — the tree stays right and verify can no longer say so.
test('an accepted default is recorded like any other answer', () => {
  const { answers } = resolveAnswers([str({ default: 'Untitled' })]);
  assert.equal(answers.get('projectName'), 'Untitled');
});

test('an invalid supplied answer is reported and not recorded', () => {
  const { bag, answers } = resolveAnswers([str()], new Map([['projectName', 'a/b']]));
  assert.deepEqual(codes(bag), ['E-PARAM-INVALID']);
  assert.equal(answers.size, 0, 'never recorded — the manifest would replay it forever');
});

test('a credential-shaped value warns and is still accepted', () => {
  const { bag, answers } = resolveAnswers(
    [str({ pattern: '^[A-Za-z0-9_-]{1,80}$' })],
    new Map([['projectName', 'a'.repeat(44)]]),
  );
  assert.deepEqual(codes(bag), ['W-ANSWER-LOOKS-SECRET']);
  assert.equal(answers.size, 1, 'a warning is not a refusal');
});

test('read-back re-checks every recorded answer', () => {
  const params = [str(), str({ id: 'tagline', pattern: '^[a-z]+$' })];
  const clean = new Map([['projectName', 'Demo'], ['tagline', 'fast']]);
  assert.deepEqual(codes(checkRecordedAnswers(params, clean)), []);

  const edited = new Map([['projectName', 'Demo'], ['tagline', 'FAST!!']]);
  assert.deepEqual(codes(checkRecordedAnswers(params, edited)), ['E-MANIFEST-ANSWER-INVALID']);
});

/* ── drift guard ─────────────────────────────────────────────────────── */

/**
 * F1 v4.6. The message enumerated SEVEN of the eight reserved flags — it
 * was not amended when v3.0 reserved `--dry-run`. A closed enumeration
 * inside a remedy, shown to the one reader who is by definition choosing a
 * name against it.
 */
test('E-PARAM-FLAG-INVALID lists exactly the reserved flags', () => {
  const line = MESSAGES['E-PARAM-FLAG-INVALID'].find((l: string) => l.includes('Reserved:'));
  assert.ok(line, 'the message must name the list it refuses against');
  const listed = line.slice(line.indexOf(':') + 1).split(',').map((s: string) => s.trim().replace(/^--/, ''));
  assert.deepEqual(listed.sort(), [...RESERVED_FLAGS].sort());
});

/* ── the real packs ─────────────────────────────────────────────────── */

// The pack-wide rules against the packs that ship, not against fixtures.
// `planning` is the only one declaring a `when`, and it is the only case in
// any v1.0 pack of content varying by an init answer (US-8).
test('every bundled pack passes the pack-wide parameter rules', async () => {
  for (const name of ['coding', 'writing', 'planning']) {
    const p = JSON.parse(
      await readFile(fileURLToPath(new URL('pack.json', packDir(name))), 'utf8'),
    ) as PackJson;
    assert.deepEqual(codes(checkParameterSet(p)), [], name);
    const { bag } = resolveAnswers(p.parameters, new Map());
    assert.deepEqual(
      codes(bag).filter((c) => c !== 'E-PARAM-MISSING'),
      [],
      `${name}: defaults must be valid answers`,
    );
  }
});
