/**
 * E-15 — migration and extraction fidelity. **T-1501, T-1502, T-1504, T-1505.**
 *
 * ── What this file holds, and what it deliberately does not ───────────
 *
 * The check itself is `scripts/migration-diff.mjs`, not this file. T-1501
 * asks for a **checked-in script** that reads its source commit from
 * `pack.json`'s `provenance` and fails on any path it cannot place, and a
 * script is what a maintainer can run against a pack they are editing. So
 * this file **runs** that script and asserts properties of its output,
 * rather than re-implementing the diff in TypeScript — a second
 * implementation would drift from the first and the two would then
 * disagree about which one was the check.
 *
 * T-1504 and T-1505 are the greps, and they live here rather than in the
 * script because they are assertions about the *pack as it stands*, with
 * no source commit involved.
 *
 * ── Why several of these are skipped ──────────────────────────────────
 *
 * E-15's preamble is explicit: *"Treat a task here that reports new
 * differences as the check working, not as a setback."* Every skip below
 * names a real, currently-standing difference between `packs/` and F5's
 * enumeration. **Fixing them is T-1506 and adjudicating them is T-1503,
 * and neither is this file's job** — pack content is spec-governed product
 * work. A skip here is a finding parked in the place a reader will trip
 * over it, which is the only reason to park it in a test at all.
 *
 * ── Why the source repositories are guarded rather than assumed ───────
 *
 * `coding`'s source commit lives in this repository's own history, and
 * `writing`'s lives in a **sibling checkout** that a CI runner will not
 * have — `F5-ADR-002` §10 already says condition 2 *"needs that repository
 * present"*. A test that failed on its absence would be reporting the
 * machine, not the pack. So each half skips itself when its source is
 * unreachable, and **says which** — a silent pass on a check that did not
 * run is the failure mode this whole epic is about.
 */
import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, relative, sep } from 'node:path';

/** The repository root. `dist-tests/packs/` is two levels down. */
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const SCRIPT = join(ROOT, 'scripts', 'migration-diff.mjs');

/** One `--json` row from the script. Structural, not imported: the script
 *  is `.mjs` with top-level side effects and a `process.exit`, so it is
 *  run as a process and never imported. */
interface Row {
  readonly disposition: 'dropped' | 'added' | 'modified';
  readonly path: string;
  readonly source: string | null;
  readonly classes: readonly string[];
}
interface PackReport {
  readonly pack: string;
  readonly commit: string;
  readonly recordedCommit: string;
  readonly sourceFiles: number;
  readonly shippedFiles: number;
  readonly differences: number;
  readonly dispositions: { readonly dropped: number; readonly added: number; readonly modified: number };
  readonly counts: Readonly<Record<string, number>>;
  readonly rows: readonly Row[];
  readonly residue: readonly { readonly disposition: string; readonly path: string }[];
  readonly problems: readonly string[];
  readonly notes: readonly string[];
}

/**
 * Run the check for one pack.
 *
 * Exit 1 is the script's *finding* signal, not a crash, so a non-zero exit
 * still carries a full report on stdout and is read rather than thrown on.
 * Returns `null` when the source is unreachable — see the header.
 */
function run(pack: string): PackReport | null {
  let stdout: string;
  try {
    stdout = execFileSync(process.execPath, [SCRIPT, pack, '--json'], {
      cwd: ROOT,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string };
    if (e.stdout && e.stdout.trim().startsWith('[')) stdout = e.stdout;
    else return null; // the source repository or commit is not here
  }
  const parsed = JSON.parse(stdout) as readonly PackReport[];
  return parsed[0] ?? null;
}

/** Every file under `dir`, dir-relative and POSIX-separated. */
function filesUnder(dir: string): readonly string[] {
  const out: string[] = [];
  (function walk(d: string): void {
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) walk(p);
      else out.push(relative(dir, p).split(sep).join('/'));
    }
  })(dir);
  return out.sort();
}

