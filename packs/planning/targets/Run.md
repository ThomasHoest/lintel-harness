Run a target: take a completed, Readiness-passed target file and drive it to
**SUCCESS** or **ABORT**, unsupervised. Paste this prompt with the target file
path filled in at the bottom. The lead reads the target and `targets/README.md`,
then works the phases below. There are only two ways to stop: every Success
criterion verified (SUCCESS), or an Abort criterion fired (ABORT). No "good
enough" middle.

Spawn (as needed): a Readiness reviewer (up front), a Verifier (at the end), and
worker sub-agents for independent, parallelizable units of work. The lead itself
is the persistent executor — do not hand the whole loop to a sub-agent.

================================================================
PHASE 0 — READINESS GATE + PERMISSION PRE-FLIGHT  (do not skip; this is what
stops runaways)
================================================================

Read the target file end to end, plus `targets/README.md` and
`targets/target.template.md`. Then validate it yourself even if a human signed
off:

- **Criteria are verifiable + complete.** Every Success criterion has a concrete
  check (a named signal, a threshold, a yes/no anyone could confirm the same
  way), and together they truly mean "done". If any is vague ("sharper", "on
  track") or the set is incomplete → this is a flaw to correct, not to work
  around.
- **Scope, abort, budget are concrete** (§3, §5, §6 of the target).
- **THE ABSORPTION-GATE CHECK — this pack's one addition, and it is not
  optional.** A target may carry a bet **up to** the absorption/security gate
  and may **never clear it**. Two things must hold:
  - §6 lists clearing or waiving the absorption/security gate as an abort
    criterion. If that line is missing → HALT.
  - No Success criterion can only be met by passing the gate. Read the criteria
    for what they *require*, not for what they say: "bet reaches `absorbed`"
    requires passing the gate, and so does "the milestone is released". If one
    does → HALT.
- **Spawn the `target-reviewer` agent** for an independent, adversarial pass on
  the gate — it returns `READY` or `NEEDS-CORRECTION` with specific fixes. Do
  not self-grade the contract you are about to execute. If it returns
  `NEEDS-CORRECTION`, HALT and surface its corrections.

**Permission pre-flight.** Enumerate the actions reaching the criteria will
require. Confirm each is inside the target's pre-authorized envelope (§4) AND
that the environment grants it *without prompting*. If any needed action would
prompt, is denied, or needs a credential you do not have, the run cannot finish
autonomously.

**If the gate or pre-flight fails: HALT. Surface the exact corrections needed
and do not start.**

Only when both pass: set the target Status to **Running** and write the start
entry in the work log (the resolved plan + the criteria you will drive).

================================================================
PHASE 1 — EXECUTE  (the unsupervised loop)
================================================================

Work toward the criteria relentlessly. Each iteration:

1. Pick the next Success criterion to advance (prefer the one that unblocks the
   most, or switch off a stuck one).
2. Make a small, coherent change.
3. **Run that criterion's check** — a criterion is "met" only when its check
   passes. Verify, never assert.
4. Update the work log (§8): what was attempted → result · decision · criteria
   now met.

Rules for the loop:
- **Stay in the envelope (§4).** Only pre-authorized actions. Anything outside
  it — or any ambiguity about whether it is allowed — is an ABORT, not a
  judgement call. "Unsure" means "not permitted".
- **The absorption/security gate is outside the envelope, always.** If the work
  reaches it, that is an ABORT under §6 — see STOP below. Do not mark the gate
  passed, partially passed, or deferred, and do not write a gate record carrying
  a verdict.
- **Obstacles (§5):** diagnose before retrying; never repeat the same failing
  action. Respect the retry / approach / budget bounds; log every obstacle and
  its outcome; prefer progress on an independent criterion over grinding.
- **Budget:** track it. Exhausting it without meeting all criteria is an ABORT.
- **Evidence discipline holds inside a run.** Classify claims frame / mechanism
  / vendor magnitude, record sources, and never fabricate a citation. A run that
  produces unsourced portfolio content has not done the work.

================================================================
PHASE 2 — INDEPENDENT VERIFY  (before declaring SUCCESS)
================================================================

When every criterion *appears* met, do not self-grade. Re-run the **entire**
Success-criteria set — earlier work can regress later work. Prefer spawning a
**Verifier** sub-agent to check each criterion independently and report
pass/fail.

- Any check fails → back to Phase 1.
- All pass → SUCCESS.

================================================================
STOP  (exactly one of two)
================================================================

- **SUCCESS** — all criteria independently verified, final work-log entry
  written. Report: outcome, the criteria table (all met + how verified), and the
  portfolio files changed.
- **ABORT** (per target §6) — stop immediately, do not push through. Final
  work-log entry with the trigger and current state. Report what is needed to
  unblock. A clean abort is a success of this system, not a failure.

  **If the abort trigger is the absorption/security gate, print exactly this:**

  ABORT — the absorption/security gate is non-delegable and lies outside the autonomy envelope. A human must clear it before the learn phase begins.

================================================================
COORDINATION RULES FOR THE LEAD
================================================================

- Never start if the Readiness gate or permission pre-flight fails — surface,
  do not proceed.
- The lead is the persistent executor. Spawn sub-agents only for bounded,
  independent tasks: the readiness review, the final verification, or
  parallelizable work units. The loop itself must persist in the lead.
- Update the work log at every meaningful step — it is the audit trail a human
  uses to trust an unsupervised run.
- Two exits only: SUCCESS or ABORT. Never settle for "good enough", never push
  past the envelope, never guess through ambiguity or irreversibility — abort
  and ask.

================================================================
TARGET TO RUN
================================================================

Target file: [PATH to the filled, Readiness-passed target — e.g.
  `target-<slug>.md` in this project's target folder]

Everything else — the goal, success criteria + checks, autonomy envelope,
obstacle budget, abort criteria, and work-log path — comes from that file. If
the file's Status is not at least `Ready to run`, start at Phase 0 and treat
readiness as unmet until you have validated it.
