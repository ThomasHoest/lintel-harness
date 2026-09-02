/**
 * `validate` — the fourteen-step ordered check runner. T-0901, US-16.
 *
 * ── The order is the contract ─────────────────────────────────────────
 *
 * A pack fails on the **earliest and most explicable cause** rather than
 * on whichever check happened to run first. **The step list is US-16's and
 * is not copied here** — four other documents cite it, and a second copy
 * is a second thing to keep true. What is recorded here is only what this
 * module decides that US-16 does not spell out.
 *
 * Diagnostics are emitted in step order, and the bag is append-only, so
 * the output order **is** the check order a reader is following.
 *
 * ── Stage 3 of confinement is deliberately absent ─────────────────────
 *
 * `validate` has **no project root**, so resolution confinement is not in
 * the list and cannot be. That absence is the property that makes a pack
 * checkable in CI with nothing checked out, which is what makes the
 * authoring-time rules the high-value half of the security model.
 *
 * ── Where this module routes another module's bag ─────────────────────
 *
 * `planSteps` computes the write set, the sources and the collisions in
 * one pass — correctly, since the write set must be computed once and the
 * collision rule reads it. Its bag therefore spans three US-16 steps, and
 * this module **partitions it by code** into slots 5, 6 and 10:
 *
 *   `E-RECIPE-SOURCE-MISSING`  → step 5, step sources
 *   `E-MAP-*`                  → step 6, destination safety
 *   `E-RECIPE-STEP-INVALID`    → step 10, where US-16 puts the
 *                                pack.json/recipe.json disagreement
 *
 * The partition preserves the reporting order the contract is about. It is
 * a routing decision, not a rule: every code above is raised by the module
 * that owns the rule, and none is raised here.
 *
 * ── Spec gaps found while building this, recorded and not papered over ─
 *
 *  1. **US-16 says the write set is computed "exactly once, immediately
 *     after step 5"**, which — read as one set merged across `when`
 *     branches — reports three false `E-MAP-COLLISION`s against
 *     `planning`, whose two `calibrations/<floor>/` copies write the same
 *     three applied paths under mutually exclusive conditions. The sweep
 *     therefore plans **per combination** and this runner consumes the
 *     union; see `combinations.ts`.
 *  2. **Step 11 renders, and rendering needs answers US-16 names no
 *     source for.** `coding` and `writing` declare `required` substitution
 *     parameters that appear in no `when`, so they are on no combination
 *     axis and yet must hold a value or every render fails
 *     `E-SUBST-UNRESOLVED`. `combinations.ts` synthesises one.
 *  3. **`W-PATH-NON-NFC` has no emitter and no reachable occasion.** Its
 *     message says an applied path *"has been normalized"*, but
 *     `confinePath` refuses a non-NFC name outright as
 *     `E-MAP-PATH-GRAMMAR`. US-16 lists the code among the defects a bare
 *     `--all` would let accumulate, so one of the two is wrong; neither is
 *     changed here.
 *  4. **`E-PACK-CLI-TOO-OLD` is in none of the fourteen steps.**
 *     `checkCliFloor` exists and its own header says `validate` and
 *     `pack info` must be able to report on a pack this CLI cannot apply —
 *     but US-16's order is the contract and names no step for it, so this
 *     runner does not raise it. `pack info` reports `minCliVersion` and a
 *     reader compares.
 */
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { DiagnosticBag, type Diagnostic } from '../diag/diagnostic.js';
import { parseStrictJson } from '../json/parse-strict.js';
import { checkAnatomy, type AnatomyRow } from '../pack/anatomy.js';
import { loadPack, type LoadedPack } from '../pack/load-pack.js';
import { checkParameterSet, checkWhenParameters } from '../pack/parameters.js';
import { checkScaffoldCollisions } from '../pack/scaffolds.js';
import { validateRecipe } from '../recipe/schema.js';
import {
  checkExecutableCap,
  checkExecutablePaths,
  checkExecutableRoots,
} from '../recipe/executable.js';
import { isEditing, type Recipe, type RecipeOp, type StepWhen } from '../recipe/types.js';
import { OPS } from '../recipe/ops/index.js';
import { planPayloadCopy, type PayloadEntry } from '../payload/copy-payload.js';
import { checkPayloadClaudeFiles, checkRenderedClaudeFiles } from '../security/claude-gate.js';
import { buildDisclosure, scanForForgery, type SecurityDisclosure } from '../security/consent.js';
import { isClaudeHookFile } from '../security/claude-frontmatter.js';
import { decodeText } from '../hash/normalize.js';
import { walk, MAX_DEPTH } from '../fs/walk.js';
import {
  declaredSteps,
  parameterVaryingSteps,
  planCombinations,
  renderCombination,
  whenValues,
  type CombinationRender,
  type DeclaredStep,
  type VaryingStep,
} from './combinations.js';
import { DEFAULT_FOLDER_README, checkFolderReadmes } from './folder-readmes.js';
import { checkLinkIntegrity, isMarkdown, type RenderedDoc } from './link-integrity.js';
import type { AppliedPath } from '../security/confine.js';
import type { PackJson, ParameterDecl } from '../pack/types.js';

