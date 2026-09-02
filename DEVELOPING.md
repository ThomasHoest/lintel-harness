# Developing the CLI

The specification set is complete and Accepted; this is the working note
for building against it. **`CLAUDE.md` is the map of the repository** and
`specifications/v1.0/build-order.md` is the order — this file is only what
you need in front of you while writing code.

---

## Getting going

```
npm ci
npm run typecheck     # both tsconfigs, no emit
npm run build         # app only — src → dist, tests excluded
npm test              # build:test, then unit, then integration
```

Node **>= 22** (`engines`), and the floor is real: the test runner is
`node:test` and the build assumes ESM throughout.

---

## Three tsconfigs, and why

Not a preference — a consequence.

| Config | Root → out | What it compiles |
|---|---|---|
| `tsconfig.json` | `src` → `dist` | the app, **tests excluded** — this is what publishes |
| `tsconfig.unit.json` | `src` → `dist` | the same, tests included |
| `tsconfig.tests.json` | `tests` → `dist-tests` | integration, driving the **built** artefact |

**The build is a prerequisite of type-checking**, which is unusual enough
to state: `tests/` imports from `dist/`, on purpose, because integration
tests drive the **built** artefact rather than the sources. So
`tsconfig.tests.json` cannot resolve until `dist/` exists, and
`npm run typecheck` builds first. CI hit this before the script did —
four red legs on a green local checkout, because `dist/` was already
there locally and never is on a fresh one.

**`src/paths.ts` must compile to `dist/paths.js` — exactly one level
inside the out root.** `packs/` sits *beside* `dist/` in the published
package, so `../packs/` is right from there and wrong from anywhere
deeper. That is why tests cannot share a root with it at a different
depth, and it is pinned by a test rather than left to a comment.

---

## Five things this codebase does deliberately

**1. The spec is authoritative, and two modules prove it on every run.**
`src/diag/codes.test.ts` and `catalogue.test.ts` **re-derive** the code
taxonomy and the message templates from `F1-spec` §Error States and fail
on any divergence. If one fails, **change the spec first**, then the
module. A code present in the module and absent from the table is the
defect, in that direction.

**2. No user-facing string lives outside `src/diag/`.** F1 makes the
**code** the stable contract and the prose free to change, so a module
composing its own sentence has created a second contract nobody versions,
and a test string-matching one asserts something F1 does not promise.

**3. Everything printed passes `escape.ts`.** One function, applied once
(C-50). Values are escaped more strictly than template lines — LF, CR and
HT included — because a value carrying a newline and an arrow would forge
a remedy line.

**4. Packs resolve from `import.meta.url`, never `process.cwd()`.**
Resolving against the working directory would let a user's project shadow
the bundled packs, which is untrusted content entering through the one
input F1 treats as trusted.

**5. Assert properties, not representations.** Two spec sentences have
already failed by naming a representation — *"an empty `dependencies`
object"* (npm normalises it away) and *"`{…}` interpolation only"* (nine
messages carry braces that are not placeholders). A test of mine repeated
the mistake within the hour by pinning a script to a literal string.

---

## Where the order is

`specifications/v1.0/build-order.md` — **ten waves, epic level.** Read its
back-edges section before scheduling: **E-05/E-10/E-12 define each other**
and cannot be completed strictly in sequence, and **E-02 → E-11 reads
backwards** and is worth resolving rather than working around.

Each task carries `*Depends on: …*`. **That line holds both directions** —
`Depends on: T-0101. Prerequisite for T-0104 …` — so a parser must split
on *"Prerequisite for"* or it reads forward references as dependencies and
reports 185 false cycles.

---

## Tests

Unit tests sit **beside the code** (`src/**/*.test.ts`, owned by
`implementer`). Integration and fixtures live in **`tests/`** (owned by
`testwriter`) and drive the **built** CLI through `tests/harness/cli.ts`,
which exists to make two contracts assertable that nothing inside the
process can see:

- **the exit class** — F1's four, named at call sites via `EXIT`;
- **zero bytes written** — a before/after `snapshot()` of a real
  directory, built from `readdir` entries so it reports the **on-disk
  spelling** (C-36), which a test composing its own paths cannot do.

---

## Branches

| Branch | Role |
|---|---|
| `main` | production |
| `develop` | staging — tested before promotion |
| `v1.0` | implementation work; commits land here directly |

All three run the same CI matrix. A staging branch whose pushes are not
checked is not staging anything.

---

## CI

`.github/workflows/ci.yml` — three platforms, Node 22, plus one Node 24
leg. **The Windows leg is not optional** (U-13): the executable bit,
`collisionKey`'s folding and CRLF normalization are exactly what differs
there.

That file is **meta** — how *this repo* is built. F1 reserves `.github`
as a class-2 destination **for packs**, which forbids a pack writing a
workflow into a user's project. It says nothing about the product having
its own CI.

---

## Before you commit

- `npm run typecheck && npm test` — both green, and **from a clean
  checkout**: `rm -rf dist dist-tests` first if in doubt. Stale build
  output has already hidden one failure that CI found.
- If you changed anything in `F1-spec` §Error States, the drift guards
  will tell you; if you changed a **module** to disagree with it, they
  will tell you that too, and the spec wins.
- **Pack content is spec-governed.** No incidental edits under `packs/`;
  a defect found in an applied copy is fixed in the pack first.
