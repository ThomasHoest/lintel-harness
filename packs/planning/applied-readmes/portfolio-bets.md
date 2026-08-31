# `bets/` — one folder per bet, and nothing else

Each bet gets its own folder, named for its slug. **Nothing else lives
here** — no shared notes, no templates, no scratch files.

```
bets/
└── <slug>/
    ├── brief.md          the bet contract — six fixed fields
    ├── claims.md         the claims ledger for this bet
    ├── gate-record.md    written at the absorption gate, by a different party
    └── reviews/          one file per roadmap review of this bet
```

**`/bet <slug>` creates one** from
`.harness/pack/templates/opportunity-bet-brief.template.md`. The apply
does not create bet folders; they arrive as bets do.

## The brief's six fields are fixed

problem/opportunity · the bet · reversibility · absorption cost ·
horizon · **kill criteria**

Do not add, drop or rename them. The template is the same at both
calibrations; only the fill changes.

## Kill criteria before the bet starts

A brief whose `Kill criteria` field is empty or still at its placeholder
is **not committed**, whatever the status line says. Each criterion must
be:

- **observable** — a named signal someone could go and check;
- **dated or thresholded** — "by `<date>`" or "below `<number>`";
- **owned** — a named party responsible for looking.

`/bet` refuses to commit without them and `/review` re-checks every bet it
reviews. **Neither fires on the file write:** a bet committed by
hand-editing `brief.md` is caught at the next review, or it is not caught
at all. The guard script at `.claude/hooks/kill-criteria-guard.sh` is
inert — registered by nothing, executed by nothing.

**When one is crossed:** escalate immediately, not at the next scheduled
review. The bet is killed, or explicitly re-committed with a dated
rationale in `../decisions.md`. There is no third option.

## The gate record

Written **by a party that did not run deliver**, with a verdict that is a
named token — `PASS` or `HOLD` — not prose. An unsupervised run may carry
a bet up to the gate and may never clear it.

Status vocabulary (provisional):
`proposed | committed | held-at-gate | killed | absorbed`.
