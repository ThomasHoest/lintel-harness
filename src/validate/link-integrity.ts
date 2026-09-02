/**
 * US-16 step 13 — link integrity over **rendered** output. T-0904.
 *
 * Every relative Markdown link in the rendered applied output that points
 * at a path **inside the project** must resolve either to a file the
 * recipe produces **or to a path under `.harness/pack/` that exists in the
 * payload**.
 *
 * ── The payload half is load-bearing ──────────────────────────────────
 *
 * Under Q-41 phase 2 reads from the phase-1 copy, so the applied documents
 * legitimately point **into** the payload — `.harness/pack/specifications/…`
 * is a correct reference to a file that will exist. A payload-blind check
 * would flag **every** such reference, which is not a noisy check but an
 * inverted one: it would report the pack's correct references and stay
 * silent about nothing.
 *
 * ── Rendered, not payload ─────────────────────────────────────────────
 *
 * The check runs on the bytes the project gets. A `rewrite-path` step
 * exists precisely to repair references after a copy — step 6 of the
 * manual apply, and the primitive's whole reason for existing — so
 * checking payload sources would report the references that step was
 * added to fix.
 *
 * ── Three narrowings, and why narrowing is the risk control here ──────
 *
 * `W-LINK-DANGLING` is **`defect`** class, so `--strict` — the shipping CI
 * command — makes it **fatal**. A false positive is therefore not noise:
 * it is a finding that blocks a release and that an author can only clear
 * by rewording a sentence. So each narrowing below is stated, closed, and
 * chosen to err toward silence.
 *
 *   1. **Fenced code blocks and inline code spans are not scanned.** A
 *      link inside a fence is being *shown*, not followed —
 *      `writing`'s `bilingual-publishing` guide displays a worked index
 *      entry whose `[…](NN-slug-en.md)` names a file the reader will
 *      create. F1 makes the opposite call for anchors, and says so
 *      (*"an anchor inside a fenced code block is counted"*), because an
 *      anchor is a marker in the byte stream that a fence does not
 *      neutralise. A link is not: following one is meaningless.
 *   2. **A target with no directory separator and no extension is not a
 *      path reference.** `[Title](URL)` in `coding`'s `researcher` agent
 *      is the shape of a source line the agent is being told to *write*,
 *      not a reference this pack makes. The cost is stated: a real link to
 *      an extensionless file at the same directory — `LICENSE`, `Makefile`
 *      — is not checked.
 *   3. **`inline path reference` is not implemented.** US-16 asks for
 *      *"every relative Markdown link **and inline path reference**"*.
 *      There is no closed definition of "text that looks like a path" in
 *      prose, and inventing one under a fatal severity is how a checker
 *      starts reporting sentences. Recorded in the runner's header so a
 *      later pass adds it against a stated definition.
 *
 * Only Markdown files are scanned. Link syntax in a shell script is not a
 * link.
 */
import { DiagnosticBag } from '../diag/diagnostic.js';
import { HARNESS_ROOT } from '../security/harness-paths.js';

/** `[text](target)` — the inline form. The target stops at whitespace so
 *  a `[x](y "title")` title is not read as part of the path. */
const INLINE_LINK = /\[[^\]]*\]\(\s*([^)\s]+)/g;

/** `[id]: target` — the reference-definition form, at the start of a
 *  line. Both forms, because a document may use either and a check that
 *  knew one would be silent on the other. */
const REFERENCE_DEF = /^[ \t]{0,3}\[[^\]]+\]:[ \t]+(\S+)/gm;

/** Extensions this module treats as Markdown. */
const MARKDOWN = ['.md', '.markdown'];

export interface RenderedDoc {
  /** The applied path, as the project will hold it. */
  readonly path: string;
  readonly text: string;
}

export interface LinkIntegrityInput {
  readonly docs: readonly RenderedDoc[];
  /** Every applied path **this combination** writes. */
  readonly produced: readonly string[];
  /** Pack-relative POSIX paths of every payload file. A reference to
   *  `.harness/pack/<p>` resolves against this. */
  readonly payload: readonly string[];
}

export function isMarkdown(path: string): boolean {
  const base = path.slice(path.lastIndexOf('/') + 1).toLowerCase();
  return MARKDOWN.some((ext) => base.endsWith(ext));
}

/**
 * Every dangling reference, in document then line order.
 *
 * The bag is ordered because US-16 fixes the order checks run in, and a
 * reader following a fixed order needs the output to match it.
 */
export function checkLinkIntegrity(input: LinkIntegrityInput): DiagnosticBag {
  const bag = new DiagnosticBag();

  const files = new Set(input.produced);
  const dirs = directorySet(input.produced);
  const payloadFiles = new Set(input.payload);
  const payloadDirs = directorySet(input.payload);

  for (const doc of input.docs) {
    if (!isMarkdown(doc.path)) continue;
    // Scanned over the BLANKED text, whose offsets are the original's, so
    // a line number still names the line the reader will look at.
    for (const { target, offset } of targets(blankCode(doc.text))) {
      const resolved = resolveTarget(doc.path, target);
      if (resolved === null) continue;

      if (files.has(resolved) || dirs.has(resolved)) continue;
      // The Q-41 half. `.harness/pack/<p>` is correct when `<p>` is in the
      // payload — a file, or a directory the payload implies.
      const inPayload = payloadRelative(resolved);
      if (inPayload !== null && (payloadFiles.has(inPayload) || payloadDirs.has(inPayload))) continue;

      const line = doc.text.slice(0, offset).split('\n').length;
      bag.add('W-LINK-DANGLING', {
        path: doc.path,
        line,
        values: { path: doc.path, line: String(line), target },
      });
    }
  }

  return bag;
}

