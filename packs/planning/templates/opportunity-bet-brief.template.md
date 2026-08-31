# Bet — {{short name}}

> Copy this to `portfolio/bets/<slug>/brief.md` and fill it in
> **completely**. `/bet` does this for you. The six fields below are
> **fixed** — do not add, drop or rename them. A brief whose
> `Kill criteria` field is empty or still at its placeholder is **not
> committed**, whatever the status line says.

Status: `proposed | committed | held-at-gate | killed | absorbed`
Owner: `<name>` · Opened: `<date>` · Register entry: `<Now | Next | Later>`

---

## 1. Problem / opportunity

<A condition in the world, not a solution wearing a problem's clothes.
What is true now that is worth changing, and for whom? If this section
names a thing to build, it is not filled in yet.>

## 2. The bet

<One sentence, falsifiable: "We are betting that X, and we will know by
Y." Name what would make this bet wrong, not only what would make it
right.>

## 3. Reversibility

<How hard is this to undo once started? Be specific about **what**
becomes irreversible and **when** — a commitment made at month three is a
different bet from one made at month one.>

- Reversible until: `<the point of no return>`
- What becomes irreversible: `<capital, contracts, public commitment,
  data, an integration someone else now depends on>`
- Cost of unwinding after that point: `<what it takes>`

## 4. Absorption cost

<What taking this on costs **after** delivery. This is the field most
often left thin, and it is the field the absorption gate will check.>

| Cost | This bet's answer |
|---|---|
| Security surface added | `<what new surface, reviewed by whom>` |
| Verification and validation load | `<what has to be proven, and how often>` |
| Maintenance owner after close | `<a named party with time — "the team" is not an owner>` |
| Ongoing review throughput | `<what this adds to the standing review load>` |

## 5. Horizon

<Computed, not chosen. Walk `/horizon`, or the horizon decision aid in
`.harness/pack/templates/horizon-decision-aid.md`. Record the
determinant that bound.>

- Computed horizon: `<range>`
- **Binding determinant:** `<longest-lead physical/regulatory constraint |
  capital-commitment irreversibility>` — value: `<...>`
- Adjustments applied: `<up, because uncertainty resolves slowly> |
  <down, because competitive substitution is fast>` — or `none`
- What would change it: `<the falsifier>`

## 6. Kill criteria

**Stated before the bet starts. This is not negotiable.**

Each criterion must be **observable** (a named signal someone could go
and check), **dated or thresholded**, and **owned** (a named party
responsible for looking). "If it stops looking promising" is not a kill
criterion.

| # | Criterion | Signal to check | By when / threshold | Owner |
|---|---|---|---|---|
| K1 | `<...>` | `<where you look>` | `<date or number>` | `<name>` |
| K2 | `<...>` | `<...>` | `<...>` | `<name>` |

> **If one is crossed:** escalate immediately, not at the next scheduled
> review. The bet is **killed**, or **explicitly re-committed with a
> dated rationale** recorded in `portfolio/decisions.md`. There is no
> third option. Silence is not a decision.

---

## Claims ledger

Every load-bearing claim in this brief, with its source and its class.
`[NEEDS SOURCE]` is an acceptable entry; a fabricated citation is not.

| Claim | Source | Class (frame / mechanism / vendor magnitude) |
|---|---|---|
| `<...>` | `<...>` | `<...>` |

---

## Two filled shapes, at opposite poles

These are shape examples, not data. **The template is identical at both
poles; only the fill changes.**

**At a high constraint floor** — a long-lead, gated programme:

- *Reversibility:* reversible until the certification submission; after
  that, the design is frozen for the duration of the review.
- *Horizon:* long, and **the binding determinant is lead time**, not
  irreversibility — the physical or regulatory clock is longer than the
  commitment.
- *Kill criteria:* tend to be **milestone-shaped** — a gate failed, a
  test article missing by a date, an assumption about the regulatory
  pathway falsified.

**At a near-zero constraint floor** — continuous release:

- *Reversibility:* reversible almost throughout; irreversibility arrives
  through **adoption and integration**, not through capital.
- *Horizon:* short, and **the binding determinant is irreversibility**
  adjusted **down** by fast competitive substitution.
- *Kill criteria:* tend to be **threshold-shaped** — a usage or retention
  signal below a number by a date, with a named owner watching weekly.
