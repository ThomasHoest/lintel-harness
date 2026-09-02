/**
 * `validate`, `pack info` and `verify` — the three read-only commands.
 *
 * All three had command modules that **nothing called**. `runValidate`,
 * `renderPackInfo` and `verify`'s shaping functions were built, tested and
 * unreachable from argv, so the CLI reported *"is not implemented in this
 * build"* for three commands that were.
 *
 * This is the argv half, and nothing else: each function parses what its
 * command takes, calls the module that already exists, and prints. **No
 * rule lives here** — a decision made in this file would be a second place
 * to look for it.
 *
 * ── Why these three are together ──────────────────────────────────────
 *
 * **None of them writes.** That is not a filing convenience: it is the
 * property that makes them safe to run against a project mid-apply, which
 * is exactly when somebody reaches for `verify`. `init` and `update` each
 * get their own module because each takes a lock, journals, and can leave
 * a project half-written; these three cannot, and keeping them apart from
 * the writers is how that stays obvious.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DiagnosticBag } from '../../diag/diagnostic.js';
import { escapeLine } from '../../diag/escape.js';
import { parsePass1 } from '../flags.js';
import {
  runValidate,
  summaryLines as validateSummary,
  validateExitCode,
  validateJson,
} from './validate.js';
import { packInfoJson, renderPackInfo } from './pack-info.js';
import { validatePackByName } from '../../validate/validate-pack.js';
import { readAppliedPack } from '../../verify/read-applied.js';
import { verifyProject, type RecomputedPath } from '../../verify/verify.js';
import { planSteps } from '../../recipe/plan-steps.js';
import { renderPhase2 } from '../../apply/plan-phase2.js';
import { parametersFor, selectScaffolds } from '../../pack/scaffolds.js';
import { readManifest } from '../../manifest/read.js';
import { resolveRoot } from '../../security/resolve.js';
import { summaryLines as verifySummary, toJson, verifyExitCode } from './verify.js';
import type { AppliedPath } from '../../security/confine.js';
import type { Answer } from '../../pack/parameters.js';
import { bundledPackNames } from '../../pack/load-pack.js';
import { CLI_VERSION } from '../version.js';
import type { Streams } from '../main.js';

/** Every read-only command returns an exit code and prints its own
 *  output; `run` decides nothing about them. */
export type ReadOnlyResult = { readonly code: number; readonly bag: DiagnosticBag };

const emit = (streams: Streams, lines: readonly string[]): void => {
  for (const line of lines) streams.out(escapeLine(line));
};

const report = (streams: Streams, bag: DiagnosticBag): void => {
  for (const d of bag.items) {
    for (const line of d.message.split('\n')) streams.err(line);
  }
};

/**
 * `lintel harness validate [<pack>…] [--all] [--strict] [--json]`.
 *
 * **`--strict` promotes `defect` warnings and never a `notice`** (Q-60),
 * which is what lets a pack that honestly declares a provisional part or
 * an absent one still exit `0` in CI. A `--strict` run that could never
 * pass because a pack told the truth about itself is the failure Q-60
 * exists to remove.
 */
export async function runValidateCommand(
  argv: readonly string[],
  streams: Streams,
): Promise<ReadOnlyResult> {
  const { parsed, bag } = parsePass1(argv, 'validate');
  if (bag.length > 0) {
    report(streams, bag);
    const code = bag.exitCode();
    if (code !== 0) return { code, bag };
  }

  const all = parsed.flags['all'] === true;
  const strict = parsed.flags['strict'] === true;
  const json = parsed.flags['json'] === true;

  // No pack named and no `--all` is not a fault: validating everything is
  // the useful default for the one command whose whole job is a CI gate.
  const packs = all || parsed.positionals.length === 0 ? undefined : parsed.positionals;

  const { named, reports } = await runValidate({ ...(packs ? { packs } : {}), cliVersion: CLI_VERSION });
  const results = named.map((n) => n.result);

  if (json) {
    emit(streams, [JSON.stringify(validateJson(reports), null, 2)]);
  } else {
    // `summaryLines` **already interleaves each pack's findings with its
    // own summary line**, which is the useful order: a reader sees the
    // notices and then the count they add up to. Reporting the bag as well
    // printed every finding twice — caught by running it, not by reading
    // it, because both halves were individually correct.
    emit(streams, validateSummary(named));
  }

  return { code: validateExitCode(results, strict), bag };
}

/**
 * `lintel harness pack info <pack> [--json]`.
 *
 * The **only** command with a sub-command, and it is a positional rather
 * than a flag: `pack` names a noun and `info` names what to do with it, so
 * a later `pack list` reads as English rather than as a flag nobody
 * guessed.
 */
