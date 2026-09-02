import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  EXCERPT_LINE_CAP,
  REPORTED_DISPOSITIONS,
  REPORT_TEXT,
  excerptOf,
  reportLines,
  updateAvailable,
  updateExitCode,
  updateJson,
} from './report.js';
import { DISPOSITIONS, countByDisposition, keptEntries, type UpdateEntry } from './classify.js';
import { exitClassFor } from '../diag/codes.js';
import { diagnostic } from '../diag/diagnostic.js';
import { confinePath, type AppliedPath } from '../security/confine.js';
import type { UpdatePlan } from './plan-update.js';

/**
 * The report, and the exit rule it carries.
 *
 * **The rule under test looks backwards on purpose** (Q-78,
 * `F3-ADR-004` §3.1):
 *
 *   > The writing command reports; the read-only mode gates.
 *
 * `update` exits **0** with edited paths outstanding because F6's IM-7
 * stops the skill on any non-zero exit and IM-31 requires it to reconcile
 * exactly those paths — a class-1 exit would halt the skill precisely when
 * its work begins, and would make a correct update permanently red in CI.
 * The signal CI wanted lives on `--dry-run`, which exits **1** with
 * `E-UPDATE-AVAILABLE`. Anyone "correcting" the surprise here should read
 * that before changing a number.
 */

const ap = (p: string): AppliedPath => {
  const branded = confinePath(p, { index: 0 }).path;
  assert.ok(branded !== undefined, p);
  return branded;
};

const B = (s: string): Buffer => Buffer.from(s, 'utf8');

const entry = (over: Omit<Partial<UpdateEntry>, 'path'> & { path: string }): UpdateEntry => ({
  state: 'match',
  disposition: 'unchanged',
  packAlsoChanged: false,
  ...over,
  path: ap(over.path),
});

function planOf(over: Partial<UpdatePlan> = {}): UpdatePlan {
  const entries = over.entries ?? [];
  return {
    from: { pack: 'coding', version: '1.0.0' },
    to: { pack: 'coding', version: '1.1.0' },
    entries,
    counts: countByDisposition(entries),
    writes: [],
    payloadDeletes: [],
    kept: keptEntries(entries),
    fillExpected: [],
    droppedParameters: [],
    answers: new Map(),
    selected: [],
    suppressed: false,
    upToDate: false,
    diagnostics: [],
    ok: true,
    ...over,
  };
}

const digest = { recorded: 'sha256-a', computed: 'sha256-a', matched: true };

/* ── T-2501: the human report ────────────────────────────────────────── */

test('the report names the pack version moved from and to', () => {
  // US-72: the skill's first sentence to the user should be a fact rather
  // than a recollection, so both versions are in the report itself.
  const text = reportLines(planOf(), 'apply').join('\n');
  assert.match(text, /1\.0\.0/);
  assert.match(text, /1\.1\.0/);
  assert.match(text, /coding/);
});

test('counts per disposition are reported, and zero counts are not printed', () => {
  const plan = planOf({
    entries: [
      entry({ path: 'a.md', disposition: 'replaced', packAlsoChanged: true }),
      entry({ path: 'b.md', disposition: 'unchanged' }),
      entry({ path: 'c.md', disposition: 'unchanged' }),
    ],
  });
  const counts = reportLines(plan, 'apply')[1] as string;
  assert.equal(counts, '  1 replaced, 2 unchanged.');
  assert.ok(!counts.includes(REPORT_TEXT.added), 'a zero count is silence, not a line');
});

test('kept-fill-expected carries its OWN reason, never "you changed this"', () => {
  // T-2501, §F3.3. A user whose brief is skipped must not be told they
  // edited it — the path is left because the pack DECLARED it, and the two
  // reasons ask different things of the reader.
  const plan = planOf({
    entries: [entry({ path: 'brief.md', state: 'unfilled', disposition: 'kept-fill-expected' })],
  });
  const text = reportLines(plan, 'apply').join('\n');
  assert.ok(text.includes(REPORT_TEXT.reasons['kept-fill-expected']));
  assert.ok(!text.includes(REPORT_TEXT.reasons['kept-edited']));
});

