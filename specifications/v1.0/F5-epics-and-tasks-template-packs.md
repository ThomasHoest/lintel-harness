# Epics & Tasks: Template Packs (Lintel Harness v1.0 — Feature 5)
**Version:** 1.1
**Status:** Draft
**Date:** 2026-09-01
**References:** `F5-spec-template-packs.md` (**v3.2** — authoritative for every acceptance criterion, the three pack outlines and the ten-class difference enumeration), `F5-ADR-002-template-packs.md` (**REVISE SPEC** against v2.9 — **its findings are folded and its verdict has not been re-issued**; see the note below), `F1-spec-pack-format-and-manifest.md` (**v3.7** — the format every task here conforms to, and the 88-code catalogue), `F1-ADR-001-pack-format-and-manifest.md` (amended 2026-09-01), `specifications/general/pack-inventory.md`, `specifications/general/pack-application.md`, `CLAUDE.md`

**Amendment history**

| Version | Date | Summary |
|---|---|---|
| 1.0 | 2026-09-01 | Initial breakdown, written against F5 v3.0. Claims **E-13…E-19** and **T-1301…T-1906**. |
| 1.1 | 2026-09-01 | **Q-82 — E-17 loses most of its subject.** `coding`'s two backend scaffolds became add-ons in `addons/`, so `writing-workstream` is the only scaffold at v1.0 and **no bundled pack ships an executable**. **T-1701 is retired** (US-37 has no v1.0 subject) and **T-1703 is rewritten** (no bundled executable to assert). Both assertions move to F1's **T-1220** as fixtures. **T-1401's step counts change**: `coding` is **15 with no branches**. The retired task's id is **not reused**. |

---

## Read this before estimating anything

**This feature is unlike F1, and the difference changes what the tasks
are.** F1 is a program that does not exist yet; every task there builds
something. **F5's deliverable already exists** — all three packs ship a
`pack.json`, a `recipe.json` and a payload, and have since 2026-08-31.

So the work here is **conformance and verification**, not construction.
Most tasks are of the shape *run the check the spec has always promised,
then fix what it finds*. That has two consequences worth stating before
anyone plans against this document:

- **The fixes cannot be estimated in advance**, because nobody knows what
  the checks will report. Every `[Implementer]` task below that follows a
  check is written as *fix what it found*, deliberately, and its size is
  unknown until the check has run once.
- **Several of these checks have never been run at all.** US-24's
  migration diff is the largest — see E-15, and read its preamble before
  starting, because the honest state of that criterion is worse than the
  spec's tone suggests.

**Every task here depends on F1 shipping a `lintel harness validate`.**
There is no CLI. A check specified as `validate --all --strict` cannot be
run until E-09 of F1 is done, and the tasks say so rather than pretending
they are independently startable.

> **ADR-002's verdict is `REVISE SPEC` and has not moved.** F5 v3.0 folds
> every finding it raised, including Q-80. **A revision does not
> self-certify**: the verdict changes when a re-review says so, and until
> then this breakdown is written against a spec whose architectural
> gate is open. **T-1906 is that re-review**, and it is the last task in
> this document on purpose.

**Roles.** `[Implementer]` edits pack content under `packs/`, which is
**spec-governed work** — no incidental edits, and a defect found in an
applied copy is fixed in the pack first. `[TestWriter]` writes the checks
and fixtures. `[Architect]` is named only where a task cannot be
completed without a decision that is not yet recorded.

---

## Epic overview

| Epic | Title | Stories | Depends on |
|---|---|---|---|
| E-13 | The three pack declarations conform to the format | US-20, US-34, part of US-38 | F1 E-03 |
| E-14 | The three recipes produce what they claim | US-17, US-18, US-19, US-38 | F1 E-04, E-05, E-13 |
| E-15 | Migration and extraction fidelity — the checks nobody has run | US-24, US-25 | E-13 |
| E-16 | The pack READMEs and the reference material | US-28, US-35, US-36 | E-13 |
| E-17 | Scaffolds — one at v1.0, and what left with the other two | US-21 (part), US-37 (deferred) | F1 E-03, E-14 |
| E-18 | The two pack-content rules that ship unenforced | US-26, US-27 | E-14 |
| E-19 | The bundled-pack acceptance gate | US-20, all NFRs | every epic above, F1 E-09 |

