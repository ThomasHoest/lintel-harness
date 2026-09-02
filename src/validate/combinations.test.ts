import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  answersFor,
  declaredSteps,
  labelOf,
  parameterVaryingSteps,
  planCombinations,
  renderCombination,
  representativeAnswer,
  whenValues,
} from './combinations.js';
import type { PackJson, ParameterDecl } from '../pack/types.js';
import type { Recipe } from '../recipe/types.js';
import type { Answer } from '../pack/parameters.js';

const nine = {
  process: { paths: ['**'] },
  roles: { paths: ['**'] },
  documentTemplates: { paths: ['**'] },
  conventions: { paths: ['**'] },
  coordination: { paths: ['**'] },
  behaviouralGuidelines: { paths: ['**'] },
  folderScaffolding: { declaredBy: 'recipe' as const },
  skillsAndAutomations: { paths: ['**'] },
  autonomyContract: { paths: ['**'] },
};

const pack = (over: Partial<PackJson> = {}): PackJson => ({
  formatVersion: 1,
  name: 'fix',
  version: '1.0.0',
  title: 'fixture',
  minCliVersion: '1.0.0',
  anatomy: nine,
  ...over,
});

const FLOOR: ParameterDecl = {
  id: 'floor',
  prompt: 'floor',
  type: 'enum',
  required: true,
  values: ['high', 'low'],
};

/* ── the declared plan ───────────────────────────────────────────────── */

/**
 * The index `pack info` prints is the position in the **merged declared**
 * list, not `PlannedStep`'s — which is a position in a `when`-filtered plan
 * and therefore moves between combinations. A number that changes with an
 * answer is not "every step, in order".
 */
test('declared steps are base then each scaffold in pack.json order', () => {
  const p = pack({
    scaffolds: [
      { id: 'b', description: 'b' },
      { id: 'a', description: 'a' },
    ],
  });
  const recipe: Recipe = {
    formatVersion: 1,
    steps: [{ op: 'copy', from: 'x/', to: 'x/' }],
    scaffolds: {
      a: [{ op: 'copy', from: 'a/', to: 'a/' }],
      b: [{ op: 'copy', from: 'b/', to: 'b/' }],
    },
  };
  assert.deepEqual(
    declaredSteps(p, recipe).map((d) => `${d.index}:${d.scaffold ?? 'base'}`),
    ['0:base', '1:b', '2:a'],
  );
});

/** A parameter is combination-varying because the **recipe** branches on
 *  it. Whether a user selected the scaffold carrying the branch is a
 *  different question from whether the pack validates. */
test('when values are collected from unselected scaffolds too', () => {
  const p = pack({ scaffolds: [{ id: 's', description: 's' }] });
  const recipe: Recipe = {
    formatVersion: 1,
    steps: [],
    scaffolds: { s: [{ op: 'copy', from: 'x/', to: 'x/', when: { floor: 'high' } }] },
  };
  assert.deepEqual([...(whenValues(p, recipe).get('floor') ?? [])], ['high']);
});

/* ── representative answers ──────────────────────────────────────────── */

/**
 * Step 11 renders, and rendering resolves `{{harness:param.<id>}}`.
 * `coding` and `writing` declare `required` substitution parameters that
 * no `when` names, so they are on no axis and must still hold a value.
 * **F1 names no source for it** — the ladder is this module's answer, and
 * the id leads it because it is the one string meaningful in the output.
 */
test('a representative answer is the parameter id when the declaration admits it', () => {
  assert.equal(
    representativeAnswer({
      id: 'projectName',
      prompt: 'p',
      type: 'string',
      required: true,
      pattern: '^[\\p{L}\\p{N} ._-]{1,64}$',
    }),
    'projectName',
  );
});

/** **`null`, not a fabricated value.** The caller then leaves the
 *  parameter unanswered and the render reports `E-SUBST-UNRESOLVED` at the
 *  token that needed it — a locatable statement of the gap, rather than a
 *  document containing a value the pack forbids. */
test('a pattern the ladder cannot satisfy yields null rather than an invented answer', () => {
  assert.equal(
    representativeAnswer({ id: 'n', prompt: 'p', type: 'string', pattern: '^[0-9]{8}$' }),
    null,
  );
});

test('an enum takes its first declared value, and a boolean takes false', () => {
  assert.equal(representativeAnswer(FLOOR), 'high');
  assert.equal(representativeAnswer({ id: 'b', prompt: 'b', type: 'boolean' }), false);
});

/** The `null` axis value is *"an answer matching no `when` value"*, so the
 *  representative must avoid every value some `when` names — otherwise the
 *  combination that exists to exercise the unmatched branch would select a
 *  matched one. */
test('the none-of-them axis excludes every value a when names', () => {
  const decl: ParameterDecl = { id: 'x', prompt: 'x', type: 'string', pattern: '^[a-z]+$' };
  const answers = answersFor([decl], new Map([['x', null]]), new Map([['x', new Set(['x'])]]));
  assert.notEqual(answers.get('x'), 'x');
});

