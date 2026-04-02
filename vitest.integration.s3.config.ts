import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
    },
  },
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["tests/integration/setup.ts"],
    include: ["tests/integration/s3-storage.test.ts"],
    fileParallelism: false,
  },
});
