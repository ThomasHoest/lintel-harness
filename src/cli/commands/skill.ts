/**
 * `lintel harness skill install` — the sixth command. T-2606, T-2607.
 *
 * It copies the Markdown skill that ships inside `@lintel/cli` into
 * `.claude/skills/lintel/` in the current project, so that the
 * conversational path is installed by a command rather than by telling
 * people to copy a folder out of `node_modules` — which is the
 * hand-application this whole product exists to replace
 * (`F6-ADR-005` §3.1).
 *
 * **Project-local only.** `--user` was dropped at C-52: it was the one
 * write in the product that deliberately left the project root, and every
 * confinement guarantee in F1 is expressed *against* that root. Serving
 * that convenience costs a second confinement root with its own brand,
 * ancestor walk and tests. **Do not reintroduce it without specifying
 * that root first.**
 *
 * **No `--force`** (C-56). `--force` is a reserved flag whose meaning F1
 * fixes for `init`'s pre-existing-path rule, and one flag with one meaning
 * across the whole surface is worth more than saving a manual step in a
 * rare operation. An existing installation is refused unconditionally.
 *
 * ── Three F1 contract gaps this command could not route around ────────
 *
 * Recorded here rather than worked around, because each is a place where
 * the type system or the catalogue cannot express a CLI write that is
 * neither `init` nor `update`, and the honest thing is to say so at the
 * call site rather than to cast past it.
 *
 *   1  **No `WritablePath` constructor reaches `.claude/skills/`.**
 *      `AppliedPath` comes only from `confinePath`, which **refuses** this
 *      destination — `skills` is a reserved name at any `.claude` segment
 *      (C-53), and correctly so: that rule exists to stop a *pack*
 *      installing instructions into the agent runtime of the project it is
 *      applied to. `HarnessPath` admits `.harness/**` and nothing else,
 *      over a list its own module calls *"five and complete"*. F1's
 *      `T-0211` states that *"`skill install` is a CLI write and is
 *      unaffected — the reservation binds recipe steps"*, but **no
 *      constructor expresses that exemption**, so this module cannot
 *      obtain the brand `confineAtWrite`, `atomicWrite` and the journal
 *      all require.
 *
 *      What it does instead: it performs confinement stages 3 and 4 over a
 *      **compile-time constant** destination — `realpath` the root, walk
 *      the ancestors top-down with `lstat` refusing any symlink, and
 *      require a strict descendant — using the same exported predicates
 *      the gate uses, and writes through `writePlain`. **It re-implements
 *      no rule**: the denylist is not copied, the grammar is not re-checked
 *      (there is no user-supplied path to check), and the destination is
 *      one literal string that cannot vary at runtime.
 *
 *      **What is genuinely lost, stated rather than hidden:** the write is
 *      not atomic and is **not journalled**, so a crash mid-install leaves
 *      a partial `.claude/skills/lintel/`. That is recoverable in one
 *      command — remove the directory and run it again — which is why it
 *      is a recorded cost and not a blocker. The fix is F1's: a third
 *      constructor for CLI writes outside `.harness/`, or a documented
 *      widening of `harnessPath`.
 *
 *   2  **`WriteRequest.command` and `JournalCommand` are `'init' |
 *      'update'`.** Both are deliberately non-defaultable, for the good
 *      reason their own doc comments give: the remedy line is rendered
 *      from them, and a remedy that cannot work is worse than none.
 *      `skill install` is a third writing command and neither type admits
 *      it — which is the same fault one level up, and is why this module
 *      does not quietly pass `'init'`.
 *
 *   3  **`E-TARGET-EXISTS` and `E-WRITE-FAILED` render `init`'s remedies.**
 *      T-2607 requires both codes and forbids inventing new ones, so both
 *      are raised — but `E-TARGET-EXISTS` tells the reader to *"re-run with
 *      --force"*, which this command does not accept, and `E-WRITE-FAILED`
 *      renders `→ lintel harness {command} --rollback`, which this command
 *      has no mode for. The codes are right; their **prose** is `init`'s,
 *      and F1 owns the catalogue.
 */
import { lstat, readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, resolve as resolvePath } from 'node:path';
import { DiagnosticBag } from '../../diag/diagnostic.js';
import { escapeLine } from '../../diag/escape.js';
import { writePlain } from '../../fs/atomic-write.js';
import { walk } from '../../fs/walk.js';
import { isStrictDescendant, resolveRoot } from '../../security/resolve.js';
import { parsePass2 } from '../flags.js';
import type { Streams } from '../main.js';