---

## E-13 — The three pack declarations conform to the format

Every `pack.json` must satisfy F1's schema exactly: nine anatomy parts
with the three-value `status`, parameters with anchored patterns,
scaffolds with categories, a conforming `provenance`, and `folderReadme`
where a pack takes something other than the default.

**Depends on:** F1 E-03 (the schema and the loader).
**Unlocks:** everything else in this feature.

- [ ] **T-1301** `[TestWriter]` `tests/packs/declaration.test.ts` — for each
  bundled pack, assert `lintel harness validate <pack>` exits `0` with **no
  `defect`-class warning**. Assert the anatomy declares **9 of 9** parts;
  that `writing`'s parts 8 and 9 are `absent` **with a `reason`** and
  `planning`'s roles `provisional` **with a `note`**; and that every other
  part relies on the `present` default rather than restating it — the
  default is load-bearing and a test that requires it spelled out would
  make the format noisier for no gain.
  *Depends on: F1 T-0303, T-0308.*

- [ ] **T-1302** `[TestWriter]` Assert every `provenance` is **a string or
  an object whose every value is a string**, each ≤ 200 characters with no
  newline. **This test exists because all three packs failed it and only
  one failure was visible**: `coding` and `writing` declared no
  `provenance` at all — silent, because F1 has no code for absence — while
  `planning` declared one with an **array** value and a **347-character**
  note, either of which is `E-UNKNOWN-VALUE`, exit 2, zero bytes. The pack
  that had tried was the only one that would have failed the apply, and
  that asymmetry is why the absent case needs a test rather than a code.
  *Depends on: T-1301.*

- [ ] **T-1303** `[TestWriter]` Assert the parameter declarations:
  `coding` **2**, `writing` **3**, `planning` **1**, every `string`
  parameter carrying an anchored `pattern`, and **`planning` holding the
  only `when` in the product** — exactly two, both over `constraintFloor`.
  Assert it over `packs/*/recipe.json` rather than over prose. **The
  spec claimed through v2.9 that `planning` was the only pack with a
  parameter**, which was false about the pack with the fewest; this test
  is the reason that claim cannot come back.
  *Depends on: T-1301.*

- [ ] **T-1304** `[Implementer]` Fix whatever T-1301–T-1303 report, **in
  the pack**, never in an applied copy. Size unknown until the checks run.
  *Depends on: T-1301, T-1302, T-1303.*

---

## E-14 — The three recipes produce what they claim

A recipe is the contract for what an apply produces. This epic asserts
that each pack's declared steps produce the tree its §7b table and its
README both describe — and that the two declarations `verify` depends on,
`adaptExpected` and `fillExpected`, sit where the spec says.

**Depends on:** F1 E-04 (planning), E-05 (the primitives), E-13.
**Unlocks:** E-17, E-18, E-19.

- [ ] **T-1401** `[TestWriter]` `tests/packs/recipe-shape.test.ts` — assert
  the declared step counts against `recipe.json`, not against prose:
  **`coding` 15 with no branches, `writing` 8 base + 5 scaffold, `planning`
  23 base**. **`coding` has no scaffolds as of Q-82**, so all fifteen of its
  steps run on every apply and its total is unambiguous — the first pack in
  the product for which a single number describes an apply. `writing` is
  still the case where it does not.
  *Depends on: F1 T-0405.*

- [ ] **T-1402** `[TestWriter]` Assert the **adapt-expected set is exactly
  three paths** — the generated `CLAUDE.md`, one per pack — and that no
  pack declares `adaptExpected` on a `copy`, `rename`, `strip-suffix`,
  `rewrite-path` or `substitute` step.
  *Depends on: F1 T-0407, T-1401.*

- [ ] **T-1403** `[TestWriter]` Assert the **fill-expected set is exactly
  four paths**: `specifications/project-brief.md` in `coding`,
  `project-brief.md` in `writing` and `planning`, and
  `writing-guide/tone-of-voice.md` in `writing`. Assert **no step declares
  both flags** in any pack. And assert the shape that makes the fourth path
  correct: `writing`'s `strip-suffix` over `writing-guide/` is **two
  steps**, the first excluding `tone-of-voice.template.md`. **A single
  step would have marked four files fill-expected**, three of which are
  reference content complete as shipped, and `verify` would report them
  permanently `unfilled` — the exact false signal that state exists to
  give truthfully.
  *Depends on: F1 T-0410, T-1401.*

