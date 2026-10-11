# Graph.Cafe Design System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the approved Graph.Cafe design system (logo, neutral palette, chart palette, type, pencil accents, foundations, restraint) to the existing Next.js app.

**Architecture:** All color, radius, and font decisions live as CSS custom properties in `src/app/globals.css`, mapped onto the shadcn/Tailwind v4 token names so existing primitives pick them up. Brand pieces (mark, pencil underline) are small React components under `src/components/brand/`. Chart colors come from one module (`src/lib/design/chart-palette.ts`) that returns CSS variables, never hex.

**Tech Stack:** Next.js 16.4 (App Router), React 19, Tailwind CSS v4, shadcn/ui on `@base-ui/react`, Recharts 3, lucide-react, `next/font/google`. Tests: Vitest + React Testing Library (added in Task 1, per `node_modules/next/dist/docs/01-app/02-guides/testing/vitest.md`).

**Spec:** `docs/superpowers/specs/2026-10-11-graph-cafe-design-system-design.md` (read it first; exact values below are copied from it). Canonical mark geometry: `docs/superpowers/specs/assets/graphcafe-mark-light.svg`.

## Global Constraints

- Read the relevant guide in `node_modules/next/dist/docs/` before touching Next.js APIs (fonts: `01-app/01-getting-started/13-fonts.md`; icons: `01-app/03-api-reference/03-file-conventions/01-metadata/app-icons.md`).
- No accent color in UI chrome. Color only in chart marks and the three status roles.
- Components reference tokens (`bg-background`, `text-foreground`, `var(--chart-1)` …), never raw hex — except `globals.css`, the static `src/app/icon.svg`, and the mark's mask (`#fff`/`#000`).
- Restraint: no decorative icons, no explainer/helper copy that restates a label, no "all good" status badges. Status = icon + short label, only when something needs attention.
- Lucide icons render at 1.5px stroke.
- Sentence case for all UI copy.
- Out of scope: renaming café terminology ("pour", "roast", "plate"), marketing site, new illustrations, compact density, sequential/diverging ramps.
- `npm run lint`, `npm test`, and `npm run build` must pass at the end of every task.

## Review Focus

1. **Two marks on one page** (header + empty state) — each must use its own mask id, or one mark's steam knockout cuts the other. Test in Task 4.
2. **Dark mode from the OS with no override, and with an override that contradicts the OS** — tokens must resolve correctly in both. Tests in Tasks 1 and 5.
3. **A stored theme value that is missing or garbage** (`localStorage` cleared, old value) — must fall back to system, not crash or flash. Test in Task 5.
4. **A chart with more than 8 series** — slot 9+ must get the neutral "other" color, not wrap around to slot 1. Test in Task 3.
5. **Users with reduced motion** — no transitions or spinner animation beyond what conveys state. Test in Task 6.

---

### Task 1: Test harness and color tokens

**Files:**
- Modify: `package.json` (devDependencies, `"test": "vitest run"`)
- Create: `vitest.config.mts`
- Modify: `src/app/globals.css`
- Test: `src/app/globals.test.ts`

