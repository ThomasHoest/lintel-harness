# Agent Teams

Multi-role prompts that wire individual agents (from `agents/`) together
for a particular shape of work. Each file is a complete seed prompt — paste
it (or hand it to Claude Code as a kickoff message) and the lead Claude
will spawn the right team of sub-agents.

Copy this folder to `AgentTeams/` at the repo root of the new project.

```
AgentTeams/
├── Specify.md      ← researcher + spec writer + designer + copywriter + architect
└── Implement.md    ← implementer + test writer + reviewer (whole feature)
```

---

## How to pick a team

| Situation | Use |
|---|---|
| Take a brief through the whole spec phase | `Specify.md` |
| Spec set is PROCEED-stamped, ship the feature | `Implement.md` |

The intended flow is `Specify.md` → `Implement.md`: the first team
produces the spec set (functional spec, optional design spec, ADR,
epics-and-tasks), you eyeball it, then you hand it to the second
team to build.

For one-off changes that don't justify either team — bug fixes,
renames, dep bumps, trivial refactors — skip the team and either
prompt the default `claude` agent directly or call `implementer`
and `reviewer` ad-hoc.

---

## How agent teams run

1. Open Claude Code in the project.
2. Paste the team prompt as your first message (edit the
   "Feature to build" placeholder at the end first).
3. The lead Claude reads each role description and spawns sub-agents
   as the workflow specifies. You see status updates as each agent
   reports back.
4. The lead applies the coordination rules in the prompt — e.g. block
   the implementer until the architect posts `PROCEED`.

Most prompts include a **Coordination rules for the lead** section. That
is the lead's playbook — don't strip it out; it's what keeps the team
ordered.

---

## Customising team prompts

Most edits land in three places:

1. **Path references** — the prompts mention `Specifications/`, `Sources/`,
   `Tests/Unit/`. Replace these with your project's paths before pasting.
2. **Feature description** — the placeholder block at the end of each
   prompt is where you state what to build. Be concrete; vague briefs
   produce vague specs.
3. **File ownership table** — if your project doesn't use the
   `Sources/Tests` split, redraw the table so each agent has a
   non-overlapping write boundary.

---

## When to skip the team and do it yourself

- Renames, dependency bumps, trivial refactors → one agent or none.
- "Read this file and answer X" → just ask Claude directly.
- Anything that fits in one prompt with one expected output → no team.

Spinning up a team has overhead. Use one when the work has multiple
distinct outputs (spec, code, tests, review) or when parallelism
would genuinely shorten wall-clock time.
