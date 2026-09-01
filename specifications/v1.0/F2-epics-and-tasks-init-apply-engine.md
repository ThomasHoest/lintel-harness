# Epics & Tasks: `harness init` (Lintel Harness v1.0 — Feature 2)
**Version:** 1.1
**Status:** Draft
**Date:** 2026-09-01
**References:** `F2-spec-init-apply-engine.md` (US-39…US-56) · `F2-ADR-003-init-apply-engine.md` (**PROCEED** — authoritative for the file plan, the resolution order and the interface contract) · `F1-spec-pack-format-and-manifest.md` **v3.3** (the engine, the 87-code catalogue, and the disclosure sentinels) · `F1-ADR-001` (amended) · `general/interaction-model.md` §11

**Amendment history**

| Version | Date | Summary |
|---|---|---|
| 1.0 | 2026-09-01 | Initial breakdown against `F2-ADR-003`. Claims **E-20…E-22** and **T-2001…T-2210**. |
| 1.1 | 2026-09-01 | **Mode A rounds 1–3.** The disclosure delimiters carry a **per-run nonce** (C-59), so T-2102 emits it and **T-2203 matches it as a pattern, not verbatim** — a test asserting the block byte-for-byte across two runs would now fail, correctly. F1's determinism guarantee covers applied trees and manifests, **not stdout**, so nothing G-F1-4 promises is weakened. |

---

## Read this before estimating anything

**F2 is deliberately small, and if it grows, something has gone wrong.**
`F2-ADR-003`'s central decision is that `init` adds **no engine code**: it
is argv → `ApplyInputs` → `planApply` → disclosure → `executeApply` →
summary. Every check, every transformation and every byte written belongs
to F1.

Three consequences for planning:

- **F2 owns four modules and no error code.** Every code `init` raises is
  F1's, and F1 v3.0 allocated the four this feature was missing. **A task
  below that seems to need a new code is a task that has misread the
  boundary** — take it back to F1.
- **F2 cannot start until F1's E-11 exists.** `planApply` and
  `executeApply` are the whole of what `init` does. Tasks say so.
- **The tests are where the work is.** Of the twenty-one tasks below,
  nine are `[TestWriter]`. That ratio is right for a feature whose
  production code is a shell over someone else's engine.

**Watch for boundary creep in review.** The failure mode this feature is
prone to is a command that grows a little resolution logic, then a little
validation, then a fallback — at which point F1's guarantees stop being
the whole story. If `init.ts` or `answers.ts` passes a few hundred lines,
something migrated out of the engine and should migrate back.

---

## Epic overview

| Epic | Title | Stories | Depends on |
|---|---|---|---|
| E-20 | Argv, answer resolution and the prompt | US-39…US-45 | F1 E-01, E-03 |
| E-21 | The run — plan, disclose, execute, summarise, roll back | US-46…US-52 | E-20, F1 E-11 |
| E-22 | Acceptance — the three stand-ups, the exit classes, the non-interactive path | US-53…US-56 | E-21, F1 E-12, F5 E-14 |

---

## E-20 — Argv, answer resolution and the prompt

The command's front half: turn a command line into `ApplyInputs`, with
every declared parameter resolved by one ordered function.

**Depends on:** F1 E-01 (diagnostics, flags), E-03 (parameter
declarations).
**Unlocks:** E-21.

- [ ] **T-2001** `[Implementer]` `src/cli/commands/init.ts` — the command
  skeleton and its argv shape: the `<pack>` positional, `--set` (repeatable),
  `--scaffold` (repeatable), `--force`, `--rollback`, and the pack-declared
  aliases resolved in argv pass 2 (F1 US-8). **`runInit` returns an exit
  code and never calls `process.exit`** — not a style preference: F2's
  acceptance tests assert exit classes *and* zero-bytes-written on the
  failure paths, and a command that exits the process can do neither
  in-process.
  *Depends on: F1 T-0107, T-0112.*

- [ ] **T-2002** `[Implementer]` `src/cli/answers.ts` — the six-step
  resolution order of `F2-ADR-003` §1, as **one pure function** over
  (declarations, options, prompt callback): `--set` → alias → prompt →
  default → empty value → `E-PARAM-UNANSWERABLE`. **Pure and
  prompt-injected**, which is the only reason the module exists: the order
  is where a precedence bug hides silently — a default quietly beating a
  `--set` — and injection is what makes it assertable with no terminal.
  Steps 1 and 2 are **one precedence level**; both given for one parameter
  with different values is `E-PARAM-INVALID` (F1 US-8).
  *Depends on: F1 T-0304, T-2001.*

