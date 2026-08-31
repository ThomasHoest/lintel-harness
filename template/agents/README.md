# Agents

Drop-in Claude Code sub-agent definitions, one per role. Copy this folder
to `.claude/agents/` in the new repo's root so Claude Code can spawn them.

```
.claude/
└── agents/
    ├── architect.md
    ├── copywriter.md
    ├── designer.md
    ├── implementer.md
    ├── researcher.md
    ├── reviewer.md
    ├── securityreviewer.md
    ├── specwriter.md
    ├── target-reviewer.md
    └── testwriter.md
```

---

## What each agent does

| Agent | Purpose | Model | Permission |
|---|---|---|---|
| **architect** | Validates a spec and produces an ADR | Sonnet | read-only |
| **copywriter** | Writes user-facing site copy from a tone-of-voice guide | Opus | read + write |
| **designer** | Writes UI/UX design specs from a functional spec | Sonnet | read + write |
| **implementer** | Writes code + unit tests from a spec + ADR | Sonnet | read + write + bash |
| **researcher** | Investigates technical topics with web + local search | Sonnet | read-only |
| **reviewer** | Reviews code for quality, correctness, security | Haiku | read-only |
| **securityreviewer** | Validates security requirements at the ADR gate; verifies the code meets them at the review gate | Sonnet | read-only |
| **specwriter** | Turns a brief into a functional specification | Opus | read + write |
| **target-reviewer** | Gates a target's Readiness before an unsupervised run | Sonnet | read-only |
| **testwriter** | Writes integration / acceptance tests against the spec | Sonnet | read + write + bash |

Each `.md` file is self-contained — frontmatter at the top configures the
tools, model, and permission mode; the body is the system prompt.

> The **copywriter** is deliberately incomplete on its own: it carries the
> web-copy craft but **not** the brand voice. It reads that from an external
> **tone-of-voice guide** (see `template/copy/tone-of-voice.template.md`;
> copy it to a product's copy area and fill in the voice + worked examples).
> No guide → the copywriter halts and asks for one. This keeps one voice
> document as the single source of truth across every surface.

---

## How agents work in Claude Code

When a user mentions a role by name, or an agent team prompt names one
explicitly, Claude Code reads the corresponding `.md` file and spawns a
sub-agent with:

- The body of the file as the system prompt
- Only the tools listed in the `tools:` frontmatter
- The model named in the `model:` frontmatter
- The `permissionMode:` enforced (e.g. `readonly` blocks `Edit`/`Write`/`Bash`)
- The `maxTurns:` cap on the sub-agent's reasoning loop

The agent returns one message back to the spawning Claude. The user
sees that result in the main conversation, not the sub-agent's
intermediate steps.

> **Heads-up on non-standard frontmatter fields:** Stock Claude Code
> recognises `name`, `description`, `tools`, and `model`. The
> `permissionMode:` and `maxTurns:` fields these templates use are
> conventions honoured by some harnesses (e.g. FleetView) but ignored
> by others. If you run agents through a harness that doesn't enforce
> `permissionMode`, the `tools:` whitelist is your real safety net —
> the read-only agents above omit `Write`/`Edit`/`Bash` for that
> reason. Audit before relying on these fields for hard guarantees.

---

## Customising agents for your project

Most edits land in three places:

1. **`description:`** — the trigger text Claude Code uses to decide
   which agent to spawn. Tighten the wording to your project's
   vocabulary (e.g. mention your specific spec folder path).
2. **`model:`** — swap models as needed. Heavier reasoning → Opus.
   Code review and quick checks → Haiku. Default workhorse → Sonnet.
3. **Body — Context Discovery section** — every agent reads project
   conventions before doing its work. Update the paths and filenames
   so they point at your real spec folder, your real design tokens
   file, your real ADR directory.

Beyond those three, leave the agent prompts alone unless you have a
specific reason to change them — they encode the practices that make
the agent useful.

---

## When to add a new agent

Add a new role file only when:

- The role is **distinct in inputs or outputs** from existing agents
  (e.g. a "data-modeler" that owns schema migrations).
- The role is **invoked often enough** to justify a reusable definition.
- The role has a **clear file-ownership boundary** so it doesn't collide
  with existing agents.

Don't add a new agent for a one-off task — just describe what you want
in the prompt and let the default `claude` agent handle it.

---

## File ownership in multi-agent teams

When agents work in parallel inside a team, partition file ownership so
no two agents edit the same file. Recommended split:

| Agent | Owns | Read-only access to |
|---|---|---|
| architect | `docs/adr/**` | everything |
| implementer | `Sources/**`, `Tests/Unit/**` | `docs/adr/**`, `docs/specs/**` |
| testwriter | `Tests/Integration/**`, `Tests/Acceptance/**` | `docs/adr/**`, `docs/specs/**`, `Sources/**` |
| specwriter | `docs/specs/**` | everything |
| designer | `docs/specs/design-spec-*.md` | everything |
| copywriter | `docs/specs/copy-deck-*.md`, the `messages/` copy source | everything (esp. the tone-of-voice guide) |
| researcher | (read-only) | everything |
| reviewer | (read-only) | everything |
| securityreviewer | (read-only) | everything |
| target-reviewer | (read-only) | the target file + the project checks its criteria name |

Adapt the paths to your project. The principle holds: **one writer per
file at a time**.
