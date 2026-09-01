# Epics & Tasks: `harness update` (Lintel Harness v1.0 — Feature 3)
**Version:** 1.1
**Status:** Draft
**Date:** 2026-09-01
**References:** `F3-spec-update.md` (US-59…US-72) · `F3-ADR-004-update.md` (**PROCEED** — authoritative for the file plan, the four dispositions and the exit-class rule) · `F1-spec-pack-format-and-manifest.md` **v3.4** (journal v3, the four `E-UPDATE-*` codes, `fillExpected`) · `F6-ADR-005` (Q-77 and Q-78 jointly) · `general/interaction-model.md` §11

**Amendment history**

| Version | Date | Summary |
|---|---|---|
| 1.0 | 2026-09-01 | Initial breakdown against `F3-ADR-004`. Claims **E-23…E-25** and **T-2301…T-2507**. |
| 1.1 | 2026-09-01 | **Mode A conditions C-51 and C-54 folded.** **T-2407** — deletion re-confines immediately before acting, refusing a path whose type changed since planning; C-14 makes write-time re-confinement absolute and the delete path carried no equivalent. **The risk is the backup, not the unlink**: `update` reads pre-apply bytes into `journal.d/` before removing, and a symlink planted between plan and execute makes that read reach outside the project. **T-2508** — the human report bounds `expectedNew` excerpts with an explicit truncation notice, `--json` staying the complete channel. Next free **T-2408**, **T-2509**. |

---

## Read this before estimating anything

**`update` is `verify` with a second recomputation and a write path.** No
merge engine, no three-way state, no conflict markers — Q-62 decided
that, and `F3-ADR-004` turned it into a structure. The whole feasibility
argument is one observation: **the project carries the payload it was
applied from**, so `expected_old` is recomputable and the merge base a
three-way merge would have needed never has to be stored.

Four things that change how these tasks should be read:

- **This feature writes based on a comparison, which `verify` only
  reports.** A classification defect here is a **data-loss** defect. That
  is why T-2302 shares `verify/compare.ts` rather than reimplementing it,
  and why T-2303 asserts the two agree.
- **The digest gate is stricter here than in `verify`, for the same
  reason.** `expected_old` is computed *from* `.harness/pack/`; an edited
  payload does not merely make the report meaningless, it makes `update`
  replace the user's work. C-11's concern is strictly stronger for this
  command than for the one it was written about.
- **`update` exits `0` with edited paths outstanding.** This looks wrong
  and is load-bearing — see E-25's preamble.
- **There is no resume.** A resumed update would need `expected_old` from
  a payload already replaced. Rollback, then re-run.

**Blocked on an F3 spec fold.** `F3-ADR-004` §5 requires §F3.3's
disposition table to go from **six rows to four** before these tasks are
implemented, because two of its rows are sub-cases of *replaced* that the
write path does not act on. **T-2301 carries that fold**, and it is first
for that reason.

---

## Epic overview

| Epic | Title | Stories | Depends on |
|---|---|---|---|
| E-23 | The two recomputations and classification | US-59…US-63 | F1 E-05, E-06, E-10 |
| E-24 | The write path — replace, keep, delete, journal v3 | US-64…US-68 | E-23, F1 E-11 |
| E-25 | The report, `--dry-run`, and the exit-class contract | US-69…US-72 | E-24, F6's seams |

---

## E-23 — The two recomputations and classification

