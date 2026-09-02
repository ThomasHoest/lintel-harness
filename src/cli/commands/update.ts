/**
 * `lintel harness update [--dry-run [--json]]` — F3's CLI surface.
 * T-2401 (the commit sequence), T-2503 (`--dry-run`), T-2504 (`--json`).
 * `F3-ADR-004` §1.
 *
 * ── `update` is `verify` with a second recomputation and a write path ──
 *
 * There is **no merge engine** (Q-62). The unedited is replaced outright,
 * the edited is left untouched and reported, and a `fillExpected` path is
 * never overwritten under any circumstance. Everything this command
 * cannot resolve is handed to F6 as a conversation, and `src/update/
 * report.ts` is the whole of that handover.
 *
 * ── The order is §F3.2's, and the gate is between steps 9 and 10 ──────
 *
 *    1  journal present?                → E-JOURNAL-PRESENT (2)
 *    2  manifest readable?              → E-MANIFEST-* (1 or 2)
 *    3  recorded answers re-validated   ┐ `checkUpdateGates`, and both
 *    4  payloadDigest over .harness/pack/┘ SUPPRESS rather than warn
 *    5  resolve the bundled pack BY THE RECORDED NAME
 *       ├─ equal   → up to date, exit 0, zero bytes, no code
 *       └─ older   → E-UPDATE-NOT-NEWER (1)
 *    6  the bundled pack's own gates (minCliVersion, both formatVersions)
 *    7  realpath the project root, ONCE
 *    8  PLAN — render expected_old and expected_new, classify         0 bytes
 *    9  print the disclosure, complete and verbatim (US-67)           0 bytes
 *   ───────────────────── the gate closes here ─────────────────────────
 *       --dry-run stops here: no lock, no journal, zero bytes
 *   10  take .harness/lock
 *   11  journal v3, `command: "update"`               ← the first byte
 *   12  PHASE 1   13  PHASE 2   14  manifest ← THE COMMIT POINT
 *   15  journal removed, lock released, report printed
 *
 * ── Why this composes the primitives rather than calling `planApply` ──
 *
 * `init` hands its whole plan to `planApply`. `update` cannot: `planApply`
 * renders **one** payload, eagerly, in a single `await`, and an update
 * renders **two** — from two different payloads — and may render **neither**,
 * because four gates come first and a render performed before them is a
 * confident statement derived from an input nobody vouched for. So the
 * render is threaded through `planUpdate`'s thunks, which is what makes
 * *"the digest gate runs before any recomputation"* a property of the code.
 *
 * **No primitive is reimplemented.** `planSteps`, `renderPhase2`,
 * `planPayloadCopy`, `payloadDigest`, both `.claude` gates, `buildDisclosure`
 * and `executeUpdate` are each called exactly where `planApply` calls them,
 * in the same order.
 *
 * ── What `update` never does ──────────────────────────────────────────
 *
 * It takes **no pack argument and no version argument** (US-59) — the pack
 * is the one the manifest records and the version is the one bundled in
 * the installed CLI, which is Q-12 enforced by the surface and keeps §NFR
 * *No network* true with no exception. It never changes an answer (Q-21),
 * adds or drops a scaffold (Q-22), re-creates a file the user deleted
 * (US-61), deletes an applied path (`F3-ADR-004` §10), writes a `.orig`, a
 * `.new` or a conflict marker, resumes an interrupted run, or performs the
 * judgment work that follows (IM-9, IM-32).
 *
 * **There is no `--force` and no `E-TARGET-EXISTS`**, and that is a
 * consequence of the classification rather than an omission: the one thing
 * `--force` relaxes at `init` is the pre-existing-path rule, and `update`
 * has no such rule to relax — a project file standing where the newer pack
 * newly ships is `kept-edited` (US-60).
 */
import { lstatSync, readFileSync, readdirSync } from 'node:fs';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { hostname } from 'node:os';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { DiagnosticBag, exitCodeFor, type Diagnostic } from '../../diag/diagnostic.js';
import { escapeLine } from '../../diag/escape.js';
import { parsePass2 } from '../flags.js';
import { CLI_VERSION } from '../version.js';

import { atomicWrite, ensureDir } from '../../fs/atomic-write.js';
import { readJournal, type Journal } from '../../fs/journal.js';
import { decideLock, lockContents, readLock, type LockFile } from '../../fs/lock.js';
import { hashBytes } from '../../hash/sha256.js';
import type { TreeDigest } from '../../hash/digest.js';
import { parseStrictJson } from '../../json/parse-strict.js';
import { canonicalJson } from '../../manifest/canonical-json.js';
import { readManifest } from '../../manifest/read.js';
import {
  MANIFEST_PATH,
  SUPPORTED_MANIFEST_VERSION,
  type PackManifest,
} from '../../manifest/types.js';
import { checkCliFloor, loadPack } from '../../pack/load-pack.js';
import { validatePackJson } from '../../pack/schema.js';
import { selectedIds } from '../../pack/scaffolds.js';
import { payloadDigest } from '../../payload/digest.js';
import { planPayloadCopy } from '../../payload/copy-payload.js';
import { renderPhase2 } from '../../apply/plan-phase2.js';
import { OPS } from '../../recipe/ops/index.js';
import { planSteps, type PlannedStep } from '../../recipe/plan-steps.js';
import { validateRecipe } from '../../recipe/schema.js';
import { isPlacing, type Recipe } from '../../recipe/types.js';
import { checkPayloadClaudeFiles, checkRenderedClaudeFiles } from '../../security/claude-gate.js';
import { collisionKey, type AppliedPath } from '../../security/confine.js';
import {
  buildDisclosure,
  emitInitDisclosure,
  newDisclosureNonce,
  type DisclosurePayloadFile,
  type DisclosureWrite,
} from '../../security/consent.js';
import { harness, type HarnessPath } from '../../security/harness-paths.js';
import { resolveRoot, type ProjectRoot } from '../../security/resolve.js';
import { readPackPayload, type PackPayload } from '../../validate/validate-pack.js';

