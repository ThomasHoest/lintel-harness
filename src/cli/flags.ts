/**
 * The flag table and the two-pass argv walk. T-0107, T-0112.
 *
 * **Hand-rolled, and U-5 closed that way for a reason worth restating:**
 * every off-the-shelf parser — `node:util`'s `parseArgs` included —
 * assumes a **static grammar** and throws or mis-binds on an unknown token
 * in pass 1. That is not a shortcoming to route around. **The grammar
 * genuinely is not known until the pack resolves**, because a pack may
 * declare `parameters[].flag` aliases (US-8), and the CLI holds no
 * pack-specific knowledge — which is what keeps S5 testable.
 *
 * So:
 *   PASS 1  recognises the group, the command, global and command flags
 *           and the pack name, and **defers every unrecognised token
 *           without judging it**.
 *   PASS 2  re-parses with the resolved pack's aliases registered, and
 *           only then may a token be reported unknown.
 *
 * **Fail-closed at the end of pass 2**, never before: reporting in pass 1
 * produces a false `E-CLI-UNKNOWN-FLAG` for every pack-declared alias,
 * which is the failure this shape exists to prevent.
 */
import { DiagnosticBag } from '../diag/diagnostic.js';
import { COMMANDS, type Command } from './surface.js';

/**
 * **Nine reserved flag names, global rather than per-command** (F1 US-8).
 * A pack's `flag` alias may not collide with one **whether or not the
 * command being run accepts it** — the list is the whole list.
 *
 * `--dry-run` is here although **no F1 command accepts it** (T-0112): it
 * is `update`'s read-only mode, which is F3's, and reserving it now is the
 * list's own rule applied on time. A pack that claimed `dry-run` first
 * would silently shadow a read-only mode when F3 ships — the
 * `--accept-permissions` mistake avoided rather than repeated.
 *
 * **`--accept-permissions` and `--accept-hooks` are NOT here** (Q-54).
 * The consent gate they belonged to is deleted, so they reach
 * `E-CLI-UNKNOWN-FLAG` by the general rule. **v1.1 obligation:** the
 * version that reinstates the gate must re-reserve both **before**
 * shipping, or a pack that has meanwhile claimed one silently shadows a
 * security flag.
 */
export const RESERVED_FLAGS = [
  'set',
  'scaffold',
  'json',
  'strict',
  'force',
  'rollback',
  'all',
  'dry-run',
] as const;

export type ReservedFlag = (typeof RESERVED_FLAGS)[number];

/** Whether a flag takes a value. */
type Arity = 'boolean' | 'value';

interface FlagSpec {
  readonly arity: Arity;
  /** Repeatable flags accumulate rather than overwrite. */
  readonly repeatable?: boolean;
}

const FLAGS: Readonly<Record<ReservedFlag, FlagSpec>> = {
  set: { arity: 'value', repeatable: true },
  scaffold: { arity: 'value', repeatable: true },
  json: { arity: 'boolean' },
  strict: { arity: 'boolean' },
  force: { arity: 'boolean' },
  rollback: { arity: 'boolean' },
  all: { arity: 'boolean' },
  'dry-run': { arity: 'boolean' },
};

/**
 * Which command accepts which flag. A **known** flag on the wrong command
 * is `E-FLAG-NOT-PERMITTED` — refused rather than ignored, because a user
 * who typed it believed it did something.
 *
 * `init`'s, `update`'s and `skill`'s rows are their features' to confirm;
 * they are stated here because the table must be total for the parse to
 * be fail-closed, and a missing row would read as "accepts nothing".
 */
const ACCEPTS: Readonly<Record<Command, readonly ReservedFlag[]>> = {
  init: ['set', 'scaffold', 'force', 'rollback'],
  update: ['dry-run', 'json'],
  skill: [],
  validate: ['all', 'strict', 'json'],
  verify: ['json'],
  pack: ['json'],
};

export interface ParsedArgs {
  readonly command: Command;
  /** Positionals after the command — the pack name, where one applies. */
  readonly positionals: readonly string[];
  readonly flags: Readonly<Record<string, string[] | true>>;
  /** Tokens this parse could not place. **Empty after a successful pass 2.** */
  readonly deferred: readonly string[];
}

export interface ParseResult {
  readonly parsed: ParsedArgs;
  readonly bag: DiagnosticBag;
}

/** A pack-declared alias: the parameter id it resolves to, and whether it
 *  takes a value. A `boolean` parameter's alias is a bare flag; every other
 *  type's takes one. */
export interface Alias {
  readonly id: string;
  readonly arity?: Arity;
}

export type Aliases = Readonly<Record<string, Alias>>;

function flagName(token: string): string | null {
  return token.startsWith('--') && token.length > 2 ? token.slice(2) : null;
}

