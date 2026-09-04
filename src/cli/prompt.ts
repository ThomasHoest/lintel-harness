/**
 * The interactive prompt. T-2004, T-2005, `F2-ADR-003` §3.1, §3.2.
 *
 * **The only place in the product that reads a TTY**, and the only place
 * that writes anything a user is expected to answer. Everything else in
 * `init` runs identically with stdin closed.
 *
 * ── Prompts go to stderr, never stdout ────────────────────────────────
 *
 * F6 captures the disclosure block from stderr and the summary is stdout's
 * (`F2-ADR-003` §3.2). A prompt on stdout would interleave with the
 * summary and make `lintel harness init coding > out.txt` write a question
 * into the file instead of onto the terminal.
 *
 * ── The gate is both streams, and there is no flag ────────────────────
 *
 * `stdin.isTTY && stderr.isTTY`. Not stdin alone: prompts go to stderr, so
 * `lintel harness init coding 2>log` with only stdin checked asks a
 * question into a file and then blocks forever waiting for the answer.
 *
 * **No `--interactive`, no `--no-input`, no environment variable.** A flag
 * has to have a default and either default is wrong for somebody —
 * defaulting to interactive hangs CI, defaulting to non-interactive
 * silently skips prompts a human wanted. Worse, a flag can be passed *in
 * contradiction to reality*, and `--interactive` with no terminal is a
 * request the CLI cannot honour and must then invent a failure mode for.
 * The reserved-flag list is F1 US-8's and is the whole list, so adding one
 * would be a change to F1's format.
 *
 * ── No retry loop ─────────────────────────────────────────────────────
 *
 * An answer failing its declaration is `E-PARAM-INVALID`, exit 1, zero
 * bytes — the same code, class and message as the flag form, and **not** a
 * re-prompt (F2 §Resolved Decisions, US-43). F1 reads the code as *the
 * user typed it and can retype it*, which is a re-run. This module
 * therefore returns what was typed and judges nothing: the single code
 * path in `answers.ts` is what keeps the flag surface and the prompt
 * surface indistinguishable to a test.
 *
 * **T-2004 says otherwise** — *"strings are re-prompted on a `pattern`
 * failure with the declaration's own message"* — and it is the one place
 * in E-20 that contradicts the spec it implements. The spec, the ADR and
 * US-43 all say no retry, in three separate sentences, and a re-prompt
 * would additionally have to compose a validation sentence of its own,
 * outside `src/diag/`. The task's clause is recorded here, not followed.
 *
 * ── Prose in a non-diagnostic module ──────────────────────────────────
 *
 * `DEVELOPING.md` rule 2 keeps user-facing strings in `src/diag/` because
 * F1 makes the **code** the stable contract. A prompt has no code: F1
 * specifies *that* a parameter's declared `prompt` is shown, that an
 * `enum`'s `values` are rendered verbatim and that a `default` is offered,
 * and specifies no wording for the scaffolding around them. So the
 * scaffolding lives in one exported table rather than composed at three
 * call sites — the same exception `consent.ts` documents for
 * `DISCLOSURE_TEXT` and `pack-info.ts` for `PACK_INFO_TEXT`. Every
 * **value** on the line is pack content and is escaped.
 */
import { createInterface } from 'node:readline/promises';
import { escapeLine, escapeValue } from '../diag/escape.js';
import type { Answer } from '../pack/parameters.js';
import type { ParameterDecl } from '../pack/types.js';
import type { PromptFn } from './answers.js';

/** The one place this module's own wording lives. */
export const PROMPT_TEXT = {
  /** An `enum`'s permitted answers, rendered verbatim (F1 US-8). */
  values: 'one of',
  /** A `boolean`'s two answers. */
  boolean: 'y/n',
  /** Shown where a `default` is declared; an empty line accepts it. */
  default: 'default',
  /**
   * What an **empty** default says.
   *
   * `"default": ""` is a real and common declaration — `coding`'s `stack`
   * uses it — and rendering it through the line above produced:
   *
   *     Primary stack, one line (appears in CLAUDE.md)
   *       default
   *     >
   *
   * a label with nothing after it, above a caret with no hint that Enter
   * is a valid answer. **The first user of 0.1.0 read that as a hang and
   * pressed Ctrl+C.** They were right to: nothing on screen said the CLI
   * was waiting for them rather than stuck, and nothing said the field
   * was optional. It is the emptiness that has to be spoken aloud.
   */
  emptyDefault: 'optional — press Enter to skip',
  /** Where the answer is typed. */
  caret: '> ',
} as const;

