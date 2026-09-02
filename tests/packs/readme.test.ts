/**
 * E-16 — each pack explains itself in one page, and no pack tells a reader
 * to apply it by hand. T-1601, T-1603.
 *
 * ── What this file asserts against ────────────────────────────────────
 *
 * **The three shipping READMEs**, for the same reason `declaration.test.ts`
 * refuses a fixture: US-28 is a claim about the three pages a newcomer
 * actually inherits. A fixture README meeting these rules would pass
 * forever while `packs/*​/README.md` drifted underneath it.
 *
 * ── Why every rule here is derived, and from what ─────────────────────
 *
 * A README is prose, so the temptation is to assert prose: *the page
 * contains the word "absent"*. That kind of check passes on a page that
 * says the wrong thing in the right words, and — worse — keeps passing
 * after `pack.json` changes underneath it. So each rule below is anchored
 * to a machine-readable fact the README is *describing*:
 *
 *   - the anatomy table is checked **against `pack.json`'s `anatomy`**, so
 *     a pack that closes a gap and forgets its page fails here;
 *   - the version and CLI floor are checked **against `pack.json`**;
 *   - T-1603's sweep is scoped **by the recipe**, not by a hand-written
 *     exemption list, so a pack that starts copying its own README out
 *     brings that file into scope automatically.
 *
 * The two rules with no such anchor — the line budget and the
 * produced-tree budget — are numbers F5 §NFR *Legibility* states outright,
 * and they are typed once each, below.
 *
 * ── T-1602 is not here ────────────────────────────────────────────────
 *
 * US-35's link check needs F1's `W-LINK-DANGLING` pass (`T-0908`), which
 * does not exist in this build. Writing a private link resolver here would
 * be a second implementation of the rule F1 owns, and the two would
 * disagree the first time either moved. It waits.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { bundledPackNames, loadPack } from '../../dist/pack/load-pack.js';
import { validateRecipe } from '../../dist/recipe/schema.js';
import { matchesAny } from '../../dist/recipe/glob.js';
import { OPS } from '../../dist/recipe/ops/index.js';
import { isPlacing } from '../../dist/recipe/types.js';
import { walk } from '../../dist/fs/walk.js';
import { packDir } from '../../dist/paths.js';
import { ANATOMY_PART_IDS } from '../../dist/pack/types.js';
import type { AnatomyPartId, AnatomyStatus, PackJson } from '../../dist/pack/types.js';
import type { Recipe, RecipeStep } from '../../dist/recipe/types.js';
import type { JsonValue } from '../../dist/json/parse-strict.js';

/** The CLI version the packs are loaded at; all three declare this floor. */
const CLI = '1.0.0';

/** F5 §NFR *Legibility*, raised from 120 by v2.5. **A legibility budget,
 *  not a content budget** — a pack that genuinely does more earns more
 *  lines, and the number moves by editing the spec, never by deleting
 *  substance from a page to fit. Typed once. */
const MAX_README_LINES = 160;

/** US-28, raised from ten by v2.5, and the same kind of budget. */
const MAX_TREE_BLOCK_LINES = 20;

interface Bundled {
  readonly name: string;
  readonly pack: PackJson;
  readonly recipe: Recipe;
  /** Pack-relative POSIX paths of every payload file. */
  readonly payload: readonly string[];
  readonly readme: string;
  /** `readme` split for counting: one entry per line, with the trailing
   *  empty produced by a final newline dropped. This is `wc -l`, which is
   *  the count US-28 quotes its three numbers in. */
  readonly lines: readonly string[];
}

async function bundled(): Promise<readonly Bundled[]> {
  const out: Bundled[] = [];
  for (const name of await bundledPackNames()) {
    const { loaded, bag } = await loadPack(name, CLI);
    assert.deepEqual(
      bag.items.map((d) => d.code),
      [],
      `${name} must load with no diagnostic`,
    );
    assert.ok(loaded, `${name} must load`);

    const { recipe, bag: recipeBag } = validateRecipe(
      JSON.parse(loaded.recipeText) as JsonValue,
      name,
    );
    assert.deepEqual(
      recipeBag.items.map((d) => d.code),
      [],
      `${name}: recipe.json must validate`,
    );
    assert.ok(recipe, `${name}: recipe must narrow`);

    const w = await walk(fileURLToPath(loaded.dir), { skip: [] });
    assert.equal(w.truncated, false, `${name}: the payload walk must be complete`);

    const readme = await readFile(new URL('README.md', packDir(name)), 'utf8');
    const lines = readme.split('\n');
    if (lines[lines.length - 1] === '') lines.pop();

    out.push({
      name,
      pack: loaded.pack,
      recipe,
      payload: w.entries.filter((e) => e.kind === 'file').map((e) => e.path),
      readme,
      lines,
    });
  }
  return out;
}

