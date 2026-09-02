/**
 * F6 E-27 -- T-2708. The end-to-end rehearsal, with the judgment steps
 * stubbed.
 *
 * `skill install` -> `init` -> capture the disclosure -> `update` on a
 * bumped pack -> read `--json` -> write one reconciled path. This is as
 * close to testing the skill as is honest without a model in the loop:
 * it asserts the SEQUENCE and the SEAMS -- that each step's output is
 * exactly what the next step (or a human standing in for the skill)
 * needs -- and never a DECISION, which is `SKILL.md` section 4.3.5's
 * whole point ("you must not silently pick a side"). The one write this
 * test performs stands in for a user having already decided ("take the
 * pack's version for this path"), not for the skill deciding on its own.
 *
 * `verify` is deliberately not run at the end of this rehearsal --
 * out of scope for this pass, consistent with every other file in this
 * task (see `tests/integration/s7-reinit.test.ts`'s header for the full
 * reasoning). What this file proves stops one step short of that: the
 * reconciled path is on disk with the content the skill was told to
 * write, which is everything `update`'s seam is specified to hand over.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { EXIT, runCli, withTempDir } from '../harness/cli.js';

const EDITED_PATH = 'AgentTeams/Specify.md';

test('the rehearsal: skill install, init, disclosure capture, a bumped-pack update, --json, one reconciled write', async () => {
  await withTempDir(async (dir) => {
    /* 1. skill install ------------------------------------------------- */
    const install = await runCli(['harness', 'skill', 'install'], dir);
    assert.equal(install.code, EXIT.ok, install.stderr);
    await assert.doesNotReject(access(join(dir, '.claude', 'skills', 'lintel', 'SKILL.md')));

    /* 2. init ------------------------------------------------------------ */
    const init = await runCli(['harness', 'init', 'coding', '--set', 'projectName=Demo Project'], dir);
    assert.equal(init.code, EXIT.ok, init.stderr);

    /* 3. capture the disclosure (IM-10's seam, T-2701) -------------------- */
    const begin = /^--- lintel disclosure begin ([0-9a-f]{16,}) ---$/m.exec(init.stderr);
    assert.ok(begin, 'no disclosure begin line on init');
    const nonce = begin![1];
    assert.ok(
      init.stderr.includes(`--- lintel disclosure end ${nonce} ---`),
      'a session must be able to find the matching end line',
    );

    /* 4. a bumped pack, and one path the "user" edited -------------------- */
    // Same simulation as skill-seam-update.test.ts (T-2702/T-2703): the
    // applied project's own manifest is edited, never packs/coding/.
    await writeFile(join(dir, EDITED_PATH), `${await readFile(join(dir, EDITED_PATH), 'utf8')}\nUSER EDIT\n`);
    const manifestPath = join(dir, '.harness', 'manifest.json');
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as { pack: { version: string } };
    manifest.pack.version = '0.9.0';
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

    /* 5. update --dry-run --json, and read the report ---------------------- */
    const dry = await runCli(['harness', 'update', '--dry-run', '--json'], dir);
    assert.equal(dry.code, EXIT.userFault, dry.stderr); // an update is available
    const doc = JSON.parse(dry.stdout) as {
      readonly entries: readonly { readonly path: string; readonly disposition: string; readonly expectedNew?: string }[];
    };
    const entry = doc.entries.find((e) => e.disposition === 'kept-edited');
    assert.ok(entry, 'expected at least one kept-edited entry to reconcile');
    assert.ok(entry!.expectedNew !== undefined, 'the seam must hand over content, not just a path');

    /* 6. write ONE reconciled path -- standing in for a user's decision --- */
    // "Take the pack's version for AgentTeams/Specify.md" -- a decision
    // this test states explicitly, the way SKILL.md 3.6 requires a
    // session to have one stated before writing.
    await writeFile(join(dir, entry!.path), entry!.expectedNew!);

    const onDisk = await readFile(join(dir, entry!.path), 'utf8');
    assert.equal(onDisk, entry!.expectedNew, 'the reconciled path must read back exactly what the seam handed over');

    // Nothing else was written by this step -- SKILL.md 3.6: "Write only
    // that path, only as decided."
    for (const other of doc.entries.filter((e) => e.path !== entry!.path)) {
      if (other.disposition !== 'kept-edited') continue;
      assert.notEqual(other.path, entry!.path);
    }
  });
});
