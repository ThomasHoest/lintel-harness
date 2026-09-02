/**
 * Rolling back an interrupted `update`. T-2403.
 *
 * F1's E-11 decided **what** rollback does — the five-case rule in
 * `apply/rollback.ts`, plus the sixth and seventh rows journal v3 added
 * for `intent: "delete"`. This module **performs** those decisions, and is
 * the half `update` cannot do without: a crashed update leaves a project
 * full of the user's work with no *delete `.harness/` and start over*
 * fallback, so the journal is not a nicety on this command — it is the
 * only recovery (US-66).
 *
 * ── The remedy has to name the command that crashed ───────────────────
 *
 * `E-JOURNAL-PRESENT`'s remedy line is rendered from `journal.command`
 * (F3-R3, journal v3), and `journalPresent()` below is the one place that
 * renders it. Through F1 v2.9 the line said `init --rollback`
 * unconditionally — which, after a crashed `update`, sends the user to a
 * command that answers `E-ALREADY-APPLIED` and leaves the journal exactly
 * where it was. **A remedy that cannot work is worse than none, because
 * the user believes they tried it.**
 *
 * ── Restoring a delete is the case F1's table had no row for ──────────
 *
 * A `delete` entry carries **no intended hash** — there is nothing this
 * run intended the path to contain, only that it not be there. So *"is it
 * still exactly what we wrote"*, the clause every other row is gated on,
 * has no meaning; the equivalent question is *"is it still absent"*, and
 * `planRollback` asks exactly that. Restoring is then unconditional from
 * the backup, because there is nothing on disk that could have been edited
 * since. If something **is** there, this run did not put it there and the
 * path is kept.
 *
 * ── It restores `.harness/pack/` too ──────────────────────────────────
 *
 * That is what makes US-65's invariant recoverable rather than merely
 * stated: after a successful rollback the payload, the manifest and the
 * applied tree are the ones that were there before the update started, and
 * `verify` exits `0`. Both are journalled, so both come back, and neither
 * needs a rule of its own here.
 */
