# ADR-002 — Template packs: a pack-authoring contract, three deliberately unequal packs, and a specification the packs have overtaken

**Status:** Accepted — **re-issued 2026-09-01 against F5 v3.1; see §9. Standing verdict: `PROCEED` with two conditions.**
**Date:** 2026-09-01
**Deciders:** `architect` (this ADR) · escalations to Thomas Andersen
**Refs:** `F5-spec-template-packs.md` **v2.9** · `F1-spec-pack-format-and-manifest.md` **v2.9** (**authoritative for the format**) · `F1-ADR-001-pack-format-and-manifest.md` · `specifications/general/pack-application.md` (**authoritative** — the two-phase model) · `specifications/general/pack-inventory.md` · `specifications/project-brief.md` §12 (Q-1…Q-63, all resolved; **Q-64 reserved**) · `packs/coding/`, `packs/writing/`, `packs/planning/` (the three built packs) · `packs/coding/specifications/adr-feature.template.md`

**Template deviation, declared.** This is a feature-scoped ADR
(`adr-feature.template.md`) that additionally carries the **file-level
plan** and **public interface contract** sections of
`adr-epic.template.md`, on the same grounds ADR-001 declared: F1, F2 and
F6 all compile against what a pack must contain, so the shape is locked
here or each of them infers its own. **F5 is a content feature and has no
TypeScript modules**, so both sections are adapted rather than forced:
the file-level plan is the **pack tree** each pack must present, and the
interface contract is the **`pack.json` / `recipe.json` contract** each
pack must satisfy. Nothing about them is a code plan, and inventing one
would be worse than adapting the section.

---

## 0. A note on order — read this before §1, because the process ran backwards

**This ADR arrives after the thing it governs was built.** F5 reached
v2.9 and its three packs were authored — `packs/coding` (54 files),
`packs/writing` (32), `packs/planning` (48), each with a complete
`pack.json` and `recipe.json` — while F5's ADR field still read
`{{F5-ADR-NNN-template-packs.md — filled in by the architect after this
spec is reviewed}}`. The architecture gate was skipped, not deferred.

That is worth stating plainly rather than smoothing over, because it
changes what this document can honestly do and what a reader should
expect of it:

- **An ADR written before the content would have constrained it.** This
  one can only **lock what the packs already embody** and say where the
  packs and the spec have come apart. Every decision in §1 is therefore
  a *ratification with reasons* — the reasons are real and several
  decisions could have gone the other way, but none of them is a
  prediction.
- **It is not a rubber stamp, and §6 is the section that matters.**
  Where the built packs made a decision the spec never sanctioned, that
  is recorded as a conflict with a named side judged correct. **In six
  places the packs are right and F5 is wrong; in three places F5 is right
  and the packs are short; in the remainder the specifications disagree
  with each other, with a general document, or with F1 — which wins by
  F5's own scope rule.**
- **The verdict in §8 is not `PROCEED`.** A specification whose
  faithfulness enumeration does not describe the migration that actually
  happened, and whose §Scope still defers a command Q-62 returned to
  v1.0, will mislead the implementer who compiles against it. The packs
  are in better shape than the document that describes them, which is
  the characteristic failure of building before the gate.

One consequence for the reader of §6: **"the packs are right" is not a
licence.** Where the built content is judged correct, the fix is a spec
change, not silence — and where the spec is judged correct, the fix is
pack work this ADR names and does not perform. This ADR edits nothing
under `packs/`.

---

## 1. Decision

**A pack is nine declared parts of payload plus one declared procedure
over it, and nothing else.** Five things are settled here and are as much
part of the frozen contract as F1's primitive set:

1. **The payload is the pack; the recipe is the only route out of it.**
   The nine-part anatomy declares what the pack **keeps**, in
   payload-relative globs. The recipe declares what an apply
   **produces**. They are different namespaces and are never matched
   against each other. A part may be `present` and reach no applied path.
2. **Anatomy honesty is the completeness contract, and it is mechanical
   where it can be.** `status` omitted means `present`; a part with no
   content is `absent` **with a reason**; a part inferred rather than
   sourced is `provisional` **with a note**. Two parts may share a source
   file, but shared sourcing may never stand in for content that does not
   exist. At v1.0 the counts are exactly **two `absent`** (`writing` 8
   and 9) and **one `provisional`** (`planning` 2), and any change to
   them is a spec change.
3. **The three packs are deliberately unequal, and each inequality is
   declared, not incidental.** `writing` declares `folderReadme:
   "index.md"` because it already had that shape; `planning` is the only
   pack whose recipe carries a `when` over an **answer**, the only pack
   with a `provisional` part, and the only pack shipping an inert hook
   script; `coding` is the only pack with scaffolds and the only pack
   declaring `executableRoots`. **Parameters are not one of these
   asymmetries** — all three packs declare parameters (§6.2).
4. **Migration fidelity is a bounded set of declared difference classes,
   and the set must be widened to the migration that happened.** `coding`
   and `writing` are faithful migrations under Q-6; `planning` is
   authored under Q-29. What "faithful" permits is locked in §1's
   interface contract and §6.1 — **US-24's current five classes do not
   cover the shipped `coding` pack**, and the enumeration is the thing
   that has to move.
5. **A pack's forward-looking declarations are per-path and minimal.**
   Exactly one applied path per pack is `adaptExpected` — the generated
   `CLAUDE.md`, on the `generate` step — and no other. `provenance` is
   required content of every bundled pack even though F1 makes the field
   optional.

### File-level plan — adapted: the pack tree each pack must present

There are no TypeScript modules in F5. The equivalent artefact is the
**pack tree**: the directories and files a pack must contain for its
declarations to resolve. These are locked; a pack that omits a row cannot
satisfy its own `pack.json`.

**Universal — required of every pack, no exceptions:**

| Path | Why it is required |
|---|---|
| `pack.json` | Identity, anatomy, parameters, scaffolds (F1 US-1) |
| `recipe.json` | Phase 2. `pack.json.recipe` defaults to this name (F1 US-1) |
| `README.md` | US-28's one page. **Nine parts, gaps, produced-tree block, version, `minCliVersion`, self-contained statement** |
| `CLAUDE.md.template` | The `generate` step's template, carrying that pack's anchor pairs literally |

**`packs/coding/` — 54 files. Migrated from `template/` at commit
`9b22908`** (the commit is identified in §6.1; no record names it today):

