/**
 * Resolving and loading a bundled pack. T-0305.
 *
 * ── The one input F1 treats as trusted, and what that costs ───────────
 *
 * There is no registry (Q-2): packs ship **with the CLI**, and the whole
 * security model rests on that. So the resolution is **install-relative**,
 * via `paths.ts`, and `process.cwd()` is not merely the wrong answer but a
 * hole — a project placing a `packs/` directory of its own would shadow
 * the bundled packs and walk arbitrary content in through the front door.
 * Nothing downstream re-checks the assumption, because everything
 * downstream is entitled to it.
 *
 * The cost is that this module cannot be lax about the **name**. A name is
 * user input arriving from the command line and it becomes a path segment,
 * so it is validated against the declared grammar **before** it is joined
 * to anything. `packDir()` takes a name and not a path for the same
 * reason: the caller may not compose a subpath through it.
 *
 * ── Four faults, and none of them is "the pack is wrong" ──────────────
 *
 *   E-CLI-UNKNOWN-PACK      exit 1, the USER's. A name that is not bundled.
 *   E-PACK-INVALID          exit 2. `pack.json` is unreadable or not a
 *                           usable declaration.
 *   E-RECIPE-MISSING        exit 2. `recipe` names a file the pack does
 *                           not contain — phase 2 would have nothing to
 *                           run, so an apply would produce a payload and
 *                           nothing else.
 *   E-PAYLOAD-PATH-INVALID  exit 2. `recipe` is not a plain relative path,
 *                           or escapes the pack. **Refused before it is
 *                           resolved**, never after.
 *
 * **This module resolves no shared reference**, because there are none
 * (Q-48). Packs are standalone at v1.0 and duplicate what they share.
 */
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { DiagnosticBag } from '../diag/diagnostic.js';
import { parseStrictJson } from '../json/parse-strict.js';
import { packDir, packsDir } from '../paths.js';
import { satisfiesFloor as satisfies } from '../semver/compare.js';
import { validatePackJson } from './schema.js';
import type { PackJson } from './types.js';

/** The pack-format version this CLI understands. Greater is
 *  `E-PACK-FORMAT-NEWER`; equal or lower proceeds. */
export const SUPPORTED_FORMAT_VERSION = 1;

/** US-1. A pack name is one path segment and is validated as user input. */
export const PACK_NAME_RE = /^[a-z][a-z0-9-]{1,31}$/;

export interface LoadedPack {
  readonly name: string;
  readonly dir: URL;
  readonly pack: PackJson;
  /** The recipe's pack-relative path, as declared or defaulted. */
  readonly recipePath: string;
  /** Raw recipe text. **Parsed by E-04, not here**: this module resolves
   *  and reads, and a recipe parser living beside a pack loader is how a
   *  format ends up with two of them. */
  readonly recipeText: string;
}

export interface LoadResult {
  readonly loaded?: LoadedPack;
  readonly bag: DiagnosticBag;
}

/** The bundled pack names, sorted. Read from disk rather than listed in
 *  code: a hard-coded list is a second place to add a pack, and the second
 *  place is the one that gets forgotten. */
export async function bundledPackNames(): Promise<readonly string[]> {
  try {
    const entries = await readdir(fileURLToPath(packsDir()), { withFileTypes: true });
    return entries
      .filter((e) => e.isDirectory() && PACK_NAME_RE.test(e.name))
      .map((e) => e.name)
      .sort();
  } catch {
    return [];
  }
}

/**
 * `recipe` must be a plain relative path inside the pack.
 *
 * Checked on the **source text** before any resolution, so an escaping
 * value is refused rather than resolved and then judged. The rule is the
 * pack-path grammar: `/`-separated, NFC, relative, no `..`, no backslash,
 * no drive letter, no segment ending in `.` or whitespace.
 */
function recipePathFault(value: string): string | null {
  if (value.length === 0) return 'it is empty';
  if (value !== value.normalize('NFC')) return 'it is not NFC-normalised';
  if (value.includes('\\')) return 'it contains a backslash';
  // F1 v4.8, and the same clause the applied-path grammar gained: a
  // control character in a path forges a line in the digest listing.
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(value)) return 'it contains a control character';
  if (value.startsWith('/')) return 'it is absolute';
  if (/^[A-Za-z]:/.test(value)) return 'it begins with a drive letter';
  for (const seg of value.split('/')) {
    if (seg === '' ) return 'it contains an empty segment';
    if (seg === '.' || seg === '..') return `it contains a "${seg}" segment`;
    if (/[.\s]$/.test(seg)) return `the segment "${seg}" ends in "." or whitespace`;
  }
  return null;
}

