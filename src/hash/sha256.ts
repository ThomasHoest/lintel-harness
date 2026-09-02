/**
 * The **one** hash. T-0602, §NFR.
 *
 * SHA-256, **64 lowercase hex characters, no truncation and no salt**,
 * on `node:crypto` — stdlib, so it costs nothing against Q-81's
 * zero-runtime-dependency posture.
 *
 * Each of those three words is a requirement rather than a default:
 *
 *   NO TRUNCATION  the digest is an integrity control, and a shortened
 *                  one is a weaker control that reads exactly like the
 *                  full one at every call site.
 *   NO SALT        a salted hash is not reproducible across machines or
 *                  runs, and `payloadDigest` is recorded in a manifest
 *                  that a *later* run on a *different* machine must be
 *                  able to recompute and compare. A salt would make
 *                  `verify` fail on a correct tree.
 *   LOWERCASE HEX  the manifest pins the form `sha256-<64 lowercase hex>`
 *                  and validates it on read-back, so case is part of the
 *                  contract, not of the rendering.
 *
 * **Four call sites at v1.0** (§NFR): the journal, `--force`'s
 * byte-identity check, `verify`'s comparison, and the manifest's
 * `payloadDigest`.
 */
import { createHash } from 'node:crypto';

/** Length of the hex form. The manifest's read-back check and the tree
 *  digest's shape both depend on it, so it is stated once. */
export const SHA256_HEX_LENGTH = 64;

/**
 * Hash raw bytes — the **binary** path.
 *
 * Binary files are compared and hashed raw, with no normalization, so
 * this is the whole of what a binary file contributes anywhere.
 */
export function hashBytes(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

/**
 * Hash text — the **text** path, always over `normalizeText()`'s output.
 *
 * Over the string's **UTF-8** encoding, stated explicitly rather than
 * left to a default: `createHash().update(string)` without an encoding
 * argument means UTF-8 today, and a hash whose value depends on a
 * library default is a value nobody has pinned.
 *
 * This is the same function as `hashBytes` over the same bytes, and the
 * split is deliberate: the two names make a call site **declare which
 * rule it applied**, so a text file hashed raw — the CRLF bug the
 * normalizer exists to prevent — is visible in the code rather than
 * only in a failing digest on somebody else's machine.
 */
export function hashText(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}
