import { test } from 'node:test';
import assert from 'node:assert/strict';
import { blankCode, checkLinkIntegrity, isMarkdown, resolveTarget } from './link-integrity.js';

/** Findings as `path:line`. The **code** is asserted separately; asserting
 *  prose would pin a contract F1 makes free to change. */
const targetsOf = (text: string, produced: string[] = ['docs/a.md'], payload: string[] = []): string[] =>
  checkLinkIntegrity({ docs: [{ path: 'docs/a.md', text }], produced, payload }).items.map(
    (d) => `${d.path}:${d.line}`,
  );

/* ── the rule ────────────────────────────────────────────────────────── */

test('a relative link to a path the pack does not produce is reported, with its line', () => {
  const bag = checkLinkIntegrity({
    docs: [{ path: 'docs/a.md', text: 'x\n\nsee [b](b.md)\n' }],
    produced: ['docs/a.md'],
    payload: [],
  });
  assert.deepEqual(bag.items.map((d) => d.code), ['W-LINK-DANGLING']);
  assert.equal(bag.items[0]?.line, 3);
  assert.equal(bag.items[0]?.class, 'defect');
});

test('a link to a path the recipe produces is not reported', () => {
  assert.deepEqual(targetsOf('[b](b.md)', ['docs/a.md', 'docs/b.md']), []);
});

test('a link to a directory the output implies resolves', () => {
  assert.deepEqual(targetsOf('[d](sub/)', ['docs/a.md', 'docs/sub/c.md']), []);
});

/**
 * **The load-bearing half.** Under Q-41 the applied documents legitimately
 * point *into* the phase-1 payload, so a payload-blind check would flag
 * every correct reference — an inverted check, not a noisy one.
 */
test('a reference into .harness/pack/ that exists in the payload is correct', () => {
  assert.deepEqual(
    targetsOf('[p](../.harness/pack/specifications/README.md)', ['docs/a.md'], [
      'specifications/README.md',
    ]),
    [],
  );
});

test('a reference into .harness/pack/ that the payload does not hold still dangles', () => {
  assert.equal(
    targetsOf('[p](../.harness/pack/nope.md)', ['docs/a.md'], ['specifications/README.md']).length,
    1,
  );
});

/* ── what is not a reference into the project ────────────────────────── */

test('URLs, anchors, absolute paths and escapes out of the project are not checked', () => {
  assert.equal(resolveTarget('docs/a.md', 'https://example.com/x.md'), null);
  assert.equal(resolveTarget('docs/a.md', 'mailto:a@b.co'), null);
  assert.equal(resolveTarget('docs/a.md', '//cdn/x.md'), null);
  assert.equal(resolveTarget('docs/a.md', '#section'), null);
  assert.equal(resolveTarget('docs/a.md', '/abs/x.md'), null);
  // Out of the project: not this check's subject, and `pop()` on an empty
  // stack would silently anchor it at the root and report a path nobody
  // wrote.
  assert.equal(resolveTarget('docs/a.md', '../../x.md'), null);
});

test('a fragment or query is stripped before the path resolves', () => {
  assert.equal(resolveTarget('docs/a.md', 'b.md#h'), 'docs/b.md');
  assert.equal(resolveTarget('docs/a.md', './b.md?v=1'), 'docs/b.md');
});

/**
 * Narrowing 2. `[Title](URL)` in `coding`'s `researcher` agent is the
 * shape of a source line the agent is told to **write**, not a reference
 * this pack makes. The cost is stated in the module header: a real link to
 * an extensionless file is not checked.
 */
test('a target with no separator and no extension is not a path reference', () => {
  assert.equal(resolveTarget('docs/a.md', 'URL'), null);
  assert.equal(resolveTarget('docs/a.md', 'b.md'), 'docs/b.md');
  assert.equal(resolveTarget('docs/a.md', 'sub/LICENSE'), 'docs/sub/LICENSE');
});

/* ── narrowing 1: code is shown, not followed ────────────────────────── */

/**
 * `writing`'s `bilingual-publishing` guide displays a worked index entry
 * inside a fence, whose `[…](NN-slug-en.md)` names a file the *reader*
 * will create. Scanning it makes a correct pack un-shippable under
 * `--strict`, which is what makes this a narrowing rather than a leniency.
 */
test('links inside a fenced code block are not scanned', () => {
  assert.deepEqual(targetsOf('```\n[a](gone.md)\n```\n'), []);
  assert.deepEqual(targetsOf('~~~\n[a](gone.md)\n~~~\n'), []);
});

test('links inside an inline code span are not scanned', () => {
  assert.deepEqual(targetsOf('text `[a](gone.md)` more'), []);
});

/**
 * **Length-preserving**, because the scan reports a line number. A
 * transform that deleted the fence would report a line the reader cannot
 * find in the file they were given.
 */
test('blanking a fence preserves every offset', () => {
  const text = 'a\n```\nx\n```\n[b](gone.md)\n';
  const blanked = blankCode(text);
  assert.equal(blanked.length, text.length);
  assert.equal(blanked.split('\n').length, text.split('\n').length);
  assert.equal(targetsOf(text)[0], 'docs/a.md:5');
});

test('a fence closes only on a run of its own character, at least as long', () => {
  // The inner ``` does not close a ~~~ fence, so the link stays hidden.
  assert.deepEqual(targetsOf('~~~\n```\n[a](gone.md)\n~~~\n'), []);
});

/* ── scope ───────────────────────────────────────────────────────────── */

test('only Markdown files are scanned — link syntax in a script is not a link', () => {
  assert.equal(isMarkdown('a/b.md'), true);
  assert.equal(isMarkdown('a/b.markdown'), true);
  assert.equal(isMarkdown('a/b.sh'), false);
  assert.deepEqual(
    checkLinkIntegrity({
      docs: [{ path: 'bin/x.sh', text: '# [a](gone.md)' }],
      produced: [],
      payload: [],
    }).items,
    [],
  );
});

/** A `g` regex carries `lastIndex` between calls; a shared matcher would
 *  start the second document wherever the first stopped and silently skip
 *  its opening links. */
test('two documents are each scanned from the beginning', () => {
  const bag = checkLinkIntegrity({
    docs: [
      { path: 'a.md', text: '[x](gone1.md)' },
      { path: 'b.md', text: '[y](gone2.md)' },
    ],
    produced: [],
    payload: [],
  });
  assert.equal(bag.length, 2);
});

test('a reference definition is scanned as well as an inline link', () => {
  assert.equal(targetsOf('[id]: gone.md\n').length, 1);
});
