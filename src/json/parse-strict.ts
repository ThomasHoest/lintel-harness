/**
 * The only parser for **authored** JSON. T-0301, C-25.
 *
 * Three documents and no fourth: `pack.json`, `recipe.json` and
 * `.harness/manifest.json`.
 *
 * **Why not `JSON.parse`.** It collapses duplicate keys before a reviver
 * ever sees them, keeping the **last** — and the threat model's actor 1 is
 * caught by *"a JSON diff review"*. A human reading a diff reads the
 * **first** occurrence and stops; a parser that silently keeps the last
 * voids that control **by name**. So this is the one stdlib call the
 * design replaces rather than wraps, and rejecting the duplicate — rather
 * than choosing a winner — is the whole point.
 *
 * A hand-rolled token pass tracking line and column, so the diagnostic can
 * name **both** lines. "This key appears twice" is not actionable; "lines
 * 3 and 9" is.
 *
 * **Not a general JSON library.** It parses the RFC 8259 grammar and
 * nothing else — no comments, no trailing commas, no `NaN`, no single
 * quotes. An authored file that needs any of those is a file the format
 * does not accept, and being lenient here would mean the CLI reads a
 * document no other JSON tool does.
 */
import { DiagnosticBag } from '../diag/diagnostic.js';

export type JsonValue =
  | null
  | boolean
  | number
  | string
  | readonly JsonValue[]
  | { readonly [k: string]: JsonValue };

export interface ParseStrictResult {
  /** Present iff parsing succeeded with no duplicate key. */
  readonly value?: JsonValue;
  readonly bag: DiagnosticBag;
}

interface Cursor {
  readonly text: string;
  i: number;
  line: number;
}

class ParseError extends Error {
  constructor(
    message: string,
    readonly line: number,
  ) {
    super(message);
  }
}

/** A duplicate key, carrying both lines so the message can name them. */
class DuplicateKey extends Error {
  constructor(
    readonly key: string,
    readonly first: number,
    readonly second: number,
  ) {
    super(`duplicate key ${key}`);
  }
}

function advance(c: Cursor, n = 1): void {
  for (let k = 0; k < n; k++) {
    if (c.text[c.i] === '\n') c.line++;
    c.i++;
  }
}

function skipWhitespace(c: Cursor): void {
  // RFC 8259 whitespace: space, tab, LF, CR. Nothing else — a Unicode
  // space here would be a file other JSON tools reject.
  while (c.i < c.text.length) {
    const ch = c.text[c.i] as string;
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') advance(c);
    else break;
  }
}

function expect(c: Cursor, ch: string): void {
  if (c.text[c.i] !== ch) throw new ParseError(`expected ${ch}`, c.line);
  advance(c);
}

function parseString(c: Cursor): string {
  expect(c, '"');
  let out = '';
  for (;;) {
    if (c.i >= c.text.length) throw new ParseError('unterminated string', c.line);
    const ch = c.text[c.i] as string;
    if (ch === '"') {
      advance(c);
      return out;
    }
    if (ch === '\\') {
      advance(c);
      const esc = c.text[c.i] as string;
      switch (esc) {
        case '"': out += '"'; advance(c); break;
        case '\\': out += '\\'; advance(c); break;
        case '/': out += '/'; advance(c); break;
        case 'b': out += '\b'; advance(c); break;
        case 'f': out += '\f'; advance(c); break;
        case 'n': out += '\n'; advance(c); break;
        case 'r': out += '\r'; advance(c); break;
        case 't': out += '\t'; advance(c); break;
        case 'u': {
          advance(c);
          const hex = c.text.slice(c.i, c.i + 4);
          if (!/^[0-9a-fA-F]{4}$/.test(hex)) throw new ParseError('bad \\u escape', c.line);
          out += String.fromCharCode(parseInt(hex, 16));
          advance(c, 4);
          break;
        }
        default:
          throw new ParseError(`bad escape \\${esc}`, c.line);
      }
      continue;
    }
    // Raw control characters are not permitted in a JSON string.
    if (ch.charCodeAt(0) < 0x20) throw new ParseError('control character in string', c.line);
    out += ch;
    advance(c);
  }
}

function parseNumber(c: Cursor): number {
  const start = c.i;
  const m = /^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?/.exec(c.text.slice(c.i));
  if (m === null || m[0].length === 0) throw new ParseError('bad number', c.line);
  advance(c, m[0].length);
  return Number(c.text.slice(start, c.i));
}

function parseLiteral(c: Cursor): JsonValue {
  for (const [word, value] of [
    ['true', true],
    ['false', false],
    ['null', null],
  ] as const) {
    if (c.text.startsWith(word, c.i)) {
      advance(c, word.length);
      return value;
    }
  }
  throw new ParseError('unexpected token', c.line);
}

