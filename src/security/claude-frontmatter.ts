/**
 * The `.claude/` permission surface. T-0801 (the reader) and T-0802 (the pin).
 *
 * F1 US-3 states the rule as a **property**, and this module is the whole
 * of it:
 *
 *   **A pack-written file under `.claude/` may not declare a permission
 *   decision.**
 *
 * Everything below exists to express that property against a contract this
 * project does not own — the Claude Code runtime's frontmatter — without
 * admitting a YAML engine into the process that computes a security gate.
 *
 * ── Why a hand-rolled reader (T-0801, Q-81) ───────────────────────────
 *
 * A full YAML parser resolves anchors, aliases, merge keys and tags, and
 * it is a large amount of code running over untrusted pack content
 * **inside the process that decides whether to refuse that pack**. This
 * reader answers one question — *which top-level keys does this block
 * declare, and on which line* — and is small enough to read in one
 * sitting. It also has no dependency to keep current, which is Q-81.
 *
 * ── Three properties the reader must have, and why each one matters ───
 *
 *   REPORTS A LINE     `E-CLAUDE-TOOL-GRANT` and `E-CLAUDE-PERMISSION-MODE`
 *                      both name `line` in their message. A finding a user
 *                      cannot locate is a finding they will not act on.
 *   VERBATIM BLOCK     US-13 row 4 prints the whole frontmatter block, and
 *                      a **re-serialised** block is not the block: it is
 *                      this reader's opinion of it. The disclosure's entire
 *                      value is showing what is actually there, so the
 *                      block is sliced out of the source text and never
 *                      rebuilt from `entries`.
 *   FAILS CLOSED       See below. This is the one that would break silently.
 *
 * ── Failing closed on a block this reader cannot parse ────────────────
 *
 * The reader recognises a **block mapping with top-level `key: value`
 * lines**, which is what every real agent, command and skill file is. YAML
 * has other ways to say the same thing:
 *
 *     {allowed-tools: Bash}          a flow mapping on one line
 *     ? allowed-tools                an explicit key
 *     : Bash
 *     "allowed-tools": Bash          a quoted key
 *     <<: *base                      a merge key pulling in an anchor
 *
 * A line-oriented reader sees none of those as a key. If it then reported
 * *"no permission keys here"*, the gate would **pass a file that grants
 * `Bash`** — and it would do so silently, which is the worst available
 * outcome for a control that exists because pack content is untrusted.
 *
 * So an unrecognised top-level line marks the whole block `wellFormed:
 * false`, and `claudeFrontmatterFindings` then falls back to a **raw token
 * scan of the block text** for every pinned spelling, ignoring structure
 * entirely. The failure mode reverses: instead of missing a key hidden in
 * a construct the reader does not model, it over-reports a key mentioned
 * anywhere inside a block it could not read. That is loud, locatable and
 * fixable in one line of the pack — F1's own argument for pinning mode
 * *values* fail-closed, applied to the reader.
 *
 * **If you relax this, say what you replaced it with.** Making the reader
 * return an empty entry list for an unparsed block turns every construct
 * above into a bypass of the entire `.claude/` gate.
 */
import { DiagnosticBag } from '../diag/diagnostic.js';
import { decodeText } from '../hash/normalize.js';
import { collisionKey } from './confine.js';

/* ── T-0802: the pin ────────────────────────────────────────────────── */

