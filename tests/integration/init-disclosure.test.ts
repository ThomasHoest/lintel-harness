/**
 * T-2203 — the disclosure, captured the way a consumer captures it.
 *
 * F6's IM-10 requires the skill to relay the block as a **contiguous,
 * unmodified substring** of `init`'s stderr. F6 does not exist yet, so
 * this stands in for its consumer: it reads the nonce off the begin line,
 * matches the end line against **what it read**, and takes the slice
 * between them.
 *
 * ── Read §8 of the Mode A review before touching any of this ──────────
 *
 * The delimiters carry a **per-run nonce** (C-59) because three rounds of
 * matching rules were beaten in turn — by a trailing space, then by a
 * non-breaking space — and the fourth fix stopped trying to out-guess the
 * reader. A pack cannot forge what it cannot predict: pack content is
 * fixed before the run, the nonce comes from `node:crypto` per invocation,
 * and a stale nonce matches neither this run's begin line nor its
 * containment check.
 *
 * **The cost is stated in C-59 and lands here: the block is no longer
 * byte-identical between two runs.** A test pinning it verbatim would fail
 * on every second run — correctly, and while revealing nothing. So the
 * nonce is matched as a pattern, and the two properties that survive are
 * asserted instead: the same value on both lines of one run, and a
 * different value between runs.
 *
 * ── The nonce is `init`'s alone (C-62) ────────────────────────────────
 *
 * `pack info` renders the same rows and emits **no delimiters**, because
 * `pack info --json` is a machine contract G-F1-9 rests on and a per-run
 * value would make it differ on every invocation. That scoping is asserted
 * here too: it is one line, and the over-application it forbids is the
 * obvious way to fold C-59.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EXIT, runCli, withTempDir } from '../harness/cli.js';
import { DISCLOSURE_TEXT } from '../../dist/security/consent.js';

/** How a consumer that was handed nothing finds the begin line. It reads
 *  the nonce; it never knows it. F1 requires at least 64 bits of
 *  lowercase hex, so sixteen hex digits is the floor. */
const BEGIN = /^--- lintel disclosure begin ([0-9a-f]{16,}) ---$/m;

/**
 * The delimiter **shape**, any nonce or none — C-61's regex, restated
 * from the consumer's side.
 *
 * The point of restating it is that this is the *sloppy* consumer C-61
 * exists to protect: a reader matching the shape rather than the exact
 * nonce would re-sync on any line of this form. Asserting that no such
 * line appears inside the block is the evidence that the containment
 * check is doing its job on real packs, rather than being a rule nobody
 * has run against content.
 */
const SHAPE = /-{3,}\s*lintel\s+disclosure\s+(?:begin|end)/;

/** The four US-13 rows, in the order F1's table gives them. Taken from the
 *  emitter's own constants rather than retyped: a test that restates
 *  wording is a second copy of it, and the copies drift. */
const HEADINGS = [
  DISCLOSURE_TEXT.executables.heading,
  DISCLOSURE_TEXT.inertHooks.heading,
  DISCLOSURE_TEXT.substitutions.heading,
  DISCLOSURE_TEXT.agents.heading,
] as const;

interface Captured {
  readonly nonce: string;
  /** The rows, exclusive of both sentinels. */
  readonly rows: readonly string[];
  /** The whole block, sentinels included, exactly as stderr carried it. */
  readonly block: string;
  readonly stderr: string;
  readonly stdout: string;
}

/** Exactly what a consumer does: find the begin line, read the nonce off
 *  it, find the end line carrying **that** nonce, take the slice. */
function capture(stdout: string, stderr: string): Captured {
  const m = BEGIN.exec(stderr);
  assert.ok(m, 'no begin line on stderr');
  const nonce = m[1]!;

  const begin = `--- lintel disclosure begin ${nonce} ---`;
  const end = `--- lintel disclosure end ${nonce} ---`;
  const from = stderr.indexOf(begin);
  const to = stderr.indexOf(end);
  assert.ok(to > from, 'the end line must follow the begin line');

  const block = stderr.slice(from, to + end.length);
  const rows = block.split('\n').slice(1, -1);
  return { nonce, rows, block, stderr, stdout };
}

