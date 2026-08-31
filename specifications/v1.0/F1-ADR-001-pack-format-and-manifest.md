# ADR-001 — Pack format, recipe & manifest: a closed primitive set, a six-key manifest, and a pack that can only write text

**Status:** Draft — **rewritten 2026-08-31 against the two-phase model (Q-39…Q-53)**
**Date:** 2026-08-31 (supersedes the 2026-08-30 original in full)
**Deciders:** `architect` (this ADR) · escalations to Thomas Andersen
**Refs:** `specifications/general/pack-application.md` (**authoritative** — the two-phase model) · `specifications/general/pack-inventory.md` (**authoritative** — the three packs, source and applied trees) · `F1-spec-pack-format-and-manifest.md` **v2.0** · `F5-spec-template-packs.md` **v2.0** · `LintelHarnessSpecification-1.0.md` · `specifications/project-brief.md` §12 (Q-1…Q-53, **all resolved, authoritative**) · `packs/coding/specifications/conventions.md` · **security review of 2026-08-30** (Mode A over F1 v1.0 + ADR-001 original: `REVISE-SPEC`, S-1…S-14, conditions C-1…C-18 — re-dispositioned in §8)

**Template deviation, declared:** this is a feature-scoped ADR
(`adr-feature.template.md`) that additionally carries the **file-level
plan** and **public interface contract** sections of
`adr-epic.template.md`. F1 is greenfield — there is no code — and F2, F5
and F6 all compile against or author against what F1 exposes, so the
contract is locked here or each of them invents its own. That is the same
justification `conventions.md` §ADR shape gives for the security-review
exception to "one page".

**Amendment history**

| Date | Pass | Summary |
|---|---|---|
| 2026-08-30 | Initial | Settled six F1↔F5 contract conflicts; closed Q-13, Q-15, Q-18…Q-27. Verdict `PROCEED`. |
| 2026-08-30 | Security remediation | Folded the Mode A finding (`REVISE-SPEC`, C-1…C-18). Added §7 Security architecture and §8 conditions. |
| **2026-08-31** | **Two-phase rewrite** | **Written against Q-39…Q-53. The 2026-08-30 verdict does not transfer and is void.** The declarative `mappings` model, `.harness/base/`, the marked-region grammar, `source-only`/`applied-only`, `shared/` components, `--adopt` and the per-file-hash manifest are all **gone** — not deferred, removed. The apply becomes **two phases**: a verbatim payload copy to `.harness/pack/`, then a **declarative recipe** over seven closed primitives. The manifest becomes **six keys** (Q-43 as amended by Q-52). `verify` is F1's (Q-53). The file-level plan is **rebuilt**; 14 modules of the old plan are deleted and 13 are new. §7's security architecture is **carried forward and rescoped**, not rewritten: both CRITICALs were apply-time and survive intact. Verdict: **`REVISE SPEC`** — see §10. |

---

## 1. Decision

F1 is built as a **pure planner plus a thin effectful executor**, and a
pack is **a text-file distribution channel with a declared, closed
procedure attached to it**. Five things are settled here and are as much
part of the frozen contract as the pipeline order:

1. **The apply is two phases, and the seam is the contract.** Phase 1 is
   a verbatim copy of the pack directory to `.harness/pack/`, identical
   for every pack, reading no field of `pack.json` but the pack's
   location. Phase 2 is a per-pack **recipe** — an ordered list of steps
   over a **closed** seven-primitive set (`copy`, `rename`,
   `strip-suffix`, `rewrite-path`, `substitute`, `generate`,
   `merge-json`) — run by the CLI, never by the user, reading only from
   the phase-1 copy on disk. The set is closed by *type*: `RecipeStep` is
   a seven-arm discriminated union and an `op` outside it is
   `E-RECIPE-PRIMITIVE-UNKNOWN`, exit 2, before anything runs.

2. **Two files, and no third concept.** `pack.json` declares identity,
   anatomy, parameters and scaffolds — what a human reads to choose a
   pack. `recipe.json` declares the procedure — what only an apply reads.
   There is **no `contentRoot`**, because phase 1 copies the folder.

3. **The manifest is six keys**, not five: `manifestVersion`, `cli`,
   `pack`, **`payloadDigest`**, `parameters`, `scaffolds`. Q-43 removed
   the per-file hash list and `.harness/base/` because the applied tree
   is recomputable; Q-52 puts back **one** hash — a single tree digest
   over `.harness/pack/` — because the recomputation otherwise *trusts*
   the payload, and a `verify` that cannot say which side moved is a
   `verify` that reports a hand-edited payload as clean. One digest, one
   tree walk, and determinism is untouched: the digest is a pure function
   of the payload.

4. **`verify` is F1's**, alongside `validate` and `pack info` (Q-53).
   All three read a pack or a manifest, write nothing, take no lock, and
   exist to make the format checkable. F2 owns the apply and nothing
   else. The v1.0 command surface is therefore **four** commands, not
   one.

5. **A pack has no route to execute code on the user's machine, and that
   is a property of the format rather than of the packs that happen to
   ship.** Confinement is by *resolution*, not by string inspection; the
   settings keys a pack may own are a CLI-owned allowlist keyed on the
   **destination**; security-relevant grants are enumerated verbatim and
   consented to before a byte is written; **no pack may register an agent
   hook at v1.0** — `hooks` is outside the ownable set entirely, by format
   decision rather than by consent design; and every value in a
   behaviour-selecting position is fail-closed. That is §7, carried
   forward from the 2026-08-30 remediation pass and rescoped where the
   model moved under it.

Two consequences of the settled model are recorded here because they
change what F1 must specify and F1 v2.0 has not yet folded them:

- **Q-50 dissolves the empty-directory problem rather than solving it.**
  Every folder an apply creates carries a README (`README.md` for
  `coding` and `planning`, `index.md` for `writing`; `.claude/`
  excluded), so **no folder is ever empty**. There is **no `mkdir`
  primitive**, no eighth primitive, no `skeleton/` tree and no
  `.gitkeep`. Five of the coding pack's six new folder READMEs are
  ordinary `rename` steps out of `packs/coding/applied-readmes/`, which
  already exists on disk. F1 v2.0's `skeleton/specifications/` step and
  its "an empty directory is not representable" known limit are
  **superseded** and must come out.

- **The sixth README collides with C-5, and the collision is decided
  here.** `.harness/README.md` is a folder README Q-50 requires, and C-5
  forbids any recipe step writing under `.harness/`. Neither yields.
  **The CLI writes it**, from the fixed payload path
  `applied-readmes/harness.md` when the pack ships one, as a CLI-owned
  write confined by construction exactly as the manifest, journal and
  lock are. C-5 stands unamended and gains one more named carve-out.

### File-level plan

Greenfield TypeScript, ESM, **Node ≥ 22** (Q-16), no runtime dependency
outside Node stdlib for hashing, JSON and fs. Published as
`@lintel/harness`, binary `lintel-harness`. Unit tests live alongside
each module (`*.test.ts`, owned by `implementer`); the integration tree
is `tests/` (owned by `testwriter`).

**Owner** column: *F1* = built and tested under F1; *F1→F2* = F1 defines
and ships it, F2 drives it from the `init` command.

#### Deleted from the pre-rewrite plan — 14 modules, and why

These are not deferred. The concepts they implemented no longer exist.

| Removed module | Because |
|---|---|
| `src/render/pipeline.ts` | The nine-step render pipeline is replaced by an ordered recipe; ordering authority moves to `recipe/plan-steps.ts` |
| `src/render/resolve-mappings.ts` | There are no `mappings` (Q-40) |
| `src/render/region-lexer.ts` · `region-parser.ts` · `region-apply.ts` | No region parser at v1.0 (Q-45). Anchors are inert text |
| `src/render/contribute.ts` | Scaffold `contributes` existed only to append into a base-pack region (Q-45) |
| `src/render/eol.ts` | Its job was the always-LF base copy; `.harness/base/` is gone (Q-43) |
| `src/fs/base-store.ts` | No `.harness/base/`, no `.harness/.gitattributes` (Q-43) |
| `src/manifest/drift.ts` | Drift reporting is F3 (Q-42) |
| `src/pack/shared.ts` | No `shared/` mechanism at v1.0 (Q-48) |
| `src/security/content-policy.ts` | Its consumer is `contribute` (Q-42). **The obligation survives — see C-18 in §8** |
| `src/cli/commands/status.ts` · `update.ts` · `contribute.ts` | Never planned; named so their absence is deliberate rather than forgotten (Q-42) |

#### The v1.0 plan

