/**
 * The update plan: four ordered gates, then a classification.
 * T-2304, T-2305, T-2306, T-2307.
 *
 * ── The order is the contract, and it is fixed ────────────────────────
 *
 * F3 §F3.2, steps 3–8, minus the steps a planner cannot own:
 *
 *   1. `payloadDigest` over `.harness/pack/`   → suppress everything
 *   2. re-validate every recorded answer       → suppress everything
 *   3. resolve the bundled version             → up to date | refuse | go
 *   4. the two refusals over the NEW pack      → refuse
 *   5. render both sides, classify, plan
 *
 * The journal check, the manifest read, the `realpath` of the project
 * root, the lock and every write are the **command layer's** — E-24's and
 * E-25's, which is why `F3-ADR-004`'s `planUpdate(projectRoot)` signature
 * is not this function's. This one is **pure**: it opens nothing, writes
 * nothing, and takes both renders as **thunks** so that *"the digest gate
 * runs before any recomputation"* is a property of the code rather than a
 * sentence in a spec. A test asserts the thunks are never called when a
 * gate fires.
 *
 * ── Why the gates suppress rather than warn ───────────────────────────
 *
 * `expected_old` is computed **from** `.harness/pack/` and from the
 * recorded answers. Once either is untrusted, every row downstream is a
 * confident statement derived from unknown input. `verify` suppresses for
 * that reason; `update` suppresses for the same reason **one degree more
 * sharply**, because a meaningless classification here does not produce a
 * report the user can ignore — it drives **real writes over their files**.
 * A corrupted payload is exactly what makes an edited file classify
 * unedited (§F3.2, `F3-ADR-004` §1.2).
 *
 * **No flag relaxes any of this, and `--dry-run` relaxes it least of all**
 * (IM-41, US-64): a read-only mode is not a reason to soften a fail-closed
 * gate, it is the mode most likely to be run first, and a
 * plausible-but-meaningless report is precisely what F1 US-33 refuses.
 */
import { DiagnosticBag, type Diagnostic } from '../diag/diagnostic.js';
import { isTreeDigest, type TreeDigest } from '../hash/digest.js';
import { hashBytes } from '../hash/sha256.js';
import { checkRecordedAnswers, type Answer } from '../pack/parameters.js';
import { parametersFor } from '../pack/scaffolds.js';
import { compareSemver, parseSemver } from '../semver/compare.js';
import { payloadPath, type HarnessPath } from '../security/harness-paths.js';
import { classifyPaths, countByDisposition, keptEntries, type Disposition, type UpdateEntry } from './classify.js';
import type { AppliedPath } from '../security/confine.js';
import type { PackJson, ParameterDecl, ScaffoldDecl } from '../pack/types.js';
import type { RecomputedPath } from '../verify/verify.js';

// ── 1 + 2. The gates (T-2304) ───────────────────────────────────────────

export interface UpdateGateInput {
  /** The digest the manifest recorded. */
  readonly recordedDigest: string;
  /** The digest computed over `.harness/pack/` **now**. */
  readonly computedDigest: TreeDigest;
  /** The **applied** pack's declarations — what the recorded answers were
   *  recorded against, and therefore what they must still satisfy. */
  readonly declarations: readonly ParameterDecl[];
  readonly recordedAnswers: ReadonlyMap<string, Answer>;
}

export interface GateResult {
  /** False iff a gate fired. Every caller must treat this as *stop*, not
   *  as *proceed with fewer rows*. */
  readonly passed: boolean;
  readonly bag: DiagnosticBag;
}

/**
 * The digest gate, **first and suppressing**, then the recorded answers.
 *
 * Both are exit 2 and **zero bytes**, in both modes. The residual is
 * stated rather than hidden and it is F1's known limit 7, inherited
 * unchanged: a **pure line-ending edit** of the payload does not move the
 * digest, because the digest is over normalized content. It is harmless
 * here for the same reason it is harmless to `verify` — the classification
 * compares normalized content too — so such a payload yields the same
 * dispositions a byte-identical one would.
 */
