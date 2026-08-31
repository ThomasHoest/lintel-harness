# Lintel Harness — product brief

**Status:** Draft · **Owner:** Thomas Andersen · **Last updated:** 2026-08-30

---

## 1. Purpose

Lintel Harness is a **kit for standing up an agentic project in minutes
instead of days**. It supplies everything an agent-driven project needs
before any real work starts: the agent roles, the agent teams, the
process and its document templates, the behavioural guidelines, the
folder structure, and the skills and automations that make the whole
thing run.

The unit of delivery is a **template**: a complete, opinionated way of
working for one *kind* of project. Coding is one template. Writing is
another. More will follow.

Today this knowledge exists, but it exists as **folders that get copied
and hand-edited**. That makes it slow to apply, impossible to update
once applied, and prone to silent drift between the source and the
projects using it. The harness turns that folder into a product.

---

## 2. The problem, precisely

Every new agentic project starts by re-answering the same questions:
which agents exist, what each one owns, what document types there are,
what order work moves in, where files live, what the agent may do
unsupervised, and what "done" means. Answered ad hoc, each project
answers them slightly differently — and an agent that has to guess the
process guesses differently every time.

Copying a template folder solves the first hour and creates two lasting
problems:

- **Applying is manual.** Copy the folder, drop `agents/` into
  `.claude/agents/`, rename `CLAUDE.md.template`, replace every
  `{{PLACEHOLDER}}`, and fix the path references by hand. The existing
  targets README has a literal step *"Fix the paths"* — that step is a
  bug in the distribution model, not in the docs.
- **Updating is impossible.** Once copied, a project's harness is a
  fork. An improvement made in project N never reaches projects 1…N-1,
  and there is no way to tell how far a given project has drifted.

The note's two hardest requirements — *quick to apply* and *easy to
update and improve over time* — are in direct tension under copy-paste.
Resolving that tension is the core design problem of this product
(§7).

---

## 3. What exists today (the evidence base)

Two templates exist in practice. Neither is packaged; both work.

### 3.1 Coding template — `template/` in this repo

Extracted from the Voxio/Lintel codebase. Five parts:

| Part | Contents |
|---|---|
| Spec process | `research → spec → design-spec → ADR → epics-and-tasks → implementation`, every arrow a gate; 11 document templates; `conventions.md` for naming, numbering, ownership |
| Agent roles | 10 sub-agents: `architect`, `implementer`, `testwriter`, `reviewer`, `securityreviewer`, `specwriter`, `researcher`, `designer`, `copywriter`, `target-reviewer` |
| Agent teams | `Specify.md` (research → PROCEED-stamped spec set), `Implement.md` (code → tests → review → security) |
| Targets | A contract format for long-running unsupervised runs: measurable success criteria, an autonomy envelope, abort criteria, a work log, plus an independent readiness gate and a `/target` command |
| Infrastructure | Bicep + shell/PowerShell to provision Azure Static Web App + Neon Postgres |

**Proof it scales:** RAFAL was specified end-to-end through this
template — 8 features, 44 epics, 398 tasks, 9 security-reviewed ADRs,
all Accepted before a line of code.

### 3.2 Writing template — `AIImpactOnOrganizationsAndLeadership/`

Never extracted; lives inside the project that grew it. Same anatomy,
entirely different content:

| Part | Contents |
|---|---|
| Process | `scout → researcher → librarian → analyst` (shared corpus), then `outliner → writer → critic → editor → published` (per workstream), with a strict no-skip rule and a max-two revision loop |
| Agent roles | 8 sub-agents: `scout`, `researcher`, `librarian`, `analyst`, `outliner`, `writer`, `critic`, `editor` |
| Structure | Shared corpus (`sources/`, `analyses/`, `notes/`, `tasks/`) + `workstreams/<name>/{outlines,drafts,reviews,published}/` |
| Guidelines | Voice and style, an explicit words-to-avoid list, "never invent sources", versioned drafts never overwritten, an `index.md` in every folder, a `Home.md` map-of-content |
| Coordination | Routing defaults (prompt shape → agent), parallelization rules (scouts parallel, analysts serial, never parallelize writer/critic/editor), no auto-chaining |

