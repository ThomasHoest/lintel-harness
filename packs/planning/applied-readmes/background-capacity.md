# `background/capacity/` — the real ceiling on concurrent work

Raw material about what this organisation can actually **take on** —
review, secure, validate, operate and keep alive — as opposed to what it
can start. **Starting is nearly free, and it is exactly what makes an
unabsorbable portfolio look healthy for two quarters.**

## What belongs here

- **Who reviews, by name.** Security review, code review, design review,
  clinical or regulatory review — whoever the reviewer of record is, and
  what else is on their plate.
- **Security review bandwidth** — how many reviews per cycle, how long
  each takes, and **whether a reviewer exists who did not build the
  thing.** The gate requires that separation; if there is exactly one
  person who can review, the portfolio's absorbable width is one.
- **Maintenance ownership** — who holds each thing after its bet closes,
  and how many things one person is already holding. A bet with no named
  owner on the far side of the gate is a liability with a launch date.
- **Verification and validation capacity** — who produces the evidence a
  bet needs before it counts as delivered, and how fast.
- **Team shape** — headcount by function, seniority, an on-call rota, a
  skills matrix, who is the only person who knows a system.
- **The awkward inputs**, which are the ones that actually bind: leave
  and holiday schedules, notice periods, parental leave, a contractor
  whose engagement ends, an open role that has been open for six months,
  a key person's known departure date.
- **Existing load** — what is already running that these same people
  support. Absorption capacity is what is left after that, not before it.

## What the pack does with it

| Material | Where it lands |
|---|---|
| The four capacities — security review, V&V, maintenance ownership, review throughput | Brief **§6 Absorption capacity**'s table, answered *with names and numbers rather than adjectives* |
| The derived number | **§6's absorbable active bets** — the number the prioritise cut cuts to. Practice 1: *concentrate the portfolio to absorbable capacity, not available capacity* |
| The same number | **The input the absorption/security gate is checked against.** The gate asks whether the organisation can take on what was built; §6 is what "can" means, and without it the gate is an opinion |
| Whether a reviewer exists who did not deliver | The gate's **non-delegability** rule, and brief **§8**'s *clear the gate* row. If the table cannot produce a different party, that is a §11 open question, not a detail to work around |
| Named maintenance owners | The `absorbed` status — a bet reaches it only with a named owner |
| Review throughput | Practice 5: *budget review capacity as a portfolio input* |

**This is the folder the absorption gate reads through.** Everything
else in `background/` informs a horizon or a section; this one sets a
number that a phase of the loop cuts against. If it is empty, the
prioritise cut is a cut to what could be started, which is the failure
mode the pack was built around.

## Raw is fine

**Paste the rota in.** The org chart, the on-call schedule, the leave
calendar, the reviewer's honest sentence about how many reviews a week
they can do. **Do not summarise prematurely** — "we have capacity for
about three" is precisely the claim §6 is supposed to be derived from
evidence rather than asserted, and the derivation is only checkable if
the rota, the load and the names are here.

Record the ceiling somebody actually stated, in their words, next to who
stated it. An honest ceiling from the person who holds it is worth more
than a plausible one from a spreadsheet.

## Provenance

```
**Source:** <who or what this came from — name the person for a stated ceiling>
**Date of the information:** <YYYY-MM-DD — when it was true, not when you saved it>
**Collected by:** <the user, or the agent that gathered it>
**Class:** <frame | mechanism | vendor magnitude>
```

**Undated material is treated as unreliable, and this folder changes with
every departure, hire and reorganisation.** Re-check it before every
prioritise cut, not on a schedule: a capacity number that survived a
resignation is a number that is now wrong in the direction that hurts.

**A §6 number traceable to nothing here is a number to re-check rather
than to trust.** That matters more here than anywhere else in
`background/`, because §6 is the one section whose output is an integer
the loop enforces. Mark it `[NEEDS SOURCE]` and leave it visible; a
portfolio cut to an invented ceiling is cut to nothing.

## Who writes here

The **user** — most of this is only knowable from inside.
`portfolio-steward` is the natural agent writer: it owns the
concentration cut and therefore has a reason to record the ceiling the
cut cuts to. `discovery-lead` writes here when capacity has to be
gathered.

**`gate-reviewer` reads this folder and does not write it.** Its write
boundary is gate records only, and the party checking capacity is not the
party who gets to restate it. `target-reviewer` is read-only.
`bet-framer` reads it to fill a bet's absorption cost. Provisional, as
the roles are — with the exception of the gate's non-delegability, which
is not.

Relation to the brief, provenance in full, and the staleness rules:
`../README.md`.
