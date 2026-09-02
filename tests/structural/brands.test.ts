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
const TESTS = fileURLToPath(new URL('../../tests/', import.meta.url));

/**
 * **The one deliberate forgery, listed so it is visible.**
 *
 * Until now this test walked `src/` only, so a cast under `tests/` was
 * invisible to it — a blind spot in a guard whose whole job is that a
 * cast cannot hide. It walks both trees now.
 *
 * One test genuinely needs to forge a brand: C-27's second denylist
 * re-check is **unreachable while the type system holds**, because the
 * written-set is `AppliedPath[]` and a reserved path cannot be minted into
 * one. Defence in depth that no test can reach is defence nobody can show
 * works — so that single file forges, on purpose, and is named here.
 *
 * **An entry is a claim, not a convenience.** Adding one means writing
 * down which test needs the forgery and why.
 */
const FORGERY_EXEMPT: Readonly<Record<string, string>> = {
  'integration/write-set.test.ts':
    "reaches C-27's per-path denylist re-check, which the brand makes unreachable by design",
};

/** The only files permitted to mint a brand. */
const MINTERS: Readonly<Record<string, string>> = {
  'AppliedPath': 'security/confine.ts',
  'HarnessPath': 'security/harness-paths.ts',
  'ProjectRoot': 'security/resolve.ts',
};

async function sources(): Promise<{ path: string; text: string }[]> {
  const out: { path: string; text: string }[] = [];
  async function walk(root: string, dir: string): Promise<void> {
    for (const d of await readdir(dir, { withFileTypes: true })) {
      const full = join(dir, d.name);
      if (d.isDirectory()) await walk(root, full);
      else if (d.name.endsWith('.ts')) {
        out.push({ path: relative(root, full).split('\\').join('/'), text: await readFile(full, 'utf8') });
      }
    }
  }
  await walk(SRC, SRC);
  return out;
}

/**
 * `src/` **and** `tests/`.
 *
 * Only the cast check uses this. The other assertions here are about the
 * shape of the **product** — where a brand is minted, where the denylist
 * lives — and widening their input would make them fail on a test file
 * that merely mentions the thing they are counting.
 */
async function allSources(): Promise<{ path: string; text: string }[]> {
  const out: { path: string; text: string }[] = [];
  async function walk(root: string, dir: string): Promise<void> {
    for (const d of await readdir(dir, { withFileTypes: true })) {
      const full = join(dir, d.name);
      if (d.isDirectory()) await walk(root, full);
      else if (d.name.endsWith('.ts')) {
        out.push({ path: relative(root, full).split('\\').join('/'), text: await readFile(full, 'utf8') });
      }
    }
  }
  await walk(SRC, SRC);
  await walk(TESTS, TESTS);
  return out;
}

test('no brand is cast into outside its own constructor', async () => {
  const files = await allSources();
  assert.ok(files.length > 5, 'the walk must find the sources');

  for (const [brand, minter] of Object.entries(MINTERS)) {
    const pattern = new RegExp(`as\\s+${brand}\\b`, 'g');
    for (const f of files) {
      if (f.path === minter) continue;
      if (f.path in FORGERY_EXEMPT) continue;
      // This file names every brand in order to check them, so it cannot
      // be its own subject.
      if (f.path === 'structural/brands.test.ts') continue;
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
/**
 * Recipe-step planning may not **construct** a `HarnessPath`.
 *
 * The rule is about the two minters, `harnessPath` and `payloadPath`, and
 * this test used to enforce it by banning **any** import from the module —
 * which also caught `import type { WritablePath }`. A type import is
 * **erased at compile time and can construct nothing**, so that was a
 * false positive, and it fired the moment `apply/plan.ts` legitimately
 * needed to *name* the union it plans phase 1 over.
 *
 * Narrowed to what the test's own name says. `recipe/` still imports
 * nothing from the module at all, and `apply/plan*` may name the type
 * while remaining unable to mint one — which is the property C-14 is
 * about.
 */
test('nothing in recipe-step planning imports a harness-path constructor', async () => {
  const files = await sources();
  const planningDirs = ['recipe/', 'apply/plan'];
  const MINTERS = ['harnessPath', 'payloadPath'];

  for (const f of files) {
    if (!planningDirs.some((d) => f.path.startsWith(d))) continue;

    for (const m of f.text.matchAll(/import\s+(type\s+)?\{([^}]*)\}\s+from\s+'[^']*harness-paths\.js'/g)) {
      const isTypeOnly = m[1] !== undefined;
      const named = (m[2] as string).split(',').map((n) => n.trim());
      for (const name of named) {
        if (isTypeOnly || name.startsWith('type ')) continue;
        assert.equal(
          MINTERS.includes(name),
          false,
          `${f.path} imports the constructor ${name}; recipe-step planning must not be able to mint a HarnessPath`,
        );
      }
    }
  }

  // And `recipe/` imports nothing from the module at all — the stronger
  // property, kept where it still holds.
  const recipeImports = files.filter(
    (f) => f.path.startsWith('recipe/') && /from\s+'[^']*harness-paths\.js'/.test(f.text),
  );
  assert.deepEqual(recipeImports.map((f) => f.path), []);
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

/**
 * The exemption list is itself checked.
 *
 * An entry naming a file that no longer forges is an exemption nobody
 * needs and everybody would inherit — the shape by which a narrow
 * allowance becomes a general one.
 */
test('every forgery exemption is still used, and still explained', async () => {
  const files = new Map((await allSources()).map((f) => [f.path, f.text]));
  for (const [path, why] of Object.entries(FORGERY_EXEMPT)) {
    const text = files.get(path);
    assert.ok(text !== undefined, `${path} is exempted and does not exist`);
    assert.ok(
      /as\s+(AppliedPath|HarnessPath|ProjectRoot)\b/.test(text),
      `${path} is exempted but casts nothing — remove the exemption`,
    );
    assert.ok(why.length > 20, `${path}'s exemption must say why`);
  }
});