| Path | Contents | Notes |
|---|---|---|
| `agents/` | 11 files — 10 agents + `README.md` | The README stays in the payload; the recipe excludes it |
| `agent-teams/` | 3 — `Specify.md`, `Implement.md`, `README.md` | Applies to `AgentTeams/`; the README stays behind |
| `specifications/` | 15 — process `README.md`, `conventions.md`, 11 `*.template.md`, `README.template.md`, `project-brief.template.md` | Only the last two are copied out |
| `targets/` | 3 — `README.md`, `Run.md`, `target.template.md` | Only `Run.md` is copied out |
| `copy/` | 1 — `tone-of-voice.template.md` | Strip-suffixed out |
| `commands/` | 1 — `target.md` | New location; the source kept it in the repo's `.claude/` |
| `applied-readmes/` | **6** — five unconditional, plus `infrastructure.md` placed from **inside each backend scaffold** | Q-60. There is **no seventh**; `.harness/` is excluded |
| `scaffolds/backend-azure/` | 7 `*.template` files | Migrated from `infrastructure/backend-deploy/` |
| `scaffolds/backend-aws/` | 5 `*.template` files | **Authored**, not migrated (Q-8a) |

**`packs/writing/` — 32 files. Extracted from
`AIImpactOnOrganizationsAndLeadership/`:**

| Path | Contents | Notes |
|---|---|---|
| `agents/` | 8 agents, no README | All eight are copied out |
| `writing-guide/` | 4 — `README`, `tone-of-voice`, `ai-tells`, `bilingual-publishing`, all `.template.md` | Four files under their existing names (Q-51); all four strip-suffixed out |
| `templates/` | 4 — `post`, `index`, `home`, `project-brief` | `post` is the one real document template; the other three are recipe scaffolding (§6.4) |
| `scaffolds/writing-workstream/` | 12 pre-authored `index.md` files across the corpus and one starter workstream | **Copied wholesale**, not rendered per-folder (§6.5) |

**`packs/planning/` — 48 files. Authored (Q-29):**

| Path | Contents | Notes |
|---|---|---|
| `agents/` | 8 — 6 provisional roles + `target-reviewer.md` + `README.md` | The six roles are part 2's `provisional` set; `target-reviewer` is part 9 and is **not** provisional |
| `process.md`, `conventions.md`, `coordination.md` | 3 | Anatomy parts 1, 4 and 5. **F5's payload inventory omits all three** (§6.9) |
| `templates/` | 5 — 4 portfolio templates + `project-brief.template.md` | Only the brief is rendered out |
| `calibrations/{high-floor,near-zero-floor}/` | 3 files each | The only `when`-gated content in any pack |
| `calibration.template.md`, `portfolio-seed/` | 1 + 2 | The calibration record and the portfolio skeleton |
| `commands/` | 4 — `bet`, `review`, `horizon`, `target` | The first three are part 8; `target.md` is part 9 |
| `targets/` | 3 | `planning`'s **own copy** of the contract (Q-49) |
| `applied-readmes/` | **11** — `portfolio`, `portfolio-bets`, `targets`, `background`, and one per `background/` subfolder | All eleven placed unconditionally |
| `hooks/kill-criteria-guard.sh` | 1 | Ships **inert at `0644`**, registered by nothing |

### Public interface contract — adapted: what each pack must declare

F1 owns both schemas. What is locked **here** is the *pack-authoring*
contract on top of them: which optional fields F5 makes mandatory, and
which declarations must agree with which content.

**`pack.json` — the F5 obligations beyond F1's schema:**

| Field | F1 says | **F5 requires** |
|---|---|---|
| `anatomy` | Nine keys; `status` defaults to `present`; a content source is `paths` **or** `declaredBy: "recipe"` (the latter valid **only** for `folderScaffolding`) | All nine declared. **Every pack uses `declaredBy: "recipe"` for part 7**, because part 7's shape *is* the recipe's destination set. `status` may be omitted where the value is `present`; F5 §NFR's "declare … with `status`" should read **"resolve to"** |
| `folderReadme` | Optional, one path segment, default `README.md`, **declared never sniffed** | `writing` declares `"index.md"`; `coding` and `planning` omit it. A pack whose folder convention is not `README.md` **must** declare it — a check that accepted either basename could not report a missing one |
| `provenance` | **Optional.** String ≤ 200 chars or an object of such strings; declared data, nothing interprets it | **Mandatory for every bundled pack.** F5 §NFR *Provenance* is the binding rule and F1 defined the field expressly to satisfy it. **Two of three packs omit it today** (§6.3) |
| `executableRoots` | Optional array of applied-path prefixes; absent means the pack ships no executable | Only `coding` declares one — `["infrastructure/backend-deploy/"]`. `writing` and `planning` declare none and ship none |
| `parameters` | Optional; three types (`string`, `enum`, `boolean`); a `string` **requires** `pattern` | **All three packs declare parameters.** Only `planning`'s selects *content* |
| `scaffolds` | `id`, `description`, optional `category`; **no `destination` key exists** | Same-category scaffolds are alternatives. `coding` declares two in `backend`; `writing` declares one in `workstream`; `planning` declares none |

**`recipe.json` — the F5 obligations:**

| Rule | Statement |
|---|---|
| **Branching** | Two mechanisms, and they are not the same one. A **scaffold** branch is an ordered array under `recipe.json`'s `scaffolds.<id>` object. A **parameter** branch is `"when": { "<paramId>": "<value>" }` on a step — single equality only, never compound, and **`when` never binds a scaffold** (§6.6) |
| **Step counts** | Two numbers exist per pack and both must be stated when either is: the **base `steps` array**, and the **declared total** across base plus **every** scaffold, which is the number F1's 256 bound counts and `pack info` prints. At v1.0: `coding` **15 / 21**, `writing` **7 / 12**, `planning` **23 / 23** |
| **Folder READMEs, same branch** | Every folder an apply creates receives the pack's declared `folderReadme` from a step in the **same branch** as whatever creates it — the same `when` value, or the same scaffold id. F1 US-16 step 12 evaluates **per parameter combination** over **proper** directory prefixes, so a recipe correct only for the union of its combinations does not pass |
| **`adaptExpected`** | Exactly one step per pack carries it — the `generate` step producing `CLAUDE.md` — and no other step in any pack does. It is per path, never a blanket suppression |
| **`generate` anchors** | Declared in the step (`coding` 6, `writing` 6, `planning` 7) and present as literal marker pairs in the template. **The array asserts; it does not emit** (§6.10) |
| **Substitution coverage** | Every payload file carrying a `{{harness:…}}` token must reach an applied path covered by a `substitute` step's `in` globs or by `generate`. All three packs satisfy this today; it is checked by `E-SUBST-UNRESOLVED` at US-16 step 11 |
| **Reference addressing** | A copied-out file that points at payload-resident reference material must address it as `.harness/pack/…`. **Two routes are sanctioned and each must be declared per file**: a `rewrite-path` step where a legacy literal exists, or authoring the destination form directly where the file is new. `coding` uses both and declares only the first (§6.1, Q-80) |

**Declared per pack, and this is the whole of the intended asymmetry:**

