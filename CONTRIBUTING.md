# Contributing

Internal repository. This is how work happens here, and the conventions are
load-bearing rather than stylistic.

`CLAUDE.md` is the map. `DEVELOPING.md` is the working note for writing
code. This file is the process around both.

---

## Know which level you are on

This repo is **self-hosting**: it generates agentic project scaffolding,
and it *is* an agentic project using that scaffolding. Two levels, easy to
confuse:

| Level | What it is | Where |
|---|---|---|
| **Meta** | how *this repo* works | `.claude/` |
| **Product** | what the harness *ships* | `packs/` |

An edit to `.claude/agents/architect.md` changes how this project is built.
An edit under `packs/` changes what users get. **Never make one thinking
you are making the other.**

---

## Three rules that are not negotiable

**1. No incidental edits under `packs/`.** Not to fix a typo, not to
improve a prompt in passing. Pack content is **product**, so changing it is
spec-governed work under F5.

**2. Fix the pack before the copy.** A defect found in an applied file is a
defect in `packs/<name>/`. Patch it there and re-apply. Fixing only the
applied copy is precisely the drift this product exists to prevent — and
doing it *here*, of all repositories, would invalidate the evidence.

**3. Dogfood first.** Before automating a step, do it by hand here and log
what it cost. The manual-apply log in `CLAUDE.md` is spec input, not
decoration; its every fiddly line became a requirement.

---

## The specification process

```
research → spec → design-spec (if UI) → ADR (PROCEED) → epics-and-tasks → implementation
```

**Every arrow is a gate.** Code for a feature may only be written once its
spec set is Accepted and its ADR is `PROCEED`. A `securityreviewer` Mode-A
pass runs at the ADR gate; the security-implementation review runs at the
code-review gate.

The process itself lives in `packs/coding/specifications/README.md` and
`conventions.md` — **read both before touching specs.** The
`specifications/README.md` in this repo is an *index*, not a copy.

Status values: `Draft | In Review | Accepted | Superseded`.

---

## Changing a specification

**Amend in place, and record why.** Every spec carries an amendment history
table; a change that does not appear there did not happen.

Four habits, each learned from a defect that shipped without them:

**State the reasoning, not just the rule.** A rule with no *why* is a rule
somebody later simplifies into a defect. If reversing it would break
something, say what.

**Watch closed enumerations.** "Records X, Y and Z", "two drifts", "the
five deletions", "declares 21 steps" — these go false **silently** and read
perfectly well while wrong. Several have. One survived *inside the very
commit that corrected it elsewhere*.

**A rule with no error code is a rule nobody can assert.** `§Error States`
forbids asserting a fault by string-matching its prose, so a rule named
only in prose is unassertable in either direction. Two codes were missing
entirely and were found by *building* the module that had to raise them.

**Check `specifications/general/` too.** A decision folded into F1 or F5 is
not folded until the five cross-cutting documents have been checked against
it. That has failed three times.

### The error catalogue

`F1-spec-pack-format-and-manifest.md` `§Error States` is the **only**
catalogue. **No other document may invent a code.**

`src/diag/codes.ts` and `src/diag/catalogue.ts` are its **projection** —
generated, never hand-edited:

```bash
node scripts/gen-diag.mjs    # regenerate, read the diff, commit both
```

Drift guards re-derive them on every test run and fail on divergence.

---

## Writing code

Read `DEVELOPING.md` first. The short form:

```bash
npm ci
npm run typecheck    # all three tsconfigs, no emit
npm test             # unit, integration, pack-conformance, structural
```

- **Zero runtime dependencies.** The product's own security argument turned
  on itself: every runtime dependency is code inside the boundary of a tool
  whose job is writing into somebody's repository. Strict JSON, schema
  validation, glob, semver and the frontmatter reader are all hand-rolled;
  the test runner is `node:test`.
- **Doc comments explain *why*.** Security-relevant ones say what breaks if
  the rule is reversed. Match the density of `src/security/confine.ts` or
  `src/recipe/write-set.ts`. No filler.
- **Tests carry their reasoning too** — why *this* behaviour and not the
  other one, and what a false claim would cost.
- **Diagnostics via `DiagnosticBag`**, never by throwing. Assert **codes**,
  never prose. Exit classes via `exitClassFor`.
- Unit tests sit beside the code they cover. Integration, pack-conformance
  and structural tests live under `tests/`.

### Structural tests are rules, not suggestions

Some properties cannot be expressed in the type system, so they are
asserted over the source tree:

- **no cast into a path brand** outside its one minter — C-14's *"a path
  that skipped the gate is a compile error"* holds only while nothing
  casts, and the guard walks `tests/` as well as `src/`;
- **no seventh primitive module**, and nothing in the recipe layer imports
  a process-spawning module;
- **one denylist, one catalogue, one glob matcher.**

If one of these fails, it is telling you something. Twice now the guard has
caught a convenience cast within minutes of it being written.

---

## Committing

**Commit messages explain the *why*.** The subject says what; the body says
what problem it solves and what would have gone wrong otherwise. `git log`
is a design record here and is used as one.

- End commit messages with the `Co-Authored-By` trailer already in use.
- Never commit secrets.
- Branch from `v1.0` for CLI work; `main` carries specifications and packs.

---

## When the spec and the code disagree

**The spec is authoritative — and then it gets amended.**

That is not a formality. Implementing a rule is the most productive review
this project has: roughly two dozen defects were found that way, none of
them by reading. When you hit one, fix the *specification* first, then the
code, in the same change. A code fix that leaves the spec wrong has moved
the defect rather than removed it.

If the correct behaviour is genuinely unclear, **record it as a known
limit** rather than inventing one quietly. `§F1.9` holds twenty-two of
them, and each one is a decision somebody can find later.
