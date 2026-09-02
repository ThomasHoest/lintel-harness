#!/usr/bin/env node
/**
 * Release readiness — every blocker, named, in one run.
 *
 * **It decides nothing.** Four of the checks below are questions only the
 * repository's owner can answer (publish or not, which licence, which
 * registry, which version), and this script's job is to make sure none of
 * them is answered by accident at 2am by whoever types `npm publish`.
 *
 * The other checks are facts, and they are the ones that have bitten:
 * a package whose declared version contradicts the floor its own packs
 * require, a `files` list missing a directory the CLI reads at runtime, a
 * binary that does nothing when installed.
 *
 *   node scripts/release-check.mjs
 *
 * Exit 0 = ready to publish. Exit 1 = at least one blocker.
 */
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const read = async (p) => JSON.parse(await readFile(join(ROOT, p), 'utf8'));

const pkg = await read('package.json');
const packs = ['coding', 'writing', 'planning'];

/** A blocker stops a release; a decision needs a person; a note is FYI. */
const blockers = [];
const decisions = [];
const notes = [];

/* ── facts ───────────────────────────────────────────────────────────── */

// The one that would ship a package refusing its own packs. The CLI states
// its version in src/cli/version.ts because package.json disagreed; the
// release is where the two must be reconciled (F1 known limit 23).
const declared = pkg.version;
const constant = (await readFile(join(ROOT, 'src/cli/version.ts'), 'utf8')).match(
  /CLI_VERSION\s*=\s*'([^']+)'/,
)?.[1];

if (declared !== constant) {
  blockers.push(
    `package.json is ${declared} and CLI_VERSION is ${constant}. ` +
      `The CLI enforces minCliVersion against the constant, so publishing this ` +
      `ships a package whose own version disagrees with what it enforces (limit 23).`,
  );
}

for (const name of packs) {
  const floor = (await read(`packs/${name}/pack.json`)).minCliVersion;
  if (floor !== constant) {
    notes.push(`pack ${name} declares minCliVersion ${floor}; the CLI is ${constant}`);
  }
}

// `files` must carry everything the CLI reads at runtime. `skill/` was
// missing until F6 shipped, so `skill install` would have found nothing.
for (const dir of ['dist', 'packs', 'skill']) {
  if (!(pkg.files ?? []).includes(dir)) {
    blockers.push(`package.json "files" does not include "${dir}", which the CLI reads at runtime`);
  }
}

if (Object.keys(pkg.dependencies ?? {}).length > 0) {
  blockers.push('the package declares runtime dependencies; Q-81 requires zero');
}

if (pkg.repository === undefined) {
  notes.push('no "repository" field — npm will show no source link');
}

/* ── decisions ───────────────────────────────────────────────────────── */

// Which registry, and what that registry demands of the name.
const registry = pkg.publishConfig?.registry ?? 'https://registry.npmjs.org';
const onGitHub = registry.includes('npm.pkg.github.com');

if (onGitHub) {
  // **GitHub Packages requires the scope to match the repository owner.**
  // It is not a style rule — the registry rejects the publish outright.
  const owner = (pkg.repository?.url ?? '').match(/github\.com\/([^/]+)\//)?.[1];
  const scope = pkg.name.startsWith('@') ? pkg.name.slice(1).split('/')[0] : null;

  if (owner === undefined) {
    blockers.push('publishing to GitHub Packages, but "repository.url" names no owner');
  } else if (scope === null || scope.toLowerCase() !== owner.toLowerCase()) {
    blockers.push(
      `GitHub Packages requires the package scope to match the repository owner. ` +
        `The repo is ${owner}/… and the package is ${pkg.name}, so the publish would be ` +
        `rejected. Either rename to @${owner.toLowerCase()}/cli, or create a GitHub ` +
        `organisation named "${scope ?? '…'}" and move the repository into it.`,
    );
  }
  notes.push('publishing to GitHub Packages — auth is GITHUB_TOKEN, not an NPM_TOKEN secret');
} else if (pkg.name.startsWith('@') && pkg.publishConfig?.access === undefined) {
  decisions.push(
    `${pkg.name} is scoped, and a scoped package defaults to RESTRICTED. ` +
      `Publishing it publicly needs "publishConfig": { "access": "public" } and the npm org.`,
  );
}


if (pkg.private === true) {
  decisions.push('"private": true — npm refuses to publish. Flip it only when you mean to.');
}

if (pkg.license === 'UNLICENSED' || pkg.license === undefined) {
  // GitHub Packages inherits the repository's visibility, so a private
  // repo publishes a private package and UNLICENSED is coherent there.
  (onGitHub ? notes : decisions).push(
    `license is ${JSON.stringify(pkg.license ?? null)} and there is no LICENSE file` +
      (onGitHub ? ' — coherent for a package inheriting a private repo’s visibility' : '. Fine for a private registry; wrong for a public one.'),
  );
}

/* ── the tarball ─────────────────────────────────────────────────────── */

let shipped = [];
try {
  const out = execFileSync('npm', ['pack', '--dry-run', '--json'], { cwd: ROOT, encoding: 'utf8' });
  shipped = JSON.parse(out)[0]?.files?.map((f) => f.path) ?? [];
} catch {
  blockers.push('npm pack --dry-run failed; the tarball cannot be inspected');
}

if (shipped.length > 0) {
  const bin = pkg.bin?.lintel?.replace(/^\.\//, '');
  if (bin && !shipped.includes(bin)) {
    blockers.push(`the tarball does not contain the binary "${bin}"`);
  }
  for (const name of packs) {
    if (!shipped.some((f) => f.startsWith(`packs/${name}/`))) {
      blockers.push(`the tarball ships no packs/${name}/`);
    }
  }
  if (!shipped.some((f) => f.startsWith('skill/'))) {
    blockers.push('the tarball ships no skill/, so `skill install` would have nothing to install');
  }
  if (shipped.some((f) => f.endsWith('.test.js') || f.endsWith('.test.d.ts'))) {
    notes.push('the tarball contains compiled test files');
  }
  notes.push(`the tarball holds ${shipped.length} files`);
}

/* ── known release-time obligations, from the specs ──────────────────── */

const f1 = await readFile(join(ROOT, 'specifications/v1.0/F1-spec-pack-format-and-manifest.md'), 'utf8');
if (f1.includes('runtime version the pin was taken against')) {
  const pin = await readFile(join(ROOT, 'src/security/claude-frontmatter.ts'), 'utf8');
  if (/version:\s*null/.test(pin)) {
    decisions.push(
      'the .claude/ permission pin records no runtime version (F1 known limit 21). ' +
        'SECURITY.md calls this a release blocker: nothing in the project names a ' +
        'Claude Code version, and an invented one would answer "is this pin current?" ' +
        'wrongly and with full confidence.',
    );
  }
}

/* ── report ──────────────────────────────────────────────────────────── */

const section = (title, items, bullet) => {
  if (items.length === 0) return;
  console.log(`\n${title}`);
  for (const i of items) console.log(`  ${bullet} ${i}`);
};

section('BLOCKERS — these are faults, not choices', blockers, '✗');
section('DECISIONS — a person has to make these', decisions, '?');
section('Notes', notes, '·');

console.log(
  blockers.length === 0 && decisions.length === 0
    ? '\nReady to publish.'
    : `\n${blockers.length} blocker(s), ${decisions.length} decision(s). Not ready.`,
);
process.exitCode = blockers.length > 0 || decisions.length > 0 ? 1 : 0;
