/**
 * The running CLI's version, as every version gate reads it.
 *
 * ── Why this is a constant and not `package.json` ─────────────────────
 *
 * `checkCliFloor` compares this against each pack's `minCliVersion`. A CLI
 * below every pack's floor makes **every bundled pack** fail
 * `E-PACK-CLI-TOO-OLD`, so the CLI installs and can apply nothing at all.
 *
 * **That hazard is not hypothetical — this file used to describe it as the
 * live state**, back when `package.json` said `0.1.0` against packs
 * declaring `1.0.0`. It was closed by raising `package.json` to `1.0.0`.
 *
 * **2026-09-03: the numbers moved again, and the other way.** The first
 * public release ships as **`0.1.0`**, deliberately — the product is not
 * yet one its authors are happy to call stable, and `1.0.0` is reserved
 * for when it is. Lowering the CLI re-opened exactly the trap above, and
 * it was caught before publishing by *running* the floor check rather
 * than reasoning about it: `satisfiesFloor('0.1.0', '1.0.0')` is `false`.
 *
 * So it is closed from the other side: **the three bundled packs now
 * declare `minCliVersion: 0.1.0`**. A pack's own `version` is untouched
 * and stays `1.0.0` — pack semver and CLI semver are separate by explicit
 * decision, and the floor is a statement about *which CLIs can run this
 * pack*, not about the pack's maturity.
 *
 * `tests/integration/tarball.test.ts` asserts this constant and
 * `package.json` agree, and `release-check.mjs` reports on it.
 *
 * The constant **stays** rather than becoming a read of `package.json`,
 * which was the obvious next move and is the wrong one. The reasoning is
 * below and it did not change when the numbers agreed: a version the
 * product must find on disk is a version that can go missing, and every
 * version gate then fails open or closed depending on how the read was
 * written. Two numbers kept equal by a test is a smaller risk than one
 * number resolved at runtime.
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
export const CLI_VERSION = '0.1.0';
