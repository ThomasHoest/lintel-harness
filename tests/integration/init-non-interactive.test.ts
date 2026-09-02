/**
 * T-2202 — the non-interactive path, end to end, and the case that
 * distinguishes the rule from the one everybody implements instead.
 *
 * F2 §Technical Context: *"`init` prompts **only when stdin and stderr are
 * both a TTY**"*, and there is no flag either way. A stdin-only
 * implementation passes every other test in this suite: with stdio piped
 * neither stream is a terminal, so both rules agree. **They disagree on
 * exactly one input** — `lintel harness init coding 2>log` from a
 * terminal — where a stdin-only rule writes a question into the log file
 * and then blocks forever waiting for an answer nobody can see it wants.
 *
 * ── Why one case here fakes `isTTY` ───────────────────────────────────
 *
 * Node ships no pty, and CI has no controlling terminal on any of the
 * three platforms the matrix covers, so *"stdin is a real TTY"* is not an
 * input this suite can produce. The gate is `isInteractive`'s two property
 * reads, so the two cases below set those properties in a spawned process
 * before `run()` sees them. **The control test is what makes that sound:**
 * with *both* forced true the same driver prompts and reads an answer, so
 * the non-prompt under `stdin only` is the rule holding, not the fake
 * failing to take effect. Without that control this file would pass
 * against an `init` that had no prompt at all.
 *
 * ── Every case holds stdin open ───────────────────────────────────────
 *
 * `stdio: 'ignore'` gives the child `/dev/null`, which answers a read with
 * EOF — so a wrongly-prompting `init` would *fail* rather than hang, and
 * the hang is the failure mode being ruled out. These spawn a pipe and
 * never write to it, so a read blocks, and the timeout is the assertion.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { EXIT, snapshot, unchanged, withTempDir } from '../harness/cli.js';
import { PROMPT_TEXT } from '../../dist/cli/prompt.js';

const CLI = fileURLToPath(new URL('../../dist/cli/main.js', import.meta.url));

/** Long enough that a slow platform is not mistaken for a block, short
 *  enough that a real block does not stall the suite. */
const BLOCK_TIMEOUT_MS = 30_000;

interface Run {
  readonly code: number | null;
  readonly stdout: string;
  readonly stderr: string;
  /** True when the timeout fired — i.e. the run blocked. */
  readonly blocked: boolean;
}

/**
 * Spawn with **stdin an open pipe**, optionally writing to it, and kill
 * the child if it outlives the timeout.
 */
function spawnHeld(
  argv: readonly string[],
  cwd: string,
  opts: { readonly script?: string; readonly stdin?: string } = {},
): Promise<Run> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [opts.script ?? CLI, ...argv], {
      cwd,
      env: { ...process.env, NO_COLOR: '1' },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    let blocked = false;
    child.stdout.on('data', (d: Buffer) => (stdout += d.toString('utf8')));
    child.stderr.on('data', (d: Buffer) => (stderr += d.toString('utf8')));
    const timer = setTimeout(() => {
      blocked = true;
      child.kill('SIGKILL');
    }, BLOCK_TIMEOUT_MS);
    child.on('error', reject);
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr, blocked });
    });
    // With no `stdin` the pipe is opened and **never ended**, so a read
    // blocks rather than seeing EOF — which is what makes `blocked` mean
    // *it tried to prompt*. The control test supplies an answer and ends
    // the pipe, because there the prompt is the expected behaviour and
    // hang-detection is not what it is for.
    if (opts.stdin === undefined) return;
    child.stdin.write(opts.stdin);
    child.stdin.end();
  });
}

/**
 * A driver that forces `isTTY` on the two streams the gate reads, then
 * calls `run()` in that process.
 *
 * It calls `run()` rather than re-entering `main.js` because `main.js`
 * self-invokes only when it *is* `process.argv[1]`, and it must not be —
 * the properties have to be set before the command reads them. The exit
 * code is still a real process's, which is the half that matters.
 */
async function driver(dir: string, tty: { in: boolean; err: boolean }): Promise<string> {
  const path = join(dir, 'tty-driver.mjs');
  await writeFile(
    path,
    [
      `if (${tty.in}) process.stdin.isTTY = true;`,
      `if (${tty.err}) process.stderr.isTTY = true;`,
      `const { run } = await import(${JSON.stringify(new URL('../../dist/cli/main.js', import.meta.url).href)});`,
      `process.exitCode = (await run(process.argv.slice(2), undefined, process.cwd())).code;`,
    ].join('\n'),
    'utf8',
  );
  return path;
}

