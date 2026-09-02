import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { MAX_PATTERN_LENGTH, matchGlob, matchesAny, selectPaths, unusedPatterns } from './glob.js';
import { confinePath, type AppliedPath } from '../security/confine.js';
import { packDir } from '../paths.js';

const applied = (p: string): AppliedPath => {
  const r = confinePath(p, { index: 0 });
  assert.ok(r.path, p);
  return r.path;
};

test('a literal pattern matches itself and nothing else', () => {
  assert.equal(matchGlob('CLAUDE.md', 'CLAUDE.md'), true);
  assert.equal(matchGlob('CLAUDE.md', 'CLAUDE.md.template'), false);
  assert.equal(matchGlob('a/b.md', 'a/b.md'), true);
  assert.equal(matchGlob('a/b.md', 'a/c.md'), false);
});

// The dialect's whole substance: `*` is within ONE segment.
test('* matches within a segment and never crosses /', () => {
  assert.equal(matchGlob('agents/*.md', 'agents/architect.md'), true);
  assert.equal(matchGlob('agents/*.md', 'agents/sub/architect.md'), false);
  assert.equal(matchGlob('*.md', 'README.md'), true);
  assert.equal(matchGlob('*.md', 'docs/README.md'), false);
});

test('* matches the empty string', () => {
  assert.equal(matchGlob('*.md', '.md'), true);
  assert.equal(matchGlob('a*b', 'ab'), true);
});

test('several stars in one segment work', () => {
  assert.equal(matchGlob('*.template.*', 'deploy.template.sh'), true);
  assert.equal(matchGlob('*-*.md', 'a-b.md'), true);
  assert.equal(matchGlob('*', 'anything'), true);
});

// Everything else is literal, and `**` is just two stars — still
// single-segment. Stated as a test because "we do not support **" and "**
// silently means something else" are very different promises.
test('** is two stars, not a segment-crossing operator', () => {
  assert.equal(matchGlob('**', 'a'), true, 'still one segment');
  assert.equal(matchGlob('**', 'a/b'), false, 'and it does not cross /');
  assert.equal(matchGlob('a/**/b', 'a/x/b'), true, 'the middle segment matches by *');
  assert.equal(matchGlob('a/**/b', 'a/x/y/b'), false, 'but not two segments');
});

test('regex and brace metacharacters are literal', () => {
  assert.equal(matchGlob('a?.md', 'ab.md'), false, '? is literal');
  assert.equal(matchGlob('a?.md', 'a?.md'), true);
  assert.equal(matchGlob('[ab].md', 'a.md'), false, 'no character classes');
  assert.equal(matchGlob('[ab].md', '[ab].md'), true);
  assert.equal(matchGlob('{a,b}.md', 'a.md'), false, 'no braces');
  assert.equal(matchGlob('!x.md', 'y.md'), false, 'no negation');
  assert.equal(matchGlob('a.md', 'a!md'), false, '. is literal');
});

// An author-supplied pattern is untrusted input. The matcher is a
// two-pointer walk rather than a compiled RegExp, so the classic
// catastrophic-backtracking shape cannot arise — and the length bound is
// belt as well as braces.
test('a pathological pattern is bounded rather than slow', () => {
  const nasty = '*'.repeat(60) + 'b';
  const text = 'a'.repeat(200);
  const started = Date.now();
  assert.equal(matchGlob(nasty, text), false);
  assert.ok(Date.now() - started < 250, 'must not backtrack catastrophically');

  assert.equal(matchGlob('a'.repeat(MAX_PATTERN_LENGTH + 1), 'x'), false, 'over-long is refused');
});

test('matchesAny is any-of', () => {
  assert.equal(matchesAny(['*.md', '*.txt'], 'a.txt'), true);
  assert.equal(matchesAny(['*.md', '*.txt'], 'a.png'), false);
  assert.equal(matchesAny([], 'a.md'), false);
});

/* ── C-27 ────────────────────────────────────────────────────────────
   The domain is a list the caller already holds. There is no parameter
   through which disk could enter, so "resolve against disk" is not
   expressible — which is the property, not the implementation. */

test('selectPaths filters a given domain and preserves its order', () => {
  const domain = ['b.md', 'a.md', 'c.txt'].map(applied);
  assert.deepEqual(selectPaths(['*.md'], domain), ['b.md', 'a.md']);
  assert.deepEqual(selectPaths(['*'], domain), domain, 'order is the caller\'s');
  assert.deepEqual(selectPaths(['nope'], domain), []);
});

test('unusedPatterns reports a declaration that covers nothing', () => {
  const domain = ['a.md', 'b.md'];
  assert.deepEqual(unusedPatterns(['*.md'], domain), []);
  assert.deepEqual(unusedPatterns(['*.md', '*.txt'], domain), ['*.txt']);
});

/* ── the real packs ─────────────────────────────────────────────────── */

// The dialect was chosen by surveying these: `*` is the only non-literal
// character any of them uses. If that stops being true, this fails and
// the dialect decision needs revisiting rather than the matcher quietly
// growing.
test('no bundled pack uses a construct outside the dialect', async () => {
  const found = new Set<string>();
  for (const name of ['coding', 'writing', 'planning']) {
    const pack = JSON.parse(await readFile(fileURLToPath(new URL('pack.json', packDir(name))), 'utf8'));
    const recipe = JSON.parse(await readFile(fileURLToPath(new URL('recipe.json', packDir(name))), 'utf8'));
    const pats: string[] = [];
    for (const part of Object.values(pack.anatomy ?? {}) as { paths?: string[] }[]) {
      pats.push(...(part.paths ?? []));
    }
    const steps = [...(recipe.steps ?? []), ...Object.values(recipe.scaffolds ?? {}).flat()] as {
      exclude?: string[];
      in?: string[];
    }[];
    for (const s of steps) pats.push(...(s.exclude ?? []), ...(s.in ?? []));

    for (const p of pats) {
      for (const ch of p.replace(/[A-Za-z0-9._/-]/g, '')) found.add(ch);
    }
  }
  assert.deepEqual([...found].sort(), ['*'], `packs use ${[...found]} — the dialect is * only`);
});

test('every anatomy path in every pack is a well-formed pattern', async () => {
  for (const name of ['coding', 'writing', 'planning']) {
    const pack = JSON.parse(await readFile(fileURLToPath(new URL('pack.json', packDir(name))), 'utf8'));
    for (const part of Object.values(pack.anatomy ?? {}) as { paths?: string[] }[]) {
      for (const p of part.paths ?? []) {
        assert.ok(p.length <= MAX_PATTERN_LENGTH, `${name}: ${p} is over the bound`);
        assert.ok(!p.startsWith('/'), `${name}: ${p} must be pack-relative`);
      }
    }
  }
});
