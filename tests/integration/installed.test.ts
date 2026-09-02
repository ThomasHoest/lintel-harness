/**
 * The CLI works **when installed**, not only when run from the repo.
 *
 * ── The gap this closes ───────────────────────────────────────────────
 *
 * `package.json`'s `bin` becomes a **symlink** at
 * `node_modules/.bin/lintel`. The entry-point guard compared
 * `process.argv[1]` against `import.meta.url` **as strings** — and those
 * are two spellings of one file: the first is the link, the second is
 * already resolved. So every installed invocation fell through the guard
 * and **the CLI did nothing at all**: no output, exit 0.
 *
 * **Nothing caught it**, because every other test here runs the file by
 * its real path — from source, from `dist/`, or spawned with an absolute
 * path — which is the one arrangement where the two spellings agree. The
 * bug lived exactly in the gap between how the product is tested and how
 * it is used, and only `npm install` reached it.
 *
 * So this test installs the package and runs the shim, which is the only
 * shape that would have failed.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { promisify } from 'node:util';

const run = promisify(execFile);
const REPO = new URL('../../', import.meta.url).pathname;

/** Installing is slow; every assertion below shares one install. */
async function withInstall<T>(body: (bin: string, project: string) => Promise<T>): Promise<T> {
  const base = await mkdtemp(join(tmpdir(), 'lintel-install-'));
  try {
    await writeFile(join(base, 'package.json'), '{"name":"host","private":true}\n');
    await run('npm', ['install', '--silent', '--no-audit', '--no-fund', REPO], { cwd: base });

    const project = join(base, 'project');
    await mkdir(project);
    return await body(join(base, 'node_modules', '.bin', 'lintel'), project);
  } finally {
    await rm(base, { recursive: true, force: true });
  }
}

test('the installed shim runs, and the whole loop works through it', { timeout: 180_000 }, async () => {
  await withInstall(async (bin, project) => {
    // **The assertion that would have failed.** Before the fix this
    // produced an empty string and exit 0 — silence indistinguishable
    // from success, which is why nothing noticed.
    const version = await run(bin, ['--version'], { cwd: project });
    assert.equal(version.stdout.trim(), '1.0.0', 'the shim must actually run');

    const init = await run(bin, ['harness', 'init', 'coding', '--set', 'projectName=Installed'], {
      cwd: project,
    });
    assert.match(init.stdout, /applied coding 1\.0\.0/);

    // `packs/` resolves from `import.meta.url`, never `process.cwd()` —
    // so an installed CLI finds its own bundled packs rather than
    // whatever happens to be beside the user.
    const validate = await run(bin, ['harness', 'validate', '--all', '--strict'], { cwd: project });
    assert.match(validate.stdout, /coding validated/);

    const update = await run(bin, ['harness', 'update', '--dry-run'], { cwd: project });
    assert.match(update.stdout, /already the version this lintel bundles/);

    // `skill/` has to be in `package.json`'s `files`, or an installed CLI
    // ships no skill to install.
    const skill = await run(bin, ['harness', 'skill', 'install'], { cwd: project });
    assert.match(skill.stdout, /installed the skill into \.claude\/skills\/lintel\//);
  });
});
