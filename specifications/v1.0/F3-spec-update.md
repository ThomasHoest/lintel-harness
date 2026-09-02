# `lintel harness update` Specification — Lintel Harness v1.0
**Version:** 1.2
**Status:** Accepted
**Date:** 2026-09-01
**Platform:** Node ≥ 22 / TypeScript CLI, published as `@linteldk/cli`, binary `lintel`, with **`harness` as a command group** — every command here is reached as `lintel harness <command>` (Q-16 as amended by Q-63). No UI.
**Design spec:** n/a (no UI)
**ADR:** `F3-ADR-NNN-update.md` — not written; to be filled in by the architect after this spec is reviewed
**References:** `specifications/project-brief.md` §12 (**Q-62**, Q-1, Q-2, Q-42, Q-43, Q-52, Q-56, Q-57) · `specifications/v1.0/F1-spec-pack-format-and-manifest.md` v2.9 (**US-33**, US-10, US-13, US-14, US-15, §Error States, §F1.6, **§F1.8**, §F1.9) · `specifications/general/interaction-model.md` v1.1 (**§9**, §11.3, IM-13, IM-29…IM-35, IM-40, IM-41) · `specifications/general/pack-application.md` · `specifications/general/system-architecture.md` §4 · `specifications/v1.0/LintelHarnessSpecification-1.0.md` §Feature 3

**Amendment history**

| Version | Date | Summary |
|---|---|---|
| **1.2** | **2026-09-02** | **E-23 built, and it found four places where this document, `F3-ADR-004` and F1's catalogue disagree.** **Two are corrected in F1 v5.6 rather than here, because F1 owns the catalogue and this document was the one that reasoned:** `E-UPDATE-PARAM-UNANSWERED` and `E-UPDATE-SCAFFOLD-DROPPED` were exit **1** there and exit **2** here — US-69 argues it (*"Class 1 means you can fix this, and the user **cannot**"*) where F1 merely stated it — and `E-UPDATE-PARAM-UNANSWERED`'s remedy named **`--set`**, a flag US-59 says this command refuses. **Two are recorded here.** `F3-ADR-004`'s `UpdateEntry` has **no field for whether the pack also changed a path**, which US-61, US-62 and US-71 all require and only the CLI can determine — implemented as `packAlsoChanged`. And the ADR types `state` non-optional while **§F3.3's first two rows have no state at all**, and US-71's *"F1 US-33's closed four, verbatim"* predates Q-79 making them **six** — implemented as `VerifyState | null` over six. **One epics-vs-spec conflict, resolved toward the spec**: T-2306 says `update` *"may not fall back to the declared default"*, while **US-69 says a new parameter with a `default` is not a fault at all** — its default is used and recorded. The spec wins, per `F3-ADR-004` §10's own lesson, and it matches what `init` already does, so a parameter resolves identically whichever command met it first. **Three points this document does not settle are decided in the implementation and named there**: the fill-expected set takes the **union** of both recipes (stated for `adaptExpected` and not for `fillExpected`, and the other reading destroys a brief exactly once); §F3.3 rows 1–2 outrank T-2308's phrasing where they conflict; and there is **no rule for a case-only rename across a pack version**, which is matched exactly and left as a named residual. |
| 1.0 | 2026-09-01 | Initial draft, written against **Q-62**. Specifies `lintel harness update`: two recomputations, one classification, replace-or-hand-over, no merge engine. Decides the six items the master spec and `interaction-model.md` §11.3 recorded as *open items inside a settled shape* — the disclosure, the failure contract, the read-only mode's flag spelling, orphan handling, the `payloadDigest` branch, and the payload/manifest ordering. Requests four catalogue rows and three amendments from F1 rather than inventing them. |
| 1.1 | 2026-09-01 | **Q-79 adds a seventh disposition; the rest of §F3.3 is confirmed against a challenge and stands.** **`kept-fill-expected`** — a path a pack declared `fillExpected` is left and reported with its own reason, *shipped to be filled in* rather than *edited*, and is **never overwritten**: not when the newer pack changed the file, not when it is byte-identical to what shipped, and under no flag. Absolute rather than conditional on the file having been filled, because an unfilled brief and a filled one are indistinguishable to a rule that must be right before it looks, and the costs are asymmetric — over-applying leaves a stale template the user can see and delete, under-applying silently destroys the document every other document is downstream of. **The other six are unchanged, and that is a finding rather than an absence of one:** `F3-ADR-004` initially claimed four of them should be folded away, and `T-2301` was written to do it. **The claim was wrong** — `added` and `replaced` are not the same write, `unchanged` and `kept-adapted` are not the same silence, and the ADR's `deleted` conflated an **applied** orphan (reported, never deleted) with a **payload** orphan (removed from `.harness/pack/`, not an applied path). The ADR is corrected in its §10; **this document was authoritative and stays so**. |

---

## Introduction

F3 is `lintel harness update`. It moves an applied project to a **newer
version of the pack it already applied** — never to a different pack
(Q-12, IM-4) — and it is the half of the product that copy-paste cannot
do. It was deferred to v1.1 by **Q-42** and returned to v1.0 by
**Q-62**; this spec does not re-open that shape, it specifies it.

**The shape, restated once because everything below follows from it.**
The CLI recomputes two trees and compares. `expected_old` is F1 §F1.8's
identity evaluated over the **local** `.harness/pack/` payload, its
recipe and the manifest's recorded answers and scaffolds — the exact
recomputation `verify` already performs (F1 US-33). `expected_new` is
the same identity evaluated over the **newer bundled** payload and its
recipe, with the **same** recorded answers and scaffolds. Neither
recomputation is new machinery; that is why Q-62 could reverse Q-42
without building anything. Per applied path:

- **unedited** — the file on disk matches `expected_old` — is **replaced
  outright and silently**;
- **edited** — the file on disk differs from `expected_old`, or is gone
  — is **left untouched and reported**;
- **`adapted`** — the path is in the adapt-expected set the pack
  declared, `CLAUDE.md` in all three packs (Q-56) — is **never blindly
  replaced**, because being edited is its declared purpose.

**There is no merge engine, no three-way merge, no conflict markers and
no patch output.** Reconciling an edited path is judgment, and judgment
is the skill's (Q-1) on the conversational path Q-57 made primary. The
CLI stops where computation stops; F6 and the user carry on from the
report. This is the one place in the product where a command
deliberately ends with work outstanding, and IM-30 binds every surface:
an edited path left untouched is **the mechanism working**, not damage.

**`status` is not a command.** Q-62 folds it into `update`'s read-only
mode, which this spec spells **`--dry-run`** (US-63). S4 — *`status`
correctly reports pack, version and drift* — is satisfied there, and no
sixth command joins the surface.

