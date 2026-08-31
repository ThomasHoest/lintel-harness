# Specification conventions

The naming, numbering, and structural rules that every spec doc in the
project follows. Adopt as-is or edit to taste before the first spec is
written.

---

## File naming

| Document | Filename pattern |
|---|---|
| Master spec | `{{Project}}Specification-X.Y.md` (e.g. `MyAppSpecification-1.0.md`) |
| Feature spec | `spec-<kebab-case-topic>.md` |
| Design spec | `design-spec-<kebab-case-topic>.md` |
| Epics & tasks | `epics-and-tasks-<kebab-case-topic>.md` |
| Research doc | `research-<kebab-case-topic>.md` |
| Feature-scoped ADR | `ADR-NNN-<kebab-case-topic>.md` (use `adr-feature.template.md`) |
| Epic-scoped ADR | `ADR-EXX-<kebab-case-topic>.md` (use `adr-epic.template.md`) |
| Mockup | `mockup-<kebab-case-topic>.svg` |

Every file lives in a per-version folder: `specifications/v1.X/`. There is
no shared "current" folder — frozen versions stay where they were written.

**Feature-prefixed variant.** A project whose version folder holds many features
may prefix every per-feature doc with its feature ID so the folder sorts by
feature rather than by document type — `F3-spec-vcs-write-adapter.md`,
`F3-ADR-005-vcs-write-adapter.md`, `F3-epics-and-tasks-vcs-write-adapter.md`.
Pick one variant per project and use it for every feature; do not mix. The ADR
number stays project-monotonic either way (`F3-ADR-005` is the fifth ADR, not the
third).

---

## Numbering

### Epics — `E-N`
Version-agnostic, monotonically increasing across all releases. Do not restart
numbering with a new version. Zero-padding is optional (`E-1` and `E-01` are both
fine) — be consistent within a project.

### Tasks — pick one scheme per project and record it in `CLAUDE.md`

**Scheme A (default) — epic-derived, `T-XXYY`:**
- `XX` = parent epic number
- `YY` = task sequence within that epic, 01-based
- Example: `T-5601` = first task of epic E-56
- Good when epics are stable; the ID tells you the parent at a glance.

**Scheme B — flat global sequence, `T-NNNN`:**
- A single zero-padded counter across the whole project, independent of epics.
- Example: `T-0001` … `T-0398`; epic membership is carried by the doc structure,
  not by the ID.
- Good when tasks get re-parented during breakdown, or when a feature's epics are
  numbered in a shared cross-feature sequence (renumbering an epic would otherwise
  invalidate every task ID under it).

Whichever you pick, the rule is the same: **never reuse a number**, and record the
scheme plus the last-used value in `CLAUDE.md`'s counter table. Do not mix schemes
within a project.

### User stories — `US-N`
Assigned per feature block, continuous across versions; the counter runs past two
digits as the project grows. Do not reuse a US number when a story is dropped, or
when a block turns out to be shorter than a downstream doc assumed — leave the gap
retired and note it in the counter table.

### ADRs — `ADR-NNN`
Three-digit, monotonic across the project. For ADRs scoped to a single
epic, use `ADR-E<epic>-<slug>.md` instead (e.g. `ADR-E56-play-pause-toggle.md`).

### The counter table

Every project's `CLAUDE.md` keeps a counter table to prevent reuse:

```markdown
| Counter | Last used | Notes |
|---|---|---|
| Epic | E-12 | E-01–E-04 = feature A; E-05–E-08 = feature B; E-09–E-12 = feature C |
| Task | T-1207 | — |
| User story | US-18 | — |
| ADR | ADR-003 | ADR-E01–ADR-E12 are epic-scoped |
```

Update the table whenever a new number is claimed. The "Notes" column is
where you record which numbers went to which feature, so a future
contributor can see the history at a glance.

---

## Required frontmatter / header

Every spec document starts with this block at the very top:

```markdown
# {{Document title}}
**Version:** {{X.Y}}
**Status:** {{Draft | In Review | Accepted | Superseded}}
**Date:** {{YYYY-MM-DD}}
**Platform:** {{e.g. iOS 26 (iPhone, portrait) — SwiftUI; or Next.js 15 on Azure SWA; or .NET 9 Web API on Azure App Service}}
**References:** {{comma-separated list of other docs this depends on}}

**Amendment history**

| Version | Date | Summary |
|---|---|---|
| X.Y | YYYY-MM-DD | Initial draft. |
```

`Amendment history` is non-negotiable. It is how downstream agents and
reviewers tell whether the version they were briefed against is still
current.

---

## Section structure — per-feature spec

The canonical order. Match it exactly; don't invent new sections.

1. **Introduction** — what this feature is and what it changes.
2. **Technical Context** — table of settled decisions.
3. **Goals** — bullet list of verifiable outcomes.
4. **Out of Scope (this version)** — explicit exclusions.
5. **User Stories** — one per distinct user need (template below).
6. **Error States** — table mapping every failure to expected behaviour.
7. **Non-Functional Requirements** — latency budgets, accessibility,
   privacy, availability.
8. **Flows / Behaviour** — sequences, state machines, and the pinned wire/schema
   shapes the feature owns. Optional for a feature with no non-obvious control
   flow; required as soon as another feature has to compile against a shape.
