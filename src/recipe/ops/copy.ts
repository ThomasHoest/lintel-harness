/**
 * `copy` — payload file or directory in, applied path(s) out, **basenames
 * unchanged**. T-0501.
 *
 * ── Basename invariance, and why it is a rule rather than a habit ─────
 *
 * A file `from` must land at a `to` with the **same basename**. Changing
 * one is `rename`'s job, and the separation is what makes a recipe
 * readable: a reader scanning a plan can tell at a glance which steps
 * move content and which steps rename it, without comparing two paths
 * character by character.
 *
 * **Directory names may differ** — `agent-teams/` → `AgentTeams/` is step
 * 2 of the manual apply, and it is expressed by the step alone with no
 * content change. That asymmetry is deliberate: a directory rename is
 * visible in the step's two arguments, while a basename change buried in a
 * recursion of two hundred files is not.
 *
 * ── Byte-ascending, not `readdir` order ───────────────────────────────
 *
 * The recursion follows the payload listing, which `walk` produces in
 * byte-ascending path order. Two applies of one pack version must produce
 * byte-identical trees, and directory-entry order is exactly the kind of
 * platform detail that would break that silently.
 */
import { DiagnosticBag } from '../../diag/diagnostic.js';
import { matchesAny } from '../glob.js';
import type { AppliedPath } from '../../security/confine.js';
import type { CopyStep } from '../types.js';
import type { RenderContext, RenderResult, Write } from '../render.js';

export function renderCopy(
  step: CopyStep,
  writeSet: readonly AppliedPath[],
  ctx: RenderContext,
): RenderResult {
  const bag = new DiagnosticBag();
  const writes: Write[] = [];
  const mode = step.executable === true ? 0o755 : 0o644;

  if (!step.from.endsWith('/')) {
    // A file `from`. The write set already resolved it to one path, so
    // this is only the basename check — and it is checked against the
    // DECLARED `to`, not against the write set, because the write set is
    // where the answer would already have been lost.
    const fromBase = step.from.slice(step.from.lastIndexOf('/') + 1);
    const toBase = step.to.slice(step.to.lastIndexOf('/') + 1);
    if (fromBase !== toBase) {
      bag.add('E-RECIPE-STEP-INVALID', {
        step: ctx.index,
        values: {
          index: String(ctx.index),
          op: 'copy',
          reason: `it would change the basename "${fromBase}" to "${toBase}"; that is what "rename" is for`,
          usage: '',
        },
      });
      return { writes: [], substitutions: [], bag };
    }
  }

  // The write set and the payload are walked in the same order, so zipping
  // them is safe — and it is done by RECOMPUTING each source rather than
  // by index, because a write set trimmed by the confinement gate would
  // otherwise silently pair a path with the wrong file.
  for (const applied of writeSet) {
    const source = sourceFor(step, applied);
    if (source === null) continue;
    const bytes = ctx.readPayload(source);
    if (bytes === null) {
      // T-0406 already reports a missing `from`; this is the per-file
      // case, which only a payload changing under the plan can produce.
      bag.add('E-RECIPE-SOURCE-MISSING', {
        step: ctx.index,
        values: { index: String(ctx.index), op: 'copy', path: source, field: 'from' },
      });
      continue;
    }
    // Verbatim, byte for byte, TEXT OR BINARY ALIKE. `copy` is the one
    // placing primitive that never decodes: it has no substitution and no
    // find, so there is nothing it could need a string for, and decoding
    // would put every binary file at risk of U+FFFD corruption for no
    // gain at all.
    writes.push({ path: applied, bytes, mode });
  }

  return { writes, substitutions: [], bag };
}

/** The payload path an applied path came from. Inverts the write set's
 *  mapping rather than trusting position. */
function sourceFor(step: CopyStep, applied: string): string | null {
  if (!step.from.endsWith('/')) return step.from;
  if (!applied.startsWith(step.to)) return null;
  const rel = applied.slice(step.to.length);
  if (step.exclude !== undefined && matchesAny(step.exclude, rel)) return null;
  return `${step.from}${rel}`;
}