import { executeUpdate } from '../../update/execute-update.js';
import { planUpdate } from '../../update/plan-update.js';
import { journalPresent, performRollback } from '../../update/rollback-update.js';
import {
  reportLines,
  updateAvailable,
  updateExitCode,
  updateJson,
  type ReportMode,
} from '../../update/report.js';

import type { PlannedFile } from '../../apply/plan.js';
import type { Answer } from '../../pack/parameters.js';
import type { PackJson, ParameterDecl, ScaffoldDecl } from '../../pack/types.js';
import type { Substitution } from '../../recipe/render.js';
import type { RecomputedPath } from '../../verify/verify.js';
import type { Streams } from '../main.js';

/* ── the command's own prose ─────────────────────────────────────────── */

/**
 * The usage lines, and the one sentence for a fault **F1 has no code
 * for**.
 *
 * The documented exception `main.ts`, `init.ts`, `consent.ts` and
 * `summary.ts` carry: inventing a code would put a development affordance
 * into the product's only catalogue, which F1 owns. `usage` is a **value**
 * interpolated into F1's own templates (`E-CLI-ARG-UNEXPECTED` takes one),
 * so `noJournal` is the only line this file composes — and Q-68 decided
 * that *"nothing to roll back"* is not a failure and needs no code.
 */
export const UPDATE_TEXT = {
  usage: 'usage: lintel harness update [--dry-run [--json]]',
  rollbackUsage: 'usage: lintel harness update --rollback',
  noJournal: 'lintel: no interrupted update was found in this project. Nothing to roll back.',
  rolledBack: 'lintel: rolled back',
  restored: 'restored',
  removed: 'removed',
  keptCount: 'kept',
} as const;

/* ── options ─────────────────────────────────────────────────────────── */

export interface UpdateOptions {
  readonly projectRoot: string;
  readonly dryRun: boolean;
  readonly json: boolean;
  /**
   * `update --rollback` — the single recovery for an interrupted run
   * (US-66), and the command `E-JOURNAL-PRESENT` names after a crashed
   * update (F3-R3).
   *
   * **RECORDED GAP — this is currently unreachable from argv.**
   * `flags.ts`'s `ACCEPTS['update']` is `['dry-run', 'json']`, so
   * `--rollback` on this command is refused by the parser as
   * `E-FLAG-NOT-PERMITTED` naming `init`. That makes
   * `E-JOURNAL-PRESENT`'s remedy line — `→ lintel harness update
   * --rollback` — unfollowable, which is the exact *"a remedy that cannot
   * work is worse than none"* fault F3-R3 was raised to fix, reintroduced
   * one layer down. The fix is one entry in `ACCEPTS`, in a file F1 owns;
   * it is **reported, not made here**. The branch below is written and
   * tested through `runUpdate` so that entry is the whole of the change.
   */
  readonly rollback: boolean;
  /** Positionals after `update`. **Always empty on a legal invocation** —
   *  `update` takes no pack and no version (US-59). */
  readonly positionals: readonly string[];
}

