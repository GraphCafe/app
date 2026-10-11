import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (f: string) => readFileSync(f, "utf8");
const ui = (name: string) => read(`src/components/ui/${name}.tsx`);
const UI = ["button", "input", "textarea", "select", "card", "tabs", "alert", "table", "sheet", "tooltip", "scroll-area"];

describe("UI primitives follow the foundations", () => {
  it("use a solid 2px ink focus ring with an offset, not the faint default", () => {
    for (const name of UI) {
      const src = ui(name);
      expect(src, name).not.toMatch(/ring-ring\/50/);
      expect(src, name).not.toMatch(/focus-visible:ring-3/);
    }
    expect(ui("button")).toMatch(/focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2/);
  });

  it("round controls at 8px and cards at 10px", () => {
    expect(ui("button")).toMatch(/\brounded-md\b/);
    expect(ui("input")).toMatch(/\brounded-md\b/);
    expect(ui("card")).toMatch(/\brounded-lg\b/);
    expect(ui("card")).not.toMatch(/\brounded-xl\b/);
  });

  it("keep in-flow surfaces flat and give only popovers a shadow", () => {
    for (const name of ["card", "tabs", "scroll-area"]) {
      expect(ui(name), name).not.toMatch(/(?<![\w-])shadow(-sm|-md|-lg)?(?![\w-])/);
    }
    for (const name of ["select", "tooltip", "sheet"]) {
      expect(ui(name), name).not.toMatch(/\bshadow-(sm|md|lg)\b/);
    }
    expect(ui("select")).toMatch(/shadow-\[var\(--shadow-popover\)\]/);
  });

  it("draw table rows with pencil rules", () => {
    const row = ui("table").match(/function TableRow[\s\S]*?\n}/)![0];
    expect(row).toMatch(/pencil-rule/);
    expect(row).not.toMatch(/border-b/);
  });

  it("show errors in the status error colors", () => {
    expect(ui("alert")).toMatch(/bg-status-error-tint/);
    expect(ui("alert")).toMatch(/text-status-error/);
  });
});

describe("global foundations", () => {
  const css = read("src/app/globals.css");

  it("define the pencil rule, light icon strokes, and reduced motion", () => {
    expect(css).toMatch(/\.pencil-rule/);
    expect(css).toMatch(/svg\.lucide\s*\{[^}]*stroke-width:\s*1\.5px/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
  });
});
