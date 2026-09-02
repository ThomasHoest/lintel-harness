/**
 * `generate` — render one payload template to one applied path. T-0506.
 *
 * Three things in order: read the template, **substitute exactly as
 * `substitute` does**, assert the declared anchors, write `to`.
 *
 * The substitution is not *like* `substitute`'s — it is the same function.
 * Two implementations of one token language would drift, and the drift
 * would show up as a pack whose `CLAUDE.md` resolved a token its other
 * files did not.
 *
 * This is the step that produces `CLAUDE.md`, and **all three v1.0 packs
 * declare `"adaptExpected": true` on it** (Q-56, Q-61): the file is the
 * skill's to rewrite after the apply, so `verify` reports an edited one as
 * `adapted` rather than as drift.
 *
 * **A binary template is refused, not rendered.** `generate` substitutes,
 * so it must decode — and decoding arbitrary bytes would produce U+FFFD
 * soup written confidently to `CLAUDE.md`.
 */
import { DiagnosticBag } from '../../diag/diagnostic.js';
import { decodeText } from '../../hash/normalize.js';
import { checkAnchors } from '../anchors.js';
import { substituteText } from './substitute.js';
import type { AppliedPath } from '../../security/confine.js';
import type { GenerateStep } from '../types.js';
import type { RenderContext, RenderResult, Substitution, Write } from '../render.js';

export function renderGenerate(
  step: GenerateStep,
  writeSet: readonly AppliedPath[],
  ctx: RenderContext,
): RenderResult {
  const bag = new DiagnosticBag();
  const substitutions: Substitution[] = [];

  const raw = ctx.readPayload(step.template);
  if (raw === null) {
    // C-38: the same check `from` gets on the other five, at the field
    // that carries THIS primitive's source. Through v2.3 the commonest
    // authoring mistake on `generate` had no named code.
    bag.add('E-RECIPE-SOURCE-MISSING', {
      step: ctx.index,
      values: { index: String(ctx.index), op: 'generate', path: step.template, field: 'template' },
    });
    return { writes: [], substitutions: [], bag };
  }

  const template = decodeText(raw);
  if (template === null) {
    bag.add('E-RECIPE-STEP-INVALID', {
      step: ctx.index,
      values: {
        index: String(ctx.index),
        op: 'generate',
        reason: `"${step.template}" is binary and cannot be rendered as a template`,
        usage: '',
      },
    });
    return { writes: [], substitutions: [], bag };
  }

  const writes: Write[] = [];
  for (const path of writeSet) {
    // `{}`, not `step`: **`generate` takes no `tokens` allowlist** (§F1.2),
    // so every `{{harness:…}}` in the template must resolve or fail. That
    // asymmetry with `substitute` is right rather than an omission — a
    // `generate` template is the pack's own file end to end, so there is no
    // third party whose tokens a step might want to leave alone, which is
    // the only thing the allowlist is for.
    const rendered = substituteText(template, path, {}, ctx, bag, substitutions);
    if (rendered === null) continue;

    // Anchors are asserted on the RENDERED text, not on the template: a
    // token could in principle produce or destroy a marker, and the
    // document the user gets is the one the claim is about.
    for (const d of checkAnchors(rendered, step.anchors, path, ctx.index).items) bag.push(d);

    writes.push({ path, bytes: Buffer.from(rendered, 'utf8'), mode: 0o644 });
  }

  return { writes, substitutions, bag };
}
