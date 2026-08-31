# F5 — Template Packs & Shared Components Specification — Lintel Harness v1.0
**Version:** 1.0
**Status:** Draft
**Date:** 2026-08-30
**Platform:** Pack content is plain files — Markdown, JSON, shell/PowerShell, Bicep, CDK TypeScript — bundled with the Node/TypeScript CLI and consumed by Claude Code's `.claude/` conventions. No runtime of its own.
**Design spec:** n/a (no UI)
**ADR:** {{`F5-ADR-NNN-template-packs.md` — filled in by the architect after this spec is reviewed}}
**References:** `specifications/project-brief.md` (§3, §6 R1/R2/R5/R6, §12 Q-1…Q-12), `CLAUDE.md`, `specifications/v1.0/research-planning-pack-framing.md`, `specifications/conventions.md`, `F1-spec-pack-format-and-manifest.md`, `template/` (the coding pack source), `/Users/mrandersen/Projects/AIImpactOnOrganizationsAndLeadership/` (the writing pack source)

**Amendment history**

| Version | Date | Summary |
|---|---|---|
| 1.0 | 2026-08-30 | Initial draft. Specifies the content of the three v1.0 packs — `coding`, `writing`, `planning` — against the nine-part anatomy, plus the two `shared/` components they reference. |
| 1.0 | 2026-08-30 | Cross-document consistency pass. This spec's user-story block renumbered to US-17…US-28 (F1 holds US-1…US-16) and its open questions renumbered to project-unique ids Q-27…Q-37, with two of them — Q-13 and Q-17 — collapsed into the master spec's questions of the same number, and Q-35 and Q-37 closed. Full account in the master spec's *Cross-document consistency pass*. No content or design change. |
| 1.0 | 2026-08-30 | **ADR-001 amendment pass.** Folds `F1-ADR-001-pack-format-and-manifest.md` (verdict `PROCEED`) into this spec. §Error States re-pointed at F1's code taxonomy and its `0/1/2/3` exit classes, which are now the only CLI error model — except the three *pack-content* strings (kill-criteria hook, absorption-gate ABORT, `copywriter` halt), which stay verbatim here because a pack ships them. The determinism NFR's date-field exception is struck: no generated file carries a timestamp. US-19 now cites the init-parameter mechanism (`constraintFloor` + `flag: "calibration"`) rather than a bespoke CLI flag, and the "declared calibration-varying file list" is restated as `validate --json`'s `parameterVaryingFiles`. Q-13 and Q-27 close. No pack content changes. |
| 1.0 | 2026-08-30 | **Security remediation pass.** Folds the F5-facing half of `F1-ADR-001` §7 (security architecture) into this spec. **`planning` loses its kill-criteria enforcement hook**: no pack may register an agent hook at v1.0 (ADR §7.2.5), so part 8 becomes three slash commands plus one **inert** guard script under `.claude/hooks/`, and the kill-criteria rule is enforced by the `/bet` command's own instruction and by review — the treatment `coding` and `writing` already get for their unenforced rules. The verbatim block message stays here; only its emitter changes. Part 8 stays `present`, so the counted "exactly one provisional" NFR still holds for `planning` part 2 alone. **R5 gains a third recorded shortfall**: no v1.0 pack ships an enforcing hook, and the reason is a format decision rather than a migration constraint. US-19 now names the file and the region carrying the calibration-varying gate-coverage narrative and asserts the gate's *rule* text is not inside it, checkable at region granularity against F1's `parameterVaryingRegions`. The unknown-flag row is re-pointed at F1's new `E-CLI-UNKNOWN-FLAG`. This is the only pack-content change in the pass. |

---

## Introduction

F5 is the **content** feature of Lintel Harness v1.0. Where F1–F4 and F6
specify the machinery that applies, updates and audits a pack, F5
specifies **what is in the packs**. It is the feature that decides
whether the harness has anything worth applying.

v1.0 ships three packs — `coding`, `writing` and `planning` — and two
`shared/` components — `targets` and `presentation`. A project holds
**exactly one** pack (Q-12); a user who needs two ways of working runs
two projects side by side. Packs are standalone but may pull in files
from `shared/` by explicit declaration in `pack.json` (Q-4), and
changing a shared file bumps every pack that references it.

Two of the three packs already exist as working folders and are being
**migrated faithfully** (Q-6): `coding` from `template/` in this repo,
`writing` from the `AIImpactOnOrganizationsAndLeadership` project that
grew it. The third, `planning`, has never existed as a folder — it is
**authored** at v1.0 from the knowledge base named in Q-11, the
portfolio-roadmap-deck workstream, whose loop, gate, horizon framework
and template fields a critic pass found sound. That asymmetry is
deliberate and it is the point: two migrations prove the format can
carry what already works, and one authored pack proves the format can
carry something new (Q-9).

The organising device throughout is the **nine-part anatomy** from the
brief §3.3. A pack is exactly those nine things, and only the content
differs between pack types. The anatomy is not a rhetorical frame here
— it is the completeness contract. **A pack missing a part is
incomplete, not merely different**, and this spec states each gap
openly rather than papering over it. Three gaps in particular are
load-bearing and are stated as facts, not aspirations: the coding pack
ships a **weak part 8** (one slash command, no hooks, no skills) and a
**strong part 9**; the writing pack ships **strong parts 5 and 6** and
**no part 9 at all**; and the writing pack's part 3 amounts to a single
document template. Fixing those is explicitly **not** v1.0 work — Q-6
defers cross-pollination to the first post-v1.0 bump — because a
content change during migration destroys the evidence that S6 depends
on.

The substance of this feature is the three pack outlines and the shared
components, which are specified in **§Flows / Behaviour**. That section
carries the pinned shapes F1's pack format and F2's apply engine
compile against, which is where `specifications/conventions.md` §8
places them; read it first if you are here for the packs themselves.

### What is in scope

- The **content and structure of `packs/coding/`**, migrated from
  `template/`: 6-phase gated process, 10 agents, 11 document templates,
  `conventions.md`, 2 agent-team prompts, the targets way-of-working,
  the `CLAUDE.md` template, and the Azure SWA + Neon backend scaffold.
- The **content and structure of `packs/writing/`**, extracted from
  `AIImpactOnOrganizationsAndLeadership/`: the 9-stage two-sequence
  process, 8 agents, the corpus + per-workstream folder shape, the
  `writing-guide/`, the routing and parallelization rules, the
  `index.md` / `Home.md` discipline, and the writing-workstream
  scaffold.
- The **content and structure of `packs/planning/`**, authored from the
  Q-11 knowledge base: the six-phase decision loop, the non-delegable
  absorption/security gate, horizon-setting inside commit, four document
  templates, the evidence-discipline conventions, the five practices,
  and the **constraint-floor calibration** that parameterises the pack.
- The **calibration mechanism as a requirement on the pack format** —
  `planning` is the first pack whose content varies by an init answer,
  and neither `coding` nor `writing` has anything like it.
- The **`shared/` components** — `shared/targets` and
  `shared/presentation` — their contents and which packs declare them.
- The **scaffold inventory** per pack, and which scaffolds exist today
  versus which must be authored.
- Each pack's **`pack.json` anatomy declaration**: all nine parts named,
  with a part that has no content declared absent with a reason rather
  than silently omitted.

### What is NOT in scope

- **The CLI mechanics.** `pack.json`'s schema, the manifest, hashing,
  drift, 3-way merge and marked-region processing belong to F1–F4. This
  spec states what the packs *contain* and what the format must be able
  to *express*; it does not specify how.
- **Cross-pollination between packs (Q-6).** `writing` gaining the
  targets contract and `coding` gaining routing and parallelization
  rules land in `coding@1.1` / `writing@1.1`, and are listed here only
  so the v1.0 gaps are legible as deferred rather than overlooked.
- **Improving the migrated packs.** No content is added to, removed
  from, or rewritten in `coding` or `writing` beyond the mechanical
  source→applied transforms. A typo in `template/` migrates as a typo.
- **A fourth pack.** Research, data/analysis and ops are named in the
  brief as plausible later types and are not v1.0 work.
- **Multi-pack composition.** Settled against by Q-12.
- **Verifying the portfolio-deck's contested claims.** The planning pack
  takes the deck's process and templates, which the critic pass found
  sound; it does not take, restate or depend on the surrounding evidence,
  which the same pass marked "revise heavily".
- **Rendering.** `shared/presentation` ships conventions and templates.
  It does not ship a PPTX/PDF/HTML generator.

---

## Technical Context

Only settled decisions. Everything unsettled is in **Open Questions**.

| Decision | Choice | Rationale |
|---|---|---|
| Pack count at v1.0 | Three: `coding`, `writing`, `planning` | Q-9 — two packs by one author risk a format overfit to shared habits; a third built against the same core is the real test of R1 |
| Pack home | `packs/<name>/` in this repo, bundled into the published CLI package | Q-2 — one maintainer, atomic CLI+pack commits, no cross-version compatibility problem, no network fetch at apply |
| Pack↔project cardinality | A project holds **exactly one** pack | Q-12 — keeps manifest, `CLAUDE.md` region ownership and `update` semantics single-owner; removes the collision class rather than solving it |
| Versioning | Per-pack semver in `packs/<name>/pack.json` plus a declared minimum CLI version; the manifest records both | Q-3 — makes `update` precise per pack, and stops a writing-only project being told it is stale because `coding` moved |
| Sharing | Standalone packs that may reference a `shared/` tree, declared in `pack.json`; nothing inherited implicitly. Changing a shared file bumps every referencing pack | Q-4 — the two existing packs overlap in *names* far more than *content*, so a shared base would have coupled versions for almost no reuse |
| Presentation | **Not a pack.** A cross-cutting capability in `shared/presentation`, referenced by all three | Q-9b — presenting finished work is universally useful; its output differs while its process does not, making it a weak test of pack-level generality |
| Migration fidelity | `coding` and `writing` migrate **faithfully**; content improvements are deferred | Q-6 — S6 stays verifiable (a difference can be attributed to a bug, not an intention), and the deferred bump becomes `harness update`'s first genuine acceptance test |
| `planning` framing | Portfolio and roadmap management as a decision loop: `intake → discovery → prioritize → commit → deliver → learn`, non-delegable absorption/security gate between deliver and learn, horizon-setting first-class inside commit | Q-11 — the spine is evidenced research output, not a process invented to fill a template |
| `planning` sourcing | The portfolio-roadmap-deck workstream is a **knowledge base**, not a dependency. No runtime or process coupling; not a reuse of the writing pack | Q-11 — take the loop, the gate, the horizon determinants, the template fields and the two calibration poles; leave the contested claims |
| `planning` parameterisation | Calibrated at init by **constraint floor**, shipping two reference calibrations (high floor / near-zero floor) | Research §Calibration — contingency is the research's central finding, so a pack hard-coding one calibration would misrepresent it |
| Scaffolds | Opt-in and composable, selected at init: `harness init coding --scaffold backend,frontend` | Q-8 — applying the pack to this repo already showed scaffolds must be optional; the backend was skipped entirely because the harness has none |
| Backend scaffolds | Two: Azure SWA + Neon (exists), AWS Lambda + CDK (to author) | Q-8/Q-8a — a second implementation *proves* the scaffold interface is general rather than asserting it |
| Source vs applied content | Marked regions everywhere — `source-only` blocks stripped on apply, `applied-only` blocks added on apply | Q-10 — both stale READMEs needed to exist in the applied copy *with different content*, which a whole-file mode cannot describe |
| Anatomy declaration | Every `pack.json` declares all nine parts; a part with no content is declared **absent, with a reason** | R2 — "a pack with a missing part is visibly incomplete rather than quietly deficient" |

---

## Goals

Each is assessable yes/no when F5 is done.

