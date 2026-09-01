# Technology Choices — Lintel Harness

**Status:** Draft
**Applies to version:** v1.0 — **five-feature baseline: F1, F2, F3, F5, F6** (**F3 returned to v1.0 with Q-62**; F4 alone is reserved for v1.1)
**Date:** 2026-09-01
**Sources:** `project-brief.md` §12 (**Q-1…Q-63, all resolved; next free Q-64 (reserved — see Q-63)**) · `v1.0/LintelHarnessSpecification-1.0.md` · `v1.0/F1-spec-pack-format-and-manifest.md` **v2.7** (§NFR, US-1, US-3, US-4, US-8, US-13, US-16, §Error States) · `v1.0/F1-ADR-001-pack-format-and-manifest.md` (**file-level plan** and **public interface contract**) · `v1.0/F5-spec-template-packs.md` **v2.7** · `general/system-architecture.md` · `general/pack-application.md`

> **This document's body predates Q-62 and has not been re-derived against it.**
> The header above is corrected; the choices and the ⚠️ register below were written
> for a four-feature v1.0 in which `update` was deferred. One consequence is worth
> stating explicitly, because a reader will assume the opposite: **Q-62 adds no
> technology requirement.** `update` ships **without a merge engine** — unedited paths
> are replaced outright, edited paths are left and reported, `adapted` paths are never
> blindly replaced, and the skill reconciles the rest conversationally. So **no diff,
> patch or 3-way-merge library is needed**, none belongs in the register, and the
> register's absence of one is correct rather than an omission. F3 reuses `verify`'s
> existing recomputation identity, which is already covered by the choices below.
> Anything else Q-62 may bear on here is unreviewed; treat the register as owing that
> pass, not as having had it. The **Sources** line above carries this document's only
> live counter values; the revision-history row at the foot records *"next free remains
> Q-62"* as the state at **that** revision and is history, not a competing claim.

> The "what we build it with, and why" companion to `general/system-architecture.md`.
> That document owns the principles, the container diagram and the
> `validate → plan → journal → write` trust path; this one owns the per-area
> technology choice behind each box, the reasoning, and the **⚠️ register** of what the
> specs *require* but nobody has *chosen*.
>
> **The governing decision is a dependency posture, not a stack.** This product writes
> files into a stranger's repository under a security model built over four review
> rounds. Every third-party package is code running with the user's filesystem access,
> inside the process that computes the confinement gate. So the default is **no runtime
> dependency**, and each area below either shows a stdlib route or appears in the
> register with the constraint that decides it (§6).
>
> **Living document.** Review on every version bump; keep the `## Change history` current.

---

## 0. How this document deviates from its template, and why

`packs/coding/specifications/technology-choices.template.md` is shaped for a product
with a backend runtime, a domain-critical subsystem, a datastore, a frontend, hosting,
CI/CD and observability. **Lintel Harness has none of those.** It is a single-process,
offline, short-lived CLI that reads bundled files and writes text into one directory,
plus a Markdown skill with no runtime at all.

Kept, because they are the template's actual value: a **summary table with a firmness
column** (§1), **per-area choices each with a why** (§3–§5), and a **consolidated ⚠️
register** (§6). Replaced: the template's §2–§5 layer sections become §3 *the runtime*,
§4 *the capabilities the specs require*, and §5 *build, test and distribution*.
Dropped outright, with §2 standing in their place so a reader arriving from the
template does not read the absence as an omission: **Datastore**, **Frontend**,
**Hosting & infrastructure**, **External integrations**, **Credentials / secrets /
KMS**, **Observability**, and the residency/compliance caveat. §7 of the template
survives as §7 here, rescoped to the two cross-cutting positions that are real for this
product: the dependency posture and the untrusted-input boundary.

Firmness is used as the template defines it — **Firm** (decided, with its source),
**⚠️ pending** (needed, not chosen), **behind a port** (isolated behind one named
module, so it can be swapped without touching a caller) — and several rows carry two,
because the honest answer is often *the exclusion is Firm and the replacement is not*.

---

## 1. Summary of the stack

