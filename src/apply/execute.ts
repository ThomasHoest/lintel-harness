/**
 * `executeApply` — **the only writer**. T-1106, C-13, C-23.
 *
 * Six steps, in this order and no other:
 *
 *   lock → journal → **phase 1** → **phase 2** → manifest → journal removal
 *
 * ── It computes nothing ───────────────────────────────────────────────
 *
 * **SEC (C-23): it reads no payload file.** No template read, no
 * re-render, no re-glob. Every byte it writes was decided by `planApply`,
 * validated, and shown in the disclosure the user approved. Its **only**
 * filesystem reads are destination-side safety checks — stage-4
 * re-confinement, and the pre-state a journal entry needs.
 *
 * If this module ever needs a payload reader, something upstream has
 * stopped deciding what it was supposed to decide.
 *
 * ── Why the order is exactly this ─────────────────────────────────────
 *
 * **The journal before the first write**, flushed, so a crash at any later
 * point leaves a record of what was intended. A journal written afterwards
 * would describe an apply that already half-happened.
 *
 * **The manifest last.** It is the statement *this project has this pack
 * applied* — and a manifest present after a crash would claim an apply
 * that did not finish. Everything else can be rolled back from the
 * journal; the manifest is what makes rollback unnecessary.
 *
 * **The journal and `journal.d/` removed only after the manifest lands.**
 * Between those two moments the apply is complete but recoverable, which
 * is the safe order to be in.
 *
 * ── Re-confined immediately before each write ─────────────────────────
 *
 * Stage 4 runs per file, not once for the plan. Between planning and
 * writing, an ancestor directory can become a symlink — and the whole
 * point of a stage that runs *at write time* is that it closes that
 * window rather than describing it.
 *
 * ── There is no consent gate and no gate call (Q-54) ──────────────────
 *
 * `F1-ADR-001`'s pipeline names one. It does not exist: Q-54 deleted it
 * with `merge-json`, and nothing writes `.claude/settings.json` at v1.0.
 */
import { lstat } from 'node:fs/promises';
import { join } from 'node:path';
import { DiagnosticBag } from '../diag/diagnostic.js';
import { atomicWrite, writePlain } from '../fs/atomic-write.js';
import { buildJournal, type Journal, type JournalCommand, type PlannedWrite } from '../fs/journal.js';
import { confineAtWrite } from '../security/resolve.js';
import type { ProjectRoot } from '../security/resolve.js';
import type { WritablePath } from '../security/harness-paths.js';
import type { PlannedFile } from './plan.js';

export interface ExecuteInputs {
  readonly root: ProjectRoot;
  readonly command: JournalCommand;
  readonly files: readonly PlannedFile[];
  /** Serialized manifest bytes and where they go. Written **last**. */
  readonly manifest: { readonly path: WritablePath; readonly bytes: Buffer };
  /** Persists the journal document. Injected so the ordering can be
   *  tested without a filesystem — and so that "the journal was flushed
   *  before the first write" is an assertion rather than a hope. */
  readonly writeJournal: (journal: Journal) => Promise<void>;
  readonly removeJournal: () => Promise<void>;
  /** Pre-apply bytes for a path the plan says exists. Read from the
   *  **destination**, which is the one filesystem read this module makes
   *  that is not a safety check. */
  readonly readExisting: (path: WritablePath) => Promise<Buffer | null>;
}

export interface ExecuteResult {
  readonly written: readonly WritablePath[];
  readonly createdDirs: readonly string[];
  /** True iff the manifest landed. A `false` here means the project is
   *  mid-apply and the journal is the way back. */
  readonly complete: boolean;
  /**
   * True iff the journal was written — i.e. the run got past the
   * preflight and **may** have written bytes.
   *
   * `complete: false` alone does not distinguish *"stopped before
   * anything happened"* from *"stopped half way"*, and the two want
   * opposite handling: the second must keep the lock so no second writer
   * enters a mid-apply project (US-49), while the first has nothing to
   * protect and holding the lock would strand it for the stale timeout.
   */
  readonly journalled: boolean;
  readonly bag: DiagnosticBag;
}

