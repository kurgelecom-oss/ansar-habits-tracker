import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * `esbuild.jsx` is set because tsconfig.json declares `"jsx": "preserve"` for
 * Next's own compiler. esbuild honours that setting and falls back to the
 * classic runtime, so every .test.tsx dies with "React is not defined" before
 * its first assertion. Forcing the automatic runtime here fixes the test
 * transform only — Next's build reads tsconfig.json, not this file, and is
 * unaffected.
 */
export default defineConfig({
  esbuild: { jsx: "automatic" },
  test: { environment: "jsdom", setupFiles: ["./vitest.setup.ts"], include: ["app/**/*.test.ts", "app/**/*.test.tsx"] },
  resolve: { alias: { "@": path.resolve(__dirname, ".") } },
});
