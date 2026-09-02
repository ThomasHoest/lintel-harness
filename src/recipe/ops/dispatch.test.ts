import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderCopy } from './copy.js';
import { renderRename } from './rename.js';
import { renderStripSuffix } from './strip-suffix.js';
import { renderRewritePath } from './rewrite-path.js';
import { renderSubstitute } from './substitute.js';
import { renderGenerate } from './generate.js';
import { checkAnchors, CLOSING_LINE, openingLine } from '../anchors.js';
import { confinePath, type AppliedPath } from '../../security/confine.js';
import type { RenderContext } from '../render.js';
import type { Answer } from '../../pack/parameters.js';

const codes = (b: { items: readonly { code: string }[] }): string[] => b.items.map((d) => d.code);
const ap = (p: string): AppliedPath => confinePath(p, { index: 0 }).path!;
const text = (w: { bytes: Buffer }): string => w.bytes.toString('utf8');

function ctx(over: Partial<RenderContext> & { files?: Record<string, string | Buffer> } = {}): RenderContext {
  const files = over.files ?? {};
  return {
    index: 0,
    payload: Object.keys(files),
    readPayload: (p) => {
      const v = files[p];
      if (v === undefined) return null;
      return Buffer.isBuffer(v) ? v : Buffer.from(v, 'utf8');
    },
    written: over.written ?? new Map(),
    answers: over.answers ?? new Map<string, Answer>(),
    packName: 'demo',
    packVersion: '1.2.3',
    cliVersion: '1.0.0',
    ...over,
  };
}

/* ── copy ────────────────────────────────────────────────────────────── */

test('copy writes payload bytes verbatim at each applied path', () => {
  const r = renderCopy(
    { op: 'copy', from: 'a/', to: 'b/' },
    [ap('b/one.md'), ap('b/two.md')],
    ctx({ files: { 'a/one.md': 'ONE', 'a/two.md': 'TWO' } }),
  );
  assert.deepEqual(codes(r.bag), []);
  assert.deepEqual(r.writes.map(text), ['ONE', 'TWO']);
  assert.deepEqual(r.writes.map((w) => w.mode), [0o644, 0o644]);
});

/**
 * A basename change buried in a recursion of two hundred files is not
 * visible to a reader of the plan; `rename`'s two arguments are. The
 * separation is what makes a recipe readable, so it is enforced rather
 * than left to convention.
 */
test('a file copy may not change the basename — that is rename’s job', () => {
  const r = renderCopy(
    { op: 'copy', from: 'a/one.md', to: 'b/other.md' },
    [ap('b/other.md')],
    ctx({ files: { 'a/one.md': 'x' } }),
  );
  assert.deepEqual(codes(r.bag), ['E-RECIPE-STEP-INVALID']);
  assert.match(r.bag.items[0]!.message, /that is what "rename" is for/);
  assert.deepEqual(r.writes, []);
});

// Directory NAMES may differ, and must: `agent-teams/` → `AgentTeams/` is
// step 2 of the manual apply, expressed by the step alone.
test('a directory copy may rename the directory', () => {
  const r = renderCopy(
    { op: 'copy', from: 'agent-teams/', to: 'AgentTeams/' },
    [ap('AgentTeams/Specify.md')],
    ctx({ files: { 'agent-teams/Specify.md': 'S' } }),
  );
  assert.deepEqual(codes(r.bag), []);
  assert.equal(text(r.writes[0]!), 'S');
});

test('copy carries binary bytes through untouched', () => {
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0xff, 0xfe]);
  const r = renderCopy(
    { op: 'copy', from: 'a/', to: 'b/' },
    [ap('b/logo.png')],
    ctx({ files: { 'a/logo.png': png } }),
  );
  assert.equal(Buffer.compare(r.writes[0]!.bytes, png), 0, 'byte-identical, never decoded');
});

test('copy honours the executable field', () => {
  const r = renderCopy(
    { op: 'copy', from: 'a/', to: 'b/', executable: true },
    [ap('b/run.sh')],
    ctx({ files: { 'a/run.sh': '#!/bin/sh' } }),
  );
  assert.equal(r.writes[0]!.mode, 0o755);
});

/* ── rename ──────────────────────────────────────────────────────────── */

