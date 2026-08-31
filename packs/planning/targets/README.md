# Targets — long-running, unsupervised work toward a defined goal

A **target** is a way of working: you hand the agent a well-defined,
**measurable** goal and it works toward it relentlessly and unsupervised,
stopping on its own when the goal is provably met — or bailing out
cleanly when it cannot get there. It is the opposite of an open-ended
"help me with X": a target has a hard, testable stop condition, a bounded
autonomy envelope, and an audit trail.

The contract lives in one filled-in `target.template.md`. Nothing runs
until that file is complete and has passed its **Readiness gate**.

```
(this folder, in the payload)
├── target.template.md   ← copy + fill per goal; the run's contract
├── Run.md               ← kickoff prompt: gate → execute → verify → stop
└── README.md            ← this file
```

The **`target-reviewer`** agent is the independent Readiness gate — it
validates a filled target and returns `READY` / `NEEDS-CORRECTION` before
anything runs. Launch a run with **`/target <path-to-target-file>`**.

**This is this pack's own copy of the targets contract**, tuned to bets
rather than code. The `coding` pack carries the other copy; there is no
shared component at v1.0, so both packs hold their own. See the pack
README for the reconciliation task that duplication creates.

---

## Why the fit with a portfolio is unusually good

Two of the three things a targets format usually has to invent are
already **mandatory fields on a bet brief**:

| Target concept | The bet brief field that already is it |
|---|---|
| Abort criteria | **Kill criteria** — observable, dated or thresholded, owned |
| A measurable stop condition | The bet's own success signal |
| Autonomy envelope | *(the one thing a target still has to state for itself)* |

So a target over a committed bet is usually a matter of lifting the kill
criteria into §6 and the success signal into §2, then writing the
envelope.

---

## The one addition this pack makes — and it is not optional

**A target may carry a bet up to the absorption/security gate. It may
never clear it.**

- **Clearing or waiving the absorption/security gate is an abort
  criterion** in every target in a planning project. §6 of the template
  carries it as a fixed line. It is **identical at both calibrations** —
  the calibration changes how much of the gate is already held, never
  whether an autonomous run may clear it.
- **`target-reviewer` returns `NEEDS-CORRECTION` for any target whose
  success criteria can only be met by passing the gate.** It reads the
  criteria for what they require, not for what they say: "bet `<slug>`
  reaches `absorbed`" requires passing the gate, and so does "the
  milestone is released".
- A run that reaches the gate terminates as **ABORT**, writes its final
  work-log entry, and hands back. It does not mark the gate passed,
  partially passed, or deferred.

The reason is the gate's own rule: it is **non-delegable**, it may not be
cleared by the party that ran deliver, and its verdict is a named token
issued by a human. An autonomous run that could clear it would have
removed the separation of duties the gate exists to create. This is a
stronger constraint than a targets contract usually expresses —
"fail-safe on ambiguity" is adjacent, but it is not the same as **a named
phase the envelope may never enter**.

---

## When to use a target (and when not)

**Use one when** the work is long, the goal is concrete and verifiable,
and you want it done without babysitting: "every committed bet has a
horizon record with a named binding determinant", "the register's
absorption cut is reconciled against this cycle's review capacity",
"every bet in the register has kill criteria that are observable, dated
and owned".

**Do not use one when** the goal cannot be made measurable ("make the
portfolio sharper"), when the work needs human judgement at each step, or
when the safe path requires actions the run is not allowed to take — of
which **clearing the absorption gate is the standing example**.

If you cannot write the success check, you do not have a target yet — you
have a conversation.

---

## Lifecycle

1. **Author** — copy `target.template.md`, fill every section: the goal,
   verifiable success criteria, scope, the autonomy envelope, obstacle
   behaviour, abort criteria (including the gate line), and the work-log
   path.
2. **Review (Readiness gate)** — the `target-reviewer` agent checks it
   for completeness and flaws and surfaces corrections *before* anything
   starts. Vague or unverifiable criteria, gameable checks, permission
   gaps and any envelope that reaches the absorption gate are caught
   here. Only a `READY` verdict sets the status to **Ready to run**.
3. **Run** — `/target <target-file>`; the lead executes the loop in
   `Run.md`, unsupervised, updating the work log as it goes.
4. **Stop** — exactly two ways: **SUCCESS** (every criterion verified) or
   **ABORT** (an abort criterion fired — stop, log why, hand back).
5. **Report** — final log entry plus a summary: outcome, criteria status,
   and, on abort, what is needed to unblock.

---

## How the agent should work with the template

**Before starting — refuse a bad target.** Do the Readiness gate yourself
even if a human already did. If any success criterion is not objectively
verifiable, if the criteria do not add up to "done", if scope is
unbounded, if the permissions are insufficient to finish without asking,
or if **any criterion requires passing the absorption gate**, stop and
surface the corrections. Starting an unverifiable or under-permissioned
target is the failure mode this way of working exists to prevent.

**During the run — make measurable progress, prove it, log it.** Anchor
on the criteria. **Verify, never assert** — a criterion is met only after
its check has been run. Stay in the envelope; "unsure" means "not
permitted". Handle obstacles within the stated bounds; never loop the
same failing action. Keep the log current — a run with no log is not
auditable.

**Stopping — cleanly, one of two ways.** SUCCESS with all criteria
re-verified and a final log entry, or ABORT with the trigger, the current
state, and what is needed to proceed. **A clean abort is a success of
this system, not a failure** — it is the alternative to a silent runaway.

---

## Principles

- **Measurability is the stop condition.** Unmeasurable goals never
  terminate; they thrash or drift.
- **Bounded autonomy.** Freedom to act without asking is granted
  explicitly and narrowly. Everything else stops the run.
- **Honest verification.** Claiming done is not being done.
- **Loop avoidance.** Retries, approaches and budget are bounded so a
  stuck run aborts rather than burning resources forever.
- **Auditability.** The work log lets a human reconstruct what happened
  while they were away.
- **Fail-safe on ambiguity.** Doubt, irreversibility or risk → abort and
  ask, never guess.
- **A named phase the envelope may never enter.** The absorption gate.
  This one is specific to this pack, and it is the reason the contract
  ships here in bets-tuned form.
