/**
 * `strip-suffix` — copy, rewriting basename `X<suffix>.Y` to `X.Y`.
 * T-0503.
 *
 * ── No implicit `.template` default, and the reason is in the pack ────
 *
 * `suffix` is a **declared literal** matching `^\.[a-z0-9-]{1,16}$`, and
 * there is deliberately no default. The `coding` pack's payload
 * legitimately keeps `*.template.md` filenames that must **not** be
 * stripped — its document templates are templates for the *user* to copy,
 * not for the apply to rename. A default would have quietly renamed them
 * and nobody would have noticed until a project had the wrong filenames
 * throughout.
 *
 * **A `from` yielding no basename carrying the suffix is
 * `E-RECIPE-STEP-INVALID`** — the same rule as an `in` that matches
 * nothing: a declaration covering no path is an authoring mistake, and
 * accepting it silently is how a pack ends up believing it declared
 * something it did not.
 */
import { DiagnosticBag } from '../../diag/diagnostic.js';
import { matchesAny } from '../glob.js';
import type { AppliedPath } from '../../security/confine.js';
import type { StripSuffixStep } from '../types.js';
import type { RenderContext, RenderResult, Write } from '../render.js';

export function renderStripSuffix(
  step: StripSuffixStep,
  writeSet: readonly AppliedPath[],
  ctx: RenderContext,
): RenderResult {
  const bag = new DiagnosticBag();
  const writes: Write[] = [];
  const mode = step.executable === true ? 0o755 : 0o644;

  const sources = selectSources(step, ctx);
  if (!sources.some(({ source }) => carriesSuffix(source, step.suffix))) {
    bag.add('E-RECIPE-STEP-INVALID', {
      step: ctx.index,
      values: {
        index: String(ctx.index),
        op: 'strip-suffix',
        reason: `no file under "${step.from}" has a basename carrying "${step.suffix}"`,
        usage: '',
      },
    });
    return { writes: [], substitutions: [], bag };
  }

  const byApplied = new Map(sources.map(({ source, applied }) => [applied, source]));
  for (const applied of writeSet) {
    const source = byApplied.get(applied);
    if (source === undefined) continue;
    const bytes = ctx.readPayload(source);
    if (bytes === null) {
      bag.add('E-RECIPE-SOURCE-MISSING', {
        step: ctx.index,
        values: { index: String(ctx.index), op: 'strip-suffix', path: source, field: 'from' },
      });
      continue;
    }
    // Verbatim. The *name* changes; the bytes never do.
    writes.push({ path: applied, bytes, mode });
  }

  return { writes, substitutions: [], bag };
}

/** Recompute the source → applied mapping the write set produced, so the
 *  two cannot disagree about which file became which path. */
function selectSources(
  step: StripSuffixStep,
  ctx: RenderContext,
): readonly { source: string; applied: string }[] {
  if (!step.from.endsWith('/')) {
    return [{ source: step.from, applied: stripFromBasename(step.to, step.suffix) }];
  }
  const out: { source: string; applied: string }[] = [];
  for (const p of ctx.payload) {
    if (!p.startsWith(step.from)) continue;
    const rel = p.slice(step.from.length);
    if (rel === '') continue;
    if (step.exclude !== undefined && matchesAny(step.exclude, rel)) continue;
    out.push({ source: p, applied: stripFromBasename(`${step.to}${rel}`, step.suffix) });
  }
  return out;
}

/** `X<suffix>.Y` → `X.Y`, in the **basename only**: a directory segment
 *  carrying the same characters is untouched, because the step renames a
 *  file and not a path. */
function stripFromBasename(path: string, suffix: string): string {
  const cut = path.lastIndexOf('/') + 1;
  const base = path.slice(cut);
  const at = base.lastIndexOf(suffix);
  return at < 0 ? path : path.slice(0, cut) + base.slice(0, at) + base.slice(at + suffix.length);
}

function carriesSuffix(path: string, suffix: string): boolean {
  return path.slice(path.lastIndexOf('/') + 1).includes(suffix);
}