export interface UpdateDeps {
  readonly streams?: Streams;
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
 * Parse `update`'s argv. **One pass, not `init`'s two**, and the
 * difference is a consequence rather than a shortcut: the second pass
 * exists so a pack-declared `parameters[].flag` alias is not judged before
 * the pack resolves, and `update` accepts **no `--set` and no alias** —
 * an answer cannot be supplied or changed after the apply (Q-21). With no
 * alias to wait for, the grammar is fully known at the first token, so
 * failing closed immediately is correct here and would be a bug at `init`.
 */
export function updateOptions(
  argv: readonly string[],
  projectRoot: string,
): { readonly options: UpdateOptions; readonly bag: DiagnosticBag } {
  const { parsed, bag } = parsePass2(argv, 'update', {});
  return {
    options: {
      projectRoot,
      dryRun: parsed.flags['dry-run'] === true,
      json: parsed.flags['json'] === true,
      rollback: parsed.flags['rollback'] === true,
      positionals: parsed.positionals,
    },
    bag,
  };
}

/* ── the command ─────────────────────────────────────────────────────── */

export async function runUpdate(options: UpdateOptions, deps: UpdateDeps = {}): Promise<number> {
  const streams = deps.streams ?? realStreams;
  const cliVersion = deps.cliVersion ?? CLI_VERSION;
  const mode: ReportMode = options.dryRun ? 'dry-run' : 'apply';

  /**
   * Emit to stderr and return the exit class the diagnostics carry.
   *
   * Warnings contribute `0`: there is no `--strict` on this command
   * (US-69, IM-22), so a `defect`-class warning prints and leaves the exit
   * code alone. A bag and a bare list are treated identically on purpose —
   * an `emit` that scored one and not the other is a call site away from
   * returning `0` for a fault.
   */
  const emit = (bag: DiagnosticBag | readonly Diagnostic[]): number => {
    const items = Array.isArray(bag) ? (bag as readonly Diagnostic[]) : (bag as DiagnosticBag).items;
    for (const d of items) for (const line of d.message.split('\n')) streams.err(line);
    return exitCodeFor(items);
  };

  /* ── flag combinations, before anything is opened ──────────────────── */

  const flagFault = checkFlagCombination(options);
  if (flagFault.length > 0) return emit(flagFault) || 1;

  const rootResult = await resolveRoot(options.projectRoot);
  if (rootResult.root === undefined) return emit(rootResult.bag) || 3;
  const root = rootResult.root;

  if (options.rollback) return rollbackRun(root, streams, emit);

  /* ── step 1: a crashed run outranks every other question ───────────── */

  const crashed = await interruptedRun(root);
  if (crashed.length > 0) return emit(crashed) || 2;

  /* ── step 2: the manifest ──────────────────────────────────────────── */

  // `declarations: []` deliberately. `readManifest`'s answer re-validation
  // needs the **applied pack's** declarations, which live in
  // `.harness/pack/pack.json` — a file whose name this very manifest is
  // what tells us to read. The re-validation is not skipped: it is
  // `checkUpdateGates`' second gate, run below with the real declarations,
  // which is where §F3.2 step 3 puts it.
  //
  // `bundledPackVersion` is deliberately absent too. It exists to raise
  // `W-PACK-NEWER-THAN-CLI`, which is the *same skew* `update` treats as
  // fatal: on `verify` the bundle is not consulted, here it is an input to
  // a write, so US-70 makes it `E-UPDATE-NOT-NEWER` instead. One fault,
  // two occasions, two codes — F1's own severity rule.
  const read = await readManifest(root, [], { cliVersion });
  if (read.manifest === undefined) return emit(read.bag) || 2;
  if (read.bag.length > 0) emit(read.bag); // W-MANIFEST-NEWER-CLI proceeds
  const manifest = read.manifest;
  const recordedAnswers = new Map<string, Answer>(Object.entries(manifest.parameters));

  /* ── the applied pack, read from `.harness/pack/` ───────────────────── */

  const applied = await readAppliedPack(root, manifest.pack.name);
  if (applied.pack === undefined) return emit(applied.bag) || 2;
  if (applied.bag.length > 0) emit(applied.bag);

  const localDigest = await payloadDigestOf(applied.pack.name, applied.payload);
  const digest = {
    recorded: manifest.payloadDigest,
    computed: localDigest,
    matched: manifest.payloadDigest === localDigest,
  };

  /* ── step 5/6: the bundled pack, by the RECORDED name ───────────────── */

  const bundled = await loadBundledPack(manifest.pack.name, cliVersion);

  if (bundled.pack === undefined) {
    // Doubly broken. **The digest gate outranks the bundled pack's own
    // faults**, because it decides whether anything downstream may be
    // believed at all — reporting a stale CLI at a project whose payload
    // has been edited would name the smaller problem.
    const gate = checkGatesOnly(digest, applied.declarations, recordedAnswers);
    return emit(gate.length > 0 ? gate : bundled.bag) || 2;
  }

  /* ── step 8: the plan ───────────────────────────────────────────────── */

  const renderBag = new DiagnosticBag();
  let newSide: Recomputation | undefined;

  const project = new ProjectReader(root);

  const plan = planUpdate({
    applied: { pack: manifest.pack.name, version: manifest.pack.version },
    bundled: bundled.pack,
    cliVersion,
    recordedDigest: manifest.payloadDigest,
    computedDigest: localDigest,
    appliedDeclarations: applied.declarations,
    recordedAnswers,
    recordedScaffolds: manifest.scaffolds,
    // Both thunks are called **only** if every gate and both refusals
    // pass, and exactly once each. That is `planUpdate`'s contract, and it
    // is the reason the renders are threaded rather than awaited above.
    renderOld: () => {
      const r = recompute({
        pack: applied.pack as PackJson,
        recipe: applied.recipe as Recipe,
        selected: selectedScaffolds(applied.pack as PackJson, manifest.scaffolds),
        answers: recordedAnswers,
        payload: applied.payload,
        cliVersion,
      });
      // The applied pack's own render faults are **not** reported. This
      // side is what the project was built from, it passed at `init`, and
      // the digest gate above is what vouches for it now; a second opinion
      // here would name the old pack in a run about the new one.
      return r.recomputed;
    },
    renderNew: (resolved) => {
      newSide = recompute({
        pack: bundled.pack as PackJson,
        recipe: bundled.recipe as Recipe,
        selected: resolved.selected,
        answers: resolved.answers,
        payload: bundled.payload as PackPayload,
        cliVersion,
      });
      for (const d of newSide.bag.items) renderBag.push(d);
      // US-16 step 11 — the write-set quantifier, over RENDERED bytes. A
      // newer pack that has acquired a tool grant or a widening
      // `permissionMode` is **refused, not disclosed** (US-67).
      for (const d of checkRenderedClaudeFiles(newSide.outputs).items) renderBag.push(d);
      return newSide.recomputed;
    },
    onDisk: (p) => project.read(p),
    oldPayload: payloadFilePaths(applied.payload),
    newPayload: payloadFilePaths(bundled.payload as PackPayload),
  });

  /* ── refusals and suppressions: zero bytes, both modes ──────────────── */

  if (plan.suppressed || !plan.ok) {
    emit(plan.diagnostics);
    if (options.json) streams.out(JSON.stringify(updateJson(plan, digest), null, 2));
    return updateExitCode(plan, mode);
  }

  if (plan.upToDate) {
    // Not a fault and not a suppression: there is nothing to do. Exit 0,
    // zero bytes, no code, in both modes (US-70).
    if (options.json) streams.out(JSON.stringify(updateJson(plan, digest), null, 2));
    else for (const line of reportLines(plan, mode)) streams.out(line);
    return 0;
  }

  // The new pack's render, now that it has happened. An error here is exit
  // 2 and zero bytes: the pack cannot be rendered, so there is nothing to
  // classify against and nothing to write.
  if (renderBag.errors.length > 0) return emit(renderBag) || 2;
  if (renderBag.length > 0) emit(renderBag);
  if (bundled.bag.length > 0) {
    const code = emit(bundled.bag);
    if (code !== 0) return code;
  }

  /* ── phase 1 over the NEW payload, and its own quantifier ───────────── */

  const phase1 = planPhaseOne(bundled.pack, bundled.payload as PackPayload, project, root);
  if (phase1.bag.errors.length > 0) return emit(phase1.bag) || 2;
  if (phase1.bag.length > 0) emit(phase1.bag);

  const newDigest = await payloadDigest(
    phase1.files.map((f) => f.packPath),
    async (p) => (bundled.payload as PackPayload).bytes.get(p) ?? Buffer.alloc(0),
  );

  /* ── step 9: the disclosure, complete and verbatim, in BOTH modes ───── */

  // US-67. A newer pack version can ship an agent file, an executable or a
  // substitution the applied version did not, and the decision an adopter
  // made at `init` was made against the pack as it then was. The builder
  // is F1 US-13's single one, so this surface cannot disagree with
  // `init`'s, `pack info`'s or `validate --json`'s.
  //
  // **The optional "new since {applied version}" second block is not
  // emitted.** US-67 and §F3.6 item 1 both make it optional — *"an
  // addition after a complete block, never a replacement for one"* — and
  // the complete block, which is the required half, is emitted here.
  const disclosure = buildDisclosure({
    writes: disclosureWrites(newSide as Recomputation),
    payload: phase1.disclosure,
    substitutions: (newSide as Recomputation).substitutions,
  });
  const block = emitInitDisclosure(disclosure, newDisclosureNonce());
  if (block.lines === undefined) return emit(block.bag) || 2;
  for (const line of block.lines) streams.err(line);

  /* ── --dry-run stops here: no lock, no journal, ZERO bytes ──────────── */

  if (options.dryRun) {
    const available = updateAvailable(plan, cliVersion);
    emit([available]);
    if (options.json) streams.out(JSON.stringify(updateJson(plan, digest), null, 2));
    else for (const line of reportLines(plan, mode)) streams.out(line);
    return updateExitCode(plan, mode, [available]);
  }

  /* ───────────────────── the gate closes here ───────────────────────── */

  /* ── step 10: the lock ─────────────────────────────────────────────── */

  const lock = await takeLock(root, cliVersion, deps);
  if (lock.bag.length > 0) {
    const code = emit(lock.bag);
    if (code !== 0) return code;
  }
  if (!lock.held) return 1;

  /* ── steps 11–15 ───────────────────────────────────────────────────── */

  const rewritten: PackManifest = {
    manifestVersion: SUPPORTED_MANIFEST_VERSION,
    cli: cliVersion,
    pack: {
      name: bundled.pack.name,
      version: bundled.pack.version,
      formatVersion: bundled.pack.formatVersion,
    },
    payloadDigest: newDigest,
    // Every recorded answer the new pack still declares, plus the declared
    // default of every parameter it newly declares. An id the new pack no
    // longer declares is dropped **silently** (US-69).
    parameters: Object.fromEntries(plan.answers),
    scaffolds: selectedIds(plan.selected),
  };

  const journalPath = harness.journal();
  const result = await executeUpdate({
    root,
    payloadWrites: phase1.files.map((f) => f.planned),
    payloadDeletes: plan.payloadDeletes,
    writes: plan.writes,
    fillExpected: plan.fillExpected,
    manifest: { path: MANIFEST_PATH, bytes: Buffer.from(canonicalJson(rewritten), 'utf8') },
    writeJournal: async (j) => {
      const out = await atomicWrite(root, {
        // Named, never defaulted: `E-WRITE-FAILED` and `E-TARGET-RACE`
        // render `→ lintel harness {command} --rollback` from it, and
        // `'init'` would send a user recovering a crashed update to a
        // command that answers `E-ALREADY-APPLIED`.
        command: 'update',
        path: journalPath,
        bytes: Buffer.from(JSON.stringify(j, null, 2), 'utf8'),
        mode: 0o644,
        expectNew: false,
      });
      for (const d of out.bag.items) streams.err(d.message);
    },
    removeJournal: async () => {
      await rm(join(root, '.harness', 'journal.json'), { force: true });
      await rm(join(root, '.harness', 'journal.d'), { recursive: true, force: true });
    },
    readExisting: (p) => readIfRegularFile(join(root, ...p.split('/'))),
  });

  const executeCode = emit(result.bag);
  if (!result.complete) {
    // The journal **and** the lock stay: `--rollback` acts on the first,
    // and releasing the second would invite a second writer into a project
    // that is mid-update, which here is a project full of the user's work.
    return executeCode || 3;
  }

  await rm(join(root, '.harness', 'lock'), { force: true });

  for (const line of reportLines(plan, mode)) streams.out(line);
  return updateExitCode(plan, mode, result.bag.items);
}

/* ── flags ───────────────────────────────────────────────────────────── */

/**
 * The three combinations F3 refuses, each **refused rather than ignored**
 * because a user who typed a flag believed it did something.
 *
 * `--json` without `--dry-run` is `E-FLAG-NOT-PERMITTED` (US-63, IM-41):
 * a machine that wants the plan runs `--dry-run --json`, which is also the
 * mode in which reading it can change nothing. `--dry-run` with
 * `--rollback` is refused for the plainer reason that one of them writes.
 */
function checkFlagCombination(options: UpdateOptions): DiagnosticBag {
  const bag = new DiagnosticBag();

  if (options.positionals.length > 0) {
    bag.add('E-CLI-ARG-UNEXPECTED', {
      values: {
        command: 'update',
        arg: options.positionals[0] as string,
        usage: UPDATE_TEXT.usage,
      },
    });
    return bag;
  }

  if (options.json && !options.dryRun) {
    bag.add('E-FLAG-NOT-PERMITTED', {
      values: { flag: 'json', command: 'update', commands: 'update --dry-run' },
    });
  }
  if (options.rollback && (options.dryRun || options.json)) {
    bag.add('E-FLAG-NOT-PERMITTED', {
      values: {
        flag: options.dryRun ? 'dry-run' : 'json',
        command: 'update --rollback',
        commands: 'update',
      },
    });
  }
  return bag;
}

/* ── step 1 ──────────────────────────────────────────────────────────── */

/**
 * A journal in `.harness/` means a previous `init` or `update` crashed.
 *
 * **First, ahead of the digest check**, and that ordering is load-bearing
 * rather than tidy: a crash between phase 1 and phase 2 leaves a new
 * payload beside an old manifest, which the digest gate would report as a
 * tampered payload. Step 1 preceding step 4 is what makes the user meet
 * `E-JOURNAL-PRESENT` — whose remedy actually helps — instead (§F3.2).
 *
 * The remedy names the command **the journal records**, never this one:
 * `journalPresent()` is the single renderer, so the wrong-command bug
 * F3-R3 fixed cannot come back one call site at a time.
 */
async function interruptedRun(root: ProjectRoot): Promise<readonly Diagnostic[]> {
  const bag = new DiagnosticBag();
  const text = await readIfPresent(join(root, '.harness', 'journal.json'));
  if (text === null) return [];

  const value = parseJsonOrUndefined(text);
  if (value === undefined) {
    bag.add('E-JOURNAL-UNREADABLE', { values: { detail: 'it is not valid JSON' } });
    return bag.items;
  }
  const journal = readJournal(value);
  if (journal.journal === undefined) return journal.bag.items;
  bag.push(journalPresent(journal.journal));
  return bag.items;
}

/* ── the applied pack, read from `.harness/pack/` ────────────────────── */

interface AppliedPack {
  readonly pack?: PackJson;
  readonly recipe?: Recipe;
  readonly payload: PackPayload;
  readonly declarations: readonly ParameterDecl[];
  readonly bag: DiagnosticBag;
}

/**
 * Read the pack the project was applied from — **the local copy, never the
 * bundle**.
 *
 * `.harness/pack/` is a verbatim copy of the pack as it was at `init`
 * (Q-39, F1 US-30), and `expected_old` is F1 §F1.8's identity evaluated
 * over *it*. Substituting the bundled pack here would compute
 * `expected_old` from the **new** payload, which classifies every edited
 * path as unedited and replaces it — the silent failure §F3.2's *no
 * resume* rule exists to prevent, arrived at by a different route.
 *
 * `loadPack` is not reused: it resolves **by name** against the bundle and
 * would open the wrong tree. The reads and the two parses are the same
 * ones, called directly.
 */
async function readAppliedPack(root: ProjectRoot, name: string): Promise<AppliedPack> {
  const bag = new DiagnosticBag();
  const dir = join(root, '.harness', 'pack');
  const empty: PackPayload = { entries: [], bytes: new Map(), truncated: false };

  const packText = await readIfPresent(join(dir, 'pack.json'));
  if (packText === null) {
    bag.add('E-PACK-INVALID', {
      values: { path: '.harness/pack/pack.json', detail: 'it is missing or unreadable' },
    });
    return { payload: empty, declarations: [], bag };
  }

  const parsed = parseStrictJson(packText, '.harness/pack/pack.json', 'E-PACK-INVALID');
  for (const d of parsed.bag.items) bag.push(d);
  if (parsed.value === undefined) return { payload: empty, declarations: [], bag };

  const validated = validatePackJson(parsed.value, name, '.harness/pack/pack.json');
  for (const d of validated.bag.items) bag.push(d);
  if (validated.pack === undefined) return { payload: empty, declarations: [], bag };
  const pack = validated.pack;

  const recipePath = pack.recipe ?? 'recipe.json';
  const recipeText = await readIfPresent(join(dir, ...recipePath.split('/')));
  if (recipeText === null) {
    bag.add('E-RECIPE-MISSING', { values: { name, path: recipePath } });
    return { payload: empty, declarations: [], bag };
  }
  const file = `.harness/pack/${recipePath}`;
  const parsedRecipe = parseStrictJson(recipeText, file, 'E-RECIPE-INVALID');
  for (const d of parsedRecipe.bag.items) bag.push(d);
  if (parsedRecipe.value === undefined) return { payload: empty, declarations: [], bag };
  const validatedRecipe = validateRecipe(parsedRecipe.value, name, file);
  for (const d of validatedRecipe.bag.items) bag.push(d);
  if (validatedRecipe.recipe === undefined) return { payload: empty, declarations: [], bag };

  const payload = await readPackPayload(pathToFileURL(`${dir}/`));

  return {
    pack,
    recipe: validatedRecipe.recipe,
    payload,
    // Every parameter the applied pack declares, **selected scaffolds
    // included**: these are what the recorded answers were recorded
    // against, and therefore what gate 2 must still find them satisfying.
    declarations: declarationsOf(pack, selectedScaffolds(pack, [])),
    bag,
  };
}

/* ── the bundled pack ────────────────────────────────────────────────── */

interface BundledPack {
  readonly pack?: PackJson;
  readonly recipe?: Recipe;
  readonly payload?: PackPayload;
  readonly bag: DiagnosticBag;
}

/**
 * The bundled pack, resolved **by the name the manifest records** (US-59).
 *
 * `update` takes no pack argument, so it can never run against a pack the
 * project never applied — Q-12 enforced by the surface rather than by a
 * check. And it resolves nothing over the wire: "newer" means the version
 * bundled in the installed `@lintel/cli`, which keeps §NFR *No network*
 * true for every v1.0 command with no exception (Q-2).
 */
async function loadBundledPack(name: string, cliVersion: string): Promise<BundledPack> {
  const bag = new DiagnosticBag();

  const load = await loadPack(name, cliVersion);
  for (const d of load.bag.items) bag.push(d);
  if (load.loaded === undefined) return { bag };
  const { pack, recipeText, recipePath, dir } = load.loaded;

  const floor = checkCliFloor(pack, cliVersion);
  for (const d of floor.items) bag.push(d);
  if (floor.errors.length > 0) return { bag };

  const file = `${pack.name}/${recipePath}`;
  const parsed = parseStrictJson(recipeText, file, 'E-RECIPE-INVALID');
  for (const d of parsed.bag.items) bag.push(d);
  if (parsed.value === undefined) return { bag };
  const validated = validateRecipe(parsed.value, pack.name, file);
  for (const d of validated.bag.items) bag.push(d);
  if (validated.recipe === undefined) return { bag };

  const payload = await readPackPayload(dir);
  if (payload.truncated) {
    // Raised through the module that owns the rule rather than restated:
    // a partial walk would produce a `.harness/pack/` that silently
    // differs from the pack.
    for (const d of planPayloadCopy(pack.name, payload.entries, true).bag.items) bag.push(d);
    return { bag };
  }

  return { pack, recipe: validated.recipe, payload, bag };
}

/* ── the two recomputations ──────────────────────────────────────────── */

interface Recomputation {
  readonly recomputed: readonly RecomputedPath[];
  readonly steps: readonly PlannedStep[];
  readonly outputs: readonly { readonly path: AppliedPath; readonly bytes: Buffer; readonly mode: number }[];
  readonly substitutions: readonly Substitution[];
  readonly bag: DiagnosticBag;
}

/**
 * Phase 2, in memory, over one payload — F1 §F1.8's identity.
 *
 * The **same two calls** `planApply` makes, in the same order:
 * `planSteps` decides which steps run and what each writes, `renderPhase2`
 * produces the bytes. Nothing about the apply is re-derived here; the
 * declared sets are joined onto the outputs so the result is a
 * `RecomputedPath`, which is the shape both `verify` and `classify`
 * already consume.
 *
 * **The declared sets are per-render**, not merged here. `classify.ts`
 * takes the **union** of the two, which is US-62's rule for
 * `adaptExpected` and the implementation's reading of it for
 * `fillExpected` — a path either recipe declares governs.
 */
function recompute(input: {
  readonly pack: PackJson;
  readonly recipe: Recipe;
  readonly selected: readonly ScaffoldDecl[];
  readonly answers: ReadonlyMap<string, Answer>;
  readonly payload: PackPayload;
  readonly cliVersion: string;
}): Recomputation {
  const bag = new DiagnosticBag();
  const files = payloadFilePaths(input.payload);

  const plan = planSteps({
    pack: input.pack,
    recipe: input.recipe,
    selected: input.selected,
    answers: input.answers,
    payload: files,
  });
  for (const d of plan.bag.items) bag.push(d);

  const rendered = renderPhase2({
    steps: plan.steps,
    payload: files,
    readPayload: (p) => input.payload.bytes.get(p) ?? null,
    answers: input.answers,
    packName: input.pack.name,
    packVersion: input.pack.version,
    cliVersion: input.cliVersion,
  });
  for (const d of rendered.bag.items) bag.push(d);

  const adapt = new Set<string>(plan.adaptExpected);
  const fill = new Set<string>(plan.fillExpected);

  return {
    recomputed: rendered.outputs.map((o) => ({
      path: o.path,
      bytes: o.bytes,
      mode: o.mode,
      adaptExpected: adapt.has(o.path),
      fillExpected: fill.has(o.path),
    })),
    steps: plan.steps,
    outputs: rendered.outputs,
    substitutions: rendered.substitutions,
    bag,
  };
}

/** Pack-relative POSIX paths of every payload **file**, symlinks excluded
 *  — a link is content the pack does not actually hold. */
function payloadFilePaths(payload: PackPayload): readonly string[] {
  return payload.entries.filter((e) => e.kind === 'file' && e.symlink !== true).map((e) => e.path);
}

/* ── phase 1 over the new payload ────────────────────────────────────── */

interface PhaseOneFile {
  readonly packPath: string;
  readonly planned: PlannedFile;
}

interface PhaseOne {
  readonly files: readonly PhaseOneFile[];
  readonly disclosure: readonly DisclosurePayloadFile[];
  readonly bag: DiagnosticBag;
}

/**
 * The verbatim copy of the **new** payload into `.harness/pack/`.
 *
 * `planPayloadCopy` decides the destinations and both bounds; this
 * function only pairs each with the bytes and with what is on disk at the
 * destination now, which is what lets `executeUpdate` confirm the plan's
 * observation immediately before it writes.
 *
 * US-16 step 3 — the **payload** quantifier of the `.claude` rules (C-39c)
 * — runs here rather than over the write set, because a `.claude/` subtree
 * a pack merely *ships* lands live inside the committed project at
 * `.harness/pack/.claude/`, and `update` replaces that tree in full.
 */
function planPhaseOne(
  pack: PackJson,
  payload: PackPayload,
  project: ProjectReader,
  root: ProjectRoot,
): PhaseOne {
  const bag = new DiagnosticBag();
  const copy = planPayloadCopy(pack.name, payload.entries);
  for (const d of copy.bag.items) bag.push(d);

  const files: PhaseOneFile[] = [];
  const disclosure: DisclosurePayloadFile[] = [];
  const gateInput: { destination: HarnessPath; bytes: Buffer }[] = [];

  for (const c of copy.copies) {
    const bytes = payload.bytes.get(c.from);
    /* c8 ignore next — `planPayloadCopy` emits a copy only for a walked
       file, and `readPackPayload` records bytes for every one it could
       read; a miss contributes no write rather than an empty file. */
    if (bytes === undefined) continue;

    const existing = project.raw(join(root, ...c.to.split('/')));
    files.push({
      packPath: c.from,
      planned: {
        path: c.to,
        bytes,
        phase: 1,
        executable: false,
        preExisting: existing !== null,
        preHash: existing === null ? null : hashBytes(existing.bytes),
        preMode: existing?.mode ?? null,
      },
    });
    disclosure.push({ packPath: c.from, destination: c.to, bytes });
    gateInput.push({ destination: c.to, bytes });
  }

  for (const d of checkPayloadClaudeFiles(gateInput).items) bag.push(d);

  return { files, disclosure, bag };
}

/* ── the disclosure's write rows ─────────────────────────────────────── */

/**
 * Phase-2 writes, as `buildDisclosure` wants them.
 *
 * The payload source is recovered through the op registry's `sourceField`
 * and **never by naming `from`**: `generate`'s source field is `template`,
 * and a rule written over the word `from` exempts exactly the op that
 * produces `CLAUDE.md` (C-38).
 *
 * Quantified over the **whole** write set of `expected_new`, not over the
 * paths this run will write. The disclosure answers *what does this pack
 * version grant*, which does not depend on which of those paths the user
 * happens to have edited.
 */
function disclosureWrites(side: Recomputation): readonly DisclosureWrite[] {
  const sources = new Map<string, string | null>();
  for (const planned of side.steps) {
    if (!isPlacing(planned.step.op)) continue;
    const field = OPS[planned.step.op].sourceField;
    const from =
      field === null ? null : ((planned.step as unknown as Record<string, string>)[field] ?? null);
    for (const p of planned.writeSet) sources.set(p, from);
  }

  return side.outputs.map((o) => ({
    path: o.path,
    mode: o.mode === 0o755 ? (0o755 as const) : (0o644 as const),
    from: sources.get(o.path) ?? null,
    bytes: o.bytes,
  }));
}

/* ── the project, read where the recipe claims a path ────────────────── */

/**
 * What is on disk at an applied path.
 *
 * ── Synchronous, because the classification is ────────────────────────
 *
 * `classifyPaths` is pure and synchronous by design, and its `onDisk` is a
 * callback rather than a directory handle *so that the module cannot
 * compose a path of its own*. The composing happens here, and it is the
 * only filesystem knowledge the classification has.
 *
 * ── Matched by `collisionKey`, and the ancestors are walked ───────────
 *
 * Both sides are folded through `collisionKey` (N-5), so a project whose
 * file differs from the planned path only in case or normalization is
 * found rather than reported missing — and the **on-disk spelling** is
 * what gets read, which a lookup composing its own path cannot do (C-36).
 *
 * **Every ancestor is `lstat`ed and a symlinked one refuses the read.**
 * `stat` would answer about a link's target instead, and a classification
 * computed through a symlinked ancestor would describe a file outside the
 * project. That cannot cause an escaping *write* — `executeUpdate`
 * re-confines every target immediately before acting (C-14, C-51) — but it
 * could make a path classify `unchanged` on the strength of somewhere
 * else's bytes, which is a wrong answer rather than a refused one.
 *
 * One `readdir` per directory the plan names, memoised, so the cost is
 * bounded by the plan and a large unrelated tree is never traversed.
 */
class ProjectReader {
  readonly #root: ProjectRoot;
  /** Applied-relative directory → its real absolute path, or `null` where
   *  it is absent, is not a directory, or is reached through a link. */
  readonly #dirs = new Map<string, string | null>();
  /** Absolute directory → `collisionKey` → the basename as spelled. */
  readonly #listings = new Map<string, ReadonlyMap<string, string>>();

