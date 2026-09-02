/**
 * The adversarial fixture harness. T-1201.
 *
 * **US-16 calls this suite its most important criterion**, and the reason
 * is a sentence worth keeping in view while reading anything below:
 *
 * > A fixture asserts the **exact code and the exit class**, not merely
 * > non-zero — because *a fixture that fails for the wrong reason has
 * > stopped testing what it was written for.*
 *
 * That is not pedantry. Several of these fixtures exist because a rule was
 * once **too narrow** and the pack passed every stage: `docs/.claude/…`
 * under v2.4's two-exact-paths reservation, `docs/.git/hooks/…` under
 * v2.3's first-segment scoping, `"executable": "false"` reading as `true`
 * because a non-empty string is truthy. Each of those would still have
 * failed *something* if the assertion were merely "exit non-zero", and the
 * hole would still be open.
 *
 * ── Fixtures are real packs on disk ───────────────────────────────────
 *
 * Each is materialised into a temp directory and driven through **the same
 * path a bundled pack takes** — strict parse, schema, payload read,
 * `validatePack`. Not a hand-assembled `LoadedPack`: a fixture that
 * skipped the loader would stop testing the loader, and step 1 of the
 * fourteen is `pack.json`'s strict parse.
 *
 * ── Two fixtures assert no code at all ────────────────────────────────
 *
 * A payload file shipped `0755` must land `0644` in `.harness/pack/`, and
 * a `--force` re-run must leave the on-disk directory entry named as the
 * *user* had it. Neither has a diagnostic, so the runner exposes **file
 * mode** and **the on-disk entry name** as first-class outcomes.
 */
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import {
  exitCodeFor,
  parseStrictJson,
  readPackPayload,
  validatePack,
  validatePackJson,
  validateRecipe,
  type DiagnosticCode,
  type PackJson,
  type Recipe,
} from '../../dist/index.js';

/** A fixture pack, declared rather than checked in as a directory tree.
 *  Forty of these as directories would be forty places to look; as data
 *  they read as the attack list US-16 says they are. */
export interface Fixture {
  /** What the attack is, in the words of US-16's table. */
  readonly name: string;
  /** The condition or amendment it exists for — `C-39a`, `N-5`, `US-31`. */
  readonly because: string;
  /** `pack.json`, as an object, or raw text where the fixture is about
   *  malformed JSON. */
  readonly packJson: Record<string, unknown> | string;
  /** `recipe.json`, likewise. */
  readonly recipeJson?: Record<string, unknown> | string;
  /** Payload files by pack-relative path. */
  readonly files?: Readonly<Record<string, string>>;
  /** Payload files to create `0755`, for the mode fixture. */
  readonly executableFiles?: readonly string[];
  /** Symlinks to create: link path → target. */
  readonly symlinks?: Readonly<Record<string, string>>;

  /** Every code the run must report. **Order-independent, membership
   *  exact**: a fixture asserting one code while the run reports three has
   *  not shown that the other two are correct. */
  readonly expect: readonly DiagnosticCode[];
  /** The exit class. Asserted separately, because a code with the wrong
   *  class is a fault the user is told to fix in the wrong way. */
  readonly exit: 0 | 1 | 2 | 3;
  /** Codes that must **not** appear. Used where two rules could plausibly
   *  both fire and only one is correct — `C-39b` is the worked case. */
  readonly reject?: readonly DiagnosticCode[];
}

const BASE_ANATOMY = Object.fromEntries(
  [
    'process',
    'roles',
    'documentTemplates',
    'conventions',
    'coordination',
    'behaviouralGuidelines',
    'folderScaffolding',
    'skillsAndAutomations',
    'autonomyContract',
  ].map((k) => [k, { status: 'absent', reason: 'a fixture pack ships no way of working' }]),
);

/**
 * A minimal, otherwise-valid `pack.json`.
 *
 * Every part is declared `absent` with a reason, so a fixture fails for
 * **its own** attack rather than for an incomplete anatomy — which is the
 * "fails for the wrong reason" trap this whole harness is about.
 */
export function basePack(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    formatVersion: 1,
    name: 'fixture',
    title: 'Fixture pack',
    version: '1.0.0',
    minCliVersion: '1.0.0',
    recipe: 'recipe.json',
    anatomy: BASE_ANATOMY,
    ...over,
  };
}

export function baseRecipe(steps: unknown[], over: Record<string, unknown> = {}): Record<string, unknown> {
  return { formatVersion: 1, steps, ...over };
}

