# System Architecture — Lintel Harness

**Status:** Draft
**Applies to version:** v1.0 — four-feature baseline: F1, F2, F5, F6 (F3 and F4 are reserved for v1.1)
**Date:** 2026-08-31
**Sources:** `v1.0/LintelHarnessSpecification-1.0.md` · `v1.0/F1-spec-pack-format-and-manifest.md` v2.5 · `v1.0/F1-ADR-001-pack-format-and-manifest.md` (file-level plan, public interface contract, §7 security architecture, §10 FINAL verdict) · `v1.0/F5-spec-template-packs.md` v2.4 · `general/pack-application.md` · `general/pack-inventory.md` · `project-brief.md` §12 (Q-1…Q-55)

> The "shape of the whole system in one place" companion to `technology-choices.md`
> (**required and unwritten**). Where the per-feature specs answer *"what does this
> feature do?"*, this answers *"how does the whole system fit together?"*. Greenfield
> Node/TypeScript, no runtime dependency outside the Node standard library; nothing
> here is reused from an existing platform.
>
> **Version-spanning and version-true.** It describes v1.0 as specified, not v1.0 as
> hoped for. Where v1.0 does not have something, this document says so.
>
> **Living document.** Review on every version bump; keep the `## Change history` current.

---

## 1. Architectural principles (the shape in one breath)

Nine invariants. Each is load-bearing: remove it and something else in the system
stops being true.

- **Plan everything, then write.** Validation, both phases and the manifest are
  computed **in memory**; a journal is written; only then do bytes land
  (`pack-application.md`, F1 US-13, §F1.6). *Consequence:* "zero bytes written unless
  every check passed" is literal rather than aspirational, and it is the property §3
  is built on — including for the manifest, whose `payloadDigest` is computed over the
  **planned** payload set, not over what is on disk afterwards (F1 US-30).

- **Phase 2 renders at plan time; the executor reads nothing from disk.** Every byte
  phase 2 emits is produced before phase 1 writes its first file (C-23, `F1-ADR-001`
  §3.6, F1 US-30). *Consequence:* `.harness/pack/` is phase 2's **logical** input and
  its **literal** input only at `verify`. There is no window in which content could
  change after `payloadDigest` was computed, and no step's output can depend on what
  an earlier step left on disk.

- **The recipe is a pure function of (payload, parameter answers, scaffold
  selection).** Three inputs, and the third is not optional — a `--scaffold` apply
  produces a different tree (F1 §NFR *Determinism*; the two-input form was corrected
  under C-46). *Consequence:* the manifest can stay at six keys with no per-file hash
  list and no `.harness/base/` store (Q-43), and `verify` can **recompute** the
  expected tree instead of remembering it (F1 §F1.8). After Q-54 the claim holds at
  every applied path with **no exception**, because `merge-json` — the only primitive
  that read its destination's prior content — does not ship.

- **The primitive set is closed at six.** `copy`, `rename`, `strip-suffix`,
  `rewrite-path`, `substitute`, `generate`, matched **literally** — `"copy "` with a
  trailing space is `E-RECIPE-PRIMITIVE-UNKNOWN` (F1 US-31). *Consequence:* what an
  apply can do stays enumerable, so `pack info` can render the complete list of what
  an apply will do before it does it. **A new kind of step is a CLI change, not a pack
  change**, deliberately. The step count is bounded at 256 for the same reason: an
  unbounded list degrades that control continuously while naming no point at which a
  reviewer should stop trusting it (C-30).

- **Packs are data, not code.** This is why phase 2 is a recipe rather than a script.
  A script would make a pack *code that executes on the user's machine*, which voids
  the security model outright, because path confinement and the reserved-destination
  denylist both depend on the plan being **inspectable before anything runs**
  (Q-40). *Consequence:* there is no `exec`, `script` or `shell` op and no escape
  hatch of any kind — and, per the ADR's file plan, no `src/recipe/ops/exec.ts` to add
  one to.

- **A reserved *name* is reserved at every segment; `.harness/` is the only *location*
  entry in the whole design.** `.git`, `.hg`, `.svn`, `.github`, `.vscode`, `.idea`,
  `node_modules`, `.circleci`, `.devcontainer` are reserved wherever they appear;
  `settings.json` and `settings.local.json` under **any** `.claude` segment (F1 US-3
  stage 2, C-33/C-39). *Consequence:* a nested `docs/.claude/settings.json` or
  `pkg/node_modules/.bin/foo` is refused by the same rule as the root-level one, and
  the quantifier is stated next to the property rather than re-derived per rule. This
  is the lesson of the final security round: *every HIGH was a repair that stopped one
  step short of the principle it established.*

