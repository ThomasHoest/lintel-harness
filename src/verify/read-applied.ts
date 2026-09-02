/**
 * Reading a project's **applied state** back off disk, for `verify`.
 *
 * ── The property this module exists for ───────────────────────────────
 *
 * **Everything here comes from `.harness/pack/`, and nothing from the
 * bundled pack.**
 *
 * That is the whole difference between `verify` and a restatement of what
 * `init` believed. A `verify` that loaded the bundled pack would be
 * checking the project against **what this CLI ships**, not against what
 * was applied — so it would pass a project whose payload had been swapped,
 * and fail a project applied by an older CLI that was perfectly correct.
 *
 * The recomputation identity §F1.8 states is *payload + recipe + answers*,
 * and all three of those words mean **the committed copy**:
 *
 *   payload   `.harness/pack/**`, walked as it is now
 *   recipe    `.harness/pack/<recipe>`, parsed from that copy
 *   answers   `.harness/manifest.json`, re-validated against the
 *             declarations in **that** `pack.json`, not the bundled one
 *
 * ── It writes nothing ─────────────────────────────────────────────────
 *
 * No lock, no journal, no temp file. `verify` must work on a project
 * mid-apply, which is exactly when somebody reaches for it — and a
 * read-only command that took a lock would refuse to run at the moment it
 * is most wanted.
 */
import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { DiagnosticBag } from '../diag/diagnostic.js';
import { parseStrictJson } from '../json/parse-strict.js';
import { validatePackJson } from '../pack/schema.js';
import { validateRecipe } from '../recipe/schema.js';
import { walk } from '../fs/walk.js';
import { payloadDigestOfDir } from '../payload/digest.js';
import type { PackJson } from '../pack/types.js';
import type { Recipe } from '../recipe/types.js';
import type { ProjectRoot } from '../security/resolve.js';
import type { TreeDigest } from '../hash/digest.js';

/** Where the committed copy of the pack lives, relative to the project. */
export const PAYLOAD_DIR = '.harness/pack';

export interface AppliedPack {
  readonly pack: PackJson;
  readonly recipe: Recipe;
  /** Pack-relative POSIX paths of every payload file, as on disk **now**. */
  readonly payload: readonly string[];
  /** The digest of the payload **as it is**, for the gate to compare
   *  against what the manifest recorded. */
  readonly digest: TreeDigest;
  readonly readPayload: (packRelativePath: string) => Buffer | null;
}

export interface AppliedPackResult {
  readonly applied?: AppliedPack;
  readonly bag: DiagnosticBag;
}

/**
 * Read `.harness/pack/` as the pack it is.
 *
 * Deliberately **not** `loadPack`: that resolves install-relative, by
 * name, from the packs this CLI bundles — which is the correct thing for
 * `init` and the wrong thing here for the reason in the header.
 */
export async function readAppliedPack(root: ProjectRoot): Promise<AppliedPackResult> {
  const bag = new DiagnosticBag();
  const dir = join(root, ...PAYLOAD_DIR.split('/'));

  let packText: string;
  try {
    packText = await readFile(join(dir, 'pack.json'), 'utf8');
  } catch {
    // No committed payload. `verify` cannot recompute anything, and the
    // manifest's own reader owns the "nothing is applied here" message —
    // this reports the payload's absence specifically, because a manifest
    // WITH no payload is a different fault from no manifest at all.
    bag.add('E-PAYLOAD-DIGEST-MISMATCH', {
      values: { recorded: '(recorded)', computed: `(no ${PAYLOAD_DIR}/ in this project)` },
    });
    return { bag };
  }

  const parsed = parseStrictJson(packText, `${PAYLOAD_DIR}/pack.json`, 'E-PACK-INVALID');
  for (const d of parsed.bag.items) bag.push(d);
  if (parsed.value === undefined) return { bag };

  const validated = validatePackJson(parsed.value, packNameOf(parsed.value), `${PAYLOAD_DIR}/pack.json`);
  for (const d of validated.bag.items) bag.push(d);
  if (validated.pack === undefined) return { bag };

  const recipePath = validated.pack.recipe ?? 'recipe.json';
  let recipeText: string;
  try {
    recipeText = await readFile(join(dir, ...recipePath.split('/')), 'utf8');
  } catch {
    bag.add('E-RECIPE-MISSING', { values: { name: validated.pack.name, path: recipePath } });
    return { bag };
  }

  const rParsed = parseStrictJson(recipeText, `${PAYLOAD_DIR}/${recipePath}`, 'E-RECIPE-INVALID');
  for (const d of rParsed.bag.items) bag.push(d);
  if (rParsed.value === undefined) return { bag };

  const rValidated = validateRecipe(rParsed.value, validated.pack.name, `${PAYLOAD_DIR}/${recipePath}`);
  for (const d of rValidated.bag.items) bag.push(d);
  if (rValidated.recipe === undefined) return { bag };

  const { entries } = await walk(dir, { skip: [] });
  const payload = entries.filter((e) => e.kind === 'file').map((e) => e.path);
  const digest = await payloadDigestOfDir(dir, payload);

  return {
    applied: {
      pack: validated.pack,
      recipe: rValidated.recipe,
      payload,
      digest,
      // Synchronous, because the render is synchronous: `renderPhase2`
      // takes a reader rather than awaiting one, so that the whole plan is
      // a pure function of the payload it was handed.
      readPayload: (p) => {
        try {
          return readFileSync(join(dir, ...p.split('/')));
        } catch {
          return null;
        }
      },
    },
    bag,
  };
}

/** The name is needed to validate the document that declares it, so it is
 *  read before validation and defaulted to a legal one — a wrong name is
 *  then reported by the schema rather than crashing the read. */
function packNameOf(value: unknown): string {
  const name = (value as { name?: unknown })?.name;
  return typeof name === 'string' ? name : 'pack';
}

