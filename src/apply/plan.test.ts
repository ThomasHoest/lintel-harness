import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planApply, type ApplyInputs } from './plan.js';
import { renderPhase2 } from './plan-phase2.js';
import { confinePath, type AppliedPath } from '../security/confine.js';
import { isTreeDigest } from '../hash/digest.js';
import type { PlannedStep } from '../recipe/plan-steps.js';
import type { PayloadEntry } from '../payload/copy-payload.js';

const codes = (b: { items: readonly { code: string }[] }): string[] => b.items.map((d) => d.code);
const B = (s: string): Buffer => Buffer.from(s, 'utf8');
const ap = (p: string): AppliedPath => {
  const r = confinePath(p, { index: 0 });
  if (r.path === undefined) throw new Error(p);
  return r.path;
};

const FILES: Record<string, string> = {
  'agents/a.md': 'AGENT A',
  'agents/b.md': 'AGENT B',
  'CLAUDE.md.template': '# {{harness:pack.name}}\n',
};

const entries: PayloadEntry[] = Object.entries(FILES).map(([path, v]) => ({
  path,
  kind: 'file',
  size: v.length,
}));

const step = (s: PlannedStep['step'], index: number, writeSet: AppliedPath[]): PlannedStep => ({
  step: s,
  index,
  scaffold: null,
  writeSet,
});

const inputs = (over: Partial<ApplyInputs> = {}): ApplyInputs => ({
  packName: 'demo',
  packVersion: '1.0.0',
  cliVersion: '1.0.0',
  payloadEntries: entries,
  readPayload: (p) => (FILES[p] === undefined ? null : B(FILES[p])),
  phase2: {
    steps: [
      step({ op: 'copy', from: 'agents/', to: '.claude/agents/' }, 0, [
        ap('.claude/agents/a.md'),
        ap('.claude/agents/b.md'),
      ]),
      step(
        { op: 'generate', template: 'CLAUDE.md.template', to: 'CLAUDE.md', anchors: [] },
        1,
        [ap('CLAUDE.md')],
      ),
    ],
    answers: new Map(),
  },
  probe: () => null,
  ...over,
});

test('the plan covers both phases and writes nothing', async () => {
  const plan = await planApply(inputs());
  assert.deepEqual(codes(plan.bag), []);

  const phase1 = plan.files.filter((f) => f.phase === 1);
  const phase2 = plan.files.filter((f) => f.phase === 2);
  assert.equal(phase1.length, 3, 'every payload file, none skipped');
  assert.deepEqual(phase2.map((f) => f.path), ['.claude/agents/a.md', '.claude/agents/b.md', 'CLAUDE.md']);
});

test('phase 1 destinations are under .harness/pack/, verbatim', async () => {
  const plan = await planApply(inputs());
  const one = plan.files.find((f) => f.path === '.harness/pack/agents/a.md');
  assert.ok(one);
  assert.equal(one.bytes.toString('utf8'), 'AGENT A', 'raw bytes, no transformation');
});

/**
 * **The digest is over the PLANNED payload set**, not over what phase 1
 * happened to write — which is what lets the manifest be written **last**
 * while still recording the payload accurately.
 */
test('the payload digest is computed at plan time', async () => {
  const plan = await planApply(inputs());
  assert.ok(isTreeDigest(plan.payloadDigest));

  // Same inputs, same digest: it is a pure function of the payload.
  const again = await planApply(inputs());
  assert.equal(again.payloadDigest, plan.payloadDigest);
});

test('phase 2 renders, substitutes and records where each answer landed', async () => {
  const plan = await planApply(
    inputs({
      phase2: {
        steps: [
          step(
            { op: 'generate', template: 'CLAUDE.md.template', to: 'CLAUDE.md', anchors: [] },
            0,
            [ap('CLAUDE.md')],
          ),
        ],
        answers: new Map(),
      },
    }),
  );
  const claude = plan.files.find((f) => f.path === 'CLAUDE.md');
  assert.equal(claude?.bytes.toString('utf8'), '# demo\n');
});

/* ── the probe ───────────────────────────────────────────────────────── */

