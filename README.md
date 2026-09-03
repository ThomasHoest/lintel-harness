# Lintel Harness

**A harness template generator.** It produces the scaffolding an agentic
project needs before any real work starts: agent roles, agent teams, the
process and its document templates, behavioural guidelines, folder
structure, and the skills and automations that make it run.

The unit of delivery is a **pack** — one complete, opinionated way of
working for one *kind* of project. Three ship at v1.0: `coding`, `writing`
and `planning`.

---

## Why it exists

That knowledge currently ships as **folders that get copied and
hand-edited**. Fast to apply once, impossible to update afterwards, and
silently drifting from its source the moment it lands.

The harness replaces copy-paste with a **managed apply**: real files
written into the target project, plus a **minimal manifest** recording the
pack, its version, the CLI version, the parameter answers and the scaffold
selection — and **no per-file hashes**.

That omission is the design. Applied state is **recomputed** from payload +
recipe + answers rather than remembered, which is what lets a later
`update` be *computed* rather than guessed, and what makes "this project is
correctly applied" a checked fact instead of a claim.

---

## Status — read this before trying anything

**The specification set is complete and Accepted. The CLI is being built on
the `v1.0` branch. **All six commands work** — `init`, `update`, `verify`,
`validate`, `pack info` and `skill install`.**

### Install

Once published, the package is `@linteldk/cli` and the command is `lintel`
— the two names differ on purpose, and nothing reads the package name at
runtime:

```bash
npm install -g @linteldk/cli        # global: `lintel` on your PATH
npx @linteldk/cli harness init coding --set projectName="Demo Project"
```

Node **>= 22**, and **zero runtime dependencies** — `npm install` fetches
this package and nothing else.

**Not on npm yet.** `npm publish --dry-run` passes and the release
workflow is wired, but no version has been pushed to the registry, so
both commands above will 404 until it is. Until then, install from source:

### From source

```bash
git clone https://github.com/ThomasHoest/lintel-harness.git
cd lintel-harness
npm ci
npm run build
npm link                     # puts the real `lintel` shim on your PATH

mkdir /tmp/demo && cd /tmp/demo && git init
lintel harness init coding --set projectName="Demo Project"
```

`npm unlink -g @linteldk/cli` removes the link again.

**Use `npm link`, not `node path/to/dist/cli/main.js`.** Running the entry
file directly works, and that is the problem: it is not how anybody runs
this. The `bin` shim is a symlink, and the entry-point guard that decides
*"was I started as a program, or imported?"* has to resolve it — when that
guard compared strings instead of realpaths, `lintel --version` exited 0
and printed **nothing**, while every test, and this README, kept passing
because they all invoked the file by its real path. `npm link` is what
exercises the path a user actually takes.

That prints the security disclosure to stderr — every path where an answer
is written into content, every agent file with its frontmatter verbatim,
delimited by a per-run nonce — then applies the pack:

```
lintel: applied coding 1.0.0.
  41 payload files copied verbatim to .harness/pack/
  23 files written into the project
  scaffolds: (none)

Still yours to do:
  1. Fill project-brief.md — everything the pack does reads it.
  …
```

`validate` is the CI gate, and it runs in this repo's own CI:

```
$ lintel harness validate --all --strict
lintel: coding validated, no findings.
  parameter combinations: 1
…
$ echo $?
0
```

The whole loop runs:

```
$ lintel --version
1.0.0
$ lintel harness init coding --set projectName="Demo"
$ lintel harness update --dry-run
lintel: coding 1.0.0 is already the version this lintel bundles. Nothing to update.
$ lintel harness skill install
lintel: installed the skill into .claude/skills/lintel/
```

And `verify` checks the result by **recomputing from `.harness/pack/`** —
the committed copy — rather than from the pack this CLI happens to bundle:

```
$ lintel harness verify
lintel: 23 applied paths checked.
  1 still at the template — these are yours to fill in.
```

| | |
|---|---|
| Specs and ADRs | all **Accepted** |
| Packs | **3**, each with a `pack.json` and a `recipe.json` |
| Commands | **all six work**: `init`, `update`, `verify`, `validate`, `pack info`, `skill install` |
| Epics | **F2 is complete** — zero open tasks. **F1** E-01…E-12 substantially built. **F5** E-13…E-19 built, and **E-19's acceptance gate passes**. **F3** E-23…E-25 built. **F6** E-26 built |
| Tests | **1146** — unit, integration, pack-conformance, **adversarial fixtures**, structural |
| Runtime dependencies | **zero** |

**Counts move every session, so check rather than trust this table:**

```bash
npm test                                              # the test counts
grep -c '^- \[ \]' specifications/v1.0/*-epics-and-tasks-*.md   # what is left
```

**The adversarial fixture suite is the one to run if you run one thing.**
`npm run test:adversarial` drives ~47 minimal packs, each a declared attack
with a required outcome, asserting the **exact code and exit class** — a
fixture that fails for the wrong reason has stopped testing what it was
written for. It found a real hole on its first run.

---

## Commands

Six, all under the `harness` group. `lintel harness --help` lists them;
`lintel --version` prints the version alone, for scripts.

