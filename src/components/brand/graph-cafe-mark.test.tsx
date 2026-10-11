import { readFileSync } from "node:fs";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GraphCafeMark } from "./graph-cafe-mark";
import { CUP_STROKES, MAIN_LINE } from "./mark-paths";

const bowl = CUP_STROKES[0];

/** Stroke width of the visible path with this geometry (ignores the mask's knockout copy). */
function strokeWidthOf(svg: Element, d: string) {
  const visible = [...svg.querySelectorAll(`path[d="${d}"]`)].find((p) => !p.closest("mask"));
  return visible?.getAttribute("stroke-width");
}

describe("GraphCafeMark", () => {
  it("renders the square, tightly cropped mark at the requested size", () => {
    const { container } = render(<GraphCafeMark size={32} />);
    const svg = container.querySelector("svg")!;
    expect(svg.getAttribute("viewBox")).toBe("11 18 104 104");
    expect(svg.getAttribute("width")).toBe("32");
    expect(svg.getAttribute("height")).toBe("32");
  });

  it("gives every instance its own steam knockout mask", () => {
    const { container } = render(
      <>
        <GraphCafeMark size={32} />
        <GraphCafeMark size={64} />
      </>,
    );
    const svgs = [...container.querySelectorAll("svg")];
    const ids = svgs.map((s) => s.querySelector("mask")!.id);
    expect(new Set(ids).size).toBe(2);
    svgs.forEach((s, i) => {
      expect(s.querySelector("g[mask]")!.getAttribute("mask")).toBe(`url(#${ids[i]})`);
    });
  });

  it("boosts stroke weight 1.2x at 16px only", () => {
    const small = render(<GraphCafeMark size={16} />).container.querySelector("svg")!;
    expect(strokeWidthOf(small, bowl.d)).toBe("3.6");
    expect(strokeWidthOf(small, MAIN_LINE.d)).toBe("2.28");
    const normal = render(<GraphCafeMark size={24} />).container.querySelector("svg")!;
    expect(strokeWidthOf(normal, bowl.d)).toBe("3");
    expect(strokeWidthOf(normal, MAIN_LINE.d)).toBe("1.9");
  });

  it("is an image with a name when titled, and hidden from assistive tech otherwise", () => {
    const titled = render(<GraphCafeMark size={32} title="Graph.Cafe" />).container.querySelector("svg")!;
    expect(titled.getAttribute("role")).toBe("img");
    expect(titled.querySelector("title")?.textContent).toBe("Graph.Cafe");
    const plain = render(<GraphCafeMark size={32} />).container.querySelector("svg")!;
    expect(plain.getAttribute("aria-hidden")).toBe("true");
  });
});

describe("static app icon", () => {
  it("uses the same geometry as the component", () => {
    const icon = readFileSync("src/app/icon.svg", "utf8");
    for (const s of CUP_STROKES) expect(icon).toContain(s.d);
    expect(icon).toContain(MAIN_LINE.d);
  });
});
