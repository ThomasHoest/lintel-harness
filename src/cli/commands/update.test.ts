import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { runInit } from './init.js';
import { UPDATE_TEXT, runUpdate, updateOptions, type UpdateOptions } from './update.js';
import { MESSAGES } from '../../diag/catalogue.js';
import { JOURNAL_VERSION } from '../../fs/journal.js';
import type { DiagnosticCode } from '../../diag/codes.js';

/**
 * `update`, in-process against a real applied project.
 *
 * **In-process is the requirement, not the convenience**, and it is the
 * same one `init.test.ts` states: a test that spawns a process to read an
 * exit code cannot assert *zero bytes written*, and on this command zero
 * bytes is the claim that matters most — a classification defect here is a
 * **data-loss** defect, not a reporting one.
 *
 * These tests assert **codes and exit classes**, never prose. Where a
 * message has to be recognised, the expectation is rendered from the
 * catalogue's own template stem, so the catalogue stays free to reword
 * itself and a *different code* is what fails.
 *
 * **What they cannot cover, and who owes it.** The version bump here is
 * simulated by rewriting the manifest's recorded version, so
 * `expected_old` and `expected_new` come from the same payload and nothing
 * classifies `replaced`. A genuine two-version fixture — with a path the
 * newer pack changed, a payload orphan, and a `fillExpected` path the
 * newer pack rewrote — is T-2404's and T-2405's, in `tests/integration/`.
 */

/* ── fixtures ────────────────────────────────────────────────────────── */

const streams = () => {
  const out: string[] = [];
  const err: string[] = [];
  return { out, err, streams: { out: (s: string) => out.push(s), err: (s: string) => err.push(s) } };
};

/** A recursive **content** fingerprint. Names alone would let a rewritten
 *  file pass as untouched, which is exactly what `--dry-run` must not do. */
async function fingerprint(dir: string): Promise<readonly string[]> {
  const out: string[] = [];
  async function visit(at: string, rel: string): Promise<void> {
    for (const e of await readdir(at, { withFileTypes: true })) {
      const child = rel === '' ? e.name : `${rel}/${e.name}`;
      if (e.isDirectory()) {
        out.push(`d ${child}`);
        await visit(join(at, e.name), child);
        continue;
      }
      const bytes = await readFile(join(at, e.name));
      out.push(`f ${child} ${createHash('sha256').update(bytes).digest('hex')}`);
    }
  }
  await visit(dir, '');
  return out.sort();
}

