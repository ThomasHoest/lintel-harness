# Pack Format & Manifest Specification — Lintel Harness v1.0
**Version:** 2.0
**Status:** Draft
**Date:** 2026-08-31
**Platform:** Node ≥ 22 / TypeScript CLI, published as `@lintel/harness`, binary `lintel-harness` (Q-16). Pack content is Markdown, shell, PowerShell and Bicep; `pack.json`, `recipe.json` and the manifest are JSON. No UI.
**Design spec:** n/a (no UI)
**ADR:** `F1-ADR-001-pack-format-and-manifest.md` — **PROCEED**, but written against the single-phase model. Q-39…Q-46 supersede it wherever they disagree; its **security conditions C-1…C-18** survive and are carried forward or explicitly deferred in this document.
**References:** `specifications/general/pack-application.md` (the two-phase model — authoritative), `specifications/general/pack-inventory.md` (the three packs, source and applied trees), `specifications/project-brief.md` §12 Q-1…Q-47 and §9 Q-48, `packs/coding/specifications/conventions.md`, `packs/coding/` (the pack this format must carry)

**Amendment history**

| Version | Date | Summary |
|---|---|---|
| 1.0 | 2026-08-30 | Initial draft. Defines `pack.json`, the source→applied mapping model, the marked-region grammar, shared references, init parameters, scaffolds, and the `.harness/` manifest. |
| 1.0 | 2026-08-30 | Cross-document consistency pass. Open questions renumbered to project-unique ids Q-18…Q-26. |
| 1.0 | 2026-08-30 | **ADR-001 amendment pass.** Anatomy status enum, `parameters[].flag`, shared `mappings` + `remap`, per-owned-key hashes, `pack.integrity`, `.harness/.gitattributes`, `{{harness:lit:X}}`, US-29. |
| 1.0 | 2026-08-30 | **Security remediation pass.** Folds `F1-ADR-001` §7–§8 (C-1…C-18): confinement by resolution, the anchored `to` grammar, the reserved-destination denylist, the destination-keyed ownable allowlist, the hook exclusion, journal v2 and the five-case rollback table, the consent gate. |
| **2.0** | **2026-08-31** | **Two-phase rewrite.** Folds Q-39…Q-47 and Q-16/Q-17. Apply becomes **two phases**: a verbatim payload copy to `.harness/pack/`, then a **declarative recipe** over seven primitives (US-30, US-31). The source→applied *mapping* model, the marked-region grammar, `source-only`/`applied-only`, `shared/` components, `.harness/base/` and the per-file hash list are **removed**; the manifest becomes minimal (Q-43); `--adopt` is dropped (Q-44); regions become **inert anchors only** (Q-45). `update`, `status` and `contribute` leave v1.0 (Q-42), taking C-3, C-9's region half, C-10/C-11's update paths and C-18 with them. **Retired: US-5, US-7, US-11, US-12.** New: US-30…US-33. 24 codes removed, 12 added, 1 renamed. |

---

## Introduction

F1 defines the three data structures the product stands on: the **pack
format** (`pack.json` — how a way of working declares its identity,
anatomy, parameters and scaffolds), the **recipe** (`recipe.json` — the
declared procedure that turns a pack into a working project), and the
**manifest** (`.harness/manifest.json` — the small record an applied
project keeps of what it got).

The model this document describes is the two-phase apply settled by Q-39
and specified in `specifications/general/pack-application.md`:

- **Phase 1 — payload.** The pack folder is copied **verbatim** into
  `.harness/pack/`. No renames, no substitution, no rewriting, no
  transformation of any kind. The mechanism is identical for every pack.
- **Phase 2 — application.** A pack-specific **recipe** copies out the
  agents, commands, agent teams, `Run.md` and `CLAUDE.md`, rewrites the
  paths and wires the project up. It reads from the phase-1 copy in the
  project (Q-41), never from the bundle, and it is run by the CLI
  automatically, never by the user (Q-40).

Splitting the apply is what makes this spec smaller than its predecessor
rather than larger. The previous model had one pipeline that had to
express every transformation any pack might need, plus a marked-region
grammar to repair documents that described their own copying. Under Q-46
that prose is deleted from the pack sources — the recipe encodes it — so
**nothing in the payload is wrong once copied**, and the whole
source-only/applied-only mechanism goes with it.

The recipe is a **declaration over a closed primitive set**, not a
script: `copy`, `rename`, `strip-suffix`, `rewrite-path`, `substitute`,
`generate`, `merge-json`. A script would make a pack *code that executes
on the user's machine*, which voids the security model — path
confinement, the reserved-destination denylist and consent gating all
depend on the plan being inspectable **before** anything runs. A pack can
only do what the primitives allow; a genuinely new step requires a new
primitive in the CLI, deliberately, so that what an apply can do stays
enumerable.

Determinism is the load-bearing property. The recipe is a pure function
of **(payload, parameter answers)** — no timestamps, no ordering
dependence, no environment or network reads. Two applies of the same pack
version with the same answers produce **byte-identical trees, manifest
included**. That is what lets the manifest stay minimal (Q-43): the
applied state is always recomputable from `.harness/pack/` + the recipe +
the recorded answers, so there is no per-file hash list and no
`.harness/base/` store.

This feature is the *format*, not the engine. F2 (`lintel-harness init`)
owns the CLI surface and the interactive prompting; F5 authors the three
packs against this format; F6 wraps the CLI in a skill. Where this spec
pins behaviour — primitive semantics, ordering, atomicity, confinement —
downstream features implement it and may not reinterpret it.

### What is in scope

- `packs/<name>/pack.json` — identity, semver, `minCliVersion`, the
  mandatory nine-key `anatomy` object, declared `parameters`, declared
  `scaffolds` (with categories), `executableRoots`, and the reference to
  the recipe.
- `packs/<name>/recipe.json` — the ordered phase-2 steps over the seven
  primitives: each primitive's schema, its inputs, its validation, and
  the determinism requirement; and conditional steps (`when`) keyed on
  init parameters, which is how the `planning` pack's
  `calibrations/<name>/` works.
- **Phase 1** — the verbatim payload copy to `.harness/pack/`: what
  validation it still performs, and what it explicitly does not do.
- **Init parameters** — declaration, typing, constraint, CLI aliasing,
  and the ban on credential-valued parameters.
- **Scaffolds** — declaration, categories and variants, selection and
  collision rules.
- The **manifest** — location, minimal schema, forward compatibility, and
  behaviour when missing, corrupt, hand-edited or written by a newer CLI.
  A project holds exactly one pack (Q-12).
- **Verifiability** — the expected applied tree is recomputable from the
  payload, the recipe and the recorded answers, and
  `lintel-harness verify` checks it.
- The **atomicity, journal and rollback contract** an apply must honour.
- `lintel-harness validate` and `lintel-harness pack info` — the
  author-facing and adopter-facing views of the same report structure.

### What is NOT in scope

- **The apply engine and its CLI surface** (F2). This spec pins the
  phases, the primitive semantics and their ordering; F2 implements them
  and owns interactive prompting.
- **`update`, `status` and `contribute`** — deferred to v1.1 (Q-42).
  Everything that existed only to serve drift detection, 3-way merge or
  contribute is removed from this spec, not merely disabled. The two
  pieces of forward investment that remain are named explicitly in §F1.9.
- **Marked regions.** No region parser, no region hashes, no
  malformed-marker diagnostics, no `E-REGION-TAMPERED` (Q-45). The
  generated `CLAUDE.md` emits **inert anchors** and nothing reads them at
  v1.0.
- **`--adopt`** — dropped (Q-44). A hand-applied tree is brought under
  management by a fresh `init`, using `--force` for byte-identical
  collisions.
- **Source-only / applied-only content.** Removed with Q-46; the payload
  is correct as copied.
- **`shared/` components.** No v1.0 pack references `shared/`
  (`pack-inventory.md`; `shared/targets` ships inside `coding`,
  `shared/presentation` defers under Q-28). The mechanism leaves the
  format for v1.0 — see Q-48.
- **Pack content.** The nine parts of `coding`, `writing` and `planning`
  are F5's deliverable.
- **Two packs in one project** (Q-12), and **changing an answer or a
  scaffold after init** (Q-21, Q-22).
- **A registry, remote fetching, third-party packs or pack signing.**
  Packs are bundled with the published CLI (Q-2).

---

## Technical Context

Only settled decisions. Rows marked *(brief)* were settled in
`project-brief.md` §12 and are restated, not re-litigated.

| Decision | Choice | Rationale |
|---|---|---|
| Two phases | Phase 1 copies the pack folder verbatim to `.harness/pack/`; phase 2 runs the pack's recipe | *(brief Q-39)* The manual apply was already two things — a dumb copy and a tie-up. The single-phase model treated the second half as awkward exceptions to the first |
| Phase 2 is declarative | An ordered list of steps over a **closed** seven-primitive set, applied by the CLI, never by the user | *(brief Q-40)* A script is code executing on the user's machine, which voids confinement, the denylist and consent gating — all of which need the plan inspectable before anything runs |
| Phase 2's input | `.harness/pack/` in the project, never the bundle | *(brief Q-41)* One source of truth per apply; the applied result is a function of what is on disk in the project |
| Templates stay put | A pack's document templates and reference docs are **not** copied out. They live in `.harness/pack/` and the project reads them there | *(brief Q-47, superseding Q-38)* The payload is inside the project, so a project still has every template locally, browsable and offline — which was Q-38's whole rationale — without a second copy the tool must keep in step |
| Determinism | The recipe is a pure function of (payload, answers). Two applies with the same answers produce byte-identical trees **including the manifest** | *(brief Q-40, Q-43)* Makes "applied correctly every time" a testable property, and is what lets the manifest carry no hashes |
| Manifest content | Pack name, pack version, CLI version, parameter answers, chosen scaffolds. **No per-file hash list. No `.harness/base/`.** | *(brief Q-43)* With the payload local and the recipe deterministic, the applied state is recomputable; a hash list and a cached base are both redundant |
| No `appliedAt` | The manifest carries no timestamp | Q-43's list does not include one, and omitting it makes "byte-identical trees" true of the whole project rather than of everything except one file. Version control already records when |
| No manifest self-hash | `integrity` is dropped, and with it hand-edit detection | Its only consumer was a merge that no longer happens. A hand-edited-but-valid manifest is indistinguishable from a written one, and that is acceptable precisely because v1.0 never merges against it — `verify` catches a manifest whose answers no longer produce the tree on disk |
| Two files, not one | `pack.json` declares identity; `recipe.json` declares procedure | Amends Q-24. Identity is read by `pack info` and by a user choosing a pack; the recipe is read only by an apply. Splitting them keeps the file a human reads short |
| Pack home | `packs/<name>/` in this repo, bundled into the published package | *(brief Q-2)* One release artifact; `npx` needs no network |
| Payload root | The pack directory itself. There is no `contentRoot` | Phase 1 copies the folder verbatim, so a second root would be a thing the copy has to know about. `pack.json` and `recipe.json` land in the payload with everything else |
| Versioning | Per-pack semver + `minCliVersion`; separate CLI semver; both recorded | *(brief Q-3)* |
| One pack per project | **Invariant.** The manifest has one `pack` object, not a list | *(brief Q-12)* Removes the file-collision class rather than solving it |
| Publication | `@lintel/harness`, binary `lintel-harness`, Node ≥ 22 | *(brief Q-16)* Diagnostics are prefixed `lintel-harness:` to match the binary |
| Scaffolds | Three at v1.0: `backend-azure`, `backend-aws` (coding), `writing-workstream` (writing). A scaffold declares a **`category`**; two scaffolds of one category are **alternatives**, and selecting both is an error | *(brief Q-17)* The two backends target the same destination. Under the old model that surfaced only as a path collision, which is a true but unhelpful diagnostic for "you picked two of a choose-one" |
| `CLAUDE.md` | Generated by the `generate` primitive, carrying **inert** region anchors | *(brief Q-45)* Anchors are near-free now and expensive to retrofit; nothing parses them at v1.0 |
| No bootstrap prose | Manual-apply instructions are deleted from pack sources | *(brief Q-46)* The recipe encodes them, so they describe a procedure nobody will perform. This is also why phase 1 can copy verbatim |
| Substitution token | `{{harness:…}}` — a reserved prefix; every other `{{…}}` is left verbatim | Pack content is full of `{{Feature name}}`-style placeholders that must survive apply untouched |
| Hash | SHA-256, lowercase hex, 64 chars, over **normalized** content (§NFR). Used by `verify` and by `--force` byte-identity, not by the manifest | In Node stdlib; normalization is what makes a comparison survive a CRLF checkout |
| Text encoding | UTF-8 only; BOM stripped on read, never re-emitted; non-UTF-8 is binary | One encoding, stated once |
| Exit codes | `0` success · `1` user-correctable error · `2` pack, recipe or manifest integrity error · `3` internal error | Lets F6 and CI branch on outcome without parsing text |
| Diagnostic vocabulary | F1's `E-`/`W-` codes and these four exit classes are the **only** CLI error model; §Error States is the only message catalogue | *(`F1-ADR-001`, conflict 4)* A scenario with no code can only be asserted by string-matching |
| Anatomy status | Three values per part: `present` (default) · `provisional` (needs a `note`) · `absent` (needs a `reason`) | *(`F1-ADR-001`, conflict 3)* F5 asserts provisional counts as an NFR, and free text cannot be counted |
| Confinement | **By resolution, not by string.** The project root is resolved once with `realpath`; every applied path passes one gate and carries the branded type `AppliedPath` | *(`F1-ADR-001` §7.1, C-4/C-14)* Inspecting a declared string says nothing about the filesystem it will meet |
| Settings ownership | A **destination-keyed** allowlist decides what a `merge-json` step may own. **No pack may register an agent hook at v1.0**: `hooks` is outside the ownable set entirely | *(`F1-ADR-001` §7.2.1/§7.2.5, C-1)* An unconstrained `ownedKeys` made `permissions.allow` indistinguishable from `theme`. Hooks are excluded by *format* decision, not by consent design |

---

## Goals

- **G-F1-1** — Phase 1 is expressible in one sentence and needs no
  per-pack knowledge: the pack folder appears at `.harness/pack/`,
  byte-for-byte.
- **G-F1-2** — `recipe.json` can express every step the coding pack's
  applied tree requires (`pack-inventory.md`), using only the seven
  primitives and no escape hatch.
- **G-F1-3** — A pack declares all nine anatomy parts, and
  `lintel-harness validate` fails a pack that silently omits one.
- **G-F1-4** — Two applies of the same pack version with the same answers
  into two empty directories produce **byte-identical trees, manifest
  included**.
- **G-F1-5** — The expected applied tree is recomputable from
  `.harness/pack/`, the recipe and the manifest's answers alone — no
  network, no bundle, no cached base — and `lintel-harness verify` proves
  it.
- **G-F1-6** — A failed apply leaves the project either fully applied or
  fully unapplied; a crashed apply is detectable and reversible by one
  command, and rollback never deletes a file that existed beforehand.
- **G-F1-7** — The same pack applied on macOS, Linux and Windows produces
  identical trees and identical manifests.
- **G-F1-8** — The `planning` pack's constraint-floor calibration is
  expressible by conditional recipe steps alone, and the cost of
  expressing it is stated rather than discovered during F5.
- **G-F1-9** — No pack can do anything at apply time that is not one of
  the seven primitives, and `lintel-harness pack info` can enumerate what
  a pack will do before it is applied.

---

## Out of Scope (this version)

- `update`, `status` and `contribute` (Q-42), and with them: drift
  reporting, 3-way merge, the merge base, removal-honouring settings
  merges, region tamper detection and the contribute policy gate.
- Marked regions as a live mechanism (Q-45). Anchors are emitted and
  never read.
- `source-only` / `applied-only` content (Q-46).
- `--adopt` (Q-44).
- `shared/` components and the Q-4 bump rule's tooling (Q-48).
- Re-calibrating a parameter answer or changing the scaffold set after
  init (Q-21, Q-22) — earliest v1.1.
- Remote or third-party packs, a registry, and pack signing.
- User inspection or editing of the payload between the two phases
  (Q-41).
- Any manifest consumer beyond the CLI — no API, no schema publication.

---

## User Stories

Range used: **US-1, US-2, US-3, US-4, US-6, US-8, US-9, US-10, US-13,
US-14, US-15, US-16, US-29, US-30 … US-33.** Next free id: **US-34**.

**Retired, never to be reused:** **US-5** (source-only/applied-only —
Q-46), **US-7** (shared components — Q-48), **US-11** (drift reporting —
Q-42), **US-12** (merge base — Q-43). F5 holds US-17…US-28.

---

**US-1 — Declare a pack's identity, versions and recipe**
> As a pack author, I want to declare a pack's name, version, minimum CLI
> version and recipe in one file so that an applied project can record
> exactly what it got and the CLI knows how to apply it.

**Acceptance criteria:**
- `packs/<name>/pack.json` exists, is valid JSON, and carries
  `formatVersion` (integer), `name`, `version` (semver), `title`,
  `minCliVersion` (semver) and `recipe`.
- `name` matches `^[a-z][a-z0-9-]{1,31}$` and equals the directory name;
  a mismatch fails validation.
- `version` and `minCliVersion` are valid semver; a non-semver value
  fails validation.
- A CLI older than `minCliVersion` refuses to apply the pack and prints
  the verbatim `E-PACK-CLI-TOO-OLD` message from Error States.
