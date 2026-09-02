/**
 * Semver parse and total compare. T-0304.
 *
 * **~30 lines and no dependency** (U-8, closed by Q-81), and **no range
 * arithmetic** — `minCliVersion` is a **floor**, not a range, so the only
 * question ever asked is *"is A at least B?"*. A range parser would be
 * machinery for a question the format does not pose.
 *
 * Two consumers, and their exit classes differ because the faults do:
 * `E-PACK-CLI-TOO-OLD` (exit 1 — upgrade the CLI, a user can act) and
 * `E-PACK-FORMAT-NEWER` (exit 2 — the pack declares a format this build
 * cannot read, which is an integrity fault).
 */

export interface Semver {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
  /** Dot-separated identifiers after `-`, or `null` when absent. */
  readonly prerelease: readonly string[] | null;
}

const RE = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/;

/** Parse, or `null`. Build metadata after `+` is accepted and ignored,
 *  which is what the spec says it is: not part of precedence. */
export function parseSemver(s: string): Semver | null {
  const m = RE.exec(s);
  if (m === null) return null;
  return {
    major: Number(m[1]),
    minor: Number(m[2]),
    patch: Number(m[3]),
    prerelease: m[4] === undefined ? null : m[4].split('.'),
  };
}

/** `-1 | 0 | 1`. Total and deterministic — no locale, no collator. */
export function compareSemver(a: Semver, b: Semver): -1 | 0 | 1 {
  for (const k of ['major', 'minor', 'patch'] as const) {
    if (a[k] !== b[k]) return a[k] < b[k] ? -1 : 1;
  }
  // A prerelease has LOWER precedence than the release it precedes:
  // 1.0.0-alpha < 1.0.0. Getting this backwards would let a pre-release
  // CLI satisfy a floor it does not meet.
  if (a.prerelease === null && b.prerelease === null) return 0;
  if (a.prerelease === null) return 1;
  if (b.prerelease === null) return -1;

  const len = Math.max(a.prerelease.length, b.prerelease.length);
  for (let i = 0; i < len; i++) {
    const x = a.prerelease[i];
    const y = b.prerelease[i];
    if (x === undefined) return -1; // a shorter set of identifiers is lower
    if (y === undefined) return 1;
    if (x === y) continue;
    const nx = /^\d+$/.test(x);
    const ny = /^\d+$/.test(y);
    if (nx && ny) return Number(x) < Number(y) ? -1 : 1;
    // Numeric identifiers always have lower precedence than alphanumeric.
    if (nx !== ny) return nx ? -1 : 1;
    return x < y ? -1 : 1;
  }
  return 0;
}

/** True iff `version` is at least `floor`. The only comparison the format
 *  actually asks for. */
export function satisfiesFloor(version: string, floor: string): boolean | null {
  const v = parseSemver(version);
  const f = parseSemver(floor);
  if (v === null || f === null) return null;
  return compareSemver(v, f) >= 0;
}
