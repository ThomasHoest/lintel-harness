import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DISPOSITIONS,
  KEPT_DISPOSITIONS,
  WRITING_DISPOSITIONS,
  classifyPaths,
  countByDisposition,
  keptEntries,
  type Disposition,
  type UpdateEntry,
} from './classify.js';
import { verifyProject, type RecomputedPath } from '../verify/verify.js';
import { VERIFY_STATES } from '../verify/compare.js';
import { confinePath, type AppliedPath } from '../security/confine.js';
import { treeDigest } from '../hash/digest.js';
import type { Answer } from '../pack/parameters.js';

const ap = (p: string): AppliedPath => confinePath(p, { index: 0 }).path!;
const B = (s: string): Buffer => Buffer.from(s, 'utf8');

const rp = (p: string, bytes: string, over: Partial<RecomputedPath> = {}): RecomputedPath => ({
  path: ap(p),
  bytes: B(bytes),
  mode: 0o644,
  adaptExpected: false,
  fillExpected: false,
  ...over,
});

/** A disk that holds exactly what it is given. `undefined` means absent. */
const disk = (files: Readonly<Record<string, string | undefined>>) => (p: AppliedPath) => {
  const v = files[p];
  return v === undefined ? null : { bytes: B(v), mode: 0o644 };
};

const only = (entries: readonly UpdateEntry[], p: string): UpdateEntry => {
  const e = entries.find((x) => x.path === p);
  assert.ok(e !== undefined, `no entry for ${p}`);
  return e;
};

// ── the table, row by row (T-2302) ──────────────────────────────────────

test('not in old, in new, nothing on disk: added', () => {
  const entries = classifyPaths({
    expectedOld: [],
    expectedNew: [rp('new.md', 'fresh')],
    onDisk: disk({}),
  });
  assert.equal(only(entries, 'new.md').disposition, 'added');
  assert.equal(only(entries, 'new.md').state, null);
});

test('not in old, in new, something on disk: kept-edited, and it carries the new bytes', () => {
  // US-60. A project file standing where the newer pack newly ships is
  // NOT a collision: it differs from an expected_old that has no entry for
  // it. This is why `update` has no `E-TARGET-EXISTS` and no `--force` —
  // there is no pre-existing-path rule left for a flag to relax.
  const entries = classifyPaths({
    expectedOld: [],
    expectedNew: [rp('new.md', 'fresh')],
    onDisk: disk({ 'new.md': 'mine' }),
  });
  const e = only(entries, 'new.md');
  assert.equal(e.disposition, 'kept-edited');
  assert.equal(e.expectedNew?.toString(), 'fresh');
});

test('in both, unedited, pack changed it: replaced', () => {
  const entries = classifyPaths({
    expectedOld: [rp('a.md', 'v1')],
    expectedNew: [rp('a.md', 'v2')],
    onDisk: disk({ 'a.md': 'v1' }),
  });
  const e = only(entries, 'a.md');
  assert.equal(e.disposition, 'replaced');
  assert.equal(e.state, 'match');
  assert.equal(e.packAlsoChanged, true);
});

test('in both, unedited, pack did not change it: unchanged, and no write is planned', () => {
  // The great majority of paths on a typical bump. Writing a file to the
  // bytes it already holds costs a journal entry, a backup and an mtime
  // change for nothing.
  const entries = classifyPaths({
    expectedOld: [rp('a.md', 'v1')],
    expectedNew: [rp('a.md', 'v1')],
    onDisk: disk({ 'a.md': 'v1' }),
  });
  assert.equal(only(entries, 'a.md').disposition, 'unchanged');
});

test('in both, edited: kept-edited, untouched, and told whether the pack changed it too', () => {
  const changed = classifyPaths({
    expectedOld: [rp('a.md', 'v1')],
    expectedNew: [rp('a.md', 'v2')],
    onDisk: disk({ 'a.md': 'mine' }),
  });
  assert.equal(only(changed, 'a.md').disposition, 'kept-edited');
  assert.equal(only(changed, 'a.md').packAlsoChanged, true);

  const untouchedByPack = classifyPaths({
    expectedOld: [rp('a.md', 'v1')],
    expectedNew: [rp('a.md', 'v1')],
    onDisk: disk({ 'a.md': 'mine' }),
  });
  // The two cases need different work from the reader, and only a
  // recomputation can distinguish them (US-61).
  assert.equal(only(untouchedByPack, 'a.md').packAlsoChanged, false);
});

