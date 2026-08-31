# `portfolio/` — the register, the horizons, and the decision log

This is where the portfolio lives. The work of this project **is** what is
in this folder.

| File | What it holds |
|---|---|
| `register.md` | Every bet: status, phase, placement (Now / Next / Later), horizon |
| `horizons.md` | The computed horizon per programme or bet, with its **binding determinant** |
| `cadence.md` | Review cadence defaults for this project's calibration |
| `absorption-gate.md` | How much of the absorption/security gate this organisation's existing process already holds |
| `decisions.md` | The decision log — what was killed or re-committed, when, and why |
| `bets/` | One folder per bet. See `bets/README.md` |

`cadence.md`, `horizons.md` and `absorption-gate.md` came from the
calibration this project was initialised at. Which one that was is
recorded in `calibration.md` at the repo root — keep that file.

## The loop this folder serves

```
intake → discovery → prioritize → commit → deliver → [ABSORPTION GATE] → learn
   ↑                                                                        │
   └────────────────────────────────────────────────────────────────────────┘
```

| Phase | Where its work lands |
|---|---|
| Intake, prioritize | `register.md` — added, ranked, and **cut to absorbable capacity** |
| Discovery, commit, deliver | `bets/<slug>/` |
| Commit | `horizons.md` gains an entry; the brief gains kill criteria |
| Gate | A gate record in the bet folder; the verdict token in `register.md` |
| Learn | A review in the bet folder; consequences in `decisions.md` and back to `register.md` |

## What does **not** belong here

- **Document templates.** They stay in the payload and are read from
  `.harness/pack/templates/`. Copying one here creates a second copy that
  will drift.
- **Delivery work.** The portfolio records bets; it is not where the work
  of a bet is done.
- **Anything without a decision in it.** A status report that changes
  nothing is not portfolio content.

## The two rules this folder exists to make visible

1. **Kill criteria before the bet starts.** A brief without them is not
   committed, whatever its status says. `/bet` refuses, `/review`
   re-checks — and neither fires on the file write, so a hand-edit is
   caught at review or not at all.
2. **No drift substituting for decision.** A bet that crosses its kill
   criteria is killed, or explicitly re-committed with a dated rationale
   in `decisions.md`. Silence is not a decision.

The full conventions: `.harness/pack/conventions.md`. The phase
definitions: `.harness/pack/process.md`.