- **Two brands, and no writer takes a bare string.** `AppliedPath` (the sole output of
  the confinement gate) and `HarnessPath` (the CLI's own five writes under
  `.harness/`), with `WritablePath = AppliedPath | HarnessPath` on the journal, the
  atomic writer and rollback (C-14, `F1-ADR-001` interface contract). *Consequence:* a
  path that skipped the gate cannot reach a writer without a compile error, the
  denylist can forbid `.harness/` **absolutely** without deadlocking against the
  payload copier, and phase 1 is journalled and rolled back exactly like phase 2
  without being privileged.

- **Deterministic mechanics in the CLI, judgment in a thin skill.** The seam is a
  decision, not an accident (Q-1): a mechanism that varies run to run is not a
  mechanism, and a CLI can only stub out the parts that are genuine judgment.
  *Consequence:* build order is CLI first, skill last, and the skill wraps `init` and
  only `init` — `validate`, `verify` and `pack info` are read-only diagnostics a
  person or CI runs directly.

- **Say what is not enforced.** Severity is a property of the **code**, never of the
  occasion; the `E-`/`W-` codes plus exit classes `0/1/2/3` are the **only** CLI error
  model, and F1 §Error States is the only catalogue (78 codes). *Consequence:* F6 and
  CI branch on codes and never on prose — and, symmetrically, where a control is
  incomplete the design states it: reserved-destination class 2 is a **denylist and
  therefore incomplete by construction**, and an agent file's `tools:` list is
  **disclosed rather than gated** because gating it would delete the feature.

---

## 2. Container diagram (system context + containers)

```mermaid
flowchart TB
  dev(["Developer"])
  skill["Claude Code skill — F6, no spec yet<br/>judgment only: derive answers, adapt CLAUDE.md prose,<br/>redraw ownership tables, fill copy/tone-of-voice.md"]
  bundle["packs/ — bundled in the published package, no network<br/>coding · writing · planning (F5)"]

  subgraph cli["lintel-harness · @lintel/harness · Node 22+ · Node stdlib only"]
    direction TB
    cliq["cli/ — argv, flags, four commands<br/>init (F2) · validate · verify · pack info (F1)"]

    subgraph planner["PLAN — pure, in memory, writes nothing"]
      direction TB
      pk["pack/ + recipe/<br/>pack.json · recipe.json · the six primitives · write set"]
      se["security/<br/>confinePath · collisionKey · reserved denylist · path brands"]
      pl["payload/<br/>phase-1 file list · payloadDigest over the PLANNED set"]
      rn["apply/plan.ts — RENDER<br/>every phase-2 byte is produced here, from the one bundle read"]
    end

    subgraph writer["EXECUTE — writes only; reads no input"]
      direction TB
      fsw["fs/ — lock · journal v2 · atomic write · rollback"]
    end

    vf["verify/ — recompute in memory, compare to disk<br/>read-only: no lock, no journal, no network"]
  end

  subgraph proj["Target project — exactly one pack (Q-12)"]
    direction TB
    hp[".harness/pack/ — phase-1 payload, verbatim, every file 0644"]
    hm[".harness/manifest.json — six keys, payloadDigest fourth"]
    ap["applied tree — .claude/ · AgentTeams/ · targets/ · copy/<br/>CLAUDE.md with inert anchors · selected scaffolds"]
  end

  dev -.-> skill
  dev -.-> cliq
  skill -.->|drives init only| cliq
  cliq --> pk
  bundle -->|"read ONCE, at plan time"| pl
  pl -->|in-memory bytes| rn
  pk --> rn
  se -->|"gate: every applied path"| rn
  rn -->|"the complete plan: every byte of both phases"| fsw
  fsw ==>|"PHASE 1 — verbatim copy"| hp
  fsw ==>|"PHASE 2 — bytes already rendered"| ap
  fsw -->|"last write of the run"| hm
  hp -.->|"read off disk ONLY here"| vf
  hm -.-> vf
  vf -.->|compare, report, write nothing| ap
```

