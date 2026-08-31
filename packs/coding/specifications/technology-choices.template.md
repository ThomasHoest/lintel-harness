# Technology Choices — {{Product}}

**Status:** {{Draft | In Review | Accepted | Superseded}}
**Applies to version:** {{vX.Y}}
**Date:** {{YYYY-MM-DD}}
**Sources:** {{master spec; ADRs; research (R-…); reference docs; any vendor/decision register}}

> Per-component technology choices with the reasoning behind each, and every open
> question / unclarity flagged inline (⚠️). The "what runs on what and why" companion to
> `system-architecture.md`. {{One line on the governing decision — e.g. "reuse the
> {{existing}} stack to de-risk" vs "greenfield".}} Choices behind a **port/abstraction**
> are starting hypotheses swappable at implementation eval; the load-bearing
> architectural choices are firmer — mark each with a firmness.
>
> **Living document.** Review on every version bump; keep the `## Change history` current.

---

## 1. Summary of the stack

| Layer | Choice | Firmness |
|---|---|---|
| Core pattern / domain model | {{choice}} | {{**Firm** / ⚠️ pending / behind a port}} |
| Backend runtime | {{choice}} | {{firmness}} |
| {{Domain-critical subsystem — e.g. LLM / payments / event store}} | {{choice}} | {{firmness}} |
| Datastore | {{choice}} | {{firmness}} |
| Web / frontend | {{choice}} | {{firmness}} |
| {{Mobile / app, if any}} | {{choice}} | {{firmness}} |
| Hosting | {{cloud + region}} | {{firmness}} |
| Credentials / secrets / KMS | {{choice}} | {{firmness}} |
| CI/CD | {{choice}} | {{firmness}} |
| Observability | {{choice}} | {{firmness}} |
| {{External integrations…}} | {{choice}} | {{behind a port}} |

---

## 2. Core & backend

### 2.1 {{Core pattern / runtime}} — **why**
{{Why this choice, in terms of the domain's demands. Name the documented alternative if
there is one, and what would trigger a switch. Flag ⚠️ if a decision is pending sign-off.}}

### 2.2 {{Second core choice}} — **why**
{{…}}

---

## 3. {{Domain-critical subsystem — e.g. LLM & AI}}

### 3.1 {{choice}} — **why (+ ⚠️ open flags)**
{{The reasoning; the residency / cost / accuracy tradeoffs; the fallback kept behind an
abstraction; any open flags gated on research or legal/founder sign-off.}}

### 3.2 {{tiering / roles, if applicable}}
{{e.g. a model role-tiering table behind a provider-neutral interface, with rationale +
list prices; or the equivalent for the domain subsystem.}}

---

## 4. Frontend

{{The web / app choices with a one-line why each; icon set / design-system note; what is
thin-in-v1.0 vs deferred.}}

---

## 5. Hosting & infrastructure

**{{Cloud + region}}** — {{who decided, and why (co-location, residency, reuse, cost).}}

Anticipated managed services:
- **Compute:** {{choice}}. {{⚠️ open sizing/shape decisions.}}
- **Database:** {{choice}}. {{sizing; single vs multi-AZ / pooled; ⚠️ residual.}}
- **Object storage / secrets / networking:** {{choices}}.
- **CI/CD:** {{choice}} — {{branch→env mapping, pipeline shape.}}
- **Observability:** {{choice}}. {{⚠️ self-host vs managed tradeoff.}}

> {{Residency / compliance caveat if the domain carries special-category data, CLOUD-Act,
> GDPR, etc. — or an explicit note that it does NOT, and why that relaxes the choice.}}

---

## 6. External integrations (per-component)

| Integration | Choice | Why | ⚠️ Open |
|---|---|---|---|
| {{integration}} | {{choice (behind a port?)}} | {{why}} | {{open question}} |

---

## 7. Cross-cutting

- **{{Security / untrusted-input boundary}}:** {{how it's enforced.}}
- **{{Credentials / least-privilege}}:** {{scope + storage + rotation.}}
- **{{Multi-tenancy / isolation, if any}}:** {{the hard invariant.}}
- **{{Audit / consent / privacy}}:** {{the posture.}}

---

## 8. Consolidated unclarities (⚠️ register)

{{Everything flagged ⚠️ above, gathered and numbered for the founder/architect, each
cross-referenced to the spec `Q-N` / research it comes from. Note which items feed the
cost estimate.}}

1. **{{Unclarity}}** — {{owner / what unblocks it}}.
2. …

---

## Change history

| Version | Date | Author | Change |
|---|---|---|---|
| {{vX.Y}} | {{YYYY-MM-DD}} | {{name / agent}} | Initial version. {{One sentence.}} |
