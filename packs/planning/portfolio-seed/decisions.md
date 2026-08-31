# Decision log

What was killed, when, and why — and what was re-committed instead. This
file is append-only. It exists so that a bet's death, or its survival, is
a thing someone wrote down on a date.

The rule it enforces: **no drift substituting for decision.** A bet that
crosses its kill criteria is **killed**, or **explicitly re-committed
with a dated rationale**. There is no third option. Silence is not a
decision, and "we kept going" is not a re-commitment.

---

| Date | Bet | Trigger | Decision | Rationale | Decided by |
|---|---|---|---|---|---|
| `<date>` | `<slug>` | `<K2 crossed: <signal> below <threshold>>` | `killed` | `<why killing rather than re-committing>` | `<name>` |
| `<date>` | `<slug>` | `<K1 crossed on <date>>` | `re-committed` | `<what changed that makes the bet still right, and the new criteria>` | `<name>` |
| `<date>` | `<slug>` | `<gate HOLD>` | `held-at-gate` | `<which of the four checks failed and what would clear it>` | `<name>` |

---

## What belongs in a row

- **Trigger** — the specific criterion crossed, or the gate verdict, or
  the explicit decision to stop. Not "we reviewed it".
- **Decision** — one of `killed`, `re-committed`, `held-at-gate`,
  `absorbed`. A named outcome, not a sentiment.
- **Rationale** — why *this* outcome rather than the other one. A
  re-commitment must say what changed; a re-commitment that says "still
  believe in it" is drift with a date on it.
- **Decided by** — a person. A decision with no decider is a decision
  nobody made.

## What does not belong

- Status updates. Nothing changed, no row.
- Rows added retrospectively to tidy the history. If a decision was not
  recorded when it was made, record it now **with both dates** — when it
  was made and when it was written down.
- Deletions. This log is append-only. A row that turned out wrong gets a
  correcting row, not an edit.

## Escalation

A crossed kill criterion **escalates immediately**, not at the next
scheduled review. The owner named on the criterion raises it; the
decision lands here the same day. The point of writing observable, dated,
owned criteria is that crossing one is a signal — and a signal that waits
for a meeting has been converted back into a calendar.
