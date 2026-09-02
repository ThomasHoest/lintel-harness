# F2 — `lintel harness init` — the Two-Phase Apply Engine — Lintel Harness v1.0
**Version:** 1.1
**Status:** Accepted
**Date:** 2026-09-01
**Platform:** Node ≥ 22 / TypeScript CLI, published as `@lintel/cli`, binary `lintel`, with **`harness` as a command group** — the command specified here is reached as `lintel harness init` (Q-16 as amended by Q-63). No UI; a terminal is optional (see US-43).
**Design spec:** n/a (no UI)
**ADR:** {{`F2-ADR-NNN-init-apply-engine.md` — filled in by the architect after this spec is reviewed}}
**References:** [`../general/pack-application.md`](../general/pack-application.md) (the two-phase model — **authoritative**) · [`../general/interaction-model.md`](../general/interaction-model.md) §3, §5, §11.1, **§11.2** (`init`'s command surface — **a hard input, not background**), IM-2, IM-7, IM-8, IM-10, IM-11, IM-14, IM-17, IM-18, IM-19, IM-38, IM-39, IM-41 · [`../general/system-architecture.md`](../general/system-architecture.md) §3 (the trust-critical path) and §4 (the F2 row) · [`F1-spec-pack-format-and-manifest.md`](F1-spec-pack-format-and-manifest.md) **v2.9** — US-3, US-4, US-8, US-9, US-10, **US-13**, US-14, US-16, US-29, US-30, US-31, US-32, §Error States, §NFR, **§F1.6**, §F1.7, §F1.8, §F1.9 · [`F1-ADR-001-pack-format-and-manifest.md`](F1-ADR-001-pack-format-and-manifest.md) §1 *Public interface contract*, §3.6, §7.1, §7.5 · [`LintelHarnessSpecification-1.0.md`](LintelHarnessSpecification-1.0.md) §Feature 2 · `packs/coding/`, `packs/writing/`, `packs/planning/`

**Amendment history**

| Version | Date | Summary |
|---|---|---|
| **1.1** | **2026-09-02** | **`init` is built, and building it found sixteen places this document, `F2-ADR-003` and F1 disagree.** **(a) The disclosure stream was specified twice, two ways.** This document said **stdout** in three places; `F2-ADR-003` §3.2, T-2102, T-2104 and **F1 US-13** all say **stderr**, and F6 captures it from stderr. Corrected to stderr here — three documents against one, and the one that was alone was this. **(b) The biggest one, recorded not fixed: most of `validate`'s checks are unreachable from `init`.** T-2101 has `init` call `planApply`, which runs US-16 **step 3 and step 11 only** — so `E-SCAFFOLD-COLLISION`, `W-FOLDER-README-MISSING`, `W-LINK-DANGLING`, `W-ANATOMY-*`, `W-HOOK-SCRIPT-INERT` and check 9's codes **cannot fire during an apply**, while §Error States lists them as `init`'s. Either `init` calls `validatePack` (which T-2101 forbids) or §Error States overstates what an apply checks; **this document does not currently say which**, and the implementation follows T-2101 with the gap recorded at its call site. **(c) US-50 says "version-2 journal" five times**; the journal is **version 3** and F1 states there is no version-2 journal to be compatible with. **(d) `E-LOCK-HELD` is unreachable from `init`** — US-45 refuses any existing `.harness/` as the *first* check, and a first `init` creates `.harness/` to hold the lock, so US-49's second-`init` case can never be observed. The lock is implemented in full because `update` contends for it. **(e) `F2-ADR-003`'s `InitOptions` cannot express two of this document's own rules**: `set: Record<string, string>` collapses duplicates, so US-40's duplicate-`--set` fault is not representable, and `runInit(options)` presumes single-pass parsing where pass 2 must re-parse the original argv. |
| 1.0 | 2026-09-01 | Initial draft. Specifies the `init` command — argv handling and the two-pass walk, pack resolution, answer collection, phase ordering, the journal, `--force`, `--rollback` and the exit contract — as the driver of machinery F1 already owns. Opens **Q-65…Q-69**; uses **US-39…US-56**. |

---

## Introduction

`lintel harness init <pack>` is the one command that takes a directory to
a working project. It is the **only** command in v1.0 that performs a
full apply, and it is the surface through which every other feature's
work becomes visible: F1's format and confinement rules, F5's three
packs, F3's later `update` and F6's judgment work all reach a user for
the first time through a successful `init`.

**This specification deliberately restates almost nothing.** F1 already
owns the pack schema, the six recipe primitives, the four confinement
stages (F1 US-3, `F1-ADR-001` §7.1), the 14 validation steps (F1 US-16),
the twelve-step apply lifecycle (F1 §F1.6), the journal and rollback
contract (F1 US-13), the six-key manifest (F1 US-10) and the product's
**only** diagnostic catalogue (F1 §Error States). `pack-application.md`
owns the two-phase model and is authoritative on it. What is left — and
what F2 owns — is **the command that drives them**: how `argv` becomes an
`ApplyInputs`, how a parameter answer is obtained when nobody supplied
one, in what order the phases and the writes are driven, what is printed
and when, how `--force` and `--rollback` behave, and what the process
exits with. Where this document and F1 could be read as disagreeing, F1
wins; where this document and `pack-application.md` could be read as
disagreeing, `pack-application.md` wins.

The property everything here exists to protect is one sentence, and it is
`system-architecture.md` §3's:

> **Zero bytes are written unless every check passed — not even
> `.harness/`.**

That is F1's rule. **F2 is where it becomes observable**, because `init`
is the only place a user can watch it hold or fail. Everything —
validation, both phases, and the manifest — is computed in memory; the
journal is written; only then do bytes land (F1 US-13, §F1.6 steps 6–8).
**Phase 2 renders entirely at plan time** (C-23, `F1-ADR-001` §3.6, F1
US-30): the executor reads nothing from disk, so F2 must never introduce
a re-read, a re-glob or a re-render between the plan and the write.

`init` is also the command a **non-human** drives most often. The F6
skill invokes it with every answer already supplied (IM-8), and CI
invokes it in shells with no terminal at all (IM-2). The command surface
is therefore specified so that **every answer is reachable from `argv`**,
and prompting is a convenience layered on top of a complete flag
interface rather than a path anything depends on.

### What is in scope

- The `init` command surface exactly as [`../general/interaction-model.md`](../general/interaction-model.md) §11.2 fixes it: `<pack>`, `--scaffold`, `--set`, pack-declared `flag` aliases, `--force`, `--rollback`.
- **Argument handling, including the two-pass `argv` walk** that pack-declared aliases force (F1 US-8), and the point at which a token may first be called unknown.
- **Pack resolution** from the bundle by name, and the version gates that follow it (`minCliVersion`, `pack.json` `formatVersion`, `recipe.json` `formatVersion`).
- **Collecting parameter answers** — from `--set`, from a pack-declared alias, from a declared `default`, or by prompting — and the precedence between them.
- **Scaffold selection**, including the choose-one category rule at the command line.
- **Ordering the phases**: driving F1's twelve-step lifecycle (§F1.6) through `planApply` → disclosure → lock → journal → `executeApply` → manifest → journal removal.
- **What `init` prints, and when** — the pre-write disclosure (F1 US-13, IM-10/IM-11), warnings raised during an apply, and the post-apply next-steps block (IM-14).
- **`--force`** and its single, narrow effect.
- **`--rollback`** as a command surface over F1's five-case rule.
- **The exit contract**: which of F1's four classes are reachable, and on what.

### What is NOT in scope

Everything in this list belongs to another feature and is **cited, never
restated**. A copy of any of it in this document would be a second thing
to keep true.

- The **pack schema** (`pack.json`), the **recipe schema** (`recipe.json`) and the six primitives — F1 US-1, US-3, US-4, US-8, US-9, US-31, §F1.2, §F1.3.
- The **confinement rules** — the four stages, the reserved-destination denylist, the write-set quantifier — F1 US-3, `F1-ADR-001` §7.1, `system-architecture.md` §3.
- The **manifest format** — F1 US-10, §F1.4, §F1.5.
- The **diagnostic catalogue** — F1 §Error States, which is the product's only one. **F2 invents no code, no message and no exit class.**
- `validate`, `verify` and `pack info` — F1 US-16, US-29, US-33, Q-53.
- `update` and its read-only mode — F3, Q-62. `init` never moves an applied project; it refuses one.
- The **skill** and every judgment step after a successful apply — F6, Q-1, IM-9.
- **`--adopt`, in any form.** It was dropped by Q-44 and is not reintroduced here, under that name or another. `init` does not infer a pack from a file tree.
- **A consent gate.** Deleted with `merge-json` (Q-54, F1 US-13). `init` presents nothing for a user to agree to, and `ApplyInputs.consent` / `ConsentInputs` in `F1-ADR-001`'s printed contract are superseded — F2 does not pass them.

---

## Technical Context

Settled decisions only. Each cites the question or condition that settled
it. Unsettled work is in **Open Questions**.

| Decision | Choice | Rationale |
|---|---|---|
| Command shape | `lintel harness init <pack> [--scaffold <id>]… [--set <id>=<value>]… [--<alias> <value>]… [--force]`, and separately `lintel harness init --rollback` | *(Q-63, IM §11.2)* The binary is `lintel`, `harness` is a command group and the command is the **second** positional. §11.2 fixes this surface; F2 implements it and does not extend it |
| Pack argument | Required, never inferred, never defaulted | *(Q-12, IM-4)* A project holds exactly one pack and the choice is one-time. Inferring it from the tree was `--adopt`, dropped by Q-44 |
| Argv parsing | **Two passes.** Pass 1 consumes group, command, global flags, known command flags and the pack name, deferring every unrecognised token without judging it. Pass 2 re-parses with the resolved pack's aliases registered; only then may a token be `E-CLI-UNKNOWN-FLAG`. Fail-closed at the end of pass 2 | *(F1 US-8, Q-63)* The alias set is unknowable until the pack resolves. The command group adds one **fixed** positional, which is recognisable in pass 1 by construction and moves no fail-closed point |
| Where answers come from | `--set <id>=<value>`, a pack-declared `flag` alias, a declared `default`, or a prompt — **in that precedence** | *(F1 US-8, IM-2)* Aliases are sugar for `--set` and record under the parameter's `id`, never the flag name |
| **Prompting** | `init` prompts **only when stdin and stderr are both a TTY**. When either is not, it never prompts: a required answer with none is `E-PARAM-MISSING`, exit 1, zero bytes. **No flag turns prompting on or off** | *(IM-2, IM-8, F1 US-8)* **This is F2's decision.** A prompt written to a pipe is a hang, and both non-human callers — CI and the skill — drive `init` non-interactively. A flag was rejected because the reserved-flag list is F1 US-8's and is the whole list; adding one would change F1's format, and TTY detection needs no flag to be correct |
| Invalid answers | No retry loop. The first answer failing its declared `pattern`, `maxLength` or `values` is `E-PARAM-INVALID`, exit 1, zero bytes — at a prompt exactly as from a flag | *(F1 US-8, §Error States)* F1's own reading of the code is *the user typed it and can retype it*, which is a re-run. One code path for both entry points keeps the flag surface and the prompt surface indistinguishable to a test |
| Scaffolds | Opt-in and repeatable; none selected with no flag; duplicates collapse; two selected scaffolds sharing a `category` are `E-SCAFFOLD-EXCLUSIVE`; application order is **`pack.json`-declared order**, never command-line order | *(Q-8, Q-17, F1 US-9)* Order-independence at the command line is what makes two users typing the same flags differently get byte-identical projects |
| Everything is planned first | `init` calls `planApply` once. Validation, both phases, `payloadDigest`, the manifest and the disclosure are all built there, and nothing is written until it returns `ok` | *(Q-39, F1 US-13, §F1.6 step 6)* This is the guarantee; F2 drives it and may not reorder it |
| Phase 2 renders at plan time | `executeApply` **reads nothing from disk**. F2 introduces no re-read, no re-glob and no re-render between plan and write | *(C-23, `F1-ADR-001` §3.6, F1 US-30, `pack-application.md`)* A read at step *n* is both an environment read and an ordering dependence, and its content would have passed no validation and appeared in no disclosure |
| The disclosure | Built **once**; `init` renders it to **stderr** immediately after a successful plan and **before the lock is taken**. It enumerates and never summarises. It **gates nothing** | *(F1 US-13, Q-54, IM-10, IM-11)* No v1.0 pack owns a security-relevant key, so nothing can be gated on. It is a record, not a decision point — and it must still be emitted, because on the conversational path the skill's verbatim relay is the only copy the user sees |
| Already applied | `init` in a project with a `.harness/` directory is `E-ALREADY-APPLIED`, exit 1, zero bytes — before every other check. A `.harness/` holding a journal is `E-JOURNAL-PRESENT`, exit 2, instead. `--force` never overrides either | *(F1 US-14, §F1.6 step 1)* Re-applying in place is `update`'s job (Q-62), not a flag on `init` |
| `--force` | Relaxes the pre-existing-path rule of F1 US-13 **and nothing else**: it permits a collision whose on-disk content is byte-identical to what would be written, and still fails on every other collision | *(F1 US-13, IM §11.2)* It is the mechanism S7 uses to re-init this repo, whose `.claude/agents/` already holds what the pack ships |
| `--rollback` | Takes no pack argument and no other flag. Reverses a crashed apply by F1 US-13's five-case table, which F2 **does not restate** | *(F1 US-13, C-13, IM-18, IM-20)* It is the single recovery command after a class-3 failure |
| No `--strict`, no `--json` | `init` accepts neither. A `defect`-class warning raised during an apply prints and leaves the exit code alone; the machine-readable surfaces are the read-only commands' | *(IM §11.2, IM-22, Q-60)* `--strict` promotes defects, and an apply is not the place to change an exit class on a folder README |
| Flags of other commands | A known flag belonging to another command is **refused, not ignored**: `E-FLAG-NOT-PERMITTED`, exit 1 | *(IM-41, F1 §Error States)* A user who typed it believed it did something |
| No integrity downgrade | There is no flag, environment variable or pack switch on `init` that skips a check, tolerates drift or turns a class-2 refusal into a warning | *(IM-41, F1 §F1.9)* Stated here so a later convenience flag is a change to this row rather than an addition beside it |
| Streams | Diagnostics, warnings, prompts **and the disclosure** to **stderr**; the post-apply summary to **stdout** | *(IM-10)* IM-10's required test captures the disclosure as a contiguous substring, which needs a stream a caller can capture without interleaved diagnostics |
| Exit classes | F1's four, unchanged in meaning. `0` applied · `1` user-correctable · `2` pack/recipe/manifest integrity or a safety refusal · `3` internal or filesystem mid-write | *(F1 §Technical Context, IM-39)* What varies per command is which classes are reachable, never what a class means |
| No network, ever | `init` makes no network request; packs are bundled and the payload is local | *(Q-2, Q-41, F1 §NFR *No network*)* |

---

## Goals

Each is assessable yes/no when F2 is done.

- **A pack applies in one command from an empty directory**, producing the applied tree, `.harness/pack/`, and `.harness/manifest.json`, with no manual path edit afterwards. [G1, R3, S1]
- **Every answer and every selection is reachable from `argv` alone**: each of the three bundled packs applies to exit `0` in a shell with no TTY, with all answers supplied by flags. [IM-2, S5]
- **A failed apply writes zero bytes**, including no `.harness/`, for every failure up to and including the plan. [F1 US-13, IM-17]
- **A crashed apply is fully reversible by `lintel harness init --rollback`**, with no data loss for any file the user has since touched. [F1 US-13, C-13]
- **Two applies of one pack version with the same answers and the same scaffold selection produce byte-identical trees and byte-identical manifests.** [Q-39, Q-40, F1 US-14]
- **The pre-write disclosure is emitted on every apply**, complete and unsummarised, from the planner's single builder. [F1 US-13, IM-10]
- **`init` refuses an already-applied project** rather than merging into it, under every flag. [F1 US-14]
- **This repo is produced by `lintel harness init coding`** with nothing left hand-applied. [G7, S7]

---

## Out of Scope (this version)

- **Re-applying in place.** `init` refuses an applied project; moving to a newer pack version is `lintel harness update` (F3, Q-62).
- **`--adopt`, or any inference of a pack from an existing tree** (Q-44). Dropped, and not reintroduced under another name.
- **A consent gate, and any flag that would feed one** — `--accept-permissions`, `--accept-hooks` (Q-54, F1 US-13). `init` presents nothing to agree to. A v1.1 that reintroduces a settings destination reintroduces the gate *between the plan and the lock*, and re-reserves both flag names, in the same change (F1 §F1.9 obligations 2 and 3).
- **`--strict` and `--json` on `init`** (IM §11.2).
- **A dry-run flag.** The pre-run inspection surface is `lintel harness pack info <name>` (IM-12, F1 US-29), which reads the pack alone and writes nothing. Adding a second, apply-shaped inspection path would give the disclosure two builders.
- **Selecting more than one pack**, or a second `init` alongside a first (Q-12, F1 §F1.7).
- **Any judgment work after the apply** — adapting `CLAUDE.md`, filling the voice guide, filling `project-brief.md`. The run *states* that they are outstanding (US-54); it never does them (Q-1, IM-9).
- **A progress UI, colour requirements, or a spinner.** Output is plain text on two streams.

---

## User Stories

---

**US-39 — Apply a pack to an empty directory in one command**
> As a project owner, I want `lintel harness init coding` in an empty
> directory to give me a working project so that I never assemble one by
> hand.

**Acceptance criteria:**
- `lintel harness init coding --set projectName="X" --set stack="Y"` in an empty directory exits `0`.
- After it, `.harness/pack/` holds the `coding` pack verbatim — a recursive byte-comparison against `packs/coding/` reports no difference.
- After it, `.harness/manifest.json` exists and parses, carrying exactly the six keys F1 US-10 fixes, in F1 §F1.4's order.
- After it, `lintel harness verify` in the same directory exits `0`.
- After it, every applied path the plan named exists, and no path the plan did not name was created.
- The command completes in ≤ 3 s on a pack of ≤ 500 files totalling ≤ 8 MB on a 2020 laptop-class machine, **excluding any time spent waiting for a human** (F1 §NFR *Performance*).

---

**US-40 — Type a pack's own flag alias and have it work**
> As a user of the `planning` pack, I want `--calibration high-floor` to
> be accepted so that I do not have to know the parameter id behind it.

**Acceptance criteria:**
- `lintel harness init planning --calibration high-floor` exits `0` and records `constraintFloor: "high-floor"` in `.harness/manifest.json` — under the parameter's **`id`**, never under the flag name (F1 US-8).
- `lintel harness init planning --set constraintFloor=high-floor` produces a **byte-identical** manifest and tree to the alias form.
- An unrecognised token is **never** reported during pass 1: with `--calibration` supplied, `E-CLI-UNKNOWN-FLAG` is not raised for it, and a test asserts this by passing an alias declared only in `pack.json`.
- A token still unrecognised at the end of pass 2 is `E-CLI-UNKNOWN-FLAG`, exit 1, zero bytes.
- Passing both the alias and `--set` for the same parameter with **different** values is `E-PARAM-INVALID`, exit 1, zero bytes (F1 US-8). Passing both with the same value exits `0`.
- Passing `--set constraintFloor=a --set constraintFloor=b` is `E-PARAM-INVALID`, exit 1, by the same rule.
- A flag that takes a value and receives none is `E-CLI-FLAG-VALUE-MISSING`, exit 1.
- A second positional after `<pack>` is `E-CLI-ARG-UNEXPECTED`, exit 1.

---

**US-41 — Be told plainly when the CLI and the pack do not fit**
> As a project owner, I want a version mismatch between my CLI and the
> pack named as such so that I know whether to upgrade or to report a
> bug.

**Acceptance criteria:**
- A pack whose `minCliVersion` exceeds the running CLI's version is `E-PACK-CLI-TOO-OLD`, exit **1**, zero bytes.
- A `pack.json` whose `formatVersion` exceeds the CLI's supported pack format is `E-PACK-FORMAT-NEWER`, exit **2**, zero bytes.
- A `recipe.json` whose `formatVersion` exceeds the CLI's supported **recipe** format is `E-RECIPE-FORMAT-NEWER`, exit **2**, zero bytes — a different code from the previous criterion, and the run names which of the two declarations was newer (F1 §Error States).
- A pack whose declared version is newer than the CLI's own but within `minCliVersion` prints `W-PACK-NEWER-THAN-CLI` and does not change the exit code.
- All four checks run at F1 §F1.6 step 2, **before** any answer is collected and before the plan.
- A pack name that resolves to no bundled pack fails, exit 1, zero bytes, naming the available packs — **see Q-67: no F1 code covers this today.**

---

**US-42 — Supply every answer from the command line**
> As CI, and as the F6 skill, I want every parameter and every scaffold
> reachable from `argv` so that I can apply a pack with no terminal and
> no agent.

**Acceptance criteria:**
- Each of the three bundled packs applies to exit `0` in a shell with **stdin closed or redirected from `/dev/null`**, with every required answer supplied by `--set` or an alias (IM-2).
- No such run blocks, prompts, or reads a byte from stdin — asserted by running with stdin closed and requiring termination within the performance bound.
- A `required` parameter with no argv answer and no declared `default`, in such a run, is `E-PARAM-MISSING`, exit 1, zero bytes, and the message names the parameter id and its declared `prompt`.
- A parameter with a declared `default` and no argv answer, in such a run, takes the default, and the default is recorded verbatim in the manifest (F1 US-8, US-10).
- An answer failing its declared `maxLength` or `pattern` is `E-PARAM-INVALID`, exit 1, zero bytes; `maxLength` is checked **before** `pattern` (F1 US-8).
- An `enum` answer outside `values` is `E-PARAM-INVALID`, exit 1, and the message lists the permitted values verbatim.
- An answer whose value looks like a credential prints `W-ANSWER-LOOKS-SECRET` and does **not** change the exit code (F1 US-8).
- A scaffold's parameters are collected and recorded **only when that scaffold is selected** (F1 US-9).

---

**US-43 — Be asked, at a terminal, for what I did not type**
> As a person running `init` by hand, I want to be asked for the answers
> I did not supply so that I do not have to read `pack.json` first — and
> I never want a prompt to appear where nothing can answer it.

**Acceptance criteria:**
- With **both stdin and stderr attached to a TTY**, `init` prompts once for every declared parameter that has no `argv` answer, in `pack.json`-declared order, base parameters before the selected scaffolds' parameters.
- Each prompt renders the parameter's declared `prompt` text; where a `default` is declared it is shown, and an empty line accepts it.
- With **stdin not a TTY, or stderr not a TTY**, `init` prompts for nothing and reads nothing from stdin — asserted by running under a pipe and requiring no read and no block.
- In that non-TTY case a `required` parameter with no answer and no default is `E-PARAM-MISSING`, exit 1, zero bytes; the run does not hang and does not consume stdin.
- **No flag exists that enables or disables prompting**, and passing an invented one (`--no-input`, `--yes`, `--interactive`) is `E-CLI-UNKNOWN-FLAG`, exit 1.
- An answer typed at a prompt and failing validation is `E-PARAM-INVALID`, exit 1, zero bytes — the same code, class and message as the flag form, and **not** a re-prompt.
- A prompted answer is recorded in the manifest identically to a flag-supplied one: two runs of the same pack, one interactive and one fully flagged, with the same values, produce **byte-identical** manifests and trees.
- Time spent at a prompt is excluded from the performance bound (F1 §NFR *Performance*).

---

**US-44 — Pick scaffolds, and be stopped from picking two of a choose-one**
> As a project owner, I want to add a backend layout only if I have a
> backend, and to be told plainly when two scaffolds are alternatives.

**Acceptance criteria:**
- With no `--scaffold` flag, no scaffold is applied and `manifest.scaffolds` is `[]`.
- `--scaffold backend-azure` applies that scaffold's steps and records `["backend-azure"]`.
- An id the pack does not declare is `E-SCAFFOLD-UNKNOWN`, exit 1, zero bytes, listing the available ids verbatim.
- `--scaffold backend-azure --scaffold backend-aws` is `E-SCAFFOLD-EXCLUSIVE`, exit 1, zero bytes, naming the category and both ids — **not** a path collision (F1 US-9).
- The same id passed twice collapses to one selection and exits `0`.
- Two selections typed in either order produce **byte-identical** trees and manifests, because application order is `pack.json`-declared order (F1 US-9).
- `manifest.scaffolds` lists the selected ids in **declared** order.

---

**US-45 — Refuse an already-applied project, under every flag**
> As a project owner, I want `init` in a project that already has a pack
> to stop rather than to merge so that I cannot destroy work by repeating
> a command.

**Acceptance criteria:**
- `init` in a directory containing `.harness/` is `E-ALREADY-APPLIED`, exit 1, **zero bytes**, and names the applied pack and version when the manifest is readable (F1 US-14).
- The check is the **first** thing `init` does, before pack resolution, before argv pass 2's fail-closed point on an unknown flag, and before any answer is collected (F1 §F1.6 step 1).
- The same command with `--force` is still `E-ALREADY-APPLIED` — `--force` never overrides it.
- A `.harness/` containing `journal.json` is `E-JOURNAL-PRESENT`, exit **2**, instead, and the remedy line names `lintel harness init --rollback`.
- Neither case writes, creates or removes anything, including `.harness/lock`.
- **No route exists from `init` to an in-place re-apply.** The command that moves an applied project to a newer pack version is `lintel harness update` (F3, Q-62), and `init`'s diagnostic must not describe that capability as unavailable — see the note under Error States.

---

**US-46 — See what an apply is about to do, in full, before it does it**
> As a project owner — or as a reader of what a skill relayed to me — I
> want the enumeration of what this apply will write executable, ship as
> an inert hook, substitute my answers into, and place as an agent file.

**Acceptance criteria:**
- On every apply that reaches the lock, `init` renders the disclosure to **stderr**, as one contiguous block, **before** `.harness/lock` is taken and therefore before any byte is written.
- The block is rendered from the **planner's** `SecurityDisclosure`, via the one `renderDisclosure()` builder that `pack info` and `validate --json` also use — asserted structurally, so the three cannot disagree (F1 US-13).
- The block **enumerates and never summarises**: no count stands in for a list, no value is truncated, no line is elided. Applying `coding` prints all **five** applied paths at which a parameter answer was substituted, each with the answer verbatim, and all **ten** `.claude/agents/*.md` with their **whole frontmatter blocks** verbatim — including `Bash` on `implementer` and `testwriter`, `WebSearch, WebFetch` on `researcher`, and `permissionMode: readonly` on `architect`, `reviewer` and `securityreviewer` (F1 US-13, C-40, C-43, C-45).
- **Nothing pauses.** The apply proceeds whether or not anything read the block; there is no prompt, no keypress and no flag that suppresses it (Q-54, IM-11).
- The block's content is a pure function of `(payload, answers, scaffold selection)`: two applies with the same inputs print **byte-identical** blocks.
- On a plan that failed, no disclosure is printed and the diagnostic is the whole output.

---

**US-47 — Lose nothing when an apply is refused**
> As a project owner, I want a refused apply to leave my directory
> exactly as it was so that trying one in a directory with work in it is
> never a risk.

**Acceptance criteria:**
- For **every** failure at F1 §F1.6 steps 1–6 — argv, already-applied, pack resolution, pack and recipe validation, answers, scaffolds, and the plan itself — the directory after the run is **byte-identical** to the directory before it, asserted by a recursive comparison with no exclusions.
- In particular **`.harness/` is not created**, `.harness/lock` is not created, and no temp file survives.
- `E-TARGET-EXISTS` (exit 1) fires before the gate: an `init` into a tree where any planned applied path already exists writes nothing, lists the first ten colliding paths and the total count.
- The existence test folds both sides by `collisionKey` — NFC-normalized then case-folded — **on every platform, unconditionally**, so `.claude/Settings.json` on disk and a planned `.claude/settings.json` collide (N-5, F1 US-13).
- A run refused at any of these points prints its diagnostic on **stderr** and prints no disclosure and no summary on stdout.

---

**US-48 — Have the phases driven in one fixed order**
> As an implementer, I want the sequence from plan to manifest to be
> stated once so that no step is reordered for convenience.

**Acceptance criteria:**
- `init` drives F1 §F1.6's **twelve** steps in order and adds none: already-applied check → pack resolution and version gates → pack/recipe validation (US-16 checks 1–10) → answers and scaffold selection → `realpath` of the project root, resolved **once** → `planApply` (US-16 checks 11–14, both phases rendered, `payloadDigest`, manifest and disclosure built) → disclosure printed → lock → journal → **phase 1** → **phase 2** → manifest → journal and `journal.d/` removed, lock released.
- **Phase 1 completes before phase 2 begins**, and both write only bytes the plan already holds.
- `executeApply` performs **no read** of `.harness/pack/`, of the bundle, or of any applied path (C-23). A test asserts it by instrumenting the file-read path and requiring zero source reads between the plan returning and the manifest landing; the only reads permitted in that window are the destination-side safety checks F1 US-13 names — stage-3 `lstat`s and the re-hash of a `--force` byte-identical path.
- **The manifest write is the last write of an apply**, and the journal is deleted only after it succeeds (F1 US-13).
- The project root is resolved with `realpath` exactly **once** per run and every applied path is judged against that resolved root.
- The five things the CLI writes under `.harness/` are the payload, the journal, `journal.d/`, the lock and the manifest — and **no `.harness/README.md`** is written (F1 §F1.6, Q-50 as amended).

---

**US-49 — Never have two applies interleave in one project**
> As a project owner, I want a second concurrent command to fail fast
> rather than to interleave writes with the first.

**Acceptance criteria:**
- `init` acquires `.harness/lock` with an exclusive create, **after** the plan and **after** the disclosure, and releases it as the last act of a successful run.
- A second `init` while a first holds the lock is `E-LOCK-HELD`, exit 1, and writes nothing; the message names the recorded pid, host and start time.
- A lock is broken **only** when all three of F1 §NFR *Concurrency*'s conditions hold — recorded host is this host, recorded pid is not alive, lock older than 60 s — and breaking one prints `W-LOCK-STALE-BROKEN`, a `notice`, which does not change the exit code.
- A lock whose pid is alive, or whose host is not this one, is **never** broken automatically.
- A failure before the lock leaves no lock file behind; a failure after it leaves the lock **and** the journal, which is what `--rollback` acts on.

---

**US-50 — Have a crashed apply be recoverable rather than mysterious**
> As a project owner, I want a run killed mid-write to leave enough
> information to reverse it exactly.

**Acceptance criteria:**
- A **version-2** journal is written to `.harness/journal.json` and flushed **before** the first payload byte, covering **both phases** and the directories created in creation order (F1 US-13).
- Per intended path it records the hash this apply intends to write, `preExisting`, the pre-apply hash and mode (both `null` when the path did not exist), and a `backup` under `.harness/journal.d/` — present exactly when `preExisting` is true and the pre-apply hash differs from the intended one.
- `preExisting` is determined by `collisionKey`, not by exact string (N-5).
- A backup is written **before** the overwrite it protects.
- Killing the process during phase 1, during phase 2, and between phase 2 and the manifest each leaves the journal in place, and the next `lintel harness` command in that project fails with `E-JOURNAL-PRESENT`, exit 2, offering `lintel harness init --rollback`.
- A journal declaring any `version` other than `2` is `E-JOURNAL-UNREADABLE`, exit 2 — never guessed at.
- An I/O failure mid-write is `E-WRITE-FAILED`, **exit 3**, the journal remains, and the remedy line is `→ lintel harness init --rollback`.
- A destination that changed between the plan and the write is `E-TARGET-RACE`, exit 2, the journal remains, and the run stops.

---

**US-51 — Re-init over files that already hold exactly what the pack ships**
> As the owner of this repo, I want `--force` to let an apply proceed
> over files whose content is already identical, and to stop on
> everything else.

**Acceptance criteria:**
- Without `--force`, any pre-existing planned path is `E-TARGET-EXISTS`, exit 1, zero bytes.
- With `--force`, a collision whose existing content is **byte-identical** to the planned bytes proceeds; any other collision **still** fails with `E-TARGET-EXISTS`, exit 1, zero bytes.
- A byte-identical collision is journalled with `preExisting: true`, and `--rollback` **leaves it untouched** rather than deleting it (F1 US-13 row 3).
- Where a byte-identical collision matches by `collisionKey` but the on-disk basename differs from the planned one, **no write happens at all**: the `lstat` and re-hash still run, the journal records the **on-disk** path, and the run reports the path as *kept* with both spellings named (C-36).
- After such a run the on-disk directory entry keeps its original spelling — asserted with the `.claude/Agents/README.md` fixture, which must still be named `Agents` afterwards.
- `--force` changes **nothing else**: it does not relax confinement, does not override `E-ALREADY-APPLIED`, does not tolerate a digest or validation failure, and does not change any exit class.

---

**US-52 — Reverse a crashed apply with one command**
> As a project owner whose apply died mid-write, I want a single command
> that removes exactly what that apply wrote and keeps anything I have
> since touched.

**Acceptance criteria:**
- `lintel harness init --rollback` reads `.harness/journal.json` and applies F1 US-13's five-case table — which this document **does not restate** — reporting per path whether it deleted, restored or kept it.
- It deletes only paths the apply **created** and restores only paths the apply **overwrote**, and acts on neither unless the on-disk bytes are still exactly what that apply wrote.
- A path the user edited after the crash is **kept**, and `W-ROLLBACK-KEPT` — class `notice` — names it. The run still exits `0`, reporting the count of kept files.
- Created directories are removed in **reverse** creation order and only when empty; a directory holding an unrecorded file is left in place and reported.
- After a rollback with nothing kept, the directory is byte-identical to its pre-`init` state and `.harness/` is gone.
- `--rollback` takes **no** `<pack>` positional (`E-CLI-ARG-UNEXPECTED`, exit 1) and **no** other flag: `--force`, `--set`, `--scaffold` and a pack alias alongside it are `E-FLAG-NOT-PERMITTED`, exit 1.
- `--rollback` in a project with **no journal** writes nothing and exits `0`, stating that no interrupted apply was found — see Q-68.

---

**US-53 — Branch on a code and a class, never on prose**
> As CI, and as the F6 skill, I want every outcome to carry one of four
> exit classes and, on failure, a code from one catalogue.

**Acceptance criteria:**
- `init` exits `0` on a completed apply, `1` on a user-correctable fault, `2` on a pack, recipe or manifest integrity fault or a safety refusal, and `3` on an internal or filesystem failure mid-write — the same meanings these classes carry on every other command (IM-39).
- **Every diagnostic `init` emits carries a code from F1 §Error States and no other.** A test enumerates the codes reachable from `init` and asserts each is present in F1's catalogue; **F2 defines none**.
- Every `E-` diagnostic and every `defect`-class `W-` diagnostic `init` prints carries a remedy line beginning `→` (IM-19).
- Line 1 of every diagnostic begins `lintel:` and context lines are indented two spaces (F1 §Technical Context).
- A `notice`-class warning carries **no** `→` line, and its absence is correct (IM-19).
- A `defect`-class warning raised during an apply — `W-FOLDER-README-MISSING`, `W-PATH-NON-NFC`, `W-ANSWER-LOOKS-SECRET` — prints and **does not** change the exit code; `init` has no `--strict` to promote it (F1 §F1.6, Q-60).
- Diagnostics go to **stderr**; a run captured on stdout alone shows the disclosure and the summary and no diagnostic.
- A class-2 failure is never presented as something the user mistyped, and a class-1 failure is never presented as a bug (IM-16).

---

**US-54 — Be told what is still mine to do**
> As a project owner, I want a successful apply to say what it did not
> do, so that I do not treat an applied project as a finished one.

**Acceptance criteria:**
- On exit `0`, `init` prints a closing block on **stdout** naming, in this order: (1) fill `project-brief.md`; (2) fill the pack's voice guide where the pack ships one; (3) commit, **`.harness/` included** (IM-14).
- The block states that `.harness/pack/` and `.harness/manifest.json` are committed **by design**, and `init` neither writes nor suggests a `.gitignore` entry for them (F1 US-10).
- The block states that recorded parameter answers are written verbatim into a committed file and are therefore exactly as public as the repository (IM-15).
- The block names the applied pack and version and the selected scaffolds.
- The block does **not** claim any judgment work was done: it does not say `CLAUDE.md` was adapted, the voice guide filled, or the brief written (Q-1, IM-9).
- The block appears on a `0`-exit run and on no other.

---

**US-55 — Get the same project from the same inputs**
> As a reviewer, I want two applies with the same inputs to be
> indistinguishable so that a diff between two projects means something.

**Acceptance criteria:**
- Two applies of one pack version into two empty directories, with the same answers and the same scaffold selection, produce **byte-identical trees**, asserted by recursive byte-comparison with **no exclusions**, and byte-identical `.harness/manifest.json` (F1 US-14).
- No output file and no manifest field contains a timestamp, an absolute path, a username, a hostname, a locale-dependent format or a random value (F1 §NFR *Determinism*).
- The recorded `payloadDigest` is identical between the two runs.
- The determinism claim is over **three** inputs — `(payload, parameter answers, scaffold selection)` — and a scaffolded apply is compared against another scaffolded apply, never against a bare one (C-46).
- The two trees are identical on macOS, Linux and Windows, modulo the executable bit, which Windows does not represent (F1 §NFR *Cross-platform*).
- The order in which `--scaffold` and `--set` flags were typed does not appear anywhere in the result.

---

**US-56 — Be refused a flag that belongs to a different command**
> As a user who typed a flag believing it did something, I want to be
> told it is not available here rather than have it silently ignored.

**Acceptance criteria:**
- `--strict`, `--json` and `--all` on `init` are `E-FLAG-NOT-PERMITTED`, exit 1, zero bytes, and the message names the commands that do accept them (IM-41).
- A flag no command and no pack alias recognises is `E-CLI-UNKNOWN-FLAG`, exit 1 — a **different** code, reported only after argv pass 2.
- A pack whose parameter declares a `flag` colliding with a reserved CLI flag fails at validate time with `E-PARAM-FLAG-INVALID`, exit 2 — so no alias can shadow one (F1 US-8). The reserved list is F1's and is the whole list, reserved whether or not `init` accepts the flag.
- A second positional in the command slot that is not a known command of the group is `E-CLI-UNKNOWN-COMMAND`, exit 1, listing `init, update, validate, verify, pack`.
- No flag on `init` skips the payload-digest check, tolerates drift, or turns a class-2 refusal into a warning — asserted by enumerating `init`'s accepted flags and requiring each to be one of `--scaffold`, `--set`, a pack-declared alias, `--force`, `--rollback` (IM-41).

---

## Error States

**Every code below is F1's.** F1 §Error States is the product's only
message catalogue, and its message text is authoritative and is
deliberately not copied here. **F2 defines no code, no message and no
exit class.** Where a scenario `init` can reach has no code in F1, it is
listed at the foot of this table and carries a question rather than an
invention.

| Scenario | Expected Behaviour |
|---|---|
| Project already has `.harness/` (no journal) | `E-ALREADY-APPLIED`, exit 1. Zero bytes. Names the applied pack and version when the manifest is readable. Checked first, before every other check. `--force` does not override it |
| Project has `.harness/journal.json` from a crashed apply | `E-JOURNAL-PRESENT`, exit 2. Zero further bytes. Remedy line names `lintel harness init --rollback` |
| Journal declares a `version` other than `2` | `E-JOURNAL-UNREADABLE`, exit 2. Never guessed at |
| Pack requires a newer CLI | `E-PACK-CLI-TOO-OLD`, exit 1. Zero bytes |
| `pack.json` `formatVersion` newer than the CLI's pack format | `E-PACK-FORMAT-NEWER`, exit 2. Zero bytes |
| `recipe.json` `formatVersion` newer than the CLI's recipe format | `E-RECIPE-FORMAT-NEWER`, exit 2. Zero bytes. A different code, because a different file and a different version axis |
| `pack.json` or `recipe.json` declares a duplicate key | `E-JSON-DUPLICATE-KEY`, exit 2, raised **before** any other check on the file |
| Any pack or recipe validation failure (US-16 checks 1–10) | Exit 2, zero bytes, under the code F1 assigns that check. `init` runs the same checks `validate` does; it does not soften one |
| Substitution, anchor or `.claude/` frontmatter failure (US-16 check 11) | Exit 2, zero bytes, under `E-SUBST-UNRESOLVED`, `E-SUBST-NEWLINE`, `E-ANCHOR-INVALID`, `E-CLAUDE-TOOL-GRANT` or `E-CLAUDE-PERMISSION-MODE`. These run at plan time, **before** the lock and the first write |
| A folder the apply creates receives no README (US-16 check 12) | `W-FOLDER-README-MISSING`, class `defect`. Prints; **does not** change the exit code — `init` has no `--strict` |
| A dangling internal link (US-16 check 13) | `W-LINK-DANGLING`, class `defect`. Prints; exit code unchanged |
| A `provisional` or `absent` anatomy part | `W-ANATOMY-PROVISIONAL` / `W-ANATOMY-ABSENT`, class `notice`. Prints with no remedy line; exit code unchanged |
| A pack file lands under a `hooks/` directory in any `.claude` tree | `W-HOOK-SCRIPT-INERT`, class `notice`, and the disclosure enumerates it. Exit code unchanged |
| Required parameter, no answer, no default | `E-PARAM-MISSING`, exit 1, zero bytes. Names the id and the declared prompt. This is the code for a non-interactive run with an answer missing |
| Answer fails `pattern`, `maxLength` or `values` | `E-PARAM-INVALID`, exit 1, zero bytes. Identical from a flag and from a prompt; no retry loop |
| Alias and `--set` give one parameter different values, or `--set` repeats an id with different values | `E-PARAM-INVALID`, exit 1, zero bytes (F1 US-8) |
| Answer's value looks like a credential | `W-ANSWER-LOOKS-SECRET`, class `defect`. Prints; exit code unchanged. The apply proceeds |
| `--scaffold` names an id the pack does not declare | `E-SCAFFOLD-UNKNOWN`, exit 1, zero bytes, listing the available ids verbatim |
| Two selected scaffolds share a `category` | `E-SCAFFOLD-EXCLUSIVE`, exit 1, zero bytes, naming the category and both ids |
| Two scaffolds of different categories write one path | `E-SCAFFOLD-COLLISION`, exit 2, at validate time and re-checked for the selected set |
| A planned applied path already exists, no `--force` | `E-TARGET-EXISTS`, exit 1, zero bytes. First ten paths plus the total. Compared by `collisionKey` |
| A planned applied path already exists with **different** content, with `--force` | `E-TARGET-EXISTS`, exit 1, zero bytes. `--force` covers byte-identical collisions only |
| A destination path escapes the resolved root, or hits the reserved-destination denylist, or the grammar | `E-MAP-ESCAPES-ROOT` / `E-MAP-RESERVED-DEST` / `E-MAP-PATH-GRAMMAR`, exit 2, zero bytes |
| An ancestor of a destination is a symlink, junction or reparse point | `E-DEST-SYMLINK`, exit 2, zero bytes |
| A symlink anywhere in the pack | `E-SYMLINK-IN-PACK`, exit 2, zero bytes |
| Payload path grammar, traversal bound or size cap violated | `E-PAYLOAD-PATH-INVALID` / `E-TRAVERSAL-LIMIT` / `E-CONTENT-TOO-LARGE` / `E-PAYLOAD-TOO-LARGE`, exit 2, zero bytes |
| Another command holds the project lock | `E-LOCK-HELD`, exit 1. Nothing written, no lock left behind |
| A stale lock is broken | `W-LOCK-STALE-BROKEN`, class `notice`. Only under all three of F1's conditions. Exit code unchanged |
| A destination changed between the plan and the write | `E-TARGET-RACE`, exit 2. Journal remains; `--rollback` is the remedy |
| I/O failure mid-write | `E-WRITE-FAILED`, **exit 3**. Journal remains; remedy line is `→ lintel harness init --rollback` |
| Rollback declines to touch a path the user edited after the crash | `W-ROLLBACK-KEPT`, class `notice`. The rollback continues and exits `0` with the count of kept files |
| Unknown flag, after argv pass 2 | `E-CLI-UNKNOWN-FLAG`, exit 1 |
| A flag that takes a value, given none | `E-CLI-FLAG-VALUE-MISSING`, exit 1 |
| A positional `init` does not take | `E-CLI-ARG-UNEXPECTED`, exit 1 |
| A known flag of another command passed to `init` | `E-FLAG-NOT-PERMITTED`, exit 1. Refused, not ignored |
| The second positional is not a command of the `harness` group | `E-CLI-UNKNOWN-COMMAND`, exit 1 |
| **`<pack>` names no bundled pack** | **No F1 code covers this — Q-67.** Until F1 adds one: exit 1, zero bytes, naming the bundled packs. It cannot be asserted by code today, only by string match, which is the defect F1's *Diagnostic vocabulary* rule exists to forbid |
| **`<pack>` positional absent** (`lintel harness init` alone, without `--rollback`) | **No F1 code covers this — Q-68.** `E-CLI-ARG-UNEXPECTED` is the inverse fault. Until F1 adds one: exit 1, zero bytes, printing the usage line |
| **`--set <id>=…` names no declared parameter** | **No F1 code covers this — Q-66.** Default assumption: `E-PARAM-INVALID`, exit 1, zero bytes — a poor fit, because its message is about a *value* and this fault is about an *id* |
| `--rollback` with no journal present | Not a failure. Exit `0`, zero bytes, stating that no interrupted apply was found. No code is needed and none is invented — Q-68's sibling, decided here |

**One stale message, reported not repaired.** `E-ALREADY-APPLIED`'s
context line in F1 §Error States reads *"Re-applying is not supported in
v1.0; update lands in v1.1."* **Q-62 returned `update` to v1.0**, so the
second clause is false. F1 owns the catalogue and the repair; `init`
raises the code as F1 defines it and this document does not shadow F1's
text with its own. The same staleness sits in F1 US-14's third
acceptance criterion.

---

## Non-Functional Requirements

- **Atomicity.** Validate-then-write across **both phases**. No byte —
  payload included — lands until every check on both phases has passed
  (F1 §NFR *Atomicity*, F1 US-13). Every file is written
  temp-then-rename, so a concurrent reader never sees a partial file.
  The journal precedes the first write and is removed only after the
  manifest lands. **The observable form of this requirement:** for every
  failure at F1 §F1.6 steps 1–6, a recursive byte-comparison of the
  directory before and after the run reports no difference, with no
  exclusions and `.harness/` included.
- **Determinism.** `init`'s output is a pure function of `(payload,
  parameter answers, scaffold selection)` — **three** inputs (C-46) — at
  every applied path with no exception (Q-54). No timestamp, absolute
  path, username, hostname, locale-dependent format or random value
  appears in any written file or in the manifest. Flag order, prompt-vs-
  flag provenance, and the order scaffolds were typed in are all invisible
  in the result.
- **Zero-bytes guarantee.** `.harness/` is created no earlier than the
  lock at F1 §F1.6 step 7. There is no path through `init` that creates
  it, a temp file, or a `.gitignore` entry ahead of that point.
- **Performance.** On a pack of ≤ 500 files totalling ≤ 8 MB, on a 2020
  laptop-class machine with a warm filesystem cache, and **excluding any
  time spent waiting for a human**: total `init` ≤ **3 s**, within which
  validation and the in-memory phase-2 render ≤ **1.5 s**, phase 1's copy
  ≤ **0.5 s** and phase 2's write ≤ **0.5 s** (F1 §NFR *Performance*).
  F2's own additions to that budget: argv parsing across **both** passes
  plus pack resolution ≤ **50 ms**, and rendering the disclosure ≤
  **50 ms**. `lintel harness init --rollback` over the same project
  completes in ≤ **1.0 s**.
- **Memory.** The entire phase-2 output set and the phase-2 **source**
  set are held in memory (C-23), bounded by F1's caps: single pack file
  ≤ 4 MB, total payload ≤ 32 MB, peak RSS ≤ 4× total rendered content.
  F2 adds no unbounded buffer: prompts read one line at a time and no
  answer may exceed its declared `maxLength`, whose hard ceiling is 4096.
- **Concurrency.** A writing command takes `.harness/lock`, acquired with
  an exclusive create. A second concurrent command fails fast with
  `E-LOCK-HELD` rather than interleaving. A lock is broken only under all
  three of F1's conditions and never silently.
- **Cross-platform.** Identical trees and identical manifests on macOS,
  Linux and Windows, modulo the executable bit. Every case- and
  normalization-sensitive comparison `init` makes — `E-TARGET-EXISTS`,
  `--force`'s byte-identity test and the journal's `preExisting`
  determination — folds by `collisionKey` on **every** platform,
  unconditionally (N-5).
- **No network.** `init` makes no network request of any kind. Packs are
  bundled (Q-2) and the payload is local (Q-41).
- **Offline privacy.** Nothing about a project or its parameter answers
  leaves the machine. There is no telemetry. Parameter answers are
  written verbatim into a **committed** manifest and are therefore as
  public as the repository (IM-15); `init` states this on success and
  refuses a parameter whose declaration looks like a credential (F1 US-8).
- **Non-interactive completeness.** `init` runs to `0` with stdin closed,
  no TTY, no agent runtime and no network, with every answer supplied by
  flags, for all three bundled packs (IM-2). This is a test, not an
  aspiration.
- **Diagnostic stability.** The **code** is the stable contract; message
  text is verbatim within a minor version and may be reworded across one
  (F1 §Error States). No consumer of `init` — CI or the skill — may be
  required to match prose.
- **Output legibility.** Diagnostics are plain text on stderr, readable
  with no colour, no terminal width assumption and no cursor control. The
  disclosure is one contiguous block on stdout with no interleaved
  diagnostic, so IM-10's substring test is decidable.

---

## Flows / Behaviour

### The drive, in F1's twelve steps

`init` adds no step to F1 §F1.6 and removes none. This is the same
sequence, annotated with **what F2 does at each** — the annotation is the
only thing here that is F2's.

```
lintel harness init <pack> [--scaffold …] [--set k=v] [--<alias> v] [--force]

  argv pass 1   group `harness` → command `init` → global flags → known
                init flags → the <pack> positional; every other token is
                DEFERRED, never judged                             0 bytes
   │
   1  .harness/ present?  journal → E-JOURNAL-PRESENT (2)
                          otherwise → E-ALREADY-APPLIED (1)        0 bytes
   2  resolve <pack> from the bundle; minCliVersion, pack
      formatVersion, recipe formatVersion                          0 bytes
  argv pass 2   re-parse with the resolved pack's `flag` aliases
                registered; ONLY NOW may a token be
                E-CLI-UNKNOWN-FLAG. Fail-closed here               0 bytes
   3  validate pack.json + recipe.json — US-16 checks 1–10         0 bytes
   4  collect answers: --set / alias → default → prompt (TTY only)
      select scaffolds: unknown, exclusive                         0 bytes
   5  realpath(project root) — resolved ONCE for the run           0 bytes
   6  planApply()  ← the ONLY read of the bundled pack
        phase 1 file list → payloadDigest over the PLANNED set
        phase 2 EVERY step rendered here, from those bytes
        US-16 checks 11–14 over the ONE combination the answers select
        manifest + SecurityDisclosure built here                   0 bytes
        └─ any failure → exit 1 or 2, ZERO bytes
      print the disclosure to stdout — enumerated, gating nothing  0 bytes
  ───────────────────────── the gate closes here ─────────────────────────
   7  take .harness/lock            (E-LOCK-HELD / W-LOCK-STALE-BROKEN)
   8  write .harness/journal.json (v2), both phases    ← the first byte
   9  PHASE 1 — payload verbatim to .harness/pack/, files 0644, dirs 0755
  10  PHASE 2 — write the bytes rendered at step 6; NO read of disk
  11  write .harness/manifest.json                 ← the LAST write
  12  delete journal + journal.d/, release the lock  ← apply complete
      print the next-steps block to stdout                       exit 0

  FAIL at 9, 10 or 11 → journal survives; `lintel harness init --rollback`
