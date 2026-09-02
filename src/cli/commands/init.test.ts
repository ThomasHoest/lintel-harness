import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { INIT_TEXT, initOptions, runInit, type InitOptions } from './init.js';
import { JOURNAL_VERSION } from '../../fs/journal.js';

/**
 * `init`, in-process.
 *
 * **In-process is the requirement, not the convenience** (`F2-ADR-003`
 * §7): a test that spawns a process to read an exit code cannot assert
 * *zero bytes written* without a filesystem fixture per case, and zero
 * bytes is the claim that matters on every failure path.
 */

const streams = () => {
  const out: string[] = [];
  const err: string[] = [];
  return { out, err, streams: { out: (s: string) => out.push(s), err: (s: string) => err.push(s) } };
};

/** A recursive listing, so "nothing was written" is asserted against the
 *  whole tree rather than against a few paths somebody thought of. */
async function snapshot(dir: string): Promise<readonly string[]> {
  const out: string[] = [];
  async function visit(at: string, rel: string): Promise<void> {
    for (const e of await readdir(at, { withFileTypes: true })) {
      const child = rel === '' ? e.name : `${rel}/${e.name}`;
      out.push(child);
      if (e.isDirectory()) await visit(join(at, e.name), child);
    }
  }
  await visit(dir, '');
  return out.sort();
}

