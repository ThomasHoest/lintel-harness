import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkTargets, preExistingByKey, type ExistingFile } from './target-exists.js';
import { confinePath, type AppliedPath } from '../security/confine.js';
import type { PlannedFile } from './plan.js';

const codes = (b: { items: readonly { code: string }[] }): string[] => b.items.map((d) => d.code);
const B = (s: string): Buffer => Buffer.from(s, 'utf8');
const ap = (p: string): AppliedPath => {
  const r = confinePath(p, { index: 0 });
  if (r.path === undefined) throw new Error(p);
  return r.path;
};

const planned = (path: string, content = 'planned'): PlannedFile => ({
  path: ap(path),
  bytes: B(content),
  phase: 2,
  executable: false,
  preExisting: false,
  preHash: null,
  preMode: null,
});

const disk = (path: string, content: string): ExistingFile => ({ path, bytes: B(content) });

test('an empty tree passes', () => {
  const r = checkTargets([planned('a.md')], [], false);
  assert.equal(r.ok, true);
  assert.deepEqual(codes(r.bag), []);
});

test('an existing target blocks, and the message lists it', () => {
  const r = checkTargets([planned('a.md')], [disk('a.md', 'theirs')], false);
  assert.equal(r.ok, false);
  assert.deepEqual(codes(r.bag), ['E-TARGET-EXISTS']);
  assert.match(r.bag.items[0]!.message, /1 files already exist/);
  assert.match(r.bag.items[0]!.message, /a\.md/);
});

/**
 * `--force` is **not** "overwrite anyway". It is *"these files are already
 * what I would write, so writing them changes nothing"* — so a differing
 * file still stops the run.
 */
test('--force excuses byte-identical files and nothing else', () => {
  const files = [planned('same.md'), planned('different.md')];
  const existing = [disk('same.md', 'planned'), disk('different.md', 'theirs')];

  const forced = checkTargets(files, existing, true);
  assert.equal(forced.ok, false);
  assert.deepEqual(forced.identical, ['same.md']);
  assert.deepEqual(forced.blocking, ['different.md']);
  assert.match(forced.bag.items[0]!.message, /1 files already exist/, 'only the differing one');

  assert.equal(checkTargets([planned('same.md')], [disk('same.md', 'planned')], true).ok, true);
});

// Without --force, an identical file still blocks: the user asked to apply
// into a directory and it was not empty, which is a fact they should learn
// before anything is written.
test('without --force an identical file still blocks', () => {
  const r = checkTargets([planned('a.md')], [disk('a.md', 'planned')], false);
  assert.equal(r.ok, false);
  assert.deepEqual(r.identical, ['a.md']);
});

/* ── the case that makes rollback destructive ────────────────────────── */

/**
 * **The reason all three comparisons use `collisionKey`.**
 *
 * A project holding `.claude/Settings.json` and a step writing
 * `.claude/settings.json` are **the same file** on macOS and Windows.
 * Under `===`:
 *
 *   1. the existence test misses it — the paths differ as strings;
 *   2. the apply silently **overwrites the user's file**;
 *   3. the journal records `preExisting: false`, so **no backup is taken**;
 *   4. `--rollback` then **deletes a file it did not create**.
 *
 * That is the invariant C-13 and G-F1-6 both state, broken by one `===`.
 */
test('a target differing only by case is found, and the user’s spelling is reported', () => {
  const r = checkTargets([planned('docs/Readme.md')], [disk('docs/README.md', 'theirs')], false);
  assert.equal(r.ok, false);
  assert.deepEqual(r.blocking, ['docs/README.md'], 'named as the user has it (C-36)');
});

/**
 * **Unconditional, with no `process.platform` check.** A plan computed on
 * Linux is rolled back on the machine that ran it — but a repository is
 * shared, and the case-folding filesystem is not necessarily the one that
 * planned.
 */
test('the case rule does not depend on the platform running the test', () => {
  const r = checkTargets([planned('A.md')], [disk('a.md', 'theirs')], false);
  assert.equal(r.ok, false, 'this must fail on Linux too, where the two really are different files');
});

// The third comparison, and the one whose failure is silent: a wrong
// `null` here means no backup is taken.
test('preExisting is decided by the same key, not by string equality', () => {
  const existing = [disk('.claude/Settings.json', 'theirs')];
  assert.notEqual(preExistingByKey('.claude/settings.json', existing), null);
  assert.equal(preExistingByKey('.claude/other.json', existing), null);
});

/* ── scope ───────────────────────────────────────────────────────────── */

// Phase 1 is `.harness/pack/`, the CLI's own tree; an existing one is
// E-ALREADY-APPLIED's business, not this check's.
test('phase 1 destinations are not this check’s subject', () => {
  const phase1: PlannedFile = { ...planned('a.md'), phase: 1 };
  assert.equal(checkTargets([phase1], [disk('a.md', 'theirs')], false).ok, true);
});

test('at most ten paths are listed, and the total is stated', () => {
  const files = Array.from({ length: 14 }, (_, i) => planned(`f${i}.md`));
  const existing = files.map((f, i) => disk(`f${i}.md`, 'theirs'));
  const r = checkTargets(files, existing, false);
  const lines = r.bag.items[0]!.message.split('\n');
  assert.match(lines[0]!, /14 files already exist/);
  assert.equal(lines.filter((l) => /^\s+f\d+\.md$/.test(l)).length, 10);
});
