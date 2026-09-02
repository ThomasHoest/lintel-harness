import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compareSemver, parseSemver, satisfiesFloor } from './compare.js';

test('it parses the versions the format actually uses', () => {
  assert.deepEqual(parseSemver('1.0.0'), { major: 1, minor: 0, patch: 0, prerelease: null });
  assert.deepEqual(parseSemver('2.13.4'), { major: 2, minor: 13, patch: 4, prerelease: null });
  assert.deepEqual(parseSemver('1.0.0-alpha.1')?.prerelease, ['alpha', '1']);
  // Build metadata is accepted and ignored — it is not part of precedence.
  assert.deepEqual(parseSemver('1.0.0+build.5')?.prerelease, null);
});

test('it refuses what is not a version', () => {
  for (const bad of ['1', '1.0', 'v1.0.0', '01.0.0', '1.0.0.0', '', 'latest', '1.0.x']) {
    assert.equal(parseSemver(bad), null, bad);
  }
});

test('ordering is total across major, minor and patch', () => {
  const cmp = (a: string, b: string) => compareSemver(parseSemver(a)!, parseSemver(b)!);
  assert.equal(cmp('1.0.0', '1.0.0'), 0);
  assert.equal(cmp('1.0.0', '2.0.0'), -1);
  assert.equal(cmp('1.2.0', '1.10.0'), -1, 'numeric, not lexical');
  assert.equal(cmp('1.0.10', '1.0.9'), 1);
});

// Getting this backwards would let a pre-release CLI satisfy a floor it
// does not meet.
test('a prerelease is LOWER than the release it precedes', () => {
  const cmp = (a: string, b: string) => compareSemver(parseSemver(a)!, parseSemver(b)!);
  assert.equal(cmp('1.0.0-alpha', '1.0.0'), -1);
  assert.equal(cmp('1.0.0', '1.0.0-alpha'), 1);
  assert.equal(cmp('1.0.0-alpha', '1.0.0-beta'), -1);
  assert.equal(cmp('1.0.0-alpha', '1.0.0-alpha.1'), -1, 'fewer identifiers is lower');
  assert.equal(cmp('1.0.0-1', '1.0.0-alpha'), -1, 'numeric identifiers rank below alphanumeric');
  assert.equal(cmp('1.0.0-2', '1.0.0-10'), -1, 'numeric identifiers compare numerically');
});

// minCliVersion is a FLOOR, not a range — the only question ever asked.
test('satisfiesFloor answers the one question the format poses', () => {
  assert.equal(satisfiesFloor('1.2.0', '1.0.0'), true);
  assert.equal(satisfiesFloor('1.0.0', '1.0.0'), true);
  assert.equal(satisfiesFloor('0.9.0', '1.0.0'), false);
  assert.equal(satisfiesFloor('1.0.0-rc.1', '1.0.0'), false, 'a prerelease does not meet its own floor');
  assert.equal(satisfiesFloor('nonsense', '1.0.0'), null, 'unparseable is neither true nor false');
});

test('the three bundled packs declare parseable versions and floors', async () => {
  const { readFile } = await import('node:fs/promises');
  const { fileURLToPath } = await import('node:url');
  const { packDir } = await import('../paths.js');
  for (const name of ['coding', 'writing', 'planning']) {
    const d = JSON.parse(await readFile(fileURLToPath(new URL('pack.json', packDir(name))), 'utf8'));
    assert.ok(parseSemver(d.version), `${name} version`);
    assert.ok(parseSemver(d.minCliVersion), `${name} minCliVersion`);
  }
});
