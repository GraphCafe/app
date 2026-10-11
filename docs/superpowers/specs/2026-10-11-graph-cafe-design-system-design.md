# Graph.Cafe design system — design spec

Date: 2026-10-11 · Status: approved in conversation, awaiting written-spec review

## 1. Intent

Graph.Cafe lets people connect any HTTP API, explore the JSON as tables, and save small chart reports. The brand should feel **serious but slightly playful**, **familiar but new and tech-forward** — a studio sketch made in thick lead pencil, sitting on top of a precise, quiet data tool.

The existing repo (brown café palette, Fraunces + Nunito, stock Lucide `Coffee` mark, default shadcn grays) was a starting point only. This spec replaces it.

### Principles

1. **Restraint is the brand.** Every icon, label, and line of copy must earn its place. No decorative icons, no icon-per-item lists, no explainer blurbs or subtitles that restate the obvious, no "everything is fine" badges. If removing an element doesn't make the UI less clear, remove it. The goal is a UI that never reads as generic AI output.
2. **Neutral chrome, colorful data.** The interface is monochrome (ink on paper). Color appears only inside data visualizations, plus a tiny reserved status set for problems that need attention.
3. **Sketch as accent, precision as default.** The hand-drawn quality lives in the logo, empty-state art, and a few pencil accents. Everything the user reads or clicks stays crisp.

## 2. Logo

### 2.1 Master mark

A wide teacup seen from slightly above, drawn like a thick-lead-pencil studio sketch, with steam drawn as chart lines.

- **Cup:** hand-drawn bowl, rim stroke that overshoots its start, small foot ring, loop handle. The handle's top starts just off the bowl (a small pencil-lift gap, so it doesn't crowd the rim); its bottom overshoots slightly into the bowl.
- **Sketch details:** faint coffee-surface arc, a ghost stroke along the right of the bowl, a short ghost stroke on the left, three light hatch marks on the shaded lower right, two very faint shadow ellipses under the cup (light from upper left).
- **Steam (two lines, each with its own proportions):**
  - *Main line* — starts near the cup's center, rises at ~60° with one shallow dip, slight bows and pencil-lift corners, pressure building toward the top. Ends in a small, light, open hand-drawn ring (data point).
  - *Back line* — starts farther back in the cup, right of the main line; gentler slope, shorter and shallower dip, lighter and thinner. Ends in a small two-stroke arrowhead.
  - Both lines are shifted 3 units left of their original position so the peak sits over the cup's right shoulder, not the handle.
  - Steam is **solid** (a dashed "forecast" line and a third line were tried and rejected).
- **Knockout:** where steam crosses the back rim, the rim is cut away with an SVG **mask**, never a background-colored stroke, so the mark works on any background (including transparent favicons).

Canonical geometry: [`assets/graphcafe-mark-light.svg`](assets/graphcafe-mark-light.svg), [`assets/graphcafe-mark-dark.svg`](assets/graphcafe-mark-dark.svg). viewBox `11 18 104 104` (square, tightly cropped).

### 2.2 Color

| Mode | Ink | Shadow ellipses |
|---|---|---|
| Light | `#322b28` | ink at 6% / 7% |
| Dark | `#ece8e1` | black at 35% / 35% |

### 2.3 Sizes

- **One drawing at every size.** There is no separate simplified icon (a bolder redraw was rejected).
- **≥ 24px:** master as-is.
- **16px only** (favicon, browser tab): same geometry with every stroke width ×1.2 and faint-detail opacities +0.1 (mask knockout widths ×1.2 too).

### 2.4 Wordmark & lockup

"Graph.Cafe" set in Crimson Pro 500, ink color, to the right of the mark with a gap of ~0.3× the mark size. The mark is roughly 1.4× the wordmark's cap height in headers (e.g. 32px mark with ~21px wordmark).

## 3. Color

### 3.1 UI palette (no accent color)

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | `#faf6f0` | `#1c1b19` | Page |
| `--surface` | `#ffffff` | `#252421` | Cards, tables, inputs |
| `--surface-sunken` | `#f1ebe3` | `#2f2e2b` | Code blocks, neutral badges, hover wash |
| `--ink` | `#322b28` | `#ece8e1` | Text, logo, primary button fill, focus ring, active underline |
| `--ink-muted` | `#746b65` | `#a8a39b` | Secondary text, axis labels, placeholders |
| `--on-ink` | `#faf6f0` | `#1c1b19` | Text on primary (ink-filled) buttons |
| `--border` | `#e6dfd7` | `#3a3834` | Hairline dividers and card edges |
| `--border-strong` | `#958a82` | `#75706a` | Input outlines (≥ 3:1 against bg and surface) |
| `--gridline` | `#efe9e2` | `#302f2b` | Chart gridlines |

Contrast: ink on bg 12.9:1 (light) / 14.1:1 (dark); muted on bg 4.8:1 / 6.9:1.

There is **no accent color.** Primary buttons are filled with ink; links and the selected tab are marked by underline, not color. (Ember, teal, and cobalt accents were tried and rejected. A brown dark mode was rejected in favor of warm neutral.)

### 3.2 Status (the only color in chrome)

Used only when a real state needs attention (API error, failed test, warning). Always icon + short label; never color alone; never a success badge for the normal state.