export function checkUpdateGates(input: UpdateGateInput): GateResult {
  const bag = new DiagnosticBag();

  const digestMatched =
    isTreeDigest(input.recordedDigest) && input.recordedDigest === input.computedDigest;
  if (!digestMatched) {
    bag.add('E-PAYLOAD-DIGEST-MISMATCH', {
      values: { recorded: input.recordedDigest, computed: input.computedDigest },
    });
    return { passed: false, bag };
  }

  // The answers are the recomputation's other input, so the same
  // suppression rule applies for the same reason (C-29, F1 US-8).
  const faults = checkRecordedAnswers(input.declarations, input.recordedAnswers);
  if (faults.length > 0) {
    for (const d of faults.items) bag.push(d);
    return { passed: false, bag };
  }

  return { passed: true, bag };
}

// ── 3. Version resolution (T-2305) ──────────────────────────────────────

/** `newer` proceeds; `current` stops at exit 0 with no code; `not-newer`
 *  refuses. Equal and older are one function because they are one question
 *  asked of one comparison — they differ only in the answer. */
export type VersionVerdict = 'newer' | 'current' | 'not-newer';

export interface VersionResult {
  readonly verdict: VersionVerdict;
  readonly bag: DiagnosticBag;
}

/**
 * Compare the applied pack version against the **bundled** one.
 *
 * **`update` never resolves "newer" over the wire.** A project moves to
 * the version bundled in the installed `@lintel/cli`, which is what keeps
 * §NFR *No network* true for **every** v1.0 command with no exception; the
 * remedy for "nothing newer" is upgrading the package (Q-2).
 *
 * **The CLI version is recorded, not compared** (US-70). A CLI upgrade
 * shipping the same pack version is a no-op here. The case where a CLI
 * upgrade changes what a primitive renders *at a fixed pack version* is
 * out of scope at v1.0 and is a known limit, not an oversight (Q-73): it
 * surfaces as `verify` drift and is a CLI defect to fix, not a project
 * state to update.
 *
 * **A version that will not parse is treated as not-newer**, fail-closed.
 * Both strings are validated upstream — the manifest by `read.ts`, the
 * bundled `pack.json` by `validatePackJson` — so this is unreachable; it
 * refuses rather than throwing because the alternative to refusing is
 * writing over a user's files on the strength of a comparison that could
 * not be made.
 */
export function resolveTargetVersion(args: {
  readonly pack: string;
  readonly applied: string;
  readonly bundled: string;
  readonly cliVersion: string;
}): VersionResult {
  const bag = new DiagnosticBag();
  const values = {
    pack: args.pack,
    applied: args.applied,
    bundled: args.bundled,
    cliVersion: args.cliVersion,
  };

  const applied = parseSemver(args.applied);
  const bundled = parseSemver(args.bundled);
  if (applied === null || bundled === null) {
    bag.add('E-UPDATE-NOT-NEWER', { values });
    return { verdict: 'not-newer', bag };
  }

  const cmp = compareSemver(bundled, applied);
  if (cmp === 0) {
    // Nothing is wrong and nothing is expected to change, so **no code**
    // (US-70). Exit 0, zero bytes, in both modes.
    return { verdict: 'current', bag };
  }
  if (cmp < 0) {
    // A downgrade that replaced unedited paths would be indistinguishable
    // in the report from an upgrade that did. This is the same skew F1's
    // `W-PACK-NEWER-THAN-CLI` describes for `verify`, where it is
    // correctly a warning because `verify` only reads; here the bundle is
    // an **input to a write**, so the same skew is fatal — one fault, two
    // occasions, two codes, which is F1's own severity rule.
    bag.add('E-UPDATE-NOT-NEWER', { values });
    return { verdict: 'not-newer', bag };
  }
  return { verdict: 'newer', bag };
}

// ── 4. The two refusals (T-2306) ────────────────────────────────────────

export interface ResolveUpdateInput {
  /** The **bundled** pack's declaration. */
  readonly bundled: PackJson;
  readonly appliedVersion: string;
  readonly recordedAnswers: ReadonlyMap<string, Answer>;
  /** Scaffold ids the manifest records as selected, in declared order. */
  readonly recordedScaffolds: readonly string[];
}

