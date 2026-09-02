/**
 * The command surface, as data. T-0106.
 *
 * The binary is `lintel`, `harness` is a **command group**, and the
 * command is the **second** positional (Q-63). Six commands (Q-62,
 * `F6-ADR-005`), of which **F1 implements three** — the other three are
 * F2's, F3's and F6's.
 *
 * `F1-ADR-001`'s file plan is **superseded here** and says so in its own
 * amendment: it planned four commands and no group.
 */

/** The group token. One, at v1.0. */
export const GROUP = 'harness';

/**
 * The six, in the surface's own order: **the writing commands first, then
 * the read-only ones.** `E-CLI-UNKNOWN-COMMAND`'s message prints this
 * list in this order, and `interaction-model.md` §11 states the same
 * ordering — so the array is the single source and the message is
 * rendered from it rather than restating it.
 */
export const COMMANDS = ['init', 'update', 'skill', 'validate', 'verify', 'pack'] as const;

export type Command = (typeof COMMANDS)[number];

/**
 * Which feature owns each command's behaviour.
 *
 * F1 defines the surface and implements three. **`init` is F2's, `update`
 * is F3's, `skill install` is F6's** — each dispatches to a stub until its
 * feature lands, and the stub set is asserted by a test so it shrinks
 * visibly rather than being forgotten.
 */
export const OWNER: Readonly<Record<Command, 'F1' | 'F2' | 'F3' | 'F6'>> = {
  init: 'F2',
  update: 'F3',
  skill: 'F6',
  validate: 'F1',
  verify: 'F1',
  pack: 'F1',
} as const;

/** IM-38. Three of the six cannot write — and `skill install` **can**,
 *  which is why the ratio moved when the count did. */
export const WRITES: Readonly<Record<Command, boolean>> = {
  init: true,
  update: true,
  skill: true,
  validate: false,
  verify: false,
  pack: false,
} as const;

export function isCommand(s: string): s is Command {
  return (COMMANDS as readonly string[]).includes(s);
}

/** The list as `E-CLI-UNKNOWN-COMMAND` prints it. */
export function commandList(): string {
  return COMMANDS.join(', ');
}