| Area | Choice | Firmness | Source |
|---|---|---|---|
| Language & runtime | TypeScript, ESM, **Node ≥ 22** | **Firm** | Q-16, Q-1; ESM per `F1-ADR-001` file-level plan |
| Execution split | Deterministic mechanics in the CLI, judgment in a thin Claude Code skill | **Firm** | Q-1, Q-57 |
| Distribution | `@lintel/cli`, binary `lintel` with `harness` as a command group, `packs/` bundled into the published artefact | **Firm** | Q-2, Q-16 |
| Versioning | Per-pack semver + `minCliVersion`, separate CLI semver, both recorded in the manifest | **Firm** | Q-3 |
| Semver parsing & comparison | **Hand-rolled** — compare only, no range arithmetic (~30 lines) | **Firm** (Q-81) | F1 US-1 (`E-PACK-CLI-TOO-OLD`, `E-PACK-FORMAT-NEWER`, `W-PACK-NEWER-THAN-CLI`) |
| Hashing | SHA-256 via `node:crypto`, lowercase hex, over BOM-stripped / CRLF→LF-normalised content | **Firm** | Q-26, Q-52; F1 §NFR |
| Filesystem | `node:fs/promises` only — `open(…, 'wx')`, `link`/`unlink` with an `EPERM`/`ENOSYS` fallback, `lstat` on every ancestor, no symlink followed | **Firm** | F1 US-13, §NFR *Filesystem safety* |
| Authored-JSON parsing | **Not `JSON.parse`.** A duplicate-key-rejecting reader for `pack.json`, `recipe.json` and the manifest | **Firm — hand-rolled** (Q-81) **· behind a port** (`src/json/parse-strict.ts`) | C-25; F1 US-1, `E-JSON-DUPLICATE-KEY` |
| Schema validation | **Hand-rolled** structural validator for `pack.json` / `recipe.json`, closed enumerations, JSON-boolean typing | **Firm** (Q-81) · behind a port (`src/pack/schema.ts`, `src/recipe/schema.ts`) | F1 US-1 (C-16, C-34), US-31 |
| Glob matching | **One** matcher, taking no filesystem handle, for `exclude`, `in` and anatomy `paths` | **Firm — hand-rolled, dialect this project's to state** (Q-81) **· behind a port** (`src/recipe/glob.ts`) | C-27; F1 US-4, ADR file plan |
| Path normalisation (`collisionKey`) | NFC via `String.prototype.normalize`, then an **ASCII-only** case fold | **Firm** (Q-81) — the narrowing is F1 known limit 17 | F1 US-3 stage 1, N-5 |
| Argv parsing | Two-pass walk: pass 1 defers unknown tokens, pass 2 re-parses with the pack's `parameters[].flag` aliases registered | **Firm on the algorithm · ⚠️ pending on what implements it** | F1 US-8; ADR `src/cli/flags.ts` |
| `.claude/` frontmatter reading | **Hand-rolled** — a security gate rides on it, and it must fail closed with a line number | **Firm** (Q-81) | F1 US-3 (`E-CLAUDE-TOOL-GRANT`, `E-CLAUDE-PERMISSION-MODE`), US-13 disclosure row 4 |
| Parameter `pattern` validation | *not chosen* — must reject backreference and lookaround by inspecting the source | ⚠️ pending | C-7; F1 US-8 (`E-PARAM-PATTERN-INVALID`) |
| Interactive prompting | *not chosen* | ⚠️ pending — F2's, and F2 has no spec | F1 §Introduction ("F2 owns interactive prompting"), US-8 |
| Text encoding & binary detection | UTF-8 only; a file is binary when it is not valid UTF-8 or its first 8 KB hold a NUL | **Firm** | F1 §NFR *Encoding*, *Binary files* |
| Diagnostics & `--json` output | Stdlib serialisation; `src/diag/catalogue.ts` is the only place user-facing text exists | **Firm** | F1 §Error States; ADR file plan |
| Test runner | **`node:test`** — in the stdlib, so not a dependency in either budget. The ADR's `vitest.config.ts` is superseded | **Firm** (Q-81) | ADR file-level plan; F1 US-16 |
| Adversarial fixture packs | Shipping requirement, run in CI, asserted on **exact code and exit class** | **Firm** | F1 US-16 |
| Build (TypeScript → something `npx` runs) | *not chosen* | ⚠️ pending | Q-16; ADR file plan (`tsconfig.json`) |
| Pack bundling into the artefact | Packs ship inside the package; the CLI resolves them relative to its own install directory | **Firm on the requirement · ⚠️ pending on the mechanism** (U-12) | Q-2; F1 US-3 stage 2 (the install dir is itself a reserved destination) |
| CI | `lintel harness validate --all --strict` exits 0 over the three bundled packs, plus the fixture suite | **Firm on the command · ⚠️ pending on the runner** | F1 US-16 |
| The skill (F6) | Markdown under `.claude/skills/`, no runtime of its own | **Firm** | Q-1, Q-57; master spec §F6 |
| Datastore · server · hosting · auth · telemetry · network at runtime | **None.** See §2 | **Firm** | F1 §NFR *No network*, *Offline privacy*; brief §10 |
| Pack content stacks (Bicep + Neon, CDK + Lambda, Markdown, shell/PowerShell) | **Pack content, not the harness's stack.** See §8 | **Firm** | Q-8, Q-8a, Q-17; F5 §Platform |

> **Ratified 2026-09-01 (Q-81).** The dependency posture of §7.1 is the owner's
> decision, not this document's proposal: **zero runtime dependencies**, now a
> **requirement** in F1 §NFR and assertable as an empty `dependencies` object in the
> published manifest. **Nine register entries close with it** — U-1, U-2, U-3, U-4,
> U-6, U-8, U-10, U-11 and U-14 — leaving **five** open: U-5, U-7, U-9, U-12, U-13,
> every one of them *work* rather than a decision awaiting a signature. The one
> item that could not be hand-rolled honestly, U-4, is resolved by **narrowing the
> claim rather than approximating it**: see §4.6.

---

## 2. What this product deliberately has none of

Stated plainly, because a reader arriving from the template will go looking for these
sections and their absence should not read as an oversight.

- **No datastore.** The only persistent state is files in the user's own project:
  `.harness/pack/`, `.harness/manifest.json`, and — only while an apply is in flight —
  the journal, `journal.d/` and the lock. The manifest is six keys and is meant to be
  read by a human and committed to git. Version control is the database.
- **No server, no hosting, no region, no residency question.** There is nothing
  deployed. The unit of release is an npm publish.
- **No network at runtime.** `init`, `validate`, `verify` and `pack info` make no
  request; packs are bundled so `npx` needs no fetch (Q-2). **Read the scope of that
  claim exactly**: F1 §NFR *No network* is a property of **the CLI**. It says nothing
  about what an agent runtime later does with content a pack placed — one bundled agent
  declares `WebSearch, WebFetch`, and `system-architecture.md` §3 records the
  distinction rather than eliding it.
- **No telemetry, no analytics, no crash reporting.** Nothing about a project or its
  parameter answers leaves the machine (F1 §NFR *Offline privacy*). This is a
  requirement, not a default we could relax later without amending a spec.
- **No auth, no accounts, no multi-tenancy, no secrets store.** There is one local
  user. The nearest thing to a credential decision is the *refusal* to carry one:
  a parameter whose id or prompt looks like a credential is `E-PARAM-SECRET-SUSPECTED`
  at validate time, because every answer is written verbatim into a manifest the project
  commits (C-15, F1 US-8).
- **No UI and no frontend.** F1 records `Design spec: n/a (no UI)`. The only
  presentation surfaces are stdout/stderr text from one catalogue, a `--json` shape, and
  the skill's conversation.
- **No registry, no marketplace, no pack signing, no third-party packs** (brief §10,
  F1 §Out of Scope). This is why the format's threat model can put a pack author inside
  the trust boundary and still be honest about it.

---

## 3. Language and runtime

### 3.1 Node ≥ 22, TypeScript, ESM — **why**

**Node/TypeScript is Q-1's choice and the reasoning is about determinism, not taste.**
Hashing, planning and comparison must be computed facts or "applied correctly every
time" varies run to run; a CLI is where that lives, and the judgment half goes to a
skill instead of being stubbed out. The target ecosystem settles the language: the
projects being scaffolded are Claude Code repositories, and `npx @lintel/cli` is the
zero-install route to a machine that already has Node.

