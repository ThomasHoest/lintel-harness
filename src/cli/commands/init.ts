/**
 * `lintel harness init <pack>` — the apply engine's CLI surface.
 * T-2001, T-2101…T-2106. `F2-ADR-003` §1.
 *
 * ── This command adds no engine code, and its size is the evidence ────
 *
 * argv → `ApplyInputs` → `planApply()` → the disclosure → `executeApply()`
 * → a summary. Every transformation, every check and every byte written
 * belongs to F1. **If a rule can be stated about an apply, it is F1's and
 * this file does not restate it** — the failure mode this shape refuses is
 * a command that grows a little resolution logic, then a little
 * validation, then a fallback, until the engine's guarantees stop being
 * the whole story.
 *
 * ── `runInit` returns an exit code and never calls `process.exit` ──────
 *
 * Not a style preference. F2's acceptance tests assert exit classes **and
 * zero-bytes-written** on the failure paths, and a command that exits the
 * process can do neither in-process.
 *
 * ── The order is F1 §F1.6's twelve steps, and none is added ───────────
 *
 *   pass 1  group, command, known flags, `<pack>`; every other token
 *           DEFERRED and never judged
 *    1  `.harness/` present?  journal → E-JOURNAL-PRESENT (2)
 *                             otherwise → E-ALREADY-APPLIED (1)
 *    2  resolve `<pack>`; minCliVersion, pack/recipe formatVersion
 *   pass 2  re-parse with the pack's aliases; **only now** may a token be
 *           E-CLI-UNKNOWN-FLAG. Fail-closed here
 *    3  validate — see the recorded gap below
 *    4  answers; scaffold selection
 *    5  `realpath` of the project root, resolved ONCE
 *    6  `planApply()` — the only read of the bundled pack
 *       print the disclosure                                     0 bytes
 *   ───────────────────── the gate closes here ─────────────────────────
 *    7  take `.harness/lock`
 *    8  journal (v3), both phases                       ← the first byte
 *    9  PHASE 1      10  PHASE 2      11  manifest ← the LAST write
 *   12  journal + journal.d/ removed, lock released
 *
 * ── RECORDED GAP: step 3 ──────────────────────────────────────────────
 *
 * T-2101 says *"`init` does not re-validate the pack — `planApply` runs
 * the validation"*, and **`planApply` does not**. It runs US-16 step 3
 * (payload integrity and the `.claude` gate's payload quantifier) and step
 * 11 (the render and the gate's write-set quantifier); steps 1–2, 4–10 and
 * 12–13 live in `validate-pack.ts`, behind an entry point that runs its
 * own combination sweep. So codes F2 §Error States attributes to *"any
 * pack or recipe validation failure (US-16 checks 1–10)"* —
 * `E-SCAFFOLD-COLLISION`, `W-FOLDER-README-MISSING`, `W-LINK-DANGLING`,
 * `W-ANATOMY-*`, `W-HOOK-SCRIPT-INERT`, check 9's parameter codes — are
 * **not reachable from `init`**.
 *
 * Calling `validatePack` here would close it and is exactly what T-2101
 * forbids, for a reason that is right: two callers of a fourteen-step
 * ordered check are two places where the order is decided. **The gap is
 * reported, not closed**, and closing it belongs to whoever reconciles
 * `planApply` with the sentence that describes it.
 *
 * ── What `init` never does ────────────────────────────────────────────
 *
 * It never re-reads a payload file between the plan and the manifest
 * (C-23); never retries a validation, a prompt or a write; never writes a
 * partial result; never infers a pack, a scaffold or an answer from the
 * directory it is applying into (Q-44); never prompts where nothing can
 * answer (US-43); never pauses for the disclosure (Q-54, IM-11); and never
 * performs, offers or claims the judgment work that follows an apply
 * (Q-1, IM-9).
 *
 * ── There is no consent gate and no gate call (Q-54) ──────────────────
 *
 * `ApplyInputs` has no `consent` field and `F2-ADR-003`'s printed contract
 * names one that does not exist. Do not construct `ConsentInputs`: it was
 * deleted with `merge-json`, because no pack can write a settings file at
 * all and a gate that cannot fire is a claim rather than a control.
 */
import { readFileSync } from 'node:fs';
import { lstat, mkdir, readFile, readdir, rm, rmdir, writeFile } from 'node:fs/promises';
import { hostname } from 'node:os';
import { dirname, join } from 'node:path';

import { DiagnosticBag } from '../../diag/diagnostic.js';
import { escapeLine } from '../../diag/escape.js';
import { parsePass1, parsePass2 } from '../flags.js';
import { CLI_VERSION } from '../version.js';
import { resolveAnswers, type PromptFn } from '../answers.js';
import { makePrompt } from '../prompt.js';
import { summaryLines, type KeptPath } from '../summary.js';

