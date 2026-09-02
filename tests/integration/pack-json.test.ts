/**
 * `pack.json` as a contract: US-1, US-2, US-8 and US-9. T-0311.
 *
 * ── What makes these ACCEPTANCE tests, and how they differ ────────────
 *
 * `src/pack/*.test.ts` already covers each module alone. These assert the
 * **stories' criteria as stated**, across modules, from the position of
 * the person the story is written for. Three shapes recur:
 *
 *   THE WHOLE PATH   a rule that spans two modules is asserted end to
 *                    end. A `flag` declared in `pack.json` is followed
 *                    through `schema.ts`, `parameters.ts` and `flags.ts`
 *                    until `--calibration high-floor` has become
 *                    `--set constraintFloor=high-floor` — because "the
 *                    CLI holds no pack-specific knowledge" is a claim no
 *                    single module can be held to.
 *   THE ENUMERATION  where a story closes a list — nine anatomy parts,
 *                    nine outcomes, six required fields, the reserved
 *                    flags — the **completeness** is asserted, not just a
 *                    member. A closed list goes false silently.
 *   THE PRODUCT      where a criterion is a fact about what ships, it is
 *                    checked against the three bundled packs on disk
 *                    rather than a fixture, because a fixture cannot go
 *                    stale and a shipping pack can.
 *
 * Where a criterion is already fully covered by a unit test, the
 * story-level claim is asserted here instead and the unit test is named.
 *
 * ── What is NOT asserted here, and why ───────────────────────────────
 *
 * `loadPack` resolves **only bundled packs**, install-relative and never
 * from `cwd` (SEC, `paths.ts`). That is the right design and it has a
 * testing consequence: every fault `loadPack` alone can raise —
 * `E-PACK-FORMAT-NEWER`, `E-RECIPE-MISSING`, `E-PAYLOAD-PATH-INVALID` on
 * a `recipe` value, and the `recipe` default — **has no reachable subject
 * until a fixture pack directory exists** (T-1201). Each is marked below
 * where it would have gone. They are not covered by omission.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { EXIT } from '../harness/cli.js';
import {
  ANATOMY_PART_IDS,
  MAX_COMBINATIONS,
  MAX_LENGTH_CEILING,
  PACK_NAME_RE,
  RESERVED_FLAGS,
  SUPPORTED_FORMAT_VERSION,
  aliasesFor,
  bundledPackNames,
  checkAnatomy,
  checkCliFloor,
  checkParameterSet,
  checkRecordedAnswers,
  checkScaffoldCollisions,
  checkWhenParameters,
  combinations,
  commandsAccepting,
  exitClassFor,
  loadPack,
  OWNER,
  packDir,
  parametersFor,
  parseSemver,
  parseStrictJson,
  parsePass2,
  resolveAnswers,
  selectScaffolds,
  selectedIds,
  validatePackJson,
  walk,
} from '../../dist/index.js';
import type {
  Answer,
  DiagnosticCode,
  JsonValue,
  PackJson,
  ParameterDecl,
  ScaffoldDecl,
} from '../../dist/index.js';

/** The version under test. `checkCliFloor`'s only other input. */
const CLI_VERSION = '1.0.0';

/** The three, and the order `bundledPackNames()` reports them in. */
const BUNDLED = ['coding', 'planning', 'writing'] as const;

const codes = (b: { items: readonly { code: DiagnosticCode }[] }): DiagnosticCode[] =>
  b.items.map((d) => d.code);

/** A pack that validates cleanly, as the base for a negative case. */
function base(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const anatomy: Record<string, unknown> = {};
  for (const p of ANATOMY_PART_IDS) anatomy[p] = { paths: [`${p}/**`] };
  return {
    formatVersion: 1,
    name: 'demo',
    version: '1.0.0',
    title: 'Demo',
    minCliVersion: '1.0.0',
    recipe: 'recipe.json',
    anatomy,
    ...overrides,
  };
}

const check = (o: Record<string, unknown>, name = 'demo') => validatePackJson(o as never, name);

/** A bundled pack's declaration, read off disk through the real reader. */
async function declarationOf(name: string): Promise<PackJson> {
  const text = await readFile(fileURLToPath(new URL('pack.json', packDir(name))), 'utf8');
  const parsed = parseStrictJson(text, `packs/${name}/pack.json`, 'E-PACK-INVALID');
  assert.notEqual(parsed.value, undefined, `${name}/pack.json must parse`);
  const r = validatePackJson(parsed.value as JsonValue, name, `packs/${name}/pack.json`);
  assert.ok(r.pack, `${name}/pack.json must validate: ${codes(r.bag).join(', ')}`);
  return r.pack;
}

/** A bundled pack's `recipe.json`, through the same reader. */
async function recipeOf(name: string): Promise<Record<string, JsonValue>> {
  const text = await readFile(fileURLToPath(new URL('recipe.json', packDir(name))), 'utf8');
  const parsed = parseStrictJson(text, `packs/${name}/recipe.json`, 'E-RECIPE-INVALID');
  assert.notEqual(parsed.value, undefined, `${name}/recipe.json must parse`);
  return parsed.value as Record<string, JsonValue>;
}

/** The payload paths a pack's anatomy globs are matched against. */
async function payloadOf(name: string): Promise<readonly string[]> {
  const w = await walk(fileURLToPath(packDir(name)), { skip: [] });
  return w.entries.filter((e) => e.kind === 'file').map((e) => e.path);
}

/* ══ US-1 — identity, versions and recipe ════════════════════════════ */

/**
 * The story's own sentence: *"an applied project can record exactly what
 * it got and the CLI knows how to apply it."* Both halves are one
 * traversal — resolve the pack, read it through the strict reader,
 * validate it, and come out holding the fields the manifest records plus
 * the recipe the apply runs.
 */
