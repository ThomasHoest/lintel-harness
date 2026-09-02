/**
 * Drift guard and shape rules for the message catalogue. T-0104, T-0113.
 *
 * Same principle as `codes.test.ts`: F1 §Error States is authoritative and
 * this module is a projection, so the templates are re-derived here on
 * every run. If it fails, change the spec first.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { CODES, type DiagnosticCode } from './codes.js';

const ALL_CODES = Object.keys(CODES) as DiagnosticCode[];
import {
  MESSAGES,
  DESCRIPTIVE_SLOTS,
  placeholdersOf,
  missingPlaceholders,
  render,
  renderText,
} from './catalogue.js';
import { escapeLine, escapeValue } from './escape.js';

const SPEC = fileURLToPath(
  new URL('../../specifications/v1.0/F1-spec-pack-format-and-manifest.md', import.meta.url),
);

async function specMessages(): Promise<Map<string, string[]>> {
  const src = await readFile(SPEC, 'utf8');
  const start = src.indexOf('\n## Error States');
  const end = src.indexOf('\n## Non-Functional Requirements', start);
  const out = new Map<string, string[]>();
  for (const line of src.slice(start, end).split('\n')) {
    const code = /^\| `([EW]-[A-Z0-9-]+)`/.exec(line)?.[1];
    if (!code) continue;
    const at = line.indexOf('`lintel: ');
    if (at < 0) continue;
    const parts: string[] = [];
    let pos = at;
    for (;;) {
      const seg = /^`([^`]*)`/.exec(line.slice(pos));
      if (!seg) break;
      parts.push(seg[1] as string);
      pos += seg[0].length;
      const sep = /^ \/ (?=`)/.exec(line.slice(pos));
      if (!sep) break;
      pos += sep[0].length;
    }
    out.set(code, parts);
  }
  return out;
}

test('every code has a message, and it matches F1 verbatim', async () => {
  const spec = await specMessages();
  const codes = Object.keys(CODES) as DiagnosticCode[];
  assert.equal(spec.size, codes.length, 'a code without a message template');
  for (const code of codes) {
    assert.deepEqual(MESSAGES[code], spec.get(code), `${code}: message diverged from F1`);
  }
});

test('every message obeys the shape rules', () => {
  for (const code of Object.keys(CODES) as DiagnosticCode[]) {
    const lines = MESSAGES[code];
    assert.ok(lines.length > 0, `${code}: empty message`);
    assert.ok(lines[0]?.startsWith('lintel: '), `${code}: line 1 must carry the lintel prefix`);
    for (const line of lines.slice(1)) {
      assert.ok(line.startsWith('  '), `${code}: continuation lines are indented two spaces — ${line}`);
    }
    // A REMEDY LINE is one that BEGINS with the arrow. An arrow elsewhere
    // is ordinary text — `E-REWRITE-UNUSED` renders `"{find}" → "{replace}"`
    // in its first line, which is content and not a remedy. An earlier
    // version of this assertion forbade that and was wrong about the
    // message rather than the message being wrong about the shape.
    const remedies = lines.filter((l) => l.startsWith('  →'));
    for (const r of remedies) {
      assert.ok(r.startsWith('  → '), `${code}: a remedy line spaces after the arrow — ${r}`);
    }
    if (remedies.length > 0) {
      const firstRemedy = lines.findIndex((l) => l.startsWith('  →'));
      for (const l of lines.slice(firstRemedy)) {
        assert.ok(l.startsWith('  →'), `${code}: remedy lines come last — ${l}`);
      }
    }
  }
});

test('a placeholder is {name} with an identifier name', () => {
  for (const code of Object.keys(CODES) as DiagnosticCode[]) {
    for (const name of placeholdersOf(code)) {
      assert.match(name, /^[A-Za-z][A-Za-z0-9]*$/, `${code}: ${name} is not an identifier`);
    }
  }
});

// Braces that are NOT placeholders must survive rendering untouched: JSON
// a remedy line tells the user to write, and a regex quantifier inside a
// recommended `pattern`. Reading every {…} as a substitution mangles both,
// which is how the identifier rule was found.
test('literal braces are passed through, not interpolated', () => {
  const anatomy = renderText('E-ANATOMY-NO-REASON', { part: 'process', name: 'coding' });
  assert.ok(anatomy.includes('{ "status": "absent", "reason": "…" }'), anatomy);

  const pattern = renderText('E-PARAM-NO-PATTERN', { id: 'projectName' });
  assert.ok(pattern.includes('{1,64}'), pattern);
});

/**
 * **`DESCRIPTIVE_SLOTS` is empty, and that is the assertion.** F1 v5.2.
 *
 * It recorded codes whose message lines F1 described in prose instead of
 * naming — `{first ten paths, one per line, …}` — which the identifier
 * rule leaves **literal**, so an emitter would print those words where the
 * content belongs. There were three; the last two closed when E-10 built
 * one of them and `E-VERIFY-MISMATCH` was about to print its own
 * description to a user.
 *
 * Asserting the emptiness is stronger than deleting the symbol: a new slot
 * added to F1 in prose would fail here rather than pass unnoticed.
 */
test('no message line is a descriptive slot any more', () => {
  assert.deepEqual(Object.keys(DESCRIPTIVE_SLOTS), []);
  for (const code of ALL_CODES) {
    for (const line of MESSAGES[code]) {
      // A descriptive slot is a braced phrase ALONE on its line. Braces
      // inside prose or a JSON example are ordinary content — that is the
      // false positive the identifier rule exists to avoid, and
      // `E-ANATOMY-MISSING` ships a JSON example that proves it.
      assert.equal(
        /^\s*\{[^}]*\s[^}]*\}\s*$/.test(line),
        false,
        `${code}: "${line}" is a braced phrase alone on a line, so it renders literally`,
      );
    }
  }
});

