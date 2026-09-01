# Security review — Mode A, ADR gate: F2, F3 and F6

**Status:** Complete
**Date:** 2026-09-01
**Mode:** A — architectural validation at the ADR gate
**Subjects:** `F2-ADR-003` (`PROCEED`) · `F3-ADR-004` (`PROCEED`) · `F6-ADR-005` (`PROCEED`, conditions cleared) · their specs, and `F1-spec` **v3.3** where these three depend on it
**Verdict:** **REVISE-SPEC** — one CRITICAL, three HIGH, two MEDIUM, one LOW. See §5.
**Disposition:** all eight conditions folded 2026-09-01 (§6). Round 2 returned `REVISE-SPEC` (§7, conditions C-57/C-58). Round 3 carried the CRITICAL a third time and replaced the matching rule with a nonce (§8, C-59/C-60). **Round 4 closes the CRITICAL and returns `SECURITY-PROCEED` with two conditions** — see §9.

---

## 0. Why this review exists, and what it is not

**F1 had four Mode A rounds. F2, F3 and F6 have had none.** F1's rounds
bounded what a **pack** can do to a machine through the apply engine.
They did not examine what `init`, `update` and the skill do *around* that
engine, and three of this review's findings live in exactly that gap —
in output, in deletion and in a write that leaves the project root.

**Threat model is F1 §7.0's, unchanged**: a local developer CLI, no
network, no registry, and **packs bundled with the published CLI** (Q-2).
That last clause matters for severity and is applied honestly below — a
finding whose adversary is a hostile pack is bounded at v1.0 because the
three bundled packs are authored by this project. It is **not** bounded
at v1.1, when `contribute` (F4) exists and packs arrive from elsewhere.

**Where that reasoning does *not* apply** is stated at C-1, and it is the
reason this review returns `REVISE-SPEC` rather than a pass with
conditions.

---

## 1. CRITICAL

### C-1 — The disclosure block can be truncated by pack content, and the control it defeats is the one that exists because pack content is untrusted

**F1 v3.3** delimits `init`'s security disclosure with two fixed lines:

```
--- lintel disclosure begin ---
--- lintel disclosure end ---
```

**The rows between them include verbatim, multi-line, pack-authored
content.** US-13 requires the disclosure to print *"every pack-shipped
`.claude/agents/*.md` and its whole frontmatter block, verbatim … never
summarised, never truncated"*.

A pack ships an agent file whose frontmatter contains the line
`--- lintel disclosure end ---`. Any consumer that reads to the end
marker — the user's eye, or F6 obeying IM-10 — stops there. **Everything
after it is invisible**: the `0755` paths, the `tools:` grants on agents
declared later in the block, the substituted values. The truncated block
is well-formed, correctly delimited, and shorter. **Nothing looks wrong.**

**Why this is CRITICAL and not HIGH, despite the bundled-pack threat
model.**

1. **The control's entire purpose is to be trustworthy against pack
   content.** The disclosure exists because a pack is not trusted; a
   delimiter that pack content can forge is not a control, it is a
   convention. Bounding it by "our packs are friendly" removes the reason
   the disclosure exists.
2. **It is a regression against a recorded condition.** `C-9 —
   substitution may not forge a marker` was raised in F1's own rounds. Its
   marker-lex half was **removed at Q-45** on the explicit ground that
   *"anchors are inert, so a forged one hijacks nothing"*, with a
   **v1.1 obligation to restore the lex check when something starts
   reading markers**. F1 v3.3 introduced a marker that **something reads
   immediately** — F6, by IM-10 — and did not consult that obligation.
   The condition was recorded, the trigger arrived, and the check was not
   restored.
3. **F6 is required to relay the block faithfully**, so the truncation
   propagates from the CLI into the conversation the user is having, with
   the skill's authority behind it.

**Required.** Pick one, and state it in F1:

- **(a) Containment check.** Before emitting, `init` scans the assembled
  rows for either sentinel line and fails with a code if found —
  fail-closed, zero bytes, on the reasoning F1 applies everywhere else to
  a value in a behaviour-selecting position. `validate` should raise the
  same finding so a pack cannot ship the fault at all.