test('rename writes one file under a new basename', () => {
  const r = renderRename(
    { op: 'rename', from: 'a/one.md', to: 'b/other.md' },
    [ap('b/other.md')],
    ctx({ files: { 'a/one.md': 'ONE' } }),
  );
  assert.deepEqual(codes(r.bag), []);
  assert.equal(text(r.writes[0]!), 'ONE');
});

// Not because it could not be implemented — because it has no meaning:
// one new basename cannot cover many files.
test('a directory from is refused', () => {
  const r = renderRename({ op: 'rename', from: 'a/', to: 'b/' }, [ap('b/')], ctx());
  assert.deepEqual(codes(r.bag), ['E-RECIPE-STEP-INVALID']);
  assert.match(r.bag.items[0]!.message, /rename takes one file/);
});

/* ── strip-suffix ────────────────────────────────────────────────────── */

test('strip-suffix rewrites the basename and copies the bytes', () => {
  const r = renderStripSuffix(
    { op: 'strip-suffix', from: 'c/', to: 'copy/', suffix: '.template' },
    [ap('copy/tone-of-voice.md')],
    ctx({ files: { 'c/tone-of-voice.template.md': 'VOICE' } }),
  );
  assert.deepEqual(codes(r.bag), []);
  assert.equal(text(r.writes[0]!), 'VOICE');
});

/**
 * **No implicit `.template` default**, and the pack is the reason: the
 * `coding` payload legitimately keeps `*.template.md` filenames that must
 * NOT be stripped — they are templates for the *user* to copy, not for the
 * apply to rename. A default would have renamed them silently and nobody
 * would have noticed until a project had wrong filenames throughout.
 */
test('a suffix no basename carries is an authoring mistake', () => {
  const r = renderStripSuffix(
    { op: 'strip-suffix', from: 'c/', to: 'copy/', suffix: '.template' },
    [ap('copy/plain.md')],
    ctx({ files: { 'c/plain.md': 'x' } }),
  );
  assert.deepEqual(codes(r.bag), ['E-RECIPE-STEP-INVALID']);
  assert.match(r.bag.items[0]!.message, /no file under "c\/" has a basename carrying "\.template"/);
});

test('only the basename is stripped, never a directory segment', () => {
  const r = renderStripSuffix(
    { op: 'strip-suffix', from: 'c/', to: 'copy/', suffix: '.template' },
    [ap('copy/.template/x.md')],
    ctx({ files: { 'c/.template/x.template.md': 'x' } }),
  );
  // The applied path keeps its `.template/` directory; only the basename
  // loses the suffix — so the write set and this op agree on one path.
  assert.deepEqual(codes(r.bag), []);
});

/* ── rewrite-path ────────────────────────────────────────────────────── */

test('rewrite-path replaces every occurrence, literally', () => {
  const written = new Map([[ap('Run.md'), Buffer.from('see template/targets/x and template/targets/y')]]);
  const r = renderRewritePath(
    { op: 'rewrite-path', in: ['Run.md'], find: 'template/targets/', replace: 'targets/' },
    [ap('Run.md')],
    ctx({ written }),
  );
  assert.deepEqual(codes(r.bag), []);
  assert.equal(text(r.writes[0]!), 'see targets/x and targets/y');
});

// Literals, not regexes: no metacharacter to escape, no backtracking to
// bound, and no author input reaching the regex engine at all.
test('find and replace are literal, including regex and $-metacharacters', () => {
  const written = new Map([[ap('a.md'), Buffer.from('a.c and $& and a[b]c')]]);
  const r = renderRewritePath(
    { op: 'rewrite-path', in: ['a.md'], find: 'a.c', replace: '$&x' },
    [ap('a.md')],
    ctx({ written }),
  );
  assert.equal(text(r.writes[0]!), '$&x and $& and a[b]c', '"a.c" matched literally, "$&" inserted literally');
});

/**
 * *A rewrite that no longer applies is stale, and staleness is the defect
 * this product exists to prevent.* A pack whose rewrite silently stopped
 * matching has drifted from its own payload — the exact condition `update`
 * exists to surface, so passing it here would be the tool failing at its
 * own thesis.
 */
