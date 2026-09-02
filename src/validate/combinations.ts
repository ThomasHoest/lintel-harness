/**
 * The per-parameter-combination sweep: plans, renders, and the 32 cap.
 * T-0902.
 *
 * ── What a "combination" is, and what it is not ───────────────────────
 *
 * `pack/parameters.ts` already decides the **domains**: a parameter's
 * domain is the set of answers *the recipe can tell apart*, which is what
 * makes a `string` finite. This module does the other half — it turns each
 * combination into a **plan** and then into **rendered bytes**, which is
 * what US-16 step 11 is quantified over.
 *
 * ── The write set is planned once per combination, not once per pack ──
 *
 * US-16 says the write set is computed *"exactly once, immediately after
 * step 5"*. Read as *one set for the whole pack, merged across `when`
 * branches*, it is wrong on a shipping pack: `planning`'s two
 * `calibrations/<floor>/` copies write the **same three applied paths**
 * under mutually exclusive `when` clauses, so a merged set reports three
 * `E-MAP-COLLISION`s against a correct pack — the same false finding
 * `checkScaffoldCollisions` avoids by skipping same-category pairs.
 *
 * So the sweep plans **each combination**, and the runner consumes the
 * **union** of those plans' write sets at steps 6, 7 and 8 (path grammar
 * and the denylist are per-path facts and identical in every combination,
 * so the union answers them exactly). Collision, ordering and
 * `in`-matches-nothing are per-combination facts and are reported from the
 * plan that found them, de-duplicated. §Spec gap in the runner's header
 * records that US-16's sentence does not say this.
 *
 * ── Representative answers, and why one is needed at all ──────────────
 *
 * Step 11 **renders**, and rendering resolves `{{harness:param.<id>}}`.
 * `coding` and `writing` declare `required` substitution parameters that
 * no `when` names, so they are in **no** combination axis and yet must
 * hold a value or every render fails `E-SUBST-UNRESOLVED`. F1 names no
 * source for that value. This module synthesises one from a short ladder
 * of candidates, the parameter's own **id** first, and takes the first
 * that satisfies the declaration. **A pack whose `pattern` rejects every
 * candidate cannot be rendered by `validate`** — recorded as a gap rather
 * than papered over, because the alternative is a validator that invents
 * an answer the declaration forbids.
 */
import { DiagnosticBag } from '../diag/diagnostic.js';
import { checkAnswer, combinations, resolveAnswers, type Answer, type WhenValues } from '../pack/parameters.js';
import { parametersFor } from '../pack/scaffolds.js';
import { planSteps, type Plan, type PlannedStep } from '../recipe/plan-steps.js';
import { OPS, renderStep } from '../recipe/ops/index.js';
import { isPlacing, type Recipe, type RecipeStep, type StepWhen } from '../recipe/types.js';
import type { AppliedPath } from '../security/confine.js';
import type { FileMode, Substitution } from '../recipe/render.js';
import type { PackJson, ParameterDecl, ScaffoldDecl } from '../pack/types.js';

/* ── the declared plan, before any `when` filtering ──────────────────── */

/**
 * One declared step with the identity `pack info` prints it under.
 *
 * The index is the position in the **merged declared** list — base steps
 * then each scaffold's in `pack.json` order — and **not** `PlannedStep`'s,
 * which is a position in a `when`-filtered plan and therefore moves
 * between combinations. `pack info` promises "every step, in order"; a
 * number that changes with an answer is not that.
 */
export interface DeclaredStep {
  readonly index: number;
  readonly step: RecipeStep;
  /** The scaffold that declared it, or `null` for a base step. */
  readonly scaffold: string | null;
}

/** Base steps, then each declared scaffold's, in `pack.json` order. */
export function declaredSteps(pack: PackJson, recipe: Recipe): readonly DeclaredStep[] {
  const out: DeclaredStep[] = [];
  for (const step of recipe.steps) out.push({ index: out.length, step, scaffold: null });
  for (const s of pack.scaffolds ?? []) {
    for (const step of recipe.scaffolds?.[s.id] ?? []) {
      out.push({ index: out.length, step, scaffold: s.id });
    }
  }
  return out;
}

/**
 * Parameter id → the distinct values some `when` compares it against.
 *
 * Over **every** declared step including unselected scaffolds': a
 * parameter is combination-varying because the *recipe* branches on it,
 * and whether a user selected the scaffold carrying the branch is a
 * different question from whether the pack validates.
 */
export function whenValues(pack: PackJson, recipe: Recipe): WhenValues {
  const out = new Map<string, Set<string>>();
  for (const { step } of declaredSteps(pack, recipe)) {
    if (step.when === undefined) continue;
    for (const [id, value] of Object.entries(step.when)) {
      const set = out.get(id) ?? new Set<string>();
      set.add(value);
      out.set(id, set);
    }
  }
  return out;
}

/* ── representative answers ──────────────────────────────────────────── */

