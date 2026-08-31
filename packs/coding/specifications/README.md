# Specifications — process and templates

This folder is the specifications kit. It contains:

- **`conventions.md`** — naming, numbering, document ownership rules.
- **`*.template.md`** — one template per document type.
- **This file** — the process: how an idea becomes a buildable spec.

---

## Folder structure

A project's `specifications/` folder has exactly three kinds of thing in
it: the master spec, one folder per version, and one `general/` folder.

```
specifications/
├── README.md                        ← project-local index (what lives where)
├── project-brief.md                 ← the brief every other doc is downstream of
├── <Project>Specification-1.0.md    ← master spec, one per version
├── general/                         ← CROSS-CUTTING reference specs
│   ├── system-architecture.md       ← required
│   ├── technology-choices.md        ← required
│   └── <topic>.md                   ← any other cross-cutting reference
├── v1.0/                            ← everything scoped to one version
│   ├── research-<topic>.md
│   ├── spec-<topic>.md
│   ├── design-spec-<topic>.md
│   ├── ADR-NNN-<topic>.md
│   └── epics-and-tasks-<topic>.md
└── v1.1/                            ← the next version, when it starts
```

**Version folders are frozen.** A shipped version's folder is not
edited in place when the next version starts; a new folder is created.
There is no shared "current" folder.

**`general/` is version-spanning.** It holds the documents that describe
the system as a whole rather than one release — the whole-system view,
the technology choices, and any other cross-cutting reference a reader
needs before the per-feature specs make sense. These are reviewed at
every version bump and each carries its own `## Change history`.

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
| `project-brief.md` | The product brief — purpose, problem, goals, requirements, success criteria, resolved decisions. Version-spanning; everything else is downstream of it |
| `{{Project}}Specification-X.Y.md` | Master version index — version-level context + a one-paragraph stub per feature with links |
| `spec-<topic>.md` | Full feature spec — all detail for one feature lives here |
| `design-spec-<topic>.md` | UI/UX spec — screens, components, tokens, motion, accessibility |
| `epics-and-tasks-<topic>.md` | Implementation breakdown — epics, tasks, dependency graph |
| `research-<topic>.md` | Pre-decision investigation — feeds into the spec + ADR |
| `ADR-NNN-<topic>.md` | Feature-scoped Architecture Decision Record |
| `ADR-EXX-<topic>.md` | Epic-scoped ADR — locks the file-level plan and public interface contract |
| `general/system-architecture.md` | Cross-cutting — the whole-system view: principles, container diagram, the trust-critical path, feature→component map, key tech-decision table |
| `general/technology-choices.md` | Cross-cutting — per-component technology choices + reasoning + a ⚠️ unclarity register |

`system-architecture.md` and `technology-choices.md` are the two
**required** `general/` documents. `general/` is not limited to them —
it is the home for **any cross-cutting reference specification**: a
document that describes a mechanism, model or inventory spanning
features and versions, which a reader needs before the per-feature
specs make sense. Name it `general/<topic>.md`.

Write a reference spec into `general/` when the thing being described
is (a) referenced by more than one feature spec, and (b) still true
after the version ships. If it is true only for this release, it
belongs in the version folder.

Each per-feature doc type above has a template in this folder. **Read
the template before writing** — they show the section structure and the
level of detail expected. Reference specs in `general/` have no fixed
template beyond the two required documents; lead with what the reader
must know, and state which decisions the document is downstream of.

---

## Document flow

```
brief → research → spec → design-spec → ADR → epics-and-tasks → implementation
```

The arrows are gates, not suggestions:

0. **Brief** — `specifications/project-brief.md` — comes before
   everything. It states what the product is, what it must do, and which
   decisions are already made. Research and specs cite it by that path;
   when the brief and a spec disagree, the brief wins and the spec is
   what gets fixed. A brief with unresolved blocking questions is not
   ready to specify against, and **a brief still at its `{{...}}`
   placeholders is not a brief**: an agent that finds one says so and
   asks for it to be filled rather than inferring scope from the ticket
   in front of it.
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

## Folding a decision — the step everyone forgets

When a decision is made, it lands in the feature spec and the ADR. It
does **not** automatically land in the cross-cutting documents under
`general/`, and those are the ones a reader opens *first* — before the
feature specs make sense.

**So the fold is not finished until you have checked `general/`.** For
every decision folded into a feature spec or an ADR, ask of each
`general/` document: does it state something this decision just made
false?

The failure is not carelessness, it is structural. A `general/` document
*summarises* what the feature specs say. A summary written before a
decision stays fluent and readable after it — it simply describes a
system that no longer exists. Nothing about it looks stale, which is why
it survives review.

Two shapes to watch for, both of which have actually happened:

- **A closed enumeration.** "The manifest records name, version, answers
  and scaffolds" is wrong the moment a fifth field is added, and reads
  perfectly well while being wrong.
- **A count or a completeness claim.** "Two drifts, two codes" and "the
  only X in v1.0" go false silently the first time a third one appears.

The corollary for reviewers: when a document says a cross-cutting
reference is authoritative, check the reference against the specs rather
than trusting the claim. A document asserting agreement is not evidence
of agreement.

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
