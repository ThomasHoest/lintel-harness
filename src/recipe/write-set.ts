/**
 * The write set — **the quantifier every destination rule is stated
 * over**. T-0404, C-19.
 *
 * ── Why this exists as a named concept ────────────────────────────────
 *
 * A destination rule written over `step.to` has **two silent exemptions**:
 * `rewrite-path` and `substitute` have no `to` at all. That is not a
 * hypothetical — it is how the reserved-destination denylist and the
 * deleted settings policy **both lapsed while remaining literally true of
 * the text they were written about**. Two of six primitives were exempt
 * from controls everyone believed were total.
 *
 * So the rule is: **every applied path whose bytes a step creates or
 * changes**, and every one of them passes the four-stage confinement gate,
 * the stage-2 denylist and the executable rules. Never `step.to`.
 *
 * ── Matched, not hit ──────────────────────────────────────────────────
 *
 * For the two `in` primitives the set is every written-set path the globs
 * **match** — *"a path whose content lacks `find` is still in the set"*.
 * The distinction matters because the set is computed at **plan time**,
 * before any bytes exist to search. A set defined by what a step turns out
 * to change could only be known after changing it, which would make it
 * useless as a gate.
 *
 * ── Pure, project-free, total ─────────────────────────────────────────
 *
 * No project, no filesystem handle, no `await` — which is what lets
 * `validate` compute it in CI with nothing checked out. The payload
 * listing is **passed in**; there is no parameter through which disk could
 * enter, on the same reasoning as the glob matcher (C-27).
 *
 * `writtenSoFar` — the plan's ordered written-set — is the **sole**
 * resolution domain for `in` globs. Not the payload, not the project, not
 * the filesystem.
 */
import { DiagnosticBag } from '../diag/diagnostic.js';
import { confinePath, type AppliedPath } from '../security/confine.js';
import { matchesAny } from './glob.js';
import type { RecipeStep } from './types.js';

export interface WriteSetInput {
  /** The step. */
  readonly step: RecipeStep;
  /** 0-based index in the merged plan, for diagnostics. */
  readonly index: number;
  /**
   * Pack-relative POSIX paths of every payload **file**, from the one
   * bounded walk. Passed in rather than read: this module takes no
   * filesystem handle, so "resolve against disk" is not expressible.
   */
  readonly payload: readonly string[];
  /** The plan's ordered written-set — every applied path placed by an
   *  earlier step. The **sole** resolution domain for `in`. */
  readonly writtenSoFar: readonly AppliedPath[];
}

export interface WriteSetResult {
  /** Every applied path the step creates or changes, in a stable order:
   *  payload order for the placing ops, written-set order for the editing
   *  ones. Order is part of the contract — `pack info` prints it. */
  readonly paths: readonly AppliedPath[];
  readonly bag: DiagnosticBag;
}

/** A directory `from`/`to` is one ending in `/`. Stated once: three of the
 *  six primitives depend on the distinction and a second spelling of it is
 *  a second thing to get wrong. */
const isDir = (p: string): boolean => p.endsWith('/');

/**
 * The write set of one step.
 *
 * **Total over the six arms** — the `switch` has no `default` that
 * shrugs, and the exhaustiveness check at the end is a compile error if an
 * arm is added without a case here.
 */