- [ ] **T-1404** `[TestWriter]` Assert the **anchor counts** each pack's
  `generate` step declares: `coding` **6**, `writing` **6**, `planning`
  **7** — **nineteen** across three templates — and that exactly three
  `generate` steps exist in the product, one per pack, each writing
  `CLAUDE.md`. US-38, Q-61.
  *Depends on: F1 T-0508, T-1401.*

- [ ] **T-1405** `[TestWriter]` Apply each pack into an empty directory and
  compare the produced tree against the §7b table **and** the README's
  produced-tree block. **Two sources, one assertion**, because they have
  drifted from the recipe independently before: `writing`'s §7b described a
  `rename` per destination for folder indexes, a mechanism the primitive
  set cannot express, while the recipe held one rename and the scaffold
  shipped twelve pre-authored `index.md` files.
  *Depends on: F1 T-1108, T-1401.*

- [ ] **T-1406** `[Implementer]` Fix what T-1401–T-1405 report. Where a
  table and a recipe disagree, **the recipe is the fact and the table is
  the claim** — fix the table unless the recipe is what is wrong.
  *Depends on: T-1401, T-1402, T-1403, T-1404, T-1405.*

---

## E-15 — Migration and extraction fidelity — the checks nobody has run

**Read this before starting.** US-24 promises a documented, re-runnable
check that diffs the shipped `coding` pack against the commit it was taken
from, with every difference falling into a declared class. **That check
has never been run.** Its class enumeration was asserted complete at five
classes and was not — Q-80 widened it to ten after ADR-002 found at least
four unadmitted kinds of difference in a diff of 38 paths.

**So the residue class (j) is currently an untested claim of exactly the
same kind class (e) was.** Widening the enumeration did not make it true;
running the check is what will. Treat a task here that reports new
differences as the check working, not as a setback.

**Depends on:** E-13.
**Unlocks:** S6's verification, and the `provenance` claims E-13 asserts.

- [ ] **T-1501** `[TestWriter]` Write the re-runnable diff as a checked-in
  script: `coding`'s payload against `template/` at the commit
  `pack.json`'s `provenance` records, and `writing`'s against
  `../AIImpactOnOrganizationsAndLeadership/` at its recorded commit. It
  must emit **one row per differing path with its assigned class**, and
  fail on any path it cannot place. Re-runnable means it takes the commit
  from `provenance` rather than from an argument, so it cannot drift from
  what the pack claims.
  *Depends on: T-1302.*

- [ ] **T-1502** `[TestWriter]` Run it, and **record the actual output** in
  the migration record — the count of differing paths per class, and the
  full list for the five classes Q-80 added, since those are the ones with
  no prior evidence. This task's deliverable is **evidence, not a pass**.
  *Depends on: T-1501.*

- [ ] **T-1503** `[Architect]` Adjudicate every path T-1502 could not
  place. Each is one of three things and the record must say which: a
  **migration bug** (fix the pack), a **further declared class** (amend
  US-24, with the same by-file discipline Q-80 imposed), or **evidence
  the enumeration approach has failed** — which is a finding about S6, not
  a paperwork problem, and belongs in an ADR rather than in a list.
  *Depends on: T-1502.*

- [ ] **T-1504** `[TestWriter]` US-25's extraction assertions for
  `writing`: zero hits in `packs/writing/` for `/Users/`, the host
  project's name and the owner's personal name outside a declared
  placeholder; no research content under the scaffold tree; the voice
  guide's sample reference converted to a placeholder.
  *Depends on: T-1501.*

- [ ] **T-1505** `[TestWriter]` Q-46 prose stripping: **zero occurrences in
  `packs/` of the five bootstrap phrases** the spec enumerates. The recipe
  encodes what that prose used to say, so a surviving instance is a
  document telling a reader to do by hand what the CLI now does.
  *Depends on: T-1501.*

- [ ] **T-1506** `[Implementer]` Fix what T-1503 adjudicated as migration
  bugs, and what T-1504–T-1505 report. In the pack.
  *Depends on: T-1503, T-1504, T-1505.*

---

## E-16 — The pack READMEs and the reference material

