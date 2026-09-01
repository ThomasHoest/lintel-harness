# ADR F2-003 — `harness init`, the apply engine's CLI surface

**Status:** Accepted
**Date:** 2026-09-01
**Decides:** `F2-spec-init-apply-engine.md` (US-39…US-56, Q-65…Q-69)
**Reads:** `F1-spec-pack-format-and-manifest.md` **v3.4** · `F1-ADR-001` (amended 2026-09-01, contract current) · `general/interaction-model.md` §11 · `general/pack-application.md`
**Verdict:** **PROCEED** — see §7.

---

## 1. Decision

**`init` adds no engine code.** It is argv → `ApplyInputs` → `planApply()`
→ render the disclosure → `executeApply()` → print a summary. Every
transformation, every check and every byte written belongs to F1, which
already owns `plan.ts`, `execute.ts`, `rollback.ts`, the confinement gate
and the journal.

That is the whole architectural decision, and it is worth stating as one
because the alternative is what usually happens: a command grows a little
resolution logic, then a little validation, then a fallback, and the
engine's guarantees stop being the whole story. **If a rule can be stated
about an apply, it is F1's and `init` does not restate it.**

Three things follow.

**1. The command is a shell, and its size is the evidence.** `init`'s own
code is one command module plus a prompt helper. If either grows past a
few hundred lines, something has migrated out of the engine and should be
migrated back.

**2. Answer resolution is a single ordered function, not scattered
defaulting.** Every declared parameter resolves by exactly one order,
evaluated per parameter, and the first hit wins:

```
1. --set <id>=<value>                     explicit, highest precedence
2. --<flag> <value>                       the pack-declared alias (US-8)
3. interactive prompt                     iff stdin AND stderr are both TTY
4. the declared default                   if the parameter declares one
5. the type's empty value                 "" for string, false for boolean
6. E-PARAM-UNANSWERABLE, exit 1           enum only — see Q-65
```

Steps 1 and 2 are the same precedence level and **passing both for one
parameter with different values is `E-PARAM-INVALID`** (F1 US-8, already
stated there). Step 3 is skipped entirely when either stream is not a TTY,
with **no flag to force or suppress it** — see §3.1.

**3. `--rollback` is a mode of `init`, not a command.** It reads the
journal, reverses it, and exits. It never plans, never resolves an answer
and never touches the bundled pack.

### File-level plan

Only what F2 adds. Everything else it uses is in `F1-ADR-001`'s plan and
is not restated here.

| File | Action | Owner | Purpose |
|---|---|---|---|
| `src/cli/commands/init.ts` | **New** | F2 | The command. argv → `ApplyInputs` → `planApply` → disclosure → `executeApply` → summary. Also the `--rollback` branch, which short-circuits before any of that |
| `src/cli/prompt.ts` | **New** | F2 | The interactive prompt over `node:readline/promises`. **Writes prompts to stderr, never stdout** (§3.2). One function, `promptFor(decl): Promise<string \| boolean>`, and it is the only place a TTY is read |
| `src/cli/answers.ts` | **New** | F2 | The six-step resolution order above, as one pure function over (declarations, flags, prompt callback). **Pure and prompt-injected**, so the order is testable without a terminal — which is the only reason it is its own module |
| `src/cli/summary.ts` | **New** | F2 | The success summary of Q-69: counts per phase, pack and version, selected scaffolds, and the outstanding-items block. **Not** a path enumeration |

**Deliberately absent:** there is no `src/apply/` module in this feature,
no second confinement check, no F2-owned validation, and **no F2-owned
error code** — every code `init` raises is F1's, and F1 v3.0 allocated the
four this spec was missing.

### Public interface contract

```ts
export interface InitOptions {
  pack: string;                       // the positional; E-CLI-PACK-MISSING if absent
  projectRoot: string;
  set: Readonly<Record<string, string>>;   // --set and resolved aliases, merged
  scaffolds: readonly string[];            // --scaffold, repeatable
  force: boolean;
  rollback: boolean;                       // short-circuits everything below
  json: boolean;                           // reserved; init emits no JSON at v1.0 (IM-22)
}

/** The six-step order of §1. Pure: `prompt` is injected, and is null when
 *  either stream is not a TTY — which is how the non-interactive path is
 *  tested without a terminal. */
export function resolveAnswers(
  declarations: readonly ParameterDecl[],
  options: InitOptions,
  prompt: ((d: ParameterDecl) => Promise<string | boolean>) | null,
): Promise<{ answers: Readonly<Record<string, string | boolean>>;
             diagnostics: readonly Diagnostic[] }>;

export function runInit(options: InitOptions): Promise<number>;   // exit code
```

