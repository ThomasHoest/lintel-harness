/**
 * The hand-rolled `pack.json` validator. T-0303, C-16, C-34.
 *
 * **Three rules, and they are separate rules** — the whole design is that
 * they fail differently, because they are different faults:
 *
 *   UNKNOWN KEY    → a **warning**, `defect` class, ignored at apply. A
 *                    key the CLI does not know is a pack saying something
 *                    to a future version, and refusing it would make every
 *                    forward-compatible addition a breaking change.
 *   UNKNOWN VALUE  → `E-UNKNOWN-VALUE`, exit 2, **zero bytes**, over the
 *                    enumeration **closed at six**. Ignoring one runs
 *                    behaviour the pack did not ask for (C-16).
 *   NON-BOOLEAN    → `E-UNKNOWN-VALUE`, over the list **closed at five**.
 *                    **No coercion, no truthiness** (C-34).
 *
 * **Why C-34 is the one to read before touching this.** `"false"` is
 * **truthy** in JavaScript. `RecipeStep.executable` gates C-12 and
 * `ParameterDecl.notASecret` disables C-15's credential ban — so
 * `"executable": "false"` read as `true` and `"notASecret": "no"` turned
 * the ban off. **Two security gates failing open on a typo**, and the fix
 * was not a cast but an enumeration that is checked.
 *
 * **Hand-rolled, and U-2 closed that way for a reason the constraint
 * already implied**: findings must be F1 codes emitted in US-16's fixed
 * order, and an off-the-shelf validator's own error shape and ordering
 * would have had to be translated away.
 */
import { DiagnosticBag } from '../diag/diagnostic.js';
import { parseSemver } from '../semver/compare.js';
import { confinePath } from '../security/confine.js';
import type { JsonValue } from '../json/parse-strict.js';
import {
  ANATOMY_PART_IDS,
  ANATOMY_STATUSES,
  PARAMETER_TYPES,
  type AnatomyPartId,
  type PackJson,
} from './types.js';

const ID_RE = /^[a-z][a-z0-9-]{1,31}$/;
const PARAM_ID_RE = /^[a-zA-Z][a-zA-Z0-9]{0,31}$/;
const FLAG_RE = /^[a-z][a-z0-9-]{0,31}$/;
const SCAFFOLD_ID_RE = /^[a-z][a-z0-9-]{0,31}$/;

/** Keys `pack.json` knows. Anything else warns rather than fails. */
const PACK_KEYS = new Set([
  'formatVersion',
  'name',
  'version',
  'title',
  'minCliVersion',
  'recipe',
  'anatomy',
  'folderReadme',
  'parameters',
  'scaffolds',
  'executableRoots',
  'provenance',
]);

const PARAM_KEYS = new Set([
  'id',
  'prompt',
  'type',
  'values',
  'default',
  'required',
  'flag',
  'pattern',
  'maxLength',
  'notASecret',
]);

const SCAFFOLD_KEYS = new Set(['id', 'description', 'category', 'parameters']);

/** C-7. `maxLength` defaults to 256 with a hard ceiling of 4096, and is
 *  checked **before** `pattern` runs so evaluation is bounded by
 *  construction and catastrophic backtracking is not reachable. */
export const MAX_LENGTH_DEFAULT = 256;
export const MAX_LENGTH_CEILING = 4096;
export const PATTERN_MAX_SOURCE = 200;

/** F1 US-8's reserved list, which a `flag` may not collide with —
 *  **whether or not the command being run accepts it**. */
const RESERVED_FLAG_NAMES = new Set([
  'set',
  'scaffold',
  'json',
  'strict',
  'force',
  'rollback',
  'all',
  'dry-run',
]);

export interface ValidatePackResult {
  readonly pack?: PackJson;
  readonly bag: DiagnosticBag;
}

type Obj = { readonly [k: string]: JsonValue };

const isObj = (v: JsonValue | undefined): v is Obj =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Validate a parsed `pack.json`.
 *
 * `packName` is the **directory** name; US-1 requires `name` to equal it,
 * and a mismatch is a pack that will resolve under one name and describe
 * itself as another.
 */
