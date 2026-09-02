/**
 * The running CLI's version, as every version gate reads it.
 *
 * ── Why this is a constant and not `package.json` ─────────────────────
 *
 * `checkCliFloor` compares this against each pack's `minCliVersion`, and
 * all three bundled packs declare **`1.0.0`**. `package.json` currently
 * declares `0.1.0` — a pre-release number for an unpublished package —
 * so resolving the version from it would make **every bundled pack**
 * fail `E-PACK-CLI-TOO-OLD` and `init` unable to apply anything at all.
 *
 * The discrepancy is real and is **not** resolved here: F2 does not own
 * `package.json` and a build that silently rewrote a floor would be worse
 * than one that states the number in a file whose whole job is to state
 * it. **The reconciliation belongs to whoever cuts the 1.0.0 release** —
 * at that point `package.json` and this constant agree and this file can
 * read it instead, which is the change to make rather than the one to
 * pre-empt.
 *
 * Reading `package.json` at runtime has a second cost worth recording:
 * `paths.ts` pins a **depth invariant** (`dist/paths.js`, exactly one
 * level inside the out root) precisely because resolving a sibling of
 * `dist/` through `import.meta.url` is fragile. A version constant that
 * has to be found on disk is a version constant that can go missing in a
 * bundler's output, and every version gate in the product then fails
 * open or closed depending on how the read was written.
 */

/** The version `minCliVersion`, the manifest's `cli` key and
 *  `W-MANIFEST-NEWER-CLI` are all judged against. */
export const CLI_VERSION = '1.0.0';
