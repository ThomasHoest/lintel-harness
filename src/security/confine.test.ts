import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { DENYLIST, collisionKey, confinePath, isConfinable, reservedDestination } from './confine.js';
import { MESSAGES } from '../diag/catalogue.js';

/** Confinement always happens in a step's context; the messages name it. */
const CTX = { index: 0 } as const;

const SPEC = fileURLToPath(
  new URL('../../specifications/v1.0/F1-spec-pack-format-and-manifest.md', import.meta.url),
);

const codes = (r: { bag: { items: readonly { code: string }[] } }): string[] =>
  r.bag.items.map((d) => d.code);

/* ── the drift guard ──────────────────────────────────────────────────
   T-0203 says "reference it, do not restate it". A module cannot literally
   reference a Markdown table at runtime — a security control must not read
   prose to decide — so the list is here AND re-derived from the spec on
   every run. The first draft of this module restated it from memory at two
   basenames and was wrong about eleven, which is what this catches. */

/**
 * **The class-1 row, which this guard did not read until the adversarial
 * fixtures found what that cost.**
 *
 * US-3 stage 2 declares **two** classes. The guard read the class-2 row
 * alone, and the module encoded class 2 plus `.harness` — so `.git`, `.hg`
 * and `.svn` were absent from both, and the two agreed with each other
 * while disagreeing with the spec.
 *
 * The hole was not academic: **`.git/hooks/pre-commit` executes on every
 * commit**, so a pack able to write one had arbitrary code execution on
 * the next `git commit`, reachable by a single `copy` step.
 *
 * A guard that reads half a rule is a guard that certifies half a rule.
 */
async function specClassOneNames(): Promise<string[]> {
  const src = await readFile(SPEC, 'utf8');
  const row = src.split('\n').find((l) => l.startsWith('| **Tool- and VCS-owned trees**'));
  assert.ok(row, 'could not locate the class-1 reserved-destination row');
  const upTo = row.indexOf('; any applied path whose');
  assert.ok(upTo > 0, 'the class-1 row no longer has the shape this guard parses');
  return [...row.slice(0, upTo).matchAll(/`([^`]+)`/g)].map((m) => m[1] as string);
}

async function specDenylist(): Promise<{ names: string[]; basenames: string[]; claude: string[] }> {
  const src = await readFile(SPEC, 'utf8');
  const row = src
    .split('\n')
    .find((l) => l.startsWith('| Reserved destination class 2 |'));
  assert.ok(row, 'could not locate the reserved-destination row');
  const between = (after: string, before: string): string[] => {
    const a = row.indexOf(after);
    assert.ok(a >= 0, `missing "${after}"`);
    const b = row.indexOf(before, a);
    return [...row.slice(a + after.length, b >= 0 ? b : undefined).matchAll(/`([^`]+)`/g)].map(
      (m) => m[1] as string,
    );
  };
  return {
    // The names segment ends at its parenthetical — C-53's rationale
    // cites `settings.json` and `skill install`, which are prose about the
    // reasoning and not members of the list.
    names: between('**Names, reserved at every segment:**', ' (C-53'),
    basenames: between('**Basenames, at any depth:**', '**Under any'),
    claude: between('**Under any `.claude` segment:**', 'It is a denylist'),
  };
}

test('the denylist matches F1 US-3 stage 2 exactly', async () => {
  const spec = await specDenylist();
  // BOTH classes. The class-1 names are reserved at every segment exactly
  // as class 2's are, so they live in the same list and must be derived
  // from the same place.
  const classOne = await specClassOneNames();
  assert.deepEqual(classOne.sort(), ['.git', '.hg', '.svn'], 'class 1 changed shape');
  assert.deepEqual(
    [...DENYLIST.names].sort(),
    [...classOne, ...spec.names].sort(),
    'reserved names diverged from US-3 stage 2 (both classes)',
  );
  assert.deepEqual([...DENYLIST.basenames].sort(), spec.basenames.sort(), 'basenames diverged');
  assert.deepEqual(
    [...DENYLIST.claudeSettings].sort(),
    spec.claude.filter((c) => c !== '.claude').sort(),
    'the .claude settings names diverged',
  );
  assert.equal(DENYLIST.basenames.length, 13);
});