  constructor(root: ProjectRoot) {
    this.#root = root;
  }

  read(path: AppliedPath): { bytes: Buffer; mode: number | null } | null {
    const cut = path.lastIndexOf('/');
    const dir = cut < 0 ? '' : path.slice(0, cut);
    const base = cut < 0 ? path : path.slice(cut + 1);

    const absoluteDir = this.#resolveDir(dir);
    if (absoluteDir === null) return null;
    const real = this.#listing(absoluteDir).get(collisionKey(base));
    if (real === undefined) return null;
    return this.raw(join(absoluteDir, real));
  }

  /** An absolute path, read **only** if it is a regular file. A symlink at
   *  the target reads as absent: `atomicWrite` produces regular files and
   *  nothing else, so anything else there was not written by this CLI. */
  raw(absolute: string): { bytes: Buffer; mode: number | null } | null {
    try {
      const st = lstatSync(absolute);
      if (!st.isFile()) return null;
      return { bytes: readFileSync(absolute), mode: st.mode & 0o777 };
    } catch {
      return null;
    }
  }

  #resolveDir(dir: string): string | null {
    const cached = this.#dirs.get(dir);
    if (cached !== undefined) return cached;

    let resolved: string | null;
    if (dir === '') {
      // The root is already a `ProjectRoot` — resolved once with
      // `realpath` — so there is nothing above it left to check.
      resolved = this.#root;
    } else {
      const cut = dir.lastIndexOf('/');
      const parent = cut < 0 ? '' : dir.slice(0, cut);
      const base = cut < 0 ? dir : dir.slice(cut + 1);
      const parentAbs = this.#resolveDir(parent);
      const real = parentAbs === null ? undefined : this.#listing(parentAbs).get(collisionKey(base));
      if (parentAbs === null || real === undefined) resolved = null;
      else {
        const candidate = join(parentAbs, real);
        try {
          // `lstat`, never `stat`: the question is what is **at** this
          // path, and a link here is refused rather than followed.
          resolved = lstatSync(candidate).isDirectory() ? candidate : null;
        } catch {
          resolved = null;
        }
      }
    }

