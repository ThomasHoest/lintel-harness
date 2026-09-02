# `lintel harness update` — the reconciliation

Load this before starting a reconciliation.

`update` moves a project to a **newer version of the pack it already
applied** — never to a different pack. It recomputes what the applied
version would produce and what the newer version produces, compares both
against what is on disk, and then:

- a file you have not touched is **replaced outright and silently**;
- a file you have edited is **left exactly as it is, and reported**;
- a file the pack declared as one to adapt or to fill is **never blindly
  replaced**.

**There is no merge engine, no three-way merge, no diff output and no
conflict markers.** The command stops where computation stops. What is
left is judgment, and judgment is yours and the user's — that is what
this file is about.

**An edited path left untouched is the mechanism working.** It is not a
conflict, not an error and not damage. Report it as work handed over,
never as work failed.

---

## 1. Get the structured report first

```
lintel harness update --dry-run --json
```

**`--json` is accepted only alongside `--dry-run`.** The writing mode has
no `--json`, so this is where the structure comes from — and it is also
the mode in which reading can change nothing.

**Run this before the writing run and keep the result.** It is what
carries the pack's side of every edited path, and after the update has
run the project is a different project. Relay the human rendering of the
read-only mode to the user as well; the structured form is for your own
reasoning, not a substitute for showing them what the tool said.

Each entry carries:

- **`path`** — the applied path;
- **`disposition`** — what `update` did or would do about it, one of
  `added`, `unchanged`, `replaced`, `kept-adapted`, `kept-edited`,
  `kept-fill-expected`, `orphaned`;
- **`state`** — what the comparison against the applied version found,
  which is a different axis and is not derivable from the disposition;
- whether the **pack** also changed that path, which is not the same
  question as whether the user did;
- **`expectedNew`** — for a `kept-edited` path, **the bytes the newer
  pack produces there**.

The counts are per disposition. **Relay them as emitted**; do not group,
sort or summarise them in place of relaying.

---

## 2. Run the update, then stop or continue

```
lintel harness update
```

Relay the whole capture (`SKILL.md` §2).

- **Non-zero exit → stop.** No reconciliation, no writes, relay the
  diagnostic.
- **Exit `0` → reconcile.** Exit `0` with edited paths outstanding is the
  normal, successful outcome of this command and the reason this skill
  exists.

---

## 3. Reconcile, one path at a time

For each reported path, in the order the CLI reported it:

### 3.1 Name the path and its classification

State the path and the disposition **as the CLI reported it**. The
classification is a computed fact. You do not check it, re-derive it or
second-guess it, and you never assert a classification the CLI did not
report.

### 3.2 Show what the pack changed — as content

For a `kept-edited` path, the pack's new content is `expectedNew` from
§1. **Show it.** *"The pack tightened that section and you'd added a note
there"* is a characterisation, not the content, and it is not a
substitute for it.

**Where the report does not carry the pack's side for a path, say so
plainly and stop there for that path.** Do not reconstruct it. In
particular:

- **Never render it yourself.** Producing by hand what a recipe step
  would have produced is precisely what you must not do.
- **Never read it out of the tool's own directory.** What is stored there
  is **payload source** — before substitution, before path rewriting,
  before generation — so for any file the pack transforms it is simply
  not what the pack produces. Reading it and presenting it as the pack's
  version would be confidently wrong.

If you cannot show the pack's side for a path, then **"take the pack's
version" is an outcome you cannot deliver for it.** Say that, and offer
only the outcomes you can.

### 3.3 Show what the user changed — as content

The file on disk is the user's side. You may read it, and you show it.

### 3.4 Length is not an exemption

Where either side is too long for one message, **split it across turns**
rather than compressing it. Compressing the two sides is the same
violation as summarising the disclosure, one command later.

### 3.5 Ask

State a recommendation **with your reason** if you have one. Then put the
decision to the user.

**You must not silently pick a side.** Not the pack's version, not the
user's, not a blend of your own devising. You may recommend; you may not
decide.

**What counts as a decision:**

- a user message that names an outcome for that path — take the pack's
  version, keep mine, this specific blend, leave it for now; **or**
- a user message that **ratifies a recommendation you have already
  shown** for those paths; **or**
- a blanket instruction that names an outcome ("take the pack's version
  everywhere"), which is a decision and is recorded as one.

**What does not count:** *"you decide"*, *"just pick whatever's best"*,
silence, or an instruction to be quick. On any of those, state your
recommendation and **ask again**. Ending a session with nothing written
because the user never decided is the correct outcome, not a failure.

A path written without a preceding user message naming an outcome for it
is a violation **whether or not you picked what they would have picked**.
The test is whether the decision was put to them.

### 3.6 Write only that path, only as decided

Write nothing else. Do not tidy neighbouring files, do not re-adapt
`CLAUDE.md` beyond what this update requires, and do not resolve a path
by editing the payload or the manifest — both live under the tool's own
directory and are never yours to touch.

A path the user deferred is **left byte-identical**.

---

## 4. Finish

- Give a **per-path summary**: what was decided for each reported path,
  the deferred ones included and named as outstanding.
- Run `lintel harness verify` and relay **both** counts — paths checked,
  and paths reported as adapted.

Adapt-expected paths read as adapted; nothing should read as differing.
If a path **you** wrote reads as differing, report that as your own
defect, name `E-VERIFY-MISMATCH` and the path, and put the choice to the
user. Do not silently revert it, and do not re-run anything to make the
report go away.

---

## 5. Two things to keep straight

**`verify` and `update --dry-run` are different questions.** `verify`
asks *does this project still match the version it applied?*
`update --dry-run` asks *is there a newer version, and what would it
change?* A project can be clean under `verify` and several versions
behind. Never offer one for the other.

**An update is not reproducible from its arguments.** The same command in
two projects at the same pack version does different things, because
`update` alone reads what a previous run wrote. Say so before running it,
so the user does not carry a wrong expectation about repeatability.
