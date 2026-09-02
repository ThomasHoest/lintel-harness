/**
 * The security disclosure. T-0804 (the builder and the renderer) and
 * T-0806 (the nonce and its containment check, C-49/C-59/C-61/C-62 — the
 * CRITICAL).
 *
 * ── What this module is not ───────────────────────────────────────────
 *
 * **There is no consent gate, and this file is named for one that was
 * deleted** (Q-54, US-13). `requiresConsent`, `ConsentInputs`,
 * `--accept-permissions`, `--accept-hooks`, `E-SETTINGS-CONSENT-REQUIRED`
 * and the settings row are **gone** — the ADR's contract declares all six;
 * do not compile against them. The only thing that ever required consent
 * was a value landing under a security-relevant settings key, and no pack
 * can write a settings file at all (US-3 stage 2 reserves them under every
 * `.claude` segment). **A gate that cannot fire is a claim, not a
 * control.**
 *
 * **The disclosure enumerates and never gates.** Gating on it would fire a
 * prompt on every apply of all three v1.0 packs, which trains a user to
 * accept without reading — C-28's argument, C-12's shape.
 *
 * ── One builder, three surfaces ───────────────────────────────────────
 *
 * `buildDisclosure` is called **once, by the pure planner**. `init`'s
 * pre-write summary, `pack info` and `validate --json` all render *that*
 * object. No surface computes a row of its own, which is the only reason
 * the three cannot disagree — and it is asserted structurally, not by
 * convention (T-0805).
 *
 * ── Four rows, and no classifier anywhere ─────────────────────────────
 *
 *   1  every `0755` applied path, with the payload path it comes from
 *   2  every file shipped under a `hooks/` directory in any `.claude`
 *      tree, each stated plainly as inert
 *   3  **every** applied path at which a parameter answer was
 *      substituted, with the id and the value verbatim
 *   4  every pack-shipped `.claude/agents/*.md` with its **whole**
 *      frontmatter block verbatim
 *
 * Row 3 is a **total enumeration** (C-43). The three-clause classifier
 * that used to feed it named 3 of `coding`'s 5 applied paths, and the
 * strengthened test that was supposed to catch that passed — so the
 * classifier is **deleted, not repaired a third time**. Row 4 prints the
 * whole block for the same reason one layer over (C-40): printing `tools:`
 * alone hid `permissionMode`, which three `coding` agents declare, and a
 * chosen subset must be re-audited every time the runtime's contract
 * moves.
 *
 * Rows 2 and 4 are quantified over the **union of the write set and the
 * phase-1 payload set** (C-39c). Phase 1 transforms nothing and skips no
 * file, so a `.claude/` subtree a pack merely *ships* lands live, inside
 * the committed project, at `.harness/pack/.claude/`. They stay two sets
 * rather than one widened set: a phase-1 destination is a `HarnessPath`,
 * and widening the write set to cover it would break the brand separation
 * C-14 rests on.
 *
 * ── Where the prose lives, and why it lives here ──────────────────────
 *
 * `DEVELOPING.md` says no user-facing string lives outside `src/diag/`,
 * because F1 makes the **code** the stable contract. A disclosure row has
 * no code: `src/diag/catalogue.ts` is a code→message map re-derived from
 * F1 §Error States on every run, and there is no §Error States row to
 * derive these from. So the prose is here, in one exported table, rather
 * than composed at four call sites — which is the property the rule is
 * actually protecting.
 */
import { randomBytes } from 'node:crypto';
import { DiagnosticBag } from '../diag/diagnostic.js';
import { escapeLine, escapeValue } from '../diag/escape.js';
import type { AppliedPath } from './confine.js';
import type { HarnessPath } from './harness-paths.js';
import type { FileMode, Substitution } from '../recipe/render.js';
import { isAgentFile, isClaudeHookFile, readFrontmatterBytes } from './claude-frontmatter.js';

/* ── the disclosure ─────────────────────────────────────────────────── */

export interface ExecutableRow {
  /** The applied path that would be written `0755`. */
  readonly path: AppliedPath;
  /** The payload path its bytes come from. Row 1 promises both. */
  readonly from: string;
}

export interface InertHookRow {
  /** As it will exist: an applied path, or a phase-1 destination. */
  readonly path: string;
}

export interface SubstitutionRow {
  readonly path: AppliedPath;
  readonly id: string;
  /** Verbatim. Never summarised, never truncated, never counted. */
  readonly value: string;
}

