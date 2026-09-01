# F6 — The Claude Code Skill Specification — Lintel Harness v1.0
**Version:** 1.0
**Status:** Draft
**Date:** 2026-09-01
**Platform:** **Markdown under `.claude/skills/`, and nothing else** — no runtime, no build, no package, no dependency and no tests of its own (`general/technology-choices.md` §9). It ships in `@lintel/cli` with the binary it drives (`lintel`, command group `harness` — Q-63). The surfaces it acts on are a conversation and a filesystem.
**Design spec:** n/a (no UI). `general/interaction-model.md` states, as `IM-n` requirements, what would elsewhere be design decisions — what is shown, in what order, verbatim or summarised.
**ADR:** `F6-ADR-NNN-claude-code-skill.md` — not written; filled in by the architect after this spec is reviewed.
**References:** `specifications/general/interaction-model.md` **v1.1 — authoritative for every `IM-n` cited here** · `specifications/general/technology-choices.md` §9 · `specifications/general/system-architecture.md` §4 · `specifications/general/pack-inventory.md` · `specifications/project-brief.md` §12 (**Q-1**, **Q-53**, **Q-54**, **Q-56**, **Q-57**, **Q-60**, **Q-62**, **Q-63**) · `specifications/v1.0/LintelHarnessSpecification-1.0.md` §F6 · `specifications/v1.0/F1-spec-pack-format-and-manifest.md` **v2.9** (US-13, US-29, US-31, US-33, §Error States, §F1.6, §F1.8) · `specifications/v1.0/F5-spec-template-packs.md` **v2.9** · the three bundled packs on disk

**Amendment history**

| Version | Date | Summary |
|---|---|---|
| 1.0 | 2026-09-01 | Initial draft, written against **Q-57** (the conversational path is primary) and **Q-62** (`update` ships, and the skill reconciles the edited paths). Turns `general/interaction-model.md`'s cross-cutting requirements into feature-level acceptance criteria for a component with no runtime: twenty stories, **US-79…US-98**, each criterion tagged by the kind of check that can verify it. Fixes the faithful-relay rule as a **byte containment** obligation over `init`'s whole captured output (§6.2), and the post-`update` reconciliation as a **decision-provenance** obligation (§6.3). Records five questions, **Q-75…Q-79**, four of which are gaps this spec found in documents it depends on rather than choices it is deferring. |

---

## Introduction

**F6 is the thin Claude Code skill that drives the CLI.** Q-1 split the
product on one seam — deterministic mechanics in the CLI, judgment in the
skill — and Q-57 made the conversational path **primary**, with the CLI
still fully usable standalone. This feature is that path's whole
implementation: a person opens Claude Code in a project directory, asks
for the project to be set up, and gets an applied, adapted project
without typing a command. Later, they ask for it to be brought up to
date, and get an `update` plus the conversation the CLI deliberately
stops for.

**It is Markdown with no runtime of its own, and that is the shape rather
than a limitation to work around.** Everything the skill does, it does by
invoking the CLI and by reading and writing files a human could read and
write. It holds no state, declares no version, parses nothing, and knows
nothing about a pack that `lintel harness pack info` could not tell it.
The two consequences that organise this document: **it has no place to
hide a re-implementation** (IM-5 is enforceable by looking at the tree it
produced), and **it has no place to hide a violation either** — the
faithful-relay rule fails silently (IM-11), so this spec has to say how
each obligation is checked, not only what it is.

**This spec does not restate the interaction model; it cites it.**
`general/interaction-model.md` already carries ~41 numbered requirements
covering the two entry points, the seam, the disclosure, success and
failure, notices versus defects, `verify`'s `adapted` state, the
unfilled-brief rule and §11's command surface. Much of F6 is specified
there. What was missing is a *feature*-level statement of the skill's
observable behaviour with criteria someone could actually check, and
that is what this document adds. **Where this document and
`interaction-model.md` disagree, the interaction model wins** and the
disagreement is a defect here. §7 carries a coverage table mapping every
`IM-n` to the story that discharges it.

**Two requirements matter more than the rest, and the rest of the
document is arranged around them.** The first is the **faithful relay of
`init`'s pre-write disclosure** (IM-10, IM-11): the consent gate went
with `merge-json` (Q-54) and no v1.0 pack owns a security-relevant key,
so the disclosure gates nothing — the only remaining mechanism is that
the text reaches a human, and on the conversational path the only copy
the user ever sees is the one the skill chose to show. The second is the
**reconciliation after `update`** (Q-62, IM-31…IM-34): the CLI replaces
unedited paths, stops at edited ones and reports them, and the skill
walks the user through those without silently picking a side. They are
the same discipline one command apart — *show what the tool produced,
do not stand in for it* — and both are stories where a plausible,
accurate, helpful-sounding session is a violation.

### What is in scope

- **The conversational setup path end to end**: gathering intent from the
  repository and the user, choosing the pack and scaffolds **against
  `lintel harness pack info`** (IM-12), invoking `lintel harness init`
  non-interactively with every answer supplied by flag (IM-8), relaying
  what came back, and doing the judgment work in the same turn.
- **The faithful relay** of the pre-write disclosure and of every
  diagnostic, count and notice the CLI emits (IM-6, IM-10, IM-20, IM-21).
- **The judgment writes after a successful `init`**: adapting the
  generated `CLAUDE.md`'s project-owned prose around the inert anchors,
  redrawing file-ownership tables against the real tree, and filling the
  pack's tone-of-voice guide where the pack ships one (`coding`,
  `writing`; `planning` ships none — §6.1).
- **The conversational path for keeping a project current**: offering
  `update`'s read-only mode, running `update`, and **reconciling each
  edited path with the user** (Q-62, IM-31…IM-34).
- **The failure behaviour**: what the skill does on each exit class, and
  the zero-bytes guarantee as a property the *user* observes through the
  skill (IM-7, IM-16, IM-18).
- **The prohibitions**, stated as checkable properties of the tree and
  the transcript a session leaves behind (IM-5, §6.5).
- **The unfilled-brief rule as it binds the skill** (IM-26, IM-27,
  IM-28) — the packs already implement it; this spec specifies what
  exists and adds the skill's half.

### What is NOT in scope

Everything the CLI owns is out of scope here and is specified where it
is owned: the seam table in `interaction-model.md` §2 is the boundary and
is not renegotiated. Specifically:

- **Any CLI mechanic** — pack resolution, validation, planning, writing,
  the manifest, exit codes, diagnostic text, rollback, the classification
  of a path as unedited/edited/adapt-expected, or the recomputation of
  `expected_old`/`expected_new` (F1, F2, F3).
- **The three read-only commands as surfaces.** `validate`, `verify` and
  `pack info` are diagnostics a person, CI or the skill may run; the
  skill adds nothing to them but the decision to run one and the relay of
  what came back (IM-3, IM-38). Their output, flags and codes are F1's.
- **A merge engine, a diff algorithm, conflict markers, or any
  three-way anything.** Q-62 declined to build one and this feature does
  not smuggle one in as prose.
- **`contribute`** (F4, v1.1), a second pack in one project (Q-12),
  changing a recorded answer (F1 §F1.9), and re-running `init` to pick up
  changes (F1 US-14). The skill declines each, and §US-98 is that story.
- **Pack authoring and pack content** (F5). The skill never edits
  `packs/` in the harness repo on a user's behalf as a substitute for a
  command that does not exist.
- **How the skill is installed and discovered** by Claude Code, and
  whether it is a plugin — **Q-75**, downstream of Q-64's packaging
  question.
- **Telemetry, analytics, or any transmission of project content
  anywhere.** There is none, and §NFR *Privacy* states it as a
  requirement rather than an assumption.

---

## Technical Context

Only settled decisions. Anything unsettled is in §Open Questions or in
§6.4, which is the register of what F3 has not decided yet.

