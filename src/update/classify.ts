/**
 * The two recomputations, and one disposition per applied path.
 * T-2302, T-2308.
 *
 * ── `update` is `verify` with a second recomputation ──────────────────
 *
 * `expected_old` is F1 §F1.8's identity evaluated over the **local**
 * `.harness/pack/`, its recipe and the manifest's recorded answers and
 * scaffolds — the exact recomputation `verify` performs (F1 US-33).
 * `expected_new` is the same identity with **one argument changed**, the
 * payload, which is the whole of what an update is. Neither is a cache, a
 * stored base or a remote fetch, and that is why Q-62 could reverse Q-42
 * without building anything: the project carries the payload it was applied
 * from, so *"what would the pack have written here?"* is recoverable
 * exactly and *"did the user change this?"* is a byte comparison rather
 * than an inference.
 *
 * ── Both recomputations are SUPPLIED, not performed here ──────────────
 *
 * Same stance, and same sentence, as `verify.ts`: this module runs no
 * plan, because a module that re-derived the apply would be a **second
 * implementation of it**. E-05 renders and E-11 plans; `update` composes.
 * The caller hands in two already-rendered sets and a way to read disk.
 *
 * That also keeps the module **pure**. It opens nothing, writes nothing,
 * and cannot — which matters more here than in `verify`, because what this
 * function returns decides which of the user's files get overwritten.
 *
 * ── The comparison is `verify`'s, not a copy of it ────────────────────
 *
 * `compareOne` answers *state vs `expected_old`* and `contentEqual`
 * answers *did the pack change this path*. Both come from
 * `verify/compare.ts` and neither is reimplemented here. `F3-ADR-004` §1
 * makes this a condition rather than a preference: two comparison
 * implementations answer differently the first time one of them is fixed,
 * and with `verify` the acceptance test for S7 and `update` the thing that
 * maintains it, any divergence is a **silent corruption of the gate**.
 * `classify.test.ts` asserts the agreement on a shared fixture (T-2303).
 *
 * A classification defect in `verify` is a reporting defect. The identical
 * defect here is a **data-loss** defect. Nothing about the code changes;
 * the consequence of getting it wrong does.
 */
import { compareOne, contentEqual, type VerifyState } from '../verify/compare.js';
import type { RecomputedPath } from '../verify/verify.js';
import type { AppliedPath } from '../security/confine.js';

/**
 * **Seven, and the enumeration is closed** (F3 §F3.3 at v1.1, `F3-ADR-004`
 * §10). An eighth is a spec change, not a patch.
 *
 * There is **no `merged` and no `conflicted`**, and their absence is the
 * feature: building either is exactly what Q-62 defined this command not
 * to do. There is also **no `deleted`** — `update` deletes no applied
 * path, ever. The one deletion in the feature is of *payload* files under
 * `.harness/pack/`, which is a `HarnessPath` operation on the CLI's own
 * tree and not a disposition at all. `F3-ADR-004` conflated the two and
 * corrected itself in its §10; the correction is worth more than the fix,
 * because the ADR contradicted the spec **while reading as a summary of
 * it**.
 */
export const DISPOSITIONS = [
  'added',
  'unchanged',
  'replaced',
  'kept-adapted',
  'kept-edited',
  'kept-fill-expected',
  'orphaned',
] as const;

export type Disposition = (typeof DISPOSITIONS)[number];

/** The two that write. Everything else writes nothing, of any kind — not
 *  a `.orig`, not a `.new` sibling, not a marker (US-61). */
export const WRITING_DISPOSITIONS: readonly Disposition[] = ['added', 'replaced'];

/**
 * The four handed over to the user, and to F6 (§F3.4).
 *
 * `unchanged` is not among them: it is silence because nothing differs,
 * whereas each of these is silence because something was **decided**.
 * IM-30 binds every surface that renders them — a path left untouched is
 * the mechanism working, never damage.
 */
export const KEPT_DISPOSITIONS: readonly Disposition[] = [
  'kept-adapted',
  'kept-edited',
  'kept-fill-expected',
  'orphaned',
];

export interface UpdateEntry {
  readonly path: AppliedPath;
  /**
   * The state against `expected_old` — `verify`'s own closed six.
   *
   * **`null` where the path is not in `expected_old` at all**, which is
   * F3 §F3.3's first two rows: their `State vs expected_old` column reads
   * `—`, and there is nothing for the comparison to be against. A state
   * invented for those rows would be a claim about a comparison that did
   * not happen. (`F3-ADR-004`'s contract types this field non-optional and
   * US-71 enumerates four values for what is now a six-value set; the spec
   * table is the authority, per that ADR's own §10.)
   */
  readonly state: VerifyState | null;
  readonly disposition: Disposition;
  /**
   * Did the **pack** change this path too — `expected_new` differing from
   * `expected_old` here.
   *
   * Required by US-61 and US-62 for every kept path, and by US-71 in
   * `--json`, because *"you changed this"* and *"you changed this and so
   * did the pack"* need different work from the reader and **only a
   * recomputation can tell them apart**. `false` where there is no
   * `expected_old` or no `expected_new` — nothing that does not exist on
   * both sides can have changed between them.
   */
  readonly packAlsoChanged: boolean;
  /**
   * The bytes the **new** pack produces here. Present iff the disposition
   * is `kept-edited` (`F3-ADR-004`'s contract).
   *
   * Bytes, not a diff (Q-77): a diff format is a presentation decision the
   * skill is better placed to make, and it would become a compatibility
   * surface the moment anything parsed it. And it cannot be a pointer into
   * `.harness/pack/`, which holds **payload source** — pre-substitution,
   * pre-rewrite, pre-generate — and not what the pack produces.
   *
   * The bytes `added` and `replaced` will be written are carried by
   * `UpdatePlan.writes`, not here, so this field keeps the ADR's `iff`.
   */
  readonly expectedNew?: Buffer;
}

