# `writing` — a research-and-drafting way of working

**Version 1.0.0 · `minCliVersion` 1.0.0 · scaffold: `writing-workstream`**

A pack for projects whose output is prose: a research corpus that is built
once, and per-deliverable writing stages that draw on it. Nine stages in two
strict sequences, eight single-purpose agents, a voice guide, and the
`index.md` / `Home.md` navigation discipline that keeps a growing vault
readable.

It was extracted from a working research-and-writing project rather than
invented, which is why the coordination and behavioural halves are unusually
specific and the document-template half is unusually thin.

---

## The nine parts, and where this pack is short

A pack is nine things. This one ships seven of them and is honest about the
other two — `pack info writing` reports the same picture from `pack.json`.

| # | Part | Status | What this pack has |
|---|---|---|---|
| 1 | Process | `present` | Nine stages in two strict sequences. Research, in the shared corpus, once per subject: `scout → researcher → librarian → analyst`. Writing, per workstream: `outliner → writer → critic → editor → published`. Do not skip a phase; do not substitute one agent for another. |
| 2 | Role set | `present` | Eight agents — `scout`, `researcher`, `librarian`, `analyst`, `outliner`, `writer`, `critic`, `editor`. Write boundaries are drawn by **stage folder**, not by file type. `librarian` is the only agent with `Bash`; `critic` is read-only. |
| 3 | Document templates | `present`, **and thin** | Exactly **one** real template: `templates/post.template.md`. Every other artifact shape — the scouting map, the annotated source list, the source analysis, the outline candidate, the draft, the critic review — is described in prose inside the agent prompts and `CLAUDE.md`, not templated. Compare `coding`'s eleven. This is a real gap, recorded rather than papered over. |
| 4 | Conventions | `present` | An `index.md` in every folder with a file / description / created / updated table. `Home.md` as the map-of-content. Versioned drafts, never overwrites. Never invent sources — `[NEEDS SOURCE]` is acceptable, fabrication is not. Sources filed by year with the bibliography as the index. One analysis per source. ISO dates throughout. |
| 5 | Coordination | `present`, and the **strong** part | An eight-row routing table from prompt shape to agent; parallelization rules (scouts parallel, analysts serial, writer/critic/editor never parallel for one piece); no auto-chaining; the critic loop capped at two revisions. |
| 6 | Behavioural guidelines | `present`, and the **strong** part | One `CLAUDE.md` carrying voice and style, the words-and-patterns-to-avoid list, where things live, the workflow, and the standing instructions. Alongside it `writing-guide/` is reference loaded on demand. |
| 7 | Folder scaffolding | `present` | Declared by the recipe. The shared corpus plus the per-workstream stage folders, each arriving with its `index.md`. |
| 8 | Skills and automations | **`absent`** | Zero slash commands, zero skills, zero hooks, no default permission set. The source project's only hook was a third-party notifier belonging to an unrelated tool; its permission allowlist was ~120 accreted, project-specific entries. Neither is a pack construct, so neither migrates. The irony is worth stating: the two rules this pack most needs enforced — *never overwrite a draft*, *append a row to `index.md`* — are exactly the hook candidates, and the pack ships neither. |
| 9 | Autonomy contract | **`absent`** | No target contract, no readiness gate, no autonomy envelope, no abort criteria, no work log, no SUCCESS/ABORT termination. What the pack has instead is a supervision posture: no auto-chaining means every phase ends by returning to the user, and publishing is unconditionally human-gated. That describes what an agent may not do alone, not what it may do alone and how it stops. |

Parts 8 and 9 are **missing, not merely different**. Closing them is
`writing@1.1` work: part 9 closes by gaining the targets contract, which
`coding` and `planning` each carry their own copy of today. There is no
`shared/` tree at v1.0, so there is nothing to reference; reconciling those
copies and giving this pack one is a **named v1.1 task**.

---

## What the recipe produces

Phase 1 copies this whole folder verbatim to `.harness/pack/`. Phase 2 runs
`recipe.json` — twelve declared steps over six primitives, seven unconditional
and five inside the scaffold.

