# F5 — Template Packs Specification — Lintel Harness v1.0
**Version:** 2.0
**Status:** Draft
**Date:** {{YYYY-MM-DD}}
**Platform:** Pack content is plain files — Markdown, JSON, shell/PowerShell, Bicep, CDK TypeScript — bundled with the Node/TypeScript CLI and consumed by Claude Code's `.claude/` conventions. No runtime of its own.
**Design spec:** n/a (no UI)
**ADR:** {{`F5-ADR-NNN-template-packs.md` — filled in by the architect after this spec is reviewed}}
**References:** `specifications/general/pack-application.md` (the two-phase apply model — **authoritative**), `specifications/general/pack-inventory.md` (the three pack trees and per-file phase metadata — **authoritative for structure**), `specifications/project-brief.md` §3, §6 R1/R2/R5/R6, §12 Q-1…Q-46, `specifications/v1.0/research-planning-pack-framing.md`, `specifications/v1.0/F1-spec-pack-format-and-manifest.md`, `packs/coding/specifications/conventions.md`, `packs/coding/` (the coding pack source), `/Users/mrandersen/Projects/AIImpactOnOrganizationsAndLeadership/` (the writing pack source)

**Amendment history**

| Version | Date | Summary |
|---|---|---|
| 1.0 | 2026-08-30 | Initial draft. Specifies the content of the three v1.0 packs — `coding`, `writing`, `planning` — against the nine-part anatomy, plus the two `shared/` components they reference. |
| 1.0 | 2026-08-30 | Cross-document consistency pass. User-story block renumbered to US-17…US-28; open questions renumbered to project-unique ids. |
| 1.0 | 2026-08-30 | **ADR-001 amendment pass.** §Error States re-pointed at F1's code taxonomy and exit classes. Q-13 and Q-27 closed. |
| 1.0 | 2026-08-30 | **Security remediation pass.** `planning` loses its kill-criteria enforcement hook; no pack may register an agent hook at v1.0. |
| **2.0** | **{{YYYY-MM-DD}}** | **Two-phase rewrite (Q-39…Q-46).** The whole document is restated against `general/pack-application.md`. **Every pack now authors a `recipe.json`**, specified here as an explicit sub-part of anatomy part 7 (§Flows / *Where the recipe sits*) — the anatomy stays nine parts. Each pack outline is split into **payload** (phase 1, `.harness/pack/`) and **what the recipe produces** (phase 2). **Document templates, conventions and process READMEs are no longer copied out** — they stay in the payload (Q-46 supersedes Q-38). `update`/`status`/`contribute` criteria removed or marked v1.1 (Q-42). `.harness/base/` and all per-file-hash criteria removed (Q-43). All marked-region criteria removed; only inert `CLAUDE.md` anchors remain (Q-45). **Q-46 prose stripping is stated as a migration requirement per pack, with the sections named.** `shared/presentation` removed from v1.0 entirely (Q-28); `shared/targets` kept, declared by `coding`. Scaffolds cut to three, with `backend-azure`/`backend-aws` restated as **alternatives, not composable peers** (Q-17). `constraintFloor` enum values corrected to `high-floor` / `near-zero-floor` per `general/pack-inventory.md`; Helio and Cadenza demoted to reference organisations. **US-23 retired**; US-34…US-38 added. Three new questions: **Q-49, Q-50, Q-51.** |

---

## Introduction

F5 is the **content** feature of Lintel Harness v1.0. Where F1 and F2
specify the machinery that validates and applies a pack, F5 specifies
**what is in the packs**. It is the feature that decides whether the
harness has anything worth applying.

v1.0 ships three packs — `coding`, `writing` and `planning` — and one
`shared/` component, `shared/targets`. A project holds **exactly one**
pack (Q-12). Packs are standalone but may pull files in from `shared/`
by explicit declaration in `pack.json` (Q-4), and changing a shared file
bumps every pack that references it.

**What changed since version 1.0 of this spec, and why it changes the
shape of every pack.** Q-39 split applying a pack into two phases, and
that split is now the organising fact of pack content:

- **Phase 1 — payload.** The CLI copies the pack folder **verbatim** to
  `.harness/pack/`. No renames, no substitution, no rewriting, identical
  mechanism for every pack.
- **Phase 2 — recipe.** The CLI reads `.harness/pack/` (Q-41) and applies
  the pack's own **declarative recipe** over a fixed primitive set —
  `copy`, `rename`, `strip-suffix`, `rewrite-path`, `substitute`,
  `generate`, `merge-json` (Q-40).

Three consequences land squarely on this spec. First, **every pack must
now author a `recipe.json`**, and F5 must say what each pack's recipe
does — that is new required content in all three packs. Second, **the
reference half of a pack is no longer copied out**: document templates,
`conventions.md` and process READMEs live in `.harness/pack/` and are
read from there, which shrinks every applied tree and supersedes Q-38.
Third, **the manual bootstrap prose is deleted from the pack sources**
(Q-46) — the recipe performs that procedure, so the instructions
describing it are dead content, not stale content. Extracting `coding`
and `writing` therefore includes a **stripping step**, named file by
file in §Flows.

Two of the three packs already exist as working folders and are being
**migrated faithfully** (Q-6): `coding` from `packs/coding/` in this
repo, `writing` from the `AIImpactOnOrganizationsAndLeadership` project
that grew it. The third, `planning`, has never existed as a folder — it
is **authored** at v1.0 from the knowledge base named in Q-11. Q-29
confirms that authoring `planning` is not a boundary violation: Q-6
constrains *changing existing* packs and does not restrict *adding* one.

The organising device throughout is the **nine-part anatomy** from the
brief §3.3. A pack is exactly those nine things, and only the content
differs between pack types. The anatomy is the completeness contract:
**a pack missing a part is incomplete, not merely different**, and this
spec states each gap openly. Four gaps are load-bearing v1.0 facts:
`coding` is **weak at 5 and 8**; `writing` is **weak at 3** and
**absent at 8 and 9**; `planning`'s part 2 is **provisional**. Fixing
those is not v1.0 work (Q-6).

The substance of this feature is the three pack outlines, which are
specified in **§Flows / Behaviour** — the pinned shapes F1 and F2
compile against, where `conventions.md` §8 places them. Read that
section first if you are here for the packs themselves.

### What is in scope

- The **payload and recipe of `packs/coding/`**, migrated from the
  existing `packs/coding/` tree: the six-phase gated process, 10 agents,
  11 document templates, `conventions.md`, 2 agent-team prompts, the
  targets way of working, the `CLAUDE.md` template, and two backend
  scaffolds.
- The **payload and recipe of `packs/writing/`**, extracted from
  `AIImpactOnOrganizationsAndLeadership/`: the nine-stage two-sequence
  process, 8 agents, the corpus and per-workstream folder shape, the
  writing guide, the routing and parallelization rules, the `index.md` /
  `Home.md` discipline, and the `writing-workstream` scaffold.
- The **payload and recipe of `packs/planning/`**, authored from the
  Q-11 knowledge base: the six-phase decision loop, the non-delegable
  absorption/security gate, horizon-setting inside commit, four document
  templates, evidence discipline and the claims ledger, the five
  practices, and the **constraint-floor calibration**.
- **`recipe.json` as required pack content**, its placement in the
  anatomy, and what each of the three recipes does.
- The **migration requirements** per pack, including the Q-46 prose
  stripping, named section by section.
- **`shared/targets`** — its contents, its destinations, and which packs
  declare it at v1.0.
- The **scaffold inventory**: three scaffolds, which exist and which must
  be authored, and which are alternatives rather than peers.
- Each pack's **`pack.json` anatomy declaration**: all nine parts named,
  with a part that has no content declared `absent` with a reason.

### What is NOT in scope

- **The CLI mechanics.** `pack.json`'s schema, `recipe.json`'s schema,
  the primitive semantics, the manifest, path confinement, the reserved-
  destination denylist and the apply plan belong to **F1 and F2**. This
  spec states what the packs *contain* and what the format must be able
  to *express*; it does not specify how. **Where this spec and F1 could
  disagree, F1 wins** and the disagreement is flagged, not decided here.
- **The CLI error catalogue.** F1 owns every `E-`/`W-` code and every
  message string. F5 names codes; it does not invent them.
- **`update`, `status` and `contribute` (Q-42).** Deferred to v1.1. No
  criterion in this spec depends on them.
- **Marked regions (Q-45).** No region parser, region hashes, tamper
  detection or source-only/applied-only blocks at v1.0. The generated
  `CLAUDE.md` carries **inert anchors** and nothing more.
- **`.harness/base/` and per-file hash lists (Q-43).**
- **`shared/presentation` (Q-28).** Deferred to v1.1, and **no pack
  references it at v1.0**.
- **Cross-pollination between packs (Q-6).** `writing` gaining the
  targets contract and `coding` gaining routing and parallelization
  rules land in `coding@1.1` / `writing@1.1`.
- **Improving the migrated packs.** No content is added to or rewritten
  in `coding` or `writing` beyond the recipe's mechanical transforms and
  the Q-46 deletions. A typo migrates as a typo.
- **A fourth pack**, and **multi-pack composition** (Q-12).
- **`frontend` and `app` scaffolds** (Q-17, deferred to v1.1).
- **Verifying the portfolio deck's contested claims.** `planning` takes
  the deck's process and templates, which a critic pass found sound; it
  does not take the surrounding evidence, which the same pass marked
  "revise heavily".

---

## Technical Context

Only settled decisions. Everything unsettled is in **Open Questions**.

| Decision | Choice | Rationale |
|---|---|---|
| Apply model | **Two phases.** Phase 1 copies the pack verbatim to `.harness/pack/`; phase 2 runs the pack's declarative recipe, reading from that copy | Q-39/Q-41 — matches what the manual apply actually did; makes the generic half generic and the varying half explicitly per-pack, and gives a phase that cannot fail in an interesting way |
| Phase 2 form | A **declarative recipe** over seven primitives — `copy`, `rename`, `strip-suffix`, `rewrite-path`, `substitute`, `generate`, `merge-json` — applied automatically by the CLI, never by the user | Q-40 — a script would make a pack code that executes on the user's machine, voiding path confinement, the reserved-destination denylist and consent gating, all of which need the plan inspectable *before* anything runs |
| Recipe placement in the anatomy | **An explicit sub-part of part 7**, not a tenth part. The anatomy stays nine parts | §Flows / *Where the recipe sits* — part 7 already answers "what shape does an applied project have?", and the recipe is the executable statement of exactly that. Keeping nine parts preserves F1's nine-key `anatomy` object, the `present`/`provisional`/`absent` enum, and this spec's counted NFRs |
| Where reference material lives | **In the payload.** Document templates, `conventions.md` and process READMEs stay at `.harness/pack/` and are read from there; the recipe copies out only working parts | Q-41 + Q-46 — one copy of the pack per project, no duplication to drift, and no file that is wrong the instant it is copied. **Supersedes Q-38** |
| Bootstrap prose | **Deleted from the pack sources.** "Copy this folder", "rename the template", "fix the paths", "adopting this in a new project" come out of `packs/coding/**` and the writing extraction entirely | Q-46 — the recipe performs that procedure, so the instructions are dead content. This is also what lets phase 1 copy verbatim: nothing in the payload is wrong once copied |
| Pack count at v1.0 | Three: `coding`, `writing`, `planning` | Q-9 — two packs by one author risk a format overfit; a third built against the same core is the real test of R1 |
| Pack home | `packs/<name>/`, bundled into the published CLI package | Q-2 — atomic CLI+pack commits, no cross-version compatibility problem, no network fetch at apply |
| Pack↔project cardinality | A project holds **exactly one** pack | Q-12 |
| Versioning | Per-pack semver in `pack.json` plus `minCliVersion: 1.0.0`; the manifest records both | Q-3 |
| Sharing | `shared/targets` only at v1.0, referenced by explicit declaration; nothing inherited implicitly; changing a shared file bumps every referencing pack | Q-4 |
| Presentation | **Deferred to v1.1, and referenced by no pack at v1.0** | Q-28 — F5 could not source its contents; shipping an unspecified component referenced by all three packs is worse than shipping none |
| Migration fidelity | `coding` and `writing` migrate **faithfully**, modulo the Q-46 deletions, which are enumerated; `planning` is **authored** | Q-6 keeps S6 verifiable; Q-29 confirms authoring `planning` is not a boundary violation |
| `planning` framing | Portfolio and roadmap management as a decision loop: `intake → discovery → prioritize → commit → deliver → learn`, non-delegable absorption/security gate between deliver and learn, horizon-setting first-class inside commit | Q-11 — the spine is evidenced research output, not a process invented to fill a template |
| `planning` parameterisation | Calibrated at init by `constraintFloor`, values `high-floor` \| `near-zero-floor`, expressed as recipe **`when` conditions over `calibrations/<name>/`** | Q-11 + Q-13 — contingency is the research's central finding; the recipe's `when` is the mechanism, and `calibrations/<name>/` is a pack-authoring convention over it, not a format feature |
| Scaffolds | **Three at v1.0**: `backend-azure`, `backend-aws`, `writing-workstream`. The two backend scaffolds are **alternatives within a category, not composable peers** — both write `infrastructure/backend-deploy/` | Q-17 + Q-8a. `frontend` and `app` defer to v1.1 |
| Hooks | **No pack may register an agent hook at v1.0.** `planning` ships three slash commands plus one **inert** `0644` guard script | `F1-ADR-001` §7.2.5 — a hook's command string is a merge target with no re-consent surface |
| Regions | **None at v1.0.** The generated `CLAUDE.md` carries inert anchors as forward investment for v1.1's `update` | Q-45 — regions had two justifications and Q-39/Q-42 removed both |
| Anatomy declaration | Every `pack.json` declares all nine parts with F1's three-value `status`; a part with no content is `absent` **with a reason**, a part that is inferred rather than sourced is `provisional` **with a note** | R2 — "a pack with a missing part is visibly incomplete rather than quietly deficient" |

