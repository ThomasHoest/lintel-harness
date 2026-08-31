# Specifications — Lintel Harness

Index of this project's specification set. The **process** — document
types, the gated flow, ownership rules, naming and numbering — lives in
the coding pack at `packs/coding/specifications/README.md` and
`packs/coding/specifications/conventions.md`. This file only says what
is here.

---

## Layout

| Path | Holds |
|---|---|
| `lintel-harness-brief.md` | The product brief. **Q-1…Q-46 resolved**, with rationale |
| `general/` | Cross-cutting reference specs, version-spanning |
| `v1.0/` | Everything scoped to v1.0 |

---

## Cross-cutting references (`general/`)

| Document | What it covers | Status |
|---|---|---|
| `pack-application.md` | The two-phase apply model, with flowchart and the recipe primitive set | Draft |
| `pack-inventory.md` | All three packs — tree structure, per-file phase metadata, versions, anatomy matrix | Draft |
| `system-architecture.md` | Whole-system view | **Not written** |
| `technology-choices.md` | Per-component technology choices | **Not written** |

The two required documents are outstanding. Both should be written
before implementation begins — `system-architecture.md` in particular,
since the two-phase model (Q-39) changed the shape of the system after
F1 and ADR-001 were written.

---

## v1.0

| Document | Status |
|---|---|
| `LintelHarnessSpecification-1.0.md` | Draft — master spec |
| `F1-spec-pack-format-and-manifest.md` | Draft |
| `F1-ADR-001-pack-format-and-manifest.md` | PROCEED (architecture); security re-review outstanding |
| `F5-spec-template-packs.md` | Draft |
| `research-planning-pack-framing.md` | Draft |

> [!warning] These four documents predate Q-39…Q-46.
> They still describe declarative `mappings`, a `.harness/base/` store,
> marked regions throughout, `--adopt`, and `update`/`status`/
> `contribute` as v1.0 features. All of that changed with the two-phase
> model. **They must be rewritten before implementation.** The settled
> model is in `general/pack-application.md`.

**Also outstanding:** the security review's last recorded verdict is
`REVISE-SPEC`. The remediation was folded in, but no fresh
`SECURITY-PROCEED` has been issued, and no epics-and-tasks document
exists. F2, F3, F4 and F6 have stubs only.

---

## Conventions in force

- **Filenames** — feature-prefixed (`F1-spec-…`, `F1-ADR-001-…`)
- **Task IDs** — Scheme A, epic-derived `T-XXYY`
- **Status values** — `Draft | In Review | Accepted | Superseded`
- **Open questions** — `Q-N`, keeping the ID into Resolved Decisions.
  Q-1…Q-46 used; next free **Q-47**
- **User stories** — `US-N`, project-monotonic. US-1…US-29 used; next free **US-30**

```
research → spec → design-spec (if UI) → ADR (PROCEED) → epics-and-tasks → implementation
```
