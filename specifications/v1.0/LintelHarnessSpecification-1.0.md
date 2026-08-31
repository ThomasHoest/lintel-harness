# Lintel Harness Specification — v1.0
**Version:** 1.0.0
**Status:** Draft
**Date:** 2026-08-31
**Platform:** Node.js + TypeScript CLI, published as `@lintel/harness`, binary `lintel-harness`, `engines.node >= 22` (Q-16). Packs are plain files bundled into the published package — no network fetch at init. A thin Claude Code skill under `.claude/skills/` drives the CLI. Target runtime for generated projects is Claude Code's `.claude/` conventions only.
**References:** `specifications/project-brief.md` §12 (Q-1…Q-54, **all resolved**, authoritative) · `specifications/general/pack-application.md` · `specifications/general/pack-inventory.md` · `specifications/v1.0/F1-spec-pack-format-and-manifest.md` · `specifications/v1.0/F5-spec-template-packs.md` · `specifications/v1.0/research-planning-pack-framing.md` · `packs/coding/specifications/conventions.md` · `specifications/README.md`

**Amendment history**

| Version | Date | Summary |
|---|---|---|
| 1.0.0 | 2026-08-30 | Initial draft. Established v1.0 as the generator release: pack format and manifest, three CLI commands, three template packs plus a shared tree, and the Claude Code skill. |
| 1.0.0 | 2026-08-30 | Cross-document consistency pass across this spec, F1 and F5. Duplicate questions collapsed, questions renumbered to unique project-wide ids, F5's user stories renumbered to US-17…US-28. No new design decisions. |
| 1.0.0 | 2026-08-30 | `F1-ADR-001` amendment pass. Folded the ADR's `PROCEED` into the document set; Q-13 and Q-15 closed; Q-18…Q-27 closed in F1. |
| 1.0.0 | 2026-08-31 | **Two-phase apply and scope rewrite (Q-39…Q-46).** Rewritten in place against the settled model. The apply becomes two phases — a verbatim payload copy, then a declarative recipe over seven primitives run by the CLI. **v1.0 narrows to F1, F2, F5 and F6; F3 (`update`) and F4 (`status`/`contribute`) defer to v1.1, and G3, S3 and R4 defer with them.** S7 weakens to apply-only. The manifest becomes minimal and `.harness/base/` is deleted; `--adopt` is dropped; marked regions reduce to inert anchors; bootstrap prose is deleted from pack sources. Sequencing becomes F1 → F2 → F5 → F6. All open questions close: none remain, next free **Q-47**. |
| 1.0.0 | 2026-08-31 | **`F1-ADR-001` fold (§6.3's seven changes), plus Q-47…Q-53.** The **v1.0 command surface is corrected from "`init` only" to four commands** — `init` (F2) and `validate`, `verify`, `pack info` (F1, per Q-53). **The `shared/` mechanism is removed, not merely unconsumed** (Q-48): it does not ship at v1.0, so the Technical Context row, the Out of Scope bullet, F1's stub and the shared-platform-changes row all drop it; `targets` becomes `coding`-local content and `planning` ships its own copy (Q-49). The forward-investment manifest bullet becomes **six keys**, adding the payload digest (Q-52). A **Technical Context row for Q-50** is added — every created folder carries a README, `.claude/` and `.harness/` excluded, no `mkdir` primitive, no `.gitkeep`. **Q-47…Q-53 are indexed as resolved; next free Q-54.** The US counter is corrected to **next free US-39**. §Spec-set readiness is restated against the rewritten ADR and its `REVISE SPEC` verdict. No new design decisions. |
| 1.0.0 | 2026-08-31 | **`F1-ADR-001` Mode A re-review fold (§6.3 change 8, as overridden by Q-54).** **The primitive set is six, not seven** — `merge-json` is dropped from v1.0 and deferred to v1.1 with the whole settings story (Q-54), so the Introduction, the *Phase 2 form* row, F1's stub and the shared-platform-changes row all drop it. **The determinism narrowing that §6.3 change 8 called for is deliberately NOT applied.** That change existed because `merge-json` took a fourth input — the destination's pre-existing content — and made the purity claim false at exactly one kind of destination. **With `merge-json` gone the claim is true as originally written**, at every applied path, so `verify`'s recomputation identity and the *Determinism* NFR are restated as holding **without exception** rather than qualified. A **Technical Context row for Q-54** is added and the rows implying a settings or consent surface are corrected: no pack writes `.claude/settings.json`, owns a settings key, ships a default permission set, or presents anything at apply time for a user to agree to. **Q-54 is indexed as resolved; next free Q-55.** The story counter is unchanged at **next free US-39**. §Spec-set readiness is restated: the security verdict of record is `REVISE-SPEC` from the re-review, F1 folds to v2.3 and F5 to v2.1, and **a further Mode A pass is required against the folded documents.** No new design decisions; this document owns no user stories and no acceptance criteria. |

---

## Introduction

v1.0 turns a folder that gets copied into a product that gets applied.
The scaffolding this repo owns — agent roles, agent teams, the gated
spec process and its document templates, behavioural guidelines, folder
shapes and the automations that run them — ships today as a directory
people copy and hand-edit. That is fast once and unmaintainable
forever: the existing targets README contains a literal step *"fix the
paths"*, and once copied the result is a fork no later improvement can
reach.

**The headline change is the two-phase apply (Q-39).** `lintel-harness
init <pack>` runs exactly two phases. *Phase 1* is a verbatim copy of
the pack folder into `.harness/pack/` — no renames, no substitution, no
rewriting, and **identical for every pack**. Because it transforms
nothing it cannot fail in an interesting way, and the result is
byte-identical to the pack that shipped. *Phase 2* is the pack-specific
application: it copies the working parts out to the project root,
`.claude/`, `copy/` and the scaffold directories, rewrites paths,
substitutes answers and generates `CLAUDE.md`. Everything that varies
between packs lives in phase 2, where it is declared rather than
improvised.

Phase 2 is a **declarative recipe, not a script** (Q-40): a sequence
over **six** fixed primitives — `copy`, `rename`, `strip-suffix`,
`rewrite-path`, `substitute`, `generate` — applied
automatically by the CLI and never by the user. A script would make a
pack *code that executes on the user's machine*, voiding the security
model, because path confinement and the reserved-destination denylist
both depend on the plan being inspectable **before**
anything runs. Phase 2 reads from the phase-1 copy on disk (Q-41), not
from the bundle, and it is a **pure function of (payload, parameter
answers)** — no timestamps, no ordering dependence, no environment or
network reads. Two applies of the same pack version with the same
answers produce byte-identical trees. Determinism is a requirement, not
a hope: it is what makes "applied correctly every time" testable, and
it is why the manifest can stay minimal.

**A seventh primitive, `merge-json`, was in this set until Q-54 and is
now deferred whole to v1.1**, together with the settings story it
existed for: no v1.0 pack writes `.claude/settings.json`, owns a
settings key, or ships a default permission set. That deletion is worth
one sentence here because it strengthens the paragraph above rather than
qualifying it. **`merge-json` was the only primitive that took a fourth
input** — the destination's pre-existing content — and it was therefore
the one place where "a pure function of (payload, parameter answers)"
was not literally true. With it gone the claim **holds at every applied
path, without exception**, and so does the recomputation identity
`verify` is built on.

The work splits on a seam that is a decision, not an accident (Q-1). A
**Node/TypeScript CLI** owns everything that must be deterministic —
validation, planning, both phases, the manifest — because a mechanism
that varies run to run is not a mechanism. A **thin Claude Code skill**
owns the parts that are genuinely judgment: filling parameter answers
from what the repo actually is, adapting the generated `CLAUDE.md`'s
project-owned prose around its anchors, redrawing file-ownership tables
against the real layout. The CLI is built first; the skill is a wrapper
added on top.

**v1.0 is the generator, not the pack content** (Q-6). Three packs ship
— `coding`, `writing`, `planning` — but the two existing ones migrate
*faithfully*. Cross-pollinating them (writing gains the targets
contract; coding gains routing and parallelization rules) is held back
to the first post-v1.0 bump, so that a post-migration difference can
only be a migration bug rather than an intentional improvement, and S6
stays verifiable. `planning` is net-new authoring, which Q-29 confirms
is a clarification of that boundary rather than a breach of it: there
is no faithful baseline for a pack that has no prior copy.

### What v1.0 does not solve — stated plainly

The brief opens by arguing that copy-paste fails **because it cannot be
updated**, and §7 chose managed apply to solve exactly that. **v1.0
answers only the first half of that problem.**

`update`, `status` and `contribute` are deferred to v1.1 (Q-42). **F3
and F4 leave v1.0, and G3, S3 and R4 defer with them.** v1.0 applies a
pack; it does not maintain one. An applied project at v1.0 cannot pull
a newer pack version, cannot report its drift, and has no route back
into the pack. That is a deliberate narrowing to get apply correct
first, not an oversight, and it should not be softened in downstream
documents: a reader who takes the brief's §2 at face value will expect
`update` to exist, and at v1.0 it does not.

Two pieces of forward investment keep v1.1 an **addition rather than a
retrofit**:

- **The minimal manifest** (Q-43, as amended by Q-52) records **six**
  things: manifest version, CLI version, pack identity, a single
  **payload digest** over `.harness/pack/`, parameter answers and chosen
  scaffolds — enough for a later `update` to know what was applied and
  recompute the expected tree. There is still no per-file hash list and
  no `.harness/base/` store; with the pack local at `.harness/pack/` and
  a deterministic recipe, applied state is recomputable from payload +
  recipe + answers. The digest is what stops that recomputation being a
  tautology: without it, a hand-edited payload reproduces itself
  faithfully and reads as clean, so `verify` could not say which side
  moved. It is one field and one tree walk, and because it is a pure
  function of the payload, determinism is untouched.
- **Inert region anchors** (Q-45) are emitted into the generated
  `CLAUDE.md` so a later `update` can find pack-owned regions. No
  region parser, no region hashes, no malformed-marker diagnostics and
  no tamper detection ship at v1.0. Anchors are near-free now and
  expensive to retrofit.

### The settled model

Two cross-cutting reference documents in `general/` describe the model
this specification is written against. **Where any older document
disagrees with them, they win:**

| Document | Covers |
|---|---|
| [`../general/pack-application.md`](../general/pack-application.md) | The two-phase apply — the phase table, the init flowchart, the **six**-primitive recipe set, the determinism requirement, and what the coding pack's recipe encodes. **That document still lists seven primitives and still names `.claude/settings.json` as `merge-json`'s worked example; both are superseded by Q-54 and this document wins on those two points until they are corrected** |
| [`../general/pack-inventory.md`](../general/pack-inventory.md) | The three packs file by file, per-file phase metadata (P1 / P2 / P1+P2), applied trees, versions, the anatomy matrix, and this repo's dogfooding gap |

### The release gate

**S7 / G7: this repo must itself be produced by `lintel-harness init
coding`, with no hand-applied files left. Until that holds, v1.0 has
not shipped.** S7 is weakened by Q-42 to **apply only** — the original
wording required `init` *plus* `update`, and the `update` half moves to
v1.1 with F3.

The gate is reachable in one step. `pack-inventory.md` records what
this repo has today against what a proper apply would produce:
`AgentTeams/` and `targets/Run.md` were deleted when they were believed
to be payload, and under Q-39 they are phase-2 artifacts that come back
the moment the recipe runs. Nothing was lost. Author `recipe.json` for
`packs/coding`, then apply it here.

### Spec-set readiness — this set is **not** implementation-ready

Recorded honestly, because the process gates on it:

- **`F1-ADR-001-pack-format-and-manifest.md` has been rewritten against
  the two-phase model, and its verdict is `REVISE SPEC` — *not*
  narrowed.** The 2026-08-30 original carried `PROCEED`; that verdict was
  written against declarative `mappings`, `.harness/base/`, marked
  regions and a per-file hash manifest, and it is **void** — it does not
  transfer. An intermediate edition of this section recorded the verdict
  as "narrowed to one unfolded item"; **that reading is withdrawn**,
  because it was made against a disposition table the re-review then
  found to be wrong about six conditions. The verdict clears when every
  §6 change has landed, not when the ADR is read.
- **The security verdict of record is `REVISE-SPEC`, issued by the
  2026-08-31 Mode A re-review** — not the 2026-08-30 review it
  supersedes. It found 2 CRITICAL, 3 HIGH, 5 MEDIUM and 2 LOW, re-opened
  the original CRITICAL S-1 through a route the first review never saw,
  and issued conditions C-19…C-30. **Q-54 answers the largest part of it
  by deletion rather than by repair:** `merge-json` was the target of
  both CRITICALs, of both lapses of C-16 and of the newly found rollback
  defect, and dropping it removes the surface instead of hardening it.
- **The folds this verdict requires are in flight, and each document
  carries its own version.** **F1 folds to v2.3** (§6.1 changes 17–27);
  **F5 folds to v2.1** (§6.2 changes 12–16, as overridden by Q-54); this
  document carries §6.3 change 8, adjusted by Q-54 — the determinism
  narrowing is **not** applied, because `merge-json`'s removal makes the
  unqualified claim true rather than needing a qualifier. §6.5's five
  out-of-scope corrections sit with the owners of
  `general/pack-application.md`, `general/pack-inventory.md` and the
  brief §12, and are **not discharged here**.
- **A further Mode A pass is required against the folded documents, and
  it is a precondition, not a formality.** No `SECURITY-PROCEED` exists
  against any version of this set, the folds materially change what a
  reviewer would be reading, and Q-54 removes a primitive rather than
  adjusting one — a deletion of that size is exactly the kind of change
  a re-review is for. **Folding the ADR does not substitute for the
  verdict, and neither does this document's amendment row.**
- **This is the second consecutive round in which a rewrite lapsed
  conditions a disposition table claimed were satisfied**, and it is
  recorded here rather than only in the ADR because it is a fact about
  the *process*, not about F1. In both rounds the table was checked
  against the section that stated the condition instead of against the
  document that had to satisfy it, which cannot detect a lapse because it
  is checking a claim against itself. Two controls follow, and the
  readiness of this set now depends on them: a disposition of `SATISFIED`
  must cite the **mechanism and its quantifier**, not a section number;
  and the closed attacks get **adversarial fixture packs** run in CI,
  each asserted to fail with a named code. Until both are in place, a
  green disposition table is not evidence.
- **No epics-and-tasks document exists** for any feature.
- **F2 and F6 have no feature spec.** Only F1 and F5 have one.
- **`general/system-architecture.md` and `general/technology-choices.md`
  are required and unwritten.** `system-architecture.md` in particular:
  Q-39 changed the shape of the system after F1 and ADR-001 were first
  written, and nothing currently records the whole-system view.

No implementation should begin until the ADR's §6 folds are complete —
F1 at v2.3, F5 at v2.1, this document as amended, and §6.5's five
corrections folded or explicitly deferred by their owners — the two
`general/` documents exist, F2 and F6 have specs, every feature has an
epics-and-tasks document, and **a fresh Mode A verdict has been issued
against the folded set.**

### What v1.0 deliberately does *not* change

- **Pack content.** `coding` migrates from `template/` and `writing`
  from `AIImpactOnOrganizationsAndLeadership/` unchanged in substance
  (Q-6). Only packaging changes.
- **The spec process itself.** v1.0 *distributes* the
  `research → spec → design-spec → ADR → epics-and-tasks →
  implementation` chain; it does not redesign it.
- **The agent runtime.** Claude Code's `.claude/` conventions are the
  only supported target. No runtime abstraction layer.
- **Composition.** A project holds exactly one pack (Q-12).
- **Distribution shape.** Local files plus git. No registry, no hosted
  service, no network fetch at init (Q-2).

---

## Technical Context

Cross-feature decisions only. Per-feature decisions belong in each
feature spec. Every row is settled; the **Source** column names the
originating question, whose full rationale is in `project-brief.md`
§12 unless noted.

| Decision | Choice | Source |
|---|---|---|
| Apply model | **Two phases.** Phase 1 copies the pack verbatim into `.harness/pack/` — no transformation, identical for every pack. Phase 2 is the pack-specific application that copies out and wires up | Q-39 |
| Phase 2 form | A **declarative recipe** over **six** fixed primitives — `copy`, `rename`, `strip-suffix`, `rewrite-path`, `substitute`, `generate` — applied automatically by the CLI, never by the user. A new kind of step requires a new primitive in the CLI, deliberately | Q-40 as narrowed by Q-54 · `general/pack-application.md` (which still says seven and is superseded on that point) |
| Settings and permissions | **No pack writes `.claude/settings.json` at v1.0.** `merge-json` is dropped: six primitives, not seven. No pack owns a settings key, ships a default permission set, or produces anything at apply time for a user to agree to — there is no settings grant, no disclosure of one and no gate on one, because there is no route by which a pack reaches a settings file. The ownable-key allowlist, the destination policy, the leaf-only rule and their error families are **removed rather than repaired**, and the whole settings story defers to v1.1 | Q-54 — F5's three settings steps were never valid recipes (no `from`, no owned key, no settings source file in any payload), so `merge-json` had no v1.0 consumer while carrying the format's largest attack surface. It was the target of both CRITICALs in the Mode A re-review, of both lapses of C-16, and of the newly found rollback defect. **R5's "sensible default permissions" waits for v1.1** and F5 records it as a fourth shortfall |
| Phase 2 input | Phase 2 reads the **phase-1 copy in the project**, never the bundle. The user cannot adjust the payload between phases at v1.0 | Q-41 |
| Determinism | The recipe is a pure function of **(payload, parameter answers)**. No timestamps, ordering dependence, environment or network reads. Same pack version + same answers ⇒ byte-identical trees. **This holds at every applied path, with no exception** — `merge-json` was the one primitive taking a fourth input (the destination's pre-existing content), and Q-54 removes it, so the claim needs no qualifier and `verify`'s recomputation identity is universal | Q-40, Q-54 |
| Planning before writing | Validation, both phases and the manifest are computed in memory; a journal is written; only then do bytes land. Failure in either phase rolls back, and rollback never deletes a pre-existing file | Q-39 · `general/pack-application.md` |
| v1.0 command surface | **Four commands.** `init` (F2) is the apply; `validate`, `verify` and `pack info` (F1) all read a pack or a manifest, write nothing and take no lock. `update`, `status` and `contribute` defer to v1.1 with F3 and F4 | Q-42, Q-53 · F1's `E-CLI-UNKNOWN-COMMAND` lists `init, validate, verify, pack` |
| Command ownership | **F1 owns the three read-only commands; F2 owns the apply and nothing else.** `verify` sits with `validate` and `pack info` because all three are the same class of read-only question over the same machinery, and F1 defines the recomputation identity `verify` answers | Q-53 |
| Manifest | **Six keys**: manifest version, CLI version, pack identity, **`payloadDigest`** (one tree digest over `.harness/pack/`, serialized between `pack` and `parameters`), parameter answers, chosen scaffolds. **No per-file hash list and no `.harness/base/` store** | Q-43 (supersedes Q-18, Q-19), amended by Q-52 |
| Adoption of hand-applied trees | **`init --adopt` is dropped.** A clean `init` loses nothing once bootstrap prose is gone | Q-44 (supersedes Q-14) |
| Source vs applied content | **No marked regions at v1.0.** The generated `CLAUDE.md` emits **inert region anchors** for v1.1's `update` to find; no parser, region hashes, malformed-marker diagnostics or `E-REGION-TAMPERED` | Q-45 (amends Q-7, Q-10) |
| Bootstrap prose | **Deleted from the pack sources.** "Copy this folder", "rename the template", "fix the paths" and "adopting this in a new project" come out of `packs/coding/**` entirely — the recipe encodes them, so they are dead content. This is also why phase 1 can copy verbatim | Q-46 (supersedes Q-38) |
| Recipe requirement source | The nine-step manual-apply log in `CLAUDE.md` §Dogfooding **is** the coding pack's recipe. Each hand step maps to a declared primitive; the two README-rewrite steps map to none, because under Q-46 they no longer happen | Q-46 · `general/pack-application.md` |
| Execution split | Node/TypeScript CLI owns the deterministic mechanics; a thin Claude Code skill owns the judgment steps | Q-1 |
| Build order across the split | CLI first, skill last — the apply engine is the load-bearing risk; the skill is a wrapper | Q-1 |
| Package, binary, runtime floor | Published as `@lintel/harness`; binary `lintel-harness`; `engines.node >= 22` | Q-16 |
| Pack home and distribution | `packs/` in this repo, bundled into the published package; `template/` becomes `packs/coding/`. `npx` needs no network | Q-2 |
| Versioning | Per-pack semver in `packs/<name>/pack.json` plus a separate CLI semver; each pack declares `minCliVersion`; the manifest records both. All three packs declare `minCliVersion: 1.0.0` | Q-3 · `general/pack-inventory.md` |
| Sharing between packs | **None. The mechanism does not ship at v1.0** — no shared tree, no `component.json`, no `shared` array in any `pack.json`, no digest pin, no bump rule, no CI enforcement. Every pack is self-contained. Q-4's model defers **whole** to v1.1, where `shared/presentation` gives it a second consumer | Q-48 (supersedes Q-4 for v1.0), Q-28 |
| The targets contract | Ships **twice** as pack-local content: inside `coding` unmoved, and as `planning`'s **own copy** tuned to bets (so planning's part 9 stays `present`). **Accepted cost:** the two copies will drift before v1.1 reconciles them — F5 books the merge as a named v1.1 task with the architect as owner | Q-49 |
| Presentation | A cross-cutting capability, not a pack — but **it defers to v1.1 and no pack references it at v1.0** | Q-9b, Q-28 |
| Folder READMEs | **Every folder an apply creates carries a README** — `README.md` for `coding` and `planning`, `index.md` for `writing`. **`.claude/` and `.harness/` are excluded** as tool-owned, so neither carries a pack-written README and `.harness/README.md` does not exist. Consequence for the format: **no folder is ever empty**, so there is **no eighth `mkdir` primitive, no `skeleton/` tree and no `.gitkeep`** | Q-50 — a content decision with a format consequence: it dissolves the empty-directory problem rather than solving it. Git cannot commit an empty directory, so any answer needed placeholder files; Q-50 makes those files say something |
| Pack cardinality | Exactly one pack per project. Two ways of working means two projects side by side | Q-12 |
| Packs at v1.0 | Three: `coding` (exists, migrating), `writing` (to extract), `planning` (to author) | Q-9, Q-9a |
| `planning` spine | Portfolio and roadmap management as a decision loop — `intake → discovery → prioritize → commit → deliver → learn` — with a non-delegable absorption gate and horizon-setting inside commit, calibrated at init by constraint floor | Q-11 · `research-planning-pack-framing.md` |
| Pack completeness | A pack **is** the nine-part anatomy, declared in `pack.json` with a three-value status (`present \| provisional \| absent`), so a missing part is visibly incomplete rather than quietly deficient. Validated by the CLI, not by schema alone | Q-37 (brief §3.3, R2) |
| Parameterized content | Content varying by an init answer needs no new grammar: conditional selection plus `{{harness:param.<id>}}` substitution. `packs/planning/calibrations/<name>/` is an authoring convention over the recipe's `when` condition, not special machinery | Q-13 · `general/pack-inventory.md` |
| Parameter and scaffold immutability | An init answer cannot be changed, and a scaffold cannot be added or removed, after apply at v1.0. Apply into a fresh directory | Q-21, Q-22 |
| Scaffolds | Opt-in and composable at init. **Three at v1.0: `backend-azure`, `backend-aws`, `writing-workstream`.** `frontend` and `app` defer to v1.1. Two backend implementations are what prove the interface general rather than asserted | Q-8, Q-8a, Q-17 |
| Scaffold interface generality check | Paper-check the interface against one non-IaC deploy target (Vercel or Fly) **without authoring it** — both v1.0 backends are declarative-IaC in shape | Q-8a residual risk, accepted |
| Hooks | **No pack may register a hook at v1.0**, and under Q-54 that now holds **by construction**: there is no settings file for a pack to register one in. `planning` ships one guard script inert at `0644`, registered by nothing and executed by nothing; `writing` ships none | Q-30, Q-45, Q-54 · `general/pack-inventory.md` |
| Content freeze | Packs migrate faithfully; cross-pollination and other content improvements land in the first post-v1.0 bump. Authoring `planning` is not a breach — Q-6 constrains changing existing packs, not adding one | Q-6, Q-29 |
| Release gate | **S7, weakened:** this repo is produced by `lintel-harness init coding`, apply only. The `+ harness update` half of the original S7 moves to v1.1 | Q-42 |

---

## Goals (version-level)

Each is assessable at release. Bracketed IDs are the brief's goals (G),
requirements (R) and success criteria (S).

- **A new coding project is fully set up in one command from an empty
  directory, with no manual path edits, and its first spec-chain run
  works.** [G1, R3, S1]
- **A writing project and a planning project are set up from the same
  machinery**, proving the abstraction generalises beyond one type.
  [G2, S2]
- **Adding a pack requires no change to the harness core** — tested by
  `planning` being authored against an already-frozen pack format and
  recipe primitive set. [R1, S5]
- **Applying the same pack version with the same answers twice produces
  byte-identical trees**, and a failed apply leaves the pre-init state.
  [Q-39, Q-40]
- **Both existing templates are migrated into packs; neither survives as
  a hand-copied folder.** [S6]
- **Scaffolds are selectable and composable at init**, with two working
  backend implementations proving the interface is general. [G5, Q-8,
  Q-17]
- **The harness is legible**: a newcomer reads the generated `CLAUDE.md`
  and the pack README and understands what they got and why. [G6]
- **This repo is itself produced by `lintel-harness init coding`, with
  no hand-applied files left.** This is the release gate, not a stretch
  goal. [G7, S7 as weakened by Q-42]

**Deferred to v1.1 with F3 and F4 (Q-42):** G3 (templates updatable
after they have been applied), R4 (easy to update and improve — pack
versioning aside, which ships), S3 (a pack change reaches an existing
project with local customisations preserved) and S4 (`status` reports
pack, version and drift). G4 and Q-5's contribute-back path go with
them. These are not restated as v1.0 goals anywhere in this document.

---

## Out of Scope (v1.0)

- **`update`, `status` and `contribute`.** Deferred to v1.1 as F3 and
  F4 (Q-42). **G3, S3, R4 and G4 defer with them.** The product ships
  the apply half of the brief's problem statement and not the
  maintenance half.
- **Region parsing, region hashes, tamper detection and marked-region
  grammar.** Only inert anchors ship (Q-45).
- **`.harness/base/`, per-file hashes and any merge machinery.** Removed
  outright, not deferred in place — the deterministic recipe makes them
  unnecessary rather than merely postponed (Q-43).
- **`init --adopt`.** Dropped (Q-44).
- **`merge-json`, and the whole settings story with it** (Q-54). The
  primitive set is **six**. No pack writes `.claude/settings.json`, owns
  a settings key or ships a default permission set, so there is no
  ownable-key allowlist, no destination policy, no leaf-only rule, no
  security disclosure of a grant and no consent gate at v1.0. Deferred
  **whole** to v1.1. R5's "sensible default permissions" defers with it,
  and F5 records that as a shortfall rather than softening it.
- **User-editable payload between phases.** Phase 2 reads what phase 1
  wrote (Q-41).
- **The `shared/` mechanism, and `shared/presentation` with it.** Not
  "specified but unconsumed" — **it does not ship** (Q-48). No shared
  tree, no `component.json`, no `shared` array, no digest pin, no bump
  rule. `targets` is `coding`-local content and `planning` carries its
  own copy (Q-49); `shared/presentation` defers to v1.1 (Q-28), where the
  mechanism, its second consumer and the task of reconciling the two
  targets copies all land together.
- **`frontend` and `app` scaffolds.** Deferred to v1.1 (Q-17).
- **Authoring a non-IaC deploy scaffold.** Q-8a commits to a
  paper-check of the interface, not to shipping one.
- **Improving pack content.** Cross-pollination moves to the first
  post-v1.0 bump (Q-6).
- **Pack composition.** One pack per project is a design decision, not
  a deferral (Q-12).
- **A public registry or marketplace of packs.** Local files plus git.
- **A GUI.** CLI plus the Claude Code skill only.
- **Multi-user permissioning or team accounts.**
- **Agent runtimes other than Claude Code's `.claude/` conventions.**
- **Migrating historical projects wholesale.** S6 covers the two known
  templates, not every repo that ever copied one.
- **A project-management or execution-tracking layer.** The harness
  scaffolds a way of working; it does not track work.

---

## Feature 1 — Pack format, recipe & manifest

*Full detail in [`F1-spec-pack-format-and-manifest.md`](F1-spec-pack-format-and-manifest.md) · ADR [`F1-ADR-001-pack-format-and-manifest.md`](F1-ADR-001-pack-format-and-manifest.md) — **being rewritten; its `PROCEED` predates Q-39…Q-46** · Tasks in `F1-epics-and-tasks-pack-format-and-manifest.md` (not written)*

F1 defines what a pack *is* on disk, how it declares its own
application, and what an applied project records about it — and it is
the only feature every other feature reads or writes. It owns
`pack.json` (pack name and semver, `minCliVersion`, parameter
declarations, scaffold declarations, and the nine-part anatomy
declaration with its `present | provisional | absent` status — and **no
`shared` array**, because Q-48 removes the mechanism from v1.0);
`recipe.json` and the fixed **six**-primitive vocabulary that phase 2
executes — `merge-json` is dropped from v1.0 by Q-54, and with it the
ownable-key allowlist, the destination policy and their error families —
including the validation rules — path confinement, the
reserved-destination denylist — that make an apply plan inspectable
before it runs (Q-40); the parameter and substitution grammar that lets
content vary by an init answer without new syntax (Q-13); the inert
region anchor form emitted into `CLAUDE.md` (Q-45); the six-key manifest
schema — manifest version, CLI version, pack identity, payload digest,
answers, scaffolds, and nothing else (Q-43 as amended by Q-52); and the
three read-only commands `validate`, `verify` and `pack info`, `verify`
among them because F1 defines the recomputation identity it checks
(Q-53). It is specified and frozen first precisely so that S5 ("adding
a pack requires no core change") is a claim `planning` can later
falsify, and its scaffold declaration carries the Q-8a obligation to
paper-check the interface against one non-IaC deploy target.

---

## Feature 2 — `lintel-harness init` — the two-phase apply engine

*Full detail in `F2-spec-init-apply-engine.md` (**not written**) · ADR `F2-ADR-NNN-init-apply-engine.md` (not written) · Tasks in `F2-epics-and-tasks-init-apply-engine.md` (not written) · Model in [`../general/pack-application.md`](../general/pack-application.md)*

F2 is the one command that takes a directory to a working project: it
resolves the named pack from the bundle, validates `pack.json` and
`recipe.json`, collects parameter answers from `--set` flags or
prompts, plans both phases and the manifest **entirely in memory**,
writes a journal, and only then lands bytes — copying the pack verbatim
into `.harness/pack/` (phase 1) and then executing the pack's recipe
against that copy (phase 2) to produce `.claude/`, `AgentTeams/`,
`targets/Run.md`, `copy/`, the generated `CLAUDE.md` with its inert
anchors, and any selected scaffold directories. A failure in either
phase rolls back to the pre-init state and never deletes a file that
existed beforehand; an existing `.harness/` is refused outright rather
than merged into. Its requirement list is not invented — it is the
nine-step manual-apply log in `CLAUDE.md` §Dogfooding, which Q-46
identifies as the coding pack's recipe in prose form. Its acceptance is
S1, and its harder acceptance is S7: this repo must come out of it with
nothing left hand-applied.

---

## Feature 3 — `update` — drift detection & merge · **v1.1, not in this release**

*Deferred by Q-42. No v1.0 spec, ADR or tasks.*

**v1.1.** Reconciles an applied project against a newer pack version,
preserving local edits; it is the half of the product copy-paste cannot
do, and v1.0's minimal manifest (Q-43) and inert anchors (Q-45) exist
so that building it is an addition rather than a retrofit. **The number
F3 is reserved and will not be reused.**

---

## Feature 4 — `status` & `contribute` · **v1.1, not in this release**

*Deferred by Q-42. No v1.0 spec, ADR or tasks.*

**v1.1.** The same comparison pointed in two directions — `status`
reports pack, applied version, available version and drift (S4);
`contribute` emits a patch against `packs/<name>/` so an improvement
found in a project has a route back (G4, Q-5). Both depend on F3's
compare engine. **The number F4 is reserved and will not be reused.**

---

## Feature 5 — The three template packs

*Full detail in [`F5-spec-template-packs.md`](F5-spec-template-packs.md) · Inventory in [`../general/pack-inventory.md`](../general/pack-inventory.md) · Research in [`research-planning-pack-framing.md`](research-planning-pack-framing.md) · ADR `F5-ADR-NNN-template-packs.md` (not written) · Tasks in `F5-epics-and-tasks-template-packs.md` (not written)*

F5 is the content half of v1.0: three packs authored against F1's
frozen format, each shipping its own `pack.json`, its own `recipe.json`
and the scaffolds it offers. `coding` migrates from `template/` and
`writing` is extracted from
`AIImpactOnOrganizationsAndLeadership/`, both **faithfully** (Q-6), so
that a post-migration difference can only be a migration bug;
`planning` is authored new from the spine Q-11 settled, and its
constraint-floor calibration is the format's hardest test as the only
case where an init answer changes what is written rather than only
which values are substituted. Under Q-46 each pack's bootstrap prose is
deleted rather than rewritten per project, which is what lets phase 1
copy verbatim; under Q-45 no pack registers a hook; under Q-48 every
pack is self-contained, with the targets contract shipping inside
`coding` and again as `planning`'s own copy (Q-49); and under Q-50 every
folder a pack's recipe creates carries a README, so no applied tree has
an empty directory. Each pack declares all nine anatomy
parts honestly, gaps included — `coding` weak on coordination and
automations, `writing` absent on automations and autonomy, `planning`
provisional on roles — because a recorded gap is a roadmap item and an
unrecorded one is a defect.

---

## Feature 6 — The Claude Code skill — the judgment layer

*Full detail in `F6-spec-claude-code-skill.md` (**not written**) · ADR `F6-ADR-NNN-claude-code-skill.md` (not written) · Tasks in `F6-epics-and-tasks-claude-code-skill.md` (not written)*

F6 is the thin layer that makes G1's "zero manual edits" literally
true, because applying a pack is not purely mechanical and a
deterministic CLI can only stub out the parts that are not. The skill
drives `lintel-harness init` — choosing the pack and scaffolds,
deriving parameter answers from what the repository actually is rather
than from a bare prompt — and then does the work that needs judgment
after the recipe has run: adapting the generated `CLAUDE.md`'s
project-owned prose so it describes the real layout while leaving the
inert pack-owned anchors untouched, redrawing file-ownership tables
against the actual tree, and filling the files the apply deliberately
leaves empty for a human, such as `copy/tone-of-voice.md`. Its surface
narrows with v1.0's scope: **it wraps `init`, and only `init`.** The
other three v1.0 commands — `validate`, `verify` and `pack info` — are
read-only diagnostics a person or CI runs directly and F6 does not
mediate. It is
deliberately last in the sequence — it is a wrapper over a command
whose shape must be settled first, and building it earlier means
writing it twice (Q-1).

---

## Feature Dependencies

### Hard dependencies

| From | To | Reason | Specific gate |
|---|---|---|---|
| F2 | F1 | `init` executes F1's recipe vocabulary and writes F1's manifest | `pack.json` schema, `recipe.json` primitive set and manifest schema Accepted |
| F5 | F1 | Packs and their recipes are authored against the pack format; a format still moving means re-authoring three packs | F1 Accepted, including the anatomy declaration, parameter grammar and scaffold declarations |
| F5 | F2 | A pack is verified by applying it; faithful migration (S6) can only be checked by an apply that round-trips | F2 `init` produces a working project for `coding` |
| F6 | F2 | The skill wraps the CLI; the `init` argument surface, diagnostics and exit classes are its interface | F2's CLI contract Accepted |
| G7 / S7 | F1, F2, F5 | This repo can only be produced from the pack once `coding` exists as a pack with a recipe and `init` can apply it | `packs/coding/recipe.json` authored and `init` runs green against this repo |

### Shared platform changes

| Change | Owner | Required by |
|---|---|---|
| `pack.json` schema — semver, `minCliVersion`, parameters, scaffolds, nine-part anatomy with three-value status. **No `shared` array** (Q-48) | F1 | F2 (resolution, parameter collection, scaffold selection), F5 (three packs declare it) |
| `recipe.json` schema and the **six**-primitive vocabulary (Q-54) | F1 | F2 (executes it), F5 (three packs author one) |
| Six-key manifest schema, `payloadDigest` included | F1 | F2 (writes it); F1's own `verify` (reads it); v1.1's F3 and F4 (read it) |
| Parameter and substitution grammar (`{{harness:param.<id>}}`, conditional selection) | F1 | F2 (substitutes), F5 (`planning`'s calibration depends on it) |
| Inert region anchor form | F1 | F2 (emits into `CLAUDE.md`), F6 (must not disturb them); v1.1's F3 (consumes them) |
| Apply-plan safety rules — path confinement, reserved-destination denylist, journal and rollback. **No consent gate at v1.0**: Q-54 removes the only surface that needed one | F1 | F2 (enforces before any byte lands) |
| Diagnostic taxonomy — `E-`/`W-` codes, exit classes, one message catalogue | F1 | F2 (raises codes), F5 (cites codes), F6 and CI (branch on codes, never on prose) |
| Scaffold interface — declaration plus `--scaffold` composition | F1 | F5 (three scaffold implementations), F2 (selection) |

### Recommended sequencing

**F1 → F2 → F5 → F6.** This replaces the previous
F1 → F2 → F5 → F3 → F4 → F6; steps 4 and 5 leave with Q-42, and the
remaining order is unchanged.

1. **F1 — pack format, recipe & manifest.** Everything else reads or
   writes it, so it is frozen before anything is built against it.
   Freezing it early is also what makes S5 testable: `planning` is
   authored later, against a format that did not move to accommodate
   it. F1 now carries more weight than before — the recipe vocabulary
   is the whole of phase 2's expressiveness, and a pack can only ever
   do what the primitives allow.
2. **F2 — `lintel-harness init`.** The apply engine makes F1 real, and
   it is the feature whose requirements already exist in written form
   as the manual-apply log. Building it second means the format and
   the primitive set are exercised by a working apply **before** three
   packs are authored against them — if a primitive is missing, it is
   cheaper to discover here than after three recipes depend on the set.
3. **F5 — the packs.** Authored against a frozen format and a working
   `init`, in the order `coding` → `writing` → `planning`: `coding`
   first because it is the dogfooding pack and the one S7 depends on,
   `writing` second because a second pack is what tests the format's
   generality, `planning` third because it is the hardest test — the
   only pack whose content varies by an init answer — and therefore the
   one most likely to produce a format finding. S7 becomes reachable
   partway through this step, as soon as `coding` has a recipe.
4. **F6 — the skill.** A wrapper over a stable command, built last so
   it is written once (Q-1). It is also the only feature that can be
   cut without breaking the release gate: S7 is satisfied by the CLI
   alone.

**Ordering caveat.** `planning` may still surface a genuine finding
about the pack format or the primitive set after F1 is Accepted, and
the research is explicit that if the format cannot express calibration
the format should change rather than the pack be flattened. The known
instance of that risk — parameterized content — closed before F5
begins (Q-13). Treat any remaining planning-driven change as an
ordinary F1 amendment with its own version bump, not a sequencing
failure. Budget for one such revision.

---

## Open Questions

Cross-feature only. Feature-specific questions belong in each feature
spec.

**None. Q-1…Q-54 are all resolved** — see Resolved Decisions below and
`project-brief.md` §12. Questions raised during the remaining
specification work take the next free ID, **Q-55**, and are recorded in
the document that raises them.

| # | Question | Owner | Status |
|---|---|---|---|
| — | *No cross-feature question is open.* | — | — |

This is a statement about **questions**, not about readiness. The spec
set has outstanding *work* — the ADR's §6 folds (**F1 to v2.3**, and
§6.5's five out-of-scope corrections, both still open), **a further Mode
A security pass against the folded documents**, two `general/`
documents, the F2 and F6 specs and every epics-and-tasks document —
listed under *Spec-set readiness* above. Those are known tasks, not
undecided questions.

---

## Resolved Decisions

**Q-1…Q-54 are resolved.** The full decision text, date and rationale
for each live in `specifications/project-brief.md` §12, which is
authoritative; they are **not** re-litigated or restated at length
here. The index below exists so a reader can find the right row without
reading all of it, and so the supersession chain is visible in one
place.

Where a decision's rationale is recorded outside the brief's §12, the
**Where** column says so. Nothing was resolved during the writing of
this master spec.

| # | Decision, in one line | Where |
|---|---|---|
| Q-1 | CLI engine owning deterministic mechanics + a thin Claude Code skill owning judgment; CLI first | brief §12 |
| Q-2 | Packs live in `packs/` in this repo, bundled into the published package | brief §12 |
| Q-3 | Per-pack semver + a separate CLI semver; the manifest records both | brief §12 |
| Q-4 | Packs are standalone but may share by explicit `shared/` reference; changing a shared file bumps every referencing pack — **superseded for v1.0 by Q-48, which removes the mechanism; the model returns whole in v1.1** | brief §12 |
| Q-5 | `contribute` emits a patch against `packs/<name>/` — **deferred to v1.1 by Q-42** | brief §12 |
| Q-6 | v1.0 does not improve pack content; cross-pollination lands in the first post-v1.0 bump | brief §12 |
| Q-7 | `CLAUDE.md` is generated with pack-owned marked regions — **amended by Q-45 to inert anchors only** | brief §12 |
| Q-8 | Two backend scaffolds at v1.0; scaffold selection is opt-in and composable | brief §12 |
| Q-8a | The second backend scaffold is AWS (Lambda + CDK), with the IaC-shape residual risk accepted | brief §12 |
| Q-9 | Three packs ship at v1.0 | brief §12 |
| Q-9a | Pack 3 is a planning / product-direction pack; framing deferred to Q-11 | brief §12 |
| Q-9b | Presentation is a shared capability, not a pack — **and defers to v1.1 by Q-28** | brief §12 |
| Q-10 | Marked regions everywhere, `source-only` / `applied-only` — **amended by Q-45; the problem it solved dissolves under Q-39 and Q-46** | brief §12 |
| Q-11 | `planning` is framed as portfolio and roadmap management as a decision loop, calibrated by constraint floor | brief §12 · `research-planning-pack-framing.md` |
| Q-12 | A project holds exactly one pack | brief §12 |
| Q-13 | The format can express content varying by an init answer with no new grammar — conditional selection plus `{{harness:param.<id>}}` | this document (closed by `F1-ADR-001`) |
| Q-14 | `init --adopt` ships at v1.0 — **superseded by Q-44, which drops it** | brief §12 |
| Q-15 | F1 owns both the logic and the surface of Q-4's shared-file bump rule; CI enforces — **inert at v1.0: Q-48 leaves no bump rule to own** | this document (closed by `F1-ADR-001`) |
| Q-16 | Published as `@lintel/harness`; binary `lintel-harness`; Node >= 22 | brief §12 |
| Q-17 | Three scaffolds at v1.0 — `backend-azure`, `backend-aws`, `writing-workstream`; `frontend` and `app` defer | brief §12 |
| Q-18 | `.harness/base/` is committed, with a generated `.gitattributes` — **void: Q-43 deletes `.harness/base/` entirely** | F1 §Resolved Decisions |
| Q-19 | The manifest records a whole-pack integrity hash alongside per-file hashes — **void: Q-43 removes the per-file hash list** | F1 §Resolved Decisions |
| Q-20 | A conditional test is a single equality test only; a pack needing more splits the file | F1 §Resolved Decisions |
| Q-21 | An init-parameter answer cannot be changed after apply at v1.0; apply into a fresh directory | F1 §Resolved Decisions |
| Q-22 | A scaffold cannot be added to or removed from an applied project at v1.0 | F1 §Resolved Decisions |
| Q-23 | `merge-json` is kept and tightened: the only mode permitted on a JSON target, with declared owned keys — **void for v1.0: Q-54 drops the primitive outright, so there is no JSON target, no mode to permit and no owned key to declare. The question returns with the primitive in v1.1** | F1 §Resolved Decisions |
| Q-24 | One `pack.json`; there is no separate `apply.json` | F1 §Resolved Decisions |
| Q-25 | A file the pack no longer ships is reported as orphaned, never deleted — **a v1.1 `update` concern** | F1 §Resolved Decisions |
| Q-26 | Normalization before hashing covers BOM and line endings only, not trailing whitespace | F1 §Resolved Decisions |
| Q-27 | A shared component declares its own multi-destination mappings; a referencing pack inherits and may remap — **inert at v1.0: Q-48 removes the mechanism, so there is no component and no `mappings`** | F1 §Resolved Decisions |
| Q-28 | `shared/presentation` defers to v1.1; no pack references it at v1.0 | brief §12 |
| Q-29 | Authoring `planning` does not violate Q-6 — Q-6 constrains changing existing packs, not adding one | brief §12 |
| Q-30 | `writing` ships no default permission set and no hook; part 8 is declared `absent` with that reason | F5 §Resolved Decisions (default adopted) |
| Q-31 | `writing` migrates its one existing template into a pack-level `templates/` folder; part 3 is recorded as thin. **Q-51 adds exactly two recipe-scaffolding templates on top, which do not count toward part 3** | F5 §Resolved Decisions (default adopted) |
| Q-32 | `planning`'s bet status vocabulary ships marked **provisional**, alongside its provisional role set | F5 §Resolved Decisions (default adopted) |
| Q-33 | The dogfooding site for `packs/planning` is chosen when the pack is authored, not now; the risk is recorded | brief §12 |
| Q-34 | Nothing outside `planning` changes at v1.0; `planning` expresses its non-delegable gate as an abort criterion inside its **own** targets copy. Q-48 removed the shared component the question was about | F5 §Resolved Decisions |
| Q-35 | The `US-N` counter is reconciled by the earlier feature in build order keeping its block; later blocks renumber at the merge | this document · F5 §Resolved Decisions |
| Q-36 | `coding` does not gain a brief template at v1.0; logged against `coding@1.1` | F5 §Resolved Decisions (default adopted) |
| Q-37 | The anatomy declaration is validated by the CLI, with a three-value `status` enum and per-status diagnostics | this document · F1 §User Stories |
| Q-38 | A pack's document templates are copied into the applied project — **superseded by Q-46; under the phase model they stay in the payload** | brief §12 |
| Q-39 | **Applying a pack is two phases** — a verbatim payload copy into `.harness/pack/`, then a pack-specific application | brief §12 · `general/pack-application.md` |
| Q-40 | **Phase 2 is a declarative recipe over a fixed primitive set**, applied automatically by the CLI, and a pure function of (payload, answers) | brief §12 · `general/pack-application.md` |
| Q-41 | **Phase 2 reads the phase-1 copy in the project**, not the bundle; the payload is not user-editable between phases at v1.0 | brief §12 |
| Q-42 | **`update`, `status` and `contribute` defer to v1.1.** F3 and F4 leave v1.0; G3, S3 and R4 defer with them; S7 weakens to apply-only | brief §12 |
| Q-43 | **A minimal manifest ships**: pack, pack version, CLI version, answers, scaffolds. No per-file hash list, no `.harness/base/` — **amended by Q-52, which adds a sixth key, `payloadDigest`** | brief §12 |
| Q-44 | **`init --adopt` is dropped.** Supersedes Q-14 | brief §12 |
| Q-45 | **Marked regions are not implemented at v1.0** — inert anchors only. Amends Q-7 and Q-10 | brief §12 |
| Q-46 | **Manual bootstrap prose is deleted from the pack sources**, because the recipe encodes it. Supersedes Q-38 | brief §12 |
| Q-47 | **A pack's document templates and reference docs stay in the payload** at `.harness/pack/` and are not copied into the project tree. **Properly supersedes Q-38**, whose answer is reversed | brief §12 |
| Q-48 | **The `shared/` mechanism does not ship at v1.0.** No shared tree, no `component.json`, no digest pin, no bump rule, no CI enforcement; `targets` ships as `coding`-local content. Deferred to v1.1 with Q-28. **Supersedes Q-4 for v1.0**, and Q-15 and Q-27 go inert with it | brief §12 |
| Q-49 | **`planning` ships its own copy of the targets contract**, tuned to bets. Its part 9 stays `present` and F5's US-27 keeps a vehicle. Accepted cost: two copies that will drift, booked in F5 as a named v1.1 reconciliation task | brief §12 · F5 §Flows |
| Q-50 | **Every folder an apply creates carries a README** — `README.md` for `coding`/`planning`, `index.md` for `writing`; **`.claude/` and `.harness/` excluded** as tool-owned. No folder is ever empty, so **no `mkdir` primitive and no `.gitkeep`** | brief §12 |
| Q-51 | **The `writing` extraction may author the `index` and `home` templates the source lacks**, recorded as **recipe scaffolding rather than content**. Everything else extracts faithfully | brief §12 |
| Q-52 | **The manifest records a `payloadDigest`** — one tree digest over `.harness/pack/`. **Amends Q-43**; it is a single digest, not the per-file hash list Q-43 rejected, and it is what makes `verify`'s recomputation an assertion rather than a tautology | brief §12 |
| Q-53 | **F1 owns `lintel-harness verify`**, alongside `validate` and `pack info`. The v1.0 command surface is four commands, and this document's list must include `verify` | brief §12 |
| Q-54 | **`merge-json` is dropped from v1.0 — six primitives, not seven.** `.claude/settings.json` is written by nothing; no pack ships a default permission set. The ownable-key allowlist, the destination policy, the leaf-only rule, the consent gate, the security disclosure and their error families are **removed rather than repaired**, and defer to v1.1 with the rest of the settings story. **Supersedes Q-23 for v1.0** and makes the *Determinism* row above true without exception, because `merge-json` was the only primitive taking a fourth input | brief §12 · F5 §Resolved Decisions |

**Counters.** Q-1…Q-54 allocated and all resolved, next free **Q-55**.
US-1…US-38 allocated, next free **US-39** — this master spec owns no
user stories and no acceptance criteria; both live in the feature specs.
The live blocks are F1's US-1…US-4, US-6, US-8…US-10, US-13…US-16 and
US-29…US-33, and F5's US-17…US-21, US-24…US-28 and US-34…US-38. Retired
and never reused: **US-5, US-7, US-11, US-12** (F1) and **US-22, US-23**
(F5, both with the `shared/` mechanism Q-48 removed). Filenames are
feature-prefixed; task IDs use Scheme A (`T-XXYY`, epic-derived).
