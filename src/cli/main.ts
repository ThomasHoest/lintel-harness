#!/usr/bin/env node
/**
 * `lintel` — argv in, diagnostics to stderr, exit class out. T-0106.
 *
 * The only thing this module decides is **which command runs**. Every
 * failure it reports is an F1 code, every message comes from the
 * catalogue, and the exit class is `exitCodeFor`'s. There is no branch
 * here that composes a sentence, and there must not be: F1 makes the code
 * the stable contract and the prose free to change.
 *
 * `F1-ADR-001`'s file plan is superseded on this point — it planned four
 * commands and no group — and the ADR records the supersession itself.
 */
import { DiagnosticBag, type Diagnostic } from '../diag/diagnostic.js';
import { escapeLine } from '../diag/escape.js';
import { initOptions, runInit } from './commands/init.js';
import { COMMANDS, GROUP, OWNER, commandList, isCommand, type Command } from './surface.js';

export interface Streams {
  readonly out: (s: string) => void;
  readonly err: (s: string) => void;
}

const realStreams: Streams = {
  out: (s) => process.stdout.write(s + '\n'),
  err: (s) => process.stderr.write(s + '\n'),
};

/**
 * The commands F1 does not implement, each waiting on its feature.
 *
 * **This is the one user-facing string outside `src/diag/`, and it is
 * deliberate and temporary.** A stub cannot carry an F1 code because none
 * exists for *"this build does not have that yet"* — and inventing one
 * would put a development affordance into the product's only message
 * catalogue, which F1 owns. The stub set is asserted by a test, so it
 * **shrinks visibly** as F2, F3 and F6 land, and reaching empty is the
 * signal to delete this block.
 */
const STUB_NOTE = 'is not implemented in this build';

/**
 * Which commands still dispatch to the note.
 *
 * **Ownership is not the test any more.** It was `OWNER[c] !== 'F1'` while
 * every non-F1 command was unbuilt; F2 has since landed `init`, which F1
 * does not own and which is not a stub. Keeping the ownership test would
 * have printed the stub note over a working command — a dispatch table
 * that agrees with a documentation table rather than with the build.
 *
 * `DISPATCHED` is the built set, and it is what shrinks the stub set. F1's
 * own three are still absent from it: `validate`, `verify` and `pack` have
 * command modules (`runValidate`, `toJson`, `renderPackInfo`) that nothing
 * in `run` calls yet, which is a separate piece of wiring and not F2's.
 */
const DISPATCHED: readonly Command[] = ['init'];

function isStub(c: Command): boolean {
  return !DISPATCHED.includes(c);
}

/** Emit a bag: one line per diagnostic line, all to stderr, all escaped. */
function report(bag: DiagnosticBag, streams: Streams): void {
  for (const d of bag.items) {
    for (const line of d.message.split('\n')) streams.err(line);
  }
}

export interface RunResult {
  readonly code: number;
  readonly diagnostics: readonly Diagnostic[];
}

/**
 * Parse enough argv to choose a command, and run it.
 *
 * Returns an exit code rather than calling `process.exit`, so the whole
 * surface is testable in-process — the same reason `F2-ADR-003` gives for
 * `runInit`. The acceptance layer still drives a real process, because the
 * exit class is what a user and CI see.
 *
 * `cwd` is the project a writing command applies to (IM §11.2: *"applies
 * one pack to the current directory"*). It is a parameter and not a call
 * to `process.cwd()` inside the dispatch **so that an in-process test can
 * assert zero bytes written against a temp directory** rather than against
 * the repository the suite is running in.
 */
export async function run(
  argv: readonly string[],
  streams: Streams = realStreams,
  cwd: string = process.cwd(),
): Promise<RunResult> {
  const bag = new DiagnosticBag();
  const [group, command] = argv;

  // No group at all, or an unknown one. **F1 has no code for an unknown
  // GROUP** — that is known limit 16, recorded rather than invented,
  // because the fault has a different list and a different remedy from
  // `E-CLI-UNKNOWN-COMMAND` and therefore needs its own code, in the
  // change that decides Q-64. Until then: usage, exit 1, no code claimed.
  if (group === undefined || group !== GROUP) {
    streams.err(escapeLine(`lintel: usage: lintel ${GROUP} <command> [options]`));
    streams.err(escapeLine(`  Commands: ${commandList()}`));
    return { code: 1, diagnostics: [] };
  }

  if (command === undefined || !isCommand(command)) {
    // The command slot, which is the SECOND positional (Q-63).
    bag.add('E-CLI-UNKNOWN-COMMAND', {
      values: { arg: command ?? '' },
      ...(command === undefined ? {} : { data: { arg: command } }),
    });
    report(bag, streams);
    return { code: bag.exitCode(), diagnostics: bag.items };
  }

  if (command === 'init') {
    // The two-pass walk is `init`'s, not this file's: pass 1 runs inside
    // `initOptions` and pass 2 cannot run until the pack resolves. `run`
    // therefore hands over the tokens **after** the group and the command
    // and decides nothing else about them.
    const { options, bag: parseBag } = initOptions(argv.slice(2), cwd);
    if (parseBag.length > 0) {
      report(parseBag, streams);
      const code = parseBag.exitCode();
      if (code !== 0) return { code, diagnostics: parseBag.items };
    }
    return { code: await runInit(options, { streams }), diagnostics: parseBag.items };
  }

  streams.err(
    escapeLine(`lintel: "${GROUP} ${command}" ${STUB_NOTE} (${OWNER[command]} owns it).`),
  );
  return { code: 1, diagnostics: [] };
}

/**
 * Commands that currently dispatch to the stub note. Asserted by
 * `main.test.ts` so the set shrinks visibly; empty means this file's stub
 * block can go.
 *
 * **Five of six, and `init` is the one that left.** The comment above
 * claimed this was already asserted by a test; **no such test existed**
 * when F2 arrived, which is why the ownership test could disagree with the
 * build without anything noticing. It exists now.
 */
export function stubbedCommands(): readonly Command[] {
  return COMMANDS.filter(isStub);
}

/* c8 ignore start — the process entry point, exercised by the acceptance
   harness rather than in-process. */
const invokedDirectly =
  process.argv[1] !== undefined && import.meta.url === new URL(`file://${process.argv[1]}`).href;
if (invokedDirectly) {
  const result = await run(process.argv.slice(2));
  process.exitCode = result.code;
}
/* c8 ignore stop */