import { executeApply } from '../../apply/execute.js';
import { planApply, type PlannedFile } from '../../apply/plan.js';
import { planRollback } from '../../apply/rollback.js';
import { checkTargets, type ExistingFile } from '../../apply/target-exists.js';
import { atomicWrite, ensureDir } from '../../fs/atomic-write.js';
import { readJournal, type Journal } from '../../fs/journal.js';
import { decideLock, lockContents, readLock, type LockFile } from '../../fs/lock.js';
import { hashBytes } from '../../hash/sha256.js';
import { parseStrictJson } from '../../json/parse-strict.js';
import { canonicalJson } from '../../manifest/canonical-json.js';
import {
  MANIFEST_PATH,
  SUPPORTED_MANIFEST_VERSION,
  type PackManifest,
} from '../../manifest/types.js';
import { bundledPackNames, checkCliFloor, loadPack } from '../../pack/load-pack.js';
import { aliasesFor, type Answer } from '../../pack/parameters.js';
import { parametersFor, selectScaffolds, selectedIds } from '../../pack/scaffolds.js';
import { planPayloadCopy } from '../../payload/copy-payload.js';
import { OPS } from '../../recipe/ops/index.js';
import { planSteps, type PlannedStep } from '../../recipe/plan-steps.js';
import { validateRecipe } from '../../recipe/schema.js';
import { isPlacing } from '../../recipe/types.js';
import { collisionKey, type AppliedPath } from '../../security/confine.js';
import {
  buildDisclosure,
  emitInitDisclosure,
  newDisclosureNonce,
  type DisclosurePayloadFile,
  type DisclosureWrite,
} from '../../security/consent.js';
import { harness, harnessPath } from '../../security/harness-paths.js';
import { resolveRoot, type ProjectRoot } from '../../security/resolve.js';
import { readPackPayload } from '../../validate/validate-pack.js';
import type { ParameterDecl, ScaffoldDecl } from '../../pack/types.js';
import type { Streams } from '../main.js';

/* ── the command's own prose ─────────────────────────────────────────── */

/**
 * Two usage lines and one sentence, each for a fault **F1 has no code
 * for**.
 *
 * `main.ts` already carries this exception for an unknown *group* (known
 * limit 16) with the same reasoning: inventing a code would put a
 * development affordance into the product's only message catalogue, which
 * F1 owns. `usage` is a **value** interpolated into F1's own templates —
 * `E-CLI-PACK-MISSING` and `E-CLI-ARG-UNEXPECTED` both take one — so
 * `noJournal` is the only line this file composes, and Q-68 decided that
 * one is *not a failure* and needs no code.
 */
export const INIT_TEXT = {
  usage: 'usage: lintel harness init <pack> [--scaffold <id>]… [--set <id>=<value>]… [--force]',
  rollbackUsage: 'usage: lintel harness init --rollback',
  noJournal: 'lintel: no interrupted apply was found in this project. Nothing to roll back.',
  rolledBack: 'lintel: rolled back',
  deleted: 'deleted',
  restored: 'restored',
  keptCount: 'kept',
} as const;

/* ── options ─────────────────────────────────────────────────────────── */

/**
 * `F2-ADR-003`'s `InitOptions`, with two deviations, both recorded.
 *
 * **`set` is a list, not a `Record<string, string>`.** A record collapses
 * duplicates, and `--set x=a --set x=b` is `E-PARAM-INVALID` (US-40) — a
 * shape that cannot represent the fault cannot report it.
 *
 * **`argv` is carried.** Pass 2 *re-parses the original argv* with the
 * pack's aliases registered (`flags.ts`), because pass 1 cannot know
 * whether an unknown flag takes a value and therefore separates
 * `--calibration` from `high-floor`. A command handed only pass 1's
 * results has already lost the pairing, so the ADR's single-shot
 * `InitOptions` cannot express the two-pass walk the same ADR mandates.
 */
export interface InitOptions {
  /** The `<pack>` positional. `''` when absent → `E-CLI-PACK-MISSING`. */
  readonly pack: string;
  readonly projectRoot: string;
  /** `--set` and resolved aliases, merged by the parser into
   *  `<id>=<value>` tokens in argv order. */
  readonly set: readonly string[];
  /** `--scaffold`, repeatable. */
  readonly scaffolds: readonly string[];
  readonly force: boolean;
  /** Short-circuits everything below (T-2105). */
  readonly rollback: boolean;
  /** Reserved. `init` accepts no `--json` and emits none at v1.0 (IM-22),
   *  so this is always `false`; it is declared because the ADR's contract
   *  declares it, and a silently absent field is a contract that drifted
   *  rather than one that changed. */
  readonly json: boolean;
  /** Tokens after `lintel harness init`, kept for pass 2. */
  readonly argv: readonly string[];
}

