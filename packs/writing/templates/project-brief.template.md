# {{harness:param.projectName}} — project brief

**Status:** {{Draft | In Review | Accepted | Superseded}}
**Writer:** {{harness:param.authorName}}
**Last updated:** {{YYYY-MM-DD}}

> **Template note** — the voice guide says *how* this project sounds.
> This brief says *who is speaking, to whom, and why they should be
> believed*. It is upstream of every stage: the outliner reads it to know
> what a piece is for, the writer to know who it is aimed at, the critic
> to know what standard of evidence to hold it to. Write it before the
> first scouting run, and keep it current — when the brief and a draft
> disagree about audience or scope, the brief wins and the draft is what
> gets fixed. Link it from `Home.md`.
> Delete these notes as you fill each section.

---

## 1. Purpose

{{Two or three paragraphs. What is this project writing about, and what
should be different once somebody has read it?

The second half is the one that gets skipped. "Raise awareness of X" is
not a purpose — it names a feeling in the reader and then stops. Say what
a reader should **think, do or believe differently**: stop reaching for a
particular tool, argue a different position in their own meeting, change
a number in a budget, ask a question they were not asking. If you cannot
name the change, you are writing in order to have written, and every
later decision about scope and length will have nothing to push against.

Write this so a stranger who read only this section could describe the
project to someone else without using the word "explores".}}

---

## 2. The writer

{{Who is writing, and what gives them standing on this subject.
Position, how long they have been in it, what they have built, run or
measured, what they have already published on it. Be concrete: *"led a
40-person engineering organisation through two acquisitions"* carries
weight; *"experienced technology leader"* is a phrase that survives
having nothing behind it.

**And what they are not an authority on.** This is the half that makes
the first half usable. A writer credible on organisational design and not
on employment law should say so here, because that boundary is what tells
the critic when a claim has walked outside the writer's standing and now
needs a source rather than a confident sentence. It is also what keeps
the voice honest — writing from expertise you do not have is the fastest
way to lose the one reader who does have it, and they are usually the
reader you most wanted.}}

