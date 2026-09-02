/**
 * **The only constructor of `HarnessPath`.** T-0206.
 *
 * The CLI's own writes under `.harness/`, over a list that is **five and
 * complete**: `pack/**`, `manifest.json`, `journal.json`, `journal.d/**`,
 * `lock`.
 *
 * **Why a second brand at all** (C-5, C-14). The reserved-destination
 * denylist forbids `.harness/` to every recipe step, absolutely — and the
 * payload copier writes `.harness/pack/**` on every apply. With one brand
 * those two rules deadlock: either the denylist has a hole a pack can
 * reach through, or phase 1 cannot run. With **no** brand, C-14's *"a path
 * that skipped the gate is a compile error"* stops holding across phase 1,
 * which is the largest write the product performs.
 *
 * The second brand resolves it by making the distinction **structural**:
 * a recipe step's destination is an `AppliedPath` and can never be under
 * `.harness/`; a CLI write is a `HarnessPath` and can never be anything
 * else. `WritablePath` is their union, and it is what the journal, the
 * atomic writer and rollback accept — **nothing takes a bare string**.
 *
 * **There is no `.harness/README.md`** and no CLI write produces one
 * (Q-50 as amended): `.harness/` is tool-owned and excluded from the
 * folder-README rule on the same reasoning as `.claude/`.
 */
import { DiagnosticBag } from '../diag/diagnostic.js';
import { collisionKey, type AppliedPath } from './confine.js';

declare const HarnessPathBrand: unique symbol;

/** A CLI-owned path under `.harness/`. Obtainable only from this module. */
export type HarnessPath = string & { readonly [HarnessPathBrand]: 'HarnessPath' };

/** What the journal, the atomic writer and rollback accept. */
export type WritablePath = AppliedPath | HarnessPath;

/** The root the CLI owns. A recipe step may not write here at all. */
export const HARNESS_ROOT = '.harness';

/**
 * The five, and the list is complete.
 *
 * `subtree` entries admit anything beneath them; the others are exact.
 * Adding a sixth is a change here **and** in F1 US-13, in the same commit
 * — an entry this module admits that F1 does not name is a CLI write
 * nothing agreed to.
 */
const OWNED = [
  { kind: 'subtree', at: 'pack' },
  { kind: 'file', at: 'manifest.json' },
  { kind: 'file', at: 'journal.json' },
  { kind: 'subtree', at: 'journal.d' },
  { kind: 'file', at: 'lock' },
] as const;

export const OWNED_ENTRIES = OWNED;

/**
 * The **one** CLI-owned location outside `.harness/`. C-53, F1 T-0211.
 *
 * `skill install` writes here, and it is the only thing that ever does.
 *
 * ── Why this needs its own entry, and why it is not a hole ────────────
 *
 * `skills` is a **reserved destination at any `.claude` segment** (C-53),
 * because *a pack may not install instructions into the agent runtime of
 * the project it is applied to*. T-0211 states the exemption in one
 * sentence — *"`skill install` is a CLI write and is unaffected; the
 * reservation binds recipe steps"* — and **no constructor expressed it**,
 * so the write could be typed at all only by casting past the brand.
 *
 * The distinction the brand already draws is exactly the right one:
 * `AppliedPath` is *a recipe step's destination* and `HarnessPath` is *a
 * CLI write*. The reservation binds the first and not the second, so this
 * is a `HarnessPath` — the `.harness/` prefix was a property of the list,
 * never of the brand's meaning.
 *
 * **It is one fixed subtree, not a policy.** No flag, no parameter and no
 * pack value reaches it: the destination is a compile-time constant, which
 * is why admitting it opens nothing. A second entry here is a change in
 * this module **and** in F1, in the same commit.
 */
const CLI_OWNED_OUTSIDE_HARNESS = '.claude/skills/lintel' as const;

export const CLI_OWNED_ROOT = CLI_OWNED_OUTSIDE_HARNESS;

/** Every segment must be grammar-clean in the same way an applied path
 *  is; these are derived from paths already proven clean, so confinement
 *  is by construction rather than by re-checking. */
function segmentsAreClean(segments: readonly string[]): boolean {
  return segments.every(
    (s) =>
      s.length > 0 &&
      s !== '.' &&
      s !== '..' &&
      !s.includes('\\') &&
      // `'\u0000'`, never the character itself. A literal NUL in source is
      // **invisible in an editor and makes `grep` treat the whole file as
      // binary** - so every search for a symbol in this module silently
      // returns nothing, which is a poor property for the module that
      // constructs the CLI's own write paths. Found while looking for an
      // export that was there all along. Same reasoning as the BOM
      // constant in `hash/normalize.ts`.
      !s.includes('\u0000') &&
      !/[.\s]$/.test(s) &&
      s.normalize('NFC') === s,
  );
}

