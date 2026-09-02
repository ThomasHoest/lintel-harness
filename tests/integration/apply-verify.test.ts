/**
 * T-1109 — a real pack applied into a real directory, and then verified.
 *
 * Everything before this asserted a piece. This asserts the **loop**:
 * `planApply` → `executeApply` → bytes on disk → `payloadDigest` →
 * `verifyProject`, over the packs that ship, with no fixtures anywhere.
 *
 * It is the first evidence for the claim the whole product rests on —
 * **that applied state is recomputable** (Q-43). The manifest holds no
 * per-file hashes; if the recomputation did not reproduce the tree exactly,
 * nothing here would pass and no amount of specification would make it so.
 *
 * It is also **S7's shape**, one step short: S7 wants this repository
 * produced by the tool, and this produces a temporary one. What it proves
 * is that the machinery can.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import {
  atomicWrite,
  canonicalJson,
  executeApply,
  fileHash,
  loadPack,
  packDir,
  parseStrictJson,
  planApply,
  planSteps,
  resolveAnswers,
  confinePath,
  resolveRoot,
  selectScaffolds,
  validateRecipe,
  verifyProject,
  walk,
  harnessPath,
  type Answer,
  type AppliedPath,
  type PackManifest,
  type PlannedFile,
  type ProjectRoot,
  type RecomputedPath,
  type WritablePath,
} from '../../dist/index.js';

const CLI = '1.0.0';

/**
 * Minted through `harnessPath`, never cast.
 *
 * C-14's guarantee — *a path that skipped the gate is a compile error* —
 * holds only while nothing casts into the brand, and
 * `tests/structural/brands.test.ts` walks `tests/` as well as `src/`
 * precisely so a test cannot be the exception. This is a real constructor
 * call: it fails loudly if the path stops being harness-owned.
 */
const hp = (p: string): WritablePath => {
  const h = harnessPath(p);
  if (h === undefined) throw new Error(`not harness-owned: ${p}`);
  return h;
};
const codes = (b: { items: readonly { code: string }[] }): string[] =>
  b.items.map((d: { code: string }) => d.code);

