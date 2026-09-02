/**
 * The strict reader, as a contract rather than as a parser. T-0312, C-25.
 *
 * `src/json/parse-strict.test.ts` covers the parser: the RFC 8259 grammar,
 * escapes, the BOM, what it refuses. **This file covers the four claims
 * US-1 makes about it**, and every one of them is a claim about the
 * *system*, not about a function:
 *
 *   1. A duplicate key in **any of the three documents** — `pack.json`,
 *      `recipe.json`, `.harness/manifest.json` — is
 *      `E-JSON-DUPLICATE-KEY`. One fault, one code, three files.
 *   2. **At depth 1 and at depth 3.** A duplicate nested three levels down
 *      is exactly as invisible to a diff reader as one at the top, and it
 *      is the nested ones that decide behaviour — a `when` clause, a
 *      recorded answer.
 *   3. **Both line numbers**, exit 2, nothing written.
 *   4. **Before any other check on the file.**
 *
 * ── Why the rule is worth a hand-rolled parser, in one sentence ───────
 *
 * §Error States and `pack info` make **the JSON diff a reviewer reads**
 * the control that catches a bad step. `JSON.parse` keeps the **last**
 * duplicate; a human reading a diff reads the **first** and stops. So a
 * document reviews as one thing and executes as another, and the control
 * is voided **by name**. Every fixture below is written so that the first
 * and last values *differ* — a fixture where they agreed would pass
 * whatever the parser did, and would be testing nothing.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { EXIT, snapshot, unchanged, withTempDir } from '../harness/cli.js';
import { exitClassFor, parseStrictJson, validatePackJson } from '../../dist/index.js';
import type { DiagnosticCode, JsonValue } from '../../dist/index.js';

const codes = (b: { items: readonly { code: DiagnosticCode }[] }): DiagnosticCode[] =>
  b.items.map((d) => d.code);

/**
 * The three documents, and the malformed code each carries.
 *
 * The codes differ because the **files** differ — different file,
 * different remedy, and §Error States forbids two interchangeable
 * messages. The duplicate code does **not** differ, because that fault and
 * its remedy are the same wherever it occurs.
 */
type Malformed = 'E-PACK-INVALID' | 'E-RECIPE-INVALID' | 'E-MANIFEST-CORRUPT';

interface Fixture {
  /** The document, as the diagnostic names it. */
  readonly file: string;
  readonly malformed: Malformed;
  /** Nesting level of the object holding the duplicate: the root's own
   *  keys are depth 1. */
  readonly depth: 1 | 3;
  readonly key: string;
  readonly first: number;
  readonly second: number;
  readonly text: string;
  /** Why a duplicate *here* is not a tidiness complaint. */
  readonly stake: string;
}

