/**
 * Anchor assertion for `generate`. T-0506, Q-45.
 *
 * ── A literal line count, not a grammar and not a parser ──────────────
 *
 * The assertion is exactly two counts:
 *
 *   · each declared id's **opening line** appears exactly once;
 *   · the `<!-- harness:end -->` count equals the declared anchor count.
 *
 * That is the whole check. **Anchors are inert** (Q-45): nothing at v1.0
 * parses them, hashes them, merges into them or reports on them. They are
 * markers a human and a skill can find, and `update` classifies by
 * **recomputation**, not by region — which is why it needs no parser and
 * why building one here would be machinery for a question nothing asks.
 *
 * ── The limitation is stated rather than engineered around ────────────
 *
 * **A marker inside a fenced code block is counted.** A `CLAUDE.md` that
 * *documents* the anchor syntax in a fenced example will report a
 * duplicate. That is a real cost, and it is accepted rather than fixed
 * because fixing it means parsing Markdown — which is precisely the
 * parser Q-45 removed, reintroduced through a side door to serve a case
 * no bundled pack has. A pack that hits it can rename its example.
 */
import { DiagnosticBag } from '../diag/diagnostic.js';

/** The exact opening line for an anchor id. A *line*, not a pattern: the
 *  check compares whole trimmed lines, so a marker with something else on
 *  the line does not count — which is what keeps "exactly once" a claim
 *  about the document a reader sees. */
export function openingLine(id: string): string {
  return `<!-- harness:region id=${id} -->`;
}

export const CLOSING_LINE = '<!-- harness:end -->';

/**
 * Assert a rendered document's anchors.
 *
 * Every declared id is reported individually, and the message says
 * **which of the three things went wrong** — missing, duplicated or
 * unbalanced — because those have three different fixes and a single
 * "anchors are wrong" would send an author to read the whole template.
 */
export function checkAnchors(
  rendered: string,
  anchors: readonly string[],
  to: string,
  index: number,
): DiagnosticBag {
  const bag = new DiagnosticBag();
  const lines = rendered.split('\n').map((l) => l.trim());

  for (const id of anchors) {
    const n = lines.filter((l) => l === openingLine(id)).length;
    if (n === 1) continue;
    bag.add('E-ANCHOR-INVALID', {
      step: index,
      values: {
        index: String(index),
        id,
        to,
        reason: n === 0 ? 'does not appear' : `appears ${n} times`,
      },
    });
  }

  // Balance is checked over the WHOLE document rather than per id,
  // because a closing marker carries no id — that is what makes it a
  // count rather than a match, and the count is the only thing an inert
  // marker can support.
  const closings = lines.filter((l) => l === CLOSING_LINE).length;
  if (closings !== anchors.length) {
    bag.add('E-ANCHOR-INVALID', {
      step: index,
      values: {
        index: String(index),
        id: anchors.join(', '),
        to,
        reason: `is closed by ${closings} "${CLOSING_LINE}" markers where ${anchors.length} are declared`,
      },
    });
  }

  return bag;
}
