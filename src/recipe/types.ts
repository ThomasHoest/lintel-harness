/**
 * The recipe's **closed** type. T-0401, US-31.
 *
 * ── Why closed is the whole feature ───────────────────────────────────
 *
 * *"No pack can do something the format did not anticipate."* A pack is
 * arbitrary content shipped into somebody's repository, and the argument
 * that makes that safe is not that the CLI is careful — it is that the
 * **vocabulary is finite and inspectable**. `pack info` renders the
 * complete list of what an apply will do, and that rendering is only a
 * control while the list is over a set a reader can hold in their head.
 *
 * So: **six arms, no seventh, and no escape hatch.** There is no `exec`,
 * no `script`, no `shell`, no `run`. That absence is a shipping property
 * of the product, not an unimplemented feature — adding a primitive is a
 * change here, in `ops/index.ts`, **and in a superseding ADR**.
 *
 * **`merge-json` is deleted, not disabled** (Q-54). It was a seventh
 * primitive taking `from`, `to` and `ownedKeys`, and it was the only one
 * that read its destination's existing content — which is why removing it
 * makes §NFR's determinism sentence and §F1.8's recomputation identity
 * true **without qualification**. An `op` of `"merge-json"` is
 * `E-RECIPE-PRIMITIVE-UNKNOWN` like any other unrecognised value.
 *
 * ── Two fields on every arm, and why they are not one field ───────────
 *
 * `adaptExpected` says *something else will rewrite this* — the skill
 * adapting a generated `CLAUDE.md`. `fillExpected` says *this shipped
 * incomplete, and the person who applied it is expected to finish it* —
 * `project-brief.md` in every pack. They are **mutually exclusive on one
 * step**: a file is either the skill's to adapt or the user's to fill,
 * and a step claiming both has not decided which.
 *
 * Both are **JSON booleans** and two of US-1's five boolean-typed fields,
 * so `"true"` as a string is `E-UNKNOWN-VALUE`, exit 2 — no coercion, no
 * truthiness. For `fillExpected` a non-boolean does more than mis-report a
 * state: it silently disarms the prohibition that stops `update`
 * overwriting a filled `project-brief.md`.
 */

/**
 * The six, in the order §F1.2 tabulates them.
 *
 * **Matched literally** (C-25): no trimming, no case folding, no Unicode
 * normalization. `"copy "`, `"Copy"` and `"ｃｏｐｙ"` are each unknown —
 * *a parser that trims is a parser that accepts a step a reviewer read as
 * invalid.*
 */
export const RECIPE_OPS = [
  'copy',
  'rename',
  'strip-suffix',
  'rewrite-path',
  'substitute',
  'generate',
] as const;

export type RecipeOp = (typeof RECIPE_OPS)[number];

/**
 * Placing primitives create applied paths; editing primitives change
 * bytes at paths that already exist.
 *
 * The split is load-bearing twice over. **`E-MAP-COLLISION` is computed
 * over the placing set only** — a `substitute` whose `in` matches a path
 * an earlier `copy` placed is legitimate and is the shape every v1.0 pack
 * uses, so widening the rule to "two steps have the path in their write
 * sets" breaks all three bundled packs. And the **edit-before-place**
 * check needs to know which is which: a recipe that edits before it places
 * fails validation rather than silently doing nothing.
 */
export const PLACING_OPS = ['copy', 'rename', 'strip-suffix', 'generate'] as const;
export const EDITING_OPS = ['rewrite-path', 'substitute'] as const;

export type PlacingOp = (typeof PLACING_OPS)[number];
export type EditingOp = (typeof EDITING_OPS)[number];

/**
 * `"when": { "<paramId>": "<value>" }` — **single equality only**.
 *
 * No boolean operators, no negation, no multiple keys. A compound `when`
 * is `E-RECIPE-STEP-INVALID`. The restriction is what keeps the rendered
 * plan readable: `pack info` must be able to say *this step runs when X is
 * Y*, in those words, for every step.
 */
export type StepWhen = Readonly<Record<string, string>>;

/** Fields every arm carries. Optional on all six, defaulting to `false`. */
interface StepCommon {
  readonly when?: StepWhen;
  /** Q-56. Read by **one** consumer, `verify`. Inert to the apply. */
  readonly adaptExpected?: boolean;
  /** Q-79. Two consumers: `verify`'s report state, and `update`'s
   *  **absolute prohibition** on overwriting the path. */
  readonly fillExpected?: boolean;
}

/** Payload file or directory → applied path(s), basenames unchanged. */
export interface CopyStep extends StepCommon {
  readonly op: 'copy';
  readonly from: string;
  readonly to: string;
  /** Globs **relative to `from`**, not to the pack root. */
  readonly exclude?: readonly string[];
  /** SEC (C-12). Obeys `executableRoots`; no v1.0 pack declares it. */
  readonly executable?: boolean;
}

/** Payload **file** → one applied path, basename may differ. */
export interface RenameStep extends StepCommon {
  readonly op: 'rename';
  readonly from: string;
  readonly to: string;
}

/** Payload file or directory → applied path(s) with `<suffix>` dropped
 *  from the basename. This is what turns `tone-of-voice.template.md` into
 *  `tone-of-voice.md` — step 4 of the manual apply. */
export interface StripSuffixStep extends StepCommon {
  readonly op: 'strip-suffix';
  readonly from: string;
  readonly to: string;
  /** `^\.[a-z0-9-]{1,16}$`, and at least one selected basename must
   *  carry it — a suffix nothing has is an authoring mistake. */
  readonly suffix: string;
  readonly exclude?: readonly string[];
  readonly executable?: boolean;
}

