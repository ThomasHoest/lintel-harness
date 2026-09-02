/**
 * Fail-closed parse, closed enumerations, boolean typing. T-1206–T-1208.
 *
 * These are the rows where the attack is not a **destination** but a
 * **reading**: a document whose meaning depends on which duplicate wins, a
 * value outside a closed set, a string where a boolean belongs.
 *
 * **Two of them are here because the string `"false"` is truthy.** Under
 * v2.3, `"executable": "false"` read as `true` and `"notASecret": "no"`
 * disabled the credential ban outright — both by writing the word for the
 * safe answer.
 */
import { test } from 'node:test';
import { assertFixture, basePack, baseRecipe, type Fixture } from '../run-fixtures.js';

const FILES = { 'src/a.md': 'a\n' };

const FIXTURES: Fixture[] = [
  /* ── T-1206: .harness/ and the written set ─────────────────────────── */

  {
    name: 'substitute whose in glob is [".claude/settings.json"]',
    because: 'nothing writes it, so it is not in the written-set — C-27',
    packJson: basePack(),
    recipeJson: baseRecipe([{ op: 'substitute', in: ['.claude/settings.json'] }]),
    files: FILES,
    expect: ['E-RECIPE-STEP-INVALID'],
    exit: 2,
  },
  {
    /**
     * **`in` resolves only against the plan's ordered written-set.** The
     * payload is not in that set at all, which is why
     * `.harness/pack/**` cannot be reached — and the glob dialect has no
     * `**` either, so this matches nothing twice over.
     */
    name: 'rewrite-path whose in glob is [".harness/pack/**"]',
    because: 'C-27 — the payload is not in the written-set, by construction',
    packJson: basePack(),
    recipeJson: baseRecipe([
      { op: 'rewrite-path', in: ['.harness/pack/**'], find: 'x', replace: 'y' },
    ]),
    files: FILES,
    expect: ['E-RECIPE-STEP-INVALID'],
    exit: 2,
  },
  {
    name: 'a step whose to is .harness/README.md',
    because: '.harness/ is the only LOCATION entry — nothing a step writes may land there',
    packJson: basePack(),
    recipeJson: baseRecipe([{ op: 'copy', from: 'src/a.md', to: '.harness/README.md' }]),
    files: FILES,
    expect: ['E-MAP-RESERVED-DEST'],
    exit: 2,
  },

  /* ── T-1207: fail-closed parse and closed enumerations ─────────────── */

  {
    /**
     * **Before any other check on the file.** A document whose meaning
     * depends on which duplicate wins has no single meaning to validate,
     * so there is nothing to check *first*.
     */
    name: 'pack.json declaring "name" twice',
    because: 'US-1 — the strict reader, before every other check on the file',
    packJson:
      '{\n  "formatVersion": 1,\n  "name": "fixture",\n  "name": "other",\n  "title": "t",\n' +
      '  "version": "1.0.0",\n  "minCliVersion": "1.0.0",\n  "recipe": "recipe.json",\n  "anatomy": {}\n}\n',
    recipeJson: baseRecipe([]),
    files: FILES,
    expect: ['E-JSON-DUPLICATE-KEY'],
    exit: 2,
  },
  {
    name: 'op "copy " with a trailing space',
    because: 'US-31 literal match — a parser that trims accepts a step a reviewer read as invalid',
    packJson: basePack(),
    recipeJson: baseRecipe([{ op: 'copy ', from: 'src/a.md', to: 'b.md' }]),
    files: FILES,
    expect: ['E-RECIPE-PRIMITIVE-UNKNOWN'],
    exit: 2,
  },
  {
    name: 'recipe.json declaring "formatVersion": 999',
    because: 'C-24 — before v2.3 the recipe declared a version NO RULE CHECKED',
    packJson: basePack(),
    recipeJson: baseRecipe([], { formatVersion: 999 }),
    files: FILES,
    expect: ['E-RECIPE-FORMAT-NEWER'],
    exit: 2,
  },
  {
    /**
     * **An inspectability control, not a DoS control.** There is no remote
     * attacker and `E-PAYLOAD-TOO-LARGE` bounds the bytes; what the bound
     * protects is the argument that made a script primitive refusable —
     * that `pack info` renders the *complete* list of what an apply does.
     */
    name: 'a recipe declaring 257 steps',
    because: 'C-30 — a list nobody finishes reading is not a control',
    packJson: basePack(),
    recipeJson: baseRecipe(
      Array.from({ length: 257 }, (_, i) => ({ op: 'copy', from: 'src/a.md', to: `out/${i}.md` })),
    ),
    files: FILES,
    expect: ['E-RECIPE-TOO-MANY-STEPS'],
    exit: 2,
  },
  {
    name: 'generate whose template names nothing in the payload',
    because: 'C-38 — through v2.3 generate’s only input had no code for the commonest mistake',
    packJson: basePack(),
    recipeJson: baseRecipe([
      { op: 'generate', template: 'gone.md', to: 'CLAUDE.md', anchors: ['a'] },
    ]),
    files: FILES,
    expect: ['E-RECIPE-SOURCE-MISSING'],
    exit: 2,
  },

  /* ── T-1208: boolean typing (C-34) ─────────────────────────────────── */

  {
    /**
     * **`"false"` is truthy.** Under v2.3 this read as `true`, so a pack
     * writing the word for the *safe* answer got the unsafe behaviour —
     * the worst possible direction for a typo to fail in.
     */
    name: 'a step declaring "executable": "false"',
    because: 'C-34 — a non-empty string is truthy, so this read as true',
    packJson: basePack({ executableRoots: ['out/'] }),
    recipeJson: baseRecipe([
      { op: 'copy', from: 'src/a.md', to: 'out/a.md', executable: 'false' },
    ]),
    files: FILES,
    expect: ['E-UNKNOWN-VALUE'],
    exit: 2,
  },
  {
    name: 'a parameter declaring "notASecret": "no"',
    because: 'C-34 — under v2.3 this DISABLED the credential ban entirely',
    packJson: basePack({
      parameters: [
        {
          id: 'apiKey',
          prompt: 'Key',
          type: 'string',
          pattern: '^.{1,10}$',
          notASecret: 'no',
        },
      ],
    }),
    recipeJson: baseRecipe([]),
    files: FILES,
    expect: ['E-UNKNOWN-VALUE'],
    exit: 2,
  },
];

for (const f of FIXTURES) {
  test(`fixture: ${f.name}`, async () => {
    await assertFixture(f);
  });
}
