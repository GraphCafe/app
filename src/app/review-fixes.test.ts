import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (f: string) => readFileSync(f, "utf8");
const css = read("src/app/globals.css");

describe("final review fixes", () => {
  it("tells the browser which scheme is active so scrollbars and native controls follow dark mode", () => {
    expect(css).toMatch(/:root\s*\{[^}]*color-scheme:\s*light/);
    expect(css).toMatch(/\.dark\s*\{[^}]*color-scheme:\s*dark/);
    expect(css).toMatch(/:root:not\(\.light\)\s*\{[^}]*color-scheme:\s*dark/);
  });

  it("gives every focusable element, including plain links, the 2px ink focus outline", () => {
    expect(css).toMatch(/:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--ring\)[^}]*outline-offset:\s*2px/);
    expect(css).not.toMatch(/outline-ring\/50/);
  });

  it("keeps chart tooltip text and cursor neutral", () => {
    const report = read("src/components/reports/report-studio-client.tsx");
    expect(report.match(/itemStyle=\{\{ color: CHART_CHROME\.label \}\}/g)?.length).toBe(2);
    expect(report).toMatch(/cursor=\{\{ stroke: CHART_CHROME\.axis \}\}/);
  });

  it("aligns numbers in tables and chart axes", () => {
    expect(read("src/components/ui/table.tsx")).toMatch(/tabular-nums/);
    expect(read("src/components/reports/report-studio-client.tsx")).toMatch(/fontVariantNumeric: "tabular-nums"/);
  });

  it("leaves no old espresso-brown colors on the graph page", () => {
    for (const f of ["src/components/graph/cafe-node.tsx", "src/components/graph/graph-studio.tsx"]) {
      expect(read(f), f).not.toMatch(/62,\s*39,\s*35/);
    }
  });

  it("keeps the template menu flat on the page and its mood badge readable", () => {
    const menu = read("src/components/graph/template-menu.tsx");
    expect(menu).not.toMatch(/shadow-\[var\(--shadow-popover\)\]/);
    expect(menu).not.toMatch(/text-\[\d{1,2}px\]/);
    expect(menu).toMatch(/text-xs/);
  });

  it("gives the graph page the shared lockup and the theme switch", () => {
    const studio = read("src/components/graph/graph-studio.tsx");
    expect(studio).toMatch(
      /import \{ GraphCafeMark \} from "@\/components\/brand\/graph-cafe-mark"/,
    );
    expect(studio).toMatch(
      /import \{ ThemeToggle \} from "@\/components\/cafe\/theme-toggle"/,
    );
    expect(studio).toMatch(/<GraphCafeMark size=\{32\}/);
    expect(studio).toMatch(/<ThemeToggle \/>/);
    expect(studio).toMatch(/href="\/"/);
  });

  it("drops subtitles that restate the page title", () => {
    const restating = [
      ["src/app/explore/[datasetId]/page.tsx", "Execute the roast and preview JSON + table."],
      ["src/app/reports/[id]/page.tsx", "Saved widgets on your data plate."],
      ["src/app/connections/new/page.tsx", "Name your connection, paste credentials once, and test a GET."],
      ["src/components/graph/graph-studio.tsx", "Small graphs, served warm."],
    ];
    for (const [f, text] of restating) expect(read(f), f).not.toContain(text);
  });
});
