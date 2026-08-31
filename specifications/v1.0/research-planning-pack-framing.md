# Research — framing the `planning` pack (Q-11)
**Status:** Draft
**Date:** 2026-08-30
**Author:** Claude (with Thomas Andersen)
**Feeds into:** `spec-planning-pack.md`, the v1.0 master spec

---

## Question

Q-9a settled the *ingredients* of the third pack — product discovery,
roadmap planning, version specifications, roadmap process outlines — but
not its **spine**: what the phases are, what artifact each produces,
which roles own them, and where the boundary sits against the coding
pack, whose master-spec and version-planning documents already cover
part of this ground.

The decision that rides on it: the phase list and artifact set *are* the
pack. Get the spine wrong and every template, agent and convention in
`packs/planning/` is built on it.

**The pack is not being designed in the abstract.** The
**portfolio-roadmap-deck** workstream in
`AIImpactOnOrganizationsAndLeadership/` has already worked out how
AI-era portfolio and roadmap management operates, and produced draft
versions of the very artifacts this pack would ship. It is the
knowledge base this research mines.

---

## Summary

**The spine already exists and is evidenced.** The portfolio-roadmap
research has converged on a six-phase loop — **intake → discovery →
prioritize → commit → deliver → learn**, with a non-delegable
**absorption/security gate** between deliver and learn — and on a
**horizon framework** that sets planning distance from binding
constraints rather than the calendar. The pack's phases should be that
loop, because it is the research's own conclusion rather than a
process invented to fill a template.

**Three of the pack's document templates already exist in draft and
have been pressure-tested**: the opportunity/bet brief, the roadmap
review (committed-milestone), and the portfolio intake
(Now-Next-Later). Each exists as a blank template plus two filled
examples at opposite extremes — ready to be lifted into the pack and
authored properly.

**The pack's defining property is that it must be calibrated, not
fixed.** The research's central finding is that the right process is
*contingent* — the same principles instantiate differently at a high
regulatory/hardware floor than at a near-zero floor. This makes
`planning` structurally unlike `coding` and `writing`, both of which
ship one process. That is precisely why it is the strong test of the
nine-part anatomy that Q-9 wanted.

**Recommendation:** frame the pack as **"portfolio and roadmap
management as a decision loop"**, parameterized at init by a
constraint-floor calibration. Do not frame it as "product management",
which is a role, or as "discovery", which is one phase of six.

---

## Key findings

- **The process spine is settled research output, not a guess.** The
  loop `INTAKE → DISCOVERY → PRIORITIZE → COMMIT → DELIVER → LEARN` is
  the deck's flagship diagram and its structural argument. Under AI the
  bottleneck migrates from deliver up-stack to discovery/prioritize.
  (`workstreams/portfolio-roadmap-deck/drafts/base-deck-v2.1.md`, slide 8)

- **There is a mandatory gate the pack must encode.** The
  absorption/security gate — security review, V&V, maintenance
  capacity, review throughput — sits between deliver and learn and is
  described as "non-delegable". At a high floor it is partly held by
  existing V&V; at a near-zero floor "nothing structural holds that
  gate" and it must be held by policy. **This is the planning pack's
  direct analogue of the coding pack's ADR-PROCEED gate.** (slides 8, 9, 17)

- **Three templates are already drafted, with fields fixed.** The
  opportunity/bet brief has six fields — problem/opportunity, the bet,
  reversibility, absorption cost, horizon, kill criteria. The roadmap
  review and portfolio intake share five — what changed, kill-criteria
  check, absorption capacity, horizon check, intake gate. Each carries
  two filled examples (Helio, Cadenza). (Appendices A3, B3)

- **Horizon is computed, not chosen.** `horizon ≈ max(longest-lead
  physical/regulatory constraint, capital-commitment irreversibility)`,
  adjusted **up** when uncertainty resolves slowly and **down** when
  competitive substitution is fast. Four determinants, explicitly a
  triangulation across five sources rather than any single one. This is
  a decision aid the pack can ship as a walkable path. (slide 12)

- **Calibration is the pack's core parameter.** Two poles are already
  specified in detail as `simulated-companies.md`: Helio (regulated
  med-device hardware, 18–36 month clearance-gated programs, high
  floor) and Cadenza (AI-native SaaS, near-free build, weekly releases,
  near-zero floor). "Most real organizations sit somewhere between
  them." The templates are identical across both; **only the fill
  changes** — stated explicitly in A3's talk track: *"The template is
  the same for all organizations; what changes is almost everything in
  the fill."*