**Stands on:** {{the two or three areas where the writer's own experience is the evidence}}
**Does not stand on:** {{the adjacent areas where a source is required}}

---

## 3. Audience

{{Who this is for, specifically. Not "technology leaders". A real, named
example reader is worth more than a demographic — someone you have
actually met or worked with, described well enough that you could predict
their objection before you write it.

Answer three things about them:

- **What they already know.** Everything you explain that they already
  know costs you their attention; everything you assume that they do not
  know loses them outright. Naming the line is what makes a draft
  cuttable.
- **What they are sceptical of.** Name the objection they will raise in
  the third paragraph. That objection is usually the piece's real
  structural problem, and finding it here is much cheaper than finding it
  in the critic loop.
- **Where they meet this.** A newsletter read on a phone, a paper read
  under professional obligation and a conference talk are three different
  documents even when the argument is identical.}}

**Example reader:** {{a name or a specific role, and one sentence on who they actually are}}
**Their first objection:** {{the thing they will say back}}

---

## 4. Voice and tone

{{Keep this short. [`writing-guide/tone-of-voice.md`](writing-guide/tone-of-voice.md)
is the authority on how this project sounds, and restating it here
creates two versions that will disagree with each other inside a month.
Use this section only for what is specific to *this project* rather than
to the writer generally: a register that shifts for one deliverable, a
publishing language, a house style an outlet imposes.}}

- **Authority on voice:** [`writing-guide/tone-of-voice.md`](writing-guide/tone-of-voice.md)
- **Final screen before anything ships:** [`writing-guide/ai-tells.md`](writing-guide/ai-tells.md)
- **This project departs from the guide by:** {{nothing, or name it}}

> **Fill the voice guide before drafting anything.** `writer` and
> `editor` are both instructed to work from it and to match two or three
> genre-matched voice samples before they touch a draft. While it is
> still carrying its `VOICE SAMPLES` placeholder there is nothing for
> them to match against, and what comes back is competent, placeless
> prose in nobody's voice — which is the precise failure this pack exists
> to prevent. Treat an unfilled `tone-of-voice.md` as a blocker on stage
> 3, not as a tidying task for later.

---

## 5. Style norms

| Norm | This project |
|---|---|
| Typical length | {{e.g. "1500–2500 words; sections under 400"}} |
| Structure | {{e.g. "argument first, no throat-clearing introduction"}} |
| Person | {{first or third, and whether it shifts by deliverable}} |
| Formality | {{e.g. "a letter to a peer, not a report to a board"}} |
| Citation convention | {{e.g. "parenthetical (Author Year), full bibliography at the end"}} |
| Publishing language | {{and whether the drafting language differs from it}} |

{{These are the defaults the writer works to without asking. Every row
left blank becomes a decision that gets made silently, and differently,
in each draft — and then costs an editor a pass to unify.}}

---

## 6. Evidence discipline

{{The standard this project holds itself to, written as a rule somebody
could actually enforce in a review.

**The pack's floor is not negotiable and holds whatever you write here:
sources are never invented.** A `[NEEDS SOURCE]` marker in a draft is a
normal, acceptable, finishable state — it is honest work that says
exactly where the gap is and who has to close it. A plausible-looking
citation for a paper nobody read is not a faster route to the same place.
It is the single failure that reaches backwards and voids the standing
you claimed in §2, across everything else the writer has ever published.

Decide, above that floor:

- **What counts as a source here** — peer-reviewed work only, or
  practitioner writing, or the writer's own operating experience, and in
  what proportion?
- **What a claim needs before it ships** — one source, two independent
  ones, an acknowledged counter-position?
- **How interested parties are treated.** Three vendor posts pointing the
  same way are one interested source cited three times, not
  corroboration.
- **What happens to an argument you believe and cannot source.** There
  are two honest options: state it as the writer's opinion, in the
  writer's own voice, marked as such — or cut it. Dressing it as a
  finding is the third option and it is the one that is off the table.}}

---

## 7. Planned workstreams

{{The deliverables this project intends to produce. A workstream is one
deliverable tracked end to end, and each one becomes a folder under
`workstreams/<name>/` carrying its own `outlines/`, `drafts/`, `reviews/`
and `published/` stages plus an `index.md` hub.

The research corpus is shared and built once; workstreams draw on it. So
five workstreams reading from the same corpus is a realistic plan, while
one workstream per source is a sign you have listed research subjects and
called them deliverables.}}

| Workstream folder | Form | Slice of the audience | Status |
|---|---|---|---|
| `{{folder-name}}` | {{essay series / white paper / talk / deck}} | {{which part of §3}} | {{planned / researching / drafting}} |

---

## 8. Out of scope

- {{A subject a reader would reasonably expect to find here and will not, with one line on why}}
- {{...}}

{{This section earns its place in a writing project for a reason that is
not the software one. The threat is not feature creep; it is the adjacent
subject that is genuinely interesting and would cost three more weeks of
reading. Written down here, it stays a decision anyone can point at.
Left out, it becomes a scouting run somebody starts on a Thursday, and
the corpus quietly grows a second project inside the first.}}

---

## 9. Success criteria

- **S1** — {{a condition that is observably true or false}}
- **S2** — {{...}}

{{"Well received" is not a criterion. Nobody can check it, so it will be
declared true.

Observable looks like: the named reader in §3 used the argument in their
own; the piece was linked from somewhere you did not place it; three
readers asked the follow-up question you were writing to provoke; a
decision you can name went differently after it circulated. Reach and
engagement counts are the easiest numbers to get here and they mostly
measure the headline rather than the writing — use them, but never on
their own.}}

---

## 10. Open questions

| # | Question | Notes |
|---|---|---|
| Q-1 | {{the question}} | {{why it matters, what it blocks, any working assumption}} |

{{Number them Q-N and keep the id when the answer moves to §11. Never
reuse a number. Mark the ones that block a scouting run or a draft —
those are different costs and want different urgency.}}

---

## 11. Resolved decisions

| # | Decision | Date | Rationale |
|---|---|---|---|
| Q-N | {{what was decided, stated as a fact}} | {{YYYY-MM-DD}} | {{why, including what was rejected and what that cost}} |

{{The rationale column is the one worth writing. A decision recorded
without its reasoning gets re-argued the first time a draft strains
against it — usually at 11pm, usually by whoever is closest to the
deadline.}}
