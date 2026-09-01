# Lintel Harness Specification — v1.0
**Version:** 1.0.2
**Status:** Draft
**Date:** 2026-09-01
**Platform:** Node.js + TypeScript CLI, published as `@lintel/cli`, binary `lintel`, with **`harness` as a command group** — every v1.0 command is reached as `lintel harness <command>` — `engines.node >= 22` (Q-16 **as amended by Q-63**). Packs are plain files bundled into the published package — no network fetch at init. A thin Claude Code skill under `.claude/skills/` drives the CLI. Target runtime for generated projects is Claude Code's `.claude/` conventions only.
**References:** `specifications/project-brief.md` §12 (Q-1…Q-63, **all resolved**, authoritative; next free **Q-64**, reserved) · `specifications/general/pack-application.md` · `specifications/general/pack-inventory.md` · `specifications/general/system-architecture.md` · `specifications/general/technology-choices.md` · `specifications/general/interaction-model.md` · `specifications/v1.0/F1-spec-pack-format-and-manifest.md` · `specifications/v1.0/F5-spec-template-packs.md` · `specifications/v1.0/research-planning-pack-framing.md` · `packs/coding/specifications/conventions.md` · `specifications/README.md`

**Amendment history**

| Version | Date | Summary |
|---|---|---|
| 1.0.0 | 2026-08-30 | Initial draft. Established v1.0 as the generator release: pack format and manifest, three CLI commands, three template packs plus a shared tree, and the Claude Code skill. |
| 1.0.0 | 2026-08-30 | Cross-document consistency pass across this spec, F1 and F5. Duplicate questions collapsed, questions renumbered to unique project-wide ids, F5's user stories renumbered to US-17…US-28. No new design decisions. |
| 1.0.0 | 2026-08-30 | `F1-ADR-001` amendment pass. Folded the ADR's `PROCEED` into the document set; Q-13 and Q-15 closed; Q-18…Q-27 closed in F1. |
| 1.0.0 | 2026-08-31 | **Two-phase apply and scope rewrite (Q-39…Q-46).** Rewritten in place against the settled model. The apply becomes two phases — a verbatim payload copy, then a declarative recipe over seven primitives run by the CLI. **v1.0 narrows to F1, F2, F5 and F6; F3 (`update`) and F4 (`status`/`contribute`) defer to v1.1, and G3, S3 and R4 defer with them.** S7 weakens to apply-only. The manifest becomes minimal and `.harness/base/` is deleted; `--adopt` is dropped; marked regions reduce to inert anchors; bootstrap prose is deleted from pack sources. Sequencing becomes F1 → F2 → F5 → F6. All open questions close: none remain, next free **Q-47**. |
| 1.0.0 | 2026-08-31 | **`F1-ADR-001` fold (§6.3's seven changes), plus Q-47…Q-53.** The **v1.0 command surface is corrected from "`init` only" to four commands** — `init` (F2) and `validate`, `verify`, `pack info` (F1, per Q-53). **The `shared/` mechanism is removed, not merely unconsumed** (Q-48): it does not ship at v1.0, so the Technical Context row, the Out of Scope bullet, F1's stub and the shared-platform-changes row all drop it; `targets` becomes `coding`-local content and `planning` ships its own copy (Q-49). The forward-investment manifest bullet becomes **six keys**, adding the payload digest (Q-52). A **Technical Context row for Q-50** is added — every created folder carries a README, `.claude/` and `.harness/` excluded, no `mkdir` primitive, no `.gitkeep`. **Q-47…Q-53 are indexed as resolved; next free Q-54.** The US counter is corrected to **next free US-39**. §Spec-set readiness is restated against the rewritten ADR and its `REVISE SPEC` verdict. No new design decisions. |
| 1.0.0 | 2026-08-31 | **`F1-ADR-001` Mode A re-review fold (§6.3 change 8, as overridden by Q-54).** **The primitive set is six, not seven** — `merge-json` is dropped from v1.0 and deferred to v1.1 with the whole settings story (Q-54), so the Introduction, the *Phase 2 form* row, F1's stub and the shared-platform-changes row all drop it. **The determinism narrowing that §6.3 change 8 called for is deliberately NOT applied.** That change existed because `merge-json` took a fourth input — the destination's pre-existing content — and made the purity claim false at exactly one kind of destination. **With `merge-json` gone the claim is true as originally written**, at every applied path, so `verify`'s recomputation identity and the *Determinism* NFR are restated as holding **without exception** rather than qualified. A **Technical Context row for Q-54** is added and the rows implying a settings or consent surface are corrected: no pack writes `.claude/settings.json`, owns a settings key, ships a default permission set, or presents anything at apply time for a user to agree to. **Q-54 is indexed as resolved; next free **Q-56**.** The story counter is unchanged at **next free US-39**. §Spec-set readiness is restated: the security verdict of record is `REVISE-SPEC` from the re-review, F1 folds to v2.3 and F5 to v2.1, and **a further Mode A pass is required against the folded documents.** No new design decisions; this document owns no user stories and no acceptance criteria. |
| 1.0.0 | 2026-08-31 | **Mode A residue pass — condition C-37, one false assertion corrected.** **This row is C-37's disposition on this document**, and `general/pack-inventory.md` §*Dogfooding gap* carries the other half: C-37 found **two dangling references to concepts Q-54 deleted** — this document's assertion about `general/pack-application.md`, corrected below, and the inventory's *"owned keys — Missing"* settings row, which named the `merge-json` ownable-key allowlist and was **deleted rather than repaired**. The §*The settled model* row for `general/pack-application.md` asserted that the document *"still lists seven primitives and still names `.claude/settings.json` as `merge-json`'s worked example"*, and claimed precedence over it on those two points. **That was true when written and is now false:** the document is at **six** primitives, names no settings file anywhere, and carries the Q-54 purity note in full. The assertion and its precedence carve-out are **withdrawn**, here and in the *Phase 2 form* row's source cell, and `pack-application.md` is authoritative again without qualification. Editorial only: **no decision changes, no question opens, and this document still owns no user stories and no acceptance criteria.** Next free question id **Q-55**; next free story id **US-39**. |
| 1.0.0 | 2026-08-31 | **Final security fold — C-42, C-44, C-46, and the gate closed by decision.** The **fourth** Mode A pass (over F1 v2.4 / F5 v2.2) returned **`REVISE-SPEC`** with **3 HIGH, 3 MEDIUM, 4 LOW and no CRITICAL**, and **36 of 38** conditions holding. Three findings land here or on this document's authoritative references. **C-46** — the determinism claim named **two** inputs where F1 names **three**; the Introduction and the *Determinism* row now read *(payload, parameter answers, scaffold selection)*, because a `--scaffold` apply produces a different tree and the two-input form is false of every one of them. **C-44** — condition **C-37** had been folded but was cited by no document; the residue-pass row above is now its **disposition of record**, alongside `general/pack-inventory.md` §*Dogfooding gap*. **C-42** — `general/pack-application.md`, which this document and F1 both call **authoritative**, still stated an **execute-time** read of `.harness/pack/` in its *Reads from* cell and its flowchart, and still said phase 1 *"needs no validation beyond path confinement"*; it is corrected there, and the *settled model* and *Phase 2 input* rows are restated against C-23's plan-time rendering. §*Spec-set readiness* is restated: **the security gate is closed by decision after four review rounds, not by a `SECURITY-PROCEED` verdict**, and **C-47 plus the remaining LOW residue are accepted for v1.0** with their requirements and tests recorded. **No decision changes and no question opens; this document still owns no user stories and no acceptance criteria.** Next free question id **Q-55**; next free story id **US-39**. |
| **1.0.1** | **2026-09-01** | **Q-63 — binary rename.** The binary becomes **`lintel`** with **`harness` as a command group**, and the published package becomes **`@lintel/cli`**; every usage line in this document is now `lintel harness <command>`. Q-16 is **amended, not superseded**, and its §Resolved Decisions row keeps the original terms with a pointer to Q-63; the new row for Q-63 is added beside it. **Nothing else moves:** the command surface is the same size, F1 remains the only message catalogue, no exit class changes, and the F1-side detail — the `lintel:` diagnostic prefix, the re-scoping of `E-CLI-UNKNOWN-COMMAND`, and the missing group-level code recorded as F1 known limit 16 — lands in F1 v2.8 rather than here. **Not folded here and still stale:** the *Release gate* and *v1.0 command surface* rows predate **Q-62**, which returns `update` to v1.0 as F3's. |
| **1.0.2** | **2026-09-01** | **Q-62 fold — `update` ships in v1.0 and F3 returns; only `contribute` stays deferred.** This document was the last one still describing the scope Q-62 reversed, and the stale rows the 1.0.1 row named are folded here along with every other one. **The v1.0 baseline becomes five features — F1, F2, F3, F5, F6** — and the command surface **five commands**: `init`, `update`, `validate`, `verify`, `pack info`. **`status` is not a command**; it is `update`'s read-only mode. **No merge engine is built and none is specified:** the CLI recomputes `expected_old` (the local `.harness/pack/` payload + its recipe + the recorded answers — the identity `verify` already uses, §F1.8) and `expected_new` (the newer bundled payload), then per path **replaces the unedited outright**, **leaves the edited untouched and reports them**, and **never blindly replaces an `adapted` path** (Q-56). The edited paths are reconciled **conversationally by the F6 skill** — Q-1's split on the path Q-57 made primary. **G3, S3 and R4 return to v1.0**; **G4 stays deferred with F4**. **S7 is restored, not weakened**: this repo must be *produced by `lintel harness init coding` **and maintained by `lintel harness update`***, so the release gate now takes an apply **and** an update. **What made this possible is the removal of a blocker, not a change of mind:** Q-42 deferred `update` because a merge needs a base and the answer then was `.harness/base/`, which Q-39/Q-43 deleted because the two-phase model made it unnecessary — the old payload is local and the recipe deterministic, so `expected_old` is recomputable exactly. **Q-42 is not deleted from §Resolved Decisions**; it is marked **superseded in part by Q-62**, and the index gains rows for **Q-55…Q-62**, which it had never carried at all — Q-56, Q-57 and Q-60 among them, all of them scope facts a reader of this document needs. **Sequencing becomes F1 → F2 → F5 → F3 → F6**, restoring the pre-Q-42 order less F4, with F3's position argued rather than inherited. **Also corrected against the repo rather than against another document:** the counters (Q-1…Q-63 resolved, next free **Q-64** reserved — this document's own text still said Q-55), F1's live story block (**US-6 is retired by Q-54** and was still listed as live), and §*Spec-set readiness*, whose claim that `general/system-architecture.md` and `general/technology-choices.md` are "required and unwritten" is false — both exist, as does `general/interaction-model.md`, and all three are now cited in §References. **No new decision is taken here and no question opens:** next free **Q-64**, reserved for the packaging question Q-63 names; next free story id **US-39**; this document still owns no user stories and no acceptance criteria. |

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