**Node ≥ 22 is Q-16**, corrected from the ADR's assumed ≥ 20 because Node 20 left LTS
maintenance in April 2026. The floor is load-bearing for more than support windows: it
is what lets the register below reach for stdlib answers — a stable `node:test` runner,
`fs.promises` throughout, `structuredClone`, stable `Intl` — instead of a package.

**ESM** is the ADR's file-level plan, not a Q. Recorded here because it is a real
constraint on §5: an ESM CLI resolves its bundled `packs/` directory relative to
`import.meta.url`, and that same resolved directory is a **reserved destination** no
recipe step may write into (F1 US-3 stage 2) — so the install-dir resolution is
security-relevant, not merely a packaging convenience.

**TypeScript is doing structural work, not documentation.** The ADR's public interface
contract makes `AppliedPath` and `HarnessPath` nominal brands whose only constructors
live in `src/security/`, so *a path that skipped the confinement gate cannot reach a
writer without a compile error* (C-14). `RecipeStep` is a discriminated union, so an
unhandled primitive is a compile error and an unknown one is a diagnostic — "there is no
third outcome" (ADR §7.7). A build step that erased types without checking them would
delete two controls; §5.2 is written against that.

### 3.2 What would trigger a switch

Nothing short of Q-1 being reopened. The realistic pressure is on the *floor*, not the
runtime: a Node 24 LTS line makes 22 the old floor, and raising it is a semver-major of
the CLI (Q-3) plus one line in `engines`.

---

## 4. The capabilities the specs require

Each subsection is a capability F1 or the ADR demands by name. Where it is settled, the
choice and the why. Where it is not, the **constraint that decides it** — which is the
useful half, and it is repeated in §6.

### 4.1 Hashing and the tree digest — **Firm**

`node:crypto`'s `createHash('sha256')`, lowercase hex, all 64 characters. Four call
sites at v1.0 (F1 §NFR) and one tree digest over the payload (Q-52). Normalisation —
strip a leading UTF-8 BOM, then `\r\n` and lone `\r` → `\n`, and nothing else (Q-26) —
is a dozen lines and belongs to us rather than to a package, because F1 §NFR pins the
order of the two operations and a library that did more would silently change what
`verify` compares. **Nothing pending. Move on.**

### 4.2 Filesystem — **Firm**

`node:fs/promises` and nothing else. The mechanics are fully specified in F1 US-13 and
are stdlib one-for-one: exclusive temp create `open(tmp, 'wx', mode)`; `link(tmp, dest)`
then `unlink(tmp)` to claim a destination the plan expects to be new, because `link`
fails `EEXIST` and `rename` does not; a documented `EPERM`/`ENOSYS` fallback to
`open(dest, 'wx')` then `rename`; `lstat` on every ancestor, top-down, never `stat`;
directories created one level at a time. A convenience wrapper (`fs-extra` and its kin)
would be a strict downgrade here — its whole selling point is recursive, symlink-tolerant
operations, which is precisely the behaviour four security rounds spent removing.

**One residual, and it is F1's rather than a technology choice** — see §6, ✅ U-11,
**closed in F1 v3.0** by the allocation of `W-LINK-FALLBACK`: the
`link` fallback is required to "record the narrowed guarantee" in the run's diagnostics,
and no `W-` code exists for it in a catalogue that is declared to be the only error model.

### 4.3 Authored-JSON parsing — **the exclusion is Firm; the replacement is not**

**`JSON.parse` is ruled out for `pack.json`, `recipe.json` and `.harness/manifest.json`,
and the reason is a security control rather than hygiene.** `JSON.parse` keeps the
**last** occurrence of a duplicated key and a reviver never sees the collapsed one; a
human reading a diff top-to-bottom takes the **first**. So a pack reviews as one thing
and executes as another — which defeats by name the control the threat model relies on,
*a JSON diff a reviewer reads* (C-25, F1 US-1). `E-JSON-DUPLICATE-KEY`, exit 2, at any
depth, before any other check on the file.

The ADR's file plan names `src/json/parse-strict.ts` as "a hand-rolled token pass … the
one stdlib call this ADR replaces rather than wraps", so the *shape* is decided and it is
isolated behind one module. What is not decided is whether that module is written here or
supplied, and no alternative was weighed. **The constraint that decides it:** the reader
must (a) reject a duplicate key at any depth, (b) report **the key and both line
numbers**, which requires source positions the standard parser discards, (c) be the only
parser for authored JSON so the rule is total across exactly three documents, and (d) add
no runtime dependency under §7.1. A candidate satisfying (a)–(c) but not (d) escalates
the posture, not the parser. ✅ **U-1 closed by Q-81** — the posture is ratified, so
the parser is hand-rolled: duplicate-key detection at any depth, both line numbers.

### 4.4 Schema validation — **settled by Q-81: hand-rolled**

`pack.json` and `recipe.json` need a validator that enforces three different rules at
once, and the third is why an off-the-shelf schema engine is a poor fit:

1. **Unknown keys warn; unknown values in a behaviour-selecting position are fatal**
   (C-16, F1 US-1). That asymmetry is normative and is the opposite default from most
   validators, which either allow additional properties or forbid them wholesale.
2. **The behaviour-selecting positions are a closed enumeration of six**, each with its
   own code where one exists (`E-RECIPE-PRIMITIVE-UNKNOWN`, `E-RECIPE-FORMAT-NEWER`,
   `E-JOURNAL-UNREADABLE`) and `E-UNKNOWN-VALUE` otherwise — so validation failures must
   map to *this product's* code taxonomy, not to a library's error objects.
3. **Every boolean-typed field must be a JSON boolean literal** (C-34) — no coercion, no
   truthiness, no `"true"`. This exists because `"executable": "false"` is truthy in
   JavaScript and read as `true`, failing **open** on two security gates. A validator
   whose `boolean` keyword coerces would reintroduce the finding.

The ADR names `src/pack/schema.ts` as a "hand-rolled structural validator", which is a
consistent answer to all three. **The constraint that decides it:** the validator must
emit F1 diagnostic codes directly, must treat unknown keys and unknown values
asymmetrically, must reject non-literal booleans without coercion, and must be
enumerable against F1 US-16's fourteen ordered steps — a validator that reports findings
in its own order breaks a check order that is *part of the contract*. ✅ **U-2 closed
by Q-81** — hand-rolled, which is what lets the check order be the contract's rather
than a library's.

### 4.5 Glob matching — **the shape is Firm; the dialect is not**

