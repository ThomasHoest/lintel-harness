/**
 * The write path. T-2401, T-2402, T-2407, and Q-79 at write time.
 *
 * **These tests are about a command that overwrites the user's files.**
 * `init`'s executor writes into a directory with no pack content in it;
 * this one writes on top of work, so every assertion below about *nothing
 * was written* is an assertion about data loss and not about tidiness.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, readdir, rm, stat, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { executeUpdate, type UpdateWriteInputs } from './execute-update.js';
import { readJournal, type Journal } from '../fs/journal.js';
import { confinePath, type AppliedPath } from '../security/confine.js';
import { harnessPath } from '../security/harness-paths.js';
import { hashBytes } from '../hash/sha256.js';
import { resolveRoot, type ProjectRoot } from '../security/resolve.js';
import type { HarnessPath } from '../security/harness-paths.js';
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

const payloadFile = (path: HarnessPath, content: string, over: Partial<PlannedFile> = {}): PlannedFile => ({
  path,
  bytes: B(content),
  phase: 1,
  executable: false,
  preExisting: false,
  preHash: null,
  preMode: null,
  ...over,
});

const applied = (
  path: string,
  content: string,
  disposition: 'added' | 'replaced',
  preHash: string | null = null,
): PlannedWrite => ({
  path: ap(path),
  bytes: B(content),
  mode: 0o644,
  disposition,
  preHash,
  preMode: preHash === null ? null : 0o644,
});

interface Harnessed {
  readonly root: ProjectRoot;
  readonly dir: string;
  readonly journals: Journal[];
  removed: number;
}

async function withProject<T>(body: (h: Harnessed) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), 'lintel-update-'));
  try {
    const r = await resolveRoot(dir);
    assert.ok(r.root, 'the temp dir must resolve as a project root');
    return await body({ root: r.root, dir, journals: [], removed: 0 });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function put(dir: string, relative: string, content: string): Promise<void> {
  const full = join(dir, ...relative.split('/'));
  await mkdir(join(full, '..'), { recursive: true });
  await writeFile(full, content, 'utf8');
}

function inputs(h: Harnessed, over: Partial<UpdateWriteInputs> = {}): UpdateWriteInputs {
  return {
    root: h.root,
    payloadWrites: [],
    payloadDeletes: [],
    writes: [],
    fillExpected: [],
    manifest: { path: hp('.harness/manifest.json'), bytes: B('{"manifestVersion":1}\n') },
    writeJournal: async (j) => {
      h.journals.push(j);
      await put(h.dir, '.harness/journal.json', JSON.stringify(j));
    },
    removeJournal: async () => {
      h.removed++;
      await rm(join(h.dir, '.harness/journal.json'), { force: true });
      await rm(join(h.dir, '.harness/journal.d'), { recursive: true, force: true });
    },
    readExisting: async (p) => readFile(join(h.dir, ...p.split('/'))).catch(() => null),
    ...over,
  };
}

/** Every update starts from a project that already has a manifest — this
 *  command only ever runs against one. */
async function applied1(h: Harnessed): Promise<void> {
  await put(h.dir, '.harness/manifest.json', '{"manifestVersion":1,"old":true}\n');
}

// ── T-2401: the commit sequence ─────────────────────────────────────────

