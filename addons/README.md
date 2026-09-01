# `addons/` — small add-on packs, for v1.1

**Nothing in this folder ships at v1.0, and nothing applies it.** There is
no CLI, and the CLI that F2 builds will not know what an add-on is. These
are parked, not supported.

---

## Why this folder is not `packs/`

`packs/` means **what ships at v1.0**. That is not a convention — it is an
invariant several checks rely on: `lintel harness validate --all` walks it,
`find packs -name pack.json` is the repo's own inventory check, and F5's
E-13 asserts the count and conformance of everything in it.

An unsupported v1.1 pack sitting in `packs/` would be swept up by every one
of those and would read, to anyone browsing, as a fourth shipping pack. So
add-ons live here until the mechanism that applies them exists.

---

## What an add-on is, and how it differs from a pack

| | Pack | Add-on |
|---|---|---|
| Answers | *how do we work?* | *what infrastructure or presentation layer do we bolt on?* |
| Count per project | **exactly one** (F1's one-pack invariant) | zero or more, composed onto a pack |
| Ships a full anatomy | yes — all nine parts | no — it is content plus a recipe, nothing else |
| Applied by | `lintel harness init <pack>` | **v1.1, mechanism undesigned** |

The distinction that matters: **a project cannot hold two packs**, because
a pack is a whole way of working and two of them contradict each other. An
add-on carries no way of working, so composing several is coherent.

---

## What is here

| Add-on | Category | Was |
|---|---|---|
| `backend-azure/` | `backend` | `packs/coding/scaffolds/backend-azure/` |
| `backend-aws/` | `backend` | `packs/coding/scaffolds/backend-aws/` |

Both declare `"category": "backend"`. **That declaration is currently
decorative** — no mechanism reads it, because no mechanism applies an
add-on. Whether it survives into F7 unchanged is **Q-83**, which is open:

- On *scaffolds*, `category` did two opposite jobs from one field. Same
  category → **alternatives**, refuse at selection (`E-SCAFFOLD-EXCLUSIVE`).
  Different or absent → **must not overlap**, caught statically as an
  authoring error (`E-SCAFFOLD-COLLISION`).
- On *add-ons*, a third case appears that scaffolds never had: an add-on
  may collide with **its pack**, not only with another add-on.
- And `category` is an **open string**. One pack author picks their own
  values coherently; independently authored add-ons share a namespace
  **nobody owns**, so two can mean different things by `backend`, or miss
  each other by spelling it differently, with nothing detecting either.

Do not treat the two `"category": "backend"` lines here as a settled part
of the add-on format. They record what these two units *were*, which is
useful input to F7 and not a decision it has taken.

**Expected to follow at v1.1:** `presentation`, which Q-28 deferred as a
shared component and which is a better fit here than as a pack.

---

## The `recipe.json` files are records, not instructions

Each add-on carries the steps its coding-pack scaffold actually ran. **No
CLI reads them.** They exist so the v1.1 mechanism starts from what worked
rather than from a reconstruction — the scaffold branches were deleted from
`packs/coding/recipe.json` in the same change that created this folder, and
a deleted step set is very hard to recover accurately six months later.

Do not treat the format as settled. An add-on recipe may well need
primitives or a composition rule a pack recipe does not, and deciding that
is v1.1's work.

---

## What their removal cost v1.0, stated so it is not rediscovered

Taking these out of `coding` left **`writing-workstream` as the only
scaffold in the product**, and that has two consequences F1 must handle
with adversarial fixtures rather than with a bundled pack:

- **Scaffold exclusivity has no real subject.** One scaffold cannot
  conflict with another, so `E-SCAFFOLD-EXCLUSIVE` and the `category` rule
  are exercised only by fixtures.
- **No v1.0 pack ships an executable.** All four were here, so
  `executableRoots`, the `0755` disclosure and `E-EXEC-DEST-FORBIDDEN`
  likewise have fixture coverage only.

Neither is a reason to keep the scaffolds in `coding`. Both are a reason
the fixture suite is now the *only* coverage for two security-relevant
rules, which is worth knowing before someone trims it.
