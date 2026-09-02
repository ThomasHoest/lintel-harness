/**
 * The journal — **version 3**. T-1102, T-1110, C-13, Q-62.
 *
 * Written and flushed **before** the first byte of the apply, and removed
 * when the apply completes. Its whole purpose is that a crashed run leaves
 * a project a later run can put back — so a journal on disk means
 * *something was interrupted*, and that is the only thing its presence
 * ever means.
 *
 * ── Version 3, and why there is no version 2 to be compatible with ────
 *
 * Any `version` other than `3` is **`E-JOURNAL-UNREADABLE`, exit 2**,
 * never guessed. That is US-1's fail-closed rule applied to the journal,
 * and it costs nothing: **a journal exists only between the start and the
 * end of a single run**, so the only reader of a version-2 journal would
 * be a CLI recovering a crash that happened under a CLI that no longer
 * exists. Version 1 never shipped, and this check is what guarantees it
 * never can.
 *
 * ── Two additions at version 3, each preventing a specific failure ────
 *
 * **`intent: 'write' | 'delete'` per entry**, because `update` deletes
 * payload orphans and the five-case rollback table models overwriting and
 * creating but **not deleting**. Rolling back a delete means restoring
 * from `journal.d/` with **no intended hash to compare against** — a case
 * the table simply does not have a row for. `init` writes `'write'` on
 * every entry, so the field is **uniform rather than optional**: an
 * optional discriminator is one a reader can forget to check.
 *
 * **`command: 'init' | 'update'` on the journal**, because
 * `E-JOURNAL-PRESENT`'s remedy line is rendered from it. Through v2.9 that
 * line said `init --rollback` unconditionally — which, after a crashed
 * `update`, sends the user to a command that answers `E-ALREADY-APPLIED`
 * and leaves the journal exactly where it was. **A remedy that cannot work
 * is worse than none, because the user believes they tried it.**
 *
 * ── It covers both phases ─────────────────────────────────────────────
 *
 * The payload copy is journalled **exactly as** phase-2 output is. Phase 1
 * writes into the project too, and a rollback that restored only phase 2
 * would leave `.harness/pack/` from a run that did not finish.
 */
import { DiagnosticBag } from '../diag/diagnostic.js';
import { hashBytes } from '../hash/sha256.js';
import type { WritablePath } from '../security/harness-paths.js';

/** The only version this CLI reads or writes. */
export const JOURNAL_VERSION = 3;

export type JournalIntent = 'write' | 'delete';
export type JournalCommand = 'init' | 'update';

export interface JournalEntry {
  readonly path: string;
  /** **Uniform, never optional.** `init` writes `'write'` on every entry
   *  rather than omitting it, because an optional discriminator is one a
   *  reader can forget to check. */
  readonly intent: JournalIntent;
  /** The hash this apply intends to write. **Absent on a `delete`** —
   *  there is nothing intended, which is the case the five-case table has
   *  no row for. */
  readonly sha256?: string;
  readonly preExisting: boolean;
  /** `null` when the path did not exist. */
  readonly preHash: string | null;
  readonly preMode: number | null;
  /** A path under `.harness/journal.d/` holding the pre-apply bytes.
   *  Present **exactly when** `preExisting` and the pre-apply hash differs
   *  from the intended one — so only a genuine overwrite pays for a
   *  backup. A `delete` always carries one. */
  readonly backup?: string;
}

export interface Journal {
  readonly version: number;
  /** Which command wrote it. `E-JOURNAL-PRESENT`'s remedy is rendered
   *  from this, and a remedy that cannot work is worse than none. */
  readonly command: JournalCommand;
  readonly entries: readonly JournalEntry[];
  /** In creation order; rollback removes them in reverse. */
  readonly createdDirs: readonly string[];
}

export interface PlannedWrite {
  readonly path: WritablePath;
  readonly bytes: Buffer;
  readonly intent: JournalIntent;
  /** What is on disk now, or `null`. */
  readonly pre: { readonly bytes: Buffer; readonly mode: number | null } | null;
}

/**
 * Build the journal for a planned apply.
 *
 * Pure: it takes what the plan knows and returns the document. The backup
 * **files** are the writer's to place — this decides *whether* each entry
 * has one, which is a property of the plan rather than of the filesystem.
 */
