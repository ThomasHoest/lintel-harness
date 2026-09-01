# Next session — queue

Picked up cold, this is what to do and in what order. Delete when spent.

---

## 0. Uncommitted right now

Six files, none committed:

```
specifications/v1.0/F1-epics-and-tasks-pack-format-and-manifest.md
specifications/v1.0/F2-spec-init-apply-engine.md
specifications/v1.0/F3-spec-update.md
specifications/v1.0/F6-spec-claude-code-skill.md
specifications/v1.0/F5-ADR-002-template-packs.md
token-efficiency-notes.md
```

Commit these first. Nothing else is pending; the tree was clean before
wave 1.

## 1. Three decisions — take these before commissioning anything

Each is cheap to answer and each unblocks work that is otherwise
guesswork. **Answering them first is the single biggest saving
available.**

**Q-79 — the adapt-expected set is too narrow, and it breaks the release gate.**
F5 asserts no applied path other than the generated `CLAUDE.md` is
adapt-expected. But `project-brief.md` (user fills) and the voice guide
(skill fills) are ship-to-be-filled. A filled file reports `differs`, so
`verify` exits 1 and **S7 is unreachable on any real project** — it
passes today only because nobody has filled the brief. Either widen
adapt-expected to cover ship-to-be-filled files, or S7 needs restating.

**U-14 — ratify or reject the zero-runtime-dependency posture.**
`general/technology-choices.md` §7.1 proposes it but records it as
unratified. It governs **six of F1's fourteen blocked tasks at once**:
strict JSON (U-1), schema validation (U-2), glob (U-3), frontmatter
(U-6), semver (U-8), test runner (U-10). One answer turns each into
"hand-roll" or "take a library".

**Q-80 — does US-24's difference enumeration widen, or does `coding` revert?**
F5's ADR found class (e) is not empty: 38 changed paths, at least four
unadmitted classes. It recommends widening but did not decide. This is
Q-6's territory, so it belongs in the brief. **F5's epics are blocked
until this and the ADR's other findings are resolved.**

Sixteen further questions are open (Q-65…Q-80) from wave 1. Most are
feature-local and can be resolved inside their own ADR; the three above
are not.

## 2. The batched F1 + ADR-001 fold

Four separate agents independently flagged this. Do it as **one pass**,
not four.

**F1 needs:**
- **Four new codes** (78 → 82), all requested by F3's spec:
  `E-UPDATE-AVAILABLE`, `E-UPDATE-NOT-NEWER`,
  `E-UPDATE-PARAM-UNANSWERED`, `E-UPDATE-SCAFFOLD-DROPPED`
- **A `notice`-class code for the `link()` fallback** — US-13 requires
  diagnostics to "record the narrowed guarantee" and no code exists, so
  it is assertable only by string-matching, which §Error States forbids
- **Journal version 3** with `intent: write|delete` — `update` deletes
  payload orphans and F1's five-case rollback table models no deletion
- **The journal must record which command wrote it** —
  `E-JOURNAL-PRESENT`'s remedy unconditionally says `init --rollback`,
  which after a crashed `update` lands on `E-ALREADY-APPLIED`
- **`--dry-run` added to US-8's reserved-flag list**, or a pack can
  declare `"flag": "dry-run"` and shadow the read-only mode
- **Stale Q-62 text**: `E-ALREADY-APPLIED`'s message says "update lands
  in v1.1"; US-14 says the same; §What-is-NOT-in-scope still defers
  `update`/`status`; §F1.9's forward-investment table describes `update`
  as merging against a recomputed base — wrong twice
- **Four codes F2 needs that do not exist** — unknown pack name, missing
  `<pack>` positional, `--set` naming an undeclared id, an enum
  parameter neither required nor defaulted

**ADR-001 needs** (it was written against F1 v2.1; the spec is v2.9):
`VerifyState` still `match | partial | differs | missing` with C-22's
dead `ownedKeysChecked`; the command surface still four commands with no
group; `adaptExpected` absent entirely; **no module for the `.claude/`
frontmatter reader** though three codes ride on it; surviving
`ConsentInputs` / `src/security/consent.ts` after Q-54 deleted the gate;
`src/cli/main.ts` still dispatching four commands.

## 3. F5 revision, then its epics

F5's ADR-002 returned **`REVISE SPEC`**. Beyond Q-80:

- *"planning is the only pack with a parameter"* is false — coding 2,
  writing 3, planning 1. True claim: planning is the only pack with a
  `when` over an answer
- `writing` has **three** authored templates, not two
- `writing`'s 7b index steps describe a mechanism that does not exist
  (one rename, not per-destination; the scaffold ships 12 pre-authored
  `index.md` files)
- planning's payload inventory omits `process.md`, `conventions.md`,
  `coordination.md`, `agents/README.md`
- F5 §Scope and §Out of Scope **still defer `update`/`status`** after
  Q-62 returned them
- `interaction-model.md:418` says `scout.md` can read the brief; it has
  no `Read` tool and the pack handles it honestly — the doc is wrong

**Pack work the ADR found** (separate from the spec revision):
- `coding` and `writing` **declare no `provenance`** — the exact
  condition F1 added the field to catch, and it passes `validate`
  silently because F1 has no code for absence
- `packs/coding/README.md` **fails four of US-28's five criteria** —
  largest outstanding pack item

## 4. Waves 2 and 3

**Wave 2** — ADRs for F2, F3, F6 (parallel), plus F5's epics once §3 is
done.
**Wave 3** — epics for F2, F3, F6.

Then a **Mode A security pass over F2, F3 and F6**, which have never had
one. F1's four rounds do not cover them.

## 5. Counters — next free

| | |
|---|---|
| Question | **Q-81** |
| User story | **US-99** |
| Epic | **E-13** |
| Task | **T-13xx** (Scheme A, epic-derived) |

Retired, never reusable: **US-5, US-6, US-7, US-11, US-12** (F1),
**US-22, US-23** (F5). US-11 and US-12 covered drift reporting and the
merge base — F3 re-covers that ground under fresh ids, deliberately.

`CLAUDE.md`'s counter table still reads "none" for Epic and Task. It
needs **E-12 / T-1218** recording from wave 1.

## 6. How to spend less doing it

From `token-efficiency-notes.md`, the four that matter here:

- **Reserve disjoint ID blocks up front** for any parallel writers. Three
  collisions in one session; each cost a full reconciliation pass.
- **Brief agents with section pointers, not document names.** "Read F1"
  is a 3,600-line instruction.
- **Do mechanical edits directly.** Renames, counter updates and
  stale-line fixes do not need an agent.
- **Check the `general/` documents in the same pass as the fold**, not
  after someone notices.
