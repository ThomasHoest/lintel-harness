# `targets/` — long-running unsupervised work

A **target** is a measurable goal the agent works toward on its own,
stopping at **SUCCESS** (every criterion verified) or **ABORT** (a stop
condition fired). Never an open-ended "improve X".

| File | What it is |
|---|---|
| `Run.md` | The kickoff prompt a run executes |
| `target-<slug>.md` | A filled target — the contract for one run |
| `target-<slug>-log.md` | Its work log, appended as the run proceeds |

**To run one:**

1. **Author** — copy `.harness/pack/targets/target.template.md` here as
   `target-<slug>.md` and fill in every section: the goal, verifiable
   success criteria, scope, the autonomy envelope, obstacle behaviour,
   abort criteria, the commit plan.
2. **Gate** — get a `READY` verdict from the `target-reviewer` agent. It
   checks that the criteria are objectively verifiable, complete and not
   gameable, and that the permissions are sufficient to finish without
   asking. No run starts on a failed gate.
3. **Run** — `/target targets/target-<slug>.md`.

If you cannot write the success check, you do not have a target yet —
you have a conversation.

The full way of working: `.harness/pack/targets/README.md`.
