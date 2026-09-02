# Pack Format & Manifest Specification — Lintel Harness v1.0
**Version:** 6.2
**Status:** Accepted
**Date:** 2026-09-01
**Platform:** Node ≥ 22 / TypeScript CLI, published as `@lintel/cli`, binary `lintel`, with **`harness` as a command group** — every command in this document is reached as `lintel harness <command>` (Q-16 **as amended by Q-63**). Pack content is Markdown, shell, PowerShell and Bicep; `pack.json`, `recipe.json` and the manifest are JSON. No UI.
**Design spec:** n/a (no UI)
**ADR:** `F1-ADR-001-pack-format-and-manifest.md`, **rewritten 2026-08-31 against the two-phase model** — verdict **`REVISE SPEC`**, whose F1-side change list is its §6.1. **All of it is folded**: changes 1, 2 and 4–11 at **v2.1**, change 3 **withdrawn** by the 2026-08-31 escalation answer and never applied, changes 12–16 at **v2.2**, and changes **17–27 at this version, v2.3** — as amended by **brief Q-54**, which **drops `merge-json` from v1.0** and thereby deletes the subject of several of them. The ADR is authoritative for the decisions it records **except where Q-54 overrides it**, and every such override is named where it lands. Its security conditions **C-1…C-30** are carried forward, deferred, or **resolved by deletion**, all dispositioned in §F1.9. A **Mode A security pass over v2.3** (2026-08-31) returned **`REVISE-SPEC`** with **no CRITICAL** — 2 HIGH, 3 MEDIUM, 3 LOW, and 24 of the 31 prior conditions holding unchanged. Its F1-side findings are **C-31…C-36 and C-38**, folded at **v2.4**, and dispositioned in §F1.9 alongside the ADR's. A **final Mode A pass over v2.4** (2026-08-31) returned **`REVISE-SPEC`** with **no CRITICAL** — 3 HIGH, 3 MEDIUM, 4 LOW, and 36 of 38 prior conditions holding — and summarised the shape of its findings in one sentence: *every HIGH is the same repair stopping one step short of the principle it established.* Its F1-side findings are **C-39, C-40, C-41, C-43, C-45, C-47 and C-48**, folded at **this version, v2.5**. **This is the last review-driven change to F1: the security gate closes after it.**
**References:** `specifications/general/pack-application.md` (the two-phase model — authoritative), `specifications/general/pack-inventory.md` (the three packs, source and applied trees), `specifications/project-brief.md` §12 Q-1…Q-54 (**all resolved**), `packs/coding/specifications/conventions.md`, `packs/coding/` (the pack this format must carry)

**Amendment history**

| Version | Date | Summary |
|---|---|---|
| 1.0 | 2026-08-30 | Initial draft. Defines `pack.json`, the source→applied mapping model, the marked-region grammar, shared references, init parameters, scaffolds, and the `.harness/` manifest. |
| 1.0 | 2026-08-30 | Cross-document consistency pass. Open questions renumbered to project-unique ids Q-18…Q-26. |
| 1.0 | 2026-08-30 | **ADR-001 amendment pass.** Anatomy status enum, `parameters[].flag`, shared `mappings` + `remap`, per-owned-key hashes, `pack.integrity`, `.harness/.gitattributes`, `{{harness:lit:X}}`, US-29. |
| 1.0 | 2026-08-30 | **Security remediation pass.** Folds `F1-ADR-001` §7–§8 (C-1…C-18): confinement by resolution, the anchored `to` grammar, the reserved-destination denylist, the destination-keyed ownable allowlist, the hook exclusion, journal v2 and the five-case rollback table, the consent gate. |
| 2.0 | 2026-08-31 | **Two-phase rewrite.** Folds Q-39…Q-47 and Q-16/Q-17. Apply becomes **two phases**: a verbatim payload copy to `.harness/pack/`, then a **declarative recipe** over seven primitives (US-30, US-31). The source→applied *mapping* model, the marked-region grammar, `source-only`/`applied-only`, `shared/` components, `.harness/base/` and the per-file hash list are **removed**; the manifest becomes minimal (Q-43); `--adopt` is dropped (Q-44); regions become **inert anchors only** (Q-45). `update`, `status` and `contribute` leave v1.0 (Q-42), taking C-3, C-9's region half, C-10/C-11's update paths and C-18 with them. **Retired: US-5, US-7, US-11, US-12.** New: US-30…US-33. 24 codes removed, 12 added, 1 renamed. |
| **2.1** | **2026-08-31** | **ADR-001 fold (`REVISE SPEC`, §6.1's eleven changes), plus Q-48…Q-53.** The manifest becomes **six keys**: `payloadDigest`, a single tree digest over `.harness/pack/`, top-level between `pack` and `parameters` (Q-52), computed over **normalized** content and over the **planned** payload set. `verify` checks it **first and fail-closed** (US-33, §F1.8), which voids and deletes the old "what `verify` cannot tell you" limit. The `skeleton/specifications/` mechanism is **deleted** and replaced by five `rename` steps out of `packs/coding/applied-readmes/` (Q-50); `.harness/` is **excluded** from the folder-README rule as tool-owned, so **`.harness/README.md` does not exist** and C-5 stands absolute with no carve-out. CLI-owned writes are named: **`HarnessPath`**, with **`WritablePath = AppliedPath \| HarnessPath`** (C-14). Added `E-PAYLOAD-DIGEST-MISMATCH`; extended `E-MERGE-JSON-INVALID` to the payload-side `from`. Q-48, Q-52 and Q-53 move to Resolved; **F1 has no open questions**. Next free question id **Q-54**; next free story id **US-39**. |
| **2.2** | **2026-08-31** | **ADR-001 §6.1 changes 12–16 folded — `validate` enforces Q-50 mechanically.** `validate` gains an ordered **step 12, folder READMEs**, between the per-combination render (11) and link integrity; **link integrity becomes 13 and disclosure 14**, so `validate` is a **14-step** runner and the order remains part of the contract. Step 12 runs **per parameter combination**: it takes the proper directory prefixes of that combination's applied paths, subtracts the project root and everything at or under `.claude/` and `.harness/`, and requires `<dir>/<folderReadme>` from the same combination. A gap is **`W-FOLDER-README-MISSING`** — a **warning**, exit 1 only under `--strict`, because without a project root the check cannot tell a directory an apply *creates* from one it merely *writes into* and therefore over-approximates by construction. US-16's CI criterion becomes **`validate --all --strict`**. `pack.json` gains optional **`folderReadme`** (one path segment, default `README.md`) in US-1 and §F1.3. US-3's suggested integration test is restated as **confirmation, not the only enforcement**. One code added; the catalogue holds **78**. No question opens: next free question id **Q-54**; next free story id **US-39**. |
| **2.3** | **2026-08-31** | **Q-54 — `merge-json` is dropped from v1.0 — plus ADR-001 §6.1 changes 17–27.** The primitive set is **six**: `copy`, `rename`, `strip-suffix`, `rewrite-path`, `substitute`, `generate`. `merge-json` and everything that existed only to constrain it are **deleted, not disabled**, the way v2.0 deleted mappings and regions: `ownedKeys`, the ownable-key allowlist and its destination table, the security-relevant key classification, the leaf-only rule, the destination-policy concept, and the whole consent gate (`ConsentInputs`, `--accept-permissions`, `--accept-hooks`). **Nothing writes `.claude/settings.json` at v1.0**, and that is now a *checked* rule rather than a fact about three packs: `.claude/settings.json`, `.claude/settings.local.json` and any `package.json` join the **stage-2 reserved-destination denylist**, matched by `collisionKey`, forbidden to every step by every route, `E-MAP-RESERVED-DEST`. **Six codes removed** (`E-MERGE-JSON-INVALID`, `E-OWNEDKEY-FORBIDDEN`, `E-SETTINGS-MODE-FORBIDDEN`, `E-SETTINGS-CONSENT-REQUIRED`, `E-SUBST-IN-SECURITY-KEY`, `E-HOOKS-NOT-SUPPORTED`), **four added** (`E-RECIPE-FORMAT-NEWER`, `E-JSON-DUPLICATE-KEY`, `E-RECIPE-TOO-MANY-STEPS`, `E-MANIFEST-ANSWER-INVALID`); the catalogue holds **76**. **Retired: US-6** — its entire subject is deleted; the hook rule and the inert-hook-script disclosure it also carried move into US-3. **F-4 resolves for free**: `merge-json` was the only primitive taking a fourth input, so `verify`'s recomputation identity and §NFR's determinism sentence are true **without exception** and C-22's narrowing is **deliberately not applied**. Also folded: phase 2 renders **entirely at plan time** (C-23), the `collisionKey` fix to `E-TARGET-EXISTS` / `--force` / `preExisting` (N-5), `Recipe.formatVersion` in the closed enumeration (C-24), strict duplicate-key JSON parsing (C-25), phase 1's fixed `0644` mode (C-26), the normative `in`-resolution rule and its denylist re-check (C-27), the agent-instruction substitution boundary (C-28), read-back answer validation as class 2 (C-29), the 256-step recipe bound (C-30), and **adversarial fixture packs** in CI (change 27). `validate` remains a **14-step** runner: step 8 becomes *hook-script disclosure*. No question opens: next free **Q-56**; next free story id **US-39**. |
| **2.4** | **2026-08-31** | **Mode A security pass over v2.3 folded — C-31…C-36 and C-38; no CRITICAL, 24 of 31 prior conditions holding.** The **reserved-destination denylist stops being a three-file list and becomes a declared, closed one** (C-31): class 2 now reserves any applied path whose **first segment** is `.github/`, `.vscode/`, `.idea/` or `node_modules/`, and any whose **basename** is `package.json`, `.envrc`, `.npmrc`, `.yarnrc.yml`, `Makefile` or `justfile` — a `copy` to `.github/workflows/` was strictly more capable than the `scripts.postinstall` route `package.json` was reserved to close. It is **named as a denylist and therefore incomplete by construction**, and §NFR *Bounded capability* is **narrowed**: its claim that "there is no code execution path from a pack to the host at v1.0" was false as written and is replaced by what the rules actually enforce. **`.claude/` content is constrained and disclosed** (C-32): a pack-written file under `.claude/` may not declare **tool permissions** in frontmatter — new **`E-CLAUDE-TOOL-GRANT`**, exit 2, zero bytes, over the write set, on the runtime's current key names — and US-13's disclosure gains a **fourth row** naming every pack-shipped `.claude/agents/*.md` with its `tools:` list verbatim. `.git`/`.hg`/`.svn` are reserved at **any** segment, not only the first (C-33), and `.harness/` stays first-segment-only with the difference explained. **Every boolean-typed field must be a JSON boolean** (C-34) — `"executable": "false"` read as *true* and failed open on two security gates; the three boolean fields are enumerated and a non-boolean is `E-UNKNOWN-VALUE`, exit 2. C-28's agent-instruction classifier is **restated over applied paths** rather than payload globs (C-35), which is what makes `AgentTeams/*.md` disclose. A `--force` byte-identical collision whose on-disk basename differs from the planned one **skips the write** and journals the on-disk path (C-36). **`coding` now declares `executableRoots` and ships four executables** in its backend scaffolds (C-38), so C-12's apparatus is exercised rather than dormant; `generate`'s `template` gains `E-RECIPE-SOURCE-MISSING`. **One code added**, none removed; the catalogue holds **77**. `validate` remains a **14-step** runner — `E-CLAUDE-TOOL-GRANT` joins step 11, which is where rendered bytes exist. **Ten** adversarial fixtures and **three** positive assertions added to US-16's minimum set. No question opens: next free **Q-56**; next free story id **US-39**. |
| **2.5** | **2026-08-31** | **Final Mode A pass over v2.4 folded — C-39, C-40, C-41, C-43, C-45, C-47, C-48; no CRITICAL, 36 of 38 prior conditions holding.** Every HIGH was the same defect: a repair that stopped one step short of the principle it established. **The denylist now has exactly one quantifier per shape and one location entry in the whole document** (C-39): a reserved **name** is reserved at **every segment** — `.git`, `.hg`, `.svn`, `.github`, `.vscode`, `.idea`, `node_modules`, `.circleci`, `.devcontainer` — while **`.harness/` is the only first-segment entry**, because it alone names one specific tree this CLI constructs. `settings.json` and `settings.local.json` are reserved **under any `.claude` segment** rather than as two root-relative paths, which is what makes §NFR *Bounded capability*'s load-bearing claim true; `E-EXEC-DEST-FORBIDDEN` is scoped the same way, with `.claude` at any segment; and **`E-CLAUDE-TOOL-GRANT` gains a second quantifier — the phase-1 payload set** — so a pack that merely *ships* `.claude/commands/x.md` cannot land it unchecked inside the committed project. **The permission pin covers every frontmatter key that expresses a permission decision** (C-40), not only tool grants: `permissionMode` joins it, a mode key on a non-agent file is `E-CLAUDE-TOOL-GRANT`, and a **widening or unrecognised** mode value on an agent file is the new **`E-CLAUDE-PERMISSION-MODE`**, exit 2 — which is what refuses `permissionMode: bypassPermissions`, a value neither refused nor shown through v2.4. Disclosure row four prints the **whole frontmatter block verbatim**, not `tools:` alone. **Class 2 gains the execution route nearest the ones it named** (C-41): `.mcp.json` — MCP servers are command lines the runtime launches — plus `.gitlab-ci.yml`, `Jenkinsfile`, `azure-pipelines.yml`, `bitbucket-pipelines.yml`, `GNUmakefile`, `.justfile` by basename and `.circleci`, `.devcontainer` by name. **The C-28 classifier is deleted** (C-43): `agentInstructionSubstitutions` enumerates **every applied path at which a parameter answer was substituted** — five for `coding` — because a total enumeration buys everything a three-clause classifier bought and the classifier had produced two findings. **Factual corrections:** **two** `coding` agents declare `Bash`, not one, and `researcher` declares `WebSearch, WebFetch`, the only network capability any pack ships (C-45); §F1.6 step 6 now names checks **11–14**, which is where `E-CLAUDE-TOOL-GRANT`, `E-SUBST-UNRESOLVED`, `E-SUBST-NEWLINE` and `E-ANCHOR-INVALID` fire during `init` (C-48). **C-47 is recorded, not fixed**: `AnatomyDecl.declaredBy` is a behaviour-selecting value outside US-1's six positions, so `"declaredBy": "payload"` is unhandled — known limit 15, accepted for v1.0, no security gate rides on it. **One code added**, none removed; the catalogue holds **78**. `validate` remains a **14-step** runner and the lifecycle **twelve** steps; nothing is renumbered. **Seventeen** adversarial fixtures are added to US-16's minimum set, and its three positive assertions are consolidated into **two**, both strengthened — the substitution assertion now fixes a **count**, a **membership** and an **exclusion**, which is the only shape that fails when the rule is wrong. No question opens: next free **Q-56**; next free story id **US-39**. |
| **2.6** | **2026-08-31** | **Q-60 — every `W-` code is classified `defect` or `notice`, and `validate --all --strict` can now exit `0` for all three bundled packs.** One severity was doing two jobs: reporting a state a pack **declared on purpose**, and flagging something an author should fix. `planning` could not pass CI for two reasons that were both **design decisions** — its anatomy part 2 is `provisional` because the research says the role set is genuinely unwritten, and its guard script is inert *precisely because* no pack may register an agent hook at v1.0. **The split:** a **`defect`** is author-fixable — `W-FOLDER-README-MISSING`, `W-LINK-DANGLING`, `W-PATH-NON-NFC`, `W-ANSWER-LOOKS-SECRET`, and US-1's unknown-top-level-key warning; a **`notice`** reports a declared state the pack intends and nothing is wrong — `W-ANATOMY-PROVISIONAL`, `W-ANATOMY-ABSENT`, `W-HOOK-SCRIPT-INERT`, `W-ROLLBACK-KEPT`, `W-LOCK-STALE-BROKEN`, `W-MANIFEST-NEWER-CLI`, `W-PACK-NEWER-THAN-CLI`, `W-SCAN-SYMLINK-SKIPPED`. **`--strict` promotes defects only**; a notice always prints, never changes an exit code, and is **never fatal under any flag** — a flag that could promote one would recreate the problem. **The exit classes are unchanged**: a defect still exits `0` normally and `1` under `--strict`; what changed is *which* warnings `--strict` promotes. **Every new `W-` code must declare its class, and an unclassified code is `defect`** — fail-closed, so a forgotten classification makes CI louder rather than quieter; the opposite default was rejected because a silently un-promoted warning is exactly the failure mode this project has hit twice. **`provenance` is defined** — US-1 and §F1.3 — as an optional declared string or object recording what the pack derives from, so the field F5 §NFR *Provenance* already requires every pack to carry stops landing as an unknown top-level key and stops generating a warning. **`coding`'s one real defect is fixed rather than reclassified:** US-16 step 12 quantifies over **proper** directory prefixes, so the intermediate `infrastructure/` needed a README that no step wrote — each backend scaffold gains a **third** step placing the new `applied-readmes/infrastructure.md`, taking the recipe from **19 declared steps to 21**. The two backend scaffolds are mutually exclusive (same category), so only one ever runs and there is no collision. **No code is added and none removed; the catalogue holds 78**, and `validate` remains a **14-step** runner with nothing renumbered. Q-60 moves to Resolved; **Q-56 and Q-61 remain open** against other documents; next free **Q-62**; next free story id **US-39**. |
| **2.7** | **2026-08-31** | **Q-56 and Q-61 — `verify` gains an `adapted` per-path state, and all three packs `generate` their `CLAUDE.md`.** **Q-56.** `differs` was doing two jobs — *someone changed this* and *this was supposed to change* — and they are split here exactly as Q-60 split `defect` from `notice` one layer down. F6's stated job includes adapting the generated `CLAUDE.md`'s project-owned prose, region anchors are inert at v1.0 (Q-45) so nothing distinguished pack-owned regions from project prose, and Q-57 made the conversational path primary — so the skill **always** runs and `CLAUDE.md` is **always** edited. US-33's green `verify`, which is the acceptance test for S7, therefore failed on the normal case rather than an edge one. **The fix:** a recipe step may declare **`adaptExpected`** on the step that produces the file (the `generate` step for `CLAUDE.md` is the case that matters); `verify` reports every applied path in such a step's write set as **`adapted`** rather than `differs` when it has changed; **`adapted` is not a failure and does not affect the exit code**. **An unexpected change still reports `differs` and still fails** — adapt-expected is a **per-path property declared by the pack, never a blanket suppression**, there is no flag, environment variable or pack-level switch that tolerates drift, and a path no step declared behaves exactly as it did at v2.6. The `verify` state enumeration becomes **four and stays closed**: `match`, `adapted`, `differs`, `missing`. **`verify --json` carries the `state` per path**, alongside the `class` field Q-60 put on findings — two different axes, both emitted. **The manifest does not change and stays at Q-43's six keys**, and this is stated explicitly so a later reader does not assume a seventh: the adapt-expected set is **recomputable** from the local `.harness/pack/` payload plus its recipe, which are already the inputs §F1.8's identity takes, so recording it would duplicate a derivable fact. **`adaptExpected` is a JSON boolean**, so C-34's typing rule applies unchanged and a non-boolean is `E-UNKNOWN-VALUE`, exit 2; US-1's closed enumeration of boolean-typed fields grows from **three to four**. **Q-61.** US-32's claim that `coding`'s was *"the only `generate` step in any v1.0 pack"* was **wrong and is corrected**: **all three packs generate their `CLAUDE.md`**, which is what emits the inert anchors Q-45 requires and F5 US-38 asserts for **every** pack — `coding` **six** anchors, `writing` **six**, `planning` **seven**, **nineteen** across three templates, all built. `rename` neither substitutes nor emits anchors, so the alternative would have left two of three packs with nothing for v1.1's `update` to find. §F1.9's forward-investment row is corrected with it. **No step-count arithmetic depended on the wrong claim** — the three `generate` steps were already counted in every recipe total — and one unrelated stale number found during that check is corrected where it stood: US-31 compares the 256 bound against the largest v1.0 pack, which is `planning` at **23** declared steps, not `coding` at 19. **No code is added and none removed; the catalogue holds 78**, `validate` remains a **14-step** runner and the lifecycle **twelve** steps; nothing is renumbered. Q-56 and Q-61 move to Resolved: **Q-1…Q-61 are all resolved and no question is open in any document**; next free **Q-62**; next free story id **US-39**. |
| **2.8** | **2026-09-01** | **Q-63 — the binary becomes `lintel` and `harness` becomes a command group; the package becomes `@lintel/cli`.** A rename, and the only thing in this document it is allowed to change is a name. **Every usage line is now `lintel harness <command>`** — `init`, `validate`, `verify`, `pack info` — and the published package that provides the binary is `@lintel/cli` (the two `npm i -g` remedy lines move with it). **The diagnostic prefix becomes `lintel:`, on all 78 codes**, and the choice is deliberate rather than mechanical: §Technical Context's rule was *match the binary*, the binary is `lintel`, and **a prefix is what a user greps for** — one binary, one prefix, so `grep '^lintel:'` catches every diagnostic this CLI emits whatever group produced it, and the second group Q-64 contemplates does not splinter the token. `lintel harness:` was rejected on exactly that ground: it embeds a group in a line prefix, carries a space into a grep target, and duplicates in every message what the code already says. **Inside a message the name follows position:** the running program is `lintel` (`was written by a newer lintel`, `lintel will not guess`, `the directory lintel itself is installed in`), while a thing the group **owns** is `lintel harness` (`another lintel harness command is running`, `not a lintel harness primitive`, `"lintel harness {command}" does not accept --{flag}`). **`E-CLI-UNKNOWN-COMMAND` is re-scoped, not renamed** — the command is now the *second* positional, so the code answers *`harness` has no such command* — and the fault it does **not** cover, a first positional that is not a known **group**, is **recorded as known limit 16 rather than invented**: different list, different remedy, therefore a different code by this catalogue's own rule, and it belongs in the change that answers Q-64 and decides who raises it. **The two-pass argv parse is confirmed to hold unchanged** (US-8), and the confirmation is written into the spec: two passes are forced by pack-declared aliases being unknowable until the pack resolves, and a **fixed** leading token is recognisable in pass 1 by construction, so it joins nothing to the deferred set and moves no fail-closed point. **No code is added and none removed; the catalogue holds 78**, `validate` remains a **14-step** runner and the lifecycle **twelve** steps; nothing is renumbered and no exit class moves. Q-16 is amended, not superseded, and is left stated in its original terms in `project-brief.md` §12 and the master spec with a pointer to Q-63. Q-63 is resolved in the brief; **next free Q-64, reserved** for whether later tools are built into `@lintel/cli` or loaded as plugins — no question opens here. |
| **2.9** | **2026-09-01** | **Q-62 — the command surface is five, and the fold here is a list.** `update` returns to v1.0 as **F3's** (Q-62, reversing Q-42 for F3), and this document is where the count is written down. **Three places change and no more.** **(1) `E-CLI-UNKNOWN-COMMAND`'s message** now prints `Commands: init, update, validate, verify, pack` — five, in the surface's own order, the two writing commands before the three read-only ones, matching `general/interaction-model.md` §11, which had recorded this exact line as an unfolded defect. **(2) §Technical Context's *v1.0 command surface* row** becomes five and names the ownership: `init` is F2's, **`update` is F3's**, `validate`/`verify`/`pack info` are F1's, and **`status` is not a command** — it is `update`'s read-only mode. v2.8 had recorded the count as stale under Q-62 and deliberately left it, on the ground that Q-63 renamed the surface and did not resize it; the resize lands here. **(3) §NFR *No network*** enumerates the commands and was missing `update`; it is named, and the claim is **not weakened** — `update` moves a project to the version bundled in the installed CLI, so "newer" is resolved by upgrading the package and never over the wire. The quantifier is restated as **every v1.0 command**, so a later one joins the list or breaks it. **What is deliberately not done.** **No code is added and none removed; the catalogue holds 78.** **No code for an unknown command *group*** — that fault has a different list and a different remedy, is **known limit 16**, and belongs to the change that answers **Q-64**; it is recorded, not invented. **Nothing is specified about `update` itself**: its flags, its failure contract, whether it takes the lock, whether it emits a disclosure and any code it may need are **F3's**, and F3 has no spec. F1 states the size of the surface, not the behaviour of a command it does not own. `validate` remains a **14-step** runner and the lifecycle **twelve** steps; nothing is renumbered and no exit class moves. **Recorded as still unfolded, rather than left to be discovered:** the manifest's *what each field is for* table (§F1.8) labels four consumers **"v1.1 `update`"**, US-32's anchor note says the anchors exist so **"v1.1's `update`"** has something to find, and **§F1.9's forward-investment table** is framed as "what it buys v1.1" and twice describes `update` as **merging** against a recomputed base. All of that is now wrong twice over — `update` is v1.0, and **Q-62 builds no merge engine** — but repairing it is a rewrite of a scope argument, not a list, and it belongs with **F3's spec**, which is what will state what `update` actually does with the digest and the anchors. The three places corrected here are the three that state the **size and membership of the command surface**, which is F1's to state and no one else's. **Q-53's Resolved-Decisions row is annotated rather than rewritten** — its answer (F1 owns `verify`) stands; only its count is superseded. No story is added, retired or renumbered: next free story id **US-39**. No question opens: **next free Q-64, reserved**. |
| **3.0** | **2026-09-01** | **Q-79 and Q-81 fold, and with them the batch of defects four reviews had recorded but left standing.** **Q-79 — ship-to-be-filled gets its own states.** A pack ships files whose *purpose* is to be filled in: `project-brief.md` in all three packs, `writing`'s voice guide. Under v2.9 a filled one reported `differs`, so `verify` exited 1 and **US-33's green run — the acceptance test for S7 — was unreachable on any project anybody had actually used**; it passed only because nobody had filled the brief. **A step may declare `fillExpected`** (US-31), and `verify` gains **two** states, not one: **`unfilled`** (byte-identical to what shipped — you have not filled it in yet) and **`filled`** (edited, as intended). Both are non-failure. **Two, because they are two facts**, and collapsing them would have made `verify` unable to say the one thing a project owner most needs told — that a template is still a template. The enumeration becomes **six and stays closed**: `match`, `adapted`, `filled`, `unfilled`, `differs`, `missing`. US-1's boolean-typed fields grow **four to five**. **`fillExpected` and `adaptExpected` are mutually exclusive on one step** (`E-RECIPE-STEP-INVALID`): a file is either the skill's to adapt or the user's to fill, and a step claiming both is an authoring mistake. **The second fault Q-79 fixes was never reported by `verify` at all:** `update` would have replaced a filled `project-brief.md` with a fresh template. **`update` may never overwrite a `fillExpected` path**, stated here because F1 owns the declaration and a rule left to F3 would be a rule the format does not carry. **Q-81 — zero runtime dependencies, ratified, and `collisionKey` narrows to match.** §NFR gains the posture as a **requirement**: strict JSON, schema validation, glob, semver, the `.claude/` frontmatter reader and the test runner are hand-rolled or stdlib (`node:test`, Node >= 22). The reasoning is the product's own security argument turned on itself — every runtime dependency is code inside the boundary of a tool whose job is writing into a user's repository. **The honest cost is paid, not hidden:** `collisionKey` **narrows to NFC plus ASCII case-folding**, and the limit is documented as **known limit 17**. Full Unicode case folding is neither in the stdlib nor safe to approximate, and a stated limit on a security control beats a silent approximation inside one — but it *is* a narrowing, and two non-ASCII paths differing only by case now collide where the v2.9 text implied they would not. **The catalogue grows 78 → 87**, the first growth since v2.2, and every one of the nine was requested by a spec that could not proceed without it: **four for `update`** (`E-UPDATE-AVAILABLE`, `E-UPDATE-NOT-NEWER`, `E-UPDATE-PARAM-UNANSWERED`, `E-UPDATE-SCAFFOLD-DROPPED`, all F3's to fire), **four for `init`** (`E-CLI-UNKNOWN-PACK`, `E-CLI-PACK-MISSING`, `E-SET-UNKNOWN-PARAM`, `E-PARAM-UNANSWERABLE`, all F2's), and **one notice** for US-13's `link()` fallback (`W-LINK-FALLBACK`) — which US-13 has required since v2.0 while providing no code, making the narrowed guarantee assertable **only by string-matching**, the one thing §Error States forbids. **The journal goes to version 3**: every entry carries **`intent: "write" | "delete"`**, because `update` deletes payload orphans and v2.9's five-case rollback table models no deletion at all; and the journal **records which command wrote it**, because `E-JOURNAL-PRESENT`'s remedy said `init --rollback` unconditionally and after a crashed `update` that lands the user on `E-ALREADY-APPLIED`. **`--dry-run` joins the reserved flag list**, which had eight names and now has nine — without it a pack may declare `"flag": "dry-run"` and shadow `update`'s read-only mode. **The Q-62 residue v2.9 recorded and deliberately left is now cleared**: §What is NOT in scope no longer defers `update` and `status`, US-14 no longer says there is no in-place re-apply, `E-ALREADY-APPLIED`'s message no longer says "update lands in v1.1", US-32's anchor note and the four manifest-consumer rows no longer say "v1.1 `update`", and **§F1.9 no longer describes `update` as *merging* against a recomputed base** — it recomputes and classifies, and **Q-62 builds no merge engine**. `validate` remains a **14-step** runner and the lifecycle **twelve** steps; no story is added or retired; next free story id **US-99**. Q-79 and Q-81 move to Resolved; **next free question Q-82**, with **Q-64 reserved**. |
| **3.2** | **2026-09-01** | **Q-82's consequences for the scaffold rules, and one false statement corrected.** `coding`'s two backend scaffolds became **add-ons** (`addons/`, v1.1, F7), which leaves **`writing-workstream` as the only scaffold in the product**. **No rule changes and no code is added or removed** — the catalogue holds **87** — but three of US-9's branches lose their only bundled subject: same-category exclusivity, the no-category composable branch, and the cross-category `E-SCAFFOLD-COLLISION` matrix. All three are now **fixture-covered only** (T-1220), and US-9 says so rather than leaving a reader to infer that an untested branch is a tested one. **The correction:** US-9 asserted *"`writing-workstream` declares none"* while `packs/writing/pack.json` declares **`"category": "workstream"`** — a false statement about a shipping pack, in the bullet that defines the rule. Behaviourally harmless, since a lone category has nothing to conflict with, which is exactly why it survived four reviews. **`executableRoots` likewise has no bundled declarer** and `executable: true` no bundled use, both noted where they are specified. **Q-83 is opened, not answered**: whether `category` belongs to scaffolds, to add-ons, or both, and who owns the value namespace once add-ons are authored independently. |
| **3.3** | **2026-09-01** | **`F6-ADR-005`'s two conditions: the disclosure gets delimiters, and the surface becomes six.** **(1) The disclosure block gains two sentinel lines.** US-13 has fixed the block's **rows** since v2.0 and never its **boundaries**, and `init` has no `--json` (IM-22) — so **IM-10, which requires the skill to reproduce the block as a contiguous unmodified substring, has been unmeetable since it was written**. Nobody noticed because no consumer existed yet; F6 is the first, and Q-76 is what found it. The fix is the smallest thing that discharges it: two **fixed, versionless, countless** lines, `--- lintel disclosure begin ---` and `--- lintel disclosure end ---`, emitted on **stderr** around the rows. **Rejected: giving `init` a `--json`** — a second output contract, and a schema to version, for a command whose output is otherwise prose and whose only machine consumer is a Markdown file. **Rejected: matching the block's first and last row text** — that makes a consumer's capture depend on message wording this document is free to change, which is the string-matching §Error States forbids one layer up. **(2) The command surface is six**, not five: `lintel harness skill install [--user]` (`F6-ADR-005` §3.1) copies the shipped skill into `.claude/skills/lintel/`. `E-CLI-UNKNOWN-COMMAND`'s message lists six, and §Technical Context's surface row names the owner. **`skill install` writes**, so the writing set goes two → three while the read-only set stays three — `interaction-model.md`'s IM-38 moves from *three of five* to *three of six* in the same pass, and the ratio is the part that matters. **It is subject to the confinement gate like any other write**: it targets `.claude/skills/`, and the product's own tooling does not get the carve-out C-5 denies to packs. **No code is added or removed; the catalogue holds 87** — `skill install`'s failures are existing codes, and it invents none. `validate` remains a **14**-step runner and the lifecycle **twelve** steps. |
| **3.4** | **2026-09-01** | **Mode A over F2/F3/F6 folded — the F1 half: C-49, C-50, C-53, C-55.** **C-49 (CRITICAL) — the disclosure's delimiters were forgeable by the content they wrap.** US-13 prints whole agent frontmatter blocks **verbatim**, so a pack shipping a frontmatter line reading `--- lintel disclosure end ---` truncated the block for any consumer that reads to the marker — the user's eye, or F6 under IM-10 — hiding every `0755` path, tool grant and substituted value after it, in a block that stayed **well-formed and shorter**. **The fix is a containment check, fail-closed**, and it is what C-9's marker-lex half was before Q-45 removed it: **`E-DISCLOSURE-FORGERY`**, exit 2, zero bytes, raised by `init` before emitting **and** by `validate` at step 11 over the same rendered set, so a pack cannot ship the fault at all. **Rejected: a length-prefixed block** — robust, and it makes the delimiter carry a number, which v3.3 rejected for reasons that still hold. **The catalogue grows 87 → 88.** **Why this was CRITICAL under a threat model that bounds hostile packs:** the disclosure exists *because* pack content is untrusted, so a delimiter pack content can forge is a convention rather than a control — and it was a **regression against C-9**, whose v1.1 obligation named exactly this trigger and sat two thousand lines away in a disposition table the change never consulted. **C-50 (HIGH) — one output rule for control characters**, stated once in §NFR and applied in `src/diag/`: C0 other than `\n` and `\t`, plus `U+2028`/`U+2029`, are **escaped** in every diagnostic, prompt and disclosure row. Escaped rather than refused, because a legitimate path or value should not be unprintable — but a pack could otherwise use ANSI escapes to **erase the disclosure it had just triggered**. **C-53 (HIGH) — `skills` joins the reserved-destination names** at any `.claude` segment, on exactly the reasoning that reserved `settings.json`: a pack may not install instructions into the agent runtime of the project it is applied to. Bounded at v1.0 by bundled packs; unbounded the moment F4 ships. **`skill install` is a CLI write and is unaffected** — the reservation binds recipe steps. **C-55 (MEDIUM) — `src/verify/compare.ts` is security-relevant**, recorded in §F1.9: `verify` reports and `update` **writes** on the same comparison, so a defect there is data loss and not a reporting bug. `validate` remains a **14**-step runner — the C-49 check joins step 11 rather than adding a fifteenth — and the lifecycle stays **twelve** steps. |
| **3.5** | **2026-09-01** | **Mode A round 2 — C-57 and C-58. The CRITICAL was carried, and this is what closes it.** v3.4 said the disclosure rows are *"scanned for either sentinel line"* and **never said what that means**, so the check and its consumer could disagree: a pack shipping `--- lintel disclosure end --- ` with a trailing space is **missed by an exact-match check and matched by any consumer that trims** — which is every reasonable consumer. **The truncation attack survives any check stricter than its reader**, so the control was present and its matching rule was the unbounded part. **C-57 — one normalization, stated normatively, and deliberately more liberal than any consumer can be:** a line is a **sentinel candidate** if, after **stripping C0 control characters, trimming ASCII whitespace from both ends, and ASCII-case-folding**, it equals either marker — and **any candidate** is `E-DISCLOSURE-FORGERY`, not only an exact match. **Over-refusing is the correct direction**: a pack whose content legitimately resembles the marker has a one-line problem it can see, and the alternative is a control that fails silently. **F6 states the identical rule for capture**, so the two sides cannot drift. **C-58 — the order is now stated: scan raw, then escape.** v3.4 required both and sequenced neither, and escape-then-scan defeats the check outright — the scan would run over escaped text, stop matching the raw sentinel it exists for, while the bytes a consumer reads are unchanged. The C-50 escaping is therefore **after** the C-49 scan, both over the same normalization, applied **once** before anything else touches a row. **No code is added: the catalogue holds 88.** `validate` remains a **14**-step runner. |
| **3.6** | **2026-09-01** | **Mode A round 3 — C-59 and C-60. The delimiters carry a per-run nonce, and the matching rule is deleted rather than tightened again.** Round 3 carried the CRITICAL a **third** time: v3.5 trimmed **ASCII** whitespace, and `String.prototype.trim()` — the call every consumer reaches for — also trims `U+00A0`, `U+2003` and `U+3000`, so a marker with a trailing NBSP was missed by the check and matched by the reader. **Three rounds, three tightenings, three defeats by a slightly wider consumer normalization**, and the pattern was the finding: the emitter cannot win an argument about what a reader considers "the same string", because the reader is not obliged to tell it. **C-59 ends the class.** The begin line now carries a **per-run nonce** and the end line repeats it — `--- lintel disclosure begin {nonce} ---` — so **a pack cannot forge what it cannot predict**, and the consumer matches the nonce it read rather than a constant it knows. `E-DISCLOSURE-FORGERY` survives, simplified: it refuses content containing the run's nonce, which is now a probabilistic near-impossibility rather than a normalization question. **This does not reintroduce what v3.3 rejected** — v3.3 refused a delimiter carrying a **version or a row count**, which a consumer must *know* in advance and which an added row invalidates; **a nonce is read, not known**, so it creates no compatibility surface. **Accepted cost, and it is real:** the disclosure is no longer byte-identical between two runs. **G-F1-4's determinism is about applied trees and manifests, not stdout**, so nothing it promises weakens — but tests asserting the block must match the nonce as a pattern. **C-60 — where any normalization survives, it uses `String.prototype.trim()`, never a hand-rolled ASCII trim.** The ASCII narrowing was **Q-81 applied where it does not fit**: `collisionKey` folds ASCII because full case folding needs tables and a dependency, and that limit is documented; **trimming is stdlib and Unicode-aware and costs nothing.** Q-81 forbids dependencies, not correctness — and this is how a sound constraint becomes a bug when carried past its reason. **No code added: the catalogue holds 88.** |
| **3.7** | **2026-09-01** | **Mode A round 4 — C-61 and C-62, and the CRITICAL closes.** Round 4 confirmed the nonce defeats prediction-based forgery: pack content is fixed before the run, argv is parsed before the nonce exists, and a stale nonce matches neither the check nor the begin line. **The property is now falsifiable** — *a pack cannot predict a random value* — which is the real gain over three rounds of matching rules, since *our comparison dominates every consumer's* could only ever be disproved by finding one more consumer. **C-61 — the check refuses the delimiter *shape*, not only this run's nonce.** The nonce defeats a pack forging the delimiter it will see; it does nothing about one shipping `--- lintel disclosure end deadbeef ---`, which a consumer matching the **exact nonce** correctly ignores and a consumer **pattern-matching the shape** re-syncs on. That is a consumer bug, and *"safe provided every reader implements it exactly"* is the assumption C-1 was about. **Second reason and not a secondary one:** with the nonce alone `E-DISCLOSURE-FORGERY` becomes **probabilistically unreachable**, and a code that can never fire is one nobody exercises or maintains — the shape refusal gives it a **real, testable trigger**. **C-62 — the nonce's scope is stated: `init`'s delimited stderr block and nowhere else.** `pack info` also renders disclosure rows and `pack info --json` is a machine contract **G-F1-9** rests on; an implementer folding C-59 uniformly would have made its output differ on every invocation. `pack info` emits **no delimiters**, needs none — nothing captures a substring from it — and **stays deterministic**. **No code added: the catalogue holds 88**, and C-61 gives one of them back a reachable trigger. |
| **3.8** | **2026-09-01** | **First implementation task run, and it falsified one sentence of §NFR.** T-0101 built `package.json`, `tsconfig.json` and the install-relative pack resolution. §NFR *Zero runtime dependencies* said the posture is *"assertable as an **empty `dependencies` object** in the published manifest"* — **it is not**: `npm install` **normalises an empty `dependencies` object out of `package.json`**, so a test asserting the literal form **fails on a correct package**. The **requirement is unchanged** and the **assertion is corrected**: *no runtime dependency is declared* — `dependencies` **empty or absent**, both of which express it. **A spec that names a representation rather than a property will be wrong the first time a tool normalises the representation**, and this one survived a ratification decision, a fold and four security rounds before a build caught it. |
| **3.9** | **2026-09-02** | **T-0104 built the catalogue and found three things §Error States does not say.** **(1) The placeholder grammar was undefined.** *"`{…}` interpolation only"* is not a rule a reader can implement: **nine of the 88 messages carry braces that are not substitutions** — JSON a remedy line tells the user to write (`{ "status": "absent", "reason": "…" }` and three more), a **regex quantifier** `{1,64}` inside a recommended `pattern`, and three prose slots. **Now stated: a placeholder is `{name}` where `name` matches `^[A-Za-z][A-Za-z0-9]*$`; every other brace is literal and passes through untouched.** 71 names across the catalogue. **(2) Three slots are described in prose rather than named** — `E-RECIPE-STEP-INVALID`'s *"usage for that primitive"*, and `E-TARGET-EXISTS`'s and `E-VERIFY-MISMATCH`'s *"first ten paths…"*. Under the identifier rule they render **literally**, so the emitting module builds those lines itself. **Recorded as a known gap rather than fixed by renaming**, because renaming changes message text three features already cite; `catalogue.ts` pins the list so it stays visible. **(3) A `→` marks a remedy only at the start of a line.** `E-REWRITE-UNUSED` renders `"{find}" → "{replace}"` as **content** in line 1 — so the obvious reading, *any line containing an arrow is a remedy*, is wrong about a shipping message. **A C-50 refinement lands with it:** an **interpolated value** is escaped more strictly than a template line — LF, CR and HT included — because a value carrying a newline and an arrow would **forge a remedy line**, which is C-1's forgery shape one layer down. C-50's exemption was written for templates, which the CLI controls, not for values, which a pack does. **No code added: the catalogue holds 88.** |
| **4.0** | **2026-09-02** | **`E-PACK-INVALID` added — building the strict reader found the catalogue had no code for a malformed `pack.json`.** US-1 has specified since v2.0 that `pack.json` is parsed by the duplicate-key-rejecting reader, and `E-JSON-DUPLICATE-KEY` covers the duplicate case — but **a syntactically broken `pack.json` had nowhere to go.** `recipe.json` has `E-RECIPE-INVALID` and the manifest has `E-MANIFEST-CORRUPT`; the third document the same reader parses had neither. **By this catalogue's own rule the fault needs its own code** — a different file, a different remedy, and a message that must not be interchangeable with a recipe's. **The catalogue grows 88 → 89**, the first growth since v3.4, and it is the third gap found by *implementing* rather than by review: the placeholder grammar, the unnamed slots and now a missing code, all of which read perfectly in prose. |
| **4.1** | **2026-09-02** | **The boolean-typed enumeration said four in three places and five in one.** Q-79 added **`RecipeStep.fillExpected`** at v3.0 and updated US-1's own bullet to **five** — and left §Technical Context's *Boolean fields* row, US-31's `adaptExpected` bullet and C-34's disposition row all saying **four**. **This is C-34's own finding recurring**, which is why it is folded rather than tidied: C-34 was raised because two security-gating booleans sat **outside** a closed enumeration, and in JavaScript `"false"` is **truthy** — so `"executable": "false"` read as `true` and `"notASecret": "no"` disabled the credential ban, **two gates failing open on a typo**. A validator built against "four" leaves `fillExpected` uncovered, and that is the field gating whether **`update` may overwrite a filled `project-brief.md`**. **The count is five in every place it appears**, and C-34's row now says so with its own history intact. No code added; the catalogue holds **89**. |
| **4.2** | **2026-09-02** | **The placeholder rule v3.9 introduced was itself wrong, and rendering `E-PARAM-NO-PATTERN` proved it.** That message recommends `"^[\p{L}\p{N} ._-]{1,64}$"`, and **`L` and `N` are valid identifiers** — so *"a placeholder is `{name}` with an identifier name"* ate both **Unicode property escapes** and rendered `^[\p200\p64 ._-]{1,64}$`. Advice that is not merely wrong but **unusable**: a pack author copying it gets a regex that does not compile. **The rule gains one clause:** a brace preceded by `\p` or `\P` is a **property escape and is literal**. Note what v3.9 got *right* by accident — `{1,64}` was already literal, because a quantifier is not an identifier — which is why the fault survived: the same line contained a brace the rule handled correctly and two it did not. **This is the third revision of the same rule**, after v3.9 defined it and v4.2 corrects it, and the pattern across all three is that **every counter-example came from a message, not from thinking about the grammar.** A general guard now renders **every** message with its declared names supplied and fails on any surviving brace. |
| **4.3** | **2026-09-02** | **`W-UNKNOWN-KEY` added — the unknown-key rule had a name, a class and a required test, and no code.** US-1 has specified since v1.0 that an unknown **key** warns while an unknown **value** is fatal (C-16); §US-2 calls it *"US-1's unknown-key rule"* when distinguishing it from `E-ANATOMY-SOURCE-ON-ABSENT`; Q-60 assigns it **`defect`** class; and US-1 asks for *"a test … requiring **no** unknown-key warning"*. **None of that was assertable**, because §Error States makes the **code** the stable contract and forbids asserting a fault by string-matching its prose — so a warning with no code is one nothing can test for, in either direction. **Catalogue 89 → 90.** **Second time in two days that a rule stated repeatedly turned out to have no code**, after `E-PACK-INVALID`; both were found by writing the module that had to raise them, and both had survived every review because prose that names a fault reads exactly like prose that codes one. |
| **4.4** | **2026-09-02** | **The glob dialect is decided and stated (U-3, T-0306).** U-3 left it open — *"`*` vs `**`, character classes, braces, negation"* — and asked for the **smallest** that serves `exclude`, `in` and anatomy `paths`. **Surveying every glob the three bundled packs actually contain answers it: `*` is the only non-literal character any of them uses.** So the dialect is **`*` matching within one segment, never crossing `/`, and everything else literal** — `?`, `[`, `]`, `{`, `}`, `!` included, and **`**` is simply two stars and therefore still single-segment**. **No `**`, and the asymmetry is what decides it**: adding it later is **additive**, since every pattern that works keeps working, whereas shipping it and removing it would break packs. A dialect can grow; it cannot shrink. **No classes, braces or negation** — each is a small grammar with its own edges, and **G-F1-9** requires the matcher to be small enough that `pack info` renders an apply *completely*, a claim that degrades as the pattern language grows past what a reader can evaluate in their head. **The matcher is a two-pointer walk, not a compiled `RegExp`**: an author-supplied pattern is untrusted input, and building a regex from one would reintroduce exactly the risk C-7 bounds for `pattern`. A test asserts **no bundled pack uses a construct outside the dialect**, so the survey that decided this cannot silently stop being true. **No code added; the catalogue holds 90.** |
| **4.5** | **2026-09-02** | **Known limit 19 recorded — C-15's matcher does not treat separators uniformly.** Building T-0309 surfaced it: `connection.?string` admits **any** single separator, so *"connection string"* matches, while `api[_-]?key` and `private[_-]?key` admit only `_` or `-` — so **"API key" and "private key" written with a space do not match**, and those are the most natural things to put in a `prompt`. **Recorded rather than widened**, deliberately: broadening a ban changes **which packs are refused**, and that is a decision for this document rather than for the module implementing it. **The exposure is small**: the check is `id` **or** `prompt`, and a parameter holding an API key is unlikely to be named something unrelated — evasion needs an innocuous `id` **and** a spaced `prompt` together. **A test pins the actual behaviour**, so the inconsistency cannot be mistaken for uniformity by the next reader. No code added; the catalogue holds **90**. |
| **4.6** | **2026-09-02** | **`E-PARAM-FLAG-INVALID`'s message enumerated seven of the eight reserved flags.** v3.0 reserved **`--dry-run`** and amended US-8's list; the **message body was not amended with it**, so the diagnostic an author sees on a flag collision listed `--set … --all` and stopped. **A closed enumeration inside a remedy**, which is the failure mode this document warns about in its own review notes — and the worst-placed one available, since the author reading it is by definition someone who has just collided with a reserved name and is being shown a list to choose against. An author who read it and chose `dry-run` would collide again and be shown the same seven names. **Found by building T-0308**, not by review, and the guard is now the same shape as the other drift guards: **a test asserts the `Reserved:` line lists exactly `RESERVED_FLAGS`**, so the list cannot go stale a second time without CI saying so. No code added; the catalogue holds **90**. |
| **4.7** | **2026-09-02** | **Two messages this document required and its own catalogue could not render.** Both found by building T-0402, and both the same shape as the two missing codes before them: **prose that names a behaviour reads exactly like prose that encodes one.** (a) **`E-RECIPE-PRIMITIVE-UNKNOWN`'s `merge-json` line existed only as prose.** The row said *"when `{op}` is `merge-json` the message adds"* and gave the wording — outside the `/`-joined template, so nothing could emit it, while US-31 both **requires** that wording and **forbids** a second code by insisting `merge-json` is this code *"like any other unknown value"*. It becomes a **`{note}` line with two declared values**, one of them empty, and **a line whose placeholders all render empty is omitted** — which is the general rule that makes a conditional line expressible at all. (b) **`E-RECIPE-STEP-INVALID`'s second line was a descriptive slot and should never have been one.** `{usage for that primitive}` is not an identifier, so the placeholder rule leaves it **literal**: every step diagnostic would have printed the words *usage for that primitive* where the usage belongs. Unlike the other two descriptive slots it needs no multi-line construction — it is one line, derived mechanically from the per-op field table. Renamed **`{usage}`** and removed from `DESCRIPTIVE_SLOTS`, which now holds **two**, both genuinely multi-line and both belonging to features not yet built. No code is added or removed; the catalogue holds **90**. |
| **4.8** | **2026-09-02** | **A control character in a path was legal, and it forges a line inside an integrity control.** The stage-1 grammar refused a NUL and nothing else: `\n`, `\r`, `\t` and every other C0 control passed, on an applied path and on a pack path alike. §NFR's tree digest is a **newline-joined listing**, so a payload path containing `\n` contributes two lines, and **two different file sets digest alike** — a collision in the one mechanism `verify` uses to decide whether a payload was tampered with. **Fixed at the source rather than at the digest**: a path holding a control character is refusable on its own merits, since it breaks every line-oriented tool that will ever read the project, and closing it in the grammar closes it for both quantifiers at once instead of leaving `treeDigest` a precondition its caller must remember — which is the implicit-chain shape C-27 already rejects elsewhere. Both grammar remedy lines were **closed enumerations** and are amended with the clause. **Also folded, from the same finding: §NFR named no separator between a path and its hash** — it said *"then"*, which is not a format, while the value is a **compatibility contract** recomputed by later CLIs. Named as **one U+0020**, with the reason it stays unambiguous against a path containing a space. No code is added; the catalogue holds **90**. Found by building T-0601–T-0603, not by review. |
| **4.9** | **2026-09-02** | **Three rules stated in prose that nothing enforced, and one word that promised more than the code does.** All four came out of the E-03 and E-13 verification passes rather than from review — the same shape as every gap this document has found by being built. (a) **`declaredBy` was restricted to `folderScaffolding` and checked nowhere.** A part declaring it names no globs, so it matched zero files *without* raising `E-ANATOMY-EMPTY`: a pack could declare `"roles": { "declaredBy": "recipe" }`, ship no roles, and validate clean. **That defeats G-F1-3 for eight of the nine parts**, whose whole content is that a missing part cannot be silent. Now `E-UNKNOWN-VALUE`, exit 2, and distinct from known limit 15, which is about other *values* rather than this *position*. (b) **`version` and `minCliVersion` "are valid semver" named no code and failed open in both places** — the validator checked only for strings, and the floor check read `satisfiesFloor(...) === false` while an unparseable input returns `null`, so `"1.0"` was neither satisfied nor refused but **ignored**. Both guards are now closed and the code is named. (c) **`W-ANSWER-LOOKS-SECRET` said "high-entropy" and measures no entropy** — it is alphabet-and-length, so `"a" × 40` matches. The check is right and the word was wrong; the word changed. (d) **`T-1220(b)` said `E-SCAFFOLD-EXCLUSIVE` is exit 2** where §Error States and US-9 both say **exit 1**; the epics document is corrected, since the class is the substance — a user picked two of a choose-one and can pick again. No code is added; the catalogue holds **90**. |
| **5.0** | **2026-09-02** | **A rule that refused everything it permitted, and a claim about a pack that had stopped being true.** Both found by building E-05's primitives. (a) **`executableRoots` was self-contradicting.** It declares prefixes *"each ending `/`, each subject to the stage 1 grammar"* — and **stage 1 refuses an empty segment**, which a prefix ending `/` has by construction. So *every legal root was refused by the rule that governs it*, and the contradiction sat inside a **security** control: the roots are the bound on where a pack may write `0755`. It read perfectly well because each half is right on its own. The grammar now applies with the trailing separator **removed**, on the ground that a root names a **directory** while stage 1 is an **applied-path** grammar, and the separator is exactly what distinguishes them. (b) **`executableRoots`' only declarer left the product at Q-82.** F1 stated as fact that *"`coding` declares `executableRoots: ["infrastructure/backend-deploy/"]` and sets `"executable": true` on the two script steps of each backend scaffold"* — true when written, false once both backend kits became v1.1 add-ons. **No v1.0 pack declares a root or sets the bit**, so C-12's whole apparatus is fixture-covered like the scaffold rules Q-82 emptied; a test asserts the emptiness. **T-0508's task text carries the same stale claim** and is corrected with it. No code is added; the catalogue holds **90**. |
| **5.1** | **2026-09-02** | **Four rulings the manifest needed and did not have, plus the exception that proves the unknown-key rule.** All found by building E-07, and all of the same shape as the gaps before them — a completeness claim in prose with no code behind it. (a) **A declared parameter with no recorded answer had no code.** *"Every declared parameter and its answer"* was unreportable: `parameters.ts` defers the case to the manifest's reader and the reader had nothing to raise. Ruled `E-MANIFEST-ANSWER-INVALID` — `E-MANIFEST-CORRUPT` would have said *"is not readable"* of a file that parses fine, while this one already names the exact pair of causes. (b) **Nothing said `cli`, `pack.name` and `pack.version` had to be well-formed**, though all three are read and compared; ruled `E-MANIFEST-CORRUPT` and **fails closed**, on the reasoning that caught the identical hole in `checkCliFloor` at v4.9. (c) **A `payloadDigest` nested inside `pack` was forbidden with no code**, so it would have been reported as *"the top-level key is missing"* — right exit class, wrong reason, remedy pointing at the wrong line. (d) **"Unknown keys at any level" meets a manifest with two closed objects**, root and `pack`, so an implementation carries two collections; the ADR's single flat `unknownKeys` could not hold a `pack`-level key at all. (e) **The manifest draws no `W-UNKNOWN-KEY`, deliberately**: that code is `defect` class, meaning *an author should delete this*, and the manifest has no author — an unknown key there is a newer CLI's data this document requires be **preserved**, so warning would ask a user to delete what forward compatibility depends on, and `--strict` would make a newer CLI's manifest fail an older CLI's CI. **`F1-ADR-001` is amended in the same pass**: `readManifest`, `writeManifest` and `canonicalJson` each had a signature that could not satisfy the task implementing it. No code is added; the catalogue holds **90**. |
| **5.2** | **2026-09-02** | **The last two descriptive slots become real placeholders, and `render` learns to expand one.** v4.7 fixed `E-RECIPE-STEP-INVALID`'s and left these two on the ground that they were *"genuinely multi-line and both belong to features not yet built"*. **E-10 built one of them**, and `E-VERIFY-MISMATCH` would have printed the words *first ten paths, one per line, with "differs" or "missing"* to a user, in place of the paths — the identical defect, now reachable. The reason they were left is real: `escapeValue` escapes `\n` (C-50), so a multi-line value **cannot** pass through a placeholder, and that is deliberate. **So the renderer gains one rule instead:** a placeholder value containing newlines **expands to one output line per input line**, each escaped as a value and then as a line, with the template line's leading indentation preserved. C-50 is untouched — every emitted line is still escaped exactly once as a line and every interpolated value exactly once as a value — while a slot can now hold the ten paths it was always described as holding. **`DESCRIPTIVE_SLOTS` is now empty**, and the concept goes with it: it existed to record a gap, and the gap is closed. No code is added; the catalogue holds **90**. |
| **5.3** | **2026-09-02** | **Three closed enumerations that went false, two of them about `fillExpected` and one about a pack that changed shape a week ago.** Found by building E-14's recipe-shape assertions — the recipes are the fact and these documents are the stale claim. (a) **§Flows said `coding` declares 21 steps.** It declares **15**, and no scaffolds at all, since **Q-82** moved both backend kits to `addons/`; F5 v3.1 had already corrected its own side, so the two documents disagreed and this was the one that stayed behind. (b) **§F1.2's opening sentence enumerated the step-common fields as `when` and `adaptExpected`** while the table three lines below has accepted `fillExpected` on all six primitives since Q-79 — a closed list of two where the fact is three. Its parenthetical also said *"read only by `verify`"*, which is true of `adaptExpected` and **false of `fillExpected`**: that one has two consumers, and the second is `update`'s absolute prohibition, the whole reason Q-79 states the rule here rather than in F3. (c) **US-32's `generate` shape line omitted `fillExpected`**, so a reader taking it as the closed field list would call a step invalid that the schema accepts — unobservable from any bundled pack, which is why only a document check catches it. No code is added; the catalogue holds **90**. |
| **5.4** | **2026-09-02** | **The nonce example was half the floor the sentence above it states**, and the runtime pin has nothing to pin against. Both found by building E-08. (a) US-13's worked example showed `7f3a9c2e` — **32 bits** — under a normative sentence requiring *"at least 64 bits from a cryptographic source"*. Harmless to the rule and dangerous to a reader: a test author copying the example produces a non-conforming nonce, and the suite meant to check the mechanism would be checking a weaker one. Replaced with a 128-bit example, matching what the implementation generates. (b) **§US-3 and §F1.9 obligation 13 both require *"the runtime version the pin was taken against recorded beside it"*, and no document in this project names a Claude Code version** — not F1, not F5, not `general/`, not a pack. The implementation records `null` and states the obligation at the constant, because **an invented version string would answer *"is this pin current?"* wrongly and with full confidence**. **This is a release blocker rather than a code one**, and it is recorded as known limit 21 so it cannot ship unnoticed. |
| **5.5** | **2026-09-02** | **`W-ROLLBACK-KEPT`'s message said the opposite of the truth in one of its three cases.** It read *"kept \"{path}\" — it has changed since it was written"*, and the five-case table has **three** rows that keep a path, of which one is *`true | = intended | = intended`* — the `--force` **byte-identical** case, where the file *"was already correct and was never ours"* and has changed **not at all**. So a user who ran `--force` over an identical file and then crashed would be told that file had changed, which is both false and alarming, on the one row where nothing happened. One code, three reasons, one fixed sentence that could only ever fit two. The message takes **`{reason}`**, the same shape `E-RECIPE-STEP-INVALID` took at v4.7, and the three reasons come from the table rather than from the emitter's imagination. Found by building T-1107. No code is added; the catalogue holds **90**. |
| **5.6** | **2026-09-02** | **The catalogue and F3 disagreed about two exit classes, and one remedy named a flag the command refuses.** Found by building E-23. **(a)** `E-UPDATE-PARAM-UNANSWERED` and `E-UPDATE-SCAFFOLD-DROPPED` were **exit 1** here and **exit 2** in F3 US-69 — which argues the point rather than asserting it: *"Class 1 means you can fix this, and the user **cannot**"*. Neither fault is the user's to repair; both are a pack's, across a version boundary. Corrected to **2**, because F3 reasons and this document merely stated. **(b)** `E-UPDATE-PARAM-UNANSWERED`'s remedy read `→ lintel harness update --set {id}=<value>` — and **F3 US-59 says there is no `--set` on `update`**, so a user following the remedy got a second, unrelated error on top of the first. **This is the third time this catalogue has paid for the same lesson**, after `E-JOURNAL-PRESENT`'s unconditional `init --rollback` and `W-ROLLBACK-KEPT`'s one-size sentence: *a remedy that cannot work is worse than none, because the user believes they tried it*. The remedy now addresses the **pack author**, and the message gains the `{prompt}` slot US-69 requires. **(c)** The row also asserted *"`update` may not fall back to the declared default"* where **US-69 says a new parameter with a `default` is not a fault at all** — the default is used and recorded. The narrow rule survives, on the parameter that is `required` with **no** default, which is the only one nobody can answer. No code is added or removed; the catalogue holds **90**. |
| **5.7** | **2026-09-02** | **US-16's write-set sentence was wrong on a shipping pack, and three of its steps had gaps only a runner could find.** All from building E-09. **(a)** *"the write set is computed **once** here"*, read as one set merged across `when` branches, reports **three `E-MAP-COLLISION`s against a correct `planning`**: its two calibration copies both write `portfolio/` from directories holding identical basenames, and they can never both apply. Corrected to **per combination, union consumed by steps 6–8** — the grammar and denylist are per-path facts, so only the collision rules need the split. It is the same false finding `checkScaffoldCollisions` already avoids by skipping same-category pairs. **(b) Step 11 renders, and this document names no source for the answers it needs**: `coding` and `writing` declare `required` substitution parameters that appear in no `when`, so they sit on no combination axis and must still hold a value or every render fails `E-SUBST-UNRESOLVED`. Recorded as **known limit 22** — the implementation synthesises a candidate from a ladder and returns nothing when the declaration rejects all of them, rather than inventing a value the pack forbids. **(c) `E-PACK-CLI-TOO-OLD` appears in none of the fourteen steps**, though `checkCliFloor` exists precisely so `validate` and `pack info` can report on a pack this CLI cannot apply. The step order is the contract, so the runner does not raise it; recorded rather than smuggled in. **(d) `W-SCAN-SYMLINK-SKIPPED` carries its path only inside the rendered message** — no `path` field, no `data` — so a caller needing the path has to re-derive it. **And one that was read as a spec defect and was a code one:** `W-PATH-NON-NFC` looked unreachable because `confinePath` refuses a non-NFC **`to`** — but the rule is about a **source basename discovered by directory recursion**, and nothing was normalizing those. Now emitted, with the applied path normalized: an NFD name from a macOS checkout would otherwise not match a Linux teammate's NFC one, breaking G-F1-7 **silently**. No code is added; the catalogue holds **90**. |
| **5.8** | **2026-09-02** | **No change to a rule — a record that the adversarial fixtures found the first real hole, and that this document was right about it.** `.git`, `.hg` and `.svn` are declared reserved at **any segment** by US-3 stage 2's **class 1**, and the implementation did not encode them. It encoded class 2, and carried `.harness` separately as a location entry, so class 1 *looked* handled; the drift guard read **the class-2 row alone** and therefore agreed. **Code and guard concurred with each other while both disagreed with this table.** The exposure: `.git/hooks/pre-commit` executes **on every commit**, so a pack able to write one had arbitrary code execution on the next `git commit`, reachable by a single `copy` step — and `docs/.git/hooks/pre-commit` likewise, which is the row US-16 lists for exactly this. **Nothing here changes**, deliberately: the specification was correct and complete, and recording that is the point. What changed is `src/security/confine.ts` and its guard, which now derives from **both** rows. **The lesson is the guard's, not the list's:** a drift guard that reads half a rule certifies half a rule, and this one had been passing for six waves. Catalogue unchanged at **90**. |
| **5.9** | **2026-09-02** | **`{command}`, in the two remedies that still hardcoded `init` — and this is the fourth time.** **F3-R3 raised exactly this fault and it was fixed for `E-JOURNAL-PRESENT` alone.** `E-TARGET-RACE` and `E-WRITE-FAILED` are raised by **both** commands — F3 §Error States says so in as many words — and both remedies read `→ lintel harness init --rollback`. After a crashed `update` that sends the user to a command which answers `E-ALREADY-APPLIED` and leaves the journal exactly where it was. Both take the same `{command}` slot `E-JOURNAL-PRESENT` already has, rendered from the journal rather than assumed. **The count is the point.** *A remedy that cannot work is worse than none, because the user believes they tried it* — and this catalogue has now paid for that lesson at `E-JOURNAL-PRESENT` (v2.9), `W-ROLLBACK-KEPT` (v5.5), `E-UPDATE-PARAM-UNANSWERED` (v5.6) and here. Every one was found by **building the thing that had to raise the code**, and none by reading. A remedy naming a command or a flag is a claim about a surface, and this document should treat it as one. Catalogue unchanged at **90**. |
| **6.0** | **2026-09-02** | **`lintel harness init` applies a pack, and building it found two release-time gaps and one write-path defect.** **Known limit 23 — the CLI has no released version.** `package.json` says `0.1.0` while every pack declares `minCliVersion: 1.0.0`, so resolving the running version from the package would refuse **every bundled pack**. Stated as a constant with the discrepancy recorded, because a build that silently rewrote a floor is worse than one that names the number. **Known limit 24 — the journal's `createdDirs` is unfillable in the specified order.** US-13 wants the created-directory list in the journal, and the journal before the first write; only the writer discovers what it creates, and **predicting it is unsafe** — rollback removes a recorded directory when empty, so over-recording deletes a directory the user already had. The consequence is stated rather than hidden: directories a partial apply created outside `.harness/` survive rollback as empty directories. Found twice independently, by E-11 and E-24. **And a write-path defect closed rather than recorded**: `confineAtWrite` walks a path's **ancestors** and never `lstat`s the final component, so a symlink planted **at** an overwrite target between planning and writing passed confinement — and the next thing `execute` did was read that path's bytes into `.harness/journal.d/` as a backup. **An arbitrary file read, landing in a directory the project commits.** C-51 names exactly this for `update`'s deletes — *the risk is the backup, not the unlink* — and F1's overwrite path carried no equivalent. Catalogue unchanged at **90**. |
| **6.1** | **2026-09-02** | **`E-TARGET-NOT-A-FILE` — a message that was literally untrue, twice in three lines.** A **directory** standing where a step writes a file is invisible to the planner's probe, which sees only regular files. So the plan said *create it*, the writer's exclusive-create failed, and the run reported **`E-TARGET-RACE`**: *"changed while lintel was writing"* and *"the plan expected to create it, and it exists now"* — **nothing changed, and it existed before the plan ran**. The rollback notice then compounded it with *"this apply created it and it has since been edited"* about a path the apply never created. The behaviour was defensible (stop, keep the journal) and every sentence a user read was wrong. §Error States' own rule settles it: *two messages which are not interchangeable are two codes*, and *a race happened, roll back* and *a directory is in the way, remove it* are not interchangeable. **Detected at plan time, exit 1, zero bytes.** Found by E-22 driving `init` against a directory planted at `CLAUDE.md`. The catalogue grows **90 → 91**, its first growth since v4.3. |
| **6.2** | **2026-09-02** | **The exemption T-0211 states in prose now has a constructor, and `--version` exists.** **(a)** T-0211 says *"`skill install` is a CLI write and is unaffected — the reservation binds recipe steps"*, and **no constructor expressed it**: `confinePath` refuses `.claude/skills/` (C-53) and `harnessPath` admits only `.harness/**`, so `skill install` could be typed only by casting past the brand — which would have made it unjournalled, unrollbackable and invisible to every guard. `harness-paths.ts` gains **one** CLI-owned location outside `.harness/`, `.claude/skills/lintel/`, minting `HarnessPath`: the brand means *a CLI write*, and the `.harness/` prefix was a property of the list rather than of the brand. **A recipe step still cannot reach it** — `confinePath` refuses it exactly as before, which is C-53 intact. `WriteRequest.command` and `JournalCommand` gain **`'skill'`** for the same reason they are non-defaultable: the remedy is rendered from them. **(b) `lintel --version` did not exist**, and F6's skill opens **every flow** with it — so the skill halted at step 0 of every task it has. Answered before the group is parsed, printing the bare version on stdout, because a handshake that required knowing the command vocabulary could only be performed by someone who already understood the CLI. **(c) `package.json` did not publish `skill/`**, so `skill install` would have found nothing in an installed `@lintel/cli`. **(d) A failed run left its lock behind.** Keeping it is right **mid-apply** — releasing it would invite a second writer into a half-written project (US-49) — and wrong when the run stopped **before the journal**, where it stranded the project for the stale timeout over a fault one `rmdir` fixes. `ExecuteResult` gains `journalled`, because `complete: false` alone cannot tell the two apart. Removing the empty `.harness/` with it **closed a carve-out E-22 had to record**: *"init writes no applied path except through `executeApply`"* is now simply *"the project directory is untouched"*. |

---

## Introduction

F1 defines the three data structures the product stands on: the **pack
format** (`pack.json` — how a way of working declares its identity,
anatomy, parameters and scaffolds), the **recipe** (`recipe.json` — the
declared procedure that turns a pack into a working project), and the
**manifest** (`.harness/manifest.json` — the small record an applied
project keeps of what it got).

The model this document describes is the two-phase apply settled by Q-39
and specified in `specifications/general/pack-application.md`:

- **Phase 1 — payload.** The pack folder is copied **verbatim** into
  `.harness/pack/`. No renames, no substitution, no rewriting, no
  transformation of any kind. The mechanism is identical for every pack.
- **Phase 2 — application.** A pack-specific **recipe** copies out the
  agents, commands, agent teams, `Run.md` and `CLAUDE.md`, rewrites the
  paths and wires the project up. It reads from the phase-1 copy in the
  project (Q-41), never from the bundle, and it is run by the CLI
  automatically, never by the user (Q-40).

Splitting the apply is what makes this spec smaller than its predecessor
rather than larger. The previous model had one pipeline that had to
express every transformation any pack might need, plus a marked-region
grammar to repair documents that described their own copying. Under Q-46
that prose is deleted from the pack sources — the recipe encodes it — so
**nothing in the payload is wrong once copied**, and the whole
source-only/applied-only mechanism goes with it.

The recipe is a **declaration over a closed primitive set**, not a
script: `copy`, `rename`, `strip-suffix`, `rewrite-path`, `substitute`,
`generate`. **Six primitives, and the set is closed.** A script would
make a pack *code that executes on the user's machine*, which voids the
security model — path confinement and the reserved-destination denylist
both depend on the plan being inspectable **before** anything runs. A
pack can only do what the primitives allow; a genuinely new step requires
a new primitive in the CLI, deliberately, so that what an apply can do
stays enumerable.

**`merge-json` is not one of them, and the reason matters more than the
count** (Q-54). A seventh primitive that merged declared keys into an
existing JSON file — `.claude/settings.json` above all — was specified
through v2.2 and is **deleted at v2.3**, not disabled. It had **no v1.0
consumer**: once F5's three settings steps were removed as invalid
recipes, no pack shipped a settings source file or named a single owned
key, while `merge-json` carried the largest attack surface in the format
and was the subject of both CRITICALs of the 2026-08-31 security
re-review. Deleting the surface is a stronger fix than repairing it. What
goes with it is stated once, here, so nothing is left half-present:
`ownedKeys`, the ownable-key allowlist, the destination-policy table, the
security-relevant key classification, the leaf-only rule and the entire
consent gate. **`.claude/settings.json` is written by nothing at v1.0**,
and §US-3 stage 2 makes that a checked rule rather than an observation.
The whole story — a pack contributing default permissions — is deferred
to **v1.1**, which must re-establish the controls this version deletes
before it re-establishes the primitive; §F1.9 records that obligation in
the terms a v1.1 reader needs.

**What a pack can reach, stated honestly** (C-31, C-32, C-39, C-40,
C-41). Two claims this
document used to make are narrower than they read, and both are corrected
at v2.4 rather than restated. The first: forbidding
`.claude/settings.json` and `package.json` did **not** close the
"destinations a toolchain executes" category, because that category was
named and then enumerated at three members — a `copy` to
`.github/workflows/` writes a file that runs attacker-chosen code on the
user's next push, with a token, which is strictly more capability than
the `scripts.postinstall` route `package.json` was reserved to close. The
category is now a **declared, closed list** (US-3 stage 2), and it is
named for what it is: **a denylist, and therefore incomplete by
construction**. It closes the routes this document has identified; it is
not a proof that no route exists. The second: a pack writes
`.claude/agents/*.md` and `.claude/commands/*.md` **by design**, and that
content is read by an agent runtime as instructions and as declarations.
A command file's frontmatter can pre-authorize tools; that is a
pack-declared grant and it is **forbidden** at v1.0
(`E-CLAUDE-TOOL-GRANT`), deferred to v1.1 with the settings story on
Q-54's own logic — delete the surface rather than police it. An agent
file's `tools:` list is a real capability that all three packs use, so it
is **disclosed rather than gated** (US-13), on the same reasoning C-28
applies to a substituted answer. §NFR *Bounded capability* is rewritten
to say only what these rules enforce.

**And at v2.5 both corrections are carried the last step** (C-39, C-40,
C-41), because in each case v2.4 established a principle and then applied
it to one rule. Three consequences, and each was reachable in one `copy`:
a `.claude/` **anywhere but the root** escaped the settings reservation,
the executable ban and — for a pack that merely *shipped* the file
rather than copying it out — the frontmatter rule, while this document
asserted **normatively** that a nested `.claude/` is read by the runtime
exactly as a root-level one is; the frontmatter pin covered **tool
grants** while agent frontmatter also carries **`permissionMode`**, which
three bundled agents declare today and whose `bypassPermissions` value
removes the very engine C-32b's justification leaned on; and class 2
closed GitHub Actions while `.mcp.json` — a file that declares MCP
servers as **command lines the runtime launches**, and the sibling of
`.claude/settings.json` — appeared nowhere in the spec set. The repair is
one principle stated once and applied everywhere: **a reserved *name* is
reserved at every segment, and `.harness/` is the only *location* entry
in this document.**

Determinism is the load-bearing property, and after Q-54 it holds
**without exception**. The recipe is a pure function of **(payload,
parameter answers, scaffold selection)** — no timestamps, no ordering
dependence, no environment or network reads, **and no primitive that
reads the destination's prior content**. `merge-json` was the only
primitive taking that fourth input; with it gone, every applied path is a
function of the three declared inputs alone. Two applies of the same pack
version with the same answers produce **byte-identical trees, manifest
included**. That is what lets the manifest stay minimal (Q-43): the
applied state is always recomputable from `.harness/pack/` + the recipe +
the recorded answers, so there is no per-file hash list and no
`.harness/base/` store.

The manifest carries **one** hash, and only one: `payloadDigest`, a
single tree digest over `.harness/pack/` (Q-52). Recomputation proves the
applied tree matches *the payload on disk*; the digest is what makes it
also prove the payload is the one that shipped. Without it a hand-edited
payload yields a hand-edited expectation and `verify` reports the project
clean. One hash over one tree is the smallest closure of that gap — not
per-file, not per-region — and because the digest is a pure function of
the payload, determinism is untouched.

This feature is the *format*, not the engine. F2 (`lintel harness init`)
owns the CLI surface and the interactive prompting; F5 authors the three
packs against this format; F6 wraps the CLI in a skill. Where this spec
pins behaviour — primitive semantics, ordering, atomicity, confinement —
downstream features implement it and may not reinterpret it.

### What is in scope

- `packs/<name>/pack.json` — identity, semver, `minCliVersion`, the
  mandatory nine-key `anatomy` object, declared `parameters`, declared
  `scaffolds` (with categories), `executableRoots`, and the reference to
  the recipe.
- `packs/<name>/recipe.json` — the ordered phase-2 steps over the six
  primitives: each primitive's schema, its inputs, its validation, and
  the determinism requirement; and conditional steps (`when`) keyed on
  init parameters, which is how the `planning` pack's
  `calibrations/<name>/` works.
- **Phase 1** — the verbatim payload copy to `.harness/pack/`: what
  validation it still performs, and what it explicitly does not do.
- **Init parameters** — declaration, typing, constraint, CLI aliasing,
  and the ban on credential-valued parameters.
- **Scaffolds** — declaration, categories and variants, selection and
  collision rules.
- The **manifest** — location, minimal schema, forward compatibility, and
  behaviour when missing, corrupt, hand-edited or written by a newer CLI.
  A project holds exactly one pack (Q-12).
- **Verifiability** — the expected applied tree is recomputable from the
  payload, the recipe and the recorded answers; the payload itself is
  bound to the manifest by `payloadDigest`; and `lintel harness verify`
  checks both, digest first.
- The **atomicity, journal and rollback contract** an apply must honour.
- `lintel harness validate` and `lintel harness pack info` — the
  author-facing and adopter-facing views of the same report structure.

### What is NOT in scope

- **The apply engine and its CLI surface** (F2). This spec pins the
  phases, the primitive semantics and their ordering; F2 implements them
  and owns interactive prompting.
- **`contribute`** — deferred to v1.1 (Q-42, unchanged by Q-62). **`update`
  is v1.0 and is F3's** (Q-62), and **`status` is not a command** — it is
  `update`'s read-only mode. What is out of scope here is not the command
  but its *behaviour*: F1 states the format `update` reads and the
  declarations it must honour, and says nothing about what it does.
  Everything that existed only to serve drift detection, 3-way merge or
  contribute is removed from this spec, not merely disabled. The two
  pieces of forward investment that remain are named explicitly in §F1.9.
- **Marked regions.** No region parser, no region hashes, no
  malformed-marker diagnostics, no `E-REGION-TAMPERED` (Q-45). The
  generated `CLAUDE.md` emits **inert anchors** and nothing reads them at
  v1.0.
- **`merge-json`, and the whole settings story with it** (Q-54).
  **Deferred to v1.1**, and removed from this document rather than
  disabled in it: there is no `merge-json` op, no `ownedKeys` key, no
  ownable-key allowlist, no destination-policy table, no
  security-relevant key classification, no leaf-only rule, no consent
  gate, no `ConsentInputs`, no `--accept-permissions`, no
  `--accept-hooks`, and no `E-MERGE-JSON-*`, `E-OWNEDKEY-*` or
  `E-SETTINGS-*` code anywhere in the catalogue. **No pack writes
  `.claude/settings.json` or ships a default permission set at v1.0**,
  and no v1.0 apply asks a user to consent to anything. What v1.1 must
  re-establish before it re-establishes the primitive is enumerated in
  §F1.9.
- **`--adopt`** — dropped (Q-44). A hand-applied tree is brought under
  management by a fresh `init`, using `--force` for byte-identical
  collisions.
- **Source-only / applied-only content.** Removed with Q-46; the payload
  is correct as copied.
- **`shared/` components.** **Resolved: the mechanism does not ship at
  v1.0** (brief Q-48). There is no `shared` array, no `component.json`,
  no digest pin and no bump rule anywhere in this format. `targets` ships
  as `coding`-local content, `planning` ships its own copy (Q-49), and
  `shared/presentation` defers under Q-28. **Deferred to v1.1**, when
  there is a second consumer; F1's retired US-7 stays retired and a v1.1
  mechanism takes a new story id.
- **Pack content.** The nine parts of `coding`, `writing` and `planning`
  are F5's deliverable.
- **Two packs in one project** (Q-12), and **changing an answer or a
  scaffold after init** (Q-21, Q-22).
- **A registry, remote fetching, third-party packs or pack signing.**
  Packs are bundled with the published CLI (Q-2).

---

## Technical Context

Only settled decisions. Rows marked *(brief)* were settled in
`project-brief.md` §12 and are restated, not re-litigated.

| Decision | Choice | Rationale |
|---|---|---|
| Two phases | Phase 1 copies the pack folder verbatim to `.harness/pack/`; phase 2 runs the pack's recipe | *(brief Q-39)* The manual apply was already two things — a dumb copy and a tie-up. The single-phase model treated the second half as awkward exceptions to the first |
| Phase 2 is declarative | An ordered list of steps over a **closed** **six**-primitive set, applied by the CLI, never by the user | *(brief Q-40 as amended by Q-54)* A script is code executing on the user's machine, which voids confinement and the denylist — both of which need the plan inspectable before anything runs |
| Primitive set | **Six**: `copy`, `rename`, `strip-suffix`, `rewrite-path`, `substitute`, `generate`. **`merge-json` does not ship at v1.0** | *(brief Q-54)* It had no v1.0 consumer and carried the format's largest attack surface. Deleting it deletes `ownedKeys`, the destination policy, the leaf-only rule and the consent gate outright. Deferred to v1.1 |
| Phase 2's input | `.harness/pack/` is phase 2's **logical** input and its **literal** input only at `verify`. Phase 2 **renders entirely at plan time**, from planner-resolved payload bytes; `executeApply` reads nothing from disk | *(brief Q-41; ADR §3.6, C-23)* Q-41 fixes which tree is *authoritative*, not the *moment of the read*. A read at execute time would be an environment read (Q-40 forbids), would open a window in which the payload could change after `payloadDigest` was computed, and would make Q-41's own recorded consequence — "the user cannot adjust the payload before phase 2 runs" — false |
| Templates stay put | A pack's document templates and reference docs are **not** copied out. They live in `.harness/pack/` and the project reads them there | *(brief Q-47, superseding Q-38)* The payload is inside the project, so a project still has every template locally, browsable and offline — which was Q-38's whole rationale — without a second copy the tool must keep in step |
| Determinism | The recipe is a pure function of (payload, answers, scaffold selection), **at every applied path with no exception**. Two applies with the same answers produce byte-identical trees **including the manifest** | *(brief Q-40, Q-43, Q-54)* Makes "applied correctly every time" a testable property, and is what lets the manifest carry no hashes. The one primitive that took a fourth input — a `merge-json` destination's prior content — does not ship (Q-54), so the claim needs no exception clause and is not given one |
| Manifest content | **Six keys**: `manifestVersion`, `cli`, `pack`, `payloadDigest`, `parameters`, `scaffolds`. **No per-file hash list. No `.harness/base/`.** | *(brief Q-43 as amended by Q-52)* With the payload local and the recipe deterministic, the applied state is recomputable, so a hash list and a cached base are both redundant — but the recomputation *trusts* the payload, so exactly one hash goes back in |
| Payload digest | `payloadDigest` is **one** SHA-256 tree digest over `.harness/pack/`, recorded **top-level, between `pack` and `parameters`** — never nested under `pack` | *(brief Q-52)* `pack` holds what the pack **declared** (name, version, `formatVersion`, all read out of `pack.json`); the digest is what **this apply observed**. Nesting it would make `pack` a heterogeneous object and make "the manifest records the inputs" untrue in a way that is hard to state |
| Digest content | The digest is over **normalized** content (BOM strip + CRLF/CR → LF), per-file, text normalized and binary raw, never over raw payload bytes | *(brief Q-26, Q-52)* Phase 1 copies raw bytes, so a raw digest would be defeated by any checkout that rewrites them — every Windows clone with `core.autocrlf` would report a tampered payload. **Accepted cost, stated:** a pure line-ending edit of the payload is undetectable |
| No `appliedAt` | The manifest carries no timestamp | Q-43's list does not include one, and omitting it makes "byte-identical trees" true of the whole project rather than of everything except one file. Version control already records when |
| No manifest self-hash | `integrity` is dropped, and with it hand-edit detection | Its only consumer was a merge that no longer happens. A hand-edited-but-valid manifest is indistinguishable from a written one, and that is acceptable precisely because v1.0 never merges against it — `verify` catches a manifest whose answers no longer produce the tree on disk. **Stated plainly:** `payloadDigest` binds the payload to the manifest; nothing binds the manifest to itself, so someone who edits the payload *and* recomputes the digest defeats the check. That is deliberate work rather than an accident |
| Two files, not one | `pack.json` declares identity; `recipe.json` declares procedure | Amends Q-24. Identity is read by `pack info` and by a user choosing a pack; the recipe is read only by an apply. Splitting them keeps the file a human reads short |
| Pack home | `packs/<name>/` in this repo, bundled into the published package | *(brief Q-2)* One release artifact; `npx` needs no network |
| Payload root | The pack directory itself. There is no `contentRoot` | Phase 1 copies the folder verbatim, so a second root would be a thing the copy has to know about. `pack.json` and `recipe.json` land in the payload with everything else |
| Versioning | Per-pack semver + `minCliVersion`; separate CLI semver; both recorded | *(brief Q-3)* |
| One pack per project | **Invariant.** The manifest has one `pack` object, not a list | *(brief Q-12)* Removes the file-collision class rather than solving it |
| Publication | `@lintel/cli`, binary `lintel`, **command group `harness`**, Node ≥ 22 | *(brief Q-16, **amended by Q-63**)* Diagnostics are prefixed `lintel:` — **the rule is *match the binary*, and the binary is what a user greps for**. The prefix deliberately does **not** carry the group: one binary, one prefix, so `2>&1 \| grep '^lintel:'` catches every diagnostic this CLI can emit whatever group produced it, and a second group (Q-64) does not splinter the token. Which group failed is carried by the code and by the message body, both of which are already the stable contract |
| Scaffolds | Three at v1.0: `backend-azure`, `backend-aws` (coding), `writing-workstream` (writing). A scaffold declares a **`category`**; two scaffolds of one category are **alternatives**, and selecting both is an error | *(brief Q-17)* The two backends target the same destination. Under the old model that surfaced only as a path collision, which is a true but unhelpful diagnostic for "you picked two of a choose-one" |
| `CLAUDE.md` | Generated by the `generate` primitive, carrying **inert** region anchors | *(brief Q-45)* Anchors are near-free now and expensive to retrofit; nothing parses them at v1.0 |
| No bootstrap prose | Manual-apply instructions are deleted from pack sources | *(brief Q-46)* The recipe encodes them, so they describe a procedure nobody will perform. This is also why phase 1 can copy verbatim |
| Substitution token | `{{harness:…}}` — a reserved prefix; every other `{{…}}` is left verbatim | Pack content is full of `{{Feature name}}`-style placeholders that must survive apply untouched |
| Hash | SHA-256, lowercase hex, 64 chars, over **normalized** content (§NFR). Used by the journal, by `--force` byte-identity, by `verify`'s comparison **and by the manifest's `payloadDigest`** | In Node stdlib; normalization is what makes a comparison — and a digest — survive a CRLF checkout |
| Text encoding | UTF-8 only; BOM stripped on read, never re-emitted; non-UTF-8 is binary | One encoding, stated once |
| Exit codes | `0` success · `1` user-correctable error · `2` pack, recipe or manifest integrity error · `3` internal error | Lets F6 and CI branch on outcome without parsing text |
| Diagnostic vocabulary | F1's `E-`/`W-` codes and these four exit classes are the **only** CLI error model; §Error States is the only message catalogue | *(`F1-ADR-001`, conflict 4)* A scenario with no code can only be asserted by string-matching |
| Diagnostic classes | **Every `W-` code carries a class as well as a severity**, assigned once in §Error States: a **`defect`** is author-fixable, a **`notice`** reports a declared state the pack intends. **`--strict` promotes defects only; a notice is never fatal under any flag**, and an unclassified `W-` code defaults to **`defect`** | *(Q-60)* One severity was doing two jobs — reporting an intended state and flagging something to fix — which is why `validate --all --strict` could not exit `0` for two of the three bundled packs. Class and exit class are different axes: the exit classes above are unchanged |
| Anatomy status | Three values per part: `present` (default) · `provisional` (needs a `note`) · `absent` (needs a `reason`) | *(`F1-ADR-001`, conflict 3)* F5 asserts provisional counts as an NFR, and free text cannot be counted |
| Confinement | **By resolution, not by string.** The project root is resolved once with `realpath`; every applied path passes one gate and carries the branded type `AppliedPath` | *(`F1-ADR-001` §7.1, C-4/C-14)* Inspecting a declared string says nothing about the filesystem it will meet |
| Path brands | **Two**, and the writer takes their union: `AppliedPath` (a recipe step's destination, the only output of the confinement gate) and **`HarnessPath`** (a CLI-owned write under `.harness/`). `WritablePath = AppliedPath \| HarnessPath` is what the journal, the atomic writer and rollback accept — nothing takes a bare `string` | *(`F1-ADR-001` §1 contract, C-14)* Phase 1 writes are journalled like any other write, but their destination is one the reserved-destination denylist forbids to a recipe step. With one brand the denylist deadlocks against the payload copier; with none, C-14's "a path that skipped the gate is a compile error" stops holding across phase 1 |
| Folder READMEs | Every folder an apply creates carries a README, whose basename the pack **declares** in `pack.json` as `folderReadme` — default `README.md`, which `coding` and `planning` take; `writing` declares `index.md`. **`.claude/` and `.harness/` are excluded — both tool-owned.** There is no `mkdir` primitive, no eighth primitive, no `skeleton/` tree and no `.gitkeep`. **`validate` checks the rule**, per parameter combination, at US-16 **step 12** (`W-FOLDER-README-MISSING`, a **`defect`**-class warning, fatal under `--strict`) | *(brief Q-50, as amended 2026-08-31)* A content decision with a format consequence: it makes the empty-directory premise false rather than solving it. `.harness/` is excluded on stronger grounds than `.claude/` — a user may edit an agent file, but `.harness/pack/` is phase 2's *input* and C-5 forbids any recipe step writing there |
| v1.0 command surface | **Six commands, all under the `harness` group** — `lintel harness init`, `… update`, `… skill install`, `… validate`, `… verify`, `… pack info`. **`skill install` is F6's surface over an F1 write** and is the third writing command (`F6-ADR-005`). **`init` is F2's and `update` is F3's** — the two that write; **`validate`, `verify` and `pack info` are F1's** — the three that never do. **`status` is not a command**: it is `update`'s read-only mode | *(brief Q-53 and **Q-62**; group by Q-63)* The three read-only commands read a pack or a manifest, write nothing, take no lock, and exist to make the format checkable. F2 owns the apply and nothing else; F3 owns `update`. **Corrected 2026-09-01 from four:** v2.8 recorded the count as stale under Q-62 and deliberately left it, because Q-63 renamed the surface and did not resize it; the resize lands here, together with `E-CLI-UNKNOWN-COMMAND`'s command list. **F1 states the count and nothing more** — `update`'s flags, exit behaviour and any code it needs are F3's, which has no spec yet |
| Settings | **No pack writes a Claude Code settings file at v1.0, and none may.** The basenames `settings.json` and `settings.local.json` are **reserved under any `.claude` segment** — not as two root-relative paths (C-39a) — so `docs/.claude/settings.json` is refused too (US-3 stage 2): forbidden to every step, by every route, matched by `collisionKey`, `E-MAP-RESERVED-DEST`, exit 2 | *(brief Q-54; C-39a; C-1, C-19, C-20 resolved by deletion)* **The scoping is the fix, not a detail.** Through v2.4 the reservation was two exact paths while this document asserted normatively that a nested `.claude/` is live, so `docs/.claude/settings.json` passed every stage — which falsified §NFR *Bounded capability*'s claim that "nothing writes `.claude/settings.json`, because it is a reserved destination for every step by every route", the claim the whole Q-54 deletion rests on. With `merge-json` gone, the destination-policy apparatus that decided *what* a pack could own is deleted. The rule that replaces it is stronger and one line long: a pack cannot write those files at all. Stated as a denylist entry rather than as a property of three packs, so a test can assert it |
| Reserved destination class 2 | A **declared, closed list** of destinations a common toolchain executes or which govern what may be executed. **Names, reserved at every segment:** `.github`, `.vscode`, `.idea`, `node_modules`, `.circleci`, `.devcontainer`, **`skills`** (C-53 — a pack may not install instructions into the agent runtime of the project it is applied to, on the reasoning that reserved `settings.json`; `skill install` is a CLI write and is unaffected, since the reservation binds recipe steps). **Basenames, at any depth:** `package.json`, `.envrc`, `.npmrc`, `.yarnrc.yml`, `Makefile`, `GNUmakefile`, `justfile`, `.justfile`, `.mcp.json`, `.gitlab-ci.yml`, `Jenkinsfile`, `azure-pipelines.yml`, `bitbucket-pipelines.yml`. **Under any `.claude` segment:** `settings.json`, `settings.local.json`. **It is a denylist and is incomplete by construction** | *(C-31, C-39d, C-41)* Through v2.3 the class was a *category* enumerated at three members, so `.github/workflows/ci.yml`, `.vscode/tasks.json`, `.envrc` and `node_modules/.bin/<name>` all passed every stage. A closed list can be tested one fixture per row; a category cannot. **v2.5 fixes the quantifier and the membership together.** Every entry is now a **name**, reserved wherever it appears, because npm workspaces create nested `node_modules/.bin`, a subfolder opened as a workspace root reads its own `.vscode/tasks.json`, and a nested repository's `.github/workflows/` runs on that repository's next push — the same argument that already put `.git` at any segment (C-33). Membership gains the execution route nearest the ones the class named: **`.mcp.json` declares MCP servers as command lines the runtime launches**, and is the sibling of `.claude/settings.json` (C-41) |
| `.claude/` content | A pack **ships** agents, commands and skills under `.claude/` by design. It **may not declare a permission decision** in the frontmatter of anything it writes there **or ships there** (`E-CLAUDE-TOOL-GRANT`, exit 2), with **one enumerated exception**: an **agent** file's `tools:` list and its `permissionMode`, both **permitted and disclosed verbatim** — and `permissionMode` only for a **non-widening** pinned value, a widening or unrecognised one being **`E-CLAUDE-PERMISSION-MODE`**, exit 2 | *(C-32, C-39a/b/c, C-40)* A command file's `allowed-tools` frontmatter is a pack-declared pre-authorization, and `!`-prefixed body lines execute shell under it — a host-execution path by ordinary `copy`. A subagent's `tools:` list is different in kind and all three packs use it, so forbidding it would delete the feature: enumerate, do not gate (C-28's trade). **`permissionMode` is different again and v2.4 missed it** (C-40): it is not a request made *underneath* the engine, it *selects the engine's mode*, and `bypassPermissions` on an agent that also declares `Bash` was neither refused nor shown. The pin therefore covers **every frontmatter key that expresses a permission decision**, and the rule is quantified over **the write set and the phase-1 payload set**, since a `.claude/` subtree shipped in the payload lands inside the committed project at `.harness/pack/.claude/` (C-39c) |
| Boolean fields | Every boolean-typed field in `pack.json` and `recipe.json` must be a **JSON boolean**. The complete list at v1.0 is **five**: `RecipeStep.executable`, `RecipeStep.adaptExpected`, **`RecipeStep.fillExpected`** (Q-79), `ParameterDecl.required`, `ParameterDecl.notASecret`. Anything else is `E-UNKNOWN-VALUE`, exit 2 | *(C-34)* US-1's closed enumeration of behaviour-selecting positions affirmatively **excludes** these, so no rule said what a non-boolean did — and in JavaScript `"false"` is truthy, so `"executable": "false"` reads as **true**. Both of the two security-gating booleans therefore failed **open**: one bypasses C-12's executable apparatus, the other disables C-15's credential ban |
| Agent hooks | **No pack may register an agent hook at v1.0.** A pack may **ship** a file under `.claude/hooks/` as ordinary `0644` content; nothing registers it and nothing runs it (`W-HOOK-SCRIPT-INERT`, a **`notice`**: shipping one is intended, so `--strict` never promotes it — Q-60) | *(`F1-ADR-001` §7.2.5, C-1)* **The rule predates Q-54 and is not a consequence of it.** It was a *format* decision — a hook is arbitrary shell run on events the user does not initiate, and v1.0 has no provenance story for one — taken while `merge-json` still existed and `hooks` was excluded from the ownable set by name. Q-54 makes it trivially true (nothing writes settings at all), which is exactly why it is restated here rather than allowed to lapse with its old mechanism |

---

## Goals

- **G-F1-1** — Phase 1 is expressible in one sentence and needs no
  per-pack knowledge: the pack folder appears at `.harness/pack/`,
  byte-for-byte.
- **G-F1-2** — `recipe.json` can express every step the coding pack's
  applied tree requires (`pack-inventory.md`), using only the six
  primitives and no escape hatch.
- **G-F1-3** — A pack declares all nine anatomy parts, and
  `lintel harness validate` fails a pack that silently omits one.
- **G-F1-4** — Two applies of the same pack version with the same answers
  into two empty directories produce **byte-identical trees, manifest
  included**. **The empty-directory qualifier is now belt and braces
  rather than load-bearing**: it was written when `merge-json` could
  union onto a destination's prior content, and with that primitive gone
  (Q-54) no primitive reads anything the project already held, so the
  property holds into a non-empty directory too — over the paths the
  recipe writes, which are the only paths it claims.
- **G-F1-5** — The expected applied tree is recomputable from
  `.harness/pack/`, the recipe and the manifest's answers alone — no
  network, no bundle, no cached base — and `lintel harness verify` proves
  it. `verify` first proves the payload it recomputes from is the payload
  the apply recorded, so the recomputation is an assertion rather than a
  tautology.
- **G-F1-6** — A failed apply leaves the project either fully applied or
  fully unapplied; a crashed apply is detectable and reversible by one
  command, and rollback never deletes a file that existed beforehand.
- **G-F1-7** — The same pack applied on macOS, Linux and Windows produces
  identical trees and identical manifests.
- **G-F1-8** — The `planning` pack's constraint-floor calibration is
  expressible by conditional recipe steps alone, and the cost of
  expressing it is stated rather than discovered during F5.
- **G-F1-9** — No pack can do anything at apply time that is not one of
  the six primitives, and `lintel harness pack info` can enumerate what
  a pack will do before it is applied — **completely**, which is why the
  step count is bounded (US-31, `E-RECIPE-TOO-MANY-STEPS`): a list too
  long to read is a control that has quietly stopped working.

---

## Out of Scope (this version)

- `update`, `status` and `contribute` (Q-42), and with them: drift
  reporting, 3-way merge, the merge base, region tamper detection and the
  contribute policy gate.
- **`merge-json` and the settings story** (Q-54) — deleted from this
  document, not disabled in it; deferred to v1.1 with the obligations of
  §F1.9.
- Marked regions as a live mechanism (Q-45). Anchors are emitted and
  never read.
- `source-only` / `applied-only` content (Q-46).
- `--adopt` (Q-44).
- `shared/` components and the Q-4 bump rule's tooling — **deferred to
  v1.1** (Q-48, resolved in the brief).
- Re-calibrating a parameter answer or changing the scaffold set after
  init (Q-21, Q-22) — earliest v1.1.
- Remote or third-party packs, a registry, and pack signing.
- User inspection or editing of the payload between the two phases
  (Q-41).
- Any manifest consumer beyond the CLI — no API, no schema publication.

---

## User Stories

Range used: **US-1, US-2, US-3, US-4, US-8, US-9, US-10, US-13,
US-14, US-15, US-16, US-29, US-30 … US-33.** Next free id: **US-39**.

**Retired, never to be reused:** **US-5** (source-only/applied-only —
Q-46), **US-6** (own part of a settings file — **Q-54**), **US-7**
(shared components — Q-48), **US-11** (drift reporting — Q-42),
**US-12** (merge base — Q-43). F5 holds **US-17…US-28** and
**US-34…US-38**.

**US-6 is retired because its entire subject is deleted**, not because it
was folded elsewhere: `merge-json`, `ownedKeys`, the ownable-key
allowlist, the destination-policy table and the leaf-only rule all leave
v1.0 with Q-54. Two things US-6 also carried are **not** deleted and have
moved rather than lapsed — **no pack may register an agent hook at
v1.0**, and **a pack may ship an inert file under `.claude/hooks/`** —
both now stated in **US-3**. **The id is retired, never reused**: a v1.1
`merge-json` story takes a new id, which forces it to restate its
controls rather than inherit a heading.

---

**US-1 — Declare a pack's identity, versions and recipe**
> As a pack author, I want to declare a pack's name, version, minimum CLI
> version and recipe in one file so that an applied project can record
> exactly what it got and the CLI knows how to apply it.

**Acceptance criteria:**
- `packs/<name>/pack.json` exists, is valid JSON, and carries
  `formatVersion` (integer), `name`, `version` (semver), `title`,
  `minCliVersion` (semver) and `recipe`.
- `name` matches `^[a-z][a-z0-9-]{1,31}$` and equals the directory name;
  a mismatch fails validation.
- `version` and `minCliVersion` are valid semver; a non-semver value
  fails validation with **`E-UNKNOWN-VALUE`, exit 2**. **The code is named
  here because the rule had none**, and a rule with no code is a rule
  §Error States forbids asserting: through v4.8 the validator checked only
  that both were strings, and `checkCliFloor` acted on a `false` result
  while an unparseable version returns `null` — so `"minCliVersion": "1.0"`
  passed validation **and** passed the floor check. Fail-open on the one
  field whose entire job is refusing a pack this CLI is too old for.
- A CLI older than `minCliVersion` refuses to apply the pack and prints
  the verbatim `E-PACK-CLI-TOO-OLD` message from Error States.
- `formatVersion` greater than the CLI's supported pack-format version
  fails with `E-PACK-FORMAT-NEWER`; equal or lower proceeds.
- `recipe` is a pack-relative path, defaulting to `recipe.json`. A
  `recipe` naming a file that does not exist in the pack fails with
  `E-RECIPE-MISSING`, exit 2. A `recipe` path that escapes the pack
  directory, or is not a plain relative path, fails with
  `E-PAYLOAD-PATH-INVALID`.
- There is **no `contentRoot`**. Every pack-relative path in `pack.json`
  and `recipe.json` resolves against the pack directory itself, which is
  what phase 1 copies.
- **`folderReadme` is optional and names the basename that satisfies the
  Q-50 folder-README rule for this pack.** It is **exactly one path
  segment**, subject to the same segment grammar as a step's `to` (US-3
  stage 1): no `/`, no `..`, no backslash, no control character, no segment ending in `.` or
  whitespace, NFC. A value that fails that grammar, or that contains a
  separator, fails validation with `E-MAP-PATH-GRAMMAR`, exit 2. Absent,
  it defaults to **`README.md`**; `coding` and `planning` omit the key,
  and `writing` declares `"index.md"`. It is **declared, never sniffed** —
  a check that accepted either basename could not report a missing one,
  which is the fail-closed rule of this section applied to a content
  convention. Its only consumer is US-16 **step 12**. A test may assert
  the default by validating a pack that omits the key and requiring the
  check to look for `README.md`.
- **`provenance` is optional and records what the pack was derived
  from** (Q-60). It is either a **string** — at most 200 characters, no
  newline — or an **object whose every value is such a string**, for
  example `{ "source": "<repo-relative path>", "commit": "<sha>" }`. It
  is **declared data and nothing interprets it**: no check resolves it,
  no primitive reads it, no path is derived from it and it selects no
  behaviour, so it is **not** a behaviour-selecting position and does not
  reopen the enumeration below. A `provenance` that is neither of those
  two shapes — a number, an array, `null`, or an object with a non-string
  value — or a string that exceeds 200 characters or contains a newline,
  fails with **`E-UNKNOWN-VALUE`**, exit 2, zero bytes written, on the
  same reasoning as the boolean-typing rule below: a field this format
  types is checked against its type. **The key is defined here because
  F5 requires it.** F5 §NFR *Provenance* requires each bundled
  `pack.json` to record what the pack was derived from — for `coding` and
  `writing` a source path plus commit, for `planning` its two research
  documents — so until this version every bundled pack tripped the
  unknown-top-level-key warning **for doing exactly what F5 demands**: a
  `defect`-class warning raised by a correct pack, which is the confusion
  Q-60 exists to remove. A test may assert this by validating a pack that
  declares `provenance` and requiring **no** unknown-key warning, and a
  second declaring `"provenance": 7` and requiring exit 2 with nothing
  written.
- **`pack.json` is parsed by a reader that rejects a duplicate key at any
  depth** (C-25). A key declared twice anywhere in the object graph fails
  with **`E-JSON-DUPLICATE-KEY`**, exit 2, naming the key and both line
  numbers, **before any other check on the file**. The same reader parses
  `recipe.json` (US-31) and `.harness/manifest.json` (US-15); they are
  the only three JSON documents the CLI parses, so the rule is total. The
  reason is not tidiness: §Error States and `pack info` make **the JSON
  diff a reviewer reads** the control that catches a bad step, and a
  stdlib parser takes the **last** duplicate while a human reading a diff
  takes the **first** — so a pack would review as one thing and execute
  as another, voiding the control by name. **Cost stated:** Node's
  `JSON.parse` has no duplicate-key option and a reviver never sees the
  collapsed key, so this is a hand-rolled token pass rather than a
  wrapper. A test may assert it by declaring `"name"` twice in
  `pack.json` and requiring exit 2 with nothing written.
- Unknown top-level keys in `pack.json` are a validation **warning**, not
  an error, and are ignored at apply. **That warning is `defect` class**
  (§Error States): an unrecognised key is a typo, a key from a newer
  format, or a key the author believed did something, and in every one of
  those cases the author is expected to change it. It is therefore
  promoted by `--strict`, which is why a key F5 *requires* every bundled
  pack to declare must be **defined** in this section rather than left
  unknown — see `provenance` above.
- **The key/value asymmetry is normative and applies everywhere in the
  format** (C-16). An unknown **key** in `pack.json`, `recipe.json` or
  the manifest is a warning and is ignored. An unknown or unrecognised
  **value in a behaviour-selecting position** is a hard error, **exit 2,
  zero bytes written**. Silently ignoring such a value means running
  behaviour the pack did not ask for.
- The behaviour-selecting positions are **enumerated, and the enumeration
  is closed at six**: `RecipeStep.op`, **`Recipe.formatVersion`**,
  `ParameterDecl.type`, `AnatomyDecl.status`, `ScaffoldDecl.category`
  (against the pack's own declared category set), and `Journal.version`.
  Nothing else is a behaviour-selecting position, and adding one is a
  spec change.
  - **`Recipe.formatVersion` is in the list, and this is C-24's whole
    point.** `recipe.json` declares a `formatVersion` (US-31) and before
    v2.3 **no rule anywhere checked it**: `E-PACK-FORMAT-NEWER` names
    `pack.json` only, so a recipe declaring a format newer than the CLI
    was read as v1.0 and **best-effort applied** — fail-*open* in the one
    position this rule exists to close, and worse than declaring no
    version at all, because it advertises a gate that does not exist. A
    `recipe.json` whose `formatVersion` exceeds the CLI's supported
    **recipe**-format version is **`E-RECIPE-FORMAT-NEWER`**, exit 2,
    **zero bytes**.
  - **The seventh position that used to be here is gone with its
    subject.** *"An `ownedKeys` root against the destination policy"* was
    the sixth entry through v2.2; `ownedKeys` does not exist at v1.0
    (Q-54), so the position is deleted rather than re-worded. A v1.1
    reinstating `merge-json` re-opens the enumeration and must add it
    back — and must give it a code, because the fall-through row of the
    old destination table made *every* value recognised by construction,
    which is how a fail-closed position quietly failed open.
- **Every boolean-typed field must hold a JSON boolean, and this is a
  separate rule from the enumeration above** (C-34). The enumeration is
  closed at six and stays closed — it names the positions where a *value
  selects behaviour from a named set*. A boolean field is not one of
  those, and through v2.3 that was exactly the problem: US-1 said
  "nothing else is one", which affirmatively excluded
  **`RecipeStep.executable`** (which gates C-12's whole executable
  apparatus) and **`ParameterDecl.notASecret`** (which disables C-15's
  credential ban), and **no rule anywhere said what a non-boolean value
  in either position does**. In JavaScript `"false"` is **truthy**, so a
  pack declaring `"executable": "false"` reads as **true** and a pack
  declaring `"notASecret": "no"` suppresses the credential check — two
  security gates failing **open** on a typo. The rule:
  - **Every field this format types as boolean must be the JSON literal
    `true` or `false`.** A string, a number, `null`, an array or an
    object in such a field is **`E-UNKNOWN-VALUE`**, exit 2, **zero bytes
    written**, naming the field, the offending value and the two
    permitted literals. No coercion, no truthiness, no `"true"`/`"false"`
    string acceptance, on the same reasoning that makes `op` matched
    literally (US-31).
  - **The boolean-typed fields are enumerated and the list is closed at
    five**: `RecipeStep.executable` (US-3), **`RecipeStep.adaptExpected`**
    (US-31, US-33), **`RecipeStep.fillExpected`** (Q-79; US-31, US-33),
    `ParameterDecl.required` and `ParameterDecl.notASecret` (US-8).
    Adding a boolean field to the format adds it to this list in the same
    change; a field typed boolean and absent from the list is a spec
    defect, not a permissive case. **`adaptExpected` joined at v2.7 and
    `fillExpected` at v3.0, both under that rule** — the list has now
    grown twice without once being the thing someone forgot, which is the
    only evidence a rule like this ever produces. `fillExpected` earns it
    twice over: a non-boolean there would not merely mis-report a state,
    it would silently disarm the prohibition that stops `update`
    overwriting a filled `project-brief.md`. `adaptExpected` is
    the worked example of why the rule exists: a non-boolean there would
    make `verify` report `adapted` at a path no pack declared, which is a
    blanket suppression wearing the name of a state. A test may assert it
    the same way as the other three — a recipe step declaring
    `"adaptExpected": "true"` exits 2 with `E-UNKNOWN-VALUE` and nothing
    written.
  - Checked at **US-16 step 1** for `pack.json` and **step 4** for
    `recipe.json`, with the rest of the fail-closed value rule. Two
    tests, one per security-gating field: a recipe step declaring
    `"executable": "false"` and a parameter declaring
    `"notASecret": "no"` each exit 2 with nothing written.
- Where a position has its own code (`E-RECIPE-PRIMITIVE-UNKNOWN`,
  `E-RECIPE-FORMAT-NEWER`, `E-JOURNAL-UNREADABLE`) that code is used;
  otherwise the value fails with **`E-UNKNOWN-VALUE`**, naming the field,
  the offending value and the permitted values verbatim. A test may
  assert this by writing `"type": "strng"` into a parameter and requiring
  exit 2 with nothing written.

---

**US-2 — Declare the nine-part anatomy and be told when a part is missing**
> As a pack author, I want to declare which files supply each of the nine
> anatomy parts so that a pack with a gap is visibly incomplete rather
> than quietly deficient.

**Acceptance criteria:**
- `pack.json` has an `anatomy` object with exactly these nine keys:
  `process`, `roles`, `documentTemplates`, `conventions`,
  `coordination`, `behaviouralGuidelines`, `folderScaffolding`,
  `skillsAndAutomations`, `autonomyContract`.
- Each key holds a **content source** — `{ "paths": [<glob>, …] }`, globs
  relative to the pack directory, or `{ "declaredBy": "recipe" }` (valid
  only for `folderScaffolding`, whose shape *is* the recipe's set of
  destinations) — plus an optional `status`. **`declaredBy` on any other
  part is `E-UNKNOWN-VALUE`, exit 2**, and the code is named here because
  through v4.8 the restriction was stated and enforced by nothing: a part
  declaring `{ "declaredBy": "recipe" }` names no globs, so it matched zero
  files **without** raising `E-ANATOMY-EMPTY`, and a pack could declare
  `"roles": { "declaredBy": "recipe" }` while shipping no roles and pass
  validation. That defeats G-F1-3 for **eight of the nine parts** — the
  guarantee is precisely that a missing part cannot be silent. **Distinct
  from known limit 15 (C-47)**, which is about `declaredBy` values *other
  than* `"recipe"`; this is about the *position* the valid value sits in.
- `status` is one of **`present` | `provisional` | `absent`** and defaults
  to `present` when omitted. One axis, three values.
- A missing key fails validation with `E-ANATOMY-MISSING`, naming the
  key. An entry carrying neither a content source nor `"status":
  "absent"` fails with the same code.
- `present` (explicit or defaulted) requires a content source. A key
  whose globs match zero files fails with `E-ANATOMY-EMPTY`, naming the
  key.
- `provisional` requires a content source **and** a non-empty `note`
  saying what is unsettled. A missing or empty `note` fails with
  `E-ANATOMY-NO-NOTE`. A well-formed provisional part passes validation,
  and `validate`, `pack info` and `init` print the verbatim
  `W-ANATOMY-PROVISIONAL` warning naming the part and the note. **That
  warning is `notice` class** (§Error States, Q-60): a well-formed
  `provisional` part is a state the pack **declared on purpose** and
  nothing about it is fixable, so `--strict` does not promote it and a
  pack whose only findings are notices exits `0` under `--strict`.
- `absent` requires a non-empty `reason` and takes **no** content source.
  A missing or empty `reason` fails with `E-ANATOMY-NO-REASON`. A
  well-formed absent part passes validation, and `init` prints the
  verbatim `W-ANATOMY-ABSENT` warning naming the part and the reason.
  **That warning is `notice` class** for the same reason: the pack
  declared the absence and gave the reason the message prints.
- **A key that contradicts the declared status is an error; a key that is
  merely inapplicable is a warning.** The line is drawn on decidability.
  - **Contradiction, exit 2.** A content source (`paths` or `declaredBy`)
    alongside `"status": "absent"` fails with
    `E-ANATOMY-SOURCE-ON-ABSENT`, naming the part and the source key. The
    author has declared both "this part does not exist" and "here is its
    content", and the format cannot pick one. This is **not** covered by
    US-1's unknown-key rule, which governs keys the format does not
    recognise, not keys whose meanings collide.
  - **Redundancy, warning.** A `reason` alongside `present` or
    `provisional`, or a `note` alongside `absent`, is ignored at apply and
    reported as a validation warning. **That warning is `defect` class**
    (Q-60): the key is ignored, so the author is expected to delete it —
    unlike the status it sits beside, which is a `notice`.
- `validate --json` and `pack info` emit a nine-row anatomy report over
  the same structure, with `present | provisional | absent` per part. A
  fourth value, `missing`, is emitted **only for an invalid pack** and
  never appears for a pack that passes validation.
- The counts F5 asserts as an NFR (exactly two `absent` and exactly one
  `provisional` across the three v1.0 packs) are therefore mechanically
  checkable rather than editorial.

---

**US-3 — Place pack content at applied paths — copy, rename, strip-suffix**
> As a pack author, I want to declare where each piece of payload content
> lands in the applied project so that no user ever has to move or rename
> a file by hand.

**Acceptance criteria:**
- Three primitives place content, all reading from `.harness/pack/` and
  all writing through the one confinement gate below.
  - **`copy`** — `{ "op": "copy", "from", "to", "exclude"?, "when"?,
    "executable"? }`. A `from` ending `/` copies a directory recursively
    and `to` must also end `/`; the applied basenames equal the source
    basenames. Source and destination **directory** names may differ
    (`agent-teams/` → `AgentTeams/`) — that rename is expressed by the
    step alone, with no content change. A `from` naming a single file
    copies that one file and its basename **must not** change; use
    `rename` for that. `exclude` is a list of globs relative to `from`,
    which is how a pack keeps a payload-only file (an `agents/README.md`)
    out of the applied tree.
  - **`rename`** — `{ "op": "rename", "from", "to", "when"? }`. One
    source file, one destination, and the basename may differ
    (`specifications/README.template.md` →
    `specifications/README.md`). A directory `from` is
    `E-RECIPE-STEP-INVALID`.
  - **`strip-suffix`** — `{ "op": "strip-suffix", "from", "to",
    "suffix", "exclude"?, "when"? }`. Copies a file or a directory and
    rewrites any basename `X<suffix>.Y` to `X.Y`. `suffix` is a declared
    literal matching `^\.[a-z0-9-]{1,16}$`; there is no implicit
    `.template` default, because the coding pack's payload legitimately
    keeps `*.template.md` filenames that must not be stripped. A step
    whose `from` yields no basename carrying the suffix fails with
    `E-RECIPE-STEP-INVALID`.
- **A step's declared payload source naming nothing in the payload fails
  with `E-RECIPE-SOURCE-MISSING`, exit 2, naming the step index, the
  field and the path.** The source field is `from` for the five
  primitives that have one and **`template` for `generate`** (C-38).
  Through v2.3 the rule was written for `from` alone and §F1.2's
  `generate` validation row omitted source existence entirely, so
  `generate`'s only input had **no named code for the commonest authoring
  mistake** — a renamed or mistyped template. One fault, one code, at
  whichever field carries the source.
- `to` may name a tool-owned directory (`.claude/agents/`). Writing into
  an existing directory merges by file; per-file collision rules (US-13)
  still apply.
- Two steps that write the same applied path fail with
  `E-MAP-COLLISION`, computed over the merged step set — base steps plus
  the steps of every selected scaffold.
- **An empty directory is not representable, and under Q-50 nothing
  needs one.** No primitive creates a directory on its own; a directory
  exists because a file lands in it. **Every folder an apply creates
  carries a README** (`README.md` for `coding` and `planning`, `index.md`
  for `writing`), so no folder is ever empty and the case does not
  arise. `.claude/` and `.harness/` are excluded from the rule — both are
  tool-owned — and `.harness/` additionally may not be written by a
  recipe step at all (stage 2 below), so **there is no
  `.harness/README.md`**. There is **no `mkdir` primitive**, no eighth
  primitive, no `skeleton/` tree and no `.gitkeep`. A test may assert
  this by applying any v1.0 pack and requiring that every directory below
  the project root other than `.claude/` and `.harness/` contains the
  pack's declared folder-README basename. **That test stands, but it is
  now confirmation rather than the only enforcement:** `validate` checks
  the same rule statically at US-16 **step 12**, per parameter
  combination and with no project, reporting `W-FOLDER-README-MISSING`.
  The two see different things and both are worth keeping — the
  integration test observes one applied tree and can tell a directory the
  apply created from one that was already there, which is exactly what
  step 12 cannot do and why step 12 is a warning. The residual limit — a
  pack that genuinely wants an empty folder cannot have one — is recorded
  in §F1.9.
- Validation rejects any symlink anywhere in the pack
  (`E-SYMLINK-IN-PACK`).

**Path confinement — four ordered stages** (C-4, C-5, C-6, C-14).
Inspecting a *declared string* says nothing about the filesystem that
string will meet, so confinement is **by resolution**. Every applied path
in the product is produced by one gate and carries the branded
`AppliedPath` type; there is no second route to an applied path, and a
bare `string` never reaches a writer.

**Stage 1 — the anchored `to` grammar** (declaration time; runs at
`validate`, which has no project to inspect). A `to` value must match, as
a whole:

```
to        := segment ( "/" segment )* ( "/" )?   # trailing "/" only for a directory step
segment   := char+                                # NFC-normalized, ≥ 1 char
char      := any Unicode scalar EXCEPT  /  \  :  *  ?  "  <  >  |
             and U+0000–U+001F, U+007F
```

Everything below fails with **`E-MAP-PATH-GRAMMAR`**, exit 2, naming the
offending construct — one code, one rule, rather than four substring
searches that each miss a different case:

| Rejected | Because |
|---|---|
| a leading `/` or `\` | POSIX-absolute |
| any `\` anywhere | a Windows separator; a pack declares POSIX paths, and `a\b` is one segment on POSIX and two on Windows |
| `^[A-Za-z]:` — both `C:\x` and **`C:x`** | drive-absolute and **drive-relative**. `C:x` resolves against the *per-drive* current directory, which is not relative to anything the CLI controls |
| a `//` or `\\` prefix | UNC / network path |
| a `.`, `..` or empty segment | the classic escape, rejected as *grammar* rather than by substring search |
| a segment ending in `.` or in any whitespace | Windows silently strips these, so `foo.txt.` and `foo.txt` are the same file there and different files here — a rename the pack did not ask for |
| a reserved Windows basename with or without extension (`CON`, `PRN`, `AUX`, `NUL`, `COM1`–`COM9`, `LPT1`–`LPT9`) | enforced in the one grammar rather than separately |
| a non-NFC `to` | see below |

- **NFC is mandatory.** `to` must be NFC. A source basename discovered by
  directory recursion is NFC-normalized when its applied path is computed
  and is named by **`W-PATH-NON-NFC`**. A macOS checkout can hold NFD
  filenames, and an NFD applied path would not match a Linux teammate's
  NFC one — breaking G-F1-7 silently.
- **Collision keys.** Two applied paths collide when
  `collisionKey(a) === collisionKey(b)`, where `collisionKey` is the
  applied path **NFC-normalized and then ASCII-case-folded** — `A`–`Z`
  folded to `a`–`z`, and no other character altered (Q-81). A collision that
  is a pure case difference is `E-MAP-CASE-COLLISION`; one that survives
  case-folding and is created by normalization alone is
  **`E-MAP-NORM-COLLISION`**, exit 2 — a separate code because the remedy
  is different prose. The check runs over the merged step set.
- **The folding is ASCII-only, and that is a documented narrowing of a
  security control** (Q-81, **known limit 17**). Full Unicode case
  folding is not in the Node standard library, and the zero-runtime-
  dependency posture §NFR now requires means it would have to be
  hand-rolled against the Unicode `CaseFolding.txt` tables. **A
  hand-rolled approximation inside a control that decides whether two
  paths are the same file is worse than a stated limit**, because it
  fails silently and asymmetrically — the tables are versioned, the
  full-fold cases are not one-to-one, and a partial implementation folds
  some pairs and not others while reporting the same confidence for both.
  **The consequence is real and is not hidden:** two applied paths
  differing only in the case of a non-ASCII letter — `ÉTUDE.md` and
  `étude.md` — do **not** collide under this rule, and on a case-
  insensitive volume they are the same file. **What still protects the
  case that matters:** the reserved-destination denylist, the confinement
  gate and every path in all three v1.0 packs are ASCII, so no shipped
  pack is exposed; and the `step`-vs-existing-file half of the rule
  (N-5) is unchanged in scope, only in folding. **v1.1 obligation:** a
  full-fold implementation, or a vetted dependency admitted for this one
  purpose, before any pack ships a non-ASCII applied path.
- **`collisionKey` is the folding rule for `step`-vs-`step` *and* for
  `step`-vs-**existing file**, and the second half is not optional**
  (N-5). Through v2.2 the folding rule was scoped to the merged step set
  and **nothing folded a step's `to` against a path already on disk**, so
  three separate comparisons used exact strings: `E-TARGET-EXISTS`,
  `--force`'s byte-identity check, and the journal's `preExisting`
  determination (all US-13). On macOS and on Windows a project holding
  `.claude/Settings.json` and a step writing `.claude/settings.json`
  **are the same file**, so `E-TARGET-EXISTS` did not fire, the apply
  silently overwrote a file it believed it was creating, the journal
  recorded `preExisting: false` — and **`--rollback` then deleted a user
  file it did not create**, which breaks the invariant C-13 and G-F1-6
  both state outright. **All three comparisons resolve by
  `collisionKey`**, on **every** platform and unconditionally, exactly as
  the step-vs-step rule does. Unconditionally, because a
  platform-conditional fold means the tree CI pronounced clean on Linux
  is not the tree that applies on the developer's machine. A test may
  assert it by placing `.claude/Settings.json` in the target directory,
  applying a pack whose step writes `.claude/settings.json`, and
  requiring `E-TARGET-EXISTS`, exit 1, zero bytes.
- **The applied path a step writes is its *write set*, not its `to`**, and
  every rule in these four stages is quantified over write sets. A step's
  write set is defined per primitive in §F1.2 and is a pure function of
  the pack: `copy` and `strip-suffix` contribute their expanded
  recursion, `rename` and `generate` their single `to`, and
  `rewrite-path` and `substitute` **every written-set path their `in`
  globs match** — matched, not hit, so a path whose content happens not
  to contain `find` is still in the set. Two of the six primitives have
  **no `to` at all**, and a rule quantified over `to` therefore has two
  silent exemptions; that is how the reserved-destination denylist and
  the old settings policy both lapsed, and it is why the quantifier is
  stated once, here, and used everywhere. **What the write set does not
  change:** §F1.2's placing-then-editing rule is about **ordering**, not
  authority. A `substitute` whose `in` matches a path an earlier `copy`
  wrote is legitimate and `E-MAP-COLLISION` must **not** widen to cover
  it — `E-MAP-COLLISION` remains "two steps *place* the same applied
  path".
- **The payload has its own path check.** Every payload-relative `from`,
  and every path phase 1 copies, must satisfy the same grammar minus the
  trailing-slash rule. A violation is **`E-PAYLOAD-PATH-INVALID`**, exit
  2. This is what stops a pack shipping a file whose name is legal on the
  authoring machine and catastrophic on the applying one.

**Stage 2 — the reserved-destination denylist, on the resolved path**
(C-5, C-19). **No applied path in any step's write set**, and no
`executableRoots` entry, may resolve to a **reserved destination**.
**`E-MAP-RESERVED-DEST`**, exit 2. The quantifier is the write set and
not `to`, deliberately and by amendment: `rewrite-path` and `substitute`
have no `to`, so the rule as written through v2.2 had two silent
exemptions.

There are **two classes** of reserved destination, one rule and one code.
**Both classes are declared, closed lists**, and every entry is matched by
`collisionKey` over the write set:

| Class | Reserved | Why |
|---|---|---|
| **Tool- and VCS-owned trees** | any applied path with **any segment** equal to `.git`, `.hg` or `.svn`; any applied path whose **first segment** is `.harness/`; and any path inside the resolved directory the CLI itself is installed in (`realpath` of the package root — which matters precisely when someone runs `init` inside the harness repo) | C-5, C-33. `.harness/` holds phase 2's own input; the rest are owned by a tool that executes what it finds |
| **Destinations some common toolchain executes, or which govern what may be executed** | any applied path with **any segment** equal to `.github`, `.vscode`, `.idea`, `node_modules`, `.circleci` or `.devcontainer`; any applied path whose **basename**, at any depth, is `package.json`, `.envrc`, `.npmrc`, `.yarnrc.yml`, `Makefile`, `GNUmakefile`, `justfile`, `.justfile`, `.mcp.json`, `.gitlab-ci.yml`, `Jenkinsfile`, `azure-pipelines.yml` or `bitbucket-pipelines.yml`; and any applied path whose basename is `settings.json` or `settings.local.json` **under any `.claude` segment** | **Q-54, C-31, C-39a, C-39d, C-41.** See below — this is a **denylist** |

- **One quantifier rule, stated once and applied to every entry: reserve
  a *name* at every segment; reserve a *location* only where this CLI
  owns it** (C-33, extended by C-39d). C-33 stated that test and applied
  it to three entries. v2.5 applies it to **all** of them, and states the
  result per entry, because through v2.4 the document held four rules
  about `.claude/` with three different quantifiers while asserting
  normatively that a nested `.claude/` is live.

  | Entry | Scope | Why, by C-33's test |
  |---|---|---|
  | `.git`, `.hg`, `.svn` | **any segment** | The name is a real VCS directory wherever it appears, and `.git/hooks/pre-commit` is shell that runs on the next commit of *whichever* repository owns it — the project's or a submodule's |
  | `.github` | **any segment** | Actions reads `.github/workflows/` relative to a **repository root**, and this CLI cannot know where a nested repository root is. Same argument as `.git`, one directory over |
  | `.vscode`, `.idea` | **any segment** | A subfolder opened as a workspace or project root reads **its own** `.vscode/tasks.json` or `.idea/`. The name is what the editor looks for; the location is the user's choice, not ours |
  | `node_modules` | **any segment** | npm workspaces and transitive installs create nested `node_modules/.bin`, which is on `PATH` for scripts run in that package — and F1's own second reason for reserving it applies at **any** depth, because `verify`'s project scan skips `node_modules/` at any depth (US-33, §NFR). A write there was both permitted and invisible |
  | `.circleci`, `.devcontainer` | **any segment** | Both are read relative to a repository or workspace root, on the `.github` argument. Scoping them to the first segment would re-create the defect this table exists to close |
  | `settings.json`, `settings.local.json` under a `.claude` segment | **any `.claude` segment** | The runtime reads a `.claude/` tree wherever it finds one — this document says so normatively, twice — so the reservation is a name under a name, not two root-relative paths |
  | `package.json`, `.envrc`, `.npmrc`, `.yarnrc.yml`, `Makefile`, `GNUmakefile`, `justfile`, `.justfile`, `.mcp.json`, `.gitlab-ci.yml`, `Jenkinsfile`, `azure-pipelines.yml`, `bitbucket-pipelines.yml` | **basename, any depth** | Already names rather than locations. A `package.json` in a subdirectory is a real package manifest; a `Jenkinsfile` in a subdirectory is a real pipeline |
  | `.harness/` | **first segment only** | **The one location entry in this document.** `.harness/` names one specific tree *this CLI* owns and constructs itself, which is phase 2's input and which C-5 protects for that reason. A nested `docs/.harness/` is not that tree, is not phase 2's input, and reserving it would forbid ordinary content for no security gain |
  | the CLI's own install directory | **resolved path** | A location, and one the CLI resolves rather than spells |

- **Class 1's `.harness/` exception is the *only* place a first segment
  appears, and that is now checkable by reading the table.** The same
  quantifier rule governs **`E-EXEC-DEST-FORBIDDEN`**'s
  forbidden-directory list, which had the identical defect twice over
  (C-33, then C-39b): `.git`, `.hg` and `.svn` are forbidden at **any**
  segment there, **`.claude` is forbidden at any segment** — a `0755`
  file at `docs/.claude/hooks/x.sh` is a hook script in a live `.claude/`
  tree — and `.harness/` stays first-segment on the reasoning above.
- **The new class-2 members are the members of a category this list
  already named, not a claim of completeness** (C-41). `.mcp.json`
  declares MCP servers as **command lines the runtime launches**; it is
  the sibling of `.claude/settings.json`, was reachable in one `copy`,
  and appeared nowhere in the spec set through v2.4. The class also
  closed GitHub Actions and no other CI provider, while this repo's own
  `coding` pack ships an **Azure** scaffold — so `.gitlab-ci.yml`,
  `Jenkinsfile`, `azure-pipelines.yml`, `bitbucket-pipelines.yml`,
  `.circleci` and `.devcontainer` join it. Two existing entries were
  **under-spelled**: GNU make prefers **`GNUmakefile`** over `Makefile`
  when both are present, and `just` reads **`.justfile`** as well as
  `justfile` — and `collisionKey` case-folding covers `Justfile` but not
  the dotted form, which is a different name rather than a different
  case. The denylist framing is unchanged and is not weakened by
  growing: it closes the routes this document has identified.
- **Class 2 is a denylist, and it is therefore incomplete by
  construction. State this rather than imply completeness** (C-31).
  Through v2.3 the class was written as a *category* — "destinations some
  common toolchain executes, or which govern what may be executed" — and
  then enumerated at **three members**. A category named and enumerated
  short is the worst of both: it reads as a closed rule and behaves as a
  short list. `{ "op": "copy", "from": "ci/", "to": ".github/workflows/" }`
  passed **every stage** and wrote a workflow that executes
  attacker-chosen code on the user's next push with `GITHUB_TOKEN` —
  **strictly more capability** than the `scripts.postinstall` route
  `package.json` was reserved to close, and reachable in one step.
  `.vscode/tasks.json`, `.envrc` and `node_modules/.bin/<name>` are the
  same shape; the last mattered twice over, because `verify`'s project
  scan does not descend into `node_modules/` (US-33, §NFR), so a write
  there was both permitted and invisible. **Reserving `node_modules/`
  outright is what closes that second half** — nothing a recipe writes
  can now land where the scan does not look. What this list is: the
  routes this document has identified, each closed by a named rule and
  each with an adversarial fixture in US-16. What it is **not**: a proof
  that no route exists. §NFR *Bounded capability* is written to that
  standard and no stronger, and §F1.9 records the residual limit.
- **The class-2 entries the settings story left behind stay, and their
  reason is unchanged** (Q-54): a plain `copy` would otherwise write a
  whole `settings.json` — hooks, `permissions.allow`,
  `permissions.defaultMode` and all — which is **worse** than the
  owned-key model that was deleted, and a `package.json` carrying
  `scripts.postinstall` is the same capability wearing an npm hat.
  **What v2.5 changes is only their scope** (C-39a): the two settings
  basenames are reserved under **any** `.claude` segment rather than at
  two exact root-relative paths. Through v2.4 `docs/.claude/settings.json`
  passed stage 1, passed stage 2, passed stage 3 and was written — while
  §NFR *Bounded capability* claimed, as the load-bearing step of the whole
  Q-54 deletion, that *"nothing writes `.claude/settings.json`, because it
  is a reserved destination for every step by every route"*. That
  sentence is true only under the any-segment scoping, and it is what
  makes deleting `merge-json` a stronger fix than repairing it rather
  than a weaker one.
- **Adding an entry to class 2 is an amendment to this table plus a
  fixture in US-16, in the same change.** That is the same obligation
  US-16 already states for any new destination rule, and it is what keeps
  the list a list rather than a category that drifts back into being one.

- **Matching is by `collisionKey`** — NFC-normalized then case-folded —
  **on every platform, unconditionally**, for both classes. Without this
  `.claude/Settings.json` is unreserved on the two platforms where it is
  the same file as `.claude/settings.json`, and CI on Linux is the third
  place that disagrees. A platform-conditional denylist means the pack CI
  pronounced valid is not the pack that runs.
- The check runs **after** resolution, so a write reaching
  `.git/hooks/pre-commit` or `.claude/settings.json` by *any* route — a
  directory recursion, a scaffold, a conditional step, an `in` glob
  match — is caught by one rule rather than six copies of it.
- **Every path an `in` glob matches is re-checked here**, individually,
  at the point the write set is computed (US-4). The written-set argument
  says an `in` glob cannot reach a reserved path in the first place; that
  argument is sound and it is also **implicit**, and an implicit chain is
  what this stage exists not to rely on. Two mechanisms is the right
  number for a rule C-5 calls absolute.
- **A pack that needs project settings has no route at v1.0**, and that
  is the decision, not an oversight (Q-54). The remedy line names it:
  the capability returns in v1.1 with the controls that govern it.
- `.git/hooks/pre-commit` with `"executable": true` is two independent
  errors, this one and `E-EXEC-DEST-FORBIDDEN`.
- **C-5 is absolute and has no exception: a recipe step may never write
  under `.harness/`** — which includes writing into the payload it is
  reading from. Under the two-phase model `.harness/` holds **the input
  to phase 2**, so a step that could write there could rewrite its own
  source mid-run, destroying determinism, destroying `verify`'s
  recomputation identity, and making the applied tree depend on step
  order in a way the plan did not show. There is no carve-out in the
  denylist, for a README or for anything else. A test may assert this by
  giving a recipe a step whose `to` is `.harness/README.md` and requiring
  `E-MAP-RESERVED-DEST`, exit 2, zero bytes.
- **Class 2 is testable entry by entry and route by route**, which is the
  point of quantifying over the write set. Every one of the following is
  `E-MAP-RESERVED-DEST`, exit 2, **zero bytes**, and every one is an
  adversarial fixture pack in US-16's minimum set: a `copy` whose `to` is
  `.claude/settings.json`; a `rename` whose `to` is
  `.claude/Settings.json` (the case variant — this is what
  `collisionKey` matching buys); a `generate` whose `to` is
  `.claude/settings.local.json`; a `copy` whose `to` is `package.json`;
  a `copy` of a directory whose recursion *produces*
  `.claude/settings.json` without any step naming it; a `copy` whose `to`
  is `.github/workflows/ci.yml`; a `copy` whose `to` is
  `.vscode/tasks.json`; a `copy` whose `to` is `.envrc`; a
  `strip-suffix` whose recursion *produces* `.github/workflows/x.yml`
  with no step naming it — the by-any-route property, proved a second
  time on a second class; a `copy` whose `to` is
  `docs/.git/hooks/pre-commit` — the any-segment property of class 1
  (C-33); a `copy` whose `to` is `docs/.claude/settings.json` and a
  `strip-suffix` whose recursion *produces* `sub/.claude/settings.local.json`
  — the any-`.claude`-segment property, proved both by name and by route
  (C-39a); a `copy` whose `to` is `pkg/node_modules/.bin/foo` — the
  any-segment property of a class-2 **name** (C-39d); and one fixture per
  new class-2 entry of v2.5 (C-41).
- **The CLI's own writes are a different category, and they are named.**
  The phase-1 payload, `.harness/manifest.json`, `.harness/journal.json`,
  `.harness/journal.d/**` and `.harness/lock` are **not recipe steps**
  and do not consult the denylist. They are the complete list — the CLI
  writes nothing else under `.harness/` — and each is derived by the CLI
  from a path it constructs itself out of components already proven
  grammar-clean, so they are **confined by construction**. They carry the
  brand **`HarnessPath`**, distinct from `AppliedPath`, and the writer,
  the journal and rollback accept **`WritablePath = AppliedPath |
  HarnessPath`**. Two properties depend on the second brand and neither
  holds without it: the denylist can forbid `.harness/` outright without
  deadlocking against the payload copier, and a recipe step cannot reach
  a writer that accepts a `.harness/` destination — that remains a
  compile error, which is what C-14 asks for. A test may assert the
  second half structurally: no exported function that constructs a
  `HarnessPath` is reachable from recipe-step planning.

**Stage 3 — resolution confinement** (C-4; plan time and write time only,
skipped at `validate`, which has no project root). The **project root is
resolved once per run** with `realpath()`, and everything below is judged
against the *resolved* root — without this the CLI would refuse to run in
`/tmp` on macOS, where `/tmp` is a symlink to `/private/tmp`. Below the
resolved root, for every applied path:

- Every ancestor component is `lstat`ed, top down. A component that is a
  symlink, a Windows junction or any other reparse point fails with
  **`E-DEST-SYMLINK`**, exit 2, naming the component. The CLI does not
  traverse through one and does not create through one.
- Directories are created **one level at a time**, non-recursively, each
  `lstat`-checked before the next — a directory the apply itself created
  is trivially not a symlink.
- The final destination, if it exists, is `lstat`ed; a symlink there is
  `E-DEST-SYMLINK` too. **A pack never writes through a link.**
- The resolved parent joined with the final basename must be a **strict
  descendant** of the resolved root. Failure is `E-MAP-ESCAPES-ROOT`,
  exit 2.

**Stage 4 — the write itself** (C-14), specified in US-13.

**The executable bit is declared, bounded and disclosed** (C-12):

- A `copy` or `strip-suffix` step may set `"executable": true` to write
  mode `0755`; otherwise files are written `0644`.
- `pack.json` may declare **`executableRoots`**: applied-path prefixes,
  each ending `/`, each subject to the stage 1 grammar and the stage 2
  denylist **with its trailing `/` removed**. That last clause is not a
  detail: stage 1 refuses an **empty segment**, and a prefix ending `/`
  has one by construction — so through v4.9 *every legal root was refused
  by the rule that governs it*, and the two halves of this sentence
  contradicted each other. A root names a **directory**; the stage-1
  grammar is an **applied-path** grammar; the separator is what
  distinguishes them, and it is stripped before the check rather than
  fought with. `"executable": true` on a step whose applied path is not
  under a declared root fails with **`E-EXEC-ROOT-UNDECLARED`**, exit 2.
  Absent or empty means the pack ships no executable file, and that is
  the default.
- **No v1.0 pack declares `executableRoots`, and none sets
  `"executable": true`** — **Q-82** moved both backend kits to `addons/`
  as v1.1 add-ons, and they were the only declarers. The apparatus is
  therefore **fixture-covered, not pack-covered**, exactly like the
  scaffold-exclusivity rules Q-82 emptied, and a test asserts the
  emptiness rather than leaving a reader to assume the coverage is real.
  The rules stay in full because the add-on mechanism inherits them.
  *(The paragraph below is kept as the record of why the apparatus exists
  at all, and its claim about `coding` was true when written and is not
  now — the scripts moved, the reasoning did not.)* This corrected a v2.3 statement — *"the case for
  every v1.0 pack"* — that was both wrong and, in the way that matters
  here, expensive: the deploy and setup scripts are **meant to be run**,
  so landing them `0644` forces every adopter to `chmod` by hand, and it
  left C-12's entire apparatus — declared roots, the cap of 32, the
  per-path re-check, the disclosure lines — **specified, fixture-tested
  and dormant**. That is precisely the pattern §F1.9 records Q-54 as the
  lesson about: apparatus nothing exercises is apparatus nobody has
  tested. `coding` now produces **four** `0755` applied paths in a
  backend combination — `infrastructure/backend-deploy/deploy.sh`,
  `deploy.ps1`, `setup-neon.sh`, `setup-neon.ps1` — against a cap of 32,
  and therefore **four real disclosure lines** in `init`'s pre-write
  summary and in `pack info`. §F1.3 works it. F5's NFR — *no executable
  pack content outside a declared scaffold* — is satisfied: all four are
  inside one.
- A declared root, or an applied path carrying the bit, that has **any
  segment** equal to `.claude`, `.git`, `.hg` or `.svn`, or that resolves
  under `.harness/` as a **first segment**, fails with
  **`E-EXEC-DEST-FORBIDDEN`**, exit 2 — checked at declaration **and
  again per applied path**, so a directory recursion cannot reach a
  forbidden destination the root did not name. **The scoping is US-3
  stage 2's quantifier rule, applied here and not merely alongside it**:
  a reserved name is reserved at every segment, and `.harness/` is the
  one location. This list had the same defect twice — first for the three
  VCS names (C-33), then for `.claude` (C-39b), which stayed
  first-segment through v2.4 **in the same version that stated
  normatively that a nested `docs/.claude/commands/x.md` is read by the
  runtime exactly as a root-level one is**. A `0755` file at
  `docs/.claude/hooks/x.sh` is a hook script in a live `.claude/` tree,
  and it was refused by neither list.
- **At most 32 executable files per apply**, else **`E-EXEC-TOO-MANY`**,
  exit 2. The cap does not meaningfully bound blast radius — one
  executable in the wrong place is the whole finding — and is adopted for
  a procedural reason: a pack wanting more has to argue for it in an ADR.
- **Every 0755 path is enumerated** in `init`'s pre-write summary and in
  `pack info`, verbatim, one per line. Enumeration does not gate:
  disclosure is what C-12 asks for.

**A pack-written file under `.claude/` may not declare a permission
decision** (C-32a, extended by C-39c and C-40). Through v2.3 `.claude/`
was governed by exactly
three filenames — the two settings files, reserved, and nothing else —
while the content a pack actually writes there was neither constrained
nor disclosed. That content is not inert. **A command file's frontmatter
declares tool permissions, and `!`-prefixed body lines execute shell
under that declaration**: a pack shipping
`.claude/commands/deploy.md` with an `allowed-tools` frontmatter key and
a `!`-line body is a **pack-declared pre-authorization plus a
host-execution path, reached by an ordinary `copy`** — no primitive
added, no rule broken. That is the same capability class the settings
files were reserved to close, arriving through the directory the pack is
*supposed* to write.

- **The rule.** No file a pack places under a `.claude` segment may
  declare a **permission-bearing frontmatter key**, with the single
  enumerated exception below. Violation is **`E-CLAUDE-TOOL-GRANT`**,
  exit 2, **zero bytes written**, naming the path, the line and the key.
  Matched by `collisionKey` on the directory segment: **any segment**
  equal to `.claude`, not merely the first — a nested
  `docs/.claude/commands/x.md` is read by the runtime exactly as a
  root-level one is, and scoping this rule to the first segment would
  re-create C-33's defect in a rule written after C-33 was found.
- **The rule has two quantifiers, and the second is new at v2.5**
  (C-39c). Through v2.4 it was quantified over the **write set** alone,
  and phase 1 is outside the write set: it copies the payload verbatim
  and **"does not skip any payload file"** (US-30). So a pack that merely
  *shipped* `.claude/commands/x.md` with `allowed-tools` — naming it in
  no recipe step at all — landed it at
  `.harness/pack/.claude/commands/x.md`, **inside the committed
  project**, unchecked and undisclosed. The two quantifiers are:
  - **the write set**, on **rendered** content, at US-16 **step 11** —
    rendered because a `substitute` or `rewrite-path` acting on a file an
    earlier step placed could introduce or complete the key, and checking
    the payload source instead of the rendered result would be checking
    the wrong bytes; and
  - **the phase-1 payload set**, on **payload bytes**, at US-16 **step
    3** — payload bytes because phase 1 transforms nothing, so the bytes
    it copies *are* the bytes the runtime will read. The check applies to
    every payload-relative path with a `.claude` segment, needs no write
    set and no parameter combination, and therefore sits with the rest of
    payload integrity.
  **This is a second quantifier, not a widening of the write set.** A
  phase-1 destination is a `HarnessPath`, not an `AppliedPath`; widening
  the write set to cover it would break the brand separation C-14 rests
  on and would deadlock the reserved-destination denylist against the
  payload copier (US-3 stage 2). The two sets are disjoint and are named
  separately. **The alternative was to retract the any-segment premise**
  — to state normatively that a `.claude/` subtree inside
  `.harness/pack/` is *not* read by the runtime — and it is rejected:
  this document asserts the opposite normatively, the reserved-destination
  scoping of C-39a rests on it, and a premise asserted and then left
  unapplied is the defect this whole condition is about.
- **It is stated as a property, not as a spelling, and the key names are
  pinned rather than hard-coded.** The frontmatter contract belongs to
  the Claude Code runtime and moves independently of this spec, so the
  normative sentence is *"a pack-written file under `.claude/` may not
  declare a permission decision"*, and the CLI carries **one named
  constant** holding the key names that express that in the runtime's
  current contract, with the runtime version the pin was taken against
  recorded beside it.
- **The pin covers every frontmatter key that expresses a permission
  decision, and through v2.4 it covered one of the two families** (C-40).
  The property is *"may not declare **tool permissions**"* and the pin
  was `allowed-tools` and its spellings — but agent frontmatter also
  carries **`permissionMode`**, which F5 lists as a supported key and
  which `packs/coding/agents/{architect,reviewer,securityreviewer}.md`
  declare as `readonly` **today**. `permissionMode: bypassPermissions` on
  an agent that also declares `Bash` was therefore **neither refused**
  (not on the pin) **nor shown** (disclosure row four printed `tools:`
  only) — which falsifies C-32b's justification for disclosing rather
  than gating, *"a subagent's tool list still runs underneath a
  permission engine the pack cannot touch"*. A mode key does not run
  underneath the engine; it **selects the engine's mode**. And
  `packs/coding/agents/README.md` states plainly that harnesses honouring
  the key exist. The constant therefore holds **two lists and one set**:
  - **grant keys** — `allowed-tools` and its documented spellings;
  - **mode keys** — `permissionMode` and its documented spellings;
  - **the non-widening mode values** at the pinned runtime version —
    those that leave the runtime's default envelope unchanged or narrow
    it (`readonly`, `default`, `plan`, `acceptEdits` at the pin). Every
    other value, `bypassPermissions` included, is **widening**.
- **The gate, in three sentences.** A **grant key** on any pack-placed
  file under a `.claude` segment is `E-CLAUDE-TOOL-GRANT`. A **mode key**
  on any such file that is **not** an agent file — a command file, a
  skill file, anything else — is `E-CLAUDE-TOOL-GRANT` too: a command
  file has no business selecting a permission mode. A **mode key on an
  agent file** is permitted **iff** its value is on the pinned
  non-widening set; a widening **or unrecognised** value is
  **`E-CLAUDE-PERMISSION-MODE`**, exit 2, zero bytes, naming the path,
  the line, the value and the permitted values verbatim.
- **The value pin is fail-closed, and that is why it is acceptable where
  a tool allowlist was not.** Policing *which tools* a pack may
  pre-authorize is the ownable-key allowlist rebuilt under another name,
  against an open namespace this document does not own — which is why
  grant keys are forbidden outright. A permission **mode** is a closed
  set of four values, and the failure mode of a stale value pin is
  **refusal of a legitimate new value at `validate` time**, which is
  visible, locatable and fixable in one constant — not a silent
  acceptance of a widening one. The pin's staleness obligation (§F1.9)
  covers both lists and the value set together.
- **Why forbid rather than gate or disclose.** It costs the v1.0 packs
  **nothing** — no bundled command or skill file declares `allowed-tools`
  and no bundled agent declares a widening mode, both checkable in one
  grep — and the capability is deferred to
  **v1.1 with the settings story**, on **Q-54's own logic**: a
  pack-declared permission is the settings story wearing different
  frontmatter, and the answer that story got was *delete the surface
  rather than police it*.
- **Four tests, all in US-16's minimum set.** A fixture pack shipping
  `.claude/commands/x.md` whose frontmatter declares `allowed-tools:`
  fails with `E-CLAUDE-TOOL-GRANT`, exit 2, zero bytes. A fixture whose
  **payload** — not its recipe — contains `.claude/commands/x.md`
  declaring `allowed-tools:` fails with the same code at step 3 (C-39c).
  A fixture whose `.claude/agents/x.md` declares
  `permissionMode: bypassPermissions` fails with
  `E-CLAUDE-PERMISSION-MODE`, exit 2, zero bytes (C-40). A fixture whose
  `.claude/commands/x.md` declares `permissionMode: readonly` — a
  *non-widening* value in the *wrong file kind* — fails with
  `E-CLAUDE-TOOL-GRANT`, which is what makes the file-kind half of the
  rule tested rather than assumed.

**An agent file's `tools:` list and its non-widening `permissionMode` are
permitted, and disclosed** (C-32b, corrected by C-40).
The `.claude/agents/*.md` a pack ships declare `tools:`, and the bundled
`coding` agents do — **two of the ten declare `Bash`** (`implementer` and
`testwriter`), and `researcher` declares `WebSearch, WebFetch`, **the
only network capability any v1.0 pack ships** (C-45). This is
**accepted-and-enumerated on C-28's reasoning**, point for point: all
three packs use it, so forbidding it deletes the feature; and a
subagent's tool list is not a grant, because the subagent still runs
**underneath a permission engine the pack cannot touch at all** (US-3
stage 2 makes the settings files unwritable **under any `.claude`
segment**, C-39a), so it can request and cannot authorize.

**That justification is exactly true of `tools:` and exactly false of a
widening `permissionMode`, and v2.4 applied it to both** (C-40). A mode
key is not a request made underneath the engine — it selects the mode the
engine runs in, and `bypassPermissions` removes it. So the two are
separated: `tools:` is permitted without qualification, `permissionMode`
is permitted **only** at a pinned non-widening value
(`E-CLAUDE-PERMISSION-MODE` otherwise, above), and **both are disclosed**.

**US-13's disclosure carries a fourth row for it**, and at v2.5 that row
prints **the agent file's whole frontmatter block, verbatim**, not
`tools:` alone. The cheapest correct form of "print every
permission-bearing key" is to print the block: a row that prints a chosen
subset has to be re-audited every time the runtime's contract moves,
which is the failure this condition is. **This corrects an inversion of
C-2's purpose:**
v2.3's disclosure enumerated every *inert* `.claude/hooks/` script,
stated as registered by nothing, and said nothing at all about a live
tool declaration. A disclosure that names what cannot run and omits what
does is worse than one that names neither, because it reads as coverage —
and printing `tools:` while omitting `permissionMode` was the same
inversion one key over.

**No pack registers an agent hook at v1.0** (C-1). This rule was stated
in the retired US-6, and it is restated here rather than allowed to lapse
with the mechanism that used to carry it. **A v1.1 reader must know that
the rule predates Q-54's deletion and must be re-established when
`merge-json` returns**, because after Q-54 it is *trivially* true — no
pack writes `.claude/settings.json` at all (stage 2 above), so there is
no `hooks` key for a pack to claim — and a rule that has become trivially
true is exactly the kind that is dropped as redundant by whoever
reintroduces the capability. The reasons it was taken as a **format**
decision, in the order they carried weight, and none of them is about
`merge-json`:

1. **A hook is categorically unlike everything else a pack writes.** The
   whole of the rest of this format is "a pack writes text files into a
   project", and nothing else it writes executes. A hook is arbitrary
   shell, run by the agent runtime, on events the user does not initiate
   deliberately, with no per-invocation consent. One-time consent at init
   is not consent to the hundredth invocation.
2. **There is no provenance story to hang it on.** v1.0 has no signing,
   no registry and no provenance fields in `pack.json`. The bundled packs
   are low-risk; the **format** is not, because `validate` is what
   pronounces a pack well-formed and that pronouncement outlives "packs
   are bundled".
3. **`update` would make the consent unbounded**, and that is not fixable
   in F1. A hook's command string would be a merge target, and a 3-way
   merge can resolve to a command **neither party wrote**. v1.1 must
   solve that before a hook declaration ships, not alongside it.
4. **The consent UX belongs to F2.** Designing the declaration here and
   the consent there splits one decision that must not be split — and at
   v1.0 there is no consent UX at all (US-13), so there is nothing to
   split it against.

**What a pack may still do.** A pack **may** ship files under
`.claude/hooks/`. They are ordinary files: written `0644` (the executable
bit is forbidden under `.claude/` — above), registered by nothing and
executed by nothing. This is what the `planning` pack's
`kill-criteria-guard.sh` is (`pack-inventory.md`). `validate` emits
**`W-HOOK-SCRIPT-INERT`** — a **`notice`**, never promoted by `--strict`
(Q-60), because the script is inert *because of this rule* rather than in
spite of it — naming each such file, at US-16 **step 8**,
and says plainly that no v1.0 mechanism registers it; the same files are
listed in `init`'s pre-write summary and in `pack info`. A test may
assert the rule by shipping such a file and requiring both the warning
and, after an apply, mode `0644` and no reference to the file anywhere
under `.claude/`.

**There is no `--accept-hooks` flag and no `E-HOOKS-NOT-SUPPORTED`
code.** Both went with the consent gate (Q-54, US-13). A script written
against a future version still fails loudly rather than silently doing
nothing — `--accept-hooks` is now `E-CLI-UNKNOWN-FLAG`, exit 1, which is
the same outcome by the general rule instead of by a reserved special
case. **v1.1 obligation, recorded in §F1.9:** a version that reinstates
the consent gate must re-reserve both flag names before a pack can
declare one as a parameter alias (US-8).

---

**US-4 — Fix paths and fill placeholders without a manual pass**
> As a project owner, I want applied files to contain correct internal
> paths and my project's values so that the applied project is
> immediately runnable (R3, "no manual path fixups").

**Acceptance criteria:**
**The resolution domain of an `in` glob is a normative rule, stated once**
(C-27). Through v2.2 it was stated three times and normatively nowhere,
and one of the three statements was weaker than the other two.

> **The resolution domain of an `in` glob is the plan's ordered
> written-set — the applied paths every *earlier* step writes — and
> nothing else: never the filesystem, never the payload, never the
> project's pre-existing content.**

Three consequences, and they are requirements rather than commentary:

- A glob matching nothing in that set fails with
  `E-RECIPE-STEP-INVALID`, naming the step index and the glob. This is
  why `in: [".harness/pack/**"]` matches nothing and cannot reach the
  payload: the payload is not in the written-set at all.
- **Every path an `in` glob matches is re-checked against the stage-2
  denylist** (US-3), individually, and a failure is
  `E-MAP-RESERVED-DEST`, exit 2. The written-set argument already implies
  no reserved path can be there; the re-check exists because that
  implication is a chain of three statements in three sections, and an
  invariant C-5 calls absolute deserves a check as well as an argument.
- The type system carries the same rule independently: the written-set is
  `AppliedPath[]` and the payload is `HarnessPath`, so *"an `in` glob
  names a payload path"* is not constructible (US-3 stage 2, C-14).

- **`rewrite-path`** — `{ "op": "rewrite-path", "in": [<glob>, …],
  "find", "replace", "when"? }`. `in` globs over **applied** paths that
  earlier steps have **already written**; `find` is a **literal** string,
  never a regex; `replace` is a literal string. Neither may contain a
  line break. The step rewrites every occurrence, and it applies to text
  files only.
- A `rewrite-path` step matching nothing across all its `in` files fails
  validation with `E-REWRITE-UNUSED` — a rewrite that no longer applies
  is stale, and staleness is the defect this product exists to prevent.
- A `rewrite-path` whose `in` glob matches no file the recipe has written
  by that point fails with `E-RECIPE-STEP-INVALID`, naming the step index
  and the glob. Order matters, and a rewrite that runs before its target
  is placed is an authoring error, not a silent no-op.
- **`substitute`** — `{ "op": "substitute", "in": [<glob>, …],
  "tokens"?, "when"? }`. Replaces `{{harness:param.<id>}}` with the
  recorded answer for that parameter, and `{{harness:pack.name}}`,
  `{{harness:pack.version}}`, `{{harness:cli.version}}` with their values,
  in every applied file matched by `in` — where `in` globs over
  **applied paths that earlier steps have already written**, exactly and
  identically to `rewrite-path` above. The two primitives read the same
  domain and the two clauses now say so in the same words; through v2.2
  `substitute`'s clause said only *"every applied file matched by `in`"*
  and the constraint was carried for it by a single §F1.2 table cell.
  `tokens`, when present, is an
  allowlist of the token bodies the step may resolve; a `{{harness:…}}`
  token in those files outside the allowlist is `E-SUBST-UNRESOLVED`.
- Any `{{…}}` token **not** beginning `harness:` is copied verbatim.
  Applying the coding pack leaves every `{{Feature name}}`,
  `{{YYYY-MM-DD}}` and `{{PLACEHOLDER}}` in the payload's document
  templates byte-identical.
- **Escape.** `{{harness:lit:<X>}}` renders as the literal text
  `{{harness:<X>}}`, so a pack can *document* the reserved prefix. The
  escape is resolved in the same pass as every other `{{harness:…}}`
  token, once, and its output is never re-scanned, so
  `{{harness:lit:lit:x}}` renders `{{harness:lit:x}}` and nothing
  further.
- An unresolved `{{harness:…}}` token remaining in any output file fails
  the apply with `E-SUBST-UNRESOLVED` before anything is written.
- No substitution variable is non-deterministic. There is no
  `{{harness:date}}`, `{{harness:cwd}}` or equivalent, by design.
- Applying the coding pack rewrites `targets/Run.md` and
  `.claude/commands/target.md` so that every `template/targets/…`
  reference reads `.harness/pack/targets/…`, with no manual step.

**A substituted value is untrusted input** (C-7, C-9's surviving half,
C-28). An answer is typed by a user and recorded verbatim in a manifest
this spec requires to be committed, so it is treated as untrusted at
every use, not only at the prompt.

- **There is no JSON destination and therefore no JSON escaping rule.**
  Context-aware escaping and the post-serialization re-parse were
  `merge-json`'s, and `merge-json` does not ship (Q-54). Every phase-2
  destination at v1.0 is a text file into which a value is inserted
  verbatim, and the two checks below are what make that safe. **v1.1
  obligation, §F1.9:** a version that reintroduces a JSON destination
  reintroduces both — C-7's escaping *and* the deep-equal re-parse, which
  is the half that catches an injected value that still parses.
- **No substitution into a security-relevant settings key** — the rule,
  and its code `E-SUBST-IN-SECURITY-KEY`, are **deleted with their
  subject** (Q-54). No pack writes a settings file at v1.0 (US-3 stage
  2), so no substituted value can land in one; the check had nothing left
  to fire on and a check that cannot fire is worse than none, because it
  reads as coverage. **v1.1 obligation, §F1.9, and it is C-8's:** a
  permission string is a decision the pack author makes at authoring
  time, not one a user makes by typing a project name, and the rule must
  return in the same change that returns the destination.
- **No line break out of a value** (C-9, surviving half). A substituted
  value may not contain `\n`, `\r`, `U+2028` or `U+2029`.
  **`E-SUBST-NEWLINE`**, exit 2. This is the **sufficient** condition and
  the one that does not depend on a pack author having written a good
  `pattern`: a conforming pattern already excludes line breaks, and this
  check holds when the pattern is weak. The lex half of the old check —
  "the line it produces must not read as a `harness:` directive" — **is
  removed with the region parser (Q-45)**; the generated anchors of US-32
  are inert text that nothing reads, so a forged one has nothing to
  hijack at v1.0. Restoring the lex check is a v1.1 obligation and is
  recorded as such in §F1.9.

**A substituted answer landing in agent-instruction content — the
boundary, stated, accepted, and enumerated** (C-28, C-43). Silence does not
satisfy this, and silence is what v2.2 offered: C-8's reasoning was
applied to settings values and to nothing else, which reads as a
considered boundary when it was only an unexamined one.

**The boundary.** A substituted answer landing in content an agent
runtime reads is **content authored by the answering user, committed to
the repository, and read as instructions by every later agent run in
every clone of it** — so the person who *types* the answer and the person
whose agent later *reads* it need not be the same person. That is a real
crossing, and it is not one a settings value makes in the same way.

**There is no classifier. The disclosure enumerates every applied path
that receives a substituted value** (C-43). Through v2.4 the boundary was
decided by a **closed three-clause classifier** — root `CLAUDE.md` /
`AGENTS.md`; any `.claude` segment; a payload source matched by the
`coordination` anatomy globs — and it is **deleted at v2.5**, not
repaired again. Two reasons, and the second is why a third repair was
not attempted:

- **It missed two applied paths in the one pack it was written against.**
  `coding`'s `substitute` writes `projectName` into
  `specifications/README.md` and `specifications/project-brief.md`.
  Neither is caught: neither is root `CLAUDE.md` or `AGENTS.md`, neither
  has a `.claude` segment, and their payload sources —
  `specifications/README.template.md` and
  `specifications/project-brief.template.md` — are matched by no
  `coordination` glob. So the disclosure named **three of five**, and the
  test strengthened at v2.4 to catch exactly this shape passed without
  noticing: **C-35's defect, one clause over.**
- **Clause 3 was always the wrong shape.** It covered **one** anatomy
  part, while `process` and `behaviouralGuidelines` are equally
  instruction-bearing — `coding` declares
  `process: { "paths": ["specifications/README.md"] }` and
  `behaviouralGuidelines: { "paths": ["CLAUDE.md.template"] }`. Extending
  the clause to three parts would have been the same repair a fourth
  time.

**The rule that replaces it, and it is total.** The disclosure lists
**every applied path at which the render resolved at least one
`{{harness:param.<id>}}` token**, with the parameter id and the value
verbatim. Not a category, not a classifier, no `collisionKey` matching,
no anatomy globs, no payload-source association. It is a by-product the
renderer already has: the render is where a token is replaced, so the
list is the set of paths at which a replacement happened.

- **`{{harness:pack.name}}`, `{{harness:pack.version}}` and
  `{{harness:cli.version}}` are not enumerated.** They are not user
  input; the concern is a value a *user typed*, and listing three
  constants beside it would dilute a list whose whole value is that
  every line matters.
- **A path in a `substitute` step's `in` set at which no token resolved
  is not listed.** The write set is the quantifier for the *rules*; the
  disclosure's quantifier is *a value actually landed here*. `coding`'s
  applied `AgentTeams/README.md` is matched by the step's `AgentTeams/*.md`
  glob and receives no answer, so it does not appear — which is the same
  outcome the deleted classifier reached, by a rule that needs no
  argument to reach it.
- **What the classifier bought that a total enumeration does not: nothing.**
  Its only job was to decide which paths the disclosure names, and the
  total enumeration names a **superset** of them, computed from data the
  renderer holds anyway. It cost two findings across two versions.

**Decided: accepted, with the reasoning stated, and enumerated in the
disclosure anyway.** Both, not either: the reasoning alone leaves a
reader no way to see *which* values landed *where*, and the enumeration
alone leaves them no standard for judging it.

*Why it is accepted rather than forbidden:*

1. **It is not a privilege escalation, and C-8's subject was.** A
   settings value is consumed by a **mechanism** — the permission engine
   — that acts on it without further human judgement. Agent-instruction
   content is consumed by a model that still operates *underneath* that
   engine, which a pack cannot touch at all at v1.0 (US-3 stage 2 makes
   the settings files unwritable). Injected prose can attempt to
   persuade; it cannot grant.
2. **Forbidding it deletes the feature.** Substitution into `CLAUDE.md`
   *is* the product: all three v1.0 packs put a project name there. An
   `E-SUBST-IN-AGENT-INSTRUCTION` would make every pack unshippable.
3. **The existing controls are load-bearing and they bite here.** C-7
   makes `pattern` **required** on every string parameter, anchored, ≤
   200 characters, with `maxLength` checked first (US-8); C-9's newline
   ban (`E-SUBST-NEWLINE`) forbids the value from opening a line.
   Together those kill the effective injection shapes — a forged heading,
   a forged instruction block, a forged fenced region **all require a
   line break** — and the recommended default pattern
   `^[\p{L}\p{N} ._-]{1,64}$` admits no backtick, brace, angle bracket,
   hash or colon. What survives is a single-line clause inside a
   sentence: the weakest form of the attack, and the one a reader of the
   file sees.

*The enumeration.* The security disclosure (US-13) carries
**`agentInstructionSubstitutions`** — the name is kept, because the ids
are cited by F5, F6 and the master spec, and what changed is the rule
that fills it, not what it is for. It holds **every applied path at which
a parameter answer was substituted**, with the parameter id and the
**value verbatim** — one per line, never summarised, never truncated,
never counted — rendered by `pack info`, `validate --json` and `init`'s
pre-write summary from the one builder.

**The test is total at v2.5, and totality is the point** (C-43):
applying `coding` must make `agentInstructionSubstitutions` name **all
five** applied paths, each with its parameter id and the answer verbatim:

| Applied path | Written by | Parameter |
|---|---|---|
| `CLAUDE.md` | `generate` from `CLAUDE.md.template` | `projectName`, `stack` |
| `AgentTeams/Specify.md` | `substitute` over `AgentTeams/*.md` | `projectName` |
| `AgentTeams/Implement.md` | `substitute` over `AgentTeams/*.md` | `projectName` |
| `specifications/README.md` | `substitute` | `projectName` |
| `specifications/project-brief.md` | `substitute` | `projectName` |

A test that asserts `CLAUDE.md` alone passed under the v2.3 classifier; a
test that asserts three passed under the v2.4 one. **A test that asserts
the count and the membership together is the only shape that cannot pass
while the rule is wrong**, and that is what US-16 now requires.
`AgentTeams/README.md` is matched by the `substitute` step's glob,
receives no answer, and is therefore **not** listed — which the test
asserts explicitly, so "five" is a closed count rather than a floor.

*It does not gate, and that is a security argument rather than a
convenience one.* At v1.0 nothing gates (US-13), and if this array did,
a prompt would fire on **every apply of all three v1.0 packs** — which
trains a user to accept without reading and destroys the property that a
prompt, the first time one ever appears, **means something**. This is the
same enumerate-don't-gate trade C-12 makes for the executable bit.

*A `W-SUBST-IN-AGENT-INSTRUCTION` warning is rejected.* `validate --all
--strict` runs in this repo's CI (US-16), so a warning all three bundled
packs trip either fails the build or teaches the team to ignore
`--strict`. A diagnostic that everything legitimate trips is not a
diagnostic.

---

**US-8 — Declare init parameters and vary content by the answer**
> As a pack author, I want to declare questions asked at init and make
> some content depend on the answer so that the planning pack can ship
> calibrated rather than hard-coded to one pole.

**Acceptance criteria:**
- `pack.json` may declare a `parameters` array. Each entry has `id`
  (`^[a-zA-Z][a-zA-Z0-9]{0,31}$`), `prompt`, `type` (`string` | `enum` |
  `boolean`), optional `default`, optional `required` (default `false`),
  optional `flag`, optional `notASecret`, and for `enum` a non-empty
  `values` array. A `string` parameter additionally **requires**
  `pattern` and may declare `maxLength`.
- **Every `type: "string"` parameter carries an anchored `pattern`**
  (C-7). `pattern` is a regex source that must begin `^` and end `$`, be
  at most 200 characters, and contain no backreference and no lookaround.
  A missing `pattern` is **`E-PARAM-NO-PATTERN`**, exit 2; an
  uncompilable, unanchored or over-long one, or one using a forbidden
  construct, is **`E-PARAM-PATTERN-INVALID`**, exit 2. The recommended
  conservative default — which an author **writes out** rather than
  inherits silently, so the constraint is visible in the pack diff — is
  `^[\p{L}\p{N} ._-]{1,64}$` with the `u` flag. `pattern` is meaningless
  on `enum` and `boolean`, and declaring it there is
  `E-PARAM-PATTERN-INVALID`.
- **`maxLength`** applies to `type: "string"`, defaults to **256** and has
  a hard ceiling of **4096**. It is checked **before** `pattern` is run,
  so pattern evaluation is bounded by construction and a
  catastrophic-backtracking input is not reachable.
- **An answer is validated twice, and the two failures are two codes**
  (C-29). It is validated when it is **collected**, and **again every
  time it is read back from the manifest**. The manifest carries no
  self-integrity check (§Technical Context), so a recorded answer is an
  editable value by this spec's own design, and `verify` re-renders from
  recorded answers on every run.
  - **At collection** a failure is **`E-PARAM-INVALID`**, exit **1**. The
    user typed it and can retype it.
  - **On read-back** a failure is **`E-MANIFEST-ANSWER-INVALID`**, exit
    **2**. The user typed nothing: a recorded answer that no longer
    satisfies its own declaration means the manifest was edited, or the
    pack's declaration moved under it. That is a manifest-integrity
    fault, which is what this document's exit class 2 *means*.
  - **This is §Error States' own rule applied to itself.** "Severity is a
    property of the code, not of the occasion — a scenario fatal in one
    context and tolerable in another gets **two codes**." Through v2.2
    `E-PARAM-INVALID` carried both occasions at one severity, which is
    the exact shape that rule forbids. A test may assert the split by
    hand-editing `.harness/manifest.json` to an answer outside its
    `pattern` and requiring `verify` to exit 2 with
    `E-MANIFEST-ANSWER-INVALID` and **no** per-path report.
- **A credential-valued parameter is forbidden, not handled** (C-15). At
  validate time, a parameter whose `id` or `prompt` matches
  `/api[_-]?key|private[_-]?key|secret|token|passwo?rd|credential|connection.?string/i`
  fails with **`E-PARAM-SECRET-SUSPECTED`**, exit 2, unless it carries
  `"notASecret": true`. The regex deliberately does **not** match a bare
  `key`, which false-positives on `monkey`, `keyword` and `sortKey`. The
  message states plainly that an answer is written verbatim into
  `.harness/manifest.json`, which **is committed to version control by
  design** and is therefore exactly as public as the repository.
- At answer time, a value that *looks* like a credential — `-----BEGIN`,
  `sk-`, `ghp_`, `xox[baprs]-`, or **40 or more characters drawn only from
  the base64url alphabet** — draws **`W-ANSWER-LOOKS-SECRET`**. A warning
  only: an error there is a false-positive machine. **This said
  "high-entropy" through v4.8, which promised a measurement the check does
  not make** — it is an alphabet-and-length test, so `"a" × 40` matches. The
  looseness is defensible precisely *because* the code is a warning, but
  the wording should describe the check rather than flatter it.
- The tempting alternative — a `type: "secret"` prompted, used and never
  recorded — is **rejected**, because an unrecorded answer makes the
  applied tree non-recomputable, which is the property G-F1-5 rests on.
- **`flag` declares a CLI alias.** A parameter declaring
  `"flag": "calibration"` makes `--calibration high-floor` exactly
  `--set constraintFloor=high-floor`: the alias is registered from
  `pack.json` data at argv-parse time, and the CLI holds **no**
  pack-specific knowledge. This is what keeps S5 testable.
- `flag` is kebab-case (`^[a-z][a-z0-9-]{0,31}$`). A `flag` colliding
  with a reserved CLI flag (`--set`, `--scaffold`, `--json`, `--strict`,
  `--force`, `--rollback`, `--all`, **`--dry-run`**), with a reserved word,
  or with
  another parameter's `flag` in the same pack, fails with
  `E-PARAM-FLAG-INVALID`. The reserved list is the whole list; a flag is
  reserved whether or not the command being run accepts it.
  **`--dry-run` is reserved although no v1.0 command in this document
  accepts it** (Q-62). It is `update`'s read-only mode, which is F3's;
  reserving it here is the list's own rule applied on time — *a flag is
  reserved whether or not the command being run accepts it* — and the
  alternative is a pack that has already claimed `dry-run` as an alias
  silently shadowing a read-only mode when F3 ships. This is the
  `--accept-permissions` mistake avoided rather than repeated.
  **`--accept-permissions` and `--accept-hooks` have left the list**
  because the consent gate they belonged to is deleted (Q-54, US-13).
  **v1.1 obligation, §F1.9:** the version that reinstates the gate must
  re-reserve both names **before** shipping, or a pack that has meanwhile
  claimed one as a parameter alias silently shadows a security flag.
- **Pack-declared aliases force a two-pass argv parse**, and it must be
  stated or an implementer reports a false `E-CLI-UNKNOWN-FLAG` for every
  alias. Pass 1 recognises **the command group**, the command, global
  flags, command flags and the pack name, and **defers** every
  unrecognised token without judging it. Pass 2 re-parses with the
  resolved pack's aliases registered, and only then may a token be
  reported unknown. Argv parsing is fail-closed at the end of pass 2.
- **The command group changes nothing about this algorithm** (Q-63), and
  the confirmation is stated rather than assumed. What forces two passes
  is that the alias set is **unknowable until the pack is resolved** —
  it is read from `pack.json` data at parse time. A command group adds
  one **fixed** positional (`harness`) ahead of the command; a fixed
  token is recognisable in pass 1 by construction, contributes nothing to
  the deferred set, and does not move the point at which the alias set
  becomes known. Pass 1 therefore consumes group, then command, then the
  pack name, exactly as it consumed command then pack name before; pass 2
  is unchanged; the fail-closed point is unchanged. **The one visible
  consequence is positional, not procedural:** the command is now the
  *second* positional rather than the first, which is what
  `E-CLI-UNKNOWN-COMMAND` is scoped against in §Error States.
- An aliased flag is sugar: it resolves to the same recorded answer, is
  subject to the same checks, and is recorded under the parameter's `id`,
  never under the flag name. Passing both the alias and `--set` for one
  parameter with different values fails with `E-PARAM-INVALID`.
- A `required` parameter with no answer and no default fails with
  `E-PARAM-MISSING`; an `enum` answer outside `values` fails with
  `E-PARAM-INVALID`, listing the permitted values verbatim.
- Answers are substitutable as `{{harness:param.<id>}}` (US-4).
- **Content varies by answer in exactly one declared way: a conditional
  recipe step.** Any step may carry `"when": { "<paramId>": "<value>" }`
  and is skipped unless the recorded answer equals that value. Only
  single equality is supported — no boolean operators, no negation, no
  multiple keys in one `when`. A malformed or compound `when` fails with
  `E-RECIPE-STEP-INVALID`. Content-level conditionals inside a file do
  **not** exist at v1.0: the `harness:if` region directive is removed
  with the region parser (Q-45).
- A parameter named in a `when` must be declared `required` or carry a
  `default`, so no branch is ever evaluated against `undefined`.
  Violation fails with `E-PARAM-UNDECIDABLE`.
- `validate` renders the pack once **per combination** of parameters that
  appear in a `when`, and every combination must pass every other
  validation rule. The combination count is printed; validation fails
  with `E-PARAM-COMBINATORICS` above 32 combinations.
- All answers are recorded verbatim in the manifest, including defaults
  accepted without being typed, and including answers to parameters that
  turned out to select nothing.
- The `coding` and `writing` packs declare only substitution parameters;
  neither declares a `when`. The `planning` pack declares
  `constraintFloor` as an `enum` of `high-floor | near-zero-floor` with
  `"flag": "calibration"`. Its `calibrations/<name>/` layout is a
  **pack-authoring convention over `when` steps**, not a format feature —
  and it is the only case in any v1.0 pack of pack content varying by an
  init answer.

---

**US-9 — Declare opt-in scaffolds, and be stopped from picking two of a choose-one**
> As a project owner, I want to pick zero or more structural scaffolds at
> init so that I get a backend layout only if I have a backend — and I
> want the tool to tell me plainly when two scaffolds are alternatives
> rather than peers.

**Acceptance criteria:**
- `pack.json` declares a `scaffolds` array; each entry has `id`
  (`^[a-z][a-z0-9-]{0,31}$`), `description`, an optional `category`
  (`^[a-z][a-z0-9-]{0,31}$`), and optionally its own `parameters`.
- **Steps for a scaffold live in `recipe.json` under `scaffolds.<id>`**,
  an ordered array in the same step format as the base recipe. A
  mismatch in either direction — a scaffold declared in `pack.json` with
  no entry in `recipe.json`, or a `recipe.json` scaffold key naming no
  declared scaffold — is a pack defect and fails with
  `E-RECIPE-STEP-INVALID`, exit 2, at validate time.
  `E-SCAFFOLD-UNKNOWN` is reserved for the *user*-facing case: an id
  typed on the command line that the pack does not declare.
- Scaffolds are opt-in: with no `--scaffold` flag, none is applied.
- `--scaffold backend-azure` selects by id; an unknown id fails with
  `E-SCAFFOLD-UNKNOWN`, listing the available ids verbatim.
- **Two scaffolds sharing a `category` are alternatives, and selecting
  both fails with `E-SCAFFOLD-EXCLUSIVE`, exit 1**, naming the category
  and the two ids. **The rule stands; its worked example has left the
  product** (Q-82). `backend-azure` and `backend-aws` both declared
  `"category": "backend"` and were **the only same-category pair v1.0 ever
  had**; both are now add-ons under `addons/`. **No bundled pack can reach
  this code**, and F1's **T-1220(b)** asserts it against a fixture pack
  instead. The reasoning is kept in full because v1.1's add-on mechanism
  inherits it: under the pre-category model the fault surfaced only as a
  path collision on `infrastructure/backend-deploy/`, which is true but
  tells the user the wrong thing — they did not hit an authoring bug, they
  picked two of a choose-one. **Both diagnostics are true; only one is
  useful**, and that is the whole of the argument for the field.
- A scaffold with no `category` is composable with everything.
  **Every scaffold in v1.0 declares one**: `writing-workstream`, now the
  only scaffold in the product, declares **`"category": "workstream"`** and
  is alone in it — so the no-category branch, like the same-category one,
  has no bundled subject and is fixture-covered. *(Through v3.0 this
  sentence read "`writing-workstream` declares none", which was simply
  false about the shipping pack; corrected at v3.2.)*
- Two scaffolds **of different categories** that write the same applied
  path is an authoring error: `E-SCAFFOLD-COLLISION`, computed
  statically across every pair whose categories differ or are absent, and
  re-checked at apply for the selected set.
- Composition is order-independent in effect: selected scaffolds are
  applied in the order **declared in `pack.json`**, never the order typed
  on the command line, so two users typing the flags differently get
  byte-identical projects.
- The manifest records the selected scaffold ids in declared order.
- A scaffold's parameters are only prompted for, and only recorded, when
  that scaffold is selected.
- There is no scaffold `contributes` mechanism at v1.0. It existed to
  append into a base-pack **region**, and regions are gone (Q-45). A
  scaffold that needs to change a generated file does so with a
  `rewrite-path` step of its own, or the pack ships two conditional
  `generate` steps.

---

**US-10 — Record what was applied, minimally**
> As a project owner, I want the applied project to carry a small,
> readable record of what was applied so that the applied state can be
> recomputed later without guessing.

**Acceptance criteria:**
- After a successful apply, `.harness/manifest.json` exists at the
  project root with the schema in §F1.4.
- It records exactly **six keys**: `manifestVersion`, `cli`, `pack`
  (`name`, `version`, `formatVersion`), **`payloadDigest`**, `parameters`
  (every declared parameter and its answer) and `scaffolds` (selected
  ids, in declared order). Nothing else.
- **A declared parameter with no recorded answer is
  `E-MANIFEST-ANSWER-INVALID`, exit 2** — the ruling this criterion needed
  and did not have. *"Every declared parameter and its answer"* is a
  completeness claim with no code behind it, so a manifest missing one was
  unreportable: `parameters.ts` explicitly defers the case to the
  manifest's reader, and the reader had nothing to raise. Of the two
  candidates, `E-MANIFEST-CORRUPT` says *"is not readable"*, which is
  false — the file parses fine — while `E-MANIFEST-ANSWER-INVALID` says
  *"the manifest was edited, or the pack's declaration changed under it"*,
  which is **exactly** the pair of causes. Same exit class, same remedy.
- **`cli`, `pack.name` and `pack.version` must be well-formed, and a
  malformed one is `E-MANIFEST-CORRUPT`, exit 2.** All three are read and
  compared, and the document was silent on whether they had to parse. It
  **fails closed** on `checkCliFloor`'s own reasoning (v4.9): a version of
  `"1.0"` there was *neither satisfied nor refused, it was ignored*, and
  the same hole in the manifest would let a recorded floor be quietly
  disregarded.
- **A `payloadDigest` nested inside `pack` is `E-MANIFEST-CORRUPT`, exit
  2, naming the nesting.** This criterion already forbids the position and
  offers a test for it, but named no code — so a manifest carrying one
  would have been reported as *"the top-level key is missing"*: the right
  exit class for the wrong reason, and a remedy pointing at the wrong
  line.
- **`payloadDigest` is one SHA-256 tree digest over `.harness/pack/`**
  (Q-52), of the form `sha256-<64 lowercase hex>`. It is recorded
  **top-level, between `pack` and `parameters`** — **never nested inside
  `pack`**. `pack` holds what the pack *declared*, read out of
  `pack.json`; the digest is what *this apply observed*. A test may
  assert the position by reading the manifest's key order and requiring
  `payloadDigest` to be the fourth key and `pack.payloadDigest` to be
  absent.
- **The digest is over normalized content, not raw bytes.** Each payload
  file contributes `hashText(normalizeText(bytes))` when it is text and
  `hashBytes(bytes)` when it is binary (§NFR); the file hashes are
  combined by the one path-prefixed, `\n`-joined, byte-ascending
  `treeDigest`. Phase 1 copies raw bytes, so a raw digest would be
  defeated by any checkout that rewrites them: every Windows clone with
  `core.autocrlf` would report a tampered payload on the first `verify`.
  **The accepted cost is stated rather than hidden: a pure line-ending
  edit of the payload is undetectable.** A test may assert both halves —
  rewrite every payload file to CRLF and require the digest unchanged;
  change one payload character and require it to change.
- **The digest covers `recipe.json` too**, because the recipe lives in
  the payload. A hand-edited recipe is caught by the same check, with no
  second mechanism.
- **There is no `files` array, no per-file hash list, no `regions`, no
  `shared` array, no `pack.integrity`, no `appliedAt` and no manifest
  self-hash** (Q-43). Each was carried for a consumer that v1.0 does not
  have. `payloadDigest` is the one hash the manifest carries and it is a
  *tree* digest, not the per-file list Q-43 rejected. There is likewise
  no owned-key record, because there are no owned keys (Q-54).
- **`.harness/` carries no README** (Q-50 as amended). It is tool-owned,
  excluded from the folder-README rule exactly as `.claude/` is, and no
  CLI-owned write produces `.harness/README.md`. The complete list of
  what the CLI writes under `.harness/` is the payload, the manifest, the
  journal, `journal.d/` and the lock (US-3 stage 2).
- **There is no `.harness/base/` store, and no `.harness/.gitattributes`
  is written.** The base existed because a hash cannot be a merge base
  and the old pack version might be unavailable; under Q-39 the payload
  is local and under Q-40 the render is deterministic, so neither holds.
  Its `.gitattributes` problem, its text-only restriction and every
  condition attached to it are removed with it.
- Exactly one `pack` object. The schema has no array of packs and no
  merge or precedence field. **A project holds exactly one pack.**
- The manifest is committed to version control; `init` does not add
  `.harness/` to `.gitignore` and prints nothing suggesting it should.
  **`.harness/pack/` is committed too**, and is the largest thing the
  apply writes.
- **State this plainly wherever it is relevant: `parameters` is committed
  and repo-public.** Every recorded answer is written into a file this
  spec requires to be committed. It is exactly as public as the
  repository holding it, and no facility exists to mark one secret. That
  is the reasoning behind US-8's outright ban on credential-valued
  parameters, and it is stated here because this is the story that
  decides where an answer ends up.
- Re-serializing an unchanged manifest produces byte-identical output:
  2-space indent, `\n` endings, keys in the order defined in §F1.4,
  `parameters` sorted by declared parameter order, `scaffolds` in
  declared order.
- **The digest does not break determinism.** It is a pure function of the
  payload, and the payload is a pure copy of the pack, so two applies of
  the same pack version record the same `payloadDigest` (US-14).
- Two applies of the same pack version with the same answers produce
  **byte-identical manifests**. A test may assert equality of the two
  files directly.

---

**US-13 — Apply atomically, or not at all**
> As a project owner, I want a failed apply to leave no half-written
> project so that I never have to work out by hand which files landed.

**Acceptance criteria:**
- The apply computes **both phases completely in memory** — the payload
  file list and the full phase-2 output set — and runs every validation
  **before writing any file**. A failure at this stage writes nothing,
  not even `.harness/`. `payloadDigest` is computed here too, over the
  **planned** payload file set (US-30), so "everything is planned before
  anything is written" stays literally true of the manifest as well.
- **The executor reads nothing from disk** (C-23). Phase 2 is *rendered*
  at plan time, from the payload bytes the planner resolved; the executor
  writes the bytes the plan already holds and performs **no read of
  `.harness/pack/`, of the bundle, or of any applied path**. Its only
  filesystem reads are the destination-side safety checks named in this
  story — the `lstat`s of stage 3, and the re-hash of a `--force`
  byte-identical path — which are about the *destination*, where the
  adversary is the filesystem, and are not reads of an input. **This
  removes a window rather than an optimisation:** if phase 2 re-read its
  source during execution, content could change between step 10 and step
  11, or between step 11's own writes, and that content would have passed
  no validation, appeared in no disclosure and been covered by no
  `payloadDigest`. A test is in US-30.
- **Every path the executor may write carries a brand, and the executor
  takes their union** (C-14). A phase-2 destination is an `AppliedPath`;
  a CLI-owned write under `.harness/` is a **`HarnessPath`**; the planned
  file list, the journal, the atomic writer and rollback all take
  **`WritablePath = AppliedPath | HarnessPath`** and never a bare
  `string`. Phase 1 is what makes the second brand necessary: its writes
  are journalled and rolled back exactly as phase-2 writes are, but their
  destinations are ones the reserved-destination denylist forbids to a
  recipe step. A test may assert the property by construction — there is
  no exported cast to either brand outside their single constructors.
- `init` into a directory where any target applied path already exists
  fails with `E-TARGET-EXISTS`, listing the first ten colliding paths and
  the total count. `--force` proceeds only for paths whose existing
  content is byte-identical to what would be written; any other collision
  still fails. This is the mechanism S7 uses to re-init this repo, whose
  `.claude/agents/` already holds exactly what the pack ships.
- **All three step-vs-existing-file comparisons resolve by
  `collisionKey`, never by exact string** (N-5, and it is C-20's defect
  one layer down). `E-TARGET-EXISTS`'s existence test, `--force`'s
  byte-identity test and the journal's **`preExisting`** determination
  each compare a planned applied path against a path already on disk, and
  each folds both sides with `collisionKey` — NFC-normalized then
  case-folded — on **every** platform, unconditionally, exactly as the
  step-vs-step rule of US-3 does. **Why this is a rollback-safety
  requirement and not a tidiness one:** on macOS and on Windows a project
  holding `.claude/Settings.json` and a step writing
  `.claude/settings.json` are the **same file**. Under exact-string
  comparison `E-TARGET-EXISTS` does not fire, the apply silently
  overwrites a file it believes it is creating, the journal records
  `preExisting: false`, no backup is taken — and `--rollback` then
  **deletes a user file it did not create**, which is precisely the
  invariant C-13 and G-F1-6 both state. Three tests: the collision must
  raise `E-TARGET-EXISTS` (exit 1, zero bytes); with `--force` and
  differing content it must still fail; with `--force` and byte-identical
  content the journal must record `preExisting: true` and rollback must
  **leave the file untouched**.
- **When a `--force` byte-identical collision matches by `collisionKey`
  but the on-disk basename differs from the planned one, the write is
  skipped entirely and the journal records the on-disk path** (C-36).
  This is N-5's folding rule followed one step further than v2.3 followed
  it. With `.claude/Settings.json` on disk and a step writing
  `.claude/settings.json`, `--force` correctly finds them byte-identical
  and records `preExisting: true` — and then performs the write anyway.
  On macOS and Windows `rename(tmp, dest)` may **replace the directory
  entry**, changing the stored basename from `Settings.json` to
  `settings.json`. The bytes are unchanged, so nothing detects it; the
  file is not one this apply created, so rollback row 3 says *leave
  untouched* and **restores nothing**; and the user's file has been
  silently renamed by a run whose whole contract is that it wrote what it
  planned and can undo it. The rule, in three parts, each testable:
  - **Skip the write.** There is nothing to write: the content is already
    byte-identical by the check that permitted the `--force` in the first
    place. Writing it can only change something the apply did not intend
    to change. This is the only case in the format where a planned
    applied path produces no write, and it is stated here rather than
    left to an implementer to infer from "byte-identical".
  - **Journal the on-disk path, not the planned one.** The journal
    records the path as it exists — `.claude/Settings.json` — with
    `preExisting: true`, so rollback reasons about the file that is
    actually there. A journal naming a path that does not exist under
    that spelling is a journal rollback cannot act on.
  - **Report it.** The path appears in the run's output as kept rather
    than written, with both spellings named, because a user who sees
    neither spelling has no way to notice that their file and the pack's
    step disagree about case.
  - **A test.** The existing `.claude/Agents/README.md` fixture (US-16),
    re-run with `--force` and byte-identical content, must leave the
    directory entry named **`Agents`** and the file named exactly as it
    was, and must journal that path.
- **There is no consent gate at v1.0, and nothing an apply does requires
  consent.** The gate, its situation table, `ConsentInputs`,
  `--accept-permissions`, `--accept-hooks` and
  `E-SETTINGS-CONSENT-REQUIRED` are **deleted** with `merge-json`
  (Q-54): the only thing that ever required consent was a value landing
  under a security-relevant settings key, and no pack can write a
  settings file at all (US-3 stage 2). A gate that can never fire is not
  a control, it is a claim; deleting it is honest and keeping it would
  not be. **v1.1 obligation, §F1.9, and it is C-2's, restated so it is
  inherited rather than rediscovered:** the version that reintroduces a
  settings destination must reintroduce the gate **in the same change**
  — on the plan, **before the lock is taken and before the first byte**,
  with a verbatim never-summarised enumeration, with zero bytes written
  on refusal, and with the property that **the absence of a consent input
  means "not granted"** rather than "granted by default". A caller must
  not be able to reach the permissive branch by forgetting a field.
- **The planner still builds a security disclosure, and it still
  enumerates.** What it loses is the half whose subject is gone; what it
  keeps has v1.0 consumers and is a requirement:

  | Disclosure content | Status at v1.0 |
  |---|---|
  | **Every applied path the apply would write `0755`**, with the payload path it comes from, verbatim, one per line | **Kept** (C-12) |
  | **Every file the pack ships under a `hooks/` directory in **any** `.claude` tree**, each stated plainly as inert — shipped, `0644`, registered by nothing | **Kept, scoping made explicit at v2.5** (US-3, C-39). `.claude` is matched at any segment here for the same reason it is everywhere else in this document, and the `0644` is enforced by `E-EXEC-DEST-FORBIDDEN` at any segment too (C-39b) |
  | **Every applied path at which a parameter answer was substituted**, with the parameter id and the **value verbatim**, one per line, never summarised, never truncated, never counted | **Kept, and new at v2.3** (C-28, US-4). At v2.4 the classifier that fed it was restated over applied paths (C-35); **at v2.5 the classifier is deleted and the row is a total enumeration** — five applied paths for `coding`, not three (C-43) |
  | **Every pack-shipped `.claude/agents/*.md` and its whole frontmatter block**, verbatim, one per line — the applied path and the frontmatter exactly as the file declares it, never summarised, never truncated, never counted | **New at v2.4, widened at v2.5** (C-32b, C-40, US-3). Through v2.4 the row printed `tools:` alone, so `permissionMode` — which three `coding` agents declare — was invisible. **"Pack-shipped" is the union of two sets**: every `.claude/agents/*.md` in the write set, and every `.claude/agents/*.md` in the **phase-1 payload**, which lands inside the committed project at `.harness/pack/` (C-39c) |
  | Every value written under a security-relevant owned key | **Deleted** — no owned keys, no settings destination (Q-54) |
  | `requiresConsent`, and any field that gates on the disclosure | **Deleted** — nothing gates at v1.0 |

- **The block is delimited, and the delimiters are part of the contract**
  (new at v3.3, `F6-ADR-005` Q-76). `init` writes the rows above to
  **stderr**, wrapped in two fixed lines:

  ```
  --- lintel disclosure begin 4f8b1d2a9c3e57610bd4a8f2c76e9013 ---
  … the rows above, in the order this table gives them …
  --- lintel disclosure end 4f8b1d2a9c3e57610bd4a8f2c76e9013 ---
  ```

  **The token is a per-run nonce** (C-59, v3.6): at least 64 bits from a
  cryptographic source, lowercase hex, **generated once per invocation**
  and repeated verbatim on the end line. **The consumer reads it from the
  begin line** and matches the end line against what it read — never
  against a constant.

  *(The example carried `7f3a9c2e` until v5.4 — **32 bits, half the floor
  the sentence above it states**. Harmless to the rule and dangerous to a
  reader: a test author copying the example produces a non-conforming
  nonce and the suite that checks the mechanism would be checking a weaker
  one. The example is now 128 bits, which is what the implementation
  generates.)*

  **Fixed, versionless and countless**, on purpose: a delimiter carrying
  a version or a row count is a delimiter that changes, and a consumer
  that has to parse it is a consumer that can be broken by an added row.
  Nothing between the lines is reordered or summarised — the rows are
  already specified — and **nothing else is ever printed between them**,
  so a capture is the block and only the block.
- **The delimiters are checked against the content they wrap, and the
  check is fail-closed** (C-49 at v3.4; **its comparison specified at
  v3.5, C-57**). Before emitting, the assembled rows are scanned — **over
  raw bytes, before any escaping** (C-58) — for a **sentinel candidate**,
  and **any candidate** is **`E-DISCLOSURE-FORGERY`**, exit 2, **zero
  bytes written**, naming the offending path.
  - **The check refuses two things** (C-61): any row containing **this
    run's nonce**, and any row matching the **delimiter shape** —
    `--- lintel disclosure (begin|end) <hex> ---` under the
    control-character rule below — **whatever nonce value it carries**.
    Either is `E-DISCLOSURE-FORGERY`.
  - **The second half is why the code stays reachable.** The nonce alone
    makes the first half **probabilistically unreachable**, and a check
    that can essentially never fire is one nobody exercises and nobody
    maintains. The shape refusal gives it a real trigger the fixture
    suite can assert.
  - **It is also defence against a consumer, not a pack.** A reader
    matching the **exact nonce it was handed** — which is what F6 is told
    to do — ignores a forged line carrying a different value. A reader
    that **pattern-matches the shape** re-syncs on it and truncates. That
    is a consumer bug, but *"safe provided every reader implements it
    exactly"* is the assumption this whole finding was about, and one
    regex removes it.
  - **The nonce belongs to `init`'s delimited block and nowhere else**
    (C-62). **`pack info` renders disclosure rows too**, inside a
    `PackReport`, and `pack info --json` is a machine contract G-F1-9
    rests on. It emits **no delimiters**, needs no nonce — nothing
    captures a substring from it — and **its output stays deterministic
    across runs**. Applying the nonce uniformly, which is the obvious
    reading of C-59, would have broken that.
  - **This replaced a matching rule that failed three security rounds**,
    and the history is kept because the reasoning is the useful part.
    v3.4 said only *"scanned for either sentinel line"* — read as exact
    match, defeated by a **trailing space**. v3.5 specified trimming,
    case-folding and C0-stripping — defeated by a **non-breaking space**,
    because `String.prototype.trim()` removes Unicode whitespace and the
    rule said ASCII. **Each fix made the emitter more liberal; each was
    beaten by a reader that was more liberal still.** The emitter cannot
    win that argument, because it is trying to enumerate every way a
    reader might call two strings the same, and the reader is not obliged
    to tell it.
  - **A nonce is not a tighter comparison — it removes the comparison.**
    The security property changes from *"the emitter's matching rule
    dominates every consumer's"*, which is unfalsifiable, to *"the pack
    cannot predict a random value"*, which is a property with a name.
  - **F6 states only "read the nonce from the begin line and match it"**,
    so the two sides share no rule that can drift. `validate` runs the identical scan at **step 11**, over
  the same rendered set, so a pack cannot ship the fault at all rather
  than only failing at apply time.
  **Why this is not optional.** The rows above include whole agent
  frontmatter blocks **verbatim** and multi-line by nature, so a pack
  shipping a frontmatter line reading `--- lintel disclosure end ---`
  truncates the block for **any consumer that reads to the marker** — the
  user's eye, and F6 obeying IM-10. Everything after it is invisible: the
  `0755` paths, the tool grants on agents declared later, the substituted
  values. **The truncated block is well-formed, correctly delimited and
  shorter, and nothing looks wrong.** A delimiter that the content it
  wraps can forge is a convention, not a control — and this control exists
  precisely because pack content is not trusted, so bounding it by "the
  bundled packs are ours" would remove its reason for existing.
  **This is C-9's marker-lex check, restored.** Q-45 removed it when the
  region parser went, on the ground that *"anchors are inert, so a forged
  one hijacks nothing"*, and recorded a **v1.1 obligation to restore it
  when something starts reading markers**. F1 v3.3 created a marker that
  F6 reads immediately and did not consult that obligation; v3.4 does.
  **Why this exists at all:** `interaction-model.md`'s **IM-10** requires
  the skill to reproduce the disclosure as a **contiguous unmodified
  substring**, and until v3.3 this document fixed the block's *rows*
  while fixing no boundary, so there was no way to know where it started
  or stopped. **IM-10 was unmeetable from the day it was written**; F6 is
  its first consumer and is what surfaced it. A test asserts the two
  lines appear exactly once each, in order, with the rows between them.

- **The fourth row is the one that corrects an inversion, and it is worth
  naming as one** (C-32b). Rows two and four are about the same
  directory and pull in opposite directions: row two enumerates every
  `.claude/hooks/` script and states plainly that **nothing registers
  it**, while through v2.3 nothing at all was said about the `tools:`
  list on every agent file the same apply writes. The disclosure named
  what cannot run and omitted what does. Row four is **disclosed, not
  gated**, on C-28's terms exactly — all three packs use it, forbidding
  it deletes the feature, and a subagent's tool list still runs under a
  permission engine the pack cannot touch.
- **At v2.5 the row prints the whole frontmatter block, and the widening
  is the fix rather than a nicety** (C-40). Printing `tools:` alone
  reproduced the same inversion one key over: `permissionMode` is on the
  same line-block, three `coding` agents declare it, and a widening value
  would have been shown nowhere. The whole block is the **cheapest
  correct form** of "print every permission-bearing key" — a chosen
  subset has to be re-audited whenever the runtime's contract moves,
  which is precisely the maintenance failure §F1.9 records for the pin.
  A test asserts it by applying `coding` and requiring the pre-write
  summary and `pack info` to name **all ten** agents with their
  frontmatter verbatim — including **`Bash` on two of them**
  (`implementer` and `testwriter`, C-45), `researcher`'s
  `WebSearch, WebFetch`, and **`permissionMode: readonly` on
  `architect`, `reviewer` and `securityreviewer`** (C-40).

- **The disclosure enumerates and never gates**, which is now true of the
  whole of it rather than of two thirds of it. It is built **once**, by
  the pure planner, and rendered by three surfaces — `init`'s pre-write
  summary, `pack info` and `validate --json` — from that one builder, so
  the three cannot disagree. A test may assert the single-builder
  property structurally, and may assert the content by applying `coding`
  and requiring the summary to name **all five** applied paths at which a
  parameter answer was substituted, each with the verbatim answer (C-43,
  US-16).
- Before writing, a **journal (version 3)** is written to
  `.harness/journal.json` and flushed. It records **which command wrote
  it** (`"command": "init" | "update"`) and, per intended path: an
  **`intent`** of `"write"` or `"delete"`, the
  hash this apply intends to write, **`preExisting`**, the **pre-apply
  hash** and **pre-apply mode** (both `null` when the path did not
  exist), and a **`backup`** path under `.harness/journal.d/` holding the
  pre-apply bytes. A backup is written **before** the overwrite and is
  present exactly when `preExisting` is true and the pre-apply hash
  differs from the intended hash, so only a genuine overwrite pays for
  one. The journal also records the directories the apply created, in
  creation order, and covers **both phases** — the payload copy is
  journalled exactly as phase-2 output is.
- A journal declaring any `version` other than `3` is
  **`E-JOURNAL-UNREADABLE`**, exit 2 — the fail-closed rule of US-1
  applied to the journal. **There is no version-2 journal to be
  compatible with**: a journal exists only between the start and the end
  of a single run, so the only reader of a version-2 journal would be a
  CLI recovering a crash that happened under a CLI that no longer exists.
- **`intent` exists because `update` deletes** (Q-62). A payload path
  that the newer pack no longer ships is removed, and the five-case
  rollback table below models overwriting and creating but **not
  deleting** — rolling back a delete means restoring from `journal.d/`
  with no intended hash to compare against. An `intent: "delete"` entry
  records `preExisting: true`, the pre-apply hash and mode, and a
  `backup`, and **has no intended hash**; rollback restores it
  unconditionally. `init` writes `intent: "write"` on every entry, so the
  field is uniform rather than optional.
- **The journal records its command because the remedy depends on it.**
  `E-JOURNAL-PRESENT` directs the user to `--rollback`, and through v2.9
  it named `init --rollback` unconditionally — which, after a crashed
  `update`, sends the user to a command that answers `E-ALREADY-APPLIED`
  and leaves the journal exactly where it was. The remedy line is
  rendered from the recorded command.
- **Each write re-confines and creates exclusively** (C-14).
  `executeApply` re-runs US-3's stage 3 **immediately before each write**,
  because the plan's `lstat` is stale by the time the write happens:
  - the temp file is created with exclusive semantics
    (`open(tmp, 'wx', mode)`), so a pre-placed temp name cannot be
    written through;
  - a destination the plan expects to be **new** is claimed by
    `link(tmp, dest)` then `unlink(tmp)` — `link` fails `EEXIST` if the
    destination appeared in the window, which is the exclusive-create
    semantic `rename` does not give. Where `link` is unavailable
    (`EPERM`/`ENOSYS`), the fallback is claim-with-`open(dest,'wx')` then
    `rename`, and the run's diagnostics record the narrowed guarantee
    rather than claiming the stronger one;
  - a destination the plan expects to **exist** — at v1.0 this is a
    `--force` byte-identical path and nothing else, since no primitive
    writes into a file it did not place — is `lstat`ed, confirmed a
    regular file, re-hashed, and confirmed still equal to what the plan
    observed, before the `rename`. **Where the on-disk basename differs
    from the planned one, the `rename` does not happen at all** (C-36):
    the `lstat` and the re-hash still run, so a file that changed in the
    window is still `E-TARGET-RACE`, but a confirmation that succeeds is
    followed by no write rather than by a `rename` that would replace the
    directory entry.
  - Any of those confirmations failing is **`E-TARGET-RACE`**, exit 2.
    The run stops with the journal in place and is recoverable by
    `--rollback`.
- If the process dies mid-write, the journal survives. The next
  `lintel harness` command in that project detects it and fails with
  `E-JOURNAL-PRESENT`, offering `lintel harness init --rollback`.
- **`--rollback` deletes only paths this apply created, restores only
  paths this apply overwrote, and acts on neither unless the on-disk bytes
  are still exactly what this apply wrote** (C-13). The five cases are
  exhaustive:

  | `preExisting` | pre-apply hash | on-disk hash now | Rollback |
  |---|---|---|---|
  | false | — | = intended | **delete** — we created it and it is still ours |
  | false | — | ≠ intended | **keep**, and report `W-ROLLBACK-KEPT` — the user edited it after the crash |
  | true | = intended | = intended | **leave untouched**, report as kept — this is the `--force` byte-identical case; the file was already correct and was never ours. The row is judged against the **on-disk path the journal recorded** (C-36), which is the on-disk spelling where it differed from the planned one, so "leave untouched" leaves the entry named as the user had it |
  | true | ≠ intended | = intended | **restore from `backup`**, report as restored |
  | true | any | ≠ intended | **keep**, and report `W-ROLLBACK-KEPT` — the user edited it after the crash |

- Directories the apply created are removed in **reverse creation order**,
  and only when empty. Rollback then removes `.harness/`, and reports
  every path it declined to touch and why.
- The journal and `.harness/journal.d/` are removed only after the
  manifest is successfully written; the manifest write is the last write
  of an apply.

---

**US-14 — Re-run init without surprises**
> As a project owner, I want re-running `lintel harness init` in an
> already-applied project to be a defined operation so that I do not
> destroy work by repeating a command.

**Acceptance criteria:**
- `init` in a project that already has a `.harness/` directory fails with
  `E-ALREADY-APPLIED`, exit 1, **zero bytes**, and names the applied pack
  and version when a manifest is readable. Nothing is written. This is
  the first branch of the flow in `pack-application.md` and it precedes
  every other check.
- The one exception is a `.harness/` holding a journal from a crashed
  apply, which is `E-JOURNAL-PRESENT` instead (US-13) and directs the
  user to `--rollback`.
- **`init` never re-applies in place, and `update` is the command that
  does** (Q-62). `E-ALREADY-APPLIED` is not a statement that moving an
  applied project to a newer pack is unsupported — it is v1.0 and it is
  F3's — but that **`init` is not the command for it**. `--force` affects
  only the pre-existing-path rule of US-13 and never overrides
  `E-ALREADY-APPLIED`.
- Applying the same pack twice into two empty directories with identical
  answers and scaffolds produces **byte-identical trees and
  byte-identical manifests**. A test may assert this by recursive
  byte-comparison of the two directories, with no exclusions.
- Determinism holds across platforms: the two trees are identical on
  macOS, Linux and Windows, modulo the executable bit, which Windows does
  not represent.

---

**US-15 — Behave predictably when the manifest is unusable**
> As a project owner, I want clear behaviour when the manifest is
> missing, corrupt or newer than my CLI so that the tool never guesses
> about state it cannot read.

**Acceptance criteria:**
- **Missing.** `verify` fails with `E-MANIFEST-MISSING`, exit 1, and
  names `lintel harness init`. No attempt is made to infer the pack from
  the file tree — that was `--adopt`, and it is dropped (Q-44).
- **Missing, but `.harness/pack/` present.** Same code. A payload with no
  manifest is a crashed or hand-made state, and the CLI reports it rather
  than reconstructing an answer set it cannot know.
- **Corrupt** (unparseable JSON, or failing schema validation):
  `E-MANIFEST-CORRUPT`, exit 2, naming the parse position or failing key.
  The CLI does not attempt repair and does not overwrite the file.
- **Duplicate key.** The manifest is read by the same strict reader as
  `pack.json` and `recipe.json` (US-1, C-25): a key declared twice at any
  depth is **`E-JSON-DUPLICATE-KEY`**, exit 2, naming the key and both
  line numbers, and **not** `E-MANIFEST-CORRUPT` — one fault, one code,
  wherever it occurs. The manifest is the **user's own** committed file,
  and the reason applies to it exactly as it does to a pack: a file that
  a reviewer reads one way and the CLI runs another is not reviewable.
- **Missing or malformed `payloadDigest`.** All six keys are required at
  `manifestVersion` 1, so a manifest without `payloadDigest`, or with one
  that is not `sha256-<64 lowercase hex>`, is `E-MANIFEST-CORRUPT`, exit
  2. **There is no "digest absent, so skip the check" branch**, and its
  absence is the point: that branch is the one anybody defeating the
  check would take. A test may assert this by deleting the key and
  requiring exit 2 with no per-path report.
- **Hand-edited but valid.** Undetectable, and deliberately so: the
  manifest carries no self-integrity field (§Technical Context). The
  practical consequence is bounded — v1.0 never merges against the
  manifest — and it is caught where it matters: a hand-edited answer set
  makes the recomputed tree differ from the tree on disk, which is
  exactly what `verify` reports (US-33). Recorded answers are
  re-validated against their declared `pattern`, `maxLength` and `values`
  on every read (US-8), so a hand-edited answer that breaks its own
  declaration is **`E-MANIFEST-ANSWER-INVALID`, exit 2** — not
  `E-PARAM-INVALID`, which is exit 1 and belongs to the occasion where a
  user typed the value and can retype it (C-29).
- **Newer manifest version.** `manifestVersion` greater than the CLI's
  supported version fails every command with `E-MANIFEST-NEWER`, exit 2.
  This is never a warning.
- **Newer CLI recorded.** `cli` newer than the running CLI, at the same
  `manifestVersion`, is a warning (`W-MANIFEST-NEWER-CLI`) and commands
  proceed.
- **Forward compatibility.** Within one `manifestVersion`, unknown keys
  found in the manifest are preserved verbatim on rewrite, so an older
  CLI does not discard a newer one's data.
- **Newer pack than installed.** A recorded `pack.version` newer than any
  pack bundled with the running CLI is a warning
  (`W-PACK-NEWER-THAN-CLI`) suggesting a CLI upgrade. `verify` still
  runs, because it needs only `.harness/pack/` and the manifest.

---

**US-16 — Validate a pack before it ships**
> As a pack author, I want one command that checks a pack against every
> rule in this spec so that a malformed pack is caught in CI rather than
> in a user's project.

**Acceptance criteria:**
- `lintel harness validate <pack>` (and `validate --all`) runs the checks
  in the fixed order below, so a pack fails on the earliest and most
  explicable cause rather than on whichever check happens to run first.
  The order is part of the contract:

  ```
  1   pack.json schema           + E-JSON-DUPLICATE-KEY (strict parse, first),
                                   E-UNKNOWN-VALUE (the fail-closed value rule
                                   AND the boolean-typing rule, US-1)
  2   anatomy completeness       + E-ANATOMY-SOURCE-ON-ABSENT (US-2)
  3   payload integrity            E-PAYLOAD-PATH-INVALID, E-SYMLINK-IN-PACK,
                                   E-CONTENT-TOO-LARGE, E-PAYLOAD-TOO-LARGE,
                                   E-TRAVERSAL-LIMIT (US-30),
                                   E-CLAUDE-TOOL-GRANT and
                                   E-CLAUDE-PERMISSION-MODE over the PHASE-1
                                   PAYLOAD SET (US-3, C-39c, C-40)
  4   recipe schema              + E-JSON-DUPLICATE-KEY (strict parse, first),
                                   E-UNKNOWN-VALUE (boolean typing, US-1),
                                   E-RECIPE-MISSING, E-RECIPE-INVALID,
                                   E-RECIPE-FORMAT-NEWER, E-RECIPE-TOO-MANY-STEPS,
                                   E-RECIPE-PRIMITIVE-UNKNOWN, E-RECIPE-STEP-INVALID
  5   step sources                 E-RECIPE-SOURCE-MISSING (US-3, US-31) —
                                   over `from` AND over `generate`'s `template`
  ── the WRITE SET is computed here, after 5, PER COMBINATION, and its
     UNION is consumed by 6, 7 and 8 ──
     (This said "computed once" until v5.7, and read as one set merged
      across `when` branches it is **wrong on a shipping pack**:
      `planning`'s two calibration copies both write `portfolio/` from
      directories holding identical basenames, so a merged set reports
      three `E-MAP-COLLISION`s against a **correct** pack. The same false
      finding `checkScaffoldCollisions` avoids by skipping same-category
      pairs, for the same reason — two things that can never both apply do
      not collide. The grammar and the denylist are per-path facts, so the
      union answers 6, 7 and 8 exactly; only the collision rules need the
      per-combination split.)
  6   destination safety         → US-3 stages 1 and 2, over every step's WRITE SET:
                                   E-MAP-PATH-GRAMMAR, E-MAP-RESERVED-DEST,
                                   E-MAP-COLLISION, E-MAP-CASE-COLLISION,
                                   E-MAP-NORM-COLLISION
  7   executable declarations      E-EXEC-ROOT-UNDECLARED, E-EXEC-DEST-FORBIDDEN,
                                   E-EXEC-TOO-MANY
  8   hook-script disclosure       W-HOOK-SCRIPT-INERT (US-3) — class notice
  9   parameter declarations       E-PARAM-NO-PATTERN, E-PARAM-PATTERN-INVALID,
                                   E-PARAM-SECRET-SUSPECTED, E-PARAM-UNDECIDABLE,
                                   E-PARAM-FLAG-INVALID
  10  scaffold declarations        E-SCAFFOLD-COLLISION, and E-RECIPE-STEP-INVALID
                                   for a pack.json/recipe.json scaffold mismatch
  11  per-combination render     + E-REWRITE-UNUSED, E-SUBST-UNRESOLVED,
                                   E-SUBST-NEWLINE, E-ANCHOR-INVALID,
                                   E-PARAM-COMBINATORICS,
                                   E-CLAUDE-TOOL-GRANT and
                                   E-CLAUDE-PERMISSION-MODE over the WRITE SET
                                   (US-3, C-32a, C-40)
  12  folder READMEs (Q-50)        W-FOLDER-README-MISSING — class defect,
                                   per parameter combination (below)
  13  link integrity               W-LINK-DANGLING — class defect (below)
  14  disclosure                 build the security disclosure over all combinations
  ```

- **The order is still fourteen steps and nothing is renumbered**, which
  matters because the numbers are cited in US-3, §F1.3, §Technical
  Context and the `W-FOLDER-README-MISSING` row, and because F5 and the
  master spec cite them too. Two steps change what they contain rather
  than where they sit:
  - **Step 8 was "destination policy" and is now "hook-script
    disclosure".** Its three errors — `E-OWNEDKEY-FORBIDDEN`,
    `E-SETTINGS-MODE-FORBIDDEN` and `E-MERGE-JSON-INVALID` — are deleted
    with `merge-json` (Q-54); the destination policy they enforced does
    not exist, because the destinations it policed are now unwritable
    outright at step 6. `W-HOOK-SCRIPT-INERT` was always in this step and
    is what remains of it. The step is **kept rather than removed**
    deliberately: renumbering a contract to save one slot trades a real
    cost across four documents for no gain, and a v1.1 reinstating a
    destination policy needs this slot back in this position.
  - **Step 11 loses `E-SUBST-IN-SECURITY-KEY`**, whose subject is gone
    (US-4).
- **v2.5 adds one code and one quantifier and renumbers nothing.**
  `E-CLAUDE-PERMISSION-MODE` (C-40) joins `E-CLAUDE-TOOL-GRANT` wherever
  that code runs, because it is the same rule at a second key family.
  **Both codes now run at two steps over two disjoint sets**: step 11
  over the **write set**, on rendered content, and step 3 over the
  **phase-1 payload set**, on payload bytes (C-39c). The second placement
  is at step 3 rather than step 11 because it needs no write set, no
  render and no parameter combination — the payload is the payload in
  every combination — and because it belongs with the other checks that
  are about what a pack *contains* rather than what it *does*. The runner
  is still **fourteen steps**; the numbers cited in US-3, §F1.3,
  §Technical Context, §F1.6, F5 and the master spec are unchanged.
- **v2.4 adds one code to step 11 and renumbers nothing.**
  `E-CLAUDE-TOOL-GRANT` (C-32a) belongs at step 11 and not at step 6,
  and the placement is a requirement rather than a convenience: the rule
  is about **rendered** content, and step 11 is where rendered content
  first exists. A `substitute` or `rewrite-path` acting on a file an
  earlier step placed can change the bytes the runtime will read, so
  checking a payload source at step 6 would be checking bytes that are
  not the ones shipped. Step 11 already runs **per parameter
  combination**, which the check also needs — a conditional step may
  place a `.claude/commands/` file in one combination only. The runner is
  still **fourteen steps** and the numbers cited in US-3, §F1.3,
  §Technical Context, F5 and the master spec are unchanged.
- **The write set is computed exactly once**, immediately after step 5,
  and steps 6, 7 and 8 all read that one set. It is a **pure function of
  the pack** — no project, no filesystem — so `validate` remains
  runnable in CI against a pack alone, which is the property that makes
  the authoring-time checks the high-value half of the security model.

- **Stage 3 of US-3's confinement — resolution confinement — is not in
  this list**, and its absence is deliberate: `validate` has no project
  root to resolve. It runs at plan time and write time only. A pack is
  therefore validatable in CI without a target project, which is what
  makes the authoring-time checks the high-value half of the security
  model.
- **Step 12 — folder READMEs (Q-50).** For **each parameter combination
  separately**, `validate` takes the set of **proper directory prefixes**
  of every applied path that combination writes, removes the project root
  itself, and removes every prefix at or under `.claude/` or `.harness/`
  — both tool-owned and both excluded from Q-50. For each surviving
  directory `d` it requires the **same combination** to write the applied
  path `d/<folderReadme>`, where `<folderReadme>` is the basename US-1
  declares (default `README.md`). A directory with no such path is
  `W-FOLDER-README-MISSING`: **one diagnostic per directory per
  combination**, naming the directory, the expected basename and the
  combination. The check needs the per-combination path set step 11
  produces and needs no project, no filesystem and no target directory.
- **It is computed per parameter combination and never over the merged
  step set.** A step that creates a folder under one answer and a README
  step gated on a *different* answer both appear in the merged set, which
  would hide the gap; per combination the gap is visible. A test may
  assert this with a pack declaring two scaffolds, the folder step in one
  and its README step in the other, and require
  `W-FOLDER-README-MISSING` for the combination that selects only the
  first and no finding for the combination that selects both.
- **Step 12 over-approximates by construction, which is why it is a
  warning and not an error.** `validate` has no project root, so it
  cannot distinguish *a directory this apply creates* — which Q-50
  governs — from *a directory that already exists in the target project
  and into which this apply merely writes*, which Q-50 does not. An
  over-approximating check must not be fatal by code: a legitimate pack
  writing into a conventional pre-existing directory would be
  unshippable, and the remedy would be a `.gitkeep`-shaped placeholder,
  which is precisely what Q-50 exists to prevent. `--strict` gives the
  check teeth where the over-approximation is known to be empty — this
  repo's CI over the three bundled packs — which is why the CI criterion
  below is `--strict` and not bare `--all`.
- **What step 12 does not do**, stated so it is not assumed: it does not
  read what the folder README *says*, and it does not run at apply time.
  Q-50 is a content convention; step 12 makes its shape checkable, not its
  prose.
- It additionally performs a **link-integrity check**: every relative
  Markdown link and inline path reference in the rendered applied output
  that points at a path inside the project must resolve either to a file
  the recipe produces or to a path under `.harness/pack/` that exists in
  the payload. A dangling reference is `W-LINK-DANGLING`, listing file,
  line and target. The second half of that rule is new and load-bearing:
  under Q-41 the applied documents legitimately point *into* the payload,
  and a check that did not know that would flag every correct reference.
- Every check reports file and line where the concept has one.
- Exit code is **`0`** with no findings, **`0`** with **`notice`**-class
  findings only — under every flag, `--strict` included — **`1`** with
  `defect`-class warnings **and only under `--strict`**, and **`2`** with
  any error. **Q-60 changes no exit class**: a defect still exits `0`
  normally and `1` under `--strict`, and a notice never changes the exit
  code at all. What changed is **which warnings `--strict` promotes** —
  defects, never notices. A test may assert all three: a clean pack, a
  pack whose only findings are notices, and a pack with one defect, each
  run with and without `--strict`.
- **Every finding `validate` emits carries its class**, in the human
  output and in `--json` as a `class` field valued exactly `"defect"` or
  `"notice"`, so CI can count promotable findings without maintaining a
  code list of its own. A finding for a `W-` code that declares no class
  is emitted as `"defect"` (§Error States). A test may assert this by
  running `validate packs/planning --json` and requiring both of its
  findings to carry `"class": "notice"`.
- **`lintel harness validate --all --strict` is runnable in this repo's
  CI and exits `0` for all three v1.0 packs before release.** `--strict`
  and not bare `--all`: every warning in this document is non-fatal by
  code, so a bare `--all` would let the `defect`-class warnings —
  `W-FOLDER-README-MISSING`, `W-LINK-DANGLING`, `W-PATH-NON-NFC` and
  US-1's unknown-top-level-key warning — accumulate unnoticed. CI is the
  one place where step 12's over-approximation is known to be empty, so
  it is the one place a defect is made fatal. A test may assert this by
  running the CI command against the bundled packs and requiring exit
  `0`.
- **All three bundled packs can now reach exit `0` under
  `--all --strict`, and this sentence is the point of Q-60.** Through
  v2.5 two of the three could not, for reasons that were **design
  decisions rather than defects**: `planning` emits
  `W-ANATOMY-PROVISIONAL` because its role set is genuinely unwritten and
  the pack says so with a note (US-2, F5), and `W-HOOK-SCRIPT-INERT`
  because its guard script is inert *precisely because* no pack may
  register an agent hook at v1.0 (US-3). **Both are `notice` class**, so
  `--strict` does not promote them, both still print on every run, and
  `planning` exits `0`. `coding`'s remaining finding was a **real
  `defect` and is fixed rather than reclassified**: step 12 quantifies
  over **proper** directory prefixes, so the intermediate
  `infrastructure/` was a directory a backend combination creates and no
  step wrote it a README — each backend scaffold now places
  `applied-readmes/infrastructure.md` there (§F1.3). `writing` was
  already clean. A test may assert the whole claim in one run: `validate
  --all --strict` exits `0`, and `--json` reports at least two findings,
  every one of them `"class": "notice"`.

**Adversarial fixture packs are a shipping requirement, and this is the
most important criterion in this story.** A fixture directory of
deliberately malicious packs, each asserted to fail with a **named
code**, is run by `validate` in CI alongside `--all --strict`. The reason
is recorded rather than assumed: the settings-write finding that
triggered this amendment was reachable in **two recipe steps** and
survived a full rewrite plus two rounds of a disposition table that
declared the conditions satisfied. **A fixture would have caught it on
the first CI run; no amount of table-reading did, twice.** A condition
whose only evidence is a table row is a condition nobody has tested.

- Each fixture is a minimal pack. CI asserts the **exact code** and the
  **exit class**, not merely non-zero: a fixture that fails for the wrong
  reason has stopped testing what it was written for.
- **The minimum set is decided, not left to taste.** It is the closed
  attack list of this version, one fixture per row:

  | Fixture | Required outcome |
  |---|---|
  | `copy` whose `to` is `.claude/settings.json` | `E-MAP-RESERVED-DEST`, exit 2 |
  | `rename` whose `to` is `.claude/Settings.json` (case variant) | `E-MAP-RESERVED-DEST`, exit 2 — the `collisionKey` match |
  | `generate` whose `to` is `.claude/settings.local.json` | `E-MAP-RESERVED-DEST`, exit 2 |
  | `copy` of a directory whose recursion produces `.claude/settings.json`, with no step naming it | `E-MAP-RESERVED-DEST`, exit 2 — the by-any-route property |
  | `copy` whose `to` is `package.json` | `E-MAP-RESERVED-DEST`, exit 2 |
  | `substitute` whose `in` glob is `[".claude/settings.json"]` | `E-RECIPE-STEP-INVALID`, exit 2 — nothing writes it, so it is not in the written-set |
  | `rewrite-path` whose `in` glob is `[".harness/pack/**"]` | `E-RECIPE-STEP-INVALID`, exit 2 |
  | a step whose `to` is `.harness/README.md` | `E-MAP-RESERVED-DEST`, exit 2 |
  | `copy` whose `to` is `.git/hooks/pre-commit` with `"executable": true` | `E-MAP-RESERVED-DEST` **and** `E-EXEC-DEST-FORBIDDEN`, exit 2 — two independent faults |
  | `"op": "copy "` (trailing space) | `E-RECIPE-PRIMITIVE-UNKNOWN`, exit 2 — the literal-match rule of US-31 |
  | `pack.json` declaring `"name"` twice | `E-JSON-DUPLICATE-KEY`, exit 2 |
  | `recipe.json` declaring `"formatVersion": 999` | `E-RECIPE-FORMAT-NEWER`, exit 2 |
  | a recipe declaring **257** steps across base plus scaffolds | `E-RECIPE-TOO-MANY-STEPS`, exit 2 |
  | a payload file shipped `0755` | applies cleanly, and its `.harness/pack/` copy is **`0644`** (US-30) — asserted on the mode, since there is no code |
  | a symlink in the pack | `E-SYMLINK-IN-PACK`, exit 2 |
  | a target directory holding `.claude/Agents/README.md`, applied by a pack writing `.claude/agents/README.md` | `E-TARGET-EXISTS`, exit 1, zero bytes (N-5) — the one fixture that needs a target directory |
  | **the same fixture re-run with `--force` and byte-identical content** | the write is **skipped**, the journal records `.claude/Agents/README.md`, and the directory entry is still named **`Agents`** afterwards (C-36) — asserted on the on-disk name, since there is no code |
  | `copy` whose `to` is `.github/workflows/ci.yml` | `E-MAP-RESERVED-DEST`, exit 2 (C-31) — a workflow runs attacker-chosen code on the next push with `GITHUB_TOKEN` |
  | `copy` whose `to` is `.vscode/tasks.json` | `E-MAP-RESERVED-DEST`, exit 2 (C-31) |
  | `copy` whose `to` is `.envrc` | `E-MAP-RESERVED-DEST`, exit 2 (C-31) |
  | `strip-suffix` whose recursion **produces** `.github/workflows/x.yml`, with no step naming it | `E-MAP-RESERVED-DEST`, exit 2 (C-31) — the by-any-route property, proved on class 2's new entries and not only on the settings files |
  | `copy` whose `to` is `docs/.git/hooks/pre-commit` | `E-MAP-RESERVED-DEST`, exit 2 (C-33) — the any-segment property; under v2.3's first-segment scoping this passed |
  | `.claude/commands/x.md` whose frontmatter declares `allowed-tools:` | `E-CLAUDE-TOOL-GRANT`, exit 2, zero bytes (C-32a) |
  | a step declaring `"executable": "false"` | `E-UNKNOWN-VALUE`, exit 2, nothing written (C-34) — the string is **truthy**, so under v2.3 this read as `true` |
  | a parameter declaring `"notASecret": "no"` | `E-UNKNOWN-VALUE`, exit 2, nothing written (C-34) — under v2.3 this disabled the credential ban |
  | `generate` whose `template` names nothing in the payload | `E-RECIPE-SOURCE-MISSING`, exit 2 (C-38) |
  | `copy` whose `to` is `docs/.claude/settings.json` | `E-MAP-RESERVED-DEST`, exit 2 (C-39a) — the any-`.claude`-segment property; under v2.4's two-exact-paths reservation this passed every stage |
  | `strip-suffix` whose recursion **produces** `sub/.claude/settings.local.json`, with no step naming it | `E-MAP-RESERVED-DEST`, exit 2 (C-39a) — the same property proved by route rather than by name |
  | `copy` whose `to` is `docs/.claude/hooks/x.sh` with `"executable": true` | `E-EXEC-DEST-FORBIDDEN`, exit 2 (C-39b) — and **not** `E-MAP-RESERVED-DEST`: shipping an inert file under `.claude/hooks/` is permitted, carrying `0755` there is not. Under v2.4's first-segment scoping this was refused by neither list |
  | `copy` whose `to` is `pkg/node_modules/.bin/foo` | `E-MAP-RESERVED-DEST`, exit 2 (C-39d) — nested `node_modules/` is real under npm workspaces, and `verify`'s scan skips it at any depth |
  | a pack whose **payload** contains `.claude/commands/x.md` declaring `allowed-tools:`, named by no recipe step | `E-CLAUDE-TOOL-GRANT`, exit 2, zero bytes (C-39c) — the phase-1 quantifier. Under v2.4 this landed at `.harness/pack/.claude/commands/x.md` inside the committed project, unchecked and undisclosed |
  | `.claude/agents/x.md` declaring `permissionMode: bypassPermissions` | `E-CLAUDE-PERMISSION-MODE`, exit 2, zero bytes (C-40) — a widening mode value |
  | `.claude/agents/x.md` declaring `permissionMode: notAMode` | `E-CLAUDE-PERMISSION-MODE`, exit 2 (C-40) — an **unrecognised** value fails closed, on US-1's rule |
  | `.claude/commands/x.md` declaring `permissionMode: readonly` | `E-CLAUDE-TOOL-GRANT`, exit 2 (C-40) — a non-widening value in the wrong file kind: only an **agent** file may select a mode |
  | `copy` whose `to` is `.mcp.json` | `E-MAP-RESERVED-DEST`, exit 2 (C-41) — MCP servers are declared as command lines the runtime launches; this is the execution route nearest the ones class 2 already named |
  | one `copy` fixture per remaining new class-2 **basename**: `.gitlab-ci.yml`, `Jenkinsfile`, `azure-pipelines.yml`, `bitbucket-pipelines.yml`, `GNUmakefile`, `.justfile` | `E-MAP-RESERVED-DEST`, exit 2, **six fixtures** (C-41) — one per row of the table, which is the obligation US-3 states for adding an entry |
  | one `copy` fixture per new class-2 **name**, each at a **nested** segment: `x/.circleci/config.yml`, `x/.devcontainer/devcontainer.json` | `E-MAP-RESERVED-DEST`, exit 2, **two fixtures** (C-41, C-39d) — nested deliberately, so the fixture tests the quantifier as well as the membership |

- **Two positive assertions, because this version's disclosure
  requirements cannot be tested by a failure code**, replacing the three
  of v2.4 — the first absorbs two of them. Both apply the real `coding`
  pack and assert on the pre-write summary and on `pack info`, which
  render from the one builder:
  - **`agentInstructionSubstitutions` names exactly five applied paths**
    (C-43) — `CLAUDE.md`, `AgentTeams/Specify.md`,
    `AgentTeams/Implement.md`, `specifications/README.md` and
    `specifications/project-brief.md` — each with its parameter id and
    the answer **verbatim**, and **`AgentTeams/README.md` is asserted
    absent**. Asserting the count *and* the membership *and* one
    exclusion is the only shape that fails when the rule is wrong: the
    v2.3 test asserted `CLAUDE.md` alone and passed under a classifier
    that missed two paths; the v2.4 test asserted three and passed under
    one that missed two more.
  - **the disclosure names all ten `coding` agents with their whole
    frontmatter blocks verbatim** (C-32b, C-40, C-45), which must include
    `Bash` on **two** of them — `implementer` and `testwriter` —
    `researcher`'s `WebSearch, WebFetch`, and `permissionMode: readonly`
    on `architect`, `reviewer` and `securityreviewer`; **and four**
    `0755` applied paths in a backend combination and **none** in the
    base combination (C-38, C-12).

- **The set grows with the rules, and that is the obligation.** Any
  amendment adding a destination rule, a closed enumeration or a
  fail-closed parse adds its fixture **in the same change**. A rule whose
  fixture arrives later is a rule that shipped untested.

---

**US-29 — See what a pack contains before applying it**
> As someone deciding which pack to apply, I want one command that
> describes a pack — its identity, its nine anatomy parts, its scaffolds,
> its parameters and everything its recipe would do — so that I adopt it
> knowing what it does and does not give me.

**Acceptance criteria:**
- `lintel harness pack info <name>` exists and is an **F1** command. It is
  defined as `renderPackInfo(report)` over the **same** `PackReport`
  structure `validate --json` emits, so there is exactly one report code
  path and the two surfaces cannot disagree.
- It prints: pack `name`, `version`, `title`, `formatVersion` and
  `minCliVersion`; all nine anatomy parts in fixed order with
  `present | provisional | absent` and, for `provisional` its `note` and
  for `absent` its `reason`; the available scaffolds with `id`,
  `category`, `description` and step count, with same-category scaffolds
  grouped and labelled as alternatives; and the declared parameters
  including any `flag` alias and, for an `enum`, its permitted values.
- **It renders the recipe as a human-readable plan**: every step, in
  order, as `<op>  <from> → <to>`, with conditional steps marked by their
  `when`. This is what "a pack can only do what the primitives allow"
  buys the reader — the complete list of what an apply will do, before it
  does it, without running anything.
- **It renders the pack's security disclosure, in full and verbatim**
  (C-12, C-28, C-32b), over the same structure `init`'s pre-write summary
  uses:
  - **every applied path the pack would write `0755`**, with the payload
    path it comes from — for `coding` this is **four** paths under
    `infrastructure/backend-deploy/` in a backend combination and none in
    the base combination (C-38, §F1.3);
  - **every pack-shipped `.claude/agents/*.md` with its whole frontmatter
    block**, verbatim, one per line, never summarised and never
    counted (C-32b, C-40). For `coding` this is **ten** blocks: **two**
    declare `Bash` (`implementer`, `testwriter`), one declares
    `WebSearch, WebFetch` (`researcher`) and **three** declare
    `permissionMode: readonly` (`architect`, `reviewer`,
    `securityreviewer`) — C-45. The `tools:` list is disclosed and
    **not** gated, on C-28's
    reasoning: it is a request the subagent makes underneath a
    permission engine the pack cannot write to (US-3 stage 2), not a
    grant the pack issues. **`permissionMode` is disclosed *and*
    bounded** — only a pinned non-widening value is permitted
    (`E-CLAUDE-PERMISSION-MODE` otherwise, US-3), because a mode key
    selects that engine's mode rather than running underneath it;
  - **every file the pack ships under a `hooks/` directory in any
    `.claude` tree** (C-39), each stated
    plainly as inert — shipped, `0644`, and registered by nothing at v1.0
    (US-3), so a reader is not misled into thinking it runs;
  - **every applied path at which a parameter answer is substituted**, in
    **any** parameter combination — the applied path, the parameter id
    and the **value verbatim**, one per line, **never summarised, never
    truncated and never counted** (US-4, C-28, C-43). For `coding` this
    is **five** paths; there is no classifier deciding which qualify,
    because the enumeration is total (C-43).
  Where a list is empty the command **says so** rather than printing
  nothing. It renders **no settings section and no consent prompt**: no
  v1.0 pack can write `.claude/settings.json` (US-3 stage 2), so there is
  no owned key to disclose and nothing to consent to (Q-54).
- It reports `parameterVaryingSteps` — the steps whose inclusion depends
  on an answer — and the applied paths each would write, which is how a
  reader sees what `--calibration high-floor` changes without running it.
- It reads the pack only. It writes nothing, needs no applied project, no
  manifest and no network request.
- For a pack that fails validation it reports the offending part as
  `missing` and exits with the same class as `validate` would. For a valid
  pack it exits `0`, or `1` under `--strict` with warnings only.
- `pack info <name> --json` emits the `PackReport` verbatim, so F6 and CI
  consume the structure rather than the rendering.

---

**US-30 — Copy the pack verbatim into the project**
> As a project owner, I want the whole pack to land in my project
> untouched so that every reference document the applied project points
> at is present, local and identical to what shipped.

**Acceptance criteria:**
- Phase 1 copies the pack directory to `.harness/pack/`, preserving the
  relative path of every file. `pack.json` and `recipe.json` are copied
  with everything else.
- **Every copied file is byte-identical to the pack file.** No rename, no
  substitution, no line-ending change, no BOM handling, no
  `.template`-suffix stripping, no region processing. A test may assert
  this by hashing the raw bytes of every file on both sides and requiring
  equality, with no normalization on either side.
- The mechanism is **identical for every pack**. Phase 1 reads no field
  of `pack.json` other than the pack's location, and consults the recipe
  not at all.
- Phase 1 **does not**: create any file outside `.harness/pack/`, read
  any parameter answer, evaluate any `when`, skip any payload file, **or
  preserve any source file mode**. The payload is not filtered by
  scaffold selection — an unselected scaffold's source still lands in the
  payload, because the payload is the pack, not the applied subset.
- **Phase 1 writes every payload file `0644` and every created directory
  `0755`, unconditionally, reading no source mode** (C-26). Three things
  follow, and the third is the reason:
  - `E-EXEC-DEST-FORBIDDEN` forbids a `0755` file under `.harness/`
    (US-3). The **fixed mode is what makes phase 1 satisfy that by
    construction**, rather than by a check phase 1 has no declaration to
    run: every clause of the executable-bit rule — a declared `to`, an
    `executable` field, a declared root, the cap of 32, a disclosure line
    — is written for a *recipe step*, and phase 1 is not one and has
    none of them. Left silent, a pack shipping a `0755` source file put a
    `0755` file under `.harness/` with no root, no cap, no disclosure and
    no diagnostic, and `payloadDigest` is content-only so `verify` was
    blind to it.
  - **The non-cost, stated so it is not re-litigated:** a pack's
    executable is made executable by the *recipe step that copies it
    out*, at the destination, under `executableRoots`. Nothing ever reads
    the payload copy's mode. Fixing it costs a pack nothing and keeps
    phase 1's strongest property — **it adds no decision surface**.
  - A test may assert it by shipping a `0755` file in a pack, applying,
    and requiring the `.harness/pack/` copy to be `0644` while the
    applied copy carries whatever its step declared.
- Phase 1 **does** validate, and only this:
  - **Path confinement.** Every payload-relative path satisfies the
    grammar of US-3 stage 1 (minus the trailing-slash rule), and the
    destination `.harness/pack/<relative>` is confined by the same
    resolution gate as any other write. A violation is
    `E-PAYLOAD-PATH-INVALID`, exit 2.
  - **No symlinks.** Any symlink under the pack directory is
    `E-SYMLINK-IN-PACK`, exit 2. Links are neither followed nor
    reproduced.
  - **Traversal bounds** (C-17). The walk is depth ≤ **32** and ≤
    **10,000 entries**, exceeding either being `E-TRAVERSAL-LIMIT`, exit
    2. Entries are `lstat`ed, never `stat`ed.
  - **Size bounds.** A single pack file > **4 MB** is
    `E-CONTENT-TOO-LARGE`; a total payload > **32 MB** is
    `E-PAYLOAD-TOO-LARGE`, both exit 2. The payload is copied into every
    project that applies the pack and committed there, so its size is a
    property users pay for.
  - **Permission-bearing frontmatter under a `.claude` segment**
    (C-39c, C-40). Every payload-relative path with a `.claude` segment
    is checked against US-3's frontmatter rule, on **payload bytes**:
    `E-CLAUDE-TOOL-GRANT` or `E-CLAUDE-PERMISSION-MODE`, exit 2, zero
    bytes, at US-16 **step 3**. **This is the one validation phase 1
    performs that is about content rather than paths, and it is here for
    the reason the rest of this story gives**: phase 1 copies the payload
    verbatim and "does not skip any payload file", so the bytes it writes
    *are* the bytes the runtime will read, and
    `.harness/pack/.claude/commands/x.md` is a live `.claude/` tree
    inside the committed project. Through v2.4 the frontmatter rule was
    quantified over the write set alone, and phase 1 is outside it — so a
    pack that named the file in no recipe step landed it unchecked and
    undisclosed. **It adds no decision surface**: the check reads no
    field of `pack.json`, consults no recipe, and is identical for every
    pack, which is the property this story exists to protect. No v1.0
    pack ships a `.claude/` directory in its payload, so the check costs
    them nothing.
- **`payloadDigest` is computed over the PLANNED payload set** — the
  file list phase 1 resolved in memory, with its planned contents —
  **not over whatever is on disk under `.harness/pack/` afterwards.**
  The digest is therefore known before the first byte is written, which
  is what keeps "everything is planned before anything is written"
  (US-13, §F1.6) literally true of the manifest as well, and it means a
  file that appears under `.harness/pack/` during the write window
  changes the tree without silently changing the record. The recorded
  digest is the assertion; `verify` is what tests it against the tree.
  A test may assert the ordering by requiring the planner to produce the
  manifest, digest included, with the filesystem mounted read-only.
- Every phase-1 write is journalled and rolled back exactly as a phase-2
  write is (US-13), and carries the `HarnessPath` brand rather than
  `AppliedPath` (US-3 stage 2). Phase 1 is not privileged; it is only
  simpler.
- **Nothing else in the product reads the bundled pack after phase 1.**
  The planner reads the bundled pack **exactly once**, and that read *is*
  the payload: `payloadDigest` is computed over it, phase 1 writes it
  verbatim, and phase 2 renders from **the same in-memory bytes**.
- **Phase 2 renders entirely at plan time, and `executeApply` reads
  nothing from disk** (C-23). `.harness/pack/` is phase 2's **logical**
  input — the tree that *defines* what phase 2 consumed, and the tree
  `verify` re-reads — and its **literal** input only at `verify`. Q-41 —
  *"phase 2 reads from the phase-1 copy in the project"* — fixes **which
  tree is authoritative**, not **the moment of the read**, and the
  alternative reading contradicts four authoritative statements, three of
  them Q-41's own: Q-41's recorded consequence that *the user cannot
  adjust the payload before phase 2 runs* (an execute-time read opens
  exactly that window, between step 10 and step 11 and between step 11's
  own writes); Q-40's *no environment reads* (a filesystem read at step
  *n* is one, and is ordering-dependent); `pack-application.md`'s *both
  phases … computed in memory*; and this story's own digest, which is
  over the **planned** set, so an execute-time read would consume bytes
  the manifest does not record with nothing re-hashing to notice.
- **The test that settles it, and it replaces the one this story used to
  carry.** The old test — *make the bundle unreadable between the phases
  and require the apply to complete* — **passes under both readings and
  therefore distinguishes nothing**: plan-time rendering never touches
  the bundle again, and execute-time re-reading would read
  `.harness/pack/`, not the bundle. The test that distinguishes them:
  **plan an apply, mutate `.harness/pack/<file>` after phase 1 and before
  phase 2 completes, and require the applied output to be byte-identical
  to an unmutated run.** Plan-time rendering passes; execute-time
  re-reading fails.
- **The cost, stated rather than glossed.** §NFR's *"phase 1 streams file
  by file and is not bound by the render budget"* ends **for the phase-2
  source set only** — any payload file a phase-2 step reads must be
  **held**, not streamed. It does not end for the rest, which is the
  great majority: templates, `conventions.md` and reference docs, which
  Q-47 keeps in the payload precisely so they are *not* copied out, still
  stream. The render budget therefore grows by the phase-2 source set,
  bounded by the same 4 MB / 32 MB payload caps and a small fraction of
  them.
- **If a future version wants execute-time reads**, a user-editable
  payload having been deferred rather than rejected, C-23's second clause
  is the price and is recorded here so v1.1 inherits it: **every
  execute-time read re-hashes against the planned content for that path,
  and a mismatch is `E-TARGET-RACE`, exit 2, journal intact.**
- **None of this licenses removing the destination-side re-checks.**
  `executeApply` still re-runs US-3 stage 3 immediately before every
  write, still creates exclusively, and still raises `E-TARGET-RACE`
  (US-13). Plan-time rendering removes a read of the **payload**; it
  removes nothing from the **destination** side, where the adversary is
  the filesystem rather than the payload.
- The user cannot inspect or modify the payload between the phases at
  v1.0. Both phases run inside one `init` invocation.

---

**US-31 — Apply a pack by a declared recipe, not by a script**
> As a project owner, I want everything a pack does to my project to be
> declared in advance over a fixed set of operations so that I can see
> what it will do before it does it, and so that no pack can do something
> the format did not anticipate.

**Acceptance criteria:**
- `recipe.json` carries `formatVersion` (integer), `steps` (an ordered
  array) and optionally `scaffolds` (an object mapping scaffold id to an
  ordered array of steps). It is parsed by the strict reader of US-1: a
  duplicate key at any depth is **`E-JSON-DUPLICATE-KEY`**, exit 2,
  before any other check on the file.
- **`formatVersion` greater than the CLI's supported *recipe*-format
  version fails with `E-RECIPE-FORMAT-NEWER`, exit 2, zero bytes; equal
  or lower proceeds** (C-24). This mirrors US-1's `pack.json` sentence,
  and it is a **different code** from `E-PACK-FORMAT-NEWER` because the
  file, the remedy and the version axis all differ — a user told to
  upgrade needs to know which of the two declarations was newer.
  `formatVersion` is one of US-1's six behaviour-selecting positions;
  before v2.3 the recipe declared a version that **no rule checked**,
  which is fail-open in the one position the closed-enumeration rule
  exists to close.
- Every step has an `op` naming exactly one of the **six primitives**:
  `copy`, `rename`, `strip-suffix`, `rewrite-path`, `substitute`,
  `generate`. **The set is closed.** An `op` outside it fails with
  **`E-RECIPE-PRIMITIVE-UNKNOWN`**, exit 2, listing the six verbatim and
  stating that a new step requires a new primitive in the CLI. There is
  no `exec`, no `script`, no `shell` and no escape hatch of any kind.
  **`merge-json` is not one of them** (Q-54): an `op` of `"merge-json"`
  is `E-RECIPE-PRIMITIVE-UNKNOWN` like any other unknown value, and the
  message says it is deferred to v1.1 rather than leaving an author to
  guess it was mistyped.
- **`op` is matched literally against that set** — no trimming, no case
  folding, no Unicode normalization (C-25). `"copy "` with a trailing
  space, `"Copy"` and `"ｃｏｐｙ"` are each `E-RECIPE-PRIMITIVE-UNKNOWN`,
  exit 2. A parser that trims is a parser that accepts a step a reviewer
  read as invalid.
- **The total declared step count is bounded at 256** across the base
  `steps` plus **every** declared scaffold, counted **before** any `when`
  filtering, because that is what `pack info` prints. Exceeding it is
  **`E-RECIPE-TOO-MANY-STEPS`**, exit 2, at validate time. **The bound is
  an inspectability control and not a DoS control**, and the distinction
  decides its value: there is no remote attacker here, and
  `E-PAYLOAD-TOO-LARGE` already bounds the bytes. What the bound protects
  is the argument this whole model rests on — a script primitive was
  rejected on the ground that `pack info` renders **the complete list of
  what an apply will do**, so that rendering *is* the control, and an
  unbounded list degrades it continuously while naming no point at which
  a reviewer should stop trusting it. **256 is raisable only by a
  superseding ADR**, not by a flag, an environment variable or a
  `pack.json` key. It is an order of magnitude above the largest v1.0
  pack (`planning`, **23** declared steps; `coding` declares **15**, and
  no scaffolds at all, since **Q-82** moved both backend kits to
  `addons/` — this said 21 until v5.3, a number that stopped being true
  the moment the scaffolds left and that F5 v3.1 had already corrected on
  its own side); lowering it wants evidence from
  real packs rather than taste.
- A step whose inputs are wrong for its `op` — a missing required field,
  a field the primitive does not take, a directory `from` on a
  file-only primitive, a compound `when` — fails with
  **`E-RECIPE-STEP-INVALID`**, exit 2, naming the step index, the `op`
  and the offending field.
- **A step may declare `adaptExpected`, which marks what it produces as
  *expected to be edited after the apply*** (Q-56). It is optional on
  every primitive, defaults to **`false`**, and is a **JSON boolean** —
  one of US-1's **five** boolean-typed fields, so `"adaptExpected": "true"`
  is `E-UNKNOWN-VALUE`, exit 2, zero bytes, with no coercion and no
  truthiness.
  - **It changes nothing about the apply.** The bytes written, the plan
    `pack info` prints, the disclosure `init` shows, the confinement
    gate, the collision rule and the recomputation of §F1.8 are all
    identical with and without it. It is consumed by **one** consumer,
    `verify`, and only to choose between two report states (US-33).
  - **The declaration is per step and lands on every applied path in
    that step's write set**, computed by §F1.2's write-set rule — the
    same quantifier every destination rule uses, and for the same reason:
    `rewrite-path` and `substitute` have no `to`, so a rule written over
    `to` would exempt exactly the two primitives that change a file's
    bytes after it was placed.
  - **The adapt-expected set is therefore a set of applied paths**,
    resolved at plan time from the recipe alone, and it is what US-33
    reports against. **A path outside it behaves exactly as it did before
    the field existed.** There is no pack-level, run-level or flag-level
    form of it: no `adaptExpected` in `pack.json`, no `--allow-drift`, no
    environment variable, and no way for a project to grant itself one.
  - A step declaring `"adaptExpected": true` whose write set is empty is
    **`E-RECIPE-STEP-INVALID`**, exit 2, on the same reasoning as an `in`
    that matches nothing: a declaration that covers no path is an
    authoring mistake, and silently accepting it is how a pack ends up
    believing it declared something it did not.
- **A step may declare `fillExpected`, which marks what it produces as
  *shipped to be filled in*** (Q-79). It is optional on every primitive,
  defaults to **`false`**, and is a **JSON boolean** — one of US-1's
  **five** boolean-typed fields, so `"fillExpected": "true"` is
  `E-UNKNOWN-VALUE`, exit 2, with no coercion and no truthiness. It takes
  the same per-step, write-set quantifier `adaptExpected` takes, for the
  same reason, and an empty write set is `E-RECIPE-STEP-INVALID`.
  - **It is not `adaptExpected` under another name, and the two are
    mutually exclusive on one step.** `adaptExpected` says *something
    else will rewrite this* — the skill adapting a generated
    `CLAUDE.md`. `fillExpected` says *this shipped incomplete, and the
    person who applied it is expected to finish it* — `project-brief.md`
    in every pack, `writing`'s voice guide. A step declaring both is
    **`E-RECIPE-STEP-INVALID`**, exit 2: a file is either the skill's to
    adapt or the user's to fill, and a step claiming both has not decided
    which.
  - **It changes nothing about the apply**, on the same enumeration as
    `adaptExpected`: the bytes written, the printed plan, the disclosure,
    the confinement gate, the collision rule and §F1.8's recomputation
    are identical with and without it.
  - **It has two consumers, not one.** `verify` uses it to choose among
    report states (US-33). **`update` uses it as a prohibition: it may
    never overwrite a path in the fill-expected set** — not when the
    bundled payload's version of that file has changed, not when the path
    is byte-identical to what shipped, and not under any flag. The rule
    is stated here rather than left to F3 because it is a property of the
    *declaration*, and a format whose declarations are honoured only by
    the feature that happens to read them is not a format. What `update`
    does **instead** of overwriting is F3's to state.
  - **Why the prohibition is absolute rather than conditional on the
    file having been filled.** A brief still at its placeholders and a
    brief filled in are indistinguishable to a rule that has to be right
    before it looks; the cost of over-applying it is that a user who
    never filled the brief keeps a stale template, which they can see and
    delete, and the cost of under-applying it is silently destroying the
    document every other document in the project is downstream of.
- A `recipe.json` that is unparseable, or whose top-level shape is wrong,
  fails with **`E-RECIPE-INVALID`**, exit 2.
- **Steps run in declared order**, base steps first, then the steps of
  each selected scaffold in `pack.json`-declared scaffold order. A step
  may read a file an earlier step wrote; it may not read a file a later
  step will write.
- **The recipe is a pure function of (payload, parameter answers,
  scaffold selection), at every applied path and with no exception.** It
  reads no clock, no environment variable, no network, no user, no
  hostname, no locale, and **no destination's pre-existing content**. No
  primitive emits a timestamp, an absolute path, a username or a random
  value. **The claim needs no exception clause because the primitive that
  would have required one does not ship** (Q-54): `merge-json` unioned
  declared keys onto whatever a destination already held, which made that
  prior content a **fourth input** — not in the identity, not in the
  manifest, and unrecoverable after apply. Every one of the six
  primitives writes a function of the three declared inputs alone.
- **Two applies of the same pack version with the same answers and
  scaffolds produce byte-identical trees.** This is testable directly and
  is the acceptance criterion the whole model rests on.
- Every applied path in a step's **write set** passes the four-stage
  confinement gate of US-3 — not merely its `to`, which two of the six
  primitives do not have. A step may not write under `.harness/` as a
  first segment; nor into any `.git`, `.hg`, `.svn`, `.github`,
  `.vscode`, `.idea`, `node_modules`, `.circleci` or `.devcontainer`
  directory **at any depth**; nor to a `settings.json` or
  `settings.local.json` under **any** `.claude` segment; nor to any file
  whose basename is `package.json`, `.envrc`, `.npmrc`, `.yarnrc.yml`,
  `Makefile`, `GNUmakefile`, `justfile`, `.justfile`, `.mcp.json`,
  `.gitlab-ci.yml`, `Jenkinsfile`, `azure-pipelines.yml` or
  `bitbucket-pipelines.yml` (US-3 stage 2, C-31, C-33, C-39, C-41). That
  list is a **denylist**, and US-3 says so; it is not a claim that
  nothing else is reachable. **One quantifier rule governs all of it**: a
  reserved *name* is reserved at every segment, and `.harness/` is the
  only *location* entry in this document.
- **A step's rendered output under a `.claude` segment may not declare a
  permission decision in frontmatter** (`E-CLAUDE-TOOL-GRANT` and
  `E-CLAUDE-PERMISSION-MODE`, exit 2, US-3, C-32a, C-40). This is the one
  content-shaped constraint on what a primitive
  may produce, alongside `generate`'s anchor assertion, and it exists
  because a command file's frontmatter is a pre-authorization and its
  `!`-prefixed body lines execute shell under it. **The same rule is
  checked a second time over the phase-1 payload set** (C-39c), which is
  not a step's write set and is therefore quantified separately: a
  `.claude/` subtree a pack merely ships lands inside the committed
  project at `.harness/pack/.claude/`.
- `pack info` renders the complete step list before an apply (US-29), and
  `validate` renders every parameter combination of it (US-16).

---

**US-32 — Generate a document with inert region anchors**
> As a project owner, I want a generated `CLAUDE.md` that a future
> `update` will be able to maintain, without paying for region machinery
> that nothing uses yet.

**Acceptance criteria:**
- **`generate`** — `{ "op": "generate", "template", "to", "anchors":
  [<id>, …], "when"?, "adaptExpected"?, "fillExpected"? }`. *(This line
  omitted `fillExpected` until v5.3 while §F1.2's table accepted it on all
  six primitives, so a reader taking this shape as the closed field list
  would have called a step invalid that the schema accepts. Not observable
  from any bundled pack — no `generate` declares it, and the
  mutual-exclusion rule means one never should while `adaptExpected` is
  set — which is exactly why only a document check finds it.)* It reads one payload template,
  resolves `{{harness:…}}` tokens in it exactly as `substitute` does,
  asserts the declared anchor set, and writes `to`. **`adaptExpected` is
  the general step field of US-31 and is not special to `generate`**; it
  is named in this shape because the `CLAUDE.md` step is the case that
  matters, and because every v1.0 pack sets it there (Q-56).
- **`template` must name a file in the payload**; naming nothing is
  **`E-RECIPE-SOURCE-MISSING`**, exit 2, at US-16 **step 5**, exactly as a
  missing `from` is on the other five primitives (US-3, C-38). It is the
  same code and not a new one, because it is the same fault at a
  differently-named field. A test may assert it with a fixture whose
  `generate` names `CLAUDE.md.templat`.
- An anchor is the literal pair of lines
  `<!-- harness:region id=<id> -->` and `<!-- harness:end -->`, written
  into the template by the pack author and carried through to the output
  unchanged. `<id>` matches `^[a-z][a-z0-9-]{0,31}$`.
- **Anchors are inert.** Nothing at v1.0 parses them, hashes them,
  merges into them or reports on them. They are text in a Markdown
  comment, present so that `update` has something to find (Q-62 —
  `update` is v1.0 and is F3's).
- The assertion `generate` performs is a **literal line count, not a
  grammar**: for each declared id, the exact anchor opening line must
  appear **exactly once** in the rendered output, and the number of
  `<!-- harness:end -->` lines must equal the number of declared anchors.
  Failure is **`E-ANCHOR-INVALID`**, exit 2, naming the id and whether it
  was missing, duplicated or unbalanced.
- **What is explicitly NOT implemented** (Q-45): no region parser, no
  nesting rules, no fenced-code-block exemption, no per-region hash, no
  region ordering rule, no orphan handling, no malformed-marker
  diagnostics and no `E-REGION-TAMPERED`. A marker inside a fenced code
  block in a template will be counted by the literal scan, and a pack
  author who wants to *document* the anchor syntax must therefore not use
  a declared id in the example. That is a real limitation of a
  deliberately trivial check, and it is stated rather than engineered
  around.
- `generate` is the only primitive that asserts anything about a file's
  internal structure, and the assertion is one line of counting. If a
  pack needs no anchors it uses `rename` plus `substitute` instead.
- **All three v1.0 packs `generate` their `CLAUDE.md`, and each declares
  `"adaptExpected": true` on that step** (Q-56, Q-61). There are
  **three** `generate` steps across the bundled packs, one per pack. The
  claim this document carried through v2.6 — that `coding`'s was *the
  only* one — was **wrong**, and is corrected rather than narrowed:
  - **`coding`** — `CLAUDE.md.template` → `CLAUDE.md`, **six** anchors:
    `overview`, `layout`, `process`, `agents`, `conventions`, `targets`.
  - **`writing`** — `CLAUDE.md.template` → `CLAUDE.md`, **six** anchors:
    `overview`, `voice`, `layout`, `workflow`, `coordination`,
    `standing-instructions`.
  - **`planning`** — `CLAUDE.md.template` → `CLAUDE.md`, **seven**
    anchors: `overview`, `loop`, `gate`, `practices`, `conventions`,
    `roles`, `targets`.
  **Nineteen anchors across three templates, all built.**
- **`generate` is the only primitive that emits anchors**, which is why
  every pack uses it for `CLAUDE.md`. `rename` neither substitutes nor
  asserts anchors, so a pack whose `CLAUDE.md` arrived by `rename` would
  carry none — leaving two of the three packs with nothing for v1.1's
  `update` to find, against Q-45's entire reason for buying anchors and
  against F5 US-38, which asserts anchors for **every** pack. The two
  documents now agree.
- A test may assert this directly and cheaply over `packs/*/recipe.json`:
  exactly **three** steps with `"op": "generate"`, one per pack, each
  with `"to": "CLAUDE.md"`, each carrying `"adaptExpected": true`, with
  **6 / 6 / 7** declared anchor ids for `coding` / `writing` /
  `planning`, and each id matching `^[a-z][a-z0-9-]{0,31}$`.

---

**US-33 — Recompute the applied tree and check it**
> As a project owner, I want to be able to prove that what is in my
> project is what the pack and my answers say should be there, so that
> "applied correctly" is a checked fact rather than a claim.

**Acceptance criteria:**
- `lintel harness verify` reads `.harness/manifest.json` and
  `.harness/pack/`, re-runs phase 2 **entirely in memory**, and compares
  the result to the project on disk. It writes nothing, ever — including
  no lock and no journal.
- **The payload digest is checked FIRST, and the check is fail-closed.**
  `verify` recomputes the tree digest over `.harness/pack/` by the rule
  of US-10 and compares it to the manifest's `payloadDigest` **before it
  renders anything**. On a mismatch it fails with
  **`E-PAYLOAD-DIGEST-MISMATCH`**, exit 2, reporting the recorded and
  computed digests, and **the tree comparison is suppressed entirely** —
  no path is recomputed, and the per-path report is empty. That is not a
  convenience: the expectation `verify` would compare against is computed
  *from* the payload, so once the payload is untrusted the recomputation
  is meaningless and reporting it would dress an untrustworthy answer as
  a result. A test may assert this by changing one byte in a payload file
  and requiring exit 2, the digest code, and **zero** per-path rows.
- The two failures are distinct codes with distinct exit classes, and
  neither may be reported as the other: a payload that moved is
  `E-PAYLOAD-DIGEST-MISMATCH`, exit 2 (a pack or manifest integrity
  fault); an applied tree that moved under an intact payload is
  `E-VERIFY-MISMATCH`, exit 1 (a user may have edited a generated file
  deliberately). This is exactly what Q-52 buys: `verify` can say **which
  side moved**.
- The recomputation uses **only** `.harness/pack/` (payload and recipe),
  the manifest's `parameters` and the manifest's `scaffolds`. It does not
  read the bundled pack, does not use the network, and does not need the
  CLI that performed the apply to still be installed. This is the whole
  of Q-43's argument, made checkable.
- **The recomputation identity holds at every applied path, with no
  exception and no carve-out** (F-4, resolved by Q-54). The identity of
  §F1.8 —
  `expected_tree = phase2(payload, recipe, answers, scaffolds)` — was
  false at exactly one class of destination, and the class is gone.
  `merge-json` was the **only** primitive taking a fourth input, the
  destination's pre-existing content, which was in no manifest and
  unrecoverable after apply; at such a destination the union was
  **idempotent**, so a permission **added by hand after the apply**
  recomputed to itself and `verify` reported `match` — a verifier
  pronouncing a hand-added `permissions.allow` clean, which is worse than
  one that stays silent. Removing the primitive removes the input, the
  false report and the need to narrow anything. **The narrowing C-22
  asked for is therefore deliberately NOT applied**: there is no
  `partial` state, no `ownedKeysChecked` field, and no "except at a
  `merge-json` destination" clause anywhere in this document, because a
  scoped invariant is only better than an unscoped one when the unscoped
  one is false, and this one is true. A v1.1 that reintroduces the
  primitive reintroduces the exception **and** must reintroduce the
  narrowing with it — recorded in §F1.9.
- **A recorded answer that fails its own declaration stops the run.**
  `verify` re-validates every recorded answer against its declared
  `pattern`, `maxLength` and `values` **before** recomputing (US-8,
  C-29); a failure is **`E-MANIFEST-ANSWER-INVALID`**, exit 2, and the
  tree comparison is **suppressed** on the same reasoning as a digest
  mismatch: the expectation would be rendered from an input the manifest
  cannot vouch for.
- It reports **six** states per recomputed path: `match`, **`adapted`**,
  **`filled`**, **`unfilled`**, `differs` and `missing`. **Six, and the
  enumeration is closed.**
  Comparison is over normalized content for text (§NFR) and raw bytes for
  binary; a CRLF checkout on Windows and an added UTF-8 BOM both report
  `match`.
- **`adapted` — the path changed, and the pack said it would** (Q-56). A
  recomputed path whose on-disk content differs from the expectation is
  reported `adapted` **if and only if** it is in the **adapt-expected
  set**: the union of the write sets of the steps that declared
  `"adaptExpected": true` (US-31). `adapted` is **not a failure**, is
  **not** counted toward `E-VERIFY-MISMATCH`, and **does not affect the
  exit code**. A path in the set that still matches byte for byte is
  reported `match`, not `adapted` — the state names what `verify` found,
  never what it was permitted to find.
- **`filled` and `unfilled` — the path was shipped to be filled in**
  (Q-79). A recomputed path in the **fill-expected set** — the union of
  the write sets of the steps that declared `"fillExpected": true`
  (US-31) — is reported **`unfilled`** when it matches the expectation
  byte for byte, and **`filled`** when it differs. **Neither is a
  failure**, neither is counted toward `E-VERIFY-MISMATCH`, and neither
  affects the exit code.
- **The inversion against `adapted` is deliberate and is the reason there
  are two states rather than one.** For an adapt-expected path, matching
  is the unremarkable case and is reported `match`; for a fill-expected
  path, matching means **the user has not done the thing the pack asked
  of them**, which is the single most useful thing `verify` can tell a
  project owner and is invisible under `match`. Collapsing the pair into
  one state, or reusing `adapted` for both, would have restored exactly
  the ambiguity Q-56 split `differs` to remove — one state doing two
  jobs — one layer further out.
- **`unfilled` is a `notice`, never a `defect`** (Q-60), and `--strict`
  does not promote it. An unfilled template is a declared state of a
  freshly applied project, not an authoring fault; a `--strict` run that
  could never pass on a project the day it was created is the
  `validate --all --strict` mistake repeated.
- **This is what makes US-33's green run reachable.** Through v2.9 the
  acceptance test for **S7** — a `verify` that exits 0 on this
  repository — passed only because `specifications/project-brief.md` was
  still at its placeholders. The first person to fill in a brief would
  have turned the release gate red, and the gate would have been right
  by its own rules and useless. A test may assert the fix by filling a
  fill-expected path with arbitrary content and requiring exit **0**
  with that path reported `filled`.
- **An unexpected change still reports `differs`, and still fails.**
  Adapt-expected is a **per-path property declared by the pack**, never a
  blanket suppression: it cannot be turned on for a run, for a project or
  for a pack as a whole, there is no flag and no environment variable
  that produces it, and **a path not covered by a declaring step's write
  set behaves exactly as it did before this state existed**. A test may
  assert both halves in one run — edit the generated `CLAUDE.md` and one
  other applied file, then require exit **1**, `E-VERIFY-MISMATCH`
  counting **one** path, `CLAUDE.md` reported `adapted`, and the other
  file reported `differs`.
- **This is why `differs` was split, and it is the same split as Q-60's
  one layer down.** `differs` was answering two questions at once —
  *someone changed this* and *this was supposed to change*. F6's stated
  job includes adapting the generated `CLAUDE.md`'s project-owned prose;
  anchors are inert at v1.0 (Q-45), so nothing in the file distinguishes
  pack-owned regions from project prose; and Q-57 made the conversational
  path primary, so the skill **always** runs. An unadapted `CLAUDE.md`
  therefore exists for seconds, and without `adapted` a green `verify`
  was reachable only on a project nobody had finished setting up.
- **The manifest does not change, and no seventh key is added** (Q-43,
  Q-52). The adapt-expected set is **recomputable** from the local
  `.harness/pack/` payload plus its recipe — the same inputs
  `expected_tree` already takes, already committed to version control,
  and already covered by the `payloadDigest` check that runs first — so
  recording it would duplicate a derivable fact. That is the reason this
  fix is cheap, and it is stated here rather than left implicit because a
  later reader will otherwise look for an `adaptExpected` list in
  `.harness/manifest.json`. There is none, deliberately (§F1.8).
- The executable bit is compared where the platform represents it. On
  Windows it is not compared, and the report says so rather than implying
  a check ran.
- Files in the project that the recipe does not produce are **not**
  reported. `verify` answers "is what the pack wrote still what the pack
  would write", not "what else is in this repo".
- Any `differs` or `missing` exits **1** with `E-VERIFY-MISMATCH`,
  listing the first ten paths and the total count. **`adapted` is neither
  listed nor counted there.** A run in which every path is `match` or
  `adapted` exits **`0`**, and prints the count of paths checked plus,
  **separately, the count reported `adapted`** — so a clean run never
  hides an adaptation it chose not to fail on, and a reader can tell "no
  path moved" from "one path moved where the pack said it would".
- `verify --json` emits the same structure, so CI can gate on it. It
  carries the digest result explicitly — the recorded digest, the
  computed digest and whether they matched — alongside the per-path
  entries and the counts, so a consumer can distinguish a suppressed
  comparison from a comparison that found nothing. **Every per-path entry
  carries its `state`**, valued exactly `"match"`, `"adapted"`,
  `"differs"` or `"missing"`, and the counts are reported **per state**.
  `state` sits alongside the `class` field Q-60 added to every emitted
  finding, and **the two are different axes**: `state` is what `verify`
  found at an applied path, `class` is whether anyone is expected to
  change anything about a `W-` finding. A consumer gates on `state`
  without parsing prose, and a test may assert that a run with one
  adapted path emits exit `0`, one entry with `"state": "adapted"`, and
  no entry with `"state": "differs"`.
- The project scan `verify` performs is the bounded walk of C-17: depth ≤
  32, ≤ 10,000 entries, `lstat` only, never following a symlink
  (`W-SCAN-SYMLINK-SKIPPED`), and never descending into `.git/`, `.hg/`,
  `.svn/` or `node_modules/`.
- The one thing the digest does not catch is stated in US-10 rather than
  here, because it is a property of the digest and not of `verify`: a
  **pure line-ending edit** of a payload file, which normalization erases
  before hashing. Everything else about the payload — a changed
  character, an added file, a removed file, a renamed file, an edited
  `recipe.json` — moves the digest.
- This repo passes `lintel harness verify` after S7's re-init, and that
  is the acceptance test for S7. **It still passes after F6's skill has
  adapted the generated `CLAUDE.md`**: that path is reported `adapted`,
  no path is reported `differs`, and `verify` exits **`0`**. This is what
  makes S7 checkable **on a real project** rather than on a state that
  exists for the seconds between the apply and the first adaptation, and
  it is why the acceptance test is run **after** the skill has done its
  job rather than in the window before it. The test is exact: re-init
  this repo, run the skill, run `lintel harness verify`, require exit
  `0`, and require the `CLAUDE.md` entry to read `"state": "adapted"`.

---

## Error States

**This table is the product's only message catalogue, and F1's `E-`/`W-`
codes with its `0/1/2/3` exit classes are the only CLI error model.** No
other feature spec defines a CLI code, an exit code or a diagnostic
string; F5 owns user-facing text only for strings a *pack ships* — a
slash command's block message, an agent's halt, a target run's ABORT —
which are pack content, not CLI diagnostics. **The code is the stable
contract**: F6 and CI branch on the code and never on prose. Message text
is verbatim within a minor version and may be reworded across one.

**Severity is a property of the code, not of the occasion.** A scenario
that is fatal in one context and tolerable in another gets **two codes**,
not one code with two severities. Every row below carries exactly one
severity, and no consumer may reinterpret one.

**Every `W-` code also carries a class, and class and severity are
different axes** (Q-60). Severity says what a code does to the exit code.
**Class says whether anyone is expected to change anything.** There are
exactly two classes and every `W-` row below declares one:

- **`defect`** — **author-fixable.** Something is wrong and the pack
  author is expected to change it. `W-FOLDER-README-MISSING` and
  `W-LINK-DANGLING` are the type cases. Where a `defect` is raised at
  `init` rather than at `validate`, the person expected to change
  something is the one running the command rather than the pack author;
  the class is the same, because the test is *is a change expected?*
- **`notice`** — **reports a declared state the pack intends.** Nothing
  is wrong, and no change to the pack would clear it.
  `W-ANATOMY-PROVISIONAL` and `W-HOOK-SCRIPT-INERT` are the type cases:
  the first reports a `status` the pack declared with a note, the second
  reports that a shipped hook script is inert, which is not a shortfall
  but the rule — **no pack may register an agent hook at v1.0** (US-3).

**`--strict` promotes defects only.** A **notice always prints, always
leaves the exit code unchanged, and is never fatal under any flag** —
there is no flag in this CLI that promotes a notice, and none may be
added, because a flag that could promote one would recreate the problem
this split exists to remove: a pack being told to fix a state it declared
on purpose. Suppression is not the mechanism either: there is no flag
that hides a notice. The **exit classes themselves are unchanged** by
this split — a `defect` still exits `0` normally and `1` under
`--strict`, and an error is still `2` or `3`. What changed is **which
warnings `--strict` promotes**.

**A new `W-` code must declare its class in the same change that adds
it, and an unclassified `W-` code is `defect`.** The default is
fail-closed on purpose, and the opposite default was rejected: a warning
that is silently never promoted is exactly the failure mode this project
has hit twice — a declaration nothing checks, advertising a gate that
does not exist. A forgotten classification therefore makes CI **louder**,
which surfaces the omission, rather than quieter, which buries it.

**`E-` codes carry no class.** An error is fatal by severity and the
question does not arise.

Message convention: line 1 states the failure and begins
`lintel:`; subsequent lines are indented two spaces; a line
beginning `→` states the remedy. `{…}` marks an interpolated value.
Messages are written to stderr; warnings are written to stderr and do not
change the exit code.

| Scenario | Expected Behaviour |
|---|---|
| `E-PACK-CLI-TOO-OLD` — pack requires a newer CLI | Exit 1. `lintel: pack {name}@{version} needs lintel {minCliVersion} or newer.` / `  You are running {cliVersion}.` / `  → Upgrade with: npm i -g @lintel/cli@latest` |
| `E-PACK-FORMAT-NEWER` — `pack.json`'s `formatVersion` is newer than this CLI's pack format | Exit 2. `lintel: pack {name} uses pack format {n}; this CLI understands up to {m}.` / `  → Upgrade the CLI, or use a pack built for format {m}.` |
| `E-RECIPE-FORMAT-NEWER` — `recipe.json`'s `formatVersion` is newer than this CLI's **recipe** format (US-31, C-24) | Exit 2. `lintel: {pack}'s recipe declares format version {declared}; this CLI supports {supported}.` / `  → Upgrade lintel, or use a pack built for this version.` **Zero bytes written.** Distinct from `E-PACK-FORMAT-NEWER`: a different file, a different version axis and a different thing to fix, so a user is told which of the two declarations was newer. A declared version that nothing checks is worse than no version at all, because it advertises a gate that does not exist. |
| `E-JSON-DUPLICATE-KEY` — an authored JSON file declares a key more than once, at any depth (US-1, US-31, US-15, C-25) | Exit 2. `lintel: {file} declares "{key}" more than once (lines {first} and {second}).` / `  A duplicate key means the file a reviewer reads is not the file the CLI runs.` / `  → Remove the duplicate.` Applies to the three JSON documents the CLI parses — `pack.json`, `recipe.json` and `.harness/manifest.json` — and is raised **before** any other check on the file. One of the three is the user's own committed file, and the rule holds there for the same reason: a stdlib parser keeps the **last** duplicate while a human reading a diff reads the **first**, so the document reviews as one thing and executes as another. |
| `E-ANATOMY-MISSING` — one of the nine parts is undeclared, or declares neither a content source nor `"status": "absent"` | Exit 2. `lintel: pack {name} does not declare the anatomy part "{part}".` / `  A pack must declare all nine parts. Declare it, or mark it absent with a reason:` / `    "{part}": { "status": "absent", "reason": "…" }` |
| `E-ANATOMY-EMPTY` — a declared part matches no files | Exit 2. `lintel: anatomy part "{part}" in pack {name} matches no files.` / `  Patterns: {globs}` / `  → Fix the paths, or mark the part absent with a reason.` |
| `E-ANATOMY-NO-REASON` — `"status": "absent"` with no reason | Exit 2. `lintel: anatomy part "{part}" in pack {name} is absent without a reason.` / `  An absent part must say why it is absent.` / `  → "{part}": { "status": "absent", "reason": "…" }` |
| `E-ANATOMY-NO-NOTE` — `"status": "provisional"` with no note | Exit 2. `lintel: anatomy part "{part}" in pack {name} is provisional without a note.` / `  A provisional part must say what is unsettled about it.` / `  → "{part}": { "paths": […], "status": "provisional", "note": "…" }` |
| `E-ANATOMY-SOURCE-ON-ABSENT` — a content source alongside `"status": "absent"` | Exit 2. `lintel: anatomy part "{part}" in pack {name} is declared absent but also declares content ("{sourceKey}").` / `  A part cannot both not exist and have content, and lintel will not guess which was meant.` / `  → Remove "{sourceKey}", or drop "status": "absent".` A contradiction, not an unknown key: US-2 keeps redundancy as a warning. |
| `E-UNKNOWN-VALUE` — an unrecognised value in a behaviour-selecting position, **or a non-boolean in a boolean-typed field** (US-1, C-34) | Exit 2. `lintel: "{value}" is not a valid {field}.` / `  Allowed: {allowed}` / `  → Fix the value, or upgrade to a lintel that understands it.` Used wherever the position has no more specific code. Unknown **keys** stay a warning; unknown **values** are never ignored, because ignoring one runs behaviour the pack did not ask for. **The boolean-typing case, new at v2.4 and extended at v2.7:** `RecipeStep.executable`, `RecipeStep.adaptExpected` (Q-56), **`RecipeStep.fillExpected` (Q-79)**, `ParameterDecl.required` and `ParameterDecl.notASecret` are the **five** boolean-typed fields in the format, and each must hold the JSON literal `true` or `false` — `{allowed}` reads `true, false`. There is no coercion and no truthiness: in JavaScript the string `"false"` is **truthy**, so `"executable": "false"` read as `true` and `"notASecret": "no"` disabled the credential ban, two security gates failing **open** on a typo that US-1's closed enumeration affirmatively excluded from cover. Zero bytes written. |
| `W-ANATOMY-ABSENT` — a part is declared absent (at init) | **Class `notice`** — the pack declared the absence and supplied the reason this message prints (US-2); nothing is fixable. Warning, exit unchanged. `lintel: pack {name} declares no {part}.` / `  Reason given: {reason}` |
| `W-ANATOMY-PROVISIONAL` — a part is declared provisional | **Class `notice`** — a well-formed `provisional` part is a declared state with a declared note (US-2), not a shortfall. This is one of the two codes `planning` emits by design, and `--strict` does not promote it. Warning, exit unchanged. `lintel: pack {name} ships {part} as provisional.` / `  Note: {note}` |
| `E-RECIPE-MISSING` — `pack.json` names a recipe the pack does not contain | Exit 2. `lintel: pack {name} declares "recipe": "{path}", which is not in the pack.` / `  Phase 2 has nothing to run, so applying this pack would produce a payload and nothing else.` / `  → Add {path}, or correct the "recipe" path.` |
| `W-UNKNOWN-KEY` — a key the format does not recognise (US-1, C-16) | **Class `defect`** — the key is ignored, so the author is expected to remove it or to raise the format version that would give it meaning. Warning, exit unchanged; **exit 1 under `--strict`**. `lintel: {where} declares an unknown key "{key}".` / `  It is ignored — this lintel does not know what it means.` / `  → Remove it, or upgrade to a lintel that understands it.` **A warning and not an error, deliberately** (C-16): an unknown key is a pack talking to a **future** version, and refusing it would make every forward-compatible addition a breaking change. An unknown **value in a behaviour-selecting position** is the opposite case and is fatal — `E-UNKNOWN-VALUE` — because ignoring one runs behaviour the pack did not ask for. Added at v4.3, from building T-0303: the rule was named in three sections and required by a test in a fourth, and had no code to be named by. |
| `E-PACK-INVALID` — `pack.json` is unparseable or its top-level shape is wrong | Exit 2. `lintel: {path} is not a usable pack declaration ({detail}).` / `  A pack.json is an object declaring at least name, version, minCliVersion, recipe and anatomy.` / `  → Fix the file, then re-run validate.` **Zero bytes written.** Added at v4.0, from building T-0301: US-1 has always said `pack.json` goes through the duplicate-key-rejecting reader, and `E-JSON-DUPLICATE-KEY` covers the duplicate — but a **syntactically broken** `pack.json` had no code at all, while the other two documents that reader parses each had one. **Distinct from `E-RECIPE-INVALID` by this catalogue's own rule**: different file, different remedy, and the two messages must not be interchangeable. |
| `E-RECIPE-INVALID` — `recipe.json` is unparseable or its top-level shape is wrong | Exit 2. `lintel: {path} is not a usable recipe ({detail}).` / `  A recipe is { "formatVersion": <int>, "steps": [ … ], "scaffolds"?: { … } }.` / `  → Fix the file, then re-run validate.` |
| `E-RECIPE-TOO-MANY-STEPS` — a recipe declares more than 256 steps across base plus every scaffold (US-31, C-30) | Exit 2. `lintel: pack {name} declares {n} recipe steps; the limit is 256.` / `  pack info prints every step so that an apply can be read before it runs, and a list nobody finishes reading is not a control.` / `  → Reduce the step count, or raise the limit in an ADR that supersedes this one.` Counted over the **total declared** set, before any `when` filtering, because that is what `pack info` prints. Not a DoS control — there is no remote attacker and `E-PAYLOAD-TOO-LARGE` bounds the bytes — but an **inspectability** control. Raisable only by a superseding ADR: not by a flag, an environment variable or a `pack.json` key. |
| `E-RECIPE-PRIMITIVE-UNKNOWN` — a step declares an `op` outside the closed set | Exit 2. `lintel: step {index} declares op "{op}", which is not a lintel harness primitive.` / `  The six primitives are: copy, rename, strip-suffix, rewrite-path, substitute, generate.` / `  The set is closed. A pack cannot add a step type; a new primitive is a change to the CLI.` / `  {note}` / `  → Express the step with an existing primitive, or open it as a CLI change.` `{op}` is matched **literally**: no trimming, no case folding, no normalization, so `"copy "` reaches this code rather than being accepted. **`note` takes exactly two values**: the **empty string** for every unknown op, and `merge-json does not ship at v1.0; it is deferred to v1.1.` when `{op}` is literally `merge-json`. **A line whose placeholders all render empty is omitted**, so the ordinary message is four lines and the `merge-json` message is five — the conditional line the earlier text described in prose, now expressible. **One code and not two**: this story requires `merge-json` to be `E-RECIPE-PRIMITIVE-UNKNOWN` *like any other unknown value*, so a second code is forbidden, while it also requires the message to say the primitive was withdrawn — so an author is told the primitive was withdrawn rather than left to assume a typo. |
| `E-RECIPE-STEP-INVALID` — a step's inputs are wrong for its primitive | Exit 2. `lintel: step {index} ("{op}") is not usable: {reason}.` / `  {usage}` / `  → Fix the step.` `{reason}` names the offending field — a missing `to`, a directory `from` on a file-only primitive, a `when` with more than one key, a `rewrite-path` whose `in` matches nothing the recipe has written by that point, a scaffold with no steps. |
| `E-RECIPE-SOURCE-MISSING` — a step's declared payload source names nothing in the payload: `from` on the five primitives that have one, **`template` on `generate`** (US-3, US-32, C-38) | Exit 2. `lintel: step {index} ("{op}") reads "{path}" from "{field}", which is not in the pack.` / `  Phase 2 reads only .harness/pack/, so every declared source must exist in the pack itself.` / `  → Correct the path, or add the file to the pack.` `{field}` is `from` or `template`. **The `template` half is new at v2.4:** through v2.3 this code was written for `from` alone and §F1.2's `generate` validation row omitted source existence, so `generate`'s only input had no named code for the commonest authoring mistake. One fault, one code, at whichever field carries the source. |
| `E-PAYLOAD-PATH-INVALID` — a pack-relative path is not a legal path | Exit 2. `lintel: "{path}" in pack {name} is not a legal pack path.` / `  {construct}` / `  → Rename it. Pack paths are "/"-separated, NFC, relative, with no "..", no backslash, no drive letter, no control character, and no segment ending in "." or whitespace.` |
| `E-PAYLOAD-TOO-LARGE` — the whole payload exceeds the size bound | Exit 2. `lintel: pack {name} totals {size}; the limit for a pack payload is 32 MB.` / `  The payload is copied into and committed by every project that applies the pack.` / `  → Remove content, or split the pack.` |
| `E-MAP-ESCAPES-ROOT` — a `to` leaves the project | Exit 2. `lintel: step {index} writes "{to}", which resolves outside the project root.` / `  → Applied paths must be relative and must stay inside the project.` |
| `E-MAP-COLLISION` — two steps write one path | Exit 2. `lintel: two steps both write "{path}".` / `  step {a}: {opA} {fromA}` / `  step {b}: {opB} {fromB}` / `  → A recipe may write each applied path exactly once.` |
| `E-MAP-CASE-COLLISION` — two applied paths differ only by letter case. **Folding is defined**: two paths collide when their *collision keys* are equal, where a collision key is the applied path NFC-normalized **and then** case-folded (US-3). Computed over the merged step set — base plus every scaffold | Exit 2. `lintel: "{a}" and "{b}" differ only by letter case.` / `  On macOS and Windows these are the same file.` / `  → Rename one of them in the pack.` |
| `E-MAP-NORM-COLLISION` — two applied paths collide after Unicode normalization, and the collision is **not** a case difference | Exit 2. `lintel: "{a}" and "{b}" are two byte sequences for the same filename.` / `  They differ only in Unicode normalization (NFC vs NFD), so macOS stores them as one file.` / `  → Write both "to" values in NFC, using the same code points.` |
| `E-MAP-PATH-GRAMMAR` — a `to` value does not match the anchored applied-path grammar of US-3 | Exit 2. `lintel: step {index} writes "{to}", which is not a legal applied path.` / `  {construct}` / `  → An applied path is one or more "/"-separated segments, relative, NFC, with no "..", no backslash, no drive letter, no control character, and no segment ending in "." or whitespace.` The `{construct}` line names the specific offence — leading separator, backslash, drive-relative prefix, UNC prefix, dot segment, trailing dot or whitespace, reserved Windows basename, **a control character**, or non-NFC. |
| `E-MAP-RESERVED-DEST` — an applied path in a step's write set, or an `executableRoots` entry, resolves into a reserved destination | Exit 2. `lintel: step {index} writes "{path}", which is a reserved destination ("{reserved}").` / `  Reserved at any segment: .git .hg .svn .github .vscode .idea node_modules .circleci .devcontainer` / `  Reserved as a first segment: .harness/` / `  Reserved by basename: package.json .envrc .npmrc .yarnrc.yml Makefile GNUmakefile justfile .justfile .mcp.json .gitlab-ci.yml Jenkinsfile azure-pipelines.yml bitbucket-pipelines.yml` / `  Reserved under any .claude segment: settings.json settings.local.json` / `  Also reserved: the directory lintel itself is installed in.` / `  A recipe step may never write under .harness/ — that is where the payload it reads from lives.` / `  No pack writes project settings, MCP server declarations, CI pipelines, editor tasks or package manifests at v1.0.` / `  → Choose a destination inside the project that lintel does not own.` Checked **after resolution** and over the whole **write set**, so it applies equally to a base step, a scaffold step, a directory recursion's output, an `in`-glob match and an `executableRoots` entry. Every entry is matched by `collisionKey` — NFC-normalized then case-folded — on every platform unconditionally, so `.claude/Settings.json` and `.GitHub/workflows/` are reserved too. **Class 2 — the toolchain-executed destinations — is a declared, closed list and therefore a denylist, incomplete by construction** (US-3, C-31); adding an entry amends US-3's table and adds a fixture to US-16 in the same change. **One quantifier rule, and the message prints it as three lines rather than four** (C-33, C-39d): a reserved **name** is reserved at **every** segment — the VCS names because `docs/.git/hooks/pre-commit` is shell that runs on the next commit, `node_modules` because npm workspaces nest it and `verify`'s scan skips it at any depth, `.github`/`.circleci`/`.devcontainer` because they are read relative to a repository root this CLI cannot locate, `.vscode`/`.idea` because a subfolder opened as a workspace root reads its own — while **`.harness/` is the only first-segment entry in this document**, because it alone names one specific tree this CLI constructs. The two settings basenames are reserved under **any** `.claude` segment (C-39a), not at two root-relative paths. |
| `E-DEST-SYMLINK` — a destination, or an ancestor of one, is a symlink, junction or other reparse point | Exit 2. `lintel: "{component}" on the way to "{path}" is a symbolic link.` / `  lintel does not traverse or create through a link, because where a link points is not something this project controls.` / `  → Replace the link with a real directory, or apply into a tree that has none.` Raised at plan time and again immediately before the write. |
| `W-PATH-NON-NFC` — a source basename discovered by directory recursion is not NFC | **Class `defect`** — the author is expected to rename the file to NFC; an NFD basename is a cross-platform bug in the pack, which is what the second message line says. Warning. `lintel: "{path}" is not in Unicode NFC; its applied path has been normalized.` / `  An NFD name would not match the same file on Linux.` |
| `E-EXEC-ROOT-UNDECLARED` — `executable: true` outside every declared `executableRoots` prefix | Exit 2. `lintel: step {index} sets the executable bit on "{to}", outside every declared executableRoots prefix.` / `  Declared: {roots}` / `  → Add the destination's prefix to "executableRoots", or drop "executable": true.` |
| `E-EXEC-DEST-FORBIDDEN` — an executable lands, or an `executableRoots` prefix resolves, under a forbidden directory | Exit 2. `lintel: "{path}" may not be executable.` / `  A pack may never write an executable file inside any .claude, .git, .hg or .svn directory at any depth, or under .harness/.` / `  → Ship the script as an ordinary 0644 file, or place it elsewhere in the project.` Checked at declaration and again per applied path. **The scoping is US-3 stage 2's one quantifier rule** — a reserved name at every segment, `.harness/` the one location. This list had the same defect twice: first for the three VCS names (C-33), then for **`.claude`** (C-39b), which stayed first-segment through v2.4 in the same version that stated normatively that a nested `.claude/` is read by the runtime exactly as a root-level one is — so a `0755` file at `docs/.claude/hooks/x.sh` was refused by neither list. Shipping an **inert** `0644` file under `.claude/hooks/` remains permitted (`W-HOOK-SCRIPT-INERT`); it is the bit that is forbidden, not the destination. |
| `E-EXEC-TOO-MANY` — more than 32 executable files in one apply | Exit 2. `lintel: this apply would write {n} executable files; the limit is 32.` / `  → Reduce the number of executables, or raise the limit in an ADR of its own.` |
| `E-REWRITE-UNUSED` — a `rewrite-path` step matches nothing | Exit 2. `lintel: step {index} rewrites "{find}" → "{replace}", which matched nothing in {globs}.` / `  A rewrite that no longer applies is stale.` / `  → Remove the step, or fix its "in" patterns.` |
| `E-SUBST-UNRESOLVED` — a `{{harness:…}}` token is left in output | Exit 2. `lintel: unresolved {{harness:{token}}} in {path}:{line}.` / `  → Declare a parameter named "{id}", add the token to the step's "tokens" list, or remove the token.` Nothing is written. |
| `E-SUBST-NEWLINE` — a substituted value contains a line break | Exit 2. `lintel: the answer for "{id}" contains a line break and cannot be substituted into "{path}".` / `  A single answer may not become two lines of a generated file.` / `  → Answer on one line, or tighten the parameter's "pattern".` Triggered by `\n`, `\r`, `U+2028` or `U+2029`. Holds even when a parameter's `pattern` is weak, which is why it exists separately from `E-PARAM-INVALID`. |
| `E-ANCHOR-INVALID` — a `generate` step's declared anchor is missing, duplicated or unbalanced | Exit 2. `lintel: step {index} declares anchor "{id}", which {reason} in the rendered "{to}".` / `  An anchor is the exact line <!-- harness:region id={id} --> closed by <!-- harness:end -->, and each declared anchor must appear once.` / `  → Fix the template, or drop the anchor from the step.` `{reason}` is `does not appear`, `appears {n} times` or `leaves {n} unclosed anchors`. The check is a literal line count, not a grammar — v1.0 has no region parser (Q-45). |
| `E-PARAM-MISSING` | Exit 1. `lintel: parameter "{id}" is required and has no answer.` / `  {prompt}` |
| `E-PARAM-INVALID` | Exit 1. `lintel: "{value}" is not a valid answer for "{id}".` / `  Allowed: {values}` Raised **when an answer is collected**, and only then — the user typed it and can retype it. A recorded answer failing on read-back from the manifest is `E-MANIFEST-ANSWER-INVALID`, exit 2 (C-29): severity is a property of the code, not of the occasion. |
| `E-PARAM-UNDECIDABLE` | Exit 2. `lintel: parameter "{id}" selects recipe steps but is neither required nor given a default.` / `  → Add "required": true, or a "default".` |
| `E-PARAM-COMBINATORICS` | Exit 2. `lintel: pack {name} has {n} parameter combinations to validate; the limit is 32.` / `  → Reduce step-selecting parameters, or split the pack.` |
| `E-PARAM-FLAG-INVALID` — a declared `flag` alias is malformed or collides | Exit 2. `lintel: parameter "{id}" declares the flag alias "--{flag}", which {reason}.` / `  Reserved: --set, --scaffold, --json, --strict, --force, --rollback, --all, --dry-run` / `  → Choose a kebab-case alias that is not reserved and not already used by another parameter.` `--accept-permissions` and `--accept-hooks` left the list with the consent gate (Q-54); a v1.1 reinstating the gate must re-reserve both names before shipping. |
| `E-PARAM-NO-PATTERN` — a `type: "string"` parameter declares no `pattern` | Exit 2. `lintel: parameter "{id}" is a string and declares no "pattern".` / `  Every string answer is recorded verbatim in a committed manifest and replayed on every verify, so its shape must be declared.` / `  → Add an anchored pattern, e.g. "pattern": "^[\p{L}\p{N} ._-]{1,64}$"` |
| `E-PARAM-PATTERN-INVALID` — a declared `pattern` is unanchored, uncompilable, over-long, uses a backreference or lookaround, or is declared on `enum` / `boolean` | Exit 2. `lintel: the "pattern" on parameter "{id}" is not usable ({reason}).` / `  A pattern must start ^, end $, be at most 200 characters, and use no backreference and no lookaround.` / `  → Simplify it, or drop it if the parameter is an enum or a boolean.` |
| `E-PARAM-SECRET-SUSPECTED` — a parameter's `id` or `prompt` names a credential | Exit 2. `lintel: parameter "{id}" looks like it asks for a credential.` / `  Every answer is written verbatim into .harness/manifest.json, which this project commits to version control. An answer is exactly as public as the repository.` / `  → Remove the parameter, or declare "notASecret": true if the name is a false alarm.` The matcher is `api[_-]?key\|private[_-]?key\|secret\|token\|passwo?rd\|credential\|connection.?string`, case-insensitive; a bare `key` deliberately does not match, so `sortKey` and `keyword` are not false positives. |
| `W-ANSWER-LOOKS-SECRET` — an answer's *value* looks like a credential | **Class `defect`** — a change is expected, and the actor is the person running `init` rather than the pack author. The class is recorded for completeness: the code is raised at answer time, and `--strict` is a `validate` flag, so nothing promotes it in practice. Warning. `lintel: the answer for "{id}" looks like a credential.` / `  It will be written into .harness/manifest.json, which this project commits.` Triggered by `-----BEGIN`, `sk-`, `ghp_`, `xox[baprs]-`, or ≥ 40 characters of high-entropy base64url. A warning and never an error: an error here is a false-positive machine. |
| `E-SCAFFOLD-UNKNOWN` — an unknown id given to `--scaffold` | Exit 1. `lintel: pack {name} has no scaffold "{id}".` / `  Available: {ids}` A pack/recipe scaffold mismatch is a different fault and is `E-RECIPE-STEP-INVALID`, exit 2 — severity is a property of the code, not of the occasion. |
| `E-SCAFFOLD-EXCLUSIVE` — two selected scaffolds share a category | Exit 1. `lintel: "{a}" and "{b}" are alternatives, not additions — both are "{category}" scaffolds.` / `  Pick one.` / `  Available {category} scaffolds: {ids}` This is the choose-one diagnostic; a path collision would have been technically true and practically misleading. |
| `E-SCAFFOLD-COLLISION` — two scaffolds of different categories write one path | Exit 2. `lintel: scaffolds "{a}" and "{b}" both write "{path}".` / `  They are in different categories, so a user may select both.` / `  → Give them one category if they are alternatives, or move the shared file into the base recipe.` |
| `E-TARGET-NOT-A-FILE` — a **directory** stands where a step writes a file | Exit 1. `lintel: "{path}" is a directory, and this pack writes a file there.` / `  Nothing was written.` / `  → Remove or rename the directory, then re-run.` **Detected at plan time, so zero bytes** — the probe sees only regular files, so before v6.1 a directory at a destination was invisible to the planner, the plan said *create it*, and the writer's exclusive-create failed with **`E-TARGET-RACE`** mid-apply. That message says *"changed while lintel was writing"* and *"the plan expected to create it, and it exists now"*, and **both sentences are false**: nothing changed, and it existed before the plan ran. §Error States' own rule decides it — *two messages which are not interchangeable are two codes* — and these are not: one says a race happened and points at `--rollback`; this one says a directory is in the way and points at removing it. |
| `E-TARGET-EXISTS` — init into a non-empty tree | Exit 1. `lintel: {n} files already exist where this pack would write.` / `  {paths}` / `  → Apply into an empty directory, or re-run with --force to keep byte-identical files and stop on the rest.` **The existence test compares by `collisionKey`** — NFC-normalized then case-folded — **not by exact string** (N-5, US-13), as do `--force`'s byte-identity check and the journal's `preExisting` determination. Without that folding, `.claude/Settings.json` on disk and a step writing `.claude/settings.json` are the same file on macOS and Windows and this code does not fire: the apply overwrites silently, the journal records `preExisting: false`, and rollback deletes a user file it did not create. |
| `E-ALREADY-APPLIED` — the project already has `.harness/` | Exit 1. `lintel: this project already has {pack}@{version} applied.` / `  init applies a pack to a project that has none.` / `  → lintel harness update   to move this project to a newer {pack}` / `  → Or apply into a fresh directory, or remove .harness/ by hand if you mean to start over.` Zero bytes written. Named without a pack when the manifest is unreadable. |
| `E-JOURNAL-PRESENT` — a previous apply crashed | Exit 2. `lintel: a previous {command} did not finish.` / `  {n} files were being written when it stopped.` / `  → lintel harness {command} --rollback   undo exactly what that run did` **`{command}` is read from the journal's own `command` field** (US-13, journal v3) and is never assumed. Through v2.9 the remedy said `init --rollback` unconditionally, which after a crashed `update` sent the user to a command that answers `E-ALREADY-APPLIED` and leaves the journal exactly where it was — a remedy line that cannot work is worse than none, because the user believes they tried. |
| `E-JOURNAL-UNREADABLE` — `.harness/journal.json` declares a `version` other than `2`, or cannot be parsed | Exit 2. `lintel: .harness/journal.json is not a journal this CLI can act on ({detail}).` / `  lintel will not guess what a previous apply was doing.` / `  → Remove .harness/journal.json by hand once you have checked the project, or restore it from version control.` Fail-closed: journal version 1 never shipped, and this check exists so that it never can. |
| `E-TARGET-RACE` — a write target changed between plan and write | Exit 2. `lintel: "{path}" changed while lintel was writing.` / `  {detail}` / `  Nothing further was written; the journal is intact.` / `  → lintel harness {command} --rollback, then re-run.` `{detail}` is one of `it appeared after the plan said it did not exist`, `it is no longer a regular file`, or `its contents no longer match what the plan read`. |
| `W-ROLLBACK-KEPT` — rollback declined to touch a path | **Class `notice`** — rollback kept the file **on purpose** under the five-case table (US-13), and reporting it is the point; nothing is fixable. Warning within the rollback report. `lintel: kept "{path}" — {reason}.` Rollback continues and exits 0 with the count of kept files. |
| `E-LOCK-HELD` — another command holds the project lock | Exit 1. `lintel: another lintel harness command is running in this project (pid {pid} on {host}, since {startedAt}).` / `  → Wait for it to finish, or remove .harness/lock if you are certain it is not running.` A lock whose pid is alive, or whose host is not this one, is **never** broken automatically. |
| `W-LOCK-STALE-BROKEN` — a stale lock was broken | **Class `notice`** — the CLI reports an action it took under three checked conditions; no pack change and no user change would clear it. Warning. `lintel: removed a stale lock left by pid {pid}, which is no longer running.` Broken only when all three hold: the recorded host is this host, the recorded pid is not alive, and the lock is older than 60 s. |
| `E-MANIFEST-MISSING` | Exit 1. `lintel: no manifest at .harness/manifest.json — this project has no pack applied.` / `  → lintel harness init <pack>   to apply one` |
| `E-MANIFEST-CORRUPT` | Exit 2. `lintel: .harness/manifest.json is not readable ({detail}).` / `  → Restore it from version control, or re-apply into a fresh directory. lintel will not repair a manifest.` A duplicate key is `E-JSON-DUPLICATE-KEY` instead — one fault, one code, wherever it occurs. |
| `E-MANIFEST-ANSWER-INVALID` — a recorded answer read back from the manifest fails its own declared `pattern`, `maxLength` or `values` (US-8, US-15, US-33, C-29) | Exit 2. `lintel: the recorded answer for "{id}" is not valid against the pack's own declaration ({reason}).` / `  Recorded: {value}` / `  Nobody typed this: the manifest was edited, or the pack's declaration changed under it.` / `  → Restore .harness/manifest.json from version control, or re-apply into a fresh directory.` **Class 2 and never class 1**, and the split from `E-PARAM-INVALID` is this catalogue's own severity rule applied to itself: at collection a user typed the value and can retype it (exit 1); on read-back the user typed nothing, the manifest carries no self-integrity check by design, and `verify` replays answers on every run — so a failure is a manifest-integrity fault. `verify` **suppresses** the tree comparison, as it does on a digest mismatch and for the same reason. |
| `E-MANIFEST-NEWER` | Exit 2. `lintel: .harness/manifest.json was written by a newer lintel (manifest version {n}; this CLI reads up to {m}).` / `  → Upgrade: npm i -g @lintel/cli@latest` |
| `W-MANIFEST-NEWER-CLI` | **Class `notice`** — version skew between the recorded CLI and the running one; commands proceed and no pack content is wrong. Warning. `lintel: this project was last touched by lintel {recorded}; you are running {current}.` |
| `W-PACK-NEWER-THAN-CLI` | **Class `notice`** — the same skew on the pack axis, and the message itself says `verify` still works. Warning. `lintel: this project has {pack}@{version}; the newest {pack} bundled with lintel {cliVersion} is {bundled}.` / `  verify still works — it reads .harness/pack/, not the bundle.` |
| `E-PAYLOAD-DIGEST-MISMATCH` — `.harness/pack/` does not hash to the manifest's `payloadDigest` | Exit 2. `lintel: .harness/pack/ does not match the payload this project recorded.` / `  recorded {recorded}` / `  computed {computed}` / `  The applied tree cannot be checked against an edited payload.` / `  → Restore .harness/pack/ from version control, or re-apply into a fresh directory.` Raised by `verify` **before** any recomputation, and the tree comparison is suppressed: the expectation is computed from the payload, so an untrusted payload makes it meaningless (US-33). Class 2 and never class 1 — this is a payload integrity fault, not a difference a user may have chosen, which is the line `E-VERIFY-MISMATCH` sits on the other side of. |
| `E-VERIFY-MISMATCH` — the project differs from the recomputed applied tree | Exit 1. `lintel: {n} of {total} applied paths do not match what this pack and these answers produce.` / `  {paths}` / `  → Inspect the differences, or re-apply into a fresh directory.` A `differs` is not necessarily a fault — a user may have edited a generated file deliberately — so this is exit 1 and never exit 2. **A path reported `adapted` is not counted in `{n}` and never appears in this message** (Q-56, US-33): the pack declared `adaptExpected` on the step that produced it, so a change there is the declared outcome rather than a mismatch. **A path reported `filled` or `unfilled` is likewise not counted and never appears** (Q-79, US-33): the pack declared `fillExpected`, so a change there is the user doing what the pack asked, and an *absence* of change is a template still waiting to be filled — neither is a mismatch. This code fires on `differs` and `missing` only, and a run whose only movement is adaptation or filling exits `0` without raising it. |
| `E-CLAUDE-TOOL-GRANT` — a file a pack places under a `.claude` segment declares a permission-bearing frontmatter key that it may not (US-3, US-30, US-31, C-32a, C-39c, C-40) | Exit 2. `lintel: "{path}" declares a permission decision ("{key}", line {line}).` / `  A pack may not pre-authorize tools or select a permission mode for the project it is applied to. A command file's frontmatter is a permission declaration, and its !-prefixed lines execute shell under it.` / `  → Remove the key. A pack contributing permissions is deferred to v1.1 with the settings story.` **Zero bytes written.** Raised for a **grant key** on any pack-placed file under a `.claude` segment, and for a **mode key** on any such file that is **not** an agent file — a command or skill file has no business selecting a permission mode (C-40). **Two quantifiers, two steps, two disjoint sets** (C-39c): the **write set**, on **rendered** output, at US-16 **step 11** — rendered because a later `substitute` or `rewrite-path` can change the bytes the runtime reads — and the **phase-1 payload set**, on payload bytes, at US-16 **step 3**, because phase 1 copies verbatim and skips no payload file, so a `.claude/` subtree a pack merely *ships* lands live inside the committed project at `.harness/pack/.claude/`. Matched on **any segment** equal to `.claude`, not the first only (C-33's scoping). `{key}` comes from **one named constant pinning the key names the Claude Code runtime's current frontmatter contract uses for a permission decision** — **grant keys** (`allowed-tools` and its spellings) **and mode keys** (`permissionMode` and its spellings) — with the runtime version the pin was taken against recorded beside it; a key the runtime adds after the pin is not caught until the pin is updated, which §F1.9 records as a maintenance obligation. **Not raised for an agent file's `tools:` list, nor for an agent file's non-widening `permissionMode`**, both permitted and **disclosed** instead (US-13, C-32b, C-40); a widening or unrecognised mode value on an agent file is `E-CLAUDE-PERMISSION-MODE`. |
| `E-CLAUDE-PERMISSION-MODE` — a pack-placed agent file under a `.claude` segment declares a `permissionMode` whose value is widening or unrecognised (US-3, US-30, US-31, C-40) | Exit 2. `lintel: "{path}" selects permission mode "{value}" (line {line}).` / `  A pack may not widen the permission envelope of the project it is applied to, and lintel will not guess at a mode it does not recognise.` / `  Permitted: {modes}` / `  → Use a mode that does not widen the envelope, or remove the key.` **Zero bytes written.** `{modes}` is the pinned **non-widening** value set held in the same named constant as the key names, with the runtime version the pin was taken against. **A distinct code from `E-CLAUDE-TOOL-GRANT` because the fault and the remedy differ**: there the key may not be declared at all, here the key is legitimate and the *value* is not — and the two messages must not be interchangeable, on this catalogue's own rule that a code is the stable contract. **Fail-closed on an unrecognised value**, which is US-1's rule for a value in a behaviour-selecting position applied to a foreign contract: refusing a legitimate new mode at `validate` time is visible, locatable and fixable in one constant, while accepting an unknown one is a silent widening. **Not raised for `tools:`**, which is a request made underneath the engine rather than a selection of its mode (C-32b) — the distinction v2.4 collapsed, and the reason `permissionMode: bypassPermissions` on an agent that also declared `Bash` was neither refused nor shown. |
| `W-HOOK-SCRIPT-INERT` — the pack ships a file under a `hooks/` directory in any `.claude` tree | **Class `notice`** — shipping an inert `0644` hook script is **permitted and intended** (US-3), the script is inert *because* no pack may register an agent hook at v1.0, and no change an author could make would clear the finding short of deleting content the pack means to ship. This is the second of the two codes `planning` emits by design. Warning. `lintel: "{path}" is shipped as an ordinary file and is registered by nothing.` / `  No v1.0 mechanism registers a hook, so this script does not run until something registers it by hand.` Emitted by `validate` at US-16 **step 8**, and the same files are listed in the init summary and in `pack info` (US-3). **`.claude` is matched at any segment** (C-39), as it is in every other rule in this document; the file is `0644` by `E-EXEC-DEST-FORBIDDEN`, also at any segment (C-39b). |
| `W-LINK-DANGLING` — a relative link or inline path reference in rendered output resolves to nothing the apply produces (US-16) | **Class `defect`** — the remedy line names the change and the author is expected to make it. Warning. `lintel: {path}:{line} refers to "{target}", which this pack does not produce.` / `  → Fix the reference, or add the file to the pack.` A reference into `.harness/pack/` that exists in the payload is correct and is not reported. |
| `W-FOLDER-README-MISSING` — a directory the applied output implies, outside `.claude/` and `.harness/`, that receives no folder README in the parameter combination that creates it (US-16 step 12, Q-50) | **Class `defect`** — the remedy is a recipe step the author adds, which is what the third message line says. **The over-approximation below governs its *severity*, not its class**: it is why the code is a warning rather than an error, and it is exactly why `--strict` promotes it in the one place the over-approximation is known empty. **Warning**, exit unchanged; **exit 1 under `--strict`**. `lintel: {pack} creates {dir} but writes no {basename} into it.` / `  combination: {combination}` / `  → Add a step producing {dir}{basename} in the same condition branch, or make {dir} unnecessary.` `{basename}` is `pack.json`'s `folderReadme` (default `README.md`, US-1); one diagnostic per directory per combination. **A warning and not an error, deliberately:** `validate` has no project root, so it cannot tell a directory this apply *creates* from one that already exists and is merely written into. The check over-approximates by construction, and an over-approximating check must not be fatal by code — a pack writing into a conventional pre-existing directory would otherwise be unshippable and the workaround would be the `.gitkeep`-shaped placeholder Q-50 exists to prevent. `--strict` makes it fatal where the over-approximation is known empty, which is this repo's CI. |
| `E-CONTENT-TOO-LARGE` | Exit 2. `lintel: "{path}" is {size}; the limit for a pack file is 4 MB.` |
| `E-SYMLINK-IN-PACK` | Exit 2. `lintel: "{path}" is a symbolic link. Pack content must be regular files.` |
| `E-TRAVERSAL-LIMIT` — a directory walk exceeded its depth or entry cap | Exit 2. `lintel: the walk of "{root}" exceeded the {limit} limit ({n}).` / `  Limits: depth 32, 10,000 entries per walk.` / `  → Narrow the content, or split the pack.` Applies identically to the phase-1 payload walk and the `verify` project scan, which share one bounded walk. |
| `W-SCAN-SYMLINK-SKIPPED` — the project scan met a symlink | **Class `notice`** — the bounded walk declines to follow links out of the project **by design** (C-17), the link is in the user's project rather than in the pack, and no pack change would clear it. Warning. `lintel: skipped "{path}" — it is a symbolic link, and lintel does not follow links out of the project.` The scan also does not descend into `.git/`, `.hg/`, `.svn/` or `node_modules/`. |
| `E-FLAG-NOT-PERMITTED` — a known flag passed to a command that does not accept it | Exit 1. `lintel: --{flag} is not available on "lintel harness {command}".` / `  It is accepted on: {commands}` / `  → Remove it, or run the command that accepts it.` Distinct from `E-CLI-UNKNOWN-FLAG`: this flag exists, and it is refused rather than ignored, because a user who typed it believed it did something. |
| `E-WRITE-FAILED` — I/O error mid-write | Exit 3. `lintel: could not write "{path}" ({errno}).` / `  Nothing further was written; the project is mid-apply.` / `  → lintel harness {command} --rollback` |
| `E-CLI-UNKNOWN-COMMAND` — **the positional in the command slot** is not a known command of the group | Exit 1. `lintel: "{arg}" is not a lintel harness command.` / `  Commands: init, update, skill, validate, verify, pack` / `  → lintel harness --help` **The list is six as of `F6-ADR-005`, and was five as of Q-62**, which returns `update` to v1.0 as F3's — a message-only fold; `update`'s own behaviour, flags and codes are F3's to specify and none is added here. The order is the surface's own: the two writing commands first, then the three read-only ones, matching `general/interaction-model.md` §11. **Re-scoped by Q-63, not renamed:** the command is now the **second** positional, after the group token, so this code answers *`harness` has no such command* and its remedy is the group's help. **A first positional that is not a known group is a different fault with a different remedy** — the list to print is the group list, and the help to point at is `lintel --help` — and on this catalogue's own rule, that two messages must not be interchangeable because the code is the stable contract, it is a **different code**. **No such code exists at v1.0.** It is recorded as known limit 16 rather than invented here, because adding a row is a change to the only message catalogue and belongs in the change that also specifies which feature raises it. |
| `E-CLI-UNKNOWN-FLAG` — a flag no command and no pack alias recognises | Exit 1. `lintel: "lintel harness {command}" does not accept --{flag}.` / `  It accepts: {flags}` / `  → lintel harness {command} --help` Reported **only after the second argv pass**, once the resolved pack's aliases are registered (US-8) — otherwise every pack-declared alias reports falsely. |
| `E-CLI-FLAG-VALUE-MISSING` — a flag that takes a value received none | Exit 1. `lintel: --{flag} needs a value.` / `  {usage}` |
| `E-CLI-ARG-UNEXPECTED` — a positional the command does not take | Exit 1. `lintel: "lintel harness {command}" does not take the argument "{arg}".` / `  {usage}` |
| `E-DISCLOSURE-FORGERY` — pack content contains one of the disclosure's own sentinel lines (US-13, C-49) | Exit 2. `lintel: "{path}" contains a line that would end the security disclosure early.` / `  A pack may not emit lintel's own output delimiters.` / `  → Remove the line. The disclosure must be readable in full before anything is written.` **Zero bytes written.** Raised by `init` before the disclosure is emitted **and** by `validate` at step 11, over the rendered write set, so the fault is caught at authoring time rather than only at apply time. **Class 2 and never class 1**: this is not a difference a user may have chosen, it is a pack defeating the mechanism that describes it. The restored half of **C-9**. |
| `E-CLI-UNKNOWN-PACK` — the pack positional names no bundled pack (F2) | Exit 1. `lintel: "{name}" is not a pack bundled with lintel {cliVersion}.` / `  Packs: {packs}` / `  → lintel harness pack info <pack>   to see what one contains` **Exit 1, not 2**: a user typed a name and can retype it, which is the class `E-CLI-UNKNOWN-COMMAND` sits in. Distinct from `E-CLI-ARG-UNEXPECTED`, which is a positional the command does not take at all. |
| `E-CLI-PACK-MISSING` — a command requiring a pack positional received none (F2) | Exit 1. `lintel: "lintel harness {command}" needs a pack name.` / `  Packs: {packs}` / `  {usage}` A separate code from `E-CLI-UNKNOWN-PACK` because the remedy differs — there is nothing to correct, only something to supply — and this catalogue's rule is that two messages which are not interchangeable are two codes. |
| `E-SET-UNKNOWN-PARAM` — `--set` names a parameter the resolved pack does not declare (F2, US-8) | Exit 1. `lintel: {pack}@{version} declares no parameter "{id}".` / `  Declared: {ids}` / `  → lintel harness pack info {pack}   to see the parameters and their defaults` **Reported only after the second argv pass** (US-8), like `E-CLI-UNKNOWN-FLAG`: the pack is not resolved during pass 1, so a pass-1 report would be a guess. **Never silently ignored** — an unrecognised `--set` means the user believes they set something they did not, and the applied tree would be recomputable but not what they asked for. |
| `E-PARAM-UNANSWERABLE` — a parameter has no answer, no default, is not `required`, and there is no TTY to ask on (F2, US-8) | Exit 1. `lintel: "{id}" has no answer and no default, and there is nowhere to ask.` / `  Non-interactive: stdin and stderr are not both a terminal.` / `  → Pass --set {id}=<value>, or run where lintel can prompt.` **Distinct from `E-PARAM-MISSING`**, which is a `required` parameter left unanswered and is a fault whatever the terminal is; this fires only where the *absence of a prompt* is what makes the run undecidable, and the remedy names the flag rather than the declaration. **Distinct from `E-PARAM-UNDECIDABLE`**, which is a `validate`-time authoring defect about a parameter named in a `when` — that is exit 2 and is the pack author's; this is exit 1 and is the user's. |
| `W-LINK-FALLBACK` — an applied path was written by copy because `link()` was unavailable (US-13) | **Class `notice`** — the CLI reports a narrowed guarantee it could not avoid; no pack change and no user change would clear it. Warning. `lintel: "{path}" was copied rather than linked ({errno}).` / `  The write is still atomic; the space saving is not.` **This code exists because US-13 has required the fallback to "record the narrowed guarantee" since v2.0 while providing no code for it** — making the one assertion that mattered available only by string-matching a message, which §Error States forbids outright, since the code and not the prose is the stable contract. A test may assert the fallback path by forcing `link()` to fail and requiring this code with exit unchanged. |
| `E-UPDATE-AVAILABLE` — a newer version of the applied pack is bundled (F3) | **Exit 1, and it is not a failure of the run** — it is the answer. `update`'s read-only mode (the former `status`) reports it and exits 1 so that a CI job can gate on "this project is behind" without parsing output. `lintel: {pack}@{applied} is applied; lintel {cliVersion} bundles {bundled}.` / `  → lintel harness update   to see what would change` **The exit class is deliberate and is the one place in this catalogue where exit 1 reports a question answered rather than a fault.** F3 owns when it fires. |
| `E-UPDATE-NOT-NEWER` — the bundled pack is not newer than the applied one (F3) | Exit 1. `lintel: {pack}@{applied} is applied; lintel {cliVersion} bundles {bundled}, which is not newer.` / `  → Upgrade the CLI: npm i -g @lintel/cli@latest` **`update` never resolves "newer" over the wire** (§NFR *No network*): a project moves to the version bundled in the installed CLI, so the remedy for "nothing newer" is upgrading the package. Covers both equal and older, because the remedy is the same and the two are not separately actionable. |
| `E-UPDATE-PARAM-UNANSWERED` — the newer pack declares a **`required`** parameter with **no `default`** that the manifest has no answer for (F3, US-8, US-69) | Exit 2. `lintel: {pack}@{bundled} declares "{id}", which {pack}@{applied} did not.` / `  {prompt}` / `  Recorded answers cannot supply it, and there is no way to answer it now.` / `  → The pack must give "{id}" a "default". Until it does, re-apply into a fresh directory.` **Exit 2, corrected at v5.6, and the class is the substance.** Class 1 means *you can fix this*, and the user **cannot**: Q-21 and Q-22 forbid supplying or changing an answer after the apply, and **there is no `--set` on `update`** (F3 US-59 — passing one is `E-CLI-UNKNOWN-FLAG`). The thing that is wrong is that a pack introduced an unanswerable parameter across a version boundary, which is an **authoring** fault. **The old remedy line said `→ lintel harness update --set {id}=<value>`** — a flag the command does not accept, so a user who followed it got a second, unrelated error. *A remedy that cannot work is worse than none, because the user believes they tried it*; this is the third time that lesson has been paid for in this catalogue. The remedy now addresses the **pack author**, who is the only party able to act. **A new parameter that declares a `default` is not a fault at all** (US-69): the default is used for `expected_new` and recorded into the rewritten manifest. |
| `E-UPDATE-SCAFFOLD-DROPPED` — the newer pack no longer declares a scaffold the manifest records (F3, US-9, US-69) | Exit 2. **Corrected at v5.6, on the same reasoning as the row above**: the user cannot make the newer pack declare a scaffold it dropped, so *fix this and re-run* is advice nobody can take. `lintel: {pack}@{bundled} no longer declares the scaffold "{name}", which this project selected.` / `  update will not silently drop the files it placed.` / `  → Re-apply into a fresh directory, or remove the scaffold's files by hand first.` Stops the run rather than deleting: the scaffold's steps are gone from the recipe, so the paths it wrote are payload orphans by construction, and the deletion rule that handles orphans would remove a whole selected feature on a version bump. |

---

## Non-Functional Requirements

- **Hashing algorithm.** SHA-256, lowercase hex, all 64 characters, no
  truncation, no salt. Implemented with Node's `crypto` — no dependency.
  It is used in exactly **four** places at v1.0: the journal's intended
  and pre-apply hashes (US-13), `--force` byte-identity (US-13),
  `verify`'s comparison (US-33), and **the manifest's `payloadDigest`**
  (US-10, Q-52).
- **Zero runtime dependencies** (Q-81). The published `@lintel/cli`
  declares **no runtime dependency**. Strict JSON parsing with duplicate-
  key detection and line numbers, `pack.json`/`recipe.json` schema
  validation, the `in` glob matcher, semver comparison, the `.claude/`
  frontmatter reader and the test runner (`node:test`, Node >= 22) are
  hand-rolled or standard library. **The reason is this product's own
  security argument applied to itself:** the CLI writes files into a
  user's repository, four review rounds were spent bounding what a *pack*
  can do through it, and a runtime dependency is code inside that same
  boundary that no pack rule governs. **This is a requirement, not a
  preference** — it is assertable as **no runtime dependency being
  declared**: `dependencies` **empty or absent** in the published
  manifest, and a test asserts it.
  **Corrected at v3.8, by building it.** Through v3.7 this read *"an empty
  `dependencies` object"*, which **`npm install` normalises away** — so
  the literal form does not survive an install and a test asserting it
  fails on a correct package. **The property is what matters; the
  representation is npm's to choose.**
  - **The cost is paid where it falls, not averaged away.** Most of the
    register was hand-rollable on its merits: semver needs comparison but
    no range arithmetic, the glob runs over a known path set with no
    filesystem handle, and the schemas are closed enumerations this
    document already specifies. **Unicode case folding was the one item
    where hand-rolling is a genuine correctness risk**, and it is
    resolved by **narrowing the claim rather than approximating it** —
    `collisionKey` folds ASCII only, documented as known limit 17 (US-3).
  - Build-time and test-time dependencies are unconstrained by this
    requirement; it governs what ships and runs on a user's machine.
- **Tree digest.** `payloadDigest` is the one tree digest in the product
  and has exactly one call site. It is computed over the payload file
  set as `sha256-<hex>` of a canonical listing: one line per file,
  `<posix-relative-path>`, **one U+0020 space**, then the file's own hash,
  joined with `\n`, the files in **byte-ascending path order**.
  **The separator is named because this is a compatibility contract, not
  a formatting detail.** The digest is written into a manifest and
  recomputed by a *later* CLI, so a future build that picks a different
  separator reports every existing project as a tampered payload — and
  through v4.7 this sentence said only "then", which is not a format.
  **One space is unambiguous here even though a path may contain one**,
  because the hash is a fixed 64 hex characters and the grammar forbids a
  segment ending in whitespace: the last 64 characters of a line are the
  hash and everything before the final space is the path, always.
  **A path may contain no control character** (US-3 stage 1), which is
  what stops an entry forging a second line — a `\n` in a path would let
  two different file sets digest alike, a collision inside an integrity
  control. That clause was added at v4.8 for this reason. A file's own hash is
  `hashText(normalizeText(bytes))` for text and `hashBytes(bytes)` for
  binary, by the same text/binary rule as everything else below. The
  digest is a pure function of the payload, so it neither reads a clock
  nor breaks determinism, and it changes when a file's content changes,
  when a file is added or removed, and when a file is renamed.
  **Normalized, deliberately, and the cost is stated:** a raw-byte digest
  would make every Windows clone with `core.autocrlf` report a tampered
  payload, and the price of avoiding that is that a pure line-ending edit
  of the payload is undetectable.
- **Normalization before hashing or comparing (text files).** In this
  exact order: (1) strip a leading UTF-8 BOM; (2) replace every `\r\n`
  and every lone `\r` with `\n`. Nothing else is changed — trailing
  whitespace, blank lines and the presence or absence of a final newline
  are all significant. Two projects whose files differ only in line
  endings compare equal.
- **The glob dialect** (decided at v4.4, U-3). One matcher serves
  `exclude`, `in` and anatomy `paths`. **`*` matches zero or more
  characters within one segment and never crosses `/`; everything else is
  literal** — including `?`, `[`, `]`, `{`, `}`, `!`, and `**`, which is
  two stars and so still single-segment.
  - **Chosen by survey, not by taste:** across all three bundled packs,
    **`*` is the only non-literal character any glob contains**.
  - **`**` is deliberately absent, and the asymmetry decides it.** Adding
    it later is **additive** — every working pattern keeps working —
    while shipping it and withdrawing it would break packs. A dialect can
    grow and cannot shrink.
  - **No classes, braces or negation.** Each is a small grammar with its
    own edge cases, and **G-F1-9** requires the matcher small enough that
    `pack info` renders an apply *completely* — a claim that degrades as
    the pattern language outgrows what a reader can evaluate unaided.
  - **The matcher takes no filesystem handle** (C-27) and is a two-pointer
    walk rather than a compiled `RegExp`: an author-supplied pattern is
    untrusted input, and compiling one would reintroduce the risk C-7
    bounds for `pattern`.
- **Message templates and placeholders** (new at v3.9, from building
  T-0104). A **placeholder** is `{name}` where `name` matches
  `^[A-Za-z][A-Za-z0-9]*$`; **every other brace is literal** and renders
  untouched. Forced by the catalogue rather than chosen: nine brace
  occurrences across the messages are not substitutions — JSON a remedy
  line instructs the user to write, and the quantifier `{1,64}` in a
  recommended `pattern`. **A reader treating every `{…}` as a placeholder
  mangles both.**
  - **A brace preceded by `\p` or `\P` is a Unicode property escape and is
    literal** (v4.2). Without this clause the identifier rule ate `\p{L}`
    and `\p{N}` from `E-PARAM-NO-PATTERN`'s recommended regex and rendered
    `\p200\p64` — **unusable advice**, since a pack author copying it gets
    a regex that does not compile. The same line's `{1,64}` was already
    safe, a quantifier not being an identifier, which is exactly why the
    fault survived v3.9: one brace on the line was handled and two were
    not.
  - **Three slots are described in prose and have no name** —
    `E-RECIPE-STEP-INVALID`, `E-TARGET-EXISTS`, `E-VERIFY-MISMATCH`. They
    render literally under this rule, so the emitting module builds those
    lines itself. **A known gap, not a decision**: naming them would change
    message text three features already cite, so it is recorded here and
    pinned in `catalogue.ts` rather than left to be rediscovered.
  - **A `→` marks a remedy only at the start of a line.**
    `E-REWRITE-UNUSED` renders `"{find}" → "{replace}"` as content in line
    1, so *"any line with an arrow is a remedy"* is wrong about a shipping
    message.
- **Control characters in output** (C-50). Every diagnostic, prompt and
  disclosure row passes through **one escaping function** in `src/diag/`
  before it reaches a stream: **C0 control characters other than `\n` and
  `\t`, plus `U+2028` and `U+2029`, are escaped** to a visible form.
  **An interpolated value is escaped more strictly than a template line**
  (refinement, v3.9): **LF, CR and HT are escaped in values**, where a
  template keeps them. A value is never legitimately multi-line inside one
  diagnostic line, and one carrying a newline followed by `  → ` would
  **forge a remedy line** — a user follows an instruction the CLI never
  gave. That is **C-1's forgery shape one layer down**, and C-50's
  exemption does not reach it because the exemption was written for
  **templates**, which the CLI controls, not for **values**, which a pack
  does.
  **Ordering, and it is load-bearing** (C-58): for the disclosure this
  escaping runs **after** the sentinel scan of US-13, never before.
  Escape-then-scan defeats the scan — it would run over escaped text and
  stop matching the raw sentinel it exists to catch, while the bytes a
  consumer reads are unchanged.
  **Escaped, not refused** — a path or an answer containing one is
  legitimate content and should print rather than abort a run — and
  **stated once rather than per call site**, which is how half of them
  get missed. The fault it closes is concrete: without it a pack can put
  ANSI escapes in a parameter `prompt`, an applied path or an agent's
  frontmatter, and **erase or overwrite the disclosure it had just
  triggered**, or make a prompt ask a different question from the one
  being answered. `E-SUBST-NEWLINE` does not cover this — it bounds a
  substituted value written **into a file**, and bounds nothing that
  reaches a terminal.
- **Binary files.** A file whose bytes are not valid UTF-8, or whose
  first 8 KB contain a NUL byte, is treated as binary: copied verbatim,
  compared raw with no normalization, and excluded from `substitute`,
  `rewrite-path` and `generate`.
- **Phase 1 does no normalization at all.** The payload copy is raw
  bytes in and raw bytes out, including BOMs and CRLF, so
  `.harness/pack/` is byte-identical to the pack directory. Normalization
  belongs to phase 2's comparisons and to `payloadDigest`, **not** to the
  copy — the digest normalizes what it *reads*, and changes nothing on
  disk.
- **Encoding.** UTF-8 only for text produced by phase 2. A BOM is never
  emitted by a phase-2 primitive. No other encoding is read or produced.
- **Determinism.** Phase 2 is a pure function of (payload, parameter
  answers, scaffold selection), **at every applied path, with no
  exception**. No timestamps, absolute paths, usernames, hostnames,
  locale-dependent formatting or random values may appear in any
  generated file **or in the manifest**, and **no primitive reads the
  destination's pre-existing content**. There are **no timestamps
  anywhere in the output**, which is what makes "byte-identical trees"
  true of the whole project rather than of everything except one file.
  **This sentence is unqualified deliberately and it is true as written**
  (F-4, Q-54): the one primitive that made it false — `merge-json`, whose
  destination's prior content was a fourth input — does not ship, so the
  claim needs no "except at a `merge-json` destination" clause and is
  given none. C-22 asked for that narrowing; the narrowing is
  **deliberately not applied**, because the condition's premise is gone.
  A v1.1 reintroducing the primitive reintroduces the exception, and must
  narrow this sentence, G-F1-4, the Introduction, the Technical Context
  row and US-31 **in the same change** (§F1.9).
- **Performance.** On a pack of ≤ 500 files totalling ≤ 8 MB, on a 2020
  laptop-class machine with a warm filesystem cache: full validation and
  in-memory phase-2 render ≤ 1.5 s; phase 1's copy ≤ 0.5 s; phase 2's
  write ≤ 0.5 s; total `init` ≤ 3 s excluding time spent waiting for a
  human. `verify` over the same project completes in ≤ 1.0 s, **payload
  digest included** — one extra bounded walk of `.harness/pack/` and one
  hash per payload file, inside the same budget. Hashing throughput ≥ 50
  MB/s single-threaded.
- **Memory and size bounds.** The entire phase-2 output set is held in
  memory during validation, so: single pack file ≤ 4 MB
  (`E-CONTENT-TOO-LARGE`); total payload ≤ 32 MB
  (`E-PAYLOAD-TOO-LARGE`); peak RSS ≤ 4× total rendered content.
  Phase 1 streams file by file and is not bound by the render budget —
  **except for the phase-2 source set** (C-23). Because phase 2 renders
  entirely at plan time from planner-resolved bytes (US-30), any payload
  file a phase-2 step reads must be **held**, not streamed. That is the
  whole of the cost and it is bounded twice over: the phase-2 source set
  is a small fraction of the payload — the great majority of payload
  files are templates and reference docs that Q-47 keeps in the payload
  precisely so they are *not* copied out, and those still stream — and it
  is capped by the same 4 MB per file / 32 MB per payload limits as
  everything else.
  **Both directory walks are bounded and neither follows a link**: the
  phase-1 payload walk and the `verify` project scan share one
  implementation with maximum depth **32** and maximum **10,000 entries**
  per walk, exceeding either being `E-TRAVERSAL-LIMIT`. Entries are
  `lstat`ed, never `stat`ed. The project scan does not descend into
  `.git/`, `.hg/`, `.svn/` or `node_modules/`. A regex used anywhere on
  untrusted input is bounded by a length check that runs first (US-8), so
  pattern evaluation cannot be made to run long.
- **Atomicity.** Validate-then-write, across **both phases**. No file is
  written — payload included — until every check on both phases has
  passed. Each file is written via write-temp-then-rename, so a
  concurrent reader never sees a partial file. A journal precedes the
  write phase and is removed only after the manifest lands. A crashed
  apply is always detectable and is reversible by
  `lintel harness init --rollback` without data loss for any file the
  user has since touched.
- **Rollback safety.** **Rollback deletes only paths this apply created,
  restores only paths this apply overwrote, and acts on neither unless
  the on-disk bytes are still exactly what this apply wrote.** A path the
  apply merely overwrote — including a `--force` byte-identical
  collision — is restored from its recorded backup or left alone, never
  deleted. **A `--force` byte-identical collision whose on-disk basename
  differs from the planned one is not written at all** (C-36, US-13): the
  journal records the on-disk path, so rollback's "leave untouched" leaves
  the directory entry named as the user had it, rather than leaving it
  named as the `rename` that should never have run had renamed it.
  It never deletes a directory that contains an unrecorded file,
  and it removes created directories in reverse creation order and only
  when empty. The five cases are enumerated exhaustively in US-13.
- **Idempotency.** Two applies into two empty directories with identical
  inputs produce byte-identical trees and byte-identical manifests. There
  is no in-place re-apply at v1.0 (US-14).
- **Cross-platform.** Identical trees and identical manifests on macOS,
  Linux and Windows, modulo the executable bit, which Windows does not
  represent and which `verify` does not compare there. Case-only and
  normalization-only collisions are rejected at validation so a pack
  cannot be applicable on Linux but broken on macOS.
- **No network.** `init`, **`update`**, `validate`, `verify` and
  `pack info` make no
  network request. Packs are bundled (Q-2); the payload is local (Q-41).
  **`update` is named here as of Q-62** and it does not weaken the
  claim: the newer version it moves a project to is the one bundled in
  the installed CLI, so "newer" is resolved by upgrading the package,
  never by fetching over the wire. The quantifier is **every v1.0
  command**, so a later command joins this list or breaks it.
- **Offline privacy.** Nothing about a project or its parameter answers
  leaves the machine. There is no telemetry.
- **Concurrency.** Commands that write take an advisory lock at
  `.harness/lock`; a second concurrent command in the same project fails
  fast rather than interleaving writes. **The lock is never broken
  silently.** It holds `{ pid, host, startedAt, cli }` and is acquired
  with an exclusive create. On finding one already present, it is broken
  **only** when all three hold: the recorded `host` is this host, the
  recorded `pid` is not alive, and `startedAt` is older than 60 s —
  reported as `W-LOCK-STALE-BROKEN`. Otherwise the command fails with
  `E-LOCK-HELD`, exit 1. `verify` takes no lock, because it writes
  nothing. **There is no consent gate at v1.0** (Q-54, US-13), so nothing
  can decline an apply after the lock is taken; a v1.1 reinstating the
  gate must place it **before** the lock, so that a declined apply does
  not contend for one or leave one behind.
- **Filesystem safety — confinement is by resolution, not by string.**
  The project root is resolved once per run with `realpath()`, and every
  applied path is judged against the *resolved* root. Below it: every
  ancestor component is `lstat`ed and the CLI refuses to traverse or
  create through a symlink, junction or other reparse point
  (`E-DEST-SYMLINK`); needed directories are created one level at a time,
  each checked before the next; and the resolved parent joined with the
  final basename must be a **strict descendant** of the resolved root.
  Applied paths are additionally checked against the reserved-destination
  denylist on the **resolved** path — `.git`, `.hg`, `.svn`, `.github`,
  `.vscode`, `.idea`, `node_modules`, `.circleci` and `.devcontainer` at
  **any segment**; `.harness/` as a first segment, **the only location
  entry in this document**; `package.json`, `.envrc`, `.npmrc`,
  `.yarnrc.yml`, `Makefile`, `GNUmakefile`, `justfile`, `.justfile`,
  `.mcp.json`, `.gitlab-ci.yml`, `Jenkinsfile`, `azure-pipelines.yml` and
  `bitbucket-pipelines.yml` by basename; `settings.json` and
  `settings.local.json` under **any `.claude` segment**; and the CLI's own
  install directory (US-3
  stage 2, C-31, C-33, C-39, C-41) — and against the
  anchored grammar of US-3 — which is where reserved Windows basenames
  and characters illegal on Windows are rejected, as one rule rather than
  several. No symlink is written, and none is followed out of the pack.
  Every applied path is produced by that single gate and carries a
  branded type, so a path that skipped it cannot reach a writer without a
  compile error; each write re-checks immediately beforehand and creates
  exclusively (`E-TARGET-RACE`).
- **Bounded capability. This requirement is narrowed at v2.4, and the
  narrowing is the point** (C-31). Through v2.3 it claimed *"there is no
  code execution path from a pack to the host at v1.0"* and said each
  clause of that claim was enforced clause by clause. **The claim was
  false as written.** The clause list enumerated `postinstall` and
  command-valued settings keys and stopped there, while
  `{ "op": "copy", "from": "ci/", "to": ".github/workflows/" }` passed
  every stage and wrote a file that executes attacker-chosen code on the
  user's next push with a repository token — strictly more capability
  than the route the list did name. An absolute claim with an enumerated
  proof is only as strong as the enumeration, and stating it as an
  absolute is what stopped anyone extending the enumeration. What is
  claimed now is what the rules enforce:

  **A pack's entire effect on a machine at apply time is the six
  primitives applied to confined paths, and every execution route this
  document has identified is closed by a named rule with an adversarial
  fixture behind it.** The routes, each testable:
  - *no script primitive* — the closed six-member op set,
    `E-RECIPE-PRIMITIVE-UNKNOWN`, matched literally (US-31). **This one
    is absolute**, because the set is closed by construction rather than
    by enumeration of what is excluded;
  - *no hook registration* — nothing writes a Claude Code settings file,
    because `settings.json` and `settings.local.json` are reserved
    **under any `.claude` segment** for every step by every route,
    `E-MAP-RESERVED-DEST` (US-3 stage 2, C-39a), and hooks were outside
    the ownable set by format decision before that (US-3). **This clause
    is what the whole Q-54 deletion rests on, and through v2.4 it was
    false as written**: the reservation named two root-relative paths
    while this document asserted that a nested `.claude/` is live, so
    `docs/.claude/settings.json` passed every stage;
  - *no command-valued settings key* — same rule: the file cannot be
    written at all, so `statusLine`, `apiKeyHelper` and their kin are
    unreachable rather than merely unownable;
  - *no MCP server declaration* — `.mcp.json` declares MCP servers as
    **command lines the runtime launches**, and is reserved by basename
    at any depth (C-41). It is the sibling of `.claude/settings.json` and
    was absent from the spec set entirely through v2.4;
  - *no `postinstall` and no other package-manager or build-tool
    entry point* — `package.json`, `.envrc`, `.npmrc`, `.yarnrc.yml`,
    `Makefile`, `GNUmakefile`, `justfile` and `.justfile` are reserved by
    basename at any depth (C-31, C-41);
  - *no CI pipeline on any provider this document has identified* —
    `.github` and `.circleci` at any segment, `.gitlab-ci.yml`,
    `Jenkinsfile`, `azure-pipelines.yml` and `bitbucket-pipelines.yml` by
    basename (C-31, C-41). The class closed GitHub Actions and no other
    provider through v2.4, while the bundled `coding` pack ships an
    **Azure** scaffold;
  - *no editor, container or tool-directory execution* — `.vscode`,
    `.idea`, `.devcontainer` and `node_modules` are reserved at **any**
    segment (C-31, C-39d, C-41); `node_modules` doubly so, since
    `verify`'s scan does not descend there **at any depth**, which is why
    a first-segment scoping closed only half of it;
  - *no VCS hook* — `.git`, `.hg` and `.svn` are reserved at **any**
    segment, so a nested repository's hooks are unreachable too (C-33);
  - *no pack-declared tool permission and no pack-selected permission
    mode* — a file a pack writes **or ships** under a `.claude` segment
    may not declare a permission-bearing frontmatter key,
    `E-CLAUDE-TOOL-GRANT` (US-3, C-32a, C-39c), and an agent file's
    `permissionMode` may take only a pinned **non-widening** value,
    `E-CLAUDE-PERMISSION-MODE` (C-40). Together these close the
    `allowed-tools`-plus-`!`-line route through the directory a pack is
    supposed to write to, the same route through a `.claude/` subtree a
    pack merely *ships*, and `permissionMode: bypassPermissions` on an
    agent that also declares `Bash`.

  **Three limits on that statement, stated because the previous version's
  fault was omitting them:**
  1. **Every route but the first is closed by a denylist, and a denylist
     is incomplete by construction.** It closes what it names. It is not
     a proof that nothing else executes what a pack writes, and no such
     proof is offered. **`.mcp.json` is the evidence rather than a
     hypothetical** (C-41): it sat outside the list through v2.4, one
     `copy` away, while the list's own category named exactly it.
  2. **A pack does place content an agent runtime reads and acts on.**
     `.claude/agents/*.md` declare `tools:` — **two** of `coding`'s ten
     declare `Bash` (`implementer`, `testwriter`) and `researcher`
     declares `WebSearch, WebFetch`, **the only network capability any
     v1.0 pack ships** (C-45) — and `CLAUDE.md`, `AgentTeams/*.md` and
     the command
     files are instructions a model follows. None of it is a grant: the
     permission engine that decides what actually runs lives in
     `.claude/settings.json`, which no pack can write at any `.claude`
     segment. But it is not
     nothing, and it is **disclosed verbatim** rather than claimed away
     (US-13, C-28, C-32b). **Note the distinction the network capability
     draws**: §NFR *No network* is a property of the **CLI** — `init`,
     `update`, `validate`, `verify` and `pack info` make no request —
     and it says
     nothing about what the runtime does with content the pack placed.
     The two claims are not the same claim, and stating one has never
     implied the other.
  3. **The `.claude/` frontmatter rule is pinned against a contract this
     document does not own** — key names **and** the non-widening mode
     values (C-40). If the runtime adds a permission-bearing key or a
     mode, the pin must follow (§F1.9). The key half fails **open** if it
     goes stale; the value half fails **closed**, which is why a value
     pin is acceptable where a tool allowlist was not.

  What is invariant, testable and asserted without qualification: the
  primitive set is closed and matched literally; every applied path
  passes one confinement gate; and every rule above is exercised by an
  adversarial fixture pack in CI (US-16), which is the difference between
  an invariant that is asserted and one that is tested.
- **Legibility (G6).** `pack.json`, `recipe.json` and the manifest are
  readable by a human without tooling: 2-space-indented JSON, stable key
  order. **The manifest fits on a screen, and this still holds at six
  keys** — `payloadDigest` adds one line of one value, not a list, and
  the §F1.4 worked example is the complete file at 16 lines. That is a
  deliberate consequence of Q-43 and Q-52 rather than an accident, and it
  is the property that would be lost first if the per-file hash list ever
  came back.

---

## Flows / Behaviour

### F1.1 — The two phases

| | Phase 1 — payload | Phase 2 — application |
|---|---|---|
| **What** | Verbatim copy of the pack folder | Copies out and wires up the working parts |
| **Destination** | `.harness/pack/` | Project root, `.claude/`, `copy/`, scaffold dirs |
| **Varies by pack?** | **No** — identical mechanism for every pack | **Yes** — each pack ships its own recipe |
| **Transformation** | None | Renames, path rewrites, substitution, generation |
| **Reads from** | The bundled pack in the CLI, **once** | `.harness/pack/` as its **logical** input (Q-41), never the bundle. Rendered **at plan time** from the bytes that read produced; the executor reads nothing (C-23). `.harness/pack/` is the literal input only at `verify` |
| **Run by** | The CLI, automatically | The CLI, automatically — never the user (Q-40) |
| **Validation** | Path confinement, no symlinks, traversal and size bounds | The whole of §Error States |

Phase 1 is a dumb copy on purpose. Because it transforms nothing, it
cannot fail in an interesting way, and the result is byte-identical to
the pack that shipped. Everything that varies is pushed into phase 2,
where it is declared and inspectable.

### F1.2 — The recipe: six primitives

Every step carries an `op`, and may carry `when`, **`adaptExpected`** and
**`fillExpected`** (US-31 — both JSON booleans defaulting to `false`).
**`fillExpected` was missing from this sentence until v5.3**, while the
table three lines below has listed it as optional on all six primitives
since Q-79: a closed list of two where the fact is three. And the
parenthetical read *"read only by `verify`"*, which is true of
`adaptExpected` and **false of `fillExpected`** — that one has two
consumers, the second being `update`'s **absolute prohibition** on
overwriting the path, which is the whole reason Q-79 states the rule in
this document rather than leaving it to F3.
**Every applied path in
a step's write set** — not merely its `to`, which two of the six do not
have — passes the four-stage confinement gate of US-3.

| `op` | Required | Optional | Reads | Writes | **Write set** |
|---|---|---|---|---|---|
| `copy` | `from`, `to` | `exclude`, `executable`, `when`, `adaptExpected`, `fillExpected` | payload file or directory | applied path(s), basenames unchanged | every applied path its recursion expands to, `exclude` applied |
| `rename` | `from`, `to` | `when`, `adaptExpected`, `fillExpected` | payload **file** | one applied path, basename may differ | its `to` |
| `strip-suffix` | `from`, `to`, `suffix` | `exclude`, `executable`, `when`, `adaptExpected`, `fillExpected` | payload file or directory | applied path(s) with `<suffix>` dropped from the basename | every applied path its recursion expands to, suffix already stripped |
| `rewrite-path` | `in`, `find`, `replace` | `when`, `adaptExpected`, `fillExpected` | applied text files already written | the same files, in place | **every written-set path its `in` globs match** — matched, not hit: a path whose content lacks `find` is still in the set |
| `substitute` | `in` | `tokens`, `when`, `adaptExpected`, `fillExpected` | applied text files already written | the same files, in place | **every written-set path its `in` globs match**, on the same terms |
| `generate` | `template`, `to`, `anchors` | `when`, `adaptExpected`, `fillExpected` | payload template | one applied path, substituted, anchors asserted | its `to` |

**The write set is a named concept because it is the quantifier every
destination rule uses** (C-19). A rule quantified over `to` has **two
silent exemptions** — `rewrite-path` and `substitute` have no `to` — and
that is how the reserved-destination denylist and the deleted settings
policy both lapsed while remaining literally true of the text they were
written about. The write set is a **pure function of the pack**: no
project, no filesystem, so `validate` computes it in CI. It is computed
**once**, after US-16 step 5, and consumed by steps 6, 7 and 8.

**Validation per primitive**

| `op` | Checks, in addition to the destination gate over the write set |
|---|---|
| `copy` | `from` exists (`E-RECIPE-SOURCE-MISSING`); directory `from` implies directory `to`; a file `from` must not change basename; `exclude` globs are relative to `from`; `executable` obeys `executableRoots` |
| `rename` | `from` is a single file, not a directory (`E-RECIPE-STEP-INVALID`) |
| `strip-suffix` | `suffix` matches `^\.[a-z0-9-]{1,16}$`; at least one selected basename carries it |
| `rewrite-path` | `in` resolves **only** against the plan's ordered written-set and never the filesystem, the payload or the project (US-4); it matches at least one such path (`E-RECIPE-STEP-INVALID`); every matched path is re-checked against the stage-2 denylist (`E-MAP-RESERVED-DEST`); `find` matches at least once (`E-REWRITE-UNUSED`); neither `find` nor `replace` contains a line break |
| `substitute` | `in` resolves by the **identical** rule and gets the **identical** denylist re-check — the two clauses are deliberately word-for-word, because through v2.2 `substitute`'s was weaker and rested on one table cell; every `{{harness:…}}` token resolves (`E-SUBST-UNRESOLVED`); no substituted value contains a line break (`E-SUBST-NEWLINE`) |
| `generate` | **`template` exists in the payload (`E-RECIPE-SOURCE-MISSING`)** — the same check `from` gets on the other five primitives, at the field that carries `generate`'s source (C-38); anchors appear exactly once each and are balanced (`E-ANCHOR-INVALID`); substitution rules as above. All three v1.0 packs declare `"adaptExpected": true` on this step (Q-56, Q-61), which is checked as a boolean like any other (US-1) and is otherwise inert until `verify` runs |

**Two checks apply to every primitive in both tables and are stated once
here rather than repeated six times.** (1) Every applied path in the
step's write set passes the four-stage confinement gate of US-3,
including the stage-2 denylist as extended at v2.4 and again at v2.5
(C-31, C-33, C-39, C-41).
(2) **Any rendered output the step produces at an applied path with a
`.claude` segment is checked for a permission-bearing frontmatter key**
(`E-CLAUDE-TOOL-GRANT` and `E-CLAUDE-PERMISSION-MODE`, exit 2, C-32a,
C-40), at US-16 step 11 where rendered
bytes exist. The second is quantified over the write set for the same
reason the first is: `rewrite-path` and `substitute` have no `to`, and a
check written over `to` would exempt exactly the two primitives that
change a file's bytes after it was placed.

**A third check applies to no primitive at all, and that is why it is
stated here** (C-39c). The **phase-1 payload set** is outside every
quantifier in this table — it is not a step, it has no `to` and no write
set — and it is where the same two codes fire a second time, on payload
bytes, at US-16 step 3 (US-30). A `.claude/` subtree a pack ships but
never copies out reaches the project all the same, at
`.harness/pack/.claude/`, which is committed. Two disjoint sets, two
quantifiers, one rule; widening the write set to cover the second would
break the `AppliedPath`/`HarnessPath` separation C-14 rests on.

**`merge-json` is not in either table** (Q-54). It was a seventh
primitive taking `from`, `to` and `ownedKeys`, and it is deleted rather
than disabled: an `op` of `"merge-json"` is `E-RECIPE-PRIMITIVE-UNKNOWN`
like any other unrecognised value. It was the only primitive that read
its destination's existing content, which is why removing it makes
§NFR's determinism sentence and §F1.8's recomputation identity true
without qualification.

**Ordering.** Steps run in declared order: base `steps`, then each
selected scaffold's steps in `pack.json`-declared scaffold order. The
placing primitives (`copy`, `rename`, `strip-suffix`, `generate`) create
applied paths; the editing primitives (`rewrite-path`, `substitute`)
operate on paths that already exist. A recipe that edits before it places
fails validation rather than silently doing nothing.

**This paragraph is about ordering, not authority, and the write set does
not change it.** A `substitute` whose `in` matches a path an earlier
`copy` placed is legitimate — it is the shape every v1.0 pack uses — so
`E-MAP-COLLISION` must **not** widen to "two steps have the path in their
write sets". It stays "two steps **place** the same applied path",
computed over the placing primitives across the merged step set. The
obvious wrong fix here breaks all three bundled packs, which is why it is
named.

**Determinism.** No primitive reads a clock, an environment variable, the
network, a hostname, a username or a locale. No primitive produces output
that depends on the order in which the filesystem returns directory
entries: a directory recursion is walked in **byte-ascending path
order**. Two applies of the same pack version with the same answers
produce byte-identical trees.

**Conditional steps.** `"when": { "<paramId>": "<value>" }` on any step
skips it unless the recorded answer equals that value. This is the only
mechanism by which pack content varies with an init answer, and the
`planning` pack's `calibrations/<name>/` layout is a convention over it:

```json
{ "op": "copy", "from": "calibrations/high-floor/",      "to": "portfolio/",
  "when": { "constraintFloor": "high-floor" } },
{ "op": "copy", "from": "calibrations/near-zero-floor/", "to": "portfolio/",
  "when": { "constraintFloor": "near-zero-floor" } }
```

Both source trees ship in the payload and both land in `.harness/pack/`;
only one is copied out. That is a deliberate consequence of phase 1
copying verbatim — the user can read the calibration they did not choose,
which is a feature, and it is why `pack info` can describe both without
applying either.

### F1.3 — `pack.json` and `recipe.json`, worked against the real coding pack

`packs/coding/pack.json`:

```json
{
  "formatVersion": 1,
  "name": "coding",
  "version": "1.0.0",
  "title": "Coding — a gated spec process, 10 roles, 2 agent teams, targets",
  "minCliVersion": "1.0.0",
  "recipe": "recipe.json",

  "provenance": {
    "source": "this repository's own .claude/ and specifications/ trees",
    "commit": "<the commit the migration was taken from>"
  },

  "executableRoots": ["infrastructure/backend-deploy/"],

  "anatomy": {
    "process":               { "paths": ["specifications/README.md"] },
    "roles":                 { "paths": ["agents/*.md"] },
    "documentTemplates":     { "paths": ["specifications/*.template.md"] },
    "conventions":           { "paths": ["specifications/conventions.md"] },
    "coordination":          { "paths": ["agent-teams/*.md"] },
    "behaviouralGuidelines": { "paths": ["CLAUDE.md.template"] },
    "folderScaffolding":     { "declaredBy": "recipe" },
    "skillsAndAutomations":  { "paths": ["commands/*.md"] },
    "autonomyContract":      { "paths": ["targets/*.md"] }
  },

  "parameters": [
    { "id": "projectName", "type": "string", "prompt": "Project name",
      "required": true, "pattern": "^[\\p{L}\\p{N} ._-]{1,64}$", "maxLength": 64 },
    { "id": "stack", "type": "string",
      "prompt": "Primary stack, one line (appears in CLAUDE.md)",
      "default": "", "pattern": "^[\\p{L}\\p{N} ./+_-]{0,120}$", "maxLength": 120 }
  ],

  "scaffolds": [
    { "id": "backend-azure", "category": "backend",
      "description": "Azure Static Web App + Neon Postgres, Bicep + scripts" },
    { "id": "backend-aws", "category": "backend",
      "description": "AWS Lambda + CDK" }
  ]
}
```

`packs/coding/recipe.json`:

```json
{
  "formatVersion": 1,
  "steps": [
    { "op": "copy", "from": "agents/",      "to": ".claude/agents/",
      "exclude": ["README.md"] },
    { "op": "copy", "from": "commands/",    "to": ".claude/commands/" },
    { "op": "copy", "from": "agent-teams/", "to": "AgentTeams/",
      "exclude": ["README.md"] },
    { "op": "copy", "from": "targets/Run.md", "to": "targets/Run.md" },

    { "op": "strip-suffix", "from": "copy/", "to": "copy/", "suffix": ".template" },
    { "op": "rename", "from": "specifications/README.template.md",
                      "to":   "specifications/README.md" },
    { "op": "rename", "from": "specifications/project-brief.template.md",
                      "to":   "specifications/project-brief.md" },

    { "op": "rename", "from": "applied-readmes/agentteams.md",
                      "to":   "AgentTeams/README.md" },
    { "op": "rename", "from": "applied-readmes/specifications-general.md",
                      "to":   "specifications/general/README.md" },
    { "op": "rename", "from": "applied-readmes/specifications-version.md",
                      "to":   "specifications/v1.0/README.md" },
    { "op": "rename", "from": "applied-readmes/targets.md",
                      "to":   "targets/README.md" },
    { "op": "rename", "from": "applied-readmes/copy.md",
                      "to":   "copy/README.md" },

    { "op": "rewrite-path",
      "in": ["targets/Run.md", ".claude/commands/target.md"],
      "find": "template/targets/", "replace": ".harness/pack/targets/" },

    { "op": "substitute",
      "in": ["specifications/README.md", "specifications/project-brief.md",
             "AgentTeams/*.md"] },

    { "op": "generate", "template": "CLAUDE.md.template", "to": "CLAUDE.md",
      "anchors": ["overview", "layout", "process", "agents",
                  "conventions", "targets"],
      "adaptExpected": true }
  ],

  "scaffolds": {
    "backend-azure": [
      { "op": "strip-suffix", "from": "scaffolds/backend-azure/",
        "to": "infrastructure/backend-deploy/", "suffix": ".template",
        "exclude": ["*.sh.template", "*.ps1.template"] },
      { "op": "strip-suffix", "from": "scaffolds/backend-azure/",
        "to": "infrastructure/backend-deploy/", "suffix": ".template",
        "exclude": ["*.bicep.template", "*.bicepparam.template",
                    "README.template.md"],
        "executable": true },
      { "op": "rename", "from": "applied-readmes/infrastructure.md",
        "to": "infrastructure/README.md" }
    ],
    "backend-aws": [
      { "op": "strip-suffix", "from": "scaffolds/backend-aws/",
        "to": "infrastructure/backend-deploy/", "suffix": ".template",
        "exclude": ["*.sh.template", "*.ps1.template"] },
      { "op": "strip-suffix", "from": "scaffolds/backend-aws/",
        "to": "infrastructure/backend-deploy/", "suffix": ".template",
        "exclude": ["*.ts.template", "*.json.template",
                    "README.template.md"],
        "executable": true },
      { "op": "rename", "from": "applied-readmes/infrastructure.md",
        "to": "infrastructure/README.md" }
    ]
  }
}
```

**Each backend scaffold is three steps: two `strip-suffix` steps and one
`rename`.** The `strip-suffix` **split into two is what `executable`
costs** (C-38); the third step is the `infrastructure/` folder README
Q-60 added, and it is described where the folder rule is worked below.
`"executable"` is a property of a **step**,
so a single recursive `strip-suffix` over a mixed directory would write
`main.bicep`, `production.bicepparam` and the folder README `0755`
alongside the four scripts. The scaffold therefore declares the same
recursion twice with **complementary `exclude` lists** — scripts in one
step, everything else in the other. Three things follow and each is
worth stating, because an author will meet all three:

- **An overlap is caught for free.** Two steps writing one applied path
  is `E-MAP-COLLISION` (US-3), so exclude lists that fail to partition
  *by intersecting* fail validation rather than racing.
- **A gap is not caught, and that is a real limit.** A file matched by
  neither step's inclusion is simply not copied out; nothing in the
  format knows the author meant to copy the whole directory. The link
  check (US-16 step 13) and the folder-README check (step 12) catch the
  cases that matter for these two scaffolds, and the residual is recorded
  in §F1.9.
- **The alternative was rejected.** A per-file `executable` list, or a
  glob-valued `executable`, would put a second selection language inside
  a primitive that already has one (`exclude`), for one pack. Two steps
  with two excludes uses the mechanism that exists.

`backend-azure`'s executable step writes exactly **four** applied paths —
`deploy.sh`, `deploy.ps1`, `setup-neon.sh`, `setup-neon.ps1`, all under
`infrastructure/backend-deploy/` — against `executableRoots`'
one declared prefix and the cap of **32**, and each appears as a
**disclosure line** in `init`'s pre-write summary and in `pack info`
(C-12, US-29). The base combination, which selects no backend, writes
**none**, so the disclosure has a real empty case and a real non-empty
case and US-16 asserts both.

Read against `CLAUDE.md` §Dogfooding's nine manual steps, this is the
whole of that log:

| Manual step | Primitive |
|---|---|
| 1 `specifications/` kit → `specifications/` | `rename` ×2, plus the folder READMEs that bring `specifications/general/` and `specifications/v1.0/` into existence; **the templates themselves stay in the payload** (Q-47) |
| 2 `agent-teams/` → `AgentTeams/` | `copy` — the directory rename is the `to` value |
| 3 `targets/` → `targets/` | `copy` of `Run.md` only; the README and the template stay in the payload |
| 4 `tone-of-voice.template.md` → `tone-of-voice.md` | `strip-suffix` |
| 5 agents + commands → `.claude/` | two `copy` steps |
| 6 path rewrites in three files | one `rewrite-path` over two files — the third, the payload's own `targets/README.md`, is never copied out, and the applied `targets/README.md` comes from `applied-readmes/targets.md` instead |
| 7, 8 rewrote two self-describing READMEs | **none, and none is needed** — under Q-46 that prose is deleted from the pack, so the files are correct in the payload and are never copied out |
| 9 moved the brief into `specifications/` | `rename` |

Rows 7 and 8 are the two that forced the old marked-region grammar into
existence. They now cost nothing, which is the single largest
simplification in this document.

**Note what is *not* here, and note that it is now unwritable rather than
merely unwritten.** There is no `settings.json` step, because there
**cannot** be one: `settings.json` and
`settings.local.json` are reserved destinations under **any** `.claude`
segment (US-3 stage 2, C-39a),
refused to every step by every route — including
`docs/.claude/settings.json`, which passed every stage through v2.4. The
`coding` pack ships **no default
permission set**, and no v1.0 pack can.

**There is likewise no `.github/` step, no `.mcp.json` step, no
`package.json` step and no
`Makefile` step** (C-31, C-41). A recipe that added
`{ "op": "copy", "from": "ci/", "to": ".github/workflows/" }` — two
tokens away from the `agents/` step above — passed every stage through
v2.3 and wrote a workflow that runs on the user's next push with
`GITHUB_TOKEN`. A recipe that added
`{ "op": "copy", "from": "mcp/servers.json", "to": ".mcp.json" }` passed
every stage through **v2.4**, and `.mcp.json` declares MCP servers as
command lines the runtime launches — the same capability class, arriving
through a file the spec set had never named. Class 2 of the denylist now
refuses both, along with `.vscode`, `.idea`, `node_modules`,
`.circleci`, `.devcontainer`, `.envrc`, `.npmrc`,
`.yarnrc.yml`, `Makefile`, `GNUmakefile`, `justfile`, `.justfile`,
`.gitlab-ci.yml`, `Jenkinsfile`, `azure-pipelines.yml` and
`bitbucket-pipelines.yml` — **each at any segment or any depth**, so
`docs/.github/workflows/ci.yml` and `pkg/node_modules/.bin/foo` are
refused too (C-39d). **And note what `coding` *does*
write under `.claude/` and what it may not put there** (C-32, C-40): the
two
`copy` steps place ten agent files and the pack's command files, which is
the point of the pack — but no file they place may declare a permission
decision in its frontmatter (`E-CLAUDE-TOOL-GRANT`), an agent file's
`permissionMode` may take only a pinned non-widening value
(`E-CLAUDE-PERMISSION-MODE`), and the ten
agents' **whole frontmatter blocks** are **disclosed verbatim** before
the apply
writes anything — which is what makes the three `permissionMode: readonly`
declarations visible. No bundled `coding` command declares
`allowed-tools` and no bundled agent declares a widening mode,
so the rules cost this recipe nothing; they are here so that the next
recipe cannot.

Through v2.2 this note said something weaker — that the destination
policy and the consent gate were "enforced against the format while
costing exactly zero at v1.0". That was the whole difficulty: an
apparatus with no consumer is an apparatus nobody exercises, and both
CRITICALs of the 2026-08-31 re-review landed inside it. Q-54's answer is
to delete the apparatus and forbid the destination, so what remains is
**one denylist entry, exercised by five fixture packs in CI** (US-16)
rather than a table nothing runs. The capability returns in v1.1 with its
controls; §F1.9 says what those are.

**Twenty-one declared steps** — fifteen base plus **three** in each of
the two scaffolds (C-38 for two of the three, Q-60 for the third) —
against a bound of **256** (US-31, C-30). An order of
magnitude of headroom above the largest v1.0 pack, which is what keeps
`pack info`'s complete rendering a control a reader actually finishes
rather than one that degrades silently as recipes grow.

**Note also** that `backend-azure` and `backend-aws` share
`"category": "backend"`. Selecting both is `E-SCAFFOLD-EXCLUSIVE`, not a
path collision on `infrastructure/backend-deploy/`. Both diagnostics are
true; only one is useful.

**How folders come into existence, worked** (Q-50). There is no
`skeleton/` tree and no `mkdir` primitive. Every folder this recipe
creates is created by a file landing in it, and every such folder carries
a README, so none is ever empty. `coding` creates **six** folders that
would otherwise need one, and all six are `rename` steps out of
`packs/coding/applied-readmes/` — which exists on disk with exactly those
**six** files and no others. **Five are unconditional and sit in the base
recipe above; the sixth is `infrastructure.md`, placed by each backend
scaffold's third step**, so it exists in exactly the combinations that
create the directory:

| Payload file | Applied path | The folder it brings into existence |
|---|---|---|
| `applied-readmes/agentteams.md` | `AgentTeams/README.md` | `AgentTeams/` (also populated by the `agent-teams/` copy) |
| `applied-readmes/specifications-general.md` | `specifications/general/README.md` | `specifications/general/` |
| `applied-readmes/specifications-version.md` | `specifications/v1.0/README.md` | `specifications/v1.0/` |
| `applied-readmes/targets.md` | `targets/README.md` | `targets/` (also populated by `Run.md`) |
| `applied-readmes/copy.md` | `copy/README.md` | `copy/` (also populated by the `strip-suffix`) |
| `applied-readmes/infrastructure.md` | `infrastructure/README.md` | `infrastructure/` — **conditional: placed by whichever backend scaffold is selected**, and by neither when none is (Q-60) |

The two remaining `coding` folders need no new file: `specifications/`
gets its README from the `specifications/README.template.md` rename, and
`infrastructure/backend-deploy/` carries one out of whichever backend
scaffold is selected — specifically out of that scaffold's
**non-executable** step, whose `exclude` list keeps
`README.template.md` in and the scripts out (C-38). Same branch, same
combination, which is what step 12 requires.

**`infrastructure/` itself is the sixth folder, and it was a real
defect** (Q-60). Step 12 quantifies over the **proper directory
prefixes** of a combination's applied paths, and
`infrastructure/backend-deploy/main.bicep` has two of them —
`infrastructure/backend-deploy/`, which the scaffold's own
`README.template.md` covers, and the intermediate `infrastructure/`,
which **no step wrote anything into**. Every backend combination
therefore reported `W-FOLDER-README-MISSING` for `infrastructure/`, and
that finding was correct: an author is expected to change something. It
is **fixed rather than reclassified** — `coding` gains
`applied-readmes/infrastructure.md`, and **each backend scaffold places
it as its third step**, in the same branch that creates the directory,
which is what step 12 requires. Placing it once, unconditionally, would
be wrong twice over: it would create `infrastructure/` in the base
combination, which selects no backend and needs no such directory, and it
would be an unconditional README for a conditional directory — the exact
shape the check exists to find. **The two backend scaffolds are
alternatives in one category** (`E-SCAFFOLD-EXCLUSIVE`, above), so at
most one of the two `rename` steps ever runs and the duplicate
destination is **not** an `E-MAP-COLLISION`: collisions are computed per
parameter combination, and no combination contains both.
**`.harness/` gets none**: it is tool-owned and excluded from Q-50 on the
same reasoning as `.claude/`, and C-5 forbids a recipe step writing there
under any circumstance (US-3 stage 2). `applied-readmes/` itself stays in
the payload like every other payload directory; only these six files are
copied out of it, and each by an ordinary `rename`.

**`coding`'s `pack.json` above omits `folderReadme`** and therefore takes
the default `README.md`, which is why every applied path in the table
ends `/README.md`. `planning` omits it too; `writing` declares
`"folderReadme": "index.md"` (F5), and the key is one path segment under
US-1's rule. **This table is what US-16 step 12 checks mechanically**:
for every parameter combination, every directory the combination's
applied paths imply, outside `.claude/` and `.harness/`, must receive
`<dir>/README.md` from that same combination, or the combination reports
`W-FOLDER-README-MISSING`. Note where that bites here:
`infrastructure/` and `infrastructure/backend-deploy/` **both** exist
only in the combinations that select a backend scaffold, and both READMEs
arrive from inside the selected scaffold's own steps — **same branch,
same combination**. The intermediate directory is the one that was
missed, and it was missed because it is implied by a path rather than
named by a step, which is precisely the case a check quantifying over
proper prefixes is for. A
scaffold that created the directory while the README came from an
unconditional step would still pass; the reverse — an unconditional
directory whose README is conditional — is the failure step 12 exists to
find.

### F1.4 — The manifest, worked

`.harness/manifest.json`, in full — this is not an abridgement:

```json
{
  "manifestVersion": 1,
  "cli": "1.0.0",
  "pack": {
    "name": "coding",
    "version": "1.0.0",
    "formatVersion": 1
  },
  "payloadDigest": "sha256-3f9a1c4e8b2d5706a1ff03c9d84e7b6215ac9048d3e17fb5c206a9184db73e2c",
  "parameters": {
    "projectName": "Lintel Harness",
    "stack": "Node 22 / TypeScript CLI"
  },
  "scaffolds": []
}
```

What each field is *for*, since a field with no consumer is a field that
will rot:

| Field | Consumer | Why |
|---|---|---|
| `manifestVersion` | every command | Refuse a manifest a newer CLI wrote (US-15) |
| `cli` | `verify`, `update` | Warn when a CLI behaviour change would reinterpret this project |
| `pack.name`, `pack.version` | `verify`, `update` | "you applied `coding@1.0.0`, latest is `coding@1.4.0`" |
| `pack.formatVersion` | `verify` | The payload's format, versioned separately from the manifest's |
| `payloadDigest` | `verify` (**checked first, fail-closed**), `update` (**must check it before classifying anything** — C-11's concern, restated for Q-62: there is no merge, and the digest gates the recomputation that classification depends on) | One tree digest over `.harness/pack/`, so the recomputation is an assertion about *the pack that shipped* rather than a tautology about *the payload on disk*. **Top-level, not inside `pack`**: `pack` is what the pack declared, this is what the apply observed. Over **normalized** content, so it survives a CRLF checkout |
| `parameters` | `verify`, `update` | Recompute the applied tree. Every declared parameter is recorded, including ones answered by default and ones that selected nothing, because a `when` must be re-evaluated against the *original* answers |
| `scaffolds` | `verify`, `update` | Recompute exactly the same step set; never silently gain or lose one |

Six keys, in that order, and the order is part of the byte-identity
contract of US-10.

**What is deliberately absent, and why it can be** (Q-43): a `files`
array, per-file hashes, per-region hashes, a `shared` array,
`pack.integrity`, `appliedAt` and a manifest self-hash. There is no
owned-key record either, and that one is absent for a different reason —
there are no owned keys (Q-54).
Every one of them existed to answer "what did the apply produce", and
under Q-39/Q-40 that question is answered by re-running phase 2 against
`.harness/pack/` — which is local, committed, and paired with a
deterministic recipe. The manifest records the *inputs*; the tree is a
function of them.

**`payloadDigest` is the one exception, and it is worth naming as one**
(Q-52). Every other key is an input the user or the pack chose; the
digest is an **observation this apply made**. That is a real conceptual
cost of the six-key manifest and it is stated rather than smoothed over.
It buys the one thing recomputation cannot buy on its own: the identity
above proves the applied tree matches *the payload on disk*, and
`verify`'s job is to prove it matches *the pack that shipped*. The digest
is the smallest closure of that gap — one hash, one tree walk, no
per-file list — and it also covers `recipe.json`, which lives in the
payload.

### F1.5 — Manifest versioning and forward compatibility

- `manifestVersion` is an integer, bumped **only** on a change that an
  older CLI would misread. Additive optional keys do not bump it.
- A CLI reads any `manifestVersion` ≤ its supported version and refuses
  anything higher (`E-MANIFEST-NEWER`, never a warning).
- Within a version, unknown keys at any level are preserved verbatim on
  rewrite, so an older CLI degrades to ignoring a newer one's data rather
  than deleting it. **"At any level" means the two objects that have a
  closed key set** — the root and `pack` — so an implementation carries
  **two** such collections, not one; the ADR's single flat `unknownKeys`
  could not hold a `pack`-level key at all, and the second is the same
  category rather than a seventh declared key.
- **An unknown manifest key draws no `W-UNKNOWN-KEY`**, and the exception
  is deliberate. That code is **`defect`** class — meaning an author is
  expected to delete the key — and **there is no author here**: an unknown
  manifest key is a *newer CLI's* data that the rule above requires be
  preserved. Warning would ask the user to delete the very thing forward
  compatibility depends on, and under `--strict` a `defect` warning is
  fatal, so a newer CLI's manifest would fail an older CLI's CI. The
  unknown-key rule governs **`pack.json` and `recipe.json`**, which have
  authors; the manifest has a writer.
- `pack.formatVersion` is recorded separately from `manifestVersion`:
  they version different things and will move at different rates.
- The manifest is not a public API. No schema is published, and no
  compatibility is promised to any consumer other than this CLI.
- `payloadDigest` is a **required** key at `manifestVersion` 1, not an
  additive optional one. A manifest at version 1 missing it, or carrying
  it in any shape other than `sha256-<64 lowercase hex>`, is
  `E-MANIFEST-CORRUPT`, exit 2 — the fail-closed rule of US-1 applied to
  the manifest. There is no "digest absent, so skip the check" branch,
  because that branch is the one an attacker would take.
- **v1.1 will need to add fields**, and the manifest is shaped so that it
  can: any such field is an additive optional key and does not bump
  `manifestVersion`. Two are foreseen and neither exists now — a merge
  record for `update` (C-3), and whatever a returning `merge-json` needs
  to make its destinations verifiable (C-22, §F1.9). The payload digest
  `update` would otherwise have had to add **is already here** (Q-52),
  which is half of C-11 paid for in advance. That is the whole of the
  forward-compatibility claim; nothing stronger is promised, and no key
  is carried now for a consumer v1.0 does not have.

### F1.6 — Apply lifecycle, including failure

```
  lintel harness init <pack> [--scaffold …] [--set k=v] [--force]
   │
   ├─ 1. project already has .harness/ ?
   │        └─ journal present → E-JOURNAL-PRESENT, exit 2
   │        └─ otherwise       → E-ALREADY-APPLIED, exit 1, ZERO bytes
   ├─ 2. resolve pack from the bundle; check minCliVersion, formatVersion
   ├─ 3. validate pack.json + recipe.json (US-16 checks 1–10)
   │        └─ any failure → exit 2, ZERO bytes
   ├─ 4. collect parameter answers (prompt or --set), validating each
   │        └─ scaffold selection checked: unknown, exclusive
   ├─ 5. resolve the project root ONCE with realpath
   ├─ 6. PLAN BOTH PHASES IN MEMORY  ← the ONLY read of the bundled pack
   │        phase 1: the payload file list and its destinations
   │                 → payloadDigest over the PLANNED payload set
   │        phase 2: every step RENDERED HERE, from the bytes that read
   │                 produced; every applied path in every write set
   │                 confined; nothing is read again after this point
   │        every planned write carries WritablePath
   │                 (AppliedPath for phase 2, HarnessPath for phase 1
   │                  and for the CLI's own .harness/ writes)
   │        US-16 checks 11–14 RUN HERE, over the ONE combination the
   │                 answers select: E-SUBST-UNRESOLVED, E-SUBST-NEWLINE,
   │                 E-ANCHOR-INVALID, E-CLAUDE-TOOL-GRANT and
   │                 E-CLAUDE-PERMISSION-MODE (11), the folder-README
   │                 warning (12), link integrity (13), and the
   │                 disclosure build (14)
   │        the manifest, digest included, and the security disclosure
   │        are built here
   │        └─ any failure → exit 1 or 2, ZERO bytes
   ├─ 7. take .harness/lock  (E-LOCK-HELD, or W-LOCK-STALE-BROKEN)
   ├─ 8. write .harness/journal.json (v2: intended hash, preExisting,
   │        preHash, preMode, backup, createdDirs) covering BOTH phases
   ├─ 9. PHASE 1 — write the planned payload to .harness/pack/, verbatim,
   │        every file 0644 and every directory 0755
   ├─ 10. PHASE 2 — write the bytes rendered at step 6; NO READ of
   │        .harness/pack/, of the bundle, or of any applied path
   │        each write: re-confine → exclusive create → rename
   │        └─ target changed in the window → E-TARGET-RACE
   │        └─ I/O failure → E-WRITE-FAILED, journal remains
   ├─ 11. write .harness/manifest.json   ← six keys, payloadDigest as planned
   └─ 12. delete .harness/journal.json and .harness/journal.d/,
          release the lock                ← apply is now complete
```

**The CLI writes five things under `.harness/`, and this list is
complete**: the payload (step 9), the journal and `journal.d/` (step 8),
the lock (step 7) and the manifest (step 11). There is **no
`.harness/README.md`** and no step that writes one — `.harness/` is
tool-owned and excluded from Q-50's folder-README rule, exactly as
`.claude/` is. Each of the five carries `HarnessPath`; no recipe step can
produce one, and C-5 forbids a recipe step any destination under
`.harness/` without exception (US-3 stage 2).

**There is no longer a consent gate between the plan and the lock**
(Q-54, US-13). Through v2.2 step 7 was one, and it existed for exactly
one thing: a value landing under a security-relevant settings key. No
pack can write a settings file at all now (US-3 stage 2), so the gate
could never fire, and a gate that cannot fire is a claim rather than a
control. The lifecycle is **twelve steps**, contiguously numbered. **v1.1
obligation, §F1.9:** when a settings destination returns, the gate
returns **between the plan and the lock, in that position**, because a
declined apply must not contend for a lock, must not leave one behind,
and must write zero bytes — including zero bytes of `.harness/`.

**Everything is planned before anything is written**, including the
payload copy, the payload digest that records it, **and every byte phase
2 emits** (C-23). Steps 9 and 10 are writers, not readers: the plan is
the only thing that read anything, and it read once.

**Step 3 runs US-16 checks 1–10 and step 6 runs checks 11–14, and both
halves are named because the second used to be missing** (C-48). Through
v2.4 this diagram named checks 1–10 at step 3 and nothing at step 6,
which left four codes with no stated place in an `init` —
`E-CLAUDE-TOOL-GRANT`, `E-SUBST-UNRESOLVED`, `E-SUBST-NEWLINE` and
`E-ANCHOR-INVALID` all live at check **11**, and each carries an "exit 2,
zero bytes" contract that means nothing unless the check runs **before**
the lock at step 7 and the first write at step 9. It does, and the
diagram now says so. Two differences from `validate` are worth stating
rather than inferring: `init` runs checks 11–14 over **the one
combination the answers select**, not over every combination — the
combinatorial sweep is `validate`'s job (US-16) — and check 12's
`W-FOLDER-README-MISSING` is a warning here, non-fatal, exactly as it is
there — it is `defect` class (Q-60), but `init` has no `--strict`, so
nothing promotes it during an apply. Check 3's payload-set frontmatter check (C-39c) runs with the rest
of checks 1–10 at step 3, before any answer is collected, because the
payload does not vary by answer.

The journal is the whole recovery story: its presence means step 9, 10
or 11 did not finish, and its contents say exactly which paths were in
flight, what they were supposed to contain, **and what was there
before**. That last part is what makes the invariant checkable rather
than merely stated. A user who edited a file between the crash and the
rollback keeps their edit and is told about it (`W-ROLLBACK-KEPT`).

### F1.7 — The one-pack invariant

The manifest has one `pack` object. There is no array, no ordering, no
precedence rule and no ownership arbitration, because **a project holds
exactly one pack** (Q-12). A user who needs two ways of working runs two
projects side by side. This is stated here rather than only in the brief
because it is the single assumption most likely to be "helpfully" relaxed
by a later change, and relaxing it reopens the file-collision problems
that Q-12 removed rather than solved.

`.harness/pack/` reinforces it: there is one payload directory, not one
per pack, and every `from` resolves against it — at plan time, from the
one read the planner makes (C-23), and against the same tree `verify`
re-reads later.

### F1.8 — Verifiability: the applied tree is recomputable

This is the property that lets the manifest be six keys.

```
payload_ok    = treeDigest( .harness/pack/ ) == manifest.payloadDigest

expected_tree = phase2( payload = .harness/pack/ ,
                        recipe  = .harness/pack/<pack.recipe> ,
                        answers = manifest.parameters ,
                        scaffolds = manifest.scaffolds )
```

Every input on the right is present in the project, committed to version
control, and readable without the CLI that produced it. Nothing on the
right is a cache or a remote fetch. `lintel harness verify` evaluates
`payload_ok` **first**, and computes `expected_tree` **only if it holds**
(US-33).

**The identity is exact at every applied path, with no exception**, and
that is new at v2.3 rather than a restatement (F-4, Q-54). It was false
at exactly one class of destination: a `merge-json` target, where the
union preserved every key the project already held, so the destination's
**prior content was a fourth input** — absent from the right-hand side,
absent from the manifest, and unrecoverable after the apply. Worse, the
union was **idempotent**, so `verify` recomputed a hand-added
`permissions.allow` to itself and reported `match`. Dropping the
primitive drops the fourth input, so the four arguments above are the
**complete** input set and the equality is unconditional. **C-22 asked
for the identity to be narrowed and for a distinct `verify` state at such
a destination; neither is applied, because the destination no longer
exists.** There is no `partial` state and no exception clause anywhere in
this document. A v1.1 that reintroduces the primitive reintroduces the
fourth input and must reintroduce **both** — the narrowing and the state
— in the same change (§F1.9).

**`adapted` is a reporting state, not an exception to the identity**
(Q-56, new at v2.7). The equality above is **unchanged** and still holds
at every applied path: `expected_tree` is computed from the same four
arguments, by the same rules, whether or not a step declared
`adaptExpected`. What the declaration changes is only how `verify`
**names** an inequality it finds at one of those paths — `adapted`
rather than `differs` — and whether that inequality reaches the exit
code. That is precisely why it is **not** C-22's `partial`, and the
distinction is worth stating because the two would otherwise look alike:
`partial` would have meant *the expectation itself is incomplete at this
destination*, which weakens the identity; `adapted` means *the
expectation is exact and the project has moved away from it on purpose*,
which does not touch the identity at all.

**And it is why the manifest gains no key.** The adapt-expected set is a
pure function of `.harness/pack/` — the recipe's steps and the write set
each one expands to — and `.harness/pack/` is already on the right-hand
side above, already committed to version control, and already checked by
`payload_ok` **before** any path is compared. A seventh manifest key
would record what the sixth already determines, and **Q-43's argument
against a per-file hash list applies to it word for word**: its only job
would be to say what the apply produced, and recomputation says the same
thing and is self-checking. **The manifest is six keys at v2.7, exactly
as it was at v2.1.** A reader looking for an `adaptExpected` list in
`.harness/manifest.json` will not find one, and its absence is a
decision rather than an omission.

**The order is the whole point, and it is fail-closed.** `expected_tree`
is a function of the payload, so if the payload is not the one this
project recorded, the expectation is derived from an input nobody
vouched for. Comparing it to disk would produce a report — plausible,
detailed, and meaningless. So a digest mismatch is
`E-PAYLOAD-DIGEST-MISMATCH`, exit 2, with the tree comparison
**suppressed** and the per-path report **empty**. `verify` says which
side moved, or it says nothing about the tree at all.

Three consequences follow, and they are the argument for Q-43:

1. **A per-file hash list would be redundant.** Its only job is to say
   what the apply produced; recomputation says the same thing and is
   self-checking, because a recomputation that disagrees with the recipe
   is a CLI bug rather than a stale record.
2. **A `.harness/base/` store would be redundant.** Its job was to be a
   merge base when the old pack version was unavailable. The old pack
   version is in `.harness/pack/`, in full.
3. **The manifest cannot go stale against the tree.** It records inputs,
   and inputs do not drift. What can drift is the tree — reported as
   `E-VERIFY-MISMATCH`, exit 1 — and the payload, reported as
   `E-PAYLOAD-DIGEST-MISMATCH`, exit 2. Two drifts, two codes, two exit
   classes.

**`verify` no longer trusts `.harness/pack/`, and the paragraph that
said it did is void.** Q-43's argument proved the applied tree matches
*the payload on disk*; Q-52 adds the one hash that makes it also prove
the payload is *the payload the apply recorded*. What remains is bounded
and named in one sentence: the digest is over normalized content, so a
pure line-ending edit of the payload does not move it (§NFR), and nothing
binds the manifest to itself, so someone who edits the payload and
recomputes the digest defeats the check deliberately rather than by
accident.

### F1.9 — Forward investment, deferred conditions, and known limits

**Forward investment — the three things v1.0 pays for with v1.1 in mind**
(and nothing else). Only the first is *purely* forward: the manifest and
its digest both have v1.0 consumers, and are listed here because their
shape was chosen with `update` in view:

| Investment | Cost at v1.0 | What it buys v1.1 |
|---|---|---|
| **Inert region anchors** (US-32) | **Nineteen** anchors across **three** templates — `coding` 6, `writing` 6, `planning` 7 (Q-61) — each a literal pair of comment lines, plus a line-counting assertion | `update` has stable insertion points in **every** pack's `CLAUDE.md` without a migration that has to guess where pack-owned text begins. The count is three templates and not one because all three packs `generate`: had only `coding` done so, two of the three packs would have carried nothing for `update` to find, and the investment would have bought a third of what it was costed for |
| **The minimal manifest** (US-10) | Six keys | `update` knows what was applied and can recompute the expected tree, which is what makes it an addition rather than a retrofit |
| **`payloadDigest`** (US-10, Q-52) | One key, one tree walk per apply and per `verify` | **Q-62 collected this investment early, and changed what it buys.** `update` is v1.0 and **builds no merge engine**: it recomputes `expected_old` from the local `.harness/pack/` plus the recipe plus the recorded answers — `verify`'s own identity — and classifies each path against it. There is no base to merge against and nothing to lose work into; what a wrong payload loses instead is the *classification*, silently marking an edited file unedited and letting `update` replace it. Checking the digest first is therefore C-11's concern **strengthened**, not deferred, and the field was already in every manifest — so F3 adds a check, not a migration. It earns its keep at v1.0 twice: it is also what lets `verify` say which side moved |

Nothing else in this spec is carried for a deferred feature. Where the
old spec kept a field, a hash or a code "for F3", it has been removed —
and **v2.3 removed the largest instance of the pattern**: `merge-json`
and its whole apparatus were kept at v2.2 on the argument that
apparatus which is *specified, fixture-tested and dormant* is cheaper
than apparatus acquired later under time pressure. Q-54 rejects that
trade on evidence. The apparatus was not exercised, it was where both
CRITICALs of the re-review landed, and untested security machinery is a
liability rather than an investment. **The lesson is recorded because it
is the one that generalises: forward investment is only investment when
something at v1.0 exercises it.**

**Security conditions from `F1-ADR-001` — carried, rescoped, deferred, or
resolved by deletion.** A condition marked **RESOLVED BY DELETION** had
its **subject** removed by Q-54: it is not satisfied, not deferred and
not argued down — there is nothing left for it to govern. Each such row
names what would bring it back, so a v1.1 inherits the obligation instead
of rediscovering the finding.

| Condition | Status at v1.0 |
|---|---|
| C-1 `ownedKeys` allowlist, leaf-only, hooks excluded | **RESOLVED BY DELETION** (Q-54) as to `ownedKeys`: there is no `merge-json`, no `ownedKeys` and no ownable set, so nothing can claim a key. **The hook half is carried and restated** — no pack registers an agent hook, and the rule is a *format* decision that predates Q-54, kept in US-3 with its four original reasons so a v1.1 does not read it as a redundant consequence of the deletion. **v1.1 obligation:** a returning `merge-json` returns with the allowlist, the leaf-only rule and the hook exclusion **before** its first shipping consumer, not alongside it |
| C-2 consent gate on the plan, verbatim disclosure | **Half RESOLVED BY DELETION, half carried.** The **gate** is deleted with its only subject (Q-54): nothing an apply does at v1.0 requires consent, `ConsentInputs`, `--accept-permissions`, `--accept-hooks` and `E-SETTINGS-CONSENT-REQUIRED` are gone, and a gate that cannot fire is a claim rather than a control. **The verbatim enumeration is carried in full** — US-13's disclosure still names every `0755` path, every inert `.claude/hooks/` script, and now every agent-instruction substitution, one per line, never summarised, from one builder rendered by three surfaces. **v1.1 obligation, precisely:** the gate returns in the same change as the settings destination, positioned **between the plan and the lock**, writing **zero bytes** on refusal, with the absence of a consent input meaning *not granted* — a caller must not reach the permissive branch by forgetting a field — and both flag names re-reserved in US-8's list |
| C-3 removal-honouring settings merge | **RESOLVED BY DELETION for now, and still a v1.1 obligation.** It existed to stop a *second* apply resurrecting a deleted permission; at v1.0 there is neither a second apply (Q-42) nor a settings merge (Q-54). **v1.1 obligation:** `update` may not union a security-relevant array without a `removed` set, and the manifest fields for it are additive optional keys that do not bump `manifestVersion` |
| C-4 confinement by resolution, `realpath`, ancestor `lstat` | **Carried in full** — US-3 stage 3 |
| C-5 reserved-destination denylist on the resolved path | **Carried, re-quantified and extended** — US-3 stage 2. Three changes at v2.3, and the first is a repair: the rule is quantified over **every applied path in every step's write set**, not over `to`, because `rewrite-path` and `substitute` have no `to` and the old quantifier therefore had two silent exemptions; **every `in`-matched path is re-checked** against it individually (C-27); and the denylist gains a **second class** — `.claude/settings.json`, `.claude/settings.local.json` and any `package.json`, matched by `collisionKey` — which is what makes "nothing writes settings at v1.0" a checked rule rather than an observation (Q-54). **Extended again at v2.4** (C-31, C-33): class 2 becomes a **declared, closed list** covering `.github/`, `.vscode/`, `.idea/` and `node_modules/` as first segments and `package.json`, `.envrc`, `.npmrc`, `.yarnrc.yml`, `Makefile` and `justfile` as basenames, and it is **named as a denylist and therefore incomplete by construction**; class 1's VCS names are reserved at **any** segment, not the first. **Extended a third time at v2.5** (C-39a, C-39d, C-41), and this time the *quantifier* is what changed: **a reserved name is reserved at every segment and `.harness/` is the only location entry in the document**, so `.github`, `.vscode`, `.idea`, `node_modules`, `.circleci` and `.devcontainer` all move to any-segment, and `settings.json`/`settings.local.json` are reserved under **any `.claude` segment** rather than at two root-relative paths — without which §NFR *Bounded capability*'s load-bearing "nothing writes `.claude/settings.json`" clause was false as written. Membership grows by `.mcp.json`, `.gitlab-ci.yml`, `Jenkinsfile`, `azure-pipelines.yml`, `bitbucket-pipelines.yml`, `GNUmakefile` and `.justfile`. The extension stands: a recipe step may never write under `.harness/`, **absolutely and with no carve-out**, because `.harness/` holds phase 2's own input. The CLI's own five `.harness/` writes are not recipe steps; they carry `HarnessPath` and are confined by construction, which is why the denylist can be absolute without deadlocking against the payload copier |
| C-6 anchored `to` grammar | **Carried in full** — US-3 stage 1, plus `E-PAYLOAD-PATH-INVALID` for payload paths |
| C-7 parameter `pattern` / `maxLength`, JSON escaping | **Carried, one half RESOLVED BY DELETION.** `pattern` (anchored, ≤ 200 chars, no backreference, no lookaround) and `maxLength` (default 256, ceiling 4096, checked **first**) are carried in full — US-8 — and they are now load-bearing in a second place, since they are two of the three controls that make C-28's accepted agent-instruction boundary safe. The **JSON-escaping** half and the post-serialization deep-equal re-parse had `merge-json` as their only subject and go with it (Q-54): every phase-2 destination at v1.0 is a text file. **v1.1 obligation:** a returning JSON destination returns with **both** — the escaping *and* the deep-equal, which is the half that catches an injected value that still parses |
| C-8 no substitution into a security-relevant owned key | **RESOLVED BY DELETION** (Q-54) — US-4. No pack writes a settings file (US-3 stage 2), so no substituted value can land under a security-relevant key and `E-SUBST-IN-SECURITY-KEY` had nothing left to fire on; a check that cannot fire is deleted rather than kept, because kept it reads as coverage. **The reasoning did not go with it**: C-8's principle — *a permission is a decision the pack author makes at authoring time, not one a user makes by typing a project name* — is now applied one boundary out, to agent-instruction content, where §US-4 states it, **accepts** it with three reasons, and **enumerates** it in the disclosure (C-28). **v1.1 obligation:** the rule and its code return in the same change as the settings destination |
| C-9 substitution may not forge a marker | **Half carried.** The newline ban survives as `E-SUBST-NEWLINE`. The marker-lex half and `E-REGION-TAMPERED` are **removed with the region parser** (Q-45): anchors are inert, so a forged one hijacks nothing. **v1.1 obligation:** restore the lex check when `update` starts reading anchors. |
| C-10 integrity fail-closed on write paths | **Rescoped.** Its subject was `shared[].integrity`, and `shared/` does not ship at v1.0 (Q-48, resolved in the brief). The general rule it expressed — a flag that downgrades an integrity check exists on read-only commands only — survives as `E-FLAG-NOT-PERMITTED`, and there is **no flag anywhere in the CLI that skips the `payloadDigest` check**. |
| C-11 `pack.integrity` verified same-name-same-version | **Carried in full as of Q-62.** Q-43 removed `pack.integrity`; **Q-52 paid the payload half** — `payloadDigest` is recorded by every apply and checked first and fail-closed by `verify` (US-10, US-33). The half that was deferred with `update` is **no longer deferred and is no longer a merge-time obligation**: `update` is v1.0, builds no merge engine, and must check the digest **before classifying any path**, because classification is computed from the payload exactly as `verify`'s expectation is. **F3 obligation, and the field it needs already exists.** |
| C-12 `executable` declared, bounded, disclosed | **Carried in full, extended to phase 1, and — new at v2.4 — actually exercised** (C-38). `coding` declares `executableRoots: ["infrastructure/backend-deploy/"]` and sets `"executable": true` on each backend scaffold's script step, producing **four** `0755` applied paths and four real disclosure lines. Through v2.3 F1 stated that *every* v1.0 pack shipped no executable, which disagreed with F5, forced adopters to `chmod` scripts meant to be run, and left the roots/cap/disclosure apparatus specified and dormant — the exact pattern §F1.9 records Q-54 as the lesson about. US-3, US-29, US-30, §F1.3. Every clause of the executable rule is written for a *recipe step* — a declared `to`, an `executable` field, a declared root, the cap of 32, a disclosure line — and **phase 1 is not one and has none of them**, so a `0755` source file used to land `0755` under `.harness/` with no root, no cap, no disclosure and no diagnostic, invisible to a content-only `payloadDigest`. **Repair (C-26):** phase 1 writes every payload file `0644` and every created directory `0755`, reading no source mode, which satisfies `E-EXEC-DEST-FORBIDDEN` **by construction** rather than by a check phase 1 cannot run |
| C-13 journal `preExisting` + pre-apply hash; rollback deletes only what it created | **Carried in full** — US-13, and now covers phase-1 writes too |
| C-14 branded `AppliedPath`, exclusive create, `E-TARGET-RACE` | **Carried in full, and extended to close the hole phase 1 opened** — US-3, US-13. `AppliedPath` for recipe destinations, **`HarnessPath`** for the CLI's own `.harness/` writes, and `WritablePath = AppliedPath \| HarnessPath` on the journal, the writer and rollback. Without the second brand, phase-1 writes would have to reach the writer as bare strings and C-14's compile-error property would not hold across phase 1 |
| C-15 no credential-valued parameters | **Carried, message narrowed** — US-8. `.harness/base/` no longer exists, so the disclosure names the manifest only. The manifest and the payload are both committed. |
| C-16 fail-closed: unknown keys warn, unknown values are hard errors | **Carried, and the enumeration re-closed twice** — US-1. It had lapsed in two ways and both are repaired: **`Recipe.formatVersion`** was declared and checked by nothing, so a newer recipe format was best-effort applied — it is now the second of six positions, with its own code `E-RECIPE-FORMAT-NEWER`, exit 2, zero bytes (C-24); and the old destination table's fall-through row made *an `ownedKeys` root* recognised **by construction** at every unnamed destination, so no value there could ever be unrecognised — that position is now **deleted with `ownedKeys`** (Q-54) rather than repaired. The same fail-closed instinct is applied to the **parser** as well as to fields: `E-JSON-DUPLICATE-KEY` (C-25) |
| C-17 traversal bounds, depth 32 / 10,000 entries, no symlink following | **Carried in full** — US-30, US-33, §NFR |
| C-18 `contribute` passes the identical policy gate | **Deferred with `contribute`** (Q-42). **v1.1 obligation:** F1's pack-content policy must remain a single callable gate so that `contribute` cannot hold a second copy of it. |
| C-19 destination policy over every applied path any primitive writes, not over `to` | **RESOLVED BY DELETION as to the *policy*, CARRIED as to the *quantifier*, and the second half is the part that matters.** There is no destination policy to re-key (Q-54). But the finding beneath it — *a rule quantified over `to` has two silent exemptions, because `rewrite-path` and `substitute` have no `to`* — is **general**, and fixing only the instance the reviewer found is how the gap re-forms. So the **write set** is a named concept in §F1.2, and every destination rule in US-3 is quantified over it: the stage-1 grammar, the stage-2 denylist, the collision rules and the executable rules alike. The write set is a pure function of the pack, so `validate` still needs no project. **v1.1 obligation:** a returning destination policy is evaluated over write sets, never over `to` |
| C-20 `policyFor` resolves by `collisionKey`, not exact string, on every platform | **RESOLVED BY DELETION as to `policyFor`, CARRIED as to the folding rule.** There is no policy table and no `policyFor` (Q-54). The insight survives in two places and both are requirements: **reserved destinations are matched by `collisionKey`** — NFC-normalized then case-folded, on every platform, unconditionally — so `.claude/Settings.json` is reserved too (US-3 stage 2); and **N-5's extension**, below, applies the identical folding to `E-TARGET-EXISTS`, `--force` byte-identity and the journal's `preExisting`. Unconditional on every platform, because `validate --all --strict` runs in **Linux CI** while the developer is on macOS or Windows, and a platform-conditional fold means the pack CI pronounced valid is not the pack that runs |
| **N-5** `E-TARGET-EXISTS`, `--force` byte-identity and `preExisting` fold by `collisionKey` | **Carried in full** — US-13, US-3, and the `E-TARGET-EXISTS` catalogue row. Not a reviewer condition but a defect found while specifying C-20, and it is C-20's defect one layer down: with exact-string comparison, a project holding `.claude/Settings.json` and a step writing `.claude/settings.json` are the same file on macOS and Windows, `E-TARGET-EXISTS` does not fire, the journal records `preExisting: false`, and **`--rollback` deletes a user file it did not create** — breaking the invariant C-13 and G-F1-6 both state. **This survives Q-54 entirely**: it has nothing to do with `merge-json`, and the fixture that catches it is in US-16's minimum set |
| C-21 F1 and F5 agree on whether any v1.0 pack writes settings | **Satisfied, by deletion on both sides.** No v1.0 pack writes `.claude/settings.json`, no v1.0 pack **can** (US-3 stage 2), and F1 §F1.3 says so at the one place a reader would look for a settings step. There is no owned-key list to enumerate because there are no owned keys |
| C-22 the `merge-json` destination's prior content is a fourth input; narrow the determinism claim; give `verify` a distinct state there | **RESOLVED BY DELETION, and the narrowing is DELIBERATELY NOT APPLIED.** The condition's premise is that a primitive reads its destination's prior content; no primitive does (Q-54). So §NFR *Determinism*, the Introduction, the Technical Context row, US-31 and §F1.8's identity are **true as originally written**, unqualified, and are left unqualified — a scoped invariant beats an unscoped one only when the unscoped one is false. There is no `partial` `verify` state and no `ownedKeysChecked` field. **v1.1 obligation, and it is the sharpest one on this list:** a returning `merge-json` reintroduces the fourth input, and with it **both** halves of C-22 — the narrowing of all five statements, and a distinct `verify` state that never reports `match` at such a destination, because the union is idempotent and would otherwise pronounce a hand-added permission clean |
| C-23 F1 states unambiguously where phase 2's input comes from at execute time | **Carried in full** — US-30, US-13, §F1.1, §F1.6, §Technical Context. Phase 2 renders **entirely at plan time** from planner-resolved payload bytes; `executeApply` reads nothing from disk. `.harness/pack/` is the **logical** input and the literal one only at `verify`. US-30's old test is **replaced**, because it passed under both readings; the replacement mutates `.harness/pack/` between the phases and requires byte-identical output. The cost is stated in §NFR: phase 1 still streams, except for the phase-2 source set. The re-read branch's price — every execute-time read re-hashes against planned content, mismatch is `E-TARGET-RACE` — is recorded for v1.1 rather than dropped |
| C-24 `Recipe.formatVersion` in the closed enumeration; newer recipe format is exit 2, zero bytes | **Carried in full** — US-1, US-31, `E-RECIPE-FORMAT-NEWER` |
| C-25 duplicate-key rejection for `pack.json`, `recipe.json` and the manifest; `op` matched literally | **Carried in full** — US-1, US-31, US-15, `E-JSON-DUPLICATE-KEY`. **The carve-out the condition asked for is gone with its subject**: it excluded a `merge-json` destination and its payload-side `from`, neither of which exists (Q-54), so the rule is now **total** over the three JSON documents the CLI parses — one of which is the user's own committed manifest, where it holds for the same reason it holds for a pack |
| C-26 phase 1 writes every payload file 0644 and preserves no source mode | **Carried in full** — US-30, and see C-12 above. Directories `0755`. The non-cost is stated: a pack's executable is made executable by the step that copies it out, at the destination; nothing reads the payload copy's mode |
| C-27 `in` globs resolve only against the plan's written-set; every `in`-matched path re-checked against the denylist | **Carried, and the premise is corrected on evidence rather than accepted whole.** F1 **already** pinned `rewrite-path` to *"applied paths that earlier steps have already written"* in three places, so `in: [".harness/pack/**"]` matched nothing and failed. The genuine residual was threefold and all three are fixed: `substitute`'s clause was weaker and rested on one §F1.2 table cell (the two clauses are now word-for-word identical); the rule was stated three times and normatively nowhere (it is now a single normative rule in US-4); and **no `in`-matched path was re-checked against the stage-2 denylist** (it now is, individually). The type system carries it independently — the written-set is `AppliedPath[]`, the payload is `HarnessPath` — which is two mechanisms for an invariant C-5 calls absolute |
| C-28 the trust boundary for a substituted answer in agent-instruction content | **Carried in full, both branches, and at v2.5 the enumeration becomes total** (C-43) — US-4, US-13, US-29. The boundary is **stated** (such a value is content authored by the answering user, committed, and read as instructions by every later agent run in every clone, so the person who types it and the person whose agent reads it need not be the same); **accepted**, on three named grounds; **and enumerated anyway** in the disclosure, verbatim on C-2's terms. **Deliberately not gated** — a prompt firing on every apply of all three packs trains a user to accept without reading — and deliberately **not a `W-`**, because `--strict` runs in CI and a warning every legitimate pack trips is not a diagnostic. Silence would not have satisfied this, and silence is what v2.2 offered |
| C-29 a recorded answer failing on manifest read-back gets a distinct code, exit class 2 | **Carried in full** — US-8, US-15, US-33, `E-MANIFEST-ANSWER-INVALID`. F1 was violating its own severity rule here and can be cited against itself: *severity is a property of the code, not of the occasion*, while `E-PARAM-INVALID` carried both occasions at one class |
| C-30 a bound on total recipe steps, distinct code, exit 2, raisable only by a superseding ADR | **Carried in full** — US-31, `E-RECIPE-TOO-MANY-STEPS`, **256** over the total declared count before `when` filtering. Recorded with the reviewer's reasoning rather than a paraphrase of it: **the bound is an inspectability control, not a DoS control.** §7.0 has no remote attacker and `E-PAYLOAD-TOO-LARGE` bounds the bytes; what the bound protects is the argument that rejected a script primitive — that `pack info` renders the complete list of what an apply will do — which an unbounded list degrades continuously while naming no point at which a reviewer should stop trusting it |

**Findings of the 2026-08-31 Mode A pass over v2.3 — C-31…C-38.** The
pass returned **`REVISE-SPEC`** with **no CRITICAL**: 2 HIGH, 3 MEDIUM,
3 LOW, and **24 of the 31 prior conditions holding unchanged**. The rows
below are the F1-side findings and all are **folded at v2.4**.

| Condition | Status at v1.0 |
|---|---|
| **C-31** (HIGH) reserved destination class 2 is a category named but enumerated at three members | **Carried in full — US-3 stage 2, §NFR, §F1.3, US-16.** Class 2 becomes a **declared, closed list**: first segment `.github/`, `.vscode/`, `.idea/`, `node_modules/`; basename `package.json`, `.envrc`, `.npmrc`, `.yarnrc.yml`, `Makefile`, `justfile`; plus the two settings files. Matched by `collisionKey`, quantified over the **write set** like every other stage-2 rule, `E-MAP-RESERVED-DEST`, exit 2. **It is stated as a denylist and therefore incomplete by construction**, and §NFR *Bounded capability* is **narrowed** — its claim that "there is no code execution path from a pack to the host at v1.0", asserted to be enforced clause by clause, was false as written, since a `copy` to `.github/workflows/` executes attacker-chosen code on the next push with `GITHUB_TOKEN`, strictly more capability than the `postinstall` route the clause list did name. Four adversarial fixtures, one per row of the finding, including a `strip-suffix` whose recursion *produces* `.github/workflows/x.yml` with no step naming it |
| **C-32** (HIGH) `.claude/` is governed by three filenames; the permission-bearing content a pack writes there is neither constrained nor disclosed | **Carried in full, both clauses — US-3, US-13, US-29, US-16.** **(a)** A pack-written file under `.claude/` may not declare tool permissions in frontmatter: **`E-CLAUDE-TOOL-GRANT`**, exit 2, zero bytes, over the write set, on **rendered** content at US-16 step 11, matched on **any** `.claude` segment. Stated as the property *"a pack-written file under `.claude/` may not declare tool permissions"* with the key names **pinned against the runtime's current contract** in one named constant, rather than hard-coding a spelling, because the frontmatter contract belongs to the Claude Code runtime. Costs v1.0 nothing — no bundled command or skill uses `allowed-tools` — and defers the capability to v1.1 with the settings story on **Q-54's logic: delete the surface rather than police it**. **(b)** US-13's disclosure gains a **fourth row**: every pack-shipped `.claude/agents/*.md` and its `tools:` list, **verbatim, one per line**. Accepted-and-enumerated on **C-28's reasoning** — all three packs use it, forbidding it deletes the feature, and a subagent's tool list still runs under a permission engine the pack cannot touch. **Disclosed, not gated. This corrects an inversion of C-2's purpose:** US-13 enumerated every *inert* `.claude/hooks/` script and said nothing about a live tool declaration. **Both clauses are carried one step further at v2.5** — (a) gains the **phase-1 payload set** as a second quantifier (C-39c) and `permissionMode` as a second key family (C-40); (b) prints the **whole frontmatter block** rather than `tools:` alone (C-40) |
| **C-33** (MEDIUM) `.git`/`.hg`/`.svn` reserved only as a FIRST segment | **Carried in full — US-3 stage 2, `E-EXEC-DEST-FORBIDDEN`.** All three are reserved at **any** segment, by `collisionKey`, so `docs/.git/config`, `docs/.git/hooks/pre-commit` and a `sub/.git` git-link are all refused; `E-EXEC-DEST-FORBIDDEN`'s forbidden-directory list, which had the identical scoping defect, is fixed the same way. **`.harness/` stays first-segment-only and the difference is stated**: `.git`, `.hg` and `.svn` name a real VCS directory *wherever they appear*, while `.harness/` names **one specific tree this CLI owns and constructs**, which is phase 2's input and which C-5 protects for that reason — a nested `docs/.harness/` is neither, and reserving it would forbid ordinary content for no gain. Reserve a *name* where the name means something; reserve a *location* where the location means something |
| **C-34** (MEDIUM) two security-gating booleans sit outside the closed enumeration | **Carried in full — US-1, `E-UNKNOWN-VALUE`, US-16 steps 1 and 4.** Every boolean-typed field in `pack.json` and `recipe.json` must be a JSON boolean; anything else is `E-UNKNOWN-VALUE`, exit 2, zero bytes. The boolean-typed fields are **enumerated and closed at five** (four at the time of this condition; `RecipeStep.fillExpected` joined at Q-79, under this same rule): `RecipeStep.executable`, `RecipeStep.adaptExpected`, `ParameterDecl.required`, `ParameterDecl.notASecret` — `adaptExpected` was added at v2.7 by Q-56 **under this rule**, and `fillExpected` at v3.0 by Q-79 — the list grew in the same change that added each field, which is the behaviour C-34 asked for. **The count nevertheless went stale in three other places and was folded at v4.1**, which is this condition recurring one level up: the rule held, the arithmetic about it did not. **The closed enumeration of behaviour-selecting positions stays closed at six** — this is a *typing* rule, not a seventh position, and the two are kept distinct deliberately. The finding beneath it is the one that matters: US-1's *"nothing else is one"* affirmatively **excluded** `executable` (which gates C-12) and `notASecret` (which disables C-15's ban), no rule said what a non-boolean did, and in JavaScript `"false"` is **truthy** — so both gates failed **open**. Two fixtures, one per field |
| **C-35** (MEDIUM) C-28's classifier is stated over payload globs; the disclosure enumerates applied paths | **Carried in full — US-4, US-16.** The third clause is restated over applied paths: *"the applied path of any file whose payload source is matched by the `coordination` anatomy globs"*, and the classifier therefore **needs the placing step's source association, which the plan already carries** for every placing primitive — it does not re-glob the payload and does not invert an applied path back to a source. Without the restatement, `coding` — which declares `coordination: { "paths": ["agent-teams/*.md"] }`, a **payload** glob, while its applied paths are `AgentTeams/*.md` — silently omits both agent-team documents, and US-4's only stated test used `CLAUDE.md`, so the omission passed CI. **The test is strengthened in the same change**: applying `coding` must make `agentInstructionSubstitutions` name `AgentTeams/Specify.md` and `AgentTeams/Implement.md` as well as `CLAUDE.md`. **Superseded at v2.5 by C-43: the classifier is deleted rather than restated a third time**, because the restatement missed `specifications/README.md` and `specifications/project-brief.md` and the strengthened test passed without noticing |
| **C-36** (LOW) `--force` byte-identical collision can silently rename the user's file | **Carried in full — US-13, §NFR *Rollback safety*, US-16.** When a `--force` byte-identical collision is matched by `collisionKey` but the on-disk basename differs from the planned one, the write is **skipped entirely** and the journal records the **on-disk** path. N-5's folding rule followed one step further: `rename(tmp, dest)` may replace the directory entry and change the stored basename, the bytes are unchanged so nothing detects it, and rollback row 3 says *leave untouched* and restores nothing. Fixture: the existing `.claude/Agents/README.md` case re-run with `--force` and identical bytes must leave the entry named `Agents` |
| C-37 | **Not dispositioned here — it does not land on F1.** Recorded so the gap in the numbering is not read as an omission; it is owned by the F5 / ADR side of this pass |
| **C-38** (LOW) F1 and F5 disagree on whether any v1.0 pack ships an executable | **Carried in full, both halves — US-3, §F1.3, US-31, US-32, §F1.2, `E-RECIPE-SOURCE-MISSING`.** The disagreement is resolved **in F5's direction**: `coding` **does** declare `executableRoots: ["infrastructure/backend-deploy/"]` and sets `"executable": true` on the backend scaffold script steps, because the deploy scripts are meant to be run — landing them `0644` forces a `chmod` — and because this **exercises C-12** rather than leaving the roots/cap/disclosure apparatus specified and dormant, which is the pattern Q-54 was the lesson about. Each backend scaffold becomes **two** steps with complementary `exclude` lists (`executable` is a property of a step), so `coding` declares **19** steps, not 17, and produces four `0755` paths and four disclosure lines. **Second half:** `generate`'s `template` had **no named source-missing code** — `E-RECIPE-SOURCE-MISSING` was written for `from` and §F1.2's `generate` row omitted source existence — and now gets it, at US-16 step 5, as the same code at a differently-named field |

**Findings of the final 2026-08-31 Mode A pass over v2.4 — C-39…C-48.**
The pass returned **`REVISE-SPEC`** with **no CRITICAL**: 3 HIGH, 3
MEDIUM, 4 LOW, and **36 of the 38 prior conditions holding unchanged**.
Its summary of the shape is worth keeping verbatim, because it is the
lesson rather than the finding: *every HIGH is the same repair stopping
one step short of the principle it established.* The rows below are the
F1-side findings; all are folded at **v2.5** except **C-47**, which is
**recorded as a known limit** by the pass's own disposition. **This is
the last review-driven change to F1.**

| Condition | Status at v1.0 |
|---|---|
| **C-39** (HIGH) `.claude/` is governed by four rules with three different quantifiers, and F1 asserts the premise that makes three of them wrong | **Carried in full, all four clauses — US-3 stages 2 and 4, US-30, §F1.2, §F1.3, §NFR, US-16.** F1 states **normatively, twice** that a non-root `.claude/` is live. **(a)** The settings reservation was **two exact root-relative paths**, so `docs/.claude/settings.json` passed every stage — falsifying §NFR *Bounded capability*'s load-bearing claim that "nothing writes `.claude/settings.json`, because it is a reserved destination for every step by every route", which is what the whole Q-54 deletion rests on. `settings.json` and `settings.local.json` are now reserved **under any `.claude` segment**. **(b)** `E-EXEC-DEST-FORBIDDEN` kept `.claude/` first-segment, so `docs/.claude/hooks/x.sh` could carry `0755`; it is scoped the same way the reserved list is. **(c)** `E-CLAUDE-TOOL-GRANT` was quantified over the **write set**, and **phase 1 is outside it** — a pack that merely *shipped* `.claude/commands/x.md` with `allowed-tools` landed it at `.harness/pack/.claude/commands/x.md`, inside the committed project, unchecked and undisclosed, with no recipe step naming it. The check gains the **phase-1 payload set** as a **second quantifier** — a `HarnessPath` write, so this is not a widening of the write set and the `AppliedPath`/`HarnessPath` separation C-14 rests on is untouched. The alternative — retracting the any-segment premise — is **rejected**, because the premise is asserted normatively and C-39a rests on it. **(d)** C-33's stated test is applied to **every** entry and the result stated per entry (US-3's scoping table): a reserved **name** is reserved at **every segment**, and **`.harness/` is the only location entry in this document.** `node_modules` moves because npm workspaces nest it and `verify`'s scan skips it at any depth; `.vscode`/`.idea` because a subfolder opened as a workspace root reads its own; `.github` on the argument that already put `.git` at any segment |
| **C-40** (HIGH) the pin and the disclosure each cover one key; the bundled packs ship another | **Carried in full — US-3, US-13, US-29, US-16, `E-CLAUDE-PERMISSION-MODE`.** The property is *"a pack-written file under `.claude/` may not declare tool permissions"* and the pin was `allowed-tools` and its spellings — but agent frontmatter also carries **`permissionMode`**, which F5 lists as supported and which `packs/coding/agents/{architect,reviewer,securityreviewer}.md` declare as `readonly` **today**. So `permissionMode: bypassPermissions` on an agent that also declares `Bash` was **neither refused** (not on the pin) **nor shown** (row four printed `tools:` only) — falsifying C-32b's justification for disclosing rather than gating, since a mode key does not run *underneath* the permission engine, it **selects the engine's mode**; and `packs/coding/agents/README.md` says harnesses honouring the key exist. **The pin now covers every frontmatter key that expresses a permission decision**: grant keys, mode keys, and the pinned **non-widening** mode value set. A grant key anywhere under a `.claude` segment, or a mode key on a **non-agent** file, is `E-CLAUDE-TOOL-GRANT`; a **widening or unrecognised** mode value on an agent file is the new **`E-CLAUDE-PERMISSION-MODE`**, exit 2, zero bytes. **The value pin fails closed** — refusing a legitimate new mode at `validate` time is visible and fixable in one constant, while accepting an unknown one is a silent widening — which is why it is acceptable where an open tool namespace was not. **Disclosure row four prints the agent file's whole frontmatter block verbatim**, the cheapest correct form of "print every permission-bearing key", and the positive assertion requires `permissionMode: readonly` on the three agents that declare it |
| **C-41** (HIGH) class 2 omits the execution route nearest the ones it names | **Carried in full — US-3 stage 2, §NFR, §F1.3, §F1.9 limit 8, US-16.** **`.mcp.json` appeared nowhere in the spec set**, declares MCP servers as **command lines the runtime launches**, is the sibling of `.claude/settings.json`, and was reachable in one `copy`. The class also closed GitHub Actions and no other CI provider while the bundled `coding` pack ships an **Azure** scaffold, and two named entries were under-spelled: GNU make prefers `GNUmakefile`, and `just` reads `.justfile` — which `collisionKey` case-folding does not cover, because the dotted form is a different name rather than a different case. Added by basename at any depth: `.mcp.json`, `.gitlab-ci.yml`, `Jenkinsfile`, `azure-pipelines.yml`, `bitbucket-pipelines.yml`, `GNUmakefile`, `.justfile`. Added by name: `.circleci`, `.devcontainer` — **at any segment, not the first**, because C-39d's sweep supersedes the first-segment placement the finding proposed and because a first-segment entry would re-create the defect C-39 exists to close. Each ships with its fixture in this change, per US-3's own obligation. **`.mcp.json` is recorded in §F1.9 limit 8's enumeration of what a pack gives up.** The denylist-is-incomplete framing is unchanged: this is not a claim of completeness, it is the members of a category the list already named |
| **C-43** (MEDIUM) the C-28 classifier is closed at three clauses and misses two applied paths | **Carried by the reviewer's simpler option: the classifier is deleted — US-4, US-13, US-29, US-16.** `coding`'s `substitute` writes `projectName` into `specifications/README.md` and `specifications/project-brief.md`, and neither is caught: not root `CLAUDE.md`/`AGENTS.md`, no `.claude` segment, and their payload sources are matched by no `coordination` glob — clause 3 covered **one** anatomy part while `process` and `behaviouralGuidelines` are equally instruction-bearing. The disclosure named **3 of 5** and the v2.4-strengthened test passed without noticing: **C-35's shape, one clause over.** So `agentInstructionSubstitutions` now enumerates **every applied path at which the render resolved a `{{harness:param.<id>}}` token** — five for `coding` — computed from data the renderer already holds. **The classifier bought nothing a total enumeration does not, and it produced two findings in two versions.** The test fixes a **count**, a **membership** and an **exclusion** (`AgentTeams/README.md` is asserted absent), which is the only shape that fails when the rule is wrong |
| C-42, C-44, C-46 | **Not dispositioned here — they do not land on F1.** Recorded so the gaps in the numbering are not read as omissions; they are owned by the F5 / ADR / `general/` side of this pass, exactly as C-37 was |
| **C-45** (LOW, factual) the disclosed capability is understated | **Corrected — §F1.9 limit 13, US-3, US-13, US-16, US-29, §NFR.** `coding`'s ten agents declare `tools:` lists and **two** include `Bash` — `implementer` and `testwriter` — not one; and `researcher` additionally declares `WebSearch, WebFetch`, **the only network capability any v1.0 pack ships**, which limit 13 now names. The correction matters beyond the count: a disclosure limit that understates what is disclosed is the same failure mode as a disclosure that omits a row |
| **C-47** (LOW) `AnatomyDecl.declaredBy` is a behaviour-selecting value outside every rule that governs one | **RECORDED, NOT FIXED — §F1.9 known limit 15.** `{ "declaredBy": "recipe" }` selects behaviour (US-2: the part's shape *is* the recipe's set of destinations) and is covered by neither US-1's closed six positions nor the boolean-typing rule, so **`"declaredBy": "payload"` is unhandled** — no rule says whether it is `E-UNKNOWN-VALUE`, an unknown key warning, or silently ignored. **No security gate rides on it**: `declaredBy` is valid only for `folderScaffolding`, feeds no destination rule, no confinement stage and no disclosure. Accepted for v1.0 with the requirement stated in limit 15, so a v1.1 adds the position rather than rediscovering the gap |
| **C-48** (LOW) the lifecycle diagram omits the render-time checks | **Carried in full — §F1.6.** §F1.6 named US-16 checks 1–10 at step 3 and named nothing at step 6, so four codes had no stated place in an `init`: `E-CLAUDE-TOOL-GRANT`, `E-SUBST-UNRESOLVED`, `E-SUBST-NEWLINE` and `E-ANCHOR-INVALID` all live at check **11**, and each carries an "exit 2, zero bytes" contract that means nothing unless the check runs before the lock at step 7 and the first write at step 9. Step 6 now names checks **11–14**, over the one combination the answers select, with the two differences from `validate` stated rather than inferred |

**Known limits of the v1.0 format**, recorded so F5 pays them knowingly
rather than discovering them:

1. **An empty directory is not representable, and under Q-50 nothing
   needs one.** No primitive creates a directory on its own; a directory
   exists because a file lands in it. Every folder an apply creates
   carries a README, so no folder is ever empty and the case does not
   arise — which is why there is no `mkdir` primitive, no `skeleton/`
   tree and no `.gitkeep`. The residual limit is narrow and worth
   stating: **a pack that genuinely wants an empty folder cannot have
   one.** No v1.0 pack does, and a `mkdir` would be worse than it looks —
   its entire output is invisible to `verify`'s file comparison and
   uncommittable by git, so a pack using it would produce an applied tree
   that does not survive a clone.
2. **The payload is duplicated into every project.** `.harness/pack/`
   holds the whole pack, including scaffolds the project did not select
   and calibrations it did not choose. That is deliberate (Q-41 wants one
   local source of truth) and it is why `E-PAYLOAD-TOO-LARGE` exists.
3. **Content cannot vary *within* a file by answer.** `harness:if` is
   gone with the region parser. A pack needing two variants of one
   document ships two files and two conditional steps, which is the
   `planning` pack's `calibrations/` shape.
4. **Two calibrations are two bodies of content with no mechanical
   consistency check.** Nothing in the format can tell whether the
   `high-floor` and `near-zero-floor` variants of a template have drifted
   apart in structure. That is a pack-authoring discipline problem, and
   F5 should expect a manual review step.
5. **An answer cannot be changed after apply** (Q-21). Calibration is the
   planning pack's central property, so "re-calibrate" is a plausible
   real request; v1.0 answers it with "start a new project". This is the
   sharpest known limitation of the v1.0 format, and it is now cheaper to
   fix than it was: re-render with new answers is `verify`'s
   recomputation with a different input.
6. **`generate`'s anchor check is a line count, not a parse.** An anchor
   inside a fenced code block in a template is counted. A pack author
   documenting the anchor syntax must use an id that is not declared.
7. **`payloadDigest` does not see a pure line-ending edit of the
   payload.** It is computed over normalized content, deliberately: a
   raw-byte digest would make every Windows clone with `core.autocrlf`
   report a tampered payload on its first `verify`, which is the same
   failure the deleted `.harness/.gitattributes` existed to prevent
   arriving by a different door. The trade is made the same way
   everywhere else in the product (Q-26). Nothing binds the manifest to
   itself either, so an edit of both payload and digest defeats the check
   — which is deliberate work, not an accident, and v1.0 never merges
   against the manifest.
8. **A pack cannot contribute project settings, and cannot ask for a
   permission** (Q-54, extended by C-31, C-32a, C-39, C-40 and C-41).
   Reserved by **name at every segment**: `.github`, `.vscode`, `.idea`,
   `node_modules`, `.circleci`, `.devcontainer`. Reserved by **basename
   at any depth**: `package.json`, `.envrc`, `.npmrc`, `.yarnrc.yml`,
   `Makefile`, `GNUmakefile`, `justfile`, `.justfile`, **`.mcp.json`**,
   `.gitlab-ci.yml`, `Jenkinsfile`, `azure-pipelines.yml`,
   `bitbucket-pipelines.yml`. Reserved **under any `.claude` segment**:
   `settings.json`, `settings.local.json`. And a
   pack-written **or pack-shipped** file under a `.claude` segment may
   not declare a permission decision in
   frontmatter — so a pack cannot ship a default permission set, cannot
   pre-authorize a tool for a command, cannot **select a permission
   mode** for anything but a subagent and then only at a non-widening
   value, cannot **declare an MCP server** — `.mcp.json` names command
   lines the runtime launches, and this is the entry v2.5 adds because it
   was the execution route nearest the ones the class already named
   (C-41) — cannot set `model` or
   `outputStyle`, cannot add an `env` entry, cannot add an npm script,
   cannot add a CI job **on any provider named above** and cannot add a
   `direnv` entry. **This is the
   sharpest capability the v1.0 format gives
   up, and it is given up on purpose**: R5's "sensible default
   permissions" waits for v1.1. The cost is bounded and known — no v1.0
   pack wanted it, and F5's three settings steps were invalid recipes
   that named no source and no key — and what is bought is that the whole
   S-1 class is **structurally impossible** at v1.0 rather than merely
   forbidden by a table.
9. **A pack cannot edit a JSON file a project already has.** With
   `merge-json` gone there is no primitive that reads a destination's
   existing content, so a pack that wants to add one key to an existing
   `tsconfig.json` cannot: it can only write a file it places itself.
   That is the same deletion seen from the pack author's side, and it is
   the price of the unqualified determinism claim in §NFR.
10. **Reserved-destination class 2 is a denylist, and a denylist is
    incomplete by construction** (C-31). It closes the routes this
    document has identified, each with a named rule and an adversarial
    fixture. It is **not** a proof that no other destination on a user's
    machine is executed by some toolchain, and §NFR *Bounded capability*
    is written to that standard rather than to an absolute — which is
    precisely the correction v2.4 makes, since the absolute version of
    that sentence is what stopped anyone extending the enumeration. The
    obligation this creates is procedural and is stated in US-3: an entry
    is added to the table and a fixture to US-16 **in the same change**.
    **v2.5 is the evidence that the obligation is real rather than
    formal** (C-41): `.mcp.json` — a file that declares MCP servers as
    command lines the runtime launches, and the sibling of
    `.claude/settings.json` — was absent from the whole spec set through
    v2.4, one `copy` away, while class 2's own category named exactly it.
    The list grew by seven basenames and two names in one pass. It will
    grow again.
11. **A pack cannot contribute a permission by any route, including the
    one it is supposed to write to and the one it merely ships**
    (C-32a, C-39c, C-40). `.claude/commands/*.md`
    frontmatter is the second door on the settings story, and it is shut
    for the same reason and until the same version; **a `.claude/`
    subtree in the payload is the third**, shut at v2.5 by the same rule
    at a second quantifier, because phase 1 copies it verbatim into the
    committed project; and **`permissionMode` is the fourth**, bounded to
    a pinned non-widening value. Cost at v1.0: zero —
    no bundled command or skill declares `allowed-tools`, no bundled
    agent declares a widening mode, and no v1.0 pack ships a `.claude/`
    directory in its payload.
12. **The `.claude/` frontmatter rule is pinned against a contract this
    document does not own** (C-32a, C-40). The key names that express
    *"declares a permission decision"* — **grant keys and mode keys** —
    and the **non-widening mode values** belong to the Claude Code
    runtime and move
    independently of this spec. The CLI holds all three in one named
    constant
    with the runtime version the pin was taken against, so the staleness
    is visible and locatable. **The two halves fail in opposite
    directions and that is deliberate:** a permission-bearing **key** the
    runtime adds after the pin is taken **is not caught until the pin is
    updated**, while an unrecognised **value** is refused. Fail-open on
    the key half is the residual limit; it is
    a maintenance obligation on this document, not a
    property of the format, and it is stated rather than hidden behind a
    hard-coded spelling that would have the same weakness and nowhere to
    record it.
13. **A pack's agent files declare tools and a permission mode, and the
    tools half is disclosed rather than bounded** (C-32b, C-40, C-45).
    `coding`'s ten agents declare `tools:`
    lists; **two of them — `implementer` and `testwriter` — include
    `Bash`**, and `researcher` declares **`WebSearch, WebFetch`, the only
    network capability any v1.0 pack ships**. Nothing in the format
    limits
    what a pack may put in a `tools:` list; what the format guarantees is
    that the
    list runs underneath a permission engine the pack cannot write to
    (US-3 stage 2, at **any** `.claude` segment) and that every line of
    the file's frontmatter is shown to the adopter
    before the apply writes anything. That is the same
    enumerate-don't-gate trade C-12 makes for the executable bit and
    C-28 makes for a substituted answer, and it is a real limit, not a
    control. **`permissionMode` is the exception to the trade** and is
    bounded rather than merely disclosed (C-40), because it selects that
    permission engine's mode instead of running underneath it. **Read
    limit 13 against §NFR *No network*, which is a claim about the CLI
    and not about the runtime**: the CLI makes no request, and a pack
    ships an agent that can.
14. **A scaffold that needs a mixed executable/non-executable directory
    must express it as two steps with complementary `exclude` lists**
    (C-38, §F1.3). `executable` is a property of a step, so a single
    recursion cannot vary it per file. An **overlap** between the two
    lists is caught for free — `E-MAP-COLLISION` — but a **gap** is not:
    a file matched by neither step is silently not copied out, and
    nothing in the format knows the author meant the whole directory.
    The link check and the folder-README check catch the cases that
    matter for the two v1.0 backend scaffolds; the general case is a
    pack-authoring discipline problem.
15. **`AnatomyDecl.declaredBy` is a behaviour-selecting value that no
    rule governs, and `"declaredBy": "payload"` is unhandled** (C-47,
    **recorded, not fixed, and accepted for v1.0**). US-2 gives each
    anatomy key a content source of `{ "paths": [...] }` **or**
    `{ "declaredBy": "recipe" }`, valid only for `folderScaffolding`,
    whose shape *is* the recipe's set of destinations — so the value
    `"recipe"` **selects behaviour**. It is covered by neither US-1's
    closed enumeration of six behaviour-selecting positions nor the
    boolean-typing rule, so **no rule in this document says what
    `"declaredBy": "payload"` does**: whether it is `E-UNKNOWN-VALUE`
    exit 2, an ignored unknown key, or silently accepted. **The
    requirement, stated so a v1.1 implements it rather than
    rediscovering it:** `AnatomyDecl.declaredBy` becomes the **seventh**
    behaviour-selecting position in US-1's enumeration, matched
    literally against the closed set `{ "recipe" }`, anything else
    `E-UNKNOWN-VALUE`, exit 2, zero bytes — and the enumeration's count
    moves from six to seven in the same change, because a closed
    enumeration whose count is not updated is the defect C-24 and C-34
    both found. **Why it is accepted rather than folded now: no security
    gate rides on it.** `declaredBy` is valid on one anatomy key, feeds
    no destination rule, no confinement stage, no executable rule and no
    disclosure; a pack declaring an unrecognised value gets an anatomy
    part that reports oddly and nothing else. Every other fail-closed
    lapse this document has folded — `Recipe.formatVersion` (C-24), the
    two booleans (C-34) — gated a security control, and this one does
    not. It is recorded here rather than in Open Questions because it is
    **decided**, not pending an answer.
16. **An unknown *command group* has no diagnostic code** (Q-63,
    **recorded, not invented**). Under the group the CLI has two
    unknown-positional faults, not one: `lintel foo …`, where `foo` is
    not a group, and `lintel harness foo …`, where `foo` is not a command
    of the `harness` group. They have different message bodies — a group
    list against a command list — and different remedies — `lintel
    --help` against `lintel harness --help`. §Error States' own rule is
    that *a scenario fatal in one context and tolerable in another gets
    two codes*, and its own precedent is `E-CLAUDE-PERMISSION-MODE`,
    split from `E-CLAUDE-TOOL-GRANT` **because the fault and the remedy
    differ**; the same test decides this one the same way.
    **`E-CLI-UNKNOWN-COMMAND` covers only the second fault**, and the
    first has no code at v1.0, so it can be asserted only by
    string-matching — which is the exact defect the *Diagnostic
    vocabulary* row exists to forbid. **The requirement, stated so a
    later version implements it rather than rediscovering it:** a code of
    the shape `E-CLI-UNKNOWN-GROUP`, **exit 1** (a user-correctable typo,
    the same class as `E-CLI-UNKNOWN-COMMAND`), printing the declared
    group list and `→ lintel --help`, added in the change that decides
    Q-64 — because whether the group list is fixed at build time or
    discovered from plugins is what determines who owns the row.
    **Why it is not added here:** this document is the product's only
    message catalogue, F1 owns it, and Q-63 renamed the surface without
    resizing it; a code invented ahead of the feature that raises it is a
    declaration nothing checks, which is the failure mode Q-60 names.
    **The count of codes is unchanged *by Q-63*.** (The catalogue holds
    **87** at v3.0, which grew it by nine for `update`, `init` and the
    `link()` notice — none of them this limit's missing group code, which
    is still not invented.)

**v1.1 obligations created or restated by this version.** Collected in
one place because the failure mode this amendment exists to correct is an
obligation recorded only inside a row nobody re-reads:

| # | Obligation | Why it must not be rediscovered |
|---|---|---|
| 1 | A returning `merge-json` returns **with** the ownable-key allowlist, the leaf-only rule and the hook exclusion (C-1) | The apparatus was deleted, so a v1.1 author starts from nothing and will otherwise re-derive a weaker version under time pressure |
| 2 | It returns **with** the consent gate (C-2): on the plan, before the lock, zero bytes on refusal, absence of a consent input meaning *not granted*, both flag names re-reserved in US-8 | Every one of those properties was argued for once and is not obvious from the feature request |
| 3 | It returns **with** C-8's substitution ban and its code | The reasoning survives at v1.0 applied to agent-instruction content (C-28); the settings-key rule does not |
| 4 | It returns **with** C-7's JSON escaping *and* the deep-equal re-parse | The deep-equal is the half that catches a value which still parses |
| 5 | It returns **with** C-22: the determinism claim narrowed in all five places, and a `verify` state that never reports `match` at such a destination | The union is idempotent, so an unnarrowed `verify` pronounces a hand-added permission clean — a verifier that is wrong is worse than one that is silent |
| 6 | It returns **with** C-3: `update` may not union a security-relevant array without a `removed` set | Otherwise a second apply resurrects a deleted permission |
| 7 | Restore C-9's marker-lex check in the **same change** that makes `update` read region anchors — not after it | Anchors are inert at v1.0, so a forged one hijacks nothing; the day they are read, it does |
| 8 | `update` checks `payloadDigest` **before** computing a merge base (C-11) | A wrong base loses work silently. The field already exists in every v1.0 manifest, so this is a check, not a migration |
| 9 | F1's pack-content policy stays **a single callable gate** so `contribute` routes through it rather than holding a second copy (C-18) | Two copies of a policy diverge, and the second copy is the one nobody reviews |
| 10 | If execute-time payload reads are ever wanted, **every read re-hashes against the planned content and a mismatch is `E-TARGET-RACE`** (C-23) | This is the price of the reading v2.3 ruled out, recorded so it is inherited rather than argued again |
| 11 | Every new destination rule, closed enumeration or fail-closed parse ships **with its adversarial fixture pack**, in the same change (US-16) | This is the control that would have caught the finding two rounds of table-reading did not |
| 12 | The version that lets a pack contribute permissions must cover **all four doors in the same change** — `.claude/settings.json` **at any `.claude` segment**, `.claude/` frontmatter **grant** keys, `.claude/` frontmatter **mode** keys, and the same rules over the **phase-1 payload set** (`E-CLAUDE-TOOL-GRANT`, `E-CLAUDE-PERMISSION-MODE`, C-32a, C-39a, C-39c, C-40) | They are one capability wearing four file shapes. Reinstating the settings destination while leaving the frontmatter rules in place would be coherent; reinstating it and quietly dropping one of them as "already covered" would reopen the route with no gate at all. v2.4 shipped exactly that mistake three times over — two of the four doors were open while the document claimed the capability was closed |
| 13 | The pinned frontmatter constant — **grant keys, mode keys and the non-widening mode value set** — is **re-checked against the Claude Code runtime's contract at every release**, and the pinned runtime version is updated with it (C-32a, C-40) | A pin is a control only while it is current, and the two halves fail in opposite directions: a **key** the runtime adds after the pin is not caught and the failure is **silent**, while a **value** it adds is refused and the failure is **loud**. Both need the same review; only one of them will announce itself |
| 14 | Reserved-destination class 2 is **reviewed as a denylist, not read as a closed proof** (C-31, C-41) | The v2.3 failure was not a missing entry, it was an absolute claim resting on a three-item list. Whoever adds the next capability must ask what *else* executes what a pack writes, and add the entry and its fixture together. v2.5 added `.mcp.json` — the sibling of `.claude/settings.json` — which is what a *second* pass over the same list found |
| 15 | **A rule stated as a property must be quantified over every set the property is true of, and the sets must be named** (C-39) | Every HIGH of the final pass was one quantifier short of a principle the same version had established. A rule quantified over `to` exempted two primitives (C-19); over the write set, it exempted phase 1 (C-39c); scoped to a first segment, it exempted every nested tree the document itself said was live (C-39a, C-39b, C-39d). The repair is not a longer list, it is stating the quantifier next to the property and naming the sets it ranges over |
| 16 | **`AnatomyDecl.declaredBy` becomes US-1's seventh behaviour-selecting position, and the enumeration's count moves with it** (C-47, §F1.9 limit 15) | It is a behaviour-selecting value no rule governs, accepted at v1.0 only because no security gate rides on it. A v1.1 that adds an anatomy source shape inherits an unhandled value, and a closed enumeration whose count is not updated in the same change is the defect C-24 and C-34 both found |
| 18 | **`src/verify/compare.ts` is security-relevant, not reporting code** (C-55) | `verify` reports on its result; **`update` writes on it**. A comparison defect that would have been a wrong report is a **data-loss** defect once F3 ships, and `verify` is simultaneously the acceptance test for **S7**, so a divergence corrupts the gate that would have caught it. Not a defect and nothing to fix — recorded so the fixture suite treats the module accordingly, and so a later reader does not trim its tests as over-coverage of a comparison |
| 24 | **The journal's `createdDirs` cannot be filled in the order this document specifies** | US-13 requires the journal to record the directories an apply created, **in creation order**, and requires the journal to be written and flushed **before the first write**. Only the writer discovers which directories it creates, so at journal time the list is unknowable. Predicting it is not a safe substitute: rollback removes a recorded directory when it is empty, so **over-recording would delete a directory the user already had** once rollback emptied it. The implementation records `[]`, which means **directories a partial apply created outside `.harness/` survive a rollback as empty directories**. Found by building E-11 and confirmed independently by E-24 (v6.0). Closing it needs either a second journal write after the directory set is known — which weakens *"the journal precedes the first write"* — or a plan-time probe that distinguishes *created by us* from *already present*, which is a change to `ApplyInputs` |
| 23 | **The CLI has no released version, and `package.json` contradicts every bundled pack** | `package.json` declares `0.1.0`; all three packs declare `minCliVersion: 1.0.0`. Resolving the running version from `package.json` would make **every bundled pack fail `E-PACK-CLI-TOO-OLD`** and `init` unable to apply anything at all. The implementation states `1.0.0` in `src/cli/version.ts` with the discrepancy recorded at the constant, because a build that silently rewrote a floor would be worse than one that names the number in a file whose job is naming it. Found by building F2's `init` (v6.0). **A release-time reconciliation, not a code defect** — the version that ships makes the two agree, and this row is what stops that being forgotten. Sibling of limit 21 |
| 22 | **`validate`'s step 11 renders, and nothing says which answers it renders with** | A `required` parameter that appears in no `when` sits on no combination axis, yet step 11 must render or every `{{harness:param.…}}` fails `E-SUBST-UNRESOLVED` — `coding` and `writing` both declare one. This document names no source for such a value. The implementation synthesises a candidate from a fixed ladder and takes the first the declaration accepts, returning **nothing** rather than a value the pack forbids — so **a pack whose `pattern` rejects every candidate cannot be rendered by `validate`**, which is the honest boundary of the workaround. Found by building T-0901 (v5.7). No security gate rides on it: the value never reaches disk, only the render `validate` throws away |
| 21 | **The `.claude/` permission pin has no runtime version recorded against it** | §US-3 and §F1.9 obligation 13 both require *"the runtime version the pin was taken against recorded beside it"* — and **no document in this project names a Claude Code version**. The implementation records `null` and states the obligation at the constant; an invented string would answer *"is this pin current?"* wrongly and with full confidence, which is worse than admitting the gap. Found by building T-0802 (v5.4). **A release blocker, not a code one**: the pin's *contents* are checked and tested, and only the provenance of those contents is unrecorded. The version that ships must fill it in, and this row is what stops that being forgotten |
| 20 | **`ScaffoldDecl.category` is named as a closed behaviour-selecting position, and there is no set for it to be closed against** | US-1 lists `category` among the six positions checked *"against the pack's own declared category set"* — and `pack.json` has **no place to declare one**. It is a free string per scaffold, and the validator checks only its grammar. So one of the six closed positions is **unenforceable as written**, and the sentence reads as though the closure already exists. Found by the E-03 acceptance pass (v4.9). **Recorded rather than fixed, and it waits on Q-83**, which asks the adjacent and prior question — whether `category` belongs to scaffolds, to add-ons, or both, and who owns the namespace once add-ons are authored independently. Inventing a `categories` key now would be deciding Q-83 by implementation. **No security gate rides on it**: `category` selects nothing at apply time; it drives `E-SCAFFOLD-EXCLUSIVE`, which is a refusal rather than a permission, so an unrecognised value composes rather than escalating |
| 19 | **C-15's credential matcher does not treat separators uniformly** | `connection.?string` admits any single separator; `api[_-]?key` and `private[_-]?key` admit only `_` or `-`. So *"Your API key"* and *"private key"* in a `prompt` are **not** matched, while *"connection string"* is. Found by building T-0309 (v4.5). **Not widened here**, because broadening a ban changes which packs are refused and is this document's decision to take; the residual exposure needs an innocuous `id` **and** a spaced `prompt` together, since the check is either-or. A test pins the behaviour so it is not mistaken for uniformity |
| 17 | **`collisionKey` folds ASCII case only** (Q-81, US-3) | Full Unicode case folding is not in the Node standard library and the zero-dependency posture (§NFR) forbids taking one for it. Two applied paths differing only in the case of a non-ASCII letter do not collide, and on a case-insensitive volume they are the same file. No v1.0 pack ships a non-ASCII applied path, so nothing shipped is exposed — but this is a **narrowing of a security control**, recorded as one, and the v1.1 obligation is a full-fold implementation or a vetted dependency admitted for this single purpose before any pack ships such a path |

---

## Open Questions

**None against F1 — and, at v2.7, none anywhere.** **Q-1…Q-61 are all
resolved**: Q-56 and Q-61, the last two that were open, are folded at
this version and recorded in Resolved Decisions below. The rest are
resolved in `specifications/project-brief.md` §12 and are not
re-litigated here. This document carries no open question and **the next
free id is Q-62**. The three that
were open against F1 at v2.0 — **Q-48**, **Q-52** and **Q-53** — were
resolved in the brief and moved to Resolved Decisions below at v2.1;
**Q-54** joins them at v2.3 and **Q-60** at v2.6. **This version opens no
question**, including about `merge-json`: it is decided, not deferred
pending an answer, and what v1.1 owes is an obligation rather than a
question (§F1.9). **Q-60 in particular opens none**: the class of every
existing `W-` code is assigned in §Error States, the default for a future
one is stated, and nothing was left ambiguous enough to defer.

**v2.4 opens none either, and two of its findings are the kind that
usually would.** C-31's denylist could have been raised as *"what else
executes what a pack writes?"* and C-38's disagreement as *"does any v1.0
pack ship an executable?"* — both are **decided here instead**. The
denylist is a closed list with a stated obligation to grow (US-3,
§F1.9 limit 10); the executable question is answered **yes, `coding`
does**, with the recipe, the roots, the counts and the disclosure worked
in §F1.3. C-32's frontmatter pin is likewise a maintenance obligation
(§F1.9 obligation 13), not an open question: the rule is stated as a
property and the pin is where the mutable part lives.

**v2.5 opens none either, and one of its findings is explicitly recorded
rather than asked.** C-47 — *what does `"declaredBy": "payload"` do?* —
is the kind that would ordinarily open a question, and it is **decided
instead**: **accepted as known limit 15**, with the requirement a v1.1
must implement written out in full and carried into obligation 16. It is
not pending an answer; it is a gap this version chose not to close
because no security gate rides on it, and saying so in a numbered limit
is stronger than parking it in a question nobody re-reads. C-40's
non-widening mode value set could likewise have been asked as *"which
permission modes may a pack select?"*; it is **answered here** — the
pinned set at the pinned runtime version, fail-closed on anything else.
C-41's list could have been asked as *"what else does a runtime
launch?"*; it is **answered as far as this document has looked**, with
the denylist framing and the standing obligation (§F1.9 limit 10,
obligation 14) saying plainly that the answer is not complete.

**v2.7 opens none either, and neither of its two folds leaves a
residue.** Q-56 could have been parked as *"how does `verify` treat a
file the product itself is meant to edit?"*; it is **answered here**, as
a declared per-path state with a typed field, an enumerated closed state
set, an exit-code rule and a stated non-change to the manifest. The two
alternatives were considered and rejected in the answer rather than
deferred: widening `differs` to be non-fatal would have made every
`verify` green, and a suppression flag would have made drift tolerable
by invocation rather than by declaration. Q-61 was a **factual error** in
US-32 rather than a question, and is corrected as one; the count it got
wrong is now assertable over `packs/*/recipe.json`. Question
IDs are
unique across the whole project, and a question raised during this
specification takes the next free id: **Q-62**.

---

## Resolved Decisions

Rows Q-18…Q-38 were closed by `F1-ADR-001-pack-format-and-manifest.md`
on 2026-08-30 and re-examined against Q-39…Q-46; rows **Q-48…Q-54** are
closed in `specifications/project-brief.md` §12 and are recorded here
because F1 carries their format-side consequence. Per `conventions.md`
each keeps the ID it was raised under. The settled inputs upstream of all
of them are **Q-1…Q-54** in the brief §12, which this document does not
re-litigate.

| # | Question | Decision | Date |
|---|---|---|---|
| Q-18 | Is `.harness/base/` committed to version control, or gitignored and rebuilt? | **Superseded by Q-43.** There is no `.harness/base/`, so the question and the generated `.harness/.gitattributes` that answered its Windows problem both go. What is committed is `.harness/pack/` and `.harness/manifest.json`, and `init` writes no `.gitignore` entry for either. | 2026-08-31 |
| Q-19 | Should the manifest record a whole-pack integrity hash? | **Superseded by Q-43, then partly restored by Q-52.** `pack.integrity` — a hash of the *bundled pack* — is gone for good. Its underlying concern, proving the project holds the content it was applied with, is answered instead by **`payloadDigest`**: one tree digest over `.harness/pack/`, which is the copy that actually matters, since phase 2 reads only that. See Q-52. | 2026-08-31 |
| Q-20 | Should `harness:if` ever grow beyond a single equality test? | **Superseded by Q-45.** There is no `harness:if`; there is no region parser. The single-equality shape survives as a recipe step's `when`, and the answer is the same: one equality test only. | 2026-08-31 |
| Q-21 | Can an init-parameter answer be changed after apply? | **No in v1.0** — apply into a fresh directory. Unchanged, and cheaper to revisit than it was: `verify`'s recomputation is "render with these answers", so a v1.1 `recalibrate` is that function with a different input and no format change. | 2026-08-30 |
| Q-22 | Can a scaffold be added to or removed from an applied project? | **No in v1.0**; same provision as Q-21. | 2026-08-30 |
| Q-23 | Does `merge-json` survive contact with `.claude/settings.json`? | **Superseded by Q-54 — it does not survive, and neither does the destination.** The v2.2 answer ("keep `merge-json`, tightened") was amended by Q-43 and is now overturned outright: `merge-json` does not ship at v1.0, `.claude/settings.json` and `.claude/settings.local.json` are reserved destinations no step may write, and `E-MERGE-JSON-INVALID`, `E-OWNEDKEY-FORBIDDEN` and `E-SETTINGS-MODE-FORBIDDEN` are removed from the catalogue. The question's own subject — *does the primitive survive contact with the file it exists for?* — was answered twice with "yes, tightened" and twice the tightening was where a CRITICAL was found; the third answer is no. See Q-54. | 2026-08-31 |
| Q-24 | `pack.json`, or a separate `apply.json`? | **Amended by Q-40 — two files.** `pack.json` declares identity, anatomy, parameters and scaffolds; `recipe.json` declares the phase-2 procedure. The ADR's "one file" was right about there being no *third* concept; the recipe is a second one, and separating what a human reads from what an apply executes keeps both short. | 2026-08-31 |
| Q-25 | Does `update` delete a file the pack no longer ships? | **Deferred with `update`** (Q-42). No decision is needed at v1.0, and the minimal manifest constrains it no more than the old one did. | 2026-08-31 |
| Q-26 | Should normalization before hashing also trim trailing whitespace and normalize the final newline? | **No** — BOM and line endings only. Trailing whitespace is real content. Unchanged, and now applies to `verify`'s comparison rather than to a manifest hash. | 2026-08-30 |
| Q-27 | May one shared component declare a multi-destination file mapping? | **Deferred with `shared/`.** The mechanism it designed — a component's own `mappings`, inherited and optionally remapped — was built on the mapping model Q-40 replaced. Reopened as **Q-48**, and **closed there**: no `shared/` at v1.0. | 2026-08-31 |
| Q-38 | Are a pack's document templates copied into the applied project? | **Superseded by Q-47** (which states the supersession properly), and by Q-41 and `pack-inventory.md`. They stay in the payload at `.harness/pack/specifications/`, which is the only copy in the project. The duplication Q-38 accepted no longer arises: there is nothing to duplicate, because phase 2 does not copy what phase 1 already placed. Only `README.template.md` and `project-brief.template.md` are copied out, because a project fills those in. | 2026-08-31 |
| Q-48 | Does the `shared/` mechanism ship at v1.0 at all? | **No** — resolved in the brief §12. There is no `shared` array, no `component.json`, no digest pin, no bump rule and no CI enforcement anywhere in this format; `targets` ships as `coding`-local content and `planning` ships its own copy (Q-49). **Deferred to v1.1** alongside `shared/presentation` (Q-28), when there is a second consumer. F1 confirms nothing of the mechanism remains: no `SharedRef`, no `shared` key in `pack.json` or the manifest, no `E-SHARED-*` code, and **retired US-7 stays retired** — a v1.1 mechanism takes a new story id. | 2026-08-31 |
| Q-50 | How does an apply create a folder, given that no primitive makes an empty directory? | **Every folder an apply creates carries a README** — `README.md` for `coding` and `planning`, `index.md` for `writing`. **`.claude/` and `.harness/` are excluded, both tool-owned.** This dissolves the empty-directory problem rather than solving it: no folder is ever empty, so there is **no `mkdir` primitive**, no eighth primitive, no `skeleton/` tree and no `.gitkeep`. F1's format consequence: **no primitive is added**, and `coding`'s five new folder READMEs are ordinary `rename` steps out of `packs/coding/applied-readmes/` (§F1.3). (Q-50 was recorded when the set was seven; Q-54 has since made it **six**, which strengthens rather than disturbs this answer — the point was always that no *new* primitive is needed.) `.harness/` was added to the exclusion on **2026-08-31**, superseding the earlier proposal that the CLI write `.harness/README.md`: C-5 forbids any write there by a recipe step and F1 opens no carve-out for one. | 2026-08-31 |
| Q-52 | Does the manifest need a payload digest so that `verify` can tell "the applied tree drifted" from "the payload was edited"? | **Yes** — resolved in the brief §12, amending Q-43. **`payloadDigest`**, one tree digest over `.harness/pack/`, recorded **top-level between `pack` and `parameters`** — not nested under `pack`, because `pack` records what the pack declared and the digest records what this apply observed. Over **normalized** content (Q-26), so it survives a CRLF checkout; the accepted cost is that a pure line-ending edit of the payload is undetectable. `verify` checks it **first and fail-closed** (US-33, §F1.8). The manifest is therefore **six keys**, not five, and determinism is unaffected because the digest is a pure function of the payload. | 2026-08-31 |
| Q-53 | Which feature owns `lintel harness verify`? | **F1 owns it**, resolved in the brief §12, alongside `validate` and `pack info`: all three read a pack or a manifest, write nothing, take no lock, and exist to make the format checkable. F2 owns `init` and nothing else. The v1.0 command surface was therefore **four** commands, which is what `E-CLI-UNKNOWN-COMMAND` then listed, and the master spec's command list had to match. **Q-53's answer is unchanged — F1 owns `verify` — but its count is not:** **Q-62** returns `update` to v1.0 as F3's, so the surface is **five**, and both this document's §Technical Context row and `E-CLI-UNKNOWN-COMMAND` are corrected to it at v2.9. | 2026-08-31 |
| Q-60 | Can `validate --all --strict` exit `0` for all three bundled packs, given that two of `planning`'s findings are deliberate design decisions? | **Yes, once warnings are split into two classes.** One severity was doing two jobs — reporting a state a pack declared on purpose, and flagging something an author should fix — so `planning` could not pass CI for reasons that were both *decisions*: part 2 is `provisional` because the role set is genuinely unwritten, and the guard script is inert **because** no pack may register an agent hook at v1.0. Every `W-` code is now classified once, in §Error States, as **`defect`** (author-fixable) or **`notice`** (reports a declared state the pack intends). **`--strict` promotes defects only; a notice always prints, never changes an exit code, and is never fatal under any flag**, because a flag that could promote one would recreate the problem. **Exit classes are unchanged**; only the promotion set changed. **A new `W-` code must declare its class, and an unclassified code is `defect`** — fail-closed, so a forgotten classification makes CI louder rather than quieter; the opposite default was rejected because a silently un-promoted warning is the failure mode this project has hit twice. Two consequences land in the format: **`provenance` becomes a defined optional `pack.json` field** (US-1, §F1.3), so the key F5 §NFR *Provenance* requires stops tripping the unknown-key warning; and **`coding`'s `infrastructure/` finding is a real defect and is fixed** — each backend scaffold gains a third step placing `applied-readmes/infrastructure.md`, taking the recipe from 19 declared steps to **21**. No code is added or removed; the catalogue holds **78**. | 2026-08-31 |
| Q-54 | Does `merge-json` ship at v1.0 at all, given that no bundled pack consumes it? | **No — six primitives, not seven**, resolved in the brief §12. Once F5's three settings steps were deleted as invalid recipes — not one names a `from`, not one names an owned key, and no pack's payload holds a settings source file — `merge-json` had **no v1.0 consumer** while carrying the format's largest attack surface: it was the target of both CRITICALs of the 2026-08-31 Mode A re-review, both lapses of C-16, and the newly found rollback defect. **Deleting the surface is a stronger fix than repairing it.** F1's format consequences, in full: the primitive set is **six**; `ownedKeys`, the ownable-key allowlist and its destination table, the security-relevant key classification, the leaf-only rule, the destination-policy concept and the entire consent gate are **deleted, not disabled**; `.claude/settings.json`, `.claude/settings.local.json` and any `package.json` become **reserved destinations** so that "nothing writes settings" is a checked rule rather than a fact about three packs; **US-6 is retired**; six codes leave the catalogue and four join it, at **76**. **Bonus, and it is not small:** `merge-json` was the only primitive taking a fourth input — the destination's pre-existing content — so removing it makes `verify`'s recomputation identity (§F1.8) and §NFR's determinism sentence **true as originally written**, and C-22's narrowing is deliberately not applied. R5's "sensible default permissions" waits for v1.1, whose obligations are enumerated in §F1.9. | 2026-08-31 |
| Q-56 | `verify` compares whole files and reports `match \| differs \| missing`, region anchors are inert, and F6's job is to adapt the generated `CLAUDE.md`'s project-owned prose. How does a project the skill has done its work on pass `verify`? | **`verify` gains a fourth per-path state, `adapted`, and the pack declares which paths may have it.** `differs` was doing two jobs — *someone changed this* and *this was supposed to change* — and they are split exactly as Q-60 split `defect` from `notice` one layer down. **A recipe step may declare `adaptExpected`** (US-31), on the step that produces the file; the `generate` step for `CLAUDE.md` is the case that matters and all three packs set it. It is a **JSON boolean**, so C-34's typing rule applies and a non-boolean is `E-UNKNOWN-VALUE`, exit 2; US-1's closed enumeration of boolean-typed fields grows from three to **four**. **`verify` reports every applied path in such a step's write set as `adapted`** when it has changed; `adapted` is **not** a failure, is not counted toward `E-VERIFY-MISMATCH`, and **does not affect the exit code**. **An unexpected change still reports `differs` and still fails**: adapt-expected is a per-path property declared by the pack, **never a blanket suppression** — there is no flag, no environment variable and no pack-level switch — and a path no step declared behaves exactly as it did before. The state enumeration is **four and closed**: `match`, `adapted`, `differs`, `missing`; `verify --json` carries the `state` per path beside Q-60's `class` on findings. **The manifest does not change**: the adapt-expected set is recomputable from `.harness/pack/` plus the recipe, which are already §F1.8's inputs, so Q-43's six keys stand and **no seventh key is added** — stated explicitly in US-33 and §F1.8 so a later reader does not go looking for one. **Why it matters for S7:** Q-57 made the conversational path primary, so the skill always runs and an unadapted `CLAUDE.md` exists for seconds; without `adapted`, US-33's green `verify` was checkable only on a project nobody had finished setting up. No code is added and none removed. | 2026-08-31 |
| Q-79 | `project-brief.md` and `writing`'s voice guide ship to be filled in. A filled one reports `differs`, so `verify` exits 1 and US-33's green run — the acceptance test for S7 — is unreachable on any project anybody has used. Widen `adaptExpected`, or something else? | **Something else: `fillExpected`, and two new `verify` states.** `adaptExpected` would have worked and was rejected for what it costs: a filled `project-brief.md` and an adapted `CLAUDE.md` are different facts about a project, and one state for both throws away the more useful of the two. **A step may declare `"fillExpected": true`** (US-31) — a JSON boolean, US-1's **fifth**, with the same write-set quantifier `adaptExpected` takes — and `verify` reports **`unfilled`** where the path matches what shipped and **`filled`** where it does not (US-33). **Both are non-failure; the enumeration goes to six and stays closed.** **The inversion is the point:** for an adapt-expected path, matching is unremarkable; for a fill-expected path, matching means *the user has not done what the pack asked*, and `match` would have hidden it. **`unfilled` is a `notice`** (Q-60) and `--strict` does not promote it — a `--strict` run that could never pass on the day a project is created is the `validate --all --strict` mistake repeated. **The second fault was invisible to `verify` entirely:** `update` would have replaced a filled brief with a fresh template, so **`update` may never overwrite a fill-expected path**, absolutely rather than conditionally on the file having been filled — the two are indistinguishable to a rule that must be right before it looks, and the asymmetry of the costs is total. **`fillExpected` and `adaptExpected` are mutually exclusive on one step** (`E-RECIPE-STEP-INVALID`). No manifest key is added: the fill-expected set is recomputable from the payload and recipe, exactly as the adapt-expected set is, so Q-43's six keys stand. | 2026-09-01 |
| Q-81 | `general/technology-choices.md` §7.1 proposes zero runtime dependencies but records it unratified, and fourteen ⚠️ register entries wait on it — six of F1's blocked tasks among them. Ratify or reject? | **Ratified, and the one item that could not be hand-rolled honestly is resolved by narrowing the claim rather than approximating it.** §NFR now **requires** an empty `dependencies`: strict JSON, schema validation, the `in` glob, semver, the `.claude/` frontmatter reader and the test runner (`node:test`, Node >= 22) are hand-rolled or stdlib. **The argument is this product's own, turned on itself** — four review rounds bounded what a *pack* can do through a CLI that writes into a user's repository, and a runtime dependency is code inside that same boundary that no pack rule governs. **Most of the register was hand-rollable on its merits:** semver needs comparison but no range arithmetic, the glob runs over a known path set with no filesystem handle, the schemas are closed enumerations this document already specifies. **Unicode case folding was the exception**, and it is not a close call: the fold tables are versioned and not one-to-one, a partial implementation folds some pairs and not others while reporting equal confidence for both, and this one sits inside a control deciding whether two paths are the same file. So **`collisionKey` narrows to NFC plus ASCII case-folding** and the consequence is stated as **known limit 17** rather than left implied. **Closes register entries U-1, U-2, U-3, U-4, U-6, U-8, U-10 and U-14**; six remain, and `technology-choices.md` names which. Build-time and test-time dependencies are unconstrained — the requirement governs what ships and runs on a user's machine. | 2026-09-01 |
| Q-61 | US-32 said `coding`'s `CLAUDE.md.template` → `CLAUDE.md` was the only `generate` step in any v1.0 pack. Is that right, and if not, how does every pack get the anchors Q-45 buys? | **It was wrong. All three packs `generate` their `CLAUDE.md`**, and US-32 is corrected rather than narrowed. `generate` is the only primitive that emits inert region anchors, and F5 US-38 asserts anchors for **every** pack, so a pack whose `CLAUDE.md` arrived by `rename` would carry none — `rename` neither substitutes nor asserts anchors. The alternative would have left **two of three packs with nothing for v1.1's `update` to find**, which is the whole of Q-45's forward-investment case. **Counts, all built:** `coding` **six** anchors (`overview`, `layout`, `process`, `agents`, `conventions`, `targets`), `writing` **six** (`overview`, `voice`, `layout`, `workflow`, `coordination`, `standing-instructions`), `planning` **seven** (`overview`, `loop`, `gate`, `practices`, `conventions`, `roles`, `targets`) — **nineteen across three templates**. §F1.9's forward-investment row is corrected with US-32, since it costed the anchors at one template. **No step-count arithmetic depended on the wrong claim**: the three `generate` steps were already counted in each pack's recipe total, so `coding` stays at 21 declared steps, `writing` at its 7 and `planning` at 23. Assertable over `packs/*/recipe.json`: exactly three `generate` steps, one per pack, each writing `CLAUDE.md`, with 6 / 6 / 7 anchors. | 2026-08-31 |
