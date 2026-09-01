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

## 3. F5 — REVISED to v3.0. Epics unblocked; ADR-002 needs re-issuing

**Q-80 folded.** US-24's enumeration widens from five classes to **ten**,
each new one enumerated **by file** so the check still compares against a
list: (e) payload-side path repointing — 5 files; (f) parameter-token
insertion — C-43's 5; (g) region anchors — 6; (h) net-new authoring
beyond class (b); (i) Q-59's `securityreviewer` generalisation, which the
brief had recorded and US-24 never admitted. **The residue class (j) is
now an untested claim of exactly the kind (e) was**, and says so: the
check has still never been run against a real diff, and running it is the
acceptance test.

**Q-79 folded into pack content.** Four applied paths declared
`fillExpected` — every pack's `project-brief.md`, plus `writing`'s
`writing-guide/tone-of-voice.md`. **`writing`'s `strip-suffix` split in
two** so the declaration covers the voice guide alone and not the three
reference files nobody is asked to fill in: that pack goes **7 → 8**
declared base steps, and `CLAUDE.md`'s counts move with it (**13** total
with the scaffold branch). Recipes changed in all three packs; verified
no step declares both flags.

**Five ADR-002 defects corrected**, one more than the four listed here
before: the parameter claim (`coding` 2, `writing` 3, `planning` 1 — the
true claim is the `when`), `writing`'s three rendered templates, the
`index.md` mechanism that did not exist (one rename plus **12
pre-authored** files, not a rename per destination), the `update`/`status`
deferral, and — **new** — `planning`'s payload inventory omitting
`process.md`, `conventions.md`, `coordination.md` and `agents/README.md`.
All four are payload-only, which is why an inventory read off the recipe
missed them, and they carry anatomy parts **1, 4 and 5**.

**Also fixed, a gap in the F1 v3.0 fold itself:** the primitive table's
optional-field column listed `adaptExpected` and not `fillExpected` on
all six rows.

**Now outstanding for F5:**

- **ADR-002 should be re-issued.** Its verdict was `REVISE SPEC` against
  F5 v2.9; the spec is v3.0 and every finding is addressed. A re-review
  is what turns that into a verdict — do not treat the revision as
  self-certifying.
- **F5's epics** — unblocked, and they can now name files against
  ADR-001's amended file plan.
- **Pack work still untouched:** `coding` and `writing` declare no
  `provenance` (the exact condition F1 added the field to catch, passing
  `validate` silently because F1 has no code for absence), and
  `packs/coding/README.md` fails four of US-28's five criteria.

## 3b. Done since — pack work and F1's epics

**Pack conformance — DONE.** All three packs declared a **non-conforming
`provenance`**, in opposite directions: `coding` and `writing` declared
**none** (silent, because F1 has no code for absence), and `planning`
declared one that was **invalid** — `knowledgeBase` an array, `note` 347
chars against a 200 limit, either of which is `E-UNKNOWN-VALUE`, exit 2.
**The pack that had tried was the only one that would have failed the
apply.** All three now conform.

**`coding`'s README — DONE.** It met **one** of US-28's five criteria.
Rewritten to 120 lines against the house style the other two follow.
`writing`'s README corrected for the 7 → 8 step split.

**Checked and deliberately left:** anatomy `status` omissions in `coding`
and `writing` are **legal** — `status` defaults to `present`, and the
packs declaring non-default states carry their required `reason`/`note`.
Not a defect; do not "fix" it.

**F1's epics — DONE, at v1.1.** Six new tasks (T-0111, T-0112, T-0410,
T-1005, T-1110, T-1219), T-1002 rewritten for six states, and **nine of
the fourteen ⚠️ entries unblocked**. The ✅ markers **keep their
resolutions**, because several resolved to something other than the
obvious answer — U-4 above all, where the instruction is now *do not
reach for `toLowerCase()` and do not hand-roll a Unicode fold*. **Five
still block**: U-5, U-7, U-12 (×2), U-13 (×2).

## 3c. F5's epics — DONE

`F5-epics-and-tasks-template-packs.md`, **E-13…E-19, 32 tasks**, all
fifteen stories covered.

**It is not shaped like F1's, and the preamble says why.** F1 builds a
program that does not exist; **F5's deliverable already exists**, so the
work is conformance and verification — *run the check the spec has always
promised, then fix what it finds*. Every `[Implementer]` task that
follows a check is written as **fix what it found**, with its size
explicitly unknown until the check has run once. Planning against this
document without reading that preamble will produce fictional estimates.

**E-15 is the one to read first.** US-24's migration diff has **never
been run**, and widening the enumeration to ten classes did not make the
new residue class true — it moved an untested claim to a new letter.
T-1502's deliverable is **evidence, not a pass**, and T-1503 allows for
the possibility that the enumeration approach has failed, which would be
an ADR finding rather than a paperwork problem.

**T-1906 re-issues ADR-002**, last on purpose, and must check Q-80's
classes against T-1502's **actual output** rather than the enumeration's
own text.

## 3d. Q-82 — add-on packs (NEW, mid-session scope change)

**Decided and executed.** An **add-on** is a composable unit that is not a
way of working. A project holds **one pack and zero or more add-ons**. The
mechanism is **v1.1 (F7)** and undesigned.

**Done:** `backend-azure` and `backend-aws` moved to **`addons/`** — not
under `packs/`, because `packs/` means *what ships at v1.0* and three
separate checks rely on that. Each carries a `pack.json` marked
`unsupported-until-1.1` and a **record `recipe.json` that no CLI reads**,
preserving the steps rather than leaving them to be reconstructed.
`packs/coding/` lost its `scaffolds`, its `executableRoots` and both recipe
branches; its README, F5 v3.1, F5's epics v1.1, F1's epics v1.2,
`pack-inventory.md`, `CLAUDE.md` and brief §12 all follow.

**Two costs, accepted and recorded rather than discovered later:**

- **No v1.0 apply composes two scaffolds**, and no pair shares a category —
  so scaffold composition *and* `E-SCAFFOLD-EXCLUSIVE` have no bundled
  subject. Composition is the bigger loss: it is ordinary success-path code
  that nothing real now exercises.
- **No v1.0 pack ships an executable.** `executableRoots`, `executable:
  true` (a gate C-34 showed fails **open** on a typo),
  `E-EXEC-DEST-FORBIDDEN`, US-13's `0755` disclosure and `verify`'s mode
  comparison all lose their only real instance.

**F1's T-1220 adds the four fixtures** that were previously redundant with
those scaffolds. **That suite is now the sole coverage for two
security-relevant rules** — worth knowing before anyone trims it.

**Still open on this:** F7 has no spec, and the add-on *composition* rule
is entirely undesigned. **Q-83 is now recorded** (brief §9) as its first
design question — whether `category` belongs to scaffolds, add-ons or
both, and who owns an open-string namespace once add-ons are authored
independently. F7 must also settle whether an add-on may collide with
**its pack** (a case scaffolds never had) and whether add-ons declare
parameters.

**Fixed while investigating Q-83:** F1 US-9 asserted *"`writing-workstream`
declares none"* while the pack declares `"category": "workstream"` — a
false statement about a shipping pack, in the bullet defining the rule.
Behaviourally harmless, which is why it survived four security reviews.
**F1 is now v3.2**, and US-9 states plainly that all three of its
category branches are **fixture-covered only**, rather than leaving a
reader to assume an untested branch is a tested one.

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
