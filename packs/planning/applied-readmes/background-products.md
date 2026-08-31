# `background/products/` — the portfolio as it stands today

Raw material about what this organisation already ships, sells,
maintains, or has not yet switched off. **The portfolio before the first
intake pass reorganises it**, described honestly rather than as it
appears on a slide.

## What belongs here

- **A product list or catalogue** — every product and service, including
  the ones nobody demos.
- **A pricing sheet**, a rate card, a packaging page, an SKU list.
- **Feature and capability inventories**, release notes, a changelog, a
  shipped-last-year list.
- **Support and maintenance load per product** — ticket volumes, on-call
  rotas, who actually gets paged for what.
- **Integrations and dependencies** others have come to rely on. These
  are irreversibility in disguise; note them here and record the
  irreversibility in `constraints/`.
- **The end-of-life list** — deprecated, sunsetting, or maintained
  without conviction. **Include the awkward rows:** the product whose
  sponsor left, the integration that is kept alive but no longer
  believed in, the thing that is neither progressing nor stopped.
- **Named maintenance owners**, where they exist. Where they do not, say
  so — an unowned product is a §6 finding.

## What the pack does with it

| Material | Where it lands |
|---|---|
| The product list, with honest status | **§5 Current portfolio** — the snapshot, including *drifting without a decision*, which is the section's real output |
| Unowned or unbelieved-in products | **§5**, and the first `learn` phase, which exists to resolve exactly those entries |
| Release cadence and what shipped when | With `performance/`, determinant **U** — the uncertainty-resolution rate. How fast this organisation has historically learned whether something worked |
| Maintenance load and named owners | **§6 Absorption capacity**'s maintenance-ownership row; the ceilings themselves live in `capacity/` |
| Integrations others depend on | Feeds **`I`** — capital-commitment irreversibility — recorded in `constraints/` |
| Pricing and packaging | **§1**'s revenue model, and the cost side of a bet's absorption cost |

**`products/` and `performance/` are a pair.** This folder says what
exists; `performance/` says whether it is working. Determinant `U` is
read across both, and §5's honest-status column is not fillable from
either alone.

## Raw is fine

**Paste the catalogue in.** The full price sheet, the whole release list,
the support export with its ugly columns. **Do not summarise prematurely**
— the row you would have dropped as unimportant is usually the drifting
one, and drifting entries are what §5 exists to surface.

Write the honest status next to the material rather than instead of it.
"Maintained but not believed in" is a legitimate status and belongs in
writing before anybody has to defend it.

## Provenance

```
**Source:** <who or what this came from>
**Date of the information:** <YYYY-MM-DD — when it was true, not when you saved it>
**Collected by:** <the user, or the agent that gathered it>
**Class:** <frame | mechanism | vendor magnitude>
```

**Undated material is treated as unreliable.** The product list is stable;
the honest status is not. A status assessment with no date is an opinion
about an unspecified month.

**A §5 row traceable to nothing here is a row to re-check, not one to
trust** — and in this folder that matters more than usual, because §5's
count is what §6's absorbable-bet number is compared against. Mark
unsourced rows `[NEEDS SOURCE]`. Never fabricate a citation.

## Who writes here

The **user**, and `portfolio-steward` — the role that owns the register
and the concentration cut, and therefore the role with a reason to write
down what is already in flight. `discovery-lead` writes here when the
inventory has to be assembled rather than supplied. `gate-reviewer` and
`target-reviewer` never write here. Provisional, as the roles are.

Relation to the brief, provenance in full, and the staleness rules:
`../README.md`.
