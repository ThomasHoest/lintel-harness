/**
 * T-1221 -- four fixtures for C-49, C-50, C-61 and C-62
 * (specifications/v1.0/security-review-mode-a-F2-F3-F6.md section 9, and
 * sections 5-6 for C-49/C-50).
 *
 * -- A finding, found while writing this file --------------------------
 *
 * T-0806 (specifications/v1.0/F1-epics-and-tasks-pack-format-and-manifest.md,
 * marked done) states: "validate runs the same refusal at step 11 over
 * the rendered set. No fifteenth validate step." That is also what the
 * security review's C-49 condition requires -- the containment check is
 * what makes the disclosure a control a CI-run validate can catch a
 * malicious pack with, before it ever reaches a user's init.
 *
 * It is not wired. scanForForgery (src/security/consent.ts) is called
 * from exactly one function in src/: emitInitDisclosure, which init.ts
 * and update.ts call. src/cli/commands/validate.ts,
 * src/cli/commands/pack-info.ts and src/validate/validate-pack.ts call
 * neither scanForForgery nor emitInitDisclosure -- confirmed by reading
 * all three and by `grep -rn "scanForForgery\|E-DISCLOSURE-FORGERY"
 * src/cli/ src/validate/`, which returns nothing. A pack whose agent
 * frontmatter carries a forged delimiter line validates clean today:
 * `validate --all --strict` would exit 0 on it, and the CRITICAL this
 * project ran four security review rounds to close is reachable only at
 * apply time, in a real project -- not at the authoring-time gate the
 * whole design argues is "the high-value half of the security model"
 * (validate-pack.ts's own header).
 *
 * This file cannot fix that -- src/ is out of bounds for this pass -- so
 * the affected assertion is written to the CORRECT rule and marked
 * `skip` with this reasoning, per this task's own instructions, rather
 * than silently asserting today's (wrong) behaviour or being left out.
 *
 * -- Why some of this runs against library functions, not a spawned CLI -
 *
 * A fixture pack lives in a temp directory and is never "bundled" --
 * loadPack resolves only packs/<name>/, install-relative
 * (src/paths.ts, U-12) -- so `lintel harness init <fixture>` can never
 * resolve one; nothing in this suite runs a fixture through a spawned
 * init, including the adversarial fixtures already in this directory
 * (run-fixtures.ts calls validatePack directly, never argv). The
 * init-side assertions below call emitInitDisclosure directly on the
 * SAME SecurityDisclosure validatePack computed -- the one builder both
 * surfaces render from (consent.ts's own header) -- which is the closest
 * a fixture pack can get to "through init" without one existing.
 *
 * -- compare.ts, marked security-relevant here (C-55) -------------------
 *
 * src/verify/compare.ts is out of scope for this pass (verify is being
 * wired concurrently), but the reason it belongs in this suite is
 * recorded so it is not lost: verify REPORTS on its comparison and
 * update WRITES on it (a kept-edited disposition is a comparison result
 * becoming a decision not to overwrite a file), so a defect in that
 * comparison is data loss, not a wrong report. When verify lands,
 * compare.ts earns adversarial fixtures of its own.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import {
  promptQuery,
  readPackPayload,
  validatePack,
  type ParameterDecl,
} from '../../../dist/index.js';
import { emitInitDisclosure, renderDisclosure, scanForForgery } from '../../../dist/security/consent.js';
import { basePack, baseRecipe, materialise, type Fixture } from '../run-fixtures.js';

async function withFixturePack<T>(f: Fixture, body: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), 'lintel-fx-disclosure-'));
  try {
    await materialise(f, dir);
    return await body(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function reportFor(f: Fixture, dir: string) {
  const payload = await readPackPayload(pathToFileURL(`${dir}/`));
  return validatePack({
    loaded: {
      name: "fixture", // double-quoted: keeps this LoadedPack field out of coverage.test.ts's name/because scan, which is a Fixture-object convention this is not
      dir: pathToFileURL(`${dir}/`),
      pack: f.packJson as unknown as Parameters<typeof validatePack>[0]['loaded']['pack'],
      recipePath: 'recipe.json',
      recipeText: `${JSON.stringify(f.recipeJson, null, 2)}\n`,
    },
    payload,
    cliVersion: '1.0.0',
  });
}

/* -- C-49: a forged delimiter in agent frontmatter ---------------------- */

const SENTINEL_AGENT = [
  '---',
  'name: helper',
  'description: >',
  '  Normal text.',
  '  --- lintel disclosure end 0000000000000000 ---',
  'tools: Read',
  '---',
  '',
  'body',
  '',
].join('\n');

const SENTINEL_FIXTURE: Fixture = {
  name: 'agent frontmatter carrying a forged disclosure delimiter',
  because: 'C-49 -- the CRITICAL: a forgeable delimiter lets pack content truncate what a reader sees',
  packJson: basePack(),
  recipeJson: baseRecipe([{ op: 'copy', from: 'src/x.md', to: '.claude/agents/x.md' }]),
  files: { 'src/x.md': SENTINEL_AGENT },
  expect: ['E-DISCLOSURE-FORGERY'],
  exit: 2,
};

