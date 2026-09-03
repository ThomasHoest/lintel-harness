/**
 * E-13 — the three bundled pack declarations conform to the format.
 * T-1301, T-1302, T-1303.
 *
 * ── What this file asserts against ────────────────────────────────────
 *
 * **The real bundled packs, never a fixture.** F5's whole subject is the
 * three declarations that ship; a fixture asserting the same rules would
 * pass forever while `packs/` drifted underneath it, which is the exact
 * failure mode E-13 exists to close. Fixture coverage of the *rules* is
 * F1's, and lives beside the modules in `src/pack/*.test.ts`.
 *
 * ── Why this is not `runCli(['harness', 'validate', name])` ───────────
 *
 * T-1301 words itself as *"`lintel harness validate <pack>` exits 0 with
 * no `defect`-class warning"*. **That command does not exist yet** — F1
 * owns `validate` (`src/cli/surface.ts`) and every command in this build
 * still dispatches to the stub note in `src/cli/main.ts`, exiting 1. So
 * the assertion is made over the modules `validate` will compose — the
 * loader, the schema, the anatomy checker, the parameter-set checker and
 * the scaffold checker — and the *properties* are the ones the command
 * must have: no error, no `defect`-class warning, and therefore exit 0
 * **including under `--strict`**.
 *
 * When `validate` lands, this file should gain the process-level form as
 * a *second* assertion rather than a replacement: the exit class is a
 * contract only the acceptance harness can observe (`tests/harness/cli.ts`),
 * and the per-rule attribution below is what tells an author *which*
 * declaration is wrong.
 *
 * ── Assert properties, not representations ───────────────────────────
 *
 * Two checks here read `pack.json` as **raw parsed JSON** rather than as
 * a `PackJson`, and it is deliberate. `PackJson` is the shape a *valid*
 * pack has, so a typed read cannot see an absent optional key or a
 * wrongly-typed value — it can only see what survived validation. T-1302
 * exists precisely because an absent `provenance` was invisible, and
 * T-1301's default-status rule is a claim about which keys are *written
 * down*. Both are questions about the file, not about the parse.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { bundledPackNames, checkCliFloor, loadPack } from '../../dist/pack/load-pack.js';
import { validatePackJson } from '../../dist/pack/schema.js';
import { checkAnatomy } from '../../dist/pack/anatomy.js';
import {
  MAX_COMBINATIONS,
  aliasesFor,
  checkParameterSet,
  checkWhenParameters,
  combinations,
} from '../../dist/pack/parameters.js';
import { selectScaffolds } from '../../dist/pack/scaffolds.js';
import { walk } from '../../dist/fs/walk.js';
import { packDir } from '../../dist/paths.js';
import { parseSemver } from '../../dist/semver/compare.js';
import { ANATOMY_PART_IDS } from '../../dist/pack/types.js';
import { exitCodeFor, type Diagnostic } from '../../dist/diag/diagnostic.js';
import type { PackJson, ParameterDecl } from '../../dist/pack/types.js';
import type { JsonValue } from '../../dist/json/parse-strict.js';

/** The CLI version every check runs at. All three packs declare a floor
 *  of `1.0.0`, which is asserted rather than assumed below. */
const CLI = '1.0.0';

/** F1 US-1: `provenance` is a string, or an object of strings, **each at
 *  most 200 characters with no newline**. The number is the contract, so
 *  it is named once here and never re-typed into an assertion. */
const PROVENANCE_MAX = 200;

type Raw = Readonly<Record<string, unknown>>;

interface Bundled {
  readonly name: string;
  readonly pack: PackJson;
  /** `pack.json` as parsed JSON — see the header on why this is separate. */
  readonly raw: Raw;
  /** `recipe.json` as parsed JSON. E-04's typed reader does not exist
   *  yet, and T-1303 asks for the `when` count over the recipe rather
   *  than over prose, so the file is read directly. */
  readonly recipe: Raw;
  /** Pack-relative POSIX paths of every payload file. Anatomy globs are
   *  **payload**-relative (C-35), never applied-relative. */
  readonly payload: readonly string[];
}

const codes = (b: { readonly items: readonly Diagnostic[] }): readonly string[] =>
  b.items.map((d) => d.code);

