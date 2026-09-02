/**
 * T-0509 — the primitives, end to end, against the packs that ship.
 *
 * The unit tests in `src/recipe/ops/` assert each op alone, against
 * fixtures. This asserts the thing none of them can: **a whole bundled
 * pack planned and rendered**, every step feeding the next, with the
 * payload it actually has and the answers it actually declares.
 *
 * That composition is where the interesting failures live. An `in` glob
 * resolving against the written-set, a `rewrite-path` finding its target
 * because an earlier `copy` placed it, a `substitute` reaching a file a
 * `strip-suffix` renamed — none of those is testable one op at a time,
 * and all three are what an apply *is*.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import {
  loadPack,
  packDir,
  parseStrictJson,
  planSteps,
  renderStep,
  resolveAnswers,
  selectScaffolds,
  validateRecipe,
  walk,
  type AppliedPath,
  type PlannedStep,
  type Substitution,
  type Answer,
} from '../../dist/index.js';

const PACKS = ['coding', 'writing', 'planning'] as const;
const CLI = '1.0.0';

interface Applied {
  readonly files: Map<string, Buffer>;
  readonly modes: Map<string, number>;
  readonly substitutions: readonly Substitution[];
  readonly codes: readonly string[];
  readonly steps: readonly PlannedStep[];
}

/**
 * Plan and render one pack in memory.
 *
 * **Nothing is written to disk**, and that is the property rather than the
 * convenience: the ops take a payload reader and return writes, so an
 * apply can be computed completely before it is performed. That is what
 * `pack info` renders, and it is the whole argument for refusing a script
 * primitive.
 */
async function apply(name: string, scaffolds: readonly string[] = []): Promise<Applied> {
  const { loaded, bag: loadBag } = await loadPack(name, CLI);
  assert.ok(loaded, `${name} must load`);
  assert.deepEqual(loadBag.items.map((d) => d.code), [], name);

  const parsed = parseStrictJson(loaded.recipeText, `${name}/recipe.json`, 'E-RECIPE-INVALID');
  const { recipe } = validateRecipe(parsed.value!, name);
  assert.ok(recipe, `${name}'s recipe must validate`);

  const dir = fileURLToPath(packDir(name));
  const { entries } = await walk(dir);
  const payload = entries.filter((e) => e.kind === 'file').map((e) => e.path);

  // A required parameter has no default by definition, so an apply must
  // supply one. Answering them here is what makes this an APPLY rather
  // than a validation pass — and `E-PARAM-MISSING` in the render would be
  // the test's fault, not the pack's.
  const supplied = new Map<string, Answer>();
  for (const p of loaded.pack.parameters ?? []) {
    if (p.required !== true) continue;
    supplied.set(p.id, p.type === 'boolean' ? true : p.type === 'enum' ? (p.values ?? [''])[0]! : 'Demo Project');
  }
  const { answers, bag: answerBag } = resolveAnswers(loaded.pack.parameters, supplied);
  assert.deepEqual(answerBag.items.map((d) => d.code), [], `${name}: answers must be valid`);
  const { selected } = selectScaffolds(loaded.pack, scaffolds);
  const plan = planSteps({ pack: loaded.pack, recipe, selected, answers, payload });

  const files = new Map<string, Buffer>();
  const modes = new Map<string, number>();
  const substitutions: Substitution[] = [];
  const codes = plan.bag.items.map((d) => d.code);

  for (const planned of plan.steps) {
    const r = renderStep(planned.step, planned.writeSet, {
      index: planned.index,
      payload,
      readPayload: (p) => {
        try {
          return readFileSync(join(dir, p));
        } catch {
          return null;
        }
      },
      written: files as Map<AppliedPath, Buffer>,
      answers,
      packName: loaded.pack.name,
      packVersion: loaded.pack.version,
      cliVersion: CLI,
    });
    codes.push(...r.bag.items.map((d) => d.code));
    substitutions.push(...r.substitutions);
    for (const w of r.writes) {
      files.set(w.path, w.bytes);
      modes.set(w.path, w.mode);
    }
  }

  return { files, modes, substitutions, codes, steps: plan.steps };
}

