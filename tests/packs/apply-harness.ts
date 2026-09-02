/**
 * A real apply of a bundled pack into a real directory — shared by E-17,
 * E-18 and E-19.
 *
 * ── Why this exists, and why it is not a fixture ──────────────────────
 *
 * Every task in those three epics asks a question about the **produced
 * project** rather than about a declaration: *is a no-scaffold apply
 * usable*, *does the guard land `0644`*, *do two applies agree byte for
 * byte*, *does switching an answer move anything it should not*. None of
 * those is answerable from `recipe.json`, and none is answerable from a
 * fixture pack — the subject is the three packs that ship.
 *
 * So this module does what `tests/integration/apply-verify.test.ts` does,
 * once, and hands the result to three test files: `loadPack` →
 * `validateRecipe` → `resolveAnswers` → `selectScaffolds` → `planSteps` →
 * `planApply` → `executeApply`, into a fresh temporary directory.
 *
 * ── The manifest is assembled here, and that is a statement ───────────
 *
 * `lintel harness init` is F2's and still dispatches to a stub, so there
 * is no product code that composes a manifest yet. The one below is built
 * from the plan exactly as F1 §US-10 specifies it, and **T-1904's
 * byte-identity claim is therefore about `canonicalJson` over recomputed
 * inputs**, not about a command's output. When `init` lands, this
 * assembly should be replaced by a call to it rather than kept beside it:
 * two ways to build a manifest is two manifests.
 *
 * ── It is not a test file ─────────────────────────────────────────────
 *
 * `npm run test:packs` runs `dist-tests/packs/**\/*.test.js`, so this
 * module is compiled and imported but never collected as a suite. It
 * carries `assert` calls all the same: a helper that silently produced a
 * half-applied project would make every assertion downstream of it a
 * claim about nothing.
 */
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

import {
  atomicWrite,
  canonicalJson,
  executeApply,
  harnessPath,
  loadPack,
  packDir,
  parseStrictJson,
  planApply,
  planSteps,
  resolveAnswers,
  resolveRoot,
  selectScaffolds,
  validateRecipe,
  walk,
  type Answer,
  type ApplyPlan,
  type ExecuteResult,
  type PackJson,
  type PackManifest,
  type PayloadEntry,
  type Plan,
  type Recipe,
  type WritablePath,
} from '../../dist/index.js';

/** The CLI version every load and apply here runs at. All three packs
 *  declare `minCliVersion: "1.0.0"`, which `declaration.test.ts` asserts. */
export const CLI = '1.0.0';

/**
 * Minted through `harnessPath`, never cast.
 *
 * C-14's guarantee — *a path that skipped the gate is a compile error* —
 * holds only while nothing casts into the brand, and
 * `tests/structural/brands.test.ts` walks `tests/` as well as `src/` so
 * that a test cannot be the exception. This is a real constructor call
 * and it throws if the path stops being harness-owned.
 */
function harnessOwned(path: string): WritablePath {
  const h = harnessPath(path);
  if (h === undefined) throw new Error(`not harness-owned: ${path}`);
  return h;
}

export const codesOf = (bag: { readonly items: readonly { readonly code: string }[] }): string[] =>
  bag.items.map((d) => d.code);

/* ── loading ─────────────────────────────────────────────────────────── */

export interface BundledPack {
  readonly name: string;
  readonly pack: PackJson;
  /** Schema-validated: every step has narrowed to one of the six arms. */
  readonly recipe: Recipe;
  /** `recipe.json` as raw parsed JSON. Needed wherever a claim is about
   *  what the **file** holds rather than about what survived validation —
   *  T-1902's "the step list matches `recipe.json` exactly" is exactly
   *  that claim, and a typed read cannot make it. */
  readonly recipeRaw: Readonly<Record<string, unknown>>;
  /** Absolute path to the pack directory. */
  readonly dir: string;
  readonly payloadEntries: readonly PayloadEntry[];
  /** Pack-relative POSIX paths of every payload **file**. */
  readonly payload: readonly string[];
}

/**
 * Load one bundled pack, the way `validate` does.
 *
 * `skip: []` because a pack's payload is the whole directory: `walk`'s
 * default skip list is a scanner convenience, and a payload file it hid
 * would make every write set and every digest below quietly short. It is
 * the same argument `readPackPayload` makes in `src/validate/`.
 */