- `formatVersion` greater than the CLI's supported pack-format version
  fails with `E-PACK-FORMAT-NEWER`; equal or lower proceeds.
- `recipe` is a pack-relative path, defaulting to `recipe.json`. A
  `recipe` naming a file that does not exist in the pack fails with
  `E-RECIPE-MISSING`, exit 2. A `recipe` path that escapes the pack
  directory, or is not a plain relative path, fails with
  `E-PAYLOAD-PATH-INVALID`.
- There is **no `contentRoot`**. Every pack-relative path in `pack.json`
  and `recipe.json` resolves against the pack directory itself, which is
  what phase 1 copies.
- Unknown top-level keys in `pack.json` are a validation **warning**, not
  an error, and are ignored at apply.
- **The key/value asymmetry is normative and applies everywhere in the
  format** (C-16). An unknown **key** in `pack.json`, `recipe.json` or
  the manifest is a warning and is ignored. An unknown or unrecognised
  **value in a behaviour-selecting position** is a hard error, **exit 2,
  zero bytes written**. Silently ignoring such a value means running
  behaviour the pack did not ask for.
- The behaviour-selecting positions are **enumerated, and the enumeration
  is closed**: `RecipeStep.op`, `ParameterDecl.type`,
  `AnatomyDecl.status`, `ScaffoldDecl.category` (against the pack's own
  declared category set), an `ownedKeys` root against the destination
  policy of US-6, and `Journal.version`. Nothing else is a
  behaviour-selecting position, and adding one is a spec change.
- Where a position has its own code (`E-RECIPE-PRIMITIVE-UNKNOWN`,
  `E-OWNEDKEY-FORBIDDEN`, `E-JOURNAL-UNREADABLE`) that code is used;
  otherwise the value fails with **`E-UNKNOWN-VALUE`**, naming the field,
  the offending value and the permitted values verbatim. A test may
  assert this by writing `"type": "strng"` into a parameter and requiring
  exit 2 with nothing written.

---

**US-2 — Declare the nine-part anatomy and be told when a part is missing**
> As a pack author, I want to declare which files supply each of the nine
> anatomy parts so that a pack with a gap is visibly incomplete rather
> than quietly deficient.

**Acceptance criteria:**
- `pack.json` has an `anatomy` object with exactly these nine keys:
  `process`, `roles`, `documentTemplates`, `conventions`,
  `coordination`, `behaviouralGuidelines`, `folderScaffolding`,
  `skillsAndAutomations`, `autonomyContract`.
- Each key holds a **content source** — `{ "paths": [<glob>, …] }`, globs
  relative to the pack directory, or `{ "declaredBy": "recipe" }` (valid
  only for `folderScaffolding`, whose shape *is* the recipe's set of
  destinations) — plus an optional `status`.
- `status` is one of **`present` | `provisional` | `absent`** and defaults
  to `present` when omitted. One axis, three values.
- A missing key fails validation with `E-ANATOMY-MISSING`, naming the
  key. An entry carrying neither a content source nor `"status":
  "absent"` fails with the same code.
- `present` (explicit or defaulted) requires a content source. A key
  whose globs match zero files fails with `E-ANATOMY-EMPTY`, naming the
  key.
- `provisional` requires a content source **and** a non-empty `note`
  saying what is unsettled. A missing or empty `note` fails with
  `E-ANATOMY-NO-NOTE`. A well-formed provisional part passes validation,
  and `validate`, `pack info` and `init` print the verbatim
  `W-ANATOMY-PROVISIONAL` warning naming the part and the note.
- `absent` requires a non-empty `reason` and takes **no** content source.
  A missing or empty `reason` fails with `E-ANATOMY-NO-REASON`. A
  well-formed absent part passes validation, and `init` prints the
  verbatim `W-ANATOMY-ABSENT` warning naming the part and the reason.
- **A key that contradicts the declared status is an error; a key that is
  merely inapplicable is a warning.** The line is drawn on decidability.
  - **Contradiction, exit 2.** A content source (`paths` or `declaredBy`)
    alongside `"status": "absent"` fails with
    `E-ANATOMY-SOURCE-ON-ABSENT`, naming the part and the source key. The
    author has declared both "this part does not exist" and "here is its
    content", and the format cannot pick one. This is **not** covered by
    US-1's unknown-key rule, which governs keys the format does not
    recognise, not keys whose meanings collide.
  - **Redundancy, warning.** A `reason` alongside `present` or
    `provisional`, or a `note` alongside `absent`, is ignored at apply and
    reported as a validation warning.
- `validate --json` and `pack info` emit a nine-row anatomy report over
  the same structure, with `present | provisional | absent` per part. A
  fourth value, `missing`, is emitted **only for an invalid pack** and
  never appears for a pack that passes validation.
- The counts F5 asserts as an NFR (exactly two `absent` and exactly one
  `provisional` across the three v1.0 packs) are therefore mechanically
  checkable rather than editorial.

---

**US-3 — Place pack content at applied paths — copy, rename, strip-suffix**
> As a pack author, I want to declare where each piece of payload content
> lands in the applied project so that no user ever has to move or rename
> a file by hand.

**Acceptance criteria:**
- Three primitives place content, all reading from `.harness/pack/` and
  all writing through the one confinement gate below.
  - **`copy`** — `{ "op": "copy", "from", "to", "exclude"?, "when"?,
    "executable"? }`. A `from` ending `/` copies a directory recursively
    and `to` must also end `/`; the applied basenames equal the source
    basenames. Source and destination **directory** names may differ
    (`agent-teams/` → `AgentTeams/`) — that rename is expressed by the
    step alone, with no content change. A `from` naming a single file
    copies that one file and its basename **must not** change; use
    `rename` for that. `exclude` is a list of globs relative to `from`,
    which is how a pack keeps a payload-only file (an `agents/README.md`)
    out of the applied tree.
  - **`rename`** — `{ "op": "rename", "from", "to", "when"? }`. One
    source file, one destination, and the basename may differ
    (`specifications/README.template.md` →
    `specifications/README.md`). A directory `from` is
    `E-RECIPE-STEP-INVALID`.
  - **`strip-suffix`** — `{ "op": "strip-suffix", "from", "to",
    "suffix", "exclude"?, "when"? }`. Copies a file or a directory and
    rewrites any basename `X<suffix>.Y` to `X.Y`. `suffix` is a declared
    literal matching `^\.[a-z0-9-]{1,16}$`; there is no implicit
    `.template` default, because the coding pack's payload legitimately
    keeps `*.template.md` filenames that must not be stripped. A step
    whose `from` yields no basename carrying the suffix fails with
    `E-RECIPE-STEP-INVALID`.
- A step's `from` naming nothing in the payload fails with
  `E-RECIPE-SOURCE-MISSING`, exit 2, naming the step index and the path.
- `to` may name a tool-owned directory (`.claude/agents/`). Writing into
  an existing directory merges by file; per-file collision rules (US-13)
  still apply.
- Two steps that write the same applied path fail with
  `E-MAP-COLLISION`, computed over the merged step set — base steps plus
  the steps of every selected scaffold.
- **An empty directory is not representable.** No primitive creates one.
  A pack that needs `specifications/general/` to exist ships a
  placeholder file in the payload and copies it. This is a stated
  limitation, not an oversight — see §F1.9.
- Validation rejects any symlink anywhere in the pack
  (`E-SYMLINK-IN-PACK`).

**Path confinement — four ordered stages** (C-4, C-5, C-6, C-14).
Inspecting a *declared string* says nothing about the filesystem that
string will meet, so confinement is **by resolution**. Every applied path
in the product is produced by one gate and carries the branded
`AppliedPath` type; there is no second route to an applied path, and a
bare `string` never reaches a writer.

**Stage 1 — the anchored `to` grammar** (declaration time; runs at
`validate`, which has no project to inspect). A `to` value must match, as
a whole:

```
to        := segment ( "/" segment )* ( "/" )?   # trailing "/" only for a directory step
segment   := char+                                # NFC-normalized, ≥ 1 char
char      := any Unicode scalar EXCEPT  /  \  :  *  ?  "  <  >  |
             and U+0000–U+001F, U+007F
```

Everything below fails with **`E-MAP-PATH-GRAMMAR`**, exit 2, naming the
offending construct — one code, one rule, rather than four substring
searches that each miss a different case:

| Rejected | Because |
|---|---|
| a leading `/` or `\` | POSIX-absolute |
| any `\` anywhere | a Windows separator; a pack declares POSIX paths, and `a\b` is one segment on POSIX and two on Windows |
| `^[A-Za-z]:` — both `C:\x` and **`C:x`** | drive-absolute and **drive-relative**. `C:x` resolves against the *per-drive* current directory, which is not relative to anything the CLI controls |
| a `//` or `\\` prefix | UNC / network path |
| a `.`, `..` or empty segment | the classic escape, rejected as *grammar* rather than by substring search |
| a segment ending in `.` or in any whitespace | Windows silently strips these, so `foo.txt.` and `foo.txt` are the same file there and different files here — a rename the pack did not ask for |
| a reserved Windows basename with or without extension (`CON`, `PRN`, `AUX`, `NUL`, `COM1`–`COM9`, `LPT1`–`LPT9`) | enforced in the one grammar rather than separately |
| a non-NFC `to` | see below |

- **NFC is mandatory.** `to` must be NFC. A source basename discovered by
  directory recursion is NFC-normalized when its applied path is computed
  and is named by **`W-PATH-NON-NFC`**. A macOS checkout can hold NFD
  filenames, and an NFD applied path would not match a Linux teammate's
  NFC one — breaking G-F1-7 silently.
- **Collision keys.** Two applied paths collide when
  `collisionKey(a) === collisionKey(b)`, where `collisionKey` is the
  applied path **NFC-normalized and then case-folded**. A collision that
  is a pure case difference is `E-MAP-CASE-COLLISION`; one that survives
  case-folding and is created by normalization alone is
  **`E-MAP-NORM-COLLISION`**, exit 2 — a separate code because the remedy
  is different prose. The check runs over the merged step set.
- **The payload has its own path check.** Every payload-relative `from`,
  and every path phase 1 copies, must satisfy the same grammar minus the
  trailing-slash rule. A violation is **`E-PAYLOAD-PATH-INVALID`**, exit
  2. This is what stops a pack shipping a file whose name is legal on the
  authoring machine and catastrophic on the applying one.

**Stage 2 — the reserved-destination denylist, on the resolved path**
(C-5). No step's `to`, no scaffold step's `to` and no `executableRoots`
entry may resolve to a path whose first segment is `.git/`, `.hg/`,
`.svn/` or `.harness/`, or which lies inside the resolved directory the
CLI itself is installed in (`realpath` of the package root — which
matters precisely when someone runs `init` inside the harness repo).
**`E-MAP-RESERVED-DEST`**, exit 2.

- The check runs **after** resolution, so a `to` reaching
  `.git/hooks/pre-commit` by *any* route — a directory recursion, a
  scaffold, a conditional step — is caught by one rule rather than four
  copies of it.
- `.git/hooks/pre-commit` with `"executable": true` is two independent
  errors, this one and `E-EXEC-DEST-FORBIDDEN`.
- **Carve-out, and it must be stated.** The CLI's own writes under
  `.harness/` — the phase-1 payload, the manifest, the journal and the
  lock — are **not recipe steps** and do not consult the denylist. They
  are produced by the CLI from paths it constructs itself, and are
  confined by construction. **A recipe step may never write under
  `.harness/`**, which includes writing into the payload it is reading
  from.

**Stage 3 — resolution confinement** (C-4; plan time and write time only,
skipped at `validate`, which has no project root). The **project root is
resolved once per run** with `realpath()`, and everything below is judged
against the *resolved* root — without this the CLI would refuse to run in
`/tmp` on macOS, where `/tmp` is a symlink to `/private/tmp`. Below the
resolved root, for every applied path:

- Every ancestor component is `lstat`ed, top down. A component that is a
  symlink, a Windows junction or any other reparse point fails with
  **`E-DEST-SYMLINK`**, exit 2, naming the component. The CLI does not
  traverse through one and does not create through one.
- Directories are created **one level at a time**, non-recursively, each
  `lstat`-checked before the next — a directory the apply itself created
  is trivially not a symlink.
- The final destination, if it exists, is `lstat`ed; a symlink there is
  `E-DEST-SYMLINK` too. **A pack never writes through a link.**
- The resolved parent joined with the final basename must be a **strict
  descendant** of the resolved root. Failure is `E-MAP-ESCAPES-ROOT`,
  exit 2.

**Stage 4 — the write itself** (C-14), specified in US-13.

**The executable bit is declared, bounded and disclosed** (C-12):

- A `copy` or `strip-suffix` step may set `"executable": true` to write
  mode `0755`; otherwise files are written `0644`.
- `pack.json` may declare **`executableRoots`**: applied-path prefixes,
  each ending `/`, each subject to the stage 1 grammar and the stage 2
  denylist. `"executable": true` on a step whose applied path is not
  under a declared root fails with **`E-EXEC-ROOT-UNDECLARED`**, exit 2.
  Absent or empty means the pack ships no executable file, which is the
  default and the case for every v1.0 pack.
- A declared root that resolves under `.claude/`, `.git/`, `.hg/`,
  `.svn/` or `.harness/` fails with **`E-EXEC-DEST-FORBIDDEN`**, exit 2 —
  checked at declaration **and again per applied path**, so a directory
  recursion cannot reach a forbidden destination the root did not name.
- **At most 32 executable files per apply**, else **`E-EXEC-TOO-MANY`**,
  exit 2. The cap does not meaningfully bound blast radius — one
  executable in the wrong place is the whole finding — and is adopted for
  a procedural reason: a pack wanting more has to argue for it in an ADR.
- **Every 0755 path is enumerated** in `init`'s pre-write summary and in
  `pack info`, verbatim, one per line. Enumeration does not gate:
  disclosure is what C-12 asks for.

---

**US-4 — Fix paths and fill placeholders without a manual pass**
> As a project owner, I want applied files to contain correct internal
> paths and my project's values so that the applied project is
> immediately runnable (R3, "no manual path fixups").

**Acceptance criteria:**
- **`rewrite-path`** — `{ "op": "rewrite-path", "in": [<glob>, …],
  "find", "replace", "when"? }`. `in` globs over **applied** paths that
  earlier steps have already written; `find` is a **literal** string,
  never a regex; `replace` is a literal string. Neither may contain a
  line break. The step rewrites every occurrence, and it applies to text
  files only.
- A `rewrite-path` step matching nothing across all its `in` files fails
  validation with `E-REWRITE-UNUSED` — a rewrite that no longer applies
  is stale, and staleness is the defect this product exists to prevent.
- A `rewrite-path` whose `in` glob matches no file the recipe has written
  by that point fails with `E-RECIPE-STEP-INVALID`, naming the step index
  and the glob. Order matters, and a rewrite that runs before its target
  is placed is an authoring error, not a silent no-op.
- **`substitute`** — `{ "op": "substitute", "in": [<glob>, …],
  "tokens"?, "when"? }`. Replaces `{{harness:param.<id>}}` with the
  recorded answer for that parameter, and `{{harness:pack.name}}`,
  `{{harness:pack.version}}`, `{{harness:cli.version}}` with their values,
  in every applied file matched by `in`. `tokens`, when present, is an
  allowlist of the token bodies the step may resolve; a `{{harness:…}}`
  token in those files outside the allowlist is `E-SUBST-UNRESOLVED`.
- Any `{{…}}` token **not** beginning `harness:` is copied verbatim.
  Applying the coding pack leaves every `{{Feature name}}`,
  `{{YYYY-MM-DD}}` and `{{PLACEHOLDER}}` in the payload's document
  templates byte-identical.
- **Escape.** `{{harness:lit:<X>}}` renders as the literal text
  `{{harness:<X>}}`, so a pack can *document* the reserved prefix. The
  escape is resolved in the same pass as every other `{{harness:…}}`
  token, once, and its output is never re-scanned, so
  `{{harness:lit:lit:x}}` renders `{{harness:lit:x}}` and nothing
  further.
- An unresolved `{{harness:…}}` token remaining in any output file fails
  the apply with `E-SUBST-UNRESOLVED` before anything is written.
- No substitution variable is non-deterministic. There is no
  `{{harness:date}}`, `{{harness:cwd}}` or equivalent, by design.
- Applying the coding pack rewrites `targets/Run.md` and
  `.claude/commands/target.md` so that every `template/targets/…`
  reference reads `.harness/pack/targets/…`, with no manual step.

**A substituted value is untrusted input** (C-7, C-8, C-9's surviving
half). An answer is typed by a user and recorded verbatim in a manifest
this spec requires to be committed, so it is treated as untrusted at
every use, not only at the prompt.

- **Context-aware escaping.** Substitution takes the destination's kind.
  For a `merge-json` target, a substituted value is **JSON-string-escaped**
  before insertion. For every other target it is inserted verbatim.
- **Verified after serialization.** A `merge-json` output is **re-parsed**
  after it is serialized, and the value found at each owned key must
  **deep-equal the intended value**. Failure is `E-MERGE-JSON-INVALID`
  and **nothing is written**. The deep-equal is one line stronger than a
  re-parse check on its own, and it is what catches an injected value
  that happens to still parse.
