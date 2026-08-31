# ADR-001 — Pack format & manifest: one diagnostic vocabulary, one parameter mechanism, one merge base

**Status:** Draft — **amended 2026-08-30 (security remediation pass)**
**Date:** 2026-08-30
**Deciders:** `architect` (this ADR) · escalations to Thomas Andersen
**Refs:** `F1-spec-pack-format-and-manifest.md`, `F5-spec-template-packs.md`, `LintelHarnessSpecification-1.0.md` (Q-13…Q-17), `specifications/lintel-harness-brief.md` §7 §12 (Q-1…Q-12), `CLAUDE.md` (§Decided architecture, §Dogfooding), `specifications/conventions.md` §ADR shape · **security review of 2026-08-30** (Mode A over F1 + this ADR: `REVISE-SPEC`, S-1…S-14, conditions C-1…C-18 — dispositioned in §8)

**Template deviation, declared:** this is a feature-scoped ADR
(`adr-feature.template.md`) that additionally carries the **file-level
plan** and **public interface contract** sections of
`adr-epic.template.md`. F1 is greenfield — there is no code — and every
other feature compiles against what F1 exposes, so the contract has to be
locked here or F2/F3/F4/F5 each invent their own. That is the same
justification `conventions.md` §ADR shape gives for the security-review
exception to "one page".

**Amendment history**

| Date | Pass | Summary |
|---|---|---|
| 2026-08-30 | Initial | Settles six F1↔F5 contract conflicts; closes Q-13, Q-15, Q-18…Q-27. Verdict `PROCEED`. |
| 2026-08-30 | **Security remediation** | Folds the SecurityReviewer's Mode A finding (**REVISE-SPEC**, 2 CRITICAL / 4 HIGH, conditions C-1…C-18) against F1 + this ADR. Adds **§7 Security architecture** (confinement, settings/consent, the hook decision, integrity and fail-closed defaults) and **§8 Security conditions**, which maps every condition to where it is satisfied. The Decision gains a fifth settled item; the file-level plan gains a `src/security/` group; the interface contract gains branded `AppliedPath`, `Journal` v2 with `preExisting`/`preHash`, constrained `ParameterDecl`, allowlisted `Mapping.ownedKeys`, `executableRoots`, and consent inputs. Five gaps the amendment pass found are decided in §7.8. Two of the reviewer's conditions are amended rather than adopted verbatim, argued in §8.2. |

---

## 1. Decision

F1 is built as a **pure planner plus a thin effectful executor**: a
deterministic render pipeline that turns `(pack, answers, scaffolds)` into
a complete in-memory `ApplyPlan` and writes nothing, and a journal-guarded
executor that commits that plan atomically. Four contract-level ambiguities
between F1 and F5 are closed here: (1) **one diagnostic vocabulary** — F1's
coded taxonomy and its 0/1/2/3 exit-code classes are the only CLI error
model, F1's table is the only message catalogue, and F5 owns user-facing
strings only for text a *pack ships* (hooks, agent prompts); (2) **one
parameter mechanism** — init parameters with an optional pack-declared CLI
flag alias, so `--calibration helio` is `--set constraintFloor=helio`
expressed as data in `pack.json`, not as pack-specific CLI code;
(3) **a three-value anatomy status** — `present | provisional | absent`,
replacing `declaredAbsent`; and (4) **`.harness/base/` is confirmed as the
merge base** — the exact applied bytes, committed to VCS, protected by a
generated `.harness/.gitattributes`. `harness pack info` is assigned to F1
as a rendering of the validator's `PackReport`. Generated files carry **no
timestamp at all**.

The security remediation pass adds a fifth settled item, of the same
contract weight as the other four: (5) **a pack is a text-file
distribution channel and nothing else.** Confinement is by *resolution*,
not by string inspection; the set of settings keys a pack may own is a
CLI-owned allowlist keyed on the **destination**, not on the pack;
security-relevant grants are enumerated verbatim and consented to before
a byte is written; **no pack may register an agent hook at v1.0**; and
every value in a behaviour-selecting position is fail-closed. The whole
of that model is §7, and it is as much a part of the frozen contract as
the pipeline order — because the alternative is that each of F2, F3, F4
invents its own idea of what a pack is allowed to do to a machine.

### File-level plan

Greenfield TypeScript, ESM, Node ≥ 20, no runtime dependency outside
Node stdlib for hashing, JSON and fs. Unit tests live alongside each module
(`*.test.ts`, owned by `implementer`); the integration tree is
`tests/` (owned by `testwriter`). **Owner** column: *F1* = built and
tested under F1; *F1→F2* = F1 defines and ships it, F2 drives it from the
`init` command. **Rows marked *Revised* were in the pre-amendment plan and
change under §7**; the `src/security/` group is new in the security
remediation pass.

| File | Action | Owner | Purpose |
|---|---|---|---|
| `package.json`, `tsconfig.json`, `vitest.config.ts` | New | F1 | Package `@lintel/harness`, bin `harness`, `engines.node >= 20` (Q-16 — provisional, see §6) |
| `src/index.ts` | New | F1 | Library entry; re-exports exactly the public interface contract below |
| `src/diag/codes.ts` | New | F1 | The single code taxonomy: `DiagnosticCode` union, severity, and the code→exit-class map |
| `src/diag/catalogue.ts` | New | F1 | Code → message template. The only place user-facing CLI text exists |
| `src/diag/diagnostic.ts` | New | F1 | `Diagnostic`, `DiagnosticBag`, `exitCodeFor()` |
| `src/cli/main.ts` | Revised | F1→F2 | argv dispatch, global flags, `Diagnostic[]` → stderr → process exit code. **`E-CLI-UNKNOWN-COMMAND` (§7.8.2)** |
| `src/cli/flags.ts` | Revised | F1→F2 | `--set id=value`, pack-declared `flag` aliases, `--scaffold`, `--json`, `--strict`. **A per-command flag table (C-10), two-pass parse, and the four `E-CLI-*` fail-closed codes of §7.8.2** |
| `src/cli/commands/validate.ts` | New | F1 | `harness validate <pack> \| --all` (US-16) |
| `src/cli/commands/pack-info.ts` | New | F1 | `harness pack info <name>` — renders `PackReport` (conflict 6) |
| `src/pack/types.ts` | New | F1 | `PackJson`, `Mapping`, `AnatomyDecl`, `ParameterDecl`, `ScaffoldDecl`, `SharedRef`, `ComponentJson` |
| `src/pack/schema.ts` | Revised | F1 | Hand-rolled structural validator for `pack.json` / `component.json`; unknown **keys** → warning, unrecognised **values in a behaviour-selecting position** → `E-UNKNOWN-VALUE`, exit 2 (C-16). Adds `executableRoots`, `parameters[].pattern`/`maxLength`/`notASecret` |
| `src/pack/load-pack.ts` | Revised | F1 | Resolve `packs/<name>/`, parse, resolve `shared` refs, splice component mappings. **Uses `fs/walk.ts`; component mappings and `remap` targets are confined exactly as a pack's own are** |
| `src/pack/anatomy.ts` | Revised | F1 | Nine-part completeness, the three-value status, the report rows. **`E-ANATOMY-SOURCE-ON-ABSENT` (§7.8.3)** |
| `src/pack/parameters.ts` | Revised | F1 | Declaration rules, **`pattern`/`maxLength` compilation and enforcement (C-7)**, answer resolution **at collect time and again on every re-read of a recorded answer**, flag-alias registration, combination enumeration (≤ 32) |
| `src/pack/scaffolds.ts` | New | F1 | Selection by id, declared-order composition, static pairwise collision matrix |
| `src/pack/shared.ts` | New | F1 | Component digest, `integrity` check, referencing-pack index for `E-SHARED-STALE` |
| **`src/security/confine.ts`** | **New** | F1 | **The only constructor of `AppliedPath`.** Anchored `to` grammar (§7.1), NFC + case-fold collision keys, resolve-and-`lstat` confinement, `confineAtWrite()` for the pre-write re-check. C-4, C-6, C-14 |
| **`src/security/destination-policy.ts`** | **New** | F1 | One table keyed by **destination**: the reserved-destination denylist, the sensitive-destination table, the `ownedKeys` allowlist and its security-relevant marks, the executable-root rules. C-1, C-5, C-12 |
| **`src/security/consent.ts`** | **New** | F1→F2 | Builds `SecurityDisclosure` from a plan; `renderDisclosure()`; the gate that turns "no consent" into `E-SETTINGS-CONSENT-REQUIRED` before any write. C-2 |
| **`src/security/secret-heuristic.ts`** | **New** | F1 | `E-PARAM-SECRET-SUSPECTED` at validate time; `W-ANSWER-LOOKS-SECRET` at answer time. C-15 |
| **`src/security/content-policy.ts`** | **New** | F1→F4 | `checkContentPolicy()` — the single entry point through which `contribute` must route a candidate patch, so content moving *in* meets the identical validation set as content moving *out*. C-18 |
| `src/render/pipeline.ts` | Revised | F1 | The nine ordered steps of §F1.1 — the single ordering authority; nothing else may reorder. Step 5 now takes the mapping's `mode` (§7.3) |
| `src/render/resolve-mappings.ts` | Revised | F1 | Steps 1–2: `when` filter, directory recursion, rename, `stripTemplateSuffix`. **All path safety now delegates to `security/confine.ts`** and the step emits `AppliedPath`, never `string` |
| `src/render/read-classify.ts` | New | F1 | Step 3: read bytes, binary detection (invalid UTF-8 or NUL in first 8 KB), BOM strip, EOL normalize |
| `src/render/region-lexer.ts` | New | F1 | Marker scanning: three comment wrappers, sole-non-whitespace rule, Markdown fence tracking, 1-based lines |
| `src/render/region-parser.ts` | New | F1 | Tokens → `RegionNode[]`; nesting, unterminated, orphan-end, unknown-directive diagnostics |
| `src/render/region-apply.ts` | New | F1 | Step 4: resolve `if`, strip `source-only`, unwrap `applied-only`, retain `region` markers |
| `src/render/substitute.ts` | Revised | F1 | Step 5: `{{harness:…}}` only, plus the `{{harness:lit:X}}` escape; every other `{{…}}` untouched. **Context-aware by target mode: JSON-string-escapes for `merge-json`; bans a value carrying a line break or lexing as a marker (C-7, C-9)** |
| `src/render/rewrite.ts` | New | F1 | Step 6: literal find/replace over applied paths, with per-rule hit counting for `E-REWRITE-UNUSED` |
| `src/render/contribute.ts` | New | F1 | Step 7: append scaffold contributions inside a named base-pack region, declared scaffold order |
| `src/render/merge-json.ts` | Revised | F1 | `merge-json` mode: **allowlist and leaf-only enforcement**, owned-key merge, **removal-honouring array merge (§7.2.4)**, order-preserving serializer, per-owned-key hashes, **re-parse-and-deep-equal verification** |
| `src/render/eol.ts` | New | F1 | Step 9 emit policy: applied EOL vs the always-LF base copy |
| `src/hash/normalize.ts` | New | F1 | The one normalizer: BOM strip + `\r\n`/`\r` → `\n`. Nothing else (Q-26) |
| `src/hash/sha256.ts` | New | F1 | `hashText`, `hashBytes` — lowercase 64-hex, `node:crypto` |
| `src/hash/digest.ts` | New | F1 | Canonical tree digest, used by shared `integrity`, `pack.integrity` (Q-19) and manifest `integrity` |
| `src/manifest/types.ts` | Revised | F1 | `PackManifest`, `FileEntry`, `RegionEntry`, `OwnedKeyEntry` — the last gaining `security`, `entries` and `removed` so C-3's honoured-removal set has somewhere to live |
| `src/manifest/canonical-json.ts` | New | F1 | Stable stringify: fixed key order, 2-space, `\n`, sorted `files` — shared by writer and integrity |
| `src/manifest/read.ts` | New | F1 | Parse, `manifestVersion` gate, integrity check, unknown-key capture (§F1.5) |
| `src/manifest/write.ts` | New | F1 | `.bak` rotation, atomic write, byte-identical re-serialization |
| `src/manifest/drift.ts` | Revised | F1 | `clean \| modified \| missing \| untracked`, per file, per region, per owned key. **A changed mode bit is `modified`, flagged `modeChanged` (C-12)**. Never writes |
| `src/fs/project-paths.ts` | Revised | F1 | `.harness/` layout constants, POSIX + **NFC** normalization. Root-escape and symlink refusal **move to `security/confine.ts`**; this module keeps layout only |
| `src/fs/atomic-write.ts` | Revised | F1 | temp-then-rename, mode bits, created-directory tracking, **exclusive-create semantics (§7.1.4) and `E-TARGET-RACE`** |
| `src/fs/journal.ts` | Revised | F1 | `.harness/journal.json` **(version 2: `preExisting`, `preHash`, `preMode`, `backup`)** plus the `.harness/journal.d/` backup sidecar; write/read/remove; `E-JOURNAL-PRESENT` detection. C-13 |
| `src/fs/base-store.ts` | New | F1 | `.harness/base/` read/write (LF), `.harness/.gitattributes` emission, `E-BASE-CORRUPT` / `E-BASE-MISSING` |
| `src/fs/lock.ts` | Revised | F1 | Advisory `.harness/lock` carrying `{pid, host, startedAt, cli}`; exclusive-create acquire; the stale-lock rule of §7.6 |
| `src/fs/walk.ts` | **New** | F1 | The one bounded, non-symlink-following directory walk. Depth and entry caps, skip list, `E-TRAVERSAL-LIMIT`. Used by both the `contentRoot` recursion and the `untracked` project scan. C-17 |
| `src/apply/plan.ts` | Revised | F1 | `ApplyInputs` → `ApplyPlan`. Pure: reads, renders, validates, **builds `SecurityDisclosure`**, writes **nothing** |
| `src/apply/execute.ts` | Revised | F1→F2 | **consent gate** → lock → journal → files → base → manifest → journal removal. The only writer. **Re-confines and re-`lstat`s immediately before each write (C-14)** |
| `src/apply/rollback.ts` | Revised | F1→F2 | The four-case rule of §7.5: delete only what this apply created, restore only what it overwrote, and only where the on-disk bytes are still exactly what it wrote |
| `src/validate/validate-pack.ts` | Revised | F1 | The ordered check runner of US-16 → `PackReport`, **with the §7 security checks joining the run at the positions given in §7.7** |
| `src/validate/combinations.ts` | New | F1 | Per-parameter-combination render; the 32 cap; `parameterVaryingFiles` |
| `src/validate/link-integrity.ts` | New | F1 | `W-LINK-DANGLING` over rendered output (US-16) |
| `packs/`, `shared/` | New | F5 | Pack content. F1 ships no pack; `harness validate --all` is what binds them |

