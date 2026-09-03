/**
 * Make the built binary executable.
 *
 * `tsc` writes `dist/cli/main.js` at 0644 and rewrites it on every build,
 * so the mode has to be reapplied here rather than committed once.
 *
 * **Installing from the registry does not need this** — npm sets the mode
 * on a `bin` target itself, which is why the tarball test passes either
 * way. `npm link` does need it: the global shim points straight at this
 * file, and a non-executable target fails with `permission denied` rather
 * than anything that names the cause. That is the same shape as the
 * entry-point bug — fine the way we test it, broken the way it is used.
 *
 * `chmod` is a no-op on Windows and does not throw there, so this needs no
 * platform guard.
 */
import { chmodSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const bin = fileURLToPath(new URL('../dist/cli/main.js', import.meta.url));
chmodSync(bin, 0o755);
