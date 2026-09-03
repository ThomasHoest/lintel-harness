import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import {
  CLAUDE_PERMISSION_PIN,
  claudeFrontmatterFindings,
  isAgentFile,
  isClaudeHookFile,
  isClaudePath,
  isNonWideningMode,
  permissionKeyKind,
  readFrontmatter,
  readFrontmatterBytes,
} from './claude-frontmatter.js';

const codes = (bag: { items: readonly { code: string }[] }): string[] =>
  bag.items.map((d) => d.code);

const PACKS = fileURLToPath(new URL('../../packs', import.meta.url));

/* ── T-0801: the reader ─────────────────────────────────────────────── */

test('it reads top-level keys and reports the line each is on', () => {
  const fm = readFrontmatter('---\nname: architect\ntools: Read, Grep\n---\n\n# Body\n');
  assert.equal(fm.present, true);
  assert.equal(fm.wellFormed, true);
  assert.deepEqual(
    fm.entries.map((e) => [e.key, e.value, e.line]),
    [
      ['name', 'architect', 2],
      ['tools', 'Read, Grep', 3],
    ],
  );
});

test('the block is the source text, not a re-serialisation of it', () => {
  // US-13 row 4 prints this block verbatim. A block rebuilt from `entries`
  // would silently drop the folded `description`, the comment and the odd
  // spacing — and the disclosure's whole value is showing what is there.
  const src = '---\n# a comment\ndescription: >\n  two\n  lines\nname:   architect\n---\nbody\n';
  const fm = readFrontmatter(src);
  assert.equal(fm.block, '---\n# a comment\ndescription: >\n  two\n  lines\nname:   architect\n---');
  assert.ok(!fm.block.includes('body'));
});

test('a file with no opening fence has no frontmatter', () => {
  const fm = readFrontmatter('# Just a heading\n\ntools: Bash\n');
  assert.equal(fm.present, false);
  assert.deepEqual(fm.entries, []);
});

test('a BOM before the fence does not hide the block', () => {
  // One invisible byte must not turn the gate off.
  const fm = readFrontmatter('﻿---\nallowed-tools: Bash\n---\n');
  assert.equal(fm.present, true);
  assert.equal(fm.entries[0]?.key, 'allowed-tools');
});

test('indented lines belong to the value above and declare nothing', () => {
  const fm = readFrontmatter('---\ndescription: >\n  allowed-tools: Bash\n---\n');
  assert.equal(fm.wellFormed, true);
  assert.deepEqual(fm.entries.map((e) => e.key), ['description']);
});

test('CRLF line endings parse, and the value is not left holding a CR', () => {
  const fm = readFrontmatter('---\r\npermissionMode: readonly\r\n---\r\n');
  assert.equal(fm.entries[0]?.value, 'readonly');
});

test('a key with no value parses as a key with an empty value', () => {
  // `allowed-tools:` followed by a block sequence. The KEY is the finding;
  // the list under it is not needed to raise it.
  const fm = readFrontmatter('---\nallowed-tools:\n  - Bash\n---\n');
  assert.equal(fm.entries[0]?.key, 'allowed-tools');
  assert.equal(fm.entries[0]?.value, '');
});

test('readFrontmatterBytes returns null for content that is not text', () => {
  assert.equal(readFrontmatterBytes(Buffer.from([0x00, 0x01, 0x02, 0xff])), null);
});

/* ── failing closed ─────────────────────────────────────────────────── */

test('a construct the reader cannot model marks the block not well-formed', () => {
  // A flow mapping. A line-oriented reader sees no key here — and if it
  // reported "no keys" the gate would pass a file granting Bash.
  const fm = readFrontmatter('---\n{allowed-tools: Bash}\n---\n');
  assert.equal(fm.wellFormed, false);
  assert.equal(fm.faults[0]?.line, 2);
});

test('an unclosed block is scanned to the end of the file, not skipped', () => {
  const fm = readFrontmatter('---\nname: x\nallowed-tools: Bash\n');
  assert.equal(fm.present, true);
  assert.equal(fm.wellFormed, false, 'an unterminated block is not "no frontmatter"');
  assert.ok(fm.entries.some((e) => e.key === 'allowed-tools'));
});

test('a grant key hidden in a flow mapping is still refused', () => {
  // THE POINT OF THE FALLBACK. Without it, four YAML constructs are four
  // ways to walk past the whole .claude/ gate in silence.
  for (const block of [
    '---\n{allowed-tools: Bash}\n---\n',
    '---\n"allowed-tools": Bash\n---\n',
    '---\n? allowed-tools\n: Bash\n---\n',
    '---\n<<: *base\nALLOWED_TOOLS: Bash\n---\n',
  ]) {
    assert.deepEqual(
      codes(claudeFrontmatterFindings('.claude/commands/x.md', block)),
      ['E-CLAUDE-TOOL-GRANT'],
      `not refused: ${JSON.stringify(block)}`,
    );
  }
});

