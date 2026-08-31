---
description: Run a target — readiness-gate, execute unsupervised, verify, then stop at SUCCESS or ABORT.
argument-hint: <path to a filled, Ready-to-run target file>
---

You are launching a **target run** (the way of working documented in
`.harness/pack/targets/README.md`). The target to run is the file at:

$ARGUMENTS

Execute it strictly per `.harness/pack/targets/Run.md` — read that file and follow
its phases:

1. **Phase 0 — Readiness gate + permission pre-flight.** Spawn the
   `target-reviewer` agent against the target file. If it returns
   `NEEDS-CORRECTION`, or the file's Status is not at least `Ready to run`,
   **HALT** and surface the corrections — do not start. Then run the permission
   pre-flight: if any action needed to reach the criteria would prompt, is
   denied, or needs a credential you don't have, **HALT**.
2. **Phase 1 — Execute** the unsupervised loop toward the success criteria:
   advance a criterion → run its check → update the work log → commit per the
   plan; stay inside the autonomy envelope; respect the obstacle budget.
3. **Phase 2 — Independent verify:** re-run the entire success-criteria set
   (prefer a Verifier sub-agent) before declaring done.
4. **Stop** at **SUCCESS** (all criteria verified) or **ABORT** (per the
   target's §6), with a final work-log entry and a summary report.

Two exits only — SUCCESS or ABORT. Never settle for "good enough", never act
outside the envelope, never guess through ambiguity or irreversibility (abort
and ask).

If `$ARGUMENTS` is empty, ask which target file to run before doing anything.
