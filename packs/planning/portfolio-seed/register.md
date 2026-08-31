# Portfolio register

Every bet, its status, its phase and its horizon. One row per bet. This
file is the portfolio's front door — if a bet is not here, it is not in
the portfolio.

Maintained at **intake** and **prioritize**. Read at every other phase.
The intake pass that fills it is
`.harness/pack/templates/portfolio-intake.template.md`; `/review` writes
its consequences back here.

---

## Now

Committed or committing. Cut to **absorbable** capacity — what can be
reviewed, maintained and owned — not to available capacity.

| Bet | Status | Phase | Horizon | Binding determinant | Next check |
|---|---|---|---|---|---|
| `<slug>` | `proposed \| committed \| held-at-gate \| killed \| absorbed` | `<phase>` | `<range>` | `<lead time \| irreversibility>` | `<the signal, not the date>` |

## Next

Framed enough to know what they would need. Not committed, so no kill
criteria required yet.

| Entry | Why it is Next and not Now | What would move it | Origin |
|---|---|---|---|
| `<name>` | `<...>` | `<the signal>` | `<where it came from>` |

## Later

In the register so it is not rediscovered. Revisited when its signal
fires, not on a schedule.

| Entry | Why not yet | Revisit when |
|---|---|---|
| `<name>` | `<...>` | `<the signal>` |

## Below the line this cycle

A cut with no record is a cut that will be relitigated. One line each.

| Entry | Why it was cut | Revisit when |
|---|---|---|
| `<name>` | `<...>` | `<the signal>` |

---

## How to keep this file honest

- **Status vocabulary** (provisional): `proposed | committed |
  held-at-gate | killed | absorbed`. A bet is `absorbed` only after a
  `PASS` at the absorption/security gate, issued by a party that did not
  run deliver.
- **A `committed` row implies two files exist**: a brief with kill
  criteria in `bets/<slug>/`, and a horizon entry in `horizons.md`. If
  either is missing, the row is wrong, not the files.
- **The cut is to absorbable capacity.** Review throughput is an input to
  it, alongside delivery capacity. See `cadence.md`.
- **Concentration is the goal.** If the Now section reads broad, cut
  again.
- **Nothing enters without passing the intake gate** — a stated reason
  this is in front of us now. An entry with no reason is a rumour with a
  row.
