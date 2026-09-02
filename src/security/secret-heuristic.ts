/**
 * The credential ban. T-0309, C-15.
 *
 * **A credential-valued parameter is forbidden, not handled.** The
 * reasoning is one sentence and it is the whole design: an answer is
 * written **verbatim** into `.harness/manifest.json`, and this spec
 * requires that file to be **committed to version control** — so it is
 * exactly as public as the repository. There is no encryption story, no
 * redaction story, and no `type: "secret"`, because the alternative to
 * recording an answer is not recording it, and an unrecorded answer makes
 * the applied tree non-recomputable, which is the property G-F1-5 rests
 * on.
 *
 * ── Two checks, two actors, two severities ────────────────────────────
 *
 *   AT VALIDATE  the pack **declares** a parameter that looks like a
 *                credential → `E-PARAM-SECRET-SUSPECTED`, **exit 2**. The
 *                actor is the pack author, the fault is in the pack, and
 *                it is caught before anybody runs anything.
 *   AT ANSWER    the **value** someone types looks like a credential →
 *                `W-ANSWER-LOOKS-SECRET`, a **warning**. The actor is the
 *                person running `init`, and an error here would be a
 *                false-positive machine — the CLI cannot know that a
 *                40-character string is not simply a long project name.
 */

/**
 * The declared matcher, over a parameter's `id` or `prompt`.
 *
 * **A bare `key` deliberately does not match**, and the omission is the
 * considered part: it false-positives on `monkey`, `keyword` and
 * `sortKey`, and a ban that fires on ordinary words is one authors learn
 * to switch off — which would cost more than it saves.
 */
const SECRET_NAME =
  /api[_-]?key|private[_-]?key|secret|token|passwo?rd|credential|connection.?string/i;

/**
 * Value shapes that look like credentials.
 *
 * Deliberately narrow: each entry is a **prefix a real credential format
 * uses**, so a match is evidence rather than suspicion. The last is the
 * only heuristic one, and it is why this is a warning.
 */
const SECRET_VALUE_PREFIXES = ['-----BEGIN', 'sk-', 'ghp_', 'xoxb-', 'xoxa-', 'xoxp-', 'xoxr-', 'xoxs-'];

/** 40+ characters of high-entropy base64url. The one shape here that is a
 *  guess rather than a signature — and the reason `W-ANSWER-LOOKS-SECRET`
 *  is a warning and not an error. */
const HIGH_ENTROPY = /^[A-Za-z0-9_-]{40,}$/;

/**
 * Does a parameter's **declaration** look like a credential?
 *
 * `notASecret: true` is the author's explicit acknowledgement that it is
 * not — and that field is one of the five boolean-typed ones for exactly
 * this reason: `"notASecret": "no"` is **truthy** in JavaScript, so a
 * typo there would have turned this ban off entirely (C-34).
 */
export function declarationLooksSecret(decl: {
  readonly id?: string;
  readonly prompt?: string;
  readonly notASecret?: boolean;
}): boolean {
  if (decl.notASecret === true) return false;
  return SECRET_NAME.test(decl.id ?? '') || SECRET_NAME.test(decl.prompt ?? '');
}

/** Does an **answer's value** look like a credential? */
export function valueLooksSecret(value: string): boolean {
  const v = value.trim();
  if (SECRET_VALUE_PREFIXES.some((p) => v.startsWith(p))) return true;
  return HIGH_ENTROPY.test(v);
}

/** Exported so the tests can assert the omission of a bare `key` is
 *  deliberate rather than accidental. */
export const SECRET_NAME_PATTERN = SECRET_NAME;
