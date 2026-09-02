/**
 * The `.claude/` gate, over **two disjoint quantifiers**. T-0803, C-39c,
 * C-32a, C-40.
 *
 * The *rule* lives in `claude-frontmatter.ts` and is one function. What
 * lives here is the only thing that could not: **which sets it runs
 * over**, and the fact that there are two of them and they must stay
 * apart.
 *
 * ── Two sets, two quantifiers, one rule ───────────────────────────────
 *
 *   THE WRITE SET      rendered bytes, at US-16 step 11. `AppliedPath`s —
 *                      what phase 2 places into the project. Quantified
 *                      over the **write set** and never over `step.to`,
 *                      because `rewrite-path` and `substitute` have no
 *                      `to` and a `to`-keyed check would exempt exactly
 *                      the two primitives that change a file's bytes
 *                      after it was placed (C-19).
 *   THE PAYLOAD SET    payload bytes, at US-16 step 3. `HarnessPath`s
 *                      under `.harness/pack/`. **Outside every quantifier
 *                      in §F1.2's table** — the payload is not a step, has
 *                      no `to` and no write set.
 *
 * ── Why the payload set is checked at all ─────────────────────────────
 *
 * *A `.claude/` subtree a pack ships but never copies out reaches the
 * project all the same*, at `.harness/pack/.claude/`, **which is
 * committed**. An agent reading the repository finds it there. Checking
 * only what phase 2 places would leave the shorter route open.
 *
 * ── Why they are not merged into one set ──────────────────────────────
 *
 * Widening the write set to cover the payload would break the
 * `AppliedPath`/`HarnessPath` separation **C-14 rests on** — the one that
 * makes *"a recipe step wrote under `.harness/`"* not merely forbidden but
 * unconstructible. Two disjoint sets, two quantifiers, one rule; and the
 * rule is called, never restated, so the two cannot drift into two rules.
 */
import { DiagnosticBag } from '../diag/diagnostic.js';
import { claudeFrontmatterFindings, readFrontmatterBytes } from './claude-frontmatter.js';
import type { AppliedPath } from './confine.js';
import type { HarnessPath } from './harness-paths.js';

/** One rendered applied file, as phase 2 produced it. */
export interface RenderedFile {
  readonly path: AppliedPath;
  readonly bytes: Buffer;
}

/** One payload file and where phase 1 puts it. The **destination** is
 *  what a diagnostic names, because that is where a reader will find the
 *  file — the pack-relative path names something nobody can open. */
export interface PayloadFile {
  readonly destination: HarnessPath;
  readonly bytes: Buffer;
}

/**
 * US-16 step 11 — over the **write set**, on rendered bytes.
 *
 * Rendered, not payload: a `substitute` could in principle introduce a
 * permission-bearing key that the template did not contain, and the file
 * the project gets is the one the claim is about.
 */
export function checkRenderedClaudeFiles(files: readonly RenderedFile[]): DiagnosticBag {
  const bag = new DiagnosticBag();
  for (const f of files) {
    // Binary is skipped, not refused: a `.claude/` directory may hold an
    // image, and a file with no decodable text has no frontmatter to
    // carry a grant.
    const text = decode(f.bytes);
    if (text === null) continue;
    for (const d of claudeFrontmatterFindings(f.path, text).items) bag.push(d);
  }
  return bag;
}

/**
 * US-16 step 3 — over the **phase-1 payload set**, on payload bytes.
 *
 * The path passed to the rule is the `.harness/pack/…` **destination**,
 * so `isClaudePath` sees the path a reader would open and the diagnostic
 * names something that will exist.
 */
export function checkPayloadClaudeFiles(files: readonly PayloadFile[]): DiagnosticBag {
  const bag = new DiagnosticBag();
  for (const f of files) {
    const text = decode(f.bytes);
    if (text === null) continue;
    for (const d of claudeFrontmatterFindings(f.destination, text).items) bag.push(d);
  }
  return bag;
}

/** `readFrontmatterBytes` is the module's own decoder wrapper and returns
 *  `null` for non-text; this reuses its classification rather than
 *  deciding "is this text" a second time. */
function decode(bytes: Buffer): string | null {
  return readFrontmatterBytes(bytes) === null ? null : bytes.toString('utf8');
}
