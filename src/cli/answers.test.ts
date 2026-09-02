import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveAnswers } from './answers.js';
import type { Answer } from '../pack/parameters.js';
import type { ParameterDecl } from '../pack/types.js';

/**
 * The resolution order, exhaustively, **with no terminal**.
 *
 * A precedence bug here produces a valid manifest recording the wrong
 * answer, an applied tree that is internally consistent and a `verify`
 * that passes — nothing downstream can catch it, which is why the order
 * gets its own module and its own file.
 */

const str = (over: Partial<ParameterDecl> = {}): ParameterDecl => ({
  id: 'projectName',
  prompt: 'What is the project called?',
  type: 'string',
  pattern: '^.{1,64}$',
  ...over,
});

const enumP = (over: Partial<ParameterDecl> = {}): ParameterDecl => ({
  id: 'floor',
  prompt: 'Which floor?',
  type: 'enum',
  values: ['high', 'low'],
  ...over,
});

const boolP = (over: Partial<ParameterDecl> = {}): ParameterDecl => ({
  id: 'ship',
  prompt: 'Ship it?',
  type: 'boolean',
  ...over,
});

const run = async (
  declarations: readonly ParameterDecl[],
  set: readonly string[] = [],
  prompt: Parameters<typeof resolveAnswers>[1] = null,
): Promise<{ answers: ReadonlyMap<string, Answer>; codes: string[] }> => {
  const r = await resolveAnswers(
    {
      declarations,
      set,
      packName: 'demo',
      packVersion: '1.0.0',
      declaredIds: declarations.map((d) => d.id),
    },
    prompt,
  );
  return { answers: r.answers, codes: r.bag.items.map((d) => d.code) };
};

/* ── each step wins over every step below it ─────────────────────────── */

test('--set beats a prompt, a default and the empty value', async () => {
  const r = await run(
    [str({ default: 'from-default' })],
    ['projectName=from-set'],
    async () => 'from-prompt',
  );
  assert.deepEqual(r.codes, []);
  assert.equal(r.answers.get('projectName'), 'from-set');
});

test('a prompt beats a default, and an empty line accepts the default', async () => {
  const asked = await run([str({ default: 'from-default' })], [], async () => 'typed');
  assert.equal(asked.answers.get('projectName'), 'typed');

  // US-43: an empty line is *accept the default*, not the empty answer.
  const empty = await run([str({ default: 'from-default' })], [], async () => null);
  assert.deepEqual(empty.codes, []);
  assert.equal(empty.answers.get('projectName'), 'from-default');
});

test('a default is recorded verbatim, not inherited', async () => {
  // F1 US-8: an unrecorded default makes the applied tree
  // non-recomputable the moment the pack's default changes.
  const r = await run([str({ default: 'demo' })]);
  assert.equal(r.answers.get('projectName'), 'demo');
});

test('a required parameter with no answer and no default is E-PARAM-MISSING', async () => {
  const r = await run([str({ required: true })]);
  assert.deepEqual(r.codes, ['E-PARAM-MISSING']);
  assert.equal(r.answers.has('projectName'), false);
});

/* ── steps 1 and 2 are ONE precedence level ──────────────────────────── */

test('two argv answers that disagree are E-PARAM-INVALID, whichever form carried them', async () => {
  // The parser resolves an alias into the same `<id>=<value>` token
  // `--set` produces, so by the time resolution sees them there is no way
  // to prefer one — which is exactly what F1 US-8 asks for.
  const r = await run([str()], ['projectName=a', 'projectName=b']);
  assert.deepEqual(r.codes, ['E-PARAM-INVALID']);
});

test('the same value twice is the same request and exits clean', async () => {
  const r = await run([str()], ['projectName=a', 'projectName=a']);
  assert.deepEqual(r.codes, []);
  assert.equal(r.answers.get('projectName'), 'a');
});

/* ── Q-66 ────────────────────────────────────────────────────────────── */

test('an unknown --set id is E-SET-UNKNOWN-PARAM, not E-PARAM-INVALID', async () => {
  // The fault is the *id*, and `E-PARAM-INVALID`'s message is about a
  // value — it would send the user to fix the wrong half of what they
  // typed.
  const r = await run([str()], ['nosuch=a']);
  assert.deepEqual(r.codes, ['E-SET-UNKNOWN-PARAM']);
});