async function readJson(name: string, file: string): Promise<Raw> {
  const text = await readFile(new URL(file, packDir(name)), 'utf8');
  return JSON.parse(text) as Raw;
}

/**
 * Load all three, the way `validate --all` would.
 *
 * The names come from `bundledPackNames()`, which reads the directory —
 * a hard-coded list here would be a second place to add a pack, and the
 * counts asserted below would then silently describe a subset.
 */
async function bundled(): Promise<readonly Bundled[]> {
  const out: Bundled[] = [];
  for (const name of await bundledPackNames()) {
    const { loaded, bag } = await loadPack(name, CLI);
    assert.deepEqual(codes(bag), [], `${name} must load with no diagnostic`);
    assert.ok(loaded, `${name} must load`);
    const w = await walk(fileURLToPath(loaded.dir), { skip: [] });
    assert.equal(w.truncated, false, `${name}: the payload walk must be complete`);
    out.push({
      name,
      pack: loaded.pack,
      raw: await readJson(name, 'pack.json'),
      recipe: await readJson(name, loaded.recipePath),
      payload: w.entries.filter((e) => e.kind === 'file').map((e) => e.path),
    });
  }
  return out;
}

/**
 * Every diagnostic `validate` would raise over one pack, in the order the
 * checks run. Composed here because the command that will compose it is
 * still a stub.
 *
 * The scaffold pass selects **every declared scaffold at once**, which is
 * the only selection that can reach `E-SCAFFOLD-EXCLUSIVE`. Selecting
 * none — the default an apply gets — would make the line vacuous.
 *
 * **`E-SCAFFOLD-COLLISION` is not reachable from here**, and saying so is
 * better than calling `checkScaffoldCollisions` with an empty write-set
 * map and banking a pass that means nothing: a collision is a fact about
 * two scaffolds' *applied paths*, which only the recipe holds. That check
 * belongs to E-14, over the trees T-1401–T-1405 compute.
 */
function validateFindings(b: Bundled): readonly Diagnostic[] {
  const everyScaffold = (b.pack.scaffolds ?? []).map((s) => s.id);
  return [
    ...validatePackJson(b.raw as JsonValue, b.name, `packs/${b.name}/pack.json`).bag.items,
    ...checkCliFloor(b.pack, CLI).items,
    ...checkAnatomy(b.pack, b.payload).bag.items,
    ...checkParameterSet(b.pack).items,
    ...selectScaffolds(b.pack, everyScaffold).bag.items,
  ];
}

/* ── T-1301 — each `pack.json` conforms ──────────────────────────────── */

test('the product ships exactly the three packs F5 names', async () => {
  assert.deepEqual(await bundledPackNames(), ['coding', 'planning', 'writing']);
});

/**
 * The T-1301 headline, in the form this build can state it.
 *
 * `--strict` is asserted alongside the plain run and not instead of it,
 * because they fail differently: a plain exit 0 tolerates a `defect`, and
 * a strict exit 0 is the claim F5 §NFR actually makes. A pack whose only
 * findings are `notice`s — `planning` and `writing` both have some, by
 * design — must still exit 0 under `--strict`, and that is the property
 * Q-60 was resolved to obtain.
 */
test('every bundled pack validates clean, and cleanly enough for --strict', async () => {
  for (const b of await bundled()) {
    const found = validateFindings(b);
    const defects = found.filter((d) => d.severity === 'warning' && d.class === 'defect');

    assert.deepEqual(
      found.filter((d) => d.severity === 'error').map((d) => d.code),
      [],
      `${b.name} raises an error`,
    );
    assert.deepEqual(
      defects.map((d) => `${d.code}: ${d.message}`),
      [],
      `${b.name} raises a defect-class warning; --strict would fail it`,
    );
    assert.equal(exitCodeFor(found, false), 0, `${b.name}: plain exit`);
    assert.equal(exitCodeFor(found, true), 0, `${b.name}: --strict exit`);
  }
});

