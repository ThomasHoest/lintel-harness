# Review cadence — defaults at a near-zero constraint floor

**Calibrated content.** This file came from the `near-zero-floor`
calibration. The other pole is readable at
`.harness/pack/calibrations/high-floor/cadence.md`.

> **Cadence follows uncertainty resolution, not the calendar.** That rule
> does not vary. What varies is how fast uncertainty resolves here — and
> at a near-zero constraint floor, it resolves **weekly**.

---

## Defaults

| Trigger | Default here |
|---|---|
| **Primary trigger** | A signal moving: usage, retention, a threshold crossed, a competitor shipping, an assumption falsified by the week's data |
| **Committed-milestone review** | Weekly to fortnightly, on the signal rather than on the day |
| **Portfolio intake pass** | Monthly. The register turns over fast enough that a quarterly pass would be reading history |
| **Calendar backstop** | Six weeks. No bet goes longer than this unreviewed, whatever the signals are doing |
| **Kill-criteria escalation** | Immediate, always. This is not a cadence setting |

## Why the defaults are fast here

When build is near-free and release is continuous, the evidence a bet was
committed against arrives in days. A bet reviewed monthly at this floor
has already run three or four cycles of learning that nobody acted on —
and the cost of a wrong bet compounds through the same cheap-build
property that made it easy to start.

The failure mode this calibration guards against is different from the
other pole's. It is not the ritual review; it is the **review that never
happens because nothing forced it**. Fast, cheap starts produce many
bets, and many bets outrun review capacity long before they outrun
delivery capacity.

## Where the calendar still earns its place

The six-week backstop exists because a fast-moving portfolio generates
bets that go quiet — not killed, not delivered, just no longer looked at.
A bet nobody has reviewed in six weeks is not being managed, and the
backstop is what turns that from an oversight into a finding.

## Review capacity is the constraint here, not delivery capacity

At this floor the binding limit on how many bets can run is **review
throughput**, not the ability to build. Budget it at `prioritize`
alongside everything else, and treat a portfolio that has outrun it as a
prioritize consequence rather than a note. This is also why the
absorption gate matters more here, not less — see `absorption-gate.md`.

## What does not vary with this file

- The gate is **non-delegable**, at every calibration.
- A crossed kill criterion escalates **immediately**, never at the next
  scheduled review.
- The loop closes: a review with no intake consequence has not finished.

Full coordination rules: `.harness/pack/coordination.md`.
