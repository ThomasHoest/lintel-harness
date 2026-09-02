/**
 * The confinement gate. T-0201–T-0205.
 *
 * **The only constructor of `AppliedPath`**, and the trust-critical
 * foundation of the product (`system-architecture.md` §3). Four stages,
 * each answering a different question, and every applied path in the
 * system has passed all of the ones that apply to it:
 *
 *   1  GRAMMAR + DENYLIST  is this `to` even sayable?      no filesystem
 *   2  RESERVED DESTINATION is it somewhere a pack may go?  no filesystem
 *   3  RESOLUTION          does it stay inside the project? lstat, at plan
 *   4  AT WRITE            is that still true right now?    lstat, at write
 *
 * Stages 1–2 run at `validate`, which has **no project**, so they touch no
 * filesystem — that is what lets CI check a pack with nothing applied.
 *
 * **The brand is the enforcement.** `AppliedPath` is a nominal type with
 * no public constructor, so a writer typed against it cannot be handed a
 * bare `string`: "we forgot to validate this one" is a compile error
 * rather than a review finding (C-14).
 */
import { DiagnosticBag } from '../diag/diagnostic.js';

declare const AppliedPathBrand: unique symbol;

/**
 * A project-relative POSIX path that has passed the gate.
 *
 * **Obtainable only from `confinePath()`.** No cast, no `as AppliedPath`
 * outside this module — a grep for the brand name is the audit.
 */
export type AppliedPath = string & { readonly [AppliedPathBrand]: 'AppliedPath' };

/* ── stage 1: the grammar ───────────────────────────────────────────── */

/**
 * Reserved Windows device basenames. Checked **on every platform**,
 * because a pack authored on Linux must not produce a tree that cannot be
 * checked out on Windows — G-F1-7's determinism is across platforms, not
 * on the author's.
 */
const WINDOWS_RESERVED =
  /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\.|$)/i;

/** One anchored rule per fault, so the message can name the construct.
 *  US-3 states these as one grammar; they are separated here only so the
 *  diagnostic can say which clause failed. */
const GRAMMAR_FAULTS: readonly { readonly test: (p: string) => boolean; readonly construct: string }[] = [
  { construct: 'an empty path', test: (p) => p.length === 0 },
  // UNC BEFORE the leading-separator rule: `//host/share` matches both,
  // and naming the more specific construct is the more useful message.
  { construct: 'a UNC prefix', test: (p) => p.startsWith('//') },
  { construct: 'a leading separator', test: (p) => p.startsWith('/') },
  { construct: 'a backslash', test: (p) => p.includes('\\') },
  // `C:/x` is drive-absolute; `C:x` is drive-RELATIVE and resolves against
  // the process's per-drive cwd, which is a different escape with the same
  // shape. Both are refused by the same clause.
  { construct: 'a drive letter', test: (p) => /^[A-Za-z]:/.test(p) },
  { construct: 'a NUL byte', test: (p) => p.includes('\u0000') },
  {
    construct: 'a "." or ".." or empty segment',
    test: (p) => p.split('/').some((seg) => seg === '' || seg === '.' || seg === '..'),
  },
  {
    construct: 'a segment ending in "." or whitespace',
    test: (p) => p.split('/').some((seg) => /[.\s]$/.test(seg)),
  },
  {
    construct: 'a reserved Windows device name',
    test: (p) => p.split('/').some((seg) => WINDOWS_RESERVED.test(seg)),
  },
  { construct: 'a non-NFC name', test: (p) => p.normalize('NFC') !== p },
];

/* ── collisionKey ───────────────────────────────────────────────────── */

/**
 * The folding rule. **One function, used by every comparison that decides
 * whether two paths are the same file** (N-5): step-vs-step collisions,
 * the reserved-destination denylist, `E-TARGET-EXISTS`, `--force`'s
 * byte-identity test, and the journal's `preExisting` determination.
 * Rollback safety rides on it (C-13, C-20) — a wrong answer here makes
 * `--rollback` delete a file the apply did not create.
 *
 * **NFC, then ASCII case-folding, and ASCII only** (Q-81, F1 known limit
 * 17). `A`–`Z` to `a`–`z`; no other character is altered.
 *
 * **Do not "improve" this to `toLowerCase()` and do not hand-roll a
 * Unicode fold.** `toLowerCase()` is a different operation — `ß`
 * lowercases to itself but folds to `ss`, final sigma likewise — so it
 * produces a different collision set. A partial Unicode fold is worse
 * than either: aggressive on the pairs it covers and silent on the rest,
 * while reporting the same confidence for both. **An ASCII fold is wrong
 * in a knowable way**, and the whole of that limit is: every non-ASCII
 * case pair is uncovered. A test pins it.
 */
export function collisionKey(path: string): string {
  const nfc = path.normalize('NFC');
  let out = '';
  for (const ch of nfc) {
    const c = ch.codePointAt(0) as number;
    out += c >= 0x41 && c <= 0x5a ? String.fromCodePoint(c + 0x20) : ch;
  }
  return out;
}

/* ── stage 2: reserved destinations ─────────────────────────────────── */

/**
 * The denylist, **as two declared closed classes with one quantifier
 * rule** (F1 US-3 stage 2). The table there is authoritative; this
 * references it rather than restating the reasoning.
 *
 * The ADR homes this in `destination-policy.ts`. **That module is not
 * built** — Q-54 removed its subject — and the ADR's own supersede box
 * directs the denylist here.
 */

