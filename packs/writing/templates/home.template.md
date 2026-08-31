---
aliases: [Home, Map of Content, Vault Index, Start Here]
tags: [moc, home]
---

# 🗺️ Home — {{harness:param.projectName}}

{{harness:param.projectPurpose}}

> [!tip] How to use this note
> This is the reader's map of the whole vault. Every folder also has its own `index.md` with a fuller table — those are the living source of truth; this note is the front door. Set this as your Obsidian home note (Settings → Homepage) if you have the Homepage plugin.

Background and framing: [[CLAUDE|Project workflow & conventions (CLAUDE.md)]]

---

## 📍 You are here (snapshot, {{YYYY-MM-DD}})

> [!info] Current state
> - {{Where the project actually is today, in three to five bullets: what has published, what is drafting, what is being researched. Rewrite this block whenever the state changes materially, and bump the ISO date in the heading above.}}

**Likely next step:** {{the one thing to do next}}

---

## 🧭 Reading paths

- **New to the project?** → {{the framing note, once one exists}}
- **Want the digested argument?** → [[analyses/index|Analyses]] (close readings with the thesis, evidence, and cross-links pulled out)
- **Want the raw field maps?** → [[sources/_scouting/index|Scouting reports]] (one per subject: canon, debates, gaps)
- **Want every source in one place?** → [[sources/bibliography|Master bibliography]]
- **Want to see the writing?** → [[workstreams/index|Workstreams]] (each deliverable, tracked end-to-end)
- **Want the to-do backlog?** → [[tasks/index|Tasks]]

---

## 🔁 The pipeline (how work moves)

Research is shared; writing is per-workstream. The research phase runs once in the shared corpus and feeds every workstream; outline → draft → review → published run inside each workstream.

`Shared corpus:  Notes → Sources (scout → researcher → librarian → analyst) → Analyses`
`Per workstream:  Outlines → Drafts → Reviews → Published`

[[notes/index|Notes]] → [[sources/index|Sources]] → [[analyses/index|Analyses]] → **[[workstreams/index|Workstreams]]** (outline → draft → review → published)

Full phase rules, routing, and parallelization: [[CLAUDE|CLAUDE.md]].

---

## 📚 Sources

- [[sources/index|Sources — overview]]
- [[sources/bibliography|Master bibliography]]
- **Scouting (field maps):** [[sources/_scouting/index|index]]
- **Annotated source lists (researcher):** {{link them here as they land}}
- **On disk, by year:** {{link each `sources/<year>/index` as the librarian creates it}}
- **Workflow folders:** [[sources/inbox/index|inbox]] (awaiting intake)

---

## 🧪 Analyses (close readings)

[[analyses/index|Analyses — overview]]

- {{One bullet per close-read, newest last: `[[analyses/<slug>|Author — Title]]` plus a half-line on what it establishes.}}

---

## ✍️ Writing — workstreams

Writing is organized by **workstream** (each deliverable tracked end-to-end): [[workstreams/index|Workstreams registry]].

- {{One block per workstream: `[[workstreams/<name>/index|hub]]`, its stage, and links to whatever has published.}}

---

## 🗒️ Notes (raw inputs)

[[notes/index|Notes — overview]]

- {{Group the notes by source or by date, as they accumulate.}}
- **Voice samples (for tone matching):** {{point at wherever this project keeps them}}

---

## ✅ Tasks (backlog)

[[tasks/index|Tasks — overview]]

---

## ⚙️ Method & configuration

The vault is produced through a strict phased workflow run by specialized agents (scout, researcher, librarian, analyst, outliner, writer, critic, editor).

- [[CLAUDE|CLAUDE.md]] — voice, conventions, phase rules, routing, and "where things live"
- [[writing-guide/index|/writing-guide/]] — reusable writing reference: [[writing-guide/tone-of-voice|tone of voice]] + [[writing-guide/ai-tells|the AI-tells screen]] (run as a final pass on anything before it ships) + [[writing-guide/bilingual-publishing|bilingual publishing]]
- Agent definitions live in `.claude/agents/` (operational config, not reading material)
- The pack this project was applied from is readable in full at `.harness/pack/`