async function withTempDir(body: (dir: string) => Promise<void>): Promise<void> {
  const dir = await mkdtemp(join(tmpdir(), 'lintel-init-'));
  try {
    await body(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const opts = (over: Partial<InitOptions> & { projectRoot: string }): InitOptions => ({
  pack: 'coding',
  set: [],
  scaffolds: [],
  force: false,
  rollback: false,
  json: false,
  argv: [],
  ...over,
});

/* ── T-2001: the argv shape ──────────────────────────────────────────── */

test('pass 1 recognises the pack positional and init\'s own flags', () => {
  const { options, bag } = initOptions(
    ['coding', '--set', 'a=b', '--scaffold', 'x', '--force'],
    '/nowhere',
  );
  assert.deepEqual(
    bag.items.map((d) => d.code),
    [],
    'pass 1 judges nothing',
  );
  assert.equal(options.pack, 'coding');
  assert.deepEqual(options.set, ['a=b']);
  assert.deepEqual(options.scaffolds, ['x']);
  assert.equal(options.force, true);
  assert.equal(options.rollback, false);
});

test('pass 1 defers an unknown token without judging it', () => {
  // A pack-declared alias is indistinguishable from a typo until the pack
  // resolves; judging here is the whole bug the two-pass shape prevents.
  const { bag } = initOptions(['planning', '--calibration', 'high-floor'], '/nowhere');
  assert.deepEqual(bag.items.map((d) => d.code), []);
});

test('the argv is carried, because pass 2 re-parses it', () => {
  // Pass 1 cannot know whether `--calibration` takes a value, so it files
  // `high-floor` as a positional and the pairing is already lost in its
  // results. Only the original argv still has them attached.
  const { options } = initOptions(['planning', '--calibration', 'high-floor'], '/nowhere');
  assert.deepEqual(options.argv, ['planning', '--calibration', 'high-floor']);
});

test('init emits no JSON at v1.0, and the reserved field says so', () => {
  assert.equal(initOptions(['coding'], '/nowhere').options.json, false);
});

/* ── T-2106: the failure paths, each with zero bytes ─────────────────── */

test('no pack positional is E-CLI-PACK-MISSING, exit 1, zero bytes', async () => {
  await withTempDir(async (dir) => {
    const before = await snapshot(dir);
    const s = streams();
    const code = await runInit(opts({ pack: '', projectRoot: dir }), {
      streams: s.streams,
      prompt: null,
    });
    assert.equal(code, 1, 'nothing to correct, only something to supply');
    assert.match(s.err.join('\n'), /needs a pack name/);
    assert.ok(s.err.join('\n').includes('coding'), 'it names the bundled packs');
    assert.deepEqual(await snapshot(dir), before);
  });
});

test('an unknown pack is E-CLI-UNKNOWN-PACK, exit 1, zero bytes', async () => {
  await withTempDir(async (dir) => {
    const before = await snapshot(dir);
    const s = streams();
    const code = await runInit(opts({ pack: 'nope', projectRoot: dir }), {
      streams: s.streams,
      prompt: null,
    });
    // Exit 1, not 2: a user typed a name and can retype it (Q-67).
    assert.equal(code, 1);
    assert.match(s.err.join('\n'), /is not a pack bundled/);
    assert.deepEqual(await snapshot(dir), before);
  });
});

test('an existing .harness/ is E-ALREADY-APPLIED, exit 1, zero bytes, under --force', async () => {
  await withTempDir(async (dir) => {
    await mkdir(join(dir, '.harness'), { recursive: true });
    await writeFile(
      join(dir, '.harness', 'manifest.json'),
      JSON.stringify({ pack: { name: 'coding', version: '2.1.0' } }),
    );
    const before = await snapshot(dir);
    const s = streams();
    const code = await runInit(opts({ projectRoot: dir, force: true }), {
      streams: s.streams,
      prompt: null,
    });
    assert.equal(code, 1);
    const err = s.err.join('\n');
    assert.match(err, /already has coding@2\.1\.0 applied/, err);
    assert.deepEqual(await snapshot(dir), before, '--force never overrides it');
  });
});

test('an unreadable manifest still refuses, and does not become a class-2 fault', async () => {
  await withTempDir(async (dir) => {
    await mkdir(join(dir, '.harness'), { recursive: true });
    await writeFile(join(dir, '.harness', 'manifest.json'), '{ not json');
    const s = streams();
    const code = await runInit(opts({ projectRoot: dir }), { streams: s.streams, prompt: null });
    assert.equal(code, 1, 'a damaged manifest is a fact for the message, not an input to a decision');
    assert.match(s.err.join('\n'), /already has/);
  });
});

test('a journal present is E-JOURNAL-PRESENT, exit 2, and names the recorded command', async () => {
  await withTempDir(async (dir) => {
    await mkdir(join(dir, '.harness'), { recursive: true });
    await writeFile(
      join(dir, '.harness', 'journal.json'),
      JSON.stringify({
        version: JOURNAL_VERSION,
        command: 'init',
        entries: [{ path: 'a', intent: 'write', sha256: 'x', preExisting: false, preHash: null, preMode: null }],
        createdDirs: [],
      }),
    );
    const before = await snapshot(dir);
    const s = streams();
    const code = await runInit(opts({ projectRoot: dir }), { streams: s.streams, prompt: null });
    assert.equal(code, 2, 'an interrupted apply is an integrity fault, not a typo');
    assert.match(s.err.join('\n'), /--rollback/, 'the remedy is rendered from the recorded command');
    assert.deepEqual(await snapshot(dir), before);
  });
});

test('a journal of the wrong version is E-JOURNAL-UNREADABLE, never guessed at', async () => {
  await withTempDir(async (dir) => {
    await mkdir(join(dir, '.harness'), { recursive: true });
    await writeFile(
      join(dir, '.harness', 'journal.json'),
      JSON.stringify({ version: 2, command: 'init', entries: [], createdDirs: [] }),
    );
    const s = streams();
    const code = await runInit(opts({ projectRoot: dir }), { streams: s.streams, prompt: null });
    assert.equal(code, 2);
    assert.match(s.err.join('\n'), /will not guess/);
  });
});

test('a required answer with no terminal is E-PARAM-MISSING, exit 1, zero bytes', async () => {
  await withTempDir(async (dir) => {
    const before = await snapshot(dir);
    const s = streams();
    const code = await runInit(opts({ projectRoot: dir, argv: ['coding'] }), {
      streams: s.streams,
      prompt: null,
    });
    assert.equal(code, 1);
    assert.match(s.err.join('\n'), /is required and has no answer/);
    assert.deepEqual(await snapshot(dir), before, 'not even .harness/');
  });
});

test('an unknown scaffold id is E-SCAFFOLD-UNKNOWN, exit 1, zero bytes', async () => {
  await withTempDir(async (dir) => {
    const before = await snapshot(dir);
    const s = streams();
    const code = await runInit(
      opts({ projectRoot: dir, scaffolds: ['nope'], argv: ['coding', '--scaffold', 'nope'] }),
      { streams: s.streams, prompt: null },
    );
    assert.equal(code, 1);
    assert.match(s.err.join('\n'), /has no scaffold/);
    assert.deepEqual(await snapshot(dir), before);
  });
});

/* ── T-2105: --rollback ──────────────────────────────────────────────── */

test('--rollback with no journal exits 0 with zero bytes (Q-68)', async () => {
  await withTempDir(async (dir) => {
    const before = await snapshot(dir);
    const s = streams();
    const code = await runInit(opts({ pack: '', projectRoot: dir, rollback: true }), {
      streams: s.streams,
      prompt: null,
    });
    // Nothing is wrong, so nothing is an error and no code is invented.
    assert.equal(code, 0);
    assert.equal(s.out.join('\n'), INIT_TEXT.noJournal);
    assert.deepEqual(await snapshot(dir), before);
  });
});

test('--rollback takes no pack positional and no other flag', async () => {
  await withTempDir(async (dir) => {
    const s = streams();
    const code = await runInit(
      opts({ projectRoot: dir, rollback: true, force: true, set: ['a=b'] }),
      { streams: s.streams, prompt: null },
    );
    assert.equal(code, 1);
    const err = s.err.join('\n');
    assert.match(err, /does not take the argument "coding"/, err);
    assert.match(err, /--force is not available/, err);
    assert.match(err, /--set is not available/, err);
  });
});

test('--rollback short-circuits: it never reads the bundled pack', async () => {
  await withTempDir(async (dir) => {
    // An unknown pack name would be `E-CLI-UNKNOWN-PACK` on the apply
    // path. On the rollback path the positional is refused as unexpected,
    // which is only possible if nothing tried to resolve it.
    const s = streams();
    await runInit(opts({ pack: 'no-such-pack', projectRoot: dir, rollback: true }), {
      streams: s.streams,
      prompt: null,
    });
    assert.ok(!/is not a pack bundled/.test(s.err.join('\n')), s.err.join('\n'));
  });
});

/* ── T-2101…T-2104: the whole run ────────────────────────────────────── */

test('an apply produces the payload, the manifest and the disclosure', async () => {
  await withTempDir(async (dir) => {
    const s = streams();
    const code = await runInit(
      opts({
        projectRoot: dir,
        argv: ['coding', '--set', 'projectName=Demo', '--set', 'stack=TypeScript'],
      }),
      { streams: s.streams, prompt: null },
    );
    assert.equal(code, 0, s.err.join('\n'));

    const files = await snapshot(dir);
    assert.ok(files.includes('.harness/manifest.json'), 'the manifest is the last write');
    assert.ok(files.some((f) => f.startsWith('.harness/pack/')), 'phase 1 copied the payload');
    assert.ok(!files.includes('.harness/journal.json'), 'the journal is removed after the manifest');
    assert.ok(!files.includes('.harness/lock'), 'the lock is released as the last act');

    const manifest = JSON.parse(await readFile(join(dir, '.harness', 'manifest.json'), 'utf8')) as {
      manifestVersion: number;
      parameters: Record<string, string>;
      scaffolds: string[];
    };
    assert.deepEqual(Object.keys(manifest), [
      'manifestVersion',
      'cli',
      'pack',
      'payloadDigest',
      'parameters',
      'scaffolds',
    ]);
    assert.equal(manifest.parameters['projectName'], 'Demo');
    assert.deepEqual(manifest.scaffolds, []);
  });
});

test('the disclosure is one contiguous stderr block, delimited by a per-run nonce', async () => {
  await withTempDir(async (dir) => {
    const s = streams();
    await runInit(
      opts({
        projectRoot: dir,
        argv: ['coding', '--set', 'projectName=Demo'],
      }),
      { streams: s.streams, prompt: null },
    );
    const err = s.err.join('\n');
    const begin = /--- lintel disclosure begin ([0-9a-f]{32}) ---/.exec(err);
    assert.ok(begin, err.slice(0, 400));
    const nonce = begin[1] as string;
    // The consumer reads the nonce from the begin line and matches the end
    // line against what it read, never against a constant (IM-10).
    assert.ok(err.includes(`--- lintel disclosure end ${nonce} ---`));
    assert.equal(err.split('--- lintel disclosure begin').length - 1, 1, 'exactly once');
    assert.ok(err.includes('.claude/agents/'), 'row 4 names the agent files it places');
  });
});

test('the summary is stdout\'s and the disclosure is not', async () => {
  await withTempDir(async (dir) => {
    const s = streams();
    await runInit(
      opts({ projectRoot: dir, argv: ['coding', '--set', 'projectName=Demo'] }),
      { streams: s.streams, prompt: null },
    );
    const out = s.out.join('\n');
    assert.ok(!out.includes('--- lintel disclosure'), 'F6 captures the block from stderr');
    assert.match(out, /project-brief\.md/, 'IM-14 is on stdout');
  });
});

test('two applies with the same inputs produce byte-identical manifests', async () => {
  const manifests: string[] = [];
  for (let i = 0; i < 2; i++) {
    await withTempDir(async (dir) => {
      const s = streams();
      const code = await runInit(
        opts({ projectRoot: dir, argv: ['coding', '--set', 'projectName=Demo'] }),
        { streams: s.streams, prompt: null },
      );
      assert.equal(code, 0, s.err.join('\n'));
      manifests.push(await readFile(join(dir, '.harness', 'manifest.json'), 'utf8'));
    });
  }
  // No timestamp, absolute path, username, hostname or random value may
  // reach the manifest (F1 §NFR *Determinism*).
  assert.equal(manifests[0], manifests[1]);
});

test('a second init into an applied project refuses rather than merging', async () => {
  await withTempDir(async (dir) => {
    const first = streams();
    assert.equal(
      await runInit(
        opts({ projectRoot: dir, argv: ['coding', '--set', 'projectName=Demo'] }),
        { streams: first.streams, prompt: null },
      ),
      0,
      first.err.join('\n'),
    );

    const before = await snapshot(dir);
    const second = streams();
    const code = await runInit(
      opts({ projectRoot: dir, argv: ['coding', '--set', 'projectName=Demo'] }),
      { streams: second.streams, prompt: null },
    );
    assert.equal(code, 1);
    assert.match(second.err.join('\n'), /already has coding@/);
    assert.deepEqual(await snapshot(dir), before, 'zero bytes on the refusal');
  });
});

test('E-TARGET-EXISTS fires before the gate, and prints no disclosure', async () => {
  await withTempDir(async (dir) => {
    // Any planned applied path already present blocks the apply. `CLAUDE.md`
    // is one every pack writes.
    await writeFile(join(dir, 'CLAUDE.md'), 'mine\n');
    const before = await snapshot(dir);
    const s = streams();
    const code = await runInit(
      opts({ projectRoot: dir, argv: ['coding', '--set', 'projectName=Demo'] }),
      { streams: s.streams, prompt: null },
    );
    assert.equal(code, 1);
    assert.match(s.err.join('\n'), /files already exist where this pack would write/);
    assert.ok(!s.err.join('\n').includes('--- lintel disclosure'), 'nothing is disclosed on a refusal');
    assert.deepEqual(await snapshot(dir), before, 'not even .harness/');
  });
});