test('an update replaces the payload, writes the applied paths and lands the manifest', async () => {
  await withProject(async (h) => {
    await applied1(h);
    await put(h.dir, '.harness/pack/agents/a.md', 'OLD PAYLOAD');
    await put(h.dir, '.harness/pack/gone.md', 'DROPPED');
    await put(h.dir, '.claude/agents/a.md', 'OLD APPLIED');

    const r = await executeUpdate(
      inputs(h, {
        payloadWrites: [
          payloadFile(hp('.harness/pack/agents/a.md'), 'NEW PAYLOAD', {
            preExisting: true,
            preHash: hashBytes(B('OLD PAYLOAD')),
            preMode: 0o644,
          }),
          payloadFile(hp('.harness/pack/agents/b.md'), 'BRAND NEW'),
        ],
        payloadDeletes: [hp('.harness/pack/gone.md')],
        writes: [applied('.claude/agents/a.md', 'NEW APPLIED', 'replaced', hashBytes(B('OLD APPLIED')))],
        manifest: { path: hp('.harness/manifest.json'), bytes: B('{"manifestVersion":1,"new":true}\n') },
      }),
    );

    assert.deepEqual(codes(r.bag), []);
    assert.equal(r.complete, true);
    assert.equal(await readFile(join(h.dir, '.harness/pack/agents/a.md'), 'utf8'), 'NEW PAYLOAD');
    assert.equal(await readFile(join(h.dir, '.harness/pack/agents/b.md'), 'utf8'), 'BRAND NEW');
    assert.equal(await readFile(join(h.dir, '.claude/agents/a.md'), 'utf8'), 'NEW APPLIED');
    assert.equal(await readFile(join(h.dir, '.harness/manifest.json'), 'utf8'), '{"manifestVersion":1,"new":true}\n');

    // The payload orphan is gone — the one deletion in the feature, and it
    // is inside the CLI's own tree.
    await assert.rejects(stat(join(h.dir, '.harness/pack/gone.md')));

    // A journal present after a completed run would claim an interrupted
    // one, so its removal is part of the contract rather than cleanup.
    assert.equal(h.removed, 1);
    await assert.rejects(stat(join(h.dir, '.harness/journal.json')));
  });
});

/**
 * **The order is the whole design.** The journal goes down before the
 * first byte, and the manifest is the commit point — so a crash between
 * them leaves a project the journal can put back, and a crash after it
 * leaves a project that is simply updated.
 */
test('the journal is flushed before the first write, and the manifest is written last', async () => {
  await withProject(async (h) => {
    await applied1(h);
    const seen: string[] = [];
    await executeUpdate(
      inputs(h, {
        payloadWrites: [payloadFile(hp('.harness/pack/a.md'), 'P')],
        writes: [applied('doc.md', 'A', 'added')],
        writeJournal: async (j) => {
          h.journals.push(j);
          seen.push('journal');
          // Nothing may exist yet: this is the assertion the ordering rests on.
          await assert.rejects(stat(join(h.dir, '.harness/pack/a.md')));
          await assert.rejects(stat(join(h.dir, 'doc.md')));
        },
        removeJournal: async () => {
          seen.push('remove');
          assert.equal(await readFile(join(h.dir, '.harness/manifest.json'), 'utf8'), '{"manifestVersion":1}\n');
        },
      }),
    );
    assert.deepEqual(seen, ['journal', 'remove']);
  });
});

test('the manifest is journalled — unlike at init, because here it pre-exists', async () => {
  // US-66 requires a rolled-back update to leave the project byte-identical
  // to the snapshot before it, "`.harness/pack/` and the manifest
  // included". A manifest that is not journalled is one rollback cannot
  // restore, and `executeApply` leaves it out because at `init` the right
  // answer is to remove it.
  await withProject(async (h) => {
    await applied1(h);
    await executeUpdate(inputs(h));
    const j = h.journals[0] as Journal;
    const last = j.entries[j.entries.length - 1];
    assert.equal(last?.path, '.harness/manifest.json');
    assert.equal(last?.preExisting, true);
    assert.equal(typeof last?.backup, 'string');
  });
});

test('the journal it writes is one this CLI can read back', async () => {
  // `readJournal` refuses a delete entry with no backup and a write entry
  // with no intended hash. Round-tripping is how the writer is held to the
  // reader's rules rather than to a second statement of them.
  await withProject(async (h) => {
    await applied1(h);
    await put(h.dir, '.harness/pack/gone.md', 'DROPPED');
    await executeUpdate(
      inputs(h, {
        payloadDeletes: [hp('.harness/pack/gone.md')],
        writes: [applied('doc.md', 'A', 'added')],
        // Kept on disk so the reader can be pointed at it: a completed run
        // removes both, which is itself asserted above.
        removeJournal: async () => {},
      }),
    );
    const raw = JSON.parse(await readFile(join(h.dir, '.harness/journal.json'), 'utf8')) as unknown;
    const back = readJournal(raw);
    assert.deepEqual(codes(back.bag), []);
    assert.equal(back.journal?.command, 'update');
    assert.equal(back.journal?.version, 3);
  });
});