- **(b) Length-prefixed block.** The begin line carries a byte count and
  the consumer reads exactly that many bytes. Robust, but it makes the
  delimiter carry a number — which F1 v3.3 explicitly rejected, and the
  rejection was right for other reasons.

**(a) is recommended**, and it is what C-9's lex check was. **This
finding is mine**: F1 v3.3 was written in this session, and the
obligation it should have consulted is in the same document.

---

## 2. HIGH

### H-1 — No rule anywhere bounds control characters in CLI output carrying pack content

`E-SUBST-NEWLINE` bans `\n`, `\r`, `U+2028` and `U+2029` in a **substituted
value written into a file**. **Nothing bounds what reaches a terminal.**
The disclosure prints applied paths, parameter values and whole
frontmatter blocks; `promptFor` renders a pack-authored `prompt` string;
`update`'s report prints paths and, at M-2, file content.

ANSI escapes in any of those can clear the screen, reposition the cursor
over text already printed, or recolour a warning into invisibility — so a
pack can **erase the disclosure it just triggered**, or make a prompt ask
a different question from the one being answered.

**Required.** F1 states a single output rule: **C0 control characters
other than `\n` and `\t`, and `U+2028`/`U+2029`, are escaped or refused in
every diagnostic, prompt and disclosure row.** One rule, stated once,
applied by `src/diag/` — not per call site, which is how half of them get
missed.

### H-2 — `update`'s delete path has no write-time confinement re-check

**C-14 requires `executeApply` to re-run confinement immediately before
each write**, because the plan's `lstat` is stale by the time the write
happens. `F3-ADR-004` introduces **deletion** — payload orphans, journal
`intent: "delete"` — and states no equivalent.

Between plan and execute, a path that was an ordinary file can become a
**symlink**. Deleting a symlink removes the link, not the target, so this
is not arbitrary file deletion — but `update` also **backs up the
pre-apply bytes** into `journal.d/` before removing, and reading through a
symlink to capture them reaches outside the project. **The delete path
needs the same `confineAtWrite()` treatment as the write path**, and the
absence is a gap in a control C-14 states as absolute.

**Required.** F3 states that deletion re-confines immediately before
acting, with `lstat` on the target, and that a path whose type changed
since planning is refused rather than deleted.

### H-3 — `skill install --user` leaves the project root, and no rule follows it there

Every confinement guarantee in F1 is expressed against the project root.
`F6-ADR-005` §3.1 gives `skill install` a `--user` flag that writes to the
**user profile** — the only write in the product that deliberately leaves
that root, and therefore the only one no existing rule covers.

`F6-epics` T-2606 says the destination is *"constructed and confined
explicitly, never assembled from a string"*. **That is a task instruction,
not a specified rule**, and a task is not where a confinement boundary
belongs.

**Required.** F6's spec states the `--user` root as a **second confinement
root** with the same properties as the project root: resolved, `lstat`ed
at every ancestor, no symlink followed, no traversal, and a branded path
type that is the only way to obtain a destination under it. If that is
more machinery than the flag is worth, **drop `--user`** — a
project-local install is sufficient for v1.0 and costs nothing.

### H-4 — A pack may ship `.claude/skills/**` and impersonate the official skill

The reserved-destination class-2 list is `.github`, `.vscode`, `.idea`,
`node_modules`, `.circleci`, `.devcontainer`, plus named basenames.
**`.claude/skills/` is not reserved**, and no rule forbids a pack placing
content there.

A pack shipping `.claude/skills/lintel/SKILL.md` installs instructions
that Claude Code will follow **under the harness's own name**, alongside
or instead of the skill `skill install` places. The frontmatter checks
(`E-CLAUDE-TOOL-GRANT`, `E-CLAUDE-PERMISSION-MODE`) bound what it may
*declare*; they bound nothing about what it may *instruct*.

**Bounded at v1.0** by the bundled-pack model, which is why this is HIGH
and not CRITICAL. **Unbounded the moment F4 ships.**