test('every bundled pack resolves, parses, validates and yields its identity', async () => {
  const names = await bundledPackNames();
  assert.deepEqual([...names], [...BUNDLED], 'the product ships exactly these three');

  for (const name of names) {
    const r = await loadPack(name, CLI_VERSION);
    assert.deepEqual(r.bag.errors.map((d) => d.code), [], name);
    assert.ok(r.loaded, `${name} must load`);
    const { pack, recipePath, recipeText } = r.loaded;

    // The six fields US-1 requires, each checked for the property the
    // manifest or the apply depends on rather than merely for presence.
    assert.ok(Number.isInteger(pack.formatVersion), `${name} formatVersion is an integer`);
    assert.ok(PACK_NAME_RE.test(pack.name), `${name} name matches the declared grammar`);
    assert.equal(pack.name, name, 'and equals the directory it sits in');
    assert.notEqual(parseSemver(pack.version), null, `${name} version is semver`);
    assert.notEqual(parseSemver(pack.minCliVersion), null, `${name} minCliVersion is semver`);
    assert.ok(pack.title.length > 0, `${name} declares a title`);

    // "the CLI knows how to apply it" — the recipe resolved to real bytes
    // inside the pack. A `recipe` that resolved to nothing would produce
    // a payload and nothing else (`E-RECIPE-MISSING`'s own wording).
    assert.ok(recipePath.length > 0);
    assert.ok(recipeText.length > 0, `${name} recipe has content`);

    // No `contentRoot`, at v1.0 or ever: every pack-relative path
    // resolves against the pack directory, which is what phase 1 copies.
    assert.equal((pack as unknown as Record<string, unknown>)['contentRoot'], undefined);
  }
});

/**
 * The two exit classes US-1 rests on, side by side.
 *
 * They are easy to conflate and the whole diagnostic model depends on not
 * doing so: a name that is not bundled is **the user's** (exit 1 — they
 * can retype it), while a declaration that disagrees with its own
 * directory is **the pack's** (exit 2 — nobody running the command can
 * fix it).
 */
test('an unbundled name is the user’s fault; a wrong declaration is the pack’s', async () => {
  const unknown = await loadPack('no-such-pack', CLI_VERSION);
  assert.deepEqual(codes(unknown.bag), ['E-CLI-UNKNOWN-PACK']);
  assert.equal(exitClassFor('E-CLI-UNKNOWN-PACK'), EXIT.userFault);
  assert.equal(unknown.loaded, undefined);
  for (const n of BUNDLED) {
    assert.ok(unknown.bag.items[0]!.message.includes(n), `lists ${n} verbatim`);
  }

  // The same real declaration, judged against a directory it does not
  // name. `coding`'s pack.json in a directory called `planning` would
  // resolve under one name and describe itself as another.
  const text = await readFile(fileURLToPath(new URL('pack.json', packDir('coding'))), 'utf8');
  const parsed = parseStrictJson(text, 'packs/planning/pack.json', 'E-PACK-INVALID');
  const mismatch = validatePackJson(parsed.value as JsonValue, 'planning');
  assert.ok(mismatch.bag.has('E-PACK-INVALID'), codes(mismatch.bag).join(', '));
  assert.equal(exitClassFor('E-PACK-INVALID'), EXIT.integrityFault);
  assert.equal(mismatch.pack, undefined, 'a half-loaded pack is the shape to refuse');
});

/**
 * *"`version` and `minCliVersion` are valid semver; a non-semver value
 * fails validation."*
 *
 * The criterion names no code, so what is asserted is the **class** — exit
 * 2, and no pack returned — with the code read off whatever the validator
 * raises rather than written down here. The fault matters because the
 * floor comparison **fails open** on an unparseable version:
 * `satisfiesFloor` answers `null`, which is neither "too old" nor "new
 * enough", and a floor nobody can be below is not a floor.
 */
test('a non-semver version or floor fails validation, and returns no pack', () => {
  for (const key of ['version', 'minCliVersion']) {
    const r = check(base({ [key]: 'v1' }));
    assert.equal(r.bag.errors.length, 1, `${key}: ${codes(r.bag).join(', ')}`);
    assert.equal(r.bag.exitCode(), EXIT.integrityFault, `${key} is the pack's fault`);
    assert.equal(r.pack, undefined, `${key}: nothing may proceed on an unusable version`);
    assert.ok(
      r.bag.items[0]!.message.includes('v1'),
      'the offending value is shown, because the author has to find it',
    );
  }
});

/**
 * The `minCliVersion` floor: a CLI below it refuses the pack with
 * `E-PACK-CLI-TOO-OLD`, exit 1, naming all four values the Error States
 * row interpolates; at or above the floor, silence.
 *
 * Exit **1** and not 2, which is the distinction worth pinning: the pack
 * is not wrong, the CLI is old, and the person running the command can fix
 * that — which is why the message ends in an upgrade line.
 */
test('a CLI below the floor is refused, and told what to do about it', async () => {
  const pack = await declarationOf('coding');

  const tooOld = checkCliFloor(pack, '0.9.0');
  assert.deepEqual(codes(tooOld), ['E-PACK-CLI-TOO-OLD']);
  assert.equal(exitClassFor('E-PACK-CLI-TOO-OLD'), EXIT.userFault, 'upgradeable, so the user’s');
  const m = tooOld.items[0]!.message;
  for (const part of [pack.name, pack.version, pack.minCliVersion, '0.9.0']) {
    assert.ok(m.includes(part), `the message names ${part}: ${m}`);
  }
  // The package name, read from `package.json` rather than written out.
  // Three remedies in the catalogue name it, and the name changed once
  // already — a literal here would pin the test to yesterday's registry.
  const { name } = JSON.parse(
    await readFile(fileURLToPath(new URL('../../package.json', import.meta.url)), 'utf8'),
  ) as { name: string };
  assert.ok(m.includes(`npm i -g ${name}@latest`), `the remedy is actionable: ${m}`);

  assert.deepEqual(codes(checkCliFloor(pack, pack.minCliVersion)), [], 'equal meets the floor');
  assert.deepEqual(codes(checkCliFloor(pack, '2.0.0')), [], 'and newer does too');
});

/**
 * `formatVersion`: *"equal or lower proceeds"*, which is the half that has
 * a subject.
 *
 * The other half — *"greater than the CLI's supported pack-format version
 * fails with `E-PACK-FORMAT-NEWER`"* — is checked inside `loadPack`, on a
 * declaration read from the bundled pack directory. Every bundled pack
 * declares format 1, so **no input reachable from the public interface
 * can raise it**. It needs a fixture pack the loader can resolve
 * (T-1201), and until then it is unasserted rather than passing.
 */
test('every bundled pack declares a format this CLI supports, and loads', async () => {
  assert.equal(SUPPORTED_FORMAT_VERSION, 1);
  for (const name of BUNDLED) {
    const pack = await declarationOf(name);
    assert.ok(
      pack.formatVersion <= SUPPORTED_FORMAT_VERSION,
      `${name} declares format ${pack.formatVersion}`,
    );
    assert.ok((await loadPack(name, CLI_VERSION)).loaded, `${name} proceeds`);
  }
});

