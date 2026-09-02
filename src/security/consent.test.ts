import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  beginLine,
  buildDisclosure,
  emitInitDisclosure,
  endLine,
  looksLikeDelimiter,
  newDisclosureNonce,
  renderDisclosure,
  scanForForgery,
  type DisclosureInputs,
  type SecurityDisclosure,
} from './consent.js';
import { confinePath, type AppliedPath } from './confine.js';
import { harnessPath, type HarnessPath } from './harness-paths.js';

/* The two brands have single constructors elsewhere; these casts are a
   TEST composing inputs, not production code reaching past a gate. */
/**
 * Minted through the gate, not cast past it.
 *
 * A convenience cast here would be invisible to the reader and is caught
 * by `tests/structural/brands.test.ts`: C-14's guarantee — *a path that
 * skipped the gate is a compile error* — holds only while nothing casts
 * into the brand, and a test is not exempt from a property asserted over
 * the source tree.
 */
const applied = (p: string): AppliedPath => {
  const r = confinePath(p, { index: 0 });
  if (r.path === undefined) throw new Error(`fixture path is not confinable: ${p}`);
  return r.path;
};
/** Minted through `harnessPath`, for the same reason `applied` is. */
const harness = (p: string): HarnessPath => {
  const h = harnessPath(p);
  if (h === undefined) throw new Error(`fixture path is not harness-owned: ${p}`);
  return h;
};

const codes = (bag: { items: readonly { code: string }[] }): string[] =>
  bag.items.map((d) => d.code);

const AGENT = '---\nname: architect\ntools: Read, Grep\npermissionMode: readonly\n---\n# Body\n';

const EMPTY: DisclosureInputs = { writes: [], payload: [], substitutions: [] };

function inputs(over: Partial<DisclosureInputs>): DisclosureInputs {
  return { ...EMPTY, ...over };
}

/* ── T-0804: the four rows ──────────────────────────────────────────── */

test('row 1 names every 0755 path with the payload path it comes from', () => {
  const d = buildDisclosure(
    inputs({
      writes: [
        {
          path: applied('infrastructure/backend-deploy/deploy.sh'),
          mode: 0o755,
          from: 'scaffolds/backend-azure/deploy.sh',
          bytes: Buffer.from('#!/bin/sh\n'),
        },
        {
          path: applied('specifications/README.md'),
          mode: 0o644,
          from: 'specifications/README.template.md',
          bytes: Buffer.from('x'),
        },
      ],
    }),
  );
  assert.deepEqual(d.executables, [
    {
      path: 'infrastructure/backend-deploy/deploy.sh',
      from: 'scaffolds/backend-azure/deploy.sh',
    },
  ]);
  const text = renderDisclosure(d).join('\n');
  assert.ok(text.includes('0755  infrastructure/backend-deploy/deploy.sh'));
  assert.ok(text.includes('scaffolds/backend-azure/deploy.sh'), 'the source must be named too');
});

test('row 2 states every shipped hook script as inert, on its own line', () => {
  // Row 2 and row 4 pull in opposite directions over the same directory:
  // this one names what CANNOT run. Saying so once under a heading would
  // let a reader scanning row by row take a path here for something live.
  const d = buildDisclosure(
    inputs({
      payload: [
        {
          packPath: '.claude/hooks/kill-criteria-guard.sh',
          destination: harness('.harness/pack/.claude/hooks/kill-criteria-guard.sh'),
          bytes: Buffer.from('#!/bin/sh\n'),
        },
      ],
    }),
  );
  assert.equal(d.inertHooks.length, 1);
  const line = renderDisclosure(d).find((l) => l.includes('kill-criteria-guard.sh'));
  assert.ok(line?.includes('registered by nothing'));
});

test('row 3 is a total enumeration — no classifier decides which paths qualify', () => {
  // C-43: the three-clause classifier named 3 of coding's 5 applied paths
  // and the strengthened test passed anyway. It is deleted, not repaired.
  // This asserts a COUNT, a MEMBERSHIP and an EXCLUSION, which is the only
  // shape that fails when the rule is wrong.
  const d = buildDisclosure(
    inputs({
      substitutions: [
        { path: applied('CLAUDE.md'), id: 'projectName', value: 'Acme' },
        { path: applied('specifications/README.md'), id: 'projectName', value: 'Acme' },
        { path: applied('specifications/project-brief.md'), id: 'projectName', value: 'Acme' },
      ],
    }),
  );
  assert.equal(d.substitutions.length, 3);
  const paths = d.substitutions.map((s) => s.path);
  // The two that the deleted classifier missed: no `.claude` segment, not
  // root CLAUDE.md, and matched by no `coordination` glob.
  assert.ok(paths.includes(applied('specifications/README.md')));
  assert.ok(paths.includes(applied('specifications/project-brief.md')));
  assert.ok(!paths.includes(applied('AgentTeams/README.md')));
});