**Required.** Add `skills` to the reserved-destination names at any
`.claude` segment, on exactly the reasoning that reserved
`settings.json`: a pack may not install instructions into the agent
runtime of the project it is applied to. `skill install` is a **CLI**
write and is unaffected — the reservation binds recipe steps.

---

## 3. MEDIUM

### M-1 — `expectedNew` puts unbounded pack content into `update`'s human report

`F3-ADR-004` carries rendered bytes for every `kept-edited` path so F6 can
show what the pack changed (Q-77). Correct for `--json`, where the bytes
are escaped. **The human report has no such framing**, so it inherits both
C-1 (marker forgery, if the report is ever delimited) and H-1 (control
characters), and adds a third: a large file makes the report unreadable.

**Required.** The human report prints a **bounded excerpt** — a stated
line cap with an explicit truncation notice — and `--json` remains the
complete channel. Never silently truncate: F1's own rule for the
disclosure is *never summarised, never truncated, never counted*, and a
report that quietly drops content while looking complete is the same
fault this review opened with.

### M-2 — `verify` and `update` share one comparison, and that is now a security-relevant coupling

`F3-ADR-004` has `classify.ts` call `verify/compare.ts` — correct, and
the alternative is worse. But it changes the risk class of that module:
**`verify` reports, `update` writes.** A comparison defect that was a
reporting bug is now a data-loss bug, and `verify` is simultaneously the
acceptance test for **S7**.

Not a defect. **Recorded so it is not rediscovered**, and so the fixture
suite treats `compare.ts` as security-relevant rather than as reporting
code. T-2303 (agreement on a shared fixture) and T-2405 (corrupt payload →
zero bytes) are the right tests; they should be marked as such.

---

## 4. LOW

### L-1 — `skill install --force` appears in a task and in no specification

`F6-epics` T-2607 has an existing installation *"refused rather than
overwritten unless `--force`"*. **`--force` is a reserved CLI flag** whose
meaning F1 fixes for `init` — the pre-existing-path rule of US-13. Reusing
the name for a different behaviour on a different command, specified
nowhere, is how a flag acquires two meanings.

**Required.** Either specify it in F6 with its own semantics stated, or
drop it and refuse unconditionally.

---

## 5. Verdict

**REVISE-SPEC.**

A CRITICAL finding forecloses `SECURITY-PROCEED`, and this one is not a
technicality: the disclosure is the product's only pre-write
accountability mechanism, and **C-1 shows it can be defeated by the class
of input it exists to describe.**

**The three ADRs' architectural verdicts are not disturbed.** None of
these findings says a feature is wrongly designed. C-1 and H-1 are about
**output**, H-2 about a control not carried into a new operation, H-3
about a boundary that was named in a task instead of a spec, and H-4
about a denylist that did not grow when a new destination became
meaningful. All are additive.

**Conditions, in the order they should be met:**

| # | Condition | Owner |
|---|---|---|
| **C-49** | The disclosure block is proof against forged delimiters — containment check, fail-closed, in `init` **and** in `validate` (C-1) | F1 |
| **C-50** | One output rule for control characters, stated once and applied in `src/diag/` (H-1) | F1 |
| **C-51** | Deletion re-confines immediately before acting, exactly as writing does (H-2) | F3 |
| **C-52** | `--user` has a specified second confinement root with a branded type, **or is dropped** (H-3) | F6 |
| **C-53** | `skills` joins the reserved names at any `.claude` segment (H-4) | F1 |
| **C-54** | `update`'s human report bounds excerpt length with an explicit truncation notice (M-1) | F3 |
| **C-55** | `compare.ts` is marked security-relevant in the fixture suite (M-2) | F1 |
| **C-56** | `skill install --force` is specified or dropped (L-1) | F6 |

**A note on C-1's provenance, because it bears on how the next round
should read this document.** F1 v3.3 introduced the sentinels earlier in
the same working session that produced these ADRs, to discharge a
condition of `F6-ADR-005`. The obligation it should have consulted —
C-9's, recorded in the same specification — was two thousand lines away
in a disposition table nobody re-reads. **That is the failure mode this
project has now hit four times**, and it is the argument for the
fold-check rule applying to *security conditions* and not only to
cross-cutting documents. A condition marked "v1.1 obligation" needs to be
consulted by the change that creates its trigger, and nothing currently
makes that happen.