---

## Goals

Each is assessable yes/no when F5 is done.

- **G5.1** — `packs/coding/`, `packs/writing/` and `packs/planning/` each
  exist with a valid `pack.json` declaring name, semver,
  `minCliVersion`, `shared/` references, parameters and scaffolds.
- **G5.2** — Each pack ships a valid **`recipe.json`** that uses only the
  seven declared primitives and produces the applied tree this spec
  states.
- **G5.3** — Every pack declares all nine anatomy parts. Any part with no
  content is declared `absent` with a stated reason; any part that is
  inferred rather than sourced is declared `provisional` with a note; no
  part is silently omitted.
- **G5.4** — The `coding` migration is faithful: the pack differs from
  the recorded `packs/coding/` source commit **only** by the enumerated
  Q-46 deletions and the added `pack.json` / `recipe.json` / `commands/`
  / `scaffolds/` restructure.
- **G5.5** — The `writing` extraction is faithful and clean: every
  construct listed in §Flows /`packs/writing/` appears in the pack, and
  no artefact specific to `AIImpactOnOrganizationsAndLeadership` (its
  permission allowlist, its third-party hook, its research corpus, its
  voice samples, its personal names, its absolute paths) does.
- **G5.6** — `lintel-harness init planning` at each of the two calibrations
  produces trees that differ in cadence defaults, horizon defaults and
  the absorption-gate coverage text — from one pack source, with no
  forked pack.
- **G5.7** — `shared/targets` exists exactly once in the repo, and every
  pack that uses it declares the reference in its `pack.json`. No pack
  reads a shared file it has not declared.
- **G5.8** — Applying each pack to an empty directory produces a project
  with zero broken internal path references and zero unresolved
  `{{harness:…}}` tokens outside the placeholders the pack deliberately
  leaves for the user.
- **G5.9** — No pack source contains manual bootstrap prose. The named
  sections in §Flows are deleted, and a grep for their headings over
  `packs/` returns zero hits.
- **G5.10** — Each pack's README names all nine parts, states that pack's
  gaps honestly, and says what its recipe produces, so the completeness
  picture is legible without reading this spec (G6).

---

## Out of Scope (this version)

- **`update`, `status`, `contribute`** and everything that depends on
  them (Q-42). The manifest and the inert anchors are the only forward
  investment.
- **Marked regions, region hashes, tamper detection** (Q-45).
- **`.harness/base/` and per-file hash lists** (Q-43).
- **`shared/presentation`** (Q-28) — deferred to v1.1, referenced by no
  pack at v1.0.
- **Cross-pollination (Q-6).** `writing` gaining `shared/targets`;
  `coding` gaining routing and parallelization rules.
- **Filling the coding pack's part 8** beyond the single `/target`
  command. The R5 candidates (`/spec`, `/feature`, `/review`, a
  no-code-before-PROCEED hook, a default permission set) are deferred.
- **A registered hook in any pack.** Deferred to the first version that
  gains a hook-registration mechanism with a designed consent surface.
- **Authoring document templates the writing pack does not have** — see
  Q-31 and Q-51.
- **A brief template for the coding pack** — see Q-36. (`coding` ships
  `specifications/project-brief.template.md` as a *project* brief the
  recipe copies out; a *document-kit* brief template is separate work.)
- **`frontend` and `app` scaffolds** (Q-17).
- **A fourth pack type**, and **multi-pack composition** (Q-12).
- **Third-party pack authoring.**

---

## User Stories

**Range used: US-17…US-22, US-24…US-28, US-34…US-38.**
`US-N` is project-monotonic. F1 holds US-1…US-16 and US-29.

**Retired, never to be reused:**

| ID | Story | Why retired |
|---|---|---|
| US-23 | *Be told which packs a shared change bumps* | Two reasons, both structural. The story asserts behaviour of F1's validator (`E-SHARED-STALE`), not pack content — F1 §US-7 owns it. And at v1.0 `shared/targets` has one declared referencer, so "which packs" is degenerate and the story tests nothing. The Q-4 bump rule survives as a criterion on US-22; the validator behaviour survives in F1. |

---

**US-17 — Stand up a coding project from the pack**
> As a solo operator starting a new software project, I want to apply the `coding` pack in one command so that the spec process, agents, agent teams and targets are in place before I write anything.

**Acceptance criteria:**
- `lintel-harness init coding` in an empty directory exits `0` and
  produces `.harness/pack/`, `.harness/manifest.json`, `CLAUDE.md`,
  `.claude/agents/` (10 files), `.claude/commands/target.md`,
  `.claude/settings.json`, `AgentTeams/` (2 files),
  `specifications/README.md`, `specifications/project-brief.md`,
  `specifications/general/`, `specifications/v1.0/`, `targets/Run.md`
  and `copy/tone-of-voice.md`.
- `.harness/pack/` is **byte-identical** to `packs/coding/` at the
  applied version — same file list, same bytes, same modes.
- `AgentTeams/` exists and `agent-teams/` does not: the directory rename
  is performed by the recipe, not by the user.
- `copy/tone-of-voice.md` exists and `copy/tone-of-voice.template.md`
  does not exist outside `.harness/pack/`.
- **No document template is copied out.** `specifications/` contains no
  `*.template.md` file; the eleven templates are readable only at
  `.harness/pack/specifications/`.
- No file outside `.harness/pack/` contains the string `template/` or
  the string `packs/coding/`.
- `targets/Run.md` and `.claude/commands/target.md` reference
  `.harness/pack/targets/`, and every such reference resolves to a file
  that exists.
