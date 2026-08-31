# `.harness/` — how this project was generated

Tool state. You can read it; you should not hand-edit it.

| Path | What it is |
|---|---|
| `pack/` | The **payload** — a verbatim copy of the pack this project was generated from. Process docs, document templates and conventions live here and are read from here. Never edited per project. |
| `manifest.json` | What was applied: pack name, pack version, CLI version, the parameter answers you gave, and the scaffolds you chose. |

The payload is the reference material for this project's way of working.
When a document template or a process question comes up, look in
`pack/` — it is not duplicated anywhere else in the tree.

`manifest.json` is committed deliberately. It records nothing secret,
and it is what lets a future `lintel-harness` version know what this
project was generated from.