export interface AgentFrontmatterRow {
  readonly path: string;
  /** The whole block, fences included, exactly as the file declares it. */
  readonly frontmatter: string;
}

/**
 * What an apply would do that a user should be told about before it
 * happens. Built once; rendered by three surfaces.
 */
export interface SecurityDisclosure {
  readonly executables: readonly ExecutableRow[];
  readonly inertHooks: readonly InertHookRow[];
  readonly substitutions: readonly SubstitutionRow[];
  readonly agents: readonly AgentFrontmatterRow[];
}

/** One planned phase-2 write, as the renderer produced it. */
export interface DisclosureWrite {
  readonly path: AppliedPath;
  readonly mode: FileMode;
  /**
   * The payload path the bytes came from, or `null` for a step with no
   * source file. Row 1 needs it; `E-EXEC-*` guarantees a `0755` path came
   * from a `copy`, so `null` there would be a planner bug rather than a
   * pack fault, and the row says so rather than silently printing nothing.
   */
  readonly from: string | null;
  /** The **rendered** bytes — what the runtime will actually read. */
  readonly bytes: Buffer;
}

/** One file phase 1 will copy verbatim. */
export interface DisclosurePayloadFile {
  /** Pack-relative POSIX path, as the payload walk found it. */
  readonly packPath: string;
  /** Where it lands: `.harness/pack/<packPath>`. */
  readonly destination: HarnessPath;
  /** The payload bytes. Phase 1 transforms nothing, so these are the
   *  bytes the runtime will read. */
  readonly bytes: Buffer;
}

export interface DisclosureInputs {
  readonly writes: readonly DisclosureWrite[];
  readonly payload: readonly DisclosurePayloadFile[];
  /** From `substitute` and `generate`, which record every resolved
   *  `{{harness:param.<id>}}` as they resolve it. Reconstructing this
   *  afterwards would mean searching output for values, which finds
   *  coincidences. */
  readonly substitutions: readonly Substitution[];
}

/**
 * Build the disclosure. **Pure**: no filesystem, no clock, no randomness.
 *
 * The nonce is deliberately not an input. `pack info --json` renders this
 * object and is a machine contract G-F1-9 rests on, so the object itself
 * must be identical across two runs of the same apply (C-62). Only
 * `emitInitDisclosure` is per-run.
 */
export function buildDisclosure(input: DisclosureInputs): SecurityDisclosure {
  const executables: ExecutableRow[] = [];
  const inertHooks: InertHookRow[] = [];
  const agents: AgentFrontmatterRow[] = [];

  for (const w of input.writes) {
    if (w.mode === 0o755) executables.push({ path: w.path, from: w.from ?? '(generated)' });
    if (isClaudeHookFile(w.path)) inertHooks.push({ path: w.path });
    if (isAgentFile(w.path)) pushAgent(agents, w.path, w.bytes);
  }

  // The second quantifier. Phase 1 is not a widening of the first: these
  // paths carry `HarnessPath`, are matched by `collisionKey` on any
  // `.claude` segment exactly as applied paths are, and are named as they
  // will exist on disk — under `.harness/pack/` — because that is where a
  // reader will find them.
  for (const f of input.payload) {
    if (isClaudeHookFile(f.destination)) inertHooks.push({ path: f.destination });
    if (isAgentFile(f.destination)) pushAgent(agents, f.destination, f.bytes);
  }

  return {
    executables,
    inertHooks,
    // No classifier (C-43). Every recorded substitution, in the order the
    // render produced them.
    substitutions: input.substitutions.map((s) => ({ path: s.path, id: s.id, value: s.value })),
    agents,
  };
}

/**
 * Row 4 for one agent file.
 *
 * A file with no frontmatter, or one that is not text, contributes **no
 * row**: there is no block to print, and inventing an empty one would tell
 * a reader that a file they can see was checked and found bare. The gate
 * (T-0803) is what refuses a permission decision; this row only shows.
 */
function pushAgent(into: AgentFrontmatterRow[], path: string, bytes: Buffer): void {
  const fm = readFrontmatterBytes(bytes);
  if (fm === null || !fm.present) return;
  into.push({ path, frontmatter: fm.block });
}

/* ── rendering ──────────────────────────────────────────────────────── */