---

## 6. Conditions folded — 2026-09-01

All eight, in the same session the review ran. **This is not a
`SECURITY-PROCEED`.** The verdict stands at `REVISE-SPEC` until a
re-review examines the folds; a reviewer's conditions being met is a
precondition for a pass, not the pass itself.

| # | Folded as |
|---|---|
| **C-49** | **F1 v3.4** — `E-DISCLOSURE-FORGERY`, exit 2, zero bytes, catalogue **87 → 88**. Scanned by `init` before emitting **and** by `validate` at **step 11**, over the same rendered set, so a pack cannot ship the fault. **Joins step 11 rather than adding a fifteenth**, so the runner is not renumbered. Tasks T-0114, T-0806, T-1221 |
| **C-50** | **F1 v3.4 §NFR** — one escaping function in `src/diag/`, applied to every diagnostic, prompt and disclosure row. **Escaped, not refused**: legitimate content should print rather than abort a run. Task T-0113 |
| **C-51** | **`F3-ADR-004` §9** — deletion re-confines immediately before acting, `E-TARGET-RACE` on a type change. Task T-2407 |
| **C-52** | **`F6-ADR-005` §9 — `--user` dropped.** Specifying a second confinement root, with its own brand and ancestor walk, to serve a convenience was not the trade. Tasks T-2606, T-2706 rewritten |
| **C-53** | **F1 v3.4** — `skills` reserved at any `.claude` segment. Task T-0211 |
| **C-54** | **`F3-ADR-004` §9** — bounded excerpt with an explicit truncation notice; `--json` stays complete. Task T-2508 |
| **C-55** | **F1 v3.4 §F1.9 known limit 18** — `compare.ts` recorded as security-relevant, and T-1221 says not to trim its tests |
| **C-56** | **`F6-ADR-005` §9 — `--force` dropped**; `E-TARGET-EXISTS` unconditionally. Task T-2607 rewritten |

**Two conditions were closed by removing a flag rather than adding
machinery** (C-52, C-56), and that is worth naming as a pattern: **the
cheapest way to close a finding about a surface is usually to not have
the surface.** Both flags were conveniences; both cost more to secure
than they returned.

**The closing note of §5 is not discharged by this fold.** It argued that
the fold-check rule must cover **security conditions** and not only
cross-cutting documents — C-9's obligation named this exact trigger and
sat two thousand lines away in a disposition table the change never
consulted. **Nothing in this fold makes that happen next time.** It
belongs in the coding pack's spec process, where the fold-check rule
already lives, so it propagates to every project the pack applies to.

---

## 7. Round 2 — over the folds, 2026-09-01

**Verdict: `REVISE-SPEC`. One CRITICAL carried, one HIGH new.** The eight
conditions were folded in good faith and four of them are closed
outright. **C-49 is not**, and the reason is worth reading carefully,
because the fold looks complete and is not.

**Closed outright, no residue:** C-51 (deletion re-confines), C-52
(`--user` dropped — a removed surface cannot be got wrong), C-53 (`skills`
reserved; verified no bundled pack ships such a path), C-55 (recorded),
C-56 (`--force` dropped). **C-54 closed with a note** — the bounded
excerpt is correct, and it now depends on C-50, which is itself carried.

### C-1 (CARRIED, CRITICAL) — the containment check's comparison is unspecified, so the check and its consumer can disagree

F1 v3.4 says the assembled rows are *"scanned for **either sentinel
line**"*. **It does not say what "is a sentinel line" means**, and every
plausible reading gives a different answer:

| Pack ships | Exact-match check | A consumer doing `line.trim() === marker` |
|---|---|---|
| `--- lintel disclosure end ---` | **catches** | matches |
| `--- lintel disclosure end --- ` *(trailing space)* | **misses** | **matches** |
| `  --- lintel disclosure end ---` *(leading spaces)* | **misses** | **matches** |
| `--- LINTEL DISCLOSURE END ---` | **misses** | matches if the consumer folds case |

