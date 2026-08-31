# Agents

Seven sub-agent definitions. The recipe copies all seven to
`.claude/agents/`; **this README stays in the payload** and is not copied
out.

| Agent | Phase | Write boundary | Provisional? |
|---|---|---|---|
| `portfolio-steward` | intake, prioritize | the register and intake entries | **Yes** |
| `discovery-lead` | discovery | evidence notes and the claims ledger | **Yes** |
| `bet-framer` | prioritize, commit | bet briefs, pre-commit and at commit | **Yes** |
| `horizon-analyst` | commit | horizon records | **Yes** |
| `gate-reviewer` | the absorption gate | gate records only; read-only elsewhere | **Yes** |
| `learning-synthesiser` | learn | roadmap reviews and the decision log | **Yes** |
| `target-reviewer` | — | none; read-only | **No** — part 9 content |

---

## Why six of them are provisional

The research this pack was authored from supports the **phases**, the
**absorption/security gate**, the **document templates** and the
**horizon framework** directly. It does **not** support the roles.

The six portfolio roles above are **inferred from the phases**, not
sourced. The corpus carries a confirmed-gap marker on **engineering-manager
portfolio responsibility** and calls it "unwritten territory" — and that
gap sits exactly on the seam between this pack and the `coding` pack,
which is the seam these roles are drawn across. The research's own
instruction was to settle roles at spec time and not overclaim, so they
ship **marked provisional in the files themselves** as well as in
`pack.json`'s anatomy declaration.

What that means in practice: treat each role's phase assignment and write
boundary as a **proposal**. If it does not match how a real organisation
works, change it — and say so, rather than working around it silently.
The intended revision point is after the first real portfolio has run
through the loop.

**`target-reviewer` is not provisional.** It arrives with this pack's own
copy of the targets contract, which is evidenced content rather than an
inferred portfolio role, and it is declared under anatomy part 9 rather
than part 2. The provisional note in `pack.json` covers the six roles
above and says so.

## Two properties that are NOT provisional

Both follow from the process rather than from the role literature, and
neither may be relaxed while revising the rest:

1. **The gate reviewer must be a different party from whoever ran
   `deliver`.** Non-delegability is a separation-of-duties claim. It is
   structurally the same relationship the `coding` pack keeps between its
   implementer and its security reviewer.
2. **The gate verdict must be a named token, not prose** — `PASS` or
   `HOLD`. The same decision that makes `READY` / `NEEDS-CORRECTION`
   auditable on a target.

## Frontmatter

Each file is self-contained: frontmatter configures the name, the trigger
description, the tool whitelist, the model and the turn cap; the body is
the system prompt.

**No agent, command or skill file in this pack declares a permission
grant.** The `tools:` whitelist is the real boundary — the read-only
agents omit `Write`, `Edit` and `Bash` for exactly that reason. Stock
Claude Code recognises `name`, `description`, `tools` and `model`;
`maxTurns` is a convention some harnesses honour and others ignore, so do
not rely on it as a hard guarantee.

## Customising

Three places take most edits: `description:` (the trigger text), `model:`
and each body's **Context discovery** section, which names the files the
agent reads. Beyond those, leave the prompts alone unless there is a
specific reason — with the standing exception of the six provisional
roles' boundaries, which are meant to be revised.