| File | Action | Owner | Purpose |
|---|---|---|---|
| `package.json`, `tsconfig.json`, `vitest.config.ts` | New | F1 | `@lintel/harness`, bin `lintel-harness`, `engines.node >= 22` (Q-16) |
| `src/index.ts` | New | F1 | Library entry; re-exports exactly the interface contract below |
| **diagnostics** | | | |
| `src/diag/codes.ts` | New | F1 | The single code taxonomy: `DiagnosticCode` union, severity, code→exit-class map |
| `src/diag/catalogue.ts` | New | F1 | Code → message template. **The only place user-facing CLI text exists** |
| `src/diag/diagnostic.ts` | New | F1 | `Diagnostic`, `DiagnosticBag`, `exitCodeFor()` |
| **CLI** | | | |
| `src/cli/main.ts` | New | F1→F2 | argv dispatch over **four** commands — `init`, `validate`, `verify`, `pack` — `Diagnostic[]` → stderr → exit code. `E-CLI-UNKNOWN-COMMAND` |
| `src/cli/flags.ts` | New | F1→F2 | Per-command flag table, **two-pass parse** (pack-declared aliases resolve in pass 2), `--set`, `--scaffold`, `--json`, `--strict`, the four `E-CLI-*` codes and `E-FLAG-NOT-PERMITTED` |
| `src/cli/commands/validate.ts` | New | F1 | `lintel-harness validate <pack> \| --all` (US-16) |
| `src/cli/commands/verify.ts` | **New** | F1 | `lintel-harness verify` (US-33, Q-53). Writes nothing, takes no lock |
| `src/cli/commands/pack-info.ts` | New | F1 | `lintel-harness pack info <name>` — renders `PackReport` (US-29) |
| **pack.json** | | | |
| `src/pack/types.ts` | New | F1 | `PackJson`, `AnatomyDecl`, `ParameterDecl`, `ScaffoldDecl`. **No `Mapping`, no `SharedRef`, no `ComponentJson`** |
| `src/pack/schema.ts` | New | F1 | Hand-rolled structural validator. Unknown **keys** → warning; unrecognised **values in a behaviour-selecting position** → `E-UNKNOWN-VALUE`, exit 2 (C-16) |
| `src/pack/load-pack.ts` | New | F1 | Resolve `packs/<name>/`, parse `pack.json` and the declared `recipe`. Uses `fs/walk.ts`. Resolves **no** shared reference — there are none |
| `src/pack/anatomy.ts` | New | F1 | Nine-part completeness, the three-value status, the report rows, `E-ANATOMY-SOURCE-ON-ABSENT` |
| `src/pack/parameters.ts` | New | F1 | Declaration rules, `pattern`/`maxLength` compilation and enforcement (C-7), answer resolution **at collect time and again on every read-back from the manifest**, flag-alias registration, combination enumeration (≤ 32) |
| `src/pack/scaffolds.ts` | New | F1 | Selection by id; **`category` exclusivity** (`E-SCAFFOLD-EXCLUSIVE`, Q-17); declared-order composition; the static pairwise collision matrix over differing categories |
| **the recipe — new group, and the heart of the rewrite** | | | |
| `src/recipe/types.ts` | **New** | F1 | `Recipe`, `RecipeStep` (the seven-arm discriminated union), `RECIPE_OPS` |
| `src/recipe/schema.ts` | **New** | F1 | `recipe.json` validator. `E-RECIPE-INVALID`, `E-RECIPE-PRIMITIVE-UNKNOWN`, `E-RECIPE-STEP-INVALID`. **Fail-closed and total**: every step is narrowed to exactly one union arm or rejected |
| `src/recipe/ops/index.ts` | **New** | F1 | The **closed registry**: the only place an `op` name maps to an implementation. A new primitive is a change here and in `types.ts`, deliberately |
| `src/recipe/ops/copy.ts` | **New** | F1 | Directory recursion in **byte-ascending path order**, `exclude` globs, basename invariance for a file `from`, `executable` |
| `src/recipe/ops/rename.ts` | **New** | F1 | One file in, one file out, basename may differ. Directory `from` → `E-RECIPE-STEP-INVALID` |
| `src/recipe/ops/strip-suffix.ts` | **New** | F1 | Declared literal `suffix` (`^\.[a-z0-9-]{1,16}$`), no implicit `.template` |
| `src/recipe/ops/rewrite-path.ts` | **New** | F1 | Literal find/replace over already-written applied text files, with hit counting for `E-REWRITE-UNUSED` |
| `src/recipe/ops/substitute.ts` | **New** | F1 | `{{harness:…}}` only, plus the `{{harness:lit:X}}` escape, resolved once and never re-scanned. Every other `{{…}}` untouched. **Context-aware: JSON-string-escapes into a `merge-json` target; bans a line break in any substituted value (C-7, C-9)** |
| `src/recipe/ops/generate.ts` | **New** | F1 | Render a payload template, substitute, then run `anchors.ts`'s assertion |
| `src/recipe/ops/merge-json.ts` | **New** | F1 | Allowlist and leaf-only enforcement, owned-key merge, order-preserving serializer, **re-parse-and-deep-equal verification**. No removal-honouring merge at v1.0 (C-3 defers) |
| `src/recipe/anchors.ts` | **New** | F1 | The **literal line count** of US-32 — not a parser, not a grammar. `E-ANCHOR-INVALID` |
| `src/recipe/plan-steps.ts` | **New** | F1 | Merge base steps with each selected scaffold's steps in **`pack.json`-declared scaffold order**; `when` filtering; the edit-before-place ordering check |
| `src/recipe/glob.ts` | **New** | F1 | The one bounded glob matcher, used by `exclude`, `in` and anatomy `paths` |
| **phase 1 — the payload** | | | |
| `src/payload/copy-payload.ts` | **New** | F1 | The verbatim copy. Raw bytes in, raw bytes out — no BOM handling, no EOL change, no suffix stripping. Journalled exactly as a phase-2 write is |
| `src/payload/digest.ts` | **New** | F1 | **`payloadDigest` (Q-52).** One tree digest over the payload file set, per-file hash **normalized for text and raw for binary** — see §4 for why normalization is load-bearing here |
| **hashing** | | | |
| `src/hash/normalize.ts` | New | F1 | The one normalizer: BOM strip + `\r\n`/`\r` → `\n`. Nothing else (Q-26) |
| `src/hash/sha256.ts` | New | F1 | `hashText`, `hashBytes` — 64 lowercase hex, `node:crypto` |
| `src/hash/digest.ts` | New | F1 | `treeDigest` — path-prefixed, `\n`-joined, byte-ascending. **One call site at v1.0**: `payload/digest.ts` |
| **manifest** | | | |
| `src/manifest/types.ts` | New | F1 | `PackManifest` — **six keys**. No `FileEntry`, no `RegionEntry`, no `OwnedKeyEntry` |
| `src/manifest/canonical-json.ts` | New | F1 | Stable stringify: fixed key order, 2-space, `\n`. Byte-identical re-serialization |
| `src/manifest/read.ts` | New | F1 | Parse, `manifestVersion` gate, unknown-key capture, answer re-validation |
| `src/manifest/write.ts` | New | F1 | Atomic write, byte-identical output |
| **verify** | | | |
| `src/verify/verify.ts` | **New** | F1 | Check `payloadDigest` **first, fail-closed**; then re-run phase 2 **entirely in memory** and compare to disk. `VerifyResult` |
| `src/verify/compare.ts` | **New** | F1 | `match \| differs \| missing`; normalized comparison for text, raw for binary; the executable bit where the platform represents it |
| **security — carried forward** | | | |
| `src/security/confine.ts` | Carried | F1 | **The only constructor of `AppliedPath`.** Anchored `to` grammar, NFC + case-fold `collisionKey`, resolve-and-`lstat` confinement, `confineAtWrite()`. C-4, C-6, C-14 |
| `src/security/harness-paths.ts` | **New** | F1 | **The only constructor of `HarnessPath`** — the CLI's own writes under `.harness/` (`pack/**`, `manifest.json`, `journal.json`, `journal.d/**`, `lock`, `README.md`). Derived from paths already proven grammar-clean, so confined by construction. Closes the typing hole phase 1 opened |
| `src/security/destination-policy.ts` | Carried | F1 | One table keyed by **destination**: the reserved-destination denylist (**extended: no recipe step writes under `.harness/`**), the `ownedKeys` allowlist and its security-relevant marks, the executable-root rules. C-1, C-5, C-12 |
| `src/security/consent.ts` | Carried | F1→F2 | Builds `SecurityDisclosure` from a plan; `renderDisclosure()`; the gate that turns "no consent" into `E-SETTINGS-CONSENT-REQUIRED` before any write and **before the lock**. C-2 |
| `src/security/secret-heuristic.ts` | Carried | F1 | `E-PARAM-SECRET-SUSPECTED` at validate time; `W-ANSWER-LOOKS-SECRET` at answer time. C-15 |
| **filesystem** | | | |
| `src/fs/project-paths.ts` | Revised | F1 | `.harness/` layout constants, POSIX + NFC normalization. All path safety lives in `security/` |
| `src/fs/atomic-write.ts` | Carried | F1 | temp-then-rename, mode bits, created-directory tracking, **exclusive-create semantics and `E-TARGET-RACE`** (C-14) |
| `src/fs/journal.ts` | Revised | F1 | `.harness/journal.json` **v2** (`preExisting`, `preHash`, `preMode`, `backup`) plus `.harness/journal.d/`. **Now covers phase-1 writes too.** C-13 |
| `src/fs/lock.ts` | Carried | F1 | Advisory `.harness/lock` with `{pid, host, startedAt, cli}`; exclusive-create acquire; the three-condition stale rule |
| `src/fs/walk.ts` | Carried | F1 | The one bounded, non-symlink-following walk. Depth 32, 10 000 entries, skip list, `E-TRAVERSAL-LIMIT`. **Two call sites**: the phase-1 payload walk and the `verify` project scan. C-17 |
| **apply** | | | |
| `src/apply/plan.ts` | Revised | F1 | `ApplyInputs` → `ApplyPlan`. Pure: plans **both phases**, computes `payloadDigest` and the manifest, builds `SecurityDisclosure`, writes **nothing** |
| `src/apply/execute.ts` | Revised | F1→F2 | consent gate → lock → journal → **phase 1** → **phase 2** → `.harness/README.md` → manifest → journal removal. The only writer. Re-confines immediately before each write (C-14) |
| `src/apply/rollback.ts` | Revised | F1→F2 | The five-case rule of §7.5, now covering phase-1 paths |
| **validate** | | | |
| `src/validate/validate-pack.ts` | Revised | F1 | The 13-step ordered check runner of F1 US-16 → `PackReport` |
| `src/validate/combinations.ts` | Carried | F1 | Per-parameter-combination render; the 32 cap; `parameterVaryingSteps` |
| `src/validate/link-integrity.ts` | Revised | F1 | `W-LINK-DANGLING`, **payload-aware**: a reference into `.harness/pack/` that exists in the payload is correct and is not reported |
| `packs/` | New | F5 | Pack content. F1 ships no pack; `lintel-harness validate --all` is what binds them. **No `shared/` tree at v1.0** (Q-48) |

Three absences are deliberate and named, because an unnamed absence reads
as an oversight:

- **There is no `src/cli/commands/init.ts`.** `init` is F2's CLI surface
  over `plan.ts` + `execute.ts`.
- **There is no `src/recipe/ops/exec.ts`, `script.ts` or `shell.ts`,
  and no eighth op file of any name.** `ops/index.ts` is the closed
  registry and `RecipeStep` is the closed type; adding one is a change to
  both plus this ADR.
- **There is no hook-registration path.** No `merge-json` step can own
  `hooks`, enforced by `destination-policy.ts` rather than merely
  unimplemented (§7.2.5).

### Public interface contract

The shapes F2, F5 and the test writer compile or author against. No
downstream feature may widen or narrow these without a superseding ADR.
Types marked `// SEC` are load-bearing for §7 — narrowing one silently
removes a control.

