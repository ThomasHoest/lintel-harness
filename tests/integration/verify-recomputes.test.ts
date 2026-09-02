/**
 * `verify` recomputes from **`.harness/pack/`**, never from the bundled
 * pack. T-1004, T-1005.
 *
 * ── The property, and why it is the whole command ─────────────────────
 *
 * A `verify` that loaded the pack this CLI ships would be checking the
 * project against **what the CLI has**, not against **what was applied**.
 * It would then:
 *
 *   · **pass a project whose committed payload had been swapped**, because
 *     it never looked at it; and
 *   · **fail a project applied correctly by an older CLI**, because the
 *     bundled pack has since moved on.
 *
 * Both are silent. Nothing about the output would look different, which is
 * why this is asserted rather than argued: the test below edits the
 * committed payload so that it **disagrees with the bundled pack**, and
 * requires `verify` to follow the committed one.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { appendFile, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { runCli, EXIT } from '../harness/cli.js';
import { payloadDigestOfDir, walk } from '../../dist/index.js';

const REPO = fileURLToPath(new URL('../../', import.meta.url));

async function applied<T>(body: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), 'lintel-verify-'));
  try {
    const r = await runCli(['harness', 'init', 'coding', '--set', 'projectName=Demo'], dir);
    assert.equal(r.code, EXIT.ok, r.stderr);
    return await body(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/** Re-record the payload digest, so the gate passes and the comparison
 *  actually runs. Without this every tampering test would stop at the
 *  digest and prove nothing about the recomputation. */
async function rerecordDigest(dir: string): Promise<void> {
  const packDir = join(dir, '.harness', 'pack');
  const { entries } = await walk(packDir, { skip: [] });
  const files = entries.filter((e) => e.kind === 'file').map((e) => e.path);
  const digest = await payloadDigestOfDir(packDir, files);

  const path = join(dir, '.harness', 'manifest.json');
  const manifest = JSON.parse(await readFile(path, 'utf8'));
  manifest.payloadDigest = digest;
  await writeFile(path, `${JSON.stringify(manifest, null, 2)}\n`);
}

test('a freshly applied project verifies clean', { timeout: 60_000 }, async () => {
  await applied(async (dir) => {
    const r = await runCli(['harness', 'verify'], dir);
    assert.equal(r.code, EXIT.ok, r.stderr);
    // Every pack ships something to be filled in, and nobody has filled
    // it — which is exactly what `unfilled` exists to say.
    assert.match(r.stdout, /still at the template/);
  });
});

/* ── the two suppressing gates ───────────────────────────────────────── */

/**
 * **Fail closed.** The expectation is computed *from* the payload, so an
 * edited payload makes every row downstream a confident statement derived
 * from unknown input. Reporting none is better than reporting those.
 */
test('an edited payload is exit 2, with zero per-path rows', { timeout: 60_000 }, async () => {
  await applied(async (dir) => {
    await appendFile(join(dir, '.harness/pack/agents/architect.md'), '\nTAMPERED\n');

    const r = await runCli(['harness', 'verify', '--json'], dir);
    assert.equal(r.code, EXIT.integrityFault);

    const doc = JSON.parse(r.stdout);
    assert.equal(doc.suppressed, true);
    assert.deepEqual(doc.entries, [], 'zero per-path rows');
    assert.equal(doc.digest.matched, false);
    assert.notEqual(doc.digest.recorded, doc.digest.computed);
  });
});

/**
 * C-29's read-back half. **Nobody typed this**: the manifest carries no
 * self-integrity check by design, so a recorded answer that no longer
 * satisfies its own declaration means the file was edited or the pack's
 * declaration moved under it. Exit 2, not the exit 1 a typed answer gets.
 */
test('a hand-edited answer is exit 2, and suppresses too', { timeout: 60_000 }, async () => {
  await applied(async (dir) => {
    const path = join(dir, '.harness', 'manifest.json');
    const manifest = JSON.parse(await readFile(path, 'utf8'));
    manifest.parameters.projectName = 'a/b/c!!! not matching the pattern';
    await writeFile(path, `${JSON.stringify(manifest, null, 2)}\n`);

    const r = await runCli(['harness', 'verify', '--json'], dir);
    assert.equal(r.code, EXIT.integrityFault);
    assert.match(r.stderr, /Nobody typed this/);

    // **No `--json` document here**, and the reason is worth recording.
    // C-29's read-back check runs in **two** places — `readManifest` and
    // `verifyProject`'s second gate — and the first one wins, returning
    // before there is a manifest to build a document from.
    //
    // Harmless today: same code, same exit class, and the message is the
    // useful one. But it means a `--json` consumer gets a document for a
    // digest failure and none for an answer failure, where F3's US-71
    // reasons that a suppressed classification should stay distinguishable
    // *through the document*. Recorded rather than papered over; closing
    // it means deciding which of the two checks owns the fault.
    assert.equal(r.stdout, '', 'no document, because the manifest read failed first');
  });
});