/**
 * `packName` is the **directory name** the declaration must agree with;
 * `file` is what the message shows. They were one parameter until
 * `load-pack.ts` needed to report `packs/coding/pack.json` while comparing
 * against `coding` — a single argument cannot be both, and conflating them
 * caps the path in every message at one segment.
 */
export function validatePackJson(
  value: JsonValue,
  packName: string,
  file: string = `${packName}/pack.json`,
): ValidatePackResult {
  const bag = new DiagnosticBag();

  if (!isObj(value)) {
    bag.add('E-PACK-INVALID', { values: { path: file, detail: 'the top level is not an object' } });
    return { bag };
  }

  unknownKeys(bag, value, PACK_KEYS, 'pack.json');

  // ── the behaviour-selecting positions this file owns ────────────────
  // ParameterDecl.type, AnatomyDecl.status and ScaffoldDecl.category are
  // three of the six; the other three live with the recipe and the
  // journal. Nothing else here is one, and adding one is a spec change.

  requireString(bag, value, 'name', file);
  requireString(bag, value, 'version', file);
  requireSemver(bag, value, 'version', file);
  requireString(bag, value, 'title', file);
  requireString(bag, value, 'minCliVersion', file);
  requireSemver(bag, value, 'minCliVersion', file);

  const name = value['name'];
  if (typeof name === 'string' && !ID_RE.test(name)) {
    bag.add('E-UNKNOWN-VALUE', {
      values: { value: name, field: 'pack.json name', allowed: ID_RE.source },
    });
  }
  if (typeof name === 'string' && name !== packName) {
    bag.add('E-PACK-INVALID', {
      values: {
        path: file,
        detail: `declares name "${name}" but sits in directory "${packName}"`,
      },
    });
  }

  if (typeof value['formatVersion'] !== 'number') {
    bag.add('E-UNKNOWN-VALUE', {
      values: {
        value: String(value['formatVersion']),
        field: 'pack.json formatVersion',
        allowed: 'an integer',
      },
    });
  }

  validateFolderReadme(bag, value);
  validateProvenance(bag, value);
  validateAnatomy(bag, value, packName);
  validateParameters(bag, value['parameters'], 'pack.json parameters');
  validateScaffolds(bag, value);
  validateExecutableRoots(bag, value);

  if (bag.errors.length > 0) return { bag };
  return { pack: value as unknown as PackJson, bag };
}

/* ── rule 1: unknown keys warn ──────────────────────────────────────── */

function unknownKeys(bag: DiagnosticBag, o: Obj, known: Set<string>, where: string): void {
  for (const k of Object.keys(o)) {
    if (!known.has(k)) {
      // A WARNING, deliberately. A key this CLI does not know is a pack
      // talking to a future version; refusing it would make every
      // forward-compatible addition a breaking change. Unknown VALUES are
      // the opposite case and are fatal.
      bag.add('W-UNKNOWN-KEY', { values: { key: k, where } });
    }
  }
}

/* ── rule 2 and 3, per field ────────────────────────────────────────── */

function requireString(bag: DiagnosticBag, o: Obj, key: string, file: string): void {
  if (typeof o[key] !== 'string') {
    bag.add('E-PACK-INVALID', { values: { path: file, detail: `"${key}" must be a string` } });
  }
}

/**
 * A boolean-typed field. **No coercion, no truthiness** (C-34).
 *
 * The whole point: `"false"` is truthy in JavaScript, so a string here
 * does not merely mistype a value — it inverts one.
 */
function checkBoolean(bag: DiagnosticBag, v: JsonValue | undefined, field: string): void {
  if (v === undefined) return;
  if (typeof v !== 'boolean') {
    bag.add('E-UNKNOWN-VALUE', {
      values: { value: JSON.stringify(v), field, allowed: 'true, false' },
    });
  }
}

function validateFolderReadme(bag: DiagnosticBag, o: Obj): void {
  const v = o['folderReadme'];
  if (v === undefined) return; // absent ⇒ README.md
  if (typeof v !== 'string') {
    bag.add('E-UNKNOWN-VALUE', {
      values: { value: JSON.stringify(v), field: 'pack.json folderReadme', allowed: 'a string' },
    });
    return;
  }
  // ONE path segment, under a step's `to` grammar — so the same rule that
  // refuses `../x` as a destination refuses it as a basename.
  if (v.includes('/')) {
    bag.add('E-MAP-PATH-GRAMMAR', {
      values: { index: '0', to: v, construct: 'more than one path segment' },
    });
    return;
  }
  const r = confinePath(v, { index: 0 });
  for (const d of r.bag.items) bag.push(d);
}

