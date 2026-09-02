#!/usr/bin/env node
/**
 * `scripts/migration-diff.mjs` — US-24's and US-25's fidelity check, made
 * re-runnable. **T-1501.**
 *
 *   node scripts/migration-diff.mjs            # both packs
 *   node scripts/migration-diff.mjs coding     # one pack
 *   node scripts/migration-diff.mjs --json     # machine-readable, for the test
 *
 * ── Why this exists at all ────────────────────────────────────────────
 *
 * F5 US-24 promises *"a documented, re-runnable check"* that every
 * difference between a shipped pack and the commit it was taken from
 * falls into one of ten declared classes. Through F5 v3.2 that check had
 * **never been run**, and the enumeration it compared against was asserted
 * complete twice while being wrong twice — class (e) was asserted empty
 * and was not (Q-80), and class (h) was then written from a directory
 * listing rather than from a diff and named two files that are not
 * net-new (F5 v3.4). Both errors are the same error: *membership asserted
 * without checking.* A script is the only form of the check that cannot
 * commit it.
 *
 * F5 v3.3's run was done by hand. This file is that run made repeatable,
 * which is a different and stronger claim: a hand-run is evidence about
 * one afternoon, and a checked-in script is evidence about every commit
 * after it.
 *
 * ── Why the commit is not an argument ─────────────────────────────────
 *
 * T-1501 requires the source commit to come from `pack.json`'s
 * `provenance`, never from the command line, *"so it cannot drift from
 * what the pack claims"*. That wiring has already paid for itself once:
 * `packs/coding/pack.json` recorded `2644096`, which is the commit that
 * **removed** `template/`, so the tree it named did not exist. A check
 * taking the commit as an argument would have been run against the right
 * tree by a human who knew better, and the pack would still be lying.
 * Reading `provenance` is what turned a wrong claim into a failure.
 *
 * ── What the check compares ───────────────────────────────────────────
 *
 * Three dispositions per path, and each is a different question about
 * fidelity:
 *
 *   `dropped`   in the source, not in the pack
 *   `added`     in the pack, not in the source
 *   `modified`  in both, bytes differ
 *
 * Byte equality, deliberately. A whitespace-insensitive compare would
 * silently pass the one class of change — reflowing a paragraph around an
 * edit — that a reader is least likely to notice by eye.
 *
 * ── Two things it checks, not one ─────────────────────────────────────
 *
 * 1. **Residue.** Any differing path no declared class claims. US-24
 *    calls this class (j) and requires it empty; anything landing here is
 *    an input to T-1503, not something for this script to reclassify.
 *
 * 2. **Class evidence.** Several classes state how to assert their own
 *    membership — class (e) as `grep -rl '\.harness/pack' packs/coding`,
 *    class (f) as `grep -rl '{{harness:' packs/coding`, class (g) as six
 *    anchors, class (i) as zero hits for the host project's names. So
 *    membership is checkable in **both** directions, and both are checked:
 *    a declared member missing its evidence (*over-claim*) and a file
 *    carrying the evidence that the class does not name (*under-claim*).
 *    Class (h)'s v3.4 correction was an over-claim; had this run existed,
 *    it would have been caught by a script rather than by an architect.
 *
 * Both are failures. Exit 1 on either, 0 when the packs and the spec
 * agree.
 *
 * ── Zero dependencies, and `git` by subprocess ────────────────────────
 *
 * This is a script, not product code: it never ships, so `node:child_process`
 * calling `git` is fine here where it would not be under `src/`. It reads
 * history with `git ls-tree` and `git cat-file` and **mutates nothing** —
 * no checkout, no archive into the working tree — because the source tree
 * it needs is a historical one and the working tree may be in use.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, posix, relative, sep } from 'node:path';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

/* ── git, read-only ───────────────────────────────────────────────────── */