for (const name of PACKS) {
  test(`${name} renders end to end with no diagnostic`, async () => {
    const r = await apply(name);
    assert.deepEqual(r.codes, [], `${name}: ${r.codes.join(', ')}`);
    assert.ok(r.files.size > 0, 'an apply that writes nothing is not an apply');
  });

  test(`${name} leaves no unresolved harness token in any output`, async () => {
    const { files } = await apply(name);
    for (const [path, bytes] of files) {
      const text = bytes.toString('utf8');
      assert.equal(
        /\{\{harness:/.test(text),
        false,
        `${path} still contains a {{harness:…}} token — it would ship to the user as-is`,
      );
    }
  });

  /**
   * US-4: *"Applying the coding pack leaves every `{{Feature name}}`,
   * `{{YYYY-MM-DD}}` and `{{PLACEHOLDER}}` byte-identical."* Those are
   * placeholders for a **human** to fill later. A substituter that ate
   * them would destroy the document templates it was copying — which is
   * most of what these packs ship.
   */
  test(`${name} copies every non-harness {{…}} placeholder through untouched`, async () => {
    const { files } = await apply(name);
    let seen = 0;
    for (const [path, bytes] of files) {
      for (const m of bytes.toString('utf8').matchAll(/\{\{([^}]*)\}\}/g)) {
        assert.equal(m[1]!.startsWith('harness:'), false, `${path}: ${m[0]}`);
        seen++;
      }
    }
    if (name === 'coding') {
      assert.ok(seen > 0, 'coding ships document templates full of them; zero means they were eaten');
    }
  });

  test(`${name} writes 0644 everywhere — no v1.0 pack sets the bit`, async () => {
    const { modes } = await apply(name);
    assert.deepEqual([...new Set(modes.values())], [0o644]);
  });

  /**
   * Determinism (§NFR): *"two applies of the same pack version with the
   * same answers produce byte-identical trees."* No primitive reads a
   * clock, an environment variable, a hostname or a locale, and directory
   * recursion is byte-ascending — so this is asserted rather than assumed.
   */
  test(`${name} renders identically twice`, async () => {
    const a = await apply(name);
    const b = await apply(name);
    assert.deepEqual([...a.files.keys()], [...b.files.keys()]);
    for (const [path, bytes] of a.files) {
      assert.equal(Buffer.compare(bytes, b.files.get(path)!), 0, path);
    }
  });
}

/* ── the composition the unit tests cannot reach ─────────────────────── */

/**
 * `coding`'s recipe ends with a `rewrite-path` and a `substitute`, both of
 * which resolve against paths **earlier steps placed**. If the plan and
 * the renderer disagreed about the written-set — the exact thing C-27
 * makes normative — this is where it would show.
 */
test('an editing step reaches a file a placing step wrote', async () => {
  const { files, steps } = await apply('coding');
  const editing = steps.filter((s) => s.step.op === 'rewrite-path' || s.step.op === 'substitute');
  assert.ok(editing.length > 0, 'coding declares both editing primitives');

  for (const e of editing) {
    assert.ok(e.writeSet.length > 0, `step ${e.index} matched nothing`);
    for (const p of e.writeSet) {
      assert.ok(files.has(p), `step ${e.index} edits ${p}, which nothing placed`);
    }
  }
});

// The substitution record is T-0804's by-product, captured at the only
// moment it is known. `pack info`'s disclosure has to say which answer
// went into which file, and reconstructing that afterwards would mean
// searching output for values — which finds coincidences.
test('every substituted answer is recorded with its path', async () => {
  const { substitutions, files } = await apply('coding');
  assert.ok(substitutions.length > 0, 'coding substitutes its parameters somewhere');
  for (const s of substitutions) {
    assert.ok(files.has(s.path), `${s.path} is not in the applied tree`);
    assert.ok(s.id.length > 0);
  }
});

/**
 * Q-82 left `writing-workstream` as the only scaffold in the product, so
 * this is the **only** end-to-end evidence that scaffold steps compose
 * with base steps at all.
 */
test('the one bundled scaffold composes with the base recipe', async () => {
  const base = await apply('writing');
  const withScaffold = await apply('writing', ['writing-workstream']);

  assert.deepEqual(withScaffold.codes, []);
  assert.ok(
    withScaffold.files.size > base.files.size,
    'selecting the scaffold must add files, or it is doing nothing',
  );
  for (const path of base.files.keys()) {
    assert.ok(withScaffold.files.has(path), `${path} vanished when the scaffold was selected`);
  }
});

/** `strip-suffix` is what turns `tone-of-voice.template.md` into
 *  `tone-of-voice.md` — step 4 of the manual apply, and the reason the
 *  primitive exists. Asserted against the real pack rather than a fixture. */
test('strip-suffix produces the applied name the manual apply produced by hand', async () => {
  const { files } = await apply('coding');
  const stripped = [...files.keys()].filter((p) => p.includes('tone-of-voice'));
  assert.deepEqual(stripped, ['copy/tone-of-voice.md']);

  const raw = await readFile(fileURLToPath(new URL('copy/tone-of-voice.template.md', packDir('coding'))));
  assert.equal(Buffer.compare(files.get('copy/tone-of-voice.md')!, raw), 0, 'the name changes, the bytes never do');
});
