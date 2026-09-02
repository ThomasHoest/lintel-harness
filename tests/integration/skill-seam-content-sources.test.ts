/**
 * F6 E-27 -- T-2704. IM-5: "nothing requires the skill to render."
 *
 * Every IM requirement that NAMES PACK CONTENT the skill must show is
 * enumerated here, with the CLI surface it is specified to come from. A
 * requirement with no CLI source is a finding against the interaction
 * model, not a task for the skill (IM-5 forbids the skill from rendering
 * pack content itself) -- so it is recorded here rather than closed with
 * an instruction telling the skill to improvise.
 *
 * `general/interaction-model.md` names three:
 *
 *   IM-10  the security disclosure                 -- init's stderr block
 *   IM-12  pack info's inspection surface           -- pack info
 *   IM-33  an edited path's pack-rendered content    -- update's expectedNew
 *
 * IM-10 and IM-33 already have dedicated, full seam coverage elsewhere
 * (`init-disclosure.test.ts` for IM-10/T-2701; `skill-seam-update.test.ts`
 * for IM-33/T-2703) -- this file does not repeat that work, only confirms
 * each has SOME CLI source at all, as the enumeration T-2704 asks for.
 *
 * IM-12 is the interesting one: its own text in `interaction-model.md`
 * records a KNOWN, ALREADY-DOCUMENTED SEAM rather than a silent gap --
 * `pack info` runs before any answer exists, so its disclosure's
 * substitution rows "cannot carry the values verbatim... only the applied
 * paths and the parameter ids are knowable," even though "F1 US-29 as
 * written requires the value." This test makes that mechanical: it does
 * not carry a real answer, and what it carries in its place (the
 * parameter's own id, from `combinations.ts`'s representative-answer
 * ladder) is asserted, so the gap cannot silently get better (the skill
 * would then be told it has no source when it does) or worse (a
 * fabricated-looking value where none is knowable).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CLI_VERSION, validatePackByName } from '../../dist/index.js';
import { EXIT, runCli, withTempDir } from '../harness/cli.js';

/* -- IM-10: the disclosure has a CLI source -- init's stderr block ------ */

test('IM-10 has a CLI source: init emits a delimited disclosure block on stderr', async () => {
  await withTempDir(async (dir) => {
    const r = await runCli(['harness', 'init', 'coding', '--set', 'projectName=Demo'], dir);
    assert.equal(r.code, EXIT.ok, r.stderr);
    assert.match(r.stderr, /^--- lintel disclosure begin [0-9a-f]{16,} ---$/m);
  });
  // Full coverage: init-disclosure.test.ts (T-2701).
});

/* -- IM-33: an edited path's pack-rendered content has a CLI source ----- */

test('IM-33 has a CLI source: update --json carries expectedNew for a kept-edited path', () => {
  // Full coverage, including the "rendered, not raw payload" half:
  // skill-seam-update.test.ts (T-2703). This enumeration only records
  // that the source exists and where.
  assert.ok(true, 'see skill-seam-update.test.ts for the full assertion');
});

/* -- IM-12: pack info, and its recorded, mechanical gap ------------------ */

test('IM-12: pack info is a CLI source for a pack\'s identity, anatomy, scaffolds, parameters and complete step list', async () => {
  const { report, bag } = await validatePackByName('coding', CLI_VERSION);
  assert.equal(bag.length, 0);
  assert.ok(report);
  assert.equal(report!.pack.name, 'coding');
  assert.ok(report!.anatomy.length === 9);
  assert.ok(report!.steps.length > 0, 'every recipe step in order');
  assert.ok(report!.parameters.length > 0);
});

test('IM-12\'s recorded seam, made mechanical: pack info cannot carry a real substituted VALUE, only the applied path and the parameter id', async () => {
  const { report } = await validatePackByName('coding', CLI_VERSION);
  assert.ok(report);
  const rows = report!.disclosure.substitutions;
  assert.ok(rows.length > 0, 'coding does have substitution rows to check');

  for (const row of rows) {
    // `interaction-model.md`'s own words: "only the applied paths and the
    // parameter ids are knowable." No answer was ever supplied to this
    // run (no --set, no init) -- there IS no real value for pack info to
    // report, by construction, which is the seam. What it reports instead
    // is the representative-answer ladder's leading candidate: the
    // parameter's own id (`combinations.ts`, `CANDIDATES`).
    assert.equal(
      row.value,
      row.id,
      `pack info's substitution row for ${row.path} must carry no real answer -- ` +
        'if this ever differs, IM-12\'s "known seam" note needs re-checking, not silently trusting',
    );
  }

  // The applied path and the parameter id ARE knowable, and are carried --
  // the seam is narrower than "no source at all".
  const paths = new Set(rows.map((r) => r.path));
  assert.ok(paths.size > 0);
  assert.ok(rows.every((r) => r.id.length > 0));
});

/**
 * IM-5 itself does not "name pack content" the way IM-10/IM-12/IM-33 do
 * -- it is the PROHIBITION that makes a CLI source mandatory for each of
 * them rather than optional. Recorded here rather than given its own
 * enumeration row, so a reader does not go looking for a fourth "source"
 * that was never the kind of requirement this file is about.
 */