export function stepWriteSet(input: WriteSetInput): WriteSetResult {
  const { step, index } = input;
  const bag = new DiagnosticBag();
  const raw: string[] = [];

  switch (step.op) {
    case 'rename':
    case 'generate':
      // One applied path: its `to`.
      raw.push(step.to);
      break;

    case 'copy':
      raw.push(...expand(input, step.from, step.to, step.exclude, null));
      break;

    case 'strip-suffix':
      // The suffix is dropped from the basename BEFORE confinement, so
      // the gate sees the path that will actually be written. Checking
      // the pre-strip name would gate a path nothing creates.
      raw.push(...expand(input, step.from, step.to, step.exclude, step.suffix));
      break;

    case 'rewrite-path':
    case 'substitute': {
      // MATCHED, not hit — and against `writtenSoFar` alone.
      const matched = input.writtenSoFar.filter((p) => matchesAny(step.in, p));
      if (matched.length === 0) {
        // A declaration covering no path is an authoring mistake, and
        // silently accepting it is how a pack ends up believing it
        // declared something it did not.
        bag.add('E-RECIPE-STEP-INVALID', {
          step: index,
          values: {
            index: String(index),
            op: step.op,
            reason: `"in" (${step.in.join(', ')}) matches no path written by an earlier step`,
            usage: '',
          },
        });
        return { paths: [], bag };
      }
      // C-27's SECOND mechanism: every matched path is re-checked
      // individually against the stage-2 denylist. The first mechanism is
      // an implicit chain — these paths were gated when they were placed —
      // and a control that holds only because of a chain nobody re-states
      // is a control that lapses when a link is added.
      return gate(bag, matched, index);
    }

    default:
      // Total over the six arms, and enforced rather than asserted: a
      // seventh arm added to the union without a case here is a COMPILE
      // error, because `step` is not `never` any more. The whole safety
      // argument is that the set is closed, and a runtime `default` that
      // shrugs would concede it quietly.
      return exhausted(step, bag);
  }

  return gate(bag, raw, index);
}

/**
 * Expand a directory or file `from` into applied paths.
 *
 * `exclude` globs are **relative to `from`**, not to the pack root — a
 * detail with no second spelling anywhere, so it is stated here and used
 * once.
 */
function expand(
  input: WriteSetInput,
  from: string,
  to: string,
  exclude: readonly string[] | undefined,
  suffix: string | null,
): string[] {
  if (!isDir(from)) {
    // A file `from`. `copy` may not change the basename; `strip-suffix`
    // drops the suffix from it. Either way one path.
    return [suffix === null ? to : stripSuffix(to, suffix)];
  }

  const out: string[] = [];
  for (const p of input.payload) {
    if (!p.startsWith(from)) continue;
    const rel = p.slice(from.length);
    if (rel === '') continue;
    if (exclude !== undefined && matchesAny(exclude, rel)) continue;
    out.push(suffix === null ? `${to}${rel}` : stripSuffix(`${to}${rel}`, suffix));
  }
  return out;
}

/** Drop `<suffix>` from a basename: `a.template.md` with `.template` →
 *  `a.md`. Only from the basename, and only the last occurrence, so a
 *  directory segment carrying the same characters is untouched. */
function stripSuffix(path: string, suffix: string): string {
  const cut = path.lastIndexOf('/') + 1;
  const base = path.slice(cut);
  const at = base.lastIndexOf(suffix);
  return at < 0 ? path : path.slice(0, cut) + base.slice(0, at) + base.slice(at + suffix.length);
}

/**
 * The confinement gate over the write set.
 *
 * **This is C-19 in one function call.** Every path here — not `step.to`,
 * which two arms do not have — goes through stages 1 and 2: the path
 * grammar and the reserved-destination denylist.
 */
function gate(bag: DiagnosticBag, paths: readonly string[], index: number): WriteSetResult {
  const out: AppliedPath[] = [];
  for (const p of paths) {
    const r = confinePath(p, { index });
    for (const d of r.bag.items) bag.push(d);
    if (r.path !== undefined) out.push(r.path);
  }
  return { paths: out, bag };
}

/**
 * The union of several steps' write sets, in plan order and de-duplicated.
 *
 * Used by the adapt-expected and fill-expected sets (T-0407, T-0410),
 * which are exactly this over the steps carrying the declaration.
 */
export function unionWriteSets(sets: readonly (readonly AppliedPath[])[]): readonly AppliedPath[] {
  const seen = new Set<string>();
  const out: AppliedPath[] = [];
  for (const set of sets) {
    for (const p of set) {
      if (seen.has(p)) continue;
      seen.add(p);
      out.push(p);
    }
  }
  return out;
}

/** Unreachable while the union has six arms; a compile error the moment it
 *  has seven. `never` is the whole mechanism. */
function exhausted(step: never, bag: DiagnosticBag): WriteSetResult {
  void step;
  return { paths: [], bag };
}