/* ── the report ──────────────────────────────────────────────────────── */

/** A recipe step as `pack info` renders it: `<op>  <from> → <to>`.
 *
 *  For the two editing primitives `from` carries the **`in` globs** and
 *  `to` is `null`: they have no `to` at all, which is the whole reason the
 *  write set exists as a named concept (C-19), and a summary printing two
 *  blanks for them would hide the steps that change a file's bytes after
 *  it was placed. */
export interface StepSummary {
  readonly index: number;
  readonly op: RecipeOp;
  readonly from: string | null;
  readonly to: string | null;
  /** `null` ⇒ a base step. */
  readonly scaffold: string | null;
  readonly when: StepWhen | null;
}

export interface ScaffoldSummary {
  readonly id: string;
  readonly category: string | null;
  readonly description: string;
  readonly steps: number;
}

/**
 * The one report both surfaces render.
 *
 * `validate --json` emits it and `pack info` renders it, so **there is
 * exactly one report code path and the two cannot disagree** (US-29). That
 * is a structural claim, not a convention: `pack-info.ts` imports this
 * type and computes no row of its own.
 */
export interface PackReport {
  readonly pack: {
    readonly name: string;
    readonly version: string;
    readonly title: string;
    readonly formatVersion: number;
    readonly minCliVersion: string;
  };
  /** Exactly nine, in `AnatomyPartId` order. */
  readonly anatomy: readonly AnatomyRow[];
  readonly scaffolds: readonly ScaffoldSummary[];
  readonly parameters: readonly ParameterDecl[];
  /** The complete declared plan, before applying anything. */
  readonly steps: readonly StepSummary[];
  readonly parameterVaryingSteps: readonly VaryingStep[];
  readonly combinations: number;
  /** Q-50. What step 12 checked against, and what `pack info` names. */
  readonly folderReadme: string;
  readonly disclosure: SecurityDisclosure;
  readonly diagnostics: readonly Diagnostic[];
  /** No **error** was raised. `--strict` promotes defects to exit 1 and
   *  does not change this: `ok` is a fact about the pack, and the exit
   *  code is a fact about the run. */
  readonly ok: boolean;
}

/* ── the payload, read once ──────────────────────────────────────────── */

export interface PackPayload {
  /** Walk output reduced to what `planPayloadCopy` needs. */
  readonly entries: readonly PayloadEntry[];
  /** Bytes of every payload **file**, by pack-relative POSIX path. */
  readonly bytes: ReadonlyMap<string, Buffer>;
  /** True iff a bound stopped the walk. `entries` is then partial. */
  readonly truncated: boolean;
}