// ── T-2402: the delete path ─────────────────────────────────────────────

test('a payload orphan is journalled as a delete: backed up, with no intended hash', async () => {
  await withProject(async (h) => {
    await applied1(h);
    await put(h.dir, '.harness/pack/gone.md', 'DROPPED');

    await executeUpdate(
      inputs(h, { payloadDeletes: [hp('.harness/pack/gone.md')], removeJournal: async () => {} }),
    );

    const entry = (h.journals[0] as Journal).entries.find((e) => e.path === '.harness/pack/gone.md');
    assert.equal(entry?.intent, 'delete');
    // No intended hash: the run intends the path to hold nothing, which is
    // not a hash. This is the case F1's five-case table has no row for.
    assert.equal(entry?.sha256, undefined);
    assert.equal(entry?.preExisting, true);
    assert.equal(entry?.preHash, hashBytes(B('DROPPED')));
    assert.ok(entry?.backup, 'a delete always carries a backup');

    // The bytes are captured before the removal — a backup taken
    // afterwards would be a backup of nothing.
    assert.equal(await readFile(join(h.dir, '.harness/journal.d/00000'), 'utf8'), 'DROPPED');
  });
});

test('a payload orphan already absent is skipped, not journalled and not a fault', async () => {
  // The plan compares two file **lists**; only the executor can know what
  // disk holds, and *this file must not be in the payload* is already true.
  await withProject(async (h) => {
    await applied1(h);
    const r = await executeUpdate(inputs(h, { payloadDeletes: [hp('.harness/pack/never.md')] }));
    assert.deepEqual(codes(r.bag), []);
    assert.equal(r.complete, true);
    assert.deepEqual(r.deleted, []);
    assert.deepEqual(
      (h.journals[0] as Journal).entries.map((e) => e.path),
      ['.harness/manifest.json'],
    );
  });
});

// ── T-2407: deletion re-confines immediately before acting (C-51) ────────

test('a symlink where a payload orphan was refuses the run, and captures nothing', async () => {
  // **The risk is the backup, not the unlink.** Removing a link removes the
  // link; but `update` reads the pre-delete bytes into `.harness/journal.d/`
  // first, and a read through a link planted between plan and execute
  // reaches outside the project.
  await withProject(async (h) => {
    await applied1(h);
    const secret = join(h.dir, 'outside.txt');
    await writeFile(secret, 'SECRET', 'utf8');
    await mkdir(join(h.dir, '.harness/pack'), { recursive: true });
    await symlink(secret, join(h.dir, '.harness/pack/gone.md'));

    const r = await executeUpdate(inputs(h, { payloadDeletes: [hp('.harness/pack/gone.md')] }));

    assert.deepEqual(codes(r.bag), ['E-TARGET-RACE']);
    assert.equal(r.complete, false);
    // Zero bytes, and specifically: no journal, so no `journal.d/` and no
    // copy of the linked-to file anywhere inside the project.
    assert.deepEqual(h.journals, []);
    await assert.rejects(stat(join(h.dir, '.harness/journal.d')));
    // The link and its target both survive; the run refused, it did not tidy.
    assert.equal(await readFile(secret, 'utf8'), 'SECRET');
  });
});

test('a directory where a planned write was refuses the run', async () => {
  await withProject(async (h) => {
    await applied1(h);
    await mkdir(join(h.dir, 'doc.md'), { recursive: true });
    const r = await executeUpdate(inputs(h, { writes: [applied('doc.md', 'A', 'added')] }));
    assert.deepEqual(codes(r.bag), ['E-TARGET-RACE']);
    assert.deepEqual(h.journals, []);
  });
});

