/**
 * F6 E-27 -- T-2705. IM-38: the surface is six commands, and three of
 * them cannot write.
 *
 * "The count moved from five and the ratio moved with it" -- `skill` is
 * the sixth command and, unlike `validate`, `verify` and `pack`, it
 * WRITES. `WRITES` (`src/cli/surface.ts`) is the CLI's own static record
 * of which is which; this test does not merely read that record (a
 * record can be wrong about itself) -- it runs all three read-only
 * commands against a real applied project and proves nothing changed, by
 * recursive comparison, which is what would catch `WRITES` silently
 * going stale.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COMMANDS, WRITES, commandList } from '../../dist/index.js';
import { EXIT, runCli, snapshot, unchanged, withTempDir } from '../harness/cli.js';

test('IM-38: the command surface is exactly six, and exactly three (validate, verify, pack) cannot write', () => {
  assert.equal(COMMANDS.length, 6, `expected six commands, got: ${COMMANDS.join(', ')}`);

  const readOnly = COMMANDS.filter((c) => WRITES[c] === false);
  const writing = COMMANDS.filter((c) => WRITES[c] === true);
  assert.deepEqual(readOnly.sort(), ['pack', 'validate', 'verify'].sort());
  assert.deepEqual(writing.sort(), ['init', 'skill', 'update'].sort());

  // `E-CLI-UNKNOWN-COMMAND`'s list is rendered from the same array
  // (`commandList()`), so the two cannot silently disagree.
  assert.equal(commandList(), COMMANDS.join(', '));
});

test('E-CLI-UNKNOWN-COMMAND actually lists all six, from a real invocation', async () => {
  await withTempDir(async (dir) => {
    const r = await runCli(['harness', 'bogus-command'], dir);
    assert.equal(r.code, EXIT.userFault, r.stderr);
    assert.match(r.stderr, /Commands: init, update, skill, validate, verify, pack/);
  });
});

test('IM-38, proved rather than trusted: validate, verify and pack info write nothing to a real applied project', async () => {
  await withTempDir(async (dir) => {
    const init = await runCli(['harness', 'init', 'coding', '--set', 'projectName=Demo'], dir);
    assert.equal(init.code, EXIT.ok, init.stderr);

    const before = await snapshot(dir);

    const validate = await runCli(['harness', 'validate', 'coding'], dir);
    assert.ok(unchanged(before, await snapshot(dir)), 'validate must write nothing');
    void validate;

    const verify = await runCli(['harness', 'verify'], dir);
    assert.ok(unchanged(before, await snapshot(dir)), 'verify must write nothing');
    void verify;

    const packInfo = await runCli(['harness', 'pack', 'info', 'coding'], dir);
    assert.ok(unchanged(before, await snapshot(dir)), 'pack info must write nothing');
    void packInfo;
  });
});

test('the fourth writing command (skill install) really does write, for contrast', async () => {
  await withTempDir(async (dir) => {
    const init = await runCli(['harness', 'init', 'coding', '--set', 'projectName=Demo'], dir);
    assert.equal(init.code, EXIT.ok, init.stderr);

    const before = await snapshot(dir);
    const install = await runCli(['harness', 'skill', 'install'], dir);
    assert.equal(install.code, EXIT.ok, install.stderr);
    assert.ok(!unchanged(before, await snapshot(dir)), 'skill install must write something');
  });
});