/** Everything the command reaches for that a test may want to replace. */
export interface InitDeps {
  readonly streams?: Streams;
  /** `null` is the non-interactive path — which is how the resolution
   *  order is driven with no terminal. Omit it and the real TTY gate
   *  decides. */
  readonly prompt?: PromptFn | null;
  readonly closePrompt?: () => void;
  readonly cliVersion?: string;
  readonly host?: string;
  readonly now?: () => Date;
  readonly isAlive?: (pid: number) => boolean;
}

const realStreams: Streams = {
  out: (s) => process.stdout.write(s + '\n'),
  err: (s) => process.stderr.write(s + '\n'),
};

/**
 * Pass 1: recognise what the CLI knows without a pack, and **defer the
 * rest without judging it**.
 *
 * Reports no unknown flag — a pack-declared alias is indistinguishable
 * from a typo until the pack resolves, and judging here is the whole bug
 * the two-pass shape exists to prevent.
 */
export function initOptions(
  argv: readonly string[],
  projectRoot: string,
): { readonly options: InitOptions; readonly bag: DiagnosticBag } {
  const { parsed, bag } = parsePass1(argv, 'init');
  const flags = parsed.flags;
  return {
    options: {
      pack: parsed.positionals[0] ?? '',
      projectRoot,
      set: Array.isArray(flags['set']) ? flags['set'] : [],
      scaffolds: Array.isArray(flags['scaffold']) ? flags['scaffold'] : [],
      force: flags['force'] === true,
      rollback: flags['rollback'] === true,
      json: false,
      argv,
    },
    bag,
  };
}

/* ── the command ─────────────────────────────────────────────────────── */

