# Epics & Tasks: {{Feature name}} ({{Project}} v{{X.Y}} — Feature {{N}})
**Version:** 1.0
**Status:** Draft
**Date:** {{YYYY-MM-DD}}
**References:** `spec-{{feature}}.md` (v1.0), `design-spec-{{feature}}.md` (v1.0), `ADR-{{NNN}}-{{feature}}.md`, master spec, CLAUDE.md

---

## Overview

{{2–3 paragraphs.}}

- What this doc breaks down (which feature, what version).
- What the deliverable is, in concrete terms (new files? changes to
  which existing files? new public symbols?).
- Where the work lands in the source tree.

Epic numbering begins at **E-{{XX}}**, continuing from earlier epics.
Task numbering begins at **T-{{XX01}}**.

---

## Epic Index

| # | Epic | User Stories | Feature Area |
|---|---|---|---|
| E-{{XX}} | {{Epic name}} | US-{{NN}} | {{one-line scope}} |
| E-{{XX+1}} | {{Epic name}} | US-{{NN, NN}} | {{one-line scope}} |
| E-{{XX+2}} | {{Epic name}} | US-{{NN}} | {{one-line scope}} |

---

## E-{{XX}} — {{Epic name}}

{{2–4 sentences describing the epic. State the goal in plain language,
and the user-visible deliverable.}}

**Depends on:** {{none, or list other epics and the specific tasks
within them that must merge first}}
**Unlocks:** {{which downstream epics start after this lands}}

---

Each task is prefixed with `[Implementer]` or `[TestWriter]` to make
ownership unambiguous — both agents can read this doc and pick up
their own tasks without collision. Unit tests live with the
implementation and are owned by `[Implementer]`; integration and
acceptance tests are owned by `[TestWriter]`.

### {{Subsection — e.g. "Card structure refactor"}}

- [ ] **T-{{XX01}}** `[Implementer]` {{Plain-language description of
  the change. Name the file(s) touched in `path/to/file.ext`. Name
  the public symbols added or modified. If a refactor: state
  explicitly what does and doesn't change in behaviour. Avoid
  implementation detail that belongs to the implementer.}}
  *No dependencies. Prerequisite for T-{{XX02}}, T-{{XX05}}.*

- [ ] **T-{{XX02}}** `[Implementer]` {{Description, including the
  unit tests added alongside the production code.}}
  *Depends on: T-{{XX01}}.*

### {{Subsection}}

- [ ] **T-{{XX03}}** `[Implementer]` {{Description.}}
  *Depends on: T-{{XX02}}.*

### Verification

- [ ] **T-{{XX04}}** `[TestWriter]` {{Acceptance tests for US-NN. Name
  the test file and the user-story criteria covered.}}
  *Runs in parallel with T-{{XX01}}–T-{{XX03}} against the ADR's
  public interface contract.*

- [ ] **T-{{XX05}}** `[TestWriter]` {{Integration tests covering the
  error states from the spec's Error States table.}}
  *Runs in parallel with implementation; depends on the ADR being
  PROCEED-stamped, not on T-{{XX01}}.*

---

## E-{{XX+1}} — {{Epic name}}

{{Repeat the structure above per epic.}}

**Depends on:** {{...}}
**Unlocks:** {{...}}

---

## Cross-epic notes

{{Optional. Anything that applies across all epics in this feature:
shared helpers added in one epic and consumed in another, error-surface
contracts, shared state introduced once and reused.}}