/**
 * Read a pack directory into a payload.
 *
 * **Reads; never copies.** T-0605 owns the copy, phase 1's fixed modes and
 * the destinations; this is the read `validate` needs in order to check a
 * pack it will not apply.
 *
 * Symlinks are collected by re-reading each directory the walk already
 * found, rather than by a second traversal: `walk` reports a skipped link
 * as `W-SCAN-SYMLINK-SKIPPED` with the path **only inside the rendered
 * message**, so no consumer can recover it from the bag — and
 * `E-SYMLINK-IN-PACK` needs the path. The re-read follows nothing
 * (`readdir` does not) and is bounded by the directory set the bounded
 * walk produced.
 */
export async function readPackPayload(dir: URL): Promise<PackPayload> {
  const root = fileURLToPath(dir);
  // `skip: []` — a pack shipping `node_modules/` is content, and the
  // reserved-destination denylist is what refuses it, not the walk.
  const walked = await walk(root, { skip: [] });

  const symlinks = await symlinkPaths(root, walked.entries);
  const bytes = new Map<string, Buffer>();
  const entries: PayloadEntry[] = [];

  for (const e of walked.entries) {
    if (symlinks.has(e.path)) continue; // added below, once, as a link
    entries.push({ path: e.path, kind: e.kind, size: e.size });
    if (e.kind !== 'file') continue;
    try {
      bytes.set(e.path, await readFile(`${root}/${e.path}`));
    } catch {
      // Unreadable is not a walk fault and not a payload fault this
      // module can name; the file simply contributes no bytes, and every
      // step naming it reports `E-RECIPE-SOURCE-MISSING`.
    }
  }
  for (const path of symlinks) entries.push({ path, kind: 'file', size: 0, symlink: true });

  return { entries, bytes, truncated: walked.truncated };
}

/** Symlink paths under `root`, by re-reading the directories the walk
 *  found. The root itself is included; `walk` returns entries relative to
 *  it and does not list it. */