```

### Why the disclosure sits between step 6 and step 7

It is **pre-write**, so it must follow a plan that succeeded and precede
the first byte. Placing it before the lock also means a run that then
fails to acquire the lock has already told the user what it would have
done, and has contended for nothing. It gates nothing (Q-54, IM-11): no
prompt, no keypress, no flag. **It must still be emitted on every apply**
— on the conversational path the only copy the user ever sees is the one
the skill relays verbatim (IM-10), and a relay violation produces no
diagnostic and no non-zero exit, so the CLI emitting it is the whole of
the mechanism.

### Answer resolution, in precedence order

For each declared parameter of the base pack, then of each **selected**
scaffold, in `pack.json`-declared order:

1. **An `argv` answer** — `--set <id>=<value>` or the parameter's
   pack-declared `flag` alias. Both forms resolve to the same recorded
   answer under the parameter's `id`. Two `argv` answers for one
   parameter with **different** values is `E-PARAM-INVALID` (F1 US-8).
2. **A prompt** — only when **stdin and stderr are both a TTY**. The
   declared `prompt` is shown; a declared `default` is offered and an
   empty line accepts it.
3. **A declared `default`** — taken whenever there is no `argv` answer
   and no prompt was possible.
4. Otherwise: `E-PARAM-MISSING` when the parameter is `required`; see
   **Q-65** when it is not.

Every resolved answer is validated at collection — `maxLength` first,
then `pattern` (F1 US-8) — and every declared parameter of the base pack
and of the selected scaffolds is recorded verbatim in the manifest,
defaults included (F1 US-10). A parameter of an **unselected** scaffold is
neither collected nor recorded.

### The two-pass argv walk, stated as an algorithm

The reason for two passes is that the alias set is **unknowable until the
pack resolves**: `--calibration` is `planning`'s, read from `pack.json`
at parse time, and the CLI holds no pack-specific knowledge (F1 US-8).

- **Pass 1** recognises, in order: the fixed group token `harness`; the
  command token `init`; global flags; `init`'s own flags (`--scaffold`,
  `--set`, `--force`, `--rollback`); and the `<pack>` positional. Every
  other token is **deferred** — collected, not judged. Pass 1 raises no
  unknown-flag diagnostic.
- **Between the passes**, `<pack>` resolves and its `parameters[].flag`
  aliases are registered.
- **Pass 2** re-parses the whole `argv` with those aliases in the flag
  table. **Only here** may a token be `E-CLI-UNKNOWN-FLAG`, and parsing
  is fail-closed at the end of it: a deferred token that pass 2 does not
  consume is a diagnostic, never a silent drop.

The group token adds one **fixed** positional ahead of the command. A
fixed token is recognisable in pass 1 by construction, joins nothing to
the deferred set, and moves no fail-closed point (F1 US-8, Q-63).

### `--rollback`, as a command surface

`lintel harness init --rollback` is a **different invocation shape** from
an apply, not a modifier on one: it takes no `<pack>`, no `--set`, no
`--scaffold`, no alias and no `--force`. It reads `.harness/journal.json`
and hands it to F1's rollback, which applies the five-case table — **the
table is F1 US-13's and is not restated here**. What F2 owns is the
surface and the report: per path, whether it was deleted, restored or
kept; `W-ROLLBACK-KEPT` for each kept path; created directories removed
in reverse creation order and only when empty; then `.harness/` itself;
then exit `0` with the counts. With no journal present it writes nothing
and exits `0` (Q-68).

### What `init` never does

Stated because each is a plausible convenience that would break something
named above:

- It never **re-reads** a payload file, a template or an applied path
  between the plan and the manifest (C-23).
- It never **retries** a validation, a prompt or a write.
- It never writes a **partial** result, and never writes anything on a
  run that failed before the lock.
- It never **infers** a pack, a scaffold or an answer from the directory
  it is applying into (Q-44).
- It never **prompts** where nothing can answer (US-43), and never
  **pauses** for the disclosure (Q-54, IM-11).
- It never performs, offers to perform, or claims to have performed the
  judgment work that follows an apply (Q-1, IM-9).

---

## Open Questions

Feature-specific questions only. Ids are drawn from F2's reserved block
**Q-65…Q-69**; none is taken from outside it.

| # | Question | Owner | Default assumption |
|---|---|---|---|
| Q-65 | What does `init` record for a declared parameter that is **neither `required` nor given a `default`** and receives no answer? `PackManifest.parameters` is `Record<string, string \| boolean>` and F1 US-10 requires **every** declared parameter and its answer, so there is no absent value to record | F1 (manifest schema) | Record the type's empty value — `""` for `string`, `false` for `boolean`. An `enum` has no empty value, so an `enum` parameter that is neither `required` nor defaulted is a pack-authoring defect; **no F1 code covers it**, and `validate` should raise one rather than `init` |
| Q-66 | Which code does `--set <id>=<value>` raise when `<id>` names **no declared parameter** — including a parameter of a scaffold that was not selected? F1 has `E-PARAM-INVALID` (bad *value*), `E-CLI-UNKNOWN-FLAG` (unknown *flag*) and nothing for an unknown parameter **id** | F1 (catalogue) | Raise `E-PARAM-INVALID`, exit 1, zero bytes, until F1 adds a code. It is a poor fit — the message is about a value — so the fault can be asserted only by string match today |
| Q-67 | Which code does `init` raise when `<pack>` names **no bundled pack**? F1 §F1.6 step 2 says *resolve pack from the bundle* and names no failure code; `E-PACK-CLI-TOO-OLD` and `E-PACK-FORMAT-NEWER` both presuppose a resolved pack | F1 (catalogue) | Exit 1, zero bytes, naming the bundled packs, **with no code**, pending F1. By F1's own rule a different list and a different remedy make this a different code from `E-CLI-UNKNOWN-COMMAND`; it should be added in the change that decides who owns pack resolution |
| Q-68 | Which code does `init` raise when the **`<pack>` positional is absent** and `--rollback` was not given? `E-CLI-ARG-UNEXPECTED` covers a positional the command does **not take**, which is the inverse fault | F1 (catalogue) | Exit 1, zero bytes, printing the usage line, **with no code**, pending F1. `--rollback` with no journal is decided rather than asked: exit `0`, zero bytes, stating that no interrupted apply was found |
| Q-69 | On success, does `init` enumerate **every** path it wrote, or print counts plus the next-steps block only? The disclosure already enumerates the security-relevant subset; a second full enumeration would be the largest thing on stdout and would compete with it for a reader's attention | F2 / F6 | Counts plus the next-steps block only: files written per phase, the applied pack and version, the selected scaffolds, and the three outstanding items of IM-14. The complete list is available before the run from `lintel harness pack info` and after it from `lintel harness verify` |

---

## Resolved Decisions

Questions raised while writing this spec and settled within it. Ids stay
stable if any is ever revisited.

| # | Question | Decision | Date |
|---|---|---|---|
| — | May `init` prompt when stdin is not a TTY? | **No.** `init` prompts only when **stdin and stderr are both a TTY**; otherwise it prompts for nothing, reads nothing from stdin, and a required answer with none is `E-PARAM-MISSING`, exit 1, zero bytes. **No flag enables or disables prompting** — the reserved-flag list is F1 US-8's and is the whole list, so adding one would be a change to F1's format, and TTY detection needs no flag to be correct. Recorded here because [`../general/interaction-model.md`](../general/interaction-model.md) leaves it to F2 (IM-2 requires only that argv be sufficient; IM-8 has the skill supply everything up front) | 2026-09-01 |
| — | Does a prompt re-ask after an invalid answer? | **No.** The first answer failing `maxLength`, `pattern` or `values` is `E-PARAM-INVALID`, exit 1, zero bytes, at a prompt exactly as from a flag. F1 reads the code as *the user typed it and can retype it*, which is a re-run; one code path keeps the flag surface and the prompt surface indistinguishable to a test | 2026-09-01 |
| — | Where in the run is the disclosure printed? | **Between the plan and the lock** — after `planApply` returns `ok`, before `.harness/lock` is taken, therefore before any byte. On a failed plan nothing is disclosed and the diagnostic is the whole output. To **stdout**, as one contiguous block, so IM-10's substring test is decidable | 2026-09-01 |
| — | May `--rollback` be combined with an apply's arguments? | **No.** `lintel harness init --rollback` takes no `<pack>` (`E-CLI-ARG-UNEXPECTED`) and no other flag (`E-FLAG-NOT-PERMITTED`). It is a different invocation shape, not a modifier | 2026-09-01 |
| — | What does `--rollback` do with no journal present? | **Exit `0`, zero bytes**, stating that no interrupted apply was found. It is not a failure, so no code is needed and none is invented | 2026-09-01 |
| — | Does `init` pass `consent` / `ConsentInputs` to `planApply`? | **No.** The consent gate, `ConsentInputs`, `--accept-permissions`, `--accept-hooks` and `E-SETTINGS-CONSENT-REQUIRED` were deleted with `merge-json` (Q-54, F1 US-13). `F1-ADR-001`'s printed `ApplyInputs.consent` field is superseded by its own Q-54 box; F2 does not construct it. **A v1.1 that reintroduces a settings destination reintroduces the gate between the plan and the lock, in that position** (F1 §F1.9 obligations 2 and 3) | 2026-09-01 |
