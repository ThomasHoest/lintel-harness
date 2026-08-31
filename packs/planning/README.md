# `planning` — portfolio and roadmap management as a decision loop

**Version 1.0.0 · requires CLI 1.0.0 or later · self-contained.**

A project running this pack is one whose *work is the portfolio*: bets,
reviews, horizons, intake. The spine is a six-phase loop —
`intake → discovery → prioritize → commit → deliver → learn` — with a
**non-delegable absorption/security gate** between deliver and learn, and
horizon-setting as a first-class step inside commit.

The pack is **calibrated at init** by one question, `constraintFloor`,
with two answers: `high-floor` (a long-lead physical or regulatory
constraint binds) and `near-zero-floor` (build is near-free and
competitive substitution is the fast constraint). The calibration changes
cadence defaults, horizon defaults and how much of the absorption gate an
organisation's existing process already holds. It changes nothing else.

## The nine parts, and where this pack is weak

| # | Part | Status | What ships |
|---|---|---|---|
| 1 | Process | present | Six phases, one artifact each, one non-delegable gate — `process.md` |
| 2 | Role set | **provisional** | Six portfolio roles, **all marked provisional in the files themselves** |
| 3 | Document templates | present | Five — bet brief, roadmap review, portfolio intake, horizon decision aid, and the project brief. The first four stay in the payload and are read from `.harness/pack/templates/`; the project brief is the one the recipe renders out, to `project-brief.md` at the repo root |
| 4 | Conventions | present | Evidence discipline, claims ledger, kill-criteria-first, no-drift — `conventions.md` |
| 5 | Coordination rules | present | Cadence by uncertainty, non-delegable gate, immediate escalation, closed loop — `coordination.md` |
| 6 | Behavioural guidelines | present | The five practices, as standing instructions — `CLAUDE.md.template` |
| 7 | Folder scaffolding | present | Register, per-bet folders, horizons, decision log, calibration record, and `background/` — the seven-folder raw-material tree the brief is distilled from |
| 7b | Apply recipe | required | `recipe.json` — 23 steps, two of them conditional on the calibration |
| 8 | Skills & automations | present | `/bet`, `/review`, `/horizon`, plus one **inert** guard script |
| 9 | Autonomy contract | present | This pack's **own copy** of the targets contract, tuned to bets |

**Part 2 is the gap, and it is the only provisional part in any v1.0
pack.** The research this pack was authored from supports the phases, the
gate, the templates and the horizon framework directly. It does **not**
support the roles: they are inferred from the phases, and the corpus
carries a confirmed-gap marker on engineering-manager portfolio
responsibility, calling it unwritten territory. All six role files say so
at the top. Two properties are *not* provisional — the gate reviewer must
be a different party from whoever ran deliver, and the gate verdict must
be a named token — because both follow from the process rather than from
the role literature. `agents/target-reviewer.md` is a seventh agent and is
**not** provisional; it is part 9 content.

**Part 8 is present, and its limit is stated rather than implied.** Three
slash commands are real content. The `hooks/kill-criteria-guard.sh` script
that ships beside them is **inert**: it lands `0644`, it is registered by
nothing and executed by nothing, because no pack may register an agent
hook at v1.0. The kill-criteria rule is carried by `/bet`'s own
instruction and re-checked by `/review`. Enforcement at the file write
does not exist here; a bet committed by hand-editing `brief.md` is not
blocked.

**Nothing here is cross-pollination.** This pack is *authored* rather
than migrated, which is why parts 5 and 8 are stronger than the migrated
packs'. That asymmetry is a consequence of having no faithful baseline to
preserve, not of content moving between packs.

## The targets contract is a pack-local copy

Part 9 ships as `targets/` plus `agents/target-reviewer.md` plus
`commands/target.md`, tuned to bets rather than code: a bet's kill
criteria *are* abort criteria, its success metric *is* a measurable stop
condition, and **clearing or waiving the absorption gate is itself an
abort criterion**.

**The `coding` pack carries the other copy.** There is no shared
component at v1.0 and no sharing mechanism, so both packs hold their own.
The two will drift. Reconciling them is booked as **v1.1-T1**, owned by
the architect, to be discharged with v1.1's sharing work.

## What the recipe produces

```
.claude/agents/*.md ×7        6 provisional roles + target-reviewer
.claude/commands/*.md ×4      bet, review, horizon, target
.claude/hooks/kill-criteria-guard.sh   inert, 0644, registered by nothing
calibration.md                which calibration this project was initialised at
project-brief.md              the company, the constraint floor, the vision,
                              absorption capacity, horizon determinants —
                              the organisational context every framework
                              in the pack reads from
background/                   README + company, strategy, products, market,
                              performance, constraints, capacity — raw
                              material, one README each, all unconditional
portfolio/                    README, register, decisions + the calibrated
                              cadence, horizons and absorption-gate files
portfolio/bets/README.md      one folder per bet; /bet creates them
targets/                      README + Run.md
CLAUDE.md                     generated, with inert anchors
```

`calibration.md`, `project-brief.md` and `CLAUDE.md` all land at the repo
root and create no folder, so none of them bears on the rule that every
folder an apply creates carries a `README.md`. The eleven folders it
creates outside tool-owned `.claude/` — `portfolio/`, `portfolio/bets/`,
`targets/`, `background/` and
its seven subfolders — each carry one, from eleven unconditional `rename`
steps out of `applied-readmes/`. **Both calibrations produce the
identical folder set**, 32 files either way; only the content of
`portfolio/`'s three calibrated files differs.

## `background/` is raw material; the brief is the distillation

Company details, vision, strategy, existing products, performance, target
customers, constraints and capacity get dropped into `background/`
**unedited, with a source and a date on every file**. The brief states
conclusions; `background/` holds the evidence they were drawn from, and
neither is a dumping ground for the other. `constraints/` feeds §2 and
therefore the `constraintFloor` calibration itself, plus determinants `L`
and `I`; `market/` feeds `S`; `products/` and `performance/` feed `U` and
§5; `capacity/` feeds §6, the input the absorption gate is checked
against; `strategy/` feeds §3 and §4; `company/` feeds §1. **A brief
claim traceable to nothing in `background/` is a claim to re-check, not
one to trust** — the claims ledger's discipline, extended to context.

Everything else stays in the payload at `.harness/pack/` and is read from
there: the four portfolio document templates, `process.md`,
`conventions.md`, `coordination.md`, the targets README and target
template, and **both** calibrations — including the one this project did
not choose.

## The brief is where the calibration is checked

`project-brief.md` §2 is the constraint-floor section, and it is the
load-bearing one. It asks what genuinely cannot be compressed — clearance
cycles, tooling lead times, validation, certification, capital lock-in —
and how fast the market substitutes. **That answer is what
`constraintFloor` names**, so filling the section in is how a reader
discovers which pole this organisation actually is, rather than which one
somebody picked at the `init` prompt. The two poles are laid out there as
reference shapes; most organisations sit between them and are told to
take the nearer pole's defaults and edit the three calibrated files.
Where the brief and `calibration.md` disagree, the brief wins.

## Provenance, and one recorded risk

The pack was authored from a portfolio-and-roadmap knowledge base, named
in `pack.json`'s `provenance` block. It takes that material's **process,
gate, horizon framework and template field lists**, which a critic pass
found realistic and internally consistent. It deliberately does **not**
take the surrounding evidence — magnitudes, vendor statistics, citations
— which the same pass marked for heavy revision.

**No dogfooding site was chosen before this pack shipped.** A pack is
only as good as the work it has carried, and this one has carried none
yet. That is the known failure mode, recorded here rather than
discovered later.
