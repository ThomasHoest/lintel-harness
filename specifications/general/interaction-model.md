# Interaction model — how someone sets up and works with a project

**Status:** Draft
**Applies to version:** v1.0 — the CLI (F1, F2, F3) plus the thin skill (F6)
**Date:** 2026-09-01
**Decisions:** Q-1 (CLI/skill split) · Q-57 (conversational primary, and the design obligation recorded with it) · **Q-62 (`update` returns to v1.0, without a merge engine; `contribute` stays deferred; `status` folds into `update`'s read-only mode — reverses Q-42 in part)** · Q-54 (no consent gate) · Q-56 (`adapted`) · Q-60 (defect/notice) · Q-50 (folder READMEs) · Q-53 (the read-only commands) · Q-12 (one pack per project) · **Q-63 (the binary is `lintel`, `harness` is a command group, the package is `@linteldk/cli`)**
**Sources:** `general/system-architecture.md` · `general/pack-application.md` · `general/pack-inventory.md` · `v1.0/F1-spec-pack-format-and-manifest.md` v2.8 (US-4, US-8, US-13, US-14, US-16, US-29, US-31, US-33, §Technical Context, §F1.6, §Error States) · `v1.0/F5-spec-template-packs.md` v2.8 · `project-brief.md` §12 · the three bundled packs

> **Written against Q-62, which lands after every document this one
> cites.** `update` is back in v1.0 and F3 with it. Where the sources
> above still say `update` is deferred — `pack-application.md`'s *What
> v1.0 does not do*, `system-architecture.md` §4's *Deferred* row and its
> claim that the skill wraps `init` and only `init`, F1 §F1.9's v1.1
> obligations, and the brief's own Q-42 — they predate Q-62 and this
> document does not follow them. §12 records the reconciliation.

> Cross-cutting reference. Where `pack-application.md` answers *what an
> apply does* and `system-architecture.md` answers *how the system fits
> together*, this answers **what it is like to use** — the two entry
> points, the seam between them, what a person sees when it works, what
> they see when it does not, what they are expected to do next, and how a
> project is kept current afterwards.
>
> **It belongs in `general/` by the pack's own test:** F2 and F6 are both
> written against it, and nothing here is scoped to v1.0's feature set
> except where it says so.
>
> **Requirements carry an `IM-n` id** so F2 and F6 can cite one rather
> than restate it. Each is meant to be checkable. Ids are monotonic and
> never reused; next free id **IM-42**.
>
> **Living document.** Review on every version bump; keep the
> `## Change history` current.

**This is not a design spec, and the pack's `design-spec.template.md`
does not apply to it.** That template is for screens, components, tokens,
motion and haptics — app UI. This product has none: the surfaces are a
terminal and a conversation. What would be design decisions elsewhere —
what is shown, in what order, verbatim or summarised — are stated here as
requirements instead. A design spec should be written if and when a v1.1
grows a screen.

---

## 1. The two entry points

There are two, and only one of them is primary. Each covers the whole
lifecycle a project has at v1.0: **setting up** (`init`) and **keeping
current** (`update`, §9).

| | **Conversational** — the primary path | **Standalone CLI** |
|---|---|---|
| **The user does** | Asks Claude, in the project directory, to set the project up — or, later, to bring it up to date | Runs `lintel harness init <pack> …`, or `lintel harness update` |
| **Who gathers intent** | The F6 skill, in conversation | The CLI, by prompt or by flag |
| **Who applies the pack** | The CLI, invoked by the skill | The CLI |
| **Judgment work after the run** | The skill does it in the same turn — the adaptation after an `init`, the reconciliation after an `update` | The user does it by hand, or later, in conversation |
| **For** | A person setting up or maintaining a real project. Every target project is an agentic one, so this is the native path (Q-57) | CI, scripts, a non-Claude-Code environment, and anyone who prefers a command |

Every command is reached through the **`harness` command group** — the binary
is `lintel`, the group is `harness`, and the command is the second positional
(Q-63). **§11 enumerates the whole surface**; the sections between here and
there describe what running it is like.

**IM-1 — The conversational path is primary, and it is a wrapper, not a
second implementation.** Everything the user gets from it, they get by
the skill running the same CLI with the same arguments and reporting the
same output.

**IM-2 — The CLI is complete with no agent present.** Every command,
every pack and every parameter is reachable from `argv` alone: a required
answer can always be supplied with `--set <id>=<value>` or a pack-declared
`flag` alias (F1 US-8), a scaffold with `--scaffold`, and no command
requires a terminal capable of prompting, a network, or an agent runtime.
A test asserts this by applying each bundled pack in a non-interactive
shell with answers supplied entirely by flags, and requiring exit `0`.

**IM-3 — The skill wraps the two writing commands, `init` and `update`,
and nothing else** (Q-1, Q-62). Those are the two commands with judgment
work on the far side of them. `validate`, `verify` and `pack info` are
read-only diagnostics (Q-53), as is `update`'s read-only mode; a person,
CI or the skill may run any of them, and the skill adds nothing to them
but the decision to run one and the relay of what came back.

**IM-4 — Which pack is a one-time choice.** A project holds exactly one
pack (Q-12) and there is no way to swap one (§10). `update` moves a
project to a newer version of **the pack it already applied**; it is not
a route to a different pack. Both entry points must therefore make the
choice before the apply, which is what `pack info` exists for (IM-12).

---

## 2. The seam — who owns what

The split is Q-1's and is not renegotiated here: **deterministic mechanics
in the CLI, judgment in the skill.** The table states where each concern
lives. A concern in the left column is the CLI's *exclusively*.

| Concern | Owner | Notes |
|---|---|---|
| Resolving the pack, its version and `minCliVersion` | **CLI** | F1 §F1.6 step 2 |
| All validation, of the pack and of the answers | **CLI** | F1 US-16; the skill never pre-screens or second-guesses a check |
| Planning both phases, and the write set | **CLI** | `pack-application.md`; nothing is planned outside it |
| Every byte written into the project by the apply | **CLI** | Phase 1 and phase 2, including `.harness/` |
| The manifest | **CLI** | Six keys, written last (F1 US-13) |
| The pre-write disclosure | **CLI** builds and prints; **skill** relays verbatim | §3 |
| Exit codes, diagnostic codes and diagnostic text | **CLI** | F1 §Error States is the only catalogue |
| Rollback after a failed apply | **CLI**, via `init --rollback` | The skill invokes it; it never reverses an apply by hand |
| Recomputing `expected_old` and `expected_new` at `update` | **CLI** | The deterministic identity `verify` already uses (Q-62, §9) |
| Classifying each path as unedited, edited or adapt-expected | **CLI** | A computed fact, not a judgement |
| Replacing an **unedited** path with the new version | **CLI**, silently | No prompt, no merge, no conflict markers |
| Stopping at an **edited** path and reporting it | **CLI** | The CLI deliberately does not decide; it hands over |
| Gathering intent — what this project is, what to answer | **Skill** | Reads the repo and asks the user; the CLI can only prompt |
| Choosing the pack and the scaffolds with the user | **Skill** | Against `pack info`, not against its own memory of a pack |
| **Reconciling the edited paths with the user, conversationally** | **Skill** | The second thing the skill owns, and the case the CLI stops for (§9) |
| Filling a pack's tone-of-voice guide | **Skill** | Where the pack ships one (`pack-inventory.md` records which) |
| Adapting the generated `CLAUDE.md`'s **project-owned prose** | **Skill** | The layout, the standing instructions, the notes about this project's real tree |
| Redrawing file-ownership tables against the real layout | **Skill** | The work Q-1 created the skill for |
| Filling `project-brief.md` | **User**, prompted by the skill or an agent | §8 |
| Deciding what happens to an edited file | **User**, in conversation with the skill | Never the skill alone (IM-32) |

**IM-5 — The skill never re-implements anything the CLI does.** It does
not copy pack files, render a recipe step, write or edit anything under
`.harness/`, construct or repair a manifest, produce by hand a file a
recipe step would have produced, or compute for itself which paths an
`update` should replace. If a thing the user wants requires a capability
the CLI lacks, the answer is that v1.0 cannot do it (§10), not that the
skill will do it instead.

**IM-6 — The skill never paraphrases what the CLI reports.** Diagnostics,
codes, counts and the disclosure are relayed as the CLI emitted them.
The skill may add commentary **after** the relayed text; it may not
replace it, reorder it, or stand in for it. The stable contract is the
code (F1 §Error States), so a skill that reports a fault must name the
code.

**IM-7 — A failing run stops the skill, and the skill writes nothing.**
On any non-zero exit from `init` or `update`, the skill performs no
writes of its own, does not begin its judgment work, and relays the
diagnostic. This is what keeps the zero-bytes guarantee (IM-18) a
property the *user* observes rather than one only the CLI observes: a run
that wrote nothing must not be followed by an agent that helpfully writes
something.

**IM-8 — The skill supplies every answer up front.** It invokes `init`
with every required parameter set by flag, so the CLI has nothing to
prompt for and the run is non-interactive. Intent-gathering happens in
the conversation, before the invocation — never by the skill answering a
prompt on the user's behalf mid-run.

**IM-9 — After a successful run the skill's only writes are the judgment
ones.** After an `init` they are confined to what §7 permits: the
generated `CLAUDE.md`, the pack's voice guide where it ships one, and
content the user asked for. After an `update` they are confined to the
paths the CLI reported as edited or adapt-expected, and only as the user
decided (§9). A test asserts the boundary from the other side: after a
skill session, `lintel harness verify` exits `0` with `CLAUDE.md`
reported `adapted` and **no** path reported `differs`.

---

## 3. The pre-write disclosure

`init` prints a disclosure before it writes anything. It enumerates, and
never summarises: what would be written executable and where it came
from; every file the pack ships under a `hooks/` directory in any
`.claude` tree, each stated plainly as inert; every applied path at which
a parameter answer was substituted, with the parameter id and **the value
verbatim**; and every pack-shipped `.claude/agents/*.md` with its whole
frontmatter block verbatim. **F1 US-13 owns the rows and is authoritative
on their membership** — this paragraph describes them, and does not fix
them. It is built once, by the planner, and rendered by `init`,
`pack info` and `validate --json` from that one builder, so the three
cannot disagree.

**IM-10 — The skill surfaces the disclosure faithfully** (Q-57's recorded
design obligation). When the skill runs `init` on the user's behalf, the
disclosure reaches the user **as the CLI emitted it**: the same lines, in
the same order, complete. Relaying is a copy, not a rendering. The skill
does not parse it, group it, sort it, elide a line, truncate a value,
replace an enumeration with a count, or substitute a characterisation for
the text. Commentary is allowed and goes after the block.

*The test is textual, not semantic:* capture `init`'s output, and require
the CLI's disclosure block to appear in the skill's message as a
contiguous, unmodified substring. A relay that is accurate but reworded
fails, and should.

*What a violation looks like* — each of these is a violation even where
the summary is true:

- *"Applied `coding`. It installs ten agents, two of which can use Bash — say the word if you want the full list."* — a count where the CLI enumerated, and an offer where the CLI disclosed.
- *"Set up your project. Everything looks standard."* — the disclosure omitted entirely.
- Printing the agent names but dropping their frontmatter blocks because they are long.
- Printing the substituted paths without the substituted **values**, or with a value shortened.
- Reproducing the disclosure only when the user asks for it.

**IM-11 — The disclosure gates nothing, and that is why IM-10 matters
more, not less.** The consent gate went with `merge-json` (Q-54); no v1.0
pack can write a settings file at all, so no pack owns a
security-relevant key, and F1 US-13 states plainly that nothing an apply
does requires consent. The disclosure is therefore **purely
informational**: nothing pauses, nothing asks, and the apply proceeds
whether or not anyone read it. Three consequences the reader needs:

- The only mechanism left is that the text reaches a human. On the CLI
  path it reaches their terminal whether they read it or not. On the
  conversational path **the only copy the user ever sees is the one the
  skill chose to show** — so the skill is the last remaining control.
- A violation of IM-10 **fails silently**. It produces no diagnostic, no
  non-zero exit and no drift; the apply succeeds either way. It can only
  be caught by a test that compares text (IM-10), which is why one is
  required rather than suggested.
- Because the disclosure appears in the same run that writes the files,
  it is a **record, not a decision point**. A user who wants to decide
  before anything lands runs `pack info` first (IM-12).

**IM-12 — `pack info <pack>` is the pre-run inspection surface** (F1
US-29). It renders the pack's identity, its nine anatomy parts, its
scaffolds, its parameters, **every recipe step in order** and the same
disclosure, reading the pack alone and writing nothing. This is what "a
pack can only do what the primitives allow" buys the reader: the complete
list of what an apply will do, before it does it. The skill offers it
when the user is choosing a pack, and must offer it — not a description
from memory — when asked what a pack contains.

> **Known seam, recorded rather than resolved.** `pack info` runs before
> any answer exists, so the disclosure's substitution row cannot carry
> the values verbatim there; only the applied paths and the parameter ids
> are knowable. F1 US-29 as written requires the value. The
> answer-bearing half of the disclosure is therefore only ever seen
> during the apply itself, which is the run this document has just said
> gates nothing. See the reconciliation note in §12.

**IM-13 — The relay obligation follows the writes, not the command
name.** IM-10 binds the skill wherever the CLI emits a disclosure. A pack
version arriving through `update` can ship an agent file, an executable
or a substitution the applied version did not, so if `update` emits a
disclosure the skill surfaces it under exactly the rules above. F3 owns
whether it does; the skill's obligation does not depend on the answer,
because "relay what the CLI printed" needs no knowledge of which command
printed it.

---

## 4. What the user sees when it works

The apply either completes or writes nothing (§5). On completion:

- `.harness/pack/` holds the pack verbatim, and `.harness/manifest.json`
  records what was applied. Both are **committed to version control by
  design**.
- The applied tree is present and immediately usable: agents and commands
  under `.claude/`, the pack's working files in their final locations
  with correct internal references, the selected scaffolds, and a
  generated `CLAUDE.md` carrying inert region anchors.
- Every folder the apply created carries a README (Q-50), so a newcomer
  opening any folder learns what belongs there. `.claude/` and
  `.harness/` are excluded, being tool-owned.
- Notices may have printed (§6). The run is still clean.
- On the conversational path, the skill has additionally done its
  judgment work in the same turn.

**IM-14 — The run states what the user must still do.** An apply is not
finished work: it produces a project whose *content* is still empty in
named places. Both entry points must leave the user knowing to:

1. **Fill `project-brief.md`.** Every bundled pack ships one, and it is
   upstream of everything the pack's agents do (§8).
2. **Fill the pack's voice guide, where it ships one** — the skill's job
   on the conversational path, the user's on the CLI path.
3. **Commit.** `.harness/` included.

**IM-15 — Answers are public.** A parameter answer is written verbatim
into `.harness/manifest.json`, which is committed, and is therefore
exactly as public as the repository. The CLI refuses a parameter whose
*declaration* looks like a credential and warns on an *answer* that looks
like one (F1 US-4). Neither entry point may invite a secret as an answer,
and the skill must not offer to "store" one.

---

## 5. What the user sees when it goes wrong

### The exit classes, as a person reads them

F1 fixes four classes and they are the whole model (F1 §Technical
Context). What each means at the keyboard:

| Class | Means | What to do |
|---|---|---|
| **0** | It worked. Notices may have printed; defects may have printed outside `--strict` | Nothing. Read the notices if you like |
| **1** | **You can fix this.** Your input, your project's state, or drift the tool found. Nothing is broken | Fix it and re-run. `E-ALREADY-APPLIED`, `E-TARGET-EXISTS`, `E-PARAM-MISSING` and `E-VERIFY-MISMATCH` are the type cases |
| **2** | **Something is wrong with the pack, the recipe or the manifest, or a safety rule refused a destination.** Rephrasing will not help | An author or an integrity fault. Report it or fix the pack; do not retry unchanged |
| **3** | **The CLI failed internally, or the filesystem did mid-write.** Your project may be mid-apply | `lintel harness init --rollback` |

**IM-16 — Neither entry point may reinterpret a class.** A class-2 fault
is not presented as something the user typed wrong; a class-1 fault is
not presented as a bug. The skill branches on the code and the class, and
never on the prose (F1 §Error States).

### Zero bytes

**IM-17 — A failed apply writes zero bytes.** Every check runs before the
lock is taken and before the first write (`pack-application.md`, F1
§F1.6): a failure at any point up to the gate writes nothing at all —
not the applied tree, not the manifest, **not even `.harness/`**.

**IM-18 — What that guarantees the user.** The directory is exactly as it
was. There is nothing to clean up, no half-applied state to reason about,
and the remedy after a class-1 or class-2 failure is always *fix and
re-run*, never *tidy up first*. This is what makes it safe to try an
apply in a directory that already has work in it. After the gate — the
only window in which anything is written — a failure leaves the journal
in place and **`init --rollback` is the single recovery command**;
rollback deletes only what this apply created, restores only what it
overwrote, and keeps a file the user edited after the crash, telling them
so (F1 US-13).

### The remedy line

**IM-19 — A diagnostic must tell you what to do next, and the `→` line is
the contract.** F1's message convention — line 1 states the failure and
begins `lintel:`, context lines are indented two spaces, and a
line beginning `→` states the remedy — is a **requirement on the
catalogue, not a house style**. Every `E-` code and every `defect`-class
`W-` code carries a remedy line; a new code proposed without one is
incomplete, and "the failure is self-explanatory" is not an exemption,
because the person reading it is by definition the person who did not
find it obvious.

The one principled absence: a **`notice`** has no remedy, because nothing
is expected to change (§6). A notice carrying no `→` line is correct, and
its absence is meaningful.

**IM-20 — The skill relays the remedy, it does not replace it.** Where
the CLI says `→ lintel harness init --rollback`, the skill shows that
line. It may then offer to run it.

---

## 6. Notices and defects in the output

Every `W-` code carries a **class** as well as a severity, assigned once
in F1's catalogue (Q-60):

- A **defect** is author-fixable — something is wrong and someone is
  expected to change it.
- A **notice** reports a state the pack **declared on purpose**. Nothing
  is wrong, and no change to the pack would clear it: a `provisional`
  anatomy part with its note, a hook script shipped inert because no pack
  may register a hook at v1.0.

**IM-21 — A clean run may print notices, and that is correct rather than
noise.** Neither entry point may suppress, collapse or apologise for a
notice, and the skill may not report a run with notices as anything other
than successful. `--strict` promotes **defects only**; a notice is never
fatal under any flag, and there is no flag that hides one.

**IM-22 — `init` has no `--strict`.** A defect raised during an apply —
the folder-README warning is the type case — prints and does not change
the exit code (F1 §F1.6). The place a defect is fatal is
`validate --all --strict`, which is CI's command, not a user's.

---

## 7. `verify`, and the `adapted` state

**What a user runs it for.** `lintel harness verify` answers *is what the
pack wrote still what the pack would write?* It re-runs phase 2 in memory
from the committed payload and compares against the project. It writes
nothing, takes no lock, needs no network and does not need the CLI that
performed the apply to still be installed. It is the command to run
before trusting an inherited project, after a merge, and in CI.

It checks the payload digest **first and fail-closed**: if
`.harness/pack/` itself moved, the comparison is suppressed entirely
rather than reported against an untrusted expectation. Two drifts, two
codes, two classes — `verify` can say **which side moved** (F1 US-33).

**IM-23 — An adapted `CLAUDE.md` is not a failure.** A recipe step may
declare its output adapt-expected; every bundled pack does so on the step
that generates `CLAUDE.md`, because that file carries the project-owned
prose the skill exists to adapt. Such a path reports **`adapted`**, which
is not counted toward a mismatch and does not affect the exit code
(Q-56). A path no step declared still reports `differs` and still fails.
`verify` reports **six** states per path — `match`, `adapted`, `filled`,
`unfilled`, `differs`, `missing` — and F1 US-33 is authoritative on the
enumeration. **`filled` and `unfilled`** (Q-79) name a path the pack
shipped *to be filled in*: `project-brief.md` in every pack, `writing`'s
voice guide. `unfilled` means the template is still a template, which is
the one thing a project owner most needs told and which `match` hid.
Neither is a failure.

**Why the user needs to know this.** Under Q-57 the skill always runs, so
`CLAUDE.md` is *always* edited — an unadapted one exists for the seconds
between the apply and the skill's first edit. Without `adapted`, a green
`verify` would be reachable only on a project nobody had finished setting
up, and the acceptance test for S7 would test a state no real project is
ever in.

**IM-24 — The success report distinguishes the two.** A run in which
every path is `match` or `adapted` exits `0` and prints the count checked
**and, separately, the count reported `adapted`** — so a clean run never
hides an adaptation, and the reader can tell *no path moved* from *one
path moved where the pack said it would*. The skill relays both numbers
(IM-6).

**IM-25 — `verify` and `update`'s read-only mode answer different
questions, and neither entry point may offer one for the other.**
`verify` asks *does this project still match the version it applied?*;
`update`'s read-only mode asks *is there a newer version, and what
would it change?* (§9). A project can be perfectly clean under `verify`
and several pack versions behind. The two share the recomputation
identity and nothing else.

---

## 8. The unfilled brief

Every bundled pack ships a `project-brief.md` template that the apply
renders into the project and **the user fills**. It is upstream of
everything the pack's agents do: the coding pack's spec chain reads it
before researching or specifying, the writing pack's outliner and scout
read it for audience and scope, the planning pack computes horizons from
its determinants and the absorption gate from its capacity number.

**IM-26 — An agent that finds the brief still at its `{{...}}`
placeholders says so and asks, rather than proceeding on assumptions.**
This is an interaction rule, not a preference, and the packs already
implement it — in each pack's `CLAUDE.md`, in the coding pack's
`specifications/README.md` document-flow gate, and in the individual
agents that read the brief. The failure it prevents is specific and
worth naming: an unfilled brief does not produce an obvious error, it
produces **well-formed output resting on invented premises** — a horizon
set by the planning calendar rather than by a constraint, an outline
written for an audience nobody chose.

**IM-27 — The rule binds the setup skill too.** It applies to any agent
that reads the brief, including the skill on a later visit to the same
project. The skill may draft brief content **from what the user told
it**, attributed as a draft; it may not fill a placeholder with an
assumption, and it may not proceed past one silently. A placeholder left
standing is honest; an invented fill is not.

**IM-28 — The same rule extends to a pack's other declared inputs.** The
planning pack states it for a `background/` subfolder holding nothing but
its README; the coding pack's `copywriter` halts and requests one rather
than inventing a voice when the tone-of-voice guide is missing or
unfilled. The test is the same: *material the pack declares it needs,
absent* is a finding to report, never a gap to fill with an assumption.

---

## 9. Keeping a project current — `update`

`update` ships at v1.0 (Q-62, reversing Q-42's deferral in part). It
moves a project to a newer version of the pack it already applied. S7
strengthens with it: this repo is produced by `lintel harness init
coding` **and maintained by `lintel harness update`**.

### The shape, and why it is an interaction decision

**There is no merge engine, and that is the design rather than a
shortfall.** The CLI recomputes two trees — `expected_old` from the local
`.harness/pack/` payload, its recipe and the recorded answers (the
deterministic identity `verify` already uses, §7), and `expected_new`
from the newer bundled payload — and then classifies each path:

| The applied file | Classification | What the CLI does |
|---|---|---|
| matches `expected_old` | **unedited** | **Replaced outright, silently.** No prompt, no diff to approve, no conflict markers |
| differs from `expected_old` | **edited** | **Left untouched, and reported.** The CLI does not decide |
| is in the adapt-expected set — `CLAUDE.md` in every pack (Q-56) | **adapted** | **Never blindly replaced**, because being edited is its declared purpose. It is reported and handed over exactly as an edited path is, whether or not it currently differs |

**What the user sees.** Most of an update is silent: the files they never
touched are simply the new ones. What is left is a short list — the files
they *did* touch — with the pack's newer version available and not yet
applied to any of them. Nothing is half-written, nothing carries conflict
markers, and no file they edited has changed under them.

**IM-29 — The CLI decides only what is computable, and stops where
judgment starts.** Which class a path falls into is a computed fact:
two recomputations and a comparison, no heuristics. What to *do* about an
edited path is not computable, so the CLI does not attempt it. It hands
over — and on the conversational path it hands over to the skill and the
user, which is Q-1's split arriving exactly where Q-57 said the user
already is. **On the standalone path it hands over to the user**, who
reconciles by hand against the report; the CLI's behaviour is identical
either way, and no capability is reserved for the agent.

**IM-30 — An edited path left untouched is a normal outcome, not a
failure.** It is the mechanism working: the user's edit survived. Neither
entry point may present it as an error, a conflict or damage. F3 owns
whether and how it moves an exit code; whatever it chooses, the *report*
must read as work handed over rather than work failed.

### The reconciliation, which is the skill's

**IM-31 — The skill walks the user through the edited paths, one at a
time, conversationally.** For each it establishes what the pack changed
and what the user changed, and asks what should happen. This is the
second thing the skill owns after intake, and the more interesting one,
because it is the only place in the product where the CLI deliberately
stops with work outstanding.

**IM-32 — The skill must not silently pick a side.** Not the pack's
version, not the user's, not a blend of the two. It may recommend, with
its reason stated; it may not decide. A reconciliation that produces a
file the user did not choose is a violation whether or not the choice was
the one they would have made — the test is whether the decision was put
to them.

**IM-33 — The skill shows both sides rather than characterising either.**
The user sees **what the pack changed** and **what they changed**, as
content, not as a summary of content. "The pack tightened the review
section and you'd added a note there" is not a substitute for showing the
two. This is IM-6 applied to the case where it is most tempting to
paraphrase: the material is long, and both sides are prose. Length is not
an exemption; where the material is genuinely too long for one message,
the skill splits it across turns rather than compressing it.

**IM-34 — Reconciliation is the user's decision applied by the skill,
and nothing else moves.** The skill writes only the paths the user
decided, only as they decided. It does not tidy neighbouring files, does
not re-adapt `CLAUDE.md` beyond what the update requires, and does not
resolve a path by hand-editing the payload or the manifest (IM-5). After
the reconciliation, `lintel harness verify` exits `0` — with the
adapt-expected paths reported `adapted` and no path reported `differs`.

**IM-35 — `update`'s read-only mode answers "what would this change?"**
`status` is not a separate command; it is `update` reporting without
writing (Q-62). It is what a user runs to see whether a newer pack
version exists and which of their files it would touch, and what CI runs
to detect drift from the pack. The skill offers it before running an
`update`, and must run it rather than describing from memory what a newer
pack version contains.

---

## 10. What v1.0 does not offer

Stated plainly, because a user will ask.

**IM-36 — There is no `contribute`.** An improvement made *inside* a
project has **no route back into the pack**. The loop runs one way at
v1.0: pack → project, by `init` and `update`; project → pack, not at all.

- *"I improved an agent prompt in this project — how do I get it into
  the pack so my other projects benefit?"* — **You cannot, by command.**
  Edit `packs/<name>/` in the harness repo yourself, by hand, and bump
  the pack version; then `update` carries it to the other projects. The
  CLI will not diff your project against the pack for you, and the skill
  will not simulate it (IM-5). `contribute` is v1.1, F4.
- *"Then how do I even find what I changed?"* — `verify` and `update`'s
  read-only mode both report paths that differ from what the pack would
  produce, which is the same comparison pointed the other way. Reading
  that report and deciding what deserves to be promoted is manual work at
  v1.0.

The rest, unchanged by Q-62:

- *"Can I re-run `init` to pick up changes?"* — No.
  `E-ALREADY-APPLIED`, exit 1, zero bytes (F1 US-14). `update` is the
  command for that. `--force` relaxes the pre-existing-path rule only and
  never overrides this.
- *"Can I add a second pack, or swap packs?"* — No (Q-12). Two ways of
  working means two projects side by side.
- *"Can I change an answer after the apply?"* — No (F1 §F1.9). The
  answers are recorded in the manifest, `update` recomputes from those
  same recorded answers, and the applied content is rendered from them.

**IM-37 — Both entry points give the same answer.** The skill does not
soften "you cannot" into an offer to approximate it. Declining is the
correct behaviour, and the reason is that every approximation would
produce a project that `verify` can no longer vouch for.

---

## 11. The command surface

The sections above describe what using the CLI is *like*. This one says
what it **is**: the six commands, what each takes, what each may touch,
and how each ends. It is a **reference, and descriptive** — the owning
feature spec is authoritative for every command, and **F1 §Error States
is the product's only message catalogue.** It is cited here and
deliberately not restated: a second copy of an error table is a second
thing to keep true.

Every command is reached through the **`harness` command group**: the
binary is `lintel`, the group is `harness`, and the command is the
**second** positional (Q-63). Diagnostics are prefixed `lintel:` — one
binary, one prefix, whatever group emitted them (F1 §Technical Context).

### 11.1 The shape, before the detail

Four facts about the surface matter more than any single command, and
the first three are visible in the table below rather than argued for.

| | `init` | `update` | `skill install` | `validate` | `verify` | `pack info` |
|---|---|---|---|---|---|---|
| **Owner** | F2 | F3 | **F6→F1** | F1 | F1 | F1 |
| **Writes the project** | **yes** | **yes** — except in its read-only mode | **yes** — `.claude/skills/lintel/`, or the user profile under `--user` | **never** | **never** | **never** |
| **Takes the project lock** | yes | F3's to state | no — it writes no applied path and touches no manifest | no | no | no |
| **Needs a completed apply** | no — refuses one (`E-ALREADY-APPLIED`) | **yes** | no | no | **yes** | no |
| **Reads** | the bundled pack | the manifest, the local payload **and** the bundled pack | one pack, or all of them | the manifest and the local payload | one pack |
| **Network** | none | none | none | none | none |

**IM-38 — Three of the six commands cannot write, and the guarantee is
structural rather than behavioural.** `validate`, `verify` and
`pack info` write nothing, take no lock, make no network request and do
not need the CLI that performed an apply to still be installed (Q-53, F1
US-16, US-29, US-33). This is the product's safety story in one glance:
**every command that inspects is a command that cannot damage**, so
running one to find out where you stand is never a decision. Neither
entry point may present a read-only command as having changed anything,
and the skill may run any of the three without asking, because there is
nothing to ask about.

**The count moved from five to six at `F6-ADR-005`**, and the ratio
matters more than either number: **`skill install` writes**, so the
writing set grew from two to three while the read-only set stayed at
three. A reader who remembers "three of five" should not carry it
forward. `skill install` writes only under `.claude/skills/`, takes no
lock and touches no applied path or manifest — but it **is** a write, it
**is** subject to F1's confinement gate like any other, and calling it
read-only because it is small is the exemption this document exists to
refuse. **The product's own tooling does not get a carve-out from the
rule it imposes on packs** (C-5).

The two *project-writing* commands are exactly the two the
skill wraps (IM-3), and that is not a coincidence — judgment work exists
on the far side of a write and nowhere else.

**IM-39 — An exit class means the same thing on every command.** F1 fixes
four — `0` success, `1` user-correctable, `2` a pack, recipe or manifest
integrity fault or a safety rule refusing a destination, `3` internal or
filesystem — and they do not shift meaning between `init` and `verify`,
or between a writing command and a read-only one (F1 §Technical Context,
§Error States; read them at the keyboard in §5). A consumer may branch on
the class without knowing which command produced it. **What varies per
command is which classes are reachable, never what a class means**, and
the per-command entries below state reachability only.

**IM-40 — `update` is the only writing command whose behaviour is
determined by a previous run.** `init` requires the *absence* of a prior
apply and reads only the bundled pack. `validate` and `pack info` read a
pack and nothing else. `verify` requires a prior apply, but it only
*reports* on it. `update` alone reads what a previous run wrote — the
manifest's recorded answers and scaffolds, and the payload committed to
`.harness/pack/` — recomputes `expected_old` from them, and lets that
recomputation decide what it writes next (§9). Two consequences neither
entry point may blur: **an `update` is not reproducible from its
arguments**, because the same command in two projects at the same pack
version does different things; and **an `update` is only as trustworthy
as the payload it recomputes from**, which is why the payload-digest
check is the same fail-closed gate `verify` runs first (§7, IM-41).

**IM-41 — No flag downgrades an integrity check, on any command.** There
is no flag, environment variable or pack-level switch anywhere in this
CLI that skips the `payloadDigest` check, tolerates drift, or turns a
class-2 refusal into a warning (F1 §F1.9's disposition of C-10; F1 US-33;
Q-56's `adaptExpected` is a **per-path property declared by the pack**,
never a run-level switch). The related rule holds from the other
direction: a flag that belongs to a read-only command and is passed to a
writing one is **refused, not ignored** — `E-FLAG-NOT-PERMITTED`, exit 1
— because a user who typed it believed it did something. Read IM-41
against IM-38: the read-only commands are safe because they cannot write,
and the writing commands are safe because nothing on the command line can
relax what stops them.

### 11.2 `lintel harness init <pack>` — apply a pack (F2)

```
lintel harness init <pack> [--scaffold <id>]… [--set <id>=<value>]…
                           [--<pack-declared alias> <value>]… [--force]
lintel harness init --rollback
```

**What it does.** Applies one pack to the current directory in two
phases: a verbatim payload copy to `.harness/pack/`, then the recipe
(`pack-application.md`, F1 §F1.6). It prints the pre-write disclosure
(§3), plans everything in memory, takes the project lock, writes, and
lands the manifest last. **It writes**, and it is the only command that
creates `.harness/`.

**Arguments and flags.**

| | |
|---|---|
| `<pack>` | Required, and never inferred. One pack per project (Q-12, IM-4) |
| `--scaffold <id>` | Opt-in and repeatable; with none, no scaffold is applied. Two scaffolds sharing a `category` are alternatives, not additions (F1 US-13) |
| `--set <id>=<value>` | Supplies a declared parameter's answer. Repeatable. Every answer is recorded verbatim in the committed manifest and is therefore as public as the repository (IM-15) |
| `--<alias> <value>` | A **pack-declared** alias for one `--set`, read from `pack.json` at parse time — `--calibration high-floor` *is* `--set constraintFloor=high-floor` (F1 US-8). The CLI holds no pack-specific knowledge. These aliases are why argv is parsed in **two passes**, and why a flag can only be called unknown after the second |
| `--force` | Relaxes the pre-existing-path rule of F1 US-13 **and nothing else**. It keeps byte-identical collisions and still stops on the rest; it never overrides `E-ALREADY-APPLIED` (§10) |
| `--rollback` | The single recovery command after a crashed apply. Deletes only what that apply created, restores only what it overwrote, and keeps a file the user has since edited, saying so (IM-18) |

There is **no `--strict`** (IM-22) and **no `--json`**: a defect raised
during an apply prints and leaves the exit code alone, and the
machine-readable surfaces are the read-only commands'.

**How it ends.** `0` applied. `1` you can fix it — `E-ALREADY-APPLIED`,
`E-TARGET-EXISTS`, `E-PARAM-MISSING`, `E-SCAFFOLD-UNKNOWN`. `2` the pack,
recipe or manifest is wrong, or a safety rule refused a destination —
**zero bytes**, before the lock (IM-17). `3` the write failed mid-apply;
the journal stands and `--rollback` is the answer.

### 11.3 `lintel harness update` — move to a newer pack version (F3)

```
lintel harness update
```

**What it does.** Moves the project to a newer version of the pack it
already applied — never to a different pack (IM-4). It recomputes
`expected_old` and `expected_new`, classifies each applied path as
unedited, edited or adapt-expected, **replaces the unedited outright and
silently**, and **leaves the edited untouched and reports them** (§9).
There is no merge engine and there are no conflict markers. **It writes**,
and it is the only command whose behaviour a previous run determines
(IM-40).

**Its read-only mode** answers *is there a newer version, and what would
it change?* — the command formerly called `status`, folded in by Q-62 and
**not a separate command** (IM-35). In that mode it writes nothing and
belongs with the three read-only commands for every purpose in this
document except its owner.

**Arguments and flags.** **F3 owns them and has no spec yet**, so this
reference names none — including the spelling of the read-only mode's
flag. Three constraints already bind whatever F3 chooses, and are stated
here because they are interaction decisions this document has already
taken: the reserved CLI flag list is the whole list and is reserved
whether or not a command accepts it (F1 US-8, so a pack alias cannot
shadow one); a read-only flag passed to the writing mode is refused, not
ignored (IM-41); and no flag may tolerate drift (IM-41).

**How it ends.** The classes mean what they mean everywhere (IM-39).
**Which class an edited path produces is F3's to decide and is not
assumed here** — but whatever it decides, an edited path left untouched
is the mechanism working and must not read as damage (IM-30). F3 also
owns whether an interrupted `update` carries `init`'s all-or-nothing
property; IM-7 is written so the skill behaves correctly either way (§12).

### 11.4 `lintel harness validate [<pack> | --all]` — check a pack (F1)

```
lintel harness validate <pack> [--strict] [--json]
lintel harness validate --all  [--strict] [--json]
```

**What it does.** Runs F1 US-16's fixed-order checks over a pack's own
files — schema, anatomy, payload integrity, the applied-path grammar and
the reserved-destination rules, a render **per parameter combination**,
folder READMEs, link integrity and the disclosure. The order is part of
the contract, so a pack fails on the earliest and most explicable cause.
**It never writes**, and it needs no project: it answers *is this pack
well-formed?*, not *is this project correct?*

**Arguments and flags.**

| | |
|---|---|
| `<pack>` / `--all` | One pack, or every bundled pack. Exactly one of the two |
| `--strict` | **Promotes `defect`-class warnings to exit 1. Never a notice** — a notice is not fatal under any flag and there is no flag that hides one (Q-60, IM-21) |
| `--json` | Emits the `PackReport`, with each finding carrying its `class` verbatim as `"defect"` or `"notice"`, so CI counts promotable findings without keeping a code list of its own |

**`--allow-stale-shared` does not exist, and its absence is the control.**
It is worth stating because it is easy to assume: the flag was C-10's
subject, it governed `shared[].integrity`, and **`shared/` left v1.0 with
Q-48**, taking the flag with it. C-10's rule survives with no flag to
attach to — *a flag that downgrades an integrity check exists on
read-only commands only* — and F1 records the stronger form it collapsed
into: **there is no flag anywhere in this CLI that skips the
`payloadDigest` check** (F1 §F1.9's C-10 row; IM-41). A reference that
listed the flag would advertise a control that is not there; a reference
that omits it silently would leave the next reader to invent it.

**How it ends.** `0` with no findings, **and `0` with `notice`-class
findings only, under every flag including `--strict`**. `1` with
`defect`-class warnings **and only under `--strict`**. `2` with any
error. `validate --all --strict` is CI's command and exits `0` for all
three bundled packs (F1 US-16) — which is why it, and not bare `--all`,
is the one written into CI.

### 11.5 `lintel harness verify` — check a project against its pack (F1)

```
lintel harness verify [--json]
```

**What it does.** Answers *is what the pack wrote still what the pack
would write?* It checks the payload digest **first and fail-closed**,
then re-runs phase 2 **entirely in memory** from the committed payload,
the recorded answers and the recorded scaffolds, and compares against the
project (§7, F1 US-33). **It never writes** — no lock, no journal, no
network — and it does not need the CLI that performed the apply to still
be installed.

**Arguments and flags.** No positional. `--json` emits the per-path
`state` alongside the `class` field on findings — two axes, both
emitted (Q-56, Q-60).

**What it reports.** Four states per path, and the enumeration is closed:
`match`, **`adapted`**, `differs`, `missing`. An `adapted` path is not
counted toward a mismatch and does not move the exit code (IM-23), and a
clean run prints the count checked **and, separately, the count
`adapted`** (IM-24).

**How it ends.** `0` when every path is `match` or `adapted`. `1` on
`E-VERIFY-MISMATCH` — a `differs` may be a deliberate edit, which is why
it is never class 2 — and on `E-MANIFEST-MISSING`, which just means no
pack is applied here. `2` when the payload moved
(`E-PAYLOAD-DIGEST-MISMATCH`) or the manifest cannot be trusted
(`E-MANIFEST-CORRUPT`, `E-MANIFEST-ANSWER-INVALID`); in each of those the
per-path comparison is **suppressed entirely** rather than reported
against an expectation computed from something untrustworthy. Two drifts,
two codes, two classes: `verify` can say **which side moved**.

### 11.6 `lintel harness pack info <name>` — read a pack before applying it (F1)

```
lintel harness pack info <name> [--json]
```

**What it does.** Renders a pack's identity, its nine anatomy parts with
`present | provisional | absent` and their notes and reasons, its
scaffolds grouped by category and labelled as alternatives, its declared
parameters with any `flag` alias, **every recipe step in order**, and the
pack's security disclosure — reading the pack alone and **writing
nothing** (F1 US-29). It is the pre-run inspection surface (IM-12), and
the reason a user can decide before anything lands: the disclosure `init`
prints appears in the same run that writes the files, so it is a record
rather than a decision point (IM-11).

**Arguments and flags.** `<name>` required. `--json` emits the
`PackReport` verbatim — the **same** structure `validate --json` emits
and the same builder `init`'s disclosure uses, so the three surfaces
cannot disagree.

**How it ends.** `0` rendered. `2` if the pack is malformed enough that
there is nothing honest to render — the same codes `validate` raises,
because it is the same reader.

---

## 12. Reconciliation notes

Where the documents this one depends on do not yet say what a coherent
interaction model needs. Each is a defect in the cited document, recorded
here so the requirement is not weakened to match it.

**Superseded by Q-62, and not yet folded.** `update` is in v1.0, so the
following now read false: `pack-application.md`'s *What v1.0 does not
do*; `system-architecture.md` §4's *Deferred* row, its §1 principle that
"the skill wraps `init` and only `init`", and its statement that F6 is
the only feature that can be cut without breaking the release gate; F1
§F1.9's v1.1 obligations where they assign work to a deferred `update`;
and the brief's Q-42, S3, S7, G3 and R4 entries. F3 returning to scope
also gives `verify`'s recomputation identity a second consumer, which is
worth stating where that identity is defined.

**The `→` remedy line is not uniform in F1's catalogue** (IM-19). At v2.7
several `E-` rows state the remedy in an unmarked line — `Allowed:
{values}`, `Pick one.`, `{usage}` — and at least one states no remedy at
all (`E-CONTENT-TOO-LARGE`, which names the limit but not what to do
about it). The rule stands; the catalogue should be audited against it in
F1's next revision, and every `notice`-class row should be confirmed as
*deliberately* arrow-less rather than incidentally so.

**`pack info`'s disclosure cannot carry substituted values** (IM-12's
note). F1 US-29 requires the disclosure "in full and verbatim", including
each substituted **value**, while also requiring `pack info` to read the
pack alone — and no answer exists at that point. F1 should either scope
the row at `pack info` to paths and parameter ids, or give `pack info` a
way to take answers. Until then, the answer-bearing half of the
disclosure exists only inside the apply.

**F1's `E-CLI-UNKNOWN-COMMAND` lists four commands, not five** (§11.1).
Q-62 returned `update` to v1.0, and F1 v2.8's own §Technical Context row
now says the count is stale, but the catalogue row still prints
`Commands: init, validate, verify, pack`. It is a one-line fold and it
belongs with F3's spec, since F3 is what makes the fifth command real.

**An unknown command *group* has no diagnostic code** (§11, Q-63). Under
the group the CLI has two unknown-positional faults with different lists
and different remedies — `lintel foo` and `lintel harness foo` —
and F1 owns the only catalogue, so a second code is F1's to add and is
**recorded rather than invented**: F1 v2.8 known limit 16 states the
requirement, exit class and message shape, and defers the row to the
change that answers Q-64. Until then, the group-level fault can only be
asserted by string-matching, which is the defect F1's *Diagnostic
vocabulary* row exists to forbid. **Nothing in this document depends on
the answer**: IM-39 binds a class, not a code.

**`update`'s flags are unspecified** (§11.3). F3 has no spec, so this
reference names none — including how the read-only mode is selected.
The constraints already fixed are recorded in §11.3 so F3 inherits them
rather than rediscovering them.

**Whether `update` emits a disclosure is undecided** (IM-13). A newer
pack version can ship an agent file, an executable or a substitution the
applied version did not, so the question is real; F3 owns it. The skill's
obligation is written not to depend on the answer.

**`update`'s failure contract is F3's to state, and nothing here assumes
it.** §5's zero-bytes guarantee is written about the apply, where F1
§F1.6 pins the journal, the lock and `--rollback`. Whether an interrupted
`update` carries the same all-or-nothing property is not settled by Q-62,
and IM-7 is written so the skill behaves correctly either way: a
non-zero exit stops it, whatever was or was not written.

---

## Change history

| Version | Date | Author | Change |
|---|---|---|---|
| v1.1 | 2026-09-01 | specwriter | **Q-63 rename, plus §11 — the command surface.** The binary is **`lintel`** with **`harness` as a command group**, so every usage line here now reads `lintel harness <command>` and the `→` remedy line quoted in IM-19/IM-20 carries the `lintel:` prefix. **New §11 enumerates the surface** the rest of this document only describes: five commands, each with its usage line, what it does, whether it writes, its arguments and flags, its exit classes and its owning feature — flags taken from F1 v2.8 rather than from a list, which is what surfaced that **`--allow-stale-shared` does not exist** (its subject left with `shared/` at Q-48; C-10 survives as the stronger rule that no flag anywhere skips the `payloadDigest` check). Four new requirements make the shape of the surface visible rather than leaving it to be inferred: **IM-38** three of five commands cannot write, **IM-39** an exit class means the same thing on every command, **IM-40** `update` is the only writing command a previous run determines, **IM-41** no flag downgrades an integrity check. F1's error table is **cited and not restated**. `## 11. Reconciliation notes` becomes **§12** and gains three notes: F1's `E-CLI-UNKNOWN-COMMAND` still lists four commands after Q-62, an unknown *group* has no code (F1 known limit 16, recorded not invented), and `update`'s flags await F3. Next free id **IM-42**; next free question **Q-64**, reserved. |
| v1.0 | 2026-09-01 | specwriter | Initial version, written against **Q-62**. Defines the two entry points and which is primary (Q-57), the CLI/skill seam and the rules that keep the skill thin (Q-1), the faithful-disclosure requirement and the fact that the disclosure now gates nothing (Q-54, Q-57), the success and failure experiences including the zero-bytes guarantee and the `→` remedy-line contract, notices versus defects (Q-60), `verify`'s `adapted` state (Q-56), the unfilled-brief interaction rule the packs already implement, **`update`'s replace-or-hand-over shape and the conversational reconciliation the skill owns (Q-62)**, and what v1.0 still declines to offer — `contribute`, a second pack, a changed answer (Q-12). Records the documents Q-62 supersedes and three reconciliation notes. |
| v1.2 | 2026-09-01 | specwriter | **Q-79 fold.** `verify` reports **six** states per path, not four — `filled` and `unfilled` join `match`, `adapted`, `differs`, `missing`. The pair names a path the pack shipped **to be filled in** (`project-brief.md` in every pack, `writing`'s voice guide), and `unfilled` is the state that reports work still owed by the person who applied the pack — which `match` hid, and which made US-33's green run unreachable on any project anybody had actually used. Neither is a failure. This document had deferred to F1 US-33 for the enumeration while also stating the count, which is precisely the shape the fold-check rule exists to catch: the deference was correct and the number beside it was not. |
