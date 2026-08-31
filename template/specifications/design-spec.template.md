# {{Feature name}} Design Specification — {{Project}} v{{X.Y}}
**Version:** 1.0
**Status:** Draft
**Date:** {{YYYY-MM-DD}}
**Platform:** {{e.g. iOS 26 (iPhone, portrait) — SwiftUI; or Next.js 15 + Tailwind on web}}
**References:** {{`spec-<feature>.md`, master spec, design-tokens file, related design specs}}

**Amendment history**

| Version | Date | Summary |
|---|---|---|
| 1.0 | {{YYYY-MM-DD}} | Initial draft. |

---

## 1. Material system

{{One paragraph on how this feature fits the project's established
material system. If the project has no documented material system
yet, describe it here so subsequent design specs can reference it.}}

- **Surfaces:** {{which surface tokens are in use, e.g. `surface.card`, `Material.regular`, etc.}}
- **Blur / shadow:** {{the blur and shadow tokens applied to each layer}}
- **Light / dark mode:** {{which surfaces invert vs. keep the same tone}}

---

## 2. {{Component or Screen 1 name}}

**Trigger:** {{what causes this component to appear in the UI}}

**Layout**
{{Describe the spatial arrangement in plain language. Cover: background
material, primary container dimensions and corner radius, content
hierarchy top to bottom, insets and safe area behaviour. Reference
spacing tokens by name (e.g. `spacing16`, not `16pt`).}}

**Typography**

| Element | Font | Weight | Size token | Colour token | Notes |
|---|---|---|---|---|---|
| {{role}} | {{font}} | {{weight}} | {{size token}} | {{colour token}} | {{truncation / line-length constraints}} |

**Colour & Material**

| Layer | Token | Notes |
|---|---|---|
| {{Background}} | {{token}} | {{light/dark behaviour if it differs from the token's built-in adaptation}} |
| {{Surface}} | {{token}} | {{...}} |

**Iconography**

| Icon | Symbol / asset | Rendering mode | Size token | Colour overrides |
|---|---|---|---|---|
| {{role}} | {{name — SF Symbol, Lucide, Material, custom asset}} | {{monochrome / hierarchical / palette / outline / filled}} | {{size}} | {{token or "default"}} |

**Interaction states**

| State | Visual change | Driving token |
|---|---|---|
| Default | {{...}} | {{token}} |
| Pressed | {{...}} | {{token}} |
| Disabled | {{...}} | {{token}} |
| Loading | {{...}} | {{token}} |
| Error | {{...}} | {{token}} |
| Success | {{...}} | {{token}} |

**Motion & animation**

| Trigger | Type | Duration / spring | Properties animated | Reduce Motion fallback |
|---|---|---|---|---|
| {{trigger}} | {{spring / ease / opacity}} | {{e.g. response 0.4 / damping 0.8 or 250 ms}} | {{e.g. opacity + scale}} | {{e.g. "instant opacity swap"}} |

**Haptics**

(Delete this whole subsection on web or platforms without haptics.)

| Action | Haptic method |
|---|---|
| {{e.g. "Tap play button"}} | `{{platform haptic call — e.g. HapticEngine.shared.commandRecognised() on iOS}}` |
| {{e.g. "Volume reaches 100"}} | `{{...}}` |

**Accessibility**

- Accessible label strings for every interactive element
  (`accessibilityLabel` on iOS, `aria-label`/`aria-labelledby` on web,
  `contentDescription` on Android):
  - {{Element}} → `"{{label}}"`
- Screen-reader announcement on appearance: {{verbatim string, or "none"}}
- Dynamic Type / text zoom: {{which elements reflow; how the container adapts}}
- Minimum tap target: {{confirmation that every tappable element is ≥ 44×44 pt on iOS, ≥ 48×48 dp on Android, ≥ 44×44 CSS px on web}}
- Increase Contrast / forced-colors adaptations: {{what changes when high-contrast mode is on}}

---

## 3. {{Component or Screen 2 name}}

{{Repeat the block above for every component the feature introduces.}}

---

## Out of Scope (visual)

- {{Visual decision explicitly deferred to a later version}}
- {{Component not addressed by this design — link to the spec that owns it}}

---

## Open Questions

Questions keep their `Q-N` when they move to the Resolved table below.

| # | Question | Owner | Default assumption |
|---|---|---|---|
| Q-1 | {{Question}} | Design | {{what we build if this stays unresolved}} |
| Q-2 | {{Question}} | {{role}} | {{...}} |

---

## Resolved Decisions

| # | Question | Decision | Date |
|---|---|---|---|
| Q-N | {{Question raised during design}} | {{Resolution}} | {{YYYY-MM-DD}} |
