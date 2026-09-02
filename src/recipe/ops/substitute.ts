/**
 * `substitute` — resolve `{{harness:…}}` tokens in applied text files
 * already written. T-0505.
 *
 * ── A closed token set, resolved once, never re-scanned ───────────────
 *
 * Four tokens and one escape, and nothing else:
 *
 *   `{{harness:param.<id>}}`   the recorded answer
 *   `{{harness:pack.name}}`    · `{{harness:pack.version}}`
 *   `{{harness:cli.version}}`
 *   `{{harness:lit:<X>}}`      renders the literal `{{harness:<X>}}`
 *
 * **One pass.** The escape is resolved in the same pass as everything
 * else and its output is never re-scanned, so `{{harness:lit:lit:x}}`
 * renders `{{harness:lit:x}}` **and nothing further**. A second pass would
 * make the escape unable to escape itself, which is the one thing an
 * escape has to do.
 *
 * **Every other `{{…}}` is copied verbatim.** Applying the `coding` pack
 * leaves every `{{Feature name}}`, `{{YYYY-MM-DD}}` and `{{PLACEHOLDER}}`
 * in its document templates byte-identical — those are placeholders for a
 * human to fill later, and a substituter that ate them would destroy the
 * templates it was copying.
 *
 * ── SEC (C-9): a substituted value may not contain a line break ───────
 *
 * `E-SUBST-NEWLINE`, exit 2, on `\n`, `\r`, `U+2028` or `U+2029`. This is
 * the **sufficient** condition and it holds *when a pack author's `pattern`
 * is weak* — which is exactly why it exists separately from
 * `E-PARAM-INVALID`. A single answer becoming two lines of a generated
 * file is a structural injection, and the parameter's own grammar is not a
 * control this rule may depend on.
 *
 * ── No JSON destination, therefore no JSON escaping ───────────────────
 *
 * Q-54 deleted `merge-json`, so every phase-2 destination at v1.0 is a
 * text file. The escaping rule and the deep-equal re-parse went with it.
 */
import { DiagnosticBag } from '../../diag/diagnostic.js';
import { decodeText } from '../../hash/normalize.js';
import type { AppliedPath } from '../../security/confine.js';
import type { SubstituteStep } from '../types.js';
import type { RenderContext, RenderResult, Substitution, Write } from '../render.js';

/** The token body grammar. Deliberately permissive about what it CAPTURES
 *  and strict about what it RESOLVES: an unrecognised body must reach
 *  `E-SUBST-UNRESOLVED` rather than be left in the file, since a token
 *  that survives into output is a pack's placeholder shipped to a user. */
const TOKEN = /\{\{harness:([^}]*)\}\}/g;

const LINE_BREAK = /[\n\r\u2028\u2029]/;

export function renderSubstitute(
  step: SubstituteStep,
  writeSet: readonly AppliedPath[],
  ctx: RenderContext,
): RenderResult {
  const bag = new DiagnosticBag();
  const writes: Write[] = [];
  const substitutions: Substitution[] = [];

  for (const path of writeSet) {
    const current = ctx.written.get(path);
    if (current === undefined) continue;
    const text = decodeText(current);
    if (text === null) continue; // binary: never substituted into.

    const out = substituteText(text, path, step, ctx, bag, substitutions);
    if (out !== null) writes.push({ path, bytes: Buffer.from(out, 'utf8'), mode: 0o644 });
  }

  return { writes, substitutions, bag };
}

/**
 * The single pass.
 *
 * Exported because `generate` substitutes **exactly as this does** — one
 * implementation, so the two primitives cannot drift into two token
 * languages. Returns `null` when a fault was recorded, so no bytes are
 * produced for a file whose substitution failed.
 */
export function substituteText(
  text: string,
  path: AppliedPath,
  step: { readonly tokens?: Readonly<Record<string, string>> },
  ctx: RenderContext,
  bag: DiagnosticBag,
  substitutions: Substitution[],
): string | null {
  let failed = false;

  const out = text.replace(TOKEN, (whole, body: string, offset: number) => {
    // `tokens`, when present, is an ALLOWLIST of the bodies this step may
    // resolve. A token outside it is unresolved rather than silently
    // copied: the pack declared which tokens it meant, and one it did not
    // mean is a mistake in one of the two places.
    if (step.tokens !== undefined && !(body in step.tokens)) {
      failed = true;
      unresolved(bag, body, path, text, offset);
      return whole;
    }

    // The escape, resolved in THIS pass and never re-scanned.
    if (body.startsWith('lit:')) return `{{harness:${body.slice(4)}}}`;

    const value = resolve(body, ctx);
    if (value === null) {
      failed = true;
      unresolved(bag, body, path, text, offset);
      return whole;
    }

    // C-9, and it holds even where the parameter's own `pattern` is weak.
    if (LINE_BREAK.test(value)) {
      failed = true;
      bag.add('E-SUBST-NEWLINE', {
        path,
        values: { id: body.startsWith('param.') ? body.slice(6) : body, path },
      });
      return whole;
    }

    if (body.startsWith('param.')) {
      // T-0804's by-product, recorded at the ONLY moment it is known.
      // Reconstructing it afterwards would mean searching output for
      // values, which finds coincidences.
      substitutions.push({ path, id: body.slice(6), value });
    }
    return value;
  });

  return failed ? null : out;
}

function resolve(body: string, ctx: RenderContext): string | null {
  if (body === 'pack.name') return ctx.packName;
  if (body === 'pack.version') return ctx.packVersion;
  if (body === 'cli.version') return ctx.cliVersion;
  if (body.startsWith('param.')) {
    const answer = ctx.answers.get(body.slice(6));
    return answer === undefined ? null : String(answer);
  }
  return null;
}

/** The message names a line, so the author can find the token rather than
 *  search the file for it. */
function unresolved(
  bag: DiagnosticBag,
  body: string,
  path: AppliedPath,
  text: string,
  offset: number,
): void {
  const line = text.slice(0, offset).split('\n').length;
  bag.add('E-SUBST-UNRESOLVED', {
    path,
    line,
    values: {
      token: body,
      path,
      line: String(line),
      id: body.startsWith('param.') ? body.slice(6) : body,
    },
  });
}
