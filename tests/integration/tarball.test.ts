/**
 * What actually ships. T-1219's neighbour, and `release-check.mjs`'s.
 *
 * `npm pack` answers a question nothing else here asks: **which files
 * reach a user.** Every other test runs against the repository, where
 * everything is present — so a `files` list that omitted something the CLI
 * reads at runtime would pass the entire suite and fail on the first
 * install.
 *
 * That is not hypothetical. `skill/` was missing from `files` until F6
 * shipped, which would have made `skill install` find nothing to install;
 * and `dist/**` carried the compiled unit tests, because they sit beside
 * the code they cover and the app build and the test build share an
 * `outDir`.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const REPO = fileURLToPath(new URL('../../', import.meta.url));

/** The tarball's file list, from npm itself rather than from a glob of our
 *  own — a second implementation of `files` would agree with us and not
 *  with npm, which is the only opinion that ships. */
function shipped(): readonly string[] {
  const out = execFileSync('npm', ['pack', '--dry-run', '--json'], {
    cwd: REPO,
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
  return (JSON.parse(out)[0]?.files ?? []).map((f: { path: string }) => f.path);
}

test('the binary and everything it reads at runtime is in the tarball', { timeout: 60_000 }, async () => {
  const files = shipped();
  const pkg = JSON.parse(await readFile(join(REPO, 'package.json'), 'utf8'));

  /**
   * **No `./` prefix.** npm 11 rejects `"bin": {"lintel": "./dist/..."}`
   * as an invalid script name, **strips the entry, and continues** —
   * warning only:
   *
   *   npm warn publish "bin[lintel]" script name dist/cli/main.js
   *                    was invalid and removed
   *
   * The package publishes successfully and installs with **no `lintel`
   * command at all**. Found on the first real publish attempt, 2026-09-04.
   *
   * This test did not catch it, and the reason is the line that used to be
   * here: it read the value through `.replace(/^\.\//, '')` — **normalising
   * away the exact defect**, then asserting on the cleaned result. The
   * tarball's own `package.json` keeps the prefix, so nothing downstream
   * disagreed either. Asserted directly now, before it is used.
   */
  const raw = String(pkg.bin.lintel);
  assert.ok(
    !raw.startsWith('./'),
    `bin must not start with "./" — npm strips such an entry at publish ` +
      `time and ships a CLI with no command. Got: ${raw}`,
  );
  assert.ok(files.includes(raw), `the binary ${raw} must ship`);

  // The three packs ARE the product; a CLI that ships without them
  // installs a generator with nothing to generate.
  for (const pack of ['coding', 'writing', 'planning']) {
    assert.ok(
      files.some((f) => f === `packs/${pack}/pack.json`),
      `packs/${pack}/pack.json must ship`,
    );
    assert.ok(
      files.some((f) => f === `packs/${pack}/recipe.json`),
      `packs/${pack}/recipe.json must ship`,
    );
  }

  // Missing until F6 shipped, and `skill install` would have found nothing.
  assert.ok(files.includes('skill/SKILL.md'), 'skill/SKILL.md must ship');
});

/**
 * **No compiled tests.** They sit beside the code they cover, and the app
 * build and the unit build share `dist/`, so a `files: ["dist"]` alone
 * ships every one of them — bloating the package and publishing internals
 * nobody asked for.
 */
test('no test file reaches a user', { timeout: 60_000 }, () => {
  const leaked = shipped().filter((f) => /\.test\.(js|d\.ts)(\.map)?$/.test(f));
  assert.deepEqual(leaked, [], 'compiled tests in the tarball');
});

/** Q-81, at the one boundary that matters: what a user installs. */
test('the published package declares no runtime dependency', async () => {
  const pkg = JSON.parse(await readFile(join(REPO, 'package.json'), 'utf8'));
  assert.deepEqual(Object.keys(pkg.dependencies ?? {}), []);
});

/**
 * The version the package declares and the version the CLI enforces
 * against every pack's `minCliVersion` must be the same number.
 *
 * They disagreed until the 1.0.0 release — `0.1.0` against `1.0.0`, F1
 * known limit 23 — because the constant existed precisely so that
 * resolving from `package.json` would not make every bundled pack fail
 * `E-PACK-CLI-TOO-OLD`.
 *
 * **The constant did not become a read of `package.json` when they were
 * reconciled**, and that is deliberate: a version the product must find on
 * disk is a version that can go missing in a bundler's output, and every
 * version gate then fails open or closed depending on how the read was
 * written. Two numbers kept equal by this test is a smaller risk than one
 * number resolved at runtime.
 */
test('package.json and CLI_VERSION agree', async () => {
    const pkg = JSON.parse(await readFile(join(REPO, 'package.json'), 'utf8'));
    const src = await readFile(join(REPO, 'src/cli/version.ts'), 'utf8');
    assert.equal(pkg.version, /CLI_VERSION\s*=\s*'([^']+)'/.exec(src)?.[1]);
  },
);
