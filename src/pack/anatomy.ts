/**
 * The nine-part anatomy: completeness, status, and the report. T-0307.
 *
 * **G-F1-3** in one module — *a pack declares all nine parts, and
 * `validate` fails a pack that silently omits one*. The nine-part shape
 * is the product's core abstraction; a pack missing a part is
 * **incomplete, not merely different**, and the whole value of declaring
 * it is that the omission cannot be silent.
 *
 * ── Three faults that look alike and are not ──────────────────────────
 *
 *   MISSING        the part is absent from `anatomy`, or is present and
 *                  says nothing about where its content is. **Exit 2.**
 *   EMPTY          the part declares `paths` that match no payload file.
 *                  **Exit 2** — a declaration covering nothing is an
 *                  authoring mistake, and accepting it is how a pack ends
 *                  up believing it declared something it did not.
 *   CONTRADICTION  a content source alongside `"status": "absent"`.
 *                  **Exit 2**, and explicitly *not* the unknown-key rule:
 *                  these are keys whose **meanings collide**, and the
 *                  format cannot pick one.
 *
 * ── And two that are not faults at all ────────────────────────────────
 *
 * `W-ANATOMY-ABSENT` and `W-ANATOMY-PROVISIONAL` are **`notice`** class
 * (Q-60), so **`--strict` must not promote them**. That is precisely what
 * lets `planning` — whose role set is `provisional` on purpose — exit 0
 * in CI. A `--strict` run that could never pass because a pack honestly
 * declared its own state is the failure Q-60 exists to remove.
 */
import { DiagnosticBag } from '../diag/diagnostic.js';
import { matchesAny } from '../recipe/glob.js';
import { ANATOMY_PART_IDS, type AnatomyPartId, type AnatomyStatus, type PackJson } from './types.js';

/**
 * One row of the nine-row report.
 *
 * **`missing` is a fourth value here and not an `AnatomyStatus`** — it is
 * reachable only for an **invalid** pack, and keeping it out of the
 * declared enum is what stops a pack declaring itself missing.
 */
export interface AnatomyRow {
  readonly part: AnatomyPartId;
  readonly status: AnatomyStatus | 'missing';
  readonly note?: string;
  readonly reason?: string;
  /** Payload files the part's globs matched. `0` with `present` status is
   *  `E-ANATOMY-EMPTY`; `0` with `declaredBy: 'recipe'` is expected. */
  readonly matched: number;
}

export interface AnatomyResult {
  /** **Exactly nine, in `AnatomyPartId` order.** The order is the report's
   *  contract: a reader comparing two packs compares row against row. */
  readonly rows: readonly AnatomyRow[];
  readonly bag: DiagnosticBag;
}

type Decl = Record<string, unknown>;

const isObj = (v: unknown): v is Decl => typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Check a pack's anatomy against its payload.
 *
 * `payloadPaths` are pack-relative POSIX paths — the payload walk's
 * output. It is passed in rather than read here so this module takes no
 * filesystem handle, on the same reasoning as the glob matcher.
 */
