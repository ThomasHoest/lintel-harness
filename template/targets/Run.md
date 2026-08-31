Run a target: take a completed, Readiness-passed `target.template.md` file and
drive it to **SUCCESS** or **ABORT**, unsupervised. Paste this prompt with the
target file path filled in at the bottom. The lead reads the target and this
folder's `README.md`, then works the phases below. There are only two ways to
stop: every Success criterion verified (SUCCESS), or an Abort criterion fired
(ABORT). No "good enough" middle.

Spawn (as needed): a Readiness reviewer (up front), a Verifier (at the end),
and worker sub-agents for independent, parallelizable units of work. The lead
itself is the persistent executor — do not hand the whole loop to a sub-agent.

================================================================
PHASE 0 — READINESS GATE + PERMISSION PRE-FLIGHT  (do not skip; this is what
stops runaways)
================================================================

Read the target file end to end, plus `template/targets/README.md` and
`target.template.md`. Then validate it yourself even if a human signed off:

- **Criteria are verifiable + complete.** Every Success criterion has a
  concrete check (command / threshold / yes-no), and together they truly mean
  "done". If any is vague ("cleaner", "robust") or the set is incomplete →
  this is a flaw to correct, not to work around.
- **Scope, abort, budget are concrete** (§3, §5, §6 of the target).
- **Spawn the `target-reviewer` agent** for an independent, adversarial pass on
  the gate — it returns `READY` or `NEEDS-CORRECTION` with specific fixes. Don't
  self-grade the contract you're about to execute; let the reviewer gate it. If
  it returns `NEEDS-CORRECTION`, HALT and surface its corrections.

**Permission pre-flight.** Enumerate the actions reaching the criteria will
require. Confirm each is inside the target's pre-authorized envelope (§4) AND
that the environment grants it *without prompting* — test a representative
pre-authorized command (e.g. run the test suite) to prove it. If any needed
action would prompt, is denied, or needs a credential you don't have, the run
cannot finish autonomously.

**If the gate or pre-flight fails: HALT. Surface the exact corrections needed
and do not start.** Starting an unverifiable or under-permissioned target is
the failure mode this whole way of working exists to prevent.

Only when both pass: set the target Status to **Running** and write the start
entry in the work log (the resolved plan + the criteria you'll drive).

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
5. Commit per the target's plan (§7) if it's a green, self-contained step.

Rules for the loop:
- **Stay in the envelope (§4).** Only pre-authorized actions. Anything outside
  it — or any ambiguity about whether it's allowed — is an ABORT, not a
  judgement call. "Unsure" means "not permitted".
- **Obstacles (§5):** diagnose before retrying; never repeat the same failing
  action. Respect the retry / approach / budget bounds; log every obstacle and
  its outcome; prefer progress on an independent criterion over grinding.
- **Budget:** track it. Exhausting it without meeting all criteria is an ABORT.
- Keep the tree working — never leave the build broken across a commit.

================================================================
PHASE 2 — INDEPENDENT VERIFY  (before declaring SUCCESS)
================================================================

When every criterion *appears* met, do not self-grade. Re-run the **entire**
Success-criteria set from a clean state — earlier work can regress later work.
Prefer spawning a **Verifier** sub-agent to run each check independently and
report pass/fail per criterion.

- Any check fails → back to Phase 1.
- All pass → SUCCESS.

================================================================
STOP  (exactly one of two)
================================================================

- **SUCCESS** — all criteria independently verified green, tree clean, final
  work-log entry written. Report: outcome, the criteria table (all met + how
  verified), and the commits made.
- **ABORT** (per target §6) — stop immediately, do not push through. Final
  work-log entry with the trigger and current state. Report what's needed to
  unblock. A clean abort is a success of this system, not a failure — it's the
  alternative to a silent runaway.

================================================================
COORDINATION RULES FOR THE LEAD
================================================================

- Never start if the Readiness gate or permission pre-flight fails — surface,
  don't proceed.
- The lead is the persistent executor. Spawn sub-agents only for bounded,
  independent tasks: the readiness review, the final verification, or
  parallelizable work units. The loop itself must persist in the lead.
- Update the work log at every meaningful step — it's the audit trail a human
  uses to trust an unsupervised run.
- Commit per §7; push / open a PR only if §4 pre-authorizes it.
- Two exits only: SUCCESS or ABORT. Never settle for "good enough", never push
  past the envelope, never guess through ambiguity or irreversibility — abort
  and ask.

================================================================
TARGET TO RUN
================================================================

Target file: [PATH to the filled, Readiness-passed target — e.g.
  `specifications/<area>/target-<slug>.md`]

Everything else — the goal, success criteria + checks, autonomy envelope,
obstacle budget, abort criteria, commit plan, and work-log path — comes from
that file. If the file's Status is not at least `Ready to run`, start at Phase
0 and treat readiness as unmet until you've validated it.