- **G5.1** — `packs/coding/`, `packs/writing/` and `packs/planning/`
  each exist with a valid `pack.json` declaring name, semver, minimum
  CLI version, `shared/` references and available scaffolds.
- **G5.2** — Every pack declares all nine anatomy parts. Any part with
  no content is declared `absent` with a stated reason; no part is
  silently omitted.
- **G5.3** — The `coding` migration is faithful: reversing the declared
  source→applied transforms over `packs/coding/` reproduces `template/`
  with zero content differences outside marked regions.
- **G5.4** — The `writing` extraction is faithful and clean: every
  construct listed in §Flows /`packs/writing/` appears in the pack, and
  no artefact specific to `AIImpactOnOrganizationsAndLeadership` (its
  permission allowlist, its third-party hook, its research corpus, its
  voice samples, its personal names) does.
- **G5.5** — `packs/planning/` ships two reference calibrations, and
  `harness init planning` with each produces trees that differ in at
  least cadence defaults, horizon defaults and absorption-gate holding
  text — from one pack source, with no forked pack.
- **G5.6** — `shared/targets` and `shared/presentation` exist, and every
  pack that uses them declares the reference in its `pack.json`. No pack
  reads a shared file it has not declared.
- **G5.7** — Applying each pack to an empty directory produces a project
  with zero broken internal path references and zero remaining
  `{{PLACEHOLDER}}` tokens outside the ones the init dialogue
  deliberately leaves for the user.
- **G5.8** — Each pack's README names all nine parts and states that
  pack's gaps honestly, so the completeness picture is legible without
  reading this spec (G6).

---

## Out of Scope (this version)

- **Cross-pollination (Q-6).** `writing` gaining `shared/targets`;
  `coding` gaining routing and parallelization rules — both target
  `coding@1.1` / `writing@1.1`, and both are the first real acceptance
  test of `harness update` (S3).
- **Filling the coding pack's part 8** beyond the single `/target`
  command it has today. The R5 candidates (`/spec`, `/feature`,
  `/review`, a no-code-before-PROCEED hook, a default permission set)
  are deferred with the rest of the content work.
- **Authoring document templates the writing pack does not have.** Its
  part 3 migrates as it stands — see Q-31.
- **A brief template for the coding pack** (brief §11 step 4) — deferred
  to `coding@1.1`, see Q-36.
- **`frontend` and `app` scaffolds** — proposed for deferral, see Q-17
  in the master spec.
- **A fourth pack type** (research, data/analysis, ops).
- **Multi-pack composition** (Q-12).
- **A presentation renderer** — `shared/presentation` ships conventions
  and templates, not output generation.
- **Third-party pack authoring** — a public route for someone else to
  publish a pack. Q-2 revisits repo layout only if that becomes real.

---

## User Stories

Range used: **US-17 … US-28.** `US-N` is project-monotonic and F1 holds
US-1…US-16, so this block was renumbered by the cross-document
consistency pass of 2026-08-30 (Q-35) and must not be renumbered again.

---

**US-17 — Stand up a coding project from the pack**
> As a solo operator starting a new software project, I want to apply the `coding` pack in one command so that the spec process, agents, agent teams and targets are in place before I write anything.

**Acceptance criteria:**
- `harness init coding` in an empty directory produces `CLAUDE.md`,
  `.claude/agents/` (10 agent files), `.claude/commands/target.md`,
  `AgentTeams/` (2 team prompts + README), `specifications/` (README,
  `conventions.md`, 9 templates), `targets/` (README, `Run.md`,
  `target.template.md`) and `copy/tone-of-voice.md`.
- The source→applied transforms are applied automatically: `agents/` →
  `.claude/agents/`, `agent-teams/` → `AgentTeams/` (**rename**),
  `copy/tone-of-voice.template.md` → `copy/tone-of-voice.md`
  (**filename transform**).
- No file in the produced tree contains the string `template/targets/`.
- `targets/README.md` and `specifications/README.md` contain their
  applied-copy text, not their source text — verified by the absence of
  the source-only "Adopting this in a new project" step list in the
  former.
- Zero `{{PLACEHOLDER}}` tokens remain except those the init dialogue
  deliberately leaves for the user, and every such token is listed in
  the init summary output.
- Running `/target <a filled target file>` in the produced project
  resolves the command and spawns `target-reviewer` without a path fix.

---

**US-18 — Stand up a writing project from the pack**
> As a solo operator starting a research-and-writing project, I want to apply the `writing` pack in one command so that the corpus structure, the 8-agent pipeline and the voice rules exist before the first scout runs.

**Acceptance criteria:**
- `harness init writing` produces `CLAUDE.md`, `Home.md`,
  `.claude/agents/` (8 agent files), `sources/` (with `inbox/`,
  `_scouting/`, `bibliography.md`), `analyses/`, `notes/`, `tasks/`,
  `writing-guide/` (3 files) and `workstreams/`.
- Every folder listed in the produced `CLAUDE.md`'s "Where things live"
  section contains an `index.md`.
- The produced `CLAUDE.md` carries the routing-defaults table (8 rows),
  the three parallelization rules, the no-auto-chaining rule and the
  words-and-patterns-to-avoid section.
- No file in the produced tree contains a personal name, an absolute
  path beginning `/Users/`, a research source, a voice sample, or any
  entry from the source project's permission allowlist.
- `.claude/settings*.json` in the produced tree contains no hook. (The
  source project's only hook is a third-party notifier and does not
  migrate.)
- `harness pack info writing` reports part 9 as `absent`, with a reason.

---

**US-19 — Stand up a planning project at a chosen calibration**
> As an operator running a portfolio of bets, I want to apply the `planning` pack calibrated to my organisation's constraint floor so that the cadence, horizon defaults and gate expectations match my reality rather than someone else's.

**Acceptance criteria:**
- **The mechanism is F1's init parameters, not a bespoke CLI flag**
  (`F1-ADR-001`, conflict 5, closing Q-13). `packs/planning/pack.json`
  declares `constraintFloor` as a `required` `enum` with
  `values: ["helio", "cadenza"]` and `"flag": "calibration"`. The alias
  is registered from that data, so `--calibration helio` is exactly
  `--set constraintFloor=helio` and the CLI holds no knowledge of this
  pack. That is what keeps S5 falsifiable.
- `harness init planning --calibration <name>` accepts exactly the two
  reference calibrations the pack declares in `values` and rejects any
  other with `E-PARAM-INVALID` (F1 §Error States), which lists the
  permitted values verbatim.
- Run interactively with no `--calibration`, init asks the parameter's
  declared `prompt` — a single constraint-floor question — before
  writing any file.
- Run non-interactively with no `--calibration` and no `--set`, init
  writes no file and fails with `E-PARAM-MISSING`, because
  `constraintFloor` is `required` with no default.
- Content varies by the answer through the two mechanisms F1 §US-8
  already defines and only those: `when` mappings select whole files —
  which is what `packs/planning/calibrations/<name>/` is, a
  **pack-authoring convention over `when`**, not a format feature — and
  `harness:if constraintFloor=<value>` regions vary content inside a
  file. The calibration record file is an ordinary file holding
  `{{harness:param.constraintFloor}}`.
- The two calibrations produce trees that differ in at least: the
  default review cadence, the default horizon range, and the
  absorption-gate text describing how much of the gate is already
  structurally held.
- The two calibrations produce trees that are **byte-identical** in the
  six phase definitions, the existence and non-delegability of the
  absorption gate, the four template field lists, and the five
  practices.
- **The gate's coverage narrative and the gate's rule are in different
  places, and this criterion names them** (`F1-ADR-001` §7.8.4, referred
  back to F5 to answer). The two requirements above are only compatible
  if the varying text and the invariant text are separable, so:
  - **What varies** is the *coverage narrative* — how much of the
    absorption gate a given organisation's existing process already
    holds. It is confined to exactly two places: the calibration record
    `calibration.md`, which holds
    `{{harness:param.constraintFloor}}`; and **one named region,
    `gate-coverage`, inside `templates/gate-record.template.md`**, which
    is mapped `"mode": "regions"` and whose varying body is an
    `harness:if constraintFloor=<value>` pair (F1 §US-6 permits an `if`
    inside a region, resolved before the region body is hashed).
  - **What does not vary, and is asserted not to be inside that region**,
    is the gate's *rule*: that the gate exists, that it is
    non-delegable, that it may not be cleared or waived by the party
    that ran `deliver`, and that it may not run in parallel with
    `learn`. That text lives in the six phase definitions, in
    `CLAUDE.md`'s five-practices region, and in the planning target
    template's abort criteria — none of which is calibration-varying.
  - **The gate record template therefore legitimately carries both**: an
    invariant field list and one varying region. That is exactly the
    shape file-granular checking cannot express, and it is why the
    assertion below is made at region granularity.
- Every file that differs between the two calibrations appears in
  `harness validate --json`'s `parameterVaryingFiles`, and no file
  outside that list differs. The validator computes the list by
  rendering every parameter combination, so there is no separate
  hand-kept declaration to fall out of date.
- **`harness validate --json`'s `parameterVaryingRegions` contains
  exactly `{ path: "templates/gate-record.template.md", region:
  "gate-coverage" }` for the gate record template, and no other region of
  that file appears in it.** F1 §US-29 computes the field from the same
  per-combination render, so the two halves of this story — "the coverage
  narrative varies" and "the rule is byte-identical" — are one
  mechanically checked fact rather than two editorial claims that can
  drift apart.
- The produced project records its calibration in a single readable file
  at the repo root, so a later reader can tell which one was chosen.

---

**US-20 — See a pack's completeness before choosing it**
> As someone deciding which pack to apply, I want each pack to state which of the nine anatomy parts it actually ships so that I adopt it knowing what it does not give me.

**Acceptance criteria:**
- `harness pack info <name>` — an **F1** command, specified in F1
  §US-29 as `renderPackInfo(PackReport)` over the same structure
  `harness validate --json` emits (`F1-ADR-001`, conflict 6) — lists all
  nine parts for the named pack with one of `present` / `provisional` /
  `absent`, plus the declared `reason` for `absent` and the declared
  `note` for `provisional`. These criteria assert the per-pack
  *content*; F1 owns the command and the schema it prints.
- `coding` reports part 8 present-but-minimal with its content named
  (one command, zero hooks, zero skills) and part 9 present.
- `writing` reports part 8 `absent` and part 9 `absent`, each with a
  reason.
- `planning` reports all nine present, with part 2 flagged
  `provisional`.
- A pack whose `pack.json` omits any of the nine parts fails validation
  with `E-ANATOMY-MISSING` (F1 §Error States, exit 2), and
  `harness init` refuses to apply it.

---

**US-21 — Pick scaffolds at init**
> As an operator whose new project needs a backend, I want to select scaffolds at init so that I get the deploy machinery without getting scaffolds I do not need.

**Acceptance criteria:**
- `harness init coding` with no `--scaffold` produces no
  `infrastructure/` directory.
- `harness init coding --scaffold backend-azure` produces
  `infrastructure/backend-deploy/` with the Bicep, bicepparam and four
  setup/deploy scripts.
- `--scaffold` accepts a comma-separated list and applies each named
  scaffold.
- Requesting a scaffold the named pack does not offer writes no file and
  fails with `E-SCAFFOLD-UNKNOWN` (F1 §Error States, exit 1), which
  lists the available ids.
- `harness pack info <name>` lists that pack's available scaffolds.

---

**US-22 — Reference a shared component rather than copying it**
> As a pack author, I want a pack to pull a shared component in by declaration so that one fix reaches every pack that uses it instead of being re-fixed in each.

**Acceptance criteria:**
- `packs/coding/pack.json` and `packs/planning/pack.json` each declare
  `shared/targets`; all three declare `shared/presentation`.