async function applyAndCapture(pack: string, argv: readonly string[]): Promise<Captured> {
  return withTempDir(async (dir) => {
    const r = await runCli(['harness', 'init', pack, ...argv], dir);
    assert.equal(r.code, EXIT.ok, r.stderr);
    return capture(r.stdout, r.stderr);
  });
}

const RUNS: Readonly<Record<string, readonly string[]>> = {
  coding: ['--set', 'projectName=Demo Project'],
  planning: ['--calibration', 'high-floor'],
};

for (const pack of Object.keys(RUNS)) {
  test(`${pack}: the two sentinels appear once each, in order, sharing one nonce`, async () => {
    const c = await applyAndCapture(pack, RUNS[pack] ?? []);

    const begins = c.stderr.split('\n').filter((l) => l.startsWith('--- lintel disclosure begin '));
    const ends = c.stderr.split('\n').filter((l) => l.startsWith('--- lintel disclosure end '));
    assert.equal(begins.length, 1, 'exactly one begin line');
    assert.equal(ends.length, 1, 'exactly one end line');
    assert.equal(begins[0], `--- lintel disclosure begin ${c.nonce} ---`);
    assert.equal(ends[0], `--- lintel disclosure end ${c.nonce} ---`);
    assert.ok(c.stderr.indexOf(begins[0]!) < c.stderr.indexOf(ends[0]!));
  });

  test(`${pack}: every US-13 row lies between the sentinels, in F1's order`, async () => {
    const c = await applyAndCapture(pack, RUNS[pack] ?? []);

    let at = -1;
    for (const heading of HEADINGS) {
      const i = c.rows.indexOf(heading);
      assert.ok(i >= 0, `${heading} is missing from the block`);
      assert.ok(i > at, `${heading} is out of F1's order`);
      at = i;
      assert.equal(
        c.rows.filter((l) => l === heading).length,
        1,
        `${heading} appears more than once`,
      );
    }
  });

  /**
   * *"and nothing else does"* — the half a consumer's correctness rests
   * on. Every line between the sentinels is a US-13 heading or a row
   * indented under one; nothing foreign is interleaved, and in particular
   * no diagnostic, which would be a line a relay reproduces as if the
   * disclosure had said it.
   */
  test(`${pack}: nothing but US-13 rows lies between the sentinels`, async () => {
    const c = await applyAndCapture(pack, RUNS[pack] ?? []);
    for (const row of c.rows) {
      const isHeading = (HEADINGS as readonly string[]).includes(row);
      assert.ok(isHeading || row.startsWith('  '), `foreign line inside the block: ${row}`);
      assert.ok(!row.startsWith('lintel: '), `a diagnostic inside the block: ${row}`);
    }
  });

  /**
   * IM-10 needs the block to be a **contiguous substring** of stderr, and
   * today it is the whole of it: the capture is the block and only the
   * block, with nothing before the begin line and nothing after the end.
   *
   * **This is stronger than IM-10 requires, and it can legitimately stop
   * being true.** F2 v1.1 (b) records, unresolved, that most of
   * `validate`'s checks are unreachable from `init` — `planApply` runs
   * US-16 steps 3 and 11 only — so the `W-ANATOMY-*` notices `writing` and
   * `planning` do raise under `validate` never reach an apply. Close that
   * gap and stderr grows a diagnostic, correctly, and this assertion
   * fails while IM-10 still holds. That is the right moment to look at it,
   * which is why the reasoning is here rather than the assertion softened.
   */
  test(`${pack}: the block is contiguous, and today it is the whole of stderr`, async () => {
    const c = await applyAndCapture(pack, RUNS[pack] ?? []);
    assert.equal(c.stderr.trimEnd(), c.block, 'stderr carries the block and nothing else');
    assert.ok(!c.stdout.includes('lintel disclosure'), 'the disclosure is stderr’s (IM-10)');
    assert.ok(c.stdout.includes(`applied ${pack} `), 'and the summary is stdout’s');
  });

  /**
   * C-61, from the position of the consumer it protects. A reader matching
   * the delimiter *shape* rather than the exact nonce must find nothing to
   * re-sync on inside the rows — which is what the containment check
   * guarantees, and what `E-DISCLOSURE-FORGERY` refuses at plan time.
   */
  test(`${pack}: no row inside the block can be mistaken for a delimiter`, async () => {
    const c = await applyAndCapture(pack, RUNS[pack] ?? []);
    for (const row of c.rows) {
      assert.ok(!SHAPE.test(row.toLowerCase()), `a shape-matching consumer truncates at: ${row}`);
    }
  });

  test(`${pack}: two runs of one apply carry different nonces`, async () => {
    const a = await applyAndCapture(pack, RUNS[pack] ?? []);
    const b = await applyAndCapture(pack, RUNS[pack] ?? []);
    assert.notEqual(a.nonce, b.nonce, 'the nonce is per-invocation (C-59)');
    // And the rows themselves are unchanged, so the difference is the
    // nonce and nothing else — F1's determinism is about applied trees,
    // not stdout, and this is the boundary of what C-59 gave up.
    assert.deepEqual(a.rows, b.rows);
  });
}

