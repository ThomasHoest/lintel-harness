/**
 * `rename` — one payload **file** in, one applied path out, basename may
 * differ. T-0502.
 *
 * The whole primitive is `copy`'s basename rule inverted, and it exists so
 * that rule can be strict. A recipe that used `copy` for both would give a
 * reader no way to tell a move from a rename without reading two paths
 * character by character.
 *
 * **A directory `from` is `E-RECIPE-STEP-INVALID`.** Not because it could
 * not be implemented, but because it has no meaning: `rename` renames one
 * basename, and a directory `from` would be asking for one new basename to
 * cover many files.
 */
import { DiagnosticBag } from '../../diag/diagnostic.js';
import type { AppliedPath } from '../../security/confine.js';
import type { RenameStep } from '../types.js';
import type { RenderContext, RenderResult, Write } from '../render.js';

export function renderRename(
  step: RenameStep,
  writeSet: readonly AppliedPath[],
  ctx: RenderContext,
): RenderResult {
  const bag = new DiagnosticBag();

  if (step.from.endsWith('/')) {
    bag.add('E-RECIPE-STEP-INVALID', {
      step: ctx.index,
      values: {
        index: String(ctx.index),
        op: 'rename',
        reason: '"from" is a directory; rename takes one file',
        usage: '',
      },
    });
    return { writes: [], substitutions: [], bag };
  }

  const bytes = ctx.readPayload(step.from);
  if (bytes === null) {
    bag.add('E-RECIPE-SOURCE-MISSING', {
      step: ctx.index,
      values: { index: String(ctx.index), op: 'rename', path: step.from, field: 'from' },
    });
    return { writes: [], substitutions: [], bag };
  }

  // Verbatim, like `copy`, and for the same reason: no decode, no risk.
  const writes: Write[] = writeSet.map((path) => ({ path, bytes, mode: 0o644 as const }));
  return { writes, substitutions: [], bag };
}