export async function runInit(options: InitOptions, deps: InitDeps = {}): Promise<number> {
  const streams = deps.streams ?? realStreams;
  const cliVersion = deps.cliVersion ?? CLI_VERSION;

  /** Emit a bag and return the exit class it carries. Warnings contribute
   *  `0`: `init` has no `--strict` to promote a defect (Q-60). */
  const emit = (bag: DiagnosticBag): number => {
    for (const d of bag.items) for (const line of d.message.split('\n')) streams.err(line);
    return bag.exitCode();
  };

  /* ── T-2105: --rollback short-circuits before everything ──────────── */

  if (options.rollback) return rollbackRun(options, streams, emit);

  /* ── step 1: already applied, before every other check ─────────────── */

  const gate = await alreadyApplied(options.projectRoot);
  if (gate.length > 0) return emit(gate) || 1;

  /* ── step 2: resolve the pack ──────────────────────────────────────── */

  if (options.pack === '') {
    // `E-CLI-PACK-MISSING` (Q-68), distinct from `E-CLI-UNKNOWN-PACK`
    // because the remedy differs: there is nothing to correct, only
    // something to supply.
    const bag = new DiagnosticBag();
    bag.add('E-CLI-PACK-MISSING', {
      values: {
        command: 'init',
        packs: (await bundledPackNames()).join(', ') || '(none bundled)',
        usage: INIT_TEXT.usage,
      },
    });
    return emit(bag) || 1;
  }

  const load = await loadPack(options.pack, cliVersion);
  if (load.loaded === undefined) return emit(load.bag) || 1;
  if (load.bag.length > 0) emit(load.bag);
  const { pack, recipeText, recipePath, dir } = load.loaded;

  const floor = checkCliFloor(pack, cliVersion);
  if (floor.length > 0) return emit(floor) || 1;

  /* ── pass 2: fail-closed here, and not one token earlier ───────────── */

  const pass2 = parsePass2(options.argv, 'init', aliasesFor(pack.parameters));
  if (pass2.bag.length > 0) {
    const code = emit(pass2.bag);
    if (code !== 0) return code;
  }
  const flags = pass2.parsed.flags;
  const set = Array.isArray(flags['set']) ? flags['set'] : [];
  const requested = Array.isArray(flags['scaffold']) ? flags['scaffold'] : [];
  const force = flags['force'] === true;

  // A second positional is one `init` does not take. Judged after pass 2,
  // because pass 1 files an unknown flag's *value* as a positional and
  // would report the wrong fault.
  if (pass2.parsed.positionals.length > 1) {
    const bag = new DiagnosticBag();
    bag.add('E-CLI-ARG-UNEXPECTED', {
      values: {
        command: 'init',
        arg: pass2.parsed.positionals[1] as string,
        usage: INIT_TEXT.usage,
      },
    });
    return emit(bag) || 1;
  }

  /* ── the recipe, and step 2's third version gate ───────────────────── */

  const recipeFile = `${pack.name}/${recipePath}`;
  const parsedRecipe = parseStrictJson(recipeText, recipeFile, 'E-RECIPE-INVALID');
  if (parsedRecipe.value === undefined) return emit(parsedRecipe.bag) || 2;
  const validated = validateRecipe(parsedRecipe.value, pack.name, recipeFile);
  if (validated.recipe === undefined) return emit(validated.bag) || 2;
  if (validated.bag.length > 0) emit(validated.bag);
  const recipe = validated.recipe;

  /* ── step 4: scaffolds, then answers ───────────────────────────────── */

  const selection = selectScaffolds(pack, requested);
  if (selection.bag.length > 0) {
    const code = emit(selection.bag);
    if (code !== 0) return code;
  }
  const selected = selection.selected;

  const asking = deps.prompt !== undefined ? null : makePrompt();
  const prompt = deps.prompt !== undefined ? deps.prompt : asking?.prompt ?? null;
  const resolved = await resolveAnswers(
    {
      declarations: parametersFor(pack, selected),
      set,
      packName: pack.name,
      packVersion: pack.version,
      declaredIds: declaredIdsOf(pack.parameters, pack.scaffolds),
    },
    prompt,
  );
  asking?.close();
  deps.closePrompt?.();
  if (resolved.bag.length > 0) {
    const code = emit(resolved.bag);
    if (code !== 0) return code;
  }
  const answers = resolved.answers;

  /* ── step 5: the project root, resolved ONCE ───────────────────────── */

  const rootResult = await resolveRoot(options.projectRoot);
  if (rootResult.root === undefined) return emit(rootResult.bag) || 3;
  const root = rootResult.root;

  /* ── step 6: the only read of the bundled pack, then the plan ──────── */

  const payload = await readPackPayload(dir);
  if (payload.truncated) {
    // `ApplyInputs` carries no truncation flag, so `planApply` calls
    // `planPayloadCopy` without one and a partial walk would produce a
    // `.harness/pack/` that silently differs from the pack. Raised through
    // the module that **owns** the rule rather than restated here.
    return emit(planPayloadCopy(pack.name, payload.entries, true).bag) || 2;
  }

  const payloadFiles = payload.entries
    .filter((e) => e.kind === 'file' && e.symlink !== true)
    .map((e) => e.path);

  const steps = planSteps({ pack, recipe, selected, answers, payload: payloadFiles });
  if (steps.bag.length > 0) {
    const code = emit(steps.bag);
    if (code !== 0) return code;
  }

  // What is already on disk where phase 2 would write. Read per planned
  // directory rather than by walking the project, so the cost is bounded
  // by the plan and a large unrelated tree is never traversed.
  const existing = await existingAt(root, steps.written);
  const byKey = new Map(existing.map((e) => [collisionKey(e.path), e]));

  const plan = await planApply({
    packName: pack.name,
    packVersion: pack.version,
    cliVersion,
    payloadEntries: payload.entries,
    readPayload: (p) => payload.bytes.get(p) ?? null,
    phase2: { steps: steps.steps, answers },
    probe: (p) => {
      const found = byKey.get(collisionKey(p));
      return found === undefined ? null : { hash: hashBytes(found.bytes), mode: found.mode };
    },
  });
  if (plan.bag.length > 0) {
    const code = emit(plan.bag);
    if (code !== 0) return code;
  }

  /* ── E-TARGET-EXISTS, before the gate (US-47) ───────────────────────── */

  const targets = checkTargets(plan.files, existing, force);
  if (!targets.ok) return emit(targets.bag) || 1;

  /* ── the disclosure: after a plan that succeeded, before the lock ──── */

  const disclosure = buildDisclosure({
    writes: disclosureWrites(plan.files, steps.steps, steps.written),
    payload: disclosurePayload(plan.files),
    substitutions: plan.substitutions,
  });

  // The nonce is generated once per invocation and the containment scan
  // runs **inside** `emitInitDisclosure`, so the block cannot be emitted
  // unscanned: a pack cannot forge what it cannot predict.
  const block = emitInitDisclosure(disclosure, newDisclosureNonce());
  if (block.lines === undefined) return emit(block.bag) || 2;
  // Nothing else is ever printed between the delimiters, so a capture is
  // the block and only the block (IM-10).
  for (const line of block.lines) streams.err(line);

  /* ───────────────────── the gate closes here ───────────────────────── */

  /* ── step 7: the lock ──────────────────────────────────────────────── */

  const lock = await takeLock(root, cliVersion, deps);
  if (lock.bag.length > 0) {
    const code = emit(lock.bag);
    if (code !== 0) return code;
  }
  if (!lock.held) return 1;

  /* ── steps 8–12 ────────────────────────────────────────────────────── */

  const manifest: PackManifest = {
    manifestVersion: SUPPORTED_MANIFEST_VERSION,
    cli: cliVersion,
    pack: { name: pack.name, version: pack.version, formatVersion: pack.formatVersion },
    payloadDigest: plan.payloadDigest,
    parameters: Object.fromEntries(answers),
    scaffolds: selectedIds(selected),
  };

  const journalPath = harness.journal();
  const result = await executeApply({
    root,
    command: 'init',
    files: plan.files,
    manifest: { path: MANIFEST_PATH, bytes: Buffer.from(canonicalJson(manifest), 'utf8') },
    writeJournal: async (j) => {
      const out = await atomicWrite(root, {
        // Named rather than defaulted: `E-WRITE-FAILED` renders
        // `→ lintel harness {command} --rollback`, and a remedy naming the
        // wrong command is worse than none.
        command: 'init',
        path: journalPath,
        bytes: Buffer.from(JSON.stringify(j, null, 2), 'utf8'),
        mode: 0o644,
        expectNew: false,
      });
      // A journal that did not land makes every later byte unrecoverable,
      // so its failure is the apply's — reported rather than swallowed by
      // a callback that returns nothing.
      for (const d of out.bag.items) streams.err(d.message);
    },
    // Only after the manifest lands. Between those two moments the apply
    // is complete but still recoverable, which is the safe order to be in.
    removeJournal: async () => {
      await rm(join(root, '.harness', 'journal.json'), { force: true });
      await rm(join(root, '.harness', 'journal.d'), { recursive: true, force: true });
    },
    readExisting: async (p) => byKey.get(collisionKey(p))?.bytes ?? null,
  });

  const executeCode = emit(result.bag);
  if (!result.complete) {
    // The journal **and** the lock stay: `--rollback` acts on the first,
    // and releasing the second would invite a second writer into a project
    // that is mid-apply (US-49).
    return executeCode || 3;
  }

  await rm(join(root, '.harness', 'lock'), { force: true });

  /* ── the summary, on stdout, on a 0-exit run and no other ──────────── */

  const kept: KeptPath[] = plan.files
    .filter((f) => f.phase === 2 && f.preExisting)
    .map((f) => ({ planned: f.path, onDisk: byKey.get(collisionKey(f.path))?.path ?? f.path }));

  for (const line of summaryLines({
    packName: pack.name,
    packVersion: pack.version,
    payloadFiles: plan.files.filter((f) => f.phase === 1).length,
    appliedFiles: plan.files.filter((f) => f.phase === 2).length,
    scaffolds: selectedIds(selected),
    kept,
  })) {
    streams.out(line);
  }

  return executeCode;
}

