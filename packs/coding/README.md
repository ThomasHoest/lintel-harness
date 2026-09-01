# `coding` — a gated specification-and-build way of working

**Version 1.0.0 · `minCliVersion` 1.0.0 · scaffolds: `backend-azure`,
`backend-aws` (choose at most one)**

A pack for projects whose output is software. A gated spec process where
every arrow is a gate, ten single-purpose agents with non-overlapping write
boundaries, two agent-team prompts that wire them together, and a targets
contract for work that runs unsupervised.

It was extracted from the Voxio/Lintel codebase rather than invented, which
is why the process and document-template halves are unusually complete and
the automation half is unusually thin. It has been used at scale: one
project was specified end-to-end through it — 8 features, 44 epics, 398
tasks, 9 security-reviewed ADRs, all Accepted before a line of code.

---

## The nine parts, and where this pack is short

A pack is nine things. This one ships all nine, but two of them are thin
enough to name — `lintel harness pack info coding` reports the same picture
from `pack.json`.

| # | Part | Status | What this pack has |
|---|---|---|---|
| 1 | Process | `present`, and the **strong** part | `research → spec → design-spec → ADR → epics-and-tasks → implementation`. Every arrow is a gate: code for a feature may only be written once its spec set is Accepted and its ADR is `PROCEED`. A `securityreviewer` pass runs at the ADR gate and again at the code-review gate. |
| 2 | Role set | `present` | Ten agents — `architect`, `implementer`, `testwriter`, `reviewer`, `securityreviewer`, `specwriter`, `researcher`, `designer`, `copywriter`, `target-reviewer`. Write boundaries are drawn by **artifact type**: unit tests belong to `implementer`, integration tests to `testwriter`, ADRs to `architect`. Three agents carry `permissionMode: readonly`. |
| 3 | Document templates | `present`, and the **strong** part | Eleven templates, one per document type: master spec, feature spec, design spec, epics-and-tasks, research, feature ADR, epic ADR, the two `general/` reference specs, the spec index and the project brief. Compare `writing`'s one. |
| 4 | Conventions | `present` | `specifications/conventions.md` — file naming, ID schemes for questions, stories, epics and tasks, document ownership, status values, and the two task-numbering schemes with the rule for choosing between them. |
| 5 | Coordination | `present`, **and thin** | Two agent-team prompts, `Specify.md` and `Implement.md`, each naming a sequence and a file-ownership table. What it does **not** have is `writing`'s routing table from prompt shape to agent, or its parallelization rules. A real gap, recorded rather than papered over. |
| 6 | Behavioural guidelines | `present` | One generated `CLAUDE.md` carrying the project overview, the layout, the process summary, the agent roster, the conventions and the targets contract — six inert region anchors, one per section. |
| 7 | Folder scaffolding | `present` | `specifications/` with its version folders and `general/`, `AgentTeams/`, `targets/`, `copy/`, and — under a backend scaffold — `infrastructure/backend-deploy/`. Every folder an apply creates arrives with a README. |
| 8 | Skills and automations | `present`, **and thin** | Exactly one slash command, `/target`. Zero skills, zero hooks, no default permission set. The source codebase's automation was project-specific and did not migrate. This is the product's weakest area across all three packs, and this pack is the weakest of the three. |
| 9 | Autonomy contract | `present`, and the **strong** part | A target contract, a `target-reviewer` readiness gate that returns `READY` / `NEEDS-CORRECTION` before any work starts, an autonomy envelope, and hard `SUCCESS` / `ABORT` termination. Never an open-ended "improve X". |

Parts 5 and 8 are **thin, not absent**. Closing them is `coding@1.1` work:
part 5 closes by gaining `writing`'s routing and parallelization rules, which
is the cross-pollination Q-6 defers to the first post-v1.0 bump.

---

## What the recipe produces

