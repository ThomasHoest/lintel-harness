import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  JOURNAL_VERSION,
  buildJournal,
  readJournal,
  rollbackCommandFor,
  type PlannedWrite,
} from './journal.js';
import { hashBytes } from '../hash/sha256.js';
import { confinePath } from '../security/confine.js';
import type { WritablePath } from '../security/harness-paths.js';

const codes = (b: { items: readonly { code: string }[] }): string[] => b.items.map((d) => d.code);
const B = (s: string): Buffer => Buffer.from(s, 'utf8');
const p = (s: string): WritablePath => {
  const r = confinePath(s, { index: 0 });
  if (r.path === undefined) throw new Error(s);
  return r.path;
};

const write = (over: Partial<PlannedWrite> = {}): PlannedWrite => ({
  path: p('a.md'),
  bytes: B('new'),
  intent: 'write',
  pre: null,
  ...over,
});

/* ── the shape ───────────────────────────────────────────────────────── */

test('a created path records no pre-state and needs no backup', () => {
  const j = buildJournal('init', [write()], []);
  assert.equal(j.version, JOURNAL_VERSION);
  assert.equal(j.command, 'init');
  const e = j.entries[0]!;
  assert.equal(e.preExisting, false);
  assert.equal(e.preHash, null);
  assert.equal(e.backup, undefined);
  assert.equal(e.sha256, hashBytes(B('new')));
});

/**
 * A backup exactly when there is something to lose: the path exists **and**
 * the bytes are about to change. Re-writing identical bytes is not an
 * overwrite worth paying for, and a backup per path would double the cost
 * of every apply for the case that never needs one.
 */
test('a backup is written only for a genuine overwrite', () => {
  const changing = buildJournal('init', [write({ pre: { bytes: B('old'), mode: 0o644 } })], []);
  assert.equal(typeof changing.entries[0]!.backup, 'string');

  const identical = buildJournal('init', [write({ pre: { bytes: B('new'), mode: 0o644 } })], []);
  assert.equal(identical.entries[0]!.backup, undefined, 'same bytes: nothing is being lost');
  assert.equal(identical.entries[0]!.preExisting, true, 'but it did exist, and that is recorded');
});

/**
 * **`intent` exists because `update` deletes** (Q-62). The five-case
 * rollback table models overwriting and creating but **not deleting** —
 * rolling back a delete means restoring from `journal.d/` with **no
 * intended hash to compare against**, a case the table has no row for.
 */
test('a delete carries a backup and no intended hash', () => {
  const j = buildJournal('update', [write({ intent: 'delete', pre: { bytes: B('old'), mode: 0o644 } })], []);
  const e = j.entries[0]!;
  assert.equal(e.intent, 'delete');
  assert.equal(e.sha256, undefined, 'there is nothing intended');
  assert.equal(typeof e.backup, 'string', 'and always something to restore');
});

// Uniform rather than optional: an optional discriminator is one a reader
// can forget to check.
test('init writes intent on every entry rather than omitting it', () => {
  const j = buildJournal('init', [write(), write({ path: p('b.md') })], []);
  assert.deepEqual(j.entries.map((e) => e.intent), ['write', 'write']);
});

test('created directories are kept in order', () => {
  const j = buildJournal('init', [], ['a', 'a/b', 'a/b/c']);
  assert.deepEqual(j.createdDirs, ['a', 'a/b', 'a/b/c']);
});

/* ── reading, and refusing ───────────────────────────────────────────── */

test('a well-formed journal round-trips', () => {
  const built = buildJournal('init', [write({ pre: { bytes: B('old'), mode: 0o644 } })], ['d']);
  const { journal, bag } = readJournal(JSON.parse(JSON.stringify(built)));
  assert.deepEqual(codes(bag), []);
  assert.deepEqual(journal, built);
});

/**
 * **Never guessed.** A journal is the record of an interrupted write, and
 * acting on a half-understood one is how a recovery destroys what it was
 * trying to save. Version 1 never shipped, and this is what guarantees it
 * never can.
 */
test('any version but 3 is refused rather than interpreted', () => {
  for (const version of [1, 2, 4, '3', undefined, null]) {
    const bag = readJournal({ version, command: 'init', entries: [], createdDirs: [] }).bag;
    assert.deepEqual(codes(bag), ['E-JOURNAL-UNREADABLE'], String(version));
  }
});

test('a malformed journal is refused with the reason named', () => {
  const cases: [unknown, RegExp][] = [
    [[], /top level is not an object/],
    [{ version: 3, command: 'apply', entries: [], createdDirs: [] }, /declares command/],
    [{ version: 3, command: 'init', entries: {}, createdDirs: [] }, /"entries" is not an array/],
    [{ version: 3, command: 'init', entries: [], createdDirs: 'a' }, /"createdDirs" is not an array/],
  ];
  for (const [value, message] of cases) {
    const { journal, bag } = readJournal(value);
    assert.deepEqual(codes(bag), ['E-JOURNAL-UNREADABLE']);
    assert.match(bag.items[0]!.message, message);
    assert.equal(journal, undefined, 'and nothing is returned to act on');
  }
});

/**
 * The two shapes the intents differ on are **checked, not assumed** — this
 * is the discriminator rollback branches on, so a journal that lies about
 * it would send rollback down the wrong path with full confidence.
 */
test('an entry whose intent disagrees with its shape is refused', () => {
  const entry = (over: Record<string, unknown>) => ({
    version: 3,
    command: 'update',
    createdDirs: [],
    entries: [{ path: 'a.md', intent: 'write', preExisting: false, preHash: null, preMode: null, sha256: 'x', ...over }],
  });

  assert.match(
    readJournal(entry({ intent: 'delete', sha256: 'x', backup: 'b' })).bag.items[0]!.message,
    /is a delete and carries an intended hash/,
  );
  assert.match(
    readJournal(entry({ sha256: undefined })).bag.items[0]!.message,
    /is a write and carries no intended hash/,
  );
  assert.match(
    readJournal(entry({ intent: 'delete', sha256: undefined })).bag.items[0]!.message,
    /is a delete with no backup to restore from/,
  );
});

/* ── the remedy ──────────────────────────────────────────────────────── */

/**
 * Through v2.9 `E-JOURNAL-PRESENT`'s remedy said `init --rollback`
 * unconditionally — which, after a crashed `update`, sends the user to a
 * command that answers `E-ALREADY-APPLIED` and leaves the journal exactly
 * where it was. **A remedy that cannot work is worse than none, because
 * the user believes they tried it.**
 */
test('the rollback remedy is rendered from the journal, not assumed', () => {
  assert.equal(rollbackCommandFor(buildJournal('init', [], [])), 'lintel harness init --rollback');
  assert.equal(rollbackCommandFor(buildJournal('update', [], [])), 'lintel harness update --rollback');
});
