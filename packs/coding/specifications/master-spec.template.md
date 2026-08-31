# {{Project}} Specification — v{{X.Y}}
**Version:** {{X.Y.0}}
**Status:** Draft
**Date:** {{YYYY-MM-DD}}
**Platform:** {{e.g. iOS 26 (iPhone, portrait) — SwiftUI; or Next.js 15 on Azure SWA; or .NET 9 Web API}}
**References:** {{prior version master spec, CLAUDE.md, any cross-feature ADRs}}

**Amendment history**

| Version | Date | Summary |
|---|---|---|
| {{X.Y.0}} | {{YYYY-MM-DD}} | Initial draft. {{One sentence on what this version adds.}} |

---

## Introduction

{{2–4 paragraphs. What is this version's headline change? What problem
does it solve? How does it relate to the previous version? Keep this
short — feature-level detail belongs in the per-feature specs.}}

### What is NOT changing in v{{X.Y}}

{{Explicit list. As important as what is changing. Examples:}}

- {{Subsystem A — unchanged from v{{X.Y-1}}.}}
- {{API integration B — unchanged.}}
- {{Deployment target — unchanged.}}
- {{Language coverage — {{...}} only.}}

---

## Technical Context

Cross-feature decisions only. Per-feature decisions belong in each
feature spec.

| Decision | Choice | Rationale |
|---|---|---|
| {{Cross-cutting decision 1}} | {{choice}} | {{rationale}} |
| {{Cross-cutting decision 2}} | {{choice}} | {{rationale}} |

---

## Goals (version-level)

- {{Verifiable outcome 1}}
- {{Verifiable outcome 2}}
- {{Verifiable outcome 3}}

Goals are version-level — each one should be assessable at release time
("did we hit it?"). Feature-specific goals live in the feature specs.

---

## Out of Scope (v{{X.Y}})

- {{Explicit exclusion 1 — with target version if known}}
- {{Explicit exclusion 2 — moved to v{{X.Y+1}}}}
- {{Explicit exclusion 3}}

---

## Feature {{N}} — {{Feature name}}

*Full detail in `spec-{{feature}}.md` · Design in `design-spec-{{feature}}.md` · Tasks in `epics-and-tasks-{{feature}}.md` · ADR in `ADR-{{NNN}}-{{feature}}.md`*

{{One paragraph. What does this feature deliver, for whom, and what
is the headline user-visible change? No acceptance criteria, no user
stories, no technical detail — those live in the linked specs.}}

<!-- Repeat the section above per feature in this version. -->

---

## Feature Dependencies

{{Delete this whole section if features are independent. Otherwise
fill the tables below.}}

### Hard dependencies

| From | To | Reason | Specific gate |
|---|---|---|---|
| {{Feature A}} | {{Feature B}} | {{why A can't ship without B}} | {{epic or task in B that unblocks A}} |

### Shared platform changes

| Change | Owner | Required by |
|---|---|---|
| {{New helper / wrapper / token}} | {{feature / epic / task}} | {{other features that consume it}} |

### Recommended sequencing

1. {{Step 1 — what lands first and why}}
2. {{Step 2 — what unblocks in parallel}}
3. {{Step 3}}

---

## Open Questions

Cross-feature only. Feature-specific questions belong in each feature
spec.

| # | Question | Owner | Status |
|---|---|---|---|
| Q-1 | {{Cross-cutting question}} | {{role/person}} | Open |
| Q-2 | {{Cross-cutting question}} | {{role/person}} | Open |

---

## Resolved Decisions

| # | Question | Decision | Date |
|---|---|---|---|
| Q-N | {{Question raised during master-spec writing}} | {{Resolution}} | {{YYYY-MM-DD}} |
