# ADR-001 — Pack format, recipe & manifest: a closed primitive set, a six-key manifest, and a pack that can only write text

**Status:** Accepted — **rewritten 2026-08-31 against the two-phase model (Q-39…Q-53)**, then **amended 2026-08-31** to apply the answered `.harness/README.md` escalation and to specify the Q-50 `validate` check, then **amended again 2026-08-31** to repair six conditions the rewrite silently lapsed and to fold the Mode A re-review's C-19…C-30, then **amended 2026-08-31 by Q-54**, which **overturns §3.8** and voids every part of this ADR that reasons about `merge-json` — see *What Q-54 supersedes* immediately below the amendment history, and read it before §1 — and then **amended 2026-09-01 against F1 v3.0** for Q-62, Q-63, Q-79 and Q-81, which is the larger of the two supersession boxes and the one a reader compiling against this contract needs: see *What Q-62, Q-63, Q-79 and Q-81 supersede*
**Date:** 2026-08-31 (supersedes the 2026-08-30 original in full)
**Deciders:** `architect` (this ADR) · escalations to Thomas Andersen
**Refs:** `specifications/general/pack-application.md` (**authoritative** — the two-phase model) · `specifications/general/pack-inventory.md` (**authoritative** — the three packs, source and applied trees) · `F1-spec-pack-format-and-manifest.md` **v2.1** (this ADR's §6.1 folded) · `F5-spec-template-packs.md` **v2.0, second pass** (§6.2 folded) · `LintelHarnessSpecification-1.0.md` · `specifications/project-brief.md` §12 (Q-1…Q-53, **all resolved, authoritative**) · `packs/coding/specifications/conventions.md` · **security review of 2026-08-30** (Mode A over F1 v1.0 + ADR-001 original: `REVISE-SPEC`, S-1…S-14, conditions C-1…C-18 — re-dispositioned in §8)

**Template deviation, declared:** this is a feature-scoped ADR
(`adr-feature.template.md`) that additionally carries the **file-level
plan** and **public interface contract** sections of
`adr-epic.template.md`. F1 is greenfield — there is no code — and F2, F5
and F6 all compile against or author against what F1 exposes, so the
contract is locked here or each of them invents its own. That is the same
justification `conventions.md` §ADR shape gives for the security-review
exception to "one page".

**Amendment history**

| Date | Pass | Summary |
|---|---|---|
| 2026-08-30 | Initial | Settled six F1↔F5 contract conflicts; closed Q-13, Q-15, Q-18…Q-27. Verdict `PROCEED`. |
| 2026-08-30 | Security remediation | Folded the Mode A finding (`REVISE-SPEC`, C-1…C-18). Added §7 Security architecture and §8 conditions. |
| **2026-08-31** | **Two-phase rewrite** | **Written against Q-39…Q-53. The 2026-08-30 verdict does not transfer and is void.** The declarative `mappings` model, `.harness/base/`, the marked-region grammar, `source-only`/`applied-only`, `shared/` components, `--adopt` and the per-file-hash manifest are all **gone** — not deferred, removed. The apply becomes **two phases**: a verbatim payload copy to `.harness/pack/`, then a **declarative recipe** over seven closed primitives. The manifest becomes **six keys** (Q-43 as amended by Q-52). `verify` is F1's (Q-53). The file-level plan is **rebuilt**; 14 modules of the old plan are deleted and 13 are new. §7's security architecture is **carried forward and rescoped**, not rewritten: both CRITICALs were apply-time and survive intact. Verdict: **`REVISE SPEC`** — see §10. |
| **2026-08-31** | **Mode A re-review folded: C-19…C-30, and six lapses admitted** | **The re-review verified the carried conditions against F1 v2.2's actual text rather than against §8's table and found C-1, C-2, C-5, C-8, C-12 and C-16 measurably lapsed — the rewrite re-opened the original CRITICAL S-1 through a route the first review never saw, because the seven-primitive set post-dates it.** Root cause, single and stateable: every settings control was quantified over a step's **`to`**, and two of the seven primitives have none. **The model moves from `to`-keyed to WRITTEN-PATH-keyed** (§7.2.0, C-19) — the destination policy, the reserved-destination denylist and the executable rules are all evaluated over each step's **write set**. `policyFor` resolves by `collisionKey` on every platform (C-20). The `merge-json` destination's prior content is named a **fourth input** and `verify` gains a `partial` state (C-22, §7.9). **F-5 is decided: phase 2 renders entirely at plan time** (C-23, §3.6). **F-10 is decided: accepted with reasoning AND enumerated in the disclosure** (C-28, §3.7). `Recipe.formatVersion` joins the closed enumeration (C-24); authored JSON rejects duplicate keys (C-25); phase 1 writes `0644` (C-26); `in` globs get a normative resolution rule (C-27); manifest read-back gets its own class-2 code (C-29); recipes get a 256-step inspectability bound (C-30). Four new codes, one new module, **no new US or Q id**. §8 is rewritten with `LAPSED-AND-NOW-REPAIRED` as a category. Verdict: **`REVISE SPEC`** — §10. |
| **2026-08-31** | **Escalation answered: `.harness/README.md` is dropped** | §3.4's escalated branch was answered **option C**, recorded in `project-brief.md` §12 as an amendment to Q-50: **`.harness/` is excluded from the folder-README rule as tool-owned, exactly as `.claude/` is.** There is no `.harness/README.md`, no CLI write that produces one, and **C-5 is absolute with no carve-out** — which is what §7.1's own argument asked for, since `.harness/pack/` is phase 2's input. `packs/coding/applied-readmes/harness.md` is deleted from disk; the folder holds five files. §6.1 change 3 is withdrawn; §1, §3.4, §4, §5, §7.1, §8 (C-5), the interface contract and the file-level plan are amended. **New in the same pass:** `validate` gains a mechanical Q-50 check (`W-FOLDER-README-MISSING`, US-16 order step 12) and `pack.json` gains `folderReadme` — see §3.5 and §6.1 changes 12–16. **Verdict re-examined in §10 and it moves**: the three folds it blocked on are all landed and verified (F1 v2.1, F5 v2.0's second pass, the master spec's 1.0.0 fold), so it stands at **`REVISE SPEC` narrowed to §6.1 changes 12–16 and §6.2 changes 10–11 — the new `validate` check this pass added, and nothing else.** A Mode A re-review is still required before implementation, separately from this verdict. |
| **2026-08-31** | **Q-54 overturns §3.8 — `merge-json` is dropped from v1.0** | **§3.8 chose option A — keep the seven-primitive set — and recorded option B, dropping `merge-json`, as available and rejected. The re-reviewer took B, and the brief §12 records it as Q-54.** §3.8 is **restated as overturned** with its original argument kept verbatim as history, because a reversal that hides what it reversed is worth less. The primitive set is **six**: `copy`, `rename`, `strip-suffix`, `rewrite-path`, `substitute`, `generate`. Everything in this ADR that reasons about `merge-json` is **superseded, not deleted**: the destination policy and `DestinationPolicy.allowedOps`, `ownedKeys` and the ownable-key allowlist, the leaf-only rule, `policyFor`, the consent gate and `ConsentInputs`, `E-OWNEDKEY-FORBIDDEN` / `E-SETTINGS-MODE-FORBIDDEN` / `E-SETTINGS-CONSENT-REQUIRED` / `E-SUBST-IN-SECURITY-KEY` / `E-MERGE-JSON-INVALID` / `E-HOOKS-NOT-SUPPORTED`, `verify`'s `partial` state, and N-6. **§6.1 change 27's fixture list is corrected** — it named `merge-json` and `ownedKeys` fixtures that cannot exist — and now points at F1 v2.3's restated table, which is the one of record. **The verdict does not move in this pass** and is not re-examined here: the fold into F1 and a further Mode A pass decide it. **No new question, no new story, no new error code:** next free question id **Q-55**, next free story id **US-39**. |
| **2026-09-01** | **F1 v3.0 — Q-62, Q-63, Q-79 and Q-81 folded; this ADR was six versions behind and is now current** | **This is a reconciliation, not a new decision.** F1 moved 2.1 → 3.0 while this ADR stood still, and four of those moves change the **contract**, which is the one part of an ADR that is not merely a record: downstream features compile against it. **Q-63** — the binary is `lintel` with `harness` as a **command group**, so `main.ts` dispatches a group then a command, and the surface is **five** commands, not four. **Q-62** — `update` is v1.0 and is **F3's**, so `src/cli/commands/update.ts` moves out of the *never planned* table and into the plan as F1→F3, exactly as `init.ts` is F1→F2; `src/manifest/drift.ts` stays deleted, because **Q-62 builds no merge engine** and classification is `verify`'s recomputation, not a drift module. **Q-79** — `RecipeStep` gains `adaptExpected` **and `fillExpected`**, and `VerifyState` becomes **six** values. **Q-81** — zero runtime dependencies becomes a *requirement*, which turns four "hand-rolled or a library" rows into hand-rolled modules, adds `src/semver/compare.ts` and `src/claude/frontmatter.ts` as **deliberate** modules rather than wrappers, deletes `vitest.config.ts` in favour of `node:test`, and narrows `collisionKey` in `confine.ts` to **ASCII** case-folding. **The contract types below are rewritten to current rather than annotated**, departing from this ADR's supersede-don't-delete convention on purpose: §1's other half is a *record*, but the contract is a thing people compile against, and a stale type with a footnote is a stale type. **The Q-54 box's convention is preserved for everything it covers.** **No new question, no new story, no new code:** the nine codes F1 v3.0 added are F1's to define and are named here only where a module raises them. Verdict unchanged and not re-examined — still `PROCEED`, and §10.1's superseded verdict stays where it is. |
| **2026-08-31** | **Final Mode A pass folded — and the security gate is closed by decision, not by a verdict** | **Read this row before treating the set as cleared.** The **fourth** Mode A pass, run over **F1 v2.4 / F5 v2.2**, returned **`REVISE-SPEC`** — **3 HIGH, 3 MEDIUM, 4 LOW, and no CRITICAL**, with **36 of 38** conditions holding. **The HIGHs and MEDIUMs are folded:** C-39, C-40, C-41, C-43, C-45 and C-48 into **F1 v2.5**; C-42, C-44 and C-46 in this same pass, into `general/pack-application.md` (the *Reads from* cell and the flowchart node still stated the **execute-time** read C-23 ruled out, and the phase-1 sentence still said *"no validation beyond path confinement"*), `general/pack-inventory.md` (C-37 dispositioned by number; the *"created empty"* claims Q-50 makes impossible removed), `LintelHarnessSpecification-1.0.md` (C-37 cited in its residue-pass row; the determinism claim corrected to F1's **three** inputs) and **F5 v2.3** (C-40's F5-side evidence: the agent-frontmatter key list restated as descriptive of the runtime, `permissionMode` excluded from what a pack may declare, and the widened reserved-destination list confirmed against the **Azure** scaffold). **`C-47` and the remaining LOW residue are ACCEPTED for v1.0**, with their requirements and their tests recorded rather than waived — accepting a finding is a commitment to build it. **The gate closes by decision after four review rounds. No `SECURITY-PROCEED` verdict exists against any revision of F1, F5 or this ADR, and none is claimed here; a reader must not mistake this for a clean pass** — the standing security verdict of record is `REVISE-SPEC`. What the decision rests on is the **trajectory**, which is the honest form of the argument: **2 CRITICAL → 2 CRITICAL → 0 CRITICAL / 2 HIGH → 0 CRITICAL / 3 HIGH**, with conditions holding rising **24/31 → 36/38**, no lapsed condition in either of the last two rounds, and nothing in the fourth round that moves the architecture. **This row does not change §10's verdict line**, which is the lead's to set, and folding an ADR has never substituted for a verdict. **No new question, no new story, no new error code:** next free question id **Q-55**, next free story id **US-39**. |
| **2026-09-01** | **Q-63 rename applied** | **The binary is `lintel`, `harness` is a command group, and the package is `@lintel/cli`** (brief §12 Q-63, amending Q-16). §1's platform sentence and the `package.json` row of the file-level plan carry the new names; the `src/cli/commands/*` rows now read `lintel harness <command>`. **§6.1's quoted catalogue rows are renamed with them, deliberately**: those rows are instructions to F1 and F1 has executed them, so leaving the two texts disagreeing would invite a later reader to re-fold a change already folded. What each row *decided* is untouched; only the spelling of the binary inside the quoted message strings moves. **No decision in this ADR is reopened, no condition changes disposition, and no verdict moves** — the standing security verdict of record remains `REVISE-SPEC`, as the row above states. No new question, no new story, no new error code: next free question id **Q-64** (reserved), next free story id **US-39**. |

---

## What Q-54 supersedes — read this before §1

**This ADR was written against a seven-primitive recipe set. The set is
six.** `merge-json` is dropped from v1.0 by **Q-54** (brief §12,
2026-08-31), which is the reviewer taking the option §3.8 recorded as
available and then rejected. **Q-54 is authoritative over this document
wherever the two disagree**, and F1 **v2.3** is the current statement of
the format.

Nothing below is deleted, because an architecture decision record that
edits away the reasoning it was overruled on stops being a record. It is
**marked** instead. Read every one of the following as *history —
superseded 2026-08-31*, never as current design:

| Construct in this ADR | Status under Q-54 | Where the current statement lives |
|---|---|---|
| The **seven**-primitive set and the seven-arm `RecipeStep` union (§1 item 1, §7.7, the interface contract) | **Six.** `merge-json` and its arm are gone | F1 v2.3 US-31, `general/pack-application.md` |
| The **destination policy**, `DestinationPolicy`, `allowedOps`, the policy table and its fall-through row (§7.2) | **Removed, not repaired.** There is no destination policy at v1.0 | Q-54; F1 v2.3 US-3 stage 2 |
| **`ownedKeys`**, the ownable-key allowlist, the security-relevant key classification, the leaf-only rule, `checkOwnedKey` | **Removed.** No pack owns a settings key | Q-54 |
| **`policyFor`** and its `collisionKey` resolution (C-20) | **The function is gone; its `collisionKey` rule survives**, re-homed on the stage-2 denylist and on `E-TARGET-EXISTS` / `--force` / `preExisting` (N-5) | F1 v2.3 US-3, US-13 |
| The **consent gate**, `ConsentInputs`, `--accept-permissions`, `--accept-hooks`, `SecurityDisclosure.settings` | **Removed. There is no consent surface at v1.0**, because there is nothing to consent to | Q-54; F1 v2.3 US-13 |
| `E-MERGE-JSON-INVALID`, `E-OWNEDKEY-FORBIDDEN`, `E-SETTINGS-MODE-FORBIDDEN`, `E-SETTINGS-CONSENT-REQUIRED`, `E-SUBST-IN-SECURITY-KEY`, `E-HOOKS-NOT-SUPPORTED` | **Not in the catalogue.** Six codes removed, four added; the catalogue holds **76** | F1 v2.3 §Error States — **the only catalogue** |
| `verify`'s **`partial`** state and the fourth-input narrowing (§7.9, C-22) | **Not applied, deliberately.** With `merge-json` gone the recomputation identity is exact at every applied path | F1 v2.3 §NFR, US-33 |
| **N-6** — "`merge-json` has no v1.0 consumer" (§7.8) | **Closed by deletion.** The primitive with no consumer is not shipped | §3.8 as restated |
| **§6.1 change 27's** fixture list, where it names `merge-json` / `ownedKeys` fixtures | **Corrected in place.** Those fixtures cannot exist | F1 v2.3 US-16's fixture table |
| §9 item **10**'s obligation on "the first real pack to declare a settings `ownedKeys`" | **Superseded.** The v1.1 obligation is now on the settings capability's return, not on a pack | §9 item 10 as restated |

**Three things Q-54 does *not* touch**, and they are the load-bearing
half of this ADR: the **two-phase model**, the **six-key manifest**, and
**C-19's written-path quantifier**. C-19 survives its own subject — the
finding beneath it was that a rule quantified over `to` has two silent
exemptions, because `rewrite-path` and `substitute` have no `to`, and
that is **general**. The **write set** is therefore still a named concept
and every destination rule is still quantified over it. It is what keeps
`rewrite-path` and `substitute` out of `package.json` now that there is
no `merge-json` to be the obvious route.

**One thing that changed and is not a deletion:** the executable bit now
has a **consumer**. `coding` declares
`"executableRoots": ["infrastructure/backend-deploy/"]` and its backend
scaffold sets `"executable": true` on `deploy.sh`, `deploy.ps1`,
`setup-neon.sh` and `setup-neon.ps1`. §7.4's apparatus — declared roots,
the cap of 32, `E-EXEC-DEST-FORBIDDEN`, the enumerated disclosure — is
exercised rather than dormant, which is the correction §3.8's option-A
argument most needed. Where §7.4 or §8 says or implies that no v1.0 pack
ships an executable file, **that is superseded**: F5 §NFR *Content
integrity* and F1 US-3 carry the current statement.

---

## What Q-62, Q-63, Q-79 and Q-81 supersede — read this with the Q-54 box

**This ADR was written against F1 v2.1. F1 is at v3.0.** Six spec
versions of movement land here, and unlike the Q-54 box — which recorded
a decision *reversed* — this one records a contract that fell **behind**.
The distinction matters for how to read it: nothing below was ever
argued for in this ADR and then overturned. It was decided elsewhere,
correctly, while this document stood still.

**F1 v3.0 is authoritative wherever the two disagree.** What changes:

| What | Was, in this ADR | Is, at F1 v3.0 | Source |
|---|---|---|---|
| The command surface | Four commands, no group: `init`, `validate`, `verify`, `pack` | **Five commands under a group** — `lintel harness init \| update \| validate \| verify \| pack`. `main.ts` dispatches a **group** and then a command; the command is the **second** positional | Q-62, Q-63 |
| `update` | *"Never planned; named so their absence is deliberate"* | **v1.0, and F3's.** `src/cli/commands/update.ts` is planned as **F1→F3**, exactly as `init.ts` is F1→F2. **`src/manifest/drift.ts` stays deleted**: Q-62 builds no merge engine, and classification is `verify`'s recomputation against a locally recomputed `expected_old`, not a drift module | Q-62 |
| `VerifyState` | `match \| partial \| differs \| missing`, with `ownedKeysChecked` | **`match \| adapted \| filled \| unfilled \| differs \| missing`** — six. `partial` and `ownedKeysChecked` are gone with `merge-json` (Q-54 already said so); `adapted`, `filled` and `unfilled` are new | Q-54, Q-56, Q-79 |
| `RecipeStep` | No per-step declaration of expected change | **`adaptExpected`** and **`fillExpected`**, optional booleans on every arm, **mutually exclusive** | Q-56, Q-79 |
| The journal | Version **2**, entries with no `intent` | **Version 3**: every entry carries `intent: 'write' \| 'delete'`, and the journal records **which command wrote it** | Q-62 |
| Dependency posture | *"no runtime dependency outside Node stdlib for hashing, JSON and fs"* — a scoped permission | **Zero runtime dependencies, as a requirement**, over the whole package. Four rows that read "hand-rolled *or* a library" become hand-rolled modules, and two new modules are named rather than assumed | Q-81 |
| `collisionKey` | *"NFC + case-fold"*, unscoped | **NFC + ASCII case-fold**, a documented narrowing of a security control (F1 known limit 17) | Q-81 |
| Test runner | `vitest.config.ts` in the file plan | **`node:test`.** It ships with Node 22, so it is not a dependency in either budget, and the config file is deleted | Q-81 |

**The contract in §1 is rewritten to current, not annotated.** This
departs from the convention the Q-54 box follows, and does so on
purpose: the rest of §1 is a *record* of a decision, but the **public
interface contract is a thing F2, F3, F5 and the test writer compile
against**, and a stale type carrying a footnote is still a stale type.
The Q-54 box's convention is untouched for everything it covers — those
shapes stay visible as the record of what was decided and overruled,
because they were argued here.

**What does not change, and is worth saying because a reader of a
six-version amendment will assume otherwise:** the planner/executor
split, the path brands, `stepWriteSet()`, the plan-time render (C-23),
the five-case rollback rule, the manifest's **six keys**, and the
verdict. **`PROCEED` stands and is not re-examined in this pass.**

---

## 1. Decision

F1 is built as a **pure planner plus a thin effectful executor**, and a
pack is **a text-file distribution channel with a declared, closed
procedure attached to it**. Five things are settled here and are as much
part of the frozen contract as the pipeline order:

1. **The apply is two phases, and the seam is the contract.** Phase 1 is
   a verbatim copy of the pack directory to `.harness/pack/`, identical
   for every pack, reading no field of `pack.json` but the pack's
   location. Phase 2 is a per-pack **recipe** — an ordered list of steps
   over a **closed** primitive set — run by the CLI, never by the user,
   reading only from the phase-1 copy on disk. The set is closed by
   *type*: `RecipeStep` is a discriminated union and an `op` outside it
   is `E-RECIPE-PRIMITIVE-UNKNOWN`, exit 2, before anything runs.
   **Superseded on the count only (Q-54): the set is SIX** — `copy`,
   `rename`, `strip-suffix`, `rewrite-path`, `substitute`, `generate` —
   and the union has six arms. This ADR was written with `merge-json` as
   a seventh; everywhere below that says *seven-primitive* or
   *seven-arm*, read **six**, and see *What Q-54 supersedes* above.
   Nothing else in this item moves: closure by type, the code and the
   exit class are unchanged, and closure is the property that mattered.

2. **Two files, and no third concept.** `pack.json` declares identity,
   anatomy, parameters and scaffolds — what a human reads to choose a
   pack. `recipe.json` declares the procedure — what only an apply reads.
   There is **no `contentRoot`**, because phase 1 copies the folder.

3. **The manifest is six keys**, not five: `manifestVersion`, `cli`,
   `pack`, **`payloadDigest`**, `parameters`, `scaffolds`. Q-43 removed
   the per-file hash list and `.harness/base/` because the applied tree
   is recomputable; Q-52 puts back **one** hash — a single tree digest
   over `.harness/pack/` — because the recomputation otherwise *trusts*
   the payload, and a `verify` that cannot say which side moved is a
   `verify` that reports a hand-edited payload as clean. One digest, one
   tree walk, and determinism is untouched: the digest is a pure function
   of the payload.

4. **`verify` is F1's**, alongside `validate` and `pack info` (Q-53).
   All three read a pack or a manifest, write nothing, take no lock, and
   exist to make the format checkable. F2 owns the apply and nothing
   else. The v1.0 command surface is therefore **four** commands, not
   one.

5. **A pack has no route to execute code on the user's machine, and that
   is a property of the format rather than of the packs that happen to
   ship.** Confinement is by *resolution*, not by string inspection; the
   settings keys a pack may own are a CLI-owned allowlist keyed on the
   **destination**; security-relevant grants are enumerated verbatim and
   consented to before a byte is written; **no pack may register an agent
   hook at v1.0** — `hooks` is outside the ownable set entirely, by format
   decision rather than by consent design; and every value in a
   behaviour-selecting position is fail-closed. That is §7, carried
   forward from the 2026-08-30 remediation pass and rescoped where the
   model moved under it.

Three consequences of the settled model are recorded here because they
change what F1 must specify. The first two are folded into F1 **v2.1**;
the third is new in this pass and is not yet folded:

- **Q-50 dissolves the empty-directory problem rather than solving it.**
  Every folder an apply creates carries a README (`README.md` for
  `coding` and `planning`, `index.md` for `writing`; **`.claude/` and
  `.harness/` excluded, both tool-owned**), so **no folder is ever
  empty**. There is **no `mkdir` primitive**, no eighth primitive, no
  `skeleton/` tree and no `.gitkeep`. The coding pack's five new folder
  READMEs are ordinary `rename` steps out of
  `packs/coding/applied-readmes/`, which already exists on disk. F1
  v2.0's `skeleton/specifications/` step and its "an empty directory is
  not representable" known limit are **superseded** and must come out.

- **`.harness/` is tool-owned and carries no README, so C-5 is
  absolute.** This ADR originally decided the opposite (§3.4 option A:
  the CLI writes `.harness/README.md` from `applied-readmes/harness.md`)
  and escalated the alternative. **The escalation was answered on
  2026-08-31 in favour of dropping the file** — recorded in
  `project-brief.md` §12 as an amendment to Q-50. `.harness/` is excluded
  on exactly the grounds Q-50 already excludes `.claude/`, and is
  arguably *more* tool-owned: a user edits agent files, but must never
  edit the payload. **There is no `.harness/README.md`, no CLI write that
  produces one, and no carve-out in C-5.** The CLI writes five things
  under `.harness/` — the payload, the manifest, the journal,
  `journal.d/` and the lock — and that list is complete.

- **`validate` checks Q-50 mechanically.** Under Q-50 the recipe's
  destination set *is* the pack's folder-README set, so the rule is
  decidable from the pack alone. `validate` reports
  `W-FOLDER-README-MISSING` for any directory the applied output implies
  that receives no folder README, and `pack.json` gains an optional
  `folderReadme` basename (default `README.md`; `writing` declares
  `index.md`). See §3.5.

### File-level plan

Greenfield TypeScript, ESM, **Node ≥ 22** (Q-16), **zero runtime
dependencies** — a requirement over the whole package as of **Q-81**, not
the scoped "for hashing, JSON and fs" permission this line used to carry.
Published as
`@lintel/cli`, binary `lintel`, with `harness` as a command group (Q-16 as
amended by Q-63). Unit tests live alongside
each module (`*.test.ts`, owned by `implementer`); the integration tree
is `tests/` (owned by `testwriter`).

**Owner** column: *F1* = built and tested under F1; *F1→F2* = F1 defines
and ships it, F2 drives it from the `init` command.

#### Deleted from the pre-rewrite plan — 14 modules, and why

These are not deferred. The concepts they implemented no longer exist.

| Removed module | Because |
|---|---|
| `src/render/pipeline.ts` | The nine-step render pipeline is replaced by an ordered recipe; ordering authority moves to `recipe/plan-steps.ts` |
| `src/render/resolve-mappings.ts` | There are no `mappings` (Q-40) |
| `src/render/region-lexer.ts` · `region-parser.ts` · `region-apply.ts` | No region parser at v1.0 (Q-45). Anchors are inert text |
| `src/render/contribute.ts` | Scaffold `contributes` existed only to append into a base-pack region (Q-45) |
| `src/render/eol.ts` | Its job was the always-LF base copy; `.harness/base/` is gone (Q-43) |
| `src/fs/base-store.ts` | No `.harness/base/`, no `.harness/.gitattributes` (Q-43) |
| `src/manifest/drift.ts` | Drift reporting is F3 (Q-42) |
| `src/pack/shared.ts` | No `shared/` mechanism at v1.0 (Q-48) |
| `src/security/content-policy.ts` | Its consumer is `contribute` (Q-42). **The obligation survives — see C-18 in §8** |
| `src/cli/commands/status.ts` · `contribute.ts` | Never planned; named so their absence is deliberate rather than forgotten. **`status.ts` stays deleted for a new reason** (Q-62): `status` is not a command, it is `update`'s read-only mode, so it is a flag branch inside `update.ts` and not a module. `contribute.ts` stays deleted with F4 (Q-42) |
| ~~`src/cli/commands/update.ts`~~ | **No longer deleted (Q-62).** `update` returned to v1.0 as F3's; the module is in the plan below as **F1→F3**. The row is kept struck rather than removed so that a reader of the v2.1-era plan sees the reversal |

#### The v1.0 plan

> **Superseded in part, 2026-08-31 (Q-54).** Three module rows below have
> no subject and are **not built**:
> `src/recipe/ops/merge-json.ts`, `src/security/destination-policy.ts`
> (the ownable-key allowlist and policy table — the *reserved-destination
> denylist* it also housed survives and moves to the confinement module),
> and `src/security/consent.ts`'s **gate** (`renderDisclosure()` and the
> `SecurityDisclosure` builder survive; there is nothing to gate on, so
> `E-SETTINGS-CONSENT-REQUIRED` and the gate call in
> `src/apply/execute.ts` come out). `src/verify/compare.ts` is
> **two-state**, not four: no `partial`, no owned-key recomputation.
> Everything else in the plan stands. **Count of record is F1 v2.3's**,
> not this table's.