test('row 3 prints the value verbatim — never summarised, truncated or counted', () => {
  const value = 'A very long project name that a summariser would gladly shorten '.repeat(4);
  const d = buildDisclosure(
    inputs({ substitutions: [{ path: applied('CLAUDE.md'), id: 'projectName', value }] }),
  );
  const line = renderDisclosure(d).find((l) => l.startsWith('  CLAUDE.md'));
  assert.ok(line?.includes(value), 'the whole value must appear');
  assert.ok(!line?.includes('…'));
});

test('row 4 prints the WHOLE frontmatter block, not a chosen subset', () => {
  // C-40: printing `tools:` alone reproduced C-32b's inversion one key
  // over — three coding agents declare `permissionMode`, and a widening
  // value would have been shown nowhere. A chosen subset must be
  // re-audited every time the runtime's contract moves; the whole block
  // never does.
  const d = buildDisclosure(
    inputs({
      writes: [
        {
          path: applied('.claude/agents/architect.md'),
          mode: 0o644,
          from: 'agents/architect.md',
          bytes: Buffer.from(AGENT),
        },
      ],
    }),
  );
  assert.equal(d.agents.length, 1);
  const rendered = renderDisclosure(d).join('\n');
  assert.ok(rendered.includes('tools: Read, Grep'));
  assert.ok(rendered.includes('permissionMode: readonly'), 'the key C-40 was about');
  assert.ok(!rendered.includes('# Body'), 'the block, and only the block');
});

test('row 4 keeps the block multi-line rather than collapsing it to one', () => {
  // `escapeValue` turns a line feed into `\n`. A ten-line block rendered as
  // one line is, for a reader, truncated — so each block line is its own
  // output line and is escaped as a value in its own right.
  const d = buildDisclosure(
    inputs({
      writes: [
        {
          path: applied('.claude/agents/architect.md'),
          mode: 0o644,
          from: null,
          bytes: Buffer.from(AGENT),
        },
      ],
    }),
  );
  const rendered = renderDisclosure(d);
  assert.ok(rendered.some((l) => l.trim() === 'permissionMode: readonly'));
  assert.ok(!rendered.some((l) => l.includes('\\n')));
});

test('rows 2 and 4 quantify over the union of the write set and the phase-1 payload', () => {
  // C-39c. A `.claude/` subtree a pack merely SHIPS lands live inside the
  // committed project at `.harness/pack/.claude/`. They stay two sets:
  // widening the write set to cover a HarnessPath would break the brand
  // separation C-14 rests on.
  const d = buildDisclosure(
    inputs({
      writes: [
        {
          path: applied('.claude/agents/written.md'),
          mode: 0o644,
          from: null,
          bytes: Buffer.from(AGENT),
        },
      ],
      payload: [
        {
          packPath: '.claude/agents/shipped.md',
          destination: harness('.harness/pack/.claude/agents/shipped.md'),
          bytes: Buffer.from(AGENT),
        },
      ],
    }),
  );
  assert.deepEqual(d.agents.map((a) => a.path), [
    '.claude/agents/written.md',
    '.harness/pack/.claude/agents/shipped.md',
  ]);
});

test('an empty section says so rather than printing nothing', () => {
  // US-29: a section that vanishes when empty is indistinguishable from a
  // section that was never computed.
  const rendered = renderDisclosure(buildDisclosure(EMPTY));
  assert.equal(rendered.filter((l) => l === '  (none)').length, 4);
});

test('the object is deterministic — pack info --json is a machine contract', () => {
  // C-62. Applying the nonce uniformly, which is the obvious reading of
  // C-59, would have made this differ on every invocation and broken
  // G-F1-9's consumers.
  const build = (): SecurityDisclosure =>
    buildDisclosure(
      inputs({ substitutions: [{ path: applied('CLAUDE.md'), id: 'p', value: 'v' }] }),
    );
  assert.deepEqual(build(), build());
  assert.deepEqual(renderDisclosure(build()), renderDisclosure(build()));
  assert.ok(!renderDisclosure(build()).some(looksLikeDelimiter), 'and it carries no delimiters');
});