test('a rewrite matching nothing across all its files is stale', () => {
  const written = new Map([[ap('a.md'), Buffer.from('nothing here')]]);
  const r = renderRewritePath(
    { op: 'rewrite-path', in: ['*.md'], find: 'gone', replace: 'x' },
    [ap('a.md')],
    ctx({ written }),
  );
  assert.deepEqual(codes(r.bag), ['E-REWRITE-UNUSED']);
  assert.match(r.bag.items[0]!.message, /A rewrite that no longer applies is stale/);
});

// The quantifier is ACROSS ALL `in` files, not per file: a rewrite hitting
// one of five matched files is doing its job.
test('one hit across several files is enough', () => {
  const written = new Map([
    [ap('a.md'), Buffer.from('nothing')],
    [ap('b.md'), Buffer.from('found it')],
  ]);
  const r = renderRewritePath(
    { op: 'rewrite-path', in: ['*.md'], find: 'found', replace: 'kept' },
    [ap('a.md'), ap('b.md')],
    ctx({ written }),
  );
  assert.deepEqual(codes(r.bag), []);
  assert.equal(r.writes.length, 1, 'and only the file that changed is rewritten');
});

test('a binary file in the matched set is skipped, not corrupted', () => {
  const png = Buffer.from([0x89, 0x50, 0x00, 0xff]);
  const written = new Map([[ap('logo.png'), png], [ap('a.md'), Buffer.from('x')]]);
  const r = renderRewritePath(
    { op: 'rewrite-path', in: ['*'], find: 'x', replace: 'y' },
    [ap('logo.png'), ap('a.md')],
    ctx({ written }),
  );
  assert.deepEqual(r.writes.map((w) => w.path), ['a.md'], 'the binary never reaches the encoder');
});

/* ── substitute ──────────────────────────────────────────────────────── */

const subst = (body: string, answers: [string, Answer][] = []) => {
  const written = new Map([[ap('a.md'), Buffer.from(body)]]);
  return renderSubstitute(
    { op: 'substitute', in: ['a.md'] },
    [ap('a.md')],
    ctx({ written, answers: new Map(answers) }),
  );
};

test('the four tokens resolve', () => {
  const r = subst('{{harness:pack.name}} {{harness:pack.version}} {{harness:cli.version}} {{harness:param.who}}',
    [['who', 'Thomas']]);
  assert.deepEqual(codes(r.bag), []);
  assert.equal(text(r.writes[0]!), 'demo 1.2.3 1.0.0 Thomas');
});

/**
 * Applying `coding` leaves every `{{Feature name}}`, `{{YYYY-MM-DD}}` and
 * `{{PLACEHOLDER}}` byte-identical. Those are placeholders for a human to
 * fill later — a substituter that ate them would destroy the templates it
 * was copying.
 */
test('every {{…}} not beginning harness: is copied verbatim', () => {
  const r = subst('{{Feature name}} {{YYYY-MM-DD}} {{PLACEHOLDER}} {{harness:pack.name}}');
  assert.equal(text(r.writes[0]!), '{{Feature name}} {{YYYY-MM-DD}} {{PLACEHOLDER}} demo');
});

/**
 * **One pass, never re-scanned.** A second pass would make the escape
 * unable to escape itself, which is the one thing an escape has to do.
 */
test('the escape resolves once and its output is not re-scanned', () => {
  assert.equal(text(subst('{{harness:lit:pack.name}}').writes[0]!), '{{harness:pack.name}}');
  assert.equal(text(subst('{{harness:lit:lit:x}}').writes[0]!), '{{harness:lit:x}}');
});

test('an unknown token is unresolved, and the message names the line', () => {
  const r = subst('line one\nline two {{harness:nope}}');
  assert.deepEqual(codes(r.bag), ['E-SUBST-UNRESOLVED']);
  assert.match(r.bag.items[0]!.message, /a.md:2/);
  assert.deepEqual(r.writes, [], 'and nothing is written for that file');
});

// The pack declared which tokens it meant; one it did not mean is a
// mistake in one of the two places, not something to resolve quietly.
test('tokens is an allowlist', () => {
  const written = new Map([[ap('a.md'), Buffer.from('{{harness:pack.name}}')]]);
  const r = renderSubstitute(
    { op: 'substitute', in: ['a.md'], tokens: { 'cli.version': '' } },
    [ap('a.md')],
    ctx({ written }),
  );
  assert.deepEqual(codes(r.bag), ['E-SUBST-UNRESOLVED']);
});

