/**
 * Rolling back an interrupted `update`. T-2403.
 *
 * The interesting row is the one F1's five-case table does not have:
 * **restoring a delete**. Everything else here is the existing table being
 * carried out rather than decided, and it is asserted end to end because
 * `apply/rollback.test.ts` already asserts the decisions without a
 * filesystem — the two halves fail differently and both matter.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { executeUpdate } from './execute-update.js';
import { journalPresent, performRollback } from './rollback-update.js';
import { renderText } from '../diag/catalogue.js';
import { buildJournal, type Journal } from '../fs/journal.js';
import { harnessPath, type HarnessPath } from '../security/harness-paths.js';
import { confinePath, type AppliedPath } from '../security/confine.js';
import { hashBytes } from '../hash/sha256.js';
import { resolveRoot, type ProjectRoot } from '../security/resolve.js';
import type { PlannedFile } from '../apply/plan.js';
import type { PlannedWrite } from './plan-update.js';

const B = (s: string): Buffer => Buffer.from(s, 'utf8');
const codes = (b: { items: readonly { code: string }[] }): string[] => b.items.map((d) => d.code);

const ap = (p: string): AppliedPath => {
  const r = confinePath(p, { index: 0 });
  if (r.path === undefined) throw new Error(p);
  return r.path;
};
const hp = (p: string): HarnessPath => {
  const h = harnessPath(p);
  if (h === undefined) throw new Error(p);
  return h;
};

interface Harnessed {
  readonly root: ProjectRoot;
  readonly dir: string;
  journal?: Journal;
  removed: number;
}

async function withProject<T>(body: (h: Harnessed) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), 'lintel-rollback-'));
  try {
    const r = await resolveRoot(dir);
    assert.ok(r.root, 'the temp dir must resolve as a project root');
    return await body({ root: r.root, dir, removed: 0 });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function put(dir: string, relative: string, content: string): Promise<void> {
  const full = join(dir, ...relative.split('/'));
  await mkdir(join(full, '..'), { recursive: true });
  await writeFile(full, content, 'utf8');
}

const read = async (absolute: string): Promise<Buffer | null> =>
  readFile(absolute).catch(() => null);

/**
 * Run an update that stops after its writes, leaving the journal — the
 * on-disk state a crash between phase 2 and the manifest produces.
 *
 * Driving rollback from a **real** interrupted run rather than a
 * hand-built journal is the point: a journal this executor never wrote is
 * a journal that proves nothing about this executor.
 */
async function interrupt(
  h: Harnessed,
  over: {
    payloadWrites?: readonly PlannedFile[];
    payloadDeletes?: readonly HarnessPath[];
    writes?: readonly PlannedWrite[];
  },
): Promise<void> {
  await executeUpdate({
    root: h.root,
    payloadWrites: over.payloadWrites ?? [],
    payloadDeletes: over.payloadDeletes ?? [],
    writes: over.writes ?? [],
    fillExpected: [],
    manifest: { path: hp('.harness/manifest.json'), bytes: B('{"manifestVersion":1,"new":true}\n') },
    writeJournal: async (j) => {
      h.journal = j;
      await put(h.dir, '.harness/journal.json', JSON.stringify(j));
    },
    // The crash: the journal is never removed, which is exactly the state
    // `E-JOURNAL-PRESENT` describes.
    removeJournal: async () => {},
    readExisting: async (p) => read(join(h.dir, ...p.split('/'))),
  });
}

function io(h: Harnessed) {
  return {
    read,
    removeJournal: async (): Promise<void> => {
      h.removed++;
      await rm(join(h.dir, '.harness/journal.json'), { force: true });
      await rm(join(h.dir, '.harness/journal.d'), { recursive: true, force: true });
    },
  };
}

// ── T-2403: the remedy names the command that crashed ───────────────────

test('E-JOURNAL-PRESENT is rendered from the journal, never from a fixed command', async () => {
  // Through F1 v2.9 the line said `init --rollback` unconditionally, which
  // after a crashed `update` sends the user to a command that answers
  // `E-ALREADY-APPLIED`. A remedy that cannot work is worse than none.
  const one = buildJournal('update', [], []);
  const two = buildJournal('init', [], []);

  assert.equal(journalPresent(one).code, 'E-JOURNAL-PRESENT');
  // The values, not the prose: what is asserted is that `command` comes
  // from the journal and `n` from its entries.
  assert.equal(journalPresent(one).message, renderText('E-JOURNAL-PRESENT', { command: 'update', n: '0' }, {}));
  assert.notEqual(journalPresent(one).message, journalPresent(two).message);
});

// ── the new row: restoring a delete ─────────────────────────────────────

test('rollback restores a payload file the update deleted', async () => {
  await withProject(async (h) => {
    await put(h.dir, '.harness/manifest.json', '{"manifestVersion":1,"old":true}\n');
    await put(h.dir, '.harness/pack/gone.md', 'DROPPED');

    await interrupt(h, { payloadDeletes: [hp('.harness/pack/gone.md')] });
    await assert.rejects(stat(join(h.dir, '.harness/pack/gone.md')), 'the update removed it');

    const r = await performRollback(h.root, h.journal as Journal, io(h));

    assert.deepEqual(codes(r.bag), []);
    assert.equal(r.complete, true);
    // A delete entry has no intended hash, so "still exactly what we wrote"
    // becomes "still absent" — and restoring is then unconditional.
    assert.equal(await readFile(join(h.dir, '.harness/pack/gone.md'), 'utf8'), 'DROPPED');
    // The manifest comes back too, which is what makes US-65's invariant
    // recoverable rather than merely stated.
    assert.equal(await readFile(join(h.dir, '.harness/manifest.json'), 'utf8'), '{"manifestVersion":1,"old":true}\n');
    assert.equal(h.removed, 1);
  });
});

