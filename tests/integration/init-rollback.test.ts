/**
 * T-2205 — `--rollback` after a forced mid-write failure.
 *
 * ── How the failure is forced ─────────────────────────────────────────
 *
 * By putting a **symlink** where phase 2 plans a file. The planner's probe
 * counts only regular files, so the plan says *create it*, the disclosure
 * prints, the journal lands, phase 1 completes, and the writer's
 * exclusive-create fails partway through phase 2 with the journal intact.
 * A genuine mid-write stop reached from the outside, with no fault
 * injection, no patched module and no privileged operation.
 *
 * **The code is `E-TARGET-RACE`, exit 2**, and here it is truthful: the
 * plan did expect to create the path, and something is there.
 *
 * **This used to plant a directory**, and that stopped working when F1
 * v6.1 gave a directory its own code: `E-TARGET-NOT-A-FILE`, detected at
 * **plan time**, zero bytes. The old route reported *"changed while lintel
 * was writing"* about a directory that predated the run — a message this
 * file recorded as a finding while relying on it. Fixing the message
 * removed the injection point, which is the right order for those two
 * things to happen in.
 *
 * ── What rollback must and must not do (C-13, G-F1-6) ─────────────────
 *
 * > Rollback deletes only paths this apply created, restores only paths
 * > this apply overwrote, and acts on neither unless the on-disk bytes are
 * > still exactly what this apply wrote.
 *
 * So the project carries a file the apply never touches. **A rollback that
 * deleted it would be the product destroying user data on its own recovery
 * path**, which is the single worst thing in this feature and the reason
 * the rule is stated as an invariant rather than as behaviour.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, readFile, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { EXIT, runCli, snapshot, unchanged, withTempDir, type Entry } from '../harness/cli.js';

const ANSWERS = ['--set', 'projectName=Demo Project'];

const files = (entries: readonly Entry[]): string[] =>
  entries.filter((e) => e.kind === 'file').map((e) => e.path).sort();

/**
 * A project holding one file of the user's own and one directory standing
 * where `CLAUDE.md` must be written.
 *
 * `CLAUDE.md` is chosen deliberately: it is the pack's `generate` step and
 * the **last** thing phase 2 writes in `coding`, so the run gets as far
 * into the apply as it can before stopping — a rollback with one file to
 * undo would prove much less.
 */
async function crashedApply(dir: string): Promise<{ before: readonly Entry[]; code: number }> {
  await writeFile(join(dir, 'notes.txt'), 'the user wrote this\n', 'utf8');
  // A symlink, not a directory: a directory is now caught at plan time
  // with zero bytes, which is correct and useless as a mid-write injector.
  await symlink(join(dir, 'decoy-target'), join(dir, 'CLAUDE.md'));
  const before = await snapshot(dir);

  const r = await runCli(['harness', 'init', 'coding', ...ANSWERS], dir);
  return { before, code: r.code };
}

test('a mid-write failure stops the apply and leaves the journal behind', async () => {
  await withTempDir(async (dir) => {
    const { code } = await crashedApply(dir);
    assert.notEqual(code, EXIT.ok);

    const paths = (await snapshot(dir)).map((e) => e.path);
    assert.ok(paths.includes('.harness/journal.json'), 'the journal is the way back');
    assert.ok(paths.includes('.harness/lock'), 'the lock is held: the project is mid-apply');
    assert.ok(!paths.includes('.harness/manifest.json'), 'the manifest is the last write');
    // Far enough in to be worth undoing.
    assert.ok(paths.includes('.claude/agents/architect.md'));
    assert.ok(paths.some((p) => p.startsWith('.harness/pack/')));
  });
});

test('--rollback exits 0 and removes every file the run created', async () => {
  await withTempDir(async (dir) => {
    await crashedApply(dir);

    const r = await runCli(['harness', 'init', '--rollback'], dir);
    assert.equal(r.code, EXIT.ok, r.stderr);

    const after = await snapshot(dir);
    assert.deepEqual(files(after), ['notes.txt'], 'nothing the apply wrote survives');
    assert.ok(!after.some((e) => e.path === '.harness' || e.path.startsWith('.harness/')));
  });
});

/** C-13 and G-F1-6, stated as the one assertion that matters most. */
test('--rollback does not delete a file the run did not create', async () => {
  await withTempDir(async (dir) => {
    await crashedApply(dir);
    await runCli(['harness', 'init', '--rollback'], dir);

    assert.equal(await readFile(join(dir, 'notes.txt'), 'utf8'), 'the user wrote this\n');
    const claude = (await snapshot(dir)).find((e) => e.path === 'CLAUDE.md');
    assert.equal(claude?.kind, 'symlink', 'the symlink that caused the failure is not ours to remove');
  });
});