/**
 * C-16's asymmetry, on a real document rather than a fixture.
 *
 * An unknown **key** is a pack talking to a future version — refusing it
 * would make every forward-compatible addition breaking — so it warns and
 * the pack stays usable. An unknown **value in a behaviour-selecting
 * position** is the opposite case: ignoring one runs behaviour the pack
 * did not ask for, so it is fatal and the pack is not returned at all.
 */
test('an unknown key warns and the pack still applies; an unknown value stops it', async () => {
  const real = await declarationOf('coding');
  const asObject = real as unknown as Record<string, unknown>;

  const withKey = check({ ...asObject, futureThing: 1 }, 'coding');
  assert.deepEqual(codes(withKey.bag), ['W-UNKNOWN-KEY']);
  assert.equal(withKey.bag.items[0]!.class, 'defect', 'the author is expected to remove it');
  assert.equal(withKey.bag.exitCode(), EXIT.ok, 'a warning is not a failure');
  assert.equal(withKey.bag.exitCode(true), EXIT.userFault, 'but --strict promotes a defect');
  assert.ok(withKey.pack, 'and the pack is still usable, which is the whole point');

  // `AnatomyDecl.status` is one of the six behaviour-selecting positions.
  const anatomy = { ...(asObject['anatomy'] as Record<string, unknown>) };
  anatomy['process'] = { paths: ['specifications/**'], status: 'partial' };
  const withValue = check({ ...asObject, anatomy }, 'coding');
  assert.ok(withValue.bag.has('E-UNKNOWN-VALUE'), codes(withValue.bag).join(', '));
  assert.equal(exitClassFor('E-UNKNOWN-VALUE'), EXIT.integrityFault);
  assert.equal(withValue.pack, undefined, 'zero bytes written follows from refusing to load it');
});

/**
 * C-34, as the security claim it is rather than as a typing rule.
 *
 * `notASecret` **disables** the credential ban. In JavaScript `"no"` is
 * truthy, so before C-34 a typo in that field turned the ban off silently.
 * The property worth asserting is not "a string is rejected" — that is
 * `schema.test.ts`'s — but that **no path exists** from a mistyped
 * `notASecret` to a pack whose credential ban has been disabled: the
 * declaration never validates, so `checkParameterSet` never sees it.
 */
test('a mistyped notASecret cannot disarm the credential ban', () => {
  const credential = (notASecret: unknown): Record<string, unknown> =>
    base({
      parameters: [
        {
          id: 'apiKey',
          prompt: 'API key',
          type: 'string',
          pattern: '^[A-Za-z0-9]{1,64}$',
          ...(notASecret === undefined ? {} : { notASecret }),
        },
      ],
    });

  // Undeclared: the ban fires, exit 2, and it is the pack's fault.
  const banned = check(credential(undefined));
  assert.ok(banned.pack, 'the declaration itself is well-formed');
  assert.deepEqual(codes(checkParameterSet(banned.pack)), ['E-PARAM-SECRET-SUSPECTED']);
  assert.equal(exitClassFor('E-PARAM-SECRET-SUSPECTED'), EXIT.integrityFault);
  assert.match(
    checkParameterSet(banned.pack).items[0]!.message,
    /manifest\.json, which this project commits to version control/,
    'the message states where the answer ends up — that is the argument, not a decoration',
  );

  // Mistyped: the pack does not validate, so nothing downstream can be
  // reached with the ban off.
  const mistyped = check(credential('no'));
  assert.ok(mistyped.bag.has('E-UNKNOWN-VALUE'), codes(mistyped.bag).join(', '));
  assert.equal(mistyped.pack, undefined, 'there is no half-validated pack to hand on');

  // The real boolean, and only the real boolean, clears it.
  const declared = check(credential(true));
  assert.ok(declared.pack);
  assert.deepEqual(codes(checkParameterSet(declared.pack)), []);
});

// The heuristic's deliberate blind spot. A bare `key` is not matched
// because it false-positives on ordinary words, and a ban that cried wolf
// would be turned off wholesale — which is the failure mode that matters
// more than the miss.
test('the credential matcher does not fire on monkey, keyword or sortKey', () => {
  for (const id of ['monkey', 'keyword', 'sortKey']) {
    const r = check(
      base({ parameters: [{ id, prompt: 'A thing', type: 'string', pattern: '^.{1,8}$' }] }),
    );
    assert.ok(r.pack, id);
    assert.deepEqual(codes(checkParameterSet(r.pack)), [], id);
  }
});

/**
 * `provenance`, which exists because F5 requires it (Q-60).
 *
 * The point of defining the key was that every bundled pack was raising a
 * `defect`-class warning **for doing exactly what F5 demands**. So the
 * assertion is over the shipping packs, not a fixture: each declares
 * provenance, and none warns.
 */
test('every bundled pack records its provenance without tripping a warning', async () => {
  for (const name of BUNDLED) {
    const pack = await declarationOf(name);
    assert.notEqual(pack.provenance, undefined, `${name} must record what it derives from`);

    const text = await readFile(fileURLToPath(new URL('pack.json', packDir(name))), 'utf8');
    const parsed = parseStrictJson(text, `packs/${name}/pack.json`, 'E-PACK-INVALID');
    const r = validatePackJson(parsed.value as JsonValue, name);
    assert.deepEqual(r.bag.promotable.map((d) => d.code), [], `${name} is clean under --strict`);
  }
});

/* ══ US-2 — the nine-part anatomy ════════════════════════════════════ */

/**
 * **The nine outcomes of a part declaration**, enumerated from US-2 and
 * each asserted with its code and its exit class.
 *
 * The individual rules are unit-covered (`src/pack/anatomy.test.ts`); what
 * this adds is the **enumeration**. US-2 draws its line on decidability —
 * a contradiction is fatal, a redundancy is a warning — and a table with
 * a row missing would read exactly like a complete one.
 */
interface Outcome {
  readonly what: string;
  /** How the `roles` part is declared; `null` removes the key entirely. */
  readonly decl: Record<string, unknown> | null;
  readonly expect: readonly DiagnosticCode[];
  /** What the nine-row report says for `roles`. */
  readonly row: string;
  readonly why: string;
}

