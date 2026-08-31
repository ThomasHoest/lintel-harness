# Lintel Harness Specification — v1.0
**Version:** 1.0.0
**Status:** Draft
**Date:** 2026-08-30
**Platform:** Node.js + TypeScript CLI published to npm and invoked as `harness` / `npx harness`, plus a thin Claude Code skill under `.claude/skills/`. Packs are plain files bundled into the published package — no network fetch at init. Node LTS floor not yet fixed (Q-16).
**References:** `specifications/project-brief.md` (Draft, 2026-08-30) · `CLAUDE.md` · `specifications/v1.0/research-planning-pack-framing.md` · `specifications/conventions.md` · `specifications/README.md`

**Amendment history**

| Version | Date | Summary |
|---|---|---|
| 1.0.0 | 2026-08-30 | Initial draft. Establishes v1.0 as the generator release: pack format and manifest, the three CLI commands, three template packs plus a shared tree, and the Claude Code skill that supplies the judgment the CLI cannot. |
| 1.0.0 | 2026-08-30 | Cross-document consistency pass across this spec, F1 and F5. Three duplicate questions collapsed (Q-13, Q-14, Q-17); remaining questions renumbered to unique project-wide ids (F1 → Q-18…Q-26, F5 → Q-27…Q-37); F5's user-story block renumbered to US-17…US-28; Q-35 and Q-37 closed. The Open Questions table becomes the project's single index. No new design decisions, no new content. |
| 1.0.0 | 2026-08-30 | **ADR-001 amendment pass.** Folds `F1-ADR-001-pack-format-and-manifest.md` (verdict `PROCEED`) into the document set. **Q-13 closes YES** — the format expresses content varying by an init answer via `when` + `if` + substitution, with no new grammar. **Q-15 closes** — F1 owns both the logic and the surface (`harness validate --all`); **this amends this spec's previously stated default that F4 would expose it as a maintainer subcommand**, and F4 gains nothing. Q-18…Q-27 close in F1. Q-14, Q-16, Q-17, Q-28, Q-29 and Q-33 are escalated to Thomas by the ADR's §6.1 and stay open. F1 gains US-29 (`harness pack info`); the counter table moves to US-29 last used. The Open Questions index is updated to match. |

---

## Introduction

v1.0 turns a folder that gets copied into a product that gets applied.
Today the agentic-project scaffolding this repo owns — agent roles,
agent teams, the gated spec process and its document templates,
behavioural guidelines, folder shapes, and the automations that run
them — ships as `template/`, a directory people copy and hand-edit.
That is fast once and unmaintainable forever: applying it is manual
enough that the existing targets README contains a literal step *"fix
the paths"*, and once applied, the copy is a fork that no later
improvement can reach.

The headline change is the **managed apply**. A CLI writes real files
into the target project — everything local, everything editable — and
records a manifest: pack name, pack version, CLI version, and a hash
per generated file. Because the apply is recorded rather than
remembered, a later `harness update` can be *computed*: files untouched
since apply are replaced silently, files the project has edited get a
three-way merge against the new pack version, and drift becomes a
report instead of a suspicion. The same comparison pointed the other
way gives `harness contribute`, so an improvement discovered in project
N has a route back into the pack.

The work splits on a seam that is a decision, not an accident (Q-1). A
**Node/TypeScript CLI** owns everything that must be deterministic —
manifest, hashing, drift detection, three-way merge — because R4 fails
outright if those vary run to run. A **thin Claude Code skill** owns
the parts that are genuinely judgment: filling placeholders from the
actual repo, adapting the generated `CLAUDE.md` prose around its
pack-owned regions, redrawing file-ownership tables against the real
layout. The CLI is built first; the skill is a wrapper added on top.

**v1.0 is the generator, not the pack content** (Q-6). Three packs ship
— `coding`, `writing`, `planning` — but the two existing ones migrate
*faithfully*. Cross-pollinating them (writing gains the targets
contract; coding gains routing and parallelization rules) is deliberately
held back to the first post-v1.0 bump, for two reasons: it keeps S6
verifiable, since a post-migration difference can then only be a
migration bug; and it makes that bump the first genuine acceptance test
of `harness update` on a real pack version rather than a synthetic one.

The release gate is dogfooding. **S7 / G7: this repo must itself be
produced by `harness init coding` + `harness update`, with no
hand-applied files left. Until that holds, v1.0 has not shipped.** The
`specifications/`, `AgentTeams/`, `targets/` and `copy/` folders here
were applied by hand exactly as a user would, and the log of what that
cost — in `CLAUDE.md` §Dogfooding, *"What the manual apply actually
required"* — is not a retrospective. It is the requirement list for F2,
and it is the reason two of this version's load-bearing mechanisms
exist: the source→applied rename and the `*.template.md` filename
transform, which a naive copier gets wrong; and the two READMEs that
describe their own copying and therefore go stale the instant they are
applied, which is what forced marked regions (Q-10).

### Document set for this version

Six features, numbered and sequenced in `CLAUDE.md`. **This pass writes
F1 and F5 only**; F2, F3, F4 and F6 are planned and their spec files do
not yet exist. No design specs are produced for any feature — the
harness has no UI, and `harness status` output formatting is a
non-functional requirement inside F4, not a design surface. The two
version-level `general/` documents (`system-architecture.md`,
`technology-choices.md`) are planned and were gated on F1's ADR fixing
the file plan; `F1-ADR-001` now carries both a file-level plan and the
public interface contract every other feature compiles against, so that
gate is cleared.

### What v1.0 deliberately does *not* change