test('a deletion is an edit: a missing generated file is not re-created', () => {
  // Re-creating it would be the one form of "replace the unedited" that
  // overwrites a decision the user made — and would do it silently.
  const entries = classifyPaths({
    expectedOld: [rp('a.md', 'v1')],
    expectedNew: [rp('a.md', 'v2')],
    onDisk: disk({}),
  });
  const e = only(entries, 'a.md');
  assert.equal(e.state, 'missing');
  assert.equal(e.disposition, 'kept-edited');
});

test('in old, not in new: orphaned, whatever its state', () => {
  for (const [onDiskBytes, state] of [
    ['v1', 'match'],
    ['mine', 'differs'],
    [undefined, 'missing'],
  ] as const) {
    const entries = classifyPaths({
      expectedOld: [rp('gone.md', 'v1')],
      expectedNew: [],
      onDisk: disk({ 'gone.md': onDiskBytes }),
    });
    const e = only(entries, 'gone.md');
    assert.equal(e.disposition, 'orphaned');
    // The state is still computed and reported: US-68's row is "any".
    assert.equal(e.state, state);
  }
});

test('an orphaned path is never written and never deleted', () => {
  const entries = classifyPaths({
    expectedOld: [rp('gone.md', 'v1')],
    expectedNew: [],
    onDisk: disk({ 'gone.md': 'v1' }),
  });
  // A deletion is the one outcome not recoverable from the report: every
  // other leaves the bytes on disk, a delete leaves a sentence. And
  // *unedited* proves the file matches what the pack USED to write — it
  // proves nothing about whether the project now depends on it.
  assert.deepEqual(
    entries.map((e) => e.disposition),
    ['orphaned'],
  );
  assert.equal(entries[0]?.expectedNew, undefined);
});

// ── the two declarations that outrank the states ────────────────────────

test('adapt-expected is never replaced, even when it matches byte for byte', () => {
  // The one place `update` deliberately diverges from `verify`'s reading.
  // `verify` calls a byte-identical CLAUDE.md `match`, because the state
  // names what it FOUND. `update` is deciding whether to OVERWRITE, and a
  // CLAUDE.md that is byte-identical today is still the file the skill is
  // expected to rewrite tomorrow. Replacing it because it has not been
  // adapted YET would destroy the adaptation on the next run, with no
  // diagnostic.
  const entries = classifyPaths({
    expectedOld: [rp('CLAUDE.md', 'v1', { adaptExpected: true })],
    expectedNew: [rp('CLAUDE.md', 'v2', { adaptExpected: true })],
    onDisk: disk({ 'CLAUDE.md': 'v1' }),
  });
  const e = only(entries, 'CLAUDE.md');
  assert.equal(e.state, 'match');
  assert.equal(e.disposition, 'kept-adapted');
  assert.equal(e.packAlsoChanged, true);
});

test('a newly-declared adapt-expected path is kept from the run that declares it', () => {
  // Taking only the old recipe's set would replace it exactly once — on
  // the run that introduced the declaration, which is the run the
  // declaration exists to govern.
  const entries = classifyPaths({
    expectedOld: [rp('CLAUDE.md', 'v1')],
    expectedNew: [rp('CLAUDE.md', 'v2', { adaptExpected: true })],
    onDisk: disk({ 'CLAUDE.md': 'v1' }),
  });
  assert.equal(only(entries, 'CLAUDE.md').disposition, 'kept-adapted');
});

// ── T-2308: the fillExpected prohibition ────────────────────────────────
//
// Each of these asserts one clause of "never overwritten". Read them as a
// single claim: what a user loses if the prohibition is made conditional
// is `project-brief.md` — the document every other document in the project
// is downstream of — replaced silently, with the loss visible only in the
// version-control diff they may never look at.

