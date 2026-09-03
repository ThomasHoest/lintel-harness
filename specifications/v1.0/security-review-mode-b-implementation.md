# Security review — Mode B, code gate: the v1.0 implementation

**Status:** Complete
**Date:** 2026-09-03
**Mode:** B — implementation review at the code gate
**Subject:** everything under `src/` at `86a1b8e`, against F1 v6.8, F5, `F1-ADR-001`, and the Mode A conditions C-1…C-62
**Verdict:** ⚠️ **Secure with minor changes** — 0 CRITICAL, 0 HIGH, 1 MEDIUM (**fixed**), 2 LOW, 1 SUGGESTION
**Disposition:** **the MEDIUM is fixed** (F1 v6.9, 2026-09-03) — escaped in output, refused in a destination, one shared constant, four new fixtures. The two LOWs and the SUGGESTION stand; see §5.

---

## 0. Why this review exists

`SECURITY.md` listed two release blockers. One — the `.claude/` permission
pin's missing runtime version — closed on 2026-09-03 (F1 v6.7). This is
the other: **the four Mode A rounds reviewed specifications, and every
line under `src/` was written afterwards.** No review had read the code.

It is worth being explicit about why that gap mattered here more than it
usually does. This project's own record is that **reading under-finds**:
roughly two dozen defects were found by implementing a rule rather than
by reading it, and the session that produced this review found eight more
the same way — a CLI that did nothing when installed, `--help` that
silently ran a validation, a denylist missing `.git`, and a structural
guard blind to the exact class it was written to catch. A review that
only read this codebase would inherit precisely that weakness.

**So this review ran the code.** Every claim in §4 was produced by
executing something against the built artefact or the compiled modules,
not by reading a comment that asserted it. Where I could not execute, I
say so.

---

## 1. Scope

| Assessed | Not assessed, and why |
|---|---|
| Path confinement (4 stages), reserved destinations, collision keys | **AuthN / AuthZ** — no accounts, sessions or callers |
| The `.claude/` permission gate, frontmatter parsing | **Tenant isolation** — single-tenant local tool |
| Untrusted pack content as an input class | **CSRF / SSE / API contract** — no HTTP surface |
| The write path: atomic write, journal, lock, rollback | **Transport security** — no network I/O at all (verified, §4.1) |
| The disclosure and its nonce | **Secret storage** — no credential is ever stored (§4.7) |
| Terminal-output escaping | **Supply chain of dependencies** — there are none (§4.1) |
| Resource bounds | |

The `securityreviewer` role's Mode B procedure names living reference
documents (`security-and-trust-boundaries.md`,
`frontend-sse-and-api-contract.md`). **Those do not exist in this
repository** — they belong to the product the coding pack was extracted
from. That is pack-content staleness, recorded here as SUGGESTION-1 and
not otherwise acted on, since editing `packs/` is spec-governed F5 work.

---

## 2. The trust model, stated plainly

Everything below depends on one fact that is easy to miss and does most
of the security work at v1.0:

> **A pack cannot be supplied by an attacker.** `packDir()` resolves from
> `import.meta.url` — the install directory — and **never** `process.cwd()`.
> `lintel harness validate ./packs/writing` is refused with *"is not a
> pack bundled with lintel 1.0.0"*. The only packs that exist are the
> three shipped inside the published tarball.

So the hostile-pack threat model that the 31 adversarial fixtures defend
against is, at v1.0, **defence in depth rather than a live boundary**.
That is the right posture — `contribute` (F4) and third-party packs
arrive at v1.1 and turn it into a live one — but it is the reason the one
MEDIUM below is a MEDIUM and not a HIGH.

---

## 3. Findings

### [MEDIUM — FIXED] `src/diag/escape.ts` + `src/security/confine.ts` — bidi and zero-width characters

**The requirement.** C-50 and F1 §NFR *Control characters in output*:
every diagnostic, prompt and disclosure row passes through one escaper,
because a pack that can write control characters into an applied path, a
parameter `prompt` or an agent's frontmatter can **erase or overwrite the
disclosure it had just triggered**. The disclosure is this product's
central security control — *"here is every path I will write, here is
every agent's permissions"* — and its whole value is that a user can read
it and decide.

**What ships.** Two character classes:

