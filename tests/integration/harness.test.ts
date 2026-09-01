/**
 * T-0102 — the harness proves itself before anything relies on it.
 *
 * Every acceptance test in F1, F2, F3 and F6 asserts through `runCli`,
 * `snapshot` and `unchanged`. If those are wrong, the suite reports
 * confidence it has not earned — so they are tested against the filesystem
 * directly, with no CLI in the picture.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile, chmod, symlink, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { snapshot, unchanged, withTempDir, EXIT } from '../harness/cli.js';

test('the four exit classes are the ones F1 names', () => {
  assert.deepEqual(EXIT, { ok: 0, userFault: 1, integrityFault: 2, ioFailure: 3 });
});

test('a snapshot records mode, and distinguishes 0644 from 0755', async () => {
  await withTempDir(async (dir) => {
    await writeFile(join(dir, 'plain.txt'), 'x');
    await chmod(join(dir, 'plain.txt'), 0o644);
    await writeFile(join(dir, 'script.sh'), '#!/bin/sh\n');
    await chmod(join(dir, 'script.sh'), 0o755);

    const entries = await snapshot(dir);
    const byPath = new Map(entries.map((e) => [e.path, e]));

    if (process.platform === 'win32') {
      assert.equal(byPath.get('plain.txt')?.mode, null, 'Windows represents no mode');
      return;
    }
    assert.equal(byPath.get('plain.txt')?.mode, 0o644);
    assert.equal(byPath.get('script.sh')?.mode, 0o755);
  });
});

// SEC (C-36). The snapshot reports the ON-DISK spelling. A test that
// composed its own path could not tell `Settings.json` from
// `settings.json` on a case-insensitive volume, and two fixtures turn on
// exactly that distinction.
test('a snapshot reports the on-disk entry name, not a requested one', async () => {
  await withTempDir(async (dir) => {
    await mkdir(join(dir, '.claude'));
    await writeFile(join(dir, '.claude', 'Settings.json'), '{}');

    const entries = await snapshot(dir);
    const names = entries.map((e) => e.path);
    assert.ok(names.includes('.claude/Settings.json'), `got ${JSON.stringify(names)}`);
    assert.ok(!names.includes('.claude/settings.json'), 'must report the stored spelling');
  });
});

test('a snapshot marks a symlink as a symlink rather than following it', async () => {
  if (process.platform === 'win32') return; // symlinks need privilege there
  await withTempDir(async (dir) => {
    await writeFile(join(dir, 'real.txt'), 'x');
    await symlink(join(dir, 'real.txt'), join(dir, 'link.txt'));
    const entries = await snapshot(dir);
    assert.equal(entries.find((e) => e.path === 'link.txt')?.kind, 'symlink');
  });
});

test('unchanged() detects a content change, a mode change and a new file', async () => {
  await withTempDir(async (dir) => {
    await writeFile(join(dir, 'a.txt'), 'one');
    const before = await snapshot(dir);
    assert.ok(unchanged(before, await snapshot(dir)), 'a stable tree must compare equal');

    await writeFile(join(dir, 'a.txt'), 'two!');
    assert.ok(!unchanged(before, await snapshot(dir)), 'content change must be detected');

    await writeFile(join(dir, 'a.txt'), 'one');
    assert.ok(unchanged(before, await snapshot(dir)), 'restored tree must compare equal');

    if (process.platform !== 'win32') {
      await chmod(join(dir, 'a.txt'), 0o600);
      assert.ok(!unchanged(before, await snapshot(dir)), 'mode change must be detected');
      await chmod(join(dir, 'a.txt'), 0o644);
    }

    await writeFile(join(dir, 'b.txt'), 'new');
    assert.ok(!unchanged(before, await snapshot(dir)), 'added file must be detected');
    await rm(join(dir, 'b.txt'));
  });
});

test('withTempDir removes its directory even when the body throws', async () => {
  let captured = '';
  await assert.rejects(
    withTempDir(async (dir) => {
      captured = dir;
      throw new Error('boom');
    }),
    /boom/,
  );
  await assert.rejects(snapshot(captured), 'the directory must be gone');
});
