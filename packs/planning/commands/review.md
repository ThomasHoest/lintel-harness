---
description: Run a roadmap review against a committed milestone — re-checking every reviewed bet's kill criteria, absorption capacity and horizons.
argument-hint: <committed milestone, or a bet slug, or "portfolio" for a whole-register pass>
---

You are running a **roadmap review**. It runs against a committed
milestone, not against a calendar period.

$ARGUMENTS

If `$ARGUMENTS` is empty, ask which committed milestone or bet is being
reviewed.

## Before you start — check the trigger

Cadence follows **uncertainty resolution**, not the calendar. Ask what
moved: a result landed, a constraint changed, a signal crossed a
threshold, an assumption was falsified.

If the only trigger is the calendar backstop and nothing has moved,
**say so in the review**. That is a finding about the cadence, not a
reason to skip the review — the backstop exists because uncertainty that
never resolves is itself a result. This project's cadence defaults are in
`portfolio/cadence.md`.

## Run the five fields

Read `.harness/pack/templates/roadmap-review.template.md`. The five
fields are **fixed**: what changed since last review · which bets met
kill criteria · absorption capacity check · horizon check · intake gate.

Write the review to `portfolio/bets/<slug>/reviews/<date>.md`, or beside
the register for a whole-portfolio pass.

## The kill-criteria re-check — do this for every bet in scope

This is the second line on the rule `/bet` carries. A bet that reached
`committed` by hand-editing its brief is caught here or nowhere.

For each bet:

1. **Are criteria present?** If `Kill criteria` is empty or still at its
   placeholder, print exactly this and treat the bet as not committed:

   ```
   Blocked — a bet cannot be committed without kill criteria. Fill "Kill criteria" in bets/<slug>/brief.md, then retry.
   ```

2. **Are they still meaningful?** A criterion whose date has passed or
   whose threshold no longer means anything is not a criterion. Reopen it.
3. **Has any been crossed?** If so, **escalate immediately** — not at the
   next scheduled review. The bet is **killed**, or **explicitly
   re-committed with a dated rationale** recorded in
   `portfolio/decisions.md`. There is no third option: silence is not a
   decision and "we kept going" is not a re-commitment.

## Close the loop

A review that produces **no intake consequence has not finished**. Field
5 must name what goes back to intake: added, killed, re-ranked,
re-horizoned — or, if genuinely nothing, what you checked to conclude
that.

## Rules

- Check absorption capacity against what is in flight, not against what
  is planned. Review throughput is a portfolio input.
- Recompute a horizon whose determinant moved; do not adjust the number
  in place. Hand it to `/horizon`.
- Never issue or alter an absorption-gate verdict from a review. The gate
  is a distinct phase held by a distinct party.
