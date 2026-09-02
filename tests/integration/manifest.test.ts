/**
 * The manifest as a contract: US-10 and US-15. T-0705.
 *
 * ── What makes these ACCEPTANCE tests ─────────────────────────────────
 *
 * `src/manifest/canonical-json.test.ts` covers the serializer alone. These
 * assert the **stories' criteria as stated**, across the three modules and
 * against a real directory, from the position of the person each story is
 * written for — a project owner who will read this file in a diff and a
 * project owner whose manifest has gone wrong.
 *
 * Every claim is asserted by **code and exit class**, never by matching
 * message prose: F1 §Error States makes the code the stable contract and
 * the text free to be reworded within a minor version, so a test that
 * string-matched a sentence would assert something F1 does not promise.
 *
 * ── What could not be asserted here, and why it is named ──────────────
 *
 * US-10 says *"two applies of the same pack version with the same answers
 * produce byte-identical manifests"*. **There is no apply engine yet** —
 * `init` is F2's and E-11's — so the two applies are simulated at the
 * highest level that exists today: the same inputs, built and written
 * twice into two different project roots, compared byte for byte. That is
 * the whole of what the manifest layer contributes to the criterion; the
 * remaining half (that two applies produce the same *inputs*) belongs to
 * the apply engine's own acceptance tests and is not covered by omission.
 *
 * Likewise `payloadDigest` is supplied as an **input** here rather than
 * computed: `payloadDigest()` (T-0604) does not exist yet, and the
 * manifest's contract is about recording the digest in the right shape and
 * the right position, not about producing it.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { EXIT, snapshot, withTempDir } from '../harness/cli.js';
import { exitClassFor, resolveRoot } from '../../dist/index.js';
import type { DiagnosticCode, ParameterDecl, ProjectRoot } from '../../dist/index.js';
import { readManifest } from '../../dist/index.js';
import { writeManifest } from '../../dist/index.js';
import { canonicalJson } from '../../dist/index.js';
import { MANIFEST_KEYS, type PackManifest } from '../../dist/index.js';

/** The version under test. `readManifest`'s only non-derivable input. */
const CLI_VERSION = '1.0.0';

const DIGEST = `sha256-${'a1b2c3d4'.repeat(8)}` as const;

/** Two declarations, one of each shape that can fail on read-back: a
 *  `string` with a `pattern` and an `enum` with a closed value set. */
const DECLARATIONS: readonly ParameterDecl[] = [
  { id: 'projectName', prompt: 'Project name', type: 'string', pattern: '^[A-Za-z][A-Za-z0-9 -]{0,63}$', required: true },
  { id: 'stack', prompt: 'Stack', type: 'enum', values: ['node', 'dotnet'], required: true },
];

function manifest(overrides: Partial<PackManifest> = {}): PackManifest {
  return {
    manifestVersion: 1,
    cli: CLI_VERSION,
    pack: { name: 'coding', version: '1.0.0', formatVersion: 1 },
    payloadDigest: DIGEST,
    parameters: { projectName: 'Lintel Harness', stack: 'node' },
    scaffolds: [],
    ...overrides,
  };
}

/** The manifest as a plain document, so a test can break one rule at a
 *  time — which is what a hand edit does. */
function document(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    manifestVersion: 1,
    cli: CLI_VERSION,
    pack: { name: 'coding', version: '1.0.0', formatVersion: 1 },
    payloadDigest: DIGEST,
    parameters: { projectName: 'Lintel Harness', stack: 'node' },
    scaffolds: [],
    ...overrides,
  };
}

async function root(dir: string): Promise<ProjectRoot> {
  const r = await resolveRoot(dir);
  assert.ok(r.root, 'the temp directory must resolve');
  return r.root;
}

/** Put arbitrary text at `.harness/manifest.json`. Text and not an object,
 *  because half of US-15's rows are about documents `JSON.stringify`
 *  cannot produce. */
async function place(dir: string, text: string): Promise<void> {
  await mkdir(join(dir, '.harness'), { recursive: true });
  await writeFile(join(dir, '.harness', 'manifest.json'), text, 'utf8');
}

const codes = (b: { items: readonly { code: DiagnosticCode }[] }): DiagnosticCode[] =>
  b.items.map((d) => d.code);

/* ── US-10 — record what was applied, minimally ────────────────────────── */