/** `git` in `repo`, as a string. Buffers are for blobs; see `blob`. */
function git(repo, args) {
  return execFileSync('git', args, { cwd: repo, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

/** A blob's raw bytes. Not `utf8` — the check is byte equality, and the
 *  source trees hold PDFs and images that would not survive a decode. */
function blob(repo, commit, path) {
  return execFileSync('git', ['cat-file', 'blob', `${commit}:${path}`], { cwd: repo, maxBuffer: 64 * 1024 * 1024 });
}

/** Every path in `commit` under `prefix`, prefix-relative and POSIX. */
function treePaths(repo, commit, prefix) {
  const out = git(repo, ['ls-tree', '-r', '--name-only', commit, ...(prefix ? [prefix] : [])]);
  return out
    .split('\n')
    .filter(Boolean)
    .map((p) => (prefix ? p.slice(prefix.length) : p))
    .sort();
}

/** Every file under `dir`, dir-relative and POSIX. */
function diskPaths(dir) {
  const out = [];
  (function walk(d) {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.isFile()) out.push(relative(dir, p).split(sep).join(posix.sep));
    }
  })(dir);
  return out.sort();
}

/* ── the declared classes ─────────────────────────────────────────────
 *
 * Everything below is transcribed from F5 v3.4 — US-24's acceptance
 * criteria and §Flows / *Migration requirements*. **The transcription is
 * the point**: a class defined by a predicate over the diff would pass by
 * construction, which is the failure mode a "judgement rather than a
 * list" was rejected for at Q-80. Each entry cites where it came from so
 * a reader can check the transcription rather than trust it.
 */

/** `coding` — the ten classes, US-24 as amended at F5 v3.4. */
const CODING = {
  a: {
    title: 'Q-46 deletion',
    spec: 'F5 §Flows / Migration requirements — coding, (a); the table is declared exhaustive',
    // The table names a file and what comes out of it. The marker is the
    // string that must be **present in the source and absent from the
    // pack** — checking the deletion happened rather than trusting it.
    members: {
      'README.md': '## Bootstrapping a new project',
      'targets/README.md': '## Adopting this in a new project',
      'agents/README.md': 'Copy this folder',
      'agent-teams/README.md': 'Copy this folder to `AgentTeams/`',
      'CLAUDE.md.template': null, // a cross-reference, not a heading; see note below
    },
  },
  b: {
    title: 'structural addition',
    spec: 'F5 §Flows / Migration requirements — coding, (b)',
    // §Flows lists `pack.json`, `recipe.json`, `commands/`, `applied-readmes/`
    // and the backend scaffolds. **US-24's own criterion text lists only
    // the first three of those five** — see the spec-gap note in the
    // report. §Flows is the enumeration used here because it is the one
    // that enumerates.
    prefixes: ['applied-readmes/', 'commands/'],
    exact: ['pack.json', 'recipe.json'],
  },
  c: {
    title: 'declared restructure, as it stood at migration time',
    spec: 'F5 US-24 class (c), narrowed at v3.4',
    // `infrastructure/backend-deploy/` became `scaffolds/backend-azure/`.
    // Q-82 then moved that tree out of `packs/` altogether, so at the
    // current tree this map resolves to nothing and the seven files fall
    // to class (k) — which is exactly what T-1503 adjudicated. The rule
    // stays declared rather than deleted: it is what makes the second hop
    // visible as a second hop.
    rename: [['infrastructure/backend-deploy/', 'scaffolds/backend-azure/']],
  },
  d: {
    title: 'brief wire-up',
    spec: 'F5 US-24 class (d) — "exactly five files" for coding',
    members: [
      'agents/specwriter.md',
      'agents/researcher.md',
      'agents/architect.md',
      'agent-teams/Specify.md',
      'specifications/README.md',
    ],
    // Additive and minimal: a line in a read-first list. Assertable as
    // the pack file naming the brief where the source did not.
    evidence: (packText) => packText.includes('project-brief.md'),
  },
  e: {
    title: 'payload-side path repointing',
    spec: 'F5 US-24 class (e) — "is five files"',
    members: [
      'targets/README.md',
      'agents/designer.md',
      'agents/specwriter.md',
      'agents/target-reviewer.md',
      'agent-teams/Specify.md',
    ],
    // The spec's own assertion: `grep -rl '\.harness/pack' packs/coding`,
    // minus the class (b) and (h) files.
    evidence: (packText) => packText.includes('.harness/pack'),
    assertion: { needle: '.harness/pack', minus: ['b', 'h'] },
  },
  f: {
    title: 'parameter-token insertion',
    spec: "F5 US-24 class (f) — C-43's five",
    members: [
      'CLAUDE.md.template',
      'specifications/project-brief.template.md',
      'specifications/README.template.md',
      'agent-teams/Implement.md',
      'agent-teams/Specify.md',
    ],
    evidence: (packText) => packText.includes('{{harness:'),
    assertion: { needle: '{{harness:', minus: [] },
  },
  g: {
    title: 'region anchors',
    spec: 'F5 US-24 class (g) — six, all in CLAUDE.md.template',
    members: ['CLAUDE.md.template'],
    // The count is the contract (F5 US-38, Q-61), so it is checked, not
    // merely the presence of anchors.
    evidence: (packText) => (packText.match(/<!-- harness:region /g) ?? []).length === 6,
    assertion: { needle: '<!-- harness:region ', minus: [] },
  },
  h: {
    title: 'net-new authoring beyond class (b)',
    spec: 'F5 US-24 class (h) as corrected at v3.4 — "exactly two files"',
    members: ['specifications/README.template.md', 'specifications/project-brief.template.md'],
  },
  i: {
    title: "Q-59's securityreviewer generalisation",
    spec: 'F5 US-24 class (i) — zero hits for the host project\'s names in packs/coding/agents/',
    members: ['agents/securityreviewer.md'],
    // The generalisation is the *removal* of hardcoded host-project
    // paths, so the evidence is their absence from the pack — and the
    // check below also requires their presence in the source, which is
    // what distinguishes a generalisation from a file that never had them.
    evidence: (packText) => !packText.includes('reference/thoughtpartner'),
    sourceEvidence: (srcText) => srcText.includes('reference/thoughtpartner'),
  },
  k: {
    title: "post-migration change recorded in F5's change history",
    spec: 'F5 US-24 class (k) — a member is admitted only if the change history records it',
    // The change-history revision is carried per member, because "recorded
    // in the change history" is the entire membership rule and a member
    // that cannot name its revision is not a member.
    members: {
      'specifications/README.md': 'v3.2 — the security-condition fold rule',
      'README.md': 'v3.0 — the US-28 rewrite of the Voxio-era "Project Starter Pack"',
      'infrastructure/backend-deploy/README.md': 'v3.1 — Q-82 moved the tree to addons/',
      'infrastructure/backend-deploy/deploy.ps1.template': 'v3.1 — Q-82',
      'infrastructure/backend-deploy/deploy.sh.template': 'v3.1 — Q-82',
      'infrastructure/backend-deploy/main.bicep.template': 'v3.1 — Q-82',
      'infrastructure/backend-deploy/production.bicepparam.template': 'v3.1 — Q-82',
      'infrastructure/backend-deploy/setup-neon.ps1.template': 'v3.1 — Q-82',
      'infrastructure/backend-deploy/setup-neon.sh.template': 'v3.1 — Q-82',
    },
  },
};

/**
 * `writing` — **no by-file enumeration exists in the spec**, and that is a
 * finding rather than an omission this script quietly fills.
 *
 * US-24's ten classes are `coding`'s: nine of them are enumerated by
 * `coding` filenames, and only class (d) names `writing` files. What F5
 * gives for `writing` is US-25 (four greps and a demand for an extraction
 * record) plus §Flows / *Migration requirements — writing*, which names
 * four **kinds** of difference — (a) Q-46 stripping, (b) four exclusion
 * classes, (c) structural additions, (d) two authored templates — without
 * naming files under any of them.
 *
 * So the classes below are **derived from those four kinds**, and the
 * lettering is deliberately `w`-prefixed so nothing here can be mistaken
 * for one of US-24's ten. Where a rule had to be chosen rather than read,
 * the comment says so. Everything the derivation cannot place is reported
 * as residue exactly as `coding`'s is — which is the whole reason to run
 * it against a derived enumeration rather than not run it at all.
 */
const WRITING = {
  // The source→pack correspondence. Derived from F5 §Flows / `packs/writing/`
  // §Payload and §7b: nothing in the spec states it path by path.
  map: [
    ['CLAUDE.md', 'CLAUDE.md.template'],
    ['README.md', 'README.md'],
    ['Home.md', 'templates/home.template.md'],
    ['workstreams/learning-journey/post-template.md', 'templates/post.template.md'],
    // The eight agents, extracted out of the host project's `.claude/`.
    ...['analyst', 'critic', 'editor', 'librarian', 'outliner', 'researcher', 'scout', 'writer'].map(
      (a) => [`.claude/agents/${a}.md`, `agents/${a}.md`],
    ),
    // The guide keeps its four files under their existing names (Q-51),
    // `.template`-suffixed so `strip-suffix` has something to act on.
    ...['README', 'ai-tells', 'bilingual-publishing', 'tone-of-voice'].map((g) => [
      `writing-guide/${g}.md`,
      `writing-guide/${g}.template.md`,
    ]),
    // The twelve pre-authored scaffold indexes. Each is its host folder's
    // `index.md` with the research content stripped out — which is why
    // they are *modified* rather than *added*, and why treating them as
    // net-new would hide the one thing US-25 asks about them.
    ['analyses/index.md', 'scaffolds/writing-workstream/analyses/index.md'],
    ['Notes/index.md', 'scaffolds/writing-workstream/notes/index.md'],
    ['sources/index.md', 'scaffolds/writing-workstream/sources/index.md'],
    ['sources/_scouting/index.md', 'scaffolds/writing-workstream/sources/_scouting/index.md'],
    ['sources/inbox/index.md', 'scaffolds/writing-workstream/sources/inbox/index.md'],
    ['tasks/index.md', 'scaffolds/writing-workstream/tasks/index.md'],
    ['workstreams/index.md', 'scaffolds/writing-workstream/workstreams/index.md'],
    [
      'workstreams/learning-journey/index.md',
      'scaffolds/writing-workstream/workstreams/example-workstream/index.md',
    ],
    ...['outlines', 'drafts', 'reviews', 'published'].map((s) => [
      `workstreams/learning-journey/${s}/index.md`,
      `scaffolds/writing-workstream/workstreams/example-workstream/${s}/index.md`,
    ]),
  ],
  classes: {
    d: {
      title: 'brief wire-up',
      spec: 'F5 US-24 class (d) — "exactly six agent prompts", plus the CLAUDE.md.template bullet',
      members: [
        'agents/outliner.md',
        'agents/writer.md',
        'agents/critic.md',
        'agents/researcher.md',
        'agents/scout.md',
        'agents/editor.md',
        'CLAUDE.md.template',
      ],
      evidence: (packText) => packText.includes('project-brief'),
    },
    we: {
      title: 'de-personalisation — the host project and its owner become parameters or placeholders',
      spec: 'F5 US-25 — zero hits for /Users/, the host project name and the owner\'s name',
      // A modified path qualifies when the pack file carries a parameter
      // token or a declared `{{…}}` placeholder that the source did not.
      // This is the class that *is* US-25: the check is not "did the name
      // go" but "did something declared replace it".
      test: (packText, srcText) =>
        (packText.includes('{{harness:param.') || /\{\{[A-Z]/.test(packText)) &&
        !srcText.includes('{{harness:param.'),
    },
    wa: {
      title: 'Q-46 stripping / research content removed',
      spec: 'F5 §Flows / Migration requirements — writing, (a); US-25 — no research content under the scaffold tree',
      // Every scaffold index is here: the source ones carry the project's
      // real corpus in their tables, and the shipped ones carry an empty
      // table. Stated as a prefix rule rather than a file list because the
      // scaffold's shape is the recipe's, not the source project's.
      packPrefixes: ['scaffolds/writing-workstream/'],
    },
    wc: {
      title: 'structural addition',
      spec: 'F5 §Flows / Migration requirements — writing, (c)',
      exact: ['pack.json', 'recipe.json'],
    },
    wd: {
      title: 'authored recipe scaffolding (Q-51)',
      spec: 'F5 §Flows / Migration requirements — writing, (d), plus §7b for the brief',
      // Q-51 says "two authored templates, and exactly two"; §7b then adds
      // `project-brief.template.md` as recipe scaffolding of the same kind.
      // `home.template.md` is declared authored here because Q-51 declares
      // it so — and the run reports that it is demonstrably not. See the
      // over-claim check.
      members: [
        'templates/index.template.md',
        'templates/home.template.md',
        'templates/project-brief.template.md',
      ],
    },
    wb: {
      title: 'exclusion class — does not extract',
      spec: 'F5 §Flows / Migration requirements — writing, (b): four classes, each with its reason',
      // Applies to `dropped` source paths only. The four reasons are the
      // spec's; the prefix rules that route a path to one of them are
      // derived, since §Flows names the corpus by folder and the rest by
      // description.
      reasons: [
        [/^analyses\//, 'research corpus'],
        [/^sources\//, 'research corpus'],
        [/^workstreams\//, 'research corpus'],
        [/^Notes\/voice\//, 'personal notes and voice samples'],
        [/^Notes\//, 'research corpus'],
      ],
    },
  },
};

/* ── the run ──────────────────────────────────────────────────────────── */

/** Read `provenance` off a bundled pack, and refuse to guess. */
function provenanceOf(name) {
  const pj = JSON.parse(readFileSync(join(ROOT, 'packs', name, 'pack.json'), 'utf8'));
  const p = pj.provenance;
  if (!p || typeof p !== 'object') throw new Error(`packs/${name}/pack.json declares no provenance object`);
  if (typeof p.commit !== 'string') throw new Error(`packs/${name}/pack.json declares no provenance.commit`);
  return p;
}

/**
 * Locate the source repository and the prefix inside it.
 *
 * `provenance.source` is prose — F1 declares it *"declared and never
 * interpreted"* — so it cannot be resolved as a path, and this function
 * does not try. The two mappings are stated here instead, which keeps the
 * one thing the pack must be believed about (**the commit**) separate from
 * the one thing it may describe loosely (**where it came from**).
 */
function sourceOf(name) {
  if (name === 'coding') return { repo: ROOT, prefix: 'template/' };
  if (name === 'writing') return { repo: join(ROOT, '..', 'AIImpactOnOrganizationsAndLeadership'), prefix: '' };
  throw new Error(`no source is declared for pack "${name}" — only coding and writing were migrated`);
}

/** The diff, before any classification. */
function diff(name) {
  const prov = provenanceOf(name);
  const { repo, prefix } = sourceOf(name);
  const packDir = join(ROOT, 'packs', name);

  // Resolve the commit before listing, so a provenance naming an unreachable
  // object fails loudly rather than producing an empty "source tree".
  let commit;
  try {
    commit = git(repo, ['rev-parse', `${prov.commit}^{commit}`]).trim();
  } catch {
    throw new Error(`packs/${name}/pack.json records commit ${prov.commit}, which is not reachable in ${repo}`);
  }

  const srcPaths = treePaths(repo, commit, prefix);
  if (srcPaths.length === 0) {
    // How the `2644096` defect presented: a commit that exists, naming a
    // tree that does not.
    throw new Error(`commit ${prov.commit} holds no files under "${prefix || '<root>'}" in ${repo}`);
  }
  const packPaths = diskPaths(packDir);

  // The source→pack correspondence. `coding` is identity plus class (c)'s
  // rename; `writing` is the derived table above.
  const mapped = new Map();
  if (name === 'coding') {
    for (const s of srcPaths) {
      let m = s;
      for (const [from, to] of CODING.c.rename) if (s.startsWith(from)) m = to + s.slice(from.length);
      mapped.set(s, m);
    }
  } else {
    for (const [s, p] of WRITING.map) mapped.set(s, p);
    for (const s of srcPaths) if (!mapped.has(s)) mapped.set(s, null);
  }

  const packSet = new Set(packPaths);
  const claimed = new Set();
  const rows = [];

  for (const s of srcPaths) {
    const p = mapped.get(s);
    if (p && packSet.has(p)) {
      claimed.add(p);
      const a = blob(repo, commit, prefix + s);
      const b = readFileSync(join(packDir, p));
      if (!a.equals(b)) rows.push({ disposition: 'modified', path: p, source: s });
    } else {
      // A dropped path is reported under its **source** name. Reporting it
      // under the destination class (c) predicted would name a file that
      // does not exist, and would read as though the restructure happened.
      rows.push({ disposition: 'dropped', path: s, source: s, expected: p && p !== s ? p : null });
    }
  }
  for (const p of packPaths) if (!claimed.has(p)) rows.push({ disposition: 'added', path: p, source: null });

  rows.sort((x, y) => (x.path < y.path ? -1 : x.path > y.path ? 1 : 0));
  return { name, prov, commit, repo, prefix, packDir, srcPaths, packPaths, rows };
}

/** Text of a pack path, or `''` for a path that is not text. */
function packText(packDir, p) {
  try {
    return readFileSync(join(packDir, p), 'utf8');
  } catch {
    return '';
  }
}

/** Classify `coding`'s rows, and check each class's own stated evidence. */
function classifyCoding(d) {
  const problems = [];
  // Notes are printed and not failed on: an observation about a class that
  // another class already covers. Class (c)'s stale prediction is the only
  // current member — the seven `infrastructure/` files are class (k) by
  // T-1503's adjudication, and re-failing on a decision already taken would
  // train a reader to ignore the output.
  const notes = [];
  const text = (p) => packText(d.packDir, p);
  const srcText = (s) => {
    try {
      return blob(d.repo, d.commit, d.prefix + s).toString('utf8');
    } catch {
      return '';
    }
  };

  for (const row of d.rows) {
    const cls = [];
    const { path: p, source: s } = row;

    if (p in CODING.a.members) {
      cls.push('a');
      const marker = CODING.a.members[p];
      // The deletion is verified, not assumed: present in the source and
      // gone from the pack. `CLAUDE.md.template`'s entry is a
      // cross-reference rather than a quotable heading, so it carries no
      // marker and is the one member taken on the spec's word.
      if (marker !== null && s) {
        if (!srcText(s).includes(marker)) problems.push(`class (a) over-claim: ${p} — source has no ${JSON.stringify(marker)}`);
        else if (text(p).includes(marker)) problems.push(`class (a) over-claim: ${p} — ${JSON.stringify(marker)} survives in the pack`);
      }
    }
    if (CODING.b.exact.includes(p) || CODING.b.prefixes.some((x) => p.startsWith(x))) cls.push('b');
    // Class (c) claims a tree *moved*. A source path whose predicted
    // destination is not in the pack did not move — it left. Saying so is
    // how the second hop (Q-82, `scaffolds/` → `addons/`) stays visible
    // instead of being absorbed by the class that predates it.
    if (row.expected) {
      notes.push(`class (c) predicts ${p} → ${row.expected}, which the pack does not hold`);
    } else if (CODING.c.rename.some(([, to]) => p.startsWith(to))) {
      cls.push('c');
    }
    for (const letter of ['d', 'e', 'f', 'g', 'h', 'i']) {
      const c = CODING[letter];
      if (!c.members.includes(p)) continue;
      cls.push(letter);
      if (c.evidence && !c.evidence(text(p))) problems.push(`class (${letter}) over-claim: ${p} carries none of the evidence ${letter} asserts`);
      if (c.sourceEvidence && s && !c.sourceEvidence(srcText(s))) problems.push(`class (${letter}) over-claim: ${p} — the source shows nothing to generalise`);
    }
    if (p in CODING.k.members) cls.push(`k [${CODING.k.members[p]}]`);

    row.classes = cls;
  }

  // Under-claim: a file carrying a class's own assertable evidence that
  // the class does not name. This is the direction that catches an
  // enumeration going stale under a pack that keeps improving.
  for (const letter of ['e', 'f', 'g']) {
    const c = CODING[letter];
    const minus = new Set(c.assertion.minus.flatMap((l) => (Array.isArray(CODING[l].members) ? CODING[l].members : Object.keys(CODING[l].members ?? {}))));
    const bFiles = (p) => CODING.b.exact.includes(p) || CODING.b.prefixes.some((x) => p.startsWith(x));
    for (const p of d.packPaths) {
      if (c.members.includes(p) || minus.has(p)) continue;
      if (c.assertion.minus.includes('b') && bFiles(p)) continue;
      if (text(p).includes(c.assertion.needle)) {
        problems.push(
          `class (${letter}) under-claim: ${p} carries ${JSON.stringify(c.assertion.needle)} and (${letter}) does not name it` +
            (c.assertion.minus.length ? ` (assertion subtracts classes ${c.assertion.minus.join(', ')})` : ''),
        );
      }
    }
  }

  return { problems, notes };
}

/** Classify `writing`'s rows against the derived enumeration. */
function classifyWriting(d) {
  const problems = [];
  const notes = [];
  const C = WRITING.classes;
  const text = (p) => packText(d.packDir, p);
  const srcText = (s) => {
    try {
      return blob(d.repo, d.commit, d.prefix + s).toString('utf8');
    } catch {
      return '';
    }
  };

  for (const row of d.rows) {
    const cls = [];
    const { path: p, source: s, disposition } = row;

    if (disposition === 'dropped') {
      const hit = C.wb.reasons.find(([re]) => re.test(s));
      if (hit) cls.push(`wb [${hit[1]}]`);
    } else {
      if (C.d.members.includes(p)) {
        cls.push('d');
        if (!C.d.evidence(text(p))) problems.push(`class (d) over-claim: ${p} names no brief`);
      }
      if (C.wc.exact.includes(p)) cls.push('wc');
      if (C.wd.members.includes(p)) {
        cls.push('wd');
        // Q-51 calls these authored. A file the diff pairs with a source
        // file is not authored, and saying so is the point of running this.
        if (disposition === 'modified') problems.push(`class (wd) over-claim: ${p} is declared authored but the diff pairs it with ${s}`);
      }
      if (C.wa.packPrefixes.some((x) => p.startsWith(x))) cls.push('wa');
      if (disposition === 'modified' && C.we.test(text(p), srcText(s))) cls.push('we');
    }

    row.classes = cls;
  }

  // US-25's greps, run over the whole pack. `provenance` is excluded by
  // the criterion itself (F5 v3.4) — see the report's note on why that
  // exclusion had to exist.
  const provLine = JSON.stringify(provenanceOf('writing'));
  for (const p of d.packPaths) {
    const t = text(p);
    for (const [needle, what] of [['/Users/', 'an absolute path'], ['AIImpactOnOrganizationsAndLeadership', "the host project's name"], ['Thomas', "the owner's name"]]) {
      if (!t.includes(needle)) continue;
      // The one declared exclusion, and it is checked rather than assumed:
      // the hit must actually be inside `provenance`.
      if (p === 'pack.json' && provLine.includes(needle)) continue;
      problems.push(`US-25: ${p} contains ${what} (${JSON.stringify(needle)})`);
    }
  }

  return { problems, notes };
}

/* ── report ───────────────────────────────────────────────────────────── */

const argv = process.argv.slice(2);
const asJson = argv.includes('--json');
const only = argv.filter((a) => !a.startsWith('--'));
const packs = (only.length ? only : ['coding', 'writing']).filter(Boolean);

const report = [];
let failed = false;

for (const name of packs) {
  const d = diff(name);
  const { problems, notes } = name === 'coding' ? classifyCoding(d) : classifyWriting(d);
  const residue = d.rows.filter((r) => r.classes.length === 0);

  const counts = {};
  for (const r of d.rows) for (const c of r.classes) counts[c.replace(/ \[.*/, '')] = (counts[c.replace(/ \[.*/, '')] ?? 0) + 1;

  report.push({
    pack: name,
    commit: d.commit,
    recordedCommit: d.prov.commit,
    source: d.prov.source ?? null,
    sourceFiles: d.srcPaths.length,
    shippedFiles: d.packPaths.length,
    differences: d.rows.length,
    dispositions: {
      dropped: d.rows.filter((r) => r.disposition === 'dropped').length,
      added: d.rows.filter((r) => r.disposition === 'added').length,
      modified: d.rows.filter((r) => r.disposition === 'modified').length,
    },
    counts,
    rows: d.rows,
    residue: residue.map((r) => ({ disposition: r.disposition, path: r.path, source: r.source })),
    problems,
    notes,
  });

  if (residue.length || problems.length) failed = true;
}

if (asJson) {
  console.log(JSON.stringify(report, null, 2));
} else {
  for (const r of report) {
    console.log(`\n═══ ${r.pack} ═══`);
    console.log(`source          ${r.source ?? '(none declared)'}`);
    console.log(`commit          ${r.recordedCommit}${r.recordedCommit === r.commit ? '' : `  → ${r.commit}`}`);
    console.log(`source files    ${r.sourceFiles}`);
    console.log(`shipped files   ${r.shippedFiles}`);
    console.log(
      `differences     ${r.differences}  (${r.dispositions.dropped} dropped, ${r.dispositions.added} added, ${r.dispositions.modified} modified)`,
    );
    console.log('\nper class:');
    for (const [c, n] of Object.entries(r.counts).sort()) console.log(`  (${c})  ${String(n).padStart(3)}`);
    console.log('\npath                                                              disposition  classes');
    for (const row of r.rows) {
      console.log(
        `  ${row.path.padEnd(62)} ${row.disposition.padEnd(11)} ${row.classes.length ? row.classes.join(' ') : '── UNPLACED ──'}`,
      );
    }
    if (r.notes.length) {
      console.log('\nnotes (covered elsewhere, not failed on):');
      for (const n of r.notes) console.log(`  · ${n}`);
    }
    if (r.problems.length) {
      console.log('\nclass-evidence failures:');
      for (const p of r.problems) console.log(`  ! ${p}`);
    }
    if (r.residue.length) {
      console.log(`\nresidue — class (j) must be empty, and holds ${r.residue.length}:`);
      for (const x of r.residue) console.log(`  ! ${x.disposition.padEnd(9)} ${x.path}`);
    }
  }
  console.log(failed ? '\nFAIL — see the unplaced paths and class-evidence failures above.' : '\nOK — every difference is placed.');
}

process.exit(failed ? 1 : 0);
