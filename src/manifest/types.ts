/**
 * `.harness/manifest.json`'s shape. T-0701, Q-43, Q-52.
 *
 * ── Six keys, and the absences are the design ─────────────────────────
 *
 * F1 §F1.8 is what makes six enough: the applied tree is **recomputable**
 * from `.harness/pack/` plus the recipe plus the recorded answers, all of
 * which are committed to version control and readable without the CLI
 * that produced them. So the manifest records the *inputs* and never the
 * output. There is **no `files[]`, no per-file hash list, no `regions`, no
 * `ownedKeys` record, no `shared[]`, no `pack.integrity`, no `appliedAt`
 * and no manifest self-hash** — each existed to answer *"what did the
 * apply produce"*, and recomputation answers that and is self-checking
 * (Q-43, Q-54). A reader looking for a seventh key will not find one, and
 * its absence is a decision rather than an omission (§F1.8, restated at
 * v2.7 for `adaptExpected`, which is likewise recomputable).
 *
 * **`payloadDigest` is the one exception and is worth naming as one**
 * (Q-52). Every other key is an *input* the user or the pack chose; the
 * digest is an **observation this apply made**. It buys the one thing
 * recomputation cannot buy alone: recomputation proves the applied tree
 * matches *the payload on disk*, and the digest proves the payload is
 * *the payload the apply recorded*. It is serialized **top-level, between
 * `pack` and `parameters`, never nested inside `pack`** — `pack` is what
 * the pack *declared*, read out of `pack.json`; the digest is what *this
 * apply observed*, and putting it inside `pack` would file an observation
 * under a declaration.
 *
 * ── The manifest is committed to version control, by design ───────────
 *
 * Two consequences run through this whole directory. **`parameters` is
 * repo-public**: every recorded answer is written into a file F1 requires
 * to be committed, it is exactly as public as the repository holding it,
 * and no facility exists to mark one secret — which is the reasoning
 * behind US-8's outright ban on credential-valued parameters. And **a
 * hand edit is undetectable by construction**: the manifest carries no
 * self-integrity field, which is precisely why `read.ts` re-validates
 * every recorded answer on **every** read rather than trusting the file.
 */
import { join } from 'node:path';
import { harness, type HarnessPath } from '../security/harness-paths.js';
import type { JsonValue } from '../json/parse-strict.js';
import type { TreeDigest } from '../hash/digest.js';
import type { Answer } from '../pack/parameters.js';
import type { ProjectRoot } from '../security/resolve.js';

/**
 * The manifest's project-relative path, as a `HarnessPath`.
 *
 * One of the five entries `harness-paths.ts` admits, and obtained from it
 * rather than composed here: a module that spells `.harness/manifest.json`
 * for itself is a module the brand cannot vouch for, and C-14's *"a path
 * that skipped the gate is a compile error"* holds only while nothing does.
 */
export const MANIFEST_PATH: HarnessPath = harness.manifest();

/**
 * Where the manifest is on this machine, absolute.
 *
 * `root` is a **`ProjectRoot`** — resolved once per run with `realpath()`
 * — and not a bare string, so a caller cannot reach the manifest through a
 * root that was never resolved. Both the reader and the writer take the
 * same argument for the same reason, and locating the file is stated once
 * here so the two cannot drift to different files.
 */
export function manifestFile(root: ProjectRoot): string {
  return join(root, ...MANIFEST_PATH.split('/'));
}

/**
 * The `manifestVersion` this CLI understands. Anything greater is
 * `E-MANIFEST-NEWER`, exit 2, **never a warning** (§F1.5).
 *
 * Bumped **only** on a change an older CLI would misread. Additive
 * optional keys do not bump it — that is what `unknownKeys` below is for.
 */
export const SUPPORTED_MANIFEST_VERSION = 1;

/**
 * The six, **in serialization order**.
 *
 * One definition with two consumers: `canonical-json.ts` emits in this
 * order and `read.ts` decides what counts as an unknown key by absence
 * from it. Two lists would agree until the day a key was added to one.
 */