/**
 * The section headings and the per-row wording. **One table**, so the
 * three surfaces render identical prose and a change lands in one place.
 *
 * `empty` exists because US-29 requires it: *"where a list is empty the
 * command says so rather than printing nothing."* A section that vanishes
 * when empty is indistinguishable from a section that was never computed.
 */
export const DISCLOSURE_TEXT = {
  executables: {
    heading: 'Files this apply would make executable (0755):',
    empty: '  (none)',
  },
  inertHooks: {
    heading: 'Hook scripts this pack ships:',
    empty: '  (none)',
    // Stated on every line rather than once under the heading. A reader
    // scanning row by row must not be able to take a path here for
    // something that runs — row 2's whole purpose is to say it does not.
    suffix: 'shipped 0644, registered by nothing at v1.0',
  },
  substitutions: {
    heading: 'Applied paths where a parameter answer is written into content:',
    empty: '  (none)',
  },
  agents: {
    heading: 'Agent files this pack places, with their frontmatter verbatim:',
    empty: '  (none)',
  },
} as const;

/**
 * A line of the disclosure, kept as **literal** and **value** parts until
 * the last moment.
 *
 * This is C-58's ordering made structural. The containment scan must run
 * over **raw** bytes and the C-50 escaping must run **after** it — scan
 * the escaped text and the check stops matching the raw sentinel it exists
 * for, while the bytes a consumer reads are unchanged. Keeping the parts
 * apart lets one row assembly produce both the raw form (for the scan) and
 * the escaped form (for the stream), so the two cannot describe different
 * rows.
 */
type Part = { readonly lit: string } | { readonly val: string };

interface Row {
  /** The path `E-DISCLOSURE-FORGERY` names if this row is the offender. */
  readonly path: string;
  readonly parts: readonly Part[];
}

const lit = (s: string): Part => ({ lit: s });
const val = (s: string): Part => ({ val: s });

/** Row order is US-13's table order, and it is the same for every surface:
 *  the table says *"the rows above, in the order this table gives them"*,
 *  and a surface that reorders them is a surface a reader cannot compare
 *  against another. */
function rows(d: SecurityDisclosure): readonly Row[] {
  const out: Row[] = [];
  const section = (heading: string, empty: string, body: readonly Row[]): void => {
    out.push({ path: '', parts: [lit(heading)] });
    if (body.length === 0) out.push({ path: '', parts: [lit(empty)] });
    else out.push(...body);
  };

  section(
    DISCLOSURE_TEXT.executables.heading,
    DISCLOSURE_TEXT.executables.empty,
    d.executables.map((r) => ({
      path: r.path,
      parts: [lit('  0755  '), val(r.path), lit('   from '), val(r.from)],
    })),
  );

  section(
    DISCLOSURE_TEXT.inertHooks.heading,
    DISCLOSURE_TEXT.inertHooks.empty,
    d.inertHooks.map((r) => ({
      path: r.path,
      parts: [lit('  '), val(r.path), lit(`   ${DISCLOSURE_TEXT.inertHooks.suffix}`)],
    })),
  );

  section(
    DISCLOSURE_TEXT.substitutions.heading,
    DISCLOSURE_TEXT.substitutions.empty,
    d.substitutions.map((r) => ({
      path: r.path,
      parts: [lit('  '), val(r.path), lit('   '), val(r.id), lit(' = '), val(r.value)],
    })),
  );

  const agentRows: Row[] = [];
  for (const a of d.agents) {
    agentRows.push({ path: a.path, parts: [lit('  '), val(a.path)] });
    // ONE OUTPUT LINE PER BLOCK LINE, and the block is not joined into a
    // single value first. `escapeValue` turns a line feed into `\n`, which
    // would render a ten-line frontmatter block as one unreadable line —
    // and a block a reader cannot read is a block that was, for practical
    // purposes, truncated. Splitting here keeps the block's shape while
    // still escaping every character C-50 is about, because each part is
    // escaped as a value.
    for (const line of a.frontmatter.split('\n')) {
      agentRows.push({ path: a.path, parts: [lit('    '), val(line)] });
    }
  }
  section(DISCLOSURE_TEXT.agents.heading, DISCLOSURE_TEXT.agents.empty, agentRows);

  return out;
}

/** The raw text of a row: what the containment scan reads, and what a
 *  consumer would read if nothing escaped it. Never written to a stream. */
function raw(r: Row): string {
  return r.parts.map((p) => ('lit' in p ? p.lit : p.val)).join('');
}

