# `background/constraints/` — what genuinely cannot be compressed

Raw material about the things that stay the same length no matter how
much money and how many people are put against them. **This is the
highest-consequence folder in `background/`**: it is the evidence behind
the constraint floor, and therefore behind the calibration the whole pack
was initialised at.

## What belongs here

- **Regulatory and clearance material** — the approval pathway, the
  regulator's published timelines, a submission and its response, a
  clearance letter, correspondence with an authority.
- **An auditor's report**, a certification scheme's requirements, a
  standard the product must meet, a penetration-test report with
  remediation deadlines.
- **Hardware and supply material** — quoted tooling lead times, a
  supplier's stated lead time in writing, a bill of materials, a
  component on allocation, a manufacturing slot booking.
- **Validation and trial material** — a validation plan, a trial
  protocol, a read-out date, a field-test schedule.
- **Capital commitments** — a signed capex approval, a lease, a plant or
  infrastructure commitment, a hire made against one specific bet.
- **Contracts and lock-in** — customer contracts with terms and notice
  periods, an exclusivity clause, a supplier minimum, a licence with a
  term, a data-residency obligation, a migration that cannot be unwound.
- **Dependencies on someone else's clock** — a platform's release cycle,
  a partner's roadmap, a buyer-side procurement or security review.

**The test that keeps this folder honest, from brief §2:** *would
spending twice as much make this shorter?* If yes, it is a resourcing
problem, not a constraint, and it does not belong here. That test is what
stops `constraints/` filling up with things that are merely hard.

## What the pack does with it

This folder feeds more of the pack than any other.

| Material | Where it lands |
|---|---|
| Everything above | Brief **§2 The constraint floor** — the load-bearing section, and *the section filling it in is how you discover which calibration this project should be running* |
| The same | **The `constraintFloor` calibration itself.** §2's answer is what the parameter names. Where §2 and `calibration.md` disagree, **the brief wins** and the three calibrated files in `portfolio/` get edited |
| Lead times: clearance, tooling, validation, certification, someone else's release cycle | Determinant **L — longest-lead physical or regulatory constraint**, brief §7's first determinant, step 1 of `.harness/pack/templates/horizon-decision-aid.md` |
| Capital commitments, contracts, lock-in, unwindable-or-not migrations | Determinant **I — capital-commitment irreversibility**, brief §7's second determinant, step 2 of the decision aid — the *duration* the organisation stays committed, and separately *when* irreversibility begins |
| `max(L, I)` and which of them bound | The horizon floor, and the **binding determinant** recorded in `portfolio/horizons.md` |
| Certification, V&V and audit obligations | Brief **§6** and `portfolio/absorption-gate.md` — how much of the absorption gate this organisation's existing process already holds |

**`none` is an answer here.** If nothing sets a lead-time constraint — the
work is software with no external gate — that is a finding, and it is
most of what makes an organisation `near-zero-floor`. Write it down with
its evidence rather than leaving the folder empty; an empty
`constraints/` is indistinguishable from an unasked question.

## Raw is fine

**Paste the auditor's report in.** The regulator's actual timeline page,
the supplier's actual quoted lead time, the contract clause itself.
**Do not summarise prematurely** — "certification takes about a year" is
the summary that loses the fact that the clock starts at submission and
the submission needs a completed validation, which is where the year
actually goes. Constraints are made of clauses and dates, and summarising
removes exactly those.

## Provenance

```
**Source:** <who or what this came from — name the document and the clause>
**Date of the information:** <YYYY-MM-DD — when it was true, not when you saved it>
**Collected by:** <the user, or the agent that gathered it>
**Class:** <frame | mechanism | vendor magnitude>
```

**Undated material is treated as unreliable — and staleness is most
dangerous here.** This folder changes slowest, which is why nobody
re-checks it: a certification regime that changed, a supplier lead time
that doubled, a contract that lapsed, invalidates a **horizon**, not just
a paragraph. A stale `L` is a plan built on a clock that no longer runs.

**A §2 statement or an `L` or `I` value traceable to nothing here is a
value to re-check rather than to trust** — and because the calibration
rests on §2, an unsourced constraint floor is an unsourced pack
configuration. Mark it `[NEEDS SOURCE]`. Never fabricate a citation, and
never infer a regulatory timeline; cite the authority or write `[NEEDS
SOURCE]`.

## Who writes here

The **user**, who has the contracts and the correspondence.
`horizon-analyst` is the natural agent writer — `L` and `I` are its
determinants and its working belongs beside its evidence.
`discovery-lead` writes here when a constraint has to be researched
rather than supplied. `bet-framer` reads this folder to fill a bet's
reversibility field and never writes it. `gate-reviewer` reads it for the
V&V and certification obligations and writes only gate records.
`target-reviewer` never writes. Provisional, as the roles are.

Relation to the brief, provenance in full, and the staleness rules:
`../README.md`.
