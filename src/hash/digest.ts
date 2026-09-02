/**
 * The **one** tree digest. T-0603, Q-52, §NFR.
 *
 * §NFR: *"computed over the payload file set as `sha256-<hex>` of a
 * canonical listing: one line per file, `<posix-relative-path>` then the
 * file's own hash, joined with `\n`, the files in **byte-ascending path
 * order**."*
 *
 * **One call site at v1.0** — `src/payload/digest.ts`'s `payloadDigest`
 * (T-0604). It is written as a general function over entries anyway
 * because that is what keeps it testable and pure: it takes
 * already-computed per-file hashes and **no filesystem handle**, so
 * *"digest what happens to be on disk"* is not expressible here. The
 * caller decides which files are in the set and which rule hashed each
 * one — `hashText(normalizeText(bytes))` for text, `hashBytes(bytes)`
 * for binary — and this module cannot get that wrong on the caller's
 * behalf.
 *
 * ── What the digest is sensitive to, and why that is the list ─────────
 *
 * A file's content, a file added, a file removed, a file renamed. The
 * path is in the listing precisely so a **rename** moves the digest:
 * hashing the file hashes alone would let a pack shuffle where its
 * content lands while reporting an unchanged payload.
 *
 * It is a **pure function of the entries** — no clock, no path of the
 * machine it ran on, no iteration order of a directory read — which is
 * what lets `payloadDigest` sit in a manifest that F1's determinism
 * guarantee covers.
 */
import { hashText, SHA256_HEX_LENGTH } from './sha256.js';

/** One file's contribution: its pack-relative POSIX path, and the hash
 *  the caller computed for it under the text/binary rule. */
export interface TreeEntry {
  readonly path: string;
  readonly sha256: string;
}

/** The wire form. Branded by the literal prefix rather than by a symbol,
 *  because unlike a path this value is *carried across a process
 *  boundary* — it is written to `manifest.json` and read back by a later
 *  run — so its shape has to be checkable from a plain string. */
export type TreeDigest = `sha256-${string}`;

/**
 * Between a path and its hash on a listing line.
 *
 * **One U+0020, and F1 §NFR now says so** — it said only that the path is
 * followed by the hash, which is not a format. The choice was made here
 * and folded into the spec at v4.8, because it is a *compatibility*
 * contract however arbitrary it looks: a `payloadDigest` written by this
 * CLI is recomputed and compared by a later one, so a future build that
 * picked a tab would report every existing project as a tampered payload.
 *
 * It stays unambiguous against a path containing a space, because the
 * hash is a fixed 64 characters and the grammar forbids a segment ending
 * in whitespace: the last 64 characters of a line are the hash, always.
 */
const SEPARATOR = ' ';

/**
 * Caller's precondition, and **the grammar now enforces it** rather than
 * leaving it to the caller's memory: a path may contain **no control
 * character** (F1 v5.0, US-3 stage 1). The listing is newline-delimited,
 * so a `\n` in a path would let one entry forge two lines and two
 * different file sets could digest alike — a collision inside the control
 * `verify` uses to detect tampering.
 *
 * It was closed in the grammar rather than here deliberately: a path
 * holding a control character breaks every line-oriented tool that will
 * ever read the project, so it is refusable on its own merits, and one
 * clause covers both the applied-path and payload-path quantifiers
 * instead of leaving this function a precondition nobody re-states.
 */
export function treeDigest(entries: readonly TreeEntry[]): TreeDigest {
  // Sort by UTF-8 **bytes**, not by JavaScript's `<`.
  //
  // They are not the same order, and the difference is reachable: `<`
  // compares UTF-16 code units, so a path containing an astral character
  // (U+10000 and above, stored as a surrogate pair beginning 0xD800)
  // sorts *before* one containing U+E000–U+FFFF, while its UTF-8 bytes
  // sort *after*. The spec says byte-ascending; a JS-native sort would
  // agree with it on every ASCII path in the three bundled packs and
  // disagree with any other implementation — including a future one of
  // ours — on the first emoji in a filename.
  const decorated = entries.map((e) => ({ e, key: Buffer.from(e.path, 'utf8') }));
  decorated.sort((a, b) => Buffer.compare(a.key, b.key));

  const listing = decorated.map(({ e }) => `${e.path}${SEPARATOR}${e.sha256}`).join('\n');
  return `sha256-${hashText(listing)}`;
}

const TREE_DIGEST_RE = new RegExp(`^sha256-[0-9a-f]{${SHA256_HEX_LENGTH}}$`);

/**
 * Recognize the wire form.
 *
 * Here rather than in the manifest reader so that the producer and the
 * validator of this string are the same module: the manifest's
 * read-back check (T-0704) has to reject anything that is not
 * `sha256-<64 lowercase hex>`, and a second regex written elsewhere is a
 * second definition of the format that nothing keeps in step.
 */
export function isTreeDigest(value: string): value is TreeDigest {
  return TREE_DIGEST_RE.test(value);
}