test('each kept disposition gets its own reason, and the four are distinct', () => {
  const kinds = ['kept-edited', 'kept-adapted', 'kept-fill-expected', 'orphaned'] as const;
  const reasons = kinds.map((k) => REPORT_TEXT.reasons[k]);
  assert.equal(new Set(reasons).size, kinds.length, 'two dispositions sharing a reason is a lie');

  const plan = planOf({
    entries: kinds.map((k, i) =>
      entry({ path: `k${String(i)}.md`, state: 'differs', disposition: k }),
    ),
  });
  const text = reportLines(plan, 'apply').join('\n');
  for (const r of reasons) assert.ok(text.includes(r), r);
});

test('no kept path is presented as damage (IM-30)', () => {
  // The report may not describe a handed-over path as a conflict, a
  // failure, a rejection or a loss. Asserted over this module's OWN table,
  // which is the thing IM-30 binds — not over a catalogue message.
  const forbidden = /conflict|fail|reject|lost|loss|error|unresolved/i;
  for (const [k, reason] of Object.entries(REPORT_TEXT.reasons)) {
    assert.ok(!forbidden.test(reason), `${k}: ${reason}`);
  }
  assert.ok(!forbidden.test(REPORT_TEXT.kept));
  assert.ok(!forbidden.test(REPORT_TEXT.wouldKeep));
  assert.ok(!forbidden.test(REPORT_TEXT.handover));
});

test('the pack-also-changed fact is reported, and only where both sides held the path', () => {
  // US-61: "you changed this" and "you changed this and so did the pack"
  // need different work from the reader, and only a recomputation can tell
  // them apart. Where `state` is null the path was in ONE expectation and
  // there was no comparison, so nothing is claimed.
  const both = planOf({
    entries: [entry({ path: 'a.md', state: 'differs', disposition: 'kept-edited', packAlsoChanged: true })],
  });
  assert.ok(reportLines(both, 'apply').join('\n').includes(REPORT_TEXT.packAlsoChanged));

  const oneSided = planOf({
    entries: [entry({ path: 'a.md', state: null, disposition: 'kept-edited' })],
  });
  const text = reportLines(oneSided, 'apply').join('\n');
  assert.ok(!text.includes(REPORT_TEXT.packAlsoChanged));
  assert.ok(!text.includes(REPORT_TEXT.packUnchanged));
});

test('an orphan claims nothing about the pack having changed it', () => {
  // There is no new side to compare against: the newer pack does not ship
  // the path at all (US-68).
  const plan = planOf({
    entries: [entry({ path: 'gone.md', state: 'match', disposition: 'orphaned' })],
  });
  const text = reportLines(plan, 'apply').join('\n');
  assert.ok(text.includes(REPORT_TEXT.reasons.orphaned));
  assert.ok(!text.includes(REPORT_TEXT.packUnchanged));
});

test('--dry-run phrases the same classification as what WOULD happen', () => {
  // US-63: the same report, from the same builder, with the dispositions
  // phrased conditionally. Only the verbs differ.
  const plan = planOf({
    entries: [
      entry({ path: 'a.md', disposition: 'replaced', packAlsoChanged: true }),
      entry({ path: 'b.md', state: 'differs', disposition: 'kept-edited' }),
    ],
  });
  const dry = reportLines(plan, 'dry-run').join('\n');
  assert.ok(dry.includes(REPORT_TEXT.wouldReplace));
  assert.ok(dry.includes(REPORT_TEXT.wouldKeep));
  assert.ok(!dry.includes(REPORT_TEXT.updated));
});

test('a suppressed classification reports nothing at all', () => {
  // US-64: per-path report EMPTY, both modes. Every row would be derived
  // from a payload nobody can vouch for.
  const plan = planOf({ suppressed: true, ok: false });
  assert.deepEqual(reportLines(plan, 'apply'), []);
  assert.deepEqual(reportLines(plan, 'dry-run'), []);
});

