# The decision loop — six phases and one non-delegable gate

Portfolio and roadmap management, run as a **decision loop** rather than a
plan. This file is the pack's part 1: what the phases are, what each one
produces, and what has to be true before the next one starts.

```
intake → discovery → prioritize → commit → deliver → [ABSORPTION/SECURITY GATE] → learn
   ↑                                                                                 │
   └─────────────────────────────────────────────────────────────────────────────────┘
```

It is a **loop, not a pipeline**: `learn` feeds the next `intake`, and a
review that produces no intake consequence has not finished. The loop is
shaped this way because the bottleneck moves. When building gets cheaper,
the constraint migrates up-stack — out of `deliver` and into
`discovery` and `prioritize`, and into the organisation's capacity to
**absorb** what it has built. A process that optimises delivery
throughput while leaving intake and absorption unmanaged optimises the
part that stopped binding.

---

## The phases

| Phase | What it produces | What has to be true to leave it |
|---|---|---|
| **Intake** | An entry in the portfolio intake register, placed Now / Next / Later | Nothing enters without passing the intake gate field. An idea with no stated intake reason is not an intake entry |
| **Discovery** | Evidence notes, each claim classified against the claims ledger, plus a draft bet brief | Every load-bearing claim is classified **frame**, **mechanism** or **vendor magnitude**, with its source recorded |
| **Prioritize** | A ranked register, cut to **absorbable** capacity | The cut is to what the organisation can absorb, not to what it could start. Concentration, not breadth |
| **Commit** | A committed bet brief **with kill criteria**, plus a horizon record | **Kill criteria are stated before the bet starts.** Horizon-setting happens here and is first-class, not an afterthought |
| **Deliver** | Milestone progress against the committed brief | Milestones are against the brief that was committed, not a brief that quietly moved |
| **Absorption / security gate** | A gate record: security review, verification and validation, maintenance capacity, review throughput | **PASS** or **HOLD**, as a named token. **Non-delegable** — see below |
| **Learn** | A roadmap review against a committed milestone, feeding the next intake | The kill-criteria check has run for every bet reviewed, and the review has produced an intake consequence |

Each phase has exactly one artifact. If you cannot name the artifact, the
phase has not happened.

**Where every phase gets its context.** The loop reads its organisational
inputs from `project-brief.md` at the repo root — the constraint floor,
absorption capacity, the horizon determinants, what this portfolio
decides — and the evidence behind them from `background/`, whose README
maps each subfolder to the brief section it feeds. Intake and prioritize
read §4 and §6; discovery reads `market/` and `performance/`; commit
reads §2, §7 and `constraints/`; the gate reads §6 and `capacity/`; learn
reads `performance/`. **A phase run against an unfilled brief, or against
a `background/` subfolder holding only its README, stops and says so** —
see `conventions.md` §7.

---

## The absorption / security gate

The gate sits between `deliver` and `learn` and it is the pack's most
important structural claim. Something has been built; the question the
gate asks is whether the organisation can actually take it on.

It covers four things, and all four are capacity questions rather than
quality questions:

1. **Security review** — has the change been reviewed by someone who did
   not build it?
2. **Verification and validation** — does the evidence that it works
   exist, and would it survive being asked for?
3. **Maintenance capacity** — is there someone who will own this after
   the bet closes, with the time to do it?
4. **Review throughput** — does the organisation have the review capacity
   this adds, on top of everything already in flight?

**The gate is non-delegable.** Three rules, and none of them varies by
calibration:

- It **may not be cleared or waived by the party that ran `deliver`.**
  Separation of duties is the whole point: the party with the most
  invested in a PASS is the party that may not issue one.
- It **may not run in parallel with `learn`.** A gate that runs
  concurrently with the review that consumes its verdict is not a gate.
- Its verdict is a **named token — `PASS` or `HOLD` — not prose.** "Looks
  fine" is not a verdict, and a paragraph that never says the word is a
  HOLD.

An unsupervised run may carry a bet **up to** the gate. It may never
clear it. That constraint is expressed in this pack's targets contract as
an abort criterion — see `targets/README.md`.

**What the calibration changes, and all it changes, is how much of the
gate is already held.** At a high constraint floor, a good deal of it is
carried by verification, validation and regulatory process that exist
whether or not anyone thinks about this gate. At a near-zero floor,
nothing structural holds it: it is held by policy or it is not held. The
narrative for the chosen calibration is in `portfolio/absorption-gate.md`
in an applied project.

---

## Horizon-setting sits inside commit

Horizon is **computed, not chosen**:

> `horizon ≈ max(longest-lead physical/regulatory constraint,
> capital-commitment irreversibility)`, adjusted **up** when uncertainty
> resolves slowly, and **down** when competitive substitution is fast.

A bet cannot be committed without a horizon, and a horizon set by the
planning calendar — quarters, fiscal years, an annual cycle — is not a
horizon, it is a habit. The walkable path is
`templates/horizon-decision-aid.md`; the record it produces lives in
`portfolio/horizons.md`.

---

## Where the phases show up in the applied project

| Phase | Where its work lives |
|---|---|
| Intake | `portfolio/register.md`, from the portfolio intake template |
| Discovery | Evidence notes beside the bet, in `portfolio/bets/<slug>/` |
| Prioritize | `portfolio/register.md` — the ranked, cut register |
| Commit | `portfolio/bets/<slug>/brief.md` and `portfolio/horizons.md` |
| Deliver | The bet folder's own working notes |
| Gate | A gate record in the bet folder; the verdict token in the register |
| Learn | A roadmap review in the bet folder, and `portfolio/decisions.md` |
