import dotenv from "dotenv";
import { defineConfig } from "@playwright/test";

dotenv.config();

const baseURL = "http://127.0.0.1:3000";
const testDatabaseUrl =
  process.env.TEST_DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5433/tsuki_manga_test";

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global.setup.ts",
  timeout: 45_000,
  workers: 1,
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  webServer: {
    command: "pnpm exec next dev --hostname 127.0.0.1 --port 3000",
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ...process.env,
      APP_URL: baseURL,
      DATABASE_URL: testDatabaseUrl,
      TEST_DATABASE_URL: testDatabaseUrl,
      USE_TEST_DATABASE: "true",
      ENABLE_TEST_AUTH: "true",
      STORAGE_DRIVER: "local",
    },
  },
});