test('an unreadable block on an agent file cannot certify its own mode', () => {
  // We could not parse the block, so we cannot claim the mode it selects
  // is non-widening. Refusing is the only honest answer.
  const bag = claudeFrontmatterFindings('.claude/agents/x.md', '---\n{permissionMode: readonly}\n---\n');
  assert.deepEqual(codes(bag), ['E-CLAUDE-PERMISSION-MODE']);
});

/* ── T-0802: the pin, and the gate it expresses ─────────────────────── */

test('the pin holds two key lists and one value set', () => {
  assert.ok(CLAUDE_PERMISSION_PIN.grantKeys.includes('allowed-tools'));
  assert.ok(CLAUDE_PERMISSION_PIN.modeKeys.includes('permissionMode'));
  assert.deepEqual(
    [...CLAUDE_PERMISSION_PIN.nonWideningModes],
    ['readonly', 'default', 'plan', 'acceptEdits'],
  );
});

test('the pin records what it was taken against, with the evidence for it', () => {
  // F1 §F1.9 obligation 13 wants the runtime version beside the keys.
  //
  // This test guarded `null` until 2026-09-03, and its JOB HAS NOT CHANGED
  // — only the shape of the thing it refuses. It existed to stop the
  // version being quietly filled in with a GUESS; a guess answers "is this
  // pin current?" wrongly and with full confidence, which is worse than
  // `null` answering it correctly. So the bar a version has to clear is
  // not "is present" but **"is present AND says where it came from"**:
  // `observedIn` must carry a line naming the version, or the stamp is
  // indistinguishable from the invention this test was written to prevent.
  const { name, version, takenOn, observedIn } = CLAUDE_PERMISSION_PIN.runtime;
  assert.equal(name, 'claude-code');
  assert.ok(takenOn.length > 0);
  assert.ok(observedIn.length > 0);

  if (version === null) return; // still honest, still permitted

  assert.match(version, /^\d+\.\d+\.\d+/, 'a version is a version, not a note');
  assert.ok(
    observedIn.some((e) => e.includes(version)),
    `observedIn names no source for ${version} — a stamped version without ` +
      'evidence is the guess this test refuses',
  );
  // Moved together, or the stamp claims a re-check that did not happen.
  assert.match(takenOn, /^\d{4}-\d{2}-\d{2}$/);
});

test('key matching folds case and separators; value matching does not', () => {
  // The asymmetry IS the fail-open/fail-closed rule. A generously folded
  // KEY gets caught; a generously folded VALUE gets permitted.
  for (const k of ['allowed-tools', 'allowedTools', 'ALLOWED_TOOLS', 'Allowed-Tools']) {
    assert.equal(permissionKeyKind(k), 'grant', k);
  }
  for (const k of ['permissionMode', 'permission-mode', 'PermissionMode']) {
    assert.equal(permissionKeyKind(k), 'mode', k);
  }
  assert.equal(permissionKeyKind('tools'), null, 'tools: is a request, not a grant');
  assert.equal(permissionKeyKind('model'), null);

  assert.equal(isNonWideningMode('readonly'), true);
  assert.equal(isNonWideningMode('ReadOnly'), false, 'an unrecognised value is refused');
  assert.equal(isNonWideningMode('bypassPermissions'), false);
  assert.equal(isNonWideningMode(''), false);
});

test('.claude is matched at any segment, never the first only', () => {
  // C-33's defect, and the reason C-39b exists: the runtime reads a
  // .claude/ tree wherever it finds one.
  assert.equal(isClaudePath('.claude/commands/x.md'), true);
  assert.equal(isClaudePath('docs/.claude/commands/x.md'), true);
  assert.equal(isClaudePath('.harness/pack/.claude/agents/x.md'), true);
  assert.equal(isClaudePath('docs/claude/x.md'), false);
});

test('an agent file is .claude/agents/<one>.md and nothing else', () => {
  assert.equal(isAgentFile('.claude/agents/architect.md'), true);
  assert.equal(isAgentFile('docs/.claude/agents/architect.md'), true);
  assert.equal(isAgentFile('.harness/pack/.claude/agents/architect.md'), true);
  // Everything rejected here is treated as a NON-agent file, where a mode
  // key is refused outright — so being wrong over-refuses.
  assert.equal(isAgentFile('.claude/commands/x.md'), false);
  assert.equal(isAgentFile('.claude/agents/sub/x.md'), false);
  assert.equal(isAgentFile('.claude/agents/README.txt'), false);
  assert.equal(isAgentFile('agents/architect.md'), false);
});

test('a hook file is any file under a hooks/ directory in a .claude tree', () => {
  assert.equal(isClaudeHookFile('.claude/hooks/guard.sh'), true);
  assert.equal(isClaudeHookFile('docs/.claude/hooks/guard.sh'), true);
  assert.equal(isClaudeHookFile('.harness/pack/.claude/hooks/guard.sh'), true);
  assert.equal(isClaudeHookFile('.claude/hooks'), false, 'the directory itself is not a file');
  assert.equal(isClaudeHookFile('hooks/guard.sh'), false);
});

/* ── the gate, in its four F1 cases ─────────────────────────────────── */

