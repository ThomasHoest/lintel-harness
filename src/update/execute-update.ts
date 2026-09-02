/**
 * `executeUpdate` — **the only writer in this feature**. T-2401, T-2402,
 * T-2407.
 *
 * §F3.2's steps 11–15, in this order and no other:
 *
 *   journal (**v3, `command: "update"`**) → **phase 1** (replace the
 *   payload, delete its orphans) → **phase 2** (replace unedited applied
 *   paths) → manifest → journal removal
 *
 * Step 10, the lock, is the caller's: it is a `.harness/lock` write with
 * its own three-condition break rule (`fs/lock.ts`), taken and released
 * *around* this call exactly as at `init`, and `--dry-run` never reaches
 * either. Everything from the journal onwards is here.
 *
 * ── It computes nothing, and here that is a data-loss control ─────────
 *
 * Every byte it writes was decided by `planUpdate`: rendered from the
 * bundled payload at plan time (C-23), classified against a recomputed
 * `expected_old`, and shown in the disclosure. This module reads the
 * filesystem **only** to check destinations and to capture the pre-update
 * bytes a rollback restores from.
 *
 * `init`'s executor says the same thing and means something weaker by it.
 * There, a mistaken write lands in a directory that had no pack content;
 * here it lands **on top of the user's work**, and there is no *delete
 * `.harness/` and start over* to fall back on (US-66). A module that
 * recomputed anything at write time could disagree with the classification
 * the user was shown, and the visible outcome of that disagreement is a
 * replaced file that should have been kept.
 *
 * ── Why the order is exactly this ─────────────────────────────────────
 *
 * **The journal before the first write**, flushed, so a crash at any later
 * point leaves a record of what was intended — in both directions, because
 * this command deletes as well as writes.
 *
 * **Phase 1 before phase 2**, which is a choice rather than a necessity
 * (US-65): every byte phase 2 writes was rendered at plan time, so the two
 * phases are order-independent, and payload-first is chosen to match
 * `init`'s lifecycle so that one journal shape and one rollback serve both
 * writing commands.
 *
 * **The manifest last, and it is the commit point.** Before it the project
 * is mid-update and the journal says so; after it the project is at the new
 * version. The manifest and the payload move together or neither moves
 * (US-65), and *"together"* is implemented by writing the manifest last and
 * making every earlier write reversible from the journal.
 *
 * **The manifest is journalled, unlike at `init`.** `executeApply` leaves
 * it out of the journal, which is harmless there — a rolled-back `init`
 * wants the manifest **gone**, and a manifest that was never journalled is
 * simply one rollback does not restore. Here the manifest **pre-exists and
 * must come back**: US-66 requires a rolled-back update to leave the
 * project byte-identical to the snapshot before it, *"`.harness/pack/` and
 * the manifest included"*. So it is the last journal entry and the last
 * write, and those are the same position on purpose.
 *
 * ── There is no resume, and this module is where that is decided ──────
 *
 * Nothing here checks for a partially completed previous run, and nothing
 * may. `expected_old` is computed **from** `.harness/pack/`, and by the
 * time a resume could run, phase 1 has already replaced it — so a resumed
 * update would classify every edited path as unedited and replace it. The
 * failure is silent, which is why the answer is *rollback, then re-run*
 * (§F3.2) rather than a smarter executor.
 */
import { lstat, unlink } from 'node:fs/promises';
import { DiagnosticBag } from '../diag/diagnostic.js';
import { hashBytes } from '../hash/sha256.js';
import { atomicWrite, writePlain } from '../fs/atomic-write.js';
import {
  buildJournal,
  type Journal,
  type JournalIntent,
  type PlannedWrite as JournalWrite,
} from '../fs/journal.js';
import { confineAtWrite, type ProjectRoot } from '../security/resolve.js';
import type { HarnessPath, WritablePath } from '../security/harness-paths.js';
import type { PlannedFile } from '../apply/plan.js';
import type { PlannedWrite } from './plan-update.js';