**How to read it.** Solid arrows are the primary runtime flow; dotted arrows are
control, human-in-the-loop, or read-only. The single most important path is
`bundle → payload/ → render → fs/ → project`, and the thing to notice is what is
**missing**: there is no arrow from `.harness/pack/` back into `apply/plan.ts`. The
executor consumes the plan and writes; it never reads an input. The only arrow out of
`.harness/pack/` is the dotted one into `verify/`, which is the one place an apply's
payload is read off disk (C-23). The two thick arrows are the phase boundary — phase 1
lands the payload verbatim, phase 2 lands bytes that already existed in memory before
phase 1 started writing.

Group names are the ADR's file-level plan. `pack/`, `recipe/`, `payload/`, `security/`
and `apply/plan.ts` are all **pure** — no filesystem handle reaches them except the one
bundle read — which is what lets `validate` run in CI against a pack with no target
project at all.

---

## 3. The trust-critical path — validate → plan → journal → write

The load-bearing flow is `init`, and its guarantee is one sentence:

> **Zero bytes are written unless every check passed — not even `.harness/`.**

Everything else in this section exists to make that sentence true rather than
asserted.

```
lintel-harness init <pack> [--scaffold …] [--set k=v] [--force]

  1  .harness/ already present?    → E-JOURNAL-PRESENT (2) / E-ALREADY-APPLIED (1)   0 bytes
  2  resolve pack from the bundle; minCliVersion, formatVersion                      0 bytes
  3  validate — US-16 checks 1–10: pack.json schema + strict JSON parse, anatomy,
        PAYLOAD INTEGRITY (symlinks, path grammar, traversal + size bounds, and
        permission-bearing .claude/ frontmatter over the PHASE-1 PAYLOAD SET),
        recipe schema, step sources, → WRITE SET computed once ← destination
        safety, executable declarations, hook-script disclosure, parameters,
        scaffolds                                                                    0 bytes
  4  collect answers (prompt or --set); typed, maxLength first, then pattern         0 bytes
  5  realpath(project root) — resolved ONCE for the whole run                        0 bytes
  6  PLAN BOTH PHASES IN MEMORY   ← the ONLY read of the bundled pack
        phase 1: payload file list  →  payloadDigest over the PLANNED set
        phase 2: EVERY step rendered here, from those same in-memory bytes
        every applied path in every write set through the four-stage gate
        US-16 checks 11–14 over the one combination the answers select
        the manifest and the security disclosure are built here                      0 bytes
        └─ any failure → exit 1 or 2, ZERO bytes
  ────────────────────────────── the gate closes here ──────────────────────────────
  7  take .harness/lock                        (E-LOCK-HELD / W-LOCK-STALE-BROKEN)
  8  write .harness/journal.json  (v2)         ← the first byte of the run
  9  PHASE 1 — write the payload verbatim to .harness/pack/, files 0644, dirs 0755
 10  PHASE 2 — write the bytes rendered at step 6; NO read of disk
        per write: re-confine (stage 3) → exclusive create → link/rename
        └─ target moved in the window → E-TARGET-RACE (2), journal intact
 11  write .harness/manifest.json                ← the last write of an apply
 12  delete journal + journal.d/, release the lock   ← apply complete

  FAIL at 9, 10 or 11  →  journal survives; `init --rollback` reverses it.
```

### The four confinement stages

Confinement is **by resolution, not by string** — inspecting a declared string says
nothing about the filesystem that string will meet (F1 US-3, `F1-ADR-001` §7.1).

| Stage | When | What |
|---|---|---|
| **1 — anchored `to` grammar** | declaration time; runs at `validate`, which has no project | One rule, one code (`E-MAP-PATH-GRAMMAR`): the segment grammar, no leading separator, no `\`, no `C:\x` **or** drive-relative `C:x`, no `//`/`\\` prefix, no `.`/`..`/empty segment, no segment ending in `.` or whitespace, no reserved Windows basename, NFC mandatory. Payload paths get the same grammar as `E-PAYLOAD-PATH-INVALID` |
| **2 — reserved-destination denylist** | declaration time, on the resolved path | Two **declared, closed** classes matched by `collisionKey` (NFC + case-fold, on every platform, unconditionally): tool/VCS-owned trees, and destinations a common toolchain executes. `E-MAP-RESERVED-DEST`, exit 2 |
| **3 — resolution confinement** | plan time and write time only; **skipped at `validate`** | Root resolved once with `realpath`; every ancestor `lstat`ed top-down (`E-DEST-SYMLINK` on a symlink, junction or reparse point); directories created one level at a time, each checked before the next; the final destination must be a **strict descendant** of the resolved root (`E-MAP-ESCAPES-ROOT`) |
| **4 — the write itself** | write time | Stage 3 re-run immediately before each write, because the plan's `lstat` is stale by then; exclusive temp create (`open(tmp,'wx')`); `link(tmp,dest)` then `unlink` for a path expected to be new; re-hash for a `--force` byte-identical path. Any confirmation failing is `E-TARGET-RACE` |