/* ── T-1601 — the five criteria US-28 states ─────────────────────────── */

/**
 * The line budget, and **the one criterion `coding`'s README met before
 * v3.0** — the page was 95 lines, and satisfied this rule by describing
 * the pack's own source tree to a reader who has not got it. That is why
 * the four tests after this one exist: a page can fit the budget and still
 * be about the wrong thing.
 */
test('every pack README fits the legibility budget', async () => {
  const over: string[] = [];
  for (const b of await bundled()) {
    if (b.lines.length > MAX_README_LINES) over.push(`${b.name}: ${b.lines.length} lines`);
  }
  assert.deepEqual(over, [], `the budget is ${MAX_README_LINES} lines`);
});

/**
 * How a README names each part. **Three spellings vary across the three
 * pages** and all three are legitimate: `planning` writes *Coordination
 * rules* where the others write *Coordination*, and *Skills & automations*
 * where the others write *and*. The alternatives are spelled out here
 * rather than matched loosely, so a row naming something else entirely
 * fails instead of matching a substring.
 */
const PART_HEADINGS: Readonly<Record<AnatomyPartId, RegExp>> = {
  process: /^process$/i,
  roles: /^role set$/i,
  documentTemplates: /^document templates$/i,
  conventions: /^conventions$/i,
  coordination: /^coordination(?: rules)?$/i,
  behaviouralGuidelines: /^behavioural guidelines$/i,
  folderScaffolding: /^folder scaffolding$/i,
  skillsAndAutomations: /^skills (?:and|&) automations$/i,
  autonomyContract: /^autonomy contract$/i,
};

interface PartRow {
  readonly number: number;
  readonly name: string;
  /** The status cell verbatim, emphasis and all. */
  readonly status: string;
}

/**
 * The numbered rows of a README's anatomy table.
 *
 * **Only rows whose first cell is digits alone**, which is not pedantry:
 * `planning`'s table has a **tenth** row, `| 7b | Apply recipe |
 * required |`, describing its `recipe.json`. It is neither an anatomy part
 * nor a declared status — the anatomy stays nine parts and the recipe is a
 * sub-part of part 7 (F5 §Flows) — so it must not be read as one, and a
 * matcher accepting `7b` would silently file it under part 7 and mask a
 * genuinely missing row.
 */
function partRows(b: Bundled): readonly PartRow[] {
  const out: PartRow[] = [];
  for (const line of b.lines) {
    const m = /^\|\s*(\d+)\s*\|\s*([^|]+?)\s*\|\s*([^|]*?)\s*\|/.exec(line);
    if (m === null) continue;
    out.push({ number: Number(m[1]), name: m[2] as string, status: m[3] as string });
  }
  return out;
}

test('every pack README tabulates all nine anatomy parts, in the declared order', async () => {
  for (const b of await bundled()) {
    const rows = partRows(b);
    assert.deepEqual(
      rows.map((r) => r.number),
      [1, 2, 3, 4, 5, 6, 7, 8, 9],
      `${b.name}: the table must carry rows 1–9 and nothing else numbered`,
    );
    ANATOMY_PART_IDS.forEach((part, i) => {
      const row = rows[i] as PartRow;
      assert.match(row.name, PART_HEADINGS[part], `${b.name} row ${row.number} should be ${part}`);
    });
  }
});

/** The status a README's cell claims, read through its emphasis. Exactly
 *  one of the three must appear: a cell naming two, or none, is a row a
 *  reader cannot resolve either. */
function claimedStatus(cell: string): string {
  const found = [...cell.matchAll(/\b(present|provisional|absent)\b/gi)].map((m) =>
    (m[1] as string).toLowerCase(),
  );
  const distinct = [...new Set(found)];
  assert.equal(distinct.length, 1, `"${cell}" claims ${distinct.length} statuses, not one`);
  return distinct[0] as string;
}