- **No substitution into a security-relevant key at all** (C-8). No
  `{{harness:…}}` token — including `{{harness:lit:…}}` — may appear in a
  source value that lands under a **security-relevant** owned key as
  defined by US-6's destination policy. **`E-SUBST-IN-SECURITY-KEY`**,
  exit 2, at validate time, with **no override**. A permission string is
  a decision the pack author makes at authoring time; it is not a
  decision a user makes by typing a project name.
- **No line break out of a value** (C-9, surviving half). A substituted
  value may not contain `\n`, `\r`, `U+2028` or `U+2029`.
  **`E-SUBST-NEWLINE`**, exit 2. This is the **sufficient** condition and
  the one that does not depend on a pack author having written a good
  `pattern`: a conforming pattern already excludes line breaks, and this
  check holds when the pattern is weak. The lex half of the old check —
  "the line it produces must not read as a `harness:` directive" — **is
  removed with the region parser (Q-45)**; the generated anchors of US-32
  are inert text that nothing reads, so a forged one has nothing to
  hijack at v1.0. Restoring the lex check is a v1.1 obligation and is
  recorded as such in §F1.9.

---

**US-6 — Own part of a settings file without owning the whole of it**
> As a project owner, I want a pack to be able to add the specific
> settings keys it needs to a JSON file I already own, without replacing
> the file and without being able to take anything it did not declare.

**Acceptance criteria:**
- **`merge-json`** — `{ "op": "merge-json", "from", "to", "ownedKeys":
  [<dotted path>, …], "when"? }`. `from` is a payload JSON file holding
  the values to merge; `to` is an applied JSON path. Only the declared
  `ownedKeys` are written or updated; every other key in a pre-existing
  file is preserved byte-for-byte where the serializer allows.
- `merge-json` is the **only** primitive permitted on a JSON destination
  that already exists. A `copy`, `rename` or `strip-suffix` step whose
  `to` is `.claude/settings.json` or `.claude/settings.local.json` fails
  with `E-SETTINGS-MODE-FORBIDDEN`, exit 2 — otherwise a plain `copy` is
  a trivial bypass of everything below.
- An existing target that is not parseable JSON fails with
  `E-MERGE-JSON-INVALID` and **nothing is written** — the pack never
  overwrites a settings file it could not read. The same code covers the
  post-serialization re-parse and deep-equal check of US-4.
- An array-valued owned key is written as **the pack's declared array, in
  declared order**, unioned onto whatever the destination already holds,
  existing entries keeping their on-disk order. There is no
  removal-honouring merge at v1.0: that was C-3, and it exists to stop
  `update` resurrecting a deleted permission. With `update` deferred
  (Q-42) there is no second apply to resurrect anything, and shipping the
  bookkeeping for it now would be a manifest field with no reader.
  **This is a v1.1 obligation, recorded in §F1.9.**

**What a step may own is a property of the destination, not of the
pack** (C-1). The defect this closes is not that `merge-json` exists; it
is that `ownedKeys` was unconstrained, so nothing in the format
distinguished `permissions.allow` from `theme`. The constraint is a table
keyed by **applied path**. Every pack writing that destination gets the
same rule, so "adding a pack requires no core change" (S5) survives
intact.

| Destination | Ownable | Security-relevant | Forbidden, and why |
|---|---|---|---|
| `.claude/settings.json`, `.claude/settings.local.json` | `permissions.allow`, `permissions.deny`, `permissions.ask`, `env.<NAME>`, `model`, `outputStyle` | `permissions.allow`, `permissions.deny`, `permissions.ask`, `env.<NAME>` | **`hooks` and anything under it** — see below. `statusLine`, `apiKeyHelper`, `awsAuthRefresh`, `otelHeadersHelper` — each holds a **command that is executed**, so a pack that can set one has the hook capability under another name. `permissions.defaultMode` — weakens the default posture for everything, including grants the pack did not make. `permissions.additionalDirectories` — grants filesystem reach outside the project, which is the one thing US-3's confinement exists to prevent. `enableAllProjectMcpServers`, `enabledMcpjsonServers`, `enabledPlugins`, `forceLoginMethod` — each admits a whole class of executable content by reference |
| `package.json` | any dotted path **except** those opposite | — | `scripts` and anything under it (`npm install` executes `postinstall`, which is the hook capability wearing an npm hat), `bin`, and the `*Dependencies` roots (adding a dependency is adding arbitrary code) |
| any other JSON target | any dotted path | none | — |

- The general rule the table instantiates, which is what a v1.1 extends:
  **a destination is sensitive when some common toolchain executes what
  it contains, or when it governs what may be executed.** A `merge-json`
  into `tsconfig.json` needs none of this apparatus and gets none of it.
- **Leaf-only for security-relevant roots.** A declared owned key must
  resolve, in the pack's *source* JSON, to a scalar or an array of
  scalars — never to an object. `"permissions.allow"` is ownable and
  `"permissions"` is not; `"env.EDITOR"` is ownable and `"env"` is not.
  This is the mechanical form of "a security-relevant key is ownable only
  by explicit leaf declaration, never via a parent", and it is checkable
  without knowing the destination's schema.
- A violation of either the allowlist or the leaf rule is
  **`E-OWNEDKEY-FORBIDDEN`**, exit 2, **at validate time**, carrying a
  `{reason}` that distinguishes the two. Failing at validate time is the
  point: such a pack never ships and never reaches a consent prompt.

**Packs may not register agent hooks at v1.0** (C-1). `hooks` and every
path under it are outside the ownable set at every destination. A pack
declaring `"ownedKeys": ["hooks"]` fails **`E-OWNEDKEY-FORBIDDEN`** at
validate time. The reasons, in order of weight:

1. **A hook is categorically unlike everything else a pack writes.** The
   whole of the rest of this format is "a pack writes text files into a
   project", and nothing else it writes executes. A hook is arbitrary
   shell, run by the agent runtime, on events the user does not initiate
   deliberately, with no per-invocation consent. One-time consent at init
   is not consent to the hundredth invocation.
2. **There is no provenance story to hang it on.** v1.0 has no signing,
   no registry and no provenance fields in `pack.json`. The bundled packs
   are low-risk; the **format** is not, because `validate` is what
   pronounces a pack well-formed and that pronouncement outlives "packs
   are bundled".
3. **`update` would make the consent unbounded**, and that is not fixable
   in F1. A hook's command string is a merge target; a 3-way merge can
   resolve to a command **neither party wrote**. v1.1 must solve that
   before a `hooks` declaration ships, not alongside it.
4. **The consent UX belongs to F2.** Designing the declaration here and
   the consent there splits one decision that must not be split.

**What a pack may still do.** A pack **may** ship files under
`.claude/hooks/`. They are ordinary files: written `0644` (the executable
bit is forbidden under `.claude/` — US-3), registered by nothing and
executed by nothing. This is what the `planning` pack's
`kill-criteria-guard.sh` is (`pack-inventory.md`). `validate` emits
**`W-HOOK-SCRIPT-INERT`** naming each such file and saying plainly that
no v1.0 mechanism registers it; the same files are listed in the init
summary and in `pack info`. **`--accept-hooks` is a parsed flag that
always fails** with `E-HOOKS-NOT-SUPPORTED`, exit 1, so a script written
against a future version fails loudly instead of silently doing nothing.

---

**US-8 — Declare init parameters and vary content by the answer**
> As a pack author, I want to declare questions asked at init and make
> some content depend on the answer so that the planning pack can ship
> calibrated rather than hard-coded to one pole.

**Acceptance criteria:**
- `pack.json` may declare a `parameters` array. Each entry has `id`
  (`^[a-zA-Z][a-zA-Z0-9]{0,31}$`), `prompt`, `type` (`string` | `enum` |
  `boolean`), optional `default`, optional `required` (default `false`),
  optional `flag`, optional `notASecret`, and for `enum` a non-empty
  `values` array. A `string` parameter additionally **requires**
  `pattern` and may declare `maxLength`.
- **Every `type: "string"` parameter carries an anchored `pattern`**
  (C-7). `pattern` is a regex source that must begin `^` and end `$`, be
  at most 200 characters, and contain no backreference and no lookaround.
  A missing `pattern` is **`E-PARAM-NO-PATTERN`**, exit 2; an
  uncompilable, unanchored or over-long one, or one using a forbidden
  construct, is **`E-PARAM-PATTERN-INVALID`**, exit 2. The recommended
  conservative default — which an author **writes out** rather than
  inherits silently, so the constraint is visible in the pack diff — is
  `^[\p{L}\p{N} ._-]{1,64}$` with the `u` flag. `pattern` is meaningless
  on `enum` and `boolean`, and declaring it there is
  `E-PARAM-PATTERN-INVALID`.
- **`maxLength`** applies to `type: "string"`, defaults to **256** and has
  a hard ceiling of **4096**. It is checked **before** `pattern` is run,
  so pattern evaluation is bounded by construction and a
  catastrophic-backtracking input is not reachable.
- **An answer is validated twice**: when it is collected, and **again
  every time it is read back from the manifest**. The manifest carries no
  self-integrity check (§Technical Context), so a recorded answer is an
  editable value by this spec's own design, and `verify` re-renders from
  recorded answers. A recorded answer failing its declared `pattern`,
  `maxLength` or `values` is `E-PARAM-INVALID`.
- **A credential-valued parameter is forbidden, not handled** (C-15). At
  validate time, a parameter whose `id` or `prompt` matches
  `/api[_-]?key|private[_-]?key|secret|token|passwo?rd|credential|connection.?string/i`
  fails with **`E-PARAM-SECRET-SUSPECTED`**, exit 2, unless it carries
  `"notASecret": true`. The regex deliberately does **not** match a bare
  `key`, which false-positives on `monkey`, `keyword` and `sortKey`. The
  message states plainly that an answer is written verbatim into
  `.harness/manifest.json`, which **is committed to version control by
  design** and is therefore exactly as public as the repository.
- At answer time, a value that *looks* like a credential — `-----BEGIN`,
  `sk-`, `ghp_`, `xox[baprs]-`, or 40 or more characters of high-entropy
  base64url — draws **`W-ANSWER-LOOKS-SECRET`**. A warning only: an error
  there is a false-positive machine.
- The tempting alternative — a `type: "secret"` prompted, used and never
  recorded — is **rejected**, because an unrecorded answer makes the
  applied tree non-recomputable, which is the property G-F1-5 rests on.
- **`flag` declares a CLI alias.** A parameter declaring
  `"flag": "calibration"` makes `--calibration high-floor` exactly
  `--set constraintFloor=high-floor`: the alias is registered from
  `pack.json` data at argv-parse time, and the CLI holds **no**
  pack-specific knowledge. This is what keeps S5 testable.
- `flag` is kebab-case (`^[a-z][a-z0-9-]{0,31}$`). A `flag` colliding
  with a reserved CLI flag (`--set`, `--scaffold`, `--json`, `--strict`,
  `--force`, `--rollback`, `--all`, `--accept-permissions`,
  `--accept-hooks`), with a reserved word, or with another parameter's
  `flag` in the same pack, fails with `E-PARAM-FLAG-INVALID`. The
  reserved list is the whole list; a flag is reserved whether or not the
  command being run accepts it.
- **Pack-declared aliases force a two-pass argv parse**, and it must be
  stated or an implementer reports a false `E-CLI-UNKNOWN-FLAG` for every
  alias. Pass 1 recognises global flags, command flags and the pack name,
  and **defers** every unrecognised token without judging it. Pass 2
  re-parses with the resolved pack's aliases registered, and only then may
  a token be reported unknown. Argv parsing is fail-closed at the end of
  pass 2.
- An aliased flag is sugar: it resolves to the same recorded answer, is
  subject to the same checks, and is recorded under the parameter's `id`,
  never under the flag name. Passing both the alias and `--set` for one
  parameter with different values fails with `E-PARAM-INVALID`.
- A `required` parameter with no answer and no default fails with
  `E-PARAM-MISSING`; an `enum` answer outside `values` fails with
  `E-PARAM-INVALID`, listing the permitted values verbatim.
- Answers are substitutable as `{{harness:param.<id>}}` (US-4).
- **Content varies by answer in exactly one declared way: a conditional
  recipe step.** Any step may carry `"when": { "<paramId>": "<value>" }`
  and is skipped unless the recorded answer equals that value. Only
  single equality is supported — no boolean operators, no negation, no
  multiple keys in one `when`. A malformed or compound `when` fails with
  `E-RECIPE-STEP-INVALID`. Content-level conditionals inside a file do
  **not** exist at v1.0: the `harness:if` region directive is removed
  with the region parser (Q-45).
- A parameter named in a `when` must be declared `required` or carry a
  `default`, so no branch is ever evaluated against `undefined`.
  Violation fails with `E-PARAM-UNDECIDABLE`.
- `validate` renders the pack once **per combination** of parameters that
  appear in a `when`, and every combination must pass every other
  validation rule. The combination count is printed; validation fails
  with `E-PARAM-COMBINATORICS` above 32 combinations.
- All answers are recorded verbatim in the manifest, including defaults
  accepted without being typed, and including answers to parameters that
  turned out to select nothing.
- The `coding` and `writing` packs declare only substitution parameters;
  neither declares a `when`. The `planning` pack declares
  `constraintFloor` as an `enum` of `high-floor | near-zero-floor` with
  `"flag": "calibration"`. Its `calibrations/<name>/` layout is a
  **pack-authoring convention over `when` steps**, not a format feature —
  and it is the only case in any v1.0 pack of pack content varying by an
  init answer.

---

**US-9 — Declare opt-in scaffolds, and be stopped from picking two of a choose-one**
> As a project owner, I want to pick zero or more structural scaffolds at
> init so that I get a backend layout only if I have a backend — and I
> want the tool to tell me plainly when two scaffolds are alternatives
> rather than peers.

**Acceptance criteria:**
- `pack.json` declares a `scaffolds` array; each entry has `id`
  (`^[a-z][a-z0-9-]{0,31}$`), `description`, an optional `category`
  (`^[a-z][a-z0-9-]{0,31}$`), and optionally its own `parameters`.
- **Steps for a scaffold live in `recipe.json` under `scaffolds.<id>`**,
  an ordered array in the same step format as the base recipe. A
  mismatch in either direction — a scaffold declared in `pack.json` with
  no entry in `recipe.json`, or a `recipe.json` scaffold key naming no
  declared scaffold — is a pack defect and fails with
  `E-RECIPE-STEP-INVALID`, exit 2, at validate time.
  `E-SCAFFOLD-UNKNOWN` is reserved for the *user*-facing case: an id
  typed on the command line that the pack does not declare.
- Scaffolds are opt-in: with no `--scaffold` flag, none is applied.
- `--scaffold backend-azure` selects by id; an unknown id fails with
  `E-SCAFFOLD-UNKNOWN`, listing the available ids verbatim.
- **Two scaffolds sharing a `category` are alternatives, and selecting
  both fails with `E-SCAFFOLD-EXCLUSIVE`, exit 1**, naming the category
  and the two ids. `backend-azure` and `backend-aws` both declare
  `"category": "backend"`. Under the previous model this surfaced only as
  a path collision on `infrastructure/backend-deploy/`, which is true but
  tells the user the wrong thing: they did not hit an authoring bug, they
  picked two of a choose-one.
- A scaffold with no `category` is composable with everything.
  `writing-workstream` declares none.
- Two scaffolds **of different categories** that write the same applied
  path is an authoring error: `E-SCAFFOLD-COLLISION`, computed
  statically across every pair whose categories differ or are absent, and
  re-checked at apply for the selected set.
- Composition is order-independent in effect: selected scaffolds are
  applied in the order **declared in `pack.json`**, never the order typed
  on the command line, so two users typing the flags differently get
  byte-identical projects.
- The manifest records the selected scaffold ids in declared order.
- A scaffold's parameters are only prompted for, and only recorded, when
  that scaffold is selected.
- There is no scaffold `contributes` mechanism at v1.0. It existed to
  append into a base-pack **region**, and regions are gone (Q-45). A
  scaffold that needs to change a generated file does so with a
  `rewrite-path` step of its own, or the pack ships two conditional
  `generate` steps.

---

**US-10 — Record what was applied, minimally**
> As a project owner, I want the applied project to carry a small,
> readable record of what was applied so that the applied state can be
> recomputed later without guessing.

**Acceptance criteria:**
- After a successful apply, `.harness/manifest.json` exists at the
  project root with the schema in §F1.4.
- It records exactly: `manifestVersion`, `cli`, `pack` (`name`,
  `version`, `formatVersion`), `parameters` (every declared parameter and
  its answer) and `scaffolds` (selected ids, in declared order). Nothing
  else.
- **There is no `files` array, no per-file hash, no `regions`, no
  `ownedKeys` record, no `shared` array, no `pack.integrity` and no
  `appliedAt`** (Q-43). Each was carried for a consumer that v1.0 does
  not have.
- **There is no `.harness/base/` store, and no `.harness/.gitattributes`
  is written.** The base existed because a hash cannot be a merge base
  and the old pack version might be unavailable; under Q-39 the payload
  is local and under Q-40 the render is deterministic, so neither holds.
  Its `.gitattributes` problem, its text-only restriction and every
  condition attached to it are removed with it.
- Exactly one `pack` object. The schema has no array of packs and no
  merge or precedence field. **A project holds exactly one pack.**
- The manifest is committed to version control; `init` does not add
  `.harness/` to `.gitignore` and prints nothing suggesting it should.
  **`.harness/pack/` is committed too**, and is the largest thing the
  apply writes.