Stage 3 is deliberately absent from `validate`: a pack must be checkable in CI with no
target project, which is what makes the authoring-time checks the high-value half of
the security model (`F1-ADR-001` §7.0).

### The two quantifiers

A rule quantified over the wrong set is the defect this design has hit three times, so
the sets are named:

- **The write set** — every applied path a step's bytes create or change, per
  primitive (F1 §F1.2). It is the quantifier for the grammar, the denylist, the
  collision rules and the executable rules. It is **not** `to`: `rewrite-path` and
  `substitute` have no `to`, so a rule over `to` has two silent exemptions, which is
  exactly how the denylist lapsed (C-19). The write set is a **pure function of the
  pack** and is computed **once**, after `validate` step 5.
- **The phase-1 payload set** — every path phase 1 copies. It is disjoint from the
  write set (a `HarnessPath`, not an `AppliedPath`), and it is the **second**
  quantifier for `E-CLAUDE-TOOL-GRANT` / `E-CLAUDE-PERMISSION-MODE` (C-39c). A pack
  that merely *ships* `.claude/commands/x.md` with `allowed-tools` and names it in no
  recipe step still lands it at `.harness/pack/.claude/commands/x.md`, **inside the
  committed project**. Widening the write set to cover it was rejected: that would
  break the brand separation and deadlock the denylist against the payload copier.

### The journal, and the rollback invariant

Before any write, a **version-2 journal** records, per intended path: the hash this
apply intends to write, **`preExisting`**, the pre-apply hash and mode (both `null`
when the path did not exist), and a backup under `.harness/journal.d/` taken *before*
any overwrite. It covers **both phases** and the directories created, in creation
order (F1 US-13).

The invariant: **rollback deletes only paths this apply created, restores only paths
this apply overwrote, and acts on neither unless the on-disk bytes are still exactly
what this apply wrote.** Five exhaustive cases; a user who edited a file after the
crash keeps their edit and is told (`W-ROLLBACK-KEPT`).

`preExisting` is determined by `collisionKey`, not by exact string, and that is a
rollback-safety requirement rather than tidiness (N-5): on macOS and Windows a project
holding `.claude/Settings.json` and a step writing `.claude/settings.json` are the
**same file**, and under exact-string comparison the journal would record
`preExisting: false` and `--rollback` would then **delete a user file it did not
create**.

### `payloadDigest` — checked first, fail-closed

`verify` recomputes the tree digest over `.harness/pack/` and compares it to the
manifest **before it renders anything**. A mismatch is `E-PAYLOAD-DIGEST-MISMATCH`,
exit 2, and **the tree comparison is suppressed entirely** — no path recomputed, empty
per-path report. The reason is not convenience: the expectation is computed *from* the
payload, so once the payload is untrusted the recomputation is meaningless and
reporting it would dress an untrustworthy answer as a result (F1 US-33, §F1.8). There
is no "digest absent, so skip the check" branch — that branch is the one anybody
defeating the check would take.

Two drifts, two codes, two exit classes: the payload moved (`E-PAYLOAD-DIGEST-MISMATCH`,
exit 2) or the applied tree moved (`E-VERIFY-MISMATCH`, exit 1). That is what Q-52
buys — `verify` can say **which side moved**.

### What this path does not guarantee — stated, not implied

1. **Reserved-destination class 2 is a denylist, and a denylist is incomplete by
   construction.** It closes the routes this design has identified, each with a named
   rule and an adversarial fixture in CI. It is **not** a proof that no other
   destination on a user's machine is executed by some toolchain. The evidence that
   the gap is real rather than theoretical: `.mcp.json` — which declares MCP servers
   as command lines the runtime launches, and is the sibling of
   `.claude/settings.json` — was absent from the entire spec set until the fourth
   security round, one `copy` away (C-41).
