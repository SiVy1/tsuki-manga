import { describe, expect, it } from "vitest";

import { validateRuntimeConfig } from "@/app/_lib/settings/runtime-config";

function createEnv(overrides: Record<string, string | undefined> = {}) {
  return {
    NODE_ENV: "production",
    APP_URL: "https://example.com",
    APP_TIMEZONE: "UTC",
    AUTH_SECRET: "super-secret",
    DATABASE_URL: "postgresql://postgres:postgres@db:5432/tsuki_manga",
    STORAGE_DRIVER: "local",
    ENABLE_TEST_AUTH: "false",
    ...overrides,
  };
}

describe("runtime config validation", () => {
  it("accepts a minimal valid local-storage production config", () => {
    const result = validateRuntimeConfig(createEnv());

    expect(result.ok).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it("requires test auth secret when test auth is enabled", () => {
    const result = validateRuntimeConfig(
      createEnv({
        ENABLE_TEST_AUTH: "true",
        TEST_AUTH_SHARED_SECRET: "",
      }),
    );

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: "TEST_AUTH_SHARED_SECRET",
          code: "missing_test_auth_secret",
          level: "error",
        }),
      ]),
    );
  });

  it("requires the full s3 config when s3 storage is enabled", () => {
    const result = validateRuntimeConfig(
      createEnv({
        STORAGE_DRIVER: "s3",
        S3_ENDPOINT: "https://s3.example.com",
        S3_REGION: "",
        S3_BUCKET: "bucket",
        S3_ACCESS_KEY_ID: "",
        S3_SECRET_ACCESS_KEY: "",
        S3_PUBLIC_BASE_URL: "",
      }),
    );

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "S3_REGION", level: "error" }),
        expect.objectContaining({ field: "S3_ACCESS_KEY_ID", level: "error" }),
        expect.objectContaining({ field: "S3_SECRET_ACCESS_KEY", level: "error" }),
        expect.objectContaining({ field: "S3_PUBLIC_BASE_URL", level: "error" }),
      ]),
    );
  });
});