/**
 * Applied text files already written → the same files, in place.
 *
 * **Has no `to`**, which is exactly why the write set exists as a named
 * concept: a destination rule quantified over `to` exempts this primitive
 * and `substitute` silently, and that is how two rules lapsed while
 * remaining literally true of the text they were written about (C-19).
 */
export interface RewritePathStep extends StepCommon {
  readonly op: 'rewrite-path';
  /** SEC (C-27). Resolves **only** against the plan's ordered written-set
   *  — never the filesystem, the payload or the project. */
  readonly in: readonly string[];
  readonly find: string;
  readonly replace: string;
}

/** Applied text files already written → the same files, in place, with
 *  `{{harness:…}}` tokens resolved. Also has no `to`. */
export interface SubstituteStep extends StepCommon {
  readonly op: 'substitute';
  /** SEC (C-27). The **identical** rule `rewrite-path`'s `in` gets, and
   *  the identical denylist re-check — deliberately word-for-word,
   *  because through v2.2 this one was weaker and rested on a single
   *  table cell. */
  readonly in: readonly string[];
  readonly tokens?: Readonly<Record<string, string>>;
}

/** Payload template → one applied path, substituted, anchors asserted.
 *  This is the step that produces `CLAUDE.md`, and all three v1.0 packs
 *  declare `"adaptExpected": true` on it (Q-56, Q-61). */
export interface GenerateStep extends StepCommon {
  readonly op: 'generate';
  /** C-38: `generate`'s source field. It gets the same existence check
   *  `from` gets on the other five — through v2.3 the commonest authoring
   *  mistake on this primitive had no named code. */
  readonly template: string;
  readonly to: string;
  /** Inert region anchors (Q-45). Each must appear **exactly once** and
   *  be balanced; there is no parser and no tamper detection. */
  readonly anchors: readonly string[];
}

/** The closed six-arm union. Every step narrows to exactly one arm or is
 *  rejected — the validator is total, and fails closed. */
export type RecipeStep =
  | CopyStep
  | RenameStep
  | StripSuffixStep
  | RewritePathStep
  | SubstituteStep
  | GenerateStep;

export interface Recipe {
  /** C-24. One of US-1's six behaviour-selecting positions. Before v2.3
   *  the recipe declared a version **no rule checked**, which is
   *  fail-*open* in the one position the closed-enumeration rule exists to
   *  close. Greater than supported is `E-RECIPE-FORMAT-NEWER`. */
  readonly formatVersion: number;
  readonly steps: readonly RecipeStep[];
  /** Scaffold id → its ordered steps. Must agree with `pack.json`'s
   *  `scaffolds` in **both** directions (`E-RECIPE-STEP-INVALID`). */
  readonly scaffolds?: Readonly<Record<string, readonly RecipeStep[]>>;
}

/** The recipe-format version this CLI understands. Distinct from
 *  `pack.json`'s: two files, two version axes, two codes, because a user
 *  told to upgrade needs to know **which** declaration was newer. */
export const SUPPORTED_RECIPE_FORMAT_VERSION = 1;

/**
 * C-30. The total declared step count, base plus **every** declared
 * scaffold, counted **before** any `when` filtering.
 *
 * **An inspectability control, not a DoS control**, and the distinction
 * decides its value: there is no remote attacker here, and
 * `E-PAYLOAD-TOO-LARGE` already bounds the bytes. What it protects is the
 * argument this whole model rests on — a script primitive was rejected on
 * the ground that `pack info` renders the *complete* list of what an apply
 * will do, so that rendering **is** the control, and an unbounded list
 * degrades it continuously while naming no point at which a reviewer
 * should stop trusting it.
 *
 * **Raisable only by a superseding ADR** — not by a flag, an environment
 * variable or a `pack.json` key.
 */
export const MAX_RECIPE_STEPS = 256;

/** Required fields per arm, and the optional ones each accepts. The
 *  validator reads this rather than restating it six times — a table and
 *  a switch that must agree is a table and a switch that will not. */
export const STEP_FIELDS: Readonly<
  Record<RecipeOp, { readonly required: readonly string[]; readonly optional: readonly string[] }>
> = {
  copy: { required: ['from', 'to'], optional: ['exclude', 'executable'] },
  rename: { required: ['from', 'to'], optional: [] },
  'strip-suffix': { required: ['from', 'to', 'suffix'], optional: ['exclude', 'executable'] },
  'rewrite-path': { required: ['in', 'find', 'replace'], optional: [] },
  substitute: { required: ['in'], optional: ['tokens'] },
  generate: { required: ['template', 'to', 'anchors'], optional: [] },
};

/** Accepted on every arm, in addition to the per-op fields above. */
export const COMMON_STEP_FIELDS = ['op', 'when', 'adaptExpected', 'fillExpected'] as const;

/** US-1's boolean-typed fields that live on a step. Named so the
 *  validator and `BOOLEAN_TYPED_FIELDS` in `pack/types.ts` cannot drift
 *  apart about which fields refuse coercion. */
export const STEP_BOOLEAN_FIELDS = ['executable', 'adaptExpected', 'fillExpected'] as const;

export const isPlacing = (op: RecipeOp): op is PlacingOp =>
  (PLACING_OPS as readonly string[]).includes(op);

export const isEditing = (op: RecipeOp): op is EditingOp =>
  (EDITING_OPS as readonly string[]).includes(op);