const FIXTURES: readonly Fixture[] = [
  {
    file: 'packs/coding/pack.json',
    malformed: 'E-PACK-INVALID',
    depth: 1,
    key: 'name',
    first: 3,
    second: 5,
    // A reviewer reads `coding`; the CLI would resolve `planning`. The
    // identity of the pack being applied is the first thing a review
    // establishes and the last thing anyone re-checks.
    stake: 'the pack a reviewer thinks is being applied',
    text: [
      '{',
      '  "formatVersion": 1,',
      '  "name": "coding",',
      '  "version": "1.0.0",',
      '  "name": "planning"',
      '}',
      '',
    ].join('\n'),
  },
  {
    file: 'packs/coding/pack.json',
    malformed: 'E-PACK-INVALID',
    depth: 3,
    key: 'status',
    first: 6,
    second: 8,
    // `status` is one of US-1's six behaviour-selecting positions. The
    // first occurrence says the part ships; the last says it is
    // unfinished. Both are legal values, which is exactly why the
    // duplicate is invisible — nothing downstream can tell it was two.
    stake: 'an anatomy status, which selects behaviour from a closed set',
    text: [
      '{',
      '  "name": "coding",',
      '  "anatomy": {',
      '    "process": {',
      '      "paths": ["specifications/**"],',
      '      "status": "present",',
      '      "note": "still settling",',
      '      "status": "provisional"',
      '    }',
      '  }',
      '}',
      '',
    ].join('\n'),
  },
  {
    file: 'packs/planning/recipe.json',
    malformed: 'E-RECIPE-INVALID',
    depth: 1,
    key: 'steps',
    first: 3,
    second: 6,
    // Two `steps` arrays: the reviewer reads the one that copies a
    // template, the CLI runs the one that does not. The recipe IS the
    // contract for what an apply produces.
    stake: 'the whole ordered plan an apply runs',
    text: [
      '{',
      '  "formatVersion": 1,',
      '  "steps": [',
      '    { "op": "copy", "from": "brief.md", "to": "specifications/brief.md" }',
      '  ],',
      '  "steps": []',
      '}',
      '',
    ].join('\n'),
  },
  {
    file: 'packs/planning/recipe.json',
    malformed: 'E-RECIPE-INVALID',
    depth: 3,
    key: 'constraintFloor',
    first: 9,
    second: 10,
    // The sharpest case in the file. US-8 permits `when` a SINGLE
    // equality — "no boolean operators, no negation, no multiple keys in
    // one `when`" — so a compound `when` is already a pack defect. Under
    // a stdlib parser it does not read as one: the duplicate collapses to
    // the last key and the step becomes a well-formed `when` selecting
    // the OTHER calibration. The malformed-recipe check would have
    // nothing to report, because by the time it looked there was nothing
    // wrong.
    stake: 'which calibration branch of the recipe runs',
    text: [
      '{',
      '  "formatVersion": 1,',
      '  "steps": [',
      '    {',
      '      "op": "copy",',
      '      "from": "calibrations/high-floor/gate.md",',
      '      "to": "planning/gate.md",',
      '      "when": {',
      '        "constraintFloor": "high-floor",',
      '        "constraintFloor": "near-zero-floor"',
      '      }',
      '    }',
      '  ]',
      '}',
      '',
    ].join('\n'),
  },
  {
    file: '.harness/manifest.json',
    malformed: 'E-MANIFEST-CORRUPT',
    depth: 1,
    key: 'pack',
    first: 4,
    second: 9,
    // The manifest is the USER's own committed file, and the rule holds
    // there for the same reason it holds for a pack: `verify` and
    // `update` recompute from it, and a manifest that reviews as `coding`
    // and recomputes as `planning` would report a whole-tree mismatch
    // with no visible cause.
    stake: 'which pack `verify` and `update` recompute against',
    text: [
      '{',
      '  "manifestVersion": 1,',
      '  "cli": "1.0.0",',
      '  "pack": {',
      '    "name": "coding",',
      '    "version": "1.0.0",',
      '    "formatVersion": 1',
      '  },',
      '  "pack": {',
      '    "name": "planning",',
      '    "version": "1.0.0",',
      '    "formatVersion": 1',
      '  },',
      '  "scaffolds": []',
      '}',
      '',
    ].join('\n'),
  },
  {
    file: '.harness/manifest.json',
    malformed: 'E-MANIFEST-CORRUPT',
    depth: 3,
    key: 'value',
    first: 11,
    second: 12,
    // §F1.4's manifest is only two levels deep, so a depth-3 duplicate
    // can only arrive by someone NESTING something the schema does not
    // permit. That is the point rather than a contrivance: US-8's C-29
    // says in as many words that a recorded answer is "an editable value
    // by this spec's own design", and the manifest carries no
    // self-integrity check. The reader must refuse the duplicate BEFORE
    // the manifest schema gets to object to the nesting — otherwise the
    // order of two checks decides which fault a user is shown.
    stake: 'a recorded answer, in a file this spec requires to be committed',
    text: [
      '{',
      '  "manifestVersion": 1,',
      '  "cli": "1.0.0",',
      '  "pack": {',
      '    "name": "coding",',
      '    "version": "1.0.0",',
      '    "formatVersion": 1',
      '  },',
      '  "parameters": {',
      '    "projectName": {',
      '      "value": "Lintel Harness",',
      '      "value": "Something Else"',
      '    }',
      '  }',
      '}',
      '',
    ].join('\n'),
  },
];

const label = (f: Fixture): string => `${f.file} at depth ${f.depth} ("${f.key}")`;

/* ── 1, 2 and 3: the code, the depths, both lines, the exit class ────── */

for (const f of FIXTURES) {
  test(`a duplicate key is refused: ${label(f)}`, () => {
    const r = parseStrictJson(f.text, f.file, f.malformed);

    // The CODE is the contract (§Error States); the prose below is an
    // additional check that the message says the useful thing, never the
    // assertion itself.
    assert.deepEqual(codes(r.bag), ['E-JSON-DUPLICATE-KEY'], f.stake);
    assert.equal(
      exitClassFor('E-JSON-DUPLICATE-KEY'),
      EXIT.integrityFault,
      'exit 2 — an integrity fault in an authored document, not something a user typed',
    );
    assert.equal(r.bag.exitCode(), EXIT.integrityFault);

    // No value survives. This is what makes claim 4 structural rather
    // than a matter of check ordering somebody has to remember: there is
    // nothing for a later check to run on.
    assert.equal(r.value, undefined, 'a document with two meanings has none to validate');

    // BOTH lines. "This key appears twice" is not actionable; "lines 6
    // and 8" sends the reader to the two places that disagree.
    const m = r.bag.items[0]!.message;
    assert.ok(m.includes(f.file), `names the file: ${m}`);
    assert.ok(m.includes(`"${f.key}"`), `names the key: ${m}`);
    assert.ok(
      m.includes(`(lines ${f.first} and ${f.second})`),
      `must name both lines, got: ${m}`,
    );
    assert.equal(r.bag.items[0]!.line, f.first, 'the diagnostic points at the first');
  });
}