/**
 * **The one named constant** F1 US-3 requires: *"the CLI carries one named
 * constant holding the key names that express that in the runtime's
 * current contract, with the runtime version the pin was taken against
 * recorded beside it."*
 *
 * ── Two lists and one set, and they fail in opposite directions ───────
 *
 * F1 §F1.9 obligation 13 is explicit that this is deliberate:
 *
 *   KEYS   fail **open**. A permission-bearing key the runtime adds after
 *          the pin is not caught until the pin is updated. The failure is
 *          **silent**, and it is the residual limit F1 records rather than
 *          hides. It is why the normative sentence is a property and this
 *          is only its current spelling.
 *   VALUES fail **closed**. An unrecognised mode value is refused. The
 *          failure is **loud** — a legitimate new mode is rejected at
 *          `validate` time, which is visible, locatable, and fixed by
 *          editing this constant.
 *
 * **That asymmetry is the whole reason a value pin is acceptable here
 * where a tool allowlist was not.** Policing *which tools* a pack may
 * pre-authorize is an allowlist over an open namespace nobody owns, so
 * grant keys are forbidden outright instead. A permission mode is a
 * closed, small set, so it can be enumerated — and the cost of the
 * enumeration going stale is a refusal rather than a silent widening.
 *
 * **Reverse either direction and the control inverts:** accept an
 * unrecognised mode value and a pack widens the envelope of every project
 * it is applied to, with nothing printed anywhere.
 */
export const CLAUDE_PERMISSION_PIN = {
  /**
   * The contract this pin was taken against.
   *
   * **`version` is `null`, and that is a reported gap, not an oversight.**
   * F1 requires *"the runtime version the pin was taken against recorded
   * beside it"*, and neither the F1/F5 spec set nor this repository names
   * a Claude Code version anywhere. Writing a plausible-looking number
   * here would satisfy the sentence and defeat its purpose: the point of
   * recording the version is that a maintainer can tell whether the pin is
   * current, and an invented version answers that question wrongly with
   * full confidence. `null` answers it correctly.
   *
   * **Release obligation (F1 §F1.9 obligation 13):** set `version` before
   * publishing, and re-check all three lists against the runtime's
   * contract at every release.
   */
  runtime: {
    name: 'claude-code',
    version: null,
    takenOn: '2026-09-02',
    /** Where the spelling and value evidence came from, so the next
     *  re-check starts where this one did rather than from memory. */
    observedIn: [
      'F1-spec-pack-format-and-manifest.md §US-3 (grant keys, mode keys, non-widening values)',
      'F5-spec-template-packs.md §Flows 2 (the keys the runtime reads on an agent file)',
      'packs/coding/agents/README.md (permissionMode honoured by some harnesses, ignored by others)',
    ],
  },

  /**
   * **Grant keys — forbidden outright, on any pack-placed `.claude/`
   * file.** A command file's frontmatter is a permission declaration and
   * its `!`-prefixed body lines execute shell underneath it, so a grant
   * key plus an ordinary `copy` is a pack-declared pre-authorization with
   * a host-execution path attached — reached with no new primitive and no
   * rule broken.
   *
   * Spellings, not one spelling: the same decision is written differently
   * in different corners of the runtime's surface, and a pin that names
   * only the kebab-case form is a pin a camel-case file walks past.
   */
  grantKeys: ['allowed-tools', 'allowedTools', 'allowed_tools'],

  /**
   * **Mode keys — permitted only on an agent file, only at a non-widening
   * value.** A mode key is categorically unlike `tools:`: `tools:` is a
   * request made *underneath* the permission engine, which the pack cannot
   * write to at all (US-3 stage 2 reserves the settings files under every
   * `.claude` segment). A mode key **selects the engine's mode**.
   * Collapsing that distinction is exactly how `permissionMode:
   * bypassPermissions` on an agent declaring `Bash` was through v2.4
   * neither refused nor shown (C-40).
   */
  modeKeys: ['permissionMode', 'permission-mode', 'permission_mode'],

  /**
   * **The non-widening mode values at the pin.** These leave the runtime's
   * default envelope unchanged or narrow it. Every other value —
   * `bypassPermissions` first among them — is widening and is refused,
   * **as is any value not on this list**, which is the fail-closed half.
   */
  nonWideningModes: ['readonly', 'default', 'plan', 'acceptEdits'],
} as const;

