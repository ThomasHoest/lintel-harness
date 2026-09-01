# Lintel Harness — product brief

**Status:** Draft · **Owner:** Thomas Andersen · **Last updated:** 2026-09-01

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
| G1 | Apply a template to a new project in one command, under a minute | `lintel harness init <template>` produces a working project with zero manual path edits |
| G2 | Support multiple template *types* with genuinely different content | Coding and writing both ship at v1.0 from the same machinery |
| G3 | Make templates updatable after they've been applied | An applied project can pull a newer template version and see exactly what changed |
| G4 | Make improvements flow back | A fix found in a project has a defined route into the template pack |
| G5 | Ship scaffolding for the common project shapes | Backend, frontend, app, and writing-workstream scaffolds available at init |
| G6 | Make the harness itself legible | A newcomer can read one page and understand what they got and why |
| G7 | Dogfood the pack in this repo | This repo is set up *by* the coding pack, and eventually *by the generator* (S7) |

> **Which of these v1.0 answers, after Q-62.** **G3 is in v1.0** —
> `update` ships, so an applied project can pull a newer pack version and
> see exactly what changed. **G4 is the one goal v1.0 does not answer**:
> improvements still flow back only by hand-editing `packs/<name>/`, as
> `contribute` defers to v1.1 with F4. Q-42 had deferred G3 as well; that
> half is reversed. G5 is partial by Q-17 (three scaffolds, not four
> shapes) and G2's "coding and writing" is exceeded — three packs ship.

### G7 — Dogfooding is a hard requirement, not a nicety

**This project must dogfood the template.** Lintel Harness is set up by
the coding pack it productizes: `specifications/`, `AgentTeams/`,
`targets/` and `copy/` were produced by applying that pack by hand,
exactly as a user would.

Three things follow, and they are binding:

1. **Manual first, then automate.** Anything the generator will do is
   done here by hand first, and what it cost is logged. That log is the
   requirement list for `lintel harness init` — see `CLAUDE.md` §Dogfooding for
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
| Start a new coding project | Copy `template/`, rename, fix paths, edit CLAUDE.md | `lintel harness init coding` |
| Start a writing project | Copy another project and delete its content | `lintel harness init writing` |
| Improve an agent prompt | Edit it in one project; other projects never learn | Edit the pack, `lintel harness update` elsewhere |
| Add a new template type | No route — start from a blank folder | Fork the closest pack, edit the nine parts |
| Audit a project's setup | Read every file and compare by eye | `lintel harness status` reports pack, version, and drift |

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

**In v1.0, less `contribute` (Q-62 returns R4; Q-42 had deferred it).**

- Packs are **versioned**.
- An applied project records what it applied (pack, version, answers,
  scaffolds, payload digest) so a later update is **computed rather than
  guessed** — recomputed, in fact, from the local payload and the recipe
  rather than remembered from a stored base.
- `lintel harness update` **replaces what you have not touched and
  reports what you have.** It shows what changed; it does **not** merge.
  The project owner is never forced to choose between an update and
  their customisations, because an edited file is never overwritten —
  but neither is it blended: **no merge engine, no conflict markers**.
  Reconciling an edited file is conversational work the skill does with
  the owner (Q-1, Q-62).
- Drift is reportable, not just tolerated — `verify`, and `update`'s
  read-only mode.
- **Deferred to v1.1:** a **contribute-back path**, by which an
  improvement made in a project is promoted into the pack deliberately.
  This is the one part of R4 v1.0 does not answer (F4).

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
`lintel harness init coding --scaffold backend,frontend`.

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
`lintel harness update`, files untouched since apply are replaced silently;
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
  `lintel harness update`, with local customisations preserved.
  **Returned to v1.0 by Q-62.** "Preserved" is exact and is the whole of
  the guarantee: an edited path is **left untouched and reported**, never
  merged and never marked up. Unedited paths are replaced outright.
- **S4** — `lintel harness status` correctly reports pack, version, and
  drift. **In v1.0 as `update`'s read-only mode** (Q-62), not as a
  separate command.
- **S5** — Adding a third template type requires no change to the
  harness core.
- **S6** — The two existing templates are both migrated into packs;
  neither survives as a hand-copied folder.
- **S7** — This repo is itself **produced by `lintel harness init
  coding` and maintained by `lintel harness update`**, with no
  hand-applied files left. Until that holds, the product has not
  shipped. **Restored by Q-62**: Q-42 had weakened this to apply-only
  when F3 left v1.0; F3 is back, so the original two-part criterion
  stands again. Demonstrating it therefore takes an apply **and** an
  update, not an apply alone.

---

## 9. Open questions

**Q-65…Q-78 remain open** from the wave-1 specs, each feature-local and resolvable in its own ADR. Q-79, Q-80 and Q-81 are resolved. Q-1…Q-63 are resolved — see §12. Next free ID is **Q-82**. **Q-64 stays reserved** for the packaging question Q-63 names and is not free.

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
   All questions Q-1…Q-46 are resolved. Two cross-cutting references now
   describe the settled model:
   `specifications/general/pack-application.md` (the two-phase apply,
   with flowchart) and `specifications/general/pack-inventory.md` (all
   three packs, tree, file metadata, versions).
   **F1, F5, the master spec and ADR-001 predate Q-39…Q-46 and must be
   rewritten against the two-phase model before implementation.**