- `packs/writing/pack.json` does **not** declare `shared/targets` at
  v1.0 (Q-6 defers it to `writing@1.1`).
- `shared/targets/` exists exactly once in the repo; no pack contains a
  duplicate copy of `target.template.md`, `Run.md` or
  `target-reviewer.md`.
- A pack that reads a `shared/` file without declaring it fails
  validation with `E-SHARED-UNDECLARED` (F1 §Error States).
- A shared component's files land in their correct per-destination
  locations on apply (`targets/`, `.claude/agents/`,
  `.claude/commands/`) from a single declaration. The mechanism is
  settled (Q-27, closed by `F1-ADR-001` and recorded in F1's Resolved
  Decisions): **`shared/targets/component.json` declares its own
  `mappings`**, and `coding` and `planning` each inherit all five
  destinations from their one `shared` entry. Neither pack repeats the
  destination map, so the two cannot drift apart on where a shared file
  lands.

---

**US-23 — Be told which packs a shared change bumps**
> As the pack maintainer, I want to be told which packs a shared-file change affects so that I never ship a shared fix that silently leaves a referencing pack on a stale version.

**Acceptance criteria:**
- Changing any file under `shared/` and validating without bumping every
  referencing pack's semver produces `E-SHARED-STALE` (F1 §Error States)
  and exit 2.
- The message names every affected pack with its current version.
- Bumping all named packs clears the condition.
- A change confined to a single pack's own files never triggers the
  condition.

---

**US-24 — Prove the coding migration changed nothing**
> As the maintainer, I want the `coding` migration to be provably faithful so that any later behaviour difference is attributable to a migration bug rather than an undocumented improvement (S6).

**Acceptance criteria:**
- A documented, re-runnable check reverses the declared transforms over
  `packs/coding/` and diffs the result against `template/`.
- That check reports zero content differences outside marked regions.
- Every difference it does report is a marked region, and each is listed
  in the migration record with the reason it exists.
- The migration record names the `template/` commit the pack was taken
  from.

---

**US-25 — Prove the writing extraction carries nothing project-specific**
> As the maintainer, I want the `writing` extraction to be free of its host project so that the pack is a way of working rather than a copy of one research project.

**Acceptance criteria:**
- Grepping `packs/writing/` for `/Users/`, for the host project's name,
  and for the owner's personal name returns zero hits outside a declared
  placeholder.
- No file under `sources/`, `analyses/`, `notes/`, `tasks/` or
  `workstreams/<name>/` in the pack contains research content — only
  `index.md` scaffolding and the declared templates.
- `writing-guide/tone-of-voice.md` migrates with its voice-sample
  reference converted to a placeholder pointing at wherever a new
  project keeps samples, per that folder's own portability note.
- The extraction record names the source project path and the commit it
  was taken from.

---

**US-26 — Cannot commit a bet without kill criteria**
> As an operator using the planning pack, I want the pack to physically block a bet moving to committed without kill criteria so that the discipline the research names as most-skipped is enforced rather than remembered.

**Acceptance criteria:**
- A bet brief whose `Kill criteria` field is empty or placeholder cannot
  be marked committed by the `/bet` command; the attempt is blocked with
  the string in §Error States.
- Filling the field and retrying succeeds.
- `/review` re-checks the criterion for every bet it reviews, so a bet
  that reached `committed` by some other route is caught at the next
  review rather than never.
- **The block does not fire on the file write at v1.0, and this criterion
  is recorded as unmet rather than reworded** (`F1-ADR-001` §7.2.5). The
  guard is a slash-command instruction, not a mechanism: a bet committed
  by hand-editing `brief.md`, without going through `/bet`, is not
  blocked. Enforcement at the write needs a registered hook, and **no
  pack may register an agent hook at v1.0**. The pack ships the guard
  script under `.claude/hooks/` as an inert `0644` file so that the v1.1
  route is a registration rather than a rewrite.
- The block, **and the fact that it is unenforced at the write**, are
  documented in the pack's part 8 and in the produced project's
  `CLAUDE.md`, so its behaviour and its limits are both discoverable
  before it fires. `harness validate` says the same thing about the
  script with `W-HOOK-SCRIPT-INERT` (F1 §Error States), and
  `harness pack info` lists it as inert.

---

**US-27 — An unsupervised run stops at the absorption gate**
> As an operator, I want an unsupervised planning run to be structurally unable to clear the absorption/security gate so that the one non-delegable step stays with a human.

**Acceptance criteria:**
- The planning pack's target template lists clearing or waiving the
  absorption/security gate as an abort criterion.
- A run that reaches the gate terminates as **ABORT** with the string in
  §Error States, writes a final work-log entry, and hands back.
- The run does not mark the gate passed, partially passed, or deferred.
- `target-reviewer` returns `NEEDS-CORRECTION` for any planning target
  whose success criteria can only be met by passing the gate.

---

**US-28 — Read one page and understand what I got**
> As a newcomer to a project someone else set up, I want each pack to explain itself in one page so that I can tell what way of working I have inherited and where its edges are (G6).

**Acceptance criteria:**
- Each pack's README is at most 120 lines and names all nine anatomy
  parts.
- Each README states that pack's gaps explicitly — `coding` names its
  thin part 8; `writing` names its missing parts 8 and 9 and its thin
  part 3; `planning` names its provisional role set.
- Each README states which `shared/` components the pack references.
- Each README states the pack's version and its minimum CLI version.

---

## Error States

Every failure maps to a defined behaviour. **This table is not a
catalogue.** `F1-ADR-001` (conflict 4) settled that F1's `E-`/`W-` codes
and its exit-code classes — `0` success, `1` user-correctable,
`2` pack or manifest integrity, `3` internal — are the **only** CLI
error model, and that `F1-spec-pack-format-and-manifest.md`
§Error States is the **only** message catalogue. The rows below name the
F1 code each F5 scenario raises; **the code is the stable contract**
that CI and F6 branch on, and the message text is F1's, verbatim within
a minor version. This spec previously carried its own strings and its
own exit codes `0`–`4`; both are struck, because two documents
disagreeing on the exit code for the same scenario is exactly the defect
the ADR closed.

**The one exception, and it is a real one:** the three *pack-content*
rows below — the kill-criteria block, the absorption-gate ABORT, and the
`copywriter` halt — keep their **verbatim strings here**, because a pack
*ships* those strings. They are text emitted by agents and target runs
that F5 authors; they are not CLI diagnostics, they have no code, and
they do not belong in F1's catalogue. The kill-criteria string's
**emitter changed** in the security remediation pass — from a registered
hook to the `/bet` command's own agent instruction — but the string
itself did not, and it stays F5's.

### CLI scenarios — F1 owns the code, the exit class and the text

| Scenario | F1 code | Exit | Notes |
|---|---|---|---|
| `pack.json` omits one of the nine anatomy parts | `E-ANATOMY-MISSING` | 2 | Pack-integrity, not user error: the author is at fault, not the person running the command. `harness init` refuses to apply the pack |
| Anatomy part declared `"status": "absent"` with no reason | `E-ANATOMY-NO-REASON` | 2 | New code (`F1-ADR-001`, conflict 3) |
| Anatomy part declared `"status": "provisional"` with no note | `E-ANATOMY-NO-NOTE` | 2 | New code. The `provisional` status is what makes this spec's "exactly one provisional part" NFR mechanically checkable |
| A well-formed `provisional` part, at init or `pack info` | `W-ANATOMY-PROVISIONAL` | unchanged | Warning. Names the part and the note — `planning`'s part 2 |
| `harness init planning` non-interactively with no calibration | `E-PARAM-MISSING` | 1 | `constraintFloor` is `required` with no default, so the generic parameter rule produces this with no pack-specific code |
| Unknown calibration name | `E-PARAM-INVALID` | 1 | Lists the permitted `values` verbatim — `helio`, `cadenza` — from the `enum` declaration |
| `--calibration` passed to a pack that declares no such alias | `E-CLI-UNKNOWN-FLAG` | 1 | Not a pack error at all under the alias mechanism: the flag simply does not exist for that pack. **That gap in F1's catalogue is now closed** (`F1-ADR-001` §7.8.2): F1 §Error States carries `E-CLI-UNKNOWN-COMMAND`, `E-CLI-UNKNOWN-FLAG`, `E-CLI-FLAG-VALUE-MISSING` and `E-CLI-ARG-UNEXPECTED`, all exit 1. The flag is judged only after F1's **second** argv pass, once the resolved pack's aliases are registered — so `--calibration` is unknown for `coding` and known for `planning`, from `pack.json` data alone |
| Scaffold requested that the pack does not offer | `E-SCAFFOLD-UNKNOWN` | 1 | Was exit 2 here; F1's class wins — a mistyped flag is user-correctable. Lists the available ids |
| Pack reads a `shared/` file it has not declared | `E-SHARED-UNDECLARED` | 2 | New code (`F1-ADR-001`, conflict 4). Was exit 1 here |
| A `shared/` file changed without bumping every referencing pack | `E-SHARED-STALE` | 2 | Was exit 1 here. Names every referencing pack that must be bumped, not only the one being validated — which is what makes US-23 checkable in one run |
| Pack's minimum CLI version exceeds the installed CLI | `E-PACK-CLI-TOO-OLD` | 1 | Was exit 3 here; exit 3 is reserved for internal errors, and this is user-correctable by upgrading |
| `harness init` in a directory that already has a manifest | `E-ALREADY-APPLIED` | 1 | Was exit 4 here; there is no exit code 4 |

### Pack-content scenarios — F5 owns the string, verbatim

| Scenario | Expected Behaviour |
|---|---|
| Planning: bet marked committed with `Kill criteria` empty or unchanged from the template placeholder | Blocked by the `/bet` command's own agent instruction, and re-checked by `/review`. Print, **verbatim and unchanged**: `Blocked — a bet cannot be committed without kill criteria. Fill "Kill criteria" in bets/<slug>/brief.md, then retry.` **The emitter changed and the string did not** (`F1-ADR-001` §7.2.5): this was a registered hook until no pack could register one. It is therefore a stated rule an agent follows, not a mechanism that stops the write — see the shortfall row below. |
| Planning: an unsupervised target run reaches the absorption/security gate | Run terminates ABORT, final work-log entry written, control handed back. Print: `ABORT — the absorption/security gate is non-delegable and lies outside the autonomy envelope. A human must clear it before the learn phase begins.` |
| Coding: `copywriter` invoked with `copy/tone-of-voice.md` still at its placeholder | Agent halts and asks for a filled guide before writing any copy. Existing pack behaviour, and the halt text migrates from `template/` unchanged (Q-6) rather than being restated here. |

### Stated rules that ship unenforced at v1.0

| Scenario | Expected Behaviour |
|---|---|
| Coding: any pipeline step attempted before its gate (spec without Accepted status, code without a `PROCEED` ADR) | The pack states the rule in `specifications/README.md` and `CLAUDE.md`. **Unenforced at v1.0** — no hook ships. Recorded as a known part-8 gap, deferred to `coding@1.1`. |
| Writing: a draft file overwritten instead of versioned; a new file added without an `index.md` row | The pack states both rules as standing instructions in `CLAUDE.md`. **Unenforced at v1.0** — no hook ships. Recorded as a known part-8 gap, deferred to `writing@1.1`. |
| Writing: an agent has no source for a claim | Emit a `[NEEDS SOURCE]` marker. Fabricating a citation is prohibited by standing instruction. Unenforced; a known gap. |
| **Planning: a bet marked committed without kill criteria** | The pack states the rule in `CLAUDE.md` and in the `/bet` and `/review` command instructions, and `/bet` refuses and prints the block message above. **Unenforced at the file write at v1.0** — the guard script ships under `.claude/hooks/` but is registered by nothing and executed by nothing, because **no pack may register an agent hook at v1.0** (`F1-ADR-001` §7.2.5). Deferred to the first version that gains a hook-registration mechanism with a designed consent surface. |