Two files are deliberately absent. There is no `src/cli/commands/init.ts`
— `init` is F2's CLI surface over `plan.ts` + `execute.ts`. There is no
`apply.json` (Q-24): one `pack.json`.

A third is deliberately absent and worth naming, because its absence is
the hook decision made structural: **there is no `src/render/hooks.ts`
and no `hooks` mapping mode.** A pack has no route by which to register
an agent hook, and the absence is enforced by `destination-policy.ts`
rather than merely unimplemented — see §7.2.5.

### Public interface contract

The shapes F2, F3, F4 and the test writer compile against. No downstream
feature may widen or narrow these without a superseding ADR. Types marked
`// SEC` were added or changed by the security remediation pass and are
load-bearing for §7 — narrowing one silently removes a control.

```ts
// ── path confinement ────────────────────────────────────────────────────
// SEC (C-14). A nominal brand. The ONLY way to obtain an AppliedPath is
// confinePath(); no cast, no assertion, no `as AppliedPath` anywhere in
// the tree outside src/security/confine.ts. Every write-side API takes
// AppliedPath, never string, so "we forgot to validate this one" is a
// compile error rather than a CVE.
declare const AppliedPathBrand: unique symbol;
export type AppliedPath = string & {
  readonly [AppliedPathBrand]: 'AppliedPath';
};

export interface ConfineContext {
  /** realpath() of the project root, resolved ONCE per run. */
  resolvedRoot: string;
  /** realpath() of the directory the CLI itself is installed in. */
  cliInstallDir: string;
  /** 'declared'  — grammar + denylist only, no filesystem (validate time)
   *  'resolved'  — grammar + denylist + ancestor lstat + descendant proof */
  stage: 'declared' | 'resolved';
}

/** Grammar (§7.1.1) → reserved-destination denylist (§7.1.2) →
 *  resolution confinement (§7.1.3). The single gate. */
export function confinePath(
  declaredTo: string, ctx: ConfineContext,
): { path: AppliedPath; diagnostics: readonly Diagnostic[] } | null;

/** The NFC + case-folded key two applied paths collide on (§7.1.1). */
export function collisionKey(p: AppliedPath): string;

/** Re-run immediately before each write (C-14). Returns the open file
 *  descriptor of an exclusively-created temp file, or a diagnostic. */
export function confineAtWrite(
  p: AppliedPath, ctx: ConfineContext,
): Promise<{ fd: number } | { diagnostic: Diagnostic }>;

// ── diagnostics ─────────────────────────────────────────────────────────
export type Severity = 'error' | 'warning';
export type DiagnosticCode = `E-${string}` | `W-${string}`;
export type ExitCode = 0 | 1 | 2 | 3;

export interface Diagnostic {
  code: DiagnosticCode;
  severity: Severity;
  message: string;                 // rendered from the catalogue
  path?: string;                   // POSIX, pack- or project-relative
  line?: number;                   // 1-based
  data?: Record<string, string | number | readonly string[]>;
}
export function exitCodeFor(ds: readonly Diagnostic[]): ExitCode;

// ── pack.json ───────────────────────────────────────────────────────────
export type AnatomyPartId =
  | 'process' | 'roles' | 'documentTemplates' | 'conventions' | 'coordination'
  | 'behaviouralGuidelines' | 'folderScaffolding' | 'skillsAndAutomations'
  | 'autonomyContract';

export type AnatomyStatus = 'present' | 'provisional' | 'absent';
export type AnatomySource =
  | { paths: string[] }                       // globs under contentRoot
  | { ref: `shared:${string}` }
  | { declaredBy: 'mappings' };               // folderScaffolding only

export type AnatomyDecl =
  | (AnatomySource & { status?: 'present';     note?: string })
  | (AnatomySource & { status:  'provisional'; note: string })
  | { status: 'absent'; reason: string };

export type FileMode = 'managed' | 'regions' | 'once' | 'merge-json';

// SEC (C-1). The ownable roots for a SENSITIVE destination. Keyed on the
// destination, never on the pack, so adding a pack still requires no core
// change (S5). Any dotted path whose first segment is not in this union —
// and, for a security-relevant root, any path that is not one of its
// declared leaves — is E-OWNEDKEY-FORBIDDEN at validate time.
export type ClaudeSettingsOwnableRoot =
  | 'permissions.allow' | 'permissions.deny' | 'permissions.ask'  // security-relevant
  | `env.${string}`                                               // security-relevant
  | 'model' | 'outputStyle';                                      // ordinary

/** The runtime table `destination-policy.ts` exports and enforces. The
 *  static type below can only carry the closed case; the denylisted
 *  cases (`package.json` → scripts/bin/*Dependencies) and the
 *  "any dotted path" case are enforced at validate time, not by the
 *  type. `OwnedKey` is deliberately NOT narrowed to
 *  ClaudeSettingsOwnableRoot: a mapping's legal key set depends on its
 *  destination, which a mapping's own type cannot see. */
export interface DestinationPolicy {
  /** Applied paths this row governs, matched exactly. */
  destinations: readonly string[];
  /** null ⇒ any dotted path is ownable. */
  ownable: readonly string[] | null;
  /** Dotted-path prefixes that are never ownable at this destination. */
  forbidden: readonly string[];
  /** Ownable roots whose values must be disclosed and consented to. */
  securityRelevant: readonly string[];
  /** Modes permitted on this destination; [] ⇒ merge-json only. */
  allowedModes: readonly FileMode[];
}
export function policyFor(dest: AppliedPath): DestinationPolicy;

/** SEC (C-1). Branded exactly as AppliedPath is, and for the same
 *  reason: a dotted path becomes an OwnedKey only by passing
 *  checkOwnedKey() against the policy for its DESTINATION, so
 *  `merge-json.ts` cannot be handed a key nobody validated. Widening
 *  this to `string` re-opens S-1. */
declare const OwnedKeyBrand: unique symbol;
export type OwnedKey = string & { readonly [OwnedKeyBrand]: 'OwnedKey' };

export function checkOwnedKey(
  dotted: string, dest: AppliedPath, packSourceJson: unknown,
): { key: OwnedKey; securityRelevant: boolean } | { diagnostic: Diagnostic };

export interface Mapping {
  from: string;                      // relative to contentRoot (or component root if `shared`)
  to: string;                        // relative to project root; §7.1.1 grammar
  shared?: string;                   // resolve `from` against this component
  mode?: FileMode;                   // default 'managed'
  regions?: string[];                // required for mode 'regions', ordered
  /** SEC (C-1). Required for mode 'merge-json'. `Mapping` is the
   *  *validated* shape; the raw parse yields string[], and schema.ts
   *  promotes each entry via checkOwnedKey() against policyFor(to) or
   *  fails with E-OWNEDKEY-FORBIDDEN. Nothing downstream sees an
   *  unvalidated key. */
  ownedKeys?: OwnedKey[];
  stripTemplateSuffix?: boolean;     // default false
  executable?: boolean;              // default false → 0644, true → 0755;
                                     // permitted only under an executableRoots
                                     // prefix, never under .claude/ .git/
                                     // .hg/ .svn/ .harness/                    // SEC
  when?: Record<string, string>;     // single-equality guard on recorded answers
}

export interface RewriteRule { in: string[]; find: string; replace: string }
export interface RegionContribution { file: string; region: string; content: string }

export interface ParameterDecl {
  id: string;                        // ^[a-zA-Z][a-zA-Z0-9]{0,31}$
  prompt: string;
  type: 'string' | 'enum' | 'boolean';
  values?: string[];                 // required when type === 'enum'
  default?: string | boolean;
  required?: boolean;                // default false
  flag?: string;                     // kebab-case CLI alias, e.g. 'calibration'
  /** SEC (C-7). REQUIRED when type === 'string'. An anchored regex source
   *  (must begin ^ and end $), ≤ 200 chars, no backreference, no
   *  lookaround. Recommended conservative default, which the author must
   *  write out rather than inherit silently:
   *    "^[\\p{L}\\p{N} ._-]{1,64}$"   with the u flag.
   *  Absent → E-PARAM-NO-PATTERN; uncompilable or unanchored →
   *  E-PARAM-PATTERN-INVALID. Meaningless (and forbidden) on 'enum'
   *  and 'boolean', whose value set is already closed. */
  pattern?: string;
  /** SEC (C-7). Applies to type 'string'. Default 256. Hard ceiling 4096.
   *  Checked BEFORE `pattern` is run, so pattern evaluation is bounded. */
  maxLength?: number;
  /** SEC (C-15). Explicit acknowledgement that a parameter whose id or
   *  prompt trips the credential heuristic is not in fact a credential.
   *  Without it, E-PARAM-SECRET-SUSPECTED, exit 2, at validate time. */
  notASecret?: boolean;
}

export interface ScaffoldDecl {
  id: string; description: string;
  mappings: Mapping[];
  parameters?: ParameterDecl[];
  rewrites?: RewriteRule[];
  contributes?: RegionContribution[];
}

export interface SharedRef {
  ref: string; version: string; integrity: `sha256-${string}`;
  remap?: Record<string, string>;    // component-relative `from` → applied `to`
}

export interface PackJson {
  formatVersion: number; name: string; version: string; title: string;
  minCliVersion: string; contentRoot: string;
  anatomy: Record<AnatomyPartId, AnatomyDecl>;
  mappings: Mapping[];
  parameters?: ParameterDecl[];
  shared?: SharedRef[];
  rewrites?: RewriteRule[];
  scaffolds?: ScaffoldDecl[];
  /** SEC (C-12). Applied-path prefixes, each ending '/', inside which a
   *  mapping may set executable: true. Absent or empty means the pack
   *  ships no executable file, which is the common case and the default.
   *  Each root is subject to the same §7.1 grammar and denylist as a
   *  mapping `to`; a root under .claude/ .git/ .hg/ .svn/ .harness/ is
   *  E-EXEC-DEST-FORBIDDEN at validate time. */
  executableRoots?: string[];
  provenance?: { source?: string; commit?: string; notes?: string };
}

export interface ComponentJson {
  name: string; version: string; contentRoot: string;
  mappings: Mapping[];               // the component's own destination map (Q-27)
}

// ── region grammar ──────────────────────────────────────────────────────
export type RegionDirectiveKind =
  | 'source-only' | 'applied-only' | 'region' | 'if' | 'end';

export interface RegionDirective {
  kind: RegionDirectiveKind;
  line: number;                      // 1-based
  wrapper: 'md' | 'hash' | 'slash';  // <!-- … -->  |  # …  |  // …
  id?: string;                       // kind 'region'
  param?: string; value?: string;    // kind 'if'
  raw: string;
}

export interface RegionNode {
  kind: Exclude<RegionDirectiveKind, 'end'>;
  open: RegionDirective; close: RegionDirective;
  bodyStart: number; bodyEnd: number;   // 1-based, exclusive of markers
  children: RegionNode[];
}
export interface RegionParseResult {
  nodes: RegionNode[]; diagnostics: Diagnostic[];
}
export function parseRegions(text: string, path: string): RegionParseResult;

// ── hashing ─────────────────────────────────────────────────────────────
export function normalizeText(bytes: Buffer): string;   // BOM strip + CRLF/CR → LF, nothing else
export function hashText(text: string): string;         // 64 lowercase hex
export function hashBytes(bytes: Buffer): string;
export function treeDigest(
  entries: ReadonlyArray<{ path: string; sha256: string }>,
): `sha256-${string}`;                                   // path-prefixed, \n-joined, byte-ascending

// ── security disclosure & consent ───────────────────────────────────────
// SEC (C-2, C-12). Computed by the PURE planner, so `pack info`,
// `validate --json` and `init`'s pre-write summary all render the SAME
// structure — the same trick that keeps the anatomy report from forking.
export interface SettingsGrant {
  file: AppliedPath;          // e.g. '.claude/settings.json'
  key: string;                // e.g. 'permissions.allow'
  securityRelevant: boolean;
  action: 'add' | 'set';
  /** ONE value, verbatim, exactly the bytes that will be written.
   *  Never summarised, never truncated, never counted. */
  value: string;
}
export interface SecurityDisclosure {
  settings: readonly SettingsGrant[];
  executables: ReadonlyArray<{ path: AppliedPath; source: string }>;
  /** Files landing under .claude/hooks/ — shipped, 0644, and registered
   *  by nothing at v1.0 (§7.2.5). Disclosed so the reader is not misled
   *  into thinking they run. */
  inertHookScripts: readonly AppliedPath[];
  /** true iff any `settings` entry is securityRelevant. */
  requiresConsent: boolean;
}
export function renderDisclosure(d: SecurityDisclosure): string;

export interface ConsentInputs {
  /** --accept-permissions. Blanket accept; the disclosure is still
   *  printed, to stdout, so it lands in a CI log. */
  acceptPermissions?: boolean;
  /** --accept-hooks. Parsed and ALWAYS refused at v1.0 with
   *  E-HOOKS-NOT-SUPPORTED, so a script written against a future
   *  version fails loudly instead of silently doing nothing. */
  acceptHooks?: boolean;
  /** Present only when a TTY is attached. Absent ⇒ non-interactive, and
   *  requiresConsent without acceptPermissions is
   *  E-SETTINGS-CONSENT-REQUIRED, exit 1, zero bytes. */
  prompt?: (d: SecurityDisclosure) => Promise<boolean>;
}

// ── contribute-side policy (C-18) ───────────────────────────────────────
export interface ContentPolicyInput {
  packDir: string;
  /** The pack.json the patch would produce, if it touches it. */
  packJsonAfter?: unknown;
  files: ReadonlyArray<{
    path: string;                 // pack-relative source path
    text: string | null;          // null ⇒ binary
    executable: boolean;
  }>;
}
/** The identical validation set content moving OUT is subject to.
 *  F4 may not hold a second copy of any of these checks. */
export function checkContentPolicy(
  i: ContentPolicyInput,
): readonly Diagnostic[];

// ── validator result ────────────────────────────────────────────────────
export interface AnatomyRow {
  part: AnatomyPartId;
  status: AnatomyStatus | 'missing';   // 'missing' only for an invalid pack
  note?: string; reason?: string; matched: number;
}
export interface PackReport {
  pack: { name: string; version: string; title: string;
          formatVersion: number; minCliVersion: string;
          integrity: `sha256-${string}` };
  anatomy: AnatomyRow[];               // exactly 9, in AnatomyPartId order
  scaffolds: ReadonlyArray<{ id: string; description: string; files: number }>;
  parameters: readonly ParameterDecl[];
  shared: ReadonlyArray<{ ref: string; version: string;
                          integrity: string; ok: boolean }>;
  parameterVaryingFiles: readonly string[];   // applied paths whose bytes depend on an answer
  /** SEC/§7.8.4. The region-granular form of the line above: a region
   *  whose body differs across parameter combinations. F5's US-19 NFR
   *  ("these things vary, those things are byte-identical") is asserted
   *  at region granularity, and file granularity cannot express it when
   *  one file legitimately carries both. */
  parameterVaryingRegions: ReadonlyArray<{ path: string; region: string }>;
  combinations: number;
  /** SEC (C-2, C-12). Every value the pack would write under a
   *  security-relevant owned key, and every 0755 path, in any parameter
   *  combination. `harness pack info` renders this before a user has
   *  answered anything, which is the point: you see what a pack will
   *  take before you decide to apply it. */
  disclosure: SecurityDisclosure;
  diagnostics: readonly Diagnostic[];
  ok: boolean;
}
export function validatePack(
  packDir: string,
  opts?: { allowStaleShared?: boolean; strict?: boolean },
): Promise<PackReport>;
export function renderPackInfo(report: PackReport): string;   // `harness pack info`

// ── manifest ────────────────────────────────────────────────────────────
export type TransformName =
  | 'regions' | 'substitute' | 'rewrite' | 'contribute' | 'merge-json';
export type FileOrigin = 'pack' | `shared:${string}` | `scaffold:${string}`;

export interface RegionEntry   { id: string; sha256: string; orphaned?: boolean }

export interface OwnedKeyEntry {
  path: string; sha256: string;
  /** SEC. True when this key is security-relevant at its destination
   *  under §7.2.1. Recorded rather than re-derived, so a later CLI whose
   *  allowlist has moved still knows what THIS apply treated as sensitive. */
  security?: boolean;
  /** SEC (C-3). Array-valued security-relevant keys only: the exact
   *  entries this apply wrote, in written order. */
  entries?: readonly string[];
  /** SEC (C-3). Entries previously written (or previously recorded here)
   *  that the user has since deleted. `update` must NOT re-add these.
   *  Monotonic: an entry enters this set when it disappears from disk and
   *  leaves it only when the user puts it back by hand. */
  removed?: readonly string[];
}

export interface FileEntry {
  path: string;                      // POSIX, NFC-normalized, project-relative, manifest key
  source: string;                    // pack- or component-relative source path
  origin: FileOrigin;
  mode: FileMode;
  sha256: string;
  eol: 'lf' | 'crlf';
  binary: boolean;
  executable: boolean;
  transforms: TransformName[];       // ordered, as applied
  regions?: RegionEntry[];           // mode 'regions'
  ownedKeys?: OwnedKeyEntry[];       // mode 'merge-json'
}

export interface PackManifest {
  manifestVersion: number;
  generatedBy: { cli: string };
  pack: { name: string; version: string; formatVersion: number;
          integrity: `sha256-${string}` };
  appliedAt: string;                 // RFC 3339 UTC — one of the only two timestamps
  lastUpdatedAt: string;
  parameters: Record<string, string | boolean>;   // every declared parameter, defaults included
  scaffolds: string[];               // selected ids, pack-declared order
  shared: Array<{ ref: string; version: string; integrity: string }>;
  files: FileEntry[];                // sorted byte-ascending by path
  integrity: `sha256-${string}`;     // over canonical form with `integrity` removed
  /** Unknown keys read from a newer CLI's manifest, re-inlined verbatim on write. */
  unknownKeys?: Record<string, unknown>;
}

export function readManifest(projectRoot: string):
  Promise<{ manifest: PackManifest | null; diagnostics: Diagnostic[] }>;
export function writeManifest(projectRoot: string, m: PackManifest): Promise<void>;
export function canonicalJson(value: unknown): string;

// ── drift ───────────────────────────────────────────────────────────────
export type DriftState = 'clean' | 'modified' | 'missing' | 'untracked';
export interface FileDrift {
  path: string; state: DriftState;
  /** SEC (C-12). The on-disk executable bit differs from FileEntry.
   *  Sets `state` to 'modified' even when the content hash still matches
   *  — an on-disk chmod is a change and drift must not be blind to it.
   *  Always false on Windows, where the bit is not represented; §7.4
   *  records that as the one place G-F1-7 genuinely differs by platform. */
  modeChanged?: boolean;
  regions?: ReadonlyArray<{ id: string; state: DriftState }>;
  ownedKeys?: ReadonlyArray<{
    path: string; state: DriftState;
    /** SEC (C-3). Entries of a security-relevant array the user deleted. */
    removedByUser?: readonly string[];
  }>;
}
export interface DriftReport {
  files: FileDrift[]; manifestEdited: boolean; diagnostics: Diagnostic[];
}
export function scanDrift(
  projectRoot: string, manifest: PackManifest,
): Promise<DriftReport>;

// ── apply ───────────────────────────────────────────────────────────────
export interface ApplyInputs {
  packDir: string;
  projectRoot: string;
  answers: Readonly<Record<string, string | boolean>>;
  scaffolds: readonly string[];
  cliVersion: string;
  force?: boolean;                   // byte-identical collisions only
  /** SEC (C-2). Absent is equivalent to `{}`: non-interactive, no
   *  blanket accept. A plan whose disclosure requiresConsent then fails
   *  the gate, and executeApply refuses. Defaulting to "consent granted"
   *  is not available anywhere in the API. */
  consent?: ConsentInputs;
}
export interface PlannedFile {
  path: AppliedPath;                 // SEC (C-14) — never a bare string
  bytes: Buffer;
  baseBytes: Buffer | null;          // null for binary; LF-normalized otherwise
  entry: FileEntry;
  /** SEC (C-13). What planApply observed on disk, carried into the
   *  journal so rollback can tell "we created this" from "we overwrote
   *  something that was already here". */
  preExisting: boolean;
  preHash: string | null;            // null iff !preExisting
  preMode: number | null;            // null iff !preExisting
}
export interface ApplyPlan {
  files: PlannedFile[];
  manifest: PackManifest;
  report: PackReport;
  /** SEC (C-2, C-12). The exact grants and 0755 paths THIS plan would
   *  write, given THESE answers and scaffolds — narrower than the
   *  report's all-combinations disclosure. This is what init prints. */
  disclosure: SecurityDisclosure;
  diagnostics: Diagnostic[];
  ok: boolean;
}
/** Pure: reads the pack and inspects the project; writes nothing, ever. */
export function planApply(inputs: ApplyInputs): Promise<ApplyPlan>;

// SEC (C-13). Version 2. Version 1 never shipped; a journal declaring
// any other version is E-JOURNAL-UNREADABLE and is never guessed at.
export interface JournalEntry {
  path: AppliedPath;
  sha256: string;                    // the hash this apply intended to write
  preExisting: boolean;
  preHash: string | null;            // pre-apply normalized hash
  preMode: number | null;
  /** Path under .harness/journal.d/ holding the pre-apply bytes. Written
   *  BEFORE the overwrite, present iff preExisting && preHash !== sha256. */
  backup: string | null;
}
export interface Journal {
  version: 2; cli: string; startedAt: string;
  entries: JournalEntry[];
  createdDirs: string[];             // creation order; removed in reverse
}
export function executeApply(plan: ApplyPlan, projectRoot: string):
  Promise<{ written: number; diagnostics: Diagnostic[] }>;
export interface RollbackResult {
  deleted: string[];                 // created by this apply, still ours
  restored: string[];                // SEC (C-13) — overwritten, put back
  kept: string[];                    // changed since the crash; left alone
  diagnostics: Diagnostic[];
}
export function rollback(projectRoot: string): Promise<RollbackResult>;
```