| Step | Primitive | From (payload) | To (project) |
|---|---|---|---|
| Agents | `copy` | `agents/` | `.claude/agents/` (8 files) |
| Writing guide | `strip-suffix` | `writing-guide/*.template.md` | `writing-guide/*.md` (4 files) |
| Guide index | `rename` | `templates/index.template.md` | `writing-guide/index.md` |
| Front door | `rename` | `templates/home.template.md` | `Home.md` |
| Project brief | `rename` | `templates/project-brief.template.md` | `project-brief.md` |
| Answers | `substitute` | — | `writing-guide/*.md`, `Home.md`, `project-brief.md` |
| Onboarding | `generate` | `CLAUDE.md.template` | `CLAUDE.md`, with inert anchors |
| Corpus | `copy` ×4, scaffold only | `scaffolds/writing-workstream/{sources,analyses,notes,tasks}/` | `sources/` (with `_scouting/`, `inbox/`), `analyses/`, `notes/`, `tasks/` |
| Workstreams | `copy`, scaffold only | `scaffolds/writing-workstream/workstreams/` | `workstreams/` and one starter workstream with its four stage folders |

```
<project>/
├── .claude/agents/*.md      ×8
├── writing-guide/           README.md, tone-of-voice.md, ai-tells.md,
│                            bilingual-publishing.md, index.md
├── Home.md                  map-of-content; the reader's front door
├── project-brief.md         who is writing, for whom, to what standard of
│                            evidence — upstream of every writing stage
├── CLAUDE.md                voice, the strict phase order, routing defaults,
│                            parallelization rules, standing instructions
└── (with --scaffold writing-workstream)
    ├── sources/{index.md, _scouting/, inbox/}
    ├── analyses/  notes/  tasks/
    └── workstreams/{index.md, example-workstream/{outlines,drafts,reviews,published}/}
```

**Every folder an apply creates carries an `index.md`**, and this pack is the
only one whose folder README is `index.md` rather than `README.md` — that is
what `"folderReadme": "index.md"` in `pack.json` declares. It is not a new
convention invented for the checker; it is the pack's existing Obsidian shape,
the per-folder table of contents `Home.md` links to. Every folder the scaffold
creates receives its `index.md` from a step in the **same** scaffold branch, so
both `init writing` and `init writing --scaffold writing-workstream` are
self-consistent on their own. `project-brief.md`, `Home.md` and `CLAUDE.md`
all land at the project root and create no folder, so none of them touches
that rule.

`writing-guide/` carries **both** a `README.md` and an `index.md`. They do
different jobs: the README is the migrated guide's own front matter — what the
guide is, how to use it, how portable it is — and the `index.md` is the folder's
table of contents under the convention above.

**No `.claude/settings.json` is written**, by this pack or by any other at
v1.0. No pack owns a settings key, ships a default permission set, or has
anything to consent to at apply time.

The document templates stay in the payload and are read from
`.harness/pack/templates/`. They are not copied into the project.

---

## Parameters

Three, all substitution-only; this pack declares no conditional step.

| Id | Prompt | Lands in |
|---|---|---|
| `projectName` | Project name | `CLAUDE.md`, `Home.md`, `project-brief.md` |
| `projectPurpose` | One line: what this project researches and writes about | `CLAUDE.md`, `Home.md` |
| `authorName` | The writer whose voice the writing guide describes | `CLAUDE.md`, `writing-guide/*.md`, `project-brief.md` |

Placeholders the pack deliberately leaves for the user to fill are written as
`{{…}}` markers that carry no `harness:` prefix, and are copied through
verbatim: the voice-and-style fields and the voice-samples location in
`CLAUDE.md`, the voice-samples list and the publishing-language note in
`tone-of-voice.md`, the site-index section in `bilingual-publishing.md`, and
most of `Home.md`'s body.

---

## What did not extract

The pack is the way of working, not the project that grew it. Four classes of
content were dropped rather than migrated:

- **The research corpus** — the ingested sources, the close-read analyses, the
  personal notes, and every existing workstream's content.
- **The permission allowlist** — ~120 accreted, project-specific entries.
- **The third-party `PostToolUse` hook** — a notifier belonging to an unrelated
  tool, not a pack construct.
- **Personal names, absolute paths and voice samples** — the author's name
  became the `authorName` parameter; the voice-sample references became
  placeholders pointing at wherever a new project keeps its samples, which is
  what the guide's own portability note asks for.

Three templates were **authored** rather than migrated:
`templates/index.template.md`, `templates/home.template.md` and
`templates/project-brief.template.md`. They are **recipe scaffolding, not
pack content** — the first two because without them the recipe cannot render
the `index.md`-in-every-folder convention or `Home.md`, and the pack would
ship a convention it cannot execute; the third because a project that cannot
state who is writing it, for whom, and to what standard of evidence has
nothing for the outliner, the writer and the critic to work against. All
three are rendered out of the payload rather than read from it, and none
counts toward part 3, which stays thin on the strength of the one real
document template.

Manual bootstrap prose — anything telling a reader to copy a folder, rename a
file, fix a path or set the project up by hand — is not in this pack. The
recipe performs that procedure, so the instructions describing it would be dead
content.
