/**
 * T-1218 — the S7 precondition.
 *
 * S7 wants **this repository** produced by the tool it specifies: re-init
 * `lintel-harness` itself with the `coding` pack, run F6's skill, run
 * `lintel harness verify`, require exit `0`, and require the `CLAUDE.md`
 * manifest entry to read `"state": "adapted"`.
 *
 * F1's task text (written when there was no CLI at all) says: *"Build the
 * harness for it here; leave the assertion to the change that can run
 * it."* Two things have changed since that sentence was written and one
 * has not:
 *
 *   - `init` and `skill install` now exist and are exercised throughout
 *     this suite (`tests/integration/init-*.test.ts`,
 *     `tests/fixtures/adversarial/*`), so the *build the harness* half of
 *     T-1218 is already done — there is nothing left to add here.
 *   - **`verify` is explicitly out of scope for this pass.** The task
 *     that produced this file was told, in so many words: *"verify is
 *     being wired concurrently — do not write a test that requires it."*
 *     S7's acceptance test is unrunnable without it by definition (it
 *     names `lintel harness verify` and the `"adapted"` state directly),
 *     so it stays `skip`ped here rather than half-written against a
 *     command this pass was told not to depend on.
 *   - **Literally re-initing this repository is still not something this
 *     test performs**, and that is a second, independent reason S7 stays
 *     open rather than closed by this file. `CLAUDE.md`'s own "Genuinely
 *     outstanding before code" section leads with exactly this item —
 *     `.harness/pack/` and `.harness/manifest.json` do not exist in this
 *     repository — and treats it as a deliberate, one-time act of record
 *     for a human to perform (or a dedicated target to run), not a side
 *     effect of a test suite. `specifications/`, `AgentTeams/`-equivalents
 *     and the rest of this repository's tree were produced **by hand**
 *     under the two-phase model before `init` existed, and running `init`
 *     against this repository's root today would meet that tree at every
 *     turn as pre-existing content — the correct outcome under F1's rules
 *     (`E-TARGET-EXISTS` or `kept-*` dispositions throughout), but not a
 *     clean acceptance run, and not something to trigger unattended from
 *     an automated test.
 *
 * What this file *can* and does assert: that the two pieces S7's
 * acceptance test will compose — a real `init` and a real `skill install`
 * — already work together on a throwaway project, so the day `verify` is
 * ready, wiring S7's own test is a small addition rather than a discovery
 * exercise.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { join } from 'node:path';
import { EXIT, runCli, withTempDir } from '../harness/cli.js';

test('the S7 precondition: init then skill install both succeed on one project', async () => {
  await withTempDir(async (dir) => {
    const init = await runCli(['harness', 'init', 'coding', '--set', 'projectName=Demo'], dir);
    assert.equal(init.code, EXIT.ok, init.stderr);

    const skill = await runCli(['harness', 'skill', 'install'], dir);
    assert.equal(skill.code, EXIT.ok, skill.stderr);

    await assert.doesNotReject(access(join(dir, '.claude', 'skills', 'lintel', 'SKILL.md')));
    await assert.doesNotReject(access(join(dir, 'CLAUDE.md')));
    await assert.doesNotReject(access(join(dir, '.harness', 'manifest.json')));
  });
});

/**
 * **Skipped — needs `harness verify`, which this pass was explicitly told
 * not to depend on, and needs an actual re-init of this repository, which
 * is a deliberate one-time act this test suite does not perform as a side
 * effect.** See the file header for both reasons in full.
 *
 * Left in place with S7's exact acceptance criterion recorded, so wiring
 * it later is a matter of removing `skip` and filling the body — not
 * rediscovering what S7 asks for.
 */
test(
  'S7: this repository verifies clean after init + skill, CLAUDE.md reads adapted',
  {
    skip:
      'needs harness verify (out of scope for this pass per explicit instruction) and an ' +
      'actual re-init of the lintel-harness repository itself, which CLAUDE.md records as a ' +
      'deliberate outstanding act rather than a test-suite side effect — T-1218',
  },
  async () => {
    // Left unimplemented deliberately; see the skip reason and file header.
  },
);
