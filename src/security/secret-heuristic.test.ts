import { test } from 'node:test';
import assert from 'node:assert/strict';
import { declarationLooksSecret, valueLooksSecret } from './secret-heuristic.js';
import { renderText } from '../diag/catalogue.js';

test('a credential-named parameter is caught by id or by prompt', () => {
  for (const id of ['apiKey', 'api_key', 'API-KEY', 'privateKey', 'secret', 'authToken',
                    'password', 'passwrd', 'credential', 'connectionString', 'connection_string']) {
    assert.equal(declarationLooksSecret({ id, prompt: 'x' }), true, id);
  }
  assert.equal(declarationLooksSecret({ id: 'x', prompt: 'Your api_key' }), true, 'prompt too');
});

/**
 * The matcher's separators are NOT uniform, and this pins the actual
 * behaviour rather than the behaviour one would assume.
 *
 * `connection.?string` accepts any single separator, so "connection
 * string" matches. `api[_-]?key` and `private[_-]?key` accept only `_`
 * or `-`, so **"API key" and "private key" with a SPACE do not match** —
 * which are the most natural things to write in a prompt.
 *
 * Recorded as F1 known limit 19 rather than widened here: broadening a
 * ban changes which packs are refused, and that is a decision for the
 * spec, not for the module implementing it. The `id` still catches the
 * realistic case, since a parameter holding an API key is very unlikely
 * to be named something else entirely.
 */
test('the separator rule is inconsistent between entries, and that is pinned', () => {
  assert.equal(declarationLooksSecret({ id: 'x', prompt: 'connection string' }), true);
  assert.equal(declarationLooksSecret({ id: 'x', prompt: 'Your API key' }), false,
    'known limit 19: [_-]? does not admit a space');
  assert.equal(declarationLooksSecret({ id: 'x', prompt: 'private key' }), false,
    'known limit 19');
  // The realistic evasion needs BOTH an innocuous id and a spaced prompt.
  assert.equal(declarationLooksSecret({ id: 'apiKey', prompt: 'Your API key' }), true);
});

// C-15's considered omission. A ban that fires on ordinary words is one
// authors learn to switch off, which costs more than it saves.
test('a bare "key" deliberately does not match', () => {
  for (const id of ['monkey', 'keyword', 'sortKey', 'key', 'keyboard']) {
    assert.equal(declarationLooksSecret({ id, prompt: 'x' }), false, id);
  }
});

test('ordinary parameters are not caught', () => {
  for (const id of ['projectName', 'stack', 'constraintFloor', 'author']) {
    assert.equal(declarationLooksSecret({ id, prompt: id }), false, id);
  }
});

// notASecret is one of the five boolean-typed fields for exactly this
// reason: "no" is truthy in JavaScript, so a typo would have disabled the
// ban entirely (C-34). Only a real `true` may switch it off.
test('only a literal true switches the ban off', () => {
  assert.equal(declarationLooksSecret({ id: 'apiKey', notASecret: true }), false);
  assert.equal(declarationLooksSecret({ id: 'apiKey', notASecret: false }), true);
  assert.equal(declarationLooksSecret({ id: 'apiKey' }), true);
  // A string would never reach here — the schema refuses it — but the
  // guard is `=== true` rather than truthiness, so it holds anyway.
  assert.equal(
    declarationLooksSecret({ id: 'apiKey', notASecret: 'no' as unknown as boolean }),
    true,
    'a truthy string must not disable a security gate',
  );
});

test('a value with a real credential prefix is flagged', () => {
  for (const v of ['-----BEGIN RSA PRIVATE KEY-----', 'sk-abc123', 'ghp_abcdef', 'xoxb-1-2-3']) {
    assert.equal(valueLooksSecret(v), true, v);
  }
});

test('40+ characters of base64url is flagged — the one heuristic entry', () => {
  assert.equal(valueLooksSecret('a'.repeat(40)), true);
  assert.equal(valueLooksSecret('a'.repeat(39)), false, 'below the threshold');
  assert.equal(valueLooksSecret('a'.repeat(60) + ' with spaces'), false, 'not base64url');
});

test('ordinary answers are not flagged', () => {
  for (const v of ['Acme Corporation', 'high-floor', 'my-project', '1.0.0', '']) {
    assert.equal(valueLooksSecret(v), false, JSON.stringify(v));
  }
});

// The message must say WHY, and the why is the whole design: the manifest
// is committed, so an answer is as public as the repository.
test('the ban explains that the manifest is committed', () => {
  const msg = renderText('E-PARAM-SECRET-SUSPECTED', { id: 'apiKey' });
  assert.ok(/manifest/i.test(msg), msg);
  assert.ok(/commit|version control|public/i.test(msg), 'must state why it is fatal');
});
