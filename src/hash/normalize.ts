/**
 * The **one** normalizer. T-0601, Q-26, §NFR.
 *
 * Two operations, in this exact order, and **nothing else**:
 *
 *   1. strip a **leading** UTF-8 BOM;
 *   2. replace every `\r\n` and every lone `\r` with `\n`.
 *
 * ── Why these two ─────────────────────────────────────────────────────
 *
 * Both close the same fault from different directions: a checkout can
 * rewrite bytes the pack never changed. A Windows clone with
 * `core.autocrlf` rewrites every line ending, and an editor can add a
 * BOM on save. Comparing or hashing raw bytes would make either of those
 * read as *the user edited this file* — so `verify` would report drift
 * that does not exist, `update` would classify an untouched path as
 * edited and refuse to replace it, and `payloadDigest` would call an
 * unmodified payload tampered.
 *
 * ── Why nothing else (Q-26) ───────────────────────────────────────────
 *
 * **Trailing whitespace, blank lines and the presence or absence of a
 * final newline are all significant.** They are real content: a template
 * a user filled in by deleting a trailing space has been edited, and a
 * normalizer that trimmed would hide it. The rule is narrow on purpose —
 * every additional erasure is another edit the product would silently
 * fail to notice, and the boundary is easier to defend where the spec
 * put it than one step further in.
 *
 * ── The accepted cost, stated rather than hidden ──────────────────────
 *
 * A **pure line-ending edit** of a file is undetectable — `verify` and
 * `payloadDigest` both see it as unchanged. F1 §F1.9 records this as a
 * known limit; it is the price of the CRLF-checkout immunity above, and
 * the trade was made deliberately.
 *
 * ── Text only ─────────────────────────────────────────────────────────
 *
 * This runs on files already classified as **text**. Binary files are
 * compared and hashed raw and never reach here (T-0507 owns the
 * classifier). That ordering is load-bearing rather than tidy: decoding
 * arbitrary bytes as UTF-8 replaces every invalid sequence with U+FFFD,
 * so running this over a binary file would produce a *lossy* string in
 * which many different files hash alike.
 */

/**
 * The BOM as it decodes, U+FEFF — one UTF-16 code unit, not three bytes.
 * Slicing three bytes off the buffer instead would be wrong the moment
 * the file is not UTF-8-with-BOM, and would corrupt it silently.
 *
 * Written as an escape, never as the character: a literal U+FEFF in
 * source is invisible, so a stray one pasted beside it would be
 * undiagnosable.
 */
const BOM = '\uFEFF';

/**
 * Normalize text content for hashing or comparison.
 *
 * **Only the leading BOM is stripped, and only one.** A U+FEFF anywhere
 * else in the file is ZWNBSP — ordinary content the author wrote — and
 * removing it would be an edit this function is not entitled to make.
 * The same reasoning stops a second leading one being consumed: only the
 * first is a byte-order mark.
 *
 * Idempotent, which matters because a normalized string is compared
 * against another normalized string on both sides of `verify`.
 */
export function normalizeText(bytes: Buffer): string {
  const text = bytes.toString('utf8');
  const body = text.startsWith(BOM) ? text.slice(BOM.length) : text;
  // `\r\n?` covers both cases in one pass and in the right precedence:
  // a CRLF is consumed whole, so it becomes one `\n` rather than two.
  return body.replace(/\r\n?/g, '\n');
}

/* ── T-0507: the classifier ──────────────────────────────────────────── */

/**
 * How much of a file is examined for a NUL. F1 fixes it at **8 KB**, and
 * the bound is the point rather than an optimisation: a rule stated over
 * "the file" would make the answer depend on file size, so two files with
 * the same first 8 KB could classify differently for a reason no author
 * could see.
 */
export const BINARY_SNIFF_BYTES = 8192;

/**
 * Text or binary. T-0507.
 *
 * **Binary iff** the bytes are not valid UTF-8, **or** the first 8 KB
 * contain a NUL. Two tests, because neither catches the other: UTF-16 text
 * is valid-ish byte soup that is full of NULs, and a truncated UTF-8 file
 * has no NUL at all.
 *
 * ── What the classification decides ───────────────────────────────────
 *
 * A binary file is **copied verbatim, compared raw, and excluded from
 * `substitute`, `rewrite-path` and `generate`**. The exclusion is not a
 * convenience: those three ops work on a decoded string, and decoding
 * arbitrary bytes as UTF-8 replaces every invalid sequence with U+FFFD.
 * Running any of them over a binary file would **corrupt it on write**
 * while reporting success — the worst available outcome, since the apply
 * would look clean and the file would be destroyed.
 *
 * The same reasoning orders this before `normalizeText`, which is why
 * that function documents the precondition it relies on.
 *
 * ── Validity is decided by re-encoding, not by a scanner ──────────────
 *
 * `Buffer.toString('utf8')` never fails — it substitutes U+FFFD — so
 * "did it decode?" is not a question it can answer. Re-encoding the
 * result and comparing lengths is: a substitution changes the byte length
 * unless the original happened to be U+FFFD itself, which the equality
 * check then accepts, correctly, because it *is* valid UTF-8.
 */
export function isBinary(bytes: Buffer): boolean {
  const head = bytes.subarray(0, BINARY_SNIFF_BYTES);
  if (head.includes(0)) return true;
  return !isValidUtf8(bytes);
}

/** True iff `bytes` is valid UTF-8. See `isBinary` for why this is a
 *  round-trip rather than a scan. */
export function isValidUtf8(bytes: Buffer): boolean {
  return Buffer.compare(Buffer.from(bytes.toString('utf8'), 'utf8'), bytes) === 0;
}

/**
 * Decode a **text** file for a content op.
 *
 * Refuses binary by returning `null` rather than by throwing, so a caller
 * has to handle it — the ops each report their own code, and a shared
 * exception would have to guess which.
 *
 * **Phase-2 output is UTF-8 and never emits a BOM**, so the leading one is
 * dropped here on the way in and no op writes one back. A pack shipping a
 * BOM'd template therefore produces a BOM-free applied file, which is the
 * declared behaviour and not an accident.
 */
export function decodeText(bytes: Buffer): string | null {
  if (isBinary(bytes)) return null;
  const text = bytes.toString('utf8');
  return text.startsWith(BOM) ? text.slice(BOM.length) : text;
}