- **State this plainly wherever it is relevant: `parameters` is committed
  and repo-public.** Every recorded answer is written into a file this
  spec requires to be committed. It is exactly as public as the
  repository holding it, and no facility exists to mark one secret. That
  is the reasoning behind US-8's outright ban on credential-valued
  parameters, and it is stated here because this is the story that
  decides where an answer ends up.
- Re-serializing an unchanged manifest produces byte-identical output:
  2-space indent, `\n` endings, keys in the order defined in §F1.4,
  `parameters` sorted by declared parameter order, `scaffolds` in
  declared order.
- Two applies of the same pack version with the same answers produce
  **byte-identical manifests**. A test may assert equality of the two
  files directly.

---

**US-13 — Apply atomically, or not at all**
> As a project owner, I want a failed apply to leave no half-written
> project so that I never have to work out by hand which files landed.

**Acceptance criteria:**
- The apply computes **both phases completely in memory** — the payload
  file list and the full phase-2 output set — and runs every validation
  **before writing any file**. A failure at this stage writes nothing,
  not even `.harness/`.
- `init` into a directory where any target applied path already exists
  fails with `E-TARGET-EXISTS`, listing the first ten colliding paths and
  the total count. `--force` proceeds only for paths whose existing
  content is byte-identical to what would be written; any other collision
  still fails. This is the mechanism S7 uses to re-init this repo, whose
  `.claude/agents/` already holds exactly what the pack ships.
- **The consent gate runs on the plan, before the lock is taken and
  before the first byte** (C-2). The planner builds a **disclosure**
  enumerating **every value** the apply would write under a
  security-relevant owned key (US-6), **verbatim, one entry per line,
  never summarised and never counted** — "adds 14 permissions" is not
  consent, it is a number — together with every 0755 path and every inert
  `.claude/hooks/` script. Consent is then decided by this table and by
  nothing else:

  | Situation | Behaviour |
  |---|---|
  | the disclosure requires no consent | proceed silently. **This is every v1.0 pack** |
  | interactive, the user accepts | proceed |
  | interactive, the user declines | `E-SETTINGS-CONSENT-REQUIRED`, exit 1, **zero bytes** |
  | non-interactive with `--accept-permissions` | proceed, and print the disclosure to **stdout** so it lands in the CI log |
  | non-interactive without the flag | `E-SETTINGS-CONSENT-REQUIRED`, exit 1, **zero bytes** |
  | `--accept-hooks` given, ever | `E-HOOKS-NOT-SUPPORTED`, exit 1 (US-6) |

- **There is no input to the apply that means "consent is granted by
  default".** The consent inputs are optional, and their *absence* means
  non-interactive with no blanket accept — the strict branch. A caller
  cannot reach the permissive branch by forgetting a field, which is the
  property that matters and the one a test should assert.
- The disclosure is built **once**, by the pure planner, and rendered by
  three surfaces — `init`'s pre-write summary, `pack info` and
  `validate --json` — so the summary and the prompt cannot disagree.
- Before writing, a **journal (version 2)** is written to
  `.harness/journal.json` and flushed. It records, per intended path: the
  hash this apply intends to write, **`preExisting`**, the **pre-apply
  hash** and **pre-apply mode** (both `null` when the path did not
  exist), and a **`backup`** path under `.harness/journal.d/` holding the
  pre-apply bytes. A backup is written **before** the overwrite and is
  present exactly when `preExisting` is true and the pre-apply hash
  differs from the intended hash, so only a genuine overwrite pays for
  one. The journal also records the directories the apply created, in
  creation order, and covers **both phases** — the payload copy is
  journalled exactly as phase-2 output is.
- A journal declaring any `version` other than `2` is
  **`E-JOURNAL-UNREADABLE`**, exit 2 — the fail-closed rule of US-1
  applied to the journal.
- **Each write re-confines and creates exclusively** (C-14).
  `executeApply` re-runs US-3's stage 3 **immediately before each write**,
  because the plan's `lstat` is stale by the time the write happens:
  - the temp file is created with exclusive semantics
    (`open(tmp, 'wx', mode)`), so a pre-placed temp name cannot be
    written through;
  - a destination the plan expects to be **new** is claimed by
    `link(tmp, dest)` then `unlink(tmp)` — `link` fails `EEXIST` if the
    destination appeared in the window, which is the exclusive-create
    semantic `rename` does not give. Where `link` is unavailable
    (`EPERM`/`ENOSYS`), the fallback is claim-with-`open(dest,'wx')` then
    `rename`, and the run's diagnostics record the narrowed guarantee
    rather than claiming the stronger one;
  - a destination the plan expects to **exist** (a `--force`
    byte-identical path, a `merge-json` into an existing file) is
    `lstat`ed, confirmed a regular file, re-hashed, and confirmed still
    equal to what the plan observed, before the `rename`.
  - Any of those confirmations failing is **`E-TARGET-RACE`**, exit 2.
    The run stops with the journal in place and is recoverable by
    `--rollback`.
- If the process dies mid-write, the journal survives. The next
  `lintel-harness` command in that project detects it and fails with
  `E-JOURNAL-PRESENT`, offering `lintel-harness init --rollback`.
- **`--rollback` deletes only paths this apply created, restores only
  paths this apply overwrote, and acts on neither unless the on-disk bytes
  are still exactly what this apply wrote** (C-13). The five cases are
  exhaustive:

  | `preExisting` | pre-apply hash | on-disk hash now | Rollback |
  |---|---|---|---|
  | false | — | = intended | **delete** — we created it and it is still ours |
  | false | — | ≠ intended | **keep**, and report `W-ROLLBACK-KEPT` — the user edited it after the crash |
  | true | = intended | = intended | **leave untouched**, report as kept — this is the `--force` byte-identical case; the file was already correct and was never ours |
  | true | ≠ intended | = intended | **restore from `backup`**, report as restored |
  | true | any | ≠ intended | **keep**, and report `W-ROLLBACK-KEPT` — the user edited it after the crash |

- Directories the apply created are removed in **reverse creation order**,
  and only when empty. Rollback then removes `.harness/`, and reports
  every path it declined to touch and why.
- The journal and `.harness/journal.d/` are removed only after the
  manifest is successfully written; the manifest write is the last write
  of an apply.

---

**US-14 — Re-run init without surprises**
> As a project owner, I want re-running `lintel-harness init` in an
> already-applied project to be a defined operation so that I do not
> destroy work by repeating a command.

**Acceptance criteria:**
- `init` in a project that already has a `.harness/` directory fails with
  `E-ALREADY-APPLIED`, exit 1, **zero bytes**, and names the applied pack
  and version when a manifest is readable. Nothing is written. This is
  the first branch of the flow in `pack-application.md` and it precedes
  every other check.
- The one exception is a `.harness/` holding a journal from a crashed
  apply, which is `E-JOURNAL-PRESENT` instead (US-13) and directs the
  user to `--rollback`.
- With `update` deferred (Q-42) there is no in-place re-apply at v1.0.
  `--force` affects only the pre-existing-path rule of US-13 and never
  overrides `E-ALREADY-APPLIED`.
- Applying the same pack twice into two empty directories with identical
  answers and scaffolds produces **byte-identical trees and
  byte-identical manifests**. A test may assert this by recursive
  byte-comparison of the two directories, with no exclusions.
- Determinism holds across platforms: the two trees are identical on
  macOS, Linux and Windows, modulo the executable bit, which Windows does
  not represent.

---

**US-15 — Behave predictably when the manifest is unusable**
> As a project owner, I want clear behaviour when the manifest is
> missing, corrupt or newer than my CLI so that the tool never guesses
> about state it cannot read.

**Acceptance criteria:**
- **Missing.** `verify` fails with `E-MANIFEST-MISSING`, exit 1, and
  names `lintel-harness init`. No attempt is made to infer the pack from
  the file tree — that was `--adopt`, and it is dropped (Q-44).
- **Missing, but `.harness/pack/` present.** Same code. A payload with no
  manifest is a crashed or hand-made state, and the CLI reports it rather
  than reconstructing an answer set it cannot know.
- **Corrupt** (unparseable JSON, or failing schema validation):
  `E-MANIFEST-CORRUPT`, exit 2, naming the parse position or failing key.
  The CLI does not attempt repair and does not overwrite the file.
- **Hand-edited but valid.** Undetectable, and deliberately so: the
  manifest carries no self-integrity field (§Technical Context). The
  practical consequence is bounded — v1.0 never merges against the
  manifest — and it is caught where it matters: a hand-edited answer set
  makes the recomputed tree differ from the tree on disk, which is
  exactly what `verify` reports (US-33). Recorded answers are
  re-validated against their declared `pattern`, `maxLength` and `values`
  on every read (US-8), so a hand-edited answer that breaks its own
  declaration is `E-PARAM-INVALID`.
- **Newer manifest version.** `manifestVersion` greater than the CLI's
  supported version fails every command with `E-MANIFEST-NEWER`, exit 2.
  This is never a warning.
- **Newer CLI recorded.** `cli` newer than the running CLI, at the same
  `manifestVersion`, is a warning (`W-MANIFEST-NEWER-CLI`) and commands
  proceed.
- **Forward compatibility.** Within one `manifestVersion`, unknown keys
  found in the manifest are preserved verbatim on rewrite, so an older
  CLI does not discard a newer one's data.
- **Newer pack than installed.** A recorded `pack.version` newer than any
  pack bundled with the running CLI is a warning
  (`W-PACK-NEWER-THAN-CLI`) suggesting a CLI upgrade. `verify` still
  runs, because it needs only `.harness/pack/` and the manifest.

---

**US-16 — Validate a pack before it ships**
> As a pack author, I want one command that checks a pack against every
> rule in this spec so that a malformed pack is caught in CI rather than
> in a user's project.

**Acceptance criteria:**
- `lintel-harness validate <pack>` (and `validate --all`) runs the checks
  in the fixed order below, so a pack fails on the earliest and most
  explicable cause rather than on whichever check happens to run first.
  The order is part of the contract:

  ```
  1   pack.json schema           + E-UNKNOWN-VALUE (the fail-closed value rule, US-1)
  2   anatomy completeness       + E-ANATOMY-SOURCE-ON-ABSENT (US-2)
  3   payload integrity            E-PAYLOAD-PATH-INVALID, E-SYMLINK-IN-PACK,
                                   E-CONTENT-TOO-LARGE, E-PAYLOAD-TOO-LARGE,
                                   E-TRAVERSAL-LIMIT (US-30)
  4   recipe schema              + E-RECIPE-MISSING, E-RECIPE-INVALID,
                                   E-RECIPE-PRIMITIVE-UNKNOWN, E-RECIPE-STEP-INVALID
  5   step sources                 E-RECIPE-SOURCE-MISSING (US-3, US-31)
  6   destination safety         → US-3 stages 1 and 2:
                                   E-MAP-PATH-GRAMMAR, E-MAP-RESERVED-DEST,
                                   E-MAP-COLLISION, E-MAP-CASE-COLLISION,
                                   E-MAP-NORM-COLLISION
  7   executable declarations      E-EXEC-ROOT-UNDECLARED, E-EXEC-DEST-FORBIDDEN,
                                   E-EXEC-TOO-MANY
  8   destination policy           E-OWNEDKEY-FORBIDDEN, E-SETTINGS-MODE-FORBIDDEN,
                                   W-HOOK-SCRIPT-INERT
  9   parameter declarations       E-PARAM-NO-PATTERN, E-PARAM-PATTERN-INVALID,
                                   E-PARAM-SECRET-SUSPECTED, E-PARAM-UNDECIDABLE,
                                   E-PARAM-FLAG-INVALID
  10  scaffold declarations        E-SCAFFOLD-COLLISION, and E-RECIPE-STEP-INVALID
                                   for a pack.json/recipe.json scaffold mismatch
  11  per-combination render     + E-REWRITE-UNUSED, E-SUBST-UNRESOLVED,
                                   E-SUBST-IN-SECURITY-KEY, E-SUBST-NEWLINE,
                                   E-ANCHOR-INVALID, E-PARAM-COMBINATORICS
  12  link integrity             (below)
  13  disclosure                 build the security disclosure over all combinations
  ```

- **Stage 3 of US-3's confinement — resolution confinement — is not in
  this list**, and its absence is deliberate: `validate` has no project
  root to resolve. It runs at plan time and write time only. A pack is
  therefore validatable in CI without a target project, which is what
  makes the authoring-time checks the high-value half of the security
  model.
- It additionally performs a **link-integrity check**: every relative
  Markdown link and inline path reference in the rendered applied output
  that points at a path inside the project must resolve either to a file
  the recipe produces or to a path under `.harness/pack/` that exists in
  the payload. A dangling reference is `W-LINK-DANGLING`, listing file,
  line and target. The second half of that rule is new and load-bearing:
  under Q-41 the applied documents legitimately point *into* the payload,
  and a check that did not know that would flag every correct reference.
- Every check reports file and line where the concept has one.
- Exit code is `0` with no findings, `1` with warnings only under
  `--strict`, `2` with any error.
- `validate --all` is runnable in this repo's CI and passes for all three
  v1.0 packs before release.

---

**US-29 — See what a pack contains before applying it**
> As someone deciding which pack to apply, I want one command that
> describes a pack — its identity, its nine anatomy parts, its scaffolds,
> its parameters and everything its recipe would do — so that I adopt it
> knowing what it does and does not give me.

**Acceptance criteria:**
- `lintel-harness pack info <name>` exists and is an **F1** command. It is
  defined as `renderPackInfo(report)` over the **same** `PackReport`
  structure `validate --json` emits, so there is exactly one report code
  path and the two surfaces cannot disagree.
- It prints: pack `name`, `version`, `title`, `formatVersion` and
  `minCliVersion`; all nine anatomy parts in fixed order with
  `present | provisional | absent` and, for `provisional` its `note` and
  for `absent` its `reason`; the available scaffolds with `id`,
  `category`, `description` and step count, with same-category scaffolds
  grouped and labelled as alternatives; and the declared parameters
  including any `flag` alias and, for an `enum`, its permitted values.
- **It renders the recipe as a human-readable plan**: every step, in
  order, as `<op>  <from> → <to>`, with conditional steps marked by their
  `when`. This is what "a pack can only do what the primitives allow"
  buys the reader — the complete list of what an apply will do, before it
  does it, without running anything.
- **It renders the pack's security disclosure, in full and verbatim**
  (C-2, C-12), over the same structure `init`'s pre-write summary uses:
  - **every value** the pack would write under a security-relevant owned
    key, in **any** parameter combination — one value per line, verbatim,
    **never summarised, never truncated and never counted** — with its
    destination file and key;
  - **every applied path the pack would write `0755`**, with the payload
    path it comes from;
  - **every file the pack ships under `.claude/hooks/`**, each stated
    plainly as inert — shipped, `0644`, and registered by nothing at v1.0
    (US-6), so a reader is not misled into thinking it runs.
  For every v1.0 pack the security-relevant list is **empty**, and the
  command says so rather than printing nothing.
- It reports `parameterVaryingSteps` — the steps whose inclusion depends
  on an answer — and the applied paths each would write, which is how a
  reader sees what `--calibration high-floor` changes without running it.
- It reads the pack only. It writes nothing, needs no applied project, no
  manifest and no network request.
- For a pack that fails validation it reports the offending part as
  `missing` and exits with the same class as `validate` would. For a valid
  pack it exits `0`, or `1` under `--strict` with warnings only.
- `pack info <name> --json` emits the `PackReport` verbatim, so F6 and CI
  consume the structure rather than the rendering.

---

**US-30 — Copy the pack verbatim into the project**
> As a project owner, I want the whole pack to land in my project
> untouched so that every reference document the applied project points
> at is present, local and identical to what shipped.

**Acceptance criteria:**
- Phase 1 copies the pack directory to `.harness/pack/`, preserving the
  relative path of every file. `pack.json` and `recipe.json` are copied
  with everything else.
- **Every copied file is byte-identical to the pack file.** No rename, no
  substitution, no line-ending change, no BOM handling, no
  `.template`-suffix stripping, no region processing. A test may assert
  this by hashing the raw bytes of every file on both sides and requiring
  equality, with no normalization on either side.
- The mechanism is **identical for every pack**. Phase 1 reads no field
  of `pack.json` other than the pack's location, and consults the recipe
  not at all.
- Phase 1 **does not**: create any file outside `.harness/pack/`, read
  any parameter answer, evaluate any `when`, or skip any payload file.
  The payload is not filtered by scaffold selection — an unselected
  scaffold's source still lands in the payload, because the payload is
  the pack, not the applied subset.
- Phase 1 **does** validate, and only this:
  - **Path confinement.** Every payload-relative path satisfies the
    grammar of US-3 stage 1 (minus the trailing-slash rule), and the
    destination `.harness/pack/<relative>` is confined by the same
    resolution gate as any other write. A violation is
    `E-PAYLOAD-PATH-INVALID`, exit 2.
  - **No symlinks.** Any symlink under the pack directory is
    `E-SYMLINK-IN-PACK`, exit 2. Links are neither followed nor
    reproduced.
  - **Traversal bounds** (C-17). The walk is depth ≤ **32** and ≤
    **10,000 entries**, exceeding either being `E-TRAVERSAL-LIMIT`, exit
    2. Entries are `lstat`ed, never `stat`ed.
  - **Size bounds.** A single pack file > **4 MB** is
    `E-CONTENT-TOO-LARGE`; a total payload > **32 MB** is
    `E-PAYLOAD-TOO-LARGE`, both exit 2. The payload is copied into every
    project that applies the pack and committed there, so its size is a
    property users pay for.
