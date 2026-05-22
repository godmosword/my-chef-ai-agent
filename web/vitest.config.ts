import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      "@chef/shared-types": path.resolve(
        __dirname,
        "../packages/shared-types/src/index.ts",
      ),
    },
  },
});
