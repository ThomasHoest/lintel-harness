# Bilingual publishing

How a finished post gets recorded when it ships in two languages (here: Danish
live, English as the site/reference translation). The aim is copy that is easy
to **review, diff, and re-translate**, and a machine index the website can read.

The core convention is project-agnostic; the last section notes the pieces that
are specific to this project's site (Lintel).

## One file per language

When a post publishes, put each language's prose in its **own file**, named by
post number and slug:

- `NN-slug-da.md` — the language that actually went live
- `NN-slug-en.md` — the translation / source draft

Do not keep the prose inline in the machine index (see below) and do not put two
languages in one file. Separate files diff cleanly and let a translator work on
one side without touching the other.

## File shape: header, rule, prose

Each file is a header block, a `---` rule, then the prose:

```
# Post NN — Title (published)

- **Published:** YYYY-MM-DD (channel)
- **Language:** Danish | English (note if translated from the other)
- **Other-language copy:** [`NN-slug-en.md`](NN-slug-en.md)
- **Source draft:** [`../drafts/NN-slug-v1.md`](../drafts/NN-slug-v1.md)
- **LinkedIn-URL:** https://…

---

<the prose, exactly as published>
```

Anything an importer consumes should live **after** the first `---`, so the
header never leaks into the published body. Cross-link the two language copies to
each other and back to the source draft, and record the real post URL (never a
placeholder once it is live).

## Translate last, screen last

- Write and finalize the live-language copy first; translate from the finished
  text, not a draft.
- Run the translation through [ai-tells.md](ai-tells.md) as a final pass — a
  translation is a fresh draft and picks up its own tells (stray em-dashes,
  rule-of-three, signposting).
- Match the register in [tone-of-voice.md](tone-of-voice.md) in both languages;
  a literal translation often reads stiffer than Thomas writes.

## Project-specific: the Lintel site index

In this project the machine index is
`workstreams/learning-journey/series.json`, read by the Lintel importer
(`npm run sync-posts`). Point it at the files rather than inlining prose:

```json
"bodyFile": {
  "en": "published/NN-slug-en.md",
  "da": "published/NN-slug-da.md"
}
```

On publish, also set `status: "published"` and `linkedinUrl`. The importer takes
only the prose after the first `---`, and errors if a body exists in one language
but not the other — so add both files together. After editing the index, run
`npm run sync-posts` in the lintel repo and commit the regenerated module. In
another project, swap this section for whatever that project's site/index uses;
the file convention above stays the same.