test('US-10: the written manifest has exactly six keys, in F1 §F1.4 order', async () => {
  await withTempDir(async (dir) => {
    const bag = await writeManifest(await root(dir), manifest());
    assert.deepEqual(codes(bag), []);

    const text = await readFile(join(dir, '.harness', 'manifest.json'), 'utf8');
    const doc = JSON.parse(text) as Record<string, unknown>;

    // "Nothing else." The ENUMERATION is asserted rather than membership:
    // a closed list goes false silently, and each of `files[]`, `regions`,
    // `ownedKeys`, `shared[]`, `pack.integrity`, `appliedAt` and a manifest
    // self-hash was carried in an earlier design for a consumer v1.0 does
    // not have (Q-43, Q-54).
    assert.deepEqual(Object.keys(doc), [...MANIFEST_KEYS]);
  });
});

test('US-10: payloadDigest is the fourth key and pack.payloadDigest is absent', async () => {
  // The criterion states the test: "a test may assert the position by
  // reading the manifest's key order and requiring payloadDigest to be the
  // fourth key and pack.payloadDigest to be absent" (Q-52).
  await withTempDir(async (dir) => {
    await writeManifest(await root(dir), manifest());
    const doc = JSON.parse(
      await readFile(join(dir, '.harness', 'manifest.json'), 'utf8'),
    ) as { pack: Record<string, unknown> };
    assert.equal(Object.keys(doc)[3], 'payloadDigest');
    assert.ok(!('payloadDigest' in doc.pack));
  });
});

test('US-10: two applies of the same pack version with the same answers are byte-identical', async () => {
  await withTempDir(async (a) => {
    await withTempDir(async (b) => {
      await writeManifest(await root(a), manifest());
      await writeManifest(await root(b), manifest());
      const [x, y] = await Promise.all([
        readFile(join(a, '.harness', 'manifest.json')),
        readFile(join(b, '.harness', 'manifest.json')),
      ]);
      assert.ok(x.equals(y), 'the two manifests must be byte-identical');
    });
  });
});

test('US-10: a manifest round-trips to identical bytes', async () => {
  // "Re-serializing an unchanged manifest produces byte-identical output."
  // Read is the half that could break it: a reader that dropped a key, or
  // reordered `parameters`, would still return something that looked right.
  await withTempDir(async (dir) => {
    const r = await root(dir);
    await writeManifest(r, manifest());
    const before = await readFile(join(dir, '.harness', 'manifest.json'), 'utf8');

    const read = await readManifest(r, DECLARATIONS, { cliVersion: CLI_VERSION });
    assert.ok(read.manifest);
    assert.equal(canonicalJson(read.manifest), before);
  });
});

test('US-10: writing the manifest writes the manifest and nothing else', async () => {
  // ".harness/ carries no README" (Q-50 as amended) and "init does not add
  // .harness/ to .gitignore and prints nothing suggesting it should" — the
  // manifest is committed to version control BY DESIGN, so a writer that
  // helpfully ignored it would invert the whole model. Asserted over a
  // directory snapshot rather than a list of paths this test composed,
  // because a composed list cannot see a file nobody thought of.
  await withTempDir(async (dir) => {
    const before = await snapshot(dir);
    assert.deepEqual(before, []);
    await writeManifest(await root(dir), manifest());
    const after = await snapshot(dir);
    assert.deepEqual(
      after.map((e) => e.path),
      ['.harness', '.harness/manifest.json'],
    );
  });
});

test('US-10: every declared parameter is recorded, defaults included', async () => {
  // "including ones answered by default and ones that selected nothing,
  // because a `when` must be re-evaluated against the ORIGINAL answers."
  await withTempDir(async (dir) => {
    const r = await root(dir);
    await writeManifest(r, manifest());
    const read = await readManifest(r, DECLARATIONS, { cliVersion: CLI_VERSION });
    assert.ok(read.manifest);
    assert.deepEqual(Object.keys(read.manifest.parameters), ['projectName', 'stack']);
  });
});

