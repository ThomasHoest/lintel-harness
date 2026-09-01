/**
 * The drift guard. T-0103.
 *
 * `codes.ts` is a projection of F1 §Error States. This test re-derives the
 * catalogue from that section on every run and fails on any divergence, so
 * the two cannot agree "until they do not" — which is the failure mode this
 * project has recorded four times in prose and is here made mechanical.
 *
 * If this fails: **the spec is authoritative.** Change F1 first, then the
 * module. A code invented in the module and absent from the table is the
 * defect, in that direction, because F1 owns the only catalogue and no
 * other document may invent a code.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { CODES, CODE_COUNT, classOf, exitClassFor, promotedByStrict, severityOf } from './codes.js';

const SPEC = fileURLToPath(
  new URL('../../specifications/v1.0/F1-spec-pack-format-and-manifest.md', import.meta.url),
);

interface SpecRow {
  code: string;
  exit: number;
  cls: 'defect' | 'notice' | null;
}

async function specCatalogue(): Promise<SpecRow[]> {
  const src = await readFile(SPEC, 'utf8');
  const start = src.indexOf('\n## Error States');
  const end = src.indexOf('\n## Non-Functional Requirements', start);
  assert.ok(start > 0 && end > start, 'could not locate §Error States');

  const rows: SpecRow[] = [];
  for (const line of src.slice(start, end).split('\n')) {
    const code = /^\| `([EW]-[A-Z0-9-]+)`/.exec(line)?.[1];
    if (!code) continue;
    const exitMatch = /Exit (\d)/.exec(line)?.[1];
    const clsMatch = /\*\*Class `(defect|notice)`\*\*/.exec(line)?.[1] as 'defect' | 'notice' | undefined;
    rows.push({
      code,
      exit: exitMatch !== undefined ? Number(exitMatch) : 0,
      cls: clsMatch ?? null,
    });
  }
  return rows;
}

test('the module carries exactly the codes F1 §Error States declares', async () => {
  const spec = await specCatalogue();
  const specCodes = spec.map((r) => r.code).sort();
  const moduleCodes = Object.keys(CODES).sort();

  const missing = specCodes.filter((c) => !moduleCodes.includes(c));
  const invented = moduleCodes.filter((c) => !specCodes.includes(c));
  assert.deepEqual(missing, [], 'codes in the spec but not the module');
  assert.deepEqual(invented, [], 'codes in the module but not the spec — F1 owns the catalogue');
  assert.equal(CODE_COUNT, specCodes.length);
});

test('every exit class matches the spec row it came from', async () => {
  for (const row of await specCatalogue()) {
    assert.equal(
      exitClassFor(row.code as keyof typeof CODES),
      row.exit,
      `${row.code}: exit class diverged from F1`,
    );
  }
});

test('every W- code is classified, and E- codes carry no class', async () => {
  for (const row of await specCatalogue()) {
    const entry = CODES[row.code as keyof typeof CODES];
    if (row.code.startsWith('W-')) {
      assert.equal(entry.class, row.cls, `${row.code}: class diverged from F1`);
      assert.notEqual(row.cls, null, `${row.code} is unclassified in F1 — every W- code must declare one`);
    } else {
      assert.equal(entry.class, undefined, `${row.code} is an error and must carry no class axis`);
      assert.equal(severityOf(row.code as keyof typeof CODES), 'error');
    }
  }
});

// Fail-closed (F1 §Error States). A forgotten classification must make CI
// louder, not quieter — the opposite default is the failure mode this
// project has hit twice.
test('an unclassified warning resolves to defect, not notice', () => {
  const unclassified = { severity: 'warning', exit: 0 } as (typeof CODES)[keyof typeof CODES];
  const probe = { ...CODES, 'W-PROBE': unclassified } as unknown as typeof CODES;
  const cls = probe['W-PROBE' as keyof typeof CODES].class ?? 'defect';
  assert.equal(cls, 'defect');
});

// Q-60. --strict promotes defects only, and never a notice under any flag.
test('--strict promotes every defect and no notice', () => {
  const warnings = (Object.keys(CODES) as (keyof typeof CODES)[]).filter(
    (c) => severityOf(c) === 'warning',
  );
  assert.ok(warnings.length > 0, 'the catalogue must contain warnings');
  for (const c of warnings) {
    assert.equal(promotedByStrict(c), classOf(c) === 'defect', `${c}`);
  }
  const notices = warnings.filter((c) => classOf(c) === 'notice');
  assert.ok(notices.length > 0, 'planning emits notices by design — Q-60');
  for (const c of notices) assert.equal(promotedByStrict(c), false, `${c} must never promote`);
});

test('no error code claims exit 0', () => {
  for (const c of Object.keys(CODES) as (keyof typeof CODES)[]) {
    if (severityOf(c) === 'error') assert.notEqual(exitClassFor(c), 0, `${c} exits 0`);
  }
});
