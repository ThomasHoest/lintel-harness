# Build order — epic level

**Status:** Draft
**Date:** 2026-09-02
**Derived from:** the five `F*-epics-and-tasks-*.md` documents · master spec §Recommended sequencing
**Scope:** **epics, not tasks.** The task graph is 206 nodes and 371 edges; this is the 27-node view, which is the one a person can hold.

---

## Why this document exists

The spec process says an epics document holds *"epics, tasks, dependency
graph"*. The **edges** were always there — 195 of 206 tasks carry a
`Depends on:` line, and every epic declares its own — but **the graph was
never assembled**, so nothing had ever read the dependency data as a
whole. Two things follow from doing so, and the second is the reason this
is a document rather than a diagram.

---

## The order

**Ten waves, and the declared epic graph is acyclic.** Everything in a
wave can proceed in parallel once the previous wave is done.

| Wave | Epics | What it is |
|---|---|---|
| **0** | **E-01** `F1` | The package, the diagnostic contract, the command surface |
| **1** | **E-02** `F1` | Path confinement, branded paths, the bounded walk |
| **2** | **E-03** `F1` | The pack declaration — strict JSON, schema, anatomy, parameters |
| **3** | **E-04** `F1` · **E-06** `F1` · **E-13** `F5` · **E-20** `F2` | The recipe · the payload and digest · pack declarations conform · argv and answer resolution |
| **4** | **E-05** `F1` · **E-07** `F1` · **E-15** `F5` · **E-16** `F5` | The six primitives · the manifest · migration fidelity · pack READMEs |
| **5** | **E-08** `F1` · **E-10** `F1` · **E-14** `F5` | The permission surface and disclosure · `verify` · recipes produce what they claim |
| **6** | **E-09** `F1` · **E-11** `F1` · **E-17** `F5` · **E-18** `F5` · **E-23** `F3` | `validate` and `pack info` · the write path · scaffolds · unenforced pack rules · `update`'s classification |
| **7** | **E-12** `F1` · **E-19** `F5` · **E-21** `F2` · **E-24** `F3` · **E-26** `F6` | Adversarial fixtures · the bundled-pack gate · `init`'s run · `update`'s write path · the skill and its installer |
| **8** | **E-22** `F2` · **E-25** `F3` | `init` acceptance · `update`'s report and exit contract |
| **9** | **E-27** `F6` | The seams — assert the CLI provides what the skill requires |

**This agrees with the master spec's `F1 → F2 → F5 → F3 → F6`** without
being derived from it, which is worth something: F1 occupies waves 0–7,
and no other feature can start before wave 3 because everything needs
either the diagnostic contract or the pack declaration. **F5 starts
earlier than the feature order suggests** — E-13 at wave 3 — because
conformance checks need only the schema, not the engine.

---

## The twelve back-edges, and what they mean

**Where a task needs an epic in the same wave or a later one.** Each is a
place the declared epic order and the task-level dependencies disagree.

| Epic | Wave | Needs | Wave |
|---|---|---|---|
| E-02 | 1 | **E-11** | 6 |
| E-05 | 4 | **E-10** | 5 |
| E-06 | 3 | **E-05** | 4 |
| E-10 | 5 | **E-12** | 7 |
| E-14 | 5 | **E-11** | 6 |
| E-16 | 4 | **E-09** | 6 |
| E-16 | 4 | E-15 | 4 |
| E-18 | 6 | E-09 | 6 |
| E-19 | 7 | E-12 | 7 |
| E-23 | 6 | E-11 | 6 |
| E-26 | 7 | E-21 | 7 |
| E-26 | 7 | **E-25** | 8 |

**Read these as information, not as errors.** Six are same-wave, which
means only that two epics interleave — the tasks are still orderable.
The six in bold cross a wave boundary and are worth understanding before
scheduling:

- **E-02 → E-11 is the sharpest.** Path confinement (wave 1) has a task
  needing the write path (wave 6): `T-0205` depends on `T-1106`.
  Confinement is what the writer *uses*, so this reads backwards.
- **E-05 ↔ E-10 and E-10 ↔ E-12 are genuine mutual dependencies.** The
  text/binary classifier needs `verify`'s comparison and `verify` needs
  the classifier; the fixture suite needs `verify` and `verify`'s test
  needs a fixture pack. **These are not mistakes** — they are two modules
  that define each other, which is ordinary — but they mean E-05, E-10
  and E-12 cannot be completed strictly in sequence. Build the shared
  shape first, then both sides.
- **E-26 → E-25** means the skill's reference material needs `update`'s
  `--json` contract, which is right and just later than E-26's wave.

**At task level these appear as three cycles**, which is what surfaced
them:

```
T-0507 → T-1002 → T-0507
T-0604 → T-0507 → T-1002 → T-1001 → T-0604
T-0205 → T-1106 → T-1101 → T-0205
```

None is visible task-by-task: every individual `Depends on:` line reads
as reasonable, and only the assembled graph shows they close a loop.

---

## Where the data lives, and one format trap

| Level | Where | Completeness |
|---|---|---|
| Task | `*Depends on: T-xxxx.*` under each task | 195 of 206; **zero dangling references** |
| Epic | `**Depends on:**` under each epic, plus the "Depends on" column in each feature's overview table | complete, and **acyclic** |
| Feature | Master spec §Recommended sequencing | `F1 → F2 → F5 → F3 → F6`, with reasoning |

**The trap:** a task's italic line carries **both directions** —
`*Depends on: T-0101. Prerequisite for T-0104, T-0105 …*`. A parser that
takes every `T-nnnn` on that line reads the forward references as
dependencies and reports **185 false cycles**. Split on *"Prerequisite
for"*. This is the first thing to know before writing any tool over this
data, and it is why the three real cycles above were nearly missed among
the noise.

---

## What this document is not

**It is not generated, and it will go stale.** It is a snapshot of the
dependency data as of 2026-09-02. The durable fix is a checked-in
generator with a cycle check that fails CI — which would have caught all
three task cycles the day they were written, and would make *"what is
ready now"* a command rather than a reading exercise. **That is not
built**, and this document exists because the epic-level view was asked
for and is small enough to be useful by hand.

**Do not resolve the back-edges by editing them away.** Four of the six
cross-wave ones describe real mutual dependencies between modules. The
fix, where there is one, is in how the tasks are split — not in deleting
an edge that is telling the truth.
