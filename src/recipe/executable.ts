/**
 * The executable-bit rules. T-0508, C-12, C-33, C-39b.
 *
 * ── Quantified over the WRITE SET, never over `to` ────────────────────
 *
 * A `copy` with a directory `from` sets one bit in the step and produces
 * many applied paths. A rule checked against `to` would see one
 * destination — the directory — and let the recursion carry the bit
 * anywhere underneath it that the declared root did not name. So the check
 * runs **at declaration and again per applied path**, and the second half
 * is the one that matters: it is what stops a recursion reaching a
 * forbidden destination its root never mentioned.
 *
 * ── Four rules ────────────────────────────────────────────────────────
 *
 *   ROOTS       `executable: true` is legal only under a prefix declared
 *               in `pack.json`'s `executableRoots`. Outside every one:
 *               `E-EXEC-ROOT-UNDECLARED`.
 *   FORBIDDEN   never inside a `.claude`, `.git`, `.hg` or `.svn` segment
 *               **at any depth**, and never under `.harness/`:
 *               `E-EXEC-DEST-FORBIDDEN`. Checked on the declared root AND
 *               on every applied path.
 *   GRAMMAR     each declared root passes the stage-1 path grammar and the
 *               stage-2 denylist — a root is a destination like any other,
 *               and a root nobody gated is a gate with a hole in it.
 *   CAP         more than 32 executables in one apply is
 *               `E-EXEC-TOO-MANY`.
 *
 * ── No bundled consumer, and the task text says otherwise ─────────────
 *
 * T-0508 states that *"`coding` declares `executableRoots:
 * ["infrastructure/backend-deploy/"]` and each backend scaffold sets the
 * bit on four scripts"*. **That was true and is not.** Q-82 moved both
 * backend kits to `addons/` as v1.1 add-ons, so **no v1.0 pack declares
 * `executableRoots` and none sets `executable: true`** — the apparatus is
 * fixture-covered, exactly like the scaffold-exclusivity rules Q-82
 * emptied. The rules stay in full because the add-on mechanism inherits
 * them, and a test asserts the emptiness rather than leaving a reader to
 * assume the coverage is real.
 */
import { DiagnosticBag } from '../diag/diagnostic.js';
import { confinePath } from '../security/confine.js';
import type { AppliedPath } from '../security/confine.js';

/** More than this in one apply is `E-EXEC-TOO-MANY`. A pack that needs
 *  more has stopped being a way of working and become a distribution. */
export const MAX_EXECUTABLES = 32;

/** Directories a pack may never place an executable inside, at any depth.
 *  `.claude` leads the list because it is the one an agent reads. */
const FORBIDDEN_SEGMENTS = ['.claude', '.git', '.hg', '.svn'] as const;

/** And this one only as a **first** segment — `.harness/` is the CLI's own
 *  tree, and a pack writing an executable into it would be writing into
 *  the record of what it wrote. */
const FORBIDDEN_ROOT = '.harness';

/**
 * Are a pack's declared roots usable at all?
 *
 * Run once per pack, before any step. A malformed root is a pack defect
 * and reporting it per applied path would report it many times.
 */
export function checkExecutableRoots(roots: readonly string[] = []): DiagnosticBag {
  const bag = new DiagnosticBag();
  for (const root of roots) {
    // A root is a destination like any other, and one that skipped the
    // gate would be a gate with a hole in it — but it is a DIRECTORY, and
    // stage 1 is an applied-PATH grammar which refuses an empty segment.
    // A prefix ending `/` has one by construction, so until F1 v5.0 every
    // legal root was refused by the rule that governs it. The separator is
    // exactly what distinguishes a directory from a path; it is stripped
    // before the check rather than fought with.
    const asPath = root.endsWith('/') ? root.slice(0, -1) : root;
    for (const d of confinePath(asPath, { index: 0 }).bag.items) bag.push(d);

    if (forbiddenReason(root) !== null) {
      bag.add('E-EXEC-DEST-FORBIDDEN', { values: { path: root } });
    }
  }
  return bag;
}

/**
 * Check one step's executable paths.
 *
 * `paths` is the step's **write set**, not its `to`. See the header.
 */
export function checkExecutablePaths(
  paths: readonly AppliedPath[],
  roots: readonly string[] = [],
  index: number,
): DiagnosticBag {
  const bag = new DiagnosticBag();
  for (const path of paths) {
    if (forbiddenReason(path) !== null) {
      bag.add('E-EXEC-DEST-FORBIDDEN', { values: { path } });
      continue;
    }
    if (!roots.some((r) => path.startsWith(r))) {
      bag.add('E-EXEC-ROOT-UNDECLARED', {
        step: index,
        values: {
          index: String(index),
          to: path,
          roots: roots.length > 0 ? roots.join(', ') : '(none)',
        },
      });
    }
  }
  return bag;
}

/** The cap, over the whole apply rather than per step: 32 executables is
 *  a fact about what lands in the project, and a per-step bound would be
 *  satisfiable by splitting one step into two. */
export function checkExecutableCap(total: number): DiagnosticBag {
  const bag = new DiagnosticBag();
  if (total > MAX_EXECUTABLES) {
    bag.add('E-EXEC-TOO-MANY', { values: { n: String(total) } });
  }
  return bag;
}

/** Why this path may not carry the bit, or `null`. Exported so a test can
 *  assert the rule rather than the diagnostic. */
export function forbiddenReason(path: string): string | null {
  const segments = path.split('/').filter((s) => s !== '');
  if (segments[0] === FORBIDDEN_ROOT) return `it is under ${FORBIDDEN_ROOT}/`;
  for (const seg of segments) {
    // AT ANY DEPTH, not just the first: `docs/.claude/hook.sh` is exactly
    // as readable by an agent as `.claude/hook.sh`, and a check anchored
    // at the root would miss it.
    if ((FORBIDDEN_SEGMENTS as readonly string[]).includes(seg)) {
      return `it has a "${seg}" segment`;
    }
  }
  return null;
}
