/**
 * Library entry point. T-0108.
 *
 * **Re-exports exactly `F1-ADR-001`'s public interface contract and
 * nothing else.** Downstream features compile against this file, so a
 * symbol that is not in the contract does not belong here — exporting one
 * makes it a promise nobody agreed to, and removing it later is then a
 * breaking change to a contract it was never part of.
 *
 * This grows as each epic lands its half of the contract, and is
 * **re-checked whenever an epic adds a contract symbol**.
 */

// ── diagnostics (E-01) ──────────────────────────────────────────────────
export {
  CODES,
  CODE_COUNT,
  classOf,
  exitClassFor,
  promotedByStrict,
  severityOf,
  type DiagnosticClass,
  type DiagnosticCode,
  type ExitClass,
  type Severity,
} from './diag/codes.js';

export { MESSAGES, render, renderText, placeholdersOf, missingPlaceholders } from './diag/catalogue.js';

export { escapeLine, escapeValue } from './diag/escape.js';

export {
  DiagnosticBag,
  diagnostic,
  exitCodeFor,
  unfilled,
  type Diagnostic,
  type DiagnosticData,
  type DiagnosticInit,
  type ExitCode,
} from './diag/diagnostic.js';

// ── the command surface (E-01) ──────────────────────────────────────────
export {
  COMMANDS,
  GROUP,
  OWNER,
  WRITES,
  commandList,
  isCommand,
  type Command,
} from './cli/surface.js';

export {
  RESERVED_FLAGS,
  accepts,
  commandsAccepting,
  parsePass1,
  parsePass2,
  type Alias,
  type Aliases,
  type ParseResult,
  type ParsedArgs,
  type ReservedFlag,
} from './cli/flags.js';

export { run, stubbedCommands, type RunResult, type Streams } from './cli/main.js';

// ── authored JSON (E-03) ───────────────────────────────────────────────
export { parseStrictJson, type JsonValue, type ParseStrictResult } from './json/parse-strict.js';

// ── the pack declaration (E-03) ────────────────────────────────────────
export {
  ANATOMY_PART_IDS,
  ANATOMY_STATUSES,
  BOOLEAN_TYPED_FIELDS,
  PARAMETER_TYPES,
  type AnatomyDecl,
  type AnatomyPartId,
  type AnatomySource,
  type AnatomyStatus,
  type PackJson,
  type ParameterDecl,
  type ParameterType,
  type Provenance,
  type ScaffoldDecl,
} from './pack/types.js';

export {
  MAX_LENGTH_CEILING,
  MAX_LENGTH_DEFAULT,
  PATTERN_MAX_SOURCE,
  validatePackJson,
  type ValidatePackResult,
} from './pack/schema.js';

// ── confinement (E-02) ──────────────────────────────────────────────────
export {
  collisionKey,
  confinePath,
  isConfinable,
  reservedDestination,
  type AppliedPath,
  type ConfineContext,
  type ConfineResult,
  type ReservedHit,
} from './security/confine.js';

export {
  confineAtWrite,
  confineResolved,
  isStrictDescendant,
  resolveRoot,
  type ProjectRoot,
  type ResolveResult,
  type RootResult,
} from './security/resolve.js';

export {
  HARNESS_ROOT,
  harness,
  harnessPath,
  isHarnessOwned,
  payloadPath,
  type HarnessPath,
  type PayloadResult,
  type WritablePath,
} from './security/harness-paths.js';

export {
  MAX_DEPTH,
  MAX_ENTRIES,
  SCAN_SKIP,
  walk,
  type WalkEntry,
  type WalkOptions,
  type WalkResult,
} from './fs/walk.js';

// ── pack resolution (E-01) ──────────────────────────────────────────────
export { packDir, packsDir } from './paths.js';

/**
 * DELIBERATELY ABSENT, so the omissions read as decisions:
 *
 *   - `DESCRIPTIVE_SLOTS` — a record of a gap in F1's message templates,
 *     not a contract symbol. Internal to `catalogue.ts`.
 *   - `ALL_CODES` — a test convenience over `CODES`, not part of the
 *     interface.
 *   - `DENYLIST` — exported from `confine.ts` for its drift guard only.
 *     The denylist's *members* are F1's; a consumer wanting to know what
 *     is reserved asks `reservedDestination`, not the table.
 *   - Anything under `src/cli/main.ts` beyond `run` — the stub note and
 *     its helpers are development-time and must not become a promise.
 */