- Every phase-1 write is journalled and rolled back exactly as a phase-2
  write is (US-13). Phase 1 is not privileged; it is only simpler.
- **Nothing else in the product reads the bundled pack after phase 1.**
  Phase 2 resolves every `from` against `.harness/pack/` (Q-41). A test
  may assert this by making the bundle unreadable between the phases and
  requiring the apply to complete.
- The user cannot inspect or modify the payload between the phases at
  v1.0. Both phases run inside one `init` invocation.

---

**US-31 — Apply a pack by a declared recipe, not by a script**
> As a project owner, I want everything a pack does to my project to be
> declared in advance over a fixed set of operations so that I can see
> what it will do before it does it, and so that no pack can do something
> the format did not anticipate.

**Acceptance criteria:**
- `recipe.json` carries `formatVersion` (integer), `steps` (an ordered
  array) and optionally `scaffolds` (an object mapping scaffold id to an
  ordered array of steps).
- Every step has an `op` naming exactly one of the **seven primitives**:
  `copy`, `rename`, `strip-suffix`, `rewrite-path`, `substitute`,
  `generate`, `merge-json`. **The set is closed.** An `op` outside it
  fails with **`E-RECIPE-PRIMITIVE-UNKNOWN`**, exit 2, listing the seven
  verbatim and stating that a new step requires a new primitive in the
  CLI. There is no `exec`, no `script`, no `shell` and no escape hatch of
  any kind.
- A step whose inputs are wrong for its `op` — a missing required field,
  a field the primitive does not take, a directory `from` on a
  file-only primitive, a compound `when` — fails with
  **`E-RECIPE-STEP-INVALID`**, exit 2, naming the step index, the `op`
  and the offending field.
- A `recipe.json` that is unparseable, or whose top-level shape is wrong,
  fails with **`E-RECIPE-INVALID`**, exit 2.
- **Steps run in declared order**, base steps first, then the steps of
  each selected scaffold in `pack.json`-declared scaffold order. A step
  may read a file an earlier step wrote; it may not read a file a later
  step will write.
- **The recipe is a pure function of (payload, parameter answers).** It
  reads no clock, no environment variable, no network, no user, no
  hostname, no locale and no path outside `.harness/pack/` and the
  project's own applied paths. No primitive emits a timestamp, an
  absolute path, a username or a random value.
- **Two applies of the same pack version with the same answers and
  scaffolds produce byte-identical trees.** This is testable directly and
  is the acceptance criterion the whole model rests on.
- Every destination a step writes passes the four-stage confinement gate
  of US-3. A step may not write under `.harness/`.
- `pack info` renders the complete step list before an apply (US-29), and
  `validate` renders every parameter combination of it (US-16).

---

**US-32 — Generate a document with inert region anchors**
> As a project owner, I want a generated `CLAUDE.md` that a future
> `update` will be able to maintain, without paying for region machinery
> that nothing uses yet.

**Acceptance criteria:**
- **`generate`** — `{ "op": "generate", "template", "to", "anchors":
  [<id>, …], "when"? }`. It reads one payload template, resolves
  `{{harness:…}}` tokens in it exactly as `substitute` does, asserts the
  declared anchor set, and writes `to`.
- An anchor is the literal pair of lines
  `<!-- harness:region id=<id> -->` and `<!-- harness:end -->`, written
  into the template by the pack author and carried through to the output
  unchanged. `<id>` matches `^[a-z][a-z0-9-]{0,31}$`.
- **Anchors are inert.** Nothing at v1.0 parses them, hashes them,
  merges into them or reports on them. They are text in a Markdown
  comment, present so that v1.1's `update` has something to find.
- The assertion `generate` performs is a **literal line count, not a
  grammar**: for each declared id, the exact anchor opening line must
  appear **exactly once** in the rendered output, and the number of
  `<!-- harness:end -->` lines must equal the number of declared anchors.
  Failure is **`E-ANCHOR-INVALID`**, exit 2, naming the id and whether it
  was missing, duplicated or unbalanced.
- **What is explicitly NOT implemented** (Q-45): no region parser, no
  nesting rules, no fenced-code-block exemption, no per-region hash, no
  region ordering rule, no orphan handling, no malformed-marker
  diagnostics and no `E-REGION-TAMPERED`. A marker inside a fenced code
  block in a template will be counted by the literal scan, and a pack
  author who wants to *document* the anchor syntax must therefore not use
  a declared id in the example. That is a real limitation of a
  deliberately trivial check, and it is stated rather than engineered
  around.
- `generate` is the only primitive that asserts anything about a file's
  internal structure, and the assertion is one line of counting. If a
  pack needs no anchors it uses `rename` plus `substitute` instead.
- The coding pack's `CLAUDE.md.template` → `CLAUDE.md` is the only
  `generate` step in any v1.0 pack, with anchors `overview`, `layout`,
  `process`, `agents`, `conventions`, `targets`.

---

**US-33 — Recompute the applied tree and check it**
> As a project owner, I want to be able to prove that what is in my
> project is what the pack and my answers say should be there, so that
> "applied correctly" is a checked fact rather than a claim.

**Acceptance criteria:**
- `lintel-harness verify` reads `.harness/manifest.json` and
  `.harness/pack/`, re-runs phase 2 **entirely in memory**, and compares
  the result to the project on disk. It writes nothing, ever — including
  no lock and no journal.
- The recomputation uses **only** `.harness/pack/` (payload and recipe),
  the manifest's `parameters` and the manifest's `scaffolds`. It does not
  read the bundled pack, does not use the network, and does not need the
  CLI that performed the apply to still be installed. This is the whole
  of Q-43's argument, made checkable.
- It reports three states per recomputed path: `match`, `differs` and
  `missing`. Comparison is over normalized content for text (§NFR) and
  raw bytes for binary; a CRLF checkout on Windows and an added UTF-8 BOM
  both report `match`.
- The executable bit is compared where the platform represents it. On
  Windows it is not compared, and the report says so rather than implying
  a check ran.
- Files in the project that the recipe does not produce are **not**
  reported. `verify` answers "is what the pack wrote still what the pack
  would write", not "what else is in this repo".
- Any `differs` or `missing` exits **1** with `E-VERIFY-MISMATCH`,
  listing the first ten paths and the total count. An all-`match` run
  exits `0` and prints the count of paths checked.
- `verify --json` emits the same structure, so CI can gate on it.
- The project scan `verify` performs is the bounded walk of C-17: depth ≤
  32, ≤ 10,000 entries, `lstat` only, never following a symlink
  (`W-SCAN-SYMLINK-SKIPPED`), and never descending into `.git/`, `.hg/`,
  `.svn/` or `node_modules/`.
- **What `verify` cannot tell you at v1.0, stated plainly:** it trusts
  `.harness/pack/`. A payload edited by hand yields a recomputed
  expectation that matches the edited applied tree, and `verify` reports
  `match`. Detecting that needs a payload digest the minimal manifest
  does not carry — see Q-52.
- This repo passes `lintel-harness verify` after S7's re-init, and that
  is the acceptance test for S7.

---

## Error States

**This table is the product's only message catalogue, and F1's `E-`/`W-`
codes with its `0/1/2/3` exit classes are the only CLI error model.** No
other feature spec defines a CLI code, an exit code or a diagnostic
string; F5 owns user-facing text only for strings a *pack ships* — a
slash command's block message, an agent's halt, a target run's ABORT —
which are pack content, not CLI diagnostics. **The code is the stable
contract**: F6 and CI branch on the code and never on prose. Message text
is verbatim within a minor version and may be reworded across one.

**Severity is a property of the code, not of the occasion.** A scenario
that is fatal in one context and tolerable in another gets **two codes**,
not one code with two severities. Every row below carries exactly one
severity, and no consumer may reinterpret one.

Message convention: line 1 states the failure and begins
`lintel-harness:`; subsequent lines are indented two spaces; a line
beginning `→` states the remedy. `{…}` marks an interpolated value.
Messages are written to stderr; warnings are written to stderr and do not
change the exit code.