**How this relates to what exists.** `update` extends nothing and
replaces nothing. It is a second consumer of F1's recomputation identity
(`pack-application.md`, *"`update`, in one paragraph, because it is this
model's second consumer"*), a second consumer of the six-key manifest,
and the second writing command alongside `init`. It adds no primitive,
no manifest key, no recipe field and no pack-format concept. What it
adds is a **command**, its flags, its report and its failure contract —
which is the whole of what F1 v2.9 deliberately left unstated.

**Explicitly out of scope, inline because a reader will look for it
here.** `update` **cannot send anything back to the pack.** An
improvement made inside a project reaches `packs/<name>/` only by
hand-editing it and bumping the pack version; `contribute` stays
deferred to v1.1 as F4 (Q-62, IM-36). `update`'s report names exactly
the paths a `contribute` would propose promoting — the same
recomputation pointed the other way — and reading that report and
deciding what deserves promotion is **manual work at v1.0**. `update`
also does not change an answer or a scaffold (Q-21, Q-22): it recomputes
from the answers the manifest already records, and a newer pack that
needs an answer no project ever gave is refused rather than prompted for
(US-69).

### What is in scope

- The `lintel harness update` command surface: its usage line, its
  flags, its two modes, its report and its exit classes.
- The **two recomputations** and the **closed six-value disposition**
  each applied path receives, derived from `verify`'s closed **six**
  states (F1 US-33, Q-79) and never replacing them.
- **What `update` writes**: the replacement of `.harness/pack/` with the
  newer payload, the phase-2 replacement of unedited paths, and the
  rewrite of `.harness/manifest.json` — with the ordering, the commit
  point and the invariant that binds them (US-65).
- The **failure contract**: zero bytes before the gate, the journal, the
  lock, `update --rollback`, and the deliberate absence of a resume
  (US-66).
- The **`payloadDigest`** branch: fail-closed, before anything, in both
  modes (US-64).
- **Orphans** — a path the newer pack no longer ships (US-68) — and
  **additions** — a path it newly ships (US-60).
- The **pre-write disclosure** at `update`, and the one thing it can do
  that `init`'s and `pack info`'s cannot (US-67).
- The **seam with F6**: what the CLI hands over, in what form, and what
  it may not do on the skill's behalf (US-72).

### What is NOT in scope

- **`contribute`** — v1.1, F4 (Q-62). No route from project to pack
  exists at v1.0 by any command.
- **Any merge, blend, patch, hunk or conflict marker.** Not deferred —
  *not built*, on Q-62's evidence that 12 of 16 applied files were
  byte-identical and a merge engine would be built for the minority.
- **The conversational reconciliation itself** — F6's, specified by
  `interaction-model.md` IM-31…IM-34. This spec fixes only the handover.
- **Changing a pack, an answer or a scaffold** (Q-12, Q-21, Q-22).
- **The message catalogue.** F1 §Error States is the product's only one.
  This spec **cites** F1's codes and **requests** four new rows and
  three amendments in §F3.6; it invents none.
- **The pack format, the recipe, the primitives and the manifest
  schema** — F1's, unchanged by this feature. `update` adds no key.
- **Region-aware merging.** The anchors stay inert (Q-45); `update`
  classifies by recomputation, not by region, and needs no parser.
- **Any network access.** "Newer" means *the user upgraded `@linteldk/cli`*
  (Q-2). See §NFR *No network*.

---

## Technical Context

Only settled decisions. Rows marked *(brief)* were settled in
`project-brief.md` §12; rows marked *(F1)* or *(IM)* are restated from
the cited document, not re-litigated.

| Decision | Choice | Rationale |
|---|---|---|
| Whether `update` ships | **v1.0** *(brief Q-62)* | Q-42's blocker was that a merge needs a base; Q-39/Q-43 made the base recomputable and deleted `.harness/base/`. `verify` is most of `update` |
| Merge strategy | **None. Replace the unedited, hand over the edited** *(brief Q-62)* | A merge engine would be built for the minority case; the majority needs a replace and nothing more |
| Where "newer" comes from | **The bundled pack in the installed `@linteldk/cli`** *(brief Q-2)* | Packs are bundled with the published CLI. "Newer" is resolved by `npm i -g @linteldk/cli@latest`, never over the wire (§NFR *No network*) |
| The base for classification | **`expected_old`, recomputed** — local `.harness/pack/` + its recipe + the manifest's answers and scaffolds *(F1 §F1.8, US-33)* | The identity `verify` already evaluates. No cached bytes, no stored base, no per-file hash list (Q-43) |
| The target | **`expected_new`** — the newer bundled payload + its recipe + **the same** recorded answers and scaffolds | An update is a pack-version move and nothing else. Varying an answer at the same time would make the result irreproducible from the manifest |
| Per-path comparison states | **`verify`'s closed four** — `match`, `adapted`, `differs`, `missing` *(F1 US-33, Q-56)* | One enumeration, one implementation. `update` adds a **disposition** derived from them (§F3.3), not a fifth state |
| `status` | **Not a command.** `update --dry-run` *(brief Q-62, IM-35)* | A `status` alias would put the name back in `E-CLI-UNKNOWN-COMMAND`'s list and in help output, reinstating by the back door the command Q-62 removed |
| Read-only mode's flag | **`--dry-run`** (this spec, §F3.6 item 3) | The standard spelling for *show me what this write would do*; a property of the writing command, which is what Q-62 says the read-only mode is. `--check` was rejected: it reads as `verify`'s question, and IM-25 forbids offering one command for the other |
| Disclosure | **Yes, in both modes** (this spec, §F3.6 item 1) | A newer pack version can ship an agent file, an executable or a substitution the applied version did not (IM-13). The builder already exists and is already rendered by three surfaces (F1 US-13) |
| Failure contract | **`init`'s, in full, and it binds harder here** (this spec, §F3.6 item 2) | A partial update is worse than a partial apply: the directory was not empty, so there is no *"delete `.harness/` and start over"* remedy |
| The commit point | **The manifest write, last** *(F1 §F1.6 step 11, restated)* | The manifest and the payload move together or neither moves (US-65) |
| `payloadDigest` mismatch | **Fail-closed, before the plan, both modes, zero bytes** *(F1 US-33, IM-40, IM-41, `pack-application.md`)* | `expected_old` is computed *from* the payload; an untrusted payload makes the classification meaningless, and a meaningless classification would drive real writes |
| Orphan handling | **Applied orphan: reported, never deleted. Payload orphan: deleted** (this spec, §F3.6 item 4) | F1's Q-25 default confirmed for the user's tree, and necessarily reversed inside `.harness/pack/`, which is the CLI's own tree and must stay a verbatim copy or `payloadDigest` refuses it forever |
| Lock | **Taken in the writing mode; never in `--dry-run`** *(F1 §NFR *Concurrency*, IM-38)* | `--dry-run` writes nothing, so it takes no lock, exactly as `verify` does |
| `--force` | **Does not exist on `update`** (US-60) | Its only job would be the pre-existing-path rule, and classification already answers that case: a project file standing where the newer pack newly ships is `differs` against an empty expectation, therefore **edited**, therefore left alone |
| Exit code for edited paths | **`0` in the writing mode** (US-61) | Class 1 means *fix it and re-run*, and re-running changes nothing. It would also trip IM-7 and stop the skill at precisely the moment its reconciliation work begins |
| Exit code for an available update | **`1` in `--dry-run` only** (US-63, Q-72) | IM-39's class 1 covers *drift the tool found*; `E-VERIFY-MISMATCH` is the precedent. In the writing mode the same condition is not a fault, it is the reason the command ran |
| Skill relationship | **The CLI hands over; the skill decides nothing alone** *(brief Q-1, Q-57; IM-31…IM-34)* | Deterministic mechanics in the CLI, judgment in the skill |

---

## Goals

Each is assessable yes/no when the feature is done.

- **G-F3-1** — A change made to a bundled pack reaches an existing
  project by one command, with every local customisation preserved
  exactly, where *preserved* means **left untouched and reported**,
  never merged and never marked up. *(S3)*
- **G-F3-2** — An applied project can be asked what an update would
  change, and answering writes nothing, takes no lock and makes no
  network request. *(S4)*
- **G-F3-3** — This repo is **maintained by** `lintel harness update`,
  not merely produced by `lintel harness init coding`: a pack bump lands
  here through the command, and `lintel harness verify` exits `0`
  afterwards with `CLAUDE.md` reported `adapted` and no path reported
  `differs`. *(S7, restored in full by Q-62)*
- **G-F3-4** — An interrupted `update` is always detectable and always
  reversible to the exact bytes that were there before it started,
  including `.harness/pack/`, with no data loss for any path the user
  has touched since.
- **G-F3-5** — `update` builds no merge engine: no three-way merge, no
  conflict markers, no patch output, no hunk selection. Assessable by
  reading the shipped module list.
- **G-F3-6** — `update` adds **zero** keys to the manifest, **zero**
  primitives to the recipe and **zero** fields to `pack.json`.
- **G-F3-7** — `update` makes no network request, and the version it
  moves to is the one bundled in the installed CLI.
- **G-F3-8** — Two `update` runs of the same project from the same
  applied version to the same bundled version, on two clones, produce
  byte-identical trees and byte-identical manifests.

---

## Out of Scope (this version)

- **`contribute`** — the project → pack direction. **v1.1, F4** (Q-62,
  IM-36). No command carries an improvement back into a pack at v1.0.
- **Any merge, patch or conflict-marker output** — not deferred, not
  built (Q-62). A v1.1 that wants a region-aware merge inherits the
  inert anchors and needs no format change (Q-45), and inherits F1
  §F1.9 obligation 7 with them.
- **Changing an answer or a scaffold during an update** (Q-21, Q-22, F1
  §F1.9 limit 5). `update` recomputes from the recorded answers.
- **Switching packs, or adding a second one** (Q-12, F1 §F1.7).
- **Downgrading to an older pack version** — refused (US-70).
- **Updating across a `manifestVersion` boundary the running CLI does
  not read** — `E-MANIFEST-NEWER`, exit 2 (F1 US-15). `update` performs
  no manifest migration at v1.0.
- **A resume after an interrupted update** — deliberately absent
  (US-66). The remedy is `update --rollback`, then re-run.
- **`--strict` on `update`** — absent, exactly as it is on `init`
  (IM-22). No warning `update` raises changes its exit code.
- **Selective or interactive updating** — no path filter, no
  per-file prompt, no "update these three files". The classification is
  the whole of the selection.

---

## User Stories

Range used: **US-59 … US-72.** Next free id in F3's block: **US-73**
(block ends at US-78).

**Retired elsewhere, never reused, and deliberately not revived here:**
F1's **US-11** (drift reporting — Q-42) and **US-12** (merge base —
Q-43). US-63 covers the ground US-11 named and US-59 covers the ground
US-12 named; both take **fresh ids**, which forces each to restate its
own contract rather than inherit a heading whose reasoning was reversed.

---

**US-59 — Move a project to a newer pack version**
> As a project owner, I want one command that brings a newer version of
> my pack into my project so that an improvement made in the pack
> reaches me without a hand-copy and without losing my customisations.

**Acceptance criteria:**
- `lintel harness update` runs in a project that has a completed apply.
  With no completed apply it fails with **`E-MANIFEST-MISSING`**, exit 1,
  zero bytes, naming `lintel harness init` (F1 US-15).
- It takes **no pack argument and no version argument**. The pack is the
  one the manifest records; the version is the one bundled in the
  installed CLI. A positional argument is **`E-CLI-ARG-UNEXPECTED`**,
  exit 1. *(Two arguments a user could get wrong, removed by having
  neither; and it makes `update` un-runnable against a pack the project
  never applied, which is Q-12 enforced by the surface.)*
- It resolves the bundled pack **by the manifest's recorded pack name**,
  and checks that pack's `minCliVersion` and `formatVersion` exactly as
  `init` does — `E-PACK-CLI-TOO-OLD` exit 1, `E-PACK-FORMAT-NEWER` exit
  2, `E-RECIPE-FORMAT-NEWER` exit 2, all zero bytes (F1 US-1, C-24).
- It recomputes **`expected_old`** from `.harness/pack/`, the recipe
  inside it, and the manifest's `parameters` and `scaffolds` — the
  identity of F1 §F1.8, evaluated by the **same code path `verify`
  uses**. A test may assert the shared implementation structurally.
- It recomputes **`expected_new`** from the **bundled** payload and its
  recipe, with the **same** `parameters` and `scaffolds`. No answer is
  re-prompted, no scaffold is re-selected, and there is no `--set` or
  `--scaffold` flag on this command (`E-CLI-UNKNOWN-FLAG`, exit 1).
- Both recomputations happen **entirely in memory, at plan time**, and
  the executor reads nothing back (F1 C-23). A test mutates
  `.harness/pack/` between the plan and the writes and requires
  byte-identical output.
- Every applied path receives exactly one **disposition** from the closed
  six of §F3.3. The enumeration is closed; a seventh is a spec change.
- The run's report names, per disposition, the count and the paths, and
  `update` never reports a path the recipe does not produce — the same
  bound `verify` states (F1 US-33): *is what the pack wrote still what
  the pack would write*, not *what else is in this repo*.
- The project scan is F1 C-17's bounded walk: depth ≤ 32, ≤ 10,000
  entries, `lstat` only, never following a symlink
  (`W-SCAN-SYMLINK-SKIPPED`), never descending into `.git/`, `.hg/`,
  `.svn/` or `node_modules/`.
- Two `update` runs of the same project, from the same applied version to
  the same bundled version, on two clones, produce **byte-identical
  trees and byte-identical manifests**. A test may assert it by recursive
  byte-comparison with no exclusions.

---

**US-60 — Replace an unedited path outright, silently**
> As a project owner, I want the files I never touched to simply become
> the new ones so that most of an update is invisible and I only have to
> think about the files I actually changed.

**Acceptance criteria:**
- A path whose on-disk content equals `expected_old` **and** whose
  `expected_new` content differs from `expected_old` is **replaced** with
  the `expected_new` content. No prompt, no diff to approve, no
  confirmation, no conflict marker, no backup left in the project tree.
- A path whose on-disk content equals `expected_old` **and** whose
  `expected_new` content is byte-identical to it is **`unchanged`**: it
  is not written, not journalled as a write, and not listed among the
  replacements. *(The great majority of paths on a typical bump. Writing
  a file to the same bytes costs a journal entry, a backup and an
  mtime change for nothing.)*
- A path present in `expected_new` and absent from `expected_old` — the
  newer pack ships a file the applied version did not — is **`added`**
  when nothing occupies it on disk, created with the same exclusive
  semantics `init` uses (F1 US-13, C-14): `open(tmp,'wx')`, then
  `link(tmp,dest)`/`unlink(tmp)`, with the documented `open(dest,'wx')`
  + `rename` fallback where `link` is unavailable.
