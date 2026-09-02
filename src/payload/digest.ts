/**
 * `payloadDigest()` — the **one** tree digest in the product. T-0604,
 * Q-52.
 *
 * It has exactly one call site and exactly one meaning: *this is the
 * `.harness/pack/` this apply observed*. The manifest records it, and
 * `verify` compares against it — which is what makes an edited payload
 * detectable at all, since the manifest carries **no per-file hashes**
 * (Q-43) and applied state is **recomputed** rather than remembered.
 *
 * **It covers `recipe.json` too**, because the recipe lives in the
 * payload. That is not a detail: the recipe is the instruction set phase 2
 * executes, so a digest that excluded it would let the most
 * security-relevant file in the tree be edited without notice.
 *
 * ── The per-file rule, and its stated cost ────────────────────────────
 *
 * A text file hashes **normalized**; a binary file hashes **raw**. The
 * normalization is load-bearing and its price is paid openly:
 *
 *   BUYS  immunity to a Windows clone with `core.autocrlf`, which
 *         rewrites every line ending on checkout. Without it, cloning a
 *         project on Windows would report a **tampered payload** — the
 *         integrity control firing on the version-control system rather
 *         than on an attacker, which is how a control gets switched off.
 *   COSTS a **pure line-ending edit of the payload is undetectable**.
 *
 * The trade is deliberate and §F1.9 records it as a known limit. Note the
 * asymmetry that settles it: the false positive is *certain* and affects
 * every Windows user, while the false negative requires an edit that
 * changes no character.
 */
import { readFile } from 'node:fs/promises';
import { hashBytes, hashText } from '../hash/sha256.js';
import { treeDigest, type TreeDigest } from '../hash/digest.js';
import { isBinary, normalizeText } from '../hash/normalize.js';

/**
 * One payload file's hash, under the text/binary rule.
 *
 * Exported because `verify` hashes an **applied** file by the identical
 * rule, and two implementations of "the hash of a file" would drift into
 * two answers for one question.
 */
export function fileHash(bytes: Buffer): string {
  return isBinary(bytes) ? hashBytes(bytes) : hashText(normalizeText(bytes));
}

/**
 * The digest over a payload file set.
 *
 * `read` is a callback rather than a directory handle, on the same
 * reasoning as everything else in this layer: the function cannot compose
 * a path of its own, so *"hash something outside the pack"* is not
 * expressible from inside it.
 *
 * **Computed over the PLANNED payload set**, which is what lets phase 1
 * know the digest before it writes its first byte — the manifest can then
 * be written last and still record what was copied.
 */
export async function payloadDigest(
  paths: readonly string[],
  read: (packRelativePath: string) => Promise<Buffer>,
): Promise<TreeDigest> {
  const entries = [];
  for (const path of paths) {
    entries.push({ path, sha256: fileHash(await read(path)) });
  }
  // `treeDigest` sorts by bytes itself, so the caller's order does not
  // reach the digest — which is why a walk whose order changed could not
  // silently change this value.
  return treeDigest(entries);
}

/** Convenience over a real directory. The callback form above is the
 *  contract; this is the one call site's shape. */
export async function payloadDigestOfDir(
  dir: string,
  paths: readonly string[],
): Promise<TreeDigest> {
  const { join } = await import('node:path');
  return payloadDigest(paths, (p) => readFile(join(dir, p)));
}
