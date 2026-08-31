Create an agent team for **{{harness:param.projectName}}** to take a feature
brief through the entire spec
phase: research (if needed), functional spec, design spec (if UI),
copy deck (if user-facing text), Architecture Decision Record, and
epics-and-tasks breakdown. Output: a complete, PROCEED-stamped spec set
ready to hand to an implementation team.

Spawn: Researcher (conditional), SpecWriter, Designer (conditional),
Copywriter (conditional), Architect, SecurityReviewer. The lead applies
the coordination rules below.

All artifacts land under `specifications/<version>/` using the
filename conventions in `specifications/conventions.md`. Each
teammate posts an entry on the shared task list on start and on
completion.

================================================================
RESEARCHER  —  read-only + write access to `specifications/<version>/research-*.md`
================================================================

Spawn only if the feature brief flags unfamiliar tech, an unverified
API, or a constraint not already documented. Otherwise skip.

Read first:
- Existing research notes in `specifications/<version>/` (avoid
  re-investigating ground already covered).
- `CLAUDE.md` and any relevant section of `docs/`.

Then search the web and read official documentation. Produce a
structured findings summary covering: the question, key findings
with sources, a recommended approach for this codebase, caveats, and
open questions. Save to
`specifications/<version>/research-<feature>.md`.

Post to the shared task list:
- The file path
- The recommended approach in one paragraph
- Any caveats the SpecWriter needs to know before drafting

================================================================
SPECWRITER  —  write access to `specifications/<version>/spec-*.md` and `specifications/<version>/epics-and-tasks-*.md`
================================================================

Wait for the Researcher to post completion (or run first if no
researcher was spawned).

Read first:
- The researcher's findings (if any).
- The existing specs in `specifications/` (read 2–3 to match format
  and detail level).
- `CLAUDE.md` and `specifications/conventions.md` — naming,
  numbering, section structure must match exactly.
- Prior ADRs under `specifications/<version>/` — do not re-litigate
  resolved decisions; reference them.

Write a complete functional specification covering: overview,
technical context (table of settled decisions), goals, out-of-scope,
user stories with acceptance criteria (one yes/no verification per
criterion), error states with verbatim user-facing strings,
non-functional requirements (specific, not "fast"), and open
questions with default assumptions. Save to
`specifications/<version>/spec-<feature>.md`.

Post to the shared task list:
- The file path
- A one-paragraph summary of what was specified
- The list of open questions

If the brief is too vague to write a complete spec, halt and surface
the specific gaps — do not guess to make progress.

(You will be re-spawned after the Architect posts PROCEED to break
the feature into epics and tasks — see Epics Breakdown below.)

================================================================
DESIGNER  —  write access to `specifications/<version>/design-spec-*.md`
================================================================

Spawn only if the feature has UI. Wait for the SpecWriter to save
the functional spec.

Read first:
- The functional spec for this feature.
- Existing design specs in `specifications/` — material system,
  established patterns take precedence over inventing new ones.
- The project's design-tokens file. Use exact token names, never
  raw values.

Write a complete design spec covering, for every new component or
screen: trigger, layout (with spacing tokens by name), typography
(role · font · weight · size token · colour token), colour and
material (every surface and its token), iconography, interaction
states (default, pressed, disabled, loading, error, success), motion
(with Reduce Motion fallback), haptics (action → haptic method), and
accessibility (label, VoiceOver, Dynamic Type, 44×44 minimum,
Increase Contrast). Save to
`specifications/<version>/design-spec-<feature>.md`.

Post to the shared task list:
- The file path
- A one-paragraph summary of the design decisions
- Any open questions about behaviour that need the SpecWriter or me
  to resolve

If the feature brief lacks a functional spec, halt and request one.
If a value is needed that has no token, flag it as an open question
rather than using a raw value.

================================================================
COPYWRITER  —  write access to the copy deck (`specifications/<version>/copy-deck-*.md` and/or the `messages/` source)
================================================================

Spawn only if the feature has user-facing text. Wait for the SpecWriter
to save the functional spec (and the Designer, if a design spec is
needed — copy fills the slots the design defines).

Read first:
- **The tone-of-voice guide** (e.g. `specifications/<product>/**/tone-of-voice.md`).
  This is mandatory — the voice is defined there, not invented. Read its
  attributes, do/don't, lexicon, and especially its worked examples. **If no
  tone-of-voice guide exists, halt and request one** — do not guess a voice.
- The functional spec (what each string must do, and the states that need
  words: success, error, empty, loading) and the design spec (slots, length
  limits, hierarchy).
- The existing copy deck / `messages/` source — match the ID scheme, every
  locale, and reuse established terminology verbatim.

Write the finished, user-facing copy by ID, in every required locale,
grounded in web copywriting good practice (benefit-led, plain, scannable,
specific action-first CTAs, calm recoverable error microcopy, SEO-aware
without keyword stuffing) and matching the documented voice. Save to
`specifications/<version>/copy-deck-<feature>.md` (or extend the existing
copy deck / `messages/` source per the project convention).

Post to the shared task list:
- The file path(s) and the copy IDs written or changed
- A one-paragraph note on the voice choices and which examples anchored them
- Any open questions (missing voice guidance, a slot the copy can't fit, a
  term with no established translation, a locale pending human review)

================================================================
ARCHITECT  —  read-only + write access to `specifications/<version>/ADR-*.md`
================================================================

Wait for the SpecWriter (and Designer, if spawned) to post
completion.

Read first:
- The functional spec for this feature.
- The design spec (if any).
- `CLAUDE.md` and prior ADRs under `specifications/<version>/`.
- The relevant code under the source folders to confirm the
  components the spec mentions exist and that the contracts you're
  about to lock match reality.