export interface UpdateWriteInputs {
  readonly root: ProjectRoot;
  /**
   * **Phase 1** — the bundled payload, verbatim, into `.harness/pack/`.
   * Planned by `planPayloadCopy` and probed against the destination
   * exactly as `planApply` does, because this module confirms the plan's
   * observation rather than making its own.
   */
  readonly payloadWrites: readonly PlannedFile[];
  /**
   * **Phase 1** — `UpdatePlan.payloadDeletes`: files the old payload has
   * and the new one does not.
   *
   * **The one deletion in the feature, and it is not an applied path.**
   * `update` deletes no applied path, ever (F1 Q-25, F3 §F3.6 item 4,
   * `F3-ADR-004` §10); an applied orphan is reported and left. These carry
   * `HarnessPath`, so the type says which tree they are in.
   */
  readonly payloadDeletes: readonly HarnessPath[];
  /** **Phase 2** — `UpdatePlan.writes`: the `added` and `replaced` paths
   *  only, with the bytes rendered at plan time. */
  readonly writes: readonly PlannedWrite[];
  /**
   * `UpdatePlan.fillExpected` — the union of both recipes' declarations.
   *
   * Passed so this module can **refuse** rather than trust; see
   * `assertNoFillExpectedWrite` below.
   */
  readonly fillExpected: readonly string[];
  /** The rewritten manifest. Written **last**, and journalled, unlike at
   *  `init`. */
  readonly manifest: { readonly path: HarnessPath; readonly bytes: Buffer };
  /** Persists the journal document. Injected so the ordering can be
   *  asserted without a filesystem. */
  readonly writeJournal: (journal: Journal) => Promise<void>;
  /** Removes `.harness/journal.json` **and** `.harness/journal.d/`. Called
   *  only after the manifest lands. */
  readonly removeJournal: () => Promise<void>;
  /** Pre-update bytes for a path the preflight has already confirmed is a
   *  regular file inside the project. **Never called before that check** —
   *  that ordering is C-51's whole point. */
  readonly readExisting: (path: WritablePath) => Promise<Buffer | null>;
}

export interface UpdateWriteResult {
  readonly written: readonly WritablePath[];
  /** Payload paths removed. Typed `WritablePath` rather than
   *  `HarnessPath` because narrowing it back would take a cast, and
   *  **nothing casts into a path brand** (C-14) — the inputs already carry
   *  the narrower type, which is where it matters. */
  readonly deleted: readonly WritablePath[];
  readonly createdDirs: readonly string[];
  /** True iff the manifest landed. `false` means the project is mid-update
   *  and the journal is the way back — `lintel harness update --rollback`. */
  readonly complete: boolean;
  readonly bag: DiagnosticBag;
}

/**
 * One planned filesystem action, in execution order.
 *
 * Phase-1 writes, phase-1 deletes, phase-2 writes and the manifest are
 * four different inputs with four different shapes; the journal needs one
 * ordered list, and **the journal's entry order is the backup file's index
 * order** (`backupPathFor`). Normalising once here is what keeps those two
 * orders the same object rather than two lists that agree today.
 */
interface Op {
  readonly path: WritablePath;
  /** Empty for a delete — a delete has no intended content, which is why
   *  its journal entry has no intended hash. */
  readonly bytes: Buffer;
  readonly mode: number;
  readonly intent: JournalIntent;
  /** What the **plan** observed: `true` where it expects to overwrite,
   *  `false` where it expects to create. */
  readonly planExpectsExisting: boolean;
  /** What the plan observed the destination hashed to, or `null` where it
   *  observed nothing or did not hash. */
  readonly planHash: string | null;
}

/** An op that has passed the preflight, with what it found. */
interface Checked {
  readonly op: Op;
  readonly pre: { readonly bytes: Buffer; readonly mode: number | null } | null;
}