export const MANIFEST_KEYS = [
  'manifestVersion',
  'cli',
  'pack',
  'payloadDigest',
  'parameters',
  'scaffolds',
] as const;

/** `pack`'s three, in serialization order. **`payloadDigest` is not one
 *  of them**, and a test asserts `pack.payloadDigest` is absent. */
export const MANIFEST_PACK_KEYS = ['name', 'version', 'formatVersion'] as const;

/** What the pack *declared*, copied out of its `pack.json`. */
export interface ManifestPack {
  readonly name: string;
  readonly version: string;
  /**
   * The **payload's** format version, recorded separately from
   * `manifestVersion`: they version different things and will move at
   * different rates (§F1.5).
   */
  readonly formatVersion: number;
}

/**
 * Keys read from a manifest this CLI does not know, carried so they can be
 * re-inlined verbatim on rewrite.
 *
 * §F1.5 requires preservation *"at any level"*, and the manifest has
 * exactly **two** objects with a closed key set — the document root and
 * `pack` — so "any level" is two levels and there is one capture per
 * level. `parameters` is an open map keyed by parameter id and `scaffolds`
 * is an array of ids; neither has a key set to be unknown against.
 *
 * Preservation rather than refusal is the forward-compatibility contract:
 * an older CLI degrades to **ignoring** a newer one's data rather than
 * deleting it, so a `v1.1` field survives a `v1.0` command that rewrites
 * the file.
 */
export type UnknownKeys = Readonly<Record<string, JsonValue>>;

export interface PackManifest {
  readonly manifestVersion: number;
  /** The CLI that last wrote this manifest. Skew against the running one
   *  is `W-MANIFEST-NEWER-CLI` — a notice, never a refusal. */
  readonly cli: string;
  readonly pack: ManifestPack;
  /**
   * One SHA-256 **tree** digest over `.harness/pack/`, `sha256-<64
   * lowercase hex>` (Q-52). Over **normalized** content, not raw bytes, so
   * it survives a CRLF checkout — otherwise every Windows clone with
   * `core.autocrlf` would report a tampered payload on its first `verify`.
   * The accepted cost is stated rather than hidden: **a pure line-ending
   * edit of the payload is undetectable.** It covers `recipe.json` too,
   * because the recipe lives in the payload, so a hand-edited recipe is
   * caught by the same check with no second mechanism.
   */
  readonly payloadDigest: TreeDigest;
  /**
   * **Every declared parameter and its answer** — defaults accepted
   * without being typed included, and answers that selected nothing
   * included, because a `when` must be re-evaluated against the
   * *original* answers. An unrecorded default would make the applied tree
   * non-recomputable the moment the pack's default changed: the tree would
   * still be right and `verify` would no longer be able to say so.
   *
   * **Insertion order is the declared parameter order**, and that is the
   * serialization order (§US-10). A `Record` can express that safely here
   * only because a parameter id is `^[a-zA-Z][a-zA-Z0-9]{0,31}$` — it
   * always begins with a letter, so it is never an integer-like key, which
   * is the one class JavaScript reorders ahead of insertion order.
   */
  readonly parameters: Readonly<Record<string, Answer>>;
  /** Selected scaffold ids, in **pack-declared** order, so `update`
   *  recomputes exactly the same step set and can never silently gain or
   *  lose one. */
  readonly scaffolds: readonly string[];
  /** Unknown **top-level** keys, re-inlined verbatim on write. **Not a
   *  seventh declared key**: nothing in the CLI reads it, and it exists so
   *  that a rewrite does not destroy what it cannot interpret. */
  readonly unknownKeys?: UnknownKeys;
  /** Unknown keys found **inside `pack`**, preserved for the same reason
   *  and separately because they are re-inlined in a different object. */
  readonly unknownPackKeys?: UnknownKeys;
}