/** Every file under `packs/`, as `<pack>/<path>` — T-1505's whole subject. */
function allPackFiles(): readonly { readonly path: string; readonly text: string }[] {
  const packsDir = join(ROOT, 'packs');
  return filesUnder(packsDir).map((p) => ({ path: p, text: readFileSync(join(packsDir, p), 'utf8') }));
}

/* ── T-1501 / T-1502 — the check runs, and reads its own commit ───────── */

/**
 * The wiring T-1501 asks for, asserted as a property rather than trusted.
 *
 * *"Re-runnable means it reads the commit from `provenance`, never from an
 * argument, so it cannot drift from what the pack claims."* The check that
 * this holds is that the commit in the report **is** the one in
 * `pack.json` — if the script ever gained a `--commit` flag or a hard-coded
 * fallback, the two would part company here.
 *
 * This is the assertion that would have caught the `2644096` defect: a
 * provenance naming the commit that *removed* `template/` was invisible to
 * a human running the diff against the tree they knew was right.
 */
test('the check reads its source commit from provenance, for both migrated packs', (t: TestContext) => {
  for (const pack of ['coding', 'writing']) {
    const declared = (JSON.parse(readFileSync(join(ROOT, 'packs', pack, 'pack.json'), 'utf8')) as {
      provenance?: { commit?: unknown; source?: unknown };
    }).provenance;
    assert.equal(typeof declared?.commit, 'string', `packs/${pack} must declare provenance.commit`);
    assert.equal(typeof declared?.source, 'string', `packs/${pack} must declare provenance.source`);

    const report = run(pack);
    if (!report) {
      t.diagnostic(`${pack}: source unreachable on this machine — not asserted`);
      continue;
    }
    assert.equal(report.recordedCommit, declared?.commit, `${pack}: the report must use the recorded commit`);
    assert.ok(report.sourceFiles > 0, `${pack}: the recorded commit must hold a source tree`);
  }
});

/**
 * `coding`'s source tree is a fixed historical object, so its size is a
 * constant and pinning it pins the *provenance*, not the pack.
 *
 * 38 is F5 v3.3's recorded figure. If this ever changes, `provenance.commit`
 * was edited — which is exactly the event that needs a second pair of eyes,
 * because it re-baselines what "faithful" is measured against.
 */
test('coding’s recorded source commit still holds the 38 files F5 v3.3 recorded', (t: TestContext) => {
  const report = run('coding');
  if (!report) return t.skip('the coding source commit is not reachable in this checkout');
  assert.equal(report.sourceFiles, 38);
});

/**
 * **T-1502's headline, and it is a finding.**
 *
 * US-24: *"Class (j) is empty, and it is the only empty class. Any
 * difference the check cannot place in (a) through (i) fails the check."*
 * It is not empty. `packs/coding/targets/Run.md` is modified — its two
 * pack-relative literals gained a `template/` prefix — and **no class
 * claims it**: class (e) is enumerated as five files that do not include
 * it, and (e)'s own assertion is `grep -rl '\.harness/pack'`, which
 * `Run.md` does not match because it was repointed at `template/` rather
 * than at `.harness/pack/`.
 *
 * Un-skip when T-1503 has adjudicated it and T-1506 has acted.
 */
test(
  'coding: every difference falls into a declared class — class (j) is empty',
  { skip: 'packs/coding/targets/Run.md is modified and no class claims it — T-1503, then T-1506' },
  (t: TestContext) => {
    const report = run('coding');
    if (!report) return t.skip('the coding source commit is not reachable in this checkout');
    assert.deepEqual(report.residue.map((r) => r.path), []);
  },
);

/**
 * The other direction of the same question, and the one class (h)'s v3.4
 * correction was: a file carrying a class's own stated evidence that the
 * class does not name.
 *
 * Class (e) says it *"is five files"* and offers `grep -rl '\.harness/pack'
 * packs/coding`, **minus the class (b) and (h) files**, as the way to
 * assert it. That subtraction was correct when (h) held four files. F5
 * v3.4 corrected (h) to two — removing `README.md` and `CLAUDE.md.template`
 * from it — and the subtraction was not re-checked, so the stated
 * assertion now yields **seven**, not five, and (e) names neither of the
 * two that (h) released.
 *
 * A correction to one class silently invalidated another class's
 * assertion. That is the fold-check failure F5's own change history
 * catalogues, and it is here because nothing ran the assertion.
 */