/* ── step 1 ──────────────────────────────────────────────────────────── */

/**
 * `.harness/` present? **The first thing `init` does**, before pack
 * resolution, before pass 2's fail-closed point and before any answer is
 * collected (F1 §F1.6 step 1). Zero bytes on either outcome, and `--force`
 * overrides neither: re-applying in place is `update`'s job (Q-62), not a
 * flag on `init`.
 */
async function alreadyApplied(projectRoot: string): Promise<DiagnosticBag> {
  const bag = new DiagnosticBag();
  const dir = join(projectRoot, '.harness');

  try {
    await lstat(dir);
  } catch {
    return bag; // nothing applied, nothing interrupted
  }

  const journalText = await readIfPresent(join(dir, 'journal.json'));
  if (journalText !== null) {
    const value = parseJsonOrNull(journalText);
    if (value === undefined) {
      bag.add('E-JOURNAL-UNREADABLE', { values: { detail: 'it is not valid JSON' } });
      return bag;
    }
    const read = readJournal(value);
    if (read.journal === undefined) return read.bag;
    bag.add('E-JOURNAL-PRESENT', {
      values: { command: read.journal.command, n: String(read.journal.entries.length) },
    });
    return bag;
  }

  // *"Names the applied pack and version **when the manifest is
  // readable**"* (US-45). Read shallowly and best-effort: this is a fact
  // for a message, not an input to a decision, and a manifest too damaged
  // to parse must not turn a class-1 refusal into a class-2 integrity
  // fault.
  bag.add('E-ALREADY-APPLIED', { values: await appliedIdentity(join(dir, 'manifest.json')) });
  return bag;
}

async function appliedIdentity(
  file: string,
): Promise<{ readonly pack: string; readonly version: string }> {
  const unknown = { pack: '(unknown)', version: '(unknown)' };
  const text = await readIfPresent(file);
  if (text === null) return unknown;
  const doc = parseStrictJson(text, MANIFEST_PATH, 'E-MANIFEST-CORRUPT').value;
  if (typeof doc !== 'object' || doc === null || Array.isArray(doc)) return unknown;
  const p = (doc as Record<string, unknown>)['pack'];
  if (typeof p !== 'object' || p === null || Array.isArray(p)) return unknown;
  const o = p as Record<string, unknown>;
  return {
    pack: typeof o['name'] === 'string' ? o['name'] : unknown.pack,
    version: typeof o['version'] === 'string' ? o['version'] : unknown.version,
  };
}

/* ── the disclosure's two quantifiers ────────────────────────────────── */

