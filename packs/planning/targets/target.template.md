# Target — {{short name}}

> Copy this to a target file (e.g. `target-<slug>.md` in this project's
> target folder) and fill it in **completely**, then have it pass the
> **Readiness gate** at the bottom before any work starts. This is the
> contract for an autonomous, long-running run: the agent works toward the
> Target unsupervised and stops **only** when every Success criterion is met
> (→ SUCCESS) or an Abort criterion fires (→ ABORT). Anything vague here
> becomes thrashing or a runaway later. See `README.md` in this folder for how
> a target run works.

Status: `Draft | In review | Ready to run | Running | Completed | Aborted`
Owner: `<name>` · Created: `<date>` · Bet / programme: `<slug>` ·
Work log: `<path>`

---

## 1. Target

<One or two sentences: the single, well-defined goal. What is true when this is
done that is not true now? One target per file — if there are two goals, write
two targets.>

## 2. Success criteria — how it knows to stop

Every criterion must be **objectively verifiable**: a named signal someone could
check, a number that crosses a stated threshold, or a yes/no anyone would
confirm the same way. No "sharper", "on track", "healthier". **Definition of
done = every criterion below passes**, verified by running its check.

| # | Criterion (verifiable) | How to verify (exact check + threshold) | Met? |
|---|---|---|---|
| S1 | `<e.g. every committed bet has a horizon record>` | `<each committed row in register.md has an entry in horizons.md naming a binding determinant>` | ☐ |
| S2 | `<e.g. every committed bet's kill criteria are dated and owned>` | `<each brief.md's kill-criteria table has a date/threshold and an owner in every row>` | ☐ |
| S3 | `<...>` | `<...>` | ☐ |

> **A criterion may not require passing the absorption/security gate.** If
> "done" for this target can only be reached by clearing the gate, the target is
> mis-scoped — stop at the gate record instead, and say so in the criterion.
> `target-reviewer` returns `NEEDS-CORRECTION` for any target that fails this.

> If a criterion cannot be written as a check, it is not a criterion yet. The
> set must be **complete** (meeting all of them really means done) and
> **sufficient** (each is necessary).

## 3. Scope & boundaries

- **In scope** — what the run may create or change: `<files / bet folders /
  register sections>`
- **Out of scope / do not touch:** `<explicitly off-limits — gate records are a
  standing entry here>`
- **Invariants that must hold throughout:** `<e.g. no bet's status changes to
  absorbed; no kill criterion is softened; the decision log is append-only>`

## 4. Permissions & autonomy envelope

The run proceeds **without asking** only for actions listed as pre-authorized.
If an action is not clearly inside this envelope, treat it as an Abort (§6) — do
not make a judgement call to proceed.

- **Pre-authorized (act without asking):** `<e.g. read the whole portfolio,
  write horizon records, append to the decision log, edit briefs' claims
  ledgers>`
- **Never do autonomously (stop and ask):**
  - **Clear, waive, or record a verdict at the absorption/security gate.**
    *(standing — see §6)*
  - **Mark any bet `absorbed`.** That requires a gate `PASS`.
  - `<e.g. mark a bet committed; kill a bet; change a register ranking; commit
    the organisation to anything outside this repository>`
- **Pre-flight permission check (before starting):** confirm the environment
  actually grants the pre-authorized actions *without a prompt*. If a needed
  action would prompt or is denied, that is a **Readiness failure** — resolve it
  before starting.

## 5. Behavior on obstacles — relentless, not reckless

- Try the obvious fix. If it fails, **diagnose before retrying** — never repeat
  the same failing action hoping for a different result.
- **Bounded retries:** at most `<N>` attempts per obstacle and `<M>` distinct
  approaches before recording it as blocked and moving to independent work.
- Prefer progress on a different criterion over grinding on a stuck one.
- **Budget:** pause and re-evaluate after `<wall-clock / iterations / token
  budget>`. Exhausting it without success is an Abort (§6).
- **Evidence discipline applies inside the run.** Classify claims frame /
  mechanism / vendor magnitude, record sources, write `[NEEDS SOURCE]` rather
  than inventing one.
- Log every obstacle, what was tried, and the outcome (§8).

## 6. Abort criteria — stop and hand back

Stop immediately, write a final log entry, and surface to the user if any of
these hold. Do **not** push through:

- **The work reaches the absorption/security gate.** *(Standing, fixed, and
  identical at every calibration.)* Clearing or waiving the absorption/security
  gate is outside the autonomy envelope. Print, verbatim:

  ABORT — the absorption/security gate is non-delegable and lies outside the autonomy envelope. A human must clear it before the learn phase begins.

  Do not mark the gate passed, partially passed, or deferred.
- A Success criterion turns out to be unachievable, wrong, or
  self-contradictory.
- An action is needed that is outside the autonomy envelope (§4).
- The budget in §5 is exhausted without meeting all criteria.
- Repeated, unresolvable failure on a required criterion (past the §5 bounds).
- Ambiguity that would make the work costly-to-redo if guessed wrong, or any
  irreversibility risk — including a portfolio commitment that would be hard to
  unwind.
- An invariant in §3 would have to be violated to proceed.

## 7. What the run may change

- **Files it may write:** `<the exact paths — bet folders, horizons.md, the
  decision log>`
- **Files it may never write:** gate records with a verdict; anything outside
  the portfolio; `calibration.md`.
- Leave the tree consistent at every stopping point: a register that names a bet
  folder that does not exist is a broken state.

## 8. Work log

Keep an **append-only** log at `<path, e.g. target-log-<slug>.md alongside the
target file>`, updated **as you go** (not only at the end), so a human can
reconstruct the run without the transcript.

Each entry, one line where possible:
`` `<timestamp>` — <what was attempted> → <result> · <decision / next> · <criteria now met: S1, S3> ``

Log at minimum: the start (with the resolved plan), every obstacle and how it
was resolved or parked, each criterion flip, budget checkpoints, and the final
**SUCCESS** or **ABORT** summary with the reason.

---

## Readiness gate — review before work starts

Do not start until **every** box is checked. If any fails, correct the target
above and re-review. A flawed target is caught here, not discovered mid-run.

- ☐ **Target (§1)** is a single, unambiguous outcome.
- ☐ **Success criteria (§2)** are each objectively verifiable with a named
  check, and together are complete + sufficient.
- ☐ **No success criterion requires passing the absorption/security gate.**
- ☐ **Abort criteria (§6) carry the standing absorption-gate line**, verbatim.
- ☐ **Scope (§3)** is bounded; out-of-scope and invariants are explicit.
- ☐ **Autonomy envelope (§4)** is sufficient to reach the criteria, **and** the
  environment actually grants those actions without prompting.
- ☐ **Obstacle budget (§5)** is concrete, not hand-wavy.
- ☐ **Write set (§7)** and **work-log path (§8)** are set.
- ☐ **Reviewer sign-off:** `<name / date>` → set Status to **Ready to run**.