- **Pack content.** `coding` migrates from `template/` and `writing`
  from `AIImpactOnOrganizationsAndLeadership/` unchanged in substance
  (Q-6). Only packaging changes.
- **The spec process itself.** v1.0 *distributes* the
  `research → spec → design-spec → ADR → epics-and-tasks →
  implementation` chain; it does not redesign it.
- **The agent runtime.** Claude Code's `.claude/` conventions are the
  only supported target. No runtime abstraction layer.
- **Composition.** A project holds exactly one pack (Q-12). Nothing in
  the manifest, `CLAUDE.md` region ownership or `update` supports two,
  by design.
- **Distribution shape.** Local files plus git. No registry, no hosted
  service, no network fetch at init.

---

## Technical Context

Cross-feature decisions only. Per-feature decisions belong in each
feature spec. Every row here is settled — see Resolved Decisions for
the source and rationale.

| Decision | Choice | Rationale |
|---|---|---|
| Execution split | Node/TypeScript CLI owns the deterministic mechanics (manifest, per-file hashing, drift detection, 3-way merge); a thin Claude Code skill owns the judgment steps | Q-1 — R4 needs computed facts, not agent judgment, or S3/S4 vary run to run; but placeholder and ownership-table work is judgment a CLI could only stub |
| Build order across the split | CLI first, skill last | Q-1 — the manifest/merge is the load-bearing risk; the skill is a wrapper |
| Apply model | Managed apply: real files written into the project plus a manifest recording pack, version, and a hash per generated file | Brief §7 — the only model that satisfies both G1 (quick to apply) and G3 (updatable after applying) |
| Pack home and distribution | `packs/` in this repo, bundled into the published package; `template/` becomes `packs/coding/` | Q-2 — a monorepo makes a CLI change and the pack change needing it one atomic commit, and removes the CLI↔pack compatibility problem; bundling means `npx` needs no network |
| Versioning | Per-pack semver in `packs/<name>/pack.json` plus a separate CLI semver; a pack declares a minimum CLI version; the manifest records both | Q-3 — makes update precise ("you applied coding@1.2.0, latest is coding@1.4.0") and stops a writing-only project being told it is stale because coding moved |
| Sharing between packs | Packs are standalone but may reference a `shared/` tree, declared explicitly in `pack.json`. Nothing is inherited implicitly. Changing a shared file bumps every referencing pack | Q-4 — the two packs overlap in *names* far more than *content*, so a shared base would have coupled versions for almost no reuse |
| Shared components at v1.0 | `targets` (the domain-agnostic autonomy contract) and `presentation` | Q-4, Q-9b |
| Presentation | A cross-cutting capability in `shared/`, referenced by every pack — **not** a pack | Q-9b — presenting completed work is universally useful; its output format differs while its process does not, making it a weak test of pack-level generality |
| Source vs applied content | Marked regions everywhere: `source-only` blocks stripped on apply, `applied-only` blocks added on apply. A whole-file mode in the manifest remains as the degenerate case | Q-10 — both stale READMEs were needed in the applied copy *with different content inside them*, which whole-file mode cannot express and parallel `*.pack.md`/`*.applied.md` files would re-drift |
| `CLAUDE.md` generation | Generated with marked regions: pack-owned regions (spec process, agents, conventions, targets) maintained by `update`; surrounding project-owned prose never touched | Q-7 — G1's "zero manual edits" is false if the highest-value onboarding file is hand-written, but a fully managed `CLAUDE.md` would conflict on nearly every update. The seam is evidence-backed: this repo's own `CLAUDE.md` already divides cleanly |
| Pack cardinality | Exactly one pack per project. Two ways of working means two projects side by side | Q-12 — keeps manifest, region ownership and update semantics single-owner; removes the file-collision and region-conflict class of problems rather than solving it |
| Packs at v1.0 | Three: `coding`, `writing`, `planning` | Q-9 — two packs by one author risk a format overfit to shared habits; a third built against the same core is the real test of R1 |
| `planning` pack spine | Portfolio and roadmap management as a decision loop: `intake → discovery → prioritize → commit → deliver → learn`, with a non-delegable absorption/security gate between deliver and learn, and horizon-setting as a first-class step inside commit. Calibrated at init by constraint floor. The portfolio-roadmap-deck workstream is its **knowledge base**, with no runtime or process dependency | Q-11 · `research-planning-pack-framing.md` |
| Pack completeness definition | A pack **is** the nine-part anatomy — process, role set, document templates, conventions, coordination rules, behavioural guidelines, folder scaffolding, skills/automations, autonomy contract — declared in `pack.json` so a missing part is visibly incomplete rather than quietly deficient | Brief §3.3, R2 — both existing templates reduce to the same nine parts; only content differs |
| Scaffolds | Opt-in and composable at init (`harness init coding --scaffold backend,frontend`). Two backend scaffolds at v1.0: the existing Azure SWA + Neon, and AWS Lambda + CDK | Q-8, Q-8a — a second implementation *proves* the scaffold interface is general rather than asserting it; applying the pack to this repo already showed scaffolds must be optional (the backend was skipped entirely) |
| Scaffold interface generality check | During the F1 spec, paper-check the scaffold interface against one non-IaC deploy target (Vercel or Fly) **without authoring it** | Q-8a residual risk, accepted — both v1.0 backends are declarative-IaC in shape, so the interface could bake in IaC assumptions a platform-CLI target would break |
| Contribute-back | `harness contribute` diffs an applied copy against the pack version recorded in its manifest and emits a patch against `packs/<name>/`, from any project on the machine | Q-5 — closes G4's loop and is cheap: it reuses the drift engine `harness status` already needs, pointed the other way |
| Content freeze | Packs migrate faithfully. Cross-pollination and other content improvements land in the first post-v1.0 bump (`coding@1.1` / `writing@1.1`) | Q-6 — keeps S6 verifiable, and makes that bump the first genuine acceptance test of `harness update` on a real pack version |
| Requirements source for the apply engine | The manual-apply log in `CLAUDE.md` §Dogfooding is the requirement list for F2. Every line in it is work the generator must absorb | G7 — manual first, then automate; what the hand apply cost is the evidence |
| Dogfooding rule | When the pack and an applied copy disagree, fix the pack first and re-apply. Never patch an applied copy in place | G7 — that is precisely the drift this product exists to prevent, and doing it in this repo would destroy the evidence |
| Runtime assumption | Claude Code `.claude/` conventions only; no runtime abstraction | Brief §4 non-goals, §10 |