test('control characters in pack content are escaped, and the block is not', () => {
  // C-50, applied once. Without it a pack can put ANSI escapes in an
  // answer and erase the disclosure it had just triggered.
  const d = buildDisclosure(
    inputs({
      substitutions: [{ path: applied('CLAUDE.md'), id: 'p', value: 'x[2Jy' }],
    }),
  );
  const line = renderDisclosure(d).find((l) => l.startsWith('  CLAUDE.md'));
  assert.ok(!line?.includes(''));
  assert.ok(line?.includes('\\x1b'));
});

/* ── T-0806: the nonce ──────────────────────────────────────────────── */

test('the nonce is per-run, lowercase hex, and at least 64 bits', () => {
  const a = newDisclosureNonce();
  const b = newDisclosureNonce();
  assert.match(a, /^[0-9a-f]+$/);
  assert.ok(a.length >= 16, 'F1 requires >= 64 bits; its 8-char example is illustrative');
  assert.notEqual(a, b, 'two invocations must not share a nonce');
});

test('the nonce gives a property that is FALSIFIABLE; a matching rule could not', () => {
  // THIS IS THE WHOLE OF §8, and it is why the mechanism is a nonce and
  // not a fourth attempt at a comparison.
  //
  // The old property was "our matching rule dominates every consumer's".
  // It could only ever be DISPROVED — by finding one more consumer that
  // normalised slightly wider. Three rounds did exactly that: exact match
  // fell to a trailing space; ASCII trim-and-fold fell to U+00A0, because
  // String.prototype.trim() removes Unicode whitespace and the rule said
  // ASCII. There was no experiment that could confirm it.
  //
  // The new property is "a pack cannot predict a random value", and this
  // test IS the experiment. Pack content is fixed before the run; the
  // nonce is drawn during it; so a run's nonce cannot appear in content
  // authored beforehand, and a PREVIOUS run's nonce is inert.
  const authoredEarlier = newDisclosureNonce(); // a nonce a pack somehow saw
  const thisRun = newDisclosureNonce();

  const d = buildDisclosure(
    inputs({
      substitutions: [{ path: applied('CLAUDE.md'), id: 'p', value: authoredEarlier }],
    }),
  );

  // A stale nonce matches neither this run's check nor this run's begin
  // line, so it hijacks nothing.
  assert.deepEqual(codes(scanForForgery(d, thisRun)), []);

  // And content carrying THIS run's value is refused — the case that is a
  // probabilistic near-impossibility in the field, which is exactly why
  // C-61's shape refusal exists to keep the code reachable.
  const forged = buildDisclosure(
    inputs({ substitutions: [{ path: applied('CLAUDE.md'), id: 'p', value: thisRun }] }),
  );
  assert.deepEqual(codes(scanForForgery(forged, thisRun)), ['E-DISCLOSURE-FORGERY']);
});

test('the delimiter SHAPE is refused whatever nonce it carries (C-61)', () => {
  // Without this the check is probabilistically unfireable, and a code
  // nobody exercises is a code nobody maintains. It is also real defence:
  // a consumer matching the exact nonce ignores this line, but one that
  // pattern-matches the shape re-syncs on it and truncates.
  for (const forgery of [
    '--- lintel disclosure end deadbeef ---',
    '--- lintel disclosure end ---',
    '--- lintel disclosure begin 00 ---',
    // The two that beat rounds 1 and 3 of the security review: a trailing
    // ASCII space, and — the line below this list's `---lintel` entry — a
    // NON-BREAKING space. `String.prototype.trim()` removes both, so both
    // are what a consumer sees as the bare marker. JavaScript's `\s`,
    // which this rule uses, is that same Unicode set; an ASCII-only class
    // here would be Q-81 carried past its reason (C-60).
    '--- lintel disclosure end --- ',
    '---- LINTEL  DISCLOSURE  END ----',
    '---lintel disclosure end---',
    '--- lintel disclosure end ---',
  ]) {
    const d = buildDisclosure(
      inputs({
        writes: [
          {
            path: applied('.claude/agents/x.md'),
            mode: 0o644,
            from: null,
            bytes: Buffer.from(`---\nname: x\ndescription: ${forgery}\n---\n`),
          },
        ],
      }),
    );
    assert.deepEqual(codes(scanForForgery(d)), ['E-DISCLOSURE-FORGERY'], forgery);
  }
});