- Zero unresolved `{{harness:…}}` tokens remain anywhere in the tree, and
  every placeholder the pack deliberately leaves for the user (for
  example `copy/tone-of-voice.md`'s body) is listed in the init summary.
- Running `/target <a filled target file>` in the produced project
  resolves the command and spawns `target-reviewer` with no path fix.
- Re-running `lintel-harness init coding` in the same directory writes
  zero bytes and fails with `E-ALREADY-APPLIED` (F1 §Error States).

---

**US-18 — Stand up a writing project from the pack**
> As a solo operator starting a research-and-writing project, I want to apply the `writing` pack in one command so that the corpus structure, the eight-agent pipeline and the voice rules exist before the first scout runs.

**Acceptance criteria:**
- `lintel-harness init writing --scaffold writing-workstream` exits `0`
  and produces `.harness/pack/`, `.harness/manifest.json`, `CLAUDE.md`,
  `Home.md`, `.claude/agents/` (8 files), `writing-guide/` (the voice
  guide and the words-to-avoid list, both with the `.template` suffix
  stripped), and the corpus and workstream tree: `sources/` (with
  `_scouting/` and `inbox/`), `analyses/`, `notes/`, `tasks/` and
  `workstreams/`.
- `lintel-harness init writing` with **no** `--scaffold` produces the
  agents, the writing guide, `Home.md` and `CLAUDE.md`, and **none** of
  `sources/`, `analyses/`, `notes/`, `tasks/`, `workstreams/`.
- Every directory the produced `CLAUDE.md` names under "Where things
  live" contains an `index.md`.
- The produced `CLAUDE.md` carries the routing-defaults table (8 rows),
  the three parallelization rules, the no-auto-chaining rule and the
  words-and-patterns-to-avoid section.
- No file in the produced tree — **including `.harness/pack/`** —
  contains a personal name, an absolute path beginning `/Users/`, a
  research source, a voice sample, or any entry from the source
  project's permission allowlist.
- `.claude/settings.json` in the produced tree contains no `hooks` key.
  (The source project's only hook is a third-party notifier and does not
  migrate.)
- `lintel-harness pack info writing` reports parts 8 and 9 as `absent`,
  each with its declared reason.

---

**US-19 — Stand up a planning project at a chosen calibration**
> As an operator running a portfolio of bets, I want to apply the `planning` pack calibrated to my organisation's constraint floor so that the cadence, horizon defaults and gate expectations match my reality rather than someone else's.

**Acceptance criteria:**
- **The mechanism is F1's init parameters plus the recipe's `when`, not
  bespoke CLI code.** `packs/planning/pack.json` declares
  `constraintFloor` as a `required` `enum` with
  `values: ["high-floor", "near-zero-floor"]` and
  `"flag": "calibration"`. The alias is registered from that data, so
  `--calibration high-floor` is exactly
  `--set constraintFloor=high-floor` and the CLI holds no knowledge of
  this pack. That is what keeps S5 falsifiable.
- `lintel-harness init planning --calibration <name>` accepts exactly the
  two declared values and rejects any other with `E-PARAM-INVALID`
  (F1 §Error States), which lists the permitted values verbatim.
- Run interactively with no `--calibration`, init asks the parameter's
  declared `prompt` — a single constraint-floor question — before
  writing any byte.
- Run non-interactively with no `--calibration` and no `--set`, init
  writes zero bytes and fails with `E-PARAM-MISSING`, because
  `constraintFloor` is `required` with no default.
- **Content varies by the answer through recipe `when` conditions over
  `calibrations/<name>/` and through `{{harness:param.constraintFloor}}`
  substitution — and through nothing else.** There is no region
  mechanism at v1.0 (Q-45), so calibration varies content at **whole-file
  granularity** only.
- The two calibrations produce trees that differ in at least: the default
  review cadence, the default horizon range, and the absorption-gate
  **coverage narrative** — how much of the gate a given organisation's
  existing process already holds.
- The two calibrations produce trees that are **byte-identical** in: the
  six phase definitions, the existence and non-delegability of the
  absorption gate, the four template field lists, and the five practices.
- **The varying and the invariant text live in different files, and this
  criterion names them.** The coverage narrative is confined to files
  under `calibrations/<name>/` and to the calibration record. The gate's
  *rule* — that it exists, that it is non-delegable, that it may not be
  cleared or waived by the party that ran `deliver`, and that it may not
  run in parallel with `learn` — lives in `CLAUDE.md.template`'s phase
  and practices content, in `templates/opportunity-bet-brief.template.md`
  and in the planning target's abort criteria, none of which is under
  `calibrations/`. File-granular checking is sufficient precisely because
  the split is by file.
- Every file that differs between the two applied trees corresponds to a
  recipe step carrying a `when` condition on `constraintFloor`, and no
  file outside that set differs. Verified by applying both calibrations
  to empty directories and diffing.
- The produced project records its calibration in a single readable file
  at the repo root, so a later reader can tell which one was chosen.

---

**US-20 — See a pack's completeness before choosing it**
> As someone deciding which pack to apply, I want each pack to state which of the nine anatomy parts it actually ships so that I adopt it knowing what it does not give me.

**Acceptance criteria:**
- `lintel-harness pack info <name>` — an **F1** command (F1 §US-29) —
  lists all nine parts for the named pack with one of
  `present` / `provisional` / `absent`, plus the declared `reason` for
  `absent` and the declared `note` for `provisional`. These criteria
  assert the per-pack *content*; F1 owns the command and its schema.
- `coding` reports nine parts `present`, with part 5 and part 8 named as
  minimal and their content enumerated (part 8: one command, zero hooks,
  zero skills, no default permission set).
- `writing` reports part 8 `absent` and part 9 `absent`, each with a
  reason, and part 3 `present` with its single template named.
- `planning` reports nine parts, with part 2 `provisional` and its note
  naming the EM-portfolio gap.
- A pack whose `pack.json` omits any of the nine parts fails validation
  with `E-ANATOMY-MISSING` (F1 §Error States, exit 2), and
  `lintel-harness init` refuses to apply it.
- Across the three packs, exactly **two** parts are `absent` and exactly
  **one** is `provisional`. Checkable in one run.

---

**US-21 — Pick scaffolds at init**
> As an operator whose new project needs a backend, I want to select a scaffold at init so that I get the deploy machinery without getting scaffolds I do not need.

**Acceptance criteria:**
- `lintel-harness init coding` with no `--scaffold` produces no
  `infrastructure/` directory.
- `lintel-harness init coding --scaffold backend-azure` produces
  `infrastructure/backend-deploy/` containing `main.bicep`,
  `production.bicepparam`, `deploy.sh`, `deploy.ps1`, `setup-neon.sh`,
  `setup-neon.ps1` and a README — each with its `.template` suffix
  stripped by the recipe.
- `lintel-harness init coding --scaffold backend-aws` produces
  `infrastructure/backend-deploy/` containing the CDK + Lambda
  equivalent.
- **`backend-azure` and `backend-aws` are alternatives, not composable
  peers.** Requesting both writes zero bytes and fails with
  `E-SCAFFOLD-EXCLUSIVE` (F1 §Error States), because both declare the
  same destination.
- `--scaffold` accepts a comma-separated list, and a request combining
  scaffolds from different categories succeeds.
- Requesting a scaffold the named pack does not offer writes zero bytes
  and fails with `E-SCAFFOLD-UNKNOWN` (F1 §Error States), which lists the
  available ids.
- `lintel-harness pack info <name>` lists that pack's available scaffolds.

---

**US-22 — Reference a shared component rather than copying it**
> As a pack author, I want a pack to pull a shared component in by declaration so that one fix reaches every pack that uses it instead of being re-fixed in each.

**Acceptance criteria:**
- `packs/coding/pack.json` declares `shared/targets`.
- `packs/writing/pack.json` does **not** declare it at v1.0 (Q-6 defers
  it to `writing@1.1`).
- No pack declares `shared/presentation` at v1.0, and `shared/` contains
  no `presentation/` directory (Q-28).
- `shared/targets/` exists exactly once in the repo; no pack contains a
  duplicate copy of `target.template.md`, `Run.md`, `README.md`,
  `target-reviewer.md` or the `/target` command.
- A pack that reads a `shared/` file without declaring it fails
  validation with `E-SHARED-UNDECLARED` (F1 §Error States).
- A shared component's files reach their per-destination locations from a
  **single declaration**: `shared/targets/component.json` declares its
  own `mappings`, and a referencing pack inherits all of them. No pack
  repeats the destination map.
- Changing a file under `shared/` without bumping every referencing pack
  fails validation with `E-SHARED-STALE` (F1 §Error States).

---

**US-24 — Prove the coding migration changed nothing it should not have**
> As the maintainer, I want the `coding` migration to be provably faithful so that any later behaviour difference is attributable to a migration bug rather than an undocumented improvement (S6).

**Acceptance criteria:**
- The migration record names the `packs/coding/` commit the pack was
  taken from.
- A documented, re-runnable check diffs the shipped pack against that
  commit.
- **Every difference the check reports falls into exactly one of four
  declared classes**, and the record says which: (a) a Q-46 deletion,
  named by file and heading; (b) an added `pack.json` or `recipe.json`;
  (c) the declared restructure — `infrastructure/backend-deploy/` →
  `scaffolds/backend-azure/`, and the `/target` command moving into
  `commands/`; (d) nothing else.
- Class (d) is empty. Any difference the check cannot place in (a), (b)
  or (c) fails the check.
- The Q-46 deletion list is exhaustive and enumerated in §Flows, so the
  check compares against a list rather than a judgement.

---

**US-25 — Prove the writing extraction carries nothing project-specific**
> As the maintainer, I want the `writing` extraction to be free of its host project so that the pack is a way of working rather than a copy of one research project.

**Acceptance criteria:**
- Grepping `packs/writing/` for `/Users/`, for the host project's name,
  and for the owner's personal name returns zero hits outside a declared
  placeholder.
- No file under the pack's scaffold tree contains research content — only
  `index.md` scaffolding and the declared templates.
- The voice guide migrates with its voice-sample reference converted to a
  placeholder pointing at wherever a new project keeps samples, per that
  folder's own portability note.
- The extraction record names the source project path and the commit it
  was taken from, and enumerates every file that was dropped rather than
  extracted, with the reason (research corpus, permission allowlist,
  third-party hook, personal notes).

---

**US-26 — Cannot commit a bet without kill criteria**
> As an operator using the planning pack, I want the pack to block a bet moving to committed without kill criteria so that the discipline the research names as most-skipped is enforced rather than remembered.

**Acceptance criteria:**
- A bet brief whose `Kill criteria` field is empty or still at its
  template placeholder cannot be marked committed by the `/bet` command;
  the attempt is blocked with the string in §Error States, **verbatim**.
- Filling the field and retrying succeeds.
- `/review` re-checks the criterion for every bet it reviews, so a bet
  that reached `committed` by some other route is caught at the next
  review rather than never.
- **The block does not fire on the file write at v1.0, and this criterion
  is recorded as unmet rather than reworded.** The guard is a
  slash-command instruction, not a mechanism: a bet committed by
  hand-editing `brief.md` is not blocked. Enforcement at the write needs
  a registered hook, and **no pack may register an agent hook at v1.0**.
- The pack ships `hooks/kill-criteria-guard.sh` in its payload, and the
  recipe copies it to `.claude/hooks/kill-criteria-guard.sh` as an inert
  `0644` file, registered by nothing and executed by nothing — so that
  the v1.1 route is a registration rather than a rewrite.
- The block **and its limits** are documented in the pack's part 8 and in
  the produced project's `CLAUDE.md`. `lintel-harness validate` says the
  same about the script with `W-HOOK-SCRIPT-INERT` (F1 §Error States),
  and `pack info` lists it as inert.
- A `pack.json` declaring `hooks` among its owned `.claude/settings.json`
  keys fails validation (F1 §Error States).

---

**US-27 — An unsupervised run stops at the absorption gate**
> As an operator, I want an unsupervised planning run to be structurally unable to clear the absorption/security gate so that the one non-delegable step stays with a human.

**Acceptance criteria:**
- The planning pack's target template lists clearing or waiving the
  absorption/security gate as an **abort criterion**, and that text is
  identical at both calibrations.
- A run that reaches the gate terminates as **ABORT** with the string in
  §Error States, writes a final work-log entry, and hands back.
- The run does not mark the gate passed, partially passed, or deferred.
- `target-reviewer` returns `NEEDS-CORRECTION` for any planning target
  whose success criteria can only be met by passing the gate.
- The abort criterion is present in the applied tree regardless of how
  `planning` obtains its targets contract — see **Q-49**, which is open
  on whether that is via `shared/targets` or pack-local content. This
  criterion is checkable either way and does not depend on the answer.

---

**US-28 — Read one page and understand what I got**
> As a newcomer to a project someone else set up, I want each pack to explain itself in one page so that I can tell what way of working I have inherited and where its edges are (G6).

**Acceptance criteria:**
- Each pack's README is at most 120 lines and names all nine anatomy
  parts.
- Each README states that pack's gaps explicitly — `coding` names its
  thin parts 5 and 8; `writing` names its absent parts 8 and 9 and its
  thin part 3; `planning` names its provisional role set.
- Each README states **what the recipe produces** — which parts of the
  pack are copied out and which stay at `.harness/pack/` — in at most ten
  lines.
- Each README states which `shared/` components the pack references, the
  pack's version, and its `minCliVersion`.
- **No README contains bootstrap prose.** It does not tell the reader to
  copy a folder, rename a template, fix a path, or adopt the pack in a
  new project (Q-46).

---

**US-34 — Every pack ships a recipe, and the recipe is the only way it applies**
> As the maintainer, I want each pack's phase 2 declared as data over a fixed primitive set so that what an apply can do stays enumerable and inspectable before anything is written.

**Acceptance criteria:**
- Each of `packs/coding/`, `packs/writing/` and `packs/planning/` ships a
  `recipe.json` at its root.
- Every step in every recipe names one of exactly seven primitives:
  `copy`, `rename`, `strip-suffix`, `rewrite-path`, `substitute`,
  `generate`, `merge-json`. A recipe naming anything else fails
  validation and `init` refuses to apply the pack. **F1 owns the code
  and the message** — F5 deliberately does not invent one, and flags that
  F1's catalogue has no recipe-validation code yet (§Error States).
- Every recipe step reads a source path under `.harness/pack/` and never
  from the bundled pack (Q-41).
- No recipe step reads a timestamp, an environment variable, the network,
  or the current working directory. Two applies of the same pack version
  with the same answers into empty directories produce **byte-identical**
  trees, verified by diff.
- Reordering independent steps in a recipe does not change the produced
  tree. Where two steps write the same destination the recipe is invalid,
  not last-write-wins.
- The full set of destinations a recipe can write is computable from
  `recipe.json` plus the recorded answers **without executing it**, which
  is what lets F2 plan both phases in memory before any byte lands.
- `lintel-harness pack info <name>` can render the destination list for a
  given set of answers.

---

**US-35 — Read the pack's own reference material from inside my project**
> As someone working in an applied project, I want the pack's process docs, conventions and templates available locally so that I can read them without the CLI and without a second copy that can drift.

**Acceptance criteria:**
- `.harness/pack/` contains the complete pack: `README.md`,
  `specifications/README.md`, `specifications/conventions.md`, all eleven
  `coding` document templates, `agents/README.md`,
  `agent-teams/README.md`, `targets/README.md` and
  `targets/target.template.md`.
- **None of those files is duplicated outside `.harness/pack/`.** For
  every file in the applied tree outside `.harness/pack/`, either the
  recipe declares a step producing it, or it is user content.
- Every reference in a copied-out file that points at reference material
  resolves into `.harness/pack/` and to a file that exists. A dangling
  reference is a failed apply, not a warning.
- `targets/Run.md` and `.claude/commands/target.md` are the two files the
  `rewrite-path` steps act on for `coding`, and after apply neither
  contains the pre-rewrite literal.
- Deleting `.harness/pack/` breaks the copied-out references — this is
  stated in the pack README and in the generated `CLAUDE.md`, so the
  dependency is documented rather than discovered.

---

**US-36 — No pack tells me to apply it by hand**
> As a reader of an applied project, I want the pack's documentation to describe the way of working and not a manual installation procedure the CLI already performed, so that I am never following instructions for something that has already happened.

**Acceptance criteria:**
- Grepping `packs/` for the headings `Adopting this in a new project`
  and `Bootstrapping a new project` returns zero hits.
- Grepping `packs/` case-insensitively for `copy this folder` returns
  zero hits.
- `packs/coding/agents/README.md` and
  `packs/coding/agent-teams/README.md` describe what the agents and teams
  *are* and how to pick one; neither says where to copy them.
- `packs/coding/targets/README.md` retains its lifecycle, principles and
  usage sections and ends without an adoption section.
- `packs/coding/CLAUDE.md.template` contains no cross-reference to a
  deleted section, so the generated `CLAUDE.md` has no dangling pointer.
- The five deletions are enumerated in the migration record with the file
  and heading, so US-24's faithfulness check can distinguish them from
  accidental loss.

---

**US-37 — Choose one backend, not two**
> As an operator selecting scaffolds, I want mutually exclusive alternatives to be refused rather than silently merged so that I never get a half-Azure, half-AWS deploy tree.

**Acceptance criteria:**
- `packs/coding/pack.json` declares `backend-azure` and `backend-aws` in
  the same scaffold **category**, and both declare
  `infrastructure/backend-deploy/` as their destination.
- Requesting both writes zero bytes and fails with
  `E-SCAFFOLD-EXCLUSIVE` (F1 §Error States); the message names the two
  scaffolds and the shared destination.
- Requesting either alone succeeds and produces a complete, internally
  consistent deploy tree — no file from the other alternative appears.
- `pack info coding` presents the two as alternatives, not as a list of
  independently selectable options.
- The scaffold interface is paper-checked against one non-IaC target
  (a platform CLI such as Vercel or Fly) without authoring it, and the
  check is recorded — the residual risk Q-8a accepted.

---

**US-38 — Leave a later update something to find**
> As the maintainer, I want the generated `CLAUDE.md` to carry inert anchors so that v1.1's `update` is an addition rather than a retrofit.

**Acceptance criteria:**
- Each pack's generated `CLAUDE.md` contains anchors delimiting the
  pack-owned sections it emits.
- The anchors are **inert**: no parser, no region hashes, no malformed-
  marker diagnostics, no tamper detection ship at v1.0 (Q-45).
- Editing content between two anchors does not cause any v1.0 command to
  fail, warn, or behave differently.
- Editing or deleting an anchor does not cause any v1.0 command to fail.
- The anchor set each pack emits is declared in `recipe.json`'s
  `generate` step, so v1.1 reads it from data rather than inferring it.
- No file other than the generated `CLAUDE.md` carries anchors at v1.0.

---

## Error States

**This table is not a catalogue.** F1's `E-`/`W-` codes and its exit
classes — `0` success, `1` user-correctable, `2` pack or manifest
integrity, `3` internal — are the **only** CLI error model, and
`F1-spec-pack-format-and-manifest.md` §Error States is the **only**
message catalogue. The rows below name the F1 code each F5 scenario
raises. **The code is the stable contract**; the message text is F1's,
verbatim within a minor version.

**The one exception:** the three *pack-content* rows keep their
**verbatim strings here**, because a pack *ships* those strings. They are
text emitted by agents and target runs that F5 authors; they are not CLI
diagnostics, they have no code, and they do not belong in F1's catalogue.

### CLI scenarios — F1 owns the code, the exit class and the text

| Scenario | F1 code | Exit |
|---|---|---|
| `pack.json` omits one of the nine anatomy parts | `E-ANATOMY-MISSING` | 2 |
| Part declared `absent` with no reason | `E-ANATOMY-NO-REASON` | 2 |
| Part declared `provisional` with no note | `E-ANATOMY-NO-NOTE` | 2 |
| A well-formed `provisional` part, at init or `pack info` | `W-ANATOMY-PROVISIONAL` | unchanged |
| A well-formed `absent` part, at init | `W-ANATOMY-ABSENT` | unchanged |
| `init planning` non-interactively with no calibration | `E-PARAM-MISSING` | 1 |
| Unknown calibration name | `E-PARAM-INVALID` | 1 |
| `--calibration` passed to a pack declaring no such alias | `E-CLI-UNKNOWN-FLAG` | 1 |
| Scaffold requested that the pack does not offer | `E-SCAFFOLD-UNKNOWN` | 1 |
| Both backend scaffolds requested — same destination | `E-SCAFFOLD-EXCLUSIVE` | 1 |
| Pack reads a `shared/` file it has not declared | `E-SHARED-UNDECLARED` | 2 |
| A `shared/` file changed without bumping every referencing pack | `E-SHARED-STALE` | 2 |
| A pack declares `hooks` among its owned settings keys | `E-OWNEDKEY-FORBIDDEN` / `E-HOOKS-NOT-SUPPORTED` — **F1 decides which** | 2 |
| A `substitute` step leaves a token unresolved | `E-SUBST-UNRESOLVED` | 2 |
| A `rewrite-path` step matches nothing | `E-REWRITE-UNUSED` | 2 |
| A recipe writes to a reserved destination | `E-MAP-RESERVED-DEST` | 2 |
| Two recipe steps write the same destination | `E-MAP-COLLISION` | 2 |
| A `merge-json` step targets invalid JSON | `E-MERGE-JSON-INVALID` | 2 |
| Pack's `minCliVersion` exceeds the installed CLI | `E-PACK-CLI-TOO-OLD` | 1 |
| `init` in a directory that already has a manifest | `E-ALREADY-APPLIED` | 1 |
| Inert guard script present, registered by nothing | `W-HOOK-SCRIPT-INERT` | unchanged |

**Gap flagged, not filled.** F1's catalogue predates Q-39 and carries
**no code for an invalid `recipe.json`** — an unknown primitive, a step
reading outside `.harness/pack/`, a step with no source. US-34 requires
one. F5 does not invent it; **F1 must add it.** Related: F1's
`E-REGION-*` and `E-BASE-*` families are unreachable at v1.0 under Q-45
and Q-43, and F5 references none of them.

### Pack-content scenarios — F5 owns the string, verbatim

| Scenario | Expected Behaviour |
|---|---|
| Planning: bet marked committed with `Kill criteria` empty or unchanged from the template placeholder | Blocked by the `/bet` command's own agent instruction, and re-checked by `/review`. Print, **verbatim and unchanged**: `Blocked — a bet cannot be committed without kill criteria. Fill "Kill criteria" in bets/<slug>/brief.md, then retry.` This is a stated rule an agent follows, not a mechanism that stops the write — see the shortfall table below. |
| Planning: an unsupervised target run reaches the absorption/security gate | Run terminates ABORT, final work-log entry written, control handed back. Print, **verbatim**: `ABORT — the absorption/security gate is non-delegable and lies outside the autonomy envelope. A human must clear it before the learn phase begins.` |
| Coding: `copywriter` invoked with `copy/tone-of-voice.md` still at its placeholder | Agent halts and asks for a filled guide before writing any copy. Existing pack behaviour; the halt text migrates unchanged (Q-6) rather than being restated here. |

### Stated rules that ship unenforced at v1.0

| Scenario | Expected Behaviour |
|---|---|
| Coding: a pipeline step attempted before its gate (spec without `Accepted`, code without a `PROCEED` ADR) | The pack states the rule in `.harness/pack/specifications/README.md` and in the generated `CLAUDE.md`. **Unenforced** — no hook ships. A known part-8 gap, deferred to `coding@1.1`. |
| Writing: a draft overwritten instead of versioned; a file added without an `index.md` row | Both stated as standing instructions in the generated `CLAUDE.md`. **Unenforced** — no hook ships. A known part-8 gap. |
| Writing: an agent has no source for a claim | Emit a `[NEEDS SOURCE]` marker. Fabricating a citation is prohibited by standing instruction. Unenforced. |
| Planning: a bet marked committed without kill criteria | Stated in `CLAUDE.md` and in the `/bet` and `/review` instructions; `/bet` refuses and prints the block message above. **Unenforced at the file write** — the guard script ships inert at `0644`, registered by nothing, because no pack may register an agent hook at v1.0. |

**The headline shortfall against R5, recorded rather than softened:**

> **No v1.0 pack ships an enforcing hook, and the reason is a decision
> about the pack *format*, not a constraint on the migrations.**

Two shortfalls were already known and are about *migration*: `coding` and
`writing` inherited no hooks, and Q-6 forbids inventing content during a
faithful migration. The third is different in kind. The **authored**
pack — the one Q-9 chose specifically to prove the format could carry
what the migrations could not — was the one pack that had an enforcing
hook, and it lost it because the format has no way to declare a hook and
no consent surface to gate one. R5's "hooks and skills are the weakest
part" therefore reads, at v1.0, as a statement about the harness rather
than about the packs.

Two things follow, both v1.0 facts:

1. The claim that "an authored pack reaches an adequate part 8 while both
   migrated packs do not" still stands, but it rests on three slash
   commands rather than on a command-plus-hook. It is **weaker than it
   was**, and part 8 says so.
2. The route out is known: a `hooks` declaration whose consent surface is
   designed together with F2's prompting, and whose merge-time
   re-consent problem is solved before it ships. Until then, a pack that
   wants a rule enforced states it and has an agent follow it.

---

## Non-Functional Requirements

**Apply**

- **Latency:** applying any pack — both phases — to an empty directory
  completes in **≤ 5 s** on a warm filesystem, with **zero network
  requests**. Packs bundle into the published package (Q-2).
- **Size:** phase 1 copies **≤ 120 files** for any pack. Phase 2 writes
  **≤ 60 files** with no scaffold selected and **≤ 200** with every
  scaffold a pack offers. Concretely at v1.0: `coding` phase 1 copies
  ~55 files and phase 2 writes 19 files and 2 empty directories.
- **Atomicity:** a failure in either phase leaves the directory as it was
  before the run. Rollback never deletes a path that existed before the
  run.

**Determinism**

- **Byte-identical repeats:** applying the same pack version with the
  same answers into two empty directories produces byte-identical trees.
  **No exception, and in particular no date field.** No generated file
  carries a timestamp; the generated `CLAUDE.md` header's date ships as
  the literal `{{YYYY-MM-DD}}` placeholder the coding pack's own header
  convention already uses.
- **Recipe purity:** a recipe is a pure function of (payload, parameter
  answers). No environment reads, no network, no clock, no ordering
  dependence among independent steps.
- **Payload fidelity:** `.harness/pack/` is byte-identical to
  `packs/<name>/` at the applied version, file-for-file including modes.
  This is checkable with one diff and is the phase-1 acceptance test.

**Content integrity**

- **Path integrity:** a link check over every `.md` file in an applied
  tree resolves **100%** of relative links and exits 0. No file outside
  `.harness/pack/` contains the substring `template/` or `packs/`.
- **No duplication:** reference material — document templates,
  `conventions.md`, process READMEs — exists **exactly once** in an
  applied project, under `.harness/pack/`.
- **Portability:** no pack file contains an absolute path, a
  machine-specific identifier, a credential, a token, a permission-list
  entry, or a personal name outside a declared placeholder.
  `grep -r '/Users/' packs/ shared/` returns zero matches.
- **Encoding:** every pack file is UTF-8 with LF line endings, so an
  applied tree hashes identically on macOS, Linux and Windows.
- **No executable pack content outside a declared scaffold.** The one
  script any pack ships to `.claude/` — `planning`'s guard — is written
  `0644`.

**Migration**

- **Faithfulness (coding):** the shipped pack differs from the recorded
  source commit only by the four declared classes in US-24, and class (d)
  is empty. Runnable as one documented command.
- **Faithfulness (writing):** every construct enumerated in
  §Flows /`packs/writing/` is present, and the four exclusion classes in
  US-25 are absent. Runnable as one documented check.
- **Prose stripping (Q-46):** zero occurrences in `packs/` of the five
  enumerated bootstrap sections, and zero dangling cross-references to
  them. Grep-checkable.
- **Provenance:** each `pack.json` records what the pack was derived
  from — for `coding` and `writing`, a source path plus commit; for
  `planning`, `base-deck-v2.1.md` plus
  `specifications/v1.0/research-planning-pack-framing.md` — so a later
  source revision can be diffed against what shipped.

**Anatomy and legibility**

- **Anatomy completeness:** all three `pack.json` files declare 9 of 9
  parts with F1's three-value `status`. Across the three packs, exactly
  **two** parts are `absent` (`writing` 8 and 9) and exactly **one** is
  `provisional` (`planning` 2). Because `status` is a schema field rather
  than prose, both counts are checkable by `lintel-harness validate --all`.
  Any change to them is a spec change.
- **Legibility:** each pack README **≤ 120 lines**, naming all nine
  parts, the pack's gaps, what its recipe produces, its `shared/`
  references, its version and its `minCliVersion`.

**Calibration**

- **Isolation:** switching `planning`'s calibration changes only files
  produced by a recipe step carrying a `when` condition on
  `constraintFloor`. Every other file is byte-identical between the two
  applied trees, verified by diff.
- **Invariance:** the six phase definitions, the gate's rule text, the
  four template field lists and the five practices are byte-identical
  across calibrations.

---

## Flows / Behaviour

This section carries the substance of F5: the three pack outlines against
the anatomy, `shared/targets`, the scaffold inventory and the migration
requirements. These are the pinned shapes F1 and F2 compile against.

`specifications/general/pack-inventory.md` holds the **full file-by-file
trees with per-file phase metadata**. This section states the structure
in enough detail to stand alone and to be checkable, and points at the
inventory for the complete listing rather than duplicating it.

---

### Where the recipe sits in the anatomy — and why

Q-40 makes `recipe.json` **required content in every pack**. That raises
a placement question the anatomy has to answer, because the anatomy is a
completeness contract and a required artefact that sits outside it is a
hole in that contract.

**Decision: the recipe is an explicit sub-part of part 7 — folder
scaffolding. The anatomy stays nine parts.** Written `7b` where the two
halves need distinguishing.

**Why part 7 and not a tenth part.** Four reasons, in order of weight:

1. **Part 7 is already the part that answers "what shape does an applied
   project have?"** Every other anatomy part describes content that
   humans and agents *read*: a process, a role set, templates,
   conventions, coordination rules, guidelines, automations, an autonomy
   contract. Part 7 alone describes the **tree**. The recipe is the
   executable statement of exactly that tree. Splitting "the shape" from
   "how the shape is produced" into two parts separates one idea into
   two boxes and then requires a rule to keep them consistent.
2. **The `status` enum would be meaningless for a tenth part.** F1's
   anatomy carries `present | provisional | absent`. A recipe can never
   be `absent` — a pack without one cannot apply — and `provisional` has
   no meaning for it. A part whose status can only ever take one value is
   not a part; it is a required field. Adding it would also break this
   spec's counted NFRs ("exactly two absent, exactly one provisional") by
   introducing a part the counts must special-case.
3. **A tenth part forces an F1 schema change F5 does not own.** F1 §US-2
   pins `anatomy` as an object with **exactly nine keys**, and
   `E-ANATOMY-MISSING` fires on a missing one. Renumbering the anatomy
   would ripple into F1's schema, `pack info`'s output, every pack's
   `pack.json` and the brief's §3.3 — a large change to express something
   that is already validated separately, because `recipe.json` has its
   own schema and its own validation path.
4. **The anatomy describes the way of working; the recipe describes the
   delivery.** They are different kinds of claim. The anatomy is what a
   pack *teaches*; the recipe is how it *installs*. Making installation a
   tenth kind of teaching would blur the contract that makes "a pack
   missing a part is incomplete" a meaningful statement.

**What this means concretely, applied consistently below:**

- Each pack's **part 7 has two halves**: `7a` the folder scaffolding it
  produces, and `7b` the recipe that produces it. Both are stated for
  every pack.
- The **anatomy comparison matrix** carries a `7b` sub-row.
- `pack.json`'s `anatomy` object keeps **nine keys**, and part 7's entry
  covers both halves.
- **`recipe.json` validity is not an anatomy question.** A missing or
  invalid recipe is a recipe-schema failure with its own code — which
  F1 must add (§Error States).
- Each pack's README describes what its recipe produces (US-28), because
  that is now part of describing part 7.

---

### The nine parts across the three packs

Read this first. It is the completeness picture, and it is why the
anatomy is a contract rather than a description.

The **declared** status in `pack.json` is one of `present`,
`provisional`, `absent`. **`strong` and `weak` below are this spec's
editorial reading within `present`** — they are not schema values, and
nothing branches on them.

| # | Part | `coding` | `writing` | `planning` |
|---|---|---|---|---|
| 1 | Process | present — 6 gated phases, one artifact each, 2 security gates | present — 9 stages in 2 strict sequences, no-skip rule, human publish gate | present *(authored)* — 6-phase loop, non-delegable absorption gate, horizon inside commit |
| 2 | Role set | present — 10 agents, non-overlapping write boundaries, model per role | present — 8 agents, boundaries by stage folder, one read-only critic | **provisional** — 6 candidates inferred from phases; EM-portfolio responsibility flagged unwritten in the source research |
| 3 | Document templates | present — 11 templates, all in the payload | **weak** — exactly one template, and it lives inside a workstream | present *(authored)* — 4 templates, 3 with fixed fields and 2 filled examples each |
| 4 | Conventions | present — naming, numbering, counters, header block, status values, ownership | present — indexing, draft versioning, sourcing, voice, words-to-avoid; no numbering, no status values, no counters | present *(authored)* — evidence discipline, claims ledger, kill-criteria-first, no-drift |
| 5 | Coordination rules | **weak** — 2 team prompts with lead playbooks; no routing table, no parallelization rules | **strong** — 8-row routing table, 3 parallelization rules, no-auto-chaining, bounded critic loop | present — cadence-by-uncertainty, non-delegable gate, kill-criteria escalation |
| 6 | Behavioural guidelines | present — `CLAUDE.md.template`, 15 headings | **strong** — voice, words-to-avoid, standing instructions, plus a loadable guide | present — the five practices, each operational |
| 7a | Folder scaffolding | present — 5 produced top-level paths, per-version spec folders, 1 backend scaffold (2 alternatives) | present — shared corpus + per-workstream stages, `index.md` everywhere, `Home.md` front door | present *(authored)* — register, per-bet folders, horizons, decision log, calibration record |
| **7b** | **Apply recipe (`recipe.json`)** | **required** — copy-out + rename + strip-suffix + 2 path rewrites + generate + merge-json + 1 scaffold branch | **required** — copy-out + strip-suffix + rename to `Home.md` + generate + merge-json + 1 scaffold branch | **required** — copy-out + **`when` on `constraintFloor`** + substitute + generate + portfolio skeleton |
| 8 | Skills & automations | **weak** — 1 slash command (`/target`), 0 hooks, 0 skills, no default permission set | **absent** — 0 commands, 0 pack-owned hooks, 0 skills | present *(authored)* — 3 slash commands **plus 1 inert guard script**; 0 enforcing hooks, because no pack may register one |
| 9 | Autonomy contract | present — targets: readiness gate, autonomy envelope, abort criteria, work log, SUCCESS/ABORT | **absent** — no target contract, no gate, no envelope, no log | present — targets, plus a phase the envelope may never enter. **Vehicle open — Q-49** |

Part `7b` has no `status` value: it is required of every pack and cannot
be absent or provisional. The three-value enum applies to the nine
numbered parts only.

Four readings follow, all v1.0 facts:

1. **Each migrated pack is missing what the other proves valuable.**
   `coding` is weak at 5 and 8; `writing` is strong at 5 and 6 and absent
   at 8 and 9. Q-6 keeps that asymmetry on purpose, so the first
   post-v1.0 bump is a real test of `update` rather than a synthetic one.
2. **Part 8 is the product's weakest area across the board**, exactly as
   R5 says. Two of three packs ship almost nothing, and the only pack
   with a credible part 8 is the one authored fresh — evidence that the
   weakness is historical rather than intrinsic to the format. But see
   §Error States: at v1.0 it is *also* a format constraint.
3. **`planning` is the only pack with a parameter.** Nothing in `coding`
   or `writing` changes content by an init answer. Under the two-phase
   model this is expressed as `when` conditions in the recipe over
   `calibrations/<name>/` — a pack-authoring convention over an existing
   mechanism, not new grammar (Q-13).
4. **Part 7b is the one part where all three packs are equal.** Every
   pack authors a recipe, every recipe uses the same seven primitives,
   and none may do anything the primitives cannot express. That is the
   security property Q-40 bought, and it is visible in this table as the
   only row with no variation.

---

### What every applied project gets, independent of pack

Written by the CLI, not by a recipe:

```
<project>/
├── .harness/
│   ├── pack/            phase-1 payload — verbatim copy of the pack, untouched
│   └── manifest.json    minimal (Q-43): pack name, pack version, CLI version,
│                        parameter answers, chosen scaffolds. No file hashes,
│                        no base store — applied state is recomputable
└── …                    everything else is the pack's phase-2 recipe
```

Every applied tree below is what the recipe produces **in addition** to
those two paths.

---

### `packs/coding/` — migrated from the existing pack tree

**Source:** `packs/coding/` in this repo, at a recorded commit. 40 files
today.
**Migration:** faithful (Q-6), **plus the Q-46 deletions enumerated
below**.
**References:** `shared/targets`. **Not** `shared/presentation` (Q-28).
**Scaffolds:** `backend-azure` (exists), `backend-aws` (to author) —
**alternatives, not peers**.
**Version:** 1.0.0 · `minCliVersion: 1.0.0`.

#### Payload — what phase 1 copies verbatim

Full tree with per-file phase metadata: `general/pack-inventory.md`.
In summary the payload is `pack.json`, `recipe.json`, `README.md`,
`CLAUDE.md.template`, `agents/` (10 agents + a file-ownership README),
`agent-teams/` (2 team prompts + a README), `specifications/` (the
process README, `conventions.md`, 11 document templates, and two
`*.template.md` files that *are* copied out), `targets/`
(README, `Run.md`, `target.template.md`), `copy/tone-of-voice.template.md`,
`commands/target.md`, and `scaffolds/{backend-azure,backend-aws}/`.

Four items do not exist in the source tree today and are **new
authoring** for the migration: `pack.json`, `recipe.json`, `commands/`
(the `/target` command currently lives in this repo's `.claude/commands/`)
and `scaffolds/` (today's `infrastructure/backend-deploy/` becomes
`scaffolds/backend-azure/`).

#### 7b. What the recipe produces

| Step | Primitive | From (payload) | To (project) |
|---|---|---|---|
| Agents | `copy` | `agents/*.md` **except `README.md`** | `.claude/agents/` (10 files) |
| Command | `copy` | `commands/target.md` | `.claude/commands/target.md` |
| Teams | `copy` | `agent-teams/{Specify,Implement}.md` | `AgentTeams/` — **the directory rename** |
| Kickoff | `copy` | `targets/Run.md` | `targets/Run.md` |
| Tone guide | `strip-suffix` | `copy/tone-of-voice.template.md` | `copy/tone-of-voice.md` |
| Spec index | `strip-suffix` | `specifications/README.template.md` | `specifications/README.md` |
| Project brief | `strip-suffix` | `specifications/project-brief.template.md` | `specifications/project-brief.md` |
| Path fix | `rewrite-path` | `targets/Run.md`, `.claude/commands/target.md` | `template/targets/…` → `.harness/pack/targets/…` |
| Answers | `substitute` | project name and stack into the above | — |
| Onboarding | `generate` | `CLAUDE.md.template` + answers | `CLAUDE.md`, with inert anchors (Q-45) |
| Settings | `merge-json` | declared owned keys only | `.claude/settings.json` |
| Backend | `copy` + `strip-suffix`, `when scaffold` | `scaffolds/backend-azure/**` **or** `scaffolds/backend-aws/**` | `infrastructure/backend-deploy/` |

**Applied tree:**

```
<project>/
├── .claude/{agents/*.md ×10, commands/target.md, settings.json}
├── AgentTeams/{Specify.md, Implement.md}
├── specifications/{README.md, project-brief.md, general/, v1.0/}
├── targets/Run.md
├── copy/tone-of-voice.md
├── CLAUDE.md
└── infrastructure/backend-deploy/     only with a backend scaffold
```

**Two things the recipe deliberately does not do.**

- **It copies no document template.** The eleven templates,
  `conventions.md`, the process README and the three sub-READMEs stay in
  the payload and are read from `.harness/pack/`. This supersedes Q-38
  and is the single largest change to the applied tree in this rewrite.
- **It performs no per-project rewriting of prose.** Manual-apply steps 7
  and 8 — rewriting `targets/README.md` and `specifications/README.md`
  because they described their own copying — have **no primitive**,
  because under Q-46 that prose is deleted from the pack. There is
  nothing left in the payload that is wrong once copied, which is what
  lets phase 1 copy verbatim.

`specifications/general/` and `specifications/v1.0/` are created empty.
**No primitive creates an empty directory** — see **Q-50**.

#### 1. Process — six gated phases

```
research → spec → design-spec (if UI) → ADR (PROCEED) → epics-and-tasks → implementation
```

Every arrow is a gate. One defined artifact per phase:

| Phase | Artifact | Gate to pass |
|---|---|---|
| Research | `research-<topic>.md` | Runs first for anything unfamiliar |
| Spec | `F<N>-spec-<topic>.md` | Status must reach `Accepted` |
| Design spec | `design-spec-<topic>.md` | Only for features with UI |
| ADR | `ADR-NNN-<topic>.md` | Must be stamped `PROCEED`; locks the file plan and the interface contract |
| Epics & tasks | `epics-and-tasks-<topic>.md` | Every task names the files it touches |
| Implementation | Code + unit tests + integration/acceptance tests | Follows the ADR's file plan |

Two **security gates** cut across it: `securityreviewer` runs Mode A at
the ADR gate (are the requirements correctly *specified*?) and Mode B at
the code gate (does the code *meet* them?). A Mode-A pass folded into an
ADR is the one sanctioned exception to the one-page ADR rule.

Version-level artifacts sit outside the per-feature sequence:
`{{Project}}Specification-X.Y.md`, `general/system-architecture.md`,
`general/technology-choices.md`.

#### 2. Role set — ten agents

Single-purpose, configured by frontmatter (`name`, `description`,
`tools`, `model`, `permissionMode`, `maxTurns`), body as system prompt.

| Agent | Purpose | Model | Write boundary |
|---|---|---|---|
| `specwriter` | Brief → functional spec | Opus 5 | `specifications/v<X.Y>/*-spec-*.md` |
| `researcher` | Investigates topics, web + local | Sonnet 5 | `specifications/v<X.Y>/research-*.md` |
| `designer` | UI/UX design specs | Sonnet 5 | `specifications/v<X.Y>/design-spec-*.md` |
| `architect` | Validates a spec, produces the ADR | Sonnet 5 | ADRs |
| `securityreviewer` | Mode A at the ADR gate, Mode B at the code gate | Sonnet 5 | none — findings go into the ADR |
| `copywriter` | User-facing copy from a tone-of-voice guide | Opus 5 | copy surfaces |
| `implementer` | Code + unit tests | Sonnet 5 | source tree; unit tests alongside the code |
| `testwriter` | Integration / acceptance tests | Sonnet 5 | the separate test tree |
| `reviewer` | Quality, correctness, security review | Haiku 4.5 | none |
| `target-reviewer` | Readiness gate before an unsupervised run | Sonnet 5 | none |

Two properties are load-bearing and migrate unchanged. **Write
boundaries do not overlap.** And **`copywriter` is deliberately
incomplete**: it carries craft but not brand voice, reads that from
`copy/tone-of-voice.md`, and halts if none exists — which is what keeps
one voice document authoritative across every surface.

#### 3. Document templates — eleven, all in the payload

`master-spec` · `feature-spec` · `design-spec` · `epics-and-tasks` ·
`adr-feature` · `adr-epic` · `research` · `system-architecture` ·
`technology-choices` · `target.template.md` (via `shared/targets`) ·
`tone-of-voice.template.md`.

Each shows structure *and expected depth*; the pack's instruction is to
read the template before writing. At v1.0 they are read at
`.harness/pack/specifications/` rather than copied into the project.

**The feature-spec template's canonical section order** — the pack's
flagship template, pinned by `conventions.md` and the order this
document itself follows:

1. **Introduction** — what the feature is and what it changes, with
   optional **What is in scope** / **What is NOT in scope** lists inside
   it. Those lists are part of section 1, not new sections.
2. **Technical Context** — a table of settled decisions only.
3. **Goals** — verifiable outcomes, each assessable yes/no.
4. **Out of Scope (this version)** — explicit exclusions, with target
   version where deferred.
5. **User Stories** — one per distinct user need, in the pinned
   `US-NN` + "As a … I want … so that …" + acceptance-criteria form.
6. **Error States** — every failure mapped to exact expected behaviour,
   with any user-visible string written verbatim.
7. **Non-Functional Requirements** — specific and measurable.
8. **Flows / Behaviour** — sequences, state machines, and the pinned
   shapes another feature must compile against. Optional in general;
   required as soon as another feature depends on a shape.
9. **Open Questions** — numbered `Q-N`, owned, with default assumptions.
10. **Resolved Decisions** — the audit trail, questions keeping their ID.

Above section 1 sits the required header block — title, Version, Status,
Date, Platform, Design spec, ADR, References — and a non-negotiable
**Amendment history** table. Don't invent new sections.

**Gap, recorded not fixed:** the kit has no *brief* template even though
a brief feeds every one of the above. Q-36. (`project-brief.template.md`
is a project artefact the recipe copies out, not a document-kit
template.)

#### 4. Conventions — `conventions.md`

- **File naming** per document type, with a sanctioned feature-prefixed
  variant (`F3-spec-…`, `F3-ADR-005-…`). One variant per project, never
  mixed; the ADR number stays project-monotonic in both.
- **Per-version folders** — `specifications/v1.X/`. No shared "current"
  folder; frozen versions stay where they were written.
- **Numbering** — epics `E-N`, monotonic across releases. Tasks under one
  of two schemes chosen per project: **A** (epic-derived `T-XXYY`) or
  **B** (flat `T-NNNN`). User stories `US-N`, per-feature blocks,
  continuous across versions, **gaps left retired**. ADRs `ADR-NNN`, or
  `ADR-EXX` epic-scoped.
- **The counter table** in `CLAUDE.md` records the scheme and last-used
  value for every counter, so no number is reused.
- **A required header block** on every document, plus an amendment
  history.
- **Canonical section order** per document type — the ten above for a
  feature spec, 3 for a design spec, 3 for epics-and-tasks, 5 (or 8 with
  a security pass) for an ADR.
- **Open questions** numbered `Q-N`, keeping their ID into Resolved
  Decisions; cross-feature questions live only in the master spec.
- **Status values** — `Draft | In Review | Accepted | Superseded`; a
  superseded ADR reads `Superseded by ADR-NNN`.
- **Ownership, no-overlap** — the master spec owns version-level context
  and one stub per feature; the feature spec owns everything per-feature.
  If a paragraph is being copied between them, one of them is wrong.

#### 5. Coordination rules — **the weak part**

Two agent-team prompts, each a complete seed message: `Specify.md`
(researcher + specwriter + designer + copywriter + architect →
PROCEED-stamped spec set) and `Implement.md` (implementer + testwriter +
reviewer + securityreviewer → shipped code, epic by epic). Intended flow
is `Specify.md` → `Implement.md`. Each carries a **Coordination rules for
the lead** section — block the implementer until the architect posts
`PROCEED` — and a **file-ownership table** giving each agent a
non-overlapping write boundary. The team README names the customisation
points and says when to skip the team entirely.

**What is missing:** no routing table mapping prompt shape to agent, no
parallelization rules, no explicit no-auto-chaining rule. The writing
pack has all three. Deferred to `coding@1.1` by Q-6.

#### 6. Behavioural guidelines — `CLAUDE.md.template`

Fifteen headings: project overview; per-module folder structure,
architecture and platform notes; specification structure with a document
inventory table; external APIs; conventions enforced for agents; and a
short autonomous-work note pointing at targets. Standing rules: unit
tests alongside the code, integration and acceptance tests in a separate
tree, cross-cutting decisions recorded as ADRs rather than settled in
chat, no secrets committed.

Under Q-45 the generated `CLAUDE.md` carries **inert anchors** around the
pack-owned sections. Nothing parses them at v1.0.

#### 8. Skills and automations — **the weak part**

The whole of it: **one slash command**, `/target <file>`, which runs the
readiness gate, executes per `Run.md`, verifies, and stops. **Zero hooks.
Zero skills. No default permission set.**

The absence of a permission set is not cosmetic. `Run.md`'s permission
pre-flight exists precisely because the pack ships nothing, so every
project hand-configures the pre-authorised actions a target needs, and a
run that hits an unlisted action at 80% done aborts. R5's candidates —
`/spec`, `/feature`, `/review`, a no-code-before-PROCEED hook — are
deferred by Q-6.

#### 9. Autonomy contract — the strong part

A **target** is a measurable goal an agent works toward alone, stopping
at **SUCCESS** (every criterion verified) or **ABORT** (a stop condition
fired). Never an open-ended "improve X". The contract is one filled
`target.template.md` with eight numbered sections — Target; Success
criteria; Scope & boundaries; Permissions & autonomy envelope; Behavior
on obstacles; Abort criteria; How to commit the work; Work log — plus a
readiness-gate block.

Lifecycle: **author** → **review** (`target-reviewer` returns `READY` /
`NEEDS-CORRECTION`; the permission pre-flight runs here) → **run**
(`/target`, unsupervised, log appended as it goes) → **stop** (exactly
two ways) → **report**. Six principles hold it together: measurability is
the stop condition; bounded autonomy ("ask forgiveness" is banned);
honest verification; loop avoidance; auditability via the work log;
fail-safe on ambiguity.

This is the part `writing` lacks entirely, and it is why Q-4 names
targets the first and clearest `shared/` candidate.

#### Migration requirements — `coding`

**Faithful (Q-6)**, plus:

**(a) Q-46 deletions.** These sections come out of the pack source
entirely. The list is exhaustive and US-24's check compares against it:

| File | What is deleted |
|---|---|
| `packs/coding/README.md` | The whole **`## Bootstrapping a new project`** section — the seven-step "copy the contents of this folder / rename `CLAUDE.md.template` / drop the agent files into `.claude/agents/`" list, and its trailing "the order above is a recommendation" note |
| `packs/coding/targets/README.md` | The whole **`## Adopting this in a new project`** section — the six-step copy/fix-the-paths list |
| `packs/coding/agents/README.md` | The sentence instructing the reader to copy the folder into `.claude/agents/` |
| `packs/coding/agent-teams/README.md` | The sentence instructing the reader to copy the folder to `AgentTeams/` |
| `packs/coding/CLAUDE.md.template` | The cross-reference to `targets/README.md`'s deleted adoption section, so the generated `CLAUDE.md` has no dangling pointer |

What replaces them is **nothing**. These describe a procedure the recipe
performs; they are dead content, not stale content. Each README keeps
everything that describes what the thing *is*.

**(b) Structural additions.** `pack.json`, `recipe.json`, `commands/`
(the `/target` command moves in from this repo's `.claude/commands/`),
and `scaffolds/backend-azure/` (from `infrastructure/backend-deploy/`)
plus `scaffolds/backend-aws/` (to author).

**(c) `shared/targets` extraction.** `targets/` and `target-reviewer.md`
lift out to `shared/targets/`, which `coding` then declares.

**Nothing else changes.** A typo migrates as a typo.

---

### `packs/writing/` — extracted from `AIImpactOnOrganizationsAndLeadership/`

**Source:** `/Users/mrandersen/Projects/AIImpactOnOrganizationsAndLeadership/`,
at a recorded commit. Never packaged before.
**Migration:** faithful (Q-6), minus everything project-specific, plus
the Q-46 stripping.
**References:** none. **Not** `shared/targets` at v1.0 (Q-6 defers it to
`writing@1.1`); **not** `shared/presentation` (Q-28).
**Scaffolds:** `writing-workstream`.
**Version:** 1.0.0 · `minCliVersion: 1.0.0`.

#### Payload — what phase 1 copies verbatim

`pack.json`, `recipe.json`, `README.md`, `CLAUDE.md.template`, `agents/`
(8 agents), the writing guide as `*.template.md`, `templates/`, and
`scaffolds/writing-workstream/`. Full tree:
`general/pack-inventory.md`.

**Note a discrepancy, do not paper over it.** The inventory names the
writing guide as `voice.template.md` + `words-to-avoid.template.md` and a
pack-level `templates/` holding `index`, `home` and `post` templates. The
source project holds `writing-guide/{tone-of-voice.md, ai-tells.md,
bilingual-publishing.md, README.md}` and **exactly one** template
(`workstreams/learning-journey/post-template.md`). Renaming three guide
files into two and authoring two new templates is not a faithful
extraction. **Q-51.**

#### 7b. What the recipe produces

| Step | Primitive | From (payload) | To (project) |
|---|---|---|---|
| Agents | `copy` | `agents/*.md` | `.claude/agents/` (8 files) |
| Writing guide | `strip-suffix` | `writing-guide/*.template.md` | `writing-guide/*.md` |
| Front door | `rename` | `templates/home.template.md` | `Home.md` |
| Onboarding | `generate` | `CLAUDE.md.template` + answers | `CLAUDE.md`, with inert anchors |
| Settings | `merge-json` | declared owned keys only — **no `hooks`, no permission allowlist** | `.claude/settings.json` |
| Corpus + workstreams | `copy`, `when scaffold=writing-workstream` | `scaffolds/writing-workstream/**` | `sources/{_scouting,inbox}/`, `analyses/`, `notes/`, `tasks/`, `workstreams/` |
| Folder indexes | `rename` per destination | `templates/index.template.md` | one `index.md` per created folder |

**Applied tree:**

```
<project>/
├── .claude/{agents/*.md ×8, settings.json}
├── writing-guide/           voice guide + words-to-avoid, ready to fill
├── Home.md                  map-of-content; the reader's front door
├── CLAUDE.md
└── (with --scaffold writing-workstream)
    ├── sources/{_scouting/, inbox/}
    ├── analyses/  notes/  tasks/
    └── workstreams/{index.md, <name>/{outlines,drafts,reviews,published}/}
```

Every created folder carries an `index.md` with a table of contents. That
convention is enforced by prose at v1.0, not by a hook — part 8 is
absent. The document templates stay in the payload.

#### 1. Process — nine stages in two strict sequences

Strict: do not skip a phase, do not substitute one agent for another.

**Stage 1 — research, in the shared corpus, once per subject:**
`scout → researcher → librarian → analyst`

| Step | Artifact | Rule |
|---|---|---|
| `scout` | `sources/_scouting/<topic>.md` | Always first for a new subject |
| `researcher` | `sources/<topic>-sources.md` | Fills the gaps scout identified |
| `librarian` | `sources/<year>/` + bibliography | Runs after each batch; never let `inbox/` accumulate |
| `analyst` | `analyses/<source-slug>.md` | Central sources only. **One source per invocation** |

**Stage 2 — writing, per workstream:**
`outliner → writer → critic → editor → published`

| Step | Artifact | Gate |
|---|---|---|
| `outliner` | `outlines/` — 2–3 *genuinely different* structures | The user picks. Never draft without a chosen outline saved |
| `writer` | `drafts/<piece>-v<N>.md` | Never invoked without an approved outline |
| `critic` | `reviews/<piece>-v<n>.md` | Revision loop **capped at two**, then escalate |
| `editor` | Line edits in place | Only after the critic loop closes. Never touches structure |
| published | `published/` | **The user does the final read. Never move a file there autonomously** |

The split is deliberate: research always runs in the shared corpus; only
outline → draft → review → published are per-workstream, so one folder
shows a deliverable end to end.

#### 2. Role set — eight agents

| Agent | Purpose | Model | Tools | Write boundary |
|---|---|---|---|---|
| `scout` | Map an unfamiliar field fast | Sonnet | WebSearch, WebFetch, Write | `sources/_scouting/` |
| `researcher` | Gather sources, build an annotated list | Sonnet | Read, Grep, Glob, Web*, Write | `sources/<topic>-sources.md` |
| `librarian` | Ingest, dedupe, tag, maintain the bibliography | Sonnet | Read, Write, Edit, Bash | `sources/`, `bibliography.md` |
| `analyst` | Close-read one source | Opus | Read, Write, Edit | `analyses/` |
| `outliner` | 2–3 candidate argument structures | Opus | Read, Write | `outlines/` |
| `writer` | Draft and revise against an approved outline | Sonnet | Read, Write, Edit | `drafts/` |
| `critic` | Adversarial review on five axes | Opus | **Read only** | none |
| `editor` | Line-level polish | Sonnet | Read, Edit | `drafts/`, in place |

Boundaries are drawn by **stage folder** rather than by file type — a
cleaner separation than `coding` achieves. `librarian` is the only agent
with `Bash`; `critic` is the only pure read-only role.

**Gap:** no gate role. The publish gate is a human, and the pack has no
analogue of `target-reviewer`.

#### 3. Document templates — **the weak part**

Exactly **one** template exists in the source, and it lives inside a
workstream rather than in a pack-level kit: a post template under
`workstreams/learning-journey/`. Every other artifact shape — the
scouting map, the annotated source list, the source analysis, the outline
candidate, the draft, the critic review, the per-folder `index.md`,
`Home.md` — is **described in prose** inside agent prompts and
`CLAUDE.md`, not templated.

Compare `coding`'s eleven. A faithful migration cannot close this —
Q-31, and see Q-51 on whether the inventory's `index` and `home`
templates may be authored to make the recipe expressible.

What *does* migrate as reusable reference is the writing guide: the
register (plain, first-person, unhyped), the screen that removes AI
giveaways, and the bilingual publishing convention. Its own README
declares it "deliberately project-agnostic… so you can drop this folder
into another repo", with exactly one project-specific dependency — the
voice samples — which becomes a placeholder. It is a reference kit rather
than a set of document templates, so it does not close the part-3 gap.

#### 4. Conventions

- **`index.md` in every folder**, with a table of file, description,
  created, updated. Append a row when adding a file; bump `Updated` when
  modifying one. **ISO dates** throughout.
- **`Home.md` is the map-of-content** — a thin navigation layer linking
  the per-folder `index.md` files rather than duplicating their tables.
- **Versioned drafts, never overwrites** — `intro-v1.0.md`,
  `intro-v1.1.md`. Prior drafts are always preserved.
- **Never invent sources.** `[NEEDS SOURCE]` is acceptable; fabrication
  is not.
- **Sources filed by year**, with the bibliography as the index.
- **One analysis per source**, read in the context of prior analyses.
- **Voice and style as declared fields** — audience, tone, length norms,
  citation style, plus voice samples the writer reads before drafting.
- **An explicit words-and-patterns-to-avoid list**: em-dashes (the #1
  tell), the rule of three, "it's not just X, it's Y", signposting,
  corporate diction, empty intensifiers, the summarising outro. Plus no
  header shorter than two words, and no bullet list where prose would do.

**Gap vs `coding`:** no numbering scheme, no status values, no counter
table, no amendment history. Draft version numbers in filenames are the
pack's entire ID system. Whether that is a deficiency or a correct fit
for the domain is a genuine question the anatomy surfaces and this spec
does not settle.

#### 5. Coordination rules — the strong part

Specific enough to migrate verbatim, and what `coding` lacks.

- **Routing defaults** — an eight-row prompt-shape → agent table: "map
  the field" → `scout`; "find sources on X" → `researcher`; "ingest these
  PDFs" → `librarian`; "close-read this source" → `analyst`; "give me
  outline options" → `outliner`; "draft against the outline" → `writer`;
  "tear this draft apart" → `critic`; "polish" → `editor`.
- **Parallelization rules** — scouts **run in parallel** for distinct
  subjects, spawned in a single message. Analysts **run serial**, because
  each reads in the context of prior analyses. Writer, critic and editor
  are **never parallelized** for the same piece.
- **No auto-chaining** — after each agent reports back, stop and wait for
  user direction unless the user asked for the full pipeline.
- **Bounded escalation** — the critic loop is capped at two revisions.

#### 6. Behavioural guidelines — the strong part

A single `CLAUDE.md` carrying: what the project is; voice and style;
words and patterns to avoid; where things live; the workflow with its
parallelization, routing and chaining rules; and standing instructions
(never invent sources; always preserve prior drafts; re-read the best
recent published piece when in doubt about voice; keep every `index.md`
current; keep `Home.md` current). Alongside it the writing guide is
knowledge loaded on demand — the closest thing either migrated pack has
to R5's notion of a skill, though it is a folder of documents rather than
a packaged skill.

#### 8. Skills and automations — **absent**

Zero slash commands. Zero pack-owned hooks. Zero skills. `.claude/` in
the source project holds `agents/` and a settings file, nothing else.

Two things in the source must **not** migrate, and saying so is part of
the spec:

- The single `PostToolUse` hook is a **third-party notifier** belonging
  to an unrelated tool, not a pack construct.
- The permission allowlist is roughly 120 accreted, project-specific
  entries — individual `curl` URLs, dozens of `WebFetch(domain:…)` rows,
  an Xcode build command from a different project entirely. Migrating it
  would ship one project's history as another project's defaults.

The pack therefore ships **no** part 8 and declares it `absent` with that
reason. The irony is worth recording rather than hiding: the writing
pack's two most forgettable rules — *never overwrite a draft* and *append
a row to `index.md`* — are precisely the hook candidates R5 names, and
the pack that most needs them ships neither. Q-30.

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

#### Migration requirements — `writing`

**Faithful (Q-6), minus the project**, plus:

**(a) Q-46 stripping.** Any prose in the source `CLAUDE.md`, the writing
guide README or the workstream READMEs that instructs a reader to copy a
folder, rename a file, fix a path, or set the project up by hand does not
extract. The recipe encodes it.

**(b) Four exclusion classes that do not extract**, each recorded in the
extraction record with the reason: the research corpus (`sources/<year>/`
content, `analyses/`, `notes/`, existing `workstreams/<name>/` content);
the ~120-entry permission allowlist; the third-party `PostToolUse` hook;
and every personal name, absolute path and voice sample.

**(c) Structural additions:** `pack.json`, `recipe.json`,
`scaffolds/writing-workstream/`, and the `.template` suffixing of the
guide files so `strip-suffix` has something to act on.

**(d) Q-51 is open** on whether (c) may extend to authoring
`index.template.md` and `home.template.md`. Without them the recipe
cannot produce `Home.md` or per-folder indexes; with them the extraction
authors content, which Q-6 forbids.

---

### `packs/planning/` — authored from the Q-11 knowledge base

**Source:** the portfolio-roadmap-deck workstream, treated strictly as a
**knowledge base** — the loop, the gate, the horizon determinants, the
template fields, the five practices, the two calibration poles. **No
runtime or process dependency**, and **not** a reuse of the writing pack.
Take the process and the templates, which the critic pass found
"realistic and internally consistent"; leave the surrounding claims,
which the same pass marked "revise heavily".
**Migration:** none — this pack is **authored**. Q-6's fidelity
constraint governs migrations and does not apply (Q-29).
**References:** see **Q-49**. **Not** `shared/presentation` (Q-28).
**Scaffolds:** none — the base pack *is* the portfolio shape.
**Version:** 1.0.0 · `minCliVersion: 1.0.0`.
**Provenance to record:** `base-deck-v2.1.md` (slides 8, 12, 17,
appendices A3/B3), `simulated-companies.md`, and
`specifications/v1.0/research-planning-pack-framing.md`.

#### Payload — what phase 1 copies verbatim

`pack.json` (declaring the `constraintFloor` parameter), `recipe.json`,
`README.md`, `CLAUDE.md.template`, `agents/` (6, all provisional),
`templates/` (4), `calibrations/{high-floor,near-zero-floor}/`,
`commands/` (3), and `hooks/kill-criteria-guard.sh`. Full tree:
`general/pack-inventory.md`. **The inventory omits `hooks/` from the
source tree while showing `.claude/hooks/kill-criteria-guard.sh` in the
applied tree; the payload must carry it, and this spec adds it.**

#### 7b. What the recipe produces

| Step | Primitive | From (payload) | To (project) |
|---|---|---|---|
| Agents | `copy` | `agents/*.md` | `.claude/agents/` (6 files) |
| Commands | `copy` | `commands/{bet,review,horizon}.md` | `.claude/commands/` |
| Guard | `copy` | `hooks/kill-criteria-guard.sh` | `.claude/hooks/` — **`0644`, inert** |
| Calibrated content | `copy`, **`when constraintFloor=high-floor`** | `calibrations/high-floor/**` | cadence, horizon and gate-coverage files |
| Calibrated content | `copy`, **`when constraintFloor=near-zero-floor`** | `calibrations/near-zero-floor/**` | the same destinations, different content |
| Calibration record | `substitute` | `{{harness:param.constraintFloor}}` | `calibration.md` at the repo root |
| Portfolio skeleton | `copy` / `generate` | register, horizons, decisions seeds | `portfolio/{register,horizons,decisions}.md` |
| Onboarding | `generate` | `CLAUDE.md.template` + calibrated fragments + answers | `CLAUDE.md`, with inert anchors |
| Settings | `merge-json` | declared owned keys only — **never `hooks`** | `.claude/settings.json` |

**Applied tree:**

```
<project>/
├── .claude/
│   ├── agents/*.md ×6         all marked provisional
│   ├── commands/{bet,review,horizon}.md
│   ├── hooks/kill-criteria-guard.sh   INERT 0644 — registered by nothing
│   └── settings.json
├── calibration.md             which calibration this project was initialised at
├── portfolio/
│   ├── register.md            every active bet, its phase and its horizon
│   ├── bets/<slug>/{brief.md, reviews/}
│   ├── horizons.md            the computed horizon per programme + determinant
│   └── decisions.md           what was killed, when, and why
└── CLAUDE.md                  the six-phase loop, the gate, the five practices,
                               calibrated content
```

`portfolio/bets/` is created empty — **Q-50**. The four document
templates stay in the payload and are read from
`.harness/pack/templates/`.

**Calibration is this pack's defining property and the only case in the
product of pack content varying by an init answer.**
`calibrations/<name>/` is a convention over the recipe's `when`
condition, not special machinery, and at v1.0 it varies content at
**whole-file granularity** — there is no region mechanism (Q-45).

#### 1. Process — a six-phase loop with one non-delegable gate

```
intake → discovery → prioritize → commit → deliver → [ABSORPTION/SECURITY GATE] → learn
   ↑                                                                                 │
   └─────────────────────────────────────────────────────────────────────────────────┘
```

A **loop**, not a pipeline: `learn` feeds the next `intake`. Under AI the
bottleneck migrates from deliver up-stack to discovery/prioritize, which
is the structural argument the loop encodes.

| Phase | Artifact | Gate |
|---|---|---|
| Intake | An entry in the portfolio intake (Now-Next-Later) register | Nothing enters without passing the intake gate field |
| Discovery | Evidence notes classified against the claims ledger; a draft bet brief | Claims classified frame / mechanism / vendor magnitude |
| Prioritize | A ranked register, cut to **absorbable** capacity, not available capacity | Concentration, not breadth |
| Commit | A committed bet brief with **kill criteria**, plus a horizon record | **Kill criteria stated before the bet starts.** Horizon-setting is first-class here |
| Deliver | Milestone progress against the committed brief | — |
| **Absorption / security gate** | A gate record: security review, V&V, maintenance capacity, review throughput | **Non-delegable.** PASS or HOLD. The direct analogue of `coding`'s ADR-PROCEED |
| Learn | A roadmap review (committed-milestone) feeding the next intake | Kill-criteria check runs here |

The gate is the pack's most important structural claim, and the
calibration changes only *how much of it is already held*: at a high
constraint floor it is partly held by existing V&V and regulatory
process; at a near-zero floor "nothing structural holds that gate" and it
must be held by policy.

#### 2. Role set — **provisional; the least evidenced part**

The research is explicit: phases, gate, templates and horizon framework
are directly supported, but **the roles are inferred from the phases, not
sourced**, and the corpus carries a `[NEEDS SOURCE — confirmed gap]`
marker on EM-portfolio responsibility, calling it "unwritten territory".
That gap sits exactly on the seam between this pack and `coding`. The
research's instruction is binding: *settle roles at spec time and do not
overclaim.*

Six candidate roles, all shipped **marked provisional in the pack
itself**, and declared `provisional` with a note in `pack.json`:

| Role | Phase | Proposed write boundary |
|---|---|---|
| `portfolio-steward` | intake, prioritize | the register and intake entries |
| `discovery-lead` | discovery | evidence notes |
| `bet-framer` | prioritize, commit | bet briefs, pre-commit |
| `horizon-analyst` | commit | horizon records |
| `gate-reviewer` | the gate | gate records only; read-only elsewhere |
| `learning-synthesiser` | learn | roadmap reviews |

Two properties are **not** provisional, because they follow from the
process rather than the role literature:

1. **The gate reviewer must be a distinct role from whoever ran
   deliver.** Non-delegability is a separation-of-duties claim,
   structurally the same relationship `coding` has between `implementer`
   and `securityreviewer`.
2. **The gate verdict must be a named token, not prose** — the same
   decision that makes `PROCEED` and `READY`/`NEEDS-CORRECTION` auditable
   in `coding`.

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
rather than taken from any one. Horizon is **computed, not chosen** —
which is why it ships as a walkable aid rather than a field someone fills
from instinct.

Template *fields* were stable across deck v1 → v2.1; the surrounding
claims were not. The pack records which draft it was authored from.

**The four field lists are calibration-invariant** and must not live
under `calibrations/` (US-19).

#### 4. Conventions

- **Evidence discipline** — every claim classified **frame**,
  **mechanism**, or **vendor magnitude**. Vendor telemetry is never
  stacked as if it were independent corroboration. Not an aspiration: a
  critic pass caught a fabricated-looking citation on a load-bearing
  slide, which is why this is a pack convention rather than a matter of
  memory.
- **A claims ledger** — every load-bearing claim recorded with its source
  and its classification.
- **Kill criteria stated BEFORE a bet starts.** A bet without kill
  criteria is not committed. **Enforced by the `/bet` command's own
  instruction and by review (part 8), not by a hook** — the same
  treatment `coding` gives its no-code-before-`PROCEED` rule and
  `writing` gives its index rule. Recorded as a shortfall in §Error
  States rather than presented as enforcement.
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
  next scheduled review.
- **The loop closes**: `learn` feeds the next `intake`; a review that
  produces no intake consequence has not finished.

Cadence *defaults* are calibration-varying; the four rules above are not.

#### 6. Behavioural guidelines — the five practices

These generalise across both calibration poles and read directly as
standing `CLAUDE.md` instructions:

1. **Concentrate the portfolio to absorbable capacity** — not to
   available capacity, and not to what fits on a slide.
2. **Set the horizon by the binding constraint**, not by the planning
   calendar.
3. **Match cadence to uncertainty resolution.**
4. **Keep the security gate non-delegable.**
5. **Budget review capacity as a portfolio input** — review throughput is
   a constraint on how many bets can run, not an afterthought.

All five are **calibration-invariant** (US-19).

#### 8. Skills and automations

The only pack shipping a non-trivial part 8 at v1.0. Declared `present`:

| Construct | Behaviour |
|---|---|
| `/bet` | Open a new bet brief from the payload template into `portfolio/bets/<slug>/brief.md`. Its instruction carries the kill-criteria rule: the command does not mark a bet committed while `Kill criteria` is empty or at its placeholder, and emits the §Error States block message instead |
| `/review` | Run a roadmap review against a committed milestone. Checks each reviewed bet's kill criteria are present and still meaningful, and escalates a bet that has crossed them |
| `/horizon` | Walk the horizon decision aid and write a horizon record |
| `.claude/hooks/kill-criteria-guard.sh` | A documented **inert** guard script, shipped `0644`, **registered by nothing and executed by nothing at v1.0** |

**The guard does not run at v1.0, and this is a format decision rather
than an oversight.** An earlier draft shipped it as a registered agent
hook. **No pack may register an agent hook at v1.0**: `hooks` is outside
the ownable set of `.claude/settings.json`, and a pack declaring it fails
validation. The decisive reason is `update`: a hook's command string is a
merge target, so a 3-way merge between a pack's change and a user's
change can resolve to a command **neither party wrote**, and no v1.0
mechanism re-consents to that.

What survives, exactly:

- The **rule** survives, enforced by `/bet`'s own instruction and by
  `/review`.
- The **message** survives verbatim (§Error States). Only its emitter
  changed.
- The **script** survives as content, so a v1.1 that gains a
  hook-registration mechanism has something to register.
  `lintel-harness validate` names it with `W-HOOK-SCRIPT-INERT`.
- What does **not** survive is enforcement at the file write. US-26's
  criterion is **not met at v1.0** and is recorded as a shortfall, not
  quietly reinterpreted.

`/review` collides in name with a deferred `coding` candidate. Because a
project holds exactly one pack (Q-12), command namespaces never intersect
and no disambiguation is needed.

Part 8 stays **`present`, not `provisional`**: three working slash
commands are real content, and this spec asserts "exactly one provisional
part" across the three packs as a **counted** NFR — that one is
`planning`'s role set. Marking part 8 provisional would make it two and
break a mechanically checked NFR in order to describe a gap that already
has a form: the shortfall record.

#### 9. Autonomy contract

The fit with the targets contract is unusually good and it is worth being
precise about why: **a bet's kill criteria *are* abort criteria**, and
**its success metric *is* a measurable stop condition** — the two things
the targets format most often has to be invented for are already
mandatory fields on the bet brief.

One addition the pack must make: **a target may carry a bet up to the
absorption gate; it may never clear it.** The planning target template
lists clearing or waiving the gate as an abort criterion, and
`target-reviewer` returns `NEEDS-CORRECTION` for any planning target
whose success criteria can only be met by passing it. That is a stronger
constraint than the targets contract currently expresses — "fail-safe on
ambiguity" is adjacent but not the same as a named phase the envelope may
never enter — and whether `shared/targets` should learn to express it is
Q-34.

**Where the contract comes from is open — Q-49.** `general/pack-inventory.md`
records part 9 as present "via `shared/targets`", while also recording
`shared/targets` as shipping with `coding` only. Both cannot be true. The
part-9 *content* above is settled either way; only its vehicle is open.

#### Calibration — the poles

| | **High constraint floor** (`high-floor`) | **Near-zero constraint floor** (`near-zero-floor`) |
|---|---|---|
| Reference organisation | Helio — regulated med-device hardware | Cadenza — AI-native SaaS |
| Programme shape | 18–36 month clearance-gated programmes | Near-free build, weekly releases |
| Horizon defaults | Long, set by regulatory and physical lead time | Short, set by competitive substitution speed |
| Cadence defaults | Slow — uncertainty resolves slowly | Fast — uncertainty resolves weekly |
| Absorption gate | Partly held already by existing V&V and regulatory process | **Nothing structural holds it.** Must be held by policy |

"Most real organizations sit somewhere between them," and the two poles
ship as reference points rather than an exhaustive menu. Helio and
Cadenza are **reference organisations**, not enum values: the parameter
values are `high-floor` and `near-zero-floor`.

**What varies:** cadence defaults, horizon defaults, and the
absorption-gate coverage narrative. **What does not vary:** the six
phases, the existence and non-delegability of the gate, the four template
field lists, and the five practices.

#### Migration requirements — `planning`

**Net-new authoring. Q-29 confirms this is not a boundary violation:**
Q-6 constrains *changing existing* packs and does not restrict *adding*
one; a net-new pack has no faithful baseline to violate. Two obligations
follow from that freedom rather than being lifted from a source:

- **Record the asymmetry in the pack README**, so a later reader does not
  misread a stronger part 5 or part 8 as cross-pollination that Q-6
  forbade elsewhere.
- **Record the provenance** — the deck draft and the research doc — so a
  later source revision can be diffed against what shipped.

And one recorded risk: **no dogfooding site is chosen** (Q-33, resolved
as deferred). The coding pack's own history shows a pack is only as good
as the work it has carried, so authoring `planning` against no real use
is the known failure mode. v1.0 ships it saying so.

---

### `shared/targets`

Per Q-4: a `shared/` tree sits alongside `packs/`; each pack lists the
shared files it pulls in via `pack.json`; **nothing is inherited
implicitly**; and **changing a shared file requires bumping every pack
that references it**.

The autonomy contract lifts out of `coding` because it is genuinely
domain-agnostic — Q-4 names it "the first and clearest candidate".

| File | Phase | Destination |
|---|---|---|
| `target.template.md` | P1 | stays in the payload; copied per goal by the user |
| `README.md` | P1 | stays in the payload — the way of working |
| `Run.md` | P2 | `targets/Run.md`, path-rewritten to `.harness/pack/targets/` |
| `target-reviewer.md` | P2 | `.claude/agents/target-reviewer.md` |
| `target.md` (the command) | P2 | `.claude/commands/target.md` |

The component declares its own `mappings` in
`shared/targets/component.json`, and a referencing pack inherits them
from its one `shared` entry, optionally overriding a single destination
with `remap`. The declaration lives with the thing being shared, which is
the only arrangement under which two referencing packs cannot disagree
about it.

| Pack | Declares it? |
|---|---|
| `coding` | **Yes** — v1.0 |
| `writing` | **No.** Deferred to `writing@1.1` by Q-6, where it becomes the first genuine acceptance test of `update` (S3) |
| `planning` | **Open — Q-49.** Its part 9 is `present` and `shared/targets` is its only stated vehicle, but the settled inventory records the component as shipping with `coding` alone |

**`shared/presentation` does not exist at v1.0** (Q-28). Q-9b's decision
stands — presentation is a shared capability, not a pack — but the
component ships in v1.1 and **no pack references it**. Two reasons: F5
could not source its contents at all, and under Q-4 a component
referenced by all three packs makes every change to it bump every pack in
the product. The portfolio deck remains its best worked example when it
is authored.

---

### Scaffold inventory

**Three scaffolds at v1.0** (Q-17). `frontend` and `app` defer to v1.1 —
both would be authored from nothing, in a release Q-6 reserves for the
generator.

| Scaffold | Pack | Category | Destination | Status |
|---|---|---|---|---|
| `backend-azure` — Azure SWA + Neon: `main.bicep`, `production.bicepparam`, `deploy.sh`/`.ps1`, `setup-neon.sh`/`.ps1`, README | `coding` | `backend` | `infrastructure/backend-deploy/` | **Exists** — migrates from `infrastructure/backend-deploy/` |
| `backend-aws` — Lambda + CDK | `coding` | `backend` | `infrastructure/backend-deploy/` | **To author** (Q-8a) |
| `writing-workstream` — the corpus and per-workstream stage folders, each with an `index.md` | `writing` | `workstream` | project root | **Exists** — extracts from the source project's shape |

**The two backend scaffolds are alternatives, not composable peers.**
They share a category and a destination, so requesting both is a
collision, not a merge (US-37). Q-8's original framing — "opt-in and
composable" — holds *across* categories and not *within* one, and that
distinction is a v1.0 requirement on the scaffold interface rather than a
detail.

Q-8a's accepted residual risk stands: both backends being declarative
IaC could bake IaC assumptions into the scaffold interface. Mitigation,
required at v1.0 and recorded: paper-check the interface against one
platform-CLI target (Vercel, Fly) **without authoring it**.

Each scaffold's files are `.template`-suffixed in the payload and
`strip-suffix`ed by the recipe, so the payload never contains a file that
looks runnable but is not.

---

## Open Questions

`Q-1`…`Q-46` are allocated and resolved — see the brief §12. **The next
free ID is Q-50.** Question IDs are unique across the whole project, not
per document. Cross-feature questions belong in the master spec.

Six questions this spec carried at version 1.0 have closed and are not
listed below: **Q-17** (scaffolds), **Q-28** (`shared/presentation`),
**Q-29** (authoring boundary) and **Q-33** (dogfood site) are in the
brief §12; **Q-13** is in the master spec's Resolved Decisions; **Q-27**
is in F1's.

| # | Question | Owner | Default assumption |
|---|---|---|---|
| Q-30 | **Does `writing` ship any default permission set, given its source project's is unmigratable?** ~120 accreted project-specific entries plus one third-party notifier hook. | architect | Ship none. Declare part 8 `absent` with that reason. Do not invent a default permission set inside a migration Q-6 forbids from changing content. |
| Q-31 | **Does `writing` ship document templates it does not currently have?** Its part 3 is one post template inside a workstream; every other artifact shape is prose-described. | architect | Migrate the one template into a pack-level `templates/` folder, declare the remaining shapes prose-specified, record part 3 as thin. Authoring new templates is reserved for `writing@1.1`. **Interacts with Q-51.** |
| Q-32 | **Is `planning`'s bet status vocabulary settled?** `proposed \| committed \| held-at-gate \| killed \| absorbed` is inferred from the process, not sourced. | specwriter / Thomas | Ship it marked **provisional** in the pack, alongside the provisional role set, and revisit after the first dogfood project. |
| Q-34 | **Should `shared/targets` learn to express "a phase the envelope may never enter"?** `planning`'s absorption gate is non-delegable; the template expresses only pre-authorised actions and abort criteria. | architect | No change to `shared/targets` at v1.0 — a change there bumps `coding` under Q-4. Express the constraint as an abort criterion in `planning`'s own target instances. **Depends on Q-49.** |
| Q-36 | **Does `coding` gain a document-kit brief template at v1.0?** The brief's §11 step 4 asks for one — the kit templates research, spec, design, ADR and epics, but not the brief that feeds them all. | architect | No at v1.0. Q-6 forbids content changes during migration; log it against `coding@1.1`. Note `specifications/project-brief.template.md` already exists as a *project* artefact the recipe copies out, which is a different thing. |
| **Q-49** | **Does `packs/planning/` declare `shared/targets` at v1.0, and if not, where does its part 9 come from?** `general/pack-inventory.md` records planning's part 9 as `present` "via `shared/targets`", and in the same document records `shared/targets` as shipping with `coding` only. Planning's source tree in that document contains no `targets/` and its applied tree contains no `targets/`. The three cannot all hold. This spec does **not** decide it: the settled model and the pack content genuinely disagree here. | **Thomas Andersen** (with the architect) | `planning` declares `shared/targets` — making two referencers, which is the arrangement Q-4's bump rule was written for and which US-27's abort criterion needs a vehicle for. The alternative — declaring planning's part 9 `absent` — would make three `absent` parts and break this spec's counted NFR, and contradicts the anatomy ratings the settled model pins. |
| **Q-50** | **How does a recipe create an empty directory?** None of the seven primitives does: `copy`, `rename`, `strip-suffix` and `generate` all produce files. Yet three packs need empty directories in the applied tree — `coding`'s `specifications/general/` and `specifications/v1.0/`, `writing`'s `sources/inbox/`, and `planning`'s `portfolio/bets/`. This is an F1/F2 question F5 raises because pack content depends on the answer. | architect (F1/F2 owns the mechanism) | An eighth primitive, `mkdir`, taking a destination and nothing else — cheap, inspectable, and it cannot escape path confinement any more than the others can. The alternative, seeding each directory with a placeholder file, changes what the packs ship and puts a `.gitkeep` in a product that otherwise ships only meaningful files. **Where this and F1 disagree, F1 wins.** |
| **Q-51** | **May the `writing` extraction author the templates its recipe needs?** `general/pack-inventory.md` gives `writing` a pack-level `templates/` with `index.template.md`, `home.template.md` and `post.template.md`, and a two-file writing guide named `voice.template.md` / `words-to-avoid.template.md`. The source has **one** template (`workstreams/learning-journey/post-template.md`) and a **four-file** guide (`tone-of-voice.md`, `ai-tells.md`, `bilingual-publishing.md`, `README.md`). Authoring two templates and renaming/merging three guide files is content change inside a migration Q-6 declares faithful. | **Thomas Andersen** (with the architect) | Split the difference along the Q-46 line. `index.template.md` and `home.template.md` are **recipe scaffolding, not pack content** — the recipe cannot produce `Home.md` or per-folder indexes without them, and both encode a convention the source already states in prose. Author them, record them in the extraction record as recipe-required additions, and keep the writing guide's **four files under their existing names**, `.template`-suffixed only where the recipe strips a suffix. Part 3 stays declared **weak** on the strength of the one real document template. |

---

## Resolved Decisions

Q-1…Q-46 were resolved before this rewrite and live in the brief's §12,
the master spec, or F1. The rows below are questions **F5 raised** that
have since closed; they keep their original IDs per `conventions.md` and
are not reused.

| # | Question | Decision | Date |
|---|---|---|---|
| Q-35 | How is the project-monotonic `US-N` counter reconciled across parallel feature specs? | **Reconciled by the 2026-08-30 consistency pass.** F1 keeps US-1…US-16 (earlier in build order) and later gained US-29; F5's block was renumbered to US-17…US-28. Standing rule for later parallel passes: the earlier feature in build order keeps its block, later blocks are renumbered at the merge, and the counter table is updated before either spec reaches `Accepted`. **Applied again in this rewrite:** US-23 is retired rather than reused, and new stories were allocated from US-34. | 2026-08-30 |
| Q-37 | Where is a pack's anatomy declaration validated — schema or CLI? | **Answered by F1.** `pack.json` carries a mandatory `anatomy` object with exactly nine keys; a missing key is `E-ANATOMY-MISSING`; a key whose globs match no files is `E-ANATOMY-EMPTY`. The anatomy carries a three-value `status` enum — `present \| provisional \| absent`, defaulting to `present` — with `provisional` requiring a `note` and `absent` a `reason`, which is what makes this spec's provisional/absent counts mechanically checkable. **Reaffirmed by this rewrite:** the recipe is a sub-part of part 7 precisely so that nine keys stays nine keys. | 2026-08-30 |
