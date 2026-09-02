#!/usr/bin/env node
/**
 * Regenerate `src/diag/codes.ts` and `src/diag/catalogue.ts` from
 * `F1-spec-pack-format-and-manifest.md` §Error States.
 *
 * **The spec is authoritative; these two modules are its projection.**
 * That is stated in both files and enforced by their drift guards, which
 * re-derive on every test run and fail on divergence. This script is how
 * you make them agree again after F1 changes — run it, read the diff,
 * commit both.
 *
 * It exists because the derivation has now been done twice by hand, and a
 * transcription step performed by hand twice is a transcription step that
 * will eventually be performed wrongly.
 *
 *   node scripts/gen-diag.mjs
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const SPEC = fileURLToPath(
  new URL('../specifications/v1.0/F1-spec-pack-format-and-manifest.md', import.meta.url),
);
const CODES = fileURLToPath(new URL('../src/diag/codes.ts', import.meta.url));
const CATALOGUE = fileURLToPath(new URL('../src/diag/catalogue.ts', import.meta.url));

const src = await readFile(SPEC, 'utf8');
const start = src.indexOf('\n## Error States');
const end = src.indexOf('\n## Non-Functional Requirements', start);
if (start < 0 || end < 0) throw new Error('could not locate §Error States');

/** One row per code: exit class, warning class, and the message lines. */
const rows = [];
for (const line of src.slice(start, end).split('\n')) {
  const code = /^\| `([EW]-[A-Z0-9-]+)`/.exec(line)?.[1];
  if (!code) continue;

  const exit = Number(/Exit (\d)/.exec(line)?.[1] ?? 0);
  const cls = /\*\*Class `(defect|notice)`\*\*/.exec(line)?.[1] ?? null;

  // Every message's first line begins `lintel: ` — the one reliable
  // anchor, since the lead-in varies ("Exit 2.", "Warning.", "Warning,
  // exit unchanged.", or prose).
  const at = line.indexOf('`lintel: ');
  if (at < 0) throw new Error(`${code}: no message template`);
  const lines = [];
  let pos = at;
  for (;;) {
    const seg = /^`([^`]*)`/.exec(line.slice(pos));
    if (!seg) break;
    lines.push(seg[1]);
    pos += seg[0].length;
    const sep = /^ \/ (?=`)/.exec(line.slice(pos));
    if (!sep) break;
    pos += sep[0].length;
  }
  rows.push({ code, exit, cls, lines });
}
rows.sort((a, b) => (a.code < b.code ? -1 : 1));

const dupes = rows.map((r) => r.code).filter((c, i, a) => a.indexOf(c) !== i);
if (dupes.length) throw new Error(`duplicate codes: ${dupes.join(', ')}`);

/* ── codes.ts ─────────────────────────────────────────────────────────── */

const codesHeader = await readFile(CODES, 'utf8').then((t) => t.slice(0, t.indexOf('export type DiagnosticCode =')));

const union = `export type DiagnosticCode =\n${rows.map((r) => `  | '${r.code}'`).join('\n')};\n`;

const entryType = `
export interface CodeEntry {
  readonly severity: Severity;
  readonly exit: ExitClass;
  /** \`W-\` codes only. Absent on an \`E-\` code, and absent on a \`W-\` code
   *  whose class has not been declared — see \`classOf\`. */
  readonly class?: DiagnosticClass;
}
`;

const table =
  `\n/** Every code in the catalogue. **${rows.length}** at F1 v4.0. */\n` +
  'export const CODES: Readonly<Record<DiagnosticCode, CodeEntry>> = {\n' +
  rows
    .map((r) => {
      const sev = r.code.startsWith('E-') ? 'error' : 'warning';
      const cls = r.cls ? `, class: '${r.cls}'` : '';
      return `  '${r.code}': { severity: '${sev}', exit: ${r.exit}${cls} },`;
    })
    .join('\n') +
  '\n} as const;\n';

const existing = await readFile(CODES, 'utf8');
const fns = existing.slice(existing.indexOf('\n/** Total over the union'));

await writeFile(CODES, codesHeader + union + entryType + table + fns);

/* ── catalogue.ts ─────────────────────────────────────────────────────── */

const cat = await readFile(CATALOGUE, 'utf8');
const catHeader = cat.slice(0, cat.indexOf('export const MESSAGES'));
const catTail = cat.slice(cat.indexOf('\nconst PLACEHOLDER'));

const messages =
  'export const MESSAGES: Readonly<Record<DiagnosticCode, readonly string[]>> = {\n' +
  rows.map((r) => `  '${r.code}': [${r.lines.map((l) => JSON.stringify(l)).join(', ')}],`).join('\n') +
  '\n} as const;\n';

await writeFile(CATALOGUE, catHeader + messages + catTail);

console.log(`regenerated ${rows.length} codes into codes.ts and catalogue.ts`);
