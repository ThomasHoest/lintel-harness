/**
 * The single code taxonomy. T-0103.
 *
 * **`F1-spec-pack-format-and-manifest.md` §Error States is the only
 * catalogue in the product**, and this module is its typed projection —
 * nothing more. The table there is authoritative; the entries below are
 * derived from it and `codes.test.ts` re-derives them on every run and
 * fails on any divergence, so there is **one copy of the truth** rather
 * than two that agree until they do not.
 *
 * That is why no message text lives here (it is `catalogue.ts`'s) and why
 * no row carries a description: a comment restating the spec is a second
 * copy wearing a disguise.
 *
 * GENERATED shape, hand-reviewed. To add a code: add the row to F1
 * §Error States first, then regenerate. A code invented here and absent
 * there fails the test, which is the intended direction — F1 owns the
 * catalogue and no other document may invent a code.
 */

/** F1 §Error States. Four, and the enumeration is closed. */
export type ExitClass = 0 | 1 | 2 | 3;

/** `E-` codes are errors; `W-` codes are warnings. */
export type Severity = 'error' | 'warning';

/**
 * Q-60's second axis, carried by every `W-` code.
 *
 * `defect` — author-fixable; `--strict` promotes it.
 * `notice` — reports a state the pack declared on purpose; **`--strict`
 * never promotes it**, because a flag that could would recreate the
 * problem Q-60 split the severity to solve.
 */
export type DiagnosticClass = 'defect' | 'notice';

export type DiagnosticCode =
  | 'E-ALREADY-APPLIED'
  | 'E-ANATOMY-EMPTY'
  | 'E-ANATOMY-MISSING'
  | 'E-ANATOMY-NO-NOTE'
  | 'E-ANATOMY-NO-REASON'
  | 'E-ANATOMY-SOURCE-ON-ABSENT'
  | 'E-ANCHOR-INVALID'
  | 'E-CLAUDE-PERMISSION-MODE'
  | 'E-CLAUDE-TOOL-GRANT'
  | 'E-CLI-ARG-UNEXPECTED'
  | 'E-CLI-FLAG-VALUE-MISSING'
  | 'E-CLI-PACK-MISSING'
  | 'E-CLI-UNKNOWN-COMMAND'
  | 'E-CLI-UNKNOWN-FLAG'
  | 'E-CLI-UNKNOWN-PACK'
  | 'E-CONTENT-TOO-LARGE'
  | 'E-DEST-SYMLINK'
  | 'E-DISCLOSURE-FORGERY'
  | 'E-EXEC-DEST-FORBIDDEN'
  | 'E-EXEC-ROOT-UNDECLARED'
  | 'E-EXEC-TOO-MANY'
  | 'E-FLAG-NOT-PERMITTED'
  | 'E-JOURNAL-PRESENT'
  | 'E-JOURNAL-UNREADABLE'
  | 'E-JSON-DUPLICATE-KEY'
  | 'E-LOCK-HELD'
  | 'E-MANIFEST-ANSWER-INVALID'
  | 'E-MANIFEST-CORRUPT'
  | 'E-MANIFEST-MISSING'
  | 'E-MANIFEST-NEWER'
  | 'E-MAP-CASE-COLLISION'
  | 'E-MAP-COLLISION'
  | 'E-MAP-ESCAPES-ROOT'
  | 'E-MAP-NORM-COLLISION'
  | 'E-MAP-PATH-GRAMMAR'
  | 'E-MAP-RESERVED-DEST'
  | 'E-PACK-CLI-TOO-OLD'
  | 'E-PACK-FORMAT-NEWER'
  | 'E-PACK-INVALID'
  | 'E-PARAM-COMBINATORICS'
  | 'E-PARAM-FLAG-INVALID'
  | 'E-PARAM-INVALID'
  | 'E-PARAM-MISSING'
  | 'E-PARAM-NO-PATTERN'
  | 'E-PARAM-PATTERN-INVALID'
  | 'E-PARAM-SECRET-SUSPECTED'
  | 'E-PARAM-UNANSWERABLE'
  | 'E-PARAM-UNDECIDABLE'
  | 'E-PAYLOAD-DIGEST-MISMATCH'
  | 'E-PAYLOAD-PATH-INVALID'
  | 'E-PAYLOAD-TOO-LARGE'
  | 'E-RECIPE-FORMAT-NEWER'
  | 'E-RECIPE-INVALID'
  | 'E-RECIPE-MISSING'
  | 'E-RECIPE-PRIMITIVE-UNKNOWN'
  | 'E-RECIPE-SOURCE-MISSING'
  | 'E-RECIPE-STEP-INVALID'
  | 'E-RECIPE-TOO-MANY-STEPS'
  | 'E-REWRITE-UNUSED'
  | 'E-SCAFFOLD-COLLISION'
  | 'E-SCAFFOLD-EXCLUSIVE'
  | 'E-SCAFFOLD-UNKNOWN'
  | 'E-SET-UNKNOWN-PARAM'
  | 'E-SUBST-NEWLINE'
  | 'E-SUBST-UNRESOLVED'
  | 'E-SYMLINK-IN-PACK'
  | 'E-TARGET-EXISTS'
  | 'E-TARGET-NOT-A-FILE'
  | 'E-TARGET-RACE'
  | 'E-TRAVERSAL-LIMIT'
  | 'E-UNKNOWN-VALUE'
  | 'E-UPDATE-AVAILABLE'
  | 'E-UPDATE-NOT-NEWER'
  | 'E-UPDATE-PARAM-UNANSWERED'
  | 'E-UPDATE-SCAFFOLD-DROPPED'
  | 'E-VERIFY-MISMATCH'
  | 'E-WRITE-FAILED'
  | 'W-ANATOMY-ABSENT'
  | 'W-ANATOMY-PROVISIONAL'
  | 'W-ANSWER-LOOKS-SECRET'
  | 'W-FOLDER-README-MISSING'
  | 'W-HOOK-SCRIPT-INERT'
  | 'W-LINK-DANGLING'
  | 'W-LINK-FALLBACK'
  | 'W-LOCK-STALE-BROKEN'
  | 'W-MANIFEST-NEWER-CLI'
  | 'W-PACK-NEWER-THAN-CLI'
  | 'W-PATH-NON-NFC'
  | 'W-ROLLBACK-KEPT'
  | 'W-SCAN-SYMLINK-SKIPPED'
  | 'W-UNKNOWN-KEY';