export interface ResolveUpdateResult {
  /** The new pack's declarations for the surviving selection, in
   *  `pack.json` order. */
  readonly declarations: readonly ParameterDecl[];
  readonly selected: readonly ScaffoldDecl[];
  /**
   * The answers `expected_new` is rendered from, and the answers the
   * rewritten manifest records: every recorded answer the new pack still
   * declares, plus the declared default of every parameter it newly
   * declares.
   */
  readonly answers: ReadonlyMap<string, Answer>;
  /** Ids whose recorded answer the new pack no longer declares. Dropped
   *  from the rewritten manifest **silently** (US-69) — keeping one would
   *  leave the manifest recording an answer to a question the pack no
   *  longer asks. */
  readonly dropped: readonly string[];
  readonly ok: boolean;
  readonly bag: DiagnosticBag;
}

/**
 * The two refusals that stop a run before anything is planned.
 *
 * Both are **exit 2 and zero bytes**, and class 2 is the point rather than
 * a detail. Class 1 means *you can fix this* (IM-39) and the user
 * **cannot**: Q-21 and Q-22 forbid supplying or changing an answer or a
 * scaffold after the apply, and there is no `--set` and no `--scaffold` on
 * this command. What is wrong is that the pack introduced something
 * unanswerable across a version boundary — an authoring fault, which is
 * what class 2 names, and whose remedy addresses the pack author.
 *
 * **`E-UPDATE-SCAFFOLD-DROPPED`** — a selected scaffold the new pack no
 * longer declares. Computing `expected_new` without it would silently
 * orphan every path that scaffold produced, removing a whole selected
 * feature on a version bump.
 *
 * **`E-UPDATE-PARAM-UNANSWERED`** — a parameter the new pack declares
 * `required` with **no `default`**, for which the manifest holds no
 * answer. A new parameter that **does** declare a default is not a fault:
 * its default is used and is recorded into the rewritten manifest, which
 * is the only case in which `update` adds an entry to `parameters` — and
 * it adds no key to the manifest schema (US-69, G-F3-6). That is
 * deliberately the same rule `resolveAnswers` applies at `init`, so a
 * parameter resolves identically whichever command met it first.
 *
 * Both checks run, and both report, in one pass. A user who has to fix two
 * authoring faults should learn about both at once; and neither outcome
 * writes anything, so there is no risk in continuing to look.
 *
 * `E-SCAFFOLD-UNKNOWN` is deliberately **not** used for the dropped
 * scaffold: that code is reserved for an id a *user* typed, and nobody
 * typed this one.
 */
export function resolveUpdateInputs(input: ResolveUpdateInput): ResolveUpdateResult {
  const bag = new DiagnosticBag();
  const { bundled, appliedVersion } = input;
  const declaredScaffolds = bundled.scaffolds ?? [];
  const byId = new Map(declaredScaffolds.map((s) => [s.id, s]));

  let ok = true;
  for (const id of input.recordedScaffolds) {
    if (byId.has(id)) continue;
    ok = false;
    bag.add('E-UPDATE-SCAFFOLD-DROPPED', {
      values: { pack: bundled.name, bundled: bundled.version, name: id },
    });
  }

  // In `pack.json` order, never the manifest's, for the same reason
  // `selectScaffolds` orders that way: scaffold steps write files, so the
  // merge order *is* the tree.
  const wanted = new Set(input.recordedScaffolds);
  const selected = declaredScaffolds.filter((s) => wanted.has(s.id));
  const declarations = parametersFor(bundled, selected);

  const answers = new Map<string, Answer>();
  for (const p of declarations) {
    const recorded = input.recordedAnswers.get(p.id);
    if (recorded !== undefined) {
      answers.set(p.id, recorded);
      continue;
    }
    if (p.default !== undefined) {
      answers.set(p.id, p.default);
      continue;
    }
    if (p.required === true) {
      ok = false;
      bag.add('E-UPDATE-PARAM-UNANSWERED', {
        values: {
          pack: bundled.name,
          bundled: bundled.version,
          applied: appliedVersion,
          id: p.id,
        },
        // US-69 requires the parameter's **prompt** to reach the user and
        // F1's catalogue line has no `{prompt}` slot, so it travels as
        // structured data rather than being spliced into prose this
        // module does not own. A code's message is F1's, always.
        data: { prompt: p.prompt },
      });
    }
  }

  const stillDeclared = new Set(declarations.map((p) => p.id));
  const dropped = [...input.recordedAnswers.keys()].filter((id) => !stillDeclared.has(id));

  return { declarations, selected, answers, dropped, ok, bag };
}