| | `coding` | `writing` | `planning` |
|---|---|---|---|
| `folderReadme` | *(default `README.md`)* | **`index.md`** | *(default)* |
| Scaffolds | 2, one category, alternatives | 1 | **none** |
| `executableRoots` | **1 root, 4 scripts at `0755`** | none | none |
| Parameters | 2 (`projectName`, `stack`) | 3 (`projectName`, `projectPurpose`, `authorName`) | 1 (`constraintFloor`, `enum`, `flag: calibration`) |
| Recipe `when` | 0 | 0 | **2** |
| `provisional` part | — | — | **part 2** |
| `absent` parts | — | **8 and 9** | — |
| Notices emitted | 0 | 0 | **2** (`W-ANATOMY-PROVISIONAL`, `W-HOOK-SCRIPT-INERT`) |
| Anchors | 6 | 6 | 7 |

---

## 2. Context

**Prior decisions and constraints:**

- **`F1-ADR-001` and F1 v2.9 own the format, and F5 says so itself.** F5
  §Scope: *"Where this spec and F1 could disagree, F1 wins."* Every
  schema question, every primitive, every path rule and the **only**
  error catalogue are F1's. This ADR cites codes and invents none.
- **Q-39/Q-41 — two phases.** Phase 1 copies the pack verbatim to
  `.harness/pack/`; phase 2 runs the recipe, **rendered entirely at plan
  time** (C-23). This is the organising fact of pack content: the payload
  half must be correct *as copied*, which is what Q-46's deletion of
  bootstrap prose bought.
- **Q-40 as narrowed by Q-54 — six primitives.** `merge-json` does not
  ship, so no pack writes `.claude/settings.json`, owns a settings key or
  ships a permission set. Confirmed on disk: no pack payload contains a
  settings file and no recipe names the primitive.
- **Q-50 — no folder is ever empty.** The rule is checked, not merely
  stated: F1 US-16 step 12 reports `W-FOLDER-README-MISSING`, a
  **`defect`**-class finding, per parameter combination.
- **Q-60 — `defect` / `notice`.** `--strict` promotes defects only; a
  notice is never fatal under any flag. This is what lets `planning` pass
  CI while still printing both of its by-design warnings on every run.
- **Q-56 / Q-61 — `adaptExpected` and three `generate` steps.** All three
  packs generate their `CLAUDE.md` and all three declare that one path
  adapt-expected, so `verify` reports it `adapted` and exits `0` after
  the F6 skill has run.
- **Q-6 / Q-29 — fidelity.** Q-6 forbids content change in a migration;
  Q-29 confirms that authoring `planning` is not a boundary violation.
  This ADR's hardest problem lives here: **the shipped `coding` pack
  contains content changes Q-6 forbids and US-24 does not enumerate.**
- **Q-62 — `update` and `status` return to v1.0.** `general/pack-application.md`
  carries this and F5 v2.9 asserts it *"needed no change for it"*. It
  did (§6.7).
- **Q-63 — the binary is `lintel`, `harness` is a command group.**
- **Questions.** Q-1…Q-63 resolved; **Q-64 is reserved**. This ADR opens
  **Q-80** (§7).

---

## 3. Options Considered

The live architectural choice in a content feature is **what a pack
author is obliged to declare**. Three positions were available.

### Option A — The anatomy is the contract; the recipe is a detail *(rejected)*

Treat `pack.json`'s nine parts as the whole of the pack-authoring
contract and leave `recipe.json` to F1's schema alone.

Advantages: one contract, and it is the one a human reads when choosing a
pack. Disadvantages: it is **false of every one of the three packs**.
Part 7 is declared `declaredBy: "recipe"` in all three, which means the
anatomy delegates a ninth of itself to the recipe and then claims to be
complete without it. Worse, the properties this feature most needs to
hold — the folder-README same-branch rule, one adapt-expected path per
pack, substitution coverage, two step-count numbers — are **all** recipe
properties invisible to the anatomy. Choosing A would have left F5 with
nothing to say about the half of a pack that decides whether an apply
works.

### Option B — Anatomy plus recipe, with F5 obligations layered on F1's optional fields *(chosen)*

Lock both files. Take F1's schema as the floor and add the obligations
F5 needs on top: `provenance` mandatory though F1 makes it optional;
`folderReadme` mandatory **where the convention differs** though F1
defaults it; `adaptExpected` confined to one path per pack though F1
permits it on every primitive; both step-count numbers stated wherever
either is.

Advantages: it is what the three packs already do, so ratifying it costs
nothing and locking it prevents the fourth pack from drifting. It keeps
the anatomy at **nine** keys — no tenth part, no F1 schema change, and
F5's counted NFRs stay checkable. It puts each obligation where the thing
it governs lives. Disadvantages: two contracts to hold in mind, and an
author can satisfy F1 while failing F5 — which is exactly the state
`coding` and `writing` are in over `provenance` today, and is an argument
for the split rather than against it, because the failure is *visible*.

### Option C — Recipe as a tenth anatomy part *(rejected)*

Advantages: one object, one enumeration. Disadvantages: F5 already
rejected this and the reasoning holds — F1 pins `anatomy` at exactly nine
keys, `status` has no meaningful value for a recipe (it can never be
`absent`; a pack without one cannot apply), and adding a tenth part would
force every counted NFR to special-case it. The recipe has its own schema
and its own five error codes; it does not need the anatomy's.

### Option D — Widen the primitive set so migrated packs need no content edits *(rejected)*

The concrete temptation: `coding` had to repoint three agent prompts at
`.harness/pack/…`, and a `rewrite-path` that could target payload files
before phase 1 would have avoided touching them.

Rejected on ADR-001's own grounds. Phase 1 copying **verbatim** is what
makes it unable to fail in an interesting way; a primitive that edits the
payload gives phase 1 a transformation, and `verify`'s recomputation
identity — the thing Q-43 deleted `.harness/base/` on the strength of —
stops being exact. The right answer is to declare the edit, which is what
§1's interface contract and Q-80 do.

---

## 4. Rationale

Option B wins because **the three packs are the evidence, and they were
built before this gate**. When content precedes its architecture, the
only defensible move is to derive the contract from what was built, test
that derivation against the format spec, and then say where the built
thing and the written thing disagree — rather than to invent a contract
the content would have to be rewritten to meet.

Every obligation in §1 earns its place by being a property at least one
pack got right and at least one document got wrong. `provenance` is
mandatory because F1 *added the field specifically because F5 requires
it* and two packs still omit it — an obligation that has already been
missed is exactly the kind worth pinning. `folderReadme` is
declared-never-sniffed because `writing`'s Obsidian shape would otherwise
report eleven false positives. Both step-count numbers must be stated
because F5 states `coding` at 21 and `planning` at 23 in the same
sentence and those two numbers are measured differently. The
adapt-expected confinement is one path per pack because the alternative —
a pack quietly declaring it on a `copy` step — would make `verify` green
over content nobody meant to change.

And the split between F1's floor and F5's obligations is not tidiness. A
pack can pass `validate --all --strict` today while failing F5's
`provenance` NFR, because F1 made the field optional and nothing checks
for its presence. That gap is real, it is currently open in two packs,
and the honest response is to name it as an F5 obligation and record that
no mechanism enforces it — not to pretend the format catches it.

---

## 5. Consequences