### 3.3 What the two have in common

This is the product's core abstraction. **A template is these nine
things**, and only the content differs between types:

1. **A process** — named phases, gated, with a defined artifact per phase.
2. **A role set** — single-purpose agents, each mapped to phases and
   given a non-overlapping write boundary.
3. **Document templates** — one per artifact type, showing structure
   and expected depth.
4. **Conventions** — naming, numbering, ownership, indexing, status
   values.
5. **Coordination rules** — routing, sequencing, parallelism, when to
   escalate to the human.
6. **Behavioural guidelines** — the standing instructions that go in
   `CLAUDE.md`.
7. **Folder scaffolding** — the directory shape the process assumes.
8. **Skills and automations** — slash commands, hooks, skills.
9. **An autonomy contract** — what may run unsupervised, and how it
   stops.

Notably, the coding template has a strong #9 (targets) and a weak #8
(one slash command, no hooks, no skills); the writing template has a
strong #5 and #6 and no #9 at all. **Each template is missing what the
other proves is valuable.** Factoring the common anatomy out is how
both get better at once.

---

## 4. Goals

| # | Goal | Measure |
|---|---|---|
| G1 | Apply a template to a new project in one command, under a minute | `harness init <template>` produces a working project with zero manual path edits |
| G2 | Support multiple template *types* with genuinely different content | Coding and writing both ship at v1.0 from the same machinery |
| G3 | Make templates updatable after they've been applied | An applied project can pull a newer template version and see exactly what changed |
| G4 | Make improvements flow back | A fix found in a project has a defined route into the template pack |
| G5 | Ship scaffolding for the common project shapes | Backend, frontend, app, and writing-workstream scaffolds available at init |
| G6 | Make the harness itself legible | A newcomer can read one page and understand what they got and why |
| G7 | Dogfood the pack in this repo | This repo is set up *by* the coding pack, and eventually *by the generator* (S7) |

### G7 — Dogfooding is a hard requirement, not a nicety

**This project must dogfood the template.** Lintel Harness is set up by
the coding pack it productizes: `specifications/`, `AgentTeams/`,
`targets/` and `copy/` were produced by applying that pack by hand,
exactly as a user would.

Three things follow, and they are binding:

1. **Manual first, then automate.** Anything the generator will do is
   done here by hand first, and what it cost is logged. That log is the
   requirement list for `harness init` — see `CLAUDE.md` §Dogfooding for
   the first one.
2. **The pack is verified by use.** A pack instruction that doesn't
   survive contact with a real repo is a defect in the pack.
3. **Fix the pack, then re-apply.** Patching an applied copy in place is
   the exact drift this product exists to prevent. Doing it here would
   destroy the evidence.

The first manual apply already produced findings the copy-paste model
had hidden: a source→applied **rename** (`agent-teams/` → `AgentTeams/`)
and a **filename transform** (`*.template.md` → `*.md`) that a naive
copier would get wrong; **three files needing path rewrites**; and — the
most interesting one — **two READMEs that describe their own copying and
therefore go stale the instant they are applied.** That last one means a
pack needs a notion of *source-only* versus *applied-copy* content, which
no part of §7's managed-apply model covered.

---

### Non-goals (v1.0)

- Not a hosted service, registry, or marketplace. Local + git.
- Not tied to one agent runtime beyond the `.claude/` conventions it
  already assumes.
- Not a project-management tool. It scaffolds a way of working; it does
  not track execution.
- Not a replacement for the spec process — it *distributes* it.

---

## 5. Users and use cases

**Primary user: the solo operator running several agentic projects at
once** (today: Thomas). Needs a new project productive immediately, and
needs improvements discovered in one project to reach the others.