---

## Goals (version-level)

Each is assessable at release. Source IDs in brackets are the brief's
goals (G) and success criteria (S).

- **A new coding project is fully set up in one command from an empty
  directory, with no manual path edits, and its first spec-chain run
  works.** [G1, R3, S1]
- **A writing project and a planning project are set up from the same
  machinery**, proving the abstraction generalises beyond one type.
  [G2, S2]
- **Adding a pack requires no change to the harness core** — demonstrated
  by `planning` being authored against an already-frozen F1 pack format.
  [R1, S5]
- **A change made to a pack reaches an already-applied project via
  `harness update`, with local customisations preserved** and the
  project owner never forced to choose between the update and their
  edits. [G3, R4, S3]
- **`harness status` correctly reports pack, version, available version
  and per-file drift.** [S4]
- **`harness contribute` produces a usable patch against `packs/<name>/`
  from any project on the machine**, without opening this repo. [G4, Q-5]
- **Both existing templates are migrated into packs; neither survives as
  a hand-copied folder.** [S6]
- **Scaffolds are selectable and composable at init**, with two working
  backend implementations proving the interface is general. [G5, Q-8]
- **The harness is legible**: a newcomer reads the generated `CLAUDE.md`
  and the pack README and understands what they got and why. [G6]
- **This repo is itself produced by `harness init coding` +
  `harness update`, with no hand-applied files left.** This is the
  release gate, not a stretch goal — until it holds, v1.0 has not
  shipped. [G7, S7]

---

## Out of Scope (v1.0)

- **A public registry or marketplace of packs.** Local files plus git.
  Revisit only if third-party packs become real (Q-2).
- **A GUI.** CLI plus the Claude Code skill only.
- **Multi-user permissioning or team accounts.**
- **Agent runtimes other than Claude Code's `.claude/` conventions.**
- **Pack composition.** One pack per project is a design decision, not a
  v1.0 limitation deferred to v1.1 (Q-12).
- **Improving pack content.** Cross-pollination — writing gaining the
  targets contract, coding gaining routing and parallelization rules —
  moves to the first post-v1.0 bump (Q-6).
- **Migrating historical projects wholesale.** S6 covers the two known
  templates, not every repo that ever copied one.
- **Scaffolds beyond the two backends, pending Q-17.** The frontend, app
  and writing-workstream scaffolds named in G5/R6 are not confirmed as
  v1.0 content work; the *interface* they plug into is F1 scope
  regardless.
- **Authoring a non-IaC deploy scaffold.** Q-8a commits to a paper-check
  of the interface against one such target, not to shipping it.
- **A project-management or execution-tracking layer.** The harness
  scaffolds a way of working; it does not track work.

---

## Feature 1 — Pack format & manifest

*Full detail in `F1-spec-pack-format-and-manifest.md` · Tasks in `F1-epics-and-tasks-pack-format-and-manifest.md` (planned) · ADR `F1-ADR-001-pack-format-and-manifest.md` — **PROCEED***