Those four are stated deliberately. A guideline an agent can forget is
exactly the hook candidate R5 names, and **no v1.0 pack ships one.**

**The third shortfall against R5, and it is the honest headline of the
security remediation pass.** This spec already recorded two R5
shortfalls, both about *migration*: `coding` and `writing` inherited no
hooks, and Q-6 forbids inventing content during a faithful migration. The
third is different in kind and stronger as a finding:

> **No v1.0 pack ships an enforcing hook, and the reason is a decision
> about the pack *format*, not a constraint on the migrations.**

The authored pack — the one Q-9 chose specifically to prove the format
could carry something the migrations could not — was the one pack that
*did* have an enforcing hook, and it lost it because the format has no
way to declare a hook and no consent surface to gate one. R5's "hooks and
skills are the weakest part" therefore reads, at v1.0, as a statement
about the harness rather than about the packs. That is a stronger and
more uncomfortable finding than the two this spec recorded before, and it
is recorded rather than softened.

Two things follow, and both are v1.0 facts:

1. The claim that "an authored pack reaches an adequate part 8 while both
   migrated packs do not" still stands, but it now rests on three slash
   commands rather than on a slash-command-plus-hook. It is **weaker than
   it was**, and part 8 says so.
2. The route out is known and named: a `hooks` declaration whose consent
   surface is designed together with F2's prompting, and whose
   merge-time re-consent problem is solved before it ships
   (`F1-ADR-001` §7.2.5). Until then, a pack that wants a rule enforced
   states it and has an agent follow it, which is what all three packs
   now do.

---

## Non-Functional Requirements

- **Apply latency:** applying any pack to an empty directory completes
  in ≤ 5 s on a warm filesystem, with **zero network requests** — packs
  bundle into the published package (Q-2).
- **Apply size:** no pack writes more than 200 files at init with all its
  scaffolds selected; the base pack (no scaffolds) writes no more than
  60.
- **Determinism:** applying the same pack version with the same answers
  twice produces byte-identical trees. **No exception, and in
  particular no date field.** F1's determinism rule wins
  (`F1-ADR-001`, conflict 7): no generated file carries a timestamp, and
  the only two in the product are the manifest's `appliedAt` and
  `lastUpdatedAt`. The generated `CLAUDE.md` header's date therefore
  ships as the literal `{{YYYY-MM-DD}}` placeholder that the coding
  pack's own header convention already uses, filled by the human or by
  F6. A generated date would give two applies of the same pack different
  hashes and break F1's G-F1-6 (zero-byte re-init), G-F1-7 (identical
  hashes across platforms) and this spec's own G5.3 faithfulness check
  simultaneously.
- **Path integrity:** a link check over every `.md` file in an applied
  tree resolves 100% of relative links and exits 0. No applied file
  contains the substring `template/`.
- **Portability:** no pack file contains an absolute path, a
  machine-specific identifier, a credential, a token, a permission-list
  entry, or a personal name outside a declared placeholder. `grep -r
  '/Users/' packs/ shared/` returns zero matches.
- **Faithfulness (coding):** reversing the declared transforms and
  diffing against `template/` yields zero content differences outside
  marked regions. Runnable as one documented command.
- **Faithfulness (writing):** every construct enumerated in
  §Flows /`packs/writing/` is present, and the four exclusion classes in
  US-25 are absent. Runnable as one documented check.
- **Calibration isolation:** switching `planning`'s calibration changes
  only the files `harness validate --json` reports in
  **`parameterVaryingFiles`**; every other file is byte-identical
  between the two applied trees. That field *is* the "declared
  calibration-varying file list" this spec used to ask for
  (`F1-ADR-001`): the validator computes it by rendering every parameter
  combination, so the list and the reality are one mechanically-checked
  artifact rather than two hand-kept lists that can disagree.
- **Provenance:** each `pack.json` records what the pack was derived
  from — for `coding` and `writing`, a source path plus commit; for
  `planning`, the deck draft (`base-deck-v2.1.md`) and the research doc
  it was authored from — so a later source revision can be diffed
  against what shipped.
- **Legibility:** each pack README ≤ 120 lines, naming all nine parts,
  the pack's gaps, its `shared/` references, its version and its minimum
  CLI version.
- **Anatomy completeness:** all three `pack.json` files declare 9 of 9
  parts, each with F1's three-value `status` — `present` (the default),
  `provisional` or `absent`. Across the three packs, exactly two parts
  are declared `absent` at v1.0 (`writing` parts 8 and 9) and exactly
  one is declared `provisional` (`planning` part 2). Because `status` is
  a schema field rather than prose (`F1-ADR-001`, conflict 3), both
  counts are checkable by `harness validate --all` rather than by
  reading. Any change to them is a spec change, not an implementation
  detail.
- **Encoding:** every pack file is UTF-8 with LF line endings, so an
  applied tree hashes identically on macOS, Linux and Windows.

---

## Flows / Behaviour

This section carries the substance of F5: the three pack outlines, the
shared components, and the completeness comparison. These are the pinned
shapes F1 (pack format) and F2 (apply engine) compile against —
`specifications/conventions.md` §8 places such shapes here.

Each pack is outlined against the **nine-part anatomy**, in order. Where
a part is thin or missing, that is stated as a fact about v1.0, not
softened.

---

### The nine parts across the three packs

Read this first. It is the completeness picture, and it is the reason
the anatomy is a contract rather than a description.

| # | Part | `coding` | `writing` | `planning` |
|---|---|---|---|---|
| 1 | Process | **Strong** — 6 gated phases, one artifact each, plus 2 security gates | **Strong** — 9 stages in 2 strict sequences, no-skip rule, human publish gate | **Strong** (authored) — 6-phase loop, non-delegable absorption gate, horizon inside commit |
| 2 | Role set | **Strong** — 10 agents, non-overlapping write boundaries, model + permission per role | **Strong** — 8 agents, boundaries by stage folder, one read-only critic | **Provisional** — 6 candidates inferred from phases; EM-portfolio role flagged unwritten in the source research |
| 3 | Document templates | **Strong** — 11 templates | **Weak** — one post template, living inside a workstream; other artifact shapes described in prose only | **Adequate** — 4 templates; 3 have fixed fields and 2 filled examples each |
| 4 | Conventions | **Strong** — naming, numbering, counters, header block, status values, ownership | **Adequate** — indexing, draft versioning, sourcing, voice, words-to-avoid; no numbering, no status values, no counters | **Adequate** (authored) — evidence discipline, claims ledger, kill-criteria-first, no-drift rule |
| 5 | Coordination rules | **Weak** — 2 team prompts with lead playbooks; no routing table, no parallelization rules | **Strong** — 8-row routing table, 3 parallelization rules, no-auto-chaining, bounded critic loop | **Adequate** — cadence-by-uncertainty, non-delegable gate, kill-criteria escalation |
| 6 | Behavioural guidelines | **Adequate** — `CLAUDE.md.template`, 15 headings | **Strong** — voice, words-to-avoid, standing instructions, plus a loadable `writing-guide/` | **Strong** — the five practices, each operational |
| 7 | Folder scaffolding | **Strong** — 6 top-level dirs, per-version spec folders, 1 opt-in infra scaffold | **Strong** — shared corpus + per-workstream stages, `index.md` everywhere, `Home.md` front door | **Adequate** (authored) — register, per-bet folders, claims ledger, decision log, calibration record |
| 8 | Skills & automations | **Weak** — 1 slash command (`/target`), 0 hooks, 0 skills, no default permission set | **Absent** — 0 commands, 0 pack-owned hooks, 0 skills | **Adequate** (authored) — 3 slash commands, plus 1 **inert** guard script; **0 enforcing hooks**, because no pack may register one at v1.0 |
| 9 | Autonomy contract | **Strong** — targets: readiness gate, autonomy envelope, abort criteria, work log, SUCCESS/ABORT | **Absent** — no target contract, no gate, no envelope, no log | **Adequate** — references `shared/targets`; adds a phase the envelope may never enter |

Three readings follow from the table, and all three are v1.0 facts:

1. **Each migrated pack is missing what the other proves valuable.**
   `coding` is weak at 5 and 8 and strong at 9; `writing` is strong at 5
   and 6 and absent at 8 and 9. Q-6 keeps that asymmetry at v1.0 on
   purpose, so the first post-v1.0 bump is a real test of
   `harness update` rather than a synthetic one.
2. **Part 8 is the product's weakest area across the board**, exactly as
   the brief's R5 says. Two of three packs ship almost nothing, and the
   only pack with a credible part 8 is the one being authored fresh —
   which is evidence that the weakness is historical rather than
   intrinsic to the format.
3. **`planning` is the only pack with a parameter.** Nothing in
   `coding` or `writing` changes content by an init answer. That was the
   sharpest stress on the pack format in v1.0, raised as Q-13 and
   **closed by `F1-ADR-001`**: the format expresses it with `when`
   mappings, `if` regions and `{{harness:param.<id>}}`, with no new
   grammar and no pack-specific CLI code.

---

### `packs/coding/` — migrated from `template/`

**Source:** `template/` in this repo, at a recorded commit.
**Migration:** faithful (Q-6). No content added, removed or rewritten.
**References:** `shared/targets`, `shared/presentation`.
**Scaffolds:** `backend-azure` (exists), `backend-aws` (to author),
`frontend` (to author — see Q-17), `app` (to author — see Q-17).

#### 1. Process — six gated phases

```
research → spec → design-spec (if UI) → ADR (PROCEED) → epics-and-tasks → implementation
```

Every arrow is a gate, not a suggestion. One defined artifact per phase:

| Phase | Artifact | Gate to pass |
|---|---|---|
| Research | `research-<topic>.md` | Runs first for anything unfamiliar; a spec written without needed research is a wasted spec |
| Spec | `spec-<topic>.md` (or `F<N>-spec-<topic>.md`) | Status must reach `Accepted` |
| Design spec | `design-spec-<topic>.md` | Only for features with UI; reads the functional spec for behaviour |
| ADR | `ADR-NNN-<topic>.md`, or `ADR-EXX-<topic>.md` epic-scoped | Must be stamped `PROCEED`; locks the file-level plan and the public interface contract |
| Epics & tasks | `epics-and-tasks-<topic>.md` | Every task names the files it touches |
| Implementation | Code + unit tests + integration/acceptance tests | Follows the ADR's file plan and contract |

Two **security gates** cut across the sequence: `securityreviewer` runs a
Mode-A pass at the ADR gate (are the security and privacy requirements
correctly and completely *specified*?) and a Mode-B pass at the
code-review gate (does the code actually *meet* them?). A Mode-A pass
folded into an ADR is the one sanctioned exception to the one-page ADR
rule, adding numbered **Conditions** (`C-N`, each closing a finding
`SR-N` and stating how it is verified), a **Public interface contract**,
and **New follow-up questions**.

Version-level artifacts sit outside the per-feature sequence:
`{{Project}}Specification-X.Y.md` (the master index),
`general/system-architecture.md` and `general/technology-choices.md`,
both reviewed on every version bump and each carrying its own change
history.

#### 2. Role set — ten agents

Every agent is single-purpose, configured by frontmatter (`name`,
`description`, `tools`, `model`, `permissionMode`, `maxTurns`) with the
body as its system prompt.

