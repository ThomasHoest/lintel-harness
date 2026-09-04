/**
 * **Ctrl+C at a prompt is a person cancelling, not a crash.**
 *
 * `readline/promises`' `question()` rejects with an `AbortError` when the
 * user interrupts. Nothing caught it in 0.1.0, so node printed a raw
 * unhandled rejection — ten lines of `node:internal/readline/...` stack
 * frames at somebody who had pressed Ctrl+C deliberately. It was the
 * FIRST command the first user of the published package ran.
 *
 * ── Why this test drives a pseudo-terminal ───────────────────────────
 *
 * It cannot be done in-process. `makePrompt` builds its own readline
 * interface, and readline only wires up SIGINT handling for a **real
 * TTY** in raw mode — emitting `'SIGINT'` on a `PassThrough` with
 * `isTTY = true` does nothing, and the promise simply never settles.
 * Both of those were tried before this was written, and a test that
 * passes by never reaching the code is worse than none.
 *
 * So it allocates a PTY with `script(1)`, waits for the prompt, and sends
 * a real SIGINT. That is the only arrangement in which the defect
 * actually reproduces.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, access } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const run = promisify(execFile);
const CLI = fileURLToPath(new URL('../../dist/cli/main.js', import.meta.url));

// `script -q /dev/null <cmd>` is the BSD/macOS spelling. Linux runners use
// `script -qec <cmd> /dev/null`, so the suite skips where neither applies
// rather than failing for the wrong reason.
const isDarwin = process.platform === 'darwin';

test(
  'Ctrl+C at a prompt exits 130 with no stack trace, and writes nothing',
  { skip: !isDarwin ? 'needs a BSD script(1) PTY' : false, timeout: 60_000 },
  async () => {
    const dir = await mkdtemp(join(tmpdir(), 'lintel-cancel-'));
    try {
      await run('git', ['init', '-q'], { cwd: dir });
      const out = join(dir, 'out.txt');

      const script =
        `cd ${dir} && script -q /dev/null node ${CLI} harness init coding ` +
        `--set projectName=x > ${out} 2>&1 & SPID=$!; sleep 4; ` +
        `kill -INT $SPID 2>/dev/null; wait $SPID; echo "EXIT=$?" >> ${out}`;
      await run('bash', ['-c', script]);

      const text = await readFile(out, 'utf8');

      assert.match(text, /EXIT=130/, `exit 130 (128 + SIGINT) expected:\n${text}`);
      assert.match(text, /lintel: cancelled\./, 'a plain sentence, not a trace');

      // The actual defect: node's unhandled-rejection dump.
      assert.ok(!text.includes('node:internal/readline'), 'no internal stack frames');
      assert.ok(!text.includes('AbortError'), 'the raw error must not surface');
      assert.ok(!text.includes('ABORT_ERR'), 'nor its code');

      // The message claims nothing was written. That must be TRUE, not
      // merely reassuring — prompting happens while collecting answers,
      // before any plan executes.
      await assert.rejects(
        () => access(join(dir, '.harness')),
        'cancelling must leave no .harness/',
      );
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  },
);