| Decision | Choice | Rationale |
|---|---|---|
| The skill's form | **Markdown under `.claude/skills/`**, one directory holding a `SKILL.md` and any reference files it needs, all Markdown | `technology-choices.md` §9. No runtime means no build, no dependency, no version of its own and nothing to keep in sync but words |
| Its identifier | **`lintel-harness`**, fixed here and nowhere else | One name for the one skill; the packaging that carries it is Q-75 |
| What it wraps | **`init` and `update`, and nothing else** | IM-3, Q-1, Q-62 — those are the two commands with judgment work on the far side of them (IM-38) |
| Its coupling to the CLI | The **`init`/`update` argument surface**, the **`E-`/`W-` codes** and the **four exit classes** | Master spec §Feature Dependencies (F6 → F2, F6 → F3). Prose cannot declare a `minCliVersion`, so the coupling is the contract, not a manifest field |
| Versioning | **None of its own.** It ships in the same package and the same release as the CLI it drives, so *"which CLI does this skill expect"* has one answer rather than a compatibility matrix | `technology-choices.md` §9. §NFR *Versioning* states what this costs and what must hold if the skill is ever distributed separately (Q-75) |
| Branching | **On the code and the exit class, never on prose** | IM-6, IM-16, IM-39; F1 §Error States is the only catalogue and the code is the stable contract. A skill that pattern-matched a message would break on a wording fix |
| How it runs `init` | **Non-interactively**, every required answer supplied by `--set <id>=<value>` or a pack-declared `flag` alias, every scaffold by `--scaffold` | IM-8, IM-2. Intent-gathering happens in the conversation *before* the invocation, never by answering a prompt mid-run |
| How it relays the disclosure | **Byte containment of the whole captured output**, wrapped at most in a fence, before any commentary and before any write | IM-10, IM-11; §6.2. Relaying the whole capture rather than an extracted block is what makes the test possible without a delimiter the CLI does not define (Q-76) |
| What it may write after `init` | The generated `CLAUDE.md`, the pack's voice guide where one ships, and content the user asked for | IM-9, and the seam table's *Skill* rows |
| What it may write after `update` | **Only** the paths the CLI reported as edited or adapt-expected, and only as the user decided | IM-9, IM-34 |
| Where it may never write | **Anywhere under `.harness/`**, and any applied path a recipe step would have produced | IM-5. §6.5 states the check |
| What a failing run does to it | **Stops it.** No writes, no judgment work, relay the diagnostic | IM-7, and it is what makes IM-18's zero bytes a property the *user* observes |

---

## Goals

Each is yes/no at the end of the feature work. `(S)`, `(P)` and `(T)`
name the kind of check — see §*How a component with no runtime states
acceptance criteria*, immediately below §Out of Scope.

- **G6.1** — A person who has never run the CLI can obtain an applied and
  adapted project by asking for one, in a single session, for each of the
  three bundled packs. `(S)(P)`
- **G6.2** — In every session that runs `init`, the CLI's output appears
  in the transcript as a **contiguous, unmodified substring**, including
  the runs where the user asked for brevity. `(S)`
- **G6.3** — No session produces a byte written by the skill that a
  recipe step would have produced, and no session writes anything under
  `.harness/`. `(P)`
- **G6.4** — Every applied path the skill wrote during a reconciliation
  is traceable to a user message that named the outcome for that path.
  `(S)(P)`
- **G6.5** — After a session in which the CLI exited non-zero before the
  gate, the directory is byte-for-byte what it was before the session.
  `(P)`
- **G6.6** — Every fault the skill reports names its `E-`/`W-` code, and
  no session reports a fault by prose alone. `(S)`
- **G6.7** — The standalone CLI path is unaffected: no capability, flag
  or behaviour is reachable only through the skill, and every session's
  CLI invocations are ones a user could have typed. `(S)`
- **G6.8** — After a full conversational setup, `lintel harness verify`
  exits `0` with `CLAUDE.md` reported `adapted` and no path reported
  `differs` — **subject to Q-79**, which is the finding that this goal
  is not currently reachable for a pack whose voice guide the skill
  fills. `(P)`

---

## Out of Scope (this version)

- **A skill that mediates the read-only commands.** It runs them and
  relays them; it does not wrap, summarise, cache or re-render them
  (IM-3, IM-38).
- **Any merge, diff or conflict-marker mechanism** — v1.1 at the
  earliest, and only if Q-62's evidence changes.
- **`contribute` and any simulation of it** (F4, v1.1). IM-36 is
  explicit that the skill will not stand in for the missing command.
- **A version negotiation between the skill and the CLI.** There is none
  at v1.0; the skill ships with the CLI (Q-75).
- **Automated evaluation of a whole session in CI**, if the project has
  no harness able to run one — §NFR *Verifiability* says which criteria
  then fall back to a release-time checklist, and the fallback is
  recorded rather than assumed.
- **Any behaviour that depends on `update`'s flag spelling** — §6.4.

### How a component with no runtime states acceptance criteria

A skill has no code paths, so "acceptance criteria" here are about
observable behaviour in a session and about what the skill's Markdown
instructs. Three kinds of check are used, and **every criterion below is
tagged with the kinds that verify it**:

| Tag | Kind | What it is |
|---|---|---|
| **`(S)`** | **Session check** | A **scripted session**: a fixture project, a fixed sequence of user turns, the real CLI, and assertions over the assistant's messages and the tool calls it made. Assertions are **containment or absence**, never equality with an expected sentence — the skill's own wording varies and is allowed to |
| **`(P)`** | **Project check** | Assertions over the filesystem and over CLI exit codes **after** such a session: what exists, what changed, what `lintel harness verify` says |
| **`(T)`** | **Text check** | Assertions over the skill's own Markdown: a named instruction is present; a forbidden token is absent. The weakest of the three, used only where no session can exercise the rule |

**The one place equality is required is the disclosure**, and it is
stated as containment of the *CLI's* bytes rather than of the skill's
prose (§6.2). That is what makes a non-deterministic component testable
on the requirement that matters: the skill may say anything it likes
around the block, and the block itself is compared byte for byte.

---

## User Stories

F6 holds **US-79…US-98**. The block is **reserved for this feature** and
was allocated ahead of the repository's `US-39` next-free pointer so that
four specs could be written concurrently without collision; ids are never
reused, and F6 opens none outside this block. No story here is retired.

---

**US-79 — Set a project up by asking, not by typing a command**
> As a person starting a project in Claude Code, I want to ask for the
> project to be set up and be asked the right questions, so that I do not
> have to learn a command surface before I can start work.

**Acceptance criteria:**
- A session begun with a plain request in a project directory — "set this
  project up", "apply the coding harness here" — reaches an applied,
  adapted project without the user typing a `lintel` command. `(S)(P)`
- Intent is gathered **from the repository and from the user**, in that
  order of effort: the skill reads what the project actually is before it
  asks, and asks about what it could not determine. It never asks the
  user to restate something visible in the tree. `(S)`
- Every answer the skill proposes is **shown to the user with the
  parameter id it will be supplied under**, and confirmed, before the
  invocation. A proposed answer is a proposal, not a decision. `(S)`
- The skill **does not pre-screen the CLI's checks** (seam table): it
  does not decline to run `init` on the basis of its own inspection of
  the directory. It may report what a read-only command told it and may
  propose a different command, but a refusal is the CLI's to issue.
  `(S)`
- The whole path is available with no agent present, and the session's
  invocations are ones the user could have typed (IM-1, IM-2, G6.7).
  `(S)`

---

**US-80 — Choose the pack against `pack info`, never from memory**
> As someone who does not yet know the three packs, I want the skill to
> show me what each one actually contains, so that a one-time,
> irreversible choice is made against the pack rather than against an
> agent's recollection of it.

**Acceptance criteria:**
- When the user is choosing a pack, or asks what a pack contains, the
  skill **runs `lintel harness pack info <name>`** and answers from its
  output. Describing a pack from memory is a violation even where the
  description is accurate (IM-12). `(S)(T)`
- The skill's own Markdown contains **no enumeration of pack content** —
  no agent names, no file lists, no step counts, no scaffold ids, no
  parameter ids. A text check greps the skill for the bundled packs'
  agent filenames and applied paths and requires **zero** hits. `(T)`
- The skill states, before the choice is made, that **a project holds
  exactly one pack, that there is no way to swap one, and that `update`
  moves a project to a newer version of the pack it already applied and
  is not a route to a different pack** (Q-12, IM-4). `(S)(T)`
- `pack info` writes nothing and needs no applied project, so the skill
  runs it **without asking permission** (IM-38); it does not present
  having run it as having changed anything. `(S)`
- Where the user names a pack directly, the skill still shows the pack's
  identity and its disclosure from `pack info` before invoking `init` —
  the choice may be quick, but it is not made blind. `(S)`

---

**US-81 — Choose scaffolds with the user, as alternatives where the pack says so**
> As someone applying a pack, I want the optional parts explained and
> chosen deliberately, so that I do not discover an infrastructure tree I
> never asked for, or miss one I needed.

**Acceptance criteria:**
- Scaffolds are **opt-in**: with none chosen, none is applied, and the
  skill does not choose one on the user's behalf (F1 US-9, §11.2). `(S)`
- The skill presents the scaffolds **as `pack info` grouped them** —
  same-category scaffolds labelled as **alternatives, not additions**
  (F1 US-13, US-29). It does not offer two members of one category
  together. `(S)`
- Each selection is passed as a separate `--scaffold <id>` flag, spelled
  as `pack info` reported it. `(S)`
- Where the pack declares no scaffold, the skill says so rather than
  inventing an option. `(S)`
- A rejected or unknown id comes back as `E-SCAFFOLD-UNKNOWN` or
  `E-SCAFFOLD-EXCLUSIVE`, exit 1, zero bytes; the skill relays it, re-runs
  `pack info`, and re-asks (§Error States). `(S)(P)`

---

**US-82 — Have my answers treated as public, and never be invited to store a secret**
> As a project owner, I want to know that what I answer is committed to
> my repository, so that I do not put a credential where a repository
> will carry it.

