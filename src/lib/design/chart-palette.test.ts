import { describe, expect, it } from "vitest";
import { CHART_CHROME, CHART_SLOT_COUNT, seriesColor } from "./chart-palette";

describe("seriesColor", () => {
  it("maps the first eight series to the fixed slots in order", () => {
    expect(CHART_SLOT_COUNT).toBe(8);
    expect(seriesColor(0)).toBe("var(--chart-1)");
    expect(seriesColor(7)).toBe("var(--chart-8)");
  });

  it("folds series beyond the eighth into the neutral other color instead of wrapping", () => {
    expect(seriesColor(8)).toBe("var(--chart-other)");
    expect(seriesColor(20)).toBe("var(--chart-other)");
  });

  it("rejects negative and fractional indexes", () => {
    expect(() => seriesColor(-1)).toThrow(RangeError);
    expect(() => seriesColor(1.5)).toThrow(RangeError);
  });
});

describe("CHART_CHROME", () => {
  it("uses neutral UI tokens, never series colors", () => {
    expect(CHART_CHROME).toEqual({
      grid: "var(--gridline)",
      axis: "var(--border)",
      tick: "var(--muted-foreground)",
      label: "var(--foreground)",
    });
  });
});

describe("report chart", () => {
  it("takes its colors from the palette, not hex literals", async () => {
    const { readFileSync } = await import("node:fs");
    const src = readFileSync("src/components/reports/report-studio-client.tsx", "utf8");
    expect(src).not.toMatch(/#[0-9a-fA-F]{6}\b/);
    expect(src).toMatch(/seriesColor\(0\)/);
    expect(src).toMatch(/CHART_CHROME\.grid/);
  });

  it("draws marks immediately instead of a 1.5s entry animation (spec motion is 150-200ms)", async () => {
    const { readFileSync } = await import("node:fs");
    const src = readFileSync("src/components/reports/report-studio-client.tsx", "utf8");
    expect(src.match(/isAnimationActive=\{false\}/g)?.length).toBe(2);
  });
});

describe("report layout", () => {
  it("lets widget cards shrink inside the grid so wide tables scroll inside the card, not the page", async () => {
    const { readFileSync } = await import("node:fs");
    const src = readFileSync("src/components/reports/report-studio-client.tsx", "utf8");
    expect(src).toMatch(/<section className="[^"]*\bmin-w-0\b/);
  });
});
