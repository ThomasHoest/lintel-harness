# `general/` — cross-cutting reference specifications

Documents that describe the system as a whole rather than one release.
They span versions and are reviewed at every version bump; each carries
its own `## Change history`.

**Required:**

| Document | Covers |
|---|---|
| `system-architecture.md` | The whole-system view — principles, containers, the trust-critical path, the feature-to-component map |
| `technology-choices.md` | Per-component technology choices, the reasoning, and an unclarity register |

**Anything else** that meets both tests belongs here too:

1. It is referenced by more than one feature spec, and
2. it is still true after the current version ships.

If it is only true for this release, it belongs in the version folder
instead.

Name additional documents `general/<topic>.md`. There is no fixed
template beyond the two required documents — lead with what the reader
must know, and state which decisions the document is downstream of.
