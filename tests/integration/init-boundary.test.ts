/**
 * T-2206 — the boundary, as a test rather than as a review note.
 *
 * **`init` writes no applied path except through `executeApply`.**
 *
 * `src/cli/commands/init.ts` opens by saying so — *"this command adds no
 * engine code, and its size is the evidence"* — and the failure mode it
 * names is the one this feature is prone to: a command that grows a little
 * resolution logic, then a little validation, then a fallback, until the
 * engine's guarantees stop being the whole story. A comment cannot notice
 * when that happens. This can.
 *
 * ── How the engine is removed ─────────────────────────────────────────
 *
 * `InitDeps` has no seam for `executeApply` — deliberately, since a
 * command that could be handed a different writer would be a command that
 * could write two ways. So the substitution happens one level down, in a
 * **module load hook** registered in a spawned process: `dist/apply/execute.js`
 * is served a source that re-exports the real module and shadows
 * `executeApply` with one that writes nothing and reports success. ESM
 * gives a local export precedence over a star export, so every other
 * binding stays real.
 *
 * The stub records that it ran, into a file **outside** the project, so
 * *"nothing was written"* cannot be confused with *"nothing ran"*.
 *
 * ── What "untouched" means, exactly ───────────────────────────────────
 *
 * E-22 words the assertion as *the project directory is untouched*. It is
 * one entry short of that, and the exception is worth stating rather than
 * excluding: `init` takes `.harness/lock` itself, between the disclosure
 * and the first engine byte (US-49), and removes it when the run completes
 * — leaving the empty `.harness/` directory `ensureDir` made for it. That
 * is a **`HarnessPath`**, not an applied path, and it is the one write the
 * command performs on its own. So the assertion is the exact one the task
 * is about: **no file exists anywhere under the root**, and no applied path
 * exists at all.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { EXIT, runCli, snapshot, withTempDir } from '../harness/cli.js';

const CLI = fileURLToPath(new URL('../../dist/cli/main.js', import.meta.url));
const EXECUTE = new URL('../../dist/apply/execute.js', import.meta.url).href;
const BAG = new URL('../../dist/diag/diagnostic.js', import.meta.url).href;

/**
 * The hook. It matches the exact module URL and nothing else, and the real
 * module is still loaded — under a query string the hook ignores — so a
 * consumer importing any other binding from it gets the genuine one.
 */
const HOOKS = `
const TARGET = ${JSON.stringify(EXECUTE)};
export async function load(url, context, nextLoad) {
  if (url !== TARGET) return nextLoad(url, context);
  return {
    format: 'module',
    shortCircuit: true,
    source: [
      'export * from ' + JSON.stringify(TARGET + '?real') + ';',
      'import { DiagnosticBag } from ' + JSON.stringify(${JSON.stringify(BAG)}) + ';',
      'import { appendFileSync } from "node:fs";',
      'export async function executeApply(inputs) {',
      '  appendFileSync(process.env.LINTEL_STUB_LOG, String(inputs.files.length) + "\\\\n");',
      '  return { written: [], createdDirs: [], complete: true, bag: new DiagnosticBag() };',
      '}',
    ].join('\\n'),
  };
}
`;

const REGISTER = `
import { register } from 'node:module';
register('./hooks.mjs', import.meta.url);
`;

interface Stubbed {
  readonly code: number | null;
  readonly stdout: string;
  readonly stderr: string;
  /** One line per `executeApply` call, carrying the planned file count. */
  readonly calls: readonly string[];
}