```
IN_LINE  = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u2028\u2029]/g
IN_VALUE = /[\u0000-\u001F\u007F\u2028\u2029]/g
```

C0, DEL and the Unicode line separators. **Neither class contains the
bidirectional overrides (U+202A–U+202E, U+2066–U+2069) nor the
zero-width characters (U+200B–U+200D, U+FEFF).**

**Verified, not inferred.** Executed against the built module:

| input | `escapeLine` | `escapeValue` |
|---|---|---|
| ANSI CSI | escaped | escaped |
| NUL, U+2028 | escaped | escaped |
| **RLO U+202E, LRO U+202D, RLI U+2067, PDI U+2069** | **passed through** | **passed through** |
| **ZWSP U+200B, ZWJ U+200D, BOM U+FEFF** | **passed through** | **passed through** |

And `confinePath` **accepts** such a destination — `confinePath('x\u202E.md')`
returns an `AppliedPath`, while it refuses `..`, absolute paths, UNC,
device names and trailing dots.

**The failure scenario.** A step whose `to` is `scripts/setup\u202Egnp.sh`:

- the bytes on disk end `.sh` — an executable shell script;
- the disclosure line, after `escapeLine`, still contains U+202E;
- **in any bidi-aware terminal it renders as `scripts/setuphs.png`.**

The user reads the disclosure, sees what appears to be an image, and
approves. This is the Trojan Source shape, and it is *the same class* as
the ANSI-escape attack the project already treats as important enough for
two dedicated fixtures ("a step whose `to` carries an ANSI escape",
"agent frontmatter carrying an ANSI escape"). Zero-width characters give
the weaker but related property that two distinct paths render
identically.

**Why MEDIUM and not HIGH.** Not reachable at v1.0: the only packs that
can be applied are the three bundled ones (§2), and none contains such a
character. It becomes reachable the moment `contribute` (F4) or
third-party packs land — which is v1.1, and is exactly when this control
is load-bearing rather than precautionary.

**FIXED 2026-09-03 (F1 v6.9) — and the fix is not the one this section
first proposed.**

The original recommendation was *"escaped rather than refused, consistent
with the module's existing decision"*. **That would have left half the
finding open**, and the document is kept honest about it rather than
quietly rewritten: C-50's own reasoning, recorded at T-0113, closes the
*path* carrier by **refusal at stage-1 grammar** — explicitly *"a stronger
control than escaping"* — and only the prompt and frontmatter carriers by
escaping. A fix that escaped everywhere would have kept accepting a
destination that renders as something other than what it is.

So it landed in **two** places, mirroring C-50's split exactly:

| Carrier | Treatment | Where |
|---|---|---|
| Parameter `prompt` | **escaped** | `escape.ts` — prose the CLI must still print |
| Verbatim frontmatter | **escaped** | `escape.ts` — same |
| A step's destination | **refused** | `confine.ts` stage-1 grammar — no legitimate use |

One shared constant, `BIDI_AND_INVISIBLE`, so the two modules cannot
drift apart:

```
U+061C                        ARABIC LETTER MARK
U+200B-U+200F                 zero-width, LRM, RLM
U+202A-U+202E                 bidi embeddings and overrides
U+2066-U+2069                 bidi isolates
U+FEFF                        zero-width no-break space
```

**Tests:** four adversarial fixtures added — prompt, frontmatter,
destination, and a zero-width destination — taking that suite from 60 to
**64**; plus a ten-character table in `catalogue.test.ts` asserting both
escapers. All three bundled packs still validate `--all --strict` at
exit 0, so nothing legitimate was caught by the new refusal.

---

### [LOW] `src/security/confine.ts` — a path component of unbounded length is accepted

`confinePath('a'.repeat(300) + '.md')` is accepted. Windows `MAX_PATH` is
260 characters; the write fails there at the OS level. This degrades to
`E-WRITE-FAILED` — a clear diagnostic, and **after** a partial apply
rather than before one, which is the only reason it is a finding at all.
The pack-level bounds (`MAX_FILE_BYTES`, `MAX_PAYLOAD_BYTES`,
`MAX_ENTRIES`, `MAX_DEPTH`) have no per-component length peer.

**Fix:** bound a path component at 255 bytes (every mainstream filesystem's
limit) in the grammar stage, so it fails at `validate` rather than mid-write.