function validateProvenance(bag: DiagnosticBag, o: Obj): void {
  const v = o['provenance'];
  if (v === undefined) return;

  const badString = (str: string): boolean =>
    str.length > 200 || /[\n\r\u2028\u2029]/.test(str);

  if (typeof v === 'string') {
    if (badString(v)) {
      bag.add('E-UNKNOWN-VALUE', {
        values: { value: 'a string', field: 'pack.json provenance', allowed: '≤ 200 chars, no newline' },
      });
    }
    return;
  }
  if (!isObj(v)) {
    bag.add('E-UNKNOWN-VALUE', {
      values: { value: JSON.stringify(v), field: 'pack.json provenance', allowed: 'a string, or an object of strings' },
    });
    return;
  }
  for (const [k, entry] of Object.entries(v)) {
    if (typeof entry !== 'string' || badString(entry)) {
      bag.add('E-UNKNOWN-VALUE', {
        values: {
          value: JSON.stringify(entry),
          field: `pack.json provenance.${k}`,
          allowed: 'a string of ≤ 200 chars, no newline',
        },
      });
    }
  }
}

function validateAnatomy(bag: DiagnosticBag, o: Obj, packName: string): void {
  const a = o['anatomy'];
  if (!isObj(a)) {
    bag.add('E-PACK-INVALID', {
      values: { path: `${packName}/pack.json`, detail: '"anatomy" must be an object' },
    });
    return;
  }
  for (const part of ANATOMY_PART_IDS) {
    const decl = a[part];
    if (decl === undefined || !isObj(decl)) {
      bag.add('E-ANATOMY-MISSING', { values: { name: packName, part } });
      continue;
    }
    validateAnatomyPart(bag, decl, part, packName);
  }
  // A part the format does not know is an unknown key, not a missing one.
  unknownKeys(bag, a, new Set(ANATOMY_PART_IDS), 'pack.json anatomy');
}

function validateAnatomyPart(
  bag: DiagnosticBag,
  decl: Obj,
  part: AnatomyPartId,
  packName: string,
): void {
  const status = decl['status'];
  if (status !== undefined && typeof status === 'string' && !(ANATOMY_STATUSES as readonly string[]).includes(status)) {
    bag.add('E-UNKNOWN-VALUE', {
      values: { value: status, field: `anatomy.${part}.status`, allowed: ANATOMY_STATUSES.join(', ') },
    });
    return;
  }

  const hasSource = 'paths' in decl || 'declaredBy' in decl;

  if (status === 'absent') {
    if (typeof decl['reason'] !== 'string' || decl['reason'].length === 0) {
      bag.add('E-ANATOMY-NO-REASON', { values: { part, name: packName } });
    }
    if (hasSource) {
      bag.add('E-ANATOMY-SOURCE-ON-ABSENT', {
        values: { part, name: packName, sourceKey: 'paths' in decl ? 'paths' : 'declaredBy' },
      });
    }
    return;
  }

  if (status === 'provisional' && (typeof decl['note'] !== 'string' || decl['note'].length === 0)) {
    bag.add('E-ANATOMY-NO-NOTE', { values: { part, name: packName } });
  }

  // status defaults to `present`, and a present part must say where its
  // content is — G-F1-3's "fails a pack that silently omits one".
  if (!hasSource) {
    bag.add('E-ANATOMY-MISSING', { values: { name: packName, part } });
  }
}

function validateParameters(bag: DiagnosticBag, v: JsonValue | undefined, where: string): void {
  if (v === undefined) return;
  if (!Array.isArray(v)) {
    bag.add('E-UNKNOWN-VALUE', {
      values: { value: JSON.stringify(v), field: where, allowed: 'an array' },
    });
    return;
  }
  for (const p of v) {
    if (!isObj(p)) continue;
    unknownKeys(bag, p, PARAM_KEYS, where);
    validateParameter(bag, p);
  }
}

