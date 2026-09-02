import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stepWriteSet } from './write-set.js';


/**
 * **NFC is mandatory, and a source basename is where it can fail.**
 *
 * A `to` is checked by the grammar gate. A name discovered by directory
 * recursion comes from the **filesystem** — and a macOS checkout can hold
 * NFD filenames. An NFD applied path would not match a Linux teammate's
 * NFC one, breaking G-F1-7 **silently**: two projects applied from the
 * same pack would differ in a way no comparison reports, because each is
 * internally consistent.
 *
 * `W-PATH-NON-NFC` had no emitter until this landed. It was read as an
 * unreachable code — `confinePath` refuses a non-NFC `to` outright — but
 * that is the **other** quantifier: this rule is about source basenames,
 * and nothing was normalizing them.
 */
test('an NFD source basename is normalized, and the author is told', () => {
  // "é" as e + combining acute (NFD) versus the precomposed character.
  const nfd = 'noteś.md';
  const r = stepWriteSet({
    step: { op: 'copy', from: 'a/', to: 'b/' },
    index: 0,
    payload: [`a/${nfd}`],
    writtenSoFar: [],
  });

  assert.deepEqual(r.bag.items.map((d: { code: string }) => d.code), ['W-PATH-NON-NFC']);
  assert.deepEqual(r.paths, [`b/${nfd.normalize('NFC')}`]);
  assert.notEqual(r.paths[0], `b/${nfd}`, 'the applied path is the normalized one');
});

test('an NFC source basename passes silently', () => {
  const r = stepWriteSet({
    step: { op: 'copy', from: 'a/', to: 'b/' },
    index: 0,
    payload: ['a/notes.md'],
    writtenSoFar: [],
  });
  assert.deepEqual(r.bag.items.map((d: { code: string }) => d.code), []);
});
