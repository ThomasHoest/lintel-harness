# Next session — queue

Picked up cold, this is what to do and in what order. Delete when spent.

---

## 0. State

Committed and pushed: wave 1 (`27c6d93`), the three decisions (`eaf3e9b`).
**F1 v3.0 and the `general/` reconciliation are done** — see §1 and §2.

## 1. Q-79, Q-81, Q-80 — two folded, one outstanding

**Q-79 (`fillExpected`) — FOLDED.** Landed in F1 v3.0 as a step
declaration plus **two** new `verify` states (`filled`, `unfilled`, six
total), the `update` prohibition, mutual exclusion with `adaptExpected`,
US-1's boolean list at five, and the `E-VERIFY-MISMATCH` exclusion.
Reconciled into `pack-application.md`, `system-architecture.md`,
`interaction-model.md`, F3's §Scope and §F3.3, and F1's E-10.

**Q-81 (zero runtime deps) — FOLDED.** §NFR now *requires* an empty
`dependencies`; `collisionKey` narrows to NFC + ASCII case-folding as
**known limit 17**. `technology-choices.md` §7.1 ratified, §4.6
resolved, §1 status table and four section headings moved off ⚠️.
**Nine register entries closed** — U-1, U-2, U-3, U-4, U-6, U-8, U-10,
U-11, U-14 — not the eight advertised: **U-11 closed too**, because the
same fold allocated `W-LINK-FALLBACK`. **Five remain and none blocks a
task:** U-5, U-7, U-9, U-12, U-13.

**Q-80 (US-24's enumeration) — NOT FOLDED.** It is F5's, and F5 has not
been revised. It belongs with §3, not before it.

## 2. F1 + ADR-001 — F1 done, ADR-001 outstanding

**F1 is at v3.0 and every item §2 listed is folded:**

- **Catalogue 78 → 87**, verified by row count, not by claim. Four for
  `update`, four for `init`, one notice (`W-LINK-FALLBACK`) closing a
  gap US-13 had carried since v2.0.
- **Journal version 3** — `intent: write|delete` for `update`'s payload
  orphans, plus the recorded command, so `E-JOURNAL-PRESENT`'s remedy
  stops sending a crashed `update` to `init --rollback`.
- **`--dry-run` reserved** (list of eight → nine).
- **Every Q-62 residue v2.9 recorded and left**: §What is NOT in scope,
  US-14, `E-ALREADY-APPLIED`'s message, US-32's anchor note, four
  manifest-consumer rows, and §F1.9's forward-investment row — which no
  longer describes `update` as *merging* against a recomputed base.
  C-11 is now carried in full rather than half-deferred.

**ADR-001 — AMENDED, and now current against F1 v3.0.** A new
supersession section (*What Q-62, Q-63, Q-79 and Q-81 supersede*) sits
beside the Q-54 one, and **the contract types are rewritten to current
rather than annotated** — a deliberate departure from this ADR's
supersede-don't-delete convention, on the ground that the rest of §1 is a
*record* but the interface contract is a thing people compile against.
`VerifyState` six values, `StepChangeExpectation` (`adaptExpected` +
`fillExpected`, mutually exclusive), journal v3 with `intent` and
`command`, `ApplyInputs` with no `consent`. File plan: five commands
under a group, `update.ts` un-deleted as F1→F3, **`src/claude/
frontmatter.ts`** and **`src/semver/compare.ts`** added as deliberate
modules, `consent.ts` renamed `disclosure.ts` (a file called `consent.ts`
containing no consent is how a deleted gate gets rebuilt),
`destination-policy.ts` struck, `vitest.config.ts` deleted for
`node:test`, `confine.ts`'s fold narrowed to ASCII.

**Corrections found while amending, both worth knowing:**

- **§6.5's to-do list is spent** — every item on it was fixed in later
  passes. It is now marked as a record, not work. Do not work it.
- **The master spec is NOT behind.** It is at **v1.0.2**, reads five
  commands under the group, and its sequencing line is
  `F1 → F2 → F5 → F3 → F6`. The claim in this file and in `CLAUDE.md`
  that it "predates Q-62" was itself stale. **`CLAUDE.md` still says
  it** — fix that line.

**Next, and now unblocked:** **F1's epics need tasks for v3.0.** E-10's
heading moved to six states and the code counts were corrected, but no
task covers `fillExpected`, `filled`/`unfilled`, the nine new codes,
journal v3, `src/claude/frontmatter.ts` or `src/semver/compare.ts`.
Tasks name files against the ADR's file plan, which is why they waited.

## 3. F5 revision, then its epics

F5's ADR-002 returned **`REVISE SPEC`**. Beyond Q-80:

- *"planning is the only pack with a parameter"* is false — coding 2,
  writing 3, planning 1. True claim: planning is the only pack with a
  `when` over an answer
- `writing` has **three** authored templates, not two
- `writing`'s 7b index steps describe a mechanism that does not exist
  (one rename, not per-destination; the scaffold ships 12 pre-authored
  `index.md` files)
- planning's payload inventory omits `process.md`, `conventions.md`,
  `coordination.md`, `agents/README.md`
- F5 §Scope and §Out of Scope **still defer `update`/`status`** after
  Q-62 returned them
- `interaction-model.md:418` says `scout.md` can read the brief; it has
  no `Read` tool and the pack handles it honestly — the doc is wrong

**Pack work the ADR found** (separate from the spec revision):
- `coding` and `writing` **declare no `provenance`** — the exact
  condition F1 added the field to catch, and it passes `validate`
  silently because F1 has no code for absence
- `packs/coding/README.md` **fails four of US-28's five criteria** —
  largest outstanding pack item

## 4. Waves 2 and 3

**Wave 2** — ADRs for F2, F3, F6 (parallel), plus F5's epics once §3 is
done.
**Wave 3** — epics for F2, F3, F6.

Then a **Mode A security pass over F2, F3 and F6**, which have never had
one. F1's four rounds do not cover them.

## 5. Counters — next free

| | |
|---|---|
| Question | **Q-82** |
| User story | **US-99** |
| Epic | **E-13** |
| Task | **T-13xx** (Scheme A, epic-derived) |

Retired, never reusable: **US-5, US-6, US-7, US-11, US-12** (F1),
**US-22, US-23** (F5). US-11 and US-12 covered drift reporting and the
merge base — F3 re-covers that ground under fresh ids, deliberately.

`CLAUDE.md`'s counter table is **now current** — Q-82, US-99, E-13,
T-13xx, both ADRs, and the 78-code catalogue at v2.9.

## 6. How to spend less doing it

From `token-efficiency-notes.md`, the four that matter here:

- **Reserve disjoint ID blocks up front** for any parallel writers. Three
  collisions in one session; each cost a full reconciliation pass.
- **Brief agents with section pointers, not document names.** "Read F1"
  is a 3,600-line instruction.
- **Do mechanical edits directly.** Renames, counter updates and
  stale-line fixes do not need an agent.
- **Check the `general/` documents in the same pass as the fold**, not
  after someone notices.