Each pack explains itself in one page, and the reference material a
project needs stays readable from inside the project without being copied
into it.

**Depends on:** E-13.

- [ ] **T-1601** `[TestWriter]` `tests/packs/readme.test.ts` — per pack,
  assert **≤ 160 lines**; all nine anatomy parts named; the gaps stated
  explicitly; a produced-tree block of **≤ 20 lines**; the version and
  `minCliVersion` stated; and the self-containment statement, with
  `coding` and `planning` each naming the other as the holder of the
  duplicate targets copy (Q-49). **Five criteria, and `coding`'s README met
  one of them until v3.0** — the cap — so this test earns its keep
  immediately.
  *Depends on: T-1301.*

- [ ] **T-1602** `[TestWriter]` US-35 — assert every reference a pack's
  applied content makes to pack-held material resolves to a path under
  `.harness/pack/`, and that `W-LINK-DANGLING` is not raised for any of
  them. This is the payload-aware half of F1's link check.
  *Depends on: F1 T-0908, T-1601.*

- [ ] **T-1603** `[TestWriter]` US-36 — assert no pack file instructs a
  reader to apply the pack by hand. Grep for the imperative forms the Q-46
  strip removed (`copy this folder`, `rename the template`, and the rest of
  the enumerated five) across **applied-destined content specifically**,
  not the whole payload: a pack's own `README.md` legitimately describes
  what an apply does.
  *Depends on: T-1505, T-1601.*

- [ ] **T-1604** `[Implementer]` Fix what E-16 reports.
  *Depends on: T-1601, T-1602, T-1603.*

---

## E-17 — Scaffolds — one at v1.0, and what left with the other two

**Q-82 emptied most of this epic**, and the emptying is the point rather
than a gap to fill. `coding`'s two backend scaffolds became add-ons, so
**`writing-workstream` is the only scaffold in the product** and **no
bundled pack ships an executable**. Two of this epic's three tasks had no
subject left; both assertions moved to F1's **T-1220** as fixtures, where
they are now the *sole* coverage for those rules.

**Do not restore a scaffold to a pack in order to make a test possible.**
That is the tail wagging the dog, and Q-82's whole argument is that a
backend kit does not belong inside a way of working.

**Depends on:** F1 E-03 (scaffold selection), E-14.

- ~~**T-1701**~~ **Retired (Q-82).** US-37 has **no v1.0 subject**: the two
  backends were the only pair sharing a `category`, and `writing-workstream`
  is alone in its own. The assertion lives on as **F1 T-1220(b)**, against a
  fixture pack. **The id is not reused.**

- [ ] **T-1702** `[TestWriter]` US-21, **the half that survives** — applying
  each pack with **no** scaffold produces a complete, usable project, and
  `writing --scaffold writing-workstream` adds exactly the corpus and
  workstream trees and nothing else. The backend half of US-21 defers to
  v1.1 with the add-on mechanism.
  *Depends on: T-1405.*

- [ ] **T-1703** `[TestWriter]` The executable rule, **rewritten as a
  negative** (Q-82): assert that **every applied path of every bundled pack,
  in every scaffold selection, is `0644`** — no v1.0 pack declares
  `executableRoots`, none declares `executable: true`, and none writes a
  `0755` file. Assert also that US-13's pre-write disclosure lists **zero**
  executable paths for every bundled pack, so an empty disclosure section is
  the *expected* output rather than a rendering bug someone later "fixes".
  The positive cases — an executable inside a declared root, and one outside
  it raising `E-EXEC-DEST-FORBIDDEN` — are **F1 T-1220(c) and (d)**.
  *Depends on: F1 T-0504, T-1702.*

---

## E-18 — The two pack-content rules that ship unenforced

US-26 and US-27 state rules `planning` relies on and **nothing at v1.0
enforces**: no pack may register an agent hook, so the kill-criteria guard
ships inert (`W-HOOK-SCRIPT-INERT`, a `notice`). The rules are real; the
enforcement is prose. This epic makes the *prose* checkable and records
the gap rather than closing it.

**Depends on:** E-14.