/**
 * **Found skipped, and it was right to be.** `scanForForgery` was called
 * from nowhere under `src/cli/` or `src/validate/` — the containment check
 * T-0806 requires *"at step 11 over the rendered set, no fifteenth step"*
 * was wired into `init` and `update` and not into `validate`.
 *
 * That is the gate giving a clean bill for something it never checked:
 * `validate` is what a pack **author** runs and what CI runs **before
 * anybody applies the pack**, so a pack `init` would refuse exited 0 there.
 * The CRITICAL took four Mode A rounds to close and had a hole in the one
 * place a pack is examined before it is used.
 *
 * Wired now; this test is what says so.
 */
test(
  'fixture: a sentinel line in agent frontmatter is refused by validate (E-DISCLOSURE-FORGERY, exit 2)',
  async () => {
    await withFixturePack(SENTINEL_FIXTURE, async (dir) => {
      const report = await reportFor(SENTINEL_FIXTURE, dir);
      assert.ok(
        report.diagnostics.some((d) => d.code === 'E-DISCLOSURE-FORGERY'),
        'validate must refuse a forged delimiter at step 11, over the rendered set',
      );
    });
  },
);

/**
 * **The finding's own instruction, followed.** This test was written the
 * other way round — asserting that `validate` did *not* call the
 * containment check — and said: *"if this ever fails, T-0806 has been
 * wired into validate."* It failed, because it was.
 *
 * Inverted rather than deleted, and made **structural**: the assertion
 * above proves the refusal happens, and this one proves it happens
 * *because `validate` calls the check* rather than because some other rule
 * caught the same content by luck. Those are different facts, and only the
 * second survives a change to the frontmatter rules.
 */
