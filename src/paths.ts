/**
 * Install-relative resolution of the bundled pack directory.
 *
 * DECIDED BY U-12 (`general/technology-choices.md` §5.2). The bundled packs
 * are located relative to THIS MODULE, never relative to the working
 * directory.
 *
 * SEC: `process.cwd()` is not merely the wrong answer, it is a hole.
 * Resolving against the working directory would let a user's project shadow
 * the bundled packs by placing a `packs/` directory of its own — arbitrary
 * content entering the apply through the one input F1 treats as trusted
 * (Q-2: packs ship with the CLI, there is no registry). Nothing else in the
 * product re-checks that assumption, because the whole security model rests
 * on it.
 *
 * `__dirname` is also not available: this package is ESM (`"type":
 * "module"`), which is what `import.meta.url` replaces it with.
 */

/**
 * DEPTH INVARIANT — this file must compile to `dist/paths.js`, exactly one
 * level inside `outDir`.
 *
 * `packs/` sits beside `dist/` in the published artefact (`files: ["dist",
 * "packs"]`), so `../packs/` is correct from `dist/paths.js` and WRONG from
 * `dist/anything/deeper.js`. Moving this file into a subdirectory silently
 * resolves to a directory that does not exist, and the failure surfaces as
 * "no such pack" rather than as "the build moved".
 *
 * `assertPacksDirUsable()` below is what turns that silence into a message.
 */
const PACKS_DIR = new URL('../packs/', import.meta.url);

/** Absolute `file:` URL of the bundled pack directory. */
export function packsDir(): URL {
  return PACKS_DIR;
}

/**
 * Absolute `file:` URL of one bundled pack's directory.
 *
 * Takes a pack NAME, not a path: the caller may not compose a subpath here.
 * Validating the name and confining what is read out of the directory belong
 * to `pack/load-pack.ts` (T-0305) and `security/confine.ts` (E-02); this
 * module resolves a root and nothing more.
 */
export function packDir(name: string): URL {
  return new URL(`${name}/`, PACKS_DIR);
}
