import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    {
      name: "scss-stub",
      resolveId(source) {
        if (source.endsWith(".scss") || source.endsWith(".module.scss")) {
          return source;
        }
        return null;
      },
      load(id) {
        if (id.endsWith(".scss") || id.endsWith(".module.scss")) {
          return "export default {};";
        }
        return null;
      },
    },
  ],
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    setupFiles: ["tests/setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
      "server-only": path.resolve(import.meta.dirname, "./tests/mocks/server-only.ts"),
    },
  },
});