| Use case | Today | With the harness |
|---|---|---|
| Start a new coding project | Copy `template/`, rename, fix paths, edit CLAUDE.md | `harness init coding` |
| Start a writing project | Copy another project and delete its content | `harness init writing` |
| Improve an agent prompt | Edit it in one project; other projects never learn | Edit the pack, `harness update` elsewhere |
| Add a new template type | No route — start from a blank folder | Fork the closest pack, edit the nine parts |
| Audit a project's setup | Read every file and compare by eye | `harness status` reports pack, version, and drift |

**Secondary user: a small team adopting the way of working.** Drives
the need for versioning and an honest drift report — not just a
one-time scaffold.

---

## 6. Requirements

Expanded from the source note; each maps to its originating bullet.

### R1 — Multiple template types *(note: "different template types")*

- Templates are addressable by name: `coding`, `writing`, more later.
- **v1.0 ships three:** `coding`, `writing`, and `planning` (framing
  pending — Q-11). Plausible later: research, data/analysis, ops.
- **Presentation is not a pack.** It is a shared capability every pack
  references (Q-9b), since presenting completed work is useful from all
  three.
- Each type is a self-contained pack; adding one must not require
  changing the harness core.

### R2 — Per-type agents, specs and templates *(note: "different agents, templates specs etc.")*

- Every pack ships its own role set, document templates, conventions
  and coordination rules — no forced sharing between types.
- Where two packs genuinely share a piece, it is shared by explicit
  reference from a `shared/` tree, declared in `pack.json` — never
  inherited implicitly (Q-4). Changing a shared file bumps every pack
  that references it.
- Each pack declares the **nine-part anatomy** of §3.3, so a pack with
  a missing part is visibly incomplete rather than quietly deficient.

### R3 — Quick to apply *(note: "quick to apply to a new project")*

- One command from empty directory to working project.
- Placeholder substitution is automated: project name, paths, stack.
- **No manual path fixups.** Files land in their final location with
  correct internal references.
- An applied project is immediately runnable: agents spawn, commands
  resolve, the CLAUDE.md describes the actual layout.

### R4 — Easy to update and improve *(note: "easy to update and improve over time")*

- Packs are **versioned**.
- An applied project records what it applied (pack, version, files) so
  a later update can be computed rather than guessed.
- `harness update` shows a diff and merges, preserving local edits —
  the project owner is never forced to choose between an update and
  their customisations.
- A **contribute-back path**: an improvement made in a project can be
  promoted into the pack deliberately.
- Drift is reportable, not just tolerated.

### R5 — Skills and automations *(note: "appropriate skills and automations")*

The weakest area today — the coding template ships exactly one slash
command and no hooks or skills. Each pack should carry:

- **Slash commands** for its recurring operations (`/target` today;
  candidates: `/spec`, `/feature`, `/review`, `/draft`, `/critique`).
- **Skills** for the knowledge an agent should load on demand rather
  than carry in `CLAUDE.md`.
- **Hooks** for the rules that must be *enforced* rather than merely
  written down — e.g. the writing template's "never overwrite a draft"
  and "append a row to `index.md`", or the coding template's "no code
  before a PROCEED ADR". A guideline an agent can forget is a candidate
  for a hook.
- Sensible default permissions, so the pre-authorized actions a target
  needs don't prompt mid-run.

### R6 — Scaffolding for core project types *(note: "scaffolding structures for core project types")*

Structural scaffolds, selectable at init and composable:

- **backend** — service layout, deploy scripts, migrations, test tree.
  (Azure SWA + Neon exists; the cloud should be a choice, not a
  hard-coded assumption.)
- **frontend** — site layout, design tokens, component conventions.
- **app** — client application layout.
- **writing workstream** — corpus + per-workstream stage folders.

A project picks a template type *and* one or more scaffolds:
`harness init coding --scaffold backend,frontend`.

---

## 7. The central design decision: how a template is applied