| Scenario | Expected Behaviour |
|---|---|
| `E-PACK-CLI-TOO-OLD` — pack requires a newer CLI | Exit 1. `lintel-harness: pack {name}@{version} needs lintel-harness {minCliVersion} or newer.` / `  You are running {cliVersion}.` / `  → Upgrade with: npm i -g @lintel/harness@latest` |
| `E-PACK-FORMAT-NEWER` — `formatVersion` unknown | Exit 2. `lintel-harness: pack {name} uses pack format {n}; this CLI understands up to {m}.` / `  → Upgrade the CLI, or use a pack built for format {m}.` |
| `E-ANATOMY-MISSING` — one of the nine parts is undeclared, or declares neither a content source nor `"status": "absent"` | Exit 2. `lintel-harness: pack {name} does not declare the anatomy part "{part}".` / `  A pack must declare all nine parts. Declare it, or mark it absent with a reason:` / `    "{part}": { "status": "absent", "reason": "…" }` |
| `E-ANATOMY-EMPTY` — a declared part matches no files | Exit 2. `lintel-harness: anatomy part "{part}" in pack {name} matches no files.` / `  Patterns: {globs}` / `  → Fix the paths, or mark the part absent with a reason.` |
| `E-ANATOMY-NO-REASON` — `"status": "absent"` with no reason | Exit 2. `lintel-harness: anatomy part "{part}" in pack {name} is absent without a reason.` / `  An absent part must say why it is absent.` / `  → "{part}": { "status": "absent", "reason": "…" }` |
| `E-ANATOMY-NO-NOTE` — `"status": "provisional"` with no note | Exit 2. `lintel-harness: anatomy part "{part}" in pack {name} is provisional without a note.` / `  A provisional part must say what is unsettled about it.` / `  → "{part}": { "paths": […], "status": "provisional", "note": "…" }` |
| `E-ANATOMY-SOURCE-ON-ABSENT` — a content source alongside `"status": "absent"` | Exit 2. `lintel-harness: anatomy part "{part}" in pack {name} is declared absent but also declares content ("{sourceKey}").` / `  A part cannot both not exist and have content, and lintel-harness will not guess which was meant.` / `  → Remove "{sourceKey}", or drop "status": "absent".` A contradiction, not an unknown key: US-2 keeps redundancy as a warning. |
| `E-UNKNOWN-VALUE` — an unrecognised value in a behaviour-selecting position (US-1) | Exit 2. `lintel-harness: "{value}" is not a valid {field}.` / `  Allowed: {allowed}` / `  → Fix the value, or upgrade to a lintel-harness that understands it.` Used wherever the position has no more specific code. Unknown **keys** stay a warning; unknown **values** are never ignored, because ignoring one runs behaviour the pack did not ask for. |
| `W-ANATOMY-ABSENT` — a part is declared absent (at init) | Warning, exit unchanged. `lintel-harness: pack {name} declares no {part}.` / `  Reason given: {reason}` |
| `W-ANATOMY-PROVISIONAL` — a part is declared provisional | Warning, exit unchanged. `lintel-harness: pack {name} ships {part} as provisional.` / `  Note: {note}` |
| `E-RECIPE-MISSING` — `pack.json` names a recipe the pack does not contain | Exit 2. `lintel-harness: pack {name} declares "recipe": "{path}", which is not in the pack.` / `  Phase 2 has nothing to run, so applying this pack would produce a payload and nothing else.` / `  → Add {path}, or correct the "recipe" path.` |
| `E-RECIPE-INVALID` — `recipe.json` is unparseable or its top-level shape is wrong | Exit 2. `lintel-harness: {path} is not a usable recipe ({detail}).` / `  A recipe is { "formatVersion": <int>, "steps": [ … ], "scaffolds"?: { … } }.` / `  → Fix the file, then re-run validate.` |
| `E-RECIPE-PRIMITIVE-UNKNOWN` — a step declares an `op` outside the closed set | Exit 2. `lintel-harness: step {index} declares op "{op}", which is not a lintel-harness primitive.` / `  The seven primitives are: copy, rename, strip-suffix, rewrite-path, substitute, generate, merge-json.` / `  The set is closed. A pack cannot add a step type; a new primitive is a change to the CLI.` / `  → Express the step with an existing primitive, or open it as a CLI change.` |
| `E-RECIPE-STEP-INVALID` — a step's inputs are wrong for its primitive | Exit 2. `lintel-harness: step {index} ("{op}") is not usable: {reason}.` / `  {usage for that primitive}` / `  → Fix the step.` `{reason}` names the offending field — a missing `to`, a directory `from` on a file-only primitive, a `when` with more than one key, a `rewrite-path` whose `in` matches nothing the recipe has written by that point, a scaffold with no steps. |
| `E-RECIPE-SOURCE-MISSING` — a step's `from` names nothing in the payload | Exit 2. `lintel-harness: step {index} ("{op}") reads "{from}", which is not in the pack.` / `  Phase 2 reads only .harness/pack/, so every "from" must exist in the pack itself.` / `  → Correct the path, or add the file to the pack.` |
| `E-PAYLOAD-PATH-INVALID` — a pack-relative path is not a legal path | Exit 2. `lintel-harness: "{path}" in pack {name} is not a legal pack path.` / `  {construct}` / `  → Rename it. Pack paths are "/"-separated, NFC, relative, with no "..", no backslash, no drive letter and no segment ending in "." or whitespace.` |
| `E-PAYLOAD-TOO-LARGE` — the whole payload exceeds the size bound | Exit 2. `lintel-harness: pack {name} totals {size}; the limit for a pack payload is 32 MB.` / `  The payload is copied into and committed by every project that applies the pack.` / `  → Remove content, or split the pack.` |
| `E-MAP-ESCAPES-ROOT` — a `to` leaves the project | Exit 2. `lintel-harness: step {index} writes "{to}", which resolves outside the project root.` / `  → Applied paths must be relative and must stay inside the project.` |
| `E-MAP-COLLISION` — two steps write one path | Exit 2. `lintel-harness: two steps both write "{path}".` / `  step {a}: {opA} {fromA}` / `  step {b}: {opB} {fromB}` / `  → A recipe may write each applied path exactly once.` |
| `E-MAP-CASE-COLLISION` — two applied paths differ only by letter case. **Folding is defined**: two paths collide when their *collision keys* are equal, where a collision key is the applied path NFC-normalized **and then** case-folded (US-3). Computed over the merged step set — base plus every scaffold | Exit 2. `lintel-harness: "{a}" and "{b}" differ only by letter case.` / `  On macOS and Windows these are the same file.` / `  → Rename one of them in the pack.` |
| `E-MAP-NORM-COLLISION` — two applied paths collide after Unicode normalization, and the collision is **not** a case difference | Exit 2. `lintel-harness: "{a}" and "{b}" are two byte sequences for the same filename.` / `  They differ only in Unicode normalization (NFC vs NFD), so macOS stores them as one file.` / `  → Write both "to" values in NFC, using the same code points.` |
| `E-MAP-PATH-GRAMMAR` — a `to` value does not match the anchored applied-path grammar of US-3 | Exit 2. `lintel-harness: step {index} writes "{to}", which is not a legal applied path.` / `  {construct}` / `  → An applied path is one or more "/"-separated segments, relative, NFC, with no "..", no backslash, no drive letter and no segment ending in "." or whitespace.` The `{construct}` line names the specific offence — leading separator, backslash, drive-relative prefix, UNC prefix, dot segment, trailing dot or whitespace, reserved Windows basename, or non-NFC. |
| `E-MAP-RESERVED-DEST` — an applied path resolves into a reserved destination | Exit 2. `lintel-harness: step {index} writes "{to}", which resolves into "{reserved}".` / `  Reserved: .git/ .hg/ .svn/ .harness/ and the directory lintel-harness itself is installed in.` / `  A recipe step may never write under .harness/ — that is where the payload it reads from lives.` / `  → Choose a destination inside the project that lintel-harness does not own.` Checked after resolution, so it applies equally to a base step, a scaffold step and an `executableRoots` entry. |
| `E-DEST-SYMLINK` — a destination, or an ancestor of one, is a symlink, junction or other reparse point | Exit 2. `lintel-harness: "{component}" on the way to "{path}" is a symbolic link.` / `  lintel-harness does not traverse or create through a link, because where a link points is not something this project controls.` / `  → Replace the link with a real directory, or apply into a tree that has none.` Raised at plan time and again immediately before the write. |
| `W-PATH-NON-NFC` — a source basename discovered by directory recursion is not NFC | Warning. `lintel-harness: "{path}" is not in Unicode NFC; its applied path has been normalized.` / `  An NFD name would not match the same file on Linux.` |
| `E-EXEC-ROOT-UNDECLARED` — `executable: true` outside every declared `executableRoots` prefix | Exit 2. `lintel-harness: step {index} sets the executable bit on "{to}", outside every declared executableRoots prefix.` / `  Declared: {roots}` / `  → Add the destination's prefix to "executableRoots", or drop "executable": true.` |
| `E-EXEC-DEST-FORBIDDEN` — an executable lands, or an `executableRoots` prefix resolves, under a forbidden directory | Exit 2. `lintel-harness: "{path}" may not be executable.` / `  A pack may never write an executable file under .claude/ .git/ .hg/ .svn/ or .harness/.` / `  → Ship the script as an ordinary 0644 file, or place it elsewhere in the project.` Checked at declaration and again per applied path. |
| `E-EXEC-TOO-MANY` — more than 32 executable files in one apply | Exit 2. `lintel-harness: this apply would write {n} executable files; the limit is 32.` / `  → Reduce the number of executables, or raise the limit in an ADR of its own.` |
| `E-REWRITE-UNUSED` — a `rewrite-path` step matches nothing | Exit 2. `lintel-harness: step {index} rewrites "{find}" → "{replace}", which matched nothing in {globs}.` / `  A rewrite that no longer applies is stale.` / `  → Remove the step, or fix its "in" patterns.` |
| `E-SUBST-UNRESOLVED` — a `{{harness:…}}` token is left in output | Exit 2. `lintel-harness: unresolved {{harness:{token}}} in {path}:{line}.` / `  → Declare a parameter named "{id}", add the token to the step's "tokens" list, or remove the token.` Nothing is written. |
| `E-SUBST-IN-SECURITY-KEY` — a `{{harness:…}}` token in a value that lands under a security-relevant owned key | Exit 2. `lintel-harness: {path}:{line}: "{key}" is a security-relevant setting and its value may not be substituted.` / `  A permission is a decision the pack author makes, not one a user makes by answering a prompt.` / `  → Write the value literally in the pack.` Raised at validate time, per parameter combination. **No override exists.** |
| `E-SUBST-NEWLINE` — a substituted value contains a line break | Exit 2. `lintel-harness: the answer for "{id}" contains a line break and cannot be substituted into "{path}".` / `  A single answer may not become two lines of a generated file.` / `  → Answer on one line, or tighten the parameter's "pattern".` Triggered by `\n`, `\r`, `U+2028` or `U+2029`. Holds even when a parameter's `pattern` is weak, which is why it exists separately from `E-PARAM-INVALID`. |
| `E-ANCHOR-INVALID` — a `generate` step's declared anchor is missing, duplicated or unbalanced | Exit 2. `lintel-harness: step {index} declares anchor "{id}", which {reason} in the rendered "{to}".` / `  An anchor is the exact line <!-- harness:region id={id} --> closed by <!-- harness:end -->, and each declared anchor must appear once.` / `  → Fix the template, or drop the anchor from the step.` `{reason}` is `does not appear`, `appears {n} times` or `leaves {n} unclosed anchors`. The check is a literal line count, not a grammar — v1.0 has no region parser (Q-45). |
| `E-PARAM-MISSING` | Exit 1. `lintel-harness: parameter "{id}" is required and has no answer.` / `  {prompt}` |
| `E-PARAM-INVALID` | Exit 1. `lintel-harness: "{value}" is not a valid answer for "{id}".` / `  Allowed: {values}` Raised both when an answer is collected and when one is read back from the manifest. |
| `E-PARAM-UNDECIDABLE` | Exit 2. `lintel-harness: parameter "{id}" selects recipe steps but is neither required nor given a default.` / `  → Add "required": true, or a "default".` |
| `E-PARAM-COMBINATORICS` | Exit 2. `lintel-harness: pack {name} has {n} parameter combinations to validate; the limit is 32.` / `  → Reduce step-selecting parameters, or split the pack.` |
| `E-PARAM-FLAG-INVALID` — a declared `flag` alias is malformed or collides | Exit 2. `lintel-harness: parameter "{id}" declares the flag alias "--{flag}", which {reason}.` / `  Reserved: --set, --scaffold, --json, --strict, --force, --rollback, --all, --accept-permissions, --accept-hooks` / `  → Choose a kebab-case alias that is not reserved and not already used by another parameter.` |
| `E-PARAM-NO-PATTERN` — a `type: "string"` parameter declares no `pattern` | Exit 2. `lintel-harness: parameter "{id}" is a string and declares no "pattern".` / `  Every string answer is recorded verbatim in a committed manifest and replayed on every verify, so its shape must be declared.` / `  → Add an anchored pattern, e.g. "pattern": "^[\p{L}\p{N} ._-]{1,64}$"` |
| `E-PARAM-PATTERN-INVALID` — a declared `pattern` is unanchored, uncompilable, over-long, uses a backreference or lookaround, or is declared on `enum` / `boolean` | Exit 2. `lintel-harness: the "pattern" on parameter "{id}" is not usable ({reason}).` / `  A pattern must start ^, end $, be at most 200 characters, and use no backreference and no lookaround.` / `  → Simplify it, or drop it if the parameter is an enum or a boolean.` |
| `E-PARAM-SECRET-SUSPECTED` — a parameter's `id` or `prompt` names a credential | Exit 2. `lintel-harness: parameter "{id}" looks like it asks for a credential.` / `  Every answer is written verbatim into .harness/manifest.json, which this project commits to version control. An answer is exactly as public as the repository.` / `  → Remove the parameter, or declare "notASecret": true if the name is a false alarm.` The matcher is `api[_-]?key\|private[_-]?key\|secret\|token\|passwo?rd\|credential\|connection.?string`, case-insensitive; a bare `key` deliberately does not match, so `sortKey` and `keyword` are not false positives. |
| `W-ANSWER-LOOKS-SECRET` — an answer's *value* looks like a credential | Warning. `lintel-harness: the answer for "{id}" looks like a credential.` / `  It will be written into .harness/manifest.json, which this project commits.` Triggered by `-----BEGIN`, `sk-`, `ghp_`, `xox[baprs]-`, or ≥ 40 characters of high-entropy base64url. A warning and never an error: an error here is a false-positive machine. |
| `E-SCAFFOLD-UNKNOWN` — an unknown id given to `--scaffold` | Exit 1. `lintel-harness: pack {name} has no scaffold "{id}".` / `  Available: {ids}` A pack/recipe scaffold mismatch is a different fault and is `E-RECIPE-STEP-INVALID`, exit 2 — severity is a property of the code, not of the occasion. |
| `E-SCAFFOLD-EXCLUSIVE` — two selected scaffolds share a category | Exit 1. `lintel-harness: "{a}" and "{b}" are alternatives, not additions — both are "{category}" scaffolds.` / `  Pick one.` / `  Available {category} scaffolds: {ids}` This is the choose-one diagnostic; a path collision would have been technically true and practically misleading. |
| `E-SCAFFOLD-COLLISION` — two scaffolds of different categories write one path | Exit 2. `lintel-harness: scaffolds "{a}" and "{b}" both write "{path}".` / `  They are in different categories, so a user may select both.` / `  → Give them one category if they are alternatives, or move the shared file into the base recipe.` |
| `E-TARGET-EXISTS` — init into a non-empty tree | Exit 1. `lintel-harness: {n} files already exist where this pack would write.` / `  {first ten paths, one per line, two-space indented}` / `  → Apply into an empty directory, or re-run with --force to keep byte-identical files and stop on the rest.` |
| `E-ALREADY-APPLIED` — the project already has `.harness/` | Exit 1. `lintel-harness: this project already has {pack}@{version} applied.` / `  Re-applying is not supported in v1.0; update lands in v1.1.` / `  → Apply into a fresh directory, or remove .harness/ by hand if you mean to start over.` Zero bytes written. Named without a pack when the manifest is unreadable. |
| `E-JOURNAL-PRESENT` — a previous apply crashed | Exit 2. `lintel-harness: a previous apply did not finish.` / `  {n} files were being written when it stopped.` / `  → lintel-harness init --rollback   remove exactly what that apply wrote` |
| `E-JOURNAL-UNREADABLE` — `.harness/journal.json` declares a `version` other than `2`, or cannot be parsed | Exit 2. `lintel-harness: .harness/journal.json is not a journal this CLI can act on ({detail}).` / `  lintel-harness will not guess what a previous apply was doing.` / `  → Remove .harness/journal.json by hand once you have checked the project, or restore it from version control.` Fail-closed: journal version 1 never shipped, and this check exists so that it never can. |
| `E-TARGET-RACE` — a write target changed between plan and write | Exit 2. `lintel-harness: "{path}" changed while lintel-harness was writing.` / `  {detail}` / `  Nothing further was written; the journal is intact.` / `  → lintel-harness init --rollback, then re-run.` `{detail}` is one of `it appeared after the plan said it did not exist`, `it is no longer a regular file`, or `its contents no longer match what the plan read`. |
| `W-ROLLBACK-KEPT` — rollback declined to touch a path | Warning within the rollback report. `lintel-harness: kept "{path}" — it has changed since it was written.` Rollback continues and exits 0 with the count of kept files. |
| `E-LOCK-HELD` — another command holds the project lock | Exit 1. `lintel-harness: another lintel-harness command is running in this project (pid {pid} on {host}, since {startedAt}).` / `  → Wait for it to finish, or remove .harness/lock if you are certain it is not running.` A lock whose pid is alive, or whose host is not this one, is **never** broken automatically. |
| `W-LOCK-STALE-BROKEN` — a stale lock was broken | Warning. `lintel-harness: removed a stale lock left by pid {pid}, which is no longer running.` Broken only when all three hold: the recorded host is this host, the recorded pid is not alive, and the lock is older than 60 s. |
| `E-MANIFEST-MISSING` | Exit 1. `lintel-harness: no manifest at .harness/manifest.json — this project has no pack applied.` / `  → lintel-harness init <pack>   to apply one` |
| `E-MANIFEST-CORRUPT` | Exit 2. `lintel-harness: .harness/manifest.json is not readable ({detail}).` / `  → Restore it from version control, or re-apply into a fresh directory. lintel-harness will not repair a manifest.` |
| `E-MANIFEST-NEWER` | Exit 2. `lintel-harness: .harness/manifest.json was written by a newer lintel-harness (manifest version {n}; this CLI reads up to {m}).` / `  → Upgrade: npm i -g @lintel/harness@latest` |
| `W-MANIFEST-NEWER-CLI` | Warning. `lintel-harness: this project was last touched by lintel-harness {recorded}; you are running {current}.` |
| `W-PACK-NEWER-THAN-CLI` | Warning. `lintel-harness: this project has {pack}@{version}; the newest {pack} bundled with lintel-harness {cliVersion} is {bundled}.` / `  verify still works — it reads .harness/pack/, not the bundle.` |
| `E-VERIFY-MISMATCH` — the project differs from the recomputed applied tree | Exit 1. `lintel-harness: {n} of {total} applied paths do not match what this pack and these answers produce.` / `  {first ten paths, one per line, with "differs" or "missing"}` / `  → Inspect the differences, or re-apply into a fresh directory.` A `differs` is not necessarily a fault — a user may have edited a generated file deliberately — so this is exit 1 and never exit 2. |
| `E-MERGE-JSON-INVALID` — a `merge-json` target exists but is not parseable JSON, **or the merged output fails its post-serialization check** | Exit 2. `lintel-harness: "{path}" {detail}.` / `  lintel-harness will not overwrite a settings file it cannot read, and will not write one it cannot read back.` / `  → Fix or move the file, then re-run.` Nothing is written. `{detail}` is either `already exists and is not valid JSON ({parse error})` or `could not be written safely: the value at "{key}" did not survive a re-parse`. |
| `E-OWNEDKEY-FORBIDDEN` — a declared `ownedKeys` entry is not ownable at its destination, or a security-relevant key is claimed via a parent rather than a leaf | Exit 2. `lintel-harness: step {index} writes "{to}" and may not own "{key}".` / `  {reason}` / `  Ownable at this destination: {ownable}` / `  → Declare only the specific leaf keys the pack sets.` `{reason}` is one of: `that key is not in this destination's ownable set`; `"{key}" resolves to an object; a security-relevant key must be declared as its own leaf`; or `hooks are not registrable by a pack at v1.0 — see lintel-harness pack info`. Raised at validate time, so such a pack never reaches a consent prompt. |
| `E-SETTINGS-MODE-FORBIDDEN` — a primitive other than `merge-json` targets `.claude/settings.json` or `.claude/settings.local.json` | Exit 2. `lintel-harness: "{to}" may only be written by a merge-json step; step {index} is a "{op}".` / `  Any other primitive would replace the file wholesale and bypass the rules on what a pack may own there.` / `  → Change the step, or write to a different file.` |
| `E-SETTINGS-CONSENT-REQUIRED` — the plan grants a security-relevant setting and consent was declined or unavailable | Exit 1. `lintel-harness: {pack}@{version} would grant settings this project has not consented to.` / `  {the full verbatim disclosure, one value per line, two-space indented}` / `  → Re-run interactively and accept, or pass --accept-permissions to accept them all.` **Zero bytes are written**, and the gate runs before the lock is taken. Absence of a consent input means non-interactive with no blanket accept, never "granted". |
| `E-HOOKS-NOT-SUPPORTED` — `--accept-hooks` was passed | Exit 1. `lintel-harness: no pack may register an agent hook at v1.0, so there is nothing for --accept-hooks to accept.` / `  A pack may ship a script under .claude/hooks/, but nothing registers it and nothing runs it.` / `  → Remove --accept-hooks.` The flag is parsed and always fails deliberately: a flag that does not exist invites a workaround, and this one documents the boundary and reserves the name. |
| `W-HOOK-SCRIPT-INERT` — the pack ships a file under `.claude/hooks/` | Warning. `lintel-harness: "{path}" is shipped as an ordinary file and is registered by nothing.` / `  No v1.0 mechanism registers a hook, so this script does not run until something registers it by hand.` Emitted by `validate`, and the same files are listed in the init summary and in `pack info`. |
| `W-LINK-DANGLING` — a relative link or inline path reference in rendered output resolves to nothing the apply produces (US-16) | Warning. `lintel-harness: {path}:{line} refers to "{target}", which this pack does not produce.` / `  → Fix the reference, or add the file to the pack.` A reference into `.harness/pack/` that exists in the payload is correct and is not reported. |
| `E-CONTENT-TOO-LARGE` | Exit 2. `lintel-harness: "{path}" is {size}; the limit for a pack file is 4 MB.` |
| `E-SYMLINK-IN-PACK` | Exit 2. `lintel-harness: "{path}" is a symbolic link. Pack content must be regular files.` |
| `E-TRAVERSAL-LIMIT` — a directory walk exceeded its depth or entry cap | Exit 2. `lintel-harness: the walk of "{root}" exceeded the {limit} limit ({n}).` / `  Limits: depth 32, 10,000 entries per walk.` / `  → Narrow the content, or split the pack.` Applies identically to the phase-1 payload walk and the `verify` project scan, which share one bounded walk. |
| `W-SCAN-SYMLINK-SKIPPED` — the project scan met a symlink | Warning. `lintel-harness: skipped "{path}" — it is a symbolic link, and lintel-harness does not follow links out of the project.` The scan also does not descend into `.git/`, `.hg/`, `.svn/` or `node_modules/`. |
| `E-FLAG-NOT-PERMITTED` — a known flag passed to a command that does not accept it | Exit 1. `lintel-harness: --{flag} is not available on "lintel-harness {command}".` / `  It is accepted on: {commands}` / `  → Remove it, or run the command that accepts it.` Distinct from `E-CLI-UNKNOWN-FLAG`: this flag exists, and it is refused rather than ignored, because a user who typed it believed it did something. |
| `E-WRITE-FAILED` — I/O error mid-write | Exit 3. `lintel-harness: could not write "{path}" ({errno}).` / `  Nothing further was written; the project is mid-apply.` / `  → lintel-harness init --rollback` |
| `E-CLI-UNKNOWN-COMMAND` — a first positional that is not a known command | Exit 1. `lintel-harness: "{arg}" is not a lintel-harness command.` / `  Commands: init, validate, verify, pack` / `  → lintel-harness --help` |
| `E-CLI-UNKNOWN-FLAG` — a flag no command and no pack alias recognises | Exit 1. `lintel-harness: "lintel-harness {command}" does not accept --{flag}.` / `  It accepts: {flags}` / `  → lintel-harness {command} --help` Reported **only after the second argv pass**, once the resolved pack's aliases are registered (US-8) — otherwise every pack-declared alias reports falsely. |
| `E-CLI-FLAG-VALUE-MISSING` — a flag that takes a value received none | Exit 1. `lintel-harness: --{flag} needs a value.` / `  {usage}` |
| `E-CLI-ARG-UNEXPECTED` — a positional the command does not take | Exit 1. `lintel-harness: "lintel-harness {command}" does not take the argument "{arg}".` / `  {usage}` |

---

## Non-Functional Requirements

- **Hashing algorithm.** SHA-256, lowercase hex, all 64 characters, no
  truncation, no salt. Implemented with Node's `crypto` — no dependency.
  It is used in exactly three places at v1.0: the journal's intended and
  pre-apply hashes (US-13), `--force` byte-identity (US-13), and
  `verify`'s comparison (US-33). **It is not used in the manifest**,
  which records no hash of anything (Q-43).
- **Normalization before hashing or comparing (text files).** In this
  exact order: (1) strip a leading UTF-8 BOM; (2) replace every `\r\n`
  and every lone `\r` with `\n`. Nothing else is changed — trailing
  whitespace, blank lines and the presence or absence of a final newline
  are all significant. Two projects whose files differ only in line
  endings compare equal.
- **Binary files.** A file whose bytes are not valid UTF-8, or whose
  first 8 KB contain a NUL byte, is treated as binary: copied verbatim,
  compared raw with no normalization, and excluded from `substitute`,
  `rewrite-path`, `generate` and `merge-json`.
- **Phase 1 does no normalization at all.** The payload copy is raw
  bytes in and raw bytes out, including BOMs and CRLF, so
  `.harness/pack/` is byte-identical to the pack directory. Normalization
  belongs to phase 2's comparisons, not to the copy.