/**
 * Phase-2 writes, as `buildDisclosure` wants them.
 *
 * `PlannedFile` carries neither the `AppliedPath` brand nor the payload
 * path a `0755` row must name, so both are recovered from **the plan that
 * produced them** rather than re-derived: the brand from `planSteps`'
 * ordered written-set, and the source through the op registry's
 * `sourceField` — never by naming `from`, since `generate`'s source field
 * is `template` and a rule written over the word `from` exempts it (C-38).
 */
function disclosureWrites(
  files: readonly PlannedFile[],
  steps: readonly PlannedStep[],
  written: readonly AppliedPath[],
): readonly DisclosureWrite[] {
  const applied = new Map<string, AppliedPath>(written.map((p) => [p, p]));

  const sources = new Map<string, string | null>();
  for (const planned of steps) {
    if (!isPlacing(planned.step.op)) continue;
    const field = OPS[planned.step.op].sourceField;
    const from =
      field === null ? null : ((planned.step as unknown as Record<string, string>)[field] ?? null);
    for (const p of planned.writeSet) sources.set(p, from);
  }

  const out: DisclosureWrite[] = [];
  for (const f of files) {
    if (f.phase !== 2) continue;
    const path = applied.get(f.path);
    /* c8 ignore next 2 — every phase-2 destination came from the write set
       that produced `written`; a miss would be a planner bug, and the row
       is dropped rather than fabricated with an unbranded path. */
    if (path === undefined) continue;
    out.push({
      path,
      mode: f.executable ? 0o755 : 0o644,
      from: sources.get(f.path) ?? null,
      bytes: f.bytes,
    });
  }
  return out;
}

/**
 * The phase-1 quantifier (C-39c).
 *
 * A `.claude/` subtree a pack merely *ships* lands live inside the
 * committed project at `.harness/pack/`, so disclosure rows 2 and 4 are
 * quantified over the payload as well as the write set. The destination is
 * re-minted through `harnessPath` — the brand's **only** constructor —
 * rather than cast: a path that skipped the gate is meant to be a compile
 * error.
 */
function disclosurePayload(files: readonly PlannedFile[]): readonly DisclosurePayloadFile[] {
  const prefix = '.harness/pack/';
  const out: DisclosurePayloadFile[] = [];
  for (const f of files) {
    if (f.phase !== 1) continue;
    const destination = harnessPath(f.path);
    /* c8 ignore next 2 — produced by `payloadPath`, which admits nothing
       this constructor would refuse. */
    if (destination === undefined) continue;
    out.push({
      packPath: f.path.startsWith(prefix) ? f.path.slice(prefix.length) : f.path,
      destination,
      bytes: f.bytes,
    });
  }
  return out;
}

/* ── destination state ───────────────────────────────────────────────── */

/** What is on disk at a planned path, with the mode the probe needs. */
type OnDiskFile = ExistingFile & { readonly mode: number | null };

/**
 * What is on disk where phase 2 would write.
 *
 * **Matched by `collisionKey` on both sides, unconditionally** (N-5). The
 * on-disk *spelling* is carried back with the bytes, because
 * `E-TARGET-EXISTS` must name the file as the user has it and the journal
 * must record the path that actually exists (C-36).
 *
 * One `readdir` per planned directory rather than a walk of the project:
 * the cost is bounded by the plan, and a project with a large unrelated
 * tree in it is never traversed. The map is built from `readdir` entries
 * so it reports the on-disk spelling — a lookup composing its own path
 * cannot do that.
 */
async function existingAt(
  root: ProjectRoot,
  planned: readonly AppliedPath[],
): Promise<readonly OnDiskFile[]> {
  const byDir = new Map<string, string[]>();
  for (const p of planned) {
    const dir = p.includes('/') ? p.slice(0, p.lastIndexOf('/')) : '';
    const into = byDir.get(dir) ?? [];
    into.push(p);
    byDir.set(dir, into);
  }

  const out: OnDiskFile[] = [];
  for (const [dir, paths] of byDir) {
    let names: string[];
    try {
      names = await readdir(join(root, ...(dir === '' ? [] : dir.split('/'))));
    } catch {
      continue; // the directory does not exist yet, which is the normal case
    }
    const onDisk = new Map(names.map((n) => [collisionKey(n), n]));

    for (const p of paths) {
      const base = dir === '' ? p : p.slice(dir.length + 1);
      const real = onDisk.get(collisionKey(base));
      if (real === undefined) continue;
      const relative = dir === '' ? real : `${dir}/${real}`;
      const absolute = join(root, ...relative.split('/'));
      try {
        const st = await lstat(absolute);
        // Only a regular file collides. A symlink at a destination is
        // stage 3's refusal, not this check's, and a directory there is a
        // write failure with its own code.
        if (!st.isFile()) continue;
        out.push({ path: relative, bytes: await readFile(absolute), mode: st.mode & 0o777 });
      } catch {
        continue;
      }
    }
  }
  return out;
}

