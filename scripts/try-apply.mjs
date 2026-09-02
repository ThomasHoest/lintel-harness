#!/usr/bin/env node
/**
 * Apply a pack into a directory, by hand, using the built modules.
 *
 * **This is a scaffold for trying the machinery, not the product.**
 * `lintel harness init` is F2's and still dispatches to a stub, so there
 * is no supported way to do this from the CLI yet. Everything below is the
 * same code path `tests/integration/apply-verify.test.ts` exercises —
 * plan, execute, then verify — with the arguments a person would type.
 *
 * Delete this the day `init` lands. It exists because "can I try it?"
 * deserved a better answer than "not yet".
 *
 *   npm run build
 *   node scripts/try-apply.mjs <coding|writing|planning> <empty-dir> [--verify]
 */
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  atomicWrite, canonicalJson, executeApply, loadPack, packDir, parseStrictJson,
  planApply, planSteps, resolveAnswers, resolveRoot, selectScaffolds,
  validateRecipe, verifyProject, walk,
} from '../dist/index.js';

const CLI = '1.0.0';
const [name, target, ...rest] = process.argv.slice(2);
const doVerify = rest.includes('--verify');

if (!name || !target) {
  console.error('usage: node scripts/try-apply.mjs <coding|writing|planning> <empty-dir> [--verify]');
  process.exit(2);
}

const dir = resolve(target);
await mkdir(dir, { recursive: true });
if (readdirSync(dir).length > 0) {
  console.error(`refusing: ${dir} is not empty. The real init has --force for this; this script does not.`);
  process.exit(1);
}

const say = (s) => console.log(s);

/* ── load and plan ─────────────────────────────────────────────────── */

const { loaded, bag: loadBag } = await loadPack(name, CLI);
if (!loaded) {
  for (const d of loadBag.items) console.error(d.message);
  process.exit(1);
}

const parsed = parseStrictJson(loaded.recipeText, `${name}/recipe.json`, 'E-RECIPE-INVALID');
const { recipe } = validateRecipe(parsed.value, name);

const packRoot = fileURLToPath(packDir(name));
const { entries } = await walk(packRoot);
const payloadEntries = entries.map((e) => ({ path: e.path, kind: e.kind, size: e.size }));
const payload = payloadEntries.filter((e) => e.kind === 'file').map((e) => e.path);
const readPayload = (p) => { try { return readFileSync(join(packRoot, p)); } catch { return null; } };

// Required parameters have no default by definition. The real `init`
// prompts; this fills them in so the script can run unattended.
const supplied = new Map();
for (const p of loaded.pack.parameters ?? []) {
  if (p.required !== true) continue;
  supplied.set(p.id, p.type === 'boolean' ? true : p.type === 'enum' ? (p.values ?? [''])[0] : 'Demo Project');
}
const { answers } = resolveAnswers(loaded.pack.parameters, supplied);
if (supplied.size > 0) say(`answers: ${[...supplied].map(([k, v]) => `${k}=${v}`).join(', ')}`);

const { selected } = selectScaffolds(loaded.pack, []);
const steps = planSteps({ pack: loaded.pack, recipe, selected, answers, payload });

const plan = await planApply({
  packName: name,
  packVersion: loaded.pack.version,
  cliVersion: CLI,
  payloadEntries,
  readPayload,
  phase2: { steps: steps.steps, answers },
  probe: () => null,
});

for (const d of [...steps.bag.items, ...plan.bag.items]) console.error(d.message);
if (plan.bag.items.some((d) => d.severity === 'error')) process.exit(2);

say(`plan: ${plan.files.filter((f) => f.phase === 1).length} payload files, ` +
    `${plan.files.filter((f) => f.phase === 2).length} applied files`);
say(`payloadDigest: ${plan.payloadDigest}`);

/* ── execute ───────────────────────────────────────────────────────── */

const { root } = await resolveRoot(dir);
const manifest = {
  manifestVersion: 1,
  cli: CLI,
  pack: { name, version: loaded.pack.version, formatVersion: loaded.pack.formatVersion },
  payloadDigest: plan.payloadDigest,
  parameters: Object.fromEntries(answers),
  scaffolds: [],
};

const result = await executeApply({
  root,
  command: 'init',
  files: plan.files,
  manifest: { path: '.harness/manifest.json', bytes: Buffer.from(canonicalJson(manifest), 'utf8') },
  writeJournal: async (j) => {
    await atomicWrite(dir, {
      path: '.harness/journal.json',
      bytes: Buffer.from(JSON.stringify(j, null, 2), 'utf8'),
      mode: 0o644,
      expectNew: false,
    });
  },
  removeJournal: async () => { await rm(join(dir, '.harness/journal.json'), { force: true }); },
  readExisting: async () => null,
});

for (const d of result.bag.items) console.error(d.message);
if (!result.complete) {
  console.error('the apply did not complete; the journal is still in place');
  process.exit(3);
}
say(`applied ${result.written.length} files into ${dir}`);

/* ── verify ────────────────────────────────────────────────────────── */

if (!doVerify) process.exit(0);

const recomputed = plan.files
  .filter((f) => f.phase === 2)
  .map((f) => ({
    path: f.path,
    bytes: f.bytes,
    mode: f.executable ? 0o755 : 0o644,
    adaptExpected: steps.adaptExpected.includes(f.path),
    fillExpected: steps.fillExpected.includes(f.path),
  }));

const v = verifyProject({
  recordedDigest: plan.payloadDigest,
  computedDigest: plan.payloadDigest,
  declarations: loaded.pack.parameters ?? [],
  recordedAnswers: answers,
  recomputed,
  onDisk: (p) => {
    try { return { bytes: readFileSync(join(dir, ...p.split('/'))), mode: 0o644 }; }
    catch { return null; }
  },
});

for (const d of v.bag.items) console.error(d.message);
say(`verify: ${JSON.stringify(v.counts)}`);
process.exit(v.bag.items.length > 0 ? 1 : 0);
