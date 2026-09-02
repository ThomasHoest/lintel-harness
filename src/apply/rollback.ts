/**
 * Rollback — the **five-case rule**. T-1107, C-13.
 *
 * One sentence carries the whole design, and every case below is it
 * applied to one path:
 *
 * > **Rollback deletes only paths this apply created, restores only paths
 * > this apply overwrote, and acts on neither unless the on-disk bytes are
 * > still exactly what this apply wrote.**
 *
 * That last clause is the one that matters. A crashed apply leaves a
 * project a user may have touched — they came back to a half-written tree
 * and started fixing it. **Rollback must never undo that.** So every case
 * is gated on *the file is still exactly what we put there*; the moment it
 * is not, the path is kept and reported, whatever the journal says.
 *
 * ── The five cases, exhaustive ────────────────────────────────────────
 *
 *   preExisting  pre-hash    on-disk now    →
 *   false        —           = intended     DELETE      we made it, it is still ours
 *   false        —           ≠ intended     KEEP        the user edited it after the crash
 *   true         = intended  = intended     KEEP        `--force`'s byte-identical case: it was
 *                                                       already correct and was never ours
 *   true         ≠ intended  = intended     RESTORE     from `backup`
 *   true         any         ≠ intended     KEEP        the user edited it after the crash
 *
 * **`W-ROLLBACK-KEPT` is `notice`, never `defect`**: rollback kept the
 * file *on purpose*, and there is nothing the user could change to clear
 * it — which is what `notice` means.
 *
 * ── The third row is judged against the recorded path (C-36) ──────────
 *
 * On a case-insensitive filesystem the on-disk spelling may differ from
 * the planned one. The row is judged against **the on-disk path the
 * journal recorded**, so *"leave untouched"* leaves the entry named as the
 * user had it rather than renaming it back to what the pack intended.
 *
 * ── Ordering ──────────────────────────────────────────────────────────
 *
 * Files first, then created directories in **reverse** creation order and
 * **only when empty** — a directory holding a file rollback declined to
 * touch is a directory that must survive. Then `.harness/` itself.
 */
import { DiagnosticBag } from '../diag/diagnostic.js';
import { hashBytes } from '../hash/sha256.js';
import type { Journal, JournalEntry } from '../fs/journal.js';

export type RollbackAction = 'delete' | 'restore' | 'keep';

export interface RollbackDecision {
  readonly path: string;
  readonly action: RollbackAction;
  /** Why, in the vocabulary of the table. Rendered into
   *  `W-ROLLBACK-KEPT`'s reason for a kept path. */
  readonly reason: string;
  /** Present on `restore`. */
  readonly backup?: string;
}

export interface RollbackPlan {
  readonly decisions: readonly RollbackDecision[];
  /** Created directories, **reversed**, to be removed only when empty. */
  readonly removeDirs: readonly string[];
  readonly bag: DiagnosticBag;
}

/** What is on disk for one journalled path, or `null` if it is gone. */
export type OnDisk = (path: string) => Buffer | null;

/**
 * Decide, for every journalled path, what rollback does.
 *
 * Pure: it reads through a callback and returns decisions. Performing them
 * is `execute`'s, and keeping the decision separate is what lets the whole
 * table be tested without a filesystem.
 */
export function planRollback(journal: Journal, onDisk: OnDisk): RollbackPlan {
  const bag = new DiagnosticBag();
  const decisions = journal.entries.map((e) => decide(e, onDisk(e.path)));

  for (const d of decisions) {
    if (d.action === 'keep') {
      bag.add('W-ROLLBACK-KEPT', { values: { path: d.path, reason: d.reason } });
    }
  }

  return {
    decisions,
    // Reverse creation order: a child is removed before its parent, which
    // is the only order in which "remove when empty" can succeed.
    removeDirs: [...journal.createdDirs].reverse(),
    bag,
  };
}

function decide(e: JournalEntry, disk: Buffer | null): RollbackDecision {
  const now = disk === null ? null : hashBytes(disk);

  // A DELETE entry has no intended hash — `update` removed the file, so
  // "still exactly what we wrote" means "still absent". Restoring is
  // unconditional because there is nothing on disk to have been edited.
  if (e.intent === 'delete') {
    return now === null
      ? { path: e.path, action: 'restore', reason: 'this apply deleted it', ...(e.backup === undefined ? {} : { backup: e.backup }) }
      : { path: e.path, action: 'keep', reason: 'it was recreated after the crash' };
  }

  const intended = e.sha256;

  if (!e.preExisting) {
    return now === intended
      ? { path: e.path, action: 'delete', reason: 'this apply created it and it is unchanged' }
      : { path: e.path, action: 'keep', reason: 'this apply created it and it has since been edited' };
  }

  if (now !== intended) {
    // The catch-all fifth row, and the one that protects a user's repair
    // work: whatever the journal says, the bytes are not ours any more.
    return { path: e.path, action: 'keep', reason: 'it has been edited since this apply wrote it' };
  }

  if (e.preHash === intended) {
    // `--force`'s byte-identical case. The file was already correct and
    // was **never ours**, so there is nothing to undo.
    return { path: e.path, action: 'keep', reason: 'it was already byte-identical before this apply' };
  }

  return {
    path: e.path,
    action: 'restore',
    reason: 'this apply overwrote it and it is unchanged since',
    ...(e.backup === undefined ? {} : { backup: e.backup }),
  };
}

/** The paths rollback declined to touch, for the report. */
export function keptPaths(plan: RollbackPlan): readonly RollbackDecision[] {
  return plan.decisions.filter((d) => d.action === 'keep');
}
