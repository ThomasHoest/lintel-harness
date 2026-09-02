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

// ── `harness init` (F2, E-20/E-21) ─────────────────────────────────────
//
// `F2-ADR-003`'s contract. **`resolveAnswers` is re-exported under a
// different name**, and the rename is the honest half of a collision
// rather than a preference: `pack/parameters.ts` already exports a
// `resolveAnswers` — F1's, which resolves *supplied* answers against
// declarations and knows nothing about a prompt — and F2's ADR named its
// six-step ordered function the same thing. Two exports of one name is not
// expressible; renaming the newer one keeps F1's contract symbol stable
// and makes the difference visible at every call site.
export { CLI_VERSION } from './cli/version.js';
export {
  resolveAnswers as resolveInitAnswers,
  type AnswerInputs,
  type PromptFn,
  type ResolvedAnswers as ResolvedInitAnswers,
} from './cli/answers.js';
export {
  PROMPT_TEXT,
  interpret,
  isInteractive,
  makePrompt,
  promptQuery,
  type PromptStreams,
} from './cli/prompt.js';
export { SUMMARY_TEXT, summaryLines as initSummaryLines, type KeptPath, type SummaryInput } from './cli/summary.js';
export {
  INIT_TEXT,
  initOptions,
  runInit,
  type InitDeps,
  type InitOptions,
} from './cli/commands/init.js';

// ── `harness skill install` (F6, E-26) ─────────────────────────────────
//
// `F6-ADR-005`'s file plan gives F6 exactly one non-Markdown deliverable,
// and this is it. The destination is exported because it is the one thing
// a seam test can assert without re-deriving it — E-27's `skill install is
// confined` test is about *where* this writes.
export { SKILL_INSTALL_DIR, runSkillCommand, type SkillResult } from './cli/commands/skill.js';

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
  checkAnatomy,
  incompleteParts,
  type AnatomyResult,
  type AnatomyRow,
} from './pack/anatomy.js';

export {
  MAX_LENGTH_CEILING,
  MAX_LENGTH_DEFAULT,
  PATTERN_MAX_SOURCE,
  validatePackJson,
  type ValidatePackResult,
} from './pack/schema.js';

export {
  compareSemver,
  parseSemver,
  satisfiesFloor,
  type Semver,
} from './semver/compare.js';

export {
  MAX_PATTERN_LENGTH,
  matchGlob,
  matchesAny,
  selectPaths,
  unusedPatterns,
} from './recipe/glob.js';

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

export {
  COMMON_STEP_FIELDS,
  EDITING_OPS,
  MAX_RECIPE_STEPS,
  PLACING_OPS,
  RECIPE_OPS,
  STEP_BOOLEAN_FIELDS,
  STEP_FIELDS,
  SUPPORTED_RECIPE_FORMAT_VERSION,
  isEditing,
  isPlacing,
  type Recipe,
  type RecipeOp,
  type RecipeStep,
  type StepWhen,
} from './recipe/types.js';

export {
  MANIFEST_KEYS,
  MANIFEST_PACK_KEYS,
  MANIFEST_PATH,
  SUPPORTED_MANIFEST_VERSION,
  manifestFile,
  type ManifestPack,
  type PackManifest,
  type UnknownKeys,
} from './manifest/types.js';
export { canonicalJson } from './manifest/canonical-json.js';
export { writeManifest } from './manifest/write.js';
export {
  readManifest,
  type ReadManifestContext,
  type ReadManifestResult,
} from './manifest/read.js';

export { fileHash, payloadDigest, payloadDigestOfDir } from './payload/digest.js';
export {
  MAX_FILE_BYTES,
  MAX_PAYLOAD_BYTES,
  PAYLOAD_DIR_MODE,
  PAYLOAD_FILE_MODE,
  planPayloadCopy,
  type PayloadEntry,
  type PayloadPlan,
  type PlannedCopy,
} from './payload/copy-payload.js';
export {
  checkPayloadClaudeFiles,
  checkRenderedClaudeFiles,
  type PayloadFile,
  type RenderedFile,
} from './security/claude-gate.js';
export { DIR_MODE, atomicWrite, ensureDir, writePlain, type WriteRequest } from './fs/atomic-write.js';
export {
  JOURNAL_VERSION,
  backupPathFor,
  buildJournal,
  readJournal,
  rollbackCommandFor,
  type Journal,
  type JournalEntry,
  type JournalIntent,
  type PlannedWrite,
} from './fs/journal.js';
export {
  STALE_AFTER_MS,
  decideLock,
  lockContents,
  readLock,
  type LockDecision,
  type LockFile,
} from './fs/lock.js';
export {
  readPackPayload,
  validatePack,
  validatePackByName,
  type PackReport,
} from './validate/validate-pack.js';
export { parameterVaryingSteps } from './validate/combinations.js';
export { runValidate, validateJson } from './cli/commands/validate.js';
export { packInfoJson, renderPackInfo } from './cli/commands/pack-info.js';

export {
  DISPOSITIONS,
  KEPT_DISPOSITIONS,
  WRITING_DISPOSITIONS,
  classifyPaths,
  countByDisposition,
  keptEntries,
  type ClassifyInput,
  type Disposition,
  type UpdateEntry,
} from './update/classify.js';
export {
  checkUpdateGates,
  planUpdate,
  resolveTargetVersion,
  resolveUpdateInputs,
  type GateResult,
  type UpdatePlan,
  type UpdatePlanInput,
  type VersionVerdict,
} from './update/plan-update.js';