/**
 * `W-ROLLBACK-KEPT` is `notice`, and a notice never changes an exit code:
 * rollback kept the path **on purpose**, and there is nothing the user
 * could do differently to clear it. The count is reported so a kept path
 * is visible rather than silently skipped.
 */
test('a kept path is reported as a notice and the run still exits 0', async () => {
  await withTempDir(async (dir) => {
    await crashedApply(dir);
    const r = await runCli(['harness', 'init', '--rollback'], dir);

    assert.equal(r.code, EXIT.ok);
    assert.match(r.stdout + r.stderr, /kept "CLAUDE\.md"/);
    assert.match(r.stdout + r.stderr, /1 kept/);
    assert.ok(!/→/.test(r.stderr), 'a notice carries no remedy line (IM-19)');
  });
});

/**
 * **Known limit 24, asserted rather than assumed.** The journal is written
 * before the first byte and only the writer discovers which directories it
 * creates, so `createdDirs` cannot be filled in the specified order —
 * over-recording would have rollback delete a directory the user already
 * had. The consequence is that directories a partial apply created outside
 * `.harness/` survive as empty ones.
 *
 * This is here so the limit is **visible in the suite** rather than only
 * in F1's amendment history: if the directories ever do get removed, this
 * test fails and the limit is closed, which is the correct way to find out.
 */
test('empty directories the partial apply created survive the rollback', async () => {
  await withTempDir(async (dir) => {
    const { before } = await crashedApply(dir);
    await runCli(['harness', 'init', '--rollback'], dir);

    const after = await snapshot(dir);
    const leftover = after
      .filter((e) => e.kind === 'dir')
      .map((e) => e.path)
      .filter((p) => !before.some((b) => b.path === p));

    assert.ok(leftover.length > 0, 'known limit 24 — if this is empty, the limit is closed');
    for (const d of leftover) {
      assert.ok(
        !after.some((e) => e.kind === 'file' && e.path.startsWith(`${d}/`)),
        `${d} still holds a file`,
      );
    }
    assert.ok(!unchanged(before, after), 'and that is why "byte-identical" is not claimed here');
  });
});

/** Q-68, decided rather than asked: nothing is wrong, so nothing is an
 *  error, and no code is invented for it. Asserted after a rollback so it
 *  also proves the operation is not repeatable into damage. */
test('a second --rollback finds no journal, writes nothing and exits 0', async () => {
  await withTempDir(async (dir) => {
    await crashedApply(dir);
    await runCli(['harness', 'init', '--rollback'], dir);

    const before = await snapshot(dir);
    const r = await runCli(['harness', 'init', '--rollback'], dir);
    assert.equal(r.code, EXIT.ok, r.stderr);
    assert.ok(!/E-/.test(r.stderr), 'no code is invented for a non-failure');
    assert.ok(unchanged(before, await snapshot(dir)), 'zero bytes');
  });
});

/**
 * The exit class of the forced failure, asserted — and the disagreement it
 * exposes, recorded rather than repaired.
 *
 * F2 §Error States gives `E-TARGET-RACE` for *"a destination changed
 * between the plan and the write"*, exit 2, journal remains,
 * `--rollback` the remedy. **Nothing changed here**: the directory was
 * present before the run started, and the planner declined to see it
 * because `existingAt` admits regular files only. The behaviour is right —
 * stop, keep the journal, point at `--rollback` — and the code is the
 * closest one F1 has; the *message* then tells the user their file changed
 * while lintel was writing, which it did not. Recorded as a spec gap: F2
 * has no row for a **directory** standing at a planned applied path, and
 * `existingAt`'s own comment says such a case is *"a write failure with
 * its own code"* — a code F1 does not carry.
 */
test('the forced failure exits 2 and its remedy names --rollback', async () => {
  await withTempDir(async (dir) => {
    const { code } = await crashedApply(dir);
    assert.equal(code, EXIT.integrityFault);

    const r = await runCli(['harness', 'init', 'coding', ...ANSWERS], dir);
    // And a re-run without rolling back is refused: `.harness/` is there.
    assert.equal(r.code, EXIT.integrityFault);
    assert.match(r.stderr, /--rollback/);
  });
});
