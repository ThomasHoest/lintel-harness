# Calibration record

This project was initialised at the **`{{harness:param.constraintFloor}}`**
constraint floor, from the `{{harness:pack.name}}` pack at version
`{{harness:pack.version}}`.

Keep this file. It is the only record of which pole the cadence defaults,
the horizon defaults and the absorption-gate coverage narrative in
`portfolio/` were written for.

---

## What the calibration set

| Setting | Where it landed |
|---|---|
| Review cadence defaults | `portfolio/cadence.md` |
| Horizon defaults and their determinants | `portfolio/horizons.md` |
| How much of the absorption gate is already held | `portfolio/absorption-gate.md` |

## What the calibration did **not** set

These are identical at both poles, and changing calibration would not
change them:

- The six phases of the loop and what each one produces.
- The existence and **non-delegability** of the absorption/security gate.
- The four document template field lists.
- The five practices.

## The two poles

| | `high-floor` | `near-zero-floor` |
|---|---|---|
| Programme shape | Long, clearance- or certification-gated | Near-free build, continuous release |
| Horizon defaults | Long — set by regulatory and physical lead time | Short — set by competitive substitution speed |
| Cadence defaults | Slow — uncertainty resolves slowly | Fast — uncertainty resolves weekly |
| Absorption gate | Partly held already by existing V&V and regulatory process | Nothing structural holds it; it must be held by policy |

**Most real organisations sit between them.** The two poles are reference
points, not an exhaustive menu. If this project sits between them, keep
the pole it was initialised at as the starting default and edit the three
files above — that is ordinary project content once the apply has
finished, and editing them does not change what this record says the
project started from.

Both calibrations ship in the payload. The one this project did not
choose is readable at `.harness/pack/calibrations/`.