test('an up-to-date project gets one line, naming the pack and the version', () => {
  const plan = planOf({ upToDate: true });
  const lines = reportLines(plan, 'dry-run');
  assert.equal(lines.length, 1);
  assert.match(lines[0] as string, /coding 1\.0\.0/);
});

test('payload orphans are reported as payload, never as project files', () => {
  // `F3-ADR-004` §10: these are `.harness/pack/` files, not applied paths,
  // and `update` deletes no applied path ever. They must not appear in the
  // kept list, where a reader would take them for their own files.
  const plan = planOf({ payloadDeletes: ['.harness/pack/old.md' as never] });
  const text = reportLines(plan, 'apply').join('\n');
  assert.ok(text.includes(REPORT_TEXT.payloadRemoved));
  assert.ok(!text.includes(REPORT_TEXT.kept));
});

/* ── T-2508 / C-54: the excerpt is bounded AND labelled ──────────────── */

test('a long excerpt is capped and names how many lines were withheld', () => {
  const body = Array.from({ length: EXCERPT_LINE_CAP + 40 }, (_, i) => `line ${String(i)}`);
  const ex = excerptOf(B(body.join('\n')));
  assert.equal(ex.lines.length, EXCERPT_LINE_CAP);
  assert.equal(ex.withheld, 40);
});

test('a trailing newline does not become a withheld line', () => {
  // The count has to be honest or the notice is worse than no notice.
  const ex = excerptOf(B('one\ntwo\n'));
  assert.deepEqual(ex.lines, ['one', 'two']);
  assert.equal(ex.withheld, 0);
});

test('the report never truncates silently', () => {
  // F1's rule for the disclosure is *never summarised, never truncated,
  // never counted*; bounded-and-labelled is a different thing, and the
  // label is what makes it different.
  const long = Array.from({ length: EXCERPT_LINE_CAP + 5 }, () => 'x').join('\n');
  const plan = planOf({
    entries: [
      entry({ path: 'a.md', state: 'differs', disposition: 'kept-edited', expectedNew: B(long) }),
    ],
  });
  const text = reportLines(plan, 'apply').join('\n');
  assert.ok(text.includes(REPORT_TEXT.withheld), 'the notice is present');
  assert.ok(text.includes('5 '), 'and it says how many');
});

test('binary content is described rather than printed', () => {
  const ex = excerptOf(Buffer.from([0x00, 0x01, 0x02, 0x00]));
  assert.equal(ex.binary, true);
  assert.deepEqual(ex.lines, []);
});

test('every excerpt line passes the value escaping (C-50)', () => {
  // `expectedNew` is pack-rendered content going to a terminal, which is
  // exactly the class C-50 exists for: an ANSI escape here could erase the
  // lines above it, including the report the user is meant to act on.
  const ex = excerptOf(B('before[2Jafter'));
  assert.ok(!(ex.lines[0] as string).includes(''));
  assert.ok((ex.lines[0] as string).includes('\\x1b'));
});

test('only a kept-edited path carries an excerpt', () => {
  // `expectedNew` is present iff the disposition is `kept-edited`
  // (`F3-ADR-004`'s contract). A `replaced` path's new bytes are on disk;
  // showing them would be showing the user their own file.
  const plan = planOf({
    entries: [entry({ path: 'a.md', disposition: 'kept-adapted', state: 'adapted' })],
  });
  assert.ok(!reportLines(plan, 'apply').join('\n').includes('│'));
});

/* ── T-2504: `--json` ────────────────────────────────────────────────── */

