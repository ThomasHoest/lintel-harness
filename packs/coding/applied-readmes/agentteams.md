# `AgentTeams/` — multi-role prompts

Each file is a complete seed prompt. Paste one as your first message and
the lead spawns the team it describes.

| Prompt | Use when |
|---|---|
| `Specify.md` | Taking a brief through the whole spec phase — research, spec, design spec, ADR, security review, epics |
| `Implement.md` | The spec set is PROCEED-stamped and you are ready to build |

The intended flow is `Specify.md` → review the output yourself →
`Implement.md`.

**Skip the team** for bug fixes, renames, dependency bumps and trivial
refactors. Spinning one up has overhead; use it when the work has
several distinct outputs or when parallelism genuinely shortens things.

Each prompt ends with a placeholder block describing the work. Fill it
in before pasting — vague briefs produce vague specs.

Background on how teams are coordinated: `.harness/pack/agent-teams/README.md`.