export function buildJournal(
  command: JournalCommand,
  writes: readonly PlannedWrite[],
  createdDirs: readonly string[],
): Journal {
  const entries: JournalEntry[] = writes.map((w, i) => {
    const preHash = w.pre === null ? null : hashBytes(w.pre.bytes);
    const intended = w.intent === 'delete' ? undefined : hashBytes(w.bytes);

    // A backup exactly when there is something to lose: the path exists
    // AND the bytes are about to change. Re-writing identical bytes is not
    // an overwrite worth paying for.
    const needsBackup = w.pre !== null && (w.intent === 'delete' || preHash !== intended);

    return {
      path: w.path,
      intent: w.intent,
      ...(intended === undefined ? {} : { sha256: intended }),
      preExisting: w.pre !== null,
      preHash,
      preMode: w.pre?.mode ?? null,
      ...(needsBackup ? { backup: backupPathFor(i, w.path) } : {}),
    };
  });

  return { version: JOURNAL_VERSION, command, entries, createdDirs };
}

/**
 * The backup's location under `.harness/journal.d/`.
 *
 * **Indexed, not path-derived.** An applied path may contain any legal
 * character and two different paths can collide under any encoding short
 * of a full one; the index is unique by construction and the entry
 * carries the real path anyway.
 */
export function backupPathFor(index: number, path: string): string {
  void path;
  return `.harness/journal.d/${String(index).padStart(5, '0')}`;
}

export interface ReadJournalResult {
  readonly journal?: Journal;
  readonly bag: DiagnosticBag;
}

/**
 * Read a journal, refusing anything this CLI cannot act on.
 *
 * **Never guesses.** A journal is the record of an interrupted write, and
 * acting on a half-understood one is how a recovery destroys what it was
 * trying to save.
 */
export function readJournal(value: unknown): ReadJournalResult {
  const bag = new DiagnosticBag();
  const fail = (detail: string): ReadJournalResult => {
    bag.add('E-JOURNAL-UNREADABLE', { values: { detail } });
    return { bag };
  };

  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return fail('the top level is not an object');
  }
  const o = value as Record<string, unknown>;

  if (o['version'] !== JOURNAL_VERSION) {
    return fail(`it declares version ${JSON.stringify(o['version'])}; this CLI reads ${JOURNAL_VERSION}`);
  }
  if (o['command'] !== 'init' && o['command'] !== 'update') {
    return fail(`it declares command ${JSON.stringify(o['command'])}`);
  }
  if (!Array.isArray(o['entries'])) return fail('"entries" is not an array');
  if (!Array.isArray(o['createdDirs'])) return fail('"createdDirs" is not an array');

  for (const e of o['entries'] as unknown[]) {
    const fault = entryFault(e);
    if (fault !== null) return fail(fault);
  }

  return { journal: o as unknown as Journal, bag };
}

function entryFault(e: unknown): string | null {
  if (typeof e !== 'object' || e === null) return 'an entry is not an object';
  const o = e as Record<string, unknown>;
  if (typeof o['path'] !== 'string') return 'an entry has no "path"';
  if (o['intent'] !== 'write' && o['intent'] !== 'delete') {
    return `entry "${o['path']}" declares intent ${JSON.stringify(o['intent'])}`;
  }
  if (typeof o['preExisting'] !== 'boolean') return `entry "${o['path']}" has no "preExisting"`;

  // The two shape rules the intents differ on, checked rather than assumed
  // — this is the discriminator rollback branches on.
  if (o['intent'] === 'delete' && o['sha256'] !== undefined) {
    return `entry "${o['path']}" is a delete and carries an intended hash`;
  }
  if (o['intent'] === 'write' && typeof o['sha256'] !== 'string') {
    return `entry "${o['path']}" is a write and carries no intended hash`;
  }
  if (o['intent'] === 'delete' && typeof o['backup'] !== 'string') {
    return `entry "${o['path']}" is a delete with no backup to restore from`;
  }
  return null;
}

/** The remedy command for `E-JOURNAL-PRESENT`, rendered from the journal
 *  rather than assumed. See the header for what the assumption cost. */
export function rollbackCommandFor(journal: Journal): string {
  return `lintel harness ${journal.command} --rollback`;
}