/**
 * The probe is the **only** filesystem knowledge the plan has, and it is
 * read-only. `preExisting: false` selects exclusive-create semantics at
 * write time, so getting it wrong is what `E-TARGET-RACE` catches.
 */
test('an existing destination is recorded with its pre-state', async () => {
  const plan = await planApply(
    inputs({ probe: (p) => (p === 'CLAUDE.md' ? { hash: 'abc', mode: 0o644 } : null) }),
  );
  const claude = plan.files.find((f) => f.path === 'CLAUDE.md');
  assert.equal(claude?.preExisting, true);
  assert.equal(claude?.preHash, 'abc');

  const fresh = plan.files.find((f) => f.path === '.claude/agents/a.md');
  assert.equal(fresh?.preExisting, false);
  assert.equal(fresh?.preHash, null);
});

/* ── the two .claude quantifiers, both reached from the plan ─────────── */

const GRANT = '---\nname: x\nallowed-tools: Bash\n---\n';

test('a rendered .claude file declaring a grant fails the plan', async () => {
  const plan = await planApply(
    inputs({
      readPayload: (p) => (p === 'agents/a.md' ? B(GRANT) : B(FILES[p] ?? '')),
    }),
  );
  assert.ok(codes(plan.bag).includes('E-CLAUDE-TOOL-GRANT'));
});

/**
 * The payload quantifier, reached without any step copying the file out —
 * `.harness/pack/.claude/…` is committed, so an agent reading the
 * repository finds it there.
 */
test('a .claude file the recipe never copies out still fails the plan', async () => {
  const shipped: Record<string, string> = { '.claude/agents/sneaky.md': GRANT };
  const plan = await planApply(
    inputs({
      payloadEntries: [{ path: '.claude/agents/sneaky.md', kind: 'file', size: GRANT.length }],
      readPayload: (p) => (shipped[p] === undefined ? null : B(shipped[p])),
      phase2: { steps: [], answers: new Map() },
    }),
  );
  assert.ok(codes(plan.bag).includes('E-CLAUDE-TOOL-GRANT'));
});

/* ── phase 2 ordering ────────────────────────────────────────────────── */

/**
 * An editing step **replaces** an earlier entry rather than adding one:
 * the file is written **once**, with its final content. Writing twice
 * would journal two entries for one path and leave rollback with two
 * intended hashes for the same file.
 */
test('a file edited after it was placed is planned once, with final bytes', () => {
  const r = renderPhase2({
    steps: [
      step({ op: 'copy', from: 'agents/', to: 'out/' }, 0, [ap('out/a.md'), ap('out/b.md')]),
      step({ op: 'rewrite-path', in: ['out/*.md'], find: 'AGENT', replace: 'ROLE' }, 1, [
        ap('out/a.md'),
        ap('out/b.md'),
      ]),
    ],
    payload: Object.keys(FILES),
    readPayload: (p) => (FILES[p] === undefined ? null : B(FILES[p])),
    answers: new Map(),
    packName: 'demo',
    packVersion: '1.0.0',
    cliVersion: '1.0.0',
  });

  assert.deepEqual(codes(r.bag), []);
  assert.equal(r.outputs.length, 2, 'two paths, not four writes');
  assert.deepEqual(r.outputs.map((o) => o.bytes.toString('utf8')), ['ROLE A', 'ROLE B']);
});

// A placing step sets the mode; an editing step changes bytes at a path
// someone else placed and must not silently reset it to 0644.
test('an editing step does not reset the mode a placing step set', () => {
  const r = renderPhase2({
    steps: [
      step({ op: 'copy', from: 'agents/', to: 'out/', executable: true }, 0, [ap('out/a.md')]),
      step({ op: 'rewrite-path', in: ['out/*.md'], find: 'AGENT', replace: 'ROLE' }, 1, [ap('out/a.md')]),
    ],
    payload: Object.keys(FILES),
    readPayload: (p) => (FILES[p] === undefined ? null : B(FILES[p])),
    answers: new Map(),
    packName: 'demo',
    packVersion: '1.0.0',
    cliVersion: '1.0.0',
  });
  assert.equal(r.outputs[0]!.mode, 0o755);
});