/**
 * One parser, run twice.
 *
 * `report` is the whole difference between the passes. **Pass 1 runs with
 * `report: false`** and defers every unrecognised token without judging
 * it; **pass 2 re-parses the SAME argv** with the pack's aliases
 * registered and `report: true`, and only then may a token be unknown.
 *
 * **Pass 2 re-parses rather than re-reading pass 1's leftovers**, and that
 * is not an optimisation detail. Pass 1 cannot know whether an unknown
 * flag takes a value, so `--calibration high-floor` leaves the flag in
 * `deferred` and `high-floor` in `positionals` — the two are separated,
 * and nothing that reads only the deferred list can put them back
 * together. Re-parsing the original argv is the only way the value is
 * still attached to its flag.
 */
function parse(
  argv: readonly string[],
  command: Command,
  aliases: Aliases,
  report: boolean,
): ParseResult {
  const bag = new DiagnosticBag();
  const flags: Record<string, string[] | true> = {};
  const positionals: string[] = [];
  const deferred: string[] = [];
  const set: string[] = [];
  const accepted = new Set<string>(ACCEPTS[command]);

  for (let i = 0; i < argv.length; i++) {
    const token = argv[i] as string;
    const name = flagName(token);

    if (name === null) {
      positionals.push(token);
      continue;
    }

    const eq = name.indexOf('=');
    const bare = eq >= 0 ? name.slice(0, eq) : name;
    const inline = eq >= 0 ? name.slice(eq + 1) : undefined;

    // RESERVED FIRST, aliases second. **A pack may never redefine a
    // reserved flag**, and the order here is what enforces it rather than
    // trusting that validate refused the pack. F1 US-8 does refuse a
    // colliding `flag` at validate time (`E-PARAM-FLAG-INVALID`), but
    // `--force` gates US-13's pre-existing-path rule and `--dry-run` will
    // gate a read-only mode: a parser that let an alias win would be the
    // `--accept-permissions` shadowing concern reintroduced one layer
    // down, where nothing else is looking. Defence in depth, one line of
    // ordering.
    const alias = bare in FLAGS ? undefined : aliases[bare];
    if (alias !== undefined) {
      // Sugar. Records under the parameter's ID, never under the flag name.
      if ((alias.arity ?? 'value') === 'boolean') {
        set.push(`${alias.id}=true`);
        continue;
      }
      const value = inline ?? argv[++i];
      if (value === undefined || flagName(value) !== null) {
        bag.add('E-CLI-FLAG-VALUE-MISSING', {
          values: { flag: bare, usage: `lintel harness ${command} --${bare} <value>` },
        });
        continue;
      }
      set.push(`${alias.id}=${value}`);
      continue;
    }

    if (!(bare in FLAGS)) {
      // NOT an error in pass 1: a pack alias is indistinguishable from a
      // typo until the pack resolves, and judging here is the whole bug.
      deferred.push(token);
      if (report) {
        bag.add('E-CLI-UNKNOWN-FLAG', {
          values: {
            command,
            flag: bare,
            flags: ACCEPTS[command].map((f) => `--${f}`).join(', '),
          },
        });
      }
      continue;
    }

    const reserved = bare as ReservedFlag;
    if (!accepted.has(reserved)) {
      bag.add('E-FLAG-NOT-PERMITTED', {
        values: {
          flag: reserved,
          command,
          commands: COMMANDS.filter((c) => ACCEPTS[c].includes(reserved)).join(', '),
        },
      });
      continue;
    }

    const spec = FLAGS[reserved];
    if (spec.arity === 'boolean') {
      flags[reserved] = true;
      continue;
    }

    const value = inline ?? argv[++i];
    if (value === undefined || flagName(value) !== null) {
      bag.add('E-CLI-FLAG-VALUE-MISSING', {
        values: { flag: reserved, usage: `lintel harness ${command} --${reserved} <value>` },
      });
      continue;
    }
    if (reserved === 'set') set.push(value);
    else {
      const prior = flags[reserved];
      flags[reserved] = spec.repeatable && Array.isArray(prior) ? [...prior, value] : [value];
    }
  }

  if (set.length > 0) flags['set'] = set;
  return { parsed: { command, positionals, flags, deferred }, bag };
}

/** Pass 1: recognise what the CLI knows without a pack; **defer the rest
 *  without judging it**. Never reports an unknown flag. */
export function parsePass1(argv: readonly string[], command: Command): ParseResult {
  return parse(argv, command, {}, false);
}

/** Pass 2: **re-parse the same argv** with the pack's aliases registered.
 *  Fail-closed here and nowhere earlier. */
export function parsePass2(
  argv: readonly string[],
  command: Command,
  aliases: Aliases,
): ParseResult {
  return parse(argv, command, aliases, true);
}
/** Which commands accept a given flag — exported for the flag table's own
 *  tests and for `E-FLAG-NOT-PERMITTED`'s message. */
export function commandsAccepting(flag: ReservedFlag): readonly Command[] {
  return COMMANDS.filter((c) => ACCEPTS[c].includes(flag));
}

export function accepts(command: Command, flag: string): boolean {
  return (ACCEPTS[command] as readonly string[]).includes(flag);
}