/**
 * **The gaps, checked against `pack.json` rather than against the page.**
 *
 * US-28 asks that each README state that pack's gaps explicitly, and the
 * failure worth catching is not a page that never mentioned them — that is
 * visible on one read — but a page that *stops being true*. A pack that
 * closes `writing`'s part 9, or that promotes `planning`'s roles out of
 * `provisional`, leaves a README claiming a gap the product no longer has,
 * and nothing else in this suite would notice: `validate` reads the
 * declaration, and the declaration would be right.
 *
 * Two honest absences and one honest provisional today — the same three
 * `declaration.test.ts` pins from the `pack.json` side, asserted here from
 * the reader's side.
 */
test("each README's status column says what pack.json declares", async () => {
  const disagreements: string[] = [];
  for (const b of await bundled()) {
    const rows = partRows(b);
    ANATOMY_PART_IDS.forEach((part, i) => {
      const declared: AnatomyStatus = b.pack.anatomy[part].status ?? 'present';
      const claimed = claimedStatus((rows[i] as PartRow).status);
      if (claimed !== declared) {
        disagreements.push(`${b.name}.${part}: README says ${claimed}, pack.json says ${declared}`);
      }
    });
  }
  assert.deepEqual(disagreements, []);
});

/**
 * The parts each README calls **thin**, which is a state the format cannot
 * hold: `thin` is not an `AnatomyStatus`, and a thin part is `present` to
 * every checker in the CLI. It exists only as prose, so only a test over
 * the prose can hold it — and US-28 enumerates it precisely, which is what
 * makes it assertable rather than a matter of taste.
 *
 * The enumeration is also the honest picture of the product: the two
 * migrated packs are thin in the halves their source projects did not
 * have, and `planning`, which was authored rather than migrated, is thin
 * nowhere and provisional in one place instead.
 */
test('each README names exactly the thin parts US-28 enumerates', async () => {
  const thin: Record<string, number[]> = {};
  for (const b of await bundled()) {
    thin[b.name] = partRows(b)
      .filter((r) => /\bthin\b/i.test(r.status))
      .map((r) => r.number);
  }
  assert.deepEqual(thin, {
    coding: [5, 8], // coordination and automations — the source codebase had neither
    writing: [3], // one real document template against coding's eleven
    planning: [], // provisional roles instead; see the status test above
  });
});

/** The `[start, end]` line numbers, 1-based and inclusive of both fences,
 *  of every fenced block in a README. Inclusive because that is how US-28
 *  counts — it calls `writing`'s block 15 lines and `planning`'s 18. */
function fencedBlocks(b: Bundled): readonly (readonly [number, number])[] {
  const out: [number, number][] = [];
  let open: number | null = null;
  b.lines.forEach((line, i) => {
    if (!line.startsWith('```')) return;
    if (open === null) open = i + 1;
    else {
      out.push([open, i + 1]);
      open = null;
    }
  });
  assert.equal(open, null, `${b.name}: an unclosed fence`);
  return out;
}

/**
 * The produced-tree block: **one** block, inside the section that promises
 * it, within budget.
 *
 * *One* is asserted rather than *at least one* because the block is what
 * tells a reader which parts of the pack are copied out and which stay at
 * `.harness/pack/` — the single distinction the two-phase model asks a
 * newcomer to hold. Two trees on a page is two answers to that question.
 *
 * What the block *says* is not checked here. Whether it agrees with the
 * recipe's destination set is E-14's (T-1401–T-1405), computed from
 * `recipe.json`; restating a weaker version of that check over ASCII art
 * would be the second implementation this file's header argues against.
 */