function validateParameter(bag: DiagnosticBag, p: Obj): void {
  const id = typeof p['id'] === 'string' ? p['id'] : '';
  if (!PARAM_ID_RE.test(id)) {
    bag.add('E-UNKNOWN-VALUE', {
      values: { value: id, field: 'parameter id', allowed: PARAM_ID_RE.source },
    });
  }

  const type = p['type'];
  if (typeof type !== 'string' || !(PARAMETER_TYPES as readonly string[]).includes(type)) {
    bag.add('E-UNKNOWN-VALUE', {
      values: { value: JSON.stringify(type), field: `parameter ${id} type`, allowed: PARAMETER_TYPES.join(', ') },
    });
    return;
  }

  // Boolean-typed fields 4 and 5 of 5.
  checkBoolean(bag, p['required'], `parameter ${id} required`);
  checkBoolean(bag, p['notASecret'], `parameter ${id} notASecret`);

  if (type === 'enum' && (!Array.isArray(p['values']) || p['values'].length === 0)) {
    bag.add('E-UNKNOWN-VALUE', {
      values: { value: JSON.stringify(p['values']), field: `parameter ${id} values`, allowed: 'a non-empty array' },
    });
  }

  validatePattern(bag, p, id, type);
  validateFlag(bag, p, id);
}

function validatePattern(bag: DiagnosticBag, p: Obj, id: string, type: string): void {
  const pattern = p['pattern'];

  if (type !== 'string') {
    // `pattern` is meaningless on enum and boolean, and declaring it there
    // is a pack believing it constrained something it did not.
    if (pattern !== undefined) {
      bag.add('E-PARAM-PATTERN-INVALID', {
        values: { id, reason: `"pattern" is meaningless on a ${type} parameter` },
      });
    }
    return;
  }

  if (pattern === undefined) {
    bag.add('E-PARAM-NO-PATTERN', { values: { id } });
    return;
  }
  if (typeof pattern !== 'string') {
    bag.add('E-PARAM-PATTERN-INVALID', { values: { id, reason: '"pattern" must be a string' } });
    return;
  }
  if (!pattern.startsWith('^') || !pattern.endsWith('$')) {
    bag.add('E-PARAM-PATTERN-INVALID', { values: { id, reason: 'it must begin "^" and end "$"' } });
    return;
  }
  if (pattern.length > PATTERN_MAX_SOURCE) {
    bag.add('E-PARAM-PATTERN-INVALID', {
      values: { id, reason: `it is ${pattern.length} characters; the limit is ${PATTERN_MAX_SOURCE}` },
    });
    return;
  }
  // C-7. Decided from the SOURCE TEXT, never from compilation — a check
  // that compiles the pattern to inspect it has already run
  // author-controlled input through the regex engine, which is the thing
  // `maxLength` and the anchoring rule exist to bound.
  const forbidden = forbiddenConstruct(pattern);
  if (forbidden !== null) {
    bag.add('E-PARAM-PATTERN-INVALID', { values: { id, reason: forbidden } });
    return;
  }
  try {
    new RegExp(pattern, 'u');
  } catch {
    bag.add('E-PARAM-PATTERN-INVALID', { values: { id, reason: 'it does not compile' } });
    return;
  }

  const maxLength = p['maxLength'];
  if (maxLength !== undefined) {
    if (typeof maxLength !== 'number' || !Number.isInteger(maxLength) || maxLength < 1) {
      bag.add('E-PARAM-PATTERN-INVALID', { values: { id, reason: '"maxLength" must be a positive integer' } });
    } else if (maxLength > MAX_LENGTH_CEILING) {
      bag.add('E-PARAM-PATTERN-INVALID', {
        values: { id, reason: `"maxLength" ${maxLength} exceeds the ceiling of ${MAX_LENGTH_CEILING}` },
      });
    }
  }
}