Produce a one-page Architecture Decision Record covering:
- Decision (2–4 sentences)
- Context (constraints and prior decisions that shape this one)
- Options considered (at least two, with one-line trade-offs)
- Rationale
- Consequences
- File-level plan (new files/types introduced, existing files
  modified — this is the contract the implementer follows)
- Public interface contract (type signatures, protocols, or function
  shapes the implementer must expose so the test writer can write
  tests against them in parallel)
- Conflicts flagged (anything in the spec that contradicts a prior
  ADR or the architecture pattern — do not silently override)

Save to `specifications/<version>/ADR-<NNN>-<feature>.md`. End with a
one-line verdict and post the ADR path + verdict to the shared task
list:
- `PROCEED` — the SpecWriter may begin the epics breakdown.
- `REVISE SPEC` — halt; surface the specific gaps that must be
  answered before implementation can start.

================================================================
SECURITYREVIEWER (Mode A — requirements review)  —  read-only
================================================================

Wait for the Architect to post its ADR (draft PROCEED). Run before the
epics breakdown — a security gap is far cheaper to fix in the spec than
in the diff.

Read first:
- The functional spec, design spec (if any), and the draft ADR for this
  feature.
- The project's living security references (trust boundaries, the
  API/CSRF contract, and any reference doc the feature touches).
- Prior ADR security conditions (C-N) and the open findings registers
  — do not re-litigate a resolved condition; cite it by number.

Validate that the feature's security and privacy requirements are
*correctly and completely specified* across the applicable threat
dimensions (authN/authZ, tenant isolation, untrusted input, path
confinement, secrets, CSRF/cross-origin, injection, data minimization,
rate limiting, session/token lifecycle, error disclosure). Every
security requirement must be phrased so a test can verify it; a
requirement the team cannot test is itself a gap.

Post to the shared task list:
- Requirement gaps by severity, each tied to an invariant, an ADR
  condition, or a register ID, with the concrete requirement the
  spec/ADR must state.
- Conditions for PROCEED — the numbered, testable security requirements
  that must appear in the spec/ADR before implementation begins.
- A one-line verdict: `SECURITY-PROCEED` or `REVISE-SPEC`.

Do NOT write or modify the spec/ADR — the SpecWriter or Architect folds
fixes in. If the verdict is `REVISE-SPEC`, the lead routes the gaps back
(spec-level → SpecWriter, architecture-level → Architect) and re-runs
this review before the epics breakdown.

================================================================
EPICS BREAKDOWN  —  SpecWriter, second pass
================================================================

Re-spawn the SpecWriter after BOTH the Architect posts PROCEED and the
SecurityReviewer posts SECURITY-PROCEED.

Break the feature down into epics and tasks. Group related work into
epics (E-01, E-02, …); within each epic, list every concrete change
as a task with a T-XXYY ID matching the project's convention. The
breakdown must match the ADR's file-level plan exactly — every new
file or modified file in the plan corresponds to one or more tasks.

Save to `specifications/<version>/epics-and-tasks-<feature>.md`.

Post to the shared task list:
- The file path
- The list of epic IDs and titles
- The total task count

================================================================
COORDINATION RULES FOR THE LEAD
================================================================

Phase ordering:
1. Researcher runs first if the brief flags unfamiliar tech.
   Otherwise skip and start with the SpecWriter.
2. SpecWriter runs after the Researcher (or first if no research is
   needed).
3. Designer runs after the SpecWriter saves the functional spec
   (skip if no UI).
4. Copywriter runs after the functional spec (and the design spec, if
   any) are saved — it fills the slots the design defines. Skip if the
   feature has no user-facing text. Designer and Copywriter may run in
   parallel once the functional spec exists (they own different files).
5. Architect runs after the functional spec AND design spec (if any)
   are saved (it need not wait on the copy deck).
6. SecurityReviewer (Mode A) runs after the Architect posts its ADR,
   before the epics breakdown.
7. SpecWriter re-runs after Architect posts PROCEED AND SecurityReviewer
   posts SECURITY-PROCEED, to produce the epics-and-tasks doc.

Hard stops — halt and surface to me, do not auto-progress:
- SpecWriter halts because the brief is too vague (surface the gap
  list).
- Designer halts because the functional spec is missing or a value
  needs a new token (surface the open question).
- Copywriter halts because no tone-of-voice guide exists (surface the
  request — the voice must be documented before copy is written).
- Architect verdict is `REVISE SPEC` (surface the conflicts).
- SecurityReviewer verdict is `REVISE-SPEC` (surface the requirement
  gaps). Route spec-level gaps to the SpecWriter and architecture-level
  gaps to the Architect, then re-run the security review.
- Any CRITICAL or HIGH security finding is a halt — it blocks
  SECURITY-PROCEED regardless of the overall verdict wording.
- Researcher cannot find the answer within `maxTurns` (surface what
  was tried).

Surface to me when done with: the spec path, the design-spec path
(if any), the copy-deck path (if any), the ADR path, the
epics-and-tasks path, the security-review verdict + any conditions
carried into the epics, and the consolidated list of open questions.
The implementation team picks up from there.

================================================================
FEATURE TO SPECIFY
================================================================

[DESCRIBE THE FEATURE — 2–4 sentences. What is it? Who is it for?
What is the success condition? What is explicitly out of scope?]

Unfamiliar tech / APIs that need research: [LIST, or "none"]
Has UI (spawn designer): [yes / no]
Target version: [<version>, e.g. v1.2 — controls the
  `specifications/<version>/` folder all artifacts land in]
Feature slug: [<feature> — used in all filenames]
