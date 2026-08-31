# Pack Format & Manifest Specification — Lintel Harness v1.0
**Version:** 1.0
**Status:** Draft
**Date:** 2026-08-30
**Platform:** Node ≥ 20 / TypeScript CLI, published as an npm package (`npx`-runnable). Pack content is Markdown, shell, PowerShell and Bicep; `pack.json` and the manifest are JSON. No UI.
**Design spec:** n/a (no UI)
**ADR:** `F1-ADR-001-pack-format-and-manifest.md` — **PROCEED**. It settles six F1↔F5 contract conflicts and closes Q-13, Q-15 and Q-18…Q-27. Where this spec and the ADR disagree, the ADR wins.
**References:** `specifications/lintel-harness-brief.md` (§3.3, §6 R1–R6, §7, §12 Q-1…Q-12), `CLAUDE.md` (§Decided architecture, §The core abstraction, §Dogfooding), `specifications/conventions.md`, `specifications/v1.0/research-planning-pack-framing.md`, `template/` (the coding pack source)

**Amendment history**

| Version | Date | Summary |
|---|---|---|
| 1.0 | 2026-08-30 | Initial draft. Defines `pack.json`, the source→applied mapping model, the marked-region grammar, shared references, init parameters, scaffolds, and the `.harness/` manifest that every other v1.0 feature reads or writes. |
| 1.0 | 2026-08-30 | Cross-document consistency pass. This spec's open questions renumbered to project-unique ids Q-18…Q-26, with one of them — the `harness adopt` question — collapsed into the master spec's Q-14, which owns it. User stories US-1…US-16 unchanged. Full account in the master spec's *Cross-document consistency pass*. No content or design change. |
| 1.0 | 2026-08-30 | **ADR-001 amendment pass.** Folds `F1-ADR-001-pack-format-and-manifest.md` (verdict `PROCEED`) into this spec. Anatomy gains a three-value `status` enum and `declaredAbsent` is retired (US-2); `parameters[].flag` declares a CLI alias (US-8); a shared component declares its own `mappings` and a referencing pack may `remap` (US-7, §F1.2); `merge-json` records per-owned-key hashes (US-6, US-10); the manifest gains `pack.integrity`, apply writes `.harness/.gitattributes`, and base copies are text-only (US-10, US-12); substitution gains the `{{harness:lit:X}}` escape (US-4); new user story **US-29** for `harness pack info`. Q-18…Q-27 move to Resolved Decisions. Six new codes in §Error States. No decision is made here that the ADR did not make. |
| 1.0 | 2026-08-30 | **Security remediation pass.** Folds `F1-ADR-001` **§7 Security architecture** and **§8 Security conditions** (C-1…C-18) into this spec, per the delegated change-list in ADR §6.4.1. Path confinement becomes confinement **by resolution** in four ordered stages, with an anchored `to` grammar and a reserved-destination denylist on the resolved path (US-3, §NFR); `merge-json` gains a destination-keyed ownable allowlist, a leaf-only rule for security-relevant keys and a removal-honouring merge (US-6, US-10); **packs may not register agent hooks at v1.0** and `hooks` leaves the ownable set entirely (US-6); substituted values are constrained, escaped by target mode and barred from security-relevant keys (US-4, US-8, §F1.1); the executable bit is declared, bounded, disclosed and watched (US-3, US-11, US-29); the journal becomes version 2 and rollback gains a five-case table (US-13, §F1.6); consent is a gate on the plan before the first byte (US-13, US-29). **38 new codes** and four changed rows in §Error States. §F1.2's worked pack no longer owns `permissions.allow`, so **no v1.0 pack owns a security-relevant key**. No new user story: next free id remains **US-30**. No decision is made here that the ADR did not make. |

---

## Introduction

F1 defines the two data structures the whole product stands on: the
**pack format** — how a way of working is declared on disk so a machine
can apply it — and the **manifest** — what an applied project records so
a later `update`, `status` or `contribute` can be *computed* rather than
guessed. The brief states the consequence plainly: "the manifest is a
load-bearing artifact and needs its own spec" (§7). Every other v1.0
feature reads or writes what this document defines, which is why the
build order is **F1 → F2 → F5 → F3 → F4 → F6**.

Neither structure is speculative. The requirements come from an
executed manual apply of the coding pack into this repository, logged
row by row in `CLAUDE.md` §Dogfooding. That log is the format's
specification-by-example: it contains a directory mapping, a directory
mapping **with a rename** (`template/agent-teams/` → `AgentTeams/`), a
**filename transform** (`tone-of-voice.template.md` →
`tone-of-voice.md`), a mapping **into a tool-owned directory**
(`.claude/`), **path rewrites inside file content** in three files, and
— the finding that forced Q-10 — **two READMEs whose text describes
their own copying and is therefore wrong the instant it is applied**.
A format that cannot express all six of those has already failed on the
only real evidence available.

This feature is the *format*, not the engine. F1 says what a pack
declares and what the manifest records, and specifies the semantics
precisely enough that a conforming implementation is testable. F2
(`harness init`) is the apply engine that executes those semantics; F3
consumes the manifest for drift and 3-way merge; F4 reverses the same
comparison for `status` and `contribute`; F5 authors the three packs
against this format. Where this spec pins behaviour (ordering,
atomicity, hashing), downstream features implement it and may not
reinterpret it.

The spec is deliberately opinionated about three things that are
exactly where scaffolding tools break: **atomicity** (a half-written
apply must be recoverable, never silently partial), **idempotency**
(re-running init is defined, not undefined), and **byte-level
determinism** (a hash is worthless if the same inputs can produce two
different outputs, so line endings, encoding and substitution order are
all pinned).

### What is in scope

- `packs/<name>/pack.json` — pack identity, semver, minimum CLI
  version, the nine-part anatomy declaration, source→applied mappings,
  shared references, init parameters, and scaffolds.
- The **source→applied mapping model**: directory mapping, rename,
  filename transform, mapping into tool-owned directories, declared
  literal path rewrites, and placeholder substitution.
- The **marked-region grammar** (Q-7, Q-10): `source-only`,
  `applied-only`, pack-owned `region`, and parameter conditionals —
  including comment-wrapper handling, nesting rules and malformed-marker
  behaviour.
- The **shared component format** under `shared/` and the mechanism that
  enforces Q-4's rule that changing a shared file bumps every pack
  referencing it.
- **Init parameters** and how parameterized content is expressed, plus
  an explicit account of the stress the planning pack's constraint-floor
  calibration puts on the format.
- **Scaffolds**: declaration, composition and collision rules.
- The **manifest**: location, name, JSON schema, per-file entry
  contents, hashing rules, the merge base, versioning and
  forward-compatibility, and behaviour when it is missing, corrupt,
  hand-edited or written by a newer CLI.
- The **atomicity, rollback and idempotency contract** an apply must
  honour, since the manifest is only trustworthy if writes are
  all-or-nothing.
- `harness validate` — the pack-author-facing completeness and
  integrity check, because a format with no validator is a convention,
  not a format.

### What is NOT in scope

- **The apply engine itself** (F2). This spec pins the transform
  pipeline and its ordering; F2 implements it, owns the CLI surface of
  `harness init`, and owns interactive prompting for parameters.
- **Drift reporting, 3-way merge and conflict presentation** (F3, F4).
  F1 specifies only what the manifest must *carry* so those are
  possible.
- **Pack content.** The nine parts of `coding`, `writing` and `planning`
  are F5's deliverable. F1 defines only how a pack declares them.
- **Composition of two packs in one project.** Excluded by Q-12 and
  restated below as an invariant.
- **Changing an init-parameter answer, or adding/removing a scaffold,
  after init** — see Q-21 and Q-22.
- **A registry, remote pack fetching, or third-party packs.** Packs are
  bundled with the published CLI (Q-2); `pack.json` carries no
  provenance or signing fields.
- **Adopting a hand-applied project into management** without a fresh
  init — see Q-14.

---

## Technical Context

Only settled decisions. Rows marked *(brief)* were settled in the
brief's Resolved Decisions table and are restated here, not
re-litigated.

| Decision | Choice | Rationale |
|---|---|---|
| Manifest owner | The Node/TypeScript CLI owns the manifest, hashing, drift and merge; the skill never writes it | *(brief Q-1)* Determinism: hashing and drift must be computed facts, not agent judgment, or S3/S4 vary run to run |
| Pack home | `packs/<name>/` in this repo, bundled into the published package | *(brief Q-2)* One release artifact; no CLI↔pack compatibility matrix; `npx` needs no network |
| Versioning | Per-pack semver in `pack.json` + `minCliVersion`; separate CLI semver; the manifest records both | *(brief Q-3)* Makes `update` precise, and pins the manifest against a CLI behaviour change silently reinterpreting it |
| One pack per project | **Invariant.** A project holds exactly one pack. The manifest has one `pack` object, not a list | *(brief Q-12)* Removes the file-collision and region-conflict class entirely rather than solving it |
| Sharing | Explicit reference from `shared/`, declared in `pack.json`, pinned by content hash | *(brief Q-4)* Nothing is inherited implicitly; the pin is what makes the "bump every referencing pack" rule enforceable rather than aspirational |
| Source vs applied | Marked regions everywhere; whole-file mode is the degenerate case | *(brief Q-10)* The two stale READMEs needed the *same section with different content* in source and applied — a whole-file mode cannot express that, and parallel `*.pack.md` / `*.applied.md` files reintroduce drift |
| `CLAUDE.md` | Generated with pack-owned regions inside project-owned prose | *(brief Q-7)* The seam is evidence-backed: this repo's own `CLAUDE.md` already divides cleanly |
| Manifest location | `.harness/` directory at the project root; `.harness/manifest.json` | A directory, not a bare file, so the merge base and future state live beside it under one gitignore-visible name |
| Manifest format | JSON, 2-space indent, `\n` endings, keys in the order defined in §Flows, arrays sorted deterministically | Diffable in review, machine-owned, no YAML ambiguity; deterministic serialization means a no-op re-apply produces a zero-line diff |
| Merge base | The exact applied bytes are cached at `.harness/base/<applied-path>` at write time | Per-file hashes alone cannot support 3-way merge — a merge needs the base *content*. A local cache makes F3 and F4 offline, exact, and independent of whether the old pack version is still installed |
| Hash | SHA-256, lowercase hex, full 64 chars, over **normalized** content (§NFR) | In Node stdlib, no dependency, collision-resistant; normalization is what makes a hash survive a CRLF checkout |
| Substitution token | `{{harness:…}}` — a reserved prefix; every other `{{…}}` is left verbatim | Pack content is *full* of `{{Feature name}}`-style placeholders that must survive apply untouched. A bare `{{…}}` substituter would corrupt every document template in the coding pack |
| Text encoding | UTF-8 only; BOM stripped on read, never re-emitted; non-UTF-8 files are treated as binary | One encoding, stated once, so hashes are comparable across platforms |
| Determinism | Given (pack, pack version, CLI version, parameter answers, scaffold set), apply output is byte-identical. No timestamps, absolute paths, hostnames or random values may appear in generated content | Without this, drift detection is noise |
| Exit codes | `0` success · `1` user-correctable error · `2` pack or manifest integrity error · `3` internal error | Lets the skill (F6) and CI branch on outcome without parsing text |
| Diagnostic vocabulary | F1's `E-`/`W-` codes and these four exit classes are the **only** CLI error model; §Error States is the only message catalogue. Codes are the stable contract, text is a rendering | *(`F1-ADR-001`, conflict 4)* Two vocabularies disagreed on the exit code for the same scenario; a scenario with no code can only be asserted by string-matching |
| Anatomy status | A three-value enum per part: `present` (default) · `provisional` (requires a note) · `absent` (requires a reason). `declaredAbsent` retired | *(`F1-ADR-001`, conflict 3)* F5 asserts provisional counts as an NFR, and free text cannot be counted |
| Parameter CLI alias | A parameter may declare `flag`, making `--calibration helio` an alias for `--set constraintFloor=helio`, registered from `pack.json` data | *(`F1-ADR-001`, conflict 5)* F5 gets its literal CLI surface while the CLI keeps zero knowledge of any pack, so S5 stays testable |
| Shared destination map | A component declares its own `mappings` in `component.json`; a referencing pack inherits them and may `remap` one destination | *(`F1-ADR-001`, Q-27)* Otherwise every referencing pack repeats the map and the packs drift apart on where a shared file lands — the duplication Q-4 exists to remove |
| Confinement | **By resolution, not by string.** The project root is resolved once per run with `realpath`; every applied path is produced by one gate (`confinePath`) and carries the branded type `AppliedPath`. No write-side API takes a bare `string` | *(`F1-ADR-001` §7.1, C-4/C-14)* Inspecting a declared string says nothing about the filesystem it will meet. The brand turns "someone forgot to validate this path" from a latent defect into a compile error, and it is worth more than any runtime check in §7 |
| Settings ownership | A **destination-keyed** allowlist decides what a `merge-json` mapping may own — keyed on the applied path, never on the pack, so adding a pack still requires no core change. **No pack may register an agent hook at v1.0**: `hooks` and every path under it are outside the ownable set | *(`F1-ADR-001` §7.2.1, §7.2.5, C-1)* An unconstrained `ownedKeys` made `permissions.allow` indistinguishable from `theme`. Hooks are excluded by *format* decision rather than by consent design, because `update` makes the consent unbounded — a hook command is a merge target, and a 3-way merge can resolve to a command neither party wrote |

---

## Goals

- **G-F1-1** — `pack.json` can express every mapping the manual apply
  required: all nine rows of `CLAUDE.md` §Dogfooding are declarable, and
  none needs a manual fixup afterwards.
- **G-F1-2** — A pack declares all nine anatomy parts, and
  `harness validate` fails a pack that silently omits one.
- **G-F1-3** — The marked-region grammar expresses the two stale-README
  cases exactly: one source file, two renderings, no duplicate file.
- **G-F1-4** — The manifest carries enough for drift detection, 3-way
  merge and `contribute` without a network call or the old pack version
  being installed.
- **G-F1-5** — A failed apply leaves the project either fully applied or
  fully unapplied; a crashed apply is detectable and reversible by one
  command.
- **G-F1-6** — Re-running `harness init` with identical inputs is a
  defined no-op that changes zero bytes, including in the manifest.
- **G-F1-7** — The same pack applied on macOS, Linux and Windows
  produces identical per-file hashes.
- **G-F1-8** — Changing a file in `shared/` cannot ship without either
  bumping every referencing pack or an explicit, logged override.
- **G-F1-9** — The planning pack's constraint-floor calibration is
  expressible in the format, and the cost of expressing it is stated
  rather than discovered during F5.

---

## Out of Scope (this version)

- Remote or third-party packs, a registry, and pack signing — deferred
  indefinitely (brief §10).
- Two packs applied to one project, and any region-ownership arbitration
  between packs (Q-12).
- Re-calibrating a parameter answer or changing the scaffold set after
  init (Q-21, Q-22) — earliest v1.1.
- File **deletion** on update. The manifest records enough to detect a
  file the pack no longer ships; deciding what to do about it is F3, and
  the v1.0 default is to report, never delete (Q-25).
- `harness adopt` for a hand-applied project (Q-14). S7 is satisfied by
  re-initing this repo from the pack, which is also the stronger proof.
- Migrating pack *content* improvements (Q-6). F1 is format only.
- Any manifest consumer beyond the CLI — no API, no schema publication.

---

## User Stories

Range used: **US-1 … US-16**, plus **US-29** (added by the ADR-001
amendment pass; F5 holds US-17…US-28, so US-29 was the next free id and
US-30 is the next free id now). `US-N` is project-monotonic — see
`CLAUDE.md`'s counter table.

---

**US-1 — Declare a pack's identity and versions**
> As a pack author, I want to declare a pack's name, version and minimum
> CLI version in one file so that an applied project can record exactly
> what it got and `update` can reason about it.

**Acceptance criteria:**
- `packs/<name>/pack.json` exists, is valid JSON, and carries
  `formatVersion` (integer), `name`, `version` (semver), `title`,
  `minCliVersion` (semver), and `contentRoot`.
- `name` matches `^[a-z][a-z0-9-]{1,31}$` and equals the directory name;
  a mismatch fails validation.
- `version` and `minCliVersion` are valid semver; a non-semver value
  fails validation.
- A CLI older than `minCliVersion` refuses to apply the pack and prints
  the verbatim `E-PACK-CLI-TOO-OLD` message from Error States.
- `formatVersion` greater than the CLI's supported pack-format version
  fails with `E-PACK-FORMAT-NEWER`; equal or lower proceeds.
- Unknown top-level keys in `pack.json` are a validation **warning**,
  not an error, and are ignored at apply.
- **The key/value asymmetry is normative and applies everywhere in the
  format** (`F1-ADR-001` §7.6, C-16). An unknown **key** in `pack.json`,
  `component.json` or the manifest is a warning and is ignored — the rule
  above, and §F1.5's "unknown keys preserved verbatim on rewrite", both
  stand. An unknown or unrecognised **value in a behaviour-selecting
  position** is a hard error, exit 2, with zero bytes written. Silently
  ignoring such a value means running behaviour the pack did not ask for.
- The behaviour-selecting positions are **enumerated, and the enumeration
  is closed**: `Mapping.mode`, `ParameterDecl.type`, `AnatomyDecl.status`,
  `FileEntry.origin`, `FileEntry.mode`, `FileEntry.eol`, a
  `transforms[]` entry, a region directive name, an `ownedKeys` root
  against the destination policy of US-6, a `shared[].integrity`
  algorithm prefix, and `Journal.version`. Nothing else is a
  behaviour-selecting position, and a future addition to the list is a
  spec change.