F1 defines what a pack *is* on disk and what an applied project records
about it, and it is the only feature every other feature reads or
writes. It owns `pack.json` — pack name and semver, minimum CLI version,
the explicit `shared/` references that Q-4 requires, the scaffold
declarations Q-8 makes composable, and the nine-part anatomy declaration
that makes an incomplete pack visibly incomplete; the source→applied
mapping rules that the manual apply proved are not a straight copy
(directory mapping, source→applied rename such as `agent-teams/` →
`AgentTeams/`, and filename transforms such as dropping `.template`);
the marked-region grammar that Q-10 generalised from `CLAUDE.md` to
every pack file, with `source-only`, `applied-only` and pack-owned
regions plus whole-file mode as the degenerate case; and the manifest
schema itself — pack, pack version, CLI version and a per-file hash —
which is the load-bearing artifact the brief's §7 flagged as needing its
own spec. It is specified and frozen first precisely so that S5 ("adding
a pack requires no core change") is a claim `planning` can later falsify,
and its scaffold-declaration design carries the Q-8a obligation to
paper-check the interface against one non-IaC deploy target.

---

## Feature 2 — `harness init` — the apply engine

*Full detail in `F2-spec-init-apply-engine.md` (planned) · Tasks in `F2-epics-and-tasks-init-apply-engine.md` (planned) · ADR `F2-ADR-NNN-init-apply-engine.md` (planned)*

F2 is the one command that takes an empty directory to a working project
— it resolves the named pack and any `--scaffold` selections, applies
F1's mapping rules, strips `source-only` regions and inserts
`applied-only` ones, substitutes placeholders (project name, paths,
stack), generates `CLAUDE.md` with its pack-owned regions marked, and
writes the manifest that makes every later `update`, `status` and
`contribute` computable rather than guessed. Its requirement list is not
invented: it is the manual-apply log in `CLAUDE.md` §Dogfooding, where
each of the nine rows is a step that turned out fiddly by hand and must
therefore be absorbed here — directory mapping, a source→applied rename,
a filename transform, mapping into the tool-owned `.claude/` directory,
path rewrites across three files, and the two self-describing READMEs
whose staleness-on-apply is what motivated marked regions in the first
place. Its acceptance is S1, and its harder acceptance is S7: this repo
must eventually come out of it with nothing left hand-applied, which is
what makes Q-14 (applying into an already-populated repository) a
blocking question for F2 rather than a nicety.

---

## Feature 3 — `harness update` — drift detection & 3-way merge

*Full detail in `F3-spec-update-and-merge.md` (planned) · Tasks in `F3-epics-and-tasks-update-and-merge.md` (planned) · ADR `F3-ADR-NNN-update-and-merge.md` (planned)*

F3 is the half of the product that copy-paste cannot do: it reads the
manifest F2 wrote, re-hashes every generated file to classify it as
clean or locally edited, and reconciles the project against a newer pack
version — replacing clean files silently, and three-way merging edited
ones against the pristine applied version and the new pack version so
the owner is never forced to choose between the update and their
customisations. The merge is region-aware, not merely line-based:
pack-owned regions in `CLAUDE.md` and in any marked-region file are
updated while the surrounding project-owned prose is left untouched
(Q-7, Q-10), and the manifest is rewritten to record the new pack and
CLI versions on success. Its first genuine acceptance test is already
scheduled — the deferred cross-pollination bump of Q-6 gives it a real
pack version flowing into already-applied projects instead of a
synthetic one — and it delivers S3.

---

## Feature 4 — `harness status` & `harness contribute`

*Full detail in `F4-spec-status-and-contribute.md` (planned) · Tasks in `F4-epics-and-tasks-status-and-contribute.md` (planned) · ADR `F4-ADR-NNN-status-and-contribute.md` (planned)*

F4 pairs the two commands that read the drift engine rather than change
the project, because they are the same comparison pointed in opposite
directions. `harness status` answers "what did I apply, how far has it
drifted, and is there a newer version?" — reporting pack name, applied
version, latest available version and per-file drift, so an audit is a
command instead of reading every file by eye (S4). `harness contribute`
inverts it, diffing an applied copy against the pack version its
manifest records and emitting a patch against `packs/<name>/`, so an
improvement found while working in a writing project has a deliberate
route into the pack from any directory on the machine, without opening
this repo or relying on remembering it later (G4, Q-5). **F4 does not carry the Q-4 shared-file
bump rule.** This spec previously assumed it would, as a maintainer
subcommand; `F1-ADR-001` closed Q-15 the other way and **that default is
amended**. F1 owns both the logic and the surface — `harness validate
--all`, an F1 command — because a maintainer subcommand in a
user-facing feature would split the code across two features, which is
how the two documents came to disagree in the first place. This repo's
CI runs `harness validate --all` without `--allow-stale-shared`, and a
non-zero exit is the enforcement. F4 gains nothing from Q-15.

---

## Feature 5 — Template packs (coding, writing, planning) & shared components

*Full detail in `F5-spec-template-packs.md` · Research in `research-planning-pack-framing.md` · Tasks in `F5-epics-and-tasks-template-packs.md` (planned) · ADR `F5-ADR-NNN-template-packs.md` (planned)*

F5 is the content half of v1.0: three packs authored against F1's frozen
format, plus the `shared/` tree they reference and the scaffolds they
offer. `coding` migrates from `template/` and `writing` is extracted
from `AIImpactOnOrganizationsAndLeadership/`, both **faithfully** — no
content improvements, because Q-6 needs S6 to stay verifiable, and a
post-migration difference must be attributable to a migration bug rather
than an intentional change. `planning` is authored new, from the spine
Q-11 settled and `research-planning-pack-framing.md` evidences:
`intake → discovery → prioritize → commit → deliver → learn` with a
non-delegable absorption gate, mined from the portfolio-roadmap-deck
workstream as a knowledge base with no dependency on it. Alongside them
sit the two shared components — the domain-agnostic `targets` contract
and `presentation`, which Q-9b made a shared capability rather than a
fourth pack — and the two backend scaffolds (Azure SWA + Neon, AWS
Lambda + CDK) that prove the scaffold interface is general. Each pack
declares all nine anatomy parts, and `planning` is the format's hardest
test: its constraint-floor calibration is content that varies by an init
answer, which no existing pack has. **Q-13 resolved it before F5 begins**
(`F1-ADR-001`): the format already expresses it — `when` mappings select
whole files, `if` regions vary content inside one, and
`{{harness:param.<id>}}` substitutes the answer — so
`packs/planning/calibrations/<name>/` is a pack-authoring convention
rather than a format feature, and `--calibration helio` is a
pack-declared alias for `--set constraintFloor=helio` rather than
CLI code that knows about `planning`.

---

## Feature 6 — The Claude Code skill — the judgment layer

*Full detail in `F6-spec-claude-code-skill.md` (planned) · Tasks in `F6-epics-and-tasks-claude-code-skill.md` (planned) · ADR `F6-ADR-NNN-claude-code-skill.md` (planned)*

F6 is the thin layer that makes G1's "zero manual edits" literally true,
because applying a pack is not purely mechanical and the CLI can only
stub out the parts that are not. The skill drives `init`, `update`,
`status` and `contribute` and then does the work that needs to read the
repository and decide: filling placeholders from what the project
actually is rather than from a prompt answer, adapting the generated
`CLAUDE.md`'s project-owned prose so it describes the real layout while
leaving the pack-owned regions to `update`, redrawing file-ownership
tables like `AgentTeams/Implement.md`'s against the actual tree, and
interpreting a merge that F3 could only report as a conflict. It is
deliberately last in the sequence: it is a wrapper over commands whose
shapes must be settled first, and building it earlier would mean writing
it twice (Q-1).

---

## Feature Dependencies

### Hard dependencies

| From | To | Reason | Specific gate |
|---|---|---|---|
| F2 | F1 | `init` applies F1's mapping and region rules and writes F1's manifest | F1 manifest schema, `pack.json` schema and marked-region grammar Accepted |
| F5 | F1 | Packs are authored against the pack format; a format still moving means re-authoring three packs | F1 Accepted, including the nine-part anatomy declaration and scaffold declarations |
| F5 | F2 | A pack is verified by applying it; faithful migration (S6) can only be checked by an apply that round-trips | F2 `init` produces a working project for `coding` |
| F3 | F1, F2 | `update` reads the manifest `init` wrote and needs the recorded per-file hashes to classify clean vs edited | F2 writes a manifest with per-file hashes |
| F4 | F3 | `status` and `contribute` are the drift engine read in two directions | F3's drift/compare engine exposed as a reusable unit, not private to `update` |
| F6 | F2, F3, F4 | The skill wraps the CLI commands; their argument and output shapes are its interface | All three commands' CLI contracts Accepted |
| G7 / S7 | F2, F3, F5 | This repo can only be re-produced from the pack once `coding` exists as a pack and `init`/`update` can apply it | Q-14 resolved — `init` has a defined behaviour for an already-populated repository |

### Shared platform changes

| Change | Owner | Required by |
|---|---|---|
| Manifest schema + per-file hashing | F1 | F2 (writes), F3 (reads, rewrites), F4 (reads), F6 (reports) |
| Marked-region delimiter grammar (`source-only`, `applied-only`, pack-owned) | F1 | F2 (strip/insert on apply), F3 (region-aware merge), F5 (authoring every pack file), F6 (`CLAUDE.md` prose adaptation) |
| `pack.json` schema — semver, min CLI version, `shared/` references, scaffold declarations, nine-part anatomy with its three-value `status` | F1 | F2 (resolution + scaffold selection), F5 (three packs declare it), F4 (version reporting). The shared-bump rule is **not** an F4 consumer: F1 owns its logic *and* its surface (Q-15) |
| `component.json` schema — a shared component's own destination `mappings` | F1 | F5 (`shared/targets`, `shared/presentation` declare them), F2 (inherits them when resolving a pack's `shared` entries) |
| Diagnostic taxonomy — `E-`/`W-` codes, the `0/1/2/3` exit classes and the single message catalogue | F1 | F2, F3, F4 (raise codes), F5 (cites codes; owns only pack-shipped strings), F6 and CI (branch on codes, never on prose) |
| Drift / compare engine | F3 | F4 (`status` forwards, `contribute` reversed) |
| `shared/` tree — `targets`, `presentation` | F5 | All three packs, via explicit `pack.json` reference |
| Scaffold interface (declaration + composition) | F1 | F5 (two backend implementations), F2 (`--scaffold` selection) |

