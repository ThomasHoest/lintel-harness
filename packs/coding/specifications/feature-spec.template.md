# {{Feature name}} Specification — {{Project}} v{{X.Y}}
**Version:** 1.0
**Status:** Draft
**Date:** {{YYYY-MM-DD}}
**Platform:** {{e.g. iOS 26 (iPhone, portrait) — SwiftUI; or Next.js 15 on Azure SWA; or .NET 9 Web API}}
**Design spec:** {{`design-spec-<feature>.md` — or "n/a (no UI)"}}
**ADR:** {{`ADR-<NNN>-<feature>.md` — filled in by the architect after the spec is reviewed}}
**References:** {{master spec, CLAUDE.md, related research docs, prior ADRs}}

**Amendment history**

| Version | Date | Summary |
|---|---|---|
| 1.0 | {{YYYY-MM-DD}} | Initial draft. {{One sentence on what this feature adds.}} |

---

## Introduction

{{2–4 paragraphs.}}

- What is this feature? Who is it for? What problem does it solve?
- How does it relate to existing behaviour — does it replace, extend, or
  add a new surface?
- What is **explicitly out of scope** for this version (call this out
  inline, not just in the section below — the boundaries matter).

### What is in scope

- {{Bullet 1 — be concrete; name the components/surfaces this feature touches}}
- {{Bullet 2}}
- {{Bullet 3}}

### What is NOT in scope

{{Refer to the design spec or master spec where applicable, then list
any feature-specific exclusions.}}

- {{Exclusion 1}}
- {{Exclusion 2}}

---

## Technical Context

| Decision | Choice | Rationale |
|---|---|---|
| {{Decision name}} | {{choice}} | {{one-line rationale, linking to design spec or research where relevant}} |
| {{Decision name}} | {{choice}} | {{rationale}} |

Only include settled decisions. Unsettled work belongs in **Open Questions**.

---

## Goals

- {{Verifiable outcome 1}}
- {{Verifiable outcome 2}}
- {{Verifiable outcome 3}}

Each goal must be assessable as yes/no at the end of the feature work.

---

## Out of Scope (this version)

- {{Specific exclusion 1 — and target version if deferred}}
- {{Specific exclusion 2}}

---

## User Stories

One per distinct user need. Match this format exactly.

---

**US-NN — {{Short title}}**
> As a {{user type}}, I want to {{action}} so that {{outcome}}.

**Acceptance criteria:**
- {{Observable behaviour — one yes/no verification}}
- {{Observable behaviour}}
- {{Cover happy path, then key error paths}}
- {{Include any timing, ordering, or constraint requirements explicitly}}

---

**US-NN — {{Short title}}**
> As a {{user type}}, I want to {{action}} so that {{outcome}}.

**Acceptance criteria:**
- {{Observable behaviour}}
- {{Observable behaviour}}

---

{{Repeat per story.}}

---

## Error States

Map every failure scenario to the exact expected behaviour. If a
confirmation string or error message is shown to the user, write it
verbatim here.

| Scenario | Expected Behaviour |
|---|---|
| {{Scenario 1, e.g. "Speaker unreachable mid-command"}} | {{Behaviour, e.g. "Show toast `Couldn't reach {{name}}.` for 3 s; revert button state; fire `errorOccurred` haptic"}} |
| {{Scenario 2}} | {{Behaviour}} |

---

## Non-Functional Requirements

- **Latency:** {{e.g. "Touch-up to visible state change ≤ 200 ms on a standard home network"}}
- **Accessibility:** {{e.g. "Every new control reachable by VoiceOver with explicit accessibilityLabel; minimum 44×44 pt tap target"}}
- **Privacy:** {{e.g. "No new data leaves the device; existing telemetry pipeline unchanged"}}
- **Availability:** {{e.g. "Feature degrades gracefully when speaker is offline; never blocks the rest of the UI"}}
- **Performance:** {{e.g. "Card render time ≤ 16 ms on iPhone 12"}}
- **Localisation:** {{e.g. "All new strings localised in en-GB and da-DK"}}

Be specific. "Fast" is not a requirement; "under 3 seconds on a standard
home network" is.

---

## Flows / Behaviour

{{Optional. Use this section when a sequence of interactions is hard
to express purely as acceptance criteria — e.g. a multi-step onboarding,
a long-running async flow with intermediate states, or a state machine.
Use diagrams or prose, whichever is clearer.}}

---

## Open Questions

Feature-specific questions only. Cross-feature questions belong in
the master spec. Questions keep their `Q-N` when they move to the
Resolved table below — the audit trail relies on stable IDs.

| # | Question | Owner | Default assumption |
|---|---|---|---|
| Q-1 | {{Question}} | {{role}} | {{what we build if this stays unresolved}} |
| Q-2 | {{Question}} | {{role}} | {{...}} |

---

## Resolved Decisions

| # | Question | Decision | Date |
|---|---|---|---|
| Q-N | {{Question raised during spec writing}} | {{Resolution}} | {{YYYY-MM-DD}} |
