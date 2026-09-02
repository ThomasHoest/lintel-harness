/**
 * F6 E-27 -- T-2702 and T-2703. The seam `SKILL.md` and
 * `reference/update.md` depend on: what the CLI hands over about a
 * pending update, and whether it hands over CONTENT or merely a
 * classification.
 *
 * -- Simulating "a newer version is available" without touching packs/ --
 *
 * `update` compares the version `.harness/manifest.json` records against
 * the version this CLI bundles for the same pack name
 * (`src/cli/commands/update.ts`: `planUpdate({ applied: { version:
 * manifest.pack.version }, bundled: bundled.pack, ... })`). The bundled
 * `coding` pack is fixed at 1.0.0, and this task may not edit `packs/` to
 * change that -- so the "newer version" is simulated the way this
 * project's own `verify` fixtures already do it (see
 * `verify-recomputes.test.ts`'s `rerecordDigest`): hand-edit the APPLIED
 * PROJECT's own `.harness/manifest.json` after a real `init`, never the
 * pack source. `manifest.pack.version` is dropped to `0.9.0` while
 * `.harness/pack/` (and therefore `payloadDigest`) is left untouched, so
 * the digest gate passes and `update` proceeds through the real
 * recomputation -- against the SAME `coding` payload on both sides,
 * which is enough to produce a `kept-edited` path once one applied file
 * is hand-edited too.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { EXIT, runCli, withTempDir } from '../harness/cli.js';

const EDITED_PATH = 'AgentTeams/Specify.md';

/** Apply `coding`, then simulate "an older version is applied, and the
 *  user has edited one path the pack also renders". */
async function agedProject(dir: string): Promise<void> {
  const init = await runCli(['harness', 'init', 'coding', '--set', 'projectName=Demo Project'], dir);
  assert.equal(init.code, EXIT.ok, init.stderr);

  await writeFile(join(dir, EDITED_PATH), `${await readFile(join(dir, EDITED_PATH), 'utf8')}\nUSER EDIT\n`);

  const manifestPath = join(dir, '.harness', 'manifest.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as {
    pack: { version: string };
  };
  manifest.pack.version = '0.9.0';
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

/* -- T-2702: IM-7 and IM-31, the exit contract, Q-78 -------------------- */

test('IM-7/IM-31 (Q-78): update exits 0 with edited paths outstanding; --dry-run with an update available exits 1', async () => {
  // Q-78's whole point, restated where a reader will meet the surprise:
  // a WRITING run that completes reports 0 no matter what it left kept,
  // because F6's stopping rule (SKILL.md section 1) halts on ANY non-zero
  // exit -- if "edited paths outstanding" were non-zero, the skill would
  // stop exactly where its own job begins. The READ-ONLY mode is what
  // gates on "is there anything to do" instead (`--dry-run` -> E-UPDATE-AVAILABLE, exit 1).
  await withTempDir(async (dir) => {
    await agedProject(dir);

    const dry = await runCli(['harness', 'update', '--dry-run', '--json'], dir);
    assert.equal(dry.code, EXIT.userFault, dry.stderr);
    // `E-UPDATE-AVAILABLE` itself is emitted to stderr as prose only --
    // `updateJson` is built from `plan` before that diagnostic exists, so
    // `--json`'s `diagnostics` array never carries it (confirmed by
    // reading `runUpdate`: `updateJson(plan, digest)` is called with the
    // same `plan` in every mode, and the code is constructed and `emit`ted
    // separately, only under `options.dryRun`). What the JSON document
    // DOES carry, structurally rather than as prose, is `upToDate: false`
    // -- the exact condition `E-UPDATE-AVAILABLE` fires on -- so that is
    // what is asserted here, together with the exit class itself.
    const doc = JSON.parse(dry.stdout) as { readonly upToDate: boolean };
    assert.equal(doc.upToDate, false);
  });

  await withTempDir(async (dir) => {
    await agedProject(dir);

    const apply = await runCli(['harness', 'update'], dir);
    assert.equal(apply.code, EXIT.ok, apply.stderr);
    // The edited path is still reported -- exit 0 does not mean nothing
    // happened, it means the run completed (SKILL.md section 1: "Exit 0
    // means the command succeeded -- including when it hands work back
    // to you").
    assert.match(apply.stdout, new RegExp(EDITED_PATH.replace(/[/.]/g, '\\$&')));
  });
});

/* -- T-2703: IM-33 and Q-77, the content is present ---------------------- */

test('IM-33/Q-77: a kept-edited entry in update --json carries expectedNew, rendered rather than raw payload', async () => {
  await withTempDir(async (dir) => {
    await agedProject(dir);

    const r = await runCli(['harness', 'update', '--dry-run', '--json'], dir);
    assert.equal(r.code, EXIT.userFault, r.stderr); // an update is available -- see T-2702
    const doc = JSON.parse(r.stdout) as {
      readonly entries: readonly {
        readonly path: string;
        readonly disposition: string;
        readonly expectedNew?: string;
      }[];
    };

    const entry = doc.entries.find((e) => e.path === EDITED_PATH);
    assert.ok(entry, `no entry for ${EDITED_PATH}`);
    assert.equal(entry!.disposition, 'kept-edited');
    assert.ok(entry!.expectedNew !== undefined, 'kept-edited must carry expectedNew (first half)');

    // The SECOND half, and the one a naive "just return the payload"
    // implementation fails: the payload TEMPLATE still carries the
    // unresolved substitution token; the RENDERED content the pack would
    // now produce carries the actual answer. If expectedNew were the raw
    // payload, this would fail.
    const rawPayload = await readFile(
      join(dir, '.harness', 'pack', 'agent-teams', 'Specify.md'),
      'utf8',
    );
    assert.notEqual(entry!.expectedNew, rawPayload, 'expectedNew must be RENDERED, not payload source');
    assert.ok(rawPayload.includes('{{harness:param.projectName}}'), 'the payload source is unrendered');
    assert.ok(
      entry!.expectedNew!.includes('Demo Project') && !entry!.expectedNew!.includes('{{harness:'),
      'expectedNew must contain the resolved substitution, not the token',
    );
  });
});
