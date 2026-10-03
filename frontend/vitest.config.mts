import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Unit tests for helpers and client components in jsdom (vitest and jsdom are
 * on allowed_dev_tooling). Pages and server actions need the backend and are
 * covered by the backend e2e tests.
 */
export default defineConfig({
  esbuild: { jsx: "automatic" },
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    globals: false,
    css: false,
  },
});
