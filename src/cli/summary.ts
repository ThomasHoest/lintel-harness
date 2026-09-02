/**
 * The post-apply summary — Q-69 and IM-14. T-2103, T-2104.
 *
 * **stdout**, and it is the only thing `init` writes there
 * (`F2-ADR-003` §3.2). Diagnostics, prompts and the disclosure are
 * stderr's, so `lintel harness init coding > out.txt` leaves the machine-
 * readable residue in the file and the conversation on the terminal.
 *
 * ── Counts, not a path enumeration (Q-69) ─────────────────────────────
 *
 * The disclosure already enumerated the security-relevant subset **before
 * the write**, which is the enumeration that matters. A second complete
 * list afterwards would be the largest thing on stdout and would compete
 * with the disclosure for a reader's attention — and a user who wants the
 * full list has `pack info` before the run and `verify` after it.
 *
 * The **byte-identical** line is the one exception and is still not an
 * enumeration: it reports a **count**, and names a path only where the
 * on-disk spelling differs from the planned one. That narrow case is
 * C-36's requirement — *"report it, with both spellings named"* — because
 * a user who sees neither spelling has no way to notice that their file
 * and the pack's step disagree about case. Naming all of them would put
 * the largest list in the product on stdout on exactly the run S7 uses.
 *
 * **The wording says "content unchanged", not "left untouched", and the
 * difference is deliberate.** C-36 requires the write to be *skipped* for
 * a collision whose on-disk basename differs; `executeApply` does not
 * implement that skip and re-writes every planned path. Claiming the file
 * was left alone would be a claim the executor does not honour. The
 * observable fact — the content is what it was — is what this line
 * states, and the gap is recorded in `init.ts` rather than papered over
 * with a confident sentence.
 *
 * ── It claims nothing it did not do ───────────────────────────────────
 *
 * US-54: the block does **not** say `CLAUDE.md` was adapted, the voice
 * guide filled or the brief written. `init` performs no judgment work
 * (Q-1, IM-9) and a summary that implied otherwise would leave a user
 * treating an applied project as a finished one — which is the whole
 * reason IM-14 exists.
 *
 * ── Prose in a non-diagnostic module ──────────────────────────────────
 *
 * The same documented exception `consent.ts` and `pack-info.ts` carry.
 * There is no F1 code for *"the apply succeeded"*, so there is no
 * catalogue entry to render; F1 and IM-14 specify the **content** of this
 * block and not its wording. One exported table, so a change lands in one
 * place and no call site composes a sentence.
 */
import { escapeLine, escapeValue } from '../diag/escape.js';

/** The one place this module's own wording lives. */
export const SUMMARY_TEXT = {
  applied: 'applied',
  payload: 'payload files copied verbatim to .harness/pack/',
  files: 'files written into the project',
  scaffolds: 'scaffolds:',
  none: '(none)',
  kept: 'already byte-identical; content unchanged',
  keptSpelling: 'on disk as',
  outstanding: 'Still yours to do:',
  brief: '1. Fill project-brief.md — everything the pack does reads it.',
  voice: '2. Fill the pack\'s voice guide, where the pack ships one.',
  commit: '3. Commit, .harness/ included.',
  committed:
    '.harness/pack/ and .harness/manifest.json are committed by design; ' +
    'lintel neither writes nor suggests a .gitignore entry for them.',
  answers:
    'Recorded parameter answers are written verbatim into that committed ' +
    'manifest, and are exactly as public as this repository.',
} as const;

/** A `--force` collision whose content was already what the pack ships. */
export interface KeptPath {
  /** The path the recipe planned. */
  readonly planned: string;
  /** The spelling on disk, which `collisionKey` matched and which may
   *  differ in case or normalization (C-36, N-5). */
  readonly onDisk: string;
}

export interface SummaryInput {
  readonly packName: string;
  readonly packVersion: string;
  /** Phase 1: files copied to `.harness/pack/`. */
  readonly payloadFiles: number;
  /** Phase 2: files written into the project proper. */
  readonly appliedFiles: number;
  /** Selected scaffold ids, in **pack-declared** order (F1 US-9). */
  readonly scaffolds: readonly string[];
  readonly kept: readonly KeptPath[];
}

/**
 * The success block. **Pure**, and printed on a `0`-exit run and on no
 * other (US-54) — which is the caller's to honour, since a function that
 * returns lines cannot decide whether they are emitted.
 */
export function summaryLines(input: SummaryInput): readonly string[] {
  const lines: string[] = [
    `lintel: ${escapeLine(SUMMARY_TEXT.applied)} ${escapeValue(input.packName)} ` +
      `${escapeValue(input.packVersion)}.`,
    `  ${String(input.payloadFiles)} ${escapeLine(SUMMARY_TEXT.payload)}`,
    `  ${String(input.appliedFiles)} ${escapeLine(SUMMARY_TEXT.files)}`,
    `  ${escapeLine(SUMMARY_TEXT.scaffolds)} ` +
      (input.scaffolds.length === 0
        ? escapeLine(SUMMARY_TEXT.none)
        : input.scaffolds.map(escapeValue).join(', ')),
  ];

  if (input.kept.length > 0) {
    lines.push(`  ${String(input.kept.length)} ${escapeLine(SUMMARY_TEXT.kept)}`);
    // A path is named **only** where the two spellings differ. That is the
    // whole of C-36's report, and it is the only place `--force`'s result
    // is not fully described by the count above it.
    for (const k of input.kept) {
      if (k.onDisk === k.planned) continue;
      lines.push(
        `    ${escapeValue(k.planned)}   ${escapeLine(SUMMARY_TEXT.keptSpelling)} ` +
          `${escapeValue(k.onDisk)}`,
      );
    }
  }

  return [
    ...lines,
    '',
    escapeLine(SUMMARY_TEXT.outstanding),
    `  ${escapeLine(SUMMARY_TEXT.brief)}`,
    `  ${escapeLine(SUMMARY_TEXT.voice)}`,
    `  ${escapeLine(SUMMARY_TEXT.commit)}`,
    '',
    escapeLine(SUMMARY_TEXT.committed),
    escapeLine(SUMMARY_TEXT.answers),
  ];
}
