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
| `project-brief.md` | The product brief. **Q-1…Q-62 resolved**, with rationale |
| `general/` | Cross-cutting reference specs, version-spanning |
| `v1.0/` | Everything scoped to v1.0 |

---

## Cross-cutting references (`general/`)

| Document | What it covers | Status |
|---|---|---|
| `pack-application.md` | The two-phase apply model, with flowchart and the recipe primitive set | Draft |
| `pack-inventory.md` | All three packs — tree structure, per-file phase metadata, versions, anatomy matrix | Draft |
| `system-architecture.md` | Whole-system view — principles, container diagram, the `validate → plan → journal → write` trust path, the feature→component map | Draft |
| `technology-choices.md` | Per-component technology choices, and the **⚠️ register** of capabilities the specs require but for which nothing has been chosen | Draft |
| `interaction-model.md` | What using the product is *like* — the two entry points, the CLI/skill seam, the disclosure, `update` and the reconciliation. Carries `IM-n` requirements F2/F3/F6 cite | Draft |

**All five are now written.** The two that were outstanding —
`system-architecture.md` and `technology-choices.md` — were the ones the
two-phase model (Q-39) had left the set without; `interaction-model.md`
joined them under Q-57, which made the conversational path primary and
so made *what it is like to use* a specifiable surface rather than a
matter of taste.

Being written is not being current. These are living documents whose
whole purpose is to be cross-cutting, which is exactly what makes them
the ones a decision folded into F1 or F5 silently falsifies — see the
fold-check rule in the root `CLAUDE.md`.

---

## v1.0

| Document | Status |
|---|---|
| `LintelHarnessSpecification-1.0.md` | Draft — master spec |
| `F1-spec-pack-format-and-manifest.md` | Draft — **v2.7** |
| `F1-ADR-001-pack-format-and-manifest.md` | PROCEED (architecture); security re-review outstanding |
| `F5-spec-template-packs.md` | Draft — **v2.7** |
| `research-planning-pack-framing.md` | Draft |

> **The two-phase rewrite is done.** An earlier warning here said these
> documents predated Q-39…Q-46 and still described declarative
> `mappings`, a `.harness/base/` store, marked regions and `--adopt`.
> **That is no longer the case** — F1 and F5 were rewritten against the
> two-phase model at v2.0 and have been amended through **v2.7**.
> `general/pack-application.md` remains the authoritative statement of
> the model itself.

**Still outstanding:**

- The security review's last recorded verdict is `REVISE-SPEC`. The
  remediation was folded in, but **no fresh `SECURITY-PROCEED` has been
  issued** — see `general/system-architecture.md` §6.1, which states the
  gate is closed by decision rather than by a verdict.
- **No epics-and-tasks document exists**, for any feature.
- **F2, F3 and F6 have no feature spec** — stubs only. F3 is the newest
  gap: **Q-62 returned `update` to v1.0**, so v1.0 is a five-feature
  baseline (F1, F2, F3, F5, F6) and F4/`contribute` alone is deferred.
  Anything here or in `general/` that still reads "F3 and F4 are v1.1"
  predates Q-62.

---

## Conventions in force

- **Filenames** — feature-prefixed (`F1-spec-…`, `F1-ADR-001-…`)
- **Task IDs** — Scheme A, epic-derived `T-XXYY`
- **Status values** — `Draft | In Review | Accepted | Superseded`
- **Open questions** — `Q-N`, keeping the ID into Resolved Decisions.
  Q-1…Q-62 used and **all resolved**; next free **Q-63**
- **User stories** — `US-N`, project-monotonic. US-1…US-38 used; next
  free **US-39**. Five are **retired and never reusable**: US-5, US-7,
  US-11, US-12 (F1) and US-23 (F5). F1's block is non-contiguous by
  design. The brief, F1, F5 and the root `CLAUDE.md` are the live
  sources; this line is an index, not the register

```
research → spec → design-spec (if UI) → ADR (PROCEED) → epics-and-tasks → implementation
```
