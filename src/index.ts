/**
 * Library entry point.
 *
 * Re-exports exactly the public interface contract of `F1-ADR-001`. It grows
 * as the contract is built; anything not exported here is internal, and a
 * downstream feature reaching past it is a defect rather than a shortcut.
 */
export { packsDir, packDir } from './paths.js';
