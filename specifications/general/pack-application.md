# Pack application — the two-phase model

**Status:** Draft · **Date:** 2026-08-31 · **Applies to:** v1.0
**Decisions:** Q-39 (two phases) · Q-40 (recipe, not script) · Q-41 (phase 2 reads the payload) · Q-42 (v1.0 scope) · Q-43 (minimal manifest) · Q-45 (anchors only) · Q-46 (no bootstrap prose)

Cross-cutting reference. How `lintel-harness init` turns a pack into a
working project. Every pack applies through this model; only phase 2's
recipe differs between packs.

---

## The two phases

| | Phase 1 — payload | Phase 2 — application |
|---|---|---|
| **What** | Verbatim copy of the pack folder | Copies out and wires up the working parts |
| **Destination** | `.harness/pack/` | Project root, `.claude/`, `copy/`, scaffold dirs |
| **Varies by pack?** | **No** — identical mechanism for every pack | **Yes** — each pack ships its own recipe |
| **Transformation** | None. No renames, no substitution, no rewriting | Renames, path rewrites, substitution, generation |
| **Reads from** | The bundled pack in the CLI | `.harness/pack/` (Q-41), never the bundle |
| **Run by** | The CLI, automatically | The CLI, automatically — never the user (Q-40) |

Phase 1 is a dumb copy on purpose. Because it transforms nothing, it
cannot fail in an interesting way, it needs no validation beyond path
confinement, and the result is byte-identical to the pack that shipped.
Everything that varies is pushed into phase 2, where it is declared and
inspectable.

---

## Flow

```mermaid
flowchart TD
    A["lintel-harness init &lt;pack&gt; [--scaffold …]"] --> B{Project already<br/>has .harness/?}
    B -- yes --> B1["E-ALREADY-APPLIED<br/>exit 1, zero bytes"]
    B -- no --> C[Resolve pack from bundle]
    C --> D[Validate pack.json<br/>anatomy · parameters · scaffolds · recipe]
    D -- invalid --> D1["exit 2, zero bytes"]
    D -- valid --> E[Collect parameter answers<br/>--set / prompts]
    E --> F[Plan both phases in memory]
    F --> G{Plan passes<br/>all checks?}
    G -- no --> G1["exit 1 or 2, zero bytes"]
    G -- yes --> H[Write journal]

    H --> P1["PHASE 1 — payload<br/>copy pack verbatim to .harness/pack/"]
    P1 --> P2["PHASE 2 — recipe<br/>read .harness/pack/, apply primitives"]
    P2 --> M[Write minimal manifest]
    M --> N[Delete journal]
    N --> Z([Applied project])

    P1 -. failure .-> R[--rollback:<br/>remove journalled paths<br/>not pre-existing]
    P2 -. failure .-> R

    style P1 fill:#1a4d7a,color:#fff
    style P2 fill:#7a3d1a,color:#fff
    style Z fill:#1a5c2e,color:#fff
```

**Everything is planned before anything is written.** Validation, both
phases and the manifest are computed in memory; the journal is written;
only then do bytes land. A failure in either phase rolls back to the
pre-init state, and rollback never deletes a file that existed before
the run.

---

## Phase 2 is a recipe, not a script

A script would make a pack **code that executes on the user's machine**,
which voids the security model — path confinement and the reserved-
destination denylist both depend on the apply plan being inspectable
*before* anything runs.

A recipe is a declared sequence over a fixed set of **six** primitives:

| Primitive | Does | Example from the coding pack |
|---|---|---|
| `copy` | Copy payload path → project path | `agents/*.md` → `.claude/agents/` |
| `rename` | Copy with a new name | `CLAUDE.md.template` → `CLAUDE.md` |
| `strip-suffix` | Drop `.template` from the name | `tone-of-voice.template.md` → `tone-of-voice.md` |
| `rewrite-path` | Replace a literal path string inside content | `template/targets/…` → `.harness/pack/targets/…` |
| `substitute` | Replace `{{harness:param.<id>}}` with an answer | project name into `CLAUDE.md` |
| `generate` | Render a file from payload + answers | `CLAUDE.md` with inert region anchors |

A pack can only do what the primitives allow. A genuinely new step
requires a new primitive in the CLI — deliberately, so the set of things
an apply can do stays enumerable.

### Determinism is a requirement, not a hope

The recipe is a pure function of **(payload, parameter answers)**. No
timestamps, no ordering dependence, no environment or network reads.
Two applies of the same pack version with the same answers produce
byte-identical trees. This is what makes "applied correctly every time"
testable, and it is why the manifest can stay minimal (Q-43): the
applied state is always recomputable from `.harness/pack/` + the recipe
+ the recorded answers, so no per-file hash list and no `.harness/base/`
store are needed.

**The purity claim holds without exception** (Q-54). `merge-json` was
the only primitive that took a fourth input — the pre-existing content
of its destination — and it is dropped from v1.0, so no primitive reads
anything outside (payload, answers, scaffold selection). `verify`'s
recomputation identity is therefore exact rather than approximate.

---

## What the coding pack's recipe encodes

The nine-step manual-apply log in `CLAUDE.md` §Dogfooding **is** this
recipe. Each hand step becomes a declared primitive:

| Manual step | Primitive |
|---|---|
| `specifications/` kit → `specifications/` | `copy` |
| `agent-teams/` → `AgentTeams/` | `copy` (with rename) |
| `targets/` → `targets/` | `copy` |
| `tone-of-voice.template.md` → `tone-of-voice.md` | `strip-suffix` |
| agents + commands → `.claude/` | `copy` |
| path rewrites in three files | `rewrite-path` |
| rewrote two self-describing READMEs | **none — see below** |
| rewrote the spec README intro | **none — see below** |
| moved the brief into `specifications/` | project content, not an apply step |

The two rewrite steps have **no primitive** because they no longer
happen. Under Q-46 the manual bootstrap prose is deleted from the pack
itself — those sections described a procedure the recipe now performs,
so they are dead content rather than content needing per-project
rewriting. This is also why phase 1 can copy verbatim: there is nothing
left in the payload that is wrong once copied.

---

## What v1.0 does not do

`update`, `status` and `contribute` are deferred to v1.1 (Q-42), and
`--adopt` is dropped (Q-44). v1.0 applies a pack; it does not maintain
one.

Two pieces of forward investment keep v1.1 an addition rather than a
retrofit:

- **The minimal manifest** records pack name, version, CLI version,
  parameter answers and chosen scaffolds — enough for a later `update`
  to know what was applied and recompute the expected tree.
- **Inert region anchors** are emitted into the generated `CLAUDE.md`
  (Q-45) so a later `update` can find pack-owned regions. No parser,
  no region hashes and no tamper detection ship at v1.0.