export async function runPackCommand(
  argv: readonly string[],
  streams: Streams,
): Promise<ReadOnlyResult> {
  const { parsed, bag } = parsePass1(argv, 'pack');
  if (bag.length > 0) {
    report(streams, bag);
    const code = bag.exitCode();
    if (code !== 0) return { code, bag };
  }

  const [sub, name] = parsed.positionals;
  if (sub !== 'info') {
    bag.add('E-CLI-UNKNOWN-COMMAND', { values: { arg: sub ?? '' } });
    report(streams, bag);
    return { code: bag.exitCode(), bag };
  }

  if (name === undefined) {
    bag.add('E-CLI-PACK-MISSING', {
      values: {
        command: 'pack info',
        packs: (await bundledPackNames()).join(', '),
        usage: '  usage: lintel harness pack info <pack> [--json]',
      },
    });
    report(streams, bag);
    return { code: bag.exitCode(), bag };
  }

  const { report: packReport, bag: loadBag } = await validatePackByName(name, CLI_VERSION);
  if (packReport === undefined) {
    report(streams, loadBag);
    return { code: loadBag.exitCode(), bag: loadBag };
  }

  emit(
    streams,
    parsed.flags['json'] === true
      ? [JSON.stringify(packInfoJson(packReport), null, 2)]
      : renderPackInfo(packReport),
  );

  // `pack info` DESCRIBES; it does not judge. A pack with findings is
  // still described, and its exit code says so without refusing to print
  // — which is the difference between this command and `validate`.
  return { code: 0, bag };
}

/**
 * `lintel harness verify [--json]`. T-1003's command half.
 *
 * ── It recomputes; it does not restate ────────────────────────────────
 *
 * Every input comes from the **committed copy** — `.harness/pack/` and
 * `.harness/manifest.json` — and none from the pack this CLI bundles. A
 * `verify` that loaded the bundled pack would check the project against
 * *what this CLI ships*, so it would **pass a project whose payload had
 * been swapped** and fail one applied correctly by an older CLI.
 *
 * That is the whole reason this command exists as more than a
 * convenience, and it is why it was the last of the six to be wired: the
 * shaping functions were easy and this property is the work.
 *
 * ── Two gates, both suppressing, in this order ────────────────────────
 *
 *   1. the payload digest, against what the manifest recorded;
 *   2. every recorded answer, against its own declaration (C-29).
 *
 * Either failing suppresses the tree comparison **entirely** — no
 * per-path rows — because the expectation is computed *from* those two
 * inputs, and reporting rows derived from inputs nobody can vouch for is
 * worse than reporting none.
 *
 * ── It writes nothing, ever ───────────────────────────────────────────
 *
 * No lock, no journal, no temp file. `verify` has to work on a project
 * mid-apply, which is exactly when somebody reaches for it.
 */
export async function runVerifyCommand(
  argv: readonly string[],
  streams: Streams,
  cwd: string,
): Promise<ReadOnlyResult> {
  const { parsed, bag } = parsePass1(argv, 'verify');
  if (bag.length > 0) {
    report(streams, bag);
    const code = bag.exitCode();
    if (code !== 0) return { code, bag };
  }

  const { root, bag: rootBag } = await resolveRoot(cwd);
  if (root === undefined) {
    report(streams, rootBag);
    return { code: rootBag.exitCode() || 1, bag: rootBag };
  }

  // The committed copy first: the manifest's answers are re-validated
  // against the declarations in THIS pack.json, not the bundled one.
  const { applied, bag: appliedBag } = await readAppliedPack(root);
  if (applied === undefined) {
    report(streams, appliedBag);
    return { code: appliedBag.exitCode() || 2, bag: appliedBag };
  }

  const { manifest, bag: manifestBag } = await readManifest(root, applied.pack.parameters ?? [], {
    cliVersion: CLI_VERSION,
  });
  for (const d of manifestBag.items) bag.push(d);
  if (manifest === undefined) {
    report(streams, manifestBag);
    return { code: manifestBag.exitCode() || 1, bag: manifestBag };
  }

  // Recompute phase 2 from the committed payload and the recorded answers.
  const answers = new Map<string, Answer>(Object.entries(manifest.parameters ?? {}));
  const { selected } = selectScaffolds(applied.pack, manifest.scaffolds ?? []);
  const steps = planSteps({
    pack: applied.pack,
    recipe: applied.recipe,
    selected,
    answers,
    payload: applied.payload,
  });

  const rendered = renderPhase2({
    steps: steps.steps,
    payload: applied.payload,
    readPayload: applied.readPayload,
    answers,
    packName: applied.pack.name,
    packVersion: applied.pack.version,
    cliVersion: manifest.cli,
  });

  const recomputed: RecomputedPath[] = rendered.outputs.map((o) => ({
    path: o.path,
    bytes: o.bytes,
    mode: o.mode,
    adaptExpected: steps.adaptExpected.includes(o.path),
    fillExpected: steps.fillExpected.includes(o.path),
  }));

  const result = verifyProject({
    recordedDigest: manifest.payloadDigest,
    computedDigest: applied.digest,
    declarations: parametersFor(applied.pack, selected),
    recordedAnswers: answers,
    recomputed,
    onDisk: (p: AppliedPath) => {
      try {
        return { bytes: readFileSync(join(root, ...p.split('/'))), mode: null };
      } catch {
        return null;
      }
    },
  });

  if (parsed.flags['json'] === true) {
    emit(streams, [JSON.stringify(toJson(result), null, 2)]);
  } else {
    emit(streams, verifySummary(result));
  }
  report(streams, result.bag);

  return { code: verifyExitCode(result), bag: result.bag };
}