/**
 * The question, as one string. **Pure**, so what a user is asked is
 * assertable without a terminal.
 *
 * The declared `prompt` is line 1 and the machine-readable half is
 * indented under it, which is the same shape every diagnostic in the
 * product uses — a reader scanning a session sees one convention rather
 * than two.
 */
export function promptQuery(decl: ParameterDecl): string {
  const lines = [escapeValue(decl.prompt)];

  if (decl.type === 'enum') {
    lines.push(
      `  ${escapeLine(PROMPT_TEXT.values)} ${(decl.values ?? []).map(escapeValue).join(', ')}`,
    );
  } else if (decl.type === 'boolean') {
    lines.push(`  ${escapeLine(PROMPT_TEXT.boolean)}`);
  }

  if (decl.default !== undefined) {
    // An empty default is announced, not rendered as absence. See
    // PROMPT_TEXT.emptyDefault for why this is its own branch.
    const shown = String(decl.default);
    lines.push(
      shown === ''
        ? `  ${escapeLine(PROMPT_TEXT.emptyDefault)}`
        : `  ${escapeLine(PROMPT_TEXT.default)} ${escapeValue(shown)}`,
    );
  }

  return `${lines.join('\n')}\n${PROMPT_TEXT.caret}`;
}

/**
 * Interpret one typed line. **Pure**, and it judges nothing.
 *
 * `null` is *"nothing was typed"*, which US-43 defines as *accept the
 * declared default*. For a `boolean` the two spellings a person actually
 * types are accepted; **anything else is returned as the string it is**,
 * so `checkAnswer` reports `E-PARAM-INVALID` rather than this function
 * guessing that `maybe` meant `false`.
 *
 * A string answer is **not trimmed**. A declared `pattern` is the pack's
 * statement of what it accepts, and trimming here would accept an answer
 * the pack refused — silently, and only on the interactive path, so the
 * two entry points would stop being indistinguishable.
 */
export function interpret(decl: ParameterDecl, line: string): Answer | null {
  if (line === '') return null;
  if (decl.type !== 'boolean') return line;
  if (line === 'y' || line === 'yes' || line === 'true') return true;
  if (line === 'n' || line === 'no' || line === 'false') return false;
  return line;
}

export interface PromptStreams {
  readonly input: NodeJS.ReadableStream & { isTTY?: boolean };
  readonly output: NodeJS.WritableStream & { isTTY?: boolean };
}

/**
 * Whether `init` may prompt: **both** streams a TTY, and nothing else
 * consulted (T-2005).
 */
export function isInteractive(streams: PromptStreams): boolean {
  return streams.input.isTTY === true && streams.output.isTTY === true;
}

/**
 * The prompt callback, or `null` when nothing can answer.
 *
 * Returning `null` rather than a callback that refuses is what makes the
 * non-interactive path structural: `answers.ts` never asks whether it may
 * prompt, it is handed a prompt or it is not.
 *
 * **One readline interface for the whole run**, closed by the returned
 * `close`. Opening one per parameter leaves each previous interface still
 * listening on stdin, and two readers of one stream is how a second
 * question consumes the first's answer.
 */
export function makePrompt(
  streams: PromptStreams = { input: process.stdin, output: process.stderr },
): { readonly prompt: PromptFn | null; readonly close: () => void } {
  if (!isInteractive(streams)) return { prompt: null, close: () => undefined };

  const rl = createInterface({ input: streams.input, output: streams.output });
  return {
    prompt: async (decl) => {
      let answer: string;
      try {
        answer = await rl.question(promptQuery(decl));
      } catch (e) {
        // **Ctrl+C at a prompt is a person cancelling, not a crash.**
        //
        // `readline/promises`' `question()` REJECTS with an `AbortError`
        // when the user interrupts. Nothing caught it, so node printed a
        // raw unhandled rejection — ten lines of internal stack frames
        // (`node:internal/readline/interface`) at somebody who pressed
        // Ctrl+C on purpose. Reported by the first user of 0.1.0, on the
        // very first command they ran.
        //
        // Rethrown as a typed cancellation the entry point turns into
        // exit 130 (128 + SIGINT, the shell convention). **Nothing has
        // been written at this point** — prompting happens while
        // collecting answers, before any plan executes — so cancelling
        // here leaves the project untouched, and the message can say so.
        if ((e as NodeJS.ErrnoException)?.code === 'ABORT_ERR') throw new PromptCancelled();
        throw e;
      }
      return interpret(decl, answer);
    },
    close: () => rl.close(),
  };
}

/**
 * The user interrupted a prompt.
 *
 * A distinct type rather than a flag, so the entry point can tell
 * "cancelled deliberately" from "threw", and report each as what it is.
 */
export class PromptCancelled extends Error {
  constructor() {
    super('cancelled at a prompt');
    this.name = 'PromptCancelled';
  }
}