- [ ] **T-1801** `[TestWriter]` Assert the guard ships as ordinary `0644`
  content under a `.claude/hooks/` path, that `validate` emits
  **`W-HOOK-SCRIPT-INERT`** as a **`notice`**, and that `--strict` does
  **not** promote it. This is one of the two codes `planning` emits **by
  design**; a `--strict` run that could not pass because a pack ships
  content it means to ship is the failure Q-60 exists to prevent.
  *Depends on: F1 T-0906.*

- [ ] **T-1802** `[TestWriter]` US-26 and US-27 as **content** assertions,
  since they cannot be behavioural at v1.0: the bet template requires kill
  criteria and the `/bet` command's prose refuses without them; the
  absorption gate's rule text appears in `Run.md`, the target contract and
  `CLAUDE.md` **with the same wording in all three**. Assert the wording is
  identical rather than merely present — three copies that drift are worse
  than one, and this is the invariance NFR made checkable.
  *Depends on: T-1405.*

- [ ] **T-1803** `[Implementer]` Record the enforcement gap in
  `packs/planning/README.md` where a reader will meet it — part 8's row —
  rather than only in this spec. A pack whose guard does not run should say
  so on its own page.
  *Depends on: T-1801, T-1802.*

---

## E-19 — The bundled-pack acceptance gate

The gate that makes every claim above continuous rather than one-off.

**Depends on:** every epic above, and **F1 E-09** (`validate`) and **F1
E-12** (the fixture suite and CI).

- [ ] **T-1901** `[TestWriter]` `lintel harness validate --all --strict`
  exits **`0`** over all three bundled packs. **This is the gate Q-60 made
  reachable** — before the `defect`/`notice` split it could never pass,
  because two of `planning`'s findings are deliberate design decisions.
  *Depends on: F1 T-0907, T-1304, T-1406.*

- [ ] **T-1902** `[TestWriter]` US-20 — `lintel harness pack info <name>`
  renders each pack's nine parts with statuses, its parameters, its
  scaffolds and its complete step list, and the step list **matches
  `recipe.json` exactly**. G-F1-9: a reader must be able to see what an
  apply will do without running it.
  *Depends on: F1 T-0908, T-1401.*

- [ ] **T-1903** `[TestWriter]` US-34 — assert **no pack applies by any
  route other than its recipe**: no pack ships an install script, no
  `postinstall`, no executable outside a declared root, and no instruction
  to run anything. The recipe is the only way a pack reaches a project, and
  that is a security property, not a convention.
  *Depends on: T-1703, T-1603.*

- [ ] **T-1904** `[TestWriter]` The **determinism** assertion across packs:
  applying the same pack twice into two empty directories with identical
  answers and scaffolds produces byte-identical trees and byte-identical
  manifests, on macOS, Linux and Windows, modulo the executable bit.
  **✅ UNBLOCKED (U-13): GitHub Actions, three-platform matrix — the Windows leg is where the executable bit and CRLF normalization actually differ)
  *Depends on: F1 T-1218, T-1405.*

- [ ] **T-1905** `[TestWriter]` `planning`'s **isolation** NFR: switching
  `constraintFloor` changes **only** the three calibrated files and
  `calibration.md`, and no other applied path moves. The two `when` steps
  are the only conditional content in the product, so this is the one place
  a `when` bug could hide.
  *Depends on: T-1303, T-1405.*

- [ ] **T-1906** `[Architect]` **Re-issue ADR-002.** Its verdict is
  `REVISE SPEC` against F5 **v2.9**; F5 is at **v3.0** with every finding
  folded, including Q-80's widened enumeration. **A spec revision does not
  self-certify** — the verdict moves when a review says it does. The
  re-review must check the five Q-80 classes against **T-1502's actual
  output** rather than against the enumeration's own text, because the
  whole failure this ADR found was a completeness claim that had never met
  a diff. **Last task in this feature, deliberately.**
  *Depends on: T-1502, T-1503, T-1901.*

---

## Counters claimed by this document

| Counter | Claimed | Next free |
|---|---|---|
| Epic | **E-13…E-19** | **E-20** |
| Task | **T-1301…T-1906** | per epic; **T-1305**, **T-1407**, **T-1507**, **T-1605**, **T-1704**, **T-1804**, **T-1907** |
| Story | none — F5's stories are US-17…US-21, US-24…US-28, US-34…US-38 | **US-99** |
| Question | none opened | **Q-82** |
| Error code | none invented — F1's catalogue is the only one, and it holds **88** | — |