```ts
// ── path confinement ────────────────────────────────────────────────────
// SEC (C-14). A nominal brand. The ONLY way to obtain an AppliedPath is
// confinePath(); no cast, no `as AppliedPath` anywhere outside
// src/security/confine.ts. Every recipe-side writer takes AppliedPath,
// never string, so "we forgot to validate this one" is a compile error.
declare const AppliedPathBrand: unique symbol;
export type AppliedPath = string & {
  readonly [AppliedPathBrand]: 'AppliedPath';
};

// SEC. NEW at v2. The CLI's own writes under .harness/ — the phase-1
// payload, the manifest, the journal, journal.d/, the lock and
// .harness/README.md — are NOT recipe steps and do not consult the
// reserved-destination denylist (which forbids .harness/ outright).
// They are confined by CONSTRUCTION: derived from a payload-relative
// path already proven free of '..', of a leading separator and of every
// other construct the grammar rejects. Giving them their own brand is
// what stops the denylist deadlocking against the payload copier, and
// what stops a recipe step reaching a writer that accepts .harness/.
declare const HarnessPathBrand: unique symbol;
export type HarnessPath = string & {
  readonly [HarnessPathBrand]: 'HarnessPath';
};

/** Anything the executor may write. The journal, atomic-write and
 *  rollback take this; nothing else does. */
export type WritablePath = AppliedPath | HarnessPath;

export interface ConfineContext {
  /** realpath() of the project root, resolved ONCE per run. */
  resolvedRoot: string;
  /** realpath() of the directory the CLI itself is installed in. */
  cliInstallDir: string;
  /** 'declared' — grammar + denylist only, no filesystem (validate time)
   *  'resolved' — grammar + denylist + ancestor lstat + descendant proof */
  stage: 'declared' | 'resolved';
}

/** Grammar (§7.1.1) → reserved-destination denylist (§7.1.2) →
 *  resolution confinement (§7.1.3). The single gate. */
export function confinePath(
  declaredTo: string, ctx: ConfineContext,
): { path: AppliedPath; diagnostics: readonly Diagnostic[] } | null;

/** The NFC + case-folded key two applied paths collide on (§7.1.1). */
export function collisionKey(p: AppliedPath): string;

/** SEC (C-14). Re-run immediately before each write. Returns the fd of
 *  an exclusively-created temp file, or a diagnostic. */
export function confineAtWrite(
  p: WritablePath, ctx: ConfineContext,
): Promise<{ fd: number } | { diagnostic: Diagnostic }>;

/** SEC. The only constructor of HarnessPath. `rel` must already satisfy
 *  the payload path grammar; violations are E-PAYLOAD-PATH-INVALID. */
export function harnessPath(
  kind: 'payload' | 'manifest' | 'journal' | 'journalBackup' | 'lock' | 'readme',
  rel?: string,
): HarnessPath;

// ── diagnostics ─────────────────────────────────────────────────────────
export type Severity = 'error' | 'warning';
export type DiagnosticCode = `E-${string}` | `W-${string}`;
export type ExitCode = 0 | 1 | 2 | 3;

export interface Diagnostic {
  code: DiagnosticCode;
  severity: Severity;                // a property of the CODE, never of the occasion
  message: string;                   // rendered from the catalogue
  path?: string;                     // POSIX, pack- or project-relative
  line?: number;                     // 1-based
  step?: number;                     // recipe step index, where the concept applies
  data?: Record<string, string | number | readonly string[]>;
}
export function exitCodeFor(ds: readonly Diagnostic[]): ExitCode;

// ── pack.json ───────────────────────────────────────────────────────────
export type AnatomyPartId =
  | 'process' | 'roles' | 'documentTemplates' | 'conventions' | 'coordination'
  | 'behaviouralGuidelines' | 'folderScaffolding' | 'skillsAndAutomations'
  | 'autonomyContract';

export type AnatomyStatus = 'present' | 'provisional' | 'absent';

/** No `{ ref: 'shared:…' }` arm — there is no shared/ at v1.0 (Q-48).
 *  `declaredBy: 'recipe'` is valid only for folderScaffolding, whose
 *  shape IS the recipe's set of destinations. */
export type AnatomySource =
  | { paths: readonly string[] }              // globs relative to the pack dir
  | { declaredBy: 'recipe' };

export type AnatomyDecl =
  | (AnatomySource & { status?: 'present';     note?: string })
  | (AnatomySource & { status:  'provisional'; note: string })
  | { status: 'absent'; reason: string };

export interface ParameterDecl {
  id: string;                        // ^[a-zA-Z][a-zA-Z0-9]{0,31}$
  prompt: string;
  type: 'string' | 'enum' | 'boolean';
  values?: readonly string[];        // required when type === 'enum'
  default?: string | boolean;
  required?: boolean;                // default false
  flag?: string;                     // kebab-case CLI alias, e.g. 'calibration'
  /** SEC (C-7). REQUIRED when type === 'string'. Anchored regex source
   *  (begins ^, ends $), <= 200 chars, no backreference, no lookaround.
   *  Recommended conservative default, WRITTEN OUT by the author rather
   *  than inherited silently:  "^[\\p{L}\\p{N} ._-]{1,64}$"  with u.
   *  Absent → E-PARAM-NO-PATTERN. Forbidden on 'enum' and 'boolean'. */
  pattern?: string;
  /** SEC (C-7). type 'string' only. Default 256, hard ceiling 4096.
   *  Checked BEFORE `pattern` runs, so pattern evaluation is bounded and
   *  catastrophic backtracking is not reachable. */
  maxLength?: number;
  /** SEC (C-15). Explicit acknowledgement that a parameter tripping the
   *  credential heuristic is not in fact a credential. Without it,
   *  E-PARAM-SECRET-SUSPECTED, exit 2, at validate time. */
  notASecret?: boolean;
}

export interface ScaffoldDecl {
  id: string;                        // ^[a-z][a-z0-9-]{0,31}$
  description: string;
  /** Q-17. Two scaffolds sharing a category are ALTERNATIVES; selecting
   *  both is E-SCAFFOLD-EXCLUSIVE, exit 1. Absent ⇒ composable with
   *  everything. `backend-azure` and `backend-aws` share "backend";
   *  `writing-workstream` declares none. Steps live in recipe.json under
   *  scaffolds.<id> — a ScaffoldDecl carries NO steps. */
  category?: string;
  parameters?: readonly ParameterDecl[];
}

export interface PackJson {
  formatVersion: number;
  name: string;                      // ^[a-z][a-z0-9-]{1,31}$, equals the directory name
  version: string;                   // semver
  title: string;
  minCliVersion: string;             // semver
  /** Pack-relative path to the recipe; defaults to 'recipe.json'. */
  recipe?: string;
  anatomy: Record<AnatomyPartId, AnatomyDecl>;
  parameters?: readonly ParameterDecl[];
  scaffolds?: readonly ScaffoldDecl[];
  /** SEC (C-12). Applied-path prefixes, each ending '/', inside which a
   *  step may set executable: true. Absent or empty ⇒ the pack ships no
   *  executable, which is the default and every v1.0 pack. Each root is
   *  subject to the same grammar and denylist as a step's `to`. */
  executableRoots?: readonly string[];
  provenance?: { source?: string; commit?: string; notes?: string };
  // NO contentRoot — phase 1 copies the folder (Q-39).
  // NO mappings   — phase 2 is a recipe (Q-40).
  // NO shared     — no shared/ mechanism at v1.0 (Q-48).
}

// ── recipe.json — the closed primitive set ──────────────────────────────
export const RECIPE_OPS = [
  'copy', 'rename', 'strip-suffix', 'rewrite-path',
  'substitute', 'generate', 'merge-json',
] as const;
export type RecipeOp = (typeof RECIPE_OPS)[number];

/** Exactly one key. No boolean operators, no negation, no second key —
 *  a compound `when` is E-RECIPE-STEP-INVALID (Q-20, restated). */
export type StepWhen = Readonly<Record<string, string>>;

interface StepBase { when?: StepWhen }

export interface CopyStep extends StepBase {
  op: 'copy'; from: string; to: string;
  exclude?: readonly string[];       // globs relative to `from`
  executable?: boolean;              // SEC (C-12)
}
export interface RenameStep extends StepBase {
  op: 'rename'; from: string; to: string;   // one file; basename may differ
}
export interface StripSuffixStep extends StepBase {
  op: 'strip-suffix'; from: string; to: string;
  suffix: string;                    // ^\.[a-z0-9-]{1,16}$ — no implicit default
  exclude?: readonly string[];
  executable?: boolean;              // SEC (C-12)
}
export interface RewritePathStep extends StepBase {
  op: 'rewrite-path';
  in: readonly string[];             // globs over APPLIED paths already written
  find: string;                      // LITERAL, never a regex, no line break
  replace: string;                   // LITERAL, no line break
}
export interface SubstituteStep extends StepBase {
  op: 'substitute';
  in: readonly string[];             // globs over APPLIED paths already written
  tokens?: readonly string[];        // allowlist of resolvable token bodies
}
export interface GenerateStep extends StepBase {
  op: 'generate';
  template: string;                  // payload path
  to: string;
  anchors: readonly string[];        // ^[a-z][a-z0-9-]{0,31}$ — INERT (Q-45)
}
export interface MergeJsonStep extends StepBase {
  op: 'merge-json'; from: string; to: string;
  /** SEC (C-1). The VALIDATED shape. The raw parse yields string[]; the
   *  schema promotes each entry via checkOwnedKey() against
   *  policyFor(to), or fails E-OWNEDKEY-FORBIDDEN at validate time.
   *  Nothing downstream ever sees an unvalidated key. */
  ownedKeys: readonly OwnedKey[];
}

export type RecipeStep =
  | CopyStep | RenameStep | StripSuffixStep
  | RewritePathStep | SubstituteStep | GenerateStep | MergeJsonStep;

export interface Recipe {
  formatVersion: number;
  steps: readonly RecipeStep[];
  /** scaffold id → its ordered steps. A key naming no declared scaffold,
   *  or a declared scaffold with no key, is E-RECIPE-STEP-INVALID. */
  scaffolds?: Readonly<Record<string, readonly RecipeStep[]>>;
}

// ── destination policy (C-1) ────────────────────────────────────────────
export type ClaudeSettingsOwnableRoot =
  | 'permissions.allow' | 'permissions.deny' | 'permissions.ask'  // security-relevant
  | `env.${string}`                                               // security-relevant
  | 'model' | 'outputStyle';                                      // ordinary

export interface DestinationPolicy {
  destinations: readonly string[];   // applied paths this row governs, matched exactly
  ownable: readonly string[] | null; // null ⇒ any dotted path is ownable
  forbidden: readonly string[];      // dotted-path prefixes never ownable here
  securityRelevant: readonly string[];
  /** [] ⇒ merge-json ONLY. Any other primitive targeting such a
   *  destination is E-SETTINGS-MODE-FORBIDDEN — otherwise a plain `copy`
   *  is a trivial bypass of everything above. */
  allowedOps: readonly RecipeOp[];
}
export function policyFor(dest: AppliedPath): DestinationPolicy;

/** SEC (C-1). Branded exactly as AppliedPath is, and for the same
 *  reason: a dotted path becomes an OwnedKey only by passing
 *  checkOwnedKey() against the policy for its DESTINATION. Widening this
 *  to `string` re-opens S-1. */
declare const OwnedKeyBrand: unique symbol;
export type OwnedKey = string & { readonly [OwnedKeyBrand]: 'OwnedKey' };

export function checkOwnedKey(
  dotted: string, dest: AppliedPath, packSourceJson: unknown,
): { key: OwnedKey; securityRelevant: boolean } | { diagnostic: Diagnostic };

// ── hashing ─────────────────────────────────────────────────────────────
export function normalizeText(bytes: Buffer): string;  // BOM strip + CRLF/CR → LF, nothing else
export function hashText(text: string): string;        // 64 lowercase hex
export function hashBytes(bytes: Buffer): string;
export function treeDigest(
  entries: ReadonlyArray<{ path: string; sha256: string }>,
): `sha256-${string}`;                                  // path-prefixed, \n-joined, byte-ascending

/** Q-52. ONE digest over the whole payload. Per-file hash is
 *  hashText(normalizeText(bytes)) for text and hashBytes(bytes) for
 *  binary — normalized, NOT raw, so a CRLF checkout on Windows does not
 *  read as a tampered payload (see §4). Pure function of the payload,
 *  so determinism is unaffected. */
export function payloadDigest(
  entries: ReadonlyArray<{ path: string; sha256: string }>,
): `sha256-${string}`;

// ── security disclosure & consent (C-2, C-12) ───────────────────────────
// Computed by the PURE planner, so `pack info`, `validate --json` and
// `init`'s pre-write summary render the SAME structure and cannot disagree.
export interface SettingsGrant {
  file: AppliedPath;
  key: string;
  securityRelevant: boolean;
  action: 'add' | 'set';
  /** ONE value, verbatim, exactly the bytes that will be written.
   *  Never summarised, never truncated, never counted. */
  value: string;
}
export interface SecurityDisclosure {
  settings: readonly SettingsGrant[];
  executables: ReadonlyArray<{ path: AppliedPath; source: string }>;
  /** Files landing under .claude/hooks/ — shipped, 0644, registered by
   *  nothing at v1.0. Disclosed so a reader is not misled. */
  inertHookScripts: readonly AppliedPath[];
  /** true iff any `settings` entry is securityRelevant. */
  requiresConsent: boolean;
}
export function renderDisclosure(d: SecurityDisclosure): string;

export interface ConsentInputs {
  acceptPermissions?: boolean;       // --accept-permissions
  /** --accept-hooks. Parsed and ALWAYS refused with
   *  E-HOOKS-NOT-SUPPORTED, so a script written against a future version
   *  fails loudly instead of silently doing nothing. */
  acceptHooks?: boolean;
  /** Present only when a TTY is attached. Absent ⇒ non-interactive, and
   *  requiresConsent without acceptPermissions is
   *  E-SETTINGS-CONSENT-REQUIRED, exit 1, zero bytes. */
  prompt?: (d: SecurityDisclosure) => Promise<boolean>;
}

// ── validator result ────────────────────────────────────────────────────
export interface AnatomyRow {
  part: AnatomyPartId;
  status: AnatomyStatus | 'missing';   // 'missing' only for an INVALID pack
  note?: string; reason?: string; matched: number;
}
/** A recipe step as `pack info` renders it: <op>  <from> → <to>. */
export interface StepSummary {
  index: number; op: RecipeOp;
  from: string | null; to: string | null;
  scaffold: string | null;             // null ⇒ a base step
  when: StepWhen | null;
}
export interface PackReport {
  pack: { name: string; version: string; title: string;
          formatVersion: number; minCliVersion: string };
  anatomy: readonly AnatomyRow[];       // exactly 9, in AnatomyPartId order
  scaffolds: ReadonlyArray<{ id: string; category: string | null;
                             description: string; steps: number }>;
  parameters: readonly ParameterDecl[];
  steps: readonly StepSummary[];        // the complete plan, before applying anything
  /** Steps whose inclusion depends on an answer, and the applied paths
   *  each would write — how a reader sees what --calibration changes. */
  parameterVaryingSteps: ReadonlyArray<{ index: number; when: StepWhen;
                                         writes: readonly string[] }>;
  combinations: number;
  /** SEC (C-2, C-12). Every value under a security-relevant owned key
   *  and every 0755 path, in ANY parameter combination. Empty for every
   *  v1.0 pack — and `pack info` says so rather than printing nothing. */
  disclosure: SecurityDisclosure;
  diagnostics: readonly Diagnostic[];
  ok: boolean;
  // NO `shared` array (Q-48). NO pack.integrity (Q-43).
  // NO parameterVaryingRegions — there are no regions (Q-45).
}
export function validatePack(
  packDir: string, opts?: { strict?: boolean },
): Promise<PackReport>;
export function renderPackInfo(report: PackReport): string;

// ── manifest — SIX keys (Q-43 as amended by Q-52) ───────────────────────
export interface PackManifest {
  manifestVersion: number;
  cli: string;
  pack: { name: string; version: string; formatVersion: number };
  /** Q-52. One tree digest over .harness/pack/. Serialized in THIS
   *  position, between `pack` and `parameters`: it is a fact about the
   *  payload this apply landed, not part of the pack's declared
   *  identity, so it does not belong inside `pack`. */
  payloadDigest: `sha256-${string}`;
  /** EVERY declared parameter and its answer — defaults included, and
   *  answers that selected nothing included, because a `when` must be
   *  re-evaluated against the ORIGINAL answers. Committed and
   *  repo-public by design (C-15). */
  parameters: Readonly<Record<string, string | boolean>>;
  scaffolds: readonly string[];      // selected ids, pack-declared order
  /** Unknown keys read from a newer CLI's manifest, re-inlined verbatim
   *  on write. Not a seventh declared key. */
  unknownKeys?: Record<string, unknown>;
  // NO files[], NO regions, NO ownedKeys record, NO shared[],
  // NO pack.integrity, NO appliedAt, NO manifest self-hash.
}

export function readManifest(projectRoot: string):
  Promise<{ manifest: PackManifest | null; diagnostics: readonly Diagnostic[] }>;
export function writeManifest(projectRoot: string, m: PackManifest): Promise<void>;
export function canonicalJson(value: unknown): string;

// ── verify (US-33, Q-53) ────────────────────────────────────────────────
export type VerifyState = 'match' | 'differs' | 'missing';
export interface VerifyEntry {
  path: AppliedPath;
  state: VerifyState;
  /** false on Windows, where the bit is not represented. The report says
   *  so rather than implying a check ran. */
  modeChecked: boolean;
}
export interface VerifyResult {
  /** Q-52. Checked FIRST and fail-closed: a mismatch makes the
   *  recomputation meaningless, so `entries` is empty and
   *  E-PAYLOAD-DIGEST-MISMATCH (exit 2) is the whole report. */
  payload: { recorded: string; computed: string; ok: boolean };
  entries: readonly VerifyEntry[];
  checked: number; differing: number; missing: number;
  diagnostics: readonly Diagnostic[];
  ok: boolean;
}
/** Reads .harness/manifest.json and .harness/pack/. Writes nothing,
 *  ever — no lock, no journal. Needs no network and no bundled pack. */
export function verifyProject(projectRoot: string): Promise<VerifyResult>;

// ── apply ───────────────────────────────────────────────────────────────
export interface ApplyInputs {
  packDir: string;
  projectRoot: string;
  answers: Readonly<Record<string, string | boolean>>;
  scaffolds: readonly string[];
  cliVersion: string;
  force?: boolean;                   // byte-identical collisions only
  /** SEC (C-2). Absent ≡ {}: non-interactive, no blanket accept. There
   *  is NO value of ApplyInputs that means "consent granted by default";
   *  a caller cannot reach the permissive branch by forgetting a field. */
  consent?: ConsentInputs;
}
export interface PlannedFile {
  path: WritablePath;                // SEC (C-14) — never a bare string
  bytes: Buffer;
  phase: 1 | 2;                      // phase 1 is journalled exactly as phase 2 is
  executable: boolean;
  /** SEC (C-13). What planApply observed on disk, carried into the
   *  journal so rollback can tell "we created this" from "we overwrote
   *  something already here". */
  preExisting: boolean;
  preHash: string | null;            // null iff !preExisting
  preMode: number | null;            // null iff !preExisting
}
export interface ApplyPlan {
  files: readonly PlannedFile[];     // BOTH phases, in write order
  manifest: PackManifest;
  report: PackReport;
  /** SEC. The grants and 0755 paths THIS plan would write, given THESE
   *  answers and scaffolds — narrower than the report's
   *  all-combinations disclosure. This is what init prints. */
  disclosure: SecurityDisclosure;
  diagnostics: readonly Diagnostic[];
  ok: boolean;
}
/** Pure: reads the pack and inspects the project; writes nothing, ever. */
export function planApply(inputs: ApplyInputs): Promise<ApplyPlan>;

// SEC (C-13). Version 2. Version 1 never shipped; a journal declaring
// any other version is E-JOURNAL-UNREADABLE, exit 2, and is never guessed.
export interface JournalEntry {
  path: WritablePath;
  sha256: string;                    // the hash this apply intended to write
  phase: 1 | 2;
  preExisting: boolean;
  preHash: string | null;
  preMode: number | null;
  /** Path under .harness/journal.d/ holding the pre-apply bytes. Written
   *  BEFORE the overwrite, present iff preExisting && preHash !== sha256. */
  backup: string | null;
}
export interface Journal {
  version: 2; cli: string; startedAt: string;
  entries: readonly JournalEntry[];
  createdDirs: readonly string[];    // creation order; removed in reverse
}
export function executeApply(plan: ApplyPlan, projectRoot: string):
  Promise<{ written: number; diagnostics: readonly Diagnostic[] }>;

export interface RollbackResult {
  deleted: readonly string[];        // created by this apply, still ours
  restored: readonly string[];       // SEC (C-13) — overwritten, put back
  kept: readonly string[];           // changed since the crash; left alone
  diagnostics: readonly Diagnostic[];
}
export function rollback(projectRoot: string): Promise<RollbackResult>;
```