| Role | Light fg / tint | Dark fg / tint |
|---|---|---|
| Success | `#4a6b3f` / `#eef1e6` | `#8fb27f` / `#263024` |
| Warning | `#8a6113` / `#f6eedb` | `#d1a34a` / `#332b1b` |
| Error | `#a33a2c` / `#f8e6e1` | `#e07a68` / `#3a2420` |

All foregrounds ≥ 4.7:1 on their tint and on bg. Status colors are never used as chart series; a series that *means* good/bad uses status tokens instead of categorical ones, never both in one chart.

### 3.3 Chart palette (color only inside data)

Eight muted categorical slots in a **fixed order** (assigned in sequence, never cycled; a series keeps its color when filters remove others; a 9th series folds into "Other" or facets).

| Slot | Name | Light | Dark |
|---|---|---|---|
| 1 | Slate | `#5594d2` | `#4281bf` |
| 2 | Terracotta | `#974a24` | `#a75934` |
| 3 | Sage | `#089678` | `#2ea98a` |
| 4 | Ochre | `#a07a1a` | `#b28c32` |
| 5 | Plum | `#c0719f` | `#ba6b99` |
| 6 | Moss | `#4d701f` | `#7ba051` |
| 7 | Iris | `#9181cf` | `#9484d3` |
| 8 | Rose | `#9a444a` | `#aa5358` |

Validated with the dataviz `validate_palette.js` (light vs `#ffffff`, dark vs `#252421`): all checks pass — lightness band, chroma ≥ 0.10, worst adjacent CVD ΔE 10.7 (target ≥ 8), worst adjacent normal-vision ΔE 15.8 (floor 15), all slots ≥ 3:1 contrast. Slots 1–3 also pass the all-pairs test (scatter/bubble/small multiples cap at 3 series).

Chart chrome follows the UI tokens: text never takes a series color; legends, axes, and labels use `--ink` / `--ink-muted`; gridlines use `--gridline`. Lines 2px, 2px surface-colored gaps between stacked/adjacent fills. Sequential and diverging ramps are derived later from slots 1 (Slate) and 1↔8 (Slate↔Rose) when a chart first needs them.

## 4. Typography

| Role | Family | Weights | Notes |
|---|---|---|---|
| Headings, wordmark | **Crimson Pro** | 500 (400 for large display) | Refined book serif; carries "serious". |
| UI and body | **Commissioner** | 400, 500 | Warm grotesk; `tabular-nums` in tables and axis ticks. |
| Code, JSON, URLs | **Inconsolata** | 400, 500 | Set ~1.5–2px larger than surrounding Commissioner to match visual size. |

All from Google Fonts, loaded via `next/font/google`. Replaces Fraunces and Nunito (Nunito removed: too rounded/cute). Geist was considered and rejected as overused.

Scale (px, line-height): display 40/1.1 · h1 30/1.15 · h2 24/1.2 · h3 20/1.25 (Crimson Pro) · body 15/1.55 · small 13/1.45 · caption 12/1.4 (Commissioner) · code 15.5/1.55 (Inconsolata). Sentence case everywhere.

## 5. Sketch accents (level "B")

The hand-drawn feel extends into the UI in exactly these places:

1. **Active tab / nav underline** — a pencil stroke (main stroke ~2.2px plus a faint offset second pass), not a flat bar.
2. **Table row dividers** — faint pencil hairlines (ink at ~35%).
3. **Empty states** — the logo or future pencil illustrations, a Crimson Pro title, one line of copy, one action.

Cards, buttons, inputs, borders, charts, and focus rings stay crisp. Hand-drawn outlines on cards/buttons ("sketchbook UI") were rejected. Graphite-grain texture is reserved for large marketing moments only, never in the app.

## 6. Foundations

| Area | Decision |
|---|---|
| Spacing | 4px base: 4, 8, 12, 16, 24, 32, 48 |
| Radius | 8px buttons/inputs · 10px cards · 14px large panels and dialogs |
| Elevation | Hairline borders, no shadows — except menus/popovers: one soft warm shadow so they float |
| Focus | 2px `--ink` outline, 2px offset; visible, colorless |
| Icons | Lucide at 1.5px stroke, only where an icon is clearer than a word (see Principle 1). No decorative icons. |
| Motion | 150–200ms ease-out fades/slides; no bounce; none under `prefers-reduced-motion` |
| Density | Comfortable by default; compact table density may be added later |
| Dark mode | Follows system (`prefers-color-scheme`) with a manual override; dark values are their own selected steps, not an automatic inversion |

## 7. Implementation scope (for the plan)

- Replace `globals.css` tokens: map the tokens above onto the shadcn variables (`--background`, `--foreground`, `--primary`, `--border`, `--ring`, `--chart-1..8`, etc.) for light and dark; remove the `--cafe-*` palette.
- Fonts in `layout.tsx`: Crimson Pro, Commissioner, Inconsolata via `next/font/google`; drop Fraunces and Nunito.
- Logo as a React component (`GraphCafeMark`) driven by tokens, with the 16px variant; favicon/app icons generated from it; replace the Lucide `Coffee` in `cafe-shell.tsx`.
- Pencil underline and pencil divider components.
- Update Recharts usage to the categorical palette and chart chrome tokens.
- Sweep existing screens for decorative icons and explainer copy per Principle 1.

Out of scope: marketing site, illustrations beyond the logo, compact density, sequential/diverging ramps (until a chart needs them).
