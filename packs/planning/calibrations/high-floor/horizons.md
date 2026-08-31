# Horizons — defaults at a high constraint floor

**Calibrated content.** This file came from the `high-floor` calibration.
The other pole is readable at
`.harness/pack/calibrations/near-zero-floor/horizons.md`.

Append computed horizon records to the table at the bottom. `/horizon`
walks the decision aid at
`.harness/pack/templates/horizon-decision-aid.md`.

---

## The framework (does not vary)

> `horizon ≈ max(longest-lead physical/regulatory constraint,
> capital-commitment irreversibility)`, adjusted **up** when uncertainty
> resolves slowly, and **down** when competitive substitution is fast.

## Defaults here

| | Default at a high constraint floor |
|---|---|
| **Typical horizon range** | **18–36 months**, and longer for programmes behind a full clearance or certification cycle |
| **Determinant that usually binds** | **`L` — the longest-lead physical or regulatory constraint.** The external clock is normally longer than the commitment |
| **Adjustment up** | Common. Uncertainty resolves at the speed of an external review, which often lands beyond `H0` |
| **Adjustment down** | Rare. Substitution is slow when entry itself is gated |

## What this means in practice

- **Start from `L`, not from `I`.** At this floor the lead-time
  constraint is usually the binding one, so compute it first and expect
  it to win the `max()`. Recording that it bound is what stops the
  horizon quietly becoming a budget cycle.
- **A short horizon here is a finding, not a win.** If a bet at this
  floor computes to a short horizon, either it is genuinely unconstrained
  — in which case say what makes it so — or a lead time has been missed.
- **Do not let the calendar back in through the range.** "18–36 months"
  is a default derived from the shape of gated programmes, not a planning
  period. If a specific bet's `L` is 44 months, its horizon is 44 months.
- **Re-check at every gate.** A regulatory pathway assumption is exactly
  the kind of determinant that moves, and when it moves the horizon
  recomputes rather than being adjusted in place.

---

## Horizon records

| Programme / bet | `L` (lead time) | `I` (irreversibility) | `H0 = max(L,I)` | Bound by | Adj. up | Adj. down | **Computed horizon** | What would change it | Date |
|---|---|---|---|---|---|---|---|---|---|
| `<name>` | `<duration>` · `<what sets it>` | `<duration>` · `<from when>` | `<duration>` | `<L \| I>` | `<none \| to X>` | `<none \| to X>` | `<range>` | `<the falsifier>` | `<date>` |