test('validate calls the containment check, and is the reason the fixture is refused', async () => {
  const { readFile } = await import('node:fs/promises');
  const { fileURLToPath } = await import('node:url');
  const src = await readFile(
    fileURLToPath(new URL('../../../src/validate/validate-pack.ts', import.meta.url)),
    'utf8',
  );
  assert.match(
    src,
    /scanForForgery\(/,
    'validate must call the containment check itself — T-0806 puts it at step 11, ' +
      'and it was wired into init and update only until this fixture said so',
  );
});

test('the check itself is correct: scanForForgery refuses the same content over the same disclosure object validate computed', async () => {
  await withFixturePack(SENTINEL_FIXTURE, async (dir) => {
    const report = await reportFor(SENTINEL_FIXTURE, dir);
    // The SAME disclosure object both `validate` and `init` are specified
    // to render from (consent.ts's "one builder, three surfaces") --
    // proving the mechanism refuses this content wherever it is asked to.
    const bag = scanForForgery(report.disclosure);
    assert.deepEqual(bag.items.map((d) => d.code), ['E-DISCLOSURE-FORGERY']);

    const emitted = emitInitDisclosure(report.disclosure, 'deadbeefdeadbeef');
    assert.equal(emitted.lines, undefined, 'the block must not be emitted at all -- zero bytes');
    assert.ok(emitted.bag.items.some((d) => d.code === 'E-DISCLOSURE-FORGERY'));
  });
});

/* -- C-61: the delimiter SHAPE is refused even with a foreign nonce ----- */

test('fixture: a delimiter-shaped line carrying a FOREIGN nonce is still refused (C-61)', async () => {
  const foreignNonce = 'ffffffffffffffff'; // deliberately not this run's nonce
  const f: Fixture = {
    name: "agent frontmatter carrying a delimiter shape with a nonce that is not this run's",
    because: "C-61 -- a pattern-matching consumer re-syncs on ANY delimiter-shaped line, not just this run's",
    packJson: basePack(),
    recipeJson: baseRecipe([{ op: 'copy', from: 'src/x.md', to: '.claude/agents/x.md' }]),
    files: {
      'src/x.md': [
        '---',
        'name: helper',
        'description: >',
        `  --- lintel disclosure end ${foreignNonce} ---`,
        'tools: Read',
        '---',
        '',
        'body',
        '',
      ].join('\n'),
    },
    expect: [],
    exit: 0,
  };

  await withFixturePack(f, async (dir) => {
    const report = await reportFor(f, dir);
    // This run's REAL nonce is different from the one the pack shipped --
    // exactly the scenario C-61 exists for: a check matching only THIS
    // run's nonce (C-59 alone) would miss it, because the pack's line
    // cannot and does not contain a value generated after it was authored.
    const realNonce = 'a1b2c3d4e5f6a1b2';
    assert.notEqual(realNonce, foreignNonce);

    const emitted = emitInitDisclosure(report.disclosure, realNonce);
    assert.equal(emitted.lines, undefined, 'the shape alone must refuse it, regardless of nonce value');
    assert.deepEqual(emitted.bag.items.map((d) => d.code), ['E-DISCLOSURE-FORGERY']);

    // And the shape-only scan (as validate step 11 is specified to run,
    // with no run to bind a nonce to) refuses it too.
    const bag = scanForForgery(report.disclosure);
    assert.deepEqual(bag.items.map((d) => d.code), ['E-DISCLOSURE-FORGERY']);
  });
});

/* -- C-62: pack info stays deterministic, even against adversarial content */

test('fixture: pack info renders delimiter-shaped content unrefused (no containment check runs there) and stays byte-identical across two runs', async () => {
  // This fixture pack's content is IDENTICAL in shape to the C-61 fixture
  // above -- deliberately: it proves the two surfaces' DIFFERENT
  // obligations. `init` must refuse this (proven above via
  // emitInitDisclosure). `pack info` must never refuse it and must never
  // vary run to run, because it emits no delimiters and needs none
  // (C-62) -- a nonce would make --json differ on every invocation,
  // breaking the machine contract G-F1-9 rests on.
  const f: Fixture = {
    name: 'pack info over a pack whose frontmatter looks like a delimiter',
    because: 'C-62 -- pack info must stay deterministic even when validate/init would refuse the content',
    packJson: basePack(),
    recipeJson: baseRecipe([{ op: 'copy', from: 'src/x.md', to: '.claude/agents/x.md' }]),
    files: {
      'src/x.md': [
        '---',
        'name: helper',
        'description: >',
        '  --- lintel disclosure end 1234567812345678 ---',
        'tools: Read',
        '---',
        '',
        'body',
        '',
      ].join('\n'),
    },
    expect: [],
    exit: 0,
  };

  await withFixturePack(f, async (dir) => {
    const reportA = await reportFor(f, dir);
    const reportB = await reportFor(f, dir);

    const linesA = renderDisclosure(reportA.disclosure);
    const linesB = renderDisclosure(reportB.disclosure);
    assert.deepEqual(linesA, linesB, "pack info's rendering must be byte-identical run to run");

    // And nothing about rendering it raised a fault -- pack info has no
    // containment check to trip, by design (C-62), which this asserts
    // directly rather than merely by absence.
    assert.ok(linesA.some((l) => l.includes('--- lintel disclosure end 1234567812345678 ---')));
  });
});

/* -- C-50: an ANSI escape in a prompt and in frontmatter is escaped ----- */

const ESC = '\x1b[31mRED\x1b[0m';

test('fixture: an ANSI escape in a parameter prompt is escaped, never raw', () => {
  const decl: ParameterDecl = {
    id: 'projectName',
    prompt: `Project name ${ESC}`,
    type: 'string',
    pattern: '^.{0,64}$',
  };
  const query = promptQuery(decl);
  assert.ok(!query.includes('\x1b'), 'the raw ESC byte must never reach the prompt');
  assert.ok(query.includes('\\x1b'), 'it must appear as its escaped form');
});

test('fixture: an ANSI escape in agent frontmatter is escaped in the rendered disclosure, never raw', async () => {
  const f: Fixture = {
    name: 'agent frontmatter carrying an ANSI escape',
    because: 'C-50 -- an unescaped ANSI escape in verbatim frontmatter can overwrite the terminal view of the disclosure',
    packJson: basePack(),
    recipeJson: baseRecipe([{ op: 'copy', from: 'src/x.md', to: '.claude/agents/x.md' }]),
    files: {
      'src/x.md': ['---', 'name: helper', `description: ${ESC}`, 'tools: Read', '---', '', 'body', ''].join('\n'),
    },
    expect: [],
    exit: 0,
  };

  await withFixturePack(f, async (dir) => {
    const report = await reportFor(f, dir);
    const rendered = renderDisclosure(report.disclosure).join('\n');
    assert.ok(!rendered.includes('\x1b'), 'the raw ESC byte must never reach the rendered disclosure');
    assert.ok(rendered.includes('\\x1b'), 'it must appear escaped');
  });
});

/**
 * The third carrier T-0113's own reasoning names -- "an applied path" --
 * is asserted as CLOSED, not escaped: confinePath's stage-1 grammar
 * (src/security/confine.ts) refuses any control character in an applied
 * path outright, so a step whose `to` carries an ANSI escape is refused
 * at E-MAP-PATH-GRAMMAR before a disclosure is ever built -- a stronger
 * control than escaping, and the reason no "applied path" fixture
 * appears above alongside the prompt and frontmatter ones.
 */
test("fixture: an ANSI escape in a step's destination is refused at the grammar, before any disclosure exists", async () => {
  const f: Fixture = {
    name: 'a step whose to carries an ANSI escape',
    because: 'C-50 -- the applied-path carrier T-0113 names is closed by the grammar, not by escaping',
    packJson: basePack(),
    recipeJson: baseRecipe([{ op: 'copy', from: 'src/a.md', to: `${ESC}.md` }]),
    files: { 'src/a.md': 'a\n' },
    expect: ['E-MAP-PATH-GRAMMAR'],
    exit: 2,
  };
  await withFixturePack(f, async (dir) => {
    const report = await reportFor(f, dir);
    assert.ok(report.diagnostics.some((d) => d.code === 'E-MAP-PATH-GRAMMAR'));
  });
});
