/**
 * `pack.json`'s shapes. T-0302.
 *
 * **Exactly `F1-ADR-001`'s public interface contract.** Three absences are
 * as much a part of it as the fields, and are named so they read as
 * decisions:
 *
 *   - **no `contentRoot`** — phase 1 copies the folder (Q-39);
 *   - **no `mappings`** — phase 2 is a recipe (Q-40);
 *   - **no `shared` / `SharedRef` / `ComponentJson`** — there is no
 *     `shared/` mechanism at v1.0 (Q-48).
 *
 * `provenance` (Q-60) and `folderReadme` (Q-50) are present because the
 * amended contract carries them.
 */

/** The nine parts. A pack declares **all nine** — a missing one is
 *  `E-ANATOMY-MISSING`, not a default. */
export const ANATOMY_PART_IDS = [
  'process',
  'roles',
  'documentTemplates',
  'conventions',
  'coordination',
  'behaviouralGuidelines',
  'folderScaffolding',
  'skillsAndAutomations',
  'autonomyContract',
] as const;

export type AnatomyPartId = (typeof ANATOMY_PART_IDS)[number];

/** `present` is the **default**, which is load-bearing: it is why `coding`
 *  and `writing` may omit `status` on the parts they simply have. */
export const ANATOMY_STATUSES = ['present', 'provisional', 'absent'] as const;
export type AnatomyStatus = (typeof ANATOMY_STATUSES)[number];

/**
 * Where a part's content is.
 *
 * **No `{ ref: 'shared:…' }` arm** — Q-48. `declaredBy: 'recipe'` is valid
 * only for `folderScaffolding`, whose shape *is* the recipe's set of
 * destinations.
 *
 * **Known limit 15 (C-47), accepted and not fixed here:** `declaredBy` is
 * a behaviour-selecting value that US-1's closed enumeration does not
 * cover, so `"declaredBy": "payload"` is unhandled. Do not invent a rule
 * for it — F1 §F1.9 records it deliberately, and inventing one here would
 * put a decision in a module that F1 has not taken.
 */
export type AnatomySource =
  | { readonly paths: readonly string[] }
  | { readonly declaredBy: 'recipe' };

export type AnatomyDecl =
  | (AnatomySource & { readonly status?: 'present'; readonly note?: string })
  | (AnatomySource & { readonly status: 'provisional'; readonly note: string })
  | { readonly status: 'absent'; readonly reason: string };

export type ParameterType = 'string' | 'enum' | 'boolean';
export const PARAMETER_TYPES = ['string', 'enum', 'boolean'] as const;

export interface ParameterDecl {
  /** `^[a-zA-Z][a-zA-Z0-9]{0,31}$` */
  readonly id: string;
  readonly prompt: string;
  readonly type: ParameterType;
  /** Required when `type === 'enum'`. */
  readonly values?: readonly string[];
  readonly default?: string | boolean;
  /** Defaults to `false`. **Boolean-typed field 4 of 5.** */
  readonly required?: boolean;
  /** Kebab-case CLI alias, `^[a-z][a-z0-9-]{0,31}$`. */
  readonly flag?: string;
  /**
   * SEC (C-7). **Required** when `type === 'string'`. Anchored regex
   * source, ≤ 200 chars, no backreference, no lookaround. Forbidden on
   * `enum` and `boolean`.
   */
  readonly pattern?: string;
  /** SEC (C-7). `string` only. Default 256, hard ceiling 4096. Checked
   *  **before** `pattern` runs, so evaluation is bounded by construction
   *  and catastrophic backtracking is not reachable. */
  readonly maxLength?: number;
  /**
   * SEC (C-15). **Boolean-typed field 5 of 5**, and the one C-34 named:
   * `"notASecret": "no"` is **truthy** in JavaScript, so a typo here
   * disabled the credential ban entirely.
   */
  readonly notASecret?: boolean;
}

export interface ScaffoldDecl {
  /** `^[a-z][a-z0-9-]{0,31}$` */
  readonly id: string;
  readonly description: string;
  /**
   * Q-17. Two scaffolds sharing a category are **alternatives**; selecting
   * both is `E-SCAFFOLD-EXCLUSIVE`. Absent ⇒ composable with everything.
   *
   * **No v1.0 pack has a same-category pair** as of Q-82 — the two backend
   * kits that did are now add-ons — so this field has no bundled subject
   * and is fixture-covered only. **Q-83 asks whether it belongs to
   * scaffolds or to add-ons**; it is open, and nothing here presumes it.
   */
  readonly category?: string;
  readonly parameters?: readonly ParameterDecl[];
}

export interface Provenance {
  readonly source?: string;
  readonly commit?: string;
  readonly notes?: string;
  readonly [k: string]: string | undefined;
}

export interface PackJson {
  readonly formatVersion: number;
  /** `^[a-z][a-z0-9-]{1,31}$`, and **equals the directory name**. */
  readonly name: string;
  readonly version: string;
  readonly title: string;
  readonly minCliVersion: string;
  /** Pack-relative path to the recipe; defaults to `recipe.json`. */
  readonly recipe?: string;
  readonly anatomy: Readonly<Record<AnatomyPartId, AnatomyDecl>>;
  /**
   * Q-50. The basename satisfying the folder-README rule for this pack.
   * **One path segment**, subject to a step's `to` grammar. Absent ⇒
   * `README.md`; `writing` declares `index.md`.
   *
   * **Declared rather than guessed**, because a checker that accepts
   * either basename cannot report a missing one.
   */
  readonly folderReadme?: string;
  readonly parameters?: readonly ParameterDecl[];
  readonly scaffolds?: readonly ScaffoldDecl[];
  /**
   * SEC (C-12). Applied-path prefixes, each ending `/`, inside which a
   * step may set `executable: true`. Absent or empty ⇒ the pack ships no
   * executable — **which is every v1.0 pack** since Q-82 moved the two
   * backend kits out.
   */
  readonly executableRoots?: readonly string[];
  readonly provenance?: Provenance | string;
}

/**
 * **The five boolean-typed fields, and the list is closed.**
 *
 * Two live on `RecipeStep` and are declared with the recipe; three are
 * here. The enumeration exists because of **C-34**: `executable` gates
 * C-12 and `notASecret` disables C-15's credential ban, both sat outside
 * a closed list, and **`"false"` is truthy in JavaScript** — so a typo
 * made two security gates fail **open**.
 *
 * **Adding a boolean field adds it here in the same change.** A field
 * typed boolean and absent from this list is a spec defect, not a
 * permissive case.
 */
export const BOOLEAN_TYPED_FIELDS = [
  'RecipeStep.executable',
  'RecipeStep.adaptExpected',
  'RecipeStep.fillExpected',
  'ParameterDecl.required',
  'ParameterDecl.notASecret',
] as const;
