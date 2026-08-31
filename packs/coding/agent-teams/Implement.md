Create an agent team for **{{harness:param.projectName}}** to implement an
entire feature whose spec phase
is already complete — i.e. a functional spec, optional design spec,
Architecture Decision Record (with file-level plan and interface
contract), and an epics-and-tasks breakdown all exist and are
PROCEED-stamped. Output: code + tests + reviewer-approved, one epic
at a time, looping until the feature is done.

Spawn: Implementer, TestWriter, Reviewer, SecurityReviewer. The lead
applies the coordination rules below. The Architect is NOT spawned — its
ADR already exists from the spec phase and is the authoritative
file-level plan and interface contract.

All teammates have read access to everything under `specifications/`.
File ownership is partitioned (see below) — no same-file edits
across teammates.

================================================================
IMPLEMENTER  —  write access to `Sources/**` and `Tests/Unit/**`
================================================================

Per epic, read first:
- The ADR for this feature (authoritative file-level plan and
  interface contract).
- The relevant epic in `epics-and-tasks-<feature>.md` — the list of
  tasks and their dependency order.
- The functional spec sections referenced by the epic's user stories.
- The design spec sections for any UI work.
- `CLAUDE.md` for project conventions and build-system quirks.

Implement every task in the epic in dependency order, following the
ADR's file-level plan and matching the public interface contract
exactly. If you discover a real reason the contract must change,
halt and surface to the lead — do not silently deviate (the
TestWriter is writing tests against that contract in parallel).
Write production code and unit tests together; unit tests live in
`Tests/Unit/**` alongside the code. Match existing patterns before
inventing new ones. Run the unit test suite before posting
completion.

After each task is complete, mark `[x]` next to its T-XXYY ID in
`epics-and-tasks-<feature>.md`. Do not modify any other section of
that document.

File ownership: you own `Sources/**` and `Tests/Unit/**`. You must
not touch `Tests/Integration/**`, `Tests/Acceptance/**`, or any
file under `specifications/` other than the checkbox updates above.

Post to the shared task list when done with an epic:
- The list of changed files
- Unit test results (pass/fail count)
- Any open questions or assumptions made
- Any deviations from the ADR contract (if you halted and got
  approval, document the new contract; if you made a judgement call,
  surface it explicitly so the Reviewer can validate)

Do NOT commit until both the Reviewer and the SecurityReviewer have
approved.

================================================================
TESTWRITER  —  write access to `Tests/Integration/**` and `Tests/Acceptance/**`
================================================================

Start in parallel with the Implementer from the beginning of each
epic. Do not wait for code.

Per epic, read first:
- The ADR's public interface contract section (write tests against
  the contract, not the implementation, so they survive internal
  refactors).
- The relevant epic in `epics-and-tasks-<feature>.md`.
- The functional spec acceptance criteria for every user story the
  epic covers.
- The error states table.
- The design spec for any UI behaviour assertions.
- Existing test patterns in the project's test directory — match the
  framework, naming, and structural conventions in use.

Write integration and acceptance tests covering:
- Every acceptance criterion in the relevant user stories (one test
  minimum per criterion)
- Every error state in the error table that the epic touches
- Boundary values (zero, one, max, max+1; empty / single / many)
- Concurrency edge cases where relevant (cancel mid-flight,
  double-tap, fast user input)

Once the Implementer posts changed files, run the full test suite
(unit + integration + acceptance). If a test fails because the
implementation is wrong, log it for the Reviewer — do not patch the
implementation. If the test is wrong, fix the test.

File ownership: you own `Tests/Integration/**` and
`Tests/Acceptance/**`. You must not touch `Sources/**`,
`Tests/Unit/**`, or `specifications/**`.

Post to the shared task list when done with an epic:
- The list of test files created
- Full suite pass/fail counts and any failing test names
- Coverage delta if available
- Any spec gaps discovered (an acceptance criterion untestable as
  written, an error state with no defined trigger, etc.)

================================================================
REVIEWER  —  read-only
================================================================

Wait until both the Implementer and the TestWriter have posted
completion for the epic.

Review scope per epic:
- Every file in the Implementer's changed-files list.
- Every test file the TestWriter created.
- Cross-check the implementation against the ADR — flag any
  deviation from the file-level plan or interface contract that was
  not surfaced and approved as a HIGH issue.
- The epic checkbox updates in `epics-and-tasks-<feature>.md` —
  verify every task in the epic is actually checked off.
- Cross-check: every acceptance criterion in the relevant user
  stories has at least one passing test that exercises it.
  Untested criteria are a HIGH issue.

Review dimensions: correctness, security (input validation, secrets,
auth boundaries, injection vectors, race conditions), performance
(N+1, unnecessary allocations, missing indexes), readability
(naming, structure, dead code, comment quality — comments explain
why, not what), best practices (idioms, framework guarantees, error
handling at boundaries not in internal code), and test coverage.

