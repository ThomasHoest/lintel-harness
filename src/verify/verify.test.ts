import { test } from 'node:test';
import assert from 'node:assert/strict';
import { verifyProject, type RecomputedPath } from './verify.js';
import { confinePath, type AppliedPath } from '../security/confine.js';
import { treeDigest } from '../hash/digest.js';
import { exitClassFor } from '../diag/codes.js';
import type { ParameterDecl } from '../pack/types.js';
import type { Answer } from '../pack/parameters.js';

const ap = (p: string): AppliedPath => confinePath(p, { index: 0 }).path!;
const B = (s: string): Buffer => Buffer.from(s, 'utf8');
const codes = (b: { items: readonly { code: string }[] }): string[] => b.items.map((d) => d.code);

const DIGEST = treeDigest([{ path: 'a.md', sha256: 'a'.repeat(64) }]);

const NAME: ParameterDecl = {
  id: 'projectName',
  prompt: 'Name',
  type: 'string',
  pattern: '^[A-Za-z ]{1,64}$',
};

const path = (p: string, over: Partial<RecomputedPath> = {}): RecomputedPath => ({
  path: ap(p),
  bytes: B('expected'),
  mode: 0o644,
  adaptExpected: false,
  fillExpected: false,
  ...over,
});

const run = (over: Partial<Parameters<typeof verifyProject>[0]> = {}) =>
  verifyProject({
    recordedDigest: DIGEST,
    computedDigest: DIGEST,
    declarations: [NAME],
    recordedAnswers: new Map<string, Answer>([['projectName', 'Demo']]),
    recomputed: [path('a.md')],
    onDisk: () => ({ bytes: B('expected'), mode: 0o644 }),
    ...over,
  });

test('a clean project reports match and nothing else', () => {
  const r = run();
  assert.deepEqual(codes(r.bag), []);
  assert.equal(r.suppressed, false);
  assert.equal(r.counts.match, 1);
});

/* ── gate 1: the digest, fail closed ─────────────────────────────────── */

/**
 * **Suppression is not a convenience.** The expectation is computed *from*
 * the payload, so an untrusted payload makes every row downstream a
 * confident statement derived from unknown input. Reporting them would be
 * worse than reporting nothing.
 */
test('a payload digest mismatch suppresses the comparison entirely', () => {
  const r = run({ computedDigest: treeDigest([{ path: 'a.md', sha256: 'b'.repeat(64) }]) });
  assert.deepEqual(codes(r.bag), ['E-PAYLOAD-DIGEST-MISMATCH']);
  assert.equal(exitClassFor('E-PAYLOAD-DIGEST-MISMATCH'), 2);
  assert.deepEqual(r.entries, [], 'zero per-path rows');
  assert.equal(r.suppressed, true, 'and the caller can tell suppression from a clean run');
  assert.match(r.bag.items[0]!.message, /recorded sha256-/);
});

test('a malformed recorded digest fails closed too', () => {
  const r = run({ recordedDigest: 'not-a-digest' });
  assert.deepEqual(codes(r.bag), ['E-PAYLOAD-DIGEST-MISMATCH']);
  assert.equal(r.suppressed, true);
});

/* ── gate 2: the answers (C-29) ──────────────────────────────────────── */

/**
 * The answers are the recomputation's **other** input, so the same
 * suppression rule applies for the same reason. And the code is exit 2,
 * never `E-PARAM-INVALID`'s exit 1: nobody typed this, so the manifest was
 * edited or the declaration moved under it.
 */
test('a recorded answer failing its own declaration suppresses the comparison', () => {
  const r = run({ recordedAnswers: new Map<string, Answer>([['projectName', 'a/b/c!!']]) });
  assert.deepEqual(codes(r.bag), ['E-MANIFEST-ANSWER-INVALID']);
  assert.equal(exitClassFor('E-MANIFEST-ANSWER-INVALID'), 2);
  assert.deepEqual(r.entries, []);
  assert.equal(r.suppressed, true);
});

