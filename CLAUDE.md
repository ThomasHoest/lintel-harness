# CLAUDE.md

Guidance for Claude Code (claude.ai/code) when working in this
repository. Keep this file short, current, and accurate. A stale
CLAUDE.md is worse than no CLAUDE.md.

---

## Project overview

This repository is **Lintel Harness** — a **harness template
generator**. It produces the scaffolding an agentic project needs
before any real work starts: agent roles, agent teams, the process and
its document templates, behavioural guidelines, folder structure, and
the skills and automations that make it run.

The unit of delivery is a **pack**: one complete, opinionated way of
working for one *kind* of project. **Three ship at v1.0** — `coding`,
`writing` and `planning` — and more will follow.

The product exists because that knowledge currently ships as *folders
that get copied and hand-edited* — fast to apply once, impossible to
update afterwards, and silently drifting from its source. The harness
replaces copy-paste with a **managed apply**: real files written into
the target project, plus a **minimal manifest** — pack, version, CLI
version, the parameter answers and the scaffold selection, and
**no per-file hashes** (Q-43). Applied state is *recomputed* from
payload + recipe + answers, which is what lets a later `update` be
computed rather than guessed.

**Status: specified in part, no code.** The brief
(`specifications/project-brief.md`) is **Draft** and is the source of
truth for scope. **F1 and F5 are spec-complete at v2.7**, `F1-ADR-001`
carries an architectural `PROCEED`, and the five cross-cutting
documents under `specifications/general/` are written (all **Draft**).
**All three packs ship** under `packs/` with a `pack.json` and a
`recipe.json` each. **No CLI source exists yet** — nothing in this repo
is executable product code.

The repo has a real history: **43 commits at the time of writing, all
pushed** — `git log --oneline | wc -l` is the check, not this number.
**Every question raised so far is resolved**, with rationale, in the
brief's §12 — that is the register, and this file does not restate it.
Ids and next-free values live in **§Counter state**, once.

### This repo is self-hosting — know which level you are on

The harness generates agentic project scaffolding, and it *is* an
agentic project that uses that scaffolding. Two levels, easy to
confuse:

| Level | What it is | Where |
|---|---|---|
| **Meta** — the harness's own working setup | The agents and commands operating **on this repo** | `.claude/` |
| **Product** — the material being productized | The three pack sources this repo turns into a generator | `packs/` |

An edit to `.claude/agents/architect.md` changes how *this project* is
built. An edit under `packs/` changes *what the product ships*.
Never make one thinking you are making the other.

---

## Repository layout

```
.
├── .claude/                     ← META: how THIS repo works
│   ├── agents/                  ← the 10 sub-agents working on this repo
│   └── commands/                ← slash commands (target.md)
├── packs/                       ← PRODUCT: what ships
│   ├── coding/                  ← pack.json + recipe.json + payload
│   ├── writing/                 ← pack.json + recipe.json + payload
│   └── planning/                ← pack.json + recipe.json + payload
├── specifications/
│   ├── README.md                ← index only; the process lives in the pack
│   ├── project-brief.md         ← product brief, and §12 the decision register
│   ├── general/                 ← five cross-cutting reference specs
│   └── v1.0/                    ← master spec, F1, F5, ADR-001, research
├── copy/
│   └── tone-of-voice.md         ← applied phase-2 artifact; still unfilled
└── CLAUDE.md                    ← this file
```

Verify with `find packs -name pack.json`, `ls specifications/general/`
and `ls .claude/agents/` rather than trusting the tree above.

Three things a returning reader gets wrong:

- **`template/` does not exist.** It became `packs/coding/`. Any
  document still saying `template/` is describing history, not the
  repo.
- **`AgentTeams/`, `targets/` and `infrastructure/` are gone from the
  project root**, and `specifications/` no longer holds document
  templates. Under the two-phase model (Q-39) all reference material
  lives in the pack; the project holds only content and phase-2
  artifacts.
- **`.harness/` does not exist** — no `pack/`, no `manifest.json`. It
  is written by `init`, and there is no CLI to run yet. That absence is
  the outstanding S7 item below, not an oversight.

---

## Decided architecture (v1.0)

Settled between 2026-08-30 and 2026-09-01; rationale for each in the
brief's §12. Treat these as given, not as open ground. Where a row
cites a question, §12 is the authority and this row is the summary:

