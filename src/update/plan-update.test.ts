import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  checkUpdateGates,
  planUpdate,
  resolveTargetVersion,
  resolveUpdateInputs,
  type UpdatePlanInput,
} from './plan-update.js';
import { confinePath, type AppliedPath } from '../security/confine.js';
import { treeDigest } from '../hash/digest.js';
import { exitClassFor, type DiagnosticCode } from '../diag/codes.js';
import type { RecomputedPath } from '../verify/verify.js';
import type { Answer } from '../pack/parameters.js';
import type { PackJson, ParameterDecl } from '../pack/types.js';

const ap = (p: string): AppliedPath => confinePath(p, { index: 0 }).path!;
const B = (s: string): Buffer => Buffer.from(s, 'utf8');
const codes = (ds: readonly { code: string }[]): string[] => ds.map((d) => d.code);

const DIGEST = treeDigest([{ path: 'a.md', sha256: 'a'.repeat(64) }]);
const OTHER = treeDigest([{ path: 'b.md', sha256: 'b'.repeat(64) }]);

const NAME: ParameterDecl = {
  id: 'projectName',
  prompt: 'What is the project called?',
  type: 'string',
  pattern: '^[A-Za-z ]{1,64}$',
  required: true,
};

const rp = (p: string, bytes: string, over: Partial<RecomputedPath> = {}): RecomputedPath => ({
  path: ap(p),
  bytes: B(bytes),
  mode: 0o644,
  adaptExpected: false,
  fillExpected: false,
  ...over,
});

const pack = (over: Partial<PackJson> = {}): PackJson =>
  ({
    formatVersion: 1,
    name: 'coding',
    version: '1.1.0',
    title: 'Coding',
    minCliVersion: '1.0.0',
    anatomy: {},
    parameters: [NAME],
    ...over,
  }) as PackJson;

const answers = (m: Readonly<Record<string, Answer>> = { projectName: 'Demo' }) =>
  new Map<string, Answer>(Object.entries(m));

const input = (over: Partial<UpdatePlanInput> = {}): UpdatePlanInput => ({
  applied: { pack: 'coding', version: '1.0.0' },
  bundled: pack(),
  cliVersion: '1.0.0',
  recordedDigest: DIGEST,
  computedDigest: DIGEST,
  appliedDeclarations: [NAME],
  recordedAnswers: answers(),
  recordedScaffolds: [],
  renderOld: () => [rp('a.md', 'v1')],
  renderNew: () => [rp('a.md', 'v2')],
  onDisk: (p) => (p === ap('a.md') ? { bytes: B('v1'), mode: 0o644 } : null),
  oldPayload: ['pack.json', 'recipe.json'],
  newPayload: ['pack.json', 'recipe.json'],
  ...over,
});

// ── T-2304: the digest gate, first and suppressing ──────────────────────

test('an edited payload suppresses the whole classification', () => {
  // `expected_old` is computed FROM `.harness/pack/`. An untrusted payload
  // does not merely make the report meaningless — it makes `update`
  // replace the user's work, because a corrupted payload is exactly what
  // makes an edited file classify as unedited.
  const plan = planUpdate(input({ computedDigest: OTHER }));
  assert.deepEqual(codes(plan.diagnostics), ['E-PAYLOAD-DIGEST-MISMATCH']);
  assert.equal(exitClassFor('E-PAYLOAD-DIGEST-MISMATCH'), 2);
  assert.equal(plan.suppressed, true);
  assert.deepEqual(plan.entries, []);
  assert.deepEqual(plan.writes, []);
  assert.deepEqual(plan.payloadDeletes, []);
  assert.equal(plan.ok, false);
});

test('the digest gate runs BEFORE either recomputation, not merely before the writes', () => {
  // Asserted structurally rather than by reading the source: a render that
  // still runs behind a failed gate is a render whose output someone will
  // eventually use.
  let rendered = 0;
  const plan = planUpdate(
    input({
      computedDigest: OTHER,
      renderOld: () => {
        rendered++;
        return [];
      },
      renderNew: () => {
        rendered++;
        return [];
      },
    }),
  );
  assert.equal(rendered, 0);
  assert.equal(plan.suppressed, true);
});

test('a recorded answer that fails its own declaration suppresses too', () => {
  const plan = planUpdate(input({ recordedAnswers: answers({ projectName: 'Demo!!' }) }));
  assert.deepEqual(codes(plan.diagnostics), ['E-MANIFEST-ANSWER-INVALID']);
  assert.equal(plan.suppressed, true);
  assert.deepEqual(plan.entries, []);
});