- **When something *does* occupy that path, it is `kept-edited`, not a
  collision.** It differs from an `expected_old` that has no entry for
  it, so it is edited by the rule of US-61 and is left untouched and
  reported. **`update` therefore has no `E-TARGET-EXISTS` branch and no
  `--force`**, and that is a consequence of the classification rather
  than an omission: the one thing `--force` does on `init` is relax the
  pre-existing-path rule, and `update` has no such rule to relax.
- Comparison is over **normalized content** for text and **raw bytes**
  for binary, by F1 §NFR's single normalization rule. A CRLF checkout and
  an added UTF-8 BOM are `unchanged`, not edited, and therefore neither
  block an update nor produce a spurious replacement.
- The executable bit is carried by the replacement where the platform
  represents it, under F1 C-12's rules unchanged: every `0755` applied
  path lies inside a declared `executableRoots` prefix, the cap of 32
  holds over the run, and each appears in the disclosure (US-67).
- **Silently means silently in the interaction, not silently in the
  record.** Every replaced path appears in the report and in `--json`;
  what it does not do is stop, ask, or annotate the file.
- A test: apply `coding@X`, touch nothing, bump to `coding@Y`, run
  `update`, and require the applied tree to be byte-identical to a fresh
  `init` of `coding@Y` with the same answers and scaffolds.

---

**US-61 — Leave an edited path untouched, and be told about it**
> As a project owner, I want a file I changed to survive an update
> unchanged so that I am never made to choose between taking an
> improvement and keeping my work.

**Acceptance criteria:**
- A path whose on-disk content **differs** from `expected_old`, or which
  is **missing** from disk, is **`kept-edited`**: `update` writes zero
  bytes to it, of any kind. Not the new version, not a merged version,
  not a `.orig`, not a `.new` sibling, not a marker.
