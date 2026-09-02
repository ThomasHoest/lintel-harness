/**
 * E-19 — the bundled-pack acceptance gate.
 * T-1901, T-1902, T-1903, T-1904, T-1905.
 *
 * ── What this file is ─────────────────────────────────────────────────
 *
 * The gate that makes every claim in E-13…E-18 **continuous rather than
 * one-off**. Everything here runs against the three packs that ship, in
 * CI, on every commit; nothing here uses a fixture.
 *
 * The headline is T-1901: `validate --all --strict` exits **`0`** over
 * all three. **That is the gate Q-60 made reachable** — before the
 * `defect`/`notice` split it could never pass, because two of
 * `planning`'s findings are deliberate design decisions and any severity
 * that `--strict` could promote would have made a correct pack
 * unshippable.
 *
 * ── T-1906 is not here, and cannot be ─────────────────────────────────
 *
 * The epic's last task is `[Architect]` — re-issue `F5-ADR-002`, whose
 * verdict is `REVISE SPEC` against F5 v2.9 while the spec is now at v3.7.
 * It is a decision recorded in `specifications/`, not a test, and a spec
 * revision does not self-certify. **The gate below passing is an input to
 * that re-review, not a substitute for it.**
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  CLI,
  allBundled,
  appliedPaths,
  filesOnDisk,
  loadBundled,
  readApplied,
  withApplied,
  type AppliedProject,
  type ApplySpec,
} from './apply-harness.js';

import { runValidate } from '../../dist/cli/commands/validate.js';
import { validateExitCode } from '../../dist/cli/commands/validate.js';
import { renderPackInfo, packInfoJson } from '../../dist/cli/commands/pack-info.js';
import { ANATOMY_PART_IDS } from '../../dist/pack/types.js';
import { PACK_INFO_TEXT } from '../../dist/cli/commands/pack-info.js';

const PACKS = ['coding', 'planning', 'writing'] as const;

/** Every scaffold selection the product can be applied under. With one
 *  scaffold in one pack (Q-82) this is the complete list, and it is
 *  written out rather than generated so that a second scaffold appearing
 *  is a visible edit here rather than a silent widening. */
const EVERY_SELECTION: readonly ApplySpec[] = [
  { name: 'coding' },
  { name: 'planning', answers: new Map([['constraintFloor', 'high-floor']]) },
  { name: 'planning', answers: new Map([['constraintFloor', 'near-zero-floor']]) },
  { name: 'writing' },
  { name: 'writing', scaffolds: ['writing-workstream'] },
];

const sha256 = (bytes: Buffer): string => createHash('sha256').update(bytes).digest('hex');

/* ── T-1901 — the gate ───────────────────────────────────────────────── */

/**
 * **`lintel harness validate --all --strict` exits `0` over all three
 * bundled packs.** F5's shipping claim, and the one line of this suite
 * that decides whether the packs are releasable.
 *
 * Composed through `runValidate` and `validateExitCode` — the functions
 * `main.ts` will call — rather than by spawning the binary, because
 * `harness validate` still dispatches to the stub note. **When the
 * command lands this should gain the process-level form as a second
 * assertion rather than a replacement**: the exit *class* is a contract
 * only a process can observe, and the composition below is what tells an
 * author which pack and which check failed.
 *
 * Both flags are asserted. They fail differently: a plain `0` tolerates a
 * `defect`, and a strict `0` is the claim F5 §NFR actually makes.
 */
test('validate --all --strict exits 0 over all three bundled packs', async () => {
  const { named, reports } = await runValidate({ cliVersion: CLI });

  assert.deepEqual(
    named.map((n) => n.name),
    ['coding', 'planning', 'writing'],
    '--all resolves to the three bundled packs, in name order',
  );
  assert.equal(reports.length, 3, 'every pack must load far enough to produce a report');

  for (const report of reports) {
    assert.equal(report.ok, true, `${report.pack.name} raised an error`);
    assert.deepEqual(
      report.diagnostics.filter((d) => d.severity === 'error').map((d) => d.code),
      [],
      `${report.pack.name}`,
    );
    assert.deepEqual(
      report.diagnostics.filter((d) => d.severity === 'warning' && d.class === 'defect').map(
        (d) => `${d.code}: ${d.message}`,
      ),
      [],
      `${report.pack.name} raises a defect-class warning; --strict would fail it`,
    );
  }

  const results = named.map((n) => n.result);
  assert.equal(validateExitCode(results, false), 0, 'plain');
  assert.equal(validateExitCode(results, true), 0, '--strict');
});

