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

/**
 * **An empty default must announce itself.**
 *
 * `"default": ""` is a real declaration — `coding`'s `stack` uses one —
 * and it used to render as a bare label with nothing after it:
 *
 *     Primary stack, one line (appears in CLAUDE.md)
 *       default
 *     >
 *
 * The first user of the published 0.1.0 read that as a hang and pressed
 * Ctrl+C. Nothing on screen said the CLI was waiting for them rather than
 * stuck, and nothing said Enter was a valid answer. Pressing Enter would
 * in fact have completed the apply — which makes this a pure presentation
 * defect, and the most expensive kind: the tool worked and the user could
 * not tell.
 */
test('an empty default is announced, never rendered as an empty label', () => {
  const q = promptQuery({
    id: 'stack',
    prompt: 'Primary stack',
    type: 'string',
    default: '',
  } as ParameterDecl);

  assert.match(q, /optional/, 'it must say the field can be skipped');
  assert.match(q, /Enter/, 'and name the key that skips it');
  assert.ok(
    !/default\s*\n/.test(q),
    `"default" must never be followed by nothing:\n${q}`,
  );
});

test('a non-empty default is still shown as a value', () => {
  const q = promptQuery({ id: 'x', prompt: 'Something', type: 'string', default: 'node' } as ParameterDecl);
  assert.match(q, /default node/, 'a real default reads as before');
  assert.ok(!/optional/.test(q), 'and is not described as optional');
});