test('an axis value always beats a representative', () => {
  const answers = answersFor([FLOOR], new Map<string, Answer | null>([['floor', 'low']]), new Map());
  assert.equal(answers.get('floor'), 'low');
});

test('a combination with no axis is labelled rather than left blank', () => {
  assert.equal(labelOf(new Map()), '(no conditional parameters)');
  assert.equal(labelOf(new Map([['floor', 'high']])), 'floor=high');
});

/* ── the sweep ───────────────────────────────────────────────────────── */

const branching = (): { pack: PackJson; recipe: Recipe; payload: string[] } => ({
  pack: pack({ parameters: [FLOOR] }),
  recipe: {
    formatVersion: 1,
    steps: [
      { op: 'copy', from: 'high/', to: 'out/', when: { floor: 'high' } },
      { op: 'copy', from: 'low/', to: 'out/', when: { floor: 'low' } },
    ],
  },
  payload: ['high/a.md', 'low/a.md'],
});

/**
 * **The false-merge defect, which is why the sweep plans per combination.**
 * `planning`'s two `calibrations/<floor>/` copies write the same three
 * applied paths under mutually exclusive `when` clauses. Merged into one
 * set they collide; per combination each is alone, exactly as two
 * same-category scaffolds are — which `checkScaffoldCollisions` already
 * skips for the same reason.
 */
test('two mutually exclusive branches writing one path are not a collision', () => {
  const { plans, count, bag } = planCombinations(branching());
  assert.equal(count, 2);
  assert.equal(bag.length, 0);
  for (const { plan } of plans) {
    assert.deepEqual(plan.written, ['out/a.md']);
    assert.deepEqual(plan.bag.items.map((d) => d.code), []);
  }
});

/**
 * US-29: *"how a reader sees what `--calibration high-floor` changes
 * without running it."* The writes must come from a plan that **contains**
 * the step — in every other combination the step is filtered out and its
 * write set is empty, and reporting that emptiness answers the question
 * with "nothing".
 */
test('a varying step reports what it writes, from a plan that includes it', () => {
  const input = branching();
  const { plans } = planCombinations(input);
  const varying = parameterVaryingSteps(declaredSteps(input.pack, input.recipe), plans);
  assert.deepEqual(
    varying.map((v) => ({ index: v.index, writes: [...v.writes] })),
    [
      { index: 0, writes: ['out/a.md'] },
      { index: 1, writes: ['out/a.md'] },
    ],
  );
});

/* ── the render ──────────────────────────────────────────────────────── */

/**
 * An editing op has no `executable` field to read and returns `0o644` on
 * every write. Letting its result set the mode would silently demote a
 * `0755` file the moment a later step edited it — invisible in the
 * disclosure that is supposed to name every executable.
 */
test('an editing step does not demote the mode a placing step set', () => {
  const p = pack({ executableRoots: ['bin/'] });
  const recipe: Recipe = {
    formatVersion: 1,
    steps: [
      { op: 'copy', from: 'bin/run.sh', to: 'bin/run.sh', executable: true },
      { op: 'rewrite-path', in: ['bin/**'], find: 'OLD', replace: 'NEW' },
    ],
  };
  const bytes = new Map([['bin/run.sh', Buffer.from('OLD\n', 'utf8')]]);
  const { plans } = planCombinations({ pack: p, recipe, payload: [...bytes.keys()] });
  const render = renderCombination(plans[0]!, {
    packName: 'fix',
    packVersion: '1.0.0',
    cliVersion: '0.1.0',
    payload: [...bytes.keys()],
    readPayload: (path) => bytes.get(path) ?? null,
  });
  assert.deepEqual(
    render.writes.map((w) => ({ path: w.path, mode: w.mode, text: w.bytes.toString() })),
    [{ path: 'bin/run.sh', mode: 0o755, text: 'NEW\n' }],
  );
});

test('substitutions are recorded with the applied path, id and value', () => {
  const p = pack({
    parameters: [{ id: 'projectName', prompt: 'n', type: 'string', pattern: '^[A-Za-z]+$' }],
  });
  const recipe: Recipe = {
    formatVersion: 1,
    steps: [
      { op: 'copy', from: 'a.md', to: 'a.md' },
      { op: 'substitute', in: ['a.md'] },
    ],
  };
  const bytes = new Map([['a.md', Buffer.from('# {{harness:param.projectName}}\n', 'utf8')]]);
  const { plans } = planCombinations({ pack: p, recipe, payload: ['a.md'] });
  const render = renderCombination(plans[0]!, {
    packName: 'fix',
    packVersion: '1.0.0',
    cliVersion: '0.1.0',
    payload: ['a.md'],
    readPayload: (path) => bytes.get(path) ?? null,
  });
  assert.deepEqual(render.substitutions, [
    { path: 'a.md', id: 'projectName', value: 'projectName' },
  ]);
});