// US-1's identity fields. `name` equalling the directory is checked by
// `validatePackJson`; the semver rule is checked here because **nothing
// in the CLI checks it** — see the note in the report accompanying this
// task. A pack declaring `minCliVersion: "1.0"` would pass every module
// in the build and then compare false-negative against the floor.
test('identity, versions and the CLI floor are what US-1 requires', async () => {
  const floors = (await bundled()).map((b) => b.pack.minCliVersion);
  for (const b of await bundled()) {
    assert.equal(b.pack.formatVersion, 1, `${b.name} formatVersion`);
    assert.equal(b.pack.name, b.name, `${b.name} name equals its directory`);
    assert.ok(parseSemver(b.pack.version), `${b.name} version "${b.pack.version}" is not semver`);
    assert.ok(
      parseSemver(b.pack.minCliVersion),
      `${b.name} minCliVersion "${b.pack.minCliVersion}" is not semver`,
    );
    // Compared to EACH OTHER, which is what this assertion's message
    // claims, rather than to a literal. It said `'1.0.0'` and broke when
    // the release moved the floor to `0.1.0` — reporting "all three packs
    // declare the same floor" at the moment all three did.
    assert.equal(
      b.pack.minCliVersion,
      floors[0],
      `${b.name}: all three packs declare the same floor (${floors.join(', ')})`,
    );
    assert.equal(typeof b.pack.title, 'string');
    assert.notEqual(b.pack.title.length, 0, `${b.name} declares an empty title`);
  }
});

/**
 * Q-50, and it is **declared, never sniffed**.
 *
 * A checker that accepted either basename could not report a missing
 * one — which is what US-16 step 12 does with this value — so the two
 * packs taking `README.md` must take it by *omission*, and `writing` must
 * say `index.md` out loud. Asserted over the raw JSON because the point
 * is the absence of a key, which a defaulted read cannot see.
 */
test('folderReadme is declared only where a pack departs from the default', async () => {
  const byName = new Map((await bundled()).map((b) => [b.name, b]));
  assert.equal('folderReadme' in (byName.get('coding') as Bundled).raw, false, 'coding omits it');
  assert.equal('folderReadme' in (byName.get('planning') as Bundled).raw, false, 'planning omits it');
  assert.equal((byName.get('writing') as Bundled).pack.folderReadme, 'index.md');
});

test('every pack declares 9 of 9 anatomy parts, in order, none missing', async () => {
  for (const b of await bundled()) {
    const { rows } = checkAnatomy(b.pack, b.payload);
    assert.deepEqual(
      rows.map((r) => r.part),
      [...ANATOMY_PART_IDS],
      `${b.name}: nine rows, in the declared order — the order is the report's contract`,
    );
    // `missing` is reachable only for an INVALID pack (US-2). Seeing it
    // here would mean a shipping pack declares a part it does not have.
    assert.deepEqual(
      rows.filter((r) => r.status === 'missing').map((r) => r.part),
      [],
      `${b.name}: a shipping pack may never report a missing part`,
    );
    // Declaring globs that match nothing is E-ANATOMY-EMPTY, exit 2. It
    // cannot happen for `declaredBy: "recipe"`, whose shape IS the
    // recipe's destination set and which therefore names no glob.
    for (const r of rows) {
      if (r.status === 'absent' || r.part === 'folderScaffolding') continue;
      assert.notEqual(r.matched, 0, `${b.name}.${r.part} declares globs matching no payload file`);
    }
  }
});

/**
 * The two honest absences and the one honest provisional — named, with
 * their required prose.
 *
 * The `reason` and `note` are not decoration: `W-ANATOMY-ABSENT` and
 * `W-ANATOMY-PROVISIONAL` **print them verbatim**, so an empty one would
 * produce a warning that names a gap and says nothing about it. That is
 * why F1 makes the missing text an error (`E-ANATOMY-NO-REASON` /
 * `E-ANATOMY-NO-NOTE`) while the state itself is only a notice.
 */
test("writing's parts 8 and 9 are absent with a reason; planning's roles provisional with a note", async () => {
  const byName = new Map((await bundled()).map((b) => [b.name, b]));

  const writing = byName.get('writing') as Bundled;
  const wRows = new Map(checkAnatomy(writing.pack, writing.payload).rows.map((r) => [r.part, r]));
  for (const part of ['skillsAndAutomations', 'autonomyContract'] as const) {
    const row = wRows.get(part);
    assert.equal(row?.status, 'absent', `writing.${part}`);
    assert.equal(typeof row?.reason, 'string', `writing.${part} needs a reason`);
    assert.notEqual(row?.reason?.length, 0, `writing.${part} reason is empty`);
  }

  const planning = byName.get('planning') as Bundled;
  const roles = checkAnatomy(planning.pack, planning.payload).rows.find((r) => r.part === 'roles');
  assert.equal(roles?.status, 'provisional');
  assert.equal(typeof roles?.note, 'string', 'planning.roles needs a note');
  assert.notEqual(roles?.note?.length, 0, 'planning.roles note is empty');
});

