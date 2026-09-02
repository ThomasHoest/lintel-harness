/**
 * The manifest's canonical bytes. T-0702.
 *
 * **The contract is byte-identity, not tidiness** (US-10): two applies of
 * the same pack version with the same answers must produce **byte-identical
 * manifests**, and re-serializing an unchanged manifest must reproduce it
 * exactly. That is a *diff* contract — the manifest is committed to version
 * control, so a serializer that reordered a key or moved to 4-space indent
 * would show every project a spurious change on the next command that
 * rewrote the file, and the real change would be invisible inside it.
 *
 * Four rules, and F1 §US-10 states all four: **fixed key order**, **2-space
 * indent**, **`\n` endings**, `parameters` in **declared parameter order**
 * and `scaffolds` in **declared order**.
 *
 * ── What is hand-rolled and what is not ───────────────────────────────
 *
 * **The ordering is ours; the escaping is the stdlib's.** `JSON.stringify`
 * emits an object's keys in insertion order, so supplying an object built
 * in canonical order is enough to fix the order — and every hard part of
 * serialization (string escaping, lone surrogates, number formatting) stays
 * with the implementation that is already correct. Re-implementing string
 * escaping to control key order would be trading a solved problem for an
 * unsolved one. `parse-strict.ts` replaces `JSON.parse` because that call
 * is *lossy* about duplicates in a way the threat model names; nothing is
 * lossy on the way out, so nothing is replaced here.
 *
 * Its `null, 2` form is exactly F1's indent, uses `\n` unconditionally, and
 * emits `{}` and `[]` for the empty cases — so the only thing this module
 * adds is the order and the trailing newline.
 */
import type { JsonValue } from '../json/parse-strict.js';
import { MANIFEST_KEYS, MANIFEST_PACK_KEYS, type PackManifest } from './types.js';

/**
 * Build the document in canonical order.
 *
 * Unknown keys are appended **after** the keys this CLI knows, at each of
 * the two levels that have a closed key set. Appending is a choice and it
 * is the deterministic one: a newer CLI's own ordering is unknowable here,
 * so any attempt to interleave would be a guess that changed with the
 * guesser. **The byte-identity contract is therefore over manifests this
 * CLI wrote** — which carry no unknown keys at all — and a foreign manifest
 * round-trips with its unknown keys preserved verbatim but possibly moved.
 * F1 promises preservation of unknown keys and byte-identity of *our own*
 * output; it does not promise both of a document written by a version that
 * does not exist yet.
 */
function ordered(m: PackManifest): Record<string, JsonValue> {
  const pack: Record<string, JsonValue> = {
    name: m.pack.name,
    version: m.pack.version,
    formatVersion: m.pack.formatVersion,
  };
  addUnknown(pack, m.unknownPackKeys, MANIFEST_PACK_KEYS);

  const out: Record<string, JsonValue> = {
    manifestVersion: m.manifestVersion,
    cli: m.cli,
    // Between `pack` and `parameters`, and **never inside `pack`** (Q-52).
    // The position is part of the contract and a test reads the key order
    // to assert it, so this line is not a stylistic ordering.
    pack,
    payloadDigest: m.payloadDigest,
    // Spread rather than reference: insertion order is the declared
    // parameter order, and a copy is what stops a later mutation of the
    // caller's object from changing bytes already serialized.
    parameters: { ...m.parameters },
    scaffolds: [...m.scaffolds],
  };
  addUnknown(out, m.unknownKeys, MANIFEST_KEYS);
  return out;
}

/**
 * Re-inline captured keys, **never over a key the CLI reads**.
 *
 * The guard is not defensive tidying: without it, a capture holding
 * `payloadDigest` — reachable from any caller that builds a `PackManifest`
 * by hand rather than from `readManifest` — would overwrite the digest this
 * apply actually computed with a value nothing validated. A key the CLI
 * knows always wins over a key it is only carrying.
 */
function addUnknown(
  target: Record<string, JsonValue>,
  captured: Readonly<Record<string, JsonValue>> | undefined,
  known: readonly string[],
): void {
  if (captured === undefined) return;
  for (const [key, value] of Object.entries(captured)) {
    if (known.includes(key)) continue;
    target[key] = value;
  }
}

/**
 * Serialize a manifest to the bytes that go on disk.
 *
 * **Ends with a newline.** POSIX text-file convention, and the practical
 * half of it is that a file without one shows as a modified last line in
 * every diff of a change that appended anything.
 *
 * Narrower than `F1-ADR-001`'s declared `canonicalJson(value: unknown)`, on
 * purpose: three of F1's four rules — the fixed key order, declared
 * parameter order and declared scaffold order — are facts about **this
 * document** and are unstatable over `unknown`. A general stable-stringify
 * accepting the manifest would have to sort keys or trust its caller, and
 * sorting them puts `payloadDigest` between `parameters` and `scaffolds`,
 * which is the one position §F1.4 forbids.
 */
export function canonicalJson(m: PackManifest): string {
  return `${JSON.stringify(ordered(m), null, 2)}\n`;
}