- **Five practices generalise across the poles** and read directly as
  pack behavioural guidelines: concentrate the portfolio to absorbable
  capacity; set horizon by the binding constraint; match cadence to
  uncertainty resolution; keep the security gate non-delegable; budget
  review capacity as a portfolio input. (slide 17)

- **The research names its own boundary gap.** The scouting map records
  that the **Engineering Manager perspective is thin** and that
  EM-portfolio responsibility is "unwritten territory" — carried into
  the deck as a `[NEEDS SOURCE — confirmed gap]` marker. That gap sits
  exactly on the seam between the planning pack and the coding pack.
  (`sources/_scouting/ai-portfolio-roadmap-management.md`, Gap 1)

- **Evidence discipline is itself a pack requirement.** The workstream
  runs a claims ledger, an explicit evidence-discipline rule (frame vs.
  mechanism vs. vendor magnitude), and a critic pass that caught a
  fabricated-looking citation on a load-bearing slide. Any pack
  supporting this work must carry that discipline as a convention, not
  leave it to memory. (`reviews/base-deck-v2-review.md`)

---

## Options compared — what is the pack's spine?

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| **A. The decision loop** (intake → discovery → prioritize → commit → deliver → learn, + absorption gate, + horizon calibration) | Matches the research's own conclusion; the three templates map onto phases already; has a real gate, which the anatomy's part 1 requires; genuinely different in shape from coding and writing | Six phases plus a calibration parameter is the most complex pack of the three | **Recommended** |
| **B. Product discovery** (the original Q-9a framing before roadmap was added) | Well-documented external canon (Torres, Cagan); smallest pack | Discovery is *one phase of six* in the research; drops roadmap, horizon and portfolio intake — the parts Q-9a explicitly added; rhymes with the writing pack's gather→synthesise→decide shape, so tests generality weakly | Rejected |
| **C. Roadmap/version planning** (extend the coding pack's master-spec and version work upward) | Closest to existing coding-pack machinery; smallest boundary problem | Makes the pack an add-on to `coding` rather than a peer, so it tests R1 barely at all; discards discovery and portfolio intake | Rejected |
| **D. Portfolio governance / PMO** | Matches enterprise PPM vocabulary | Research finds this literature is "vendor-dominated" with "independent research thin"; would build on the weakest evidence in the corpus | Rejected |

---

## Recommended approach

Frame `packs/planning/` as **portfolio and roadmap management as a
decision loop**, calibrated to the organization's constraint floor.
Concretely, mapped onto the nine-part anatomy:

1. **Process** — `intake → discovery → prioritize → commit → deliver →
   learn`, with the **absorption/security gate** as a hard gate between
   deliver and learn. Horizon-setting is a first-class step inside
   commit, not an afterthought.
2. **Role set** — to be settled at spec time. Candidates the research
   supports: portfolio steward (intake + concentration), discovery lead,
   prioritizer/bet-framer, horizon analyst, absorption-gate reviewer,
   learning synthesiser. **Note the EM-portfolio gap** — the research
   says this role is genuinely unwritten, so the pack should not invent
   authority it cannot source.
3. **Document templates** — opportunity/bet brief, roadmap review
   (committed-milestone), portfolio intake (Now-Next-Later), horizon
   decision aid. The first three are already drafted with fields fixed
   and two filled examples each.
4. **Conventions** — evidence discipline (frame vs. mechanism vs. vendor
   magnitude), a claims ledger, kill criteria stated **before** a bet
   starts, no drift substituting for decision.
5. **Coordination rules** — cadence follows uncertainty resolution, not
   the calendar; the calendar is a backstop, not a trigger.
6. **Behavioural guidelines** — the five practices from slide 17.
7. **Folder scaffolding** — a portfolio register, one folder per bet
   with its brief and reviews, a horizon record, a decision log.
8. **Skills and automations** — candidates: `/bet` (open a brief),
   `/review` (run a roadmap review), `/horizon` (walk the decision aid).
   A hook is the natural enforcement point for "no bet enters without
   kill criteria" — the research's most-skipped discipline.
9. **Autonomy contract** — inherit `shared/targets`. Fits unusually
   well: a bet's kill criteria *are* abort criteria, and its success
   metric *is* a measurable stop condition.

### On sourcing: the deck is knowledge input, not a dependency

The portfolio-roadmap deck is the **knowledge base** for this pack. It
encodes how AI-era portfolio and roadmap work is actually done — the
loop, the gate, the horizon determinants, the template fields, the five
practices, and the two calibration poles. Mine it for that content and
author the pack from it.

What that does **not** mean:

- **No runtime or process dependency.** `packs/planning/` is authored
  independently and owns its templates once written. It is not a
  wrapper around a live document, and it does not wait on that
  workstream. If the research later changes a template, that is an
  ordinary pack revision like any other.
- **Not a reuse of the writing pack.** The deck was *produced by* the
  writing pipeline, but that is incidental to this pack. The planning
  pack takes the deck's **conclusions**, not its process.

One distinction is worth carrying across, because it is about the
material rather than the relationship: **take the process and the
templates, not the contested claims.** The critic pass found the
templates "realistic and internally consistent" while marking the
surrounding evidence "revise heavily" — a fabricated-looking citation
on a load-bearing slide, and vendor telemetry stacked as if it were
independent corroboration. The loop, the gate, the horizon framework
and the template fields are the durable part.

### Calibration as the pack's init parameter

`harness init planning` should ask for the constraint floor and
calibrate — cadence, horizon defaults, how much the absorption gate is
already structurally held. Helio and Cadenza ship as the two reference
calibrations. This is the pack's sharpest test of the pack format:
**no existing pack has a parameter that changes its content**, and if
the format cannot express one, that is a finding about the format
rather than about this pack.

---

## Sources

All local to `/Users/mrandersen/Projects/AIImpactOnOrganizationsAndLeadership`.
No web sources were fetched for this pass — the question is a framing
question and the corpus already holds two scouted, sourced research
tracks on it.

- `workstreams/portfolio-roadmap-deck/index.md` — workstream hub; states
  the thesis, deliverables, and that research phase (scout + researcher)
  is done.
- `workstreams/portfolio-roadmap-deck/outlines/portfolio-deck-chosen.md`
  — chosen framework-first outline; the deliverable placement map.
- `workstreams/portfolio-roadmap-deck/drafts/base-deck-v2.1.md` — slides
  8 (the loop), 12 (horizon determinants), 17 (practice list),
  appendices A3/B3 (the filled templates).
- `workstreams/portfolio-roadmap-deck/reviews/base-deck-v2-review.md` —
  critic pass; confirms the templates are sound and the *claims* need
  revision.
- `workstreams/portfolio-roadmap-deck/simulated-companies.md` — the two
  calibration poles, in detail.
- `sources/_scouting/ai-portfolio-roadmap-management.md` — 28 annotated
  sources, five live debates, seven named gaps.
- `sources/_scouting/planning-horizons-adaptive-roadmapping.md` — the
  horizon track.

---

## Caveats & open questions

- **The role set is the least evidenced part.** Findings support the
  phases, gate, templates and horizon framework directly; the six
  candidate roles are inferred from the phases, not sourced. The
  research explicitly flags the EM-portfolio role as unwritten
  territory. **Settle roles at spec time and do not overclaim.**
- **The source material is mid-revision.** The deck is at v2.1 with a
  "revise heavily" disposition on evidence. Template *fields* look
  stable (unchanged across v1→v2.1); the surrounding claims are not.
  Record which deck draft the pack was authored from, so a later
  revision can be checked against it.
- **A parameterized pack may not fit the pack format.** Calibration is
  content that varies by init answer. Neither `coding` nor `writing`
  has this. If the format cannot express it, prefer changing the format
  over flattening the pack — the contingency is the research's central
  finding, so a pack that hard-codes one calibration would misrepresent
  it.
- **Boundary against `coding` is not fully drawn.** The coding pack's
  master spec owns version-level goals and scope; the planning pack
  owns portfolio bets and horizons. A bet that becomes a version is the
  handoff, and the seam sits exactly where the research reports the
  EM-portfolio gap. Needs an explicit decision in the ADR.
- **Presentation overlap (Q-9b).** Q-9b made presentation a shared
  capability, so the planning pack should reference
  `shared/presentation` rather than ship its own deck tooling. That
  shared component does not exist yet; this deck is currently its best
  worked example.

---

## Local context check

**One pack per project** (Q-12). A project that needs both planning and
writing runs as two projects side by side, not one project with two
packs applied. That keeps the manifest, `CLAUDE.md` region ownership
and `update` semantics single-owner, and it is why no composition
mechanism is needed in v1.0.

Consequences for this pack:

- The **portfolio-roadmap-deck workstream stays a writing project.** It
  is producing a deck, through the writing pipeline, and the writing
  pack is the right one for it. Its output is knowledge this pack
  consumes.
- A **planning project is its own project** — one whose work *is* the
  portfolio: bets, reviews, horizons, intake. That is the shape
  `harness init planning` must produce.
- The **first dogfooding site for this pack must therefore be a real
  planning project**, not the deck workstream. Worth identifying one
  before the pack is authored, since the coding pack's own history
  shows a pack is only as good as the work it has actually carried.