    this.#dirs.set(dir, resolved);
    return resolved;
  }

  #listing(absoluteDir: string): ReadonlyMap<string, string> {
    const cached = this.#listings.get(absoluteDir);
    if (cached !== undefined) return cached;
    let map: ReadonlyMap<string, string>;
    try {
      map = new Map(readdirSync(absoluteDir).map((n) => [collisionKey(n), n]));
    } catch {
      map = new Map();
    }
    this.#listings.set(absoluteDir, map);
    return map;
  }
}

/* ── step 10 ─────────────────────────────────────────────────────────── */

/**
 * Take `.harness/lock`, by exclusive create, **after the plan and after
 * the disclosure** (US-49) — so a run that then fails to acquire it has
 * already told the user what it would have done and has contended for
 * nothing. `--dry-run` never reaches this function at all (US-63).
 *
 * A lock is broken only under all three of F1 §NFR *Concurrency*'s
 * conditions, which `decideLock` owns and this function does not restate.
 *
 * **This duplicates `init.ts`'s `takeLock`, which is private to that
 * module.** Recorded rather than left: the two are the same sequence over
 * the same three exported primitives, and a shared `fs/` helper is where
 * it belongs — a change F1 owns and F3 may not make. Unlike at `init`,
 * `E-LOCK-HELD` is genuinely reachable here: two `update` runs in one
 * project both pass step 1.
 */