/**
 * DEPTH INVARIANT — this file must compile to `dist/cli/commands/skill.js`,
 * exactly three levels inside `outDir`.
 *
 * `skill/` sits beside `dist/` in the published artefact, exactly as
 * `packs/` does, so `../../../skill/` is correct from here and wrong from
 * any other depth. Same reasoning as `src/paths.ts`, and the same failure
 * mode: a move resolves to a directory that does not exist and the command
 * silently finds nothing to install.
 *
 * **Resolved from `import.meta.url`, never `process.cwd()`** — U-12. A
 * project able to shadow the shipped skill with a `skill/` directory of
 * its own would be arbitrary content entering an install under the
 * harness's own name.
 */
const SKILL_SOURCE = new URL('../../../skill/', import.meta.url);

/**
 * Where the skill lands. **One literal, project-relative, POSIX.**
 *
 * `lintel` rather than `lintel-harness`: `F6-ADR-005`'s file plan fixes
 * this directory and the epics restate it, and the skill's own identifier
 * lives in `SKILL.md`'s frontmatter, which is what the runtime reads.
 */
export const SKILL_INSTALL_DIR = '.claude/skills/lintel';

/** The ancestors that can already exist. Everything below the leaf is
 *  created by this command, because the leaf is refused if it is there. */
const ANCESTORS = ['.claude', 'skills'] as const;

export interface SkillResult {
  readonly code: number;
  readonly bag: DiagnosticBag;
}

const report = (streams: Streams, bag: DiagnosticBag): void => {
  for (const d of bag.items) {
    for (const line of d.message.split('\n')) streams.err(line);
  }
};

/**
 * `lintel harness skill install`.
 *
 * `install` is a positional sub-command rather than a flag, for `pack
 * info`'s reason: the noun names the thing and the verb names what to do
 * with it, so a later `skill uninstall` reads as English rather than as a
 * flag nobody guessed.
 */