/**
 * The **deterministic** rendering: the four sections, escaped, with **no
 * delimiters and no nonce** (C-62).
 *
 * This is what `pack info` and `validate --json` render. `pack info --json`
 * is a machine contract G-F1-9 rests on, so its output must be identical
 * across invocations; putting the nonce here — the obvious way to fold
 * C-59 — would have broken every golden-file test and any consumer diffing
 * two runs.
 *
 * **Already escaped.** Do not pass these lines through `escapeLine` again.
 */
export function renderDisclosure(d: SecurityDisclosure): readonly string[] {
  return rows(d).map((r) =>
    r.parts.map((p) => ('lit' in p ? escapeLine(p.lit) : escapeValue(p.val))).join(''),
  );
}

/* ── T-0806: the nonce, and the containment check ───────────────────── */

/**
 * A per-run disclosure nonce: 128 bits from `node:crypto`, lowercase hex.
 *
 * F1 requires **at least 64 bits**; its illustrative example
 * (`7f3a9c2e`) shows 32, which is the example being loose rather than the
 * floor moving. 128 costs nothing and removes the argument.
 *
 * **Generated once per invocation.** Two nonces in one run would let a
 * consumer that read the begin line fail to match the end line, which is
 * the truncation this mechanism exists to prevent, arriving by the front
 * door.
 */
export function newDisclosureNonce(): string {
  return randomBytes(16).toString('hex');
}

export const beginLine = (nonce: string): string => `--- lintel disclosure begin ${nonce} ---`;
export const endLine = (nonce: string): string => `--- lintel disclosure end ${nonce} ---`;

/**
 * The delimiter **shape**, matched with any nonce value or none (C-61).
 *
 * **Unanchored, and that is the design.** An anchored rule asks *"is this
 * line a delimiter?"*, and the question that matters is *"would a consumer
 * re-sync on something in this line?"* — a substituted answer renders as
 * `  <path>   <id> = <value>`, so a value carrying the marker never sits
 * at the start of a line and an anchored rule would miss every one of
 * them, while `indexOf('--- lintel disclosure end')` in the consumer finds
 * it perfectly well.
 *
 * Deliberately loose in three further ways, each because a *consumer*
 * might be:
 *   - `-{3,}`, since a reader may match a longer rule;
 *   - `\s*` between the dashes and the word, so `---lintel disclosure
 *     end` re-syncs a sloppy regex just as well;
 *   - **nothing after `begin|end` is required** — no nonce, no closing
 *     dashes — so the bare `--- lintel disclosure end ---` of F1 v3.3,
 *     the literal marker the CRITICAL was found against, is refused, and
 *     so is any decorated variant of it.
 *
 * **Over-refusing is the correct direction, and F1 says so:** a pack whose
 * content legitimately resembles the marker has a one-line problem it can
 * see, and the alternative is a control that fails silently.
 *
 * `\s` rather than a hand-rolled ASCII class (C-60): JavaScript's `\s` is
 * the same Unicode set `String.prototype.trim()` removes — `U+00A0`,
 * `U+2003`, `U+3000` — which are the exact characters that beat round 3's
 * rule. **Q-81 forbids dependencies, not correctness**, and reaching for
 * an ASCII class here is `collisionKey`'s documented limit carried into a
 * place its reason does not reach.
 */
const DELIMITER_SHAPE = /-{3,}\s*lintel\s+disclosure\s+(?:begin|end)/;

/** True iff a consumer pattern-matching the delimiter — rather than
 *  matching the exact nonce it was handed — could re-sync on this text and
 *  truncate everything after it. Case-folded, never trimmed: the pattern
 *  is unanchored, so there are no ends to trim. */
export function looksLikeDelimiter(text: string): boolean {
  return DELIMITER_SHAPE.test(text.toLowerCase());
}