**Acceptance criteria:**
- Before answers are supplied, the skill states that **every answer is
  written verbatim into `.harness/manifest.json`, which is committed, and
  is therefore exactly as public as the repository** (IM-15, F1 US-10).
  `(S)(T)`
- The skill **never invites a secret as an answer** and **never offers to
  "store" one**. A text check requires the skill to contain the
  prohibition; a session check offers it a parameter whose prompt could
  be read as asking for a token and requires the skill to say so rather
  than to solicit one. `(S)(T)`
- Where the CLI raises `W-ANSWER-LOOKS-SECRET`, the skill relays the
  warning verbatim, does not suppress it, and does not proceed to the
  judgment work while restating the answer in the conversation. `(S)`
- Where the CLI refuses a parameter *declaration* that looks like a
  credential (`E-PARAM-SECRET-SUSPECTED`, exit 2), the skill reports it as
  a **pack fault** and not as something the user typed wrong (IM-16).
  `(S)`

---

**US-83 — Drive `init` non-interactively, with every answer up front**
> As a user on the conversational path, I want the apply to run in one
> shot, so that the run is the same run CI would get and nothing is
> answered on my behalf mid-flight.

**Acceptance criteria:**
- The skill invokes **`lintel harness init <pack>`** with **every**
  required parameter supplied by `--set <id>=<value>` or by the
  pack-declared `flag` alias `pack info` reported, and every chosen
  scaffold by `--scaffold` (IM-8, F1 US-8). `(S)`
- The invocation **prompts for nothing**: a session check runs it with no
  TTY and requires the process to exit without reading stdin. `(S)`
- The skill **never answers a CLI prompt on the user's behalf**. A text
  check requires the instruction; a session check with a deliberately
  omitted answer requires `E-PARAM-MISSING`, exit 1, zero bytes — and
  requires the skill to gather the answer in conversation and **re-run**
  rather than to reply to a prompt. `(S)(P)`
- The skill passes **no flag it was not asked to pass**. In particular it
  does not pass `--force` on its own initiative (§Error States), and it
  passes no flag that F1 does not define for the command — a guessed flag
  is `E-CLI-UNKNOWN-FLAG` or `E-FLAG-NOT-PERMITTED`, exit 1, zero bytes
  (IM-41). `(S)(P)`
- `init` has **no `--strict` and no `--json`** (IM-22, §11.2); the skill
  passes neither and does not report their absence as a limitation.
  `(S)(T)`
- The command line the skill ran is **shown to the user**, so a person
  can reproduce the run without the skill (IM-1, G6.7). `(S)`

---

**US-84 — See the pre-write disclosure exactly as the CLI emitted it**
> As the person whose machine is being written to, I want the tool's own
> disclosure, not an agent's account of it, so that what I am told is
> what the tool said.

*This is the feature's load-bearing story. §6.2 states the mechanics; the
criteria here are what a test asserts.*

**Acceptance criteria:**
- **Byte containment.** The text the CLI wrote to the run's captured
  output appears in the session as a **contiguous, unmodified
  substring** — same bytes, same lines, same order, complete (IM-10). A
  session check captures `init`'s output and asserts containment against
  the concatenation of the assistant's messages, after removing **only**
  the code-fence lines the skill may wrap it in. `(S)`
- **An accurate reword fails.** The test is textual, not semantic. A
  relay that is correct in substance but not in bytes is a violation and
  the check must fail on it. A fixture of the five violation shapes
  IM-10 enumerates — a count where the CLI enumerated, an omitted
  disclosure, dropped frontmatter blocks, substituted paths without their
  values, a disclosure produced only on request — is used as the
  negative suite. `(S)`
- **Brevity is not an exemption.** A scripted session in which the user
  says *"keep it short, don't dump walls of text"* must still produce the
  full containment. The skill may add a summary **after** the block; it
  may not replace the block with one. `(S)`
- **Length is not an exemption.** Where the capture is longer than one
  message can carry, it is split at line boundaries across consecutive
  messages, in order, with nothing interleaved; the concatenation of the
  parts is the capture (§6.2 R6). `(S)`
- **Order.** The relay precedes any commentary of the skill's own and
  precedes any judgment write. A session that writes to `CLAUDE.md`
  before relaying is a violation even if it relays afterwards. `(S)`
- **Unconditional.** The relay does not depend on the user asking, on the
  skill's estimate of interest, or on whether a row is non-empty — where
  a list is empty the CLI says so (F1 US-29) and that line is relayed
  with the rest. `(S)(T)`
- **Coverage of the rows that matter.** For `coding` the session check
  additionally asserts the presence of **all ten** `.claude/agents/*.md`
  frontmatter blocks verbatim — including `Bash` on `implementer` and
  `testwriter`, `WebSearch, WebFetch` on `researcher`, and
  `permissionMode: readonly` on `architect`, `reviewer` and
  `securityreviewer` — and **all five** substituted applied paths with
  their **verbatim** values (F1 US-13, US-29, C-40, C-43, C-45). With
  `--scaffold backend-azure` it additionally asserts the **four**
  `0755` paths under `infrastructure/backend-deploy/` (C-38). These are
  true by construction if containment holds; they are asserted anyway so
  the test fails loudly if a future change makes any row optional. `(S)`
- **The skill states, in its own words after the block, that the
  disclosure gates nothing** — nothing pauses, nothing asks, the apply
  has already proceeded, and a user who wants to decide before anything
  lands runs `pack info` first (IM-11, IM-12). `(S)(T)`

---

**US-85 — Ask what a pack or a project actually is, and get the tool's answer**
> As a user with a question mid-session, I want the skill to run the
> read-only command that answers it, so that the answer is the tool's and
> not an agent's impression.

**Acceptance criteria:**
- `validate`, `verify`, `pack info` and `update`'s read-only mode write
  nothing, take no lock and make no network request, so the skill **runs
  any of them without asking** and does not present having run one as
  having changed anything (IM-38, Q-53). `(S)`
- The skill **adds nothing to them but the decision to run one and the
  relay of what came back** (IM-3). It does not re-render, re-order,
  filter or summarise their output in place of relaying it (IM-6). `(S)`
- Asked *"what does this pack contain"*, the skill runs `pack info`
  (US-80). Asked *"is this project still correct"*, it runs `verify`.
  Asked *"is there a newer pack version"*, it runs `update`'s read-only
  mode (US-94). It **does not offer one for the other** — `verify` asks
  *does this project still match the version it applied?*, the read-only
  mode asks *is there a newer version, and what would it change?*, and a
  project can be perfectly clean under `verify` and several versions
  behind (IM-25). `(S)(T)`
- The skill relays `verify`'s **two counts separately** — paths checked
  and paths reported `adapted` — so a clean run never hides an adaptation
  (IM-24, F1 US-33). `(S)`
- It uses `--json` where it needs structure for its own reasoning, and
  still relays the human rendering to the user. `(S)`

---

**US-86 — Be stopped, and told the code, when a run fails**
> As a project owner, I want a failed run to stop the whole thing and to
> be reported in the tool's own terms, so that I can act on it and so
> that no agent tidies up after a failure.

**Acceptance criteria:**
- **A non-zero exit stops the skill.** It performs no writes of its own,
  does not begin its judgment work, and relays the diagnostic (IM-7).
  `(S)(P)`
- The relay is **verbatim**, includes the **`→` remedy line**, and the
  skill **names the code** (IM-6, IM-19, IM-20). A session check asserts
  the code token appears in the message; a text check requires the
  instruction to branch on the code and never on prose. `(S)(T)`
- **The class is not reinterpreted** (IM-16, IM-39). A class-2 fault is
  reported as a pack, recipe or manifest fault or a refused destination —
  never as something the user typed wrong; a class-1 fault is never
  reported as a bug. The four classes mean the same thing on every
  command. `(S)`
- The skill **offers the remedy the CLI stated**; it may then offer to
  run it, and runs it only on the user's word. It never substitutes a
  remedy of its own for the `→` line. `(S)`
- **Zero bytes is observable.** After a session in which the CLI failed
  before the gate, the directory is byte-for-byte identical to its
  pre-session state — no applied tree, no manifest, **not even
  `.harness/`** (IM-17, IM-18) — and the skill has added nothing. A
  project check diffs the tree. `(P)`
- The skill **does not retry a class-2 fault unchanged**, and does not
  rephrase an input to get past one. `(S)(T)`
- Every `E-`/`W-` token the skill's Markdown contains **exists in F1's
  catalogue**. A text check extracts them and requires each to resolve;
  the skill invents no code (§NFR *Vocabulary*). `(T)`

---

**US-87 — Recover from a crashed apply with the one recovery command**
> As a project owner whose apply died mid-write, I want one command
> named, so that I do not have to work out by hand what landed.

**Acceptance criteria:**
- On exit `3`, the skill relays the diagnostic and the `→` line — which
  is `lintel harness init --rollback` — and offers to run it (IM-18,
  IM-20, F1 US-13). `(S)`
