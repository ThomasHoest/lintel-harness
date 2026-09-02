/**
 * T-1218 — determinism, the half not already proved elsewhere.
 *
 * ── Why this file is short ─────────────────────────────────────────────
 *
 * T-1218 asks for "two applies of the same pack version with identical
 * answers and scaffolds into two empty directories producing byte-identical
 * trees and byte-identical manifests, asserted by recursive byte-comparison
 * with no exclusions" (US-14). That property is **already proved**, in
 * full, by `tests/integration/init-determinism.test.ts` (T-2204, US-55):
 * it compares two applies of each of the three bundled packs entry by
 * entry — path, kind, mode, size and bytes, `.harness/` included, no
 * exclusions — and separately proves the manifests are byte-identical
 * (digest included) and carry no path, host, user or timestamp. Writing a
 * second version of that test here would be the redundancy the house
 * rules ask this suite to avoid, not additional coverage — so this file
 * does not repeat it, and cites it instead of restating it.
 *
 * What is **not** covered anywhere else is C-23: the claim that phase 2's
 * bytes are decided entirely at plan time and that `executeApply` reads no
 * payload file, ever — not even the `.harness/pack/` copy it just wrote.
 * That is the property this file exists to prove.
 *
 * ── Why the test is shaped the way it is ───────────────────────────────
 *
 * `F1-epics-and-tasks…` v3.6 records that an earlier version of this test
 * made the payload *unreadable* between phase 1 and phase 2 and "passed
 * under both readings" — a broken implementation that quietly ignored the
 * unreadable payload and one that genuinely reads nothing look identical
 * under that test, so it distinguished nothing.
 *
 * This version distinguishes them: the payload is mutated (not removed)
 * to different, still-readable content, after `planApply` has already
 * captured its bytes and before `executeApply` runs. A build that
 * re-reads at execute time will pick up the mutation and produce
 * different applied output; a build that reads only what `planApply`
 * decided will not.
 *
 * `executeApply`'s own contract (`src/apply/execute.ts`) is that it takes
 * no payload reference at all — only `files: PlannedFile[]` with bytes
 * already embedded — so this is a real behavioural test of that contract,
 * not a restatement of the type signature: the SAME mutable map backs the
 * `readPayload` closure `planApply` was given, so if anything downstream
 * called it again after the mutation, the applied output would show it.
 *
 * A synthetic pack is used rather than a bundled one, deliberately: the
 * mutation has to land on a payload this test owns, and `packs/coding` is
 * pack **source** — mutating it, even in memory during a test run, is not
 * an option this suite reaches for when a fixture pack proves the same
 * property.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import {
  executeApply,
  harness,
  planApply,
  planSteps,
  readPackPayload,
  resolveRoot,
  type Answer,
  type PlannedFile,
} from '../../dist/index.js';
import { basePack, baseRecipe, materialise, type Fixture } from '../fixtures/run-fixtures.js';

async function withPackAndTarget<T>(body: (packDir: string, target: string) => Promise<T>): Promise<T> {
  const base = await mkdtemp(join(tmpdir(), 'lintel-c23-'));
  const packDir = join(base, 'pack');
  const target = join(base, 'project');
  await mkdir(packDir);
  await mkdir(target);
  try {
    return await body(packDir, target);
  } finally {
    await rm(base, { recursive: true, force: true });
  }
}

test('C-23: a payload mutation after planApply has no effect on executeApply’s output', async () => {
  await withPackAndTarget(async (packSourceDir, targetDir) => {
    // A minimal pack whose one applied file is rendered from payload
    // content, so a re-read would be visible in the applied bytes.
    const f: Fixture = {
      name: 'c23-substitution-pack',
      because: 'C-23',
      packJson: basePack({ name: 'c23fixture' }),
      recipeJson: baseRecipe([{ op: 'copy', from: 'src/doc.md', to: 'doc.md' }]),
      files: { 'src/doc.md': 'ORIGINAL PAYLOAD CONTENT\n' },
      expect: [],
      exit: 0,
    };
    await materialise(f, packSourceDir);

    const payload = await readPackPayload(pathToFileURL(`${packSourceDir}/`));
    // A MUTABLE copy — the same map the `readPayload` closure below reads
    // from, so mutating it after planning is a real second read if one
    // happens, not a change to a snapshot nobody consults again.
    const live = new Map(payload.bytes);
    const readPayload = (p: string): Buffer | null => live.get(p) ?? null;

    const payloadFilePaths = payload.entries
      .filter((e) => e.kind === 'file' && e.symlink !== true)
      .map((e) => e.path);

    const answers = new Map<string, Answer>();
    const plan0 = planSteps({
      pack: { ...(f.packJson as Record<string, unknown>) } as never,
      recipe: f.recipeJson as never,
      selected: [],
      answers,
      payload: payloadFilePaths,
    });
    assert.equal(plan0.bag.errors.length, 0, plan0.bag.items.map((d) => d.code).join(', '));

    const applyPlan = await planApply({
      packName: 'c23fixture',
      packVersion: '1.0.0',
      cliVersion: '1.0.0',
      payloadEntries: payload.entries,
      readPayload,
      phase2: {
        steps: plan0.steps,
        answers,
        // No answers to check against — plain copy, no substitution.
      } as never,
      probe: () => null,
    });
    assert.equal(applyPlan.bag.errors.length, 0, applyPlan.bag.items.map((d) => d.code).join(', '));

    const phase2File = applyPlan.files.find((fl) => fl.phase === 2 && fl.path.endsWith('doc.md'));
    assert.ok(phase2File, 'expected a phase-2 output for doc.md');
    assert.equal(phase2File!.bytes.toString('utf8'), 'ORIGINAL PAYLOAD CONTENT\n');

    // ── the mutation: after planning, before executing ─────────────────
    live.set('src/doc.md', Buffer.from('MUTATED AFTER PLANNING — MUST NOT APPEAR\n'));

    const { root } = await resolveRoot(targetDir);
    assert.ok(root, 'target must resolve');

    const result = await executeApply({
      root: root!,
      command: 'init',
      files: applyPlan.files as readonly PlannedFile[],
      manifest: { path: harness.manifest(), bytes: Buffer.from('{}\n') },
      writeJournal: async () => {},
      removeJournal: async () => {},
      readExisting: async () => null,
    });
    assert.equal(result.complete, true, result.bag.items.map((d) => d.code).join(', '));

    const landed = await readFile(join(targetDir, 'doc.md'), 'utf8');
    assert.equal(
      landed,
      'ORIGINAL PAYLOAD CONTENT\n',
      'executeApply must write the bytes planApply decided, never re-read the payload',
    );
    assert.ok(!landed.includes('MUTATED'), 'the post-planning mutation must never reach the applied file');

    // And the .harness/pack/ copy (phase 1) is likewise the pre-mutation
    // bytes — proving the same property over the payload copy itself.
    const copied = await readFile(join(targetDir, '.harness', 'pack', 'src', 'doc.md'), 'utf8');
    assert.equal(copied, 'ORIGINAL PAYLOAD CONTENT\n');
  });
});