function parseValue(c: Cursor): JsonValue {
  skipWhitespace(c);
  const ch = c.text[c.i];
  if (ch === undefined) throw new ParseError('unexpected end of input', c.line);
  if (ch === '{') return parseObject(c);
  if (ch === '[') return parseArray(c);
  if (ch === '"') return parseString(c);
  if (ch === '-' || (ch >= '0' && ch <= '9')) return parseNumber(c);
  return parseLiteral(c);
}

function parseArray(c: Cursor): readonly JsonValue[] {
  expect(c, '[');
  const out: JsonValue[] = [];
  skipWhitespace(c);
  if (c.text[c.i] === ']') {
    advance(c);
    return out;
  }
  for (;;) {
    out.push(parseValue(c));
    skipWhitespace(c);
    const ch = c.text[c.i];
    if (ch === ',') {
      advance(c);
      skipWhitespace(c);
      // A trailing comma is a file other JSON tools reject; so does this.
      if (c.text[c.i] === ']') throw new ParseError('trailing comma', c.line);
      continue;
    }
    if (ch === ']') {
      advance(c);
      return out;
    }
    throw new ParseError('expected , or ]', c.line);
  }
}

/**
 * Objects, and **where the duplicate check lives**.
 *
 * Per object, not globally: `{"a":1,"b":{"a":2}}` is legal, because the
 * two `a`s are different keys. **At any depth**, because a duplicate
 * nested three levels down is exactly as invisible to a diff reader as one
 * at the top.
 */
function parseObject(c: Cursor): { readonly [k: string]: JsonValue } {
  expect(c, '{');
  const out: Record<string, JsonValue> = {};
  const seenAt = new Map<string, number>();
  skipWhitespace(c);
  if (c.text[c.i] === '}') {
    advance(c);
    return out;
  }
  for (;;) {
    skipWhitespace(c);
    const keyLine = c.line;
    const key = parseString(c);

    const first = seenAt.get(key);
    if (first !== undefined) throw new DuplicateKey(key, first, keyLine);
    seenAt.set(key, keyLine);

    skipWhitespace(c);
    expect(c, ':');
    out[key] = parseValue(c);

    skipWhitespace(c);
    const ch = c.text[c.i];
    if (ch === ',') {
      advance(c);
      skipWhitespace(c);
      if (c.text[c.i] === '}') throw new ParseError('trailing comma', c.line);
      continue;
    }
    if (ch === '}') {
      advance(c);
      return out;
    }
    throw new ParseError('expected , or }', c.line);
  }
}

/**
 * Parse an authored JSON document.
 *
 * `file` is the name the diagnostic reports — a duplicate key names the
 * file, the key and both lines.
 *
 * `malformed` is the code raised for a syntax fault, and it differs by
 * document (`E-PACK-INVALID`, `E-RECIPE-INVALID`, `E-MANIFEST-CORRUPT`) —
 * one fault, one code, per this catalogue's own rule. **`E-PACK-INVALID`
 * did not exist until F1 v4.0**: US-1 had always said `pack.json` goes
 * through this reader, and the duplicate case had a code, but a
 * syntactically broken `pack.json` had nowhere to go while the other two
 * documents each had somewhere. Building this parser is what found it. **A duplicate key is
 * always `E-JSON-DUPLICATE-KEY`** whichever document it is in, because
 * that fault and its remedy are the same everywhere.
 */
export function parseStrictJson(
  text: string,
  file: string,
  malformed: 'E-PACK-INVALID' | 'E-RECIPE-INVALID' | 'E-MANIFEST-CORRUPT',
): ParseStrictResult {
  const bag = new DiagnosticBag();
  const c: Cursor = { text, i: 0, line: 1 };

  try {
    // A BOM is stripped rather than refused: it is invisible in an editor,
    // and refusing it would report a syntax error a user cannot see.
    if (text.charCodeAt(0) === 0xfeff) advance(c);

    const value = parseValue(c);
    skipWhitespace(c);
    if (c.i !== text.length) throw new ParseError('trailing content', c.line);
    return { value, bag };
  } catch (e) {
    if (e instanceof DuplicateKey) {
      bag.add('E-JSON-DUPLICATE-KEY', {
        line: e.first,
        values: { file, key: e.key, first: String(e.first), second: String(e.second) },
      });
      return { bag };
    }
    const err = e as ParseError;
    // `path` for the two pack-side codes, `detail` for all three. The
    // manifest's message names no path — it is always the same file.
    bag.add(malformed, {
      line: err.line,
      values: { path: file, detail: `${err.message} at line ${err.line}` },
    });
    return { bag };
  }
}