/**
 * Class 2 names, reserved at **every** segment (C-33's scoping), plus
 * `skills` as of C-53: a pack may not install instructions into the agent
 * runtime of the project it is applied to.
 *
 * **It is a denylist and is incomplete by construction** — F1 says so, and
 * saying so is the point: the class was a *category* enumerated at three
 * members through v2.3, so `.github/workflows/ci.yml`, `.vscode/tasks.json`
 * and `node_modules/.bin/<name>` all passed every stage.
 */
const RESERVED_NAMES = [
  '.github',
  '.vscode',
  '.idea',
  'node_modules',
  '.circleci',
  '.devcontainer',
  'skills',
] as const;

/**
 * Basenames reserved at **any depth** — files a common toolchain executes
 * or which govern what may be executed.
 *
 * **Thirteen, and the list is F1 US-3 stage 2's.** An earlier draft of
 * this module restated it from memory at two entries and was wrong about
 * eleven; `confine.test.ts` now re-derives the whole denylist from the
 * spec and fails on any divergence, which is the task's *"reference it,
 * do not restate it"* made mechanical.
 */
const RESERVED_BASENAMES = [
  'package.json',
  '.envrc',
  '.npmrc',
  '.yarnrc.yml',
  'Makefile',
  'GNUmakefile',
  'justfile',
  '.justfile',
  '.mcp.json',
  '.gitlab-ci.yml',
  'Jenkinsfile',
  'azure-pipelines.yml',
  'bitbucket-pipelines.yml',
] as const;

/** Reserved under **any `.claude` segment** (C-39a) — not as two
 *  root-relative paths, which is what let `docs/.claude/settings.json`
 *  through until v2.5. */
const CLAUDE_SETTINGS = ['settings.json', 'settings.local.json'] as const;

/** The **only** location entry: nothing a recipe step writes may land
 *  under `.harness/`. The CLI's own writes there carry `HarnessPath`
 *  instead, which is what stops this rule deadlocking the payload
 *  copier (C-5, C-14). */
const RESERVED_ROOT = '.harness';

/** Exported for the drift guard only — the denylist's members are F1's,
 *  and a test asserts these equal what §US-3 stage 2 declares. */
export const DENYLIST = {
  root: RESERVED_ROOT,
  names: RESERVED_NAMES,
  basenames: RESERVED_BASENAMES,
  claudeSettings: CLAUDE_SETTINGS,
} as const;

export interface ReservedHit {
  readonly construct: string;
  readonly reserved: string;
}

/** Stage 2, as a pure predicate over a grammar-clean path. Every
 *  comparison folds through `collisionKey`. */
export function reservedDestination(path: string): ReservedHit | null {
  const segs = path.split('/').map(collisionKey);
  const base = segs[segs.length - 1] as string;

  if (segs[0] === collisionKey(RESERVED_ROOT)) {
    return { construct: 'a location reserved to lintel', reserved: `${RESERVED_ROOT}/` };
  }
  for (const name of RESERVED_NAMES) {
    if (segs.includes(collisionKey(name))) {
      return { construct: 'a reserved directory name', reserved: name };
    }
  }
  for (const b of RESERVED_BASENAMES) {
    if (base === collisionKey(b)) return { construct: 'a reserved basename', reserved: b };
  }
  if (segs.includes(collisionKey('.claude'))) {
    for (const b of CLAUDE_SETTINGS) {
      if (base === collisionKey(b)) {
        return { construct: 'a settings file under a .claude segment', reserved: b };
      }
    }
  }
  return null;
}

/* ── the gate ───────────────────────────────────────────────────────── */

/**
 * Where a path came from. **Every confinement diagnostic names a step**,
 * because confinement only ever happens in one — the messages in F1
 * §Error States are written as `step {index} writes "…"`, and a caller
 * that cannot say which step has not thought about what it is confining.
 */
export interface ConfineContext {
  /** Recipe step index, 0-based as declared. */
  readonly index: number;
}

export interface ConfineResult {
  /** Present iff the path passed every stage that applies. */
  readonly path?: AppliedPath;
  readonly bag: DiagnosticBag;
}

/**
 * Stages 1 and 2 — **`stage: 'declared'`**, the arm `validate` runs.
 *
 * No filesystem access of any kind, which is what lets a pack be checked
 * in CI with no project present. Stages 3 and 4 are `plan`'s and the
 * writer's, and live in the resolution module.
 */
export function confinePath(to: string, ctx: ConfineContext): ConfineResult {
  const bag = new DiagnosticBag();
  const index = String(ctx.index);

  for (const fault of GRAMMAR_FAULTS) {
    if (fault.test(to)) {
      bag.add('E-MAP-PATH-GRAMMAR', {
        step: ctx.index,
        values: { index, to, construct: fault.construct },
      });
      return { bag };
    }
  }

  const hit = reservedDestination(to);
  if (hit !== null) {
    bag.add('E-MAP-RESERVED-DEST', {
      step: ctx.index,
      // `path`, not `to` — F1's message for this code names the parameter
      // differently from the grammar code's, and a mismatched name renders
      // a visible `{path}` to the user rather than the path.
      values: { index, path: to, reserved: hit.reserved },
    });
    return { bag };
  }

  return { path: to as AppliedPath, bag };
}

/** True iff `confinePath` would accept. For call sites that want the
 *  predicate without the diagnostics. */
export function isConfinable(to: string, ctx: ConfineContext = { index: 0 }): boolean {
  return confinePath(to, ctx).path !== undefined;
}