test('the digest gate precedes the answer gate', () => {
  // A crashed previous run leaves a new payload beside an old manifest, so
  // the order of the checks is what decides which fault a user is shown.
  const both = checkUpdateGates({
    recordedDigest: DIGEST,
    computedDigest: OTHER,
    declarations: [NAME],
    recordedAnswers: answers({ projectName: 'Demo!!' }),
  });
  assert.deepEqual(codes(both.bag.items), ['E-PAYLOAD-DIGEST-MISMATCH']);
});

test('a malformed recorded digest fails closed', () => {
  const r = checkUpdateGates({
    recordedDigest: 'not-a-digest',
    computedDigest: DIGEST,
    declarations: [],
    recordedAnswers: new Map(),
  });
  assert.equal(r.passed, false);
});

// ── T-2305: version resolution ──────────────────────────────────────────

test('equal versions: up to date, no code, nothing planned', () => {
  const plan = planUpdate(input({ bundled: pack({ version: '1.0.0' }) }));
  assert.deepEqual(codes(plan.diagnostics), []);
  assert.equal(plan.upToDate, true);
  assert.equal(plan.suppressed, false);
  assert.equal(plan.ok, true);
  assert.deepEqual(plan.writes, []);
});

test('an older bundled pack is refused rather than applied backwards', () => {
  // A downgrade that replaced unedited paths would be indistinguishable in
  // the report from an upgrade that did.
  const plan = planUpdate(input({ bundled: pack({ version: '0.9.0' }) }));
  assert.deepEqual(codes(plan.diagnostics), ['E-UPDATE-NOT-NEWER']);
  assert.equal(plan.ok, false);
  assert.deepEqual(plan.writes, []);
});

test('the verdicts, over the three orderings and an unparseable version', () => {
  const v = (applied: string, bundled: string) =>
    resolveTargetVersion({ pack: 'coding', applied, bundled, cliVersion: '1.0.0' }).verdict;
  assert.equal(v('1.0.0', '1.1.0'), 'newer');
  assert.equal(v('1.0.0', '1.0.0'), 'current');
  assert.equal(v('1.1.0', '1.0.0'), 'not-newer');
  assert.equal(v('1.0.0', '1.0.0-rc.1'), 'not-newer');
  // Fail closed: refusing costs a re-run, and the alternative to refusing
  // is writing over a user's files on a comparison that could not be made.
  assert.equal(v('1.0.0', 'not-a-version'), 'not-newer');
});

test('the CLI version is recorded, never compared', () => {
  // A CLI upgrade shipping the same pack version is a no-op here (Q-73).
  for (const cliVersion of ['1.0.0', '2.5.9']) {
    const r = resolveTargetVersion({
      pack: 'coding',
      applied: '1.0.0',
      bundled: '1.0.0',
      cliVersion,
    });
    assert.equal(r.verdict, 'current');
  }
});

// ── T-2306: the two refusals ────────────────────────────────────────────

test('a new required parameter with no default refuses the run before anything is planned', () => {
  let rendered = 0;
  const plan = planUpdate(
    input({
      bundled: pack({
        parameters: [NAME, { id: 'region', prompt: 'Which region?', type: 'string', pattern: '^[a-z-]+$', required: true }],
      }),
      renderOld: () => {
        rendered++;
        return [];
      },
      renderNew: () => {
        rendered++;
        return [];
      },
    }),
  );
  assert.deepEqual(codes(plan.diagnostics), ['E-UPDATE-PARAM-UNANSWERED']);
  assert.equal(rendered, 0);
  assert.equal(plan.ok, false);
  assert.deepEqual(plan.writes, []);
});

test('a new parameter WITH a default is not a fault, and its default is recorded', () => {
  // The only case in which `update` adds an entry to `parameters` — and it
  // adds no key to the manifest schema.
  const plan = planUpdate(
    input({
      bundled: pack({
        parameters: [NAME, { id: 'region', prompt: 'Which region?', type: 'string', pattern: '^[a-z-]+$', default: 'eu-west' }],
      }),
    }),
  );
  assert.deepEqual(codes(plan.diagnostics), []);
  assert.equal(plan.answers.get('region'), 'eu-west');
  assert.equal(plan.ok, true);
});