**Interfaces:**
- Produces CSS variables (light in `:root`, dark in `.dark` and in `@media (prefers-color-scheme: dark) { :root:not(.light) }`):
  - shadcn names: `--background` = bg, `--foreground` = ink, `--card`/`--popover` = surface, `--card-foreground`/`--popover-foreground` = ink, `--primary` = ink, `--primary-foreground` = on-ink, `--secondary`/`--muted`/`--accent` = surface-sunken, `--secondary-foreground`/`--accent-foreground` = ink, `--muted-foreground` = ink-muted, `--border` = border, `--input` = border-strong, `--ring` = ink, `--destructive` = status error fg.
  - brand names: `--surface-sunken`, `--gridline`, `--status-success`, `--status-success-tint`, `--status-warning`, `--status-warning-tint`, `--status-error`, `--status-error-tint`, `--chart-1` … `--chart-8`, `--chart-other` (= ink-muted), `--logo-shadow-1`, `--logo-shadow-2`, `--shadow-popover`.
  - Values: spec §2.2, §3.1, §3.2, §3.3. Logo shadows: light `rgb(50 43 40 / 0.06)` / `rgb(50 43 40 / 0.07)`, dark `rgb(0 0 0 / 0.35)` both. `--shadow-popover`: light `0 8px 24px rgb(50 43 40 / 0.10), 0 2px 6px rgb(50 43 40 / 0.06)`, dark `0 8px 24px rgb(0 0 0 / 0.45), 0 2px 6px rgb(0 0 0 / 0.30)`.
  - Tailwind: `@theme inline` adds `--color-surface-sunken`, `--color-gridline`, `--color-status-*`, `--color-chart-6..8`; `@custom-variant dark` matches `.dark` ancestors and `prefers-color-scheme: dark` unless an ancestor has `.light`.
  - Legacy `--cafe-*` variables stay for now, each aliased to the nearest new token (walnut/espresso → `--foreground`, mocha/caramel → `--muted-foreground`, latte → `--border`, cream/menu/canvas → `--surface-sunken`, foam → `--background`). Task 7 deletes them.

- [ ] **Step 1: Install test tooling**

Run: `npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom vite-tsconfig-paths`, then create `vitest.config.mts` exactly as in the Next vitest guide (`environment: 'jsdom'`, plugins `tsconfigPaths()`, `react()`), and add `"test": "vitest run"`.

- [ ] **Step 2: Write the failing token test**

`src/app/globals.test.ts` reads `globals.css` with `fs`, extracts a block's declarations with a local helper `block(css, selectorRegex): Record<string,string>`, and asserts:

```ts
expect(block(css, /^:root\s*\{/)).toMatchObject({
  "--background": "#faf6f0", "--foreground": "#322b28", "--card": "#ffffff",
  "--muted": "#f1ebe3", "--muted-foreground": "#746b65", "--border": "#e6dfd7",
  "--input": "#958a82", "--ring": "#322b28", "--primary": "#322b28",
  "--primary-foreground": "#faf6f0", "--status-error": "#a33a2c",
  "--chart-1": "#5594d2", "--chart-8": "#9a444a", "--chart-other": "#746b65",
});
const dark = { "--background": "#1c1b19", "--foreground": "#ece8e1", "--card": "#252421",
  "--border": "#3a3834", "--input": "#75706a", "--chart-1": "#4281bf", "--chart-8": "#aa5358" };
expect(block(css, /^\.dark\s*\{/)).toMatchObject(dark);
expect(block(css, /:root:not\(\.light\)\s*\{/)).toMatchObject(dark);   // inside the prefers-color-scheme media block
expect(css).not.toMatch(/oklch\(0\.\d+ 0 0\)/);                          // old shadcn grays gone
```

- [ ] **Step 3: Run it — expect FAIL** (`npm test`; old values present).

- [ ] **Step 4: Rewrite the token sections of `globals.css`** per Interfaces. Keep `--radius: 0.625rem` (gives 8/10/14px at md/lg/xl).

- [ ] **Step 5: Run `npm test`, `npm run lint`, `npm run build` — expect PASS.**

- [ ] **Step 6: Commit** — `git commit -m "feat(design): neutral color tokens, status and chart palettes, vitest"`

---

### Task 2: Fonts

**Files:**
- Modify: `src/app/layout.tsx`, `src/app/globals.css`
- Test: `src/app/globals.test.ts` (extend)

**Interfaces:**
- Produces Tailwind font utilities: `font-sans` = Commissioner, `font-heading` = Crimson Pro, `font-mono` = Inconsolata, via CSS variables `--font-commissioner`, `--font-crimson`, `--font-inconsolata` set by `next/font/google` on `<html>`.
- Base layer: `h1–h4` use `font-heading` weight 500; `code, pre, kbd` use `font-mono` at `1.1em` (Inconsolata reads ~2px small next to 15px Commissioner).