Issue format:

  [SEVERITY] file:line — Title
  > Problem description and suggested fix.

Severity: CRITICAL | HIGH | MEDIUM | LOW | SUGGESTION

End with a verdict: ✅ Approve | ⚠️ Approve with minor changes |
🔁 Request changes | ❌ Reject

Post the structured review to the shared task list. If requesting
changes, list exactly which teammate must fix what before merge.

Keep the review focused on correctness, performance, readability, and
general best practice. The security dimension is owned by the
SecurityReviewer — flag anything you spot, but defer the security
verdict to it and don't duplicate its work.

================================================================
SECURITYREVIEWER (Mode B — implementation review)  —  read-only
================================================================

Wait until both the Implementer and the TestWriter have posted
completion for the epic. Run in parallel with the Reviewer.

Review scope per epic:
- Every file in the Implementer's changed-files list and every test
  file the TestWriter created.
- The security requirements this feature locked in at spec-time —
  the ADR's security conditions (C-N) and any `SECURITY-PROCEED`
  conditions carried from the Specify phase.

Read first:
- The ADR (security conditions + interface contract) and the relevant
  spec sections.
- The project's living security references and the open findings
  registers — confirm the epic does not reintroduce a known issue.

Verify the code and tests actually MEET each specified security
requirement across the applicable threat dimensions (authN/authZ,
tenant isolation, untrusted input, path confinement, secrets,
CSRF/cross-origin, injection, data minimization, rate limiting,
session/token lifecycle, error disclosure). A required control with
no test exercising it is a HIGH finding.

Issue format:

  [SEVERITY] file:line — Title
  > The requirement, how the code fails to meet it, and the fix.

Severity: CRITICAL | HIGH | MEDIUM | LOW | SUGGESTION

Tie every finding to an invariant, an ADR condition (ADR-NNN C-N), or
a register ID (R-NN / TR-NN). End with a verdict: ✅ Secure |
⚠️ Secure with minor changes | 🔁 Request changes | ❌ Reject.

Post the structured review to the shared task list. Do NOT modify code
or tests — route each finding to the owning teammate (Sources/unit →
Implementer; integration/acceptance → TestWriter).

================================================================
COORDINATION RULES FOR THE LEAD
================================================================

Per-epic flow:
1. Implementer and TestWriter run in parallel from the start of each
   epic. Both read the existing ADR; neither blocks on the other.
2. Reviewer AND SecurityReviewer run after both Implementer and
   TestWriter post completion (the two reviews run in parallel).
3. Surface both verdicts, the changed-files list, and the test results
   to me. Do not start the next epic until I reply with PROCEED — and
   not before both the Reviewer and the SecurityReviewer have approved.

Change-request loop:
- If the Reviewer or the SecurityReviewer returns 🔁 Request changes:
  - Issues tagged to `Sources/**` or `Tests/Unit/**` → Implementer.
  - Issues tagged to `Tests/Integration/**` or `Tests/Acceptance/**`
    → TestWriter.
  - Issues spanning both → both, sequentially: Implementer first,
    then TestWriter re-runs the suite.
  - After rework, the reviewer that requested the change re-reviews
    only the changed files (not the full epic).

Hard stops — halt and surface to me, do not auto-rework:
- Any CRITICAL severity issue from the Reviewer OR the SecurityReviewer.
- SecurityReviewer verdict is ❌ Reject, or any HIGH/CRITICAL security
  finding — do not merge until it is resolved and re-reviewed.
- Test suite fails to run at all (compilation error, missing
  dependency).
- Implementer or TestWriter reports they cannot complete a task
  without a spec change, or that the ADR's interface contract needs
  to change mid-flight. (These belong to the spec phase — re-run
  the Specify team to revise the ADR before resuming.)
- Verdict is ❌ Reject.

Commit policy:
- One git commit per epic, created by the Implementer only after both
  the Reviewer and the SecurityReviewer approve — and only if I
  explicitly say to commit.
- Commit title: `E-XX: <epic name>`.
- Commit body: bullet list of all T-XXYY task IDs included.
- Do not commit work-in-progress; do not squash across epics.
- Never skip pre-commit hooks with `--no-verify`.

================================================================
FEATURE TO IMPLEMENT
================================================================

Spec set lives at: [PATH TO SPEC FOLDER, e.g. `specifications/v1.2/`]
Feature slug: [<feature> — must match the spec/design-spec/ADR
  filenames]
Epics to implement: [E-XX through E-YY, or "all"]

The lead should confirm the following four files exist before
spawning any teammate; halt and surface if any are missing:
- `specifications/<version>/spec-<feature>.md`
- `specifications/<version>/ADR-<NNN>-<feature>.md`
- `specifications/<version>/epics-and-tasks-<feature>.md`
- `specifications/<version>/design-spec-<feature>.md`  (only if the
  feature has UI)
