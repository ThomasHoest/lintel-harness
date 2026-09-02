/**
 * `rewrite-path` — literal find/replace over applied text files already
 * written. T-0504.
 *
 * ── Literal, never a regex ────────────────────────────────────────────
 *
 * `find` and `replace` are **literal strings**. Not "regexes we sanitise"
 * — literals, so there is no metacharacter to escape, no catastrophic
 * backtracking to bound, and no author input reaching the regex engine at
 * all. Step 6 of the manual apply was rewriting `template/targets/…` to
 * `targets/…` in three files; nothing about that job wanted a pattern
 * language, and giving it one would have added a threat surface to buy
 * nothing.
 *
 * ── Hit counting, and why zero is a failure ───────────────────────────
 *
 * A step matching nothing across **all** its `in` files is
 * `E-REWRITE-UNUSED`. *A rewrite that no longer applies is stale, and
 * staleness is the defect this product exists to prevent.* A pack whose
 * rewrite silently stopped matching is a pack that has drifted from its
 * own payload — exactly the condition `update` exists to surface, so
 * letting it pass here would be the tool failing at its own thesis.
 *
 * Note the quantifier: **across all `in` files**, not per file. A rewrite
 * that hits in one of five matched files is doing its job.
 *
 * ── Text only ────────────────────────────────────────────────────────
 *
 * A binary file in the matched set is **skipped, not corrupted**. Decoding
 * arbitrary bytes as UTF-8 replaces invalid sequences with U+FFFD, so
 * rewriting one would destroy it while reporting success.
 */
import { DiagnosticBag } from '../../diag/diagnostic.js';
import { decodeText } from '../../hash/normalize.js';
import type { AppliedPath } from '../../security/confine.js';
import type { RewritePathStep } from '../types.js';
import type { RenderContext, RenderResult, Write } from '../render.js';

export function renderRewritePath(
  step: RewritePathStep,
  writeSet: readonly AppliedPath[],
  ctx: RenderContext,
): RenderResult {
  const bag = new DiagnosticBag();
  const writes: Write[] = [];
  let hits = 0;

  for (const path of writeSet) {
    const current = ctx.written.get(path);
    if (current === undefined) continue;

    const text = decodeText(current);
    if (text === null) continue; // binary: skipped, never rewritten.

    // `split`/`join` rather than `replaceAll`, so `find` cannot be read as
    // anything but the exact characters it is — `$&` in `replace` has a
    // meaning to `String.replaceAll` and none here.
    const parts = text.split(step.find);
    if (parts.length === 1) continue;

    hits += parts.length - 1;
    writes.push({ path, bytes: Buffer.from(parts.join(step.replace), 'utf8'), mode: 0o644 });
  }

  if (hits === 0) {
    bag.add('E-REWRITE-UNUSED', {
      step: ctx.index,
      values: {
        index: String(ctx.index),
        find: step.find,
        replace: step.replace,
        globs: step.in.join(', '),
      },
    });
  }

  return { writes, substitutions: [], bag };
}