async function symlinkPaths(
  root: string,
  entries: readonly { path: string; kind: 'file' | 'dir' }[],
): Promise<ReadonlySet<string>> {
  const out = new Set<string>();
  const dirs = ['', ...entries.filter((e) => e.kind === 'dir').map((e) => e.path)];
  for (const rel of dirs) {
    // The walk is bounded to `MAX_DEPTH`, so this cannot outrun it; the
    // guard is stated rather than inherited because the two loops are in
    // different modules.
    if (rel.split('/').length > MAX_DEPTH) continue;
    let dirents;
    try {
      dirents = await readdir(rel === '' ? root : `${root}/${rel}`, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const d of dirents) {
      if (d.isSymbolicLink()) out.add(rel === '' ? d.name : `${rel}/${d.name}`);
    }
  }
  return out;
}

/* ── the runner ──────────────────────────────────────────────────────── */

export interface ValidatePackInput {
  readonly loaded: LoadedPack;
  /** `loadPack`'s diagnostics — US-16 **step 1**, `pack.json`'s strict
   *  parse and schema, which `loadPack` already ran. Passed in rather than
   *  re-run: a second parse is a second answer. */
  readonly loadBag?: DiagnosticBag;
  readonly payload: PackPayload;
  readonly cliVersion: string;
}

export function validatePack(input: ValidatePackInput): PackReport {
  const { loaded, payload, cliVersion } = input;
  const pack: PackJson = loaded.pack;
  const bag = new DiagnosticBag();

  const payloadPaths = payload.entries
    .filter((e) => e.kind === 'file' && e.symlink !== true)
    .map((e) => e.path);
  const folderReadme = pack.folderReadme ?? DEFAULT_FOLDER_README;

  /* 1 — pack.json schema, strict parse first. Already run by `loadPack`. */
  for (const d of input.loadBag?.items ?? []) bag.push(d);

  /* 2 — anatomy completeness. */
  const anatomy = checkAnatomy(pack, payloadPaths);
  for (const d of anatomy.bag.items) bag.push(d);

  /* 3 — payload integrity, plus the `.claude` gate's PAYLOAD quantifier. */
  const copyPlan = planPayloadCopy(pack.name, payload.entries, payload.truncated);
  for (const d of copyPlan.bag.items) bag.push(d);
  for (const d of checkPayloadClaudeFiles(
    copyPlan.copies.flatMap((c) => {
      const b = payload.bytes.get(c.from);
      return b === undefined ? [] : [{ destination: c.to, bytes: b }];
    }),
  ).items) {
    bag.push(d);
  }

  /* 4 — recipe schema, strict parse first. */
  const recipeFile = `${pack.name}/${loaded.recipePath}`;
  const parsed = parseStrictJson(loaded.recipeText, recipeFile, 'E-RECIPE-INVALID');
  for (const d of parsed.bag.items) bag.push(d);

  let recipe: Recipe | undefined;
  if (parsed.value !== undefined) {
    const validated = validateRecipe(parsed.value, pack.name, recipeFile);
    for (const d of validated.bag.items) bag.push(d);
    recipe = validated.recipe;
  }

  // Without a recipe there is no plan, no write set, no render and no
  // disclosure. Report what steps 1–4 found and stop — **a partially
  // planned pack is the shape that lets a later stage reason about half a
  // declaration**, which is the rule `loadPack` and `validateRecipe` both
  // already follow by returning no value on any fault.
  if (recipe === undefined) {
    return report(pack, anatomy.rows, [], [], [], 0, folderReadme, emptyDisclosure(), bag);
  }

  const declared = declaredSteps(pack, recipe);

  /* 5–8 — the plan. The write set is computed here, by `planSteps`, and
     steps 6, 7 and 8 all read it. */
  const sweep = planCombinations({ pack, recipe, payload: payloadPaths });

  const planBag: Diagnostic[] = [];
  for (const { plan } of sweep.plans) planBag.push(...plan.bag.items);

  /* 5 — step sources. */
  for (const d of dedupe(planBag.filter((d) => d.code === 'E-RECIPE-SOURCE-MISSING'))) bag.push(d);

  /* 6 — destination safety, US-3 stages 1 and 2, over the write set. */
  for (const d of dedupe(planBag.filter((d) => d.code.startsWith('E-MAP-')))) bag.push(d);

  // The union of every combination's write set, in first-seen order. Steps
  // 7 and 8 are per-path facts, so the union answers them exactly.
  const unionWrites: AppliedPath[] = [];
  const seenWrite = new Set<string>();
  for (const { plan } of sweep.plans) {
    for (const p of plan.written) {
      if (seenWrite.has(p)) continue;
      seenWrite.add(p);
      unionWrites.push(p);
    }
  }

  /* 7 — executable declarations. */
  const roots = pack.executableRoots ?? [];
  for (const d of checkExecutableRoots(roots).items) bag.push(d);
  const executables = new Set<string>();
  const execBag: Diagnostic[] = [];
  for (const { plan } of sweep.plans) {
    for (const planned of plan.steps) {
      if ((planned.step as { executable?: boolean }).executable !== true) continue;
      for (const p of planned.writeSet) executables.add(p);
      execBag.push(...checkExecutablePaths(planned.writeSet, roots, planned.index).items);
    }
  }
  for (const d of dedupe(execBag)) bag.push(d);
  for (const d of checkExecutableCap(executables.size).items) bag.push(d);

  /* 8 — hook-script disclosure. `notice` class: shipping an inert 0644
     hook is permitted and intended, and no author change would clear it. */
  for (const path of unionWrites) {
    if (isClaudeHookFile(path)) bag.add('W-HOOK-SCRIPT-INERT', { path, values: { path } });
  }

  /* 9 — parameter declarations. */
  for (const d of checkParameterSet(pack).items) bag.push(d);
  for (const d of checkWhenParameters(pack, whenValues(pack, recipe)).items) bag.push(d);

  /* 10 — scaffold declarations, and the pack.json/recipe.json mismatch. */
  const perScaffold = new Map<string, AppliedPath[]>();
  for (const { plan } of sweep.plans) {
    for (const planned of plan.steps) {
      if (planned.scaffold === null) continue;
      const into = perScaffold.get(planned.scaffold) ?? [];
      into.push(...planned.writeSet);
      perScaffold.set(planned.scaffold, into);
    }
  }
  for (const d of checkScaffoldCollisions(pack, perScaffold).items) bag.push(d);
  for (const d of dedupe(planBag.filter((d) => d.code === 'E-RECIPE-STEP-INVALID'))) bag.push(d);

  /* 11 — the per-combination render, and the `.claude` gate's WRITE-SET
     quantifier. `E-PARAM-COMBINATORICS` is the sweep's own. */
  for (const d of sweep.bag.items) bag.push(d);

  const renders: CombinationRender[] = sweep.plans.map((p) =>
    renderCombination(p, {
      packName: pack.name,
      packVersion: pack.version,
      cliVersion,
      payload: payloadPaths,
      readPayload: (p2) => payload.bytes.get(p2) ?? null,
    }),
  );

  const renderBag: Diagnostic[] = [];
  for (const r of renders) {
    renderBag.push(...r.bag.items);
    renderBag.push(...checkRenderedClaudeFiles(r.writes.map((w) => ({ path: w.path, bytes: w.bytes }))).items);
  }
  for (const d of dedupe(renderBag)) bag.push(d);

  /* 12 — folder READMEs, per combination separately. */
  for (const r of renders) {
    for (const d of checkFolderReadmes({
      packName: pack.name,
      basename: folderReadme,
      paths: r.writes.map((w) => w.path),
      combination: r.combination.label,
    }).items) {
      bag.push(d);
    }
  }

  /* 13 — link integrity, over rendered output, per combination. */
  const linkBag: Diagnostic[] = [];
  for (const r of renders) {
    linkBag.push(
      ...checkLinkIntegrity({
        docs: markdownDocs(r),
        produced: r.writes.map((w) => w.path),
        payload: payloadPaths,
      }).items,
    );
  }
  for (const d of dedupe(linkBag)) bag.push(d);

  /* 14 — the disclosure, over ALL combinations. Raises nothing: it is
     what an apply would show, built here so `pack info`, `validate --json`
     and `init`'s pre-write summary render one object. */
  const disclosure = buildDisclosure({
    writes: dedupeBy(
      renders.flatMap((r) => r.writes.map((w) => ({ path: w.path, mode: w.mode, from: w.from, bytes: w.bytes }))),
      (w) => w.path,
    ),
    payload: copyPlan.copies.flatMap((c) => {
      const b = payload.bytes.get(c.from);
      return b === undefined ? [] : [{ packPath: c.from, destination: c.to, bytes: b }];
    }),
    substitutions: dedupeBy(
      renders.flatMap((r) => r.substitutions),
      (s) => `${s.path} ${s.id} ${s.value}`,
    ),
  });

  /* 11 (concluded) — the disclosure containment check.
     `E-DISCLOSURE-FORGERY`, exit 2.

     **T-0806: `validate` runs the same refusal at step 11 over the
     rendered set, and there is no fifteenth step.** It is raised here
     rather than earlier only because the disclosure it scans is the object
     built directly above — the same one `init` shows and `pack info`
     renders — and scanning a separately assembled copy would be scanning
     something no user ever sees.

     **Why it has to be in `validate` and not only in `init`.** The check
     closes the CRITICAL that took four Mode A rounds: a pack whose
     content carries a line that would end the disclosure block can make a
     reader believe the disclosure finished before the interesting rows.
     `init` refuses such a pack — but `validate` is what a pack **author**
     runs, and what CI runs **before anybody applies it**. Without it here,
     `validate --all --strict` exits 0 on a pack `init` will refuse, which
     is the gate giving a clean bill for something it never checked.

     No nonce is passed. `buildDisclosure` is deterministic and nonce-free
     by design (C-62), so `pack info --json` stays byte-identical across
     runs; the shape rule is the half that does not depend on a per-run
     value, and it is the half that applies to a pack sitting in a
     repository rather than to one being applied. */
  for (const d of scanForForgery(disclosure).items) bag.push(d);

  return report(
    pack,
    anatomy.rows,
    summariseSteps(declared),
    summariseScaffolds(pack, recipe),
    parameterVaryingSteps(declared, sweep.plans),
    sweep.count,
    folderReadme,
    disclosure,
    bag,
  );
}

/* ── loading a bundled pack and validating it ────────────────────────── */

export interface ValidateResult {
  /** Absent iff the pack could not be loaded far enough to report on —
   *  an unknown name, an unreadable or unusable `pack.json`. */
  readonly report?: PackReport;
  readonly bag: DiagnosticBag;
}

/**
 * Validate one bundled pack by name.
 *
 * The **only** filesystem entry point in this feature's validation path,
 * and it resolves through `paths.ts` — install-relative, never
 * `process.cwd()`, because a project placing a `packs/` directory of its
 * own would otherwise shadow the bundled packs and walk arbitrary content
 * in through the one input F1 treats as trusted.
 */
export async function validatePackByName(
  name: string,
  cliVersion: string,
): Promise<ValidateResult> {
  const { loaded, bag } = await loadPack(name, cliVersion);
  if (loaded === undefined) return { bag };
  const payload = await readPackPayload(loaded.dir);
  return { report: validatePack({ loaded, loadBag: bag, payload, cliVersion }), bag };
}

/* ── helpers ─────────────────────────────────────────────────────────── */

function markdownDocs(render: CombinationRender): readonly RenderedDoc[] {
  const out: RenderedDoc[] = [];
  for (const w of render.writes) {
    if (!isMarkdown(w.path)) continue;
    const text = decodeText(w.bytes);
    if (text === null) continue; // binary: nothing to read a link out of.
    out.push({ path: w.path, text });
  }
  return out;
}

function summariseSteps(declared: readonly DeclaredStep[]): readonly StepSummary[] {
  return declared.map(({ index, step, scaffold }) => {
    const field = OPS[step.op].sourceField;
    const from = isEditing(step.op)
      ? (step as { in: readonly string[] }).in.join(', ')
      : field === null
        ? null
        : ((step as unknown as Record<string, string>)[field] ?? null);
    const to = (step as { to?: string }).to ?? null;
    return { index, op: step.op, from, to, scaffold, when: step.when ?? null };
  });
}

function summariseScaffolds(pack: PackJson, recipe: Recipe): readonly ScaffoldSummary[] {
  return (pack.scaffolds ?? []).map((s) => ({
    id: s.id,
    category: s.category ?? null,
    description: s.description,
    steps: recipe.scaffolds?.[s.id]?.length ?? 0,
  }));
}

/** Identical findings from two combinations are one finding. Keyed on
 *  everything a reader can see, so two genuinely different findings that
 *  render alike are still two. */
function dedupe(items: readonly Diagnostic[]): readonly Diagnostic[] {
  return dedupeBy(items, (d) => `${d.code} ${d.message} ${d.path ?? ''} ${d.line ?? ''}`);
}

function dedupeBy<T>(items: readonly T[], key: (t: T) => string): readonly T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const k = key(item);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(item);
  }
  return out;
}

const emptyDisclosure = (): SecurityDisclosure => ({
  executables: [],
  inertHooks: [],
  substitutions: [],
  agents: [],
});

function report(
  pack: PackJson,
  anatomy: readonly AnatomyRow[],
  steps: readonly StepSummary[],
  scaffolds: readonly ScaffoldSummary[],
  varying: readonly VaryingStep[],
  combinations: number,
  folderReadme: string,
  disclosure: SecurityDisclosure,
  bag: DiagnosticBag,
): PackReport {
  return {
    pack: {
      name: pack.name,
      version: pack.version,
      title: pack.title,
      formatVersion: pack.formatVersion,
      minCliVersion: pack.minCliVersion,
    },
    anatomy,
    scaffolds,
    parameters: pack.parameters ?? [],
    steps,
    parameterVaryingSteps: varying,
    combinations,
    folderReadme,
    disclosure,
    diagnostics: bag.items,
    ok: bag.errors.length === 0,
  };
}
