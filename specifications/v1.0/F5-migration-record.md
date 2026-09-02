# F5 — Migration record: the fidelity check, run

**Status:** Draft
**Date:** 2026-09-02
**Owner:** `testwriter` (T-1501, T-1502, T-1504, T-1505) · adjudication is `architect`'s (T-1503)
**Refs:** `F5-spec-template-packs.md` **v3.4** (US-24, US-25, §Flows / *Migration requirements*) · `F5-ADR-002-template-packs.md` §10, §11 · `F5-epics-and-tasks-template-packs.md` E-15 · `specifications/project-brief.md` §12 (Q-46, Q-51, Q-59, Q-80, Q-82) · `scripts/migration-diff.mjs` · `tests/packs/migration.test.ts`

---

## 1. What this document is

**The evidence T-1502 asks for, and nothing else.** E-15 states its own
deliverable plainly — *"This task's deliverable is **evidence, not a
pass**"* — so what follows is a run's output with the counts and the path
lists, not a verdict on whether the packs are right.

It records:

- the check as it now exists — a **checked-in script**, not an afternoon
  (**T-1501**);
- the counts per class for **both** migrated packs, and the full path list
  for the five classes Q-80 added, which had no prior evidence
  (**T-1502**);
- US-25's extraction assertions for `writing` (**T-1504**);
- the Q-46 prose-stripping sweep over `packs/` (**T-1505**).

**Everything the check could not place is listed in §6 and left there.**
Placing it is `T-1503`'s adjudication and fixing it is `T-1506`'s work;
this document decides nothing about either.

### What was already true before this run

`F5-ADR-002` §10 and §11 record a **hand-run** of the `coding` half on
2026-09-01, and US-25's greps for `writing`. That run found the
`2644096` provenance defect and two unplaceable differences, and T-1503
adjudicated both. **What did not exist was a script**, and what had never
run at all was a **tree diff for `writing`** — §11 discharged that half
with four greps over the shipped pack, which say nothing about what the
source held. Both gaps are closed here, and closing the second is what
produced most of §6.

---

## 2. The check — `scripts/migration-diff.mjs`

```
node scripts/migration-diff.mjs            # both migrated packs
node scripts/migration-diff.mjs coding     # one
node scripts/migration-diff.mjs --json     # machine-readable
```

Exit `0` when every difference is placed; exit `1` otherwise. It reads
history with `git ls-tree` and `git cat-file` and **mutates nothing** — no
checkout, no archive into the working tree.

**It takes no commit argument, by design.** T-1501: *"Re-runnable means it
reads the commit from `provenance`, never from an argument, so it cannot
drift from what the pack claims."* That wiring has already paid for itself
once — `packs/coding/pack.json` recorded `2644096`, the commit that
**removed** `template/`, and a check taking the commit as an argument
would have been run against the right tree by a human who knew better
while the pack went on lying. `tests/packs/migration.test.ts` asserts the
absence of a commit flag on the script's own source, so the property
cannot be lost by a later convenience.

**It checks two things, not one.**

1. **Residue** — a differing path no declared class claims. US-24 calls
   this class (j) and requires it empty.
