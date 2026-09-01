# Epics & Tasks: the Claude Code skill (Lintel Harness v1.0 — Feature 6)
**Version:** 1.1
**Status:** Draft
**Date:** 2026-09-01
**References:** `F6-spec-claude-code-skill.md` **v1.1** (US-79…US-98) · `F6-ADR-005-claude-code-skill.md` (issued `REVISE SPEC`, **conditions cleared — `PROCEED`**) · `general/interaction-model.md` (IM-1…IM-41) · `F1-spec-pack-format-and-manifest.md` **v3.4** (the disclosure sentinels and their containment check, the six-command surface) · `F2-ADR-003` · `F3-ADR-004`

**Amendment history**

| Version | Date | Summary |
|---|---|---|
| 1.0 | 2026-09-01 | Initial breakdown against `F6-ADR-005`. Claims **E-26…E-27** and **T-2601…T-2708**. |
| 1.1 | 2026-09-01 | **Mode A conditions C-52 and C-56 folded, both by removing a flag.** **`--user` dropped** — it was the only write in the product that deliberately left the project root, and every F1 confinement guarantee is expressed *against* that root, so keeping it meant specifying a whole second confinement root with its own brand, ancestor walk and tests to serve a convenience. **`--force` dropped** — the name is reserved and F1 fixes its meaning for `init`, and an existing installation is now refused unconditionally with `E-TARGET-EXISTS`. **No task added; three rewritten** (T-2606, T-2607, T-2706). The cheapest way to close a finding about a surface is usually to not have the surface. |

---

## Read this before estimating anything

**This feature's deliverable is Markdown, and its power is that it has
none.** The skill runs no code, holds no state, parses no format the CLI
owns and produces no applied bytes. It reads what the CLI printed,
decides what a person would decide, and calls the CLI again.

That makes the task list unlike every other feature's, in two ways that
will otherwise cause trouble:

- **You cannot assert judgment, so do not try.** Whether the skill
  adapted `CLAUDE.md` *well* is not testable and no task below pretends
  otherwise. What **is** testable is the **seam**: that the CLI provides
  everything IM-1…IM-41 require, and that the skill's instructions name
  the right commands, flags and stopping conditions. **E-27 is a suite
  about the CLI's side of the contract**, and that is deliberate.
- **The risk is inversion, not omission.** The danger is not that a
  Markdown file does too little; it is that it slowly becomes a program —
  parsing output, branching on formats, reconstructing what the CLI
  knows. Every task below that adds instruction should be read against
  one question: *does this require the skill to know something it cannot
  be told?*

**The boundary is testable, and here is the rule to apply in review:**
**if a step can be asserted byte-for-byte, it is not the skill's.**

**One task here is not Markdown.** `skill install` is a CLI command that
writes into `.claude/` — it is **F6→F1**, goes through F1's confinement
gate like any other write, and is the surface a security reviewer should
look at first. See E-26's preamble.

---

## Epic overview

| Epic | Title | Stories | Depends on |
|---|---|---|---|
| E-26 | The skill, and the command that installs it | US-79…US-88 | F1 E-02, E-11; F2 E-21 |
| E-27 | The seams — assert the CLI provides what the skill requires | US-89…US-98 | E-26, F2 E-22, F3 E-25 |

---

## E-26 — The skill, and the command that installs it

**`skill install` is the one part of this feature that writes to disk**,
and it writes into `.claude/` — the directory every pack rule in F1
exists to protect. It takes the confinement gate, the reserved-destination
denylist and the journal like any other write. **The product's own
tooling does not get the carve-out C-5 denies to packs**, and a reviewer
should treat an exemption here as a finding rather than a convenience.

**Depends on:** F1 E-02 (confinement), E-11 (atomic write, journal); F2
E-21 (the disclosure sentinels exist to be captured).

