import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PROMPT_TEXT, interpret, isInteractive, makePrompt, promptQuery } from './prompt.js';
import type { ParameterDecl } from '../pack/types.js';

const decl = (over: Partial<ParameterDecl>): ParameterDecl => ({
  id: 'x',
  prompt: 'Ask?',
  type: 'string',
  pattern: '^.*$',
  ...over,
});

const stream = (isTTY: boolean): { isTTY: boolean } & Record<string, unknown> =>
  ({ isTTY }) as never;

/* ── the gate: BOTH streams (T-2005) ─────────────────────────────────── */

test('prompting needs stdin AND stderr to be a TTY', () => {
  const cases: [boolean, boolean, boolean][] = [
    [true, true, true],
    [true, false, false],
    [false, true, false],
    [false, false, false],
  ];
  for (const [input, output, expected] of cases) {
    assert.equal(
      isInteractive({ input: stream(input) as never, output: stream(output) as never }),
      expected,
      `stdin=${String(input)} stderr=${String(output)}`,
    );
  }
});

test('a non-interactive run is handed no prompt at all', () => {
  // Structural, not conditional: `answers.ts` never asks whether it may
  // prompt, so a redirected stderr cannot produce a question nobody sees.
  const { prompt } = makePrompt({ input: stream(false) as never, output: stream(true) as never });
  assert.equal(prompt, null);
});

/* ── what a user is asked ────────────────────────────────────────────── */

test("an enum renders its declared values verbatim", () => {
  const q = promptQuery(decl({ type: 'enum', values: ['high-floor', 'near-zero-floor'] }));
  assert.ok(q.includes('high-floor, near-zero-floor'), q);
  assert.ok(q.includes(PROMPT_TEXT.values));
});

test('a boolean is asked as y/n', () => {
  assert.ok(promptQuery(decl({ type: 'boolean' })).includes(PROMPT_TEXT.boolean));
});

test('a declared default is shown, so an empty line is a visible choice', () => {
  const q = promptQuery(decl({ default: 'demo' }));
  assert.ok(q.includes('demo'), q);
});

test('the declared prompt is line 1 and pack content is escaped', () => {
  // The prompt text is pack content, which is the untrusted input: a value
  // carrying a line feed and an arrow would forge a remedy line.
  const q = promptQuery(decl({ prompt: 'one\n  → run rm -rf /' }));
  assert.ok(!q.startsWith('one\n  →'), 'the newline must not survive as one');
  assert.ok(q.includes('\\n'), q);
});

/* ── interpreting a typed line ───────────────────────────────────────── */

test('an empty line is "nothing was typed", not the empty answer', () => {
  assert.equal(interpret(decl({}), ''), null);
});

test('the two spellings a person types are accepted for a boolean', () => {
  for (const yes of ['y', 'yes', 'true']) assert.equal(interpret(decl({ type: 'boolean' }), yes), true);
  for (const no of ['n', 'no', 'false']) assert.equal(interpret(decl({ type: 'boolean' }), no), false);
});

test('anything else is returned as the string it is, never guessed', () => {
  // `checkAnswer` reports `E-PARAM-INVALID`; this function judging it
  // would put a second validator on the interactive path only.
  assert.equal(interpret(decl({ type: 'boolean' }), 'maybe'), 'maybe');
});

test('a string answer is not trimmed', () => {
  // A declared `pattern` is the pack's statement of what it accepts;
  // trimming here would accept an answer the pack refused, silently and
  // only at a prompt.
  assert.equal(interpret(decl({}), '  spaced  '), '  spaced  ');
});