- [ ] **Step 1: Extend the test** — assert `@theme inline` block has `--font-sans: var(--font-commissioner)`, `--font-heading: var(--font-crimson)`, `--font-mono: var(--font-inconsolata)`, and that `layout.tsx` source contains `Crimson_Pro`, `Commissioner`, `Inconsolata` and not `Fraunces` or `Nunito`.
- [ ] **Step 2: Run — expect FAIL.**
- [ ] **Step 3: Implement** — in `layout.tsx` import `Crimson_Pro`, `Commissioner`, `Inconsolata` from `next/font/google` (`subsets: ["latin"]`, `display: "swap"`, `variable` as above); remove Fraunces/Nunito and the inline `font-[family-name:...]`/`text-[var(--cafe-espresso)]` on `<body>` (body gets `font-sans` via base layer). Update metadata `title` to `"Graph.Cafe"` and `description` to `"Connect any HTTP API, explore the JSON as a table, and save a chart your team can read."`.
- [ ] **Step 4: Run test, lint, build — expect PASS.**
- [ ] **Step 5: Commit** — `feat(design): Crimson Pro, Commissioner, Inconsolata`

---

### Task 3: Chart palette

**Files:**
- Create: `src/lib/design/chart-palette.ts`
- Modify: `src/components/reports/report-studio-client.tsx:223-240`
- Test: `src/lib/design/chart-palette.test.ts`

**Interfaces:**
- Produces:
  - `CHART_SLOT_COUNT = 8`
  - `seriesColor(index: number): string` → `"var(--chart-N)"` for index 0–7 (N = index + 1), `"var(--chart-other)"` for index ≥ 8. Throws `RangeError` for negative or non-integer index.
  - `CHART_CHROME = { grid: "var(--gridline)", axis: "var(--border)", tick: "var(--muted-foreground)", label: "var(--foreground)" } as const`

- [ ] **Step 1: Write failing tests** — `seriesColor(0) === "var(--chart-1)"`, `seriesColor(7) === "var(--chart-8)"`, `seriesColor(8) === "var(--chart-other)"`, `seriesColor(20) === "var(--chart-other)"`, `seriesColor(-1)` and `seriesColor(1.5)` throw `RangeError`.
- [ ] **Step 2: Run — expect FAIL.**
- [ ] **Step 3: Implement the module; update the report chart** — `Line stroke={seriesColor(0)} strokeWidth={2} dot={false}`, `Bar fill={seriesColor(0)} radius={[4,4,0,0]}`, `CartesianGrid stroke={CHART_CHROME.grid} vertical={false}` (no dasharray), axes `stroke={CHART_CHROME.axis}` with `tick={{ fill: CHART_CHROME.tick, fontSize: 12 }}`. Remove hex literals `#6d4c41`, `#a1887f`.
- [ ] **Step 4: Run tests, lint, build — expect PASS.**
- [ ] **Step 5: Commit** — `feat(design): chart palette and chart chrome`

---

### Task 4: Logo mark, lockup, and app icons

**Files:**
- Create: `src/components/brand/mark-paths.ts`, `src/components/brand/graph-cafe-mark.tsx`, `src/app/icon.svg`, `src/app/apple-icon.png`
- Delete: `src/app/favicon.ico`
- Test: `src/components/brand/graph-cafe-mark.test.tsx`

**Interfaces:**
- `mark-paths.ts` exports the geometry from `graphcafe-mark-light.svg` as data: `VIEWBOX = "11 18 104 104"`, `STEAM_OFFSET_X = -3`, `CUP_STROKES: { d: string; width: number; opacity?: number }[]` (bowl, foot, handle, rim, coffee surface, two ghost strokes, hatching), `SHADOWS` (two ellipses), `BACK_LINE`, `BACK_ARROW`, `MAIN_LINE`, `MAIN_PRESSURE`, `MAIN_SEARCH`, `MAIN_RING` (each `{ d, width, opacity? }`), `KNOCKOUT = { back: 4, main: 6 }`.
- `graph-cafe-mark.tsx` exports `GraphCafeMark({ size, title, className }: { size: number; title?: string; className?: string }): JSX.Element`.
  - Strokes use `currentColor`; color comes from the parent (`text-foreground` by default via `className`). Shadows use `style={{ fill: "var(--logo-shadow-1|2)" }}`.
  - Mask id from `useId()` so every instance is unique.
  - `size <= 16` → every stroke width and knockout width × 1.2, faint opacities + 0.1 (capped at 1) — spec §2.3.
  - `title` present → `role="img"` + `<title>`; absent → `aria-hidden`.