async function takeLock(
  root: ProjectRoot,
  cliVersion: string,
  deps: UpdateDeps,
): Promise<{ readonly held: boolean; readonly bag: DiagnosticBag }> {
  const bag = new DiagnosticBag();
  const file = join(root, '.harness', 'lock');
  const host = deps.host ?? hostname();
  const now = (deps.now ?? (() => new Date()))();

  const text = await readIfPresent(file);
  let existing: LockFile | null = null;
  if (text !== null) {
    const value = parseJsonOrUndefined(text);
    const decoded = readLock(value === undefined ? null : value);
    // A malformed lock is reported held and **never** broken: a file this
    // CLI cannot read might have been written by one that can. The
    // synthesised entry satisfies none of the three breaking conditions.
    existing = decoded.lock ?? { pid: 0, host: '(unreadable)', startedAt: '', cli: '' };
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
 *  an injection; this is the real one. `EPERM` means the process exists and
 *  belongs to somebody else — alive, and not ours to break. */
function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === 'EPERM';
  }
}

/* ── `update --rollback` ─────────────────────────────────────────────── */

/**
 * Undo an interrupted update.
 *
 * A crashed update leaves a project full of the user's work with no
 * *delete `.harness/` and start over* fallback, so the journal is not a
 * nicety on this command — **it is the only recovery** (US-66). The
 * five-case table and the two rows journal v3 added are `planRollback`'s,
 * performed by `performRollback`; this branch is the surface and the
 * report.
 *
 * **With no journal it writes nothing and exits `0`** (Q-68): nothing is
 * wrong, so nothing is an error, and no code is invented for it.
 */
