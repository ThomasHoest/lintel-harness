/**
 * The CI gate. T-1214.
 *
 * **`lintel harness validate --all --strict` exits `0` for all three
 * bundled packs**, driven through a **spawned process** rather than
 * in-process — because the exit class is what a user and CI actually see,
 * and nothing else about this command matters to them.
 *
 * ── Why `--strict` rather than bare `--all` ───────────────────────────
 *
 * Every warning in F1 is non-fatal by code, so a bare `--all` would exit
 * `0` whatever the packs contained and assert almost nothing. `--strict`
 * promotes `defect` warnings and **never** a `notice` (Q-60) — so a green
 * `--strict` run says two things at once: **no pack has an authoring
 * defect**, and **every finding it does report is a state the pack
 * declared on purpose**.
 *
 * ── Asserting the class, not only the code ────────────────────────────
 *
 * *"`--strict` does not promote a notice"* is the entire point of the
 * notice/defect split, and it is only testable if the class is asserted
 * alongside the exit code. A run that exited `0` while emitting a
 * `defect` would mean `--strict` had stopped promoting anything, and the
 * exit code alone cannot tell those apart.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runCli, EXIT } from '../harness/cli.js';

const REPO = new URL('../../', import.meta.url).pathname;

test('validate --all --strict exits 0 through a real process', async () => {
  const r = await runCli(['harness', 'validate', '--all', '--strict'], REPO);
  assert.equal(r.code, EXIT.ok, `stderr:\n${r.stderr}\nstdout:\n${r.stdout}`);
});

test('bare --all exits 0 too, and that is why --strict is the gate', async () => {
  const r = await runCli(['harness', 'validate', '--all'], REPO);
  assert.equal(r.code, EXIT.ok);
});

/**
 * The claim Q-60 exists to make, asserted as a claim: **at least two
 * findings, and every one of them a `notice`.**
 *
 * Both halves are load-bearing. Zero findings would mean the packs stopped
 * declaring the states this spec requires them to declare — a silent green
 * run is the failure, not the success. One `defect` would mean `--strict`
 * had stopped promoting.
 */
test('--json reports findings, and every one is a notice', async () => {
  const r = await runCli(['harness', 'validate', '--all', '--strict', '--json'], REPO);
  assert.equal(r.code, EXIT.ok);

  const reports = JSON.parse(r.stdout) as {
    pack: { name: string };
    diagnostics: { code: string; severity: string; class?: string }[];
  }[];
  assert.equal(reports.length, 3, 'three bundled packs');

  const findings = reports.flatMap((p) => p.diagnostics.map((d) => ({ pack: p.pack.name, ...d })));
  assert.ok(findings.length >= 2, `expected findings, got ${findings.length}`);

  for (const f of findings) {
    assert.equal(f.severity, 'warning', `${f.pack}: ${f.code} is an error under --strict`);
    assert.equal(
      f.class,
      'notice',
      `${f.pack}: ${f.code} is class "${f.class}" — a defect would be promoted by --strict`,
    );
  }
});

/**
 * The set as it actually is, pinned.
 *
 * F5 claimed **two** findings, both against `planning`, until v3.8 — while
 * requiring `writing` to declare two parts absent three bullets earlier.
 * The real set is four. **The gate is why that survived**: four notices
 * exit `0` exactly as two do, so nothing ever failed and the wrong number
 * cost nothing to hold.
 */
test('the finding set is four notices across two packs', async () => {
  const r = await runCli(['harness', 'validate', '--all', '--strict', '--json'], REPO);
  const reports = JSON.parse(r.stdout) as {
    pack: { name: string };
    diagnostics: { code: string }[];
  }[];

  const byPack = Object.fromEntries(
    reports.map((p) => [p.pack.name, p.diagnostics.map((d) => d.code).sort()]),
  );
  assert.deepEqual(byPack['coding'], []);
  assert.deepEqual(byPack['writing'], ['W-ANATOMY-ABSENT', 'W-ANATOMY-ABSENT']);
  assert.deepEqual(byPack['planning'], ['W-ANATOMY-PROVISIONAL', 'W-HOOK-SCRIPT-INERT']);
});

/* ── the surface, as a process sees it ───────────────────────────────── */

test('an unknown pack exits 1 — the user typed it and can retype it', async () => {
  const r = await runCli(['harness', 'validate', 'nosuchpack'], REPO);
  assert.equal(r.code, EXIT.userFault);
  assert.match(r.stdout + r.stderr, /is not a pack bundled with lintel/);
});

test('pack info exits 0 and describes rather than judges', async () => {
  const r = await runCli(['harness', 'pack', 'info', 'planning'], REPO);
  assert.equal(r.code, EXIT.ok, 'a pack with findings is still described');
  assert.match(r.stdout, /provisional/);
});

// `pack info --json` and `validate --json <pack>` are the same document,
// so a consumer written against one reads the other.
test('the two --json surfaces emit identical bytes', async () => {
  const a = await runCli(['harness', 'pack', 'info', 'coding', '--json'], REPO);
  const b = await runCli(['harness', 'validate', 'coding', '--json'], REPO);
  assert.equal(a.stdout, b.stdout);
});

/**
 * The commands still honest about not existing. **The set shrinks
 * visibly**, and a command that quietly claimed to work would be the same
 * defect `main.ts` already carried once — its stub predicate tested
 * *ownership* rather than whether a command was built.
 */
test('the commands that are not built say so, and exit 1', async () => {
  // The list shrinks as features land — `skill` left when F6 wired
  // `skill install`, `update` when F3 wired its command, and `verify` is
  // the last. That this test keeps needing an edit is the point: a set
  // that changed without anything saying so is how `main.ts` came to claim
  // two built commands were unimplemented.
  for (const command of ['verify']) {
    const r = await runCli(['harness', command], REPO);
    assert.equal(r.code, EXIT.userFault, command);
    assert.match(r.stderr, /is not implemented in this build/, command);
  }
});