/**
 * Constructing a `HarnessPath` from a project-relative POSIX path.
 *
 * Returns `undefined` for anything the five-entry list does not admit,
 * **and emits no diagnostic**, deliberately. This is a **type-level
 * constructor over a closed list**: only the CLI calls it, and a caller
 * passing `.harness/nonsense` has a bug a test catches — not a fault a
 * user can act on. F1 has no code for it because no user can cause it.
 *
 * The one genuinely user-facing failure here is a **bad path inside the
 * payload**, which is a *pack* fault with a pack's name attached; that is
 * `payloadPath()` below, and it is where `E-PAYLOAD-PATH-INVALID` lives.
 */
export function harnessPath(relative: string): HarnessPath | undefined {
  const segments = relative.split('/');

  // The one CLI-owned location outside `.harness/`. Matched by
  // `collisionKey` like every other destination comparison, so a
  // case-variant spelling cannot slip past it on a case-folding
  // filesystem — the same reasoning N-5 gives for `E-TARGET-EXISTS`.
  const skillRoot = CLI_OWNED_OUTSIDE_HARNESS.split('/');
  if (
    segments.length > skillRoot.length &&
    skillRoot.every((seg, i) => collisionKey(seg) === collisionKey(segments[i] ?? ''))
  ) {
    const rest = segments.slice(skillRoot.length);
    return segmentsAreClean(rest) ? (relative as HarnessPath) : undefined;
  }

  if (collisionKey(segments[0] ?? '') !== collisionKey(HARNESS_ROOT)) return undefined;
  const rest = segments.slice(1);
  if (rest.length === 0 || !segmentsAreClean(rest)) return undefined;

  const head = rest[0] as string;
  const entry = OWNED.find((e) => collisionKey(e.at) === collisionKey(head));
  if (entry === undefined) return undefined;
  if (entry.kind === 'file' && rest.length !== 1) return undefined;

  return relative as HarnessPath;
}

export interface PayloadResult {
  readonly path?: HarnessPath;
  readonly bag: DiagnosticBag;
}

/**
 * The payload destination for one pack file, and the **only** place in
 * this module that produces a diagnostic.
 *
 * `sub` is a path **inside the pack** as the payload walk found it. An
 * illegal one is the pack author's fault and is reported with the pack's
 * name — `E-PAYLOAD-PATH-INVALID`, whose message reads *"X in pack N is
 * not a legal pack path"*. Phase 1 copies verbatim and skips no file, so
 * this is checked for every payload file rather than for the ones a
 * recipe step happens to name.
 */
export function payloadPath(packName: string, sub: string): PayloadResult {
  const bag = new DiagnosticBag();
  const segments = sub.split('/');

  const fault = badPackSegment(segments);
  if (fault !== null) {
    bag.add('E-PAYLOAD-PATH-INVALID', {
      values: { path: sub, name: packName, construct: fault },
    });
    return { bag };
  }

  const p = harnessPath(`${HARNESS_ROOT}/pack/${sub}`);
  /* c8 ignore next 4 — unreachable once the segment check passes; kept so
     a future change to either rule cannot silently produce a path this
     module has not admitted. */
  if (p === undefined) {
    bag.add('E-PAYLOAD-PATH-INVALID', { values: { path: sub, name: packName, construct: 'an unplaceable path' } });
    return { bag };
  }
  return { path: p, bag };
}

/** Names the offending construct, so the message can say which. */
function badPackSegment(segments: readonly string[]): string | null {
  if (segments.length === 0 || segments.some((s) => s.length === 0)) return 'an empty segment';
  for (const s of segments) {
    if (s === '.' || s === '..') return 'a "." or ".." segment';
    if (s.includes('\\')) return 'a backslash';
    if (/[.\s]$/.test(s)) return 'a segment ending in "." or whitespace';
    if (s.normalize('NFC') !== s) return 'a non-NFC name';
  }
  if (/^[A-Za-z]:/.test(segments[0] as string)) return 'a drive letter';
  return null;
}

/** Convenience constructors for the four fixed entries, so call sites do
 *  not compose `.harness/…` strings and re-derive what this module knows. */
export const harness = {
  manifest: (): HarnessPath => must(`${HARNESS_ROOT}/manifest.json`),
  journal: (): HarnessPath => must(`${HARNESS_ROOT}/journal.json`),
  lock: (): HarnessPath => must(`${HARNESS_ROOT}/lock`),
  backup: (sub: string): HarnessPath | undefined => harnessPath(`${HARNESS_ROOT}/journal.d/${sub}`),
} as const;

/** For the four paths this module knows are valid by construction. */
function must(p: string): HarnessPath {
  const r = harnessPath(p);
  /* c8 ignore next */
  if (r === undefined) throw new Error(`harness-paths: ${p} must be constructible`);
  return r;
}

/** True iff `p` is under the CLI's tree. Used by the denylist's own tests
 *  to assert the two rules partition rather than overlap. */
export function isHarnessOwned(p: string): boolean {
  return collisionKey(p.split('/')[0] ?? '') === collisionKey(HARNESS_ROOT);
}