async function rollbackRun(
  root: ProjectRoot,
  streams: Streams,
  emit: (bag: DiagnosticBag | readonly Diagnostic[]) => number,
): Promise<number> {
  const bag = new DiagnosticBag();

  const text = await readIfPresent(join(root, '.harness', 'journal.json'));
  if (text === null) {
    streams.out(escapeLine(UPDATE_TEXT.noJournal));
    return 0;
  }

  const value = parseJsonOrUndefined(text);
  if (value === undefined) {
    bag.add('E-JOURNAL-UNREADABLE', { values: { detail: 'it is not valid JSON' } });
    return emit(bag) || 2;
  }
  const read = readJournal(value);
  if (read.journal === undefined) return emit(read.bag) || 2;

  const outcome = await performRollback(root, read.journal as Journal, {
    read: async (absolute) => readIfPresentBytes(absolute),
    removeJournal: async () => {
      await rm(join(root, '.harness', 'journal.json'), { force: true });
      await rm(join(root, '.harness', 'journal.d'), { recursive: true, force: true });
    },
  });

  const code = emit(outcome.bag);
  if (!outcome.complete) {
    // The journal stays. A rollback that half-ran and then deleted its own
    // record would leave nothing to try again with.
    return code || 3;
  }

  // The lock is released only on a rollback that completed, and for the
  // same reason: while the journal stands, the project is still mid-run.
  await rm(join(root, '.harness', 'lock'), { force: true });

  streams.out(
    `${escapeLine(UPDATE_TEXT.rolledBack)}: ${String(outcome.restored.length)} ` +
      `${escapeLine(UPDATE_TEXT.restored)}, ${String(outcome.removed.length)} ` +
      `${escapeLine(UPDATE_TEXT.removed)}, ${String(outcome.kept.length)} ` +
      `${escapeLine(UPDATE_TEXT.keptCount)}.`,
  );
  return code;
}