9. **Open Questions** — numbered, owned, with default assumptions.
10. **Resolved Decisions** — audit trail of questions answered during writing.

A feature spec may also open its Introduction with explicit **What is in scope** /
**What is NOT in scope** lists. Those are part of section 1, not new sections.

### User story format

```markdown
**US-NN — {{Short title}}**
> As a {{user type}}, I want to {{action}} so that {{outcome}}.

**Acceptance criteria:**
- Observable behaviour 1 — independently verifiable
- Observable behaviour 2
- ...
```

Each criterion must map to **one yes/no verification**. "The app is
responsive" is not a criterion. "The orb begins listening within 200 ms
of tap" is.

---

## Section structure — design spec

1. **Material system** — surfaces, materials, blur, shadow.
2. **Per-screen / per-component spec** — repeat the block below for
   every screen or component the feature introduces.
3. **Out of scope** — visual decisions explicitly deferred.

### Per-component block

```markdown
### {{Component name}}

**Trigger:** {{what causes this to appear}}
**Layout:** {{spatial arrangement; use spacing tokens by name, e.g. `spacing16`, not `16pt`}}
**Typography:** {{role, font, weight, size token, colour token per text element}}
**Colour & Material:** {{surface + token per layer}}
**Iconography:** {{icon name (SF Symbol, Lucide, etc.), rendering mode, size token, colour overrides}}
**Interaction States:** {{default / pressed / disabled / loading / error / success — what changes per state}}
**Motion & Animation:** {{trigger, type, duration / spring params, properties animated; Reduce Motion fallback}}
**Haptics:** {{action → haptic feedback method (e.g. `HapticEngine.shared.commandRecognised()` on iOS, or platform equivalent; "none" on web)}}
**Accessibility:** {{accessible label (`accessibilityLabel` on iOS, `aria-label` on web), screen-reader announcement, Dynamic Type / text-zoom behaviour, minimum 44×44 pt or 48×48 dp tap target}}
```

Never hardcode hex values or raw point sizes. If a value is needed
and has no token yet, flag it as an open question instead of
inventing a raw value.

---

## Section structure — epics & tasks

1. **Overview** — what this doc covers, what it delivers, where in the
   tree the work lands.
2. **Epic index** — table of every epic in the feature with its user
   stories and one-line description.
3. **Per-epic block** (repeated):
   - Epic description (2–4 sentences)
   - `Depends on:` and `Unlocks:` lines
   - Tasks as a checklist:

```markdown
- [ ] **T-XXYY** Plain-language description of the change. Name the file(s)
  touched and the public symbols added or modified. End with a one-line
  dependency note.
  *Depends on: T-XXYY, T-XXYY.*
```

Tasks are checked off as they merge. Do not check off a task before the
work is merged — the checkbox state is the project's single source of
truth for progress.

---

## ADR shape

ADRs are short by default — five sections, one page:

1. **Decision** — the chosen approach, 2–4 sentences.
2. **Context** — constraints and prior decisions that shape this one.
3. **Options considered** — at least two, with one-line trade-offs.
4. **Rationale** — why the chosen option wins.
5. **Consequences** — follow-on work, limitations, what becomes possible.

For epic-scoped ADRs, add a **File-level plan** subsection at the end of
the Decision section listing the new files/types introduced and which
existing files are modified. That table is the contract the Implementer
follows.

**The one sanctioned exception to "one page":** an ADR that consolidates a
`securityreviewer` Mode-A pass. Folding the reviewer's findings in as numbered,
individually testable **Conditions** — rather than leaving them in a separate
review artefact — is what makes the verdict auditable, and it is worth the length.
Such an ADR adds, after Consequences:

6. **Conditions** — `C-N`, one per finding or architect obligation. Each states
   the invariant, names the finding it closes (`SR-N`), and ends with how it is
   verified (test, lint rule, or inspection).
7. **Public interface contract** — the types and signatures downstream features
   compile against. No downstream feature may widen or narrow these without a
   superseding ADR.
8. **New follow-up questions** — anything raised but not closed, with a named owner.

Everything else still applies: no narrative, no restating the spec, and every
condition testable. If a *non*-security ADR runs past a page, it is still usually
two ADRs.

---

## Open Questions — numbering

Every spec doc uses the same scheme: questions are numbered `Q-1`,
`Q-2`, … within the doc. They keep their number when they move into
the **Resolved Decisions** table — the audit trail relies on stable
IDs. Do not reuse a `Q-N` after a question is resolved; if a new
question arises, give it the next number.

Cross-feature questions live in the **master spec** only. Feature-
specific questions live in the **feature spec** (and design spec)
only. Do not duplicate.

---

## Status values

Every spec doc uses one of these four status values:

- **Draft** — work in progress, not yet ready for review
- **In Review** — being reviewed by the architect or stakeholders
- **Accepted** — locked; downstream work may begin
- **Superseded** — replaced by a later version (note which one)

ADRs use the same four values. If an ADR is superseded, the Status
line reads `Superseded by ADR-NNN` so the chain is traceable.

---

## When in doubt

Look at the highest-numbered existing version in `specifications/`
and match its tone and detail level. Do not invent a new structure
if one already exists. If you genuinely need a new section, propose
it as an Open Question first.