/**
 * **The containment check.** `E-DISCLOSURE-FORGERY`, exit 2, zero bytes.
 *
 * ── Why this is not paranoia ──────────────────────────────────────────
 *
 * Row 4 prints whole agent frontmatter blocks verbatim and multi-line. A
 * pack shipping a frontmatter line reading `--- lintel disclosure end ---`
 * truncates the block for **any consumer that reads to the marker** — the
 * user's eye, and F6 under IM-10. Everything after it is invisible: the
 * `0755` paths, the tool grants on agents declared later, the substituted
 * values. **The truncated block stays well-formed, correctly delimited and
 * shorter, and nothing looks wrong.** A delimiter the content it wraps can
 * forge is a convention, not a control — and this control exists precisely
 * because pack content is untrusted, so bounding it by *"the bundled packs
 * are ours"* removes its reason for existing.
 *
 * This is **C-9's marker-lex check, restored**: Q-45 removed it as
 * unnecessary while anchors were inert, and recorded the obligation to
 * bring it back when something started reading markers. F1 v3.3 created
 * such a marker and did not consult the obligation.
 *
 * ── Two refusals, and they close different holes ──────────────────────
 *
 *   THIS RUN'S NONCE  a row containing it. Probabilistically near
 *                     impossible — pack content is fixed before the run
 *                     and the nonce did not exist when the pack was
 *                     authored — which is precisely the security property:
 *                     **a pack cannot forge what it cannot predict.**
 *   THE SHAPE         a row that looks like a delimiter carrying *any*
 *                     nonce. A consumer matching the exact nonce it read
 *                     ignores such a line, correctly; a consumer that
 *                     pattern-matches re-syncs on it and truncates. That
 *                     is a consumer bug, and *"safe provided every reader
 *                     implements it exactly"* is the assumption the whole
 *                     finding was about. It is also what keeps this code
 *                     **reachable**: with the nonce alone the check
 *                     essentially never fires, and a check nobody
 *                     exercises is a check that rots.
 *
 * ── Do not replace this with a matching rule ──────────────────────────
 *
 * Three security rounds tried. Exact match, beaten by a **trailing
 * space**. Trim-and-fold over ASCII, beaten by a **non-breaking space**,
 * because `String.prototype.trim()` removes Unicode whitespace and the
 * rule said ASCII. Each fix made the emitter more liberal and each was
 * beaten by a reader more liberal still — **the emitter cannot enumerate
 * every way a reader might call two strings the same**, and the reader is
 * not obliged to tell it. The nonce changes the property from *"our
 * matching dominates every consumer's"*, which is unfalsifiable, to *"a
 * pack cannot predict a random value"*, which has a name and a test.
 *
 * `nonce` is omitted by `validate` step 11, which emits no block and has
 * no run to bind to; the shape half is what fires there, and it is the
 * half that catches a pack **at authoring time** rather than at apply
 * time.
 *
 * Scanned over **raw rows, before any escaping** (C-58) — see `Part`.
 */
export function scanForForgery(d: SecurityDisclosure, nonce?: string): DiagnosticBag {
  const bag = new DiagnosticBag();
  const needle = nonce?.toLowerCase();

  for (const row of rows(d)) {
    const text = raw(row);
    const hit =
      (needle !== undefined && text.toLowerCase().includes(needle)) || looksLikeDelimiter(text);
    if (!hit) continue;
    // `row.path` is empty for a heading, which the CLI composed and which
    // therefore cannot be a forgery — but reporting *something* beats
    // reporting nothing if a heading ever changes into that shape.
    const path = row.path === '' ? '(disclosure heading)' : row.path;
    bag.add('E-DISCLOSURE-FORGERY', { path, values: { path } });
  }
  return bag;
}

export interface InitDisclosure {
  /** Present **iff** the containment check passed. */
  readonly lines?: readonly string[];
  readonly bag: DiagnosticBag;
}

/**
 * `init`'s delimited stderr block — the **only** place a nonce appears
 * (C-62).
 *
 * The scan is inside this function, and the lines are absent when it
 * fails, so **the block cannot be emitted unscanned**. A caller that
 * "forgot to check first" is not a review finding here; it is an
 * unreachable state.
 *
 * The delimiters are **fixed, versionless and countless** apart from the
 * nonce: a delimiter carrying a version or a row count is one a consumer
 * must know in advance and one an added row invalidates. **A nonce is
 * read, not known** — the consumer takes it from the begin line and
 * matches the end line against what it read, never against a constant — so
 * it creates no compatibility surface and cannot go stale. Nothing is
 * reordered or summarised between the lines, and **nothing else is ever
 * printed between them**, so a capture is the block and only the block.
 */
export function emitInitDisclosure(d: SecurityDisclosure, nonce: string): InitDisclosure {
  const bag = scanForForgery(d, nonce);
  if (bag.errors.length > 0) return { bag };
  return {
    lines: [escapeLine(beginLine(nonce)), ...renderDisclosure(d), escapeLine(endLine(nonce))],
    bag,
  };
}