export interface ClassifyInput {
  /** Phase 2 over the **local** `.harness/pack/`, its recipe, and the
   *  manifest's answers and scaffolds. */
  readonly expectedOld: readonly RecomputedPath[];
  /** Phase 2 over the **bundled** payload and its recipe, with **the same**
   *  answers and scaffolds. An update is a pack-version move and nothing
   *  else; varying an answer at the same time would make the result
   *  irreproducible from the manifest (Q-21, Q-22). */
  readonly expectedNew: readonly RecomputedPath[];
  /** What is on disk, for the paths above **only**. `update` never reports
   *  a path the recipe does not produce — the same bound `verify` states.
   *  It is a callback rather than a directory handle so this module cannot
   *  compose a path of its own. */
  readonly onDisk: (path: AppliedPath) => { bytes: Buffer; mode: number | null } | null;
}

/**
 * One disposition per path in `expected_old ∪ expected_new`.
 *
 * Order is `expected_new`'s plan order, then the old-only paths — the
 * orphans — in `expected_old`'s. Deterministic, because G-F3-8 requires two
 * runs on two clones to produce byte-identical trees and the write set is
 * taken from this list.
 *
 * ── The join is by exact path, and the residual is stated ─────────────
 *
 * Old and new are matched by their exact applied path. The alternative was
 * `collisionKey` (F1 N-5), which would additionally join a **case-only or
 * normalization-only rename across a pack version** — `Foo.md` becoming
 * `foo.md` — that this rule instead reports as one `orphaned` plus one
 * `added`, and whose `added` write would then meet the old file on a
 * case-insensitive filesystem. Exact matching is chosen because F3
 * specifies no rule for that rename and inventing one here would be a
 * behavioural decision taken in an implementation file. **Recorded as a
 * gap rather than closed**: N-5 quantifies over step-vs-existing-file
 * comparisons, and this is expectation-vs-expectation.
 */
export function classifyPaths(input: ClassifyInput): readonly UpdateEntry[] {
  const oldByPath = new Map(input.expectedOld.map((r) => [r.path, r]));
  const newByPath = new Map(input.expectedNew.map((r) => [r.path, r]));
  const entries: UpdateEntry[] = [];

  for (const next of input.expectedNew) {
    const prev = oldByPath.get(next.path);

    // Rows 1 and 2 of §F3.3: the newer pack ships a path the applied
    // version did not.
    if (prev === undefined) {
      const occupied = input.onDisk(next.path) !== null;
      // A project file standing where the newer pack newly ships differs
      // from an `expected_old` that has no entry for it, so it is edited
      // by US-61's rule and is left alone. **This is why `update` has no
      // `E-TARGET-EXISTS` branch and no `--force`**: the one thing
      // `--force` does on `init` is relax the pre-existing-path rule, and
      // the classification has already answered that case.
      entries.push(
        occupied
          ? {
              path: next.path,
              state: null,
              disposition: 'kept-edited',
              packAlsoChanged: false,
              expectedNew: next.bytes,
            }
          : { path: next.path, state: null, disposition: 'added', packAlsoChanged: false },
      );
      continue;
    }

    const state = stateOf(prev, input.onDisk);
    const packAlsoChanged = !contentEqual(prev.bytes, next.bytes);
    const disposition = dispositionInBoth(prev, next, state, packAlsoChanged);
    entries.push(
      disposition === 'kept-edited'
        ? { path: next.path, state, disposition, packAlsoChanged, expectedNew: next.bytes }
        : { path: next.path, state, disposition, packAlsoChanged },
    );
  }

  // `orphaned` outranks everything (§F3.3): a path the newer pack does not
  // produce has no new content to write, whatever it looks like now — which
  // is why the state is still computed and reported ("any", US-68) while
  // the disposition is fixed.
  for (const prev of input.expectedOld) {
    if (newByPath.has(prev.path)) continue;
    entries.push({
      path: prev.path,
      state: stateOf(prev, input.onDisk),
      disposition: 'orphaned',
      packAlsoChanged: false,
    });
  }

  return entries;
}