test('depth 1 and depth 3 are both covered, in all three documents', () => {
  // A coverage assertion rather than a behaviour one, and it earns its
  // place: T-0312 asks for six cases and the way this file would decay is
  // by quietly losing one of them to a refactor.
  const seen = FIXTURES.map((f) => `${f.malformed}@${f.depth}`).sort();
  assert.deepEqual(seen, [
    'E-MANIFEST-CORRUPT@1',
    'E-MANIFEST-CORRUPT@3',
    'E-PACK-INVALID@1',
    'E-PACK-INVALID@3',
    'E-RECIPE-INVALID@1',
    'E-RECIPE-INVALID@3',
  ]);
});

// One fault, one code — the duplicate is the SAME code in all three
// documents, while a syntax fault is three codes because the remedy
// differs by file. Both halves matter: collapsing the first would make
// the message unwriteable, collapsing the second would make two messages
// interchangeable, which §Error States forbids.
test('the duplicate is one code across three documents; malformation is three', () => {
  for (const f of FIXTURES) {
    assert.deepEqual(codes(parseStrictJson(f.text, f.file, f.malformed).bag), [
      'E-JSON-DUPLICATE-KEY',
    ]);
  }

  const broken = '{ "a": }';
  const got = (['E-PACK-INVALID', 'E-RECIPE-INVALID', 'E-MANIFEST-CORRUPT'] as const).map(
    (c) => codes(parseStrictJson(broken, 'x.json', c).bag)[0],
  );
  assert.deepEqual(got, ['E-PACK-INVALID', 'E-RECIPE-INVALID', 'E-MANIFEST-CORRUPT']);
  for (const c of got) assert.equal(exitClassFor(c!), EXIT.integrityFault);
});

/**
 * The control this rule exists to protect, demonstrated rather than
 * asserted about.
 *
 * Every fixture is accepted by `JSON.parse`, and every one of them means
 * something different afterwards than it does on the page. That divergence
 * is the whole argument: the reviewer's reading and the CLI's reading are
 * not the same document.
 */
test('a stdlib parser accepts all six and silently keeps the LAST value', () => {
  for (const f of FIXTURES) {
    const lenient = JSON.parse(f.text) as Record<string, unknown>;
    assert.ok(lenient, `JSON.parse accepts ${label(f)} — that is the problem`);
  }

  // Spelled out on the two that decide a behaviour-selecting value.
  const pack = JSON.parse(FIXTURES[0]!.text) as { name: string };
  assert.equal(pack.name, 'planning', 'the diff says "coding"; the stdlib says "planning"');

  const recipe = JSON.parse(FIXTURES[3]!.text) as {
    steps: { when: Record<string, string> }[];
  };
  assert.deepEqual(
    recipe.steps[0]!.when,
    { constraintFloor: 'near-zero-floor' },
    'a compound `when` US-8 forbids collapses into a well-formed one selecting the other branch',
  );
});

/* ── 4: before any other check on the file ───────────────────────────── */

/**
 * `load-pack.ts`'s order, reproduced: strict parse, and only on a value
 * does the schema run. Written out here rather than imported because the
 * claim under test IS the order — a helper that hid it would be asserting
 * against itself.
 */
function readPackDeclaration(text: string, name: string) {
  const file = `packs/${name}/pack.json`;
  const parsed = parseStrictJson(text, file, 'E-PACK-INVALID');
  if (parsed.value === undefined) return { codes: codes(parsed.bag), pack: undefined };
  const validated = validatePackJson(parsed.value, name, file);
  return { codes: codes(validated.bag), pack: validated.pack };
}

/**
 * The ordering property, and the only shape that can fail when it is
 * wrong.
 *
 * A document carrying a duplicate key **and** two schema violations must
 * report the duplicate **alone**. Asserting that by itself proves nothing
 * — a validator that found no faults would pass too — so the second half
 * removes the duplicate and requires the schema faults to appear. They
 * were real, they were reachable, and they were not reported.
 */