G1 (quick to apply) and G3 (updatable after applying) pull against each
other. Three models:

| Model | Apply | Update | Verdict |
|---|---|---|---|
| **Copy** (today) | Trivial | Impossible | Status quo; fails R4 |
| **Link** (submodule / shared dir) | Fast | Automatic | Fails R2 in practice — projects must diverge, and a linked pack can't be edited locally |
| **Managed apply** | One command | Diff + 3-way merge | Recommended |

**Recommendation: managed apply.** The harness CLI writes real files
into the project (so everything is local and editable), and records a
manifest — pack name, version, and a hash per generated file. On
`harness update`, files untouched since apply are replaced silently;
files the project has edited produce a 3-way merge against the new pack
version. This is the model scaffolding tools converge on, and it is the
only one that satisfies both G1 and G3.

Implication: the manifest is a load-bearing artifact and needs its own
spec.

---

## 8. Success criteria

- **S1** — A new coding project is fully set up in one command with no
  manual edits, and its first spec-chain run works.
- **S2** — A new writing project is set up the same way from the same
  machinery — proving the abstraction generalises beyond one type.
- **S3** — A change made to a pack reaches an existing project via
  `harness update`, with local customisations preserved.
- **S4** — `harness status` correctly reports pack, version, and drift.
- **S5** — Adding a third template type requires no change to the
  harness core.
- **S6** — The two existing templates are both migrated into packs;
  neither survives as a hand-copied folder.
- **S7** — This repo is itself produced by `harness init coding` +
  `harness update`, with no hand-applied files left. Until that holds,
  the product has not shipped.

---

## 9. Open questions

**None.** Q-1…Q-12 are all resolved — see §12. New questions raised
during specification keep the next free ID (Q-13…).

---

## 10. Out of scope for v1.0

- A public registry or marketplace of packs.
- A GUI. CLI plus Claude Code skills only.
- Multi-user permissioning or team accounts.
- Runtimes other than Claude Code's `.claude/` conventions.
- Migrating historical projects wholesale — S6 covers the two known
  templates, not every repo that ever copied one.
- **Improving pack content.** v1.0 migrates the two packs faithfully;
  cross-pollination and other content improvements land in the first
  post-v1.0 bump (Q-6). v1.0 is about the generator, not the packs.

---

## 11. Immediate next steps

1. ~~Research the planning-pack framing (Q-11).~~ **Done and
   accepted** — `specifications/v1.0/research-planning-pack-framing.md`.
   All questions are now resolved; the v1.0 spec set is unblocked.
2. Take this brief through `AgentTeams/Specify.md` to produce the v1.0
   spec set. Q-1…Q-10 are resolved, so the spec is otherwise unblocked.
3. Migrate `template/` → `packs/coding/` and extract the writing
   template from `AIImpactOnOrganizationsAndLeadership/` →
   `packs/writing/`. Faithful migration only (Q-6).
4. Add a **brief template** to the specifications kit — the pack has
   templates for research, spec, design, ADR and epics, but not for the
   brief that feeds them all. This document is the evidence and the
   first draft of one.
5. Close the two outstanding dogfooding items now unblocked by Q-1:
   fill `copy/tone-of-voice.md`, and redraw `AgentTeams/Implement.md`'s
   file-ownership table against the Node/TypeScript CLI layout.

---

## 12. Resolved decisions