- Where a position has its own code (`E-REGION-UNKNOWN`,
  `E-OWNEDKEY-FORBIDDEN`, `E-JOURNAL-UNREADABLE`) that code is used;
  otherwise the value fails with **`E-UNKNOWN-VALUE`**, which names the
  field, the offending value and the permitted values verbatim. A test
  may assert this by writing `"mode": "manged"` into a mapping and
  requiring exit 2 with nothing written.

---

**US-2 — Declare the nine-part anatomy and be told when a part is missing**
> As a pack author, I want to declare which files supply each of the
> nine anatomy parts so that a pack with a gap is visibly incomplete
> rather than quietly deficient.

**Acceptance criteria:**
- `pack.json` has an `anatomy` object with exactly these nine keys:
  `process`, `roles`, `documentTemplates`, `conventions`,
  `coordination`, `behaviouralGuidelines`, `folderScaffolding`,
  `skillsAndAutomations`, `autonomyContract`.
- Each key holds a **content source** — `{ "paths": [<glob>, …] }`
  (globs relative to `contentRoot`), `{ "ref": "shared:<component>" }`,
  or `{ "declaredBy": "mappings" }` (valid only for
  `folderScaffolding`, whose shape *is* the mapping table) — plus an
  optional `status`.
- `status` is one of **`present` | `provisional` | `absent`** and
  defaults to `present` when omitted (`F1-ADR-001`). One axis, three
  values. **`declaredAbsent` is retired** and is no longer a key of the
  format: an anatomy entry that carries neither a content source nor
  `"status": "absent"` — which is what a legacy `declaredAbsent` entry
  now is — fails validation with `E-ANATOMY-MISSING`, naming the key.
- A missing key fails validation with `E-ANATOMY-MISSING`, naming the
  key.
- `present` (explicit or defaulted) requires a content source. A key
  whose globs match zero files fails validation with `E-ANATOMY-EMPTY`,
  naming the key.
- `provisional` requires a content source **and** a non-empty `note`
  saying what about the part is unsettled. A missing or empty `note`
  fails with `E-ANATOMY-NO-NOTE`. A well-formed provisional part passes
  validation, and `harness validate`, `harness pack info` and
  `harness init` print the verbatim `W-ANATOMY-PROVISIONAL` warning
  naming the part and the note.
- `absent` requires a non-empty `reason` and takes **no** content
  source. A missing or empty `reason` fails with `E-ANATOMY-NO-REASON`.
  A well-formed absent part passes validation, and `harness init` prints
  the verbatim `W-ANATOMY-ABSENT` warning naming the part and the
  reason.
- **A key that contradicts the declared status is an error; a key that is
  merely inapplicable is a warning** (`F1-ADR-001` §7.8.3). The line is
  drawn on decidability: a contradiction leaves the format unable to know
  what the author meant, and redundancy does not.
  - **Contradiction, exit 2.** A **content source** (`paths`, `ref` or
    `declaredBy`) alongside `"status": "absent"` fails with
    `E-ANATOMY-SOURCE-ON-ABSENT`, naming the part and the source key.
    The author has declared both "this part does not exist" and "here is
    its content", and the format cannot pick one. This is **not** covered
    by US-1's unknown-key rule, which governs keys the format does not
    recognise, not keys whose meanings collide.
  - **Redundancy, warning.** A `reason` alongside `present` or
    `provisional`, or a `note` alongside `absent`, is inapplicable rather
    than contradictory: it is ignored at apply and reported as a
    validation warning, consistent with US-1's unknown-key rule.
- `harness validate --json` and `harness pack info` (US-29) emit a
  nine-row anatomy report over the same structure, with
  `present | provisional | absent` per part. A fourth value, `missing`,
  is emitted **only for an invalid pack** — a part the pack does not
  declare at all — and never appears for a pack that passes validation.
- The counts F5 asserts as an NFR (exactly two `absent` and exactly one
  `provisional` across the three v1.0 packs) are therefore mechanically
  checkable rather than editorial.

---

**US-3 — Map pack source onto applied paths, including renames and filename transforms**
> As a pack author, I want to declare where each piece of source content
> lands in an applied project so that no user ever has to move or rename
> a file by hand.

**Acceptance criteria:**
- `pack.json` has a `mappings` array of entries, each with `from` (path
  relative to `contentRoot`) and `to` (path relative to the project
  root).
- A `from` ending in `/` maps a directory recursively; `to` must also
  end in `/`. Source and applied directory names may differ
  (`agent-teams/` → `AgentTeams/`) — the rename is expressed by the
  mapping alone, with no content change.
- A `from` naming a single file maps that one file, and `to` may give it
  a different basename (`copy/tone-of-voice.template.md` →
  `copy/tone-of-voice.md`).
- A directory mapping may set `"stripTemplateSuffix": true`, which
  rewrites any mapped basename `X.template.Y` to `X.Y`. It is **off by
  default**, because the coding pack's applied `specifications/` folder
  legitimately keeps `*.template.md` filenames.
- `to` may name a tool-owned directory (`.claude/agents/`). Mapping into
  an existing directory merges by file; per-file collision rules
  (US-13) still apply. The written files are recorded in the manifest
  like any others.
- Validation also rejects a `from` that does not exist, and any symlink
  anywhere under `contentRoot` (`E-SYMLINK-IN-PACK`).
- Applying the coding pack reproduces rows 1–5 of `CLAUDE.md`
  §Dogfooding with no manual step.

**Path confinement — four ordered stages** (`F1-ADR-001` §7.1, C-4, C-5,
C-6, C-14). The pre-amendment rule — reject a `to` that is absolute,
contains `..`, or escapes the project root — inspected a *declared
string* and therefore said nothing about the filesystem that string would
meet. It is replaced by **confinement by resolution**, in four stages
with a single implementation. Every applied path in the product is
produced by that one gate and carries the branded `AppliedPath` type;
there is no second route to an applied path, and a bare `string` never
reaches a writer.

**Stage 1 — the anchored `to` grammar** (declaration time; runs at
`harness validate`, which has no project to inspect). A `to` value must
match, as a whole:

```
to        := segment ( "/" segment )* ( "/" )?   # trailing "/" only for a directory mapping
segment   := char+                                # NFC-normalized, ≥ 1 char
char      := any Unicode scalar EXCEPT  /  \  :  *  ?  "  <  >  |
             and U+0000–U+001F, U+007F
```

Everything in the table below fails with **`E-MAP-PATH-GRAMMAR`**, exit
2, naming the offending construct — one code, one rule, rather than four
substring searches that each miss a different case:

| Rejected | Because |
|---|---|
| a leading `/` or `\` | POSIX-absolute |
| any `\` anywhere | a Windows separator; a pack declares POSIX paths, and `a\b` is one segment on POSIX and two on Windows |
| `^[A-Za-z]:` — both `C:\x` and **`C:x`** | drive-absolute and **drive-relative**. `C:x` resolves against the *per-drive* current directory, which is not relative to anything the CLI controls |
| a `//` or `\\` prefix | UNC / network path |
| a `.`, `..` or empty segment | the classic escape, now rejected as *grammar* rather than by substring search |
| a segment ending in `.` or in any whitespace | Windows silently strips these, so `foo.txt.` and `foo.txt` are the same file there and different files here — a rename the pack did not ask for |
| a reserved Windows basename with or without extension (`CON`, `PRN`, `AUX`, `NUL`, `COM1`–`COM9`, `LPT1`–`LPT9`) | already an §NFR *Cross-platform* rule; now enforced in the one grammar rather than separately |
| a non-NFC `to` | see below |

- **NFC is mandatory.** `to` must be NFC. A source basename discovered by
  directory recursion is NFC-normalized when its applied path is
  computed, and the file is named by **`W-PATH-NON-NFC`**. A macOS
  checkout can hold NFD filenames, and an NFD manifest key would not
  match a Linux teammate's NFC one — breaking G-F1-7 silently. **Every
  manifest `path` key is POSIX-separated and NFC-normalized, without
  exception.**
