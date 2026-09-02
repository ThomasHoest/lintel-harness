import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { checkAnatomy, incompleteParts } from './anatomy.js';
import { ANATOMY_PART_IDS, type PackJson } from './types.js';
import { parseStrictJson } from '../json/parse-strict.js';
import { validatePackJson } from './schema.js';
import { packDir } from '../paths.js';
import { walk } from '../fs/walk.js';

const codes = (r: { bag: { items: readonly { code: string }[] } }): string[] =>
  r.bag.items.map((d) => d.code);

function pack(anatomy: Record<string, unknown>): PackJson {
  return { name: 'demo', anatomy } as unknown as PackJson;
}
function nine(over: Record<string, unknown> = {}): Record<string, unknown> {
  const a: Record<string, unknown> = {};
  for (const p of ANATOMY_PART_IDS) a[p] = { paths: [`${p}/x.md`] };
  return { ...a, ...over };
}
const files = ANATOMY_PART_IDS.map((p) => `${p}/x.md`);

test('the report is exactly nine rows, in declared order', () => {
  const r = checkAnatomy(pack(nine()), files);
  assert.equal(r.rows.length, 9);
  assert.deepEqual(r.rows.map((x) => x.part), [...ANATOMY_PART_IDS]);
  assert.deepEqual(codes(r), []);
});

// G-F1-3: validate fails a pack that silently omits one.
test('an omitted part is E-ANATOMY-MISSING and reports status missing', () => {
  const a = nine();
  delete a['coordination'];
  const r = checkAnatomy(pack(a), files);
  assert.deepEqual(codes(r), ['E-ANATOMY-MISSING']);
  assert.equal(r.rows.find((x) => x.part === 'coordination')?.status, 'missing');
});

// `missing` is reachable ONLY for an invalid pack — it is not an
// AnatomyStatus, so a pack cannot declare itself missing.
test('a present part that names no content is also missing', () => {
  const r = checkAnatomy(pack(nine({ roles: { status: 'present' } })), files);
  assert.deepEqual(codes(r), ['E-ANATOMY-MISSING']);
});

test('present is the default, and that is what lets a pack omit status', () => {
  const r = checkAnatomy(pack(nine()), files);
  assert.ok(r.rows.every((x) => x.status === 'present'));
});

test('globs matching no payload file is E-ANATOMY-EMPTY', () => {
  const r = checkAnatomy(pack(nine({ roles: { paths: ['roles/nothing-here.md'] } })), files);
  assert.deepEqual(codes(r), ['E-ANATOMY-EMPTY']);
  assert.ok(r.bag.items[0]?.message.includes('roles/nothing-here.md'), 'names the globs');
});

test('declaredBy recipe matches nothing and that is correct', () => {
  const r = checkAnatomy(pack(nine({ folderScaffolding: { declaredBy: 'recipe' } })), files);
  assert.deepEqual(codes(r), [], 'the recipe holds the destinations, not this module');
  assert.equal(r.rows.find((x) => x.part === 'folderScaffolding')?.matched, 0);
});

/* ── the notice/defect split, and why planning can pass CI ─────────── */

test('absent and provisional are NOTICES that --strict must not promote', () => {
  const r = checkAnatomy(
    pack(nine({
      skillsAndAutomations: { status: 'absent', reason: 'no automations' },
      roles: { paths: ['roles/x.md'], status: 'provisional', note: 'unwritten' },
    })),
    files,
  );
  assert.deepEqual(codes(r).sort(), ['W-ANATOMY-ABSENT', 'W-ANATOMY-PROVISIONAL']);
  for (const d of r.bag.items) assert.equal(d.class, 'notice', d.code);
  assert.equal(r.bag.exitCode(), 0);
  assert.equal(r.bag.exitCode(true), 0, 'a --strict run must still pass — Q-60');
});

test('absent needs a reason, provisional needs a note', () => {
  assert.deepEqual(
    codes(checkAnatomy(pack(nine({ roles: { status: 'absent' } })), files)),
    ['E-ANATOMY-NO-REASON'],
  );
  assert.deepEqual(
    codes(checkAnatomy(pack(nine({ roles: { paths: ['roles/x.md'], status: 'provisional' } })), files)),
    ['E-ANATOMY-NO-NOTE'],
  );
});

// Not the unknown-key rule: these keys' MEANINGS collide.
test('content alongside absent is a contradiction, exit 2', () => {
  const r = checkAnatomy(
    pack(nine({ roles: { status: 'absent', reason: 'none', paths: ['roles/x.md'] } })),
    files,
  );
  assert.ok(codes(r).includes('E-ANATOMY-SOURCE-ON-ABSENT'));
  assert.equal(r.bag.exitCode(), 2);
});

