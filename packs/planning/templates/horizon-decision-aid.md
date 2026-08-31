# Horizon decision aid — a walkable path

Not a fill-in form. **The horizon is computed, not chosen**, so this is a
path you walk in order; the output is a horizon record with a named
binding determinant, written to `portfolio/horizons.md`. `/horizon` walks
it for you.

> `horizon ≈ max(longest-lead physical/regulatory constraint,
> capital-commitment irreversibility)`, adjusted **up** when uncertainty
> resolves slowly, and **down** when competitive substitution is fast.

Four determinants: two set the floor through a `max()`, two adjust it.
The `max()` is not a formality — naming **which of the two bound** is
half the value of the record.

---

## Step 1 — Longest-lead physical or regulatory constraint

**Ask:** what is the longest lead time between deciding and being able to
act, that no amount of money or effort removes?

Look for: certification and clearance cycles · trials and their read-out
dates · supply and tooling lead times · site, plant or infrastructure
build · hiring for a scarce, licensed or credentialled skill · a
dependency on someone else's release cycle.

**Record:** `L = <duration>`, and **what** sets it. If nothing sets it —
the work is pure software with no external gate — write `L = none` and
say so explicitly. `none` is a finding, not a blank.

> The test that catches most errors here: *would spending twice as much
> make this shorter?* If yes, it is a resourcing problem, not a lead-time
> constraint, and it does not belong in `L`.

## Step 2 — Capital-commitment irreversibility

**Ask:** at what point does the commitment stop being undoable, and how
long does the organisation stay committed after that point?

Look for: capital that cannot be recovered · contracts with terms ·
public or customer commitments · data or migrations that cannot be
unwound · an integration others come to depend on · a hire made against
one specific bet.

**Record:** `I = <duration the organisation stays committed>`, and **what**
makes it irreversible, and **when** irreversibility begins. Note that the
point of no return and the duration are different numbers, and the
horizon uses the duration.

> If nothing about this bet becomes irreversible, write `I = none`. A bet
> that is reversible throughout and has no lead-time constraint has a
> horizon set entirely by the adjustments in steps 4 and 5 — which
> usually means it is a short bet, and it should probably be smaller than
> it currently is.

## Step 3 — Take the max, and name which bound

```
H0 = max(L, I)
```

**Record `H0` and the determinant that bound it.** If they are close
enough that either could bind, record both and say so — a horizon whose
determinant could flip is fragile, and that is worth knowing before it
flips.

**Do not average them.** Averaging a nine-month regulatory clock with a
three-month commitment produces six months, which is a number that
describes nothing.

## Step 4 — Adjust **up**: does uncertainty resolve slowly?

**Ask:** how long until the thing this bet is uncertain about is actually
known?

- Resolves **inside** `H0` — no adjustment. The bet learns before it ends.
- Resolves **near** `H0` — no adjustment, but flag it: the bet ends about
  when it learns, so plan the review for the read-out and not for the
  calendar.
- Resolves **beyond** `H0` — **adjust up**, toward the resolution point.
  Planning to a horizon shorter than the uncertainty means committing to
  a decision the evidence will not have arrived for.

**Record:** the adjustment, and **when** the uncertainty resolves.

## Step 5 — Adjust **down**: how fast is competitive substitution?

**Ask:** how quickly could this be substituted — by a competitor, by a
cheaper route, by the capability becoming commodity?

- Slow substitution — no adjustment.
- Fast substitution — **adjust down**, toward the substitution window.
  A long horizon in a fast-substitution market plans for a world that
  will not be there.

**Record:** the adjustment, and the substitution window you used.

> Steps 4 and 5 can pull in opposite directions, and often do: slow-resolving
> uncertainty in a fast-substituting market. When they do, **say so and
> record both** rather than netting them off to a number. That tension is
> real information about the bet — usually that the bet should be
> smaller, staged, or explicitly framed as an option rather than a
> commitment.

## Step 6 — Write the record

Into `portfolio/horizons.md`, one entry per programme or bet:

| Field | Value |
|---|---|
| Programme / bet | `<name>` |
| `L` — longest-lead constraint | `<duration>` · `<what sets it>` |
| `I` — commitment irreversibility | `<duration>` · `<what makes it irreversible, from when>` |
| `H0 = max(L, I)` | `<duration>` · **bound by** `<L or I>` |
| Adjustment up (uncertainty) | `<none | to <duration>>` · `<resolves when>` |
| Adjustment down (substitution) | `<none | to <duration>>` · `<window>` |
| **Computed horizon** | `<range>` |
| What would change it | `<the falsifier>` |
| Date computed | `<date>` |

---

## Rules

- **Never take the horizon from the planning calendar.** Quarters, fiscal
  years and annual cycles are reporting periods. If the computed horizon
  does not line up with the calendar, the calendar is what is wrong.
- **A horizon with no stated falsifier is a guess with a number.** Step 6
  requires one.
- **Prefer a range to a point** wherever the evidence only supports a
  range. A false point invites a false milestone.
- **Recompute at review**, not at the calendar boundary. A horizon set
  once and never re-examined has become a calendar.
- **`none` is an answer.** Both `L = none` and `I = none` are legitimate
  and informative; a blank is not.