- **Collision keys.** Two applied paths collide when
  `collisionKey(a) === collisionKey(b)`, where `collisionKey` is the
  applied path **NFC-normalized and then case-folded**. A collision that
  is a pure case difference stays `E-MAP-CASE-COLLISION`; a collision
  that survives case-folding and is created by normalization alone is
  **`E-MAP-NORM-COLLISION`**, exit 2 — a separate code because the remedy
  is different prose ("these are two byte sequences for one macOS
  filename", not "rename one of them"). The check runs over the
  **merged** mapping set: the pack's own mappings, every selected
  scaffold's, and every inherited component mapping after `remap`.

**Stage 2 — the reserved-destination denylist, on the resolved path**
(C-5). No mapping, scaffold mapping, inherited component mapping,
`remap` target, `contributes[].file`, `executableRoots` entry or
contribution target may resolve to a path whose first segment is
`.git/`, `.hg/`, `.svn/` or `.harness/`, or which lies inside the
resolved directory the CLI itself is installed in (`realpath` of the
package root — which matters precisely when someone runs `harness init`
inside the harness repo). **`E-MAP-RESERVED-DEST`**, exit 2.

- The check runs **after** resolution, so a `to` that reaches
  `.git/hooks/pre-commit` by *any* route — a component mapping, a
  `remap`, a scaffold, a directory recursion — is caught by the same
  rule rather than by four copies of it.
- `.git/hooks/pre-commit` with `"executable": true` was a conforming
  mapping before this amendment and is remote code execution on the next
  commit. It is now two independent errors, this one and
  `E-EXEC-DEST-FORBIDDEN`.
- **Carve-out, and it must be stated or an implementer deadlocks the
  denylist against the merge base.** The CLI's own writes under
  `.harness/` are **not mappings** and do not consult the denylist. The
  base store, the journal and the lock take an already-confined
  `AppliedPath` and derive their `.harness/` location themselves: the
  base path for an applied path `p` is `.harness/base/` + `p`, and
  because `p` has already been proven free of `..` and of a leading
  separator, that path is confined by construction.

**Stage 3 — resolution confinement** (C-4; plan time and write time
only, skipped at `harness validate`, which has no project root). The
**project root is resolved once per run** with `realpath()`, and
everything below is judged against the *resolved* root — without this the
CLI would refuse to run in `/tmp` on macOS, where `/tmp` is itself a
symlink to `/private/tmp` (`F1-ADR-001` §8.2 item 2). Below the resolved
root, for every applied path:

- Every ancestor component is `lstat`ed, top down. A component that is a
  symlink, a Windows junction or any other reparse point fails with
  **`E-DEST-SYMLINK`**, exit 2, naming the component. The CLI does not
  traverse through one and does not create through one.
- Directories the apply needs are created **one level at a time**,
  non-recursively, each `lstat`-checked before the next — a directory the
  apply itself created is trivially not a symlink.
- The final destination, if it exists, is `lstat`ed; a symlink there is
  `E-DEST-SYMLINK` too. **A pack never writes through a link.**
- The resolved parent directory joined with the final basename must be a
  **strict descendant** of the resolved root. This is the assertion the
  old string check was standing in for, and it is the one that actually
  holds. Failure is `E-MAP-ESCAPES-ROOT`, exit 2.

**Stage 4 — the write itself** (C-14), specified in US-13.

**The executable bit is declared, bounded and disclosed** (C-12):

- A mapping may set `"executable": true` to write mode `0755`; otherwise
  files are written `0644`. The bit is recorded per file in the manifest.
- `pack.json` may declare **`executableRoots`**: applied-path prefixes,
  each ending `/`, each subject to the stage 1 grammar and the stage 2
  denylist. `"executable": true` on a mapping whose applied path is not
  under a declared root fails with **`E-EXEC-ROOT-UNDECLARED`**, exit 2.
  Absent or empty means the pack ships no executable file, which is the
  default and the common case.
- A declared root that resolves under `.claude/`, `.git/`, `.hg/`,
  `.svn/` or `.harness/` fails with **`E-EXEC-DEST-FORBIDDEN`**, exit 2 —
  checked at declaration **and again per applied path**, so a directory
  recursion cannot reach a forbidden destination that the root itself did
  not name.
- **At most 32 executable files per apply**, else **`E-EXEC-TOO-MANY`**,
  exit 2. The cap does not meaningfully bound blast radius — one
  executable in the wrong place is the whole finding — and is adopted for
  a procedural reason: a pack wanting more has to argue for it in an ADR
  (`F1-ADR-001` §8.2 item 4).
- **Every 0755 path is enumerated** in `harness init`'s pre-write summary
  and in `harness pack info` (US-29), verbatim, one per line. Enumeration
  does not gate: disclosure is what C-12 asks for, and at v1.0 no pack
  declares an `executableRoots`, so a gate here would fire on nothing.

---

**US-4 — Fix paths and fill placeholders without a manual pass**
> As a project owner, I want applied files to contain correct internal
> paths and my project's values so that the applied project is
> immediately runnable (R3, "no manual path fixups").

**Acceptance criteria:**
- `pack.json` may declare a `rewrites` array; each entry has `in` (globs
  over **applied** paths), `find` (a literal string, never a regex) and
  `replace`. Rewrites apply to text files only.
- A rewrite entry that matches nothing across all its `in` files fails
  validation with `E-REWRITE-UNUSED` — a rewrite that no longer applies
  is stale, and staleness is the defect this product exists to prevent.
- Substitution replaces `{{harness:param.<id>}}` with the recorded
  answer for that parameter, and `{{harness:pack.name}}`,
  `{{harness:pack.version}}`, `{{harness:cli.version}}` with their
  values.
- Any `{{…}}` token **not** beginning `harness:` is copied verbatim.
  Applying the coding pack leaves every `{{Feature name}}`,
  `{{YYYY-MM-DD}}` and `{{PLACEHOLDER}}` in the document templates
  byte-identical to the source.
- **Escape.** `{{harness:lit:<X>}}` renders as the literal text
  `{{harness:<X>}}`, so a pack can *document* the reserved prefix — a
  pack README showing `{{harness:param.constraintFloor}}` writes
  `{{harness:lit:param.constraintFloor}}` in the source
  (`F1-ADR-001` §6.3). The escape is resolved in the same pass as every
  other `{{harness:…}}` token, once, and its output is never re-scanned,
  so `{{harness:lit:lit:x}}` renders `{{harness:lit:x}}` and nothing
  further. Substitution is fence-blind — unlike marker scanning — so a
  pack may substitute, and escape, inside a fenced code block.
- An unresolved `{{harness:…}}` token remaining in any output file fails
  the apply with `E-SUBST-UNRESOLVED` before anything is written.
- No substitution variable is non-deterministic. There is no
  `{{harness:date}}`, `{{harness:cwd}}` or equivalent, by design.
- Applying the coding pack reproduces row 6 of §Dogfooding: `Run.md`,
  `.claude/commands/target.md` and `targets/README.md` land with
  `targets/…` paths and no `template/` prefix.

**A substituted value is untrusted input** (`F1-ADR-001` §7.3, C-7, C-8,
C-9). An answer is typed by a user, recorded verbatim in the manifest,
and **replayed on every `update`** — and `W-MANIFEST-EDITED` is a
*warning*, so a recorded answer is an attacker-editable value by this
spec's own design. It is therefore treated as untrusted at every use, not
only at the prompt.

- **Context-aware escaping.** Pipeline step 5 takes the mapping's `mode`
  (§F1.1). For a `merge-json` target, a substituted value is
  **JSON-string-escaped** before insertion. For every other mode it is
  inserted verbatim, exactly as today.
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
- **No line break out of a value** (C-9). A substituted value may not
  contain `\n`, `\r`, `U+2028` or `U+2029`, and the line it produces may
  not lex as a `harness:` directive in any of the three comment wrappers
  of US-5. Both checks report **`E-SUBST-MARKER-INJECTION`**, exit 2. The
  newline ban is the **sufficient** condition and is the one that does
  not depend on a pack author having written a good `pattern`: a
  conforming pattern already excludes line breaks, and this check holds
  when the pattern is weak. The lex check remains as the second half,
  because a value can also complete a marker begun by the surrounding
  template (`F1-ADR-001` §8.2 item 7).
- **`update` refuses a tampered region set** (C-9). Before merging, an
  applied file is re-lexed and its ordered `harness:region` id list, its
  nesting and its termination must equal the set the manifest recorded in
  `files[].regions` — **including entries marked `orphaned`**, since an
  orphan legitimately remains in the file after the pack stops declaring
  it. Any difference — an added region, a missing one, a reorder, an
  unterminated marker — is **`E-REGION-TAMPERED`**, exit 2, and that file
  is refused for merge; F3 offers replace-or-keep for it. This is what
  stops a forged region hijacking ownership of text the pack did not
  write, or truncating a real one. The comparison is F1's rule; the
  `update`-time execution of it is F3's.

---

**US-5 — Keep source-only and applied-only content in one file**
> As a pack author, I want a file to carry text that exists only in the
> pack and text that exists only in an applied copy so that a document
> describing its own application is correct in both places.

**Acceptance criteria:**
- The grammar is a single-line marker, alone on its line, inside the
  host language's comment syntax:
  `<!-- harness:<directive> [args] -->` for Markdown/HTML,
  `# harness:<directive> [args]` for shell, PowerShell, YAML and
  Python, `// harness:<directive> [args]` for TypeScript, JavaScript,
  CSS and Bicep. Every block ends with `harness:end` in the same
  wrapper.
- `harness:source-only` … `harness:end`: the markers **and** the body
  are removed from the applied output.
- `harness:applied-only` … `harness:end`: the markers are removed and
  the body is kept in the applied output.
- Content outside any marker is copied to the applied output unchanged.
- A line is only a marker if the comment is the sole non-whitespace
  content on that line. `See <!-- harness:end -->` in running prose is
  literal text.
- Markers inside a fenced code block (a line-initial ``` or ~~~ fence in
  a Markdown file) are **ignored**, so the pack's own documentation can
  show the syntax without triggering it.
- Nesting: `source-only` and `applied-only` may not nest inside each
  other or inside themselves. Violations fail with `E-REGION-NESTED`,
  naming file and line.
- An unterminated block fails with `E-REGION-UNTERMINATED`; a
  `harness:end` with no open block fails with `E-REGION-ORPHAN-END`; an
  unrecognised directive fails with `E-REGION-UNKNOWN`. All are detected
  before any file is written.
- The applied `targets/README.md` and `specifications/README.md`
  produced from a marked-up pack source are byte-identical to the
  hand-written applied copies in this repo (rows 7 and 8 of
  §Dogfooding), modulo the intended path rewrites of US-4.

---

**US-6 — Own part of a generated file without owning the whole of it**
> As a project owner, I want `harness update` to maintain the
> pack-derived sections of `CLAUDE.md` while never touching the prose I
> wrote so that I am not forced to choose between an update and my own
> notes.

**Acceptance criteria:**
- A mapping may declare `"mode": "regions"` with an ordered `regions`
  array of region ids (`^[a-z][a-z0-9-]{0,31}$`).
- In the source, a pack-owned region is
  `harness:region id=<id>` … `harness:end`. Unlike `source-only` and
  `applied-only`, these **markers are preserved verbatim in the applied
  output** — they are how `update` finds the region later.
- Everything outside a region in a `regions`-mode file is project-owned.
  No marker is needed to claim project ownership; that is the default.
- Every id in the mapping's `regions` array must appear exactly once in
  the source file, and no region may appear that is not declared.
  Violations fail with `E-REGION-UNDECLARED` / `E-REGION-DUPLICATE`.
- `regions` may not nest. A region **may** contain `source-only`,
  `applied-only` and `if` blocks, which are resolved before the region
  body is hashed.
- The manifest records, for a `regions`-mode file, the whole-file hash
  **and** a per-region body hash, so F3 can tell "the user edited their
  own prose" from "the user edited a pack-owned region".
- On a later update (F3's behaviour, enabled here): a region whose body
  hash still matches the manifest is replaced silently; a region whose
  body hash differs is 3-way merged; text outside every region is never
  read for merge purposes and never rewritten.
- A region declared by a newer pack version but absent from the applied
  file is inserted in the position implied by the declared `regions`
  order relative to the regions that are present.
- A region present in the applied file but no longer declared by the
  pack is left in place, marked `orphaned` in the manifest, and reported
  by `harness status`. It is never deleted.
- A mapping with `"mode": "managed"` (the default) is the degenerate
  case: the whole file is one implicit pack-owned region.
- A mapping with `"mode": "once"` is written at init and never updated;
  `status` reports its drift as informational only.
- A mapping with `"mode": "merge-json"` requires an `ownedKeys` array of
  dotted key paths. Only those paths are written or updated; all other
  keys in a pre-existing file are preserved byte-for-byte where the
  serializer allows.
- `merge-json` is the **only** mode permitted on a JSON target, and the
  region grammar never runs on it — JSON cannot carry comment markers
  (`F1-ADR-001`, Q-23).
- The manifest records, for a `merge-json` file, the whole-file hash
  **and** a **per-owned-key hash** — an `ownedKeys` array of
  `{ path, sha256, security?, entries?, removed? }` (US-10). The hash is
  the JSON analogue of `regions[].sha256`: it lets F3 tell "the user
  edited a key the pack owns" from "the user edited their own key", so a
  user's own settings edits are never misreported as pack drift.
- An existing target that is not parseable JSON fails with
  `E-MERGE-JSON-INVALID` and **nothing is written** — the pack never
  overwrites a settings file it could not read. The same code covers the
  post-serialization re-parse and deep-equal check of US-4.

**What a mapping may own is a property of the destination, not of the
pack** (`F1-ADR-001` §7.2.1, C-1). The defect this closes is not that
`merge-json` exists; it is that `ownedKeys` was unconstrained, so nothing
in the format distinguished `permissions.allow` from `theme`. The
constraint is therefore a table keyed by **applied path**. Every pack
writing that destination gets the same rule, so "adding a pack requires
no core change" (S5) survives intact: adding `planning` does not touch
the table.

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
- **Mode lockdown.** A mapping whose applied path is
  `.claude/settings.json` or `.claude/settings.local.json` may use
  **only** `"mode": "merge-json"`. Any other mode on that destination is
  **`E-SETTINGS-MODE-FORBIDDEN`**, exit 2 — otherwise `"mode": "managed"`
  is a trivial bypass of everything above.

**Packs may not register agent hooks at v1.0** (`F1-ADR-001` §7.2.5,
C-1). `hooks` and every path under it are outside the ownable set at
every destination. A pack declaring `"ownedKeys": ["hooks"]` — which was
*conforming* before this amendment — fails **`E-OWNEDKEY-FORBIDDEN`** at
validate time. The reasons, in the order of their weight:

1. **A hook is categorically unlike everything else a pack writes.** The
   whole of the rest of this format is "a pack writes text files into a
   project", and nothing else it writes executes. A hook is arbitrary
   shell, run by the agent runtime, on events the user does not initiate
   deliberately, with no per-invocation consent. One-time consent at init
   is not consent to the hundredth invocation.
2. **`update` makes the consent unbounded, and this is the reason that is
   not fixable by trying harder in F1.** A hook's command string is a
   merge target. The pack changes it, the user changed it, and F3's
   3-way merge resolves to a command **neither party wrote**. Honouring
   removals (below) is a strictly weaker guarantee than "a changed
   command re-consents", and this format has no design for
   consent-on-merge.
3. **There is no provenance story to hang it on.** v1.0 has no signing,
   no registry and no provenance fields in `pack.json` (§Out of scope).
   The bundled packs are low-risk; the **format** is not, because
   `harness validate` is what pronounces a pack well-formed and that
   pronouncement outlives "packs are bundled".
4. **The consent UX belongs to F2, whose spec does not exist yet.**
   Designing the declaration here and the consent there splits one
   decision that must not be split.

**What a pack may still do.** A pack **may** ship files under
`.claude/hooks/`. They are ordinary files: written `0644` (the executable
bit is forbidden under `.claude/` — US-3), registered by nothing and
executed by nothing. `harness validate` emits **`W-HOOK-SCRIPT-INERT`**
naming each such file and saying plainly that no v1.0 mechanism registers
it; the same files are listed in the init summary and in `harness pack
info` (US-29). This is deliberate rather than grudging: it gives a pack
somewhere to put a guard script, lets `update` carry it forward
unchanged, and makes the v1.1 route obvious — a `hooks` declaration whose
consent surface is designed together with F2's prompting, with the merge
problem of reason 2 solved before it ships. **`--accept-hooks` is a
parsed flag that always fails** with `E-HOOKS-NOT-SUPPORTED`, exit 1
(US-13), so a script written against a future version fails loudly
instead of silently doing nothing.

**Merging an array under an owned key, and honouring a user's removals**
(`F1-ADR-001` §7.2.4, C-3). The pre-amendment rule — "union, pack order
first" — silently resurrects a permission the user deliberately deleted,
because a deleted entry and a never-present entry are indistinguishable
without a record. The manifest supplies the record: `OwnedKeyEntry` gains
`entries` (exactly what this apply wrote, in written order) and `removed`
(what the user has since deleted). On `update`, for an array-valued
security-relevant key:

1. `removed' = (entries ∪ removed) \ onDisk`. Anything the CLI wrote
   before, or already knew was removed, that is not on disk now was
   removed **by the user**. `removed` is monotonic: an entry leaves it
   only when the user puts the value back by hand.
2. **The written array is the on-disk array in its on-disk order**, with
   the pack's new entries appended in pack-declared order, minus
   everything in `removed'`. This replaces "union pack-order-first":
   existing entries keep the order the user sees, so a merge is not also
   a reordering diff.
3. Each suppressed entry is reported with
   **`W-SETTINGS-REMOVAL-HONOURED`**, naming key and value. The user
   should know the pack asked and did not get it.
4. The apply records `entries` = the pack's current set and
   `removed` = `removed'`.
5. **A genuinely new grant re-gates.** An entry in the pack's set that is
   in neither `entries` nor `removed` is a new grant, and `update` re-runs
   the consent gate of US-13 **on the delta only**. No delta, no prompt —
   so `update` stays scriptable for every pack that is not asking for
   more.

A test may assert this end to end: apply a pack owning an array key,
delete one entry by hand, run `update` with the pack unchanged, and
require that the entry is still absent and that
`W-SETTINGS-REMOVAL-HONOURED` named it.

**`update` compares the recorded region set before it merges.** The
`E-REGION-TAMPERED` rule of US-4 applies to every `regions`-mode file on
every update, and the comparison includes regions the manifest marks
`orphaned`.

---

**US-7 — Reference a shared component and be stopped from breaking it**
> As a pack author, I want to pull a shared component into my pack by
> explicit reference so that a genuine duplicate is fixed once, and I
> want the tooling to stop me shipping a shared change that silently
> alters other packs.

**Acceptance criteria:**
- `shared/<component>/component.json` declares `name`, `version`
  (semver), `contentRoot` and its own **`mappings`** array — the
  component's destination map, in the same `Mapping` shape a pack uses
  (`F1-ADR-001`, Q-27). `shared/targets` therefore declares once that it
  lands in `targets/`, `.claude/agents/` and `.claude/commands/`, rather
  than every referencing pack repeating those lines and drifting apart
  on where a shared file goes. Its content is an ordinary source tree.
- A pack references it with an entry in `pack.json`'s `shared` array:
  `{ "ref": "<component>", "version": "<exact semver>",
  "integrity": "sha256-<hex>" }`. Ranges are not permitted; the version
  is exact.
- **Inheritance.** A referencing pack inherits the component's declared
  `mappings` as though they were its own, resolved against the
  component's `contentRoot`. It may override an individual destination
  with an optional `"remap": { "<component-relative from>":
  "<applied to>" }` on the `shared` entry. A `remap` key that names no
  mapping the component declares is a stale declaration and is reported
  as a validation **warning** under US-1's unknown-key rule; the ADR
  names no error code for it, and this spec does not invent one.
- Mapping resolution now has two sources — the pack's own `mappings` and
  each referenced component's — and collisions between them are caught
  by the existing `E-MAP-COLLISION` check, which is computed over the
  merged set.
- A pack that maps, or whose rendered content reads, a file under
  `shared/` without a matching entry in its `shared` array fails
  validation with `E-SHARED-UNDECLARED`. Nothing is inherited
  implicitly, and now that a component carries its own destination map
  the failure mode "it worked because some other pack declared it" has
  to be closed explicitly.
- `integrity` is the SHA-256 over the component's canonical content
  digest: the hex hashes of every file under `contentRoot`, each
  prefixed by its POSIX-normalized relative path, joined by `\n` in
  byte-ascending path order.
- A mapping may set `"shared": "<component>"`, in which case `from` is
  resolved against the component's `contentRoot` instead of the pack's.
- Nothing is inherited implicitly: a shared file that no mapping
  references is never applied, and `harness validate` warns
  (`W-SHARED-UNREFERENCED`) if a referencing pack maps none of the
  component's files.
- **Q-4 enforcement.** `harness validate` recomputes each referenced
  component's digest. A mismatch against a pack's recorded `integrity`
  is a hard error (`E-SHARED-STALE`) naming the component, the
  referencing pack, and every other pack that references it.
- The error is emitted for **every** referencing pack, not only the one
  being validated, so the "bump every pack" obligation is visible in one
  run.
- `harness validate --allow-stale-shared` downgrades it to a warning for
  local iteration — **on `harness validate` only** (`F1-ADR-001` §7.6,
  C-10). CI runs without the flag; the repo's release check fails on
  `E-SHARED-STALE`.
- **Integrity is fail-closed on every write path.**
  `--allow-stale-shared` is registered in the per-command flag table for
  `validate` and for no other command. Passed to `init`, `update` or
  `contribute` it fails with **`E-FLAG-NOT-PERMITTED`**, exit 1 — it is
  *not* silently ignored, because a user who typed it believed it did
  something. A shared-digest mismatch on any write path is
  `E-SHARED-STALE`, **exit 2, zero bytes written, and no override
  exists**. A test may assert both halves: `harness init --allow-stale-shared`
  exits 1 with `E-FLAG-NOT-PERMITTED`, and `harness init` against a
  stale-pinned pack exits 2 with `E-SHARED-STALE` and an unchanged
  directory.
- **An inherited mapping is confined exactly as a pack's own is.** Every
  inherited component mapping and every `remap` target passes through the
  same four-stage gate of US-3 — the same grammar, the same reserved-
  destination denylist on the resolved path, the same ancestor `lstat`s,
  the same `AppliedPath` brand. Confinement has one implementation and
  inheritance is not a second route into the project.
- The manifest records each referenced component's `ref`, `version` and
  `integrity`, so an applied project can prove which shared version it
  holds.

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
  (`F1-ADR-001` §7.3, C-7). `pattern` is a regex source that must begin
  `^` and end `$`, be at most 200 characters, and contain no
  backreference and no lookaround. A missing `pattern` is
  **`E-PARAM-NO-PATTERN`**, exit 2; an uncompilable, unanchored or
  over-long one, or one using a forbidden construct, is
  **`E-PARAM-PATTERN-INVALID`**, exit 2. The recommended conservative
  default — which an author **writes out** rather than inherits silently,
  so that the constraint is visible in the pack diff — is
  `^[\p{L}\p{N} ._-]{1,64}$` with the `u` flag. `pattern` is meaningless
  on `enum` and `boolean`, whose value sets are already closed, and
  declaring it there is `E-PARAM-PATTERN-INVALID`.
- **`maxLength`** applies to `type: "string"`, defaults to **256** and
  has a hard ceiling of **4096**. It is checked **before** `pattern` is
  run, so pattern evaluation is bounded by construction and a
  catastrophic-backtracking input is not reachable.
- **An answer is validated twice**: when it is collected, and **again
  every time it is read back from the manifest**. `W-MANIFEST-EDITED` is
  a warning, so a recorded answer is an editable value by this spec's own
  design, and `update` replays recorded answers on every run. A recorded
  answer failing its declared `pattern`, `maxLength` or `values` is
  `E-PARAM-INVALID`.
- **A credential-valued parameter is forbidden, not handled**
  (`F1-ADR-001` §7.6, C-15). At validate time, a parameter whose `id` or
  `prompt` matches
  `/api[_-]?key|private[_-]?key|secret|token|passwo?rd|credential|connection.?string/i`
  fails with **`E-PARAM-SECRET-SUSPECTED`**, exit 2, unless the parameter
  carries `"notASecret": true`. The regex deliberately does **not** match
  a bare `key`, which false-positives on `monkey`, `keyword` and
  `sortKey`. The message states plainly that an answer is written
  verbatim into `.harness/manifest.json` **and** into `.harness/base/`,
  both of which are committed to version control by design (US-10,
  US-12, Q-18) and are therefore exactly as public as the repository.
- At answer time, a value that *looks* like a credential — `-----BEGIN`,
  `sk-`, `ghp_`, `xox[baprs]-`, or 40 or more characters of high-entropy
  base64url — draws **`W-ANSWER-LOOKS-SECRET`**. A warning only: an error
  there is a false-positive machine.
- The tempting alternative — a `type: "secret"` that is prompted, used
  and never recorded — is **rejected**, because an unrecorded answer
  cannot be replayed and `update` re-renders from recorded answers by
  construction (§F1.8 item 1). v1.0 forbids credentials outright rather
  than supporting them halfway.
- **`flag` declares a CLI alias for the parameter** (`F1-ADR-001`,
  conflict 5). A parameter declaring `"flag": "calibration"` makes
  `--calibration helio` exactly `--set constraintFloor=helio`: the alias
  is registered from `pack.json` data at argv-parse time, and the CLI
  holds **no** pack-specific knowledge. This is what keeps S5 ("adding a
  pack requires no core change") testable — a fourth pack with a
  different axis declares its own alias and needs no CLI change.
- `flag` is kebab-case (`^[a-z][a-z0-9-]{0,31}$`). A `flag` that
  collides with a reserved CLI flag (`--set`, `--scaffold`, `--json`,
  `--strict`, `--force`, `--rollback`, `--all`, `--allow-stale-shared`,
  **`--accept-permissions`**, **`--accept-hooks`**), with a reserved
  word, or with another parameter's `flag` in the same pack, fails
  validation with `E-PARAM-FLAG-INVALID`. The reserved list is the whole
  list; a flag is reserved whether or not the command being run accepts
  it, because a pack must not be able to shadow a CLI flag on any
  command.
- **Pack-declared aliases force a two-pass argv parse, and it must be
  stated or an implementer reports a false `E-CLI-UNKNOWN-FLAG` for
  every alias** (`F1-ADR-001` §7.8.2). Pass 1 recognises global flags,
  command flags and the pack name, and **defers** every unrecognised
  token without judging it. Pass 2 re-parses with the resolved pack's
  `parameters[].flag` aliases registered, and only then may a token be
  reported unknown. Argv parsing is fail-closed at the end of pass 2: an
  unrecognised token is rejected, never ignored.
- An aliased flag is sugar and nothing more: it resolves to the same
  recorded answer, is subject to the same `E-PARAM-INVALID` /
  `E-PARAM-MISSING` checks, and is recorded in the manifest under the
  parameter's `id`, never under the flag name. Passing both the alias
  and `--set` for the same parameter with different values fails with
  `E-PARAM-INVALID`.
- A `required` parameter with no answer and no default fails the apply
  with `E-PARAM-MISSING`; an `enum` answer outside `values` fails with
  `E-PARAM-INVALID`, listing the permitted values verbatim.
- Answers are substitutable as `{{harness:param.<id>}}` (US-4).
- Content may vary by answer in two declared ways, and only these two:
  1. **Conditional mapping** — a mapping entry may carry
     `"when": { "<paramId>": "<value>" }` and is skipped unless the
     recorded answer matches. This selects whole files.
  2. **Conditional region** — `harness:if <paramId>=<value>` …
     `harness:end` keeps its body only when the answer matches. The
     markers are always removed from the applied output, so the applied
     file carries no trace of the branch not taken.
- Only single equality is supported. No boolean operators, no
  negation, no nesting of `if` inside `if`. Violations fail with
  `E-IF-UNSUPPORTED`.
- A parameter that appears in a `when` or an `if` must be declared
  `required` or carry a `default`, so no branch is ever evaluated
  against `undefined`. Violation fails validation with
  `E-PARAM-UNDECIDABLE`.
- `harness validate` renders the pack once **per combination** of
  parameters that appear in a `when` or `if`, and every combination must
  pass every other validation rule. The combination count is printed;
  validation fails with `E-PARAM-COMBINATORICS` above 32 combinations.
- All answers are recorded verbatim in the manifest, including defaults
  that were accepted without being typed, and including answers to
  parameters that turned out to select nothing.
- The `coding` and `writing` packs declare only substitution parameters;
  neither declares a `when` or an `if`. The `planning` pack declares
  `constraintFloor` as an `enum` with the two reference calibrations and
  `"flag": "calibration"`, which is the whole of the mechanism behind
  F5's `harness init planning --calibration <helio|cadenza>`. Its
  `calibrations/<name>/` layout is a pack-authoring convention over
  `when` mappings, not a format feature (`F1-ADR-001`, Q-13).

---

**US-9 — Declare opt-in scaffolds and compose them**
> As a project owner, I want to pick zero or more structural scaffolds
> at init so that I get a backend layout only if I have a backend
> (R6, and §Dogfooding's "`infrastructure/backend-deploy/` was **not**
> applied").

**Acceptance criteria:**
- `pack.json` declares a `scaffolds` array; each entry has `id`
  (`^[a-z][a-z0-9-]{0,31}$`), `description`, its own `mappings`, and
  optionally its own `parameters`, `rewrites` and `contributes`.
- Scaffolds are opt-in: with no `--scaffold` flag, none is applied.
- `--scaffold backend,frontend` selects by id; an unknown id fails with
  `E-SCAFFOLD-UNKNOWN`, listing the available ids verbatim.
- Composition is order-independent in effect: scaffolds are always
  applied in the order **declared in `pack.json`**, never the order
  typed on the command line, so two users typing the flags in different
  orders get byte-identical projects.
- A scaffold may not write an applied path already written by the base
  pack or by another scaffold. A collision is a validation error
  (`E-SCAFFOLD-COLLISION`) computed statically across every pair of
  scaffolds, and re-checked at apply for the selected set.
- A scaffold may append to a base-pack region via
  `"contributes": [{ "file": "<applied path>", "region": "<id>",
  "content": "<path under the scaffold's contentRoot>" }]`. Contributions
  are appended inside the named region in declared scaffold order. The
  target region must exist and be declared by the base pack, else
  `E-CONTRIB-NO-REGION`.
- The manifest records the selected scaffold ids, and every file entry
  records `origin` as `pack`, `shared:<component>` or
  `scaffold:<id>` — so `status` can say which scaffold a file came from
  and `update` can reapply exactly the same set.
- A scaffold's parameters are only prompted for, and only recorded, when
  that scaffold is selected.

---

**US-10 — Record what was applied**
> As a project owner, I want the applied project to carry a complete,
> machine-readable record of what was applied so that a later update can
> be computed rather than guessed (brief §7).

**Acceptance criteria:**
- After a successful apply, `.harness/manifest.json` exists at the
  project root with the schema in §Flows.
- It records: `manifestVersion`, `generatedBy.cli`, `pack` (`name`,
  `version`, `formatVersion`, `integrity`), `appliedAt` (RFC 3339 UTC),
  `lastUpdatedAt`, `parameters` (every declared parameter and its
  answer), `scaffolds` (selected ids, in declared order), `shared` (each
  referenced component with `ref`, `version`, `integrity`), `files`, and
  `integrity`.
- **`pack.integrity`** is the whole-pack tree digest, computed by the
  **same** `treeDigest` function as a shared component's `integrity`
  and the manifest's own (`F1-ADR-001`, Q-19): one digest function,
  three call sites. It lets a project prove it holds an unmodified
  `coding@1.0.0` without the pack being installed, and makes "your
  CLI's pack differs from what you applied" detectable.
- **`pack.integrity` is verified, and the comparison is scoped to
  same-name-same-version** (`F1-ADR-001` §7.6, C-11). When the installed
  pack's `name` **and** `version` equal the manifest's recorded
  `pack.name` and `pack.version`, the installed pack's `treeDigest` must
  equal the recorded `pack.integrity`, or **`E-PACK-INTEGRITY-MISMATCH`**,
  exit 2, and the merge is refused. Two different builds claiming one
  version means a 3-way merge would use a wrong "ours", which loses work
  silently. When the versions **differ** this is a genuine upgrade, the
  check does not apply, and `update` records the new digest — a blanket
  recompute-and-compare would make `harness update`, whose entire purpose
  is to change the pack version, a command that always fails.
  `harness status` reports the same-version mismatch as
  **`W-PACK-INTEGRITY-DIFFERS`** rather than failing, because `status`
  writes nothing. The check runs in F3; the codes are F1's.
- Exactly one `pack` object. The schema has no array of packs and no
  merge or precedence field. **A project holds exactly one pack.**
- Every file the apply wrote has exactly one entry in `files`, keyed by
  its applied path. **Every manifest `path` key is POSIX-separated and
  NFC-normalized, without exception** (`F1-ADR-001` §7.1.1) — an NFD key
  written from a macOS checkout would not match a Linux teammate's NFC
  one and would break G-F1-7 silently. `files` is sorted byte-ascending
  by path, over the normalized keys.
- Each file entry carries: `path`, `source` (pack-relative source path),
  `origin`, `mode`, `sha256`, `eol` (`lf` | `crlf`), `binary`,
  `executable`, the ordered `transforms` applied, for `regions`-mode
  files a `regions` array of `{ id, sha256, orphaned? }`, and for
  `merge-json`-mode files an `ownedKeys` array — the per-owned-key
  records of US-6.
- **An `ownedKeys` entry is `{ path, sha256, security?, entries?,
  removed? }`** (`F1-ADR-001` §7.2.4, C-3):
  - `security` is `true` when the key was security-relevant at its
    destination under US-6's table at the time of the apply. It is
    **recorded rather than re-derived**, so a later CLI whose allowlist
    has moved still knows what *this* apply treated as sensitive.
  - `entries` is the exact array this apply wrote, in written order, and
    is present only for an array-valued security-relevant key.
  - `removed` is the monotonic set of entries the user has since deleted,
    which `update` must not re-add.
- `.harness/manifest.json`, `.harness/base/`, `.harness/.gitattributes`
  and the manifest's own entries are **not** listed in `files` — the
  manifest never describes itself.
- The manifest is committed to version control; `harness init` does not
  add `.harness/` to `.gitignore` and prints nothing suggesting it
  should be.
- **State this plainly wherever it is relevant: `parameters` and
  `.harness/base/` are committed and repo-public.** Every recorded
  answer, and a copy of the exact applied bytes of every text file, are
  written into files this spec requires to be committed. They are exactly
  as public as the repository holding them, no more private, and no
  facility exists to mark one secret. That is the reasoning behind
  US-8's outright ban on credential-valued parameters
  (`E-PARAM-SECRET-SUSPECTED`), and it is stated here rather than only
  there because this is the story that decides where an answer ends up.
- `harness init` writes a generated **`.harness/.gitattributes`**
  (`base/** -text -diff`, `manifest.json text eol=lf`). It is not a
  convenience: without it, a Windows clone with `core.autocrlf=true`
  rewrites every base copy on checkout and every base read then fails
  `E-BASE-CORRUPT` — the merge base would be broken by the
  version-control system it was committed to survive (`F1-ADR-001`,
  Q-18). It carries no timestamp and is byte-identical across applies.
- Re-serializing an unchanged manifest produces byte-identical output.

---

**US-11 — Tell whether the project has edited a generated file**
> As a project owner, I want the CLI to tell me exactly which generated
> files I have edited since apply so that `update` and `status` are
> honest about drift.

**Acceptance criteria:**
- For each entry in `files`, drift is determined by recomputing the
  normalized SHA-256 of the file on disk and comparing it to `sha256`.
- Four states are distinguishable and reported distinctly: `clean`
  (hash matches), `modified` (file exists, hash differs), `missing`
  (recorded but absent from disk), `untracked` (present under a
  pack-mapped path but absent from `files`).
- A file checked out with CRLF endings on Windows whose content is
  otherwise unchanged reports `clean`, not `modified`.
- A file with a UTF-8 BOM added by an editor, and no other change,
  reports `clean`.
- A binary file is compared byte-for-byte with no normalization.
- For a `regions`-mode file, drift is additionally reported per region,
  and a change confined to project-owned prose reports the file as
  `modified` but every region as `clean`.
- For a `merge-json` file, drift is additionally reported per owned key,
  and an array-valued security-relevant key reports the entries the user
  deleted, so `update` can honour them (US-6).
- **Drift sees the mode bit** (`F1-ADR-001` §7.4, C-12). A file whose
  on-disk executable bit differs from the manifest's `executable` is
  reported `modified` **even when the content hash still matches**, with
  a `modeChanged` flag distinguishing it from a content change. An
  on-disk `chmod +x` is a change, and content-hash-only drift was blind
  to it — which is precisely the drift a reviewer most needs to see.
- **The Windows caveat, recorded rather than papered over.** Windows does
  not represent the executable bit, so there `modeChanged` is always
  false and drift is content-only. This is the **one** place G-F1-7's
  cross-platform promise genuinely differs by platform, and the report
  says so rather than implying a check ran.
- **The `untracked` scan is bounded and does not follow links**
  (`F1-ADR-001` §7.6, C-17). The project scan and the `contentRoot`
  recursion share one bounded walk: **maximum depth 32** and **maximum
  10,000 entries** per walk, exceeding either being **`E-TRAVERSAL-LIMIT`**,
  exit 2. Entries are `lstat`ed, never `stat`ed. A symlink met by the
  project scan is skipped with **`W-SCAN-SYMLINK-SKIPPED`** naming it; a
  symlink under `contentRoot` remains `E-SYMLINK-IN-PACK`. The project
  scan does not descend into `.git/`, `.hg/`, `.svn/`, `.harness/` or
  `node_modules/`.
- Drift scanning never writes to the project.

---

**US-12 — Provide an exact merge base**
> As a project owner, I want `update` to merge a new pack version
> against what was originally applied so that my local edits survive,
> and I want `contribute` to diff my copy against the pack version I
> actually applied.

**Acceptance criteria:**
- At apply, the exact bytes written for every non-`once` text file are
  also written to `.harness/base/<applied path>`, preserving the
  relative path.
- **`.harness/base/` is text-only.** No base copy is written for a
  binary file, because a binary cannot be 3-way merged: `update` offers
  replace-or-keep for it and `contribute` skips it (`F1-ADR-001` §6.3,
  making explicit what this story already implied). A binary file's
  drift is still detected — the manifest's raw `sha256` is enough for
  that.
- The base copy's normalized SHA-256 equals the entry's `sha256`; a
  mismatch at read time is `E-BASE-CORRUPT`.
- 3-way merge (F3) and `contribute` (F4) use `.harness/base/<path>` as
  the base, the on-disk file as "theirs", and the freshly rendered new
  pack version as "ours" — with no network access and without the
  previously installed pack version being present.
- If `.harness/base/` is missing or a specific base file is absent,
  `update` does not guess: it reports the affected files and refuses to
  merge them. **Severity is a property of the code, not of the occasion**
  (`F1-ADR-001` §7.6, §7.8.5), so the scenario carries **two codes with
  one severity each** rather than one code whose severity varies:
  - **`W-BASE-MISSING`** (warning) when a per-file resolution policy
    exists — `--take-pack`, `--keep-mine`, or an interactive answer. The
    file is handled, the run continues, and a run in which every affected
    file is resolved exits **0**.
  - **`E-BASE-MISSING`** (error, exit 1) when no resolution policy exists
    and none can be obtained, which in practice means non-interactive
    with neither flag given.
  This keeps "the exit class is a property of the run, not of a file"
  true: the exit code folds a bag of fixed severities and never needs to
  know which command produced them. F3 may not invent a third behaviour
  and in particular may not vary a code's severity by context.
- `.harness/base/` is committed to version control by default, so a
  teammate who pulls the repo can run `update` and get the same merge
  result (Q-18, closed by `F1-ADR-001`), protected by the generated
  `.harness/.gitattributes` of US-10.
- Base files are stored with `eol: lf` normalization applied, so the
  base is platform-independent.

---

**US-13 — Apply atomically, or not at all**
> As a project owner, I want a failed apply to leave no half-written
> project so that I never have to work out by hand which files landed.

**Acceptance criteria:**
- The apply computes the **complete** applied file set in memory and
  runs every validation (mappings, collisions, region grammar,
  substitution, rewrites, anatomy, shared integrity, path safety)
  **before writing any file**. A failure at this stage writes nothing,
  not even `.harness/`.
- `harness init` into a directory where any target applied path already
  exists fails with `E-TARGET-EXISTS`, listing the first ten colliding
  paths and the total count. `--force` proceeds only for paths whose
  existing content is byte-identical to what would be written; any other
  collision still fails.
- **The consent gate runs on the plan, before the lock is taken and
  before the first byte** (`F1-ADR-001` §7.2.2, C-2). The planner builds
  a **disclosure** which enumerates **every value** the apply would write
  under a security-relevant owned key (US-6), **verbatim, one entry per
  line, never summarised and never counted** — "adds 14 permissions" is
  not consent, it is a number — together with every 0755 path and every
  inert `.claude/hooks/` script. Consent is then decided by this table
  and by nothing else:

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
  three surfaces — `harness init`'s pre-write summary, `harness pack
  info` (US-29) and `harness validate --json`. One builder, three
  surfaces, so the summary and the prompt cannot disagree.
- Before writing, a **journal (version 2)** is written to
  `.harness/journal.json` and flushed. It records, per intended path: the
  hash this apply intends to write, **`preExisting`**, the **pre-apply
  hash** and **pre-apply mode** (both `null` when the path did not
  exist), and a **`backup`** path under `.harness/journal.d/` holding the
  pre-apply bytes. A backup is written **before** the overwrite and is
  present exactly when `preExisting` is true and the pre-apply hash
  differs from the intended hash, so only a genuine overwrite pays for
  one. The journal also records the directories the apply created, in
  creation order.
- A journal declaring any `version` other than `2` is
  **`E-JOURNAL-UNREADABLE`**, exit 2 — the fail-closed rule of US-1
  applied to the journal. Version 1 never shipped; the check exists so
  that it never can.
- **Each write re-confines and creates exclusively** (`F1-ADR-001` §7.1.4,
  C-14). `executeApply` re-runs US-3's stage 3 **immediately before each
  write**, because the plan's `lstat` is stale by the time the write
  happens:
  - the temp file is created with exclusive semantics
    (`open(tmp, 'wx', mode)`), so a pre-placed temp name cannot be
    written through;
  - a destination the plan expects to be **new** is claimed by
    `link(tmp, dest)` then `unlink(tmp)` — `link` fails `EEXIST` if the
    destination appeared in the window, which is the exclusive-create
    semantic `rename` does not give. Where `link` is unavailable
    (`EPERM`/`ENOSYS` on an exotic filesystem), the fallback is
    claim-with-`open(dest,'wx')` then `rename`, and the run's diagnostics
    record the narrowed guarantee rather than claiming the stronger one;
  - a destination the plan expects to **exist** (`--force` byte-identical,
    a `merge-json` into an existing file, an `update`) is `lstat`ed,
    confirmed a regular file, re-hashed, and confirmed still equal to
    what the plan observed, before the `rename`.
  - Any of those confirmations failing is **`E-TARGET-RACE`**, exit 2.
    The run stops with the journal in place and is recoverable by
    `--rollback`.
- If the process dies mid-write, the journal survives. The next
  `harness` command in that project detects it and fails with
  `E-JOURNAL-PRESENT`, offering `harness init --rollback`.
- **`--rollback` deletes only paths this apply created, restores only
  paths this apply overwrote, and acts on neither unless the on-disk
  bytes are still exactly what this apply wrote** (`F1-ADR-001` §7.5,
  C-13). The pre-amendment journal could not express that invariant:
  under `--force`, a byte-identical pre-existing path was journalled with
  a hash that already matched on disk, so rollback deleted a file the
  apply never created. The five cases are exhaustive:

  | `preExisting` | pre-apply hash | on-disk hash now | Rollback |
  |---|---|---|---|
  | false | — | = intended | **delete** — we created it and it is still ours |
  | false | — | ≠ intended | **keep**, and report — the user edited it after the crash |
  | true | = intended | = intended | **leave untouched**, report as kept — this is the `--force` byte-identical case; the file was already correct and was never ours |
  | true | ≠ intended | = intended | **restore from `backup`**, report as restored |
  | true | any | ≠ intended | **keep**, and report — the user edited it after the crash |

- Directories the apply created are removed in **reverse creation
  order**, and only when empty. Rollback then removes `.harness/`, and
  reports every path it declined to touch and why.
- The journal and `.harness/journal.d/` are removed only after the
  manifest is successfully written; the manifest write is the last write
  of an apply.

---

**US-14 — Re-run init without surprises**
> As a project owner, I want re-running `harness init` in an
> already-applied project to be a defined operation so that I do not
> destroy work by repeating a command.

**Acceptance criteria:**
- `harness init` in a project that already has `.harness/manifest.json`
  fails with `E-ALREADY-APPLIED` and names `harness update` and
  `harness status`. Nothing is written.
- `harness init --force` with the **same** pack, same pack version, same
  parameter answers and same scaffold set, in a project with no drift,
  writes zero bytes: every file already matches, the manifest is
  byte-identical (`appliedAt` is preserved from the original apply,
  `lastUpdatedAt` is not touched), and the command reports
  `0 files changed`.
- `harness init --force` with different parameter answers or a different
  scaffold set fails with `E-REINIT-DIVERGENT` — changing an answer
  after init is out of scope for v1.0 (Q-21, Q-22).
- Applying the same pack twice into two empty directories with identical
  inputs produces byte-identical trees and manifests differing only in
  `appliedAt`.
- Determinism holds across platforms: the per-file `sha256` values are
  identical on macOS, Linux and Windows.

---

**US-15 — Behave predictably when the manifest is unusable**
> As a project owner, I want clear behaviour when the manifest is
> missing, corrupt, hand-edited or newer than my CLI so that the tool
> never guesses about state it cannot read.

**Acceptance criteria:**
- **Missing.** `status`, `update` and `contribute` fail with
  `E-MANIFEST-MISSING`. No attempt is made to infer the pack from the
  file tree.
- **Corrupt** (unparseable JSON, or failing schema validation):
  `E-MANIFEST-CORRUPT` naming the parse position or failing key. The CLI
  does not attempt repair and does not overwrite the file.
- Before any command rewrites the manifest, the previous version is
  copied to `.harness/manifest.json.bak`, overwriting the prior backup.
  `E-MANIFEST-CORRUPT` names the backup if one exists.
- **Hand-edited.** `integrity` is the SHA-256 over the canonical
  serialization of the manifest with the `integrity` key removed. A
  mismatch is a **warning** (`W-MANIFEST-EDITED`), not an error: a human
  may have legitimately corrected a path. Commands continue, and
  `status` marks the report as based on an edited manifest.
- **Newer manifest version.** `manifestVersion` greater than the CLI's
  supported version fails every command with `E-MANIFEST-NEWER`. This is
  never a warning.
- **Newer CLI recorded.** `generatedBy.cli` newer than the running CLI,
  at the same `manifestVersion`, is a warning
  (`W-MANIFEST-NEWER-CLI`) and commands proceed.
- **Forward compatibility.** Within one `manifestVersion`, unknown keys
  found in the manifest are preserved verbatim on rewrite, so an older
  CLI does not discard a newer one's data.
- **Newer pack than installed.** A recorded `pack.version` newer than
  any pack bundled with the running CLI is a warning
  (`W-PACK-NEWER-THAN-CLI`) suggesting a CLI upgrade; `status` still
  reports drift, because drift needs only the manifest and
  `.harness/base/`.

---

**US-16 — Validate a pack before it ships**
> As a pack author, I want one command that checks a pack against every
> rule in this spec so that a malformed pack is caught in CI rather than
> in a user's project.

**Acceptance criteria:**
- `harness validate <pack>` (and `harness validate --all`) runs the
  checks in the fixed order below, so a pack fails on the earliest and
  most explicable cause rather than on whichever check happens to run
  first (`F1-ADR-001` §7.7). The order is part of the contract; the
  security checks introduced by the remediation pass are interleaved at
  positions 1, 2, 3, 3b, 3c, 7 and 8:

  ```
  1   pack.json schema           + E-UNKNOWN-VALUE (the fail-closed value rule, US-1)
  2   anatomy completeness       + E-ANATOMY-SOURCE-ON-ABSENT (US-2)
  3   mapping + path safety      → US-3 stages 1 and 2:
                                   E-MAP-PATH-GRAMMAR, E-MAP-RESERVED-DEST,
                                   E-MAP-CASE-COLLISION, E-MAP-NORM-COLLISION
  3b  executable declarations      E-EXEC-ROOT-UNDECLARED, E-EXEC-DEST-FORBIDDEN,
                                   E-EXEC-TOO-MANY
  3c  destination policy           E-OWNEDKEY-FORBIDDEN, E-SETTINGS-MODE-FORBIDDEN,
                                   W-HOOK-SCRIPT-INERT
  4   region grammar             (US-5, US-6)
  5   rewrite usefulness         (US-4)
  6   shared integrity             E-SHARED-STALE — downgradable HERE ONLY (US-7)
  7   parameter declarations       E-PARAM-NO-PATTERN, E-PARAM-PATTERN-INVALID,
                                   E-PARAM-SECRET-SUSPECTED
  8   per-combination render     + E-SUBST-IN-SECURITY-KEY,
                                   E-SUBST-MARKER-INJECTION
  9   scaffold collisions        (US-9, over the merged mapping set)
  10  link integrity             (below)
  11  disclosure                 build the security disclosure over all combinations
  ```

- **Stage 3 of US-3's confinement — resolution confinement — is not in
  this list**, and its absence is deliberate: `harness validate` has no
  project root to resolve. It runs at plan time and at write time only.
  A pack is therefore validatable in CI without a target project, which
  is what makes the authoring-time checks the high-value half of the
  security model.
- It additionally performs a **link-integrity check**: every relative
  Markdown link and inline path reference in the rendered applied output
  that points at a path inside the project must resolve to a file the
  apply produces, for at least one scaffold selection. A dangling
  reference is `W-LINK-DANGLING`, listing file, line and target. This is
  what turns §Dogfooding row 6 from a manual fixup into a checked
  property.
- Every check reports file and line where the concept has one.
- Exit code is `0` with no findings, `1` with warnings only under
  `--strict`, `2` with any error.
- `harness validate --all` is runnable in this repo's CI and passes for
  all three v1.0 packs before release.
- `harness validate --all` is also the **enforcement point for Q-4's
  shared-bump rule**, and F1 owns both the logic and the surface. There
  is no maintainer subcommand elsewhere: this repo's CI runs
  `harness validate --all` without `--allow-stale-shared`, and a
  non-zero exit is the enforcement (Q-15, closed by `F1-ADR-001`; this
  amends the master spec's earlier default that F4 would expose it).
- **Content moving *out* of a project passes the identical check set**
  (`F1-ADR-001` §8.1, C-18). F1 exposes the pack-content policy as **one
  callable gate**, which takes the pack directory, the `pack.json` a
  patch would produce, and the patched file set with its executable bits,
  and returns diagnostics. `harness contribute` (F4) routes **every**
  patch through that gate before it writes into a pack, and a patch that
  fails it is **`E-CONTRIB-POLICY`**, exit 2, naming the underlying code.
  **F4 may not hold a second copy of any of these checks** — a second
  copy is a second thing to forget to update, and the whole point of one
  gate is that a check added here is automatically enforced on the way
  out.

---

**US-29 — See what a pack contains before applying it**
> As someone deciding which pack to apply, I want one command that
> describes a pack — its identity, its nine anatomy parts, its
> scaffolds, its parameters and its shared references — so that I adopt
> it knowing what it does and does not give me.

**Acceptance criteria:**
- `harness pack info <name>` exists and is an **F1** command
  (`F1-ADR-001`, conflict 6). It is defined as `renderPackInfo(report)`
  over the **same** `PackReport` structure `harness validate --json`
  emits, so there is exactly one anatomy-report code path and the two
  surfaces cannot disagree.
- It prints: pack `name`, `version`, `title`, `formatVersion`,
  `minCliVersion` and `integrity`; all nine anatomy parts in the fixed
  `AnatomyPartId` order with `present | provisional | absent` and, for
  `provisional` its `note` and for `absent` its `reason`; the available
  scaffolds with `id`, `description` and file count; the declared
  parameters including any `flag` alias and, for an `enum`, its
  permitted values; and each referenced shared component with `ref`,
  `version` and whether its `integrity` still checks out.
- **It renders the pack's security disclosure, in full and verbatim**
  (`F1-ADR-001` §7.2.2, C-2, C-12), over the same structure `harness
  init`'s pre-write summary uses. Specifically it prints:
  - **every value** the pack would write under a security-relevant owned
    key, in **any** parameter combination — one value per line, verbatim,
    **never summarised, never truncated and never counted**, with its
    destination file and key and whether the pack sets or appends it;
  - **every applied path the pack would write `0755`**, with the source
    it comes from;
  - **every file the pack ships under `.claude/hooks/`**, each stated
    plainly as inert — shipped, `0644`, and registered by nothing at
    v1.0 (US-6), so a reader is not misled into thinking it runs.
  This is what lets someone see what a pack will take **before** deciding
  to apply it, which is the whole reason the disclosure is computed by
  the pure planner rather than at the prompt. For every v1.0 pack the
  security-relevant list is **empty**, and the command says so rather
  than printing nothing.
- It reports `parameterVaryingFiles` — the applied paths whose bytes
  depend on an answer — and **`parameterVaryingRegions`**, the
  region-granular form of the same fact: `{ path, region }` for every
  region whose body differs across parameter combinations. File
  granularity cannot express "this file varies here and is byte-identical
  there", which is exactly the shape F5's US-19 asserts about the
  planning pack's gate record. The validator computes both from the
  per-combination render it already runs, so the region-granular form
  costs nothing new.
- It reads the pack only. It writes nothing, needs no applied project,
  needs no manifest and makes no network request.
- For a pack that fails validation it reports the offending part as
  `missing` and exits with the same class as `harness validate` would —
  `2` for a pack-integrity error. For a valid pack it exits `0`, or `1`
  under `--strict` with warnings only.
- `harness pack info <name> --json` emits the `PackReport` verbatim, so
  F6 and CI consume the structure rather than the rendering.
- This story is what F5's US-20, US-21 and US-22 acceptance criteria
  bind against; F5 asserts the per-pack *content* those criteria expect,
  F1 owns the command and the schema it prints.

---

## Error States

**This table is the product's only message catalogue, and F1's `E-`/`W-`
codes with its `0/1/2/3` exit classes are the only CLI error model**
(`F1-ADR-001`, conflict 4). No other feature spec defines a CLI code, an
exit code or a diagnostic string; F5 owns user-facing text only for
strings a *pack ships* — a slash command's block message, an agent's
halt, a target run's ABORT — which are pack content, not CLI
diagnostics. **The code is the stable contract**: F6 and CI branch on the
code and never on prose. Message text is verbatim within a minor version
and may be reworded across one.

**Severity is a property of the code, not of the occasion**
(`F1-ADR-001` §7.6). A scenario that is fatal in one context and
tolerable in another gets **two codes**, not one code with two
severities — the rule this catalogue applies to `E-BASE-MISSING` /
`W-BASE-MISSING` and to `E-PACK-INTEGRITY-MISMATCH` /
`W-PACK-INTEGRITY-DIFFERS`. It is what keeps "the exit class is a
property of the run" true: the exit code folds a bag of fixed severities
and never needs to know which command it is in. Every row below therefore
carries exactly one severity, and no consumer may reinterpret one.

Message convention: line 1 states the failure and begins `harness:`;
subsequent lines are indented two spaces; a line beginning `→` states
the remedy. `{…}` marks an interpolated value. Messages are written to
stderr; warnings are written to stderr and do not change the exit code.

| Scenario | Expected Behaviour |
|---|---|
| `E-PACK-CLI-TOO-OLD` — pack requires a newer CLI | Exit 1. `harness: pack {name}@{version} needs harness {minCliVersion} or newer.` / `  You are running harness {cliVersion}.` / `  → Upgrade with: npm i -g @lintel/harness@latest` |
| `E-PACK-FORMAT-NEWER` — `formatVersion` unknown | Exit 2. `harness: pack {name} uses pack format {n}; this CLI understands up to {m}.` / `  → Upgrade the CLI, or use a pack built for format {m}.` |
| `E-ANATOMY-MISSING` — one of the nine parts is undeclared, or declares neither a content source nor `"status": "absent"` | Exit 2. `harness: pack {name} does not declare the anatomy part "{part}".` / `  A pack must declare all nine parts. Declare it, or mark it absent with a reason:` / `    "{part}": { "status": "absent", "reason": "…" }` |
| `E-ANATOMY-EMPTY` — a declared part matches no files | Exit 2. `harness: anatomy part "{part}" in pack {name} matches no files.` / `  Patterns: {globs}` / `  → Fix the paths, or mark the part absent with a reason.` |
| `E-ANATOMY-NO-REASON` — `"status": "absent"` with no reason | Exit 2. `harness: anatomy part "{part}" in pack {name} is absent without a reason.` / `  An absent part must say why it is absent.` / `  → "{part}": { "status": "absent", "reason": "…" }` |
| `E-ANATOMY-NO-NOTE` — `"status": "provisional"` with no note | Exit 2. `harness: anatomy part "{part}" in pack {name} is provisional without a note.` / `  A provisional part must say what is unsettled about it.` / `  → "{part}": { "paths": […], "status": "provisional", "note": "…" }` |
| `E-ANATOMY-SOURCE-ON-ABSENT` — a content source alongside `"status": "absent"` | Exit 2. `harness: anatomy part "{part}" in pack {name} is declared absent but also declares content ("{sourceKey}").` / `  A part cannot both not exist and have content, and harness will not guess which was meant.` / `  → Remove "{sourceKey}", or drop "status": "absent".` A contradiction, not an unknown key: US-2 keeps redundancy (`reason` on a present part, `note` on an absent one) as a warning. |
| `E-UNKNOWN-VALUE` — an unrecognised value in a behaviour-selecting position (US-1) | Exit 2. `harness: "{value}" is not a valid {field}.` / `  Allowed: {allowed}` / `  → Fix the value, or upgrade to a harness that understands it.` Used wherever the position has no more specific code. Unknown **keys** stay a warning; unknown **values** are never ignored, because ignoring one runs behaviour the pack did not ask for. |
| `W-ANATOMY-ABSENT` — a part is declared absent (at init) | Warning, exit unchanged. `harness: pack {name} declares no {part}.` / `  Reason given: {reason}` |
| `W-ANATOMY-PROVISIONAL` — a part is declared provisional | Warning, exit unchanged. `harness: pack {name} ships {part} as provisional.` / `  Note: {note}` |
| `E-MAP-ESCAPES-ROOT` — `to` leaves the project | Exit 2. `harness: mapping "{from}" → "{to}" writes outside the project root.` / `  → Applied paths must be relative and must not contain "..".` |
| `E-MAP-COLLISION` — two mappings write one path | Exit 2. `harness: two mappings both write "{path}".` / `  {fromA}` / `  {fromB}` / `  → A pack may write each applied path exactly once.` |
| `E-MAP-CASE-COLLISION` — two applied paths differ only by case. **Folding is defined**: two paths collide when their *collision keys* are equal, where a collision key is the applied path NFC-normalized **and then** case-folded (US-3). Computed over the merged mapping set — pack, scaffolds, and inherited component mappings after `remap` | Exit 2. `harness: "{a}" and "{b}" differ only by letter case.` / `  On macOS and Windows these are the same file.` / `  → Rename one of them in the pack.` |
| `E-MAP-NORM-COLLISION` — two applied paths collide after Unicode normalization, and the collision is **not** a case difference | Exit 2. `harness: "{a}" and "{b}" are two byte sequences for the same filename.` / `  They differ only in Unicode normalization (NFC vs NFD), so macOS stores them as one file.` / `  → Write both "to" values in NFC, using the same code points.` |
| `E-MAP-PATH-GRAMMAR` — a `to` value does not match the anchored applied-path grammar of US-3 | Exit 2. `harness: mapping "{from}" → "{to}" is not a legal applied path.` / `  {construct}` / `  → An applied path is one or more "/"-separated segments, relative, NFC, with no "..", no backslash, no drive letter and no segment ending in "." or whitespace.` The `{construct}` line names the specific offence — leading separator, backslash, drive-relative prefix, UNC prefix, dot segment, trailing dot or whitespace, reserved Windows basename, or non-NFC. |
| `E-MAP-RESERVED-DEST` — an applied path resolves into a reserved destination | Exit 2. `harness: "{from}" → "{to}" resolves into "{reserved}", which a pack may not write.` / `  Reserved: .git/ .hg/ .svn/ .harness/ and the directory harness itself is installed in.` / `  → Choose a destination inside the project that harness does not own.` Applies equally to a mapping, a scaffold mapping, an inherited component mapping, a `remap` target, a `contributes[].file` and an `executableRoots` entry, because it is checked after resolution. |
| `E-DEST-SYMLINK` — a destination, or an ancestor of one, is a symlink, junction or other reparse point | Exit 2. `harness: "{component}" on the way to "{path}" is a symbolic link.` / `  harness does not traverse or create through a link, because where a link points is not something this project controls.` / `  → Replace the link with a real directory, or apply into a tree that has none.` Raised at plan time and again immediately before the write. |
| `W-PATH-NON-NFC` — a source basename discovered by directory recursion is not NFC | Warning. `harness: "{path}" is not in Unicode NFC; its applied path has been normalized.` / `  An NFD name recorded in the manifest would not match the same file on Linux.` |
| `E-EXEC-ROOT-UNDECLARED` — `executable: true` outside every declared `executableRoots` prefix | Exit 2. `harness: mapping "{from}" → "{to}" sets the executable bit outside every declared executableRoots prefix.` / `  Declared: {roots}` / `  → Add the destination's prefix to "executableRoots", or drop "executable": true.` |
| `E-EXEC-DEST-FORBIDDEN` — an executable lands, or an `executableRoots` prefix resolves, under a forbidden directory | Exit 2. `harness: "{path}" may not be executable.` / `  A pack may never write an executable file under .claude/ .git/ .hg/ .svn/ or .harness/.` / `  → Ship the script as an ordinary 0644 file, or place it elsewhere in the project.` Checked at declaration and again per applied path, so a directory recursion cannot reach a forbidden destination the root did not name. |
| `E-EXEC-TOO-MANY` — more than 32 executable files in one apply | Exit 2. `harness: this apply would write {n} executable files; the limit is 32.` / `  → Reduce the number of executables, or raise the limit in an ADR of its own.` |
| `E-REWRITE-UNUSED` — a rewrite matches nothing | Exit 2. `harness: rewrite "{find}" → "{replace}" matched nothing in {globs}.` / `  A rewrite that no longer applies is stale.` / `  → Remove it, or fix its "in" patterns.` |
| `E-SUBST-UNRESOLVED` — token left in output | Exit 2. `harness: unresolved {{harness:{token}}} in {path}:{line}.` / `  → Declare a parameter named "{id}", or remove the token.` Nothing is written. |
| `E-SUBST-IN-SECURITY-KEY` — a `{{harness:…}}` token in a value that lands under a security-relevant owned key | Exit 2. `harness: {path}:{line}: "{key}" is a security-relevant setting and its value may not be substituted.` / `  A permission is a decision the pack author makes, not one a user makes by answering a prompt.` / `  → Write the value literally in the pack.` Raised at validate time, per parameter combination. **No override exists.** |
| `E-SUBST-MARKER-INJECTION` — a substituted value contains a line break, or the line it produces lexes as a `harness:` directive | Exit 2. `harness: the answer for "{id}" would change the structure of "{path}".` / `  {reason}` / `  → Answers may not contain line breaks, and may not complete or forge a harness: marker.` `{reason}` is either `a line break (\n, \r, U+2028 or U+2029)` or `the line it produces reads as "harness:{directive}"`. The line-break ban is the sufficient condition and holds even when a parameter's `pattern` is weak. |
| `E-REGION-NESTED` | Exit 2. `harness: {path}:{line}: "{directive}" cannot be nested inside "{outer}".` |
| `E-REGION-UNTERMINATED` | Exit 2. `harness: {path}:{line}: "{directive}" is never closed.` / `  → Add a matching harness:end.` |
| `E-REGION-ORPHAN-END` | Exit 2. `harness: {path}:{line}: harness:end with no open block.` |
| `E-REGION-UNKNOWN` | Exit 2. `harness: {path}:{line}: unknown directive "harness:{directive}".` / `  Known directives: source-only, applied-only, region, if, end` |
| `E-REGION-UNDECLARED` — region id not in the mapping | Exit 2. `harness: {path}:{line}: region "{id}" is not declared for this file.` / `  Declared: {ids}` |
| `E-REGION-DUPLICATE` | Exit 2. `harness: {path}: region "{id}" appears more than once.` |
| `E-REGION-TAMPERED` — on `update`, the applied file's region set does not match the manifest's record | Exit 2. `harness: the pack-owned regions in "{path}" no longer match what was applied.` / `  {difference}` / `  harness will not merge into a file whose region markers have been added, removed, reordered or left unterminated.` / `  → Restore the markers, or choose --take-pack / --keep-mine for this file.` The comparison is against `files[].regions` **including entries marked `orphaned`**; `{difference}` names the added, missing, reordered or unterminated id. |
| `E-IF-UNSUPPORTED` — compound or nested conditional | Exit 2. `harness: {path}:{line}: harness:if supports one "<param>=<value>" test only.` / `  → Split the file, or use a conditional mapping instead.` |
| `E-SHARED-STALE` — Q-4 rule violated | Exit 2. `harness: shared component "{ref}" has changed since the packs that reference it were pinned.` / `  recorded {recorded}` / `  actual   {actual}` / `  Referencing packs that must be bumped and re-pinned: {packs}` / `  → Bump each pack's version and update its "integrity".` **The `--allow-stale-shared` downgrade exists on `harness validate` only** (US-7). On `init`, `update` or `contribute` this is exit 2 with zero bytes written and **no override**; the final `→` line offers the flag only when the command is `validate`. |
| `E-FLAG-NOT-PERMITTED` — a known flag passed to a command that does not accept it | Exit 1. `harness: --{flag} is not available on "harness {command}".` / `  It is accepted on: {commands}` / `  → Remove it, or run the command that accepts it.` Distinct from `E-CLI-UNKNOWN-FLAG`: this flag exists, and it is refused rather than ignored, because a user who typed it believed it did something. `harness init --allow-stale-shared` is the case this exists for. |
| `E-PACK-INTEGRITY-MISMATCH` — the installed pack has the recorded name and version but a different tree digest | Exit 2. `harness: the installed {name}@{version} is not the build this project applied.` / `  recorded {recorded}` / `  installed {actual}` / `  Merging would use the wrong "ours" and could silently lose your edits.` / `  → Install the {name}@{version} this project was applied with, or upgrade the pack to a newer version.` Compared only when **name and version both match**; a version change is a genuine upgrade and records the new digest. |
| `W-PACK-INTEGRITY-DIFFERS` — the same-name-same-version mismatch above, seen by a read-only command | Warning. `harness: your {name}@{version} differs from the build this project applied.` / `  harness status still reports drift; harness update will refuse to merge until the builds agree.` |
| `W-SHARED-UNREFERENCED` | Warning. `harness: pack {name} references shared component "{ref}" but maps none of its files.` |
| `E-SHARED-UNDECLARED` — a pack uses a shared file it has not declared | Exit 2. `harness: pack {name} uses shared/{path} but does not declare the component "{ref}".` / `  Nothing under shared/ is inherited implicitly.` / `  → Add { "ref": "{ref}", "version": "…", "integrity": "sha256-…" } to "shared".` |
| `E-PARAM-MISSING` | Exit 1. `harness: parameter "{id}" is required and has no answer.` / `  {prompt}` |
| `E-PARAM-INVALID` | Exit 1. `harness: "{value}" is not a valid answer for "{id}".` / `  Allowed: {values}` |
| `E-PARAM-UNDECIDABLE` | Exit 2. `harness: parameter "{id}" selects content but is neither required nor given a default.` / `  → Add "required": true, or a "default".` |
| `E-PARAM-COMBINATORICS` | Exit 2. `harness: pack {name} has {n} parameter combinations to validate; the limit is 32.` / `  → Reduce content-selecting parameters, or split the pack.` |
| `E-PARAM-FLAG-INVALID` — a declared `flag` alias is malformed or collides | Exit 2. `harness: parameter "{id}" declares the flag alias "--{flag}", which {reason}.` / `  Reserved: --set, --scaffold, --json, --strict, --force, --rollback, --all, --allow-stale-shared, --accept-permissions, --accept-hooks` / `  → Choose a kebab-case alias that is not reserved and not already used by another parameter.` |
| `E-PARAM-NO-PATTERN` — a `type: "string"` parameter declares no `pattern` | Exit 2. `harness: parameter "{id}" is a string and declares no "pattern".` / `  Every string answer is recorded verbatim and replayed on every update, so its shape must be declared.` / `  → Add an anchored pattern, e.g. "pattern": "^[\p{L}\p{N} ._-]{1,64}$"` |
| `E-PARAM-PATTERN-INVALID` — a declared `pattern` is unanchored, uncompilable, over-long, uses a backreference or lookaround, or is declared on `enum` / `boolean` | Exit 2. `harness: the "pattern" on parameter "{id}" is not usable ({reason}).` / `  A pattern must start ^, end $, be at most 200 characters, and use no backreference and no lookaround.` / `  → Simplify it, or drop it if the parameter is an enum or a boolean.` |
| `E-PARAM-SECRET-SUSPECTED` — a parameter's `id` or `prompt` names a credential | Exit 2. `harness: parameter "{id}" looks like it asks for a credential.` / `  Every answer is written verbatim into .harness/manifest.json and into .harness/base/, both of which this project commits to version control. An answer is exactly as public as the repository.` / `  → Remove the parameter, or declare "notASecret": true if the name is a false alarm.` The matcher is `api[_-]?key\|private[_-]?key\|secret\|token\|passwo?rd\|credential\|connection.?string`, case-insensitive; a bare `key` deliberately does not match, so `sortKey` and `keyword` are not false positives. |
| `W-ANSWER-LOOKS-SECRET` — an answer's *value* looks like a credential | Warning. `harness: the answer for "{id}" looks like a credential.` / `  It will be written into .harness/manifest.json and .harness/base/, which this project commits.` Triggered by `-----BEGIN`, `sk-`, `ghp_`, `xox[baprs]-`, or ≥ 40 characters of high-entropy base64url. A warning and never an error: an error here is a false-positive machine. |
| `E-SCAFFOLD-UNKNOWN` | Exit 1. `harness: pack {name} has no scaffold "{id}".` / `  Available: {ids}` |
| `E-SCAFFOLD-COLLISION` | Exit 2. `harness: scaffolds "{a}" and "{b}" both write "{path}".` / `  → Scaffolds must be composable; move the shared file into the base pack.` |
| `E-CONTRIB-NO-REGION` | Exit 2. `harness: scaffold "{id}" contributes to region "{region}" of "{file}", which the pack does not declare.` |
| `E-TARGET-EXISTS` — init into a non-empty tree | Exit 1. `harness: {n} files already exist where this pack would write.` / `  {first ten paths, one per line, two-space indented}` / `  → Apply into an empty directory, or re-run with --force to keep byte-identical files and stop on the rest.` |
| `E-ALREADY-APPLIED` | Exit 1. `harness: this project already has {pack}@{version} applied.` / `  → harness status   see what has drifted` / `  → harness update   pull a newer pack version` |
| `E-REINIT-DIVERGENT` | Exit 1. `harness: --force cannot change what was applied.` / `  {field}: recorded "{was}", requested "{now}"` / `  → Changing this after init is not supported in v1.0. Apply into a fresh directory.` |
| `E-JOURNAL-PRESENT` — a previous apply crashed | Exit 2. `harness: a previous apply did not finish.` / `  {n} files were being written when it stopped.` / `  → harness init --rollback   remove exactly what that apply wrote` |
| `E-JOURNAL-UNREADABLE` — `.harness/journal.json` declares a `version` other than `2`, or cannot be parsed | Exit 2. `harness: .harness/journal.json is not a journal this harness can act on ({detail}).` / `  harness will not guess what a previous apply was doing.` / `  → Remove .harness/journal.json by hand once you have checked the project, or restore it from version control.` Fail-closed: journal version 1 never shipped, and this check exists so that it never can. |
| `E-TARGET-RACE` — a write target changed between plan and write | Exit 2. `harness: "{path}" changed while harness was writing.` / `  {detail}` / `  Nothing further was written; the journal is intact.` / `  → harness init --rollback, then re-run.` `{detail}` is one of `it appeared after the plan said it did not exist`, `it is no longer a regular file`, or `its contents no longer match what the plan read`. Raised by the per-write re-confinement and exclusive-create of US-13. |
| `E-LOCK-HELD` — another harness command holds the project lock | Exit 1. `harness: another harness command is running in this project (pid {pid} on {host}, since {startedAt}).` / `  → Wait for it to finish, or remove .harness/lock if you are certain it is not running.` A lock whose pid is alive, or whose host is not this one, is **never** broken automatically. |
| `W-LOCK-STALE-BROKEN` — a stale lock was broken | Warning. `harness: removed a stale lock left by pid {pid}, which is no longer running.` Broken only when all three hold: the recorded host is this host, the recorded pid is not alive, and the lock is older than 60 s. |
| Rollback declines a file | Warning within the rollback report. `harness: kept "{path}" — it has changed since it was written.` Rollback continues and exits 0 with the count of kept files. |
| `E-MANIFEST-MISSING` | Exit 1. `harness: no manifest at .harness/manifest.json — this project has no pack applied.` / `  → harness init <pack>   to apply one` |
| `E-MANIFEST-CORRUPT` | Exit 2. `harness: .harness/manifest.json is not readable ({detail}).` / `  A backup of the last good manifest is at .harness/manifest.json.bak.` / `  → Restore it, or re-apply into a fresh directory. harness will not repair a manifest.` |
| `W-MANIFEST-EDITED` | Warning. `harness: .harness/manifest.json has been edited by hand (integrity mismatch).` / `  Continuing, and treating the recorded hashes as given.` |
| `E-MANIFEST-NEWER` | Exit 2. `harness: .harness/manifest.json was written by a newer harness (manifest version {n}; this CLI reads up to {m}).` / `  → Upgrade: npm i -g @lintel/harness@latest` |
| `W-MANIFEST-NEWER-CLI` | Warning. `harness: this project was last touched by harness {recorded}; you are running {current}.` |
| `W-PACK-NEWER-THAN-CLI` | Warning. `harness: this project has {pack}@{version}; the newest {pack} bundled with harness {cliVersion} is {bundled}.` / `  Drift reporting still works. Upgrade the CLI before running update.` |
| `E-BASE-CORRUPT` | Exit 2. `harness: the recorded original of "{path}" is damaged (.harness/base/{path}).` / `  → Restore .harness/base from version control, or run update with --no-merge to choose per file.` |
| `W-BASE-MISSING` — no recorded original for a file, **and a per-file resolution policy exists** (`--take-pack`, `--keep-mine`, or an interactive answer) | Warning. `harness: no recorded original for "{path}" — merging is not possible, so {resolution} was used.` A run in which every affected file is resolved this way exits **0**. |
| `E-BASE-MISSING` — no recorded original for a file, **and no resolution policy exists or can be obtained** | Exit 1. `harness: no recorded original for "{path}" — cannot merge safely.` / `  → Choose per file: --take-pack (overwrite) or --keep-mine (skip), or re-run interactively.` Two codes rather than one code with two severities: **severity is a property of the code, not of the occasion**, which is what keeps the exit class a property of the run (US-12, `F1-ADR-001` §7.8.5). |
| `E-MERGE-JSON-INVALID` — a `merge-json` target exists but is not parseable JSON, **or the merged output fails its post-serialization check** | Exit 2. `harness: "{path}" {detail}.` / `  harness will not overwrite a settings file it cannot read, and will not write one it cannot read back.` / `  → Fix or move the file, then re-run.` Nothing is written. `{detail}` is either `already exists and is not valid JSON ({parse error})` or `could not be written safely: the value at "{key}" did not survive a re-parse` — the merged output is re-parsed and each owned key's value must **deep-equal** the intended value (US-4), which catches an injected value that happens to still parse. |
| `E-OWNEDKEY-FORBIDDEN` — a declared `ownedKeys` entry is not ownable at its destination, or a security-relevant key is claimed via a parent rather than a leaf | Exit 2. `harness: mapping "{from}" → "{to}" may not own "{key}".` / `  {reason}` / `  Ownable at this destination: {ownable}` / `  → Declare only the specific leaf keys the pack sets.` `{reason}` is one of: `that key is not in this destination's ownable set`; `"{key}" resolves to an object; a security-relevant key must be declared as its own leaf`; or `hooks are not registrable by a pack at v1.0 — see harness pack info`. A pack declaring `"ownedKeys": ["hooks"]` fails here at validate time and never reaches a consent prompt. |
| `E-SETTINGS-MODE-FORBIDDEN` — a non-`merge-json` mode on `.claude/settings.json` or `.claude/settings.local.json` | Exit 2. `harness: "{to}" may only be written with "mode": "merge-json"; this mapping declares "{mode}".` / `  Any other mode would replace the file wholesale and bypass the rules on what a pack may own there.` / `  → Change the mode, or write to a different file.` |
| `E-SETTINGS-CONSENT-REQUIRED` — the plan grants a security-relevant setting and consent was declined or unavailable | Exit 1. `harness: {pack}@{version} would grant settings this project has not consented to.` / `  {the full verbatim disclosure, one value per line, two-space indented}` / `  → Re-run interactively and accept, or pass --accept-permissions to accept them all.` **Zero bytes are written**, and the gate runs before the lock is taken. Absence of a consent input means non-interactive with no blanket accept, never "granted". |
| `E-HOOKS-NOT-SUPPORTED` — `--accept-hooks` was passed | Exit 1. `harness: no pack may register an agent hook at v1.0, so there is nothing for --accept-hooks to accept.` / `  A pack may ship a script under .claude/hooks/, but nothing registers it and nothing runs it.` / `  → Remove --accept-hooks.` The flag is parsed and always fails deliberately: a flag that does not exist invites a workaround, and this one documents the boundary and reserves the name. |
| `W-SETTINGS-REMOVAL-HONOURED` — `update` did not re-add an entry the user deleted | Warning. `harness: {pack} asks for "{value}" under "{key}", which you removed after the last apply.` / `  It has not been re-added. Add it back by hand if you want it.` One warning per suppressed entry, naming key and value. |
| `W-HOOK-SCRIPT-INERT` — the pack ships a file under `.claude/hooks/` | Warning. `harness: "{path}" is shipped as an ordinary file and is registered by nothing.` / `  No v1.0 mechanism registers a hook, so this script does not run until something registers it by hand.` Emitted by `harness validate`, and the same files are listed in the init summary and in `harness pack info`. |
| `W-LINK-DANGLING` — a relative link or inline path reference in rendered output resolves to nothing the apply produces (US-16) | Warning. `harness: {path}:{line} refers to "{target}", which this pack does not produce.` / `  → Fix the reference, or add the file to the pack.` Catalogued here because US-16 already raised the code and this table is the only catalogue; no behaviour changes. |
| `E-CONTENT-TOO-LARGE` | Exit 2. `harness: "{path}" is {size}; the limit for a pack file is 4 MB.` |
| `E-SYMLINK-IN-PACK` | Exit 2. `harness: "{path}" is a symbolic link. Pack content must be regular files.` |
| `E-TRAVERSAL-LIMIT` — a directory walk exceeded its depth or entry cap | Exit 2. `harness: the walk of "{root}" exceeded the {limit} limit ({n}).` / `  Limits: depth 32, 10,000 entries per walk.` / `  → Narrow the mapping, or split the content.` Applies identically to the `contentRoot` recursion and the project `untracked` scan, which share one bounded walk. |
| `W-SCAN-SYMLINK-SKIPPED` — the project scan met a symlink | Warning. `harness: skipped "{path}" — it is a symbolic link, and harness does not follow links out of the project.` The scan also does not descend into `.git/`, `.hg/`, `.svn/`, `.harness/` or `node_modules/`. |
| `E-CONTRIB-POLICY` — a `contribute` patch fails the pack-content policy | Exit 2. `harness: this contribution cannot be written into pack {name}.` / `  {code}: {message}` / `  → Fix the contribution, or open it as a pack change by hand.` Content moving *out* of a project passes the identical check set content moving *in* passes (US-16); `{code}` is the underlying F1 code, so a caller branches on the real cause rather than on this wrapper. |
| `E-WRITE-FAILED` — I/O error mid-write | Exit 3. `harness: could not write "{path}" ({errno}).` / `  Nothing further was written; the project is mid-apply.` / `  → harness init --rollback` |
| `E-CLI-UNKNOWN-COMMAND` — a first positional that is not a known command | Exit 1. `harness: "{arg}" is not a harness command.` / `  Commands: init, update, status, contribute, validate, pack` / `  → harness --help` |
| `E-CLI-UNKNOWN-FLAG` — a flag no command and no pack alias recognises | Exit 1. `harness: "harness {command}" does not accept --{flag}.` / `  It accepts: {flags}` / `  → harness {command} --help` Reported **only after the second argv pass**, once the resolved pack's `parameters[].flag` aliases are registered (US-8) — otherwise every pack-declared alias reports falsely. Distinct from `E-FLAG-NOT-PERMITTED`, which is a *known* flag on the *wrong* command. |
| `E-CLI-FLAG-VALUE-MISSING` — a flag that takes a value received none | Exit 1. `harness: --{flag} needs a value.` / `  {usage}` |
| `E-CLI-ARG-UNEXPECTED` — a positional the command does not take | Exit 1. `harness: "harness {command}" does not take the argument "{arg}".` / `  {usage}` |

---

## Non-Functional Requirements

- **Hashing algorithm.** SHA-256, lowercase hex, all 64 characters, no
  truncation, no salt, no prefix other than the `sha256-` tag used in
  `integrity` fields. Implemented with Node's `crypto` — no dependency.
- **Normalization before hashing (text files).** In this exact order:
  (1) strip a leading UTF-8 BOM; (2) replace every `\r\n` and every lone
  `\r` with `\n`. Nothing else is changed — trailing whitespace, blank
  lines and the presence or absence of a final newline are all
  significant and are hashed as they are. The `eol` recorded per file
  describes only what was written to disk; two projects whose files
  differ only in line endings produce identical hashes.
- **Binary files.** A file whose bytes are not valid UTF-8, or whose
  first 8 KB contain a NUL byte, is `binary: true`: copied verbatim,
  hashed raw with no normalization, and excluded from regions,
  substitution and rewrites.
- **Encoding.** UTF-8 only for text. A BOM is never emitted. No other
  encoding is read or produced.
- **Determinism.** Apply output is a pure function of (pack, pack
  version, CLI version, parameter answers, scaffold set). No timestamps,
  absolute paths, usernames, hostnames, locale-dependent formatting or
  random values may appear in any generated file. The only timestamps in
  the entire output are `appliedAt` and `lastUpdatedAt` in the manifest.
- **Performance.** On a pack of ≤ 500 files totalling ≤ 8 MB, on a 2020
  laptop-class machine with a warm filesystem cache: full validation and
  in-memory render ≤ 1.5 s; the write phase ≤ 1.0 s; total
  `harness init` ≤ 3 s excluding time spent waiting for a human to
  answer a prompt. A drift scan (`harness status`) over a project with
  1,000 manifest entries totalling ≤ 32 MB completes in ≤ 500 ms.
  Hashing throughput ≥ 50 MB/s single-threaded.
- **Memory and size bounds.** The entire applied set is held in memory
  during validation, so: single pack file ≤ 4 MB
  (`E-CONTENT-TOO-LARGE`); total rendered content per apply ≤ 32 MB;
  peak RSS ≤ 4× total rendered content. **Both directory walks are
  bounded and neither follows a link**: the `contentRoot` recursion and
  the project `untracked` scan share one implementation with a maximum
  depth of **32** and a maximum of **10,000 entries** per walk, exceeding
  either being `E-TRAVERSAL-LIMIT`. Entries are `lstat`ed, never
  `stat`ed. The project scan does not descend into `.git/`, `.hg/`,
  `.svn/`, `.harness/` or `node_modules/`. A regex used anywhere on
  untrusted input is bounded by a length check that runs first (US-8),
  so pattern evaluation cannot be made to run long.
- **Atomicity.** Validate-then-write. No file is written until every
  check has passed. Each file is written via write-temp-then-rename, so
  a concurrent reader never sees a partial file. A journal precedes the
  write phase and is removed only after the manifest lands. A crashed
  apply is always detectable and is reversible by
  `harness init --rollback` without data loss for any file the user has
  since touched.
- **Rollback safety.** **Rollback deletes only paths this apply created,
  restores only paths this apply overwrote, and acts on neither unless
  the on-disk bytes are still exactly what this apply wrote.** A path the
  apply merely overwrote — including a `--force` byte-identical
  collision, which the pre-amendment journal could not distinguish from a
  path the apply created — is restored from its recorded backup or left
  alone, never deleted. It never deletes a directory that contains an
  unrecorded file, and it removes created directories in reverse creation
  order and only when empty. The five cases are enumerated exhaustively
  in US-13.
- **Idempotency.** `harness init --force` with identical inputs against
  an undrifted project is a zero-byte operation, manifest included.
- **Cross-platform.** Identical hashes and identical manifests on macOS,
  Linux and Windows. All manifest paths are POSIX-normalized (`/`
  separators) regardless of host. Case-only collisions are rejected at
  validation so a pack cannot be applicable on Linux but broken on
  macOS.
- **No network.** `init`, `status`, `update` and `contribute` make no
  network request. Packs are bundled (Q-2); the merge base is local
  (US-12).
- **Offline privacy.** Nothing about a project or its parameter answers
  leaves the machine. There is no telemetry.
- **Concurrency.** Commands take an advisory lock at `.harness/lock`; a
  second concurrent command in the same project fails fast rather than
  interleaving writes. **The lock is never broken silently.** It holds
  `{ pid, host, startedAt, cli }` and is acquired with an exclusive
  create. On finding one already present, it is broken **only** when all
  three of these hold: the recorded `host` is this host, the recorded
  `pid` is not alive, and `startedAt` is older than 60 s — reported as
  `W-LOCK-STALE-BROKEN` naming the dead pid. Otherwise the command fails
  with `E-LOCK-HELD`, exit 1. **A lock whose pid is alive, or whose host
  is not ours, is never broken.** The consent gate of US-13 runs
  *before* the lock is taken, so a declined apply does not contend for
  it.
- **Filesystem safety — confinement is by resolution, not by string.**
  The project root is resolved once per run with `realpath()`, and every
  applied path is judged against the *resolved* root. Below it: every
  ancestor component is `lstat`ed and the CLI refuses to traverse or
  create through a symlink, junction or other reparse point
  (`E-DEST-SYMLINK`); needed directories are created one level at a time,
  each checked before the next; and the resolved parent joined with the
  final basename must be a **strict descendant** of the resolved root.
  Applied paths are additionally checked against a reserved-destination
  denylist on the **resolved** path (`.git/`, `.hg/`, `.svn/`,
  `.harness/`, and the CLI's own install directory), and against the
  anchored grammar of US-3 — which is where reserved Windows basenames
  (`CON`, `PRN`, `AUX`, `NUL`, `COM1`–`COM9`, `LPT1`–`LPT9`) and
  characters illegal on Windows are now rejected, as one rule rather than
  several. No symlink is written, and none is followed out of the pack.
  Every applied path is produced by that single gate and carries a
  branded type, so a path that skipped it cannot reach a writer without a
  compile error; each write re-checks immediately beforehand and creates
  exclusively (`E-TARGET-RACE`).
- **Legibility (G6).** The manifest is readable by a human without
  tooling: 2-space-indented JSON, stable key order, one file entry per
  object, sorted by path, so a `git diff` of a `harness update` is
  reviewable.

---

## Flows / Behaviour

### F1.1 — The pinned transform pipeline

Every file is produced by this pipeline, in this order. The order is
part of the contract: downstream features and pack authors may rely on
it, and changing it changes every hash in every manifest.

```
1  select      base mappings + mappings of each selected scaffold,
               in pack-declared order; skip any mapping whose "when"
               does not match the recorded parameter answers
2  resolve     source path → applied path
               (directory recursion, rename, explicit basename,
                stripTemplateSuffix)
3  read        bytes → classify binary vs text
               text: strip BOM, normalize \r\n and \r to \n
4  regions     resolve harness:if, then strip harness:source-only,
               then unwrap harness:applied-only, then validate and
               retain harness:region markers
5  substitute  {{harness:…}} tokens, plus the {{harness:lit:X}} escape;
               all other {{…}} untouched; output is never re-scanned.
               TAKES THE MAPPING'S mode: a value substituted into a
               merge-json target is JSON-string-escaped first, and the
               serialized result is re-parsed and deep-equal-checked
               against the intended value. A substituted value may
               contain no line break and may not lex as a harness:
               marker; none may appear under a security-relevant
               owned key at all
6  rewrite     declared literal find/replace, over applied paths
7  contribute  append scaffold region contributions, in declared order
8  hash        SHA-256 over the normalized result → manifest sha256
9  emit        apply the file's eol policy, write temp, rename,
               set mode; write .harness/base/<path> with lf endings
               (text files only — a binary gets no base copy)
```

Steps 3–7 are skipped entirely for binary files; step 8 hashes the raw
bytes.

Two ordering choices are load-bearing and are called out because
reversing either produces wrong output. **Regions resolve before
substitution**, so a `source-only` block containing a
`{{harness:param.x}}` token for an undeclared parameter is removed
rather than failing the apply. **Substitution resolves before
rewrites**, so a rewrite can operate on a path that a parameter helped
construct.

Step 5 gained an input in the security remediation pass: it now takes the
**mapping's `mode`**, because escaping is a property of the destination
format and not of the value (`F1-ADR-001` §7.3, C-7). A value inserted
into a `merge-json` target is JSON-string-escaped; a value inserted into
any other target is inserted verbatim, exactly as before. This is the
only change to the pipeline's shape, and it does not change any hash
produced by a pack that substitutes nothing into JSON — which at v1.0 is
every pack.

Step 9's write is where US-13's per-write re-confinement and exclusive
create happen; the pipeline itself is pure and writes nothing.

### F1.2 — `pack.json`, worked against the real coding pack

This is the coding pack expressed in the format. Every entry
corresponds to a numbered row of `CLAUDE.md` §Dogfooding.

```json
{
  "formatVersion": 1,
  "name": "coding",
  "version": "1.0.0",
  "title": "Coding — a gated spec process, 10 roles, 2 agent teams, targets",
  "minCliVersion": "1.0.0",
  "contentRoot": "content",

  "anatomy": {
    "process":               { "paths": ["specifications/README.md"] },
    "roles":                 { "paths": ["agents/*.md"] },
    "documentTemplates":     { "paths": ["specifications/*.template.md"] },
    "conventions":           { "paths": ["specifications/conventions.md"] },
    "coordination":          { "paths": ["agent-teams/*.md"] },
    "behaviouralGuidelines": { "paths": ["CLAUDE.md"] },
    "folderScaffolding":     { "declaredBy": "mappings" },
    "skillsAndAutomations":  { "paths": ["commands/*.md"] },
    "autonomyContract":      { "ref": "shared:targets" }
  },

  "parameters": [
    { "id": "projectName", "type": "string", "prompt": "Project name",
      "required": true },
    { "id": "stack", "type": "string",
      "prompt": "Primary stack, one line (appears in CLAUDE.md)",
      "default": "" }
  ],

  "shared": [
    { "ref": "targets", "version": "1.0.0", "integrity": "sha256-…" }
  ],

  "mappings": [
    { "from": "specifications/", "to": "specifications/" },
    { "from": "agent-teams/",    "to": "AgentTeams/" },
    { "from": "copy/tone-of-voice.template.md",
      "to":   "copy/tone-of-voice.md", "mode": "once" },
    { "from": "agents/",   "to": ".claude/agents/" },
    { "from": "commands/", "to": ".claude/commands/" },
    { "from": "CLAUDE.md", "to": "CLAUDE.md", "mode": "regions",
      "regions": ["overview","layout","process","agents",
                  "conventions","targets"] }
  ],

  "rewrites": [
    { "in": ["targets/README.md", "targets/Run.md",
             ".claude/commands/target.md"],
      "find": "template/targets/", "replace": "targets/" },
    { "in": ["**/*.md"],
      "find": "template/agents/", "replace": ".claude/agents/" }
  ],

  "scaffolds": [
    { "id": "backend-azure",
      "description": "Azure Static Web App + Neon Postgres, Bicep + scripts",
      "mappings": [
        { "from": "scaffolds/backend-azure/infrastructure/",
          "to": "infrastructure/backend-deploy/",
          "stripTemplateSuffix": true }
      ],
      "contributes": [
        { "file": "CLAUDE.md", "region": "layout",
          "content": "scaffolds/backend-azure/claude-layout.md" }
      ]
    },
    { "id": "backend-aws",
      "description": "AWS Lambda + CDK",
      "mappings": [ { "from": "scaffolds/backend-aws/infrastructure/",
                      "to": "infrastructure/backend-deploy/",
                      "stripTemplateSuffix": true } ],
      "contributes": [
        { "file": "CLAUDE.md", "region": "layout",
          "content": "scaffolds/backend-aws/claude-layout.md" }
      ]
    }
  ]
}
```

Every anatomy entry above omits `status`, and that is the common case:
`status` defaults to `present`, so a complete pack declares nine
content sources and nothing more. The other two values cost one key
each, and `writing` and `planning` are where they land —

```json
"skillsAndAutomations": { "status": "absent",
  "reason": "the source project's only hook is a third-party notifier and does not migrate" },

"roles": { "paths": ["agents/*.md"], "status": "provisional",
  "note": "six candidates inferred from the phases; the EM-portfolio role is unwritten in the source research" }
```

— which is what makes F5's "exactly two absent, exactly one
provisional" a counted fact rather than an editorial claim.

**There is no `settings.json` mapping in that list, and its absence is
deliberate** (`F1-ADR-001` §8.3). An earlier draft of this worked example
mapped `settings.json` → `.claude/settings.json` with
`"ownedKeys": ["permissions.allow"]`, which contradicted F5's twice-stated
fact that the `coding` pack ships **no default permission set**. Both
could not be true, and this section claims to be "the coding pack
expressed in the format", so the illustration gives way to the content.
Striking it has a second consequence worth stating plainly: **no v1.0
pack owns a security-relevant key.** The consent gate of US-13 and the
destination policy of US-6 are therefore enforced against the *format*
while costing exactly zero at v1.0 — no v1.0 apply prompts, and any pack
that starts asking for a permission is the first one that ever will. A
pack author wanting a `merge-json` illustration should reach for a
non-sensitive destination; the mechanism is identical and the ownable set
is unrestricted there.

The `targets/` files are **not** in that list, and that is the point of
Q-27's decision. `shared/targets` declares its own destination map once,
in `shared/targets/component.json`:

```json
{
  "name": "targets",
  "version": "1.0.0",
  "contentRoot": "content",
  "mappings": [
    { "from": "target.template.md",  "to": "targets/target.template.md" },
    { "from": "Run.md",              "to": "targets/Run.md" },
    { "from": "README.md",           "to": "targets/README.md" },
    { "from": "target-reviewer.md",  "to": ".claude/agents/target-reviewer.md" },
    { "from": "target.md",           "to": ".claude/commands/target.md" }
  ]
}
```

`coding` and `planning` each inherit all five lines from the single
`shared` entry above. One component, three destinations, one
declaration, and no way for the two packs to drift apart on where a
shared file lands — which is the duplication Q-4 exists to remove, and
which repeating five mapping lines per pack would have reintroduced. A
pack that needs one destination moved declares
`"remap": { "README.md": "docs/targets.md" }` on its `shared` entry;
everything else still comes from the component.

Note what row 5 of §Dogfooding costs in this format: exactly two
mapping lines. Note what row 4 costs: one mapping line with an explicit
`to`. Note what row 2 costs: nothing beyond the `to` value differing
from the `from` value. The format's job is to make the fiddly parts
boring.

Note also that `backend-azure` and `backend-aws` both write
`infrastructure/backend-deploy/` and therefore collide
(`E-SCAFFOLD-COLLISION`) if both are selected. That is correct
behaviour — they are alternatives, not composable peers — and it is the
static check of US-9 doing its job rather than a runtime surprise.

### F1.3 — The marked-region grammar, worked against the real evidence

The `targets/README.md` case from §Dogfooding row 7, in the pack source:

```markdown
<!-- harness:source-only -->
## Adopting this in a new project

Targets are part of the template pack, so a fresh repo gets them the
same way it gets the agents and agent-teams — by copying the constructs
into place:

1. **Agent** — include `target-reviewer.md` when you copy `agents/` …
<!-- harness:end -->
<!-- harness:applied-only -->
## Adoption status in this repo

**Already adopted.** The constructs are in place: `target-reviewer` in
`.claude/agents/`, the `/target` command in `.claude/commands/`, and
this reference pack at `targets/`.
<!-- harness:end -->
```

One file, two renderings, no duplicate document, and no way for the two
to drift apart — which is precisely what Q-10 rejected `README.pack.md`
/ `README.applied.md` for.

The `CLAUDE.md` case (Q-7), in the applied output:

```markdown
# CLAUDE.md

Whatever the project owner wants to say. Never touched by update.

<!-- harness:region id=process -->
## Specification process

research → spec → design-spec (if UI) → ADR (PROCEED) → epics-and-tasks
<!-- harness:end -->

More project-owned prose. Also never touched.
```

The markers survive into the applied file because they are the anchor
`update` uses. `source-only` and `applied-only` markers never survive,
because nothing needs to find them again.

Grammar summary:

| Directive | Markers in output | Body in applied output | May contain |
|---|---|---|---|
| `harness:source-only` | removed | removed | `if` |
| `harness:applied-only` | removed | kept | `if` |
| `harness:if <p>=<v>` | removed | kept iff the answer matches | — |
| `harness:region id=<id>` | **kept** | kept | `source-only`, `applied-only`, `if` |
| `harness:end` | closes the innermost open block | — | — |

A marker is recognised only when its comment is the sole non-whitespace
content on the line, and only outside a fenced code block. Everything
else is literal text. Any malformed marker aborts the apply during
validation, before a byte is written.

### F1.4 — The manifest, worked

`.harness/manifest.json`, abridged to four file entries:

```json
{
  "manifestVersion": 1,
  "generatedBy": { "cli": "1.0.0" },
  "pack": { "name": "coding", "version": "1.0.0", "formatVersion": 1,
            "integrity": "sha256-…" },
  "appliedAt": "2026-08-30T10:34:00Z",
  "lastUpdatedAt": "2026-08-30T10:34:00Z",
  "parameters": {
    "projectName": "Lintel Harness",
    "stack": "Node 20 / TypeScript CLI"
  },
  "scaffolds": [],
  "shared": [
    { "ref": "targets", "version": "1.0.0", "integrity": "sha256-…" }
  ],
  "files": [
    {
      "path": "AgentTeams/Specify.md",
      "source": "content/agent-teams/Specify.md",
      "origin": "pack",
      "mode": "managed",
      "sha256": "…",
      "eol": "lf",
      "binary": false,
      "executable": false,
      "transforms": ["regions", "substitute"]
    },
    {
      "path": "CLAUDE.md",
      "source": "content/CLAUDE.md",
      "origin": "pack",
      "mode": "regions",
      "sha256": "…",
      "eol": "lf",
      "binary": false,
      "executable": false,
      "transforms": ["regions", "substitute"],
      "regions": [
        { "id": "overview",    "sha256": "…" },
        { "id": "layout",      "sha256": "…" },
        { "id": "process",     "sha256": "…" },
        { "id": "agents",      "sha256": "…" },
        { "id": "conventions", "sha256": "…" },
        { "id": "targets",     "sha256": "…" }
      ]
    },
    {
      "path": "copy/tone-of-voice.md",
      "source": "content/copy/tone-of-voice.template.md",
      "origin": "pack",
      "mode": "once",
      "sha256": "…",
      "eol": "lf",
      "binary": false,
      "executable": false,
      "transforms": ["regions", "substitute"]
    },
    {
      "path": ".claude/settings.json",
      "source": "content/settings.json",
      "origin": "pack",
      "mode": "merge-json",
      "sha256": "…",
      "eol": "lf",
      "binary": false,
      "executable": false,
      "transforms": ["merge-json"],
      "ownedKeys": [
        { "path": "permissions.allow", "sha256": "…",
          "security": true,
          "entries": ["Bash(npm test)", "Read(specifications/**)"],
          "removed": ["Bash(git push)"] }
      ]
    }
  ],
  "integrity": "sha256-…"
}
```

**The fourth entry is illustrative and no v1.0 pack produces it.** Since
§F1.2 struck the `settings.json` mapping, no v1.0 pack owns a
security-relevant key, so nothing shipped at v1.0 writes an `ownedKeys`
entry with `"security": true`. It is shown because the *shape* is part of
the format and must be recorded somewhere: `security` says the key was
security-relevant at its destination **when this apply ran** — recorded
rather than re-derived, so a later CLI whose allowlist has moved still
knows what this apply treated as sensitive; `entries` is exactly what
this apply wrote, in written order; and `removed` is the monotonic set
the user has deleted since, which `update` must not re-add (US-6).
`removed` here records that the user deleted `Bash(git push)` by hand and
that a later `update` will leave it deleted and say so with
`W-SETTINGS-REMOVAL-HONOURED`.

What each field is *for*, since a field with no consumer is a field that
will rot:

| Field | Consumer | Why |
|---|---|---|
| `pack.name`, `pack.version` | F3, F4 | "you applied `coding@1.0.0`, latest is `coding@1.4.0`" |
| `pack.integrity` | F3, F4 | Prove the project holds an unmodified `coding@1.0.0` without the pack being installed; detect "your CLI's pack differs from what you applied". Same `treeDigest` as a shared component's (Q-19). **Verified on a same-name-same-version comparison only** — `E-PACK-INTEGRITY-MISMATCH` on `update`, `W-PACK-INTEGRITY-DIFFERS` on `status`; a version change is a genuine upgrade and records the new digest (US-10) |
| `generatedBy.cli` | F3 | Refuse or warn when a CLI behaviour change would reinterpret this manifest |
| `parameters` | F2 re-apply, F3 update | Update must re-evaluate `when`/`if` against the *original* answers, or the applied file set changes silently |
| `scaffolds` | F3 | Reapply exactly the same set; never silently gain or lose one |
| `shared[].integrity` | F4 | `contribute` must know which shared version the copy diverged from |
| `files[].sha256` | F3, F4 | Drift: has the project edited this file since apply |
| `files[].source` | F4 | `contribute` needs the pack path to aim a patch at |
| `files[].origin` | F3, F4 | Route a contribution to the pack, a scaffold, or `shared/` — and `shared/` routing is what triggers the Q-4 bump rule |
| `files[].mode` | F3 | `managed` merges whole-file, `regions` merges per region, `once` is never touched, `merge-json` merges by owned key |
| `files[].regions[].sha256` | F3 | Distinguish "edited my own prose" from "edited a pack-owned region" |
| `files[].ownedKeys[].sha256` | F3 | The JSON analogue of the above: distinguish "edited my own settings key" from "edited a key the pack owns", so a user's `.claude/settings.json` edits are not misreported as pack drift (Q-23) |
| `files[].ownedKeys[].security` | F3, F4 | Know what *this* apply treated as security-relevant, without re-deriving it from a policy table that may have moved since. A recorded fact beats a recomputed one whenever the rule can change |
| `files[].ownedKeys[].entries` / `.removed` | F3 | Tell "the pack never wrote this" from "the user deleted it", which is the whole of the guarantee that `update` does not resurrect a permission someone removed (US-6) |
| `files[].eol`, `binary`, `executable` | F2, F3 | Round-trip the file faithfully on rewrite; hash comparably across platforms. `executable` is also the reference for mode drift: an on-disk bit that differs makes the file `modified` even when the content hash matches (US-11) |
| `files[].transforms` | F4 | A `contribute` patch must be reversed through the same transforms to land on the pack |
| `integrity` | US-15 | Detect hand-editing without forbidding it |

### F1.5 — Manifest versioning and forward compatibility

- `manifestVersion` is an integer, bumped **only** on a change that an
  older CLI would misread. Additive optional keys do not bump it.
- A CLI reads any `manifestVersion` ≤ its supported version and refuses
  anything higher (`E-MANIFEST-NEWER`, never a warning — misreading a
  manifest means merging against a wrong base, which loses work).
- Within a version, unknown keys at any level are preserved verbatim on
  rewrite, so an older CLI degrades to ignoring a newer one's data
  rather than deleting it.
- `pack.formatVersion` is recorded separately from `manifestVersion`:
  they version different things and will move at different rates.
- The manifest is not a public API. No schema is published, and no
  compatibility is promised to any consumer other than this CLI.

### F1.6 — Apply lifecycle, including failure

```
  init
   │
   ├─ 1. resolve pack, check minCliVersion, check formatVersion
   ├─ 2. collect parameter answers (prompt or --set), validating each
   ├─ 3. resolve the project root ONCE with realpath; resolve mappings
   │        for the selected scaffold set through the one confinement
   │        gate (US-3 stages 1–3)
   ├─ 4. render every file in memory (pipeline F1.1, steps 1–8)
   ├─ 5. validate: collisions, path safety, regions, substitution,
   │             rewrites, anatomy, shared integrity, target-exists
   │        └─ any failure → exit, ZERO bytes written
   ├─ 6. CONSENT GATE on the plan's disclosure (US-13)
   │        └─ declined, or required and unavailable →
   │           E-SETTINGS-CONSENT-REQUIRED, exit 1, ZERO bytes,
   │           and the lock was never taken
   ├─ 7. take .harness/lock  (E-LOCK-HELD, or W-LOCK-STALE-BROKEN)
   ├─ 8. write .harness/journal.json (v2: intended hash, preExisting,
   │        preHash, preMode, backup, createdDirs) and any backups
   │        under .harness/journal.d/
   ├─ 9. write each file: re-confine → exclusive create → rename;
   │        write .harness/base/<path> for every non-once TEXT file
   │        (binaries get no base copy); write .harness/.gitattributes
   │        └─ target changed in the window → E-TARGET-RACE
   │        └─ I/O failure → E-WRITE-FAILED, journal remains,
   │                          recover with --rollback
   ├─ 10. write .harness/manifest.json
   └─ 11. delete .harness/journal.json and .harness/journal.d/,
          release the lock                ← apply is now complete
```

**The consent gate precedes the lock**, and that ordering is deliberate:
a declined apply must not contend for a lock, must not leave one behind
if it exits, and must write zero bytes — including zero bytes of
`.harness/`.

The journal is the whole recovery story: its presence means step 9 or 10
did not finish, and its contents say exactly which paths were in flight,
what they were supposed to contain, **and what was there before**. That
last part is what makes the invariant checkable rather than merely
stated: rollback deletes a path only when the apply created it and the
bytes are still the apply's, restores a path only when the apply
overwrote it, and otherwise keeps and reports. A user who edited a file
between the crash and the rollback keeps their edit and is told about it.

### F1.7 — The one-pack invariant

The manifest has one `pack` object. There is no array, no ordering, no
precedence rule and no region-ownership arbitration, because **a project
holds exactly one pack** (Q-12). A user who needs two ways of working
runs two projects side by side. This is stated here rather than only in
the brief because it is the single assumption most likely to be
"helpfully" relaxed by a later change, and relaxing it reopens the
file-collision and region-conflict problems that Q-12 removed rather
than solved.

### F1.8 — The stress parameterization puts on the format

Recorded here because the planning-pack research asked for it
explicitly ("if the format cannot express one, that is a finding about
the format"), and because F5 will pay these costs.

1. **The applied file set becomes parameter-dependent.** With `when`
   mappings, two projects on the same pack version legitimately hold
   different files. Every consumer of the manifest must therefore
   re-evaluate mappings against the *recorded* answers, never against
   defaults. This is why `parameters` records every declared parameter,
   including ones answered by default.
2. **Validation becomes combinatorial.** `harness validate` must render
   every combination of content-selecting parameters. One enum of two
   values is cheap; three such parameters is eight renders, and the
   limit of 32 exists to stop a pack quietly becoming unvalidatable.
3. **Two calibrations are two bodies of content with no mechanical
   consistency check.** Nothing in the format can tell whether the
   Helio and Cadenza variants of a template have drifted apart in
   structure. That is a pack-authoring discipline problem the format
   does not solve, and F5 should expect a manual review step.
4. **`if` blocks are invisible after apply.** The applied file carries
   no trace of the branch not taken, which is what makes drift
   detection simple, but also means a user cannot see what a different
   answer would have given them without re-running init elsewhere.
5. **An answer cannot be changed later** (Q-21). Calibration is the
   planning pack's central property, so "re-calibrate" is a plausible
   real request; v1.0 answers it with "start a new project", which is
   honest but weak. This is the sharpest known limitation of the v1.0
   format.

None of these breaks the format. The finding is that parameterization
is expressible at a cost that lands almost entirely on the pack author
and the validator, not on the manifest or the apply engine.

---

## Open Questions

Q-1…Q-12 are resolved in the brief and are not restated. Question IDs
are unique across the whole project, not per document: the ids below
were reconciled against the master spec and F5 on 2026-08-30 (see the
master spec's *Cross-document consistency pass*), so they are not
contiguous from Q-13 and must not be renumbered. Every open question in
the project is indexed in the master spec's Open Questions table.

**Q-18…Q-27 were closed by `F1-ADR-001` on 2026-08-30** and now sit in
Resolved Decisions below, keeping their IDs per `conventions.md`. One
question remains open here, and it is not F1's to answer.

| # | Question | Owner | Default assumption |
|---|---|---|---|
| Q-14 | **See Q-14 in the master spec** — what `harness init` does in a directory that already holds a hand-applied copy of the pack, and whether a `harness adopt` exists. F1 raised the same question from the format side: bringing a hand-applied project under management by generating a manifest from a best-effort match. Cross-feature and blocking (S7, F2 acceptance), so the master spec owns it. **Escalated to Thomas by `F1-ADR-001` §6.1**, which records the architectural cost of each branch: *No* means someone must own re-rendering or deleting this repo's two hand-rewritten READMEs before the re-init; *Yes* means `.harness/base/` cannot hold the true applied bytes, so every later 3-way merge on a pre-adoption edit merges against a synthetic base and would need a `W-BASE-SYNTHETIC`
warning — a code this catalogue deliberately does **not** carry, because
carrying it would presuppose the branch this question is open about. **F1 needs no change to start either way.** | Thomas Andersen (F2), via the master spec | **F1's assumption, unchanged: not built.** S7 is satisfied by re-initing this repo from the pack, which is the stronger proof anyway. Adopt would need a fuzzy matcher whose failure mode is a wrong merge base. |

---

## Resolved Decisions

Every row below was closed by `F1-ADR-001-pack-format-and-manifest.md`
(verdict `PROCEED`) on 2026-08-30. Per `conventions.md` §Open Questions
each keeps the ID it was raised under. Q-27 was raised in F5 but is a
decision about F1's shared-component mechanism, so it is recorded here,
where the mechanism lives; F5's Open Questions table points at this row.
The settled inputs upstream of all of them are Q-1…Q-12 in
`specifications/lintel-harness-brief.md` §12.

| # | Question | Decision | Date |
|---|---|---|---|
| Q-18 | Is `.harness/base/` committed to version control, or gitignored and rebuilt? | **Committed**, and `harness init` writes no `.gitignore` entry — plus a generated `.harness/.gitattributes` (`base/** -text -diff`, `manifest.json text eol=lf`). Without it, a Windows clone with `core.autocrlf=true` munges every base copy and every base read fails `E-BASE-CORRUPT`: the merge base would be broken by the version-control system it was committed to survive. A hash cannot be a merge base — a 3-way merge needs base *content* — and Q-2 bundles exactly one pack version, so the old version has nowhere else to live. See US-10, US-12. | 2026-08-30 |
| Q-19 | Should the manifest record a whole-pack integrity hash alongside the per-file hashes? | **Yes** — `pack.integrity`, computed by the same `treeDigest` as a shared component's `integrity` and the manifest's own. One digest function, three call sites. See US-10. | 2026-08-30 |
| Q-20 | Should `harness:if` ever grow beyond a single equality test? | **No.** One equality test only; a pack needing more splits the file and uses a conditional mapping. Confirmed unchanged. | 2026-08-30 |
| Q-21 | Can an init-parameter answer be changed after apply? | **No in v1.0** — `E-REINIT-DIVERGENT`; apply into a fresh directory. But the renderer is parameterized by an `ApplyInputs` value object rather than reading answers back out of the manifest, so a v1.1 `recalibrate` is "render with new answers, 3-way merge against `.harness/base/`" — F3's engine with a different input, no format change. Cheap later, zero cost now. | 2026-08-30 |
| Q-22 | Can a scaffold be added to or removed from an applied project? | **No in v1.0**; same provision as Q-21 — the scaffold set is a field of `ApplyInputs`, so v1.1 needs no format change. | 2026-08-30 |
| Q-23 | Does `merge-json` survive contact with `.claude/settings.json`? | **Keep `merge-json`**, tightened: it is the only mode permitted on a JSON target, the region grammar never runs on it (JSON carries no comment markers), and the manifest records a **per-owned-key hash** as well as the whole-file hash, so a user's own key edits are not misreported as pack-region drift. An unparseable existing target is `E-MERGE-JSON-INVALID` and nothing is written. Fallback if the order-preserving serializer overruns in F2: write-if-absent, shortfall recorded against R5. See US-6, US-10. | 2026-08-30 |
| Q-24 | `pack.json`, or a separate `apply.json`? | **One `pack.json`.** Confirmed; there is no `apply.json` in the file plan. | 2026-08-30 |
| Q-25 | Does `update` delete a file the pack no longer ships? | **No deletion** — report as orphaned. Confirmed; `origin` + `source` already carry enough for F3 to change later without a format change. | 2026-08-30 |
| Q-26 | Should normalization before hashing also trim trailing whitespace and normalize the final newline? | **No** — BOM and line endings only. Trailing whitespace is real content, and ignoring it would make `contribute` emit patches that do not apply. Confirmed. | 2026-08-30 |
| Q-27 | May one shared component declare a multi-destination file mapping? (raised in F5) | **Yes** — the component declares its own `mappings` in `component.json`; a referencing pack inherits them via its `shared` entry and may `remap` an individual destination. One declaration, three destinations. The alternative — every referencing pack repeating five mapping lines — would have reintroduced inside Q-4's mechanism the duplication Q-4 exists to remove, and let `coding` and `planning` drift apart on where a shared file lands. Collisions across the merged mapping set are caught by the existing `E-MAP-COLLISION`. See US-7, §F1.2. | 2026-08-30 |