const OUTCOMES: readonly Outcome[] = [
  {
    what: '1. the key is absent',
    decl: null,
    expect: ['E-ANATOMY-MISSING'],
    row: 'missing',
    why: 'G-F1-3 — a pack that silently omits a part must fail, not default',
  },
  {
    what: '2. present, but says nothing about where its content is',
    decl: { status: 'present' },
    expect: ['E-ANATOMY-MISSING'],
    row: 'missing',
    why: 'a declared part empty of meaning is the same omission wearing a status',
  },
  {
    what: '3. present, globs match no file',
    decl: { paths: ['roles/nothing-here.md'] },
    expect: ['E-ANATOMY-EMPTY'],
    row: 'present',
    why: 'accepting it is how a pack ends up believing it declared something it did not',
  },
  {
    what: '4. provisional without a note',
    decl: { paths: ['roles/**'], status: 'provisional' },
    expect: ['E-ANATOMY-NO-NOTE'],
    row: 'provisional',
    why: 'provisional without a note is an unexplained gap, not a declared one',
  },
  {
    what: '5. provisional, well formed',
    decl: { paths: ['roles/**'], status: 'provisional', note: 'the role set is unsettled' },
    expect: ['W-ANATOMY-PROVISIONAL'],
    row: 'provisional',
    why: 'a NOTICE — the pack declared this on purpose and no change would clear it',
  },
  {
    what: '6. absent without a reason',
    decl: { status: 'absent' },
    expect: ['E-ANATOMY-NO-REASON'],
    row: 'absent',
    why: 'an absence with no reason is indistinguishable from an oversight',
  },
  {
    what: '7. absent, well formed',
    decl: { status: 'absent', reason: 'this pack ships no roles' },
    expect: ['W-ANATOMY-ABSENT'],
    row: 'absent',
    why: 'a NOTICE for the same reason as provisional — the reason is what the message prints',
  },
  {
    what: '8. absent AND carrying content — a contradiction',
    decl: { status: 'absent', reason: 'none', paths: ['roles/**'] },
    expect: ['W-ANATOMY-ABSENT', 'E-ANATOMY-SOURCE-ON-ABSENT'],
    row: 'absent',
    why: 'the format cannot pick between "does not exist" and "here is its content"',
  },
  {
    what: '9. present AND carrying a reason — a redundancy',
    decl: { paths: ['roles/**'], reason: 'ignored here' },
    expect: ['W-UNKNOWN-KEY'],
    row: 'present',
    why: 'the key is ignored, so the author is expected to delete it: a DEFECT, unlike 5 and 7',
  },
];

function anatomyPack(rolesDecl: Record<string, unknown> | null): PackJson {
  const anatomy: Record<string, unknown> = {};
  for (const p of ANATOMY_PART_IDS) anatomy[p] = { paths: [`${p}/**`] };
  if (rolesDecl === null) delete anatomy['roles'];
  else anatomy['roles'] = rolesDecl;
  return { name: 'demo', anatomy } as unknown as PackJson;
}

const ANATOMY_PAYLOAD = ANATOMY_PART_IDS.map((p) => `${p}/x.md`);

for (const o of OUTCOMES) {
  test(`anatomy outcome ${o.what}`, () => {
    const r = checkAnatomy(anatomyPack(o.decl), ANATOMY_PAYLOAD);
    assert.deepEqual(codes(r.bag), [...o.expect], o.why);
    assert.equal(r.rows.find((x) => x.part === 'roles')?.status, o.row, 'the report row');
    assert.equal(r.rows.length, 9, 'nine rows whatever the outcome');

    // The exit class comes from the code, never from the occasion — so it
    // is read off the code rather than written down beside it.
    const expected = o.expect.some((c) => c.startsWith('E-')) ? EXIT.integrityFault : EXIT.ok;
    assert.equal(r.bag.exitCode(), expected, `${o.expect.join(', ')}`);
  });
}

// The enumeration itself. Nine outcomes, and every code US-2 names is
// reachable by exactly one of them — a row silently lost would leave a
// code with no subject, which is the shape this asserts against.
test('the nine outcomes cover every code US-2 names', () => {
  assert.equal(OUTCOMES.length, 9);
  const raised = new Set(OUTCOMES.flatMap((o) => o.expect));
  assert.deepEqual(
    [...raised].sort(),
    [
      'E-ANATOMY-EMPTY',
      'E-ANATOMY-MISSING',
      'E-ANATOMY-NO-NOTE',
      'E-ANATOMY-NO-REASON',
      'E-ANATOMY-SOURCE-ON-ABSENT',
      'W-ANATOMY-ABSENT',
      'W-ANATOMY-PROVISIONAL',
      'W-UNKNOWN-KEY',
    ],
    'every anatomy code has exactly one outcome that produces it',
  );
});

/**
 * `--strict` must not promote a notice, and this is the case that made
 * Q-60 necessary rather than tidy.
 *
 * Outcomes 5 and 7 are the two states a pack **declares on purpose**. If
 * `--strict` promoted them, `writing` and `planning` could never pass CI
 * for being honest about themselves.
 */
test('a well-formed provisional or absent part passes --strict', () => {
  for (const o of [OUTCOMES[4]!, OUTCOMES[6]!]) {
    const r = checkAnatomy(anatomyPack(o.decl), ANATOMY_PAYLOAD);
    assert.equal(r.bag.items[0]!.class, 'notice', o.what);
    assert.equal(r.bag.exitCode(true), EXIT.ok, 'no flag in this CLI may promote a notice');
    assert.deepEqual(r.bag.promotable.map((d) => d.code), []);
  }
});

/**
 * *"A fourth value, `missing`, is emitted only for an invalid pack and
 * never appears for a pack that passes validation."*
 *
 * Checked against the product: nine rows per pack, none of them `missing`.
 * `missing` is deliberately not an `AnatomyStatus`, so a pack cannot
 * declare itself into this state — which is only true if nothing that
 * validates ever reports it.
 */
test('no bundled pack reports a missing part, and each reports nine', async () => {
  for (const name of BUNDLED) {
    const pack = await declarationOf(name);
    const r = checkAnatomy(pack, await payloadOf(name));
    assert.equal(r.rows.length, 9, name);
    assert.deepEqual(r.rows.map((x) => x.part), [...ANATOMY_PART_IDS], `${name} report order`);
    assert.deepEqual(r.rows.filter((x) => x.status === 'missing'), [], name);
    assert.deepEqual(r.bag.errors.map((d) => d.code), [], name);
    assert.equal(r.bag.exitCode(true), EXIT.ok, `${name} must pass validate --strict`);
  }
});