/**
 * The candidate ladder for a parameter no combination axis covers.
 *
 * The **id** leads it deliberately: it is the one string guaranteed to be
 * meaningful in the output a reader inspects, and every v1.0 pack's
 * `pattern` admits it. The rest are fallbacks, ordered from most to least
 * likely to satisfy a narrow pattern. `''` is last and is admitted only by
 * a pattern whose lower bound is zero.
 */
const CANDIDATES = (id: string): readonly string[] => [id, 'example', 'x', '1', '0', ''];

/**
 * A value satisfying `decl`, or `null` when the ladder cannot produce one.
 *
 * `null` is not a silent skip: the caller leaves the parameter unanswered,
 * and the render then reports `E-SUBST-UNRESOLVED` at the token that
 * needed it — which is a loud, locatable statement of the gap rather than
 * a rendered document containing a value the pack forbids.
 */
export function representativeAnswer(
  decl: ParameterDecl,
  exclude: ReadonlySet<string> = new Set(),
): Answer | null {
  if (decl.type === 'boolean') return false;
  if (decl.type === 'enum') {
    const first = (decl.values ?? []).find((v) => !exclude.has(v));
    return first ?? null;
  }
  for (const candidate of CANDIDATES(decl.id)) {
    if (exclude.has(candidate)) continue;
    if (checkAnswer(decl, candidate, 'collection').length === 0) return candidate;
  }
  return null;
}

/** One combination: its axis, the full answer set, and its label. */
export interface Combination {
  /** The axis values, as `combinations()` produced them. `null` is the
   *  *"matches no `when` value"* sentinel and is deliberately not a
   *  string — no string can be trusted not to collide with one. */
  readonly axis: ReadonlyMap<string, Answer | null>;
  /** Every declared parameter's answer: representatives, with the axis
   *  values overlaid. What the render actually resolves against. */
  readonly answers: ReadonlyMap<string, Answer>;
  /** For `W-FOLDER-README-MISSING`'s `combination:` line. */
  readonly label: string;
}

/** The label a diagnostic names a combination by. Sorted by id so two
 *  runs of one pack name the same combination the same way. */
export function labelOf(axis: ReadonlyMap<string, Answer | null>): string {
  const parts = [...axis.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([id, v]) => `${id}=${v === null ? '(any other value)' : String(v)}`);
  return parts.length === 0 ? '(no conditional parameters)' : parts.join(' ');
}

/**
 * Fill a combination out into a full answer set.
 *
 * Representatives first, axis values second — so an axis value always
 * wins, and a parameter that is *both* substituted and branched on gets
 * the branch's value rather than a representative that would select a
 * different step than the combination claims to be about.
 */
export function answersFor(
  params: readonly ParameterDecl[],
  axis: ReadonlyMap<string, Answer | null>,
  when: WhenValues,
): ReadonlyMap<string, Answer> {
  const supplied = new Map<string, Answer>();

  for (const p of params) {
    const axisValue = axis.get(p.id);
    if (axisValue !== undefined && axisValue !== null) {
      supplied.set(p.id, axisValue);
      continue;
    }
    // Either the parameter is on no axis, or it is on one at the `null`
    // sentinel — *"an answer matching no `when` value"*. Both want a
    // representative; only the second has anything to exclude.
    const exclude = axisValue === null ? (when.get(p.id) ?? new Set<string>()) : new Set<string>();
    const value = representativeAnswer(p, exclude);
    if (value !== null) supplied.set(p.id, value);
  }

  // Through `resolveAnswers` rather than used directly, so a representative
  // is checked by the same code an init-time answer is, and so declared
  // defaults are recorded exactly as an apply would record them.
  return resolveAnswers(params, supplied).answers;
}

/* ── planning every combination ──────────────────────────────────────── */

export interface CombinationPlan {
  readonly combination: Combination;
  readonly plan: Plan;
}

export interface PlanCombinationsInput {
  readonly pack: PackJson;
  readonly recipe: Recipe;
  /** Pack-relative POSIX paths of every payload **file**. */
  readonly payload: readonly string[];
}

export interface PlanCombinationsResult {
  readonly plans: readonly CombinationPlan[];
  /** What US-8 requires printed, and what `pack info` reports. */
  readonly count: number;
  /** `E-PARAM-COMBINATORICS` only. Per-plan diagnostics stay on the plan,
   *  because the runner routes them into US-16's numbered steps. */
  readonly bag: DiagnosticBag;
}

/**
 * Plan every combination.
 *
 * **Every declared scaffold is selected**, because `validate` is checking
 * the pack rather than an apply: a scaffold's steps that no plan contained
 * would escape steps 5–8 entirely. Same-category alternatives would
 * collide under that selection, which is why `checkScaffoldCollisions`
 * exists and skips exactly those pairs — but the *plan* does not know to,
 * so a pack declaring same-category alternatives that write one path would
 * report `E-MAP-COLLISION` here as well. No v1.0 pack declares such a pair
 * (Q-82 left `writing-workstream` the only scaffold in the product), and
 * US-16 specifies no scaffold sweep to fix it. Recorded, not invented.
 */