- [ ] **T-2601** `[Implementer]` `skill/SKILL.md` — frontmatter plus the
  workflow. **Declares no permission-bearing key**: no `allowed-tools`, no
  `permissionMode`. A pack may not pre-authorise tools for the project it
  is applied to (F1 `E-CLAUDE-TOOL-GRANT`), and the product's own skill
  claiming what it forbids to packs would be indefensible — even though
  the skill is not a pack and no rule mechanically stops it.
  *Depends on: none. Prerequisite for T-2602…T-2605.*

- [ ] **T-2602** `[Implementer]` The version handshake, first in every
  workflow: run `lintel --version`, compare against the range `SKILL.md`
  records, and **report a mismatch rather than adapting to it**. A
  Markdown file cannot introspect its own package, so reporting is the
  only honest option — and adapting would mean the skill guessing at a
  CLI contract it cannot verify.
  *Depends on: T-2601.*

- [ ] **T-2603** `[Implementer]` `skill/reference/init.md` — what `init`'s
  output looks like and what to do with each part. **Capture the
  disclosure between F1 v3.3's two sentinel lines**, reproduce it as a
  contiguous unmodified substring before any commentary (IM-10), and
  **never summarise, reorder or truncate it**. Loaded on demand, not
  inline in `SKILL.md`.
  *Depends on: F2 T-2102, T-2601.*

- [ ] **T-2604** `[Implementer]` `skill/reference/update.md` — the
  reconciliation workflow over `update --json`. For each `kept-edited`
  path: show the user their version and **the pack's version from
  `expectedNew`**, take a decision, write only that path. **The skill
  never renders pack content itself** — `.harness/pack/` holds payload
  source, not rendered output, and reconstructing the render is what IM-5
  forbids.
  *Depends on: F3 T-2504, T-2601.*

- [ ] **T-2605** `[Implementer]` The stopping rules, stated in `SKILL.md`
  where they cannot be missed: **stop on any non-zero exit** (IM-7), never
  retry, never route around a failure, never invent a remedy the CLI did
  not print. **This is what makes `update` exiting 0 with edited paths
  load-bearing** rather than merely convenient — under an exit-1 design
  the skill would stop precisely when IM-31 gives it work.
  *Depends on: T-2601, T-2604.*

- [ ] **T-2606** `[Implementer]` `src/cli/commands/skill.ts` —
  `lintel harness skill install`, copying `skill/` to
  `.claude/skills/lintel/`. **Through the confinement gate and the atomic
  writer**, journalled like any other write. **Project-local only:
  `--user` was dropped at C-52.** It was the one write in the product that
  deliberately left the project root, and every confinement guarantee in
  F1 is expressed *against* that root — so serving a convenience would
  have cost a whole second confinement root with its own brand, ancestor
  walk and tests. **Do not reintroduce it without specifying that root
  first.**
  *Depends on: F1 T-0203, T-1104, T-2601.*

- [ ] **T-2607** `[Implementer]` `skill install`'s failure paths, all
  existing F1 codes and **none new**: an existing installation is refused
  **unconditionally** with `E-TARGET-EXISTS`, whose remedy tells the user
  to remove the directory if they mean to replace it; an unwritable
  destination is `E-WRITE-FAILED`. **No `--force`** (C-56) — the name is
  reserved and F1 fixes its meaning for `init`'s pre-existing-path rule,
  and one flag with one meaning across the whole surface is worth more
  than saving a manual step in a rare operation. Register the sixth
  command in `main.ts` and in `E-CLI-UNKNOWN-COMMAND`'s list.
  *Depends on: F1 T-0106, T-2606.*

---

## E-27 — The seams — assert the CLI provides what the skill requires

**This suite tests the CLI, not the skill.** Every IM requirement the
skill depends on is a claim about what `init` and `update` hand over, and
each is assertable without a model in the loop. If one of these fails,
the skill is unimplementable no matter how well written.

**Depends on:** E-26, F2 E-22, F3 E-25.

