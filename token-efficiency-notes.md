# Where the tokens went — notes from the v1.0 spec phase

Observations from a single long session that produced the Lintel Harness
v1.0 spec set. Written to inform guidelines, not to excuse the spend.

Rough shape: ~35 sub-agent runs at 75k–270k tokens each. Reading, not
writing, dominated every one of them.

---

## 1. The reconciliation tax — the largest single cost

**Roughly half the agent runs produced no new specification.** They
reconciled documents against decisions already taken: chasing a change
through the cross-cutting docs, fixing ID collisions, correcting counts
that had gone stale.

The mechanism is structural rather than careless. A decision lands in
the feature spec and the ADR. The `general/` documents *summarise* those
specs — and **a summary written before a decision stays fluent and
readable afterwards while describing a system that no longer exists.**
Nothing about it looks stale, so it survives review and is found later,
by which time three more documents have inherited it.

The two shapes that go false silently:

- **closed enumerations** — "the manifest records name, version, answers
  and scaffolds" is wrong the moment a fifth field exists
- **counts and completeness claims** — "two drifts, two codes", "the only
  `generate` step in v1.0"

*Fix applied mid-session:* a fold is not finished until the `general/`
documents have been checked against it. Written into the coding pack's
spec process so it propagates.

## 2. Late reversals

Three decisions were reversed after work had been built on them:

| Reversal | Cost |
|---|---|
| `update` deferred, then returned to v1.0 | F1, F5, master spec, two `general/` docs all written against the deferral |
| Binary renamed | 233 occurrences across 10 files, plus a message-prefix decision |
| A whole primitive dropped after four security rounds had specified it | Every document describing it |

Some were genuine discoveries — the two-phase model was a real
improvement found by building. **But the two most expensive were
answerable on day one**: whether updating an applied project is in
scope, and what the CLI is called. Neither needed a spec to decide.

*Guideline candidate:* surface scope-shaping and naming questions
**before** the specs are written, not when a spec reveals them.

## 3. Parallel agents re-read the same documents

Every agent starts cold. Ten agents touching F1 means ten full reads of
~3,600 lines. Parallelism bought wall-clock time at a direct multiple of
token cost, and much of it was avoidable: agents were briefed to "read
F1" when three named sections would have done.

*Guideline candidate:* brief agents with **section pointers**, not
document names. Prefer fewer, larger tasks over one agent per document.

## 4. My own process errors

These caused several full corrective rounds and were entirely avoidable:

- **ID collisions, three times.** Parallel writers were each told to
  start at the same "next free" number. Each collision needed a
  dedicated reconciliation pass over long documents.
  *Fix:* reserve disjoint ID blocks up front. Worked on the fourth try.
- **Unasserted replacements.** A patch script reported success while
  matching nothing, so a correction silently did not happen and was
  found much later.
  *Fix:* assert an exact occurrence count on every replacement; fail
  loudly on a miss.
- **`git add -A` with agents running**, twice — sweeping in-flight work
  into commits scoped to something else, each needing a correction
  commit that could not amend already-pushed history.
  *Fix:* stage explicit paths whenever anything is running.

## 5. Agents used for work that did not need them

Several passes were mechanical edits across a handful of files —
renames, counter updates, stale-line fixes. Done directly they would
have cost a fraction. An agent is worth its overhead when the task needs
judgment or wide reading, not when it needs `sed` with care.

---

## What was genuinely irreducible

Not everything here was waste. Four security review rounds found two
CRITICAL findings twice over, including a privilege-escalation route
created by the very rewrite that simplified everything else. The spec
set is large because the product's core is a program that writes files
into a user's repository, and that earns its detail.

**The distinction worth keeping:** cost incurred *finding* something is
different from cost incurred *repairing self-inflicted drift*. The first
was most of the value in this session. The second was most of the spend.
