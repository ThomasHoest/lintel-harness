# `background/performance/` — what is working, and what is not

Raw material about how the organisation and its products are actually
doing: the numbers, the money, the traction, the retention. **The
folder that tells you how fast this organisation learns**, which is the
determinant most often guessed at.

## What belongs here

- **A metrics export** — the dashboard's underlying numbers, with their
  date range, not a screenshot of a rising line.
- **Financials** — revenue by product or segment, gross margin, burn,
  runway, the board pack's finance section.
- **A churn export**, cohort retention tables, expansion and contraction,
  logo versus revenue churn. Include the denominators.
- **Traction over time** — signups, activations, usage, deal counts.
  Series, not points; a single number with no trend supports nothing.
- **Experiment and launch read-outs** — what was tried, what was
  measured, when the answer arrived, and **how long that took**. The last
  of those is what `U` is made of.
- **Incidents, quality and support load** where they bear on whether
  something is working.
- **The failures.** The launch that did nothing, the segment that never
  converted, the metric that has been flat for a year. An organisation's
  performance folder that contains only good numbers is a marketing
  folder.

## What the pack does with it

| Material | Where it lands |
|---|---|
| **How long until a bet's result is known** | Determinant **U — uncertainty-resolution rate**, brief §7's fourth determinant, step 4 of `.harness/pack/templates/horizon-decision-aid.md`. It adjusts the horizon **up** |
| The same | Brief **§8**'s cadence — cadence follows `U`, not the quarter. *"A quarterly review in a business where uncertainty resolves weekly is eleven weeks of drift with a meeting at the end"* |
| Per-product numbers and honest status | Brief **§5 Current portfolio**, alongside `products/` |
| Revenue, margin, what a commitment displaces | Brief **§1**, and the cost side of **`I`** in `constraints/` |
| Incidents, quality, support load | Brief **§6 Absorption capacity** — what maintenance already costs |

**`performance/` and `products/` are a pair.** `products/` says what
exists; this folder says whether it is working. Determinant `U` is read
across both — the release history says how often this organisation ships,
this folder says how long after shipping it knew anything.

The `U` question is not "do we have dashboards". It is **how long between
committing and knowing**. Weekly telemetry and a two-year trial read-out
are the two ends, and most organisations are further toward the slow end
than their dashboard suggests, because the dashboard resolves usage and
the bet was about revenue.

## Raw is fine

**Paste the export in.** The CSV, the whole cohort table, the finance
section with its awkward rows. **Do not summarise prematurely** — a
retention curve summarised to a single retention number has lost the
shape, and the shape is the evidence. Keep the denominators; a percentage
without one is not checkable.

## Provenance

```
**Source:** <who or what this came from — name the system, not just "the dashboard">
**Date of the information:** <YYYY-MM-DD — and the period the data covers>
**Collected by:** <the user, or the agent that gathered it>
**Class:** <frame | mechanism | vendor magnitude>
```

**Numbers need two dates: when they were pulled, and what period they
describe.** A churn figure without its period is unusable, and this is the
folder where that failure is commonest.

**Undated material is treated as unreliable**, and it goes stale fast
here — this is the folder most likely to have a figure quietly reused a
year past its date because it was the last one anybody pulled.

**A `U` value, or a §5 status, traceable to nothing here is a value to
re-check rather than to trust.** Mark it `[NEEDS SOURCE]`. Never
fabricate a citation — and note that an internal number is not
automatically better than an external one: label the class, and if a
figure came from a vendor's own telemetry about their own product it is a
**vendor magnitude** however internal the dashboard it arrived on.

## Who writes here

The **user**, and `discovery-lead` — the evidence-gathering role, which
also maintains the claims ledger the classes here feed.
`horizon-analyst` writes its `U` working here. `learning-synthesiser`
writes read-outs here at `learn`, since "how long until we knew" is
exactly what that phase discovers. `gate-reviewer` and `target-reviewer`
never write here. Provisional, as the roles are.

Relation to the brief, provenance in full, and the staleness rules:
`../README.md`.
