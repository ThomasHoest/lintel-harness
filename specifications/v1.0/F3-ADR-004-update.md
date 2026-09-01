# ADR F3-004 — `harness update`, classification without a merge engine

**Status:** Accepted
**Date:** 2026-09-01
**Decides:** `F3-spec-update.md` (US-59…US-72, Q-70…Q-74) — and, jointly with `F6-ADR-005`, **Q-78**
**Reads:** `F1-spec-pack-format-and-manifest.md` **v3.4** · `F1-ADR-001` (amended 2026-09-01) · `F6-spec-claude-code-skill.md` (IM-7, IM-30, IM-31, IM-33) · `general/interaction-model.md` §11
**Verdict:** **PROCEED** — see §7. **Amended 2026-09-01** for Mode A conditions **C-51** and **C-54**; see §9.

---

## 1. Decision

**`update` is `verify` with a second recomputation and a write path.** It
builds no merge engine, holds no three-way state, and writes no conflict
marker. That is Q-62's decision and this ADR's job is to make it a
structure rather than a slogan.

Two recomputations, one classification, four dispositions:

```
expected_old = phase2(local .harness/pack/, its recipe, recorded answers, recorded scaffolds)
expected_new = phase2(bundled payload,      its recipe, recorded answers, recorded scaffolds)
                          │
       classify each path: on-disk vs expected_old        ← this is verify's comparison,
                          │                                  the same implementation
       ┌──────────────────┼──────────────────┬─────────────────────┐
   unedited            edited            fill-expected      applied orphan
       │                  │                    │                   │
  replace with       leave, report        NEVER touch       leave, report
  expected_new       (F6 reconciles)      (Q-79)          (NEVER delete — §10)
```

**Separately, and it is not a disposition:** a file in the **old payload**
and absent from the **new** is removed from `.harness/pack/`. That is a
`HarnessPath` operation on a CLI-owned tree, **not an applied path**, and
it is the reason the journal needs `intent: "delete"`.

**`expected_old` is computed from the *local* payload, not the bundled
one.** That is the whole reason no merge base is needed: the project
carries the payload it was applied from, so what the pack *would have
produced* is recoverable exactly, and "did the user change this?" is a
byte comparison rather than an inference.

Three things follow, and each is a decision someone could get wrong.

**1. Classification is `verify`'s code, not a copy of it.** `update` calls
the same `compare.ts`. If it had its own, the two would answer
differently the first time one was fixed — and `verify` being the
acceptance test for S7 while `update` is what maintains it makes any
divergence a silent corruption of the gate.

**2. The digest gate runs first, fail-closed, exactly as in `verify`.**
`expected_old` is computed *from* `.harness/pack/`, so an edited payload
makes the classification meaningless — and unlike `verify`, which merely
reports, `update` **writes based on it**. A wrong classification here
marks an edited file unedited and replaces the user's work. C-11's
concern is strictly stronger for this command than for the one it was
written about.

**3. `update` never resolves "newer" over the wire.** A project moves to
the version bundled in the installed CLI. The remedy for "nothing newer"
is upgrading the package (`E-UPDATE-NOT-NEWER`), which keeps §NFR *No
network* true for every v1.0 command without an exception.

### File-level plan

| File | Action | Owner | Purpose |
|---|---|---|---|
| `src/cli/commands/update.ts` | **New** | F3 | The command and its `--dry-run` branch. Reserved as F1→F3 in `F1-ADR-001`'s amended plan |
| `src/update/classify.ts` | **New** | F3 | The two recomputations and the per-path classification. **Calls `verify/compare.ts`; does not reimplement it.** Pure — takes payloads and answers, returns a plan, writes nothing |
| `src/update/plan-update.ts` | **New** | F3 | Classification → `UpdatePlan`: the write set, the delete set, the kept set. Renders **all** bytes at plan time, exactly as `plan-phase2.ts` does (C-23) |
| `src/update/report.ts` | **New** | F3 | The human report and the `--json` shape. The only place `update`'s user-facing text is assembled |

**Reuses without extending:** `plan-phase2.ts`, `execute.ts`, `journal.ts`
(at **version 3**), `lock.ts`, `rollback.ts`, `verify/compare.ts`,
`payload/digest.ts`. **No new primitive, no new manifest key, no new path
brand.**

### Public interface contract