/* ── step 7 ──────────────────────────────────────────────────────────── */

/**
 * Take `.harness/lock`, by exclusive create.
 *
 * **After the plan and after the disclosure** (US-49), so a run that then
 * fails to acquire it has already told the user what it would have done
 * and has contended for nothing. A lock is broken only under all three of
 * F1 §NFR *Concurrency*'s conditions, which `decideLock` owns and this
 * function does not restate.
 *
 * **Recorded, because it reads as unreachable from `init` and is:** step 1
 * refuses any project that already has a `.harness/`, and a first `init`
 * creates that directory here — so a concurrent second `init` meets
 * `E-ALREADY-APPLIED` or `E-JOURNAL-PRESENT` rather than `E-LOCK-HELD`.
 * US-45 and US-49 cannot both be observable from `init` alone. The lock is
 * taken anyway, because `update` contends for the same file and a writing
 * command that skipped it would be the one exception in a rule stated over
 * all of them.
 */
async function takeLock(
  root: ProjectRoot,
  cliVersion: string,
  deps: InitDeps,
): Promise<{ readonly held: boolean; readonly bag: DiagnosticBag }> {
  const bag = new DiagnosticBag();
  const file = join(root, '.harness', 'lock');
  const host = deps.host ?? hostname();
  const now = (deps.now ?? (() => new Date()))();

  const text = await readIfPresent(file);
  let existing: LockFile | null = null;
  if (text !== null) {
    const read = readLock(parseJsonOrNull(text) ?? null);
    // A malformed lock is reported as held and **never** broken: a file
    // this CLI cannot read might have been written by one that can, and
    // removing it would break that run. Fail closed on the side of not
    // interfering — which here means synthesising an entry that satisfies
    // none of the three breaking conditions.
    existing = read.lock ?? { pid: 0, host: '(unreadable)', startedAt: '', cli: '' };
  }

  const decision = decideLock(existing, {
    host,
    now: now.getTime(),
    isAlive: deps.isAlive ?? isAlive,
  });
  for (const d of decision.bag.items) bag.push(d);
  if (!decision.acquire) return { held: false, bag };
  if (decision.breakStale) await rm(file, { force: true });

  await ensureDir(dirname(file), new Set());
  try {
    // `wx` — exclusive create. The lock's whole value is that two runs
    // cannot both believe they took it.
    await writeFile(file, `${JSON.stringify(lockContents(cliVersion, host, now), null, 2)}\n`, {
      encoding: 'utf8',
      flag: 'wx',
    });
  } catch (e) {
    bag.add('E-WRITE-FAILED', {
      values: { path: '.harness/lock', errno: (e as NodeJS.ErrnoException).code ?? 'unknown' },
    });
    return { held: false, bag };
  }
  return { held: true, bag };
}

/** `process.kill(pid, 0)` is a syscall, so `decideLock` takes liveness as
 *  an injection; this is the real one. `EPERM` means the process exists
 *  and belongs to somebody else — alive, and not ours to break. */
function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === 'EPERM';
  }
}

/* ── T-2105: --rollback ──────────────────────────────────────────────── */

/**
 * `lintel harness init --rollback` — a **different invocation shape**, not
 * a modifier on an apply.
 *
 * It resolves no answer, reads no bundled pack and takes no parameter. It
 * reads `.harness/journal.json` and hands it to `planRollback`, which
 * applies F1 US-13's five-case table — **the table is F1's and is not
 * restated here**. What this owns is the surface, the performing of the
 * decisions, and the report.
 *
 * **With no journal it writes nothing and exits `0`** (Q-68), stating that
 * no interrupted apply was found: nothing is wrong, so nothing is an
 * error, and no code is invented for it.
 */