**The truncation attack survives any check stricter than its consumer.**
This is the same finding as C-1, one level down: the control is now
present and its *matching rule* is the unbounded part. A reviewer reading
"scanned for either sentinel line" would reasonably assume it is closed.

**Required (C-57).** State the comparison **normatively and on both
sides**, and make the emitter's check **deliberately more liberal than
any consumer could be**:

- A line is a sentinel candidate if, **after trimming ASCII whitespace
  from both ends and ASCII-case-folding**, it equals either marker.
- **Any candidate is `E-DISCLOSURE-FORGERY`** — not only an exact match.
- F6's reference material states the **same** rule for capture, so the
  two cannot drift apart.

Over-refusing is the correct direction: a pack whose content legitimately
contains a line resembling the marker has a one-line problem it can see
and fix, and the alternative is a control that fails silently.

### C-2 (NEW, HIGH) — C-50's escaping and C-49's scan have no stated order, and the wrong order defeats both

F1 v3.4 requires control characters escaped in every disclosure row
(C-50) and the rows scanned for sentinels (C-49). **Neither says which
runs first**, and each order fails differently:

- **Escape, then scan.** The scan now runs over *escaped* text, so a raw
  sentinel line has become a visibly escaped string and no longer matches
  — while the bytes a naive consumer reads may still be the marker. The
  check stops firing on the case it exists for.
- **Scan, then escape** — correct, but only if the scan sees the raw
  bytes, which is what C-57's normalization must operate on.

There is also a case neither order catches on its own: a pack ships
`--- lintel disclosure\x08 end ---`. Escaping renders the `\x08`
visible, so the terminal is safe — but a consumer reading the **raw**
stream, which is what IM-10 asks F6 to do, sees a backspace that many
terminals and some parsers collapse.

**Required (C-58).** State the order — **scan first, over raw bytes,
then escape** — and fold the control-character rule into C-57's
normalization: a line is a candidate if it matches **after stripping C0
characters as well as whitespace**. One normalization, applied once,
before anything else touches the row.

### What this round did not find

**No new finding against F2, F3 or F6's architecture**, and none against
the two dropped flags. The three ADR verdicts are undisturbed for a
second round. Both findings here are about **the specification of a
mechanism**, not about whether the mechanism is the right one — which is
the expected shape for a round following a fold, and is a good sign
rather than a bad one.

### Conditions

| # | Condition | Owner |
|---|---|---|
| **C-57** | The sentinel comparison is specified normatively on **both** sides — trimmed, ASCII-case-folded, C0-stripped — and the emitter refuses **any candidate**, not only an exact match (C-1 carried) | F1, with F6 restating the identical rule |
| **C-58** | The order is stated: **scan raw, then escape**, over one shared normalization (C-2) | F1 |

**Verdict: `REVISE-SPEC`.** A carried CRITICAL forecloses a pass. **Both
conditions are narrow and neither reopens a design decision** — this is
now a matter of specifying a comparison precisely, which is exactly where
a review of a fold should end up if the fold was made in good faith.

---

## 8. Round 3 — over C-57 and C-58, 2026-09-01

**Verdict: `REVISE-SPEC`. The CRITICAL is carried a third time — and the
third instance is the finding.**

### C-1 (CARRIED, third round) — ASCII whitespace is narrower than the trim every consumer actually uses

C-57 specified the normalization as *"strip C0 control characters, trim
**ASCII** whitespace, ASCII-case-fold"*. Measured against the consumer it
must dominate:

| Pack ships | C-57's ASCII trim | JavaScript `.trim()` |
|---|---|---|
| marker + ASCII space | **catches** | matches |
| marker + `U+00A0` NBSP | **misses** | **matches** |
| marker + `U+2003` em space | **misses** | **matches** |
| `U+3000` + marker | **misses** | **matches** |

`String.prototype.trim` removes Unicode whitespace, so **a consumer using
the obvious stdlib call trims characters the check does not** — and the
truncation attack works again. **This is round 2's finding with a
different character class**, and that is the point rather than an
embarrassment.