/**
 * US-2's last criterion, which is the one that turns an editorial claim
 * into a check: *"the counts F5 asserts as an NFR — exactly two `absent`
 * and exactly one `provisional` across the three v1.0 packs — are
 * therefore mechanically checkable rather than editorial."*
 *
 * The identities are asserted too, not just the counts. Two absent parts
 * moving from `writing` to `coding` would keep the count and change what
 * the product is.
 */
test('the F5 anatomy counts are mechanical: two absent, one provisional', async () => {
  const found: string[] = [];
  for (const name of BUNDLED) {
    const r = checkAnatomy(await declarationOf(name), await payloadOf(name));
    for (const row of r.rows) {
      if (row.status !== 'present') found.push(`${name}:${row.part}=${row.status}`);
    }
  }
  assert.deepEqual(found.sort(), [
    'planning:roles=provisional',
    'writing:autonomyContract=absent',
    'writing:skillsAndAutomations=absent',
  ]);
});

/* ══ US-8 — parameters, answers and flag aliases ═════════════════════ */

const stringParam = (over: Partial<ParameterDecl> = {}): ParameterDecl =>
  ({
    id: 'projectName',
    prompt: 'Project name?',
    type: 'string',
    pattern: '^[a-z]{1,8}$',
    ...over,
  }) as ParameterDecl;

/**
 * The declaration constrains the answer — across two modules.
 *
 * C-7 requires an anchored `pattern` on every string parameter because
 * *"every string answer is recorded verbatim in a committed manifest and
 * replayed on every verify"*. That is only true if the pattern the schema
 * accepted is the pattern the answer is judged against, which no single
 * module can show.
 */
test('a pattern the schema accepted is the pattern an answer is judged by', () => {
  const r = check(base({ parameters: [stringParam()] }));
  assert.ok(r.pack, codes(r.bag).join(', '));
  const params = r.pack.parameters ?? [];

  const good = resolveAnswers(params, new Map<string, Answer>([['projectName', 'harness']]));
  assert.deepEqual(codes(good.bag), []);
  assert.equal(good.answers.get('projectName'), 'harness');

  const bad = resolveAnswers(params, new Map<string, Answer>([['projectName', 'NOT LOWER']]));
  assert.deepEqual(codes(bad.bag), ['E-PARAM-INVALID']);
  assert.equal(bad.answers.get('projectName'), undefined, 'a rejected answer is not recorded');
  assert.match(bad.bag.items[0]!.message, /\^\[a-z\]\{1,8\}\$/, 'the pattern is shown verbatim');
});

/**
 * **C-29 — one check, two occasions, two codes.**
 *
 * The same value against the same declaration, differing only in where it
 * came from. This is §Error States' own rule applied to itself: *"severity
 * is a property of the code, not of the occasion — a scenario fatal in one
 * context and tolerable in another gets two codes."*
 *
 * `parameters.test.ts` asserts the split at `checkAnswer`. What is asserted
 * here is the split **on the two paths a caller actually takes**:
 * `resolveAnswers` is collection and `checkRecordedAnswers` is read-back,
 * and no argument passes between them that could get the occasion wrong.
 */
test('the same bad answer is exit 1 when typed and exit 2 when read back', () => {
  const r = check(base({ parameters: [stringParam()] }));
  const params = r.pack!.parameters ?? [];
  const offending: Answer = 'NOT LOWER';

  const collected = resolveAnswers(params, new Map([['projectName', offending]]));
  assert.deepEqual(codes(collected.bag), ['E-PARAM-INVALID']);
  assert.equal(exitClassFor('E-PARAM-INVALID'), EXIT.userFault, 'the user typed it');
  assert.equal(collected.bag.exitCode(), EXIT.userFault);

  const readBack = checkRecordedAnswers(params, new Map([['projectName', offending]]));
  assert.deepEqual(codes(readBack), ['E-MANIFEST-ANSWER-INVALID']);
  assert.equal(
    exitClassFor('E-MANIFEST-ANSWER-INVALID'),
    EXIT.integrityFault,
    'nobody typed it: the manifest was edited, or the declaration moved under it',
  );
  assert.match(
    readBack.items[0]!.message,
    /Nobody typed this/,
    'and the message says so, because the remedy is not "retype it"',
  );
});

/**
 * C-7's bound, as the construction argument it is.
 *
 * The order of two checks inside `checkAnswer` is unit-tested. The claim
 * here is the one that spans the modules: **no answer longer than the
 * ceiling can ever reach the regex engine**, because a declaration whose
 * `maxLength` exceeds the ceiling is refused at validate time, so the
 * bound applied at answer time is always at most `MAX_LENGTH_CEILING`.
 */
test('pattern evaluation is bounded by construction, not by discipline', () => {
  const overCeiling = check(base({ parameters: [stringParam({ maxLength: MAX_LENGTH_CEILING + 1 })] }));
  assert.ok(overCeiling.bag.has('E-PARAM-PATTERN-INVALID'), codes(overCeiling.bag).join(', '));
  assert.equal(overCeiling.pack, undefined, 'so no such declaration reaches an answer');

  const atCeiling = check(base({ parameters: [stringParam({ maxLength: MAX_LENGTH_CEILING })] }));
  assert.ok(atCeiling.pack);
  // Spaces, not a run of one letter. `valueLooksSecret`'s "high-entropy
  // base64url" arm is a SHAPE check — `/^[A-Za-z0-9_-]{40,}$/`, no entropy
  // measured — so 4097 letters draws `W-ANSWER-LOOKS-SECRET` as well, and
  // the extra code would make this test read as being about two things.
  const huge = 'ab '.repeat(1400);
  assert.ok(huge.length > MAX_LENGTH_CEILING);
  const r = resolveAnswers(atCeiling.pack.parameters ?? [], new Map([['projectName', huge]]));
  assert.deepEqual(codes(r.bag), ['E-PARAM-INVALID']);
  assert.match(
    r.bag.items[0]!.message,
    /at most 4096 characters/,
    'refused for its LENGTH — it was never handed to the engine',
  );
});

/**
 * **The flag alias, followed all the way down.** US-8's own example, on
 * the pack that ships it.
 *
 * *"`--calibration high-floor` is exactly `--set constraintFloor=high-floor`:
 * the alias is registered from `pack.json` data at argv-parse time, and
 * the CLI holds no pack-specific knowledge. This is what keeps S5
 * testable."* Three modules — `schema.ts` validated the declaration,
 * `parameters.ts` built the table, `flags.ts` parsed with it — and no line
 * of the CLI knows the word `calibration`.
 */