### Recommended sequencing

**F1 → F2 → F5 → F3 → F4 → F6.**

1. **F1 — pack format & manifest.** Everything else reads or writes it,
   so it is frozen before anything is built against it. Freezing it
   early is also what makes S5 testable: `planning` is authored later,
   against a format that did not move to accommodate it.
2. **F2 — `harness init`.** The apply engine makes F1 real, and it is
   the feature whose requirements already exist in written form — the
   manual-apply log. Building it second means F1's format is exercised
   before three packs are authored against it.
3. **F5 — the packs.** Authored against a frozen format and a working
   `init`, in the order `coding` → `writing` → `planning`: `coding`
   first because it is the dogfooding pack and the one S7 depends on,
   `writing` second because a second pack is what tests the format's
   generality, `planning` third because it is the hardest test and the
   one most likely to produce a format finding.
4. **F3 — `harness update`.** Needs applied projects to exist before it
   can be meaningfully built or tested, which F2 and F5 now supply. Its
   first real acceptance test is already scheduled as the post-v1.0
   cross-pollination bump (Q-6).
5. **F4 — `status` & `contribute`.** Consumes F3's drift engine rather
   than duplicating it; building it before F3 would mean writing that
   engine twice.
6. **F6 — the skill.** A wrapper over stable commands. Built last so it
   is written once (Q-1).

**Ordering caveat.** F5's `planning` pack may still surface a genuine
finding about the pack format after F1 is Accepted, and the research is
explicit that if the format cannot express calibration, the format
should change rather than the pack be flattened. The known instance of
that risk — Q-13, parameterized content — was **closed before F5
begins**, by `F1-ADR-001`, with a mechanism rather than a deferral, so
F5 authors `planning` against a format that already expresses
calibration. Treat any *remaining* planning-driven format change as an
ordinary F1 amendment with its own version bump, not as a sequencing
failure. Budget for one such revision.

---

## Open Questions

Q-1…Q-12 are resolved in the brief §12 and are not re-opened here; new
questions start at Q-13.

**This table is the project's single index of open questions.** A
question ID is unique across the whole project — never per document —
so the table below lists **every** open question in the v1.0 set, not
only the cross-feature ones. Cross-feature questions (Q-13…Q-17) are
*owned* here and stated in full — closed or open, so Q-13's and Q-15's
decisions are in this document's Resolved Decisions rather than in F1's;
feature-local questions stay in their
feature spec, and the master table indexes them with a one-line
statement and the owning document's default assumption. Where a
question was raised independently in more than one document it has been
collapsed to a single ID — the *Merged from* column records which.