---

### [LOW] `src/security/confine.ts` — a leading space in a path component is accepted

`' leading.md'` is accepted while `'trailing '` and `'trailing.'` are
correctly refused. The asymmetry looks unintended: the trailing forms are
refused because Windows silently strips them, making the written name
differ from the declared one. A leading space does not have that property
on Windows, so this is cosmetic rather than a confinement hole — but it
is the same class of "the name on disk is not the name you read".

**Fix:** refuse it in the same rule that refuses the trailing forms, or
add a comment stating the asymmetry is deliberate.

---

### [SUGGESTION] `.claude/agents/securityreviewer.md` — Mode B names reference documents that do not exist here

The role's Mode B procedure requires reading
`reference/thoughtpartner/reference/security-and-trust-boundaries.md` and
two siblings. **None exists in this repository** — they are artefacts of
the codebase the coding pack was extracted from. An agent following this
procedure literally cannot complete step 2, and the honest failure mode
is that it invents a substitute.

This is **pack content**, so the fix belongs in `packs/coding/agents/`
first and is spec-governed F5 work (`CLAUDE.md`: *fix the pack before the
copy*). Recorded, not acted on.

---

## 4. Requirements met

Each verified by execution against the built artefact or compiled modules.

**4.1 No ambient attack surface.** `grep` across `src/` for `node:http`,
`node:https`, `node:net`, `node:dgram`, `fetch(`, `child_process`,
`node:worker`, `eval(`, `new Function` returns **nothing** in production
code. `dependencies` is `{}` — zero runtime dependencies, so there is no
transitive supply chain. The structural suite independently asserts there
is no `exec`/`script`/`shell` module beside the primitive registry and
that nothing in the recipe layer imports a process-spawning module.

**4.2 Pack resolution cannot be redirected.** §2. `packDir()` is
install-relative; a `./path` argument is refused by name.

**4.3 Path confinement.** Executed against `confinePath`; every one of
these is **refused**: `../escape.md`, `a/../../escape.md`, `./x.md`,
`a/./b.md`, `/etc/passwd`, `//server/share/x`, `\\server\share\x`,
`C:/Windows/x`, `C:x`, `c:/x`, `a\..\..\b.md`, `a\b.md`, `CON`, `NUL`,
`PRN`, `AUX`, `COM1`, `LPT1`, `con.md`, `CON/x.md`, `trailing.`,
`trailing `, `a//b.md`, `''`, `.`, `..`, and a NUL-bearing name.

**4.4 Case-insensitive collision on `.claude`.** The real risk on macOS
and Windows, where `.Claude/settings.json` and `.claude/settings.json`
are the same file. Verified: `isClaudePath` returns `true` and
`confinePath` refuses for `.claude`, `.Claude`, `.CLAUDE`, `.cLaUdE` and
`docs/.Claude/…`. `collisionKey` uses NFC normalisation with an explicit
in-code warning against "improving" it to `toLowerCase()` — the warning
is correct and the behaviour matches it.

**4.5 Reserved destinations.** `.git/hooks/pre-commit` **and**
`.GIT/hooks/pre-commit` refused; `.harness/manifest.json` and
`node_modules/x` refused. The `.git`/`.hg`/`.svn` row is present (added
F1 v5.8 after it was found missing — `.git/hooks/pre-commit` executes on
every commit, so its absence was arbitrary code execution via one `copy`).

**4.6 The `.claude/` permission gate handles CRLF.** Directly relevant:
Windows CI was red on a CRLF frontmatter fault, so I checked whether the
**product** shared the bug. It does not. `claudeFrontmatterFindings` on an
agent declaring `allowed-tools: Bash` and `permissionMode: bypassPermissions`
raises `E-CLAUDE-TOOL-GRANT` **and** `E-CLAUDE-PERMISSION-MODE`
identically for LF and CRLF input. The failure was test scaffolding only.

**4.7 No credential is stored.** The credential ban is a refusal, not a
handling strategy: a credential-shaped *declaration* is
`E-PARAM-SECRET-SUSPECTED` at exit 2 (pack author's fault, caught before
anything runs), a credential-shaped *answer* is `W-ANSWER-LOOKS-SECRET`
(a warning, because the CLI cannot know a 40-character string is not a
long project name). `notASecret` is boolean-typed specifically so
`"notASecret": "no"` cannot read as truthy and disable the ban — there is
an adversarial fixture for exactly that. The disclosure states plainly
that answers are written verbatim into a committed manifest and are "as
public as this repository", which is the correct posture given there is
no encryption story.

