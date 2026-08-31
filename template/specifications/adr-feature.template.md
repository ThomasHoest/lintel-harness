# ADR-{{NNN}} — {{Title}}

**Status:** {{Draft | In Review | Accepted | Superseded by ADR-NNN}}
**Date:** {{YYYY-MM-DD}}
**Deciders:** {{names / roles}}
**Refs:** `spec-{{feature}}.md`, `design-spec-{{feature}}.md` (if any), prior ADRs, CLAUDE.md

This template is for **feature-scoped** ADRs — the architectural
shape of a whole feature. For ADRs scoped to one epic (with a
file-level plan and a public interface contract), use
`adr-epic.template.md` instead.

---

## 1. Decision

{{The chosen approach in 2–4 sentences. State it as a decision, not
a discussion. If the decision has multiple parts, write them as a
short list — but the whole section should still fit in a paragraph.}}

---

## 2. Context

{{The constraints and prior decisions that shape this one. Bullets are
fine if there are multiple. Reference prior ADRs by number. The point of
this section is so a future reader can tell why this decision was right
*at the time* — even if the codebase later moves past it.}}

**Prior decisions and constraints:**

- **{{Prior ADR / spec / constraint}}.** {{Sentence on what it locks in.}}
- **{{Prior decision.}}** {{Sentence on its implication for this decision.}}

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

{{Why the chosen option wins given the constraints in §2. One paragraph.
This is the "why" a future reader will reach for first — make it
defensible, not just descriptive.}}

---

## 5. Consequences

{{The follow-on work, limitations, and unblocks created by this decision.
Bullets. Both positive and negative.}}

- {{Consequence 1 — what this unblocks downstream}}
- {{Consequence 2 — what this constrains downstream}}
- {{Consequence 3 — what existing code is affected}}
- {{Consequence 4 — what gets harder under this decision}}

---

## 6. Open follow-ups

{{Optional. Anything this ADR doesn't resolve but that needs to be
decided before the next ADR in the chain.}}