/**
 * F5 §NFR *Anatomy completeness*, across all three at once.
 *
 * Stated as a count rather than per pack because that is what makes it a
 * spec change to move: a fourth `absent` part anywhere in the product
 * fails here, wherever it is declared. The per-pack test above says
 * *which* parts; this one says *how many*, and both are needed — the
 * counts would still hold if `writing`'s two absences swapped places
 * with two of `planning`'s present parts.
 */
test('across the three packs, exactly two parts are absent and one provisional', async () => {
  const tally = { absent: 0, provisional: 0, present: 0, missing: 0 };
  for (const b of await bundled()) {
    for (const r of checkAnatomy(b.pack, b.payload).rows) tally[r.status] += 1;
  }
  assert.deepEqual(tally, { absent: 2, provisional: 1, present: 24, missing: 0 });
});

/**
 * The notices each pack emits **by design** (Q-60, F5 v2.6).
 *
 * Pinned as an exact set rather than "no defects", because these are
 * correct output from a correct pack rather than tolerated noise. If
 * `writing` ever gains a part 8 the count here changes, and it should —
 * the pack having closed a declared gap is a fact about the product, not
 * an incidental test update.
 */
test('the notice set is exactly the one each pack declares on purpose', async () => {
  const byName = new Map(
    (await bundled()).map((b) => [b.name, codes(checkAnatomy(b.pack, b.payload).bag)]),
  );
  assert.deepEqual(byName.get('coding'), [], 'coding declares no incomplete part');
  assert.deepEqual(byName.get('writing'), ['W-ANATOMY-ABSENT', 'W-ANATOMY-ABSENT']);
  assert.deepEqual(byName.get('planning'), ['W-ANATOMY-PROVISIONAL']);
});

/**
 * **SKIPPED — this test fails against `packs/planning/pack.json` as it
 * ships, and the failure is T-1304's to fix, in the pack.**
 *
 * T-1301: *"every other part relies on the `present` default rather than
 * restating it — the default is load-bearing and a test that requires it
 * spelled out would make the format noisier for no gain."*
 *
 * `coding` omits `status` on all 9 parts and `writing` on its 7
 * non-absent parts. **`planning` restates `"status": "present"` on 8 of
 * its 9**, leaving `roles` — the one part whose status is not the
 * default — indistinguishable at a glance from its neighbours. That is
 * the cost the rule is about: when every part carries a status, the one
 * that means something stops standing out in a diff.
 *
 * Nothing in the CLI reports this — `status: "present"` is a known key
 * with a permitted value, so `validate` exits 0 and no warning fires. It
 * is a pack-authoring rule that only a test can hold, which is why
 * T-1301 asks for one. **Un-skip after the eight keys are deleted from
 * `packs/planning/pack.json`.**
 */
test(
  'a part at the default status says nothing about it',
  { skip: 'packs/planning/pack.json restates "status": "present" on 8 of 9 parts — T-1304' },
  async () => {
    for (const b of await bundled()) {
      const anatomy = b.raw['anatomy'] as Readonly<Record<string, Raw>>;
      const restated = Object.entries(anatomy)
        .filter(([, decl]) => decl['status'] === 'present')
        .map(([part]) => `${b.name}.${part}`);
      assert.deepEqual(restated, [], 'the present default is relied on, never spelled out');
    }
  },
);

/* ── T-1302 — provenance is a string, or an object of strings ────────── */

/**
 * **Every one of the three packs failed this, and only one failure was
 * visible.** `coding` and `writing` declared no `provenance` at all —
 * silent, because F1 has no code for an absent optional field — while
 * `planning` declared one with an **array** value and a **347-character**
 * note, either of which is `E-UNKNOWN-VALUE`, exit 2, zero bytes.
 *
 * **The pack that had tried was the only one that would have failed the
 * apply.** That asymmetry is the whole reason the absent case needs a
 * test rather than a code: an absent optional field is silent, a
 * malformed one is fatal, and the silence is what let two of three
 * survive a requirement F5 §NFR *Provenance* states outright.
 */