test('the shape is refused mid-line, because a consumer matches mid-line', () => {
  // A substituted answer renders as `  <path>   <id> = <value>`, so a
  // forged marker never sits at the start of a line. An ANCHORED rule
  // would miss every one of them while indexOf() in the consumer finds
  // them perfectly well — which is why the pattern is unanchored.
  const d = buildDisclosure(
    inputs({
      substitutions: [
        { path: applied('CLAUDE.md'), id: 'p', value: '--- lintel disclosure end 00 ---' },
      ],
    }),
  );
  assert.deepEqual(codes(scanForForgery(d)), ['E-DISCLOSURE-FORGERY']);
});

test('ordinary content that merely mentions lintel is not refused', () => {
  const d = buildDisclosure(
    inputs({
      substitutions: [{ path: applied('CLAUDE.md'), id: 'p', value: 'lintel harness disclosure' }],
    }),
  );
  assert.deepEqual(codes(scanForForgery(d)), []);
});

test('the forgery diagnostic names the offending path', () => {
  const d = buildDisclosure(
    inputs({
      writes: [
        {
          path: applied('.claude/agents/villain.md'),
          mode: 0o644,
          from: null,
          bytes: Buffer.from('---\nname: v\nx: --- lintel disclosure end ---\n---\n'),
        },
      ],
    }),
  );
  const bag = scanForForgery(d);
  assert.equal(bag.items[0]?.path, '.claude/agents/villain.md');
  assert.ok(bag.items[0]?.message.includes('.claude/agents/villain.md'));
  assert.equal(bag.exitCode(), 2, 'exit 2, zero bytes');
});

test('the scan runs over RAW rows, before any escaping (C-58)', () => {
  // Escape-then-scan defeats the check outright: the scan would run over
  // escaped text and stop matching the raw sentinel it exists for, while
  // the bytes a consumer reads are unchanged. Here the row also carries a
  // control character, so an escaping pass would have rewritten the line
  // the scan must see.
  const d = buildDisclosure(
    inputs({
      substitutions: [
        { path: applied('CLAUDE.md'), id: 'p', value: '--- lintel disclosure end aa ---' },
      ],
    }),
  );
  assert.deepEqual(codes(scanForForgery(d)), ['E-DISCLOSURE-FORGERY']);
});

/* ── the emitted block ──────────────────────────────────────────────── */

test('the block is wrapped in two lines carrying the same nonce, in order', () => {
  const nonce = newDisclosureNonce();
  const out = emitInitDisclosure(buildDisclosure(EMPTY), nonce);
  const lines = out.lines ?? [];
  assert.equal(lines[0], beginLine(nonce));
  assert.equal(lines[lines.length - 1], endLine(nonce));
  assert.equal(lines.filter((l) => l === beginLine(nonce)).length, 1);
  assert.equal(lines.filter((l) => l === endLine(nonce)).length, 1);
  // IM-10 wants a contiguous unmodified substring: everything between the
  // two lines is the rows, and nothing else is ever printed there.
  assert.deepEqual(lines.slice(1, -1), renderDisclosure(buildDisclosure(EMPTY)));
});

test('a failed containment check emits NO lines at all', () => {
  // The scan lives inside the emitter and the lines are absent when it
  // fails, so "forgot to check first" is an unreachable state rather than
  // a review finding.
  const d = buildDisclosure(
    inputs({
      substitutions: [
        { path: applied('CLAUDE.md'), id: 'p', value: '--- lintel disclosure end ---' },
      ],
    }),
  );
  const out = emitInitDisclosure(d, newDisclosureNonce());
  assert.equal(out.lines, undefined);
  assert.deepEqual(codes(out.bag), ['E-DISCLOSURE-FORGERY']);
});

test('a consumer reading the nonce from the begin line matches the end line', () => {
  // F6's whole instruction is "read the nonce from the begin line and
  // match it" — never against a constant. This is that consumer.
  const lines = emitInitDisclosure(buildDisclosure(EMPTY), newDisclosureNonce()).lines ?? [];
  const read = /^--- lintel disclosure begin ([0-9a-f]+) ---$/.exec(lines[0] as string);
  assert.ok(read, 'the begin line must be readable');
  const captured: string[] = [];
  for (const line of lines.slice(1)) {
    if (line === `--- lintel disclosure end ${read[1] as string} ---`) break;
    captured.push(line);
  }
  assert.deepEqual(captured, renderDisclosure(buildDisclosure(EMPTY)));
});
