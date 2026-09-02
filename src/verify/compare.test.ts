import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  NON_FAILING_STATES,
  VERIFY_STATES,
  compareOne,
  contentEqual,
  countByState,
  failingEntries,
} from './compare.js';
import { confinePath, type AppliedPath } from '../security/confine.js';

const ap = (p: string): AppliedPath => confinePath(p, { index: 0 }).path!;
const B = (s: string): Buffer => Buffer.from(s, 'utf8');

const one = (over: Partial<Parameters<typeof compareOne>[0]> = {}) =>
  compareOne({
    path: ap('a.md'),
    expected: B('x'),
    actual: B('x'),
    expectedMode: 0o644,
    actualMode: 0o644,
    adaptExpected: false,
    fillExpected: false,
    ...over,
  });

test('the enumeration is closed at six', () => {
  assert.deepEqual([...VERIFY_STATES], ['match', 'adapted', 'filled', 'unfilled', 'differs', 'missing']);
});

/* ── the plain three ─────────────────────────────────────────────────── */

test('match, differs and missing', () => {
  assert.equal(one().state, 'match');
  assert.equal(one({ actual: B('y') }).state, 'differs');
  assert.equal(one({ actual: null }).state, 'missing');
});

/* ── adapted ─────────────────────────────────────────────────────────── */

test('a differing adapt-expected path is adapted, not a failure', () => {
  const e = one({ actual: B('rewritten by the skill'), adaptExpected: true });
  assert.equal(e.state, 'adapted');
  assert.ok(NON_FAILING_STATES.includes(e.state));
});

/**
 * **The state names what `verify` found, never what it was permitted to
 * find.** A `CLAUDE.md` nobody has touched is `match`; calling it
 * `adapted` would make the report a statement about the recipe rather than
 * about the project.
 */
test('an adapt-expected path that still matches is match, not adapted', () => {
  assert.equal(one({ adaptExpected: true }).state, 'match');
});

/* ── the inversion ───────────────────────────────────────────────────── */

/**
 * **This is the thing to get right.** `adapted` and `filled` both mean
 * *differs, and that was expected*. `unfilled` means **matches, and that
 * is the finding** — the user has not done what the pack asked of them.
 *
 * Implementing it the same way round as `adapted` would silently report
 * every unfilled `project-brief.md` as `match`, which is exactly the
 * defect Q-79 exists to fix: through v2.9, US-33's green run — the
 * acceptance test for **S7** — passed *only because nobody had filled in a
 * brief*. The first person to fill one would have turned the release gate
 * red, and the gate would have been right by its own rules and useless.
 */
test('a fill-expected path reports filled when it DIFFERS and unfilled when it MATCHES', () => {
  assert.equal(one({ actual: B('the user filled it in'), fillExpected: true }).state, 'filled');
  assert.equal(one({ fillExpected: true }).state, 'unfilled');
});

test('neither filled nor unfilled is a failure', () => {
  for (const s of ['filled', 'unfilled'] as const) assert.ok(NON_FAILING_STATES.includes(s));
  assert.deepEqual(
    failingEntries([
      one({ fillExpected: true }),
      one({ actual: B('z'), fillExpected: true }),
      one({ actual: B('z'), adaptExpected: true }),
    ]),
    [],
  );
});

// Cannot arise for a valid pack — a step declaring both is
// E-RECIPE-STEP-INVALID — but an order that only works because a validator
// ran first is an order that breaks when someone calls this directly.
test('fill wins over adapt if a step somehow declared both', () => {
  assert.equal(one({ actual: B('z'), adaptExpected: true, fillExpected: true }).state, 'filled');
  assert.equal(one({ adaptExpected: true, fillExpected: true }).state, 'unfilled');
});

/* ── comparison ──────────────────────────────────────────────────────── */

// Same rule as the payload digest, same stated cost: a CRLF checkout and
// an added BOM both read `match`, and a pure line-ending edit is
// undetectable.
test('a CRLF checkout and an added BOM both still match', () => {
  assert.ok(contentEqual(B('a\nb\n'), B('a\r\nb\r\n')));
  assert.ok(contentEqual(B('# T'), B('﻿# T')));
  assert.equal(contentEqual(B('a'), B('b')), false);
});

/** Both sides are classified, not just one: a file that is text in the
 *  payload and binary on disk has been replaced with something else, and
 *  comparing a normalized string to raw bytes compares two kinds of thing. */
test('a text expectation against binary actual is not a match', () => {
  assert.equal(contentEqual(B('text'), Buffer.from([0x00, 0xff])), false);
});

/* ── mode ────────────────────────────────────────────────────────────── */

// The report SAYS a check did not run rather than implying one did.
test('Windows reports modeChecked false rather than a silent pass', () => {
  const e = one({ actualMode: null });
  assert.equal(e.modeChecked, false);
  assert.equal(e.modeDiffers, undefined);
});

test('a mode disagreement is recorded where the platform represents one', () => {
  assert.equal(one({ actualMode: 0o755 }).modeDiffers, true);
  assert.equal(one().modeDiffers, undefined, 'absent rather than false when they agree');
});

/* ── counts ──────────────────────────────────────────────────────────── */

// All six present, so a reader never has to infer a zero from an absent
// key — `--json` emits this verbatim.
test('counts carry every state, including the zeroes', () => {
  const counts = countByState([one(), one({ actual: null })]);
  assert.deepEqual(Object.keys(counts).sort(), [...VERIFY_STATES].sort());
  assert.equal(counts.match, 1);
  assert.equal(counts.missing, 1);
  assert.equal(counts.adapted, 0);
});
