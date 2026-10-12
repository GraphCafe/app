# Graph.Cafe — continue work on the design system

## Context
Branch `claude/logo-icon-design-system-fd0462` applies a new design system. It may not be merged to `main` yet; if it isn't, push it and open a PR first:
`git push -u origin claude/logo-icon-design-system-fd0462`

Read these before changing anything:
- Spec (binding): `docs/superpowers/specs/2026-10-11-graph-cafe-design-system-design.md`
- Plan (what was built and why): `docs/superpowers/plans/2026-10-11-graph-cafe-design-system.md`
- `AGENTS.md`: this is Next.js 16. Read the guide in `node_modules/next/dist/docs/` before using any Next API.

## Design rules (do not break)
1. **Restraint is the brand.** No decorative icons, no explainer or subtitle text that restates a label, no "all good" badges. Add an icon or a line of copy only if the UI is unclear without it. The goal is to never look like generic AI output.
2. **Neutral chrome.** No accent color. Light: ink `#322b28` on cream `#faf6f0`. Dark: `#ece8e1` on warm charcoal `#1c1b19`. Primary buttons are filled with ink; links and the active tab are marked by underline, not color.
3. **Color only in data.** Charts use `seriesColor(i)` and `CHART_CHROME` from `src/lib/design/chart-palette.ts`. Never use hex values in components. Chart text never takes a series color. Status colors (`status-success/warning/error`) appear only for real problems, always with an icon and a label.
4. **Fonts:** Crimson Pro for headings (`font-heading`), Commissioner for the UI (`font-sans`), Inconsolata for code (`font-mono`). Sentence case everywhere; no `uppercase`.
5. **Sketch as accent only:** the logo (`GraphCafeMark`), the pencil nav underline, pencil table dividers (`.pencil-rule`) and empty states. Cards, buttons and inputs stay crisp.
6. **Foundations:** corners 8px (controls), 10px (cards), 14px (panels). Hairline borders and no shadows, except menus and popovers (`--shadow-popover`). Focus is a 2px ink outline with a 2px offset. Lucide icons use a 1.5px stroke. Motion is 150–200ms and respects `prefers-reduced-motion`.
7. Use tokens and Tailwind semantic classes (`bg-background`, `text-muted-foreground`, `bg-card`, `border-border`…). No raw Tailwind palette colors (`red-50`, `gray-200`…), and never the old `--cafe-*` variables.

## Workflow
- Write a failing test first (Vitest: `npm test`), then the fix.
- Before every commit run `npm test`, `npm run lint` and `npm run build`. Lint is clean on `main` again as of `f7d8e31`; don't add new problems.
- Check UI changes in the browser in light mode, dark mode (OS setting and the header's System/Light/Dark switch) and at 375px width with no horizontal scroll.
- The source-scan tests in `src/app/legacy-sweep.test.tsx`, `src/app/review-fixes.test.ts` and `src/components/ui/primitives.test.ts` enforce the rules above. Extend them; don't loosen them.

## Backlog — cleared

All seven items are done. Keep them done; each has a test or a verified browser check behind it.

1. **Theme sync across tabs** — `theme-toggle.tsx` re-applies the stored preference on the `storage` event (and ignores other keys), so another tab's change repaints the colors, not just the label.
2. **Dark token parity test** — `globals.test.ts` asserts the `.dark` block deep-equals the `:root:not(.light)` block.
3. **Template menu** — the card no longer carries `--shadow-popover` (it sits in the page on desktop) and the mood badge is 12px, not 10px.
4. **Graph page header** — `graph-studio.tsx` uses the shared lockup (`GraphCafeMark` at 32px plus the wordmark) and the `ThemeToggle`, matching `CafeShell`. The page keeps its heading as an `sr-only` `h1`.
5. **Safari pencil rule** — the check failed, and the cause is a WebKit limitation: a `<tr>` is not a containing block for an absolutely positioned pseudo-element (bugs.webkit.org 240961, reported against Safari 15, still reproducing on 18.3, fixed only in WebKit trunk on 2026-04-11). A row-level `::after` escaped to the `relative` table container, so Safari lost every divider. The hairline is now drawn per cell (`.pencil-rule > td::after`, with `-webkit-mask-*` longhands). Verified in Chromium at 1280px and 375px, light and dark.
6. **Vitest config** — `vitest.config.mts` uses Vite's `resolve.tsconfigPaths` instead of the `vite-tsconfig-paths` plugin, and excludes the generated `.delta/` and `.next/standalone` trees, which each carry a second copy of `src` and made every test file run two or three times.
7. **Lint cleanup** — the four `react-hooks/set-state-in-effect` problems were fixed in `f7d8e31` (`report-studio-client.tsx` moved fetching into an effect with a cancel flag).

## Out of scope unless asked
Renaming the café wording ("pour", "roast", "plate"), a marketing site, new illustrations, compact density, and sequential or diverging chart color scales.