- [ ] **T-2003** `[Implementer]` Q-65's split, inside `answers.ts`: a
  `string` or `boolean` parameter that is neither `required` nor defaulted
  and receives no answer **records the type's empty value** (`""`,
  `false`); an **`enum`** in the same position is
  **`E-PARAM-UNANSWERABLE`**, exit 1, zero bytes. **The asymmetry is the
  decision, not an oversight** — F1 US-8 forbids such a parameter from
  appearing in a `when` (`E-PARAM-UNDECIDABLE`), so it can only be a
  substitution parameter and empty text is defined behaviour the author
  chose; an `enum` has no empty value, and inventing one selects a branch
  nobody authorised.
  *Depends on: T-2002. ⚠️ Depends on F1 narrowing `E-PARAM-UNANSWERABLE`'s
  message per `F2-ADR-003` §5 — it currently reads as TTY-scoped, and the
  fault is enum-scoped and fires with or without a terminal.*

- [ ] **T-2004** `[Implementer]` `src/cli/prompt.ts` — `promptFor(decl)`
  over `node:readline/promises`. **Writes to stderr, never stdout.** Enum
  parameters render their `values` verbatim; booleans take y/n; strings are
  re-prompted on a `pattern` failure with the declaration's own message.
  **The only place in the product that reads a TTY.**
  *Depends on: T-2002.*

- [ ] **T-2005** `[Implementer]` The interactive gate: prompt **iff
  `stdin.isTTY && stderr.isTTY`**, with no flag and no environment
  variable. **Both streams, not just stdin** — prompts go to stderr, so a
  redirected stderr means the user cannot read the question they are being
  asked, and a prompt nobody can see is a hang. In `answers.ts` this is
  simply `prompt === null`.
  *Depends on: T-2004.*

- [ ] **T-2006** `[TestWriter]` `tests/unit/answers.test.ts` — the
  resolution order, exhaustively, with **no terminal**: each step wins over
  every step below it; `--set` and alias disagreeing is `E-PARAM-INVALID`;
  an unknown `--set` id is `E-SET-UNKNOWN-PARAM` **including for a
  parameter of an unselected scaffold** (the id exists; the user's mistake
  is selection, not naming); Q-65's three type cases. **This is the
  highest-value test file in the feature** — a precedence bug produces a
  valid manifest recording the wrong answer, which no other check catches.
  *Depends on: T-2003, T-2005.*

---

## E-21 — The run — plan, disclose, execute, summarise, roll back

**Depends on:** E-20, F1 E-11 (`plan.ts`, `execute.ts`, `rollback.ts`,
journal, lock).
**Unlocks:** E-22.

- [ ] **T-2101** `[Implementer]` The main path in `init.ts`: `ApplyInputs`
  → `planApply` → render the disclosure → `executeApply` → summary.
  **`init` does not re-validate the pack** — `planApply` runs the
  validation, and a second call would double every diagnostic and create a
  second place where US-16's fixed check order is decided.
  *Depends on: F1 T-1103, T-1104, T-2001.*

- [ ] **T-2102** `[Implementer]` Render the disclosure to **stderr, wrapped
  in F1 v3.6's two delimiter lines carrying a per-run nonce** —
  `--- lintel disclosure begin {nonce} ---` and
  `--- lintel disclosure end {nonce} ---` — with the rows in §US-13's
  order and **nothing else between them**. The nonce is ≥ 64 bits from
  `node:crypto`, generated **once per invocation**, identical on both
  lines, and refused if it appears in any row (T-0806). This is what makes **IM-10 meetable**: it has required
  a contiguous unmodified substring since it was written, and until F1
  v3.3 nothing fixed where the block started or stopped.
  *Depends on: F1 T-0804, T-2101.*

- [ ] **T-2103** `[Implementer]` `src/cli/summary.ts` — Q-69's summary on
  **stdout**: files written per phase, the applied pack and version, the
  selected scaffolds, and the three outstanding items of IM-14. **No path
  enumeration.** The disclosure already enumerated the security-relevant
  subset *before* the write, which is the enumeration that matters; a
  second complete list afterwards would be the largest thing on stdout and
  would compete with it for attention. `pack info` and `verify` serve a
  user who wants the full list.
  *Depends on: T-2101.*

- [ ] **T-2104** `[Implementer]` The stream split, asserted at the module
  boundary: prompts, progress and the disclosure to **stderr**; the summary
  to **stdout**. Not cosmetic — F6 captures the disclosure from stderr,
  and interleaving would make its capture position-dependent.
  *Depends on: T-2102, T-2103.*

