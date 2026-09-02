/**
 * F6 E-27 -- T-2707. The instruction-level checks that can be automated
 * without a model.
 *
 * Cheap, mechanical, and precisely what it claims to be: a string
 * comparison against a known list, never a semantic check of what
 * `SKILL.md` says to do with a command or flag once named. The Mode A
 * review's M-3 finding is on point here (`security-review-mode-a-F2-F3-F6.md`
 * section 8): *"Comparing a normalization rule written in English to one
 * written in code is not the same kind of check"* -- this file only ever
 * does the mechanical half, and does not claim to do the other.
 *
 * `CLAUDE.md` appears throughout `SKILL.md` and both reference files --
 * unavoidably, since the skill's whole job in Flow A is partly about
 * generating and later adapting that file. The command-string and
 * flag-pairing checks below therefore carry an explicit exemption for
 * the literal text `CLAUDE.md`, with this comment as the reason: it is
 * pack-produced CONTENT the skill talks about, not a CLI command or flag
 * the skill is telling an agent to run.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { COMMANDS, accepts, isCommand } from '../../dist/index.js';

const SKILL_MD = fileURLToPath(new URL('../../skill/SKILL.md', import.meta.url));
const REF_INIT = fileURLToPath(new URL('../../skill/reference/init.md', import.meta.url));
const REF_UPDATE = fileURLToPath(new URL('../../skill/reference/update.md', import.meta.url));

async function readAll(): Promise<{ readonly name: string; readonly text: string }[]> {
  const files = [
    { name: 'SKILL.md', path: SKILL_MD },
    { name: 'reference/init.md', path: REF_INIT },
    { name: 'reference/update.md', path: REF_UPDATE },
  ];
  return Promise.all(files.map(async (f) => ({ name: f.name, text: await readFile(f.path, 'utf8') })));
}

/* ── no permission-bearing frontmatter key ──────────────────────────── */

test('SKILL.md declares no permission-bearing frontmatter key', async () => {
  const text = await readFile(SKILL_MD, 'utf8');
  const lines = text.split('\n');
  assert.equal(lines[0], '---', 'SKILL.md must open with a frontmatter block');
  const close = lines.indexOf('---', 1);
  assert.ok(close > 0, 'SKILL.md must close its frontmatter block');
  const frontmatter = lines.slice(0, close + 1).join('\n');

  // The same keys C-53/C-32a police in a PACK's frontmatter -- the skill
  // itself must not carry any of them either.
  assert.ok(!/^\s*allowed-tools:/m.test(frontmatter), 'SKILL.md must not declare allowed-tools');
  assert.ok(!/^\s*permissionMode:/m.test(frontmatter), 'SKILL.md must not declare permissionMode');
  assert.ok(!/^\s*tools:/m.test(frontmatter), 'SKILL.md must not declare tools');
});

/* ── every `lintel harness <command>` string exists ─────────────────── */

test('every "lintel harness <command>" string SKILL.md and its reference files name exists in COMMANDS', async () => {
  const files = await readAll();
  const named = new Set<string>();
  for (const { text } of files) {
    for (const m of text.matchAll(/lintel harness ([a-z][a-z-]*)/g)) named.add(m[1] as string);
  }
  assert.ok(named.size > 0, 'no "lintel harness <command>" strings found -- the pattern is wrong');

  for (const command of named) {
    assert.ok(
      (COMMANDS as readonly string[]).includes(command),
      `SKILL.md or a reference file names "lintel harness ${command}", which is not in COMMANDS`,
    );
  }
});

/* ── every flag SKILL.md pairs with a command is accepted by it ───────── */

/**
 * A crude but honest pairing: within each fenced code block containing
 * `lintel harness <command>`, every `--flag` token on the SAME line is
 * paired with that command. Good enough for THIS product's skill files,
 * whose command lines are short and single-line by construction (the
 * "show the user the command line you ran" rule in `SKILL.md` section 3
 * step 8), and it is what makes this a mechanical string check rather
 * than a parser for prose.
 */
function flagPairingsOn(line: string): { readonly command: string; readonly flags: readonly string[] } | null {
  const cmd = /lintel harness ([a-z][a-z-]*)/.exec(line);
  if (cmd === null) return null;
  const flags = [...line.matchAll(/--([a-z][a-z-]*)/g)].map((m) => m[1] as string);
  return { command: cmd[1] as string, flags };
}

test('every flag SKILL.md pairs with a command on one line is accepted by that command', async () => {
  const files = await readAll();
  let pairsChecked = 0;

  for (const { name, text } of files) {
    for (const line of text.split('\n')) {
      const pairing = flagPairingsOn(line);
      if (pairing === null || pairing.flags.length === 0) continue;
      // `--version` is `lintel`'s own global flag, checked in section 0,
      // never a `harness <command>` flag -- excluded because it is not a
      // real command and pairing with a command line here would be a
      // false positive of this test's own making, not a real drift.
      if (!isCommand(pairing.command)) continue;

      for (const flag of pairing.flags) {
        assert.ok(
          accepts(pairing.command, flag),
          `${name}: "--${flag}" paired with "${pairing.command}" on the line:\n  ${line}`,
        );
        pairsChecked += 1;
      }
    }
  }

  assert.ok(pairsChecked > 0, 'no flag/command pairings found on one line -- the pairing heuristic found nothing to check');
});

/**
 * `CLAUDE.md` cannot be excluded from the command-name scan by the same
 * regex trick as flags (it has no leading `--`), so it is exempted
 * explicitly here rather than silently swallowed by the pattern above.
 * `CLAUDE.md` never matches `lintel harness [a-z][a-z-]*` (no such
 * substring precedes it anywhere in the skill files) -- this test pins
 * that fact, so a future edit that DOES produce a false match is caught
 * rather than silently exempted forever.
 */
test('CLAUDE.md is never mistaken for a "lintel harness" command by the checks above', async () => {
  const files = await readAll();
  for (const { name, text } of files) {
    assert.ok(
      !/lintel harness [a-z-]*CLAUDE\.md/i.test(text),
      `${name}: CLAUDE.md appears to be parsed as part of a command string`,
    );
  }
});