export function planCombinations(input: PlanCombinationsInput): PlanCombinationsResult {
  const { pack, recipe, payload } = input;
  const when = whenValues(pack, recipe);
  const selected: readonly ScaffoldDecl[] = pack.scaffolds ?? [];
  const params = parametersFor(pack, selected);

  const { combos, bag } = combinations(pack, when);

  // The cap already refused; render one representative plan anyway so
  // steps 5–10 still report. A pack over the cap is exit 2 regardless, and
  // reporting *only* the cap would hide every other fault behind it.
  const axes: readonly ReadonlyMap<string, Answer | null>[] =
    combos.length > 0 ? combos : [new Map<string, Answer | null>()];

  const plans = axes.map((axis) => {
    const answers = answersFor(params, axis, when);
    const combination: Combination = { axis, answers, label: labelOf(axis) };
    return {
      combination,
      plan: planSteps({ pack, recipe, selected, answers, payload }),
    };
  });

  return { plans, count: combos.length, bag };
}

/* ── rendering one combination ───────────────────────────────────────── */

/** One applied path as the render left it: final bytes, final mode. */
export interface RenderedWrite {
  readonly path: AppliedPath;
  readonly bytes: Buffer;
  readonly mode: FileMode;
  /** The payload path the bytes came from, or `null` for a step with no
   *  source field. `buildDisclosure`'s row 1 needs it. */
  readonly from: string | null;
}

export interface CombinationRender {
  readonly combination: Combination;
  readonly plan: Plan;
  /** Final state per applied path, in the order the paths were first
   *  placed. Editing steps replace bytes in place; they never reorder. */
  readonly writes: readonly RenderedWrite[];
  readonly substitutions: readonly Substitution[];
  readonly bag: DiagnosticBag;
}

export interface RenderCombinationInput {
  readonly packName: string;
  readonly packVersion: string;
  readonly cliVersion: string;
  readonly payload: readonly string[];
  readonly readPayload: (packRelativePath: string) => Buffer | null;
}

/**
 * Render one combination's plan to bytes.
 *
 * **The mode is taken from placing steps only.** `rewrite-path` and
 * `substitute` return `0o644` on every write because they have no
 * `executable` field to read; letting their result set the mode would
 * silently demote a `0755` file the moment a later step edited it, and the
 * demotion would be invisible in the disclosure that is supposed to name
 * every executable.
 */
export function renderCombination(
  planned: CombinationPlan,
  input: RenderCombinationInput,
): CombinationRender {
  const bag = new DiagnosticBag();
  const written = new Map<AppliedPath, Buffer>();
  const modes = new Map<AppliedPath, FileMode>();
  const sources = new Map<AppliedPath, string | null>();
  const order: AppliedPath[] = [];
  const substitutions: Substitution[] = [];

  for (const step of planned.plan.steps) {
    const result = renderStep(step.step, step.writeSet, {
      index: step.index,
      payload: input.payload,
      readPayload: input.readPayload,
      written,
      answers: planned.combination.answers,
      packName: input.packName,
      packVersion: input.packVersion,
      cliVersion: input.cliVersion,
    });

    for (const d of result.bag.items) bag.push(d);
    for (const s of result.substitutions) substitutions.push(s);

    const placing = isPlacing(step.step.op);
    for (const w of result.writes) {
      if (!written.has(w.path)) order.push(w.path);
      written.set(w.path, w.bytes);
      if (placing) {
        modes.set(w.path, w.mode);
        sources.set(w.path, sourceOf(step));
      }
    }
  }

  const writes = order.map((path) => ({
    path,
    bytes: written.get(path) as Buffer,
    mode: modes.get(path) ?? (0o644 as FileMode),
    from: sources.get(path) ?? null,
  }));

  return { combination: planned.combination, plan: planned.plan, writes, substitutions, bag };
}

/** The step's payload source, through the op registry rather than by
 *  naming `from` — `generate`'s source field is `template`, and a rule
 *  written over the word `from` exempts it (C-38). */
function sourceOf(planned: PlannedStep): string | null {
  const field = OPS[planned.step.op].sourceField;
  return field === null ? null : ((planned.step as unknown as Record<string, string>)[field] ?? null);
}

/* ── parameterVaryingSteps ───────────────────────────────────────────── */

/**
 * The steps whose inclusion depends on an answer, with what each writes.
 *
 * **This is how a reader sees what `--calibration high-floor` changes
 * without running it** (US-29), so `writes` has to come from a plan that
 * actually contains the step — a conditional step's write set is empty in
 * every combination that filters it out, and reporting that emptiness
 * would answer the question with "nothing".
 */
export interface VaryingStep {
  readonly index: number;
  readonly when: StepWhen;
  readonly writes: readonly string[];
}

export function parameterVaryingSteps(
  declared: readonly DeclaredStep[],
  plans: readonly CombinationPlan[],
): readonly VaryingStep[] {
  const out: VaryingStep[] = [];
  for (const d of declared) {
    if (d.step.when === undefined) continue;
    let writes: readonly string[] = [];
    for (const { plan } of plans) {
      const found = plan.steps.find((s) => s.step === d.step);
      if (found !== undefined) {
        writes = found.writeSet;
        break;
      }
    }
    out.push({ index: d.index, when: d.step.when, writes });
  }
  return out;
}