`runInit` returns an exit code rather than calling `process.exit`, so the
whole command is testable in-process. That is not a style preference: F2's
acceptance tests assert **exit classes**, and a command that exits the
process cannot be asserted without spawning one.

---

## 2. Context

F2 is the first feature that *writes to a user's project*, and it arrives
after F1 spent four security rounds bounding what a write may do. The
temptation this ADR exists to refuse is to treat `init` as "the real
feature" and F1 as plumbing. It is the other way round: **F1 is the
feature and `init` is the way a person reaches it.**

The spec's own shape supports that reading. Of its eighteen stories, the
ones that describe *behaviour* — atomicity, confinement, disclosure,
determinism — are all discharged by F1 criteria that already exist. What
is genuinely F2's is narrower: argv, prompting, resolution order, the
summary, and the rollback entry point.

---

## 3. Options considered

### 3.1 How `init` decides to prompt — **chosen: both streams TTY, no flag**

**Chosen.** Prompt if and only if `stdin.isTTY && stderr.isTTY`. No
`--interactive`, no `--no-input`, no environment variable.

**Rejected: an explicit flag.** It reads as more controllable and is
worse. A flag has to have a default, and either default is wrong for
somebody: defaulting to interactive hangs CI, defaulting to
non-interactive silently skips prompts a human wanted. Worse, a flag can
be passed *in contradiction to reality* — `--interactive` with no
terminal is a request the CLI cannot honour and must then error about,
which is a new failure mode invented to serve a flag nobody needed.

**Why both streams and not just stdin.** Prompts go to **stderr** (§3.2).
If stderr is redirected, the user cannot see the question they are being
asked, and a prompt nobody can read is a hang. Checking only `stdin`
would produce exactly that in `lintel harness init coding 2>log`.

**The cost, stated:** a user who genuinely wants to script an answer must
use `--set`, which is the documented path anyway. Nothing is unreachable.

### 3.2 Where prompts and progress go — **chosen: stderr**

**Chosen.** Prompts, progress and the disclosure go to **stderr**; the
summary goes to **stdout**.

**Why.** F6 drives `init` and must capture the disclosure block as a
contiguous substring (IM-10). Interleaving prompts with a summary on one
stream makes that capture position-dependent. Separating them also makes
`lintel harness init coding > out.txt` behave the way a Unix user
expects: the machine-readable residue on stdout, the conversation on
stderr.

### 3.3 Whether `init` validates the pack again — **chosen: no**

`planApply` runs the validation. `init` calling `validate` first would
double every diagnostic and create a second place where the order of
checks is decided — and US-16's fixed check order is a contract F1 states
precisely because two orders would disagree.

---

## 4. The reserved questions, resolved

**Q-65…Q-69 are F2's block. All five are resolved here.** Four of them
were waiting on codes **F1 v3.0 has since allocated**, so this ADR mostly
records that the wait is over — and says so plainly rather than presenting
inherited answers as its own work.