/** What `E-CLAUDE-PERMISSION-MODE`'s `{modes}` renders. Verbatim and in
 *  pin order — the message tells the author what to type, so it must not
 *  be sorted, folded or abbreviated. */
export const PERMITTED_MODES = CLAUDE_PERMISSION_PIN.nonWideningModes.join(', ');

export type PermissionKeyKind = 'grant' | 'mode';

/**
 * Fold a frontmatter key for comparison against the pin.
 *
 * **Deliberately wider than the pin's literal spellings**: case is dropped
 * and `-`/`_` are removed, so `Allowed-Tools`, `ALLOWED_TOOLS` and
 * `allowedtools` all match. The pin lists what the runtime documents; this
 * fold covers what a pack author might write while plainly meaning the
 * same thing.
 *
 * **The direction is the safe one.** A wider fold can only refuse *more*
 * pack content, and every extra refusal is a pack file that spells a
 * permission key oddly — a one-line problem its author can see. A narrower
 * fold would let one through, and nothing would print.
 */
function foldKey(key: string): string {
  return key.toLowerCase().replaceAll('-', '').replaceAll('_', '');
}

const GRANT_FOLDED = new Set(CLAUDE_PERMISSION_PIN.grantKeys.map(foldKey));
const MODE_FOLDED = new Set(CLAUDE_PERMISSION_PIN.modeKeys.map(foldKey));

/** Which family a frontmatter key belongs to, or `null` for a key that
 *  expresses no permission decision at the pin. */
export function permissionKeyKind(key: string): PermissionKeyKind | null {
  const folded = foldKey(key);
  if (GRANT_FOLDED.has(folded)) return 'grant';
  if (MODE_FOLDED.has(folded)) return 'mode';
  return null;
}

/**
 * Is this mode value one the pin permits?
 *
 * **Exact, case-sensitive, no folding** — the opposite of `foldKey`, and
 * the asymmetry is the fail-closed rule made mechanical. A key we fold
 * generously gets *caught*; a value we fold generously gets *permitted*.
 * `ReadOnly` is therefore unrecognised and refused, which costs a pack
 * author one visible diagnostic and costs a user nothing.
 */
export function isNonWideningMode(value: string): boolean {
  return (CLAUDE_PERMISSION_PIN.nonWideningModes as readonly string[]).includes(value);
}

/* ── path predicates ────────────────────────────────────────────────── */

/**
 * Does this path sit under a `.claude` tree?
 *
 * **Any segment, never the first only** (C-33's scoping, applied to
 * `.claude` by C-39b). F1 asserts normatively that the runtime reads a
 * `.claude/` tree wherever it finds one, so `docs/.claude/commands/x.md`
 * is read exactly as a root-level file is. Anchoring this at the root
 * would re-create, in a rule written after C-33 was found, the defect
 * C-33 was.
 */
export function isClaudePath(path: string): boolean {
  return path.split('/').some((s) => collisionKey(s) === collisionKey('.claude'));
}

/**
 * Is this the one file kind that may carry a mode key — a
 * `.claude/agents/<name>.md`?
 *
 * Requires `agents` **immediately** inside a `.claude` segment, the file
 * **immediately** inside that, and a `.md` extension. Narrow on purpose:
 * anything this predicate rejects is treated as a non-agent file, where a
 * mode key is `E-CLAUDE-TOOL-GRANT` outright. Being wrong here therefore
 * over-refuses rather than admitting a mode key on a file the runtime
 * would not have read as an agent anyway.
 */
