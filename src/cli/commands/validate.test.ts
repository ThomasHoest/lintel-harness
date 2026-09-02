import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  allDiagnostics,
  countFindings,
  packReportJson,
  runValidate,
  summaryLines,
  validateExitCode,
  validateJson,
} from './validate.js';
import { DiagnosticBag } from '../../diag/diagnostic.js';
import type { PackReport } from '../../validate/validate-pack.js';
import type { ValidateResult } from '../../validate/validate-pack.js';

const CLI = '0.1.0';

const report = (bag: DiagnosticBag): PackReport => ({
  pack: { name: 'p', version: '1.0.0', title: 't', formatVersion: 1, minCliVersion: '1.0.0' },
  anatomy: [],
  scaffolds: [],
  parameters: [],
  steps: [],
  parameterVaryingSteps: [],
  combinations: 1,
  folderReadme: 'README.md',
  disclosure: { executables: [], inertHooks: [], substitutions: [], agents: [] },
  diagnostics: bag.items,
  ok: bag.errors.length === 0,
});

const result = (bag: DiagnosticBag): ValidateResult => ({ report: report(bag), bag: new DiagnosticBag() });

const clean = (): ValidateResult => result(new DiagnosticBag());
const noticeOnly = (): ValidateResult =>
  result(new DiagnosticBag().add('W-HOOK-SCRIPT-INERT', { values: { path: 'x' } }));
const oneDefect = (): ValidateResult =>
  result(
    new DiagnosticBag().add('W-FOLDER-README-MISSING', {
      values: { pack: 'p', dir: 'd/', basename: 'README.md', combination: 'c' },
    }),
  );
const oneError = (): ValidateResult =>
  result(new DiagnosticBag().add('E-SYMLINK-IN-PACK', { values: { path: 'x' } }));

/* ── the exit contract, all six cells ────────────────────────────────── */

/**
 * US-16's exit rule, over the three pack kinds and both flags. **The cell
 * that matters is the notice pack under `--strict`**: a notice reports a
 * state the pack declared on purpose, so promoting one would recreate the
 * problem Q-60 split the severity to solve — `validate --all --strict`
 * being unable to exit 0 for a correct pack.
 */
test('a clean pack exits 0 with and without --strict', () => {
  assert.equal(validateExitCode([clean()], false), 0);
  assert.equal(validateExitCode([clean()], true), 0);
});

test('a notice-only pack exits 0 under every flag, --strict included', () => {
  assert.equal(validateExitCode([noticeOnly()], false), 0);
  assert.equal(validateExitCode([noticeOnly()], true), 0);
});

test('a defect exits 0 normally and 1 under --strict', () => {
  assert.equal(validateExitCode([oneDefect()], false), 0);
  assert.equal(validateExitCode([oneDefect()], true), 1);
});

test('an error exits 2 under every flag', () => {
  assert.equal(validateExitCode([oneError()], false), 2);
  assert.equal(validateExitCode([oneError()], true), 2);
});

/** `--all` takes the worst across packs; a defect beside a clean pack is
 *  still a defect. */
test('the exit code across packs is the worst of them', () => {
  assert.equal(validateExitCode([clean(), noticeOnly(), oneDefect()], true), 1);
  assert.equal(validateExitCode([clean(), oneDefect(), oneError()], false), 2);
});

/**
 * A pack that never loaded far enough to produce a report still has
 * diagnostics, and they must reach the exit code. Reading only
 * `report.diagnostics` would exit **0** for a pack the CLI could not even
 * read — the failure mode a validator has least excuse for.
 */
test('a pack with no report still contributes its diagnostics', () => {
  const failed: ValidateResult = {
    bag: new DiagnosticBag().add('E-PACK-INVALID', { values: { path: 'p', detail: 'x' } }),
  };
  assert.equal(allDiagnostics([failed]).length, 1);
  assert.equal(validateExitCode([failed], false), 2);
});

/* ── the --json document ─────────────────────────────────────────────── */

/**
 * **One pack emits the report itself, not a wrapper.** US-29 requires
 * `pack info --json` to emit the `PackReport` verbatim and T-0908 asserts
 * the two surfaces produce identical bytes for one pack — a wrapper here
 * would make that assertion false while both surfaces were correct.
 */
test('--json emits the report for one pack and an array for --all', () => {
  const single = validateJson([report(new DiagnosticBag())]);
  assert.ok(!Array.isArray(single));
  assert.equal((single as { pack: { name: string } }).pack.name, 'p');
  assert.equal((validateJson([report(new DiagnosticBag()), report(new DiagnosticBag())]) as unknown[]).length, 2);
});

/**
 * **`class` is present iff the diagnostic has one.** `classOf` is total
 * and returns `'defect'` for an error, which would put a meaningless
 * class on every error in the contract CI reads to count *promotable*
 * findings.
 */
test('every warning carries its class and no error carries one', () => {
  const json = packReportJson(report(oneErrorAndNotice()));
  const byCode = new Map(json.diagnostics.map((d) => [d.code, d]));
  assert.equal(byCode.get('E-SYMLINK-IN-PACK')?.class, undefined);
  assert.equal(byCode.get('W-HOOK-SCRIPT-INERT')?.class, 'notice');
  assert.equal(byCode.get('E-SYMLINK-IN-PACK')?.exit, 2);
});

function oneErrorAndNotice(): DiagnosticBag {
  return new DiagnosticBag()
    .add('E-SYMLINK-IN-PACK', { values: { path: 'x' } })
    .add('W-HOOK-SCRIPT-INERT', { values: { path: 'x' } });
}

/** Counted from the `class` field, which is exactly what emitting it buys:
 *  CI counts promotable findings without keeping a code list of its own. */
test('findings are counted by class, not by a code list', () => {
  assert.deepEqual(countFindings(oneErrorAndNotice().items), { errors: 1, defects: 0, notices: 1 });
});

/* ── the run ─────────────────────────────────────────────────────────── */

/** Name order, not argument order: `--all` and an explicit list must
 *  produce the same output for the same set, or CI comparing two runs is
 *  comparing an argument order. */
test('packs are validated in name order whatever order they were named', async () => {
  const a = await runValidate({ packs: ['writing', 'coding'], cliVersion: CLI });
  assert.deepEqual(a.named.map((n) => n.name), ['coding', 'writing']);
});

test('--all resolves to every bundled pack, and the whole run exits 0 under --strict', async () => {
  const out = await runValidate({ cliVersion: CLI });
  assert.deepEqual(out.named.map((n) => n.name), ['coding', 'planning', 'writing']);
  assert.equal(validateExitCode(out.named.map((n) => n.result), true), 0);
});

/** Findings print in the order they were found, which is US-16's fixed
 *  check order — a reader following the fourteen steps needs the output to
 *  match them, so nothing sorts by severity. */
test('the summary prints every finding, then a verdict and the combination count', () => {
  const lines = summaryLines([{ name: 'p', result: noticeOnly() }]);
  assert.ok(lines.length >= 3);
  assert.ok(lines.at(-1)?.includes('1'), 'the combination count is printed');
});

/** A pack name is validated user input, but a value on a summary line is
 *  still escaped: a value carrying a newline and an arrow would forge a
 *  remedy line (C-50). */
test('a summary line is one line', () => {
  for (const line of summaryLines([{ name: 'p\nlintel: forged', result: clean() }])) {
    assert.ok(!line.includes('\n'));
  }
});