| File | Action | Owner | Purpose |
|---|---|---|---|
| `package.json`, `tsconfig.json` | New | F1 | `@lintel/cli`, bin `lintel`, `engines.node >= 22` (Q-16, amended by Q-63). **`dependencies` is `{}` and a test asserts it** (Q-81). **No `vitest.config.ts`** — the runner is `node:test`, which needs no config file and is not a dependency in either budget |
| `src/index.ts` | New | F1 | Library entry; re-exports exactly the interface contract below |
| **diagnostics** | | | |
| `src/diag/codes.ts` | New | F1 | The single code taxonomy: `DiagnosticCode` union, severity, code→exit-class map |
| `src/diag/catalogue.ts` | New | F1 | Code → message template. **The only place user-facing CLI text exists** |
| `src/diag/diagnostic.ts` | New | F1 | `Diagnostic`, `DiagnosticBag`, `exitCodeFor()` |
| **CLI** | | | |
| `src/cli/main.ts` | New | F1→F2 | argv dispatch over a **group** and then **five** commands — `lintel harness init \| update \| validate \| verify \| pack` (Q-62, Q-63). The command is the **second** positional. `Diagnostic[]` → stderr → exit code. `E-CLI-UNKNOWN-COMMAND` is scoped to the command slot; **an unknown *group* has no code at v1.0** and is F1 known limit 16, recorded rather than invented |
| `src/cli/flags.ts` | New | F1→F2 | Per-command flag table, **two-pass parse** (pack-declared aliases resolve in pass 2), `--set`, `--scaffold`, `--json`, `--strict`, the four `E-CLI-*` codes and `E-FLAG-NOT-PERMITTED`. **The reserved-flag list is nine** (Q-62): `--set`, `--scaffold`, `--json`, `--strict`, `--force`, `--rollback`, `--all`, `--dry-run`. `--dry-run` is reserved although no F1 command accepts it — it is `update`'s read-only mode, and a pack that has claimed the alias first would shadow it |
| `src/cli/commands/validate.ts` | New | F1 | `lintel harness validate <pack> \| --all` (US-16) |
| `src/cli/commands/verify.ts` | **New** | F1 | `lintel harness verify` (US-33, Q-53). Writes nothing, takes no lock |
| `src/cli/commands/pack-info.ts` | New | F1 | `lintel harness pack info <name>` — renders `PackReport` (US-29) |
| `src/cli/commands/update.ts` | **New (Q-62)** | F1→F3 | `lintel harness update [--dry-run]`. F1 ships the module boundary and the flag; **F3 owns the behaviour**, exactly as F2 owns `init`'s. `--dry-run` is the read-only mode that was formerly the `status` command |
| **pack.json** | | | |
| `src/pack/types.ts` | New | F1 | `PackJson`, `AnatomyDecl`, `ParameterDecl`, `ScaffoldDecl`. **No `Mapping`, no `SharedRef`, no `ComponentJson`** |
| `src/pack/schema.ts` | New | F1 | Hand-rolled structural validator. Unknown **keys** → warning; unrecognised **values in a behaviour-selecting position** → `E-UNKNOWN-VALUE`, exit 2 (C-16) |
| `src/pack/load-pack.ts` | New | F1 | Resolve `packs/<name>/`, parse `pack.json` and the declared `recipe`. Uses `fs/walk.ts`. Resolves **no** shared reference — there are none |
| `src/pack/anatomy.ts` | New | F1 | Nine-part completeness, the three-value status, the report rows, `E-ANATOMY-SOURCE-ON-ABSENT` |
| `src/pack/parameters.ts` | New | F1 | Declaration rules, `pattern`/`maxLength` compilation and enforcement (C-7), answer resolution **at collect time and again on every read-back from the manifest**, flag-alias registration, combination enumeration (≤ 32) |
| `src/pack/scaffolds.ts` | New | F1 | Selection by id; **`category` exclusivity** (`E-SCAFFOLD-EXCLUSIVE`, Q-17); declared-order composition; the static pairwise collision matrix over differing categories |
| **the recipe — new group, and the heart of the rewrite** | | | |
| `src/recipe/types.ts` | **New** | F1 | `Recipe`, `RecipeStep` (the seven-arm discriminated union), `RECIPE_OPS` |
| `src/recipe/schema.ts` | **New** | F1 | `recipe.json` validator. `E-RECIPE-INVALID`, `E-RECIPE-PRIMITIVE-UNKNOWN`, `E-RECIPE-STEP-INVALID`. **Fail-closed and total**: every step is narrowed to exactly one union arm or rejected |
| `src/recipe/ops/index.ts` | **New** | F1 | The **closed registry**: the only place an `op` name maps to an implementation. A new primitive is a change here and in `types.ts`, deliberately |
| `src/recipe/ops/copy.ts` | **New** | F1 | Directory recursion in **byte-ascending path order**, `exclude` globs, basename invariance for a file `from`, `executable` |
| `src/recipe/ops/rename.ts` | **New** | F1 | One file in, one file out, basename may differ. Directory `from` → `E-RECIPE-STEP-INVALID` |
| `src/recipe/ops/strip-suffix.ts` | **New** | F1 | Declared literal `suffix` (`^\.[a-z0-9-]{1,16}$`), no implicit `.template` |
| `src/recipe/ops/rewrite-path.ts` | **New** | F1 | Literal find/replace over already-written applied text files, with hit counting for `E-REWRITE-UNUSED` |
| `src/recipe/ops/substitute.ts` | **New** | F1 | `{{harness:…}}` only, plus the `{{harness:lit:X}}` escape, resolved once and never re-scanned. Every other `{{…}}` untouched. **Context-aware: JSON-string-escapes into a `merge-json` target; bans a line break in any substituted value (C-7, C-9)** |
| `src/recipe/ops/generate.ts` | **New** | F1 | Render a payload template, substitute, then run `anchors.ts`'s assertion |
| `src/recipe/ops/merge-json.ts` | **New** | F1 | Allowlist and leaf-only enforcement, owned-key merge, order-preserving serializer, **re-parse-and-deep-equal verification**. No removal-honouring merge at v1.0 (C-3 defers) |
| `src/recipe/anchors.ts` | **New** | F1 | The **literal line count** of US-32 — not a parser, not a grammar. `E-ANCHOR-INVALID` |
| `src/recipe/plan-steps.ts` | **New** | F1 | Merge base steps with each selected scaffold's steps in **`pack.json`-declared scaffold order**; `when` filtering; the edit-before-place ordering check |
| `src/recipe/glob.ts` | **New** | F1 | The one bounded glob matcher, used by `exclude`, `in` and anatomy `paths`. **SEC (C-27): an `in` glob's resolution domain is the plan's ordered written-set — `readonly AppliedPath[]` — and the matcher takes no filesystem handle, so "resolve against disk" is not expressible** |
| `src/recipe/write-set.ts` | **New** | F1 | **SEC (C-19), and the keystone of the 2026-08-31 re-review fold.** `stepWriteSet(step, writtenSoFar)` — every applied path a step's bytes create or change, per op. The **only** input to the destination policy, the stage-2 denylist and the executable rules. Pure, project-free, total over the seven-arm union |
| `src/claude/frontmatter.ts` | **New (Q-81)** | F1 | **SEC.** The `.claude/` frontmatter reader, hand-rolled and named as its own module because **three codes ride on it** — `E-CLAUDE-TOOL-GRANT`, `E-CLAUDE-PERMISSION-MODE` and US-13's disclosure row 4. Must report a **line number**, fail **closed** on an unparsed block, and reproduce the block **verbatim** for the disclosure (never re-serialise). Its absence from the v2.1 plan was a real gap, not a simplification |
| `src/semver/compare.ts` | **New (Q-81)** | F1 | Hand-rolled parse and total compare — about thirty lines. **No range arithmetic**: `minCliVersion` is a floor, not a range. Consumers are `E-PACK-CLI-TOO-OLD`, `E-PACK-FORMAT-NEWER`, `W-PACK-NEWER-THAN-CLI` and, at F3, `E-UPDATE-NOT-NEWER` |
| `src/json/parse-strict.ts` | **New** | F1 | **SEC (C-25).** The only parser for **authored** JSON — `pack.json`, `recipe.json`, `manifest.json`. Rejects a duplicate key at any depth: `E-JSON-DUPLICATE-KEY`. A hand-rolled token pass, because `JSON.parse` collapses duplicates before a reviver sees them — the one stdlib call this ADR replaces rather than wraps |
| **phase 1 — the payload** | | | |
| `src/payload/copy-payload.ts` | **New** | F1 | The verbatim copy. Raw bytes in, raw bytes out — no BOM handling, no EOL change, no suffix stripping. Journalled exactly as a phase-2 write is. **SEC (C-26): every payload file is written `0644` and directories `0755`; the source mode is never read.** Mode preservation would make phase 1 carry a permission decision derived from the authoring machine's umask, which is the one thing phase 1 must not do |
| `src/payload/digest.ts` | **New** | F1 | **`payloadDigest` (Q-52).** One tree digest over the payload file set, per-file hash **normalized for text and raw for binary** — see §4 for why normalization is load-bearing here |
| **hashing** | | | |
| `src/hash/normalize.ts` | New | F1 | The one normalizer: BOM strip + `\r\n`/`\r` → `\n`. Nothing else (Q-26) |
| `src/hash/sha256.ts` | New | F1 | `hashText`, `hashBytes` — 64 lowercase hex, `node:crypto` |
| `src/hash/digest.ts` | New | F1 | `treeDigest` — path-prefixed, `\n`-joined, byte-ascending. **One call site at v1.0**: `payload/digest.ts` |
| **manifest** | | | |
| `src/manifest/types.ts` | New | F1 | `PackManifest` — **six keys**. No `FileEntry`, no `RegionEntry`, no `OwnedKeyEntry` |
| `src/manifest/canonical-json.ts` | New | F1 | Stable stringify: fixed key order, 2-space, `\n`. Byte-identical re-serialization |
| `src/manifest/read.ts` | New | F1 | Parse, `manifestVersion` gate, unknown-key capture, answer re-validation |
| `src/manifest/write.ts` | New | F1 | Atomic write, byte-identical output |
| **verify** | | | |
| `src/verify/verify.ts` | **New** | F1 | Check `payloadDigest` **first, fail-closed**; then re-run phase 2 **entirely in memory** and compare to disk. `VerifyResult` |
| `src/verify/compare.ts` | **New** | F1 | **`match \| adapted \| filled \| unfilled \| differs \| missing`** — six, and the enumeration is closed (Q-56, Q-79). Normalized comparison for text, raw for binary; the executable bit where the platform represents it. The state is chosen by whether the path is in the **adapt-expected** or **fill-expected** set, both resolved at plan time from the recipe alone. **The inversion is deliberate and is easy to implement backwards:** an adapt-expected path that matches is `match`, but a *fill-expected* path that matches is **`unfilled`** — it means the user has not filled in the template. **SEC (C-22) is void with `merge-json` (Q-54): there is no `partial` and no `ownedKeysChecked`** |
| `src/apply/plan-phase2.ts` | **New** | F1 | **SEC (C-23), §3.6.** Renders every phase-2 step at **plan** time from planner-held payload bytes into `PlannedFile.bytes`. `execute.ts` reads no payload file. Named as its own module so that "the executor re-reads the payload" is a change someone has to make on purpose |
| `tests/fixtures/adversarial/` | **New** | F1 | **SEC. One fixture pack per closed attack, each asserted to fail with a named code and exit class — the minimum set is F1 v2.3 US-16's table; see §6.1 change 27 for why this ADR no longer keeps a second copy of it.** The control that would have caught F-1 when a disposition table did not |
| **security — carried forward** | | | |
| `src/security/confine.ts` | Carried | F1 | **The only constructor of `AppliedPath`.** Anchored `to` grammar, **NFC + ASCII case-fold** `collisionKey` (Q-81 — a documented narrowing, F1 known limit 17: no Unicode fold ships, and two paths differing only in the case of a non-ASCII letter do not collide), resolve-and-`lstat` confinement, `confineAtWrite()`. **Also houses the reserved-destination denylist**, which moved here when `destination-policy.ts` lost its subject (Q-54). C-4, C-6, C-14 |
| `src/security/harness-paths.ts` | **New** | F1 | **The only constructor of `HarnessPath`** — the CLI's own writes under `.harness/`, and the list is **five and complete**: `pack/**`, `manifest.json`, `journal.json`, `journal.d/**`, `lock`. Derived from paths already proven grammar-clean, so confined by construction. Closes the typing hole phase 1 opened |
| ~~`src/security/destination-policy.ts`~~ | **Not built (Q-54)** | — | One table keyed by **destination**: the reserved-destination denylist (**extended: no recipe step writes under `.harness/`**), the `ownedKeys` allowlist and its security-relevant marks, the executable-root rules. C-1, C-5, C-12. **Revised for C-19/C-20/C-16:** every rule is evaluated over `stepWriteSet()`, **never over `step.to`**; `policyFor` resolves by `collisionKey` on every platform and is **total**; `allowedOps` is `readonly RecipeOp[] \| null` (the old `[] ⇒ merge-json only` encoding was a fail-open trap); `FORBIDDEN_AT_EVERY_DESTINATION` is a table-level floor no row may shrink |
| `src/security/disclosure.ts` | **Renamed from `consent.ts`** | F1→F2 | Builds `SecurityDisclosure` from a plan and renders it. **There is no gate** (Q-54): no `ConsentInputs`, no `E-SETTINGS-CONSENT-REQUIRED`, no gate call in `execute.ts` — a pack cannot write a settings file by any route, so there is nothing to consent to. **Renamed because the module was named after the half that was deleted**, and a file called `consent.ts` containing no consent is how the deleted gate gets rebuilt by someone tidying up. C-2 survives as the disclosure obligation only |
| `src/security/secret-heuristic.ts` | Carried | F1 | `E-PARAM-SECRET-SUSPECTED` at validate time; `W-ANSWER-LOOKS-SECRET` at answer time. C-15 |
| **filesystem** | | | |
| `src/fs/project-paths.ts` | Revised | F1 | `.harness/` layout constants, POSIX + NFC normalization. All path safety lives in `security/` |
| `src/fs/atomic-write.ts` | Carried | F1 | temp-then-rename, mode bits, created-directory tracking, **exclusive-create semantics and `E-TARGET-RACE`** (C-14) |
| `src/fs/journal.ts` | Revised | F1 | `.harness/journal.json` **v3** (Q-62): `command`, and per entry `intent: 'write' \| 'delete'`, `preExisting`, `preHash`, `preMode`, `backup`, plus `.harness/journal.d/`. **Covers phase-1 writes too.** `intent` exists because **`update` deletes** payload orphans and the five-case rollback table models no deletion; `command` exists because `E-JOURNAL-PRESENT`'s remedy has to name the command that crashed, and naming `init` after a crashed `update` sends the user to `E-ALREADY-APPLIED`. C-13 |
| `src/fs/lock.ts` | Carried | F1 | Advisory `.harness/lock` with `{pid, host, startedAt, cli}`; exclusive-create acquire; the three-condition stale rule |
| `src/fs/walk.ts` | Carried | F1 | The one bounded, non-symlink-following walk. Depth 32, 10 000 entries, skip list, `E-TRAVERSAL-LIMIT`. **Two call sites**: the phase-1 payload walk and the `verify` project scan. C-17 |
| **apply** | | | |
| `src/apply/plan.ts` | Revised | F1 | `ApplyInputs` → `ApplyPlan`. Pure: plans **both phases**, computes `payloadDigest` and the manifest, builds `SecurityDisclosure`, writes **nothing** |
| `src/apply/execute.ts` | Revised | F1→F2 | lock → journal → **phase 1** → **phase 2** → manifest → journal removal. The only writer. Re-confines immediately before each write (C-14). **No consent gate** (Q-54) |
| `src/apply/rollback.ts` | Revised | F1→F2 | The five-case rule of §7.5, now covering phase-1 paths |
| **validate** | | | |
| `src/validate/validate-pack.ts` | Revised | F1 | The **14**-step ordered check runner of F1 US-16 → `PackReport`. Step 12 is the Q-50 folder-README check (§3.5) |
| `src/validate/folder-readmes.ts` | **New** | F1 | §3.5. Per parameter combination: derive the directory set from the combination's applied paths, subtract the project root, `.claude/**` and `.harness/**`, and report `W-FOLDER-README-MISSING` for any directory receiving no `folderReadme` basename. Pure; needs no project |
| `src/validate/combinations.ts` | Carried | F1 | Per-parameter-combination render; the 32 cap; `parameterVaryingSteps` |
| `src/validate/link-integrity.ts` | Revised | F1 | `W-LINK-DANGLING`, **payload-aware**: a reference into `.harness/pack/` that exists in the payload is correct and is not reported |
| `packs/` | New | F5 | Pack content. F1 ships no pack; `lintel harness validate --all` is what binds them. **No `shared/` tree at v1.0** (Q-48) |

Three absences are deliberate and named, because an unnamed absence reads
as an oversight:

- **There is no `src/cli/commands/init.ts`.** `init` is F2's CLI surface
  over `plan.ts` + `execute.ts`.
- **There is no `src/recipe/ops/exec.ts`, `script.ts` or `shell.ts`,
  and no eighth op file of any name.** `ops/index.ts` is the closed
  registry and `RecipeStep` is the closed type; adding one is a change to
  both plus this ADR.
- **There is no hook-registration path**, and it is now stronger than
  when this line was written. **Superseded 2026-08-31 (Q-54):** the line
  read *"no `merge-json` step can own `hooks`, enforced by
  `destination-policy.ts` rather than merely unimplemented"*. There is no
  `merge-json` step, no `hooks` to own and no `destination-policy.ts`;
  `.claude/settings.json` is a **reserved destination**, so no step of
  any op reaches the file by any route. **A v1.1 reader must not read the
  rule as redundant:** the hook exclusion was taken as a *format*
  decision on grounds independent of `merge-json` (§7.2.5), and it is
  only trivially true while nothing can write a settings file. It must be
  re-established explicitly with the capability.

### Public interface contract

The shapes F2, F5 and the test writer compile or author against. No
downstream feature may widen or narrow these without a superseding ADR.
Types marked `// SEC` are load-bearing for §7 — narrowing one silently
removes a control.

> **Superseded in part, 2026-08-31 (Q-54) — a superseding decision, which
> is the amendment this paragraph asks for.** `RecipeStep` has **six**
> arms, not seven: the `merge-json` arm and its `ownedKeys` field are
> gone. So are `DestinationPolicy`, `OwnedKey`, `policyFor`,
> `checkOwnedKey`, `ConsentInputs`, `SecurityDisclosure.settings` and
> `VerifyState`'s `partial`. Do **not** compile against them.
>
> **Updated 2026-09-01: the shapes below are now CURRENT, not historical.**
> When this box was written the types beneath it were left stale on the
> supersede-don't-delete convention, with F1 v2.3 named as the contract of
> record. That was wrong for a *contract* — F2, F3, F5 and the test writer
> compile against these declarations, and a stale type carrying a footnote
> is a stale type. The declarations are **rewritten against F1 v3.0**:
> `RecipeStep` is six arms plus `StepChangeExpectation`, `VerifyState` is
> six values, the journal is version 3, and `ApplyInputs` has no `consent`.
> **`MergeJsonStep` is the one shape deliberately left in place as
> history**, and it is explicitly excluded from the `RecipeStep` union so
> that leaving it cannot make it constructible. **F1 v3.0 is the contract
> of record.** **Everything not named in either supersession box stands
> unchanged** — the path brands (`AppliedPath`, `HarnessPath`,
> `WritablePath`), `stepWriteSet()`, `collisionKey()` (whose *fold* is
> narrowed by Q-81 but whose *signature and role* are not), the rollback
> types, and the planner/executor split.

