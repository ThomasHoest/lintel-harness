# Research — {{Topic}}
**Status:** {{Draft | In Review | Accepted | Superseded}}
**Date:** {{YYYY-MM-DD}}
**Author:** {{name / agent}}
**Feeds into:** `spec-{{feature}}.md`, `ADR-{{NNN}}-{{feature}}.md`

---

## Question

{{One paragraph. What are we trying to learn, and what decision rides
on the answer? Be specific — "should we use library X?" beats
"research library X".}}

---

## Summary (3–5 sentences)

{{The answer, stated directly. Lead with the recommendation, not the
investigation. A reader who skims this section should be able to act.}}

---

## Key Findings

- **{{Finding 1}}** — {{one or two sentences}}. ({{source}})
- **{{Finding 2}}** — {{one or two sentences}}. ({{source}})
- **{{Finding 3}}** — {{one or two sentences}}. ({{source}})

---

## Options compared

{{Use when the research is a comparison of N alternatives. Delete
otherwise.}}

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| {{Option A}} | {{...}} | {{...}} | {{recommended / rejected / contingent}} |
| {{Option B}} | {{...}} | {{...}} | {{...}} |
| {{Option C}} | {{...}} | {{...}} | {{...}} |

---

## Recommended Approach

{{The specific recommendation for this codebase, given the local context
and the research. If multiple valid options exist, rank them with a
rationale and a default.}}

---

## Sources

- [{{Title}}]({{URL}}) — {{one-line note on why this source was useful}}
- [{{Title}}]({{URL}}) — {{...}}
- [{{Title}}]({{URL}}) — {{...}}

Only cite URLs actually fetched. No fabricated sources.

---

## Caveats & Open Questions

- {{Anything that couldn't be confirmed}}
- {{Known version sensitivity — e.g. "this is true for v3.x; v4 changes the API"}}
- {{Follow-up questions for the spec writer or architect to answer}}

---

## Local context check

{{Optional. If the codebase already has a partial pattern for this topic,
document it here so the spec writer doesn't reinvent it. Path + a
paragraph on how it currently works.}}
