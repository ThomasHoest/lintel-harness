/**
 * Reading `.harness/manifest.json`. T-0704, US-15, C-29.
 *
 * ── The manifest has no self-integrity field, and this is the consequence
 *
 * §Technical Context makes the absence explicit: nothing binds the manifest
 * to itself, so **a hand edit that leaves valid JSON is undetectable**. The
 * design's answer is not a hash — it is that every input the manifest
 * carries is **re-checked on every read**, so an edit that matters is
 * caught where it matters:
 *
 *   the digest      shape-checked here, compared by `verify` first and
 *                   fail-closed (`E-PAYLOAD-DIGEST-MISMATCH`);
 *   the answers     re-validated here against the pack's **own**
 *                   declaration, on **every** read (`E-MANIFEST-ANSWER-
 *                   INVALID`, exit 2 — C-29);
 *   the tree        recomputed by `verify` from all of the above.
 *
 * That is why `declarations` is a **required positional argument** rather
 * than an option. Making it optional would create a "no declarations, so
 * skip the answer check" branch, and F1 says of the sibling case — a
 * missing `payloadDigest` — that *there is no "digest absent, so skip the
 * check" branch, and its absence is the point: that branch is the one
 * anybody defeating the check would take.* The same holds one field over.
 *
 * ── The order of the checks is load-bearing ───────────────────────────
 *
 *   1  missing            E-MANIFEST-MISSING, exit 1
 *   2  strict parse       E-JSON-DUPLICATE-KEY (never E-MANIFEST-CORRUPT)
 *   3  manifestVersion    E-MANIFEST-NEWER, exit 2, NEVER a warning
 *   4  required keys      E-MANIFEST-CORRUPT, exit 2
 *   5  version skew       W-MANIFEST-NEWER-CLI, W-PACK-NEWER-THAN-CLI
 *   6  recorded answers   E-MANIFEST-ANSWER-INVALID, exit 2
 *
 * **3 before 4** is the one that is easy to get backwards. A manifest a
 * *newer* CLI wrote may legitimately hold a shape this CLI does not know,
 * so validating the shape first would report `E-MANIFEST-CORRUPT` — "restore
 * it from version control" — for a file that is not corrupt at all and whose
 * actual remedy is `npm i -g @linteldk/cli@latest`. Wrong code, wrong remedy,
 * and the user acts on it.
 *
 * **2 before everything** is US-1's rule applied to the user's own file: a
 * duplicate key is `E-JSON-DUPLICATE-KEY` wherever it occurs — one fault,
 * one code — because a stdlib parser keeps the **last** duplicate while a
 * human reading a diff reads the **first**, so the document reviews as one
 * thing and executes as another. That the manifest is the user's own
 * committed file does not weaken the argument; it is the argument.
 */
import { readFile } from 'node:fs/promises';
import { DiagnosticBag } from '../diag/diagnostic.js';
import { isTreeDigest, type TreeDigest } from '../hash/digest.js';
import { parseStrictJson, type JsonValue } from '../json/parse-strict.js';
import { PACK_NAME_RE } from '../pack/load-pack.js';
import { checkRecordedAnswers, type Answer } from '../pack/parameters.js';
import type { ParameterDecl } from '../pack/types.js';
import { compareSemver, parseSemver } from '../semver/compare.js';
import type { ProjectRoot } from '../security/resolve.js';
import {
  MANIFEST_KEYS,
  MANIFEST_PACK_KEYS,
  MANIFEST_PATH,
  SUPPORTED_MANIFEST_VERSION,
  manifestFile,
  type PackManifest,
  type UnknownKeys,
} from './types.js';

/**
 * What the reader cannot derive from the file.
 *
 * Both fields exist only to report **skew**, and neither can gate: F1
 * makes both a `notice` — *"version skew … commands proceed and no pack
 * content is wrong"*.
 */