```ts
// ── path confinement ────────────────────────────────────────────────────
// SEC (C-14). A nominal brand. The ONLY way to obtain an AppliedPath is
// confinePath(); no cast, no `as AppliedPath` anywhere outside
// src/security/confine.ts. Every recipe-side writer takes AppliedPath,
// never string, so "we forgot to validate this one" is a compile error.
declare const AppliedPathBrand: unique symbol;
export type AppliedPath = string & {
  readonly [AppliedPathBrand]: 'AppliedPath';
};

// SEC. NEW at v2. The CLI's own writes under .harness/ — the phase-1
// payload, the manifest, the journal, journal.d/ and the lock, which is
// the COMPLETE list — are NOT recipe steps and do not consult the
// reserved-destination denylist (which forbids .harness/ outright, with
// no carve-out: .harness/ carries no README, Q-50 as amended).
// They are confined by CONSTRUCTION: derived from a payload-relative
// path already proven free of '..', of a leading separator and of every
// other construct the grammar rejects. Giving them their own brand is
// what stops the denylist deadlocking against the payload copier, and
// what stops a recipe step reaching a writer that accepts .harness/.
declare const HarnessPathBrand: unique symbol;
export type HarnessPath = string & {
  readonly [HarnessPathBrand]: 'HarnessPath';
};

/** Anything the executor may write. The journal, atomic-write and
 *  rollback take this; nothing else does. */
export type WritablePath = AppliedPath | HarnessPath;

export interface ConfineContext {
  /** realpath() of the project root, resolved ONCE per run. */
  resolvedRoot: string;
  /** realpath() of the directory the CLI itself is installed in. */
  cliInstallDir: string;
  /** 'declared' — grammar + denylist only, no filesystem (validate time)
   *  'resolved' — grammar + denylist + ancestor lstat + descendant proof */
  stage: 'declared' | 'resolved';
}

/** Grammar (§7.1.1) → reserved-destination denylist (§7.1.2) →
 *  resolution confinement (§7.1.3). The single gate. */
export function confinePath(
  declaredTo: string, ctx: ConfineContext,
): { path: AppliedPath; diagnostics: readonly Diagnostic[] } | null;

/** The NFC + case-folded key two applied paths collide on (§7.1.1). */
export function collisionKey(p: AppliedPath): string;

/** SEC (C-14). Re-run immediately before each write. Returns the fd of
 *  an exclusively-created temp file, or a diagnostic. */
export function confineAtWrite(
  p: WritablePath, ctx: ConfineContext,
): Promise<{ fd: number } | { diagnostic: Diagnostic }>;

/** SEC. The only constructor of HarnessPath. `rel` must already satisfy
 *  the payload path grammar; violations are E-PAYLOAD-PATH-INVALID. */
export function harnessPath(
  kind: 'payload' | 'manifest' | 'journal' | 'journalBackup' | 'lock',
  rel?: string,
): HarnessPath;

// ── diagnostics ─────────────────────────────────────────────────────────
export type Severity = 'error' | 'warning';
export type DiagnosticCode = `E-${string}` | `W-${string}`;
export type ExitCode = 0 | 1 | 2 | 3;

export interface Diagnostic {
  code: DiagnosticCode;
  severity: Severity;                // a property of the CODE, never of the occasion
  message: string;                   // rendered from the catalogue
  path?: string;                     // POSIX, pack- or project-relative
  line?: number;                     // 1-based
  step?: number;                     // recipe step index, where the concept applies
  data?: Record<string, string | number | readonly string[]>;
}
export function exitCodeFor(ds: readonly Diagnostic[]): ExitCode;

// ── pack.json ───────────────────────────────────────────────────────────
export type AnatomyPartId =
  | 'process' | 'roles' | 'documentTemplates' | 'conventions' | 'coordination'
  | 'behaviouralGuidelines' | 'folderScaffolding' | 'skillsAndAutomations'
  | 'autonomyContract';

export type AnatomyStatus = 'present' | 'provisional' | 'absent';

/** No `{ ref: 'shared:…' }` arm — there is no shared/ at v1.0 (Q-48).
 *  `declaredBy: 'recipe'` is valid only for folderScaffolding, whose
 *  shape IS the recipe's set of destinations. */
export type AnatomySource =
  | { paths: readonly string[] }              // globs relative to the pack dir
  | { declaredBy: 'recipe' };

export type AnatomyDecl =
  | (AnatomySource & { status?: 'present';     note?: string })
  | (AnatomySource & { status:  'provisional'; note: string })
  | { status: 'absent'; reason: string };

export interface ParameterDecl {
  id: string;                        // ^[a-zA-Z][a-zA-Z0-9]{0,31}$
  prompt: string;
  type: 'string' | 'enum' | 'boolean';
  values?: readonly string[];        // required when type === 'enum'
  default?: string | boolean;
  required?: boolean;                // default false
  flag?: string;                     // kebab-case CLI alias, e.g. 'calibration'
  /** SEC (C-7). REQUIRED when type === 'string'. Anchored regex source
   *  (begins ^, ends $), <= 200 chars, no backreference, no lookaround.
   *  Recommended conservative default, WRITTEN OUT by the author rather
   *  than inherited silently:  "^[\\p{L}\\p{N} ._-]{1,64}$"  with u.
   *  Absent → E-PARAM-NO-PATTERN. Forbidden on 'enum' and 'boolean'. */
  pattern?: string;
  /** SEC (C-7). type 'string' only. Default 256, hard ceiling 4096.
   *  Checked BEFORE `pattern` runs, so pattern evaluation is bounded and
   *  catastrophic backtracking is not reachable. */
  maxLength?: number;
  /** SEC (C-15). Explicit acknowledgement that a parameter tripping the
   *  credential heuristic is not in fact a credential. Without it,
   *  E-PARAM-SECRET-SUSPECTED, exit 2, at validate time. */
  notASecret?: boolean;
}

export interface ScaffoldDecl {
  id: string;                        // ^[a-z][a-z0-9-]{0,31}$
  description: string;
  /** Q-17. Two scaffolds sharing a category are ALTERNATIVES; selecting
   *  both is E-SCAFFOLD-EXCLUSIVE, exit 1. Absent ⇒ composable with
   *  everything. `backend-azure` and `backend-aws` share "backend";
   *  `writing-workstream` declares none. Steps live in recipe.json under
   *  scaffolds.<id> — a ScaffoldDecl carries NO steps. */
  category?: string;
  parameters?: readonly ParameterDecl[];
}

export interface PackJson {
  formatVersion: number;
  name: string;                      // ^[a-z][a-z0-9-]{1,31}$, equals the directory name
  version: string;                   // semver
  title: string;
  minCliVersion: string;             // semver
  /** Pack-relative path to the recipe; defaults to 'recipe.json'. */
  recipe?: string;
  anatomy: Record<AnatomyPartId, AnatomyDecl>;
  /** Q-50, §3.5. The basename that satisfies the folder-README rule for
   *  this pack. ONE path segment, subject to the same segment grammar as
   *  a step's `to`. Absent ⇒ 'README.md'. `writing` declares 'index.md'.
   *  Declared rather than guessed, because a checker that accepts either
   *  basename cannot report a missing one. */
  folderReadme?: string;
  parameters?: readonly ParameterDecl[];
  scaffolds?: readonly ScaffoldDecl[];
  /** SEC (C-12). Applied-path prefixes, each ending '/', inside which a
   *  step may set executable: true. Absent or empty ⇒ the pack ships no
   *  executable, which is the default and every v1.0 pack. Each root is
   *  subject to the same grammar and denylist as a step's `to`. */
  executableRoots?: readonly string[];
  provenance?: { source?: string; commit?: string; notes?: string };
  // NO contentRoot — phase 1 copies the folder (Q-39).
  // NO mappings   — phase 2 is a recipe (Q-40).
  // NO shared     — no shared/ mechanism at v1.0 (Q-48).
}

// ── recipe.json — the closed primitive set ──────────────────────────────
export const RECIPE_OPS = [
  'copy', 'rename', 'strip-suffix', 'rewrite-path',
  'substitute', 'generate', 'merge-json',
] as const;
export type RecipeOp = (typeof RECIPE_OPS)[number];

/** Exactly one key. No boolean operators, no negation, no second key —
 *  a compound `when` is E-RECIPE-STEP-INVALID (Q-20, restated). */
export type StepWhen = Readonly<Record<string, string>>;

interface StepBase { when?: StepWhen }

export interface CopyStep extends StepBase {
  op: 'copy'; from: string; to: string;
  exclude?: readonly string[];       // globs relative to `from`
  executable?: boolean;              // SEC (C-12)
}
export interface RenameStep extends StepBase {
  op: 'rename'; from: string; to: string;   // one file; basename may differ
}
export interface StripSuffixStep extends StepBase {
  op: 'strip-suffix'; from: string; to: string;
  suffix: string;                    // ^\.[a-z0-9-]{1,16}$ — no implicit default
  exclude?: readonly string[];
  executable?: boolean;              // SEC (C-12)
}
export interface RewritePathStep extends StepBase {
  op: 'rewrite-path';
  in: readonly string[];             // globs over APPLIED paths already written
  find: string;                      // LITERAL, never a regex, no line break
  replace: string;                   // LITERAL, no line break
}
export interface SubstituteStep extends StepBase {
  op: 'substitute';
  in: readonly string[];             // globs over APPLIED paths already written
  tokens?: readonly string[];        // allowlist of resolvable token bodies
}
export interface GenerateStep extends StepBase {
  op: 'generate';
  template: string;                  // payload path
  to: string;
  anchors: readonly string[];        // ^[a-z][a-z0-9-]{0,31}$ — INERT (Q-45)
}
export interface MergeJsonStep extends StepBase {
  op: 'merge-json'; from: string; to: string;
  /** SEC (C-1). The VALIDATED shape. The raw parse yields string[]; the
   *  schema promotes each entry via checkOwnedKey() against
   *  policyFor(to), or fails E-OWNEDKEY-FORBIDDEN at validate time.
   *  Nothing downstream ever sees an unvalidated key. */
  ownedKeys: readonly OwnedKey[];
}

/** Q-54: SIX arms, not seven. MergeJsonStep above is kept as the record
 *  of what was decided and overruled — it is NOT part of this union and
 *  must not be constructed. */
export type RecipeStep =
  | CopyStep | RenameStep | StripSuffixStep
  | RewritePathStep | SubstituteStep | GenerateStep;

/** Q-56 / Q-79. Optional on EVERY arm above; both default to false; both
 *  are JSON booleans, so "true" is E-UNKNOWN-VALUE, exit 2, no coercion
 *  and no truthiness (C-34). Each lands on every applied path in the
 *  step's write set — quantified over stepWriteSet(), never over `to`,
 *  because rewrite-path and substitute have no `to` and a rule written
 *  over `to` would exempt exactly the two ops that change bytes after
 *  placement.
 *
 *  They are MUTUALLY EXCLUSIVE on one step: E-RECIPE-STEP-INVALID,
 *  exit 2. A file is either the skill's to adapt or the user's to fill,
 *  and a step claiming both has not decided which. An empty write set
 *  under either is E-RECIPE-STEP-INVALID too.
 *
 *  adaptExpected: something else rewrites this after the apply — the
 *  generated CLAUDE.md, in all three packs.
 *  fillExpected:  this shipped INCOMPLETE and the person who applied it
 *  is expected to finish it — project-brief.md in every pack, writing's
 *  voice guide.
 *
 *  SEC-adjacent (Q-79): fillExpected is not only a report state. It is a
 *  PROHIBITION — `update` may never overwrite a path in the fill-expected
 *  set, unconditionally, whatever the newer pack ships and under any
 *  flag. A non-boolean here would silently disarm that. */
export interface StepChangeExpectation {
  adaptExpected?: boolean;
  fillExpected?: boolean;
}

export interface Recipe {
  /** SEC (C-24). A behaviour-selecting position, and the SEVENTH entry in
   *  §7.6's closed enumeration. Greater than the CLI's supported recipe
   *  format is E-RECIPE-FORMAT-NEWER, exit 2, zero bytes — never guessed,
   *  never best-effort. E-PACK-FORMAT-NEWER covers pack.json ONLY; a
   *  recipe carries its own version and needs its own gate. */
  formatVersion: number;
  steps: readonly RecipeStep[];
  /** scaffold id → its ordered steps. A key naming no declared scaffold,
   *  or a declared scaffold with no key, is E-RECIPE-STEP-INVALID. */
  scaffolds?: Readonly<Record<string, readonly RecipeStep[]>>;
}

/** SEC (C-30). The bound on `steps.length` plus the sum of every
 *  `scaffolds[*].length` — the TOTAL DECLARED step count, before `when`
 *  filtering and before scaffold selection, because that is what
 *  `pack info` renders. Exceeding it is E-RECIPE-TOO-MANY-STEPS, exit 2,
 *  at validate time. Raisable ONLY by a superseding ADR.
 *
 *  This is NOT a denial-of-service control — §7.0 has no remote attacker
 *  and E-PAYLOAD-TOO-LARGE already bounds the bytes. It is an
 *  INSPECTABILITY control. §3.1 rejected a script primitive on the ground
 *  that `pack info` renders the complete list of what an apply will do;
 *  an unbounded list degrades that guarantee continuously and names no
 *  point at which a reviewer should stop trusting it. 256 is an order of
 *  magnitude above the largest v1.0 pack (F5's `coding`, 17 declared
 *  steps), so it constrains a pathological recipe without constraining an
 *  authored one. Lowering it wants evidence from real packs, not taste. */
export const MAX_RECIPE_STEPS = 256;

// ── strict JSON (C-25) ──────────────────────────────────────────────────
/** SEC (C-25). The ONLY parser for AUTHORED JSON — pack.json,
 *  recipe.json, .harness/manifest.json. Rejects a duplicate key at ANY
 *  depth with E-JSON-DUPLICATE-KEY, exit 2, naming the file, the key and
 *  both line numbers.
 *
 *  Why this is security-relevant and not hygiene: §7.0's actor 1 is a
 *  pack author whose grant is caught by "a JSON diff review". JSON.parse
 *  keeps the LAST duplicate; a human reading a diff top-to-bottom takes
 *  the FIRST. So `{"ownedKeys":["model"], … ,"ownedKeys":["hooks"]}`
 *  reviews as one thing and executes as another, which defeats the exact
 *  control the threat model names. A parser that cannot disagree with the
 *  reviewer is the control; a duplicate-key check is how you get one.
 *
 *  NOT used on a `merge-json` DESTINATION or its payload-side `from`:
 *  those are ordinary JSON documents, one of them the user's own, and a
 *  duplicate key there is E-MERGE-JSON-INVALID (different remedy prose,
 *  therefore a different code — §7.6's severity rule applied to codes). */
export function parseStrictJson(
  text: string, file: string,
): { value: unknown } | { diagnostic: Diagnostic };

// ── the write set — the keystone of C-19 ────────────────────────────────
/** SEC (C-19). Every applied path whose BYTES this step creates or
 *  changes. This — never `step.to` — is what the destination policy, the
 *  reserved-destination denylist and the executable rules are evaluated
 *  over. Two of the seven primitives have no `to` at all, so a `to`-keyed
 *  control is not a control; see §7.2.1.
 *
 *  `writtenSoFar` is the plan's ORDERED written-set: the applied paths
 *  every EARLIER step in the merged plan writes. It is the sole
 *  resolution domain for `in` globs (C-27) — never the filesystem — so
 *  this function is total, pure, and needs no project, which is what
 *  keeps §7.7 property 2 true.
 *
 *  Per op:
 *    copy          every applied path under `to` after `exclude`
 *    rename        { to }
 *    strip-suffix  every applied path under `to` after suffix + `exclude`
 *    generate      { to }
 *    merge-json    { to }
 *    rewrite-path  every p in writtenSoFar matched by `in`
 *    substitute    every p in writtenSoFar matched by `in`
 *
 *  For the two `in` primitives the set is MATCHED, not HIT: a path whose
 *  content happens to lack `find` is still in the write set. A policy
 *  decision that depended on file content would be a policy decision made
 *  after the plan was approved. */
export function stepWriteSet(
  step: RecipeStep, writtenSoFar: readonly AppliedPath[],
): readonly AppliedPath[];

// ── destination policy (C-1, C-19, C-20) ────────────────────────────────
export type ClaudeSettingsOwnableRoot =
  | 'permissions.allow' | 'permissions.deny' | 'permissions.ask'  // security-relevant
  | `env.${string}`                                               // security-relevant
  | 'model' | 'outputStyle';                                      // ordinary

/** SEC (C-16, C-19). The floor EVERY row inherits and no row may shrink.
 *  Previously each row carried its own `forbidden` list, which meant the
 *  fall-through row ("any other JSON target", `ownable: null`) forbade
 *  NOTHING — so `scripts.postinstall` in some JSON file no row happens to
 *  name was ownable, and the C-16 position "an `ownedKeys` root against
 *  the destination policy" had no fail-closed behaviour there. A row may
 *  ADD to this list; it may never subtract. */
export const FORBIDDEN_AT_EVERY_DESTINATION = [
  'hooks',          // §7.2.5 — outside the ownable set at EVERY destination
  'scripts',        // npm/pnpm/yarn lifecycle execution
  'permissions',    // claimable only as a leaf under it, never as the root
  'env',            // ditto
] as const;

export interface DestinationPolicy {
  /** Applied paths this row governs. Matched by `collisionKey`, NOT by
   *  string equality — see policyFor. */
  destinations: readonly string[];
  ownable: readonly string[] | null; // null ⇒ any dotted path not forbidden
  /** Dotted-path prefixes never ownable HERE, on top of
   *  FORBIDDEN_AT_EVERY_DESTINATION, which is always in force. */
  forbidden: readonly string[];
  securityRelevant: readonly string[];
  /** SEC (C-19). The COMPLETE set of ops that may write these bytes BY
   *  ANY ROUTE — as a `to`, as a member of an `in` glob's match set, or
   *  as a directory recursion's output. Evaluated over stepWriteSet(),
   *  never over `step.to`.
   *
   *  `null` ⇒ no op restriction. A LIST ⇒ exactly those ops and no
   *  others; an op outside it reaching any path this row governs is
   *  E-SETTINGS-MODE-FORBIDDEN, exit 2, at validate time.
   *
   *  The previous encoding was `readonly RecipeOp[]` with "[] ⇒ merge-json
   *  ONLY", which made the natural spelling of "permit nothing" mean
   *  "permit the one op that carries all of S-1's surface". Explicit now. */
  allowedOps: readonly RecipeOp[] | null;
}

/** SEC (C-20). Resolves by `collisionKey(dest)` — NFC-normalized then
 *  case-folded — against `collisionKey` of each row's declared
 *  destinations, ON EVERY PLATFORM, unconditionally.
 *
 *  Not "on case-insensitive volumes": `validate` runs in CI, which is
 *  Linux, and the developer is on macOS or Windows. A platform-conditional
 *  policy means the pack CI pronounced valid is not the pack that runs. A
 *  `merge-json` to ".claude/Settings.json" claiming `hooks` matched no row
 *  under exact matching, fell through to the permissive row, and passed
 *  validate — while naming the same file the settings row governs.
 *
 *  TOTAL: every AppliedPath resolves to a row, the last of which is the
 *  fall-through, so there is no unpoliced destination. */
export function policyFor(dest: AppliedPath): DestinationPolicy;

/** SEC (C-1). Branded exactly as AppliedPath is, and for the same
 *  reason: a dotted path becomes an OwnedKey only by passing
 *  checkOwnedKey() against the policy for its DESTINATION. Widening this
 *  to `string` re-opens S-1. */
declare const OwnedKeyBrand: unique symbol;
export type OwnedKey = string & { readonly [OwnedKeyBrand]: 'OwnedKey' };

export function checkOwnedKey(
  dotted: string, dest: AppliedPath, packSourceJson: unknown,
): { key: OwnedKey; securityRelevant: boolean } | { diagnostic: Diagnostic };

// ── hashing ─────────────────────────────────────────────────────────────
export function normalizeText(bytes: Buffer): string;  // BOM strip + CRLF/CR → LF, nothing else
export function hashText(text: string): string;        // 64 lowercase hex
export function hashBytes(bytes: Buffer): string;
export function treeDigest(
  entries: ReadonlyArray<{ path: string; sha256: string }>,
): `sha256-${string}`;                                  // path-prefixed, \n-joined, byte-ascending

/** Q-52. ONE digest over the whole payload. Per-file hash is
 *  hashText(normalizeText(bytes)) for text and hashBytes(bytes) for
 *  binary — normalized, NOT raw, so a CRLF checkout on Windows does not
 *  read as a tampered payload (see §4). Pure function of the payload,
 *  so determinism is unaffected. */
export function payloadDigest(
  entries: ReadonlyArray<{ path: string; sha256: string }>,
): `sha256-${string}`;

// ── security disclosure & consent (C-2, C-12) ───────────────────────────
// Computed by the PURE planner, so `pack info`, `validate --json` and
// `init`'s pre-write summary render the SAME structure and cannot disagree.
export interface SettingsGrant {
  file: AppliedPath;
  key: string;
  securityRelevant: boolean;
  action: 'add' | 'set';
  /** ONE value, verbatim, exactly the bytes that will be written.
   *  Never summarised, never truncated, never counted. */
  value: string;
}
export interface SecurityDisclosure {
  settings: readonly SettingsGrant[];
  executables: ReadonlyArray<{ path: AppliedPath; source: string }>;
  /** Files landing under .claude/hooks/ — shipped, 0644, registered by
   *  nothing at v1.0. Disclosed so a reader is not misled. */
  inertHookScripts: readonly AppliedPath[];
  /** SEC (C-28). NEW. Every substituted answer landing in
   *  AGENT-INSTRUCTION content — `CLAUDE.md`, `AGENTS.md`, anything under
   *  `.claude/` — with the applied path, the parameter id and the value
   *  VERBATIM, one per line, on the same never-summarised terms as
   *  `settings`.
   *
   *  Enumerated, NOT gated — the same shape C-12 uses for `executables`,
   *  and for the same reason. See §3.7: gating would fire the consent
   *  prompt on every apply of all three v1.0 packs (each substitutes a
   *  project name into `CLAUDE.md`), which trains a user to accept without
   *  reading and destroys the property that a prompt at v1.0 MEANS
   *  something. `requiresConsent` therefore does NOT read this array. */
  agentInstructionSubstitutions: ReadonlyArray<{
    path: AppliedPath; parameter: string; value: string;
  }>;
  /** true iff any `settings` entry is securityRelevant. Deliberately
   *  unchanged by the array above. */
  requiresConsent: boolean;
}

/** SEC (C-28). The closed classifier behind that array. An applied path is
 *  agent-instruction content iff its collisionKey is `claude.md` or
 *  `agents.md` at the project root, or it lies under `.claude/`. Closed
 *  and matched by collisionKey for the same reason policyFor is (C-20). */
export function isAgentInstruction(p: AppliedPath): boolean;
export function renderDisclosure(d: SecurityDisclosure): string;

export interface ConsentInputs {
  acceptPermissions?: boolean;       // --accept-permissions
  /** --accept-hooks. Parsed and ALWAYS refused with
   *  E-HOOKS-NOT-SUPPORTED, so a script written against a future version
   *  fails loudly instead of silently doing nothing. */
  acceptHooks?: boolean;
  /** Present only when a TTY is attached. Absent ⇒ non-interactive, and
   *  requiresConsent without acceptPermissions is
   *  E-SETTINGS-CONSENT-REQUIRED, exit 1, zero bytes. */
  prompt?: (d: SecurityDisclosure) => Promise<boolean>;
}

// ── validator result ────────────────────────────────────────────────────
export interface AnatomyRow {
  part: AnatomyPartId;
  status: AnatomyStatus | 'missing';   // 'missing' only for an INVALID pack
  note?: string; reason?: string; matched: number;
}
/** A recipe step as `pack info` renders it: <op>  <from> → <to>. */
export interface StepSummary {
  index: number; op: RecipeOp;
  from: string | null; to: string | null;
  scaffold: string | null;             // null ⇒ a base step
  when: StepWhen | null;
}
export interface PackReport {
  pack: { name: string; version: string; title: string;
          formatVersion: number; minCliVersion: string };
  anatomy: readonly AnatomyRow[];       // exactly 9, in AnatomyPartId order
  scaffolds: ReadonlyArray<{ id: string; category: string | null;
                             description: string; steps: number }>;
  parameters: readonly ParameterDecl[];
  steps: readonly StepSummary[];        // the complete plan, before applying anything
  /** Steps whose inclusion depends on an answer, and the applied paths
   *  each would write — how a reader sees what --calibration changes. */
  parameterVaryingSteps: ReadonlyArray<{ index: number; when: StepWhen;
                                         writes: readonly string[] }>;
  combinations: number;
  /** SEC (C-2, C-12). Every value under a security-relevant owned key
   *  and every 0755 path, in ANY parameter combination. Empty for every
   *  v1.0 pack — and `pack info` says so rather than printing nothing. */
  disclosure: SecurityDisclosure;
  diagnostics: readonly Diagnostic[];
  ok: boolean;
  // NO `shared` array (Q-48). NO pack.integrity (Q-43).
  // NO parameterVaryingRegions — there are no regions (Q-45).
}
export function validatePack(
  packDir: string, opts?: { strict?: boolean },
): Promise<PackReport>;
export function renderPackInfo(report: PackReport): string;

// ── manifest — SIX keys (Q-43 as amended by Q-52) ───────────────────────
export interface PackManifest {
  manifestVersion: number;
  cli: string;
  pack: { name: string; version: string; formatVersion: number };
  /** Q-52. One tree digest over .harness/pack/. Serialized in THIS
   *  position, between `pack` and `parameters`: it is a fact about the
   *  payload this apply landed, not part of the pack's declared
   *  identity, so it does not belong inside `pack`. */
  payloadDigest: `sha256-${string}`;
  /** EVERY declared parameter and its answer — defaults included, and
   *  answers that selected nothing included, because a `when` must be
   *  re-evaluated against the ORIGINAL answers. Committed and
   *  repo-public by design (C-15). */
  parameters: Readonly<Record<string, string | boolean>>;
  scaffolds: readonly string[];      // selected ids, pack-declared order
  /** Unknown keys read from a newer CLI's manifest, re-inlined verbatim
   *  on write. Not a seventh declared key. */
  unknownKeys?: Record<string, unknown>;
  // NO files[], NO regions, NO ownedKeys record, NO shared[],
  // NO pack.integrity, NO appliedAt, NO manifest self-hash.
}

export function readManifest(projectRoot: string):
  Promise<{ manifest: PackManifest | null; diagnostics: readonly Diagnostic[] }>;
export function writeManifest(projectRoot: string, m: PackManifest): Promise<void>;
export function canonicalJson(value: unknown): string;

// ── verify (US-33, Q-53) ────────────────────────────────────────────────
/** SEC (C-22). `partial` is NEW and it is a security fix, not a nicety.
 *  `merge-json` unions onto whatever the destination already holds and
 *  preserves every other key, so that prior content is a FOURTH input to
 *  the applied tree — not in the identity, not in the manifest, and
 *  unrecoverable after apply. At `verify` time the union is IDEMPOTENT,
 *  so recomputing union(disk, owned) against disk always agrees: a
 *  permission ADDED AFTER APPLY recomputes to itself and the old
 *  three-state report said `match`. A verifier that reports a tampered
 *  settings file as clean is worse than one that reports nothing.
 *
 *  `partial` never means `match` and never means `differs`. It means:
 *  every key this pack CLAIMS is as this pack wrote it, and the rest of
 *  this file was not this pack's to claim and has not been checked. */
/** Q-56 / Q-79. SIX values, and the enumeration is closed. `partial` is
 *  GONE with merge-json (Q-54).
 *
 *  match     — recomputed and identical.
 *  adapted   — differs, and a step declared adaptExpected. Not a failure.
 *  filled    — differs, and a step declared fillExpected. Not a failure:
 *              the user did what the pack asked.
 *  unfilled  — IDENTICAL, and a step declared fillExpected. Not a
 *              failure, and NOT `match`: it means the template is still a
 *              template. Class `notice` (Q-60); --strict does not promote
 *              it, because a --strict run that can never pass on a
 *              freshly created project is useless.
 *  differs   — changed, and nothing declared it would. FAILS.
 *  missing   — not on disk. FAILS.
 *
 *  NOTE THE INVERSION, which is the easiest thing here to implement
 *  backwards: for an adapt-expected path, matching is unremarkable and
 *  reports `match`; for a fill-expected path, matching is the finding. */
export type VerifyState =
  | 'match' | 'adapted' | 'filled' | 'unfilled' | 'differs' | 'missing';
export interface VerifyEntry {
  path: AppliedPath;
  state: VerifyState;
  /** false on Windows, where the bit is not represented. The report says
   *  so rather than implying a check ran. */
  modeChecked: boolean;
  /* C-22's `ownedKeysChecked` is GONE with merge-json (Q-54). There is
   * no partial verification: the recomputation identity is exact at
   * every applied path, with no carve-out. */
}
export interface VerifyResult {
  /** Q-52. Checked FIRST and fail-closed: a mismatch makes the
   *  recomputation meaningless, so `entries` is empty and
   *  E-PAYLOAD-DIGEST-MISMATCH (exit 2) is the whole report. */
  payload: { recorded: string; computed: string; ok: boolean };
  entries: readonly VerifyEntry[];
  /** `differing` and `missing` are the ONLY counters that gate `ok`.
   *  adapted, filled and unfilled are reported, counted separately and
   *  never affect the exit code (Q-56, Q-79). */
  checked: number; differing: number; missing: number;
  adapted: number; filled: number; unfilled: number;
  diagnostics: readonly Diagnostic[];
  ok: boolean;
}
/** Reads .harness/manifest.json and .harness/pack/. Writes nothing,
 *  ever — no lock, no journal. Needs no network and no bundled pack. */
export function verifyProject(projectRoot: string): Promise<VerifyResult>;

// ── apply ───────────────────────────────────────────────────────────────
export interface ApplyInputs {
  packDir: string;
  projectRoot: string;
  answers: Readonly<Record<string, string | boolean>>;
  scaffolds: readonly string[];
  cliVersion: string;
  force?: boolean;                   // byte-identical collisions only
  /* Q-54: there is NO `consent` field and no ConsentInputs. A pack
   * cannot write a settings file by any route, so there is nothing to
   * consent to and no gate to forget. The disclosure survives; the gate
   * does not. */
}
export interface PlannedFile {
  path: WritablePath;                // SEC (C-14) — never a bare string
  /** SEC (C-23). THE FINAL BYTES, resolved at PLAN time, for BOTH phases.
   *  `executeApply` writes this buffer and performs no read of
   *  `.harness/pack/` — no template read, no re-render, no re-glob. The
   *  planner reads the bundled pack ONCE; that read DEFINES the payload;
   *  phase 1 writes it verbatim and phase 2 renders from the same
   *  in-memory bytes. See §3.6 — this is decided, not left open. */
  bytes: Buffer;
  phase: 1 | 2;                      // phase 1 is journalled exactly as phase 2 is
  executable: boolean;
  /** SEC (C-13). What planApply observed on disk, carried into the
   *  journal so rollback can tell "we created this" from "we overwrote
   *  something already here". */
  preExisting: boolean;
  preHash: string | null;            // null iff !preExisting
  preMode: number | null;            // null iff !preExisting
}
export interface ApplyPlan {
  files: readonly PlannedFile[];     // BOTH phases, in write order
  manifest: PackManifest;
  report: PackReport;
  /** SEC. The grants and 0755 paths THIS plan would write, given THESE
   *  answers and scaffolds — narrower than the report's
   *  all-combinations disclosure. This is what init prints. */
  disclosure: SecurityDisclosure;
  diagnostics: readonly Diagnostic[];
  ok: boolean;
}
/** Pure: reads the pack and inspects the project; writes nothing, ever. */
export function planApply(inputs: ApplyInputs): Promise<ApplyPlan>;

// SEC (C-13). Version 3 (Q-62). Versions 1 and 2 never shipped outside a
// single run — a journal exists only between the start and the end of one
// command — so there is no compatibility to keep. A journal declaring any
// other version is E-JOURNAL-UNREADABLE, exit 2, and is never guessed.
export interface JournalEntry {
  path: WritablePath;
  /** Q-62. `update` DELETES payload orphans, and the five-case rollback
   *  table models overwriting and creating but not deleting. A 'delete'
   *  entry records preExisting: true, preHash, preMode and a backup, has
   *  NO intended hash, and rollback restores it unconditionally.
   *  `init` writes 'write' on every entry, so the field is uniform
   *  rather than optional. */
  intent: 'write' | 'delete';
  sha256: string | null;             // null iff intent === 'delete'
  phase: 1 | 2;
  preExisting: boolean;
  preHash: string | null;
  preMode: number | null;
  /** Path under .harness/journal.d/ holding the pre-apply bytes. Written
   *  BEFORE the overwrite, present iff preExisting && preHash !== sha256. */
  backup: string | null;
}
export interface Journal {
  version: 3; cli: string; startedAt: string;
  /** Q-62. E-JOURNAL-PRESENT's remedy line is rendered from this. Saying
   *  `init --rollback` after a crashed `update` sends the user to a
   *  command that answers E-ALREADY-APPLIED and leaves the journal
   *  exactly where it was — a remedy that cannot work is worse than
   *  none, because the user believes they tried it. */
  command: 'init' | 'update';
  entries: readonly JournalEntry[];
  createdDirs: readonly string[];    // creation order; removed in reverse
}
export function executeApply(plan: ApplyPlan, projectRoot: string):
  Promise<{ written: number; diagnostics: readonly Diagnostic[] }>;

export interface RollbackResult {
  deleted: readonly string[];        // created by this apply, still ours
  restored: readonly string[];       // SEC (C-13) — overwritten, put back
  kept: readonly string[];           // changed since the crash; left alone
  diagnostics: readonly Diagnostic[];
}
export function rollback(projectRoot: string): Promise<RollbackResult>;
```

---

## 2. Context

**Prior decisions and constraints:**

- **The apply is two phases (Q-39).** Phase 1 is a verbatim copy to
  `.harness/pack/`; phase 2 is the per-pack tie-up. This is not a
  refactor of the old model — it is a different model, and it deletes
  the problem the old one was built around. The nine-step manual-apply
  log in `CLAUDE.md` §Dogfooding splits cleanly along it: steps 1–5 were
  a dumb copy, steps 6–9 were the tie-up.
- **Phase 2 is a recipe, not a script (Q-40).** A script would make a
  pack *code that executes on the user's machine*, which voids the whole
  of §7: path confinement, the reserved-destination denylist and consent
  gating all depend on the plan being inspectable **before** anything
  runs. This constraint is upstream of every design choice below.
- **Phase 2 reads the phase-1 copy (Q-41), and templates stay in it
  (Q-47).** One source of truth per apply; the payload is inside the
  project, so a project has every template locally without a second copy
  the tool must keep in step.
- **v1.0 is F1, F2, F5, F6 (Q-42).** `update`, `status` and `contribute`
  defer to v1.1; `--adopt` is dropped (Q-44). Everything that existed
  only to serve drift detection, 3-way merge or contribute is **removed
  from the format**, not disabled in place.
- **The manifest is minimal (Q-43) plus a payload digest (Q-52).** Q-43's
  argument is that the applied tree is recomputable, so a hash list and a
  cached base are redundant. Q-52 is the correction to that argument: the
  recomputation *trusts* the payload, so one digest over it is what makes
  the recomputation an assertion rather than a tautology.
- **No marked regions (Q-45).** Regions had two justifications and
  Q-39/Q-42 removed both: `update` was their consumer, and the
  source-only/applied-copy problem dissolved once phase 1 copies verbatim
  and Q-46 deletes the bootstrap prose that made two READMEs describe
  their own copying. Anchors ship inert.
- **No `shared/` at v1.0 (Q-48), and `planning` ships its own targets
  copy (Q-49).** With `presentation` deferred, `shared/` had one
  consumer, which is indistinguishable from pack-local content. The
  accepted cost is two copies of the targets contract that will drift
  before v1.1 reconciles them.
- **Every folder an apply creates carries a README (Q-50), except under
  `.claude/` and `.harness/`, which are tool-owned.** This is a content
  decision with a format consequence: **it removes the need for an eighth
  primitive.** F5 raised the empty-directory question and proposed
  `mkdir`; Q-50 answers it by making the premise false. The `.harness/`
  exclusion was added by the 2026-08-31 amendment to Q-50, which resolved
  §3.4's escalation and is what keeps C-5 free of a carve-out.
- **F1 owns `verify` (Q-53).** It owns `validate` and `pack info` for the
  same reason: all three read a pack or a manifest, write nothing, and
  exist to make the format checkable.
- **S5 — adding a pack requires no core change.** `planning` is authored
  against an already-frozen F1. Any mechanism needing pack-specific code
  in the CLI falsifies S5 before it is tested. This is still the
  strongest constraint on the calibration decision, and the recipe's
  `when` is still the answer.
- **The Mode A security review's verdict of record is `REVISE-SPEC`.**
  Its remediation was folded into F1 v1.0 and into this ADR's original
  §7; both CRITICALs were apply-time and survive the model change intact.
  **No fresh `SECURITY-PROCEED` has been issued against the rewritten
  specs**, and the two-phase model changed the surface under review.

---

## 3. Options considered

The original ADR's six conflicts (error model, calibration surface,
anatomy states, merge base, `pack info` ownership, shared mappings) are
either settled and unchanged, or void with the model. Three of them are
re-argued here because the model moved under them; the other three stand
as decided on 2026-08-30 and are recorded in §6.2.

### 3.1 The shape of phase 2 (Q-40, restated as an architecture choice)

- **A — a closed primitive set expressed as a discriminated union
  (chosen).** Seven arms, one registry, exhaustiveness checked by the
  compiler. *Advantages:* a pack can only do what the primitives allow;
  the complete effect of an apply is renderable by `pack info` before it
  runs; adding a step type is a visible change to the CLI and to this
  ADR. *Disadvantages:* a genuinely novel pack need is a CLI release, not
  a pack release.
- **B — a script primitive, or an `exec` escape hatch.** *Advantages:*
  no primitive is ever missing. *Disadvantages:* voids §7 entirely. Every
  control in this ADR depends on the plan being inspectable before
  execution, and a script is not inspectable. Rejected as
  incompatible with the decision, not merely as worse.
- **C — an open primitive set with a capability declaration.** *Rejected:*
  it is B with paperwork. The reviewer's threat model (§7.0) is that
  `validate` is what pronounces a pack well-formed and that pronouncement
  outlives "packs are bundled"; a declared capability is a thing a pack
  author writes, and the whole point of the allowlist model is that what
  a pack may do is decided by the CLI, not by the pack.

### 3.2 What the manifest carries about the payload (Q-52)

- **A — one tree digest, `payloadDigest`, a sixth top-level key
  (chosen).** *Advantages:* closes the one honest gap in Q-43's argument
  for a cost of one field and one tree walk; lets `verify` distinguish
  "the applied tree drifted" from "the payload was edited"; covers
  `recipe.json` too, since the recipe is in the payload, so a hand-edited
  recipe is detected by the same check; pre-answers the payload half of
  C-11 before v1.1 needs it. *Disadvantages:* the manifest is no longer
  purely a record of *inputs the user chose* — it now also records an
  observation. That is a real conceptual cost and it is worth naming.
- **B — no digest; state the limitation in `verify`'s output** (F1
  v2.0's current position, and Q-43's original). *Advantages:* the
  manifest stays five keys and purely declarative. *Disadvantages:*
  `verify` reports a hand-edited payload as `match`, which is the exact
  failure mode `verify` exists to catch. Q-52 supersedes it.
- **C — the per-file hash list Q-43 rejected.** *Rejected again*, and for
  Q-43's reason: it duplicates what recomputation already says, and it
  goes stale against a recipe change in a way a single digest cannot.
