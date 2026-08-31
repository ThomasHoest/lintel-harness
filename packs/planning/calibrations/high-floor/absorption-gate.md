# The absorption / security gate — coverage at a high constraint floor

**Calibrated content.** This file came from the `high-floor` calibration.
The other pole is readable at
`.harness/pack/calibrations/near-zero-floor/absorption-gate.md`.

> **This file describes coverage, not rules.** The gate's rules do not
> vary by calibration and are not set here: it is **non-delegable**, it
> **may not be cleared or waived by the party that ran `deliver`**, it
> **may not run in parallel with `learn`**, and its verdict is a **named
> token — `PASS` or `HOLD` — not prose**. Those live in `CLAUDE.md`, in
> the bet brief template and in the target abort criteria. What this file
> says is **how much of the gate this kind of organisation already
> holds**.

---

## Coverage here: partial, and it is worth knowing which part

At a high constraint floor, a good deal of the gate is **already held by
process that exists whether or not anyone is thinking about this gate**.
Verification and validation, design controls, security review as a
release condition, traceability, an audit trail someone external will
eventually ask for — these are not optional here, so the gate finds them
already in place.

| Gate check | How much is already held | What is left for the gate |
|---|---|---|
| **Security review** | Mostly held — review by a party other than the builder is usually already a release condition | Confirm it happened for *this* change, and that the reviewer was genuinely independent |
| **Verification and validation** | **Strongly held** — V&V evidence is produced because it has to exist, not because the gate asked | Confirm the evidence covers what this bet actually changed, not the programme in general |
| **Maintenance capacity** | **Weakly held.** Long-lived products accumulate maintenance obligations that no gate in the existing process counts | Name the owner and their capacity. This is usually the check that fails |
| **Review throughput** | **Weakly held.** Existing process governs quality per item, not how many items the organisation can carry | Check against what is already in flight, not against headcount |

## The trap this calibration creates

**Existing rigour is easy to mistake for gate coverage.** A programme
with strong V&V can pass a gate review on the strength of documents that
were produced for a different purpose — and the two checks that are *not*
held here, maintenance ownership and review throughput, are the two most
likely to be waved through because everything around them looks rigorous.

Ask the two weak checks first. If the answer to "who owns this in three
years, and do they have the time?" is a team name rather than a person,
that is a `HOLD`.

## The second trap: gate rigour is not the same as gate independence

An existing V&V process can be thorough and still be run by the party
that built the thing. **Coverage does not substitute for separation of
duties.** If the only independent reviewer available is inside the
delivery line, the gate is not held — say so, rather than counting the
process as coverage.

## Recording a verdict

Write the gate record to `bets/<slug>/gate-record.md`, with one line per
check, the verdict token, and — on `HOLD` — what would clear it. An
unsupervised run may carry a bet up to this gate and may **never** clear
it.