/**
 * **The complete finding set across the product — four, all `notice`.**
 *
 * Pinned rather than summarised as "no defects", because these are
 * *correct output from correct packs* rather than tolerated noise. A pack
 * closing a declared gap changes this list, and it should: that is a fact
 * about the product, not an incidental test update.
 *
 * ── A stale claim this pins against ──────────────────────────────────
 *
 * **F5 US-20 says the set is two, both against `planning`:** *"`validate
 * --all --strict --json` exits `0` and reports exactly two findings, both
 * `"class": "notice"` and both against `planning`"*, and, in the same
 * criterion, *"`coding` and `writing` emit no notice at v1.0."*
 * `writing`'s §7b repeats it — *"`writing` emits **no** diagnostic of
 * either class at v1.0 — no `defect` and no `notice` — so its clean run
 * is silent as well as green (Q-60)."*
 *
 * **Both sentences are false, and they are false about a pack behaving
 * exactly as the same story requires.** US-20 itself demands that
 * `writing` report parts 8 and 9 `absent` with a reason — and declaring
 * an `absent` part *is* a `W-ANATOMY-ABSENT` notice. The claim and the
 * requirement it sits beside cannot both hold. Reported as a spec finding
 * rather than skipped, because the packs are right and the document is
 * wrong; the gate T-1901 states is unaffected, since four notices exit
 * `0` exactly as two do.
 */
test('the product emits exactly four findings, every one a notice, and they are the declared gaps', async () => {
  const { named } = await runValidate({ cliVersion: CLI });
  const found = named.flatMap((n) =>
    (n.result.report?.diagnostics ?? []).map((d) => `${n.name}: ${d.code}`),
  );

  assert.deepEqual(found, [
    'planning: W-ANATOMY-PROVISIONAL',
    'planning: W-HOOK-SCRIPT-INERT',
    'writing: W-ANATOMY-ABSENT',
    'writing: W-ANATOMY-ABSENT',
  ]);

  for (const n of named) {
    for (const d of n.result.report?.diagnostics ?? []) {
      assert.equal(d.class, 'notice', `${n.name}: ${d.code} is not a notice`);
    }
  }
});

/* ── T-1902 — US-20, and the step list as a control ──────────────────── */

/**
 * **`pack info <name>` renders each pack's nine parts with statuses, its
 * parameters, its scaffolds and its complete step list.**
 *
 * G-F1-9: a reader must be able to see what an apply will do **without
 * running it**. That makes the rendering a *control* rather than a
 * convenience — §3.1 refused a script primitive on the ground that this
 * list is complete — so the assertions below are about completeness, not
 * about layout. No wording is asserted; `PACK_INFO_TEXT` is used for the
 * empty marker only, so a re-phrasing of a heading does not fail a test
 * about content.
 *
 * The `absent`/`provisional` detail text is checked with the row: US-20
 * requires the declared `reason` and `note` to be rendered, and a status
 * shown without its explanation is the report naming a gap and saying
 * nothing about it.
 */