test('rollback keeps a deleted path something else has taken', async () => {
  await withProject(async (h) => {
    await put(h.dir, '.harness/manifest.json', '{"manifestVersion":1}\n');
    await put(h.dir, '.harness/pack/gone.md', 'DROPPED');
    await interrupt(h, { payloadDeletes: [hp('.harness/pack/gone.md')] });

    // Something is there that this run did not put there.
    await put(h.dir, '.harness/pack/gone.md', 'SOMEONE ELSE');

    const r = await performRollback(h.root, h.journal as Journal, io(h));
    assert.deepEqual(codes(r.bag), ['W-ROLLBACK-KEPT']);
    assert.deepEqual(r.kept, ['.harness/pack/gone.md']);
    assert.equal(await readFile(join(h.dir, '.harness/pack/gone.md'), 'utf8'), 'SOMEONE ELSE');
  });
});

// ── the five existing cases, carried out rather than decided ────────────

test('rollback reverses both writes and deletes in one pass', async () => {
  await withProject(async (h) => {
    await put(h.dir, '.harness/manifest.json', '{"manifestVersion":1,"old":true}\n');
    await put(h.dir, '.harness/pack/keep.md', 'PAYLOAD v1');
    await put(h.dir, '.harness/pack/gone.md', 'DROPPED');
    await put(h.dir, 'doc.md', 'APPLIED v1');

    await interrupt(h, {
      payloadWrites: [
        {
          path: hp('.harness/pack/keep.md'),
          bytes: B('PAYLOAD v2'),
          phase: 1,
          executable: false,
          preExisting: true,
          preHash: hashBytes(B('PAYLOAD v1')),
          preMode: 0o644,
        },
      ],
      payloadDeletes: [hp('.harness/pack/gone.md')],
      writes: [
        {
          path: ap('doc.md'),
          bytes: B('APPLIED v2'),
          mode: 0o644,
          disposition: 'replaced',
          preHash: hashBytes(B('APPLIED v1')),
          preMode: 0o644,
        },
        { path: ap('fresh.md'), bytes: B('NEW'), mode: 0o644, disposition: 'added', preHash: null, preMode: null },
      ],
    });

    const r = await performRollback(h.root, h.journal as Journal, io(h));
    assert.deepEqual(codes(r.bag), []);
    assert.equal(r.complete, true);

    assert.equal(await readFile(join(h.dir, '.harness/pack/keep.md'), 'utf8'), 'PAYLOAD v1');
    assert.equal(await readFile(join(h.dir, '.harness/pack/gone.md'), 'utf8'), 'DROPPED');
    assert.equal(await readFile(join(h.dir, 'doc.md'), 'utf8'), 'APPLIED v1');
    assert.equal(await readFile(join(h.dir, '.harness/manifest.json'), 'utf8'), '{"manifestVersion":1,"old":true}\n');
    // A file the run created and nobody has touched is removed.
    await assert.rejects(stat(join(h.dir, 'fresh.md')));
  });
});

test('a file edited after the crash is kept, whatever the journal says', async () => {
  // The clause the whole table is gated on: a crashed update leaves a
  // project a user may have started fixing, and rollback must never undo
  // that.
  await withProject(async (h) => {
    await put(h.dir, '.harness/manifest.json', '{"manifestVersion":1}\n');
    await put(h.dir, 'doc.md', 'APPLIED v1');
    await interrupt(h, {
      writes: [
        {
          path: ap('doc.md'),
          bytes: B('APPLIED v2'),
          mode: 0o644,
          disposition: 'replaced',
          preHash: hashBytes(B('APPLIED v1')),
          preMode: 0o644,
        },
      ],
    });

    await put(h.dir, 'doc.md', 'I FIXED IT MYSELF');

    const r = await performRollback(h.root, h.journal as Journal, io(h));
    assert.deepEqual(codes(r.bag), ['W-ROLLBACK-KEPT']);
    assert.deepEqual(r.kept, ['doc.md']);
    assert.equal(await readFile(join(h.dir, 'doc.md'), 'utf8'), 'I FIXED IT MYSELF');
  });
});

// ── the journal is a file on disk like any other ────────────────────────

test('a journalled path that will not re-mint stops the rollback, having written nothing', async () => {
  // A path taken from the journal and used directly would be the one write
  // in the product that skipped the gate (C-14). `E-JOURNAL-UNREADABLE` is
  // the honest code: the record cannot be acted on.
  await withProject(async (h) => {
    await put(h.dir, 'doc.md', 'MINE');
    const forged: Journal = {
      version: 3,
      command: 'update',
      entries: [
        {
          path: '../outside.md',
          intent: 'write',
          sha256: hashBytes(B('x')),
          preExisting: false,
          preHash: null,
          preMode: null,
        },
      ],
      createdDirs: [],
    };

    const r = await performRollback(h.root, forged, io(h));
    assert.deepEqual(codes(r.bag), ['E-JOURNAL-UNREADABLE']);
    assert.equal(r.complete, false);
    assert.equal(h.removed, 0, 'a rollback that could not run must leave its own record in place');
    assert.equal(await readFile(join(h.dir, 'doc.md'), 'utf8'), 'MINE');
  });
});