export interface ReadManifestContext {
  /** The running CLI's version. `W-MANIFEST-NEWER-CLI`'s other half. */
  readonly cliVersion: string;
  /**
   * The newest bundled version of the **recorded** pack, when this CLI
   * bundles one of that name. Omitted when it does not — and that is not
   * a fault: `verify` needs only `.harness/pack/` and the manifest, so a
   * pack name the bundle has never heard of is outside this warning's
   * subject and F1 gives it no code.
   */
  readonly bundledPackVersion?: string;
}

export interface ReadManifestResult {
  /** Present **iff** no error was raised. A manifest returned beside an
   *  error is the shape that lets a caller recompute a tree from inputs
   *  nobody vouched for — which is exactly what §F1.8 forbids. */
  readonly manifest?: PackManifest;
  readonly bag: DiagnosticBag;
}

type Obj = { readonly [k: string]: JsonValue };

const isObj = (v: JsonValue | undefined): v is Obj =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** A JSON number that is a whole number ≥ 1. JSON has one number type, so
 *  "integer" is a check and not a parse. */
const isCount = (v: JsonValue | undefined): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= 1;

/**
 * Read, validate and return the manifest.
 *
 * `root` is a **`ProjectRoot`** — resolved once with `realpath()` — so the
 * file this reads cannot be reached through a root nobody resolved.
 */