test("a parameter of an UNSELECTED scaffold counts as declared", async () => {
  // The id exists in `pack.json`; the user's mistake is selection, not
  // naming. `declarations` holds only the selected set, `declaredIds`
  // holds the pack's whole set, and only the second decides this.
  const r = await resolveAnswers(
    {
      declarations: [str()],
      set: ['scaffoldOnly=x'],
      packName: 'demo',
      packVersion: '1.0.0',
      declaredIds: ['projectName', 'scaffoldOnly'],
    },
    null,
  );
  assert.deepEqual(
    r.bag.items.map((d) => d.code),
    [],
    'the id is declared, so it is not an unknown-parameter fault',
  );
  assert.equal(r.answers.has('scaffoldOnly'), false, 'and it is not recorded either');
});

/* ── Q-65's three type cases ─────────────────────────────────────────── */

test('an optional undefaulted string records the empty value', async () => {
  const r = await run([str({ pattern: '^.{0,64}$' })]);
  assert.deepEqual(r.codes, []);
  assert.equal(r.answers.get('projectName'), '');
});

test('an optional undefaulted boolean records false', async () => {
  const r = await run([boolP()]);
  assert.deepEqual(r.codes, []);
  assert.equal(r.answers.get('ship'), false);
});

test('an optional undefaulted enum is E-PARAM-UNANSWERABLE, terminal or not', async () => {
  // An enum has no empty value, and inventing one selects a branch nobody
  // authorised. It fires with a terminal too: an empty line at a prompt
  // for an undefaulted enum is the same position as having no terminal.
  const headless = await run([enumP()]);
  assert.deepEqual(headless.codes, ['E-PARAM-UNANSWERABLE']);

  const withTty = await run([enumP()], [], async () => null);
  assert.deepEqual(withTty.codes, ['E-PARAM-UNANSWERABLE']);
});

/* ── validation is identical from a flag and from a prompt ───────────── */

test('an invalid answer is E-PARAM-INVALID from either entry point, with no retry', async () => {
  const flagged = await run([enumP()], ['floor=middle']);
  assert.deepEqual(flagged.codes, ['E-PARAM-INVALID']);

  let asks = 0;
  const prompted = await run([enumP()], [], async () => {
    asks += 1;
    return 'middle';
  });
  assert.deepEqual(prompted.codes, ['E-PARAM-INVALID']);
  assert.equal(asks, 1, 'the first failing answer is the diagnostic, not a re-prompt');
});

test('a failing answer is not recorded', async () => {
  const r = await run([enumP()], ['floor=middle']);
  assert.equal(r.answers.has('floor'), false);
});

/* ── boolean coercion, which both entry points need ──────────────────── */

test('a boolean alias arrives as the string "true" and is recorded as a boolean', async () => {
  // `aliasesFor` turns a bare boolean alias into the literal token
  // `<id>=true`, so without coercion every boolean alias would be
  // `E-PARAM-INVALID`.
  const r = await run([boolP()], ['ship=true']);
  assert.deepEqual(r.codes, []);
  assert.equal(r.answers.get('ship'), true);
});

test('a boolean given something that is neither is E-PARAM-INVALID, never guessed', async () => {
  const r = await run([boolP()], ['ship=maybe']);
  assert.deepEqual(r.codes, ['E-PARAM-INVALID']);
});

/* ── order and quantifier ────────────────────────────────────────────── */

test('answers are recorded in declared order, which is the manifest order', async () => {
  const r = await run(
    [str({ id: 'a', default: '1' }), str({ id: 'b', default: '2' }), str({ id: 'c', default: '3' })],
    ['c=x'],
  );
  assert.deepEqual([...r.answers.keys()], ['a', 'b', 'c']);
});

test('a credential-looking answer warns and does not stop the apply', async () => {
  const r = await run([str({ pattern: '^.{1,200}$' })], [`projectName=${'A'.repeat(60)}=`]);
  assert.ok(r.codes.every((c) => c.startsWith('W-')), `expected warnings only, got ${r.codes.join()}`);
  assert.ok(r.answers.has('projectName'), 'the apply proceeds with the answer');
});

test('nothing reads stdin when the prompt is null', async () => {
  // The whole non-interactive path, structurally: `answers.ts` never asks
  // whether it may prompt, it is handed one or it is not.
  const r = await run([str({ required: true }), boolP()], [], null);
  assert.deepEqual(r.codes, ['E-PARAM-MISSING']);
  assert.equal(r.answers.get('ship'), false);
});
