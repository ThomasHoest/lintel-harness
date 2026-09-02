/**
 * The canonical bytes. T-0702.
 *
 * A unit test rather than an acceptance one because every claim here is
 * about a **pure function of a value** — no filesystem, no project. The
 * filesystem halves (`read.ts`, `write.ts`) are exercised in
 * `tests/integration/manifest.test.ts`, where a real directory is what the
 * claim is about.
 *
 * What is asserted is the **diff contract**. The manifest is committed to
 * version control, so key order and whitespace are not presentation: a
 * serializer that moved a key would show every project a spurious change
 * on the next command that rewrote the file, and hide the real one inside
 * it.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canonicalJson } from './canonical-json.js';
import { MANIFEST_KEYS, type PackManifest } from './types.js';

const DIGEST = `sha256-${'a1b2c3d4'.repeat(8)}` as const;

function manifest(overrides: Partial<PackManifest> = {}): PackManifest {
  return {
    manifestVersion: 1,
    cli: '1.0.0',
    pack: { name: 'coding', version: '1.0.0', formatVersion: 1 },
    payloadDigest: DIGEST,
    parameters: { projectName: 'Lintel Harness', stack: 'Node 22' },
    scaffolds: [],
    ...overrides,
  };
}

const keysOf = (text: string): string[] => Object.keys(JSON.parse(text) as object);

test('six keys, in F1 §F1.4 order', () => {
  assert.deepEqual(keysOf(canonicalJson(manifest())), [...MANIFEST_KEYS]);
});

test('payloadDigest is the fourth key and is never inside pack', () => {
  // Q-52's position, and the failure it guards is silent: `pack` records
  // what the pack DECLARED and the digest records what this apply
  // OBSERVED, so nesting it would file an observation under a declaration
  // and nothing would look wrong.
  const text = canonicalJson(manifest());
  assert.equal(keysOf(text)[3], 'payloadDigest');
  const doc = JSON.parse(text) as { pack: Record<string, unknown> };
  assert.ok(!('payloadDigest' in doc.pack), 'pack.payloadDigest must be absent');
});

test('re-serializing the same manifest is byte-identical', () => {
  // US-10's contract, and the reason two applies of the same pack version
  // with the same answers produce identical files.
  assert.equal(canonicalJson(manifest()), canonicalJson(manifest()));
});

test('2-space indent, \\n endings, and a trailing newline', () => {
  const text = canonicalJson(manifest());
  assert.ok(!text.includes('\r'), 'a CR would make the bytes platform-dependent');
  assert.ok(text.endsWith('}\n'), 'the file ends with exactly one newline after the object');
  assert.ok(text.includes('\n  "cli": "1.0.0",\n'), 'top-level entries are indented two spaces');
  assert.ok(text.includes('\n    "name": "coding",\n'), 'nested entries are indented four');
});

test('parameters keep declared order and are NOT sorted', () => {
  // The distinction is the whole point: F1 says "sorted by declared
  // parameter order", and a serializer that sorted alphabetically would
  // pass a test written against an already-alphabetical fixture.
  const text = canonicalJson(manifest({ parameters: { zeta: 'z', alpha: 'a' } }));
  const doc = JSON.parse(text) as { parameters: Record<string, string> };
  assert.deepEqual(Object.keys(doc.parameters), ['zeta', 'alpha']);
});

test('scaffolds keep declared order', () => {
  const text = canonicalJson(manifest({ scaffolds: ['writing-workstream', 'backend-aws'] }));
  const doc = JSON.parse(text) as { scaffolds: string[] };
  assert.deepEqual(doc.scaffolds, ['writing-workstream', 'backend-aws']);
});

test('the empty cases render as {} and []', () => {
  const text = canonicalJson(manifest({ parameters: {}, scaffolds: [] }));
  assert.ok(text.includes('"parameters": {}'));
  assert.ok(text.includes('"scaffolds": []'));
});

test('unknown keys are re-inlined verbatim, after the keys the CLI knows', () => {
  // §F1.5: an older CLI degrades to IGNORING a newer one's data rather
  // than deleting it, at both levels that have a closed key set.
  const text = canonicalJson(
    manifest({
      unknownKeys: { mergeRecord: { paths: ['a/b'] } },
      unknownPackKeys: { channel: 'beta' },
    }),
  );
  assert.deepEqual(keysOf(text), [...MANIFEST_KEYS, 'mergeRecord']);
  const doc = JSON.parse(text) as {
    mergeRecord: unknown;
    pack: Record<string, unknown>;
  };
  assert.deepEqual(doc.mergeRecord, { paths: ['a/b'] });
  assert.deepEqual(Object.keys(doc.pack), ['name', 'version', 'formatVersion', 'channel']);
});

test('a capture can never overwrite a key the CLI reads', () => {
  // Without the guard, a stray `payloadDigest` in a capture would replace
  // the digest this apply computed with a value nothing validated — and
  // the file would still be well-formed.
  const text = canonicalJson(
    manifest({ unknownKeys: { payloadDigest: 'sha256-forged', cli: '9.9.9' } }),
  );
  const doc = JSON.parse(text) as { payloadDigest: string; cli: string };
  assert.equal(doc.payloadDigest, DIGEST);
  assert.equal(doc.cli, '1.0.0');
  assert.deepEqual(keysOf(text), [...MANIFEST_KEYS]);
});
