import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, stat, writeFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { atomicWrite, ensureDir, DIR_MODE } from './atomic-write.js';
import { harnessPath, type WritablePath } from '../security/harness-paths.js';
import { confinePath } from '../security/confine.js';

const codes = (b: { items: readonly { code: string }[] }): string[] => b.items.map((d) => d.code);
const B = (s: string): Buffer => Buffer.from(s, 'utf8');

const applied = (p: string): WritablePath => {
  const r = confinePath(p, { index: 0 });
  if (r.path === undefined) throw new Error(p);
  return r.path;
};
const owned = (p: string): WritablePath => {
  const h = harnessPath(p);
  if (h === undefined) throw new Error(p);
  return h;
};

async function withDir<T>(body: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), 'lintel-write-'));
  try {
    return await body(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test('a new file is written with its bytes and its mode', async () => {
  await withDir(async (dir) => {
    const r = await atomicWrite(dir, {
      path: applied('docs/a.md'),
      bytes: B('hello'),
      mode: 0o644,
      expectNew: true,
    });
    assert.deepEqual(codes(r.bag), []);
    assert.equal(r.ok, true);
    assert.equal(await readFile(join(dir, 'docs/a.md'), 'utf8'), 'hello');
    if (process.platform !== 'win32') {
      assert.equal((await stat(join(dir, 'docs/a.md'))).mode & 0o777, 0o644);
    }
  });
});

test('both brands are accepted — the writer takes WritablePath', async () => {
  await withDir(async (dir) => {
    const a = await atomicWrite(dir, { path: applied('a.md'), bytes: B('x'), mode: 0o644, expectNew: true });
    const h = await atomicWrite(dir, {
      path: owned('.harness/pack/a.md'),
      bytes: B('y'),
      mode: 0o644,
      expectNew: true,
    });
    assert.equal(a.ok && h.ok, true);
    assert.equal(await readFile(join(dir, '.harness/pack/a.md'), 'utf8'), 'y');
  });
});

/**
 * **The whole reason `link` is used rather than `rename`.**
 *
 * A plan is computed, a disclosure is shown, a human reads it, and only
 * then does the write happen. If the destination appeared in that window
 * the plan was wrong about the project — and `rename` would **silently
 * overwrite it** while `link` fails `EEXIST`.
 */
test('a destination the plan expected to be new, which now exists, stops the run', async () => {
  await withDir(async (dir) => {
    await writeFile(join(dir, 'a.md'), 'someone else got here first');
    const r = await atomicWrite(dir, {
      path: applied('a.md'),
      bytes: B('mine'),
      mode: 0o644,
      expectNew: true,
    });
    assert.deepEqual(codes(r.bag), ['E-TARGET-RACE']);
    assert.equal(r.ok, false);
    assert.equal(
      await readFile(join(dir, 'a.md'), 'utf8'),
      'someone else got here first',
      'and the existing file is untouched',
    );
  });
});

// The overwrite case is a different operation on purpose: the plan knows
// the file is there, it is journalled with its pre-hash and backup, and
// replacing it is the intent.
test('an expected overwrite replaces the file', async () => {
  await withDir(async (dir) => {
    await writeFile(join(dir, 'a.md'), 'old');
    const r = await atomicWrite(dir, {
      path: applied('a.md'),
      bytes: B('new'),
      mode: 0o644,
      expectNew: false,
    });
    assert.deepEqual(codes(r.bag), []);
    assert.equal(await readFile(join(dir, 'a.md'), 'utf8'), 'new');
  });
});

/** The temp file is a **sibling** of the destination, never in `/tmp`:
 *  `rename` and `link` are atomic only within one filesystem, and a temp
 *  directory is routinely on another. */
test('no temp file survives a successful write, or a failed one', async () => {
  await withDir(async (dir) => {
    await atomicWrite(dir, { path: applied('a.md'), bytes: B('x'), mode: 0o644, expectNew: true });
    await writeFile(join(dir, 'b.md'), 'exists');
    await atomicWrite(dir, { path: applied('b.md'), bytes: B('y'), mode: 0o644, expectNew: true });

    const left = (await readdir(dir)).filter((f) => f.includes('.tmp'));
    assert.deepEqual(left, [], 'a leftover temp is a file a later run would find and not understand');
  });
});

/* ── created directories ─────────────────────────────────────────────── */

/**
 * **In creation order**, because rollback removes them in reverse. A set
 * with no order would leave the caller guessing which to remove first, and
 * removing a parent before its child fails.
 */
test('created directories come back outermost-first', async () => {
  await withDir(async (dir) => {
    const r = await atomicWrite(dir, {
      path: applied('a/b/c/deep.md'),
      bytes: B('x'),
      mode: 0o644,
      expectNew: true,
    });
    assert.deepEqual(
      r.createdDirs.map((d) => d.slice(dir.length + 1)),
      ['a', join('a', 'b'), join('a', 'b', 'c')],
    );
  });
});

test('an existing directory is not reported as created', async () => {
  await withDir(async (dir) => {
    await ensureDir(join(dir, 'a'), new Set());
    const r = await atomicWrite(dir, {
      path: applied('a/x.md'),
      bytes: B('x'),
      mode: 0o644,
      expectNew: true,
    });
    assert.deepEqual(r.createdDirs, [], 'rollback must not remove what it did not create');
  });
});

test('directories are created 0755, reading no source mode', async () => {
  if (process.platform === 'win32') return;
  await withDir(async (dir) => {
    await atomicWrite(dir, { path: applied('d/x.md'), bytes: B('x'), mode: 0o644, expectNew: true });
    assert.equal((await stat(join(dir, 'd'))).mode & 0o777, DIR_MODE);
  });
});

test('a second write into a known directory creates nothing', async () => {
  await withDir(async (dir) => {
    const known = new Set<string>();
    const first = await atomicWrite(dir, { path: applied('d/a.md'), bytes: B('a'), mode: 0o644, expectNew: true }, known);
    const second = await atomicWrite(dir, { path: applied('d/b.md'), bytes: B('b'), mode: 0o644, expectNew: true }, known);
    assert.equal(first.createdDirs.length, 1);
    assert.deepEqual(second.createdDirs, []);
  });
});