Three consumers: `exclude` on `copy` / `strip-suffix`, `in` on `rewrite-path` /
`substitute`, and anatomy `paths` in `pack.json`. **The `in` domain is the constraint
that rules out an entire class of library.** F1 US-4 states it normatively:

> the resolution domain of an `in` glob is the plan's ordered written-set — the applied
> paths every *earlier* step writes — and nothing else: never the filesystem, never the
> payload, never the project's pre-existing content.

A filesystem-walking glob library (`glob`, `fast-glob`, `tinyglobby`) is therefore the
**wrong shape**, not merely surplus: it resolves against a disk that at plan time does
not yet hold the applied tree, and the ADR makes the point structurally — the matcher
"takes no filesystem handle, so *resolve against disk* is not expressible". A pure
string matcher over `readonly AppliedPath[]` is the right shape, and the two other
consumers match strings over lists as happily. `src/recipe/glob.ts` is "the one bounded
glob matcher" and is the port.

**What is genuinely undecided is the dialect.** No document in the set defines the glob
grammar. `agents/*.md`, `AgentTeams/*.md` and `.harness/pack/**` appear in worked
examples; whether `*` crosses `/`, whether `**` is anchored to a segment boundary,
whether `?`, character classes, braces or negation exist, and what an author gets for
`{a,b}` are all unanswered. **The constraint that decides it:** the dialect must be
small enough that `pack info` can render what an apply will do *completely* (G-F1-9), it
must be matched against strings with no filesystem access, it must be bounded — no
construct with super-linear backtracking, since patterns come from pack authors — and it
must be the **same** matcher in all three positions, because two dialects means a pack
author has to know which one they are in. ✅ **U-3 closed by Q-81** — hand-rolled over
a known path set with no filesystem handle, and the dialect is therefore this
project's to state rather than a library's to imply.

### 4.6 Path normalisation and `collisionKey` — **NFC is Firm; the fold is ASCII-only (Q-81)**

`collisionKey` is the applied path **NFC-normalised and then case-folded**, matched on
every platform **unconditionally** (F1 US-3, N-5). It decides step-vs-step collisions,
the reserved-destination denylist, `E-TARGET-EXISTS`, `--force` byte-identity, and the
journal's `preExisting` flag — and that last one makes it a **rollback-safety**
requirement: under exact-string comparison a project holding `.claude/Settings.json`
and a step writing `.claude/settings.json` are the same file on macOS and Windows, the
journal records `preExisting: false`, and `--rollback` then deletes a user file it did
not create.

**NFC is settled and stdlib**: `String.prototype.normalize('NFC')`.

**The fold is not, and `toLowerCase()` is not the same operation.** Unicode full case
folding and lowercasing disagree on real characters — `ß` folds to `ss` but lowercases
to itself; final sigma `ς` folds to `σ` but lowercases to itself — so the two rules
produce different collision sets, and there is no case-folding function in the JavaScript
standard library. **The constraint that decides it:** the rule must be (a) **identical on
every platform and unconditional**, because a platform-conditional fold means the tree CI
pronounced clean on Linux is not the tree that applies on the developer's machine; (b)
**stable across Node versions**, since a fold that changes under the runtime changes what
collides; and (c) **at least as aggressive as the case-insensitive filesystems it is
protecting against**, because the failure direction that matters is a collision the CLI
*misses*. Note what is *not* a constraint: matching APFS or NTFS exactly. The CLI owns
its own key and only has to be self-consistent and conservative. A documented
`toLowerCase()`-after-NFC, with its known divergences written down, is a defensible
answer; adopting it silently is not.

**Resolved by Q-81, and not in the direction this section expected.** Neither
`toLowerCase()`-after-NFC nor a hand-rolled full fold was adopted. **`collisionKey`
folds ASCII case only** — `A`–`Z` to `a`–`z`, no other character altered — and the
narrowing is documented as **F1 known limit 17**. The reasoning is constraint (c)
above turned around: a hand-rolled partial fold is *not* uniformly "at least as
aggressive", it is aggressive on the pairs it happens to cover and silent on the rest,
while reporting the same confidence for both. An ASCII fold is **wrong in a knowable
way** — every non-ASCII case pair is uncovered, and that sentence is the whole of the
limit — where a partial Unicode fold is wrong in an unknowable one. Constraints (a) and
(b) are satisfied trivially: ASCII folding is identical on every platform and cannot
move under a Node upgrade. **The exposure is bounded and stated**: every applied path in
all three v1.0 packs is ASCII, so no shipped pack is affected, and the v1.1 obligation
is a full fold — or a vetted dependency admitted for this single purpose — **before any
pack ships a non-ASCII applied path**. ✅ **U-4 closed.**

### 4.7 Argument parsing — ⚠️ pending