// ── 5. The plan (T-2307) ────────────────────────────────────────────────

/**
 * One applied write. **The bytes are here**, rendered at plan time, so the
 * executor reads no payload file (C-23).
 *
 * That removes a window rather than saving a read: an execute-time render
 * lets content change between steps, and that content would have passed no
 * validation, appeared in no disclosure and been covered by no
 * `payloadDigest`.
 */
export interface PlannedWrite {
  readonly path: AppliedPath;
  readonly bytes: Buffer;
  readonly mode: number;
  /** `added` creates exclusively; `replaced` re-hashes the destination and
   *  renames over it. Not the same write, which is why the disposition is
   *  carried rather than re-derived. */
  readonly disposition: 'added' | 'replaced';
  /**
   * **What the plan observed on disk**, so the executor can confirm it is
   * still true immediately before the `rename` (US-66: every replacement
   * is `lstat`ed, confirmed a regular file, re-hashed and confirmed still
   * equal to what the plan observed).
   *
   * `null` for `added`, where the plan observed nothing — the executor's
   * exclusive create is what checks that case, and a hash of an absent
   * file would be a claim about something that was not there.
   *
   * Raw bytes, not normalized content. The classification compares
   * normalized content because it is asking *did the user change this*;
   * this field is asking *did anything at all move under us since we
   * looked*, and a line-ending rewrite between plan and write is exactly
   * the kind of movement it must refuse to write through.
   */
  readonly preHash: string | null;
  readonly preMode: number | null;
}

export interface UpdatePlanInput {
  readonly applied: { readonly pack: string; readonly version: string };
  /** The bundled pack, resolved **by the manifest's recorded pack name**
   *  (US-59). `update` takes no pack argument, so it can never run against
   *  a pack the project never applied — Q-12 enforced by the surface. */
  readonly bundled: PackJson;
  readonly cliVersion: string;
  readonly recordedDigest: string;
  readonly computedDigest: TreeDigest;
  /** The **applied** pack's parameter declarations, read from
   *  `.harness/pack/`. */
  readonly appliedDeclarations: readonly ParameterDecl[];
  readonly recordedAnswers: ReadonlyMap<string, Answer>;
  readonly recordedScaffolds: readonly string[];
  /** Phase 2 over the local payload. **Called only if every gate passes.** */
  readonly renderOld: () => readonly RecomputedPath[];
  /** Phase 2 over the bundled payload, with the answers and scaffolds the
   *  refusal step resolved. **Called only if every gate and both refusals
   *  pass.** */
  readonly renderNew: (resolved: {
    readonly answers: ReadonlyMap<string, Answer>;
    readonly selected: readonly ScaffoldDecl[];
  }) => readonly RecomputedPath[];
  readonly onDisk: (path: AppliedPath) => { bytes: Buffer; mode: number | null } | null;
  /** Pack-relative POSIX paths of every file in `.harness/pack/`. */
  readonly oldPayload: readonly string[];
  /** Pack-relative POSIX paths of every file in the bundled payload. */
  readonly newPayload: readonly string[];
}