- Produces for Task 5: `<GraphCafeMark size={32} />` used in the header lockup.

- [ ] **Step 1: Write failing tests**
  - renders an `<svg>` with `viewBox="11 18 104 104"` and width/height = `size`;
  - two marks rendered together have different `<mask>` ids, and each `<g mask="url(#…)">` points at its own sibling mask;
  - at `size={16}` the bowl path's `stroke-width` is `3.6` and the main line's is `2.28`; at `size={24}` they are `3` and `1.9`;
  - with `title="Graph.Cafe"` the svg has `role="img"` and an accessible name; without it, `aria-hidden="true"`.
- [ ] **Step 2: Run — expect FAIL.**
- [ ] **Step 3: Implement `mark-paths.ts` and `GraphCafeMark`.**
- [ ] **Step 4: Static icons** — `src/app/icon.svg`: the 16px variant (widths ×1.2) with ink `#322b28`, and an embedded `<style>@media (prefers-color-scheme: dark){…}</style>` switching ink to `#ece8e1` and shadows to black 35%. `src/app/apple-icon.png`: 180×180, light mark centered on `#faf6f0` with ~16px padding, rendered with headless Chrome from the light asset (`chrome --headless=new --force-device-scale-factor=1 --window-size=180,180 --screenshot=…`). Delete `src/app/favicon.ico`. Add a test asserting `icon.svg` contains every `d` string from `mark-paths.ts` (keeps the static file in sync with the component).
- [ ] **Step 5: Run tests, lint, build — expect PASS** (build output lists `/icon.svg` and `/apple-icon.png`).
- [ ] **Step 6: Commit** — `feat(brand): Graph.Cafe mark component and app icons`

---

### Task 5: Shell — lockup, pencil nav underline, theme override

**Files:**
- Create: `src/components/brand/pencil-underline.tsx`, `src/lib/design/theme.ts`, `src/components/cafe/shell-nav.tsx` (client), `src/components/cafe/theme-toggle.tsx` (client)
- Modify: `src/components/cafe/cafe-shell.tsx`, `src/app/layout.tsx`
- Test: `src/lib/design/theme.test.ts`, `src/components/cafe/shell-nav.test.tsx`

**Interfaces:**
- `theme.ts`: `type ThemePref = "system" | "light" | "dark"`; `THEME_STORAGE_KEY = "graphcafe-theme"`; `parseThemePref(raw: string | null): ThemePref` (unknown/null → `"system"`); `nextThemePref(p: ThemePref): ThemePref` (system → light → dark → system); `themeInitScript: string` — inline script for `<head>` that reads storage inside `try/catch` and adds `light` or `dark` class to `<html>` before paint.
- `PencilUnderline({ className }): JSX.Element` — absolutely positioned SVG (main stroke ~2.2px + faint second pass at ~35%), `currentColor`, `preserveAspectRatio="none"`, `vector-effect="non-scaling-stroke"`, `aria-hidden`. Geometry: the underline paths used in the approved mock (`M1 3.6 C20 2.4 45 3.2 62 2.6 C78 2.1 90 3 99 2.2` and `M8 4.6 C30 4 60 4.4 92 3.6`, viewBox `0 0 100 6`).
- `ShellNav({ links }: { links: { href: string; label: string }[] })` — uses `usePathname()`; the active link (exact match for `/`, prefix match otherwise) gets `aria-current="page"`, `text-foreground`, and a `PencilUnderline`; others `text-muted-foreground`. No pill backgrounds.
- `ThemeToggle()` — a text-only ghost button showing the current preference ("System", "Light", "Dark"), cycling with `nextThemePref`, writing storage and the `<html>` class. No icon.
- `CafeShell`: header = `GraphCafeMark size={32}` + "Graph.Cafe" in `font-heading` text-[21px] weight 500, then `ShellNav`, then `ThemeToggle`. Header and page use `bg-background`; header separated by `border-b`. `title`/`subtitle` props keep working; subtitle renders only when passed.
- `layout.tsx`: `<html suppressHydrationWarning>` and `<script dangerouslySetInnerHTML={{ __html: themeInitScript }} />` in `<head>`.