**Eleven questions remain open**, and **six of them are escalated to
Thomas Andersen** by `F1-ADR-001` §6.1 — the ADR states the
architectural consequence of each branch and then stops, because they
are product-scope calls rather than architecture ones. Thirteen closed
on 2026-08-30 with that ADR (Q-13, Q-15, Q-18…Q-27) and are in Resolved
Decisions below or in the owning feature spec's; none of them is
restated here.

| # | Question | Owning doc | Owner | Default assumption | Merged from |
|---|---|---|---|---|---|
| Q-14 | **What does `harness init` do in a directory that already contains a hand-applied copy of the pack — is there a `harness adopt`?** S7 requires this repo to end up produced by the generator with no hand-applied files left, but the repo already has `specifications/`, `AgentTeams/`, `targets/` and `copy/` in place. Either `init` gains an adoption mode, or a separate step exists, or S7 is satisfied only by a clean re-apply that overwrites. **This blocks S7 dogfooding and F2's acceptance**, not just this repo's tidiness. **ESCALATED by `F1-ADR-001` §6.1**, with the cost of each branch made concrete: **No** is not free — `init` refuses a non-empty tree (`E-TARGET-EXISTS`) and `--force` proceeds only for byte-identical files, so this repo's two hand-rewritten READMEs (Dogfooding rows 7–8) must either render byte-for-byte from `packs/coding` or be deleted first, and someone must own that. **Yes** costs one manifest field and one warning, but `.harness/base/` then cannot hold the true applied bytes, so every later 3-way merge on a pre-adoption edit merges against a synthetic base and needs a `W-BASE-SYNTHETIC` warning and a documented caveat. Decide **before** F2's spec, not during it. F1 needs no change either way. | master spec (cross-feature) | **Thomas Andersen** (F2) | `init --adopt` hashes existing files against the pack, writes a manifest treating byte-identical files as clean and differing files as pre-existing drift, and writes nothing else. F1 states the opposite document-specific default — **not built**: S7 is satisfied by re-initing this repo from the pack, since an adopt would need a fuzzy matcher whose failure mode is a wrong merge base. The two defaults disagree; the answer must pick one. | F1's `harness adopt` question |
| Q-16 | **Published package name, binary name, and minimum Node version.** The brief consistently writes `harness init`, so the binary is `harness`, but the npm package name is never stated and neither is the Node floor — which the CLI semver contract of Q-3 and the `npx` bundling of Q-2 both depend on. **ESCALATED by `F1-ADR-001` §6.1**, which records that its file plan and message catalogue assume the default below and that changing it touches only `package.json` and two catalogue strings. **Not blocking.** | master spec (cross-feature) | **Thomas Andersen** | Package `@lintel/harness`, binary `harness`, `engines.node >= 20`. | — |
| Q-17 | **Do the frontend, app and writing-workstream scaffolds ship at v1.0, or only their interface plus the two backends?** G5 and R6 name four scaffold families; Q-8 settles only that *two backend* scaffolds ship, and Q-6 otherwise reserves v1.0 for the generator rather than pack content. The brief does not reconcile these, and the answer changes F5's size materially. **ESCALATED by `F1-ADR-001` §6.1** as format-neutral: a scaffold is `pack.json` data either way, and `writing` gaining a `scaffolds` array needs no format change. Only F5's size moves. | master spec (cross-feature) | **Thomas Andersen** (F5) | v1.0 ships the scaffold interface (F1) and the two backend scaffolds (F5) only; frontend, app and writing-workstream scaffolds move to the first post-v1.0 bump alongside cross-pollination, and G5 is restated accordingly. F5's document-specific default differs on one item: it keeps `writing-workstream` in v1.0 and slips only `frontend` and `app`. | F5's Q-17 |
| Q-28 | What does `shared/presentation` actually ship at v1.0? Q-9b asserts the component; nothing in the evidence base defines its contents. **ESCALATED by `F1-ADR-001` §6.1**, which adds that all three packs reference it, so under Q-4 every change to it bumps every pack in the product — if its content is unsettled, whether it ships at v1.0 at all is part of the question. Blocks F5, not F1. | F5 | **Thomas Andersen** (with `specwriter`) | The four items proposed in F5 §`shared/presentation` — outline template, talk-track convention, appendix convention, one-claim-per-slide evidence rule. No renderer. | — |
| Q-29 | Does authoring `planning` violate the faithful-migration boundary (Q-6)? **ESCALATED by `F1-ADR-001` §6.1** as format-neutral — a product-scope call, not an architecture one. | F5 | **Thomas Andersen** | Q-6 constrains **migrations only**; `planning` is authored new and may ship a stronger part 5 and part 8. Record the asymmetry in the pack README. | — |
| Q-30 | Does `writing` ship any default permission set or hook, given its source project's is unmigratable? | F5 | `architect` | **Ship none.** Declare part 8 `absent` with that reason. | — |
| Q-31 | Does `writing` ship document templates it does not currently have? | F5 | `architect` | Migrate the one template into a pack-level `templates/` folder, declare the remaining shapes prose-specified, record part 3 as thin. | — |
| Q-32 | Is `planning`'s bet status vocabulary (`proposed \| committed \| held-at-gate \| killed \| absorbed`) settled? | F5 | `specwriter` / Thomas | Ship it marked **provisional**, alongside the provisional role set; revisit after the first dogfood project. | — |
| Q-33 | Which real planning project dogfoods `packs/planning/` first? **ESCALATED by `F1-ADR-001` §6.1** — format-neutral, but it is the only evidence that would test S5 in anger. | F5 | **Thomas Andersen** | v1.0 ships `packs/planning/` **without** a dogfood site and says so; identify one before `planning@1.1`. | — |
| Q-34 | Should `shared/targets` learn to express "a phase the envelope may never enter"? | F5 | `architect` | **No change** to `shared/targets` at v1.0 — a change there bumps `coding` too under Q-4. Express it as an abort criterion in `planning`'s own target instances. | — |
| Q-36 | Does `coding` gain a brief template at v1.0? | F5 | `architect` | **No** at v1.0. Q-6 forbids content changes during migration; log it against `coding@1.1`. | — |