| Agent | Purpose | Model | Access | Write boundary |
|---|---|---|---|---|
| `specwriter` | Brief → functional spec | Opus 5 | read + write | `specifications/v<X.Y>/*-spec-*.md` |
| `researcher` | Investigates topics, web + local | Sonnet 5 | read-only + web | `specifications/v<X.Y>/research-*.md` |
| `designer` | UI/UX design specs from a functional spec | Sonnet 5 | read + write | `specifications/v<X.Y>/design-spec-*.md` |
| `architect` | Validates a spec, produces the ADR | Sonnet 5 | read-only | ADRs |
| `securityreviewer` | Mode-A at the ADR gate, Mode-B at the code gate | Sonnet 5 | read-only | none (findings go into the ADR) |
| `copywriter` | User-facing copy from a tone-of-voice guide | Opus 5 | read + write | copy surfaces |
| `implementer` | Code + unit tests from spec + ADR | Sonnet 5 | read + write + bash | source tree; unit tests alongside the code |
| `testwriter` | Integration / acceptance tests against the spec | Sonnet 5 | read + write + bash | the separate test tree |
| `reviewer` | Quality, correctness, security review of code | Haiku 4.5 | read-only | none |
| `target-reviewer` | Readiness gate before an unsupervised run | Sonnet 5 | read-only | none |

Two properties are load-bearing and migrate unchanged. **Write
boundaries do not overlap** — `implementer` owns unit tests alongside
the code, `testwriter` owns a separate integration tree, and the two
never write the same file. And **`copywriter` is deliberately
incomplete**: it carries web-copy craft but not the brand voice, reads
that from an external tone-of-voice guide, and halts if none exists —
which is what keeps one voice document authoritative across every
surface.

#### 3. Document templates — eleven

Nine live in `specifications/`, one in `targets/`, one in `copy/`. Each
shows structure *and expected depth*; the pack's instruction is to read
the template before writing.

`master-spec.template.md` · `feature-spec.template.md` ·
`design-spec.template.md` · `epics-and-tasks.template.md` ·
`adr-feature.template.md` · `adr-epic.template.md` ·
`research.template.md` · `system-architecture.template.md` ·
`technology-choices.template.md` · `target.template.md` (moves to
`shared/targets`) · `tone-of-voice.template.md`.

**Gap, recorded not fixed:** there is no **brief** template, even though
a brief feeds every one of the above. Q-36.

#### 4. Conventions — `conventions.md`

- **File naming** per document type, with a sanctioned
  **feature-prefixed variant** (`F3-spec-…`, `F3-ADR-005-…`) for version
  folders holding many features. Pick one variant per project; never
  mix. The ADR number stays project-monotonic in both variants.
- **Per-version folders** — `specifications/v1.X/`. No shared "current"
  folder; frozen versions stay where they were written.
- **Numbering** — epics `E-N`, version-agnostic and monotonic across
  releases. Tasks under one of two schemes chosen per project: **A**
  (epic-derived `T-XXYY`, good when epics are stable) or **B** (flat
  `T-NNNN`, good when tasks get re-parented). User stories `US-N`,
  per-feature blocks, continuous across versions, gaps left retired.
  ADRs `ADR-NNN` three-digit monotonic, or `ADR-EXX` epic-scoped.
- **The counter table** in `CLAUDE.md` records the scheme and the
  last-used value for every counter, so no number is ever reused.
- **A required header block** on every document: title, Version, Status,
  Date, Platform, References, and a non-negotiable **Amendment
  history** table.
- **Canonical section order** per document type — 10 sections for a
  feature spec, 3 for a design spec, 3 for epics-and-tasks, 5 (or 8 with
  a security pass) for an ADR. Don't invent new sections.
- **Open questions** numbered `Q-N` per document, keeping their ID when
  they move to Resolved Decisions; cross-feature questions live only in
  the master spec.
- **Status values** — `Draft | In Review | Accepted | Superseded`; a
  superseded ADR reads `Superseded by ADR-NNN` so the chain is
  traceable.
- **Ownership, no-overlap** — the master spec owns version-level context
  and one stub per feature; the feature spec owns everything per-feature.
  If a paragraph is being copied between them, one of them is wrong.

#### 5. Coordination rules — **the weak part**

Two agent-team prompts, each a complete seed message: `Specify.md`
(researcher + specwriter + designer + copywriter + architect →
PROCEED-stamped spec set) and `Implement.md` (implementer + testwriter +
reviewer + securityreviewer → shipped code, epic by epic). Intended flow
is `Specify.md` → `Implement.md`. Each prompt carries a **Coordination
rules for the lead** section — the lead's playbook, e.g. block the
implementer until the architect posts `PROCEED` — and a **file-ownership
table** giving each agent a non-overlapping write boundary. The README
names the three customisation points (path references, feature
description, ownership table) and says when to skip the team entirely
(renames, dep bumps, one-prompt-one-output work).

**What is missing:** no routing table mapping prompt shape to agent, no
parallelization rules, no explicit no-auto-chaining rule. The writing
pack has all three. Deferred to `coding@1.1` by Q-6.

#### 6. Behavioural guidelines — `CLAUDE.md.template`

Fifteen headings: project overview; per-module folder structure,
architecture and platform notes for a primary and a secondary module;
specification structure with a **document inventory** table; external
APIs and integrations; conventions enforced for agents; and a short
autonomous-work note pointing at targets. Standing rules carried in
that file: unit tests live alongside the code (`implementer`),
integration and acceptance tests in a separate tree (`testwriter`),
cross-cutting decisions are recorded as ADRs rather than settled in
chat, and no secrets are committed. Per Q-7 the pack-owned regions of
this file are marked and maintained by `harness update`, while the
project-owned prose around them is never touched.

#### 7. Folder scaffolding

```
<repo>/
├── CLAUDE.md                        ← from CLAUDE.md.template
├── .claude/
│   ├── agents/                      ← 10 agent definitions
│   └── commands/target.md           ← /target
├── AgentTeams/                      ← rename of agent-teams/
│   ├── Specify.md, Implement.md, README.md
├── specifications/
│   ├── README.md, conventions.md
│   ├── *.template.md                ← 9 document templates
│   ├── <product>/general/           ← system-architecture, technology-choices
│   └── v1.X/                        ← per-version working folder
├── targets/                         ← from shared/targets
│   ├── README.md, Run.md, target.template.md
│   └── target-<slug>.md + work logs ← project content, added later
├── copy/tone-of-voice.md            ← filename transform from *.template.md
└── infrastructure/backend-deploy/   ← scaffold, opt-in
```

Three transforms are structural and were discovered by applying this
pack to this repo by hand: a **directory rename** (`agent-teams/` →
`AgentTeams/`), a **filename transform** (`*.template.md` → `*.md`), and
**mapping into a tool-owned directory** (`agents/`, commands →
`.claude/`). Two READMEs also describe their own copying and go stale
the instant they are applied — the case Q-10's marked regions exist for.

#### 8. Skills and automations — **the weak part**

The whole of it: **one slash command**, `/target <file>`, which runs the
readiness gate, executes per `Run.md`, verifies, and stops. **Zero
hooks. Zero skills. No default permission set.**

The absence of a permission set is not cosmetic. `Run.md`'s permission
pre-flight exists precisely because the pack ships nothing, so every
project hand-configures the pre-authorised actions a target needs, and
a run that hits an unlisted action at 80% done aborts. R5's candidates —
`/spec`, `/feature`, `/review`, a no-code-before-PROCEED hook — are
named in the brief and deferred by Q-6.

#### 9. Autonomy contract — **the strong part**

A **target** is a measurable goal an agent works toward alone, stopping
at **SUCCESS** (every criterion verified) or **ABORT** (a stop condition
fired). Never an open-ended "improve X". The contract is one filled
`target.template.md` with eight numbered sections — Target; Success
criteria; Scope & boundaries; Permissions & autonomy envelope; Behavior
on obstacles; Abort criteria; How to commit the work; Work log — plus a
Readiness-gate block.

Lifecycle: **author** → **review** (the independent `target-reviewer`
returns `READY` / `NEEDS-CORRECTION`, and the permission pre-flight runs
here) → **run** (`/target`, unsupervised, log appended as it goes) →
**stop** (exactly two ways) → **report**. Six principles hold it
together: measurability is the stop condition; bounded autonomy ("ask
forgiveness" is banned); honest verification (a criterion is met only
after its check is re-run and passes); loop avoidance; auditability via
the work log; fail-safe on ambiguity.

This is the part `writing` lacks entirely, and it is the reason Q-4
names targets the first and clearest `shared/` candidate. At v1.0 it
moves to `shared/targets` and `coding` references it.

---

### `packs/writing/` — extracted from `AIImpactOnOrganizationsAndLeadership/`

**Source:** `/Users/mrandersen/Projects/AIImpactOnOrganizationsAndLeadership/`,
at a recorded commit. Never packaged before; still lives inside the
project that grew it.
**Migration:** faithful (Q-6), minus everything project-specific.
**References:** `shared/presentation`. **Not** `shared/targets` at v1.0.
**Scaffolds:** `writing-workstream`.

#### 1. Process — nine stages in two strict sequences

The phases are strict: do not skip a phase, do not substitute one agent
for another.

**Stage 1 — research, in the shared corpus, once per subject:**

```
scout → researcher → librarian → analyst
```

| Step | Artifact | Rule |
|---|---|---|
| `scout` | `sources/_scouting/<topic>.md` | Always first for a new subject. Never skip to analyst, writer or any later phase before a scouting file exists |
| `researcher` | `sources/<topic>-sources.md` | Fills the gaps scout identified; produces an annotated source list |
| `librarian` | `sources/<year>/` + updated `sources/bibliography.md` | Runs after each batch of new sources. Never let `sources/inbox/` accumulate before analysis |
| `analyst` | `analyses/<source-slug>.md` | Only on sources scout or researcher flagged as central. **One source per invocation** |

**Stage 2 — writing, per workstream:**

```
outliner → writer → critic → editor → published
```

| Step | Artifact | Gate |
|---|---|---|
| `outliner` | `workstreams/<name>/outlines/` — 2–3 *genuinely different* structures, not three flavours of one | The user picks. Never draft without a chosen outline saved |
| `writer` | `workstreams/<name>/drafts/<piece>-v<N>.md` | Never invoked without an approved outline |
| `critic` | `workstreams/<name>/reviews/<piece>-v<n>.md` | Revision loop **capped at two**; after two, escalate to the user rather than continuing |
| `editor` | Line edits in place | Only after the critic loop closes. Never touches structure or argument |
| published | `workstreams/<name>/published/` | **The user does the final read. Never move a file into `published/` autonomously** |

The split is deliberate and stated in the source: the research phase
always runs in the shared corpus; only outline → draft → review →
published are per-workstream, so one folder shows a deliverable
end-to-end. The retired top-level `/outlines`, `/drafts`, `/reviews`,
`/published` folders do not migrate.

#### 2. Role set — eight agents

| Agent | Purpose | Model | Tools | Write boundary |
|---|---|---|---|---|
| `scout` | Map an unfamiliar field fast; stop at "here is what is worth reading" | Sonnet | WebSearch, WebFetch, Write | `sources/_scouting/` |
| `researcher` | Gather sources, build an annotated list | Sonnet | Read, Grep, Glob, WebSearch, WebFetch, Write | `sources/<topic>-sources.md` |
| `librarian` | Ingest, dedupe, tag, maintain the bibliography | Sonnet | Read, Write, Edit, Bash | `sources/`, `bibliography.md` |
| `analyst` | Close-read one source; extract the actual argument | Opus | Read, Write, Edit | `analyses/` |
| `outliner` | Turn the corpus into 2–3 candidate argument structures | Opus | Read, Write | `outlines/` |
| `writer` | Draft and revise against an approved outline | Sonnet | Read, Write, Edit | `drafts/` |
| `critic` | Adversarial review on five axes; finds what is wrong | Opus | **Read only** | none |
| `editor` | Line-level polish; makes the change rather than proposing it | Sonnet | Read, Edit | `drafts/`, in place |