test('a failed manifest write is E-WRITE-FAILED, exit 3 — reported, never thrown', async () => {
  // Exit class 3 is "an I/O failure mid-write", and it is the only class
  // whose remedy is `--rollback`. Reported as a value rather than thrown
  // because an exception carries no code, and F1 makes the CODE the stable
  // contract that CI and the F6 skill branch on.
  await withTempDir(async (dir) => {
    // `.harness` as a FILE: `mkdir` then fails deterministically on every
    // platform, which a permissions trick would not.
    await writeFile(join(dir, '.harness'), 'not a directory', 'utf8');
    const bag = await writeManifest(await root(dir), manifest());
    assert.deepEqual(codes(bag), ['E-WRITE-FAILED']);
    assert.equal(bag.exitCode(), EXIT.ioFailure);
  });
});

test('every message this layer can emit renders with no placeholder left', async () => {
  // The failure this guards has already shipped once in this codebase:
  // four confinement messages went out with unfilled `{…}` slots, and one
  // passed `to` where the message wanted `path`. A caller that cannot fill
  // a message has not thought about what it is reporting.
  const messages: string[] = [];
  await withTempDir(async (dir) => {
    const r = await root(dir);
    const collect = async (text: string | null, ctx = { cliVersion: CLI_VERSION }): Promise<void> => {
      if (text !== null) await place(dir, text);
      const { bag } = await readManifest(r, DECLARATIONS, ctx);
      for (const d of bag.items) messages.push(d.message);
    };

    await collect(null); // E-MANIFEST-MISSING
    await collect('{ oops'); // E-MANIFEST-CORRUPT
    await collect(JSON.stringify(document({ manifestVersion: 2 }))); // E-MANIFEST-NEWER
    await collect('{"a":1,"a":2}'); // E-JSON-DUPLICATE-KEY
    await collect(canonicalJson(manifest({ cli: '2.0.0' }))); // W-MANIFEST-NEWER-CLI
    await collect(canonicalJson(manifest({ parameters: { projectName: '!!', stack: 'node' } })));
    await place(dir, canonicalJson(manifest({ pack: { name: 'coding', version: '2.0.0', formatVersion: 1 } })));
    const skew = await readManifest(r, DECLARATIONS, {
      cliVersion: CLI_VERSION,
      bundledPackVersion: '1.0.0',
    });
    for (const d of skew.bag.items) messages.push(d.message);
  });

  assert.ok(messages.length >= 7, 'every code above must have been reached');
  for (const m of messages) {
    assert.ok(!/\{[A-Za-z]+\}/.test(m), `unfilled placeholder in: ${m}`);
  }
});

/* ── US-15 — behave predictably when the manifest is unusable ──────────── */

test('US-15 missing: E-MANIFEST-MISSING, exit 1', async () => {
  await withTempDir(async (dir) => {
    const { manifest: m, bag } = await readManifest(await root(dir), DECLARATIONS, {
      cliVersion: CLI_VERSION,
    });
    assert.deepEqual(codes(bag), ['E-MANIFEST-MISSING']);
    assert.equal(exitClassFor('E-MANIFEST-MISSING'), EXIT.userFault);
    assert.equal(m, undefined);
  });
});

test('US-15 missing with .harness/pack/ present: the SAME code', async () => {
  // "A payload with no manifest is a crashed or hand-made state, and the
  // CLI reports it rather than reconstructing an answer set it cannot
  // know." No inference from the file tree — that was `--adopt`, dropped
  // by Q-44 — so the presence of a payload must change nothing at all.
  await withTempDir(async (dir) => {
    await mkdir(join(dir, '.harness', 'pack'), { recursive: true });
    await writeFile(join(dir, '.harness', 'pack', 'pack.json'), '{}', 'utf8');
    const { bag } = await readManifest(await root(dir), DECLARATIONS, {
      cliVersion: CLI_VERSION,
    });
    assert.deepEqual(codes(bag), ['E-MANIFEST-MISSING']);
  });
});

test('US-15 corrupt: unparseable JSON is E-MANIFEST-CORRUPT, exit 2', async () => {
  await withTempDir(async (dir) => {
    await place(dir, '{ "manifestVersion": 1, ');
    const { manifest: m, bag } = await readManifest(await root(dir), DECLARATIONS, {
      cliVersion: CLI_VERSION,
    });
    assert.deepEqual(codes(bag), ['E-MANIFEST-CORRUPT']);
    assert.equal(exitClassFor('E-MANIFEST-CORRUPT'), EXIT.integrityFault);
    assert.equal(m, undefined);
  });
});

