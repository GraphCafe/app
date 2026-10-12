import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(join(__dirname, "globals.css"), "utf8");

/** Declarations of the first rule whose selector matches `selector` (top level or nested). */
function block(source: string, selector: RegExp): Record<string, string> {
  const lines = source.split("\n");
  const start = lines.findIndex((l) => selector.test(l.trim()));
  if (start === -1) return {};
  const out: Record<string, string> = {};
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith("}")) break;
    const m = line.match(/^(--[\w-]+):\s*(.+?);$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

const dark = {
  "--background": "#1c1b19",
  "--foreground": "#ece8e1",
  "--card": "#252421",
  "--border": "#3a3834",
  "--input": "#75706a",
  "--chart-1": "#4281bf",
  "--chart-8": "#aa5358",
};

describe("design tokens", () => {
  it("defines the light palette on :root", () => {
    expect(block(css, /^:root\s*\{/)).toMatchObject({
      "--background": "#faf6f0",
      "--foreground": "#322b28",
      "--card": "#ffffff",
      "--muted": "#f1ebe3",
      "--muted-foreground": "#746b65",
      "--border": "#e6dfd7",
      "--input": "#958a82",
      "--ring": "#322b28",
      "--primary": "#322b28",
      "--primary-foreground": "#faf6f0",
      "--status-error": "#a33a2c",
      "--chart-1": "#5594d2",
      "--chart-8": "#9a444a",
      "--chart-other": "#746b65",
    });
  });

  it("defines the dark palette for an explicit .dark override", () => {
    expect(block(css, /^\.dark\s*\{/)).toMatchObject(dark);
  });

  it("defines the dark palette for OS dark mode unless .light overrides", () => {
    expect(block(css, /:root:not\(\.light\)\s*\{/)).toMatchObject(dark);
  });

  it("keeps the explicit .dark block in exact parity with the OS-dark block", () => {
    const explicit = block(css, /^\.dark\s*\{/);
    const osDark = block(css, /:root:not\(\.light\)\s*\{/);
    // Guard the comparison itself: two empty blocks would also be "equal".
    expect(Object.keys(explicit).length).toBeGreaterThan(30);
    expect(explicit).toEqual(osDark);
  });

  it("drops the default shadcn grays", () => {
    expect(css).not.toMatch(/oklch\(0\.\d+ 0 0\)/);
  });
});

describe("typography", () => {
  const layout = readFileSync(join(__dirname, "layout.tsx"), "utf8");

  it("maps Tailwind font utilities to the brand fonts", () => {
    expect(block(css, /^@theme inline\s*\{/)).toMatchObject({
      "--font-sans": "var(--font-commissioner)",
      "--font-heading": "var(--font-crimson)",
      "--font-mono": "var(--font-inconsolata)",
    });
  });

  it("loads Crimson Pro, Commissioner, and Inconsolata instead of Fraunces and Nunito", () => {
    expect(layout).toMatch(/Crimson_Pro/);
    expect(layout).toMatch(/Commissioner/);
    expect(layout).toMatch(/Inconsolata/);
    expect(layout).not.toMatch(/Fraunces|Nunito/);
  });
});
