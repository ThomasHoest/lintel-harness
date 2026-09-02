/**
 * US-16 step 12 — the folder-README rule, per parameter combination.
 * T-0903, Q-50.
 *
 * ── The rule, in one sentence ─────────────────────────────────────────
 *
 * Take the **proper** directory prefixes of every applied path a
 * combination writes, drop the project root and everything tool-owned, and
 * require the **same combination** to write `<dir>/<folderReadme>`.
 *
 * ── Two words doing the work ──────────────────────────────────────────
 *
 * **Proper.** `a/b/c.md` implies `a/` *and* `a/b/`, not `a/b/` alone. The
 * intermediate directory is one the apply creates just as surely as the
 * leaf, and quantifying over leaves only is the defect `coding` shipped:
 * `infrastructure/` was created by a backend scaffold and no step wrote it
 * a README, and every reading of the rule that stopped at the leaf agreed
 * the pack was clean.
 *
 * **Same combination.** A step that creates a folder under one answer and
 * a README step gated on a *different* answer both appear in the merged
 * step set, which hides the gap. Per combination it is visible. That is
 * why this takes one combination's path set and is called once per
 * combination, rather than taking a union and being called once.
 *
 * ── Why it is a warning, and why `--strict` still promotes it ─────────
 *
 * `validate` has **no project root**, so it cannot tell *a directory this
 * apply creates* — which Q-50 governs — from *a directory that already
 * exists and is merely written into*, which Q-50 does not. The check
 * over-approximates **by construction**, and an over-approximating check
 * must not be fatal by code: a pack writing into a conventional
 * pre-existing directory would otherwise be unshippable, and the
 * workaround would be the `.gitkeep`-shaped placeholder Q-50 exists to
 * prevent.
 *
 * The over-approximation governs the **severity**, not the class. The
 * class is `defect` — the remedy is a recipe step the author adds, which
 * is what the third message line says — so `--strict` promotes it in the
 * one place the over-approximation is known empty: this repo's CI over the
 * three bundled packs.
 *
 * ── What it does not do ───────────────────────────────────────────────
 *
 * It does not read what the README **says**, and it does not run at apply
 * time. Q-50 is a content convention; this makes its *shape* checkable,
 * not its prose.
 */
import { DiagnosticBag } from '../diag/diagnostic.js';
import { collisionKey } from '../security/confine.js';

/** US-1's default. `coding` and `planning` take it; `writing` declares
 *  `index.md`. **Declared rather than guessed**, because a checker that
 *  accepted either basename could not report a missing one. */
export const DEFAULT_FOLDER_README = 'README.md';

export interface FolderReadmeInput {
  readonly packName: string;
  /** `pack.json`'s `folderReadme`, or the default. */
  readonly basename: string;
  /** Every applied path **this combination** writes. */
  readonly paths: readonly string[];
  /** The combination's label, for the `combination:` message line. */
  readonly combination: string;
}

/**
 * The proper directory prefixes of a set of applied paths, each ending
 * `/`, in first-seen order.
 *
 * Exported so a test can assert the *set* rather than the diagnostics it
 * produces — "proper" is the word that has been got wrong, and asserting
 * it through a diagnostic tests the message as well as the rule.
 */
export function directoryPrefixes(paths: readonly string[]): readonly string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of paths) {
    const segments = p.split('/');
    // `length - 1`: the last segment is the file, so every prefix
    // produced here is PROPER. A loop to `length` would add the file's own
    // path as a directory and require a README inside a file.
    for (let i = 1; i < segments.length; i += 1) {
      const dir = `${segments.slice(0, i).join('/')}/`;
      if (seen.has(dir)) continue;
      seen.add(dir);
      out.push(dir);
    }
  }
  return out;
}

/**
 * Is this directory tool-owned, and therefore outside Q-50?
 *
 * **`.claude` at any segment, `.harness` at the first only** — the same
 * asymmetry `executable.ts` and the reserved-destination denylist state,
 * and for the same reasons. A `.claude` tree is read by the runtime
 * wherever it is found, so anchoring it at the root would re-create C-33.
 * `.harness/` names one specific tree this CLI constructs, so it is
 * first-segment; and a recipe step cannot write there at all (C-5), which
 * makes the entry a statement of the boundary rather than a live filter.
 */
export function toolOwned(dir: string): boolean {
  const segments = dir.split('/').filter((s) => s !== '');
  const first = segments[0];
  if (first !== undefined && collisionKey(first) === collisionKey('.harness')) return true;
  return segments.some((s) => collisionKey(s) === collisionKey('.claude'));
}

/**
 * One combination's folder READMEs. **One diagnostic per directory per
 * combination**, in directory order.
 */
export function checkFolderReadmes(input: FolderReadmeInput): DiagnosticBag {
  const bag = new DiagnosticBag();

  // Matched by `collisionKey`, like every other path comparison in this
  // product: a pack writing `docs/Readme.md` against a declared
  // `README.md` is the same file on macOS and Windows, and reporting a
  // missing README beside the one that satisfies it would be a finding no
  // author could act on.
  const written = new Set(input.paths.map(collisionKey));

  for (const dir of directoryPrefixes(input.paths)) {
    if (toolOwned(dir)) continue;
    if (written.has(collisionKey(`${dir}${input.basename}`))) continue;
    bag.add('W-FOLDER-README-MISSING', {
      path: dir,
      values: {
        pack: input.packName,
        dir,
        basename: input.basename,
        combination: input.combination,
      },
    });
  }

  return bag;
}