/* ── stage 1: the grammar ─────────────────────────────────────────── */

test('the grammar refuses each construct US-3 names, and says which', () => {
  const cases: [string, string][] = [
    ['', 'an empty path'],
    ['/etc/passwd', 'a leading separator'],
    ['a\\b', 'a backslash'],
    ['C:/x', 'a drive letter'],
    ['C:x', 'a drive letter'], // drive-RELATIVE, a different escape, same clause
    ['//host/share', 'a UNC prefix'],
    ['a/../b', 'a "." or ".." or empty segment'],
    ['./a', 'a "." or ".." or empty segment'],
    ['a//b', 'a "." or ".." or empty segment'],
    ['a/b./c', 'a segment ending in "." or whitespace'],
    ['a/b /c', 'a segment ending in "." or whitespace'],
    ['a/CON/b', 'a reserved Windows device name'],
    ['NUL.txt', 'a reserved Windows device name'],
  ];
  for (const [path, construct] of cases) {
    const r = confinePath(path, CTX);
    assert.equal(r.path, undefined, `${JSON.stringify(path)} must be refused`);
    assert.deepEqual(codes(r), ['E-MAP-PATH-GRAMMAR'], path);
    assert.ok(r.bag.items[0]?.message.includes(construct), `${path}: message must name the construct`);
  }
});

test('a non-NFC path is refused', () => {
  const nfd = 'e\u0301tude.md'; // e + combining acute
  assert.notEqual(nfd.normalize('NFC'), nfd);
  assert.deepEqual(codes(confinePath(nfd, CTX)), ['E-MAP-PATH-GRAMMAR']);
});

test('ordinary applied paths pass', () => {
  for (const p of [
    'CLAUDE.md',
    'specifications/README.md',
    '.claude/agents/architect.md',
    'a/b/c/d.txt',
  ]) {
    assert.ok(isConfinable(p), p);
  }
});

/* ── collisionKey ─────────────────────────────────────────────────── */

test('collisionKey folds ASCII case after NFC', () => {
  assert.equal(collisionKey('README.md'), 'readme.md');
  assert.equal(collisionKey('.Claude/Agents/X.md'), '.claude/agents/x.md');
  assert.equal(collisionKey('e\u0301tude'), collisionKey('\u00e9tude'), 'NFC first');
});

// F1 known limit 17, pinned. The narrowing is documented, so it must also
// be asserted — otherwise a later "improvement" to a Unicode fold would
// pass silently and change what collides.
test('collisionKey does NOT fold non-ASCII case — known limit 17', () => {
  assert.notEqual(collisionKey('ÉTUDE.md'), collisionKey('étude.md'));
  assert.equal(collisionKey('ÉTUDE.md'), 'École'.slice(0, 0) + 'ÉTUDE.md'.replace(/[A-Z]/g, (c) => c.toLowerCase()));
  // ß and final sigma are where toLowerCase() and a real fold disagree;
  // an ASCII fold leaves both alone, which is the knowable wrongness.
  assert.equal(collisionKey('straße'), 'straße');
  assert.equal(collisionKey('ΣΟΦΟΣ'), 'ΣΟΦΟΣ');
});

/* ── stage 2: the denylist ────────────────────────────────────────── */

test('reserved names are refused at EVERY segment, not just the first', () => {
  for (const p of ['.github/workflows/ci.yml', 'docs/.github/x.md', 'a/node_modules/b']) {
    assert.deepEqual(codes(confinePath(p, CTX)), ['E-MAP-RESERVED-DEST'], p);
  }
});