test('fill-expected: NOT overwritten when the newer pack changed the file', () => {
  const entries = classifyPaths({
    expectedOld: [rp('brief.md', 'template-v1', { fillExpected: true })],
    expectedNew: [rp('brief.md', 'template-v2', { fillExpected: true })],
    onDisk: disk({ 'brief.md': 'the real brief, written by hand' }),
  });
  const e = only(entries, 'brief.md');
  assert.equal(e.state, 'filled');
  assert.equal(e.disposition, 'kept-fill-expected');
  assert.equal(e.packAlsoChanged, true);
});

test('fill-expected: NOT overwritten when it is byte-identical to what shipped', () => {
  // This is the clause a "smarter" rule would drop, and it is the one that
  // matters. `unfilled` means *matches what shipped* — which is ALSO what
  // a user who filled the brief and reverted looks like, and what one who
  // is mid-edit looks like. An unfilled brief and a filled one are
  // indistinguishable to a rule that has to be right BEFORE it looks.
  const entries = classifyPaths({
    expectedOld: [rp('brief.md', 'template-v1', { fillExpected: true })],
    expectedNew: [rp('brief.md', 'template-v2', { fillExpected: true })],
    onDisk: disk({ 'brief.md': 'template-v1' }),
  });
  const e = only(entries, 'brief.md');
  assert.equal(e.state, 'unfilled');
  assert.equal(e.disposition, 'kept-fill-expected');
});

test('fill-expected: the prohibition holds from the run that first declares it', () => {
  const entries = classifyPaths({
    expectedOld: [rp('brief.md', 'template-v1')],
    expectedNew: [rp('brief.md', 'template-v2', { fillExpected: true })],
    onDisk: disk({ 'brief.md': 'template-v1' }),
  });
  // Under the old recipe alone this path is `match` + changed = `replaced`
  // — the pack would overwrite a filled brief exactly once, on the bump
  // that declared it fill-expected.
  assert.equal(only(entries, 'brief.md').disposition, 'kept-fill-expected');
});

test('fill-expected: the prohibition survives a pack dropping the declaration', () => {
  const entries = classifyPaths({
    expectedOld: [rp('brief.md', 'template-v1', { fillExpected: true })],
    expectedNew: [rp('brief.md', 'template-v2')],
    onDisk: disk({ 'brief.md': 'template-v1' }),
  });
  assert.equal(only(entries, 'brief.md').disposition, 'kept-fill-expected');
});

test('fill-expected outranks adapt-expected, and neither writes', () => {
  const entries = classifyPaths({
    expectedOld: [rp('x.md', 'v1', { fillExpected: true, adaptExpected: true })],
    expectedNew: [rp('x.md', 'v2', { fillExpected: true, adaptExpected: true })],
    onDisk: disk({ 'x.md': 'v1' }),
  });
  assert.equal(only(entries, 'x.md').disposition, 'kept-fill-expected');
});

test('no input to classifyPaths can produce a write at a fill-expected path', () => {
  // The prohibition asserted over the whole input space rather than at
  // three chosen points: for every state a fill-expected path can reach,
  // and both directions of "did the pack change it", the disposition is
  // never one of the two that write.
  for (const onDiskBytes of ['template-v1', 'edited', undefined] as const) {
    for (const newBytes of ['template-v1', 'template-v2']) {
      const entries = classifyPaths({
        expectedOld: [rp('brief.md', 'template-v1', { fillExpected: true })],
        expectedNew: [rp('brief.md', newBytes, { fillExpected: true })],
        onDisk: disk({ 'brief.md': onDiskBytes }),
      });
      const e = only(entries, 'brief.md');
      assert.equal(
        e.disposition,
        'kept-fill-expected',
        `disk=${String(onDiskBytes)} new=${newBytes}`,
      );
    }
  }
});

// ── T-2303: classify and verify agree on the shared states ──────────────

