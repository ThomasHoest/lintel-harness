---
description: Open a new bet brief from the pack template, or move an existing one to committed — refusing to commit one without kill criteria.
argument-hint: <bet slug> [a one-line description of the opportunity]
---

You are opening or committing a **bet** in this project's portfolio.

$ARGUMENTS

If `$ARGUMENTS` is empty, ask for the bet slug before doing anything.

## Opening a new bet

1. Read `.harness/pack/templates/opportunity-bet-brief.template.md` — the
   six fields are **fixed**: problem/opportunity, the bet, reversibility,
   absorption cost, horizon, kill criteria. Do not add, drop or rename
   them.
2. Read `.harness/pack/conventions.md` for evidence discipline and the
   claims ledger, and `portfolio/register.md` for what is already in
   flight.
3. Create `portfolio/bets/<slug>/brief.md` from the template, with
   `Status: proposed`.
4. Fill what the discovery evidence supports. Leave the rest at its
   placeholder — a placeholder is honest, an invented fill is not.
5. Add the bet to `portfolio/register.md` with its status and placement.

## Committing a bet

A bet moves to `committed` only when **both** of these hold:

- **Kill criteria are present** — not empty, and not still at the
  template placeholder. Each one **observable**, **dated or
  thresholded**, and **owned**.
- **A horizon is recorded**, computed rather than chosen. Walk `/horizon`
  if there is none.

**If `Kill criteria` is empty or unchanged from the template placeholder,
refuse. Do not set the status. Print exactly this, and nothing softer:**

```
Blocked — a bet cannot be committed without kill criteria. Fill "Kill criteria" in bets/<slug>/brief.md, then retry.
```

Then say which criteria are missing and what a good one would look like
for this bet: a named signal, a date or threshold, and an owner. Filling
the field and retrying succeeds.

**The limits of this check, stated rather than implied.** This is an
instruction you follow, not a mechanism that stops a write. A bet
committed by hand-editing `brief.md` is **not** blocked here — it is
caught at the next `/review`, which re-checks kill criteria for every bet
it reviews, or it is not caught at all. The script at
`.claude/hooks/kill-criteria-guard.sh` is inert: registered by nothing,
executed by nothing.

## Rules

- Never write kill criteria on the author's behalf to get past the block.
  Refusing and explaining is the whole point of the rule.
- Never soften a criterion to make a bet easier to commit.
- Kill criteria written after delivery has started are written around the
  work. That is why the order is enforced.
- Do not mark a bet `absorbed`. That requires a `PASS` at the
  absorption/security gate, which is held by a different party — see
  `gate-reviewer`.