test('US-15 corrupt: a failing schema is E-MANIFEST-CORRUPT, and the file is not repaired', async () => {
  await withTempDir(async (dir) => {
    const text = JSON.stringify(document({ scaffolds: 'writing-workstream' }), null, 2);
    await place(dir, text);
    const { bag } = await readManifest(await root(dir), DECLARATIONS, { cliVersion: CLI_VERSION });
    assert.deepEqual(codes(bag), ['E-MANIFEST-CORRUPT']);
    // "The CLI does not attempt repair and does not overwrite the file."
    assert.equal(await readFile(join(dir, '.harness', 'manifest.json'), 'utf8'), text);
  });
});

test('US-15 duplicate key: E-JSON-DUPLICATE-KEY, NOT E-MANIFEST-CORRUPT', async () => {
  // One fault, one code, wherever it occurs. The manifest is the user's
  // OWN committed file and the rule holds there for the same reason it
  // holds for a pack: a stdlib parser keeps the LAST duplicate while a
  // human reading a diff reads the FIRST, so the document reviews as one
  // thing and executes as another.
  await withTempDir(async (dir) => {
    await place(
      dir,
      ['{', '  "manifestVersion": 1,', '  "cli": "1.0.0",', '  "cli": "9.9.9",', '  "scaffolds": []', '}'].join('\n'),
    );
    const { bag } = await readManifest(await root(dir), DECLARATIONS, { cliVersion: CLI_VERSION });
    assert.deepEqual(codes(bag), ['E-JSON-DUPLICATE-KEY']);
    assert.equal(exitClassFor('E-JSON-DUPLICATE-KEY'), EXIT.integrityFault);
  });
});

test('US-15 duplicate key at depth is still E-JSON-DUPLICATE-KEY', async () => {
  await withTempDir(async (dir) => {
    await place(
      dir,
      [
        '{',
        '  "manifestVersion": 1,',
        '  "cli": "1.0.0",',
        '  "pack": { "name": "coding", "name": "writing", "version": "1.0.0", "formatVersion": 1 },',
        '  "scaffolds": []',
        '}',
      ].join('\n'),
    );
    const { bag } = await readManifest(await root(dir), DECLARATIONS, { cliVersion: CLI_VERSION });
    assert.deepEqual(codes(bag), ['E-JSON-DUPLICATE-KEY']);
  });
});

test('US-15 missing digest: E-MANIFEST-CORRUPT, exit 2, and NO manifest is returned', async () => {
  // The criterion names its own test: "delete the key and require exit 2
  // with no per-path report". There is no per-path report to suppress at
  // this layer — `verify` builds one — so the structural form of the same
  // claim is that no manifest comes back, which is what makes the
  // recomputation impossible rather than merely unwise.
  //
  // "There is no 'digest absent, so skip the check' branch, and its
  // absence is the point: that branch is the one anybody defeating the
  // check would take."
  await withTempDir(async (dir) => {
    const doc = document();
    delete doc['payloadDigest'];
    await place(dir, JSON.stringify(doc, null, 2));
    const { manifest: m, bag } = await readManifest(await root(dir), DECLARATIONS, {
      cliVersion: CLI_VERSION,
    });
    assert.deepEqual(codes(bag), ['E-MANIFEST-CORRUPT']);
    assert.equal(m, undefined);
  });
});

test('US-15 malformed digest: every near-miss shape is E-MANIFEST-CORRUPT', async () => {
  const hex = 'a1b2c3d4'.repeat(8);
  const malformed = [
    `sha256-${hex.toUpperCase()}`, // uppercase hex — the form a careless normaliser produces
    `sha256-${hex.slice(0, 63)}`, // one character short
    `sha256-${hex}0`, // one character long
    `sha1-${hex}`, // a different algorithm, right length
    hex, // the bare hash, no prefix
    '', // empty
  ];
  for (const value of malformed) {
    await withTempDir(async (dir) => {
      await place(dir, JSON.stringify(document({ payloadDigest: value }), null, 2));
      const { bag } = await readManifest(await root(dir), DECLARATIONS, { cliVersion: CLI_VERSION });
      assert.deepEqual(codes(bag), ['E-MANIFEST-CORRUPT'], `"${value}" must be refused`);
    });
  }
});

