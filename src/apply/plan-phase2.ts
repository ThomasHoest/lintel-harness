/**
 * Phase 2, rendered **at plan time**. T-1104, C-23.
 *
 * Every step is rendered here, from payload bytes the **planner** holds,
 * into `PlannedFile.bytes`. By the time `execute` runs there is nothing
 * left to compute: it writes bytes it was handed.
 *
 * ── SEC (C-23): `execute` reads no payload file ───────────────────────
 *
 * **No template read, no re-render, no re-glob.** This module exists as
 * its own file so that *"the executor re-reads the payload"* is a change
 * somebody has to make **on purpose**, in a place that says why it must
 * not.
 *
 * It removes a **window**, not an inefficiency. An execute-time read lets
 * content change between one step and the next — and that content would
 * have:
 *
 *   · passed **no validation**,
 *   · appeared in **no disclosure** the user approved,
 *   · been covered by **no `payloadDigest`**.
 *
 * Three guarantees, all of them stated over what the *planner* saw. A
 * single read after planning makes all three false at once, silently.
 *
 * ── The written-set is threaded, not recomputed ───────────────────────
 *
 * Editing steps resolve `in` against the plan's ordered written-set, and
 * that set is built as the steps run. It is the same object the write set
 * was computed against, so a glob cannot resolve differently here than it
 * did when the plan was checked.
 */
import { DiagnosticBag } from '../diag/diagnostic.js';
import { renderStep } from '../recipe/ops/index.js';
import { isPlacing } from '../recipe/types.js';
import type { AppliedPath } from '../security/confine.js';
import type { PlannedStep } from '../recipe/plan-steps.js';
import type { FileMode, Substitution } from '../recipe/render.js';
import type { Answer } from '../pack/parameters.js';

export interface Phase2Inputs {
  readonly steps: readonly PlannedStep[];
  /** Pack-relative POSIX paths of every payload file. */
  readonly payload: readonly string[];
  /** **The planner's** payload reader. `execute` is handed no equivalent. */
  readonly readPayload: (packRelativePath: string) => Buffer | null;
  readonly answers: ReadonlyMap<string, Answer>;
  readonly packName: string;
  readonly packVersion: string;
  readonly cliVersion: string;
}

export interface RenderedOutput {
  readonly path: AppliedPath;
  readonly bytes: Buffer;
  readonly mode: FileMode;
}

export interface Phase2Result {
  /** Final bytes per applied path, in plan order. An editing step
   *  replaces an earlier entry rather than adding one — the file is
   *  written **once**, with its final content. */
  readonly outputs: readonly RenderedOutput[];
  readonly substitutions: readonly Substitution[];
  readonly bag: DiagnosticBag;
}

export function renderPhase2(inputs: Phase2Inputs): Phase2Result {
  const bag = new DiagnosticBag();
  const written = new Map<AppliedPath, Buffer>();
  const modes = new Map<AppliedPath, FileMode>();
  const order: AppliedPath[] = [];
  const substitutions: Substitution[] = [];

  for (const planned of inputs.steps) {
    const result = renderStep(planned.step, planned.writeSet, {
      index: planned.index,
      payload: inputs.payload,
      readPayload: inputs.readPayload,
      written,
      answers: inputs.answers,
      packName: inputs.packName,
      packVersion: inputs.packVersion,
      cliVersion: inputs.cliVersion,
    });

    for (const d of result.bag.items) bag.push(d);
    substitutions.push(...result.substitutions);

    for (const w of result.writes) {
      if (!written.has(w.path)) order.push(w.path);
      written.set(w.path, w.bytes);
      // A placing step sets the mode; an editing step changes bytes at a
      // path someone else placed and must not silently reset it to 0644.
      if (isPlacing(planned.step.op) || !modes.has(w.path)) modes.set(w.path, w.mode);
    }
  }

  return {
    outputs: order.map((path) => ({
      path,
      bytes: written.get(path) as Buffer,
      mode: modes.get(path) ?? 0o644,
    })),
    substitutions,
    bag,
  };
}
