# Version folder

Everything scoped to one version of the product. **Frozen once the
version ships** — when the next version starts, a new folder is created
rather than this one edited.

| File pattern | Document |
|---|---|
| `research-<topic>.md` | Pre-decision investigation |
| `spec-<topic>.md` | Feature spec — all detail for one feature |
| `design-spec-<topic>.md` | UI/UX spec, for features with an interface |
| `ADR-NNN-<topic>.md` | Feature-scoped Architecture Decision Record |
| `ADR-EXX-<topic>.md` | Epic-scoped ADR — file plan and interface contract |
| `epics-and-tasks-<topic>.md` | Implementation breakdown |

Every arrow below is a gate. A feature's code may only be written once
its spec set is Accepted and its ADR says `PROCEED`.

```
brief → research → spec → design-spec → ADR → epics-and-tasks → implementation
```

Templates for each document type are in
`.harness/pack/specifications/`. Read the template before writing — it
shows the section structure and the level of detail expected.

Naming and numbering rules: `.harness/pack/specifications/conventions.md`.