async function rollbackRun(
  options: InitOptions,
  streams: Streams,
  emit: (bag: DiagnosticBag) => number,
): Promise<number> {
  const bag = new DiagnosticBag();

  if (options.pack !== '') {
    bag.add('E-CLI-ARG-UNEXPECTED', {
      values: { command: 'init --rollback', arg: options.pack, usage: INIT_TEXT.rollbackUsage },
    });
  }

  // US-52: `--force`, `--set`, `--scaffold` and a pack alias alongside
  // `--rollback` are refused rather than ignored. A pack **alias** cannot
  // be recognised as one here — aliases resolve in pass 2 and there is no
  // pack to resolve — so it arrives as a deferred token and is reported
  // unknown, which is the honest code for a flag nothing has claimed.
  for (const [flag, present] of [
    ['force', options.force],
    ['set', options.set.length > 0],
    ['scaffold', options.scaffolds.length > 0],
  ] as const) {
    if (!present) continue;
    bag.add('E-FLAG-NOT-PERMITTED', {
      values: { flag, command: 'init --rollback', commands: 'init' },
    });
  }
  for (const token of parsePass1(options.argv, 'init').parsed.deferred) {
    bag.add('E-CLI-UNKNOWN-FLAG', {
      values: { command: 'init --rollback', flag: token.replace(/^--/, ''), flags: '--rollback' },
    });
  }
  if (bag.length > 0) return emit(bag) || 1;

  const rootResult = await resolveRoot(options.projectRoot);
  if (rootResult.root === undefined) return emit(rootResult.bag) || 3;
  const root = rootResult.root;

  const text = await readIfPresent(join(root, '.harness', 'journal.json'));
  if (text === null) {
    streams.out(escapeLine(INIT_TEXT.noJournal));
    return 0;
  }

  const value = parseJsonOrNull(text);
  if (value === undefined) {
    bag.add('E-JOURNAL-UNREADABLE', { values: { detail: 'it is not valid JSON' } });
    return emit(bag) || 2;
  }
  const read = readJournal(value);
  if (read.journal === undefined) return emit(read.bag) || 2;

  return performRollback(root, read.journal, streams, emit);
}

/**
 * Perform the plan `planRollback` decided.
 *
 * `rollback.ts` is pure by design — *"performing them is `execute`'s"* —
 * and F1 ships no executor for it, so the performing half lives here, in
 * the branch that is its only caller. It reads through the same callback
 * the planner does, so the bytes a decision was made about are the bytes
 * acted on.
 *
 * **Recorded gap:** `executeApply` builds the journal with an empty
 * `createdDirs` (it is built before the first directory exists), so
 * `plan.removeDirs` is always empty and the reverse-order directory
 * removal below has nothing to do. Directories a partial apply created
 * outside `.harness/` therefore survive a rollback as empty directories.
 * The loop is kept rather than deleted: it is correct, and deleting it
 * would hide the gap rather than record it.
 */
async function performRollback(
  root: ProjectRoot,
  journal: Journal,
  streams: Streams,
  emit: (bag: DiagnosticBag) => number,
): Promise<number> {
  const abs = (p: string): string => join(root, ...p.split('/'));
  const plan = planRollback(journal, (p) => {
    try {
      return readFileSync(abs(p));
    } catch {
      return null;
    }
  });

  let deleted = 0;
  let restored = 0;

  for (const decision of plan.decisions) {
    if (decision.action === 'delete') {
      await rm(abs(decision.path), { force: true });
      deleted += 1;
      continue;
    }
    if (decision.action === 'restore' && decision.backup !== undefined) {
      const backup = await readIfPresent(abs(decision.backup));
      if (backup === null) continue;
      await mkdir(dirname(abs(decision.path)), { recursive: true });
      await writeFile(abs(decision.path), backup, 'utf8');
      restored += 1;
    }
  }

  // Reverse creation order, and only when empty: a directory holding a
  // file rollback declined to touch is a directory that must survive.
  for (const dir of plan.removeDirs) {
    try {
      await rmdir(dir.startsWith(root) ? dir : abs(dir));
    } catch {
      // Not empty, or already gone. Both are correct outcomes.
    }
  }

  // `.harness/` last, and wholesale: it cannot have pre-existed, because
  // step 1 refuses a project that already has one.
  await rm(join(root, '.harness'), { recursive: true, force: true });

  const kept = plan.decisions.filter((d) => d.action === 'keep').length;
  emit(plan.bag);
  streams.out(
    `${escapeLine(INIT_TEXT.rolledBack)}: ${String(deleted)} ${escapeLine(INIT_TEXT.deleted)}, ` +
      `${String(restored)} ${escapeLine(INIT_TEXT.restored)}, ` +
      `${String(kept)} ${escapeLine(INIT_TEXT.keptCount)}.`,
  );
  return 0;
}

/* ── helpers ─────────────────────────────────────────────────────────── */

async function readIfPresent(file: string): Promise<string | null> {
  try {
    return await readFile(file, 'utf8');
  } catch {
    return null;
  }
}

/** `undefined` for text that is not JSON at all — distinct from `null`,
 *  which is the JSON document `null` and a shape fault rather than a parse
 *  one. */
function parseJsonOrNull(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

/**
 * Every parameter id the pack declares, **selected or not** (Q-66).
 *
 * A `--set` naming a parameter of an unselected scaffold is not an unknown
 * id: the id exists in `pack.json`, and the user's mistake is selection
 * rather than naming.
 */
function declaredIdsOf(
  parameters: readonly ParameterDecl[] | undefined,
  scaffolds: readonly ScaffoldDecl[] | undefined,
): readonly string[] {
  return [
    ...(parameters ?? []).map((p) => p.id),
    ...(scaffolds ?? []).flatMap((s) => (s.parameters ?? []).map((p) => p.id)),
  ];
}