test('a pack-declared alias becomes --set, keyed by the parameter id', async () => {
  const loaded = await loadPack('planning', CLI_VERSION);
  const pack = loaded.loaded!.pack;
  const aliases = aliasesFor(pack.parameters);
  assert.deepEqual(Object.keys(aliases), ['calibration'], 'read from pack.json, not from code');

  const r = parsePass2(['--calibration', 'high-floor'], 'init', aliases);
  assert.deepEqual(codes(r.bag), []);
  assert.deepEqual(r.parsed.flags['set'], ['constraintFloor=high-floor']);
  assert.equal(r.parsed.flags['calibration'], undefined, 'recorded under the id, never the flag');
  assert.deepEqual(r.parsed.deferred, [], 'nothing is left unplaced after pass 2');

  // The other half of "the CLI holds no pack-specific knowledge": without
  // the pack's table the very same token is simply unknown.
  const blind = parsePass2(['--calibration', 'high-floor'], 'init', {});
  assert.deepEqual(codes(blind.bag), ['E-CLI-UNKNOWN-FLAG']);
});

/**
 * The reserved list is the **whole** list, and the rule has two halves
 * that live in different modules. Asserting one without the other would
 * leave the shadowing this rule exists to prevent still reachable.
 */
test('no reserved flag can be claimed as an alias, in either module', () => {
  for (const flag of RESERVED_FLAGS) {
    const r = check(base({ parameters: [stringParam({ flag })] }));
    assert.ok(r.bag.has('E-PARAM-FLAG-INVALID'), `${flag} must be refused at validate time`);
    assert.equal(exitClassFor('E-PARAM-FLAG-INVALID'), EXIT.integrityFault, 'the author’s');

    // And if such a pack ever reached the parser anyway, the alias table
    // still refuses to register it — defence in depth, because `--force`
    // and `--dry-run` gate behaviour F1 fixes.
    const table = aliasesFor([stringParam({ flag })]);
    assert.deepEqual(Object.keys(table), [], `${flag} must never enter the alias table`);
  }
});

// Q-62's forward reservation, stated as the rule it applies: *a flag is
// reserved whether or not the command being run accepts it*. `--dry-run`
// is `update`'s read-only mode, which is F3's — so no command F1 owns
// accepts it, and it is reserved anyway. A pack that claimed it first
// would silently shadow that mode when F3 ships.
test('--dry-run is reserved although no F1-owned command accepts it', () => {
  assert.ok((RESERVED_FLAGS as readonly string[]).includes('dry-run'));
  const acceptors = commandsAccepting('dry-run');
  assert.ok(acceptors.length > 0, 'it is a real flag, not a placeholder');
  for (const c of acceptors) {
    assert.notEqual(OWNER[c], 'F1', `${c} is not F1's, which is why this is a forward reservation`);
  }
});

// The sibling collision no per-entry check can see: two parameters in one
// pack claiming one alias. `schema.ts` validates each entry alone and
// finds nothing wrong with either.
test('two parameters cannot share an alias, and the table keeps the first', () => {
  const params = [
    stringParam({ id: 'first', flag: 'thing' }),
    stringParam({ id: 'second', flag: 'thing' }),
  ];
  const r = check(base({ parameters: params }));
  assert.deepEqual(codes(r.bag), [], 'each entry is fine on its own');
  assert.deepEqual(codes(checkParameterSet(r.pack!)), ['E-PARAM-FLAG-INVALID'], 'the SET is not');
  assert.deepEqual(aliasesFor(params)['thing'], { id: 'first', arity: 'value' });
});

/**
 * *"A parameter named in a `when` must be declared `required` or carry a
 * `default`, so no branch is ever evaluated against `undefined`."*
 *
 * The failure this prevents is the quiet one: a `when` on an unanswerable
 * parameter does not error, it simply never matches — so the step vanishes
 * and the user meets it as a missing file rather than as a diagnostic.
 */
test('a when parameter must be answerable, or the branch vanishes silently', () => {
  const when = new Map([['constraintFloor', new Set(['high-floor'])]]);

  const loose = check(
    base({ parameters: [{ id: 'constraintFloor', prompt: 'Floor?', type: 'enum', values: ['high-floor', 'near-zero-floor'] }] }),
  );
  assert.deepEqual(codes(checkWhenParameters(loose.pack!, when)), ['E-PARAM-UNDECIDABLE']);
  assert.equal(exitClassFor('E-PARAM-UNDECIDABLE'), EXIT.integrityFault, 'an authoring defect');

  for (const fix of [{ required: true }, { default: 'high-floor' }]) {
    const fixed = check(
      base({
        parameters: [
          { id: 'constraintFloor', prompt: 'Floor?', type: 'enum', values: ['high-floor', 'near-zero-floor'], ...fix },
        ],
      }),
    );
    assert.deepEqual(codes(checkWhenParameters(fixed.pack!, when)), [], JSON.stringify(fix));
  }
});

/**
 * The combination bound.
 *
 * `validate` renders the pack once per combination of parameters that
 * appear in a `when`, and *"every combination must pass every other
 * validation rule"*. Past 32 that stops being a claim anyone can check, so
 * the bound refuses rather than rendering.
 */
test('above 32 combinations validate refuses rather than rendering', () => {
  const params: Record<string, unknown>[] = [];
  const when = new Map<string, ReadonlySet<string>>();
  for (let i = 0; i < 6; i++) {
    params.push({ id: `axis${i}`, prompt: 'x', type: 'boolean', required: true });
    when.set(`axis${i}`, new Set());
  }
  const r = check(base({ parameters: params }));
  const over = combinations(r.pack!, when);
  assert.deepEqual(codes(over.bag), ['E-PARAM-COMBINATORICS'], '2^6 = 64');
  assert.deepEqual(over.combos, [], 'and nothing is rendered');
  assert.match(over.bag.items[0]!.message, /the limit is 32/);

  when.delete('axis5');
  const under = combinations(r.pack!, when);
  assert.deepEqual(codes(under.bag), []);
  assert.equal(under.combos.length, MAX_COMBINATIONS, '2^5 = 32 is inside the bound');
});

/**
 * *"All answers are recorded verbatim in the manifest, including defaults
 * accepted without being typed, and including answers to parameters that
 * turned out to select nothing."*
 *
 * Both halves matter for the same reason: an unrecorded answer makes the
 * applied tree non-recomputable, which is the property G-F1-5 rests on.
 */