test('pack info renders nine anatomy parts with their statuses, and every declared reason and note', async () => {
  for (const name of PACKS) {
    const bundled = await loadBundled(name);
    const { named } = await runValidate({ packs: [name], cliVersion: CLI });
    const report = named[0]?.result.report;
    assert.ok(report, `${name} must produce a report`);

    assert.deepEqual(
      report.anatomy.map((r) => r.part),
      [...ANATOMY_PART_IDS],
      `${name}: nine rows, in declared order`,
    );

    const lines = renderPackInfo(report);
    for (const row of report.anatomy) {
      const rendered = lines.find((l) => l.includes(row.part) && l.includes(row.status));
      assert.ok(rendered, `${name}: ${row.part} is not rendered with its status`);
      const detail = row.note ?? row.reason;
      if (detail !== undefined) {
        assert.ok(
          rendered.includes(detail.split('\n')[0] ?? detail),
          `${name}: ${row.part} is ${row.status} and its text is not rendered`,
        );
      }
    }

    // Parameters and scaffolds come off `pack.json`, unmodified.
    assert.deepEqual(report.parameters, bundled.pack.parameters ?? []);
    assert.deepEqual(
      report.scaffolds.map((s) => s.id),
      (bundled.pack.scaffolds ?? []).map((s) => s.id),
    );
    for (const s of report.scaffolds) {
      assert.equal(
        s.steps,
        (bundled.recipe.scaffolds?.[s.id] ?? []).length,
        `${name}: ${s.id}'s rendered step count must come from the recipe`,
      );
    }

    // US-29: an empty list says so rather than vanishing. `coding` and
    // `planning` declare no scaffold, and that must be visible.
    if (report.scaffolds.length === 0) {
      const heading = lines.indexOf(PACK_INFO_TEXT.scaffolds);
      assert.notEqual(heading, -1, `${name}: the scaffolds heading must still print`);
      assert.equal(lines[heading + 1], PACK_INFO_TEXT.empty, `${name}: "(none)", not nothing`);
    }

    // The `--json` surface is the same document, so F6 and CI consume the
    // structure rather than the rendering.
    assert.deepEqual(packInfoJson(report).anatomy, report.anatomy);
  }
});

/**
 * **The rendered step list matches `recipe.json` exactly.**
 *
 * "Exactly" is taken literally: the expected list below is built from the
 * **raw parsed JSON**, with the source field chosen per primitive here
 * rather than read from `OPS`, so this is a comparison against the file
 * and not against the module that summarises it. A step present in the
 * recipe and absent from the report — or one whose destination is
 * rendered differently from the one it declares — is a reader being shown
 * a plan the apply will not follow, which is precisely the control §3.1
 * traded a script primitive for.
 *
 * The **two editing primitives** are the case worth being explicit about:
 * `rewrite-path` and `substitute` have no `to` at all, and their `from`
 * is their `in` globs. A summary printing two blanks for them would hide
 * the steps that change a file's bytes *after* it was placed — which are
 * the only steps in the product that can alter content the reader already
 * believes they have inspected.
 */
test('the rendered step list is exactly what recipe.json declares, in declared order', async () => {
  interface Row {
    index: number;
    op: string;
    from: string | null;
    to: string | null;
    scaffold: string | null;
  }

  for (const bundled of await allBundled()) {
    const { named } = await runValidate({ packs: [bundled.name], cliVersion: CLI });
    const report = named[0]?.result.report;
    assert.ok(report, `${bundled.name} must produce a report`);

    const raw = bundled.recipeRaw;
    const base = (raw['steps'] ?? []) as readonly Readonly<Record<string, unknown>>[];
    const scaffoldSteps = (raw['scaffolds'] ?? {}) as Readonly<
      Record<string, readonly Readonly<Record<string, unknown>>[]>
    >;

    const expected: Row[] = [];
    const push = (step: Readonly<Record<string, unknown>>, scaffold: string | null): void => {
      const op = step['op'] as string;
      const from =
        op === 'generate'
          ? (step['template'] as string)
          : op === 'rewrite-path' || op === 'substitute'
            ? (step['in'] as readonly string[]).join(', ')
            : (step['from'] as string);
      expected.push({
        index: expected.length,
        op,
        from,
        to: (step['to'] as string | undefined) ?? null,
        scaffold,
      });
    };
    for (const step of base) push(step, null);
    // Scaffold order is `pack.json`'s, not the recipe object's key order:
    // the index a reader is shown must not depend on JSON key ordering.
    for (const s of bundled.pack.scaffolds ?? []) {
      for (const step of scaffoldSteps[s.id] ?? []) push(step, s.id);
    }

    assert.deepEqual(
      report.steps.map((s) => ({
        index: s.index,
        op: s.op as string,
        from: s.from,
        to: s.to,
        scaffold: s.scaffold,
      })),
      expected,
      `${bundled.name}: the report and recipe.json disagree about the plan`,
    );

    // And every declared step reaches the rendering — the completeness
    // half, which a deep-equal on a truncated list could not catch if the
    // truncation happened before the expectation was built.
    const lines = renderPackInfo(report);
    for (const row of expected) {
      assert.ok(
        lines.some((l) => l.includes(` ${row.op} `) && (row.to === null || l.includes(row.to))),
        `${bundled.name}: step ${String(row.index)} (${row.op}) is not rendered`,
      );
    }
  }
});