2. **The digest does not bind the manifest to itself.** `payloadDigest` binds the
   payload to the manifest; nothing binds the manifest to itself, so someone who edits
   the payload *and* recomputes the digest defeats the check. That is deliberate work
   rather than an accident, and it is acceptable only because v1.0 never merges
   against the manifest. Separately, the digest is over **normalized** content, so a
   **pure line-ending edit of the payload is undetectable** — the price of not making
   every Windows clone with `core.autocrlf` report a tampered payload on its first
   `verify` (Q-26, Q-52).
3. **The `.claude/` frontmatter rule is pinned against a contract this design does not
   own.** The permission-bearing key names and the non-widening `permissionMode` value
   set belong to the Claude Code runtime and move independently. The two halves fail
   in **opposite directions**: a key the runtime adds after the pin is taken is **not
   caught** and fails silently; an unrecognised *value* is refused loudly. Keeping the
   pin current is a standing maintenance obligation (F1 §F1.9 limit 12, obligation 13),
   not a property of the format.
4. **A pack does place content an agent runtime reads and acts on.** Two of `coding`'s
   ten agents declare `Bash`; `researcher` declares `WebSearch, WebFetch`, the only
   network capability any v1.0 pack ships. None of it is a *grant* — the permission
   engine lives in `.claude/settings.json`, which no pack can write at any `.claude`
   segment — but it is not nothing, and it is **disclosed verbatim** rather than
   claimed away. Note the distinction: §NFR *No network* is a claim about the **CLI**,
   and says nothing about what the runtime does with content the pack placed.

---

## 4. Feature → component map

| Layer | Features | Responsibility |
|---|---|---|
| **Format & contracts** | **F1** (spec v2.5 + ADR-001) | `pack.json`, `recipe.json`, the six primitives, the six-key manifest, the four-stage confinement gate, the journal/rollback contract, the diagnostic taxonomy — and the three read-only commands `validate`, `verify`, `pack info` (Q-53). Modules: `pack/`, `recipe/`, `json/`, `manifest/`, `hash/`, `payload/`, `security/`, `verify/`, `validate/`, `diag/`, `fs/`, plus `apply/plan.ts` |
| **Apply engine** | **F2** — **no feature spec** | `lintel-harness init`: the CLI surface, interactive prompting, and driving `apply/plan.ts` → `apply/execute.ts` → `apply/rollback.ts`. F1 pins the phases, primitive semantics, ordering and atomicity; F2 implements them and may not reinterpret them. There is deliberately **no `src/cli/commands/init.ts` in F1's plan** |
| **Pack content** | **F5** (spec v2.4) | The three packs and their recipes: `coding` (migrating), `writing` (to extract), `planning` (to author); the nine-part anatomy declarations, the three scaffolds, the Q-46 prose stripping, the two pack-local copies of the targets contract (Q-49). F1 ships no pack; `validate --all --strict` is what binds them |
| **Judgment layer** | **F6** — **no feature spec** | The thin Claude Code skill: derive parameter answers from what the repo actually is, adapt the generated `CLAUDE.md`'s project-owned prose around the inert anchors, redraw file-ownership tables, fill `copy/tone-of-voice.md`. It wraps `init` and **only** `init`; it is the only feature that can be cut without breaking the release gate |
| **Deferred** | **F3, F4** — v1.1 | `update` (drift + 3-way merge) and `status` / `contribute`. Both numbers are **reserved and will not be reused**. v1.0's forward investment for them is exactly three things and nothing else: inert region anchors, the minimal manifest, and `payloadDigest` |

**What is unwritten, named so the absence is not read as an oversight:** F2 and F6 have
**no feature spec, no ADR and no epics-and-tasks**; F5 has a spec but **no ADR**; no
feature has an epics-and-tasks document; and `technology-choices.md`, this document's
stated companion, does not exist. The master spec records all of this under
*Spec-set readiness*, which states plainly that **this set is not
implementation-ready**.

---

## 5. Key technology decisions (as of v1.0)

Each row cites the question that settled it. Full rationale lives in
`project-brief.md` §12; the *reason* column is the short form of why, not a restatement
of the decision.

