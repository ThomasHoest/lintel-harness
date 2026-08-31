---
description: Run a target — readiness-gate, execute unsupervised, verify, then stop at SUCCESS or ABORT. Never clears the absorption gate.
argument-hint: <path to a filled, Ready-to-run target file>
---

You are launching a **target run** (the way of working documented in
`targets/README.md`). The target to run is the file at:

$ARGUMENTS

Execute it strictly per `targets/Run.md` — read that file and follow its
phases:

1. **Phase 0 — Readiness gate.** Spawn the `target-reviewer` agent
   against the target file. If it returns `NEEDS-CORRECTION`, or the
   file's Status is not at least `Ready to run`, **HALT** and surface the
   corrections — do not start. Then run the permission pre-flight: if any
   action needed to reach the criteria would prompt, is denied, or needs
   a credential you do not have, **HALT**.
2. **Phase 1 — Execute** the unsupervised loop toward the success
   criteria: advance a criterion → check it → update the work log; stay
   inside the autonomy envelope; respect the obstacle budget.
3. **Phase 2 — Independent verify:** re-run the entire success-criteria
   set before declaring done.
4. **Stop** at **SUCCESS** (all criteria verified) or **ABORT** (per the
   target's §6), with a final work-log entry and a summary report.

## The absorption gate is outside the envelope — always

**A target may carry a bet up to the absorption/security gate. It may
never clear it.**

- Clearing or waiving the absorption/security gate is an **abort
  criterion** in every target in this project. If the target file does
  not carry it, that is a readiness failure — HALT.
- If the run reaches the gate, **terminate as ABORT**, write the final
  work-log entry, and print exactly this:

  ```
  ABORT — the absorption/security gate is non-delegable and lies outside the autonomy envelope. A human must clear it before the learn phase begins.
  ```

- Do **not** mark the gate passed, partially passed, or deferred. Do not
  write a gate record with a verdict. Hand back.

Two exits only — SUCCESS or ABORT. Never settle for "good enough", never
act outside the envelope, never guess through ambiguity or
irreversibility (abort and ask).

If `$ARGUMENTS` is empty, ask which target file to run before doing
anything.