export async function executeUpdate(inputs: UpdateWriteInputs): Promise<UpdateWriteResult> {
  const bag = new DiagnosticBag();
  const written: WritablePath[] = [];
  const deleted: WritablePath[] = [];
  const createdDirs: string[] = [];
  const knownDirs = new Set<string>();

  assertNoFillExpectedWrite(inputs);

  const ops = plannedOps(inputs);

  /* ── preflight: confine and type-check EVERY target, before any read ─ */

  const preflight = await checkTargets(inputs, ops);
  for (const d of preflight.bag.items) bag.push(d);
  if (preflight.checked === undefined) {
    // Zero bytes: no journal, no backup, nothing moved. The whole point of
    // doing this before the journal is that a target that has changed
    // since planning stops the run while stopping is still free.
    return { written, deleted, createdDirs, complete: false, bag };
  }
  const checked = preflight.checked;

  /* ── the journal, before the first write ───────────────────────────── */

  const journalWrites: JournalWrite[] = checked.map((c) => ({
    path: c.op.path,
    bytes: c.op.bytes,
    intent: c.op.intent,
    pre: c.pre,
  }));

  const journal = buildJournal('update', journalWrites, []);
  await inputs.writeJournal(journal);

  // Backups before the writes and deletes they protect — a backup written
  // afterwards is a backup of the new content, or of nothing at all.
  for (const [i, entry] of journal.entries.entries()) {
    if (entry.backup === undefined) continue;
    const pre = journalWrites[i]?.pre;
    /* c8 ignore next — `buildJournal` only emits a backup where `pre` is
       non-null; kept so a change to that rule cannot silently write an
       empty backup over a real one. */
    if (pre === undefined || pre === null) continue;
    await writePlain(`${inputs.root}/${entry.backup}`, pre.bytes);
  }

  /* ── phase 1, then phase 2, then the manifest ──────────────────────── */

  for (const c of checked) {
    const gate = await confineAtWrite(inputs.root, c.op.path, { index: 0 });
    for (const d of gate.bag.items) bag.push(d);
    if (gate.absolute === undefined) {
      return { written, deleted, createdDirs, complete: false, bag };
    }

    if (c.op.intent === 'delete') {
      // T-2407, C-51. The second of two checks on this target, and they
      // close different windows: the preflight one protected the **read**
      // that captured the backup, this one protects the **unlink**. Both
      // are needed because they happen at different moments, and C-14's
      // rule is that the check immediately precedes the act.
      const still = await targetStat(gate.absolute);
      if (still.type !== 'file') {
        bag.add('E-TARGET-RACE', {
          values: { path: c.op.path, detail: raceDetail(still.type, 'a regular file to remove') },
        });
        return { written, deleted, createdDirs, complete: false, bag };
      }
      await unlink(gate.absolute);
      deleted.push(c.op.path);
      continue;
    }

    const outcome = await atomicWrite(
      inputs.root,
      {
        // F1 v5.9 — `E-WRITE-FAILED` and `E-TARGET-RACE` render the
        // rollback command from this, and a default of `'init'` would
        // send a user recovering a crashed `update` to a command that
        // answers `E-ALREADY-APPLIED`.
        command: 'update',
        path: c.op.path,
        bytes: c.op.bytes,
        mode: c.op.mode,
        // `link`-then-`unlink` where the plan expects to create, `rename`
        // where it expects to overwrite. Not the same write, which is why
        // the disposition travelled this far (`F3-ADR-004` §10).
        expectNew: !c.op.planExpectsExisting,
      },
      knownDirs,
    );
    for (const d of outcome.bag.items) bag.push(d);
    createdDirs.push(...outcome.createdDirs);
    if (!outcome.ok) {
      // Stop at the first failure. The journal is intact and every write
      // so far is reversible; continuing would write more to undo.
      return { written, deleted, createdDirs, complete: false, bag };
    }
    written.push(c.op.path);
  }

  // Only now. Between the manifest landing and this line the update is
  // complete but still recoverable, which is the safe order to be in.
  await inputs.removeJournal();

  return { written, deleted, createdDirs, complete: true, bag };
}

/**
 * The four inputs as one ordered list.
 *
 * The order **is** the contract of §F3.2 steps 12–14: payload writes,
 * payload deletes, applied writes, manifest. Deletes follow the payload
 * writes rather than preceding them so that a crash between the two leaves
 * a payload that is a superset of the new one — recoverable either way,
 * but the superset is the state `verify` describes accurately.
 */
