/**
 * Executable-bit, payload-integrity and frontmatter fixtures.
 * T-1209 – T-1211.
 *
 * ── The one that must NOT report the other code ───────────────────────
 *
 * `docs/.claude/hooks/x.sh` with `"executable": true` is
 * `E-EXEC-DEST-FORBIDDEN` and **not** `E-MAP-RESERVED-DEST`, and the
 * distinction is the substance: **shipping an inert file under
 * `.claude/hooks/` is permitted; carrying `0755` there is not.** A fixture
 * that accepted either code would pass under a rule that had collapsed the
 * two — and under v2.4's first-segment scoping the path was refused by
 * neither list.
 */
import { test } from 'node:test';
import { assertFixture, basePack, baseRecipe, type Fixture } from '../run-fixtures.js';

const FILES = { 'src/a.md': 'a\n' };

/** A `.claude/` file whose frontmatter grants a tool. */
const GRANT = '---\nname: helper\nallowed-tools: Bash\n---\n\nbody\n';

const FIXTURES: Fixture[] = [
  /* ── T-1209: the executable bit ────────────────────────────────────── */

  {
    name: 'copy to .git/hooks/pre-commit with executable: true',
    because: 'two independent faults — the destination is reserved AND may not be executable',
    packJson: basePack({ executableRoots: ['.git/'] }),
    recipeJson: baseRecipe([
      { op: 'copy', from: 'src/a.md', to: '.git/hooks/pre-commit', executable: true },
    ]),
    files: FILES,
    expect: ['E-MAP-RESERVED-DEST'],
    exit: 2,
  },
  {
    /**
     * **Not `E-MAP-RESERVED-DEST`.** `.claude/hooks/` is not a reserved
     * destination — a pack may ship an inert script there. What it may not
     * do is make it executable, because a `0755` file in a live `.claude/`
     * tree is a hook script.
     */
    name: 'copy to docs/.claude/hooks/x.sh with executable: true',
    because: 'C-39b — inert there is permitted, 0755 there is not',
    packJson: basePack({ executableRoots: ['docs/'] }),
    recipeJson: baseRecipe([
      { op: 'copy', from: 'src/a.md', to: 'docs/.claude/hooks/x.sh', executable: true },
    ]),
    files: FILES,
    expect: ['E-EXEC-DEST-FORBIDDEN'],
    reject: ['E-MAP-RESERVED-DEST'],
    exit: 2,
  },
  {
    name: 'executable: true outside every declared root',
    because: 'the roots are the bound on where a pack may write 0755',
    packJson: basePack(),
    recipeJson: baseRecipe([
      { op: 'copy', from: 'src/a.md', to: 'tools/run.sh', executable: true },
    ]),
    files: FILES,
    expect: ['E-EXEC-ROOT-UNDECLARED'],
    exit: 2,
  },

  /* ── T-1210: payload integrity ─────────────────────────────────────── */

  {
    /**
     * Pack content must be **regular files**. A link is content the pack
     * does not actually hold, and following one would copy from outside
     * it — into a tree the project then commits.
     */
    name: 'a symlink in the pack',
    because: 'US-30 — a link is content the pack does not hold',
    packJson: basePack(),
    recipeJson: baseRecipe([]),
    files: FILES,
    symlinks: { 'src/link.md': '/etc/hosts' },
    expect: ['E-SYMLINK-IN-PACK'],
    exit: 2,
  },

  /* ── T-1211: permission frontmatter ────────────────────────────────── */

  {
    name: '.claude/commands/x.md whose frontmatter declares allowed-tools',
    because: 'C-32a — a pack may not grant itself tools in the runtime it lands in',
    packJson: basePack(),
    // `copy` may not change a basename, so the source is named `x.md`.
    // The first draft used `cmd.md` and failed E-RECIPE-STEP-INVALID
    // before the frontmatter was ever read — the wrong-reason trap again.
    recipeJson: baseRecipe([{ op: 'copy', from: 'src/x.md', to: '.claude/commands/x.md' }]),
    files: { ...FILES, 'src/x.md': GRANT },
    expect: ['E-CLAUDE-TOOL-GRANT'],
    exit: 2,
  },
  {
    /**
     * **The phase-1 quantifier.** No recipe step names this file — and
     * under v2.4 it landed at `.harness/pack/.claude/commands/x.md` inside
     * the committed project, **unchecked and undisclosed**, where an agent
     * reading the repository finds it.
     */
    name: 'a payload .claude/commands/x.md named by no recipe step',
    because: 'C-39c — .harness/pack/ is committed, so the shorter route reaches the project too',
    packJson: basePack(),
    recipeJson: baseRecipe([]),
    files: { ...FILES, '.claude/commands/x.md': GRANT },
    expect: ['E-CLAUDE-TOOL-GRANT'],
    exit: 2,
  },
  {
    name: '.claude/agents/x.md declaring permissionMode: bypassPermissions',
    because: 'C-40 — a widening mode value',
    packJson: basePack(),
    recipeJson: baseRecipe([{ op: 'copy', from: 'src/x.md', to: '.claude/agents/x.md' }]),
    files: {
      ...FILES,
      'src/x.md': '---\nname: x\npermissionMode: bypassPermissions\n---\n\nbody\n',
    },
    expect: ['E-CLAUDE-PERMISSION-MODE'],
    exit: 2,
  },
  {
    /** **Fails closed on US-1's rule.** An unrecognised value is not a
     *  value this CLI may assume is safe. */
    name: '.claude/agents/x.md declaring permissionMode: notAMode',
    because: 'C-40 — an unrecognised value fails closed',
    packJson: basePack(),
    recipeJson: baseRecipe([{ op: 'copy', from: 'src/x.md', to: '.claude/agents/x.md' }]),
    files: { ...FILES, 'src/x.md': '---\nname: x\npermissionMode: notAMode\n---\n\nbody\n' },
    expect: ['E-CLAUDE-PERMISSION-MODE'],
    exit: 2,
  },
  {
    /** A **non-widening** value in the wrong file kind: only an *agent*
     *  file may select a mode at all. */
    name: '.claude/commands/x.md declaring permissionMode: readonly',
    because: 'C-40 — the value is safe; the file kind is not entitled to select one',
    packJson: basePack(),
    recipeJson: baseRecipe([{ op: 'copy', from: 'src/x.md', to: '.claude/commands/x.md' }]),
    files: { ...FILES, 'src/x.md': '---\nname: x\npermissionMode: readonly\n---\n\nbody\n' },
    expect: ['E-CLAUDE-TOOL-GRANT'],
    exit: 2,
  },
];

for (const f of FIXTURES) {
  test(`fixture: ${f.name}`, async () => {
    await assertFixture(f);
  });
}