test('a duplicate key suppresses every other finding on the file', () => {
  const withDuplicate = [
    '{',
    '  "formatVersion": 1,',
    '  "name": "demo",',
    '  "version": "1.0.0",',
    '  "title": "Demo",',
    '  "minCliVersion": "1.0.0",',
    '  "parameters": [',
    '    { "id": "flavour", "prompt": "Which?", "type": "strng" }',
    '  ],',
    '  "anatomy": {},',
    '  "name": "demo-two"',
    '}',
    '',
  ].join('\n');

  const first = readPackDeclaration(withDuplicate, 'demo');
  assert.deepEqual(first.codes, ['E-JSON-DUPLICATE-KEY'], 'the duplicate, and nothing else');
  assert.equal(first.pack, undefined);

  // The same file with the duplicate line removed. Everything the first
  // run did not say is here — nine missing anatomy parts and an
  // unrecognised `type`, which is one of US-1's six behaviour-selecting
  // positions and exit 2 in its own right.
  const withoutDuplicate = withDuplicate.replace('  "anatomy": {},\n  "name": "demo-two"\n', '  "anatomy": {}\n');
  const second = readPackDeclaration(withoutDuplicate, 'demo');
  assert.ok(second.codes.includes('E-UNKNOWN-VALUE'), `type "strng" is fatal: ${second.codes}`);
  assert.ok(second.codes.includes('E-ANATOMY-MISSING'), 'and nine parts are undeclared');
  assert.ok(
    second.codes.length > 1,
    'the faults the duplicate hid were plural, real, and reachable',
  );
});

/**
 * The same property for `recipe.json` and `.harness/manifest.json`, in the
 * form that is available today.
 *
 * There is no recipe reader (E-04) and no manifest reader (E-07) to run
 * *after* this one yet, so the end-to-end shape of the test above cannot
 * be written for those two. What can be asserted is the structural reason
 * the order holds at all: the reader returns **no value**, so no later
 * check has an input. When E-04 and E-07 land, this test should grow the
 * two-stage form above rather than stay as it is.
 */
test('nothing downstream can run, because the reader yields no value', () => {
  for (const f of FIXTURES.filter((x) => x.malformed !== 'E-PACK-INVALID')) {
    const r = parseStrictJson(f.text, f.file, f.malformed);
    assert.equal(r.value, undefined, label(f));
    assert.equal(r.bag.errors.length, 1, 'one fault, reported once');
  }
});

/* ── nothing written ─────────────────────────────────────────────────── */

/**
 * Reading a document that fails writes nothing.
 *
 * The fixtures are written to a real directory and read back off disk, so
 * the snapshot is a picture of a filesystem rather than of an argument —
 * `snapshot()` builds its entries from `readdir`, which reports the
 * on-disk spelling (C-36), and `unchanged()` compares content, mode and
 * membership. Exit 2 promises zero bytes; this is the half of that promise
 * a reader can be held to.
 */
test('refusing all six documents leaves the project byte-identical', async () => {
  await withTempDir(async (dir) => {
    const written: { path: string; f: Fixture }[] = [];
    for (const [i, f] of FIXTURES.entries()) {
      const path = join(dir, `case-${i}`, f.file);
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, f.text, 'utf8');
      written.push({ path, f });
    }

    const before = await snapshot(dir);

    for (const { path, f } of written) {
      const text = await readFile(path, 'utf8');
      const r = parseStrictJson(text, f.file, f.malformed);
      assert.deepEqual(codes(r.bag), ['E-JSON-DUPLICATE-KEY'], label(f));
      assert.equal(r.bag.exitCode(), EXIT.integrityFault);
    }

    assert.ok(unchanged(before, await snapshot(dir)), 'zero bytes written');
  });
});

/* ── the rule is total: three documents and no fourth ────────────────── */

// US-1: "the same reader parses `recipe.json` (US-31) and
// `.harness/manifest.json` (US-15); they are the only three JSON
// documents the CLI parses, so the rule is total." The malformed-code
// parameter is the enumeration made structural — a fourth document would
// need a fourth code, and adding one is a spec change.
test('the malformed code is a closed set of three', () => {
  const all: Malformed[] = ['E-PACK-INVALID', 'E-RECIPE-INVALID', 'E-MANIFEST-CORRUPT'];
  assert.deepEqual([...new Set(FIXTURES.map((f) => f.malformed))].sort(), [...all].sort());
});

// A duplicate is per OBJECT, not per document: two objects may each carry
// the same key, and a rule that said otherwise would refuse every recipe
// with two `copy` steps.
test('the same key in two sibling objects is not a duplicate', () => {
  const text = [
    '{',
    '  "steps": [',
    '    { "op": "copy", "to": "a.md" },',
    '    { "op": "copy", "to": "b.md" }',
    '  ]',
    '}',
  ].join('\n');
  const r = parseStrictJson(text, 'packs/coding/recipe.json', 'E-RECIPE-INVALID');
  assert.deepEqual(codes(r.bag), []);
  assert.notEqual(r.value as JsonValue | undefined, undefined);
});