**Depends on:** F1 E-05 (the primitives), E-06 (payload and digest), E-10
(`verify`'s comparison).
**Unlocks:** everything else in this feature, and F6's reconciliation.

- [ ] **T-2301** `[Architect]` **Fold §F3.3's disposition table to four
  rows** — `replaced`, `kept-edited`, `kept-fill-expected`, `deleted` —
  per `F3-ADR-004` §5. The spec enumerated six before Q-79 existed; two
  are sub-cases of *replaced* distinguished by presence in
  `expected_new`, which the write path does not branch on. **First,
  because the tasks below implement whatever the table says**, and six
  rows would produce two dispositions nothing distinguishes.
  *No dependencies. Prerequisite for every task below.*

- [ ] **T-2302** `[Implementer]` `src/update/classify.ts` — the two
  recomputations. `expected_old` = phase 2 over the **local**
  `.harness/pack/`, its recipe, and the manifest's answers and scaffolds;
  `expected_new` = the same over the **bundled** payload. **Classification
  calls `verify/compare.ts`** and does not reimplement it. Pure: takes
  payloads and answers, returns entries, writes nothing.
  *Depends on: F1 T-1002, T-0604, T-0704, T-2301.*

- [ ] **T-2303** `[TestWriter]` Assert `classify.ts` and `verify` agree on
  a shared fixture — same project, same payload, same six states. **The
  cheapest guard against the divergence that matters**: two comparison
  implementations answer differently the first time one is fixed, and
  `verify` is the acceptance test for S7 while `update` is what maintains
  it, so any drift silently corrupts the gate.
  *Depends on: T-2302.*

- [ ] **T-2304** `[Implementer]` The digest gate, **first and
  fail-closed**, before any recomputation and long before any write:
  `.harness/pack/` must hash to the manifest's `payloadDigest` or
  `E-PAYLOAD-DIGEST-MISMATCH`, exit 2, **zero bytes**, with no
  classification reported. Then the recorded answers are re-validated
  against their own declarations (`E-MANIFEST-ANSWER-INVALID`, exit 2,
  same suppression).
  *Depends on: F1 T-0602, T-2302.*

- [ ] **T-2305** `[Implementer]` Version resolution: compare the applied
  pack version against the **bundled** one with `src/semver/compare.ts`.
  Not newer → **`E-UPDATE-NOT-NEWER`**, exit 1, remedy `npm i -g
  @lintel/cli@latest`. **`update` never resolves "newer" over the wire** —
  a project moves to the version bundled in the installed CLI, which keeps
  §NFR *No network* true for every v1.0 command with no exception. Covers
  equal and older together, because the remedy is the same.
  *Depends on: F1 T-0304b, T-2304.*

- [ ] **T-2306** `[Implementer]` The two refusals that stop a run before
  it starts: **`E-UPDATE-PARAM-UNANSWERED`** — the newer pack declares a
  parameter the manifest has no answer for, and **`update` may not fall
  back to the declared default**, because a default is a reasonable first
  answer and an unreasonable silent one when it may drive a `when` that
  adds or removes steps; and **`E-UPDATE-SCAFFOLD-DROPPED`** — the newer
  pack no longer declares a selected scaffold, whose paths would otherwise
  be payload orphans and be deleted, removing a whole selected feature on
  a version bump.
  *Depends on: T-2305.*

- [ ] **T-2307** `[Implementer]` `src/update/plan-update.ts` — entries →
  `UpdatePlan`: write set, delete set, kept set, counts per disposition.
  **All bytes rendered at plan time** (C-23), exactly as `plan-phase2.ts`
  does, so the executor reads no payload file.
  *Depends on: F1 T-1110b, T-2306.*

- [ ] **T-2308** `[Implementer]` The **`fillExpected` prohibition**: a path
  in the fill-expected set is `kept-fill-expected` and is **never
  overwritten** — not when the newer pack changed the file, not when the
  path is byte-identical to what shipped, and under no flag. **Absolute
  rather than conditional on the file having been filled**: an unfilled
  brief and a filled one are indistinguishable to a rule that must be
  right before it looks, and the costs are not symmetric — over-applying
  leaves a stale template the user can see and delete, under-applying
  silently destroys the document every other document is downstream of.
  *Depends on: F1 T-0410, T-2307.*

---

## E-24 — The write path — replace, keep, delete, journal v3

**Depends on:** E-23, F1 E-11 (journal, lock, atomic write, rollback).

- [ ] **T-2401** `[Implementer]` The commit sequence in
  `src/cli/commands/update.ts`: lock → journal (**v3**, `command:
  "update"`) → replace unedited paths → delete payload orphans → replace
  `.harness/pack/` with the newer payload → rewrite
  `.harness/manifest.json` → remove the journal. The payload replacement
  is **after** the applied writes, because `expected_old` is computed from
  it and it must survive until nothing needs it.
  *Depends on: F1 T-1110, T-2307.*

- [ ] **T-2402** `[Implementer]` The delete path — the only genuinely new
  write behaviour in this feature, and the reason journal v3 exists. A
  payload orphan is journalled with **`intent: "delete"`**, carrying
  `preExisting: true`, the pre-apply hash and mode, and a backup, and
  **no intended hash**; rollback restores it unconditionally. F1's
  five-case table models overwrite and create; this is the case it did
  not.
  *Depends on: F1 T-1110, T-2401.*

- [ ] **T-2403** `[Implementer]` Rollback for an interrupted update: the
  journal's `command` field makes `E-JOURNAL-PRESENT`'s remedy read
  `update --rollback` rather than `init --rollback` — which, after a
  crashed update, sent the user to a command that answers
  `E-ALREADY-APPLIED` and left the journal exactly where it was. **A
  remedy that cannot work is worse than none, because the user believes
  they tried it.**
  *Depends on: F1 T-1110, T-2402.*

- [ ] **T-2404** `[TestWriter]` `tests/integration/update-write.test.ts` —
  a full update across a real version bump: unedited paths replaced,
  edited paths byte-identical to before, `fillExpected` paths untouched
  **even when the newer pack changed them**, orphans gone, manifest
  rewritten, journal removed.
  *Depends on: T-2401, T-2402, T-2308.*

- [ ] **T-2405** `[TestWriter]` The gate, asserted as a **write**
  precondition and not only a read one: corrupt one byte of
  `.harness/pack/`, run `update`, require exit 2, the digest code, **zero
  bytes written** and the project unchanged by recursive comparison. This
  is the assertion that matters most in the feature — the failure it
  guards is replacing a user's edited file because a corrupted payload
  made it classify as unedited.
  *Depends on: T-2304, T-2401.*

- [ ] **T-2406** `[TestWriter]` Interrupted-update rollback: fault-inject
  mid-write, assert the journal survives with `command: "update"`, that
  `update --rollback` reverses both writes **and deletes**, and that a
  file the run did not create is not removed.
  *Depends on: T-2403.*


- [ ] **T-2407** `[Implementer]` **Deletion re-confines immediately before
  acting** (C-51). `confineAtWrite()` on each target, `lstat` it, and
  **refuse a path whose type changed since planning** — `E-TARGET-RACE`,
  exit 2, journal intact, the same code and class the write path already
  uses for the same fault. C-14 makes write-time re-confinement absolute
  and §1 carried no equivalent into deletion.
  **The risk is the backup, not the unlink.** Removing a symlink removes
  the link and not its target, so this is not arbitrary file deletion —
  but `update` **reads the pre-apply bytes into `.harness/journal.d/`
  before removing**, and a read through a symlink planted between plan and
  execute reaches outside the project. The confinement is needed for the
  **capture**, which is the half that is easy to miss when reasoning about
  deletion alone.
  *Depends on: T-2402, F1 T-0207.*
---

## E-25 — The report, `--dry-run`, and the exit-class contract

**Read the exit rule before writing any task here.** It is the sharpest
decision in the feature and it looks backwards:

> **The writing command reports; the read-only mode gates.**
> `update` exits **`0`** on a completed run, **including when it leaves
> edited paths for reconciliation.** `update --dry-run` exits **`1`** with
> `E-UPDATE-AVAILABLE` when there is anything to do.

Exiting 1 on outstanding edits is the intuitive choice and **would
disable the feature Q-62 created**: F6's IM-7 stops the skill on any
non-zero exit, IM-31 requires it to reconcile exactly those paths, so the
skill would halt precisely when it had work to do. The accepted cost is
real and is not hidden — a script checking only `update`'s exit code
learns nothing about edited paths, and gets a report and `--json` counts
instead.

**Depends on:** E-24.

- [ ] **T-2501** `[Implementer]` `src/update/report.ts` — the human
  report: counts per disposition, then the edited paths listed with their
  reason. **`kept-fill-expected` is reported with its own reason** —
  *shipped to be filled in* rather than *edited* — so a user is never left
  wondering why their brief was skipped.
  *Depends on: T-2401.*

- [ ] **T-2502** `[Implementer]` `UpdateEntry.expectedNew` — the
  **rendered bytes** the new pack produces at each `kept-edited` path,
  carried in the report (Q-77). **Bytes, not a diff**: a diff format is a
  presentation decision the skill is better placed to make and would
  become a compatibility surface the moment anything parsed it. And it
  cannot be a pointer into `.harness/pack/`, which holds **payload
  source** — pre-substitution, pre-rewrite, pre-generate — not what the
  pack produces.
  *Depends on: T-2307, T-2501.*

- [ ] **T-2503** `[Implementer]` `--dry-run`: the same classification with
  **no lock, no journal and no write**, exiting **1** with
  `E-UPDATE-AVAILABLE` when an update is available and `0` when the
  project is current. This is the `status` command Q-62 folded into a mode,
  and the reserved flag F1 v3.0 protected before F3 existed.
  *Depends on: T-2302, T-2501.*

- [ ] **T-2504** `[Implementer]` `--json`: the `UpdatePlan` shape with
  per-entry `state`, `disposition` and `expectedNew`, plus counts per
  disposition. F6 drives reconciliation from this, so it is a contract
  rather than a convenience.
  *Depends on: T-2502.*

- [ ] **T-2505** `[TestWriter]` **The exit-class contract, as its own
  test file**, because it is the decision most likely to be "corrected"
  by someone who finds it surprising: `update` with edited paths
  outstanding exits **0**; `--dry-run` with an update available exits
  **1**; `--dry-run` on a current project exits **0**; a genuine failure
  exits 2 in both modes. A comment in the test should name Q-78 and say
  why, so the next reader meets the reasoning before the surprise.
  *Depends on: T-2503, T-2404.*

- [ ] **T-2506** `[TestWriter]` The `--dry-run` purity assertion: run it
  against a project and require the directory **byte-identical**
  afterwards, including no lock file and no journal, by recursive
  comparison.
  *Depends on: T-2503.*

- [ ] **T-2507** `[TestWriter]` The no-resume path: interrupt an update
  after `.harness/pack/` has been replaced, then require a second `update`
  to refuse rather than proceed — `expected_old` is no longer
  recomputable, and computing it from the new payload would classify every
  edited path as unedited and replace it. **The failure mode this test
  exists for is silent**, which is why it is a test rather than a note.
  *Depends on: T-2401, T-2406.*


- [ ] **T-2508** `[Implementer]` **The human report bounds its excerpts**
  (C-54): a stated line cap on `expectedNew`, with an **explicit
  truncation notice naming how many lines were withheld**; `--json`
  remains the complete channel. **Never silently short** — F1's rule for
  the disclosure is *never summarised, never truncated, never counted*,
  and a report that quietly drops content while looking complete is the
  same fault the Mode A review's C-1 opened with. Bounded-and-labelled is
  a different thing. Every line printed also passes F1 v3.4's
  control-character escaping (C-50), since `expectedNew` is pack-rendered
  content going to a terminal.
  *Depends on: T-2502, F1 T-0113.*
---

## Counters claimed by this document

| Counter | Claimed | Next free |
|---|---|---|
| Epic | **E-23…E-25** | **E-26** (claimed by F6) |
| Task | **T-2301…T-2507** | **T-2309**, **T-2407**, **T-2508** |
| Story | none — F3's are US-59…US-72 | **US-99** |
| Question | none opened; Q-70…Q-74 and Q-78 resolved in `F3-ADR-004` | **Q-84** |
| Error code | **none invented.** The four `E-UPDATE-*` are F1's, allocated at v3.0 | catalogue holds **88** |