/* ── T-1903 — US-34, the recipe is the only route in ─────────────────── */

/**
 * **The applied tree is exactly the recipe's write set, and nothing
 * else** — asserted over every scaffold selection and both calibrations.
 *
 * This is US-34's core in its checkable form. If a file could reach a
 * project by any route other than a declared step, the write set would
 * not be the complete statement of what an apply does, and every
 * downstream property — `verify`'s recomputation, `update`'s
 * classification, `pack info`'s inspectability — would be a claim about a
 * subset of the tree.
 *
 * `.harness/` is excluded and asserted separately: phase 1 is a verbatim
 * copy of the payload, which is a different guarantee with a different
 * proof (`tests/integration/apply-verify.test.ts` owns it).
 */
test('every applied file comes from a declared step, in every selection', async () => {
  for (const spec of EVERY_SELECTION) {
    await withApplied([spec], async ([project]) => {
      const p = project as AppliedProject;
      assert.deepEqual(
        filesOnDisk(p.dir),
        appliedPaths(p),
        `${p.label}: the tree outside .harness/ must be exactly the recipe's write set`,
      );
    });
  }
});

/**
 * **No pack ships an install script, and none can ship a lifecycle hook.**
 *
 * Stated as an inventory rather than as a denylist of filenames, because
 * a denylist is a guess about what the next unwanted file would be called.
 * The product's entire non-Markdown, non-JSON surface is **four files**,
 * and three of them are `CLAUDE.md.template`. The fourth is `planning`'s
 * guard, which ships inert by design (US-26) and is the reason the
 * exception is named rather than the rule loosened.
 *
 * A packaging manifest is checked for separately and by absence: there is
 * no `package.json` anywhere under `packs/`, so there is no `postinstall`
 * — nor a `prepare`, `preinstall` or any other npm lifecycle key — and
 * no place for one to be added without this test seeing a new file.
 */
test('the product ships four non-Markdown files, no packaging manifest, and one shebang', async () => {
  const unusual: string[] = [];
  const manifests: string[] = [];
  const shebangs: string[] = [];

  for (const bundled of await allBundled()) {
    for (const rel of bundled.payload) {
      const path = `${bundled.name}/${rel}`;
      const base = rel.split('/').pop() ?? rel;

      if (base === 'pack.json' || base === 'recipe.json') continue;
      if (base.endsWith('.md')) continue;
      unusual.push(path);

      if (/^(package(-lock)?\.json|npm-shrinkwrap\.json|\.npmrc|Makefile|GNUmakefile|justfile)$/i.test(base)) {
        manifests.push(path);
      }
    }
    for (const rel of bundled.payload) {
      const bytes = readFileSync(join(bundled.dir, ...rel.split('/')));
      if (bytes.subarray(0, 2).toString('utf8') === '#!') shebangs.push(`${bundled.name}/${rel}`);
    }
  }

  assert.deepEqual(unusual.sort(), [
    'coding/CLAUDE.md.template',
    'planning/CLAUDE.md.template',
    'planning/hooks/kill-criteria-guard.sh',
    'writing/CLAUDE.md.template',
  ]);
  assert.deepEqual(manifests, [], 'a packaging manifest is a route into a project that is not a recipe');
  assert.deepEqual(
    shebangs,
    ['planning/hooks/kill-criteria-guard.sh'],
    'the only shebang in the product is the one file the packs declare inert',
  );
});

