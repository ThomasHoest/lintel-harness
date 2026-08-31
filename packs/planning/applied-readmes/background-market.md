# `background/market/` — customers, competitors, and how fast a position decays

Raw material about the world outside the organisation: who buys, why they
buy, who else is selling, and — the determinant this folder exists for —
**how long a position stays defensible before somebody substitutes for
it.**

## What belongs here

- **Segment definitions and customer lists** — who the customers actually
  are, how many, and in what segments. Named accounts where they matter.
- **Win/loss notes, sales-call notes, customer interview transcripts.**
  The transcript, not your reading of it.
- **Buying behaviour** — how a purchase is actually made here: procurement
  cycle length, who signs, whether there is a security review or a
  regulatory sign-off on the buyer's side, contract length, renewal shape.
  A nine-month enterprise procurement is a constraint; note it here and
  record it in `constraints/`.
- **Competitor material** — their pricing pages, feature comparisons,
  launch announcements, funding news, dated screenshots.
- **Analyst reports, market sizing, category definitions.** Almost all of
  it is **vendor magnitude** or **frame**; label it.
- **Substitution evidence** — the concrete kind: how long it took a
  competitor to match a feature this organisation shipped; a category
  that became commodity and how quickly; a customer who left for a
  cheaper route; an open-source or in-house alternative appearing.

## What the pack does with it

| Material | Where it lands |
|---|---|
| **Substitution evidence** | Determinant **S — rate of competitive substitution**, brief §7's third determinant, step 5 of `.harness/pack/templates/horizon-decision-aid.md`. It adjusts the horizon **down** |
| The same, at organisation level | Brief **§2**'s *rate of competitive substitution* line — the second half of the constraint-floor answer, and the half that decides `near-zero-floor` |
| Segments, customers, counts | Brief **§1 Company profile** |
| Buying behaviour and procurement cycles | `constraints/`, where a buyer-side gate becomes part of **`L`** |
| Competitor positioning | Brief **§3 Vision** — what has to become true |

**`S` is the one determinant with no internal source.** `L`, `I` and `U`
can all be answered from inside the organisation. `S` cannot, which makes
this the folder most likely to be filled with assertion instead of
evidence. Prefer the concrete instance — *this competitor matched that
feature in four months* — over the general claim that the market moves
fast.

## Raw is fine

**Paste the call notes in.** Whole transcripts, whole win/loss records,
the competitor's own page with its own puffery, the analyst PDF's
substance. **Do not summarise prematurely** — a summarised customer
interview keeps the conclusion and loses the sentence the conclusion was
actually drawn from, and that sentence is what a later reader needs to
check whether the conclusion still holds.

## Provenance

```
**Source:** <who or what this came from>
**Date of the information:** <YYYY-MM-DD — when it was true, not when you saved it>
**Collected by:** <the user, or the agent that gathered it>
**Class:** <frame | mechanism | vendor magnitude>
```

This is the folder where the evidence classes do the most work:

- **A competitor's own number about their own product is a vendor
  magnitude.** So is an analyst figure produced for a vendor's
  consumption. Directional interest only.
- **Vendor telemetry is never stacked as independent corroboration.**
  Three vendor figures pointing the same way are one interested source
  three times, not three sources.
- **A frame may not be cited as evidence of a magnitude.** A category
  model is a way of seeing; it is not a market size.

**Undated material is treated as unreliable, and this folder goes stale
fastest.** At `near-zero-floor` a competitive read older than a couple of
quarters is history rather than evidence, and an `S` computed from it is
a horizon adjustment made against a market that has already moved. **An
`S` value traceable to nothing here is a value to re-check, not one to
trust.** Mark it `[NEEDS SOURCE]`. Never fabricate a citation.

## Who writes here

The **user**, and `discovery-lead` — the pack's evidence gatherer and the
only role with web access, which makes it the natural writer for
competitor and market material. `horizon-analyst` writes its `S` working
here. `gate-reviewer` and `target-reviewer` never write here. Provisional,
as the roles are.

Relation to the brief, provenance in full, and the staleness rules:
`../README.md`.
