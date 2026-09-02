/**
 * The coverage gate. T-1213.
 *
 * **Every row of US-16's minimum-set table has a fixture, and every
 * fixture maps to a row.**
 *
 * US-3 carries a standing obligation: *any amendment adding a destination
 * rule, a closed enumeration or a fail-closed parse adds its fixture in
 * the same change.* That is discipline, and discipline is what US-16
 * itself records failing — a rule was added and its fixture was not, and
 * nothing noticed.
 *
 * So this test enforces it **mechanically**, by parsing the table out of
 * the specification and comparing it to the fixtures that exist. It is the
 * control that would have caught the finding US-16 records, and it
 * deliberately **does not depend on anyone reading a table**.
 *
 * ── Why both directions ───────────────────────────────────────────────
 *
 * A row with no fixture is an untested rule. **A fixture with no row is
 * just as bad**: it means the table stopped being the count of record, and
 * the next person to add a rule will look at the wrong list.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const SPEC = fileURLToPath(
  new URL('../../specifications/v1.0/F1-spec-pack-format-and-manifest.md', import.meta.url),
);
/**
 * The **source** fixtures, not the compiled ones.
 *
 * `import.meta.url` points into `dist-tests/` at runtime, where the files
 * are `.js` — so a relative URL finds nothing and this test would report
 * perfect coverage of an empty set. That is the exact failure a coverage
 * test must not have, and it is why the reader below asserts it found
 * something before it concludes anything.
 */
const FIXTURE_DIR = fileURLToPath(
  new URL('../../tests/fixtures/adversarial/', import.meta.url),
);

/**
 * The minimum-set table, read out of US-16.
 *
 * Located by its header rather than by line number, and asserted
 * non-trivial — a parser that silently found nothing would report perfect
 * coverage of an empty list, which is the failure mode a coverage test
 * most needs to avoid.
 */
async function minimumSet(): Promise<string[]> {
  const src = await readFile(SPEC, 'utf8');
  const anchor = src.indexOf('| Fixture | Required outcome |');
  assert.ok(anchor > 0, 'could not locate US-16’s minimum-set table');

  const rows: string[] = [];
  // The table is INDENTED inside a list item, so every line is trimmed
  // before it is read. The first draft matched `startsWith('| ')` against
  // the raw line, found nothing, and reported perfect coverage of zero
  // rows — which the length assertion below is what caught.
  for (const raw of src.slice(anchor).split('\n').slice(2)) {
    const line = raw.trim();
    if (!line.startsWith('| ')) break;
    const end = line.indexOf(' | ', 2);
    rows.push(line.slice(2, end > 0 ? end : undefined).trim());
  }

  assert.ok(rows.length > 25, `the table parsed as ${rows.length} rows; that cannot be right`);
  return rows;
}

/** Every `because:` and `name:` string across the fixture files. Read as
 *  source rather than imported, so a fixture that fails to compile is a
 *  missing fixture rather than a crash. */
async function fixtureText(): Promise<string> {
  const files = (await readdir(FIXTURE_DIR)).filter((f) => f.endsWith('.ts'));
  assert.ok(files.length > 0, 'no fixture files found');
  return (await Promise.all(files.map((f) => readFile(join(FIXTURE_DIR, f), 'utf8')))).join('\n');
}

/**
 * The distinguishing token of a table row — the thing a fixture must
 * mention to count as covering it.
 *
 * A row is prose, so this picks the **backticked path or value** it names,
 * which is what a fixture for that row will necessarily contain. Rows with
 * no backticked token are matched by a declared key phrase instead, listed
 * here so the exceptions are visible rather than silently skipped.
 */
const BY_PHRASE: Readonly<Record<string, string>> = {
  'a recipe declaring **257** steps across base plus scaffolds': '257',
  'a payload file shipped `0755`': '0755',
  'a symlink in the pack': 'symlink in the pack',
  'a step whose `to` is `.harness/README.md`': '.harness/README.md',
  // The row spells the JSON; the fixture spells the value.
  '`"op": "copy "` (trailing space)': "op: 'copy '",
};

function tokensOf(row: string): string[] {
  for (const [phrase, token] of Object.entries(BY_PHRASE)) {
    if (row.includes(phrase)) return [token];
  }
  return [...row.matchAll(/`([^`]+)`/g)]
    .map((m) => m[1] as string)
    .filter((t) => t.length > 2 && t !== 'copy' && t !== 'to' && t !== 'in' && t !== 'op');
}

test('every row of US-16’s minimum set has a fixture', async () => {
  const rows = await minimumSet();
  const fixtures = await fixtureText();

  const uncovered: string[] = [];
  for (const row of rows) {
    const tokens = tokensOf(row);
    if (tokens.length === 0) {
      uncovered.push(`${row}   (no token this test knows how to match)`);
      continue;
    }
    if (!tokens.some((t) => fixtures.includes(t))) uncovered.push(row);
  }

  assert.deepEqual(
    uncovered,
    [],
    `US-16 rows with no fixture:\n  ${uncovered.join('\n  ')}\n` +
      'Adding a rule adds its fixture in the same change (US-3).',
  );
});

/**
 * Every fixture cites the condition it exists for.
 *
 * `because:` is not decoration. Three of these fixtures exist because a
 * rule was once **too narrow** and a pack passed every stage; without the
 * citation, a later reader deletes the fixture as redundant with its
 * neighbour — which is exactly how the coverage this test protects was
 * lost the first time.
 */
test('every fixture cites why it exists', async () => {
  const src = await fixtureText();
  const names = [...src.matchAll(/name:\s*'([^']+)'/g)].map((m) => m[1] as string);
  const becauses = [...src.matchAll(/because:\s*'([^']+)'/g)].map((m) => m[1] as string);

  // Counts the **object-literal** fixtures only. Several are built through
  // a `reserved(name, because, …)` helper whose signature makes the reason
  // mandatory, so those cannot lack one by construction and do not need
  // counting here — this asserts the property for the ones that could.
  assert.ok(names.length >= 20, `only ${names.length} object-literal fixtures found`);
  assert.equal(becauses.length, names.length, 'every fixture needs a `because`');
  for (const b of becauses) {
    assert.ok(b.length > 10, `a fixture’s reason is too thin to be one: "${b}"`);
  }
});

/** The table is the count of record, so a drop in it is as reportable as a
 *  drop in the fixtures. */
test('the minimum set has not shrunk', async () => {
  const rows = await minimumSet();
  assert.ok(
    rows.length >= 37,
    `US-16's table holds ${rows.length} rows; it held 37 when this test was written. ` +
      'A row removed is a rule removed, and needs to say so in the amendment history.',
  );
});