/** A scratch directory for the driver, kept **outside** the project so it
 *  cannot appear in a tree assertion. */
async function withDriverDir<T>(body: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), 'lintel-tty-'));
  try {
    return await body(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/* ── the path CI and the skill actually drive ─────────────────────────── */

test('every answer by flag, no TTY on either stream, a complete apply', async () => {
  await withTempDir(async (dir) => {
    const r = await spawnHeld(
      [
        'harness',
        'init',
        'writing',
        '--set',
        'projectName=Demo Project',
        '--set',
        'projectPurpose=How organisations absorb change',
        '--set',
        'authorName=A Writer',
        '--scaffold',
        'writing-workstream',
      ],
      dir,
    );
    assert.equal(r.blocked, false, 'a non-interactive run must never wait on stdin');
    assert.equal(r.code, EXIT.ok, r.stderr);

    const paths = (await snapshot(dir)).map((e) => e.path);
    assert.ok(paths.includes('.harness/manifest.json'));
    assert.ok(paths.includes('CLAUDE.md'));
    assert.ok(paths.includes('workstreams/index.md'), 'the scaffold ran');
  });
});

/**
 * §NFR *Non-interactive completeness*: every answer and every selection is
 * reachable from argv alone, for **each** bundled pack — including the one
 * whose only parameter is an `enum` behind a pack-declared alias.
 */
for (const [pack, argv] of [
  ['coding', ['--set', 'projectName=Demo Project']],
  ['planning', ['--calibration', 'near-zero-floor']],
] as const) {
  test(`${pack} reaches exit 0 from argv alone, with stdin held open`, async () => {
    await withTempDir(async (dir) => {
      const r = await spawnHeld(['harness', 'init', pack, ...argv], dir);
      assert.equal(r.blocked, false);
      assert.equal(r.code, EXIT.ok, r.stderr);
    });
  });
}

/* ── the case the both-streams rule exists for ────────────────────────── */

/**
 * **stdin a TTY, stderr redirected.** The stdin-only rule prompts here;
 * the specified rule does not. `E-PARAM-MISSING`, exit 1, zero bytes, and
 * no read of stdin — asserted by holding the pipe open and requiring the
 * run to finish anyway.
 */
test('stderr redirected with stdin a TTY is still non-interactive', async () => {
  await withDriverDir(async (scratch) => {
    const script = await driver(scratch, { in: true, err: false });
    await withTempDir(async (dir) => {
      const before = await snapshot(dir);
      const r = await spawnHeld(['harness', 'init', 'coding'], dir, { script });

      assert.equal(r.blocked, false, 'prompting into a redirected stderr is a hang');
      assert.equal(r.code, EXIT.userFault);
      assert.match(r.stderr, /E-PARAM-MISSING|parameter "projectName" is required/);
      // The diagnostic quotes the declared prompt (F2 §Error States), so
      // the prompt text cannot be the evidence. The caret can: it belongs
      // to `prompt.ts` and appears only where a question was asked.
      assert.ok(!r.stderr.includes(PROMPT_TEXT.caret), 'nothing was asked');
      assert.ok(unchanged(before, await snapshot(dir)), 'zero bytes written');
    });
  });
});

/**
 * The control. Both streams forced, the same driver, the same pack: it
 * asks, it reads the answer, it applies. Without this the test above
 * would pass against an `init` that could not prompt at all — and against
 * a driver whose `isTTY` assignment did nothing.
 */
test('with both streams a TTY the same driver prompts and reads the answer', async () => {
  await withDriverDir(async (scratch) => {
    const script = await driver(scratch, { in: true, err: true });
    await withTempDir(async (dir) => {
      const r = await spawnHeld(['harness', 'init', 'planning'], dir, {
        script,
        stdin: 'high-floor\n',
      });

      assert.equal(r.blocked, false);
      assert.equal(r.code, EXIT.ok, r.stderr);
      assert.match(r.stderr, /constraint floor/, 'the declared prompt is shown');
      assert.match(r.stderr, /one of high-floor, near-zero-floor/, 'an enum renders its values');

      const paths = (await snapshot(dir)).map((e) => e.path);
      assert.ok(paths.includes('calibration.md'), 'the typed answer drove the apply');
      // The prompt is stderr's: a redirect of stdout must not capture it,
      // or `init > out.txt` writes the question into the file.
      assert.ok(!/constraint floor/.test(r.stdout));
    });
  });
});