2. Take this brief through `AgentTeams/Specify.md` to produce the v1.0
   spec set. Q-1…Q-10 are resolved, so the spec is otherwise unblocked.
3. Migrate `template/` → `packs/coding/` and extract the writing
   template from `AIImpactOnOrganizationsAndLeadership/` →
   `packs/writing/`. Faithful migration only (Q-6).
4. ~~Add a **brief template** to the specifications kit.~~ **Done**
   (2026-08-31) — `packs/coding/specifications/project-brief.template.md`,
   rendered by phase 2 into `specifications/project-brief.md`. Note this
   overrides Q-36's adopted default of "no brief template at v1.0".
5. Close the two outstanding dogfooding items now unblocked by Q-1:
   fill `copy/tone-of-voice.md`, and redraw `AgentTeams/Implement.md`'s
   file-ownership table against the Node/TypeScript CLI layout.

---

## 12. Resolved decisions

> **Where the records live.** This table holds the decisions taken in
> conversation. Some Q ids were raised and closed inside the spec set
> instead, and are recorded there rather than here: **Q-13, Q-15** in
> `v1.0/LintelHarnessSpecification-1.0.md`; **Q-18…Q-27** in
> `v1.0/F1-spec-pack-format-and-manifest.md` (closed by `F1-ADR-001`);
> **Q-35, Q-37** closed by the cross-document consistency pass.
> **Q-30, Q-31, Q-32, Q-34, Q-36** were only ever "open with a stated
> default" — the default was adopted in practice but never formally
> closed anywhere. They should be closed explicitly before
> implementation; Q-36 in particular is contradicted by §11 step 4,
> which shipped a brief template.