/**
 * **No applied file tells a reader to run anything.**
 *
 * The recipe is the only way a pack reaches a project, and that is a
 * security property rather than a convention: an instruction to run a
 * shipped script would route around every control the format has —
 * `executableRoots`, `E-EXEC-DEST-FORBIDDEN`, the pre-write disclosure,
 * the cap of 32 — by asking the *user* to do what the CLI refuses to.
 *
 * The form set is deliberately wide, and wider than the literal wordings
 * anyone deleted. F5 US-36 records why: a criterion written as *"grep for
 * `copy this folder`"* checked a phrasing rather than a rule, and **would
 * have passed against the pack before the strip it was written to
 * verify** — the single most useless property a check can have. So the
 * patterns below cover interpreter invocations, package-manager commands,
 * network-piped installs and relative script paths, and the enumerated
 * literals are a floor rather than the definition.
 *
 * Scoped to **applied-destined content**, over the produced tree of every
 * selection. A pack's own `README.md` is never applied and may
 * legitimately discuss what an apply does — that split is T-1603's and
 * T-1505's, and it is stated here so this test's silence about
 * `packs/<name>/README.md` reads as a scope decision rather than a gap.
 *
 * ── Two scoping decisions, both of which cost something ───────────────
 *
 * **Markdown only.** The rule is about *documentation telling a reader to
 * do something*, and the one applied file in the product that is not
 * documentation is `planning`'s guard — which is shell source and
 * therefore necessarily contains shell. Scanning it for "does this
 * instruct someone to run a command" is a category error; that it exists
 * and is inert is US-26's claim, held by `unenforced.test.ts`. The
 * exception is asserted rather than assumed, so a pack that started
 * shipping a *second* non-Markdown applied file would fail here.
 *
 * **A shell name needs a script-shaped target.** `bash`, `sh` and `pwsh`
 * also occur as ordinary words — `Bash` is a Claude Code tool name in
 * every agent's frontmatter — so a bare word match reports the tool
 * whitelist that is the pack's *safety* mechanism as if it were a
 * violation. The narrowing is real coverage lost: `run the deploy script`
 * with no filename would pass. The literal forms are a floor, not the
 * definition, and the widest form that does not report a correct pack is
 * the one worth keeping.
 */
