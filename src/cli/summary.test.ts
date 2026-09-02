import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SUMMARY_TEXT, summaryLines, type SummaryInput } from './summary.js';

const base: SummaryInput = {
  packName: 'coding',
  packVersion: '1.0.0',
  payloadFiles: 60,
  appliedFiles: 40,
  scaffolds: [],
  kept: [],
};

const text = (over: Partial<SummaryInput> = {}): string =>
  summaryLines({ ...base, ...over }).join('\n');

/* ── Q-69: counts, not a path enumeration ────────────────────────────── */

test('the summary names counts per phase and never enumerates paths', () => {
  const out = text();
  assert.ok(out.includes('60'), out);
  assert.ok(out.includes('40'), out);
  assert.ok(!out.includes('.claude/agents/'), 'a second full list would compete with the disclosure');
});

test('it names the applied pack, its version and the selected scaffolds', () => {
  const out = text({ scaffolds: ['writing-workstream'] });
  assert.ok(out.includes('coding'));
  assert.ok(out.includes('1.0.0'));
  assert.ok(out.includes('writing-workstream'));
});

test('an empty scaffold list says so rather than printing nothing', () => {
  // A section that vanishes when empty is indistinguishable from one that
  // was never computed.
  assert.ok(text().includes(SUMMARY_TEXT.none));
});

/* ── IM-14, and US-54's prohibition ──────────────────────────────────── */

test('the three outstanding items appear in IM-14 order', () => {
  const out = text();
  const brief = out.indexOf('project-brief.md');
  const voice = out.indexOf('voice guide');
  const commit = out.indexOf('Commit');
  assert.ok(brief >= 0 && voice > brief && commit > voice, out);
});

test('it says .harness/ is committed by design and that answers are public', () => {
  const out = text();
  assert.ok(out.includes('.harness/pack/'), out);
  assert.ok(out.includes('.gitignore'), 'the block states that no entry is written or suggested');
  assert.ok(/public/.test(out), 'IM-15: answers are exactly as public as the repository');
});

test('it claims no judgment work was done', () => {
  // US-54. `init` adapts nothing, fills nothing and writes no brief, and a
  // block that implied otherwise would leave a user treating an applied
  // project as a finished one.
  const out = text().toLowerCase();
  for (const claim of ['adapted', 'filled in for you', 'written for you']) {
    assert.ok(!out.includes(claim), `must not claim: ${claim}`);
  }
});

/* ── C-36's report ───────────────────────────────────────────────────── */

test('a kept path whose on-disk spelling differs names both spellings', () => {
  // A user who sees neither spelling has no way to notice that their file
  // and the pack's step disagree about case.
  const out = text({
    kept: [{ planned: '.claude/agents/README.md', onDisk: '.claude/Agents/README.md' }],
  });
  assert.ok(out.includes('.claude/agents/README.md'), out);
  assert.ok(out.includes('.claude/Agents/README.md'), out);
});

test('a kept path whose spelling agrees is counted, never listed', () => {
  // Q-69 again: `--force` over an already-applied tree keeps every path,
  // and naming them all would put the largest list in the product on
  // stdout on exactly the run S7 uses.
  const out = text({ kept: [{ planned: 'a/b.md', onDisk: 'a/b.md' }] });
  assert.ok(out.includes(SUMMARY_TEXT.kept), out);
  assert.ok(!out.includes('a/b.md'), out);
});

test('no kept paths means no kept section', () => {
  assert.ok(!text().includes(SUMMARY_TEXT.kept));
});