| Command | What it does |
|---|---|
| `lintel harness init <pack>` | Applies a pack to the current project. Copies the pack verbatim to `.harness/pack/`, then runs its recipe to write files into the project, and records the answers in `.harness/manifest.json`. Prints the security disclosure first. |
| `lintel harness update` | Recomputes what the pack *would* write now and compares it against what is there. Unedited files are replaced; **edited files are left alone and reported**; `adapted` paths are never blindly replaced. **No merge engine, by design** — reconciling an edited file is a conversation, not a diff. `--dry-run` reports without writing (this is the former `status` command, folded in by Q-62); `--rollback` undoes an interrupted run from its journal. |
| `lintel harness verify` | Read-only. Recomputes the applied state from `.harness/pack/` + recipe + recorded answers and classifies every applied path: `match`, `adapted`, `filled`, `unfilled`, `differs`, `missing`. Changes nothing. |
| `lintel harness validate <pack>` | Checks a pack *as a pack* — nine-part anatomy, recipe schema, glob dialect, the `.claude/` permission rules, credential-shaped parameters. `--all` validates the bundled packs; `--strict` promotes defects, never notices. |
| `lintel harness pack info <pack>` | Renders what an apply would do, completely, without doing it — every step, every destination, every parameter the pack will ask for. |
| `lintel harness skill install` | Installs the Claude Code skill that drives the CLI and handles the judgment steps `update` deliberately does not automate. |

**`verify` and `pack info` write nothing, and `update --dry-run` writes
nothing.** If you want to know what would happen, there is always a command
that tells you without doing it.

Flags are per-command rather than global: `init` takes `--set`,
`--scaffold`, `--force` and `--rollback`; `update` takes `--dry-run`,
`--json` and `--rollback`; `validate` takes `--all`, `--strict` and
`--json`. **`lintel harness <command> --help` lists a command's flags**,
and a bad flag names them too.

## How an apply works

**Two phases**, and the split is the whole architecture.

**Phase 1 — a verbatim copy.** The pack is copied into `.harness/pack/`
byte for byte. No transformation, no filtering, no file skipped, and
identical for every pack. `.harness/pack/` is therefore *what the pack
shipped* — which is what lets `verify` and `update` recompute against it
later without asking what any particular apply chose to do.

**Phase 2 — a declarative recipe.** A per-pack `recipe.json` over a
**closed set of six primitives**: `copy`, `rename`, `strip-suffix`,
`rewrite-path`, `substitute`, `generate`. It reads from the phase-1 copy,
never from the pack directly.

**The set is closed, and there is no escape hatch** — no `exec`, no
`script`, no `shell`. That absence is a shipping property, asserted by a
structural test rather than remembered. The argument that makes it safe to
write arbitrary pack content into somebody's repository is not that the CLI
is careful; it is that the **vocabulary is finite and inspectable**, so
`pack info` can render the complete list of what an apply will do and a
person can read it first.

---

## Repository layout

```
.
├── .claude/          META — the agents and commands operating on THIS repo
├── packs/            PRODUCT — the three pack sources that ship
├── src/              the CLI (v1.0 branch)
├── tests/            integration, pack-conformance, structural
├── specifications/   the brief, the five cross-cutting specs, F1…F6
└── scripts/          gen-diag.mjs, migration-diff.mjs
```

**Two levels, and confusing them is the easiest mistake here.** An edit
under `.claude/` changes how *this project* is built. An edit under
`packs/` changes *what the product ships*. See `CLAUDE.md`.

---

## Where to read next

| You want | Read |
|---|---|
| The map of the repository | **`CLAUDE.md`** |
| To write code against the spec | **`DEVELOPING.md`** |
| Scope, and every decision with its rationale | `specifications/project-brief.md` — **§12 is the register** |
| The pack format, the manifest, the error catalogue | `specifications/v1.0/F1-spec-pack-format-and-manifest.md` |
| What to build in what order | `specifications/v1.0/build-order.md` |
| To change anything | **`CONTRIBUTING.md`** |
| What is left, per feature | `specifications/v1.0/*-epics-and-tasks-*.md` — **100 open tasks** across F1, F2, F3, F5, F6 |
| The security posture | **`SECURITY.md`** |

**Read `§12` rather than a summary of it.** Restated decisions go stale;
this README deliberately restates none.

---

## A note on the specs

They are unusually long, and that is deliberate. Nearly every rule carries
**why it is that way and what breaks if it is reversed** — because this
project keeps finding that a rule stated without its reasoning is a rule
somebody later "simplifies" into a defect.

Roughly two dozen defects have been found by **implementing** a rule rather
than by reading it, and they cluster into one shape: *prose that names a
fault reads exactly like prose that codes one*. Two error codes were
missing entirely. A control character in a path forged a line inside the
integrity digest. `executableRoots` refused every root it permitted. Three
separate remedy lines told users to run commands that do not exist.

When a task looks like transcription, it is usually the one about to find
something.

---

## Releasing

`npm run release:check` names every blocker and every unmade decision, and
`.github/workflows/release.yml` refuses to publish while any stands. It is
**tag-triggered** — a push to `v1.0` is work in progress; a tag is somebody
saying *this one* — and the full three-platform matrix runs before the
publish rather than after.

The registry is **public npm** — `@linteldk/cli`, MIT, published with
provenance so the package page links back to the workflow run and commit
that built it.

**Two prerequisites**, neither checkable from here: the `@lintel` scope
must exist and be yours on npmjs.com, and an `NPM_TOKEN` secret with
publish rights on it. A 404 on the package proves it is unpublished, not
that the scope is free.

## Licence

**MIT** — see `LICENSE`.

The repository is **public**. It is not currently accepting outside
contributions (see `CONTRIBUTING.md`), which is a statement about the
working process rather than about the licence: the code is yours to use,
fork and modify.
