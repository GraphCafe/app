import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/connections" }));

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(tsx?|css)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

const files = sourceFiles("src").map((path) => ({ path, src: readFileSync(path, "utf8") }));
const DECORATIVE = ["Coffee", "Sparkles", "Plug", "Table2", "FlaskConical", "Play", "RefreshCw", "Trash2", "LineChart"];

describe("legacy sweep", () => {
  it("leaves no café palette or old fonts behind", () => {
    for (const { path, src } of files) {
      expect(src, path).not.toMatch(/--cafe-/);
      expect(src, path).not.toMatch(/font-fraunces|font-nunito/);
    }
  });

  it("imports no decorative icons", () => {
    for (const { path, src } of files) {
      const imports = src.match(/import\s*\{([^}]*)\}\s*from\s*"lucide-react"/)?.[1] ?? "";
      const names = imports.split(",").map((n) => n.trim());
      for (const icon of DECORATIVE) expect(names, `${path} imports ${icon}`).not.toContain(icon);
    }
  });

  it("uses sentence case and design tokens instead of raw Tailwind palette colors", () => {
    for (const { path, src } of files) {
      if (/components[\\/]ui/.test(path)) continue;
      expect(src, path).not.toMatch(/\buppercase\b/);
      expect(src, path).not.toMatch(/\b(bg|text|border)-(red|amber|green|slate|gray|zinc|stone)-\d{2,3}\b/);
      expect(src, path).not.toMatch(/\bbg-foreground\b/);
    }
  });

  it("keeps the home page to one heading, one line, and two actions", () => {
    const home = readFileSync("src/app/page.tsx", "utf8");
    expect(home).toContain("Brew a report from any API");
    expect(home).not.toContain("Phase A");
  });
});

describe("connections empty state", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("invites the first connection with the mark, a title, and one action", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("[]", { headers: { "content-type": "application/json" } })));
    const { default: ConnectionsPage } = await import("./connections/page");
    render(<ConnectionsPage />);
    expect(await screen.findByText("Pour your first connection")).toBeTruthy();
    const add = screen.getAllByRole("link", { name: "Add connection" });
    expect(add.some((a) => a.getAttribute("href") === "/connections/new")).toBe(true);
  });
});