test('every path in expected_old classifies to the state verify reports for it', () => {
  // The cheapest guard against the divergence that matters. Two comparison
  // implementations answer differently the first time one of them is
  // fixed — and `verify` is the acceptance test for S7 while `update` is
  // what maintains it, so any drift silently corrupts the gate. This is
  // why `classify.ts` calls `compare.ts` rather than paralleling it.
  const expectedOld: readonly RecomputedPath[] = [
    rp('match.md', 'same'),
    rp('differs.md', 'expected'),
    rp('missing.md', 'expected'),
    rp('adapted.md', 'expected', { adaptExpected: true }),
    rp('adapted-clean.md', 'same', { adaptExpected: true }),
    rp('filled.md', 'template', { fillExpected: true }),
    rp('unfilled.md', 'template', { fillExpected: true }),
    rp('orphan.md', 'expected'),
  ];
  const onDisk = disk({
    'match.md': 'same',
    'differs.md': 'mine',
    'adapted.md': 'mine',
    'adapted-clean.md': 'same',
    'filled.md': 'my content',
    'unfilled.md': 'template',
    'orphan.md': 'expected',
  });

  const digest = treeDigest([{ path: 'a', sha256: 'a'.repeat(64) }]);
  const v = verifyProject({
    recordedDigest: digest,
    computedDigest: digest,
    declarations: [],
    recordedAnswers: new Map<string, Answer>(),
    recomputed: expectedOld,
    onDisk,
  });

  // `expected_new` deliberately differs everywhere and drops one path, so
  // the agreement being asserted cannot be an artefact of the two sides
  // being identical.
  const entries = classifyPaths({
    expectedOld,
    expectedNew: expectedOld
      .filter((r) => r.path !== ap('orphan.md'))
      .map((r) => ({ ...r, bytes: B('next') })),
    onDisk,
  });

  const byPath = new Map(entries.map((e) => [e.path, e]));
  for (const found of v.entries) {
    assert.equal(
      byPath.get(found.path)?.state,
      found.state,
      `${found.path}: verify says ${found.state}`,
    );
  }

  // And all six states were actually exercised, so the agreement is not
  // vacuous over the states nobody built a fixture for.
  assert.deepEqual(
    [...new Set(v.entries.map((e) => e.state))].sort(),
    [...VERIFY_STATES].sort(),
  );
});

test('the state is reported alongside the disposition because neither derives the other', () => {
  // `state` is what the comparison found; `disposition` is what `update`
  // did about it, and the mapping depends on `expected_new` too. One
  // `match` becomes `replaced` and another becomes `unchanged` on the same
  // input except for the new pack's bytes.
  const base = { expectedOld: [rp('a.md', 'v1')], onDisk: disk({ 'a.md': 'v1' }) };
  const replaced = classifyPaths({ ...base, expectedNew: [rp('a.md', 'v2')] });
  const unchanged = classifyPaths({ ...base, expectedNew: [rp('a.md', 'v1')] });

  assert.equal(only(replaced, 'a.md').state, only(unchanged, 'a.md').state);
  assert.notEqual(only(replaced, 'a.md').disposition, only(unchanged, 'a.md').disposition);
});

// ── the shape of the enumeration ────────────────────────────────────────

test('seven dispositions, and the counts name all seven', () => {
  assert.equal(DISPOSITIONS.length, 7);
  assert.equal(new Set(DISPOSITIONS).size, 7);
  // There is no `merged`, no `conflicted` and no `deleted`. The first two
  // are what Q-62 defined this command NOT to build; the third was
  // `F3-ADR-004`'s own error, conflating an applied orphan (reported,
  // never deleted) with a payload orphan (not an applied path at all).
  for (const absent of ['merged', 'conflicted', 'deleted']) {
    assert.ok(!(DISPOSITIONS as readonly string[]).includes(absent));
  }
  assert.deepEqual(Object.keys(countByDisposition([])).sort(), [...DISPOSITIONS].sort());
});

test('writing and kept partition the enumeration, with unchanged in neither', () => {
  // `unchanged` is the only disposition that is neither a write nor a
  // handover: nothing to do, and nothing to tell anyone about. Asserting
  // the partition is what stops an eighth disposition being added to the
  // list without anyone deciding which side of the write it falls on.
  const covered = new Set([...WRITING_DISPOSITIONS, ...KEPT_DISPOSITIONS]);
  assert.equal(covered.size, WRITING_DISPOSITIONS.length + KEPT_DISPOSITIONS.length);
  assert.deepEqual(
    DISPOSITIONS.filter((d) => !covered.has(d)),
    ['unchanged'],
  );
});