test('a parameter the new pack no longer declares is dropped silently', () => {
  // Keeping it would leave the manifest recording an answer to a question
  // the pack no longer asks.
  const plan = planUpdate(
    input({
      recordedAnswers: answers({ projectName: 'Demo', legacy: 'yes' }),
      appliedDeclarations: [NAME],
    }),
  );
  assert.deepEqual(codes(plan.diagnostics), []);
  assert.deepEqual(plan.droppedParameters, ['legacy']);
  assert.equal(plan.answers.has('legacy'), false);
});

test('a selected scaffold the new pack no longer declares refuses the run', () => {
  // Computing `expected_new` without it would silently orphan every path
  // that scaffold produced — a whole selected feature removed on a bump.
  const plan = planUpdate(input({ recordedScaffolds: ['backend-azure'] }));
  assert.deepEqual(codes(plan.diagnostics), ['E-UPDATE-SCAFFOLD-DROPPED']);
  assert.equal(plan.ok, false);
});

test('a scaffold the new pack still declares survives, in pack.json order', () => {
  const bundled = pack({
    scaffolds: [
      { id: 'alpha', description: 'a' },
      { id: 'beta', description: 'b' },
    ],
  });
  const r = resolveUpdateInputs({
    bundled,
    appliedVersion: '1.0.0',
    // Declared order wins over the recorded order: scaffold steps write
    // files, so the merge order IS the tree.
    recordedScaffolds: ['beta', 'alpha'],
    recordedAnswers: answers(),
  });
  assert.equal(r.ok, true);
  assert.deepEqual(r.selected.map((s) => s.id), ['alpha', 'beta']);
});

test('a scaffold the project did not select is never added', () => {
  const r = resolveUpdateInputs({
    bundled: pack({ scaffolds: [{ id: 'alpha', description: 'a' }] }),
    appliedVersion: '1.0.0',
    recordedScaffolds: [],
    recordedAnswers: answers(),
  });
  assert.deepEqual(r.selected, []);
});

test('both refusals report in one pass', () => {
  // Two authoring faults, learned about at once. Neither outcome writes
  // anything, so there is no risk in continuing to look.
  const r = resolveUpdateInputs({
    bundled: pack({
      parameters: [NAME, { id: 'region', prompt: 'Which region?', type: 'string', pattern: '^[a-z-]+$', required: true }],
    }),
    appliedVersion: '1.0.0',
    recordedScaffolds: ['gone'],
    recordedAnswers: answers(),
  });
  assert.deepEqual(codes(r.bag.items), ['E-UPDATE-SCAFFOLD-DROPPED', 'E-UPDATE-PARAM-UNANSWERED']);
});

test('every code this module raises is exit 1 or 2 and never invented here', () => {
  // F1 §Error States is the product's only catalogue. F3 cites codes and
  // requests rows; it defines none.
  const raised: DiagnosticCode[] = [
    'E-PAYLOAD-DIGEST-MISMATCH',
    'E-MANIFEST-ANSWER-INVALID',
    'E-UPDATE-NOT-NEWER',
    'E-UPDATE-PARAM-UNANSWERED',
    'E-UPDATE-SCAFFOLD-DROPPED',
  ];
  for (const c of raised) assert.ok([1, 2].includes(exitClassFor(c)), c);
});

// ── T-2307: the plan ────────────────────────────────────────────────────

test('the write set is exactly the added and replaced paths, with bytes', () => {
  const plan = planUpdate(
    input({
      renderOld: () => [rp('same.md', 'v1'), rp('changed.md', 'v1'), rp('mine.md', 'v1')],
      renderNew: () => [
        rp('same.md', 'v1'),
        rp('changed.md', 'v2'),
        rp('mine.md', 'v2'),
        rp('fresh.md', 'new'),
      ],
      onDisk: (p) =>
        p === ap('mine.md')
          ? { bytes: B('my own words'), mode: 0o644 }
          : p === ap('fresh.md')
            ? null
            : { bytes: B('v1'), mode: 0o644 },
    }),
  );

  assert.deepEqual(
    plan.writes.map((w) => `${w.path}:${w.disposition}`),
    ['changed.md:replaced', 'fresh.md:added'],
  );
  // Every byte is rendered at plan time, so the executor reads no payload
  // file (C-23) — that removes a window rather than saving a read.
  assert.deepEqual(plan.writes.map((w) => w.bytes.toString()), ['v2', 'new']);
  assert.equal(plan.counts['kept-edited'], 1);
  assert.equal(plan.counts['unchanged'], 1);
});