test('a default nobody typed, and an answer that selected nothing, are both recorded', () => {
  const r = check(
    base({
      parameters: [
        stringParam({ id: 'typed', flag: 'typed' }),
        stringParam({ id: 'defaulted', default: 'fallback' }),
        stringParam({ id: 'selectsNothing', default: 'idle' }),
      ],
    }),
  );
  const resolved = resolveAnswers(r.pack!.parameters ?? [], new Map([['typed', 'hello']]));
  assert.deepEqual(codes(resolved.bag), []);
  assert.deepEqual(
    [...resolved.answers.entries()].sort(),
    [
      ['defaulted', 'fallback'],
      ['selectsNothing', 'idle'],
      ['typed', 'hello'],
    ],
    'every declared parameter, whether typed, defaulted, or unused by any when',
  );
});

/**
 * US-8's closing criterion, checked against the product:
 *
 * *"The `coding` and `writing` packs declare only substitution parameters;
 * neither declares a `when`. The `planning` pack declares `constraintFloor`
 * as an `enum` of `high-floor | near-zero-floor` with
 * `"flag": "calibration"` … it is the only case in any v1.0 pack of pack
 * content varying by an init answer."*
 *
 * Read from `pack.json` and `recipe.json` together, because the claim is
 * about both — and then run through the rules, so `planning`'s one branch
 * is shown to be decidable and inside the bound rather than merely
 * present.
 */
test('planning is the only pack whose content varies by an answer', async () => {
  const whensOf = (recipe: Record<string, JsonValue>): Map<string, Set<string>> => {
    const out = new Map<string, Set<string>>();
    const steps: JsonValue[] = [...((recipe['steps'] as JsonValue[] | undefined) ?? [])];
    const scaffolds = (recipe['scaffolds'] ?? {}) as Record<string, JsonValue[]>;
    for (const list of Object.values(scaffolds)) steps.push(...list);
    for (const step of steps) {
      const when = (step as Record<string, JsonValue>)['when'];
      if (when === undefined || when === null || typeof when !== 'object' || Array.isArray(when)) continue;
      for (const [k, v] of Object.entries(when)) {
        const set = out.get(k) ?? new Set<string>();
        set.add(String(v));
        out.set(k, set);
      }
    }
    return out;
  };

  for (const name of ['coding', 'writing'] as const) {
    assert.deepEqual([...whensOf(await recipeOf(name)).keys()], [], `${name} declares no when`);
  }

  const planning = await declarationOf('planning');
  const when = whensOf(await recipeOf('planning'));
  assert.deepEqual([...when.keys()], ['constraintFloor']);

  const decl = (planning.parameters ?? []).find((p) => p.id === 'constraintFloor');
  assert.ok(decl, 'planning declares it');
  assert.equal(decl.type, 'enum');
  assert.deepEqual([...(decl.values ?? [])], ['high-floor', 'near-zero-floor']);
  assert.equal(decl.flag, 'calibration');

  // And the branch is decidable and inside the bound — the two rules that
  // make "content varies by answer" safe rather than merely possible.
  assert.deepEqual(codes(checkWhenParameters(planning, when)), []);
  const combos = combinations(planning, when);
  assert.deepEqual(codes(combos.bag), []);
  assert.equal(combos.combos.length, 2, 'one axis, two declared values');
});

/* ══ US-9 — scaffolds ════════════════════════════════════════════════ */

const sc = (id: string, category?: string): ScaffoldDecl =>
  ({ id, description: id, ...(category === undefined ? {} : { category }) }) as ScaffoldDecl;

const scaffoldPack = (scaffolds: readonly ScaffoldDecl[]): PackJson =>
  ({ name: 'demo', scaffolds }) as unknown as PackJson;

/**
 * Opt-in, and refusal by id — on the pack that actually ships a scaffold.
 *
 * The story is a project owner's: *"I get a backend layout only if I have
 * a backend."* So the default has to be nothing, and a typo has to be told
 * what there was.
 */
test('scaffolds are opt-in, and an unknown id lists what the pack has', async () => {
  const writing = await declarationOf('writing');

  const none = selectScaffolds(writing, []);
  assert.deepEqual(selectedIds(none.selected), [], 'no flag, no scaffold');
  assert.deepEqual(codes(none.bag), []);

  const wrong = selectScaffolds(writing, ['backend-azure']);
  assert.deepEqual(codes(wrong.bag), ['E-SCAFFOLD-UNKNOWN']);
  assert.equal(exitClassFor('E-SCAFFOLD-UNKNOWN'), EXIT.userFault, 'a typo, not a pack defect');
  assert.match(wrong.bag.items[0]!.message, /Available: writing-workstream/, 'verbatim');

  const right = selectScaffolds(writing, ['writing-workstream']);
  assert.deepEqual(codes(right.bag), []);
  assert.deepEqual(selectedIds(right.selected), ['writing-workstream']);
});

/**
 * The choose-one diagnostic, which is the whole argument for `category`.
 *
 * *"Both diagnostics are true; only one is useful."* Under the
 * pre-category model this surfaced as a path collision — accurate, and it
 * told the user they had hit an authoring bug when in fact they had picked
 * two of a choose-one.
 *
 * **Exit 1, the user's.** F1 §Error States and US-9 both say 1;
 * `F1-epics-and-tasks` T-1220(b) says "exit 2", which contradicts them
 * both. The Error States row is the catalogue and wins, and the exit class
 * is read off the code here rather than written down beside it.
 *
 * Fixture-covered by necessity (Q-82): `writing-workstream` is the only
 * scaffold in the product and is alone in its category, so no bundled pack
 * can reach this code.
 */
test('two scaffolds of one category are alternatives, and saying so is exit 1', () => {
  const p = scaffoldPack([sc('backend-azure', 'backend'), sc('backend-aws', 'backend')]);
  const r = selectScaffolds(p, ['backend-aws', 'backend-azure']);

  assert.deepEqual(codes(r.bag), ['E-SCAFFOLD-EXCLUSIVE']);
  assert.equal(exitClassFor('E-SCAFFOLD-EXCLUSIVE'), EXIT.userFault);
  assert.equal(r.bag.exitCode(), EXIT.userFault, 'remedy: pick one');
  const m = r.bag.items[0]!.message;
  assert.match(m, /alternatives, not additions/);
  assert.match(m, /"backend"/, 'names the category, which is what makes it actionable');
  assert.match(m, /backend-azure, backend-aws/, 'and both ids, in declared order');
});