/* ── the rows, on the packs that populate them ────────────────────────── */

/**
 * `planning` is the only pack that fills row 2. Its guard script ships
 * `0644` and is registered by nothing, and the row says so **on the line
 * itself** rather than once under the heading, so a reader scanning row by
 * row cannot take it for something that runs.
 */
test('planning discloses its inert hook script, stated inert on its own line', async () => {
  const c = await applyAndCapture('planning', RUNS['planning'] ?? []);
  const row = c.rows.find((l) => l.includes('.claude/hooks/kill-criteria-guard.sh'));
  assert.ok(row, 'the hook script must be disclosed');
  assert.ok(row.includes(DISCLOSURE_TEXT.inertHooks.suffix));
});

/**
 * Row 3 prints the **value verbatim**, never summarised and never counted
 * (C-28, C-43) — so a user reading the block sees what will be written
 * into their files, which is the whole reason the row exists.
 */
test('the substituted answer appears verbatim, with its parameter id', async () => {
  const c = await applyAndCapture('coding', RUNS['coding'] ?? []);
  const at = c.rows.indexOf(DISCLOSURE_TEXT.substitutions.heading);
  const rows = c.rows.slice(at + 1, c.rows.indexOf(DISCLOSURE_TEXT.agents.heading));
  assert.ok(rows.length > 0, 'coding substitutes into applied paths');
  assert.ok(rows.every((l) => /projectName = Demo Project|stack = /.test(l)), rows.join('\n'));
  assert.ok(rows.some((l) => l.includes('CLAUDE.md')));
});

/**
 * Row 4 prints **whole frontmatter blocks**, which is what made C-49
 * CRITICAL: a truncating consumer loses everything after the forged line,
 * and the block stays well-formed and shorter. So the assertion is that
 * the capture reaches the **last** agent — a truncation is invisible
 * unless something checks the far end.
 */
test('every agent file is disclosed, and the capture reaches the last of them', async () => {
  const c = await applyAndCapture('coding', RUNS['coding'] ?? []);
  const at = c.rows.indexOf(DISCLOSURE_TEXT.agents.heading);
  const rows = c.rows.slice(at + 1);
  const listed = rows.filter((l) => /^ {2}\.claude\/agents\/.+\.md$/.test(l));
  assert.equal(listed.length, 10, 'coding places ten agents');
  assert.ok(rows.includes('  .claude/agents/testwriter.md'), 'the last agent is inside the block');
  assert.ok(
    rows.some((l) => l.includes('permissionMode: readonly')),
    'the whole frontmatter, not the tools line alone (C-40)',
  );
});

/* ── C-62: the nonce is init's, and pack info stays deterministic ─────── */

test('pack info emits no delimiter and repeats byte for byte', async () => {
  await withTempDir(async (dir) => {
    const a = await runCli(['harness', 'pack', 'info', 'coding'], dir);
    const b = await runCli(['harness', 'pack', 'info', 'coding'], dir);
    assert.equal(a.code, EXIT.ok, a.stderr);

    const all = a.stdout + a.stderr;
    assert.ok(!SHAPE.test(all.toLowerCase()), 'no delimiter, so nothing needs a nonce');
    assert.equal(a.stdout, b.stdout, 'a machine contract cannot differ per invocation');
    assert.equal(a.stderr, b.stderr);
  });
});