- [ ] **T-2701** `[TestWriter]` **IM-10 — the disclosure is capturable.**
  Run `init`, capture stderr, assert the two sentinel lines appear exactly
  once each in order, every US-13 row lies between them, and nothing else
  does. **This requirement was unmeetable from the day it was written**
  until F1 v3.3 — it demanded a contiguous unmodified substring while
  nothing fixed the block's boundaries. The test is what stops it
  regressing to that state.
  *Depends on: F2 T-2203.*

- [ ] **T-2702** `[TestWriter]` **IM-7 and IM-31 — the exit contract.**
  `update` with edited paths outstanding exits **0** and reports them;
  `--dry-run` with an update available exits **1**. Assert both in one
  file with a comment naming **Q-78**, because a future reader will find
  the 0 surprising and the reasoning must arrive before the surprise.
  *Depends on: F3 T-2505.*

- [ ] **T-2703** `[TestWriter]` **IM-33 and Q-77 — the content is
  present.** Every `kept-edited` entry in `update --json` carries
  `expectedNew` with the **rendered** bytes, and those bytes differ from
  the corresponding payload file wherever a `substitute`, `rewrite-path`
  or `generate` step touched the path. **The second half is the real
  assertion**: it is what distinguishes rendered output from payload
  source, and a naive implementation that returns the payload passes the
  first half alone.
  *Depends on: F3 T-2502.*

- [ ] **T-2704** `[TestWriter]` **IM-5 — nothing requires the skill to
  render.** Enumerate every IM requirement that names pack content and
  assert a CLI-provided source for each. A requirement with no CLI source
  is a **finding against the interaction model**, not a task for the
  skill — record it rather than closing the gap with instructions.
  *Depends on: T-2703.*

- [ ] **T-2705** `[TestWriter]` **IM-38 — the surface is six and three of
  them cannot write.** Assert `E-CLI-UNKNOWN-COMMAND` lists six commands,
  and that `validate`, `verify` and `pack info` write nothing — no lock,
  no journal, no path — by recursive comparison after each. **The count
  moved from five and the ratio moved with it**; this test is what stops
  "three of five" coming back.
  *Depends on: T-2607.*

- [ ] **T-2706** `[TestWriter]` **`skill install` is confined.** Assert it
  writes only under `.claude/skills/lintel/`; that the write is journalled
  and rolled back like any other; and that **no destination outside the
  project root is reachable at all**, `--user` having been dropped at
  C-52. **The security-relevant test in this feature** — it is the product
  writing into the directory its own pack rules exist to protect, and
  C-53 now reserves `skills` against **packs** writing there, so this
  command must be demonstrably the only route in.
  *Depends on: T-2606.*

- [ ] **T-2707** `[TestWriter]` The instruction-level checks that can be
  automated without a model: `SKILL.md` declares **no** permission-bearing
  frontmatter key; every command string it names exists in
  `E-CLI-UNKNOWN-COMMAND`'s list; every flag it names is accepted by the
  command it is paired with. Cheap, and it catches the drift that happens
  when a flag is renamed and the prose is not.
  *Depends on: T-2601, T-2607.*

- [ ] **T-2708** `[TestWriter]` The end-to-end rehearsal, **with the
  judgment steps stubbed**: `skill install` → `init` → capture the
  disclosure → `update` on a bumped pack → read `--json` → write one
  reconciled path. Asserts the *sequence and the seams*, never a decision.
  This is as close to testing the skill as is honest, and the stub
  boundary is what keeps it honest.
  *Depends on: T-2701, T-2702, T-2703, T-2706.*

---

## Counters claimed by this document

| Counter | Claimed | Next free |
|---|---|---|
| Epic | **E-26…E-27** | **E-28** |
| Task | **T-2601…T-2708** | **T-2608**, **T-2709** |
| Story | none — F6's are US-79…US-98 | **US-99** |
| Question | none opened; Q-75…Q-78 resolved in `F6-ADR-005`, Q-79 at project level | **Q-84** |
| Error code | **none invented.** `skill install` raises existing F1 codes only | catalogue holds **87** |