// ── the plan's observation is confirmed, not trusted ────────────────────

test('a replacement whose bytes moved since planning refuses the run, before the journal', async () => {
  // US-66: every replacement is re-hashed and confirmed still equal to what
  // the plan observed before the `rename`. The failure this guards is
  // writing over an edit made while the user read the disclosure.
  await withProject(async (h) => {
    await applied1(h);
    await put(h.dir, 'doc.md', 'MINE NOW');
    const r = await executeUpdate(
      inputs(h, { writes: [applied('doc.md', 'NEW', 'replaced', hashBytes(B('AS PLANNED')))] }),
    );
    assert.deepEqual(codes(r.bag), ['E-TARGET-RACE']);
    assert.equal(r.complete, false);
    assert.deepEqual(h.journals, []);
    assert.equal(await readFile(join(h.dir, 'doc.md'), 'utf8'), 'MINE NOW');
  });
});

test('a path the plan expected to create and which now exists refuses the run', async () => {
  await withProject(async (h) => {
    await applied1(h);
    await put(h.dir, 'doc.md', 'SOMEONE ELSE');
    const r = await executeUpdate(inputs(h, { writes: [applied('doc.md', 'NEW', 'added')] }));
    assert.deepEqual(codes(r.bag), ['E-TARGET-RACE']);
    assert.equal(await readFile(join(h.dir, 'doc.md'), 'utf8'), 'SOMEONE ELSE');
  });
});

test('a replacement whose target vanished since planning refuses the run', async () => {
  await withProject(async (h) => {
    await applied1(h);
    const r = await executeUpdate(
      inputs(h, { writes: [applied('doc.md', 'NEW', 'replaced', hashBytes(B('WAS HERE')))] }),
    );
    assert.deepEqual(codes(r.bag), ['E-TARGET-RACE']);
    await assert.rejects(stat(join(h.dir, 'doc.md')));
  });
});

// ── Q-79: the prohibition, enforced at write time and not only at
//    classification ─────────────────────────────────────────────────────

test('a write naming a fill-expected path is refused before anything is touched', async () => {
  // `classify.ts` already makes such a path `kept-fill-expected`, so this
  // can only fire on a defect in the classification — which is exactly why
  // it is checked rather than trusted. Under-applying the prohibition
  // silently destroys the document every other document is downstream of.
  await withProject(async (h) => {
    await applied1(h);
    await put(h.dir, 'specifications/project-brief.md', 'MY BRIEF');
    await assert.rejects(
      executeUpdate(
        inputs(h, {
          writes: [applied('specifications/project-brief.md', 'THE TEMPLATE', 'replaced', hashBytes(B('MY BRIEF')))],
          fillExpected: ['specifications/project-brief.md'],
        }),
      ),
      /fill-expected/,
    );
    assert.equal(await readFile(join(h.dir, 'specifications/project-brief.md'), 'utf8'), 'MY BRIEF');
    assert.deepEqual(h.journals, []);
    assert.deepEqual(await readdir(join(h.dir, '.harness')), ['manifest.json']);
  });
});

test('the prohibition holds for a path the newer pack changed and for one it did not', async () => {
  // Absolute rather than conditional: an unfilled brief and a filled one
  // are indistinguishable to a rule that has to be right before it looks.
  for (const bytes of ['DIFFERENT', 'MY BRIEF']) {
    await withProject(async (h) => {
      await applied1(h);
      await put(h.dir, 'brief.md', 'MY BRIEF');
      await assert.rejects(
        executeUpdate(
          inputs(h, {
            writes: [applied('brief.md', bytes, 'replaced', hashBytes(B('MY BRIEF')))],
            fillExpected: ['brief.md'],
          }),
        ),
        /fill-expected/,
      );
    });
  }
});