| Concern | Choice | Why | Source |
|---|---|---|---|
| Execution split | Node/TypeScript CLI for the deterministic mechanics + a **thin** Claude Code skill for judgment; CLI built first | Determinism cannot be delegated to an agent — hashing, planning and comparison must be computed facts or "applied correctly every time" varies run to run. But applying a pack is not purely mechanical, and a CLI could only stub the judgment out. Split on that seam, and build the wrapper last so it is written once | **Q-1** |
| Pack distribution | `packs/` in this repo, bundled into the published package. No registry, no fetch | One maintainer, three packs: a monorepo makes a CLI feature and the pack change that needs it one atomic commit and one release, and removes the CLI↔pack compatibility problem entirely. `npx` then needs no network | **Q-2** |
| Versioning | Per-pack semver + `minCliVersion`, plus a separate CLI semver; the manifest records both | Lets `update` be precise later ("you applied `coding@1.0.0`, latest is `1.4.0`") and keeps a writing-only project from being told it is stale because the coding pack moved. A rolling unversioned CLI was rejected: a behaviour change could silently reinterpret an old manifest with no version to pin it against | **Q-3** |
| Apply model | **Two phases** — verbatim payload copy to `.harness/pack/`, then a pack-specific application | It matches what the manual apply actually was: a dumb copy, then a tie-up. The single-phase model treated the second half as awkward exceptions to the first. Splitting makes the generic half generic and the varying half explicitly per-pack | **Q-39** |
| Phase 2 form | A **declarative recipe** over six primitives, run by the CLI, never by the user | A script makes a pack code that executes on the user's machine, which voids confinement and the denylist — both depend on the plan being inspectable *before* anything runs. A recipe keeps per-pack variation while staying validatable | **Q-40**, narrowed by **Q-54** |
| Phase 2's input | `.harness/pack/` is authoritative (never the bundle) — but rendered **entirely at plan time**; the executor reads nothing from disk | Q-41 fixes *which tree is authoritative*, not *the moment of the read*. An execute-time read would be an environment read (Q-40 forbids), would open a window in which the payload could change after `payloadDigest` was computed, and would falsify Q-41's own recorded consequence that the user cannot adjust the payload between phases | **Q-41** as clarified by C-23 / `F1-ADR-001` §3.6 |
| Manifest | **Six keys**: `manifestVersion`, `cli`, `pack`, `payloadDigest`, `parameters`, `scaffolds`. No file list, no `.harness/base/`, no timestamp, no self-hash | With the payload local and the render deterministic, the applied state is **recomputable**, so a hash list and a cached base are both redundant. Omitting a timestamp is what makes "byte-identical trees" true of the whole project rather than of everything except one file — version control already records when | **Q-43** (supersedes Q-18, Q-19) |
| Payload integrity | One SHA-256 **tree digest** over `.harness/pack/`, top-level between `pack` and `parameters`, over **normalized** content | Recomputation otherwise silently *trusts* the payload: edit `.harness/pack/`, and `verify` reports the project clean because the recipe faithfully reproduces the edited input. One hash over one tree is the smallest closure of that gap, and it is what lets `verify` say which side moved. Top-level because `pack` records what the pack *declared* and the digest records what this apply *observed* | **Q-52** (amends Q-43) |
| Marked regions | **None.** The generated `CLAUDE.md` carries **inert** anchors; nothing parses them | Regions had two justifications and both were removed: `update` was their consumer, and the source-only/applied-only problem dissolved once phase 1 copies verbatim. Anchors are near-free now and expensive to retrofit, so they ship as forward investment and nothing more | **Q-45** (amends Q-7, Q-10) |
| Pack cardinality | **Exactly one pack per project.** The manifest has one `pack` object, not a list | Removes the file-collision and ownership-arbitration class of problems rather than solving it. Two ways of working means two projects side by side. This is the single assumption most likely to be "helpfully" relaxed later, and relaxing it reopens everything Q-12 closed | **Q-12** |
| Settings & permissions | `merge-json` **dropped**; nothing writes `.claude/settings.json`, and that is a *checked* rule rather than a fact about three packs | Once F5's three settings steps were established as invalid recipes, the primitive had **no v1.0 consumer** while carrying the format's largest attack surface — it was the target of both CRITICALs of the second security round. Deleting the surface is a stronger fix than repairing it. Bonus: it was the only primitive taking a fourth input, so determinism and the recomputation identity become true *without exception*. **R5's "sensible default permissions" waits for v1.1** | **Q-54** (supersedes Q-23) |
| Empty directories | **Every folder an apply creates carries a README** (`README.md`; `index.md` for `writing`), `.claude/` and `.harness/` excluded as tool-owned | It dissolves the empty-directory problem instead of solving it: git cannot commit an empty directory, so any answer needed placeholder files — Q-50 makes those files *say something*. Consequence for the format: no `mkdir` primitive, no eighth primitive, no `skeleton/` tree, no `.gitkeep` | **Q-50** |