**4.8 The disclosure nonce.** `randomBytes(16)` — **128 bits** from
`node:crypto`, twice the 64-bit floor F1 requires, generated once per
invocation. `Math.random` appears **nowhere** in production code. This is
the mechanism that closed the Mode A CRITICAL by making the property
falsifiable ("a pack cannot predict a random value") rather than relying
on a matching rule; the implementation matches the specification.

**4.9 Rollback cannot delete outside the project.** The concern: the
journal lives in the user's repository and drives `unlink`. Verified —
`rollback-update.ts:141` re-runs `confineAtWrite` (stage 4) on every
journal path immediately before acting, and bails on any diagnostic
before reaching the `unlink` at :148. Deleting through a planted symlink
is safe by construction, since `unlink` removes the link, not its target.

**4.10 Stage 4 covers the largest write.** `confineAtWrite` takes
`WritablePath = AppliedPath | HarnessPath`, not the narrower
`AppliedPath`. This matters: while it took the narrower type, the phase-1
payload copy — the biggest write the product performs — **could not be
re-confined at all**, because `.harness/pack/**` is a `HarnessPath` and
the call did not type-check. The brands are compile-time controls and the
build is `tsc` (not a stripper) for exactly this reason.

**4.11 Resource bounds exist and are plural.** `MAX_FILE_BYTES`,
`MAX_PAYLOAD_BYTES`, `MAX_DEPTH`, `MAX_ENTRIES`, `MAX_RECIPE_STEPS`,
`MAX_EXECUTABLES`, `MAX_COMBINATIONS`, `MAX_LENGTH_CEILING`,
`PATTERN_MAX_SOURCE`, `MAX_PATTERN_LENGTH`. The glob matcher is a
two-pointer walk rather than a compiled `RegExp`, so catastrophic
backtracking is not expressible — and there is a test asserting a
pathological pattern completes under 250 ms.

**4.12 Escaping is tested.** `catalogue.test.ts:169` asserts `escapeLine`
keeps tab and newline while `escapeValue` escapes them, and covers NUL
and U+2028. The control is exercised; §3's MEDIUM is a gap in the
character *set*, not an untested control.

**4.13 The adversarial suite is real.** 31 named attacks over six files,
60 tests, all passing, each asserting the **exact code and exit class**
rather than merely non-zero — on the stated grounds that a fixture
failing for the wrong reason has stopped testing what it was written for.
Several exist because a rule was once too narrow and a pack passed every
stage.

---

## 5. Verdict

⚠️ **Secure with minor changes** — and **the MEDIUM was fixed the same
day**, so what stands is two LOWs and one SUGGESTION.

**Nothing blocks the release.** CRITICAL and HIGH are the halt conditions;
there are none. The one MEDIUM is unreachable at v1.0 because a pack
cannot be attacker-supplied (§2), and the two LOWs are robustness rather
than confinement.

**The MEDIUM was fixed on 2026-09-03** (F1 v6.9), rather than deferred to
the release that would have made it live. It turned out to need fixing in
**two** places, not the one this review first proposed: the escaper, and
`confinePath`'s grammar — because T-0113's own reasoning closes the
*path* carrier by refusal rather than escaping, and the review's initial
recommendation would have left that half open. The set is now one shared
constant so the two cannot drift, and the adversarial suite went 60 → 64.

**What I did not do.** I did not review the three packs' *content* as
adversarial input (they are trusted by §2 and are F5's subject), I did not
audit `update`'s classification for correctness (that is `reviewer`'s
remit, not security), and I did not attempt a timing or side-channel
analysis, which is not meaningful for a local file-writing CLI.

**On the limits of this review.** It found one real gap in a control that
is otherwise carefully and deliberately built — a codebase where the
denylist has a documented warning against a plausible-looking
"improvement", where a brand exists to make a class of mistake
un-typecheckable, and where the fixture harness explains why it asserts
exact codes. The security posture here is unusually good, and the
finding above should be read against that background rather than as
evidence of a pattern.