export function checkAnatomy(
  pack: PackJson,
  payloadPaths: readonly string[],
): AnatomyResult {
  const bag = new DiagnosticBag();
  const rows: AnatomyRow[] = [];
  const anatomy = pack.anatomy as unknown as Record<string, unknown>;

  for (const part of ANATOMY_PART_IDS) {
    const decl = anatomy[part];

    if (!isObj(decl)) {
      bag.add('E-ANATOMY-MISSING', { values: { name: pack.name, part } });
      rows.push({ part, status: 'missing', matched: 0 });
      continue;
    }

    // `present` is the DEFAULT, and that is load-bearing: it is why a pack
    // may omit `status` on the parts it simply has, which is what `coding`
    // and `writing` do for seven and five parts respectively.
    const status = (decl['status'] as AnatomyStatus | undefined) ?? 'present';

    if (status === 'absent') {
      rows.push(absentRow(bag, pack, part, decl));
      continue;
    }

    const paths = Array.isArray(decl['paths']) ? (decl['paths'] as string[]) : null;
    const declaredByRecipe = decl['declaredBy'] === 'recipe';

    if (paths === null && !declaredByRecipe) {
      // Present, and says nothing about where its content is. G-F1-3's
      // "silently omits one" — the part is declared and empty of meaning.
      bag.add('E-ANATOMY-MISSING', { values: { name: pack.name, part } });
      rows.push({ part, status: 'missing', matched: 0 });
      continue;
    }

    // `declaredBy: 'recipe'` names no globs, so it matches nothing and
    // that is correct: folderScaffolding's shape IS the recipe's set of
    // destinations, which this module does not hold.
    const matched = paths === null ? 0 : payloadPaths.filter((p) => matchesAny(paths, p)).length;

    if (paths !== null && matched === 0) {
      bag.add('E-ANATOMY-EMPTY', {
        values: { part, name: pack.name, globs: paths.join(', ') },
      });
    }

    if (status === 'provisional') {
      const note = decl['note'];
      if (typeof note !== 'string' || note.length === 0) {
        bag.add('E-ANATOMY-NO-NOTE', { values: { part, name: pack.name } });
      } else {
        // NOTICE class. --strict must not promote it: the pack declared
        // this state on purpose, and nothing an author could change would
        // clear it short of finishing work they have said is unfinished.
        bag.add('W-ANATOMY-PROVISIONAL', { values: { name: pack.name, part, note } });
      }
      rows.push({ part, status, matched, ...noteOf(decl) });
      continue;
    }

    redundantKey(bag, decl, 'reason', part, pack.name);
    rows.push({ part, status: 'present', matched, ...noteOf(decl) });
  }

  return { rows, bag };
}

function absentRow(bag: DiagnosticBag, pack: PackJson, part: AnatomyPartId, decl: Decl): AnatomyRow {
  const reason = decl['reason'];
  if (typeof reason !== 'string' || reason.length === 0) {
    bag.add('E-ANATOMY-NO-REASON', { values: { part, name: pack.name } });
  } else {
    // NOTICE, like provisional. `writing` declares parts 8 and 9 absent
    // honestly; a --strict run must not punish it for saying so.
    bag.add('W-ANATOMY-ABSENT', { values: { name: pack.name, part, reason } });
  }

  // CONTRADICTION, not an unknown key: the author has declared both
  // "this part does not exist" and "here is its content", and the format
  // cannot pick one.
  const sourceKey = 'paths' in decl ? 'paths' : 'declaredBy' in decl ? 'declaredBy' : null;
  if (sourceKey !== null) {
    bag.add('E-ANATOMY-SOURCE-ON-ABSENT', { values: { part, name: pack.name, sourceKey } });
  }

  redundantKey(bag, decl, 'note', part, pack.name);
  return {
    part,
    status: 'absent',
    matched: 0,
    ...(typeof reason === 'string' ? { reason } : {}),
  };
}

/**
 * A key that is ignored where it sits — `reason` beside `present`, `note`
 * beside `absent`.
 *
 * **`defect` class, unlike the status it sits beside** (Q-60). The status
 * is a state the pack declared and nothing can clear; this key is simply
 * ignored, so the author is expected to delete it.
 */
function redundantKey(
  bag: DiagnosticBag,
  decl: Decl,
  key: string,
  part: AnatomyPartId,
  where: string,
): void {
  if (key in decl) {
    bag.add('W-UNKNOWN-KEY', { values: { key, where: `${where} anatomy.${part}` } });
  }
}

function noteOf(decl: Decl): { note?: string } {
  const note = decl['note'];
  return typeof note === 'string' ? { note } : {};
}

/** The parts a pack does not fully ship, for `pack info`'s summary. F5
 *  counts these as an NFR, which is why `provisional` is a status rather
 *  than free text. */
export function incompleteParts(rows: readonly AnatomyRow[]): readonly AnatomyRow[] {
  return rows.filter((r) => r.status !== 'present');
}
