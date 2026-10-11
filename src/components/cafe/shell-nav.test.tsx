import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let pathname = "/";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));

import { ShellNav } from "./shell-nav";

const links = [
  { href: "/", label: "Home" },
  { href: "/connections", label: "Connections" },
  { href: "/graph", label: "Idea graph" },
];

describe("ShellNav", () => {
  afterEach(cleanup);
  beforeEach(() => {
    pathname = "/";
  });

  it("marks the section containing the current page and draws the pencil underline under it", () => {
    pathname = "/connections/new";
    render(<ShellNav links={links} />);
    const current = screen.getByRole("link", { name: "Connections" });
    expect(current.getAttribute("aria-current")).toBe("page");
    expect(current.querySelector("svg")).not.toBeNull();
    expect(screen.getByRole("link", { name: "Home" }).getAttribute("aria-current")).toBeNull();
  });

  it("treats Home as current only on the root path", () => {
    render(<ShellNav links={links} />);
    expect(screen.getByRole("link", { name: "Home" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: "Connections" }).getAttribute("aria-current")).toBeNull();
    expect(screen.getByRole("link", { name: "Connections" }).querySelector("svg")).toBeNull();
  });
});