---

## 2. Context

**Prior decisions and constraints:**

- **The apply is two phases (Q-39).** Phase 1 is a verbatim copy to
  `.harness/pack/`; phase 2 is the per-pack tie-up. This is not a
  refactor of the old model — it is a different model, and it deletes
  the problem the old one was built around. The nine-step manual-apply
  log in `CLAUDE.md` §Dogfooding splits cleanly along it: steps 1–5 were
  a dumb copy, steps 6–9 were the tie-up.
- **Phase 2 is a recipe, not a script (Q-40).** A script would make a
  pack *code that executes on the user's machine*, which voids the whole
  of §7: path confinement, the reserved-destination denylist and consent
  gating all depend on the plan being inspectable **before** anything
  runs. This constraint is upstream of every design choice below.
- **Phase 2 reads the phase-1 copy (Q-41), and templates stay in it
  (Q-47).** One source of truth per apply; the payload is inside the
  project, so a project has every template locally without a second copy
  the tool must keep in step.
- **v1.0 is F1, F2, F5, F6 (Q-42).** `update`, `status` and `contribute`
  defer to v1.1; `--adopt` is dropped (Q-44). Everything that existed
  only to serve drift detection, 3-way merge or contribute is **removed
  from the format**, not disabled in place.
- **The manifest is minimal (Q-43) plus a payload digest (Q-52).** Q-43's
  argument is that the applied tree is recomputable, so a hash list and a
  cached base are redundant. Q-52 is the correction to that argument: the
  recomputation *trusts* the payload, so one digest over it is what makes
  the recomputation an assertion rather than a tautology.
- **No marked regions (Q-45).** Regions had two justifications and
  Q-39/Q-42 removed both: `update` was their consumer, and the
  source-only/applied-copy problem dissolved once phase 1 copies verbatim
  and Q-46 deletes the bootstrap prose that made two READMEs describe
  their own copying. Anchors ship inert.
- **No `shared/` at v1.0 (Q-48), and `planning` ships its own targets
  copy (Q-49).** With `presentation` deferred, `shared/` had one
  consumer, which is indistinguishable from pack-local content. The
  accepted cost is two copies of the targets contract that will drift
  before v1.1 reconciles them.
- **Every folder an apply creates carries a README (Q-50).** This is a
  content decision with a format consequence: **it removes the need for
  an eighth primitive.** F5 raised the empty-directory question and
  proposed `mkdir`; Q-50 answers it by making the premise false.
- **F1 owns `verify` (Q-53).** It owns `validate` and `pack info` for the
  same reason: all three read a pack or a manifest, write nothing, and
  exist to make the format checkable.
- **S5 — adding a pack requires no core change.** `planning` is authored
  against an already-frozen F1. Any mechanism needing pack-specific code
  in the CLI falsifies S5 before it is tested. This is still the
  strongest constraint on the calibration decision, and the recipe's
  `when` is still the answer.
- **The Mode A security review's verdict of record is `REVISE-SPEC`.**
  Its remediation was folded into F1 v1.0 and into this ADR's original
  §7; both CRITICALs were apply-time and survive the model change intact.
  **No fresh `SECURITY-PROCEED` has been issued against the rewritten
  specs**, and the two-phase model changed the surface under review.

---

## 3. Options considered

The original ADR's six conflicts (error model, calibration surface,
anatomy states, merge base, `pack info` ownership, shared mappings) are
either settled and unchanged, or void with the model. Three of them are
re-argued here because the model moved under them; the other three stand
as decided on 2026-08-30 and are recorded in §6.2.

### 3.1 The shape of phase 2 (Q-40, restated as an architecture choice)

- **A — a closed primitive set expressed as a discriminated union
  (chosen).** Seven arms, one registry, exhaustiveness checked by the
  compiler. *Advantages:* a pack can only do what the primitives allow;
  the complete effect of an apply is renderable by `pack info` before it
  runs; adding a step type is a visible change to the CLI and to this
  ADR. *Disadvantages:* a genuinely novel pack need is a CLI release, not
  a pack release.
- **B — a script primitive, or an `exec` escape hatch.** *Advantages:*
  no primitive is ever missing. *Disadvantages:* voids §7 entirely. Every
  control in this ADR depends on the plan being inspectable before
  execution, and a script is not inspectable. Rejected as
  incompatible with the decision, not merely as worse.
- **C — an open primitive set with a capability declaration.** *Rejected:*
  it is B with paperwork. The reviewer's threat model (§7.0) is that
  `validate` is what pronounces a pack well-formed and that pronouncement
  outlives "packs are bundled"; a declared capability is a thing a pack
  author writes, and the whole point of the allowlist model is that what
  a pack may do is decided by the CLI, not by the pack.

### 3.2 What the manifest carries about the payload (Q-52)

- **A — one tree digest, `payloadDigest`, a sixth top-level key
  (chosen).** *Advantages:* closes the one honest gap in Q-43's argument
  for a cost of one field and one tree walk; lets `verify` distinguish
  "the applied tree drifted" from "the payload was edited"; covers
  `recipe.json` too, since the recipe is in the payload, so a hand-edited
  recipe is detected by the same check; pre-answers the payload half of
  C-11 before v1.1 needs it. *Disadvantages:* the manifest is no longer
  purely a record of *inputs the user chose* — it now also records an
  observation. That is a real conceptual cost and it is worth naming.
- **B — no digest; state the limitation in `verify`'s output** (F1
  v2.0's current position, and Q-43's original). *Advantages:* the
  manifest stays five keys and purely declarative. *Disadvantages:*
  `verify` reports a hand-edited payload as `match`, which is the exact
  failure mode `verify` exists to catch. Q-52 supersedes it.
- **C — the per-file hash list Q-43 rejected.** *Rejected again*, and for
  Q-43's reason: it duplicates what recomputation already says, and it
  goes stale against a recipe change in a way a single digest cannot.
