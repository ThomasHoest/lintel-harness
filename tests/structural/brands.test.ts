/**
 * The brands are only as good as the absence of casts. T-0210.
 *
 * `AppliedPath` and `HarnessPath` are nominal types with no public
 * constructor, and C-14's guarantee — *"a path that skipped the gate is a
 * compile error"* — holds **only while nothing casts into them**. One
 * `as AppliedPath` anywhere else and the type system is decorative.
 *
 * TypeScript cannot express "this type may not be asserted into", so the
 * rule is enforced here, over the source text. This is a structural test:
 * it reads the repository rather than running the program, and that is
 * the point — the property is about the shape of the codebase.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, relative } from 'node:path';

const SRC = fileURLToPath(new URL('../../src/', import.meta.url));

/** The only files permitted to mint a brand. */
const MINTERS: Readonly<Record<string, string>> = {
  'AppliedPath': 'security/confine.ts',
  'HarnessPath': 'security/harness-paths.ts',
  'ProjectRoot': 'security/resolve.ts',
};

async function sources(): Promise<{ path: string; text: string }[]> {
  const out: { path: string; text: string }[] = [];
  async function walk(dir: string): Promise<void> {
    for (const d of await readdir(dir, { withFileTypes: true })) {
      const full = join(dir, d.name);
      if (d.isDirectory()) await walk(full);
      else if (d.name.endsWith('.ts')) {
        out.push({ path: relative(SRC, full).split('\\').join('/'), text: await readFile(full, 'utf8') });
      }
    }
  }
  await walk(SRC);
  return out;
}

test('no brand is cast into outside its own constructor', async () => {
  const files = await sources();
  assert.ok(files.length > 5, 'the walk must find the sources');

  for (const [brand, minter] of Object.entries(MINTERS)) {
    const pattern = new RegExp(`as\\s+${brand}\\b`, 'g');
    for (const f of files) {
      if (f.path === minter) continue;
      // A test may name the type; it may not mint one.
      const hits = [...f.text.matchAll(pattern)];
      assert.deepEqual(
        hits.map((h) => h[0]),
        [],
        `${f.path} casts into ${brand}; only ${minter} may. C-14 depends on this.`,
      );
    }
  }
});

test('each brand is minted in exactly one file', async () => {
  const files = await sources();
  for (const [brand, minter] of Object.entries(MINTERS)) {
    const owner = files.find((f) => f.path === minter);
    assert.ok(owner, `${minter} must exist`);
    assert.match(owner.text, new RegExp(`as\\s+${brand}\\b`), `${minter} must mint ${brand}`);
  }
});

// US-3 and US-13 both ask for this from the other side: a recipe step's
// destination is an AppliedPath and can never be under .harness/; a CLI
// write is a HarnessPath and can never be anything else. If planning could
// reach a HarnessPath constructor, that partition would be a convention
// rather than a type.
test('nothing in recipe-step planning imports the harness-path constructor', async () => {
  const files = await sources();
  const planningDirs = ['recipe/', 'apply/plan'];
  const offenders = files.filter(
    (f) =>
      planningDirs.some((d) => f.path.startsWith(d)) &&
      /from\s+'.*harness-paths\.js'/.test(f.text),
  );
  assert.deepEqual(
    offenders.map((f) => f.path),
    [],
    'recipe-step planning must not be able to construct a HarnessPath',
  );
});

// The gate is the only way in, so nothing may re-implement it. A second
// grammar check would drift from the first, and the drift would be
// silent — the paths it wrongly accepted would look ordinary.
test('the reserved-destination lists live in exactly one module', async () => {
  const files = await sources();
  const holders = files.filter(
    (f) => f.text.includes("'node_modules',") && f.text.includes("'.devcontainer',"),
  );
  assert.deepEqual(
    holders.map((f) => f.path),
    ['security/confine.ts'],
    'the denylist must not be copied — a second copy drifts silently',
  );
});
