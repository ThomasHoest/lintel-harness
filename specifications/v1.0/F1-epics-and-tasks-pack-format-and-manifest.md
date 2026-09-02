# Epics & Tasks: Pack Format & Manifest (Lintel Harness v1.0 — Feature 1)
**Version:** 2.2
**Status:** Draft
**Date:** 2026-09-01
**References:** `F1-spec-pack-format-and-manifest.md` (**v3.7** — authoritative for every acceptance criterion, the **88**-code catalogue and US-16's fourteen-step order), `F1-ADR-001-pack-format-and-manifest.md` (**PROCEED**, amended 2026-09-01 against F1 v3.0 — authoritative for the file-level plan and the public interface contract; its contract types are current, and the Q-54 supersession box still governs what it covers), `specifications/general/system-architecture.md` §3, `specifications/general/interaction-model.md` §11, `specifications/general/technology-choices.md` §6 (the ⚠️ register — **nine closed, five open: U-5, U-7, U-9, U-12, U-13**), `specifications/general/pack-application.md`, `specifications/general/pack-inventory.md`, `packs/coding/specifications/conventions.md`, `CLAUDE.md`

**Amendment history**

| Version | Date | Summary |
|---|---|---|
| 1.0 | 2026-09-01 | Initial breakdown. Claims the project's first epic and task numbers: **E-01…E-12**, **T-0101…T-1218**. |
| 2.2 | 2026-09-02 | **E-01 complete — T-0106…T-0112 done, and two defects of mine were caught by their own tests.** The surface is data (`surface.ts`), so `E-CLI-UNKNOWN-COMMAND`'s six-command list is **rendered from the array** rather than restated. **T-0111 was already satisfied**: deriving the catalogue from §Error States gave all nine v3.0 codes with their classes for free, which is what deriving rather than transcribing buys. **Defect 1 — the two-pass walk was structurally wrong.** Pass 2 re-read pass 1's *leftovers*, but pass 1 cannot know whether an unknown flag takes a value, so `--calibration high-floor` leaves the flag in `deferred` and the value in `positionals` and **nothing reading only the leftovers can reunite them**. Pass 2 now **re-parses the original argv**, which is what the spec said. **Defect 2, security-relevant — aliases were resolved before the reserved table**, so a pack declaring `force` would have shadowed `--force`, which gates US-13's pre-existing-path rule. That is the `--accept-permissions` shadowing concern reintroduced one layer below where anyone was looking. Reserved now wins by construction, as defence in depth rather than trusting `validate` refused the pack. **69 tests.** |
| 2.1 | 2026-09-02 | **T-0105 done — the diagnostic group is complete.** `diagnostic.ts` makes *severity is a property of the code* **structural rather than remembered**: `diagnostic()` is the only constructor, it derives severity, class and message from the catalogue, and `DiagnosticInit` has **no field through which an occasion could override one**. `exitCodeFor` prices the worst present — errors contribute their own class, warnings **0**, a **defect** 1 under `--strict`, and a **notice 0 under every flag**, asserted over all thirteen warnings rather than one example. **A defect of mine was caught by its own test:** `get items()` returned the internal array, so `readonly Diagnostic[]` — a **compile-time** claim — was reachable by a cast, and this bag is append-only with its order as the contract (US-16's fixed check order). Returns a copy now. **34 unit tests, 6 integration.** |
| 2.0 | 2026-09-02 | **T-0104 and T-0113 done, and building them found three things F1 did not say.** `catalogue.ts` carries all **88** message templates, derived from §Error States and drift-guarded like `codes.ts`; `escape.ts` is C-50's single escaping function. **(1) The placeholder grammar was undefined** — nine brace occurrences are **not** substitutions (JSON in remedy lines, the quantifier `{1,64}`), so *"`{…}` interpolation only"* was not implementable. Now `{name}` with an identifier name; everything else literal. **(2) Three slots are prose, not names**, and render literally — pinned in `DESCRIPTIVE_SLOTS` so the gap stays visible. **(3) A `→` marks a remedy only line-initially**; `E-REWRITE-UNUSED` uses one as content, and the first shape assertion written here was wrong about the message rather than the message being wrong. **A C-50 refinement**: values escape LF/CR/HT where templates do not, because a value carrying a newline and an arrow forges a remedy line. F1 v3.9. Next free task id **T-1222**. |
| 1.9 | 2026-09-01 | **T-0103 done — the catalogue stops being prose.** `src/diag/codes.ts` carries the `DiagnosticCode` union over all **88** codes, `Severity`, Q-60's `defect | notice` axis and the code→exit-class map. **It is derived from F1 §Error States rather than transcribed**, and `codes.test.ts` **re-derives it on every run and fails on divergence** — so the two cannot agree until they do not, which is the failure mode this project has recorded four times in prose and is here made mechanical. The extraction found the section **internally consistent**: 88 rows, 75 `E-`, 13 `W-`, every exit class present, **every `W-` code classified**, no duplicates. The fail-closed rule is tested rather than asserted: an unclassified warning resolves to **`defect`**. |
| 1.8 | 2026-09-01 | **T-0102 done — the acceptance harness, and a layout constraint T-0101 created.** `tests/harness/cli.ts` gives the suite the two things F1 states as contracts and neither of which is observable from inside the process: **the exit class** (named, not numbered, at call sites) and **zero bytes written**, proved by a before/after snapshot of a real directory rather than by spot-checking paths the test thought of. The snapshot is built from **`readdir` entries**, so it reports the **on-disk spelling** — C-36's distinction, which a test composing its own paths cannot make on a case-insensitive volume, and which two fixtures turn on. **Three tsconfigs, because of the depth invariant T-0101 pinned:** `paths.ts` must compile one level inside its out root, so tests cannot be compiled to a different root alongside it — the app builds `src → dist` **excluding tests**, unit tests build to the same root, and `tests/` builds to `dist-tests/` and drives the **built artefact**. Production `dist/` contains **zero** test files. **The harness tests itself against the filesystem with no CLI in the picture**, because every acceptance test in F1, F2, F3 and F6 asserts through it. |
| 1.7 | 2026-09-01 | **T-0101 done — the first code in the project, and it falsified a spec sentence.** `package.json`, `tsconfig.json`, `src/paths.ts` and eight passing tests. **§NFR's *empty `dependencies` object* is not assertable** — `npm install` normalises it away — so F1 v3.8 restates the requirement as *no runtime dependency declared*, empty **or absent**. **T-1219 is amended to match.** Also verified by running rather than by reading: `packs/` ships (121 files) and **`addons/` does not** (0), and the resolution does not move when `cwd` does. |
| 1.6 | 2026-09-01 | **The ⚠️ register closes; every blocked task unblocks.** U-5, U-7 and U-9 were **already decided and the register had not caught up** — U-9 by `F2-ADR-003`, U-5 and U-7 by Q-81, since each named a dependency as its alternative. **U-12: `tsc` only**, no bundler, because the build must **type-check** and the path brands are compile-time controls; `packs/` resolves from `import.meta.url`, **never `process.cwd()`**. **U-13: GitHub Actions**, three platforms, **Windows not optional**. **T-0101 unblocks, and it was the prerequisite for every task in this document** — nothing in F1 is blocked any more. |
| 1.5 | 2026-09-01 | **Mode A round 4 — C-61, C-62; the CRITICAL closes and the review returns `SECURITY-PROCEED`.** T-0806 refuses the delimiter **shape** as well as this run's nonce, which is what keeps `E-DISCLOSURE-FORGERY` **reachable** — the nonce alone made it probabilistically unfireable, and an untriggerable check rots. T-0806 also states the nonce's **scope**: `init`'s block only, so `pack info --json` stays deterministic. **T-1221 gains the two fixtures that assert both.** |
| 1.4 | 2026-09-01 | **Mode A rounds 2 and 3.** T-0806 is rewritten twice over: round 2 specified the sentinel comparison, round 3 **deleted it** in favour of a **per-run nonce** (C-59), because three rounds of tightening the emitter's matching rule were beaten three times by a slightly wider consumer normalization — the last by `String.prototype.trim()` removing `U+00A0`. **The check becomes *does any row contain this run's nonce*.** T-0113 gains C-60: any surviving normalization uses stdlib `trim()`, never a hand-rolled ASCII one — **Q-81 forbids dependencies, not correctness.** Next free task id **T-1222**. |
| 1.3 | 2026-09-01 | **Mode A over F2/F3/F6 folded — the F1 half.** Five tasks: **T-0113** (one control-character escaping function for every stream, C-50), **T-0114** (`E-DISCLOSURE-FORGERY`, catalogue **87 → 88**), **T-0806** (the disclosure containment check, **the CRITICAL**, at `init` **and** `validate` step 11 — no fifteenth step), **T-0211** (`skills` joins the reserved names at any `.claude` segment, C-53) and **T-1221** (fixtures for both, plus marking `compare.ts` security-relevant, C-55). **T-0806 is C-9's marker-lex check restored** — Q-45 removed it while anchors were inert and recorded the obligation to bring it back when something started reading markers; F1 v3.3 created such a marker and did not consult it. Next free task id **T-1222**. |
| 1.2 | 2026-09-01 | **Q-82 — add-on packs.** `coding`'s two backend scaffolds move to `addons/` as v1.1 add-ons, which leaves **`writing-workstream` as the only scaffold in the product** and **no v1.0 pack shipping an executable at all**. Six rules lose their only bundled-pack subject — scaffold *composition* and exclusivity, `executableRoots`, `executable: true` (a security gate C-34 showed fails **open** on a typo), `E-EXEC-DEST-FORBIDDEN`, US-13's `0755` disclosure and `verify`'s mode comparison. **No rule is weakened and none is removed**; what changes is that the adversarial fixture suite becomes their **sole** coverage, so **T-1220** adds the four fixtures that were previously redundant with the bundled packs. Next free task id **T-1221**. |
| 1.1 | 2026-09-01 | **F1 v3.0 fold, and nine of the fourteen ⚠️ entries unblock.** **Q-81 ratified the dependency posture**, which is a single answer that clears **U-1, U-2, U-3, U-6, U-8 and U-10** at once — each of those tasks stops being "choose, then build" and becomes "build". **U-4 clears differently and the resolution matters more than the clearing**: `collisionKey` folds **ASCII only**, so T-0202 must *not* reach for `toLowerCase()` or hand-roll a Unicode fold, and a test pins the narrowing. **U-11 clears because F1 v3.0 allocated the code it was waiting for** — `W-LINK-FALLBACK`. **Five entries remain and each blocks real work**: U-5, U-7, U-12 (×2), U-13 (×2). **Six new tasks** for what v3.0 added: **T-0111** (nine new codes), **T-0112** (`--dry-run` reserved), **T-0410** (the fill-expected set), **T-1005** (`filled`/`unfilled`), **T-1110** (journal v3), **T-1219** (the zero-dependency assertion). **T-1002 is rewritten in place** — six states, not four. Next free task id **T-1221** within E-12; **E-13** was the next free epic and is now claimed by F5. |

---

## Overview

This document breaks **F1 — Pack Format & Manifest** into epics and tasks.
F1 is the only feature past the ADR gate, so this is the last artefact
before code, and it is the first breakdown in the project: **no epic or
task number has been allocated before this document**.

The deliverable is a **greenfield TypeScript ESM package** — `@lintel/cli`,
binary `lintel`, `engines.node >= 22` — that ships three of the five
commands of the `harness` group (`validate`, `verify`, `pack info`), plus
the planner, executor, journal and rollback that **F2 drives from `init`**
and F3 will drive from `update`. It ships **no pack**: the three bundled
packs already on disk (`packs/coding/`, `packs/planning/`, `packs/writing/`,
each with a real `pack.json` and `recipe.json`) are F5's content and F1's
**integration target**. F1 owns `validate`, `verify` and `pack info` and
**not** `init` (F2) and **not** `update` (F3); the modules those two
consume are built here and are marked *F1→F2* / *F1→F3* in the ADR's
plan.

The work lands under `src/` in the module layout the ADR's *File-level
plan* fixes, with unit tests alongside each module (`*.test.ts`, owned by
`[Implementer]`) and the integration and fixture trees under `tests/`
(owned by `[TestWriter]`). Every public symbol is the ADR's *Public
interface contract*; nothing here widens or narrows it. Cite the spec and
the ADR rather than restating them — in particular **the code catalogue,
US-16's fourteen-step order and US-16's adversarial-fixture table are
pointed at, never copied**, because this project has had three documents
drift by carrying lists that went stale.

Epic numbering begins at **E-01**. Task numbering is **Scheme A**,
epic-derived `T-XXYY` (`CLAUDE.md` §counters), beginning at **T-0101**.

**Read the two boxes before starting.**

> **The ⚠️ register is closed — all fourteen entries — and no task below
> is blocked.** `technology-choices.md` §6 has the resolutions; each ✅
> marker in this document **keeps its own**, because several resolved to
> something other than the obvious answer and a bare ✅ would lose that.
>
> **Read the resolutions, not just the ticks.** Three are easy to get
> wrong by picking the default: **U-4** — `collisionKey` folds **ASCII
> only**; do not reach for `toLowerCase()` and do not hand-roll a Unicode
> fold. **U-12** — the build is **`tsc`, not a bundler**, because it must
> **type-check rather than strip**; the path brands are compile-time
> controls and a stripper makes that depend on a separate `--noEmit` run
> nobody's build breaks without. **U-12 again** — `packs/` resolves from
> `import.meta.url`, **never `process.cwd()`**, or a user's project can
> shadow the bundled packs.
>
> **Q-81 is what closed most of them**, and its shape is worth carrying:
> where a row weighed a dependency against hand-rolling, the posture
> decided it. **Do not silently assume a library**, and do not read a ✅
> as "any approach will do".

> **The ADR predates three folds in the spec.** The ADR is PROCEED and its
> file-level plan and interface contract stand, but F1 moved from v2.1 to
> **v2.9** after it. Where this document names a module the ADR does not,
> or a shape the ADR contradicts, it says so and cites the spec. The full
> list is in *Cross-epic notes → Where the ADR and the spec disagree*.

---

## Epic Index

| # | Epic | User Stories | Feature Area |
|---|---|---|---|
| E-01 | The package, the diagnostic contract and the command surface | US-1 (exit rules), US-8 (argv), US-16, US-29, US-33 | `package.json`, `src/diag/`, `src/cli/main.ts`, `src/cli/flags.ts`, `src/index.ts` |
| E-02 | Path confinement, branded paths and the bounded walk | US-3, US-30, US-33 | `src/security/confine.ts`, `harness-paths.ts`, `src/fs/project-paths.ts`, `src/fs/walk.ts` |
| E-03 | The pack declaration — strict JSON, schema, anatomy, parameters, scaffolds | US-1, US-2, US-8, US-9 | `src/json/parse-strict.ts`, `src/pack/*`, `src/recipe/glob.ts`, `src/security/secret-heuristic.ts` |
| E-04 | The recipe — a closed primitive set, the write set and the ordered plan | US-3, US-9, US-31 | `src/recipe/types.ts`, `schema.ts`, `ops/index.ts`, `write-set.ts`, `plan-steps.ts` |
| E-05 | The six primitives — phase 2 rendering | US-3, US-4, US-31, US-32 | `src/recipe/ops/*.ts`, `src/recipe/anchors.ts` |
| E-06 | The payload — phase 1, hashing and `payloadDigest` | US-10, US-30 | `src/hash/*`, `src/payload/*` |
| E-07 | The manifest — six keys, canonical bytes, read-back validation | US-10, US-14, US-15 | `src/manifest/*` |
| E-08 | The permission surface and the security disclosure | US-3, US-4, US-13, US-29 | `src/security/claude-frontmatter.ts`, `src/security/consent.ts` |
| E-09 | `validate` and `pack info` — the fourteen-step runner and one report | US-2, US-16, US-29 | `src/validate/*`, `src/cli/commands/validate.ts`, `pack-info.ts` |
| E-10 | `verify` — recomputation, the digest gate and six states | US-15, US-33 | `src/verify/*`, `src/cli/commands/verify.ts` |
| E-11 | The write path F2 and F3 drive — journal, lock, plan, execute, rollback | US-13, US-14, US-30 | `src/fs/atomic-write.ts`, `journal.ts`, `lock.ts`, `src/apply/*` |
| E-12 | The adversarial fixture suite and the bundled-pack acceptance gate | US-16, US-29, US-30, US-31, US-32, US-33 | `tests/fixtures/adversarial/`, `tests/integration/`, CI |

---

Each task is prefixed with `[Implementer]` or `[TestWriter]` to make
ownership unambiguous — both agents can read this doc and pick up their
own tasks without collision. Unit tests live with the implementation and
are owned by `[Implementer]`; integration and acceptance tests are owned
by `[TestWriter]`.

---

## E-01 — The package, the diagnostic contract and the command surface

The package exists, builds, and runs. `lintel harness <command>` dispatches
over the five-command surface, every diagnostic is rendered from one
catalogue, and the process exits `0/1/2/3` by the code's own class. This
epic ships no pack behaviour — it ships the thing every other epic reports
through. `src/diag/catalogue.ts` is **the only place user-facing CLI text
exists** (F1 §Error States).

**Depends on:** nothing.
**Unlocks:** every other epic — no module below can emit a finding until
T-0103…T-0105 land.

### Package and build

- [x] **T-0101** `[Implementer]` Create `package.json`, `tsconfig.json` and the
  build script for `@lintel/cli`: ESM, binary `lintel`, `engines.node >= 22`,
  `packs/` included in the published artefact and resolvable relative to the
  installed module (Q-2; F1 US-3 stage 2 reserves that resolved directory as a
  destination). The build must **type-check** rather than strip — the path
  brands of E-02 and the total `RecipeStep` union of E-04 are compile-time
  controls, not decoration.
  **✅ UNBLOCKED (U-12 and U-14, both closed).** `dependencies` is `{}`
  (Q-81, asserted by T-1219) and **no `vitest.config.ts`**. The build is
  **`tsc` only** — ESM plus declarations, no bundler — because it must
  **type-check, not strip**: the path brands and the total `RecipeStep`
  union are compile-time controls, and C-14's *"a path that skipped the
  gate is a compile error"* is only true if something compiles.
  **`packs/` ships via `files` and resolves with
  `new URL('../packs/', import.meta.url)` — never `process.cwd()`**, which
  would let a user's project shadow the bundled packs.
  *No dependencies. Prerequisite for every task in this document.*

- [x] **T-0102** `[Implementer]` Add the test-runner configuration and the
  scripts that run unit, integration and fixture suites. The runner must
  assert on the **process exit class**, and for two fixtures on **file mode
  and directory-entry name** with no code involved (US-16, C-36).
  **✅ UNBLOCKED (U-10, closed by Q-81): the runner is `node:test`.** It
  ships with Node 22, so it is a dependency in neither budget, and it
  needs no config file — the ADR's `vitest.config.ts` row is superseded.
  **Done.** `tests/harness/cli.ts` — `runCli` (a real process, because the
  exit class is the contract and an in-process call cannot observe one),
  `EXIT` naming F1's four classes, `snapshot` over `readdir` entries so the
  **on-disk spelling** is what is reported (C-36), `unchanged` for the
  zero-bytes claim, and `withTempDir`. Six self-tests run it against the
  filesystem with no CLI involved.
  **A layout constraint fell out of T-0101's depth invariant** and is worth
  knowing before adding a fourth config: `paths.ts` must compile **one
  level inside its out root**, so tests cannot share a root with it at a
  different depth. Hence three tsconfigs — app (`src → dist`, tests
  excluded), unit (same root, tests included), integration (`tests →
  dist-tests`, driving the **built** artefact). Production `dist/` carries
  **no** test files.
  *Depends on: T-0101. Prerequisite for every `[TestWriter]` task.*

### The diagnostic contract

- [x] **T-0103** `[Implementer]` `src/diag/codes.ts` — the single code taxonomy:
  the `DiagnosticCode` union over F1 §Error States (**88 codes** at F1 v3.8, and that
  table is the only catalogue), `Severity`, the **class** axis
  (`defect | notice`, Q-60) carried by every `W-` code, and the
  code→exit-class map over `0 | 1 | 2 | 3`. An unclassified `W-` code
  resolves to `defect` — fail-closed, deliberately (§Error States).
  Do not copy the table into this module's comments; derive it from the
  spec section and keep one copy.
  **Done, and the "one copy" is enforced rather than intended:**
  `codes.test.ts` re-parses §Error States on every run and fails on any
  divergence — missing codes, invented codes, a moved exit class, a `W-`
  code whose class changed. **The direction is fixed too:** a code present
  in the module and absent from the table is the defect, because F1 owns
  the only catalogue and no other document may invent a code.
  *Depends on: T-0101. Prerequisite for T-0104, T-0105 and every emitting module.*

- [x] **T-0104** `[Implementer]` `src/diag/catalogue.ts` — code → message
  template, verbatim from F1 §Error States, with the `lintel:` line-1 prefix,
  two-space indented continuation lines and the `→` remedy line. `{…}`
  interpolation only. **No user-facing string may exist anywhere else in the
  product.**
  **Done, and it required three rules F1 did not state** — now in §NFR at
  v3.9: a placeholder is `{name}` with an **identifier** name and every
  other brace is literal (nine occurrences across the catalogue are JSON or
  a regex quantifier, and reading them as placeholders mangles both); three
  slots are **prose without names** and render literally, pinned in
  `DESCRIPTIVE_SLOTS`; and a `→` marks a remedy **only line-initially**,
  because `E-REWRITE-UNUSED` carries one as content.
  *Depends on: T-0103.*

- [x] **T-0105** `[Implementer]` `src/diag/diagnostic.ts` — `Diagnostic`,
  `DiagnosticBag` and `exitCodeFor()` exactly as the ADR's interface contract
  declares them, including the `path` / `line` / `step` / `data` fields.
  Severity is a property of the **code**, never of the occasion — a bag may
  not override one.
  **Done, and the rule is enforced by shape rather than by discipline:**
  `diagnostic()` is the only constructor and `DiagnosticInit` carries no
  severity, class, message or code field, so there is no parameter through
  which an occasion could disagree with its code. `exitCodeFor` is asserted
  over **every** code and over **all thirteen** warnings, not one example
  of each.
  *Depends on: T-0103, T-0104.*

### The command surface

- [x] **T-0106** `[Implementer]` `src/cli/main.ts` — dispatch the **`harness`
  command group**: the binary is `lintel`, the group is the first positional
  and the command is the **second** (Q-63). `E-CLI-UNKNOWN-COMMAND` lists
  **six** commands — `init, update, skill, validate, verify, pack` (Q-62, `F6-ADR-005`) — even
  though F1 implements three; `init` is F2's and `update` is F3's, and each
  dispatches to a stub that reports "not implemented in this build" until its
  feature lands. Route `Diagnostic[]` → stderr → exit code.
  **Note the ADR is superseded here**: its plan says *four* commands and no
  group (see Cross-epic notes). **There is no `src/cli/commands/init.ts`** —
  that absence is deliberate and is F2's surface.
  *Depends on: T-0105.*

- [x] **T-0107** `[Implementer]` `src/cli/flags.ts` — the per-command flag
  table and the **two-pass argv parse** (US-8): pass 1 recognises group,
  command, global flags, command flags and the pack name and **defers every
  unrecognised token without judging it**; pass 2 re-parses with the resolved
  pack's `flag` aliases registered, and only then may a token be reported
  unknown. Fail-closed at the end of pass 2. Implements `--set`, `--scaffold`,
  `--json`, `--strict`, `--force`, `--rollback`, `--all`, the reserved-flag
  list (global, not per-command), the four `E-CLI-*` codes and
  `E-FLAG-NOT-PERMITTED`. `--accept-permissions` and `--accept-hooks` are
  **not** reserved and reach `E-CLI-UNKNOWN-FLAG` by the general rule (Q-54).
  **✅ UNBLOCKED (U-5, closed by Q-81): hand-rolled.** Every off-the-shelf
  parser — `node:util`'s `parseArgs` included — assumes a **static
  grammar** and throws or mis-binds on an unknown token in pass 1. That is
  not a shortcoming to route around: the grammar genuinely is not known
  until the pack resolves.
  *Depends on: T-0106. Prerequisite for T-0905, T-0906, T-1003.*

- [x] **T-0108** `[Implementer]` `src/index.ts` — the library entry, re-exporting
  **exactly** the ADR's public interface contract and nothing else. Downstream
  features compile against this file; a symbol that is not in the contract does
  not belong here.
  *Depends on: T-0105. Re-checked whenever an epic adds a contract symbol.*

### Verification

- [x] **T-0109** `[TestWriter]` Acceptance tests for the exit-class contract in
  `tests/integration/exit-classes.test.ts`: every class `0/1/2/3` reachable and
  meaning the same thing on every command (IM-39), a `notice`-only run exiting
  `0` under `--strict`, a `defect` run exiting `1` only under `--strict`
  (US-16), and every emitted message beginning `lintel:`.
  *Runs in parallel with T-0103–T-0106 against the ADR's public interface contract.*

- [x] **T-0110** `[TestWriter]` Integration tests for argv in
  `tests/integration/argv.test.ts`: a pack-declared alias resolving only in
  pass 2 and **never** reporting a false `E-CLI-UNKNOWN-FLAG`; the command as
  the second positional; `E-FLAG-NOT-PERMITTED` for a known flag on the wrong
  command; and `--accept-hooks` reaching `E-CLI-UNKNOWN-FLAG`, exit 1.
  *Depends on: T-0107 for the alias half; the rest runs in parallel.*


- [x] **T-0111** `[Implementer]` `src/diag/codes.ts` + `catalogue.ts` — the
  **nine codes F1 v3.0 added**, taking the catalogue from 78 to **87**.
  Four for `update`, which **F3 fires and F1 only defines**:
  `E-UPDATE-AVAILABLE` (exit 1, and the one place in this catalogue where
  exit 1 reports a question answered rather than a fault — a CI job gates
  on "this project is behind" without parsing output),
  `E-UPDATE-NOT-NEWER`, `E-UPDATE-PARAM-UNANSWERED`,
  `E-UPDATE-SCAFFOLD-DROPPED`. Four for `init`, likewise F2's to fire:
  `E-CLI-UNKNOWN-PACK`, `E-CLI-PACK-MISSING`, `E-SET-UNKNOWN-PARAM`,
  `E-PARAM-UNANSWERABLE`. One notice: **`W-LINK-FALLBACK`** (see T-1105).
  Each carries its exit class and its message template; the `DiagnosticCode`
  union grows in the same change, by US-1's closed-enumeration rule.
  **Already satisfied when it was reached.** `codes.ts` and `catalogue.ts`
  are **derived from §Error States**, so all nine arrived with their exit
  classes and `W-LINK-FALLBACK`'s `notice` class for free. That is the
  dividend of deriving rather than transcribing: a task whose whole content
  is "add these nine" cannot be forgotten, because there was never a second
  list to forget them from.
  *Depends on: T-0104. Prerequisite for T-1105, and for F2's and F3's CLI work.*

- [x] **T-0112** `[Implementer]` `src/cli/flags.ts` — the reserved-flag list
  is **nine**, not eight: `--set`, `--scaffold`, `--json`, `--strict`,
  `--force`, `--rollback`, `--all`, **`--dry-run`**. `--dry-run` is reserved
  **although no F1 command accepts it** — it is `update`'s read-only mode,
  which is F3's — and the list's own rule is that a flag is reserved whether
  or not the command being run accepts it. Without it a pack may declare
  `"flag": "dry-run"` first and shadow a read-only mode when F3 ships, which
  is the `--accept-permissions` mistake avoided rather than repeated.
  *Depends on: T-0107.*

- [x] **T-0113** `[Implementer]` `src/diag/` — **one escaping function for
  every stream** (C-50): C0 control characters other than `\n` and `\t`,
  plus `U+2028`/`U+2029`, escaped to a visible form in **every**
  diagnostic, prompt and disclosure row. **Escaped, not refused** — a path
  or answer containing one is legitimate content and should print rather
  than abort a run. **Stated and applied once**, not per call site, which
  is how half of them get missed. The fault it closes: ANSI escapes in a
  parameter `prompt`, an applied path or an agent's frontmatter can
  **erase or overwrite the disclosure they just triggered**, or make a
  prompt ask a different question from the one being answered.
  `E-SUBST-NEWLINE` does not cover it — that bounds a value written into
  a **file**, and nothing reaching a terminal.
  *Depends on: T-0104. Prerequisite for every command that prints.*

- [ ] **T-0114** `[Implementer]` `src/diag/codes.ts` — add
  **`E-DISCLOSURE-FORGERY`** (C-49), exit 2, taking the catalogue **87 →
  88**. Raised where the check in T-0806 fires.
  *Depends on: T-0111.*
---

## E-02 — Path confinement, branded paths and the bounded walk

The trust-critical foundation of the whole product (`system-architecture.md`
§3). Every applied path is produced by **one gate** and carries the branded
`AppliedPath` type; the CLI's own writes under `.harness/` carry
`HarnessPath`; a bare `string` never reaches a writer. Nothing that writes
can be built until this lands, which is why it is second.

**Depends on:** E-01 (T-0103–T-0105).
**Unlocks:** E-04 (the write set is a set of `AppliedPath`), E-05, E-06,
E-11. E-09's steps 6 and 7 are this epic's rules, run at validate time.

### The gate

- [ ] **T-0201** `[Implementer]` `src/security/confine.ts` — **stage 1**, the
  anchored `to` grammar of US-3, as a single anchored rule rather than four
  substring searches: leading separator, any backslash, drive-absolute *and*
  drive-relative (`C:x`), UNC prefix, `.`/`..`/empty segment, a segment ending
  in `.` or whitespace, a reserved Windows basename, and non-NFC. One code,
  `E-MAP-PATH-GRAMMAR`, whose message names the offending construct. Exports
  `confinePath()` and the `ConfineContext` `stage: 'declared'` arm — **grammar
  and denylist only, no filesystem**, so `validate` runs in CI with no project.
  C-4, C-6.
  *Depends on: T-0105. Prerequisite for T-0202–T-0205, and for every epic that writes.*

- [ ] **T-0202** `[Implementer]` `collisionKey()` in `src/security/confine.ts` —
  the applied path **NFC-normalized and then case-folded**, computed
  identically and **unconditionally on every platform**. This one function is
  the folding rule for step-vs-step (`E-MAP-CASE-COLLISION`,
  `E-MAP-NORM-COLLISION`), for the reserved-destination denylist, for
  `E-TARGET-EXISTS`, for `--force`'s byte-identity test and for the journal's
  `preExisting` determination — **N-5**, and rollback safety rides on it
  (C-13, C-20).
  **✅ UNBLOCKED (U-4, closed by Q-81), and read the resolution before
  implementing:** the fold is **ASCII only** — `A`–`Z` to `a`–`z`, no
  other character altered — after NFC. **Do not reach for `toLowerCase()`
  and do not hand-roll a Unicode fold.** A partial Unicode fold is
  aggressive on the pairs it covers and silent on the rest while
  reporting equal confidence for both; an ASCII fold is wrong in a
  knowable way, and the whole of that limit is *every non-ASCII case pair
  is uncovered*. Recorded as **F1 known limit 17**; a test asserts that
  `ÉTUDE.md` and `étude.md` do **not** collide, so the narrowing is
  pinned rather than merely documented.
  *Depends on: T-0201. Prerequisite for T-0203, T-0405, T-1108.*

- [ ] **T-0203** `[Implementer]` **Stage 2** — the reserved-destination denylist
  in `src/security/confine.ts`, as two declared closed classes with **one
  quantifier rule**: a reserved *name* at **every segment**, `.harness/` as the
  **only location entry**, basenames at any depth, and the two settings
  basenames under **any `.claude` segment**. Every entry matched by
  `collisionKey`. `E-MAP-RESERVED-DEST`, exit 2. The list is the table in F1
  US-3 stage 2 — **reference it, do not restate it**, and add the fixture in the
  same change that adds an entry (US-3's own obligation).
  **The ADR homes this in `src/security/destination-policy.ts`; that module is
  not built** (Q-54 supersede box), and the denylist moves here, which is what
  the ADR itself directs.
  C-5, C-19, C-31, C-33, C-39a, C-39d, C-41.
  *Depends on: T-0202. Prerequisite for T-0404, T-0508, T-0901.*

- [ ] **T-0204** `[Implementer]` **Stage 3** — resolution confinement in
  `src/security/confine.ts`, the `stage: 'resolved'` arm: the project root
  resolved **once per run** with `realpath()`; every ancestor component
  `lstat`ed top-down with `E-DEST-SYMLINK` on any reparse point; directories
  created one level at a time; and the resolved parent joined with the final
  basename a **strict descendant** of the resolved root (`E-MAP-ESCAPES-ROOT`).
  Skipped at `validate`, which has no project root. C-4.
  *Depends on: T-0201.*

- [ ] **T-0205** `[Implementer]` **Stage 4** — `confineAtWrite()` in
  `src/security/confine.ts`: re-run stage 3 immediately before each write and
  return the fd of an **exclusively created** temp file, or a diagnostic. The
  plan's `lstat` is stale by write time; this closes the window. C-14.
  *Depends on: T-0204. Consumed by T-1106.*

### The second brand, and the walk

- [ ] **T-0206** `[Implementer]` `src/security/harness-paths.ts` — **the only
  constructor of `HarnessPath`**, over a list that is **five and complete**:
  `pack/**`, `manifest.json`, `journal.json`, `journal.d/**`, `lock`. Derived
  from paths already proven grammar-clean, so confined by construction;
  violations are `E-PAYLOAD-PATH-INVALID`. This brand is what lets the denylist
  forbid `.harness/` outright **without deadlocking against the payload
  copier**, and what makes "a recipe step reaches a `.harness/` writer" a
  compile error. **There is no `.harness/README.md`** and no CLI write that
  produces one (Q-50 as amended). C-5, C-14.
  *Depends on: T-0201.*

- [ ] **T-0207** `[Implementer]` `src/fs/project-paths.ts` — the `.harness/`
  layout constants and POSIX + NFC normalization helpers. All path *safety*
  stays in `src/security/`; this module holds names, not rules.
  *Depends on: T-0206.*

- [ ] **T-0208** `[Implementer]` `src/fs/walk.ts` — the **one** bounded,
  non-symlink-following walk: depth ≤ 32, ≤ 10 000 entries,
  `E-TRAVERSAL-LIMIT`, `lstat` never `stat`, `W-SCAN-SYMLINK-SKIPPED`, and the
  scan skip list (`.git/`, `.hg/`, `.svn/`, `node_modules/`). **Exactly two call
  sites**: the phase-1 payload walk (T-0605) and the `verify` project scan
  (T-1001). C-17.
  *Depends on: T-0105.*

### Verification

- [ ] **T-0209** `[TestWriter]` Acceptance tests for US-3's four stages in
  `tests/integration/confinement.test.ts` — one case per rejected construct in
  the stage-1 grammar table, one per denylist class and quantifier, symlinked
  ancestor and symlinked destination, and `/tmp`-on-macOS root resolution
  (a `realpath`-less implementation refuses to run there, and that must fail
  the suite).
  *Runs in parallel with T-0201–T-0206 against the ADR's public interface contract.*

- [ ] **T-0210** `[TestWriter]` A **structural** test in
  `tests/structural/brands.test.ts`: no `as AppliedPath` / `as HarnessPath`
  cast exists outside `src/security/confine.ts` and
  `src/security/harness-paths.ts`, and no exported function that constructs a
  `HarnessPath` is reachable from recipe-step planning. US-3 and US-13 both ask
  for this property to be asserted by construction; a test is how it is
  asserted. C-14.
  *Depends on: T-0206.*


- [ ] **T-0211** `[Implementer]` Add **`skills`** to the
  reserved-destination names matched at **any `.claude` segment** (C-53),
  beside `settings.json`'s basename reservation and on the same
  reasoning: **a pack may not install instructions into the agent runtime
  of the project it is applied to**. The frontmatter checks bound what a
  pack-placed file may *declare*; they bound nothing about what it may
  *instruct*, and a pack shipping `.claude/skills/lintel/SKILL.md` would
  install instructions under the harness's own name. **`skill install` is
  a CLI write and is unaffected** — the reservation binds recipe steps.
  Bounded at v1.0 by bundled packs; **unbounded the moment F4 ships**.
  *Depends on: T-0203.*
---

## E-03 — The pack declaration — strict JSON, schema, anatomy, parameters, scaffolds

`pack.json` parses, validates and reports. This epic delivers everything
US-1, US-2, US-8 and US-9 declare, including the strict reader that the
recipe and the manifest also use, and the one glob matcher the whole
product shares.

**Depends on:** E-01, E-02 (T-0201 for `folderReadme`'s segment grammar).
**Unlocks:** E-04 (the recipe is loaded by `load-pack.ts`), E-07 (the strict
reader), E-09 (steps 1, 2, 9, 10).

### Reading authored JSON

- [ ] **T-0301** `[Implementer]` `src/json/parse-strict.ts` — `parseStrictJson()`,
  **the only parser for authored JSON**: `pack.json`, `recipe.json` and
  `.harness/manifest.json`, and no fourth document. Rejects a duplicate key at
  **any depth** with `E-JSON-DUPLICATE-KEY`, exit 2, naming the file, the key
  and **both line numbers**. A hand-rolled token pass — `JSON.parse` collapses
  duplicates before a reviver sees them, so this is the one stdlib call the ADR
  replaces rather than wraps. **SEC (C-25):** the threat model's actor 1 is
  caught by "a JSON diff review", and a parser that keeps the *last* duplicate
  while a human reads the *first* voids that control by name.
  **✅ UNBLOCKED (U-1, closed by Q-81): hand-rolled.** A token pass that
  tracks line and column, rejecting a duplicate key at **any depth** and
  reporting both line numbers. `JSON.parse` collapses duplicates before a
  reviver sees them, which is why this is the one stdlib call the design
  replaces rather than wraps.
  *Depends on: T-0105. Prerequisite for T-0303, T-0402, T-0704.*

### The schema

- [ ] **T-0302** `[Implementer]` `src/pack/types.ts` — `PackJson`, `AnatomyDecl`,
  `AnatomySource`, `AnatomyPartId`, `AnatomyStatus`, `ParameterDecl`,
  `ScaffoldDecl`, exactly as the ADR's contract declares them. **No `Mapping`,
  no `SharedRef`, no `ComponentJson`, no `contentRoot`.** Add `provenance`
  (Q-60, US-1) and `folderReadme` (Q-50, US-1), which the ADR's contract
  carries.
  *Depends on: T-0101.*

- [ ] **T-0303** `[Implementer]` `src/pack/schema.ts` — the hand-rolled
  structural validator. Three rules, and they are separate rules:
  unknown **keys** → warning, `defect` class, ignored at apply; an unrecognised
  **value in a behaviour-selecting position** → `E-UNKNOWN-VALUE`, exit 2,
  **zero bytes** (C-16) over the enumeration **closed at six**; and every
  **boolean-typed field** — the list **closed at four**, `RecipeStep.executable`,
  `RecipeStep.adaptExpected`, `ParameterDecl.required`, `ParameterDecl.notASecret`
  — must hold a JSON `true`/`false` literal with **no coercion and no
  truthiness** (C-34: `"executable": "false"` is truthy in JavaScript and read
  as `true`, and `"notASecret": "no"` disabled the credential ban — two
  security gates failing **open** on a typo). Also validates `provenance`'s two
  permitted shapes and `folderReadme`'s one-segment grammar
  (`E-MAP-PATH-GRAMMAR`).
  **Known limit 15 (C-47) is accepted, not fixed:** `AnatomyDecl.declaredBy` is
  a behaviour-selecting value outside the closed six, so `"declaredBy": "payload"`
  is unhandled. Do not invent a rule for it; leave it as F1 §F1.9 records it.
  **✅ UNBLOCKED (U-2, closed by Q-81): hand-rolled.** Which is what the
  constraint wanted anyway — findings must be F1 codes emitted in US-16's
  fixed order, and an off-the-shelf validator's own error shape and
  ordering would have had to be translated away. The schemas are closed
  enumerations this spec already states.
  *Depends on: T-0301, T-0302, T-0201.*

- [ ] **T-0304** `[Implementer]` Semver parse and compare, used by
  `E-PACK-CLI-TOO-OLD` (exit 1) and `E-PACK-FORMAT-NEWER` (exit 2). Total and
  deterministic across platforms; **no range arithmetic** is needed —
  `minCliVersion` is a floor.
  **✅ UNBLOCKED (U-8, closed by Q-81): those ~30 lines**, in
  `src/semver/compare.ts`. Parse and total compare only — **no range
  arithmetic**, because `minCliVersion` is a floor, not a range.
  *Depends on: T-0302.*

- [ ] **T-0305** `[Implementer]` `src/pack/load-pack.ts` — resolve `packs/<name>/`
  relative to the CLI's own install directory, parse `pack.json` and the
  declared `recipe` (default `recipe.json`; a `recipe` naming a missing file is
  `E-RECIPE-MISSING`, one escaping the pack directory is
  `E-PAYLOAD-PATH-INVALID`). Uses `src/fs/walk.ts`. Resolves **no** shared
  reference — there are none (Q-48).
  **✅ UNBLOCKED (U-12): `new URL('../packs/', import.meta.url)`.** Not
  `process.cwd()` — resolving against the working directory would let a
  user's project shadow the bundled packs, which is untrusted content
  entering through the one input F1 treats as trusted. Not `__dirname`,
  which does not exist in ESM. *(Superseded note: install-relative
  resolution was the packaging half of
  the build entry, and it is the same `realpath` the gate reserves as a
  destination.)
  *Depends on: T-0301, T-0208, T-0303.*

- [ ] **T-0306** `[Implementer]` `src/recipe/glob.ts` — **the one bounded glob
  matcher**, used by `exclude`, by `in` and by anatomy `paths`. **SEC (C-27):
  an `in` glob's resolution domain is the plan's ordered written-set —
  `readonly AppliedPath[]` — and the matcher takes no filesystem handle, so
  "resolve against disk" is not expressible.** Bounded against author-supplied
  patterns.
  **✅ UNBLOCKED (U-3, closed by Q-81): hand-rolled, and the dialect is
  therefore this project's to state rather than a library's to imply.**
  Choose the smallest dialect that serves `exclude`, `in` and anatomy
  `paths`, and state it in the spec — it must be small enough that
  `pack info` renders an apply completely (G-F1-9). The matcher takes
  **no filesystem handle** (C-27).
  *Depends on: T-0201. Prerequisite for T-0307, T-0404, T-0501.*

### Anatomy, parameters, scaffolds

- [ ] **T-0307** `[Implementer]` `src/pack/anatomy.ts` — the nine-part
  completeness check, the three-value status axis with its default, the
  `AnatomyRow` report rows (exactly nine, in `AnatomyPartId` order, with the
  fourth value `missing` reachable **only for an invalid pack**), and
  `E-ANATOMY-MISSING`, `E-ANATOMY-EMPTY`, `E-ANATOMY-NO-NOTE`,
  `E-ANATOMY-NO-REASON`, `E-ANATOMY-SOURCE-ON-ABSENT`. Redundancy is a
  `defect` warning; contradiction is exit 2. `W-ANATOMY-PROVISIONAL` and
  `W-ANATOMY-ABSENT` are **`notice`** class and `--strict` must not promote
  them — that is what lets `planning` exit 0 in CI (Q-60).
  *Depends on: T-0303, T-0306.*

- [ ] **T-0308** `[Implementer]` `src/pack/parameters.ts` — declaration rules and
  answer handling: `pattern` **required** on every `type: "string"`
  (`E-PARAM-NO-PATTERN`), anchored, ≤ 200 chars, no backreference and no
  lookaround (`E-PARAM-PATTERN-INVALID`); `maxLength` default 256, ceiling 4096,
  **checked before `pattern` runs** so pattern evaluation is bounded by
  construction; `flag` alias registration and its reserved/collision rules
  (`E-PARAM-FLAG-INVALID`); `E-PARAM-MISSING`, `E-PARAM-UNDECIDABLE`; and the
  **two-code split** of C-29 — `E-PARAM-INVALID`, exit 1, **at collection
  only**, and `E-MANIFEST-ANSWER-INVALID`, exit 2, on **every read-back from
  the manifest**. Exports the combination enumeration used by E-09
  (`E-PARAM-COMBINATORICS` above 32). C-7, C-29.
  **✅ UNBLOCKED (U-7, closed by Q-81): source-text inspection,
  hand-rolled.** The alternative was a regex-AST **dependency**, and the
  hand-rolled answer is stronger anyway — a check that compiles the
  pattern to classify it has already run author input through the regex
  engine, which is what `maxLength` and the anchoring rule exist to
  bound. *(Superseded note: the open question was
  lookaround. It must be decided from the **source text**, not from
  compilation, must not itself backtrack over author input, and must fail
  closed on anything unclassifiable.)
  *Depends on: T-0303. Prerequisite for T-0704, T-0902, T-1001.*

- [ ] **T-0309** `[Implementer]` `src/security/secret-heuristic.ts` — the
  credential ban: `E-PARAM-SECRET-SUSPECTED`, exit 2, at validate time on a
  parameter whose `id` or `prompt` matches the declared matcher unless it
  carries `"notASecret": true`; and `W-ANSWER-LOOKS-SECRET`, a `defect`-class
  warning, at answer time on a value that looks like a credential. A bare `key`
  deliberately does not match. The message must state that an answer is written
  verbatim into a manifest **this spec requires to be committed**. C-15.
  *Depends on: T-0308.*

- [ ] **T-0310** `[Implementer]` `src/pack/scaffolds.ts` — selection by id
  (`E-SCAFFOLD-UNKNOWN`, exit 1), **`category` exclusivity**
  (`E-SCAFFOLD-EXCLUSIVE`, exit 1 — the choose-one diagnostic, which a path
  collision would report misleadingly), composition in **`pack.json`-declared
  order** so two users typing flags differently get byte-identical projects,
  and the static pairwise collision matrix over differing-or-absent categories
  (`E-SCAFFOLD-COLLISION`, exit 2). A `pack.json`/`recipe.json` scaffold
  mismatch in either direction is `E-RECIPE-STEP-INVALID` and belongs to
  T-0405. Q-17.
  *Depends on: T-0303.*

### Verification

- [ ] **T-0311** `[TestWriter]` Acceptance tests for US-1, US-2, US-8 and US-9 in
  `tests/integration/pack-json.test.ts`, covering the `formatVersion` /
  `minCliVersion` gates, the nine anatomy outcomes, the parameter declaration
  rules including the C-29 two-code split, the `flag`-alias rules, and scaffold
  exclusivity and composition order.
  *Runs in parallel with T-0302–T-0310 against the ADR's public interface contract.*

- [ ] **T-0312** `[TestWriter]` Tests for the strict reader in
  `tests/integration/strict-json.test.ts`: a duplicate key at depth 1 and at
  depth 3 in each of the three documents, each reporting
  `E-JSON-DUPLICATE-KEY` with **both line numbers**, exit 2, nothing written,
  and **before any other check on the file**.
  *Depends on: T-0301.*

---

## E-04 — The recipe — a closed primitive set, the write set and the ordered plan

`recipe.json` parses into a **closed** discriminated union, the plan is
merged and ordered, and every step's **write set** is computable as a pure
function of the pack. This epic delivers the quantifier that every
destination rule in the product is stated over — C-19's keystone — and
therefore has to land before any destination rule can be trusted.

**Depends on:** E-02 (T-0201–T-0203), E-03 (T-0301, T-0303, T-0306).
**Unlocks:** E-05 (the ops render what these steps declare), E-09 (steps
4, 5, 6, 7), E-10 (`adaptExpected`), E-11.

### The closed type

- [ ] **T-0401** `[Implementer]` `src/recipe/types.ts` — `Recipe`, `RecipeStep`
  as a **six-arm** discriminated union (`copy`, `rename`, `strip-suffix`,
  `rewrite-path`, `substitute`, `generate`), `RECIPE_OPS`, `StepWhen`,
  `MAX_RECIPE_STEPS = 256`, and `adaptExpected` as an optional boolean on
  **every** primitive (Q-56).
  **Superseded from the ADR on two points**, both stated in its own Q-54 box
  and in US-31: the union has **six** arms and no `merge-json`/`ownedKeys`;
  and `adaptExpected` is a field the ADR's contract predates.
  *Depends on: T-0302. Prerequisite for every task in E-04 and E-05.*

- [ ] **T-0402** `[Implementer]` `src/recipe/schema.ts` — the `recipe.json`
  validator, **fail-closed and total**: every step is narrowed to exactly one
  union arm or rejected. `E-RECIPE-INVALID`, `E-RECIPE-PRIMITIVE-UNKNOWN`
  (with `op` matched **literally** — no trimming, no case folding, no
  normalization, so `"copy "` reaches this code; and a special remedy line when
  `op` is `merge-json`, so an author is told it was withdrawn rather than left
  to assume a typo), `E-RECIPE-STEP-INVALID`, `E-RECIPE-FORMAT-NEWER`
  (**C-24** — `Recipe.formatVersion` is one of US-1's six behaviour-selecting
  positions and before v2.3 no rule checked it, which is fail-*open* in the one
  position the rule exists to close), and `E-RECIPE-TOO-MANY-STEPS` over the
  **total declared** count before any `when` filtering (**C-30** — an
  inspectability control, not a DoS control).
  **✅ UNBLOCKED (U-2, closed by Q-81)** — the same resolution as
  `pack.json`'s validator: hand-rolled, F1 codes, US-16's order.
  *Depends on: T-0301, T-0401.*

- [ ] **T-0403** `[Implementer]` `src/recipe/ops/index.ts` — the **closed
  registry**: the only place an `op` name maps to an implementation. Adding a
  primitive is a change here **and** in `types.ts` **and** in a superseding
  ADR, deliberately. There is no `exec.ts`, `script.ts`, `shell.ts` or seventh
  op file of any name, and that absence is a shipping property.
  *Depends on: T-0401.*

### The write set and the plan

- [ ] **T-0404** `[Implementer]` `src/recipe/write-set.ts` — `stepWriteSet(step,
  writtenSoFar)`, **pure, project-free and total over the six arms**, returning
  every applied path whose **bytes** a step creates or changes, per op exactly
  as the ADR's contract tabulates. For the two `in` primitives the set is
  **matched, not hit**. `writtenSoFar` is the plan's ordered written-set and is
  the **sole** resolution domain for `in` globs.
  **SEC (C-19): this — never `step.to` — is what every destination rule, the
  stage-2 denylist and the executable rules are evaluated over.** Two of the
  six primitives have no `to` at all, so a `to`-keyed control has two silent
  exemptions, and that is how two rules lapsed. An `in` glob matching nothing
  in the written-set is `E-RECIPE-STEP-INVALID`, naming the step index and the
  glob; every matched path is **re-checked individually** against the stage-2
  denylist (C-27's second mechanism, which exists because the first is an
  implicit chain).
  *Depends on: T-0203, T-0306, T-0401. Prerequisite for T-0405, T-0508, T-0803, T-0901.*

- [ ] **T-0405** `[Implementer]` `src/recipe/plan-steps.ts` — merge base steps
  with each selected scaffold's steps in **`pack.json`-declared scaffold
  order**, apply `when` filtering (single equality only; a compound `when` is
  `E-RECIPE-STEP-INVALID`), and run the edit-before-place ordering check.
  Computes `E-MAP-COLLISION` (two steps *place* the same applied path — and it
  must **not** widen to cover a `substitute` over a path an earlier `copy`
  wrote), `E-MAP-CASE-COLLISION` and `E-MAP-NORM-COLLISION` over the merged
  step set by `collisionKey`, and `E-RECIPE-STEP-INVALID` for a
  `pack.json`/`recipe.json` scaffold mismatch in either direction.
  *Depends on: T-0202, T-0310, T-0404.*

- [ ] **T-0406** `[Implementer]` Step-source existence in
  `src/recipe/plan-steps.ts` — `E-RECIPE-SOURCE-MISSING`, exit 2, naming the
  step index, **the field** and the path, over `from` on the five primitives
  that have one **and over `generate`'s `template`** (C-38: one fault, one
  code, at whichever field carries the source; through v2.3 `generate`'s only
  input had no named code for the commonest authoring mistake).
  *Depends on: T-0405.*

- [ ] **T-0407** `[Implementer]` The **adapt-expected set** in
  `src/recipe/plan-steps.ts` — the union of the write sets of every step
  declaring `"adaptExpected": true`, resolved at plan time from the recipe
  alone. A declaring step whose write set is empty is `E-RECIPE-STEP-INVALID`.
  It changes **nothing** about the apply — the bytes, the plan `pack info`
  prints, the disclosure, the confinement gate, the collision rule and the
  recomputation are identical with and without it — and has **exactly one
  consumer**, `verify` (T-1002). There is no pack-level, run-level or flag-level
  form of it, and the manifest gains no seventh key: the set is recomputable
  from the committed payload. Q-56.
  **Not in the ADR** — `adaptExpected` postdates it. US-31 and US-33 are the
  contract.
  *Depends on: T-0404, T-0405. Prerequisite for T-1002.*

### Verification

- [ ] **T-0408** `[TestWriter]` Acceptance tests for US-31 in
  `tests/integration/recipe-schema.test.ts`: the closed op set including the
  literal-match cases, the two `formatVersion` gates as **distinct codes**, the
  256-step bound counted before `when` filtering, and the `when` rules.
  *Runs in parallel with T-0401–T-0406 against the ADR's public interface contract.*

- [ ] **T-0409** `[TestWriter]` Property tests for the write set in
  `tests/integration/write-set.test.ts`: one case per op proving the tabulated
  set, the matched-not-hit property for `in` primitives, totality over the six
  arms, and purity — the function is called with no project and no filesystem
  handle and produces the same set twice.
  *Depends on: T-0404.*


- [ ] **T-0410** `[Implementer]` `src/recipe/plan-steps.ts` — resolve the
  **fill-expected set** beside the adapt-expected set (T-0407), by the same
  write-set quantifier and at plan time from the recipe alone. A step
  declaring `"fillExpected": true` contributes every applied path in its
  write set. **Two validation rules, both `E-RECIPE-STEP-INVALID`, exit 2**:
  an empty write set under the declaration, and — new — a step declaring
  **both** `fillExpected` and `adaptExpected`, which is an authoring mistake
  because a file is either the skill's to adapt or the user's to fill and a
  step claiming both has not decided which. `fillExpected` is US-1's **fifth**
  boolean-typed field, so `"true"` as a string is `E-UNKNOWN-VALUE`, exit 2 —
  and here a non-boolean does more than mis-report a state: it silently
  disarms the prohibition that stops `update` overwriting a filled
  `project-brief.md`. Q-79.
  *Depends on: T-0407, T-0405. Prerequisite for T-1002, T-1005, and F3's classifier.*
---

## E-05 — The six primitives — phase 2 rendering

The six ops render. Each takes `AppliedPath`, never `string`, and produces
bytes. Together with E-04 this is "a pack can only write text", which is the
format's central security property (§NFR *Bounded capability*).

**Depends on:** E-02, E-04.
**Unlocks:** E-09 step 11, E-10's recomputation, E-11's plan-time render.

### The placing primitives

- [ ] **T-0501** `[Implementer]` `src/recipe/ops/copy.ts` — directory recursion in
  **byte-ascending path order**, `exclude` globs relative to `from`, basename
  invariance for a file `from` (a changed basename is `rename`'s job), and the
  `executable` field. Source and destination directory **names** may differ,
  expressed by the step alone with no content change.
  *Depends on: T-0306, T-0403, T-0404.*

- [ ] **T-0502** `[Implementer]` `src/recipe/ops/rename.ts` — one file in, one
  file out, basename may differ. A directory `from` is `E-RECIPE-STEP-INVALID`.
  *Depends on: T-0403.*

- [ ] **T-0503** `[Implementer]` `src/recipe/ops/strip-suffix.ts` — copies a file
  or a directory and rewrites basename `X<suffix>.Y` to `X.Y`. `suffix` is a
  **declared literal** matching `^\.[a-z0-9-]{1,16}$` with **no implicit
  `.template` default** — the coding pack's payload legitimately keeps
  `*.template.md` filenames that must not be stripped. A `from` yielding no
  basename carrying the suffix is `E-RECIPE-STEP-INVALID`.
  *Depends on: T-0403.*

### The editing primitives

- [ ] **T-0504** `[Implementer]` `src/recipe/ops/rewrite-path.ts` — literal
  find/replace over already-written applied text files, with **hit counting**
  so a step matching nothing across all its `in` files is `E-REWRITE-UNUSED`
  (a rewrite that no longer applies is stale, and staleness is the defect this
  product exists to prevent). `find` and `replace` are literals, never regexes,
  and neither may contain a line break.
  *Depends on: T-0404, T-0403.*

- [ ] **T-0505** `[Implementer]` `src/recipe/ops/substitute.ts` — resolve
  `{{harness:param.<id>}}`, `{{harness:pack.name}}`, `{{harness:pack.version}}`
  and `{{harness:cli.version}}` only, plus the `{{harness:lit:X}}` escape,
  **resolved once in one pass and never re-scanned**. Every other `{{…}}` is
  copied verbatim. `tokens`, when present, is an allowlist; a token outside it
  is `E-SUBST-UNRESOLVED`. Any unresolved `{{harness:…}}` left in output fails
  the apply before anything is written. **SEC (C-9): a substituted value may
  not contain `\n`, `\r`, `U+2028` or `U+2029` — `E-SUBST-NEWLINE`, exit 2.**
  This is the *sufficient* condition and it holds when a pack author's
  `pattern` is weak, which is why it exists separately from `E-PARAM-INVALID`.
  The step also **records every applied path at which a `{{harness:param.<id>}}`
  token resolved, with the parameter id and the value**, as the by-product
  T-0804 enumerates. There is **no JSON destination and therefore no JSON
  escaping rule** (Q-54).
  *Depends on: T-0404, T-0308, T-0403.*

- [ ] **T-0506** `[Implementer]` `src/recipe/ops/generate.ts` and
  `src/recipe/anchors.ts` — render one payload template, substitute exactly as
  T-0505 does, assert the declared anchors and write `to`. The assertion is a
  **literal line count, not a grammar and not a parser**: each declared id's
  opening line appears exactly once and the `<!-- harness:end -->` count equals
  the declared anchor count. `E-ANCHOR-INVALID` names the id and whether it was
  missing, duplicated or unbalanced. **Anchors are inert** — nothing at v1.0
  parses, hashes, merges into or reports on them (Q-45), and the deliberate
  limitation that a marker inside a fenced code block is counted is stated
  rather than engineered around.
  *Depends on: T-0505.*

### Content rules that cut across the ops

- [ ] **T-0507** `[Implementer]` Text/binary classification and its consequences,
  in `src/hash/normalize.ts`'s classifier and consumed by every op: a file whose
  bytes are not valid UTF-8, or whose first 8 KB contain a NUL, is **binary** —
  copied verbatim, compared raw, and **excluded from `substitute`,
  `rewrite-path` and `generate`**. Phase-2 output is UTF-8 only and never emits
  a BOM.
  *Depends on: T-0601. Consumed by T-0504–T-0506, T-1002.*

- [ ] **T-0508** `[Implementer]` The executable-bit rules, over the **write set**
  and not over `to`: `"executable": true` writes `0755` and everything else
  `0644`; `pack.json`'s `executableRoots` prefixes are each subject to the
  stage-1 grammar and the stage-2 denylist; a bit outside every declared root
  is `E-EXEC-ROOT-UNDECLARED`; a declared root **or an applied path carrying the
  bit** with any segment equal to `.claude`, `.git`, `.hg` or `.svn`, or under
  `.harness/` as a first segment, is `E-EXEC-DEST-FORBIDDEN` — **checked at
  declaration and again per applied path**, so a directory recursion cannot
  reach a forbidden destination the root did not name; and more than **32**
  executables in one apply is `E-EXEC-TOO-MANY`. C-12, C-33, C-39b.
  **This apparatus has a real consumer** (Q-54's one addition): `coding`
  declares `executableRoots: ["infrastructure/backend-deploy/"]` and each
  backend scaffold sets the bit on four scripts — so a backend combination
  produces **four** `0755` applied paths and **four real disclosure lines**,
  and the base combination produces none.
  *Depends on: T-0203, T-0404, T-0501, T-0503.*

### Verification

- [ ] **T-0509** `[TestWriter]` Per-primitive acceptance tests in
  `tests/integration/primitives.test.ts` — US-3 for the three placing ops,
  US-4 for the two editing ops (including the escape's single-pass property:
  `{{harness:lit:lit:x}}` renders `{{harness:lit:x}}` and nothing further), and
  US-32 for `generate`'s three anchor failure modes.
  *Runs in parallel with T-0501–T-0506 against the ADR's public interface contract.*

- [ ] **T-0510** `[TestWriter]` Tests for the cross-cutting content rules in
  `tests/integration/text-binary.test.ts` and
  `tests/integration/executable-bit.test.ts`: a binary payload file excluded
  from all three content ops and copied byte-identically; the executable cap,
  the undeclared-root refusal and the forbidden-destination refusal at a
  **nested** `.claude` segment.
  *Depends on: T-0507, T-0508.*

---

## E-06 — The payload — phase 1, hashing and `payloadDigest`

Phase 1 is a verbatim copy of the pack directory to `.harness/pack/`,
**identical for every pack**, reading no field of `pack.json` but the pack's
location. This epic ships that copy, the one normalizer, the one tree digest
and `payloadDigest` — the single hash that lets `verify` say **which side
moved**.

**Depends on:** E-02 (T-0206, T-0208), E-03 (T-0305).
**Unlocks:** E-07 (`payloadDigest` is a manifest key), E-10 (the fail-closed
gate), E-11 (phase 1 is journalled exactly as phase 2 is).

- [ ] **T-0601** `[Implementer]` `src/hash/normalize.ts` — `normalizeText()`:
  strip a leading UTF-8 BOM, then replace every `\r\n` and every lone `\r`
  with `\n`. **Nothing else** — trailing whitespace, blank lines and a final
  newline are all significant (Q-26).
  *Depends on: T-0101. Prerequisite for T-0507, T-0603, T-1002.*

- [ ] **T-0602** `[Implementer]` `src/hash/sha256.ts` — `hashText`, `hashBytes`,
  64 lowercase hex, no truncation and no salt, on `node:crypto` with no
  dependency. Used in exactly four places at v1.0 (§NFR).
  *Depends on: T-0101.*

- [ ] **T-0603** `[Implementer]` `src/hash/digest.ts` — `treeDigest()`:
  path-prefixed, `\n`-joined, **byte-ascending**, returning `sha256-<hex>`.
  **One call site at v1.0.**
  *Depends on: T-0601, T-0602.*

- [ ] **T-0604** `[Implementer]` `src/payload/digest.ts` — `payloadDigest()` over
  the payload file set, per-file hash **normalized for text and raw for
  binary**. Normalization here is load-bearing and its cost is stated rather
  than hidden: a raw digest makes every Windows clone with `core.autocrlf`
  report a tampered payload, and the price is that a **pure line-ending edit of
  the payload is undetectable**. It covers `recipe.json` too, because the recipe
  lives in the payload. Q-52.
  *Depends on: T-0603, T-0507.*

- [ ] **T-0605** `[Implementer]` `src/payload/copy-payload.ts` — the verbatim
  copy: raw bytes in, raw bytes out; **no BOM handling, no EOL change, no
  suffix stripping, no filtering by scaffold selection, no payload file
  skipped**. Every file is written **`0644`** and every created directory
  `0755`, **reading no source mode** — **SEC (C-26):** mode preservation would
  make phase 1 carry a permission decision derived from the authoring machine's
  umask, and a `0755` payload file would otherwise land under `.harness/` with
  no root, no cap, no disclosure and no diagnostic, invisible to a
  content-only digest. Validates only paths and bounds:
  `E-PAYLOAD-PATH-INVALID`, `E-SYMLINK-IN-PACK`, `E-CONTENT-TOO-LARGE` (4 MB),
  `E-PAYLOAD-TOO-LARGE` (32 MB), `E-TRAVERSAL-LIMIT`. Destinations carry
  `HarnessPath`. The digest is computed over the **planned** payload set, so it
  is known before the first byte is written.
  *Depends on: T-0206, T-0208, T-0604, T-0305.*

### Verification

- [ ] **T-0606** `[TestWriter]` Acceptance tests for US-30 and the digest half of
  US-10 in `tests/integration/payload.test.ts`: raw-byte equality of every file
  on both sides with **no normalization on either side**; a `0755` pack file
  landing `0644` in the payload while its applied copy carries what its step
  declared; the digest **unchanged** when every payload file is rewritten to
  CRLF and **changed** when one payload character changes; and the planner
  producing the manifest, digest included, **with the filesystem mounted
  read-only**.
  *Runs in parallel with T-0601–T-0605. The read-only-filesystem case depends on T-1105.*

---

## E-07 — The manifest — six keys, canonical bytes, read-back validation

`.harness/manifest.json` is written, re-read and re-validated. Six keys,
byte-identical re-serialization, and no self-integrity field — that absence
is by design and is exactly why answers are re-validated on **every**
read-back.

**Depends on:** E-03 (T-0301, T-0308), E-06 (T-0604).
**Unlocks:** E-10 (`verify` reads it), E-11 (the manifest write is the last
write of an apply).

- [ ] **T-0701** `[Implementer]` `src/manifest/types.ts` — `PackManifest`, **six
  keys**: `manifestVersion`, `cli`, `pack`, `payloadDigest`, `parameters`,
  `scaffolds`, plus `unknownKeys` for forward compatibility (not a seventh
  declared key). **No `files[]`, no `regions`, no `ownedKeys` record, no
  `shared[]`, no `pack.integrity`, no `appliedAt`, no manifest self-hash** —
  each was carried for a consumer v1.0 does not have (Q-43, Q-54).
  `payloadDigest` is serialized **top-level, between `pack` and `parameters`**,
  never nested inside `pack`.
  *Depends on: T-0302.*

- [ ] **T-0702** `[Implementer]` `src/manifest/canonical-json.ts` —
  `canonicalJson()`: fixed key order, 2-space indent, `\n` endings,
  `parameters` in declared parameter order, `scaffolds` in declared order.
  Re-serializing an unchanged manifest must be **byte-identical**.
  *Depends on: T-0701.*

- [ ] **T-0703** `[Implementer]` `src/manifest/write.ts` — `writeManifest()`:
  atomic write through `HarnessPath`, byte-identical output.
  *Depends on: T-0702, T-0206.*

- [ ] **T-0704** `[Implementer]` `src/manifest/read.ts` — `readManifest()`:
  strict parse (`E-JSON-DUPLICATE-KEY`, **not** `E-MANIFEST-CORRUPT` — one
  fault, one code, wherever it occurs), the `manifestVersion` gate
  (`E-MANIFEST-NEWER`, exit 2, **never a warning**), unknown-key capture
  preserved verbatim on rewrite, the required-key check including a
  `payloadDigest` matching `sha256-<64 lowercase hex>` (**there is no
  "digest absent, so skip the check" branch, and its absence is the point**),
  `E-MANIFEST-MISSING`, `E-MANIFEST-CORRUPT`, `W-MANIFEST-NEWER-CLI` and
  `W-PACK-NEWER-THAN-CLI`, and **answer re-validation on every read** →
  `E-MANIFEST-ANSWER-INVALID`, exit 2 (C-29).
  *Depends on: T-0301, T-0308, T-0701.*

### Verification

- [ ] **T-0705** `[TestWriter]` Acceptance tests for US-10 and US-15 in
  `tests/integration/manifest.test.ts`: the manifest's key order asserted
  directly with `payloadDigest` **fourth** and `pack.payloadDigest` absent; two
  applies producing byte-identical manifests; and one case per US-15 row —
  missing, missing-with-payload-present, corrupt, duplicate key, missing
  digest, malformed digest, newer version, newer CLI, newer pack, and a
  hand-edited answer outside its own `pattern` reaching
  `E-MANIFEST-ANSWER-INVALID` with **no per-path report**.
  *Runs in parallel with T-0701–T-0704 against the ADR's public interface contract.*

---

## E-08 — The permission surface and the security disclosure

Two things a pack places that are not inert: frontmatter under a `.claude`
segment, and a substituted answer landing in content an agent reads. This
epic refuses the first and **enumerates** the second, and builds the one
`SecurityDisclosure` that `pack info`, `validate --json` and `init`'s
pre-write summary all render — so the three surfaces cannot disagree.

**Depends on:** E-04 (T-0404), E-05 (T-0505, T-0508), E-06 (T-0605).
**Unlocks:** E-09 steps 3 and 11 and the `pack info` disclosure section;
E-11's pre-write summary (F2 renders it).

> **Not in the ADR's file-level plan.** `E-CLAUDE-TOOL-GRANT` (C-32a),
> its phase-1 quantifier (C-39c), `E-CLAUDE-PERMISSION-MODE` (C-40) and the
> total-enumeration disclosure row (C-43) all postdate the ADR. F1 v2.9
> US-3, US-13, US-29 and US-30 are the contract for this epic.

- [ ] **T-0801** `[Implementer]` `src/security/claude-frontmatter.ts` — read a
  Markdown file's frontmatter block. It must **report a line**, **fail closed
  on an unparsed block**, and reproduce the block **verbatim** for the
  disclosure (no re-serialise), and it must be narrow enough to audit: a full
  YAML engine is a large surface admitted into the gate-computing process.
  **✅ UNBLOCKED (U-6, closed by Q-81): hand-rolled, in
  `src/claude/frontmatter.ts`** — its own module in the ADR's amended file
  plan, because **three** codes ride on it (`E-CLAUDE-TOOL-GRANT`,
  `E-CLAUDE-PERMISSION-MODE`) plus US-13's disclosure row 4. It must
  report a **line number**, fail **closed** on an unparsed block, and
  reproduce the block **verbatim** for the disclosure — never
  re-serialise, since the disclosure's whole value is showing what is
  actually there.
  *Depends on: T-0105. Prerequisite for T-0802, T-0803, T-0804.*

- [ ] **T-0802** `[Implementer]` The **pinned constant** in
  `src/security/claude-frontmatter.ts`: **grant keys** (`allowed-tools` and its
  documented spellings), **mode keys** (`permissionMode` and its spellings) and
  **the non-widening mode value set** at the pinned runtime version, with the
  runtime version the pin was taken against recorded beside it. The rule is
  stated as a **property** — *a pack-written file under `.claude/` may not
  declare a permission decision* — and the constant is how that property is
  expressed against a contract this project does not own. The key half fails
  **open** if it goes stale; the value half fails **closed**, which is why a
  value pin is acceptable where a tool allowlist was not. C-40.
  *Depends on: T-0801.*

- [ ] **T-0803** `[Implementer]` The gate, over **two disjoint quantifiers**
  (C-39c): the **write set**, on **rendered** content, at US-16 step 11 — a
  later `substitute` or `rewrite-path` can introduce or complete the key, so
  checking payload sources would be checking the wrong bytes; and the
  **phase-1 payload set**, on **payload bytes**, at US-16 step 3 — phase 1
  transforms nothing and skips no file, so a `.claude/` subtree a pack merely
  *ships* lands live inside the committed project at `.harness/pack/.claude/`.
  **These are two sets, not one widened set** — a phase-1 destination is a
  `HarnessPath` and widening the write set to cover it would break the brand
  separation C-14 rests on and deadlock the denylist against the payload
  copier. A **grant key** anywhere under a `.claude` segment is
  `E-CLAUDE-TOOL-GRANT`; a **mode key on a non-agent file** is
  `E-CLAUDE-TOOL-GRANT` too; a mode key on an **agent** file is permitted
  **iff** its value is on the pinned non-widening set, and a widening **or
  unrecognised** value is `E-CLAUDE-PERMISSION-MODE`. Both exit 2, zero bytes.
  Matched by `collisionKey` on **any** `.claude` segment. C-32a, C-39c, C-40.
  *Depends on: T-0802, T-0404, T-0605.*

- [ ] **T-0804** `[Implementer]` `src/security/consent.ts` — the
  `SecurityDisclosure` builder and `renderDisclosure()`, **built once by the
  pure planner** and rendered by three surfaces. Four rows, and the row list is
  US-13's table:
  every `0755` applied path with its payload source; every file shipped under a
  `hooks/` directory in **any** `.claude` tree, each stated plainly as inert;
  **every applied path at which a parameter answer was substituted**, with the
  parameter id and the value **verbatim, never summarised, never truncated,
  never counted** — a **total enumeration with no classifier** (C-43: the
  three-clause classifier missed two of `coding`'s five paths and is deleted,
  not repaired a third time); and every pack-shipped `.claude/agents/*.md` with
  its **whole frontmatter block verbatim**, over the union of the write set and
  the phase-1 payload set (C-32b, C-39c, C-40 — printing `tools:` alone
  reproduced the same inversion one key over).
  **The gate is deleted with its subject** (Q-54): the module keeps
  `renderDisclosure()` and the builder, and **has no `requiresConsent`, no
  `ConsentInputs`, no `--accept-permissions`, no
  `E-SETTINGS-CONSENT-REQUIRED` and no settings row**. The ADR's contract
  declares all six; do not compile against them. **The disclosure enumerates
  and never gates**, which is now true of the whole of it — gating would fire a
  prompt on every apply of all three v1.0 packs, which trains a user to accept
  without reading (C-28's argument, C-12's shape).
  *Depends on: T-0505, T-0508, T-0801, T-0407.*

### Verification

- [ ] **T-0805** `[TestWriter]` Structural and unit tests in
  `tests/integration/disclosure.test.ts`: the **single-builder** property
  asserted structurally — `pack info`, `validate --json` and the pre-write
  summary all call one builder and no surface computes a row of its own; and
  one case per gate outcome from US-16's fixture rows for
  `E-CLAUDE-TOOL-GRANT` and `E-CLAUDE-PERMISSION-MODE`, including the two
  quantifiers and the wrong-file-kind case. The two **positive** assertions
  over the real `coding` pack are T-1216 and T-1217, because they cannot be
  written without it.
  *Depends on: T-0803, T-0804.*


- [ ] **T-0806** `[Implementer]` **The disclosure nonce and its
  containment check** (C-49, C-59, **the CRITICAL**). Generate a **per-run
  nonce** — ≥ 64 bits from `node:crypto`, lowercase hex — emit it on both
  delimiter lines, and refuse any row containing it:
  `E-DISCLOSURE-FORGERY`, exit 2, **zero bytes**. `validate` runs the same
  refusal at **step 11** over the rendered set. **No fifteenth validate
  step.**
  **Refuse the delimiter *shape* too** (C-61), any nonce value, not only
  this run's — otherwise the check is probabilistically unfireable and
  will rot untested, and a consumer that pattern-matches rather than
  matching the exact nonce is still truncatable. **Scope the nonce to
  `init`'s block** (C-62): `pack info` renders the same rows inside a
  `PackReport` and **must stay deterministic**, `--json` included.
  **Do not implement a string-matching rule against a fixed marker, and
  read why before deciding otherwise.** Three security rounds tried: exact match, beaten
  by a trailing space; trim-and-fold, beaten by a non-breaking space
  because `String.prototype.trim()` removes Unicode whitespace and the
  rule said ASCII. **The emitter cannot enumerate every way a reader might
  call two strings the same.** The nonce changes the property from *"our
  matching dominates every consumer's"* — unfalsifiable — to *"a pack
  cannot predict a random value"*.
  **Read the reasoning before implementing, because the check looks
  paranoid and is not.** US-13 prints whole agent frontmatter blocks
  **verbatim and multi-line**, so a pack shipping a frontmatter line
  reading `--- lintel disclosure end ---` truncates the block for any
  consumer that reads to the marker — the user's eye, and F6 under IM-10.
  Everything after is invisible: `0755` paths, later tool grants,
  substituted values. **The truncated block stays well-formed and
  shorter, and nothing looks wrong.** This is **C-9's marker-lex check,
  restored** — Q-45 removed it as unnecessary while anchors were inert,
  and recorded the obligation to bring it back when something started
  reading markers.
  *Depends on: T-0114, T-0804. Prerequisite for F2 T-2102.*
---

## E-09 — `validate` and `pack info` — the fourteen-step runner and one report

The pack is checkable in CI against the pack alone — no project, no
filesystem beyond the pack, no network. `validate` and `pack info` render
from the **same** `PackReport`, so the two surfaces cannot disagree. This is
the high-value half of the security model: every authoring-time rule in the
product is enforced here.

**Depends on:** E-03, E-04, E-05, E-06, E-08.
**Unlocks:** E-12 (the fixture suite is `validate` run over fixture packs).

- [ ] **T-0901** `[Implementer]` `src/validate/validate-pack.ts` — the
  **fourteen-step ordered check runner** of US-16 → `PackReport`, in the fixed
  order, which **is part of the contract**: a pack fails on the earliest and
  most explicable cause. **The write set is computed exactly once, immediately
  after step 5, and steps 6, 7 and 8 all read that one set.** Stage 3 of
  confinement is deliberately **not** in the list — `validate` has no project
  root. Do not copy the step list into this module; it is US-16's, cited by
  four other documents, and a second copy is a second thing to keep true.
  Emits `ok`, and **every finding carries its `class`** (Q-60).
  *Depends on: T-0303, T-0307, T-0402, T-0404, T-0406, T-0508, T-0803.*

- [ ] **T-0902** `[Implementer]` `src/validate/combinations.ts` — the
  per-parameter-combination render (step 11), the **32** cap
  (`E-PARAM-COMBINATORICS`), and `parameterVaryingSteps` — the steps whose
  inclusion depends on an answer and the applied paths each would write, which
  is how a reader sees what `--calibration high-floor` changes without running
  it.
  *Depends on: T-0308, T-0405, T-0505.*

- [ ] **T-0903** `[Implementer]` `src/validate/folder-readmes.ts` — step 12
  (Q-50). **Per combination separately**: take the **proper** directory
  prefixes of every applied path the combination writes, remove the project
  root and every prefix at or under `.claude/` or `.harness/`, and require the
  **same combination** to write `d/<folderReadme>` for each surviving `d`.
  `W-FOLDER-README-MISSING`, **`defect`** class, one diagnostic per directory
  per combination. Pure; needs no project. **A warning and not an error,
  deliberately** — `validate` cannot tell a directory this apply *creates* from
  one that already exists, so the check over-approximates by construction, and
  an over-approximating check must not be fatal by code; `--strict` gives it
  teeth in the one place the over-approximation is known empty. It does **not**
  read what the README says and does not run at apply time.
  *Depends on: T-0902.*

- [ ] **T-0904** `[Implementer]` `src/validate/link-integrity.ts` — step 13.
  Every relative Markdown link and inline path reference in **rendered** output
  pointing inside the project must resolve either to a file the recipe produces
  **or to a path under `.harness/pack/` that exists in the payload** — the
  second half is load-bearing, because under Q-41 applied documents legitimately
  point *into* the payload and a payload-blind check would flag every correct
  reference. `W-LINK-DANGLING`, `defect` class, listing file, line and target.
  *Depends on: T-0902, T-0605.*

- [ ] **T-0905** `[Implementer]` `src/cli/commands/validate.ts` —
  `lintel harness validate <pack> | --all` with `--strict` and `--json`.
  Exit rules: `0` with no findings; `0` with **`notice`**-class findings only
  **under every flag, `--strict` included**; `1` with `defect`-class warnings
  **and only under `--strict`**; `2` with any error. `--json` emits the
  `PackReport` with each finding carrying `class` valued exactly `"defect"` or
  `"notice"`, so CI counts promotable findings without keeping a code list of
  its own. **There is no `--allow-stale-shared` and no flag anywhere in this
  CLI that downgrades an integrity check** (IM-41; C-10 collapsed into that
  stronger form).
  *Depends on: T-0107, T-0901.*

- [ ] **T-0906** `[Implementer]` `src/cli/commands/pack-info.ts` and
  `renderPackInfo(report)` — `lintel harness pack info <name>` over the **same**
  `PackReport` `validate --json` emits, so there is exactly one report code
  path. Renders identity, all nine anatomy parts in fixed order with notes and
  reasons, scaffolds grouped by category and **labelled as alternatives**,
  parameters with any `flag` alias and an enum's permitted values, **every
  recipe step in order as `<op>  <from> → <to>` with conditional steps marked
  by their `when`**, `parameterVaryingSteps`, and the security disclosure **in
  full and verbatim**. Where a list is empty the command **says so** rather
  than printing nothing. It renders **no settings section and no consent
  prompt**. `--json` emits the `PackReport` verbatim. The complete step list is
  what a closed primitive set buys the reader, and it is why
  `E-RECIPE-TOO-MANY-STEPS` exists (C-30).
  *Depends on: T-0107, T-0901, T-0804.*

### Verification

- [ ] **T-0907** `[TestWriter]` Acceptance tests for US-16's exit contract in
  `tests/integration/validate-exit.test.ts`: a clean pack, a pack whose only
  findings are notices, and a pack with one defect, **each run with and without
  `--strict`** — six assertions, and the notice pack must exit `0` under
  `--strict`.
  *Runs in parallel with T-0901–T-0905 against the ADR's public interface contract.*

- [ ] **T-0908** `[TestWriter]` Acceptance tests for US-29 in
  `tests/integration/pack-info.test.ts`: the nine-row anatomy in fixed order,
  same-category scaffolds labelled as alternatives, the rendered step plan, the
  empty-list-says-so rule, `--json` emitting the report verbatim, and identical
  `PackReport` bytes from `validate --json` and `pack info --json` for the same
  pack.
  *Depends on: T-0906.*

---

## E-10 — `verify` — recomputation, the digest gate and six states

`verify` reads `.harness/manifest.json` and `.harness/pack/`, re-runs phase 2
**entirely in memory**, and compares to disk. It **writes nothing, ever** —
no lock, no journal, no network — and does not need the CLI that performed
the apply to still be installed. This is what makes "applied correctly" a
checked fact rather than a claim.

**Depends on:** E-05, E-06, E-07, E-04 (T-0407 for the adapt-expected set).
**Unlocks:** S7's acceptance test (T-1218). **Note: `.harness/pack/` does not
exist in this repo, so S7 is unmet; F1 is a precondition for closing it, not
the thing that closes it.**

- [ ] **T-1001** `[Implementer]` `src/verify/verify.ts` — `verifyProject()`:
  **check `payloadDigest` first and fail-closed** — on mismatch,
  `E-PAYLOAD-DIGEST-MISMATCH`, exit 2, reporting recorded and computed digests,
  and **the tree comparison is suppressed entirely, `entries` empty, zero
  per-path rows**. That is not a convenience: the expectation is computed
  *from* the payload, so an untrusted payload makes the recomputation
  meaningless. Then re-validate every recorded answer against its declared
  `pattern`/`maxLength`/`values` — `E-MANIFEST-ANSWER-INVALID`, exit 2,
  comparison **also suppressed**. Then recompute from **only**
  `.harness/pack/`, the manifest's `parameters` and its `scaffolds`. The
  project scan is `src/fs/walk.ts` and does not descend into `.git/`, `.hg/`,
  `.svn/` or `node_modules/`. Files the recipe does not produce are **not**
  reported. Q-52, C-29.
  *Depends on: T-0208, T-0604, T-0704, T-0308, T-0405.*

- [ ] **T-1002** `[Implementer]` `src/verify/compare.ts` — **six** states per
  recomputed path, and the enumeration is **closed**: `match`, **`adapted`**,
  **`filled`**, **`unfilled`**, `differs`, `missing`. Normalized comparison for text and raw for binary, so a
  CRLF checkout and an added BOM both read `match`; the executable bit compared
  **where the platform represents it**, with `modeChecked: false` on Windows so
  the report says so rather than implying a check ran. A differing path is
  `adapted` **iff** it is in the adapt-expected set (T-0407); a path in the set
  that still matches byte for byte is `match`, **not** `adapted` — the state
  names what `verify` found, never what it was permitted to find. `adapted` is
  not a failure, is not counted toward `E-VERIFY-MISMATCH`, and does not move
  the exit code, and **a path outside the set behaves exactly as it did before
  the state existed** — there is no flag, no environment variable and no
  project-level or pack-level form of it. Q-56.
  **`filled` and `unfilled` (Q-79) invert that rule and the inversion is
  the thing to get right**: a path in the **fill-expected set** (T-0410)
  reports **`filled`** when it differs and **`unfilled`** when it matches
  byte for byte. Neither fails, neither counts toward
  `E-VERIFY-MISMATCH`, neither moves the exit code — but `unfilled` is
  the one state that reports *matching* as the finding, because a
  fill-expected path that still equals what shipped means the user has
  not filled in the template. **Implementing it the same way round as
  `adapted` would silently report every unfilled brief as `match`**,
  which is the defect Q-79 exists to fix. `unfilled` is class `notice`
  and `--strict` does **not** promote it.
  **Superseded from the ADR:** its `VerifyState` is
  `match | partial | differs | missing` with `ownedKeysChecked`, and C-22's
  narrowing is **deliberately not applied** because its premise —
  `merge-json`'s fourth input — is gone (Q-54, F-4). Build `adapted`, not
  `partial`.
  *Depends on: T-0407, T-0507, T-1001.*

- [ ] **T-1003** `[Implementer]` `src/cli/commands/verify.ts` —
  `lintel harness verify [--json]`. Exit `0` when every path is `match` or
  `adapted`, printing the count checked **and, separately, the count reported
  `adapted`**; exit `1` on any `differs` or `missing` with
  `E-VERIFY-MISMATCH`, listing the first ten and the total, **`adapted`
  neither listed nor counted**. `--json` carries the digest result explicitly —
  recorded, computed and whether they matched — alongside per-path entries each
  carrying `state`, and counts **per state**. `state` and `class` are different
  axes and both are emitted.
  *Depends on: T-0107, T-1002.*

### Verification

- [ ] **T-1004** `[TestWriter]` Acceptance tests for US-33 in
  `tests/integration/verify.test.ts`: one payload byte changed → exit 2, the
  digest code and **zero** per-path rows; a hand-edited manifest answer → exit
  2 and no per-path report; and the two-halves test in one run — edit the
  generated `CLAUDE.md` **and** one other applied file, then require exit `1`,
  `E-VERIFY-MISMATCH` counting **one** path, `CLAUDE.md` reported `adapted`,
  and the other reported `differs`. Plus a `--json` run with one adapted path
  emitting exit `0`, one `"state": "adapted"` entry and **no** `"differs"`
  entry.
  *Depends on: T-1003. The `CLAUDE.md` cases need a real pack — see T-1218.*


- [ ] **T-1005** `[TestWriter]` Acceptance tests for the fill-expected states
  in `tests/integration/verify-fill.test.ts`, and this is the test that makes
  **S7 reachable**: apply a pack, fill `project-brief.md` with arbitrary
  content, and require **exit 0** with that path reported **`filled`**.
  Then a second run with the brief untouched, requiring exit 0 and
  **`unfilled`** — *not* `match`, which is the assertion that catches the
  inversion being implemented the same way round as `adapted`. Then a
  `--strict` run over the same project, requiring `unfilled` **not** to be
  promoted and the exit to stay 0. Through F1 v2.9 the first of these three
  was impossible: a filled brief reported `differs` and `verify` exited 1, so
  the S7 gate passed only on a project nobody had finished setting up.
  *Depends on: T-1003, T-0410. Needs a real pack — see T-1218.*
---

## E-11 — The write path F2 and F3 drive — journal, lock, plan, execute, rollback

F1 builds the writer; **F2 drives it from `init`** and F3 from `update`.
Everything is planned before anything is written, both phases; the executor
reads **nothing** from disk on the input side; a crashed apply is always
detectable and reversible. US-13 is F1's story even though the command that
raises it is not.

**Depends on:** E-02, E-05, E-06, E-07, E-08.
**Unlocks:** F2's `init` and F3's `update` — neither has a spec yet, and
neither is in scope here.

### The primitives of writing

- [ ] **T-1101** `[Implementer]` `src/fs/atomic-write.ts` — temp-then-rename,
  mode bits, created-directory tracking, and **exclusive-create semantics**:
  the temp file opened `wx`; a destination the plan expects to be **new**
  claimed by `link(tmp, dest)` then `unlink(tmp)`, which fails `EEXIST` if the
  destination appeared in the window — the semantic `rename` does not give.
  Where `link` is unavailable (`EPERM`/`ENOSYS`), fall back to
  `open(dest,'wx')` then `rename`, and **record the narrowed guarantee in the
  run's diagnostics** rather than claiming the stronger one. `E-TARGET-RACE` on
  any confirmation failing. Takes `WritablePath`, never `string`. C-14.
  **✅ RESOLVED (U-11), and the code now exists: `W-LINK-FALLBACK`**,
  class **`notice`** — the CLI reports a narrowed guarantee it could not
  avoid, and no pack or user change would clear it. Allocated in F1 v3.0,
  which closes a gap US-13 had carried since v2.0: the requirement to
  "record the narrowed guarantee" was assertable only by string-matching
  a message, the one thing §Error States forbids. Emit the code; do not
  invent one
  here; report it to the spec owner.
  *Depends on: T-0205, T-0207.*

- [ ] **T-1102** `[Implementer]` `src/fs/journal.ts` — `.harness/journal.json`
  **version 2** plus `.harness/journal.d/`. Per intended path: the hash this
  apply intends to write, `preExisting`, `preHash`, `preMode`, and a `backup`
  path holding the pre-apply bytes, written **before** the overwrite and
  present exactly when `preExisting && preHash !== sha256`. Records created
  directories in creation order. **Covers phase 1 exactly as phase 2** — the
  payload copy is journalled identically. A journal declaring any other
  `version` is `E-JOURNAL-UNREADABLE`, exit 2, never guessed; version 1 never
  shipped and this check exists so that it never can. C-13.
  *Depends on: T-0206, T-0602.*

- [ ] **T-1103** `[Implementer]` `src/fs/lock.ts` — advisory `.harness/lock`
  holding `{pid, host, startedAt, cli}`, acquired by exclusive create.
  `E-LOCK-HELD`, exit 1, otherwise. Broken **only** when all three hold: the
  recorded host is this host, the recorded pid is not alive, and `startedAt` is
  older than 60 s — reported as `W-LOCK-STALE-BROKEN`, `notice` class. `verify`
  takes no lock.
  *Depends on: T-0206.*

### Plan and execute

- [ ] **T-1104** `[Implementer]` `src/apply/plan-phase2.ts` — render **every**
  phase-2 step at **plan** time from planner-held payload bytes into
  `PlannedFile.bytes`. **SEC (C-23): `execute.ts` reads no payload file — no
  template read, no re-render, no re-glob.** Named as its own module so that
  "the executor re-reads the payload" is a change someone has to make on
  purpose. This removes a window rather than an optimisation: an execute-time
  read lets content change between steps, and that content would have passed no
  validation, appeared in no disclosure and been covered by no `payloadDigest`.
  *Depends on: T-0501–T-0506, T-0605.*

- [ ] **T-1105** `[Implementer]` `src/apply/plan.ts` — `planApply(inputs)`:
  `ApplyInputs` → `ApplyPlan`. **Pure** — it plans both phases, computes
  `payloadDigest` over the **planned** payload set, builds the manifest and the
  `SecurityDisclosure`, and **writes nothing, ever**. Every `PlannedFile`
  carries `path: WritablePath`, `bytes`, `phase`, `executable`, `preExisting`,
  `preHash` and `preMode`. `ApplyInputs` has **no `consent` field** — the ADR's
  contract declares one and Q-54 deletes it with the gate.
  *Depends on: T-0704, T-0804, T-1104.*

- [ ] **T-1106** `[Implementer]` `src/apply/execute.ts` — `executeApply()`: lock →
  journal → **phase 1** → **phase 2** → manifest → journal removal. **The only
  writer.** Re-confines immediately before each write (T-0205) and creates
  exclusively (T-1101); its only filesystem reads are destination-side safety
  checks. `E-WRITE-FAILED` is exit **3**. The manifest write is the **last**
  write of an apply, and the journal and `journal.d/` are removed only after it
  lands. **There is no consent gate and no gate call** (Q-54) — the ADR's
  pipeline names one; it does not exist.
  *Depends on: T-1101, T-1102, T-1103, T-1105.*

- [ ] **T-1107** `[Implementer]` `src/apply/rollback.ts` — the **five-case rule**
  of US-13, exhaustive, now covering phase-1 paths. Rollback **deletes only
  paths this apply created, restores only paths this apply overwrote, and acts
  on neither unless the on-disk bytes are still exactly what this apply
  wrote**. Created directories removed in **reverse** creation order and only
  when empty; then `.harness/` itself; then a report of every path it declined
  to touch and why (`W-ROLLBACK-KEPT`, `notice` class). C-13.
  *Depends on: T-1102, T-1106.*

### The collision rules

- [ ] **T-1108** `[Implementer]` `E-TARGET-EXISTS` and `--force` in
  `src/apply/plan.ts` and `src/apply/execute.ts`: init into a tree where any
  target applied path already exists fails, listing the first ten colliding
  paths and the total; `--force` proceeds **only** for paths whose existing
  content is byte-identical. **All three step-vs-existing-file comparisons —
  the existence test, the byte-identity test and the journal's `preExisting`
  determination — resolve by `collisionKey`, on every platform,
  unconditionally** (N-5). **This is a rollback-safety requirement, not
  tidiness:** under exact-string comparison a project holding
  `.claude/Settings.json` and a step writing `.claude/settings.json` are the
  same file on macOS and Windows, so the apply silently overwrites, the journal
  records `preExisting: false`, no backup is taken, and `--rollback` **deletes
  a user file it did not create** — the exact invariant C-13 and G-F1-6 both
  state.
  **And one step further (C-36): where a `--force` byte-identical collision
  matches by `collisionKey` but the on-disk basename differs, the write is
  skipped entirely** — nothing needs writing, and `rename(tmp, dest)` would
  replace the directory entry and silently rename the user's file — **the
  journal records the on-disk path**, and the run reports it as kept with
  **both spellings named**. This is the only case in the format where a planned
  applied path produces no write.
  *Depends on: T-0202, T-1102, T-1106.*

### Verification

- [ ] **T-1109** `[TestWriter]` Integration tests for US-13 and US-14 in
  `tests/integration/apply-atomicity.test.ts`: a failure at plan writing
  **nothing, not even `.harness/`**; a crash mid-write leaving a journal that
  the next command detects as `E-JOURNAL-PRESENT`; one case per row of the
  five-case rollback table; `E-ALREADY-APPLIED` preceding every other check and
  **not** overridable by `--force`; the three `collisionKey` cases of N-5; and
  the C-36 case asserted on the **on-disk directory-entry name**, for which
  there is no code.
  *Depends on: T-1106, T-1107, T-1108.*


- [ ] **T-1110** `[Implementer]` `src/fs/journal.ts` — **journal version 3**
  (Q-62). Two additions, each with a failure it prevents. **`intent: 'write'
  | 'delete'` per entry**, because `update` deletes payload orphans and the
  five-case rollback table models overwriting and creating but **not**
  deleting: a `delete` entry records `preExisting: true`, the pre-apply hash
  and mode, and a backup, carries **no** intended hash, and rollback restores
  it unconditionally. `init` writes `'write'` on every entry, so the field is
  uniform rather than optional. **`command: 'init' | 'update'` on the
  journal**, because `E-JOURNAL-PRESENT`'s remedy line is rendered from it —
  through v2.9 it said `init --rollback` unconditionally, which after a
  crashed `update` sends the user to a command that answers
  `E-ALREADY-APPLIED` and leaves the journal exactly where it was. **A
  remedy that cannot work is worse than none, because the user believes they
  tried it.** Any `version` other than `3` is `E-JOURNAL-UNREADABLE`, exit 2;
  there is no version-2 journal to be compatible with, since a journal lives
  only between the start and end of one run.
  *Depends on: T-1101. Prerequisite for F3's write path.*
---

## E-12 — The adversarial fixture suite and the bundled-pack acceptance gate

**The adversarial fixtures are a shipping requirement, not a nice-to-have**
(US-16). The reason is recorded rather than assumed: the settings-write
finding that triggered the amendment was reachable in **two recipe steps**
and survived a full rewrite plus two rounds of a disposition table that
declared the conditions satisfied. **A fixture would have caught it on the
first CI run; no amount of table-reading did, twice.** A condition whose only
evidence is a table row is a condition nobody has tested.

The second half of this epic is the **integration target**: the three
bundled packs on disk. Everything below the fixture harness **cannot be
tested without a real pack**, and is called out as such.

**Depends on:** E-09 (a fixture is `validate` run over a fixture pack), and
for the applying fixtures E-11.
**Unlocks:** the release gate, and S7's precondition.

### The harness

- [ ] **T-1201** `[Implementer]` `tests/fixtures/adversarial/` and its runner in
  `tests/fixtures/run-fixtures.ts` — each fixture a **minimal pack** with a
  declared expected outcome; CI asserts the **exact code and the exit class**,
  not merely non-zero, because a fixture that fails for the wrong reason has
  stopped testing what it was written for. Two fixtures assert on **file mode**
  and on the **on-disk directory-entry name** with no code involved, so the
  runner must expose both.
  **✅ UNBLOCKED (U-10, closed by Q-81): `node:test`.** US-16 calls this
  suite its most important criterion; nothing gates it now.
  *Depends on: T-0102, T-0905. Prerequisite for T-1202–T-1213.*

### The fixtures — one per row of US-16's table

> The authoritative list is **US-16's minimum-set table**, and it is
> deliberately not copied here. The tasks below group it by attack family so
> the work is assignable; **the count of record is the table's**, and
> US-3's standing obligation applies: *any amendment adding a destination
> rule, a closed enumeration or a fail-closed parse adds its fixture in the
> same change.*

- [ ] **T-1202** `[TestWriter]` Reserved-destination fixtures, **settings files
  by name**: a `copy` to `.claude/settings.json`; a `rename` to
  `.claude/Settings.json` (the `collisionKey` match); a `generate` to
  `.claude/settings.local.json`; and a `copy` to `docs/.claude/settings.json`
  (**C-39a** — under v2.4's two-exact-paths reservation this passed every
  stage, while §NFR's load-bearing claim depended on it failing).
  *Depends on: T-1201, T-0203.*

- [ ] **T-1203** `[TestWriter]` Reserved-destination fixtures, **by route rather
  than by name** — the property that a `to`-keyed rule cannot have: a `copy` of
  a directory whose recursion **produces** `.claude/settings.json`; a
  `strip-suffix` whose recursion **produces** `.github/workflows/x.yml`; and a
  `strip-suffix` whose recursion **produces** `sub/.claude/settings.local.json`.
  C-19, C-31, C-39a.
  *Depends on: T-1201, T-0404.*

- [ ] **T-1204** `[TestWriter]` Reserved-destination fixtures, **class 2 by
  basename**: `package.json`, `.envrc`, `.mcp.json`, and one `copy` fixture per
  remaining new class-2 basename — `.gitlab-ci.yml`, `Jenkinsfile`,
  `azure-pipelines.yml`, `bitbucket-pipelines.yml`, `GNUmakefile`, `.justfile`
  (**six**, C-41). `.mcp.json` is the evidence rather than a hypothetical: it
  sat outside the list through v2.4, one `copy` away, while the list's own
  category named exactly it.
  *Depends on: T-1201, T-0203.*

- [ ] **T-1205** `[TestWriter]` Reserved-destination fixtures, **the any-segment
  quantifier**: `.github/workflows/ci.yml` and `.vscode/tasks.json` at the
  root; `docs/.git/hooks/pre-commit` (**C-33** — under first-segment scoping
  this passed); `pkg/node_modules/.bin/foo` (**C-39d** — nested
  `node_modules/` is real under npm workspaces, and `verify`'s scan skips it at
  any depth, so the write was both permitted and invisible); and
  `x/.circleci/config.yml` and `x/.devcontainer/devcontainer.json`, **nested
  deliberately** so the fixture tests the quantifier as well as the membership
  (C-41).
  *Depends on: T-1201, T-0203.*

- [ ] **T-1206** `[TestWriter]` `.harness/` and written-set fixtures: a step whose
  `to` is `.harness/README.md` (**C-5 is absolute and has no carve-out, for a
  README or for anything else**); a `substitute` whose `in` glob is
  `[".claude/settings.json"]` and a `rewrite-path` whose `in` glob is
  `[".harness/pack/**"]`, both `E-RECIPE-STEP-INVALID` — nothing writes those
  paths, so they are not in the written-set, and the payload is not in it at
  all (C-27).
  *Depends on: T-1201, T-0404.*

- [ ] **T-1207** `[TestWriter]` Fail-closed parse and closed-enumeration
  fixtures: `"op": "copy "` with a trailing space; `pack.json` declaring
  `"name"` twice; `recipe.json` declaring `"formatVersion": 999`; and a recipe
  declaring **257** steps across base plus scaffolds. C-24, C-25, C-30.
  *Depends on: T-1201, T-0301, T-0402.*

- [ ] **T-1208** `[TestWriter]` Boolean-typing fixtures (**C-34**): a step
  declaring `"executable": "false"` and a parameter declaring
  `"notASecret": "no"`, each `E-UNKNOWN-VALUE`, exit 2, nothing written. Under
  v2.3 the first read as `true` and the second disabled the credential ban —
  two security gates failing **open** on a typo.
  *Depends on: T-1201, T-0303.*

- [ ] **T-1209** `[TestWriter]` Executable-bit fixtures: a `copy` to
  `.git/hooks/pre-commit` with `"executable": true`, which is **two
  independent faults**, `E-MAP-RESERVED-DEST` **and**
  `E-EXEC-DEST-FORBIDDEN`; and a `copy` to `docs/.claude/hooks/x.sh` with
  `"executable": true`, which is `E-EXEC-DEST-FORBIDDEN` and **not**
  `E-MAP-RESERVED-DEST` — shipping an inert file under `.claude/hooks/` is
  permitted, carrying `0755` there is not, and under v2.4's first-segment
  scoping this was refused by neither list (C-39b).
  *Depends on: T-1201, T-0508.*

- [ ] **T-1210** `[TestWriter]` Payload-integrity fixtures: a symlink in the pack
  (`E-SYMLINK-IN-PACK`); a `generate` whose `template` names nothing in the
  payload (`E-RECIPE-SOURCE-MISSING`, C-38); and a payload file shipped `0755`,
  which **applies cleanly** and whose `.harness/pack/` copy must be **`0644`** —
  asserted on the mode, since there is no code (C-26).
  *Depends on: T-1201, T-0605, T-0406.*

- [ ] **T-1211** `[TestWriter]` Permission-frontmatter fixtures (C-32a, C-39c,
  C-40): `.claude/commands/x.md` declaring `allowed-tools:`; the same file
  present **only in the payload**, named by no recipe step — the phase-1
  quantifier, which under v2.4 landed unchecked and undisclosed inside the
  committed project; `.claude/agents/x.md` declaring
  `permissionMode: bypassPermissions`; `.claude/agents/x.md` declaring
  `permissionMode: notAMode` — an **unrecognised** value failing closed; and
  `.claude/commands/x.md` declaring `permissionMode: readonly`, a
  *non-widening* value in the *wrong file kind*, which is what makes the
  file-kind half of the rule tested rather than assumed.
  *Depends on: T-1201, T-0803.*

- [ ] **T-1212** `[TestWriter]` The two fixtures that need a **target directory**
  (US-16, N-5, C-36): a target holding `.claude/Agents/README.md` applied by a
  pack writing `.claude/agents/README.md` → `E-TARGET-EXISTS`, exit 1, zero
  bytes; and **the same fixture re-run with `--force` and byte-identical
  content** → the write is **skipped**, the journal records
  `.claude/Agents/README.md`, and the directory entry is still named
  **`Agents`** afterwards — asserted on the on-disk name, since there is no
  code.
  *Depends on: T-1201, T-1108, T-1109.*

- [ ] **T-1213** `[TestWriter]` A **coverage** test in
  `tests/fixtures/coverage.test.ts` asserting that every row of US-16's
  minimum-set table has a fixture and every fixture maps to a row — so the
  obligation *"any amendment adding a rule adds its fixture in the same
  change"* is enforced mechanically rather than by discipline. This is the
  control that would have caught the finding US-16 records; it should not
  itself depend on someone reading a table.
  *Depends on: T-1202–T-1212.*

### What cannot be tested without a real pack

> Everything below runs against `packs/coding/`, `packs/planning/` and
> `packs/writing/` — which exist on disk with real `pack.json` and
> `recipe.json` files. **They are F5's content and F1 ships none of them**;
> `lintel harness validate --all` is what binds them. These are the tasks a
> synthetic fixture cannot stand in for.

- [ ] **T-1214** `[TestWriter]` The **CI gate**: `lintel harness validate --all
  --strict` exits **`0`** for all three bundled packs, and `--json` reports at
  least two findings **every one of them `"class": "notice"`** (Q-60 — that
  sentence is the point of the notice/defect split, and asserting the class as
  well as the exit code is what makes it testable). `--strict` and not bare
  `--all`, because every warning in the document is non-fatal by code and CI is
  the one place step 12's over-approximation is known empty.
  **✅ UNBLOCKED (U-13): GitHub Actions**, `runs-on` matrix over macOS,
  Linux and Windows. **The Windows leg is not optional** — the executable
  bit, `collisionKey`'s folding and CRLF normalization are exactly what
  differs there, and a green Linux-only run asserts almost nothing this
  project worries about. *(Superseded note: it must run
  this command **and** the fixture suite on the three platforms of G-F1-7.)
  *Depends on: T-0905, T-1201.*

- [ ] **T-1215** `[TestWriter]` A structural assertion over `packs/*/recipe.json`
  in `tests/integration/bundled-packs.test.ts`: exactly **three** steps with
  `"op": "generate"`, one per pack, each with `"to": "CLAUDE.md"`, each
  carrying `"adaptExpected": true`, with **6 / 6 / 7** declared anchor ids for
  `coding` / `writing` / `planning`, every id matching `^[a-z][a-z0-9-]{0,31}$`
  — nineteen anchors across three templates (US-32, Q-56, Q-61).
  *Depends on: T-0506, T-0407.*

- [ ] **T-1216** `[TestWriter]` **Positive assertion 1** — apply `coding` and
  require `agentInstructionSubstitutions` to name **exactly five** applied
  paths (`CLAUDE.md`, `AgentTeams/Specify.md`, `AgentTeams/Implement.md`,
  `specifications/README.md`, `specifications/project-brief.md`), each with its
  parameter id and the answer **verbatim**, **and `AgentTeams/README.md`
  asserted absent**. Assert on both the pre-write summary and `pack info`.
  **The count, the membership and the exclusion together** — that is the only
  shape that fails when the rule is wrong: the v2.3 test asserted `CLAUDE.md`
  alone and passed under a classifier that missed two paths; the v2.4 test
  asserted three and passed under one that missed two more (C-43).
  *Depends on: T-0804, T-0906, T-1106.*

- [ ] **T-1217** `[TestWriter]` **Positive assertion 2** — apply `coding` and
  require the disclosure to name **all ten** agents with their **whole
  frontmatter blocks verbatim**, including `Bash` on **two** of them
  (`implementer`, `testwriter`), `researcher`'s `WebSearch, WebFetch` — the
  only network capability any v1.0 pack ships — and `permissionMode: readonly`
  on `architect`, `reviewer` and `securityreviewer`; **and four** `0755`
  applied paths in a backend combination and **none** in the base combination.
  C-32b, C-38, C-40, C-45, C-12.
  *Depends on: T-0508, T-0804, T-1106.*

- [ ] **T-1218** `[TestWriter]` Determinism and the S7 precondition, in
  `tests/integration/determinism.test.ts` and
  `tests/integration/s7-reinit.test.ts`: two applies of the same pack version
  with identical answers and scaffolds into two empty directories producing
  **byte-identical trees and byte-identical manifests**, asserted by recursive
  byte-comparison **with no exclusions** (US-14); the C-23 test that
  distinguishes plan-time rendering from execute-time re-reading — **mutate
  `.harness/pack/<file>` after phase 1 and before phase 2 completes and require
  the applied output to be byte-identical to an unmutated run** (the older
  test, making the bundle unreadable between phases, passes under both readings
  and distinguishes nothing); and the cross-platform matrix of G-F1-7, modulo
  the executable bit on Windows.
  **S7 is not closed here.** `.harness/pack/` does not exist in this repo, so
  S7 is unmet; its acceptance test — *re-init this repo, run F6's skill, run
  `lintel harness verify`, require exit `0` and require the `CLAUDE.md` entry
  to read `"state": "adapted"`* — needs F2's `init` and F6's skill, neither of
  which exists. F1's work is a **precondition** for it, not the thing that
  closes it. Build the harness for it here; leave the assertion to the change
  that can run it.
  **✅ UNBLOCKED (U-13): GitHub Actions**, three-platform matrix.
  *Depends on: T-1104, T-1106, T-1003.*


- [x] **T-1219** `[TestWriter]` The **zero-dependency assertion** (Q-81),
  in `src/package.test.ts`: the published `package.json` declares **no
  runtime dependency** — `dependencies` **empty or absent**.
  **Not a literal `{}`, and that is the correction T-0101 produced:**
  `npm install` **normalises an empty `dependencies` object away**, so a
  test asserting the literal form fails on a correct package (F1 v3.8).
  The test also refuses a bundler in `devDependencies`, because U-12 chose
  `tsc` on the ground that the build must **type-check rather than
  strip**, and asserts `packs` ships while **`addons` does not**. **This
  is a requirement, not a preference** — the product's security argument is
  about what runs with the user's filesystem access, and a runtime dependency
  is code inside that boundary no pack rule governs. Pair it with the
  `collisionKey` narrowing test named in T-0202, so the two halves of Q-81 —
  what was refused and what was conceded — are both pinned.
  *Depends on: T-0101, T-0102, T-0202.*

- [ ] **T-1220** `[TestWriter]` **Four fixtures that stopped being redundant
  at Q-82.** Moving `coding`'s two backend scaffolds to `addons/` left
  `writing-workstream` as the **only** scaffold in the product, and all four
  v1.0 executables went with them — so this suite is now the **sole**
  coverage for rules a bundled pack used to exercise incidentally. Each
  fixture asserts an exact code and exit class: **(a) two-scaffold
  composition** — a pack declaring two scaffolds in *different* categories,
  both selected, asserting the merged step order is base-then-scaffolds in
  `pack.json`-declared order; **(b) same-category collision** — two
  scaffolds sharing a `category`, both selected, `E-SCAFFOLD-EXCLUSIVE`,
  exit 2, zero bytes; **(c) executable inside a declared root** — written
  `0755`, disclosed by US-13's pre-write disclosure, and reported by
  `verify`'s mode comparison with `modeChecked: true`; **(d) executable
  outside one** — `E-EXEC-DEST-FORBIDDEN`, exit 2.
  **(a) is the one to write first and the one most likely to be skipped.**
  (b), (c) and (d) are error paths, and error paths get written; (a) is
  ordinary success-path step-merging that no real apply performs any more,
  which makes it the path that can regress without anything going red.
  **Do not trim this suite on the grounds that no shipping pack needs it** —
  that is now true of all four, and it is the reason they exist.
  *Depends on: T-0307, T-0405, T-0504, T-1201. Q-82.*

- [ ] **T-1221** `[TestWriter]` Four fixtures for C-49, C-50, C-61 and
  C-62. **The two C-61 cases carry the whole point of round 4**: a pack
  shipping the delimiter with a **foreign** nonce must be refused (the
  check is shape-based, not value-based, and this is the case that keeps
  the code reachable at all), and `pack info --json` run twice must be
  **byte-identical** (the nonce is `init`'s alone). Then the original two: a pack
  whose agent frontmatter carries a sentinel line, requiring
  `E-DISCLOSURE-FORGERY` at **both** `validate` and `init` with zero
  bytes; and a pack whose parameter `prompt`, applied path and frontmatter
  each carry an ANSI escape, requiring every one to appear **escaped** in
  the disclosure, the prompt and the report. **Mark `src/verify/compare.ts`
  as security-relevant in this suite** (C-55): `verify` reports on its
  result and `update` **writes** on it, so a comparison defect is data
  loss, and `verify` is simultaneously S7's acceptance test — a divergence
  corrupts the gate that would have caught it. **Not over-coverage; do not
  trim.**
  *Depends on: T-0806, T-0113, T-1201.*
---

## Cross-epic notes

### The dependency spine

Three chains carry everything else, and they are the reason the epics are in
this order:

1. **Confinement first.** E-02 constructs `AppliedPath` and `HarnessPath`.
   Every writer takes a brand and never a `string`, so nothing that writes
   compiles until E-02 lands. `collisionKey` (T-0202) alone is depended on by
   the denylist, three collision codes, `E-TARGET-EXISTS`, `--force` and the
   journal's `preExisting` — and rollback safety rides on it.
2. **The write set second.** `stepWriteSet()` (T-0404) is the quantifier
   every destination rule is stated over. Two of the six primitives have **no
   `to`**, so a `to`-keyed rule has two silent exemptions — which is how the
   reserved-destination denylist and the old settings policy both lapsed
   (C-19). Nothing in E-05, E-08, E-09 or E-11 may re-derive a destination
   from `step.to`.
3. **The recomputation identity last.** `verify` (E-10) depends on E-05's ops
   producing *exactly* what E-11 writes, from the same in-memory bytes
   (C-23). If the two diverge, `verify` reports drift that is not there.

### Shared helpers introduced once and consumed widely

- `src/json/parse-strict.ts` (T-0301) — three call sites, and **only** three:
  `pack.json`, `recipe.json`, `.harness/manifest.json`. That totality is the
  rule, not an implementation detail.
- `src/recipe/glob.ts` (T-0306) — one matcher for `exclude`, `in` and anatomy
  `paths`, with **no filesystem handle**.
- `src/fs/walk.ts` (T-0208) — one bounded walk, **two** call sites: the
  phase-1 payload walk and the `verify` project scan.
- `src/hash/digest.ts` (T-0603) — one tree digest, **one** call site.
- `src/security/consent.ts` (T-0804) — one disclosure builder, **three**
  render surfaces, which is why they cannot disagree.
- `src/diag/catalogue.ts` (T-0104) — the only place user-facing CLI text
  exists, on all 87 codes.

### The error surface is one table

F1 §Error States is the product's **only** message catalogue and the only CLI
error model. No task in this document may add, rename or reinterpret a code,
and no module outside `src/diag/` may hold a message string. Two consequences
for implementers: severity is a property of the **code**, never of the
occasion — a scenario fatal in one context and tolerable in another gets two
codes (that is why `E-PARAM-INVALID` and `E-MANIFEST-ANSWER-INVALID` are
separate); and `class` (`defect | notice`) and `state`
(`match | adapted | differs | missing`) are **different axes** that are both
emitted in `--json`.

### Where the ADR and the spec disagree

The ADR is **PROCEED** and its file-level plan and interface contract are the
primary input for this breakdown. It was written against F1 **v2.1**; the
spec is **v2.9**. Its own *What Q-54 supersedes* box handles most of the
delta. These are the points an implementer will otherwise hit, and in every
case **the spec wins**:

| The ADR says | The spec (v2.9) says | Where |
|---|---|---|
| `RecipeStep` has **seven** arms including `merge-json`; the plan builds `src/recipe/ops/merge-json.ts` | **Six** arms. `merge-json` is `E-RECIPE-PRIMITIVE-UNKNOWN` with a "deferred to v1.1" remedy line | Q-54; US-31. **The ADR's own box says this.** |
| `src/security/destination-policy.ts`, `DestinationPolicy`, `ownedKeys`, `policyFor`, `checkOwnedKey`, `FORBIDDEN_AT_EVERY_DESTINATION` | **Not built.** The reserved-destination denylist survives and moves into `src/security/confine.ts` | Q-54; T-0203. **The ADR's own box says this.** |
| A consent gate, `ConsentInputs`, `--accept-permissions`, `SecurityDisclosure.settings`, `requiresConsent` | **No consent surface at v1.0.** `renderDisclosure()` and the builder survive; the gate, the field and the flags do not | Q-54; US-13; T-0804, T-1105, T-1106 |
| `VerifyState = match \| partial \| differs \| missing` with `ownedKeysChecked` (C-22) | `match \| **adapted** \| differs \| missing`. C-22's narrowing is **deliberately not applied** — its premise is gone | Q-54, Q-56, F-4; US-33; T-1002 |
| `src/cli/main.ts` dispatches over **four** commands, `init \| validate \| verify \| pack`, with no command group | **Five**, `init, update, validate, verify, pack`, all reached through the **`harness` group** with the command as the **second** positional. `update` is F3's | Q-62, Q-63; US-1, §Error States; `interaction-model.md` §11; T-0106 |
| Nothing about `adaptExpected` | A fifth optional field on every primitive, one of the **four** boolean-typed fields, with exactly one consumer (`verify`) and an empty-write-set error | Q-56; US-31, US-33; T-0401, T-0407, T-1002 |
| Nothing about `.claude/` frontmatter; `substitute` is *"context-aware: JSON-string-escapes into a `merge-json` target"* | Two codes (`E-CLAUDE-TOOL-GRANT`, `E-CLAUDE-PERMISSION-MODE`) over **two quantifiers**, needing a frontmatter reader the ADR's plan does not name. There is **no JSON destination and therefore no JSON escaping rule** | C-32a, C-39c, C-40, Q-54; US-3, US-30; **E-08** |
| `isAgentInstruction()` — a closed classifier behind `agentInstructionSubstitutions` | **The classifier is deleted** (it missed two of `coding`'s five paths). The row is a **total enumeration** of every applied path at which a token resolved | C-43; US-4; T-0505, T-0804 |
| `pack.json` has no `provenance`, no `folderReadme` in the ADR's prose (both are in its contract) | Both are declared keys with their own rules and codes | Q-50, Q-60; US-1; T-0302, T-0303, T-0903 |

**Nothing in the ADR's file-level plan resisted becoming a task** except the
three modules its own supersede box withdraws — `src/recipe/ops/merge-json.ts`,
`src/security/destination-policy.ts` and `src/security/consent.ts`'s gate —
which are not deferred but **subject-less**: the concepts they implement do
not exist at v1.0. `src/security/destination-policy.ts`'s surviving half, the
reserved-destination denylist, is T-0203. The plan's `packs/` row is F5's and
is not F1 work.

### One thing that is genuinely undecided, and is not a question here

**U-11 is an F1 spec defect, not a technology choice**, and it is reported
rather than fixed: US-13 requires the run's diagnostics to *"record the
narrowed guarantee"* when `link()` is unavailable and the writer falls back
to `open(dest,'wx')` + `rename`, while F1 declares its codes **the only** CLI
error model — and no `W-` code exists for it. As written the diagnostic is
assertable only by string-matching, which §Error States forbids consumers
from doing. It needs a classified `W-` code (a **notice**: the state is real
and nothing is fixable). T-1101 carries the note; the fix belongs to the spec
owner, in the change that adds the row to the only message catalogue.

Two adjacent gaps are already recorded in F1 §F1.9 as **known limits** and
are **accepted for v1.0** — do not invent behaviour for either: limit 15
(`AnatomyDecl.declaredBy` is a behaviour-selecting value outside US-1's
closed six, so `"declaredBy": "payload"` is unhandled; no security gate rides
on it — C-47) and limit 16 (no code exists for a first positional that is not
a known command **group**; it has a different list and a different remedy,
and it belongs to the change that answers Q-64).
