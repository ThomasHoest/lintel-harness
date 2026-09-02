/**
 * `Diagnostic`, `DiagnosticBag` and `exitCodeFor()`. T-0105.
 *
 * The shapes are `F1-ADR-001`'s public interface contract; the rules they
 * enforce are F1 §Error States'. One rule governs the whole module:
 *
 *   **Severity is a property of the CODE, never of the occasion.**
 *
 * §Error States states it as a design rule — *"a scenario fatal in one
 * context and tolerable in another gets two codes"* — and this module makes
 * it structural rather than remembered: a caller supplies a code and the
 * severity, exit class and message come from the catalogue. There is no
 * parameter through which an occasion can override one, which is why
 * `Diagnostic` is only ever built by `diagnostic()` below.
 */
import {
  CODES,
  classOf,
  exitClassFor,
  severityOf,
  type DiagnosticClass,
  type DiagnosticCode,
  type ExitClass,
  type Severity,
} from './codes.js';
import { missingPlaceholders, renderText } from './catalogue.js';

/** `F1-ADR-001`'s name for the exit class. */
export type ExitCode = ExitClass;

/** Structured data a diagnostic may carry beyond its rendered message.
 *  Numbers and lists are permitted here and stringified at the boundary —
 *  `--json` consumers want the shape, the message wants the text. */
export type DiagnosticData = Readonly<Record<string, string | number | readonly string[]>>;

export interface Diagnostic {
  readonly code: DiagnosticCode;
  /** Derived from the code. Never supplied by a caller. */
  readonly severity: Severity;
  /** `defect | notice` for a `W-` code; absent on an error. Also derived. */
  readonly class?: DiagnosticClass;
  /** Rendered from the catalogue, escaped. */
  readonly message: string;
  /** POSIX, pack- or project-relative. */
  readonly path?: string;
  /** 1-based. */
  readonly line?: number;
  /** Recipe step index, where the concept applies. */
  readonly step?: number;
  readonly data?: DiagnosticData;
}

export interface DiagnosticInit {
  readonly path?: string;
  readonly line?: number;
  readonly step?: number;
  readonly data?: DiagnosticData;
  /** Values for the message's `{name}` placeholders. */
  readonly values?: Readonly<Record<string, string>>;
  /**
   * Slots that expand to **one line per item** — the ten paths
   * `E-VERIFY-MISMATCH` and `E-TARGET-EXISTS` list.
   *
   * Separate from `values` on purpose, and the separation is the security
   * property: expansion is a decision the **emitter** makes about a slot
   * it constructed, never something a value can claim for itself by
   * containing a newline. A value stays escaped whole (C-50).
   */
  readonly lists?: Readonly<Record<string, readonly string[]>>;
}

/**
 * Build a diagnostic. **The only constructor**, deliberately: an object
 * literal typed as `Diagnostic` could carry a severity that disagrees with
 * its code, and this is the one place that cannot happen.
 */
export function diagnostic(code: DiagnosticCode, init: DiagnosticInit = {}): Diagnostic {
  const severity = severityOf(code);
  const base: {
    code: DiagnosticCode;
    severity: Severity;
    message: string;
    class?: DiagnosticClass;
    path?: string;
    line?: number;
    step?: number;
    data?: DiagnosticData;
  } = {
    code,
    severity,
    message: renderText(code, init.values ?? {}, init.lists ?? {}),
  };
  if (severity === 'warning') base.class = classOf(code);
  if (init.path !== undefined) base.path = init.path;
  if (init.line !== undefined) base.line = init.line;
  if (init.step !== undefined) base.step = init.step;
  if (init.data !== undefined) base.data = init.data;
  return base;
}

/** Placeholder names a code needs but this call did not supply. Empty is
 *  the only acceptable answer at a call site; tests assert it. */
export function unfilled(code: DiagnosticCode, init: DiagnosticInit = {}): readonly string[] {
  return missingPlaceholders(code, init.values ?? {});
}

/**
 * An ordered, append-only collection.
 *
 * Order is the contract: US-16 fixes the order checks run in, so the order
 * findings are reported in is the order they were found, never sorted by
 * severity. A reader following a fixed check order needs the output to
 * match it.
 */
export class DiagnosticBag {
  readonly #items: Diagnostic[] = [];

  add(code: DiagnosticCode, init: DiagnosticInit = {}): this {
    this.#items.push(diagnostic(code, init));
    return this;
  }

  push(d: Diagnostic): this {
    this.#items.push(d);
    return this;
  }

  /**
   * A copy, not the array.
   *
   * `readonly Diagnostic[]` is a **compile-time** claim and nothing more —
   * one cast reaches the internal array, and this bag is append-only by
   * design with its order as the contract (US-16's fixed check order).
   * A caller that can splice into it breaks both, silently.
   *
   * Bags hold tens of items, so the copy is not a cost worth optimising
   * into a hole. Found by the test that asserts it, not by review.
   */
  get items(): readonly Diagnostic[] {
    return [...this.#items];
  }

  get length(): number {
    return this.#items.length;
  }

  has(code: DiagnosticCode): boolean {
    return this.#items.some((d) => d.code === code);
  }

  get errors(): readonly Diagnostic[] {
    return this.#items.filter((d) => d.severity === 'error');
  }

  get warnings(): readonly Diagnostic[] {
    return this.#items.filter((d) => d.severity === 'warning');
  }

  /** Q-60. Warnings a `--strict` run promotes: defects only, never a
   *  notice, under any flag. */
  get promotable(): readonly Diagnostic[] {
    return this.#items.filter((d) => d.severity === 'warning' && d.class === 'defect');
  }

  exitCode(strict = false): ExitCode {
    return exitCodeFor(this.#items, strict);
  }
}

/**
 * The exit class for a set of diagnostics: **the most severe one present**.
 *
 * Errors contribute their own class. Warnings contribute **0** — a warning
 * is not a failure — **except under `--strict`, where a `defect` becomes
 * 1** (Q-60). **A `notice` contributes 0 under every flag**, and that is
 * not a default anyone may override: a flag that could promote one would
 * recreate the problem splitting the severity was meant to solve, which is
 * `validate --all --strict` being unable to exit 0 for a correct pack.
 */
export function exitCodeFor(ds: readonly Diagnostic[], strict = false): ExitCode {
  let worst: ExitCode = 0;
  for (const d of ds) {
    const contribution: ExitCode =
      d.severity === 'error'
        ? exitClassFor(d.code)
        : strict && d.class === 'defect'
          ? 1
          : 0;
    if (contribution > worst) worst = contribution;
  }
  return worst;
}

/** Every code, for exhaustiveness checks in tests and dispatch tables. */
export const ALL_CODES = Object.keys(CODES) as readonly DiagnosticCode[];