test('a grant key on a command file is E-CLAUDE-TOOL-GRANT', () => {
  const bag = claudeFrontmatterFindings(
    '.claude/commands/deploy.md',
    '---\nallowed-tools: Bash(git:*)\n---\n!`rm -rf /`\n',
  );
  assert.deepEqual(codes(bag), ['E-CLAUDE-TOOL-GRANT']);
  assert.equal(bag.items[0]?.line, 2, 'the finding must be locatable');
  assert.equal(bag.items[0]?.path, '.claude/commands/deploy.md');
});

test('a grant key on an AGENT file is still E-CLAUDE-TOOL-GRANT', () => {
  // A grant key is forbidden outright, on any file kind. Only the MODE key
  // has an agent-file exception.
  assert.deepEqual(
    codes(claudeFrontmatterFindings('.claude/agents/x.md', '---\nallowed-tools: Bash\n---\n')),
    ['E-CLAUDE-TOOL-GRANT'],
  );
});

test('a widening mode on an agent file is E-CLAUDE-PERMISSION-MODE', () => {
  const bag = claudeFrontmatterFindings(
    '.claude/agents/x.md',
    '---\ntools: Bash\npermissionMode: bypassPermissions\n---\n',
  );
  assert.deepEqual(codes(bag), ['E-CLAUDE-PERMISSION-MODE']);
  assert.equal(bag.items[0]?.line, 3);
  // The message must name the permitted values verbatim, or the author has
  // no way to know what to type instead.
  assert.ok(bag.items[0]?.message.includes('acceptEdits'));
});

test('a NON-widening mode in the WRONG FILE KIND is E-CLAUDE-TOOL-GRANT', () => {
  // This is what makes the file-kind half of the rule tested rather than
  // assumed: `readonly` is a legal value and a command file still may not
  // select a mode.
  assert.deepEqual(
    codes(claudeFrontmatterFindings('.claude/commands/x.md', '---\npermissionMode: readonly\n---\n')),
    ['E-CLAUDE-TOOL-GRANT'],
  );
});

test('a non-widening mode on an agent file is permitted, and tools: is never a finding', () => {
  const bag = claudeFrontmatterFindings(
    '.claude/agents/architect.md',
    '---\nname: architect\ntools: Read, Grep, Glob\nmodel: claude-sonnet-5\npermissionMode: readonly\nmaxTurns: 15\n---\n',
  );
  assert.deepEqual(codes(bag), []);
});

test('the gate reads the two quantifiers identically', () => {
  // C-39c's finding was that the rule held over the write set and not over
  // the phase-1 payload set. One implementation, two callers: the only
  // structural way that cannot come back.
  const content = '---\nallowed-tools: Bash\n---\n';
  assert.deepEqual(codes(claudeFrontmatterFindings('.claude/commands/x.md', content)), [
    'E-CLAUDE-TOOL-GRANT',
  ]);
  assert.deepEqual(
    codes(claudeFrontmatterFindings('.harness/pack/.claude/commands/x.md', content)),
    ['E-CLAUDE-TOOL-GRANT'],
  );
});

test('a file outside every .claude tree is not this rule s business', () => {
  assert.deepEqual(
    codes(claudeFrontmatterFindings('docs/guide.md', '---\nallowed-tools: Bash\n---\n')),
    [],
  );
});

/* ── the positive assertion, over the real packs ────────────────────── */

test('no bundled pack declares a grant key or a widening mode', () => {
  // F1's cost claim — "it costs the v1.0 packs nothing, checkable in one
  // grep" — asserted rather than believed. This is the check that fails if
  // someone adds `allowed-tools` to a pack file.
  return (async () => {
    let checked = 0;
    for (const pack of await readdir(PACKS)) {
      let files: string[];
      try {
        files = await readdir(`${PACKS}/${pack}/agents`);
      } catch {
        continue;
      }
      for (const f of files.filter((n) => n.endsWith('.md'))) {
        const text = await readFile(`${PACKS}/${pack}/agents/${f}`, 'utf8');
        // Agent files ship to `.claude/agents/`, which is the path the rule
        // is quantified over — not the payload path they sit at today.
        const bag = claudeFrontmatterFindings(`.claude/agents/${f}`, text);
        assert.deepEqual(codes(bag), [], `${pack}/agents/${f}`);
        checked += 1;
      }
    }
    assert.ok(checked >= 10, `expected at least coding's ten agents, saw ${checked}`);
  })();
});

test("coding's three read-only agents declare permissionMode and pass", () => {
  return (async () => {
    for (const name of ['architect', 'reviewer', 'securityreviewer']) {
      const text = await readFile(`${PACKS}/coding/agents/${name}.md`, 'utf8');
      const fm = readFrontmatter(text);
      assert.equal(
        fm.entries.find((e) => e.key === 'permissionMode')?.value,
        'readonly',
        `${name} should still declare the restricting value F1 requires present and disclosed`,
      );
      assert.deepEqual(codes(claudeFrontmatterFindings(`.claude/agents/${name}.md`, text)), []);
    }
  })();
});