export interface CodeEntry {
  readonly severity: Severity;
  readonly exit: ExitClass;
  /** `W-` codes only. Absent on an `E-` code, and absent on a `W-` code
   *  whose class has not been declared — see `classOf`. */
  readonly class?: DiagnosticClass;
}

/** Every code in the catalogue. **91** at F1 v4.0. */
export const CODES: Readonly<Record<DiagnosticCode, CodeEntry>> = {
  'E-ALREADY-APPLIED': { severity: 'error', exit: 1 },
  'E-ANATOMY-EMPTY': { severity: 'error', exit: 2 },
  'E-ANATOMY-MISSING': { severity: 'error', exit: 2 },
  'E-ANATOMY-NO-NOTE': { severity: 'error', exit: 2 },
  'E-ANATOMY-NO-REASON': { severity: 'error', exit: 2 },
  'E-ANATOMY-SOURCE-ON-ABSENT': { severity: 'error', exit: 2 },
  'E-ANCHOR-INVALID': { severity: 'error', exit: 2 },
  'E-CLAUDE-PERMISSION-MODE': { severity: 'error', exit: 2 },
  'E-CLAUDE-TOOL-GRANT': { severity: 'error', exit: 2 },
  'E-CLI-ARG-UNEXPECTED': { severity: 'error', exit: 1 },
  'E-CLI-FLAG-VALUE-MISSING': { severity: 'error', exit: 1 },
  'E-CLI-PACK-MISSING': { severity: 'error', exit: 1 },
  'E-CLI-UNKNOWN-COMMAND': { severity: 'error', exit: 1 },
  'E-CLI-UNKNOWN-FLAG': { severity: 'error', exit: 1 },
  'E-CLI-UNKNOWN-PACK': { severity: 'error', exit: 1 },
  'E-CONTENT-TOO-LARGE': { severity: 'error', exit: 2 },
  'E-DEST-SYMLINK': { severity: 'error', exit: 2 },
  'E-DISCLOSURE-FORGERY': { severity: 'error', exit: 2 },
  'E-EXEC-DEST-FORBIDDEN': { severity: 'error', exit: 2 },
  'E-EXEC-ROOT-UNDECLARED': { severity: 'error', exit: 2 },
  'E-EXEC-TOO-MANY': { severity: 'error', exit: 2 },
  'E-FLAG-NOT-PERMITTED': { severity: 'error', exit: 1 },
  'E-JOURNAL-PRESENT': { severity: 'error', exit: 2 },
  'E-JOURNAL-UNREADABLE': { severity: 'error', exit: 2 },
  'E-JSON-DUPLICATE-KEY': { severity: 'error', exit: 2 },
  'E-LOCK-HELD': { severity: 'error', exit: 1 },
  'E-MANIFEST-ANSWER-INVALID': { severity: 'error', exit: 2 },
  'E-MANIFEST-CORRUPT': { severity: 'error', exit: 2 },
  'E-MANIFEST-MISSING': { severity: 'error', exit: 1 },
  'E-MANIFEST-NEWER': { severity: 'error', exit: 2 },
  'E-MAP-CASE-COLLISION': { severity: 'error', exit: 2 },
  'E-MAP-COLLISION': { severity: 'error', exit: 2 },
  'E-MAP-ESCAPES-ROOT': { severity: 'error', exit: 2 },
  'E-MAP-NORM-COLLISION': { severity: 'error', exit: 2 },
  'E-MAP-PATH-GRAMMAR': { severity: 'error', exit: 2 },
  'E-MAP-RESERVED-DEST': { severity: 'error', exit: 2 },
  'E-PACK-CLI-TOO-OLD': { severity: 'error', exit: 1 },
  'E-PACK-FORMAT-NEWER': { severity: 'error', exit: 2 },
  'E-PACK-INVALID': { severity: 'error', exit: 2 },
  'E-PARAM-COMBINATORICS': { severity: 'error', exit: 2 },
  'E-PARAM-FLAG-INVALID': { severity: 'error', exit: 2 },
  'E-PARAM-INVALID': { severity: 'error', exit: 1 },
  'E-PARAM-MISSING': { severity: 'error', exit: 1 },
  'E-PARAM-NO-PATTERN': { severity: 'error', exit: 2 },
  'E-PARAM-PATTERN-INVALID': { severity: 'error', exit: 2 },
  'E-PARAM-SECRET-SUSPECTED': { severity: 'error', exit: 2 },
  'E-PARAM-UNANSWERABLE': { severity: 'error', exit: 1 },
  'E-PARAM-UNDECIDABLE': { severity: 'error', exit: 2 },
  'E-PAYLOAD-DIGEST-MISMATCH': { severity: 'error', exit: 2 },
  'E-PAYLOAD-PATH-INVALID': { severity: 'error', exit: 2 },
  'E-PAYLOAD-TOO-LARGE': { severity: 'error', exit: 2 },
  'E-RECIPE-FORMAT-NEWER': { severity: 'error', exit: 2 },
  'E-RECIPE-INVALID': { severity: 'error', exit: 2 },
  'E-RECIPE-MISSING': { severity: 'error', exit: 2 },
  'E-RECIPE-PRIMITIVE-UNKNOWN': { severity: 'error', exit: 2 },
  'E-RECIPE-SOURCE-MISSING': { severity: 'error', exit: 2 },
  'E-RECIPE-STEP-INVALID': { severity: 'error', exit: 2 },
  'E-RECIPE-TOO-MANY-STEPS': { severity: 'error', exit: 2 },
  'E-REWRITE-UNUSED': { severity: 'error', exit: 2 },
  'E-SCAFFOLD-COLLISION': { severity: 'error', exit: 2 },
  'E-SCAFFOLD-EXCLUSIVE': { severity: 'error', exit: 1 },
  'E-SCAFFOLD-UNKNOWN': { severity: 'error', exit: 1 },
  'E-SET-UNKNOWN-PARAM': { severity: 'error', exit: 1 },
  'E-SUBST-NEWLINE': { severity: 'error', exit: 2 },
  'E-SUBST-UNRESOLVED': { severity: 'error', exit: 2 },
  'E-SYMLINK-IN-PACK': { severity: 'error', exit: 2 },
  'E-TARGET-EXISTS': { severity: 'error', exit: 1 },
  'E-TARGET-NOT-A-FILE': { severity: 'error', exit: 1 },
  'E-TARGET-RACE': { severity: 'error', exit: 2 },
  'E-TRAVERSAL-LIMIT': { severity: 'error', exit: 2 },
  'E-UNKNOWN-VALUE': { severity: 'error', exit: 2 },
  'E-UPDATE-AVAILABLE': { severity: 'error', exit: 1 },
  'E-UPDATE-NOT-NEWER': { severity: 'error', exit: 1 },
  'E-UPDATE-PARAM-UNANSWERED': { severity: 'error', exit: 2 },
  'E-UPDATE-SCAFFOLD-DROPPED': { severity: 'error', exit: 2 },
  'E-VERIFY-MISMATCH': { severity: 'error', exit: 1 },
  'E-WRITE-FAILED': { severity: 'error', exit: 3 },
  'W-ANATOMY-ABSENT': { severity: 'warning', exit: 0, class: 'notice' },
  'W-ANATOMY-PROVISIONAL': { severity: 'warning', exit: 0, class: 'notice' },
  'W-ANSWER-LOOKS-SECRET': { severity: 'warning', exit: 0, class: 'defect' },
  'W-FOLDER-README-MISSING': { severity: 'warning', exit: 0, class: 'defect' },
  'W-HOOK-SCRIPT-INERT': { severity: 'warning', exit: 0, class: 'notice' },
  'W-LINK-DANGLING': { severity: 'warning', exit: 0, class: 'defect' },
  'W-LINK-FALLBACK': { severity: 'warning', exit: 0, class: 'notice' },
  'W-LOCK-STALE-BROKEN': { severity: 'warning', exit: 0, class: 'notice' },
  'W-MANIFEST-NEWER-CLI': { severity: 'warning', exit: 0, class: 'notice' },
  'W-PACK-NEWER-THAN-CLI': { severity: 'warning', exit: 0, class: 'notice' },
  'W-PATH-NON-NFC': { severity: 'warning', exit: 0, class: 'defect' },
  'W-ROLLBACK-KEPT': { severity: 'warning', exit: 0, class: 'notice' },
  'W-SCAN-SYMLINK-SKIPPED': { severity: 'warning', exit: 0, class: 'notice' },
  'W-UNKNOWN-KEY': { severity: 'warning', exit: 0, class: 'defect' },
} as const;

/** Total over the union: every code has an exit class. */
export function exitClassFor(code: DiagnosticCode): ExitClass {
  return CODES[code].exit;
}

export function severityOf(code: DiagnosticCode): Severity {
  return CODES[code].severity;
}

/**
 * The class axis, **fail-closed**.
 *
 * An unclassified `W-` code resolves to **`defect`**, deliberately (F1
 * §Error States): a forgotten classification makes CI louder rather than
 * quieter. The opposite default was rejected because a silently
 * un-promoted warning is the failure mode this project has hit twice.
 *
 * Calling this on an `E-` code is a type error, not a runtime one — the
 * class axis belongs to warnings.
 */
export function classOf(code: DiagnosticCode): DiagnosticClass {
  return CODES[code].class ?? 'defect';
}

/** `--strict` promotes defects only, and never a notice under any flag. */
export function promotedByStrict(code: DiagnosticCode): boolean {
  return severityOf(code) === 'warning' && classOf(code) === 'defect';
}

export const CODE_COUNT = Object.keys(CODES).length;