/**
 * Blank out fenced code blocks and inline code spans, **preserving every
 * offset**.
 *
 * Length-preserving on purpose: the scan reports a line number, and a
 * transform that deleted characters would report a line the reader cannot
 * find. Each removed character becomes a space; newlines are kept so the
 * line count is unchanged.
 *
 * A fence is closed by a run of the **same** character at least as long as
 * the one that opened it (CommonMark's rule), and an unclosed fence runs
 * to the end of the document — which is what a Markdown renderer does, so
 * it is what a reader sees.
 */
export function blankCode(text: string): string {
  const lines = text.split('\n');
  let fence: string | null = null;

  const out = lines.map((line) => {
    const opener = /^[ \t]{0,3}(`{3,}|~{3,})/.exec(line);
    if (fence === null) {
      if (opener !== null) {
        fence = opener[1] as string;
        return blank(line);
      }
      // Inline spans only outside a fence — inside one the whole line is
      // blanked anyway.
      return line.replace(/`+[^`\n]*`+/g, blank);
    }
    const closer = /^[ \t]{0,3}(`{3,}|~{3,})[ \t]*$/.exec(line);
    if (closer !== null && (closer[1] as string)[0] === fence[0] && (closer[1] as string).length >= fence.length) {
      fence = null;
    }
    return blank(line);
  });

  return out.join('\n');
}

const blank = (s: string): string => ' '.repeat(s.length);

/** Every link target in a document, with the offset the match began at. */
function* targets(text: string): Generator<{ target: string; offset: number }> {
  for (const re of [INLINE_LINK, REFERENCE_DEF]) {
    // A fresh matcher per document: a `g` regex carries `lastIndex`
    // between calls, and a shared one would start the second document
    // wherever the first stopped and silently skip its opening links.
    const scanner = new RegExp(re.source, re.flags);
    let m: RegExpExecArray | null;
    while ((m = scanner.exec(text)) !== null) {
      const target = m[1];
      if (target !== undefined) yield { target, offset: m.index };
    }
  }
}

/**
 * The applied path a link target names, or `null` when it is not a
 * reference into the project.
 *
 * `null` covers, deliberately: absolute URLs and any scheme (`http:`,
 * `mailto:`, `#`-only anchors), root-absolute paths — the project root is
 * not the filesystem root and `validate` has no project to resolve
 * against — and anything that climbs out of the project with `..`.
 */
export function resolveTarget(from: string, rawTarget: string): string | null {
  // A fragment or query is not part of the path. Stripped before anything
  // else so `../x.md#section` resolves to `../x.md`.
  const target = rawTarget.split('#')[0]?.split('?')[0] ?? '';
  if (target === '') return null;
  if (target.startsWith('/')) return null;
  if (target.startsWith('<')) return null;
  // A scheme, or a protocol-relative URL. `[a](b:c)` is not a path.
  if (/^[A-Za-z][A-Za-z0-9+.-]*:/.test(target) || target.startsWith('//')) return null;
  // Narrowing 2. No separator and no extension ⇒ not a path reference.
  // `URL`, `TODO`, `NAME` are placeholders in a template a pack tells an
  // agent to fill; a link to an extensionless real file is the stated
  // cost.
  if (!target.includes('/') && !/\.[A-Za-z0-9]{1,10}$/.test(target)) return null;

  const base = from.slice(0, from.lastIndexOf('/') + 1);
  const segments = `${base}${target}`.split('/');
  const out: string[] = [];
  for (const seg of segments) {
    if (seg === '' || seg === '.') continue;
    if (seg === '..') {
      // Out of the project: not "inside the project", so not this check's
      // subject. `pop()` on an empty stack would silently anchor the path
      // at the root and report a path nobody wrote.
      if (out.length === 0) return null;
      out.pop();
      continue;
    }
    out.push(seg);
  }
  // A trailing `/` means a directory, and the caller's directory set holds
  // directories without it.
  return out.join('/');
}

/** `.harness/pack/<rest>` → `<rest>`; anything else → `null`. */
function payloadRelative(applied: string): string | null {
  const prefix = `${HARNESS_ROOT}/pack/`;
  return applied.startsWith(prefix) ? applied.slice(prefix.length) : null;
}

/** Every directory a path set implies, without the trailing `/` — the
 *  shape `resolveTarget` returns, so a link to a folder resolves. */
function directorySet(paths: readonly string[]): ReadonlySet<string> {
  const out = new Set<string>();
  for (const p of paths) {
    const segments = p.split('/');
    for (let i = 1; i < segments.length; i += 1) out.add(segments.slice(0, i).join('/'));
  }
  return out;
}