The boundaries are drawn by **stage folder** rather than by file type —
a cleaner separation than `coding` achieves, and one worth noting when
the two packs are compared. `librarian` is the only agent with `Bash`.
`critic` is the only pure read-only role, and the split between `critic`
(structure and argument) and `editor` (sentences) is enforced by their
descriptions rather than by tooling.

**Gap:** there is no gate role. The publish gate is a human, and the
pack has no analogue of `target-reviewer` — nothing independently
validates that a piece is ready before a phase transition.

#### 3. Document templates — **the weak part**

Exactly **one** template exists, and it lives inside a workstream rather
than in a pack-level template kit: a post template under
`workstreams/learning-journey/`. Every other artifact shape — the
scouting map, the annotated source list, the source analysis, the
outline candidate, the draft, the critic review, the per-folder
`index.md`, `Home.md` — is **described in prose** inside agent prompts
and `CLAUDE.md`, not templated.

Compare `coding`'s eleven. This is the writing pack's second real gap
after parts 8 and 9, and a faithful migration cannot close it — Q-31.

What *does* migrate as reusable reference material is `writing-guide/`:
`tone-of-voice.md` (the register — plain, first-person, unhyped),
`ai-tells.md` (the screen that removes AI giveaways), and
`bilingual-publishing.md` (one file per language, header + `---` +
prose, translate and screen last). Its own README declares it
"deliberately project-agnostic… so you can drop this folder into another
repo", with exactly one project-specific dependency — the voice samples
— which becomes a placeholder on migration. It is a reference kit rather
than a set of document templates, so it does not close the part-3 gap;
it is listed here because it is the most portable thing in the pack.

#### 4. Conventions

- **`index.md` in every folder**, with a table of file, description,
  created, updated. Append a row when adding a file; bump `Updated` when
  modifying one. **ISO dates** throughout.
- **`Home.md` is the map-of-content** — the reader's front door, a thin
  navigation layer linking the per-folder `index.md` files rather than
  duplicating their tables, carrying a dated "You are here" snapshot.
- **Versioned drafts, never overwrites** — `intro-v1.0.md`,
  `intro-v1.1.md`. Prior drafts are always preserved.
- **Never invent sources.** `[NEEDS SOURCE]` markers are acceptable;
  fabrication is not.
- **Sources filed by year** (`sources/<year>/`) alongside `_scouting/`,
  `_problems/` and `inbox/`; the bibliography is the index.
- **One analysis per source**, slug-named, read in the context of prior
  analyses.
- **Voice and style** as declared fields: audience, tone, length norms,
  citation style, plus voice samples the writer must read before
  drafting and the editor must revisit in a dedicated pass.