**The headline change is the two-phase apply (Q-39).** `lintel harness
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
anything runs. Phase 2's source is the phase-1 copy in the project
(Q-41), never the bundle — **resolved at plan time**: phase 2 renders
entirely from planner-resolved payload bytes and the executor reads
nothing from disk (C-23, `F1-ADR-001` §3.6). It is a **pure function of
(payload, parameter answers, scaffold selection)** — three inputs, the
third because a `--scaffold` apply produces a different tree — with no
timestamps, no ordering dependence, and no environment or network reads.
Two applies of the same pack version with the same answers **and the
same scaffolds** produce byte-identical trees. Determinism is a
requirement, not
a hope: it is what makes "applied correctly every time" testable, and
it is why the manifest can stay minimal.

**A seventh primitive, `merge-json`, was in this set until Q-54 and is
now deferred whole to v1.1**, together with the settings story it
existed for: no v1.0 pack writes `.claude/settings.json`, owns a
settings key, or ships a default permission set. That deletion is worth
one sentence here because it strengthens the paragraph above rather than
qualifying it. **`merge-json` was the only primitive that took a fourth
input** — the destination's pre-existing content — and it was therefore
the one place where "a pure function of (payload, parameter answers,
scaffold selection)" was not literally true. With it gone the claim
**holds at every applied
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

### What v1.0 solves, and the one thing it does not — stated plainly

The brief opens by arguing that copy-paste fails **because it cannot be
updated**, and §7 chose managed apply to solve exactly that. **v1.0
answers both halves of that problem, less the return path.**

**`update` ships at v1.0 (Q-62), and F3 returns with it.** An applied
project can pull a newer pack version and see exactly what changed, and
`status` is not a separate command — it is `update` reporting without
writing. **G3, S3 and R4 are back in v1.0**, and **S7 is restored to
both its halves**: this repo must be produced by `init` *and* maintained
by `update`.

**What is deferred is one thing, and it is named exactly: `contribute`,
as F4, and G4 with it.** An improvement made in a project still reaches
the pack only by hand-editing `packs/<name>/`. That remains a deliberate
narrowing, and it should not be softened in downstream documents.

**`update` builds no merge engine, and that is the decision, not a
shortfall.** The CLI recomputes `expected_old` — the local
`.harness/pack/` payload, its recipe and the recorded answers, which is
the identity `verify` already computes — and `expected_new` from the
newer bundled payload. Per applied path: **unedited is replaced
outright**, **edited is left untouched and reported**, and an
**`adapted`** path (Q-56 — the generated `CLAUDE.md` in every pack) is
**never blindly replaced**, because being edited is its declared
purpose. There are no conflict markers and no three-way merge. The
edited paths are reconciled **conversationally, by the F6 skill** —
Q-1's split applied one layer further along, on the path Q-57 made
primary. The shape follows the evidence rather than a preference: the
dogfooding pass found 12 of 16 applied files byte-identical, so a merge
engine would have been built for the minority case.

**Q-42's blocker is what disappeared, and it is worth stating so this
does not read as a reversal of judgment.** Q-42 deferred `update`
because a merge needs a base and the answer then was `.harness/base/` —
a cached-bytes store with a `.gitattributes` problem and its own
integrity conditions. Q-39 and Q-43 deleted that store precisely because
the two-phase model made it unnecessary: the old payload is **local** and
the recipe is **deterministic**, so `expected_old` is recomputable
exactly. **`verify` is most of `update`.**

Two pieces of what v1.0 recorded as forward investment are therefore
**consumed by a shipping feature** rather than held for v1.1:

- **The minimal manifest** (Q-43, as amended by Q-52) records **six**
  things: manifest version, CLI version, pack identity, a single
  **payload digest** over `.harness/pack/`, parameter answers and chosen
  scaffolds — enough for `update` to know what was applied and recompute
  the expected tree. There is still no per-file hash list and
  no `.harness/base/` store; with the pack local at `.harness/pack/` and
  a deterministic recipe, applied state is recomputable from payload +
  recipe + answers. The digest is what stops that recomputation being a
  tautology: without it, a hand-edited payload reproduces itself
  faithfully and reads as clean, so `verify` could not say which side
  moved. It is one field and one tree walk, and because it is a pure
  function of the payload, determinism is untouched.
- **Inert region anchors** (Q-45) are emitted into the generated
  `CLAUDE.md` so `update` can find pack-owned regions. No
  region parser, no region hashes, no malformed-marker diagnostics and
  no tamper detection ship at v1.0 — `update` does not need them,
  because it classifies a path by recomputation rather than by reading
  markers. Anchors are near-free now and expensive to retrofit, and
  they are what marks the project-owned prose in the one path Q-56
  declares `adapted`.

**The one genuine piece of forward investment left is the recomputation
identity pointed the other way** — from project back to pack — which is
what `contribute` will need and what nothing at v1.0 uses.

### The settled model

Four cross-cutting reference documents in `general/` describe the model
this specification is written against. **Where any older document
disagrees with them, they win** — and two of them were written or
re-derived **after** Q-62, so they are also the closest thing the set
has to a worked account of what `update` is:

| Document | Covers |
|---|---|
| [`../general/pack-application.md`](../general/pack-application.md) | The two-phase apply — the phase table, the init flowchart, the **six**-primitive recipe set, the determinism requirement, and what the coding pack's recipe encodes. **Corrected 2026-08-31 and now agreeing with this document on every point:** it lists six primitives, names no settings file, and carries the Q-54 purity note in full. An earlier edition of this row said it still listed seven and still used `.claude/settings.json` as a worked example, and claimed precedence over it on those two points; that assertion was **true when written and is now false**, so the precedence carve-out is withdrawn (**C-37**). **Corrected again 2026-08-31 for C-42 and C-46, which is what makes "agreeing on every point" true rather than asserted:** the document's *Reads from* cell and its flowchart's phase-2 node still described an **execute-time** read of `.harness/pack/`, the reading `F1-ADR-001` §3.6 ruled out under C-23; both now state plan-time rendering and an executor that reads nothing from disk. Its phase-1 sentence *"needs no validation beyond path confinement"* is replaced by the bounds F1 US-30 actually applies. Its determinism claim now names **three** inputs. The document is authoritative without qualification |
| [`../general/pack-inventory.md`](../general/pack-inventory.md) | The three packs file by file, per-file phase metadata (P1 / P2 / P1+P2), applied trees, versions, the anatomy matrix, and this repo's dogfooding gap |
| [`../general/system-architecture.md`](../general/system-architecture.md) | The whole-system view against the **five-feature baseline F1, F2, F3, F5, F6** — the component map, the CLI/skill seam, and §4's `update` row, which states the replace-or-hand-over shape in full. **Written against Q-62** and therefore ahead of this document until this fold; its companion `technology-choices.md` carries the stack and records that its own body predates Q-62 |
| [`../general/interaction-model.md`](../general/interaction-model.md) | What a person actually does — the conversational entry point (Q-57) and the CLI one, the faithful-disclosure obligation, and **§11's enumeration of the five commands** with owner, write behaviour, lock and exit classes. **Written against Q-62.** Its §12 reconciliation notes are the record of what the rest of the set still had to fold, including the `E-CLI-UNKNOWN-COMMAND` list this pass fixes in F1 |

### The release gate

**S7 / G7: this repo must itself be produced by `lintel harness init
coding` and maintained by `lintel harness update`, with no
hand-applied files left. Until that holds, v1.0 has not shipped.** S7
stands in **both** its halves. Q-42 had weakened it to apply only when
F3 left v1.0; **Q-62 restores it, and the restoration is the strong
form, not a softened one** — demonstrating the gate takes an apply
**and** an update, not an apply alone.

The gate is reachable in two steps rather than one, and the second is
new. `pack-inventory.md` records what
this repo has today against what a proper apply would produce:
`AgentTeams/` and `targets/Run.md` were deleted when they were believed
to be payload, and under Q-39 they are phase-2 artifacts that come back
the moment the recipe runs. Nothing was lost. **Step one:** author
`recipe.json` for `packs/coding`, then apply it here — `.harness/`
absent is the single outstanding item. **Step two:** bump `coding` and
land the bump here through `lintel harness update`, which is what the
restored half of S7 asks for and what no apply on its own can
demonstrate.

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
  fourth and final Mode A pass (2026-08-31, over F1 v2.4 and F5 v2.2).**
  It found **3 HIGH, 3 MEDIUM, 4 LOW and no CRITICAL**, with **36 of 38**
  conditions holding. **Four rounds, and the trajectory is the argument:**
  2 CRITICAL → 2 CRITICAL → 0 CRITICAL / 2 HIGH → 0 CRITICAL / 3 HIGH,
  with conditions holding rising 24/31 → 36/38. **Q-54 answered the
  largest part of the second round by deletion rather than by repair:**
  `merge-json` was the target of both CRITICALs, of both lapses of C-16
  and of the newly found rollback defect, and dropping it removed the
  surface instead of hardening it.
- **The HIGH and MEDIUM findings of that final pass are folded.** F1
  carries C-39/C-40/C-41/C-43/C-45/C-48 at **v2.5**; F5 carries the
  agent-frontmatter and reserved-destination corrections at **v2.3**;
  this document and the two `general/` references carry **C-42, C-44 and
  C-46**, recorded in the amendment row above. The earlier rounds'
  folds are complete and verified rather than assumed: §6.1 changes
  17–27 at F1 v2.3, §6.2 changes 12–16 at F5 v2.1, §6.3 change 8 here as
  adjusted by Q-54, and §6.5's five out-of-scope corrections discharged
  by the owners of `general/pack-application.md`,
  `general/pack-inventory.md` and the brief §12.
- **The security gate is closed by decision, after four review rounds —
  not by a `SECURITY-PROCEED` verdict, which no revision of this set has
  ever carried.** State it plainly and do not let a later reader mistake
  it for a clean pass: the final verdict of record is `REVISE-SPEC`.
  **C-47 and the remaining LOW residue are accepted for v1.0**, with
  their requirements and their tests recorded rather than waived, and
  they are implementation obligations, not closed items. What the
  decision rests on is the trajectory above and the fact that the fourth
  round found nothing CRITICAL and nothing that changes the
  architecture — not on a reviewer's clearance.
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
  green disposition table is not evidence. **Both are in place, and the
  two rounds since have not repeated the failure** — the fixture set is
  specified in F1 and grew with each round, and rounds three and four
  found no lapsed condition. That, not a verdict, is what the closed gate
  rests on.
- **No epics-and-tasks document exists** for any feature.
- **F2, F3 and F6 have no feature spec.** Only F1 and F5 have one, and
  **F3's absence is the newest of the three** — Q-62 returns `update` to
  v1.0 and records that cost explicitly rather than discovering it later.
  F3's spec has more of its groundwork already written than F2's or F6's
  did: the recomputation identity is F1 §F1.8, the per-path states are
  Q-56's closed four, and `general/interaction-model.md` §11.3 records
  the constraints that bind whatever F3 decides about its flags.
- **`general/system-architecture.md`, `general/technology-choices.md`
  and `general/interaction-model.md` now exist.** An earlier edition of
  this bullet said the first two were "required and unwritten"; that was
  true when written and is **false against the repo** — all three are
  present, dated 2026-09-01, and the first and third are written against
  Q-62. **One qualification stands and is recorded rather than dropped:**
  `technology-choices.md` says in its own header that its body predates
  Q-62 and has not been re-derived against it, so it is current on the
  stack and not yet on the scope.

The ADR's §6 folds are complete — F1 at v2.5, F5 at v2.4, this document
as amended, and §6.5's five corrections discharged by their owners — and
the security gate is closed on the terms above. **What still blocks
implementation is everything else in this section:** F2, F3 and F6 must
have specs, every feature must have an epics-and-tasks document,
`technology-choices.md` must be re-derived against Q-62, and **C-47 and
the accepted LOW residue must be carried into those documents as
requirements with tests**, since accepting a finding for v1.0 is a
commitment to build it, not a decision to forget it. **The `general/`
documents are no longer on this list** — all five exist.

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
| Phase 2 form | A **declarative recipe** over **six** fixed primitives — `copy`, `rename`, `strip-suffix`, `rewrite-path`, `substitute`, `generate` — applied automatically by the CLI, never by the user. A new kind of step requires a new primitive in the CLI, deliberately | Q-40 as narrowed by Q-54 · `general/pack-application.md`, which says six and agrees |
| Settings and permissions | **No pack writes `.claude/settings.json` at v1.0.** `merge-json` is dropped: six primitives, not seven. No pack owns a settings key, ships a default permission set, or produces anything at apply time for a user to agree to — there is no settings grant, no disclosure of one and no gate on one, because there is no route by which a pack reaches a settings file. The ownable-key allowlist, the destination policy, the leaf-only rule and their error families are **removed rather than repaired**, and the whole settings story defers to v1.1 | Q-54 — F5's three settings steps were never valid recipes (no `from`, no owned key, no settings source file in any payload), so `merge-json` had no v1.0 consumer while carrying the format's largest attack surface. It was the target of both CRITICALs in the Mode A re-review, of both lapses of C-16, and of the newly found rollback defect. **R5's "sensible default permissions" waits for v1.1** and F5 records it as a fourth shortfall |
| Phase 2 input | Phase 2's source is the **phase-1 copy in the project**, never the bundle — and it is **resolved at plan time**: phase 2 renders from planner-held payload bytes and performs **no read during execution** (C-23). `.harness/pack/` is phase 2's *logical* input and its *literal* input only at `verify`. This is what makes "the user cannot adjust the payload between phases" true rather than aspirational | Q-41 as settled by `F1-ADR-001` §3.6 · `general/pack-application.md` |
| Determinism | The recipe is a pure function of **(payload, parameter answers, scaffold selection)** — **three** inputs. No timestamps, ordering dependence, environment or network reads, and no execute-time filesystem read (C-23). Same pack version + same answers + same scaffolds ⇒ byte-identical trees. **This holds at every applied path, with no exception** — `merge-json` was the one primitive taking a fourth input (the destination's pre-existing content), and Q-54 removes it, so the claim needs no qualifier and `verify`'s recomputation identity is universal | Q-40, Q-54 · **C-46**: this row and `general/pack-application.md` both named only two inputs, which is false of any `--scaffold` apply; F1 §NFR *Determinism* has the authoritative three-input form |
| Planning before writing | Validation, both phases and the manifest are computed in memory; a journal is written; only then do bytes land. Failure in either phase rolls back, and rollback never deletes a pre-existing file | Q-39 · `general/pack-application.md` |
| v1.0 command surface | **Six commands, all under the `harness` group** (Q-63, `F6-ADR-005`). **`skill install` is the third writing command.** **Two write:** `init` (F2) is the apply and `update` (F3) is the move to a newer pack version. **Three never write:** `validate`, `verify` and `pack info` (F1) read a pack or a manifest and take no lock. **`status` is not a command** — it is `update`'s read-only mode. `contribute` alone defers to v1.1 with F4 | Q-62 (returns `update`, folds in `status`, keeps `contribute` deferred), Q-53, Q-63 · `general/interaction-model.md` §11 enumerates the five · F1's `E-CLI-UNKNOWN-COMMAND` list is corrected to `init, update, validate, verify, pack` in the same pass as this row |
| Command ownership | **F1 owns the three read-only commands; F2 owns the apply and nothing else; F3 owns `update` and its read-only mode.** `verify` sits with `validate` and `pack info` because all three are the same class of read-only question over the same machinery, and F1 defines the recomputation identity that `verify` answers **and that `update` consumes a second time** — once for `expected_old`, once for `expected_new` | Q-53, Q-62 |
| Keeping a project current | **`update` ships at v1.0 and builds no merge engine.** Recompute `expected_old` (local payload + recipe + recorded answers) and `expected_new` (newer bundled payload); classify per applied path; **replace the unedited outright**, **leave the edited untouched and report them**, and **never blindly replace an `adapted` path** (Q-56). **No conflict markers, no three-way merge.** The edited paths are reconciled **conversationally by the F6 skill**, not by the CLI | **Q-62** (reverses Q-42 for F3) — Q-42's blocker was that a merge needs a base and the answer then was `.harness/base/`, which Q-39/Q-43 deleted because the two-phase model made it unnecessary. The payload is local and the recipe deterministic, so `expected_old` is recomputable exactly and **`verify` is most of `update`**. The dogfooding pass found 12 of 16 applied files byte-identical, so a merge engine would serve the minority case; the remainder is judgment, which is Q-1's half of the split on the path Q-57 made primary · `general/system-architecture.md` §4 |
| Manifest | **Six keys**: manifest version, CLI version, pack identity, **`payloadDigest`** (one tree digest over `.harness/pack/`, serialized between `pack` and `parameters`), parameter answers, chosen scaffolds. **No per-file hash list and no `.harness/base/` store** | Q-43 (supersedes Q-18, Q-19), amended by Q-52 |
| Adoption of hand-applied trees | **`init --adopt` is dropped.** A clean `init` loses nothing once bootstrap prose is gone | Q-44 (supersedes Q-14) |
| Source vs applied content | **No marked regions at v1.0.** The generated `CLAUDE.md` emits **inert region anchors**; no parser, region hashes, malformed-marker diagnostics or `E-REGION-TAMPERED`. **The anchors stay inert even though `update` now ships** (Q-62): F3 classifies a path by recomputation, not by reading markers, so what the anchors mark is where **F6's** judgment goes | Q-45 (amends Q-7, Q-10), Q-62 |
| Bootstrap prose | **Deleted from the pack sources.** "Copy this folder", "rename the template", "fix the paths" and "adopting this in a new project" come out of `packs/coding/**` entirely — the recipe encodes them, so they are dead content. This is also why phase 1 can copy verbatim | Q-46 (supersedes Q-38) |
| Recipe requirement source | The nine-step manual-apply log in `CLAUDE.md` §Dogfooding **is** the coding pack's recipe. Each hand step maps to a declared primitive; the two README-rewrite steps map to none, because under Q-46 they no longer happen | Q-46 · `general/pack-application.md` |
| Execution split | Node/TypeScript CLI owns the deterministic mechanics; a thin Claude Code skill owns the judgment steps | Q-1 |
| Build order across the split | CLI first, skill last — the apply engine is the load-bearing risk; the skill is a wrapper | Q-1 |
| Package, binary, runtime floor | Published as `@lintel/cli`; binary `lintel`; **command group `harness`**; `engines.node >= 22` | Q-16 · Q-63 |
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
| Release gate | **S7, in full:** this repo is **produced by `lintel harness init coding` and maintained by `lintel harness update`**, with no hand-applied files left. Demonstrating it takes an apply **and** an update, not an apply alone | **Q-62**, which restores the criterion Q-42 had weakened to apply-only. The `+ update` half is back because F3 is |

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
- **An applied project can move to a newer pack version**: unedited
  paths are replaced, edited paths are left untouched and reported, and
  the owner is never forced to choose between the update and their
  customisations. [G3, R4, S3, Q-62]
- **An applied project can be asked what an update would change,
  without writing anything** — `update`'s read-only mode, which is what
  S4 asks for and is not a separate command. [S4, Q-62]
- **This repo is itself produced by `lintel harness init coding` and
  maintained by `lintel harness update`, with no hand-applied files
  left.** This is the release gate, not a stretch goal, and it takes an
  apply **and** an update. [G7, S7 restored by Q-62]

**Deferred to v1.1 with F4 (Q-62 keeps this half of Q-42's deferral):**
**G4** (improvements flow back) and **Q-5's contribute-back path**. That
is the whole of the deferral — **G3, R4, S3 and S4 are v1.0 goals
above**, because `update` ships. G4 is the one goal in the brief §4
table that v1.0 does not answer, and it is not restated as a v1.0 goal
anywhere in this document.

---

## Out of Scope (v1.0)

- **`contribute`.** Deferred to v1.1 as F4, and **G4 with it** (Q-62
  keeps this half of Q-42's deferral). An improvement made in a project
  reaches the pack only by hand-editing `packs/<name>/`. **`update` is
  not on this list** — it ships, as F3 — and **`status` is not on it
  either**, because it is not a command: it is `update`'s read-only
  mode.
- **A merge engine, in any form.** No three-way merge, no conflict
  markers, no patch emission, no per-hunk resolution. This is not a
  deferral of `update`'s hard case; it is `update`'s **design** (Q-62):
  an edited path is handed to the F6 skill to reconcile in conversation,
  never blended by the CLI. `.harness/base/` and per-file hashes stay
  removed outright — the deterministic recipe makes them unnecessary
  rather than merely postponed (Q-43), which is exactly why `update`
  could return without them.
- **Region parsing, region hashes, tamper detection and marked-region
  grammar.** Only inert anchors ship (Q-45). `update` classifies by
  recomputation, not by reading markers, so it does not need them.
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

*Full detail in [`F1-spec-pack-format-and-manifest.md`](F1-spec-pack-format-and-manifest.md) · ADR [`F1-ADR-001-pack-format-and-manifest.md`](F1-ADR-001-pack-format-and-manifest.md) — **rewritten 2026-08-31 against the two-phase model; the 2026-08-30 `PROCEED` predates Q-39…Q-46 and is void** · Tasks in `F1-epics-and-tasks-pack-format-and-manifest.md` (not written)*

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

## Feature 2 — `lintel harness init` — the two-phase apply engine

*Full detail in `F2-spec-init-apply-engine.md` (**not written**) · ADR `F2-ADR-NNN-init-apply-engine.md` (not written) · Tasks in `F2-epics-and-tasks-init-apply-engine.md` (not written) · Model in [`../general/pack-application.md`](../general/pack-application.md)*

F2 is the one command that takes a directory to a working project: it
resolves the named pack from the bundle, validates `pack.json` and
`recipe.json`, collects parameter answers from `--set` flags or
prompts, plans both phases and the manifest **entirely in memory**,
writes a journal, and only then lands bytes — copying the pack verbatim
into `.harness/pack/` (phase 1) and then writing phase 2's output — the
pack's recipe, rendered at plan time from the payload the planner
resolved, not re-read from disk (C-23) — to produce `.claude/`, `AgentTeams/`,
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

## Feature 3 — `lintel harness update` — move a project to a newer pack version

*Feature spec `F3-spec-update.md` (**not written**) · ADR `F3-ADR-NNN-update.md` (not written) · Tasks in `F3-epics-and-tasks-update.md` (not written) · Shape in [`../general/system-architecture.md`](../general/system-architecture.md) §4 and [`../general/interaction-model.md`](../general/interaction-model.md) §9 and §11.3*

F3 is the half of the product copy-paste cannot do, and **Q-62 returns
it to v1.0** after Q-42 had deferred it. It moves an applied project to
a newer version of the pack it already applied — never to a different
pack — and it **builds no merge engine**. It recomputes `expected_old`
from the local `.harness/pack/` payload, its recipe and the answers the
manifest records, and `expected_new` from the newer bundled payload;
that recomputation is **F1's identity, the one `verify` already
performs**, which is why `verify` is most of `update` and why F3 is a
smaller feature than its name suggests. It then classifies every applied
path and acts: **unedited is replaced outright and silently**, **edited
is left untouched and reported**, and a path the pack declared
**`adaptExpected`** (Q-56 — the generated `CLAUDE.md` in all three
packs) is **never blindly replaced**, because being edited is its
declared purpose. There are no conflict markers and no three-way merge;
the edited paths are handed to F6 and reconciled **in conversation**,
which is Q-1's split applied to the case a deterministic engine cannot
answer. **`status` is F3's read-only mode**, not a separate command: the
same classification, reported without writing, which is what S4 asks
for. Its acceptance is S3, and its harder acceptance is the restored
half of S7 — this repo must be *maintained by* `update`, not merely
produced by `init`.

**F3 has no spec, and that is the recorded cost of Q-62.** More of its
groundwork exists than F2's or F6's did at the same point: the identity
is F1 §F1.8, the per-path states are Q-56's closed four (`match`,
`adapted`, `differs`, `missing`), and `general/interaction-model.md`
§11.3 records the constraints that bind whatever F3 decides about its
flags, its failure contract and whether it emits a pre-write disclosure.
Those are **open items inside a settled shape**, not open questions —
none of them is a Q.

---

## Feature 4 — `contribute` · **v1.1, not in this release**

*Deferred by Q-42, and **kept deferred by Q-62**, which returned F3 alone. No v1.0 spec, ADR or tasks.*

**v1.1.** `contribute` emits a patch against `packs/<name>/` so an
improvement found in a project has a deliberate route back (G4, Q-5).
It is **F1's recomputation identity pointed the other way** — project
back to pack — and it is the one piece of that identity nothing at v1.0
consumes. **`status` is no longer part of F4**: Q-62 folds it into F3's
read-only mode rather than shipping it as a command, so F4's whole
remaining subject is the return path. It depends on F3, which is now
**in v1.0** rather than beside it in v1.1, so v1.1 adds a direction to a
mechanism that already ships rather than building both at once. **The
number F4 is reserved and will not be reused.**

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
drives `lintel harness init` — choosing the pack and scaffolds,
deriving parameter answers from what the repository actually is rather
than from a bare prompt — and then does the work that needs judgment
after the recipe has run: adapting the generated `CLAUDE.md`'s
project-owned prose so it describes the real layout while leaving the
inert pack-owned anchors untouched, redrawing file-ownership tables
against the actual tree, and filling the files the apply deliberately
leaves empty for a human, such as `copy/tone-of-voice.md`. **It wraps
the two writing commands, `init` and `update`** — the two with judgment
work on the far side of them. After an `update` its job is the one the
CLI deliberately stops at: **reconciling the edited paths
conversationally** with the owner, path by path, which is the case Q-62
declined to build a merge engine for. The three read-only commands —
`validate`, `verify` and `pack info` — are diagnostics a person or CI
runs directly, as is `update`'s read-only mode, and F6 mediates none of
them (Q-53). It is deliberately last in the sequence — it is a wrapper
over two commands whose shapes must be settled first, and building it
earlier means writing it twice (Q-1). **What Q-62 changed about F6 is
that cutting it is no longer free:** S7 now requires this repo to be
*maintained by* `update`, and an `update` without F6 leaves every edited
path unreconciled.

---

## Feature Dependencies

### Hard dependencies

| From | To | Reason | Specific gate |
|---|---|---|---|
| F2 | F1 | `init` executes F1's recipe vocabulary and writes F1's manifest | `pack.json` schema, `recipe.json` primitive set and manifest schema Accepted |
| F5 | F1 | Packs and their recipes are authored against the pack format; a format still moving means re-authoring three packs | F1 Accepted, including the anatomy declaration, parameter grammar and scaffold declarations |
| F5 | F2 | A pack is verified by applying it; faithful migration (S6) can only be checked by an apply that round-trips | F2 `init` produces a working project for `coding` |
| F3 | F1 | `update` recomputes `expected_old` and `expected_new` using **F1's identity, not its own** — payload + recipe + recorded answers, the same one `verify` performs — and reads F1's manifest for the answers and the applied pack version. It also consumes Q-56's `adaptExpected`, which F1 owns | F1 Accepted, specifically §F1.8's recomputation identity, the six-key manifest and the closed four-state `verify` enumeration |
| F3 | F2 | `update` operates on a project **that has been applied**. It has no meaning against a directory with no `.harness/manifest.json` and no `.harness/pack/`, and the payload it recomputes `expected_old` from is exactly what F2's phase 1 wrote | F2 `init` produces a manifest and a `.harness/pack/` payload that `verify` reads green |
| F6 | F2 | The skill wraps the CLI; the `init` argument surface, diagnostics and exit classes are its interface | F2's CLI contract Accepted |
| F6 | F3 | The skill wraps **both** writing commands. The conversational reconciliation of edited paths is the work `update` deliberately stops short of, so F6 cannot be written against `init` alone without being written twice | F3's CLI contract Accepted, including how it reports an edited path |
| G7 / S7 | F1, F2, F3, F5 | This repo can only be **produced** from the pack once `coding` exists with a recipe and `init` can apply it, and can only be **maintained** by it once `update` exists — S7 as restored by Q-62 has both halves | `packs/coding/recipe.json` authored, `init` runs green against this repo, **and** a `coding` version bump lands here through `lintel harness update` |

### Shared platform changes

| Change | Owner | Required by |
|---|---|---|
| `pack.json` schema — semver, `minCliVersion`, parameters, scaffolds, nine-part anatomy with three-value status. **No `shared` array** (Q-48) | F1 | F2 (resolution, parameter collection, scaffold selection), F5 (three packs declare it) |
| `recipe.json` schema and the **six**-primitive vocabulary (Q-54) | F1 | F2 (executes it), F5 (three packs author one) |
| Six-key manifest schema, `payloadDigest` included | F1 | F2 (writes it); F1's own `verify` (reads it); **F3 (reads it — the recorded answers are an input to `expected_old`, and the pack version is what "newer" is measured against)**; v1.1's F4 (reads it) |
| The recomputation identity — applied state = payload + recipe + recorded answers — and `verify`'s closed four-state enumeration `match \| adapted \| differs \| missing` (Q-56) | F1 | F1's own `verify`; **F3, which runs it twice per update — once over the local payload for `expected_old`, once over the newer bundled payload for `expected_new` — and which is why `update` needs no merge base** |
| Parameter and substitution grammar (`{{harness:param.<id>}}`, conditional selection) | F1 | F2 (substitutes), F5 (`planning`'s calibration depends on it) |
| Inert region anchor form | F1 | F2 (emits into `CLAUDE.md`), F6 (must not disturb them, and adapts the prose between them); **F3 only indirectly — it classifies by recomputation, not by parsing anchors, so the anchors mark where F6's judgment goes rather than driving the CLI** |
| Apply-plan safety rules — path confinement, reserved-destination denylist, journal and rollback. **No consent gate at v1.0**: Q-54 removes the only surface that needed one | F1 | F2 (enforces before any byte lands) |
| Diagnostic taxonomy — `E-`/`W-` codes, exit classes, one message catalogue | F1 | F2 (raises codes), **F3 (raises codes, and `E-CLI-UNKNOWN-COMMAND`'s command list must name `update`)**, F5 (cites codes), F6 and CI (branch on codes, never on prose) |
| Scaffold interface — declaration plus `--scaffold` composition | F1 | F5 (three scaffold implementations), F2 (selection) |

### Recommended sequencing

**F1 → F2 → F5 → F3 → F6.** This replaces
F1 → F2 → F5 → F6, which was itself the pre-Q-42 order
F1 → F2 → F5 → F3 → F4 → F6 with two steps removed. **F3 returns to the
position it held, and F4's step does not come back** (Q-62).

**Why F3 sits fourth and not earlier**, stated rather than inherited:

- **It cannot precede F1**, for the same reason nothing can. Its whole
  mechanism is F1's — the recomputation identity, the manifest it reads
  the answers out of, `verify`'s closed four-state enumeration and
  Q-56's `adaptExpected`. F3 adds no identity of its own; it runs F1's
  twice and compares the results.
- **It cannot precede F2**, because there is nothing to update. `update`
  is defined over an applied project: it needs a manifest, and it needs
  the `.harness/pack/` payload that phase 1 wrote, which is the input
  `expected_old` is recomputed from. Building it before an apply exists
  means testing it against a state only a fixture can produce, which is
  the weakest possible evidence for the one feature whose whole job is
  reading what a previous run wrote.
- **It should not precede F5**, and this is the step of the argument
  that is not forced by a hard dependency. `update` is exercised by
  moving a **real pack from one version to the next**, and until F5 has
  authored the packs there is no version to move between and no
  `adaptExpected` declaration to honour — all three packs set it on
  their `CLAUDE.md` `generate` step, and that path is the one case
  `update` must not blindly replace. Building F3 against fixture packs
  would test the classifier and skip the case the design turns on.
- **It must precede F6**, which is the change from the previous order.
  F6 wraps **both** writing commands, so building it before `update`
  exists means writing it once for `init` and again for the
  reconciliation, which is the exact cost step 5's "written once"
  argument exists to avoid.

1. **F1 — pack format, recipe & manifest.** Everything else reads or
   writes it, so it is frozen before anything is built against it.
   Freezing it early is also what makes S5 testable: `planning` is
   authored later, against a format that did not move to accommodate
   it. F1 now carries more weight than before — the recipe vocabulary
   is the whole of phase 2's expressiveness, and a pack can only ever
   do what the primitives allow. **Q-62 adds weight rather than
   scope:** §F1.8's recomputation identity now has two consumers
   instead of one, so it is a contract rather than an internal detail
   of `verify`.
2. **F2 — `lintel harness init`.** The apply engine makes F1 real, and
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
   one most likely to produce a format finding. **The apply half of S7
   becomes reachable partway through this step**, as soon as `coding`
   has a recipe; the maintain half waits for step 4.
4. **F3 — `lintel harness update`.** Built against a frozen format, a
   working apply and real packs with real versions, so the first update
   it performs is a genuine one rather than a fixture's. It is smaller
   than its position suggests — `verify` is most of it — and it is
   built before the skill because the skill wraps it. **It closes the
   release gate**: S7's restored second half needs a `coding` bump to
   land in this repo through `update`.
5. **F6 — the skill.** A wrapper over two stable commands, built last
   so it is written once (Q-1). **It is no longer the feature that can
   be cut for free.** The previous edition of this step said S7 was
   satisfied by the CLI alone; under the restored S7 that is only half
   true — the CLI can perform the update, but every path the update
   reports as edited is left for the skill to reconcile, so cutting F6
   ships a release gate that passes mechanically and leaves the
   reconciliation to the user by hand.

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

**None. Q-1…Q-63 are all resolved** — see Resolved Decisions below and
`project-brief.md` §12. Questions raised during the remaining
specification work take the next free ID, **Q-64**, which is **reserved
for the packaging question Q-63 names** — whether later tools are built
into `@lintel/cli` or loaded as plugins — and are recorded in the
document that raises them.

| # | Question | Owner | Status |
|---|---|---|---|
| — | *No cross-feature question is open.* | — | — |

This is a statement about **questions**, not about readiness. The spec
set has outstanding *work* — two `general/` documents, the F2 and F6
specs, every epics-and-tasks document, and **C-47 plus the accepted LOW
residue to carry forward as requirements with tests** — listed under
*Spec-set readiness* above. The ADR's §6 folds and the security review
rounds are **complete**; the gate is closed by decision rather than by a
`SECURITY-PROCEED` verdict, which is recorded there and in the ADR.
Those are known tasks, not undecided questions.

---

## Resolved Decisions

**Q-1…Q-63 are resolved.** The full decision text, date and rationale
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
| Q-5 | `contribute` emits a patch against `packs/<name>/` — **deferred to v1.1 by Q-42, and kept deferred by Q-62**, which returned F3 alone. This is the one part of the maintenance story v1.0 does not answer | brief §12 |
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
| Q-16 | Published as `@lintel/harness`; binary `lintel-harness`; Node >= 22 — **amended by Q-63**, which makes the package `@lintel/cli`, the binary `lintel` and `harness` a command group. The original terms are kept here because Q-63 amends Q-16 rather than replacing it | brief §12 |
| Q-17 | Three scaffolds at v1.0 — `backend-azure`, `backend-aws`, `writing-workstream`; `frontend` and `app` defer | brief §12 |
| Q-18 | `.harness/base/` is committed, with a generated `.gitattributes` — **void: Q-43 deletes `.harness/base/` entirely** | F1 §Resolved Decisions |
| Q-19 | The manifest records a whole-pack integrity hash alongside per-file hashes — **void: Q-43 removes the per-file hash list** | F1 §Resolved Decisions |
| Q-20 | A conditional test is a single equality test only; a pack needing more splits the file | F1 §Resolved Decisions |
| Q-21 | An init-parameter answer cannot be changed after apply at v1.0; apply into a fresh directory | F1 §Resolved Decisions |
| Q-22 | A scaffold cannot be added to or removed from an applied project at v1.0 | F1 §Resolved Decisions |
| Q-23 | `merge-json` is kept and tightened: the only mode permitted on a JSON target, with declared owned keys — **void for v1.0: Q-54 drops the primitive outright, so there is no JSON target, no mode to permit and no owned key to declare. The question returns with the primitive in v1.1** | F1 §Resolved Decisions |
| Q-24 | One `pack.json`; there is no separate `apply.json` | F1 §Resolved Decisions |
| Q-25 | A file the pack no longer ships is reported as orphaned, never deleted — **an `update` concern, and `update` is in v1.0 as of Q-62**, so this stops being a v1.1 note and becomes something **F3's spec must state** | F1 §Resolved Decisions |
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
| Q-40 | **Phase 2 is a declarative recipe over a fixed primitive set**, applied automatically by the CLI, and a pure function of (payload, answers, **scaffold selection**) — the brief's §12 row states two of the three inputs, and F1 §NFR *Determinism* carries the authoritative form (C-46) | brief §12 · `general/pack-application.md` · F1 |
| Q-41 | **Phase 2 reads the phase-1 copy in the project**, not the bundle; the payload is not user-editable between phases at v1.0 | brief §12 |
| Q-42 | **`update`, `status` and `contribute` defer to v1.1.** F3 and F4 leave v1.0; G3, S3 and R4 defer with them; S7 weakens to apply-only — **superseded in part by Q-62**, which returns `update` and F3, folds `status` into `update`'s read-only mode, restores G3, S3, R4 and S7 in full, and **leaves only `contribute` and F4 deferred**. The row stays because Q-42 was a real decision correctly taken on the information it had: the blocker it named was a merge base, and Q-39/Q-43 removed the need for one | brief §12 |
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
| Q-53 | **F1 owns `lintel harness verify`**, alongside `validate` and `pack info`. The v1.0 command surface is four commands, and this document's list must include `verify` | brief §12 |
| Q-54 | **`merge-json` is dropped from v1.0 — six primitives, not seven.** `.claude/settings.json` is written by nothing; no pack ships a default permission set. The ownable-key allowlist, the destination policy, the leaf-only rule, the consent gate, the security disclosure and their error families are **removed rather than repaired**, and defer to v1.1 with the rest of the settings story. **Supersedes Q-23 for v1.0** and makes the *Determinism* row above true without exception, because `merge-json` was the only primitive taking a fourth input | brief §12 · F5 §Resolved Decisions |
| Q-55 | **`writing`'s recipe generates `writing-guide/index.md`**, so that folder carries both the migrated `README.md` and a generated `index.md` — `writing` declares `folderReadme: "index.md"` and the migration alone would have failed `validate` step 12 under `--strict` | brief §12 |
| Q-56 | **`verify` gains an `adapted` per-path state.** A recipe step may declare its output adapt-expected; those paths report `adapted` rather than `differs`, and `adapted` is not a failure. Only an *unexpected* change reports `differs`. The generated `CLAUDE.md` is adapt-expected in all three packs. **The manifest is unchanged** — the adapt-expected set is recomputable | brief §12 · F1 US-31/US-33 |
| Q-57 | **The primary setup experience is conversational, with the CLI underneath.** The F6 skill gathers intent, invokes `lintel harness init`, then does the judgment work. **The CLI stays fully usable standalone.** Recorded design burden: the skill must surface `init`'s pre-write disclosure **faithfully rather than summarising it** | brief §12 · `general/interaction-model.md` |
| Q-58 | **The `writing` extraction corrects `outliner.md`, `writer.md` and `critic.md`** to write into the per-workstream stage folders, recorded as an enumerated declared-difference class of exactly three named files | brief §12 · F5 |
| Q-59 | **The `coding` migration generalises `securityreviewer.md`'s security references** — hardcoded external paths and requirement IDs become project-relative. A declared difference class enumerated to one file | brief §12 · F5 |
| Q-60 | **Diagnostics split into `defect` and `notice`.** Every `W-` code is classified once in F1's catalogue; **`--strict` promotes defects only**, and a notice is never fatal under any flag. `provenance` becomes a defined `pack.json` field | brief §12 · F1 §Error States |
| Q-61 | **All three packs `generate` their `CLAUDE.md`.** F1 US-32's claim that `coding`'s was the only `generate` step was wrong and is corrected — `generate` is what emits the inert anchors Q-45 requires and F5 US-38 asserts for every pack | brief §12 · F1 · F5 |
| Q-62 | **`update` ships in v1.0 and F3 returns; it builds no merge engine. Reverses Q-42 for F3.** The CLI recomputes `expected_old` (local payload + recipe + recorded answers — `verify`'s identity) and `expected_new` (newer bundled payload): **unedited replaced outright**, **edited left untouched and reported**, **`adapted` never blindly replaced**. **The skill reconciles the edited paths conversationally.** `status` folds into `update`'s read-only mode; **`contribute` stays deferred to v1.1**. **G3, S3 and R4 return; G4 stays deferred with F4**; **S7 is restored to *produced by `init` and maintained by `update`***. **Accepted cost:** v1.0 grows a feature and F3 has no spec | brief §12 · `general/system-architecture.md` §4 · `general/interaction-model.md` §9 |
| Q-63 | **The binary is `lintel`, with `harness` as a command group: `lintel harness init coding`. The package is `@lintel/cli`.** Amends Q-16. **Deliberately not decided (Q-64):** whether later tools are built into `@lintel/cli` or loaded as plugins | brief §12 |

**Counters.** Q-1…Q-63 allocated and all resolved, next free **Q-64**,
**reserved** for the packaging question Q-63 names.
US-1…US-38 allocated, next free **US-39** — this master spec owns no
user stories and no acceptance criteria; both live in the feature specs.
The live blocks are F1's US-1…US-4, US-8…US-10, US-13…US-16 and
US-29…US-33, and F5's US-17…US-21, US-24…US-28 and US-34…US-38. Retired
and never reused: **US-5, US-6, US-7, US-11, US-12** (F1) and **US-22,
US-23** (F5, both with the `shared/` mechanism Q-48 removed). **US-6 is
retired by Q-54** — its entire subject, owning part of a settings file,
was deleted with `merge-json` — and an earlier edition of this paragraph
still listed it as live; the correction is against F1 §User Stories,
which is the owner. **US-11 and US-12 stay retired even though `update`
returned** (Q-62): F1's rule is that a retired id is never reused, so
F3's stories take fresh ids from US-39 and must restate their criteria
rather than inherit a heading. Filenames are
feature-prefixed; task IDs use Scheme A (`T-XXYY`, epic-derived).
