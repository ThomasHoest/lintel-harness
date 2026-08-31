# Roadmap review — {{committed milestone}}

> A **committed-milestone** review: it runs against a milestone that was
> committed, not against a calendar period. `/review` opens one. Write it
> to `portfolio/bets/<slug>/reviews/<date>.md`, or as a portfolio-wide
> review beside the register.
>
> The five fields below are **fixed** — do not add, drop or rename them.
> They are the same five as the portfolio intake template, used at the
> other end of the loop.

Milestone: `<the committed milestone this reviews>`
Date: `<date>` · Reviewer: `<name>` · Bets in scope: `<slugs>`

**Trigger:** `<uncertainty moved — what moved>` | `<calendar backstop
reached>`

> Cadence follows **uncertainty resolution**, not the calendar. If the
> trigger is the backstop and nothing has moved, say so — that is a
> finding about the cadence, and it costs review capacity this portfolio
> has budgeted.

---

## 1. What changed since last review

<Facts, not activity. What is now true that was not true at the last
review? "Work continued" is not a change. A result landed, a constraint
moved, a signal crossed, an assumption was falsified — those are.>

## 2. Which bets met kill criteria

**Every bet in scope, checked. No exceptions**, including bets that
reached `committed` by some route other than `/bet`.

| Bet | Criteria present and still meaningful? | Any crossed? | Outcome |
|---|---|---|---|
| `<slug>` | `<yes / no — which>` | `<K2, on <date>>` | `<killed | re-committed (dated rationale in decisions.md) | continues>` |

> A criterion whose date has passed or whose threshold no longer means
> anything is **not a criterion** — reopen it here.
>
> A crossed criterion **escalates immediately**, not at the next
> scheduled review. The bet is killed, or explicitly re-committed with a
> dated rationale in `portfolio/decisions.md`. **"We kept going" is not a
> re-commitment.**

## 3. Absorption capacity check

<What is in flight against what can actually be reviewed, maintained and
owned. Review throughput is a portfolio input, not an afterthought.>

| Capacity | In flight | Available | Verdict |
|---|---|---|---|
| Review throughput | `<...>` | `<...>` | `<within | over>` |
| Maintenance ownership | `<bets with a named owner>` | `<owners with time>` | `<...>` |
| Security review | `<queued>` | `<...>` | `<...>` |

If the portfolio is over capacity, that is a **prioritize** consequence,
not a note. Carry it to field 5.

## 4. Horizon check

| Bet / programme | Horizon on record | Binding determinant | Still holds? |
|---|---|---|---|
| `<...>` | `<range>` | `<lead time | irreversibility>` | `<yes | recompute — what moved>` |

> A horizon set once and never re-examined has quietly become a calendar.
> If a determinant moved, hand it to `/horizon` and recompute; do not
> adjust the number in place.

## 5. Intake gate

**What this review sends back to intake.** A review that produces no
intake consequence **has not finished**.

- Added to the register: `<...>`
- Killed: `<...>`
- Re-ranked or re-cut: `<...>`
- Horizons to recompute: `<...>`
- Nothing changed, and here is what was checked to conclude that:
  `<...>`
