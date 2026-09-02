import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STALE_AFTER_MS, decideLock, lockContents, readLock, type LockFile } from './lock.js';

const codes = (b: { items: readonly { code: string }[] }): string[] => b.items.map((d) => d.code);
const NOW = Date.parse('2026-09-02T12:00:00.000Z');

const lock = (over: Partial<LockFile> = {}): LockFile => ({
  pid: 4242,
  host: 'thishost',
  startedAt: new Date(NOW - 5_000).toISOString(),
  cli: '1.0.0',
  ...over,
});

const ctx = (alive: boolean, host = 'thishost') => ({
  host,
  now: NOW,
  isAlive: () => alive,
});

test('no lock means take it', () => {
  const d = decideLock(null, ctx(false));
  assert.equal(d.acquire, true);
  assert.deepEqual(codes(d.bag), []);
});

test('a live lock is held, and the message names who holds it', () => {
  const d = decideLock(lock(), ctx(true));
  assert.equal(d.acquire, false);
  assert.deepEqual(codes(d.bag), ['E-LOCK-HELD']);
  assert.match(d.bag.items[0]!.message, /pid 4242 on thishost/);
});

/**
 * **All three conditions, because each alone is wrong.**
 *
 *   host alone      breaks a running lock;
 *   liveness alone  breaks a lock whose pid was **reused** — pids recycle,
 *                   and on a busy machine quickly;
 *   age alone       breaks a lock held by a long apply, which is exactly
 *                   the case the lock exists for.
 */
test('a stale lock is broken only when all three conditions hold', () => {
  const stale = lock({ startedAt: new Date(NOW - STALE_AFTER_MS - 1).toISOString() });

  const broken = decideLock(stale, ctx(false));
  assert.equal(broken.breakStale, true);
  assert.deepEqual(codes(broken.bag), ['W-LOCK-STALE-BROKEN']);

  // dead and old, but another host — this CLI cannot know whether that
  // process is alive, so it does not guess.
  assert.equal(decideLock({ ...stale, host: 'elsewhere' }, ctx(false)).acquire, false);
  // dead and this host, but young: a long apply is the case the lock is for.
  assert.equal(decideLock(lock(), ctx(false)).acquire, false);
  // this host and old, but alive.
  assert.equal(decideLock(stale, ctx(true)).acquire, false);
});

// `notice`, never `defect`: the user did nothing wrong and nothing they
// could change would clear it, so `--strict` must not promote it.
test('breaking a stale lock is a notice, not a defect', () => {
  const stale = lock({ startedAt: new Date(NOW - STALE_AFTER_MS - 1).toISOString() });
  const d = decideLock(stale, ctx(false));
  assert.equal(d.bag.items[0]!.class, 'notice');
});

// An unparseable date must read as "not old enough to break", never as a
// NaN comparison that happens to help.
test('a malformed timestamp is never old enough to break', () => {
  const d = decideLock(lock({ startedAt: 'not a date' }), ctx(false));
  assert.equal(d.acquire, false);
  assert.deepEqual(codes(d.bag), ['E-LOCK-HELD']);
});

/**
 * A lock this CLI cannot read might have been written by a version that
 * can, and removing it would break that run. Fail closed on the side of
 * not interfering.
 */
test('a malformed lock file is unreadable, and therefore not breakable', () => {
  for (const value of [null, [], 'x', { pid: '1' }, { pid: 1, host: 'h' }]) {
    assert.equal(readLock(value).malformed, true, JSON.stringify(value));
    assert.equal(readLock(value).lock, undefined);
  }
  assert.deepEqual(readLock(lock()).lock, lock());
});

test('the lock records this process, in UTC', () => {
  const l = lockContents('1.0.0', 'h', new Date(NOW));
  assert.equal(l.pid, process.pid);
  assert.equal(l.startedAt, '2026-09-02T12:00:00.000Z');
  assert.equal(l.cli, '1.0.0');
});
