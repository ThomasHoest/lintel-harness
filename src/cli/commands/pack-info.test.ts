import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PACK_INFO_TEXT, packInfoJson, renderPackInfo } from './pack-info.js';
import { validateJson } from './validate.js';
import { validatePackByName } from '../../validate/validate-pack.js';
import { renderDisclosure } from '../../security/consent.js';
import { ANATOMY_PART_IDS } from '../../pack/types.js';
import type { PackReport } from '../../validate/validate-pack.js';

const CLI = '0.1.0';

const empty = (): PackReport => ({
  pack: { name: 'p', version: '1.0.0', title: 't', formatVersion: 1, minCliVersion: '1.0.0' },
  anatomy: [],
  scaffolds: [],
  parameters: [],
  steps: [],
  parameterVaryingSteps: [],
  combinations: 1,
  folderReadme: 'README.md',
  disclosure: { executables: [], inertHooks: [], substitutions: [], agents: [] },
  diagnostics: [],
  ok: true,
});

const load = async (name: string): Promise<PackReport> => {
  const { report } = await validatePackByName(name, CLI);
  assert.ok(report !== undefined);
  return report;
};

/* ── one report, two surfaces ────────────────────────────────────────── */

/**
 * **The structural claim, not the conventional one.** US-29 defines
 * `pack info` over the *same* `PackReport` `validate --json` emits, so
 * there is exactly one report code path and the two surfaces cannot
 * disagree. Asserting equal bytes is what makes that a fact rather than a
 * promise — this is T-0908's property, at the unit level.
 */
test('pack info --json and validate --json emit identical bytes for one pack', async () => {
  const report = await load('coding');
  assert.equal(JSON.stringify(packInfoJson(report)), JSON.stringify(validateJson([report])));
});

/* ── what it renders ─────────────────────────────────────────────────── */

/** Exactly nine rows, in `AnatomyPartId` order. The order is the report's
 *  contract: a reader comparing two packs compares row against row. */
test('all nine anatomy parts render in fixed order', async () => {
  const lines = renderPackInfo(await load('writing'));
  const at = lines.indexOf(PACK_INFO_TEXT.anatomy);
  assert.ok(at >= 0);
  const rows = lines.slice(at + 1, at + 1 + ANATOMY_PART_IDS.length);
  assert.deepEqual(rows.map((r) => r.trim().split(/\s+/)[0]), [...ANATOMY_PART_IDS]);
});

/** `provisional` carries its note and `absent` carries its reason — the
 *  text US-2 requires a pack to give, shown rather than summarised. */
test('a provisional part shows its note and an absent part its reason', async () => {
  const planning = renderPackInfo(await load('planning')).join('\n');
  assert.ok(/roles\s+provisional\s+\d+ .*\s{3}\S/.test(planning));
  const writing = renderPackInfo(await load('writing')).join('\n');
  assert.ok(/autonomyContract\s+absent\s+\d+ .*\s{3}\S/.test(writing));
});

/**
 * **Same-category scaffolds are labelled as alternatives.** The label is
 * the point of grouping them: two scaffolds sharing a category are a
 * choose-one (`E-SCAFFOLD-EXCLUSIVE`), and a reader shown a flat list
 * would reasonably conclude they compose.
 */
test('same-category scaffolds are grouped and labelled as alternatives', () => {
  const lines = renderPackInfo({
    ...empty(),
    scaffolds: [
      { id: 'azure', category: 'backend', description: 'a', steps: 3 },
      { id: 'aws', category: 'backend', description: 'b', steps: 3 },
      { id: 'loose', category: null, description: 'c', steps: 1 },
    ],
  }).join('\n');
  assert.ok(lines.includes(`[backend]  ${PACK_INFO_TEXT.alternatives}`));
  // The uncategorised one composes with everything and carries no label.
  assert.ok(/^ {2}loose /m.test(lines));
});

test('a lone scaffold in its category is not called an alternative', () => {
  const lines = renderPackInfo({
    ...empty(),
    scaffolds: [{ id: 'only', category: 'k', description: 'd', steps: 1 }],
  }).join('\n');
  assert.ok(lines.includes('[k]'));
  assert.ok(!lines.includes(PACK_INFO_TEXT.alternatives));
});