/**
 * C-9, and this is the **sufficient** condition: it holds when a pack
 * author's `pattern` is weak, which is exactly why it exists separately
 * from `E-PARAM-INVALID`. A single answer becoming two lines of a
 * generated file is a structural injection, and the parameter's own
 * grammar is not a control this rule may lean on.
 */
test('a substituted value containing any line separator is refused', () => {
  for (const ch of ['\n', '\r', ' ', ' ']) {
    const r = subst('{{harness:param.who}}', [['who', `a${ch}b`]]);
    assert.deepEqual(codes(r.bag), ['E-SUBST-NEWLINE'], JSON.stringify(ch));
    assert.deepEqual(r.writes, []);
  }
});

// T-0804's by-product, recorded at the only moment it is known.
// Reconstructing it later would mean searching output for values, which
// finds coincidences.
test('every resolved param records where it landed', () => {
  const r = subst('{{harness:param.who}} and {{harness:pack.name}}', [['who', 'Thomas']]);
  assert.deepEqual(r.substitutions, [{ path: 'a.md', id: 'who', value: 'Thomas' }]);
});

/* ── generate and anchors ────────────────────────────────────────────── */

const CLAUDE = `# {{harness:pack.name}}\n${openingLine('overview')}\ntext\n${CLOSING_LINE}\n`;

test('generate renders a template, substitutes and asserts anchors', () => {
  const r = renderGenerate(
    { op: 'generate', template: 't.md', to: 'CLAUDE.md', anchors: ['overview'] },
    [ap('CLAUDE.md')],
    ctx({ files: { 't.md': CLAUDE } }),
  );
  assert.deepEqual(codes(r.bag), []);
  assert.match(text(r.writes[0]!), /^# demo/);
});

// Three failure modes, three reasons — they have three different fixes,
// and a single "anchors are wrong" would send an author to reread the
// whole template.
test('the three anchor failures each say which one it was', () => {
  const missing = checkAnchors('nothing', ['overview'], 'CLAUDE.md', 0);
  assert.match(missing.items[0]!.message, /does not appear/);

  const dup = checkAnchors(`${openingLine('a')}\n${openingLine('a')}\n${CLOSING_LINE}\n${CLOSING_LINE}`, ['a'], 'x', 0);
  assert.match(dup.items[0]!.message, /appears 2 times/);

  const unbalanced = checkAnchors(`${openingLine('a')}\ntext`, ['a'], 'x', 0);
  assert.match(unbalanced.items[0]!.message, /is closed by 0 .* markers where 1 are declared/);
});

/**
 * **Stated rather than engineered around** (Q-45). A `CLAUDE.md` that
 * documents the anchor syntax in a fenced example reports a duplicate.
 * Fixing it means parsing Markdown — the parser Q-45 removed, brought back
 * through a side door to serve a case no bundled pack has.
 */
test('a marker inside a fenced code block is counted, and that is the declared cost', () => {
  const doc = `${openingLine('a')}\n\`\`\`\n${openingLine('a')}\n\`\`\`\n${CLOSING_LINE}`;
  assert.match(checkAnchors(doc, ['a'], 'x', 0).items[0]!.message, /appears 2 times/);
});

// generate must decode to substitute, and decoding arbitrary bytes yields
// U+FFFD soup — written confidently to CLAUDE.md.
test('a binary template is refused rather than rendered', () => {
  const r = renderGenerate(
    { op: 'generate', template: 't.bin', to: 'CLAUDE.md', anchors: [] },
    [ap('CLAUDE.md')],
    ctx({ files: { 't.bin': Buffer.from([0x00, 0xff, 0xfe]) } }),
  );
  assert.deepEqual(codes(r.bag), ['E-RECIPE-STEP-INVALID']);
  assert.match(r.bag.items[0]!.message, /is binary and cannot be rendered as a template/);
});

test('a missing template is reported at the template field', () => {
  const r = renderGenerate(
    { op: 'generate', template: 'gone.md', to: 'CLAUDE.md', anchors: [] },
    [ap('CLAUDE.md')],
    ctx(),
  );
  assert.deepEqual(codes(r.bag), ['E-RECIPE-SOURCE-MISSING']);
  assert.match(r.bag.items[0]!.message, /from "template"/);
});
