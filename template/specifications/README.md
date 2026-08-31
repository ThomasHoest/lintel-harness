# Specifications — process and templates

This folder is the specifications kit. It contains:

- **`conventions.md`** — naming, numbering, document ownership rules.
- **`*.template.md`** — one template per document type.
- **This file** — the process: how an idea becomes a buildable spec.

When you bootstrap a new project, copy this folder to `specifications/`
at the repo root. Then create a per-version folder inside it
(e.g. `specifications/v1.0/`) and start producing documents. Every
template, agent prompt, and convention in this pack assumes that
path — if your project uses a different one, swap it consistently
everywhere.

---

## Why a strict spec process

Without a documented spec process, agents and humans both default to
inventing one. The result is N variations across N features, none of
which quite line up. Pick one, write it down, follow it. Copy the
structure below, edit it for your context.

---

## Document types

| File | Purpose |
|---|---|
| `{{Project}}Specification-X.Y.md` | Master version index — version-level context + a one-paragraph stub per feature with links |
| `spec-<topic>.md` | Full feature spec — all detail for one feature lives here |
| `design-spec-<topic>.md` | UI/UX spec — screens, components, tokens, motion, accessibility |
| `epics-and-tasks-<topic>.md` | Implementation breakdown — epics, tasks, dependency graph |
| `research-<topic>.md` | Pre-decision investigation — feeds into the spec + ADR |
| `ADR-NNN-<topic>.md` | Feature-scoped Architecture Decision Record |
| `ADR-EXX-<topic>.md` | Epic-scoped ADR — locks the file-level plan and public interface contract |
| `general/system-architecture.md` | Cross-cutting — the whole-system view: principles, container diagram, the trust-critical path, feature→component map, key tech-decision table |
| `general/technology-choices.md` | Cross-cutting — per-component technology choices + reasoning + a ⚠️ unclarity register |

The two `general/` docs are **version-level, not per-feature** — one set per product,
living in a `specifications/<product>/general/` folder, reviewed on every version bump
(each carries its own `## Change history`). Each doc type above has a template in this
folder. **Read the template before
writing — they show the section structure and the level of detail
expected.**

---

## Document flow

```
research → spec → design-spec → ADR → epics-and-tasks → implementation
```

The arrows are gates, not suggestions:

1. **Research** runs first for anything unfamiliar (new API, new
   library, new platform constraint). Output: a structured findings
   doc with sources and a recommended approach.
2. **Spec** turns the brief + research into a complete functional
   specification. Output: user stories with acceptance criteria,
   error states, non-functional requirements, open questions.
3. **Design spec** documents the visual + interaction layer for any
   feature with UI. Reads the functional spec for behaviour and
   stays internally consistent with existing design tokens.
4. **ADR** validates the spec (and design spec) against the existing
   architecture and locks the file-level plan and public interface
   contract that downstream work depends on.
5. **Epics & tasks** breaks the work into implementable units with
   dependencies. Each task names the file(s) it touches.
6. **Implementation** follows the ADR's file-level plan and contract.

No step skips ahead. If a spec is written without research and the
research would have changed the design, you have wasted a spec; if
implementation starts without an ADR, the team rediscovers the same
architectural questions inside the diff.

---

## Ownership rules (no-overlap)

**Master spec** owns:
- Introduction · Technical Context (cross-feature) · Goals (version-level) ·
  Out of Scope (version-level)
- A one-paragraph stub for each feature with links to its `spec-*.md`,
  `design-spec-*.md`, and `epics-and-tasks-*.md`
- Cross-feature Open Questions and Resolved Decisions

**Per-feature spec** owns (nothing duplicated in the master spec):
- Overview · Technical Context · Goals · Out of Scope
- User Stories with Acceptance Criteria
- Flows / behaviour
- Error States table
- Non-Functional Requirements
- Feature-specific Open Questions / Resolved Decisions

**Edge case** — a feature small enough that a separate spec would be
noise: embed the full per-feature template inline in the master spec
under that feature's heading.

The rule of thumb: if you find yourself copying a paragraph from the
master spec into a feature spec, one of them is in the wrong file.

---

## How to start a new version

When the time comes to plan v1.X+1:

1. Create `specifications/v1.X+1/` (or whatever pathing your project uses).
2. Copy `master-spec.template.md` to `{{Project}}Specification-1.X+1.md`
   and fill in the version-level context.
3. For each feature: copy `feature-spec.template.md`, `design-spec.template.md`,
   and `epics-and-tasks.template.md`. Name them `spec-<feature>.md`,
   `design-spec-<feature>.md`, `epics-and-tasks-<feature>.md`.
4. Update the **Document inventory** table in `CLAUDE.md` so agents can
   find the new docs.
5. Update the **Current counter state** table in `CLAUDE.md` after the
   first epic / task / story / ADR numbers are claimed.

---

## How to start a new feature within a version

1. Decide the feature name (kebab-case for filenames: `multiroom-grouping`).
2. If anything in the brief is unfamiliar, write a **research** doc first.
3. Write the **functional spec** (`spec-<feature>.md`).
4. Have the architect produce an **ADR** that locks the interface
   contract and the file-level plan.
5. If the feature has UI: write the **design spec**.
6. Break the work down into **epics and tasks**.
7. Add a stub for the feature in the master spec with links.

The `agent-teams/` folder has prompts that drive this full flow with
a multi-agent team.

---

## What "good" looks like

- Every acceptance criterion is independently verifiable — a yes/no
  observable behaviour, not an implementation detail.
- Every error state has a defined behaviour, message text included.
- Every spec ends with a list of Open Questions and a Resolved Decisions
  audit trail.
- Every ADR is under one page. Long ADRs are usually two ADRs.
- Every epic doc names the files each task touches — that is the
  contract between architect and implementer.

When a spec leaves these things out, downstream agents have to guess,
and they guess differently every time. The whole point of the process
is that they don't have to.
