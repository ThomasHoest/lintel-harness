/**
 * The fixtures that need a **target directory**, and assert no code at
 * all. T-1212.
 *
 * Every other fixture asserts a diagnostic. These two assert **facts about
 * the filesystem afterwards**, because the rules they cover produce no
 * finding when they work:
 *
 *   MODE       a payload file shipped `0755` lands `0644` in
 *              `.harness/pack/`. There is no code for "phase 1 did not
 *              preserve a mode" — the absence *is* the behaviour.
 *   ENTRY NAME a `--force` re-run over a byte-identical file leaves the
 *              on-disk directory entry named as the **user** had it.
 *
 * Both would pass a "did it exit non-zero" test trivially, which is why
 * US-16 calls them out separately.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import {
  checkTargets,
  confinePath,
  executeApply,
  harnessPath,
  planApply,
  planPayloadCopy,
  readPackPayload,
  resolveRoot,
  type PlannedFile,
  type WritablePath,
} from '../../../dist/index.js';
import { basePack, baseRecipe, materialise, type Fixture } from '../run-fixtures.js';

const hp = (p: string): WritablePath => {
  const h = harnessPath(p);
  if (h === undefined) throw new Error(`not harness-owned: ${p}`);
  return h;
};

/** Minted through the gate, never cast — the brands guard walks `tests/`
 *  too, and C-14 holds only while nothing casts into the brand. */
const ap = (p: string): WritablePath => {
  const r = confinePath(p, { index: 0 });
  if (r.path === undefined) throw new Error(`not confinable: ${p}`);
  return r.path;
};

async function withDirs<T>(body: (packDir: string, target: string) => Promise<T>): Promise<T> {
  const base = await mkdtemp(join(tmpdir(), 'lintel-tgt-'));
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

/* ── the mode fixture (US-30, C-26) ──────────────────────────────────── */

/**
 * **Phase 1 reads no source mode.** Preserving one would make the copy
 * carry a permission decision derived from **the authoring machine's
 * umask** — and a `0755` file would land under `.harness/` with no
 * declared root, no cap, no disclosure and no diagnostic, **invisible to a
 * content-only digest**.
 *
 * There is no code for getting this wrong, so the fixture asserts the mode.
 */
test('fixture: a payload file shipped 0755 lands 0644 in .harness/pack/', async () => {
  if (process.platform === 'win32') return; // no mode to assert
  await withDirs(async (packDir, target) => {
    const f: Fixture = {
      name: 'executable payload',
      because: 'US-30, C-26',
      packJson: basePack(),
      recipeJson: baseRecipe([]),
      executableFiles: ['bin/deploy.sh'],
      expect: [],
      exit: 0,
    };
    await materialise(f, packDir);

    // The source really is 0755 — or the fixture proves nothing.
    assert.equal((await stat(join(packDir, 'bin/deploy.sh'))).mode & 0o777, 0o755);

    const payload = await readPackPayload(pathToFileURL(`${packDir}/`));
    const plan = planPayloadCopy('fixture', payload.entries);
    assert.deepEqual(plan.bag.items.map((d: { code: string }) => d.code), []);

    const { root } = await resolveRoot(target);
    assert.ok(root);

    const files: PlannedFile[] = plan.copies.map((c) => ({
      path: c.to,
      bytes: payload.bytes.get(c.from) as Buffer,
      phase: 1 as const,
      executable: false,
      preExisting: false,
      preHash: null,
      preMode: null,
    }));

    const result = await executeApply({
      root,
      command: 'init',
      files,
      manifest: { path: hp('.harness/manifest.json'), bytes: Buffer.from('{}\n') },
      writeJournal: async () => {},
      removeJournal: async () => {},
      readExisting: async () => null,
    });
    assert.equal(result.complete, true);

    const landed = await stat(join(target, '.harness/pack/bin/deploy.sh'));
    assert.equal(landed.mode & 0o777, 0o644, 'phase 1 reads no source mode — the bit is dropped');
  });
});

/* ── the --force / C-36 fixture (N-5) ────────────────────────────────── */

/**
 * **The one fixture that needs a pre-existing target**, and the one whose
 * failure mode is silent destruction.
 *
 * A project holding `.claude/Agents/README.md` and a pack writing
 * `.claude/agents/README.md` are **the same file** on macOS and Windows.
 * Under exact-string comparison the existence test misses it, the apply
 * overwrites, the journal records `preExisting: false`, no backup is
 * taken, and `--rollback` **deletes a user file it did not create**.
 */
test('fixture: a target differing only by case is found, and blocks', async () => {
  await withDirs(async (_packDir, target) => {
    await mkdir(join(target, '.claude/Agents'), { recursive: true });
    await writeFile(join(target, '.claude/Agents/README.md'), 'THEIRS\n');

    const planned: PlannedFile[] = [
      {
        path: ap('.claude/agents/README.md'),
        bytes: Buffer.from('OURS\n'),
        phase: 2,
        executable: false,
        preExisting: false,
        preHash: null,
        preMode: null,
      },
    ];

    const check = checkTargets(
      planned,
      [{ path: '.claude/Agents/README.md', bytes: Buffer.from('THEIRS\n') }],
      false,
    );
    assert.equal(check.ok, false);
    assert.deepEqual(check.bag.items.map((d: { code: string }) => d.code), ['E-TARGET-EXISTS']);
    assert.deepEqual(
      check.blocking,
      ['.claude/Agents/README.md'],
      'named as the USER has it — C-36',
    );

    // Zero bytes: nothing was written.
    assert.deepEqual(await readdir(target), ['.claude']);
  });
});

/**
 * **The same fixture re-run with `--force` and byte-identical content.**
 *
 * The write is skipped, and the directory entry is **still named
 * `Agents`** afterwards — because `--force` means *this file is already
 * what I would write*, not *rename it to what I would have called it*.
 */
test('fixture: --force over byte-identical content leaves the user’s spelling', async () => {
  await withDirs(async (_packDir, target) => {
    await mkdir(join(target, '.claude/Agents'), { recursive: true });
    await writeFile(join(target, '.claude/Agents/README.md'), 'SAME\n');

    const planned: PlannedFile[] = [
      {
        path: ap('.claude/agents/README.md'),
        bytes: Buffer.from('SAME\n'),
        phase: 2,
        executable: false,
        preExisting: false,
        preHash: null,
        preMode: null,
      },
    ];

    const check = checkTargets(
      planned,
      [{ path: '.claude/Agents/README.md', bytes: Buffer.from('SAME\n') }],
      true,
    );
    assert.equal(check.ok, true, '--force proceeds for byte-identical content');
    assert.deepEqual(check.identical, ['.claude/Agents/README.md']);
    assert.deepEqual(check.blocking, []);

    // The entry is still named as the user had it.
    assert.deepEqual(await readdir(join(target, '.claude')), ['Agents']);
  });
});
