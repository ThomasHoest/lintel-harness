# `targets/` — long-running unsupervised work

A **target** is a measurable goal the agent works toward on its own,
stopping at **SUCCESS** (every criterion verified) or **ABORT** (a stop
condition fired). Never an open-ended "make the portfolio sharper".

| File | What it is |
|---|---|
| `Run.md` | The kickoff prompt a run executes |
| `target-<slug>.md` | A filled target — the contract for one run |
| `target-log-<slug>.md` | Its work log, appended as the run proceeds |

**To run one:**

1. **Author** — copy `.harness/pack/targets/target.template.md` here as
   `target-<slug>.md` and fill in every section: the goal, verifiable
   success criteria, scope, the autonomy envelope, obstacle behaviour,
   abort criteria and the work-log path.
2. **Gate** — get a `READY` verdict from the `target-reviewer` agent. It
   checks that the criteria are objectively verifiable, complete and not
   gameable, and that the permissions are sufficient to finish without
   asking. No run starts on a failed gate.
3. **Run** — `/target target-<slug>.md`.

## The absorption gate is outside the envelope

**A target may carry a bet up to the absorption/security gate. It may
never clear it.**

- Clearing or waiving the gate is a **standing abort criterion** in every
  target here, and it reads the same at both calibrations.
- `target-reviewer` returns `NEEDS-CORRECTION` for any target whose
  success criteria can only be met by passing the gate — "bet reaches
  `absorbed`" is such a criterion, however it is worded.
- A run that reaches the gate terminates as ABORT, writes its final
  work-log entry and hands back. It does not mark the gate passed,
  partially passed, or deferred.

The gate is non-delegable: it may not be cleared by the party that ran
deliver, and its verdict is a named token issued by a human.

If you cannot write the success check, you do not have a target yet —
you have a conversation.

The full way of working: `.harness/pack/targets/README.md`.