test('each README carries one produced-tree block, in its section, within budget', async () => {
  for (const b of await bundled()) {
    const blocks = fencedBlocks(b);
    assert.equal(blocks.length, 1, `${b.name}: expected exactly one fenced block`);
    const [start, end] = blocks[0] as readonly [number, number];

    const heading = b.lines.findIndex((l) => /^##+\s.*what the recipe produces/i.test(l));
    assert.notEqual(heading, -1, `${b.name}: no "What the recipe produces" section`);
    const nextHeading = b.lines.findIndex((l, i) => i > heading && /^##\s/.test(l));
    const sectionEnd = nextHeading === -1 ? b.lines.length : nextHeading;

    assert.ok(
      start > heading + 1 && end <= sectionEnd,
      `${b.name}: the block at ${start}–${end} is outside the section at ${heading + 1}`,
    );
    assert.ok(
      end - start + 1 <= MAX_TREE_BLOCK_LINES,
      `${b.name}: the produced-tree block is ${end - start + 1} lines; the budget is ${MAX_TREE_BLOCK_LINES}`,
    );
  }
});

/**
 * The version and the CLI floor, **read off the page and compared to
 * `pack.json`**.
 *
 * Two phrasings are accepted because two ship: `coding` and `writing` head
 * their pages with ``**Version 1.0.0 · `minCliVersion` 1.0.0 · …**`` and
 * `planning` with `**Version 1.0.0 · requires CLI 1.0.0 or later · …**`.
 * Neither is wrong — US-28 asks the README to *state* the floor, not to
 * name the key — so requiring the identifier would fail a page that is
 * doing exactly what was asked, in better English.
 *
 * **This test has less bite today than it will have**, and it is worth
 * saying so: all six numbers are `1.0.0`, so a page could carry the wrong
 * one of the two and still pass. Its subject is the first version bump —
 * the moment a pack moves to `1.1.0` and its page keeps saying `1.0.0`,
 * which is precisely the drift nothing else in the build can see.
 */
test('each README states the version and CLI floor pack.json declares', async () => {
  for (const b of await bundled()) {
    // The identity block, not the whole page: a stray `1.0.0` further down
    // must not be able to satisfy a rule about the page's header.
    const head = b.lines.slice(0, 10).join('\n');

    const version = /\bVersion (\d+\.\d+\.\d+)/.exec(head);
    assert.ok(version, `${b.name}: no version in the first ten lines`);
    assert.equal(version[1], b.pack.version, `${b.name}: README version`);

    const floor = /(?:`minCliVersion`|requires CLI) (\d+\.\d+\.\d+)/.exec(head);
    assert.ok(floor, `${b.name}: no CLI floor in the first ten lines`);
    assert.equal(floor[1], b.pack.minCliVersion, `${b.name}: README minCliVersion`);
  }
});

/** A README's `## ` sections, heading included, as whole strings. */
function sections(b: Bundled): readonly string[] {
  const out: string[] = [];
  let current: string[] = [];
  for (const line of b.lines) {
    if (/^##\s/.test(line)) {
      if (current.length > 0) out.push(current.join('\n'));
      current = [line];
    } else current.push(line);
  }
  if (current.length > 0) out.push(current.join('\n'));
  return out;
}

/**
 * Q-49, from both ends.
 *
 * `coding` and `planning` ship **two copies of one targets contract**, and
 * the duplication is accepted rather than accidental — which is only true
 * if a reader of either page can find out about the other. A pack that
 * described its own copy without naming the other holder would be
 * accurate and still leave the reader thinking they had the only one; that
 * is the difference between a recorded cost and a silent one.
 *
 * The v1.1 booking is asserted alongside the name for the same reason:
 * *there are two copies* is a fact, *reconciling them is v1.1-T1* is the
 * commitment, and Q-49 accepted the duplication on the strength of the
 * second, not the first.
 */
test('coding and planning each name the other as the holder of the duplicate targets copy', async () => {
  const byName = new Map((await bundled()).map((b) => [b.name, b]));
  for (const [name, other] of [
    ['coding', 'planning'],
    ['planning', 'coding'],
  ] as const) {
    const b = byName.get(name) as Bundled;
    const booked = sections(b).filter((s) => /targets/i.test(s) && /v1\.1/.test(s));
    assert.notEqual(booked.length, 0, `${name}: no section books the targets duplication at v1.1`);
    assert.ok(
      booked.some((s) => new RegExp(`\\b${other}\\b`).test(s)),
      `${name}: the duplication is recorded without naming ${other} as the other holder`,
    );
  }
});

/**
 * **SKIPPED — this fails against `packs/writing/README.md` as it ships,
 * and the fix is T-1604's, in the pack.**
 *
 * US-28: *"Each README … states that the pack is **self-contained** — it
 * references no shared component, because no sharing mechanism exists at
 * v1.0 (Q-48)."*
 *
 * `coding` says it — *"**This pack references no shared component.**"* —
 * and `planning` says it in its identity line — *"· self-contained."*.
 * **`writing` says it nowhere.** The nearest thing on the page is part 9's
 * explanation of why the gap cannot be closed: *"There is no `shared/`
 * tree at v1.0, so there is nothing to reference"*. That is a statement
 * about the **product**, offered as the reason an absent part stays
 * absent — not a statement about *this pack*, and a reader who skips the
 * anatomy table never meets it.
 *
 * The distinction is worth the failing test rather than a looser regex.
 * Self-containment is what makes `.harness/pack/` the complete article: a
 * reader who cannot tell whether their pack depends on something outside
 * itself cannot tell what deleting that folder would cost them, and Q-48's
 * whole argument for shipping no `shared/` mechanism was that packs would
 * say so plainly instead. Two of three do.
 *
 * **Un-skip once `packs/writing/README.md` states it** — one sentence, and
 * the natural home is the identity block at the top, where `planning`
 * already puts it.
 */
test(
  'every pack README states that the pack is self-contained',
  { skip: 'packs/writing/README.md makes no self-containment statement — T-1604' },
  async () => {
    const silent: string[] = [];
    for (const b of await bundled()) {
      if (!/self-contained|references no shared component|no shared component/i.test(b.readme)) {
        silent.push(b.name);
      }
    }
    assert.deepEqual(silent, [], 'Q-48: a pack that is standalone must say so on its own page');
  },
);

/* ── T-1603 — US-36, over applied-destined content ───────────────────── */

/**
 * Every payload path that can reach a project, under **any** scaffold
 * selection.
 *
 * Derived from the recipe rather than listed, which is the whole reason
 * T-1603's exemption is safe to grant: the moment a pack starts copying a
 * file out, that file enters the sweep below without anyone remembering to
 * add it. A hand-written exemption list would decay in exactly the
 * direction that hides a failure.
 *
 * **Every declared scaffold's steps are included**, not the default
 * selection: `--scaffold writing-workstream` puts thirteen more files in
 * front of a reader, and content that only ships under a flag is content
 * that ships.
 *
 * The directory expansion — prefix match, `exclude` globs **relative to
 * `from`** — mirrors `stepWriteSet`'s, and uses the same `matchesAny` so
 * the two cannot disagree about the dialect. It is written out here rather
 * than reused because that function computes *destinations* and this needs
 * *sources*; the destination set cannot answer "which payload file do I
 * open".
 */
function appliedSources(b: Bundled): readonly string[] {
  const steps: readonly RecipeStep[] = [
    ...b.recipe.steps,
    ...Object.values(b.recipe.scaffolds ?? {}).flat(),
  ];

  const out = new Set<string>();
  for (const step of steps) {
    // Editing ops read no payload — their bytes come from files an earlier
    // step already placed, so their sources are already in this set.
    if (!isPlacing(step.op)) continue;
    const field = OPS[step.op].sourceField;
    if (field === null) continue;
    const from = (step as unknown as Record<string, string>)[field] as string;

    if (!from.endsWith('/')) {
      out.add(from);
      continue;
    }
    const exclude = step.op === 'copy' || step.op === 'strip-suffix' ? step.exclude : undefined;
    for (const p of b.payload) {
      if (!p.startsWith(from)) continue;
      const rel = p.slice(from.length);
      if (rel === '' || (exclude !== undefined && matchesAny(exclude, rel))) continue;
      out.add(p);
    }
  }
  return [...out].sort();
}

/**
 * The scoping T-1603 grants, asserted rather than assumed.
 *
 * The task exempts a pack's own `README.md` because it *"legitimately
 * describes what an apply does"* — the page above is allowed to say the
 * recipe copies a folder, since it is telling the reader what happened
 * rather than what to do. That exemption is only sound while the file
 * genuinely never reaches a project, so it is checked here instead of
 * being taken on trust.
 *
 * `pack.json` and `recipe.json` are checked with it. A pack copying its
 * own declaration into the project would be a real defect — the manifest,
 * not the payload, is what records which pack was applied — and it would
 * quietly widen the sweep below with two files full of the word `copy`.
 */
test('a pack ships its own README and declarations to the payload, never to a project', async () => {
  for (const b of await bundled()) {
    const applied = new Set(appliedSources(b));
    for (const own of ['README.md', 'pack.json', 'recipe.json']) {
      assert.ok(b.payload.includes(own), `${b.name}: no ${own} in the payload`);
      assert.equal(applied.has(own), false, `${b.name}: ${own} is copied into the project`);
    }
    // A sanity floor: the CLAUDE.md template reaches every project, so an
    // empty or near-empty source set would show up here rather than as a
    // sweep that passes because it read nothing.
    assert.ok(applied.has('CLAUDE.md.template'), `${b.name}: CLAUDE.md.template is not applied`);
    assert.ok(applied.size > 10, `${b.name}: only ${applied.size} applied sources — check the walk`);
  }
});

/**
 * **The five forms F5 enumerates**, matched case-insensitively, as US-36
 * asks. Two are the headings of deleted sections; three are the imperative
 * phrases inside them (F5 §Flows, the Q-46 row).
 */
const ENUMERATED_FIVE: readonly (readonly [string, RegExp])[] = [
  ['copy this folder', /copy this folder/i],
  ['rename the template', /rename the template/i],
  ['fix the paths', /fix the paths?/i],
  ['Adopting this in a new project', /adopting this in a new project/i],
  ['Bootstrapping a new project', /bootstrapping a new project/i],
];

/**
 * The same rule, matched against **what the deleted prose actually said**.
 *
 * The five literals above would not have caught it, and that is worth
 * demonstrating rather than asserting: F5 §Flows records the deleted
 * `packs/coding/README.md` section as *"copy the contents of this folder /
 * rename `CLAUDE.md.template` / drop the agent files into
 * `.claude/agents/`"*. **`/copy this folder/i` does not match "copy the
 * contents of this folder"**, and `/rename the template/i` does not match
 * "rename `CLAUDE.md.template`". A test grepping only the enumerated five
 * would therefore have passed against the pack *before* the strip — which
 * makes it a check of the phrasing rather than of the rule.
 *
 * So both run. The narrow set is the spec's letter and is what a reader
 * comparing this file to US-36 will look for; the wide set is US-36's
 * actual sentence — *no pack file instructs a reader to apply the pack by
 * hand* — and it is the one with teeth.
 */
const THE_WORDINGS_THAT_WERE_DELETED: readonly (readonly [string, RegExp])[] = [
  ['copy the (contents of this|this|the) folder', /copy\s+(?:the\s+)?(?:contents\s+of\s+)?(?:this|the)\s+(?:folder|directory|pack)/i],
  ['copy the folder into/to', /copy\s+(?:the\s+)?(?:folder|directory)\s+(?:into|to)\b/i],
  ['rename <something>.template', /\brename\s+[`'"]?[\w./-]*\.template\b/i],
  ['drop the … into …', /\bdrop\s+the\s+[\w\s./`-]{0,40}\binto\b/i],
  ['fix the path(s)', /\bfix\s+the\s+paths?\b/i],
  ['adopting this in a new project', /adopt(?:ing)?\s+(?:this|the\s+pack)\s+in\s+a\s+new\s+project/i],
  ['bootstrapping a new project', /bootstrap\w*\s+a\s+new\s+project/i],
  ['a heading about adopting or bootstrapping', /^#{1,6}\s.*\b(?:adopt|bootstrap)\w*/im],
];

/** Every `<file>:<line>: <form>` hit of `forms` in a pack's applied-destined
 *  content. Reported by line so a finding is actionable without a second
 *  grep. */
async function sweep(
  b: Bundled,
  forms: readonly (readonly [string, RegExp])[],
): Promise<readonly string[]> {
  const hits: string[] = [];
  for (const source of appliedSources(b)) {
    const text = await readFile(new URL(source, packDir(b.name)), 'utf8');
    text.split('\n').forEach((line, i) => {
      for (const [label, re] of forms) {
        if (re.test(line)) hits.push(`${b.name}/${source}:${i + 1}: [${label}] ${line.trim()}`);
      }
    });
  }
  return hits;
}

/**
 * US-36. **A reader of an applied project must never be following
 * instructions for something that has already happened.**
 *
 * The cost of a survivor is not that the sentence is stale — it is that a
 * reader who obeys it does the apply a second time, by hand, over files
 * the CLI wrote and now believes it can recompute. `update` classifies by
 * recomputation (Q-62), so hand-editing what the recipe placed converts a
 * path that would have been replaced outright into one reported as edited.
 * One obeyed sentence turns a computed update into a conversation.
 *
 * **Whole-tree coverage is T-1505's**, in `migration.test.ts`: US-36's
 * first two criteria are stated over all of `packs/`, and they have to be,
 * because four of the five Q-46 deletions were in payload-only files that
 * this sweep deliberately cannot see. The two tests are complements, not
 * duplicates — see the report on T-1603 for why that split leaves a gap
 * neither task owns.
 */
test('no applied-destined pack file carries one of the five enumerated forms', async () => {
  const hits: string[] = [];
  for (const b of await bundled()) hits.push(...(await sweep(b, ENUMERATED_FIVE)));
  assert.deepEqual(hits, []);
});

test('no applied-destined pack file instructs a reader to apply the pack by hand', async () => {
  const hits: string[] = [];
  for (const b of await bundled()) hits.push(...(await sweep(b, THE_WORDINGS_THAT_WERE_DELETED)));
  assert.deepEqual(hits, []);
});
