import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PACK_NAME_RE,
  SUPPORTED_FORMAT_VERSION,
  bundledPackNames,
  checkCliFloor,
  loadPack,
} from './load-pack.js';
import { exitClassFor } from '../diag/codes.js';
import type { PackJson } from './types.js';

const codes = (b: { items: readonly { code: string }[] }): string[] => b.items.map((d) => d.code);
const CLI = '1.0.0';

test('the three bundled packs are what is on disk', async () => {
  assert.deepEqual(await bundledPackNames(), ['coding', 'planning', 'writing']);
});

test('every bundled pack loads clean', async () => {
  for (const name of await bundledPackNames()) {
    const { loaded, bag } = await loadPack(name, CLI);
    assert.deepEqual(codes(bag), [], name);
    assert.ok(loaded, name);
    assert.equal(loaded.pack.name, name, 'name equals the directory name');
    assert.equal(loaded.recipePath, 'recipe.json');
    assert.ok(loaded.recipeText.includes('"formatVersion"'));
    assert.ok(loaded.pack.formatVersion <= SUPPORTED_FORMAT_VERSION);
  }
});

/* ── the name is user input becoming a path segment ──────────────────── */

test('an unbundled name is the user’s fault and lists what there is', async () => {
  const { loaded, bag } = await loadPack('nosuchpack', CLI);
  assert.deepEqual(codes(bag), ['E-CLI-UNKNOWN-PACK']);
  assert.equal(exitClassFor('E-CLI-UNKNOWN-PACK'), 1);
  assert.match(bag.items[0]!.message, /Packs: coding, planning, writing/);
  assert.equal(loaded, undefined);
});

/**
 * The name is validated **before** it is joined to anything. These are the
 * shapes that would otherwise reach `packDir()` and compose a subpath, and
 * they must all die at the same gate — an escape that fails later because
 * the directory happens not to exist is not a control.
 */
test('a name that is not a name never reaches the filesystem', async () => {
  for (const bad of [
    '../packs',
    'coding/../..',
    '/etc',
    'coding/sub',
    '..',
    '.',
    'Coding',
    'coding\\x',
    '',
    'a'.repeat(64),
  ]) {
    const { loaded, bag } = await loadPack(bad, CLI);
    assert.deepEqual(codes(bag), ['E-CLI-UNKNOWN-PACK'], JSON.stringify(bad));
    assert.equal(loaded, undefined);
  }
});

test('the grammar is the declared one', () => {
  assert.equal(PACK_NAME_RE.source, '^[a-z][a-z0-9-]{1,31}$');
  assert.ok(PACK_NAME_RE.test('coding'));
  assert.equal(PACK_NAME_RE.test('a'), false, 'two characters minimum');
});

/* ── the CLI floor is separate from loading, deliberately ────────────── */

// `pack info` and `validate` must be able to READ AND REPORT ON a pack
// this CLI is too old to apply. Refusing to load it would make the
// diagnostic unobtainable from the tool that names it.
test('a pack above the CLI floor still loads, and is reported separately', async () => {
  const { loaded } = await loadPack('coding', '0.0.1');
  assert.ok(loaded, 'still loads');

  const bag = checkCliFloor({ ...loaded.pack, minCliVersion: '2.0.0' } as PackJson, '1.0.0');
  assert.deepEqual(codes(bag), ['E-PACK-CLI-TOO-OLD']);
  assert.match(bag.items[0]!.message, /needs lintel 2.0.0 or newer/);
  assert.match(bag.items[0]!.message, /You are running 1.0.0/);
});

test('a CLI at or above the floor passes', async () => {
  const { loaded } = await loadPack('coding', CLI);
  assert.deepEqual(codes(checkCliFloor(loaded!.pack, '1.0.0')), [], 'equal is enough — it is a floor');
  assert.deepEqual(codes(checkCliFloor(loaded!.pack, '1.4.2')), []);
});

test('every bundled pack declares a floor this CLI meets', async () => {
  for (const name of await bundledPackNames()) {
    const { loaded } = await loadPack(name, CLI);
    assert.deepEqual(codes(checkCliFloor(loaded!.pack, CLI)), [], name);
  }
});