- [ ] **Step 1: Write failing tests**
  - `parseThemePref(null) === "system"`, `parseThemePref("dark") === "dark"`, `parseThemePref("sepia") === "system"`;
  - `nextThemePref` cycles system → light → dark → system;
  - `ShellNav` with pathname mocked to `/connections/new`: the "Connections" link has `aria-current="page"` and contains the underline svg; "Home" does not; with pathname `/`, only "Home" is current.
- [ ] **Step 2: Run — expect FAIL.**
- [ ] **Step 3: Implement** the modules and wire the shell and layout.
- [ ] **Step 4: Run tests, lint, build — expect PASS.**
- [ ] **Step 5: Commit** — `feat(design): header lockup, pencil nav underline, theme override`

---

### Task 6: Primitives and foundations

**Files:**
- Modify: `src/app/globals.css`, `src/components/ui/{button,input,textarea,select,card,tabs,alert,table,sheet,tooltip,scroll-area}.tsx`
- Test: `src/components/ui/primitives.test.ts`

**Interfaces:**
- Radius: buttons, inputs, textarea, select trigger → `rounded-md` (8px); cards, alert → `rounded-lg` (10px); sheet/dialog panels → `rounded-xl` (14px).
- Elevation: remove `shadow-sm`/`shadow` from cards, tabs, scroll-area; select popup, tooltip, sheet use `shadow-[var(--shadow-popover)]`.
- Focus: replace `focus-visible:ring-3 focus-visible:ring-ring/50` and `focus-visible:border-ring` with `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background`.
- Alert `destructive` variant → `bg-status-error-tint text-status-error border-status-error/30`; title stays `text-foreground`.
- Table: `TableRow` drops `border-b` and gets class `pencil-rule`; `globals.css` defines `.pencil-rule` as a bottom pseudo-element 3px tall using `mask-image` of the divider path (`M0.5 2.2 C25 1.4 55 2.6 99.5 1.6`, viewBox `0 0 100 4`, `preserveAspectRatio="none"`) with `background-color: color-mix(in srgb, var(--foreground) 35%, transparent)`; last row has none.
- Base layer: `svg.lucide { stroke-width: 1.5px }`; `@media (prefers-reduced-motion: reduce) { *, ::before, ::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; scroll-behavior: auto !important } }`; default transitions 150ms ease-out.

- [ ] **Step 1: Write failing tests** — read the listed files as text and assert: no `ring-ring/50`, no `focus-visible:ring-3`; `button.tsx`/`input.tsx` contain `rounded-md`; `card.tsx` contains `rounded-lg` and no `shadow`; `table.tsx` `TableRow` contains `pencil-rule` and not `border-b`; `globals.css` contains `.pencil-rule`, `svg.lucide`, `stroke-width: 1.5px`, and `prefers-reduced-motion: reduce`.
- [ ] **Step 2: Run — expect FAIL.**
- [ ] **Step 3: Apply the changes.**
- [ ] **Step 4: Run tests, lint, build — expect PASS.**
- [ ] **Step 5: Commit** — `feat(design): radius, elevation, focus, pencil table rules, motion`

---

### Task 7: Legacy sweep and restraint pass

**Files:**
- Modify: `src/app/page.tsx`, `src/app/connections/page.tsx`, `src/app/explore/[datasetId]/page.tsx`, `src/app/graph/page.tsx`, `src/app/reports/[id]/page.tsx`, `src/components/cafe/{connection-pour-form,dataset-roast-form}.tsx`, `src/components/explore/explore-panel.tsx`, `src/components/graph/{cafe-node,graph-studio,template-menu}.tsx`, `src/components/reports/report-studio-client.tsx`, `src/app/globals.css`
- Test: `src/app/legacy-sweep.test.ts`