test('reserved basenames are refused at any depth', () => {
  for (const b of DENYLIST.basenames) {
    assert.deepEqual(codes(confinePath(b, CTX)), ['E-MAP-RESERVED-DEST'], b);
    assert.deepEqual(codes(confinePath(`deep/nested/${b}`, CTX)), ['E-MAP-RESERVED-DEST'], b);
  }
});

// C-39a. Not two root-relative paths — that is what let
// docs/.claude/settings.json through until v2.5.
test('settings files are refused under ANY .claude segment', () => {
  for (const p of [
    '.claude/settings.json',
    '.claude/settings.local.json',
    'docs/.claude/settings.json',
    'a/b/.claude/settings.local.json',
  ]) {
    assert.deepEqual(codes(confinePath(p, CTX)), ['E-MAP-RESERVED-DEST'], p);
  }
  // A settings file NOT under .claude is ordinary content.
  assert.ok(isConfinable('config/settings.json'));
});

test('.harness/ is the only location entry, and it is absolute', () => {
  for (const p of ['.harness/manifest.json', '.harness/pack/x.md', '.HARNESS/x']) {
    assert.deepEqual(codes(confinePath(p, CTX)), ['E-MAP-RESERVED-DEST'], p);
  }
  // Not reserved deeper: only the first segment names the CLI's tree.
  assert.ok(isConfinable('docs/.harness-notes.md'));
});

test('the denylist folds through collisionKey, so case cannot evade it', () => {
  for (const p of ['.GitHub/x.yml', 'Node_Modules/a', 'PACKAGE.JSON', '.claude/Settings.json']) {
    assert.deepEqual(codes(confinePath(p, CTX)), ['E-MAP-RESERVED-DEST'], p);
  }
});

test('reservedDestination names what was hit, for the message', () => {
  assert.equal(reservedDestination('.github/x')?.reserved, '.github');
  assert.equal(reservedDestination('a/Makefile')?.reserved, 'Makefile');
  assert.equal(reservedDestination('CLAUDE.md'), null);
});

test('grammar is checked before the denylist, so a bad path reports one fault', () => {
  const r = confinePath('/.github/x', CTX);
  assert.deepEqual(codes(r), ['E-MAP-PATH-GRAMMAR'], 'the first failing stage reports, alone');
});

/**
 * F1 v4.8. NUL was the only control the grammar refused, and the others
 * are not cosmetic.
 *
 * §NFR's tree digest is a **newline-joined** listing of `<path> <hash>`
 * lines, so a payload path containing `\n` contributes two lines — and two
 * different file sets can then digest alike. That is a collision inside
 * the one mechanism `verify` uses to decide whether a payload was
 * tampered with, reachable by a pack author choosing a filename.
 *
 * Closed in the grammar rather than in `treeDigest`: a path holding a
 * control character breaks every line-oriented tool that will ever read
 * the project, and one clause here covers both the applied-path and the
 * payload-path quantifier instead of leaving the digest a precondition its
 * caller must remember.
 *
 * Found by building the hash layer, not by review.
 */
test('a control character in a path is refused', () => {
  for (const ch of ['\u0000', '\n', '\r', '\t', '\u0007', '\u001b', '\u007f']) {
    const r = confinePath(`a${ch}b.md`, { index: 0 });
    assert.equal(r.path, undefined, JSON.stringify(ch));
    assert.deepEqual(r.bag.items.map((d) => d.code), ['E-MAP-PATH-GRAMMAR']);
  }
  // An ordinary interior space is still legal — the fix is about controls,
  // not about whitespace, and the digest separator is unambiguous anyway
  // because the hash is a fixed 64 characters.
  assert.ok(confinePath('a b.md', { index: 0 }).path);
});

// The remedy line is a closed enumeration, and it went stale once already
// (F1 v4.6, on a different code). Pinned.
test('the grammar remedy names the control-character clause', () => {
  const m = MESSAGES['E-MAP-PATH-GRAMMAR'].join('\n');
  assert.match(m, /no control character/);
});