```ts
/** Q-62: SEVEN dispositions, and the enumeration is closed. There is no
 *  'merged' and no 'conflicted' — building either is what this feature
 *  was defined not to do.
 *
 *  CORRECTED 2026-09-01 (§10). This ADR first declared FOUR, wrong twice:
 *  it dropped 'added', 'unchanged', 'kept-adapted' and 'orphaned', which
 *  F3 §F3.3 states correctly and the write path genuinely distinguishes;
 *  and it invented 'deleted' by confusing an APPLIED orphan (reported,
 *  NEVER deleted) with a PAYLOAD orphan (removed from .harness/pack/,
 *  not an applied path at all). */
export type Disposition =
  | 'added'              // not in old, in new, nothing on disk → exclusive create
  | 'unchanged'          // in both, unedited, new = old → write nothing
  | 'replaced'           // in both, unedited, new ≠ old → write the new content
  | 'kept-adapted'       // adaptExpected declared → leave, report
  | 'kept-edited'        // the user changed it → leave, report, F6 reconciles
  | 'kept-fill-expected' // Q-79, postdates F3's spec → leave, NEVER overwrite
  | 'orphaned';          // in old, not in new → leave, report, NEVER delete

export interface UpdateEntry {
  path: AppliedPath;
  state: VerifyState;          // vs expected_old — verify's own six values
  disposition: Disposition;
  /** Present iff disposition === 'kept-edited'. The bytes the NEW pack
   *  would produce at this path. F6 needs the content, not a claim about
   *  it (Q-77), and only the CLI can render it. */
  expectedNew?: Buffer;
}

export interface UpdatePlan {
  from: { pack: string; version: string };
  to:   { pack: string; version: string };
  entries: readonly UpdateEntry[];
  counts: Readonly<Record<Disposition, number>>;
  diagnostics: readonly Diagnostic[];
  ok: boolean;
}

export function planUpdate(projectRoot: string): Promise<UpdatePlan>;
export function runUpdate(projectRoot: string, dryRun: boolean): Promise<number>;
```

---

## 2. Context

F3 returned to v1.0 at **Q-62**, after F1 and F5 had been written against
its absence. It returned **without a merge engine**, and the whole
feasibility argument rests on one observation: the two-phase model (Q-39)
leaves the applied payload in the project, so the base a merge would have
needed is *recomputable* rather than *recorded*. Q-43's minimal manifest
survives because of it.

What `update` cannot do — reconcile an edited file with a changed
upstream — is handed to the skill (F6) as a conversation. **That split is
the feature.** It is also why Q-78 below is not a detail.

---

## 3. Options considered

### 3.1 The exit class when edited paths remain — **chosen: 0** (Q-78)

This is the sharpest decision in the feature and it cross-cuts F6.

**Chosen.** `update` exits **`0`** when it completes, **including when it
leaves edited paths for reconciliation.** Edited paths are reported, not
failed.

**Rejected: exit 1 for "edited paths outstanding".** It is superficially
attractive — CI would see that something needs attention — and it
**disables the feature Q-62 created**. F6's IM-7 stops the skill on *any*
non-zero exit from a CLI command; IM-31 requires the skill to reconcile
exactly the edited paths `update` reports. An `update` that exits 1
whenever there is something to reconcile means the skill stops precisely
when it has work to do, and the conversational path — the Q-1 split, on
the Q-57 route — never runs at all.

**The signal CI wanted still exists, on the read-only side.**
`--dry-run` exits **1** with `E-UPDATE-AVAILABLE` when there is anything
to do (Q-72). So the split is clean and worth stating as a rule:

> **The writing command reports; the read-only mode gates.**
> `update` exits 0 on a completed run. `update --dry-run` exits 1 when an
> update is available. A CI job that wants to fail on drift runs
> `--dry-run`, which is also the safer thing to put in CI.

**A genuine cost, and it is not hidden:** a user who runs `update` in a
script and checks only the exit code will not learn that edited paths were
left. They get a report saying so, and `--json` carries the counts. The
alternative traded a silent skill failure for a visible script one, and
the silent failure is worse.

### 3.2 Whether the report carries rendered new content — **chosen: yes** (Q-77)

**Chosen.** `UpdateEntry.expectedNew` carries the **bytes** the new pack
produces at each `kept-edited` path.

**Why it cannot be otherwise.** IM-33 requires the skill to show *what the
pack changed*. `expected_new` at a path is the output of a recipe step;
reading `.harness/pack/` gives the **payload source**, which is not the
same thing — it is pre-substitution, pre-rewrite, pre-generate. The skill
hand-rendering it is precisely what IM-5 forbids. So either the CLI hands
over the rendered bytes, or the requirement is unmeetable.

**Bytes, not a diff.** Producing a diff means choosing a diff format,
which is a presentation decision the skill is better placed to make and
which would become a compatibility surface the moment anything parsed it.

### 3.3 Whether a drift threshold gates the run — **chosen: no** (Q-74)

No threshold, no warning band, no confirmation. Every edited path is left
and reported, whether that is one path or all of them. A threshold would
need a number nobody can justify, and its only effect would be to refuse
service to the projects that most need reporting.

---

## 4. The reserved questions, resolved

