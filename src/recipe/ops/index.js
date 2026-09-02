/**
 * The closed op registry. T-0403.
 *
 * **The only place an `op` name maps to an implementation.** Adding a
 * primitive is a change here, **and** in `types.ts`, **and in a superseding
 * ADR** — three places, deliberately, because the number of primitives is
 * the number a reviewer of `pack info` has to hold in their head, and that
 * count is the product's safety argument rather than an implementation
 * detail.
 *
 * **There is no `exec.ts`, `script.ts`, `shell.ts`, `run.ts` or seventh op
 * file of any name, and that absence is a shipping property.** A
 * structural test asserts it, because "we did not add one" and "one cannot
 * be added without noticing" are different promises, and only the second
 * survives a year of maintenance.
 *
 * The registry is **keyed by the union's own type**, so a missing arm is a
 * compile error rather than a runtime `undefined`. That is the whole
 * reason it is a `Record<RecipeOp, …>` and not a `Map`.
 *
 * ── What lives here at E-04, and what arrives at E-05 ─────────────────
 *
 * E-04 delivers the **declaration**: what each op takes, what it writes,
 * and how to narrow it. The **rendering** — the code that turns a step
 * into bytes — is E-05's, and each op's entry gains its renderer there.
 * Keeping the table here from the start is what stops E-05 introducing a
 * second, parallel switch on `op`: two places that must enumerate six arms
 * is one place too many.
 */
import { RECIPE_OPS, isEditing, isPlacing } from '../types.js';
export const OPS = {
    copy: {
        op: 'copy',
        kind: 'placing',
        sourceField: 'from',
        summary: 'copy a payload file or directory, basenames unchanged',
    },
    rename: {
        op: 'rename',
        kind: 'placing',
        sourceField: 'from',
        summary: 'copy one payload file to a different basename',
    },
    'strip-suffix': {
        op: 'strip-suffix',
        kind: 'placing',
        sourceField: 'from',
        summary: 'copy, dropping a suffix from each basename',
    },
    'rewrite-path': {
        op: 'rewrite-path',
        kind: 'editing',
        sourceField: null,
        summary: 'replace a literal string in files already written',
    },
    substitute: {
        op: 'substitute',
        kind: 'editing',
        sourceField: null,
        summary: 'resolve {{harness:…}} tokens in files already written',
    },
    generate: {
        op: 'generate',
        kind: 'placing',
        sourceField: 'template',
        summary: 'render a payload template to one applied path',
    },
};
/** The registry agrees with `types.ts` about which ops place and which
 *  edit. Two declarations of one fact, so this is asserted rather than
 *  assumed — see the test. */
export function registryAgreesWithTypes() {
    return RECIPE_OPS.every((op) => (OPS[op].kind === 'placing' ? isPlacing(op) : isEditing(op)));
}
//# sourceMappingURL=index.js.map