**The pattern is now the finding.** Three rounds, three fixes, each
tightening the emitter's comparison, each defeated by a slightly wider
consumer normalization. **That is an arms race the emitter cannot win**,
because it is trying to enumerate every way a reader might decide two
strings are "the same", and the reader is not obliged to tell it.

**The ASCII narrowing was not carelessness — it was Q-81 applied where it
does not fit.** `collisionKey` folds ASCII only because full Unicode case
folding needs tables and a dependency, and that limit is documented and
correct. **Trimming is different: `String.prototype.trim()` is stdlib,
Unicode-aware, and costs nothing.** Q-81 forbids dependencies, not
correctness. Reaching for ASCII here was a habit carried from a decision
that had a real reason, into a place where the reason does not apply —
worth naming, because it is how a sound constraint becomes a bug.

### C-59 (REQUIRED) — stop making the marker match-proof and make it unguessable

**Structural fix, and it ends the class rather than the instance.** The
begin line carries a **per-run nonce**, and the end line repeats it:

```
--- lintel disclosure begin 7f3a9c2e ---
… rows …
--- lintel disclosure end 7f3a9c2e ---
```

- **A pack cannot forge what it cannot predict.** The nonce is generated
  per invocation, so shipped content cannot contain it. No normalization
  question arises, because there is nothing to normalize *against* — the
  consumer matches the nonce it read from the begin line.
- **The containment check survives and gets simpler**: refuse content
  containing the nonce, which is now a probabilistic near-impossibility
  rather than a matching rule.
- **It does not reintroduce what v3.3 rejected.** v3.3 refused a
  delimiter carrying a **version or a row count**, because a consumer
  would have to *know* them in advance and could be broken by an added
  row. **A nonce is read, not known** — it creates no compatibility
  surface and cannot go stale.
- **Cost, stated:** the disclosure is no longer byte-identical between
  two runs of the same apply. **F1's determinism guarantee is about
  applied trees and manifests, not stdout**, so nothing that G-F1-4
  promises is weakened — but any test asserting the disclosure verbatim
  must match the nonce as a pattern, and `T-2203`/`T-2701` need that
  said.

### M-3 (MEDIUM, new) — the duplicated rule's mitigation is asserted, not specified

`F6-ADR-005` §10 accepts that the sentinel rule is stated in two places
that cannot share an implementation, and names `T-2707` as the mitigation.
**`T-2707` checks command and flag names** — mechanical string comparisons
against a known list. **Comparing a normalization rule written in English
to one written in code is not the same kind of check**, and calling it
covered overstates what that task does.

**C-59 dissolves most of this**: with a nonce there is no normalization
rule to keep in sync, only "match the nonce from the begin line". The
residue is small enough to state and drop.

### Conditions

| # | Condition | Owner |
|---|---|---|
| **C-59** | The disclosure delimiters carry a **per-run nonce**, read by the consumer from the begin line. The containment check refuses content containing the nonce. Tests match it as a pattern | F1, with F6 restating the read-the-nonce rule |
| **C-60** | Where a normalization is still needed anywhere, it uses **`String.prototype.trim()`**, not a hand-rolled ASCII trim. Q-81 forbids dependencies, not stdlib correctness | F1 |

**Verdict: `REVISE-SPEC`.** A carried CRITICAL forecloses a pass — for the
third time, and correctly. **What changed in this round is the shape of
the fix**: rounds 1 and 2 patched a comparison, and this one removes the
need for one. **A round 4 must still confirm it**; a reviewer who
recommends a structural change does not get to certify it in the same
breath.

---

## 9. Round 4 — over the nonce, 2026-09-01

**Verdict: `SECURITY-PROCEED`, with conditions C-61 and C-62.**
**The CRITICAL is closed.** Two new findings, both HIGH-or-below, neither
reopening it.

### C-1 — CLOSED

Prediction-based forgery is gone, and the argument is short enough to
check rather than trust:

- **Pack content is fixed before the run.** Packs are static files
  bundled with the CLI; the nonce is generated per invocation from
  `node:crypto`. A pack cannot contain a value that did not exist when it
  was authored.
- **The user cannot supply it either.** Substituted answers reach the
  disclosure verbatim, so `--set` was worth checking — but argv is parsed
  before the nonce exists, and the user is the party being protected, not
  the adversary.