/**
 * Load a bundled pack by name.
 *
 * Returns diagnostics rather than throwing, and returns **no `loaded`** on
 * any fault: a partially-loaded pack is the shape that lets a later stage
 * proceed on half a declaration.
 */
export async function loadPack(name: string, cliVersion: string): Promise<LoadResult> {
  const bag = new DiagnosticBag();
  const available = await bundledPackNames();

  // The name is user input becoming a path segment. Grammar first, then
  // membership — and membership against what is actually on disk, so a
  // name that passes the grammar but is not bundled still cannot reach
  // `packDir()` with anything unexpected in it.
  if (!PACK_NAME_RE.test(name) || !available.includes(name)) {
    bag.add('E-CLI-UNKNOWN-PACK', {
      values: { name, cliVersion, packs: available.join(', ') || '(none bundled)' },
    });
    return { bag };
  }

  const dir = packDir(name);
  const packJsonUrl = new URL('pack.json', dir);

  let text: string;
  try {
    text = await readFile(packJsonUrl, 'utf8');
  } catch (e) {
    bag.add('E-PACK-INVALID', {
      values: { path: `packs/${name}/pack.json`, detail: (e as NodeJS.ErrnoException).code ?? 'unreadable' },
    });
    return { bag };
  }

  // The duplicate-key-rejecting reader, and it runs BEFORE every other
  // check on the file (US-1): a document whose meaning depends on which
  // duplicate wins has no single meaning to validate.
  const parsed = parseStrictJson(text, `packs/${name}/pack.json`, 'E-PACK-INVALID');
  for (const d of parsed.bag.items) bag.push(d);
  if (parsed.value === undefined) return { bag };

  const validated = validatePackJson(parsed.value, name, `packs/${name}/pack.json`);
  for (const d of validated.bag.items) bag.push(d);
  if (validated.pack === undefined) return { bag };
  const pack = validated.pack;

  // `formatVersion` is a gate rather than a warning: a newer format may
  // mean anything, and reading it with older rules is the failure mode
  // that produces a wrong tree confidently.
  if (pack.formatVersion > SUPPORTED_FORMAT_VERSION) {
    bag.add('E-PACK-FORMAT-NEWER', {
      values: { name, n: String(pack.formatVersion), m: String(SUPPORTED_FORMAT_VERSION) },
    });
    return { bag };
  }

  const recipePath = pack.recipe ?? 'recipe.json';
  const fault = recipePathFault(recipePath);
  if (fault !== null) {
    bag.add('E-PAYLOAD-PATH-INVALID', { values: { path: recipePath, name, construct: fault } });
    return { bag };
  }

  let recipeText: string;
  try {
    recipeText = await readFile(new URL(recipePath, dir), 'utf8');
  } catch {
    bag.add('E-RECIPE-MISSING', { values: { name, path: recipePath } });
    return { bag };
  }

  return { loaded: { name, dir, pack, recipePath, recipeText }, bag };
}

/**
 * Is this CLI new enough for the pack?
 *
 * Separate from `loadPack` on purpose: `pack info` and `validate` must be
 * able to **read and report on** a pack this CLI is too old to apply.
 * Refusing to load it would make the diagnostic unobtainable from the tool
 * that names it.
 */
export function checkCliFloor(pack: PackJson, cliVersion: string): DiagnosticBag {
  const bag = new DiagnosticBag();
  // `!== true`, not `=== false`. `satisfiesFloor` returns **null** for an
  // unparseable version, and reading only `false` is what made this check
  // fail OPEN: a floor of "1.0" was neither satisfied nor refused, it was
  // ignored. Unreachable for a validated pack now that the schema rejects
  // non-semver, which is exactly why it must still fail closed here — the
  // two guards are for the same fault and only one of them is load-bearing
  // at a time.
  const ok = satisfies(cliVersion, pack.minCliVersion);
  if (ok !== true) {
    bag.add('E-PACK-CLI-TOO-OLD', {
      values: {
        name: pack.name,
        version: pack.version,
        minCliVersion: pack.minCliVersion,
        cliVersion,
      },
    });
  }
  return bag;
}
