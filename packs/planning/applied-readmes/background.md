# `background/` — the raw material the brief was distilled from

Every framework in this pack is contingent on organisational context. The
horizon formula, the cadence defaults, the absorption gate and the
constraint-floor calibration all read their inputs from
`project-brief.md`. **This folder is where the evidence for those inputs
lives.**

## Raw material, and its distillation

| | `background/` | `project-brief.md` |
|---|---|---|
| What it is | **Raw material** — the sources, as they arrived | The **distillation** — the conclusions drawn from them |
| Form | Pasted decks, exports, contracts, notes, transcripts | Short, decided, one page per section |
| Voice | Whoever wrote the source | The portfolio owner |
| Changes when | New material arrives | The conclusion changes |
| Fails by | Being empty, or being stale | Being unfilled, or being unsourced |

**Neither is a dumping ground for the other.** A brief section that has
grown into three pages of quoted evidence has stopped being a
distillation; move the evidence here and leave the conclusion. A
`background/` folder holding a one-line summary and no source has stopped
being raw material; it is a second, worse brief.

The relationship is one-directional in authority: **the brief states
conclusions, and `background/` holds what those conclusions were drawn
from.** When they disagree, that is a finding — either the brief moved on
without its evidence, or the evidence moved on without the brief. Both
are worth knowing and neither resolves itself.

## What each subfolder feeds

| Subfolder | What it holds | What the pack does with it |
|---|---|---|
| `company/` | Profile, ownership, org shape, how the money is made, history | Brief **§1 Company profile**; the revenue model is one of the two inputs to irreversibility in §7 |
| `strategy/` | Vision documents, strategy decks, goals and OKRs, prior roadmaps and what became of them | Brief **§3 Vision** and **§4 Purpose of the portfolio work** — what this portfolio exists to decide |
| `products/` | The portfolio as it stands today — existing products and services, what is maintained, what is believed in | Brief **§5 Current portfolio**; with `performance/`, determinant **U** |
| `market/` | Customers and segments, competitors, buying behaviour, how fast a position is substituted | Determinant **S** — rate of competitive substitution, which adjusts the horizon **down** |
| `performance/` | Metrics, financials, traction, retention, churn | Determinant **U** — uncertainty-resolution rate, which adjusts the horizon **up**, and sets cadence; also **§5** |
| `constraints/` | Regulatory, certification, hardware lead times, capital commitments, contractual lock-in | Brief **§2 the constraint floor** — and therefore the `constraintFloor` calibration itself — plus determinants **L** and **I** |
| `capacity/` | Who reviews, security and maintenance bandwidth, team shape, the real ceiling on concurrent work | Brief **§6 Absorption capacity**, which is the input the absorption gate is checked against |

The determinants are the four in `project-brief.md` §7 and in
`.harness/pack/templates/horizon-decision-aid.md`:

```
horizon ≈ max(L, I), adjusted up by U, adjusted down by S
```

`L` and `I` come out of `constraints/`; `S` out of `market/`; `U` out of
`performance/` and `products/`. **A horizon computed from determinants
that trace back to nothing here was chosen, not computed** — which is the
one thing the horizon framework exists to prevent.

## Provenance — the rule this folder runs on

This pack already runs evidence discipline and a claims ledger. Both
extend here.

**Every file records where the information came from and when.** Put the
block at the top, before the material:

```
**Source:** <who or what this came from — a person, a document, a system export>
**Date of the information:** <YYYY-MM-DD — when it was true, not when you saved it>
**Collected by:** <the user, or the agent that gathered it>
**Class:** <frame | mechanism | vendor magnitude>
```

Three consequences, and the third is the one that gets skipped:

- **Undated material is treated as unreliable.** Not wrong — unreliable.
  An undated churn figure cannot be checked against the period it
  describes, so it cannot support a claim about today. Date it or mark it
  `[UNDATED]` and expect a reader to discount it.
- **The evidence classes apply here too.** A competitor's own number
  about their own product is a **vendor magnitude** wherever it is
  pasted, and three of them pointing the same way are one interested
  source three times. Label the class in the block, before the material
  is used, not after.
- **A brief claim traceable to nothing in `background/` is a claim to
  re-check, not a claim to trust.** It may still be true. It has simply
  not been shown to be, and the brief's authority comes entirely from
  being checkable.

## Staleness

**A two-year-old market read is not evidence about today.** Material here
does not expire on a schedule, but it does expire, and the rate differs
by folder:

| Folder | How fast it goes stale |
|---|---|
| `market/` | Fastest. At `near-zero-floor` a competitive read older than a couple of quarters is history, not evidence |
| `performance/` | Fast, and it is the folder most likely to be quietly reused past its date |
| `capacity/` | Changes with every departure, hire and reorganisation — check it before every prioritise cut |
| `products/` | Moderate — the list is stable, the honest status is not |
| `strategy/` | Slow, but a superseded strategy left undated reads as current |
| `company/` | Slowest, and still changed by a funding round or an acquisition |
| `constraints/` | Slowest of all, and the one where staleness is most dangerous: a certification regime that changed invalidates a horizon, not just a paragraph |

Keep superseded material. **Mark it superseded and date the
supersession** rather than deleting it — a strategy that was abandoned is
evidence about how this organisation makes decisions, and the prior
roadmap that did not happen is the most useful document in `strategy/`.

## Getting from a brief claim back to its source

A reader checking the brief should be able to do this in one hop:

1. Take the claim from `project-brief.md` — say §6's **absorbable active
   bets** number.
2. Go to the folder this table maps that section to — `capacity/`.
3. Find the file the number was drawn from, read its provenance block,
   and check the date.
4. If there is no such file, the number is a **re-check**, not a
   finding. Mark it `[NEEDS SOURCE]` in the brief and leave it visible.

Where a brief section is drawn from several files, name them in the
section itself. **Never fabricate a citation** — a missing source is a
visible gap; an invented one is a silent defect that survives review.

## Who may write here

**The user**, at any time, in any form. This folder exists to be dropped
into.

**Agents gathering context**, within their existing write boundaries. The
six portfolio roles are provisional and so are these assignments, but the
plausible shape is:

| Agent | Writes | Reads |
|---|---|---|
| `discovery-lead` | `market/`, `performance/`, `products/` — it is the pack's evidence gatherer and the only role with web access | all of it |
| `horizon-analyst` | `constraints/`, and the determinant working in `market/` and `performance/` | all of it |
| `portfolio-steward` | `products/` and `capacity/` — the current-portfolio snapshot and the ceiling the cut cuts to | all of it |
| `learning-synthesiser` | `strategy/` — what happened to the prior roadmap, written at `learn` | all of it |
| `bet-framer` | nothing here | `constraints/`, `capacity/`, `market/` |
| `gate-reviewer` | **nothing here** — its write boundary is gate records only | `capacity/`, `constraints/` |
| `target-reviewer` | **nothing** — read-only by definition | as needed |

An agent that writes here **writes the provenance block or does not write
the file.** An agent that cannot name a source writes `[NEEDS SOURCE]`
and stops.

## What does not belong here

- **Conclusions.** Those go in the brief. A file here whose content is
  entirely somebody's judgement is a brief section in the wrong folder.
- **Bets, reviews and gate records.** Those are `portfolio/`.
- **Document templates.** They stay in the payload at
  `.harness/pack/templates/` and are read from there.
- **Anything you cannot say where it came from.** If nobody can name the
  source, it is not evidence and putting it here launders it into
  evidence.

The evidence classes and the claims ledger in full:
`.harness/pack/conventions.md`. The sections this material feeds:
`project-brief.md`.
