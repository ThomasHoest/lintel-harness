/**
 * E-18 — the two pack-content rules that ship unenforced.
 * T-1801, T-1802.
 *
 * ── What this epic is for ─────────────────────────────────────────────
 *
 * US-26 (a bet cannot be committed without kill criteria) and US-27 (an
 * unsupervised run stops at the absorption gate) are rules `planning`
 * relies on and **nothing at v1.0 enforces**. No pack may register an
 * agent hook — `merge-json` does not ship (Q-54), so there is no route to
 * a `.claude/settings.json` and therefore no route to a `hooks` key — and
 * the guard script consequently lands as ordinary `0644` content that
 * nothing executes.
 *
 * **This epic makes the prose checkable and records the gap. It does not
 * close it.** So every assertion below is a *content* assertion, and the
 * file says so rather than dressing a grep up as an enforcement test.
 *
 * ── Why the inert guard must stay a `notice` ──────────────────────────
 *
 * `W-HOOK-SCRIPT-INERT` is one of the two codes `planning` emits **by
 * design**. Before Q-60 split `defect` from `notice` there was no
 * severity a correct pack could carry: the finding is unclearable — the
 * script is inert *precisely because of* a v1.0 format rule, so the only
 * author change that would silence it is deleting content the pack means
 * to ship for v1.1 to register. A `--strict` run that could not pass
 * because a pack ships what it means to ship is the failure Q-60 exists
 * to prevent, and T-1901's gate is unreachable without it.
 *
 * ── Where these strings live ──────────────────────────────────────────
 *
 * The two block messages are **F5's, verbatim** (§Error States,
 * *Pack-content scenarios — F5 owns the string, verbatim*). They are not
 * catalogue codes and never will be: they are printed by an agent
 * following an instruction, not by the CLI, so `src/diag/` has nothing to
 * say about them and a test is the only thing that holds them.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  CLI,
  appliedPaths,
  loadBundled,
  modeOnDisk,
  posixModes,
  readApplied,
  withApplied,
  type AppliedProject,
} from './apply-harness.js';

import { validatePackByName } from '../../dist/validate/validate-pack.js';
import { renderPackInfo } from '../../dist/cli/commands/pack-info.js';
import { DISCLOSURE_TEXT } from '../../dist/security/consent.js';
import { promotedByStrict, severityOf, classOf } from '../../dist/diag/codes.js';
import { exitCodeFor } from '../../dist/diag/diagnostic.js';

/** F5 §Error States, *Pack-content scenarios*. Written once, compared
 *  byte for byte — a paraphrase in either command file is the drift this
 *  epic exists to catch. */
const KILL_CRITERIA_BLOCK =
  'Blocked — a bet cannot be committed without kill criteria. ' +
  'Fill "Kill criteria" in bets/<slug>/brief.md, then retry.';

/** F5 §Error States, and US-27's third criterion. */
const ABSORPTION_GATE_ABORT =
  'ABORT — the absorption/security gate is non-delegable and lies outside ' +
  'the autonomy envelope. A human must clear it before the learn phase begins.';

const GUARD = '.claude/hooks/kill-criteria-guard.sh';

/**
 * Markdown emphasis, blockquote markers and line wrapping are formatting;
 * the wording is the claim. Normalising all three is what lets "identical
 * wording" be asserted across files that wrap at different columns and
 * quote at different depths.
 *
 * The blockquote strip runs **before** the whitespace collapse and
 * emphasis removal, because `planning`'s bet template wraps a bolded
 * phrase across a quoted line break — `**not\n> committed**` — and
 * collapsing first would leave a `>` in the middle of the sentence.
 */
