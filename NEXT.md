# Next session — queue

Picked up cold, this is what to do and in what order. Delete when spent.

---

## 0. State

Wave 1 is committed and pushed (`27c6d93`). The three §1 decisions are
**taken** and recorded in `specifications/project-brief.md` §12 as
**Q-79, Q-81 and Q-80**. `CLAUDE.md`'s counter table is current.

Uncommitted: `NEXT.md`, `CLAUDE.md`, `specifications/project-brief.md`.

## 1. The three decisions — taken, now fold them

All three are decided. What remains is the fold, and each one reaches
further than the document that raised it. **Fold all three in the same
pass as §2** — they touch the same files.

### Q-79 — a distinct ship-to-be-filled state

Chosen over marking the files `adaptExpected`, because a filled
`project-brief.md` and an adapted `CLAUDE.md` are different situations
and the report should say which.

- **F1** — a new per-step declaration, and a **fifth `verify` state**
  alongside `match | adapted | differs | missing`. Neither the new state
  nor `adapted` is a failure. **Name both in F1**; nothing downstream
  should invent them.
- **F1** — `update` must **never** overwrite a path in this state. This
  is a second, separate bug the decision fixes: without it a filled
  brief is replaced by a fresh template.
- **F5** — declare the paths, per pack: `project-brief.md` in all three,
  the voice guide in `writing`. **Check `planning`'s `background/`
  READMEs** — seven subfolders of ship-to-be-filled material is exactly
  this shape, and F5 has never classified them.
- **ADR-001** — `VerifyState` changes again; it is already six versions
  behind (see §2).
- **`general/`** — `pack-application.md` and `interaction-model.md` both
  carry the state table. This is the fold-check rule, and this decision
  is precisely the shape that goes stale silently: a closed enumeration.

### Q-81 — zero runtime dependencies, `collisionKey` narrowed

U-14 ratified. Strict JSON, schema validation, glob, semver, the
frontmatter reader and the test runner are hand-rolled or stdlib
(`node:test` ships with Node 22).

- **`general/technology-choices.md`** — §7.1 becomes ratified, and
  **register entries U-1, U-2, U-3, U-4, U-6, U-8, U-10 and U-14
  close**. Six of the fourteen remain; name them explicitly so the
  register does not read as fully closed.
- **F1 epics** — **eight of the fourteen blocked tasks unblock.** This is
  the largest single unblocking available.
- **F1 §Security** — `collisionKey` narrows to **NFC plus ASCII
  case-folding, with the limit documented**. Do not let this land as a
  quiet edit: it is a deliberate narrowing of a security control, and
  the reasoning (a stated limit beats a hand-rolled approximation) has
  to survive in the spec, not only in the brief. Worth a line in the
  known-limits list.

### Q-80 — the difference enumeration widens

Widened, not reverted: the region anchors and parameter tokens the old
enumeration failed to admit are **required by F1**, so `coding` cannot
both satisfy the format and fit the enumeration as written.

- **F5 US-24** — admit five further classes, **each enumerated by
  file**: payload-side path repointing, parameter-token insertion into
  migrated content, region anchors, net-new authoring beyond class (b),
  and Q-59's `securityreviewer` generalisation. The enumeration is worth
  running only because it compares against a list rather than a
  judgement — keep it a list.
- This resolves **ADR-002's opened question only.** Its other findings
  are §3, and F5's epics stay blocked until those land too.

**Still open: Q-65…Q-78** from wave 1. Each is feature-local to F2, F3
or F6 and resolvable inside its own ADR — none needs a session-level
decision. Next free question is **Q-82**; **Q-64 is reserved**, not
free.

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
| Question | **Q-82** |
| User story | **US-99** |
| Epic | **E-13** |
| Task | **T-13xx** (Scheme A, epic-derived) |

Retired, never reusable: **US-5, US-6, US-7, US-11, US-12** (F1),
**US-22, US-23** (F5). US-11 and US-12 covered drift reporting and the
merge base — F3 re-covers that ground under fresh ids, deliberately.

`CLAUDE.md`'s counter table is **now current** — Q-82, US-99, E-13,
T-13xx, both ADRs, and the 78-code catalogue at v2.9.

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