export interface UpdatePlan {
  readonly from: { readonly pack: string; readonly version: string };
  readonly to: { readonly pack: string; readonly version: string };
  readonly entries: readonly UpdateEntry[];
  readonly counts: Readonly<Record<Disposition, number>>;
  /** `added` and `replaced`, in plan order. */
  readonly writes: readonly PlannedWrite[];
  /**
   * **Payload** orphans, and the one deletion in the feature.
   *
   * A file in the old payload and absent from the new is removed from
   * `.harness/pack/`. The default is **necessarily reversed** there and
   * the first reason is decisive: `.harness/pack/` is a **verbatim copy**
   * of the pack (Q-39, F1 US-30), so a payload carrying a file the pack no
   * longer ships would not hash to the digest `update` records — and
   * `verify` would then fail with `E-PAYLOAD-DIGEST-MISMATCH` **forever
   * after every update**, with no remedy short of a fresh `init`. It is
   * also not the user's file: it carries `HarnessPath`, and no recipe step
   * may write there at all (F1 C-5).
   *
   * **Not a disposition.** These are not applied paths, and `update`
   * deletes no applied path, ever (`F3-ADR-004` §10).
   */
  readonly payloadDeletes: readonly HarnessPath[];
  /** The paths handed over — the whole of what F6 reconciles (§F3.4). */
  readonly kept: readonly UpdateEntry[];
  /**
   * **Every fill-expected path either recipe declares** — the union, not
   * the new recipe's alone, and not a filter of `entries`.
   *
   * Carried so the **executor** can enforce Q-79 independently of the
   * classification rather than inheriting its conclusion. The prohibition
   * is absolute (F1 US-31, T-2308): a fill-expected path is never
   * overwritten by `update`, whatever the newer pack changed, whatever the
   * bytes on disk say, under no flag. `dispositionInBoth` already ensures
   * such a path cannot become a write; this list is what lets
   * `executeUpdate` **check** that rather than trust it, so a future
   * disposition rule cannot reach the writer through a classification bug.
   *
   * A defence in depth is only worth having when it is derived
   * independently, which is why this is built from the two renders'
   * declarations and never from `entries`.
   */
  readonly fillExpected: readonly AppliedPath[];
  /** Ids dropped from the rewritten manifest (US-69). */
  readonly droppedParameters: readonly string[];
  /** The answers the rewritten manifest records. */
  readonly answers: ReadonlyMap<string, Answer>;
  readonly selected: readonly ScaffoldDecl[];
  /**
   * True iff a gate or a refusal fired and the classification did not run.
   *
   * **A caller must not read an empty `entries` as "nothing to do".**
   * Emptiness has three causes here — suppression, being up to date, and a
   * pack that produces no path — and only these flags tell them apart.
   */
  readonly suppressed: boolean;
  /** True iff the bundled version equals the applied one: exit 0, zero
   *  bytes, no code, both modes. */
  readonly upToDate: boolean;
  readonly diagnostics: readonly Diagnostic[];
  /** True iff nothing refused the run. */
  readonly ok: boolean;
}

/**
 * Gates, then refusals, then the classification, then the plan.
 *
 * Pure and synchronous. Nothing here writes, and the write path — lock,
 * journal v3, phase 1, phase 2, manifest — is E-24's. The separation is
 * what lets `--dry-run` be *the same computation without the second half*
 * rather than a second implementation of it (US-63).
 */
