import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  // Vite 8 resolves the `@/*` paths from tsconfig.json itself.
  resolve: { tsconfigPaths: true },
  test: {
    environment: "jsdom",
    // Generated trees that carry a second copy of `src`: the `.delta/` linked worktrees and
    // the `.next/standalone` build output. Without these, every test file runs two or three times.
    exclude: [...configDefaults.exclude, "**/.delta/**", "**/.next/**"],
  },
});