- **Unblocked: F1 and F2 have three real packs to compile against.** All
  three `pack.json` files satisfy F1 US-1 and US-2; all three
  `recipe.json` files use only the six primitives and stay far under the
  256-step bound. F1's §F1.3 worked example matches `packs/coding` op for
  op.
- **Unblocked: `validate --all --strict` is achievable and, on the
  checks this ADR could evaluate statically, achieved.** Every anatomy
  glob matches at least one payload file, so `E-ANATOMY-EMPTY` cannot
  fire. Every folder every combination creates receives its declared
  basename in the same branch — verified by hand for all five
  combinations (`coding` bare / `+azure` / `+aws`, `writing` bare /
  `+workstream`, `planning` ×2 calibrations). Every `{{harness:…}}`
  token's file reaches a `substitute` or `generate` step, so
  `E-SUBST-UNRESOLVED` cannot fire. Both `rewrite-path` steps match, so
  `E-REWRITE-UNUSED` cannot fire. The counts hold: exactly two `absent`,
  one `provisional`, 6/6/7 anchors, three `generate` steps each
  `adaptExpected`.
- **Constrained: the fourth pack inherits a real contract.** §1's
  interface contract is what a v1.1 pack must satisfy, and it is
  narrower than F1's schema on four fields.
- **Affected: F5 needs a v3.0 pass, not a patch.** §6 carries fifteen
  findings against it. Six are corrections of fact, three are
  enumerations that must be widened, two are scope statements Q-62
  invalidated, two are notations naming mechanisms F1 does not have, and
  two are obligations with no artefact on disk.
- **Affected: `specifications/general/pack-inventory.md` is stale and F5
  calls it authoritative.** It still says `recipe.json` is "to author",
  `packs/writing` is "to extract" and `packs/planning` is "to author",
  and that `pack.json`, `recipe.json`, `commands/` and `scaffolds/` "do
  not exist yet". All four exist. A document named authoritative that
  describes a state three commits in the past is worse than one not so
  named.
- **Harder: US-24's faithfulness check is now expensive to build.**
  Widening the enumeration honestly means auditing every hunk of a
  38-file diff and classifying it. That work is real and this ADR does
  not pretend otherwise — but it is the work Q-6 and S6 were always
  going to require, and it gets harder every commit it is deferred.
- **Harder: `v1.1-T1` has already accrued.** The two pack-local copies of
  the targets contract are **not** near-identical: `README.md` differs
  over ~275 diff lines against 150/155-line files, `Run.md` over ~144
  against 120/135, `target.template.md` over ~190 against 133/150. The
  drift Q-49 accepted as a future cost is present at v1.0.
- **Negative, and owned: this ADR ratifies more than it shapes.** Four of
  §1's five decisions could not realistically have gone another way once
  the packs existed. A reader should discount §1 accordingly and weight
  §6 instead.

---

## 6. Conflicts flagged

**This is the section that matters.** Each row names the disagreement,
which side this ADR judges correct, and what must change. Nothing here is
fixed by this ADR; `packs/` is not edited.

### 6.1 US-24's five declared difference classes do not describe the shipped `coding` pack — **the packs are right, the enumeration is wrong** *(HIGH)*

US-24 admits five classes — (a) Q-46 deletions, (b) added
`pack.json`/`recipe.json`/`applied-readmes/`, (c) the declared
restructure, (d) the brief wire-up — and asserts **"(e) is empty. Any
difference the check cannot place in (a), (b), (c) or (d) fails the
check."** G5.4 and §NFR *Faithfulness (coding)* rest on that claim.

