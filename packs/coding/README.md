# Project Starter Pack

A reusable scaffold for new software projects, extracted from the Voxio
codebase. It bundles the five ingredients that survive across projects:

1. **A specification process** — how an idea becomes a buildable spec.
2. **A set of agent roles** — ten single-purpose Claude Code sub-agents,
   each with a non-overlapping write boundary.
3. **A set of agent teams** — two multi-role prompts (`Specify.md`, `Implement.md`) that wire those agents
   together for a particular shape of work (spec-only, full pipeline, etc).
4. **A targets way-of-working** — a contract format plus a readiness gate for
   long-running unsupervised runs with a hard stop condition.
5. **Backend scaffolds** — opt-in infrastructure kits, one per cloud, that
   provision a deployable backend in one command.

Applying the pack places each piece where it belongs; nothing here is copied
or renamed by hand. Filenames marked `.template.<ext>` are the ones an apply
strips and fills; `{{PLACEHOLDER}}` tokens that are not `{{harness:…}}` are
left verbatim for a human or an agent to fill in.

---

## Folder layout

```
packs/coding/
├── pack.json                             ← identity, anatomy, parameters, scaffolds
├── recipe.json                           ← the ordered steps an apply runs
├── README.md                             ← you are here
├── CLAUDE.md.template                    ← generated into the project's CLAUDE.md
├── specifications/
│   ├── README.md                         ← how to write specs (process)
│   ├── README.template.md                ← the project's own spec index
│   ├── project-brief.template.md         ← the project's product brief
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
│   ├── README.md                         ← what each agent is, and how to customise it
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
├── commands/
│   └── target.md                         ← the `/target` slash command
├── copy/
│   └── tone-of-voice.template.md         ← the voice guide `copywriter` writes against
├── applied-readmes/                      ← one folder README per folder an apply creates
│   ├── agentteams.md  copy.md  targets.md
│   ├── specifications-general.md
│   └── specifications-version.md
└── scaffolds/                            ← opt-in, choose at most one per category
    ├── backend-azure/                    ← Azure SWA + Neon: Bicep + 4 scripts
    └── backend-aws/                      ← AWS Lambda + CDK
```

Both backend scaffolds land at `infrastructure/backend-deploy/` in the applied
project, which is why they are alternatives rather than composable peers.

---

## What this starter pack assumes

- You are using **Claude Code** with the FleetView agent UI (or any
  harness that respects the `.claude/agents/*.md` convention).
- You are happy with **Markdown + frontmatter** for specs (not Notion,
  Linear, etc.). Specs live in version control.
- A backend scaffold is **optional and cloud-specific** — `backend-azure`
  targets Azure Static Web Apps + Neon Postgres, `backend-aws` targets AWS
  Lambda + CDK. Select neither and the spec/agent halves of the pack are
  entirely cloud-agnostic.

The pieces are deliberately decoupled: the spec process, the roles, the teams
and the targets contract are each usable without the others.
