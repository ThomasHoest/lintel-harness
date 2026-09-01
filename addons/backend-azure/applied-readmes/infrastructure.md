# `infrastructure/` — deployment scaffolding

Whichever backend scaffold you selected at init lives under here. Only
one ships: `backend-azure` and `backend-aws` are **alternatives in the
same category**, not composable peers, because both write to
`backend-deploy/`.

| Path | What it is |
|---|---|
| `backend-deploy/` | The provisioning and deploy scripts for the backend you chose |
| `backend-deploy/README.md` | The runbook — read it before running anything |

**The deploy scripts ship executable (`0755`).** They are the only files
any pack writes with the execute bit set, they are declared in the
pack's `executableRoots`, and every one of them is listed by path in the
pre-write disclosure at init. Nothing else in an applied project is
executable.

Everything else here is `0644` and inert until you run it.

If you selected no backend scaffold, this folder does not exist.