| Area | Decision |
|---|---|
| Build | A **Node/TypeScript CLI**, published as `@lintel/cli`, binary `lintel` with `harness` as a command group, Node >= 22. A **thin Claude Code skill** drives it and handles judgment steps. CLI first. |
| **Applying a pack** | **Two phases (Q-39).** Phase 1: verbatim copy of the pack into `.harness/pack/` — no transformation, identical for every pack. Phase 2: a **per-pack declarative recipe** over fixed primitives (Q-40), applied automatically by the CLI, reading from the phase-1 copy (Q-41). Deterministic and verifiable. |
| **v1.0 scope** | **F1 (pack format + manifest), F2 (`init`), F3 (`update`), F5 (the three packs), F6 (the skill).** **Q-62 returns F3 to v1.0**, reversing Q-42 for it and bringing **G3, S3 and R4 back with it**; `status` folds into `update`'s read-only mode. **Only `contribute` (F4) still defers to v1.1.** `--adopt` dropped (Q-44). |
| **`update`** | **Ships at v1.0, and builds no merge engine (Q-62).** The CLI recomputes `expected_old` (local `.harness/pack/` + recipe + recorded answers — `verify`'s identity) and `expected_new` (newer bundled payload). Per path: **unedited → replaced outright**; **edited → left untouched and reported**; **`adapted` → never blindly replaced**. No conflict markers, no 3-way merge. The **skill** then reconciles the edited paths conversationally — the Q-1 split, on the Q-57 path. |
| Pack home | `packs/` in this repo, published with the CLI. The move is **done**: `template/` is now `packs/coding/`, and `writing` and `planning` were authored beside it. |
| Versioning | Per-pack semver in `packs/<name>/pack.json` plus a declared `minCliVersion`, and a separate CLI semver; the manifest records both. All three packs declare `minCliVersion: 1.0.0`. |
| Manifest | **Minimal (Q-43)**: pack name, version, CLI version, parameter answers, scaffolds. No per-file hashes, no `.harness/base/` — applied state is recomputable from payload + recipe + answers. |
| Sharing | **No `shared/` mechanism at v1.0 (Q-48)** — no `shared/` tree, no `component.json`, no declared references, no digest pin, no bump rule. Packs are standalone and **duplicate** what they share: `coding` and `planning` each ship their own `targets/` (Q-49), recorded in F5 as a named v1.1 reconciliation task. The bump rule returns with the mechanism in v1.1. |
| Contribute-back | `harness contribute` — **deferred to v1.1 (Q-42, unchanged by Q-62)**. The one part of the loop v1.0 does not close: improvements flow back only by hand-editing `packs/<name>/`. |
| `CLAUDE.md` | Generated by phase 2. **Inert region anchors only (Q-45)** — no parser, no region hashes, no tamper detection, and `update` does not need any: it classifies by recomputation, not by region. `CLAUDE.md` is the **`adapted`** path in every pack (Q-56), so `update` never blindly replaces it. |
| Source vs applied | **Not needed (Q-45/Q-46).** Phase 1 copies verbatim; bootstrap prose is deleted from the pack because the recipe encodes it. |
| Packs at v1.0 | Three: `coding`, `writing`, `planning`. Framing settled (Q-11). **All three are authored** — each has `pack.json` and `recipe.json`. |
| Presentation | **Not a pack** — a shared capability, but the component **defers to v1.1 (Q-28)**; no pack references it at v1.0. |
| Scaffolds | Opt-in and composable. Three at v1.0 (Q-17): `backend-azure`, `backend-aws`, `writing-workstream`. `frontend`/`app` defer. |
| v1.0 boundary | The generator, not pack content. Packs migrate **faithfully**; cross-pollination lands in the first post-v1.0 bump. |

---

## The core abstraction — the nine-part anatomy

Every pack reduces to the same nine parts. Only the *content* differs
between pack types. This is what the generator manufactures, and it
doubles as the completeness checklist for a pack — packs declare their
anatomy in `pack.json`, and `validate` checks the declaration:

1. **A process** — named, gated phases, one defined artifact per phase.
2. **A role set** — single-purpose agents with non-overlapping write
   boundaries.
3. **Document templates** — one per artifact type.
4. **Conventions** — naming, numbering, ownership, indexing, status.
5. **Coordination rules** — routing, sequencing, parallelism,
   escalation.
6. **Behavioural guidelines** — the standing instructions for
   `CLAUDE.md`.
7. **Folder scaffolding** — the directory shape the process assumes.
8. **Skills and automations** — slash commands, hooks, skills.
9. **An autonomy contract** — what runs unsupervised, and how it stops.

A pack missing a part is incomplete, not merely different. Treat that
as a finding.

---

## Where the pack content came from

All three packs now live under `packs/`. Their provenance still
explains why they differ, and the v1.0 boundary is that they migrate
**faithfully** — cross-pollination lands in the first post-v1.0 bump.

- **`coding`** — extracted from the Voxio/Lintel codebase; this is the
  tree that used to be `template/`. The gated spec process
  (`research → spec → design-spec → ADR → epics-and-tasks →
  implementation`) with its document templates and `conventions.md`; 10
  agent roles; 2 agent-team prompts (`Specify.md`, `Implement.md`); the
  targets way-of-working; and Azure and AWS backend-deploy scaffolds.
  Proven at scale — **RAFAL** was specified end-to-end through it: 8
  features, 44 epics, 398 tasks, 9 security-reviewed ADRs, all Accepted
  before a line of code.
- **`writing`** — migrated out of
  `../AIImpactOnOrganizationsAndLeadership/`, the project that grew it.
  Same anatomy, different content: the `scout → researcher → librarian
  → analyst`, then `outliner → writer → critic → editor` pipeline, a
  research corpus with per-workstream stage folders, a voice guide with
  a words-to-avoid list, `index.md` discipline, routing rules. It
  declares `"folderReadme": "index.md"` rather than taking the default.
- **`planning`** — the only pack with no prior codebase behind it.
  Framing settled by Q-11 after the research pass in
  `specifications/v1.0/research-planning-pack-framing.md`; its role set
  is declared `provisional` on purpose, which is why Q-60's
  `notice`/`defect` split exists.

**Each was missing what the others prove valuable** — coding had a
strong autonomy contract and almost no automations; writing had strong
coordination and behavioural rules and no autonomy contract. Extracting
the shared anatomy is how they improve at once. (Brief Q-6.)

---

## Dogfooding — this repo is target project #1

**This project must dogfood the pack.** Lintel Harness is set up by the
coding pack it productizes: `specifications/`, `copy/` and — until the
two-phase model removed them — `AgentTeams/` and `targets/` were
produced by applying that pack, by hand, exactly as a user would.

That is not decoration. It is the primary source of requirements:

- **Anything the generator will do, we do here first, manually.** Every
  step that turned out fiddly is a requirement for `harness init`.
- **Anything the pack claims, we verify here.** If a pack instruction
  doesn't survive contact with a real repo, the pack is wrong.
- **We feel our own drift.** This repo goes stale against
  `packs/coding/` the same way any other project would. That pain is
  the evidence for the manifest and `harness update`.

### What the manual apply actually required

The log below is spec input for R3 (quick to apply) and R4 (easy to
update). Each line is work the generator must absorb. **It is a
historical record of the 2026-08-30 apply and its paths are as they
were then** — read every `template/` in it as `packs/coding/`. Do not
"correct" the log; correcting it would destroy the evidence.

| # | Step | What the generator must handle |
|---|---|---|
| 1 | `template/specifications/` → `specifications/` | Directory mapping |
| 2 | `template/agent-teams/` → `AgentTeams/` | Mapping **plus a rename** — the source and applied names differ |
| 3 | `template/targets/` → `targets/` | Directory mapping |
| 4 | `template/copy/tone-of-voice.template.md` → `copy/tone-of-voice.md` | **Filename transform** — dropping `.template` |
| 5 | `template/agents/`, commands → `.claude/` | Mapping into a tool-owned directory |
| 6 | Path rewrites in 3 files | `template/targets/…` → `targets/…` in `Run.md`, `.claude/commands/target.md`, `targets/README.md` |
| 7 | Rewrote the stale "adopting this in a new project" section of `targets/README.md` | **A copied doc that describes its own copying goes stale the instant it is applied.** The generator needs a notion of source-only vs applied-copy content |
| 8 | Rewrote the intro of `specifications/README.md` | Same class of problem as #7 |
| 9 | Moved the brief into `specifications/` | Where product docs belong |

**Still outstanding** (deliberate, not forgotten):

- **`.harness/pack/` and `.harness/manifest.json` do not exist**, so
  this repo is still not produced by the tool it specifies. See
  *Genuinely outstanding* below — it leads that list.
- `copy/tone-of-voice.md` is an unfilled placeholder, still carrying
  `{{Product}}` and `<name>` — it needs real content before
  `copywriter` can be trusted.
- `packs/coding/agent-teams/Implement.md`'s file-ownership table names
  `Sources/**` and `Tests/Unit/**`, which are not this project's
  layout. **Now a pack-content item, not an applied-copy one** — the
  applied `AgentTeams/` is gone, so the fix belongs in the pack, and
  `F1-ADR-001`'s file-level plan is the layout to redraw it against.
- No backend scaffold was applied: the harness has no backend. Pack
  scaffolds are optional and composable — that is itself a finding for
  R6, and it is why `coding` ships `backend-azure` and `backend-aws`
  as branches rather than as base steps.

### The rule that keeps dogfooding honest

When the pack and an applied copy disagree, **fix the pack first, then
re-apply.** Fixing only the applied copy is precisely the drift this
product exists to prevent — and doing it here, of all repos, would
invalidate the evidence.

---

## Working with `packs/` — the pack sources

`packs/coding/`, `packs/writing/` and `packs/planning/` are the **pack
sources**, and they are pristine. The applied folders in this repo root
are `coding`'s output.

- **Do not make incidental edits under `packs/`.** Not to fix a typo,
  not to improve a prompt in passing.
- **Do not edit an applied copy to work around a pack defect.** See the
  rule below.
- Pack content is **product**, so changing it is spec-governed work
  under F5 — not a passing improvement, and not a place to fold a
  decision the specs have not recorded.
- A pack's `recipe.json` is the contract for what an apply produces.
  Changing a payload path without changing the step that carries it
  breaks the apply silently.

---

## Specification process

This project follows the process defined in
`packs/coding/specifications/README.md` and
`packs/coding/specifications/conventions.md`. **Read both before
touching specs.** `specifications/README.md` in this repo is an
**index** of what is here, not a copy of the process — under Q-46 the
process document is no longer applied into the project.

```
research → spec → design-spec (if UI) → ADR (PROCEED) → epics-and-tasks → implementation
```

Every arrow is a gate. Code for a feature may only be written once its
spec set is Accepted and its ADR is `PROCEED`. A `securityreviewer`
Mode-A pass runs at the ADR gate; the security-implementation review
runs at the code-review gate.

Status values: `Draft | In Review | Accepted | Superseded`. Open
questions are `Q-N` per document and keep that ID in the Resolved
Decisions table.

Conventions chosen 2026-08-30 at the first spec run:

- **Filenames are feature-prefixed** (`F1-spec-…`, `F1-ADR-001-…`) —
  the sanctioned variant, since v1.0 holds six features and sorts
  better by feature than by document type.
- **Task IDs use Scheme A**, epic-derived `T-XXYY` (`T-0101` = first
  task of E-01). Epics are per-feature rather than one cross-feature
  sequence, so the re-parenting problem that forced RAFAL onto Scheme B
  does not apply here.

### Feature numbering (v1.0)

| # | Feature |
|---|---|
| F1 | Pack format & manifest |
| F2 | `harness init` — the apply engine |
| F3 | `harness update` — drift classification, **no merge engine** (Q-62), plus its read-only mode (the former `status`) |
| F4 | `harness contribute` — **v1.1 only**; the number is reserved and never reused |
| F7 | **Add-on packs — v1.1 only (Q-82).** Composable units that are not ways of working: `backend-azure`, `backend-aws`, and `presentation` (Q-28). Parked in `addons/`, applied by nothing. **Q-83 is its first design question** — whether `category` is a scaffold concept or an add-on one, and who owns an open-string namespace once add-ons are authored independently |
| F5 | Template packs (coding, writing, planning) |
| F6 | The Claude Code skill — the judgment layer |

**v1.0 is F1, F2, F3, F5, F6.** F1 first: the pack format and manifest
are what every other feature reads or writes. The master spec is **at v1.0.2 and is current** —
five commands under the group, sequencing `F1 → F2 → F5 → F3 → F6`. The
claim that it predates Q-62 was itself stale and is retired here;
`general/system-architecture.md` §4 remains the feature→component map.

### Counter state — the one place in this file

**Every counter value in this repo's documentation is stated here and
nowhere else in `CLAUDE.md`.** If you find a second number for the same
counter anywhere in this file, that is the bug, and this section wins.

| Counter | Next free | Rule |
|---|---|---|
| Open question | **Q-84** | `Q-N`, **project-monotonic, not per document**. An id is never reused, and it keeps its number when it moves to a Resolved Decisions table. **Q-1…Q-63 and Q-79…Q-82 are resolved** — the register is `specifications/project-brief.md` §12, which holds the decision and the rationale for each. This file does not restate them. **Q-64 is reserved**, not free (see Q-63). **Q-65…Q-78 are open**, each feature-local to F2, F3 or F6 and resolvable in its own ADR, plus **Q-83** (the `category` model), which is project-level and waits on F7. |
| User story | **US-99** | `US-N`, project-monotonic across features. **F1 and F5 each state their own range in their §User Stories**, — read them there rather than trusting a list here. F2, F3 and F6 now hold stories too (US-39…US-98). **Retired and never reusable:** US-5, US-6, US-7, US-11, US-12 (F1); US-22, US-23 (F5). |
| Epic | **E-28** | `E-NN`, per feature, and the range is contiguous. **F1 E-01…E-12 · F5 E-13…E-19 · F2 E-20…E-22 · F3 E-23…E-25 · F6 E-26…E-27.** Every v1.0 feature now has epics. |
| Task | per epic | Scheme A, epic-derived `T-XXYY`, so there is no single next-free id. **F1 T-0101…T-1219** (112) · **F5 T-1301…T-1906** (32) · **F2 T-2001…T-2206** (19) · **F3 T-2301…T-2507** (21) · **F6 T-2601…T-2708** (15) — **206 tasks** across five features. Each document ends with its own per-epic next-free table; that is where to look, not here. |
| ADR | — | Five written: **`F1-ADR-001`** (`PROCEED`, amended 2026-09-01; its contract types are current, and F1 has since moved to v3.4), **`F5-ADR-002`** (`REVISE SPEC`), **`F2-ADR-003`** (`PROCEED`), **`F3-ADR-004`** (`PROCEED`), **`F6-ADR-005`** (issued `REVISE SPEC`, **conditions cleared, now `PROCEED`**). ADRs are feature-prefixed and numbered per feature, so there is no project-wide next-free id. Epic-scoped ADRs use `ADR-EXX`. |
| Error code | — | F1's catalogue is the **only** one, and it holds **88** at v3.7. No other document may invent a code. Ten were added on 2026-09-01: nine at v3.0 (four for `update`, four for `init`, one notice) and **`E-DISCLOSURE-FORGERY` at v3.4**, closing the Mode A CRITICAL. |

---

## Agents

Sub-agent definitions live in `.claude/agents/` — ten of them, sourced
from `packs/coding/agents/`:

| Agent | Purpose | Model |
|---|---|---|
| `architect` | Validates a spec and produces an ADR | Sonnet 5 |
| `implementer` | Writes code + unit tests from a spec + ADR | Sonnet 5 |
| `testwriter` | Writes integration / acceptance tests | Sonnet 5 |
| `reviewer` | Reviews code for quality/correctness/security | Haiku 4.5 |
| `securityreviewer` | Validates security at the ADR gate, verifies at the code gate | Sonnet 5 |
| `specwriter` | Turns a brief into a functional spec | Opus 5 |
| `researcher` | Investigates topics with web + local search | Sonnet 5 |
| `designer` | Writes UI/UX design specs | Sonnet 5 |
| `copywriter` | User-facing copy from a tone-of-voice guide | Opus 5 |
| `target-reviewer` | Gates a target's Readiness before an unsupervised run | Sonnet 5 |

Coordination prompts: `packs/coding/agent-teams/Specify.md` (research →
spec → ADR → security review → PROCEED-stamped set) and
`packs/coding/agent-teams/Implement.md` (implementer + testwriter +
reviewer + security review → ships code, epic by epic). They are **pack
source only** — the applied `AgentTeams/` copies no longer exist in this
repo.

---

## Autonomous work — targets

Long-running unsupervised work uses a **target**: a measurable goal the
agent works toward alone, stopping at **SUCCESS** (every criterion
verified) or **ABORT** (a stop condition fired). Never an open-ended
"improve X".

- **Launch:** `/target <target-file>` (`.claude/commands/target.md`).
- **Readiness gate:** `target-reviewer` validates the filled target —
  criteria verifiable, complete, not gameable, autonomy envelope
  sufficient to finish without asking — returning `READY` /
  `NEEDS-CORRECTION` **before** any work starts.
- **Instances:** filled targets and their work logs are project
  content, not `.claude/` constructs.

The reference material lives in the packs — `packs/coding/targets/` and
`packs/planning/targets/`, which ship separate copies (Q-49, with the
duplication recorded as a named v1.1 reconciliation task). There is no
applied `targets/` in this repo root any more; the path-rewrite fixup
that once produced one is logged as step 6 of the manual apply and is
now the `rewrite-path` primitive's reason for existing.

---

## Conventions enforced for agents

- **Know your level.** `.claude/` is how this repo works; `packs/` is
  what the product ships. See the table above.
- **No incidental edits under `packs/`.** Copy out, then edit.
- **Fix the pack before the copy.** A defect found in an applied file
  is a defect in `packs/coding/`; patch it there and re-apply.
- **Dogfood first.** Before automating a step, do it by hand here and
  log what it cost.
- Unit tests live alongside the code they cover (owned by
  `implementer`). Integration/acceptance tests live in a separate tree
  (owned by `testwriter`).
- Cross-cutting decisions are recorded as ADRs under
  `specifications/`, not settled in chat.
- **Do not commit secrets.**
- The brief is the current source of truth for scope. When it and this
  file disagree, the brief wins — and this file is the thing to fix.

---

## Open decisions (for Thomas)

**One: Q-83**, and it waits on F7 rather than on you — see §9 of the brief. Every other question raised in this project is resolved and
recorded, with its rationale, in `specifications/project-brief.md`
**§12 — Resolved decisions**. For the id range and the next free id,
see §Counter state above; this section deliberately states no number.

**Read §12, do not read a summary of it.** This section used to restate
the decisions it thought mattered, and that is exactly what went stale:
it was still advertising Q-14's `init --adopt` long after **Q-44
dropped it**, and it was still counting to a next-free id two dozen
questions behind the register. A restated decision is a decision that
will be wrong later. §12 supersedes anything here or in the sections
below that appears to disagree with it.

The one thing worth carrying rather than pointing at, because it
changed scope after most of the spec set was written: **Q-62 returns
`update` to v1.0** and F3 with it, **without a merge engine**. G3, S3
and R4 return too, `status` folds into `update`'s read-only mode,
**`contribute` (F4) alone stays deferred to v1.1**, and **S7 strengthens
to *produced by `init` and maintained by `update`***. Any document —
including the master spec, `LintelHarnessSpecification-1.0.md`, which
has not been reconciled — that still says `update` or `status` defer to
v1.1 predates Q-62.

### Status of the spec set

**F1 and F5 are spec-complete, both at v2.7. `F1-ADR-001` carries an
architectural `PROCEED`.** Neither number moves without a fold; check
the `**Version:**` line of each spec rather than trusting this one.

The five documents in `specifications/general/` —
`system-architecture.md`, `technology-choices.md`,
`interaction-model.md`, `pack-application.md` and `pack-inventory.md` —
are **all written and all Draft**. Nothing in `general/` is
outstanding-as-unwritten; the standing risk there is staleness, which
is what the next section is about.

**The security gate is open, and on two axes.** F2/F3/F6's Mode A pass returned **`REVISE-SPEC`** on 2026-09-01 with a **CRITICAL** outstanding (C-49); nothing in that set is folded yet. Separately, for F1 and F5: **the gate is closed by decision, not by a passing verdict.**
Four Mode A rounds ran: 2 CRITICAL → 2 CRITICAL → 0 CRITICAL/2 HIGH →
0 CRITICAL/3 HIGH, with conditions holding 24/31 → 36/38. Round 4's
HIGHs and MEDIUMs are folded into F1 v2.5 and F5 v2.4 — the fold
versions, not the current ones; C-47 and the LOW residue are accepted
with their requirements and tests recorded. **No `SECURITY-PROCEED`
exists against any revision of F1, F5 or the ADR, and none is claimed.**
The standing security verdict of record is `REVISE-SPEC`. Every round-3
and round-4 finding concerned the membership or quantifier of a denylist
that the spec itself concedes is incomplete by construction — stopping
is a judgement about diminishing returns, and should be read as one.
**Do not read the closed gate as a clean pass, and do not weaken this
paragraph.**

**`§F1.9`'s known limits and v1.1 obligations are part of the contract.**

### Folding a decision — check `general/` too

A decision folded into F1, F5 or the ADR is **not** folded until the
cross-cutting documents under `specifications/general/` have been
checked against it. This has now failed three times in this project:
`pack-application.md` stated the execute-time read C-23 had ruled out;
it later enumerated the manifest at five keys after Q-52 made it six;
and `system-architecture.md` said "two drifts, two codes" after Q-56
made it three. Each read perfectly well while being false.

Watch for **closed enumerations** and **completeness claims** — "records
X, Y and Z", "the only generate step", "two drifts". Those go false
silently. And when a document calls a cross-cutting reference
authoritative, verify it rather than trusting the assertion.

### Genuinely outstanding before code

- **`.harness/pack/` and `.harness/manifest.json` do not exist**, so
  **S7 is unmet** — this repo is not yet produced by the tool it
  specifies. Under Q-62 S7 also strengthens to *produced by `init` **and
  maintained by `update`***, so clearing it now takes an apply and an
  update. **This is the outstanding dogfooding item**, it leads this
  list on purpose, and the blocker is no longer authoring: it is that
  there is no CLI to run. `ls .harness` is the check.
- **No CLI source exists.** Not a line. Everything below assumes that.
- **The ⚠️ register is closed — all fourteen** (`general/technology-choices.md`
  §6), so **no task in any feature is blocked**. The build is **`tsc` only**
  (it must type-check, not strip — the path brands are compile-time
  controls), `packs/` resolves from `import.meta.url` and **never
  `process.cwd()`**, and CI is **GitHub Actions** across three platforms
  with **Windows not optional**.
- **The remaining gates before code are procedural, not open questions:**
  every spec and ADR is still `Draft` and the process requires **Accepted**;
  **T-2301** (F3's six-row disposition table → four) must land before F3's
  tasks; and **T-1502** (the migration diff, never run) before F5 is
  Accepted.
- **Every v1.0 feature now has a spec, an ADR and epics.**
- **F2/F3/F6's Mode A pass ran to four rounds and returned
  `SECURITY-PROCEED`** (`security-review-mode-a-F2-F3-F6.md`).
  **C-49…C-62 all folded.** The CRITICAL — the disclosure's delimiters
  being forgeable by the content they wrap — **survived three rounds of
  tightening the matching rule** and was closed in round 3 by **replacing
  the rule with a per-run nonce**: a pack cannot forge what it cannot
  predict, and the property became *falsifiable* rather than
  unfalsifiable. **Read §8's diagnosis before touching that mechanism.**
  Two conditions closed by **dropping a flag** rather than adding
  machinery (`--user`, `--force`) — a removed surface cannot be got wrong.
  **This is the ADR gate only**: there is no security-implementation
  review, because there is no code.
- **ADR-002 has not been re-issued** against F5 v3.1.
- **No epics-and-tasks document for F2, F3 or F6.** F1 and F5 both have one.
- **Pack content no longer lags the spec** — this is the line that went
  stale last time, so it now says how to check itself. All three packs
  ship a `pack.json` and a `recipe.json`
  (`find packs -name pack.json`). Their `steps` arrays hold **coding
  15, writing 8, planning 23**; counting the one remaining scaffold
  branch as well the totals are **15 / 13 / 23** — but **only one branch runs in
  any given apply**, so no single number describes what an apply does.
  **`coding` has no branches as of Q-82** — its two backend scaffolds
  left for `addons/` as v1.1 add-ons — so `writing`'s
  `writing-workstream` at 5 steps is the **only** scaffold in the
  product, and `planning` has none. `packs/coding/commands/target.md` exists; the
  old `infrastructure/backend-deploy/` is now
  `packs/coding/scaffolds/backend-azure/` with `backend-aws/` beside
  it; and C-43's **five** `{{harness:`-bearing `coding` paths are met
  exactly (`grep -rl '{{harness:' packs/coding`).

Counter values are **not** repeated here. See §Counter state.