| # | Decision | Date | Rationale |
|---|---|---|---|
| Q-2 | **Packs live in `packs/` in this repo, published with the CLI.** `template/` becomes `packs/coding/`; the writing template is extracted to `packs/writing/`. Packs bundle into the published package, so `npx` needs no network fetch. | 2026-08-30 | One maintainer, two packs. A monorepo makes a CLI feature and the pack change that needs it a single atomic commit and a single release, and removes the CLI↔pack version-compatibility problem entirely. Independent pack versioning does not require repo separation — it lives in the manifest (Q-3). Revisit only if third-party packs become real. |
| Q-3 | **Per-pack semver plus a separate CLI semver.** Each pack declares its version in `packs/<name>/pack.json` and a minimum CLI version; the CLI is versioned as the published package. The manifest records both. | 2026-08-30 | Makes `harness update` precise — "you applied coding@1.2.0, latest is coding@1.4.0" — with per-pack changelogs, and keeps a writing-only project from being told it is stale because the coding pack moved. Satisfies R1 (adding a pack never touches the core). A rolling, unversioned CLI was rejected: a CLI behaviour change could silently reinterpret an old manifest with no version to pin. |
| Q-4 | **Packs are standalone but may share by explicit reference.** A `shared/` tree sits alongside `packs/`; each pack lists the shared files it pulls in via `pack.json`. Nothing is inherited implicitly. **Rule:** changing a shared file requires bumping every pack that references it — the CLI should enforce or at least warn on this. First and clearest candidate: the targets way-of-working, which is domain-agnostic. | 2026-08-30 | R2's stated intent ("shared by explicit reference, not by accident"). Investigation showed the two packs overlap in *names* far more than *content* — their `researcher` agents and `conventions.md` files are genuinely different documents — so a shared base (rejected) would have coupled pack versions for almost no real reuse. Explicit reference fixes the one true duplicate without that coupling. |
| Q-5 | **`harness contribute` emits a patch against the pack.** It diffs an applied copy against the pack version recorded in its manifest and produces a patch or branch against `packs/<name>/`. | 2026-08-30 | Closes G4's loop, and is cheap: it reuses the drift engine `harness status` already needs for S4 — the same comparison pointed the other way. Works from any project on the machine without opening this repo, so an improvement found in a writing project doesn't depend on remembering it later. |
| Q-6 | **Cross-pollination is deferred out of v1.0** to the first post-v1.0 pack bump (`coding@1.1` / `writing@1.1`): writing gains the targets contract by referencing `shared/`, coding gains routing and parallelization rules. v1.0 migrates both packs **faithfully**. | 2026-08-30 | Two reasons. S6 stays verifiable — if pack content changes during migration, a difference cannot be attributed to a migration bug versus an intentional improvement. And the deferred bump becomes the first genuine acceptance test of `harness update` (S3): a real pack version flowing into already-applied projects, rather than a synthetic one. |
| Q-7 | **The CLI generates `CLAUDE.md` with marked regions.** Pack-owned regions (spec process, agents, conventions, targets) are maintained by `harness update`; the surrounding project-owned prose is never touched. | 2026-08-30 | G1 ("zero manual edits") is not true if the highest-value agent-onboarding file is left hand-written, but a fully managed CLAUDE.md would conflict on nearly every update since it is the most project-edited file in any repo. The seam is evidence-backed, not guessed: this repo's own CLAUDE.md already divides cleanly into pack-derived sections and project-owned ones. **May also answer Q-10** — see that row. |
| Q-8 | **Two backend scaffolds at v1.0:** the existing Azure SWA + Neon, plus one alternative (choice recorded in Q-8a). Scaffold selection is general, composable and opt-in — `harness init coding --scaffold backend,frontend`. | 2026-08-30 | A second implementation *proves* the scaffold interface is general rather than asserting it — the same argument that makes two packs a better test of the pack format than one. Applying the pack to this repo already showed scaffolds must be optional: the backend was skipped entirely because the harness has none. Accepted cost: this is pack-content work inside a release Q-6 otherwise reserved for the generator. |
| Q-8a | **The second backend scaffold is AWS (Lambda + CDK).** | 2026-08-30 | Chosen for reach: the widest applicability if a project must land on AWS, and CDK is a genuine IaC alternative to Bicep. **Residual risk, accepted:** both scaffolds are then declarative-IaC in shape, so the scaffold interface could still bake in IaC assumptions that a platform-CLI target (Vercel, Fly) would break. Mitigation — during the spec, paper-check the interface against one non-IaC target without authoring it. It is also the heaviest of the four candidates to author and test; treat that as v1.0 scope risk. |
| Q-9 | **Ship three packs at v1.0**: coding, writing, and a planning / product-direction pack. | 2026-08-30 | Generality proven by construction rather than argued. Two packs by one author risk a format overfit to shared habits; a third built against the same core is the real test of R1. |
| Q-9a | **Pack 3 is a planning / product-direction pack** — product discovery extended with roadmap planning, version specifications and roadmap process outlines. Working title only; **framing is deliberately not settled** and needs research first (Q-11). | 2026-08-30 | Discovery alone rhymes too closely with the writing pack's gather-synthesise-decide shape. Adding roadmap and version-planning gives it a distinct spine and covers real recurring work that neither existing pack owns. Framing deferred rather than guessed — the spine determines the phases, artifacts and roles, so getting it wrong is expensive. |
| Q-9b | **Presentation is not a pack — it is a cross-cutting capability baked into every pack**, living in `shared/` and referenced by all three (Q-4's mechanism). | 2026-08-30 | Presenting completed work is universally useful, so scoping it to one pack would deny it to the others; and its output format differs while its process does not, which made it a weak test of pack-level generality anyway. As a shared component it reaches every pack at once. Note the Q-4 rule applies: changing it bumps every referencing pack. |
| Q-10 | **Marked regions everywhere.** `source-only` blocks are stripped when a file is applied; `applied-only` blocks are included only on apply. The same delimiter mechanism Q-7 chose for `CLAUDE.md`, generalised to any pack file. A whole-file mode in the manifest remains as the degenerate case. | 2026-08-30 | One concept instead of two, and it is the only option that expresses what actually happened: both stale READMEs were needed in the applied copy *with different content inside them*, so a whole-file mode could not have described the case, and parallel `README.pack.md` / `README.applied.md` files would reintroduce the drift this product exists to prevent. |
| Q-11 | **The `planning` pack is framed as portfolio and roadmap management as a decision loop** — `intake → discovery → prioritize → commit → deliver → learn`, with a non-delegable absorption/security gate between deliver and learn, and horizon-setting as a first-class step inside commit. Calibrated at init by constraint floor. The **portfolio-roadmap-deck** workstream is the **knowledge base** the pack is authored from — mined for content, with no runtime or process dependency on it. | 2026-08-30 | The spine is evidenced research output rather than a process invented to fill a template: the loop, the gate, the four-determinant horizon framework, three drafted templates and two calibration poles all already exist. Rejected alternatives: *product discovery* (one phase of six, and its gather→synthesise→decide shape rhymes with the writing pack, testing generality weakly), *roadmap/version planning* (an add-on to `coding` rather than a peer), *portfolio governance/PMO* (built on the corpus's weakest, vendor-dominated evidence). Full working: `v1.0/research-planning-pack-framing.md`. |
| Q-12 | **A project holds exactly one pack.** A user who needs two ways of working runs two projects side by side. | 2026-08-30 | Keeps the manifest, `CLAUDE.md` region ownership and `update` semantics single-owner, so no composition mechanism is needed in v1.0. Removes the file-collision and region-conflict class of problems entirely rather than solving it. |
| Q-1 | **The harness is a CLI engine plus a thin Claude Code skill.** A Node/TypeScript CLI owns the deterministic mechanics — manifest, per-file hashing, drift detection, 3-way merge. A thin skill drives the CLI and handles the judgment steps: filling placeholders, adapting the generated `CLAUDE.md`, redrawing file-ownership tables for the actual layout. **Build the CLI first** — the manifest/merge is the load-bearing risk; the skill is a wrapper added on top. | 2026-08-30 | R4 needs determinism: hashing, drift and merge must be computed facts, not agent judgment, or S3/S4 vary run to run. But applying a pack is not purely mechanical — the placeholder and ownership-table work is genuine judgment a CLI could only stub out. Splitting on that seam puts each half where it is strongest. |
