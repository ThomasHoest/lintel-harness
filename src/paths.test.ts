import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { packsDir, packDir } from './paths.js';

test('the bundled pack directory resolves to a real directory', async () => {
  const dir = fileURLToPath(packsDir());
  assert.ok((await stat(dir)).isDirectory(), `${dir} is not a directory`);
});

test('it resolves the three bundled packs, each with a pack.json', async () => {
  const entries = await readdir(fileURLToPath(packsDir()), { withFileTypes: true });
  const names = entries.filter((e) => e.isDirectory()).map((e) => e.name).sort();
  assert.deepEqual(names, ['coding', 'planning', 'writing']);

  for (const name of names) {
    const manifest = fileURLToPath(new URL('pack.json', packDir(name)));
    assert.ok((await stat(manifest)).isFile(), `${name} has no pack.json`);
  }
});

// SEC (U-12). The resolution is install-relative, never cwd-relative.
// Shadowing the bundled packs from a user's project is the hole this closes,
// so the assertion is that the answer does NOT move when cwd does.
test('resolution does not follow the working directory', async () => {
  const before = packsDir().href;
  const original = process.cwd();
  try {
    process.chdir('/');
    assert.equal(packsDir().href, before);
    assert.equal(packDir('coding').href, new URL('coding/', packsDir()).href);
  } finally {
    process.chdir(original);
  }
});

// DEPTH INVARIANT (see paths.ts). This file must compile one level inside
// dist/. If it is ever moved deeper, `../packs/` points at nothing and the
// failure would otherwise surface as "no such pack".
test('the module sits at the depth its relative path assumes', () => {
  const here = new URL('.', import.meta.url);
  assert.equal(new URL('../packs/', here).href, packsDir().href);
});