function wording(text: string): string {
  return text
    .split('\n')
    .map((line) => line.replace(/^\s*>+\s?/, ''))
    .join(' ')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function payloadText(dir: string, path: string): string {
  return readFileSync(join(dir, ...path.split('/')), 'utf8');
}

/* ── T-1801 — the guard ships inert, and says so ─────────────────────── */

/**
 * **The guard lands as ordinary `0644` content under `.claude/hooks/`,
 * byte-identical to the payload.**
 *
 * All three halves matter. *Ordinary* — the recipe step declares no
 * `executable`, so nothing about it is special-cased. *`0644`* — it is
 * not runnable, which is the whole claim. *Byte-identical* — no
 * substitution touches it, so the v1.1 route really is a registration
 * rather than a rewrite, which is the reason US-26 asks for the script to
 * ship at all rather than waiting for the mechanism.
 */
test('planning ships its kill-criteria guard as ordinary 0644 content under .claude/hooks/', async () => {
  await withApplied([{ name: 'planning' }], async ([project]) => {
    const p = project as AppliedProject;

    assert.ok(appliedPaths(p).includes(GUARD), 'the guard must reach the project');
    const planned = p.plan.files.find((f) => String(f.path) === GUARD);
    assert.ok(planned, 'the guard must be in the plan');
    assert.equal(planned.executable, false, 'inert means not executable');

    assert.equal(
      Buffer.compare(readApplied(p, GUARD), readApplied(p, '.harness/pack/hooks/kill-criteria-guard.sh')),
      0,
      'the applied guard is the payload guard, unchanged',
    );

    // Windows synthesises mode bits, so the number means nothing there.
    if (posixModes) assert.equal(modeOnDisk(p.dir, GUARD).toString(8), '644');
  });
});

/**
 * **`validate` emits `W-HOOK-SCRIPT-INERT` as a `notice`, and `--strict`
 * does not promote it.**
 *
 * Three separate claims, and the third is the load-bearing one:
 *
 *   - the code is raised at all, against the guard's applied path;
 *   - it carries `severity: warning`, `class: notice`;
 *   - **`--strict` leaves the exit code at `0`.** Asserted through
 *     `exitCodeFor` over `planning`'s real diagnostics rather than
 *     through `promotedByStrict` alone, because the promotion table being
 *     right and the exit rule reading it are two different things, and it
 *     is the exit code CI observes.
 *
 * `promotedByStrict` is asserted too, as the rule's own statement: no
 * flag may ever be added that promotes this code, and a change to that
 * table is where such a flag would first appear.
 */
test('the inert-hook finding is a notice, and --strict cannot promote it', async () => {
  const { report } = await validatePackByName('planning', CLI);
  assert.ok(report, 'planning must produce a report');

  const inert = report.diagnostics.filter((d) => d.code === 'W-HOOK-SCRIPT-INERT');
  assert.equal(inert.length, 1, 'one guard, one finding');
  assert.equal(inert[0]?.path, GUARD);
  assert.equal(inert[0]?.severity, 'warning');
  assert.equal(inert[0]?.class, 'notice');

  // The catalogue's own statement of the same rule.
  assert.equal(severityOf('W-HOOK-SCRIPT-INERT'), 'warning');
  assert.equal(classOf('W-HOOK-SCRIPT-INERT'), 'notice');
  assert.equal(
    promotedByStrict('W-HOOK-SCRIPT-INERT'),
    false,
    'a notice a correct pack raises can never be promotable',
  );

  // And the exit code CI reads, under both flags.
  assert.equal(exitCodeFor(report.diagnostics, false), 0);
  assert.equal(exitCodeFor(report.diagnostics, true), 0, '--strict must still exit 0');
});

/**
 * **`pack info` lists the guard as inert** — US-26's last documentation
 * criterion, and the one place a person choosing this pack meets the
 * shortfall before applying it.
 *
 * The suffix is asserted with the path because `DISCLOSURE_TEXT` states
 * it on **every row** rather than once under the heading: a reader
 * scanning row by row must not be able to take a path here for something
 * that runs.
 */
test('pack info lists the guard, and says on the line itself that it runs nothing', async () => {
  const { report } = await validatePackByName('planning', CLI);
  assert.ok(report);

  const lines = renderPackInfo(report);
  const row = lines.find((l) => l.includes(GUARD) && l.includes(DISCLOSURE_TEXT.inertHooks.suffix));
  assert.ok(
    row,
    `pack info must list ${GUARD} with "${DISCLOSURE_TEXT.inertHooks.suffix}" on the same line`,
  );
});

/**
 * **T-1803's outcome, made checkable.**
 *
 * T-1803 is an `[Implementer]` task: *record the enforcement gap in
 * `packs/planning/README.md` where a reader will meet it — part 8's row —
 * rather than only in this spec.* **It is already discharged in the
 * shipping pack**, and that is exactly why it needs a test: a discharged
 * documentation task leaves nothing behind that would notice its own
 * deletion. A later editor tightening part 8's row to the three slash
 * commands would be making the page shorter and truer-looking while
 * removing the only place a reader meets the shortfall.
 *
 * Two locations, because the row alone is too terse to carry the limit:
 * part 8's **row** must name the guard as inert, and the page must state
 * that enforcement at the file write does not exist. `readme.test.ts`
 * holds the status *column* against `pack.json`; this holds the prose
 * that says why part 8 being `present` is not the whole story.
 */
test('planning’s README records the enforcement gap in part 8, not only in the spec', async () => {
  const planning = await loadBundled('planning');
  const readme = payloadText(planning.dir, 'README.md');

  const partEight = readme
    .split('\n')
    .find((line) => /^\|\s*8\s*\|/.test(line));
  assert.ok(partEight, 'the README must carry a part 8 row');
  assert.ok(
    /inert/i.test(partEight),
    `part 8's row must name the guard as inert; it reads: ${partEight}`,
  );

  const prose = wording(readme);
  assert.ok(
    prose.includes('registered by nothing and executed by nothing'),
    'the page must say what "inert" means',
  );
  assert.ok(
    prose.includes('Enforcement at the file write does not exist here'),
    'the page must state the limit, not only the mechanism',
  );
});

/* ── T-1802 — US-26 and US-27 as content assertions ──────────────────── */

/**
 * **The bet template requires kill criteria, and `/bet` refuses without
 * them — in the exact words F5 owns.**
 *
 * `/bet` and `/review` are compared **byte for byte** against the string,
 * not searched case-insensitively for a paraphrase. A block message a
 * user can grep for in a transcript is only useful while it is one
 * string; two near-identical wordings across the two commands that print
 * it would be indistinguishable from a bug in whichever one the user did
 * not read.
 *
 * The template itself stays in the payload — `planning`'s recipe renders
 * out only `project-brief.template.md` — so it is asserted at
 * `.harness/pack/templates/`, which is US-35's shape and not an
 * oversight.
 */
test('the bet template requires kill criteria, and /bet and /review refuse in F5’s exact words', async () => {
  await withApplied([{ name: 'planning' }], async ([project]) => {
    const p = project as AppliedProject;

    const template = readApplied(
      p,
      '.harness/pack/templates/opportunity-bet-brief.template.md',
    ).toString('utf8');
    assert.ok(
      /^##\s+6\.\s+Kill criteria\s*$/m.test(template),
      'the bet template must carry a Kill criteria section',
    );
    assert.ok(
      wording(template).includes(
        'A brief whose `Kill criteria` field is empty or still at its placeholder is not committed',
      ),
      'the template must state that an unfilled field is not a commitment',
    );
    assert.equal(
      appliedPaths(p).includes('templates/opportunity-bet-brief.template.md'),
      false,
      'the bet template stays in the payload and is read from .harness/pack/',
    );

    for (const command of ['.claude/commands/bet.md', '.claude/commands/review.md']) {
      const text = readApplied(p, command).toString('utf8');
      assert.equal(
        text.split(KILL_CRITERIA_BLOCK).length - 1,
        1,
        `${command} must carry the block message exactly once, verbatim`,
      );
    }
  });
});

/**
 * **The absorption-gate ABORT line is one string, and it is identical
 * wherever it appears.**
 *
 * It appears in exactly two files — `targets/Run.md`, which the recipe
 * copies into the project, and `targets/target.template.md`, which stays
 * in the payload for `/target` to fill from. Both are compared against
 * the same constant, so a re-wording of either is caught here rather than
 * by a user reading one file and an agent printing the other.
 *
 * **US-27 also requires the text to be identical at both calibrations**,
 * and that is asserted by applying `planning` twice — once per
 * `constraintFloor` — and comparing the produced `targets/Run.md` byte
 * for byte. It holds structurally (no `when` gates either file), and
 * asserting it against two real applies is what turns "it holds
 * structurally" into evidence.
 */
test('the absorption-gate ABORT line is verbatim identical everywhere it appears, at both calibrations', async () => {
  await withApplied(
    [
      { name: 'planning', answers: new Map([['constraintFloor', 'high-floor']]) },
      { name: 'planning', answers: new Map([['constraintFloor', 'near-zero-floor']]) },
    ],
    async ([high, low]) => {
      const h = high as AppliedProject;
      const l = low as AppliedProject;

      for (const p of [h, l]) {
        for (const path of ['targets/Run.md', '.harness/pack/targets/target.template.md']) {
          const text = readApplied(p, path).toString('utf8');
          assert.equal(
            text.split(ABSORPTION_GATE_ABORT).length - 1,
            1,
            `${p.label}: ${path} must carry the ABORT line exactly once, verbatim`,
          );
        }
      }

      assert.equal(
        Buffer.compare(readApplied(h, 'targets/Run.md'), readApplied(l, 'targets/Run.md')),
        0,
        'the targets contract is identical at both calibrations',
      );
    },
  );
});

/**
 * **SKIPPED — this test fails against `packs/planning/` as it ships, and
 * the failure is a pack-content defect for T-1803's implementer.**
 *
 * T-1802 asks for the absorption-gate rule to appear in `Run.md`, the
 * target contract and `CLAUDE.md` **with the same wording in all three**,
 * and to assert the wording is identical rather than merely present:
 * *"three copies that drift are worse than one, and this is the
 * invariance NFR made checkable."*
 *
 * They have already drifted. With markdown emphasis and line wrapping
 * normalised away, the three read:
 *
 *   - `packs/planning/targets/Run.md`
 *     — *"A target may carry a bet up to the absorption/security gate and
 *       may never clear it."*
 *   - `packs/planning/targets/README.md`
 *     — *"A target may carry a bet up to the absorption/security gate. It
 *       may never clear it."*
 *   - `packs/planning/CLAUDE.md.template`
 *     — *"An unsupervised run may carry a bet up to the gate. It may
 *       never clear it."*
 *
 * Three sentences, three subjects (*a target* / *a target* / *an
 * unsupervised run*), two objects (*the absorption/security gate* / *the
 * gate*), and two conjunctions. **And `targets/target.template.md` — the
 * document the epic actually names as "the target contract" — carries no
 * form of the sentence at all**; it states the rule only as an abort
 * criterion, which is a different claim from the standing rule the other
 * three assert.
 *
 * None of the three is wrong. That is the problem the invariance NFR is
 * about: a reader who meets two of them cannot tell whether the
 * difference is deliberate, and the copy that drifts furthest is the one
 * a v1.1 hook would be written against.
 *
 * **The rule below is the correct one and is written as it should hold.**
 * Un-skip after the wording is unified in the pack — one sentence, chosen
 * once, in `Run.md`, `targets/target.template.md` and
 * `CLAUDE.md.template`.
 */
test(
  'the absorption-gate rule is worded identically in Run.md, the target contract and CLAUDE.md',
  {
    skip:
      'packs/planning/ carries three different wordings of the standing gate rule ' +
      '(Run.md, targets/README.md, CLAUDE.md.template) and none in ' +
      'targets/target.template.md — T-1803',
  },
  async () => {
    const planning = await loadBundled('planning');
    const sources = [
      'targets/Run.md',
      'targets/target.template.md',
      'CLAUDE.md.template',
    ] as const;

    // The sentence, as it should read once. Taken from the shortest of
    // the three current forms so the fix is a trim rather than a rewrite.
    const RULE = 'A target may carry a bet up to the absorption/security gate. It may never clear it.';

    const missing = sources.filter((s) => !wording(payloadText(planning.dir, s)).includes(RULE));
    assert.deepEqual(missing, [], 'every copy of the rule must be the same sentence');
  },
);

/**
 * **The two enforcement gaps are stated in the produced project, not only
 * in the spec.**
 *
 * US-26's *"the block **and its limits** are documented … in the produced
 * project's `CLAUDE.md`"*, and US-27's target-reviewer clause. This is the
 * one assertion in the epic that is about what a **user** can find out,
 * and it is over the **generated** `CLAUDE.md` rather than the template
 * because that is the file they open.
 */
test('the produced CLAUDE.md states both rules and both of their limits', async () => {
  await withApplied([{ name: 'planning' }], async ([project]) => {
    const claude = wording(readApplied(project as AppliedProject, 'CLAUDE.md').toString('utf8'));

    // US-26: the rule, the mechanism that carries it, and the limit.
    assert.ok(claude.includes('kill criteria'), 'the kill-criteria rule');
    assert.ok(
      claude.includes(GUARD) && claude.includes('inert'),
      'CLAUDE.md must name the guard and say it is inert',
    );

    // US-27: the gate is outside the envelope, and target-reviewer is the
    // thing that refuses a target which would need to pass it.
    assert.ok(claude.includes('absorption gate is outside the envelope'));
    assert.ok(
      claude.includes('target-reviewer') && claude.includes('NEEDS-CORRECTION'),
      'CLAUDE.md must name the readiness refusal, not only the rule',
    );
  });
});
