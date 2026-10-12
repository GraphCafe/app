import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { THEME_STORAGE_KEY } from "@/lib/design/theme";
import { ThemeToggle } from "./theme-toggle";

describe("ThemeToggle", () => {
  afterEach(cleanup);
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = "";
  });

  it("is a text-only control that cycles System → Light → Dark and applies the override", () => {
    render(<ThemeToggle />);
    const button = screen.getByRole("button", { name: /theme: system/i });
    expect(button.querySelector("svg")).toBeNull();

    fireEvent.click(button);
    expect(screen.getByRole("button", { name: /theme: light/i })).toBeTruthy();
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
    expect(document.documentElement.classList.contains("light")).toBe(true);

    fireEvent.click(screen.getByRole("button"));
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.classList.contains("light")).toBe(false);

    fireEvent.click(screen.getByRole("button"));
    expect(document.documentElement.className).toBe("");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("system");
  });

  it("starts from a stored preference", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "dark");
    render(<ThemeToggle />);
    expect(screen.getByRole("button", { name: /theme: dark/i })).toBeTruthy();
  });

  it("applies another tab's choice on a storage event, not only the label", () => {
    render(<ThemeToggle />);
    expect(document.documentElement.className).toBe("");

    localStorage.setItem(THEME_STORAGE_KEY, "dark");
    fireEvent(window, new StorageEvent("storage", { key: THEME_STORAGE_KEY, newValue: "dark" }));

    expect(screen.getByRole("button", { name: /theme: dark/i })).toBeTruthy();
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    localStorage.setItem(THEME_STORAGE_KEY, "system");
    fireEvent(window, new StorageEvent("storage", { key: THEME_STORAGE_KEY, newValue: "system" }));

    expect(screen.getByRole("button", { name: /theme: system/i })).toBeTruthy();
    expect(document.documentElement.className).toBe("");
  });

  it("ignores storage events that touch a different key", () => {
    render(<ThemeToggle />);
    localStorage.setItem(THEME_STORAGE_KEY, "dark");
    fireEvent(window, new StorageEvent("storage", { key: "some-other-key", newValue: "x" }));
    expect(document.documentElement.className).toBe("");
    expect(screen.getByRole("button", { name: /theme: system/i })).toBeTruthy();
  });
});
