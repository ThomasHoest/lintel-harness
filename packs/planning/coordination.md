# Coordination rules

How the phases hand off, who may do what, and what fires out of band.
This file is the pack's part 5. The four rules below are
**calibration-invariant**; only the cadence *defaults* they refer to vary,
and those live in `portfolio/cadence.md` in an applied project.

---

## 1. Cadence follows uncertainty resolution, not the calendar

**The calendar is a backstop, not a trigger.** A review fires when the
uncertainty a bet was committed against has moved — a result landed, a
constraint changed, a signal crossed a threshold — not because a quarter
elapsed.

A quarterly review that fires because it is a quarter later, on a bet
whose uncertainty has not moved, is a ritual. It consumes review capacity,
which this pack treats as a portfolio input, and it produces the
appearance of governance.

The calendar still has a job: it is the **longest** a bet may go
unreviewed, not the schedule on which bets are reviewed. Both halves
matter. Uncertainty that never resolves is itself a finding, and a bet
nobody has looked at in a year is not being managed.

## 2. The gate is non-delegable

- The absorption/security gate **may not be cleared or waived by the
  party that ran `deliver`**.
- It **may not run in parallel with `learn`**.
- Its verdict is a **named token** — `PASS` or `HOLD` — recorded in the
  bet's gate record and reflected in the register.

An unsupervised run may carry a bet up to the gate and may never clear
it. See `targets/README.md`.

## 3. A bet crossing its kill criteria escalates immediately

Not at the next scheduled review. The point of writing observable,
dated, owned kill criteria is that crossing one is a **signal**, and a
signal that waits for a meeting is a signal that has been converted back
into a calendar.

The owner named in the kill criteria raises it, the bet moves to a
decision — `killed`, or re-committed with a dated rationale — and the
decision is recorded in `portfolio/decisions.md`.

## 4. The loop closes

`learn` feeds the next `intake`. A roadmap review that produces no intake
consequence — nothing added, nothing killed, nothing re-ranked, no
horizon changed — **has not finished**. Write the consequence down or
run the review again; do not file it.

---

## Handoffs between roles

The role set is **provisional** — see `agents/README.md` — but two
handoff properties are not, because they follow from the process rather
than from the role literature:

| Handoff | Rule |
|---|---|
| `deliver` → gate | **Different party.** Whoever ran delivery does not hold the gate. This is the same separation the coding pack keeps between implementer and security reviewer |
| gate → `learn` | **Sequential.** `learn` consumes the gate verdict, so it starts after the verdict exists |

Everything else about who owns which phase is a proposal, and the pack
says so where it says it.

## Review capacity is a portfolio input

Review throughput is a constraint on **how many bets can run**, not an
afterthought that absorbs whatever is left. It is budgeted at
`prioritize` alongside delivery capacity, and it is one of the four
things the absorption gate checks. A portfolio cut to delivery capacity
and not to review capacity will pass its gate late, in a batch, by
exception — which is the failure this rule exists to prevent.