- **An explicit words-and-patterns-to-avoid list**: em-dashes (named as
  the #1 tell), the rule of three, "it's not just X, it's Y",
  signposting ("Importantly,", "Ultimately,"), corporate diction
  (delve, leverage, robust, seamless, unlock, foster, navigate), empty
  intensifiers (game-changing, cutting-edge), and the summarising outro.
  Plus: no header shorter than two words, and no bullet list where prose
  would do.

**Gap vs `coding`:** no numbering scheme, no status values, no counter
table, no amendment history. Draft version numbers in filenames are the
pack's entire ID system. Whether that is a deficiency or a correct fit
for the domain is a genuine question the anatomy surfaces and this spec
does not settle.

#### 5. Coordination rules — **the strong part**

This is what `coding` lacks, and it is specific enough to migrate
verbatim.

- **Routing defaults** — an eight-row prompt-shape → agent table: "map
  the field" / "what's been written about X" / "new topic" → `scout`;
  "find sources on X" / "annotated reading list" → `researcher`; "ingest
  these PDFs" / "update the bibliography" → `librarian`; "close-read
  this source" / "what does this paper argue" → `analyst`; "give me
  outline options" → `outliner`; "draft against the outline" → `writer`;
  "tear this draft apart" / "review this draft" → `critic`; "polish" /
  "line edit" → `editor`.
- **Parallelization rules** — scouts **run in parallel** when given
  multiple distinct subjects, and are spawned in a single message.
  Analysts **run serial**, because each reads in the context of prior
  analyses and parallel runs lose that context. Writer, critic and
  editor are **never parallelized** for the same piece.
- **No auto-chaining** — after each agent reports back, stop and wait for
  user direction, unless the user explicitly asked for the full
  pipeline.
- **Bounded escalation** — the critic loop is capped at two revisions;
  after two, escalate to the user rather than continuing.

#### 6. Behavioural guidelines — **the strong part**

A single `CLAUDE.md` carrying: what the project is; voice and style;
words and patterns to avoid; where things live; the workflow with its
parallelization, routing and chaining rules; and standing instructions
(never invent sources; always preserve prior drafts; re-read the best
recent published piece when in doubt about voice; keep every `index.md`
current; keep `Home.md` current). Alongside it, `writing-guide/` is
knowledge loaded on demand rather than carried in `CLAUDE.md` — the
closest thing either migrated pack has to R5's notion of a skill,
though it is a folder of documents rather than a packaged skill.

#### 7. Folder scaffolding

```
<repo>/
├── CLAUDE.md, Home.md, README.md
├── .claude/agents/                  ← 8 agent definitions
├── sources/                         ← the corpus
│   ├── index.md, bibliography.md
│   ├── inbox/, _scouting/, _problems/
│   ├── <year>/                      ← filed by publication year
│   └── <topic>-sources.md           ← annotated lists
├── analyses/{index.md, _synthesis/} ← one file per source
├── notes/{index.md, voice/}
├── tasks/{index.md, research-agenda.md, …}
├── writing-guide/{tone-of-voice.md, ai-tells.md, bilingual-publishing.md}
└── workstreams/
    ├── index.md                     ← registry of workstreams
    └── <name>/                      ← ← the writing-workstream scaffold
        ├── index.md                 ←   hub
        ├── outlines/, drafts/, reviews/, published/
        └── (planning docs, e.g. a communications strategy)
```

The **`writing-workstream` scaffold** (G5/R6) is the per-workstream half:
`index.md` plus the four stage folders, each with its own `index.md`.
Adding a workstream is `harness init`'s scaffold operation rather than a
manual mkdir.

#### 8. Skills and automations — **absent**

Zero slash commands. Zero pack-owned hooks. Zero skills. `.claude/`
in the source project holds `agents/` and a settings file, nothing else.

Two things in the source must **not** migrate, and saying so is part of
the spec:

- The single `PostToolUse` hook present is a **third-party notifier**
  belonging to an unrelated tool, not a pack construct.
- The permission allowlist is roughly 120 accreted, project-specific
  entries — individual `curl` URLs, dozens of `WebFetch(domain:…)` rows,
  an Xcode build command from a different project entirely. Migrating it
  would ship one project's history as another project's defaults.

So the pack ships **no** part 8 at v1.0 and declares it `absent` with
that reason. The irony is worth recording rather than hiding: the
writing pack's two most forgettable rules — *never overwrite a draft*
and *append a row to `index.md`* — are precisely the hook candidates R5
names, and the pack that most needs them ships neither. See Q-30.

#### 9. Autonomy contract — **absent**

No target contract. No readiness gate. No autonomy envelope. No abort
criteria. No work log. No SUCCESS/ABORT termination.

What the pack has instead is an implicit posture: **no auto-chaining**
means every phase ends by returning to the user, and publishing is
unconditionally human-gated. That is a *supervision* rule, not an
autonomy contract — it describes what the agent may not do alone rather
than what it may do alone and how it stops. Under the anatomy this part
is **missing, not merely different**, and `writing@1.1` closes it by
referencing `shared/targets` (Q-6).

---

### `packs/planning/` — authored from the Q-11 knowledge base

**Source:** the portfolio-roadmap-deck workstream in
`AIImpactOnOrganizationsAndLeadership/`, treated strictly as a
**knowledge base** — the loop, the gate, the horizon determinants, the
template fields, the five practices, the two calibration poles. **No
runtime or process dependency**, and **not** a reuse of the writing
pack: the deck was produced by the writing pipeline, but that is
incidental. Take the process and the templates, which the critic pass
found "realistic and internally consistent"; leave the surrounding
claims, which the same pass marked "revise heavily".
**Migration:** none — this pack is authored. Q-6's fidelity constraint
governs migrations and does not apply here (Q-29).
**References:** `shared/targets`, `shared/presentation`.
**Scaffolds:** none at v1.0; the base pack *is* the portfolio shape.
**Provenance to record:** `base-deck-v2.1.md` (slides 8, 12, 17,
appendices A3/B3), `simulated-companies.md`, and
`specifications/v1.0/research-planning-pack-framing.md`.

#### 1. Process — a six-phase loop with one non-delegable gate

```
intake → discovery → prioritize → commit → deliver → [ABSORPTION/SECURITY GATE] → learn
   ↑                                                                                 │
   └─────────────────────────────────────────────────────────────────────────────────┘
```

It is a **loop**, not a pipeline: `learn` feeds the next `intake`. Under
AI the bottleneck migrates from deliver up-stack to
discovery/prioritize, which is the structural argument the loop encodes.

| Phase | Artifact | Gate |
|---|---|---|
| Intake | An entry in the portfolio intake (Now-Next-Later) register | Nothing enters without passing the intake gate field |
| Discovery | Evidence notes, classified against the claims ledger; a draft opportunity/bet brief | Claims classified frame / mechanism / vendor magnitude |
| Prioritize | A ranked portfolio register, cut to **absorbable** capacity, not to available capacity | Concentration, not breadth |
| Commit | A committed bet brief with **kill criteria**, plus a horizon record from the decision aid | **Kill criteria stated before the bet starts.** Horizon-setting is a first-class step here, not an afterthought |
| Deliver | Milestone progress against the committed brief | — |
| **Absorption / security gate** | A gate record: security review, V&V, maintenance capacity, review throughput | **Non-delegable.** PASS or HOLD. This is the pack's direct analogue of `coding`'s ADR-PROCEED |
| Learn | A roadmap review (committed-milestone), which feeds the next intake | Kill-criteria check runs here; a bet that crossed them is killed or explicitly re-committed with a dated rationale |

The gate is the pack's most important structural claim, and the
calibration changes only *how much of it is already held*: at a high
constraint floor it is partly held by existing V&V and regulatory
process; at a near-zero floor "nothing structural holds that gate" and
it must be held by policy.

#### 2. Role set — **provisional; the least evidenced part**

The research is explicit: the phases, the gate, the templates and the
horizon framework are directly supported, but **the roles are inferred
from the phases, not sourced**, and the corpus carries a
`[NEEDS SOURCE — confirmed gap]` marker on EM-portfolio responsibility,
calling it "unwritten territory". That gap sits exactly on the seam
between this pack and `coding`. The instruction the research gives is
binding: *settle roles at spec time and do not overclaim.*

Six candidate roles, all shipped **marked provisional** in the pack
itself:

| Candidate role | Phase | Proposed write boundary |
|---|---|---|
| Portfolio steward | intake, prioritize | the portfolio register and intake entries |
| Discovery lead | discovery | evidence notes |
| Prioritizer / bet-framer | prioritize, commit | bet briefs, pre-commit |
| Horizon analyst | commit | horizon records |
| Absorption-gate reviewer | the gate | gate records only; read-only elsewhere |
| Learning synthesiser | learn | roadmap reviews |

Two properties are **not** provisional, because they follow from the
process rather than from the role literature:

1. **The gate reviewer must be a distinct role from whoever ran
   deliver.** Non-delegability is a separation-of-duties claim, and it
   is structurally the same relationship `coding` has between
   `implementer` and `securityreviewer`.
2. **The gate verdict must be a named token, not prose** — the same
   design decision that makes `PROCEED` and `READY`/`NEEDS-CORRECTION`
   auditable in `coding`.

#### 3. Document templates — four

Three already exist in draft with **fields fixed**, each carrying two
filled examples at opposite calibration poles. The template is identical
across poles; only the fill changes.

| Template | Fields | Status |
|---|---|---|
| **Opportunity / bet brief** | problem/opportunity · the bet · reversibility · absorption cost · horizon · kill criteria | Drafted, fields fixed, 2 filled examples |
| **Roadmap review** (committed-milestone) | what changed · kill-criteria check · absorption capacity · horizon check · intake gate | Drafted, fields fixed, 2 filled examples |
| **Portfolio intake** (Now-Next-Later) | what changed · kill-criteria check · absorption capacity · horizon check · intake gate | Drafted, fields fixed, 2 filled examples |
| **Horizon decision aid** | A walkable path, not a fill-in form | To author from the four determinants |

The horizon decision aid encodes the framework directly:

> `horizon ≈ max(longest-lead physical/regulatory constraint,
> capital-commitment irreversibility)`, adjusted **up** when uncertainty
> resolves slowly, and **down** when competitive substitution is fast.

Four determinants, arrived at as a triangulation across five sources
rather than taken from any single one. Horizon is **computed, not
chosen** — which is why it ships as a walkable aid rather than a field
someone fills in from instinct.

Template *fields* were stable across deck v1 → v2.1; the surrounding
claims were not. The pack records which draft it was authored from so a
later revision can be checked against what shipped.

#### 4. Conventions

- **Evidence discipline** — every claim classified as **frame**,
  **mechanism**, or **vendor magnitude**. Vendor telemetry is never
  stacked as if it were independent corroboration. This is not an
  aspiration: a critic pass on the source material caught a
  fabricated-looking citation on a load-bearing slide, which is why the
  discipline is a pack convention rather than a matter of memory.
- **A claims ledger** — every load-bearing claim recorded with its
  source and its classification.
- **Kill criteria stated BEFORE a bet starts.** A bet without kill
  criteria is not committed. **Enforced by the `/bet` command's own
  instruction and by review (part 8), not by a hook** — no pack may
  register an agent hook at v1.0 (`F1-ADR-001` §7.2.5). This is the same
  treatment `coding` gives its no-code-before-`PROCEED` rule and
  `writing` gives its index rule: a stated rule an agent follows, not a
  mechanism that stops the write. Recorded as a shortfall in
  §Error States rather than presented as enforcement.
- **No drift substituting for decision** — a bet that crosses its kill
  criteria is killed, or explicitly re-committed with a dated rationale.
  Silence is not a decision, and "we kept going" is not a re-commitment.
- **Record the calibration** the project was initialised with, and the
  deck draft the templates were authored from.
- **Bet status vocabulary** — `proposed | committed | held-at-gate |
  killed | absorbed`. **Provisional**: inferred rather than sourced, and
  marked as such in the pack (Q-32).

#### 5. Coordination rules

- **Cadence follows uncertainty resolution, not the calendar.** The
  calendar is a backstop, not a trigger. A quarterly review that fires
  because it is a quarter later, on a bet whose uncertainty has not
  moved, is a ritual rather than a decision.
- **The gate is non-delegable**: it may not be cleared or waived by the
  party that ran deliver, and it may not run in parallel with `learn`.
- **A bet crossing its kill criteria escalates immediately**, not at the
  next scheduled review — that is precisely the drift the conventions
  prohibit.
- **The loop closes**: `learn` feeds the next `intake`; a review that
  produces no intake consequence has not finished.

Whether this pack ships a routing table and parallelization rules from
the start — which would give it a stronger part 5 than `coding` — is
Q-29, since it authors rather than migrates.

#### 6. Behavioural guidelines — the five practices

These generalise across both calibration poles and read directly as
standing `CLAUDE.md` instructions:

1. **Concentrate the portfolio to absorbable capacity** — not to
   available capacity, and not to what fits on a slide.
2. **Set the horizon by the binding constraint**, not by the planning
   calendar.
3. **Match cadence to uncertainty resolution.**
4. **Keep the security gate non-delegable.**
5. **Budget review capacity as a portfolio input** — review throughput
   is a constraint on how many bets can run, not an afterthought.

#### 7. Folder scaffolding

```
<repo>/
├── CLAUDE.md
├── calibration.md                   ← the init parameter, recorded
├── .claude/{agents/, commands/, hooks/}   ← hooks/ is INERT at v1.0
├── portfolio/
│   ├── register.md                  ← Now-Next-Later
│   └── intake/                      ← intake entries
├── bets/<bet-slug>/
│   ├── brief.md                     ← the opportunity/bet brief
│   ├── horizon.md                   ← the horizon record
│   ├── gate/                        ← absorption/security gate records
│   └── reviews/                     ← roadmap reviews for this bet
├── claims/claims-ledger.md
├── decisions/decision-log.md
└── targets/                         ← from shared/targets
```

One folder per bet keeps a bet's brief, horizon, gate record and reviews
together — the same "one folder shows the whole thing" instinct the
writing pack applies to workstreams.

The `.claude/hooks/` directory stands, and its contents are **inert at
v1.0**: the one file in it is written `0644`, is registered by nothing
and is executed by nothing, because no pack may register an agent hook at
v1.0 (part 8, `F1-ADR-001` §7.2.5). `harness validate` says so with
`W-HOOK-SCRIPT-INERT` and `harness pack info` repeats it, so the
directory's presence never implies enforcement that is not there.

#### 8. Skills and automations

The only pack shipping a non-trivial part 8 at v1.0. Its status is
`present`:

| Construct | Behaviour |
|---|---|
| `/bet` | Open a new bet brief from the template, in `bets/<slug>/brief.md`. Its instruction carries the kill-criteria rule: the command does not mark a bet committed while `Kill criteria` is empty or still at its placeholder, and emits the §Error States block message instead |
| `/review` | Run a roadmap review against a committed milestone. Checks each reviewed bet's kill criteria are present and still meaningful, and escalates a bet that has crossed them |
| `/horizon` | Walk the horizon decision aid and write a horizon record |
| `.claude/hooks/kill-criteria-guard.sh` | A documented **inert** guard script. It ships as an ordinary `0644` file, **registered by nothing and executed by nothing at v1.0** |

**The kill-criteria guard does not run at v1.0, and this is a format
decision rather than an oversight** (`F1-ADR-001` §7.2.5). An earlier
draft of this pack shipped the guard as a registered agent hook. **No
pack may register an agent hook at v1.0**: `hooks` is outside the ownable
set of `.claude/settings.json` entirely, and a pack declaring it fails
validation with `E-OWNEDKEY-FORBIDDEN` (F1 §US-6). The decisive reason is
`update`: a hook's command string is a merge target, so a 3-way merge
between a pack's change and a user's change can resolve to a command
**neither party wrote**, and no v1.0 mechanism re-consents to that.

What survives is worth being exact about:

- The **rule** survives, and is enforced by the `/bet` command's own
  instruction and by `/review` — the same treatment this spec already
  gives `coding`'s no-code-before-`PROCEED` rule and `writing`'s index
  rule (§Error States, *Stated rules that ship unenforced at v1.0*).
- The **message** survives verbatim, in §Error States. Only its emitter
  changed, from a hook to the `/bet` command's agent instruction.
- The **script** survives as content, so that `update` carries it forward
  unchanged and a v1.1 that gains a hook-registration mechanism has
  something to register. `harness validate` names it with
  `W-HOOK-SCRIPT-INERT`, and `harness pack info` lists it as inert, so
  nobody reads the file and concludes it runs.
- What does **not** survive is enforcement at the file write. US-26's
  criterion "the block fires on the file write, not only at a later
  review" is **not met at v1.0** and is recorded as a shortfall below,
  not quietly reinterpreted.

`/review` collides in name with a deferred `coding` candidate. Because a
project holds exactly one pack (Q-12), command namespaces never
intersect in practice and no disambiguation is needed.

That an authored pack reaches an adequate part 8 while both migrated
packs do not is still true, but it now rests on **three slash commands
rather than on the hook**, and it should be read as the weaker claim it
has become. Part 8 nonetheless stays **`present`, not `provisional`**:
three working slash commands are real content, and this spec asserts
"exactly one provisional part" across the three packs as a **counted**
NFR — that one is `planning`'s role set (part 2). Marking part 8
provisional would make it two and break a mechanically checked NFR in
order to describe a gap that already has a form: the shortfall record.

#### 9. Autonomy contract

References `shared/targets`. The fit is unusually good and it is worth
being precise about why: **a bet's kill criteria *are* abort criteria**,
and **its success metric *is* a measurable stop condition** — the two
things the targets format most often has to be invented for are already
mandatory fields on the bet brief.

One addition the pack must make: **a target may carry a bet up to the
absorption gate; it may never clear it.** The planning pack's target
template lists clearing or waiving the gate as an abort criterion, and
`target-reviewer` returns `NEEDS-CORRECTION` for any planning target
whose success criteria can only be met by passing it. That is a stronger
constraint than `shared/targets` currently expresses — "fail-safe on
ambiguity" is adjacent but not the same as a named phase the envelope
may never enter — and whether `shared/targets` should learn to express
it is Q-34.

#### Calibration — the pack's defining property, and a stress on the format

`packs/planning/` is **parameterized at init by constraint floor**.
This is the single most important thing about it and the reason Q-9
chose a third pack at all.

`harness init planning --calibration <name>` ships two reference
calibrations:

| | **High constraint floor** | **Near-zero constraint floor** |
|---|---|---|
| Reference | Helio — regulated med-device hardware | Cadenza — AI-native SaaS |
| Programme shape | 18–36 month clearance-gated programmes | Near-free build, weekly releases |
| Horizon defaults | Long, set by regulatory and physical lead time | Short, set by competitive substitution speed |
| Cadence defaults | Slow — uncertainty resolves slowly | Fast — uncertainty resolves weekly |
| Absorption gate | Partly held already by existing V&V and regulatory process | **Nothing structural holds it.** Must be held by policy |

"Most real organizations sit somewhere between them," and the two poles
ship as reference points to calibrate against rather than as an
exhaustive menu.

**What varies:** cadence defaults, horizon defaults, and the
absorption-gate text describing how much of the gate is already held.
**What does not vary:** the six phases, the existence and
non-delegability of the gate, the four template field lists, and the
five practices. Every varying file appears in `harness validate --json`'s
`parameterVaryingFiles`; nothing else may differ (NFR, US-19).

**Why this is a first-class requirement rather than a detail:** *no
existing pack has a parameter that changes its content.* Q-10's marked
regions are a two-valued, apply-time switch (source vs applied);
calibration is an N-valued, init-answer-driven variable over a declared
file set. This spec adopted the research's instruction — **if the format
cannot express calibration, change the format rather than flatten the
pack** — and raised it as Q-13.

**Q-13 is now closed, and the answer is that the format already
expresses it** (`F1-ADR-001` §6.2). No new grammar was added. The
mechanism is three things F1 §US-8 already specifies:
`when` mappings select whole files by the recorded answer — which is
what `calibrations/<name>/` *is*, a pack-authoring convention over
`when` rather than a format feature; `harness:if constraintFloor=<value>`
regions vary content inside a file; and `{{harness:param.constraintFloor}}`
substitutes the answer, which is all the calibration record file needs.
The CLI surface `harness init planning --calibration helio` is likewise
data, not code: `parameters[].flag` declares the alias in `pack.json`,
so the CLI contains zero knowledge of `planning` and S5 stays a claim
this pack can falsify rather than one it quietly exempts itself from.

---

### `shared/` — the cross-cutting components

Per Q-4: a `shared/` tree sits alongside `packs/`; each pack lists the
shared files it pulls in via `pack.json`; **nothing is inherited
implicitly**; and **changing a shared file requires bumping every pack
that references it**, which the CLI enforces or at minimum warns on.

#### `shared/targets`

The autonomy contract, lifted out of `coding` because it is genuinely
domain-agnostic — Q-4 names it "the first and clearest candidate".

| File | Destination on apply |
|---|---|
| `target.template.md` | `targets/target.template.md` |
| `Run.md` | `targets/Run.md` |
| `README.md` | `targets/README.md` |
| `target-reviewer.md` | `.claude/agents/target-reviewer.md` |
| `target.md` (the command) | `.claude/commands/target.md` |

| Pack | Declares it? |
|---|---|
| `coding` | **Yes** — v1.0 |
| `planning` | **Yes** — v1.0 |
| `writing` | **No at v1.0.** Deferred to `writing@1.1` by Q-6, where it becomes the first genuine acceptance test of `harness update` (S3) |

Two consequences follow. First, a change to `shared/targets` bumps
`coding` **and** `planning` at v1.0, and `writing` too from 1.1 — the
Q-4 rule, applying immediately rather than hypothetically. Second, this
component lands in **three different destinations** (a reference folder,
a tool-owned agents directory, a tool-owned commands directory) from a
single declaration, which is a capability the shared mechanism must
have. **Settled (Q-27, closed by `F1-ADR-001`):** the component declares
its own `mappings` in `shared/targets/component.json` — the five rows of
the table above, in F1's `Mapping` shape — and a referencing pack
inherits them from its one `shared` entry, optionally overriding a
single destination with `remap`. The declaration lives with the thing
being shared, which is the only arrangement under which `coding` and
`planning` cannot disagree about it.

#### `shared/presentation`

Cross-cutting per Q-9b: presenting finished work is useful from all
three packs, its output format differs while its process does not, and
scoping it to one pack would deny it to the others.

**Honest status: this component does not exist.** The brief asserts it;
nothing in the evidence base defines what it ships. Its best worked
example today is the portfolio-roadmap deck itself, which the planning
research names as such. A minimum v1.0 content set is proposed here for
the architect to accept or replace (Q-28):

- A **deck/document outline template** — framework-first structure with
  a deliverable placement map, modelled on the deck's own chosen
  outline.
- A **talk-track convention** — slide paired with its talk track, as the
  deck's appendices do.
- An **appendix convention** — where blank templates and filled examples
  live relative to the body.
- A **one-claim-per-slide evidence rule**, inheriting the planning
  pack's frame / mechanism / vendor-magnitude classification, so a claim
  cannot appear without its evidence class.

Referenced by all three packs, which means the Q-4 bump rule applies to
every pack in the product from v1.0 onward. **No renderer** — this
component ships conventions and templates, not output generation.

---

### Scaffold inventory, and what actually exists

R6 and G5 name four scaffold shapes. Only one exists today, which is a
v1.0 scope fact rather than a detail.

| Scaffold | Pack | Status at v1.0 |
|---|---|---|
| `backend-azure` — Azure SWA + Neon: `main.bicep`, `production.bicepparam`, `deploy.sh`/`.ps1`, `setup-neon.sh`/`.ps1`, README | `coding` | **Exists** — migrates from `template/infrastructure/backend-deploy/` |
| `backend-aws` — Lambda + CDK | `coding` | **To author** (Q-8a). Named there as the heaviest of the four candidates to author and test, and flagged as v1.0 scope risk |
| `frontend` — site layout, design tokens, component conventions | `coding` | **To author from nothing.** No source material exists |
| `app` — client application layout | `coding` | **To author from nothing.** No source material exists |
| `writing-workstream` — `index.md` + `outlines/`, `drafts/`, `reviews/`, `published/`, each with an `index.md` | `writing` | **Exists** — extracts from the source project's workstream shape |

Three of five must be authored, and Q-8a already carries an accepted
residual risk that both backend scaffolds being declarative-IaC could
bake IaC assumptions into the scaffold interface — mitigated by
paper-checking the interface against one platform-CLI target (Vercel,
Fly) without authoring it. Whether `frontend` and `app` belong in v1.0
at all is Q-17 in the master spec.

---

## Open Questions

`Q-1`…`Q-12` are taken and resolved in the brief's §12 Resolved
Decisions table. Question IDs are unique across the whole project, not
per document: the ids below were reconciled against the master spec and
F1 on 2026-08-30 (see the master spec's *Cross-document consistency
pass*), so they are not contiguous from Q-13 and must not be
renumbered. Two questions F5 raised — Q-35 and Q-37 — were closed by
that pass and now sit in Resolved Decisions below. Cross-feature
questions belong in the master spec, which also indexes every open
question in the project.

Two more closed on 2026-08-30, by `F1-ADR-001-pack-format-and-manifest.md`,
and are **not** listed below. **Q-13** (can the format express content
varying by an init answer?) is owned by the master spec and is recorded
in its Resolved Decisions — the answer is yes, via `when` + `if` +
substitution, with no new grammar; see §Calibration above. **Q-27**
(may a shared component declare a multi-destination mapping?) was raised
here but is a decision about F1's mechanism, so it is recorded in **F1's
Resolved Decisions**, where the mechanism lives — the answer is yes, via
`mappings` in `component.json` with optional `remap`; see
§`shared/targets` above.

| # | Question | Owner | Default assumption |
|---|---|---|---|
| Q-17 | **See Q-17 in the master spec** — do the frontend, app and writing-workstream scaffolds ship at v1.0? F5 raised the same question as: do `frontend` and `app` fit in v1.0, given only `backend-azure` exists, `backend-aws`/`frontend`/`app` must all be authored, and Q-8a already flags AWS as the heaviest and as v1.0 scope risk. Cross-feature, so the master spec owns it. | Thomas Andersen (F5), via the master spec | **F5's assumption, unchanged:** v1.0 ships `backend-azure`, `backend-aws` and `writing-workstream`. `frontend` and `app` slip to the first post-v1.0 bump, and G5/R6 is amended to say so rather than quietly under-delivering. |
| Q-28 | **What does `shared/presentation` actually ship at v1.0?** Q-9b asserts the component; nothing in the evidence base defines its contents. **Escalated to Thomas by `F1-ADR-001` §6.1**, which adds one consideration: all three packs reference it, so under Q-4 every change to it bumps every pack in the product. If its content is unsettled, whether it ships at v1.0 at all is part of the question. | **Thomas Andersen** (with specwriter) | The four items proposed in §`shared/presentation` — outline template, talk-track convention, appendix convention, one-claim-per-slide evidence rule — authored from the portfolio deck as the worked example. No renderer. |
| Q-29 | **Does authoring `planning` violate the faithful-migration boundary (Q-6)?** It has no prior copy to be faithful to, and could ship parts (routing rules, hooks) that `coding` and `writing` are forbidden to gain at v1.0. **Escalated to Thomas by `F1-ADR-001` §6.1** as format-neutral: F1 is unaffected either way, so this is a product-scope call, not an architecture one. | **Thomas Andersen** | Q-6 constrains **migrations only**. `planning` is authored new and may ship a stronger part 5 and part 8 than the migrated packs. Record the asymmetry in the pack README so a later reader does not misread it as cross-pollination. |
| Q-30 | **Does `writing` ship any default permission set or hook, given its source project's is unmigratable?** ~120 accreted project-specific entries plus one third-party notifier hook. | architect | Ship none. Declare part 8 `absent` with that reason. Do not invent a default permission set inside a migration Q-6 forbids from changing content. |
| Q-31 | **Does `writing` ship document templates it does not currently have?** Its part 3 is one post template inside a workstream; every other artifact shape is prose-described. | architect | Migrate the one template into a pack-level `templates/` folder, declare the remaining shapes prose-specified, and record part 3 as thin. Authoring new templates is content work reserved for `writing@1.1`. |
| Q-32 | **Is `planning`'s bet status vocabulary settled?** `proposed \| committed \| held-at-gate \| killed \| absorbed` is inferred from the process, not sourced. | specwriter / Thomas | Ship it marked **provisional** in the pack, alongside the provisional role set, and revisit after the first dogfood project. |
| Q-33 | **Which real planning project dogfoods `packs/planning/` first?** The research says a pack is only as good as the work it has carried, and explicitly rules the deck workstream out as the site (it is a writing project). **Escalated to Thomas by `F1-ADR-001` §6.1**, which notes it is format-neutral but is the only evidence that would test S5 in anger. | **Thomas Andersen** | v1.0 ships `packs/planning/` **without** a dogfood site, and says so. S6-equivalent evidence for this pack is deferred rather than claimed. Identify a site before `planning@1.1`. |
| Q-34 | **Should `shared/targets` learn to express "a phase the envelope may never enter"?** `planning`'s absorption gate is non-delegable; today the template expresses only pre-authorised actions and abort criteria. | architect | No change to `shared/targets` at v1.0 — a change there bumps `coding` too, under Q-4. Express the constraint as an abort criterion in `planning`'s own target instances and revisit if a second pack needs the same shape. |
| Q-36 | **Does `coding` gain a brief template at v1.0?** The brief's §11 step 4 asks for one — the pack templates research, spec, design, ADR and epics, but not the brief that feeds them all. | architect | No at v1.0. Q-6 forbids content changes during migration; log it against `coding@1.1` with the rest of the deferred content work. |

---

## Resolved Decisions

Q-1…Q-12 were resolved before this spec was written and live in the
brief's §12. Two questions raised in F5's drafting were closed by the
cross-document consistency pass of 2026-08-30; both are also indexed in
the master spec's Resolved Decisions. Two further questions F5 raised —
**Q-13** and **Q-27** — were closed by `F1-ADR-001` and are recorded in
the master spec's and F1's Resolved Decisions respectively, not
duplicated here; the Open Questions preamble above says where each
lives. Every other question F5 raised is open and listed above.

| # | Question | Decision | Date |
|---|---|---|---|
| Q-35 | How is the project-monotonic `US-N` counter reconciled across parallel feature specs? F1 and F5 were written in the same pass and both began their blocks at 1. | **Reconciled by the 2026-08-30 consistency pass, along the line this row proposed.** F1 keeps US-1…US-16 (earlier in build order); F5's block was renumbered to US-17…US-28. `CLAUDE.md`'s counter table records `US-28` as last used, with the per-feature allocation in its Notes column. No US number is reused and no gap was created. Standing rule for later parallel passes: the earlier feature in build order keeps its block, later blocks are renumbered at the merge, and the counter table is updated before either spec reaches `Accepted`. | 2026-08-30 |
| Q-37 | Where is a pack's anatomy declaration validated — schema or CLI? | **Answered by F1, not by a new decision here.** `F1-spec-pack-format-and-manifest.md` §User Stories, US-2 pins it: `pack.json` carries a mandatory `anatomy` object with exactly nine keys; a missing key is a hard validation error (`E-ANATOMY-MISSING`, F1 §Error States) naming the key; a key whose globs match no files fails with `E-ANATOMY-EMPTY`; and a part may be declared absent with a non-empty reason, which passes validation and makes `harness init` print the `W-ANATOMY-ABSENT` warning naming the part and the reason. **Residual, now closed.** This row originally flagged a gap for the architect: F1 defined two states (`present` and a `declaredAbsent` key) while this spec's G5.2 and US-20 also use `provisional` for `planning`'s role set. `F1-ADR-001` settled it (conflict 3) — the anatomy carries a three-value `status` enum, `present \| provisional \| absent`, defaulting to `present`; the `declaredAbsent` key is **retired**; `provisional` requires a `note` and `absent` requires a `reason`. F1 §US-2 and §Error States now specify it, and this spec's provisional/absent counts became mechanically checkable as a result. | 2026-08-30 |