---

## 2. Context

**Prior decisions and constraints:**

- **Managed apply (brief §7, RESOLVED).** Real files plus a manifest of
  pack, version and per-file hash. The manifest is load-bearing; this ADR
  may not weaken what it carries.
- **CLI owns determinism, the skill owns judgment (Q-1).** Every mechanism
  chosen here must be computable. Nothing in the pipeline may depend on
  agent judgment, or S3/S4 vary run to run.
- **Packs are bundled, one per project, shared by explicit reference
  (Q-2, Q-12, Q-4).** No registry, no composition arbitration, no implicit
  inheritance — and the Q-4 bump rule must be *enforceable*, not advisory.
- **Marked regions everywhere (Q-7, Q-10).** Forced by the two stale
  READMEs in `CLAUDE.md` §Dogfooding: one source file must render two ways.
  A whole-file mode cannot express it and parallel files re-drift.
- **The manual-apply log is the requirement list (CLAUDE.md §Dogfooding).**
  Nine rows: directory map, map-with-rename, filename transform, map into
  `.claude/`, three in-content path rewrites, two self-describing READMEs.
  A format that cannot express all of them has failed on the only evidence
  that exists.
- **S5 — adding a pack requires no core change.** `planning` is authored
  against an already-frozen F1. Any mechanism that needs pack-specific code
  in the CLI falsifies S5 before it is tested. This is the single strongest
  constraint on the calibration decision.
- **F5 is the crux.** F5 asserts calibration is the planning pack's central
  property and instructs that *if the format cannot express it, change the
  format rather than flatten the pack* (Q-13). F1 must therefore answer
  Q-13 with a mechanism, not a deferral.
- **Eight F1↔F5 contradictions** were found by the 2026-08-30 consistency
  pass. Six are contract-level and are settled below; two are product
  scope and are escalated in §6.

---

## 3. Options considered

### 3.1 Error model (conflict 4)

- **A — F1's coded taxonomy, F1's exit classes, F1's catalogue (chosen).**
  Every diagnostic has a stable `E-`/`W-` code; exit classes are
  `0` success, `1` user-correctable, `2` pack/manifest integrity,
  `3` internal. Message text lives in one catalogue module.
  *Advantages:* F6 and CI branch on a code, never on prose; one place to
  change wording. *Disadvantages:* F5's twelve verbatim strings must be
  struck and re-pointed at codes.
- **B — F5's uncoded prose, exit codes 0–4.** *Advantages:* the strings
  read better as written. *Disadvantages:* the two documents disagree on
  the exit code for the same scenario (unknown scaffold 1 vs 2; already
  applied 1 vs 4); a scenario with no code cannot be asserted in a test
  without string matching; and `1 = user error` collapses into
  `1 = anatomy error`, which is an author error.
- **C — codes plus a per-scenario exit code.** Rejected: an exit code per
  scenario is a number nobody can remember and a contract nobody can keep
  stable across releases.

### 3.2 Calibration surface (conflicts 5, Q-13)

- **A — one parameter mechanism, with a pack-declared flag alias
  (chosen).** `parameters[].flag: "calibration"` makes
  `--calibration helio` an alias for `--set constraintFloor=helio`,
  registered from `pack.json` data. Content varies by `when` mappings and
  `if` regions, exactly as F1 §US-8 already specifies.
  *Advantages:* F5 gets its literal CLI surface; the CLI contains zero
  knowledge of `planning`, so S5 survives; the calibration record file is
  a normal file holding `{{harness:param.constraintFloor}}`.
  *Disadvantages:* one more optional key, and one more validation (alias
  collision with a global flag).
- **B — a dedicated `--calibration` flag in the CLI.** *Advantages:*
  nothing to declare. *Disadvantages:* hard-codes one pack's vocabulary
  into the core and falsifies S5 in the one release that is supposed to
  test it; a fourth pack with a different axis needs another flag.
- **C — `--set` only.** *Advantages:* smallest surface.
  *Disadvantages:* F5's US-19 acceptance criteria are written against
  `--calibration`, and the most important init answer in the product would
  be the least discoverable.

### 3.3 Anatomy states (conflict 3)

- **A — a `status` enum `present | provisional | absent` (chosen).**
  Retires `declaredAbsent`. `provisional` requires a non-empty `note` and
  a content source; `absent` requires a `reason` and forbids one.
  *Advantages:* one axis, three values, one report; F5's NFR ("exactly two
  absent, exactly one provisional") becomes mechanically checkable.
  *Disadvantages:* F1 §US-2 and its error rows change.
- **B — keep two states, express provisional as free text.** *Advantages:*
  no schema change. *Disadvantages:* F5 asserts the provisional count as
  an NFR; free text cannot be counted, so the NFR would be unverifiable.
- **C — a per-part quality grade (strong/adequate/weak/absent).** Rejected:
  F5's table already grades in prose; a grade is editorial judgment and
  does not belong in a machine-validated schema.

### 3.4 Merge base (validation of F1's `.harness/base/`)

- **A — cache the exact applied bytes locally, committed (chosen, Q-18).**
  *Advantages:* a hash cannot be a merge base — a 3-way merge needs base
  *content*; local bytes make F3/F4 offline, exact, and independent of
  which pack version is installed; a teammate who clones can merge.
  *Disadvantages:* doubles the pack's footprint in the repo and adds diff
  noise, mitigated by a generated `.harness/.gitattributes`.
- **B — re-render the old pack version on demand.** *Advantages:* no
  stored bytes. *Disadvantages:* requires the old pack to still be
  installed, which Q-2's single-bundled-version model guarantees it is
  not — the base would silently become "the current pack", which is a
  merge that lies.
- **C — use git history as the base.** Rejected: assumes the project is a
  git repo and that the apply commit is identifiable; false for a
  non-git project and unreliable after a squash.

### 3.5 `harness pack info` ownership (conflict 6)

- **A — F1 owns it as a rendering of `PackReport` (chosen).** *Advantages:*
  every field it prints is F1 schema and the validator already computes
  them; one anatomy-report code path. *Disadvantages:* F1 grows a second
  user-facing command.
- **B — F2 owns it.** *Advantages:* sits beside `init`, which is where a
  user browsing packs would look. *Disadvantages:* forks the anatomy
  report between two features, which is exactly how the two documents
  disagreed in the first place.
- **C — reject it; `harness validate --json` serves.** Rejected: F5's
  US-20/21/22 have acceptance criteria on it, and an author-facing
  validator is the wrong thing to point a chooser at.

### 3.6 Shared multi-destination mapping (Q-27)

- **A — the component declares its own `mappings`; a pack referencing it
  inherits them, with optional `remap` (chosen).** *Advantages:*
  `shared/targets` reaching `targets/`, `.claude/agents/` and
  `.claude/commands/` is one declaration per pack, and the destination map
  itself stops being a duplicate — which is the whole point of Q-4.
  *Disadvantages:* mapping resolution now has two sources; collisions are
  caught by the existing `E-MAP-COLLISION` check.
- **B — every referencing pack repeats five mapping lines.** Rejected: the
  duplication Q-4 exists to remove would reappear in the mechanism Q-4
  chose to remove it, and `coding` and `planning` could drift apart on
  where a shared file lands.

---

## 4. Rationale

