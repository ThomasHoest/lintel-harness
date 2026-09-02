/**
 * Phase 1 — the **verbatim** copy. T-0605, Q-39, C-26.
 *
 * Raw bytes in, raw bytes out. **No BOM handling, no EOL change, no
 * suffix stripping, no filtering by scaffold selection, and no payload
 * file skipped.** Phase 1 is identical for every pack, and that sameness
 * is the property: `.harness/pack/` is *what the pack shipped*, so
 * `verify` and `update` can recompute against it without asking what this
 * particular apply chose to do.
 *
 * Every transformation belongs to **phase 2**, which reads from this copy
 * (Q-41). A phase 1 that stripped a suffix or skipped an unselected
 * scaffold would leave a payload that no longer answers *what did this
 * pack contain*, and the recomputation identity would be over a tree the
 * pack never had.
 *
 * ── SEC (C-26): a fixed mode, and no source mode is read ──────────────
 *
 * Every file is written **`0644`** and every created directory **`0755`**,
 * **reading no source mode at all**. Two reasons, and the second is the
 * one that matters:
 *
 *   1. Preserving modes would make phase 1 carry a permission decision
 *      derived from **the authoring machine's umask** — a property of
 *      somebody's laptop, shipped into every project that applies the
 *      pack.
 *   2. A `0755` payload file would land under `.harness/` with **no
 *      declared root, no cap, no disclosure and no diagnostic**, and it
 *      would be **invisible to a content-only digest**. The executable
 *      apparatus of T-0508 guards *applied* paths; the payload is a
 *      different quantifier, and this is how that quantifier stays safe.
 *
 * ── What it validates, and what it deliberately does not ──────────────
 *
 * **Paths and bounds only.** It does not read a recipe, resolve a
 * parameter or evaluate a `when`. A copier that understood the recipe
 * would be a copier that could disagree with it.
 */
import { DiagnosticBag } from '../diag/diagnostic.js';
import { payloadPath } from '../security/harness-paths.js';
import type { HarnessPath } from '../security/harness-paths.js';

/** C-11. One pack file. Larger is `E-CONTENT-TOO-LARGE`. */
export const MAX_FILE_BYTES = 4 * 1024 * 1024;
/** C-11. The whole payload — it is copied into and **committed by** every
 *  project that applies the pack, which is what sets the bound. */
export const MAX_PAYLOAD_BYTES = 32 * 1024 * 1024;

/** Phase 1's fixed modes. Not defaults — **constants** (C-26). */
export const PAYLOAD_FILE_MODE = 0o644;
export const PAYLOAD_DIR_MODE = 0o755;

/** One planned copy. Produced before any byte is written, so the digest
 *  is known in advance and the manifest can be written last. */
export interface PlannedCopy {
  /** Pack-relative POSIX path, as the walk found it. */
  readonly from: string;
  /** `.harness/pack/<from>`, branded. */
  readonly to: HarnessPath;
  readonly size: number;
}

export interface PayloadPlan {
  readonly copies: readonly PlannedCopy[];
  readonly totalBytes: number;
  readonly bag: DiagnosticBag;
}

/** What the walk found, reduced to what this module needs. Passed in
 *  rather than walked here: one bounded walk in the product, and this is
 *  not it. */
export interface PayloadEntry {
  readonly path: string;
  readonly kind: 'file' | 'dir';
  readonly size: number;
  /** True where the walk saw a symbolic link. Pack content must be
   *  regular files — a link is content the pack does not actually hold,
   *  and following one would copy something from outside it. */
  readonly symlink?: boolean;
}

/**
 * Plan the copy: validate every path and both bounds, produce the
 * destinations.
 *
 * **No file is skipped**, so every entry is checked rather than the ones a
 * recipe happens to name — which is why `E-PAYLOAD-PATH-INVALID` here
 * covers the whole pack and not just its referenced files.
 *
 * Returns a plan even when the bag holds faults, because `validate` wants
 * to report **all** of them rather than the first; the caller writes
 * nothing while `bag` holds an error.
 */
export function planPayloadCopy(
  packName: string,
  entries: readonly PayloadEntry[],
  truncated = false,
): PayloadPlan {
  const bag = new DiagnosticBag();
  const copies: PlannedCopy[] = [];
  let totalBytes = 0;

  if (truncated) {
    // The walk hit a bound, so `entries` is partial and **no caller may
    // treat it as a complete picture**. Copying a partial payload would
    // produce a `.harness/pack/` that silently differs from the pack.
    bag.add('E-TRAVERSAL-LIMIT', { values: { root: packName, limit: 'entry', n: String(entries.length) } });
    return { copies: [], totalBytes: 0, bag };
  }

  for (const entry of entries) {
    if (entry.symlink === true) {
      bag.add('E-SYMLINK-IN-PACK', { values: { path: entry.path } });
      continue;
    }
    if (entry.kind !== 'file') continue;

    const { path: to, bag: pathBag } = payloadPath(packName, entry.path);
    for (const d of pathBag.items) bag.push(d);
    if (to === undefined) continue;

    if (entry.size > MAX_FILE_BYTES) {
      bag.add('E-CONTENT-TOO-LARGE', {
        values: { path: entry.path, size: describeBytes(entry.size) },
      });
      continue;
    }

    totalBytes += entry.size;
    copies.push({ from: entry.path, to, size: entry.size });
  }

  if (totalBytes > MAX_PAYLOAD_BYTES) {
    bag.add('E-PAYLOAD-TOO-LARGE', {
      values: { name: packName, size: describeBytes(totalBytes) },
    });
  }

  return { copies, totalBytes, bag };
}

/** Human sizes, for a message a person reads. Deliberately coarse: the
 *  bound is a round number and a byte count would obscure it. */
function describeBytes(n: number): string {
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  if (n >= 1024) return `${Math.round(n / 1024)} KB`;
  return `${n} bytes`;
}
