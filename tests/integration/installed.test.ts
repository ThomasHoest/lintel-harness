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
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/** `shell: true` throughout: the shim is a `.cmd` on Windows, which
 *  `execFile` cannot start on its own. */
const run = async (
  file: string,
  args: readonly string[],
  options: { cwd: string },
): Promise<{ stdout: string; stderr: string }> => {
  const r = await execFileAsync(file, [...args], { ...options, shell: true, encoding: 'utf8' });
  return { stdout: String(r.stdout), stderr: String(r.stderr) };
};
/**
 * `fileURLToPath`, never `.pathname`.
 *
 * On Windows a file URL's `.pathname` is `/C:/Users/...` — a leading
 * slash before a drive letter, which is not a path any API accepts. It
 * reads correctly on macOS and Linux and fails on exactly the platform
 * this project's own CI note calls **not optional**, because the
 * executable bit, `collisionKey`'s folding and CRLF normalization are
 * what differ there.
 */
const REPO = fileURLToPath(new URL('../../', import.meta.url));

/** Installing is slow; every assertion below shares one install. */
async function withInstall<T>(body: (bin: string, project: string) => Promise<T>): Promise<T> {
  const base = await mkdtemp(join(tmpdir(), 'lintel-install-'));
  try {
    await writeFile(join(base, 'package.json'), '{"name":"host","private":true}\n');
    // `npm` is a shell script on POSIX and `npm.cmd` on Windows, and
    // `execFile` runs neither without help — `shell: true` is what makes
    // one call work on both.
    await run('npm', ['install', '--silent', '--no-audit', '--no-fund', REPO], { cwd: base });

    const project = join(base, 'project');
    await mkdir(project);

    // The shim npm writes is `lintel` on POSIX and `lintel.cmd` on
    // Windows. **Both are the thing under test** — this whole file exists
    // because the shim is the one shape the rest of the suite never
    // exercises — so the platform's own name is used rather than a
    // POSIX-only guess.
    const shim = join(base, 'node_modules', '.bin', process.platform === 'win32' ? 'lintel.cmd' : 'lintel');
    return await body(shim, project);
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