export async function loadBundled(name: string): Promise<BundledPack> {
  const { loaded, bag } = await loadPack(name, CLI);
  assert.deepEqual(codesOf(bag), [], `${name} must load with no diagnostic`);
  assert.ok(loaded, `${name} must load`);

  const parsed = parseStrictJson(loaded.recipeText, `${name}/recipe.json`, 'E-RECIPE-INVALID');
  assert.deepEqual(codesOf(parsed.bag), [], `${name}/recipe.json must parse`);
  assert.notEqual(parsed.value, undefined, `${name}/recipe.json must parse to a value`);
  const { recipe, bag: schemaBag } = validateRecipe(parsed.value!, name);
  assert.deepEqual(codesOf(schemaBag), [], `${name}/recipe.json must validate`);
  assert.ok(recipe, `${name}'s recipe must validate`);

  const dir = fileURLToPath(packDir(name));
  const walked = await walk(dir, { skip: [] });
  assert.equal(walked.truncated, false, `${name}: the payload walk must be complete`);

  return {
    name,
    pack: loaded.pack,
    recipe,
    recipeRaw: parsed.value as unknown as Readonly<Record<string, unknown>>,
    dir,
    payloadEntries: walked.entries.map((e) => ({ path: e.path, kind: e.kind, size: e.size })),
    payload: walked.entries.filter((e) => e.kind === 'file').map((e) => e.path),
  };
}

/** The three bundled packs, in name order, loaded once per call. */
export async function allBundled(): Promise<readonly BundledPack[]> {
  return Promise.all(['coding', 'planning', 'writing'].map(loadBundled));
}

/**
 * The answers an unattended apply supplies.
 *
 * A `required` parameter has no default by definition, so an apply must
 * answer it; leaving one unanswered raises `E-PARAM-MISSING`, and that
 * would be **the test's fault rather than the pack's**. Caller-supplied
 * answers win; anything still unanswered gets a demo value.
 */
export function demoAnswers(
  pack: PackJson,
  supplied: ReadonlyMap<string, Answer> = new Map(),
): Map<string, Answer> {
  const out = new Map<string, Answer>(supplied);
  for (const p of pack.parameters ?? []) {
    if (p.required !== true || out.has(p.id)) continue;
    out.set(
      p.id,
      p.type === 'boolean' ? true : p.type === 'enum' ? (p.values ?? [''])[0]! : 'Demo Project',
    );
  }
  return out;
}

/* ── applying ────────────────────────────────────────────────────────── */

export interface ApplySpec {
  readonly name: string;
  /** Scaffold ids to select. Omitted ⇒ none, which is what a bare
   *  `lintel harness init <pack>` does. */
  readonly scaffolds?: readonly string[];
  /** Answers to force. Anything omitted is filled by `demoAnswers`. */
  readonly answers?: ReadonlyMap<string, Answer>;
}

export interface AppliedProject {
  readonly name: string;
  /** `<pack>[<scaffolds> <answers>]`, for assertion messages. */
  readonly label: string;
  /** The project root on disk. Removed when `withApplied` returns. */
  readonly dir: string;
  readonly bundled: BundledPack;
  readonly scaffolds: readonly string[];
  readonly answers: ReadonlyMap<string, Answer>;
  readonly steps: Plan;
  readonly plan: ApplyPlan;
  /** The manifest exactly as it was written to `.harness/manifest.json`. */
  readonly manifestBytes: Buffer;
  readonly result: ExecuteResult;
}

async function applyInto(spec: ApplySpec, dir: string): Promise<AppliedProject> {
  const bundled = await loadBundled(spec.name);
  const scaffolds = spec.scaffolds ?? [];

  const answersIn = demoAnswers(bundled.pack, spec.answers ?? new Map());
  const { answers, bag: answerBag } = resolveAnswers(bundled.pack.parameters, answersIn);
  assert.deepEqual(codesOf(answerBag), [], `${spec.name}: the answers must resolve`);

  const { selected, bag: scaffoldBag } = selectScaffolds(bundled.pack, scaffolds);
  assert.deepEqual(codesOf(scaffoldBag), [], `${spec.name}: the scaffold selection must be valid`);

  const steps = planSteps({
    pack: bundled.pack,
    recipe: bundled.recipe,
    selected,
    answers,
    payload: bundled.payload,
  });
  assert.deepEqual(codesOf(steps.bag), [], `${spec.name}: the step plan must be clean`);

  const plan = await planApply({
    packName: spec.name,
    packVersion: bundled.pack.version,
    cliVersion: CLI,
    payloadEntries: bundled.payloadEntries,
    readPayload: (p) => {
      try {
        return readFileSync(join(bundled.dir, ...p.split('/')));
      } catch {
        return null;
      }
    },
    phase2: { steps: steps.steps, answers },
    // A fresh temporary directory: nothing pre-exists, so the probe is
    // total and returns nothing. An occupied destination is US-13's case
    // and belongs to the integration suite, not here.
    probe: () => null,
  });
  assert.deepEqual(
    codesOf(plan.bag),
    [],
    `${spec.name}: ${plan.bag.items.map((d) => d.message).join('\n')}`,
  );

  const manifest = {
    manifestVersion: 1,
    cli: CLI,
    pack: {
      name: spec.name,
      version: bundled.pack.version,
      formatVersion: bundled.pack.formatVersion,
    },
    payloadDigest: plan.payloadDigest,
    parameters: Object.fromEntries(answers),
    // Pack-declared order, so `update` recomputes the same step set.
    scaffolds: (bundled.pack.scaffolds ?? [])
      .map((s) => s.id)
      .filter((id) => scaffolds.includes(id)),
  } as unknown as PackManifest;
  const manifestBytes = Buffer.from(canonicalJson(manifest), 'utf8');

  const { root } = await resolveRoot(dir);
  assert.ok(root, `${dir} must resolve as a project root`);

  const result = await executeApply({
    root,
    command: 'init',
    files: plan.files,
    manifest: { path: harnessOwned('.harness/manifest.json'), bytes: manifestBytes },
    writeJournal: async (journal) => {
      await atomicWrite(dir, {
        command: 'init',
        path: harnessOwned('.harness/journal.json'),
        bytes: Buffer.from(JSON.stringify(journal), 'utf8'),
        mode: 0o644,
        expectNew: false,
      });
    },
    removeJournal: async () => {
      await rm(join(dir, '.harness', 'journal.json'), { force: true });
    },
    readExisting: async () => null,
  });
  assert.deepEqual(
    codesOf(result.bag),
    [],
    `${spec.name}: ${result.bag.items.map((d) => d.message).join('\n')}`,
  );
  assert.equal(result.complete, true, `${spec.name}: the apply must complete`);

  const answerLabel = [...answers].map(([k, v]) => `${k}=${String(v)}`).join(',');
  return {
    name: spec.name,
    label: `${spec.name}[${scaffolds.join('+') || 'no scaffold'}${answerLabel ? ` ${answerLabel}` : ''}]`,
    dir,
    bundled,
    scaffolds,
    answers,
    steps,
    plan,
    manifestBytes,
    result,
  };
}