test('every pack declares a provenance at all', async () => {
  for (const b of await bundled()) {
    assert.ok('provenance' in b.raw, `${b.name} declares no provenance — F5 §NFR requires one`);
    assert.notEqual(b.raw['provenance'], null, `${b.name} provenance is null`);
  }
});

test('every provenance is a string, or an object whose every value is a string', async () => {
  for (const b of await bundled()) {
    const p = b.raw['provenance'];
    const entries: readonly [string, unknown][] =
      typeof p === 'string' ? [['provenance', p]] : Object.entries(p as Raw);

    // An ARRAY is an object to `typeof`, and `planning` shipped one. The
    // check is therefore on the value's own shape, never on `typeof`.
    assert.equal(Array.isArray(p), false, `${b.name} provenance is an array`);
    assert.notEqual(entries.length, 0, `${b.name} provenance is empty`);

    for (const [key, value] of entries) {
      assert.equal(typeof value, 'string', `${b.name} provenance.${key} is a ${typeof value}`);
      const s = value as string;
      assert.ok(
        s.length <= PROVENANCE_MAX,
        `${b.name} provenance.${key} is ${s.length} characters; the limit is ${PROVENANCE_MAX}`,
      );
      // Newlines are banned for the same reason `escape.ts` escapes them
      // in a value: a newline in declared data reaches a rendered message
      // and can forge a line the CLI did not write.
      assert.equal(
        /[\n\r\u2028\u2029]/.test(s),
        false,
        `${b.name} provenance.${key} contains a line break`,
      );
    }
  }
});

/**
 * The rule holds from the other side too: `provenance` must be a
 * **defined** key, not an unknown one.
 *
 * Until F1 v2.6 defined it (Q-60), every bundled pack tripped the
 * unknown-top-level-key warning **for doing exactly what F5 demands** —
 * a `defect`-class warning raised by a correct pack, which `--strict`
 * would then promote to a failure. Asserting the absence of the warning
 * is what keeps that from being reintroduced by a rename.
 */
test('declaring provenance draws no unknown-key warning', async () => {
  for (const b of await bundled()) {
    const found = validatePackJson(b.raw as JsonValue, b.name, `packs/${b.name}/pack.json`).bag;
    assert.deepEqual(
      found.items.filter((d) => d.code === 'W-UNKNOWN-KEY').map((d) => d.message),
      [],
      `${b.name}`,
    );
  }
});

/**
 * The two shapes `planning` actually shipped, replayed against the real
 * declaration so the historical failure cannot return unnoticed.
 *
 * Both are `E-UNKNOWN-VALUE` — exit 2, zero bytes — and both are
 * reachable only by editing a pack, which is why the positive tests above
 * are over the shipped files and these two are over a spliced copy.
 */
test('the two shapes planning shipped are still refused', async () => {
  const raw = await readJson('planning', 'pack.json');
  const splice = (provenance: unknown): readonly string[] =>
    codes(
      validatePackJson(
        { ...raw, provenance } as unknown as JsonValue,
        'planning',
        'packs/planning/pack.json',
      ).bag,
    );

  assert.ok(
    splice({ knowledgeBase: ['a', 'b'] }).includes('E-UNKNOWN-VALUE'),
    'an array value must be refused',
  );
  assert.ok(
    splice({ note: 'x'.repeat(PROVENANCE_MAX + 1) }).includes('E-UNKNOWN-VALUE'),
    `a note over ${PROVENANCE_MAX} characters must be refused`,
  );
  assert.deepEqual(splice(raw['provenance']), [], 'the shipped value is accepted');
});

/* ── T-1303 — the parameter declarations ─────────────────────────────── */

/** Every parameter a pack declares, base and scaffold, in declared order. */
function allParameters(pack: PackJson): readonly ParameterDecl[] {
  return [...(pack.parameters ?? []), ...(pack.scaffolds ?? []).flatMap((s) => s.parameters ?? [])];
}

/**
 * **The spec claimed through v2.9 that `planning` was the only pack with
 * a parameter**, which was false about the pack with the fewest — it has
 * one, and `writing` has three. This test is the reason that claim cannot
 * come back, and it is asserted over `pack.json` rather than over the
 * sentence that was wrong.
 */