// ── `harness update` — the write path and the report (F3, E-24/E-25) ───
//
// `F3-ADR-004`'s contract names `planUpdate` and `runUpdate`; the rest of
// this block is what those two are built from, and each symbol is here
// because something outside `src/update/` reads it. **`journalPresent` is
// the one worth naming**: every command in the group raises
// `E-JOURNAL-PRESENT`, none of them may spell the command name itself, and
// exporting the single renderer is what stops the wrong-command bug F3-R3
// fixed from coming back one call site at a time.
export {
  executeUpdate,
  type UpdateWriteInputs,
  type UpdateWriteResult,
} from './update/execute-update.js';
export {
  journalPresent,
  performRollback,
  type RollbackIo,
  type RollbackOutcome,
} from './update/rollback-update.js';
export {
  EXCERPT_LINE_CAP,
  REPORTED_DISPOSITIONS,
  REPORT_TEXT,
  excerptOf,
  reportLines as updateReportLines,
  updateAvailable,
  updateExitCode,
  updateJson,
  type Excerpt,
  type ExpectedNewEncoding,
  type ReportMode,
  type UpdateJson,
  type UpdateJsonEntry,
} from './update/report.js';
export {
  UPDATE_TEXT,
  runUpdate,
  updateOptions,
  type UpdateDeps,
  type UpdateOptions,
} from './cli/commands/update.js';

export { renderPhase2, type Phase2Inputs, type Phase2Result, type RenderedOutput } from './apply/plan-phase2.js';
export { planApply, type ApplyInputs, type ApplyPlan, type PlannedFile } from './apply/plan.js';
export { executeApply, type ExecuteInputs, type ExecuteResult } from './apply/execute.js';
export {
  checkTargets,
  preExistingByKey,
  type ExistingFile,
  type TargetCheck,
} from './apply/target-exists.js';
export {
  keptPaths,
  planRollback,
  type RollbackAction,
  type RollbackDecision,
  type RollbackPlan,
} from './apply/rollback.js';
export {
  NON_FAILING_STATES,
  VERIFY_STATES,
  compareOne,
  contentEqual,
  countByState,
  failingEntries,
  type CompareInput,
  type VerifyEntry,
  type VerifyState,
} from './verify/compare.js';
export {
  emptyBag,
  reportableFailures,
  summaryLines,
  toJson,
  verifyExitCode,
  type VerifyJson,
} from './cli/commands/verify.js';
export {
  verifyProject,
  type RecomputedPath,
  type VerifyInput,
  type VerifyResult,
} from './verify/verify.js';

export { OPS, renderStep, type OpEntry } from './recipe/ops/index.js';
export { renderCopy } from './recipe/ops/copy.js';
export { renderRename } from './recipe/ops/rename.js';
export { renderStripSuffix } from './recipe/ops/strip-suffix.js';
export { renderRewritePath } from './recipe/ops/rewrite-path.js';
export { renderSubstitute, substituteText } from './recipe/ops/substitute.js';
export { renderGenerate } from './recipe/ops/generate.js';
export {
  type FileMode,
  type RenderContext,
  type RenderResult,
  type Substitution,
  type Write,
} from './recipe/render.js';
export { CLOSING_LINE, checkAnchors, openingLine } from './recipe/anchors.js';
export {
  MAX_EXECUTABLES,
  checkExecutableCap,
  checkExecutablePaths,
  checkExecutableRoots,
  forbiddenReason,
} from './recipe/executable.js';
export {
  BINARY_SNIFF_BYTES,
  decodeText,
  isBinary,
  isValidUtf8,
  normalizeText,
} from './hash/normalize.js';
export { SHA256_HEX_LENGTH, hashBytes, hashText } from './hash/sha256.js';
export { isTreeDigest, treeDigest, type TreeDigest, type TreeEntry } from './hash/digest.js';
export { usageOf, validateRecipe, type ValidateRecipeResult } from './recipe/schema.js';
export { stepWriteSet, unionWriteSets, type WriteSetInput, type WriteSetResult } from './recipe/write-set.js';
export { planSteps, type Plan, type PlanInput, type PlannedStep } from './recipe/plan-steps.js';

export {
  PACK_NAME_RE,
  SUPPORTED_FORMAT_VERSION,
  bundledPackNames,
  checkCliFloor,
  loadPack,
  type LoadedPack,
  type LoadResult,
} from './pack/load-pack.js';

export {
  checkScaffoldCollisions,
  parametersFor,
  selectScaffolds,
  selectedIds,
  type Selection,
  type WriteSets,
} from './pack/scaffolds.js';

export {
  MAX_COMBINATIONS,
  aliasesFor,
  checkAnswer,
  checkParameterSet,
  checkRecordedAnswers,
  checkWhenParameters,
  combinations,
  resolveAnswers,
  type Answer,
  type Occasion,
  type WhenValues,
} from './pack/parameters.js';

export {
  SECRET_NAME_PATTERN,
  declarationLooksSecret,
  valueLooksSecret,
} from './security/secret-heuristic.js';

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