**Q-70…Q-74 is F3's block. Three were answered by events** — F1 v3.0
folded them while this spec waited — and this ADR ratifies rather than
claims them.

| # | Resolution |
|---|---|
| **Q-70** | **Answered by event: F1 did it, in v3.0**, and allocated **nine** codes rather than the four requested — the four `E-UPDATE-*`, four for `init`, and `W-LINK-FALLBACK`. The catalogue moved 78 → 87 and the three places asserting 78 moved with it. **The question's premise is discharged:** it asked whether adding rows requires an F1 bump and an ADR touch, and the answer turned out to be yes to both, done. |
| **Q-71** | **Version 3, ratified.** F1 v3.0 took it. The rejected alternative — keep version 2 and make `intent` additive-optional defaulting to `"write"` — was rejected for a reason worth preserving: an older CLI reading a newer journal would then **degrade to write-only rollback**, silently failing to restore deleted paths, which is the one rollback case with no intended hash to fall back on. A journal exists only between the start and end of one run, so there is no compatibility to buy. |
| **Q-72** | **Exit 1, ratified**, and F1's catalogue already says so: `E-UPDATE-AVAILABLE` is exit 1 and is documented there as *the one place in this catalogue where exit 1 reports a question answered rather than a fault*. §3.1 above is what makes that coherent with `update` itself exiting 0. |
| **Q-73** | **Out of scope at v1.0, confirmed.** A CLI upgrade that changes what a primitive renders at the same pack version moves `expected_new` without moving the pack version. `update` triggers on **pack version**, so it would not fire — and making it fire would mean recomputing every project on every CLI upgrade. **Recorded as a known limit rather than silently accepted:** it means a renderer bug fix does not reach applied projects until their pack version moves. The manifest already records `cli`, so a later version can detect the case; nothing is designed for it now. |
| **Q-74** | **No threshold, no gate** — §3.3. |

**Q-78 is F6's id and is resolved here jointly**, because the decision is
about `update`'s exit code and F6 cannot make it alone. `F6-ADR-005`
records the same resolution from the consumer's side.

---

## 5. Conflicts flagged

**One, against this ADR itself — corrected in §10 rather than left
standing.**

The paragraph that stood here claimed F3 §F3.3 should fold from six
dispositions to four. **It was wrong**, and had `T-2301` been executed as
written it would have deleted correct specification. All six of §F3.3's
dispositions are real and the write path acts differently on each.
**The only change Q-79 requires is an addition** —
`kept-fill-expected`, making **seven**. See §10.

**No conflict with F1.** Journal v3, the nine codes, `fillExpected`'s
prohibition and `--dry-run`'s reservation all landed in F1 v3.0, and
`F1-ADR-001`'s amended plan already carries `update.ts` as F1→F3.

**No conflict with `interaction-model.md` §11**, whose `update` row was
written against Q-62 and leaves the flags to F3 — which is what this ADR
supplies.

---

## 6. Consequences

- **`update` inherits `verify`'s correctness and its bugs.** Sharing
  `compare.ts` is the right trade, but it means a comparison defect is now
  a *data-loss* defect and not merely a reporting one. The fixture suite
  should treat `compare.ts` accordingly.
- **The delete path is the only genuinely new write behaviour**, and it is
  why journal v3 exists. F1's five-case rollback table models overwrite
  and create; `intent: 'delete'` is the case it did not.
- **`kept-fill-expected` is a disposition, not an omission.** It appears
  in the report with its own reason — *shipped to be filled in* rather
  than *edited* — so a user is never left wondering why their brief was
  skipped.
- **There is no resume.** A resumed update would need `expected_old` from
  a payload already replaced. Rollback, then re-run — stated in the spec
  and confirmed here as a structural consequence rather than a
  simplification.

---

## 7. Verdict

**PROCEED.**

The feature is implementable without a merge engine, and the two-phase
model is what makes that true rather than optimistic. Its five questions
are resolved, three of them by F1's v3.0 fold.

**Three conditions:**

1. **Fold §F3.3's disposition table to four rows** (§5) before F3's epics
   are written, or the tasks will implement six.
2. **`classify.ts` must call `verify/compare.ts`, not reimplement it**,
   and a test should assert the two agree on a shared fixture — the
   cheapest guard against the divergence §6 warns about.
3. **The digest gate must be shown to precede any write in the code, not
   only in the spec.** A test that corrupts `.harness/pack/` and requires
   `update` to exit 2 with **zero bytes written** is the assertion that
   matters here.

**Not decided here:** what the skill *does* with `expectedNew` — how it
presents the pack's version of an edited file, and in what order it works
through the reported paths. That is F6's, and this ADR deliberately hands
over bytes and a list rather than a workflow.

---

