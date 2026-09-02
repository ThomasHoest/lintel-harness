# Security

**Not shipped. No release, no users, no vulnerability-reporting process
yet.** This file records the security posture the specification set builds
to, and the two things that must be true before v1.0 goes out.

**Reporting.** The repository is public and MIT licensed, but nothing here
has shipped. Report anything you find to the repository owner via a GitHub
issue, or privately if it is a live vulnerability in a released version —
of which there are none yet.

---

## The threat model, in one paragraph

The CLI writes files into somebody's repository from **pack content**, and
a pack ships with the CLI (there is no registry — Q-2). So the trusted
input is the bundled pack, and everything the format permits a pack to
express is a capability the product hands to whoever authored it. The
design answer is not care at the call sites; it is that **the vocabulary is
finite, the destinations are gated, and the plan is renderable before it
runs**.

---

## The controls that carry the weight

**A closed primitive set.** Six operations, no seventh, no `exec`, no
`script`, no `shell`. Adding one requires a change in three places
including a superseding ADR, and a structural test asserts no seventh
module exists. *A pack can only write text.*

**The write set, not `to`.** Every destination rule is quantified over
every applied path a step creates or changes — never over its `to`. Two of
the six primitives have no `to` at all, and a `to`-keyed rule exempts them
**silently**: that is how the reserved-destination denylist and the deleted
settings policy both lapsed while remaining literally true of the text they
were written about.

**Four-stage path confinement**, with two nominal path types. `AppliedPath`
is the only output of the gate; `HarnessPath` is the CLI's own writes under
`.harness/`. Nothing takes a bare string, so *"write to a path that skipped
the gate"* is a **compile error** rather than a rule somebody remembers.
Stage 4 re-runs immediately before each write, because an ancestor can
become a symlink between planning and writing.

**Everything is planned before anything is written.** The executor reads no
payload file — no template read, no re-render, no re-glob. An execute-time
read would let content change between steps, and that content would have
passed no validation, appeared in no disclosure and been covered by no
digest.

**A journal, and a five-case rollback rule.** Rollback deletes only paths
this apply created, restores only paths it overwrote, and acts on neither
unless the on-disk bytes are still exactly what it wrote — because a
crashed apply leaves a project a user may have started repairing.

**No credential ever reaches a manifest.** Answers are written verbatim
into a file this spec requires to be committed, so a credential-valued
parameter is **forbidden rather than handled**. There is no `type:
"secret"`: an unrecorded answer would make the applied tree
non-recomputable.

**A pack may not touch the agent runtime.** Permission-bearing frontmatter
under `.claude/` is refused, over **two disjoint quantifiers** — the write
set on rendered bytes, and the phase-1 payload set on payload bytes.
`.harness/pack/.claude/` is committed too, so checking only what phase 2
places would leave the shorter route open.

**The disclosure is delimited by a per-run nonce.** Its delimiters were
forgeable by the content they wrap; that finding survived three rounds of
tightening the matching rule and was closed by **replacing the rule**. Pack
content is fixed before the run and the nonce is drawn during it, so the
property became *a pack cannot predict a random value* — falsifiable, where
the previous one could only ever be disproved.

---

## Review status

**F1 and F5:** four Mode-A rounds — 2 CRITICAL → 2 → 0 CRITICAL/2 HIGH →
0 CRITICAL/3 HIGH, conditions holding 24/31 → 36/38. Round 4's findings are
folded. **No `SECURITY-PROCEED` exists against any revision, and none is
claimed.** The standing verdict of record is `REVISE-SPEC`; stopping was a
judgement about diminishing returns on a denylist the spec concedes is
incomplete by construction. **Do not read the closed gate as a clean pass.**

**F2, F3 and F6:** four rounds, ending **`SECURITY-PROCEED`**. C-49…C-62
folded. Two conditions were closed by **dropping a flag** rather than
adding machinery — a removed surface cannot be got wrong.

**This is the ADR gate only. There has been no security-implementation
review**, because the review predates most of the code.

---

## Before v1.0 ships

**Two blockers, both recorded rather than hoped about.**

**1. The `.claude/` permission pin has no runtime version.** `§US-3` and
`§F1.9` obligation 13 both require *"the runtime version the pin was taken
against recorded beside it"*, and **no document in this project names a
Claude Code version**. The implementation records `null` and states the
obligation at the constant, because an invented string would answer *"is
this pin current?"* wrongly and with full confidence. Known limit 21.

**2. A security-implementation review has not run.** The Mode-A passes
reviewed specifications. Everything under `src/` is unreviewed.

Neither is a defect in the code. Both are reasons the code should not ship
yet.

---

## Known limits

`§F1.9` of `specifications/v1.0/F1-spec-pack-format-and-manifest.md` holds
**twenty-two**, each with what it costs and what would close it. The
security-relevant ones:

- **`collisionKey` folds ASCII case only** — full Unicode case folding is
  neither in the stdlib nor safe to approximate, and a *stated* limit on a
  security control beats a silent approximation inside one. It is a
  narrowing, and it is written down as one.
- **C-15's credential matcher does not treat separators uniformly** — so
  *"Your API key"* in a prompt is not matched where *"connection string"*
  is. Recorded rather than widened: broadening a ban changes which packs
  are refused, and that is the spec's decision to take.
- **A pure line-ending edit of the payload is undetectable** — the price of
  immunity to a Windows checkout rewriting every line, which would
  otherwise report a tampered payload on every clone.

Each is a deliberate trade with its cost stated. None is an oversight, and
this file is not the place they are argued — `§F1.9` is.