- **Encoding.** UTF-8 only for text produced by phase 2. A BOM is never
  emitted by a phase-2 primitive. No other encoding is read or produced.
- **Determinism.** Phase 2 is a pure function of (payload, parameter
  answers, scaffold selection). No timestamps, absolute paths, usernames,
  hostnames, locale-dependent formatting or random values may appear in
  any generated file **or in the manifest**. There are **no timestamps
  anywhere in the output**, which is what makes "byte-identical trees"
  true of the whole project rather than of everything except one file.
- **Performance.** On a pack of ≤ 500 files totalling ≤ 8 MB, on a 2020
  laptop-class machine with a warm filesystem cache: full validation and
  in-memory phase-2 render ≤ 1.5 s; phase 1's copy ≤ 0.5 s; phase 2's
  write ≤ 0.5 s; total `init` ≤ 3 s excluding time spent waiting for a
  human. `verify` over the same project completes in ≤ 1.0 s. Hashing
  throughput ≥ 50 MB/s single-threaded.
- **Memory and size bounds.** The entire phase-2 output set is held in
  memory during validation, so: single pack file ≤ 4 MB
  (`E-CONTENT-TOO-LARGE`); total payload ≤ 32 MB
  (`E-PAYLOAD-TOO-LARGE`); peak RSS ≤ 4× total rendered content.
  Phase 1 streams file by file and is not bound by the render budget.
  **Both directory walks are bounded and neither follows a link**: the
  phase-1 payload walk and the `verify` project scan share one
  implementation with maximum depth **32** and maximum **10,000 entries**
  per walk, exceeding either being `E-TRAVERSAL-LIMIT`. Entries are
  `lstat`ed, never `stat`ed. The project scan does not descend into
  `.git/`, `.hg/`, `.svn/` or `node_modules/`. A regex used anywhere on
  untrusted input is bounded by a length check that runs first (US-8), so
  pattern evaluation cannot be made to run long.
- **Atomicity.** Validate-then-write, across **both phases**. No file is
  written — payload included — until every check on both phases has
  passed. Each file is written via write-temp-then-rename, so a
  concurrent reader never sees a partial file. A journal precedes the
  write phase and is removed only after the manifest lands. A crashed
  apply is always detectable and is reversible by
  `lintel-harness init --rollback` without data loss for any file the
  user has since touched.
- **Rollback safety.** **Rollback deletes only paths this apply created,
  restores only paths this apply overwrote, and acts on neither unless
  the on-disk bytes are still exactly what this apply wrote.** A path the
  apply merely overwrote — including a `--force` byte-identical
  collision — is restored from its recorded backup or left alone, never
  deleted. It never deletes a directory that contains an unrecorded file,
  and it removes created directories in reverse creation order and only
  when empty. The five cases are enumerated exhaustively in US-13.
- **Idempotency.** Two applies into two empty directories with identical
  inputs produce byte-identical trees and byte-identical manifests. There
  is no in-place re-apply at v1.0 (US-14).
- **Cross-platform.** Identical trees and identical manifests on macOS,
  Linux and Windows, modulo the executable bit, which Windows does not
  represent and which `verify` does not compare there. Case-only and
  normalization-only collisions are rejected at validation so a pack
  cannot be applicable on Linux but broken on macOS.
- **No network.** `init`, `validate`, `verify` and `pack info` make no
  network request. Packs are bundled (Q-2); the payload is local (Q-41).
- **Offline privacy.** Nothing about a project or its parameter answers
  leaves the machine. There is no telemetry.
- **Concurrency.** Commands that write take an advisory lock at
  `.harness/lock`; a second concurrent command in the same project fails
  fast rather than interleaving writes. **The lock is never broken
  silently.** It holds `{ pid, host, startedAt, cli }` and is acquired
  with an exclusive create. On finding one already present, it is broken
  **only** when all three hold: the recorded `host` is this host, the
  recorded `pid` is not alive, and `startedAt` is older than 60 s —
  reported as `W-LOCK-STALE-BROKEN`. Otherwise the command fails with
  `E-LOCK-HELD`, exit 1. `verify` takes no lock, because it writes
  nothing. The consent gate of US-13 runs *before* the lock is taken, so
  a declined apply does not contend for it.