**Interfaces:**
- Replacement map for every `var(--cafe-*)` class: walnut/espresso → `text-foreground` / `bg-primary text-primary-foreground` (filled buttons); mocha/caramel → `text-muted-foreground`; latte → `border-border`; cream/menu/canvas → `bg-muted`; foam → `bg-background`. `font-[family-name:var(--font-fraunces)]` → `font-heading`.
- Icons removed (decorative): `Coffee`, `LineChart`, `Plug`, `Table2` (home), `Plus` on "New pour", `FlaskConical` on "Test pour", `Play` on "Execute roast", `Plus` on "Add node", `Trash2` on "Clear", `RefreshCw` on refresh, `Coffee` and `Sparkles` in template menu. Kept (functional): `Loader2` spinners, `Menu` (icon-only button with aria-label), `AlertCircle` in error alerts, chevrons/close icons inside `components/ui`.
- Home page (`src/app/page.tsx`): one section — h1 `Brew a report from any API` (font-heading, ~40px), one line `Connect an endpoint, explore the JSON as a table, and save a chart your team can read.` in `text-muted-foreground`, primary button `Add connection` → `/connections/new`, secondary button `View connections` → `/connections`. Delete the "Phase A — BYO APIs" eyebrow and the three feature cards.
- Template menu: delete the Sparkles tip box.
- Connections empty state (`src/app/connections/page.tsx`, the `connections.length === 0` branch): centered `GraphCafeMark size={64}`, h2 `Pour your first connection` (font-heading, 20px), one line `Connect any HTTP API to start exploring.` in `text-muted-foreground`, primary button `Add connection` → `/connections/new`. Connection list items: `rounded-lg border bg-card p-5`, no shadow, name in `font-heading`.

- [ ] **Step 1: Write failing test** — walk `src/**/*.{ts,tsx,css}` (excluding tests) and assert: no `--cafe-`, no `font-fraunces`, no `font-nunito`; no import of `Coffee`, `Sparkles`, `Plug`, `Table2`, `FlaskConical`, `Play`, `RefreshCw`, `Trash2`, or `LineChart` from `lucide-react`; `page.tsx` contains `Brew a report from any API` and not `Phase A`; rendering the connections page's empty branch shows `Pour your first connection` and an `Add connection` link to `/connections/new` (mock `fetch` to return `[]`).
- [ ] **Step 2: Run — expect FAIL.**
- [ ] **Step 3: Apply the replacement map, icon removals, home and template-menu copy changes; delete the `--cafe-*` aliases from `globals.css`.**
- [ ] **Step 4: Run tests, lint, build — expect PASS.**
- [ ] **Step 5: Commit** — `refactor(design): remove legacy café palette, decorative icons, explainer copy`

---

### Task 8: Visual verification

**Files:** none (verification only; fix-ups go in a follow-up commit)

- [ ] **Step 1:** `npm run dev`; open `/`, `/connections`, `/connections/new`, `/reports/<seeded id>`, `/explore/<seeded id>`, `/graph` in the browser pane at desktop and 375px widths, in light and dark (`colorScheme` emulation) and with the theme toggle set against the OS.
- [ ] **Step 2:** Check: header lockup crisp at 32px; favicon visible in the tab; pencil underline under the active nav item only; table rows show pencil rules; chart uses slate (`--chart-1`) with neutral gridlines; no stray brown (`#3e2723`, `#6d4c41`, `#a1887f`), no oklch grays; focus ring visible on Tab; no horizontal scroll at 375px.
- [ ] **Step 3:** Screenshot light and dark home + report pages; send to the user as PNGs.
- [ ] **Step 4:** Fix anything found, re-run `npm test && npm run lint && npm run build`, commit `fix(design): visual verification fixes`.

---

## Shipping to main

After Task 8: push `claude/logo-icon-design-system-fd0462` to `origin`, open a PR into `main` on `GraphCafe/app` with the spec, plan, and screenshots in the description, let CI run, and merge once the user approves the PR.
