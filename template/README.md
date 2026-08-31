# Project Starter Pack

A reusable scaffold for new software projects, extracted from the Voxio
codebase. It bundles the five ingredients that survive across projects:

1. **A specification process** — how an idea becomes a buildable spec.
2. **A set of agent roles** — single-purpose Claude Code sub-agents you
   can drop into `.claude/agents/`.
3. **A set of agent teams** — two multi-role prompts (`Specify.md`, `Implement.md`) that wire those agents
   together for a particular shape of work (spec-only, full pipeline, etc).
4. **A targets way-of-working** — a contract format plus a readiness gate for
   long-running unsupervised runs with a hard stop condition.
5. **A backend-deploy template** — Bicep + shell/PowerShell scripts that
   provision an Azure Static Web App + Neon Postgres in one command.

Everything in this folder is meant to be **copied into a new project and
edited**, not consumed in-place. Filenames marked `.template.<ext>` are the
ones you rename and fill in (replace `{{PLACEHOLDERS}}` with real values).

---

## Folder layout

```
template/
├── README.md                             ← you are here
├── CLAUDE.md.template                    ← project-level CLAUDE.md for the new repo
├── specifications/
│   ├── README.md                         ← how to write specs (process)
│   ├── conventions.md                    ← naming, numbering, ownership rules
│   ├── master-spec.template.md           ← per-version index spec
│   ├── feature-spec.template.md          ← per-feature functional spec
│   ├── design-spec.template.md           ← per-feature UI/UX spec
│   ├── epics-and-tasks.template.md       ← implementation breakdown
│   ├── adr-feature.template.md           ← feature-scoped ADR
│   ├── adr-epic.template.md              ← epic-scoped ADR (file plan + interface contract)
│   ├── research.template.md              ← pre-spec investigation
│   ├── system-architecture.template.md   ← cross-cutting whole-system view (general/)
│   └── technology-choices.template.md    ← cross-cutting per-component choices (general/)
├── agents/
│   ├── README.md                         ← how to install / customize agents
│   ├── architect.md
│   ├── copywriter.md
│   ├── designer.md
│   ├── implementer.md
│   ├── researcher.md
│   ├── reviewer.md
│   ├── securityreviewer.md
│   ├── specwriter.md
│   ├── target-reviewer.md
│   └── testwriter.md
├── agent-teams/
│   ├── README.md                         ← how to spin up an agent team
│   ├── Specify.md                        ← researcher + specwriter + designer + copywriter + architect
│   └── Implement.md                      ← implementer + testwriter + reviewer + securityreviewer
├── targets/
│   ├── README.md                         ← the targets way-of-working
│   ├── target.template.md                ← copy + fill per goal; the run's contract
│   └── Run.md                            ← kickoff prompt: gate → execute → verify → stop
├── copy/
│   └── tone-of-voice.template.md         ← the voice guide `copywriter` writes against
└── infrastructure/
    └── backend-deploy/
        ├── README.md                     ← provisioning runbook
        ├── main.bicep.template
        ├── production.bicepparam.template
        ├── deploy.sh.template
        ├── deploy.ps1.template
        ├── setup-neon.sh.template
        └── setup-neon.ps1.template
```

---

## Bootstrapping a new project

1. **Copy the contents of this folder** into the root of the new repo
   (preserving the subfolders, but not the `template/` wrapper itself —
   `agents/` ends up at `.claude/agents/`, `agent-teams/` at
   `AgentTeams/`, etc — see each subfolder's README for placement).
2. **Rename `CLAUDE.md.template` → `CLAUDE.md`** at the repo root and
   fill in the project overview, stack, and folder structure.
3. **Read `specifications/README.md`** to internalise the spec process,
   then start with `master-spec.template.md` for v1.0.
4. **Drop the agent files into `.claude/agents/`** so Claude Code can
   spawn them. Edit the `model:` field if you want different models.
5. **Pick an agent team** in `agent-teams/` that matches your workflow,
   tweak it for your project, and use it as the seed prompt when you
   ask Claude to spawn a team.
6. **If you need a backend**, follow `infrastructure/backend-deploy/README.md`
   to provision Azure SWA + Neon.
7. **If you want unsupervised runs**, read `targets/README.md`; the
   `target-reviewer` agent and a `/target` slash command are the runtime
   pieces (both live under `.claude/`, not `targets/`).

The order above is a recommendation, not a hard sequence — every section
is independent and can be adopted on its own.

---

## What this starter pack assumes

- You are using **Claude Code** with the FleetView agent UI (or any
  harness that respects the `.claude/agents/*.md` convention).
- You are happy with **Markdown + frontmatter** for specs (not Notion,
  Linear, etc.). Specs live in version control.
- The backend template targets **Azure Static Web Apps + Neon Postgres**.
  Swap the Bicep + setup script for a different cloud if you need to —
  the spec/agent halves of the pack are cloud-agnostic.

Adopt one section at a time. The pieces are deliberately decoupled.