import { lstat, rmdir, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { DiagnosticBag, diagnostic, type Diagnostic } from '../diag/diagnostic.js';
import { atomicWrite } from '../fs/atomic-write.js';
import { planRollback, type RollbackDecision } from '../apply/rollback.js';
import { confinePath } from '../security/confine.js';
import { harnessPath, type WritablePath } from '../security/harness-paths.js';
import { confineAtWrite, type ProjectRoot } from '../security/resolve.js';
import type { Journal, JournalEntry } from '../fs/journal.js';

/**
 * `E-JOURNAL-PRESENT`, rendered from the journal rather than assumed.
 *
 * Every command in the group raises this before it does anything else, and
 * **none of them may spell the command name itself** — the journal knows
 * which run crashed and the caller does not. Exported here rather than
 * left to each command so the wrong-command bug F3-R3 fixed cannot be
 * reintroduced one call site at a time.
 */
export function journalPresent(journal: Journal): Diagnostic {
  return diagnostic('E-JOURNAL-PRESENT', {
    values: { command: journal.command, n: String(journal.entries.length) },
  });
}

export interface RollbackIo {
  /** Reads a project file, or `null` if it is not there. Injected for the
   *  same reason `executeUpdate`'s `readExisting` is. */
  readonly read: (absolute: string) => Promise<Buffer | null>;
  /** Removes `.harness/journal.json` and `.harness/journal.d/`. Called
   *  only once every decision has been carried out. */
  readonly removeJournal: () => Promise<void>;
}

export interface RollbackOutcome {
  readonly decisions: readonly RollbackDecision[];
  readonly restored: readonly string[];
  readonly removed: readonly string[];
  /** Paths rollback declined to touch, each already reported as
   *  `W-ROLLBACK-KEPT`. **Not failures** — rollback kept them on purpose. */
  readonly kept: readonly string[];
  /** False when a decision could not be carried out. The journal is then
   *  left in place: a rollback that half-ran and then deleted its own
   *  record would leave nothing to try again with. */
  readonly complete: boolean;
  readonly bag: DiagnosticBag;
}

/**
 * Undo an interrupted run, decision by decision.
 *
 * The order is files first, then created directories in **reverse**
 * creation order and only when empty — a directory holding a file rollback
 * declined to touch is a directory that must survive.
 */
export async function performRollback(
  root: ProjectRoot,
  journal: Journal,
  io: RollbackIo,
): Promise<RollbackOutcome> {
  const bag = new DiagnosticBag();
  const restored: string[] = [];
  const removed: string[] = [];

  // Every journalled path is re-branded before anything reads or writes
  // it. The journal is a file on disk like any other, and a path taken
  // from it and used directly would be the one write in the product that
  // skipped the gate (C-14).
  const targets = new Map<string, WritablePath>();
  for (const e of journal.entries) {
    const branded = rebrand(e.path);
    if (branded === undefined) {
      bag.add('E-JOURNAL-UNREADABLE', {
        values: { detail: `entry "${e.path}" names a path this CLI may not write` },
      });
      return { decisions: [], restored, removed, kept: [], complete: false, bag };
    }
    targets.set(e.path, branded);
  }

  // Read every journalled path **before** planning, because `planRollback`
  // is pure and synchronous by design — the whole five-case table is
  // testable without a filesystem only while the reads happen out here.
  const now = new Map<string, Buffer | null>();
  for (const e of journal.entries) {
    now.set(e.path, await readTarget(root, targets.get(e.path) as WritablePath, io));
  }

  const plan = planRollback(journal, (p) => now.get(p) ?? null);
  for (const d of plan.bag.items) bag.push(d);

  for (const [i, decision] of plan.decisions.entries()) {
    if (decision.action === 'keep') continue;
    const entry = journal.entries[i] as JournalEntry;
    const path = targets.get(decision.path) as WritablePath;

    // Stage 4 again, immediately before acting. Rollback runs after a
    // crash, which is exactly when a project is most likely to have been
    // touched by hand, so the window between deciding and acting is wider
    // here than anywhere else in the product.
    const gate = await confineAtWrite(root, path, { index: 0 });
    for (const d of gate.bag.items) bag.push(d);
    if (gate.absolute === undefined) {
      return { decisions: plan.decisions, restored, removed, kept: keptOf(plan.decisions), complete: false, bag };
    }

    if (decision.action === 'delete') {
      await unlink(gate.absolute);
      removed.push(decision.path);
      continue;
    }

    const backup = await io.read(join(root, ...(entry.backup ?? '').split('/')));
    if (backup === null) {
      // The one unrecoverable shape: the journal says restore and the
      // bytes to restore from are gone. Reported as an unreadable journal
      // because that is what it is — a record that cannot be acted on —
      // rather than as a write failure, which would name the wrong fault.
      bag.add('E-JOURNAL-UNREADABLE', {
        values: { detail: `entry "${decision.path}" has no backup at "${entry.backup ?? ''}"` },
      });
      return { decisions: plan.decisions, restored, removed, kept: keptOf(plan.decisions), complete: false, bag };
    }

    const outcome = await atomicWrite(root, {
      command: 'update',
      path,
      bytes: backup,
      mode: entry.preMode ?? 0o644,
      // A deleted path is restored by **exclusive create**: `planRollback`
      // only says restore when it is still absent, so anything there now
      // arrived after the crash and must not be written through.
      expectNew: entry.intent === 'delete',
    });
    for (const d of outcome.bag.items) bag.push(d);
    if (!outcome.ok) {
      return { decisions: plan.decisions, restored, removed, kept: keptOf(plan.decisions), complete: false, bag };
    }
    restored.push(decision.path);
  }

  // Reverse creation order, and only when empty — `rmdir` refusing a
  // non-empty directory is the check rather than something to work around.
  for (const dir of plan.removeDirs) {
    await rmdir(join(root, ...dir.split('/'))).catch(() => undefined);
  }

  // Last, for the same reason the journal is written first: while it
  // exists, the run is still recoverable.
  await io.removeJournal();

  return {
    decisions: plan.decisions,
    restored,
    removed,
    kept: keptOf(plan.decisions),
    complete: true,
    bag,
  };
}

function keptOf(decisions: readonly RollbackDecision[]): readonly string[] {
  return decisions.filter((d) => d.action === 'keep').map((d) => d.path);
}

/**
 * Re-mint a journalled path through the gate it originally passed.
 *
 * `.harness/**` came from `harnessPath` and everything else from
 * `confinePath`, so both are tried in that order — the CLI's own tree
 * first, because the denylist would refuse it outright and the refusal
 * would be the wrong answer for a path the CLI itself wrote.
 *
 * `confinePath`'s own diagnostics are discarded deliberately: they name a
 * **recipe step's** destination fault, and there is no recipe step here.
 * The caller gets `E-JOURNAL-UNREADABLE`, which is what an unactionable
 * journal is.
 */
function rebrand(path: string): WritablePath | undefined {
  const owned = harnessPath(path);
  if (owned !== undefined) return owned;
  return confinePath(path, { index: 0 }).path;
}

/**
 * Read a journalled path, treating **anything that is not a regular file
 * as absent**.
 *
 * A symlink at a journalled path is not something this run wrote —
 * `atomicWrite` produces regular files and nothing else. Reading through
 * it would hash content from outside the project and could make the
 * five-case table conclude *"still exactly what we wrote"* about a file
 * this run never touched. Reading it as absent routes every write entry to
 * **keep** and makes a delete entry's restore fail loudly at its exclusive
 * create, which are the two safe answers.
 */
async function readTarget(
  root: ProjectRoot,
  path: WritablePath,
  io: RollbackIo,
): Promise<Buffer | null> {
  const gate = await confineAtWrite(root, path, { index: 0 });
  if (gate.absolute === undefined) return null;
  try {
    // `lstat`, never `stat`: the question is what is **at** this path, and
    // `stat` would answer it about a link's target instead.
    if (!(await lstat(gate.absolute)).isFile()) return null;
  } catch {
    return null;
  }
  return io.read(gate.absolute);
}