async function withTempDir(body: (dir: string) => Promise<void>): Promise<void> {
  const dir = await mkdtemp(join(tmpdir(), 'lintel-update-'));
  try {
    await body(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/** Apply `coding` exactly as a user would. */
async function applied(dir: string): Promise<void> {
  const s = streams();
  const code = await runInit(
    {
      pack: 'coding',
      projectRoot: dir,
      set: ['projectName=Demo'],
      scaffolds: [],
      force: false,
      rollback: false,
      json: false,
      // `runInit` re-parses `argv` in pass 2 with the pack's aliases, so
      // the answer has to be there and not only in `set`.
      argv: ['coding', '--set', 'projectName=Demo'],
    },
    { streams: s.streams, prompt: null },
  );
  assert.equal(code, 0, s.err.join('\n'));
}

/**
 * Make the project look one version behind.
 *
 * The recorded version is the **only** thing `update` compares against
 * (US-70, Q-3), and `.harness/pack/` is untouched — so the digest gate
 * still passes and the run proceeds exactly as a real bump would.
 */
async function recordVersion(dir: string, version: string): Promise<void> {
  const file = join(dir, '.harness', 'manifest.json');
  const doc = JSON.parse(await readFile(file, 'utf8')) as {
    pack: { version: string };
  };
  doc.pack.version = version;
  await writeFile(file, `${JSON.stringify(doc, null, 2)}\n`, 'utf8');
}

const opts = (over: Partial<UpdateOptions> & { projectRoot: string }): UpdateOptions => ({
  dryRun: false,
  json: false,
  rollback: false,
  positionals: [],
  ...over,
});

/**
 * The longest placeholder-free fragment of a code's own message template.
 *
 * Recognising a code by **its own template** rather than by a sentence
 * copied into the test is what keeps this a code assertion: F1 is free to
 * reword the catalogue and these tests follow it, while a *different code*
 * still fails. The prefix alone is not enough — `E-FLAG-NOT-PERMITTED`
 * begins `lintel: --{flag}`, whose literal prefix is ten characters and
 * would match almost anything.
 */
function stem(code: DiagnosticCode): string {
  const fragments = (MESSAGES[code] as readonly string[]).flatMap((line) =>
    line.split(/\{[^}]*\}/),
  );
  const longest = fragments.reduce((a, b) => (b.length > a.length ? b : a), '');
  assert.ok(longest.length > 20, `${code}'s template is too generic to recognise`);
  return longest;
}

/* ── T-2503: the argv surface ────────────────────────────────────────── */

test('--dry-run and --json are recognised, and nothing else is needed', () => {
  const { options, bag } = updateOptions(['--dry-run', '--json'], '/nowhere');
  assert.deepEqual(bag.items.map((d) => d.code), []);
  assert.equal(options.dryRun, true);
  assert.equal(options.json, true);
  assert.deepEqual(options.positionals, []);
});

test('one pass, not two: an unknown flag is judged immediately', () => {
  // `update` accepts no `--set` and no pack-declared alias — an answer
  // cannot be supplied after the apply (Q-21) — so there is no alias to
  // wait for and failing closed at the first token is correct here.
  const { bag } = updateOptions(['--calibration', 'high-floor'], '/nowhere');
  assert.deepEqual(bag.items.map((d) => d.code), ['E-CLI-UNKNOWN-FLAG']);
});

test('a positional is E-CLI-ARG-UNEXPECTED, exit 1, zero bytes', async () => {
  // US-59: `update` takes no pack argument and no version argument. Two
  // arguments a user could get wrong, removed by having neither — and it
  // makes the command un-runnable against a pack the project never
  // applied, which is Q-12 enforced by the surface.
  await withTempDir(async (dir) => {
    const before = await fingerprint(dir);
    const s = streams();
    const code = await runUpdate(opts({ projectRoot: dir, positionals: ['coding'] }), {
      streams: s.streams,
    });
    assert.equal(code, 1);
    assert.ok(s.err.join('\n').includes(stem('E-CLI-ARG-UNEXPECTED')));
    assert.deepEqual(await fingerprint(dir), before);
  });
});

test('--json without --dry-run is refused, not ignored', async () => {
  // US-63, IM-41. A machine that wants the plan runs `--dry-run --json`,
  // which is also the mode in which reading it can change nothing.
  await withTempDir(async (dir) => {
    const before = await fingerprint(dir);
    const s = streams();
    const code = await runUpdate(opts({ projectRoot: dir, json: true }), { streams: s.streams });
    assert.equal(code, 1);
    assert.ok(s.err.join('\n').includes(stem('E-FLAG-NOT-PERMITTED')));
    assert.deepEqual(await fingerprint(dir), before);
  });
});

/* ── §F3.2 steps 1–2: nothing applied, and a crashed run ─────────────── */

test('no manifest is E-MANIFEST-MISSING, exit 1, zero bytes', async () => {
  await withTempDir(async (dir) => {
    const before = await fingerprint(dir);
    const s = streams();
    const code = await runUpdate(opts({ projectRoot: dir }), { streams: s.streams });
    assert.equal(code, 1, 'nothing to correct, only something to apply first');
    assert.ok(s.err.join('\n').includes(stem('E-MANIFEST-MISSING')));
    assert.deepEqual(await fingerprint(dir), before);
  });
});

test('a journal outranks every other question, in both modes', async () => {
  // §F3.2: step 1 precedes step 4 on purpose. A crash between phase 1 and
  // phase 2 leaves a NEW payload beside an OLD manifest, which the digest
  // gate would report as a tampered payload — so the user would meet a
  // message whose remedy does not help. This ordering is what puts
  // `E-JOURNAL-PRESENT` in front of it instead.
  await withTempDir(async (dir) => {
    await applied(dir);
    await writeFile(
      join(dir, '.harness', 'journal.json'),
      JSON.stringify({
        version: JOURNAL_VERSION,
        command: 'update',
        entries: [],
        createdDirs: [],
      }),
    );
    const before = await fingerprint(dir);
    for (const dryRun of [false, true]) {
      const s = streams();
      const code = await runUpdate(opts({ projectRoot: dir, dryRun }), { streams: s.streams });
      assert.equal(code, 2, 'an interrupted run is an integrity fault');
      assert.ok(s.err.join('\n').includes(stem('E-JOURNAL-PRESENT')));
    }
    assert.deepEqual(await fingerprint(dir), before);
  });
});

/* ── US-64: the digest gate, in BOTH modes ───────────────────────────── */

test('an edited payload suppresses the classification, exit 2, zero bytes, both modes', async () => {
  // **The assertion that matters most in this feature.** `expected_old` is
  // computed FROM `.harness/pack/`; a corrupted payload is exactly what
  // makes an edited file classify as unedited and get replaced. No flag
  // relaxes it, and `--dry-run` relaxes it least of all (IM-41).
  await withTempDir(async (dir) => {
    await applied(dir);
    await writeFile(join(dir, '.harness', 'pack', 'pack.json.tampered'), 'x', 'utf8');
    const before = await fingerprint(dir);
    for (const dryRun of [false, true]) {
      const s = streams();
      const code = await runUpdate(opts({ projectRoot: dir, dryRun }), { streams: s.streams });
      assert.equal(code, 2);
      assert.ok(s.err.join('\n').includes(stem('E-PAYLOAD-DIGEST-MISMATCH')));
      assert.equal(s.out.length, 0, 'the per-path report is empty');
    }
    assert.deepEqual(await fingerprint(dir), before);
  });
});

/* ── US-70: nothing to update to ─────────────────────────────────────── */

test('a current project exits 0 with zero bytes and no code, in both modes', async () => {
  // Nothing is wrong and nothing is expected to change, so no code is
  // raised for it.
  await withTempDir(async (dir) => {
    await applied(dir);
    const before = await fingerprint(dir);
    for (const dryRun of [false, true]) {
      const s = streams();
      const code = await runUpdate(opts({ projectRoot: dir, dryRun }), { streams: s.streams });
      assert.equal(code, 0);
      assert.equal(s.err.length, 0, 'no diagnostic, and no disclosure for a run that does nothing');
      assert.match(s.out.join('\n'), /coding 1\.0\.0/);
    }
    assert.deepEqual(await fingerprint(dir), before);
  });
});

test('a bundled pack older than the applied one is refused, exit 1, zero bytes', async () => {
  // US-70. `update` moves a project forward, not back: a downgrade that
  // replaced unedited paths would be indistinguishable in the report from
  // an upgrade that did.
  await withTempDir(async (dir) => {
    await applied(dir);
    await recordVersion(dir, '99.0.0');
    const before = await fingerprint(dir);
    const s = streams();
    const code = await runUpdate(opts({ projectRoot: dir }), { streams: s.streams });
    assert.equal(code, 1);
    assert.ok(s.err.join('\n').includes(stem('E-UPDATE-NOT-NEWER')));
    assert.deepEqual(await fingerprint(dir), before);
  });
});

/* ── T-2503 / T-2506: `--dry-run` ────────────────────────────────────── */

test('--dry-run exits 1 with E-UPDATE-AVAILABLE and leaves the tree byte-identical', async () => {
  // T-2506's assertion: the working tree AND `.harness/` unchanged by
  // content, `.harness/lock` and `.harness/journal.json` included — absent
  // before, absent after.
  await withTempDir(async (dir) => {
    await applied(dir);
    await recordVersion(dir, '0.9.0');
    const before = await fingerprint(dir);

    const s = streams();
    const code = await runUpdate(opts({ projectRoot: dir, dryRun: true }), { streams: s.streams });

    assert.equal(code, 1, 'the read-only mode gates');
    assert.ok(s.err.join('\n').includes(stem('E-UPDATE-AVAILABLE')));
    assert.deepEqual(await fingerprint(dir), before, '--dry-run writes nothing, of any kind');
  });
});

test('--dry-run prints the disclosure, complete and delimited', async () => {
  // US-67: this is the surface at which an adopter reads what a newer pack
  // version would newly grant, **before** anything is written — the
  // pre-inspection `pack info` provides for `init`.
  await withTempDir(async (dir) => {
    await applied(dir);
    await recordVersion(dir, '0.9.0');
    const s = streams();
    await runUpdate(opts({ projectRoot: dir, dryRun: true }), { streams: s.streams });
    const err = s.err.join('\n');
    assert.match(err, /--- lintel disclosure begin [0-9a-f]{32} ---/);
    assert.match(err, /--- lintel disclosure end [0-9a-f]{32} ---/);
  });
});

test('--dry-run --json puts the document on stdout and nothing else', async () => {
  await withTempDir(async (dir) => {
    await applied(dir);
    await recordVersion(dir, '0.9.0');
    const s = streams();
    const code = await runUpdate(opts({ projectRoot: dir, dryRun: true, json: true }), {
      streams: s.streams,
    });
    assert.equal(code, 1);
    const doc = JSON.parse(s.out.join('\n')) as {
      command: string;
      from: { version: string };
      to: { version: string };
      digest: { matched: boolean };
      entries: { path: string; disposition: string }[];
    };
    assert.equal(doc.command, 'update');
    assert.equal(doc.from.version, '0.9.0');
    assert.equal(doc.to.version, '1.0.0');
    assert.equal(doc.digest.matched, true);
    assert.ok(doc.entries.length > 0);
    // Q-56: the generated CLAUDE.md is adapt-expected in all three packs,
    // so EVERY update of EVERY project hands at least one path over.
    assert.ok(doc.entries.some((e) => e.disposition === 'kept-adapted'));
  });
});

/* ── the write path, end to end ──────────────────────────────────────── */

test('a completed update exits 0, leaves the edited path alone, and rewrites the manifest', async () => {
  // Q-78, and it is the assertion most likely to be "corrected": the
  // writing mode reports rather than gates, so edited paths outstanding do
  // not move the exit code. See `report.test.ts` for why.
  await withTempDir(async (dir) => {
    await applied(dir);
    const mine = join(dir, 'specifications', 'README.md');
    const edited = `${await readFile(mine, 'utf8')}\n<!-- mine -->\n`;
    await writeFile(mine, edited, 'utf8');
    const brief = join(dir, 'specifications', 'project-brief.md');
    const briefBefore = await readFile(brief);
    await recordVersion(dir, '0.9.0');

    const s = streams();
    const code = await runUpdate(opts({ projectRoot: dir }), { streams: s.streams });

    assert.equal(code, 0, s.err.join('\n'));
    assert.equal(await readFile(mine, 'utf8'), edited, 'an edited path survives untouched');
    assert.deepEqual(await readFile(brief), briefBefore, 'a fill-expected path is never overwritten');

    const manifest = JSON.parse(await readFile(join(dir, '.harness', 'manifest.json'), 'utf8')) as {
      pack: { version: string };
      parameters: Record<string, string>;
    };
    assert.equal(manifest.pack.version, '1.0.0', 'the manifest is the commit point');
    assert.equal(manifest.parameters['projectName'], 'Demo', 'answers are recomputed, not re-asked');

    const harnessDir = await readdir(join(dir, '.harness'));
    assert.ok(!harnessDir.includes('journal.json'), 'the journal is removed on success');
    assert.ok(!harnessDir.includes('journal.d'), 'and so are its backups');
    assert.ok(!harnessDir.includes('lock'), 'the lock is released');

    // The report is the handover, and it names what was left (US-72).
    assert.match(s.out.join('\n'), /specifications\/README\.md/);
  });
});

test('a second update finds the project current', async () => {
  // The manifest and the payload move together or neither moves (US-65),
  // so the run that just completed leaves a project `update` recognises as
  // done rather than one it would half-repeat.
  await withTempDir(async (dir) => {
    await applied(dir);
    await recordVersion(dir, '0.9.0');
    assert.equal(await runUpdate(opts({ projectRoot: dir }), { streams: streams().streams }), 0);
    const s = streams();
    assert.equal(await runUpdate(opts({ projectRoot: dir }), { streams: s.streams }), 0);
    assert.equal(s.err.length, 0, 'and it says so without raising anything');
  });
});

test('a held lock stops the writing mode and never the read-only one', async () => {
  // US-49. `E-LOCK-HELD` is genuinely reachable on this command, unlike at
  // `init` where step 1 refuses any project that already has a
  // `.harness/`. `--dry-run` takes no lock at all (US-63).
  await withTempDir(async (dir) => {
    await applied(dir);
    await recordVersion(dir, '0.9.0');
    await writeFile(
      join(dir, '.harness', 'lock'),
      JSON.stringify({ pid: process.pid, host: 'elsewhere', startedAt: new Date().toISOString(), cli: '1.0.0' }),
    );
    const before = await fingerprint(dir);

    const s = streams();
    const code = await runUpdate(opts({ projectRoot: dir }), { streams: s.streams });
    assert.equal(code, 1);
    assert.ok(s.err.join('\n').includes(stem('E-LOCK-HELD')));
    assert.deepEqual(await fingerprint(dir), before, 'the lock is taken after the plan, so nothing moved');

    const dry = streams();
    assert.equal(
      await runUpdate(opts({ projectRoot: dir, dryRun: true }), { streams: dry.streams }),
      1,
      'the read-only mode does not contend for a lock it never takes',
    );
    assert.ok(dry.err.join('\n').includes(stem('E-UPDATE-AVAILABLE')));
  });
});

/* ── `update --rollback` ─────────────────────────────────────────────── */

test('--rollback with no journal writes nothing and exits 0', async () => {
  // Q-68: nothing is wrong, so nothing is an error, and no code is
  // invented for it.
  await withTempDir(async (dir) => {
    await applied(dir);
    const before = await fingerprint(dir);
    const s = streams();
    const code = await runUpdate(opts({ projectRoot: dir, rollback: true }), { streams: s.streams });
    assert.equal(code, 0);
    assert.equal(s.out.join('\n'), UPDATE_TEXT.noJournal);
    assert.deepEqual(await fingerprint(dir), before);
  });
});

test('--rollback restores what an interrupted update wrote', async () => {
  // The journal is not a nicety on this command — it is the only recovery
  // (US-66), because a crashed update leaves a project full of the user's
  // work with no *delete `.harness/` and start over* fallback.
  await withTempDir(async (dir) => {
    await applied(dir);
    const victim = join(dir, 'specifications', 'README.md');
    const original = await readFile(victim, 'utf8');

    // A journal exactly as `executeUpdate` would have left it mid-run: one
    // overwritten path, its pre-update bytes backed up under journal.d/.
    await mkdir(join(dir, '.harness', 'journal.d'), { recursive: true });
    await writeFile(join(dir, '.harness', 'journal.d', '0000-README.md'), original, 'utf8');
    const damaged = 'half-written\n';
    await writeFile(victim, damaged, 'utf8');
    await writeFile(
      join(dir, '.harness', 'journal.json'),
      JSON.stringify({
        version: JOURNAL_VERSION,
        command: 'update',
        entries: [
          {
            path: 'specifications/README.md',
            intent: 'write',
            sha256: createHash('sha256').update(damaged).digest('hex'),
            preExisting: true,
            preHash: createHash('sha256').update(original).digest('hex'),
            preMode: 0o644,
            backup: '.harness/journal.d/0000-README.md',
          },
        ],
        createdDirs: [],
      }),
    );

    const s = streams();
    const code = await runUpdate(opts({ projectRoot: dir, rollback: true }), { streams: s.streams });
    assert.equal(code, 0, s.err.join('\n'));
    assert.equal(await readFile(victim, 'utf8'), original, 'the pre-update bytes come back');
    const harnessDir = await readdir(join(dir, '.harness'));
    assert.ok(!harnessDir.includes('journal.json'), 'and the journal goes only once it has');
  });
});

test('--rollback rejects --dry-run alongside it', async () => {
  await withTempDir(async (dir) => {
    const s = streams();
    const code = await runUpdate(opts({ projectRoot: dir, rollback: true, dryRun: true }), {
      streams: s.streams,
    });
    assert.equal(code, 1);
    assert.ok(s.err.join('\n').includes(stem('E-FLAG-NOT-PERMITTED')));
  });
});