function plannedOps(inputs: UpdateWriteInputs): readonly Op[] {
  const ops: Op[] = [];

  for (const f of inputs.payloadWrites) {
    ops.push({
      path: f.path,
      bytes: f.bytes,
      mode: f.executable ? 0o755 : 0o644,
      intent: 'write',
      planExpectsExisting: f.preExisting,
      planHash: f.preHash,
    });
  }

  for (const p of inputs.payloadDeletes) {
    ops.push({
      path: p,
      bytes: Buffer.alloc(0),
      mode: 0o644,
      intent: 'delete',
      planExpectsExisting: true,
      // The plan lists payload orphans by path and does not hash them —
      // `payloadOrphans` compares two file lists, not two trees of bytes.
      // The type check below is the whole of what guards this op, and it
      // is what C-51 asks for.
      planHash: null,
    });
  }

  for (const w of inputs.writes) {
    ops.push({
      path: w.path,
      bytes: w.bytes,
      mode: w.mode,
      intent: 'write',
      planExpectsExisting: w.disposition === 'replaced',
      planHash: w.preHash,
    });
  }

  ops.push({
    path: inputs.manifest.path,
    bytes: inputs.manifest.bytes,
    mode: 0o644,
    intent: 'write',
    // `update` runs only against an applied project — the CLI read this
    // very file to learn which pack to update. If it is gone by now,
    // something else is writing the project and stopping is right.
    planExpectsExisting: true,
    planHash: null,
  });

  return ops;
}

interface PreflightResult {
  /** Absent iff a target failed. The run stops, having written nothing. */
  readonly checked?: readonly Checked[];
  readonly bag: DiagnosticBag;
}

/**
 * Confine and type-check every target, then capture what it holds.
 *
 * ── The order inside this function is the security property (C-51) ────
 *
 * **Confine, then `lstat`, then read.** `update` reads the pre-update
 * bytes of everything it is about to overwrite or delete, into
 * `.harness/journal.d/`, so that a rollback can put them back. A read is
 * the dangerous half:
 *
 *   - `confineAtWrite` walks the **ancestors** and refuses a symlinked one
 *     — but it does not `lstat` the final component, because a destination
 *     that does not exist yet is the normal case at `init`;
 *   - so a **symlink at the target itself** would pass confinement, and
 *     reading through it would capture bytes from **outside the project**
 *     into a file inside it.
 *
 * That is why the type check is here and not left to the write. Deleting a
 * symlink removes the link and not its target, so the unlink was never the
 * risk; **the backup is**, which is the half that is easy to miss when
 * reasoning about deletion alone (`F3-ADR-004` §9).
 *
 * ── A target that has moved stops the run while stopping is free ──────
 *
 * Everything here happens **before the journal**, so a race found at this
 * point costs zero bytes: no journal, no backup, no partial update to roll
 * back. `E-TARGET-RACE` is exit 2, and its detail names which way the
 * destination disagreed with the plan rather than saying only that it did.
 */
async function checkTargets(
  inputs: UpdateWriteInputs,
  ops: readonly Op[],
): Promise<PreflightResult> {
  const bag = new DiagnosticBag();
  const checked: Checked[] = [];

  for (const op of ops) {
    const gate = await confineAtWrite(inputs.root, op.path, { index: 0 });
    for (const d of gate.bag.items) bag.push(d);
    if (gate.absolute === undefined) return { bag };

    const { type, mode } = await targetStat(gate.absolute);

    if (type === 'other') {
      bag.add('E-TARGET-RACE', {
        values: { path: op.path, detail: raceDetail(type, 'a regular file') },
      });
      return { bag };
    }

    if (op.intent === 'delete') {
      // Already gone. The intent is *this file must not be in the payload*
      // and it is not, so there is nothing to journal and nothing to undo.
      // Dropping the op here rather than at plan time is deliberate: the
      // plan compares two file **lists** and cannot know what disk holds.
      if (type === 'absent') continue;
      checked.push({ op, pre: await capture(inputs, op.path, mode) });
      continue;
    }

    if (op.planExpectsExisting && type === 'absent') {
      bag.add('E-TARGET-RACE', {
        values: { path: op.path, detail: 'the plan expected to replace it, and it is gone' },
      });
      return { bag };
    }
    if (!op.planExpectsExisting && type === 'file') {
      // The same fault `atomicWrite`'s `link` would raise a moment later.
      // Caught here so it costs no journal and no backup, and so the
      // message can say what the plan believed rather than only `EEXIST`.
      bag.add('E-TARGET-RACE', {
        values: { path: op.path, detail: 'the plan expected to create it, and it exists now' },
      });
      return { bag };
    }

    const pre = type === 'file' ? await capture(inputs, op.path, mode) : null;

    // US-66: every replacement is re-hashed and confirmed **still equal to
    // what the plan observed** before the `rename`. Raw bytes, not
    // normalized content: the classification asked *did the user change
    // this*, and this asks *did anything move under us since we looked*.
    if (op.planHash !== null && (pre === null || hashBytes(pre.bytes) !== op.planHash)) {
      bag.add('E-TARGET-RACE', {
        values: { path: op.path, detail: 'it changed between planning and writing' },
      });
      return { bag };
    }

    checked.push({ op, pre });
  }

  return { checked, bag };
}