- It **never reverses an apply by hand**: no deletion, no restore, no
  editing of `.harness/journal.json` or `.harness/journal.d/` (IM-5). A
  project check after a simulated crash requires the journal to be
  untouched until `--rollback` runs. `(P)(T)`
- Where a later command reports `E-JOURNAL-PRESENT`, the skill stops,
  relays, and offers the same recovery — on **any** command, not only on
  `init` (F1 US-13). `(S)`
- After a rollback the skill relays what rollback reported, including
  every path it **declined** to touch and why (`W-ROLLBACK-KEPT` among
  them), without characterising the list. `(S)`

---

**US-88 — Have a run with notices reported as the success it is**
> As a user of the `planning` pack, whose every clean run prints two
> notices, I want them relayed and the run called successful, so that I
> do not learn to read correct output as a problem.

**Acceptance criteria:**
- Notices are **relayed, not suppressed, collapsed or apologised for**,
  and the skill reports a run with notices as **successful** (IM-21,
  Q-60). `(S)`
- The skill distinguishes **`notice`** from **`defect`** by the class the
  CLI emitted, never by its own reading of the text (Q-60, IM-6). It
  reports a notice as *the pack declared this on purpose*, and does not
  offer to fix one — no change to the pack would clear it. `(S)(T)`
- A **notice carries no `→` line, and its absence is meaningful**
  (IM-19); the skill does not invent a remedy for one. `(S)(T)`
- A **defect raised during an apply** — the folder-README warning is the
  type case — prints and does not change the exit code; the skill relays
  it and still reports the run as successful (IM-22, F1 §F1.6). `(S)`
- The skill passes no flag that would promote or hide a finding, because
  none exists for `init` and none anywhere hides a notice (IM-21, IM-41).
  `(S)(T)`
- A session check over `planning` asserts both
  `W-ANATOMY-PROVISIONAL` and `W-HOOK-SCRIPT-INERT` appear in the relay
  and that the session's summary calls the run successful (F5 v2.6).
  `(S)`

---

**US-89 — Get a `CLAUDE.md` that describes my project, not the template's**
> As a project owner, I want the generated `CLAUDE.md`'s project-owned
> prose adapted to my real tree, so that the first document every agent
> reads is true.

**Acceptance criteria:**
- After a successful `init`, and only then, the skill adapts the
  generated `CLAUDE.md`'s **project-owned prose** — the layout, the
  architecture notes, the standing instructions, the notes about this
  project's real tree (seam table; master spec §F6). `(S)(P)`
- It **fills, or removes, every `{{…}}` placeholder the template shipped
  in the project-owned sections**, using material from the repository and
  from the conversation. A placeholder it cannot fill honestly is left
  standing and **named to the user** — it is not filled with an
  assumption (IM-27). `(S)(P)`
- **The inert region anchors are left exactly as generated.** A project
  check asserts the anchor set after the session is byte-identical in
  count, ids and spelling to what the pack's `generate` step declared —
  `coding` **6**, `writing` **6**, `planning` **7** (F5 US-38, Q-61). The
  skill neither adds, removes, renames nor reformats one. `(P)`
- The adaptation is **content, not scaffolding**: a session check
  requires the adapted file to name real paths that exist in the fixture
  project's tree, and requires no `{{`-delimited placeholder to remain in
  a section the skill claimed to have adapted. `(S)(P)`
- `CLAUDE.md` is the **one applied path any pack declares
  adapt-expected**, so the adaptation is the declared outcome and
  `verify` reports it `adapted` rather than `differs` (Q-56, F1 US-33,
  F5 §2.7). The skill does not treat an `adapted` report as a problem to
  fix. `(P)`
- The skill does **not** re-generate the file, re-run the `generate`
  step, or reconstruct it from the payload template — it edits what the
  CLI wrote (IM-5). `(T)(P)`

---

**US-90 — Get file-ownership tables drawn against my real layout**
> As someone who will spawn agents in this project, I want the ownership
> tables to name the folders that exist here, so that the boundaries the
> agents enforce are boundaries in this repository.

**Acceptance criteria:**
- The skill redraws the file-ownership tables in the generated
  `CLAUDE.md` **against the real tree**, replacing the template's
  illustrative rows with this project's (seam table — *the work Q-1
  created the skill for*). `(S)(P)`
- Every path a redrawn table names **exists in the project**, or is
  stated as one the project is expected to create. A project check
  resolves each path in the table and requires zero unresolvable rows
  that are not marked as prospective. `(P)`
- The skill does **not** edit the pack's own ownership matrix under
  `.harness/pack/` — that is payload, it is covered by `payloadDigest`,
  and editing it is a `.harness/` write (IM-5, F1 US-33). A project check
  asserts `lintel harness verify` does not report
  `E-PAYLOAD-DIGEST-MISMATCH` after any session. `(P)`
- Where the pack points at its own matrix — `coding`'s `CLAUDE.md`
  points at `.harness/pack/agents/README.md` — the skill **keeps the
  pointer** and adapts the project-side table around it rather than
  inlining a copy that will drift. `(S)(P)`

---

**US-91 — Have the pack's voice guide filled where the pack ships one**
> As someone whose pack halts without a voice guide, I want it filled
> during setup, so that the first agent that needs it is not blocked by a
> template.