The chosen options all fall out of one constraint: **F1 is frozen before
the pack that stresses it is authored**, so anything pack-specific in the
core is a defect that S5 is designed to expose. That decides the
calibration surface (data in `pack.json`, not a flag in the CLI), it
decides who owns `pack info` (whoever owns the schema it prints), and it
decides the shared destination map (declared once, by the thing being
shared). The error model follows from the other half of Q-1: the CLI's job
is to produce *computed facts* for F6 and CI to branch on, and a fact you
have to regex out of prose is not one — so codes are the contract and text
is a rendering, with the two documents' overlapping strings resolved in
favour of the document that has codes. The merge base survives scrutiny
for a blunt reason: Q-2 bundles exactly one pack version with the CLI, so
the "old version" a 3-way merge needs has no other place to live; caching
the applied bytes is not an optimisation, it is the only way `update`
can be correct offline. And the three-value anatomy status is simply what
F5 already asserts as a countable NFR — a spec that promises "exactly one
provisional part" needs a field to count.

---

## 5. Consequences

- **Unblocks F2 immediately.** `planApply` / `executeApply` / `rollback`
  and the diagnostic taxonomy are the whole of F2's substrate; F2 adds an
  argv surface and interactive prompting and nothing else.
- **Unblocks the test writer now.** The interface contract above is
  complete enough to write acceptance tests against before any
  implementation exists — which is the point of locking it here.
- **Unblocks F5's authoring.** Calibration is expressible today:
  `packs/planning/calibrations/<name>/` selected by `when` mappings, with
  `harness validate --json` emitting `parameterVaryingFiles` so F5's
  "calibration isolation" NFR and its "declared calibration-varying file
  list" are one mechanically-checked artifact rather than two hand-kept
  lists.
- **Constrains F3.** `update` may only read state through `PackManifest`,
  `DriftReport` and `.harness/base/`. It may not re-derive an applied file
  set from the tree, and it must re-evaluate `when`/`if` against the
  *recorded* answers.
- **Costs F5 a rewrite of its Error States table.** Twelve rows are
  re-pointed at F1 codes; three rows (kill-criteria hook, absorption-gate
  ABORT, `copywriter` halt) stay verbatim in F5 because they are text a
  *pack ships*, not CLI diagnostics.
- **Costs F5 its date field.** No generated file carries a timestamp, so
  `CLAUDE.md`'s header date ships as the literal `{{YYYY-MM-DD}}`
  placeholder the coding pack's own header convention already uses, filled
  by the human or by F6. A generated date would make two applies of the
  same pack produce different hashes and break G-F1-6 (zero-byte re-init),
  G-F1-7 (identical hashes across platforms) and F5's own G5.3 faithfulness
  check simultaneously.
- **Makes recalibration cheap later at no cost now.** Q-21 stays **No** for
  v1.0, but because the renderer is parameterized by an `ApplyInputs` value
  object rather than reading answers back out of the manifest, a v1.1
  `recalibrate` is "render with new answers, 3-way merge against
  `.harness/base/`" — F3's engine with a different input, no format change.
  The same holds for Q-22 (scaffold set is a field of `ApplyInputs`).
- **Adds a small generated file.** `harness init` writes
  `.harness/.gitattributes` (`base/** -text -diff`, `manifest.json text
  eol=lf`). Without it a Windows clone with `core.autocrlf=true` rewrites
  the base copies and every base read fails `E-BASE-CORRUPT` — the merge
  base would be broken by the version-control system it was committed to
  survive.
- **What gets harder.** Every diagnostic must be registered in one
  catalogue before it can be thrown, so adding an error is a two-file
  change. `merge-json` needs an order-preserving JSON serializer, which is
  more work than `JSON.stringify` and is the one place F1 can plausibly
  overrun (Q-23's fallback, if it does: write-if-absent, and record the
  shortfall against R5).

*Added by the security remediation pass:*

- **The security model is dormant at v1.0, and that is correct.** After
  §7.2.5 and the F1.2 correction of §8.3, **no v1.0 pack registers a
  hook, and no v1.0 pack owns a security-relevant settings key** — so
  the consent gate never fires for `coding`, `writing` or `planning`, and
  `harness init` stays non-interactive-clean. The apparatus is not a
  feature; it is a **format constraint**, and its value is that
  `harness validate` refuses a pack that would grant itself permissions
  before that pack can exist. One allowlist table and one disclosure
  renderer is the cheapest honest answer to S-1, and "dormant but
  enforced" is the state we want.
- **Costs F5 its enforcement hook.** `planning`'s kill-criteria guard is
  no longer enforced at v1.0 (§7.2.5). Part 8 becomes three slash
  commands plus one inert, documented script, joining the two shortfalls
  F5 already records for `coding` and `writing` — which makes "no pack
  ships an enforcing hook at v1.0" a **product finding recorded against
  R5**, and a sharper one than either row F5 has today.
- **Costs F1 a bounded walk and a branded string.** Every directory
  traversal goes through `fs/walk.ts` and every write-side path is
  `AppliedPath`. The second is the load-bearing one: it converts "someone
  forgot to validate this path" from a security defect discoverable only
  by review into a **compile error**. It costs one `unique symbol` and a
  discipline that no file outside `security/confine.ts` may cast to it.
- **Constrains F4 harder than F3.** `contribute` is the reverse trust
  boundary, and F1 now exports `checkContentPolicy()` as the single gate
  it must route through (C-18). F4 may not hold a second copy of the path
  grammar, the executable rules, the region grammar or the owned-key
  allowlist. A patch that would introduce any of them is refused.
- **Two conditions were amended rather than adopted.** C-11 as written
  would have made every legitimate `update` fail, and C-4 as written
  would have refused to run in `/tmp` on macOS. Both are argued in §8.2.
  Adopting a security condition that does not survive contact with the
  product is not rigour; it is a defect with a citation.

---

## 6. Conflicts flagged

