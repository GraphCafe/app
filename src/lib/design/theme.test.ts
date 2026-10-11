import { describe, expect, it } from "vitest";
import { nextThemePref, parseThemePref, THEME_STORAGE_KEY, themeInitScript } from "./theme";

describe("parseThemePref", () => {
  it("falls back to system when nothing is stored", () => {
    expect(parseThemePref(null)).toBe("system");
  });

  it("accepts the three known preferences", () => {
    expect(parseThemePref("light")).toBe("light");
    expect(parseThemePref("dark")).toBe("dark");
    expect(parseThemePref("system")).toBe("system");
  });

  it("falls back to system for unknown stored values", () => {
    expect(parseThemePref("sepia")).toBe("system");
  });
});

describe("nextThemePref", () => {
  it("cycles system → light → dark → system", () => {
    expect(nextThemePref("system")).toBe("light");
    expect(nextThemePref("light")).toBe("dark");
    expect(nextThemePref("dark")).toBe("system");
  });
});

describe("themeInitScript", () => {
  it("applies a stored override to <html> before paint and survives storage errors", () => {
    document.documentElement.className = "";
    localStorage.setItem(THEME_STORAGE_KEY, "dark");
    new Function(themeInitScript)();
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    document.documentElement.className = "";
    localStorage.setItem(THEME_STORAGE_KEY, "garbage");
    new Function(themeInitScript)();
    expect(document.documentElement.className).toBe("");
  });
});
