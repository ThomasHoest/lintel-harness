# ADR F6-005 — the Claude Code skill, the judgment layer

**Status:** Draft
**Date:** 2026-09-01
**Decides:** `F6-spec-claude-code-skill.md` (US-79…US-98, Q-75…Q-78; **Q-79 was resolved at project level** and is not re-opened here)
**Reads:** `F1-spec-pack-format-and-manifest.md` **v3.4** (v3.3 was this ADR's condition 1; v3.4 folded the Mode A findings that followed) · `F2-ADR-003` · `F3-ADR-004` · `general/interaction-model.md` (IM-1…IM-41) · `general/technology-choices.md` §9
**Verdict:** **REVISE SPEC**, issued 2026-09-01 — **conditions cleared the same day; see §8.** The standing verdict is **PROCEED**. The revision was small and named; the architecture was never in question.

---

## 1. Decision

**The skill is Markdown, and its power is that it has none.** It runs no
code, holds no state, parses no format the CLI owns, and produces no
applied bytes. It reads what the CLI printed, decides what a person would
decide, and calls the CLI again.

That constraint is the architecture. Every question below is answered by
asking *what does this require the skill to know, and can it know it
without becoming a program?*

Three rules, each of which the spec states and this ADR makes structural.

**1. The skill never renders pack content.** Not a substituted value, not
an anchor, not a file the recipe would produce. If content is needed, the
CLI supplies it — which is why `F3-ADR-004` puts rendered bytes in
`UpdateEntry.expectedNew` rather than pointing at `.harness/pack/`. A
skill that renders is a second, worse implementation of phase 2 with none
of F1's guarantees, and it would drift the moment a primitive changed.

**2. The skill stops on any non-zero exit** (IM-7). It does not
interpret, retry or route around a failure. This is what makes `update`
exiting **0** with edited paths outstanding load-bearing rather than
convenient — see Q-78.

**3. The skill's judgment is confined to prose.** It adapts
`CLAUDE.md`'s project-owned regions, fills the voice guide, and
reconciles edited files conversationally. Everything mechanical belongs
to the CLI, and the boundary is testable: **if a step can be asserted
byte-for-byte, it is not the skill's.**

### File-level plan

| File | Action | Owner | Purpose |
|---|---|---|---|
| `skill/SKILL.md` | **New** | F6 | The skill itself — frontmatter plus the workflow. Ships **inside `@lintel/cli`**, and is copied out by a CLI command (§3.1) |
| `skill/reference/init.md` | **New** | F6 | What `init`'s output looks like and what to do with each part. Loaded on demand, not inline |
| `skill/reference/update.md` | **New** | F6 | The reconciliation workflow over `update --json` |
| `src/cli/commands/skill.ts` | **New** | **F6→F1** | `lintel harness skill install` — copies `skill/` to `.claude/skills/lintel/`. **Project-local only; `--user` was dropped at C-52 (§9).** A sixth command; see §5 |

**No runtime, no dependency, no state file.** The skill has no memory
between invocations beyond what is in the project, which is deliberate:
anything it needed to remember would be a manifest key F1 does not have.

---

## 2. Context

F6 is the only feature whose deliverable is *instructions rather than
code*, and the risk is inverted from every other feature. The danger is
not that it does too little; it is that a Markdown file describing a
workflow slowly acquires the shape of a program — parsing output,
branching on formats, reconstructing what the CLI knows.

`interaction-model.md`'s forty-one requirements exist to hold that line,
and four of this spec's five questions are **gaps it found in documents it
depends on** rather than choices it was deferring. That distinction
matters for reading §4: the skill did not fail to decide these; it
discovered that nobody had.

---

## 3. Options considered

### 3.1 How the skill is distributed — **chosen: shipped in the package, installed by a command** (Q-75)

**Chosen.** `skill/` ships inside `@lintel/cli`. A new command,
`lintel harness skill install [--user]`, copies it into
`.claude/skills/lintel/` (project) or the user profile.

**Why a command and not documentation.** The alternative is telling users
to copy a folder out of `node_modules`, which is the hand-application this
whole product exists to replace. Shipping the skill and then asking for a
manual copy would be the harness failing its own thesis in its own repo.

**Why not a separate package.** Two packages version independently, and
the skill's entire correctness depends on matching the CLI it drives —
Q-75's second half. One package, one version, and the skill can state the
CLI version it expects because they ship together.

**How a session knows which CLI it is talking to.** The skill's first
action in any workflow is `lintel --version`, and `SKILL.md` records the
version range it was written against. **A mismatch is reported to the
user, not worked around.** This is cheap, and it is the only mechanism
available: a Markdown file cannot introspect its own package.

**Cost, stated:** the sixth command is real surface. `interaction-model.md`
§11 enumerated five when this was written and enumerates six now — §5
listed the fold and §8 records it done.

### 3.2 Locating `init`'s disclosure block — **chosen: sentinel lines from the CLI** (Q-76)

IM-10 requires the skill to reproduce *"the CLI's disclosure block"* as a
contiguous unmodified substring. F1 US-13 fixes the block's **rows**, not
its **delimiters**; `init` has no `--json` (IM-22).

**Chosen.** `init` emits two fixed sentinel lines around the disclosure on
stderr — an opening and closing marker, stable text, no version, no
count. The skill captures between them verbatim.

**Rejected: give `init` a `--json`.** It would answer Q-76 and cost far
more: a second output contract for a command whose output is otherwise
prose, and a schema to version. IM-22 says `init` has none at v1.0, and
`F2-ADR-003` §7 explicitly declined to pre-empt this. **Two sentinel
lines are the smallest thing that discharges IM-10.**

**Rejected: match on the block's first and last row text.** That makes the
skill's capture depend on message wording F1 is free to change, which is
the string-matching §Error States forbids for codes and which is no
better here.

**✅ This asked F1 for two lines of output it did not specify. F1 v3.3
specifies them** — `--- lintel disclosure begin ---` and
`--- lintel disclosure end ---`, on stderr, fixed and versionless. See
§5 and §8.

### 3.3 Whether `update`'s report carries new content — **decided in `F3-ADR-004`** (Q-77)

Yes: `UpdateEntry.expectedNew` carries rendered bytes. Recorded here from
the consumer's side, because the requirement is F6's and the capability is
F3's. Rule 1 above is why it could not be otherwise — reading
`.harness/pack/` gives payload source, not rendered output, and the skill
rendering it itself is what IM-5 forbids.

### 3.4 The exit code when edited paths remain — **decided jointly with `F3-ADR-004`** (Q-78)

`update` exits **0**. The reasoning is in `F3-ADR-004` §3.1 and is not
repeated; what belongs here is the consequence for this feature:
**IM-7 and IM-31 stop contradicting.** Under an exit-1 design the skill
would halt precisely when it had work to do, and the conversational
reconciliation Q-62 created F3 for would never run. The gating signal
lives on `--dry-run`, which exits 1 when an update is available.

---

## 4. The reserved questions, resolved

| # | Resolution |
|---|---|
| **Q-75** | **Ships in `@lintel/cli`; installed by `lintel harness skill install [--user]`.** Version agreement is by co-release, and the skill checks `lintel --version` first and reports a mismatch rather than adapting to it. §3.1. |
| **Q-76** | **Two fixed sentinel lines around the disclosure**, emitted by `init` on stderr. Not `--json`, not row-text matching. §3.2. **The F1 amendment it required landed as v3.3** (§8). |
| **Q-77** | **Yes — rendered bytes, not a diff**, in `UpdateEntry.expectedNew`. Decided in `F3-ADR-004` §3.2. |
| **Q-78** | **`update` exits 0** with edited paths outstanding; `--dry-run` exits 1 when an update is available. Decided in `F3-ADR-004` §3.1. |
| **Q-79** | **Not F6's any more.** It was in this block and was **resolved at project level on 2026-09-01** as `fillExpected` plus two `verify` states. F5 declares four fill-expected paths; F6 fills the voice guide and the user fills the briefs. The id keeps its number and is recorded in brief §12. |

---

## 5. Conflicts flagged

**Three, and two of them are why this verdict is `REVISE SPEC`.**

**(1) The command surface becomes six, not five.** `skill install` is a
new command. `interaction-model.md` §11 enumerates **five** and IM-38
asserts *three of five cannot write* — a claim that goes false the moment
a sixth arrives, and it goes false **silently**, which is the shape the
fold-check rule exists to catch. **`skill install` writes**, so the
correct restatement is *three of six cannot write*. F1's
`E-CLI-UNKNOWN-COMMAND` message lists five commands and must list six.

**(2) `init` must emit the disclosure sentinels.** F1 US-13 specifies the
disclosure's rows and not its delimiters. Q-76's answer needs two fixed
lines, and **F1 owns `init`'s output contract**. Until F1 states them,
IM-10 is unmeetable — it has been unmeetable since it was written, which
is what Q-76 found.

**(3) F6's spec assumes five commands throughout.** Its §Technical
Context and its coverage table both count against the five-command
surface. Both need the same fold as (1).

**Not a conflict:** F6's dependence on `update --json` is satisfied by
`F3-ADR-004`'s contract, and its dependence on `fillExpected` by F5 v3.1.

---

## 6. Consequences

- **The sixth command changes three documents**, none of them F6's own:
  F1's catalogue message, `interaction-model.md` §11 and IM-38, and F1's
  known-limit 16 note about unknown groups. Cheap, but it must be one
  pass — this project has three recorded instances of a count going stale
  because a fold stopped at the feature spec.
- **`skill install` is F6→F1 in the file plan**, not F6-only. It is a CLI
  command that writes to `.claude/`, so it is subject to F1's confinement
  gate and reserved-destination rules like any other write. **A skill
  installer that bypassed the gate would be the product's own tooling
  exempting itself**, which is exactly the shape C-5 forbids to packs.
- **The skill is testable only at the seams.** Its judgment cannot be
  asserted; its *inputs and calls* can. F6's acceptance tests should
  assert that the CLI provides everything IM-1…IM-41 require — sentinels
  present, `expectedNew` populated, exit 0 with edited paths — rather
  than trying to assert what a model does with them.
- **Nothing here needs a runtime**, and that survives Q-81's zero-
  dependency posture without a special case, because the skill adds no
  dependency of any kind.

---

## 7. Verdict as issued

**REVISE SPEC.**

The architecture is sound and the four open questions are answerable —
they are answered above. The verdict is not about the design; it is that
**two of those answers require changes outside this feature, and the spec
is written against a surface that will not exist.**

**Required before `PROCEED`:**

1. **F1 specifies the two disclosure sentinel lines** in US-13. Without
   them Q-76's answer is a plan rather than a contract, and IM-10 stays
   unmeetable.
2. **The command surface folds to six**, in one pass: F1's
   `E-CLI-UNKNOWN-COMMAND` message, `interaction-model.md` §11 and IM-38's
   *three of five*, and F6's own §Technical Context and coverage table.
3. **F6's spec restates the Q-79 row** as resolved-elsewhere rather than
   open, so its Open Questions section does not disagree with brief §12.

**Explicitly not required:** giving `init` a `--json`. It would answer
Q-76 more generally and cost a second output contract for a command whose
output is otherwise prose. Two sentinel lines are the smallest thing that
works, and smallest is the right criterion for an interface whose only
consumer is a Markdown file.

**A note for whoever re-reviews.** This feature has never had a **Mode A
security pass**, and neither have F2 and F3. F1's four rounds do not
cover them. The surface worth a reviewer's attention here is
`skill install` — a command that writes into `.claude/`, which is the
directory every pack rule in F1 exists to protect.

---

## 8. Conditions cleared — 2026-09-01

All three conditions of §7 were met in the same pass that issued this
ADR. **The verdict moves to `PROCEED`.** Recorded rather than
back-edited, because a verdict that quietly changes its own text is worth
less than one that shows what it required.

| Condition | How it was met |
|---|---|
| **1 — F1 specifies the sentinel lines** | **F1 v3.3.** US-13 gains `--- lintel disclosure begin ---` / `--- lintel disclosure end ---` on stderr, **fixed, versionless and countless**, with the rows between them and nothing else. A test asserts both appear exactly once, in order. **IM-10 is meetable for the first time.** |
| **2 — the surface folds to six, in one pass** | Nine sites across seven documents, in one commit: F1's `E-CLI-UNKNOWN-COMMAND` message and §Technical Context row (v3.3), `interaction-model.md` §11's table and **IM-38** (*three of five* → *three of six*), the master spec's surface row, F3's two message references, F1's epics, and this spec's coverage table. |
| **3 — F6 restates the Q-79 row** | **F6 v1.1.** All five questions move to Resolved Decisions with their rationale, Q-79 marked resolved-at-project-level so §Open Questions no longer disagrees with brief §12. |

**What the fold changed that was not on the list**, and is the reason
condition 2 said *in one pass*: **IM-38's ratio moved, not just its
count.** The writing set went two → three while the read-only set stayed
at three. A reader carrying "three of five" forward would have kept a
true-sounding sentence about a surface that no longer exists — the exact
failure mode `CLAUDE.md`'s fold-check rule names, and the third time this
project has hit it. `interaction-model.md` now says so explicitly rather
than leaving the arithmetic to the reader.

**Unchanged by this section.** The §5 conflicts are resolved, not
withdrawn. **The note at the end of §7 stands**: this feature has still
never had a **Mode A security pass**, and `skill install` — a command
that writes into `.claude/`, the directory every pack rule in F1 exists
to protect — is the surface most worth a reviewer's attention. Clearing
an architectural verdict is not clearing a security gate.

---

## 9. Mode A conditions folded — 2026-09-01

Two conditions are F6's, and **both are closed by removing a flag rather
than by adding machinery.** That is the cheaper and the more defensible
answer in each case, and it is worth naming as a pattern: the least
expensive way to close a finding about a surface is usually to not have
the surface.

### C-52 (HIGH) — `--user` is dropped

`--user` wrote to the user profile, making `skill install` **the only
write in the product that deliberately leaves the project root**. Every
confinement guarantee in F1 is expressed *against* that root, so `--user`
was the one destination no existing rule covered — and the review found
its confinement stated only in a task instruction (`T-2606`), which is
not where a boundary belongs.

**The options were: specify a second confinement root — resolved,
`lstat`ed at every ancestor, no symlink followed, a branded path type that
is its only constructor — or drop the flag.**

**Dropped.** A project-local install is sufficient at v1.0: the skill
drives `init` and `update`, both of which operate on a project, so a
per-project skill is the normal case and a profile-wide one is a
convenience. **Adding a whole second confinement root — with its own
brand, its own ancestor walk and its own tests — to serve a convenience
is exactly the speculation Q-42 and Q-48 were right to refuse**, and it
would double the surface of the one command in this feature that writes.

**Reopening it is a v1.1 question with a stated price:** the second root
and its brand, specified before the flag returns, not after.

### C-56 (LOW) — `--force` is dropped

`F6-epics` T-2607 had an existing installation *"refused rather than
overwritten unless `--force`"*. **`--force` is a reserved CLI flag whose
meaning F1 fixes for `init`** — the pre-existing-path rule of US-13 —
and reusing the name for different behaviour on a different command,
specified in a task and in no specification, is how a flag acquires two
meanings and a user acquires a wrong expectation.

**Dropped. `skill install` refuses an existing installation
unconditionally**, with `E-TARGET-EXISTS` and a remedy telling the user to
remove the directory if they mean to replace it. Re-installing is rare,
the manual step is one command, and **one flag with one meaning across the
whole surface** is worth more than saving it.

---

## 10. Mode A round 2 — C-57's F6 half, 2026-09-01

**The skill states the sentinel rule identically to the CLI, and may not
relax it alone.** Round 2 found that v3.4's *"scanned for either sentinel
line"* left the comparison unspecified, so the emitter's refusal and the
consumer's recognition could disagree — a marker with one trailing space
missed by an exact check and matched by any consumer that trims.

**`skill/reference/init.md` states the same normalization F1 v3.5
states**: a line ends the block if, after removing C0 control characters,
trimming ASCII whitespace and ASCII-case-folding, it equals the end
marker. **Not "the line equals the marker"**, which is what an
implementer writes by default and what makes the two sides diverge.

**Why this is stated in both places rather than referenced from one.**
The skill is Markdown read by a model, not code importing a constant —
it cannot share an implementation, so the only way the rule holds on both
sides is that both sides say it. **The cost is a duplicated rule that can
drift**, and that is accepted with its mitigation named: **T-2707 already
checks the skill's instructions against the CLI's surface**, and this
rule joins what it checks.