// The status beside it is a notice; this key is simply ignored, so the
// author is expected to delete it — defect.
test('a redundant key is a defect warning, unlike the status beside it', () => {
  const r = checkAnatomy(
    pack(nine({ roles: { paths: ['roles/x.md'], reason: 'ignored here' } })),
    files,
  );
  assert.deepEqual(codes(r), ['W-UNKNOWN-KEY']);
  assert.equal(r.bag.items[0]?.class, 'defect');
  assert.equal(r.bag.exitCode(true), 1, 'and --strict DOES promote this one');
});

test('incompleteParts names what a pack does not fully ship', () => {
  const r = checkAnatomy(
    pack(nine({ skillsAndAutomations: { status: 'absent', reason: 'none' } })),
    files,
  );
  assert.deepEqual(incompleteParts(r.rows).map((x) => x.part), ['skillsAndAutomations']);
});

/* ── the real packs ─────────────────────────────────────────────────── */

test('all three bundled packs have a complete, non-empty anatomy', async () => {
  for (const name of ['coding', 'writing', 'planning']) {
    const dir = fileURLToPath(packDir(name));
    const parsed = parseStrictJson(
      await readFile(fileURLToPath(new URL('pack.json', packDir(name))), 'utf8'),
      `${name}/pack.json`, 'E-PACK-INVALID',
    );
    const v = validatePackJson(parsed.value as never, name);
    assert.ok(v.pack, `${name} must validate`);

    const w = await walk(dir, { skip: [] });
    const payload = w.entries.filter((e) => e.kind === 'file').map((e) => e.path);

    const r = checkAnatomy(v.pack, payload);
    assert.equal(r.rows.length, 9, name);
    assert.deepEqual(
      r.bag.errors.map((d) => `${d.code}: ${d.message.split('\n')[0]}`),
      [], `${name} anatomy must be clean`,
    );
    assert.deepEqual(
      r.bag.promotable.map((d) => d.code),
      [], `${name} must be clean under --strict`,
    );
  }
});

// planning declares its role set provisional on purpose (Q-11), and Q-60
// exists so that CI can still pass. This is that, end to end.
test('planning declares a provisional part and still passes --strict', async () => {
  const dir = fileURLToPath(packDir('planning'));
  const parsed = parseStrictJson(
    await readFile(fileURLToPath(new URL('pack.json', packDir('planning'))), 'utf8'),
    'planning/pack.json', 'E-PACK-INVALID',
  );
  const v = validatePackJson(parsed.value as never, 'planning');
  const w = await walk(dir, { skip: [] });
  const r = checkAnatomy(v.pack!, w.entries.filter((e) => e.kind === 'file').map((e) => e.path));

  assert.ok(r.bag.has('W-ANATOMY-PROVISIONAL'), 'planning declares one');
  assert.equal(r.bag.exitCode(true), 0, 'and --strict still exits 0');
});

/**
 * F1 v4.9. `declaredBy` is valid **only** for `folderScaffolding`, whose
 * shape *is* the recipe's set of destinations — and until v4.9 that
 * restriction was stated and enforced by nothing.
 *
 * The consequence was not cosmetic. A part carrying `declaredBy` names no
 * globs, so it matches zero files **without** raising `E-ANATOMY-EMPTY`:
 * a pack could declare `"roles": { "declaredBy": "recipe" }`, ship no
 * roles at all, and validate clean. That defeats G-F1-3 for **eight of the
 * nine parts**, whose entire content is that a missing part cannot be
 * silent — the one guarantee the anatomy exists to make.
 *
 * Found by the E-03 acceptance pass, not by review.
 */
test('declaredBy on any part but folderScaffolding is refused', () => {
  for (const part of ANATOMY_PART_IDS) {
    const { bag, rows } = checkAnatomy(pack(nine({ [part]: { declaredBy: 'recipe' } })), files);
    const row = rows.find((r) => r.part === part)!;

    if (part === 'folderScaffolding') {
      assert.deepEqual(bag.items.map((d) => d.code), [], 'the one part it is for');
      assert.equal(row.status, 'present');
      continue;
    }

    assert.ok(
      bag.items.some((d) => d.code === 'E-UNKNOWN-VALUE' && d.message.includes(part)),
      `${part}: a part shipping nothing must not validate clean`,
    );
    assert.equal(row.status, 'missing', part);
  }
});