export async function readManifest(
  root: ProjectRoot,
  declarations: readonly ParameterDecl[],
  context: ReadManifestContext,
): Promise<ReadManifestResult> {
  const bag = new DiagnosticBag();

  /** One shape fault, then stop. A manifest failing a shape rule has one
   *  remedy — restore it — and enumerating five ways it is wrong does not
   *  change the remedy or help the reader find the first. */
  const corrupt = (detail: string): ReadManifestResult => {
    bag.add('E-MANIFEST-CORRUPT', { path: MANIFEST_PATH, values: { detail } });
    return { bag };
  };

  /* ── 1. missing ────────────────────────────────────────────────────── */

  let text: string;
  try {
    text = await readFile(manifestFile(root), 'utf8');
  } catch (e) {
    const errno = (e as NodeJS.ErrnoException).code;
    // ENOENT and ENOTDIR are both "there is nothing there" — the second is
    // what a missing `.harness/` reports on the way past. Exit 1, and the
    // remedy names `init`, because no pack has been applied.
    //
    // **Anything else is not missing.** A permission fault or an
    // unreadable device is a file that exists and cannot be read, which
    // `E-MANIFEST-CORRUPT`'s message says exactly ("is not readable") and
    // whose remedy — restore it — is the right one. Folding it into
    // MISSING would send a user to `init` on an applied project, and
    // `init` refuses an applied project (`E-ALREADY-APPLIED`), so the
    // advice would be unactionable as well as wrong.
    if (errno === 'ENOENT' || errno === 'ENOTDIR') {
      bag.add('E-MANIFEST-MISSING', { path: MANIFEST_PATH });
      return { bag };
    }
    return corrupt(errno ?? 'unreadable');
  }

  /* ── 2. the strict parse ───────────────────────────────────────────── */

  const parsed = parseStrictJson(text, MANIFEST_PATH, 'E-MANIFEST-CORRUPT');
  for (const d of parsed.bag.items) bag.push(d);
  if (parsed.value === undefined) return { bag };
  if (!isObj(parsed.value)) return corrupt('the document is not a JSON object');
  const doc = parsed.value;

  /* ── 3. the manifestVersion gate ───────────────────────────────────── */

  const manifestVersion = doc['manifestVersion'];
  if (!isCount(manifestVersion)) {
    return corrupt('"manifestVersion" is missing or is not a positive integer');
  }
  if (manifestVersion > SUPPORTED_MANIFEST_VERSION) {
    // **Never a warning** (§F1.5). A newer manifest may mean anything, and
    // proceeding on one is how a CLI produces a confident wrong answer
    // about a project it does not understand.
    bag.add('E-MANIFEST-NEWER', {
      path: MANIFEST_PATH,
      values: { n: String(manifestVersion), m: String(SUPPORTED_MANIFEST_VERSION) },
    });
    return { bag };
  }

  /* ── 4. the required keys ──────────────────────────────────────────── */

  const cli = doc['cli'];
  if (typeof cli !== 'string') return corrupt('"cli" is missing or is not a string');
  // Fail **closed** on an unparseable version rather than skipping the
  // skew check. `checkCliFloor` documents the same trap from the other
  // side: a version of "1.0" was neither satisfied nor refused, it was
  // ignored — a comparison that cannot be made must not be read as one
  // that passed.
  const cliSemver = parseSemver(cli);
  if (cliSemver === null) return corrupt(`"cli" is not a semver version (${cli})`);

  const pack = doc['pack'];
  if (!isObj(pack)) return corrupt('"pack" is missing or is not an object');

  const packName = pack['name'];
  if (typeof packName !== 'string' || !PACK_NAME_RE.test(packName)) {
    // The grammar is US-1's and is imported rather than restated. A name
    // outside it can never resolve to a pack, so accepting one here would
    // only defer the failure to a place with less to say about it.
    return corrupt('"pack.name" is missing or is not a legal pack name');
  }

  const packVersion = pack['version'];
  if (typeof packVersion !== 'string' || parseSemver(packVersion) === null) {
    return corrupt('"pack.version" is missing or is not a semver version');
  }

  const formatVersion = pack['formatVersion'];
  if (!isCount(formatVersion)) {
    return corrupt('"pack.formatVersion" is missing or is not a positive integer');
  }
  // Deliberately **not** gated against this CLI's supported pack format.
  // `pack.formatVersion` records the format of the payload in
  // `.harness/pack/`, and `E-PACK-FORMAT-NEWER` is raised where that
  // payload is loaded — raising it twice from two readings of the same
  // fact is how the two readings come to disagree.

  // Q-52's position check has a runtime half as well as a test: a digest
  // found inside `pack` is a manifest that recorded an observation as part
  // of the pack's declared identity, and it is not this key.
  if ('payloadDigest' in pack) {
    return corrupt('"payloadDigest" is nested inside "pack"; it is a top-level key');
  }

  const digest = doc['payloadDigest'];
  if (typeof digest !== 'string' || !isTreeDigest(digest)) {
    // All six keys are required at `manifestVersion` 1. **There is no
    // "digest absent, so skip the check" branch**, and its absence is the
    // point: that branch is the one anybody defeating the check would
    // take. The shape test lives in `hash/digest.ts` beside the producer,
    // so the writer and the validator of this string are one module.
    return corrupt('"payloadDigest" is missing or is not sha256-<64 lowercase hex>');
  }
  const payloadDigest: TreeDigest = digest;

  const rawParameters = doc['parameters'];
  if (!isObj(rawParameters)) return corrupt('"parameters" is missing or is not an object');
  const parameters: Record<string, Answer> = {};
  for (const [id, value] of Object.entries(rawParameters)) {
    // `Answer` is `string | boolean` (US-8) and nothing else. A number or
    // an object here is not forward compatibility — no declaration can
    // validate it — and it would reach the render as a value the pack's
    // own `pattern` was never applied to.
    if (typeof value !== 'string' && typeof value !== 'boolean') {
      return corrupt(`the recorded answer for "${id}" is not a string or a boolean`);
    }
    parameters[id] = value;
  }

  const rawScaffolds = doc['scaffolds'];
  if (!Array.isArray(rawScaffolds)) {
    return corrupt('"scaffolds" is missing or is not an array');
  }
  const scaffolds: string[] = [];
  for (const id of rawScaffolds) {
    if (typeof id !== 'string') return corrupt('"scaffolds" holds an entry that is not a string');
    scaffolds.push(id);
  }

  const unknownKeys = capture(doc, MANIFEST_KEYS);
  const unknownPackKeys = capture(pack, MANIFEST_PACK_KEYS);

  /* ── 5. version skew — two notices, and neither may gate ───────────── */

  const running = parseSemver(context.cliVersion);
  // A warning is not a place to fail closed: refusing to proceed because
  // the *running* CLI's own version string is unparseable would turn a
  // packaging slip into an outage, and there is no code for it. The skew
  // is simply unknown, so nothing is claimed about it.
  if (running !== null && compareSemver(cliSemver, running) > 0) {
    bag.add('W-MANIFEST-NEWER-CLI', {
      path: MANIFEST_PATH,
      values: { recorded: cli, current: context.cliVersion },
    });
  }

  const bundled = context.bundledPackVersion;
  if (bundled !== undefined) {
    const b = parseSemver(bundled);
    const p = parseSemver(packVersion);
    if (b !== null && p !== null && compareSemver(p, b) > 0) {
      bag.add('W-PACK-NEWER-THAN-CLI', {
        path: MANIFEST_PATH,
        values: {
          pack: packName,
          version: packVersion,
          cliVersion: context.cliVersion,
          bundled,
        },
      });
    }
  }

  /* ── 6. the recorded answers, on every read (C-29) ─────────────────── */

  const recorded = new Map<string, Answer>(Object.entries(parameters));

  for (const decl of declarations) {
    if (recorded.has(decl.id)) continue;
    // US-10 requires **every** declared parameter to be recorded. F1 names
    // no code for the violation, and this is the closer of the two
    // candidates: `E-MANIFEST-CORRUPT` says "is not readable", which is
    // false — the file read perfectly — while this code's own message says
    // *"the manifest was edited, or the pack's declaration changed under
    // it"*, which is exactly the pair of causes. Both are exit 2 with the
    // same remedy, so the choice costs nothing if F1 later rules the other
    // way.
    //
    // The mirror case — an answer recorded for a parameter the pack does
    // not declare — is **not** a fault here: it is unread, it cannot reach
    // the render, and preserving it is the forward-compatible behaviour.
    // The asymmetry is real: a missing answer makes a `when` evaluate
    // against `undefined`, which is the fault `E-PARAM-UNDECIDABLE` exists
    // to prevent; a surplus one changes nothing.
    bag.add('E-MANIFEST-ANSWER-INVALID', {
      path: MANIFEST_PATH,
      values: { id: decl.id, reason: 'the manifest records no answer for it', value: '(none)' },
    });
  }

  for (const d of checkRecordedAnswers(declarations, recorded).items) bag.push(d);

  /* ── the single exit ───────────────────────────────────────────────── */

  if (bag.errors.length > 0) return { bag };

  const manifest: {
    manifestVersion: number;
    cli: string;
    pack: { name: string; version: string; formatVersion: number };
    payloadDigest: TreeDigest;
    parameters: Record<string, Answer>;
    scaffolds: readonly string[];
    unknownKeys?: UnknownKeys;
    unknownPackKeys?: UnknownKeys;
  } = {
    manifestVersion,
    cli,
    pack: { name: packName, version: packVersion, formatVersion },
    payloadDigest,
    parameters,
    scaffolds,
  };
  // Assigned only when there is something to carry, so that a manifest
  // this CLI wrote round-trips through an object with no capture fields
  // at all — `exactOptionalPropertyTypes` makes "absent" and "present and
  // undefined" different, and the canonical bytes must not depend on which.
  if (unknownKeys !== undefined) manifest.unknownKeys = unknownKeys;
  if (unknownPackKeys !== undefined) manifest.unknownPackKeys = unknownPackKeys;

  return { manifest, bag };
}

/**
 * Keys of `obj` that are not in `known`, or `undefined` when there are
 * none.
 *
 * **No `W-UNKNOWN-KEY`, deliberately.** That code is `defect` class —
 * *author-fixable, and the author is expected to change it* — and there is
 * no author here to change anything: an unknown key in a manifest is a
 * **newer CLI's** data in the user's committed file, and F1 requires it to
 * be preserved verbatim rather than removed (§F1.5). Warning about it would
 * ask the user to delete the one thing forward compatibility depends on,
 * and `--strict` would make that warning fatal.
 */
function capture(obj: Obj, known: readonly string[]): UnknownKeys | undefined {
  const out: Record<string, JsonValue> = {};
  let found = false;
  for (const [key, value] of Object.entries(obj)) {
    if (known.includes(key)) continue;
    out[key] = value;
    found = true;
  }
  return found ? out : undefined;
}