test('US-15 digest nested inside pack is refused', async () => {
  // Q-52 puts the digest top-level BECAUSE `pack` is what the pack
  // declared and the digest is what the apply observed. A manifest that
  // nested it is well-formed JSON carrying an observation in a declaration,
  // and it must not read as one missing the key by accident.
  await withTempDir(async (dir) => {
    const doc = document({
      pack: { name: 'coding', version: '1.0.0', formatVersion: 1, payloadDigest: DIGEST },
    });
    await place(dir, JSON.stringify(doc, null, 2));
    const { bag } = await readManifest(await root(dir), DECLARATIONS, { cliVersion: CLI_VERSION });
    assert.deepEqual(codes(bag), ['E-MANIFEST-CORRUPT']);
  });
});

test('US-15 newer manifest version: E-MANIFEST-NEWER, exit 2, and NEVER a warning', async () => {
  await withTempDir(async (dir) => {
    await place(dir, JSON.stringify(document({ manifestVersion: 2 }), null, 2));
    const { manifest: m, bag } = await readManifest(await root(dir), DECLARATIONS, {
      cliVersion: CLI_VERSION,
    });
    assert.deepEqual(codes(bag), ['E-MANIFEST-NEWER']);
    assert.equal(bag.warnings.length, 0, 'this is never a warning');
    assert.equal(bag.exitCode(), EXIT.integrityFault);
    assert.equal(m, undefined);
  });
});

test('US-15 newer manifest version is gated BEFORE the shape is judged', async () => {
  // The order is the point. A newer manifest may legitimately hold a shape
  // this CLI does not know, so judging the shape first reports
  // E-MANIFEST-CORRUPT — "restore it from version control" — for a file
  // that is not corrupt and whose real remedy is to upgrade the CLI.
  await withTempDir(async (dir) => {
    await place(dir, JSON.stringify({ manifestVersion: 99, somethingNew: true }, null, 2));
    const { bag } = await readManifest(await root(dir), DECLARATIONS, { cliVersion: CLI_VERSION });
    assert.deepEqual(codes(bag), ['E-MANIFEST-NEWER']);
  });
});

test('US-15 newer CLI recorded: W-MANIFEST-NEWER-CLI, and the command proceeds', async () => {
  await withTempDir(async (dir) => {
    await place(dir, canonicalJson(manifest({ cli: '1.4.0' })));
    const { manifest: m, bag } = await readManifest(await root(dir), DECLARATIONS, {
      cliVersion: CLI_VERSION,
    });
    assert.deepEqual(codes(bag), ['W-MANIFEST-NEWER-CLI']);
    assert.equal(bag.exitCode(), EXIT.ok, 'a notice never changes the exit code');
    assert.ok(m, 'commands proceed');
  });
});

test('US-15 newer CLI: no warning at the same version, and none for an older one', async () => {
  for (const recorded of ['1.0.0', '0.9.0']) {
    await withTempDir(async (dir) => {
      await place(dir, canonicalJson(manifest({ cli: recorded })));
      const { bag } = await readManifest(await root(dir), DECLARATIONS, { cliVersion: CLI_VERSION });
      assert.deepEqual(codes(bag), [], `${recorded} is not newer than ${CLI_VERSION}`);
    });
  }
});

test('US-15 newer pack than installed: W-PACK-NEWER-THAN-CLI, and verify still runs', async () => {
  await withTempDir(async (dir) => {
    await place(dir, canonicalJson(manifest({ pack: { name: 'coding', version: '1.4.0', formatVersion: 1 } })));
    const { manifest: m, bag } = await readManifest(await root(dir), DECLARATIONS, {
      cliVersion: CLI_VERSION,
      bundledPackVersion: '1.0.0',
    });
    assert.deepEqual(codes(bag), ['W-PACK-NEWER-THAN-CLI']);
    assert.equal(bag.exitCode(), EXIT.ok);
    // "verify still runs, because it needs only .harness/pack/ and the
    // manifest" — so the manifest must come back, not be withheld.
    assert.ok(m);
  });
});