**Acceptance criteria:**
- Where the pack ships a tone-of-voice guide, the skill **fills it in the
  same turn as the apply** (IM-14 item 2, seam table). At v1.0 that is
  `coding` (`copy/tone-of-voice.md`) and `writing`
  (`writing-guide/tone-of-voice.md`); `planning` ships none, and the
  skill **determines which by inspecting the applied tree**, not from a
  list of its own (US-80's no-enumeration rule). `(S)(P)(T)`
- It fills the guide **from what the user told it**, and the worked
  examples — which the template calls the most important part — come from
  the user's own material or are left standing and named. An invented
  voice is a violation (IM-27, IM-28). `(S)`
- Where the user has nothing to give yet, the guide is **left at its
  template state and the user is told so**, with the consequence stated:
  `coding`'s `copywriter` **halts and requests one** rather than
  inventing a voice (IM-28, `pack-inventory.md`). A placeholder left
  standing is honest; an invented fill is not. `(S)(T)`
- On the standalone CLI path this is the user's job, not the skill's, and
  the skill says so when asked (IM-14). `(T)`
- **Known conflict, recorded not resolved:** the voice guide is produced
  by a `strip-suffix` step, which declares no `adaptExpected`, so a
  filled guide reports **`differs`** and `verify` exits `1` (F5 §US-38 —
  *no applied path other than the generated `CLAUDE.md` is
  adapt-expected*). This story and US-93 cannot both hold as written.
  **Q-79** carries it; §6.4 states how the skill behaves until it is
  answered. `(P)`

---

**US-92 — Be told what I still have to do, and never have it invented for me**
> As a project owner, I want the parts of the project that are
> deliberately empty named, so that I fill them rather than discovering
> later that an agent filled them with guesses.

**Acceptance criteria:**
- At the end of a successful setup the skill states the three things the
  apply does not do (IM-14): **fill `project-brief.md`**, **fill the
  pack's voice guide where one ships**, and **commit — `.harness/`
  included**. A session check asserts all three appear. `(S)(T)`
- It states **where** the brief is for this pack, read from the applied
  tree: `coding` at `specifications/project-brief.md`, `writing` and
  `planning` at the applied root. `(S)`
- **The unfilled-brief rule binds the skill.** On any visit to the
  project — including a later one — the skill that finds the brief still
  at its `{{…}}` placeholders **says so and asks**, and does not proceed
  on assumptions (IM-26, IM-27). The packs already implement this rule in
  each pack's `CLAUDE.md`, in `coding`'s `specifications/README.md`
  document-flow gate, and in the individual agents that read the brief;
  the skill's Markdown states the same rule for itself and does not
  restate the packs'. `(S)(T)`
- It **may draft brief content from what the user told it, attributed as
  a draft**. It **may not fill a placeholder with an assumption** and may
  not proceed past one silently (IM-27). A session check gives the skill
  a project with an unfilled brief and an instruction to "just get on
  with it", and requires the placeholders to survive and the skill to say
  so. `(S)(P)`
- **The same rule extends to a pack's other declared inputs** (IM-28):
  `planning`'s `background/` subfolders holding nothing but their README,
  and a missing or unfilled voice guide. Material the pack declares it
  needs, absent, is a finding to report — never a gap to fill with an
  assumption. `(S)(T)`

---

**US-93 — Prove the skill stayed inside its boundary**
> As a reviewer of this feature, I want the skill's write boundary
> checkable from outside the session, so that "thin" is a verified
> property rather than a claim.

**Acceptance criteria:**
- After a full conversational setup, **`lintel harness verify` exits
  `0`**, with `CLAUDE.md` reported **`adapted`** and **no** path reported
  `differs` (IM-9, F1 US-33's S7 test). `(P)`
- The skill's writes are confined to what IM-9 permits: the generated
  `CLAUDE.md`, the pack's voice guide where one ships, and content the
  user asked for. A project check enumerates every path whose mtime moved
  after the CLI's last write and requires each to be in that set. `(P)`
- **Nothing under `.harness/` was written by the skill.** A project check
  asserts `verify` reports no `E-PAYLOAD-DIGEST-MISMATCH`, and that
  `.harness/manifest.json` is byte-identical to what `init` wrote. `(P)`
- **No file a recipe step would have produced was hand-produced.** With
  the CLI stubbed to fail before the gate, a session must end with the
  project unchanged and **no applied tree** — the skill must not proceed
  by hand (IM-5, IM-7). `(P)`
- **Recorded against Q-79:** as the packs stand, this story's first
  criterion holds only where the skill filled no path outside the
  adapt-expected set. Where it filled the voice guide (US-91) or the user
  filled the brief (US-92), `verify` exits `1` with
  `E-VERIFY-MISMATCH`. The criterion is stated in its intended form and
  the defect is booked, rather than weakened to match the current pack
  declarations. `(P)`

---

**US-94 — Find out what an update would change, before running one**
> As a project owner, I want to see whether a newer pack version exists
> and which of my files it would touch, so that I choose to update rather
> than discovering the update.

**Acceptance criteria:**
- Before running `update`, the skill **offers `update`'s read-only mode**
  and runs it on the user's word (IM-35). It is not a separate command
  and the skill does not call it `status` (Q-62). `(S)(T)`
- The skill **runs it rather than describing from memory** what a newer
  pack version contains (IM-35). Describing the delta without running the
  command is a violation even where the description is accurate. `(S)(T)`
- The skill relays the report **as emitted** — the paths, the
  classifications and the counts — and does not group, sort or summarise
  them (IM-6). `(S)`
- It states, in its own words, that **an `update` is not reproducible
  from its arguments**: the same command in two projects at the same pack
  version does different things, because `update` alone reads what a
  previous run wrote (IM-40). `(S)(T)`
- It does not offer the read-only mode as a substitute for `verify` or
  the reverse (IM-25, US-85). `(S)`
- **It names no flag spelling F3 has not fixed.** §6.4 states how; a text
  check requires the skill to contain no invented `update` flag. `(T)`

---

**US-95 — Have `update`'s own output reach me, whatever it turns out to contain**
> As a project owner, I want the same fidelity from `update` that I get
> from `init`, so that a newer pack version cannot ship something past me
> because it arrived by a different command.

**Acceptance criteria:**
- **The relay obligation follows the writes, not the command name**
  (IM-13). Whatever `update` emits, the skill relays under §6.2's rules
  — including a disclosure, if F3 emits one. A newer pack version can
  ship an agent file, an executable or a substitution the applied version
  did not, so the case is real; **the skill's obligation does not depend
  on F3's answer**, because "relay what the CLI printed" needs no
  knowledge of which command printed it. `(S)(T)`
- **An edited path left untouched is a normal outcome and is reported as
  one** (IM-30). The skill does not call it a conflict, an error or
  damage; the report reads as work handed over, not work failed. A
  session check asserts the absence of failure vocabulary in the
  hand-over message while the CLI's own text is relayed unchanged. `(S)`
- **A non-zero exit stops the skill** (IM-7): no reconciliation, no
  writes, relay the diagnostic. The skill proceeds to §6.3 **only on exit
  `0`**. **Q-78** records the consequence for F3 — an `update` that exits
  non-zero merely because edited paths remain would disable the
  conversational reconciliation entirely. `(S)(P)(T)`
- The skill does not compute for itself which paths an `update` should
  replace, and does not check the CLI's classification (IM-5, seam
  table). `(T)`

---

**US-96 — Decide, myself, what happens to each file I edited**
> As a project owner whose edits `update` stopped at, I want to be shown
> what the pack changed and what I changed and to be asked, so that no
> file of mine changes on someone else's judgment.

*This is the feature's second load-bearing story. §6.3 states the
mechanics.*

**Acceptance criteria:**
- The skill walks the reported paths **one at a time, conversationally**
  (IM-31). For each it establishes what the pack changed and what the
  user changed, and asks what should happen. `(S)`
- **It shows both sides as content, not as a characterisation** (IM-33).
  *"The pack tightened the review section and you'd added a note there"*
  is not a substitute for showing the two. A session check asserts that,
  for each path the skill wrote, its messages contain the two sides as
  content before the write. `(S)`
- **Length is not an exemption.** Where the material is too long for one
  message, the skill splits it across turns rather than compressing it
  (IM-33) — the same rule as §6.2 R6. `(S)`
- **It must not silently pick a side** (IM-32). Not the pack's version,
  not the user's, not a blend. It **may recommend, with its reason
  stated**; it may not decide. A path written without a preceding user
  message naming the outcome for that path is a violation **whether or
  not the choice was the one the user would have made** — the test is
  whether the decision was put to them. `(S)(P)`
- **What counts as a decision, stated so a check can apply it:** a user
  message that names an outcome for the path — take the pack's version,
  keep mine, this specific blend, leave it for now — or that **ratifies a
  recommendation the skill has already shown for those paths**. A blanket
  instruction naming an outcome ("take the pack's version everywhere") is
  a decision and is recorded as one. **"You decide", silence, and an
  instruction to be quick are not decisions**; on any of them the skill
  states its recommendation and asks again. A scripted session in which
  the user says *"just pick whatever's best"* must end with **no edited
  path written** and each one still outstanding. `(S)(P)`
- The skill offers the outcomes it can actually deliver, and **says
  plainly which it cannot** (§6.4, **Q-77**): where the CLI's report does
  not carry the pack's new content for a path, the skill cannot produce
  that content without hand-producing a file a recipe step would have
  produced (IM-5), so it says so and does not reconstruct it from the
  payload. `(S)(T)`
- The reconciliation ends with a **per-path summary**: what was decided
  for each reported path, including the ones deferred. `(S)`

---

**US-97 — Have nothing move except what I decided**
> As a project owner, I want the reconciliation to touch only the files
> it was about, so that "I updated" does not turn into "something else
> changed too".

**Acceptance criteria:**
- The skill **writes only the paths the user decided, only as they
  decided** (IM-34). A project check enumerates every path that changed
  after `update`'s last write and requires each to be a reported path
  with a recorded decision. `(P)`
- It **does not tidy neighbouring files**, does not re-adapt `CLAUDE.md`
  beyond what the update requires, and does not resolve a path by
  hand-editing the payload or the manifest (IM-34, IM-5). `(P)(T)`
- **After the reconciliation, `lintel harness verify` exits `0`** — with
  the adapt-expected paths reported `adapted` and no path reported
  `differs` (IM-34). The skill runs it and relays both counts. Subject
  to **Q-79** exactly as US-93 is. `(P)(S)`
- A path the user deferred is **left byte-identical** and named in the
  summary as outstanding. `(P)(S)`

---

**US-98 — Be told "no" when v1.0 cannot do something**
> As a user asking for something the product does not do, I want a
> straight answer, so that I do not get an approximation that leaves my
> project unverifiable.

**Acceptance criteria:**
- The skill gives the **same answer both entry points give** (IM-37) and
  does not soften a *"you cannot"* into an offer to approximate it. `(S)`
- The four cases, each stated with its reason (IM-36, §10):
  - **No `contribute`.** An improvement made inside a project has no
    route back into the pack at v1.0. The skill says the manual route —
    edit `packs/<name>/` in the harness repo, bump the pack version, and
    `update` carries it — and **does not simulate the command** by
    diffing the project against the pack. `(S)(T)`
  - **No re-running `init` to pick up changes.** `E-ALREADY-APPLIED`,
    exit 1, zero bytes; `update` is the command, and `--force` relaxes
    the pre-existing-path rule **only** and never overrides this. `(S)`
  - **No second pack and no swapping packs** (Q-12). Two ways of working
    means two projects side by side. `(S)`
  - **No changing an answer after the apply.** The answers are recorded
    in the manifest, `update` recomputes from those same recorded
    answers, and the applied content is rendered from them. `(S)`
- **The skill never re-implements anything the CLI does** (IM-5). It does
  not copy pack files, render a recipe step, write or edit anything under
  `.harness/`, construct or repair a manifest, produce by hand a file a
  recipe step would have produced, or compute for itself which paths an
  `update` should replace. If something requires a capability the CLI
  lacks, the answer is **that v1.0 cannot do it** — not that the skill
  will do it instead. `(T)(P)`
- **No flag downgrades an integrity check, and the skill offers none**
  (IM-41). There is no flag, environment variable or pack-level switch
  that skips the `payloadDigest` check, tolerates drift, or turns a
  class-2 refusal into a warning; the skill does not imply one exists.
  A text check requires the absence of `--allow-stale-shared`,
  `--allow-drift`, `--skip-verify` and `--no-verify` from the skill's
  Markdown — none is a real flag, and each is one a reader might expect
  (F1 §F1.9 C-10, `interaction-model.md` §11.4). `(T)`
- The reason, stated once: **every approximation would produce a project
  that `verify` can no longer vouch for** (IM-37). `(S)(T)`

---

## Error States

Every row is a scenario the skill can be in, and the behaviour required
of it. **The CLI's message text is not restated here** — F1 §Error States
is the product's only catalogue and the skill relays it verbatim
(IM-6). What this table fixes is the skill's *behaviour*, which is the
part F1 does not own.

| Scenario | Expected behaviour |
|---|---|
| **Any non-zero exit from `init` or `update`** | Stop. No writes of any kind, no judgment work, no reconciliation. Relay the diagnostic verbatim including the `→` line, name the code, state the class in the user's terms (IM-7, IM-16, IM-20) |
| `E-ALREADY-APPLIED` (exit 1) | Relay. Say `update` is the command for picking up pack changes and `--force` does not override this. Do **not** offer to delete `.harness/` or to re-apply into the directory (US-98) |
| `E-TARGET-EXISTS` (exit 1) | Relay the listed paths and the total. May explain `--force` **with its exact scope** — it proceeds only for paths whose existing content is byte-identical, and any other collision still fails — and re-runs with it **only on the user's word**. Never deletes or moves a colliding file |
| `E-PARAM-MISSING` / `E-PARAM-INVALID` (exit 1) | Treat as the skill's own defect against IM-8: it did not gather an answer, or gathered an invalid one. Relay, gather in conversation, re-run. Never answer a prompt mid-run |
| `E-SCAFFOLD-UNKNOWN` / `E-SCAFFOLD-EXCLUSIVE` (exit 1) | Relay, re-run `pack info`, re-present the scaffolds as it grouped them, re-ask (US-81) |
| `W-ANSWER-LOOKS-SECRET` (warning, run continues) | Relay verbatim. State that the answer is now in a committed manifest and as public as the repository. Do not offer to "store" or mask it; do not restate the value in the conversation (IM-15) |
| `E-PARAM-SECRET-SUSPECTED` (exit 2) | Report as a **pack** fault, not as user input. Do not propose a different answer to get past it (IM-16) |
| **Any exit 2** | Report as a pack, recipe or manifest integrity fault, or a safety rule refusing a destination. Do **not** retry unchanged, do not rephrase an input to get past it, do not present it as something the user typed wrong. Offer to report it, or to fix the pack where the user owns it |
| **Exit 3** | Relay; the `→` line is `lintel harness init --rollback`. Offer to run it; run it only on the user's word. Never reverse the apply by hand (US-87) |
| `E-JOURNAL-PRESENT` on any command | Stop, relay, offer the same rollback. Applies on read-only commands too |
| `W-ROLLBACK-KEPT` after a rollback | Relay every path rollback declined to touch, and why, without characterising the list |
| **A notice** (`W-ANATOMY-PROVISIONAL`, `W-HOOK-SCRIPT-INERT`) | Relay. Report the run as **successful**. Do not offer to fix it, do not apologise for it, do not invent a remedy — a notice has no `→` line and its absence is meaningful (IM-19, IM-21) |
| **A defect at `init`** (e.g. `W-FOLDER-README-MISSING`) | Relay. The exit code does not move; the run is still successful (IM-22). Say who is expected to change something |
| `E-CLI-UNKNOWN-FLAG` / `E-FLAG-NOT-PERMITTED` (exit 1) | The skill guessed a flag. Relay, stop guessing, and consult the CLI's own usage output or ask the user rather than trying a second spelling (§6.4) |
| **`lintel` not installed, or the command not found** | Say so and stop. Do **not** perform the apply by hand, copy pack files, or write a manifest (IM-5). The remedy is installing `@lintel/cli`, and the skill says so without inventing an install command F2 has not specified |
| **`verify` reports `differs` at a path the skill itself wrote** | Report it as the skill's own defect, name `E-VERIFY-MISMATCH` and the path, and put the choice to the user. Do **not** silently revert the file, and do not re-run anything to make the report go away. See **Q-79** for the case where this is expected rather than a defect |
| `E-PAYLOAD-DIGEST-MISMATCH` (exit 2) on any command | Relay. State that the per-path comparison was **suppressed entirely** and why — the expectation is computed from the payload, so an untrusted payload makes the comparison meaningless (F1 US-33). Do not attempt a comparison of its own |
| **The user asks the skill to decide a reconciliation** ("you pick") | State a recommendation and its reason, and ask again. Do not write the path (IM-32, US-96) |
| **The user asks for something v1.0 does not do** | Decline, with the reason, and give the manual route where one exists (IM-36, IM-37, US-98) |
| **The user asks the skill to be brief, or to skip the disclosure** | The relay is unconditional (§6.2 R5). Relay in full; a summary may follow it |
| **The CLI's output is larger than one message** | Split at line boundaries across consecutive messages, in order, nothing interleaved (§6.2 R6). Never truncate, never elide, never replace with a count |

---

## Non-Functional Requirements

The template's headings are adapted honestly: this feature has no
latency budget, no rendering path and no localised strings of its own,
and saying so is more useful than inventing numbers.

- **Fidelity (the one hard number).** In **100%** of sessions that run a
  writing command, across **all three** bundled packs and both `coding`
  scaffold combinations, the CLI's captured output appears in the
  transcript as a contiguous unmodified substring (IM-10, G6.2). This is
  the feature's only requirement stated as a rate, and the rate is 100%
  because a partial relay is a silent failure (IM-11).
- **Vocabulary.** The skill names **no `E-`/`W-` code, exit class, flag,
  applied path, parameter id, scaffold id or count that F1, F2, F3 or F5
  does not own.** A text check extracts every `E-`/`W-` token and every
  `--flag` from the skill's Markdown and requires each to resolve in F1's
  catalogue or in a command's specified argument surface; an unresolvable
  token fails the check. The skill invents no code — F1's catalogue is
  the only one.
- **Non-determinism, bounded.** The skill's own wording is not fixed and
  is not required to be; every criterion in this spec is a containment,
  absence or ordering assertion, never an equality against expected
  prose. The two places bytes are required — the relayed CLI output and
  the two sides of a reconciliation — are required as bytes **from
  another producer**, which is precisely what makes them checkable
  against a non-deterministic component.
- **Latency.** No budget of its own. The skill adds **one CLI invocation
  per command** and does not poll, retry a successful command, or run a
  writing command twice to inspect its output. A session check asserts
  the count of `init` invocations in a successful setup is exactly one.
- **Privacy.** Nothing leaves the session. No project content, parameter
  answer, disclosure or diagnostic is transmitted anywhere; the skill
  makes no network request and instructs none, and every command it runs
  needs no network (IM-38, §11.1). Answers are as public as the
  repository, which is a property of the manifest and is disclosed to the
  user rather than mitigated (IM-15).
- **Safety.** No write before exit `0`. No write outside IM-9's set. No
  write ever under `.harness/`. No deletion of a file the skill did not
  create in that session, on any path.
- **Versioning.** The skill declares no version and ships in the same
  package and release as the CLI it drives, so *"which CLI does this
  skill expect"* has exactly one answer. **What that costs, stated so it
  is inherited rather than rediscovered:** the coupling is the argument
  surface, the codes and the exit classes, and nothing enforces it — a
  CLI that renames a flag or retires a code breaks the skill silently,
  with no diagnostic and no failing build. Two mitigations, both
  required: the **Vocabulary** check above runs in the same CI job as
  F1's catalogue, so a retired code fails the build; and **if the skill
  is ever distributed separately from the CLI, the single-answer property
  disappears and the coupling needs a real mechanism** (Q-75) — this is
  the trigger, and it is stated as one.
- **Accessibility and localisation.** n/a as UI concerns. One consequence
  worth stating because it is counter-intuitive: the CLI's diagnostics
  and disclosure are English, and **a translated relay is a violation of
  IM-6 and IM-10**. The skill may translate its own commentary; it may
  not translate the block.
- **Verifiability.** Every criterion in this spec carries `(S)`, `(P)` or
  `(T)`. `(P)` and `(T)` checks are ordinary tests and run in CI. `(S)`
  checks need a harness able to script a session and capture the
  transcript; **whether the project has one at v1.0 is not settled
  here** — where it does not, the `(S)` criteria run as a release-time
  scripted checklist with the transcript retained as evidence, and that
  fallback is recorded rather than assumed. The fidelity requirement
  above is the one `(S)` check that must not be waived: it is the only
  control left on the disclosure (IM-11).
- **Legibility.** The skill's Markdown is a document a person reads
  before trusting it, so it states its prohibitions as prohibitions and
  cites `IM-n`, F1 and this spec for its rules rather than re-deriving
  them. It carries no copy of F1's error table, no copy of a pack's
  contents, and no second statement of the seam.

---

## Flows / Behaviour

### 6.1 The setup flow, with the seam marked at every step

| # | Step | Owner | Notes |
|---|---|---|---|
| 1 | Read the repository — what this project is, what is already here | **Skill** | Effort before questions (US-79) |
| 2 | Ask the user what the tree cannot answer | **Skill** | Intake, in conversation, before any invocation (IM-8) |
| 3 | `lintel harness pack info <name>` for the candidates | **CLI**, run by the skill | Read-only, no permission needed (IM-38). The pack choice is made against this and never from memory (IM-12) |
| 4 | Choose the pack; choose the scaffolds as alternatives where grouped | **User**, with the skill | One-time and unswappable (Q-12, IM-4) |
| 5 | Propose the answers, with their parameter ids, and confirm | **Skill** proposes, **user** confirms | Answers are public (IM-15) |
| 6 | `lintel harness init <pack> [--scaffold …] [--set …]` | **CLI** | Every answer by flag; nothing to prompt for (IM-8, IM-2) |
| 7 | **Relay the whole captured output** | **Skill** | §6.2. Before commentary, before any write (IM-10) |
| 8 | On non-zero: **stop** | **Skill** | No writes, no judgment work (IM-7). Flow ends |
| 9 | Adapt `CLAUDE.md`'s project-owned prose; leave the anchors | **Skill** | US-89 |
| 10 | Redraw the file-ownership tables against the real tree | **Skill** | US-90 — the work Q-1 created the skill for |
| 11 | Fill the voice guide where the pack ships one | **Skill** | US-91; `planning` ships none |
| 12 | State what remains: the brief, the voice guide if unfilled, **commit `.harness/`** | **Skill** | IM-14, US-92 |
| 13 | `lintel harness verify`, and relay both counts | **CLI**, run by the skill | US-93; `CLAUDE.md` reads `adapted` (Q-56) |

Steps 9–11 are the whole of the skill's write authority after an `init`
(IM-9). Everything above step 9 is either conversation or a CLI
invocation.

### 6.2 The relay, stated exactly

Seven rules. They apply to `init`, and to `update` and anything else the
CLI emits from a writing command (IM-13).

- **R1 — Capture.** The skill invokes the command capturing its combined
  output with **no TTY**, and passes no flag that alters what is printed
  — `init` has none to pass (IM-22, §11.2). No TTY means no ANSI, so the
  comparison is over plain text.
- **R2 — Relay the whole capture, not an extracted block.** The skill's
  message contains **the entire captured text**, unmodified and
  contiguous. **Why the whole capture rather than the disclosure alone:**
  no document defines a machine-locatable extent for the disclosure block
  inside `init`'s human-readable output, and `init` has no `--json`
  (**Q-76**). Relaying everything is a superset that satisfies IM-10 with
  no delimiter at all, and it discharges three other obligations in the
  same move — the notices IM-21 forbids suppressing, the counts IM-24
  requires, and the `→` line IM-20 requires — each of which would
  otherwise need its own extraction rule.
- **R3 — Wrapping only.** The block may be enclosed in a fenced code
  block. The fence adds lines **before and after**; it must add nothing
  **inside** — no indentation, no list markers, no re-wrapping, no
  trimming of trailing whitespace, no normalisation of blank lines, no
  substitution of a value, no elision of a path.
- **R4 — Placement.** The relay precedes any commentary of the skill's
  own and precedes any judgment write. Commentary goes **after** the
  block (IM-10).
- **R5 — Unconditional.** Not on request; not conditioned on the skill's
  estimate of interest; not conditioned on a row being non-empty — where
  a list is empty the CLI says so (F1 US-29) and that line is relayed
  with the rest. An instruction from the user to be brief does not
  license a shorter relay (US-84).
- **R6 — Splitting.** Where the capture exceeds one message, it is split
  at **line boundaries** across consecutive messages in order, with
  nothing interleaved. The concatenation of the parts is the capture.
- **R7 — No standing in for it.** Having relayed the block, the skill
  still answers questions about the pack by running `pack info` rather
  than by re-reading its own relay back to the user (IM-12).

**The check, in full:** run the command capturing `out`; run the scripted
session; concatenate the assistant's messages into `msg`; remove **only**
the code-fence delimiter lines from `msg`; assert `out` is a contiguous
substring of `msg`. An accurate but reworded relay fails, **and should**
(IM-10).

### 6.3 The reconciliation, stated exactly

Entered **only** on exit `0` from `update` (US-95, Q-78), and only for
the paths the CLI reported. Per path, in order:

1. **Name the path**, and state its classification as the CLI reported it
   — edited, or adapt-expected (IM-29). The classification is a computed
   fact and the skill does not second-guess it.
2. **Show what the pack changed**, as content, from what the CLI
   reported. Where the report does not carry it, say so plainly and
   **do not reconstruct it** — see §6.4 and **Q-77**.
3. **Show what the user changed**, as content: the file on disk is the
   user's side and the skill may read it.
4. **Ask.** State a recommendation and its reason if it has one; put the
   decision to the user (IM-32).
5. **Write only on a decision**, and only that path (IM-34). US-96 fixes
   what counts as a decision: an outcome named by the user, or a
   ratification of a shown recommendation. "You decide" is not one.
6. **Record it** in a per-path summary, deferrals included.

Then, once: **`lintel harness verify`**, relaying both counts (IM-34,
IM-24). Adapt-expected paths read `adapted`; nothing should read
`differs`.

**Length is not an exemption** at step 2 or 3. Where the material is too
long for one message, split it across turns rather than compressing it
(IM-33) — the same rule as §6.2 R6, for the same reason.

### 6.4 Writing around F3, which has no spec yet

`update` is F3's and is unspecified. Four things are genuinely unsettled;
this section states how the skill is written so it is **correct either
way**, and names the question that will settle each.

| Unsettled | How the skill is written | Question |
|---|---|---|
| **The read-only mode's flag spelling** (§11.3 names none) | The skill names **no spelling of its own**. It takes the spelling from the CLI's own usage output, or asks the user. It does not try a second guess after a first fails — a guessed flag is `E-CLI-UNKNOWN-FLAG` or `E-FLAG-NOT-PERMITTED`, exit 1, **zero bytes**, so guessing is *harmless* but it is still forbidden, because a skill that guesses teaches a user a flag that does not exist | — (F3) |
| **Whether `update` emits a disclosure** | Irrelevant to the skill: §6.2 relays **whatever the command printed** and needs no knowledge of which command printed it (IM-13, US-95) | — (settled by construction) |
| **Whether the report carries the pack's new content for an edited path** | The skill shows the user's side from disk, and shows the pack's side **only if the CLI reported it**. If it did not, the skill says so and stops there for that path: producing that content itself would be hand-producing a file a recipe step would have produced (IM-5), and reading the payload at `.harness/pack/` gives the *source*, not the rendered output, for any `substitute` or `generate` step. **Consequence, stated rather than hidden:** if F3 reports paths alone, "take the pack's version" is an outcome the skill **cannot deliver**, and it must say so rather than approximate it | **Q-77** |
| **Whether edited paths move the exit code** (IM-30 leaves it to F3) | The skill reconciles **only on exit `0`** (IM-7 is literal and this spec does not weaken it). **Consequence for F3:** an `update` that exits non-zero merely because edited paths remain would disable the conversational reconciliation entirely — IM-7 would stop the skill exactly where IM-31 requires it to start. Exit `0` with a report is the shape that lets both hold, and it is also what IM-30 implies: work handed over, not work failed | **Q-78** |

Nothing else in this spec depends on F3's detail. The skill's side of
`update` is: run it, relay it (§6.2), stop on non-zero, and reconcile
(§6.3).

### 6.5 The prohibitions, and how each is checked

IM-5 as a list of properties an auditor can test, rather than a
principle to be applied in good faith.

| The skill must not | Check |
|---|---|
| Copy a pack file into the project | `(P)` every applied path's content is what `verify` recomputes, and `verify` exits `0` on a session where the CLI ran |
| Render a recipe step, or produce by hand a file a step would have produced | `(P)` with the CLI stubbed to fail before the gate, the session leaves **zero bytes** and no applied tree |
| Write or edit anything under `.harness/` | `(P)` `verify` reports no `E-PAYLOAD-DIGEST-MISMATCH`; `.harness/manifest.json` is byte-identical to what `init` wrote |
| Construct or repair a manifest | `(P)` as above, plus `(T)` the skill's Markdown contains no manifest key list |
| Compute which paths an `update` should replace | `(T)` the skill contains no classification rule, and `(S)` no session message asserts a classification the CLI did not report |
| Pre-screen or second-guess a CLI check | `(S)` a fixture with an already-applied project: the skill may report and propose, but if asked to run `init` it runs it and relays `E-ALREADY-APPLIED` |
| Paraphrase a diagnostic, or report a fault without its code | `(S)` the code token appears; `(T)` the branch-on-code instruction is present |
| Enumerate a pack's contents from memory | `(T)` grep for the packs' agent filenames and applied paths returns zero hits |
| Offer a flag that downgrades an integrity check | `(T)` the four expectable-but-nonexistent flag names are absent (US-98) |
| Decide a reconciliation | `(S)(P)` every written path traces to a user message naming its outcome |

---

## Open Questions

Feature-specific questions only. **Q-75…Q-79** is the block reserved for
F6; ids are project-monotonic and keep their number when they move to
Resolved Decisions. **Four of the five are gaps this spec found in
documents it depends on**, not choices this feature is deferring, and
each is written so the finding survives even if the question is answered
somewhere else.

| # | Question | Owner | Default assumption |
|---|---|---|---|
| **Q-75** | **How is the skill distributed, and how does a session know which CLI it is talking to?** `technology-choices.md` §9 says the skill ships in the same package and release as the CLI, which gives *"which CLI does this skill expect"* one answer — but nothing states how a Markdown skill inside an npm package reaches `.claude/skills/` in a user's project or profile, whether it is a Claude Code plugin, and whether a session can read the CLI's version at all. It is downstream of **Q-64** (whether later tools are built into `@lintel/cli` or loaded as plugins) and cannot be settled before it | architect | The skill ships in `@lintel/cli` as Markdown under `.claude/skills/lintel-harness/`, is installed by whatever mechanism Q-64 settles, performs **no version check**, and relies on the shipped-together property plus the §NFR *Vocabulary* CI check to catch drift. If it is ever distributed separately, the coupling needs a real mechanism and this question reopens |
| **Q-76** | **What is the machine-locatable extent of `init`'s disclosure block in its output?** IM-10's test requires "the CLI's disclosure block" to appear as a contiguous unmodified substring — which needs a way to know where the block starts and ends. F1 US-13 fixes the block's *rows*, not its delimiters; `init` has no `--json` (IM-22); and `pack info --json` emits a `PackReport` for a **different run**, before any answer exists, so it cannot stand in for the apply's own block (IM-12's recorded seam) | F2, with F1 | **None is defined**, and this spec does not need one: §6.2 R2 requires the skill to relay the **whole captured output**, which is a superset, and the check asserts containment of the whole capture. If F2 later defines stable delimiters, the check may narrow to the block; the requirement on the skill does not change |
| **Q-77** | **Does `update`'s edited-path report carry the pack's new rendered content (or a diff) for each reported path?** IM-33 requires the skill to show **what the pack changed** as content. Only the CLI can render that content — `expected_new` at a path is the output of a recipe step, and hand-producing one is exactly what IM-5 forbids. Reading `.harness/pack/` gives the *payload source*, which equals the rendered output only for `copy`/`rename`/`strip-suffix` steps and not for `substitute` or `generate`. **The gap bites twice**: without that content the skill can neither *show* the pack's side (IM-33) nor *apply* it (a user choosing "take the pack's version" would have the skill hand-write a recipe step's output) | F3 | **It does not.** The skill shows the user's side, states plainly that the pack's side was not reported, offers only the outcomes it can deliver — keep mine, defer, or a blend the user dictates — and does not reconstruct the pack's version. If F3 reports paths alone, "take the pack's version" is unavailable on the conversational path, which is a strong reason for F3 to carry the content or to offer a per-path take-theirs operation |
| **Q-78** | **Does `update` exit non-zero when edited paths remain?** IM-30 leaves it to F3. But IM-7 stops the skill on **any** non-zero exit from `update`, and IM-31 requires the skill to reconcile exactly those paths — so an F3 that exits, say, `1` for "edited paths outstanding" would make the two requirements contradict, and would disable the conversational reconciliation Q-62 created the feature half for | F3, with the interaction model | **Exit `0`**, with the edited paths reported. The skill reconciles only on exit `0` and this spec does not weaken IM-7. If F3 chooses otherwise, IM-7 needs an explicit carve-out naming F3's code — the skill would then treat that one code as a successful hand-over, and only that one |
| **Q-79** | **The adapt-expected set is too narrow for the workflow every document requires.** Only each pack's `generate` step declares `adaptExpected`, and F5 §US-38 states it explicitly: *no applied path other than the generated `CLAUDE.md` is adapt-expected in any pack.* But **IM-14 requires the user to fill `project-brief.md`** (a `rename` step's output) and **requires the skill to fill the voice guide** (a `strip-suffix` step's output, in `coding` and `writing`). Both are ship-to-be-filled files whose whole purpose is to be edited, and a filled one reports **`differs`**, so `verify` exits `1` with `E-VERIFY-MISMATCH`. **This makes IM-9's and IM-34's tests, US-93, US-97, G6.8 and S7's green `verify` unreachable on any real project** — the S7 test passes today only because it is run on a project where nobody has filled the brief | F5, with F1 and the brief | **F5 sets `"adaptExpected": true` on the steps producing each pack's `project-brief.md` and each pack's tone-of-voice guide** — the same declaration, for the same reason, on the files the packs already document as *ready to fill*. Until it does, the skill still fills the voice guide (IM-14 requires it) and still tells the user to fill the brief; US-93's and US-97's `verify` criteria are then met only for `planning`, and the failure is reported to the user with its code rather than hidden. **The skill does not work around it** by declining to fill, by reverting the file, or by suppressing the report |

---

## Resolved Decisions

None yet. **Q-75…Q-79 are all open**, and each keeps its id when it
moves here.

| # | Question | Decision | Date |
|---|---|---|---|
| — | — | — | — |

---

## 7. Coverage — every `IM-n`, and where it is discharged

The interaction model is cited throughout rather than restated. This
table is the check that the citation is complete: every requirement in
`general/interaction-model.md` v1.1 either binds this feature and is
carried by a story here, or binds the CLI and is named as such.

| `IM-n` | Subject | Where |
|---|---|---|
| IM-1 | Conversational path is a wrapper, not a second implementation | US-79, US-83, G6.7 |
| IM-2 | CLI complete with no agent present | **F2's** — F6 must not break it (G6.7) |
| IM-3 | The skill wraps `init` and `update` only | §Technical Context, US-85 |
| IM-4 | Which pack is a one-time choice | US-80 |
| IM-5 | Never re-implements the CLI | US-98, §6.5 |
| IM-6 | Never paraphrases what the CLI reports | US-84, US-86, US-88, US-96 |
| IM-7 | A failing run stops the skill | US-86, US-95, §6.4 |
| IM-8 | Supplies every answer up front | US-83 |
| IM-9 | After success, only the judgment writes | US-93, US-97 |
| IM-10 | Faithful disclosure | **US-84**, §6.2 |
| IM-11 | The disclosure gates nothing | US-84, §NFR *Verifiability* |
| IM-12 | `pack info` is the pre-run inspection surface | US-80, US-85, §6.2 R7 |
| IM-13 | The relay obligation follows the writes | US-95 |
| IM-14 | The run states what the user must still do | US-92, US-91 |
| IM-15 | Answers are public | US-82 |
| IM-16 | Neither entry point reinterprets a class | US-86, §Error States |
| IM-17 | A failed apply writes zero bytes | **F1/F2's** — observed via US-86 |
| IM-18 | What zero bytes guarantees | US-86, US-87 |
| IM-19 | The `→` remedy line | **F1's** catalogue rule; skill side is IM-20 |
| IM-20 | The skill relays the remedy | US-86, US-87 |
| IM-21 | A clean run may print notices | US-88 |
| IM-22 | `init` has no `--strict` | US-83, US-88 |
| IM-23 | An adapted `CLAUDE.md` is not a failure | US-89, US-93 |
| IM-24 | The success report distinguishes the two counts | US-85, US-93, US-97 |
| IM-25 | `verify` and `update`'s read-only mode differ | US-85, US-94 |
| IM-26 | An agent finding an unfilled brief says so | **the packs'** — already implemented; cited in US-92 |
| IM-27 | The rule binds the setup skill too | US-92, US-89 |
| IM-28 | It extends to a pack's other declared inputs | US-91, US-92 |
| IM-29 | The CLI decides only what is computable | US-96 step 1 |
| IM-30 | An edited path untouched is a normal outcome | US-95, Q-78 |
| IM-31 | The skill walks the edited paths | **US-96**, §6.3 |
| IM-32 | Must not silently pick a side | **US-96** |
| IM-33 | Shows both sides rather than characterising | **US-96**, §6.3 |
| IM-34 | Only the decided paths move | US-97 |
| IM-35 | `update`'s read-only mode | US-94 |
| IM-36 | There is no `contribute` | US-98 |
| IM-37 | Both entry points give the same answer | US-98 |
| IM-38 | Three of five commands cannot write | US-85, §6.1 step 3 |
| IM-39 | An exit class means the same everywhere | US-86 |
| IM-40 | `update` is determined by a previous run | US-94 |
| IM-41 | No flag downgrades an integrity check | US-83, US-98 |

**Nothing in the interaction model is unaccounted for.** Three
requirements are the CLI's and are marked as such; the rest bind this
feature and are carried by a story with at least one check.