test('render fills what it is given and leaves the rest visible', () => {
  const out = render('E-CONTENT-TOO-LARGE', { path: 'a/b.md', size: '9 MB' });
  assert.ok(out[0]?.includes('a/b.md'));
  assert.ok(out[0]?.includes('9 MB'));

  const partial = render('E-CONTENT-TOO-LARGE', { path: 'a/b.md' });
  assert.ok(partial[0]?.includes('{size}'), 'an unsupplied placeholder stays visible');
  assert.deepEqual(missingPlaceholders('E-CONTENT-TOO-LARGE', { path: 'x' }), ['size']);
  assert.deepEqual(missingPlaceholders('E-CONTENT-TOO-LARGE', { path: 'x', size: '1' }), []);
});

// C-50. Every value and every finished line passes the escaper.
test('an interpolated value cannot inject a control character', () => {
  const nasty = 'a\u001b[2Jb';
  const out = renderText('E-CONTENT-TOO-LARGE', { path: nasty, size: '1' });
  assert.ok(!out.includes('\u001b'), 'ANSI escape reached the output');
  assert.ok(out.includes('\\x1b'), 'it must be visible rather than dropped');
});

// SEC, and stricter than C-50 as written — see escape.ts. A value carrying
// a newline plus an arrow would forge a remedy line, which is the
// disclosure-forgery shape one layer down.
test('an interpolated value cannot forge a remedy line', () => {
  const forged = 'x\n  → run something else';
  const out = renderText('E-CONTENT-TOO-LARGE', { path: forged, size: '1' });
  assert.equal(out.split('\n').length, MESSAGES['E-CONTENT-TOO-LARGE'].length, 'value added a line');
  assert.ok(out.includes('\\n'), 'the newline must be visible, not structural');
});

test('escapeLine keeps tab and newline; escapeValue does not', () => {
  assert.equal(escapeLine('a\tb\nc'), 'a\tb\nc');
  assert.equal(escapeValue('a\tb\nc'), 'a\\tb\\nc');
  assert.equal(escapeLine('a\u0000b'), 'a\\x00b');
  assert.equal(escapeValue('a\u2028b'), 'a\\x2028b');
});

// A Unicode property escape is not a placeholder. `L` and `N` are valid
// identifiers, so the identifier rule alone ate `\p{L}` and `\p{N}` and
// rendered `\p200\p64` into the regex E-PARAM-NO-PATTERN recommends —
// advice that is not merely wrong but unusable.
test('a Unicode property escape is literal, not a placeholder', () => {
  assert.deepEqual(placeholdersOf('E-PARAM-NO-PATTERN'), ['id']);
  const out = renderText('E-PARAM-NO-PATTERN', { id: 'projectName' });
  assert.ok(out.includes('\\p{L}'), out);
  assert.ok(out.includes('\\p{N}'), out);
  assert.ok(out.includes('{1,64}'), 'the quantifier stays literal too');
  assert.ok(!/\{[A-Za-z][A-Za-z0-9]*\}/.test(out.replace(/\\p\{[LN]\}/g, '')), out);
});

// Every message must render with no visible placeholder once its declared
// names are supplied. This is the general form of the four bugs the
// confinement modules had.
test('every message renders clean when its placeholders are supplied', () => {
  for (const code of Object.keys(CODES) as DiagnosticCode[]) {
    const values = Object.fromEntries(placeholdersOf(code).map((n) => [n, `<${n}>`]));
    const out = renderText(code, values);
    const stripped = out.replace(/\\p\{[A-Za-z]+\}/g, '');
    const leftover = [...stripped.matchAll(/\{([A-Za-z][A-Za-z0-9]*)\}/g)].map((m) => m[1]);
    assert.deepEqual(leftover, [], `${code} renders with unfilled ${leftover.join(', ')}`);
  }
});

/**
 * F1 v4.7. A conditional message line, expressed as a placeholder with an
 * empty value rather than as prose the CLI would have to invent.
 *
 * US-31 requires `merge-json` to be `E-RECIPE-PRIMITIVE-UNKNOWN` *"like
 * any other unknown value"* — so a second code is forbidden — **and**
 * requires the message to say the primitive was withdrawn rather than
 * mistyped. One code, two messages, one line's difference.
 */
test('a line whose placeholders all render empty is omitted', () => {
  const ordinary = render('E-RECIPE-PRIMITIVE-UNKNOWN', { index: '3', op: 'exec', note: '' });
  const withdrawn = render('E-RECIPE-PRIMITIVE-UNKNOWN', {
    index: '3',
    op: 'merge-json',
    note: 'merge-json does not ship at v1.0; it is deferred to v1.1.',
  });

  assert.equal(ordinary.length, 4);
  assert.equal(withdrawn.length, 5);
  assert.ok(withdrawn.some((l) => l.includes('deferred to v1.1')));
  assert.equal(
    ordinary.some((l) => l.trim() === ''),
    false,
    'and never as a blank line, which is what a fixed template would have given',
  );
  // The remedy survives in both — the note adds, it does not replace.
  for (const m of [ordinary, withdrawn]) {
    assert.ok(m.at(-1)?.includes('Express the step with an existing primitive'));
  }
});

// An UNSUPPLIED placeholder is not an empty one. It stays visible as
// `{name}`, because a visible `{note}` is a defect anybody can see whereas
// a silently dropped line is one nobody can.
test('an unsupplied placeholder does not omit its line', () => {
  const out = render('E-RECIPE-PRIMITIVE-UNKNOWN', { index: '3', op: 'exec' });
  assert.equal(out.length, 5);
  assert.ok(out.some((l) => l.includes('{note}')));
});
