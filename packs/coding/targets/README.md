# Targets — long-running, unsupervised work toward a defined goal

A **target** is a way of working: you hand the agent a well-defined,
**measurable** goal and it works toward it relentlessly and unsupervised,
stopping on its own when the goal is provably met — or bailing out cleanly when
it can't get there. It is the opposite of an open-ended "help me with X"
session: a target has a hard, testable stop condition, a bounded autonomy
envelope, and an audit trail.

The contract lives in one filled-in **`target.template.md`**. Nothing runs until
that file is complete and has passed its **Readiness gate**.

```
.harness/pack/targets/
├── target.template.md   ← copy + fill in per goal; the run's contract
├── Run.md               ← kickoff prompt: gate → execute → verify → stop
└── README.md            ← this file (how targets work + how to run one)
```

The **`target-reviewer`** agent (`.claude/agents/target-reviewer.md`) is the
independent Readiness gate — it validates a filled target and returns
`READY` / `NEEDS-CORRECTION` before anything runs.

### Where the pieces live

This folder is the **reference pack** (scaffolding). The parts that are
actually *used* are Claude Code constructs and live in `.claude/` — the folder
as a whole does **not** move there:

| Piece | Home | Why |
|---|---|---|
| Readiness-gate agent | `.claude/agents/target-reviewer.md` | Claude Code spawns it by name |
| Launcher | `.claude/commands/target.md` → **`/target <file>`** | the slash command that runs a target |
| Template · this README | `.harness/pack/targets/` (reference) | source material, read in place |
| `Run.md` | `targets/Run.md` | the kickoff prompt a run executes |
| A **filled** target + its work log | project content — a top-level `targets/` folder (or `specifications/<area>/`) | it's a run instance, not a Claude Code construct |

Launch a run with **`/target <path-to-target-file>`** (the command follows
`Run.md`). Pasting `Run.md` with the path filled in is the equivalent manual
route.

---

## When to use a target (and when not)

**Use one when** the work is long, the goal is concrete and verifiable, and you
want it done without babysitting: "get the suite green", "cut p95 latency below
200 ms on the bench", "migrate every call site off the deprecated API with the
build staying green", "raise coverage of module X to ≥ 90%".

**Don't use one when** the goal can't be made measurable ("make it nicer"),
when the work needs human judgement at each step, or when the safe path
requires actions the run isn't allowed to take autonomously. If you can't write
the success check, you don't have a target yet — you have a conversation.

---

## Lifecycle

1. **Author** — copy `.harness/pack/targets/target.template.md` into the
   project's `targets/` folder, fill every section. The goal, the
   verifiable success criteria, scope, the autonomy envelope, obstacle
   behavior, abort criteria, the commit plan, and the work-log path.
2. **Review (Readiness gate)** — the **`target-reviewer`** agent (or a human)
   checks it for **completeness and flaws** and surfaces *corrections to the
   criteria* before anything starts; the author fixes them and re-reviews.
   Vague or unverifiable criteria, gameable checks, and permission gaps are
   caught here. This is also where the **permission pre-flight** happens:
   confirm the environment grants the pre-authorized actions without prompting.
   Only a `READY` verdict sets the status to **Ready to run**.
3. **Run** — `/target <target-file>` (or paste `Run.md` with the path); the
   lead executes the loop below, unsupervised, updating the work log as it goes
   and committing per the plan.
4. **Stop** — exactly two ways to end:
   - **SUCCESS** — every success criterion verified as met.
   - **ABORT** — an abort criterion fired. Stop, log why, hand back.
5. **Report** — final log entry + a summary back to the user: outcome, criteria
   status, commits made, and (on abort) what's needed to unblock.

---

## How the LLM should work with the template

Read the whole target first. Then operate by these rules for the entire run:

**Before starting — refuse a bad target.**
- Do the Readiness gate yourself even if a human already did. If any success
  criterion isn't objectively verifiable, if the criteria don't add up to
  "done", if scope is unbounded, or if the **permissions aren't sufficient to
  finish without asking**, **stop and surface the corrections** — do not start.
  Starting an unverifiable or under-permissioned target is the failure mode
  this whole way of working exists to prevent.
- Run the permission pre-flight for real: if reaching the criteria will need an
  action that would prompt or is denied, say so now, not at 80% done.

**During the run — make measurable progress, prove it, log it.**
- **Anchor on the criteria.** Every unit of work moves at least one criterion
  toward met. Re-read them when you drift.
- **Verify, never assert.** A criterion is "met" only after you run its check
  and see it pass. Do not mark done from memory or optimism. Re-run the full
  set before declaring SUCCESS — earlier work can regress later work.
- **Stay in the envelope.** Only take pre-authorized actions. If the path needs
  something outside §4, that's an ABORT, not a judgement call. When unsure
  whether an action is permitted, treat "unsure" as "not permitted".
- **Handle obstacles per §5.** Diagnose before retrying; never loop the same
  failing action. Respect the retry/approach/budget bounds. Prefer switching to
  an independent criterion over grinding a stuck one.
- **Keep the log current (§8).** Append as you go — start, obstacles,
  decisions, commits, criterion flips, budget checkpoints. The log is how a
  human trusts an unsupervised run; a run with no log is not auditable.
- **Commit as you go (§7).** Small, green, coherent commits on the working
  branch. Don't push or open PRs unless pre-authorized.

**Stopping — cleanly, one of two ways.**
- **SUCCESS:** all criteria re-verified green, tree clean, final log entry
  written, summary reported.
- **ABORT (per §6):** stop at once, don't push through, write the final log
  entry with the trigger and current state, and hand back with exactly what's
  needed to proceed. A clean abort is a success of this system, not a failure —
  it's the alternative to a silent runaway.

---

## Principles (why the template is shaped this way)

- **Measurability is the stop condition.** Unmeasurable goals never terminate;
  they thrash or drift. The success checks *are* the definition of done.
- **Bounded autonomy.** Freedom to act without asking is granted explicitly and
  narrowly. Everything else stops the run. "Ask forgiveness" is banned.
- **Honest verification.** Claiming done ≠ being done. Proof is a passing check,
  re-run at the end.
- **Loop avoidance.** Retries, approaches, and budget are bounded so a stuck run
  aborts instead of burning resources forever.
- **Auditability.** The work log + the commit history let a human reconstruct
  and trust what happened while they were away.
- **Fail-safe on ambiguity.** Doubt, irreversibility, or risk → abort and ask,
  never guess.

---

## Relationship to the rest of the toolkit

A target is the **what + when-to-stop + how-autonomous** contract; it's
orthogonal to **who** does the work. A target can be executed by the default
agent or handed to an agent team (`AgentTeams/`). Where a spec (see
`specifications/`) says *what to build* and an ADR says *how it's shaped*, a
target says *what outcome to reach, how you'll know, and how far you may go on
your own to get there*. Keep a target's success criteria tied to real project
checks (tests, benches, lints, metrics) so "done" means the same thing to the
agent and to you.
