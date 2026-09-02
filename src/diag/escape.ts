/**
 * The one escaping function for everything the CLI prints. T-0113, C-50.
 *
 * F1 §NFR *Control characters in output*: every diagnostic, prompt and
 * disclosure row passes through here before it reaches a stream. **Stated
 * and applied once**, not per call site, which is how half of them get
 * missed.
 *
 * The fault it closes: without it a pack can put ANSI escapes in a
 * parameter `prompt`, an applied path or an agent's frontmatter and
 * **erase or overwrite the disclosure it had just triggered**, or make a
 * prompt ask a different question from the one being answered.
 * `E-SUBST-NEWLINE` does not cover this — that bounds a value written into
 * a **file**, and bounds nothing that reaches a terminal.
 *
 * **Escaped, not refused.** A path or answer containing a control
 * character is legitimate content and should print rather than abort a run.
 */

/** C0 except HT and LF, plus DEL and the two Unicode line separators. */
const IN_LINE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u2028\u2029]/g;

/** The same set, and additionally HT, LF and CR. See `escapeValue`. */
const IN_VALUE = /[\u0000-\u001F\u007F\u2028\u2029]/g;

function hex(ch: string): string {
  const cp = ch.codePointAt(0) ?? 0;
  return `\\x${cp.toString(16).padStart(2, '0')}`;
}

/**
 * Escape a **line of output** — a rendered message, a prompt, a disclosure
 * row. Horizontal tab and line feed survive, because the CLI composed them.
 */
export function escapeLine(text: string): string {
  return text.replace(IN_LINE, hex);
}

/**
 * Escape an **interpolated value** — a path, an answer, a frontmatter
 * fragment. Stricter than `escapeLine` by three characters, and the
 * difference is deliberate.
 *
 * SEC: a value is never legitimately multi-line inside a single diagnostic
 * line, and a value carrying a line feed followed by two spaces and an
 * arrow would **forge a remedy line** — a user reading a fabricated arrow
 * follows an instruction the CLI never gave. That is the
 * disclosure-forgery shape (C-1) one layer down, in a place C-50's
 * *"other than LF and HT"* exemption does not reach: that exemption was
 * written for **templates**, which the CLI controls, not for **values**,
 * which a pack does.
 *
 * Recorded as a refinement of C-50 rather than assumed — F1 change history.
 */
export function escapeValue(text: string): string {
  return text.replace(IN_VALUE, (ch) =>
    ch === '\t' ? '\\t' : ch === '\n' ? '\\n' : ch === '\r' ? '\\r' : hex(ch),
  );
}