/** Run the real binary in a process where `executeApply` writes nothing. */
async function runStubbed(argv: readonly string[], cwd: string): Promise<Stubbed> {
  const scratch = await mkdtemp(join(tmpdir(), 'lintel-stub-'));
  try {
    await writeFile(join(scratch, 'hooks.mjs'), HOOKS, 'utf8');
    await writeFile(join(scratch, 'register.mjs'), REGISTER, 'utf8');
    const log = join(scratch, 'calls.log');
    await writeFile(log, '', 'utf8');

    const result = await new Promise<{ code: number | null; stdout: string; stderr: string }>(
      (resolve, reject) => {
        const child = spawn(
          process.execPath,
          // A **`file://` URL**, not a path. Node's ESM loader accepts a
          // bare absolute path on POSIX and refuses it on Windows —
          // `ERR_UNSUPPORTED_ESM_URL_SCHEME: Received protocol 'c:'` —
          // because `C:\\…` parses as a URL whose scheme is the drive
          // letter. The URL form is correct on every platform, so there is
          // no branch here, only the right spelling.
          ['--import', pathToFileURL(join(scratch, 'register.mjs')).href, CLI, ...argv],
          {
            cwd,
            env: { ...process.env, NO_COLOR: '1', LINTEL_STUB_LOG: log },
            stdio: ['ignore', 'pipe', 'pipe'],
          },
        );
        let stdout = '';
        let stderr = '';
        child.stdout.on('data', (d: Buffer) => (stdout += d.toString('utf8')));
        child.stderr.on('data', (d: Buffer) => (stderr += d.toString('utf8')));
        child.on('error', reject);
        child.on('close', (code) => resolve({ code, stdout, stderr }));
      },
    );

    const calls = (await readFile(log, 'utf8')).split('\n').filter((l) => l !== '');
    return { ...result, calls };
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
}

/** The harness proves itself first: with the real engine in place the same
 *  spawn writes a project, so a later empty tree means the stub took the
 *  writes and not that the hook broke the run. */
test('the stub is the only difference: unstubbed, the same invocation applies', async () => {
  await withTempDir(async (dir) => {
    const r = await runCli(['harness', 'init', 'coding', '--set', 'projectName=Demo Project'], dir);
    assert.equal(r.code, EXIT.ok, r.stderr);
    assert.ok((await snapshot(dir)).some((e) => e.kind === 'file' && e.path === 'CLAUDE.md'));
  });
});

for (const [pack, argv] of [
  ['coding', ['--set', 'projectName=Demo Project']],
  ['planning', ['--calibration', 'high-floor']],
] as const) {
  test(`${pack}: with executeApply stubbed, init writes no file at all`, async () => {
    await withTempDir(async (dir) => {
      const r = await runStubbed(['harness', 'init', pack, ...argv], dir);

      assert.equal(r.code, EXIT.ok, r.stderr);
      assert.equal(r.calls.length, 1, 'executeApply is called exactly once');
      assert.ok(Number(r.calls[0]) > 0, 'and it was handed the whole plan');

      // **The project directory is untouched — no exception.**
      //
      // This asserted one residue until F1 v6.1: the empty `.harness/` the
      // command made to hold `.harness/lock`. Releasing the lock now
      // removes that directory too **when it is empty**, on the same
      // reasoning rollback removes only empty directories — a `.harness/`
      // still holding a payload belongs to an apply that happened.
      //
      // So the property T-2206 actually asks for now holds literally,
      // rather than holding for applied paths with a `HarnessPath`
      // carve-out recorded beside it.
      const entries = await snapshot(dir);
      assert.deepEqual(entries.map((e) => e.path), [], 'every byte an apply lands is the engine’s');
    });
  });
}

/**
 * The steps before the engine still ran, so the empty tree above is the
 * boundary holding rather than the command having failed early. The
 * disclosure is emitted after a plan that succeeded and before the lock
 * (US-49), and the summary only on a `0`-exit run (US-54) — both are on
 * the far side of every check, and both are here.
 */
test('everything either side of executeApply still happens', async () => {
  await withTempDir(async (dir) => {
    const r = await runStubbed(
      ['harness', 'init', 'coding', '--set', 'projectName=Demo Project'],
      dir,
    );
    assert.match(r.stderr, /^--- lintel disclosure begin [0-9a-f]{16,} ---$/m);
    assert.match(r.stdout, /applied coding /);
    assert.match(r.stdout, /Still yours to do/);
  });
});