test('the parameter counts are coding 2, writing 3, planning 1', async () => {
  const counts: Record<string, number> = {};
  for (const b of await bundled()) counts[b.name] = (b.pack.parameters ?? []).length;
  assert.deepEqual(counts, { coding: 2, planning: 1, writing: 3 });
});

// Scaffold parameters are counted separately and are currently none, so
// the totals above are unambiguous. `writing-workstream` is the only
// scaffold in the product (Q-82) and declares no parameter of its own —
// if it ever does, the counts above stop describing an apply and this
// assertion is what says so.
test('no scaffold declares a parameter, so the base counts are the totals', async () => {
  for (const b of await bundled()) {
    assert.deepEqual(
      (b.pack.scaffolds ?? []).flatMap((s) => (s.parameters ?? []).map((p) => `${s.id}.${p.id}`)),
      [],
      b.name,
    );
  }
});

/**
 * C-7. **Every `type: "string"` parameter carries an anchored `pattern`.**
 *
 * Anchoring is not a style rule: an unanchored `pattern` matches a
 * *substring*, so `[a-z]+` accepts `"; rm -rf /"` for containing a lower
 * case letter. The declaration would look like a constraint and be none.
 * `schema.ts` raises `E-PARAM-NO-PATTERN` / `E-PARAM-PATTERN-INVALID` for
 * the same rules; this asserts the shipped packs satisfy them, which is a
 * different claim from the checker being correct.
 */