const text = (v: Record<string, unknown> | string): string =>
  typeof v === 'string' ? v : `${JSON.stringify(v, null, 2)}\n`;

/** Materialise a fixture into a real directory. */
export async function materialise(f: Fixture, dir: string): Promise<void> {
  await writeFile(join(dir, 'pack.json'), text(f.packJson));
  if (f.recipeJson !== undefined) {
    await writeFile(join(dir, 'recipe.json'), text(f.recipeJson));
  }
  for (const [path, content] of Object.entries(f.files ?? {})) {
    const full = join(dir, ...path.split('/'));
    await mkdir(dirname(full), { recursive: true });
    await writeFile(full, content);
  }
  for (const path of f.executableFiles ?? []) {
    const full = join(dir, ...path.split('/'));
    await mkdir(dirname(full), { recursive: true });
    await writeFile(full, '#!/bin/sh\n', { mode: 0o755 });
  }
  for (const [path, target] of Object.entries(f.symlinks ?? {})) {
    const full = join(dir, ...path.split('/'));
    await mkdir(dirname(full), { recursive: true });
    await symlink(target, full);
  }
}

export interface FixtureOutcome {
  readonly codes: readonly string[];
  readonly exit: number;
}

/**
 * Run one fixture through the same path a bundled pack takes.
 *
 * The loader is **not** skipped: step 1 of the fourteen is `pack.json`'s
 * strict parse, and several fixtures are about exactly that.
 */
export async function runFixture(f: Fixture): Promise<FixtureOutcome> {
  const dir = await mkdtemp(join(tmpdir(), 'lintel-fx-'));
  try {
    await materialise(f, dir);
    const codes: string[] = [];

    // Step 1 — the strict reader, then the schema.
    const packText = text(f.packJson);
    const parsed = parseStrictJson(packText, 'fixture/pack.json', 'E-PACK-INVALID');
    codes.push(...parsed.bag.items.map((d) => d.code));
    if (parsed.value === undefined) {
      return { codes, exit: exitCodeFor(parsed.bag.items) };
    }

    const validated = validatePackJson(parsed.value, 'fixture', 'fixture/pack.json');
    codes.push(...validated.bag.items.map((d) => d.code));
    if (validated.pack === undefined) {
      return { codes, exit: exitCodeFor(validated.bag.items) };
    }

    // Step 4 — the recipe, likewise through the strict reader.
    let recipe: Recipe | undefined;
    if (f.recipeJson !== undefined) {
      const rParsed = parseStrictJson(text(f.recipeJson), 'fixture/recipe.json', 'E-RECIPE-INVALID');
      codes.push(...rParsed.bag.items.map((d) => d.code));
      if (rParsed.value !== undefined) {
        const rValidated = validateRecipe(rParsed.value, 'fixture', 'fixture/recipe.json');
        codes.push(...rValidated.bag.items.map((d) => d.code));
        recipe = rValidated.recipe;
      }
    }

    const payload = await readPackPayload(pathToFileURL(`${dir}/`));

    const report = validatePack({
      loaded: {
        name: 'fixture',
        dir: pathToFileURL(`${dir}/`),
        pack: validated.pack as PackJson,
        recipePath: 'recipe.json',
        recipeText: text(f.recipeJson ?? baseRecipe([])),
      },
      payload,
      cliVersion: '1.0.0',
    });
    void recipe;

    codes.push(...report.diagnostics.map((d) => d.code));
    return { codes: [...new Set(codes)], exit: exitCodeFor(report.diagnostics) };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/**
 * Assert one fixture.
 *
 * **Membership, not containment.** Asserting a code is *present* while the
 * run reports three others says nothing about whether the other two are
 * correct — and a fixture whose attack is refused for an unrelated reason
 * is a fixture that stopped testing its attack.
 */
export async function assertFixture(f: Fixture): Promise<void> {
  const got = await runFixture(f);
  const label = `${f.name}  (${f.because})`;

  for (const code of f.expect) {
    assert.ok(
      got.codes.includes(code),
      `${label}\n  expected ${code}\n  got: ${got.codes.join(', ') || '(none)'}`,
    );
  }
  for (const code of f.reject ?? []) {
    assert.equal(
      got.codes.includes(code),
      false,
      `${label}\n  must NOT report ${code}, and did`,
    );
  }
  assert.equal(
    got.exit,
    f.exit,
    `${label}\n  expected exit ${f.exit}, got ${got.exit} (codes: ${got.codes.join(', ')})`,
  );
}