Phase 1 copies this whole folder verbatim to `.harness/pack/`. Phase 2 runs
`recipe.json` — fifteen declared base steps over six primitives, plus three
more inside whichever backend scaffold is selected.

| Step | Primitive | From (payload) | To (project) |
|---|---|---|---|
| Agents | `copy` | `agents/` | `.claude/agents/` (10 files) |
| Commands | `copy` | `commands/` | `.claude/commands/` (`/target`) |
| Agent teams | `copy` | `agent-teams/` | `AgentTeams/` |
| Kickoff | `copy` | `targets/Run.md` | `targets/Run.md` |
| Voice guide | `strip-suffix` | `copy/*.template.md` | `copy/*.md` |
| Spec index | `rename` | `specifications/README.template.md` | `specifications/README.md` |
| Project brief | `rename`, `fillExpected` | `specifications/project-brief.template.md` | `specifications/project-brief.md` |
| Folder READMEs | `rename` ×5 | `applied-readmes/*.md` | one README per folder an apply creates |
| Path fix | `rewrite-path` | `targets/Run.md`, `.claude/commands/target.md` | pack-relative `targets/…` → `.harness/pack/targets/…` |
| Answers | `substitute` | — | `specifications/README.md`, `project-brief.md`, `AgentTeams/*.md` |
| Onboarding | `generate` | `CLAUDE.md.template` | `CLAUDE.md`, with six inert anchors |
| Backend | `copy` + `strip-suffix` ×2, scaffold only | `scaffolds/backend-{azure,aws}/` | `infrastructure/backend-deploy/` |

```
<project>/
├── .claude/agents/*.md ×10
├── .claude/commands/target.md
├── AgentTeams/          Specify.md, Implement.md, README.md
├── specifications/      README.md, project-brief.md, general/, v1.0/
├── targets/             README.md, Run.md
├── copy/                tone-of-voice.md, README.md
├── CLAUDE.md
└── (with --scaffold backend-azure | backend-aws)
    └── infrastructure/backend-deploy/
```

**What stays at `.harness/pack/` and is never copied out:** the document
templates under `specifications/*.template.md`, the spec process document,
`conventions.md`, and every `README.md` belonging to the pack itself. Under
the two-phase model the reference material lives in the pack; the project
holds only its own content.

Two paths are declared **not** to match after an apply, and `verify` reports
them without failing: `CLAUDE.md` is `adaptExpected` — the skill adapts its
project-owned prose — and `specifications/project-brief.md` is
`fillExpected`, shipped to be filled in. An unfilled brief reports
`unfilled`, which is `verify` telling you there is work still owed.

---

## Self-contained, and the one duplication that is deliberate

**This pack references no shared component.** There is no `shared/`
mechanism at v1.0 (Q-48), so every pack is standalone and carries its own
copy of anything it shares with another.

**`targets/` is such a copy.** The identical targets contract — the README,
the target template and `Run.md` — ships in **both `coding` and
`planning`**. That duplication is accepted rather than accidental (Q-49):
reconciling the two copies is a **named v1.1 task**, waiting on the sharing
mechanism that would give them somewhere to live.

---

## What this pack assumes

- You are using **Claude Code** with an agent UI (or any harness that
  respects the `.claude/agents/*.md` convention).
- You are happy with **Markdown + frontmatter** for specs, in version
  control — not Notion, Linear or a tracker.
- A backend scaffold is **optional and cloud-specific**. `backend-azure`
  targets Azure Static Web Apps + Neon Postgres; `backend-aws` targets AWS
  Lambda + CDK. Both land at `infrastructure/backend-deploy/`, which is why
  they are alternatives rather than composable peers. Select neither and the
  pack is entirely cloud-agnostic.

The pieces are deliberately decoupled: the spec process, the roles, the
teams and the targets contract are each usable without the others. A
`{{PLACEHOLDER}}` carrying no reserved prefix is left verbatim, for a human
or an agent to fill in.
