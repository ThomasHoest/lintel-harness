# Project brief — the organisation, the vision, and what this portfolio decides

**Status:** {{Draft | In Review | Accepted | Superseded}}
**Owner:** {{name — the person who owns the portfolio, not the person who typed this}}
**Last updated:** {{YYYY-MM-DD}}

> **Template note** — this is the only document in the pack that carries
> organisational context, and every framework here is contingent on it.
> The horizon formula computes from §7. The cadence defaults assume §2.
> The absorption gate is only meaningful against §6. A portfolio run on
> an unfilled brief will produce well-formed bets with horizons set by
> the planning calendar, which is the failure the pack exists to stop.
>
> **The evidence for every section below lives in `background/`, and this
> brief is its distillation.** `background/` holds the raw material —
> pasted decks, exports, contracts, notes — with a source and a date on
> each file; this document holds the conclusions drawn from it. §1 is
> written from `background/company/`, §2 and §7's `L` and `I` from
> `background/constraints/`, §3 and §4 from `background/strategy/`, §5
> from `background/products/` and `background/performance/`, §6 from
> `background/capacity/`, §7's `S` from `background/market/` and its `U`
> from `background/performance/`. **A claim here that traces back to
> nothing there is a claim to re-check, not one to trust** — write it
> `[NEEDS SOURCE]` and leave it visible. See `background/README.md`.
>
> Fill it once, before the first intake pass. Revisit it when the company
> changes shape — a funding round, a first regulated product, an
> acquisition, a market that stopped moving — and not on a schedule.
> When the brief and `portfolio/register.md` disagree, the brief wins and
> the register is what gets corrected.
> Delete these notes as you fill each section.

---

## 1. Company profile

{{Concrete, and short enough that somebody reads it. Sector; what the
product actually is; headcount and rough shape; stage; who the customers
are and how many; how the money is made.

The words to avoid are the ones that fit any company: *platform*,
*solutions*, *enterprise-grade*, *at scale*. A reader of this section
should be able to tell your company from your nearest competitor.

Say how it makes money in the plain form — per seat, per transaction, per
device, per contract, per year, or not yet. Revenue model is one of the
two inputs to irreversibility in §7, because what a commitment costs
depends on what it displaces.}}

| | |
|---|---|
| Sector | {{...}} |
| Product | {{what it is, in one sentence a customer would recognise}} |
| Size | {{headcount, and how much of it is engineering}} |
| Stage | {{pre-revenue / growing / mature / turning around}} |
| Customers | {{who, and roughly how many}} |
| How it earns | {{the revenue model, plainly}} |

---

## 2. The constraint floor

> **This is the load-bearing section of the brief, and filling it in is
> how you discover which calibration this project should be running.**
> The answer here is what `constraintFloor` names. The pack was
> initialised at one of two poles — `calibration.md` at the repo root
> records which — and that choice set the cadence defaults in
> `portfolio/cadence.md`, the horizon defaults in `portfolio/horizons.md`
> and the absorption-gate coverage narrative in
> `portfolio/absorption-gate.md`. If what you write below disagrees with
> what `calibration.md` records, **the brief is right**: edit those three
> files, which are ordinary project content once the apply has finished.

{{Answer one question honestly: **what genuinely cannot be compressed
here?**

Not what is hard, not what is expensive, not what nobody has got round
to. What stays the same length no matter how much money and how many
people you put against it. Regulatory approval and clearance cycles.
Hardware tooling and supply lead times. Clinical or field validation.
Certification and audit. A capital commitment that locks the
organisation in once it is made. A dependency on somebody else's release
cycle you do not control.

The test that catches most of the errors: **would spending twice as much
make this shorter?** If yes, it is a resourcing problem, not a
constraint, and it does not belong here.

Then the other side of it: **how fast does the market move?** How long
does a position stay defensible before somebody substitutes for it? Weeks,
quarters, or the length of a certification cycle?}}

**What cannot be compressed:** {{name each one, with the duration it imposes}}
**Rate of competitive substitution:** {{how long a position stays defensible}}

### The two poles, as reference shapes

| | `high-floor` | `near-zero-floor` |
|---|---|---|
| Shape | A regulated or physical business: multi-year programmes gated on clearance, certification or a build | A pure-software business: build cost is near zero, release is continuous |
| What binds | Regulatory and physical lead time — a year of clearance is a year | Competitive substitution — the market shifts monthly and a position decays |
| Horizons | Long, and set by the gate | Short, and set by how fast someone else can arrive |
| Cadence | Slow — uncertainty resolves on the programme's clock | Fast — uncertainty resolves weekly |
| The gate | Partly held already by existing V&V and regulatory process | Held by nothing structural; policy is the whole of it |