test('every string parameter in the product carries an anchored pattern', async () => {
  let strings = 0;
  for (const b of await bundled()) {
    for (const p of allParameters(b.pack)) {
      if (p.type !== 'string') {
        assert.equal(p.pattern, undefined, `${b.name}.${p.id}: pattern is meaningless on ${p.type}`);
        continue;
      }
      strings += 1;
      const pattern = p.pattern;
      assert.equal(typeof pattern, 'string', `${b.name}.${p.id} declares no pattern`);
      const src = pattern as string;
      assert.ok(src.startsWith('^') && src.endsWith('$'), `${b.name}.${p.id} is unanchored: ${src}`);
      assert.ok(src.length <= 200, `${b.name}.${p.id} pattern is ${src.length} characters`);
      // Decided from the SOURCE TEXT, never from compilation — the same
      // order schema.ts keeps, because inspecting a compiled pattern has
      // already run author input through the regex engine.
      assert.equal(/\\[1-9]|\\k</.test(src.replace(/\\\\/g, '')), false, `${b.name}.${p.id}`);
      assert.equal(/\(\?=|\(\?!|\(\?<=|\(\?<!/.test(src), false, `${b.name}.${p.id}`);
      // The `u` flag is the one the CLI applies; a pattern using `\p{L}`
      // does not compile without it, and two of these do.
      new RegExp(src, 'u');
    }
  }
  assert.equal(strings, 5, 'coding 2 + writing 3; planning’s only parameter is an enum');
});

test('the pack-wide parameter rules hold for every pack', async () => {
  for (const b of await bundled()) {
    // Duplicate ids, duplicate aliases, and the C-15 credential ban —
    // the three rules no per-entry check can see.
    assert.deepEqual(codes(checkParameterSet(b.pack)), [], b.name);
  }
});

/**
 * S5: the CLI holds **no pack-specific knowledge**.
 *
 * `--calibration high-floor` is exactly `--set constraintFloor=high-floor`
 * because the alias is built from `pack.json` data at parse time. Nothing
 * in `flags.ts` knows the word `calibration`, and this is the assertion
 * that says so from the pack side — one alias, in one pack, declared.
 */
test('calibration is the only pack-declared CLI alias in the product', async () => {
  const declared: string[] = [];
  for (const b of await bundled()) {
    for (const [flag, alias] of Object.entries(aliasesFor(allParameters(b.pack)))) {
      declared.push(`${b.name}: --${flag} => --set ${alias.id}=<value>`);
    }
  }
  assert.deepEqual(declared, ['planning: --calibration => --set constraintFloor=<value>']);
});

/** Every `when` in a recipe, base steps and scaffold steps alike, as
 *  `<pack>: <paramId>=<value>`. Read from `recipe.json` because T-1303
 *  asks for it there — prose about which pack branches has been wrong
 *  before, and the recipe is the fact. */
function whenClauses(b: Bundled): readonly string[] {
  const scaffolds = (b.recipe['scaffolds'] ?? {}) as Readonly<Record<string, readonly Raw[]>>;
  const steps: readonly Raw[] = [
    ...((b.recipe['steps'] ?? []) as readonly Raw[]),
    ...Object.values(scaffolds).flat(),
  ];
  return steps.flatMap((s) => {
    const when = s['when'];
    if (when === undefined) return [];
    return Object.entries(when as Raw).map(([k, v]) => `${b.name}: ${k}=${String(v)}`);
  });
}

/**
 * **`planning` holds the only `when` in the product — exactly two, both
 * over `constraintFloor`.**
 *
 * Its `calibrations/<name>/` layout is a pack-authoring convention over
 * `when` steps, not a format feature, and it is the only case in any v1.0
 * pack of content varying by an init answer. A third `when` appearing
 * anywhere is a scope change, not a detail: `validate` renders the pack
 * once per combination, and every new branching parameter multiplies that
 * count toward the bound of 32.
 */
test('planning holds the only two when clauses in the product', async () => {
  const all = (await bundled()).flatMap(whenClauses);
  assert.deepEqual(all, [
    'planning: constraintFloor=high-floor',
    'planning: constraintFloor=near-zero-floor',
  ]);
});

/**
 * A parameter named in a `when` must be `required` or carry a `default`,
 * so **no branch is ever evaluated against `undefined`**.
 *
 * The failure it prevents is quiet rather than loud: a `when` on an
 * unanswerable parameter does not error, it simply never matches, and the
 * user meets it as a file that is not there rather than as a diagnostic.
 */
test('the branching parameter is decidable, and its combinations are bounded', async () => {
  const byName = new Map((await bundled()).map((b) => [b.name, b]));
  const planning = byName.get('planning') as Bundled;
  const when = new Map([['constraintFloor', new Set(['high-floor', 'near-zero-floor'])]]);

  assert.deepEqual(codes(checkWhenParameters(planning.pack, when)), []);
  const decl = (planning.pack.parameters ?? []).find((p) => p.id === 'constraintFloor');
  assert.equal(decl?.required, true, 'required, so a branch is never evaluated against undefined');
  assert.equal(decl?.type, 'enum');
  assert.deepEqual(decl?.values, ['high-floor', 'near-zero-floor']);

  const { combos, bag } = combinations(planning.pack, when);
  assert.deepEqual(codes(bag), []);
  assert.equal(combos.length, 2, 'an enum of two, and nothing else branches');
  assert.ok(combos.length <= MAX_COMBINATIONS);

  // The other two packs declare only substitution parameters, so a
  // render of either is a single combination.
  for (const name of ['coding', 'writing'] as const) {
    const b = byName.get(name) as Bundled;
    assert.equal(combinations(b.pack, new Map()).combos.length, 1, name);
  }
});

/**
 * US-9: a `pack.json` scaffold with no `recipe.json` entry, or the
 * reverse, is a pack defect — the declaration and the steps are two
 * halves of one statement and neither is the whole of it.
 */
test('the declared scaffolds and the recipe scaffold keys are the same set', async () => {
  for (const b of await bundled()) {
    const declared = (b.pack.scaffolds ?? []).map((s) => s.id).sort();
    const inRecipe = Object.keys((b.recipe['scaffolds'] ?? {}) as Raw).sort();
    assert.deepEqual(inRecipe, declared, `${b.name}: pack.json and recipe.json disagree`);
  }
});

// `writing` declares `"category": "workstream"` and is ALONE in it, which
// is surprising enough to state rather than to assert around: through F1
// v3.0 the spec said this scaffold declared no category, which was simply
// false about the shipping pack. With one scaffold in one category, the
// same-category (E-SCAFFOLD-EXCLUSIVE) and cross-category-collision
// branches have no bundled subject at all and are fixture-covered in
// `src/pack/scaffolds.test.ts` — the two backend kits that were the
// worked example left for `addons/` under Q-82.
test('writing-workstream is the only scaffold in the product, and declares a category', async () => {
  const declared = (await bundled()).flatMap((b) =>
    (b.pack.scaffolds ?? []).map((s) => `${b.name}/${s.id}/${String(s.category)}`),
  );
  assert.deepEqual(declared, ['writing/writing-workstream/workstream']);
});
