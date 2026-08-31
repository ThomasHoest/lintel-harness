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

- **Filenames** — {{harness:param.filenameVariant}}
- **Task IDs** — {{harness:param.taskScheme}}
- **Status values** — `Draft | In Review | Accepted | Superseded`
- **Open questions** — `Q-N`, keeping the ID into Resolved Decisions

Every gate produces its artifact before the next begins:

```
research → spec → design-spec (if UI) → ADR (PROCEED) → epics-and-tasks → implementation
```