**Most organisations sit between the two poles, and that is expected.**
The poles are reference shapes, not a menu of two business models. Read
both columns, decide which one this organisation is *nearer*, and take
that pole's defaults as the starting point — then edit the three
calibrated files where reality differs. A brief that says "we are between
them" and stops has not made the decision; say which side of the middle.

**Nearer pole, and why:** {{`high-floor` or `near-zero-floor`, plus the one fact that decides it}}

---

## 3. Vision

{{Where the organisation is going, over what period, and — the part that
usually goes missing — **what has to become true** for it to get there.

The period matters more than it looks. A three-year vision in a business
whose binding constraint is a nine-month certification cycle contains
about four decisions. The same three years in a business where the market
turns over quarterly contains twelve, and most of them are not knowable
yet. Say the period, and say it in the units §2 gave you.

"What has to become true" is a list of conditions, not aspirations: a
capability the organisation does not have, a market that has to develop,
a regulatory position that has to be won, a cost that has to come down by
a specific amount. Each one is a candidate bet, which is why this section
feeds intake directly.}}

**Horizon of this vision:** {{period, in the units §2 implies}}
**What has to become true:**

- {{condition}} — {{who or what makes it true, and by when}}
- {{...}}

---

## 4. Purpose of the portfolio work

{{**What decisions does this portfolio exist to make?**

Not "track projects" and not "give visibility". A tracker records
decisions somebody already made somewhere else, and a portfolio that only
does that is a status report with a heavier process attached. Name the
decisions this loop is the place for:

- **Which bets to take**, and out of what field of candidates.
- **In what order**, and against what capacity — §6, not headcount.
- **How far ahead to commit**, which is §7 and not the budget calendar.
- **When to kill.** The one decision organisations reliably do not make,
  which is why kill criteria are required before a bet is committed
  rather than written when it starts going badly.

If a decision on that list is genuinely made elsewhere — a founder makes
every call, or a board sets the order — say so plainly here. The
portfolio can still hold the evidence and the horizons for a decision it
does not own, but pretending it owns one it does not is how the register
becomes fiction.}}

**Decisions this portfolio owns:** {{...}}
**Decisions made elsewhere, and by whom:** {{...}}

---

## 5. Current portfolio

{{What is genuinely in flight today, before the first intake pass
reorganises it. This is a snapshot to be honest in, not a plan.

Include the awkward rows. Every organisation has work that is neither
progressing nor stopped: a bet nobody has said no to, a project whose
sponsor left, an integration that is maintained but no longer believed
in. Those are the entries the first `learn` phase exists to resolve, and
they only get resolved if they are written down while nobody has to
defend them yet.}}

| In flight | Started | Who owns it | Honest status |
|---|---|---|---|
| {{name}} | {{when}} | {{name}} | {{progressing / drifting, no decision / maintained but not believed in / finished but not closed}} |