test('the render thunks are each called exactly once', () => {
  let old = 0;
  let next = 0;
  planUpdate(
    input({
      renderOld: () => {
        old++;
        return [rp('a.md', 'v1')];
      },
      renderNew: () => {
        next++;
        return [rp('a.md', 'v2')];
      },
    }),
  );
  assert.deepEqual([old, next], [1, 1]);
});

test('renderNew is given the resolved answers and scaffolds, not the recorded ones', () => {
  let seen: readonly string[] = [];
  planUpdate(
    input({
      bundled: pack({
        parameters: [NAME, { id: 'region', prompt: 'r', type: 'string', pattern: '^[a-z-]+$', default: 'eu-west' }],
      }),
      renderNew: ({ answers: a }) => {
        seen = [...a.keys()];
        return [];
      },
    }),
  );
  assert.deepEqual(seen, ['projectName', 'region']);
});

test('a payload file the new pack no longer ships is planned for deletion, branded', () => {
  // The default reverses inside `.harness/pack/` and the first reason is
  // decisive: the payload must stay a VERBATIM copy, or its tree digest
  // stops equalling the recorded `payloadDigest` and `verify` fails after
  // every update, permanently.
  const plan = planUpdate(
    input({
      oldPayload: ['pack.json', 'agents/old.md'],
      newPayload: ['pack.json', 'agents/new.md'],
    }),
  );
  assert.deepEqual(plan.payloadDeletes, ['.harness/pack/agents/old.md']);
});

test('an applied orphan is reported and never joins the delete set', () => {
  // `update` deletes no applied path, ever. The one deletion in the
  // feature is of payload files, which is why the journal needs
  // `intent: "delete"` and why that is not a disposition.
  const plan = planUpdate(
    input({
      renderOld: () => [rp('dropped.md', 'v1')],
      renderNew: () => [],
      onDisk: () => ({ bytes: B('v1'), mode: 0o644 }),
    }),
  );
  assert.equal(plan.counts['orphaned'], 1);
  assert.deepEqual(plan.writes, []);
  assert.deepEqual(plan.payloadDeletes, []);
  assert.deepEqual(plan.kept.map((e) => e.path), ['dropped.md']);
});

test('edited paths do not make the plan not-ok', () => {
  // Read this with E-25's rule in view (Q-78): the writing command
  // REPORTS and the read-only mode GATES. An `update` that failed whenever
  // it had something to hand over would stop F6 at exactly the moment its
  // reconciliation work begins (IM-7), disabling the feature Q-62 created.
  const plan = planUpdate(
    input({
      renderOld: () => [rp('a.md', 'v1'), rp('claude.md', 'v1', { adaptExpected: true })],
      renderNew: () => [rp('a.md', 'v2'), rp('claude.md', 'v2', { adaptExpected: true })],
      onDisk: () => ({ bytes: B('mine'), mode: 0o644 }),
    }),
  );
  assert.deepEqual(codes(plan.diagnostics), []);
  assert.equal(plan.ok, true);
  assert.equal(plan.kept.length, 2);
});

test('a fill-expected path never reaches the write set', () => {
  // The prohibition asserted where it bites: not in the classification,
  // but in the list the executor is handed.
  const plan = planUpdate(
    input({
      renderOld: () => [rp('brief.md', 'template', { fillExpected: true })],
      renderNew: () => [rp('brief.md', 'template-v2', { fillExpected: true })],
      onDisk: () => ({ bytes: B('template'), mode: 0o644 }),
    }),
  );
  assert.deepEqual(plan.writes, []);
  assert.equal(plan.counts['kept-fill-expected'], 1);
});

test('the plan names the versions it moves between', () => {
  // So F6's first sentence to the user can be a fact rather than a
  // recollection.
  const plan = planUpdate(input());
  assert.deepEqual(plan.from, { pack: 'coding', version: '1.0.0' });
  assert.deepEqual(plan.to, { pack: 'coding', version: '1.1.0' });
});

test('planning is pure: two runs over the same inputs agree exactly', () => {
  const shape = (p: ReturnType<typeof planUpdate>) =>
    JSON.stringify({
      entries: p.entries.map((e) => [e.path, e.state, e.disposition, e.packAlsoChanged]),
      writes: p.writes.map((w) => [w.path, w.bytes.toString(), w.disposition]),
      deletes: p.payloadDeletes,
      counts: p.counts,
    });
  assert.equal(shape(planUpdate(input())), shape(planUpdate(input())));
});