test('every entry carries state, disposition and packAlsoChanged', () => {
  // US-71: `state` and `disposition` are different axes and neither is
  // derivable from the other alone — the mapping depends on `expected_new`
  // too, which is what `packAlsoChanged` reports.
  const plan = planOf({
    entries: [
      entry({ path: 'a.md', state: 'adapted', disposition: 'kept-adapted', packAlsoChanged: true }),
      entry({ path: 'b.md', state: null, disposition: 'added' }),
    ],
  });
  const json = updateJson(plan, digest);
  assert.deepEqual(json.entries[0], {
    path: 'a.md',
    state: 'adapted',
    disposition: 'kept-adapted',
    packAlsoChanged: true,
  });
  assert.equal(json.entries[1]?.state, null, 'a state is never invented to fill the field');
});

test('the counts carry all seven dispositions, present at zero', () => {
  // A reader must never have to infer a zero from an absent key, and the
  // enumeration being closed is what makes a count of them meaningful.
  const json = updateJson(planOf(), digest);
  assert.deepEqual(Object.keys(json.counts).sort(), [...DISPOSITIONS].sort());
  assert.deepEqual(REPORTED_DISPOSITIONS, DISPOSITIONS);
});

test('the digest result is carried in all three parts', () => {
  // US-71: a suppressed classification must be distinguishable from one
  // that found nothing, and the digest result is what says which.
  const json = updateJson(planOf({ suppressed: true, ok: false }), {
    recorded: 'sha256-a',
    computed: 'sha256-b',
    matched: false,
  });
  assert.equal(json.digest.matched, false);
  assert.equal(json.suppressed, true);
  assert.deepEqual(json.entries, []);
});

test('expectedNew is complete in JSON, and says how it is encoded', () => {
  // The lossless channel the human report's cap defers to (C-54).
  const body = Array.from({ length: EXCERPT_LINE_CAP + 100 }, (_, i) => String(i)).join('\n');
  const plan = planOf({
    entries: [
      entry({ path: 'a.md', state: 'differs', disposition: 'kept-edited', expectedNew: B(body) }),
    ],
  });
  const e = updateJson(plan, digest).entries[0];
  assert.equal(e?.expectedNewEncoding, 'utf8');
  assert.equal(e?.expectedNew, body, 'complete, not capped');
});

test('binary expectedNew travels as base64 rather than lossily as text', () => {
  const bytes = Buffer.from([0x00, 0xff, 0x10, 0x00]);
  const plan = planOf({
    entries: [
      entry({ path: 'a.bin', state: 'differs', disposition: 'kept-edited', expectedNew: bytes }),
    ],
  });
  const e = updateJson(plan, digest).entries[0];
  assert.equal(e?.expectedNewEncoding, 'base64');
  assert.deepEqual(Buffer.from(e?.expectedNew ?? '', 'base64'), bytes);
});

test('diagnostics carry the code, the severity and the exit class', () => {
  const d = diagnostic('E-UPDATE-NOT-NEWER', {
    values: { pack: 'coding', applied: '2.0.0', bundled: '1.0.0', cliVersion: '1.0.0' },
  });
  const json = updateJson(planOf({ diagnostics: [d], ok: false, suppressed: true }), digest);
  assert.deepEqual(json.diagnostics, [
    { code: 'E-UPDATE-NOT-NEWER', severity: 'error', exit: exitClassFor('E-UPDATE-NOT-NEWER') },
  ]);
  assert.ok(!('class' in (json.diagnostics[0] as object)), 'class is absent on an error');
});

test('the JSON and the human report are built from one plan', () => {
  // US-71's single-builder property, asserted structurally: the counts a
  // consumer gates on and the counts a person reads are the same object.
  const plan = planOf({
    entries: [
      entry({ path: 'a.md', disposition: 'replaced', packAlsoChanged: true }),
      entry({ path: 'b.md', state: 'differs', disposition: 'kept-edited' }),
    ],
  });
  const json = updateJson(plan, digest);
  assert.equal(json.counts, plan.counts);
  assert.match(reportLines(plan, 'apply').join('\n'), /1 replaced/);
  assert.equal(json.counts.replaced, 1);
});

