# ADR-E{{XX}} — {{Title}}

**Status:** {{Draft | In Review | Accepted | Superseded by ADR-EXX}}
**Date:** {{YYYY-MM-DD}}
**Deciders:** {{names / roles}}
**Scope:** Epic E-{{XX}} — {{epic name}}
**Refs:** `spec-{{feature}}.md`, `design-spec-{{feature}}.md` (if any), `epics-and-tasks-{{feature}}.md`, prior ADRs, CLAUDE.md

This template is for **epic-scoped** ADRs — the file-level plan and
public interface contract for a single epic. The Implementer follows
the file-level plan exactly; the TestWriter writes tests against the
public interface contract in parallel. For ADRs that cover a whole
feature without committing to a per-epic file plan, use
`adr-feature.template.md` instead.

---

## 1. Decision

{{The chosen approach for this epic in 2–4 sentences. State it as a
decision, not a discussion.}}

### File-level plan

The contract the Implementer follows. Every entry maps to one or
more tasks in `epics-and-tasks-{{feature}}.md`.

| File | Action | Purpose |
|---|---|---|
| `{{path/to/new/file.ext}}` | New | {{what lives here}} |
| `{{path/to/another/new/file.ext}}` | New | {{...}} |
| `{{path/to/existing/file.ext}}` | Modified | {{what changes; what stays the same}} |

### Public interface contract

The shapes the Implementer must expose so the TestWriter can write
tests against them in parallel. Code blocks, language-tagged. Keep
this section minimal — only public surface that crosses the
implementer/testwriter boundary.

```{{swift | ts | py | cs | go | …}}
{{public protocol, type, or function signature(s)}}
```

If the implementer discovers during the build that the contract must
change, they halt and surface — the TestWriter is already writing
against this contract.

---

## 2. Context

{{The constraints and prior decisions that shape this epic. Bullets
are fine if there are multiple. Reference prior ADRs by number. The
point of this section is so a future reader can tell why this
decision was right *at the time* — even if the codebase later moves
past it.}}

**Prior decisions and constraints:**

- **{{Prior ADR / spec / constraint}}.** {{Sentence on what it locks in.}}
- **{{Prior decision.}}** {{Sentence on its implication for this epic.}}

---

## 3. Options Considered

At least two. One-line trade-off per option.

### Option A — {{name}} {{(chosen)}}

{{What it is. Two sentences max.}}

Advantages: {{...}}. Disadvantages: {{...}}.

### Option B — {{name}}

{{What it is.}}

Advantages: {{...}}. Disadvantages: {{...}}.

### Option C — {{name}}

{{Rejected because {{...}}.}}

---

## 4. Rationale

{{Why the chosen option wins given the constraints in §2. One
paragraph. This is the "why" a future reader will reach for first —
make it defensible, not just descriptive.}}

---

## 5. Consequences

{{The follow-on work, limitations, and unblocks created by this
decision. Bullets. Both positive and negative.}}

- {{Consequence 1 — what this unblocks downstream}}
- {{Consequence 2 — what this constrains downstream}}
- {{Consequence 3 — what existing code is affected}}
- {{Consequence 4 — what gets harder under this decision}}

---

## 6. Conflicts flagged

{{Optional. Anything in the spec or design spec that contradicts a
prior ADR, the architecture pattern, or another epic in this
feature. Call these out explicitly — do not silently override.}}

---

## 7. Verdict

One-line, posted to the shared task list by the architect:

- `PROCEED` — Implementer and TestWriter may begin against this ADR
- `REVISE SPEC` — halt; the spec or design spec needs changes before
  implementation can start (list the specific gaps)
