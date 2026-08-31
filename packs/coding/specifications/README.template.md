# Specifications — {{harness:param.projectName}}

Index of this project's specification set. The **process** — document
types, the gated flow, ownership rules, naming and numbering — lives in
the pack at `.harness/pack/specifications/README.md` and
`.harness/pack/specifications/conventions.md`. This file only says what
is here.

---

## Layout

| Path | Holds |
|---|---|
| `project-brief.md` | The product brief. Everything else is downstream of it |
| `<Project>Specification-X.Y.md` | Master spec — one per version |
| `general/` | Cross-cutting reference specs, version-spanning |
| `vX.Y/` | Everything scoped to one version. Frozen once shipped |

---

## Cross-cutting references (`general/`)

| Document | What it covers |
|---|---|
| `system-architecture.md` | Whole-system view: principles, containers, the trust-critical path |
| `technology-choices.md` | Per-component technology choices, reasoning, unclarity register |

Both are required. Add further `general/<topic>.md` documents for any
mechanism, model or inventory that spans features and outlives the
current version.

---

## Versions

| Version | Status | Folder |
|---|---|---|
| v1.0 | Draft | `v1.0/` |

---

## Conventions in force

Recorded here so a reader does not have to infer them:

- **Filenames** — the plain variant: `spec-<topic>.md`,
  `design-spec-<topic>.md`, `research-<topic>.md`,
  `epics-and-tasks-<topic>.md`. Switch to the feature-prefixed variant
  (`F3-spec-<topic>.md`) if this folder grows past a handful of features —
  and then use it for every feature, never a mix
- **Task IDs** — scheme A, epic-derived: epics `E-N`, tasks `T-XXYY` where
  `XX` is the owning epic. Scheme B (a flat `T-NNNN` counter) is the
  alternative; pick one and record the last-used value in `CLAUDE.md`
- **Status values** — `Draft | In Review | Accepted | Superseded`
- **Open questions** — `Q-N`, keeping the ID into Resolved Decisions

Every gate produces its artifact before the next begins:

```
research → spec → design-spec (if UI) → ADR (PROCEED) → epics-and-tasks → implementation
```