| # | Resolution |
|---|---|
| **Q-65** | **Split by type, and the spec's own instinct was right.** A `string` or `boolean` parameter that is neither `required` nor defaulted and receives no answer **records the type's empty value** — `""` or `false`. That is safe because F1 US-8 already forbids such a parameter from appearing in a `when` (`E-PARAM-UNDECIDABLE`), so it can only be a *substitution* parameter, and substituting empty text is defined behaviour the pack author chose by making it optional. **An `enum` has no empty value**, and inventing one would mean selecting a branch the author did not authorise, so an unanswered optional `enum` is **`E-PARAM-UNANSWERABLE`**, exit 1, zero bytes. **⚠️ This narrows F1's message text — see §5.** |
| **Q-66** | **`E-SET-UNKNOWN-PARAM`**, exit 1, allocated by F1 v3.0. The spec's fallback — `E-PARAM-INVALID` "until F1 adds a code" — is **withdrawn**; it was a poor fit by its own admission, asserting a value fault for an id fault, checkable only by string match. **A scaffold's parameter counts as declared even when that scaffold is not selected**, because the id exists in `pack.json` and the user's mistake is selection, not naming. |
| **Q-67** | **`E-CLI-UNKNOWN-PACK`**, exit 1, allocated by F1 v3.0. Exit **1**, not 2: a user typed a name and can retype it, which is the class `E-CLI-UNKNOWN-COMMAND` sits in. |
| **Q-68** | **`E-CLI-PACK-MISSING`**, exit 1, allocated by F1 v3.0. Distinct from `E-CLI-UNKNOWN-PACK` because the remedy differs — there is nothing to correct, only something to supply. **`--rollback` with no journal is confirmed as decided, not asked:** exit `0`, zero bytes, stating no interrupted apply was found. Nothing is wrong, so nothing is an error. |
| **Q-69** | **Counts plus the outstanding-items block; no full path enumeration.** The disclosure has already enumerated the security-relevant subset **before** the write, which is the enumeration that matters, and a second complete list after the fact would be the largest thing on stdout and would compete with it. A user who wants the full list has `pack info` before and `verify` after. |

---

## 5. Conflicts flagged

**One, against F1, and it is small but real.**

`E-PARAM-UNANSWERABLE`'s message in F1 v3.0 reads *"has no answer and no
default, and there is nowhere to ask"*, with a second line naming the
non-interactive condition. **Q-65 narrows when it fires**: for `string`
and `boolean` there is always an answer — the empty value — so the code
fires for an **`enum`** only, and it fires **whether or not a terminal is
present**, because prompting for an optional enum with no default offers
no "skip" answer either.

**F1 owns the wording** and this ADR does not edit it. What F1 should say:
the fault is *an `enum` parameter that is neither required nor defaulted
and received no answer*, remedy `--set {id}=<value>` or make the
declaration `required` / give it a default. **The exit class does not
move** and no code is added or removed.

**Nothing else conflicts.** F1's file plan already reserves
`src/cli/commands/init.ts` as F1→F2, the contract types are current as of
the 2026-09-01 amendment, and `general/interaction-model.md` §11's `init`
row matches the surface decided here.

---

## 6. Consequences

- **F2 is small, and that is the intended outcome.** Four modules, no
  engine code, no new error code. A reviewer should treat growth here as
  a smell rather than as progress.
- **`resolveAnswers` is pure and prompt-injected**, so the resolution
  order is unit-testable with no terminal. Given the order is where a
  precedence bug would hide silently — a default quietly beating a
  `--set` — that testability is the point of the module boundary.
- **`init` emits no JSON at v1.0** (IM-22). F6 drives it by reading
  stderr, which is why §3.2's stream split is load-bearing rather than
  cosmetic, and why **Q-76 (F6's) has to be answered against `init`'s
  actual output** rather than against a schema that does not exist.
- **No threshold, no interactive confirmation, no "are you sure".** The
  disclosure is shown and the apply proceeds; F1's atomicity and
  `--rollback` are what make that safe, and adding a confirmation would
  imply they are not.

---

## 7. Verdict

**PROCEED.**

The spec is implementable as written. Its five open questions are
resolved above, four of them by codes F1 has already allocated, and the
one substantive decision — Q-65's split by parameter type — follows from
a rule F1 states rather than introducing a new one.

**Two conditions, neither blocking:**

1. **F1 narrows `E-PARAM-UNANSWERABLE`'s message** per §5 before F2's
   tests are written, or the test asserts a message that will change.
2. **F2's acceptance tests assert exit classes in-process**, via
   `runInit`'s return value. A test that spawns a process to read an exit
   code is slower and, more importantly, cannot assert *zero bytes
   written* on the failure paths without a filesystem fixture per case.

**Not decided here, and deliberately:** whether `init` ever gains
`--json`. IM-22 says it has none at v1.0 and F6 works without it; adding
one to serve Q-76 would be designing an interface for a consumer that has
not yet stated what it needs. That is **F6's ADR to raise**, not this
one's to pre-empt.