- [ ] **T-2105** `[Implementer]` The `--rollback` branch: read the journal,
  call `rollback.ts`, exit. **Short-circuits before planning** — it
  resolves no answer, reads no bundled pack and takes no parameter.
  **`--rollback` with no journal exits `0` with zero bytes**, stating that
  no interrupted apply was found: nothing is wrong, so nothing is an error
  (Q-68).
  *Depends on: F1 T-1107, T-2001.*

- [ ] **T-2106** `[Implementer]` The failure paths, all of them F1's codes
  and none of them new: `E-CLI-PACK-MISSING` (no positional),
  `E-CLI-UNKNOWN-PACK` (no such bundled pack, exit **1** — a user typed a
  name and can retype it), `E-ALREADY-APPLIED` (a `.harness/` exists) and
  `E-JOURNAL-PRESENT` (a crashed run), the last two **before any other
  check** and with **zero bytes**.
  *Depends on: T-2101, T-2105.*

- [ ] **T-2107** `[TestWriter]` `tests/integration/init-failures.test.ts` —
  each code in T-2106 with its exit class and **an empty project
  directory afterwards**, asserted by recursive comparison against a
  pre-run snapshot rather than by checking a few paths. Zero-bytes is the
  claim that matters, and a spot check does not establish it.
  *Depends on: T-2106.*

---

## E-22 — Acceptance — the three stand-ups, the exit classes, the non-interactive path

**Depends on:** E-21, F1 E-12 (fixtures, runner), F5 E-14 (the packs
produce what they claim).

- [ ] **T-2201** `[TestWriter]` US-53/54/55 — stand up each bundled pack
  into an empty directory and assert the applied tree against F5's §7b
  table. `coding` runs **fifteen steps with no branches** (Q-82 took its
  scaffolds), `writing` eight plus five under its scaffold, `planning`
  twenty-three with one `when` pair.
  *Depends on: F5 T-1405, T-2101.*

- [ ] **T-2202** `[TestWriter]` The non-interactive path end to end: no
  TTY, every answer by `--set`, a complete apply. Then the same run with
  **stderr redirected but stdin a TTY**, asserting it is still
  non-interactive — the case that distinguishes the both-streams rule from
  a stdin-only one, and the one a stdin-only implementation passes every
  other test while getting wrong.
  *Depends on: T-2005, T-2201.*

- [ ] **T-2203** `[TestWriter]` The disclosure capture, from a consumer's
  position: run `init`, capture stderr, assert the two sentinel lines
  appear **exactly once each, in order**, **carrying the same nonce**,
  that every US-13 row lies between them, and that **nothing else does**.
  **Match the nonce as a pattern, never verbatim** — it differs per run
  by design (C-59), and a test pinning the block byte-for-byte would fail
  correctly rather than reveal a defect.
  This is F6's IM-10 standing in for itself before F6 exists.
  *Depends on: T-2102.*

- [ ] **T-2204** `[TestWriter]` Determinism through `init`: the same pack,
  answers and scaffolds into two empty directories produce **byte-identical
  trees and manifests**, by recursive comparison with no exclusions.
  **⚠️ BLOCKED in part (U-13** — the cross-platform matrix needs the CI
  runner.)
  *Depends on: F1 T-1218, T-2201.*

- [ ] **T-2205** `[TestWriter]` `--rollback` after a forced mid-write
  failure: the journal survives, `--rollback` restores exactly what the
  run touched, and **a file the run did not create is not deleted** (C-13,
  G-F1-6). Reuses F1's fault-injection fixture rather than building a
  second one.
  *Depends on: F1 T-1109, T-2105.*

- [ ] **T-2206** `[TestWriter]` The boundary assertion, and it is a real
  test rather than a review note: **`init` writes no applied path except
  through `executeApply`**. Assert by running a full apply with
  `executeApply` stubbed and requiring the project directory to be
  untouched. If this fails, engine code has migrated into the command,
  which is the one failure mode this feature is prone to.
  *Depends on: T-2101.*

---

## Counters claimed by this document

| Counter | Claimed | Next free |
|---|---|---|
| Epic | **E-20…E-22** | **E-23** (claimed by F3) |
| Task | **T-2001…T-2206** | **T-2007**, **T-2108**, **T-2207** |
| Story | none — F2's are US-39…US-56 | **US-99** |
| Question | none opened; Q-65…Q-69 resolved in `F2-ADR-003` | **Q-84** |
| Error code | **none invented.** Every code here is F1's | catalogue holds **87** |
