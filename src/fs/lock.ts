/**
 * The advisory lock. T-1103.
 *
 * `.harness/lock` holds `{pid, host, startedAt, cli}` and is acquired by
 * **exclusive create**. Anything else is `E-LOCK-HELD`, exit 1.
 *
 * Advisory, and the word is accurate: it stops a second `lintel` in the
 * same project, and it stops nothing else. A user editing files during an
 * apply is not prevented by this or by anything — which is why the write
 * path is journalled rather than relying on exclusivity.
 *
 * ── Breaking a lock takes three conditions, all of them ───────────────
 *
 *   1. the recorded **host is this host** — a lock from another machine
 *      on a shared filesystem says nothing about whether that process is
 *      alive, and this one cannot find out;
 *   2. the recorded **pid is not alive**;
 *   3. `startedAt` is **older than 60 seconds**.
 *
 * All three, because each alone is wrong. Host alone breaks a running
 * lock. Liveness alone breaks a lock whose pid was reused — pids are
 * recycled, and on a busy machine quickly. Age alone breaks a lock held by
 * a long apply, which is precisely the case the lock exists for.
 *
 * **Breaking is reported** — `W-LOCK-STALE-BROKEN`, class `notice`: the
 * user did nothing wrong and nothing they could change would clear it, so
 * `--strict` must not promote it.
 *
 * ── `verify` takes no lock ────────────────────────────────────────────
 *
 * It writes nothing, so there is nothing to serialise. A read-only command
 * that took a lock would fail against a project mid-apply for no reason,
 * and `verify` is exactly the command you reach for when something looks
 * wrong.
 */
import { DiagnosticBag } from '../diag/diagnostic.js';

/** Below this, a lock is never broken however dead its pid looks — a long
 *  apply is the case the lock exists for. */
export const STALE_AFTER_MS = 60_000;

export interface LockFile {
  readonly pid: number;
  readonly host: string;
  /** ISO 8601, UTC. */
  readonly startedAt: string;
  readonly cli: string;
}

export interface LockDecision {
  /** True iff the caller may take the lock. */
  readonly acquire: boolean;
  /** True iff an existing lock should be removed first. */
  readonly breakStale: boolean;
  readonly bag: DiagnosticBag;
}

export interface LockContext {
  readonly host: string;
  readonly now: number;
  /** Whether a pid is alive. Injected rather than called here, because
   *  `process.kill(pid, 0)` is a syscall and this decision must be
   *  testable without one. */
  readonly isAlive: (pid: number) => boolean;
}

/**
 * Decide what to do about an existing lock.
 *
 * `existing` is `null` when no lock file is present. Returns a decision
 * rather than performing one: taking the lock is a write, and this module
 * decides while `execute` writes.
 */
export function decideLock(existing: LockFile | null, ctx: LockContext): LockDecision {
  const bag = new DiagnosticBag();
  if (existing === null) return { acquire: true, breakStale: false, bag };

  const sameHost = existing.host === ctx.host;
  const alive = sameHost && ctx.isAlive(existing.pid);
  const age = ctx.now - Date.parse(existing.startedAt);
  // `Number.isNaN` guards a malformed timestamp: an unparseable date must
  // read as "not old enough to break", never as `NaN > x` being false in a
  // way that happens to help.
  const old = !Number.isNaN(age) && age > STALE_AFTER_MS;

  if (sameHost && !alive && old) {
    bag.add('W-LOCK-STALE-BROKEN', { values: { pid: String(existing.pid) } });
    return { acquire: true, breakStale: true, bag };
  }

  bag.add('E-LOCK-HELD', {
    values: {
      pid: String(existing.pid),
      host: existing.host,
      startedAt: existing.startedAt,
    },
  });
  return { acquire: false, breakStale: false, bag };
}

/** The lock this run would write. */
export function lockContents(cli: string, host: string, now: Date): LockFile {
  return { pid: process.pid, host, startedAt: now.toISOString(), cli };
}

export interface ReadLockResult {
  readonly lock?: LockFile;
  readonly malformed: boolean;
}

/**
 * Parse a lock file.
 *
 * A malformed lock is **not** an error and **not** breakable: it is
 * reported as held, because a file this CLI cannot read might have been
 * written by a version that can, and removing it would break that run.
 * Fail closed on the side of not interfering.
 */
export function readLock(value: unknown): ReadLockResult {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { malformed: true };
  }
  const o = value as Record<string, unknown>;
  if (
    typeof o['pid'] !== 'number' ||
    typeof o['host'] !== 'string' ||
    typeof o['startedAt'] !== 'string' ||
    typeof o['cli'] !== 'string'
  ) {
    return { malformed: true };
  }
  return { lock: o as unknown as LockFile, malformed: false };
}
