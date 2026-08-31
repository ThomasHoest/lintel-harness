# Horizons — defaults at a near-zero constraint floor

**Calibrated content.** This file came from the `near-zero-floor`
calibration. The other pole is readable at
`.harness/pack/calibrations/high-floor/horizons.md`.

Append computed horizon records to the table at the bottom. `/horizon`
walks the decision aid at
`.harness/pack/templates/horizon-decision-aid.md`.

---

## The framework (does not vary)

> `horizon ≈ max(longest-lead physical/regulatory constraint,
> capital-commitment irreversibility)`, adjusted **up** when uncertainty
> resolves slowly, and **down** when competitive substitution is fast.

## Defaults here

| | Default at a near-zero constraint floor |
|---|---|
| **Typical horizon range** | **One to two quarters**, and shorter where substitution is active |
| **Determinant that usually binds** | **`I` — capital-commitment irreversibility**, and often a soft form of it: adoption, integration, a public commitment. `L` is frequently `none` |
| **Adjustment up** | Occasional. Some uncertainty here is genuinely slow — a market question, a behaviour change — and when it is, say so |
| **Adjustment down** | **Common, and it is the adjustment that does the work here.** Fast substitution pulls the horizon in |

## What this means in practice

- **Expect `L = none`, and write it down.** With no physical or
  regulatory lead time, `H0` is `I` alone. `none` is an answer, not a
  blank, and recording it is what stops the horizon defaulting to a
  quarter out of habit.
- **Irreversibility here is usually not capital.** It is adoption,
  integration, migrated data, or a commitment someone outside now depends
  on. Name which, and name when it starts — the point of no return and
  the duration are different numbers.
- **The down-adjustment is the one to get right.** If substitution is
  faster than the horizon, the bet is planning for a world that will not
  be there. Name the substitution window you used.
- **Watch for the opposite pull.** Slow-resolving uncertainty in a
  fast-substituting market is common at this floor. When steps 4 and 5
  disagree, record both rather than netting them off — it usually means
  the bet should be smaller, staged, or framed as an option rather than a
  commitment.
- **A long horizon here is a finding, not a plan.** If a bet at this
  floor computes past a year, something is genuinely irreversible.
  Identify it before committing.

---

## Horizon records

| Programme / bet | `L` (lead time) | `I` (irreversibility) | `H0 = max(L,I)` | Bound by | Adj. up | Adj. down | **Computed horizon** | What would change it | Date |
|---|---|---|---|---|---|---|---|---|---|
| `<name>` | `<duration \| none>` | `<duration>` · `<from when>` | `<duration>` | `<L \| I>` | `<none \| to X>` | `<none \| to X>` | `<range>` | `<the falsifier>` | `<date>` |