test(
  'coding: each class that states how to assert itself agrees with the pack',
  { skip: 'class (e) is stated as 5 files; its own grep now yields 7 after v3.4 released 2 from class (h) — T-1503' },
  (t: TestContext) => {
    const report = run('coding');
    if (!report) return t.skip('the coding source commit is not reachable in this checkout');
    assert.deepEqual(report.problems, []);
  },
);

/**
 * `writing` has never had this run at all — F5 v3.4 discharged its half of
 * ADR-002 condition 2 with **US-25's four greps**, which are assertions
 * about the shipped pack and say nothing about what the source held.
 *
 * There is also no by-file enumeration to run it against: US-24's ten
 * classes are `coding`'s, and F5 §Flows / *Migration requirements —
 * writing* names four **kinds** of difference without naming a file under
 * any of them. The script's `writing` classes are derived from those four
 * kinds and say so; the residue is what the derivation cannot reach, and
 * it is the input T-1503 has never had.
 */
test(
  'writing: every difference falls into a declared class',
  { skip: 'F5 declares no by-file enumeration for writing; the derived one leaves 16 unplaced — T-1503' },
  (t: TestContext) => {
    const report = run('writing');
    if (!report) return t.skip('the writing source repository is not present beside this checkout');
    assert.deepEqual(report.residue.map((r) => r.path), []);
  },
);

/**
 * Q-51: *"Two authored templates, and exactly two."*
 * `templates/home.template.md` is not one of them. It is the source
 * project's `Home.md` with its frontmatter, its callouts and its section
 * structure intact and its project-specific lines parameterised — a
 * migration, and a good one. Calling it authored understates the
 * extraction and overstates the authoring, which is the same class of
 * mistake as class (h)'s.
 */
test(
  'writing: nothing declared authored turns out to have a source file',
  { skip: 'templates/home.template.md is declared authored (Q-51) but pairs with the source Home.md — T-1503' },
  (t: TestContext) => {
    const report = run('writing');
    if (!report) return t.skip('the writing source repository is not present beside this checkout');
    assert.deepEqual(report.problems, []);
  },
);

/* ── T-1504 — US-25's extraction assertions for `writing` ─────────────── */

/**
 * The three greps, run over the whole pack.
 *
 * **`provenance` is excluded, and the exclusion is narrowed to it.** US-25
 * gained that exclusion at F5 v3.4 because §NFR *Provenance* **requires**
 * the source path recorded and for `writing` that path **is** the host
 * project's name — so satisfying either requirement violated the other.
 * The check below therefore does not exempt `pack.json`; it exempts the
 * `provenance` value, and a host-project name anywhere else in the same
 * file still fails. An exclusion wide enough to be safe would have made
 * the criterion unfalsifiable, which is how it came to be needed.
 */