/**
 * Composition order is a **correctness** property, not a presentational
 * one, and this is the assertion T-1220 warns is the one most likely to be
 * skipped: it is an ordinary success path that no shipping pack exercises.
 *
 * Two users typing the same flags in opposite orders must get
 * byte-identical projects. Scaffold steps write files, so an order that
 * followed the command line would make the tree depend on an argument
 * order nobody thinks of as meaningful.
 */
test('composition follows pack.json order, never the order typed', () => {
  const p = scaffoldPack([sc('alpha', 'a'), sc('beta', 'b'), sc('gamma', 'c')]);

  const typedOneWay = selectScaffolds(p, ['gamma', 'alpha', 'beta']);
  const typedTheOther = selectScaffolds(p, ['beta', 'gamma', 'alpha']);
  assert.deepEqual(codes(typedOneWay.bag), []);
  assert.deepEqual(selectedIds(typedOneWay.selected), ['alpha', 'beta', 'gamma']);
  assert.deepEqual(
    selectedIds(typedOneWay.selected),
    selectedIds(typedTheOther.selected),
    'two users, two orders, one tree',
  );

  // "The manifest records the selected scaffold ids in declared order" —
  // the same list, which is what makes the apply recomputable.
  assert.deepEqual(selectedIds(typedTheOther.selected), ['alpha', 'beta', 'gamma']);

  // A repeated id is not a fault: asking twice is the same request.
  assert.deepEqual(selectedIds(selectScaffolds(p, ['beta', 'beta']).selected), ['beta']);
});

// "A scaffold with no `category` is composable with everything." Also
// fixture-covered since Q-82 — the only scaffold that ships declares one.
test('an uncategorised scaffold composes with everything', () => {
  const p = scaffoldPack([sc('plain'), sc('other'), sc('categorised', 'k')]);
  assert.deepEqual(codes(selectScaffolds(p, ['plain', 'other', 'categorised']).bag), []);
});

/**
 * The collision matrix, and the pair it deliberately skips.
 *
 * A collision is computed across every pair a user is **permitted** to
 * select together, so it is the author's fault (exit 2) — reachable
 * without anybody doing anything wrong. A same-category pair is skipped
 * because those two can never both be applied: a shared path between them
 * is not a collision, it is what alternatives do.
 */
test('two selectable scaffolds writing one path is the author’s fault', () => {
  const permitted = scaffoldPack([sc('a', 'backend'), sc('b', 'workstream')]);
  const collide = checkScaffoldCollisions(
    permitted,
    new Map([['a', ['infra/deploy.md']], ['b', ['infra/deploy.md']]]),
  );
  assert.deepEqual(codes(collide), ['E-SCAFFOLD-COLLISION']);
  assert.equal(exitClassFor('E-SCAFFOLD-COLLISION'), EXIT.integrityFault);
  assert.equal(collide.exitCode(), EXIT.integrityFault);

  const alternatives = scaffoldPack([sc('a', 'backend'), sc('b', 'backend')]);
  assert.deepEqual(
    codes(
      checkScaffoldCollisions(
        alternatives,
        new Map([['a', ['infra/deploy.md']], ['b', ['infra/deploy.md']]]),
      ),
    ),
    [],
    'alternatives sharing a path is not a collision',
  );
});

/**
 * *"A scaffold's parameters are only prompted for, and only recorded, when
 * that scaffold is selected."*
 *
 * Both halves, end to end into the answer path — because "only recorded"
 * is a statement about the manifest, and the manifest is what
 * `resolveAnswers` produces. An unselected scaffold's parameter must not
 * appear there even as a default: recording an answer for a scaffold that
 * was never applied would make the manifest describe a tree that does not
 * exist.
 */
test('a scaffold’s parameters reach the manifest only when it is selected', () => {
  const packJson = base({
    parameters: [stringParam({ id: 'projectName', default: 'demo' })],
    scaffolds: [
      {
        id: 'writing-workstream',
        description: 'A workstream',
        category: 'workstream',
        parameters: [stringParam({ id: 'workstream', default: 'alpha' })],
      },
    ],
  });
  const r = check(packJson);
  assert.ok(r.pack, codes(r.bag).join(', '));

  const unselected = selectScaffolds(r.pack, []);
  const withoutIt = parametersFor(r.pack, unselected.selected);
  assert.deepEqual(withoutIt.map((p) => p.id), ['projectName']);
  assert.deepEqual(
    [...resolveAnswers(withoutIt).answers.keys()],
    ['projectName'],
    'not even its default is recorded',
  );

  const selected = selectScaffolds(r.pack, ['writing-workstream']);
  const withIt = parametersFor(r.pack, selected.selected);
  assert.deepEqual(withIt.map((p) => p.id), ['projectName', 'workstream'], 'base first');
  assert.deepEqual([...resolveAnswers(withIt).answers.keys()], ['projectName', 'workstream']);
});

/**
 * *"Steps for a scaffold live in `recipe.json` under `scaffolds.<id>` … A
 * mismatch in either direction … is a pack defect."*
 *
 * The code for that mismatch is `E-RECIPE-STEP-INVALID` and it is raised
 * by the recipe validator, which is E-04's and not yet built. What can be
 * asserted today is the **substance** of the criterion over the shipping
 * packs: the two declarations agree, in both directions, for all three.
 * When T-0405 lands this should gain the negative case.
 */
test('every declared scaffold has recipe steps, and every recipe scaffold is declared', async () => {
  for (const name of BUNDLED) {
    const declared = (await declarationOf(name)).scaffolds ?? [];
    const recipe = await recipeOf(name);
    const inRecipe = Object.keys((recipe['scaffolds'] ?? {}) as Record<string, unknown>);

    assert.deepEqual(
      declared.map((s) => s.id).sort(),
      inRecipe.sort(),
      `${name}: pack.json and recipe.json must declare the same scaffold ids`,
    );
  }
});

/**
 * Q-82's honesty, asserted rather than assumed.
 *
 * Three of the rules above — exclusivity, the no-category branch and the
 * collision matrix — have **no bundled subject**, so every test of them is
 * fixture-covered. That is only acceptable while it is true, and this is
 * where it stops being true silently.
 */
test('the product ships one scaffold, so those rules are fixture-covered on purpose', async () => {
  const all: string[] = [];
  for (const name of BUNDLED) {
    for (const s of (await declarationOf(name)).scaffolds ?? []) {
      all.push(`${name}:${s.id}:${s.category ?? '(none)'}`);
    }
  }
  assert.deepEqual(all, ['writing:writing-workstream:workstream']);
});