**No migration record exists**, so no baseline is recorded. The only
plausible one is commit **`9b22908` ("feat: add the coding template pack
source"), path `template/`** — which is also where `coding`'s
`rewrite-path` literal `template/targets/` comes from, so it is almost
certainly the intended baseline. Diffing `9b22908:template` against
`HEAD:packs/coding` gives 38 changed paths. **Class (e) is not empty.**
At least four further classes are present:

| Unadmitted change | Evidence | Judgement |
|---|---|---|
| **Payload-side path repointing.** `agents/designer.md`, `agents/target-reviewer.md` and `agents/securityreviewer.md` had references rewritten to `.harness/pack/…` **in the payload**, not by the `rewrite-path` step | `designer.md` 1+/1−: `specifications/design-spec.template.md` → `.harness/pack/specifications/…`. `target-reviewer.md` 4+/4−: three `template/targets/…` → `.harness/pack/targets/…` | **The packs are right; the enumeration is wrong.** The repointing is necessary — those files are copied out and their targets stay in the payload. But F5 US-35 says `targets/Run.md` and `.claude/commands/target.md` are *"the two files the `rewrite-path` steps act on"*, which is true and incomplete: three more files reach the same destination form by pre-baking. **See Q-80.** |
| **Parameter-token insertion into migrated content.** `agent-teams/Implement.md` gained `{{harness:param.projectName}}`; `Specify.md` 22+/3−; `specifications/README.md` 95+/13− | This is why `AgentTeams/*.md` appears in the `substitute` step's `in` | **The packs are right; the enumeration is wrong.** A migrated pack that carries no token cannot be parameterised at all. Class (d) admits only *"a line in a read-first list, never a rewrite of a prompt's substance"* — 95 added lines in one file is not that |
| **Region anchors inserted into `CLAUDE.md.template`** (81+/15−; six anchor pairs) | Required by US-38 and F1 US-32 | **The packs are right.** But no class admits it, and the file is named in class (a) for a *deletion* only |
| **Net-new payload authoring beyond class (b).** `specifications/README.template.md` (62 new), `specifications/project-brief.template.md` (146 new), `scaffolds/backend-aws/**` (5 files, 375 lines) | Class (b) names only `pack.json`, `recipe.json` and `applied-readmes/`; class (c) covers only `backend-deploy/` → `backend-azure/` | **The packs are right.** `backend-aws` is authored by Q-8a's own decision, and the brief template by F5 v2.5 — but **Q-36 says `specifications/project-brief.template.md` "already exists"**, which is false against the recorded source; it was added at `09e965e` |

One further change is a **genuine content edit that Q-6 forbids and no
reading of the classes permits**: `agents/securityreviewer.md`
(15+/10−, commit `76741c9` "generalise securityreviewer") replaced four
hard-coded `reference/thoughtpartner/**` document paths with a prose
description of what to look for. It is a **good** change — the source
paths were another project's and would have dangled in every applied
tree — but *"a typo migrates as a typo"* does not admit it. It is either
a sixth class or a fidelity breach, and F5 must say which.

**Required change:** widen US-24's enumeration to the classes above and
name the baseline commit; or revert the pack to the five classes. **This
is Q-80** — it is Q-6's territory, not this ADR's.

### 6.2 "`planning` is the only pack with a parameter" is false — **F5 is wrong, twice over** *(HIGH)*

F5 §Flows / *The nine parts across the three packs*, reading 3:
*"**`planning` is the only pack with a parameter.** Nothing in `coding` or
`writing` changes content by an init answer."*

On disk: `coding` declares **`projectName`** and **`stack`**; `writing`
declares **`projectName`**, **`projectPurpose`** and **`authorName`**;
`planning` declares **`constraintFloor`**. Six substitution tokens in
`coding`, nineteen in `writing`, three in `planning`. F5 contradicts
itself: its own `coding` 7b table carries an *"Answers | `substitute` |
project name and stack"* row.

**The packs are right.** The true and useful claim is narrower:
**`planning` is the only pack whose recipe carries a `when` over an
answer** — the only pack where an answer selects *which files* are
written rather than *what is in them*. That is the property Q-13
established and the one that makes G5.6 interesting. Restate the reading
to say it.

### 6.3 `coding` and `writing` declare no `provenance` — **F5 is right; two packs are short** *(HIGH)*

F5 §NFR *Provenance*: *"each `pack.json` records what the pack was
derived from in its **`provenance`** key — for `coding` and `writing`, a
source path plus commit."* F1 v2.6 **defined the field expressly so this
would stop tripping the unknown-key warning**, and F1 §F1.3's worked
example shows `coding` declaring `{ source, commit }`.

On disk **only `packs/planning/pack.json` has the key.** `coding` and
`writing` have no `provenance`. F1 makes it optional and nothing checks
for **presence**, so this passes `validate` silently — which is precisely
why it needs recording.

**F5 is right.** Both packs must declare it, and `coding`'s should name
`9b22908` / `template/` (§6.1). Note that the F5 NFR is unenforceable as
written: F1 has no code for a *missing* `provenance`, and inventing one
is F1's call, not F5's.

### 6.4 US-24 class (d) does not cover every brief reference on disk — **F5 is right about the intent, wrong about the count** *(MEDIUM)*

Class (d) enumerates the brief wire-up as **exactly five** `coding` files
and **exactly six** `writing` agent prompts plus one `CLAUDE.md.template`
bullet. All twelve are present and correct on disk — the enumeration is
satisfied.

Three further files carry brief references that no class admits:
`packs/coding/CLAUDE.md.template:198`,
`packs/coding/specifications/README.template.md:15`, and
`packs/writing/templates/home.template.md:13,29`. The first two are
plausibly class (b)/(c) fallout; the third is not.

Separately, **`packs/writing/templates/project-brief.template.md` is a
third authored template** where migration requirement (d) says *"Two
authored templates, and exactly two (Q-51) … nothing else is authored"*.
F5's own 7b section says the brief template *"is classified as recipe
scaffolding alongside `index.template.md` and `home.template.md`"* — so
**F5 contradicts itself**, and the pack followed the 7b reading.

**The packs are right; requirement (d) must say "three".**

### 6.5 `writing`'s 7b table describes index steps that do not exist — **the packs are right, the mechanism is misdescribed** *(MEDIUM)*

F5's `writing` 7b table declares two rows: *"Folder indexes —
unconditional folders | `rename` per destination"* and *"Folder indexes —
scaffold folders | `rename` per destination, **`when
scaffold=writing-workstream`**"*, and §Flows spends a paragraph on how
that split is *"a requirement rather than a formatting choice"*.

On disk there is **exactly one** index `rename`
(`templates/index.template.md` → `writing-guide/index.md`). The
scaffold's twelve `index.md` files are **pre-authored in the payload** at
`scaffolds/writing-workstream/**` and arrive by five directory `copy`
steps.

**The packs are right.** The outcome F1 US-16 step 12 checks is
identical — every folder in every combination has its `index.md` in the
same branch — and shipping real per-folder tables of contents beats
rendering twelve copies of one template. The spec must describe the
mechanism the pack uses.

### 6.6 `when scaffold=<id>` names a mechanism F1 does not have — **F1 wins by F5's own scope rule** *(MEDIUM)*

F5 writes `when scaffold=backend-azure`, `when scaffold=backend-aws` and
`when scaffold=writing-workstream` throughout §Flows and in three 7b
tables. F1 US-8/US-31 define `when` as **`{ "<paramId>": "<value>" }`,
single equality only** — a compound or malformed `when` is
`E-RECIPE-STEP-INVALID` — and scaffold steps live *"under
`recipe.json`'s `scaffolds.<id>`"*, an ordered array. **`when` never
binds a scaffold.**

All three packs use the `scaffolds` object correctly and no recipe
contains a `when` on a scaffold. **F1 wins** ( F5 §Scope: *"Where this
spec and F1 could disagree, F1 wins"*). F5's notation is a shorthand it
never declares, and an implementer reading the 7b tables literally would
build a step shape that fails validation.

The same class of error sits in **US-37's first criterion**: *"both
declare `infrastructure/backend-deploy/` as their destination."* F1's
`ScaffoldDecl` has **no `destination` key** — the path appears only as
the `to` of two `strip-suffix` steps — and F1 says so directly:
*"Selecting both is `E-SCAFFOLD-EXCLUSIVE`, **not a path collision on
`infrastructure/backend-deploy/`**."* Both packs declare `"category":
"backend"`, which is the real mechanism, and the criterion should say so.

### 6.7 F5 still defers `update` and `status` after Q-62 returned them — **F5 is wrong** *(MEDIUM)*

F5 v2.9's amendment row asserts *"this spec asserts nothing about the
command surface and needed no change for it"*. It does, in three places:

- §Scope / *What is NOT in scope*: *"**`update`, `status` and
  `contribute` (Q-42).** Deferred to v1.1."*
- §Out of Scope: *"**`update`, `status`, `contribute`** and everything
  that depends on them (Q-42). The manifest and the inert anchors are the
  only forward investment."*
- Technical Context, *Regions* row, and US-38's title: anchors as
  *"forward investment for **v1.1's** `update`"*.

`general/pack-application.md` — which F5 names authoritative — records
Q-62 and states the opposite: *"`update` and `status` are **not**
deferred … The forward investments are no longer forward … With `update`
in v1.0 they are simply **in use**."* This is not cosmetic: it changes
what the anchors and the manifest are *for*, and US-38's whole framing
with it.

### 6.8 `packs/coding/README.md` fails four of US-28's five criteria — **F5 is right; the pack is short** *(HIGH)*

US-28 requires each README to name all nine anatomy parts, state that
pack's gaps, carry a produced-tree block of ≤ 20 lines saying *"which
parts of the pack are copied out and which stay at `.harness/pack/`"*,
and state the pack's version, `minCliVersion`, self-containment and — for
`coding` and `planning` — that its targets contract is a pack-local copy
naming the other holder.

`packs/writing/README.md` (150 lines) and `packs/planning/README.md`
(148) satisfy all five; both carry a nine-row anatomy table, a
produced-tree block (15 and 18 lines, exactly as US-28 states) and their
version lines.

**`packs/coding/README.md` (95 lines) has three headings — *Project
Starter Pack*, *Folder layout*, *What this starter pack assumes*.** It
names no anatomy part, names neither of its thin parts 5 and 8, has no
produced-tree block, states no version and no `minCliVersion`, and says
nothing about self-containment or the duplicated targets contract. Its
*Folder layout* section lists the **payload** tree — inputs, not phase-2
outputs — and that listing is itself stale: it shows five
`applied-readmes/` files where six exist.

**F5 is right and the pack must be rewritten.** This is the single
largest piece of outstanding pack work this ADR found, and G5.10 fails on
it today.

### 6.9 F5's `planning` payload inventory omits four shipped files — **F5 is wrong** *(LOW)*

F5 §*Payload — what phase 1 copies verbatim* for `planning` lists
`pack.json`, `recipe.json`, `README.md`, `CLAUDE.md.template`, `agents/`,
`templates/`, `calibration.template.md`, `portfolio-seed/`,
`calibrations/`, `commands/`, `targets/`, `applied-readmes/` and
`hooks/`. It omits **`process.md`**, **`conventions.md`**,
**`coordination.md`** and **`agents/README.md`** — the first three being
the declared sources of anatomy parts 1, 4 and 5. Without them
`E-ANATOMY-EMPTY` would fire on three parts. **The pack is right.**

Related, and smaller: `coding`'s `documentTemplates` glob is
`specifications/*.template.md`, which matches **eleven** files — but a
*different* eleven from the eleven F5 §3 enumerates. The glob includes
`README.template.md` and `project-brief.template.md` and excludes
`targets/target.template.md` and `copy/tone-of-voice.template.md`. Both
counts are 11 by coincidence. F5 §3's list should be reconciled with the
declaration, or the declaration widened.

### 6.10 The `generate` step's `anchors` array asserts; it does not emit — **a reasoning defect in both specs** *(LOW)*

Q-61's argument for all three packs using `generate` is that *"`generate`
is the only primitive that emits anchors — `rename` neither substitutes
nor asserts them"*. On disk the anchor markers are **literal text in each
`CLAUDE.md.template`** (`<!-- harness:region id=overview -->` …), and
F1 US-32 confirms the step performs *"a literal line count, not a
grammar"* against them — i.e. it **checks** that the declared ids are
present, and fails `E-ANCHOR-INVALID` if not.

So a `rename` of the same template would carry the anchors through
unchanged; what it would lose is the **assertion** and the
`adaptExpected` declaration. The conclusion (all three packs `generate`)
is right; the stated reason is wrong, and a v1.1 `update` author reading
Q-61 would expect `generate` to be the thing that put the anchors there.

### 6.11 `writing`'s `scout.md` cannot read the brief — **the packs are right; one general document is wrong** *(LOW)*

`packs/writing/agents/scout.md` declares `tools: WebSearch, WebFetch,
Write` — **no `Read`, no `Grep`, no `Glob`, no `Bash`.** It structurally
cannot open `project-brief.md` or any other local file.

The pack handles this correctly and openly. `scout.md:11` states the
dependency — *"you have no Read tool, so they reach you in the
invocation"* — and `packs/writing/CLAUDE.md.template:90` repeats it for
whoever invokes the agent. F5 US-24 records the same limit verbatim and
notes that granting `Read` would be a frontmatter change no class
permits.

**But `specifications/general/interaction-model.md:418` asserts the
opposite** — that *"the writing pack's outliner **and scout** read it for
audience and scope."* That sentence is false and contradicts both the
pack and F5. It is outside this ADR's edit scope and is flagged here.

Separately verified and **holding**: Q-58's correction is genuinely
applied on disk. `outliner.md:15`, `writer.md:15` and `critic.md:23` all
write into `workstreams/<name>/{outlines,drafts,reviews}/`, and each
carries an explicit note that the top-level folder is retired — which
matters because Q-58 records that this was once marked resolved before
the edit had been made.

### 6.12 Step counts are stated inconsistently across F5 — **F5 is wrong** *(MEDIUM)*

Three numbers, three different measurements, presented as comparable:

| Pack | base `steps` | declared total (base + all scaffolds) | What F5 says |
|---|---|---|---|
| `coding` | **15** | **21** | *"Twenty-one declared steps: fifteen in the base recipe plus three in each of the two backend scaffolds"* — **correct, and the only place F5 draws the distinction** |
| `writing` | **7** | **12** | **Nothing. F5 gives `writing` no step count anywhere.** `packs/writing/README.md` states it correctly: *"twelve declared steps … seven unconditional and five inside the scaffold"* |
| `planning` | **23** | **23** | *"Twenty-three steps"* — correct; the two numbers coincide because the pack has no scaffolds |

Q-61 then writes *"`coding` stays at 21 steps and `planning` at 23"* in
one sentence, comparing an all-branches total against a raw array length
with no qualifier. F1's 256-step bound counts **declared** steps across
base plus every scaffold, *"before any `when` filtering, because that is
what `pack info` prints"* — so the all-branches number is the one with a
contract attached, and the base number is the one that describes an
actual apply. **Both must be stated wherever either is**, as §1's
interface contract now requires.

### 6.13 Three v1.0 obligations have no artefact on disk — **F5 is right; the work is undone** *(MEDIUM)*

None of the following exists anywhere in the repository:

- **The `coding` migration record** (US-24: *"names the `packs/coding/`
  commit the pack was taken from"*; *"a documented, re-runnable check"*).
  G5.4 and §NFR *Faithfulness (coding)* both depend on it.
- **The `writing` extraction record** (US-25: *"names the source project
  path and the commit … and enumerates every file that was dropped"*).
  G5.5 depends on it.
- **The Q-8a scaffold-interface paper-check** against one non-IaC target,
  which US-37's last criterion and the master spec both require *"and the
  check is recorded"*.

F5 already says as much in its Open Questions section — *"F5 still has
outstanding work … the US-24 / US-25 fidelity checks to make runnable"* —
so this is a known gap rather than a discovery. It is recorded here
because §6.1 makes the first of the three considerably more expensive
than the sentence implies.

### 6.14 `planning`'s `rewrite-path` uses an unanchored `find`, and the two targets copies diverge in recipe as well as content — **an authoring hazard, no side clearly wrong** *(LOW)*

F5 requires `planning`'s `Run.md` and `commands/target.md` to be authored
*"with the pack-relative `targets/…` form, **exactly as `coding`'s source
carries it**"* — but `coding`'s source carries `template/targets/`, not
`targets/`. The instruction is self-contradictory. The pack took the
literal reading: `packs/planning/recipe.json`'s step 21 declares `"find":
"targets/"`, an **unanchored substring**, against `coding`'s distinctive
`"find": "template/targets/"`.

It works today and produces the right applied paths. But it will rewrite
*any* occurrence of `targets/` in those two files, including one already
in `.harness/pack/targets/` form — yielding
`.harness/pack/.harness/pack/targets/` the moment such a string appears.
More to the point, F5 rejected the alternative *"because it would make
the two pack-local copies of the contract differ in their recipe as well
as their content"* — and they differ anyway.

That divergence compounds a cost already accrued: the two copies are
**not** near-identical today. `README.md` differs over ~275 diff lines
(against 150- and 155-line files), `Run.md` over ~144, and
`target.template.md` over ~190. **v1.1-T1 is not a future task; its
subject already exists.**

### 6.15 Two smaller F1↔pack disagreements, recorded so they are not rediscovered *(LOW)*

- **F1 §F1.3's worked `pack.json` for `coding` shows a `provenance`
  object.** The pack has none (§6.3). F1's example is aspirational.
- **F1 US-9 states that `writing-workstream` declares no `category`.**
  `packs/writing/pack.json` declares `"category": "workstream"`.
  Harmless — a lone member of a category is still selectable and
  `E-SCAFFOLD-EXCLUSIVE` cannot fire — but F1's sentence is false against
  the pack.

### 6.16 Not a conflict: what was checked and holds

Recorded so the section is not read as an inventory of only bad news.
Statically verifiable against the packs, and **holding**:

- Six primitives only; no `merge-json`; no `.claude/settings.json` in any
  payload or any recipe destination.
- All nine anatomy keys present in all three packs; every glob matches
  ≥ 1 payload file; exactly two `absent` (both `writing`, both with a
  reason), exactly one `provisional` (`planning` part 2, with a note);
  `declaredBy: "recipe"` used only for `folderScaffolding`.
- Folder READMEs: every proper directory prefix in all **five** parameter
  and scaffold combinations receives its declared basename from a step in
  the same branch. `coding` base = 6 directories, all covered;
  `+backend-*` adds `infrastructure/` (scaffold step 3) and
  `infrastructure/backend-deploy/` (the scaffold's own
  `README.template.md`). `writing` bare = `writing-guide/`;
  `+workstream` adds 12, all pre-authored. `planning` = 11, all
  unconditional, identical in both calibrations.
- Substitution coverage is total: all 13 token-bearing payload files
  reach a `substitute` `in` glob or the `generate` step.
- Both `rewrite-path` steps match real literals, so `E-REWRITE-UNUSED`
  cannot fire.
- Anchors: 6 / 6 / 7, ids matching recipe declarations exactly; three
  `generate` steps, one per pack, each `"adaptExpected": true`, and **no
  other step in any pack declares it**.
- Executables: `coding` declares one root; `backend-azure`'s second
  `strip-suffix` step places exactly four scripts `executable`,
  `backend-aws`'s exactly one, both under the declared root and well
  under the cap of 32. `writing` and `planning` declare no root and set
  the flag nowhere. `planning`'s guard script lands under `.claude/`,
  where `E-EXEC-DEST-FORBIDDEN` makes `0644` structural.
- Applied-file counts match F5: `coding` **23** in the base combination
  (18 working + 5 folder READMEs), `planning` **32** and the same 32
  under either calibration.
- Q-46: grepping `packs/` for *Adopting this in a new project*,
  *Bootstrapping a new project* and (case-insensitively) *copy this
  folder* returns **zero hits**. G5.9 passes.
- Portability: `grep -r '/Users/' packs/` returns **zero matches**.

**Not verified, and stated as such:** `W-LINK-DANGLING` (F1 US-16 step
13) needs a rendered applied tree per combination and a link resolver;
nothing here executes an apply. The four scripts' `0755` landing, the
byte-level phase-1 fidelity diff, and the `writing` extraction's
exclusion classes (research corpus, permission allowlist, third-party
hook, voice samples) are all likewise assertions about behaviour or about
a source project this ADR could not read.

---

## 7. Open follow-ups

**Q-80 — Does US-24's declared-difference enumeration widen to the
migration that happened, or does the `coding` pack revert to fit the
enumeration?**

*Owner:* the brief (§12), because this is **Q-6's** territory — the
fidelity constraint is the brief's decision and an ADR may not
unilaterally relax it. *Raised by:* this ADR, §6.1.

The diff against the only plausible baseline (`9b22908:template`) carries
at least four classes US-24 does not admit, plus one change —
`securityreviewer.md`'s generalisation — that is a content edit Q-6
forbids outright. Both directions have a real cost:

- **Widen.** S6 ("any later behaviour difference is attributable to a
  migration bug rather than an undocumented improvement") survives only
  if every new class is enumerated as tightly as (a)–(d) are. A class
  called *"path repointing"* with no file list is not a class; it is a
  hole. The specific sub-question inside this one: **is pre-baking
  `.harness/pack/…` into a payload file a sanctioned route, or must every
  such reference go through `rewrite-path`?** `coding` uses both today
  and declares only the second.
- **Revert.** `securityreviewer.md` would go back to referencing four
  `reference/thoughtpartner/**` documents that exist in no applied
  project, which would dangle in every tree and fail `W-LINK-DANGLING`.
  That is a worse pack in service of a cleaner claim.

The likely answer is *widen, with the securityreviewer edit called out by
name as the one substantive content change and justified on its own
terms* — but that is a recommendation, not a decision this ADR may take.

**Two further follow-ups, neither needing a question id:**

- **A `provenance`-presence check has no owner.** F5 requires the key of
  every bundled pack; F1 makes it optional and has no code for its
  absence. Either F1 gains one, or F5's NFR is enforced by CI outside the
  format. F1 owns the catalogue and this ADR invents nothing — but the
  gap is currently silent, which is how §6.3's defect survived two packs.
- **`specifications/general/pack-inventory.md` is named authoritative by
  F5 and is stale** in at least six places (§5). Whoever holds the
  general documents should reconcile it or F5 should stop calling it
  authoritative for structure.

---

## 8. Verdict

The three packs are, on every check this ADR could evaluate statically,
**better than the specification that describes them**. They satisfy F1's
schemas, they satisfy Q-50's folder rule in every parameter combination,
their substitution is total, their anchor and adapt-expected declarations
are exact, and `writing`'s and `planning`'s READMEs meet US-28 in full.
Where the packs and F5 disagree on a matter of fact, **the packs are
right six times and short three**.

That is not enough to proceed, because the disagreements are in the parts
of F5 an implementer would compile against. US-24's enumeration does not
describe the pack it governs and asserts an empty class that is not empty
(§6.1). A stated reading — *"`planning` is the only pack with a
parameter"* — is contradicted by all three `pack.json` files and by F5's
own recipe table (§6.2). Two packs omit a key F5's NFR requires and F1
added specifically to satisfy it (§6.3). The `writing` 7b table and every
`when scaffold=` in the document describe mechanisms that do not exist
(§6.5, §6.6). §Scope still defers a command Q-62 returned to v1.0
(§6.7). And `packs/coding/README.md` fails four of US-28's five criteria,
which is pack work, not spec work (§6.8).

Each of those would mislead someone building against F5. Together they
mean the specification has not caught up with the content it specifies —
the predictable cost of authoring before the architecture gate, recorded
here rather than absorbed.

**REVISE SPEC**

---

## 9. Re-issued against F5 v3.1 — 2026-09-01

**Standing verdict: `PROCEED`, with two conditions.** §8's `REVISE SPEC`
was issued against **v2.9** and is superseded, not withdrawn — it was
right, and the record of what it cost is the point of keeping it.

### The six findings, checked against evidence rather than against the spec's own text

That distinction is `T-1906`'s requirement and it is not pedantry: **the
failure §8 found was a completeness claim that had never met a diff**, so
re-reading the spec to see whether it now says the right thing would
reproduce the original error one level up.

| §8 finding | State at v3.1 | Checked by |
|---|---|---|
| §6.1 — US-24 asserts an empty class that is not empty | **Widened to ten classes at Q-80**, each new one enumerated **by file** | The classes are grep-assertable: five `{{harness:` paths, six `.harness/pack` references, six anchors. Verified against the packs, not the prose |
| §6.2 — *"`planning` is the only pack with a parameter"* | **Corrected.** `coding` 2, `writing` 3, `planning` 1; the true claim is that `planning` holds the only `when` | `python3 -c` over the three `pack.json` and `recipe.json` files |
| §6.3 — two packs omit `provenance` | **All three conform**, and the finding was worse than §8 knew: `planning` *had* one and it was **invalid** — an array value and a 347-character note, either of which is `E-UNKNOWN-VALUE`. **The pack that had tried was the only one that would have failed the apply** | Every value re-checked as a string ≤ 200 chars, no newline |
| §6.5 / §6.6 — `writing`'s 7b table and `when scaffold=` describe mechanisms that do not exist | **Corrected.** One `index.md` rename, twelve pre-authored files; and `writing` split its `strip-suffix` for `fillExpected` | `find packs/writing -name index.md` → 12, against one rename in `recipe.json` |
| §6.7 — §Scope defers a command Q-62 returned | **Corrected** | Read directly |
| §6.8 — `packs/coding/README.md` fails four of US-28's five | **Rewritten**, 120 lines, all five met | Line count, part count, block length, version line, self-containment claim |

**Six for six.** The spec now describes the content it governs.

### A new finding, and it arrived from this ADR's own side of the fence

**US-24 has no class for a post-migration change to migrated content**,
and the gap surfaced immediately: on 2026-09-01 the Mode A review's
closing argument was folded into
`packs/coding/specifications/README.md` — a **migrated** file, edited
after the migration, under a recorded decision. **The widened enumeration
does not cover it.** Class (h) is *net-new authoring*, which this is not;
(e) through (g) and (i) are each a specific mechanism.

**The deeper problem is the framing, not the missing class.** US-24's
check diffs the shipped pack against the source commit, and that conflates
two different questions:

1. **Was the migration faithful?** A question about a point in time, which
   the enumeration answers well.
2. **Has the pack diverged from its source since?** An ongoing question
   whose honest answer will always be *"yes, and increasingly"* — because
   the pack is **product under active development** and F5's whole job is
   to improve it.

Adding a class per improvement makes the enumeration a changelog with
extra steps. **Condition 1 below is the fix**, and it is deliberately the
cheap one: a single class whose members are auditable **elsewhere**,
rather than an enumeration that grows forever.

### The condition §8 raised that is still not met

**The check has still never been run.** §6.1's finding was that a
completeness claim had never met a diff; **widening the enumeration did
not run it either.** `T-1502` exists for exactly this and its deliverable
is *evidence, not a pass*. Until it runs, class (j)'s emptiness is an
untested claim of precisely the kind class (e)'s was — which F5 v3.0 says
about itself, honestly, and which this ADR is not going to treat as
discharged because the sentence admitting it is well written.

### Conditions

| # | Condition | Why it is a condition and not a blocker |
|---|---|---|
| **1** | **US-24 gains a class (k): a post-migration change recorded in F5's change history**, and the check treats F5's history as its audit trail rather than growing a class per edit. **Or** US-24 is reframed with an explicit cutoff, so it answers *was the migration faithful* and stops pretending to answer *has the pack changed* | The criterion is sound; its scope is one sentence too wide. Either fix is a paragraph, and neither changes what the check does at the commit it was written for |
| **2** | **`T-1502` runs and its output is recorded in the migration record** before F5 is called Accepted | Already a task, restated as a condition because it is the acceptance test for the finding that produced §8's verdict, and a spec can be correct while its central claim is still unverified |

**Verdict: `PROCEED`.** Every finding §8 raised is addressed, and both
conditions above are about *verifying and scoping* a criterion rather
than about whether the packs or the spec are right. **`PROCEED` is not
`SECURITY-PROCEED`** — F5's content passed no security gate here, and the
standing security verdict for F1 and F5 remains `REVISE-SPEC` by decision.

---

## 10. Condition 2 — the check has run, 2026-09-01

**`T-1502` executed for `coding`.** §9 said its deliverable was *evidence,
not a pass*, and the evidence is worth more than a pass would have been:
**the check found two errors in the enumeration on its first run**, plus
a defect in the provenance it reads.

**The provenance pointed at the wrong commit.** `packs/coding/pack.json`
recorded `2644096` — which is the commit that **removed** `template/`, so
the source tree it names does not exist there. Corrected to its parent
**`807d67d`**. **A re-runnable check that takes its commit from
`provenance` is the only thing that could have found this**, which is the
argument `T-1501` made for wiring it that way.

**Result: 38 source files, 41 shipped, 32 differences** — 7 only-in-source,
10 only-in-shipped, 15 modified.

**Two differences do not fit the ten classes.** Recorded as unplaceable
rather than reclassified to fit, which is `T-1503`'s job and not this
section's:

1. **`CLAUDE.md.template` and `README.md` are *modified*, not net-new.**
   Class (h) — *net-new authoring beyond class (b)* — lists both by name.
   The diff shows they existed in the source and were **edited**. The
   class is wrong about two of its own members, and it is wrong in the
   direction that matters: *authored fresh* and *migrated then changed*
   are different claims about fidelity.
2. **The seven `infrastructure/backend-deploy/**` files are gone from the
   pack entirely.** Class (c) describes that tree becoming
   `scaffolds/backend-azure/` — true when written, and **Q-82 then moved
   it out of `packs/` altogether**. A second restructure the class
   predates, and the enumeration was widened at Q-80 **before** Q-82
   happened.

**Class (j) was not empty.** F5 v3.0 said so about itself, ADR-002 §9
declined to treat the admission as a discharge, and the check has now
made it a fact rather than a worry. **The enumeration's problem was never
its width — it was that nothing had run it.**

**Condition 2 is discharged for `coding` and stands for `writing`**,
whose source is `../AIImpactOnOrganizationsAndLeadership/` at
`9f7b4f1` and needs that repository present. **The standing verdict does
not move**: `PROCEED` was issued on the six v2.9 findings being addressed,
and condition 2 was always a gate on F5 being **Accepted**, not on this
ADR proceeding. **F5 stays `Draft` until `T-1503` adjudicates the two
unplaceable classes.**
