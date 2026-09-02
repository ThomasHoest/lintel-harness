import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { executeApply, type ExecuteInputs } from './execute.js';
import { resolveRoot, type ProjectRoot } from '../security/resolve.js';
import { confinePath } from '../security/confine.js';
import { harnessPath } from '../security/harness-paths.js';
import type { WritablePath } from '../security/harness-paths.js';
import type { Journal } from '../fs/journal.js';
import type { PlannedFile } from './plan.js';

const codes = (b: { items: readonly { code: string }[] }): string[] => b.items.map((d) => d.code);
const B = (s: string): Buffer => Buffer.from(s, 'utf8');
const ap = (p: string): WritablePath => {
  const r = confinePath(p, { index: 0 });
  if (r.path === undefined) throw new Error(p);
  return r.path;
};
const hp = (p: string): WritablePath => {
  const h = harnessPath(p);
  if (h === undefined) throw new Error(p);
  return h;
};

const file = (path: WritablePath, phase: 1 | 2, content = 'x', over: Partial<PlannedFile> = {}): PlannedFile => ({
  path,
  bytes: B(content),
  phase,
  executable: false,
  preExisting: false,
  preHash: null,
  preMode: null,
  ...over,
});

async function withProject<T>(body: (root: ProjectRoot, dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), 'lintel-exec-'));
  try {
    const r = await resolveRoot(dir);
    assert.ok(r.root, 'the temp dir must resolve as a project root');
    return await body(r.root, dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function inputs(root: ProjectRoot, files: PlannedFile[], over: Partial<ExecuteInputs> = {}): ExecuteInputs {
  return {
    root,
    command: 'init',
    files,
    manifest: { path: hp('.harness/manifest.json'), bytes: B('{"manifestVersion":1}\n') },
    writeJournal: async () => {},
    removeJournal: async () => {},
    readExisting: async () => null,
    ...over,
  };
}

test('an apply writes both phases and the manifest, and completes', async () => {
  await withProject(async (root, dir) => {
    const r = await executeApply(
      inputs(root, [
        file(hp('.harness/pack/agents/a.md'), 1, 'PAYLOAD'),
        file(ap('.claude/agents/a.md'), 2, 'APPLIED'),
      ]),
    );
    assert.deepEqual(codes(r.bag), []);
    assert.equal(r.complete, true);
    assert.equal(await readFile(join(dir, '.harness/pack/agents/a.md'), 'utf8'), 'PAYLOAD');
    assert.equal(await readFile(join(dir, '.claude/agents/a.md'), 'utf8'), 'APPLIED');
    assert.equal(await readFile(join(dir, '.harness/manifest.json'), 'utf8'), '{"manifestVersion":1}\n');
  });
});

/**
 * **The order is the whole design.** The journal goes down before the
 * first write and is flushed, so a crash at any later point leaves a
 * record of what was intended. The manifest goes last, because it is the
 * statement *this project has this pack applied* and one present after a
 * crash would claim an apply that did not finish.
 */
test('the journal is written before any file, and removed after the manifest', async () => {
  await withProject(async (root) => {
    const order: string[] = [];
    await executeApply(
      inputs(root, [file(ap('a.md'), 2)], {
        writeJournal: async (j: Journal) => {
          order.push(`journal:${j.entries.length}`);
        },
        removeJournal: async () => {
          order.push('journal-removed');
        },
      }),
    );
    assert.deepEqual(order, ['journal:1', 'journal-removed']);
  });
});

test('phase 1 is written before phase 2', async () => {
  await withProject(async (root, dir) => {
    const r = await executeApply(
      inputs(root, [
        file(ap('applied.md'), 2, 'second'),
        file(hp('.harness/pack/x.md'), 1, 'first'),
      ]),
    );
    // Both land; the assertion is the ORDER, which `written` records.
    assert.deepEqual(r.written, ['.harness/pack/x.md', 'applied.md', '.harness/manifest.json']);
    assert.equal(await readFile(join(dir, '.harness/pack/x.md'), 'utf8'), 'first');
  });
});

/**
 * A backup written **after** the overwrite is a backup of the new content.
 * The ordering is what makes rollback able to restore anything at all.
 */
test('a backup is written before the overwrite it protects', async () => {
  await withProject(async (root, dir) => {
    await writeFile(join(dir, 'a.md'), 'THEIRS');
    const r = await executeApply(
      inputs(root, [file(ap('a.md'), 2, 'OURS', { preExisting: true, preMode: 0o644 })], {
        readExisting: async () => B('THEIRS'),
      }),
    );
    assert.equal(r.complete, true);
    assert.equal(await readFile(join(dir, 'a.md'), 'utf8'), 'OURS');
    assert.equal(
      await readFile(join(dir, '.harness/journal.d/00000'), 'utf8'),
      'THEIRS',
      'the pre-apply bytes, not the new ones',
    );
  });
});

/* ── stage 4, per file ───────────────────────────────────────────────── */

/**
 * Between planning and writing an ancestor can become a symlink. A stage
 * that runs **at write time** exists to close that window rather than
 * describe it — so it runs per file, not once for the plan.
 */
test('a symlinked ancestor stops the write', async () => {
  if (process.platform === 'win32') return;
  await withProject(async (root, dir) => {
    const { symlink } = await import('node:fs/promises');
    await mkdir(join(dir, 'elsewhere'));
    await symlink(join(dir, 'elsewhere'), join(dir, 'docs'));

    const r = await executeApply(inputs(root, [file(ap('docs/a.md'), 2)]));
    assert.ok(codes(r.bag).includes('E-DEST-SYMLINK'));
    assert.equal(r.complete, false);
  });
});

/**
 * `.harness/pack/**` is a `HarnessPath`, so until stage 4 took
 * `WritablePath` the largest write the product performs was the one write
 * with **no** stage-4 check. Found by E-07 while building the manifest
 * write, which is a `HarnessPath` for the same reason.
 */
test('a phase-1 payload write is re-confined too, not exempt', async () => {
  if (process.platform === 'win32') return;
  await withProject(async (root, dir) => {
    const { symlink } = await import('node:fs/promises');
    await mkdir(join(dir, 'elsewhere'));
    await mkdir(join(dir, '.harness'));
    await symlink(join(dir, 'elsewhere'), join(dir, '.harness/pack'));

    const r = await executeApply(inputs(root, [file(hp('.harness/pack/x.md'), 1)]));
    assert.ok(codes(r.bag).includes('E-DEST-SYMLINK'));
    assert.equal(r.complete, false);
  });
});

/* ── failure stops ───────────────────────────────────────────────────── */

/**
 * Stop at the first failure: the journal is intact and the project is
 * recoverable, and continuing would only write more to undo.
 */
test('a destination that appeared after planning stops the run', async () => {
  await withProject(async (root, dir) => {
    await writeFile(join(dir, 'b.md'), 'someone else');
    const r = await executeApply(
      inputs(root, [file(ap('a.md'), 2), file(ap('b.md'), 2), file(ap('c.md'), 2)]),
    );
    assert.deepEqual(codes(r.bag), ['E-TARGET-RACE']);
    assert.equal(r.complete, false);
    assert.deepEqual(r.written, ['a.md'], 'and c.md was never attempted');
    assert.equal(await readFile(join(dir, 'b.md'), 'utf8'), 'someone else');
  });
});

test('the journal is not removed when the apply did not complete', async () => {
  await withProject(async (root, dir) => {
    await writeFile(join(dir, 'a.md'), 'theirs');
    let removed = false;
    const r = await executeApply(
      inputs(root, [file(ap('a.md'), 2)], { removeJournal: async () => { removed = true; } }),
    );
    assert.equal(r.complete, false);
    assert.equal(removed, false, 'the journal is the way back and must survive');
  });
});
