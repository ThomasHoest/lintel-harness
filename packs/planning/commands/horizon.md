---
description: Walk the horizon decision aid for a bet or programme and write the horizon record — computed from the binding constraint, never from the calendar.
argument-hint: <bet slug or programme name>
---

You are computing a **planning horizon**. The horizon is computed, not
chosen.

$ARGUMENTS

If `$ARGUMENTS` is empty, ask which bet or programme this is for.

## Walk the aid, in order

Read `.harness/pack/templates/horizon-decision-aid.md` and walk its six
steps. Do not skip to the answer; the value of the record is the named
determinant, not the number.

> `horizon ≈ max(longest-lead physical/regulatory constraint,
> capital-commitment irreversibility)`, adjusted **up** when uncertainty
> resolves slowly, and **down** when competitive substitution is fast.

1. **`L`** — the longest lead time between deciding and being able to
   act, that money does not shorten. `none` is a legitimate answer.
2. **`I`** — how long the organisation stays committed once commitment
   becomes irreversible, and when that point arrives. `none` is a
   legitimate answer.
3. **`H0 = max(L, I)`** — and **name which one bound**. Never average
   them.
4. **Adjust up** if the bet's uncertainty resolves beyond `H0`.
5. **Adjust down** if competitive substitution is fast.
6. **Write the record.**

Read `portfolio/horizons.md` first for this project's calibrated defaults
and the determinants that usually bind here, then append the new entry to
the same file.

## Where the four determinants come from

`project-brief.md` §7 states them for this organisation and §2 states the
constraint floor; `background/` holds the evidence they were drawn from —
`constraints/` for `L` and `I`, `market/` for `S`, `performance/` for
`U`. Read the brief section and the matching folder before you answer the
step. **A determinant that traces back to nothing there was chosen, not
computed.** If the brief is still at its `{{…}}` placeholders, or the
folder a step needs holds only its README, **say so and ask for it to be
filled rather than computing anyway** — see
`.harness/pack/conventions.md` §7.

## The record must name

- The computed horizon, as a **range** where the evidence only supports a
  range.
- **Which determinant bound**, and its value.
- Each adjustment applied, with its reason and its window.
- **What would change it** — a horizon with no stated falsifier is a
  guess with a number.

## Rules

- **Never take the horizon from the planning calendar.** Quarters and
  fiscal years are reporting periods. If the computed horizon does not
  line up with the calendar, the calendar is what is wrong.
- If steps 4 and 5 pull in opposite directions, record both rather than
  netting them off. That tension is real information about the bet.
- If neither determinant can be named, say so. An unbounded horizon
  usually means the bet is not framed yet.
