import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { confinePath } from './confine.js';
import type { AppliedPath } from './confine.js';
import { confineAtWrite, confineResolved, isStrictDescendant, resolveRoot } from './resolve.js';
import type { ProjectRoot } from './resolve.js';
import { missingPlaceholders } from '../diag/catalogue.js';
import type { DiagnosticCode } from '../diag/codes.js';

const CTX = { index: 3 } as const;

async function withRoot<T>(body: (root: ProjectRoot, dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), 'lintel-confine-'));
  try {
    const r = await resolveRoot(dir);
    assert.ok(r.root, 'the temp dir must resolve');
    return await body(r.root, dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const applied = (p: string): AppliedPath => {
  const r = confinePath(p, CTX);
  assert.ok(r.path, `${p} must pass stages 1-2`);
  return r.path;
};

/* ── the guard that would have caught four bugs at once ─────────────── */

// Every diagnostic these modules emit must fill EVERY placeholder its
// message declares. An unfilled one renders a literal `{path}` to the
// user — visible, but only if somebody looks. The first draft of these
// two modules left `index` unfilled on three codes and passed `to` where
// `E-MAP-RESERVED-DEST` wanted `path`; all four were invisible until
// something asserted it.
test('no confinement diagnostic ships with an unfilled placeholder', async () => {
  const emitted: { code: DiagnosticCode; values: Record<string, string> }[] = [];

  const g = confinePath('/bad', CTX);
  emitted.push({ code: 'E-MAP-PATH-GRAMMAR', values: { index: '3', to: '/bad', construct: 'x' } });
  assert.equal(g.path, undefined);

  const d = confinePath('.github/x', CTX);
  emitted.push({ code: 'E-MAP-RESERVED-DEST', values: { index: '3', path: '.github/x', reserved: '.github' } });
  assert.equal(d.path, undefined);

  emitted.push({ code: 'E-MAP-ESCAPES-ROOT', values: { index: '3', to: 'a/b' } });
  emitted.push({ code: 'E-DEST-SYMLINK', values: { component: 'link', path: 'link/x' } });

  for (const e of emitted) {
    assert.deepEqual(missingPlaceholders(e.code, e.values), [], `${e.code} has unfilled placeholders`);
  }

  // And the real messages carry no visible braces.
  for (const bag of [g.bag, d.bag]) {
    for (const item of bag.items) {
      assert.ok(!/\{[A-Za-z][A-Za-z0-9]*\}/.test(item.message), `${item.code}: ${item.message}`);
    }
  }
});

/* ── strict descendant ──────────────────────────────────────────────── */

// startsWith() is the obvious test and is wrong: /tmp/proj-evil shares a
// prefix with /tmp/proj and is a different tree.
test('a sibling sharing a prefix is not a descendant', () => {
  assert.equal(isStrictDescendant('/tmp/proj', '/tmp/proj/a'), true);
  assert.equal(isStrictDescendant('/tmp/proj', '/tmp/proj-evil/a'), false);
  assert.equal(isStrictDescendant('/tmp/proj', '/tmp/projevil'), false);
});

test('the root itself is not a destination', () => {
  assert.equal(isStrictDescendant('/tmp/proj', '/tmp/proj'), false);
});

/* ── stage 3 ────────────────────────────────────────────────────────── */

test('an ordinary path inside the root resolves', async () => {
  await withRoot(async (root) => {
    const r = await confineResolved(root, applied('a/b/c.md'), CTX);
    assert.ok(r.absolute?.startsWith(root as string));
    assert.equal(r.bag.length, 0);
  });
});

// The apply creates directories as it goes; absent ancestors are normal.
test('a missing ancestor is not a fault', async () => {
  await withRoot(async (root) => {
    const r = await confineResolved(root, applied('does/not/exist/yet.md'), CTX);
    assert.ok(r.absolute, 'a path whose parents do not exist yet must resolve');
  });
});

test('a symlinked ancestor is refused, and the message names the component', async () => {
  await withRoot(async (root, dir) => {
    await mkdir(join(dir, 'real'));
    await symlink(join(dir, 'real'), join(dir, 'link'));
    const r = await confineResolved(root, applied('link/file.md'), CTX);
    assert.equal(r.absolute, undefined);
    assert.deepEqual(r.bag.items.map((d) => d.code), ['E-DEST-SYMLINK']);
    assert.ok(r.bag.items[0]?.message.includes('link'), 'names the offending component');
  });
});

// lstat, not stat. stat follows the link and reports a directory, so a
// symlinked ancestor would pass — which is the escape this stage exists
// to close.
test('a symlink to a directory is still refused', async () => {
  await withRoot(async (root, dir) => {
    await mkdir(join(dir, 'target'));
    await writeFile(join(dir, 'target', 'x.md'), 'x');
    await symlink(join(dir, 'target'), join(dir, 'alias'));
    const r = await confineResolved(root, applied('alias/x.md'), CTX);
    assert.deepEqual(r.bag.items.map((d) => d.code), ['E-DEST-SYMLINK']);
  });
});

test('a symlink pointing OUTSIDE the project is refused for being a link at all', async () => {
  await withRoot(async (root, dir) => {
    const outside = await mkdtemp(join(tmpdir(), 'lintel-outside-'));
    try {
      await symlink(outside, join(dir, 'escape'));
      const r = await confineResolved(root, applied('escape/loot.md'), CTX);
      assert.deepEqual(r.bag.items.map((d) => d.code), ['E-DEST-SYMLINK']);
    } finally {
      await rm(outside, { recursive: true, force: true });
    }
  });
});

/* ── stage 4 ────────────────────────────────────────────────────────── */

// C-14. The plan's lstat is stale by write time; this is the whole
// mitigation, and the test is the window itself.
test('confineAtWrite catches an ancestor that became a link after planning', async () => {
  await withRoot(async (root, dir) => {
    const path = applied('later/file.md');

    await mkdir(join(dir, 'later'));
    const atPlan = await confineResolved(root, path, CTX);
    assert.ok(atPlan.absolute, 'clean at plan time');

    // The window: the directory is replaced by a link between plan and write.
    await rm(join(dir, 'later'), { recursive: true });
    const elsewhere = await mkdtemp(join(tmpdir(), 'lintel-swap-'));
    try {
      await symlink(elsewhere, join(dir, 'later'));
      const atWrite = await confineAtWrite(root, path, CTX);
      assert.equal(atWrite.absolute, undefined, 'the re-check must catch it');
      assert.deepEqual(atWrite.bag.items.map((d) => d.code), ['E-DEST-SYMLINK']);
    } finally {
      await rm(elsewhere, { recursive: true, force: true });
    }
  });
});

test('resolveRoot resolves through a symlinked root rather than refusing it', async () => {
  const real = await mkdtemp(join(tmpdir(), 'lintel-realroot-'));
  const linkDir = await mkdtemp(join(tmpdir(), 'lintel-linkdir-'));
  const link = join(linkDir, 'proj');
  try {
    await symlink(real, link);
    const r = await resolveRoot(link);
    assert.ok(r.root, 'a symlinked root is legitimate');
    // realpath, not resolve: descendant checks must compare against where
    // the root really is, or "inside by string" is outside in fact.
    assert.ok(!(r.root as string).includes('proj'), 'the root must be the real path');
  } finally {
    await rm(real, { recursive: true, force: true });
    await rm(linkDir, { recursive: true, force: true });
  }
});
