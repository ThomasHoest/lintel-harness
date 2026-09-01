# ADR F3-004 — `harness update`, classification without a merge engine

**Status:** Draft
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
   unedited            edited            fill-expected        payload orphan
       │                  │                    │                   │
  replace with       leave, report        NEVER touch          delete
  expected_new       (F6 reconciles)      (Q-79)            (journal intent: delete)
```

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
/** Q-62: four dispositions, and the enumeration is closed. There is no
 *  'merged' and no 'conflicted' — building either is what this feature
 *  was defined not to do. */
export type Disposition = 'replaced' | 'kept-edited' | 'kept-fill-expected' | 'deleted';

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

**One, against this spec, and it changes a story's acceptance criterion.**

**F3 §F3.3's disposition table has six rows; the contract above has
four.** The spec enumerated dispositions before Q-79 existed, and Q-79
added `fill-expected` as a path class `update` may never touch. Two of the
spec's six rows are sub-cases of *replaced* distinguished by whether the
path exists in `expected_new` — a distinction the write path does not act
on. **Four is the enumeration that survives**, and F3's §F3.3 should be
folded to it.

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