- **Filesystem safety — confinement is by resolution, not by string.**
  The project root is resolved once per run with `realpath()`, and every
  applied path is judged against the *resolved* root. Below it: every
  ancestor component is `lstat`ed and the CLI refuses to traverse or
  create through a symlink, junction or other reparse point
  (`E-DEST-SYMLINK`); needed directories are created one level at a time,
  each checked before the next; and the resolved parent joined with the
  final basename must be a **strict descendant** of the resolved root.
  Applied paths are additionally checked against the reserved-destination
  denylist on the **resolved** path (`.git/`, `.hg/`, `.svn/`,
  `.harness/`, and the CLI's own install directory), and against the
  anchored grammar of US-3 — which is where reserved Windows basenames
  and characters illegal on Windows are rejected, as one rule rather than
  several. No symlink is written, and none is followed out of the pack.
  Every applied path is produced by that single gate and carries a
  branded type, so a path that skipped it cannot reach a writer without a
  compile error; each write re-checks immediately beforehand and creates
  exclusively (`E-TARGET-RACE`).
- **Bounded capability.** A pack's entire effect on a machine is the
  seven primitives applied to confined paths. There is no code execution
  path from a pack to the host at v1.0: no script primitive, no hook
  registration, no `postinstall`, no command-valued settings key. This is
  an invariant of the format, checkable by inspection of the primitive
  set, and it is the property `E-RECIPE-PRIMITIVE-UNKNOWN` exists to
  protect.
- **Legibility (G6).** `pack.json`, `recipe.json` and the manifest are
  readable by a human without tooling: 2-space-indented JSON, stable key
  order. The manifest fits on a screen, which is a deliberate consequence
  of Q-43 rather than an accident.

---

## Flows / Behaviour

### F1.1 — The two phases

| | Phase 1 — payload | Phase 2 — application |
|---|---|---|
| **What** | Verbatim copy of the pack folder | Copies out and wires up the working parts |
| **Destination** | `.harness/pack/` | Project root, `.claude/`, `copy/`, scaffold dirs |
| **Varies by pack?** | **No** — identical mechanism for every pack | **Yes** — each pack ships its own recipe |
| **Transformation** | None | Renames, path rewrites, substitution, generation, JSON merge |
| **Reads from** | The bundled pack in the CLI | `.harness/pack/` (Q-41), never the bundle |
| **Run by** | The CLI, automatically | The CLI, automatically — never the user (Q-40) |
| **Validation** | Path confinement, no symlinks, traversal and size bounds | The whole of §Error States |

Phase 1 is a dumb copy on purpose. Because it transforms nothing, it
cannot fail in an interesting way, and the result is byte-identical to
the pack that shipped. Everything that varies is pushed into phase 2,
where it is declared and inspectable.

### F1.2 — The recipe: seven primitives

Every step carries an `op`, and may carry `when`. Every `to` passes the
four-stage confinement gate of US-3.

| `op` | Required | Optional | Reads | Writes |
|---|---|---|---|---|
| `copy` | `from`, `to` | `exclude`, `executable`, `when` | payload file or directory | applied path(s), basenames unchanged |
| `rename` | `from`, `to` | `when` | payload **file** | one applied path, basename may differ |
| `strip-suffix` | `from`, `to`, `suffix` | `exclude`, `executable`, `when` | payload file or directory | applied path(s) with `<suffix>` dropped from the basename |
| `rewrite-path` | `in`, `find`, `replace` | `when` | applied text files already written | the same files, in place |
| `substitute` | `in` | `tokens`, `when` | applied text files already written | the same files, in place |
| `generate` | `template`, `to`, `anchors` | `when` | payload template | one applied path, substituted, anchors asserted |
| `merge-json` | `from`, `to`, `ownedKeys` | `when` | payload JSON + existing destination | one applied JSON path, declared keys only |

**Validation per primitive**

| `op` | Checks, in addition to the destination gate |
|---|---|
| `copy` | `from` exists (`E-RECIPE-SOURCE-MISSING`); directory `from` implies directory `to`; a file `from` must not change basename; `exclude` globs are relative to `from`; `executable` obeys `executableRoots` |
| `rename` | `from` is a single file, not a directory (`E-RECIPE-STEP-INVALID`) |
| `strip-suffix` | `suffix` matches `^\.[a-z0-9-]{1,16}$`; at least one selected basename carries it |
| `rewrite-path` | `in` matches at least one path already written by an earlier step; `find` matches at least once (`E-REWRITE-UNUSED`); neither `find` nor `replace` contains a line break |
| `substitute` | every `{{harness:…}}` token resolves (`E-SUBST-UNRESOLVED`); no substituted value contains a line break (`E-SUBST-NEWLINE`) |
| `generate` | anchors appear exactly once each and are balanced (`E-ANCHOR-INVALID`); substitution rules as above |
| `merge-json` | `ownedKeys` allowed at the destination (`E-OWNEDKEY-FORBIDDEN`); leaf-only for security-relevant roots; destination parses (`E-MERGE-JSON-INVALID`); output re-parses and deep-equals |

**Ordering.** Steps run in declared order: base `steps`, then each
selected scaffold's steps in `pack.json`-declared scaffold order. The
placing primitives (`copy`, `rename`, `strip-suffix`, `generate`) create
applied paths; the editing primitives (`rewrite-path`, `substitute`)
operate on paths that already exist. A recipe that edits before it places
fails validation rather than silently doing nothing.

**Determinism.** No primitive reads a clock, an environment variable, the
network, a hostname, a username or a locale. No primitive produces output
that depends on the order in which the filesystem returns directory
entries: a directory recursion is walked in **byte-ascending path
order**. Two applies of the same pack version with the same answers
produce byte-identical trees.

**Conditional steps.** `"when": { "<paramId>": "<value>" }` on any step
skips it unless the recorded answer equals that value. This is the only
mechanism by which pack content varies with an init answer, and the
`planning` pack's `calibrations/<name>/` layout is a convention over it:

```json
{ "op": "copy", "from": "calibrations/high-floor/",      "to": "portfolio/",
  "when": { "constraintFloor": "high-floor" } },
{ "op": "copy", "from": "calibrations/near-zero-floor/", "to": "portfolio/",
  "when": { "constraintFloor": "near-zero-floor" } }
```

Both source trees ship in the payload and both land in `.harness/pack/`;
only one is copied out. That is a deliberate consequence of phase 1
copying verbatim — the user can read the calibration they did not choose,
which is a feature, and it is why `pack info` can describe both without
applying either.

### F1.3 — `pack.json` and `recipe.json`, worked against the real coding pack

`packs/coding/pack.json`:

```json
{
  "formatVersion": 1,
  "name": "coding",
  "version": "1.0.0",
  "title": "Coding — a gated spec process, 10 roles, 2 agent teams, targets",
  "minCliVersion": "1.0.0",
  "recipe": "recipe.json",

  "anatomy": {
    "process":               { "paths": ["specifications/README.md"] },
    "roles":                 { "paths": ["agents/*.md"] },
    "documentTemplates":     { "paths": ["specifications/*.template.md"] },
    "conventions":           { "paths": ["specifications/conventions.md"] },
    "coordination":          { "paths": ["agent-teams/*.md"] },
    "behaviouralGuidelines": { "paths": ["CLAUDE.md.template"] },
    "folderScaffolding":     { "declaredBy": "recipe" },
    "skillsAndAutomations":  { "paths": ["commands/*.md"] },
    "autonomyContract":      { "paths": ["targets/*.md"] }
  },

  "parameters": [
    { "id": "projectName", "type": "string", "prompt": "Project name",
      "required": true, "pattern": "^[\\p{L}\\p{N} ._-]{1,64}$", "maxLength": 64 },
    { "id": "stack", "type": "string",
      "prompt": "Primary stack, one line (appears in CLAUDE.md)",
      "default": "", "pattern": "^[\\p{L}\\p{N} ./+_-]{0,120}$", "maxLength": 120 }
  ],

  "scaffolds": [
    { "id": "backend-azure", "category": "backend",
      "description": "Azure Static Web App + Neon Postgres, Bicep + scripts" },
    { "id": "backend-aws", "category": "backend",
      "description": "AWS Lambda + CDK" }
  ]
}
```

`packs/coding/recipe.json`:

```json
{
  "formatVersion": 1,
  "steps": [
    { "op": "copy", "from": "agents/",      "to": ".claude/agents/",
      "exclude": ["README.md"] },
    { "op": "copy", "from": "commands/",    "to": ".claude/commands/" },
    { "op": "copy", "from": "agent-teams/", "to": "AgentTeams/",
      "exclude": ["README.md"] },
    { "op": "copy", "from": "targets/Run.md", "to": "targets/Run.md" },

    { "op": "strip-suffix", "from": "copy/", "to": "copy/", "suffix": ".template" },
    { "op": "rename", "from": "specifications/README.template.md",
                      "to":   "specifications/README.md" },
    { "op": "rename", "from": "specifications/project-brief.template.md",
                      "to":   "specifications/project-brief.md" },
    { "op": "copy",   "from": "skeleton/specifications/",
                      "to":   "specifications/" },

    { "op": "rewrite-path",
      "in": ["targets/Run.md", ".claude/commands/target.md"],
      "find": "template/targets/", "replace": ".harness/pack/targets/" },

    { "op": "substitute",
      "in": ["specifications/README.md", "specifications/project-brief.md",
             "AgentTeams/*.md"] },

    { "op": "generate", "template": "CLAUDE.md.template", "to": "CLAUDE.md",
      "anchors": ["overview", "layout", "process", "agents",
                  "conventions", "targets"] }
  ],

  "scaffolds": {
    "backend-azure": [
      { "op": "strip-suffix", "from": "scaffolds/backend-azure/",
        "to": "infrastructure/backend-deploy/", "suffix": ".template" }
    ],
    "backend-aws": [
      { "op": "strip-suffix", "from": "scaffolds/backend-aws/",
        "to": "infrastructure/backend-deploy/", "suffix": ".template" }
    ]
  }
}
```

Read against `CLAUDE.md` §Dogfooding's nine manual steps, this is the
whole of that log:

| Manual step | Primitive |
|---|---|
| 1 `specifications/` kit → `specifications/` | `rename` ×2 + `copy` of the skeleton; **the templates themselves stay in the payload** (Q-47) |
| 2 `agent-teams/` → `AgentTeams/` | `copy` — the directory rename is the `to` value |
| 3 `targets/` → `targets/` | `copy` of `Run.md` only; the README and the template stay in the payload |
| 4 `tone-of-voice.template.md` → `tone-of-voice.md` | `strip-suffix` |
| 5 agents + commands → `.claude/` | two `copy` steps |
| 6 path rewrites in three files | one `rewrite-path` over two files — the third, `targets/README.md`, is no longer copied out |
| 7, 8 rewrote two self-describing READMEs | **none, and none is needed** — under Q-46 that prose is deleted from the pack, so the files are correct in the payload and are never copied out |
| 9 moved the brief into `specifications/` | `rename` |

Rows 7 and 8 are the two that forced the old marked-region grammar into
existence. They now cost nothing, which is the single largest
simplification in this document.

**Note what is *not* here.** There is no `settings.json` step: the
`coding` pack ships **no default permission set**, so no v1.0 pack owns a
security-relevant key. The consent gate of US-13 and the destination
policy of US-6 are therefore enforced against the *format* while costing
exactly zero at v1.0 — no v1.0 apply prompts, and any pack that starts
asking for a permission is the first one that ever will.

**Note also** that `backend-azure` and `backend-aws` share
`"category": "backend"`. Selecting both is `E-SCAFFOLD-EXCLUSIVE`, not a
path collision on `infrastructure/backend-deploy/`. Both diagnostics are
true; only one is useful.

`skeleton/specifications/` in step 8 is how the pack creates
`specifications/general/` and `specifications/v1.0/` — see §F1.9's note
on empty directories.

### F1.4 — The manifest, worked

`.harness/manifest.json`, in full — this is not an abridgement:

```json
{
  "manifestVersion": 1,
  "cli": "1.0.0",
  "pack": {
    "name": "coding",
    "version": "1.0.0",
    "formatVersion": 1
  },
  "parameters": {
    "projectName": "Lintel Harness",
    "stack": "Node 22 / TypeScript CLI"
  },
  "scaffolds": []
}
```

What each field is *for*, since a field with no consumer is a field that
will rot:

| Field | Consumer | Why |
|---|---|---|
| `manifestVersion` | every command | Refuse a manifest a newer CLI wrote (US-15) |
| `cli` | `verify`, v1.1 `update` | Warn when a CLI behaviour change would reinterpret this project |
| `pack.name`, `pack.version` | `verify`, v1.1 `update` | "you applied `coding@1.0.0`, latest is `coding@1.4.0`" |
| `pack.formatVersion` | `verify` | The payload's format, versioned separately from the manifest's |
| `parameters` | `verify`, v1.1 `update` | Recompute the applied tree. Every declared parameter is recorded, including ones answered by default and ones that selected nothing, because a `when` must be re-evaluated against the *original* answers |
| `scaffolds` | `verify`, v1.1 `update` | Recompute exactly the same step set; never silently gain or lose one |

**What is deliberately absent, and why it can be** (Q-43): a `files`
array, per-file hashes, per-region hashes, per-owned-key records, a
`shared` array, `pack.integrity`, `appliedAt` and a manifest self-hash.
Every one of them existed to answer "what did the apply produce", and
under Q-39/Q-40 that question is answered by re-running phase 2 against
`.harness/pack/` — which is local, committed, and paired with a
deterministic recipe. The manifest records the *inputs*; the tree is a
function of them.

### F1.5 — Manifest versioning and forward compatibility

- `manifestVersion` is an integer, bumped **only** on a change that an
  older CLI would misread. Additive optional keys do not bump it.
- A CLI reads any `manifestVersion` ≤ its supported version and refuses
  anything higher (`E-MANIFEST-NEWER`, never a warning).
- Within a version, unknown keys at any level are preserved verbatim on
  rewrite, so an older CLI degrades to ignoring a newer one's data rather
  than deleting it.
- `pack.formatVersion` is recorded separately from `manifestVersion`:
  they version different things and will move at different rates.
- The manifest is not a public API. No schema is published, and no
  compatibility is promised to any consumer other than this CLI.
- **v1.1's `update` will need to add fields** — at minimum a payload
  digest (Q-52) and, if C-3 is honoured, the per-owned-key `entries` /
  `removed` records. Both are additive optional keys and neither bumps
  `manifestVersion`. That is the whole of the forward-compatibility
  claim; nothing stronger is promised.

### F1.6 — Apply lifecycle, including failure

```
  lintel-harness init <pack> [--scaffold …] [--set k=v] [--force]
   │
   ├─ 1. project already has .harness/ ?
   │        └─ journal present → E-JOURNAL-PRESENT, exit 2
   │        └─ otherwise       → E-ALREADY-APPLIED, exit 1, ZERO bytes
   ├─ 2. resolve pack from the bundle; check minCliVersion, formatVersion
   ├─ 3. validate pack.json + recipe.json (US-16 checks 1–10)
   │        └─ any failure → exit 2, ZERO bytes
   ├─ 4. collect parameter answers (prompt or --set), validating each
   │        └─ scaffold selection checked: unknown, exclusive
   ├─ 5. resolve the project root ONCE with realpath
   ├─ 6. PLAN BOTH PHASES IN MEMORY
   │        phase 1: the payload file list and its destinations
   │        phase 2: every step rendered, every applied path confined
   │        └─ any failure → exit 1 or 2, ZERO bytes
   ├─ 7. CONSENT GATE on the plan's disclosure (US-13)
   │        └─ declined, or required and unavailable →
   │           E-SETTINGS-CONSENT-REQUIRED, exit 1, ZERO bytes,
   │           and the lock was never taken
   ├─ 8. take .harness/lock  (E-LOCK-HELD, or W-LOCK-STALE-BROKEN)
   ├─ 9. write .harness/journal.json (v2: intended hash, preExisting,
   │        preHash, preMode, backup, createdDirs) covering BOTH phases
   ├─ 10. PHASE 1 — copy the payload to .harness/pack/, verbatim
   ├─ 11. PHASE 2 — run the recipe, reading .harness/pack/
   │        each write: re-confine → exclusive create → rename
   │        └─ target changed in the window → E-TARGET-RACE
   │        └─ I/O failure → E-WRITE-FAILED, journal remains
   ├─ 12. write .harness/manifest.json
   └─ 13. delete .harness/journal.json and .harness/journal.d/,
          release the lock                ← apply is now complete
```

**Everything is planned before anything is written**, including the
payload copy. **The consent gate precedes the lock**, deliberately: a
declined apply must not contend for a lock, must not leave one behind,
and must write zero bytes — including zero bytes of `.harness/`.

The journal is the whole recovery story: its presence means step 10, 11
or 12 did not finish, and its contents say exactly which paths were in
flight, what they were supposed to contain, **and what was there
before**. That last part is what makes the invariant checkable rather
than merely stated. A user who edited a file between the crash and the
rollback keeps their edit and is told about it (`W-ROLLBACK-KEPT`).

### F1.7 — The one-pack invariant

The manifest has one `pack` object. There is no array, no ordering, no
precedence rule and no ownership arbitration, because **a project holds
exactly one pack** (Q-12). A user who needs two ways of working runs two
projects side by side. This is stated here rather than only in the brief
because it is the single assumption most likely to be "helpfully" relaxed
by a later change, and relaxing it reopens the file-collision problems
that Q-12 removed rather than solved.

`.harness/pack/` reinforces it: there is one payload directory, not one
per pack, and phase 2 resolves every `from` against it.

### F1.8 — Verifiability: the applied tree is recomputable

This is the property that lets the manifest be five keys.

```
expected_tree = phase2( payload = .harness/pack/ ,
                        recipe  = .harness/pack/<pack.recipe> ,
                        answers = manifest.parameters ,
                        scaffolds = manifest.scaffolds )
```

Every input on the right is present in the project, committed to version
control, and readable without the CLI that produced it. Nothing on the
right is a hash, a cache or a remote fetch. `lintel-harness verify`
computes the left side and compares it to disk (US-33).

Three consequences follow, and they are the argument for Q-43:

1. **A per-file hash list would be redundant.** Its only job is to say
   what the apply produced; recomputation says the same thing and is
   self-checking, because a recomputation that disagrees with the recipe
   is a CLI bug rather than a stale record.
2. **A `.harness/base/` store would be redundant.** Its job was to be a
   merge base when the old pack version was unavailable. The old pack
   version is in `.harness/pack/`, in full.
3. **The manifest cannot go stale against the tree.** It records inputs,
   and inputs do not drift. What can drift is the tree, and that is
   exactly what `verify` reports.

The known limit, stated rather than glossed: **`verify` trusts
`.harness/pack/`.** A hand-edited payload produces a hand-edited
expectation, and the comparison passes. At v1.0 the consequence is
bounded — nothing merges, so a wrong expectation misleads a reader rather
than corrupting a file — but it is the first thing v1.1 must close. See
Q-52.

### F1.9 — Forward investment, deferred conditions, and known limits

**Forward investment — the two things v1.0 pays for that only v1.1 uses**
(and nothing else):

| Investment | Cost at v1.0 | What it buys v1.1 |
|---|---|---|
| **Inert region anchors** (US-32) | Six literal comment lines in one template, plus a line-counting assertion | `update` has stable insertion points in `CLAUDE.md` without a migration that has to guess where pack-owned text begins |
| **The minimal manifest** (US-10) | Five keys | `update` knows what was applied and can recompute the expected tree, which is what makes it an addition rather than a retrofit |

Nothing else in this spec is carried for a deferred feature. Where the
old spec kept a field, a hash or a code "for F3", it has been removed.

**Security conditions from `F1-ADR-001` — carried, rescoped or deferred:**

| Condition | Status at v1.0 |
|---|---|
| C-1 `ownedKeys` allowlist, leaf-only, hooks excluded | **Carried in full** — US-6 |
| C-2 consent gate on the plan, verbatim disclosure | **Carried in full** — US-13, US-29 |
| C-3 removal-honouring settings merge | **Deferred with `update`** (Q-42). It exists to stop a *second* apply resurrecting a deleted permission; there is no second apply at v1.0. **v1.1 obligation.** |
| C-4 confinement by resolution, `realpath`, ancestor `lstat` | **Carried in full** — US-3 stage 3 |
| C-5 reserved-destination denylist on the resolved path | **Carried in full** — US-3 stage 2, extended: a recipe step may never write under `.harness/` |
| C-6 anchored `to` grammar | **Carried in full** — US-3 stage 1, plus `E-PAYLOAD-PATH-INVALID` for payload paths |
| C-7 parameter `pattern` / `maxLength`, JSON escaping | **Carried in full** — US-8, US-4 |
| C-8 no substitution into a security-relevant owned key | **Carried in full** — US-4 |
| C-9 substitution may not forge a marker | **Half carried.** The newline ban survives as `E-SUBST-NEWLINE`. The marker-lex half and `E-REGION-TAMPERED` are **removed with the region parser** (Q-45): anchors are inert, so a forged one hijacks nothing. **v1.1 obligation:** restore the lex check when `update` starts reading anchors. |
| C-10 integrity fail-closed on write paths | **Rescoped.** Its subject was `shared[].integrity`, and `shared/` leaves v1.0 (Q-48). The general rule it expressed — a flag that downgrades an integrity check exists on read-only commands only — survives as `E-FLAG-NOT-PERMITTED`. |
| C-11 `pack.integrity` verified same-name-same-version | **Deferred with `update`** (Q-42) and superseded at v1.0 by Q-43, which removes `pack.integrity`. Its concern returns as Q-52. |
| C-12 `executable` declared, bounded, disclosed | **Carried in full** — US-3, US-29 |
| C-13 journal `preExisting` + pre-apply hash; rollback deletes only what it created | **Carried in full** — US-13, and now covers phase-1 writes too |
| C-14 branded `AppliedPath`, exclusive create, `E-TARGET-RACE` | **Carried in full** — US-3, US-13 |
| C-15 no credential-valued parameters | **Carried, message narrowed** — US-8. `.harness/base/` no longer exists, so the disclosure names the manifest only. The manifest and the payload are both committed. |
| C-16 fail-closed: unknown keys warn, unknown values are hard errors | **Carried in full** — US-1, with the enumeration of behaviour-selecting positions rewritten for the recipe |
| C-17 traversal bounds, depth 32 / 10,000 entries, no symlink following | **Carried in full** — US-30, US-33, §NFR |
| C-18 `contribute` passes the identical policy gate | **Deferred with `contribute`** (Q-42). **v1.1 obligation:** F1's pack-content policy must remain a single callable gate so that `contribute` cannot hold a second copy of it. |

**Known limits of the v1.0 format**, recorded so F5 pays them knowingly
rather than discovering them:

1. **An empty directory is not representable.** No primitive creates one.
   A pack that needs `specifications/general/` ships a placeholder file
   under a payload directory — the worked recipe's `skeleton/` — and
   copies it. This is expressible but not elegant, and it is the one
   place the settled model implies something the primitive set does not
   say out loud.
2. **The payload is duplicated into every project.** `.harness/pack/`
   holds the whole pack, including scaffolds the project did not select
   and calibrations it did not choose. That is deliberate (Q-41 wants one
   local source of truth) and it is why `E-PAYLOAD-TOO-LARGE` exists.
3. **Content cannot vary *within* a file by answer.** `harness:if` is
   gone with the region parser. A pack needing two variants of one
   document ships two files and two conditional steps, which is the
   `planning` pack's `calibrations/` shape.
4. **Two calibrations are two bodies of content with no mechanical
   consistency check.** Nothing in the format can tell whether the
   `high-floor` and `near-zero-floor` variants of a template have drifted
   apart in structure. That is a pack-authoring discipline problem, and
   F5 should expect a manual review step.
5. **An answer cannot be changed after apply** (Q-21). Calibration is the
   planning pack's central property, so "re-calibrate" is a plausible
   real request; v1.0 answers it with "start a new project". This is the
   sharpest known limitation of the v1.0 format, and it is now cheaper to
   fix than it was: re-render with new answers is `verify`'s
   recomputation with a different input.
6. **`generate`'s anchor check is a line count, not a parse.** An anchor
   inside a fenced code block in a template is counted. A pack author
   documenting the anchor syntax must use an id that is not declared.

---

## Open Questions

Q-1…Q-47 are resolved in `specifications/project-brief.md` §12 and are
not restated. Question IDs are unique across the whole project. Next free
id at the time of writing: **Q-51**.

| # | Question | Owner | Default assumption |
|---|---|---|---|
| Q-48 | **See Q-48 in the brief** — does the `shared/` mechanism ship at v1.0 at all? The brief owns it; F1 records the format-side half. Q-4 settled that packs may share by explicit reference and Q-27 settled that a component declares its own destination map, but both were designed against the *mapping* model, which Q-40 replaced: under a recipe, a component would have to contribute **recipe steps** into a host pack's ordered step list, raising ordering, collision and `when`-scoping questions the old design never had to answer. No v1.0 pack references `shared/` (`pack-inventory.md`), so nothing is blocked either way. | Thomas Andersen, via the brief | **F1's assumption: not in the v1.0 format.** This spec declares no `shared` array, no `component.json` and no digest pin; `shared/targets` ships inside `coding` and `shared/presentation` defers under Q-28. If a second consumer appears at v1.1, the shape F1 would propose is a component declaring a step *fragment* that a host pack splices at a declared position, with Q-4's bump rule enforced by `validate --all`. **F1 needs no change to start either way.** |
| Q-52 | **Does the manifest need a payload digest so that `verify` can tell "the applied tree drifted" from "the payload was edited"?** Q-43 removed `pack.integrity` because the applied tree is recomputable — but the recomputation trusts `.harness/pack/`, so a hand-edited payload yields a hand-edited expectation and `verify` reports `match` (§F1.8). At v1.0 nothing merges, so the consequence is a misleading report rather than lost work. At v1.1 `update` merges against a recomputed base, and a wrong base loses work silently — which is exactly what C-11 existed to prevent. | Thomas Andersen, at the v1.1 `update` design | **Not at v1.0.** One additive optional key (`pack.payloadDigest`, the same `treeDigest` over `.harness/pack/`) closes it without bumping `manifestVersion`, so deferring costs nothing but a later write. `verify` states the limit in its own output rather than implying a check ran. |
| Q-53 | **Which feature owns `lintel-harness verify`?** F1 specifies the recomputation rule (US-33) because it is a property of the format, and F1 already owns `validate` and `pack info`. But `verify` is a *command*, and F2 owns the CLI surface of `init`. If the master spec lists v1.0 commands, `verify` needs a home there too. | Architect, via the master spec | **F1 owns it**, as it owns `validate` and `pack info`: all three read a pack or a manifest, write nothing, and exist to make the format checkable. F2 owns only `init`. If the master spec disagrees the command moves; the recomputation rule stays here either way. |

---

## Resolved Decisions

Every row below was closed by `F1-ADR-001-pack-format-and-manifest.md` on
2026-08-30 and is re-examined here against Q-39…Q-46. Per
`conventions.md` each keeps the ID it was raised under. The settled
inputs upstream of all of them are Q-1…Q-46 in
`specifications/project-brief.md` §12, which this document does not
re-litigate.

| # | Question | Decision | Date |
|---|---|---|---|
| Q-18 | Is `.harness/base/` committed to version control, or gitignored and rebuilt? | **Superseded by Q-43.** There is no `.harness/base/`, so the question and the generated `.harness/.gitattributes` that answered its Windows problem both go. What is committed is `.harness/pack/` and `.harness/manifest.json`, and `init` writes no `.gitignore` entry for either. | 2026-08-31 |
| Q-19 | Should the manifest record a whole-pack integrity hash? | **Superseded by Q-43.** `pack.integrity` is removed with the rest of the recorded state. Its concern — proving the project holds the build it was applied with — reopens as **Q-52**, scoped to v1.1. | 2026-08-31 |
| Q-20 | Should `harness:if` ever grow beyond a single equality test? | **Superseded by Q-45.** There is no `harness:if`; there is no region parser. The single-equality shape survives as a recipe step's `when`, and the answer is the same: one equality test only. | 2026-08-31 |
| Q-21 | Can an init-parameter answer be changed after apply? | **No in v1.0** — apply into a fresh directory. Unchanged, and cheaper to revisit than it was: `verify`'s recomputation is "render with these answers", so a v1.1 `recalibrate` is that function with a different input and no format change. | 2026-08-30 |
| Q-22 | Can a scaffold be added to or removed from an applied project? | **No in v1.0**; same provision as Q-21. | 2026-08-30 |
| Q-23 | Does `merge-json` survive contact with `.claude/settings.json`? | **Keep `merge-json`**, tightened: it is the only primitive permitted on an existing JSON destination, and an unparseable target is `E-MERGE-JSON-INVALID` with nothing written. **Amended by Q-43**: the per-owned-key hash is removed, because its consumer was drift reporting. | 2026-08-31 |
| Q-24 | `pack.json`, or a separate `apply.json`? | **Amended by Q-40 — two files.** `pack.json` declares identity, anatomy, parameters and scaffolds; `recipe.json` declares the phase-2 procedure. The ADR's "one file" was right about there being no *third* concept; the recipe is a second one, and separating what a human reads from what an apply executes keeps both short. | 2026-08-31 |
| Q-25 | Does `update` delete a file the pack no longer ships? | **Deferred with `update`** (Q-42). No decision is needed at v1.0, and the minimal manifest constrains it no more than the old one did. | 2026-08-31 |
| Q-26 | Should normalization before hashing also trim trailing whitespace and normalize the final newline? | **No** — BOM and line endings only. Trailing whitespace is real content. Unchanged, and now applies to `verify`'s comparison rather than to a manifest hash. | 2026-08-30 |
| Q-27 | May one shared component declare a multi-destination file mapping? | **Deferred with `shared/`.** The mechanism it designed — a component's own `mappings`, inherited and optionally remapped — was built on the mapping model Q-40 replaced. Reopened as **Q-48**. | 2026-08-31 |
| Q-38 | Are a pack's document templates copied into the applied project? | **Superseded by Q-47** (which states the supersession properly), and by Q-41 and `pack-inventory.md`. They stay in the payload at `.harness/pack/specifications/`, which is the only copy in the project. The duplication Q-38 accepted no longer arises: there is nothing to duplicate, because phase 2 does not copy what phase 1 already placed. Only `README.template.md` and `project-brief.template.md` are copied out, because a project fills those in. | 2026-08-31 |