- **D — `pack.payloadDigest`, nested inside the `pack` object** (F1
  v2.0's Q-52 row proposes this). *Rejected:* `pack` holds what the
  pack **declared** — name, version, formatVersion, all read out of
  `pack.json`. The digest is what this apply **observed**. Mixing the two
  makes `pack` a heterogeneous object and makes "the manifest records the
  inputs" harder to state truthfully. Top-level, between `pack` and
  `parameters`.

### 3.3 The empty-directory problem (Q-50 vs F5's proposed `mkdir`)

- **A — every created folder carries a README; no eighth primitive
  (chosen, Q-50).** *Advantages:* the placeholder becomes useful content;
  five of the six coding READMEs are ordinary `rename` steps out of
  `applied-readmes/`, which already exists in the pack; the primitive set
  stays at seven, which is the number `pack info`, `E-RECIPE-PRIMITIVE-
  UNKNOWN` and this ADR's whole "enumerable capability" argument are
  written against. *Disadvantages:* a pack that genuinely wants an empty
  folder cannot have one. No v1.0 pack does.
- **B — an eighth `mkdir` primitive** (F5's Q-50 default). *Advantages:*
  direct. *Disadvantages:* it buys a capability nothing needs once Q-50
  lands, and it is a primitive whose entire output is invisible to
  `verify`'s file comparison and uncommittable by git — so a pack using
  it would produce an applied tree that does not survive a clone. That
  last point is decisive and is why B is worse than it looks.
- **C — a `skeleton/` tree of placeholder files** (F1 v2.0's current
  worked recipe, §F1.3 step 8). *Rejected:* it is A with worse content.
  Git cannot commit an empty directory, so a skeleton needs placeholder
  files anyway; Q-50 makes those files say something. **F1's `skeleton/`
  step must be replaced.**

### 3.4 `.harness/README.md` — Q-50 against C-5

- **A — the CLI writes it, from a fixed payload path (chosen).**
  `applied-readmes/harness.md`, if the pack ships it, is rendered by the
  CLI to `.harness/README.md` immediately before the manifest — a
  CLI-owned write carrying `HarnessPath`, confined by construction,
  exactly like the manifest. *Advantages:* C-5 stands **unamended** — "a
  recipe step may never write under `.harness/`" remains absolute, which
  is the property that keeps the payload it is reading from immutable
  during phase 2. *Disadvantages:* one more CLI-owned write; it is not
  produced by the recipe, so `verify` does not recompute it (see §5).
- **B — carve a hole in the denylist for `.harness/README.md`.**
  *Rejected:* a denylist with an exception is a denylist an implementer
  gets wrong, and the exception would be a recipe-declared `to` — which
  means the grammar, the collision check and the resolution gate all have
  to reason about a path inside the tree phase 2 is reading. Not worth
  one README.
- **C — drop `.harness/README.md`; treat `.harness/` as tool-owned like
  `.claude/`.** *Genuinely arguable*, and Q-50 already excludes `.claude/`
  on exactly that reasoning. Rejected on reader value: `.claude/` is a
  runtime convention a reader can look up, whereas `.harness/` is this
  product's own invention and the folder that holds the single largest
  thing an apply writes. A newcomer opening it deserves a sentence. **If
  Thomas prefers C the cost is one deleted file and one deleted CLI
  write; nothing else in this ADR moves.**

---

## 4. Rationale

Every choice above falls out of one constraint and one correction.

The constraint is **Q-40**: phase 2 must be inspectable before it runs,
because that is what the entire security architecture stands on. That
decides the discriminated union over a registry lookup (exhaustiveness is
a compile-time property, and `E-RECIPE-PRIMITIVE-UNKNOWN` is what
protects it at the boundary), it decides that `pack info` renders the
complete step list rather than a summary, and it decides that a
"capability" a pack could declare is not an option — what a pack may do
is a property the CLI owns, in the same way and for the same reason that
what a pack may *own* in a settings file is a property of the
**destination** rather than of the pack. The two are the same decision
applied to two surfaces, and keeping them the same shape is what makes S5
survive: adding `planning` touches no table.

The correction is **Q-52**, and it is worth being precise about what it
corrects. Q-43's argument is sound as far as it goes:
`expected = phase2(payload, recipe, answers, scaffolds)`, and every input
is local and committed, so a hash list is redundant. But the argument
proves the applied tree matches *the payload on disk*, not *the pack that
shipped* — and `verify`'s job is the second thing. One digest closes the
gap, and it is the smallest possible closure: not per-file, not
per-region, not an integrity field on the pack, just one hash over one
tree. It also happens to cover `recipe.json`, since the recipe lives in
the payload, so a hand-edited recipe is caught by the same check without
a second mechanism.

**The digest must be over normalized content, and this is load-bearing
rather than a detail.** Phase 1 copies raw bytes, so a naive digest would
be over raw bytes — and a Windows clone with `core.autocrlf` rewrites
those bytes on checkout, making `verify` report a tampered payload on
every Windows machine. That is the same failure the deleted
`.harness/.gitattributes` existed to prevent, arriving by a different
door. Normalizing (BOM strip, CRLF→LF, and nothing else — Q-26) makes the
digest survive a checkout, at the cost of not detecting a pure
line-ending edit of the payload. That trade is already made everywhere
else in the product and it should be made the same way here.

The `.harness/README.md` decision is smaller but the reasoning is the
same shape: when a content decision (Q-50) collides with a security
invariant (C-5), move the work to the side that already has the
capability rather than weakening the invariant. The CLI already writes
five things under `.harness/`; a sixth costs nothing. A denylist hole
costs the reader's ability to state C-5 in one sentence.

---

## 5. Consequences

**What this unblocks:**

- **F2 immediately.** `planApply` / `executeApply` / `rollback` and the
  diagnostic taxonomy are the whole of F2's substrate. F2 adds an argv
  surface for `init`, interactive prompting and the consent UX, and
  nothing else. F2's requirement list is already written: it is the
  nine-step manual-apply log.
- **The test writer now.** The contract above is complete enough to write
  acceptance tests against before implementation exists, which is the
  point of locking it here. The two highest-value tests are stated
  directly by the model: apply twice into two empty directories and
  byte-compare recursively with no exclusions; and make the bundled pack
  unreadable between the phases and require the apply to complete (which
  is Q-41 made checkable).
- **F5's authoring**, once F5 is folded (§6). Calibration is expressible
  today by conditional steps, and `PackReport.parameterVaryingSteps` is
  the mechanically-checked form of F5's "declared calibration-varying"
  assertion.

**What this constrains:**

- **F2 may not reorder the phases or the writes.** `recipe/plan-steps.ts`
  is the single ordering authority, and `apply/execute.ts` writes in the
  order the plan gives. The consent gate precedes the lock; the manifest
  is the last write.
- **v1.1's `update` may only read state through `PackManifest` and
  `.harness/pack/`.** It may not re-derive an applied file set from the
  tree, and it must re-evaluate `when` against the **recorded** answers.
  It must check `payloadDigest` before merging — that is C-11's concern
  and Q-52 has already paid for half of it.
- **F5 loses `shared/` entirely.** Its `shared/targets` section, its
  G5.7, its `E-SHARED-*` error rows and its Q-34/Q-49 dependency chain
  all come out (§6.2).

**What gets harder, and what it costs:**

- **Every diagnostic must be registered in one catalogue before it can be
  thrown**, so adding an error is a two-file change. Unchanged from the
  original ADR and still correct.
- **`merge-json` needs an order-preserving JSON serializer**, which is
  more work than `JSON.stringify` and remains the one place F1 can
  plausibly overrun. Fallback if it does: write-if-absent, and record the
  shortfall against R5. **Cheaper than it was**: with `update` deferred
  there is no removal-honouring merge to build (C-3), so the serializer
  is the whole of the difficulty.
- **`verify` does not recompute `.harness/README.md`.** It is a CLI
  write, not recipe output, so it falls outside the recomputation
  identity. A user who deletes it gets no diagnostic. Bounded, stated,
  and the price of §3.4 option A.
- **A hand-edited manifest can still lie.** `payloadDigest` binds the
  payload to the manifest; nothing binds the manifest to itself, because
  Q-43 removed the self-hash and its only consumer was a merge that no
  longer happens. Someone who edits the payload *and* recomputes the
  digest defeats the check. That is deliberate work rather than an
  accident, v1.0 never merges against the manifest, and stating it is
  better than implying a check that is not there.
- **Two calibrations, two targets contracts, and no mechanical
  consistency check between either pair.** Q-49's duplication is accepted
  and must be a **named v1.1 task**, not a discovery.

**The security model is dormant at v1.0, and that is correct.** No v1.0
pack registers a hook, and no v1.0 pack owns a security-relevant settings
key — so the consent gate never fires for `coding`, `writing` or
`planning`, and `init` stays non-interactive-clean. The apparatus is not
a feature; it is a **format constraint**, and its value is that
`lintel-harness validate` refuses a pack that would grant itself
permissions before that pack can exist.

---

## 6. Conflicts flagged

Everything below is a place where a current document contradicts this ADR
or the settled model. **This ADR edits no other file.**

### 6.1 `F1-spec-pack-format-and-manifest.md` v2.0 — 11 changes

| # | Where | Change | Why |
|---|---|---|---|
| 1 | §Technical Context *Manifest content* · US-10 · §F1.4 · §F1.5 · §F1.8 · §F1.9 · §NFR *Hashing algorithm* · §Open Questions Q-52 | **The manifest is six keys, not five.** Add `payloadDigest: sha256-…` between `pack` and `parameters`; add it to the §F1.4 worked example and its field table (consumer: `verify`, v1.1 `update`); change "lets the manifest be five keys" and "Five keys" to six; change §NFR's "It is **not** used in the manifest" — SHA-256 now has a fourth use; **move Q-52 from Open Questions to Resolved**, citing the brief | Q-52 amends Q-43. F1 v2.0 predates it |
| 2 | §F1.3 step 8 · §F1.3's closing note · §F1.9 known limit 1 · US-3's "An empty directory is not representable" | **Delete the `skeleton/specifications/` step and the skeleton rationale.** Replace with the Q-50 READMEs: five `rename` steps out of `packs/coding/applied-readmes/` (`agentteams.md` → `AgentTeams/README.md`, `specifications-general.md` → `specifications/general/README.md`, `specifications-version.md` → `specifications/v1.0/README.md`, `targets.md` → `targets/README.md`, `copy.md` → `copy/README.md`). Restate the limit as **"an empty directory is not representable, and under Q-50 nothing needs one"** | Q-50 dissolves the premise. `packs/coding/applied-readmes/` already exists on disk with exactly these six files |
| 3 | US-3 stage 2 carve-out · §F1.6 lifecycle · US-10 | **`.harness/README.md` joins the CLI-owned write list** — "the phase-1 payload, the manifest, the journal and the lock" becomes "…, the lock **and `.harness/README.md`**". Sequence it in §F1.6 as step 11b, after phase 2 and before the manifest, sourced from the fixed payload path `applied-readmes/harness.md` | Q-50 requires it; C-5 forbids a recipe step writing it. §3.4 decides it |
| 4 | US-33 · §F1.8 | **`verify` checks `payloadDigest` first, fail-closed.** Delete "What `verify` cannot tell you at v1.0" and §F1.8's "The known limit, stated rather than glossed" — both are void. State the new order: digest, then recomputation; a digest mismatch suppresses the tree comparison because the expectation is computed from an untrusted input | Q-52 |
| 5 | §Error States | **Add `E-PAYLOAD-DIGEST-MISMATCH`, exit 2.** `lintel-harness: .harness/pack/ does not match the payload this project recorded.` / `  recorded {recorded}` / `  computed {computed}` / `  The applied tree cannot be checked against an edited payload.` / `  → Restore .harness/pack/ from version control, or re-apply into a fresh directory.` | New code required by change 4 |
| 6 | §Error States `E-MERGE-JSON-INVALID` | Extend to cover an unparseable **payload-side** `from`. Today the row covers only the destination and the post-serialization re-parse | A `merge-json` whose source JSON is malformed currently has no code |
| 7 | §Open Questions Q-48, Q-53 | **Both are resolved in the brief §12** (Q-48: no `shared/` at v1.0; Q-53: F1 owns `verify`). Move both to Resolved Decisions and cite the brief rather than posing them | The brief is authoritative and post-dates F1 v2.0 |
| 8 | §Technical Context · §F1.6 · US-13 | **Name the type CLI-owned writes carry.** F1 says they are "confined by construction" but the format has no term for them, and the journal covers phase-1 writes whose destination the denylist forbids to a recipe step. Adopt `HarnessPath` / `WritablePath` from the contract above | Phase 1 opened a typing hole the old model did not have. C-14's compile-error property does not hold without it |
| 9 | US-30 | State that the payload file set used for `payloadDigest` is the **planned** set, computed in memory before any write, so "everything is planned before anything is written" stays literally true | Q-52 + the atomicity NFR |
| 10 | §NFR *Legibility* | "The manifest fits on a screen" still holds at six keys — confirm rather than silently leave it | Editorial, but it is an assertion |
| 11 | §Open Questions preamble | "Next free id at the time of writing: **Q-51**" is wrong — Q-51, Q-52 and Q-53 are all allocated and resolved. **Next free is Q-54** | Counter drift |

### 6.2 `F5-spec-template-packs.md` v2.0 — 9 changes, two of them contract breaks

| # | Where | Change | Severity |
|---|---|---|---|
| 1 | §Scope · G5.7 · US-22 · US-28 · the `shared/targets` section · each pack's *References* line · the extraction step (c) · Q-34 | **Remove `shared/` entirely (Q-48).** `targets` ships as `coding`-local content; `planning` ships **its own copy** (Q-49). There is no `shared/` tree, no `component.json`, no digest pin and no bump rule at v1.0 | **Contract break** — F5 specifies a mechanism F1 v2.0 does not define |
| 2 | §Error States, CLI table | **Delete the `E-SHARED-UNDECLARED` and `E-SHARED-STALE` rows.** Neither code exists in F1 v2.0's catalogue, and F5 itself states F1's catalogue is the only one | **Contract break** — F5 cites codes that do not exist |
| 3 | §Error States, "Gap flagged, not filled" | **Delete it. The gap is closed.** F1 v2.0 carries five recipe codes: `E-RECIPE-MISSING`, `E-RECIPE-INVALID`, `E-RECIPE-PRIMITIVE-UNKNOWN`, `E-RECIPE-STEP-INVALID`, `E-RECIPE-SOURCE-MISSING`, plus `E-PAYLOAD-PATH-INVALID` for a `from` that escapes the pack and `E-MAP-RESERVED-DEST` for a step writing somewhere reserved. Cite them | High — F5 asserts a defect in F1 that F1 has fixed |
| 4 | §Open Questions Q-49, Q-50, Q-51 | **All three are resolved in the brief §12.** Move to Resolved Decisions with the brief's answers: Q-49 planning ships its own copy; Q-50 every created folder carries a README and there is **no `mkdir`**; Q-51 the writing extraction may author `index`/`home` templates as recipe scaffolding | High |
| 5 | line ~1057 "**No primitive creates an empty directory** — see Q-50" · line ~1576 "`portfolio/bets/` is created empty" · §NFR "phase 2 writes 19 files and **2 empty directories**" | **Restate against Q-50.** No folder is empty. `planning` gains `portfolio/README.md` and `portfolio/bets/README.md`; `coding` gains six folder READMEs (five recipe steps + `.harness/README.md` written by the CLI); the file/directory counts change | High |
| 6 | `coding` payload outline · the recipe table | **`packs/coding/applied-readmes/` is unstated in F5 and exists on disk.** Add it to the payload inventory and add its five `rename` steps to the recipe table | Medium |
| 7 | Amendment history row 2.0 | Date is still the literal `{{YYYY-MM-DD}}`; the summary still says "`shared/targets` kept, declared by `coding`" | Medium |
| 8 | US-27 · `planning` part 9 · the cross-pack anatomy table | The absorption-gate ABORT's vehicle is now `planning`'s **own** targets contract (Q-49). Part 9 stays `present`. Record Q-49's accepted duplication as a **named v1.1 reconciliation task**, not a discovery | Medium |
| 9 | §Open Questions preamble | "The next free ID is **Q-50**" — Q-50…Q-53 are allocated and resolved. Next free is **Q-54** | Low |

### 6.3 `LintelHarnessSpecification-1.0.md` — 7 changes

| # | Where | Change |
|---|---|---|
| 1 | §Technical Context *v1.0 command surface* — "**`init` only**" | **Wrong.** The v1.0 surface is **four** commands: `init` (F2), and `validate`, `verify`, `pack info` (F1, per Q-53). F1's own `E-CLI-UNKNOWN-COMMAND` message already lists "init, validate, verify, pack". Q-53's decision text says explicitly that the master spec's command list must include `verify` |
| 2 | §Technical Context *Sharing between packs* · §Out of Scope "The `shared/` reference *mechanism* is specified, but it has no v1.0 consumer" · §Feature 1 stub "the explicit `shared/` references Q-4 requires" · §Shared platform changes row | **Q-48 removes the mechanism.** It is not "specified with no consumer"; it does not ship. Restate all four |
| 3 | §Open Questions · §Resolved Decisions · §Counters | **"Q-1…Q-46 are all resolved… next free Q-47" is stale.** Q-47…Q-53 are all resolved in the brief §12. Add index rows for each; next free is **Q-54** |
| 4 | §Counters | "US-1…US-29 allocated, next free **US-30**" is stale. F1 v2.0 uses US-30…US-33 and F5 v2.0 allocates US-34…US-38. Next free is **US-39** — confirm against F5's block at the fold |
| 5 | §Introduction, forward-investment bullet | The minimal manifest records **six** things, not five — add the payload digest (Q-52) |
| 6 | §Technical Context | **Add a row for Q-50** (every created folder carries a README; `.claude/` excluded; no `mkdir` primitive and no `.gitkeep`). It is a cross-cutting content decision with a format consequence and it appears nowhere in the master spec |
| 7 | §Spec-set readiness | Update: the ADR is rewritten as of this document, and its verdict is `REVISE SPEC`. **The remaining blockers stand**: `general/system-architecture.md`, `general/technology-choices.md`, the F2 and F6 specs, every epics-and-tasks document, and a fresh Mode A verdict |

### 6.4 Questions this ADR closes, and questions it does not

**Closed here** (F1-scoped, no escalation needed):

| Q / issue | Closed as |
|---|---|
| Manifest key count and the digest's location | **Six keys; `payloadDigest` top-level**, between `pack` and `parameters`. §3.2 |
| Whether an eighth `mkdir` primitive ships | **No.** Q-50 removes the need; §3.3 argues why `mkdir` is worse than it looks (its output is invisible to `verify` and uncommittable by git) |
| Whether the payload digest is over raw or normalized bytes | **Normalized** (BOM + EOL, Q-26). Raw would make every Windows clone report a tampered payload. §4 |
| Where `.harness/README.md` comes from | **A CLI write**, from the fixed payload path `applied-readmes/harness.md`. C-5 stands unamended. §3.4 |
| What type the CLI's own `.harness/` writes carry | **`HarnessPath`**, with `WritablePath = AppliedPath \| HarnessPath` on the journal, the writer and rollback. §1 contract |
| Whether F1's recipe codes are sufficient for F5's flagged gap | **Yes** — five recipe codes plus two path codes cover unknown primitive, bad shape, missing source, missing recipe, a `from` escaping the pack, and a step writing to a reserved destination. All fail-closed, all exit 2 |
| Q-20 (a `when` beyond single equality) | **Still no.** One equality test, one key. Restated for the recipe |
| Q-24 (`pack.json` or a separate file) | **Two files** — `pack.json` identity, `recipe.json` procedure. Amends the original ADR's "one file", which was right that there is no *third* concept |

**Escalated to Thomas** — one question, and it is small:

| Q | The question | Consequence of each branch |
|---|---|---|
| **`.harness/README.md`** | Keep it, or treat `.harness/` as tool-owned like `.claude/` and drop it? | **Keep (this ADR's choice):** one CLI write, one payload file, one carve-out sentence in F1's US-3; the file is not covered by `verify`. **Drop:** delete `packs/coding/applied-readmes/harness.md`, amend Q-50's count from six to five for `coding`, and nothing else in this ADR moves. Not blocking — F1 can be written either way and the branch changes one paragraph |

---

## 7. Security architecture

Carried forward from the 2026-08-30 remediation pass and rescoped where
the model moved. **Both CRITICALs were apply-time and survive intact.**
Where a subsection is unchanged it says so rather than being restated at
length; where the model moved under it, the change is argued.

### 7.0 The threat model — unchanged, and it still decides the priorities

Lintel Harness is a local developer CLI with no network access, no
registry and no third-party packs (Q-2), packs bundled with the published
binary. There is no remote attacker in this model. Three actors are:

1. **A pack author** — plausibly a colleague, plausibly the user six
   months ago — writing a pack a reviewer skims. Packs are authored in
   one repo and applied in another; the review that would catch
   `"ownedKeys": ["hooks"]` is a JSON diff review, and JSON diff reviews
   are exactly where a permission grant hides.
2. **The format itself**, as a thing other people will copy. Q-2 forbids
   third-party packs at v1.0; it does not forbid someone reading this
   spec in 2027 and building a registry on it. What `validate` calls a
   valid pack is the real security boundary, and it outlives "no
   registry".
3. **The filesystem the CLI writes into**, not fully known at plan time —
   symlinked directories, case-insensitive volumes, a `specifications/`
   that is a symlink into another checkout.

**The authoring-time checks are the high-value half.** They run in CI,
cost nothing at apply, and stop the bad pack from existing rather than
stopping it from working. Runtime checks are defence-in-depth and are
priced as such.

**What the two-phase model changed in this picture, and what it did
not.** Phase 1 adds a large new *write* surface (an entire tree copied
into the project) but adds **no new decision** surface: it reads no
declaration, evaluates no condition, and transforms nothing, so the only
controls it needs are path confinement, the symlink ban, traversal bounds
and size bounds — all of which already existed. Phase 2 replaces
`mappings` with a recipe, which is a *narrower* surface than what it
replaced: seven closed operations instead of an open set of file modes
plus a region grammar plus a contribution mechanism. The removal of the
region parser (Q-45) deletes an entire lexer's worth of attack surface.
Net, the apply-time surface is smaller than the one the Mode A review
assessed.

### 7.1 Confinement is by resolution, not by string — unchanged, one extension

Four ordered stages, all in `src/security/confine.ts`, the **only**
constructor of `AppliedPath`.

**Stage 1 — the anchored `to` grammar** (C-6, declaration time). Unchanged
from the original ADR and now fully carried in F1 v2.0 US-3: the
segment grammar; rejection of leading separators, any `\`, `^[A-Za-z]:`
(both `C:\x` and drive-relative `C:x`), `//`/`\\` prefixes, `.`/`..`/empty
segments, segments ending in `.` or whitespace, and reserved Windows
basenames; mandatory NFC with `W-PATH-NON-NFC` on discovered basenames;
`collisionKey` = NFC-normalized then case-folded, with
`E-MAP-CASE-COLLISION` and `E-MAP-NORM-COLLISION` as separate codes
because the remedy is different prose. **Extended by the model:** every
payload-relative `from`, and every path phase 1 copies, satisfies the same
grammar minus the trailing-slash rule — `E-PAYLOAD-PATH-INVALID`. That is
what stops a pack shipping a file whose name is legal on the authoring
machine and catastrophic on the applying one.

**Stage 2 — the reserved-destination denylist, on the resolved path**
(C-5). Unchanged in mechanism, **extended in scope**: no step's `to`, no
scaffold step's `to` and no `executableRoots` entry may resolve under
`.git/`, `.hg/`, `.svn/` or `.harness/`, or inside the CLI's own resolved
install directory. `E-MAP-RESERVED-DEST`, exit 2, checked **after**
resolution.

> **The `.harness/` extension is the security consequence of Q-39 and it
> must be stated as an absolute.** A recipe step may **never** write under
> `.harness/` — which includes writing into the payload it is reading
> from. Under the old model `.harness/` held only bookkeeping; under the
> two-phase model it holds **the input to phase 2**. A step that could
> write there could rewrite its own source mid-run, which destroys
> determinism, destroys `verify`'s recomputation identity, and gives a
> pack a way to make the applied tree depend on step order in a way the
> plan did not show. This is a stronger reason than the original
> denylist's, and it is why §3.4 refuses to open a hole in it for one
> README.

**Carve-out, restated.** The CLI's own writes under `.harness/` — the
phase-1 payload, the manifest, the journal, `journal.d/`, the lock **and
`.harness/README.md`** — are not recipe steps and do not consult the
denylist. They carry `HarnessPath`, are derived from paths already proven
grammar-clean, and are confined by construction. Without this stated, an
implementer deadlocks the denylist against the payload copier.

**Stage 3 — resolution confinement** (C-4, amended as on 2026-08-30 and
the amendment stands). The project root is resolved **once per run** with
`realpath()` and everything is judged against the resolved root —
without which the CLI refuses to run in `/tmp` on macOS. Below it: every
ancestor `lstat`ed top-down, `E-DEST-SYMLINK` on any symlink, junction or
reparse point; directories created one level at a time, each checked
before the next; the final destination `lstat`ed; the resolved parent
joined with the basename proven a **strict descendant** of the resolved
root. Skipped at `validate`, which has no project.

**Stage 4 — the write** (C-14). `PlannedFile.path` is `WritablePath`, so
a path that never went through a confining constructor cannot reach the
writer without a compile error. `executeApply` re-runs stage 3
immediately before each write, creates the temp file with `open(tmp,
'wx', mode)`, claims a new destination with `link` then `unlink` (which
fails `EEXIST` where `rename` would not), and re-hashes a destination the
plan expects to exist. Any failure is `E-TARGET-RACE`, exit 2, journal
intact.

### 7.2 The settings and consent model — unchanged in substance

**7.2.1 `merge-json` has a destination policy, not a pack policy**
(C-1). Unchanged. The defect was never that `merge-json` exists; it is
that `ownedKeys` was unconstrained, so nothing distinguished
`permissions.allow` from `theme`. The constraint is a table keyed by
**applied path**, so every pack writing that destination gets the same
rule and S5 survives. The v1.0 table (`.claude/settings*.json`,
`package.json`, any other JSON target), the forbidden lists and their
reasons, and the general rule — *a destination is sensitive when some
common toolchain executes what it contains, or governs what may be
executed* — are carried in F1 v2.0 US-6 verbatim and are not restated
here.

**Leaf-only for security-relevant roots.** Unchanged:
`"permissions.allow"` is ownable, `"permissions"` is not; `"env.EDITOR"`
is ownable, `"env"` is not. `E-OWNEDKEY-FORBIDDEN`, exit 2, **at validate
time** — such a pack never ships and never reaches a consent prompt.

**Op lockdown.** The mechanism survives the rename from *mode* to *op*:
`.claude/settings.json` and `.claude/settings.local.json` accept **only**
a `merge-json` step. Any other primitive targeting them is
`E-SETTINGS-MODE-FORBIDDEN`, exit 2 — otherwise a plain `copy` is a
trivial bypass of everything above. `DestinationPolicy.allowedOps`
carries this in the contract.

**7.2.2 Consent is a gate on the plan, before the first byte** (C-2).
Unchanged, including the six-row gate table, the rule that the disclosure
enumerates **every value verbatim, one per line, never summarised and
never counted**, and the property that **no value of `ApplyInputs` means
"consent granted by default"** — a caller cannot reach the permissive
branch by forgetting a field. The gate runs **before the lock is taken**,
so a declined apply does not contend for one. One disclosure builder,
three surfaces (`init`'s summary, `pack info`, `validate --json`).

**7.2.3 `--accept-hooks` exists and always fails.** Unchanged, and
deliberate: a flag that does not exist produces "unknown flag" and invites
a workaround; a flag that exists and fails with `E-HOOKS-NOT-SUPPORTED`
documents the boundary and reserves the name.

**7.2.4 Removal-honouring merge — DEFERRED** (C-3). Its subject is
`update`, and there is no second apply at v1.0 to resurrect anything.
Shipping the bookkeeping now would be manifest fields with no reader.
**Named v1.1 obligation** — see §8.

**7.2.5 THE HOOK DECISION — unchanged and it is the strongest thing in
this section.** No pack may register an agent hook at v1.0. `hooks` and
every path under it are outside the ownable set at **every** destination;
a pack declaring `"ownedKeys": ["hooks"]` fails `E-OWNEDKEY-FORBIDDEN` at
validate time. The four reasons stand, and Q-42 **strengthens** the
second: reason 2 was "`update` makes the consent unbounded, and that is
not fixable in F1" — with `update` deferred, there is now no v1.0
mechanism that could even attempt it, so the decision costs nothing it
did not already cost. A pack **may** ship files under `.claude/hooks/`:
ordinary files, `0644` (the executable bit is forbidden under `.claude/`),
registered by nothing, named by `W-HOOK-SCRIPT-INERT` and listed in the
disclosure so a reader is not misled. That is what `planning`'s
`kill-criteria-guard.sh` is.

### 7.3 Substitution is untrusted input — carried, one half removed

An answer is typed by a user and recorded verbatim in a manifest this
spec **requires to be committed**. It is untrusted at every use.

- **Constrained at declaration** (C-7). `type: 'string'` requires an
  anchored `pattern` (≤ 200 chars, no backreference, no lookaround) and
  takes `maxLength` (default 256, ceiling 4096), checked **before** the
  regex runs so pattern evaluation is bounded and ReDoS is not
  reachable. Unchanged.
- **Validated twice.** At collection, and **again on every read-back from
  the manifest** — the manifest carries no self-integrity check by this
  spec's own design, and `verify` re-renders from recorded answers.
  Unchanged, and now *more* load-bearing than before, because `verify`
  replays answers on every run.
- **Context-aware escaping** (C-7). Substitution takes the destination's
  kind: JSON-string-escaped into a `merge-json` target, verbatim
  elsewhere; the merged output is **re-parsed and deep-equal-checked**
  after serialization, failure being `E-MERGE-JSON-INVALID` with nothing
  written. Unchanged.
- **No substitution into a security-relevant key at all** (C-8).
  `E-SUBST-IN-SECURITY-KEY`, exit 2, at validate time, **no override**.
  A permission string is a decision the pack author makes at authoring
  time; it is not a decision a user makes by typing a project name.
  Unchanged.
- **C-9 survives as half of itself.** The **newline ban** stands:
  `\n`, `\r`, `U+2028` and `U+2029` are forbidden in a substituted value,
  `E-SUBST-NEWLINE`, exit 2. It is the *sufficient* condition and the one
  that holds when a pack author's `pattern` is weak. The **marker-lex
  half is removed with the region parser** (Q-45): `E-SUBST-MARKER-
  INJECTION` and `E-REGION-TAMPERED` have no subject, because the
  anchors of US-32 are inert text that nothing reads, so a forged one has
  nothing to hijack. **Named v1.1 obligation:** restore the lex check
  before `update` starts reading anchors — the day anchors become
  load-bearing is the day a forged anchor becomes an ownership hijack.

### 7.4 The executable bit — carried in full, one deletion

`executableRoots` in `pack.json`, `"executable": true` permitted only
under a declared root (`E-EXEC-ROOT-UNDECLARED`), never under `.claude/`,
`.git/`, `.hg/`, `.svn/` or `.harness/` (`E-EXEC-DEST-FORBIDDEN`, checked
at declaration **and again per applied path**), a cap of 32 per apply
(`E-EXEC-TOO-MANY`), and **every 0755 path enumerated verbatim** in the
init summary and in `pack info`. Enumeration does not gate: disclosure is
what C-12 asks for. Unchanged.

**Deleted:** `FileDrift.modeChanged`. Drift is F3 (Q-42). The *principle*
— an on-disk `chmod +x` is a change and a content-only comparison is
blind to it — survives in `verify`, which compares the executable bit
where the platform represents it and says so where it does not.

### 7.5 Rollback — carried in full, extended to phase 1

Journal **version 2** with `preExisting`, `preHash`, `preMode` and a
`backup` under `.harness/journal.d/` written **before** the overwrite and
present exactly when `preExisting && preHash !== sha256`. The five cases
are exhaustive and are carried in F1 v2.0 US-13 unchanged.

The invariant: **rollback deletes only paths this apply created, restores
only paths this apply overwrote, and acts on neither unless the on-disk
bytes are still exactly what this apply wrote.**

**Extended:** phase-1 writes are journalled and rolled back exactly as
phase-2 writes are. Phase 1 is not privileged; it is only simpler.
`JournalEntry.phase` records which, for diagnostics only — rollback
treats both identically. A journal declaring any `version` other than `2`
is `E-JOURNAL-UNREADABLE`, exit 2, the fail-closed rule applied to the
journal.

### 7.6 Fail-closed, integrity, bounded walks — carried, enumeration rewritten

**Fail-closed default** (C-16), unchanged in rule and **rewritten in
enumeration**. Unknown **keys** warn and are ignored. An unknown or
unrecognised **value in a behaviour-selecting position** is exit 2, zero
bytes. The positions are enumerated and the enumeration is **closed**:

`RecipeStep.op` · `ParameterDecl.type` · `AnatomyDecl.status` ·
`ScaffoldDecl.category` (against the pack's own declared set) · an
`ownedKeys` root against the destination policy · `Journal.version`.

Six positions, down from eleven — `Mapping.mode`, `FileEntry.origin`,
`FileEntry.mode`, `FileEntry.eol`, `TransformName`, a region directive
name and `SharedRef.integrity` all had their subjects deleted. Where a
position has its own code it is used; otherwise `E-UNKNOWN-VALUE`, naming
field, value and permitted values verbatim.

**Severity is a property of the code, not of the occasion.** Unchanged. A
scenario fatal in one context and tolerable in another gets **two codes**,
not one code with two severities.

**Integrity, rescoped.** C-10's subject was `shared[].integrity` and
`shared/` leaves v1.0 (Q-48), so there is no integrity-downgrading flag
left to constrain. The **general rule survives**: a flag registered on a
read-only command is `E-FLAG-NOT-PERMITTED`, exit 1, on a write command —
refused rather than ignored, because a user who typed it believed it did
something. C-11's subject was `pack.integrity`, removed by Q-43; its
concern returns as Q-52 and is **half-answered at v1.0** — the payload is
now digested and `verify` checks it. The half that remains for v1.1 is
"the installed pack claiming this name and version is the same build the
project applied", which needs `update` to have a reason to ask.

**Both walks are bounded and neither follows a link** (C-17). One module,
depth **32**, **10 000 entries**, `lstat` never `stat`, skip list
`.git/`, `.hg/`, `.svn/`, `node_modules/`. **Two call sites at v1.0**:
the phase-1 payload walk and the `verify` project scan (the `untracked`
drift scan left with F3). `E-TRAVERSAL-LIMIT`, exit 2. A symlink in the
pack is `E-SYMLINK-IN-PACK`; one met by the project scan is
`W-SCAN-SYMLINK-SKIPPED`.

**The lock is never broken silently.** Unchanged: broken only when the
recorded host is this host, the recorded pid is not alive, and
`startedAt` is older than 60 s — `W-LOCK-STALE-BROKEN`. Otherwise
`E-LOCK-HELD`. `verify` takes no lock, because it writes nothing.

**Credentials are forbidden, not handled** (C-15). Unchanged in
mechanism, **message corrected**: the disclosure named
`.harness/manifest.json` *and* `.harness/base/`; the base is gone, but
**`.harness/pack/` is committed too**, and it is the largest thing the
apply writes. The heuristic drops bare `key` (which false-positives on
`monkey`, `keyword`, `sortKey`) and matches `api[_-]?key`,
`private[_-]?key`, `secret`, `token`, `passwo?rd`, `credential`,
`connection.?string`. `notASecret: true` is the escape.
`W-ANSWER-LOOKS-SECRET` at answer time is a warning only — an error there
is a false-positive machine. The tempting `type: 'secret'` remains
**rejected**: an unrecorded answer makes the applied tree
non-recomputable, which is the property the whole of Q-43 rests on.

### 7.7 The new surface: the recipe itself, and what validation it gets

A recipe is the one genuinely new thing the Mode A review has not seen.
It is declarative and **fully validated before execution**, which is why
it was chosen over a script — but "validated" must be stated as a list or
it is an assertion.

**What is checked, all at validate time, all fail-closed, all exit 2:**

| Failure | Code |
|---|---|
| `pack.json` names a recipe the pack does not contain | `E-RECIPE-MISSING` |
| `recipe.json` unparseable, or its top-level shape wrong | `E-RECIPE-INVALID` |
| A step's `op` is outside the seven | `E-RECIPE-PRIMITIVE-UNKNOWN` — lists the seven verbatim and states the set is closed |
| A step's inputs are wrong for its `op` — missing required field, a field the primitive does not take, a directory `from` on a file-only primitive, a compound `when`, a scaffold with no steps | `E-RECIPE-STEP-INVALID`, naming step index, `op` and field |
| A step's `from` names nothing in the payload | `E-RECIPE-SOURCE-MISSING` |
| A step's `from` is not a legal pack path — including anything that would escape the pack directory | `E-PAYLOAD-PATH-INVALID` |
| A step's `to` fails the anchored grammar | `E-MAP-PATH-GRAMMAR` |
| A step's `to` resolves into a reserved destination, **`.harness/` included** | `E-MAP-RESERVED-DEST` |
| Two steps write one applied path, over the **merged** step set | `E-MAP-COLLISION` (and the case/normalization variants) |
| An editing step (`rewrite-path`, `substitute`) runs before its target is placed | `E-RECIPE-STEP-INVALID` — a rewrite that runs before its target is an authoring error, not a silent no-op |
| A `rewrite-path` that matches nothing | `E-REWRITE-UNUSED` — a rewrite that no longer applies is stale, and staleness is the defect this product exists to prevent |
| A `merge-json` claiming a key not ownable at its destination, or a security-relevant key claimed via a parent | `E-OWNEDKEY-FORBIDDEN` |
| Any primitive but `merge-json` targeting a settings file | `E-SETTINGS-MODE-FORBIDDEN` |
| A `pack.json`/`recipe.json` scaffold mismatch in either direction | `E-RECIPE-STEP-INVALID` |
| A declared anchor missing, duplicated or unbalanced in the rendered output | `E-ANCHOR-INVALID` |

**Three properties this validation has that are worth naming:**

1. **It is total over the union.** `RecipeStep` is a discriminated union
   and `ops/index.ts` is the only `op`→implementation map, so an
   unhandled arm is a compile error and an unknown `op` is a diagnostic.
   There is no third outcome.
2. **It runs with no project.** Every check above except confinement
   stage 3 is a property of the pack alone, so `validate --all` runs in
   CI with no target directory. That is what makes the authoring-time
   half of §7.0 actually cheap.
3. **It runs per parameter combination** (≤ 32, `E-PARAM-COMBINATORICS`).
   A step reachable only under `--calibration high-floor` is validated,
   and its disclosure is built, without anyone applying it.

**What the recipe does NOT get, stated so a re-review can price it:**

- No check that a `generate` template produces sensible content. The
  anchor assertion is a **line count**, deliberately (Q-45), and an
  anchor inside a fenced code block is counted.
- No cross-step semantic check beyond ordering and collision. Two steps
  that produce a contradictory project are a pack-authoring problem.
- No bound on the number of steps. Bounded in practice by
  `E-PAYLOAD-TOO-LARGE` (32 MB) and `E-TRAVERSAL-LIMIT`, but not
  directly. **A re-review should decide whether it wants one.**

### 7.8 New surfaces for the Mode A re-review

Numbered `N-` to avoid colliding with the reviewer's `C-` namespace.

| # | Surface | Why it is new |
|---|---|---|
| **N-1** | **The phase-1 payload copy.** An entire pack tree written into every project and committed there | New write volume, new size and traversal exposure. Controls: path grammar on every payload path, symlink ban, depth 32 / 10 000 entries, 4 MB per file / 32 MB per payload, journalled and rollback-covered. **No new decision surface** — phase 1 reads no declaration |
| **N-2** | **`.harness/pack/` as phase 2's input.** The thing a recipe reads is inside the project and writable by the user | Controls: no recipe step may write under `.harness/` (C-5, absolute); `payloadDigest` (Q-52) lets `verify` detect an edit. **Residual:** nothing stops a user editing the payload and then running `init` in a *different* project — but the payload is per-project, so this is not a propagation path |
| **N-3** | **The recipe as a declared program.** §7.7 lists its validation | The closed union plus the closed registry is the control. A re-review should test the boundary: an `op` of `"copy "` with a trailing space, a `when` with two keys, a step object with two `op` keys after a JSON duplicate-key parse |
| **N-4** | **`payloadDigest` itself.** A new integrity claim in a manifest with no self-integrity | It binds the payload to the manifest, not the manifest to itself. Someone who edits both defeats it. Stated in §5; a re-review should decide whether that is acceptable given v1.0 never merges |

---

## 8. Security conditions — C-1…C-18 re-disposition

**SATISFIED-IN-ADR** = decided here and implementable against it.
**DELEGATED-TO-SPEC** = decided here, and the named spec section must
carry it before it is testable. **DEFERRED-TO-V1.1** = its subject left
v1.0 with Q-42 or Q-48; the obligation is named so v1.1 inherits it
rather than rediscovering it. Nothing is marked satisfied that is not
specified above.

| C | Disposition | Where |
|---|---|---|
| **C-1** `ownedKeys` allowlist; leaf-only for security-relevant roots; **hooks outside the ownable set entirely**; `E-OWNEDKEY-FORBIDDEN` | **SATISFIED-IN-ADR** | §7.2.1, §7.2.5 · `src/security/destination-policy.ts` · `OwnedKey` brand, `checkOwnedKey`, `DestinationPolicy.allowedOps`. **Already carried** in F1 v2.0 US-6 — no fold needed |
| **C-2** verbatim enumeration + explicit consent, gate on the plan, before the lock, zero bytes on refusal | **SATISFIED-IN-ADR** | §7.2.2 · `SecurityDisclosure`, `ConsentInputs`, `ApplyInputs.consent`, `ApplyPlan.disclosure`, `PackReport.disclosure` · `src/security/consent.ts`. **Already carried** in F1 v2.0 US-13 and US-29 |
| **C-3** removal-honouring settings merge | **DEFERRED-TO-V1.1** | Its subject is `update` (Q-42): it exists to stop a *second* apply resurrecting a deleted permission, and there is no second apply. **v1.1 obligation:** `update` may not union a security-relevant array without a `removed` set, and the manifest fields for it are additive optional keys that do not bump `manifestVersion` |
| **C-4** confinement by resolution; root resolved once; ancestor `lstat`; `E-DEST-SYMLINK`; descendant proof | **SATISFIED-IN-ADR, amendment stands** | §7.1 stage 3 · `confinePath`, `ConfineContext`, `confineAtWrite`. The 2026-08-30 amendment (resolve the root once, apply the ancestor rule below it) is re-affirmed: without it the CLI cannot run in `/tmp` on macOS. **Already carried** in F1 v2.0 US-3 |
| **C-5** reserved-destination denylist on the resolved path | **SATISFIED-IN-ADR, EXTENDED** | §7.1 stage 2. **Extension: no recipe step may write under `.harness/`**, which under the two-phase model means "no step may rewrite its own input". **DELEGATED:** F1 must add `.harness/README.md` to the CLI-owned carve-out list (§6.1 change 3) |
| **C-6** anchored `to` grammar; collision after NFC **and** case-fold | **SATISFIED-IN-ADR, EXTENDED** | §7.1 stage 1 · `collisionKey()`. **Extension:** the same grammar applies to every payload path (`E-PAYLOAD-PATH-INVALID`), which is new surface phase 1 created. **Already carried** in F1 v2.0 US-3 and US-30 |
| **C-7** `pattern` + `maxLength` on every string parameter; JSON escaping into `merge-json`; re-parse verification | **SATISFIED-IN-ADR** | §7.3 · `ParameterDecl.pattern`/`.maxLength` · `recipe/ops/substitute.ts` takes the destination kind · re-parse **and deep-equal**. **Already carried** in F1 v2.0 US-8 and US-4 |
| **C-8** no `{{harness:…}}` under a security-relevant owned key | **SATISFIED-IN-ADR** | §7.3 · `E-SUBST-IN-SECURITY-KEY`, exit 2, at validate time, no override. **Already carried** in F1 v2.0 US-4 |
| **C-9** substitution may not forge a marker | **HALF-SATISFIED · HALF-DEFERRED-TO-V1.1** | The **newline ban** is satisfied (§7.3, `E-SUBST-NEWLINE`) and is the sufficient condition. The **marker-lex half** and `E-REGION-TAMPERED` are removed with the region parser (Q-45) because the anchors are inert and a forged one hijacks nothing. **v1.1 obligation, named:** restore the lex check in the same change that makes `update` read anchors — not after it |
| **C-10** integrity flags fail-closed on write paths | **RESCOPED** | Its subject was `--allow-stale-shared` over `shared[].integrity`; `shared/` leaves v1.0 (Q-48) and the flag does not exist. The **general rule survives** as `E-FLAG-NOT-PERMITTED`, exit 1: a read-only-command flag passed to a write command is refused, not ignored. §7.6 |
| **C-11** integrity verified before a merge | **DEFERRED-TO-V1.1, PARTIALLY PRE-ANSWERED** | Its subject was `pack.integrity`, removed by Q-43. **Q-52's `payloadDigest` answers the half that matters most**: `verify` — and, later, `update` — can prove `.harness/pack/` is the payload this project recorded before trusting anything computed from it. The half that defers is "the *installed* pack claiming this name and version is the same build", which needs `update` to exist to have a consumer. **v1.1 obligation:** `update` checks `payloadDigest` **before** computing a merge base, and refuses on mismatch |
| **C-12** `executable` inside declared roots only; never under `.claude/`/`.git/`/`.harness/`; enumerated | **SATISFIED-IN-ADR** | §7.4 · `PackJson.executableRoots` · `SecurityDisclosure.executables`. `FileDrift.modeChanged` is deleted with drift; the principle survives in `verify`'s mode comparison. **Already carried** in F1 v2.0 US-3 and US-29 |
| **C-13** journal records `preExisting` + pre-apply hash; rollback deletes only what it created | **SATISFIED-IN-ADR, EXTENDED** | §7.5 · `Journal` v2, `JournalEntry`, `.harness/journal.d/`, the five-case table, `RollbackResult.restored`. **Extension: phase-1 writes are journalled identically**, so a crashed payload copy rolls back like anything else. **Already carried** in F1 v2.0 US-13 and US-30 |
| **C-14** branded `AppliedPath`; re-validate before each write; exclusive create; `E-TARGET-RACE` | **SATISFIED-IN-ADR, EXTENDED** | §7.1 stage 4 · the brand and `confineAtWrite()`. **Extension: `HarnessPath` and `WritablePath`** — without them the CLI's own `.harness/` writes have no type, and the compile-error property C-14 buys does not hold across phase 1. **DELEGATED:** F1 must name the type (§6.1 change 8). The 2026-08-30 honesty about the runtime half stands: the brand is excellent value, the TOCTOU re-check is defence-in-depth and is the first thing to cut if F2 overruns |
| **C-15** credential-valued parameters forbidden absent `notASecret`; the manifest is repo-public | **SATISFIED-IN-ADR, message corrected** | §7.6 · `ParameterDecl.notASecret` · `src/security/secret-heuristic.ts`. The disclosure named `.harness/base/`, which no longer exists; it now names `.harness/manifest.json` **and `.harness/pack/`**, both committed. **Already carried** in F1 v2.0 US-8 and US-10 |
| **C-16** fail-closed: unknown keys warn, unrecognised **values** are exit 2 | **SATISFIED-IN-ADR, enumeration rewritten** | §7.6 — six behaviour-selecting positions, down from eleven, with the recipe's `op` replacing `Mapping.mode` and five manifest-shape positions deleted with their subjects. **Already carried** in F1 v2.0 US-1 |
| **C-17** depth and entry caps on both walks; neither follows symlinks | **SATISFIED-IN-ADR** | §7.6 · `src/fs/walk.ts` (depth 32, 10 000 entries, `lstat`, skip list). Two call sites at v1.0: the phase-1 payload walk and the `verify` project scan. **Already carried** in F1 v2.0 US-30, US-33 and §NFR |
| **C-18** `contribute` subject to the identical validation set | **DEFERRED-TO-V1.1** | `contribute` is F4 (Q-42) and `src/security/content-policy.ts` is not built. **v1.1 obligation, named precisely:** F1's pack-content policy must remain **a single callable gate** — the path grammar, the executable rules, the `ownedKeys` allowlist and the recipe validator — so that `contribute` routes through it rather than holding a second copy. The v1.0 module layout already keeps them separable (`security/`, `recipe/schema.ts`), and **v1.1 must not inline any of them into `validate-pack.ts`** |

**Summary:** of 18 conditions, **12 are SATISFIED-IN-ADR** (5 of them
extended by the new model), **1 is half-satisfied and half-deferred**,
**1 is rescoped**, and **4 are deferred to v1.1 with named obligations**.
No condition is dropped. Both CRITICALs — C-1 and C-2 — are satisfied in
full and were already carried into F1 v2.0.

---

## 9. Open follow-ups

1. **A Mode A re-review is required before implementation, and this ADR
   does not substitute for one.** The security review's verdict of record
   is `REVISE-SPEC`; no `SECURITY-PROCEED` has been issued against F1
   v2.0, F5 v2.0 or this rewrite. The surface changed: phase 1 is new
   write volume, `.harness/pack/` is a new mutable input to phase 2, the
   recipe is a new declared program, and `payloadDigest` is a new
   integrity claim (N-1…N-4). The review should also confirm that
   deleting the region parser removed the surface cleanly rather than
   leaving a half-parser in `generate`.
2. **F2's spec does not exist**, and the consent UX belongs to it. §7.2.5
   reason 4 — "designing the declaration here and the consent there
   splits one decision" — is still live for any v1.1 hook work.
3. **The `.harness/README.md` branch** (§6.4) is one escalation, and it is
   small. Either answer is implementable.
4. **`general/system-architecture.md` and `general/technology-choices.md`
   are required and unwritten.** Q-39 changed the shape of the system
   after F1 and the original ADR were written, and nothing currently
   records the whole-system view. This ADR's file-level plan is the
   closest thing that exists and it is F1-scoped.
5. **Q-49's duplication needs an owner.** Two copies of the targets
   contract will drift before v1.1's `shared/` work lands. It should be a
   named task on the v1.1 plan, not a discovery.
6. **A step-count bound on recipes** — §7.7 records that none exists. Not
   blocking; a re-review should decide it.

---

## 10. Verdict

`REVISE SPEC`

**The architecture is settled and I do not expect it to move.** The
two-phase model, the closed seven-primitive recipe, the six-key manifest,
F1's ownership of `verify`, and the security architecture of §7 are all
decidable on the evidence and are decided here. The file-level plan and
the interface contract are complete enough to build and to test against.

**The spec set is not.** Three things stop it, and none of them is a
question — they are folds that have not happened:

1. **F1 v2.0 specifies a five-key manifest and a `skeleton/` tree.** An
   implementer building faithfully from F1 today produces a manifest this
   ADR rejects and a coding recipe the settled model superseded. Six
   changes in §6.1 are mechanical; five are substantive.
2. **F5 v2.0 has two live contract breaks against F1.** It ships
   `shared/targets` as a v1.0 mechanism F1 does not define, and it cites
   `E-SHARED-UNDECLARED` and `E-SHARED-STALE` — codes absent from what
   F5 itself calls the only catalogue. That is exactly the class of
   F1↔F5 contradiction ADR-001's first pass existed to close, and it has
   reopened because Q-48 and Q-49 landed after F5 was written.
3. **The master spec says the v1.0 command surface is `init` only.**
   Q-53 says otherwise and says explicitly that the master spec must
   change. A downstream reader taking the master spec at face value
   builds one command instead of four.

Add to that what the master spec itself already records as outstanding:
no F2 spec, no F6 spec, no `system-architecture.md`, no
`technology-choices.md`, no epics-and-tasks for any feature, and no fresh
security verdict.

**`REVISE SPEC` is therefore a statement about the document set, not
about the design.** The revisions in §6 are folds of already-settled
decisions; none of them requires a new decision, and none of them should
change this ADR. Once F1, F5 and the master spec carry §6's changes and
a Mode A re-review returns, this ADR should be re-stamped `PROCEED`
without amendment.

**Whatever verdict this ADR carries, implementation must not begin
before a fresh Mode A security review of the rewritten specs.** The
verdict of record remains `REVISE-SPEC` and this document does not
change it.
