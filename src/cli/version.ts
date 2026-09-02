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
 * **The discrepancy is resolved: `package.json` is `1.0.0` too**, and a
 * test asserts the two agree — `tests/integration/tarball.test.ts`, which
 * `release-check.mjs` also reports on.
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
export const CLI_VERSION = '1.0.0';