Q-13, Q-15, Q-18…Q-27, Q-35 and Q-37 are **not** gaps in the range.
Every one is closed and recorded in a Resolved Decisions table with its
original ID, per `conventions.md`: Q-13, Q-15, Q-35 and Q-37 below;
Q-18…Q-27 in `F1-spec-pack-format-and-manifest.md` §Resolved Decisions,
which is where the mechanisms they decide live. **Q-27 was raised in F5
but is recorded in F1**, because it decides F1's shared-component
mechanism; F5's Open Questions preamble points at it.

### Cross-document consistency pass — 2026-08-30

F1 and F5 were written in parallel against the same instruction ("Q-1…Q-12
are taken, start new questions at Q-13" and "start user stories at 1"),
and collided: the same IDs denoted different things in different
documents. A reconciliation pass ran on **2026-08-30**. It **made no new
design decisions and allocated no new content** — it only made the IDs
unique and recorded what was already written. What it reconciled:

- **Three duplicate questions collapsed to one ID each**, the master
  spec's number winning as the cross-feature owner. Q-13 (parameterized
  pack content) absorbed F5's question of the same number; **Q-14** (init
  into an already-applied directory / `harness adopt`) absorbed F1's
  `harness adopt` question — this is the one that blocks S7 dogfooding;
  Q-17 (which scaffolds ship at v1.0) absorbed F5's question of the same
  number. The absorbed ids are not restated here, because every one of
  them now denotes a different question. Each non-owning document now *references*
  the master ID rather than restating the question, keeping its own
  stated default assumption.
- **Every remaining question renumbered to a unique ID**, continuing from
  Q-17: F1's block first (Q-18…Q-26), then F5's (Q-27…Q-37). No ID is
  reused and no gap was left.
- **The `US-N` collision fixed.** F1 keeps US-1…US-16 as the earlier
  feature in build order; F5's twelve stories were renumbered to
  US-17…US-28, including every acceptance-criteria cross-reference.
  `CLAUDE.md`'s counter table now records the allocation.
- **Two questions closed** rather than renumbered-and-left-open — Q-35
  (the `US-N` reconciliation itself, which this pass resolved) and Q-37
  (where the anatomy declaration is validated, which F1 already answers).
  Both are in Resolved Decisions below.

---

## Resolved Decisions

Q-1…Q-12 were resolved on 2026-08-30 **before** this spec was written
and are recorded in full, with rationale, in
`specifications/project-brief.md` §12. They are not re-litigated
or restated here — the Technical Context table above cites them per row.
The index below exists so a reader can find the right row of the brief
without reading all of it.

| # | Question | Decision | Date |
|---|---|---|---|
| Q-1 | How is the harness built? | CLI engine (Node/TypeScript) owning deterministic mechanics + a thin Claude Code skill owning judgment; CLI first. See brief §12 | 2026-08-30 |
| Q-2 | Where do packs live and how are they distributed? | `packs/` in this repo, bundled into the published package. See brief §12 | 2026-08-30 |
| Q-3 | How are packs and the CLI versioned? | Per-pack semver + separate CLI semver; pack declares a minimum CLI version; manifest records both. See brief §12 | 2026-08-30 |
| Q-4 | How do packs share content? | Standalone, with explicit `shared/` references declared in `pack.json`; changing a shared file bumps every referencing pack. See brief §12 | 2026-08-30 |
| Q-5 | How do improvements flow back? | `harness contribute` emits a patch against `packs/<name>/`. See brief §12 | 2026-08-30 |
| Q-6 | Does v1.0 improve pack content? | No — faithful migration; cross-pollination deferred to the first post-v1.0 bump. See brief §12 | 2026-08-30 |
| Q-7 | How is `CLAUDE.md` handled? | Generated with marked regions; pack-owned maintained by `update`, project-owned never touched. See brief §12 | 2026-08-30 |
| Q-8 | How many backend scaffolds, and how are scaffolds selected? | Two at v1.0; selection is opt-in and composable. See brief §12 | 2026-08-30 |
| Q-8a | Which second backend scaffold? | AWS Lambda + CDK, with the IaC-shape residual risk accepted and a paper-check obligation. See brief §12 | 2026-08-30 |
| Q-9 | How many packs at v1.0? | Three. See brief §12 | 2026-08-30 |
| Q-9a | What is the third pack? | A planning / product-direction pack; framing deferred to Q-11. See brief §12 | 2026-08-30 |
| Q-9b | Is presentation a pack? | No — a cross-cutting capability in `shared/`, referenced by every pack. See brief §12 | 2026-08-30 |
| Q-10 | How is source-only vs applied-only content expressed? | Marked regions everywhere; whole-file mode as the degenerate case. See brief §12 | 2026-08-30 |
| Q-11 | What is the `planning` pack's spine? | Portfolio and roadmap management as a decision loop, calibrated by constraint floor; the portfolio-roadmap-deck workstream is its knowledge base. See brief §12 and `research-planning-pack-framing.md` | 2026-08-30 |
| Q-12 | Can a project hold more than one pack? | No — exactly one; two ways of working means two projects. See brief §12 | 2026-08-30 |