test('US-25: the writing pack carries no absolute path, host project name or owner name', () => {
  const packsDir = join(ROOT, 'packs', 'writing');
  const provenance = JSON.stringify(
    (JSON.parse(readFileSync(join(packsDir, 'pack.json'), 'utf8')) as { provenance?: unknown }).provenance,
  );

  const forbidden: readonly [RegExp, string][] = [
    [/\/Users\//, 'an absolute home-directory path'],
    [/AIImpactOnOrganizationsAndLeadership/, "the host project's name"],
    [/\bThomas\b/i, "the owner's personal name"],
    [/\bAndersen\b/i, "the owner's surname"],
  ];

  const hits: string[] = [];
  for (const p of filesUnder(packsDir)) {
    const text = readFileSync(join(packsDir, p), 'utf8');
    for (const [re, what] of forbidden) {
      const m = re.exec(text);
      if (!m) continue;
      if (provenance.includes(m[0])) continue; // the one declared exclusion
      hits.push(`${p}: ${what} (${m[0]})`);
    }
  }
  assert.deepEqual(hits, []);
});

/**
 * *"No file under the pack's scaffold tree contains research content —
 * only `index.md` scaffolding and the declared templates."*
 *
 * Asserted structurally rather than by reading for research: the scaffold
 * ships **twelve** files and every one is an `index.md`, so there is no
 * file that *could* hold a corpus entry. A content heuristic would have
 * been a judgement, and this criterion is meant to be a list.
 */
test('US-25: the writing scaffold holds only index.md scaffolding', () => {
  const scaffold = join(ROOT, 'packs', 'writing', 'scaffolds', 'writing-workstream');
  const files = filesUnder(scaffold);
  assert.deepEqual(
    files.filter((f) => !f.endsWith('/index.md') && f !== 'index.md'),
    [],
    'every scaffold file must be a folder index',
  );
  // F5 §Flows asserts the count directly: `find packs/writing -name index.md
  // | wc -l` → 12, against exactly one `index.md` rename in `recipe.json`.
  assert.equal(files.length, 12);
});

/**
 * *"The voice guide migrates with its voice-sample reference converted to a
 * placeholder pointing at wherever a new project keeps samples."*
 *
 * Both halves are checked. The placeholder must be there, **and** the
 * source's actual sample list must not be — a guide that gained a
 * placeholder while keeping the real reference beside it would satisfy a
 * one-sided check while shipping the thing US-25 forbids.
 */
test('US-25: the voice guide’s sample reference is a placeholder', () => {
  const guide = readFileSync(
    join(ROOT, 'packs', 'writing', 'writing-guide', 'tone-of-voice.template.md'),
    'utf8',
  );
  assert.match(guide, /\{\{VOICE SAMPLES —/, 'the sample reference must be a declared placeholder');
  assert.doesNotMatch(guide, /Notes\/voice/, 'the source project’s sample folder must not survive');
  assert.doesNotMatch(guide, /linkedinposts/, 'the source project’s sample file must not survive');
});

/* ── T-1505 — Q-46 prose stripping ───────────────────────────────────── */

/**
 * *"Zero occurrences in `packs/` of the five enumerated bootstrap
 * sections"* (F5 §Success Criteria / Migration), and G5.9: *"a grep for
 * their headings over `packs/` returns zero hits."*
 *
 * The needles below are the §Flows table's five rows plus the four phrases
 * F5's *Bootstrap prose* decision row names. **T-1505 asks for "five
 * phrases" and no such list exists** — five *sections* are enumerated in
 * one place and four *phrases* in another. F5 v3.5 reached the same
 * finding from T-1603's side and settled it: *"'Five' means three
 * different things … the checkable set is two headings and three
 * phrases."* Both enumerations run here rather than picking one, which is
 * a superset of that set.
 *
 * **Scope is the whole payload tree**, which US-36 assigns to this task by
 * name: T-1603 sees applied-destined content only, and four of the five
 * §Flows deletions are never applied, so those criteria *"are not
 * checkable by T-1603 at all"*. Bounded at `packs/` all the same — this
 * repository's own `CLAUDE.md` and specifications discuss the deleted
 * prose constantly, and a repo-wide grep would be unrunnable.
 */
test('Q-46: no bootstrap prose survives anywhere in packs/', () => {
  const needles: readonly [RegExp, string][] = [
    // The five sections, by the marker the §Flows table names.
    [/^#+\s*Bootstrapping a new project/im, 'the coding README’s bootstrapping section'],
    [/^#+\s*Adopting this in a new project/im, 'the targets README’s adoption section'],
    [/Copy this folder/i, 'the copy-this-folder instruction'],
    [/copy the contents of this folder/i, 'the copy-the-contents instruction'],
    [/drop the agent files/i, 'the drop-the-agent-files instruction'],
    // The four phrases from F5's Bootstrap prose decision row.
    [/rename the template/i, '"rename the template"'],
    [/fix the paths?\b/i, '"fix the paths"'],
    [/adopting this in a new project/i, '"adopting this in a new project"'],
  ];

  const hits: string[] = [];
  for (const { path, text } of allPackFiles()) {
    for (const [re, what] of needles) {
      const m = re.exec(text);
      if (m) hits.push(`${path}: ${what} — ${JSON.stringify(m[0])}`);
    }
  }
  assert.deepEqual(hits, []);
});

/**
 * **The binding form of the rule, not the literal one.** F5 v3.5: the
 * enumerated literals are *"a floor rather than the definition"*, and a
 * check *"MUST use a form set wide enough to catch the wordings §Flows
 * actually deleted"*. §Flows states it for `writing` as intent: *"Any
 * prose in the source `CLAUDE.md`, the writing guide README or the
 * workstream READMEs that instructs a reader to copy a folder, rename a
 * file, fix a path, or set the project up by hand does not extract."*
 *
 * One instance survives, in one of the three files that sentence names,
 * and it is applied-destined. It is genuinely arguable — US-25's own third
 * criterion says the voice guide converts its sample reference *"per that
 * folder's own portability note"*, and the portability note **is** the
 * surviving sentence — so this is an adjudication, not a defect, and the
 * skip says so rather than pretending the check is clean.
 *
 * `readme.test.ts` runs the same rule over applied-destined content with
 * an independently written form set, and does not report this one: it
 * matches `drop the …` where the sentence says `drop this folder`. Two
 * sweeps, same rule, different wordings imagined — which is US-36's own
 * `copy this folder` / `copy the contents of this folder` lesson arriving
 * a second time. Neither set is redundant.
 */
test(
  'Q-46: no pack file instructs a reader to copy a folder or set the project up by hand',
  {
    skip:
      'packs/writing/writing-guide/README.template.md:20 says "drop this folder into another repo" ' +
      '— a file §Flows names by name, but the sentence US-25 also cites — T-1503',
  },
  () => {
    const re =
      /(copy|drop) (this|the) (folder|contents|constructs)|copy it (to|into)|drop the agent files|fix the paths?\b/i;
    const hits: string[] = [];
    for (const { path, text } of allPackFiles()) {
      const m = re.exec(text);
      if (m) hits.push(`${path}: ${JSON.stringify(m[0])}`);
    }
    assert.deepEqual(hits, []);
  },
);

/**
 * G5.8's companion, and the reason Q-46 deletion is not merely tidying: a
 * deleted section leaves a dangling cross-reference behind, and the
 * cross-reference is the half a heading grep cannot see.
 *
 * `CLAUDE.md.template`'s entry in the §Flows deletion table exists *only*
 * because of this — it carried a pointer at `targets/README.md`'s adoption
 * section, and nothing else about it needed deleting.
 */
test('Q-46: no pack file points at a deleted bootstrap section', () => {
  const hits: string[] = [];
  for (const { path, text } of allPackFiles()) {
    if (/#adopting-this-in-a-new-project|#bootstrapping-a-new-project/i.test(text)) {
      hits.push(`${path}: anchor link to a deleted section`);
    }
  }
  assert.deepEqual(hits, []);
});

/**
 * T-1501 asks for the check as a **checked-in script**, and the two
 * properties that make it one are asserted on its source rather than left
 * as intent.
 *
 * *"Re-runnable means it reads the commit from `provenance`, never from an
 * argument"* — so the absence of a commit flag is part of the contract,
 * not a stylistic choice. A script that could be pointed at a commit is a
 * script that will be pointed at the right one by someone who already
 * knows the answer, and `packs/coding/pack.json` would still be recording
 * `2644096`.
 */
test('the check is a checked-in script that cannot be pointed at another commit', () => {
  assert.ok(existsSync(SCRIPT), 'scripts/migration-diff.mjs must be checked in');
  const text = readFileSync(SCRIPT, 'utf8');
  // T-1501's binding constraint, asserted on the source: the commit comes
  // from `provenance`, so the script must never accept one as an argument.
  assert.doesNotMatch(text, /--commit/, 'the script must not take a commit argument');
  assert.match(text, /provenance\.commit/, 'the script must read provenance.commit');
});