export async function runSkillCommand(
  argv: readonly string[],
  streams: Streams,
  cwd: string,
): Promise<SkillResult> {
  // **Pass 2, not pass 1.** The two-pass walk exists because a pack may
  // declare `parameters[].flag` aliases and an unknown token is therefore
  // unjudgeable until the pack resolves. `skill install` resolves no pack
  // and can never acquire an alias, so there is nothing to defer to and
  // fail-closed is available immediately.
  const { parsed, bag } = parsePass2(argv, 'skill', {});
  if (bag.length > 0) {
    report(streams, bag);
    const code = bag.exitCode();
    if (code !== 0) return { code, bag };
  }

  const [sub, ...extra] = parsed.positionals;
  if (sub !== 'install') {
    bag.add('E-CLI-UNKNOWN-COMMAND', { values: { arg: sub ?? '' } });
    report(streams, bag);
    return { code: bag.exitCode(), bag };
  }
  if (extra.length > 0) {
    bag.add('E-CLI-ARG-UNEXPECTED', {
      values: {
        command: 'skill install',
        arg: extra[0] as string,
        // No leading spaces: `E-CLI-ARG-UNEXPECTED`'s template is
        // `"  {usage}"` and already indents.
        usage: 'usage: lintel harness skill install',
      },
    });
    report(streams, bag);
    return { code: bag.exitCode(), bag };
  }

  /* ── what is being installed ────────────────────────────────────────── */

  const sourceDir = fileURLToPath(SKILL_SOURCE);
  // `skip: []` for the same reason the payload walk passes it: this is
  // content being shipped, not a project being scanned, and a directory
  // name that happens to match the scan skip list is still content.
  const source = await walk(sourceDir, { skip: [] });
  if (source.bag.length > 0) {
    report(streams, source.bag);
    const code = source.bag.exitCode();
    if (code !== 0) return { code, bag: source.bag };
  }
  const files = source.entries.filter((e) => e.kind === 'file');

  if (files.length === 0) {
    // **F1 has no code for "this build is missing a file it ships"**, and
    // inventing one would put a packaging fault into the product's only
    // message catalogue, which F1 owns. The precedent is `main.ts`'s
    // unknown-group branch: usage, exit 1, no code claimed, recorded as a
    // gap rather than papered over. A user cannot cause this and cannot
    // fix it from their project; a broken install can.
    streams.err(escapeLine(`lintel: this build ships no skill at ${sourceDir}`));
    return { code: 1, bag };
  }

  /* ── confinement, over a constant destination ───────────────────────── */

  const rooted = await resolveRoot(cwd);
  if (rooted.root === undefined) {
    report(streams, rooted.bag);
    return { code: rooted.bag.exitCode(), bag: rooted.bag };
  }
  const root = rooted.root;

  // Stage 3/4's walk: top-down, `lstat` and never `stat`, refusing any
  // reparse point. Top-down so the message names the ancestor that IS the
  // link rather than a deeper failure whose cause it never mentions.
  let current: string = root;
  for (const segment of ANCESTORS) {
    current = resolvePath(current, segment);
    try {
      const st = await lstat(current);
      if (st.isSymbolicLink()) {
        bag.add('E-DEST-SYMLINK', { values: { component: segment, path: SKILL_INSTALL_DIR } });
        report(streams, bag);
        return { code: bag.exitCode(), bag };
      }
    } catch {
      // Not there yet. A directory that does not exist cannot be a link,
      // and this command creates it.
      break;
    }
  }

  const destination = resolvePath(root, ...SKILL_INSTALL_DIR.split('/'));
  /* c8 ignore start — unreachable while the destination is a constant
     relative path; kept because the day it stops being one, this is the
     check that should already be here. Its message is `init`'s
     step-shaped prose (gap 3 in the header), which is why it is a guard
     and not a user-facing branch. */
  if (!isStrictDescendant(root, destination)) {
    bag.add('E-MAP-ESCAPES-ROOT', { values: { index: '0', to: SKILL_INSTALL_DIR } });
    report(streams, bag);
    return { code: bag.exitCode(), bag };
  }
  /* c8 ignore stop */

  /* ── T-2607: an existing installation is refused, unconditionally ───── */

  const occupying = await existingUnder(destination);
  if (occupying !== null) {
    // The **directory** is what is refused, so the listed paths are what a
    // reader would have to remove. `E-TARGET-EXISTS`'s remedy names
    // `--force`, which this command does not accept — see gap 3.
    bag.add('E-TARGET-EXISTS', {
      values: { n: String(occupying.length) },
      lists: { paths: occupying.slice(0, 10) },
    });
    report(streams, bag);
    return { code: bag.exitCode(), bag };
  }

  /* ── the write ──────────────────────────────────────────────────────── */

  let written = 0;
  for (const file of files) {
    const from = join(sourceDir, ...file.path.split('/'));
    const to = join(destination, ...file.path.split('/'));
    try {
      // **0644, reading no source mode**, on C-26's reasoning: the mode a
      // file has in the shipped tree is an accident of whoever checked it
      // out, and this command ships no executable.
      await writePlain(to, await readFile(from), 0o644);
      written += 1;
    } catch (e) {
      bag.add('E-WRITE-FAILED', {
        values: {
          path: `${SKILL_INSTALL_DIR}/${file.path}`,
          errno: (e as NodeJS.ErrnoException).code ?? 'unknown',
          // Renders `→ lintel harness skill install --rollback`, a mode
          // this command does not have. Gap 3: the code is right and the
          // remedy is `init`'s. What actually recovers this is removing
          // the directory and running the command again — which is what
          // `E-TARGET-EXISTS` will say on the next attempt.
          command: 'skill install',
        },
      });
      report(streams, bag);
      // **Nothing is undone.** There is no journal to roll back (gap 1),
      // and reversing a partial write by hand is the one thing every rule
      // in this product tells the *skill* not to do; the CLI does not get
      // to do it either just because it is closer to the filesystem.
      return { code: bag.exitCode(), bag };
    }
  }

  streams.out(escapeLine(`lintel: installed the skill into ${SKILL_INSTALL_DIR}/`));
  streams.out(escapeLine(`  ${String(written)} files written`));
  streams.out(
    escapeLine('  Claude Code loads it from the project; nothing outside this directory was touched.'),
  );
  return { code: 0, bag };
}

/**
 * What already occupies the destination, or `null` if nothing does.
 *
 * A **file or a symlink** standing where the directory goes counts, and is
 * reported as itself rather than as an empty directory — a reader has to
 * remove that too, and telling them the directory is empty when it is a
 * symlink would be a lie of exactly the shape this command exists to avoid.
 */
async function existingUnder(destination: string): Promise<readonly string[] | null> {
  try {
    const st = await lstat(destination);
    if (!st.isDirectory() || st.isSymbolicLink()) return [SKILL_INSTALL_DIR];
  } catch {
    return null;
  }

  const found: string[] = [];
  const visit = async (dir: string, rel: string): Promise<void> => {
    for (const d of await readdir(dir, { withFileTypes: true })) {
      const childRel = rel === '' ? d.name : `${rel}/${d.name}`;
      if (d.isDirectory()) await visit(join(dir, d.name), childRel);
      else found.push(`${SKILL_INSTALL_DIR}/${childRel}`);
    }
  };
  await visit(destination, '');

  // An empty directory still refuses: it is an installation the user made
  // and this command did not, and removing it is their decision.
  return found.length === 0 ? [SKILL_INSTALL_DIR] : found;
}