/**
 * The pre-update bytes, read **only after** the target has been confined
 * and confirmed a regular file.
 *
 * The mode comes from that same `lstat` rather than from the plan: it is
 * the mode a rollback would restore, so it should be what was actually
 * there and not what the plan expected to find.
 */
async function capture(
  inputs: UpdateWriteInputs,
  path: WritablePath,
  mode: number | null,
): Promise<{ bytes: Buffer; mode: number | null } | null> {
  const bytes = await inputs.readExisting(path);
  return bytes === null ? null : { bytes, mode };
}

type TargetType = 'absent' | 'file' | 'other';

/**
 * What is at a path **without following a link**.
 *
 * `lstat` and never `stat`: `stat` answers a question about the target of
 * a link rather than about the path, so a planted symlink would report as
 * an ordinary file and the check would pass on the strength of somewhere
 * else's inode. Same reasoning as `confineResolved`'s ancestor walk, one
 * component further along.
 */
async function targetStat(absolute: string): Promise<{ type: TargetType; mode: number | null }> {
  try {
    const st = await lstat(absolute);
    return st.isFile() ? { type: 'file', mode: st.mode & 0o777 } : { type: 'other', mode: null };
  } catch {
    return { type: 'absent', mode: null };
  }
}

/** Names the disagreement rather than merely reporting one. A message that
 *  says only *"it changed"* leaves the user to guess between a symlink, a
 *  directory and a deletion. */
function raceDetail(found: TargetType, expected: string): string {
  return found === 'absent'
    ? `the plan expected ${expected}, and it is gone`
    : `the plan expected ${expected}, and found a link or a directory`;
}

/**
 * **The `fillExpected` prohibition, enforced at write time** (Q-79, F1
 * US-31, T-2308).
 *
 * `classify.ts` already makes a fill-expected path `kept-fill-expected`
 * before it looks at a single byte, so no write reaching here can name
 * one. That is exactly why this check is worth having: it does not depend
 * on that being true, it **asserts** it, against a list derived
 * independently from the two recipes' declarations. A defence in depth
 * that reads its answer from the thing it is defending against is not one.
 *
 * ── Why this crashes instead of returning a diagnostic ────────────────
 *
 * There is no code for it, deliberately, and F1's rule is that a code is
 * the contract a user or a script acts on. **No user can cause this** — no
 * flag relaxes the prohibition, and there is no input through which a
 * project or a pack can put a fill-expected path into the write set. It is
 * a defect in this CLI, in the same class as `classify.ts`'s `unreachable`
 * and `harnessPath`'s silent `undefined`, and the same answer applies: a
 * test catches it, not a user.
 *
 * The alternative — dropping the write and carrying on — is worse than
 * loud: it would leave a defect in the classification invisible while the
 * writer quietly compensated for it. And the cost of the check failing to
 * fire is not a stale template; it is a **destroyed `project-brief.md`**,
 * the document every other document in the project is downstream of, with
 * no trace in the report because a replacement is the quiet outcome.
 *
 * Runs **before the preflight**, so a project in which it fired is a
 * project nothing touched.
 */
function assertNoFillExpectedWrite(inputs: UpdateWriteInputs): void {
  const forbidden = new Set(inputs.fillExpected);
  for (const w of inputs.writes) {
    if (forbidden.has(w.path)) {
      throw new Error(
        `executeUpdate: refusing to write "${w.path}", which the pack declares fill-expected. ` +
          'update never overwrites a fill-expected path (Q-79); a write set containing one is a defect in the classification.',
      );
    }
  }
}