`parameters[].flag` lets a pack declare a CLI alias (`--calibration high-floor` ≡
`--set constraintFloor=high-floor`), registered from `pack.json` data at parse time so
that the CLI holds **no** pack-specific knowledge — which is what keeps S5 ("adding a
pack requires no change to the harness core") testable. The consequence F1 US-8 spells
out: **the CLI cannot know its own flag set until it has read the pack**, so argv is
walked twice. Pass 1 recognises global flags, command flags and the pack name and
**defers every unrecognised token without judging it**; pass 2 re-parses with the
resolved pack's aliases registered, and only then may a token be reported unknown. Fail
closed at the end of pass 2.

Most off-the-shelf parsers — including `node:util`'s `parseArgs` — assume a **static
grammar** known before parsing starts, and either throw or mis-bind on an unknown token
in pass 1. **The constraint that decides it:** the parser must support *defer without
judging* in pass 1 and a full re-parse with a grammar extended at runtime in pass 2; it
must own a reserved-flag list independent of the command being run (a flag is reserved
whether or not this command accepts it — F1 US-8); and every failure must be one of the
four `E-CLI-*` codes plus `E-FLAG-NOT-PERMITTED`. `parseArgs` with `strict: false` on
pass 1 and `strict: true` on pass 2 is a plausible stdlib route and has not been
evaluated. ⚠️ **U-5.**

### 4.8 `.claude/` frontmatter reading — **settled by Q-81: hand-rolled**, and a gate rides on it

Two error codes and one disclosure row read YAML frontmatter out of Markdown:
`E-CLAUDE-TOOL-GRANT` (a permission-bearing key on any pack-placed file under a
`.claude` segment), `E-CLAUDE-PERMISSION-MODE` (a widening or unrecognised
`permissionMode` value on an agent file), and US-13's disclosure row four, which at v2.5
prints **the whole frontmatter block verbatim**. The checks run over **two disjoint
sets** — the write set on rendered content at US-16 step 11, and the phase-1 payload set
on payload bytes at step 3 (C-39c).

Nothing in the spec set says how the block is parsed. This is the register entry with
the most leverage per line of code, because it is the only pending item where a parser's
disagreement with the runtime is a **security** failure rather than a diagnostic one: if
our reader misses a key the Claude Code runtime honours, the gate fails open.

**The constraint that decides it:** the reader must (a) report a **line number**, so
delimiter and key positions must be preserved; (b) fail **closed** — a frontmatter block
that is present and not confidently parsed must be an error, never a pass, which is the
opposite of most frontmatter helpers' behaviour; (c) reproduce the block **verbatim**
for the disclosure, so a parse-and-re-serialise round trip is not acceptable; and (d) be
narrow enough to audit, since a full YAML implementation is a large surface to admit
into a process that computes a confinement gate. Reading the delimited block as lines and
matching pinned key names — the pin F1 US-3 already requires, with the runtime version it
was taken against recorded beside it — satisfies all four without a YAML engine, and is
the recommendation this document offers rather than decides. ✅ **U-6 closed by
Q-81** — hand-rolled, and the fail-closed-with-a-line-number requirement is the
reason: it is a security-relevant reader, and three codes ride on it.

### 4.9 Parameter `pattern` validation — ⚠️ pending

Every `string` parameter must declare an anchored `pattern` (C-7): begins `^`, ends `$`,
≤ 200 characters, **no backreference, no lookaround**, with `maxLength` (default 256,
ceiling 4096) checked **first** so pattern evaluation is bounded and catastrophic
backtracking is not reachable. `E-PARAM-PATTERN-INVALID` otherwise.

`new RegExp(src, 'u')` tells you a pattern compiles. It does not tell you whether it
contains a backreference or a lookaround — that needs the *source* inspected.
**The constraint that decides it:** the check must decide the ban from the pattern text,
must not itself be a backtracking scan over author-supplied input, and must run at
validate time in CI with no project. A conservative scan that rejects the constructs
outright — including any it cannot classify — is fail-closed and is the shape this
document recommends; a regex-AST parser is the alternative and is a dependency. ⚠️ **U-7.**

### 4.10 Semver — **settled by Q-81: hand-rolled**

`pack.json` carries `version` and `minCliVersion`; the manifest records both plus the CLI
version; `E-PACK-CLI-TOO-OLD`, `E-PACK-FORMAT-NEWER` and `W-MANIFEST-NEWER-CLI` /
`W-PACK-NEWER-THAN-CLI` all need a **comparison**, not just a validation. No document
names a library and none rules one out. **The constraint that decides it:** the comparison
must be total over the range of versions the three bundled packs and the CLI will ever
declare, must be deterministic across platforms, and must not drag in a transitive tree
under §7.1 — the `semver` package is the ecosystem default and is a single dependency,
while strict-semver parsing that ignores ranges (which this product never needs, since
`minCliVersion` is a floor and not a range) is about thirty lines. ✅ **U-8 closed by
Q-81** — those thirty lines, not the dependency.

### 4.11 Interactive prompting — ⚠️ pending, and it is F2's

`init` collects parameter answers "by prompt or `--set`" (F1 US-8), and F1 says plainly
that **F2 owns the CLI surface and the interactive prompting**. F2 has no spec, no ADR
and no epics-and-tasks, so this is unchosen by construction rather than by oversight.
**The constraint that decides it:** whatever prompts must (a) work when stdin is not a
TTY — CI and the F6 skill both drive `init` non-interactively, and Q-57 makes the skill
the *normal* path; (b) surface `init`'s pre-write disclosure **faithfully rather than
summarised** (Q-57 records this as a design burden); and (c) add no dependency that
writes to the terminal outside the diagnostics catalogue, which F1 declares is the only
place user-facing text exists. `node:readline/promises` is the stdlib route. ⚠️ **U-9.**

### 4.12 Text, encoding and binary detection — **Firm**

UTF-8 only for phase-2 output; a BOM is stripped on read and never re-emitted; a file is
binary when its bytes are not valid UTF-8 or its first 8 KB contain a NUL, and a binary
file is copied verbatim, compared raw, and excluded from `substitute`, `rewrite-path` and
`generate` (F1 §NFR). `TextDecoder('utf-8', { fatal: true })` decides validity;
everything else is a byte scan. Stdlib, no choice to make.

---

## 5. Build, test and distribution

### 5.1 Test runner and fixtures — **`node:test` (Q-81)**, **Firm** on what it must run

**What runs is decided and is unusually specific.** F1 US-16 makes **adversarial fixture
packs a shipping requirement** — a directory of deliberately malicious minimal packs,
each asserted on the **exact code and exit class**, not merely on non-zero — with a
declared minimum set of roughly forty rows plus two positive assertions over the real
`coding` pack. The reasoning is recorded rather than assumed: the settings-write finding
that triggered the amendment was reachable in two recipe steps and survived a full
rewrite plus two rounds of a disposition table that declared the conditions satisfied.
*A fixture would have caught it on the first CI run; no amount of table-reading did,
twice.* Alongside them, CI runs `lintel harness validate --all --strict` and requires
exit 0 over the three bundled packs. Unit tests live beside each module as `*.test.ts`
(owned by `implementer`); the integration tree is `tests/` (owned by `testwriter`).

**What runs them is not decided.** `vitest.config.ts` appears in the ADR's file-level
plan without a decision anywhere behind it — the ADR's own prose in the same paragraph
says "no runtime dependency outside Node stdlib", and a test runner is a dev dependency,
so the row is neither wrong nor ratified. Node ≥ 22 ships a stable `node:test` plus
`node:assert`, which is a real alternative that did not exist when this pattern was
established. **The constraint that decides it:** the runner must be able to (a) execute a
fixture pack end-to-end through the real CLI entry point and assert on the **process exit
class**, not only on a thrown error — several fixtures distinguish exit 1 from exit 2 and
two assert on **on-disk file mode and directory-entry name** with no code at all; (b) run
in CI on the three platforms G-F1-7 names; and (c) not require the build step of §5.2 to
run first, or every test run pays for a build. This is a dev-dependency decision, so §7.1
does not forbid it — but it should be *taken*, not inherited from a table row. ✅
**U-10 closed by Q-81**: `node:test`, which ships with Node 22 and is not a
dependency in either budget.

### 5.2 Build — ⚠️ pending

TypeScript has to become something `npx @lintel/cli` runs. Three routes exist and
none has been chosen: `tsc` emitting ESM JavaScript plus declarations; a bundler
(`esbuild`, `tsup`, `rollup`) emitting one file; or shipping `.ts` and relying on Node's
type stripping, which Node 22 supports in recent minors. **The constraint that decides
it:** the build must (a) **type-check**, not merely strip — §3.1's two structural
controls, the path brands and the total `RecipeStep` union, exist only under a checker,
so a strip-only route must be paired with a checking step in CI or it deletes them;
(b) preserve the ability to resolve the bundled `packs/` directory relative to the
installed module (§5.3); (c) keep the published artefact small and legible enough that
`packs/` inside it is inspectable, since Q-2's whole argument is that the pack and the
CLI ship as one auditable thing; and (d) hold `engines.node >= 22` (Q-16). Type stripping
additionally has stability and syntax caveats worth checking against the pinned Node
floor before it is chosen. ⚠️ **U-12.**

### 5.3 Distribution and pack bundling — **Firm on the requirement**

`@lintel/cli`, binary `lintel`, with `harness` as its first command group (Q-16 **as
amended by Q-63**). The binary deliberately no longer matches the package name: `lintel`
is claimed once on PATH and later tools slot in as `lintel <tool> …` with no new name to
claim. **Whether those tools ship inside `@lintel/cli` or load as plugins is Q-64 —
reserved and open**; two packages cannot both own the `lintel` binary, so a second tool
forces that choice. **`packs/` ships inside
the published package** (Q-2): one maintainer, three packs, so a CLI feature and the pack
change that needs it are one atomic commit and one release — and `npx` then needs no
network, which is what makes F1 §NFR *No network* achievable rather than aspirational.

Two mechanism details are unstated and are the ⚠️ half, carried by **U-12** rather than
given a number of their own, because the build route decides both. The package must
actually include `packs/` (an npm `files` entry or equivalent), and the CLI must resolve
that directory from its own installed location — the same `realpath` the confinement
gate reserves as a destination, so this resolution is security-relevant and should have
one owner rather than being recomputed at each call site.

### 5.4 CI — **Firm on the command, ⚠️ pending on the runner**

The command set is fixed by F1 US-16: `validate --all --strict` over the three bundled
packs, exit 0; plus the fixture suite asserting exact codes and exit classes; plus the
cross-platform matrix G-F1-7 implies. **No CI configuration exists in this repo today**
and no provider is chosen. Note the mild irony worth stating once so nobody trips on it:
`.github`, `.circleci`, `.gitlab-ci.yml`, `Jenkinsfile` and their kin are **reserved
destinations a pack may never write** (F1 US-3 stage 2) — that rule is about what a
*pack* does to a *user's* project and says nothing about this repository choosing a CI
provider for itself. ⚠️ **U-13.**

---

## 6. Consolidated unclarities (⚠️ register)

Every ⚠️ above, gathered. Each names the **constraint that decides it** rather than a
deadline. None of them blocks *specification* work; U-1, U-2, U-3, U-4 and U-6 block the
first line of implementation, because a module in the ADR's file plan cannot be written
without them. **No question is opened for any of these** — they are choices to be made
inside a settled decision, not decisions awaiting the owner. The one exception was
U-14, and **it has been ratified** (Q-81).

**Nine of the fourteen are closed** — marked ✅ — and **five remain open**: U-5, U-7,
U-9, U-12 and U-13. Read the ✅ rows as history: the constraint column still states what
had to be true, which is what makes the resolution checkable.

| # | Unclarity | The constraint that decides it | Owner / unblocks |
|---|---|---|---|
| ✅ **U-1** | What replaces `JSON.parse` for `pack.json`, `recipe.json`, the manifest | Must reject a duplicate key **at any depth** and report the key with **both line numbers** — so source positions the stdlib parser discards are required; must be the only authored-JSON reader so the rule is total; must add no runtime dependency under §7.1 | `architect` at F1 implementation · blocks `src/json/parse-strict.ts` |
| ✅ **U-2** | What validates `pack.json` / `recipe.json` | Unknown **keys** warn while unknown **values in a behaviour-selecting position** are fatal (C-16); boolean fields must be JSON literals with **no coercion** (C-34); findings must be F1 codes emitted in US-16's fixed fourteen-step order | `architect` · blocks `src/pack/schema.ts`, `src/recipe/schema.ts` |
| ✅ **U-3** | The glob **dialect** (`*` vs `**`, classes, braces, negation) | One matcher for `exclude`, `in` and anatomy `paths`; **no filesystem handle** (C-27); small enough that `pack info` renders an apply completely (G-F1-9); bounded against author-supplied patterns | `architect` · blocks `src/recipe/glob.ts` |
| ✅ **U-4** | The case-fold half of `collisionKey` | Identical and unconditional on **every platform**; stable across Node versions; **at least as aggressive** as the case-insensitive filesystems it guards, since the dangerous direction is a missed collision. `toLowerCase()` ≠ Unicode full folding and the divergence must be written down, not discovered | `architect` + `securityreviewer` · blocks `src/security/confine.ts`; rollback safety (N-5) rides on it |
| **U-5** | What implements the two-pass argv walk | Pass 1 must **defer unknown tokens without judging them**; pass 2 re-parses with a grammar extended at runtime from `pack.json`; reserved-flag list is global, not per-command; every failure maps to an `E-CLI-*` code | F2 (with F1's `flags.ts`) · blocks `src/cli/flags.ts` |
| ✅ **U-6** | How `.claude/` frontmatter is read | Must report a **line**; must fail **closed** on an unparsed block; must reproduce the block **verbatim** for the disclosure (no re-serialise); must be narrow enough to audit. A full YAML engine is a large surface admitted into the gate-computing process | `architect` + `securityreviewer` · blocks `E-CLAUDE-TOOL-GRANT`, `E-CLAUDE-PERMISSION-MODE`, US-13 disclosure row 4 |
| **U-7** | How `pattern` is checked for backreference / lookaround | Must be decided from the **source text**, not from compilation; must not itself backtrack over author input; runs at validate time with no project; fail closed on anything unclassifiable | `architect` · blocks `E-PARAM-PATTERN-INVALID` |
| ✅ **U-8** | Semver parse and compare | Total, deterministic across platforms, no range arithmetic needed (`minCliVersion` is a floor); weigh one well-known dependency against ~30 lines under §7.1 | `architect` · blocks `E-PACK-CLI-TOO-OLD`, `E-PACK-FORMAT-NEWER` |
| **U-9** | Interactive prompting | Must work with **no TTY** (CI and the F6 skill both drive `init` non-interactively — Q-57); must surface the pre-write disclosure **faithfully, not summarised**; no terminal text outside the diagnostics catalogue | **F2**, which has no spec — this is downstream of that gap |
| ✅ **U-10** | Test runner | Must assert on the **process exit class** and, for two fixtures, on **file mode and directory-entry name** with no code involved; must run the cross-platform matrix of G-F1-7; should not require a build first. A dev dependency, so §7.1 permits one — but the choice should be taken, not inherited from `vitest.config.ts` sitting in a file plan | `implementer` + `testwriter` · blocks the fixture suite, which US-16 calls its most important criterion |
| ✅ **U-11** | No `W-` code for the `link` → `open(dest,'wx')`+`rename` fallback | F1 US-13 requires the run's diagnostics to "record the narrowed guarantee", and F1 declares its codes **the only** CLI error model — so this diagnostic is currently only assertable by string-matching. Needs a classified `W-` code (a **notice**: the state is real and nothing is fixable) | **F1 defect** — report to the spec owner; not a technology choice |
| **U-12** | Build route (`tsc` / bundler / Node type stripping) **and the packaging half with it**: getting `packs/` into the artefact, and resolving it install-relative | Must **type-check**, not merely strip — the path brands and the total `RecipeStep` union are compile-time controls; must include `packs/` in the published package (Q-2) and resolve it from the installed module, which is the same `realpath` the gate reserves as a destination; must keep the artefact inspectable (Q-2's audit argument); must honour `engines.node >= 22` | `architect` · blocks the first publish |
| **U-13** | CI provider and workflow | Must run `validate --all --strict` + the fixture suite on the three platforms of G-F1-7. Unrelated to the reserved-destination rules, which govern what a **pack** writes into a **user's** project | Owner · blocks the release gate, not implementation |
| ✅ **U-14** | **The dependency posture of §7.1 is proposed, not ratified** | It governs U-1, U-2, U-3, U-6, U-8 and U-10 at once and cannot be derived from the specs — the ADR and `system-architecture.md` currently state it at two different scopes (§7.1). If the owner ratifies it, it takes **Q-62**; this document opens no question | **Owner** · ratification would settle six register rows in one line |


**What closed them, 2026-09-01.** **Q-81 ratified the §7.1 posture**, which turns
"weigh a dependency against N lines" into "hand-roll it", and that single answer
settles **U-1** (strict JSON with duplicate-key detection and line numbers), **U-2**
(schema validation over closed enumerations this project already specifies), **U-3**
(a glob over a known path set with no filesystem handle), **U-6** (the `.claude/`
frontmatter reader), **U-8** (semver comparison, no range arithmetic — the ~30 lines
the row already costed) and **U-10** (`node:test`, which ships with Node 22 and is
therefore not a dependency at all). **U-4 is the one that did not resolve by
hand-rolling** and is answered by narrowing `collisionKey` instead — §4.6, F1 known
limit 17. **U-11 closes separately**, in the same F1 v3.0 fold: the missing `W-` code
for the `link()` fallback now exists as **`W-LINK-FALLBACK`**, class `notice`, so the
narrowed guarantee US-13 has required since v2.0 is finally assertable by code rather
than by string-matching a message.

**The five that remain are all *work*, and none blocks a task.** U-5 (two-pass argv
walk), U-7 (`pattern` source inspection), U-9 (prompting with no TTY), U-12 (build and
packaging route) and U-13 (CI provider) each have their constraint written above and an
implementer who can satisfy it without another decision.
---

## 7. Cross-cutting positions

### 7.1 Dependency posture — stated, not inherited

**The position: zero runtime dependencies at v1.0, and every one proposed thereafter is
argued for in an ADR against this paragraph.** Dev dependencies — a test runner, a build
tool — are a separate and looser budget, but are still chosen rather than assumed.

The argument is specific to what this product is. `lintel harness init` writes files into
a stranger's repository, and the property the entire security architecture rests on is
that *a pack's whole effect on a machine is six primitives applied to confined paths*.
Every runtime dependency is code executing in the same process as `confinePath`, with the
same filesystem access, in a supply chain the CLI does not control — and the product has
**no signing, no registry and no provenance story** to price that against (F1 US-3's own
reasoning for banning hooks says so). A postinstall in a transitive dependency is exactly
the capability class `package.json` was made a reserved destination to close; admitting
one through our own manifest would be the same finding wearing our hat.

Two supporting facts, and neither is decisive alone. First, the ADR's file plan **already
hand-rolls** the three biggest candidates — the JSON parser, the schema validator and the
glob matcher — so this posture describes the design rather than constraining it. Second,
each is small precisely because the spec narrowed it: a glob matcher over a string list
is not a glob library, and a validator emitting F1 codes in F1's order is not a schema
engine.

**Where it bends, and the test.** A dependency is admissible when it (a) has no
transitive dependencies and no install scripts, (b) is doing something genuinely hard to
get right — Unicode case folding is the honest candidate, semver comparison the marginal
one — and (c) is isolated behind one module so removing it is a local change. "It would
save an afternoon" is not the test; "getting this wrong is a security finding and someone
else has already got it right" is.

**A drift to fix while stating this:** `system-architecture.md` says "no runtime
dependency outside the Node standard library" unqualified, while `F1-ADR-001`'s file plan
says "no runtime dependency outside Node stdlib **for hashing, JSON and fs**". Those are
different claims — the broad one is a policy, the narrow one is an observation about
three modules. This section is the broad one, stated as a position with a bending test,
and it is what the other two should point at rather than restate.

### 7.2 Untrusted input, and where it enters

`system-architecture.md` §3 owns the confinement path; this is only the technology-facing
half — the four places bytes we did not write reach code we did:

- **Pack-authored JSON** — parsed by §4.3's reader, which must disagree with a reviewer
  in no case.
- **Pack-authored globs and regexes** — §4.5's bounded matcher and §4.9's source
  inspection; `maxLength` is checked **before** `pattern` runs so evaluation is bounded.
- **Pack payload bytes** — walked once, `lstat` only, depth 32 and 10 000 entries, never
  following a link; text/binary decided by §4.12, never by extension.
- **User-typed parameter answers** — the only input from outside the pack, and the one
  recorded verbatim in a committed manifest. Bounded by `maxLength`, then `pattern`, then
  the newline ban, and every applied path where one lands is enumerated verbatim in the
  disclosure (C-43).

There is no credential handling, no key material and no rotation story, because §2 means
there is nothing to hold one for.

---

## 8. Pack content is not the harness's stack

**A reader will otherwise conclude this product depends on Azure. It does not.**

`packs/coding` ships two mutually exclusive backend scaffolds — `backend-azure`
(Azure Static Web App + Neon Postgres, Bicep plus shell/PowerShell) and `backend-aws`
(Lambda + CDK TypeScript, to author, Q-8a) — and `packs/writing` ships
`writing-workstream` (Q-17). Those technologies are **files a pack copies into somebody
else's project**. The harness neither imports them, executes them, nor knows what they
are: to `copy` and `strip-suffix` a `.bicep` file is bytes, and the only property the CLI
asserts about the four deploy scripts is that they land `0755` under a declared
`executableRoots` prefix and are enumerated in the pre-write disclosure (C-12, C-38).

Two consequences worth stating, because they are what the distinction buys:

- **A second backend scaffold is how the scaffold interface is proved general rather
  than asserted** (Q-8) — the same argument that makes two packs a better test of the
  pack format than one. Q-8a records the residual risk honestly: both are declarative-IaC
  in shape, so a platform-CLI target could still break assumptions neither reveals.
- **Adding, changing or deleting a scaffold is pack content work under F5.** It touches
  no row of §1, needs no ADR here, and cannot change what the CLI depends on. If it ever
  did, that would be the bug.

The same separation covers the rest of pack content: Markdown, JSON, shell, PowerShell
and Bicep are what packs are *made of* (F5 §Platform); the CLI's own dependency list is
§1 and §7.1 and nothing else.

---

## 9. The skill (F6) — a technology choice by absence

The skill is **Markdown under `.claude/skills/` and nothing else**. It has no runtime, no
build, no package, no tests of its own, and no dependency of its own. Q-1 put it there
deliberately: deterministic mechanics in the CLI, judgment in a thin skill, and *build
the CLI first* so the wrapper is written once against a settled command surface. Q-57
then made the conversational path **primary** while keeping the CLI fully usable
standalone.

Three consequences follow from having no runtime, and they are the reason this section
exists at all:

- **It cannot be versioned against the CLI by a manifest, because it declares nothing.**
  Q-3 versions packs and the CLI; the skill sits outside that scheme. Its coupling to the
  CLI is the `init` **argument surface, the diagnostic codes and the exit classes** — the
  master spec names exactly that as the F6→F2 interface — and prose cannot declare a
  `minCliVersion`. **The practical rule:** the skill ships in the same package and the
  same release as the CLI it wraps, so "which CLI does this skill expect" has one answer
  (the one it shipped with) rather than a compatibility matrix. If the skill is ever
  distributed separately, that answer disappears and the coupling needs a real mechanism.
- **It must branch on codes and exit classes, never on prose.** F1 declares its
  `E-`/`W-` codes and the four exit classes the only CLI error model precisely so that F6
  and CI can do this. A skill that pattern-matched a message would break on a wording fix.
- **It must relay `init`'s pre-write disclosure faithfully rather than summarising it.**
  Q-57 records this as the design burden the conversational-primary decision creates: an
  LLM intermediary is exactly where summarising is tempting and exactly where it destroys
  the disclosure's value. There is no technology that enforces this — which is itself the
  point, and it belongs in F6's spec when that spec is written.

The skill is also the only feature that can be cut without breaking the release gate
(`system-architecture.md` §4), which is another way of saying it carries no technology
risk at all.

---

## Change history

| Version | Date | Author | Change |
|---|---|---|---|
| v1.0 | 2026-09-01 | architect | Initial version. Adapts the template to a product with no backend, datastore, frontend or hosting (§0), states what it deliberately has none of (§2), records the settled runtime and the six stdlib-settled capabilities, and opens a **14-entry ⚠️ register** — each with the constraint that decides it — covering strict JSON parsing, schema validation, the glob dialect, the `collisionKey` case fold, the two-pass argv walk, frontmatter reading, `pattern` inspection, semver, prompting, the test runner, the build, CI, an F1 defect (no `W-` code for the `link` fallback), and the unratified dependency posture. No question opened; next free remains **Q-62**. |
| v1.1 | 2026-09-01 | specwriter | **Q-81 ratifies §7.1, and nine of the fourteen ⚠️ entries close.** The dependency posture is no longer this document's proposal — **zero runtime dependencies** is the owner's decision and is now a **requirement** in F1 §NFR, assertable as an empty `dependencies` object. **U-1, U-2, U-3, U-6, U-8 and U-10 close on the single answer** the posture supplies: hand-roll it, or use the stdlib (`node:test` ships with Node 22, so the runner is not a dependency in either budget, and the ADR's `vitest.config.ts` is superseded). **U-4 did not close that way and is the honest part of this fold**: §4.6 asked for a fold that is identical across platforms, stable across Node versions and at least as aggressive as the filesystems it guards — and Q-81 answers it by **narrowing `collisionKey` to NFC plus ASCII case-folding**, recorded as F1 known limit 17, on the ground that a hand-rolled partial Unicode fold is aggressive on the pairs it covers and silent on the rest while reporting equal confidence for both. Wrong in a knowable way beats wrong in an unknowable one. **U-11 closes separately in the same F1 v3.0 fold**, by the allocation of `W-LINK-FALLBACK`. **Five remain, and all five are work rather than decisions**: U-5, U-7, U-9, U-12, U-13. The §1 status table and the section headings for every closed item move off ⚠️ in this pass, so the register and the prose cannot disagree. |