**Drifting without a decision:** {{list them explicitly — this is the section's real output}}

---

## 6. Absorption capacity

{{The sharpest idea in this pack, and the one most often treated as an
afterthought. **Absorption capacity is a portfolio input**, not a
retrospective observation about why things went slowly. It belongs in the
prioritise phase, before the cut, in the same way a budget does.

The question is not how many bets the organisation can *start*. Starting
is nearly free and is exactly what makes an unabsorbable portfolio look
healthy for two quarters. The question is how many it can **take on** —
review, secure, validate, operate and keep alive after the team that
built it moves.

Four capacities, answered with names and numbers rather than adjectives:

- **Security review** — who reviews, how much can they review, and can
  the reviewer be someone who did not build the thing? The gate requires
  that separation, so if there is exactly one person who can review, the
  portfolio's absorbable width is one.
- **Verification and validation** — what evidence a bet must produce
  before it counts as delivered, and who has the capacity to produce it.
- **Maintenance ownership** — who holds each thing after its bet closes.
  A bet with no named owner on the other side of the gate is a
  liability with a launch date.
- **Review throughput** — how much reviewing, of every kind, the
  organisation can do on top of everything already running.

Then the number this section exists for.}}

| Capacity | Who | Honest ceiling |
|---|---|---|
| Security review | {{names}} | {{per cycle}} |
| Verification and validation | {{names}} | {{per cycle}} |
| Maintenance ownership | {{names}} | {{how many things they can hold}} |
| Review throughput | {{names}} | {{per cycle}} |

**Absorbable active bets:** {{a number}}

{{If that number is larger than the count in §5, the portfolio has room.
If it is smaller — which is the common case — the first prioritise pass
is a cut, and it is a cut to *this* number rather than to what could be
started. Write the number down before you are attached to a particular
answer.}}

---

## 7. Horizon determinants

{{The horizon is **computed, not chosen**:

> `horizon ≈ max(longest-lead physical/regulatory constraint,
> capital-commitment irreversibility)`, adjusted **up** when uncertainty
> resolves slowly and **down** when competitive substitution is fast.

Walk the four determinants here at the organisation level, once. Each bet
walks them again for itself — the walkable version is
`.harness/pack/templates/horizon-decision-aid.md`, and `/horizon` runs
it — but the organisational answers set the defaults every bet starts
from and are what makes a bet's departure from them visible.

Naming **which of the first two bound** is half the value of the record.
A horizon set by lead time and a horizon set by irreversibility respond
to completely different actions, and a record that only carries the
number tells a later reader nothing about how to shorten it.}}

**1 — Longest-lead physical or regulatory constraint.**
{{The longest gap between deciding and being able to act that no amount
of money removes. If nothing sets one — the work is software with no
external gate — write `none` and say so. `none` is a finding, not a
blank, and it is most of what makes an organisation `near-zero-floor`.}}

`L = {{duration}}` — set by {{what}}

**2 — Capital-commitment irreversibility.**
{{At what point a commitment stops being undoable, and how long the
organisation stays committed after that point. Two different numbers; the
horizon uses the duration, not the point of no return.}}

`I = {{duration}}` — irreversible from {{when}}, because {{what}}

**3 — Rate of competitive substitution.**
{{How fast somebody else can arrive at the same position. This adjusts
the horizon **down** — fast substitution means committing far ahead is
committing to a world that will not be there.}}

`S = {{how quickly a position decays}}`

**4 — Uncertainty-resolution rate.**
{{How quickly this organisation learns whether a bet is working. Weekly
telemetry and a two-year trial read-out are the two ends. Slow
resolution adjusts the horizon **up**, because a decision cannot be
revisited more often than the evidence arrives — and it sets the cadence
in §8, since the calendar is a backstop rather than a trigger.}}

`U = {{how long until you know}}`

**Default organisational horizon:** {{the computed result}}, bound by {{L or I}}, adjusted {{up/down}} by {{S or U}}

---

## 8. Governance and cadence

{{Who actually decides, distinguished from who is consulted — and those
are different lists in every organisation that has ever confused them.

The gate has one rule that governance cannot override: **the absorption
and security gate may not be cleared by whoever ran deliver.** If the
table below cannot produce a reviewer who is a different party, that is
a finding for §11, not a detail to work around.

Cadence follows §7's `U`, not the quarter. The calendar is a backstop
that catches a portfolio nothing else has forced a look at; it is not the
trigger. A quarterly review in a business where uncertainty resolves
weekly is eleven weeks of drift with a meeting at the end.}}

| Decision | Decider | Consulted | Forum | Trigger |
|---|---|---|---|---|
| Commit a bet | {{name}} | {{names}} | {{where}} | {{what moves, not what date}} |
| Kill a bet | {{name}} | {{names}} | {{where}} | {{kill criterion crossed}} |
| Clear the gate | {{name — not the deliverer}} | {{names}} | {{where}} | {{bet reaches the gate}} |
| Set horizons | {{name}} | {{names}} | {{where}} | {{inside commit}} |

**Calendar backstop:** {{the longest a review may be deferred regardless}}

---

## 9. Out of scope

- {{Something a reader would reasonably assume this portfolio governs and it does not, with one line on why}}
- {{...}}

{{The common ones worth ruling in or out explicitly: keep-the-lights-on
engineering work, compliance and audit programmes, hiring plans,
individual product roadmaps beneath the bet level. Each is defensible in
or out — what is not defensible is leaving it unsaid, because an
ungoverned category reappears as an intake argument every cycle.}}

---

## 10. Success criteria

- **S1** — {{a condition that is observably true or false}}
- **S2** — {{...}}

{{These are about the portfolio process, not about the bets — whether the
bets pay off is what the bets' own success metrics measure.

Observable looks like: every committed bet had kill criteria before
delivery started; at least one bet was killed on its criteria rather than
quietly continued; the number of active bets stayed at or under §6's
number; no gate was cleared by the party that ran deliver; every review
produced a named intake consequence. Each of those is checkable against
`portfolio/decisions.md` and `portfolio/register.md` by somebody who was
not in the room.}}

---

## 11. Open questions

| # | Question | Notes |
|---|---|---|
| Q-1 | {{the question}} | {{why it matters, what it blocks, any working assumption}} |

{{Number them Q-N and keep the id when the answer moves to §12. Never
reuse a number. Mark the ones that block intake — a portfolio can start
with open questions about the vision, but not with an open question about
who clears the gate.}}

---

## 12. Resolved decisions

| # | Decision | Date | Rationale |
|---|---|---|---|
| Q-N | {{what was decided, stated as a fact}} | {{YYYY-MM-DD}} | {{why, including what was rejected and what that cost}} |

{{The rationale column is the one that earns its keep. This pack's whole
posture is that drift must not substitute for a decision, and a decision
recorded without its reasoning is one somebody re-opens the first time it
is inconvenient — which is drift arriving by the back door.}}
