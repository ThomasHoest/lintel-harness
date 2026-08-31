# {{Project}} — product brief

**Status:** {{Draft | In Review | Accepted | Superseded}}
**Owner:** {{name}}
**Last updated:** {{YYYY-MM-DD}}

> **Template note** — the brief is the document every other spec is
> downstream of: research, feature specs and ADRs all cite it. Write it
> before the first research doc, and keep it current — when the brief
> and a spec disagree, the brief wins and the spec is what gets fixed.
> Delete these notes as you fill each section.

---

## 1. Purpose

{{One or two paragraphs. What is this product, for whom, and what does
it do? Lead with the thing itself, not the background. A reader who
stops here should be able to describe the product to someone else.}}

---

## 2. The problem, precisely

{{What is wrong today, stated concretely enough to be checked. Name the
current workaround and why it fails. Avoid "there is no good solution
for X" — say what people actually do now and what it costs them.

If two requirements pull against each other, say so here. The tension
usually turns out to be the core design problem.}}

---

## 3. What exists today

{{The evidence base. Prior art, existing internal tooling, the manual
process this replaces. If something already works partially, describe
it — the shape of the eventual solution is usually latent in it.

Delete this section only if the product is genuinely greenfield.}}

---

## 4. Goals

| # | Goal | Measure |
|---|---|---|
| G1 | {{what success looks like}} | {{how you would know it happened}} |
| G2 | {{...}} | {{...}} |

{{Every goal needs a measure that is observable. "Fast" is not a
measure; "under a minute on a repo of 500 files" is.}}

### Non-goals

- {{Something a reader would reasonably assume is in scope, and is not}}
- {{...}}

{{Non-goals are load-bearing. They are how you stop the scope
re-expanding three documents later.}}

---

## 5. Users and use cases

{{Who uses this, and what they are doing when they reach for it. A
table of "today vs with this product" per use case works well.}}

| Use case | Today | With this product |
|---|---|---|
| {{...}} | {{...}} | {{...}} |

---

## 6. Requirements

{{Numbered R1, R2, … Group by theme. Each requirement should be
specific enough that you could tell whether a build satisfies it.

If this brief expands an earlier note or conversation, trace each
requirement back to its origin so nothing is silently invented and
nothing is silently dropped.}}

### R1 — {{theme}}

- {{requirement}}
- {{requirement}}

---

## 7. Key design decision

{{Use when one decision dominates the design — the choice everything
else follows from. Lay out the options in a table with a verdict, and
state a recommendation rather than a survey.

Delete this section if no single decision dominates.}}

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| {{A}} | {{...}} | {{...}} | {{recommended / rejected}} |

---

## 8. Success criteria

- **S1** — {{a condition that is true or false, checkable at release}}
- **S2** — {{...}}

{{These are the release gate. If a criterion cannot be checked, it is a
goal, not a criterion — move it to §4.}}

---

## 9. Open questions

| # | Question | Notes |
|---|---|---|
| Q-1 | {{the question}} | {{why it matters, what it blocks, any default assumption}} |

{{Number them Q-N and keep the ID when the answer moves to §12.
Never reuse a number. Mark the ones whose answer blocks specification.}}

---

## 10. Out of scope

- {{Explicitly excluded, with one line on why}}

---

## 11. Next steps

1. {{The immediate action, usually resolving the blocking questions}}
2. {{...}}

---

## 12. Resolved decisions

| # | Decision | Date | Rationale |
|---|---|---|---|
| Q-N | {{what was decided, stated as a fact}} | {{YYYY-MM-DD}} | {{why, including what was rejected and the cost accepted}} |

{{The rationale column is the valuable one. A decision without its
reasoning gets re-litigated the first time someone disagrees with it.}}