export function planUpdate(input: UpdatePlanInput): UpdatePlan {
  const bag = new DiagnosticBag();
  const from = { pack: input.applied.pack, version: input.applied.version };
  const to = { pack: input.bundled.name, version: input.bundled.version };

  const stop = (over: Partial<UpdatePlan> = {}): UpdatePlan => ({
    from,
    to,
    entries: [],
    counts: countByDisposition([]),
    writes: [],
    payloadDeletes: [],
    kept: [],
    fillExpected: [],
    droppedParameters: [],
    answers: new Map(),
    selected: [],
    suppressed: true,
    upToDate: false,
    diagnostics: bag.items,
    ok: bag.errors.length === 0,
    ...over,
  });

  const gates = checkUpdateGates({
    recordedDigest: input.recordedDigest,
    computedDigest: input.computedDigest,
    declarations: input.appliedDeclarations,
    recordedAnswers: input.recordedAnswers,
  });
  for (const d of gates.bag.items) bag.push(d);
  if (!gates.passed) return stop();

  const version = resolveTargetVersion({
    pack: from.pack,
    applied: from.version,
    bundled: to.version,
    cliVersion: input.cliVersion,
  });
  for (const d of version.bag.items) bag.push(d);
  if (version.verdict === 'not-newer') return stop();
  if (version.verdict === 'current') {
    // Not a fault and not a suppression: there is simply nothing to do.
    return stop({ suppressed: false, upToDate: true });
  }

  const resolved = resolveUpdateInputs({
    bundled: input.bundled,
    appliedVersion: from.version,
    recordedAnswers: input.recordedAnswers,
    recordedScaffolds: input.recordedScaffolds,
  });
  for (const d of resolved.bag.items) bag.push(d);
  if (!resolved.ok) return stop();

  // Each thunk is called **exactly once**. Two calls would be two renders,
  // and a render is only guaranteed to be a pure function of its inputs —
  // planning from one and writing from another is the class of bug C-23
  // exists to remove.
  const expectedNew = input.renderNew({
    answers: resolved.answers,
    selected: resolved.selected,
  });
  const expectedOld = input.renderOld();
  const entries = classifyPaths({ expectedOld, expectedNew, onDisk: input.onDisk });

  // Built from the **declarations** of both renders, never from the
  // dispositions above — see `UpdatePlan.fillExpected` for why an
  // independently derived list is the only kind worth checking against.
  const fillExpected = new Set<AppliedPath>();
  for (const r of expectedOld) if (r.fillExpected) fillExpected.add(r.path);
  for (const r of expectedNew) if (r.fillExpected) fillExpected.add(r.path);

  const byPath = new Map(expectedNew.map((r) => [r.path, r]));

  const writes: PlannedWrite[] = [];
  for (const e of entries) {
    if (e.disposition !== 'added' && e.disposition !== 'replaced') continue;
    const rendered = byPath.get(e.path);
    /* c8 ignore next — a write set member absent from the render it came
       from is not reachable; kept so a future change cannot silently plan
       a write with no bytes. */
    if (rendered === undefined) continue;
    // The plan's observation, taken here rather than in the executor: the
    // executor's job is to confirm nothing moved between **planning** and
    // writing, and it can only do that against what planning saw.
    const found = e.disposition === 'replaced' ? input.onDisk(e.path) : null;
    writes.push({
      path: e.path,
      bytes: rendered.bytes,
      mode: rendered.mode,
      disposition: e.disposition,
      preHash: found === null ? null : hashBytes(found.bytes),
      preMode: found?.mode ?? null,
    });
  }

  return {
    from,
    to,
    entries,
    counts: countByDisposition(entries),
    writes,
    payloadDeletes: payloadOrphans(bag, from.pack, input.oldPayload, input.newPayload),
    kept: keptEntries(entries),
    fillExpected: [...fillExpected],
    droppedParameters: resolved.dropped,
    answers: resolved.answers,
    selected: resolved.selected,
    suppressed: false,
    upToDate: false,
    diagnostics: bag.items,
    ok: bag.errors.length === 0,
  };
}

/**
 * Payload paths the new pack no longer ships, branded.
 *
 * Matched by exact path, in the old payload's order. Branded through
 * `payloadPath()` rather than carried as strings because C-14's rule is
 * that **nothing takes a bare string**: the journal, the writer and
 * rollback accept a `WritablePath` and a path that skipped the gate should
 * be a compile error rather than a review comment.
 *
 * **A user-added file under `.harness/pack/` cannot reach here.** It would
 * already have moved the tree digest, so the gate above refuses the run
 * before anything is planned — the case is closed by an earlier rule
 * rather than handled by this one.
 */
function payloadOrphans(
  bag: DiagnosticBag,
  packName: string,
  oldPayload: readonly string[],
  newPayload: readonly string[],
): readonly HarnessPath[] {
  const shipped = new Set(newPayload);
  const out: HarnessPath[] = [];
  for (const sub of oldPayload) {
    if (shipped.has(sub)) continue;
    const { path, bag: faults } = payloadPath(packName, sub);
    for (const d of faults.items) bag.push(d);
    if (path !== undefined) out.push(path);
  }
  return out;
}
