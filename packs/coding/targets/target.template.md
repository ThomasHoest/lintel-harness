# Target — {{short name}}

> Copy this to a target file (e.g. `specifications/<area>/target-<slug>.md`) and
> fill it in **completely**, then have it pass the **Readiness gate** at the
> bottom before any work starts. This is the contract for an autonomous,
> long-running run: the agent works toward the Target unsupervised and stops
> **only** when every Success criterion is met (→ SUCCESS) or an Abort
> criterion fires (→ ABORT). Anything vague here becomes thrashing or a runaway
> later — be concrete and measurable. See `README.md` in this folder for how a
> target run works.

Status: `Draft | In review | Ready to run | Running | Completed | Aborted`
Owner: `<name>` · Created: `<date>` · Branch: `<branch>` · Work log: `<path>`

---

## 1. Target

<One or two sentences: the single, well-defined goal. What is true when this is
done that isn't true now? Name the concrete artifact or outcome. One target per
file — if there are two goals, write two targets.>

## 2. Success criteria — how it knows to stop

Every criterion must be **objectively verifiable**: a command that passes, a
number that crosses a stated threshold, or a yes/no check anyone could confirm
the same way. No "better", "cleaner", "robust", "done-ish". **Definition of
done = every criterion below passes**, verified by running its check — not by
assertion.

| # | Criterion (verifiable) | How to verify (exact command / check + threshold) | Met? |
|---|---|---|---|
| S1 | `<e.g. the suite is green>` | `<npm test — exits 0>` | ☐ |
| S2 | `<e.g. p95 latency under budget>` | `<bench cmd → p95 < 200 ms>` | ☐ |
| S3 | `<e.g. no TODOs left in the module>` | `<grep -rc TODO src/x → 0>` | ☐ |

> If a criterion can't be written as a check, it is not a criterion yet — fix
> it in review. If "done" needs something not listed here, it's missing a
> criterion. The set must be **complete** (meeting all of them really means
> done) and **sufficient** (each is necessary).

## 3. Scope & boundaries

- **In scope** — what the run may create or change: `<files / dirs / systems>`
- **Out of scope / do not touch:** `<explicitly off-limits>`
- **Invariants that must hold throughout:** `<e.g. the build stays green
  between commits; the public API doesn't change; no data is deleted>`

## 4. Permissions & autonomy envelope

The run proceeds **without asking** only for actions listed as pre-authorized.
If an action isn't clearly inside this envelope, treat it as an Abort (§6) — do
not make a judgement call to proceed.

- **Pre-authorized (act without asking):** `<e.g. edit sites/<x>/**, run the
  test suite + linter + build, commit to the working branch>`
- **Never do autonomously (stop and ask):** `<e.g. push, open a PR, deploy,
  delete data, touch secrets or production, spend money, call external
  services, change anything Out of scope>`
- **Pre-flight permission check (before starting):** confirm the running
  environment actually grants the pre-authorized actions *without a prompt*. If
  a needed action would prompt, is denied, or requires a credential you don't
  have, that is a **Readiness failure** — resolve it before starting, don't
  start and get stuck mid-run.

## 5. Behavior on obstacles — relentless, not reckless

- Try the obvious fix. If it fails, **diagnose before retrying** — never repeat
  the same failing action hoping for a different result.
- **Bounded retries:** at most `<N>` attempts per obstacle and `<M>` distinct
  approaches before recording it as blocked and moving to independent work.
- Prefer progress on a different criterion over grinding on a stuck one; come
  back to the blocker with what you learned elsewhere.
- **Budget:** pause and re-evaluate after `<wall-clock / iterations / token
  budget>`. Exhausting it without success is an Abort (§6).
- Keep the tree working — never leave the build broken across a commit.
- Log every obstacle, what was tried, and the outcome (§8).

## 6. Abort criteria — stop and hand back

Stop immediately, write a final log entry, and surface to the user if any of
these hold. Do **not** push through:

- A Success criterion turns out to be unachievable, wrong, or self-contradictory.
- An action is needed that's outside the autonomy envelope (§4).
- The budget in §5 is exhausted without meeting all criteria.
- Repeated, unresolvable failure on a required criterion (past the §5 bounds).
- Ambiguity that would make the work costly-to-redo if guessed wrong, or any
  safety / data-loss / irreversibility risk.
- An invariant in §3 would have to be violated to proceed.

## 7. How to commit the work

- **Branch:** `<branch>` — never commit to the default branch directly.
- **Cadence:** commit at each self-contained step, and whenever a criterion
  flips to met. Small, coherent commits; build green at each.
- **Message style:** `<convention, e.g. type(scope): what + why>`, plus the
  project's Co-Authored-By trailer.
- **Push / PR:** only if pre-authorized in §4; otherwise leave commits local and
  report them at stop.
- Never commit secrets. Working tree clean at stop.

## 8. Work log

Keep an **append-only** log at `<path, e.g.
specifications/<area>/target-log-<slug>.md>`, updated **as you go** (not only at
the end), so a human can reconstruct the run without the transcript.

Each entry, one line where possible:
`` `<timestamp>` — <what was attempted> → <result> · <decision / next> · <criteria now met: S1, S3> ``

Log at minimum: the start (with the resolved plan), every obstacle + how it was
resolved or parked, every commit (hash + why), each criterion flip, budget
checkpoints, and the final **SUCCESS** or **ABORT** summary with the reason.

---

## Readiness gate — review before work starts

Do not start until **every** box is checked. If any fails, correct the target
above and re-review. A flawed target is caught here, not discovered mid-run.

- ☐ **Target (§1)** is a single, unambiguous outcome.
- ☐ **Success criteria (§2)** are each objectively verifiable with a named
  check, and together are complete + sufficient (all-met genuinely means done).
- ☐ **Scope (§3)** is bounded; out-of-scope and invariants are explicit.
- ☐ **Autonomy envelope (§4)** is sufficient to reach the criteria, **and** the
  environment actually grants those actions without prompting (permission
  pre-flight passed).
- ☐ **Obstacle budget (§5)** and **Abort criteria (§6)** are concrete, not
  hand-wavy.
- ☐ **Commit plan (§7)** and **Work-log path (§8)** are set.
- ☐ **Reviewer sign-off:** `<name / date>` → set Status to **Ready to run**.