- **A stale nonce is inert.** Content containing a *previous* run's nonce
  matches neither this run's check nor this run's begin line.

**The property is now falsifiable**, which is the real gain over three
rounds of matching rules: *"a pack cannot predict a random value"* can be
argued about and tested. *"Our comparison dominates every consumer's"*
could only be disproved, repeatedly, by finding one more consumer.

### H-5 (NEW, HIGH) — the design is correct only if every consumer matches the *exact* nonce, and nothing makes a sloppy one safe

The nonce defeats a pack that tries to forge **the delimiter it will
see**. It does nothing against a pack that ships a line of the right
**shape** with a different value:

```
--- lintel disclosure end deadbeef ---
```

A consumer matching the **exact nonce it read** ignores this — correct,
and it is what F1 v3.6 and F6 both specify. **A consumer that
pattern-matches the delimiter shape re-syncs on it and truncates.** That
is a consumer bug, but "the design is safe provided every reader
implements it exactly" is the assumption C-1 was about in the first
place, and the CLI can remove it for nearly nothing.

**Second reason, and it is not secondary.** With the nonce alone,
`E-DISCLOSURE-FORGERY` becomes **probabilistically unreachable** — a code
that can essentially never fire is a code nobody exercises, nobody
maintains, and quietly rots. **A shape-based refusal gives it a real,
testable trigger** and keeps the check alive.

**Required (C-61).** The containment check refuses any row matching the
delimiter **shape** — `--- lintel disclosure (begin|end) <hex> ---` under
the C-60 normalization — **regardless of the nonce value**, not only rows
containing this run's nonce. Defence in depth, one regex, and it restores
a trigger the fixture suite can assert.

### M-4 (NEW, MEDIUM) — the nonce's scope is unstated, and the obvious over-application breaks a machine contract

**`pack info` also renders disclosure content** (F1 §F1.3: *"the
disclosure line in `init`'s pre-write summary and in `pack info`"*), and
`pack info --json` is a **machine contract** that **G-F1-9** rests on —
a reader must be able to see what an apply will do without running it.

F1 v3.6 introduces the nonce under US-13 and **does not say where it
applies**. An implementer folding C-59 uniformly would put a nonce in
`pack info` too, making its output — including `--json` — **different on
every invocation**, which breaks golden-file tests and any consumer
diffing two runs.

**Required (C-62).** State the scope: **the nonce belongs to `init`'s
delimited stderr block and nowhere else.** `pack info` renders disclosure
*rows* inside a `PackReport`; it emits **no delimiters**, needs none —
nothing captures a substring from it — and stays **deterministic**.

### What round 4 did not find

**No finding against the nonce mechanism itself**, and none against C-51,
C-52, C-53, C-54, C-55, C-56, C-58 or C-60, all re-checked. **The three
ADR verdicts are undisturbed for a fourth round.**

### Conditions

| # | Condition | Owner |
|---|---|---|
| **C-61** | The containment check refuses the delimiter **shape**, any nonce value, not only this run's — defence against a pattern-matching consumer, and it restores a testable trigger to `E-DISCLOSURE-FORGERY` | F1 |
| **C-62** | The nonce's scope is stated: **`init`'s delimited block only.** `pack info` emits no delimiters and stays deterministic, including `--json` | F1 |

### Verdict

**`SECURITY-PROCEED`.** The CRITICAL that opened this review across four
rounds is closed by a mechanism whose security property is stateable and
testable rather than by a rule that had to out-guess every reader.
**Both remaining conditions are hardening and scoping**; neither is a
defect in what was decided, and neither blocks implementation.

**What this verdict does not cover, stated so it is not over-read:**
this is F2, F3 and F6 at the **ADR gate**. It is **not** a
security-implementation review — that runs at the code gate, and there is
no code. It says nothing about F1 or F5, whose standing verdict remains
`REVISE-SPEC` **by decision** (four rounds, stopped on diminishing
returns, no `SECURITY-PROCEED` claimed). And it rests on specifications:
**every finding here was found by reading, and the fixture suite is what
will find the next one.**
