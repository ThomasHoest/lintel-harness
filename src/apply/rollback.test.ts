import { test } from 'node:test';
import assert from 'node:assert/strict';
import { keptPaths, planRollback } from './rollback.js';
import { hashBytes } from '../hash/sha256.js';
import type { Journal, JournalEntry } from '../fs/journal.js';

const codes = (b: { items: readonly { code: string }[] }): string[] => b.items.map((d) => d.code);
const B = (s: string): Buffer => Buffer.from(s, 'utf8');
const H = (s: string): string => hashBytes(B(s));

const journal = (entries: JournalEntry[], createdDirs: string[] = []): Journal => ({
  version: 3,
  command: 'init',
  entries,
  createdDirs,
});

const entry = (over: Partial<JournalEntry> = {}): JournalEntry => ({
  path: 'a.md',
  intent: 'write',
  sha256: H('written'),
  preExisting: false,
  preHash: null,
  preMode: null,
  ...over,
});

const decide = (e: JournalEntry, disk: string | null) =>
  planRollback(journal([e]), () => (disk === null ? null : B(disk)));

/* ── the five rows, one test each ────────────────────────────────────── */

test('row 1 — we created it and it is still ours: delete', () => {
  const p = decide(entry(), 'written');
  assert.equal(p.decisions[0]!.action, 'delete');
  assert.deepEqual(codes(p.bag), []);
});

/**
 * **The clause that matters.** A crashed apply leaves a project a user may
 * have touched — they came back to a half-written tree and started fixing
 * it. Rollback must never undo that, so every row is gated on *the file is
 * still exactly what we put there*.
 */
test('row 2 — we created it and the user has since edited it: keep', () => {
  const p = decide(entry(), 'the user fixed this by hand');
  assert.equal(p.decisions[0]!.action, 'keep');
  assert.deepEqual(codes(p.bag), ['W-ROLLBACK-KEPT']);
  assert.match(p.bag.items[0]!.message, /created it and it has since been edited/);
});

/**
 * `--force`'s byte-identical case. The file was already correct and **was
 * never ours**, so there is nothing to undo.
 *
 * F1 v5.5: this is the row whose message used to read *"it has changed
 * since it was written"* — false, and alarming, on the one row where
 * nothing happened at all.
 */
test('row 3 — it was already byte-identical: leave untouched, and say so truthfully', () => {
  const same = H('written');
  const p = decide(entry({ preExisting: true, preHash: same }), 'written');
  assert.equal(p.decisions[0]!.action, 'keep');
  assert.match(p.bag.items[0]!.message, /was already byte-identical before this apply/);
  assert.equal(
    p.bag.items[0]!.message.includes('has changed'),
    false,
    'the file changed not at all; saying otherwise is false and alarming',
  );
});

test('row 4 — we overwrote it and it is unchanged since: restore', () => {
  const p = decide(entry({ preExisting: true, preHash: H('old'), backup: '.harness/journal.d/00000' }), 'written');
  assert.equal(p.decisions[0]!.action, 'restore');
  assert.equal(p.decisions[0]!.backup, '.harness/journal.d/00000');
  assert.deepEqual(codes(p.bag), []);
});

test('row 5 — it has been edited since, whatever the journal says: keep', () => {
  for (const preHash of [H('old'), H('written')]) {
    const p = decide(entry({ preExisting: true, preHash }), 'edited after the crash');
    assert.equal(p.decisions[0]!.action, 'keep', preHash);
    assert.match(p.bag.items[0]!.message, /edited since this apply wrote it/);
  }
});

test('a file that vanished after the crash is kept, not recreated', () => {
  const p = decide(entry({ preExisting: true, preHash: H('old') }), null);
  assert.equal(p.decisions[0]!.action, 'keep');
});

/* ── delete entries (Q-62) ───────────────────────────────────────────── */

/**
 * The row the five-case table has **no entry for**: rolling back a delete
 * means restoring from `journal.d/` with no intended hash to compare
 * against. "Still exactly what we wrote" means "still absent".
 */
test('a rolled-back delete restores when the path is still gone', () => {
  const e = entry({ intent: 'delete', preExisting: true, preHash: H('old'), backup: '.harness/journal.d/00000' });
  delete (e as { sha256?: string }).sha256;

  const gone = decide(e, null);
  assert.equal(gone.decisions[0]!.action, 'restore');
  assert.equal(gone.decisions[0]!.backup, '.harness/journal.d/00000');

  const recreated = decide(e, 'someone put it back');
  assert.equal(recreated.decisions[0]!.action, 'keep');
  assert.match(recreated.bag.items[0]!.message, /recreated after the crash/);
});

/* ── directories and the report ──────────────────────────────────────── */

/**
 * Reverse creation order is the **only** order in which "remove when
 * empty" can succeed: a parent still holding its child is not empty.
 */
test('created directories come back reversed, for removal only when empty', () => {
  const p = planRollback(journal([], ['a', 'a/b', 'a/b/c']), () => null);
  assert.deepEqual(p.removeDirs, ['a/b/c', 'a/b', 'a']);
});

// `notice`, never `defect`: rollback kept the file ON PURPOSE, and there
// is nothing the user could change to clear it.
test('every kept path is a notice, and every one is reported', () => {
  const p = planRollback(
    journal([entry({ path: 'x.md' }), entry({ path: 'y.md' }), entry({ path: 'z.md' })]),
    (path) => (path === 'z.md' ? B('written') : B('edited')),
  );
  assert.equal(keptPaths(p).length, 2);
  assert.equal(p.decisions[2]!.action, 'delete');
  for (const d of p.bag.items) assert.equal(d.class, 'notice');
});
