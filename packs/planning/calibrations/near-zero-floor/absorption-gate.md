# The absorption / security gate — coverage at a near-zero constraint floor

**Calibrated content.** This file came from the `near-zero-floor`
calibration. The other pole is readable at
`.harness/pack/calibrations/high-floor/absorption-gate.md`.

> **This file describes coverage, not rules.** The gate's rules do not
> vary by calibration and are not set here: it is **non-delegable**, it
> **may not be cleared or waived by the party that ran `deliver`**, it
> **may not run in parallel with `learn`**, and its verdict is a **named
> token — `PASS` or `HOLD` — not prose**. Those live in `CLAUDE.md`, in
> the bet brief template and in the target abort criteria. What this file
> says is **how much of the gate this kind of organisation already
> holds**.

---

## Coverage here: **nothing structural holds this gate**

That is the whole finding, and it is the single most important
consequence of this calibration. At a near-zero constraint floor there is
no clearance cycle, no design-control regime and no external reviewer who
will eventually ask for the evidence. Nothing in the ordinary run of the
work forces any of the four checks to happen.

**So the gate is held by policy, or it is not held.**

| Gate check | How much is already held | What is left for the gate |
|---|---|---|
| **Security review** | **Not held.** Nothing forces an independent pass before release | The whole check. Name the reviewer, and confirm they did not build it |
| **Verification and validation** | **Weakly held** — tests exist, but nothing forces evidence that *this* change does what the bet claimed | The whole claim-level check: where is the result, and does it cover what the bet bet on |
| **Maintenance capacity** | **Not held.** Cheap build produces surface faster than ownership | Name the owner and their capacity. Expect this to fail often |
| **Review throughput** | **Not held**, and this is the binding constraint at this floor | Check what is in flight against what can actually be reviewed |

## Why this matters more here, not less

The intuition runs the wrong way. Because building is cheap and reversible,
the gate feels like ceremony — and because nothing external enforces it,
skipping it costs nothing **on the day**. What accumulates instead is
surface: unreviewed changes, unowned components, and a review queue that
grows faster than the capacity to clear it, until the portfolio is
absorbing nothing at all while delivering steadily.

That is the specific failure this gate exists to prevent at this pole,
and it is why the gate here has to be **written down as policy** rather
than assumed.

## Making a policy gate real

A gate held by policy fails in three predictable ways. Guard each
deliberately:

1. **The party that built it clears it.** The most common failure, and
   the one that voids the gate entirely. Name the reviewer before
   delivery starts, not after.
2. **The verdict becomes prose.** "Looks fine, shipping" is not a token.
   Write `PASS` or `HOLD`.
3. **The gate runs after the fact.** A gate cleared retroactively at the
   review is not a gate; it is a record. It sits between `deliver` and
   `learn` for a reason.

## Recording a verdict

Write the gate record to `bets/<slug>/gate-record.md`, with one line per
check, the verdict token, and — on `HOLD` — what would clear it. An
unsupervised run may carry a bet up to this gate and may **never** clear
it.