2. **Class evidence** — several classes state how to assert their own
   membership (class (e) as `grep -rl '\.harness/pack' packs/coding`,
   class (f) as `grep -rl '{{harness:' packs/coding`, class (g) as six
   anchors, class (i) as zero hits for the host project's names). Both
   directions are checked: a declared member **missing** its evidence
   (over-claim) and a file **carrying** the evidence that its class does
   not name (under-claim). Class (h)'s v3.4 correction was an over-claim;
   had the script existed, a script would have caught it rather than an
   architect.

Comparison is **byte equality**. A whitespace-insensitive compare would
silently pass the one change a reader is least likely to notice by eye —
a paragraph reflowed around an edit.

---

## 3. `coding` — the run

**Source:** `template/` in this repository, at `807d67d` — read from
`packs/coding/pack.json`'s `provenance.commit`.

| | |
|---|---|
| Source files at `807d67d` | **38** |
| Shipped files in `packs/coding/` | **41** |
| **Differences** | **32** |
| — dropped (in source, not in pack) | 7 |
| — added (in pack, not in source) | 10 |
| — modified (in both, bytes differ) | 15 |

These are the figures F5 v3.3 recorded from the hand-run, reproduced by
the script. **Sixteen source files migrated byte-identical** and are not
differences at all.

### 3.1 Per class

| Class | Declared size | Found | Agrees |
|---|---|---|---|
| (a) Q-46 deletion | 5 files | **5** | yes |
| (b) structural addition | *(not sized)* | **8** | see §7.1 |
| (c) declared restructure, at migration time | 7 files | **0** | see §5 |
| (d) brief wire-up | "exactly five files" | **5** | yes |
| (e) payload-side path repointing | "is five files" | **5** | as a list; **not** by its own grep — see §6.2 |
| (f) parameter-token insertion | "is five files" | **5** | yes |
| (g) region anchors | six, in one file | **1 file / 6 anchors** | yes |
| (h) net-new authoring beyond (b) | "exactly two files" | **2** | yes |
| (i) `securityreviewer` generalisation | 1 file | **1** | yes |
| (k) post-migration change | *(open, audited by change history)* | **9** | yes |
| **(j) residue** | **must be empty** | **1** | **no — §6.1** |

Class letters sum to more than 32 because a path may carry several. Six
do: `CLAUDE.md.template` is (a)+(f)+(g); `agent-teams/Specify.md` is
(d)+(e)+(f); `agents/specwriter.md` is (d)+(e); `targets/README.md` is
(a)+(e); `specifications/README.md` is (d)+(k); `README.md` is (a)+(k);
and both class (h) files are also (f).

### 3.2 The five classes Q-80 added — full path lists

These are the ones with no prior evidence, so every member is named. Each
was verified against the class's own stated assertion, not taken from the
enumeration.

**(e) payload-side path repointing — 5, and each carries `.harness/pack`:**

```
agent-teams/Specify.md
agents/designer.md
agents/specwriter.md
agents/target-reviewer.md
targets/README.md
```

**(f) parameter-token insertion — 5, and each carries `{{harness:`:**

```
CLAUDE.md.template
agent-teams/Implement.md
agent-teams/Specify.md
specifications/README.template.md
specifications/project-brief.template.md
```

`grep -rl '{{harness:' packs/coding` returns exactly these five, so C-43's
count and class (f)'s membership are the same set — checked, not assumed.

**(g) region anchors — 1 file, and the count is 6:**

```
CLAUDE.md.template          <!-- harness:region … --> × 6
```

The source file at `807d67d` carries **0**. Matches F5 US-38 and Q-61.

**(h) net-new authoring beyond class (b) — exactly 2:**

```
specifications/README.template.md
specifications/project-brief.template.md
```

Both are `added` — absent from the source tree. **This is the class F5
v3.4 corrected**, and the run confirms the correction: `README.md` and
`CLAUDE.md.template` both exist at `807d67d` and are `modified`, not
`added`, so neither can be net-new.

**(i) `securityreviewer` generalisation — 1:**

```
agents/securityreviewer.md
```

Verified in both directions: the source carries
`reference/thoughtpartner/…` paths and the shipped file carries none.
A file that never held them would not be a generalisation.

### 3.3 The other classes, for completeness

**(a) Q-46 deletion — 5**, and for four of them the deleted marker is
verified present in the source and absent from the pack:

```
README.md                    ## Bootstrapping a new project
targets/README.md            ## Adopting this in a new project
agents/README.md             "Copy this folder"
agent-teams/README.md        "Copy this folder to `AgentTeams/`"
CLAUDE.md.template           a cross-reference — no quotable marker
```

**(b) structural addition — 8:** `pack.json`, `recipe.json`,
`commands/target.md`, and five `applied-readmes/`.

**(k) post-migration change — 9**, each naming the change-history
revision that admits it: `README.md` (v3.0, the US-28 rewrite),
`specifications/README.md` (v3.2, the security-condition fold rule), and
the seven `infrastructure/backend-deploy/**` files (v3.1, Q-82).

---

## 4. `writing` — the run

**This tree diff had never been run.** `F5-ADR-002` §11 discharged
`writing`'s half of condition 2 with US-25's four greps, which are
assertions about the shipped pack. They say nothing about what the source
held, what did not extract, or why.

**Source:** `../AIImpactOnOrganizationsAndLeadership/` at `9f7b4f1` — read
from `packs/writing/pack.json`'s `provenance.commit`.

| | |
|---|---|
| Source files at `9f7b4f1` | **229** |
| Shipped files in `packs/writing/` | **32** |
| **Differences** | **231** |
| — dropped | 201 |
| — added | 4 |
| — modified | 26 |

**Two source files extracted byte-identical:** `agents/analyst.md` and
`agents/librarian.md`. That they are the *only* two, and that the six
modified agents are **exactly** US-24 class (d)'s six named prompts, is
the strongest single piece of evidence in this document that class (d) is
right about `writing`.

### 4.1 There is no enumeration to run this against

**F5 declares no by-file classes for `writing`, and this is a finding
rather than an omission the script quietly filled.** US-24's ten classes
are `coding`'s: nine are enumerated by `coding` filenames, and only class
(d) names `writing` files. What F5 gives for `writing` is US-25 — four
greps and a demand for an extraction record — plus §Flows / *Migration
requirements — writing*, which names four **kinds** of difference without
naming a file under any of them.

So the classes below are **derived** from those four kinds, and are
lettered `w…` so nothing here can be mistaken for one of US-24's ten. The
source→pack correspondence they run over is derived the same way, from
§Payload and §7b. **Running a derived enumeration and reporting what it
cannot reach is better than not running one**, but §6.3 is the direct
consequence of the derivation being mine rather than the spec's.

| Class | Derived from | Found |
|---|---|---|
| (d) brief wire-up | **US-24 class (d)** — the one class that names `writing` files | **7** |
| (wa) Q-46 stripping / research content removed | §Flows *writing* (a); US-25 | **12** |
| (wb) exclusion class — does not extract | §Flows *writing* (b) — four reasons | **187** |
| (wc) structural addition | §Flows *writing* (c) | **2** |
| (wd) authored recipe scaffolding | §Flows *writing* (d) + Q-51 + §7b | **3** |
| (we) de-personalisation | US-25 | **6** |
| **residue** | — | **16 — §6.3** |

### 4.2 Full path lists

**(d) brief wire-up — 7.** US-24 names *"exactly six agent prompts …
plus the standing-instruction bullet in `CLAUDE.md.template`"*, and the
run finds exactly that set and no other:

```
agents/outliner.md   agents/writer.md    agents/critic.md
agents/researcher.md agents/scout.md     agents/editor.md
CLAUDE.md.template
```

**(we) de-personalisation — 6.** Each replaces the owner's name or a
project-specific fact with a `{{harness:param.…}}` token or a declared
`{{…}}` placeholder:

```
CLAUDE.md.template
templates/home.template.md
writing-guide/README.template.md
writing-guide/ai-tells.template.md
writing-guide/bilingual-publishing.template.md
writing-guide/tone-of-voice.template.md
```

**(wa) Q-46 stripping — 12**, the whole scaffold tree. Every shipped
`index.md` is its source folder's `index.md` with the corpus rows removed
and an `_(empty)_` row left. They are `modified`, not `added` — which
matters, because treating them as net-new would hide the one thing US-25
asks about them.

**(wc) structural addition — 2:** `pack.json`, `recipe.json`.

**(wd) authored recipe scaffolding — 3:** `templates/index.template.md`,
`templates/home.template.md`, `templates/project-brief.template.md`.
**One of the three is not authored — §6.4.**

**(wb) exclusion — 187 of the 201 dropped paths**, by the reason §Flows
gives:

| Reason | Paths |
|---|---|
| research corpus (`analyses/`, `sources/`, `workstreams/`, `Notes/`) | 184 |
| personal notes and voice samples (`Notes/voice/`) | 3 |
| the ~120-entry permission allowlist | **0 — §7.3** |
| the third-party `PostToolUse` hook | **0 — §7.3** |

---

## 5. Class (c), and why it now matches nothing

Class (c) declares that `infrastructure/backend-deploy/` became
`scaffolds/backend-azure/`. **Q-82 then moved that tree out of `packs/`
altogether**, so the destination class (c) predicts does not exist and
all seven source files are `dropped`.

The script reports the prediction as a **note** rather than a failure,
because T-1503 has already adjudicated those seven as class (k) — Q-82 is
recorded in F5 v3.1's change history, which is exactly what (k) admits.
The note is kept rather than suppressed so that the **second hop stays
visible as a second hop**: a class that silently matched nothing would
read as a class with no members, not as a class whose subject has moved
twice.

---

## 6. What the check could not place — **T-1503's input**

**Class (j) is not empty.** Six items follow. This document states what
each *is* and offers no adjudication; T-1503's three options — migration
bug, further declared class, or evidence the approach has failed — are
its to choose between.

### 6.1 `coding` residue — `packs/coding/targets/Run.md`

**Disposition:** modified. **Claimed by:** nothing.

The change is two path literals gaining a `template/` prefix:

```
-Read the target file end to end, plus `template/targets/README.md` and
-`target.template.md`.
+Read the target file end to end, plus `template/targets/README.md` and
+`template/targets/target.template.md`.
```

It is path repointing, which is class (e)'s subject — but (e) is
enumerated as five files that do not include `Run.md`, **and (e)'s stated
assertion is `grep -rl '\.harness/pack'`, which `Run.md` does not match
because it was repointed at `template/` rather than at `.harness/pack/`.**

Worth stating for the adjudication and not deciding here: `template/` is a
directory that exists in **neither** the pack nor an applied project.
Every other repointed file in the pack points at `.harness/pack/…`.

### 6.2 `coding` class evidence — class (e)'s own grep no longer yields five

Class (e) says it *"is five files"* and offers, as its assertion:

> Assertable as `grep -rl '\.harness/pack' packs/coding`, minus the class
> (b) and (h) files.

That grep returns twelve. Subtracting the four class (b) files it
matches (`recipe.json` and three `applied-readmes/`) and the one class (h)
file it matches (`specifications/README.template.md`) leaves **seven**,
not five. The two extra are `CLAUDE.md.template` and `README.md`.

**The subtraction was correct when written.** Through v3.3, class (h) held
four files including those two. **F5 v3.4 corrected (h) to two** — and the
assertion that subtracts (h) was not re-checked. A correction to one class
silently invalidated another class's stated assertion; both read perfectly
well; neither had been run.

### 6.3 `writing` residue — 16 paths

**Fourteen dropped, in three groups, none covered by §Flows *writing*
(b)'s four exclusion reasons:**

```
tasks/build-and-pitch.md            tasks/read-and-look-up.md
tasks/conversations.md              tasks/research-agenda.md
tasks/frameworks.md                 tasks/research-hypotheses.md
tasks/good-practice-implications.md tasks/tools-to-try.md
                                    tasks/writing.md
IntroAndBackground/Observations.md
IntroAndBackground/Purpose.md
.agentsroom/.gitignore   .agentsroom/project.json   .gitignore
```

The `tasks/` nine and the `IntroAndBackground/` two are plainly project
content and read as *research corpus* in substance — but §Flows names that
class by folder (*"`sources/<year>/` content, `analyses/`, `notes/`,
existing `workstreams/<name>/` content"*) and neither folder is in it. The
`.agentsroom/` pair is a third-party tool's state and `.gitignore` is repo
hygiene; no exclusion reason names either.

**Two modified, and they are different in kind:**

- **`README.md`.** The source is a one-line stub —
  `# AIImpactOnOrganizationsAndLeadership` — and the pack ships a 151-line
  README written for US-28. That is net-new authoring, which for `coding`
  is class (h); `writing` has no such class.
- **`templates/post.template.md`.** A generalisation of exactly the kind
  class (i) covers for `coding`: *"produce the entire layup in **Danish**"*
  becomes *"in the **publishing language**"*, *"from Post 13 on"* is
  dropped, and a link to `learning-journey-communications.md` becomes
  *"the workstream's own communications-strategy doc"*. `writing` has no
  class (i) either.

**The pattern in §6.3 is one thing, not fourteen:** `writing` was checked
against a derived enumeration because F5 supplies none, and the residue is
mostly the shape of what F5 did not enumerate.

### 6.4 `writing` class evidence — `home.template.md` is not authored

Q-51 says *"Two authored templates, and exactly two"*, naming
`templates/index.template.md` and `templates/home.template.md`. The diff
pairs the second with the source's `Home.md`: same frontmatter block, same
`aliases`, same `> [!tip] How to use this note` callout verbatim, same
section structure, with the project-specific lines parameterised. That is
a migration, and a good one.

`templates/index.template.md` has no source counterpart and is authored.

---

## 7. Spec gaps found by running the check

Each is a place where **two statements in F5 cannot both be run**, which
is the class of defect only execution finds.

### 7.1 Class (b) has two different memberships in one document

US-24's acceptance criterion says class (b) is *"an added `pack.json`,
`recipe.json` or `applied-readmes/` file"* — three kinds. §Flows /
*Migration requirements — coding* (b) says *"`pack.json`, `recipe.json`,
`commands/` …, `applied-readmes/` … and `scaffolds/backend-azure/` …
plus `scaffolds/backend-aws/`"* — five.

`packs/coding/commands/target.md` is class (b) under §Flows and **residue
under US-24's own criterion text**. The check uses §Flows, because §Flows
is the one that enumerates.

### 7.2 T-1505's "five phrases" — **found here, resolved in F5 v3.5**

T-1505 asks for *"zero occurrences in `packs/` of the **five bootstrap
phrases** the spec enumerates"*, and no five-phrase list existed: F5
enumerated **five bootstrap *sections*** (§Flows *coding* (a)) and,
separately, **four bootstrap *phrases*** (§Key Decisions, *Bootstrap
prose*). Both were run here rather than picking one.

**F5 v3.5 settles it independently**, from the E-16 side: *"'Five' means
three different things above and in §Flows … The checkable set is **two
headings and three phrases**."* Recorded because two tasks reached the
same defect from opposite directions on the same day, which is evidence
about the defect rather than about either task.

**v3.5 also assigns this task its scope, and the assignment matters.**
US-36 now states that T-1603 sees **applied-destined content only**, that
**four of the five §Flows deletions are not applied-destined**, and that
**T-1505 therefore carries US-36's criteria 3 and 4 over the whole payload
tree**. §8's sweep is scoped that way. It is also why §8's one wider-rule
hit is not caught by T-1603's sweep, which runs the same rule over a
narrower file set with a narrower form set.

### 7.3 Two of US-25's four exclusion classes are not in the recorded commit

§Flows *writing* (b) requires the extraction record to enumerate *"the
~120-entry permission allowlist"* and *"the third-party `PostToolUse`
hook"* among the files that did not extract. Both live in
`.claude/settings.local.json`, which is **untracked** in the source
repository and therefore absent from the tree at `9f7b4f1`.

They are real — the file on disk today holds a **117-entry**
`permissions.allow` (the spec's "~120" is accurate) and one `PostToolUse`
hook invoking a third-party notifier — but **a check reading the recorded
commit cannot see them**, and a check reading the working tree would not
be reproducible. The requirement and the provenance model disagree.

This is the same shape as the contradiction §11 of `F5-ADR-002` found
between §NFR *Provenance* and US-25, and found the same way.

### 7.4 `writing` has no by-file enumeration at all

Stated fully in §4.1. It is the reason §6.3 has fourteen entries rather
than an adjudication.

---

## 8. T-1504 and T-1505 — the greps

### T-1504 — US-25's extraction assertions for `writing`: **clean**

| Assertion | Result |
|---|---|
| Zero hits for `/Users/` | **0** |
| Zero hits for the host project's name | **1**, and it is `pack.json`'s `provenance.source` — the exclusion US-25 declares by name |
| Zero hits for the owner's personal name (`Thomas`, `Andersen`) | **0** |
| No research content under the scaffold tree | **clean** — all 12 scaffold files are `index.md` |
| The voice guide's sample reference is a placeholder | **yes** — `{{VOICE SAMPLES — …}}`, and neither `Notes/voice` nor `linkedinposts` survives |

The `provenance` exclusion is applied to the **value**, not to
`pack.json`: a host-project name elsewhere in the same file would still
fail. An exclusion wide enough to be safe would have made the criterion
unfalsifiable, which is how it came to be needed in the first place.

### T-1505 — Q-46 prose stripping over `packs/`: **clean on the literals**

Over all three packs, 121 files — the **whole payload tree**, which is
T-1505's scope under US-36 as of F5 v3.5, and which is wider than
T-1603's applied-destined set by the four §Flows deletions that are never
applied.

| Needle | Hits |
|---|---|
| `^#+ Bootstrapping a new project` | **0** |
| `^#+ Adopting this in a new project` | **0** |
| `Copy this folder` | **0** |
| `copy the contents of this folder` | **0** |
| `drop the agent files` | **0** |
| `rename the template` | **0** |
| `fix the paths` | **0** |
| `adopting this in a new project` | **0** |
| anchor links to either deleted section | **0** |

**One hit on the wider rule, which F5 v3.5 makes the binding one.** US-36
now says the literals are *"a floor rather than the definition"* and that
*"a check MUST use a form set wide enough to catch the wordings §Flows
actually deleted"*. §Flows *writing* (a) states that rule by intent:
*"Any prose in the source `CLAUDE.md`, **the writing guide README** or the
workstream READMEs that instructs a reader to copy a folder, rename a
file, fix a path, or set the project up by hand does not extract."*

```
packs/writing/writing-guide/README.template.md:20
  "…so you can drop this folder into another repo. The one project-specific
   dependency is the voice samples … in a new project, point that section at
   wherever the samples live."
```

It is in one of the three files that sentence names by name, it is
applied-destined (`strip-suffix` renders it to `writing-guide/README.md`),
and it tells a reader to copy a folder and fix a reference. **But US-25's
third criterion cites the same sentence approvingly** — the voice guide
converts its sample reference *"per that folder's own portability note"*,
and the portability note **is** this sentence. Two requirements, one
sentence, opposite verdicts. Recorded for T-1503, not decided here.

**T-1603's sweep does not report it**, and the reason is instructive
rather than a defect in either check: its form set matches
`drop the …` and this sentence says `drop this folder`. The two sweeps
were written independently against the same rule, and the wordings they
each thought of differ — which is US-36's own point about `copy this
folder` versus `copy the contents of this folder`, arriving a second
time.

---

## 9. How to re-run this

```
node scripts/migration-diff.mjs           # exits 1 while §6 stands
npm run build:test && npm run test:packs  # the assertions, with §6 skipped
```

`tests/packs/migration.test.ts` holds T-1504 and T-1505 as passing tests
and every §6 item as a **skipped** test whose skip reason names the
finding and the task that clears it. **Un-skip as T-1503 adjudicates and
T-1506 acts** — the skips are the outstanding list, in the place a reader
trips over them.

Both halves guard their source: `coding`'s commit is in this repository's
history, `writing`'s is in a sibling checkout a CI runner will not have,
and each half skips itself **naming which** rather than passing silently
on a check that did not run.

---

## Change history

| Version | Date | Change |
|---|---|---|
| **1.0** | **2026-09-02** | First edition. T-1501 lands the check as `scripts/migration-diff.mjs`, replacing the 2026-09-01 hand-run recorded in `F5-ADR-002` §10. T-1502 runs it for **both** packs — `writing`'s tree diff had never been run at all, its half of ADR-002 condition 2 having been discharged with four greps over the shipped pack. `coding` reproduces v3.3's 38/41/32 and every one of Q-80's five new classes verifies against its own stated assertion. **Class (j) is not empty**: one `coding` residue (`targets/Run.md`), one `coding` class-evidence failure (class (e)'s grep yields seven after v3.4 released two files from class (h)), sixteen `writing` residue paths and one `writing` class-evidence failure (`home.template.md` is declared authored and is not). Four spec gaps recorded in §7, of which §7.3 — two of US-25's four exclusion classes living in an untracked file — is the same shape as the contradiction §11 found between §NFR *Provenance* and US-25. **T-1504 is clean and T-1505 is clean on both of the enumerations F5 offers**, with one wider-rule hit that two requirements disagree about. |