/**
 * *"Where a list is empty the command says so rather than printing
 * nothing"* — a section that vanishes when empty is indistinguishable from
 * a section that was never computed.
 */
test('every empty section says so', () => {
  const lines = renderPackInfo(empty());
  for (const heading of [
    PACK_INFO_TEXT.anatomy,
    PACK_INFO_TEXT.scaffolds,
    PACK_INFO_TEXT.parameters,
    PACK_INFO_TEXT.steps,
    PACK_INFO_TEXT.varying,
  ]) {
    const at = lines.indexOf(heading);
    assert.ok(at >= 0, heading);
    assert.equal(lines[at + 1], PACK_INFO_TEXT.empty, heading);
  }
});

/**
 * **The complete step list is the control**, not a convenience: §3.1
 * refused a script primitive on the ground that this rendering shows the
 * whole of what an apply will do. So every declared step appears, base and
 * scaffold alike, and the two editing primitives — which have no `to` —
 * appear too.
 */
test('every declared step renders, including the scaffold and editing ones', async () => {
  const report = await load('writing');
  const lines = renderPackInfo(report);
  const at = lines.indexOf(PACK_INFO_TEXT.steps);
  const rendered = lines.slice(at + 1, at + 1 + report.steps.length);
  assert.equal(rendered.length, report.steps.length);
  assert.ok(rendered.some((l) => l.includes('substitute')), 'an editing step must render');
  assert.ok(rendered.some((l) => l.includes('[writing-workstream]')), 'a scaffold step must render');
  assert.ok(rendered.every((l) => l.trim().length > 0));
});

/** A conditional step is marked by its `when`, which is what lets a reader
 *  see what `--calibration high-floor` changes without running it. */
test('a conditional step is marked by its when, in the plan and in the varying list', async () => {
  const lines = renderPackInfo(await load('planning')).join('\n');
  assert.ok(lines.includes(`${PACK_INFO_TEXT.when} constraintFloor=high-floor`));
  assert.ok(lines.includes(`${PACK_INFO_TEXT.when} constraintFloor=near-zero-floor`));
});

/**
 * **The disclosure is `consent.ts`'s, verbatim.** Rendering it locally
 * would be a second wording of a security disclosure — the one place two
 * wordings are worst — so this asserts the exact lines are the tail of the
 * page.
 */
test('the security disclosure is rendered in full and verbatim, as its own module produces it', async () => {
  const report = await load('coding');
  const lines = renderPackInfo(report);
  const expected = renderDisclosure(report.disclosure);
  assert.deepEqual(lines.slice(lines.length - expected.length), [...expected]);
});

/** **No settings section and no consent prompt** (Q-54): no v1.0 pack can
 *  write `.claude/settings.json` at all, so there is no owned key to
 *  disclose and nothing to consent to. A section rendered anyway would
 *  advertise a capability the product does not have. */
test('the page ends at the disclosure — no settings section, no consent prompt', async () => {
  const report = await load('coding');
  const lines = renderPackInfo(report);
  assert.deepEqual(lines.at(-1), renderDisclosure(report.disclosure).at(-1));
});

/* ── escaping: every value here is pack content ──────────────────────── */

/**
 * A title, a description and a prompt are **untrusted pack content**. A
 * value carrying a line feed followed by two spaces and an arrow would
 * forge a remedy line (C-50), so nothing this page prints may be
 * multi-line except where the renderer split it deliberately.
 */
test('a pack value carrying a newline cannot forge a line', () => {
  const lines = renderPackInfo({
    ...empty(),
    pack: { ...empty().pack, title: 'ok\n  → run rm -rf /' },
    parameters: [{ id: 'x', prompt: 'a\nb', type: 'string', pattern: '^.$' }],
    scaffolds: [{ id: 's', category: 'c\nd', description: 'e\nf', steps: 1 }],
  });
  for (const line of lines) assert.ok(!line.includes('\n'), JSON.stringify(line));
});