test('US-15 hand-edited answer outside its own pattern: E-MANIFEST-ANSWER-INVALID, exit 2', async () => {
  // C-29's split, and it is the whole reason this code exists separately
  // from `E-PARAM-INVALID`: at collection a user typed the value and can
  // retype it (exit 1); on read-back NOBODY typed it, so the fault is a
  // manifest-integrity fault, which is what exit class 2 means.
  await withTempDir(async (dir) => {
    await place(dir, canonicalJson(manifest({ parameters: { projectName: '!!!', stack: 'node' } })));
    const { manifest: m, bag } = await readManifest(await root(dir), DECLARATIONS, {
      cliVersion: CLI_VERSION,
    });
    assert.deepEqual(codes(bag), ['E-MANIFEST-ANSWER-INVALID']);
    assert.equal(exitClassFor('E-MANIFEST-ANSWER-INVALID'), EXIT.integrityFault);
    assert.ok(!bag.has('E-PARAM-INVALID'), 'exit 1 is the collection occasion, not this one');
    assert.equal(m, undefined, 'no manifest, so no recomputation and no per-path report');
  });
});

test('US-15 hand-edited answer outside its enum is the same code', async () => {
  await withTempDir(async (dir) => {
    await place(dir, canonicalJson(manifest({ parameters: { projectName: 'Ok', stack: 'rust' } })));
    const { bag } = await readManifest(await root(dir), DECLARATIONS, { cliVersion: CLI_VERSION });
    assert.deepEqual(codes(bag), ['E-MANIFEST-ANSWER-INVALID']);
  });
});

test('US-10: a declared parameter with no recorded answer is refused', async () => {
  // US-10 requires EVERY declared parameter to be recorded, because a
  // `when` re-evaluated against `undefined` never matches and the step
  // silently vanishes — the user meets it as a missing file rather than as
  // an error. F1 names no code for the violation; this is the one whose
  // message states both of its causes ("the manifest was edited, or the
  // pack's declaration changed under it"). See the note in read.ts.
  await withTempDir(async (dir) => {
    await place(dir, canonicalJson(manifest({ parameters: { projectName: 'Ok' } })));
    const { manifest: m, bag } = await readManifest(await root(dir), DECLARATIONS, {
      cliVersion: CLI_VERSION,
    });
    assert.deepEqual(codes(bag), ['E-MANIFEST-ANSWER-INVALID']);
    assert.equal(m, undefined);
  });
});

test('US-15 forward compatibility: unknown keys survive a rewrite verbatim', async () => {
  // "an older CLI does not discard a newer one's data", at both levels
  // that have a closed key set. And no W-UNKNOWN-KEY: that code is
  // `defect` class — author-fixable — and there is no author here to fix
  // anything; warning would ask the user to delete the one thing forward
  // compatibility depends on, and `--strict` would make it fatal.
  await withTempDir(async (dir) => {
    const doc = document({
      mergeRecord: { paths: ['a/b'], nested: { deep: [1, 2, 3] } },
      pack: { name: 'coding', version: '1.0.0', formatVersion: 1, channel: 'beta' },
    });
    await place(dir, JSON.stringify(doc, null, 2));

    const r = await root(dir);
    const read = await readManifest(r, DECLARATIONS, { cliVersion: CLI_VERSION });
    assert.deepEqual(codes(read.bag), []);
    assert.ok(read.manifest);

    await writeManifest(r, read.manifest);
    const after = JSON.parse(
      await readFile(join(dir, '.harness', 'manifest.json'), 'utf8'),
    ) as Record<string, unknown>;

    assert.deepEqual(after['mergeRecord'], { paths: ['a/b'], nested: { deep: [1, 2, 3] } });
    assert.deepEqual(after['pack'], {
      name: 'coding',
      version: '1.0.0',
      formatVersion: 1,
      channel: 'beta',
    });
    assert.deepEqual(Object.keys(after), [...MANIFEST_KEYS, 'mergeRecord']);
  });
});

test('US-15 hand-edited but valid is undetectable, and deliberately so', async () => {
  // "the manifest carries no self-integrity field". Asserting the LIMIT is
  // the point: someone adding a self-hash later would have to delete this
  // test, which is a decision rather than an accident. The edit is caught
  // where F1 says it is — the recomputed tree differs from the tree on
  // disk, which is `verify`'s report, not this reader's.
  await withTempDir(async (dir) => {
    await place(dir, canonicalJson(manifest({ parameters: { projectName: 'Not what was applied', stack: 'dotnet' } })));
    const { manifest: m, bag } = await readManifest(await root(dir), DECLARATIONS, {
      cliVersion: CLI_VERSION,
    });
    assert.deepEqual(codes(bag), []);
    assert.equal(m?.parameters['projectName'], 'Not what was applied');
  });
});