| # | Decision | Date | Rationale |
|---|---|---|---|
| Q-2 | **Packs live in `packs/` in this repo, published with the CLI.** `template/` becomes `packs/coding/`; the writing template is extracted to `packs/writing/`. Packs bundle into the published package, so `npx` needs no network fetch. | 2026-08-30 | One maintainer, two packs. A monorepo makes a CLI feature and the pack change that needs it a single atomic commit and a single release, and removes the CLI↔pack version-compatibility problem entirely. Independent pack versioning does not require repo separation — it lives in the manifest (Q-3). Revisit only if third-party packs become real. |
| Q-3 | **Per-pack semver plus a separate CLI semver.** Each pack declares its version in `packs/<name>/pack.json` and a minimum CLI version; the CLI is versioned as the published package. The manifest records both. | 2026-08-30 | Makes `lintel harness update` precise — "you applied coding@1.2.0, latest is coding@1.4.0" — with per-pack changelogs, and keeps a writing-only project from being told it is stale because the coding pack moved. Satisfies R1 (adding a pack never touches the core). A rolling, unversioned CLI was rejected: a CLI behaviour change could silently reinterpret an old manifest with no version to pin. |
| Q-4 | **Packs are standalone but may share by explicit reference.** A `shared/` tree sits alongside `packs/`; each pack lists the shared files it pulls in via `pack.json`. Nothing is inherited implicitly. **Rule:** changing a shared file requires bumping every pack that references it — the CLI should enforce or at least warn on this. First and clearest candidate: the targets way-of-working, which is domain-agnostic. | 2026-08-30 | R2's stated intent ("shared by explicit reference, not by accident"). Investigation showed the two packs overlap in *names* far more than *content* — their `researcher` agents and `conventions.md` files are genuinely different documents — so a shared base (rejected) would have coupled pack versions for almost no real reuse. Explicit reference fixes the one true duplicate without that coupling. |
| Q-5 | **`lintel harness contribute` emits a patch against the pack.** It diffs an applied copy against the pack version recorded in its manifest and produces a patch or branch against `packs/<name>/`. | 2026-08-30 | Closes G4's loop, and is cheap: it reuses the drift engine `lintel harness status` already needs for S4 — the same comparison pointed the other way. Works from any project on the machine without opening this repo, so an improvement found in a writing project doesn't depend on remembering it later. |
| Q-6 | **Cross-pollination is deferred out of v1.0** to the first post-v1.0 pack bump (`coding@1.1` / `writing@1.1`): writing gains the targets contract by referencing `shared/`, coding gains routing and parallelization rules. v1.0 migrates both packs **faithfully**. | 2026-08-30 | Two reasons. S6 stays verifiable — if pack content changes during migration, a difference cannot be attributed to a migration bug versus an intentional improvement. And the deferred bump becomes the first genuine acceptance test of `lintel harness update` (S3): a real pack version flowing into already-applied projects, rather than a synthetic one. |
| Q-7 | **The CLI generates `CLAUDE.md` with marked regions.** Pack-owned regions (spec process, agents, conventions, targets) are maintained by `lintel harness update`; the surrounding project-owned prose is never touched. | 2026-08-30 | G1 ("zero manual edits") is not true if the highest-value agent-onboarding file is left hand-written, but a fully managed CLAUDE.md would conflict on nearly every update since it is the most project-edited file in any repo. The seam is evidence-backed, not guessed: this repo's own CLAUDE.md already divides cleanly into pack-derived sections and project-owned ones. **May also answer Q-10** — see that row. |
| Q-8 | **Two backend scaffolds at v1.0:** the existing Azure SWA + Neon, plus one alternative (choice recorded in Q-8a). Scaffold selection is general, composable and opt-in — `lintel harness init coding --scaffold backend,frontend`. | 2026-08-30 | A second implementation *proves* the scaffold interface is general rather than asserting it — the same argument that makes two packs a better test of the pack format than one. Applying the pack to this repo already showed scaffolds must be optional: the backend was skipped entirely because the harness has none. Accepted cost: this is pack-content work inside a release Q-6 otherwise reserved for the generator. |
| Q-8a | **The second backend scaffold is AWS (Lambda + CDK).** | 2026-08-30 | Chosen for reach: the widest applicability if a project must land on AWS, and CDK is a genuine IaC alternative to Bicep. **Residual risk, accepted:** both scaffolds are then declarative-IaC in shape, so the scaffold interface could still bake in IaC assumptions that a platform-CLI target (Vercel, Fly) would break. Mitigation — during the spec, paper-check the interface against one non-IaC target without authoring it. It is also the heaviest of the four candidates to author and test; treat that as v1.0 scope risk. |
| Q-9 | **Ship three packs at v1.0**: coding, writing, and a planning / product-direction pack. | 2026-08-30 | Generality proven by construction rather than argued. Two packs by one author risk a format overfit to shared habits; a third built against the same core is the real test of R1. |
| Q-9a | **Pack 3 is a planning / product-direction pack** — product discovery extended with roadmap planning, version specifications and roadmap process outlines. Working title only; **framing is deliberately not settled** and needs research first (Q-11). | 2026-08-30 | Discovery alone rhymes too closely with the writing pack's gather-synthesise-decide shape. Adding roadmap and version-planning gives it a distinct spine and covers real recurring work that neither existing pack owns. Framing deferred rather than guessed — the spine determines the phases, artifacts and roles, so getting it wrong is expensive. |
| Q-9b | **Presentation is not a pack — it is a cross-cutting capability baked into every pack**, living in `shared/` and referenced by all three (Q-4's mechanism). | 2026-08-30 | Presenting completed work is universally useful, so scoping it to one pack would deny it to the others; and its output format differs while its process does not, which made it a weak test of pack-level generality anyway. As a shared component it reaches every pack at once. Note the Q-4 rule applies: changing it bumps every referencing pack. |
| Q-10 | **Marked regions everywhere.** `source-only` blocks are stripped when a file is applied; `applied-only` blocks are included only on apply. The same delimiter mechanism Q-7 chose for `CLAUDE.md`, generalised to any pack file. A whole-file mode in the manifest remains as the degenerate case. | 2026-08-30 | One concept instead of two, and it is the only option that expresses what actually happened: both stale READMEs were needed in the applied copy *with different content inside them*, so a whole-file mode could not have described the case, and parallel `README.pack.md` / `README.applied.md` files would reintroduce the drift this product exists to prevent. |
| Q-11 | **The `planning` pack is framed as portfolio and roadmap management as a decision loop** — `intake → discovery → prioritize → commit → deliver → learn`, with a non-delegable absorption/security gate between deliver and learn, and horizon-setting as a first-class step inside commit. Calibrated at init by constraint floor. The **portfolio-roadmap-deck** workstream is the **knowledge base** the pack is authored from — mined for content, with no runtime or process dependency on it. | 2026-08-30 | The spine is evidenced research output rather than a process invented to fill a template: the loop, the gate, the four-determinant horizon framework, three drafted templates and two calibration poles all already exist. Rejected alternatives: *product discovery* (one phase of six, and its gather→synthesise→decide shape rhymes with the writing pack, testing generality weakly), *roadmap/version planning* (an add-on to `coding` rather than a peer), *portfolio governance/PMO* (built on the corpus's weakest, vendor-dominated evidence). Full working: `v1.0/research-planning-pack-framing.md`. |
| Q-12 | **A project holds exactly one pack.** A user who needs two ways of working runs two projects side by side. | 2026-08-30 | Keeps the manifest, `CLAUDE.md` region ownership and `update` semantics single-owner, so no composition mechanism is needed in v1.0. Removes the file-collision and region-conflict class of problems entirely rather than solving it. |
| Q-14 | **`lintel harness init --adopt` ships at v1.0.** It hashes an existing hand-applied tree against the pack, writes a manifest, and seeds `.harness/base/` from the pack's rendered output for the recorded version. | 2026-08-31 | S7 makes "produced by the tool" a release gate, and no other option meets it without discarding work. Re-init would require `packs/coding` to reproduce this repo's two deliberate README rewrites byte-for-byte, or delete them — and those rewrites are arguably improvements the pack should absorb. Under adopt they surface as drift and flow back via `lintel harness contribute` (Q-5). The seeded base is the pack's rendered output, which is the semantically correct merge base ("what the pack said" vs "what you have"), even though those exact bytes never sat on disk here. |
| Q-16 | **Published as `@lintel/harness`; binary `lintel-harness`; Node >= 22.** **Amended by Q-63** (2026-09-01): the package is `@lintel/cli`, the binary is `lintel`, and `harness` becomes a command group. The original terms are kept verbatim here because Q-63 amends this decision rather than replacing it, and Q-63's reasoning quotes this row. | 2026-08-31 | The binary matches the package name exactly, so there is nothing to remember and no PATH collision — `harness` alone is generic enough that a global install could not reliably claim it. Node floor corrected from the ADR's assumed >= 20: Node 20 left LTS maintenance in April 2026, so 22 is the current LTS line. |
| Q-17 | **Three scaffolds at v1.0: `backend-azure`, `backend-aws`, `writing-workstream`.** `frontend` and `app` defer to v1.1. | 2026-08-31 | Resolves the master-spec/F5 contradiction by taking each document's better-evidenced half: `writing-workstream` stays (F5's US-18/US-25 depend on it, and it already exists as an extraction needing no authoring), while `frontend` and `app` defer (both would be authored from nothing, in a release Q-6 reserved for the generator). Keeps Q-8's second backend implementation, which is what proves the scaffold interface general rather than merely asserted; only `backend-aws` needs authoring. |
| Q-38 | **A pack's document templates are copied into the applied project**, as today. | 2026-08-31 | Consistent with Q-7's managed-apply rationale: everything local, visible and editable, and a project readable without the CLI. The duplication is real — dogfooding showed 16 copied files, 12 byte-identical — but the merge cost is not: a file with no drift is replaced silently on update, so identical copies never produce conflicts. The cost is repo noise, accepted deliberately in exchange for self-describing projects. |
| Q-28 | **`shared/presentation` defers to v1.1.** Q-9b's decision stands — presentation is a shared capability, not a pack — but the component ships later and **no pack references it at v1.0**. | 2026-08-31 | F5 could not source its contents at all; shipping an unspecified component is worse than shipping none, and Q-6 reserves v1.0 for the generator rather than pack content. Deferring also removes disproportionate blast radius: under Q-4 every change to a component referenced by all three packs bumps all three, which is a poor trade for something undefined. The portfolio-roadmap deck remains its best worked example when it is authored. |
| Q-29 | **No violation — Q-6's scope is clarified, not changed.** Q-6 constrains *changing existing* packs; it does not restrict *adding* one. `coding` and `writing` migrate faithfully; `planning` is net-new authoring, approved by Q-9. | 2026-08-31 | Q-6 exists to keep S6 verifiable — if content changes during a migration you cannot separate a migration bug from an intentional improvement. A net-new pack has no faithful baseline to violate, so the harm Q-6 guards against cannot arise. Recorded as a scope clarification so the apparent conflict does not resurface. |
| Q-33 | **Deferred: the dogfooding site for `packs/planning` is chosen once the pack is authored**, not now. | 2026-08-31 | Avoids committing a project to a pack whose shape is still abstract. **Recorded risk:** the coding pack's own history shows a pack is only as good as the work it has actually carried, so authoring `planning` against no real use is the failure mode here. Revisit at the point the pack is authored, not after it ships. Candidates surfaced: the Lintel product portfolio (exercises the near-zero-floor calibration), the RAFAL build-or-shelve decision (exercises the bet brief and horizon framework), the consultancy diagnostic (would exercise the high-floor calibration). |
| Q-39 | **Applying a pack is two phases.** *Phase 1* is a verbatim "dumb" copy of the pack folder into `.harness/pack/` — no transformation, no substitution, no renames, identical for every pack. *Phase 2* is the pack-specific application that copies out agents, commands, `CLAUDE.md`, the agent teams and `Run.md`, rewrites paths, and wires the project up to run. | 2026-08-31 | Matches what the manual apply actually did: steps 1–5 of `CLAUDE.md` §Dogfooding were a dumb copy, steps 6–9 were the tie-up. The single-phase model treated the second half as awkward exceptions to the first. Splitting them makes the generic half generic and the varying half explicitly per-pack. |
| Q-40 | **Phase 2 is a declarative recipe over a fixed primitive set** (**six**, as amended 2026-08-31 by Q-54: `copy`, `rename`, `strip-suffix`, `rewrite-path`, `substitute`, `generate` — the row as first written listed a seventh, `merge-json`, which is dropped), not an arbitrary script. It is **applied automatically by the CLI**, never by the user. The recipe is a pure function of **(payload, parameter answers, scaffold selection)** — no timestamps, no ordering dependence, no environment reads — so the applied tree is reproducible and verifiable. *(The row as first written named two inputs and omitted scaffold selection, which is false of any `--scaffold` apply; corrected 2026-08-31 per finding C-46. This row is the source later documents restated, so the two-input form had propagated.)* **Amended 2026-08-31:** this claim is the source later documents restated and drifted from. With `merge-json` dropped (Q-54) it is **true without exception** — that primitive was the only one taking a fourth input, the pre-existing content of its destination. | 2026-08-31 | A real script makes a pack *code that executes on the user's machine*, which would void the entire security architecture: path confinement and the reserved-destination denylist depend on the apply plan being inspectable **before** anything runs (the consent gate named here went with `merge-json` — Q-54). A recipe keeps per-pack variation while staying validatable, and determinism is what makes "applied correctly every time" a testable property rather than a hope. |
| Q-41 | **Phase 2 reads from the phase-1 copy in the project**, not from the bundled pack. The user cannot adjust the payload before phase 2 runs at v1.0. **Amended 2026-08-31:** this fixes the *authoritative tree*, not the *moment of the read*. Its ambiguity produced re-review finding F-5. Settled by ADR §3.6: phase 2 renders entirely at **plan time** from planner-resolved bytes and reads nothing from disk during execution, which is what makes the second sentence true. | 2026-08-31 | One source of truth for an apply, and it makes the applied result a function of what is on disk in the project. Deferring user-editable payload keeps v1.0 honest about determinism. |
| Q-42 | **`update`, `status` and `contribute` are deferred to v1.1.** F3 and F4 leave v1.0. **G3, S3 and R4 defer with them**, and **S7 weakens** to "this repo is produced by `lintel harness init coding`" — apply only. | 2026-08-31 | Get apply correct first. **Recorded consequence, deliberately accepted:** the brief opens by arguing copy-paste fails *because it cannot be updated*, and §7 chose managed apply to solve exactly that. v1.0 now answers only the first half of that problem. The manifest (Q-43) is what keeps v1.1 a addition rather than a retrofit. |
| Q-43 | **A minimal manifest ships at v1.0**: pack name, pack version, CLI version, parameter answers, chosen scaffolds. **No per-file hash list, and no `.harness/base/` store.** | 2026-08-31 | With the pack local at `.harness/pack/` and a deterministic recipe (Q-40), the expected applied state is always recomputable from payload + recipe + recorded answers — so neither a hash list nor a cached base is needed to reconstruct it. `.harness/base/` existed only because a hash cannot be a merge base and the old pack version might be unavailable; under Q-39 neither holds. Removes the base store, its `.gitattributes` problem, the text-only restriction, and every condition attached to it. |
| Q-44 | **`lintel harness init --adopt` is dropped. Supersedes Q-14.** | 2026-08-31 | Adopt existed so a hand-applied repo could become manifest-tracked *and therefore updatable*; with Q-42 deferring update, status and contribute, it buys only bookkeeping. For this repo it is also unnecessary: under Q-46 the four diverged applied files cease to exist, so a clean `init` loses nothing. |
| Q-45 | **Marked regions are not implemented at v1.0.** The generated `CLAUDE.md` emits **inert region anchors** for v1.1's `update` to find, but no region parser, region hashes, malformed-marker diagnostics or `E-REGION-TAMPERED` ship. **Amends Q-7 and Q-10.** | 2026-08-31 | Regions had two justifications and Q-39/Q-42 removed both: `update` was their consumer, and the source-only/applied-copy problem dissolved once phase 1 copies verbatim and rewrites nothing. Anchors are near-free now and expensive to retrofit, so they ship as forward investment. The single largest simplification in this pass. |
| Q-46 | **Manual bootstrap prose is deleted from the pack sources**, because the recipe encodes it. The "copy this folder", "rename the template", "fix the paths" and "adopting this in a new project" sections come out of `packs/coding/**` entirely. **Supersedes Q-38 and closes the four diverged applied files.** | 2026-08-31 | Once the recipe runs automatically (Q-40), those instructions describe a manual procedure nobody will ever perform — dead content, not stale content. The four files that diverged on apply differed *only* in that prose, so they are not rewritten per project; the sections are removed from the pack and the applied copies cease to exist. The 9-step manual-apply log in `CLAUDE.md` §Dogfooding **is** the coding pack's recipe. |
| Q-47 | **A pack's document templates and reference docs stay in the payload.** They live in `.harness/pack/` and are **not** copied into the project tree. **Properly supersedes Q-38**, whose answer ("keep copying them") is reversed. | 2026-08-31 | Direct instruction: *"all templates must be in the templates folder."* Under Q-39 the payload **is** that folder and it sits inside the project, so a project still has every template locally, browsable and offline — which was Q-38's entire rationale — without a second copy the tool must then keep in step. Q-46 was recorded as superseding Q-38 but its text is about deleting bootstrap prose, which is a different thing; this row states the actual supersession. |
| Q-48 | **The `shared/` mechanism does not ship at v1.0.** No `shared` array, no `component.json`, no digest pin, no bump rule, no CI enforcement — confirming what F1 already wrote. `targets` ships as `coding`-local content. Deferred to v1.1 alongside `shared/presentation` (Q-28). | 2026-08-31 | With `presentation` deferred, `shared/` had one consumer, which is indistinguishable from pack-local content — machinery, plus its enforcement, with nothing to enforce against. The whole sharing story now lands together in v1.1 when there is something real to share. F1's retired **US-7 stays retired**; if v1.1 restores the mechanism it takes a new id. |
| Q-49 | **`planning` ships its own copy of the targets contract**, tuned to bets rather than code. Its part 9 stays `present`; F5's US-27 absorption-gate ABORT keeps a vehicle. | 2026-08-31 | Follows from Q-48: with no `shared/` at v1.0 there is nothing to reference. **Accepted cost, recorded:** two copies of the same way of working now exist and will drift before v1.1 can reconcile them — the exact duplication Q-4 was written to prevent. v1.1's `shared/` work must treat merging them as a named task, not discover it. |
| Q-50 | **Every folder an apply creates carries a README** — `README.md` for `coding` and `planning`, `index.md` for `writing` (its existing Obsidian convention, paired with `Home.md`). **`.claude/` and `.harness/` are excluded** — both tool-owned. (`.harness/` added 2026-08-31: `applied-readmes/harness.md` targeted `.harness/README.md`, which C-5 forbids absolutely, since `.harness/pack/` is phase 2's *input* and a step writing there could rewrite its own source mid-run. `.harness/` is more tool-owned than `.claude/` — users edit agent files but must never edit the payload — so it is excluded on the same reasoning rather than given a carve-out.) **This dissolves the empty-directory problem rather than solving it**: no folder is ever empty, so no `mkdir` primitive and no `.gitkeep` artefacts are needed. | 2026-08-31 | The placeholder becomes useful content — a newcomer opening any folder learns what belongs there and what does not. It also removed the sharper objection to F1's `skeleton/` answer: git cannot commit an empty directory, so a skeleton tree would have needed placeholder files anyway, landing visible artefacts in every project for no reader benefit. Counts: **5 new for `coding`** (`AgentTeams/`, `specifications/general/`, `specifications/v1.0/`, `targets/`, `copy/` — `specifications/` and `infrastructure/backend-deploy/` already have one; `.harness/` excluded), **3 for `planning`** (`portfolio/`, `portfolio/bets/`, `targets/` — the third is a consequence of Q-49 that this count originally missed), **0 for `writing`** (already has the convention). |
| Q-51 | **The `writing` extraction may author the `index` and `home` templates the source lacks**, recorded explicitly as **recipe scaffolding rather than content**. | 2026-08-31 | The pack's applied tree requires an `index.md` in every folder and a `Home.md` map-of-content; without templates the recipe cannot render either, so the extraction would ship a convention it cannot execute. Scoped narrowly: two templates the recipe needs, not an improvement to the pack's substance. Everything else stays faithful — one `post-template.md`, and the four-file guide under its existing names (Q-6). |
| Q-52 | **The manifest records a payload digest** — one hash over the `.harness/pack/` tree. **Amends Q-43**, which removed `pack.integrity`; this is a single tree digest, not the per-file hash list Q-43 rejected. | 2026-08-31 | Without it, recomputation silently *trusts* the payload: someone edits `.harness/pack/`, and `verify` reports the project clean because the recipe faithfully reproduces the edited input. The digest lets `verify` say which side moved. Cheap now — one field, one tree walk — and it is the first thing v1.1's `update` would otherwise have to add, since merging against an unverified payload is precisely C-11's concern. **Determinism is unaffected**: the digest is a pure function of the payload, so two applies of the same pack still produce byte-identical projects. |
| Q-53 | **F1 owns `lintel harness verify`.** | 2026-08-31 | F1 already owns `validate` (is this pack well-formed?) and `pack info` (what does this pack contain?); `verify` (does this project still match what the recipe would produce?) is the same class of read-only question over the same machinery, and F1 defines the recomputation identity that answers it. Keeps all three read-only commands in one feature and leaves F2 owning only the apply. The master spec's v1.0 command list must include it. |
| Q-54 | **`merge-json` is dropped from v1.0.** Six primitives, not seven. `.claude/settings.json` is written by nothing; no pack ships a default permission set. The ownable-key allowlist, the destination policy, the leaf-only rule, the consent gate, the security disclosure and their error families are removed rather than repaired. Deferred to v1.1 with the rest of the settings story. | 2026-08-31 | Same reasoning as Q-48: once F5's three invalid settings steps were deleted — they name no `from`, no owned keys, and no pack payload holds a settings source — `merge-json` had **no v1.0 consumer**, while carrying the format's largest attack surface. It was the target of both CRITICALs in the Mode A re-review, both lapses of C-16, and the newly found rollback bug. Deleting the surface is a stronger fix than repairing it. **Bonus:** `merge-json` was the only primitive taking a fourth input (the destination's pre-existing content), so removing it makes `verify`'s recomputation identity and the determinism NFR true as originally written — F-4 resolves without a change. R5's "sensible default permissions" waits for v1.1. |
| Q-55 | **`writing`'s recipe generates `writing-guide/index.md`.** That folder therefore carries both the migrated `README.md` and a generated `index.md`. | 2026-08-31 | Surfaced by the final security fold: `writing` declares `folderReadme: "index.md"`, but `writing-guide/` migrates with its four source files verbatim, one of which is `README.md` — so `validate` step 12 raised `W-FOLDER-README-MISSING`, **fatal under `--strict`**, against G5.11's requirement that `validate --all --strict` exits 0 over the bundled packs. The pack as specified failed its own CI criterion. Resolved from decisions already taken rather than by a new exception: Q-51 permits the extraction to author `index` templates as recipe scaffolding, and the two files were already recorded as doing different jobs — the migrated README explains how the guide is used, the index is the folder's table of contents. **Rejected:** a scoped exception for that folder, which would put a hole in a rule whose value is that it has none. |
| Q-57 | **The primary setup experience is conversational, with the CLI underneath.** The user asks Claude to set up a project; the F6 skill gathers intent, invokes `lintel harness init`, and then performs the judgment work the CLI cannot — filling the tone-of-voice guide, adapting the generated `CLAUDE.md`, redrawing file-ownership tables. **The CLI remains fully usable standalone**, so CI and non-Claude-Code use are unaffected. | 2026-08-31 | Follows Q-1's split rather than reopening it: deterministic mechanics in the CLI, judgment in the skill. Every target project is already an agentic one, so the conversational path is the native one. **Design burden this creates, recorded:** the skill must surface `init`'s pre-write disclosure **faithfully rather than summarising it** — an LLM intermediary is exactly where summarising is tempting and exactly where it destroys the disclosure's value. C-2's enumeration is only worth something if a human reads what is actually being granted. **This makes Q-56 load-bearing rather than incidental** — under a conversational-primary flow the skill always runs, so `CLAUDE.md` is always adapted. |
| Q-58 | **The `writing` extraction corrects `outliner.md`, `writer.md` and `critic.md` to write into the per-workstream stage folders**, and the correction is recorded as an enumerated declared-difference class — exactly three files, named. *(Amended 2026-08-31: `critic.md` has the same defect, writing to a retired top-level `/reviews/`, and was missed when this was first recorded. Also recorded then as resolved while the edit had not actually been made; applied 2026-08-31.)* **Three further departures approved with it:** de-personalisation via declared parameters (F5's G5.5/US-25 require it, and "verbatim" and "no personal names" cannot both hold); no `applied-readmes/` for this pack (F5 says so in three places — the drafting brief was wrong); and one `substitute` step F5's recipe table omits, without which `Home.md` ships unresolved tokens and fails `E-SUBST-UNRESOLVED`. | 2026-08-31 | The two agents contradict **their own project's `CLAUDE.md`**, which states the top-level `/outlines/` and `/drafts/` are retired in favour of `workstreams/<name>/`. So this is **not an improvement to the source — it is a correction to the source's own stated convention**, which is the distinction Q-6 actually guards. Q-6 exists to keep S6 verifiable by preventing content change from masking migration bugs; migrating a prompt that writes outside the scaffold the same pack creates would ship a non-functional pack and verify nothing. Enumerated by file so the migration check compares against a list rather than a judgement, per the pattern already used for the other classes. |
| Q-59 | **The `coding` migration generalises `securityreviewer.md`'s security references.** Hardcoded `reference/thoughtpartner/reference/*.md` paths and requirement IDs R-27/R-28/R-29 become project-relative. Recorded as a declared difference class, enumerated to one file. | 2026-08-31 | Same reasoning as Q-58, one pack over: those paths dangle in every project except the one they came from, and the prompt told the agent they were *"the baseline every feature is measured against"* — so a fresh project would get a security-gate agent measuring against four files that do not exist. A correction to what the pack needs in order to function, not an improvement to it. **Related, and already applied:** the link-integrity pass repointed five further files (`target-reviewer.md`, `designer.md`, `specwriter.md`, `Specify.md`, `CLAUDE.md.template`) that referenced payload-only content and would have raised `W-LINK-DANGLING`. |
| Q-60 | **Diagnostics split into `defect` and `notice`.** Every code is classified once, in F1's catalogue: a **defect** is author-fixable (a missing folder README, a dangling link); a **notice** reports a declared state the pack intends (a `provisional` anatomy part, an inert hook script). **`--strict` promotes defects only**; notices always print and are never fatal. **`provenance` is defined in F1** as an optional declared `pack.json` field, so it stops being an unknown key. | 2026-08-31 | `validate --all --strict` could not exit 0 for two of three packs, and the reasons were *deliberate design decisions* — planning's part 2 is provisional because the research says the role set is genuinely unwritten, and its guard script is inert precisely because no pack may register a hook. One severity was doing two jobs: reporting an intentional state, and flagging something to fix. **Rejected alternatives:** a named promote-list (denylist-shaped, and a newly added warning would default to un-promoted — silent and fail-open, the failure mode this project has already been bitten by twice); per-pack declared exceptions (lets a pack silence its own warnings, inverting who the check is for); and dropping the exit-0 requirement (a genuinely missing README or dangling link would then pass CI, which is what the check exists to catch). |
| Q-56 | **`verify` gains an `adapted` per-path state.** A recipe step may declare its output **adapt-expected**; `verify` reports those paths as `adapted` rather than `differs`, and `adapted` is not a failure. Only an *unexpected* change reports `differs`. The generated `CLAUDE.md` is adapt-expected in all three packs. | 2026-08-31 | Same conflation Q-60 fixed, one layer over: `differs` was reporting both *someone changed this* and *this was supposed to change*. S7's gate requires a green `verify`; F6's stated job is adapting `CLAUDE.md`'s project-owned prose; and Q-57 makes the skill the normal path, so the two could never both hold. **The manifest is unchanged** — the adapt-expected set is recomputable from the local payload and recipe, so Q-43's minimal manifest survives. **Rejected:** verifying before the skill runs (tests a state that exists for seconds and no real project is ever in); deferring F6's adaptation to v1.1 (that adaptation is exactly the judgment work Q-1 created the skill for); and making only `missing` fail (removes most of what `verify` is for, since the payload digest already covers the rest). |
| Q-61 | **All three packs `generate` their `CLAUDE.md`.** F1 US-32's claim that `coding`'s is the only `generate` step in v1.0 is wrong and is corrected. | 2026-08-31 | `generate` is what emits the inert region anchors Q-45 requires and US-38 asserts for **every** pack — `writing` has six, `planning` seven, both built. `rename` neither substitutes nor emits anchors, so holding F1's claim would have left two of three packs with no anchors for v1.1's `update` to find. The packs were built per F5, and F5 was right. |
| Q-62 | **`update` ships in v1.0, and it builds no merge engine. Reverses Q-42 for F3.** The CLI recomputes `expected_old` (local `.harness/pack/` payload + its recipe + recorded answers — `verify`'s existing identity) and `expected_new` (the newer bundled payload). Per path: **unedited → replaced outright**, no merge and no conflict markers; **edited → left untouched and reported**; **`adapted` → never blindly replaced**, since being edited is its declared purpose. The **skill then reconciles the edited paths conversationally**. `status` folds into `update`'s read-only mode; **`contribute` stays deferred to v1.1**. **G3, S3 and R4 return to v1.0**, and S7 strengthens to *produced by `init` and maintained by `update`*. | 2026-09-01 | **Q-42's blocker no longer exists.** It deferred `update` because a merge needs a base, and the answer then was `.harness/base/` — a cached-bytes store with a `.gitattributes` problem and its own integrity conditions. Q-39/Q-43 deleted that store precisely because the two-phase model made it unnecessary: the old payload is **local**, the recipe is **deterministic**, so `expected_old` is recomputable exactly. `verify` already performs that recomputation and already classifies each path. **`verify` is most of `update`.** The shape follows from evidence: the dogfooding pass found 12 of 16 applied files byte-identical, so most paths need a replace and nothing more — a merge engine would be built for a small minority. The remainder is judgment, which is what the skill exists for (Q-1) on the path Q-57 made primary. **Accepted cost:** v1.0 grows a feature, and F3 has no spec yet. **Rejected:** a full 3-way merge (most machinery, for the minority case); report-only (leaves the user diffing exactly where help is worth most); and emitting a patch (pushes the hardest judgement — what a pack change means for an edited file — entirely onto the user). |
| Q-63 | **The binary is `lintel`, with `harness` as a command group: `lintel harness init coding`. Amends Q-16.** The published package becomes **`@lintel/cli`**, which provides the `lintel` binary; the harness is its first command group. Node >= 22 unchanged. | 2026-09-01 | Q-16 rejected `lintel` on the grounds that it *"positions the tool as the family entry point rather than one utility — useful if other Lintel CLIs follow, misleading if this stays the only one."* A family is now expected, which reverses that reasoning. One binary on PATH, later tools slot in as `lintel <tool> …` with no new names to claim. Follows git, aws and docker. **Accepted cost:** three words before anything happens, and every usage line in the spec set, every diagnostic message prefix, `E-CLI-UNKNOWN-COMMAND`'s command list and all three packs carry the name. **Deliberately not decided (Q-64):** whether later tools are built into `@lintel/cli` or loaded as plugins. Two packages cannot both own the `lintel` binary, so a second tool forces the choice — but designing a plugin mechanism for hypothetical siblings is exactly the speculation Q-42 and Q-48 were right to refuse. Revisit when a second tool exists. |
| Q-79 | **A distinct ship-to-be-filled state, separate from `adaptExpected`.** A recipe step may declare its output as shipped-to-be-filled; `verify` reports such a path in its own state rather than folding it into `adapted` or `differs`, and neither state is a failure. **`update` must never overwrite a filled one.** Exact flag name and state name are F1's to settle. | 2026-09-01 | A filled `project-brief.md` and an adapted `CLAUDE.md` are genuinely different situations, and the report should say which: one is the user doing the thing the pack asked of them, the other is the skill doing its job. Folding both into `adapted` would have been cheaper but would have made the report less informative than the tool already knows how to be. **Fixes two faults, not one:** `verify` exited 1 on any real project, making **S7 unreachable** — it passed only because nobody had filled the brief; and `update` would have replaced a filled brief with a fresh template. **Rejected:** marking them `adaptExpected` (loses the distinction); restating S7 to exclude them (a conditional gate stops meaning anything, and leaves the `update` bug). |
| Q-81 | **U-14 ratified: zero runtime dependencies, and `collisionKey` narrows to NFC plus ASCII case-folding.** Strict JSON, schema validation, glob, semver, the frontmatter reader and the test runner are all hand-rolled or stdlib (`node:test` ships with Node 22). The Unicode-folding claim is **narrowed and the limit documented** rather than claimed and implemented wrongly. | 2026-09-01 | The product's entire security argument is about what runs with the user's filesystem access; every runtime dependency is code inside that boundary, in a tool whose job is writing into a user's repository. Most of the register was hand-rollable anyway — semver needs no range arithmetic, glob runs over a known path set with no filesystem handle, the schemas are closed enumerations. **Unicode case folding was the one real risk**, and the honest resolution is to narrow the claim: full folding is neither in the stdlib nor safe to approximate, and a stated limit on `collisionKey` beats a silent approximation inside a security control. **Closes register entries U-1, U-2, U-3, U-4, U-6, U-8, U-10 and U-14**, and unblocks eight of F1's fourteen blocked tasks. |
| Q-80 | **US-24's difference enumeration widens to admit what the migration actually did**, each class enumerated by file: payload-side path repointing, parameter-token insertion into migrated content, region anchors, net-new authoring beyond class (b), and Q-59's `securityreviewer` generalisation. | 2026-09-01 | Reverting was not available: the region anchors and parameter tokens the old enumeration failed to admit are **required by F1**, so `coding` cannot both satisfy the format and fit the enumeration as written. Widening keeps the check meaningful — it still compares against a list rather than a judgement, which is the property that makes it worth running. **Rejected:** retiring the invariant (nothing would then catch an unintended divergence, and S6 loses its verification) and re-baselining to the current tree (cuts the link to the source, so "what changed during migration" becomes answerable only from git). **F5's ADR-002 remains `REVISE SPEC`** — this resolves its opened question, not its other findings. |
| Q-1 | **The harness is a CLI engine plus a thin Claude Code skill.** A Node/TypeScript CLI owns the deterministic mechanics — manifest, per-file hashing, drift detection, 3-way merge. A thin skill drives the CLI and handles the judgment steps: filling placeholders, adapting the generated `CLAUDE.md`, redrawing file-ownership tables for the actual layout. **Build the CLI first** — the manifest/merge is the load-bearing risk; the skill is a wrapper added on top. | 2026-08-30 | R4 needs determinism: hashing, drift and merge must be computed facts, not agent judgment, or S3/S4 vary run to run. But applying a pack is not purely mechanical — the placeholder and ownership-table work is genuine judgment a CLI could only stub out. Splitting on that seam puts each half where it is strongest. |
