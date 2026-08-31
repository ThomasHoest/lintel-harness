# System Architecture — {{Product}}

**Status:** {{Draft | In Review | Accepted | Superseded}}
**Applies to version:** {{vX.Y — N-feature baseline: F1…FN}}
**Date:** {{YYYY-MM-DD}}
**Sources:** {{master spec; the load-bearing ADRs; research docs; any reference docs this synthesises}}

> The "shape of the whole system in one place" companion to `technology-choices.md`.
> Where the per-feature specs answer *"what does this feature do?"*, this answers
> *"how does the whole system fit together?"*. {{One line on the framing — e.g. which
> stack, and whether the choices are reused from an existing platform or greenfield.}}
>
> **Living document.** Review on every version bump; keep the `## Change history` current.

---

## 1. Architectural principles (the shape in one breath)

{{5–10 bullets — the load-bearing invariants that define the system, each a **bold
lead** + one sentence. State the KIND of thing that matters for this system, e.g.:
the core data/domain model; control-flow discipline (deterministic code vs AI
judgement); the trust / fail-closed gate; isolation & tenancy; the security /
untrusted-input boundary; auditability; what is reused vs built; the v1.0 narrowing.}}

- **{{Principle}}.** {{One sentence.}}
- **{{Principle}}.** {{One sentence.}}
- …

---

## 2. Container diagram (system context + containers)

{{A Mermaid `flowchart`/`graph` showing the system context + the major containers
(services, datastores, external systems) and the primary runtime flow. Group with
subgraphs. Solid arrows = primary runtime flow; dotted = control / human-in-the-loop.
Keep each node label to a component name + a one-line role.}}

```mermaid
flowchart TB
    {{external sources}} --> {{ingress}}
    subgraph app["{{the system} ({hosting} · {runtime})"]
      {{components + primary flow}}
    end
    {{components}} --> {{datastore}}
    {{components}} --> {{external services}}
```

**How to read it:** {{one or two sentences — what solid vs dotted arrows mean, and the
single most important path through the system.}}

---

## 3. The trust-critical path — {{name the load-bearing gate / flow}}

{{Every system has one path that must not fail — a send-gate, a payment authorisation,
an auto-ship gate, an auth boundary. Diagram or step it out here and state the
**fail-closed** posture explicitly: what conditions must hold, and what the default is
when any is unmet.}}

```
{{step-by-step or a small diagram of the gate, ending in the pass vs fail branches}}
```

---

## 4. Feature → component map

{{A table mapping each feature (F1…FN) to the component/layer that owns it, so the
per-feature specs and this architecture stay in sync.}}

| Layer | Features | Responsibility |
|---|---|---|
| {{layer}} | {{F…}} | {{one line}} |

---

## 5. Key technology decisions (as of {{vX.Y}})

{{A compact at-a-glance table of the load-bearing choices, each with a source reference.
Full per-component reasoning lives in `technology-choices.md`.}}

| Concern | Choice | Source |
|---|---|---|
| {{concern}} | {{choice}} | {{ADR / research / reference}} |

> {{Note any items still pending sign-off / open sub-choices; point at
> `technology-choices.md` §8 and the relevant feature ADRs.}}

---

## Change history

| Version | Date | Author | Change |
|---|---|---|---|
| {{vX.Y}} | {{YYYY-MM-DD}} | {{name / agent}} | Initial version. {{One sentence.}} |
