/**
 * The **one** bounded glob matcher. T-0306, C-27, U-3.
 *
 * Three consumers and one implementation: `exclude` (against pack-relative
 * payload paths), `in` (against applied paths) and anatomy `paths`
 * (against pack-relative paths). One matcher because a pattern that meant
 * different things in three places would be a format nobody could reason
 * about.
 *
 * ── THE DIALECT, decided here and stated rather than implied ──────────
 *
 * U-3 left the dialect open — *"`*` vs `**`, character classes, braces,
 * negation"* — and instructed the smallest that serves the three
 * consumers. **Surveying every glob the three bundled packs actually
 * use answers it: `*` is the only non-literal character any of them
 * contains.** So:
 *
 *   `*`   matches zero or more characters **within one segment**, and
 *         never crosses `/`.
 *   everything else is **literal**, including `?`, `[`, `]`, `{`, `}`,
 *         `!` and `**` (which is just two stars, and therefore still
 *         single-segment).
 *
 * **No `**`, deliberately.** Nothing needs it, and the asymmetry decides
 * it: adding `**` later is **additive** — patterns that work keep working
 * — whereas shipping it and removing it would break packs. A dialect can
 * grow; it cannot shrink.
 *
 * **No character classes, braces or negation.** Each is a small grammar
 * with its own edge cases, and G-F1-9 requires the matcher to be small
 * enough that `pack info` renders an apply **completely** — a claim that
 * degrades as the pattern language grows past what a reader can evaluate
 * in their head.
 *
 * ── SEC (C-27) ────────────────────────────────────────────────────────
 *
 * **This module takes no filesystem handle**, and that is the point
 * rather than an implementation detail. An `in` glob's resolution domain
 * is the plan's ordered written set — `readonly AppliedPath[]` — so
 * *"resolve against disk"* is **not expressible** here. A matcher that
 * could stat would let a pattern's meaning depend on what happened to be
 * on the machine.
 */
import type { AppliedPath } from '../security/confine.js';

/** Bound on pattern length. An author-supplied pattern is untrusted
 *  input; this one is generous for real patterns and finite for a
 *  pathological one. */
export const MAX_PATTERN_LENGTH = 256;

/**
 * Compile one segment's pattern into a matcher.
 *
 * Linear, and no regex: `*` inside a single segment needs only a
 * two-pointer walk with one backtrack point, so the classic
 * catastrophic-backtracking shape cannot arise. Building a `RegExp` from
 * author input would reintroduce exactly the risk C-7 bounds elsewhere.
 */
function matchSegment(pattern: string, text: string): boolean {
  let p = 0;
  let t = 0;
  let starP = -1;
  let starT = 0;
  while (t < text.length) {
    if (p < pattern.length && (pattern[p] === text[t] || false)) {
      p++;
      t++;
    } else if (p < pattern.length && pattern[p] === '*') {
      starP = p;
      starT = t;
      p++;
    } else if (starP !== -1) {
      p = starP + 1;
      t = ++starT;
    } else {
      return false;
    }
  }
  while (p < pattern.length && pattern[p] === '*') p++;
  return p === pattern.length;
}

/**
 * Match one path against one pattern.
 *
 * Both are `/`-separated and compared **segment by segment**, which is
 * what keeps `*` from crossing a separator: `agents/*.md` matches
 * `agents/architect.md` and **not** `agents/sub/architect.md`.
 */
export function matchGlob(pattern: string, path: string): boolean {
  if (pattern.length > MAX_PATTERN_LENGTH) return false;
  const pSegs = pattern.split('/');
  const tSegs = path.split('/');
  if (pSegs.length !== tSegs.length) return false;
  for (let i = 0; i < pSegs.length; i++) {
    if (!matchSegment(pSegs[i] as string, tSegs[i] as string)) return false;
  }
  return true;
}

/** True iff any pattern matches. The shape every consumer wants. */
export function matchesAny(patterns: readonly string[], path: string): boolean {
  return patterns.some((p) => matchGlob(p, path));
}

/**
 * Select from a **given** set of applied paths.
 *
 * C-27 in one signature: the domain is a list the caller already holds —
 * the plan's ordered written set — and there is no parameter through
 * which disk could enter. Order is the caller's, preserved, because
 * `rewrite-path` and `substitute` act in written order.
 */
export function selectPaths(
  patterns: readonly string[],
  domain: readonly AppliedPath[],
): readonly AppliedPath[] {
  return domain.filter((p) => matchesAny(patterns, p));
}

/** Patterns that matched nothing, for `E-REWRITE-UNUSED` and the
 *  `in`-matches-nothing rule — a declaration covering no path is an
 *  authoring mistake, and silently accepting it is how a pack ends up
 *  believing it declared something it did not. */
export function unusedPatterns(
  patterns: readonly string[],
  domain: readonly string[],
): readonly string[] {
  return patterns.filter((p) => !domain.some((d) => matchGlob(p, d)));
}
