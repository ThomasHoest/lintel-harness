import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summaryLines, toJson, verifyExitCode } from './verify.js';
import { verifyProject, type RecomputedPath } from '../../verify/verify.js';
import { treeDigest } from '../../hash/digest.js';
import { confinePath, type AppliedPath } from '../../security/confine.js';
import type { Answer } from '../../pack/parameters.js';

const ap = (p: string): AppliedPath => confinePath(p, { index: 0 }).path!;
const B = (s: string): Buffer => Buffer.from(s, 'utf8');
const D = treeDigest([{ path: 'a', sha256: 'a'.repeat(64) }]);

const rp = (p: string, over: Partial<RecomputedPath> = {}): RecomputedPath => ({
  path: ap(p),
  bytes: B('expected'),
  mode: 0o644,
  adaptExpected: false,
  fillExpected: false,
  ...over,
});

const run = (recomputed: RecomputedPath[], disk: (p: string) => string | null, digest = D) =>
  verifyProject({
    recordedDigest: D,
    computedDigest: digest,
    declarations: [],
    recordedAnswers: new Map<string, Answer>(),
    recomputed,
    onDisk: (p) => {
      const v = disk(p);
      return v === null ? null : { bytes: B(v), mode: 0o644 };
    },
  });

/* ── the exit rule, over all six states ──────────────────────────────── */

/**
 * **T-1003's own text enumerates four of the six.** *"Exit 0 when every
 * path is `match` or `adapted` … exit 1 on any `differs` or `missing`"* —
 * which leaves `filled` and `unfilled` in neither clause. §F1 settles the
 * behaviour (both are non-failure and neither moves the exit code), but
 * the task's sentence is a closed enumeration written before Q-79 added
 * two states, so this asserts all six rather than the four it names.
 */
test('exit 0 covers all four non-failing states, not just two', () => {
  const r = run(
    [
      rp('m.md'),
      rp('a.md', { adaptExpected: true }),
      rp('f.md', { fillExpected: true }),
      rp('u.md', { fillExpected: true }),
    ],
    (p) => (p === 'a.md' || p === 'f.md' ? 'changed' : 'expected'),
  );
  assert.equal(verifyExitCode(r), 0);
  assert.deepEqual(r.counts, { match: 1, adapted: 1, filled: 1, unfilled: 1, differs: 0, missing: 0 });
});

test('exit 1 on differs or missing', () => {
  assert.equal(verifyExitCode(run([rp('a.md')], () => 'changed')), 1);
  assert.equal(verifyExitCode(run([rp('a.md')], () => null)), 1);
});

// A suppressed run is exit 2 and is NOT "nothing to check".
test('exit 2 when a gate suppressed the comparison', () => {
  const r = run([rp('a.md')], () => 'expected', treeDigest([{ path: 'x', sha256: 'b'.repeat(64) }]));
  assert.equal(verifyExitCode(r), 2);
  assert.equal(r.entries.length, 0);
});

/* ── --json: two axes, both emitted ──────────────────────────────────── */

test('the json document carries state and class as separate axes', () => {
  const r = run([rp('a.md', { adaptExpected: true })], () => 'changed');
  const j = toJson(r);
  assert.equal(j.command, 'verify');
  assert.deepEqual(j.entries, [{ path: 'a.md', state: 'adapted', modeChecked: true }]);
  assert.equal(j.counts.adapted, 1);
  assert.equal(j.counts.differs, 0, 'every state present, so a zero is never inferred from absence');
  assert.deepEqual(j.diagnostics, [], 'adapted raises nothing');
});

test('the digest is reported explicitly, all three parts', () => {
  const bad = treeDigest([{ path: 'x', sha256: 'c'.repeat(64) }]);
  const j = toJson(run([rp('a.md')], () => 'expected', bad));
  assert.equal(j.digest.recorded, D);
  assert.equal(j.digest.computed, bad);
  assert.equal(j.digest.matched, false);
  // A consumer reading `entries: []` as "nothing to check" would report a
  // tampered payload as a clean project. `suppressed` is how it cannot.
  assert.equal(j.suppressed, true);
  assert.deepEqual(j.entries, []);
  assert.equal(j.diagnostics[0]?.exit, 2);
});

test('a diagnostic carries its class where it has one', () => {
  const j = toJson(run([rp('a.md')], () => 'changed'));
  assert.equal(j.diagnostics[0]?.code, 'E-VERIFY-MISMATCH');
  assert.equal(j.diagnostics[0]?.severity, 'error');
  assert.equal('class' in (j.diagnostics[0] ?? {}), false, 'errors carry no class, as the catalogue has it');
});

/* ── the human summary ───────────────────────────────────────────────── */

/**
 * The count checked and the count adapted are printed **separately**,
 * because they answer different questions and a single "12 checked" hides
 * the one number the project owner asked for.
 */
test('the summary separates the counts, and says the unfilled thing plainly', () => {
  const r = run(
    [rp('m.md'), rp('c.md', { adaptExpected: true }), rp('b.md', { fillExpected: true })],
    (p) => (p === 'c.md' ? 'changed' : 'expected'),
  );
  const lines = summaryLines(r);
  assert.match(lines[0]!, /3 applied paths checked/);
  assert.ok(lines.some((l) => /1 adapted/.test(l)));
  // `unfilled` is the only state that reports MATCHING as the finding, and
  // it is the single most useful thing verify can tell a project owner.
  assert.ok(lines.some((l) => /still at the template — these are yours to fill in/.test(l)));
});

test('a clean run says only what it checked', () => {
  assert.deepEqual(summaryLines(run([rp('a.md')], () => 'expected')), [
    'lintel: 1 applied paths checked.',
  ]);
});

test('a suppressed run prints no summary at all', () => {
  const r = run([rp('a.md')], () => 'expected', treeDigest([{ path: 'x', sha256: 'd'.repeat(64) }]));
  assert.deepEqual(summaryLines(r), [], 'a count derived from an untrusted payload is worse than none');
});
