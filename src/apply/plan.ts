/**
 * `planApply` — both phases, decided before anything is written. T-1105.
 *
 * **Pure. It writes nothing, ever.** It plans phase 1 and phase 2,
 * computes `payloadDigest` over the **planned** payload set, builds the
 * manifest and the disclosure, and hands back a plan.
 *
 * That purity is what makes `pack info` able to render an apply
 * *completely* without performing it — the claim that made a script
 * primitive refusable. It is also what lets the disclosure a user approves
 * be **the same object** the executor writes, rather than a description of
 * it.
 *
 * ── There is no `consent` field, and that is deliberate (Q-54) ────────
 *
 * `F1-ADR-001`'s contract declares `ApplyInputs.consent`, and **Q-54
 * deleted the consent gate along with `merge-json`**. Nothing writes
 * `.claude/settings.json` at v1.0, so there is nothing to consent to. A
 * removed surface cannot be got wrong; leaving the field would have left a
 * parameter that reads as a security control and controls nothing.
 *
 * ── The digest is over the PLANNED payload set ────────────────────────
 *
 * Not over what phase 1 happened to write. Computing it in advance is what
 * lets the **manifest be written last** — the plan already knows what the
 * payload will be, so the manifest can record it before a single copy is
 * made, and the executor never has to re-read a tree to describe it.
 */
import { DiagnosticBag } from '../diag/diagnostic.js';
import { payloadDigest } from '../payload/digest.js';
import { planPayloadCopy, PAYLOAD_FILE_MODE, type PayloadEntry } from '../payload/copy-payload.js';
import { renderPhase2, type Phase2Inputs } from './plan-phase2.js';
import { checkPayloadClaudeFiles, checkRenderedClaudeFiles } from '../security/claude-gate.js';
import type { TreeDigest } from '../hash/digest.js';
import type { WritablePath } from '../security/harness-paths.js';
import type { Substitution } from '../recipe/render.js';

export interface PlannedFile {
  readonly path: WritablePath;
  readonly bytes: Buffer;
  readonly phase: 1 | 2;
  readonly executable: boolean;
  /** From the destination-side probe. `false` means the plan expects to
   *  **create** this path, which selects exclusive-create semantics. */
  readonly preExisting: boolean;
  readonly preHash: string | null;
  readonly preMode: number | null;
}

export interface ApplyInputs {
  readonly packName: string;
  readonly packVersion: string;
  readonly cliVersion: string;
  readonly payloadEntries: readonly PayloadEntry[];
  readonly readPayload: (packRelativePath: string) => Buffer | null;
  readonly phase2: Omit<Phase2Inputs, 'payload' | 'readPayload' | 'packName' | 'packVersion' | 'cliVersion'>;
  /** The destination-side probe. The **only** filesystem knowledge the
   *  plan has, and it is read-only. */
  readonly probe: (path: WritablePath) => { readonly hash: string; readonly mode: number | null } | null;
  // NO `consent` — Q-54 deleted the gate. See the header.
}

export interface ApplyPlan {
  readonly files: readonly PlannedFile[];
  readonly payloadDigest: TreeDigest;
  readonly substitutions: readonly Substitution[];
  readonly bag: DiagnosticBag;
}

export async function planApply(inputs: ApplyInputs): Promise<ApplyPlan> {
  const bag = new DiagnosticBag();
  const files: PlannedFile[] = [];

  /* ── phase 1 ───────────────────────────────────────────────────────── */

  const payload = planPayloadCopy(inputs.packName, inputs.payloadEntries);
  for (const d of payload.bag.items) bag.push(d);

  const payloadFiles: { destination: WritablePath; bytes: Buffer }[] = [];
  for (const copy of payload.copies) {
    const bytes = inputs.readPayload(copy.from);
    if (bytes === null) continue;
    payloadFiles.push({ destination: copy.to, bytes });
    files.push({ path: copy.to, bytes, phase: 1, executable: false, ...probeOf(inputs, copy.to) });
  }

  // US-16 step 3 — the payload quantifier. A `.claude/` subtree a pack
  // ships but never copies out still reaches the project, at
  // `.harness/pack/.claude/`, which is committed.
  for (const d of checkPayloadClaudeFiles(payloadFiles as never).items) bag.push(d);

  const digest = await payloadDigest(
    payload.copies.map((c) => c.from),
    async (p) => inputs.readPayload(p) ?? Buffer.alloc(0),
  );

  /* ── phase 2 ───────────────────────────────────────────────────────── */

  const rendered = renderPhase2({
    ...inputs.phase2,
    payload: inputs.payloadEntries.filter((e) => e.kind === 'file').map((e) => e.path),
    readPayload: inputs.readPayload,
    packName: inputs.packName,
    packVersion: inputs.packVersion,
    cliVersion: inputs.cliVersion,
  });
  for (const d of rendered.bag.items) bag.push(d);

  // US-16 step 11 — the write-set quantifier, over RENDERED bytes.
  for (const d of checkRenderedClaudeFiles(rendered.outputs).items) bag.push(d);

  for (const out of rendered.outputs) {
    files.push({
      path: out.path,
      bytes: out.bytes,
      phase: 2,
      executable: out.mode === 0o755,
      ...probeOf(inputs, out.path),
    });
  }

  return { files, payloadDigest: digest, substitutions: rendered.substitutions, bag };
}

/** The destination-side probe, normalised into the three fields the
 *  journal and the writer both need. */
function probeOf(
  inputs: ApplyInputs,
  path: WritablePath,
): { preExisting: boolean; preHash: string | null; preMode: number | null } {
  const found = inputs.probe(path);
  return found === null
    ? { preExisting: false, preHash: null, preMode: null }
    : { preExisting: true, preHash: found.hash, preMode: found.mode };
}

/** Phase 1's fixed mode, re-exported so a caller never has to remember
 *  that it is a constant rather than a default (C-26). */
export { PAYLOAD_FILE_MODE };