export async function executeApply(inputs: ExecuteInputs): Promise<ExecuteResult> {
  const bag = new DiagnosticBag();
  const written: WritablePath[] = [];
  const createdDirs: string[] = [];
  const knownDirs = new Set<string>();

  /* ── the journal, before the first write ───────────────────────────── */

  /**
   * **The preflight, before the journal and before any byte.**
   *
   * Two faults are checked here rather than at the write, because both
   * would otherwise be reported mid-apply, with the project half-written,
   * by a message describing something that did not happen:
   *
   *   A DIRECTORY at a planned path. The planner's probe sees only regular
   *   files, so the plan says *create it* and the writer's exclusive-create
   *   fails — reported as `E-TARGET-RACE`, whose message says *"changed
   *   while lintel was writing"* about a directory that was there before
   *   the run began. `E-TARGET-NOT-A-FILE`, exit 1, **zero bytes**.
   *
   *   A SYMLINK at a path the plan saw as a regular file. That one really
   *   is a race, and `E-TARGET-RACE` is the truthful code — but it is
   *   checked here too, so the backup read that follows cannot happen
   *   through a link (C-51's shape; see below).
   */
  for (const f of inputs.files) {
    const kind = await targetKind(inputs.root, f.path);
    if (kind === 'dir') {
      bag.add('E-TARGET-NOT-A-FILE', { values: { path: f.path } });
      return { written, createdDirs, complete: false, journalled: false, bag };
    }
    if (kind === 'link' && f.preExisting) {
      bag.add('E-TARGET-RACE', {
        values: {
          path: f.path,
          detail: 'it is a symbolic link now, and the plan saw a regular file',
          command: inputs.command,
        },
      });
      return { written, createdDirs, complete: false, journalled: false, bag };
    }
  }

  const plannedWrites: PlannedWrite[] = [];
  for (const f of inputs.files) {
    // The symlink check ran in the preflight above, which is what makes
    // the read below safe: `confineAtWrite` walks the ANCESTORS and does
    // not stat the final component, so a link planted **at** an overwrite
    // target would otherwise be read through when its bytes are captured
    // into `.harness/journal.d/` — an arbitrary file read, landing in a
    // directory the project commits. C-51 names exactly this for
    // `update`'s deletes: *the risk is the backup, not the unlink*.
    const pre = f.preExisting ? await inputs.readExisting(f.path) : null;
    plannedWrites.push({
      path: f.path,
      bytes: f.bytes,
      intent: 'write',
      pre: pre === null ? null : { bytes: pre, mode: f.preMode },
    });
  }

  const journal = buildJournal(inputs.command, plannedWrites, []);
  await inputs.writeJournal(journal);

  // Backups before the overwrites they protect — a backup written after
  // is a backup of the new content.
  for (const [i, entry] of journal.entries.entries()) {
    if (entry.backup === undefined) continue;
    const pre = plannedWrites[i]?.pre;
    if (pre === undefined || pre === null) continue;
    await writePlain(joinRoot(inputs.root, entry.backup), pre.bytes);
  }

  /* ── phase 1, then phase 2, in that order ──────────────────────────── */

  for (const phase of [1, 2] as const) {
    for (const f of inputs.files) {
      if (f.phase !== phase) continue;

      // Stage 4, per file. Between planning and writing an ancestor can
      // become a symlink; a stage that runs at write time exists to close
      // that window rather than describe it.
      const gate = await confineAtWrite(inputs.root, f.path, { index: 0 });
      for (const d of gate.bag.items) bag.push(d);
      if (gate.absolute === undefined) {
        return { written, createdDirs, complete: false, journalled: true, bag };
      }

      const outcome = await atomicWrite(
        inputs.root,
        {
          command: inputs.command,
          path: f.path,
          bytes: f.bytes,
          mode: f.executable ? 0o755 : 0o644,
          expectNew: !f.preExisting,
        },
        knownDirs,
      );
      for (const d of outcome.bag.items) bag.push(d);
      createdDirs.push(...outcome.createdDirs);

      if (!outcome.ok) {
        // Stop at the first failure. The journal is intact and the project
        // is recoverable; continuing would write more to undo.
        return { written, createdDirs, complete: false, journalled: true, bag };
      }
      written.push(f.path);
    }
  }

  /* ── the manifest, last ────────────────────────────────────────────── */

  const manifestGate = await confineAtWrite(inputs.root, inputs.manifest.path, { index: 0 });
  for (const d of manifestGate.bag.items) bag.push(d);
  if (manifestGate.absolute === undefined) {
    return { written, createdDirs, complete: false, journalled: true, bag };
  }

  const manifestWrite = await atomicWrite(
    inputs.root,
    {
      command: inputs.command,
      path: inputs.manifest.path,
      bytes: inputs.manifest.bytes,
      mode: 0o644,
      expectNew: false,
    },
    knownDirs,
  );
  for (const d of manifestWrite.bag.items) bag.push(d);
  if (!manifestWrite.ok) {
    return { written, createdDirs, complete: false, journalled: true, bag };
  }
  written.push(inputs.manifest.path);

  // Only now. Between the manifest landing and this line the apply is
  // complete but still recoverable, which is the safe order to be in.
  await inputs.removeJournal();

  return { written, createdDirs, complete: true, journalled: true, bag };
}

function joinRoot(root: string, relative: string): string {
  return `${root}/${relative}`;
}

/**
 * What stands at this destination **right now**.
 *
 * `lstat`, never `stat`: `stat` follows a link and answers about its
 * target, which is the question that lets the escape through.
 */
async function targetKind(
  root: string,
  path: string,
): Promise<'absent' | 'file' | 'dir' | 'link'> {
  try {
    const st = await lstat(join(root, ...path.split('/')));
    if (st.isSymbolicLink()) return 'link';
    if (st.isDirectory()) return 'dir';
    return 'file';
  } catch {
    return 'absent';
  }
}