test('the kept set is the whole handover, and unchanged is not part of it', () => {
  const entries = classifyPaths({
    expectedOld: [
      rp('same.md', 'v1'),
      rp('edited.md', 'v1'),
      rp('claude.md', 'v1', { adaptExpected: true }),
      rp('brief.md', 'v1', { fillExpected: true }),
      rp('gone.md', 'v1'),
    ],
    expectedNew: [
      rp('same.md', 'v1'),
      rp('edited.md', 'v2'),
      rp('claude.md', 'v2', { adaptExpected: true }),
      rp('brief.md', 'v2', { fillExpected: true }),
    ],
    onDisk: disk({
      'same.md': 'v1',
      'edited.md': 'mine',
      'claude.md': 'v1',
      'brief.md': 'v1',
      'gone.md': 'v1',
    }),
  });

  assert.deepEqual(
    keptEntries(entries).map((e) => e.disposition).sort(),
    ['kept-adapted', 'kept-edited', 'kept-fill-expected', 'orphaned'],
  );
  // `unchanged` is silence because nothing differs; each kept disposition
  // is silence because something was decided.
  assert.ok(!keptEntries(entries).some((e) => e.disposition === 'unchanged'));
});

test('classification is deterministic and reports no path the recipes do not produce', () => {
  const input = {
    expectedOld: [rp('a.md', 'v1'), rp('b.md', 'v1')],
    expectedNew: [rp('b.md', 'v2'), rp('c.md', 'v1')],
    onDisk: disk({ 'a.md': 'v1', 'b.md': 'v1', 'unrelated.md': 'the project owns this' }),
  };
  const first = classifyPaths(input).map((e) => `${e.path}:${e.disposition}`);
  assert.deepEqual(classifyPaths(input).map((e) => `${e.path}:${e.disposition}`), first);
  // expected_new order, then the old-only paths. G-F3-8 takes the write
  // set from this list, so the order is a correctness property.
  assert.deepEqual(first, ['b.md:replaced', 'c.md:added', 'a.md:orphaned']);
});

test('a CRLF checkout and an added BOM are not edits', () => {
  // Comparison is over normalized content for text, by F1 §NFR's single
  // normalization rule — so neither blocks an update nor produces a
  // spurious replacement.
  const entries = classifyPaths({
    expectedOld: [rp('a.md', 'one\ntwo\n')],
    expectedNew: [rp('a.md', 'one\ntwo\nthree\n')],
    onDisk: (p) =>
      p === ap('a.md') ? { bytes: Buffer.from('﻿one\r\ntwo\r\n', 'utf8'), mode: 0o644 } : null,
  });
  assert.equal(only(entries, 'a.md').disposition, 'replaced');
});

test('every disposition the table can reach is reachable, and nothing else is', () => {
  const seen = new Set<Disposition>();
  const cases: readonly (readonly [readonly RecomputedPath[], readonly RecomputedPath[], string | undefined])[] = [
    [[], [rp('p', 'n')], undefined],
    [[], [rp('p', 'n')], 'mine'],
    [[rp('p', 'o')], [rp('p', 'n')], 'o'],
    [[rp('p', 'o')], [rp('p', 'o')], 'o'],
    [[rp('p', 'o')], [rp('p', 'n')], 'mine'],
    [[rp('p', 'o', { adaptExpected: true })], [rp('p', 'n', { adaptExpected: true })], 'o'],
    [[rp('p', 'o', { fillExpected: true })], [rp('p', 'n', { fillExpected: true })], 'o'],
    [[rp('p', 'o')], [], 'o'],
  ];
  for (const [expectedOld, expectedNew, onDiskBytes] of cases) {
    for (const e of classifyPaths({ expectedOld, expectedNew, onDisk: disk({ p: onDiskBytes }) })) {
      seen.add(e.disposition);
    }
  }
  assert.deepEqual([...seen].sort(), [...DISPOSITIONS].sort());
});
