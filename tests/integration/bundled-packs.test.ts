/**
 * T-1215 — a structural assertion over `packs/*\/recipe.json`.
 *
 * F1 US-32 (Q-56, Q-61) says every pack's `CLAUDE.md` is produced by a
 * `generate` step carrying `adaptExpected: true`, so `update` never
 * blindly replaces the one file the skill is expected to rewrite by hand.
 * That is a claim about what ships, and a claim about what ships goes
 * stale the moment a pack changes underneath it — this project's own
 * `CLAUDE.md` names three such staleness incidents in `general/` alone.
 * So this is asserted against the three bundled packs on disk rather than
 * a fixture: a fixture cannot go stale, and a shipping pack can.
 *
 * **Exact counts, not "at least".** `CLAUDE.md`'s epics-and-tasks doc
 * states 6 / 6 / 7 anchors for coding / writing / planning — nineteen in
 * total — as a closed claim. An assertion of "at least one anchor" would
 * still pass the day a pack silently dropped one, which is exactly the
 * kind of closed-enumeration drift this project's own history (three
 * incidents, recorded in `CLAUDE.md`) says goes false silently.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { bundledPackNames, packDir } from '../../dist/index.js';

/** The id grammar `pack info` and the anchor checker both hold `generate`
 *  to (T-0506): a leading lowercase letter, then lowercase letters,
 *  digits or hyphens, capped at 32 characters. */
const ANCHOR_ID_RE = /^[a-z][a-z0-9-]{0,31}$/;

/** The closed claim of record — CLAUDE.md's §Genuinely outstanding
 *  entry for F1 v4.3, restated here as data so the assertion below can
 *  fail on the specific pack whose count moved, not merely on "the sum is
 *  wrong". */
const EXPECTED_ANCHOR_COUNTS: Readonly<Record<string, number>> = {
  coding: 6,
  writing: 6,
  planning: 7,
};

interface GenerateStep {
  readonly op: string;
  readonly to?: string;
  readonly adaptExpected?: boolean;
  readonly anchors?: readonly string[];
}

interface RecipeDoc {
  readonly steps: readonly GenerateStep[];
  readonly scaffolds?: Readonly<Record<string, readonly GenerateStep[]>>;
}

async function readRecipe(pack: string): Promise<RecipeDoc> {
  const url = new URL('recipe.json', packDir(pack));
  const text = await readFile(fileURLToPath(url), 'utf8');
  return JSON.parse(text) as RecipeDoc;
}

/** Every step a pack declares — base and every scaffold's — because a
 *  `generate` step hiding inside a scaffold is still a `generate` step
 *  for this count. No v1.0 pack currently puts one there; the walk does
 *  not assume that stays true. */
function allSteps(doc: RecipeDoc): readonly GenerateStep[] {
  const scaffoldSteps = Object.values(doc.scaffolds ?? {}).flat();
  return [...doc.steps, ...scaffoldSteps];
}

test('bundledPackNames reports exactly the three packs this assertion covers', async () => {
  const names = await bundledPackNames();
  assert.deepEqual([...names].sort(), ['coding', 'planning', 'writing']);
});

test('exactly one generate step per pack, to CLAUDE.md, adaptExpected true — three total', async () => {
  const names = await bundledPackNames();
  let total = 0;

  for (const name of names) {
    const doc = await readRecipe(name);
    const generates = allSteps(doc).filter((s) => s.op === 'generate');

    assert.equal(generates.length, 1, `${name}: exactly one generate step, found ${generates.length}`);
    const step = generates[0] as GenerateStep;
    assert.equal(step.to, 'CLAUDE.md', `${name}: generate step's "to" must be CLAUDE.md`);
    assert.equal(step.adaptExpected, true, `${name}: generate step must carry adaptExpected: true`);
    total += 1;
  }

  assert.equal(total, 3, 'exactly three generate steps across the three bundled packs');
});

test('anchor counts are 6 / 6 / 7 for coding / writing / planning — nineteen in total', async () => {
  let grandTotal = 0;

  for (const [name, expected] of Object.entries(EXPECTED_ANCHOR_COUNTS)) {
    const doc = await readRecipe(name);
    const step = allSteps(doc).find((s) => s.op === 'generate');
    assert.ok(step, `${name}: no generate step found`);
    const anchors = step.anchors ?? [];

    assert.equal(
      anchors.length,
      expected,
      `${name}: expected ${expected} declared anchors, found ${anchors.length} (${anchors.join(', ')})`,
    );
    grandTotal += anchors.length;
  }

  assert.equal(grandTotal, 19, 'nineteen anchors across three templates (US-32, Q-56, Q-61)');
});

test('every declared anchor id matches the grammar generate holds it to', async () => {
  const names = await bundledPackNames();
  for (const name of names) {
    const doc = await readRecipe(name);
    const step = allSteps(doc).find((s) => s.op === 'generate');
    assert.ok(step, `${name}: no generate step found`);
    for (const id of step.anchors ?? []) {
      assert.match(id, ANCHOR_ID_RE, `${name}: anchor id "${id}" does not match ^[a-z][a-z0-9-]{0,31}$`);
    }
  }
});

/** The three sets are disjoint anchor names in general (each pack picks
 *  its own section names), but the assertion above is per pack and does
 *  not depend on that — recorded so a reader does not infer a fourth
 *  claim ("no id repeats across packs") that this file does not make. */
