/**
 * Scaffolds: selection, exclusivity, composition order. T-0310, Q-17.
 *
 * ── Two faults that a path collision would report as one ──────────────
 *
 * `E-SCAFFOLD-EXCLUSIVE` exists because the honest diagnostic is not
 * always the useful one. Under the pre-category model, selecting two
 * alternatives surfaced as a **path collision** — both backend kits wrote
 * `infrastructure/backend-deploy/` — which was *true* and told the user
 * the wrong thing: they had not hit an authoring bug, they had picked two
 * of a choose-one. **Both diagnostics are true; only one is useful**, and
 * that is the whole argument for the `category` field.
 *
 *   E-SCAFFOLD-EXCLUSIVE   exit 1, the USER's. Two selected scaffolds
 *                          share a category. Remedy: pick one.
 *   E-SCAFFOLD-COLLISION   exit 2, the AUTHOR's. Two scaffolds a user
 *                          *may* select together write one path.
 *   E-SCAFFOLD-UNKNOWN     exit 1, the USER's. An id typed on the command
 *                          line that the pack does not declare. A
 *                          `pack.json`/`recipe.json` mismatch is a
 *                          different fault at a different severity
 *                          (`E-RECIPE-STEP-INVALID`, exit 2, T-0405's):
 *                          severity is a property of the code, not of the
 *                          occasion.
 *
 * ── Q-82: every branch here is fixture-covered, not pack-covered ──────
 *
 * `writing-workstream` is **the only scaffold in the product**, and it is
 * alone in its category. So the same-category pair, the no-category
 * composable case and the cross-category collision matrix have **no
 * bundled subject** — the two backend kits that were the worked example
 * are now add-ons (v1.1, F7). The rules are kept in full because the
 * add-on mechanism inherits them, and the tests use fixture packs rather
 * than pretending a shipping pack exercises them.
 */
import { DiagnosticBag } from '../diag/diagnostic.js';
import type { PackJson, ScaffoldDecl } from './types.js';

export interface Selection {
  /** The selected declarations, in **`pack.json` order**. Empty when
   *  nothing was selected — scaffolds are opt-in and no flag means none. */
  readonly selected: readonly ScaffoldDecl[];
  readonly bag: DiagnosticBag;
}

/**
 * Resolve `--scaffold` ids against the pack.
 *
 * **The result is in `pack.json`-declared order, never the order typed**,
 * and that is a correctness property rather than a presentational one:
 * scaffold steps write files, so two users typing `--scaffold a
 * --scaffold b` and `--scaffold b --scaffold a` must get **byte-identical
 * projects**. Ordering by the command line would make the tree depend on
 * an argument order nobody thinks of as meaningful.
 *
 * A repeated id is not a fault — asking for the same scaffold twice is the
 * same request — but it is selected once.
 */
export function selectScaffolds(pack: PackJson, requested: readonly string[]): Selection {
  const bag = new DiagnosticBag();
  const declared = pack.scaffolds ?? [];
  const byId = new Map(declared.map((s) => [s.id, s]));
  const available = declared.map((s) => s.id).join(', ');

  const wanted = new Set<string>();
  for (const id of requested) {
    if (!byId.has(id)) {
      // Listing the available ids VERBATIM (US-9): a user comparing what
      // they typed against a paraphrase cannot see the difference.
      bag.add('E-SCAFFOLD-UNKNOWN', {
        values: { name: pack.name, id, ids: available.length > 0 ? available : '(none)' },
      });
      continue;
    }
    wanted.add(id);
  }

  const selected = declared.filter((s) => wanted.has(s.id));

  // Exclusivity is checked over the SELECTED set, in declared order, so
  // the pair named in the message is stable across two users who typed the
  // flags in opposite orders.
  const firstOfCategory = new Map<string, ScaffoldDecl>();
  for (const s of selected) {
    if (s.category === undefined) continue;
    const first = firstOfCategory.get(s.category);
    if (first === undefined) {
      firstOfCategory.set(s.category, s);
      continue;
    }
    bag.add('E-SCAFFOLD-EXCLUSIVE', {
      values: {
        a: first.id,
        b: s.id,
        category: s.category,
        ids: declared.filter((d) => d.category === s.category).map((d) => d.id).join(', '),
      },
    });
  }

  return { selected, bag };
}

/** A scaffold's applied write set, supplied by the caller. This module
 *  computes no write set — that is the recipe's, and E-04's. */
export type WriteSets = ReadonlyMap<string, readonly string[]>;

/**
 * The static pairwise collision matrix.
 *
 * Computed **across every pair whose categories differ or are absent** —
 * i.e. every pair a user is *permitted* to select together. A same-category
 * pair is deliberately skipped: those two can never both be applied, so a
 * shared path between them is not a collision, it is two alternatives
 * writing the same file, which is what alternatives do.
 *
 * Exit 2, and the author's: it is reachable without any user doing
 * anything wrong, which is what makes it an authoring defect rather than a
 * usage one.
 */
export function checkScaffoldCollisions(pack: PackJson, writes: WriteSets): DiagnosticBag {
  const bag = new DiagnosticBag();
  const declared = pack.scaffolds ?? [];

  for (let i = 0; i < declared.length; i++) {
    for (let j = i + 1; j < declared.length; j++) {
      const a = declared[i] as ScaffoldDecl;
      const b = declared[j] as ScaffoldDecl;
      if (a.category !== undefined && a.category === b.category) continue;

      const bPaths = new Set(writes.get(b.id) ?? []);
      for (const path of writes.get(a.id) ?? []) {
        if (bPaths.has(path)) {
          bag.add('E-SCAFFOLD-COLLISION', { values: { a: a.id, b: b.id, path } });
        }
      }
    }
  }
  return bag;
}

/**
 * The parameters to prompt for and record, given a selection.
 *
 * *"A scaffold's parameters are only prompted for, and only recorded, when
 * that scaffold is selected"* (US-9). Base parameters first, then each
 * selected scaffold's in declared order — the same ordering argument as
 * the selection itself.
 */
export function parametersFor(pack: PackJson, selected: readonly ScaffoldDecl[]) {
  return [...(pack.parameters ?? []), ...selected.flatMap((s) => s.parameters ?? [])];
}

/** The ids the manifest records, in declared order. */
export function selectedIds(selected: readonly ScaffoldDecl[]): readonly string[] {
  return selected.map((s) => s.id);
}
