/**
 * The harness every acceptance test drives the CLI through.
 *
 * T-0102. Two things it must make assertable, because F1 states both as
 * contracts and neither is checkable from inside the process:
 *
 *   1. THE EXIT CLASS. F1 §Error States fixes four — 0 success, 1 a fault
 *      the user can correct, 2 an integrity or authoring fault, 3 an I/O
 *      failure mid-write. A test that asserts a thrown value instead is
 *      asserting an implementation detail; the exit code is the contract,
 *      and it is what CI and the F6 skill branch on (IM-7).
 *
 *   2. ZERO BYTES WRITTEN. Most class-2 failures promise it. Proving it
 *      needs a before/after picture of a real directory, not a spot check
 *      of the paths the test happened to think of.
 */
import { spawn } from 'node:child_process';
import { readdir, stat, mkdtemp, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, relative, sep } from 'node:path';
import { tmpdir } from 'node:os';

/** The built CLI entry point. Tests drive the ARTEFACT, not the sources. */
const CLI = fileURLToPath(new URL('../../dist/cli/main.js', import.meta.url));

/** F1 §Error States. Named rather than numbered at call sites, so a test
 *  reads as the claim it is making. */
export const EXIT = {
  ok: 0,
  userFault: 1,
  integrityFault: 2,
  ioFailure: 3,
} as const;

export type ExitClass = (typeof EXIT)[keyof typeof EXIT];

export interface CliResult {
  readonly code: number;
  readonly stdout: string;
  readonly stderr: string;
}

/**
 * Run the CLI as a real process in `cwd`.
 *
 * A process, not an in-process call: the exit class is the contract, and
 * `runInit`-style in-process helpers cannot observe one. `F2-ADR-003` has
 * `runInit` return a code for unit tests; this is for the acceptance layer,
 * which asserts what a user or CI would see.
 */
export function runCli(args: readonly string[], cwd: string): Promise<CliResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [CLI, ...args], {
      cwd,
      env: { ...process.env, NO_COLOR: '1' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d: Buffer) => (stdout += d.toString('utf8')));
    child.stderr.on('data', (d: Buffer) => (stderr += d.toString('utf8')));
    child.on('error', reject);
    child.on('close', (code) => resolve({ code: code ?? -1, stdout, stderr }));
  });
}

/** One entry of a directory snapshot. */
export interface Entry {
  /** Path relative to the snapshot root, POSIX-separated. */
  readonly path: string;
  readonly kind: 'file' | 'dir' | 'symlink' | 'other';
  /** Permission bits only. `null` where the platform does not represent
   *  them — Windows, which is why F1's determinism claim says "modulo the
   *  executable bit". */
  readonly mode: number | null;
  readonly size: number;
}

const REPRESENTS_MODE = process.platform !== 'win32';

/**
 * Recursively snapshot a directory: every entry, its kind, its mode and its
 * size.
 *
 * SEC (C-36). The entry name comes from `readdir`, which reports the
 * ON-DISK SPELLING — not the spelling the caller asked about. On a
 * case-insensitive volume `stat('.claude/Settings.json')` succeeds for a
 * file stored as `settings.json`, so a test that checks paths it composed
 * itself cannot tell the two apart. Two fixtures depend on this
 * distinction, which is why the snapshot is built from directory entries
 * and never from a list of expected paths.
 */
export async function snapshot(root: string): Promise<readonly Entry[]> {
  const out: Entry[] = [];
  async function walk(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const e of entries.sort((a, b) => (a.name < b.name ? -1 : 1))) {
      const full = join(dir, e.name);
      const rel = relative(root, full).split(sep).join('/');
      const kind: Entry['kind'] = e.isSymbolicLink()
        ? 'symlink'
        : e.isDirectory()
          ? 'dir'
          : e.isFile()
            ? 'file'
            : 'other';
      const st = await stat(full).catch(() => null);
      out.push({
        path: rel,
        kind,
        mode: REPRESENTS_MODE && st ? st.mode & 0o777 : null,
        size: st && kind === 'file' ? st.size : 0,
      });
      if (kind === 'dir') await walk(full);
    }
  }
  await walk(root);
  return out;
}

/** True when nothing under `root` changed. Used to prove "zero bytes". */
export function unchanged(before: readonly Entry[], after: readonly Entry[]): boolean {
  return JSON.stringify(before) === JSON.stringify(after);
}

/** A disposable directory. Removed even when the body throws. */
export async function withTempDir<T>(body: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), 'lintel-'));
  try {
    return await body(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