test('a parameter dropped from the manifest is reported in neither channel', () => {
  // US-69 drops it *silently*. A `--json` field naming it would make the
  // silence a matter of which channel you happen to read.
  const plan = planOf({ droppedParameters: ['gone'] });
  assert.ok(!reportLines(plan, 'apply').join('\n').includes('gone'));
  assert.ok(!JSON.stringify(updateJson(plan, digest)).includes('gone'));
});

/* ── T-2503 / T-2505: the exit-class contract ────────────────────────── */

test('the writing mode exits 0 with edited paths outstanding', () => {
  // **Q-78, and this is the assertion most likely to be "corrected".**
  // Exit 1 here would trip IM-7 and stop the skill at exactly the moment
  // IM-31 requires it to start reconciling, and would make a correct
  // update permanently red in CI. Read `F3-ADR-004` §3.1 before changing
  // this number.
  const plan = planOf({
    entries: [
      entry({ path: 'a.md', state: 'differs', disposition: 'kept-edited' }),
      entry({ path: 'b.md', state: 'missing', disposition: 'kept-edited' }),
      entry({ path: 'c.md', state: 'adapted', disposition: 'kept-adapted' }),
      entry({ path: 'd.md', state: 'match', disposition: 'orphaned' }),
    ],
  });
  assert.equal(plan.kept.length, 4);
  assert.equal(updateExitCode(plan, 'apply'), 0);
});

test('--dry-run exits 1 when an update is available', () => {
  assert.equal(updateExitCode(planOf(), 'dry-run'), 1);
});

test('--dry-run exits 0 on a current project', () => {
  assert.equal(updateExitCode(planOf({ upToDate: true }), 'dry-run'), 0);
});

test('the writing mode exits 0 on a current project too', () => {
  // US-70: nothing is wrong and nothing is expected to change, in both
  // modes, and no code is raised for it.
  assert.equal(updateExitCode(planOf({ upToDate: true }), 'apply'), 0);
});

test('a genuine failure keeps its own class in both modes', () => {
  const d = diagnostic('E-PAYLOAD-DIGEST-MISMATCH', {
    values: { recorded: 'sha256-a', computed: 'sha256-b' },
  });
  const plan = planOf({ diagnostics: [d], suppressed: true, ok: false });
  assert.equal(updateExitCode(plan, 'apply'), 2);
  assert.equal(updateExitCode(plan, 'dry-run'), 2, 'a read-only mode does not soften a gate');
});

test('a write failure after planning still decides the exit class', () => {
  const race = diagnostic('E-TARGET-RACE', {
    values: { path: 'a.md', detail: 'it changed', command: 'update' },
  });
  assert.equal(updateExitCode(planOf(), 'apply', [race]), exitClassFor('E-TARGET-RACE'));
});

test('a defect-class warning prints and leaves the exit code alone', () => {
  // There is no `--strict` on `update` (US-69, IM-22), and
  // `exitCodeFor`'s default is that rule rather than an omission.
  const w = diagnostic('W-FOLDER-README-MISSING', {
    values: { pack: 'coding', dir: 'x/', basename: 'README.md', combination: '{}' },
  });
  assert.equal(w.class, 'defect');
  assert.equal(updateExitCode(planOf(), 'apply', [w]), 0);
});

test('E-UPDATE-AVAILABLE agrees with the dry-run clause by construction', () => {
  // The clause in `updateExitCode` and the code's own exit class are two
  // statements of one rule. Asserting the agreement is what stops one from
  // being changed without the other.
  const plan = planOf();
  const d = updateAvailable(plan, '1.0.0');
  assert.equal(exitClassFor(d.code), 1);
  assert.equal(updateExitCode(plan, 'dry-run'), exitClassFor(d.code));
  assert.equal(updateExitCode(plan, 'dry-run', [d]), 1, 'and including it changes nothing');
});

test('E-UPDATE-AVAILABLE names both versions and the CLI', () => {
  const d = updateAvailable(planOf(), '1.2.3');
  assert.match(d.message, /coding/);
  assert.match(d.message, /1\.0\.0/);
  assert.match(d.message, /1\.1\.0/);
  assert.match(d.message, /1\.2\.3/);
});
