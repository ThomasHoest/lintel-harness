import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkPayloadClaudeFiles, checkRenderedClaudeFiles } from './claude-gate.js';
import { confinePath, type AppliedPath } from './confine.js';
import { harnessPath, type HarnessPath } from './harness-paths.js';

const codes = (b: { items: readonly { code: string }[] }): string[] => b.items.map((d) => d.code);
const B = (s: string): Buffer => Buffer.from(s, 'utf8');

const ap = (p: string): AppliedPath => {
  const r = confinePath(p, { index: 0 });
  if (r.path === undefined) throw new Error(`not confinable: ${p}`);
  return r.path;
};
const hp = (p: string): HarnessPath => {
  const h = harnessPath(p);
  if (h === undefined) throw new Error(`not harness-owned: ${p}`);
  return h;
};

/** A pack agent declaring a tool grant — the thing the gate exists for. */
const GRANTING = '---\nname: helper\nallowed-tools: Bash\n---\n\nbody\n';
const CLEAN = '---\nname: helper\ndescription: does a thing\n---\n\nbody\n';

/* ── quantifier 1: the write set ─────────────────────────────────────── */

test('a rendered .claude file declaring a grant is refused', () => {
  const bag = checkRenderedClaudeFiles([{ path: ap('.claude/agents/helper.md'), bytes: B(GRANTING) }]);
  assert.deepEqual(codes(bag), ['E-CLAUDE-TOOL-GRANT']);
});

test('a clean one passes, and a file outside .claude is not the gate’s business', () => {
  assert.deepEqual(codes(checkRenderedClaudeFiles([{ path: ap('.claude/agents/h.md'), bytes: B(CLEAN) }])), []);
  assert.deepEqual(
    codes(checkRenderedClaudeFiles([{ path: ap('docs/notes.md'), bytes: B(GRANTING) }])),
    [],
    'the same frontmatter outside .claude declares nothing to the runtime',
  );
});

/**
 * **Rendered bytes, not payload bytes.** A `substitute` could introduce a
 * permission-bearing key the template did not contain, and the file the
 * project gets is the one the claim is about.
 */
test('the check reads what was rendered, so a substituted grant is still caught', () => {
  const rendered = '---\nname: helper\nallowed-tools: Bash\n---\n';
  assert.deepEqual(
    codes(checkRenderedClaudeFiles([{ path: ap('.claude/agents/h.md'), bytes: B(rendered) }])),
    ['E-CLAUDE-TOOL-GRANT'],
  );
});

/* ── quantifier 2: the payload set ───────────────────────────────────── */

/**
 * **A `.claude/` subtree a pack ships but never copies out reaches the
 * project all the same** — at `.harness/pack/.claude/`, which is
 * committed. An agent reading the repository finds it there, so checking
 * only what phase 2 places would leave the shorter route open.
 */
test('a .claude file the recipe never copies out is still checked, at its payload destination', () => {
  const bag = checkPayloadClaudeFiles([
    { destination: hp('.harness/pack/.claude/agents/sneaky.md'), bytes: B(GRANTING) },
  ]);
  assert.deepEqual(codes(bag), ['E-CLAUDE-TOOL-GRANT']);
  // The DESTINATION is named, because the pack-relative path names
  // something nobody can open.
  assert.match(bag.items[0]!.message, /\.harness\/pack\/\.claude\/agents\/sneaky\.md/);
});

test('an ordinary payload file is not the gate’s business either', () => {
  assert.deepEqual(
    codes(checkPayloadClaudeFiles([{ destination: hp('.harness/pack/agents/a.md'), bytes: B(GRANTING) }])),
    [],
  );
});

/* ── the two sets are disjoint, and that is the property ─────────────── */

/**
 * **Two disjoint sets, two quantifiers, one rule.** Merging them would
 * break the `AppliedPath`/`HarnessPath` separation **C-14 rests on** — the
 * one that makes *"a recipe step wrote under `.harness/`"* unconstructible
 * rather than merely forbidden.
 *
 * The type system already enforces the disjointness; this asserts that
 * neither function has quietly grown to accept the other's set.
 */
test('neither quantifier can be handed the other’s paths', () => {
  assert.equal(confinePath('.harness/pack/.claude/a.md', { index: 0 }).path, undefined,
    'a payload destination is not an AppliedPath');
  assert.equal(harnessPath('.claude/agents/h.md'), undefined,
    'an applied path is not a HarnessPath');
});

/* ── binary ──────────────────────────────────────────────────────────── */

// A `.claude/` directory may hold an image, and a file with no decodable
// text has no frontmatter to carry a grant. Skipped, not refused.
test('a binary file under .claude is skipped rather than refused', () => {
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0xff]);
  assert.deepEqual(codes(checkRenderedClaudeFiles([{ path: ap('.claude/logo.png'), bytes: png }])), []);
  assert.deepEqual(
    codes(checkPayloadClaudeFiles([{ destination: hp('.harness/pack/.claude/logo.png'), bytes: png }])),
    [],
  );
});

test('an empty set reports nothing, and that is not a pass to cache', () => {
  assert.deepEqual(codes(checkRenderedClaudeFiles([])), []);
  assert.deepEqual(codes(checkPayloadClaudeFiles([])), []);
});