No question was resolved during the writing of this master spec itself.
Of the cross-feature block Q-13…Q-17, **Q-13 and Q-15 are now closed**
by `F1-ADR-001` and recorded below; Q-14, Q-16 and Q-17 remain open and
are escalated to Thomas. Q-18…Q-37 are feature-local, owned by F1 and
F5 and indexed in the table above; of those, Q-18…Q-27 are closed and
recorded in F1's Resolved Decisions, and Q-35 and Q-37 are closed and
recorded below.

### Closed by `F1-ADR-001` (2026-08-30)

`F1-ADR-001-pack-format-and-manifest.md` returned `PROCEED` and closed
the two cross-feature questions this spec owns. Both keep their IDs.
The ADR also closed Q-18…Q-27, which are feature-local to F1 and are
recorded in that spec's Resolved Decisions rather than duplicated here.

| # | Question | Decision | Date |
|---|---|---|---|
| Q-13 | Can the pack format express content that varies by an init answer? | **Yes — and no new grammar was needed.** The mechanism is three things F1 §US-8 already specifies: `when` mappings select whole files by the recorded answer, `harness:if <param>=<value>` regions vary content inside a file, and `{{harness:param.<id>}}` substitutes the answer. F5's `packs/planning/calibrations/<name>/` layout is therefore a **pack-authoring convention over `when`**, not a format feature, and no named-variant block is added to the region grammar — the default this spec previously stated is superseded by a mechanism that already existed. The CLI surface is data too: `parameters[].flag` lets `pack.json` declare that `--calibration helio` means `--set constraintFloor=helio`, so the CLI holds no knowledge of `planning` and S5 stays falsifiable. `harness validate --json` emits `parameterVaryingFiles`, which **is** F5's "declared calibration-varying file list" — one mechanically-checked artifact instead of two hand-kept lists. See `F1-ADR-001` §3.2, §6.2; F1 §US-8; F5 §US-19. | 2026-08-30 |
| Q-15 | Where is Q-4's shared-file bump rule enforced, and is it an error or a warning? | **F1 owns both the logic and the surface; F4 gains nothing; CI enforces.** The logic is `src/pack/shared.ts`; the surface is `harness validate --all`, an **F1** command (F1 §US-7, §US-16). A mismatch between a component's recomputed digest and a pack's recorded `integrity` is the hard error `E-SHARED-STALE`, exit 2, naming every referencing pack that must be bumped — not only the one being validated. `--allow-stale-shared` downgrades it to a warning for local iteration; this repo's CI runs without that flag and a non-zero exit is the enforcement. **This amends the default this spec previously stated** — "F1 owns the validation logic, F4 exposes it as a maintainer subcommand" — and the amendment is deliberate, not an omission: F4 is user-facing, a maintainer subcommand there would split one check across two features, and splitting a check across two features is how F1 and F5 came to disagree in the first place. See `F1-ADR-001` §6 conflict 8, §6.2. | 2026-08-30 |

### Closed by the cross-document consistency pass (2026-08-30)

Two questions raised in `F5-spec-template-packs.md` were closed by the
consistency pass. Per `conventions.md` an ID keeps its number when it
moves to a Resolved Decisions table, so both keep the IDs the pass
assigned them. They are also recorded in F5's own Resolved Decisions.

| # | Question | Decision | Date |
|---|---|---|---|
| Q-35 | How is the project-monotonic `US-N` counter reconciled across parallel feature specs? (raised in F5, which was written in the same pass as F1 with both blocks starting at 1) | **Resolved by the pass, along the line the question proposed.** F1 keeps US-1…US-16 as the earlier feature in build order; F5's block was renumbered to US-17…US-28, cross-references included. `CLAUDE.md`'s counter table records `US-28` as last used with the per-feature allocation in its Notes column. No US number is reused; no gap was created. Standing rule for later parallel passes: the earlier feature in build order keeps its block, later blocks are renumbered at the merge, and the counter table is updated before either spec reaches `Accepted`. | 2026-08-30 |
| Q-37 | Where is a pack's anatomy declaration validated — schema or CLI? (raised in F5) | **Closed as already answered by F1** — no new decision. `F1-spec-pack-format-and-manifest.md` §User Stories, **US-2**, with the messages in F1 §Error States: `pack.json` carries a mandatory `anatomy` object with exactly nine keys; a missing key is a hard validation error (`E-ANATOMY-MISSING`) naming the key; a key whose globs match no files fails with `E-ANATOMY-EMPTY`; and a part may be declared absent with a non-empty reason, which passes validation and makes `harness init` print `W-ANATOMY-ABSENT` naming the part and the reason. **Residual, since closed.** This row left one gap for the F1/F5 ADR: F1 defined two states (`present` and a `declaredAbsent` key) while F5's G5.2 and US-20 also use a third, `provisional`, for `planning`'s role set. `F1-ADR-001` closed it (conflict 3) on 2026-08-30 — the anatomy carries a three-value `status` enum, `present \| provisional \| absent`, defaulting to `present`, with `provisional` requiring a `note` and `absent` a `reason`; the `declaredAbsent` key is **retired**; and the validation report adds `missing` for invalid packs only. New codes `E-ANATOMY-NO-REASON`, `E-ANATOMY-NO-NOTE` and warning `W-ANATOMY-PROVISIONAL`. F5's "exactly two absent, exactly one provisional" NFR became mechanically checkable as a result. | 2026-08-30 |