- **A deletion is an edit.** A generated file the user removed
  classifies `missing` (F1 US-33) and is `kept-edited` — it is **not**
  re-created. *(Re-creating it would be the one form of "replace the
  unedited" that overwrites a decision the user made.)*
- Every `kept-edited` path is reported with, at minimum: the path, and
  whether `expected_new` differs from `expected_old` there — i.e.
  whether the pack changed the file the user also changed. The two cases
  need different work from the reader, and only the CLI can distinguish
  them.
- **The report must read as work handed over, never as damage** (IM-30).
  No `kept-edited` path is described as a conflict, a failure, a
  rejection or a loss; none appears under a heading that implies one;
  and none contributes to a non-zero exit in the writing mode.
- **The writing mode exits `0` when it completes, whatever the count of
  `kept-edited` paths.** Reasoning, stated because it is the most
  tempting thing to get wrong: class 1 means *fix it and re-run* (IM-39),
  and re-running `update` produces the identical result — the paths are
  still edited; a class-1 exit would make a correct update permanently
  red in CI and would trip IM-7, stopping the skill at exactly the moment
  its reconciliation work is supposed to begin.
- `update` does not rank, group, characterise or recommend across
  `kept-edited` paths. It lists them. *(Recommending is judgment, and
  judgment is IM-32's, exercised in conversation with a human.)*
- A test: apply `coding@X`, edit one generated file, bump to `coding@Y`
  where that file also changed, run `update`, require exit `0`, require
  the edited file byte-identical to what the user left, and require it
  named in the report with the pack-also-changed flag set.

---

**US-62 — Never blindly replace an adapt-expected path**
> As a project owner, I want the file the skill adapted for my project —
> `CLAUDE.md` — to be treated as mine by default, so that an update
> never silently throws away the adaptation that made it correct.

**Acceptance criteria:**
- A path in the **adapt-expected set** — the union of the write sets of
  the steps that declared `"adaptExpected": true` (F1 US-31, Q-56) — is
  **`kept-adapted`** and is **never replaced**, whether or not its
  on-disk content currently differs from `expected_old`.
- **"Whether or not it differs" is the point, and it is the one place
  `update` deliberately diverges from `verify`'s reading.** `verify`
  reports such a path `match` when it happens to be byte-identical
  (F1 US-33: *the state names what `verify` found, never what it was
  permitted to find*). `update` is deciding whether to **overwrite**, and
  a `CLAUDE.md` that is byte-identical today is still the file the skill
  is expected to rewrite tomorrow. Replacing it because it has not been
  adapted *yet* would destroy the adaptation on the next run and produce
  no diagnostic. So the declaration governs, not the current bytes.
- The adapt-expected set is **recomputed from the local payload and its
  recipe**, never read from the manifest — there is no `adaptExpected`
  list in `.harness/manifest.json` and adding one is out of scope (Q-43,
  Q-52, F1 §F1.8, G-F3-6).
- **The set is taken from `expected_new`'s recipe as well as
  `expected_old`'s, and the union governs.** A path either recipe
  declares adapt-expected is `kept-adapted`. *(A pack that newly declares
  a file adapt-expected is declaring that users adapt it; taking only the
  old recipe's set would replace it exactly once, on the run that
  introduced the declaration.)*
- A `kept-adapted` path is reported alongside `kept-edited` paths and
  handed over the same way. The distinction is preserved in the report
  and in `--json` — the reader needs to know that one is a file they
  changed and the other is a file the pack **expects** them to have
  changed.
- Because the generated `CLAUDE.md` is adapt-expected in all three packs
  (Q-56), **every** `update` of every project hands at least one path
  over. This is normal and neither entry point may present it otherwise.
- A test: apply `coding@X`, let the skill adapt `CLAUDE.md`, bump to
  `coding@Y` where the `CLAUDE.md` template changed, run `update`,
  require `CLAUDE.md` byte-identical to the adapted version, and require
  it reported `kept-adapted` with the pack-also-changed flag set.

---

**US-63 — See what an update would change, without writing anything**
> As a project owner or a CI job, I want to ask whether a newer pack
> version exists and which of my files it would touch, without any risk
> that asking changes something.

**Acceptance criteria:**
- **`lintel harness update --dry-run`** performs every step of an update
  up to and including the classification, and then **stops**. It writes
  nothing — no applied path, no payload file, no manifest, no journal,
  **no lock**. This is Q-62's fold of `status`, and there is **no
  `status` command**: `lintel harness status` is `E-CLI-UNKNOWN-COMMAND`,
  exit 1, whose message lists the six commands (F1 §Error States).
- `--dry-run` emits the **same report** as the writing mode, from the
  same builder, with the dispositions phrased as what *would* happen.
  A test may assert the single-builder property structurally.
- `--dry-run` prints the disclosure (US-67) exactly as the writing mode
  does. *(This is the surface at which a user can read what a newer pack
  version would newly grant **before** anything is written — the
  pre-inspection `pack info` provides for `init`.)*
- **Exit classes.** `0` when the project is already at the bundled
  version and there is nothing to do. **`1` with
  `E-UPDATE-AVAILABLE`** when a newer version exists — IM-39's class 1
  covers *drift the tool found*, and `E-VERIFY-MISMATCH` is the
  precedent — so CI gates on the class without parsing prose. Class 2 and
  3 mean what they mean everywhere (IM-39). *(Recorded as arguable in
  **Q-72**, with this as the default.)*
- **`--json`** is accepted **only with `--dry-run`**. On the writing mode
  it is refused, not ignored: **`E-FLAG-NOT-PERMITTED`**, exit 1
  (IM-41) — matching `init`, which has no `--json` for the same reason
  (IM-22, F1 §11.2's *no `--json`*).
- **`--dry-run` and `--rollback` are mutually exclusive**; together they
  are `E-FLAG-NOT-PERMITTED`, exit 1.
- **`--dry-run` and `verify` answer different questions and neither may
  be offered for the other** (IM-25). `verify` asks *does this project
  still match the version it applied?*; `--dry-run` asks *is there a
  newer version, and what would it change?* A project can be perfectly
  clean under `verify` and several versions behind.
- **No flag on this command downgrades an integrity check** (IM-41).
  There is no flag that skips the `payloadDigest` check, tolerates drift
  or turns a class-2 refusal into a warning — including in `--dry-run`,
  where the temptation is strongest because nothing is being written.
- A test: run `--dry-run` in a project with a newer bundled pack,
  require exit 1 and `E-UPDATE-AVAILABLE`, then require the working tree
  and `.harness/` to be byte-identical to before the run, `.harness/lock`
  and `.harness/journal.json` included (absent before, absent after).

---

**US-64 — Refuse to update from a payload nobody vouched for**
> As a project owner, I want `update` to stop when `.harness/pack/` has
> been edited, so that it never computes what to overwrite from an input
> the project cannot vouch for.

**Acceptance criteria:**
- `update` recomputes the tree digest over `.harness/pack/` by F1 US-10's
  rule and compares it to the manifest's `payloadDigest` **before it
  renders anything and before it takes the lock**. On a mismatch it fails
  with **`E-PAYLOAD-DIGEST-MISMATCH`**, exit 2, **zero bytes**, reporting
  the recorded and the computed digests.
- **The classification is suppressed entirely.** No path is compared, no
  disposition is assigned, and the per-path report is **empty** — the
  same fail-closed suppression `verify` performs, for the same reason
  and one degree more sharply: `expected_old` is computed *from* the
  payload, so an untrusted payload yields an untrustworthy classification
  — and here that classification would drive **real writes** over the
  user's files rather than a report they could ignore.
- **This holds identically in `--dry-run`.** A read-only mode is not a
  reason to relax a fail-closed gate; it is the mode most likely to be
  run first, and a plausible-but-meaningless report is exactly what F1
  US-33 refuses.
- **The check runs in this order and no other**: journal present →
  manifest readable → answers re-validated → **digest** → everything
  else (§F3.2). A crashed previous run is therefore reported as
  `E-JOURNAL-PRESENT` and never as a digest mismatch, which matters
  because an interrupted update leaves precisely a new payload beside an
  old manifest (US-65).
- A recorded answer that fails its own declared `pattern`, `maxLength` or
  `values` is **`E-MANIFEST-ANSWER-INVALID`**, exit 2, zero bytes, and
  the classification is suppressed on the same reasoning (F1 US-8, US-15,
  US-33, C-29).
- **No flag relaxes any of the above** (IM-41, F1 §F1.9's C-10
  disposition). A test may assert it by enumerating `update`'s accepted
  flags and requiring none to reach the digest branch.
- The residual is stated rather than hidden, and it is F1's known limit
  7, inherited unchanged: a **pure line-ending edit** of the payload does
  not move the digest, because the digest is over normalized content. It
  is harmless to `update` for the same reason it is harmless to `verify`
  — the comparison is over normalized content too — so such a payload
  produces the same classification a byte-identical one would.
- A test: change one character in one payload file, run `update` and
  `update --dry-run`, and require exit 2, the digest code, **zero**
  per-path rows and zero bytes written, from both.

---

**US-65 — Replace the payload and rewrite the manifest, in one committed step**
> As a project owner, I want `.harness/` to end an update describing
> exactly what my project now has, so that the next `verify` tells the
> truth and the next `update` computes from the right base.

**Acceptance criteria:**
- A successful `update` **replaces `.harness/pack/` with the newer
  payload in full**: files added, files whose bytes changed rewritten,
  and **files the newer pack no longer ships deleted** (US-68's payload
  half). Phase 1's contract is unchanged from F1 US-30 and C-26 — a
  verbatim copy, every file `0644`, every directory `0755`, no source
  mode read, no normalization.
- A successful `update` **rewrites `.harness/manifest.json`**, changing
  exactly three things: `pack.version` to the bundled pack's version,
  `payloadDigest` to the digest over the **newly planned** payload set,
  and `cli` to the running CLI's version. `manifestVersion`,
  `pack.name`, `pack.formatVersion`, `parameters` and `scaffolds` are
  carried through **unchanged**, and unknown keys found within the same
  `manifestVersion` are **preserved verbatim** (F1 US-15's forward
  compatibility). **No key is added and none is removed** (G-F3-6).
- Re-serialization obeys F1 US-10 byte for byte: 2-space indent, `\n`
  endings, F1 §F1.4's key order, `parameters` in declared parameter
  order, `scaffolds` in declared order.
- **The ordering is fixed and is part of the contract**: plan everything
  → lock → journal → **phase 1 (payload)** → **phase 2 (applied paths)**
  → **manifest** → drop the journal and the lock. It mirrors F1 §F1.6
  step for step, and the manifest is the **last write** of the run.
- **The invariant, stated once because everything in US-66 rests on it:
  the manifest and the payload move together, or neither moves.** The
  manifest write is the **commit point**. Before it, the project is
  mid-update and the journal says so; after it, the project is at the new
  version and the journal is gone.
- **What happens when phase 1 succeeds and phase 2 does not** — the case
  worth naming explicitly, because it is the one a reader will ask about.
  There is **no committed intermediate state and no partial-update
  outcome**. A failure anywhere in phase 2 stops the run immediately with
  the journal in place; the on-disk state is *new payload, old manifest,
  partially replaced tree*; and that state is **not left to be reasoned
  about** — the next `lintel harness` command in the project raises
  **`E-JOURNAL-PRESENT`**, exit 2, and the single remedy is
  **`lintel harness update --rollback`**, which restores the payload and
  every applied path to their pre-update bytes (US-66).
- **Why the payload goes first, and why it does not matter to
  correctness.** Every byte phase 2 writes was rendered at plan time from
  the bundled pack (F1 C-23), so phase 2 does not read the payload and
  the two phases are order-independent. Payload-first is chosen to match
  `init`'s lifecycle exactly, so one journal shape, one rollback
  implementation and one mental model serve both writing commands.
- **`update` has no resume, deliberately.** A resumed update would have
  to recompute `expected_old` — and by the time it could run, the payload
  `expected_old` is defined over has already been replaced. Rollback then
  re-run is the only recovery, and it is complete.
- Every `.harness/` write carries **`HarnessPath`**, every applied-path
  write carries **`AppliedPath`**, and the journal, the writer and
  rollback take **`WritablePath`** and never a bare string (F1 C-14). The
  reserved-destination denylist forbids a *recipe step* any destination
  under `.harness/` absolutely (F1 C-5); `update`'s payload writes are
  not recipe steps and are confined by construction, exactly as `init`'s
  are.
- A test: apply `coding@X`, run `update` to `coding@Y`, and require
  (a) `.harness/pack/` byte-identical to a fresh `init` of `coding@Y`'s
  payload, (b) the manifest's `payloadDigest` equal to that tree's
  digest, (c) `parameters` and `scaffolds` byte-identical to before, and
  (d) `lintel harness verify` exit `0`.

---

**US-66 — Survive an interrupted update with nothing to reason about by hand**
> As a project owner, I want a failed or killed `update` to be fully
> reversible, so that a half-finished update never becomes a manual
> repair job in a directory that already had my work in it.

**Acceptance criteria:**
- **Zero bytes before the gate.** Every check — flags, manifest, digest,
  recorded answers, the new pack's validation, both renders, the
  classification, the new manifest and the disclosure — runs **before**
  the lock is taken and **before the first write**. A failure at any
  point up to the gate writes **nothing at all** (IM-17, F1 §F1.6).
- **`update` carries `init`'s atomicity contract in full, and it binds
  harder here.** `init`'s zero-bytes promise has a fallback a user can
  reason about — the directory was empty of pack content, so *delete
  `.harness/` and start over* is always available. `update` runs in a
  directory full of the user's work, so a partial update has **no**
  such fallback. The journal is therefore not a nicety on this command;
  it is the only recovery.
- A **journal** is written and flushed before the first write, covering
  **both phases and both directions**: for every path `update` intends to
  write, F1 US-13's version-2 fields unchanged (intended hash,
  `preExisting`, pre-apply hash, pre-apply mode, `backup` under
  `.harness/journal.d/`, and created directories in creation order);
  and for every payload path `update` intends to **delete**, an entry
  recording the pre-delete hash and a backup of its bytes.
- **Deletion entries are the one thing F1's journal does not model, and
  this spec requests the amendment rather than inventing it** (§F3.6
  item 6, F3-R2): the journal moves to **version 3** — a superset of
  version 2 with a per-entry `intent` of `"write" | "delete"` — and F1's
  `E-JOURNAL-UNREADABLE` must accept `{2, 3}` instead of `{2}`.
- **`lintel harness update --rollback`** is the single recovery command
  after an interrupted update. It restores every entry by F1 US-13's
  five-case table, unchanged, extended by exactly one row for the new
  intent:

  | `intent` | `preExisting` | pre-apply hash | on-disk hash now | Rollback |
  |---|---|---|---|---|
  | write | false | — | = intended | **delete** — we created it and it is still ours |
  | write | false | — | ≠ intended | **keep**, report `W-ROLLBACK-KEPT` |
  | write | true | = intended | = intended | **leave untouched**, report as kept |
  | write | true | ≠ intended | = intended | **restore from `backup`** |
  | write | true | any | ≠ intended | **keep**, report `W-ROLLBACK-KEPT` |
  | **delete** | true | — | **absent** | **restore from `backup`** — we deleted it and nothing has taken its place |
  | **delete** | true | — | **present** | **keep**, report `W-ROLLBACK-KEPT` — something is there that this run did not put there |

- **The journal must record which command wrote it**, and
  `E-JOURNAL-PRESENT`'s remedy line must name that command — otherwise a
  crashed `update` sends the user to `lintel harness init --rollback`,
  which is the wrong command in a project that already has `.harness/`
  and would be met by `E-ALREADY-APPLIED`. Requested from F1 as F3-R3
  (§F3.6 item 6).
- **Rollback restores `.harness/pack/` too**, and that is what makes the
  invariant of US-65 recoverable rather than merely stated. After a
  successful rollback, `lintel harness verify` exits **`0`** — the
  payload, the manifest and the applied tree are the ones that were there
  before the update started.
- Each write **re-confines and creates exclusively**, re-running F1 US-3
  stage 3 immediately before it, with `E-TARGET-RACE`, exit 2, on any
  confirmation that fails (F1 US-13, C-14). A destination `update`
  expects to **exist** — every replacement — is `lstat`ed, confirmed a
  regular file, re-hashed and confirmed still equal to what the plan
  observed, before the `rename`.
- `E-WRITE-FAILED`, exit 3, on I/O failure mid-write; the journal stands
  and `update --rollback` is the remedy.
- The lock is F1 §NFR *Concurrency*'s, unchanged: `.harness/lock`, taken
  by the writing mode only, `E-LOCK-HELD` exit 1 when held,
  `W-LOCK-STALE-BROKEN` under the same three checked conditions.
  **`--dry-run` takes no lock** (US-63).
- A test: kill the process between phase 1 and phase 2 (a fault injection
  point the implementation must expose), require the next
  `lintel harness` command in that project to raise
  `E-JOURNAL-PRESENT` naming `update --rollback`, run it, and require the
  whole project — `.harness/pack/` and the manifest included — to be
  byte-identical to a snapshot taken before the update.

---

**US-67 — Be shown what a newer pack version would newly grant**
> As an adopter, I want an update to disclose the capabilities the new
> pack version brings, so that a capability I would have refused at
> `init` cannot arrive silently in a later bump.

**Acceptance criteria:**
- **`update` emits the pre-write disclosure**, in both modes, before it
  writes anything. It is built by the **same single builder** F1 US-13
  pins and `init`, `pack info` and `validate --json` already render, so
  the surfaces cannot disagree. F1 US-13's four rows are unchanged in
  membership and in form.
- The disclosure is computed over the **new** pack: the write set of
  `expected_new`, and the **new phase-1 payload set** (which is the
  second quantifier F1 C-39c added to the frontmatter rules, and which
  `update` always replaces in full).
- **It is complete, and never a delta.** Every row enumerates every
  member — every `0755` applied path with its payload source; every file
  the pack ships under a `hooks/` directory in **any** `.claude` tree,
  each stated plainly as inert; every applied path at which a parameter
  answer was substituted, with the parameter id and **the value
  verbatim**; and every pack-shipped `.claude/agents/*.md` with its
  **whole frontmatter block verbatim**. Never summarised, never
  truncated, never counted.
- **A second block may follow, naming which of those lines are new since
  the applied version**, derived by set difference over the identical
  line text. It is an addition after a complete block, not a replacement
  for one, and the complete block is emitted whether or not the second is
  (IM-10 permits commentary after the block, never in place of it).
- **The reason `update` discloses at all** (IM-13): a newer pack version
  can ship an agent file, an executable or a substitution the applied
  version did not. The decision an adopter made at `init` was made
  against the pack as it then was, and an update is exactly the moment
  that set can grow. `init` discloses because it writes; `update` writes
  too.
- **The disclosure gates nothing**, exactly as at `init` (IM-11, Q-54).
  Nothing pauses, nothing asks, and there is no consent input on this
  command. It is a record, not a decision point — and the decision point
  it lacks is the one `--dry-run` supplies (US-63).
- **The skill relays it verbatim** under IM-10's rules, which bind
  wherever the CLI emits a disclosure and need no knowledge of which
  command emitted it (IM-13). The textual test applies unchanged: the
  CLI's block must appear in the skill's message as a **contiguous,
  unmodified substring**.
- **`update` closes the `pack info` seam that `interaction-model.md` §12
  records, and this is worth naming as a property rather than a
  coincidence.** `pack info` cannot carry the substitution row's values
  because no answer exists at that point. At `update` the answers are
  **recorded in the manifest**, so `update --dry-run` is the only
  read-only surface in the product that can render the answer-bearing
  half of the disclosure **in full and before any write**.
- The frontmatter rules apply unchanged to everything the new pack
  places or ships: `E-CLAUDE-TOOL-GRANT` and `E-CLAUDE-PERMISSION-MODE`,
  exit 2, zero bytes, over the write set **and** the phase-1 payload set,
  at **any** `.claude` segment (F1 US-3, C-32a, C-39c, C-40). A newer
  pack that has acquired a tool grant or a widening `permissionMode` is
  **refused**, not disclosed.
- A test: bump to a pack version whose agent gained `Bash`, run
  `update --dry-run`, and require the whole frontmatter block for that
  agent in the disclosure and the same line in the "new since" block.

---

**US-68 — Keep a file the newer pack no longer ships**
> As a project owner, I want a file the pack has dropped to be reported
> rather than deleted, so that an update can never remove something my
> project turned out to depend on.

**Acceptance criteria:**
- **Applied orphan — reported, never deleted.** An applied path present
  in `expected_old` and absent from `expected_new` is **`orphaned`**.
  `update` writes zero bytes to it and does **not** remove it, whatever
  its classification against `expected_old`. **F1's Q-25 default is
  confirmed, and the reasoning is recorded here because F1 deferred it
  rather than argued it:**
  - A deletion is the one action in this command that is **not
    recoverable from the report**. Every other outcome leaves the bytes
    on disk; a delete leaves a sentence.
  - *Unedited* proves the file matches what the pack **used to** write.
    It proves nothing about whether the project now depends on it — a
    link from a hand-written document, a script path, an agent
    instruction. `update` cannot see those, and F1's link check runs over
    what the apply produces, not over what the project wrote.
  - The asymmetry of effort settles it: the user deletes an orphan with
    one command; the CLI cannot un-delete one, and rollback only reaches
    as far as the run that did it.
- The `orphaned` disposition is reported with the path and the pack
  version that last shipped it. It **does not** change the exit code, and
  it is **not** a diagnostic code: it is a per-path state in the report
  and in `--json`, exactly as `differs` is for `verify`. *(F1's `W-`
  taxonomy has two classes — `defect`, author-fixable, and `notice`, a
  state the pack declared — and an orphan is honestly neither. Reporting
  it as a state rather than a warning avoids stretching a taxonomy this
  spec does not own; recorded in §F3.6 item 4.)*
- **Payload orphan — deleted, and the default is necessarily reversed
  there.** A file present in the old payload and absent from the new is
  **removed from `.harness/pack/`**. Three reasons, and the first is
  decisive:
  - `.harness/pack/` is a **verbatim copy of the pack** (Q-39, F1 US-30).
    A payload carrying a file the pack no longer ships is not a verbatim
    copy, so its tree digest would not equal the digest `update` records
    — and `verify` would then fail with `E-PAYLOAD-DIGEST-MISMATCH`
    **forever after every update**, permanently and with no remedy short
    of a fresh `init`.
  - It is not the user's file. It is one of the five things the CLI
    writes under `.harness/` (F1 §F1.6), carries `HarnessPath`, and no
    recipe step may write there at all (F1 C-5).
  - It is journalled with a backup and restored by `update --rollback`
    (US-66), so the deletion is reversible for the life of the run.
- **A user-added file under `.harness/pack/` cannot reach this branch.**
  It would already have moved the tree digest, so US-64's fail-closed
  gate refuses the run before anything is planned. The case is closed by
  an earlier rule rather than handled by this one.
- A test: bump to a pack version that drops one payload file which the
  recipe copied out, and require (a) the applied path still present on
  disk and reported `orphaned`, (b) the payload file gone from
  `.harness/pack/`, (c) `verify` exit `0` afterwards, and (d)
  `update --rollback` — from an injected mid-run failure — restoring
  both.

---

**US-69 — Be stopped when the newer pack needs something this project never gave**
> As a project owner, I want an update that cannot be computed from what
> my manifest records to be refused outright, so that `update` never
> guesses an answer or quietly drops a scaffold.

**Acceptance criteria:**
- A parameter the **new** pack declares as `required` with **no
  `default`**, for which the manifest holds no recorded answer, fails the
  run: **`E-UPDATE-PARAM-UNANSWERED`**, exit **2**, **zero bytes**,
  naming the parameter, its prompt and the pack version that introduced
  it. *(Requested from F1 as F3-R1, §F3.6.)*
- **It is class 2, not class 1, and the distinction is the point.** Class
  1 means *you can fix this* (IM-39), and the user **cannot**: Q-21 and
  Q-22 forbid supplying or changing an answer after the apply, and there
  is no `--set` on this command. The thing that is wrong is that the pack
  introduced an unanswerable parameter across a version boundary — an
  authoring fault, which is what class 2 names. The remedy line addresses
  the pack author: give the new parameter a `default`.
- A new parameter that declares a `default` is **not** a fault. Its
  default is used for `expected_new`, and it is **recorded into the
  rewritten manifest** so the project's `parameters` remain a complete
  record of every declared parameter (F1 US-10). *(This is the only case
  in which `update` adds an entry to `parameters`, and it adds no key to
  the manifest schema.)*
- A parameter the new pack **no longer declares** has its recorded answer
  **dropped** from the rewritten manifest, silently. It selects nothing
  and renders nothing; keeping it would leave the manifest recording an
  answer to a question the pack no longer asks.
- A **scaffold the manifest records as selected that the new pack no
  longer declares** fails the run: **`E-UPDATE-SCAFFOLD-DROPPED`**, exit
  **2**, **zero bytes**, naming the scaffold and the pack version that
  dropped it. *(Requested from F1 as F3-R1.)* Class 2 for the same reason
  — the user cannot re-select a scaffold that does not exist, and
  computing `expected_new` without it would silently orphan every path
  that scaffold produced.
- A scaffold the new pack declares and the project did **not** select
  stays unselected. `update` never adds a scaffold.
- The new pack is validated by F1 US-16 checks **1–10** before the plan
  and checks **11–14** inside it, over the **one combination the recorded
  answers select** — `init`'s scoping, not `validate`'s combinatorial
  sweep (F1 §F1.6). Any failure is exit 2, **zero bytes**.
- `W-FOLDER-README-MISSING` and every other `defect`-class warning
  raised during an update **prints and leaves the exit code alone**:
  `update` has no `--strict`, exactly as `init` has none (IM-22).
- A test per branch: a new required parameter without a default → exit 2,
  zero bytes; the same parameter with a default → exit 0 and the default
  recorded in the manifest; a dropped selected scaffold → exit 2, zero
  bytes.

---

**US-70 — Be told plainly when there is nothing to update to**
> As a project owner, I want `update` to tell me clearly when I am
> already current or when my CLI is behind, rather than doing something
> surprising.

**Acceptance criteria:**
- **Bundled version equals recorded version.** Exit **`0`**, **zero
  bytes**, in both modes, with a message naming the pack and the version.
  No code is raised — nothing is wrong and nothing is expected to change.
- **Bundled version is newer than recorded.** The run proceeds
  (writing mode) or reports (US-63).
- **Bundled version is *older* than recorded.** The run is refused:
  **`E-UPDATE-NOT-NEWER`**, exit **1**, **zero bytes**, in both modes,
  naming both versions, with the remedy
  `→ npm i -g @linteldk/cli@latest`. *(Requested from F1 as F3-R1.)*
  `update` moves a project to a **newer** version (Q-62); writing an
  older pack over a newer project is a downgrade, and a downgrade that
  replaced unedited paths would be indistinguishable in the report from
  an upgrade that did.
  This is the same skew F1's existing **`W-PACK-NEWER-THAN-CLI`**
  describes for `verify`, where it is correctly a warning because
  `verify` reads only `.harness/pack/` and still works. On `update` the
  bundle is an **input to a write**, so the same skew is fatal — one
  fault, two occasions, **two codes**, which is F1 §Error States'
  own rule (*severity is a property of the code, not of the occasion*).
- **Comparison is by the pack's declared semver** (Q-3), read from the
  bundled `pack.json` and the manifest's `pack.version`. The **CLI**
  version is not part of the comparison: `cli` is recorded, not compared,
  and a CLI upgrade that ships the same pack version is a no-op here.
  *(A CLI upgrade that changes what a primitive renders at the same pack
  version is **out of scope** and shows up as `verify` drift — recorded
  as **Q-73**.)*
- `W-MANIFEST-NEWER-CLI` (a manifest written by a newer CLI at the same
  `manifestVersion`) is a warning and `update` proceeds, unchanged from
  F1 US-15. `E-MANIFEST-NEWER` is exit 2 and never a warning.
- A test per branch, each asserting the exit class and **zero bytes**.

---

**US-71 — Read the update report from a machine**
> As a CI job, I want the classification as structured data so that I can
> gate on it without parsing prose.

**Acceptance criteria:**
- `lintel harness update --dry-run --json` emits a structured report
  carrying: the recorded pack name and version, the bundled version, the
  digest result (recorded, computed, and whether they matched), the
  per-path entries and the counts **per disposition**.
- **Every per-path entry carries its `disposition`**, valued exactly
  `"added"`, `"replaced"`, `"unchanged"`, `"kept-edited"`,
  `"kept-adapted"` or `"orphaned"` — the closed six of §F3.3 — and, for
  every `kept-*` entry, whether `expected_new` differs from
  `expected_old` at that path.
- **Every entry also carries the `state` it classified as against
  `expected_old`** — `"match"`, `"adapted"`, `"differs"` or `"missing"`,
  F1 US-33's closed four, verbatim — so a consumer can see the input to
  the disposition as well as the disposition. **`state` and `disposition`
  are different axes and neither is derivable from the other alone**:
  `state` is what the comparison found, `disposition` is what `update`
  did or would do about it, and the mapping depends on `expected_new` too
  (§F3.3). `class`, on `W-` findings, remains F1's third axis (Q-60).
- A consumer gates on `disposition` and on the **exit class** without
  reading a message. A suppressed classification (US-64) is
  distinguishable from a classification that found nothing: the digest
  result says which.
- The structure is emitted from the **same builder** as the human report.
  A test may assert the single-builder property structurally, and may
  assert that a run with one adapted path and one edited path emits
  exactly one `"kept-adapted"` and one `"kept-edited"` entry.
- **There is no `--json` on the writing mode** (US-63): a machine that
  wants the plan runs `--dry-run --json` first, which is also the mode
  in which reading it can change nothing.

---

**US-72 — Hand the edited paths over cleanly**
> As the skill, I want the CLI to end an update with an unambiguous,
> complete statement of what is outstanding, so that I can reconcile with
> the user without recomputing anything the CLI already knows.

**Acceptance criteria:**
- On a successful update the CLI's final report states, without
  paraphrase: what was replaced, what was added, what was left and why —
  `kept-edited` or `kept-adapted` — and what is `orphaned`. This is the
  complete handover; the skill needs nothing else and computes nothing
  else (IM-5).
- **The CLI does not decide, recommend, rank or characterise** at a
  handed-over path. It reports the two facts only a recomputation knows:
  *you changed this* and *the pack changed this too, or did not*.
- **The skill may not re-derive the classification.** IM-5 forbids it
  computing for itself which paths an update should replace; the
  disposition in the report is the answer, and the skill relays counts
  and codes as emitted (IM-6).
- **After the reconciliation, `lintel harness verify` exits `0`** with
  the adapt-expected paths reported `adapted` and **no** path reported
  `differs` (IM-34, IM-9). That is the acceptance test for the seam and
  it is asserted from the far side of the skill's work, not from
  `update`'s.
- **`update` reserves no capability for the agent.** Its behaviour, its
  report and its exit codes are identical whether it was invoked by the
  skill or typed by a person; the standalone user reconciles by hand
  against the same report (IM-29). A test may assert byte-identical
  output across the two invocations.
- **On a non-zero exit the skill writes nothing and does not begin its
  judgment work** (IM-7). This is what keeps the zero-bytes guarantee a
  property the *user* observes: a run that wrote nothing must not be
  followed by an agent that helpfully writes something.
- The report names the **pack version moved from and to**, so the skill's
  first sentence to the user can be a fact rather than a recollection.

---

## Error States

**F1 §Error States is the product's only message catalogue.** This
section is in two halves: the codes `update` **raises, all of them
F1's**, cited and not restated; and the rows F3 **needs and F1 does not
have**, which are **requested, not invented** — following F1's own
precedent for known limit 16, that a code invented ahead of the change
that adds it to the catalogue is a declaration nothing checks.

### Codes `update` raises — every one already in F1's catalogue

| Scenario | Code and behaviour |
|---|---|
| No manifest — nothing applied | `E-MANIFEST-MISSING`, exit 1, zero bytes. Names `lintel harness init` (F1 US-15) |
| Manifest unparseable or schema-invalid | `E-MANIFEST-CORRUPT`, exit 2, zero bytes |
| A key declared twice in the manifest | `E-JSON-DUPLICATE-KEY`, exit 2, zero bytes (F1 US-15, C-25) |
| `manifestVersion` newer than this CLI reads | `E-MANIFEST-NEWER`, exit 2, zero bytes. Never a warning |
| A recorded answer fails its own declaration | `E-MANIFEST-ANSWER-INVALID`, exit 2, zero bytes, classification suppressed (US-64) |
| `.harness/pack/` does not hash to `payloadDigest` | `E-PAYLOAD-DIGEST-MISMATCH`, exit 2, zero bytes, classification suppressed and per-path report empty, **both modes** (US-64) |
| Manifest written by a newer CLI, same `manifestVersion` | `W-MANIFEST-NEWER-CLI`, warning, proceeds |
| A previous run of either writing command crashed | `E-JOURNAL-PRESENT`, exit 2 — **see F3-R3 for the remedy line** |
| Journal declares an unreadable version | `E-JOURNAL-UNREADABLE`, exit 2 — **see F3-R2** |
| Another command holds the project lock | `E-LOCK-HELD`, exit 1. `--dry-run` never takes one |
| A stale lock was broken under all three conditions | `W-LOCK-STALE-BROKEN`, warning |
| The new pack needs a newer CLI | `E-PACK-CLI-TOO-OLD`, exit 1, zero bytes |
| The new pack's `formatVersion` is newer | `E-PACK-FORMAT-NEWER`, exit 2, zero bytes |
| The new recipe's `formatVersion` is newer | `E-RECIPE-FORMAT-NEWER`, exit 2, zero bytes (C-24) |
| The new pack fails any US-16 check 1–10 | That check's own code, exit 2, zero bytes |
| The new pack's render fails checks 11–14 | `E-SUBST-UNRESOLVED`, `E-SUBST-NEWLINE`, `E-ANCHOR-INVALID`, exit 2, zero bytes |
| The new pack places or ships a permission-bearing frontmatter key | `E-CLAUDE-TOOL-GRANT`, exit 2, zero bytes (US-67) |
| The new pack declares a widening or unrecognised `permissionMode` | `E-CLAUDE-PERMISSION-MODE`, exit 2, zero bytes (US-67) |
| The new pack ships an inert `.claude/hooks/` script | `W-HOOK-SCRIPT-INERT`, class `notice`, disclosed (US-67) |
| A folder the update creates gets no README | `W-FOLDER-README-MISSING`, class `defect`, **prints and does not change the exit code** — no `--strict` on `update` (US-69, IM-22) |
| A destination changed between plan and write | `E-TARGET-RACE`, exit 2; the journal stands, `update --rollback` is the remedy |
| I/O failure mid-write | `E-WRITE-FAILED`, exit 3; the journal stands |
| Rollback declined to touch a path | `W-ROLLBACK-KEPT`, class `notice` (US-66) |
| The project scan met a symlink | `W-SCAN-SYMLINK-SKIPPED`, class `notice` |
| A walk exceeded depth 32 or 10,000 entries | `E-TRAVERSAL-LIMIT`, exit 2 |
| `--json` on the writing mode; `--dry-run` with `--rollback` | `E-FLAG-NOT-PERMITTED`, exit 1 (IM-41) |
| A flag no command recognises | `E-CLI-UNKNOWN-FLAG`, exit 1 |
| A positional given to `update` | `E-CLI-ARG-UNEXPECTED`, exit 1 (US-59) |
| `lintel harness status` | `E-CLI-UNKNOWN-COMMAND`, exit 1, listing the six commands. **There is no `status` command** (US-63) |

### Codes F3 needs and F1 does not have — **requested, not invented**

None of the four is added by this spec. Each is stated with the exit
class, the message shape and the reasoning F1 needs to add the row; the
change belongs in F1, because F1 owns the only catalogue. **Recorded as
F3-R1** in §F3.6.

| Requested code | Exit | Shape and reasoning |
|---|---|---|
| **`E-UPDATE-AVAILABLE`** | **1** | Raised by **`--dry-run` only**, when the bundled version is newer. `lintel: {pack}@{recorded} is applied; {bundled} is available.` / `  {n} files would be replaced, {m} left for you.` / `  → lintel harness update` — class 1 on IM-39's *drift the tool found*, with `E-VERIFY-MISMATCH` as the precedent. In the writing mode the same condition is not a fault; **one code, one occasion**, which is what F1's severity rule requires |
| **`E-UPDATE-NOT-NEWER`** | **1** | The bundled pack is **older** than the applied one (US-70). `lintel: this project has {pack}@{recorded}; the {pack} bundled with lintel {cliVersion} is {bundled}.` / `  update moves a project forward, not back.` / `  → npm i -g @linteldk/cli@latest` — distinct from `W-PACK-NEWER-THAN-CLI`, which is the same skew where it is **not** fatal (`verify`), and F1's rule is two codes rather than one code with two severities |
| **`E-UPDATE-PARAM-UNANSWERED`** | **2** | The new pack declares a `required` parameter with no `default` for which the manifest holds no answer (US-69). `lintel: {pack}@{bundled} requires the parameter "{id}", which this project never answered.` / `  {prompt}` / `  An answer cannot be supplied after the apply.` / `  → The pack must give "{id}" a default before it can be updated into.` Class 2 because the user cannot fix it and the pack author can |
| **`E-UPDATE-SCAFFOLD-DROPPED`** | **2** | The manifest records a selected scaffold the new pack no longer declares (US-69). `lintel: this project selected the scaffold "{id}", which {pack}@{bundled} no longer declares.` / `  Computing the update would orphan every path it produced.` / `  → Stay on {recorded}, or re-apply into a fresh directory.` Class 2 for the same reason |

### Non-code outcomes — states, not diagnostics

| Scenario | Expected behaviour |
|---|---|
| Already at the bundled version | Exit **0**, zero bytes, both modes. A message naming pack and version. **No code** — nothing is wrong and nothing is expected to change (US-70) |
| A path was replaced | Reported with disposition `replaced`. **No code, no prompt, no marker** (US-60) |
| A path was left because the user edited it | Reported with disposition `kept-edited`. **No code.** Exit **0** in the writing mode. Never presented as a conflict, a failure or a loss (US-61, IM-30) |
| A path was left because the pack declared it adapt-expected | Reported with disposition `kept-adapted`. **No code** (US-62) |
| The newer pack no longer ships a file | Reported with disposition `orphaned`, never deleted from the project. **No code** — F1's `W-` taxonomy has two classes and an orphan is honestly neither (US-68) |
| The newer pack no longer ships a **payload** file | Deleted from `.harness/pack/`, journalled with a backup. **No code** (US-68) |

---

## Non-Functional Requirements

- **No network.** `update` makes **no** network request, in either mode.
  "Newer" means the pack bundled in the installed `@linteldk/cli` (Q-2), so
  a newer version is obtained by upgrading the package and **never over
  the wire**. F1 §NFR *No network* already names `update` in its
  enumeration as of Q-62 and quantifies over **every v1.0 command**; this
  spec joins that list rather than qualifying it.
- **Offline privacy.** Nothing about a project, its parameter answers or
  its classification leaves the machine. No telemetry.
- **Determinism.** `update` is a pure function of (local payload, bundled
  payload, recorded answers, recorded scaffolds, the project's current
  bytes). No timestamps, no ordering dependence, no environment reads.
  Two `update` runs from the same applied version to the same bundled
  version, over identical project bytes, produce **byte-identical trees
  and byte-identical manifests** (G-F3-8).
- **Latency.** On a pack of ≤ 500 files totalling ≤ 8 MB, on a 2020
  laptop-class machine with a warm cache: `update --dry-run` completes in
  **≤ 2.0 s** — two renders plus one project scan plus one payload
  digest, i.e. `verify`'s ≤ 1.0 s budget plus one further render — and a
  full `update` in **≤ 4.0 s** excluding time spent waiting for a human.
- **Memory and size bounds.** **Two** rendered output sets are held in
  memory concurrently (`expected_old` and `expected_new`), so peak RSS is
  bounded at **≤ 8× total rendered content** — twice `init`'s 4×. F1's
  per-file 4 MB and per-payload 32 MB limits are unchanged and bound both
  sides.
- **Journal backup bound.** `update --rollback` must be able to restore
  the whole payload, so `.harness/journal.d/` may hold up to one backup
  per changed or deleted payload file plus one per replaced applied path
  — bounded above by F1's 32 MB payload limit plus the rendered output
  set, and freed when the manifest lands.
- **Atomicity.** Validate-then-write across both phases. No byte is
  written until every check on both renders and the classification has
  passed. Each file is written write-temp-then-rename, so a concurrent
  reader never sees a partial file. The journal precedes the first write
  and is removed only after the manifest lands (US-65, US-66).
- **Rollback safety.** Inherited verbatim from F1 §NFR: rollback deletes
  only paths this run created, restores only paths this run overwrote or
  deleted, and acts on neither unless the on-disk bytes are still exactly
  what this run left. Created directories are removed in reverse creation
  order and only when empty; a directory holding an unrecorded file is
  never removed.
- **Concurrency.** The writing mode takes `.harness/lock` under F1's
  rules unchanged. **`--dry-run` takes no lock**, because it writes
  nothing (IM-38).
- **Cross-platform.** Identical results on macOS, Linux and Windows,
  modulo the executable bit, which Windows does not represent and which
  `update` does not compare there — the report says so rather than
  implying a check ran. All step-vs-existing-file comparisons resolve by
  **`collisionKey`** — NFC-normalized then case-folded — on every
  platform unconditionally (F1 N-5, C-20).
- **Filesystem safety.** The project root is resolved once per run with
  `realpath()`; every applied path is judged against the resolved root;
  F1 US-3's four-stage confinement gate is re-run immediately before each
  write (F1 C-4, C-14).
- **Bounded capability.** `update` grants nothing `init` does not.
  Reserved destinations, the executable rules and the `.claude`
  frontmatter rules apply to the new pack exactly as they apply at
  `init`, over the write set **and** the phase-1 payload set (F1 US-3,
  C-31, C-39, C-40, C-41). A newer pack that has acquired a forbidden
  destination or a permission-bearing frontmatter key is **refused**
  (US-67), not applied with a warning.
- **Legibility (G6).** The report is readable without a tool. Paths are
  listed one per line, two-space indented, grouped by disposition, with a
  count per group.

---

## Flows / Behaviour

### F3.1 — The two recomputations

```
payload_ok    = treeDigest( .harness/pack/ ) == manifest.payloadDigest   ← FIRST, fail-closed

expected_old  = phase2( payload   = .harness/pack/ ,
                        recipe    = .harness/pack/<pack.recipe> ,
                        answers   = manifest.parameters ,
                        scaffolds = manifest.scaffolds )

expected_new  = phase2( payload   = <bundled pack> ,
                        recipe    = <bundled pack>/<pack.recipe> ,
                        answers   = manifest.parameters ,     ← the SAME answers
                        scaffolds = manifest.scaffolds )      ← the SAME scaffolds
```

The first two lines are F1 §F1.8 verbatim. The third is the same
identity with one argument changed — the payload — which is the whole of
what an update is. **Nothing on either right-hand side is a cache, a
stored base or a remote fetch**, and `expected_old` is evaluated by the
same code path `verify` uses.

`payload_ok` is evaluated **first**, and both renders happen **only if it
holds** (US-64). Once the payload is untrusted, `expected_old` is
meaningless — and here a meaningless `expected_old` would classify real
files and drive real writes over them.

### F3.2 — Update lifecycle, including failure

```
  lintel harness update [--dry-run [--json]]
  lintel harness update --rollback
   │
   ├─ 1. journal present in .harness/ ?   → E-JOURNAL-PRESENT, exit 2  (F3-R3: remedy names the writing command)
   ├─ 2. manifest readable ?              → E-MANIFEST-MISSING 1 | -CORRUPT 2 | -NEWER 2 | E-JSON-DUPLICATE-KEY 2
   ├─ 3. re-validate every recorded answer→ E-MANIFEST-ANSWER-INVALID, exit 2         ZERO bytes
   ├─ 4. payloadDigest over .harness/pack/→ E-PAYLOAD-DIGEST-MISMATCH, exit 2         ZERO bytes
   │        └─ classification SUPPRESSED, per-path report EMPTY, both modes
   ├─ 5. resolve the bundled pack BY THE RECORDED NAME
   │        └─ minCliVersion / formatVersion / recipe formatVersion → exit 1 or 2
   │        └─ bundled == recorded → "up to date", exit 0            ZERO bytes
   │        └─ bundled <  recorded → E-UPDATE-NOT-NEWER, exit 1      ZERO bytes
   ├─ 6. validate the bundled pack, US-16 checks 1–10                → exit 2, ZERO bytes
   ├─ 7. resolve the project root ONCE with realpath
   ├─ 8. PLAN — the ONLY read of the bundled pack, and the last read of anything
   │        render expected_old  (local payload  + recipe + recorded answers)
   │        render expected_new  (bundled payload + recipe + THE SAME answers)
   │          └─ new required parameter, no default → E-UPDATE-PARAM-UNANSWERED, exit 2
   │          └─ selected scaffold no longer declared → E-UPDATE-SCAFFOLD-DROPPED, exit 2
   │        US-16 checks 11–14 over the ONE combination the recorded answers select
   │        scan the project (bounded walk, C-17) and CLASSIFY every path
   │        build the new manifest, the disclosure and the report
   │        every planned write carries WritablePath
   │        └─ any failure → exit 1 or 2, ZERO bytes
   ├─ 9. PRINT the disclosure, complete and verbatim (US-67)
   │
   ├── --dry-run ? → PRINT the report and STOP.  No lock, no journal, ZERO bytes.
   │                 exit 0 if nothing to do, 1 with E-UPDATE-AVAILABLE otherwise
   │
   ├─ 10. take .harness/lock                    (E-LOCK-HELD | W-LOCK-STALE-BROKEN)
   ├─ 11. write .harness/journal.json  (v3: intent write|delete, both phases, both
   │        directions, backups under .harness/journal.d/, createdDirs)
   ├─ 12. PHASE 1 — replace .harness/pack/ with the new payload:
   │        write added and changed files 0644, dirs 0755, DELETE payload orphans
   ├─ 13. PHASE 2 — write ONLY the paths whose disposition is `added` or `replaced`,
   │        from the bytes rendered at step 8; NO read of anything
   │        each write: re-confine → exclusive create / re-hash → rename
   │        └─ target moved in the window → E-TARGET-RACE, exit 2
   │        └─ I/O failure → E-WRITE-FAILED, exit 3, journal remains
   ├─ 14. write .harness/manifest.json   ← version, payloadDigest, cli.  THE COMMIT POINT
   └─ 15. delete .harness/journal.json and .harness/journal.d/, release the lock
          PRINT the report.  exit 0.
```

**The gate is between step 9 and step 10, and everything before it writes
zero bytes.** That is `init`'s shape (F1 §F1.6) with the steps that make
no sense for an update removed and the classification added. There is
**no consent gate** at either command (Q-54); if a v1.1 reinstates one it
goes **between the plan and the lock** here too, for the same reason.

**Steps 12–14 are the only window in which anything is written**, and
**step 14 is the commit point**. The three states a crash can leave:

| Crash between | On-disk state | What the next command does |
|---|---|---|
| 11 and 12 | Journal only; nothing else moved | `E-JOURNAL-PRESENT` → `update --rollback` removes the journal and `.harness/journal.d/` |
| 12 and 13 | **New payload, old manifest, old applied tree** | `E-JOURNAL-PRESENT` → rollback **restores the payload** from backups and the project is exactly as it was |
| 13 and 14 | New payload, old manifest, partly replaced tree | `E-JOURNAL-PRESENT` → rollback restores payload **and** every replaced path |

The middle row is the case worth stating plainly: **an update that
completes phase 1 and fails phase 2 is not a partial update, it is a
crashed one.** Its state is loud rather than silent — `E-JOURNAL-PRESENT`
fires on the next `lintel harness` command in that project, ahead of the
digest check (step 1 precedes step 4), so the user never meets the
`E-PAYLOAD-DIGEST-MISMATCH` that the new-payload/old-manifest pairing
would otherwise produce. And **there is no resume**: a resumed update
would need to recompute `expected_old` from a payload that has already
been replaced. Rollback, then re-run.

### F3.3 — Classification and disposition

Classification uses **`verify`'s closed six states** (F1 US-33, Q-79),
applied against `expected_old` and computed by the same implementation.
Disposition is what `update` does about it, and depends on `expected_new`
as well. **Six dispositions, and the enumeration is closed.**

**`filled` and `unfilled` do not reach the disposition table, and that
is a prohibition rather than an omission** (Q-79, F1 US-31). A path in
the **fill-expected set** — `project-brief.md` in every pack,
`writing`'s voice guide — is **never overwritten by `update`**, in
either state, under any flag, and whether or not the newer pack changed
the file. F1 states the rule because it is a property of the
declaration; F3 states what happens instead: the path is **reported and
left**, in the same place in the report as an edited path, with the
reason given as *shipped to be filled in* rather than *edited*. **The
prohibition is unconditional deliberately**: an unfilled brief and a
filled one are indistinguishable to a rule that has to be right before
it looks, and the two errors are not symmetric — over-applying it leaves
a user with a stale template they can see and delete, while
under-applying it silently destroys the document every other document in
the project is downstream of.

| In `expected_old` | In `expected_new` | State vs `expected_old` | Disposition | `update` writes |
|---|---|---|---|---|
| no | yes | — (nothing on disk) | **`added`** | the new content, exclusive create |
| no | yes | — (something on disk) | **`kept-edited`** | nothing |
| yes | yes | `match`, and new ≠ old | **`replaced`** | the new content |
| yes | yes | `match`, and new = old | **`unchanged`** | nothing |
| yes | yes | `adapted` | **`kept-adapted`** | nothing |
| yes | yes | `differs` or `missing` | **`kept-edited`** | nothing |
| yes | yes | `filled` or `unfilled` | **`kept-fill-expected`** | nothing — **ever** |
| yes | **no** | any | **`orphaned`** | nothing |

**Seven dispositions as of v1.1**, and the enumeration is closed.
`kept-fill-expected` (Q-79) is the addition; the other six predate it and
were **re-confirmed against a challenge** — see the change history.

Four readings of the table are worth stating rather than inferring:

- **`kept-fill-expected` outranks every state, including `unfilled`.** A
  fill-expected path is left alone whether or not the user has touched
  it, so it never reaches the `match`/`differs` branches at all. This is
  the one disposition decided entirely by a **declaration** rather than
  partly by the bytes on disk.

- **`adapted` governs by declaration, not by current bytes** (US-62). A
  path in the adapt-expected set of **either** recipe is `kept-adapted`
  even where `verify` would call it `match`, because `update` is deciding
  whether to overwrite the file the skill is expected to rewrite.
- **A `missing` file is `kept-edited`, not re-created** (US-61). Deleting
  a generated file is an edit.
- **`orphaned` outranks everything** (US-68) — a path the newer pack does
  not produce has no new content to write, whatever it looks like now.
  The row applies to **applied** paths. Inside `.harness/pack/`, the
  payload orphan is **deleted**, for the reasons US-68 states.

### F3.4 — What the skill does next, and what it may not do

The CLI ends with `kept-edited`, `kept-adapted` and `orphaned` paths
outstanding. That is the only place in the product where a command
finishes with work handed over rather than done or failed, and the
handover is governed by `interaction-model.md`, not by this spec:
IM-31 (one path at a time, conversationally), IM-32 (the skill may
recommend, never decide), IM-33 (show both sides as content, never as a
summary of content), IM-34 (write only what the user decided, and
nothing else). This spec fixes only the CLI's half (US-72): a complete,
unranked, uncharacterised report, identical whether a person or the skill
invoked the command.

**The standalone user gets the same report and reconciles by hand.** No
capability is reserved for the agent (IM-29).

### F3.5 — What `update` cannot do, stated where a reader will ask

- **Nothing goes back to the pack.** An improvement made in a project
  reaches `packs/<name>/` only by editing it by hand and bumping the
  pack version; then `update` carries it to the *other* projects. The CLI
  will not diff a project against the pack for promotion, and the skill
  will not simulate it (IM-5, IM-36). `contribute` is v1.1, F4.
- **`update`'s report is nonetheless exactly the set a `contribute`
  would propose** — the same recomputation pointed the other way. Reading
  it and deciding what deserves promotion is **manual work at v1.0**, and
  that is the honest answer to *"then how do I even find what I
  changed?"*.
- **An answer cannot be changed** (Q-21), a **scaffold cannot be added or
  dropped** (Q-22), and a **pack cannot be swapped** (Q-12). `update`
  recomputes from what the manifest records.
- **A region-aware merge is not deferred machinery here.** The anchors
  stay inert (Q-45); `update` classifies by recomputation and needs no
  parser. A v1.1 that wants one inherits F1 §F1.9 obligation 7: restore
  C-9's marker-lex check **in the same change** that first reads an
  anchor.

### F3.6 — The six open items, decided

`LintelHarnessSpecification-1.0.md` §Feature 3 records these as *"open
items inside a settled shape, not open questions — none of them is a
Q"*. They are decided here, with the reasoning, and **no `Q-` id is
consumed by any of them**.

| # | Item | Decision | Why |
|---|---|---|---|
| 1 | Does `update` emit a disclosure? | **Yes, complete and verbatim, in both modes**, from F1 US-13's single builder, computed over the new write set and the new phase-1 payload set. Optionally followed by a *new since {applied version}* block derived by set difference — never in place of the complete one (US-67) | A newer pack version can ship an agent file, an executable or a substitution the applied version did not (IM-13). The adopter's decision at `init` was made against the pack as it then was. The builder exists and is already rendered by three surfaces, so the cost is a fourth caller |
| 2 | Does `update` carry `init`'s zero-bytes / journal / rollback contract? | **In full, and it binds harder here** (US-66). Zero bytes before the gate; journal before the first write; `update --rollback` as the single recovery; the manifest last as the commit point; **no resume** | A partial update is worse than a partial apply because the directory was not empty — there is no *delete `.harness/` and start over* fallback. Anything less would make an interrupted `update` a manual repair job in a repo full of the user's work |
| 3 | Flag spelling for the read-only mode | **`--dry-run`**, with `--json` permitted only alongside it (US-63) | `--check` reads as `verify`'s question and IM-25 forbids offering one command for the other. A `status` **alias** puts the name back into `E-CLI-UNKNOWN-COMMAND`'s list and into help output, reinstating by the back door the separate command Q-62 removed. `--dry-run` is the standard spelling for *show me what this write would do*, and the read-only mode is a property of the writing command, which is exactly what Q-62 made it |
| 4 | Orphan handling | **Applied orphan: reported as `orphaned`, never deleted — F1's Q-25 default confirmed. Payload orphan: deleted from `.harness/pack/`, journalled and reversible** (US-68) | A deletion is the one outcome not recoverable from the report; *unedited* proves nothing about what the project now depends on; and the effort is asymmetric — the user deletes in one command, the CLI cannot un-delete. Inside `.harness/pack/` the default must reverse, or the payload stops being a verbatim copy and `verify` fails with `E-PAYLOAD-DIGEST-MISMATCH` after every update, permanently. Reported as a **per-path state, not a `W-` code**, because F1's two `W-` classes — `defect` and `notice` — honestly fit neither an orphan nor an edited path, and stretching a taxonomy this spec does not own is worse than using the state channel `verify` already established |
| 5 | `payloadDigest` mismatch | **Fail-closed: `E-PAYLOAD-DIGEST-MISMATCH`, exit 2, zero bytes, before the lock, classification suppressed, per-path report empty — in `--dry-run` too. No flag relaxes it** (US-64) | `expected_old` is computed *from* the payload. `verify`'s reasoning applies one degree more sharply here: an untrustworthy classification would drive **writes** rather than a report. This also discharges F1 §F1.9's v1.1 obligation 8 (*`update` checks `payloadDigest` before computing a base*) — as a check, not a migration, because the field is in every v1.0 manifest |
| 6 | The payload and the manifest | **Payload replaced in full (orphans deleted), then phase 2, then the manifest — the manifest last and the commit point. They move together or neither moves.** A phase-1 success with a phase-2 failure is **not a partial update**: it is a crashed one, reported by `E-JOURNAL-PRESENT` ahead of the digest check and undone by `update --rollback` (US-65, F3.2) | The manifest is what binds a payload to an applied tree; writing it last makes the pairing atomic in the only sense that matters. Payload-first matches `init` so one journal shape and one rollback serve both commands. No resume, because a resumed update would recompute `expected_old` from a payload already replaced |

**Requests to F1 — the only document that may change the catalogue.**
Recorded here, in the terms F1 needs, so they are folded rather than
rediscovered:

| # | Request | Why F1 and not F3 |
|---|---|---|
| **F3-R1** | Add the four rows of §Error States' second table — `E-UPDATE-AVAILABLE` (1), `E-UPDATE-NOT-NEWER` (1), `E-UPDATE-PARAM-UNANSWERED` (2), `E-UPDATE-SCAFFOLD-DROPPED` (2). The catalogue moves from **78 to 82** | F1 §Error States is the product's only message catalogue and no other spec may define a code. F1 v2.9 states this explicitly for `update`: *"any code it may need"* is F3's to identify and F1's to add |
| **F3-R2** | Widen the journal to **version 3** — version 2's fields plus a per-entry `intent` of `"write" \| "delete"` — and widen `E-JOURNAL-UNREADABLE` to accept `{2, 3}`. F1 US-13 currently makes any version but `2` an error | `update` deletes payload files (US-68), and F1's five-case rollback table models create and overwrite only. Without this, an interrupted update cannot restore a deleted payload file and G-F3-4 is unreachable |
| **F3-R3** | The journal records **which command wrote it**, and `E-JOURNAL-PRESENT`'s remedy line becomes `→ lintel harness {command} --rollback` | The row currently names `lintel harness init --rollback` unconditionally. After a crashed `update` that is the wrong command in a project that already has `.harness/`, and following it lands on `E-ALREADY-APPLIED` |
| **F3-R4** | Add **`--dry-run`** to F1 US-8's reserved CLI flag list — currently `--set, --scaffold, --json, --strict, --force, --rollback, --all` — and to `E-PARAM-FLAG-INVALID`'s `Reserved:` line | The reserved list is *the whole list*, reserved whether or not the command being run accepts it, precisely so a pack-declared alias cannot shadow a CLI flag. Without this a pack may declare `"flag": "dry-run"` and silently shadow `update`'s read-only mode. This is the same failure F1 records for `--accept-permissions` |
| **F3-R5** | Correct **§F1.9's forward-investment table**, which describes `update` as *"merging against a recomputed base"* in the `payloadDigest` row and frames the whole table as *"what it buys v1.1"* | **Wrong twice over**: `update` is v1.0, and Q-62 **builds no merge engine**. F1 v2.9 records this as knowingly unfolded and assigns the repair to F3's spec; the correct statement is *`update` classifies against a recomputed expectation and replaces the unedited; the digest gates that recomputation fail-closed*. The same wording appears in the manifest's *what each field is for* table (four consumers labelled "v1.1 `update`") and in US-32's anchor note ("v1.1's `update`") |
| **F3-R6** | Correct the three remaining statements that say `update` is deferred: **§What is NOT in scope** (*"`update`, `status` and `contribute` — deferred to v1.1 (Q-42)"* — only `contribute` is), **US-14** (*"With `update` deferred (Q-42) there is no in-place re-apply at v1.0"*), and **`E-ALREADY-APPLIED`'s message**, which prints `Re-applying is not supported in v1.0; update lands in v1.1.` | The message is user-facing and now false. Its remedy should name `lintel harness update`, which is the command the user actually wants — the same fold `interaction-model.md` §10 already makes in prose |

---

## Open Questions

Feature-specific only. Ids from F3's reserved block **Q-70 … Q-74**.

| # | Question | Owner | Default assumption |
|---|---|---|---|
| Q-70 | Who adds F3-R1's four catalogue rows — F1 in the change that reviews this spec, or F3 at implementation? And does adding them require an F1 version bump and an ADR touch, given F1 v2.9's *"the catalogue holds 78"* is asserted in three places? | architect | **F1 adds all four**, in one change, moving the count to 82 and updating every place the count is asserted. F3 defines behaviour and never a code |
| Q-71 | F3-R2 asks for journal **version 3**. Would F1 rather keep version 2 and make `intent` an additive optional field defaulting to `"write"`, so an older CLI reading a newer journal degrades to write-only rollback? | architect | **Version 3.** A version bump is honest and F1's own fail-closed rule (*a journal declaring any version other than the supported one is `E-JOURNAL-UNREADABLE`*) is what makes an unreadable journal loud. A silently degraded rollback is the failure mode the whole journal exists to prevent |
| Q-72 | Should `--dry-run` exit **1** with `E-UPDATE-AVAILABLE` when a newer version exists, or exit **0** and leave the signal to `--json` and the report? | architect / owner | **Exit 1.** IM-39's class 1 explicitly covers *drift the tool found* and `E-VERIFY-MISMATCH` is the precedent, so CI gates on the class without parsing prose. The cost is that a scheduled `update --dry-run` is red whenever a bump is available, which some readers will find noisy |
| Q-73 | A CLI upgrade that changes what a primitive renders **at the same pack version** moves `expected_new` without moving the pack version. Should `update` act on that, or is it out of scope? | architect | **Out of scope at v1.0.** `update` triggers on the pack's declared semver alone (Q-3); a render change at a fixed pack version shows up as `verify` drift and is a CLI defect to be fixed rather than a project state to be updated. Revisit if a primitive's output is ever deliberately changed within a CLI minor |
| Q-74 | Should `update` refuse, warn or gate when a large share of applied paths classify `kept-edited` — a project that has drifted so far that an update touches almost nothing? | owner | **No threshold, no gate.** Every edited path is simply left and reported; a heavily customised project gets a long report and a short list of replacements, which is the mechanism working (IM-30). A threshold would be a heuristic in the one command whose whole claim is that its decisions are computed |

---

## Resolved Decisions

| # | Question | Decision | Date |
|---|---|---|---|
| — | — | **No `Q-` id was raised and closed during the writing of this spec.** The six items `LintelHarnessSpecification-1.0.md` §Feature 3 and `interaction-model.md` §11.3 and §12 record as outstanding for F3 were recorded there as *open items inside a settled shape, not open questions*; they are decided in **§F3.6** with their reasoning, and consume no id. The shape itself is **Q-62's** and is restated, not re-litigated. Q-70…Q-74 above are new and remain open. | | 2026-09-01 |
