# Conventions

The rules that hold across every bet, every review and both calibrations.
This file is the pack's part 4. None of it varies by constraint floor.

---

## 1. Evidence discipline — three classes, never stacked

Every load-bearing claim is classified as exactly one of:

| Class | What it is | What it can carry |
|---|---|---|
| **Frame** | A way of seeing the problem — a model, a distinction, an argument | Explanatory weight. Never numerical weight |
| **Mechanism** | A causal story with a stated pathway: X changes Y because Z | Predictive weight, bounded by whether the pathway was observed or assumed |
| **Vendor magnitude** | A number produced by a party that sells the thing the number is about | Directional interest only |

Three rules follow, and the third is the one that gets skipped:

- **Label the class before you use the claim**, not afterwards. A claim
  used first and classified later is classified to fit the use.
- **A frame may not be cited as evidence of a magnitude.** "This is how
  it works" is not "this is how much".
- **Vendor telemetry is never stacked as independent corroboration.**
  Three vendor figures pointing the same way are one interested source
  three times, not three sources. This convention exists because a critic
  pass over the material this pack was authored from caught a
  fabricated-looking citation on a load-bearing slide, and caught vendor
  numbers stacked exactly this way. It is a rule the pack carries, not a
  standard anyone is expected to remember.

## 2. The claims ledger

Every load-bearing claim in a bet brief or a review is recorded in the
bet's own claims ledger with three fields: **the claim**, **its source**,
**its class**. A claim with no source is written `[NEEDS SOURCE]` and
stays that way until one exists.

**Never fabricate a citation.** A missing source is a visible gap; an
invented one is a silent defect that survives review.

## 3. Kill criteria are stated before a bet starts

A bet brief without kill criteria is **not committed**, whatever its
status field says. The kill criteria are written at commit time, before
any delivery work, because criteria written after the work has started
are written around the work.

Kill criteria must be:

- **Observable** — a named signal someone could check;
- **Dated or thresholded** — "by <date>" or "below <number>";
- **Owned** — someone is responsible for looking.

This is the discipline the source research names as the most-skipped, and
it is the one this pack is most opinionated about.

**How it is enforced, stated plainly.** The `/bet` command's own
instruction refuses to mark a bet committed while `Kill criteria` is
empty or still at its template placeholder, and `/review` re-checks it
for every bet it reviews. That is the whole of the enforcement. **It is
not enforced at the file write.** A bet committed by hand-editing
`brief.md` is not blocked, and the guard script this pack ships is inert
— see part 8 in `README.md`. The rule is carried by instruction and by
review; the pack says so rather than implying a mechanism it does not
have.

## 4. No drift substituting for decision

A bet that crosses its kill criteria is **killed**, or **explicitly
re-committed with a dated rationale recorded in `portfolio/decisions.md`**.

There is no third option. Silence is not a decision. "We kept going" is
not a re-commitment, and neither is a status that quietly stayed green
through three reviews. The decision log exists so that a bet's death, or
its survival, is a thing someone wrote down on a date.

## 5. Record the calibration and the provenance

- The calibration the project was initialised at is recorded in
  `calibration.md` at the repo root. Do not delete it: a later reader
  cannot otherwise tell which cadence and horizon defaults the project's
  portfolio files came from.
- The pack records which draft of its knowledge base its templates were
  authored from, in `pack.json`'s `provenance` block. The template
  *fields* were stable across drafts; the surrounding claims were not, so
  a later revision of the source is diffed against what shipped.

## 6. Bet status vocabulary — provisional

```
proposed | committed | held-at-gate | killed | absorbed
```

| Status | Meaning |
|---|---|
| `proposed` | In the register, not yet committed. No kill criteria required yet |
| `committed` | Kill criteria and a horizon exist. Delivery may start |
| `held-at-gate` | Delivered, at the absorption/security gate, verdict `HOLD` |
| `killed` | Crossed its kill criteria, or was explicitly stopped. Recorded in the decision log |
| `absorbed` | Passed the gate and has a named maintenance owner. The loop closed |

**This vocabulary is provisional.** It is inferred from the phases rather
than sourced, exactly as the role set is, and it ships flagged rather than
quietly. It is expected to change after the first real portfolio has run
through it. It does not affect the pack's declared anatomy status — part
2 is the provisional part; this is a convention marked provisional inside
a part that is otherwise present.