/** Source-text inspection for backreferences and lookaround. */
function forbiddenConstruct(source: string): string | null {
  // Strip escaped backslashes first, so `\\1` (a literal backslash then a
  // digit) is not read as a backreference.
  const stripped = source.replace(/\\\\/g, '');
  if (/\\[1-9]/.test(stripped)) return 'it uses a backreference';
  if (/\\k</.test(stripped)) return 'it uses a named backreference';
  if (/\(\?=|\(\?!|\(\?<=|\(\?<!/.test(stripped)) return 'it uses lookaround';
  return null;
}

function validateFlag(bag: DiagnosticBag, p: Obj, id: string): void {
  const flag = p['flag'];
  if (flag === undefined) return;
  if (typeof flag !== 'string' || !FLAG_RE.test(flag)) {
    bag.add('E-PARAM-FLAG-INVALID', {
      values: { id, flag: String(flag), reason: `it must match ${FLAG_RE.source}` },
    });
    return;
  }
  if (RESERVED_FLAG_NAMES.has(flag)) {
    // The reserved list is the WHOLE list, whether or not the command
    // being run accepts the flag — a pack claiming `force` or `dry-run`
    // would shadow a CLI flag whose meaning F1 fixes.
    bag.add('E-PARAM-FLAG-INVALID', {
      values: { id, flag, reason: 'it collides with a reserved CLI flag' },
    });
  }
}

function validateScaffolds(bag: DiagnosticBag, o: Obj): void {
  const v = o['scaffolds'];
  if (v === undefined) return;
  if (!Array.isArray(v)) {
    bag.add('E-UNKNOWN-VALUE', {
      values: { value: JSON.stringify(v), field: 'pack.json scaffolds', allowed: 'an array' },
    });
    return;
  }
  const seen = new Set<string>();
  for (const s of v) {
    if (!isObj(s)) continue;
    unknownKeys(bag, s, SCAFFOLD_KEYS, 'pack.json scaffolds');
    const id = typeof s['id'] === 'string' ? s['id'] : '';
    if (!SCAFFOLD_ID_RE.test(id)) {
      bag.add('E-UNKNOWN-VALUE', {
        values: { value: id, field: 'scaffold id', allowed: SCAFFOLD_ID_RE.source },
      });
    }
    if (seen.has(id)) {
      bag.add('E-UNKNOWN-VALUE', {
        values: { value: id, field: 'scaffold id', allowed: 'a unique id' },
      });
    }
    seen.add(id);
    if (typeof s['description'] !== 'string') {
      bag.add('E-UNKNOWN-VALUE', {
        values: { value: JSON.stringify(s['description']), field: `scaffold ${id} description`, allowed: 'a string' },
      });
    }
    validateParameters(bag, s['parameters'], `scaffold ${id} parameters`);
  }
}

function validateExecutableRoots(bag: DiagnosticBag, o: Obj): void {
  const v = o['executableRoots'];
  if (v === undefined) return;
  if (!Array.isArray(v)) {
    bag.add('E-UNKNOWN-VALUE', {
      values: { value: JSON.stringify(v), field: 'pack.json executableRoots', allowed: 'an array' },
    });
    return;
  }
  for (const root of v) {
    if (typeof root !== 'string' || !root.endsWith('/')) {
      bag.add('E-UNKNOWN-VALUE', {
        values: { value: JSON.stringify(root), field: 'executableRoots entry', allowed: 'a path ending "/"' },
      });
      continue;
    }
    // Each root is subject to a step's grammar and denylist, so an
    // executable root cannot name somewhere a step could not write anyway.
    const r = confinePath(root.slice(0, -1), { index: 0 });
    for (const d of r.bag.items) bag.push(d);
  }
}

/**
 * US-1: *"`version` and `minCliVersion` are valid semver; a non-semver
 * value fails validation."*
 *
 * **This was stated and enforced nowhere**, and it failed *open* in both
 * directions: the validator only checked the fields were strings, and
 * `checkCliFloor` acts on `satisfiesFloor(...) === false` while an
 * unparseable input returns `null`. So `"minCliVersion": "1.0"` passed
 * validation **and** passed the floor check — a pack could declare a floor
 * this CLI silently ignored. Found by the E-13 conformance pass.
 */
function requireSemver(bag: DiagnosticBag, o: Obj, key: string, file: string): void {
  const v = o[key];
  if (typeof v !== 'string') return; // requireString already reported it.
  if (parseSemver(v) === null) {
    bag.add('E-UNKNOWN-VALUE', {
      values: { value: v, field: `${file} ${key}`, allowed: 'a semver version, e.g. 1.0.0' },
    });
  }
}