export function isAgentFile(path: string): boolean {
  const segs = path.split('/').map(collisionKey);
  const md = collisionKey('.md');
  for (let i = 0; i + 2 < segs.length; i += 1) {
    if (
      segs[i] === collisionKey('.claude') &&
      segs[i + 1] === collisionKey('agents') &&
      i + 2 === segs.length - 1 &&
      (segs[i + 2] as string).endsWith(md)
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Is this a file shipped under a `hooks/` directory inside a `.claude`
 * tree — US-13's disclosure row 2?
 *
 * `hooks` anywhere below a `.claude` segment, not only immediately below:
 * the row's promise is that nothing registered runs, and a reader scanning
 * for hook scripts is not helped by a rule that misses
 * `.claude/agents/hooks/x.sh`.
 */
export function isClaudeHookFile(path: string): boolean {
  const segs = path.split('/').map(collisionKey);
  const claude = segs.indexOf(collisionKey('.claude'));
  if (claude < 0) return false;
  const hooks = segs.indexOf(collisionKey('hooks'), claude + 1);
  return hooks > claude && hooks < segs.length - 1;
}

/* ── T-0801: the reader ─────────────────────────────────────────────── */

export interface FrontmatterEntry {
  /** The key exactly as written, for the diagnostic's `{key}`. */
  readonly key: string;
  /** Everything after the colon, unquoted and comment-stripped. */
  readonly value: string;
  /** 1-based, in the file. */
  readonly line: number;
}

export interface FrontmatterFault {
  readonly reason: string;
  readonly line: number;
}

export interface Frontmatter {
  /** False when the file does not open with a `---` fence. */
  readonly present: boolean;
  /**
   * The block **verbatim**, fences included, sliced from the source text.
   *
   * Fences included because US-13 promises the *whole* block: a reader
   * shown three keys with no `---` around them cannot tell a frontmatter
   * block from a quotation of one. Never rebuilt from `entries` — see the
   * module header.
   */
  readonly block: string;
  /** 1-based line of the opening fence; 0 when `present` is false. */
  readonly startLine: number;
  /** Top-level `key: value` declarations, in source order. */
  readonly entries: readonly FrontmatterEntry[];
  /** False when any top-level line was not understood, or the block was
   *  never closed. Callers must fail closed on it. */
  readonly wellFormed: boolean;
  readonly faults: readonly FrontmatterFault[];
}

const ABSENT: Frontmatter = {
  present: false,
  block: '',
  startLine: 0,
  entries: [],
  wellFormed: true,
  faults: [],
};

/** A fence: `---`, or YAML's `...` end-of-document marker. Trailing
 *  whitespace tolerated, because tolerating it finds a block where a
 *  stricter rule would find none — and finding one is the scanning
 *  direction. */
const FENCE = /^(?:---|\.\.\.)[ \t]*\r?$/;

/** A top-level key. Anchored at column 0: an indented line belongs to the
 *  value above it (`description: >` and its continuation), and a key
 *  nested inside another mapping is not a key the runtime reads. */
const KEY_LINE = /^([A-Za-z0-9][A-Za-z0-9_.-]*)[ \t]*:(?:[ \t]+(.*))?[ \t]*\r?$/;

/** Blank, or a comment. Both carry no declaration. */
const INERT_LINE = /^[ \t]*(?:#.*)?\r?$/;

/** Indented: a continuation of the value above, or a nested mapping. */
const CONTINUATION_LINE = /^[ \t]/;

/**
 * Read the frontmatter block of a Markdown file.
 *
 * Takes text rather than bytes so the caller decides the decoding policy
 * once; `readFrontmatterBytes` is the decoding wrapper.
 */
export function readFrontmatter(text: string): Frontmatter {
  // A UTF-8 BOM before the fence: stripped for *detection* only. The block
  // slice still starts at the fence, so nothing invisible reaches the
  // disclosure — and refusing to see a fence behind a BOM would have made
  // one byte turn the gate off.
  const bom = text.startsWith('﻿') ? 1 : 0;
  const body = text.slice(bom);

  const lines = body.split('\n');
  if (lines.length === 0 || !FENCE.test(lines[0] as string)) return ABSENT;

  const faults: FrontmatterFault[] = [];
  const entries: FrontmatterEntry[] = [];

  let end = -1;
  for (let i = 1; i < lines.length; i += 1) {
    if (FENCE.test(lines[i] as string)) {
      end = i;
      break;
    }
  }

  // FAIL CLOSED, part one. An unterminated block is not "no frontmatter":
  // the whole file is then ambiguous, so the whole file is treated as the
  // block and scanned. A pack cannot escape the gate by deleting a fence.
  const unterminated = end < 0;
  /** Where the *scan* stops. On an unterminated block it is the end of the
   *  file: every line after an unclosed fence is a line the runtime might
   *  read as frontmatter, so every line is scanned. */
  const scanEnd = unterminated ? lines.length : end;
  if (unterminated) faults.push({ reason: 'the block is never closed', line: 1 });

  for (let i = 1; i < scanEnd; i += 1) {
    const raw = lines[i] as string;
    if (INERT_LINE.test(raw)) continue;
    if (CONTINUATION_LINE.test(raw)) continue;

    const m = KEY_LINE.exec(raw);
    if (m !== null) {
      entries.push({
        key: m[1] as string,
        value: cleanValue(m[2] ?? ''),
        line: i + 1,
      });
      continue;
    }

    // FAIL CLOSED, part two. See the module header: a construct this
    // reader does not model must not read as "nothing declared here".
    faults.push({ reason: 'a line this reader cannot parse', line: i + 1 });
  }

  // The verbatim slice: through the closing fence, or the whole file when
  // there is none. Sliced from `text`, never rebuilt from `entries`.
  const blockStart = bom;
  const blockEnd =
    blockStart + lines.slice(0, unterminated ? lines.length : end + 1).join('\n').length;

  return {
    present: true,
    block: text.slice(blockStart, blockEnd),
    startLine: 1,
    entries,
    wellFormed: faults.length === 0,
    faults,
  };
}

/**
 * Read frontmatter from file bytes, or `null` for content that is not text.
 *
 * Binary and invalid UTF-8 return `null` rather than an empty
 * `Frontmatter`: the runtime does not read such a file as an agent or a
 * command either, and `null` makes the caller say which it means instead
 * of inheriting "no keys found" from a decode failure.
 */
export function readFrontmatterBytes(bytes: Buffer): Frontmatter | null {
  const text = decodeText(bytes);
  return text === null ? null : readFrontmatter(text);
}

/**
 * A scalar value as YAML would read it, for the two things we do with it:
 * compare against the pinned mode set, and print it in a diagnostic.
 *
 * Strips a ` #` comment and one layer of matching quotes. **Both make the
 * value more likely to be *accepted***, so both are bounded: quotes are
 * removed only when they wrap the whole value, and a comment only when
 * introduced by whitespace-then-hash, which is YAML's own rule. Anything
 * else — a tag, an anchor, a flow sequence — survives intact and is
 * therefore unrecognised, which is the refusing direction.
 */
function cleanValue(raw: string): string {
  let v = raw.replace(/\s+#.*$/, '').trim();
  if (v.length >= 2) {
    const q = v[0] as string;
    if ((q === '"' || q === "'") && v.endsWith(q)) v = v.slice(1, -1);
  }
  return v;
}

/* ── the rule, in one place ─────────────────────────────────────────── */

/**
 * Every permission finding for **one** file under a `.claude` segment.
 *
 * **This is the whole of F1's three-sentence gate, and it lives here once
 * so the two quantifiers cannot drift.** C-39c's finding was that the rule
 * held over the write set and not over the phase-1 payload set; a rule
 * implemented twice would have re-created exactly that. T-0803 chooses the
 * sets and the bytes; it does not restate the rule.
 *
 *   - a **grant key**, anywhere under a `.claude` segment
 *       → `E-CLAUDE-TOOL-GRANT`
 *   - a **mode key on a non-agent file** — a command, a skill, anything
 *     else → `E-CLAUDE-TOOL-GRANT`; a command file has no business
 *     selecting a permission mode
 *   - a **mode key on an agent file**, value on the pinned non-widening
 *     set → permitted, and **disclosed** by US-13 row 4
 *   - a **mode key on an agent file**, any other value, widening **or
 *     unrecognised** → `E-CLAUDE-PERMISSION-MODE`
 *
 * `path` is the path to *name*, which is not always the path the bytes
 * came from: over the phase-1 quantifier the destination is
 * `.harness/pack/…`, and naming the pack-relative source instead would
 * send an author looking for a file the message did not describe.
 *
 * ── GAP: T-0803 is not built ──────────────────────────────────────────
 *
 * **Nothing calls this yet.** T-0803 is the gate — the two quantifiers
 * that decide *which files* this runs over — and it depends on T-0605
 * (`src/payload/copy-payload.ts`), which does not exist. What it owes:
 *
 *   1  **the write set**, over **rendered** bytes, at US-16 step 11. A
 *      later `substitute` or `rewrite-path` can introduce or complete the
 *      key, so checking payload sources would check the wrong bytes.
 *   2  **the phase-1 payload set**, over **payload bytes**, at US-16
 *      step 3. Phase 1 transforms nothing and skips no file, so a
 *      `.claude/` subtree a pack merely ships lands live at
 *      `.harness/pack/.claude/`.
 *
 * **Two disjoint sets, never one widened set** (C-39c). Both call this
 * function; neither restates the rule.
 */
export function claudeFrontmatterFindings(path: string, text: string): DiagnosticBag {
  const bag = new DiagnosticBag();
  if (!isClaudePath(path)) return bag;

  const fm = readFrontmatter(text);
  if (!fm.present) return bag;

  const agent = isAgentFile(path);
  for (const entry of fm.wellFormed ? fm.entries : rawScan(fm)) {
    const kind = permissionKeyKind(entry.key);
    if (kind === null) continue;

    if (kind === 'grant' || !agent) {
      bag.add('E-CLAUDE-TOOL-GRANT', {
        path,
        line: entry.line,
        values: { path, key: entry.key, line: String(entry.line) },
      });
      continue;
    }
    if (!isNonWideningMode(entry.value)) {
      bag.add('E-CLAUDE-PERMISSION-MODE', {
        path,
        line: entry.line,
        values: {
          path,
          value: entry.value,
          line: String(entry.line),
          modes: PERMITTED_MODES,
        },
      });
    }
  }
  return bag;
}

/**
 * The fail-closed fallback: find every pinned spelling **anywhere** in a
 * block the reader could not parse, ignoring structure.
 *
 * Structure is exactly what is untrustworthy here — the block used a
 * construct this reader does not model, so "top-level" has no meaning we
 * can defend. A token match is crude and that is the point: it cannot be
 * evaded by a construct, only by not mentioning the key at all.
 *
 * A mode key found this way yields **no value**, which is unrecognised,
 * which refuses. That is correct: we could not read the block, so we
 * certainly cannot certify that the mode it selects is non-widening.
 *
 * `key` is the **pinned** spelling rather than the file's, because on this
 * path there is no parsed key to quote — the diagnostic names the decision
 * the pack appears to be making, and the line number is what locates it.
 */
function rawScan(fm: Frontmatter): readonly FrontmatterEntry[] {
  const found: FrontmatterEntry[] = [];
  const lines = fm.block.split('\n');
  const spellings = [
    ...CLAUDE_PERMISSION_PIN.grantKeys,
    ...CLAUDE_PERMISSION_PIN.modeKeys,
  ];
  for (let i = 0; i < lines.length; i += 1) {
    const folded = foldKey(lines[i] as string);
    for (const spelling of spellings) {
      if (!folded.includes(foldKey(spelling))) continue;
      // The line number is the block's own, and the block starts at line 1
      // of the file by construction — frontmatter is the first thing in it.
      found.push({ key: spelling, value: '', line: i + 1 });
      break;
    }
  }
  return found;
}