- **D — `pack.payloadDigest`, nested inside the `pack` object** (F1
  v2.0's Q-52 row proposes this). *Rejected:* `pack` holds what the
  pack **declared** — name, version, formatVersion, all read out of
  `pack.json`. The digest is what this apply **observed**. Mixing the two
  makes `pack` a heterogeneous object and makes "the manifest records the
  inputs" harder to state truthfully. Top-level, between `pack` and
  `parameters`.

### 3.3 The empty-directory problem (Q-50 vs F5's proposed `mkdir`)

- **A — every created folder carries a README; no eighth primitive
  (chosen, Q-50).** *Advantages:* the placeholder becomes useful content;
  all five coding READMEs are ordinary `rename` steps out of
  `applied-readmes/`, which already exists in the pack; the primitive set
  stays at seven, which is the number `pack info`, `E-RECIPE-PRIMITIVE-
  UNKNOWN` and this ADR's whole "enumerable capability" argument are
  written against. *Disadvantages:* a pack that genuinely wants an empty
  folder cannot have one. No v1.0 pack does.
- **B — an eighth `mkdir` primitive** (F5's Q-50 default). *Advantages:*
  direct. *Disadvantages:* it buys a capability nothing needs once Q-50
  lands, and it is a primitive whose entire output is invisible to
  `verify`'s file comparison and uncommittable by git — so a pack using
  it would produce an applied tree that does not survive a clone. That
  last point is decisive and is why B is worse than it looks.
- **C — a `skeleton/` tree of placeholder files** (F1 v2.0's current
  worked recipe, §F1.3 step 8). *Rejected:* it is A with worse content.
  Git cannot commit an empty directory, so a skeleton needs placeholder
  files anyway; Q-50 makes those files say something. **F1's `skeleton/`
  step must be replaced.**

### 3.4 `.harness/README.md` — Q-50 against C-5

**Decided C. Escalated on 2026-08-31 and answered the same day** in
`project-brief.md` §12, as an amendment to Q-50. This ADR's first pass
chose A and named C as genuinely arguable; the options are kept below
because the comparison is the work, and because a reversal that hides
what it reversed is worth less than one that shows it.

- **A — the CLI writes it, from a fixed payload path (**originally
  chosen; superseded**).** `applied-readmes/harness.md`, if the pack
  ships it, is rendered by the CLI to `.harness/README.md` immediately
  before the manifest — a CLI-owned write carrying `HarnessPath`,
  confined by construction, exactly like the manifest. *Advantages:* C-5
  is not amended — "a recipe step may never write under `.harness/`"
  still holds. *Disadvantages:* one more CLI-owned write; it is not
  produced by the recipe, so `verify` cannot recompute it; and it makes
  C-5 a rule **with a named carve-out** rather than an absolute. That
  last cost was underweighted: §7.1's own argument for extending C-5 is
  that `.harness/pack/` is phase 2's *input*, and a rule that needs the
  reader to hold an exception in mind is a rule an implementer
  eventually applies to the exception's neighbours.
- **B — carve a hole in the denylist for `.harness/README.md`.**
  *Rejected:* a denylist with an exception is a denylist an implementer
  gets wrong, and the exception would be a recipe-declared `to` — which
  means the grammar, the collision check and the resolution gate all have
  to reason about a path inside the tree phase 2 is reading. Not worth
  one README.
- **C — drop `.harness/README.md`; treat `.harness/` as tool-owned like
  `.claude/` (chosen, on escalation).** Q-50 already excludes `.claude/`
  as tool-owned, and `.harness/` is *more* tool-owned, not less: a user
  edits agent files under `.claude/`, but must **never** edit the
  payload. Excluding it on the same stated ground keeps Q-50 a rule with
  **one** exclusion criterion rather than one criterion plus a special
  case, and it keeps **C-5 absolute with no carve-out** — which is what
  the §7.1 blockquote asks for in its own words. The reader-value
  argument that carried A on the first pass is real but small: a
  newcomer opening `.harness/` finds `pack/`, `manifest.json` and a
  journal, all of which the applied `CLAUDE.md` and the manifest already
  describe. **Cost, as predicted: one deleted file** —
  `packs/coding/applied-readmes/harness.md` existed and has been removed,
  leaving that folder with exactly five files — **and one deleted CLI
  write.** Nothing else in the architecture moved.

### 3.5 Whether `validate` enforces Q-50 mechanically — new in this pass

Q-50 has an easily-missed property: **the recipe's destination set *is*
the pack's folder-README set.** Every directory an apply creates exists
because some step writes a file into it, and every step's `to` is
declared. So "every folder an apply creates, outside `.claude/` and
`.harness/`, carries a README" is decidable from the pack alone, with no
project — the same class of check as `E-MAP-COLLISION`.

- **A — leave it as prose (**rejected**).** The rule lives in the brief,
  in F1 US-3 and in F5's three pack sections, and is enforced by an
  integration test F1 suggests but does not require. R5's recurring
  weakness in this product is exactly this: rules asserted in prose and
  checked by nobody. The check costs one pure function over data
  `validate` has already computed.
- **B — an error, `E-FOLDER-README-MISSING`, exit 2 (**rejected**).**
  `validate` has no project root, so it cannot distinguish *a directory
  this apply creates* — which Q-50 governs — from *a directory that
  already exists in the target project and into which this apply merely
  writes*, which Q-50 does not. The check therefore **over-approximates
  by construction**, and an over-approximating check must not be fatal by
  code, or a legitimate pack writing into a conventional pre-existing
  directory becomes unshippable and the remedy is a `.gitkeep`-shaped
  workaround — precisely what Q-50 exists to avoid.
- **C — a warning, `W-FOLDER-README-MISSING`, fatal under `--strict`
  (chosen).** Warning severity is honest about the over-approximation;
  `--strict` gives it teeth where the over-approximation is known to be
  empty, which is this repo's CI over the three bundled packs. **US-16's
  CI criterion must therefore read `validate --all --strict`** — a
  warning nothing runs strictly is option A with extra steps.

**The specification, precisely.**

- **Where in US-16's order:** a new **step 12**, immediately after the
  per-combination render (step 11) and before link integrity. It needs
  the per-combination applied path set that step 11 produces, and it must
  run **per parameter combination**: a folder created only under
  `--calibration high-floor` needs its README under that combination, and
  the merged step set would hide a folder step and a README step gated on
  *different* answers. Link integrity becomes step 13 and disclosure step
  14; the order is part of F1's contract, so the renumber is a fold, not
  an editorial choice.
- **What it computes:** for each combination, the set of proper directory
  prefixes of every applied path the recipe writes; minus the project
  root itself; minus every prefix under `.claude/` or `.harness/`. For
  each surviving directory `d`, require an applied path exactly
  `d/<folderReadme>`. Anything else is `W-FOLDER-README-MISSING`, one
  diagnostic per directory, naming the directory, the expected basename
  and the combination.
- **What `folderReadme` is:** a new optional `pack.json` key, one path
  segment under the same grammar as a step's `to`, defaulting to
  `README.md`. `coding` and `planning` omit it; `writing` declares
  `index.md`. Declared rather than sniffed, because a check that accepts
  either basename cannot report a missing one — the fail-closed habit
  applied to a content rule.
- **What it does not do:** it does not check that the README *says*
  anything, and it does not run at apply time. Q-50 is a content
  convention; this makes its shape checkable, not its prose.

### 3.6 Where phase 2's input comes from at execute time — F-5 / C-23, **decided**

**This is the single most consequential open question the re-review
found, and leaving it implicit is how the rest of the class got in.** F1
plans phase 2 at lifecycle step 6 and copies the payload at step 10
(F1 §F1.6, lines 2128 and 2144), so **at plan time `.harness/pack/` does
not exist**. F1 also says nothing reads the bundle after phase 1
(US-30). Both are true; neither says what the *planner* read, and no
document names the read source. Two readings survive, and they differ
security-materially.

- **A — phase 2 renders entirely at plan time, from planner-resolved
  payload bytes, and `executeApply` reads nothing from disk (CHOSEN).**
  The planner reads the **bundled** pack exactly once. That read *is* the
  payload: `payloadDigest` is computed over it (US-30), phase 1 writes it
  verbatim, and phase 2 renders from the same in-memory bytes.
  `.harness/pack/` is phase 2's **logical** input — the tree that
  *defines* what phase 2 consumed, and the tree `verify` re-reads — and
  its **literal** input only at `verify`.
- **B — phase 2 re-reads `.harness/pack/` during execution.** Q-41's
  sentence "phase 2 reads from the phase-1 copy" read as a statement
  about *when*, not about *which tree is authoritative*.

**A, and the argument is not a preference — B contradicts four
authoritative statements, three of them Q-41's own.**

1. **Q-41's own recorded consequence.** The brief §12, Q-41: *"The user
   cannot adjust the payload before phase 2 runs at v1.0."* Under B there
   is a **window** — between step 10 and step 11, and between step 11's
   own writes — in which `.harness/pack/<file>` can change. Content
   arriving through that window passed no validation, appeared in no
   disclosure, and is not covered by `payloadDigest`, which US-30 pins to
   the **planned** payload set. B makes Q-41's stated consequence false.
   A makes it true **by construction**, with no check to forget.
2. **Q-40's purity claim.** The brief §12, Q-40: the recipe is *"a pure
   function of (payload, parameters) — no timestamps, no ordering
   dependence, no environment reads."* A filesystem read at step *n* is
   an environment read, and its result is ordering-dependent. B is not a
   pure function of anything; A is.
3. **The authoritative flow.** `general/pack-application.md`:
   *"Everything is planned before anything is written. Validation, both
   phases and the manifest are computed in memory."* "Both phases … in
   memory" is A stated in three words.
4. **`payloadDigest`'s meaning.** US-30 already says the digest is over
   the planned set *"not over whatever is on disk under `.harness/pack/`
   afterwards."* Under B the manifest records a digest of one thing and
   the apply consumes another, and the mismatch is undetectable at apply
   time because nothing re-hashes. Under A the digest and the consumed
   bytes are the *same object*.

**What A costs, stated rather than glossed.** F1 §NFR says *"Phase 1
streams file by file and is not bound by the render budget."* A ends
that for any payload file a phase-2 step reads: those must be **held**,
not streamed. It does **not** end it for the rest — a payload file no
step reads (the great majority: templates, `conventions.md`, reference
docs, which Q-47 keeps in the payload precisely so they are *not* copied
out) still streams. So the render budget grows by the phase-2 *source*
set, which is bounded by the same 4 MB/32 MB payload caps and is a small
fraction of them. That is the whole cost, and it is worth it.

**What A does not permit anyone to conclude.** A is *not* licence to
delete the re-confinement of §7.1 stage 4. `executeApply` still re-runs
resolution confinement immediately before every write, still creates
exclusively, still raises `E-TARGET-RACE`. A removes a read of the
*payload*; it removes nothing from the *destination* side, where the
adversary is the filesystem (§7.0 actor 3) rather than the payload.

**And if a future version wants B** — a user-editable payload was
explicitly deferred, not rejected — C-23's second clause is the price:
every execute-time read re-hashes against the planned content for that
path and a mismatch is `E-TARGET-RACE`, exit 2, journal intact. Recorded
here so v1.1 inherits the condition rather than rediscovering it.

**Why US-30's proposed test does not settle this, and what replaces
it.** F1 US-30 offers: *make the bundle unreadable between the phases
and require the apply to complete.* That passes under **both** readings —
A never touches the bundle after planning, and B reads `.harness/pack/`,
not the bundle. It distinguishes nothing. The test that **does**
distinguish them: plan an apply, then **mutate `.harness/pack/<file>`
after phase 1 and before phase 2 completes**, and require the applied
output to be byte-identical to an unmutated run. A passes; B fails.
F1 must carry that test in place of the one it has.

### 3.7 A substituted answer in agent-instruction content — F-10 / C-28, **decided**

C-28 says silence does not satisfy it, and it is right to say so: C-8
forbids substitution into a security-relevant *settings* key and the
reasoning was never applied anywhere else, which reads as a considered
boundary when it was only an unexamined one.

**The boundary, stated.** A substituted answer landing in **agent-
instruction content** — `CLAUDE.md`, `AGENTS.md`, anything under
`.claude/` — is **content authored by the answering user, committed to
the repository, and read as instructions by every later agent run in
every clone of it.** It therefore crosses a real boundary that a settings
value does not cross in the same way: the person who *types* the answer
and the person whose agent later *reads* it need not be the same person.

**Decided: accept the residual, with reasoning, AND enumerate it in the
disclosure.** C-28 offers those as alternatives; taking both is better
than either, because the reasoning alone leaves a reader with no way to
see *which* values landed *where*, and the enumeration alone leaves them
without the standard for judging it.

*The reasoning — why this is accepted rather than forbidden.*

1. **It is not a privilege escalation, and C-8's subject is.** A settings
   value is consumed by a **mechanism** — the permission engine — that
   acts on it without further human judgement. Agent-instruction content
   is consumed by a model that still operates *underneath* that
   permission engine, which a pack cannot touch (§7.2.5, and C-19 now
   closes the route F-1 found). Injected prose can attempt to persuade;
   it cannot grant.
2. **Forbidding it deletes the feature.** Substitution into `CLAUDE.md`
   *is* the product: all three v1.0 packs put a project name there. An
   `E-SUBST-IN-AGENT-INSTRUCTION` would make every pack unshippable.
3. **The existing controls are load-bearing and they bite here.** C-7
   makes `pattern` **required** on every string parameter, anchored,
   ≤ 200 chars, with `maxLength` checked first; C-9's **newline ban**
   (`\n`, `\r`, `U+2028`, `U+2029` — `E-SUBST-NEWLINE`) forbids the value
   from opening a line. Together those kill the effective injection
   shapes — a forged heading, a forged instruction block, a forged fenced
   region all require a line break — and the recommended default pattern
   `^[\p{L}\p{N} ._-]{1,64}$` admits no backtick, brace, angle bracket,
   hash or colon. What survives is a single-line clause inside a
   sentence, which is the weakest form of the attack and the one a reader
   of the file sees.

*The enumeration — what stops this from being silence.*
`SecurityDisclosure` gains `agentInstructionSubstitutions`: every
agent-instruction applied path receiving a substituted value, with the
parameter id and the **value verbatim**, on exactly the terms C-2 sets
for `settings` — one per line, never summarised, never truncated, never
counted — rendered by `pack info`, `validate --json` and `init`'s
pre-write summary from the one builder.

*And it does not gate.* `requiresConsent` does not read the new array.
Gating it would fire the consent prompt on **every apply of all three
v1.0 packs**, which trains a user to accept without reading and destroys
the property F1 US-13 states plainly — *"the disclosure requires no
consent … this is every v1.0 pack"* — under which a prompt, the first
time one ever appears, **means something**. This is the same
enumerate-don't-gate trade C-12 already makes for the executable bit,
and it is made here for the same reason.

*Rejected: a `W-SUBST-IN-AGENT-INSTRUCTION` warning.* §3.5 put
`validate --all --strict` in CI. A warning that fires for all three
bundled packs on every run either fails the build or teaches the team to
ignore `--strict`. A diagnostic that everything legitimate trips is not
a diagnostic.

### 3.8 Whether `merge-json` should ship at all at v1.0 — chosen A, **OVERTURNED by Q-54 on 2026-08-31: B was taken**

> **Status: overturned.** This section chose **option A** — keep the
> seven-primitive set. The re-reviewer took **option B**, and the
> decision is recorded as **Q-54** in `project-brief.md` §12,
> 2026-08-31. **`merge-json` is dropped from v1.0. The primitive set is
> six.** The paragraphs after this box are the original argument,
> **kept verbatim as history**, because this section explicitly invited
> the reversal — *"if the review prefers B, say so and it is a small
> change to make"* — and a record that deletes the argument it lost
> leaves the next reader unable to see whether the reversal was
> considered or merely convenient.

**Why B won, in the reviewer's terms and not this section's.** Three
reasons, in the order they carried weight:

1. **No v1.0 consumer.** §6.2 change 12 removed the last `merge-json`
   step from every bundled pack. All three were placeholders — none
   named a `from`, none named an owned key, and no pack's payload holds
   a settings source file — so what remained was the primitive carrying
   the most security machinery in the format, exercised by nothing that
   ships.
2. **It was the target of both CRITICALs in the Mode A re-review**, of
   both lapses of C-16, and of the rollback defect found in the same
   pass. Deleting the surface is a stronger fix than repairing it, and
   the repair was the larger change.
3. **The purity claim comes back for free.** `merge-json` was the only
   primitive taking a **fourth input** — its destination's pre-existing
   content. Without it, Q-40's *"pure function of (payload, parameters)"*
   and `verify`'s recomputation identity are true **as originally
   written**, at every applied path. F-4 resolves with no change, and
   C-22's narrowing (§7.9) is deliberately **not applied**.

**Where each of option A's three grounds now stands, since they are the
part a future reader will want tested rather than the part they will want
re-read:**

| A's ground for rejecting B | How it stands after Q-54 |
|---|---|
| *(i) it does not close the class it appears to — `rewrite-path` and `substitute` still reach `package.json`, so C-19's machinery is needed anyway* | **Correct, and it survives.** This is the one ground Q-54 does not overturn. C-19's write-set quantifier is kept in full and is now what keeps those two primitives out of the settings files and `package.json`, which join the stage-2 reserved-destination denylist. The machinery shrank; it did not vanish, exactly as A predicted |
| *(ii) the seven-primitive set is recorded in brief §12 Q-40 and in `general/pack-application.md`, so changing the count is above this amendment's remit* | **Correct about the remit, and the remit was exercised.** The count was changed at the level that owns it: Q-40 carries an amendment note, Q-54 is a new row, and `pack-application.md` now reads six. A is not faulted for declining to make that change; it is superseded by the change being made |
| *(iii) a format that cannot set `model` in `settings.json` will acquire that capability under time pressure in v1.1, and acquiring it after the apparatus was deleted is strictly worse than keeping apparatus that is specified, tested against fixtures and dormant* | **This is the ground that lost, and it lost on evidence rather than on preference.** Dormant apparatus is not free: it was where both CRITICALs landed, and neither the disposition table nor two review rounds caught the route into it, precisely because nothing shipping exercised it. The v1.1 risk A names is real and is **transferred, not dismissed** — it is now §9 item 10's obligation on the settings capability's *return*. The general lesson, and it is the one this ADR should be read for: **specified-but-dormant security machinery is a liability, not an option**, and the honest response to a capability with no consumer is to defer it with its controls, not to ship it unexercised |

**The compensating control that A rested on is void as stated.** *"`merge-json`
at a `.claude/settings*.json` destination is fixture-tested only"*
cannot be true of a primitive that does not exist, and §6.1 change 27's
fixture list is corrected accordingly. The fixtures that replaced it are
better: they assert that **every route** to a settings file fails with
`E-MAP-RESERVED-DEST`, which is a test of the rule rather than of one
primitive's constraint.

---

**The original argument, kept as history. Superseded 2026-08-31 by Q-54.**


§6.2 removes the last `merge-json` step from every v1.0 pack (change 12),
which makes `merge-json` **the one primitive with no v1.0 consumer — and
the one carrying the most security machinery.** That combination invited
a sharper option than the one taken, and it would be dishonest not to
record it.

- **A — keep the seven-primitive set (chosen).** `merge-json` ships,
  unexercised by any bundled pack, exercised by the adversarial fixture
  packs of §6.1 change 27.
- **B — drop `merge-json`; six primitives at v1.0.** *Advantages, and
  they are not small:* the entire S-1 class becomes **structurally
  impossible** rather than merely forbidden. `DestinationPolicy`,
  `OwnedKey`, `checkOwnedKey`, `SecurityDisclosure.settings`,
  `ConsentInputs`, the consent gate, the leaf-only rule,
  `E-OWNEDKEY-FORBIDDEN`, `E-SETTINGS-MODE-FORBIDDEN`,
  `E-SUBST-IN-SECURITY-KEY` and C-1, C-2, C-3, C-8, C-11 all lose their
  subject. Six of this pass's twelve conditions would not need to exist.
  *Rejected, on three grounds:* (i) it does not close the class it
  appears to — with no `merge-json`, `rewrite-path` and `substitute`
  become the only way to edit a JSON file, and C-19's written-path-keyed
  policy is needed **anyway** to stop them reaching `package.json`; the
  machinery shrinks, it does not vanish; (ii) the seven-primitive set is
  recorded in the **brief §12 Q-40** and in `general/pack-application.md`
  as authoritative, so changing the count is a decision above this
  amendment's remit; (iii) a format that cannot set `model` in
  `settings.json` will acquire that capability under time pressure in
  v1.1, and acquiring it then — after the apparatus was deleted — is
  strictly worse than keeping apparatus that is specified, tested against
  fixtures, and dormant.
- **The compensating control, and it is a real obligation.** Because no
  bundled pack exercises it, `merge-json` at a `.claude/settings*.json`
  destination is at v1.0 **fixture-tested only**. §9 records that **the
  first real pack to declare a settings `ownedKeys` requires a fresh
  Mode A pass** before it ships. Untested security code is the failure
  mode B was trying to avoid, and this is the honest price of A.

**Flagged for the re-reviewer explicitly:** if the review prefers B, say
so and it is a small change to make — the fold is deletions. It is
recorded as available rather than argued away.

*(End of the original argument. The review did prefer B, said so, and the
fold was deletions. Q-54.)*

---

## 4. Rationale

Every choice above falls out of one constraint and one correction.

The constraint is **Q-40**: phase 2 must be inspectable before it runs,
because that is what the entire security architecture stands on. That
decides the discriminated union over a registry lookup (exhaustiveness is
a compile-time property, and `E-RECIPE-PRIMITIVE-UNKNOWN` is what
protects it at the boundary), it decides that `pack info` renders the
complete step list rather than a summary, and it decides that a
"capability" a pack could declare is not an option — what a pack may do
is a property the CLI owns, in the same way and for the same reason that
what a pack may *own* in a settings file is a property of the
**destination** rather than of the pack. The two are the same decision
applied to two surfaces, and keeping them the same shape is what makes S5
survive: adding `planning` touches no table.

The correction is **Q-52**, and it is worth being precise about what it
corrects. Q-43's argument is sound as far as it goes:
`expected = phase2(payload, recipe, answers, scaffolds)`, and every input
is local and committed, so a hash list is redundant. But the argument
proves the applied tree matches *the payload on disk*, not *the pack that
shipped* — and `verify`'s job is the second thing. One digest closes the
gap, and it is the smallest possible closure: not per-file, not
per-region, not an integrity field on the pack, just one hash over one
tree. It also happens to cover `recipe.json`, since the recipe lives in
the payload, so a hand-edited recipe is caught by the same check without
a second mechanism.

**The digest must be over normalized content, and this is load-bearing
rather than a detail.** Phase 1 copies raw bytes, so a naive digest would
be over raw bytes — and a Windows clone with `core.autocrlf` rewrites
those bytes on checkout, making `verify` report a tampered payload on
every Windows machine. That is the same failure the deleted
`.harness/.gitattributes` existed to prevent, arriving by a different
door. Normalizing (BOM strip, CRLF→LF, and nothing else — Q-26) makes the
digest survive a checkout, at the cost of not detecting a pure
line-ending edit of the payload. That trade is already made everywhere
else in the product and it should be made the same way here.

The `.harness/README.md` decision is smaller but the reasoning is the
same shape, and the escalation sharpened it. When a content decision
(Q-50) collides with a security invariant (C-5), the invariant does not
bend — but the first pass took "do not bend it" to mean "move the work to
the CLI", and that still left C-5 stated as *a rule plus a named
carve-out*. The answer that came back is better: **ask whether the
content decision reaches this folder at all.** It does not. Q-50's
exclusion criterion is *tool-owned*, `.harness/` is tool-owned more
plainly than `.claude/` is, and applying the criterion the rule already
has is cheaper than inventing an exception to a different rule. C-5 is
now statable in one sentence with nothing after the comma: **a recipe
step may never write under `.harness/`.** That is the sentence §7.1's
blockquote was already trying to write.

The general lesson is worth keeping, because it will recur: a carve-out
is a cost paid by every future reader of the invariant, and it should be
priced against the *content* it buys, not against the implementation
effort it saves. One paragraph of orientation prose did not clear it.

---

## 5. Consequences

**What this unblocks:**

- **F2 immediately.** `planApply` / `executeApply` / `rollback` and the
  diagnostic taxonomy are the whole of F2's substrate. F2 adds an argv
  surface for `init`, interactive prompting and the consent UX, and
  nothing else. F2's requirement list is already written: it is the
  nine-step manual-apply log.
- **The test writer now.** The contract above is complete enough to write
  acceptance tests against before implementation exists, which is the
  point of locking it here. The two highest-value tests are stated
  directly by the model: apply twice into two empty directories and
  byte-compare recursively with no exclusions; and make the bundled pack
  unreadable between the phases and require the apply to complete (which
  is Q-41 made checkable).
- **F5's authoring**, once F5 is folded (§6). Calibration is expressible
  today by conditional steps, and `PackReport.parameterVaryingSteps` is
  the mechanically-checked form of F5's "declared calibration-varying"
  assertion.

**What this constrains:**

- **F2 may not reorder the phases or the writes.** `recipe/plan-steps.ts`
  is the single ordering authority, and `apply/execute.ts` writes in the
  order the plan gives. The consent gate precedes the lock; the manifest
  is the last write.
- **v1.1's `update` may only read state through `PackManifest` and
  `.harness/pack/`.** It may not re-derive an applied file set from the
  tree, and it must re-evaluate `when` against the **recorded** answers.
  It must check `payloadDigest` before merging — that is C-11's concern
  and Q-52 has already paid for half of it.
- **Q-50 becomes a checked rule, so every pack pays it.** With §3.5's
  step 12 and `validate --all --strict` in CI, a pack that adds a folder
  and forgets its README fails the build. That is the point, and it is
  also a real constraint on F5's authoring: `writing` must declare
  `folderReadme: "index.md"`, and any folder any pack creates needs a
  README step in the same `when` branch as whatever creates the folder.
- **F5 loses `shared/` entirely.** Its `shared/targets` section, its
  G5.7, its `E-SHARED-*` error rows and its Q-34/Q-49 dependency chain
  all come out (§6.2).

**What gets harder, and what it costs:**

- **Every diagnostic must be registered in one catalogue before it can be
  thrown**, so adding an error is a two-file change. Unchanged from the
  original ADR and still correct.
- **`merge-json` needs an order-preserving JSON serializer**, which is
  more work than `JSON.stringify` and remains the one place F1 can
  plausibly overrun. Fallback if it does: write-if-absent, and record the
  shortfall against R5. **Cheaper than it was**: with `update` deferred
  there is no removal-honouring merge to build (C-3), so the serializer
  is the whole of the difficulty.
- **Two costs the 2026-08-31 re-review fold adds, both named rather than
  absorbed.** **(a)** `parseStrictJson` (C-25) is a hand-rolled JSON
  token pass, because Node offers no duplicate-key option and a reviver
  never sees the collapsed key — the one place this ADR replaces a stdlib
  call instead of wrapping it, and a real 60-odd lines with its own test
  burden. **(b)** §3.6's plan-time rendering ends *"phase 1 streams file
  by file"* for the **phase-2 source set**, which must be held in memory.
  Not for the rest of the payload — templates and reference docs no step
  reads still stream — so the render budget grows by a bounded and small
  fraction of the 32 MB cap. Both are worth it; neither is free.
- **Determinism is now a scoped invariant, and the scope is stated.**
  Phase 2 is a pure function of (payload, answers, scaffolds) at every
  applied path **except a `merge-json` destination**, where the prior
  content is a fourth input (§7.9, C-22). **G-F1-4 needs no change** — it
  already says "into two empty directories". What changes is the
  unqualified restatements in F1's §NFR, its Introduction, US-31, the
  master spec and the brief's Q-40. At v1.0 the exception has **no
  shipping subject**, because §6.2 change 12 removes the last
  `merge-json` step from every bundled pack — which makes it cheap to
  state correctly now and expensive to retrofit later, the same trade
  Q-45 made for inert anchors.
- **A hand-edited manifest can still lie.** `payloadDigest` binds the
  payload to the manifest; nothing binds the manifest to itself, because
  Q-43 removed the self-hash and its only consumer was a merge that no
  longer happens. Someone who edits the payload *and* recomputes the
  digest defeats the check. That is deliberate work rather than an
  accident, v1.0 never merges against the manifest, and stating it is
  better than implying a check that is not there.
- **Two calibrations, two targets contracts, and no mechanical
  consistency check between either pair.** Q-49's duplication is accepted
  and must be a **named v1.1 task**, not a discovery.

**The security model is dormant at v1.0, and that is correct.** No v1.0
pack registers a hook, and no v1.0 pack owns a security-relevant settings
key — so the consent gate never fires for `coding`, `writing` or
`planning`, and `init` stays non-interactive-clean. The apparatus is not
a feature; it is a **format constraint**, and its value is that
`lintel harness validate` refuses a pack that would grant itself
permissions before that pack can exist.

---

## 6. Conflicts flagged

Everything below is a place where a current document contradicts this ADR
or the settled model. **This ADR edits no other file.**

**Fold status as of the 2026-08-31 Mode A re-review fold — checked
against each document's actual text and amendment row, not taken on
trust, because taking a claim on trust is what §8.0 is about.**

- §6.1 changes **1, 2, 4–11 are folded into F1 v2.1**; change **3 is
  withdrawn** by the escalation answer and F1 correctly never applied it;
  changes **12–16 are folded into F1 v2.2** — its amendment row records
  step 12, the renumber to 14, `W-FOLDER-README-MISSING`, `folderReadme`
  and `--strict` in CI. **Changes 17–27 are new in this pass and are not
  folded.**
- §6.2 changes **1–9 are folded** into F5's second 2.0 pass and **10–11
  into its third** — F5's amendment row records `writing`'s
  `folderReadme: "index.md"` and the same-`when`-branch rule. **Changes
  12–16 are new in this pass and are not folded.**
- §6.3's seven changes are **folded**; **change 8 is new and is not**.
- §6.5 is new, is outside this ADR's edit scope, and is unfolded by
  definition.

**Both items the previous verdict blocked on have therefore landed.
Everything §10 now blocks on was created by the re-review.**

### 6.1 `F1-spec-pack-format-and-manifest.md` — fifteen changes folded (v2.1, v2.2), one withdrawn, **eleven new**

> **Read against Q-54 before folding anything from this list.** F1 is at
> **v2.3** and has folded 17–27 already, as amended by Q-54. Four rows
> below instruct changes that are **void or altered** because their
> subject no longer exists:
>
> | Row | Status under Q-54 |
> |---|---|
> | **6** — extend `E-MERGE-JSON-INVALID` to a malformed payload-side `from` | **VOID.** The code is removed from the catalogue |
> | **17** — re-key the stage-2 denylist to the write set | **FOLDED, and it grew.** `.claude/settings.json`, `.claude/settings.local.json` and `package.json` are now *on* that denylist, which is what replaced the destination policy |
> | **18** — US-6's op lockdown, `allowedOps` columns, the table-level forbidden floor | **VOID as written; its purpose is served by 17.** US-6 is **retired**: its subject is deleted. The hook rule and the inert-hook-script disclosure it also carried move into US-3, and must not be lost with it |
> | **25** — strict duplicate-key JSON parsing | **FOLDED, minus its carve-out.** The exemption for a `merge-json` destination and its payload-side `from` has no subject |
>
> Row **27**'s fixture list is corrected in place. Every other row stands
> as written.

| # | Where | Change | Why |
|---|---|---|---|
| 1 | §Technical Context *Manifest content* · US-10 · §F1.4 · §F1.5 · §F1.8 · §F1.9 · §NFR *Hashing algorithm* · §Open Questions Q-52 | **The manifest is six keys, not five.** Add `payloadDigest: sha256-…` between `pack` and `parameters`; add it to the §F1.4 worked example and its field table (consumer: `verify`, v1.1 `update`); change "lets the manifest be five keys" and "Five keys" to six; change §NFR's "It is **not** used in the manifest" — SHA-256 now has a fourth use; **move Q-52 from Open Questions to Resolved**, citing the brief | Q-52 amends Q-43. F1 v2.0 predates it |
| 2 | §F1.3 step 8 · §F1.3's closing note · §F1.9 known limit 1 · US-3's "An empty directory is not representable" | **Delete the `skeleton/specifications/` step and the skeleton rationale.** Replace with the Q-50 READMEs: five `rename` steps out of `packs/coding/applied-readmes/` (`agentteams.md` → `AgentTeams/README.md`, `specifications-general.md` → `specifications/general/README.md`, `specifications-version.md` → `specifications/v1.0/README.md`, `targets.md` → `targets/README.md`, `copy.md` → `copy/README.md`). Restate the limit as **"an empty directory is not representable, and under Q-50 nothing needs one"** | Q-50 dissolves the premise. `packs/coding/applied-readmes/` already exists on disk with exactly these **five** files — `agentteams.md`, `copy.md`, `specifications-general.md`, `specifications-version.md`, `targets.md`. (`harness.md` was a sixth until the §3.4 escalation was answered; it is deleted) |
| ~~3~~ | ~~US-3 stage 2 carve-out · §F1.6 lifecycle · US-10~~ | **WITHDRAWN 2026-08-31.** This change instructed F1 to add `.harness/README.md` to the CLI-owned write list at §F1.6 step 11b. The escalation answered §3.4 **option C**: `.harness/` is excluded from Q-50 as tool-owned, exactly as `.claude/` is. **There is no `.harness/README.md` and no CLI write that produces one**, the CLI-owned list under `.harness/` stays at five — payload, manifest, journal, `journal.d/`, lock — and **C-5 has no carve-out**. F1 v2.1 did not apply this change and was right not to. **Nothing to fold** | The brief §12, Q-50 as amended 2026-08-31 |
| 4 | US-33 · §F1.8 | **`verify` checks `payloadDigest` first, fail-closed.** Delete "What `verify` cannot tell you at v1.0" and §F1.8's "The known limit, stated rather than glossed" — both are void. State the new order: digest, then recomputation; a digest mismatch suppresses the tree comparison because the expectation is computed from an untrusted input | Q-52 |
| 5 | §Error States | **Add `E-PAYLOAD-DIGEST-MISMATCH`, exit 2.** `lintel: .harness/pack/ does not match the payload this project recorded.` / `  recorded {recorded}` / `  computed {computed}` / `  The applied tree cannot be checked against an edited payload.` / `  → Restore .harness/pack/ from version control, or re-apply into a fresh directory.` | New code required by change 4 |
| 6 | §Error States `E-MERGE-JSON-INVALID` | Extend to cover an unparseable **payload-side** `from`. Today the row covers only the destination and the post-serialization re-parse | A `merge-json` whose source JSON is malformed currently has no code |
| 7 | §Open Questions Q-48, Q-53 | **Both are resolved in the brief §12** (Q-48: no `shared/` at v1.0; Q-53: F1 owns `verify`). Move both to Resolved Decisions and cite the brief rather than posing them | The brief is authoritative and post-dates F1 v2.0 |
| 8 | §Technical Context · §F1.6 · US-13 | **Name the type CLI-owned writes carry.** F1 says they are "confined by construction" but the format has no term for them, and the journal covers phase-1 writes whose destination the denylist forbids to a recipe step. Adopt `HarnessPath` / `WritablePath` from the contract above | Phase 1 opened a typing hole the old model did not have. C-14's compile-error property does not hold without it |
| 9 | US-30 | State that the payload file set used for `payloadDigest` is the **planned** set, computed in memory before any write, so "everything is planned before anything is written" stays literally true | Q-52 + the atomicity NFR |
| 10 | §NFR *Legibility* | "The manifest fits on a screen" still holds at six keys — confirm rather than silently leave it | Editorial, but it is an assertion |
| 11 | §Open Questions preamble | "Next free id at the time of writing: **Q-51**" is wrong — Q-51, Q-52 and Q-53 are all allocated and resolved. **Next free is Q-54** | Counter drift |
| **12** | **US-16 check order** | **Insert a new step 12, "folder READMEs (Q-50)", between the per-combination render (11) and link integrity.** Link integrity becomes 13, disclosure 14. The order block is inside a fenced code listing and is declared "part of the contract", so the renumber is a contract change, not formatting. Semantics per §3.5: per parameter combination, take the proper directory prefixes of the combination's applied paths, drop the project root and everything under `.claude/` and `.harness/`, and require `d/<folderReadme>` for each remaining `d` | §3.5. The rule was enforced by prose and by a suggested test; it is decidable from the pack alone |
| **13** | **§Error States** | **Add `W-FOLDER-README-MISSING`, warning, exit 1 under `--strict` only.** `lintel: {pack} creates {dir} but writes no {basename} into it.` / `  combination: {combination}` / `  → Add a step producing {dir}{basename} in the same condition branch, or make {dir} unnecessary.` | New code required by change 12 |
| **14** | **US-16's CI criterion** | "`validate --all` is runnable in this repo's CI" becomes **"`validate --all --strict` is runnable in this repo's CI and passes for all three v1.0 packs"** | A warning nothing runs strictly is not enforcement. §3.5 option C is only sound with this |
| **15** | **US-1 · §F1.3's `pack.json` worked example and field table** | **Add `folderReadme?: string`** — one path segment under US-3 stage 1's segment grammar, default `README.md`, invalid value is `E-MAP-PATH-GRAMMAR` at validate time. `coding` omits it | Change 12 needs a declared basename; `writing` uses `index.md`. Sniffing "either basename" cannot report a missing one |
| **16** | **US-3's Q-50 paragraph** | The suggested integration test ("a test **may** assert this by applying any v1.0 pack…") stands, but state that `validate` now checks the same rule statically at US-16 step 12, so the integration test is confirmation rather than the only enforcement | Otherwise two mechanisms exist with no stated relationship |

**Changes 17–27 — new in the 2026-08-31 Mode A re-review fold.** These
carry C-19…C-30 into F1. **Cited against F1 v2.2's actual text**, with
its line anchors, because checking a claim against a table rather than
against the document is how six conditions lapsed. **No new US id and no
new Q id** — every change lands in an existing story. **Four new error
codes**: the catalogue goes from **78 rows to 82**.

| # | Where | Change | Why |
|---|---|---|---|
| **17** | **US-3 stage 2** (F1:483-489) | The denylist is stated *"No step's `to`, no scaffold step's `to` and no `executableRoots` entry may resolve…"*. **Replace the quantifier: "No applied path in any step's WRITE SET, and no `executableRoots` entry, may resolve…"** — and define the write set in §F1.2 (change 19). Keep everything else: `E-MAP-RESERVED-DEST`, exit 2, after resolution, C-5 absolute, the `HarnessPath` category note | **C-19, C-5.** `rewrite-path` and `substitute` have no `to`, so the rule as written has two silent exemptions |
| **18** | **US-6** (F1:661-664, and the policy table F1:689-693) | Three changes. **(a)** The op-lockdown sentence enumerates *"a `copy`, `rename` or `strip-suffix` step whose `to` is…"* — three ops, **omitting `generate`**, and keyed on `to`. Replace with the write-set rule: *"Any step whose write set contains `.claude/settings.json`, `.claude/settings.local.json` or `package.json` and whose `op` is not in that destination's `allowedOps` fails `E-SETTINGS-MODE-FORBIDDEN`, exit 2 — **by any route**: as a `to`, as an `in`-glob match, or as a directory recursion's output."* This also reconciles US-6's prose with the catalogue row at F1:1620, which already states the rule generically and therefore **already disagrees with US-6's own prose**. **(b)** Add the two missing columns to the table at F1:689-693 — **`allowedOps`** (`['merge-json']` for both settings rows and for `package.json`; `null` for *any other JSON target*) and a **resolution rule**, which F1 currently states **nowhere**: *"a destination matches a row when `collisionKey(dest)` equals the `collisionKey` of one of the row's declared destinations — NFC-normalized then case-folded, on every platform, unconditionally. The table is total; *any other JSON target* is the fall-through."* **(c)** Move `hooks`, `scripts`, `permissions` and `env` out of the per-row *Forbidden* cells into a **table-level floor in force at every destination, which no row may shrink** | **C-19, C-20, C-16.** (a) is the settings half of the re-opened S-1. (b) F1 says the table is *"keyed by applied path"* and never says how a path is matched, so `.claude/Settings.json` falls through to the permissive row on the two platforms where it is the same file — and CI is the third. (c) the fall-through row forbade **nothing**, so `scripts.postinstall` was ownable at any JSON destination no row names |
| **19** | **§F1.2** (F1:1800-1832) | **Add the write set as a named concept**, one paragraph and one column. The signature table gains a **Write set** column stating, per op, the applied paths whose bytes it creates or changes — `copy`/`strip-suffix` their expanded recursion, `rename`/`generate`/`merge-json` their `to`, `rewrite-path`/`substitute` every written-set path their `in` globs **match** (matched, not hit: a path whose content lacks `find` is still in the set). **And state what it does not do:** the placing/editing sentence at F1:1827-1832 is about **ordering**, not authority, and stays exactly as written — a `substitute` after a `copy` into one path is legitimate and `E-MAP-COLLISION` must **not** widen to cover it | **C-19.** The concept needs one home or it is re-derived differently in each of US-3, US-6 and US-16. The second half is a guard-rail: the obvious wrong fix breaks every pack |
| **20** | **US-16 check order** (F1:1174-1204) | **No renumbering.** Step **6** (destination safety) gains the write-set quantifier; step **8** (destination policy) gains `E-SETTINGS-MODE-FORBIDDEN` evaluated over write sets and the `collisionKey` resolution; step **4** (recipe schema) gains `E-RECIPE-FORMAT-NEWER`, `E-JSON-DUPLICATE-KEY` and `E-RECIPE-TOO-MANY-STEPS`. State that the write set is computed **once**, after step 5, and consumed by 6, 7 and 8 | **C-19, C-24, C-25, C-30.** The order is contract; this pass adds checks to existing steps rather than steps, so the contract does not move |
| **21** | **US-4** (F1:576-595) and **§F1.2** (F1:1810-1811, 1822) | **(a)** `substitute`'s clause says only *"in every applied file matched by `in`"* and **never repeats "already written"** — the constraint is carried for `substitute` by one §F1.2 table cell. Make the two primitives read **identically**. **(b)** State the resolution domain as a **rule**, not as three scattered criteria: *"the resolution domain of an `in` glob is the plan's ordered written-set — the applied paths every earlier step writes — and nothing else: never the filesystem, never the payload, never the project."* **(c)** Add the missing check: **every path an `in` glob matches is re-checked against the stage-2 denylist**, `E-MAP-RESERVED-DEST` if it fails | **C-27.** Recorded honestly: F1 **already** pins `rewrite-path` in three places, so the finding overstates for that primitive. The genuine residual is `substitute`'s weaker wording, the absence of a normative statement, and the missing re-check — which rests on a sound but **implicit** chain, the exact failure mode this pass exists to repair |
| **22** | **US-30** (F1:1329-1341) | **(a)** Add to the *"phase 1 does not"* sentence: **"…or preserve any source file mode."** **(b)** Add to what phase 1 *does*: **"writes every payload file `0644` and every created directory `0755`, unconditionally, reading no source mode."** **(c)** Note the interaction: `E-EXEC-DEST-FORBIDDEN` forbids `0755` under `.harness/`, and the fixed mode is what makes phase 1 satisfy it **by construction** rather than by a check phase 1 has no declaration to run. **(d)** State the non-cost: a pack's executable is made executable by the recipe step that copies it out, at the destination; nothing ever reads the payload copy's mode | **C-26, C-12.** F1 specifies phase 1's content fidelity exhaustively and is **silent on mode** — and F5 fills the silence with the opposite rule (§6.2 change 15) |
| **23** | **US-1** (F1:300-305) | The closed enumeration lists **six** behaviour-selecting positions. **Add `Recipe.formatVersion`** — **seven** — and state its code is `E-RECIPE-FORMAT-NEWER`, alongside the three positions that already have their own | **C-24, C-16.** `recipe.json` declares `formatVersion` (US-31, F1:1390) and **no rule anywhere checks it**; `E-PACK-FORMAT-NEWER` names `pack.json` only. A newer recipe format is currently best-effort applied — fail-open in the position C-16 exists to close |
| **24** | **US-31** (F1:1390) · **§Error States** | Add the rule to US-31: *"`formatVersion` greater than the CLI's supported **recipe**-format version fails with `E-RECIPE-FORMAT-NEWER`; equal or lower proceeds"* — mirroring US-1's `pack.json` sentence at F1:270. **New catalogue row, exit 2:** `lintel: {pack}'s recipe declares format version {declared}; this CLI supports {supported}.` / `  → Upgrade lintel, or use a pack built for this version.` | **C-24.** Same shape and same class as `E-PACK-FORMAT-NEWER`, different file and different axis, so a different code |
| **25** | **US-1** (F1:292-293) · **US-31** · **US-15** · **§Error States** | **Duplicate JSON keys are rejected in authored JSON.** `pack.json`, `recipe.json` and `.harness/manifest.json` are parsed by a reader that rejects a duplicate key **at any depth**. **New catalogue row, exit 2:** `E-JSON-DUPLICATE-KEY` — `lintel: {file} declares "{key}" more than once (lines {first} and {second}).` / `  A duplicate key means the file a reviewer reads is not the file the CLI runs.` / `  → Remove the duplicate.` **Scope it explicitly:** not applied to a `merge-json` **destination** or its payload-side `from` — a duplicate there is `E-MERGE-JSON-INVALID`, exit 2, nothing written. **Also state:** a step's `op` is matched **literally** — no trimming, no case folding — so `"copy "` is `E-RECIPE-PRIMITIVE-UNKNOWN` | **C-25.** §7.0's threat model names the JSON diff review as the control that catches a bad grant; `JSON.parse` takes the last duplicate and a diff reader takes the first, so the pack reviews as one thing and executes as another. The scope carve-out matters: one of those files is the **user's own** |
| **26** | **US-13** (F1:998-1003) · **US-3** (F1:470-476) | **`E-TARGET-EXISTS`, the `--force` byte-identity check and the journal's `preExisting` determination resolve by `collisionKey`**, not by exact string. State that the folding rule of US-3 applies to **step-vs-existing-file** comparison and not only to step-vs-step | **N-5 — found in this pass, not by the re-review, and it is C-20's defect one layer down.** On macOS or Windows a project holding `.claude/Settings.json` and a step writing `.claude/settings.json` are the same file: `E-TARGET-EXISTS` does not fire, the apply silently overwrites, the journal records `preExisting: false`, and **rollback deletes a user file it did not create** — which breaks C-13's stated invariant. Fixing `policyFor` without this leaves the class open |
| **27** | **US-16** · **§NFR** *Testability*, or a new criterion on US-16 | **Require adversarial fixture packs.** A fixture directory of deliberately malicious packs, each asserted to fail with a **named code** and a **named exit class** — not merely non-zero — run by `validate` in CI alongside `--all --strict`. **The minimum set is decided, not left to taste, and it is F1 v2.3 US-16's table, which is the list of record.** This cell no longer restates it. **Corrected 2026-08-31 (Q-54):** the list originally written here named four fixtures that **cannot exist** — `merge-json` to `.claude/Settings.json` claiming `hooks`, `ownedKeys: ["hooks"]`, `ownedKeys: ["scripts.postinstall"]` at an unnamed JSON destination, and a duplicate `ownedKeys` key — because the primitive, the field and the destination policy they exercise were all deleted. A fixture asserting a code the catalogue no longer holds fails for the wrong reason, which is the one thing this change exists to forbid. **What replaced them is stronger:** the settings class is now covered by five fixtures asserting that **every route** to `.claude/settings.json`, `.claude/settings.local.json` and `package.json` — a `to`, a case variant, a `generate`, a directory recursion that produces one without any step naming it, and an `in` glob — fails `E-MAP-RESERVED-DEST` at exit 2 with zero bytes. That tests the rule rather than one primitive's constraint on it. **Unchanged and still required from the original list:** `op: "copy "`; a recipe `formatVersion` of 999; 257 declared steps; an `in` glob naming `.harness/pack/**`; a `to` of `.harness/README.md`; a payload file shipped `0755`. **Added since:** a duplicate key in `pack.json`, a symlink in the pack, and the N-5 `collisionKey` case | **The process control, and the most important change in this list.** F-1 was reachable in **two recipe steps** and survived a full rewrite plus a disposition table that declared C-1 and C-2 satisfied. A fixture would have caught it on the first CI run. **No amount of table-reading did**, twice. The correction above is the same lesson one turn later: a fixture list maintained in **two** places drifts, so this one defers to F1's |

### 6.2 `F5-spec-template-packs.md` — eleven changes folded, **five new**

Changes 1–9 are **folded** into F5's second 2.0 pass; the two contract
breaks are closed. Changes 10–11 are **new in the 2026-08-31 pass** and
are not folded.

| # | Where | Change | Severity |
|---|---|---|---|
| 1 | §Scope · G5.7 · US-22 · US-28 · the `shared/targets` section · each pack's *References* line · the extraction step (c) · Q-34 | **Remove `shared/` entirely (Q-48).** `targets` ships as `coding`-local content; `planning` ships **its own copy** (Q-49). There is no `shared/` tree, no `component.json`, no digest pin and no bump rule at v1.0 | **Contract break** — F5 specifies a mechanism F1 v2.0 does not define |
| 2 | §Error States, CLI table | **Delete the `E-SHARED-UNDECLARED` and `E-SHARED-STALE` rows.** Neither code exists in F1 v2.0's catalogue, and F5 itself states F1's catalogue is the only one | **Contract break** — F5 cites codes that do not exist |
| 3 | §Error States, "Gap flagged, not filled" | **Delete it. The gap is closed.** F1 v2.0 carries five recipe codes: `E-RECIPE-MISSING`, `E-RECIPE-INVALID`, `E-RECIPE-PRIMITIVE-UNKNOWN`, `E-RECIPE-STEP-INVALID`, `E-RECIPE-SOURCE-MISSING`, plus `E-PAYLOAD-PATH-INVALID` for a `from` that escapes the pack and `E-MAP-RESERVED-DEST` for a step writing somewhere reserved. Cite them | High — F5 asserts a defect in F1 that F1 has fixed |
| 4 | §Open Questions Q-49, Q-50, Q-51 | **All three are resolved in the brief §12.** Move to Resolved Decisions with the brief's answers: Q-49 planning ships its own copy; Q-50 every created folder carries a README and there is **no `mkdir`**; Q-51 the writing extraction may author `index`/`home` templates as recipe scaffolding | High |
| 5 | line ~1057 "**No primitive creates an empty directory** — see Q-50" · line ~1576 "`portfolio/bets/` is created empty" · §NFR "phase 2 writes 19 files and **2 empty directories**" | **Restate against Q-50.** No folder is empty. `planning` gains `portfolio/README.md` and `portfolio/bets/README.md` — and, once Q-49 makes it ship its own targets copy, `targets/README.md` as well, which is **three**, not the two the brief's Q-50 row counts; F5's fold says three and F5 is right (**flagged, §9 item 8**). `coding` gains **five** folder READMEs, all of them recipe steps; `.claude/` and `.harness/` are excluded as tool-owned and **there is no `.harness/README.md`**; the file/directory counts change | High |
| 6 | `coding` payload outline · the recipe table | **`packs/coding/applied-readmes/` is unstated in F5 and exists on disk.** Add it to the payload inventory and add its five `rename` steps to the recipe table | Medium |
| 7 | Amendment history row 2.0 | Date is still the literal `{{YYYY-MM-DD}}`; the summary still says "`shared/targets` kept, declared by `coding`" | Medium |
| 8 | US-27 · `planning` part 9 · the cross-pack anatomy table | The absorption-gate ABORT's vehicle is now `planning`'s **own** targets contract (Q-49). Part 9 stays `present`. Record Q-49's accepted duplication as a **named v1.1 reconciliation task**, not a discovery | Medium |
| 9 | §Open Questions preamble | "The next free ID is **Q-50**" — Q-50…Q-53 are allocated and resolved. Next free is **Q-54** | Low |
| **10** | `writing`'s `pack.json` · each pack's folder-README section | **`writing` must declare `folderReadme: "index.md"`** in `pack.json`; `coding` and `planning` omit the key and take the `README.md` default. **New in the 2026-08-31 pass** — §3.5, F1 §6.1 change 15 | Medium — without it `validate` reports every `writing` folder as missing a README |
| **11** | each pack's recipe table | **Every folder a recipe creates must receive its folder README in the same `when` branch as whatever creates the folder**, because `validate` now checks the rule per parameter combination (§3.5). Confirm this holds for `coding`'s `backend-*` scaffolds and `writing`'s per-workstream stage folders. **New in the 2026-08-31 pass** | Medium — a conditional folder with an unconditional README passes; the reverse does not |

**Changes 12–16 — new in the 2026-08-31 Mode A re-review fold.** F5 has
**no numbered sections**, so these cite its named headings and line
anchors in F5's own style (`§Flows / packs/coding/ / 7b`).

| # | Where | Change | Severity |
|---|---|---|---|
| **12** | `coding` 7b recipe table **L1132** · `writing` 7b **L1486** · `planning` 7b **L1791** | **Delete all three `merge-json` settings steps.** No v1.0 pack writes `.claude/settings.json`. **They are not a capability being removed — they are placeholders that were never valid recipes:** not one names a `from`, not one names a single owned key, and no pack's payload inventory (L1078-1085, L1440-1442, L1751-1758) contains a settings source file, so each already fails F1's `E-RECIPE-SOURCE-MISSING` and `E-OWNEDKEY-FORBIDDEN`. F1 §F1.3's worked `packs/coding/recipe.json` — written later and canonical — has no settings step and **says so** at F1:1975-1980; F5's own precedence rule (L124-127) is *"where this spec and F1 could disagree, F1 wins"*; and `general/pack-inventory.md` L356 records the owned keys as **"Missing"**. **`merge-json` stays one of the seven** (US-34's list at L597-602 needs no change) — it becomes an unexercised primitive, which §3.8 argues for explicitly and N-6 flags to the re-reviewer | **Contract break — resolves the C-21 CRITICAL**  **SUPERSEDED 2026-08-31 (Q-54) in its last clause only.** The three deletions stand and are folded into F5 v2.1. **`merge-json` does not stay one of the seven:** it is dropped, US-34's list is six, and it becomes no primitive at all rather than an unexercised one. §3.8's argument for shipping it unexercised is overturned; N-6 is closed by deletion. |
| **13** | US-17 **L294** · US-18 **L356** · `coding` tree **L1139** · `writing` tree **L1495** · `planning` tree **L1801** | **Remove `.claude/settings.json` from every produced-tree listing and acceptance criterion.** US-18's criterion (*"contains no `hooks` key"*) presupposes the file and must be restated as **"the applied tree contains no `.claude/settings.json`; the pack owns no settings key at v1.0"** — which is the stronger assertion and is mechanically checkable | **Contract break** — the trees are acceptance criteria, so leaving them is a shipped test asserting the opposite of change 12 |
| **14** | §NFR **L823** · `coding` **L1151** | **Correct the counts.** `coding` phase 2 writes **23** files, not 24: **18** working files plus the five Q-50 folder READMEs. Both numbers appear twice and both are arithmetic over the tree at L1137-1149, in which `settings.json` is one of the 19 | Medium — but it is the kind of stale count that later reads as evidence |
| **15** | US-17 **L307-308** · §NFR *Payload fidelity* **L845-847** | **Delete "same modes" / "including modes".** Both state that `.harness/pack/` is byte-identical to the pack *"file-for-file including modes"*. **F1 says nothing about phase-1 modes, so F5 is currently the only document specifying them — and it specifies the wrong thing.** Replace with: **"byte-identical in content, file for file. Modes are not preserved: phase 1 writes every payload file `0644` and every directory `0755` (F1 US-30)."** Restate the fidelity test as content-only, which is what F1's own test at F1:1329-1333 already is | **Contract break — this is where C-12 lapsed.** Under F5's rule a `0755` source file lands `0755` under `.harness/`, which `E-EXEC-DEST-FORBIDDEN` forbids by name, with no root, no cap, no disclosure and no diagnostic. **Folding C-26 into F1 while F5 requires the opposite is precisely how the six lapses happened** |
| **16** | US-34 **L603-604** · `planning` 7b **L1779-1791** · summary matrix **L1008** · **L983** | Four corrections, three of them F5-internal and found while checking the above. **(a)** US-34's *"Every recipe step reads a source path under `.harness/pack/` and never from the bundled pack (Q-41)"* is **true as provenance and false as a description of execute-time I/O** under §3.6. Restate: *"Every recipe step's source is a path in the payload; the CLI resolves it at plan time and phase 2 performs no read during execution (F1 §F1.6, ADR §3.6)."* **(b)** `planning`'s 7b table has **no `rewrite-path` step**, yet §Flows / *The targets contract* L2146-2153 requires `Run.md` *"path-rewritten to `.harness/pack/targets/`"* in **both** copies — add the step or drop the requirement. **(c)** The summary matrix cell at **L1008** omits `merge-json` for `planning` while L1791 has it — moot after change 12, but the cell must be restated for all three packs anyway. **(d)** **L983** still says a recipe-schema code is *"which F1 must add"*; F5's own L748-758 says the gap is closed and F1 carries five recipe codes. Strike it | (a) High · (b) (c) (d) Medium |

**Two F5 changes that are consequences, not new decisions:** US-35's
criterion at L630-631 (*"for every file in the applied tree outside
`.harness/pack/`, either the recipe declares a step producing it, or it
is user content"*) becomes **satisfiable** for the first time once change
12 lands — today `.claude/settings.json` is in three applied trees with
no valid step producing it, so US-35 as written is failing. And F5's
`§Error States` CLI table (L719-746) should gain the
`E-SETTINGS-MODE-FORBIDDEN` row it lacks, since F1 now raises it at
`package.json` too and F5 cites F1's codes.

### 6.3 `LintelHarnessSpecification-1.0.md` — 7 changes, all folded

| # | Where | Change |
|---|---|---|
| 1 | §Technical Context *v1.0 command surface* — "**`init` only**" | **Wrong.** The v1.0 surface is **four** commands: `init` (F2), and `validate`, `verify`, `pack info` (F1, per Q-53). F1's own `E-CLI-UNKNOWN-COMMAND` message already lists "init, validate, verify, pack". Q-53's decision text says explicitly that the master spec's command list must include `verify` |
| 2 | §Technical Context *Sharing between packs* · §Out of Scope "The `shared/` reference *mechanism* is specified, but it has no v1.0 consumer" · §Feature 1 stub "the explicit `shared/` references Q-4 requires" · §Shared platform changes row | **Q-48 removes the mechanism.** It is not "specified with no consumer"; it does not ship. Restate all four |
| 3 | §Open Questions · §Resolved Decisions · §Counters | **"Q-1…Q-46 are all resolved… next free Q-47" is stale.** Q-47…Q-53 are all resolved in the brief §12. Add index rows for each; next free is **Q-54** |
| 4 | §Counters | "US-1…US-29 allocated, next free **US-30**" is stale. F1 v2.0 uses US-30…US-33 and F5 v2.0 allocates US-34…US-38. Next free is **US-39** — confirm against F5's block at the fold |
| 5 | §Introduction, forward-investment bullet | The minimal manifest records **six** things, not five — add the payload digest (Q-52) |
| 6 | §Technical Context | **Add a row for Q-50** (every created folder carries a README; **`.claude/` and `.harness/` excluded, both tool-owned**; no `mkdir` primitive and no `.gitkeep`; `validate` checks it at US-16 step 12). It is a cross-cutting content decision with a format consequence and it appears nowhere in the master spec |
| 7 | §Spec-set readiness | Update: the ADR is rewritten as of this document, and its verdict as amended on 2026-08-31 is **`REVISE SPEC`, narrowed to the unfolded §3.5 `validate` check alone** (§10) — the three folds it originally blocked on have all landed. **The remaining blockers stand**: `general/system-architecture.md`, `general/technology-choices.md`, the F2 and F6 specs, every epics-and-tasks document, and a fresh Mode A verdict |

**Change 8 — new in the 2026-08-31 Mode A re-review fold.**

| # | Where | Change |
|---|---|---|
| **8** | §NFR *Determinism* row (**L204**) · §Introduction (**L51-54**) · **L251** | **Narrow the determinism claim so that it is true.** All three state the recipe is *"a pure function of (payload, parameter answers) … same pack version + same answers ⇒ byte-identical trees"*, unqualified. At a `merge-json` destination the destination's **prior content is a fourth input**, so the claim is false there (ADR §7.9, C-22). Restate: *"Phase 2 is a pure function of (payload, parameter answers, scaffold selection) at every applied path except a `merge-json` destination; there, the pack's **owned keys and their values** are a pure function of those inputs and the rest of the file is whatever the project already had. Two applies **into empty directories** produce byte-identical trees."* The empty-directory qualifier is not a weakening — F1's **G-F1-4 already carries it** and is correct as written; it is the unqualified restatements that drifted |

### 6.4 Questions this ADR closes, and questions it does not

**Closed here** (F1-scoped, no escalation needed):

| Q / issue | Closed as |
|---|---|
| Manifest key count and the digest's location | **Six keys; `payloadDigest` top-level**, between `pack` and `parameters`. §3.2 |
| Whether an eighth `mkdir` primitive ships | **No.** Q-50 removes the need; §3.3 argues why `mkdir` is worse than it looks (its output is invisible to `verify` and uncommittable by git) |
| Whether the payload digest is over raw or normalized bytes | **Normalized** (BOM + EOL, Q-26). Raw would make every Windows clone report a tampered payload. §4 |
| Where `.harness/README.md` comes from | **Nowhere — it does not exist.** Escalated on 2026-08-31 and answered the same day: `.harness/` is excluded from Q-50 as tool-owned, exactly as `.claude/` is. `applied-readmes/harness.md` is deleted. **C-5 is absolute, with no carve-out.** §3.4 option C |
| Whether `validate` enforces Q-50 mechanically | **Yes** — `W-FOLDER-README-MISSING`, US-16 order **step 12**, per parameter combination, warning severity because the check over-approximates without a project, fatal under `--strict` which CI runs. `pack.json` gains `folderReadme`. §3.5 |
| What type the CLI's own `.harness/` writes carry | **`HarnessPath`**, with `WritablePath = AppliedPath \| HarnessPath` on the journal, the writer and rollback. §1 contract |
| Whether F1's recipe codes are sufficient for F5's flagged gap | **Yes** — five recipe codes plus two path codes cover unknown primitive, bad shape, missing source, missing recipe, a `from` escaping the pack, and a step writing to a reserved destination. All fail-closed, all exit 2 |
| Q-20 (a `when` beyond single equality) | **Still no.** One equality test, one key. Restated for the recipe |
| Q-24 (`pack.json` or a separate file) | **Two files** — `pack.json` identity, `recipe.json` procedure. Amends the original ADR's "one file", which was right that there is no *third* concept |

**Escalated to Thomas — and answered.** One question, and it was small:

| Q | The question | Answer, 2026-08-31 |
|---|---|---|
| **`.harness/README.md`** | Keep it, or treat `.harness/` as tool-owned like `.claude/` and drop it? | **Drop it.** Recorded in `project-brief.md` §12 as an amendment to Q-50: `.harness/` is excluded on the same tool-owned ground as `.claude/`, and is arguably more tool-owned, since users edit agent files but must never edit the payload. `packs/coding/applied-readmes/harness.md` is deleted; `coding`'s folder-README count is five. **C-5 keeps no carve-out**, which is what §7.1's own argument for extending it asked for. The predicted cost — one deleted file, one deleted CLI write — was exactly the cost. §3.4 |

**No question is open at the time of writing.** §9's remaining follow-ups
are obligations and unwritten documents, not decisions.

### 6.5 Documents outside this ADR's change-list that now contradict it

**This ADR edits no other file**, and three documents outside F1, F5 and
the master spec carry statements this pass falsifies. Flagged here for
whoever next touches them, in the manner of §9 item 8. **None changes a
decision**; all three are restatements that drifted from a source.

| Document | Where | What is now wrong |
|---|---|---|
| `specifications/general/pack-application.md` | The primitive table's `merge-json` row (**L85**) | Its worked example is *"Merge declared owned keys into existing JSON — `.claude/settings.json`"*. After §6.2 change 12 this is the **last surviving assertion in the repo that a v1.0 pack writes settings**, and it sits in the document F5 calls authoritative for the two-phase model. It should name a hypothetical destination, or say the primitive has no v1.0 consumer |
| `specifications/general/pack-application.md` | *Determinism is a requirement, not a hope* (**~L96-107**) | Same unqualified purity claim as master-spec change 8. Same narrowing |
| `specifications/general/pack-inventory.md` | `coding` applied-structure fence (**L126**) | Lists `settings.json    merge-json, declared owned keys only` — which contradicts **its own** row at **L356** (*"owned keys — **Missing**"*). Internally inconsistent today, and change 12 settles it in L356's favour |
| `specifications/project-brief.md` §12 | **Q-40** | *"The recipe is a pure function of (payload, parameters)"* is the **source** all the restatements above inherit, and it is the one that is falsified at a `merge-json` destination. It is the only item on this list that is a **decision record** rather than a restatement, so it needs an amendment note in Q-40's own style rather than an edit — the same treatment Q-50 got on 2026-08-31 |
| `specifications/project-brief.md` §12 | **Q-41** | Its text — *"phase 2 reads from the phase-1 copy in the project"* — is **confirmed, not contradicted**, by §3.6, but it is the sentence whose ambiguity produced F-5. An amendment note stating that it fixes the **authoritative tree**, not the **moment of the read**, would close the reading that this pass had to rule out |

### 6.6 What the 2026-09-01 amendment changes, and what it leaves

**This amendment edits no other file either.** It brings this ADR up to
F1 **v3.0**; the folds it reflects were already made in F1 and, on
2026-09-01, in `specifications/general/`.

**§6.5 is stale as a to-do list and is kept as a record.** Every item on
it has since been fixed: `pack-application.md`'s `merge-json` row is gone
and the purity claim is stated as holding without exception,
`pack-inventory.md` resolved its own internal contradiction in L486-503's
favour, and the brief's Q-40 and Q-41 carry their amendment notes. **Do
not work §6.5 — read it as evidence that the flagging worked.**

**What this pass leaves for whoever picks up F1's epics:**

| Item | Why it is not done here |
|---|---|
| **F1's epics have no tasks for v3.0** | E-10's heading moved to six states and the code counts were corrected, but no task covers `fillExpected`, `filled`/`unfilled`, the nine new codes, journal v3, `src/claude/frontmatter.ts` or `src/semver/compare.ts`. Tasks name files against **this** file plan, so they had to wait for it — which is now unblocked |
| **F3's flags, failure contract and lock behaviour** | F1 ships `update.ts`'s module boundary and its reserved flag; **F3 owns what it does**. Naming the module is not specifying the command, and this ADR deliberately does not |
| **A Mode A pass over the amended contract** | The security architecture in §7 is **not re-examined here** and the verdict does not move. Two changes touch security-adjacent surface — `collisionKey`'s ASCII narrowing (Q-81) and `fillExpected` as a prohibition `update` must honour (Q-79) — and both are argued in F1 v3.0 rather than re-argued here. Neither is a new attack surface; the first is a **stated reduction in a control's reach** and the second is a **new constraint on a writer**. A reviewer should still look at them |
| **`src/security/disclosure.ts`'s rename** | Named here, not performed — there is no source tree yet |

---

## 7. Security architecture

Carried forward from the 2026-08-30 remediation pass and rescoped where
the model moved. **Both CRITICALs were apply-time and survive intact.**
Where a subsection is unchanged it says so rather than being restated at
length; where the model moved under it, the change is argued.

### 7.0 The threat model — unchanged, and it still decides the priorities

Lintel Harness is a local developer CLI with no network access, no
registry and no third-party packs (Q-2), packs bundled with the published
binary. There is no remote attacker in this model. Three actors are:

1. **A pack author** — plausibly a colleague, plausibly the user six
   months ago — writing a pack a reviewer skims. Packs are authored in
   one repo and applied in another; the review that would catch
   `"ownedKeys": ["hooks"]` is a JSON diff review, and JSON diff reviews
   are exactly where a permission grant hides.
2. **The format itself**, as a thing other people will copy. Q-2 forbids
   third-party packs at v1.0; it does not forbid someone reading this
   spec in 2027 and building a registry on it. What `validate` calls a
   valid pack is the real security boundary, and it outlives "no
   registry".
3. **The filesystem the CLI writes into**, not fully known at plan time —
   symlinked directories, case-insensitive volumes, a `specifications/`
   that is a symlink into another checkout.

**The authoring-time checks are the high-value half.** They run in CI,
cost nothing at apply, and stop the bad pack from existing rather than
stopping it from working. Runtime checks are defence-in-depth and are
priced as such.

**What the two-phase model changed in this picture, and what it did
not.** Phase 1 adds a large new *write* surface (an entire tree copied
into the project) but adds **no new decision** surface: it reads no
declaration, evaluates no condition, and transforms nothing, so the only
controls it needs are path confinement, the symlink ban, traversal bounds
and size bounds — all of which already existed. Phase 2 replaces
`mappings` with a recipe, which is a *narrower* surface than what it
replaced: seven closed operations instead of an open set of file modes
plus a region grammar plus a contribution mechanism. The removal of the
region parser (Q-45) deletes an entire lexer's worth of attack surface.
Net, the apply-time surface is smaller than the one the Mode A review
assessed.

### 7.1 Confinement is by resolution, not by string — **stage 2 re-keyed in this pass**

Four ordered stages, all in `src/security/confine.ts`, the **only**
constructor of `AppliedPath`.

**Stage 1 — the anchored `to` grammar** (C-6, declaration time). Unchanged
from the original ADR and now fully carried in F1 v2.0 US-3: the
segment grammar; rejection of leading separators, any `\`, `^[A-Za-z]:`
(both `C:\x` and drive-relative `C:x`), `//`/`\\` prefixes, `.`/`..`/empty
segments, segments ending in `.` or whitespace, and reserved Windows
basenames; mandatory NFC with `W-PATH-NON-NFC` on discovered basenames;
`collisionKey` = NFC-normalized then case-folded, with
`E-MAP-CASE-COLLISION` and `E-MAP-NORM-COLLISION` as separate codes
because the remedy is different prose. **Extended by the model:** every
payload-relative `from`, and every path phase 1 copies, satisfies the same
grammar minus the trailing-slash rule — `E-PAYLOAD-PATH-INVALID`. That is
what stops a pack shipping a file whose name is legal on the authoring
machine and catastrophic on the applying one.

**Stage 2 — the reserved-destination denylist, on the resolved path**
(C-5). Unchanged in mechanism, **extended in scope, and re-keyed in this
pass**: no path in **any step's write set** (§7.2.0), and no
`executableRoots` entry, may resolve under `.git/`, `.hg/`, `.svn/` or
`.harness/`, or inside the CLI's own resolved install directory.
`E-MAP-RESERVED-DEST`, exit 2, checked **after** resolution.

> **Why "write set" and not "`to`" — this is the C-5 half of the same
> defect §7.2.0 fixes.** The rule as F1 v2.2 states it is *"No step's
> `to`, no scaffold step's `to` and no `executableRoots` entry…"*, and
> **two of the seven primitives have no `to`.** A rule quantified over a
> field two arms of the union do not have is a rule with two silent
> exemptions. It is re-keyed here, once, for every control in §7.1 and
> §7.2 at the same time, rather than patched per control — because
> patching per control is how the first version acquired the gap.

> **The `.harness/` extension is the security consequence of Q-39 and it
> must be stated as an absolute.** A recipe step may **never** write under
> `.harness/` — which includes writing into the payload it is reading
> from. Under the old model `.harness/` held only bookkeeping; under the
> two-phase model it holds **the input to phase 2**. A step that could
> write there could rewrite its own source mid-run, which destroys
> determinism, destroys `verify`'s recomputation identity, and gives a
> pack a way to make the applied tree depend on step order in a way the
> plan did not show. This is a stronger reason than the original
> denylist's, and it is why §3.4 opens no hole in it — not for a README,
> not for anything. **The rule has no exception**: `.harness/` is
> excluded from Q-50's folder-README requirement as tool-owned (Q-50 as
> amended 2026-08-31), so the one case that would have needed an
> exception no longer exists.

**The CLI's own writes are a different category, and they are not an
exception to the denylist.** The phase-1 payload,
`.harness/manifest.json`, `.harness/journal.json`, `.harness/journal.d/`
and `.harness/lock` — **five things, and the list is complete** — are not
recipe steps and do not consult the denylist. They carry `HarnessPath`,
are derived from paths already proven grammar-clean, and are confined by
construction. Without this stated, an implementer deadlocks the denylist
against the payload copier. Note the distinction: a *category* the
denylist does not govern is not the same as a *carve-out* in it, and
C-5 has none.

**Stage 3 — resolution confinement** (C-4, amended as on 2026-08-30 and
the amendment stands). The project root is resolved **once per run** with
`realpath()` and everything is judged against the resolved root —
without which the CLI refuses to run in `/tmp` on macOS. Below it: every
ancestor `lstat`ed top-down, `E-DEST-SYMLINK` on any symlink, junction or
reparse point; directories created one level at a time, each checked
before the next; the final destination `lstat`ed; the resolved parent
joined with the basename proven a **strict descendant** of the resolved
root. Skipped at `validate`, which has no project.

**Stage 4 — the write** (C-14). `PlannedFile.path` is `WritablePath`, so
a path that never went through a confining constructor cannot reach the
writer without a compile error. `executeApply` re-runs stage 3
immediately before each write, creates the temp file with `open(tmp,
'wx', mode)`, claims a new destination with `link` then `unlink` (which
fails `EEXIST` where `rename` would not), and re-hashes a destination the
plan expects to exist. Any failure is `E-TARGET-RACE`, exit 2, journal
intact.

### 7.2 The settings and consent model — **SUPERSEDED BY Q-54, except §7.2.0's quantifier**

> **Status: superseded 2026-08-31.** There is **no settings model and no
> consent model at v1.0**. `merge-json` is dropped (Q-54), and with it
> the destination policy, `DestinationPolicy.allowedOps`, `ownedKeys`,
> the ownable-key allowlist, the leaf-only rule, `policyFor`, the
> consent gate, `ConsentInputs`, `SecurityDisclosure.settings` and the
> five error codes that served them. `.claude/settings.json`,
> `.claude/settings.local.json` and any `package.json` are **reserved
> destinations on the stage-2 denylist**, forbidden to every step by
> every route, `E-MAP-RESERVED-DEST` — one rule replacing the whole of
> the policy apparatus described below. **F1 v2.3 US-3 is the current
> statement.** Everything from here to the end of §7.2 is **history**.
>
> **Two things in it survive and are current, and they are why it is
> marked rather than cut.** (1) **§7.2.0's quantifier** — every
> destination control is evaluated over a step's **write set**, not over
> its `to` — is unchanged and load-bearing: `rewrite-path` and
> `substitute` still have no `to`, and the denylist that replaced the
> policy is quantified over write sets for exactly the reason given
> below. (2) The **worked two-step bypass** below is still the clearest
> statement of *why*, even though its first step no longer parses: read
> it as the argument for the quantifier, not as a live attack.


**7.2.0 Every settings control is evaluated over a step's WRITE SET, not
over its `to`** (C-19). **This is the repair for the re-opened S-1 and it
is the most important paragraph in §7.**

*What went wrong.* The seven-primitive set was introduced by the
2026-08-31 rewrite, **after** the Mode A review that produced C-1…C-18,
and every settings control inherited a phrasing written for a model in
which every step had a `to`. Two of the seven — `rewrite-path` and
`substitute` — address files by `in` globs over **already-written applied
paths** and have no `to` at all. So US-3 stage 2's denylist, US-6's op
lockdown, `E-SETTINGS-MODE-FORBIDDEN`'s message,
`DestinationPolicy.allowedOps` and the disclosure builder were all keyed
on a field two arms of the union do not have. The consequence, which
passes all fourteen of US-16's checks as F1 v2.2 stands:

```json
{"op":"merge-json","to":".claude/settings.json","ownedKeys":["model"]}
{"op":"rewrite-path","in":[".claude/settings.json"],
 "find":"\"model\"",
 "replace":"\"permissions\":{\"allow\":[\"Bash(*)\"]},\"model\""}
```

The first step is legitimate and discloses `model`, an ordinary key. The
second writes a permission grant into the same file **without declaring
one key**, and thereby bypasses `ownedKeys`, the leaf-only rule,
`E-OWNEDKEY-FORBIDDEN`, the hooks exclusion, `E-SUBST-IN-SECURITY-KEY`,
the re-parse/deep-equal check, the C-2 disclosure and the consent gate —
every control C-1 and C-2 bought. The identical route reaches
`package.json`'s `scripts.postinstall`, which is the hook capability
wearing an npm hat and is forbidden by name in F1's own policy table.
`generate` reaches settings by a third route: it *has* a `to`, and US-6's
prose enumerates only *"a `copy`, `rename` or `strip-suffix` step"*.

*The rule.* The planner computes, for every step, its **write set** — the
complete set of applied paths whose **bytes** that step creates or
changes (`stepWriteSet()` in the contract; `copy`/`strip-suffix` expand
their recursion, `rename`/`generate`/`merge-json` yield their `to`,
`rewrite-path`/`substitute` yield every path in the plan's written-set
their `in` globs match). Then:

> **For every step `s` and every applied path `p` in `writeSet(s)`, if
> `policyFor(p).allowedOps` is a list and `s.op` is not in it, that is
> `E-SETTINGS-MODE-FORBIDDEN`, exit 2, at validate time** — naming the
> step index, the op, the applied path and the permitted ops. A policy
> naming `allowedOps` admits **only those ops, by any route**.

So `rewrite-path`, `substitute` and `generate` reaching
`.claude/settings.json` or `.claude/settings.local.json` are each a hard
error before anything runs, and the ownable-key allowlist is the only
door into a settings file again.

*Three things this deliberately does not do.*

1. **It does not make `E-MAP-COLLISION` fire.** §F1.2's placing/editing
   distinction is a statement about **ordering** — an editing step must
   run after its target is placed — not about **authority**. A
   `substitute` following a `copy` into the same path is legitimate and
   must stay legitimate; the defect was never that two steps touch one
   file, it was that only one of them was policed. Anyone "fixing" this
   by widening the collision check has fixed the wrong thing and broken
   every pack.
2. **It does not depend on file content.** For `rewrite-path` and
   `substitute` the write set is what `in` **matches**, not what `find`
   **hits**. A path whose content happens to lack the literal is still in
   the set. A policy decision that turned on bytes would be a policy
   decision made after the plan was approved and disclosed.
3. **It does not need a project.** `in` resolves only against the plan's
   recorded written-set (C-27, §7.2.6), never the filesystem, so the
   write set is a pure function of the pack and §7.7's property 2 — the
   whole check suite runs in CI with no target directory — survives
   intact. That property is what makes the authoring-time half of §7.0
   cheap, and it was worth preserving.

**7.2.1 `merge-json` has a destination policy, not a pack policy**
(C-1). The defect was never that `merge-json` exists; it is that
`ownedKeys` was unconstrained, so nothing distinguished
`permissions.allow` from `theme`. The constraint is a table keyed by
**applied path**, so every pack writing that destination gets the same
rule and S5 survives. The v1.0 table (`.claude/settings*.json`,
`package.json`, any other JSON target), the forbidden lists and their
reasons, and the general rule — *a destination is sensitive when some
common toolchain executes what it contains, or governs what may be
executed* — are carried in F1 US-6 and are not restated here. **Three
things about that table change in this pass:**

- **It is matched by `collisionKey`, on every platform** (C-20). F1
  states the policy is *"a table keyed by applied path"* and **nowhere
  states how a path is matched to a row**; this ADR's contract said
  `matched exactly`. Exactly is wrong. A `merge-json` with
  `"to": ".claude/Settings.json"` and `"ownedKeys": ["hooks"]` matches no
  row under string equality, falls through to *any other JSON target*
  (`ownable: null`, no `allowedOps`) and **passes validate** — while on
  macOS and Windows naming the very file the settings row governs. F1
  already defines exactly the right function for this, `collisionKey` =
  NFC-normalized then case-folded, and applies it only to step-vs-step
  collision. `policyFor` now resolves by `collisionKey`, **unconditionally
  and on every platform** — not "on case-insensitive volumes", because
  `validate --all --strict` runs in **CI, which is Linux**, and the
  developer is not. A platform-conditional policy means the pack CI
  pronounced valid is not the pack that runs.
- **The forbidden list is a property of the table, not of a row**
  (C-16, and this one is mine rather than a condition's). Each row
  carried its own `forbidden` list, so the fall-through row forbade
  **nothing** — `ownable: null`, `forbidden: —`. `scripts.postinstall` in
  any JSON file no row happens to name was therefore ownable, and C-16's
  enumerated position *"an `ownedKeys` root against the destination
  policy"* had no fail-closed behaviour there at all: every value was
  recognised by construction. `FORBIDDEN_AT_EVERY_DESTINATION` —
  `hooks`, `scripts`, `permissions`, `env` — is now a floor every row
  inherits and **no row may shrink**, only extend.
- **`allowedOps` is explicitly `readonly RecipeOp[] | null`.** The old
  encoding was `readonly RecipeOp[]` with *"`[]` ⇒ merge-json ONLY"* —
  which made the natural spelling of "permit nothing" mean "permit the
  one op that carries all of S-1's surface". That is a trap laid for the
  implementer, and a fail-open one.

**Leaf-only for security-relevant roots.** Unchanged:
`"permissions.allow"` is ownable, `"permissions"` is not; `"env.EDITOR"`
is ownable, `"env"` is not. `E-OWNEDKEY-FORBIDDEN`, exit 2, **at validate
time** — such a pack never ships and never reaches a consent prompt.

**Op lockdown, restated over write sets.** `.claude/settings.json` and
`.claude/settings.local.json` carry `allowedOps: ['merge-json']` and
therefore accept **only** a `merge-json` step, **by any route** — as a
`to`, as an `in`-glob match, or as the output of a directory recursion.
Any other primitive whose write set contains one of them is
`E-SETTINGS-MODE-FORBIDDEN`, exit 2. `package.json` carries the same
list, for the same reason, and the message names the destination and the
permitted ops generically rather than saying "settings". *Naming
residual, recorded rather than churned:* the code is now raised at
`package.json` too, so `E-SETTINGS-MODE-FORBIDDEN` is a slightly narrow
name for what it does. One code with a general message is better than two
codes with identical remedies (§7.6's severity rule, applied to codes),
and renaming a catalogue entry costs more than the imprecision does.

**7.2.2 Consent is a gate on the plan, before the first byte** (C-2).
Unchanged, including the six-row gate table, the rule that the disclosure
enumerates **every value verbatim, one per line, never summarised and
never counted**, and the property that **no value of `ApplyInputs` means
"consent granted by default"** — a caller cannot reach the permissive
branch by forgetting a field. The gate runs **before the lock is taken**,
so a declined apply does not contend for one. One disclosure builder,
three surfaces (`init`'s summary, `pack info`, `validate --json`).

**7.2.3 `--accept-hooks` exists and always fails.** Unchanged, and
deliberate: a flag that does not exist produces "unknown flag" and invites
a workaround; a flag that exists and fails with `E-HOOKS-NOT-SUPPORTED`
documents the boundary and reserves the name.

**7.2.4 Removal-honouring merge — DEFERRED** (C-3). Its subject is
`update`, and there is no second apply at v1.0 to resurrect anything.
Shipping the bookkeeping now would be manifest fields with no reader.
**Named v1.1 obligation** — see §8.

**7.2.5 THE HOOK DECISION — unchanged and it is the strongest thing in
this section.** No pack may register an agent hook at v1.0. `hooks` and
every path under it are outside the ownable set at **every** destination;
a pack declaring `"ownedKeys": ["hooks"]` fails `E-OWNEDKEY-FORBIDDEN` at
validate time. The four reasons stand, and Q-42 **strengthens** the
second: reason 2 was "`update` makes the consent unbounded, and that is
not fixable in F1" — with `update` deferred, there is now no v1.0
mechanism that could even attempt it, so the decision costs nothing it
did not already cost. A pack **may** ship files under `.claude/hooks/`:
ordinary files, `0644` (the executable bit is forbidden under `.claude/`),
registered by nothing, named by `W-HOOK-SCRIPT-INERT` and listed in the
disclosure so a reader is not misled. That is what `planning`'s
`kill-criteria-guard.sh` is.

**7.2.6 `in` globs resolve against the plan, never the filesystem**
(C-27). The re-review reads this as an open hole — *"`in: ['.harness/pack/**']`
could rewrite phase 2's own input mid-run, the outcome C-5 was extended
to prevent, reached without a `to`."* **Partly, and it is worth being
precise about which part, because the conclusion is right and the premise
is not.**

*Where the finding overstates.* F1 v2.2 **already** pins `rewrite-path`,
in three places: US-4 — *"`in` globs over applied paths that earlier
steps have already written"*; §F1.2's signature table — Reads: *"applied
text files already written"*; and §F1.2's per-primitive validation table
— *"`in` matches at least one path already written by an earlier step"*.
An `in` glob naming `.harness/pack/**` therefore matches nothing today,
because no recipe step can have written there (C-5), and the step fails
`E-RECIPE-STEP-INVALID`. So F-6 is **not** reachable for `rewrite-path`,
and I record that rather than accepting a finding I do not think holds.

*Where it is right, and it is right about three things.*

1. **`substitute` is genuinely weaker.** US-4's `substitute` clause says
   only *"in every applied file matched by `in`"* and never repeats
   "already written". The constraint is carried for `substitute` by the
   §F1.2 table **alone**. One table cell is not where an invariant should
   live, and the two primitives must read identically.
2. **The rule is stated three times and normatively nowhere.** It is an
   acceptance criterion and two table cells, not a rule with a name. C-27
   asks for it as a rule; it should be one.
3. **The second clause is missing entirely, and it matters.** C-27 also
   requires that **every `in`-matched path passes the stage-2 denylist**.
   Today nothing re-checks a matched path, and the argument that it
   cannot need checking is a chain — *matched paths come from the
   written-set; written-set members all passed stage 2 when their placing
   step declared them* — which is sound but implicit, and an implicit
   chain is exactly what §7.2.0 just finished repairing. It is stated
   as a check.

*Stated as a rule.* **The resolution domain of an `in` glob is the plan's
ordered written-set and nothing else** — the applied paths every
**earlier** step writes. Never the filesystem, never the payload, never
the project. Every path an `in` glob matches is re-checked against the
stage-2 denylist and is `E-MAP-RESERVED-DEST` if it fails.

*And the type system says the same thing independently.* The written-set
is a set of `AppliedPath`. The phase-1 payload carries `HarnessPath`,
which is a different brand and is not a member. So *"an `in` glob names a
payload path"* is not a state a correct implementation can construct —
the same compile-error property C-14 buys for writes, doing a second job
for reads. Two independent mechanisms is the right number for the
invariant C-5 calls absolute.

### 7.3 Substitution is untrusted input — carried, one half removed

An answer is typed by a user and recorded verbatim in a manifest this
spec **requires to be committed**. It is untrusted at every use.

- **Constrained at declaration** (C-7). `type: 'string'` requires an
  anchored `pattern` (≤ 200 chars, no backreference, no lookaround) and
  takes `maxLength` (default 256, ceiling 4096), checked **before** the
  regex runs so pattern evaluation is bounded and ReDoS is not
  reachable. Unchanged.
- **Validated twice.** At collection, and **again on every read-back from
  the manifest** — the manifest carries no self-integrity check by this
  spec's own design, and `verify` re-renders from recorded answers.
  Unchanged, and now *more* load-bearing than before, because `verify`
  replays answers on every run.
- **Context-aware escaping** (C-7). Substitution takes the destination's
  kind: JSON-string-escaped into a `merge-json` target, verbatim
  elsewhere; the merged output is **re-parsed and deep-equal-checked**
  after serialization, failure being `E-MERGE-JSON-INVALID` with nothing
  written. Unchanged.
- **No substitution into a security-relevant key at all** (C-8).
  `E-SUBST-IN-SECURITY-KEY`, exit 2, at validate time, **no override**.
  A permission string is a decision the pack author makes at authoring
  time; it is not a decision a user makes by typing a project name.
  Unchanged in rule, and **repaired in coverage**: the check is evaluated
  over a `merge-json` step's declared `ownedKeys`, so a `substitute` step
  whose `in` glob named a settings file inserted a substituted value
  under a security-relevant key **with no key ever declared** — C-8
  lapsed by the same route as C-1. §7.2.0's `allowedOps` rule closes it
  at the source: `substitute` can no longer reach a settings destination
  at all, so there is no value under a security-relevant key for the
  check to have missed.
- **A substituted answer in agent-instruction content is accepted, and
  disclosed** (C-28). The other half of C-8's reasoning, which was never
  applied anywhere but settings. `CLAUDE.md`, `AGENTS.md` and everything
  under `.claude/` are read as instructions by every later agent run in
  every clone, so the person who types the answer and the person whose
  agent reads it need not be the same person. Accepted — it is not an
  escalation (a model still acts underneath the permission engine a pack
  cannot touch), forbidding it deletes the feature, and C-7's required
  anchored `pattern` plus C-9's newline ban kill the injection shapes
  that need a line break. **Disclosed, not gated:**
  `SecurityDisclosure.agentInstructionSubstitutions` enumerates every
  such value verbatim on C-2's terms, and `requiresConsent` does not read
  it. Full argument and the rejected alternatives: **§3.7**.
- **C-9 survives as half of itself.** The **newline ban** stands:
  `\n`, `\r`, `U+2028` and `U+2029` are forbidden in a substituted value,
  `E-SUBST-NEWLINE`, exit 2. It is the *sufficient* condition and the one
  that holds when a pack author's `pattern` is weak. The **marker-lex
  half is removed with the region parser** (Q-45): `E-SUBST-MARKER-
  INJECTION` and `E-REGION-TAMPERED` have no subject, because the
  anchors of US-32 are inert text that nothing reads, so a forged one has
  nothing to hijack. **Named v1.1 obligation:** restore the lex check
  before `update` starts reading anchors — the day anchors become
  load-bearing is the day a forged anchor becomes an ownership hijack.

### 7.4 The executable bit — carried in full, one deletion, **and phase 1's mode now specified (C-26)**

`executableRoots` in `pack.json`, `"executable": true` permitted only
under a declared root (`E-EXEC-ROOT-UNDECLARED`), never under `.claude/`,
`.git/`, `.hg/`, `.svn/` or `.harness/` (`E-EXEC-DEST-FORBIDDEN`, checked
at declaration **and again per applied path**), a cap of 32 per apply
(`E-EXEC-TOO-MANY`), and **every 0755 path enumerated verbatim** in the
init summary and in `pack info`. Enumeration does not gate: disclosure is
what C-12 asks for. Unchanged **for phase 2**.

**Phase 1 writes every payload file `0644`, and preserves no source
mode** (C-26). This is where C-12 lapsed, and the lapse is a pure
omission: every clause above is written for a *recipe step* — a declared
`to`, an `executable` field, a declared root, a cap, a disclosure line —
and **phase 1 has none of those.** F1 specifies phase 1's content
fidelity exhaustively ("hash the raw bytes of every file on both sides")
and says **nothing whatever about mode**, while F5 requires
`.harness/pack/` to be byte-identical to the pack *"file-for-file
including modes"*. Under F5's reading a pack shipping a `0755` script
lands `0755` under `.harness/` — which `E-EXEC-DEST-FORBIDDEN` forbids by
name — with **no root declared, no cap consumed, no disclosure entry and
no diagnostic**, because none of those mechanisms is reachable from a
phase that reads no declaration. And `payloadDigest` is content-only, so
`verify` is blind to it.

`0644` unconditionally, directories `0755`, is the only mode consistent
with all three constraints at once, and it is consistent with §7.0's
strongest property: **phase 1 adds no decision surface.** A mode-
preserving copy would make phase 1 carry a permission decision derived
from the authoring machine's umask, which is precisely the class of
input the rest of this architecture refuses.

**It costs nothing, and this is no longer hypothetical.** A pack shipping
an executable script has that script copied out by a recipe step into a
declared `executableRoot` with `"executable": true`, and the mode is set
**at the destination**. The payload copy's mode is never consulted by
anything.

> **Amended 2026-08-31 — the apparatus above has a consumer, and the
> "no v1.0 pack ships an executable file" reading is superseded.**
> `coding` declares
> `"executableRoots": ["infrastructure/backend-deploy/"]`, and its
> backend scaffold steps set `"executable": true` on `deploy.sh`,
> `deploy.ps1`, `setup-neon.sh` and `setup-neon.ps1`, which land
> **`0755`** and appear in the pre-write disclosure. Wherever this ADR
> or §8's C-12 row says or implies that `executableRoots` is absent or
> empty for every bundled pack, read it as **history**: F5 §NFR
> *Content integrity* and F1 US-3 carry the current statement.
>
> **Why this matters here rather than only in F5.** Those scripts are
> meant to be run, so `0644` would force a `chmod` on every applied
> project — and every clause of C-12 is now exercised by something that
> ships: a declared root, a cap consumed, `E-EXEC-DEST-FORBIDDEN`
> checked per applied path, a disclosure line a user actually sees. That
> is the correction §3.8's rejected argument most needed. **Specified
> security machinery with no consumer is a liability, not an option** —
> which is the whole lesson of Q-54, applied here in the opposite
> direction: `merge-json` had no consumer and was deleted; the
> executable bit has one and is kept. F5's "including
modes" is therefore not a requirement being sacrificed — it is a
requirement nothing needs, contradicting one that matters.

**Deleted:** `FileDrift.modeChanged`. Drift is F3 (Q-42). The *principle*
— an on-disk `chmod +x` is a change and a content-only comparison is
blind to it — survives in `verify`, which compares the executable bit
where the platform represents it and says so where it does not.

### 7.5 Rollback — carried in full, extended to phase 1

Journal **version 2** with `preExisting`, `preHash`, `preMode` and a
`backup` under `.harness/journal.d/` written **before** the overwrite and
present exactly when `preExisting && preHash !== sha256`. The five cases
are exhaustive and are carried in F1 v2.0 US-13 unchanged.

The invariant: **rollback deletes only paths this apply created, restores
only paths this apply overwrote, and acts on neither unless the on-disk
bytes are still exactly what this apply wrote.**

**Extended:** phase-1 writes are journalled and rolled back exactly as
phase-2 writes are. Phase 1 is not privileged; it is only simpler.
`JournalEntry.phase` records which, for diagnostics only — rollback
treats both identically. A journal declaring any `version` other than `2`
is `E-JOURNAL-UNREADABLE`, exit 2, the fail-closed rule applied to the
journal.

### 7.6 Fail-closed, integrity, bounded walks — **enumeration re-closed at seven (C-24), strict JSON added (C-25), read-back reclassed (C-29)**

**Fail-closed default** (C-16), unchanged in rule and **rewritten in
enumeration**. Unknown **keys** warn and are ignored. An unknown or
unrecognised **value in a behaviour-selecting position** is exit 2, zero
bytes. The positions are enumerated and the enumeration is **closed**:

`RecipeStep.op` · `ParameterDecl.type` · `AnatomyDecl.status` ·
`ScaffoldDecl.category` (against the pack's own declared set) · an
`ownedKeys` root against the destination policy · `Journal.version` ·
**`Recipe.formatVersion`**.

**Seven positions, and the seventh is where C-16 lapsed** (C-24).
`Recipe.formatVersion` is a field the rewrite added — `recipe.json`
carries it, `E-RECIPE-INVALID`'s own message text spells it — and
**nothing reads it.** `E-PACK-FORMAT-NEWER` names `pack.json` only, and
no rule anywhere checks a recipe's version against the CLI's. A declared
version nothing checks is worse than no version at all: it advertises a
compatibility gate that does not exist, so a v1.1 recipe using a
primitive or a field semantics this CLI does not have is read as though
it were a v1.0 recipe and **best-effort applied**. That is fail-open in
the position the whole of C-16 exists to make fail-closed. A recipe
`formatVersion` above the CLI's supported recipe format is
**`E-RECIPE-FORMAT-NEWER`, exit 2, zero bytes** — a separate code from
`E-PACK-FORMAT-NEWER` because the file, the remedy and the version axis
are all different.

C-16's second lapse is in §7.2.1: the destination table's fall-through
row made every `ownedKeys` root *recognised by construction*, so the
enumerated position had no fail-closed behaviour at an unnamed JSON
destination. `FORBIDDEN_AT_EVERY_DESTINATION` repairs it.

Seven positions, down from eleven — `Mapping.mode`, `FileEntry.origin`,
`FileEntry.mode`, `FileEntry.eol`, `TransformName`, a region directive
name and `SharedRef.integrity` all had their subjects deleted. Where a
position has its own code it is used; otherwise `E-UNKNOWN-VALUE`, naming
field, value and permitted values verbatim.

**Authored JSON is parsed by a reader that rejects duplicate keys**
(C-25). `pack.json`, `recipe.json` and `.harness/manifest.json` are
parsed by `parseStrictJson()`, and a duplicate key at **any depth** is
`E-JSON-DUPLICATE-KEY`, exit 2, naming the file, the key and both line
numbers.

> **This is not JSON hygiene; it is the threat model's own control.**
> §7.0 actor 1 is a pack author whose grant is caught because *"the
> review that would catch `"ownedKeys": ["hooks"]` is a JSON diff
> review."* `JSON.parse` keeps the **last** duplicate; a human reading a
> diff top to bottom takes the **first**. So an object carrying
> `"ownedKeys": ["model"]` and, forty lines later, `"ownedKeys":
> ["hooks"]` **reviews as one pack and executes as another** — and the
> reviewed-diff assumption the entire authoring-time half of §7.0 rests
> on is void. A parser that cannot disagree with the reviewer *is* the
> control. The cost is real and is named: Node has no duplicate-key
> option, `JSON.parse` collapses duplicates before any reviver sees them,
> so this is a hand-rolled token pass — `src/json/parse-strict.ts`, and
> the one place in this ADR where a stdlib call is replaced rather than
> wrapped.

**Not** applied to a `merge-json` destination or its payload-side `from`:
those are ordinary JSON documents, one of them the **user's own**, and
refusing to apply into a legitimately odd project file is the wrong
answer. A duplicate key there is `E-MERGE-JSON-INVALID`, exit 2, nothing
written — the same fail-closed outcome under the code whose remedy prose
fits.

**`op` is matched literally — no trimming, no case folding, no
normalization** (C-25, and N-3 invited exactly this test). `"copy "` with
a trailing space, `"Copy"`, and `"copy"` are each
`E-RECIPE-PRIMITIVE-UNKNOWN`. A discriminated union whose discriminant is
fuzzy-matched is not closed.

**Severity is a property of the code, not of the occasion.** Unchanged in
rule, and **F1's own catalogue violates it** (C-29). `E-PARAM-INVALID` is
exit 1, and its catalogue row says outright: *"Raised both when an answer
is collected and when one is read back from the manifest."* Those are two
occasions with two exit classes. **At collection**, a failing answer is a
user input error and exit 1 is right — the user typed it and can retype
it. **On read-back from a committed manifest the user typed nothing**;
the manifest carries no self-integrity check by this spec's own design,
`verify` replays answers on every run, and an answer that no longer
satisfies its declared `pattern` means the manifest was edited or the
pack's declaration moved under it. That is an **integrity fault**, which
is class 2 by F1's own definition of the classes. A distinct code:
**`E-MANIFEST-ANSWER-INVALID`, exit 2** — one code, one severity, one
occasion each, which is the rule this section states.

**Integrity, rescoped.** C-10's subject was `shared[].integrity` and
`shared/` leaves v1.0 (Q-48), so there is no integrity-downgrading flag
left to constrain. The **general rule survives**: a flag registered on a
read-only command is `E-FLAG-NOT-PERMITTED`, exit 1, on a write command —
refused rather than ignored, because a user who typed it believed it did
something. C-11's subject was `pack.integrity`, removed by Q-43; its
concern returns as Q-52 and is **half-answered at v1.0** — the payload is
now digested and `verify` checks it. The half that remains for v1.1 is
"the installed pack claiming this name and version is the same build the
project applied", which needs `update` to have a reason to ask.

**Both walks are bounded and neither follows a link** (C-17). One module,
depth **32**, **10 000 entries**, `lstat` never `stat`, skip list
`.git/`, `.hg/`, `.svn/`, `node_modules/`. **Two call sites at v1.0**:
the phase-1 payload walk and the `verify` project scan (the `untracked`
drift scan left with F3). `E-TRAVERSAL-LIMIT`, exit 2. A symlink in the
pack is `E-SYMLINK-IN-PACK`; one met by the project scan is
`W-SCAN-SYMLINK-SKIPPED`.

**The lock is never broken silently.** Unchanged: broken only when the
recorded host is this host, the recorded pid is not alive, and
`startedAt` is older than 60 s — `W-LOCK-STALE-BROKEN`. Otherwise
`E-LOCK-HELD`. `verify` takes no lock, because it writes nothing.

**Credentials are forbidden, not handled** (C-15). Unchanged in
mechanism, **message corrected**: the disclosure named
`.harness/manifest.json` *and* `.harness/base/`; the base is gone, but
**`.harness/pack/` is committed too**, and it is the largest thing the
apply writes. The heuristic drops bare `key` (which false-positives on
`monkey`, `keyword`, `sortKey`) and matches `api[_-]?key`,
`private[_-]?key`, `secret`, `token`, `passwo?rd`, `credential`,
`connection.?string`. `notASecret: true` is the escape.
`W-ANSWER-LOOKS-SECRET` at answer time is a warning only — an error there
is a false-positive machine. The tempting `type: 'secret'` remains
**rejected**: an unrecorded answer makes the applied tree
non-recomputable, which is the property the whole of Q-43 rests on.

### 7.7 The new surface: the recipe itself, and what validation it gets

A recipe is the one genuinely new thing the Mode A review has not seen.
It is declarative and **fully validated before execution**, which is why
it was chosen over a script — but "validated" must be stated as a list or
it is an assertion.

**What is checked, all at validate time, all fail-closed, all exit 2 —
with one deliberate exception, marked, at the end:**

| Failure | Code |
|---|---|
| `pack.json` names a recipe the pack does not contain | `E-RECIPE-MISSING` |
| `recipe.json` unparseable, or its top-level shape wrong | `E-RECIPE-INVALID` |
| A step's `op` is outside the seven | `E-RECIPE-PRIMITIVE-UNKNOWN` — lists the seven verbatim and states the set is closed |
| A step's inputs are wrong for its `op` — missing required field, a field the primitive does not take, a directory `from` on a file-only primitive, a compound `when`, a scaffold with no steps | `E-RECIPE-STEP-INVALID`, naming step index, `op` and field |
| A step's `from` names nothing in the payload | `E-RECIPE-SOURCE-MISSING` |
| A step's `from` is not a legal pack path — including anything that would escape the pack directory | `E-PAYLOAD-PATH-INVALID` |
| A step's `to` fails the anchored grammar | `E-MAP-PATH-GRAMMAR` |
| A step's `to` resolves into a reserved destination, **`.harness/` included** | `E-MAP-RESERVED-DEST` |
| Two steps write one applied path, over the **merged** step set | `E-MAP-COLLISION` (and the case/normalization variants) |
| An editing step (`rewrite-path`, `substitute`) runs before its target is placed | `E-RECIPE-STEP-INVALID` — a rewrite that runs before its target is an authoring error, not a silent no-op |
| A `rewrite-path` that matches nothing | `E-REWRITE-UNUSED` — a rewrite that no longer applies is stale, and staleness is the defect this product exists to prevent |
| A `merge-json` claiming a key not ownable at its destination, or a security-relevant key claimed via a parent, or a key under `FORBIDDEN_AT_EVERY_DESTINATION` at **any** destination | `E-OWNEDKEY-FORBIDDEN` |
| **Any step whose WRITE SET contains a path whose policy names `allowedOps` and does not list that step's `op`** — by any route: as a `to`, as an `in`-glob match, or as a directory recursion's output. Covers `rewrite-path`, `substitute` and `generate` reaching `.claude/settings*.json` or `package.json`, which the `to`-keyed rule missed entirely | `E-SETTINGS-MODE-FORBIDDEN` (C-19) |
| **`recipe.json` declares a `formatVersion` above the CLI's supported recipe format** | `E-RECIPE-FORMAT-NEWER` (C-24) |
| **A duplicate key at any depth in `pack.json`, `recipe.json` or the manifest** | `E-JSON-DUPLICATE-KEY` (C-25) |
| **Total declared steps — base plus every scaffold's, before `when` filtering — exceed `MAX_RECIPE_STEPS` (256)** | `E-RECIPE-TOO-MANY-STEPS` (C-30) |
| **An `in` glob matching a path that fails the stage-2 denylist** | `E-MAP-RESERVED-DEST` (C-27) |
| A `pack.json`/`recipe.json` scaffold mismatch in either direction | `E-RECIPE-STEP-INVALID` |
| A declared anchor missing, duplicated or unbalanced in the rendered output | `E-ANCHOR-INVALID` |
| A directory the applied output implies, outside `.claude/` and `.harness/`, that receives no folder README | `W-FOLDER-README-MISSING` — **warning**, exit 1 under `--strict`. The one row here that is not exit 2, deliberately: without a project the check cannot tell a directory this apply *creates* from one it merely *writes into*, so it over-approximates. §3.5 |

**Three properties this validation has that are worth naming:**

1. **It is total over the union.** `RecipeStep` is a discriminated union
   and `ops/index.ts` is the only `op`→implementation map, so an
   unhandled arm is a compile error and an unknown `op` is a diagnostic.
   There is no third outcome.
2. **It runs with no project.** Every check above except confinement
   stage 3 is a property of the pack alone, so `validate --all` runs in
   CI with no target directory. That is what makes the authoring-time
   half of §7.0 actually cheap.
3. **It runs per parameter combination** (≤ 32, `E-PARAM-COMBINATORICS`).
   A step reachable only under `--calibration high-floor` is validated,
   and its disclosure is built, without anyone applying it.

**What the recipe does NOT get, stated so a re-review can price it:**

- No check that a `generate` template produces sensible content. The
  anchor assertion is a **line count**, deliberately (Q-45), and an
  anchor inside a fenced code block is counted.
- No cross-step semantic check beyond ordering, collision and the
  write-set policy check of §7.2.0. Two steps that produce a
  contradictory project are a pack-authoring problem.
- ~~No bound on the number of steps.~~ **CLOSED in this pass** (C-30).
  §7.7's previous text asked a re-review to decide it; the re-review did,
  and its reasoning is better than the one I would have used, so it is
  adopted rather than paraphrased: **the bound is not a
  denial-of-service control.** §7.0 has no remote attacker,
  `E-PAYLOAD-TOO-LARGE` already bounds the bytes, and a local user who
  wants to hang their own CLI has cheaper ways. **The bound is an
  inspectability control.** §3.1 rejected a script primitive on the
  ground that `pack info` renders the complete list of what an apply will
  do — *that rendering is the control*, and an unbounded list degrades it
  continuously while naming no point at which a reviewer should stop
  trusting it. `MAX_RECIPE_STEPS = 256`, over **base steps plus the sum
  of every scaffold's steps** (the total *declared* count, before `when`
  filtering and before scaffold selection, because that is what
  `pack info` prints), `E-RECIPE-TOO-MANY-STEPS`, exit 2, at validate
  time, **raisable only by a superseding ADR** — the same terms as every
  other cap in this document. 256 is an order of magnitude above the
  largest v1.0 pack (F5's `coding`, 17 declared steps), so it constrains
  a pathological recipe without constraining an authored one; lowering it
  wants evidence from real packs rather than taste.

### 7.8 New surfaces for the Mode A re-review — N-5 and N-6 added in this pass

> **N-6 is closed (Q-54, 2026-08-31): the surface it names is not shipped.** N-5 is **open and unaffected** — it has nothing to do with `merge-json`, it is the surface a reader should still act on, and F1 v2.3 folds its fix.

Numbered `N-` to avoid colliding with the reviewer's `C-` namespace.

| # | Surface | Why it is new |
|---|---|---|
| **N-1** | **The phase-1 payload copy.** An entire pack tree written into every project and committed there | New write volume, new size and traversal exposure. Controls: path grammar on every payload path, symlink ban, depth 32 / 10 000 entries, 4 MB per file / 32 MB per payload, journalled and rollback-covered. **No new decision surface** — phase 1 reads no declaration |
| **N-2** | **`.harness/pack/` as phase 2's input.** The thing a recipe reads is inside the project and writable by the user | Controls: no recipe step may write under `.harness/` (C-5, absolute); `payloadDigest` (Q-52) lets `verify` detect an edit. **Residual:** nothing stops a user editing the payload and then running `init` in a *different* project — but the payload is per-project, so this is not a propagation path |
| **N-3** | **The recipe as a declared program.** §7.7 lists its validation | The closed union plus the closed registry is the control. A re-review should test the boundary: an `op` of `"copy "` with a trailing space, a `when` with two keys, a step object with two `op` keys after a JSON duplicate-key parse |
| **N-4** | **`payloadDigest` itself.** A new integrity claim in a manifest with no self-integrity | It binds the payload to the manifest, not the manifest to itself. Someone who edits both defeats it. Stated in §5; a re-review should decide whether that is acceptable given v1.0 never merges |
| **N-5** | **`E-TARGET-EXISTS` and `--force` byte-identity compare a step's `to` against a pre-existing on-disk file by exact string.** *Found in this pass, by me, while specifying C-20 — and it is the same defect one layer down.* F1 defines `collisionKey` (NFC + case-fold) and scopes it to **step-vs-step** collision over the merged step set. Nothing folds a step's `to` against a path already on disk. So on macOS or Windows a project containing `.claude/Settings.json` and a step writing `.claude/settings.json` are **the same file**, `E-TARGET-EXISTS` (exit 1) does not fire, and the apply silently overwrites a file it believes it is creating — which also makes the journal record `preExisting: false` and rollback **delete** a user file it did not create, defeating C-13's invariant. **Fixing C-20 without this leaves the class open.** `E-TARGET-EXISTS`, the `--force` byte-identity check and the journal's `preExisting` determination all resolve by `collisionKey`. Folded as §6.1 change 26 |
| **N-6** | **`merge-json` has no v1.0 consumer once §6.2 change 12 lands**, and it carries more security machinery than the other six primitives combined | §3.8 argues why it ships anyway and records that dropping it was available. The compensating control is the adversarial fixture packs (§6.1 change 27); the residual obligation is §9 item 10 — **the first real pack to declare a settings `ownedKeys` requires a fresh Mode A pass.** A re-review should confirm that fixtures are an acceptable substitute for a shipping consumer, or ask for B  **CLOSED 2026-08-31 by Q-54, and the re-review asked for B.** The surface with no consumer is not shipped, so the residual obligation stated here — a fresh Mode A pass before the first real settings pack — is re-scoped in §9 item 10 onto the settings capability's *return* in v1.1, not onto a pack. |

### 7.9 `verify`'s recomputation identity is not universal — **SUPERSEDED BY Q-54: it is universal**

> **Status: superseded 2026-08-31.** The exception this section is about
> **is a `merge-json` destination**, and there is no `merge-json`
> (Q-54). No remaining primitive takes a fourth input, so `verify`'s
> recomputation identity is **exact at every applied path**, Q-40's
> purity claim is true as originally written, and F-4 resolves with no
> change. **C-22's narrowing is deliberately NOT applied**, and
> `verify`'s **`partial`** state does **not** ship: the report is
> two-state. F1 v2.3 §NFR *Determinism* and US-33 are the current
> statement.
>
> Kept as history for one reason a v1.1 reader needs: **this section is
> the specification of what breaks the moment a primitive reads its
> destination.** If the settings capability returns, the fourth input
> returns with it, and this analysis — the idempotent-union blind spot
> in particular, where `verify` reported a hand-added permission as
> `match` — is what must be re-established before it ships, not
> rediscovered.


`verify` recomputes phase 2 and compares to disk. That identity is exact
at every applied path **except a `merge-json` destination**, and the
exception was neither stated nor handled.

**The mechanism.** `merge-json` unions the declared owned keys onto
whatever the destination already holds **and preserves every other key**.
So the destination's **prior content is a fourth input** to the applied
tree — alongside payload, answers and scaffold selection. It is not in
the recomputation identity, not in the manifest, and **unrecoverable
after apply**: nothing records what was there before, and the journal's
`preHash` is a hash, not the content. Two consequences, and the second is
a security defect rather than a modelling one:

1. **Byte-identity holds only into empty directories.** F1's **G-F1-4**
   already says *"into two empty directories"* and is correct as written.
   But F1's §NFR *Determinism*, its Introduction, its Technical Context
   row, US-31 and the master spec's NFR row all state the property
   **unqualified** — and the brief's **Q-40** states the recipe is *"a
   pure function of (payload, parameters)"*, which at a `merge-json`
   destination is **false**. The claim is narrowed, not abandoned:
   *phase 2 is a pure function of (payload, answers, scaffolds) at every
   applied path except a `merge-json` destination; there, the pack's
   **owned keys and their values** are a pure function of those inputs
   and the rest of the file is whatever the project already had.* That is
   a scoped invariant, and a scoped invariant that is true beats an
   unscoped one that is not.
2. **`verify` reported a tampered settings file as `match`.** The union
   is **idempotent**: recomputing `union(disk, owned)` and comparing to
   `disk` agrees whenever `owned ⊆ disk`. So a permission **added after
   apply** recomputes to itself and the three-state report said `match`.
   A verifier that pronounces a hand-added `permissions.allow` clean is
   worse than one that stays silent, because the report is what a
   reviewer trusts.

**The fix, and it needs no new manifest key.** The owned key/value pairs
are already **recomputable** from (payload, answers): `merge-json`'s
`from` is a payload file, `ownedKeys` is declared in the recipe, and the
answers are in the manifest. So at a `merge-json` destination `verify`
recomputes each owned key's value and **deep-equal-checks it against the
on-disk value**, and reports:

- any owned key mismatching → **`differs`** (`E-VERIFY-MISMATCH`, exit 1
  — a user may have edited deliberately, which is the line that code sits
  on);
- every owned key matching → **`partial`**, *never* `match`, with
  `ownedKeysChecked` naming the keys, and the rendered line saying
  plainly that the remainder of the file is user-owned and unverified.

**What this deliberately does not claim.** `verify` does not police
`permissions.allow` at a destination where the pack owns only `model`.
That key was never the pack's to claim, and a tool that reports on
content outside its own claim is a tool whose report cannot be acted on.
`verify` verifies **the pack's claim**, exactly, and says so.

**At v1.0 this is a format statement with no shipping subject**, because
§6.2 change 12 removes the last `merge-json` step from every bundled
pack. That makes it cheap to specify correctly now and expensive to
retrofit the first time a pack needs one — which is the same argument
Q-45 made for inert anchors, and it was right there too.

---

## 8. Security conditions — C-1…C-30 disposition

**SATISFIED-IN-ADR** = decided here and implementable against it.
**DELEGATED-TO-SPEC** = decided here, and the named spec section must
carry it before it is testable. **DEFERRED-TO-V1.1** = its subject left
v1.0 with Q-42 or Q-48; the obligation is named so v1.1 inherits it
rather than rediscovering it. **LAPSED-AND-NOW-REPAIRED** = **new in this
pass, and it is a confession, not a category.** Nothing is marked
satisfied that is not specified above.

### 8.0 Six conditions lapsed, and how a table said otherwise

The 2026-08-31 rewrite marked C-1, C-2, C-5, C-8, C-12 and C-16
`SATISFIED-IN-ADR` or `SATISFIED-IN-ADR, EXTENDED`, and several of them
"**Already carried** in F1". The re-review checked those claims against
**F1's actual text** rather than against this table, and **all six had
measurably lapsed.** They are restated below as
`LAPSED-AND-NOW-REPAIRED`, with the mechanism of the lapse, rather than
quietly re-marked satisfied.

**The common cause is one thing and it is worth naming precisely.** Every
one of the six was written against a model in which **a step's
destination is its `to`**. The rewrite introduced a seven-arm primitive
set in which **two arms have no `to`** and a third is missing from an
enumeration written for the old shape. Each condition then remained
*literally* true of the text it was written about, and *false* of the
system — and a disposition table that re-affirms a condition by citing
the section that states it cannot detect that, because it is checking the
claim against itself.

**The process consequence, recorded because it is the actionable part.**
This is the **second** consecutive pass in which a rewrite lapsed
conditions a disposition table declared satisfied. Two changes follow.
(a) A disposition of `SATISFIED` must cite the **mechanism and its
quantifier** — *"over every applied path any primitive writes"* — not
merely the section number, so that a later change to the quantifier is
visibly a change to the condition. (b) The conditions get **adversarial
fixture packs** (§6.1 change 27): a pack per closed attack, asserted to
fail with a named code. F-1 was reachable in two recipe steps; a fixture
would have caught it and no amount of table-reading did.

| C | Disposition | Where |
|---|---|---|
| **C-1** `ownedKeys` allowlist; leaf-only for security-relevant roots; **hooks outside the ownable set entirely**; `E-OWNEDKEY-FORBIDDEN` | **LAPSED-AND-NOW-REPAIRED** | **How it lapsed:** the allowlist is enforced only where `ownedKeys` is *declared*, which is `merge-json` alone. `rewrite-path` writes the same bytes into the same file **declaring no key**, so the allowlist was intact and its **coverage** was not. The rule was never wrong; its quantifier was. **Repair:** §7.2.0 — the policy is evaluated over every step's **write set**, and `allowedOps` admits only the listed ops **by any route**, so `.claude/settings*.json` is reachable by `merge-json` and nothing else. Additionally `FORBIDDEN_AT_EVERY_DESTINATION` (§7.2.1) makes `hooks` and `scripts` unownable at destinations no policy row names — previously they were ownable there. **DELEGATED:** §6.1 changes 17, 18, 20 |
| **C-2** verbatim enumeration + explicit consent, gate on the plan, before the lock, zero bytes on refusal | **LAPSED-AND-NOW-REPAIRED** | **How it lapsed:** `SecurityDisclosure.settings` is built from `merge-json` steps' `ownedKeys`. A grant landing via `rewrite-path` produces **no `SettingsGrant`**, so `requiresConsent` stays `false`, the gate never fires, and the user consents to nothing because the plan disclosed nothing — the enumeration was verbatim and complete over the wrong set. **Repair:** §7.2.0 removes the route, so there is no undisclosed grant left to disclose. The gate, its six-row table, the before-the-lock ordering and the one-builder/three-surfaces property are otherwise unchanged. **Extended:** the disclosure gains `agentInstructionSubstitutions` (C-28, §3.7), enumerated on C-2's terms and deliberately not gating |
| **C-3** removal-honouring settings merge | **DEFERRED-TO-V1.1** | Its subject is `update` (Q-42): it exists to stop a *second* apply resurrecting a deleted permission, and there is no second apply. **v1.1 obligation:** `update` may not union a security-relevant array without a `removed` set, and the manifest fields for it are additive optional keys that do not bump `manifestVersion` |
| **C-4** confinement by resolution; root resolved once; ancestor `lstat`; `E-DEST-SYMLINK`; descendant proof | **SATISFIED-IN-ADR, amendment stands** | §7.1 stage 3 · `confinePath`, `ConfineContext`, `confineAtWrite`. The 2026-08-30 amendment (resolve the root once, apply the ancestor rule below it) is re-affirmed: without it the CLI cannot run in `/tmp` on macOS. **Already carried** in F1 v2.0 US-3 |
| **C-5** reserved-destination denylist on the resolved path | **LAPSED-AND-NOW-REPAIRED · EXTENDED · NO CARVE-OUT** | **How it lapsed:** F1 US-3 states the rule as *"No step's `to`, no scaffold step's `to` and no `executableRoots` entry…"* — quantified over a field `rewrite-path` and `substitute` do not have. **Partly mitigated already, and I record that rather than overstating:** F1 *does* pin `rewrite-path`'s `in` to *"applied paths that earlier steps have already written"*, so `in: [".harness/pack/**"]` matches nothing and fails `E-RECIPE-STEP-INVALID`. The real residual is threefold — `substitute`'s clause never repeats "already written" and relies on a single §F1.2 table cell; the rule is stated three times and normatively nowhere; and **no `in`-matched path is re-checked against the denylist**, the argument that it need not be being a sound but implicit chain. **Repair:** §7.1 stage 2 is re-keyed to the write set, and §7.2.6 states the `in` resolution domain as a rule with the denylist re-check attached (C-27). **Extension retained: no recipe step may write under `.harness/`** — which under the two-phase model means "no step may rewrite its own input" — and the rule is **absolute**. The one case that would have needed an exception, `.harness/README.md`, was removed at the source on 2026-08-31: `.harness/` is excluded from Q-50 as tool-owned, the file is deleted and no CLI write produces it (§3.4 option C). The CLI's five own writes under `.harness/` are a **category the denylist does not govern**, not a hole in it, and they carry `HarnessPath`. **Nothing delegated — F1 v2.1 carries this** in US-3 stage 2, §F1.6 and US-10 |
| **C-6** anchored `to` grammar; collision after NFC **and** case-fold | **SATISFIED-IN-ADR, EXTENDED** | §7.1 stage 1 · `collisionKey()`. **Extension:** the same grammar applies to every payload path (`E-PAYLOAD-PATH-INVALID`), which is new surface phase 1 created. **Already carried** in F1 v2.0 US-3 and US-30 |
| **C-7** `pattern` + `maxLength` on every string parameter; JSON escaping into `merge-json`; re-parse verification | **SATISFIED-IN-ADR** | §7.3 · `ParameterDecl.pattern`/`.maxLength` · `recipe/ops/substitute.ts` takes the destination kind · re-parse **and deep-equal**. **Already carried** in F1 v2.0 US-8 and US-4 |
| **C-8** no `{{harness:…}}` under a security-relevant owned key | **LAPSED-AND-NOW-REPAIRED · EXTENDED** | **How it lapsed:** `E-SUBST-IN-SECURITY-KEY` is evaluated over a `merge-json` step's declared `ownedKeys` — F1 US-4 says *"a source value that lands under a security-relevant owned key as defined by US-6's destination policy"*. A `substitute` step whose `in` glob named `.claude/settings.json` inserted a substituted value under a security-relevant key **with no owned key ever declared**, so the check had nothing to fire on. Same root cause as C-1: the control is keyed on a declaration a second route does not make. **Repair:** §7.2.0 — `substitute` cannot reach a settings destination at all, so the value cannot exist. The check itself is unchanged, exit 2, at validate time, no override. **Extended:** C-8's *reasoning* — an answer typed by a user is not the pack author's security decision — was applied to settings values and to nothing else; §3.7 applies it to agent-instruction content and decides it explicitly (C-28) rather than leaving it silent |
| **C-9** substitution may not forge a marker | **HALF-SATISFIED · HALF-DEFERRED-TO-V1.1** | The **newline ban** is satisfied (§7.3, `E-SUBST-NEWLINE`) and is the sufficient condition. The **marker-lex half** and `E-REGION-TAMPERED` are removed with the region parser (Q-45) because the anchors are inert and a forged one hijacks nothing. **v1.1 obligation, named:** restore the lex check in the same change that makes `update` read anchors — not after it |
| **C-10** integrity flags fail-closed on write paths | **RESCOPED** | Its subject was `--allow-stale-shared` over `shared[].integrity`; `shared/` leaves v1.0 (Q-48) and the flag does not exist. The **general rule survives** as `E-FLAG-NOT-PERMITTED`, exit 1: a read-only-command flag passed to a write command is refused, not ignored. §7.6 |
| **C-11** integrity verified before a merge | **DEFERRED-TO-V1.1, PARTIALLY PRE-ANSWERED** | Its subject was `pack.integrity`, removed by Q-43. **Q-52's `payloadDigest` answers the half that matters most**: `verify` — and, later, `update` — can prove `.harness/pack/` is the payload this project recorded before trusting anything computed from it. The half that defers is "the *installed* pack claiming this name and version is the same build", which needs `update` to exist to have a consumer. **v1.1 obligation:** `update` checks `payloadDigest` **before** computing a merge base, and refuses on mismatch |
| **C-12** `executable` inside declared roots only; never under `.claude/`/`.git/`/`.harness/`; enumerated | **LAPSED-AND-NOW-REPAIRED** | **How it lapsed:** every clause is written for a *recipe step* — a declared `to`, an `executable` field, a declared root, a cap of 32, a disclosure line. **Phase 1 is not a recipe step and has none of them.** F1 specifies phase 1's content fidelity exhaustively and is **silent on mode**, while F5 requires the payload byte-identical *"file-for-file including modes"*. Under that reading a `0755` source file lands `0755` under `.harness/` — forbidden by name by `E-EXEC-DEST-FORBIDDEN` — with no root declared, no cap consumed, no disclosure entry and no diagnostic, because none of those mechanisms is reachable from a phase that reads no declaration. `payloadDigest` is content-only, so `verify` is blind to it. **Repair (C-26):** §7.4 — **phase 1 writes every payload file `0644` and preserves no source mode**, directories `0755`. It costs nothing (a recipe step sets the mode at the destination, and nothing consults the payload's) and it keeps phase 1's strongest property: **it adds no decision surface**. **DELEGATED:** §6.1 change 22 and §6.2 change 15, which must *remove* F5's "including modes"  **AMENDED 2026-08-31 — the condition now has a shipping subject.** `coding` declares `"executableRoots": ["infrastructure/backend-deploy/"]` and its backend scaffold sets `"executable": true` on `deploy.sh`, `deploy.ps1`, `setup-neon.sh`, `setup-neon.ps1`, which land `0755` and are enumerated in the pre-write disclosure. So every clause of C-12 — declared root, cap of 32, `E-EXEC-DEST-FORBIDDEN` per applied path, the disclosure line — is **exercised by a bundled pack** rather than satisfied vacuously, which is the strongest form of this disposition and the one a fixture can check end to end. `writing` and `planning` declare no root. **Any statement elsewhere in this ADR that no v1.0 pack ships an executable file is history.** See §7.4's amendment box. |
| **C-13** journal records `preExisting` + pre-apply hash; rollback deletes only what it created | **SATISFIED-IN-ADR, EXTENDED** | §7.5 · `Journal` v2, `JournalEntry`, `.harness/journal.d/`, the five-case table, `RollbackResult.restored`. **Extension: phase-1 writes are journalled identically**, so a crashed payload copy rolls back like anything else. **Already carried** in F1 v2.0 US-13 and US-30 |
| **C-14** branded `AppliedPath`; re-validate before each write; exclusive create; `E-TARGET-RACE` | **SATISFIED-IN-ADR, EXTENDED** | §7.1 stage 4 · the brand and `confineAtWrite()`. **Extension: `HarnessPath` and `WritablePath`** — without them the CLI's own `.harness/` writes have no type, and the compile-error property C-14 buys does not hold across phase 1. **DELEGATED:** F1 must name the type (§6.1 change 8). The 2026-08-30 honesty about the runtime half stands: the brand is excellent value, the TOCTOU re-check is defence-in-depth and is the first thing to cut if F2 overruns |
| **C-15** credential-valued parameters forbidden absent `notASecret`; the manifest is repo-public | **SATISFIED-IN-ADR, message corrected** | §7.6 · `ParameterDecl.notASecret` · `src/security/secret-heuristic.ts`. The disclosure named `.harness/base/`, which no longer exists; it now names `.harness/manifest.json` **and `.harness/pack/`**, both committed. **Already carried** in F1 v2.0 US-8 and US-10 |
| **C-16** fail-closed: unknown keys warn, unrecognised **values** are exit 2 | **LAPSED-AND-NOW-REPAIRED · enumeration re-closed** | **How it lapsed, twice.** (a) The rewrite added `Recipe.formatVersion` — `recipe.json` declares it, `E-RECIPE-INVALID`'s message spells it — and **left it out of the closed enumeration**. `E-PACK-FORMAT-NEWER` names `pack.json` only and no rule checks a recipe's version against anything, so a newer recipe format is read as v1.0 and **best-effort applied**: fail-open in the one position C-16 exists to close. A declared version nothing checks is worse than none, because it advertises a gate that does not exist. (b) The destination table's fall-through row (`ownable: null`, `forbidden: —`) made the enumerated position *"an `ownedKeys` root against the destination policy"* **recognised by construction** at every unnamed JSON destination — no value was ever unrecognised, so nothing could fail closed, and `scripts.postinstall` was ownable there. **Repair:** §7.6 — **seven** positions, `Recipe.formatVersion` added with its own code `E-RECIPE-FORMAT-NEWER`, exit 2, zero bytes (C-24); and §7.2.1's `FORBIDDEN_AT_EVERY_DESTINATION` floor, which no row may shrink. **Also folded here:** C-25's strict authored-JSON parse, which is the same fail-closed instinct applied to the parser rather than to a field |
| **C-17** depth and entry caps on both walks; neither follows symlinks | **SATISFIED-IN-ADR** | §7.6 · `src/fs/walk.ts` (depth 32, 10 000 entries, `lstat`, skip list). Two call sites at v1.0: the phase-1 payload walk and the `verify` project scan. **Already carried** in F1 v2.0 US-30, US-33 and §NFR |
| **C-18** `contribute` subject to the identical validation set | **DEFERRED-TO-V1.1** | `contribute` is F4 (Q-42) and `src/security/content-policy.ts` is not built. **v1.1 obligation, named precisely:** F1's pack-content policy must remain **a single callable gate** — the path grammar, the executable rules, the `ownedKeys` allowlist and the recipe validator — so that `contribute` routes through it rather than holding a second copy. The v1.0 module layout already keeps them separable (`security/`, `recipe/schema.ts`), and **v1.1 must not inline any of them into `validate-pack.ts`** |


### 8.1 C-19…C-30 — the re-review's new conditions

Every one is accepted. **None is over-scoped for a local developer CLI**,
and I looked for one to push back on, because a reviewer who argued in
both directions is owed the same and a set accepted wholesale is a set
nobody read. Where I differ it is on **evidence, not on scope** — C-27's
premise is partly wrong and the row says so — and in four places I go
**further than the condition asked**, marked **↑**.

| C | Disposition | Where, and what was decided |
|---|---|---|
| **C-19** destination policy over **every applied path any primitive writes**, not over `to`; `allowedOps` admits only those ops **by any route**; `rewrite-path`/`substitute`/`generate` reaching a settings destination is `E-SETTINGS-MODE-FORBIDDEN`, exit 2, at validate | **SATISFIED-IN-ADR** · **the keystone of this pass** | §7.2.0 · `stepWriteSet()` in the contract · `DestinationPolicy.allowedOps: readonly RecipeOp[] \| null` · §7.7's validation table. The write set is a **pure function of the pack**, so the check needs no project and §7.7 property 2 survives. **↑ Beyond the condition:** the same re-keying is applied to §7.1 stage 2's denylist (C-5's repair) rather than to the settings policy alone, because a rule quantified over `to` is wrong everywhere it appears, and fixing one instance is how the gap re-forms. **DELEGATED:** §6.1 changes 17–20  **SUPERSEDED IN PART, 2026-08-31 (Q-54): the condition's SUBJECT is gone, its QUANTIFIER is kept and is now the whole of it.** There is no destination policy, no `allowedOps` and no `E-SETTINGS-MODE-FORBIDDEN`; `.claude/settings.json`, `.claude/settings.local.json` and `package.json` are stage-2 reserved destinations instead. **What survives is the finding beneath the condition** — a rule quantified over `to` has two silent exemptions, because `rewrite-path` and `substitute` have no `to` — which is general, and is why the write set stays a named concept and every destination rule stays quantified over it. **v1.1 obligation:** a returning settings capability is policed over write sets, never over `to`. |
| **C-20** `policyFor` resolves by `collisionKey` (NFC + case-fold), not exact string, **on every platform** | **SATISFIED-IN-ADR** | §7.2.1 · `policyFor()`. **Evidence correction, in the condition's favour:** F1 does not say "exactly" — F1 says **nothing at all** about how a destination matches a row, which is worse, and this ADR's own contract said `matched exactly`. So the defect is half F1's silence and half mine. Resolution is by `collisionKey`, **unconditionally**, because `validate --all --strict` runs in **Linux CI** while the developer is on macOS or Windows: a platform-conditional policy means the pack CI pronounced valid is not the pack that runs. `policyFor` is **total** — the fall-through row means no destination is unpoliced. **↑ Beyond the condition:** N-5 extends the same folding to `E-TARGET-EXISTS`, `--force` byte-identity and the journal's `preExisting` determination, where the identical bug lets rollback **delete a user file it did not create** (C-13's invariant). Fixing `policyFor` alone leaves the class open  **SUPERSEDED IN PART, 2026-08-31 (Q-54): `policyFor` does not exist; its RESOLUTION RULE does and is re-homed.** With no destination policy there is no function to make total. `collisionKey` matching — NFC-normalized then case-folded, unconditionally on every platform, for the CI-versus-developer reason argued here — is carried by the stage-2 denylist and by N-5's fix to `E-TARGET-EXISTS`, `--force` byte-identity and the journal's `preExisting`. **N-5 survives Q-54 entirely** and is the part of this row a reader should still act on. |
| **C-21** F5 enumerates every pack's `ownedKeys` and its classification; F1 §F1.3 and US-29 agree with F5 on whether any v1.0 pack writes settings | **SATISFIED-IN-ADR, by DELETION rather than enumeration — argued** | **Direction decided, and it is the opposite of the condition's literal wording.** F5 gives all three packs a `merge-json` settings step; **not one of them names a `from` or a single owned key**, and no pack's payload inventory contains a settings source file — so under F1's own `E-RECIPE-SOURCE-MISSING` and `E-OWNEDKEY-FORBIDDEN` **all three steps are already invalid recipes.** They are placeholders. Meanwhile F1 §F1.3's worked `packs/coding/recipe.json` — written later and canonical — carries **no settings step**, F5's own precedence rule says *"where this spec and F1 could disagree, F1 wins"*, and `general/pack-inventory.md` independently records the owned keys as **"Missing"**. So the enumeration branch requires **inventing a permission set no document asks for** to satisfy a consistency condition, which is the worst possible way to acquire one: if nobody can say which keys `coding` needs, `coding` needs none. **Decided: §6.2 change 12 deletes all three steps**, F1 needs no change and is already right, and the two documents agree totally rather than agreeing about a list. **The cost is real and is §3.8 / N-6:** `merge-json` ships with no v1.0 consumer, so it is **fixture-tested only** — §6.1 change 27 — and §9 item 10 requires a fresh Mode A pass before the first real settings pack ships  **SUPERSEDED 2026-08-31 (Q-54), in the direction this row already chose and one step further.** The row decided deletion over enumeration and was right; Q-54 deletes the *primitive* as well, so there is no `ownedKeys` field for any pack to enumerate and the condition has no subject at all. `pack-inventory.md`'s **"Missing"** row — cited here as corroboration — is itself removed in the same pass, because it framed as *this repo's gap* what is the **specified state of every applied project**. The cost recorded at the end of this cell (`merge-json` shipping unexercised, fixture-tested only, §9 item 10) is **void**: nothing unexercised ships. |
| **C-22** F1 states the `merge-json` destination's prior content is an input; narrows the determinism NFR and G-F1-4; specifies `verify`'s behaviour there rather than reporting `match` | **SATISFIED-IN-ADR** | §7.9. The prior content is named the **fourth input**, alongside payload, answers and scaffolds. **G-F1-4 needs no narrowing** — it already reads *"into two empty directories"* and is correct; what needs narrowing is F1's §NFR *Determinism*, its Introduction, its Technical Context row, US-31, **the master spec's NFR row and the brief's Q-40**, all of which state purity unqualified. **↑ Beyond the condition:** C-22 offers *"excluded, or a distinct state"*; §7.9 gives a distinct state **and a real check**. `VerifyState` gains **`partial`**, and at a `merge-json` destination `verify` recomputes each owned key from (payload, answers) — no new manifest key is needed, they are already recomputable — and deep-equal-checks it: any mismatch is `differs`, all matching is `partial`, never `match`, with `ownedKeysChecked` named in the report. Exclusion would have left the highest-risk destination unverified; this verifies **the pack's claim, exactly**, and says the rest is user-owned  **SUPERSEDED 2026-08-31 (Q-54), and the narrowing is deliberately NOT APPLIED.** The fourth input was `merge-json`'s destination, and there is no `merge-json`; `verify`'s recomputation identity is exact at every applied path, so F1's §NFR *Determinism*, its Introduction, its Technical Context row, US-31, the master spec's NFR row and the brief's Q-40 are **true as originally written** and are restated as holding without exception rather than narrowed. **`VerifyState` does not gain `partial`** — the report is two-state — and `ownedKeysChecked` does not exist. F-4 resolves for free. See §7.9's status box for what a v1.1 reader must re-establish if the capability returns. |
| **C-23** F1 states unambiguously whether phase 2 renders from planner-held bytes or re-reads at execute time; if it re-reads, every read re-hashes against planned content, mismatch is `E-TARGET-RACE` | **SATISFIED-IN-ADR · the reviewer's reading CONFIRMED** | **§3.6, decided explicitly.** Phase 2 renders **entirely at plan time** from planner-resolved payload bytes; `executeApply` reads nothing from disk. `.harness/pack/` is phase 2's **logical** input and its **literal** input only at `verify`. Confirmed because the alternative contradicts four authoritative statements, three of them Q-41's own: Q-41's recorded consequence *"the user cannot adjust the payload before phase 2 runs"* (the execute-time window makes it false); Q-40's *"no environment reads"* (a filesystem read at step *n* is one, and is ordering-dependent); `pack-application.md`'s *"both phases … computed in memory"*; and US-30's digest-over-the-**planned**-set. **Cost stated:** F1's *"phase 1 streams file by file"* ends for the phase-2 **source** set, which must be held — not for the rest, which still streams. **US-30's proposed test is replaced**, because it passes under both readings and distinguishes nothing; the replacement mutates `.harness/pack/` between the phases and requires byte-identical output. **The re-read branch's price is recorded for v1.1** rather than dropped |
| **C-24** `Recipe.formatVersion` added to the closed enumeration; a newer recipe format is exit 2, zero bytes | **SATISFIED-IN-ADR** | §7.6 — **seventh** behaviour-selecting position. New code **`E-RECIPE-FORMAT-NEWER`**, exit 2, distinct from `E-PACK-FORMAT-NEWER` because the file, the remedy and the version axis all differ. **DELEGATED:** §6.1 changes 23–24 |
| **C-25** duplicate-key rejection for `pack.json`, `recipe.json`, manifest; `op` matched literally, no trimming or case folding | **SATISFIED-IN-ADR** | §7.6 · `parseStrictJson()` · new code **`E-JSON-DUPLICATE-KEY`**, exit 2, any depth, naming both line numbers. **The reasoning is the best thing in the re-review and is adopted rather than paraphrased:** §7.0's threat model rests on *"the review that would catch `"ownedKeys": ["hooks"]` is a JSON diff review"*, and `JSON.parse` takes the **last** duplicate while a human reading a diff takes the **first** — so the pack reviews as one thing and executes as another, voiding the control by name. **Cost named, not hidden:** Node has no duplicate-key option and a reviver never sees the collapsed key, so this is a hand-rolled token pass (`src/json/parse-strict.ts`) — the one stdlib call this ADR replaces rather than wraps. **Scoped, deliberately:** *not* applied to a `merge-json` destination or its payload `from`, one of which is the **user's own** file; a duplicate there is `E-MERGE-JSON-INVALID`, same fail-closed outcome, different remedy prose, per §7.6's own severity rule |
| **C-26** phase 1 writes every payload file 0644, preserves no source mode; added to US-30's "phase 1 does not" list | **SATISFIED-IN-ADR** | §7.4 and C-12's row above. Directories `0755`. **DELEGATED:** §6.1 change 22 adds it to US-30's "does not" sentence and to its validation list; **§6.2 change 15 is the one that matters**, because F5 currently requires the opposite in two places — *"same bytes, same modes"* and *"file-for-file including modes"* — and a condition folded into F1 while F5 contradicts it is exactly how this pass's six lapses happened |
| **C-27** `in` globs resolved **only** against the plan's recorded written-set, never the filesystem; every `in`-matched path also passes the stage-2 denylist | **SATISFIED-IN-ADR · premise partly corrected** | §7.2.6. **Where the finding overstates, and I record it rather than accept a finding I do not think holds:** F1 v2.2 **already** pins `rewrite-path` in three places — US-4 *"applied paths that earlier steps have already written"*, and both §F1.2 tables — so `in: [".harness/pack/**"]` matches nothing and fails `E-RECIPE-STEP-INVALID` today. **F-6 is not reachable for `rewrite-path`**, and is MEDIUM at most rather than the outcome C-5 exists to prevent. **Where it is right, and it is right three times:** `substitute`'s clause never repeats "already written" and rests on a single table cell; the rule is stated three times and normatively nowhere; and **no `in`-matched path is re-checked against the denylist** — the argument that it needs no check is a sound but *implicit* chain, which is the exact failure mode §7.2.0 just repaired. Both halves are now a named rule with the re-check attached. **↑ Beyond the condition:** the type system enforces it independently — the written-set is `AppliedPath[]`, the payload is `HarnessPath`, so *"an `in` glob names a payload path"* is not constructible. Two mechanisms is the right number for an invariant C-5 calls absolute |
| **C-28** F1 states the trust boundary for a substituted answer landing in agent-instruction content — accepted with reasoning, or enumerated in the disclosure. **Silence does not satisfy it** | **SATISFIED-IN-ADR · decided explicitly, and BOTH branches taken** | **§3.7.** The boundary is stated: such a value is *content authored by the answering user, committed, and read as instructions by every later agent run in every clone* — so the person who types it and the person whose agent reads it need not be the same person, which is a real crossing a settings value does not make in the same way. **Accepted**, on three grounds: it is not an escalation (a model still acts underneath a permission engine a pack cannot touch, and §7.2.0 has now closed the route to that engine); forbidding it deletes the product (all three packs put a project name in `CLAUDE.md`); and C-7's required anchored `pattern` plus C-9's newline ban kill every injection shape that needs a line break. **↑ And enumerated anyway** — `SecurityDisclosure.agentInstructionSubstitutions`, every value verbatim on C-2's terms — because reasoning alone leaves the reader no way to see *which* values landed *where*. **Deliberately not gating**, and this is a security argument not a convenience one: gating fires the prompt on every apply of all three packs, which trains a user to accept without reading and destroys the property that a prompt, the first time one appears, **means something**. Same enumerate-don't-gate trade C-12 already makes. A `W-` warning is **rejected**: `--strict` runs in CI and a warning every legitimate pack trips is not a diagnostic |
| **C-29** a recorded answer failing validation on manifest read-back gets a distinct code, exit class 2 | **SATISFIED-IN-ADR** | §7.6 · new code **`E-MANIFEST-ANSWER-INVALID`**, exit 2. **F1 violates its own rule here and can be cited against itself:** §Error States states *"severity is a property of the code, not of the occasion — a scenario fatal in one context and tolerable in another gets two codes"*, and `E-PARAM-INVALID`'s catalogue row then says *"raised both when an answer is collected and when one is read back from the manifest."* At collection the user typed it and can retype it — exit 1, correct, unchanged. On read-back **the user typed nothing**; the manifest has no self-integrity check by design and `verify` replays answers every run, so a failure means the manifest was edited or the declaration moved under it. That is class 2 by F1's own definition of the classes |
| **C-30** a bound on total recipe steps across base plus scaffolds, distinct code, exit 2, raisable only by a superseding ADR | **SATISFIED-IN-ADR** | §7.7 · `MAX_RECIPE_STEPS = 256` · **`E-RECIPE-TOO-MANY-STEPS`**, exit 2, at validate. §7.7 previously asked a re-review to decide this; it did, and **its reasoning is better than the one I would have used, so it is adopted verbatim rather than paraphrased: the bound is not a DoS control** — §7.0 has no remote attacker and `E-PAYLOAD-TOO-LARGE` bounds the bytes — **it is an inspectability control**, because §3.1 rejected a script primitive on the ground that `pack info` renders the complete list, that rendering *is* the control, and an unbounded list degrades it continuously while naming no point at which a reviewer should stop trusting it. Over the **total declared** count (base + every scaffold, before `when` filtering), because that is what `pack info` prints. 256 is an order of magnitude above F5's largest pack (`coding`, 17 declared steps); lowering it wants evidence from real packs, not taste |

**Summary.** Of **30** conditions: **6 are LAPSED-AND-NOW-REPAIRED** —
C-1, C-2, C-5, C-8, C-12, C-16, every one of them a control whose
quantifier was written for a model with a `to` on every step; **12 more
are SATISFIED-IN-ADR** and **C-19…C-30 are all satisfied here**, four of
them exceeded (**↑** C-19, C-20, C-22, C-27, C-28); **1 is half-satisfied
and half-deferred** (C-9); **1 is rescoped** (C-10); and **4 are deferred
to v1.1 with named obligations** (C-3, C-11, C-18, and C-9's second
half). **No condition is dropped and none is argued down.** One premise
is corrected on evidence (C-27) and one condition is satisfied by the
opposite of its literal wording, argued at length (C-21).

**The two CRITICALs of the original review — C-1 and C-2 — were reported
satisfied by the previous pass and were not.** They are satisfied now,
and the mechanism is written down with its quantifier so that the next
change to the quantifier is visibly a change to the condition.

---

## 9. Open follow-ups

1. **A Mode A re-review is required before implementation, and this ADR
   does not substitute for one.** The security review's verdict of record
   is `REVISE-SPEC`; no `SECURITY-PROCEED` has been issued against F1
   v2.0, F5 v2.0 or this rewrite. The surface changed: phase 1 is new
   write volume, `.harness/pack/` is a new mutable input to phase 2, the
   recipe is a new declared program, and `payloadDigest` is a new
   integrity claim (N-1…N-4). The review should also confirm that
   deleting the region parser removed the surface cleanly rather than
   leaving a half-parser in `generate`.
2. **F2's spec does not exist**, and the consent UX belongs to it. §7.2.5
   reason 4 — "designing the declaration here and the consent there
   splits one decision" — is still live for any v1.1 hook work.
3. **CLOSED — the `.harness/README.md` branch** (§6.4) was escalated on
   2026-08-31 and answered the same day: drop it, `.harness/` is
   tool-owned. Folded into §1, §3.4, §4, §5, §7.1, §8 and the contract.
   No follow-up remains.
4. **`general/system-architecture.md` and `general/technology-choices.md`
   are required and unwritten.** Q-39 changed the shape of the system
   after F1 and the original ADR were written, and nothing currently
   records the whole-system view. This ADR's file-level plan is the
   closest thing that exists and it is F1-scoped.
5. **Q-49's duplication needs an owner.** Two copies of the targets
   contract will drift before v1.1's `shared/` work lands. It should be a
   named task on the v1.1 plan, not a discovery.
6. **CLOSED — a step-count bound on recipes.** The re-review decided it
   (C-30) and its reasoning — inspectability, not denial of service — is
   better than the one this ADR would have used and is adopted.
   `MAX_RECIPE_STEPS = 256`, `E-RECIPE-TOO-MANY-STEPS`, §7.7.
7. **CLOSED — §6.1 changes 12–16 and §6.2 changes 10–11.** Both are
   folded: F1 **v2.2** carries the Q-50 `validate` check, step 12, the
   renumber to 14, `W-FOLDER-README-MISSING`, `folderReadme` and
   `--strict` in CI; F5's third 2.0 pass carries `writing`'s
   `"folderReadme": "index.md"` and the same-`when`-branch rule.
   **Superseded by §6.1 changes 17–27, §6.2 changes 12–16 and §6.3
   change 8**, which this pass created.
8. **A stale count in the brief, found while amending: Q-50's row says
   `planning` gains **2** folder READMEs (`portfolio/`,
   `portfolio/bets/`).** Q-49 makes `planning` ship its own `targets/`
   copy, so it gains **3**, which is what F5's fold records. F5 is right
   and the brief's parenthetical count is stale. **This ADR edits no
   other file**, so it is flagged here for whoever next touches
   `project-brief.md` §12. It changes no decision — the counts are
   illustration, not contract, and §3.5's check will catch the case
   mechanically either way.
9. **The disposition table is not a verification mechanism, and this pass
   proves it twice.** §8's previous edition marked C-1, C-2, C-5, C-8,
   C-12 and C-16 satisfied, several of them "**already carried** in F1",
   and all six had lapsed. The failure is structural rather than
   careless: a table that re-affirms a condition by citing the section
   stating it is **checking the claim against itself**, and it cannot
   detect a change to the *quantifier* the condition is stated over —
   which is exactly what the seven-primitive rewrite changed. Two
   obligations follow, and neither is optional. **(a)** A disposition of
   `SATISFIED` must record the **mechanism and its quantifier** — *"over
   every applied path any primitive writes"*, not *"§7.2.1"* — so a later
   narrowing is visibly a change to the condition. §8.1 is written that
   way. **(b)** The conditions get **adversarial fixture packs**, §6.1
   change 27. F-1 was reachable in **two recipe steps**; a fixture would
   have caught it on the first CI run, and two rounds of table-reading
   did not.
10. **RE-SCOPED 2026-08-31 — the primitive was dropped instead, and the
    obligation moves to v1.1's settings capability.** This item read:
    *"`merge-json` ships with no v1.0 consumer, and that is an
    obligation, not a footnote… the first real pack to declare a
    settings `ownedKeys` requires a fresh Mode A pass before it ships…
    dropping the primitive instead was considered and rejected in §3.8,
    and is flagged as still available if the re-review prefers it."*
    **The re-review preferred it.** Q-54 drops `merge-json`, so nothing
    unexercised ships and there is no `ownedKeys` for a pack to declare.
    **The obligation is not discharged, it is re-pointed:** the settings
    capability returns in v1.1, and **whatever reintroduces it requires a
    fresh Mode A pass covering the whole of it** — the primitive or its
    successor, the ownable-key allowlist, the destination policy, the
    consent surface and the `verify` behaviour of §7.9 — because at that
    point C-1, C-2, C-8 and C-19 run in anger for the first time and
    every one of them is being re-established from a document that
    records them as superseded. **Two rules for that pass, learned
    here:** re-establish the **hook exclusion** explicitly (it is
    *trivially* true at v1.0 because nothing writes a settings file, and
    trivially-true rules get dropped as redundant by whoever
    reintroduces the capability), and quantify every destination control
    over **write sets**, never over `to` (C-19).
11. **§6.5's five out-of-scope corrections need an owner.** Two
    `general/` documents and two brief §12 rows now carry statements this
    pass falsifies or sharpens. The two brief rows — Q-40's purity claim
    and Q-41's ambiguity — are **decision records**, so they want
    amendment notes in the style Q-50 got, not edits.

---

## 10. Verdict

> ### FINAL — set 2026-08-31, superseding everything below in this section
>
> **Architectural verdict: `PROCEED`.**
>
> Every precondition this section set has been met and exceeded. §6.1
> changes 17–27 are folded (**F1 v2.5**, which also carries C-39, C-40,
> C-41, C-43, C-45 and C-48); §6.2 is folded (**F5 v2.4**); §6.3 and
> §6.5 are folded across the master spec, `pack-application.md` and
> `pack-inventory.md`. The architectural delta this section names — *every
> destination control is evaluated over the set of applied paths a step
> writes, not over the step's `to` field* — holds, and F1 v2.5
> generalised it further: **a reserved name is reserved at every segment;
> `.harness/` is the only location entry in the document.**
>
> ### The security position is separate, and it is not a clearance
>
> **No `SECURITY-PROCEED` verdict exists. None is claimed. This
> architectural `PROCEED` is not one, and must not be read as one.**
>
> The security gate is **closed by decision** after four Mode A rounds,
> not by a passing verdict. The trajectory:
>
> | Round | Against | Result |
> |---|---|---|
> | 1 | F1 v1.0 | `REVISE-SPEC` — 2 CRITICAL, 4 HIGH · C-1…C-18 |
> | 2 | F1 v2.2 | `REVISE-SPEC` — 2 CRITICAL, 3 HIGH · **six conditions found lapsed** · C-19…C-30 |
> | 3 | F1 v2.3 | `REVISE-SPEC` — **0 CRITICAL**, 2 HIGH · 24/31 holding · C-31…C-38 |
> | 4 | F1 v2.4 | `REVISE-SPEC` — **0 CRITICAL**, 3 HIGH · **36/38 holding** · C-39…C-48 |
>
> Round 4's HIGHs and MEDIUMs are folded. **C-47 and the LOW residue are
> accepted for v1.0** with their requirements and tests already written.
>
> **Why stopping here is a judgement and not a pass.** Every finding in
> rounds 3 and 4 concerned the membership or the quantifier of a
> **denylist**, which §NFR *Bounded capability* now concedes is
> incomplete by construction. There is no round at which a reviewer runs
> out of destinations to name. The two structural defects round 4 found —
> a rule that did not reach phase 1, and a pin narrower than the property
> it implemented — are closed; what remains is enumeration.
>
> **An implementer must read `§F1.9`'s known limits and v1.1 obligations
> as part of the contract, not as commentary.**

---

*Everything below is the verdict history of earlier passes, retained as
the record of how the design moved. It is superseded by the block above.*

**Verdict (2026-08-31, superseded): `REVISE SPEC`.**

**Not narrowed. The previous edition of this section said "narrowed to
one item, which this pass created", and that judgement was made against a
disposition table that was wrong about six conditions.** The re-review
found 2 CRITICAL, 3 HIGH, 5 MEDIUM and 2 LOW, re-opened the original
CRITICAL S-1 through a route the first review never saw, and issued
C-19…C-30. Twelve `§6.1` and five `§6.2` changes are now unfolded, plus
one in `§6.3` and five out-of-scope corrections in `§6.5`. Two of the
§6.1 changes — **17 and 18**, the write-set re-keying of the denylist and
the settings op lockdown — are the S-1 repair itself.

**What is settled, and I still do not expect it to move.** The two-phase
model, the closed seven-primitive recipe, the six-key manifest, F1's
ownership of `verify`, and the file-level plan and interface contract are
unchanged in shape by this pass. *[Amended 2026-08-31: **six**-primitive,
per Q-54. The closure is what was settled and it held; the count did not.
The verdict below is **not** re-examined in that pass — the fold into F1
and a further Mode A pass decide it.]* **What moved is one thing, stated in one
sentence:** *every destination control is evaluated over the set of
applied paths a step writes, not over the step's `to` field.* That is
§7.2.0, and it is the whole of the architectural delta.

**Precisely what must be true to re-stamp `PROCEED`:**

1. F1 carries **§6.1 changes 17–27**. Changes 12–16, which the previous
   verdict blocked on, are **already folded into F1 v2.2** — verified
   against its amendment row and its text, not assumed. F1 needs a
   **v2.3**.
2. F5 carries **§6.2 changes 12–16**. Changes 10–11 are **already
   folded** into F5's third 2.0 pass. F5 needs a **v2.1**.
3. The master spec carries **§6.3 change 8**.
4. §6.5's five corrections are folded or explicitly deferred by their
   owners — they are outside this ADR's edit scope but they contradict
   it, and an unfolded contradiction in an *authoritative* document is
   how F5 came to specify a settings step F1 had already ruled out.

**Two decisions the re-review demanded explicitly are made, not
deferred.** **F-5/C-23** is decided in **§3.6**: the reviewer's reading
is **confirmed** — phase 2 renders entirely at plan time from
planner-resolved payload bytes, `executeApply` reads nothing from disk,
and `.harness/pack/` is phase 2's *logical* input and its *literal* input
only at `verify` — because the alternative contradicts Q-41's own
recorded consequence, Q-40's purity clause, `pack-application.md`'s
"both phases in memory", and US-30's planned-set digest. **F-10/C-28** is
decided in **§3.7**: accepted with reasoning **and** enumerated in the
disclosure, deliberately not gating. Neither is left silent.

**Where I differ from the re-review, argued rather than dropped.**
**C-27's premise is partly wrong** — F1 already pins `rewrite-path`'s
`in` to the written-set in three places, so F-6 is not reachable for that
primitive and is MEDIUM at most; the condition is satisfied anyway
because its other three-quarters are right. **C-21 is satisfied by the
opposite of its literal wording**: F5's three settings steps name no
`from` and no owned key and are already invalid recipes, so enumerating
`ownedKeys` would mean **inventing a permission set no document asks
for** — they are deleted instead, and F1 needs no change because F1 was
already right. Both are argued at length in §8.1 rather than quietly
complied with. **Nothing is argued down**, and four conditions are
exceeded.

**A further Mode A pass over whatever these folds produce is REQUIRED,
and it is not a formality.** State it plainly, because the record now
supports it: **this is the second consecutive pass in which a rewrite
lapsed conditions a disposition table declared satisfied.** The first
pass lapsed nothing and claimed nothing; the rewrite lapsed six and
claimed twelve. A `PROCEED` re-stamp on this ADR is an **architectural**
judgement about whether the folds landed, and it carries **no security
weight whatever**. The security verdict of record is `REVISE-SPEC`; **no
`SECURITY-PROCEED` has been issued against any revision of F1, F5 or this
ADR**; and the re-review must run against **F1 v2.3 and F5's next
revision as folded**, not against this document's account of them —
which is the methodology that caught F-1 and is the reason it exists as a
finding rather than as a shipped defect.

The re-review should give particular attention to four things: **N-5**,
which I found while specifying C-20 and which lets rollback delete a user
file it did not create; **N-6 / §3.8**, where dropping `merge-json`
entirely was available and was rejected — say so if you prefer it, the
fold is deletions *[**answered: the review preferred it.** Q-54 drops
`merge-json`; §3.8 is overturned, N-6 is closed by deletion, and this
item needs no further attention]*; **§3.6's cost**, where plan-time rendering ends
phase 1's streaming for the phase-2 source set; and **§6.1 change 27's
fixture list**, which is the process control and should be reviewed as
one rather than as test scaffolding.

What the master spec already records as outstanding is unchanged and is
not part of this verdict: no F2 spec, no F6 spec, no
`system-architecture.md`, no `technology-choices.md`, and no
epics-and-tasks for any feature.

---

### 10.1 The superseded verdict, kept because a reversal that hides what it reversed is worth less

`REVISE SPEC` — **narrowed to one item, which this pass created.**

**The architecture is settled and I do not expect it to move.** The
two-phase model, the closed seven-primitive recipe, the six-key manifest,
F1's ownership of `verify`, and the security architecture of §7 are all
decidable on the evidence and are decided here. The file-level plan and
the interface contract are complete enough to build and to test against.
The escalation §3.4 raised is answered and folded, and answering it made
C-5 *stronger* rather than weaker — the invariant now has no exception at
all.

**The three blockers this verdict originally named are cleared, and I
checked rather than assumed:**

1. ~~F1 v2.0 specifies a five-key manifest and a `skeleton/` tree.~~
   **Cleared.** F1 **v2.1** carries §6.1's changes 1, 2 and 4–11: six
   keys with `payloadDigest`, the digest checked first and fail-closed,
   `skeleton/` replaced by five `rename` steps, `HarnessPath` /
   `WritablePath` named, `E-PAYLOAD-DIGEST-MISMATCH` added, counters
   corrected, no open questions. §6.1 change 3 is **withdrawn**, and F1
   correctly never applied it.
2. ~~F5 v2.0 has two live contract breaks against F1.~~ **Cleared.**
   F5's second 2.0 pass removes `shared/` entirely, deletes
   `E-SHARED-UNDECLARED` and `E-SHARED-STALE`, cites F1's recipe codes,
   and restates the pack counts against Q-50. The only surviving
   `E-SHARED-*` strings are in prose recording their own deletion, which
   is the right place for them.
3. ~~The master spec says the v1.0 command surface is `init` only.~~
   **Cleared.** It read four commands, carried the Q-50 row with
   both exclusions, six manifest keys, and Q-47…Q-53 indexed as resolved.
   **Re-checked 2026-09-01:** the master spec is at **v1.0.2** and has
   moved on again with Q-62 and Q-63 — **five** commands under the group,
   sequencing `F1 → F2 → F5 → F3 → F6`. Still cleared, and the count in
   the sentence above is left as the record of what was checked when.

**One item remains, and it is mine.** §3.5 decides that `validate`
enforces Q-50 mechanically, which adds §6.1 changes 12–16 (a new US-16
order step 12 and the renumber to 14, `W-FOLDER-README-MISSING`,
`pack.json`'s `folderReadme`, and `--strict` in CI) and §6.2 changes
10–11 (`writing` declares `index.md`; every pack's conditional folders
get conditional READMEs). **Had this pass added nothing, the verdict
today would be `PROCEED`.** It would be dishonest to add work to §6 and
declare §6 satisfied in the same document, so the verdict stands at
`REVISE SPEC` — but the delta is one warning code, one optional
`pack.json` key and one renumbered check order, none of which changes
what an implementer builds. It is a fold, not a decision.

**Precisely what must be true to re-stamp `PROCEED`, without amending
this ADR:** F1 carries §6.1 changes 12–16 (F1 v2.2) and F5 carries §6.2
changes 10–11. Nothing else. The re-stamp does not wait on the Mode A
re-review — see the next paragraph, which is a separate gate on
*implementation*, not on this verdict.

What the master spec already records as outstanding is unchanged and is
not part of this verdict: no F2 spec, no F6 spec, no
`system-architecture.md`, no `technology-choices.md`, and no
epics-and-tasks for any feature.

**Whatever verdict this ADR carries, implementation must not begin
before a fresh Mode A security review of the rewritten specs.** The
security verdict of record is **`REVISE-SPEC`** (Mode A, 2026-08-30, over
F1 v1.0 and the original ADR). **No `SECURITY-PROCEED` has been issued
against F1 v2.1, F5 v2.0 or this rewrite**, and the surface under review
moved: phase 1 is new write volume, `.harness/pack/` is a new mutable
input to phase 2, the recipe is a new declared program, and
`payloadDigest` is a new integrity claim (N-1…N-4). This ADR does not
change the security verdict and does not substitute for the review. An
architectural `PROCEED` is not a security clearance, and neither this
document nor the folds it triggered may be read as one.