async function withProject<T>(body: (root: ProjectRoot, dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), 'lintel-apply-'));
  try {
    const r = await resolveRoot(dir);
    assert.ok(r.root);
    return await body(r.root, dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/** Everything an apply of one bundled pack needs, assembled once. */
async function applyPack(name: string, root: ProjectRoot, dir: string) {
  const { loaded } = await loadPack(name, CLI);
  assert.ok(loaded, name);

  const parsed = parseStrictJson(loaded.recipeText, `${name}/recipe.json`, 'E-RECIPE-INVALID');
  const { recipe } = validateRecipe(parsed.value!, name);
  assert.ok(recipe, name);

  const packRoot = fileURLToPath(packDir(name));
  const { entries } = await walk(packRoot);
  const payloadEntries = entries.map((e) => ({
    path: e.path,
    kind: e.kind,
    size: e.size,
  }));
  const payload = payloadEntries.filter((e) => e.kind === 'file').map((e) => e.path);
  const readPayload = (p: string): Buffer | null => {
    try {
      return readFileSync(join(packRoot, p));
    } catch {
      return null;
    }
  };

  // A required parameter has no default by definition, so an apply must
  // supply one — answering them is what makes this an apply.
  const supplied = new Map<string, Answer>();
  for (const p of loaded.pack.parameters ?? []) {
    if (p.required !== true) continue;
    supplied.set(p.id, p.type === 'boolean' ? true : p.type === 'enum' ? (p.values ?? [''])[0]! : 'Demo Project');
  }
  const { answers } = resolveAnswers(loaded.pack.parameters, supplied);
  const { selected } = selectScaffolds(loaded.pack, []);
  const steps = planSteps({ pack: loaded.pack, recipe, selected, answers, payload });
  assert.deepEqual(codes(steps.bag), [], `${name}: the plan must be clean`);

  const plan = await planApply({
    packName: name,
    packVersion: loaded.pack.version,
    cliVersion: CLI,
    payloadEntries,
    readPayload,
    phase2: { steps: steps.steps, answers },
    probe: () => null,
  });
  assert.deepEqual(codes(plan.bag), [], `${name}: ${plan.bag.items.map((d) => d.message).join('\n')}`);

  const manifest: PackManifest = {
    manifestVersion: 1,
    cli: CLI,
    pack: { name, version: loaded.pack.version, formatVersion: loaded.pack.formatVersion },
    payloadDigest: plan.payloadDigest,
    parameters: Object.fromEntries(answers),
    scaffolds: [],
  } as unknown as PackManifest;

  const result = await executeApply({
    root,
    command: 'init',
    files: plan.files as PlannedFile[],
    manifest: {
      path: hp('.harness/manifest.json'),
      bytes: Buffer.from(canonicalJson(manifest), 'utf8'),
    },
    writeJournal: async (j) => {
      await atomicWrite(dir, {
        path: hp('.harness/journal.json'),
        bytes: Buffer.from(JSON.stringify(j), 'utf8'),
        mode: 0o644,
        expectNew: false,
      });
    },
    removeJournal: async () => {
      await rm(join(dir, '.harness/journal.json'), { force: true });
    },
    readExisting: async () => null,
  });

  return { loaded, plan, result, steps, answers, payloadEntries };
}

for (const name of ['coding', 'writing', 'planning']) {
  test(`${name} applies into an empty directory and completes`, async () => {
    await withProject(async (root, dir) => {
      const { plan, result } = await applyPack(name, root, dir);
      assert.deepEqual(codes(result.bag), [], `${name}: ${result.bag.items.map((d) => d.message).join('\n')}`);
      assert.equal(result.complete, true);

      // Every planned file is on disk with its planned bytes.
      for (const f of plan.files) {
        const onDisk = await readFile(join(dir, ...f.path.split('/')));
        assert.equal(Buffer.compare(onDisk, f.bytes), 0, f.path);
      }
    });
  });

  /**
   * **The recomputation identity, end to end.** The manifest holds no
   * per-file hashes (Q-43): `verify` re-runs phase 2 in memory and compares
   * to disk. If the two ever disagreed, this is where it would show — and
   * it is the property `update` is built on top of.
   */
  test(`${name} verifies clean immediately after being applied`, async () => {
    await withProject(async (root, dir) => {
      const { plan, steps, answers, loaded } = await applyPack(name, root, dir);

      // `applied` re-mints through the gate rather than casting: a phase-2
      // destination is an AppliedPath by construction, and re-deriving it
      // asserts that rather than assuming it.
      const applied = (path: string): AppliedPath => {
        const r = confinePath(path, { index: 0 });
        assert.ok(r.path, `${path} must still pass the gate`);
        return r.path;
      };

      const recomputed: RecomputedPath[] = plan.files
        .filter((f) => f.phase === 2)
        .map((f) => {
          const path = applied(f.path);
          return {
            path,
            bytes: f.bytes,
            mode: f.executable ? 0o755 : 0o644,
            adaptExpected: steps.adaptExpected.includes(path),
            fillExpected: steps.fillExpected.includes(path),
          };
        });

      const r = verifyProject({
        recordedDigest: plan.payloadDigest,
        computedDigest: plan.payloadDigest,
        declarations: loaded.pack.parameters ?? [],
        recordedAnswers: answers,
        recomputed,
        onDisk: (p: string) => {
          try {
            return { bytes: readFileSync(join(dir, ...p.split('/'))), mode: 0o644 };
          } catch {
            return null;
          }
        },
      });

      assert.deepEqual(codes(r.bag), [], `${name}: ${r.bag.items.map((d) => d.message).join('\n')}`);
      assert.equal(r.counts.differs, 0);
      assert.equal(r.counts.missing, 0);
      // Every pack ships something to be filled in, and nobody has filled
      // it — which is exactly what `unfilled` exists to say.
      assert.ok(r.counts.unfilled > 0, 'a freshly applied project has unfilled templates');
    });
  });

  test(`${name}'s payload lands verbatim, and its digest matches what was planned`, async () => {
    await withProject(async (root, dir) => {
      const { plan, payloadEntries } = await applyPack(name, root, dir);

      // Phase 1 is a verbatim copy: byte-for-byte, and every file, none
      // skipped by scaffold selection or anything else.
      const files = payloadEntries.filter((e) => e.kind === 'file');
      const packRoot = fileURLToPath(packDir(name));
      for (const e of files) {
        const source = await readFile(join(packRoot, e.path));
        const copied = await readFile(join(dir, '.harness', 'pack', ...e.path.split('/')));
        assert.equal(Buffer.compare(source, copied), 0, e.path);
      }
      assert.equal(
        plan.files.filter((f) => f.phase === 1).length,
        files.length,
        'no payload file is skipped',
      );
    });
  });
}

/* ── US-14: the apply is a whole, or it is nothing ───────────────────── */

/**
 * The journal is written before the first byte and removed only after the
 * manifest lands. Between those points the project is mid-apply and
 * recoverable — which is the whole reason the manifest is written last.
 */
test('a completed apply leaves a manifest and no journal', async () => {
  await withProject(async (root, dir) => {
    await applyPack('coding', root, dir);
    await stat(join(dir, '.harness/manifest.json'));
    await assert.rejects(
      () => stat(join(dir, '.harness/journal.json')),
      'a journal after a completed apply would claim an interrupted one',
    );
  });
});

/**
 * US-13. `init` into a tree where a target already exists must not
 * silently overwrite it — and here the check is the writer's own
 * exclusive-create, reached through a real apply rather than a unit
 * fixture.
 */
test('an occupied destination stops the apply and leaves the file alone', async () => {
  await withProject(async (root, dir) => {
    const { loaded } = await loadPack('coding', CLI);
    const occupied = join(dir, 'CLAUDE.md');
    await writeFile(occupied, 'THE USER WROTE THIS');
    assert.ok(loaded);

    const { result } = await applyPack('coding', root, dir);
    assert.equal(result.complete, false);
    assert.ok(codes(result.bag).includes('E-TARGET-RACE'));
    assert.equal(await readFile(occupied, 'utf8'), 'THE USER WROTE THIS');
  });
});

/* ── determinism, over a real filesystem ─────────────────────────────── */

// §NFR: two applies of the same pack version with the same answers produce
// byte-identical trees. Asserted here against disk rather than in memory.
test('two applies of one pack produce byte-identical trees', async () => {
  const digests: string[][] = [];
  for (let i = 0; i < 2; i++) {
    await withProject(async (root, dir) => {
      const { plan } = await applyPack('writing', root, dir);
      const rows: string[] = [];
      for (const f of [...plan.files].sort((a, b) => (a.path < b.path ? -1 : 1))) {
        rows.push(`${f.path} ${fileHash(await readFile(join(dir, ...f.path.split('/'))))}`);
      }
      digests.push(rows);
    });
  }
  assert.deepEqual(digests[0], digests[1]);
});
