import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { MAX_DEPTH, SCAN_SKIP, walk } from './walk.js';

async function withTree<T>(body: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), 'lintel-walk-'));
  try {
    return await body(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const paths = (r: { entries: readonly { path: string }[] }): string[] => r.entries.map((e) => e.path);

test('it walks files and directories, in a stable sorted order', async () => {
  await withTree(async (dir) => {
    await mkdir(join(dir, 'b'));
    await writeFile(join(dir, 'b', 'y.md'), 'y');
    await writeFile(join(dir, 'a.md'), 'a');

    const r = await walk(dir);
    assert.deepEqual(paths(r), ['a.md', 'b', 'b/y.md']);
    assert.equal(r.truncated, false);
    assert.equal(r.bag.length, 0);
  });
});

test('it records mode and size, or null mode where the platform has none', async () => {
  await withTree(async (dir) => {
    await writeFile(join(dir, 'f.md'), 'hello');
    const r = await walk(dir);
    const f = r.entries.find((e) => e.path === 'f.md');
    assert.equal(f?.size, 5);
    if (process.platform === 'win32') assert.equal(f?.mode, null);
    else assert.equal(typeof f?.mode, 'number');
  });
});

// C-17. lstat, never stat: stat follows the link and reports a directory,
// so a symlinked directory would be walked as if it were one — and the
// walk would start describing somebody else's filesystem.
test('a symlink is reported and skipped, never followed', async () => {
  if (process.platform === 'win32') return; // symlinks need privilege there
  await withTree(async (dir) => {
    const outside = await mkdtemp(join(tmpdir(), 'lintel-outside-'));
    try {
      await writeFile(join(outside, 'secret.txt'), 'x');
      await symlink(outside, join(dir, 'escape'));
      await writeFile(join(dir, 'ok.md'), 'ok');

      const r = await walk(dir);
      assert.deepEqual(paths(r), ['ok.md'], 'the link must not appear as content');
      assert.ok(!paths(r).some((p) => p.includes('secret')), 'and must not be followed');
      assert.deepEqual(r.bag.items.map((d) => d.code), ['W-SCAN-SYMLINK-SKIPPED']);
      assert.equal(r.bag.items[0]?.class, 'notice', 'skipping is by design, not a defect');
    } finally {
      await rm(outside, { recursive: true, force: true });
    }
  });
});

test('the scan skip list is not walked, and is the default', async () => {
  await withTree(async (dir) => {
    for (const skipped of SCAN_SKIP) {
      await mkdir(join(dir, skipped));
      await writeFile(join(dir, skipped, 'inner.txt'), 'x');
    }
    await writeFile(join(dir, 'kept.md'), 'k');

    const r = await walk(dir);
    assert.deepEqual(paths(r), ['kept.md']);
  });
});

// The payload walk passes skip: [] — a pack shipping a node_modules/
// directory is content, and the DENYLIST is what refuses it, not the walk.
test('an empty skip list walks everything', async () => {
  await withTree(async (dir) => {
    await mkdir(join(dir, 'node_modules'));
    await writeFile(join(dir, 'node_modules', 'x.txt'), 'x');
    const r = await walk(dir, { skip: [] });
    assert.ok(paths(r).includes('node_modules/x.txt'));
  });
});

test('the depth bound stops the walk and names which bound', async () => {
  await withTree(async (dir) => {
    let p = dir;
    for (let i = 0; i < MAX_DEPTH + 3; i++) {
      p = join(p, `d${i}`);
      await mkdir(p);
    }
    const r = await walk(dir);
    assert.equal(r.truncated, true);
    assert.deepEqual(r.bag.items.map((d) => d.code), ['E-TRAVERSAL-LIMIT']);
    const msg = r.bag.items[0]?.message ?? '';
    assert.ok(msg.includes('depth'), 'the message must say WHICH bound — "too big" is not actionable');
    assert.ok(!/\{[A-Za-z][A-Za-z0-9]*\}/.test(msg), `unfilled placeholder in ${msg}`);
  });
});

// truncated is the contract: entries is partial, and no caller may treat
// it as a complete picture of the tree.
test('a truncated walk says so', async () => {
  await withTree(async (dir) => {
    let p = dir;
    for (let i = 0; i < MAX_DEPTH + 2; i++) {
      p = join(p, `d${i}`);
      await mkdir(p);
    }
    const r = await walk(dir);
    assert.equal(r.truncated, true);
    assert.ok(r.entries.length > 0, 'partial, not empty');
  });
});

test('an unreadable directory is skipped rather than failing the walk', async () => {
  await withTree(async (dir) => {
    await writeFile(join(dir, 'a.md'), 'a');
    const r = await walk(join(dir, 'does-not-exist'));
    assert.deepEqual(paths(r), []);
    assert.equal(r.truncated, false);
  });
});

test('a walk of the same tree twice produces the same list', async () => {
  await withTree(async (dir) => {
    await mkdir(join(dir, 'z'));
    await writeFile(join(dir, 'z', 'b.md'), 'b');
    await writeFile(join(dir, 'a.md'), 'a');
    const first = paths(await walk(dir));
    const second = paths(await walk(dir));
    assert.deepEqual(first, second, 'the order must be stable — the digest depends on it');
  });
});

/**
 * F1 §NFR says **byte-ascending**, and JavaScript's `<` says UTF-16
 * code-unit. They disagree on astral characters, and walk order feeds a
 * determinism claim: `copy`'s directory recursion consumes it directly, so
 * two applies of one pack version producing byte-identical trees depends
 * on this comparator and not on the platform's `readdir`.
 *
 * Found by the E-06 work, on a tree where every real path is ASCII — which
 * is why it could sit there being wrong.
 */
test('directory entries come back in byte-ascending order, not UTF-16 order', async () => {
  const root = await mkdtemp(join(tmpdir(), 'walk-order-'));
  // U+1F600 is a surrogate pair: `<` puts it before "", UTF-8 after.
  const names = ['\u{1F600}.md', '.md', 'a.md'];
  for (const n of names) await writeFile(join(root, n), 'x');

  const { entries } = await walk(root);
  const got = entries.map((e) => e.path);
  const expected = [...names].sort((a, b) =>
    Buffer.compare(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8')),
  );

  assert.deepEqual(got, expected);
  assert.notDeepEqual(
    got,
    [...names].sort(),
    'and the two orders really do differ here, or this test proves nothing',
  );
  await rm(root, { recursive: true, force: true });
});