> **Pending sign-off:** none of the rows above. What is outstanding is *work*, not
> decisions — `technology-choices.md` is unwritten, so no per-component reasoning
> exists for it to hold, and the F2/F6 specs that would consume several of these rows
> do not exist either. See §6 and the master spec's *Spec-set readiness*.

---

## 6. The state of the design — read this before treating the set as cleared

Three facts a reader needs before the feature specs, none of them flattering.

**1. The security gate is closed by decision, not by a verdict.** **No
`SECURITY-PROCEED` exists against any revision of F1, F5 or ADR-001, and none is
claimed.** ADR-001 §10's `PROCEED` is an *architectural* verdict and explicitly says it
must not be read as a security clearance. Four Mode A rounds ran:

| Round | Against | Result |
|---|---|---|
| 1 | F1 v1.0 | `REVISE-SPEC` — 2 CRITICAL, 4 HIGH · C-1…C-18 |
| 2 | F1 v2.2 | `REVISE-SPEC` — 2 CRITICAL, 3 HIGH · **six conditions found lapsed** · C-19…C-30 |
| 3 | F1 v2.3 | `REVISE-SPEC` — **0 CRITICAL**, 2 HIGH · 24/31 holding · C-31…C-38 |
| 4 | F1 v2.4 | `REVISE-SPEC` — **0 CRITICAL**, 3 HIGH · **36/38 holding** · C-39…C-48 |

The standing verdict of record is `REVISE-SPEC`. What the decision rests on is the
**trajectory** and the honest observation that every round-3 and round-4 finding
concerned the membership or the quantifier of a **denylist** — so there is no round at
which a reviewer runs out of destinations to name. The two structural defects round 4
found (a rule that did not reach phase 1; a pin narrower than the property it
implemented) are closed; what remains is enumeration. Two process controls now stand
behind that judgement, and both were added because a green disposition table twice
failed to detect a lapse: a `SATISFIED` disposition must cite **the mechanism and its
quantifier**, never a section number; and every closed attack gets an **adversarial
fixture pack** in CI, asserted on the exact code and exit class.

**2. `§F1.9`'s known limits and v1.1 obligations are part of the contract, not
commentary.** Fifteen known limits and sixteen v1.1 obligations are written out there,
and **C-47 plus the remaining LOW residue are *accepted* for v1.0** — accepted with
their requirements and tests recorded, which is a commitment to build them, not a
decision to forget them. The sharpest limits to know before reading anything else: an
answer cannot be changed after apply (Q-21), a pack cannot contribute project settings
or ask for a permission by any of four doors, content cannot vary *within* a file by
answer, and a pack cannot edit a JSON file the project already has.

**3. Pack content lags the spec, materially.** The specs describe `packs/coding/` as it
will be, not as it is. Today, on disk:

| Spec says | Repo has |
|---|---|
| `packs/coding/pack.json` | **Absent** — new authoring |
| `packs/coding/recipe.json` | **Absent** — new authoring, and it is the single thing S7 is blocked on |
| `packs/coding/commands/target.md` | **Absent** — `/target` still lives in this repo's `.claude/commands/` |
| `packs/coding/scaffolds/backend-azure/` | Still `packs/coding/infrastructure/backend-deploy/` |
| **Five** applied paths carrying a `{{harness:` substitution token (F1's C-43 positive assertion) | **One**: `packs/coding/specifications/README.template.md`. `CLAUDE.md.template`, `agent-teams/Specify.md`, `agent-teams/Implement.md` and `project-brief.template.md` carry none yet |
| `.harness/pack/` and `.harness/manifest.json` in this repo | **Absent** — so **S7 is unmet**, and this repo is not yet produced by the tool it specifies |

`applied-readmes/` **does** exist with exactly its five files, and the ten agents exist
with the `permissionMode: readonly` frontmatter F1's positive assertion now requires.
The gap closes in one step — author `recipe.json`, then apply `coding` to this repo —
and that step is the release gate.

---

## Change history

| Version | Date | Author | Change |
|---|---|---|---|
| v1.0 | 2026-08-31 | architect | Initial version. First document to describe the whole system after Q-39's two-phase rewrite; records the principles, the container shape, the `validate → plan → journal → write` trust path with its stated limits, the feature→component map including what is unwritten, and the twelve load-bearing technology decisions with their originating question ids. |