/* ── the property this command exists for ────────────────────────────── */

/**
 * **The committed payload wins over the bundled pack.**
 *
 * The recipe in `.harness/pack/` is edited to produce a file the bundled
 * `coding` pack does not produce, and the digest is re-recorded so the
 * gate passes. A `verify` reading the **bundled** pack would recompute the
 * bundled tree, find every file present, and exit 0 — reporting a clean
 * project while the committed payload says something else entirely.
 *
 * Following the committed copy, it must report the new path **missing**.
 */
test('verify follows the committed payload, not the bundled pack', { timeout: 60_000 }, async () => {
  await applied(async (dir) => {
    const recipePath = join(dir, '.harness', 'pack', 'recipe.json');
    const recipe = JSON.parse(await readFile(recipePath, 'utf8'));
    recipe.steps.push({ op: 'rename', from: 'agents/architect.md', to: 'INVENTED.md' });
    await writeFile(recipePath, `${JSON.stringify(recipe, null, 2)}\n`);
    await rerecordDigest(dir);

    const r = await runCli(['harness', 'verify', '--json'], dir);

    const doc = JSON.parse(r.stdout);
    assert.equal(doc.suppressed, false, 'the digest gate must pass, or this proves nothing');
    assert.equal(
      doc.counts.missing,
      1,
      'the committed recipe produces INVENTED.md; the bundled one does not. ' +
        'A verify reading the bundled pack would see nothing missing and exit 0.',
    );
    assert.ok(
      doc.entries.some((e: { path: string; state: string }) => e.path === 'INVENTED.md' && e.state === 'missing'),
    );
    assert.equal(r.code, EXIT.userFault);
  });
});

/* ── the six states, through a real process ──────────────────────────── */

/**
 * The two-halves case: one `adapted` path and one `differs` path in a
 * single run. `adapted` is **neither listed nor counted** — a report that
 * counted it would make a correct project look wrong.
 */
test('an adapted path and a differing one: exit 1, counting one', { timeout: 60_000 }, async () => {
  await applied(async (dir) => {
    await appendFile(join(dir, 'CLAUDE.md'), '\nthe skill rewrote this\n');
    await appendFile(join(dir, 'targets/Run.md'), '\nthe user edited this\n');

    const r = await runCli(['harness', 'verify', '--json'], dir);
    assert.equal(r.code, EXIT.userFault);

    const doc = JSON.parse(r.stdout);
    assert.equal(doc.counts.adapted, 1);
    assert.equal(doc.counts.differs, 1);
    assert.equal(
      doc.entries.filter((e: { state: string }) => e.state === 'adapted').length,
      1,
      'adapted appears in the entries as a state, and not in the failure count',
    );
  });
});

/**
 * **The inversion Q-79 exists for.** A fill-expected path that still
 * equals what shipped reports `unfilled` — *matching* is the finding,
 * because it means the user has not done what the pack asked. Filling it
 * in reports `filled`, and neither fails.
 */
test('unfilled becomes filled when the user fills it in, and neither fails', { timeout: 60_000 }, async () => {
  await applied(async (dir) => {
    const before = JSON.parse((await runCli(['harness', 'verify', '--json'], dir)).stdout);
    assert.ok(before.counts.unfilled >= 1, 'a fresh project has an unfilled template');
    assert.equal(before.counts.filled, 0);

    await appendFile(join(dir, 'specifications/project-brief.md'), '\nI filled this in.\n');

    const after = await runCli(['harness', 'verify', '--json'], dir);
    assert.equal(after.code, EXIT.ok, 'filling it in is not a failure');
    const doc = JSON.parse(after.stdout);
    assert.equal(doc.counts.filled, 1);
    assert.equal(doc.counts.unfilled, before.counts.unfilled - 1);
  });
});

test('a deleted applied file is missing, and fails', { timeout: 60_000 }, async () => {
  await applied(async (dir) => {
    await rm(join(dir, 'targets/Run.md'));
    const r = await runCli(['harness', 'verify', '--json'], dir);
    assert.equal(r.code, EXIT.userFault);
    assert.equal(JSON.parse(r.stdout).counts.missing, 1);
  });
});

/** `verify` writes nothing — no lock, no journal, no temp file. It has to
 *  work on a project mid-apply, which is when somebody reaches for it. */
test('verify writes nothing', { timeout: 60_000 }, async () => {
  await applied(async (dir) => {
    const { snapshot, unchanged } = await import('../harness/cli.js');
    const before = await snapshot(dir);
    await runCli(['harness', 'verify'], dir);
    assert.ok(unchanged(before, await snapshot(dir)));
  });
});

test('no manifest is reported, not crashed', { timeout: 60_000 }, async () => {
  const dir = await mkdtemp(join(tmpdir(), 'lintel-empty-'));
  try {
    const r = await runCli(['harness', 'verify'], dir);
    assert.notEqual(r.code, EXIT.ok);
    assert.match(r.stdout + r.stderr, /\.harness/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

void REPO;
