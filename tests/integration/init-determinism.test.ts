/**
 * T-2204 — US-55. Two applies, two directories, one tree.
 *
 * *"A diff between two projects means something."* That is the whole
 * claim, and it is only worth anything if the comparison has **no
 * exclusions** — so this compares every entry under both roots, `.harness/`
 * included, by path, kind, mode, size **and bytes**. An exclusion list is
 * where a determinism test goes to die: the first timestamp anybody adds
 * lands in the file the list already forgives.
 *
 * ── Three inputs, not two (C-46) ──────────────────────────────────────
 *
 * `init`'s output is a pure function of `(payload, parameter answers,
 * scaffold selection)`, and a scaffolded apply is therefore compared
 * against another **scaffolded** apply. Comparing one against a bare one
 * would fail for the right reason and prove nothing, which is why the
 * third input is named.
 *
 * ── What C-59 gave up, and what it did not ────────────────────────────
 *
 * The disclosure block is **not** byte-identical between runs: its nonce
 * is per-invocation by design. F1's determinism guarantee is over applied
 * trees and manifests, never over stdout or stderr, so nothing here looks
 * at either stream — and `init-disclosure.test.ts` owns the nonce.
 *
 * ── The Windows leg is where this test earns its place (U-13) ─────────
 *
 * `snapshot()` reports `mode: null` where the platform represents none,
 * which is F1's *"modulo the executable bit"* made mechanical. Byte
 * comparison stays exact on all three platforms: nothing in an apply is
 * newline-normalized, so a CRLF difference would be a real difference and
 * is not forgiven here.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { hostname, tmpdir, userInfo } from 'node:os';
import { join } from 'node:path';
import { EXIT, runCli, snapshot, withTempDir, type Entry } from '../harness/cli.js';
import { fileHash } from '../../dist/index.js';

/** Every entry, plus the content of every file. `snapshot()` carries the
 *  on-disk spelling (C-36), so a case-only difference between two applies
 *  is visible here and could not be seen by composing paths. */
async function fullTree(dir: string): Promise<string[]> {
  const entries: readonly Entry[] = await snapshot(dir);
  const rows: string[] = [];
  for (const e of entries) {
    const hash =
      e.kind === 'file' ? fileHash(await readFile(join(dir, ...e.path.split('/')))) : '-';
    rows.push(`${e.path} ${e.kind} ${e.mode} ${e.size} ${hash}`);
  }
  return rows;
}

const RUNS: readonly (readonly [string, readonly string[]])[] = [
  // `stack` is answered rather than defaulted, so both runs exercise the
  // substitution rather than the empty-default shortcut. Its declared
  // pattern admits no comma, which is why the value reads as it does.
  ['coding', ['--set', 'projectName=Demo Project', '--set', 'stack=TypeScript / Node 22']],
  [
    'writing',
    [
      '--set',
      'projectName=Demo Project',
      '--set',
      'projectPurpose=How organisations absorb change',
      '--set',
      'authorName=A Writer',
      '--scaffold',
      'writing-workstream',
    ],
  ],
  ['planning', ['--calibration', 'high-floor']],
];

for (const [pack, argv] of RUNS) {
  test(`${pack}: two applies produce byte-identical trees, no exclusions`, async () => {
    const trees: string[][] = [];
    for (let i = 0; i < 2; i++) {
      await withTempDir(async (dir) => {
        const r = await runCli(['harness', 'init', pack, ...argv], dir);
        assert.equal(r.code, EXIT.ok, r.stderr);
        trees.push(await fullTree(dir));
      });
    }
    assert.deepEqual(trees[0], trees[1]);
    assert.ok((trees[0]?.length ?? 0) > 0);
  });

  test(`${pack}: the two manifests are byte-identical, digest included`, async () => {
    const manifests: string[] = [];
    for (let i = 0; i < 2; i++) {
      await withTempDir(async (dir) => {
        const r = await runCli(['harness', 'init', pack, ...argv], dir);
        assert.equal(r.code, EXIT.ok, r.stderr);
        manifests.push(await readFile(join(dir, '.harness', 'manifest.json'), 'utf8'));
      });
    }
    assert.equal(manifests[0], manifests[1]);

    const m = JSON.parse(manifests[0] ?? '{}') as { payloadDigest?: string };
    assert.match(
      m.payloadDigest ?? '',
      /^sha256-[0-9a-f]{64}$/,
      'a recorded digest, algorithm-prefixed, and the same one',
    );
  });

  /**
   * §NFR *Determinism* names what may not appear. Asserted over the
   * manifest because that is where an environment leaks first — the
   * apply's own answers pass through it verbatim, and the temp directory
   * this run happens to sit in is the value most likely to be recorded by
   * accident.
   */
  test(`${pack}: the manifest carries no path, host, user or timestamp`, async () => {
    await withTempDir(async (dir) => {
      const r = await runCli(['harness', 'init', pack, ...argv], dir);
      assert.equal(r.code, EXIT.ok, r.stderr);
      const text = await readFile(join(dir, '.harness', 'manifest.json'), 'utf8');

      assert.ok(!text.includes(dir), 'no absolute path');
      assert.ok(!text.includes(tmpdir()), 'no absolute path');
      assert.ok(!text.includes(hostname()), 'no hostname');
      assert.ok(!text.includes(userInfo().username), 'no username');
      assert.ok(!/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(text), 'no timestamp');
    });
  });
}

/**
 * US-55's last criterion: *"the order in which `--scaffold` and `--set`
 * flags were typed does not appear anywhere in the result."*
 *
 * It is the criterion an implementation passes by accident right up until
 * something iterates a flag list instead of a declaration list — the
 * manifest records parameters in `pack.json`-declared order, not in the
 * order they were answered, and nothing else may carry argv's shape.
 */
test('the order the flags were typed in appears nowhere in the result', async () => {
  const orders: readonly (readonly string[])[] = [
    [
      '--set',
      'projectName=Demo Project',
      '--set',
      'projectPurpose=How organisations absorb change',
      '--set',
      'authorName=A Writer',
      '--scaffold',
      'writing-workstream',
    ],
    [
      '--scaffold',
      'writing-workstream',
      '--set',
      'authorName=A Writer',
      '--set',
      'projectPurpose=How organisations absorb change',
      '--set',
      'projectName=Demo Project',
    ],
  ];

  const trees: string[][] = [];
  for (const argv of orders) {
    await withTempDir(async (dir) => {
      const r = await runCli(['harness', 'init', 'writing', ...argv], dir);
      assert.equal(r.code, EXIT.ok, r.stderr);
      trees.push(await fullTree(dir));
    });
  }
  assert.deepEqual(trees[0], trees[1]);
});