/** `verify`'s comparison, called rather than restated. */
function stateOf(prev: RecomputedPath, onDisk: ClassifyInput['onDisk']): VerifyState {
  const found = onDisk(prev.path);
  return compareOne({
    path: prev.path,
    expected: prev.bytes,
    actual: found?.bytes ?? null,
    expectedMode: prev.mode,
    actualMode: found?.mode ?? null,
    adaptExpected: prev.adaptExpected,
    fillExpected: prev.fillExpected,
  }).state;
}

/**
 * The five rows of §F3.3 where the path is in **both** expectations.
 *
 * ── Two declarations outrank every state, and the order is the point ──
 *
 * **`kept-fill-expected` first** (T-2308, Q-79, F1 US-31). A path in the
 * fill-expected set is **never overwritten**: not when the newer pack
 * changed the file, not when the path is byte-identical to what shipped,
 * and **under no flag**. The prohibition is absolute rather than
 * conditional on the file having been filled, and the reasoning is worth
 * carrying because the conditional version looks obviously better:
 *
 *   - An unfilled brief and a filled one are **indistinguishable to a rule
 *     that has to be right before it looks**. `unfilled` means *matches
 *     what shipped*, and a user who filled a brief with content that
 *     happens to render identically, or who filled it and reverted, or who
 *     is mid-edit, is not distinguishable from one who never started.
 *   - The two errors are **not symmetric**. Over-applying the prohibition
 *     leaves a stale template the user can see and delete in one command.
 *     Under-applying it **silently destroys the document every other
 *     document in the project is downstream of** — a `project-brief.md`,
 *     in every pack — and leaves no trace in the report, because a
 *     replacement is the quiet outcome.
 *
 * A conditional rule would be right most of the time and catastrophic the
 * rest, which is the shape of rule this product refuses.
 *
 * **`kept-adapted` second** (US-62). A path in the adapt-expected set is
 * never replaced **whether or not it currently differs**, and this is the
 * one place `update` deliberately diverges from `verify`'s reading:
 * `verify` reports such a path `match` when it happens to be
 * byte-identical, because the state names what was *found*. `update` is
 * deciding whether to **overwrite**, and a `CLAUDE.md` that is
 * byte-identical today is still the file the skill is expected to rewrite
 * tomorrow. Replacing it because it has not been adapted *yet* would
 * destroy the adaptation on the next run and produce no diagnostic.
 *
 * Both sets are the **union of the two recipes'**. Taking only the old
 * recipe's would replace a newly-declared path exactly once — on the run
 * that introduced the declaration, which is the run the declaration exists
 * to govern (US-62 states this for `adaptExpected`; the same argument is
 * applied to `fillExpected`, where F3 states the union nowhere and the
 * cost of the other reading is a destroyed brief).
 *
 * The state arms below are therefore reachable only for paths in neither
 * set, and are kept **total** anyway: an ordering that works because an
 * earlier branch happens to run first is an ordering that breaks when
 * someone calls this directly. Same reasoning `compare.ts` gives for
 * checking `fillExpected` before `adaptExpected`.
 */
function dispositionInBoth(
  prev: RecomputedPath,
  next: RecomputedPath,
  state: VerifyState,
  packAlsoChanged: boolean,
): Disposition {
  if (prev.fillExpected || next.fillExpected) return 'kept-fill-expected';
  if (prev.adaptExpected || next.adaptExpected) return 'kept-adapted';

  switch (state) {
    case 'match':
      // Unedited. `replaced` and `unchanged` are the same silence to a
      // user and a different write to the executor: writing a file to the
      // bytes it already holds costs a journal entry, a backup and an
      // mtime change for nothing (US-60).
      return packAlsoChanged ? 'replaced' : 'unchanged';
    case 'differs':
      return 'kept-edited';
    case 'missing':
      // **A deletion is an edit** (US-61). A generated file the user
      // removed is NOT re-created — re-creating it would be the one form
      // of "replace the unedited" that overwrites a decision the user
      // made, and it would do so silently.
      return 'kept-edited';
    case 'adapted':
      return 'kept-adapted';
    case 'filled':
    case 'unfilled':
      return 'kept-fill-expected';
    default:
      return unreachable(state);
  }
}

/** A seventh state added to `VERIFY_STATES` without an arm above is a
 *  **compile error**, not a runtime `undefined` that silently picks a
 *  disposition for it. */
function unreachable(state: never): never {
  throw new Error(`classify: unhandled verify state ${JSON.stringify(state)}`);
}

/** Counts per disposition, **all seven present** so a reader never has to
 *  infer a zero from an absent key — `--json` emits this verbatim. */
export function countByDisposition(
  entries: readonly UpdateEntry[],
): Readonly<Record<Disposition, number>> {
  const counts = Object.fromEntries(DISPOSITIONS.map((d) => [d, 0])) as Record<Disposition, number>;
  for (const e of entries) counts[e.disposition]++;
  return counts;
}

/** The paths handed over rather than written. **Not failures**, and no
 *  surface may present them as any (IM-30, US-61): in the writing mode
 *  none of them moves the exit code. */
export function keptEntries(entries: readonly UpdateEntry[]): readonly UpdateEntry[] {
  return entries.filter((e) => KEPT_DISPOSITIONS.includes(e.disposition));
}
