/**
 * T-0510 — the text/binary rule, across all three content ops at once.
 *
 * The per-op unit tests assert each op's own behaviour. What this asserts
 * is the **quantifier**: one binary file, put through everything that
 * could touch it, arriving byte-identical.
 *
 * The stake is the worst outcome available anywhere in the product. The
 * three content ops work on a decoded string, and `Buffer.toString('utf8')`
 * **never fails** — it replaces every invalid sequence with U+FFFD. So an
 * op that decoded a binary file would write back U+FFFD soup, **destroy
 * the file, and report success**. Not a crash, not a diagnostic: a clean
 * apply and a corrupted image.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BINARY_SNIFF_BYTES,
  confinePath,
  decodeText,
  isBinary,
  renderCopy,
  renderGenerate,
  renderRewritePath,
  renderSubstitute,
  type AppliedPath,
  type RenderContext,
} from '../../dist/index.js';

const ap = (p: string): AppliedPath => confinePath(p, { index: 0 }).path!;
const codes = (b: { items: readonly { code: string }[] }): string[] => b.items.map((d) => d.code);

/** A PNG header plus bytes that are not valid UTF-8 and include a NUL —
 *  binary by both of the two independent tests. */
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0xff, 0xfe, 0xc3]);

function ctx(files: Record<string, Buffer | string>, written: Map<AppliedPath, Buffer>): RenderContext {
  return {
    index: 0,
    payload: Object.keys(files),
    readPayload: (p) => {
      const v = files[p];
      if (v === undefined) return null;
      return Buffer.isBuffer(v) ? v : Buffer.from(v, 'utf8');
    },
    written,
    answers: new Map([['who', 'Thomas']]),
    packName: 'demo',
    packVersion: '1.0.0',
    cliVersion: '1.0.0',
  };
}

test('a binary payload file survives copy byte-identically', () => {
  const r = renderCopy(
    { op: 'copy', from: 'a/', to: 'b/' },
    [ap('b/logo.png')],
    ctx({ 'a/logo.png': PNG }, new Map()),
  );
  assert.deepEqual(codes(r.bag), []);
  assert.equal(Buffer.compare(r.writes[0]!.bytes, PNG), 0);
});

/**
 * The two editing ops **skip** a binary file rather than refusing the
 * step. Skipping is right: the step's `in` glob legitimately matches a
 * directory of mixed content, and refusing would make a pack unable to
 * substitute into a folder that happens to contain an image.
 */
test('rewrite-path and substitute skip a binary file and leave it untouched', () => {
  for (const render of [
    () =>
      renderRewritePath(
        { op: 'rewrite-path', in: ['*'], find: 'PNG', replace: 'GIF' },
        [ap('logo.png'), ap('a.md')],
        ctx({}, new Map([[ap('logo.png'), PNG], [ap('a.md'), Buffer.from('PNG here')]])),
      ),
    () =>
      renderSubstitute(
        { op: 'substitute', in: ['*'] },
        [ap('logo.png'), ap('a.md')],
        ctx({}, new Map([[ap('logo.png'), PNG], [ap('a.md'), Buffer.from('{{harness:param.who}}')]])),
      ),
  ]) {
    const r = render();
    assert.deepEqual(codes(r.bag), []);
    assert.deepEqual(
      r.writes.map((w: { path: string }) => w.path),
      ['a.md'],
      'the text file is rewritten and the binary is not in the write list at all',
    );
  }
});

// `generate` cannot skip — it has exactly one output — so it refuses.
test('generate refuses a binary template rather than rendering U+FFFD soup', () => {
  const r = renderGenerate(
    { op: 'generate', template: 't.bin', to: 'CLAUDE.md', anchors: [] },
    [ap('CLAUDE.md')],
    ctx({ 't.bin': PNG }, new Map()),
  );
  assert.deepEqual(codes(r.bag), ['E-RECIPE-STEP-INVALID']);
  assert.deepEqual(r.writes, []);
});

/**
 * The failure this whole rule prevents, demonstrated rather than asserted
 * abstractly: decoding and re-encoding a binary file is **lossy and
 * silent**.
 */
test('decoding a binary file would corrupt it, which is why nothing does', () => {
  const roundTripped = Buffer.from(PNG.toString('utf8'), 'utf8');
  assert.notEqual(Buffer.compare(roundTripped, PNG), 0, 'lossy — and silently so');
  assert.equal(decodeText(PNG), null, 'so the decoder refuses rather than returning that string');
});

test('the 8 KB sniff bound is a declared number, not an accident', () => {
  const late = Buffer.concat([Buffer.from('a'.repeat(BINARY_SNIFF_BYTES)), Buffer.from([0x00])]);
  const early = Buffer.concat([Buffer.from('a'.repeat(BINARY_SNIFF_BYTES - 1)), Buffer.from([0x00])]);
  assert.equal(isBinary(late), false);
  assert.equal(isBinary(early), true);
});