## 9. Mode A conditions folded — 2026-09-01

`security-review-mode-a-F2-F3-F6.md` returned `REVISE-SPEC`. Two of its
conditions are F3's, and both are additive — neither disturbs §1.

### C-51 (HIGH) — deletion re-confines immediately before acting

> **Scope corrected 2026-09-01 (§10).** The deletion this governs is of
> **payload** files under `.harness/pack/` — a `HarnessPath` tree — not of
> applied paths. **`update` deletes no applied path, ever.** The condition
> still holds, but its blast radius is narrower than the text below
> implies: phase 1 writes `.harness/pack/` as `0644` regular files and F1
> forbids a symlink in a pack (`E-SYMLINK-IN-PACK`). Read it as defence in
> depth against a **user** planting a link inside `.harness/`, which
> nothing prevents.

**C-14 makes write-time re-confinement absolute**: `executeApply` re-runs
US-3's stage 3 immediately before **each write**, because the plan's
`lstat` is stale by the time the write happens. §1 introduced **deletion**
and carried no equivalent, which is a control not followed into a new
operation rather than a control anyone argued against.

**Required and now specified.** The delete path calls
`confineAtWrite()` on each target immediately before acting, `lstat`s it,
and **refuses a path whose type has changed since planning** —
`E-TARGET-RACE`, exit 2, journal intact, the same code and class the write
path already uses for the same fault.

**The concrete risk is the backup, not the unlink.** Deleting a symlink
removes the link and not its target, so this is not arbitrary file
deletion. But `update` **reads the pre-apply bytes into
`.harness/journal.d/` before removing**, and a read through a symlink
planted between plan and execute reaches outside the project. The
confinement is needed for the *capture*, which is the half that is easy
to miss when reasoning about deletion alone.

### C-54 (MEDIUM) — the human report bounds its excerpts

`UpdateEntry.expectedNew` carries whole rendered files so F6 can show what
the pack changed. Correct for `--json`, where the bytes are escaped and
the consumer is a program.

**The human report prints a bounded excerpt** — a stated line cap, with an
**explicit truncation notice naming how many lines were withheld** — and
`--json` remains the complete channel.

**Never silently truncated.** F1's rule for the disclosure is *never
summarised, never truncated, never counted*, and a report that quietly
drops content while looking complete is the same fault the review's C-1
opened with. Bounded-and-labelled is a different thing from silently
short.

**Also inherited:** every line the report prints passes F1 v3.4's
control-character escaping (C-50). `expectedNew` is pack-rendered content
going to a terminal, which is exactly the class that rule exists for.

---

## 10. Correction — the disposition enumeration, 2026-09-01

**This ADR declared four dispositions; F3's spec declares six; the spec
was right.** Recorded as a correction rather than quietly fixed, because
the error was one step from propagating: **`T-2301` instructed an
architect to fold §F3.3 down to four**, and executing it would have
deleted correct specification.

**Two mistakes, and the second is the instructive one.**

**(1) Four dropped dispositions the write path genuinely
distinguishes.** `added` writes by exclusive create; `unchanged` writes
nothing because new equals old; `replaced` writes because it does not;
`kept-adapted` leaves a path the pack **declared** would be edited.
`added` and `replaced` are not the same write, and `unchanged` and
`kept-adapted` are not the same silence.

**(2) `deleted` was invented by conflating two different orphans.**
F3 §F3.6 item 4 separates them precisely, and the separation is the whole
point:

| | **Applied orphan** | **Payload orphan** |
|---|---|---|
| What | a path in the **user's project** the new pack no longer ships | a file in **`.harness/pack/`** the new payload no longer contains |
| Outcome | **`orphaned`** — reported, **never deleted** | removed — **not a disposition at all**, a `HarnessPath` operation |
| Why | *"a delete leaves a sentence."* Unedited proves the file matches what the pack **used to** write; it proves nothing about whether the project now depends on it | `.harness/pack/` must be a **verbatim copy**, or its tree digest stops equalling the recorded `payloadDigest` |

**`update` deletes no applied path, ever** — F1's Q-25 default, confirmed
by F3 with its own argument. **This ADR contradicted it while believing
it was summarising it.**

**What survives:** journal `intent: "delete"` is still required, because
payload orphans **are** deleted, journalled and reversible — so **journal
v3 stands**, for a narrower and better-stated reason than §1 originally
gave. C-51 stands with the scope note in §9.

**What it says, and it is worth more than the fix.** An ADR that
summarises a spec can contradict it **while reading as agreement** —
this one said "six rows, four survive" in the confident register of a
document that had checked. And *"fold the spec to match the ADR"* is the
most dangerous instruction such a summary can emit, because it **inverts
which document is authoritative**. The spec is authoritative. The ADR was
the thing that needed folding.
