/**
 * Writing `.harness/manifest.json`. T-0703.
 *
 * ── Why atomically, for this file in particular ───────────────────────
 *
 * The manifest is the **last write of an apply** (§F1.6), and every later
 * command reads it before it does anything else. A half-written manifest is
 * therefore not a small loss: it is `E-MANIFEST-CORRUPT`, exit 2, on every
 * subsequent run, and the remedy F1 offers for that — *restore it from
 * version control, or re-apply into a fresh directory* — is a remedy for a
 * project that has just been applied and has nothing to restore from. The
 * crash window is small and the cost of landing in it is the whole apply.
 *
 * So: **write a sibling temp file, then `rename` onto the target.** A
 * sibling and not a temp directory, because `rename` is atomic only within
 * one filesystem and `os.tmpdir()` routinely is not one. The temp file is
 * created **exclusively** (`wx`) under a random name, so this never writes
 * through a file — or a symlink — that was already there.
 *
 * ── The confinement this does not do, and why it says so ──────────────
 *
 * Stage 4 (`confineAtWrite`, T-0205) re-confines immediately before each
 * write, and it accepts an **`AppliedPath`** only. A `HarnessPath` cannot
 * be passed to it, so a manifest write cannot take stage 4 today. That is
 * not a shortcut taken here: re-implementing the ancestor walk in this
 * module would be a **second** confinement implementation, and a second one
 * drifts from the first silently — the paths it wrongly accepted look
 * ordinary. The residue is bounded and named: a `.harness/` directory
 * replaced by a symlink between plan and write would be followed. Closing
 * it is a change to `confineAtWrite`'s parameter type, from `AppliedPath`
 * to `WritablePath`, which is what `F1-ADR-001` says the atomic writer
 * takes; it belongs with E-11's writer and not here.
 */
import { randomBytes } from 'node:crypto';
import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { DiagnosticBag } from '../diag/diagnostic.js';
import type { ProjectRoot } from '../security/resolve.js';
import { canonicalJson } from './canonical-json.js';
import { MANIFEST_PATH, manifestFile, type PackManifest } from './types.js';

/**
 * Write the manifest.
 *
 * Returns a `DiagnosticBag` rather than `F1-ADR-001`'s `Promise<void>`.
 * The ADR's signature has no way to report `E-WRITE-FAILED`, which is exit
 * class **3** — the one class that means *the project is mid-apply* — and
 * the house rule is that a diagnostic is a value and never a thrown error:
 * an exception carries no code, and F1 makes the **code** the stable
 * contract that F6 and CI branch on.
 *
 * An empty bag means the bytes landed.
 */
export async function writeManifest(
  root: ProjectRoot,
  manifest: PackManifest,
): Promise<DiagnosticBag> {
  const bag = new DiagnosticBag();
  const target = manifestFile(root);
  const bytes = canonicalJson(manifest);

  // A random, per-attempt name: two processes writing the same project is
  // the lock's problem (`.harness/lock`), but a collision here would make
  // one of them fail on a file the other owns, and the failure would look
  // like a permissions fault.
  const temp = `${target}.${randomBytes(8).toString('hex')}.tmp`;

  try {
    // `.harness/` exists by the time an apply reaches its last write; this
    // is for every other caller, and `recursive` makes it a no-op when it
    // does exist rather than a race against a concurrent creator.
    await mkdir(dirname(target), { recursive: true });
    // `wx` — exclusive create. Never write through something already at
    // this path, whatever it is.
    await writeFile(temp, bytes, { encoding: 'utf8', flag: 'wx' });
    await rename(temp, target);
  } catch (e) {
    // Best effort, and its failure is deliberately ignored: the fault
    // being reported is the write, and a second code from the cleanup
    // would name the wrong one as the cause.
    await rm(temp, { force: true }).catch(() => undefined);
    bag.add('E-WRITE-FAILED', {
      path: MANIFEST_PATH,
      values: { path: MANIFEST_PATH, errno: (e as NodeJS.ErrnoException).code ?? 'unknown' },
    });
  }

  return bag;
}