// Order matters: the digest gate runs FIRST, so a project with both faults
// is told about the payload rather than about an answer it cannot trust
// the meaning of.
test('the digest gate runs before the answer gate', () => {
  const r = run({
    computedDigest: treeDigest([{ path: 'x', sha256: 'c'.repeat(64) }]),
    recordedAnswers: new Map<string, Answer>([['projectName', '!!!']]),
  });
  assert.deepEqual(codes(r.bag), ['E-PAYLOAD-DIGEST-MISMATCH']);
});

/* ── the report ──────────────────────────────────────────────────────── */

test('a differing path fails, and the message lists it', () => {
  const r = run({ onDisk: () => ({ bytes: B('edited'), mode: 0o644 }) });
  assert.deepEqual(codes(r.bag), ['E-VERIFY-MISMATCH']);
  assert.equal(exitClassFor('E-VERIFY-MISMATCH'), 1);
  assert.match(r.bag.items[0]!.message, /1 of 1 applied paths/);
  assert.match(r.bag.items[0]!.message, /a\.md — differs/);
});

/**
 * `adapted`, `filled` and `unfilled` are **neither listed nor counted**. A
 * report that counted them would make a correct project look wrong — which
 * is the whole reason Q-56 and Q-79 split `differs` in the first place.
 */
test('the three expected states neither fail nor appear in the count', () => {
  const r = run({
    recomputed: [
      path('CLAUDE.md', { adaptExpected: true }),
      path('brief.md', { fillExpected: true }),
      path('filled.md', { fillExpected: true }),
      path('clean.md'),
    ],
    onDisk: (p) =>
      p === 'clean.md' || p === 'brief.md'
        ? { bytes: B('expected'), mode: 0o644 }
        : { bytes: B('changed'), mode: 0o644 },
  });
  assert.deepEqual(codes(r.bag), [], 'exit 0');
  assert.equal(r.counts.adapted, 1);
  assert.equal(r.counts.unfilled, 1, 'brief.md still equals what shipped');
  assert.equal(r.counts.filled, 1);
  assert.equal(r.counts.match, 1);
});

// T-1004's two-halves case: one adapted and one differs in a single run.
test('an adapted path and a differing path in one run: exit 1, counting one', () => {
  const r = run({
    recomputed: [path('CLAUDE.md', { adaptExpected: true }), path('other.md')],
    onDisk: () => ({ bytes: B('changed'), mode: 0o644 }),
  });
  assert.deepEqual(codes(r.bag), ['E-VERIFY-MISMATCH']);
  assert.match(r.bag.items[0]!.message, /1 of 2 applied paths/);
  assert.equal(r.bag.items[0]!.message.includes('CLAUDE.md'), false, 'adapted is not listed');
  assert.match(r.bag.items[0]!.message, /other\.md — differs/);
});

/**
 * F1 v5.2. This line was a **descriptive slot** — the message would have
 * printed the words *first ten paths, one per line, with "differs" or
 * "missing"* to a user, in place of the paths. It is a list slot now, and
 * expansion is the **emitter's** decision about a slot it built, never
 * something a value can claim by containing a newline — that version was
 * caught by C-50's own test in the same hour.
 */
test('the path list expands to one line each, capped at ten', () => {
  const many = Array.from({ length: 14 }, (_, i) => path(`f${i}.md`));
  const r = run({ recomputed: many, onDisk: () => ({ bytes: B('changed'), mode: 0o644 }) });
  const lines = r.bag.items[0]!.message.split('\n');
  assert.match(r.bag.items[0]!.message, /14 of 14 applied paths/);
  assert.equal(lines.filter((l) => l.includes(' — differs')).length, 10);
  assert.equal(r.bag.items[0]!.message.includes('first ten paths'), false);
});

// verify is a statement about the paths this pack claims to produce, not
// an inventory of the repository.
test('a file the recipe does not produce is not reported', () => {
  const r = run({ recomputed: [], onDisk: () => ({ bytes: B('someone else'), mode: 0o644 }) });
  assert.deepEqual(codes(r.bag), []);
  assert.deepEqual(r.entries, []);
  assert.equal(r.suppressed, false, 'and this is NOT suppression — nothing was claimed');
});