/**
 * Apply one or more packs into fresh temporary directories, run `body`,
 * and remove them.
 *
 * Several tasks need **two** applies alive at once — T-1904's determinism
 * pair and T-1905's two calibrations — so this takes a list rather than a
 * single spec, and a one-element list is the ordinary case.
 */
export async function withApplied<T>(
  specs: readonly ApplySpec[],
  body: (projects: readonly AppliedProject[]) => Promise<T> | T,
): Promise<T> {
  const dirs: string[] = [];
  try {
    const projects: AppliedProject[] = [];
    for (const spec of specs) {
      const dir = await mkdtemp(join(tmpdir(), `lintel-${spec.name}-`));
      dirs.push(dir);
      projects.push(await applyInto(spec, dir));
    }
    return await body(projects);
  } finally {
    for (const dir of dirs) await rm(dir, { recursive: true, force: true });
  }
}

/* ── reading the produced project ────────────────────────────────────── */

/** `.harness/` is the tool's, not the pack's. Every claim about "the
 *  applied tree" in F5 is about what is outside it. */
export const HARNESS_DIR = '.harness';

/** Every file on disk under `dir`, as project-relative POSIX paths,
 *  sorted. The payload copy under `.harness/` is included only on
 *  request — most claims here are about what the recipe produced. */
export function filesOnDisk(dir: string, includeHarness = false): string[] {
  const out: string[] = [];
  const walkDir = (rel: string): void => {
    for (const entry of readdirSync(rel === '' ? dir : join(dir, ...rel.split('/')), {
      withFileTypes: true,
    })) {
      const next = rel === '' ? entry.name : `${rel}/${entry.name}`;
      if (!includeHarness && next.split('/')[0] === HARNESS_DIR) continue;
      if (entry.isDirectory()) walkDir(next);
      else out.push(next);
    }
  };
  walkDir('');
  return out.sort();
}

/** The phase-2 destinations the plan produced, sorted. This is the
 *  recipe's write set as it reached disk. */
export function appliedPaths(project: AppliedProject): string[] {
  return project.plan.files
    .filter((f) => f.phase === 2)
    .map((f) => String(f.path))
    .sort();
}

export function readApplied(project: AppliedProject, path: string): Buffer {
  return readFileSync(join(project.dir, ...path.split('/')));
}

/**
 * The permission bits of an applied path.
 *
 * **Meaningful on POSIX only.** Windows has no mode bits to report and
 * Node synthesises them, so every caller guards on `posixModes` rather
 * than asserting a number that means nothing on one of the three
 * platforms CI runs. T-1904 says "modulo the executable bit" for the same
 * reason.
 */
export function modeOnDisk(dir: string, path: string): number {
  return statSync(join(dir, ...path.split('/'))).mode & 0o777;
}

export const posixModes = process.platform !== 'win32';

/** The set of directories an apply brings into being, derived from its
 *  write set — every proper prefix of every applied path. */
export function createdDirectories(paths: readonly string[]): string[] {
  const dirs = new Set<string>();
  for (const p of paths) {
    const parts = p.split('/');
    for (let i = 1; i < parts.length; i++) dirs.add(parts.slice(0, i).join('/'));
  }
  return [...dirs].sort();
}