| # | Conflict | Disposition | Decision, and what must change |
|---|---|---|---|
| 1 | **Q-14 — `init --adopt`.** Master spec says adopt; F1 says not built. Blocks S7 and F2 acceptance | **ESCALATED-TO-THOMAS** | Architectural consequence of each branch is in §6.1. F1's format is implementable either way; the branch changes one manifest field and one warning. **F1 needs no change to start.** |
| 2 | **Q-17 — writing-workstream scaffold in v1.0?** Master defers it; F5 keeps it | **ESCALATED-TO-THOMAS** | Format-neutral: a scaffold is `pack.json` data either way, and `writing` gaining a `scaffolds` array needs no format change. Only F5's size moves. |
| 3 | **A third anatomy state.** F1: `present`/`declaredAbsent`. F5: needs `provisional` | **SETTLED-HERE** | `status: 'present' \| 'provisional' \| 'absent'`, default `present`; `declaredAbsent` is retired. `validate --json` and `pack info` report those three plus `missing` (invalid packs only). **F1 §US-2, §Error States and §F1.2 change; F5 §US-20 is already conformant.** New codes `E-ANATOMY-NO-REASON`, `E-ANATOMY-NO-NOTE`, warning `W-ANATOMY-PROVISIONAL`. |
| 4 | **Two error vocabularies, conflicting exit codes** | **SETTLED-HERE** | F1's codes and its `0/1/2/3` classes are the only CLI model; F1 §Error States is the only catalogue. Codes are the stable contract (F6/CI branch on them); message text is verbatim within a minor version. Remapping: unknown scaffold → `E-SCAFFOLD-UNKNOWN` exit **1**; already applied → `E-ALREADY-APPLIED` exit **1**; anatomy undeclared → `E-ANATOMY-MISSING` exit **2**; missing/invalid calibration → `E-PARAM-MISSING`/`E-PARAM-INVALID` exit **1**; min-CLI → `E-PACK-CLI-TOO-OLD` exit **1**; undeclared shared read → new `E-SHARED-UNDECLARED` exit **2**. **F5 §Error States: strike the exit codes and prose for all twelve CLI rows and cite the code; keep the three pack-content rows verbatim.** |
| 5 | **Calibration spelled two ways** | **SETTLED-HERE** | One mechanism: init parameters. `parameters[].flag` declares a CLI alias, so `--calibration <helio\|cadenza>` is `--set constraintFloor=helio` with no pack-specific CLI code. Q-13 closes: the format *can* express content varying by an init answer, via `when` mappings (whole files, which is what F5's `calibrations/<name>/` layout needs), `if` regions (in-file), and `{{harness:param.<id>}}`. **F1 §US-8 gains `flag`; F5 §US-19 keeps its CLI text but cites the parameter mechanism; master spec Q-13 closes on this, not on a new variant-block grammar.** |
| 6 | **`harness pack info` unowned** | **SETTLED-HERE** | Assigned to **F1**, defined as `renderPackInfo(PackReport)` — the same structure `validate --json` emits. **F1 gains a user story for it (next free `US-29`; update `CLAUDE.md`'s counter table). F5's US-20/21/22 acceptance criteria then bind against F1.** |
| 7 | **Determinism vs a generated date** | **SETTLED-HERE** | F1 wins: no timestamp in any generated file; the only two in the product are manifest `appliedAt` and `lastUpdatedAt`. The `CLAUDE.md` header date ships as the literal `{{YYYY-MM-DD}}` placeholder. **F5's NFR "except for a single declared date field" must be struck.** |
| 8 | **Q-15 — where the shared bump rule lives** | **SETTLED-HERE — closed** | F1 owns both the logic (`src/pack/shared.ts`) *and* the surface (`harness validate --all`, an F1 command). F4 gains **nothing** — it is user-facing, and a maintainer subcommand there would split the code. This repo's CI runs `harness validate --all` without `--allow-stale-shared`; a non-zero exit is the enforcement. **The master spec's Q-15 default ("F4 exposes it as a maintainer subcommand") is amended.** |

### 6.1 Escalations — the concrete question for Thomas

| Q | The question he must answer | Architectural consequence of each branch |
|---|---|---|
| **Q-14** | Does v1.0 ship `harness init --adopt`, yes or no? | **No (F1's default):** S7 is satisfied by re-initing this repo — but that is **not free**: `init` refuses a non-empty tree (`E-TARGET-EXISTS`), and `--force` proceeds only for byte-identical files. This repo's `targets/README.md` and `specifications/README.md` were hand-rewritten (Dogfooding rows 7–8), so either `packs/coding` must render them byte-for-byte or those files must be deleted before the re-init. Someone must own that. **Yes:** F1 adds one manifest field (`pack.adopted: true`) and one warning; the real cost is that `.harness/base/` cannot hold the true applied bytes (they are unknown), so the base becomes the freshly rendered pack and every subsequent 3-way merge on a pre-adoption edit silently merges against the wrong base — which needs a `W-BASE-SYNTHETIC` warning and a documented caveat. Decide before F2's spec, not during it. |
| **Q-16** | Package name, binary name, Node floor. | The file plan and the message catalogue assume `@lintel/harness`, binary `harness`, `engines.node >= 20` (the master spec's default). If any changes, only `package.json` and two catalogue strings change. Not blocking. |
| **Q-17** | Do `frontend`, `app` and `writing-workstream` ship at v1.0? | Format-neutral. F5's size only. |
| **Q-28** | What does `shared/presentation` ship? | Blocks F5, not F1 — but note it is referenced by all three packs, so under Q-4 every change to it bumps every pack in the product. If its content is unsettled, consider whether it ships at v1.0 at all. |
| **Q-29** | Does authoring `planning` violate the Q-6 faithful-migration boundary? | Format-neutral. |
| **Q-33** | Which project dogfoods `planning`? | Format-neutral, but it is the only evidence that would test S5 in anger. |

### 6.2 Architecture-level questions closed here

| Q | Closed as |
|---|---|
| **Q-13** | **Yes, the format expresses it** — `when` mappings + `if` regions + `{{harness:param}}`, no new grammar. F5's `calibrations/<name>/` layout is a pack-authoring convention over `when`. `validate --json` emits `parameterVaryingFiles`, which *is* F5's "declared calibration-varying file list". |
| **Q-15** | **Closed** — F1 owns logic and surface; F4 gains nothing; CI enforces. Amends the master spec's default. |
| **Q-18** | **Committed**, plus a generated `.harness/.gitattributes` (`base/** -text -diff`). Without it, git EOL munging corrupts every base copy on a Windows clone. |
| **Q-19** | **Yes** — `pack.integrity` in the manifest, computed by the same `treeDigest` as a shared component. One digest function, three call sites. |
| **Q-20** | **No** — one equality test. Confirmed. |
| **Q-21** | **No in v1.0**, but the renderer takes `ApplyInputs` rather than reading answers from the manifest, so a v1.1 recalibrate is F3's merge with different inputs. Zero cost now. |
| **Q-22** | **No in v1.0**; same provision — the scaffold set is a field of `ApplyInputs`. |
| **Q-23** | **Keep `merge-json`**, tightened: it is the only mode permitted on a JSON target, the region grammar never runs on it (JSON cannot carry comment markers), and the manifest records a **per-owned-key hash** as well as the whole-file hash — the JSON analogue of `regions[].sha256` — so a user's own key edits are not misreported as pack-region drift. An unparseable existing target is `E-MERGE-JSON-INVALID` and nothing is written. Fallback if it overruns in F2: write-if-absent, shortfall recorded against R5. |
| **Q-24** | **One `pack.json`.** Confirmed. |
| **Q-25** | **No deletion** — report as orphaned. Confirmed; `origin` + `source` already carry enough for F3 to change later without a format change. |
| **Q-26** | **BOM and line endings only.** Confirmed — trailing whitespace is real content, and ignoring it would make `contribute` emit patches that do not apply. |
| **Q-27** | **Yes** — a component declares its own `mappings` in `component.json`; a referencing pack inherits them via its `shared` entry and may `remap` an individual destination. One declaration, three destinations. |

### 6.3 Two hardenings, and one limitation to record

- **The `{{harness:` reservation is correct and is the right call** — the
  coding pack is full of `{{Feature name}}` and `{{YYYY-MM-DD}}` that must
  survive apply byte-identical, and a bare `{{…}}` substituter would
  corrupt every document template it ships. The gap is that a pack cannot
  *document* the reserved token. Add one production: `{{harness:lit:X}}`
  renders `{{harness:X}}` verbatim. Substitution stays fence-blind (unlike
  marker scanning), so a pack may still substitute inside a code fence.
- **Fence-awareness is Markdown-only.** In shell, PowerShell, YAML,
  TypeScript and Bicep a comment-only `# harness:end` line is always a
  marker, including inside a heredoc. Documented limitation, not a bug.
- **Base copies exist for text files only.** A binary cannot be 3-way
  merged, so `update` offers replace-or-keep for it and `contribute` skips
  it. This is implied by F1 §US-12 and should be stated outright.

These three are the hardenings the *original* pass found. They are not
the complete set: **§7 is**, and it supersedes any reading of this
subsection as exhaustive.

### 6.4 Documents that must change to match this ADR

| Document | Change |
|---|---|
| `F1-spec-…` §US-2, §Error States | Three-value `status` enum replaces `declaredAbsent`; add `E-ANATOMY-NO-REASON`, `E-ANATOMY-NO-NOTE`, `W-ANATOMY-PROVISIONAL`; report enum becomes `present \| provisional \| absent \| missing` |
| `F1-spec-…` §US-8 | Add optional `parameters[].flag` (kebab-case CLI alias) and `E-PARAM-FLAG-INVALID` |
| `F1-spec-…` §US-7, §F1.2 | `component.json` gains `mappings`; `SharedRef` gains optional `remap`; add `E-SHARED-UNDECLARED` |
| `F1-spec-…` new user story `US-29` | `harness pack info <name>` (update `CLAUDE.md` counter table: last used US-29, next free US-30) |
| `F1-spec-…` §US-6, §US-10 | `merge-json` records per-owned-key hashes; add `E-MERGE-JSON-INVALID` |
| `F1-spec-…` §US-10, §US-12 | Manifest gains `pack.integrity` (Q-19); apply writes `.harness/.gitattributes`; base copies are text-only |
| `F1-spec-…` §US-4 | Add the `{{harness:lit:X}}` escape |
| `F1-spec-…` §Open Questions | Q-18…Q-27 move to Resolved Decisions citing this ADR |
| `F5-spec-…` §Error States | Twelve CLI rows re-pointed at F1 codes and F1 exit classes; three pack-content rows keep verbatim strings |
| `F5-spec-…` §NFR | Strike "except for a single declared date field"; restate "declared calibration-varying file list" as `validate --json`'s `parameterVaryingFiles` |
| `F5-spec-…` §US-19 | Cite the parameter mechanism (`constraintFloor` enum + `flag: "calibration"`) rather than implying a bespoke flag |
| `LintelHarnessSpecification-1.0.md` | Close Q-13 (parameters, not a variant-block grammar) and Q-15 (F1 owns logic and surface; F4 gains nothing); leave Q-14, Q-16, Q-17 open with §6.1's framing |

#### 6.4.1 Added by the security remediation pass

Everything below is authorised by §7 and mapped by §8. **F1 §Error
States is the only catalogue**, so every new code lands there; the rows
name the *other* section each change also touches.

| Document | Change | Condition |
|---|---|---|
| `F1-spec-…` §US-3 | Replace the four-item path-safety list with §7.1's four stages. `to` follows the anchored grammar; collisions are computed on the NFC + case-folded `collisionKey`; the reserved-destination denylist applies to the **resolved** path; `executable: true` is permitted only under a declared `executableRoots` prefix | C-4 C-5 C-6 C-12 |
| `F1-spec-…` §US-6 | The `merge-json` criteria gain: the §7.2.1 destination table; the leaf-only rule; `mode` lockdown on `.claude/settings*.json`; the §7.2.4 removal-honouring merge (**and the merge rule changes — existing entries keep on-disk order, new entries append in pack order**); the region-set comparison on `update` including orphans | C-1 C-3 C-9 |
| `F1-spec-…` §US-4, §F1.1 | Pipeline step 5 takes the mapping's `mode`; JSON-string escaping into `merge-json`; re-parse **and deep-equal** verification; the line-break/marker ban on substituted values; no `{{harness:…}}` under a security-relevant owned key | C-7 C-8 C-9 |
| `F1-spec-…` §US-7 | `--allow-stale-shared` gains the words **"on `harness validate` only"**; a shared-digest mismatch on any write path is `E-SHARED-STALE`, exit 2, zero bytes, no override. Component mappings and `remap` targets are confined identically to a pack's own | C-5 C-10 |
| `F1-spec-…` §US-8 | `parameters[].pattern` (required for `string`) and `maxLength` (default 256); `notASecret`; the credential heuristic; answers re-validated on every read-back from the manifest; the reserved-flag list gains `--accept-permissions`, `--accept-hooks` | C-7 C-15 |
| `F1-spec-…` §US-2 | A content source alongside `"status": "absent"` becomes `E-ANATOMY-SOURCE-ON-ABSENT` (exit 2), not a warning. State the line: a key that *contradicts* the status is an error, one that is merely *inapplicable* stays a warning | §7.8.3 |
| `F1-spec-…` §US-1 | State the key/value asymmetry explicitly: unknown **keys** warn and are ignored; an unrecognised **value in a behaviour-selecting position** is exit 2, zero bytes, with the closed list of positions from §7.6 | C-16 |
| `F1-spec-…` §US-10, §F1.4 | `OwnedKeyEntry` gains `security`, `entries`, `removed`; manifest `path` keys are NFC-normalized; state plainly that `parameters` and `.harness/base/` are **committed and repo-public** | C-3 C-6 C-15 |
| `F1-spec-…` §US-11 | Drift reports a changed mode bit as `modified` with `modeChanged`; the Windows caveat; the `untracked` scan is bounded and does not follow links | C-12 C-17 |
| `F1-spec-…` §US-13, §F1.6 | The consent gate precedes the lock; journal v2 with `preExisting`/`preHash`/`preMode`/`backup` and `.harness/journal.d/`; the five-case rollback table; exclusive-create writes and `E-TARGET-RACE`; re-confinement before each write | C-2 C-13 C-14 |
| `F1-spec-…` §US-16 | The §7.7 check order, with the security checks at positions 3b, 3c, 7 and 8 | C-1…C-18 |
| `F1-spec-…` §US-29 | `pack info` renders `PackReport.disclosure` — every security-relevant grant and every 0755 path, verbatim — and `parameterVaryingRegions` | C-2 C-12 §7.8.4 |
| `F1-spec-…` §NFR | *Filesystem safety* restated as confinement-by-resolution; traversal caps (depth 32, 10 000 entries) under *Memory and size bounds*; *Rollback safety* restated per §7.5; *Concurrency* gains the stale-lock rule | C-4 C-13 C-17 |
| `F1-spec-…` §Error States | **38 new rows.** Exit 2: `E-OWNEDKEY-FORBIDDEN`, `E-SETTINGS-MODE-FORBIDDEN`, `E-DEST-SYMLINK`, `E-MAP-RESERVED-DEST`, `E-MAP-PATH-GRAMMAR`, `E-MAP-NORM-COLLISION`, `E-PARAM-NO-PATTERN`, `E-PARAM-PATTERN-INVALID`, `E-PARAM-SECRET-SUSPECTED`, `E-SUBST-IN-SECURITY-KEY`, `E-SUBST-MARKER-INJECTION`, `E-REGION-TAMPERED`, `E-PACK-INTEGRITY-MISMATCH`, `E-EXEC-DEST-FORBIDDEN`, `E-EXEC-ROOT-UNDECLARED`, `E-EXEC-TOO-MANY`, `E-UNKNOWN-VALUE`, `E-TRAVERSAL-LIMIT`, `E-TARGET-RACE`, `E-JOURNAL-UNREADABLE`, `E-CONTRIB-POLICY`, `E-ANATOMY-SOURCE-ON-ABSENT`. Exit 1: `E-SETTINGS-CONSENT-REQUIRED`, `E-HOOKS-NOT-SUPPORTED`, `E-FLAG-NOT-PERMITTED`, `E-LOCK-HELD`, `E-CLI-UNKNOWN-COMMAND`, `E-CLI-UNKNOWN-FLAG`, `E-CLI-FLAG-VALUE-MISSING`, `E-CLI-ARG-UNEXPECTED`. Warnings: `W-SETTINGS-REMOVAL-HONOURED`, `W-HOOK-SCRIPT-INERT`, `W-PATH-NON-NFC`, `W-PACK-INTEGRITY-DIFFERS`, `W-ANSWER-LOOKS-SECRET`, `W-SCAN-SYMLINK-SKIPPED`, `W-LOCK-STALE-BROKEN`, `W-BASE-MISSING`. **Changed rows:** `E-MERGE-JSON-INVALID` (extended to the re-parse/deep-equal check), `E-MAP-CASE-COLLISION` (folding defined), `E-SHARED-STALE` (no override on a write path), **`E-BASE-MISSING` split per §7.8.5** | all |
| `F1-spec-…` §F1.2 | **Strike the `settings.json` → `.claude/settings.json` mapping from the worked `coding` pack** — it contradicts F5's twice-stated "no default permission set". See §8.3 | S-1 |
| `F1-spec-…` §Technical Context | Two rows: *Confinement* (by resolution, `AppliedPath`) and *Settings ownership* (destination-keyed allowlist, no hooks at v1.0) | C-1 C-4 |
| `F5-spec-…` `planning` part 8 | **Drop the kill-criteria hook.** Part 8 = three slash commands plus one **inert** guard script under `.claude/hooks/`, 0644, registered by nothing. Restate the comparison-table row. Part 8 stays `present`, **not** `provisional` (the "exactly one provisional" NFR) | §7.2.5 |
| `F5-spec-…` `planning` §Conventions | "Kill criteria stated BEFORE a bet starts… **Enforced by hook (part 8)**" → enforced by the `/bet` command's own instruction and by review, as `coding` and `writing` already record their unenforced rules | §7.2.5 |
| `F5-spec-…` §Error States | The kill-criteria block message **stays verbatim** and stays F5's, but its emitter changes from a hook to the `/bet` command's agent instruction | §7.2.5 |
| `F5-spec-…` §US-19 | Name the file **or region id** carrying the varying absorption-gate coverage narrative, and assert the gate's *rule* text is not inside it. Cite `parameterVaryingRegions` for the region-granular half of the NFR | §7.8.4 |
| `F5-spec-…` R5 / findings | Record the third shortfall: **no v1.0 pack ships an enforcing hook**, and the reason is a format decision, not a migration constraint | §7.2.5 |
| `F5-spec-…` `planning` part 7 | The scaffolding block's `.claude/{agents/, commands/, hooks}` stands, with `hooks/` annotated as inert at v1.0 | §7.2.5 |
| `CLAUDE.md` counter table | No new user story is proposed. Every change above lands in an existing US or in §Error States; **next free remains US-30** | — |

---

## 7. Security architecture

Added by the security remediation pass of 2026-08-30, against the
SecurityReviewer's Mode A finding on F1 + this ADR (**REVISE-SPEC**,
S-1…S-14, conditions C-1…C-18). Everything below is a *decision*, not a
restatement of the finding. §8 maps each condition to where it lands.

### 7.0 The threat model, stated, because the controls only make sense against it

Lintel Harness is a local developer CLI with no network access
(§NFR *No network*), no registry and no third-party packs (Q-2), and
packs bundled with the published binary. There is no remote attacker in
this model, and controls that only make sense against one are not worth
their cost. The three actors that *are* in it:

1. **A pack author** — plausibly the user's colleague, plausibly the
   user six months ago — writing a pack that a reviewer skims. Packs are
   authored in one repo and applied in another; the review that would
   catch `"ownedKeys": ["hooks"]` is a diff review of JSON, and JSON diff
   reviews are exactly where a permission grant hides.
2. **The format itself**, as a thing other people will copy. Q-2 forbids
   third-party packs at v1.0; it does not forbid someone reading this
   spec in 2027 and building a registry on it. What `harness validate`
   calls a valid pack is the format's real security boundary, and it
   outlives the "no registry" mitigation.
3. **The filesystem the CLI writes into**, which is not fully known at
   plan time — symlinked directories, case-insensitive volumes, a
   `specifications/` that is a symlink into another checkout.

That ordering is why the **authoring-time checks are the high-value
half** of this section: they run in CI, cost nothing at apply, and stop
the bad pack from existing rather than stopping it from working. The
runtime checks are defence-in-depth and are priced as such in §8.2.

### 7.1 Confinement is by resolution, not by string

F1's existing rule — reject a `to` that is absolute, contains `..`, or
escapes the root — inspects a **declared string** and therefore says
nothing about the filesystem it will meet (S-2). Confinement is
restructured as four ordered stages, all of them in
`src/security/confine.ts`, which is the **only** constructor of
`AppliedPath`.

#### 7.1.1 Stage 1 — the anchored `to` grammar (C-6), declaration time

A `to` value must match, as a whole:

```
to        := segment ( "/" segment )* ( "/" )?      # trailing "/" only for a directory mapping
segment   := char+                                   # NFC-normalized, ≥ 1 char
char      := any Unicode scalar EXCEPT
             /  \  :  *  ?  "  <  >  |  and U+0000–U+001F, U+007F
```

and additionally, all rejected with `E-MAP-PATH-GRAMMAR` (exit 2), each
naming the offending construct:

| Rejected | Because |
|---|---|
| a leading `/` or `\` | POSIX-absolute |
| any `\` anywhere | Windows separator; a pack must declare POSIX paths, and `a\b` is one segment on POSIX and two on Windows |
| `^[A-Za-z]:` — `C:\x`, and **`C:x`** | drive-absolute and **drive-relative**; `C:x` resolves against the *per-drive* cwd and is not relative to anything the CLI controls |
| `//` or `\\` prefix | UNC / network path |
| a `.` or `..` or empty segment | the classic escape, now rejected as *grammar* rather than as substring search |
| a segment ending in `.` or in any whitespace | Windows silently strips these, so `foo.txt.` and `foo.txt` are the same file there and different files here — a rename the pack did not ask for |
| a reserved Windows basename, with or without extension (`CON`, `PRN`, `AUX`, `NUL`, `COM1`–`COM9`, `LPT1`–`LPT9`) | already an F1 NFR; now enforced in the one grammar |
| a non-NFC `to` | see below |

**NFC.** `to` must be NFC. Source basenames discovered by directory
recursion are NFC-normalized when the applied path is computed, with
`W-PATH-NON-NFC` naming the file — because a macOS checkout can hold NFD
filenames and an NFD manifest key would not match a Linux teammate's NFC
one, breaking G-F1-7 quietly. **All manifest `path` keys are POSIX-
separated and NFC-normalized**, without exception.

**Collision keys.** Two applied paths collide when
`collisionKey(a) === collisionKey(b)`, where `collisionKey` is the path
**NFC-normalized and then case-folded**. Case collision keeps
`E-MAP-CASE-COLLISION`; a collision that survives case-folding but is
created by normalization alone is `E-MAP-NORM-COLLISION`, exit 2, because
the remedy is different prose ("these are two byte sequences for the same
macOS filename", not "rename one of them"). The check runs over the
**merged** mapping set — pack, every selected scaffold, and every
inherited component mapping after `remap`.

#### 7.1.2 Stage 2 — the reserved-destination denylist, on the RESOLVED path (C-5)

No mapping, scaffold mapping, inherited component mapping, `remap`
target, `contributes[].file`, `executableRoots` entry or contribution
target may resolve to a path whose first segment is:

`.git/` · `.hg/` · `.svn/` · `.harness/`

or which lies inside the resolved directory the CLI is installed in
(`realpath` of the package root — this matters precisely when someone
runs `harness init` inside the harness repo, which S7 says they will).
`E-MAP-RESERVED-DEST`, exit 2. This is checked **after** resolution, so a
`to` that reaches `.git/hooks/pre-commit` by any route — a component
mapping, a `remap`, a scaffold, a directory recursion — is caught by the
same rule rather than by four copies of it.

`.git/hooks/pre-commit` with `executable: true` was a conforming mapping
under the pre-amendment spec and is remote-code-execution on the next
commit. It is now two independent errors (this one and
`E-EXEC-DEST-FORBIDDEN`), which is the right number.

**The CLI's own `.harness/` writes are not mappings** and do not consult
the denylist. `base-store.ts`, `journal.ts` and `lock.ts` take an
already-confined `AppliedPath` and derive their `.harness/` location
themselves; the base path for an applied path `p` is
`.harness/base/` + `p`, and because `p` has already been proven free of
`..` and of leading separators, the base path is confined by
construction. This must be stated or an implementer deadlocks the
denylist against the base store.

#### 7.1.3 Stage 3 — resolution confinement (C-4)

The **project root is resolved once per run** with `realpath()`, and
everything below is judged against the *resolved* root. This is a
deliberate departure from the condition as written — see §8.2 — and
without it the CLI refuses to run in `/tmp` on macOS, where `/tmp` is
itself a symlink to `/private/tmp`.

Below the resolved root, for every applied path:

- `lstat` every ancestor component, top down. Any component that is a
  symlink, a Windows junction, or any other reparse point → `E-DEST-SYMLINK`,
  exit 2, naming the component. The CLI does not traverse through one and
  does not create through one.
- Directories the apply itself needs are created **one level at a time**,
  non-recursively, each `lstat`-checked before the next; a directory the
  apply created is trivially not a symlink.
- The final destination, if it exists, is `lstat`ed: a symlink there is
  `E-DEST-SYMLINK` as well. A pack never writes through a link.
- Assert the resolved parent directory, joined with the final basename,
  is a **strict descendant** of the resolved root. This is the assertion
  the string check was standing in for, and it is the one that actually
  holds.

The whole of this stage is skipped at `validate` time (`stage:
'declared'`), which has no project to inspect; it runs at plan time and
again at write time.

#### 7.1.4 Stage 4 — the write itself (C-14)

`PlannedFile.path` is `AppliedPath`, so a path that never went through
`confinePath()` cannot reach the writer without a compile error. That is
the point of the brand and it is worth more than any runtime check in
this section.

`executeApply` nonetheless **re-runs stage 3 immediately before each
write** and creates with exclusive semantics, because plan-to-write is a
window and the plan's `lstat` is stale by then:

- Temp file: `fs.open(tmp, 'wx', mode)` — exclusive create, so a
  pre-placed temp name cannot be written through.
- Destination the plan expects to be **new**: `link(tmp, dest)` then
  `unlink(tmp)`. `link` fails `EEXIST` if the destination appeared in the
  window, which is exactly the exclusive-create semantic `rename` does
  not give. Where `link` is unavailable (`EPERM`/`ENOSYS` on an exotic
  filesystem), fall back to claim-with-`open(dest,'wx')` then `rename`,
  and record the narrowed guarantee in the run's diagnostics.
- Destination the plan expects to **exist** (`--force` byte-identical,
  `merge-json` into an existing file, an `update`): `lstat` it, confirm a
  regular file, recompute its hash, confirm it still equals what the plan
  observed, then `rename`.
- Any of those confirmations failing is `E-TARGET-RACE`, exit 2. The run
  stops with the journal in place and is recoverable by `--rollback`.

### 7.2 The settings and consent model

#### 7.2.1 `merge-json` gains a destination policy, not a pack policy

The defect in S-1 is not that `merge-json` exists; it is that
`ownedKeys` was **unconstrained** and nothing distinguished
`permissions.allow` from `theme`. The constraint belongs on the
**destination**, not on the pack — a table keyed by applied path, in
`src/security/destination-policy.ts`. Every pack writing that destination
gets the same rule, so S5 ("adding a pack requires no core change")
survives intact: adding `planning` does not touch the table.

**The v1.0 sensitive-destination table.**

| Destination | Ownable | Security-relevant | Forbidden, and why |
|---|---|---|---|
| `.claude/settings.json`, `.claude/settings.local.json` | `permissions.allow`, `permissions.deny`, `permissions.ask`, `env.<NAME>`, `model`, `outputStyle` | `permissions.allow`, `permissions.deny`, `permissions.ask`, `env.<NAME>` | `hooks` and anything under it — §7.2.5. `statusLine`, `apiKeyHelper`, `awsAuthRefresh`, `otelHeadersHelper` — each holds a **command that is executed**, and a pack that can set one has the hook capability under another name. `permissions.defaultMode` — weakens the default posture for everything, including grants the pack did not make. `permissions.additionalDirectories` — grants filesystem reach outside the project, which is the one thing the whole of §7.1 exists to prevent. `enableAllProjectMcpServers`, `enabledMcpjsonServers`, `enabledPlugins`, `forceLoginMethod` — each admits a whole new class of executable content by reference |
| `package.json` | anything **except** the roots opposite | — | `scripts` and anything under it (`npm install` executes `postinstall`; this is the hook capability wearing an npm hat), `bin`, and the `*Dependencies` roots (adding a dependency is adding arbitrary code) |
| any other JSON target | any dotted path | none | — |

The general rule the table instantiates, which is what a v1.1 extends:
**a destination is sensitive when some common toolchain executes what it
contains, or when it governs what may be executed.** A `merge-json` into
`tsconfig.json` needs none of this apparatus and gets none of it.

**Leaf-only for security-relevant roots (C-1).** A declared owned key
must resolve, in the pack's *source* JSON, to a scalar or an array of
scalars — never to an object. So `"permissions.allow"` is ownable and
`"permissions"` is not; `"env.EDITOR"` is ownable and `"env"` is not.
This is the mechanical form of "ownable only by explicit leaf
declaration, never via a parent object", and it is checkable without
knowing the destination's schema. Violations of either the allowlist or
the leaf rule are **`E-OWNEDKEY-FORBIDDEN`, exit 2, at validate time**,
carrying a `{reason}` that distinguishes the two.

**Mode lockdown.** A mapping whose applied path is `.claude/settings.json`
or `.claude/settings.local.json` may use **only** `mode: "merge-json"`.
Any other mode on that destination is `E-SETTINGS-MODE-FORBIDDEN`, exit 2
— otherwise `mode: "managed"` is a trivial bypass of everything above.

#### 7.2.2 Consent is a gate on the plan, before the first byte (C-2)

The planner builds `SecurityDisclosure` (see the interface contract). It
enumerates **every value** under a security-relevant owned key,
**verbatim, one entry per line, never summarised and never counted** —
"adds 14 permissions" is not consent, it is a number. It also enumerates
every 0755 path and every inert hook script.

The gate, in `executeApply`, before the lock is taken:

| Situation | Behaviour |
|---|---|
| `requiresConsent === false` | proceed silently; this is every v1.0 pack |
| interactive, prompt returns true | proceed |
| interactive, prompt returns false | `E-SETTINGS-CONSENT-REQUIRED`, exit 1, **zero bytes** |
| non-interactive, `--accept-permissions` | proceed, and print the disclosure to **stdout** so it lands in the CI log |
| non-interactive, no flag | `E-SETTINGS-CONSENT-REQUIRED`, exit 1, **zero bytes** |
| `--accept-hooks` given, ever | `E-HOOKS-NOT-SUPPORTED`, exit 1 |

`ConsentInputs` is optional on `ApplyInputs` and its absence means
*non-interactive with no blanket accept*. There is **no** value of
`ApplyInputs` that means "consent is granted by default", which is the
property that matters: a caller cannot reach the permissive branch by
forgetting a field.

`harness pack info` renders the same structure from `PackReport`
(all-combinations form), so a user sees what a pack will take **before**
deciding to apply it. One disclosure builder, three surfaces, no
possibility of the summary and the prompt disagreeing.

#### 7.2.3 `--accept-hooks` exists and always fails

Deliberate. A flag that does not exist produces "unknown flag" and
invites a workaround; a flag that exists and fails with
`E-HOOKS-NOT-SUPPORTED` documents the boundary and gives a future version
a name to keep. It is the one place we spend a code on something we have
decided not to build.

#### 7.2.4 `update` must not re-add what the user deleted (C-3)

Array union pack-order-first silently resurrects a permission the user
deliberately removed. The fix is in the manifest: `OwnedKeyEntry` records
`entries` (exactly what this apply wrote) and `removed` (what the user has
since deleted). On `update`, for a security-relevant array key:

1. `removed' = (entries ∪ removed) \ onDisk` — anything we wrote before,
   or already knew was removed, that is not on disk now, is removed **by
   the user**. `removed` is monotonic; an entry leaves it only when the
   user puts the value back by hand.
2. Written array = the on-disk array, **in its on-disk order**, with the
   pack's new entries appended in pack-declared order, *minus* everything
   in `removed'`.
3. Each suppressed entry is reported: `W-SETTINGS-REMOVAL-HONOURED`,
   naming key and value — the user should know the pack asked and did not
   get it.
4. Record `entries` = the pack's current set, `removed` = `removed'`.
5. **A genuinely new grant re-gates.** An entry in the pack's set that is
   in neither `entries` nor `removed` is a new grant, and `update`
   re-runs the §7.2.2 gate **on the delta only**. No delta, no prompt, so
   `update` stays scriptable for every pack that is not asking for more.

Note two changes this forces on F1 §US-6, both of which the SpecWriter
must fold: the merge is no longer "union pack-order-first" (existing
entries keep their on-disk order), and a `merge-json` file is no longer
described purely by a per-owned-key hash.

#### 7.2.5 THE HOOK DECISION — packs may not register hooks at v1.0

F5 ships `planning` with a kill-criteria guard hook (its anatomy part 8,
and its §Conventions says "Enforced by hook"), and its scaffolding block
lists `.claude/{agents/, commands/, hooks}` — while F1 has **no** mapping
mode, no declaration and no consent surface for hook registration. The
honest answer is the one the reviewer's C-1/C-2 pairing points at: the
declaration mechanism and the consent gate are one decision, and we are
not in a position to make it well.

**Decision: no pack may register an agent hook at v1.0.** `hooks` and
every path under it are removed from the ownable set at every sensitive
destination; a pack declaring `ownedKeys: ["hooks"]` — which was
*conforming* before this amendment — now fails `E-OWNEDKEY-FORBIDDEN` at
validate time, so it never ships and never reaches a consent prompt.

Four reasons, in the order of their weight:

1. **A hook is categorically unlike everything else a pack writes.** The
   entire rest of F1's model is "a pack writes text files into a
   project". Nothing else it writes executes. A hook is arbitrary shell,
   run by the agent runtime, on events the user does not initiate
   deliberately, with no per-invocation consent. One-time consent at init
   is not consent to the hundredth invocation.
2. **`update` makes the consent unbounded.** A hook's command string is a
   merge target. The pack changes it, the user changed it, and F3's
   3-way merge resolves to a command **neither party wrote**. C-3
   (honour removals) is a strictly weaker guarantee than "a changed
   command re-consents", and F1 has no design for consent-on-merge. This
   is the reason that is not fixable by trying harder in F1.
3. **There is no provenance story to hang it on.** v1.0 has no signing,
   no registry and no provenance fields in `pack.json` (F1 §Out of
   scope). The bundled packs are low-risk; the **format** is not, because
   `harness validate` is the thing that pronounces a pack well-formed and
   that pronouncement outlives "packs are bundled".
4. **The consent UX belongs to F2 and F2's spec does not exist yet.**
   Designing the format for it here and the consent there splits the one
   decision that must not be split.

**What a pack may still do.** A pack **may** ship files under
`.claude/hooks/`. They are ordinary files: written `0644` (C-12 forbids
`executable: true` under `.claude/`), registered by nothing, and executed
by nothing. `harness validate` emits **`W-HOOK-SCRIPT-INERT`** naming
each such file and saying plainly that no v1.0 mechanism registers it,
and the file is listed in `SecurityDisclosure.inertHookScripts` so the
init summary says the same thing. This is deliberate: it gives `planning`
somewhere to put the guard, lets `update` carry it forward unchanged, and
makes the v1.1 route obvious — a `hooks` declaration whose consent
surface is designed together with F2's prompting, with the merge problem
of reason 2 solved before it ships.

**Consequence for F5's `planning` pack, stated concretely** (the
SpecWriter folds this into F5, not F1):

- Part 8 becomes **three slash commands (`/bet`, `/review`, `/horizon`)
  plus one inert, documented guard script.** F5's comparison table row
  "3 slash commands, 1 enforcement hook" must be restated.
- §Conventions' "**Kill criteria stated BEFORE a bet starts.** … Enforced
  by hook (part 8)" becomes **enforced by the `/bet` command's own
  instruction and by review**, not by a hook — which is exactly the
  treatment F5 already gives `coding`'s no-code-before-PROCEED rule and
  `writing`'s index rule. The verbatim block message stays in F5's
  §Error States as **pack content emitted by the `/bet` command's agent
  instruction**, not by a hook. The row survives; only its emitter
  changes.
- **Part 8 stays `present`, not `provisional`.** Three slash commands is
  real content, and F5 asserts "exactly one provisional part" across the
  three packs as a counted NFR — that one is `planning`'s `roles`.
  Marking part 8 provisional would make it two and break a mechanically
  checked NFR to describe a gap F5 already has a form for.
- F5's claim that "an authored pack reaches an adequate part 8 while both
  migrated packs do not" now rests on three slash commands rather than on
  the hook. It still stands; it is weaker, and it should be written as
  weaker.
- **R5 gains a third recorded shortfall**: no v1.0 pack ships an enforcing
  hook, and the reason is a format decision rather than a migration
  constraint. That is a stronger finding than either of the two F5
  records today, and it is the honest headline of this amendment.

### 7.3 Substitution is untrusted input (C-7, C-8, C-9)

An answer is user input that is recorded verbatim and **replayed on every
`update`**. It is treated as untrusted at every use.

- **Constrained at declaration.** `type: 'string'` requires `pattern`
  (anchored, ≤ 200 chars, no backreference, no lookaround —
  `E-PARAM-PATTERN-INVALID`) and takes `maxLength` (default 256, ceiling
  4096). A missing `pattern` is `E-PARAM-NO-PATTERN`, exit 2. The
  recommended conservative pattern, which an author writes out rather
  than inherits silently, is `^[\p{L}\p{N} ._-]{1,64}$`. `enum` and
  `boolean` need neither; their value sets are already closed.
- **Validated twice.** At answer-collection time, and **again whenever a
  recorded answer is read back from the manifest** — because
  `W-MANIFEST-EDITED` is a *warning*, so a recorded answer is an
  attacker-controllable value by F1's own design. `E-PARAM-INVALID`.
  Length is checked before the regex runs, so pattern evaluation is
  bounded by `maxLength` and ReDoS is not reachable.
- **Context-aware escaping.** Pipeline step 5 now takes the mapping's
  `mode`. For `merge-json`, a substituted value is JSON-string-escaped
  before insertion. For every other mode it is inserted verbatim, as
  today. After serialization the merge-json output is **re-parsed**, and
  the value at each owned key must **deep-equal the intended value** —
  failure is `E-MERGE-JSON-INVALID`, nothing written. The deep-equal is
  one line stronger than a re-parse check and catches an injection that
  happens to still parse.
- **No substitution into a security key at all (C-8).** No
  `{{harness:…}}` token may appear in a source value that lands under a
  **security-relevant** owned key. `E-SUBST-IN-SECURITY-KEY`, exit 2, at
  validate time, no override. A permission string is a decision the pack
  author makes at authoring time; it is not a decision a user makes by
  typing a project name.
- **No line breaks out of a value (C-9).** A substituted value may not
  contain `\n`, `\r`, `U+2028` or `U+2029`, and the line it produces may
  not lex as a `harness:` directive in any of the three comment wrappers.
  Both checks, one code: `E-SUBST-MARKER-INJECTION`, exit 2. The newline
  ban is the *sufficient* condition — a conforming `pattern` already
  excludes them, and this is the check that does not depend on the author
  having written a good pattern.
- **`update` refuses a tampered region set (C-9).** Before merging, the
  applied file is re-lexed and its ordered `harness:region` id list, its
  nesting and its termination must equal the **manifest's recorded**
  `regions[]` — including entries marked `orphaned`, since an orphan
  legitimately remains in the file after the pack stops declaring it. Any
  difference — an added region, a missing one, a reorder, an unterminated
  marker — is `E-REGION-TAMPERED`, exit 2, and that file is refused for
  merge; F3 offers replace-or-keep. This is what stops a forged region
  from hijacking ownership or truncating a real one.

### 7.4 The executable bit is declared, bounded, disclosed and watched (C-12)

- `pack.json` gains **`executableRoots: string[]`** — applied-path
  prefixes, each ending `/`, each subject to §7.1.1's grammar and
  §7.1.2's denylist. `executable: true` outside every declared root is
  `E-EXEC-ROOT-UNDECLARED`, exit 2. Absent or empty means the pack ships
  no executable, which is the common case and the default.
- A declared root that resolves under `.claude/`, `.git/`, `.hg/`,
  `.svn/` or `.harness/` is `E-EXEC-DEST-FORBIDDEN`, exit 2 — checked at
  declaration and again per applied path, so a directory recursion cannot
  reach a forbidden destination that the root itself did not name.
- **Cap: 32 executable files per apply**, `E-EXEC-TOO-MANY`, exit 2. The
  cap's real value is not blast radius (see §8.2) but that a pack wanting
  more has to say so in an ADR of its own.
- Every 0755 path appears in `SecurityDisclosure.executables`, hence in
  the init summary and in `pack info`. It does **not** gate: enumeration
  is what C-12 asks for and a gate here would fire on nothing at v1.0.
- **Drift sees the mode bit.** `FileDrift.modeChanged` is true when the
  on-disk executable bit differs from `FileEntry.executable`, and the
  file's state is `modified` even when the content hash matches — an
  on-disk `chmod +x` is a change and content-hash-only drift was blind to
  it. On Windows the bit is not represented, `modeChanged` is always
  false, and drift is content-only; **this is the one place G-F1-7's
  cross-platform promise genuinely differs by platform**, and it is
  recorded rather than papered over.

### 7.5 Rollback deletes only what it created, and restores what it overwrote (C-13)

F1 §US-13 states the invariant "rollback never deletes a file it did not
create" and then specifies a journal that cannot express it: under
`--force`, a byte-identical pre-existing path is journalled with a hash
that already matches on disk, so `--rollback` deletes a file the apply
never created. `Journal` becomes **version 2** and gains the fields that
make the invariant checkable:

`preExisting`, `preHash`, `preMode` per entry, plus `backup` — a path
under `.harness/journal.d/` holding the pre-apply bytes, written **before**
the overwrite and present exactly when `preExisting && preHash !== sha256`.
Only genuine overwrites pay for a backup.

The four cases, exhaustively:

| `preExisting` | on-disk hash | Rollback |
|---|---|---|
| false | = intended | **delete** — we created it, it is still ours |
| false | ≠ intended | **keep**, report — the user edited it after the crash |
| true, `preHash === sha256` | = intended | **leave untouched**, report as kept — `--force` byte-identical; the file was already correct and was never ours |
| true, `preHash !== sha256` | = intended | **restore from `backup`**, report as restored |
| true | ≠ intended | **keep**, report — the user edited it after the crash |

`createdDirs` is removed in reverse creation order, and only when empty.
A journal declaring any `version` other than `2` is
`E-JOURNAL-UNREADABLE`, exit 2 — the fail-closed default of §7.6 applied
to the journal. Version 1 never shipped; the check exists so it never
can.

The invariant, restated as F1 should have stated it: **rollback deletes
only paths this apply created, restores only paths this apply overwrote,
and acts on neither unless the on-disk bytes are still exactly what this
apply wrote.**

### 7.6 Fail-closed, integrity, and the bounded walks

**Fail-closed default (C-16), stated once and normatively.** Unknown
**keys** in `pack.json`, `component.json` or the manifest are a warning
and are ignored — unchanged, and F1.5's "unknown keys preserved verbatim
on rewrite" stands. An unknown or unrecognised **value in a
behaviour-selecting position** is a hard error, exit 2, zero bytes. The
positions are enumerated, and the enumeration is closed:
`Mapping.mode`, `ParameterDecl.type`, `AnatomyDecl.status`,
`FileEntry.origin`, `FileEntry.mode`, `FileEntry.eol`, `TransformName`,
a region directive name, an `ownedKeys` root against §7.2.1's table, a
`SharedRef.integrity` prefix, and `Journal.version`. Where a specific
code exists (`E-REGION-UNKNOWN`, `E-OWNEDKEY-FORBIDDEN`,
`E-JOURNAL-UNREADABLE`) it is used; otherwise **`E-UNKNOWN-VALUE`**,
carrying `{field}`, `{value}` and `{allowed}`.

**Severity is a property of the code, not of the occasion.** A scenario
that is fatal in one context and tolerable in another gets **two codes**,
not one code with two severities. This is the general rule §7.8.5 applies
to `E-BASE-MISSING`, and it is what keeps "exit class is a property of
the run" true: `exitCodeFor()` folds a bag of fixed severities and never
needs to know which command it is in.

**Integrity is fail-closed on every write path (C-10).**
`--allow-stale-shared` is registered on **`validate` only**, in
`flags.ts`'s per-command table. On `init`, `update` or `contribute` it is
`E-FLAG-NOT-PERMITTED`, exit 1 — *not* silently ignored, because a user
who typed it believed it did something. A shared-digest mismatch on any
write path is `E-SHARED-STALE`, exit 2, zero bytes, **no override
exists**. F1 §US-7's "downgrades it to a warning for local iteration"
must gain the words "on `harness validate` only".

**`pack.integrity` is actually verified (C-11), correctly scoped.** The
condition as written would break every legitimate `update`; the amended
check is in §8.2. What is specified here: when the installed pack's
`name` **and** `version` equal the manifest's recorded `pack.name` and
`pack.version`, the installed pack's `treeDigest` **must** equal the
recorded `pack.integrity`, or `E-PACK-INTEGRITY-MISMATCH`, exit 2, refuse
to merge. Two different builds of `coding@1.0.0` is a wrong "ours" in a
3-way merge, which loses work silently. When the versions differ this is
a genuine upgrade, the check does not apply, and `update` records the new
digest. `harness status` reports the same-version mismatch as
`W-PACK-INTEGRITY-DIFFERS` — which is the check F1.4's field table
already promised (`pack.integrity` → "detect *your CLI's pack differs
from what you applied*") and never specified.

**Both walks are bounded and neither follows a link (C-17).** One module,
`src/fs/walk.ts`, serves the `contentRoot` recursion and the `untracked`
project scan. Max depth **32**, max entries **10,000** per walk;
exceeding either is `E-TRAVERSAL-LIMIT`, exit 2. Entries are `lstat`ed,
never `stat`ed. A symlink under `contentRoot` remains
`E-SYMLINK-IN-PACK`; a symlink met by the project scan is skipped with
`W-SCAN-SYMLINK-SKIPPED`. The project scan does not descend into `.git/`,
`.hg/`, `.svn/`, `.harness/` or `node_modules/`.

**The lock is never broken silently (S-13).** `.harness/lock` holds
`{ pid, host, startedAt, cli }` and is acquired with `open(…, 'wx')`. On
`EEXIST`: if `host` equals this host, the recorded `pid` is not alive
(`process.kill(pid, 0)`), **and** `startedAt` is older than 60 s, the
lock is stale and is broken with `W-LOCK-STALE-BROKEN` naming the dead
pid. Otherwise `E-LOCK-HELD`, exit 1. A lock whose pid is alive, or whose
host is not ours, is never broken.

**Credentials are forbidden, not handled (C-15).** At validate time, a
`ParameterDecl` whose `id` or `prompt` matches
`/secret|token|passwo?rd|credential|connection.?string|private[_-]?key|api[_-]?key/i`
fails with `E-PARAM-SECRET-SUSPECTED`, exit 2, unless it carries
`notASecret: true`. The message states plainly that the answer is written
verbatim into `.harness/manifest.json` **and** into `.harness/base/`,
both of which are **committed to version control by design** (Q-18,
US-10) and are therefore exactly as public as the repository. At answer
time, a value that looks like a credential (`-----BEGIN`, `sk-`, `ghp_`,
`xox[baprs]-`, or ≥ 40 chars of high-entropy base64url) draws
`W-ANSWER-LOOKS-SECRET` — a warning only, because an error there is a
false-positive machine.

The tempting design — a `type: 'secret'` that is prompted, used, and not
recorded — is **rejected**: an unrecorded answer cannot be replayed, and
`update` re-renders from recorded answers by construction (F1.8 item 1).
v1.0 forbids credentials outright rather than supporting them halfway.

### 7.7 Where the security checks join the validate run

`validate-pack.ts` runs the US-16 order with the new checks interleaved,
so a pack fails on the earliest and most explicable cause:

```
1  pack.json schema            + E-UNKNOWN-VALUE (fail-closed values)
2  anatomy completeness        + E-ANATOMY-SOURCE-ON-ABSENT
3  mapping + path safety       → confine.ts stage 1 and stage 2:
                                 E-MAP-PATH-GRAMMAR, E-MAP-RESERVED-DEST,
                                 E-MAP-CASE-COLLISION, E-MAP-NORM-COLLISION
3b executable declarations     E-EXEC-ROOT-UNDECLARED, E-EXEC-DEST-FORBIDDEN,
                                 E-EXEC-TOO-MANY
3c destination policy          E-OWNEDKEY-FORBIDDEN, E-SETTINGS-MODE-FORBIDDEN,
                                 W-HOOK-SCRIPT-INERT
4  region grammar              (unchanged)
5  rewrite usefulness          (unchanged)
6  shared integrity            E-SHARED-STALE — downgradable HERE only
7  parameter declarations      E-PARAM-NO-PATTERN, E-PARAM-PATTERN-INVALID,
                                 E-PARAM-SECRET-SUSPECTED
8  per-combination render      + E-SUBST-IN-SECURITY-KEY,
                                 E-SUBST-MARKER-INJECTION
9  scaffold collisions         (unchanged, over the merged mapping set)
10 link integrity              (unchanged)
11 disclosure                  build SecurityDisclosure over all combinations
```

Stage 3 of confinement (§7.1.3) is **not** in this list: `validate` has no
project root to resolve. It runs at plan time and at write time only.

### 7.8 Five gaps this pass found, decided

#### 7.8.1 Hooks — decided in §7.2.5

#### 7.8.2 Unknown CLI flags and commands have no diagnostic (gap 2)

F1's catalogue is declared the only catalogue, and it has no code for the
most common CLI failure there is. Four codes, all exit **1**, all
fail-closed — argv parsing rejects, never ignores:

| Code | Scenario |
|---|---|
| `E-CLI-UNKNOWN-COMMAND` | a first positional that is not a known command. Lists the known commands |
| `E-CLI-UNKNOWN-FLAG` | a flag no command recognises. Names it and lists the flags **this** command accepts |
| `E-CLI-FLAG-VALUE-MISSING` | a flag that takes a value received none |
| `E-CLI-ARG-UNEXPECTED` | a positional the command does not take |

Distinct from `E-FLAG-NOT-PERMITTED` (C-10), which is a **known** flag on
the **wrong** command — `init --allow-stale-shared` must not read as a
typo.

**A two-pass parse is forced and must be stated**, or an implementer will
report a false `E-CLI-UNKNOWN-FLAG` for every pack-declared alias. Pass 1
recognises global flags, command flags and the pack name, and **defers**
every unrecognised token. Pass 2 re-parses with the resolved pack's
`parameters[].flag` aliases registered, and only then may a token be
reported unknown.

#### 7.8.3 `AnatomyDecl` — a content source on an `absent` entry (gap 3)

F1 §US-2 currently treats it as a warning under US-1's unknown-key rule.
That is wrong under C-16: `status: 'absent'` plus a content source is not
an unknown key, it is a **contradiction** — the author has declared both
"this part does not exist" and "here is its content", and the format
cannot know which they meant. **`E-ANATOMY-SOURCE-ON-ABSENT`, exit 2.**

The line this draws, which US-2 should state: a key that **contradicts**
the declared status is an error; a key that is merely **inapplicable**
(`reason` alongside `present`, `note` alongside `absent`) stays a
warning. Contradiction is undecidable, redundancy is not.

#### 7.8.4 F5's US-19 — what varies and what is byte-identical (gap 4)

US-19 requires the two calibrations to differ in "the absorption-gate
text describing how much of the gate is already structurally held" while
being byte-identical in "the existence and non-delegability of the
absorption gate". Those are compatible — but **only if the gate's *rule*
and the gate's *coverage narrative* are not in the same file**, or are in
the same file with the coverage narrative confined to an
`harness:if constraintFloor=…` region.

Which files those are is **pack content, and F5's call — referred back**.
What F1 pins is the constraint F5 must satisfy, and the mechanism to
check it:

- F5 must name, in US-19, the file **or the region id** that carries the
  varying coverage narrative, and assert that the gate's rule text is not
  inside it.
- The gate's rule — its existence, its non-delegability, that it may not
  be cleared by the party that ran `deliver` and may not run in parallel
  with `learn` — is invariant, and lives in the six phase definitions and
  in `CLAUDE.md`'s practices.
- **F1 makes the assertion checkable at the granularity F5 actually
  means.** `PackReport` gains
  `parameterVaryingRegions: { path, region }[]` alongside
  `parameterVaryingFiles`. File granularity cannot express "this file
  varies here and is byte-identical there", which is precisely the shape
  of the gate record template. The validator computes it from the same
  per-combination render it already runs, so it costs nothing new.

#### 7.8.5 `E-BASE-MISSING`'s exit class (gap 5) — pinned for F3

F1's row reads "Exit 1, per-file, during update", which contradicts "exit
class is a property of the run, not the file". Pinned under §7.6's
severity rule — **two codes, one severity each**:

- **`W-BASE-MISSING`** (warning) — `update` has a per-file resolution
  policy for this file (`--take-pack`, `--keep-mine`, or an interactive
  answer). The file is handled, the run continues, and `exitCodeFor()`
  sees a warning. A run in which every affected file is resolved exits
  **0**.
- **`E-BASE-MISSING`** (error, exit 1) — no resolution policy exists and
  none can be obtained (non-interactive with no flag). The run's exit
  class then falls out of `exitCodeFor()` like every other, with no
  per-file special case anywhere.

F3 may not invent a third behaviour, and in particular may not vary a
code's severity by context.

---

## 8. Security conditions — C-1…C-18 disposition

**SATISFIED-IN-ADR** = the decision is made here and the ADR is
implementable against it. **DELEGATED-TO-SPEC** = the decision is made
here, and a SpecWriter must fold the stated requirement into the named
F1 (or F5) section before it is testable. Nothing is marked satisfied
that is not actually specified above.

### 8.1 The table

| C | Disposition | Where |
|---|---|---|
| **C-1** `ownedKeys` allowlist; `permissions.*`/`hooks.*` leaf-only or forbidden; `E-OWNEDKEY-FORBIDDEN` | **SATISFIED-IN-ADR** | §7.2.1 (the destination table, the leaf rule) · `src/security/destination-policy.ts` · `Mapping.ownedKeys: OwnedKey[]` in the contract. **Also DELEGATED**: F1 §US-6 must carry the table and the code; F1 §Error States must add `E-OWNEDKEY-FORBIDDEN` and `E-SETTINGS-MODE-FORBIDDEN` |
| **C-2** verbatim enumeration + explicit consent; `E-SETTINGS-CONSENT-REQUIRED`, exit 1, zero bytes | **SATISFIED-IN-ADR** | §7.2.2 (the gate table) · `SecurityDisclosure`, `ConsentInputs`, `ApplyInputs.consent`, `ApplyPlan.disclosure`, `PackReport.disclosure` · `src/security/consent.ts`. **Also DELEGATED**: F1 §US-13 (gate precedes the lock), §US-29 (`pack info` renders it), §Error States |
| **C-3** `update` must not re-add a removed security-relevant array entry | **SATISFIED-IN-ADR** | §7.2.4 (the five-step algorithm) · `OwnedKeyEntry.entries`/`.removed` · `FileDrift.ownedKeys[].removedByUser`. **Also DELEGATED**: F1 §US-6's merge rule changes (on-disk order preserved, not union-pack-first) and §US-10's entry shape; the `update` behaviour itself is **F3** |
| **C-4** confinement by resolution; `lstat` ancestors; `E-DEST-SYMLINK`; descendant proof | **SATISFIED-IN-ADR, AMENDED** | §7.1.3 · `confinePath`, `ConfineContext`, `confineAtWrite`. Amendment (root resolved once, ancestor rule applies **below** the resolved root) argued in §8.2. **Also DELEGATED**: F1 §US-3's validation list and §NFR *Filesystem safety* |
| **C-5** reserved-destination denylist on the resolved path; `E-MAP-RESERVED-DEST`, exit 2 | **SATISFIED-IN-ADR** | §7.1.2, including the `.harness/`-vs-base-store carve-out · `src/security/destination-policy.ts`. **Also DELEGATED**: F1 §US-3, §US-7 (component mappings and `remap`), §US-9 (`contributes`), §Error States |
| **C-6** anchored `to` grammar; collision after case-fold **and** NFC | **SATISFIED-IN-ADR** | §7.1.1 (the grammar and the rejection table) · `collisionKey()`. **Also DELEGATED**: F1 §US-3 and §NFR *Cross-platform*; new codes `E-MAP-PATH-GRAMMAR`, `E-MAP-NORM-COLLISION`, `W-PATH-NON-NFC` |
| **C-7** `pattern` + `maxLength` on every string param; JSON-escape into merge-json; `E-MERGE-JSON-INVALID` on re-parse failure | **SATISFIED-IN-ADR** | §7.3 · `ParameterDecl.pattern`/`.maxLength` · pipeline step 5 takes `mode` · re-parse **and deep-equal**. **Also DELEGATED**: F1 §US-8 (declaration), §US-4 (substitution), §F1.1 (step 5's new input), §Error States |
| **C-8** no `{{harness:…}}` under a security-relevant owned key; `E-SUBST-IN-SECURITY-KEY`, exit 2, at validate | **SATISFIED-IN-ADR** | §7.3 · check position 8 of §7.7. **Also DELEGATED**: F1 §US-4, §US-16, §Error States |
| **C-9** marker-injection ban; `update` refuses a mismatched region set (`E-REGION-TAMPERED`) | **SATISFIED-IN-ADR (validate side) · DELEGATED (update side)** | §7.3 — the newline ban and the lex check are F1's; the `update`-time re-lex and refusal are specified here but **implemented by F3**, and F1 must carry `E-REGION-TAMPERED` in §Error States and the "compare against the manifest's recorded set **including orphans**" rule in §US-6 |
| **C-10** `--allow-stale-shared` on `validate` only; `E-FLAG-NOT-PERMITTED`; no override on a write path | **SATISFIED-IN-ADR** | §7.6 · `src/cli/flags.ts` per-command table. **Also DELEGATED**: **F1 §US-7 must gain the words "on `harness validate` only"**, §US-8's reserved-flag list, §Error States |
| **C-11** `update` verifies `pack.integrity`; `E-PACK-INTEGRITY-MISMATCH`, exit 2 | **SATISFIED-IN-ADR, AMENDED** | §7.6 — scoped to a **same-name-same-version** comparison; argued in §8.2. **Also DELEGATED**: F1 §US-10 and §F1.4's field table; the check runs in **F3**; `W-PACK-INTEGRITY-DIFFERS` is F1's catalogue |
| **C-12** `executable` inside declared roots only; never under `.claude/`,`.git/`,`.harness/`; enumerated; mode drift | **SATISFIED-IN-ADR** | §7.4 · `PackJson.executableRoots` · `SecurityDisclosure.executables` · `FileDrift.modeChanged`. **Also DELEGATED**: F1 §US-3 (the `executable` criterion), §US-11 (drift), §US-29, §Error States |
| **C-13** journal records `preExisting` + pre-apply hash; rollback deletes only non-pre-existing matches | **SATISFIED-IN-ADR** | §7.5 (the five-case table) · `Journal` v2, `JournalEntry`, `.harness/journal.d/`, `RollbackResult.restored`. **Also DELEGATED**: F1 §US-13, §NFR *Rollback safety*, §F1.6's lifecycle diagram |
| **C-14** branded `AppliedPath`; re-validate before each write; exclusive create; `E-TARGET-RACE` | **SATISFIED-IN-ADR** | §7.1.4 · the brand and `confineAtWrite()` in the contract · `PlannedFile.path: AppliedPath`. **Also DELEGATED**: F1 §US-13's write description, §Error States. Priced honestly in §8.2 |
| **C-15** credential-valued parameters forbidden absent `notASecret`; the manifest is repo-public | **SATISFIED-IN-ADR** | §7.6 · `ParameterDecl.notASecret` · `src/security/secret-heuristic.ts`. **Also DELEGATED**: F1 §US-8, §US-10 (state plainly that answers are committed), §Error States |
| **C-16** fail-closed: unknown keys warn, unrecognised **values** are exit 2 | **SATISFIED-IN-ADR** | §7.6 (the closed enumeration of behaviour-selecting positions) · `src/pack/schema.ts`. **Also DELEGATED**: F1 §US-1 (state the key/value asymmetry), §F1.5, §Error States (`E-UNKNOWN-VALUE`) |
| **C-17** depth and entry caps on both walks; neither follows symlinks | **SATISFIED-IN-ADR** | §7.6 · `src/fs/walk.ts` (depth 32, 10 000 entries, skip list, `lstat`). **Also DELEGATED**: F1 §NFR *Memory and size bounds* and §US-11 (the `untracked` scan), §Error States |
| **C-18** `contribute` subject to the identical validation set | **SATISFIED-IN-ADR (the boundary) · DELEGATED (the wiring)** | §Consequences · `checkContentPolicy()` and `ContentPolicyInput` in the contract · `src/security/content-policy.ts`. F1 exports the single gate and `E-CONTRIB-POLICY`; **F4 must route every patch through it and may not hold a second copy of any check** |

### 8.2 Where the reviewer is amended, and where the cost is argued

Adopting a condition that does not survive contact with the product is
not rigour, so these are argued rather than quietly dropped.

1. **C-11 as written breaks every legitimate `update`.** "`update`
   recomputes and compares `pack.integrity`; refuses to merge on
   mismatch" — but `update` exists to move a project from `coding@1.0.0`
   to `coding@1.1.0`, and those digests differ by definition. Taken
   literally the condition makes `harness update` a command that always
   fails. **Amended** (§7.6): the comparison is conditioned on *same name
   and same version*, where a mismatch means two different builds claim
   one version and the 3-way merge would use a wrong "ours" — which is
   the real defect, and which the amended check catches while the literal
   one would have been disabled within a week of shipping. The condition's
   intent is fully served.

2. **C-4 as written refuses to run in `/tmp` on macOS.** "`lstat` every
   ancestor, refuse traversal through symlink" — but on macOS `/tmp` *is*
   a symlink to `/private/tmp`, and a great many developers keep repos
   under a symlinked home or a symlinked work volume. **Amended**
   (§7.1.3): the project root is resolved **once** with `realpath()` and
   everything is judged against the resolved root; the ancestor-symlink
   refusal applies to components **below** it. The property C-4 wants —
   a pack cannot write outside the tree the user pointed at — holds
   exactly. Without this amendment the implementer ships a CLI that
   cannot be used in the most common scratch directory on one of its
   three supported platforms.

3. **C-14's runtime half is the lowest-value item on the list, and is
   adopted anyway.** The branded `AppliedPath` is excellent value: it
   turns "someone forgot to validate this path" into a compile error, for
   the cost of one `unique symbol`. The TOCTOU re-validation is not:
   exploiting it needs an attacker with write access to the project
   directory during the sub-second write window, and such an attacker can
   simply write the file themselves. It is adopted because it is
   genuinely cheap — one `lstat` and one exclusive create per file — but
   its justification is defence-in-depth, **not a modelled threat**. If
   it costs F2 schedule, it is the first thing on this page to cut, and
   cutting it does not reopen S-2.

4. **C-12's cap is priced honestly.** A cap of 32 executables does not
   meaningfully bound blast radius — one executable in the wrong place is
   the whole finding, and 32 is more than any plausible pack needs. Its
   real value is procedural: a pack that wants more has to argue for it.
   Adopted on that basis, not on the security one.

5. **C-15's matcher needs narrowing.** A bare `key` substring
   false-positives on `monkey`, `keyword`, `sortKey`. The regex in §7.6
   drops bare `key` and matches `api[_-]?key` and `private[_-]?key`
   instead, keeping `secret|token|passwo?rd|credential|connection.?string`.
   The deeper point is worth recording: the *right* answer to secrets is
   a `type: 'secret'` that is prompted, used and never recorded — and
   that is incompatible with `update` re-rendering from recorded answers
   (F1.8 item 1), so **v1.0 forbids credentials rather than supporting
   them halfway**, which is the honest position.

6. **C-2 gates on `permissions.deny`, which is monotonically
   restrictive.** A pack can only *add* to `deny` under union merge, and
   an added deny is safety-increasing; gating on it is the weakest part
   of the condition. Adopted unchanged all the same — disclosing and
   gating every security-relevant key is one rule, and a per-key gate
   policy would be a second table for a benefit that rounds to nothing.
   Recorded as a known, accepted cost.

7. **S-7's fix is strengthened, not adopted as written.** "Reject a
   substituted value containing a line that would lex as a marker" is
   under-specified for the general case (a value can also *truncate* a
   line, or complete a marker begun by the surrounding template). §7.3
   bans line breaks in a substituted value outright, which is the
   *sufficient* condition, and keeps the lex check as the second half.

8. **The threat model is stated so the scope is arguable rather than
   assumed** (§7.0). Under it, the authoring-time checks — C-1, C-5, C-6,
   C-8, C-12, C-15, C-16, C-18 — are where the value is: they run in CI,
   cost nothing at apply, and stop the bad pack from existing. That is
   also why the hook decision is a *format* decision and not a *consent*
   decision: the cheapest way to be safe about hooks is not to have a
   route for them.

### 8.3 One inconsistency this pass surfaced, for the SpecWriter

F1 §F1.2's worked `coding` pack maps `settings.json` →
`.claude/settings.json` with `ownedKeys: ["permissions.allow"]`. F5
states twice that `coding` ships **"no default permission set"** (its
part 8 assessment, and its comparison table row). Both cannot be true,
and F1.2 claims to be "the coding pack expressed in the format".

**Recommendation: strike the `settings.json` mapping from F1.2's worked
example** and, if an illustration of `merge-json` is still wanted there,
use a non-sensitive destination. F5's statement is about real pack
content; F1.2's is an illustration. Striking it also means **no v1.0 pack
owns a security-relevant key**, which makes the §7.2.2 gate cost exactly
zero at v1.0 while remaining enforced against the format — the outcome
argued for in §Consequences.

---

## 9. Verdict

`PROCEED`