/* ── helpers ─────────────────────────────────────────────────────────── */

/** The digest over `.harness/pack/`, by the same rule and over the same
 *  file set `init` recorded — `planPayloadCopy`'s copies, not a raw walk,
 *  so the two cannot come to disagree about what is in the payload. */
async function payloadDigestOf(name: string, payload: PackPayload): Promise<TreeDigest> {
  const copy = planPayloadCopy(name, payload.entries);
  return payloadDigest(
    copy.copies.map((c) => c.from),
    async (p) => payload.bytes.get(p) ?? Buffer.alloc(0),
  );
}

/** The two gates, run for their **verdict only** — used where the run is
 *  already refused and the question is which fault to name first. */
function checkGatesOnly(
  digest: { readonly recorded: string; readonly computed: TreeDigest },
  declarations: readonly ParameterDecl[],
  answers: ReadonlyMap<string, Answer>,
): readonly Diagnostic[] {
  const plan = planUpdate({
    applied: { pack: '', version: '0.0.0' },
    bundled: { name: '', version: '0.0.0', formatVersion: 1 } as PackJson,
    cliVersion: '0.0.0',
    recordedDigest: digest.recorded,
    computedDigest: digest.computed,
    appliedDeclarations: declarations,
    recordedAnswers: answers,
    recordedScaffolds: [],
    /* c8 ignore next 2 — unreachable: a gate has to fire for this call to
       be made, and `planUpdate` calls neither thunk once one has. */
    renderOld: () => [],
    renderNew: () => [],
    onDisk: () => null,
    oldPayload: [],
    newPayload: [],
  });
  // Only the two gates' findings. The synthetic pack above would otherwise
  // contribute a version verdict, which is not this call's question.
  return plan.diagnostics.filter(
    (d) => d.code === 'E-PAYLOAD-DIGEST-MISMATCH' || d.code === 'E-MANIFEST-ANSWER-INVALID',
  );
}

/** Every parameter the pack declares for a selection, in `pack.json`
 *  order — base parameters first, then each selected scaffold's. */
function declarationsOf(
  pack: PackJson,
  selected: readonly ScaffoldDecl[],
): readonly ParameterDecl[] {
  return [...(pack.parameters ?? []), ...selected.flatMap((s) => s.parameters ?? [])];
}

/** The pack's declarations for the recorded ids, in **`pack.json` order**
 *  and never the manifest's: scaffold steps write files, so the merge
 *  order *is* the tree. */
function selectedScaffolds(pack: PackJson, ids: readonly string[]): readonly ScaffoldDecl[] {
  const wanted = new Set(ids);
  return (pack.scaffolds ?? []).filter((s) => wanted.has(s.id));
}

async function readIfPresent(file: string): Promise<string | null> {
  try {
    return await readFile(file, 'utf8');
  } catch {
    return null;
  }
}

async function readIfPresentBytes(file: string): Promise<Buffer | null> {
  try {
    return await readFile(file);
  } catch {
    return null;
  }
}

/** Pre-update bytes for a path the preflight has already confirmed is a
 *  regular file inside the project. */
async function readIfRegularFile(absolute: string): Promise<Buffer | null> {
  try {
    if (!lstatSync(absolute).isFile()) return null;
  } catch {
    return null;
  }
  return readIfPresentBytes(absolute);
}

/** `undefined` for text that is not JSON at all — distinct from `null`,
 *  which is the JSON document `null` and a shape fault rather than a parse
 *  one. */
function parseJsonOrUndefined(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}