test('no applied file instructs a reader to execute anything', async () => {
  const RUN_FORMS: readonly RegExp[] = [
    /\bchmod\b/i,
    /\bnpm (install|run|ci|exec)\b/i,
    /\bnpx[ \t]/i,
    /\b(yarn|pnpm)[ \t]+\w/i,
    /\bcurl\b/i,
    /\bwget\b/i,
    /\b(bash|zsh|sh|pwsh|powershell)[ \t]+[-\w./]*\.(sh|ps1|bash|zsh)\b/i,
    /(^|[\s(`])\.\/[\w.-]+\.(sh|ps1|py|js|mjs)\b/im,
    /\b(python3?|node)[ \t]+[\w./-]+\.(py|js|mjs)\b/i,
  ];

  const offences: string[] = [];
  const notMarkdown: string[] = [];

  for (const spec of EVERY_SELECTION) {
    await withApplied([spec], async ([project]) => {
      const p = project as AppliedProject;
      for (const path of appliedPaths(p)) {
        if (!path.endsWith('.md')) {
          if (!notMarkdown.includes(path)) notMarkdown.push(path);
          continue;
        }
        const text = readApplied(p, path).toString('utf8');
        for (const form of RUN_FORMS) {
          const hit = form.exec(text);
          if (hit !== null) offences.push(`${p.label} ${path}: ${hit[0].trim()}`);
        }
      }
    });
  }

  assert.deepEqual(offences, []);
  assert.deepEqual(
    notMarkdown,
    ['.claude/hooks/kill-criteria-guard.sh'],
    'the only non-Markdown file any bundled apply places is the declared-inert guard',
  );
});

/**
 * **No file in `packs/` carries an execute bit in the repository.**
 *
 * Belt to `executableRoots`' braces, and it catches a different mistake:
 * `chmod +x` on a pack file, committed. Phase 1 flattens every payload
 * file to `0644` regardless (F1 US-30), so such a bit would change no
 * applied mode — which is exactly why nothing else would report it, and
 * why a reviewer reading `git diff` would see a file that *looks*
 * runnable in the source tree.
 *
 * **POSIX only.** A Windows checkout has no mode bits to preserve, so the
 * assertion is about the repository as it exists on the platforms that
 * can express it.
 */
test('no pack file is committed executable', { skip: process.platform === 'win32' ? 'no POSIX modes' : false }, async () => {
  const { statSync } = await import('node:fs');
  const executable: string[] = [];
  for (const bundled of await allBundled()) {
    for (const rel of bundled.payload) {
      const mode = statSync(join(bundled.dir, ...rel.split('/'))).mode;
      if ((mode & 0o111) !== 0) executable.push(`${bundled.name}/${rel}`);
    }
  }
  assert.deepEqual(executable, []);
});

/* ── T-1904 — determinism, across packs ──────────────────────────────── */

/**
 * **Two applies of the same pack with the same answers produce
 * byte-identical trees and byte-identical manifests.**
 *
 * §NFR *Recipe purity*: no step reads a timestamp, an environment
 * variable, the network or the working directory, so the produced tree is
 * a pure function of (payload, answers, scaffold selection). This is the
 * property `verify` and `update` are both built on — the manifest holds
 * **no per-file hashes** (Q-43), so applied state is recomputed rather
 * than recorded, and a non-deterministic step would make every later
 * `verify` report drift that is not there.
 *
 * Asserted over the **whole** tree including `.harness/pack/`, and over
 * the manifest bytes, for all three packs and the one scaffold selection.
 * `apply-verify.test.ts` makes the same claim for `writing` alone; this
 * is it quantified over the product, which is what T-1904 asks for.
 *
 * **On three platforms.** CI runs macOS, Linux and Windows, and the
 * Windows leg is where the executable bit and CRLF normalisation actually
 * differ. The comparison here is raw bytes and no normalisation is
 * applied, deliberately: a produced tree that differed by line ending
 * between two applies *on one machine* would be a defect, and the
 * cross-platform question is a different one that the payload digest
 * answers over normalised content.
 */
test('two applies of one pack produce byte-identical trees and manifests', async () => {
  for (const spec of EVERY_SELECTION) {
    await withApplied([spec, spec], async ([first, second]) => {
      const a = first as AppliedProject;
      const b = second as AppliedProject;

      const listA = filesOnDisk(a.dir, true);
      assert.deepEqual(listA, filesOnDisk(b.dir, true), `${a.label}: the file lists differ`);

      const digest = (p: AppliedProject): string[] =>
        filesOnDisk(p.dir, true).map((path) => `${path} ${sha256(readApplied(p, path))}`);
      assert.deepEqual(digest(a), digest(b), `${a.label}: the trees differ`);

      assert.equal(a.plan.payloadDigest, b.plan.payloadDigest, `${a.label}: payloadDigest`);
      assert.equal(
        Buffer.compare(a.manifestBytes, b.manifestBytes),
        0,
        `${a.label}: the manifests differ`,
      );
    });
  }
});

/* ── T-1905 — planning's isolation NFR ───────────────────────────────── */

/**
 * **Switching `constraintFloor` changes the three calibrated files and
 * `calibration.md`, and moves nothing else.**
 *
 * `planning`'s two `when` steps are **the only conditional content in the
 * product** (Q-82 having removed the scaffold branches from `coding`), so
 * this is the one place in the three packs where a `when` bug could hide.
 * What such a bug looks like is worth naming, because none of it is loud:
 * a calibration copy whose destination differed by branch would add a
 * path to one tree and not the other; a `substitute` whose `in` globs
 * were too wide would write the answer into files that are supposed to be
 * identical; a mis-branched folder README would leave one calibration
 * with a folder nothing explains.
 *
 * The three calibrated files come from steps 6 and 7 — the mutually
 * exclusive `copy` pair — and `calibration.md` from step 21's
 * `substitute`, which writes the answer itself. **Four paths differ;
 * every other applied path is byte-identical**, and `.harness/pack/` is
 * identical too, because phase 1 is a verbatim copy that no answer
 * reaches.
 */
test('switching constraintFloor changes only the three calibrated files and calibration.md', async () => {
  await withApplied(
    [
      { name: 'planning', answers: new Map([['constraintFloor', 'high-floor']]) },
      { name: 'planning', answers: new Map([['constraintFloor', 'near-zero-floor']]) },
    ],
    async ([high, low]) => {
      const h = high as AppliedProject;
      const l = low as AppliedProject;

      // The path SET is identical: 32 applied paths under either answer.
      assert.deepEqual(appliedPaths(h), appliedPaths(l), 'no path may appear in one branch only');
      assert.equal(appliedPaths(h).length, 32, 'F5 §7b: 32 applied paths, the same 32 in both');

      const differing = appliedPaths(h).filter(
        (path) => Buffer.compare(readApplied(h, path), readApplied(l, path)) !== 0,
      );
      assert.deepEqual(differing, [
        'calibration.md',
        'portfolio/absorption-gate.md',
        'portfolio/cadence.md',
        'portfolio/horizons.md',
      ]);

      // Phase 1 is answer-independent, so the payload copy and its digest
      // are identical — which is what makes the manifest's single
      // `payloadDigest` correct for both calibrations.
      const payload = (p: AppliedProject): string[] =>
        filesOnDisk(p.dir, true)
          .filter((path) => path.startsWith('.harness/pack/'))
          .map((path) => `${path} ${sha256(readApplied(p, path))}`);
      assert.deepEqual(payload(h), payload(l), '.harness/pack/ must not vary by answer');
      assert.equal(h.plan.payloadDigest, l.plan.payloadDigest);

      // And the manifests differ in exactly the recorded answer.
      const manifestOf = (p: AppliedProject): Record<string, unknown> =>
        JSON.parse(p.manifestBytes.toString('utf8')) as Record<string, unknown>;
      const mh = manifestOf(h);
      const ml = manifestOf(l);
      assert.deepEqual(mh['parameters'], { constraintFloor: 'high-floor' });
      assert.deepEqual(ml['parameters'], { constraintFloor: 'near-zero-floor' });
      assert.deepEqual({ ...mh, parameters: null }, { ...ml, parameters: null });
    },
  );
});

/**
 * **The two `when` steps are the only conditional content in the
 * product** — the premise the test above rests on, asserted rather than
 * assumed.
 *
 * If a second pack gained a `when`, or `coding` regained a branch, the
 * isolation claim would still pass while covering a shrinking fraction of
 * the conditional surface. `declaration.test.ts` pins the same fact from
 * the parameter side; this states it as the scope of T-1905.
 */
test('planning holds the only conditional steps in the product', async () => {
  const conditional: string[] = [];
  for (const bundled of await allBundled()) {
    const declared = [
      ...bundled.recipe.steps,
      ...Object.values(bundled.recipe.scaffolds ?? {}).flat(),
    ];
    declared.forEach((step, i) => {
      if (step.when !== undefined) conditional.push(`${bundled.name} step ${String(i)}`);
    });
  }
  assert.deepEqual(conditional, ['planning step 5', 'planning step 6']);
});

/**
 * A guard on the file above rather than an assertion about a pack: every
 * bundled name this suite enumerates by hand is a name that exists.
 *
 * `EVERY_SELECTION` and `PACKS` are written out so that a fourth pack is
 * a visible edit. That trade only holds while the written list is checked
 * against the directory — otherwise a renamed pack would silently reduce
 * the gate's coverage to two.
 */
test('the hand-written selections cover every bundled pack', async () => {
  const names = (await allBundled()).map((b) => b.name);
  assert.deepEqual([...PACKS], names);
  assert.deepEqual([...new Set(EVERY_SELECTION.map((s) => s.name))].sort(), names);

  // And every declared scaffold in the product is exercised by one of
  // them, so "every scaffold selection" is a complete quantifier.
  const declared = (await allBundled()).flatMap((b) =>
    (b.pack.scaffolds ?? []).map((s) => `${b.name}/${s.id}`),
  );
  const exercised = EVERY_SELECTION.flatMap((s) =>
    (s.scaffolds ?? []).map((id) => `${s.name}/${id}`),
  );
  assert.deepEqual(declared, exercised);
});
