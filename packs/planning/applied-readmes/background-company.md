# `background/company/` — who this organisation actually is

Raw material about the company itself: what it is, who owns it, how it is
shaped, how it makes money, and how it got here. **Raw material, not a
summary** — the summary is `project-brief.md` §1, and it is written from
what is in this folder.

## What belongs here

Real artefacts, pasted in as they arrived:

- **An about page, a pitch deck, an investor update** — whatever the
  organisation says about itself to outsiders.
- **The cap table or ownership summary**, or plainly: founder-owned,
  VC-backed at series *N*, PE-held, a division of a parent, a
  partnership, employee-owned. Ownership decides who can commit capital
  and how fast, which is why it is here and not a curiosity.
- **An org chart, or a headcount breakdown** — total, and how much of it
  is engineering. A chart that is six months out of date is still useful
  if it is dated as six months out of date.
- **The revenue model in plain form** — a pricing page, a contract
  template, an invoice, a summary of how customers actually pay: per
  seat, per transaction, per device, per contract, per year, or not yet.
- **Company history** — founding story, pivots, acquisitions, a
  near-death quarter, the product that was killed. The pivots are the
  useful part: an organisation that has pivoted twice makes commitments
  differently from one that has never had to.
- **Board composition and reporting lines**, where they bear on who
  decides.

## What the pack does with it

| Material | Where it lands |
|---|---|
| Sector, product, size, stage, customers | **§1 Company profile** — the section a reader should be able to tell this company from its nearest competitor by |
| The revenue model | **§1**, and it is one of the two inputs to **capital-commitment irreversibility (`I`)** in §7, because what a commitment costs depends on what it displaces |
| Ownership and board | **§8 Governance and cadence** — who decides, distinguished from who is consulted |
| Org shape and headcount | Sanity check on **§6 Absorption capacity**; the detail lives in `capacity/` |
| History, pivots, what was killed | **§4** — how this organisation has historically made and unmade commitments |

§1 warns against the words that fit any company — *platform*,
*solutions*, *enterprise-grade*, *at scale*. The defence against them is
having concrete material here to write from.

## Raw is fine

**Paste it in unedited.** A whole investor update is more useful than
your précis of it, and the précis is what §1 is for. **Do not summarise
prematurely** — premature summary is where evidence gets lost, and what
gets lost first is the specific detail that would have distinguished this
company from the generic one.

## Provenance

Every file carries the block, at the top, before the material:

```
**Source:** <who or what this came from>
**Date of the information:** <YYYY-MM-DD — when it was true, not when you saved it>
**Collected by:** <the user, or the agent that gathered it>
**Class:** <frame | mechanism | vendor magnitude>
```

**Undated material is treated as unreliable.** A headcount with no date
cannot be checked against the quarter it describes. Company facts drift
slowly, which is exactly what makes an undated one dangerous: it reads as
current for years.

**A §1 claim traceable to nothing in this folder is a claim to re-check,
not a claim to trust.** Mark it `[NEEDS SOURCE]` and leave it visible.
Never fabricate a citation.

## Who writes here

The **user**, primarily — this is the folder they already have the
material for. Among agents, `portfolio-steward` and `discovery-lead` are
the plausible writers when context is gathered rather than supplied.
`gate-reviewer` and `target-reviewer` never write here. Those boundaries
are provisional, as the roles are.

Relation to the brief, provenance in full, and the staleness rules:
`../README.md`.
