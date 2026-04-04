import { ZodError } from "zod";

import { isTestAuthEnabled } from "@/app/_lib/auth/test-auth";
import { envSchema, type AppEnv } from "@/app/_lib/settings/env";

export type RuntimeConfigIssue = {
  code: string;
  field: string;
  level: "error" | "warning";
  message: string;
};

export type RuntimeConfigValidationResult = {
  env: AppEnv | null;
  issues: RuntimeConfigIssue[];
  ok: boolean;
};

function hasRawValue(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

function mapZodError(error: ZodError): RuntimeConfigIssue[] {
  return error.issues.map((issue) => ({
    code: "invalid_env",
    field: issue.path.join(".") || "env",
    level: "error" as const,
    message: issue.message,
  }));
}

export function validateRuntimeConfig(
  input: Record<string, string | undefined> = process.env,
): RuntimeConfigValidationResult {
  const parsed = envSchema.safeParse(input);

  if (!parsed.success) {
    return {
      env: null,
      issues: mapZodError(parsed.error),
      ok: false,
    };
  }

  const env = parsed.data;
  const issues: RuntimeConfigIssue[] = [];

  if (!hasRawValue(input.AUTH_SECRET)) {
    issues.push({
      code: "missing_auth_secret",
      field: "AUTH_SECRET",
      level: env.NODE_ENV === "production" ? "error" : "warning",
      message:
        env.NODE_ENV === "production"
          ? "AUTH_SECRET must be set in production."
          : "AUTH_SECRET is not explicitly set; development fallback is being used.",
    });
  }

  if (env.NODE_ENV === "production" && env.AUTH_SECRET === "development-auth-secret") {
    issues.push({
      code: "unsafe_auth_secret",
      field: "AUTH_SECRET",
      level: "error",
      message: "AUTH_SECRET must not use the development default in production.",
    });
  }

  if (!hasRawValue(input.APP_URL)) {
    issues.push({
      code: "missing_app_url",
      field: "APP_URL",
      level: env.NODE_ENV === "production" ? "error" : "warning",
      message:
        env.NODE_ENV === "production"
          ? "APP_URL must be set in production."
          : "APP_URL is not explicitly set; public URLs will fall back to the incoming request host.",
    });
  }

  if (!hasRawValue(input.DATABASE_URL)) {
    issues.push({
      code: "missing_database_url",
      field: "DATABASE_URL",
      level: env.NODE_ENV === "production" ? "error" : "warning",
      message:
        env.NODE_ENV === "production"
          ? "DATABASE_URL must be set in production."
          : "DATABASE_URL is not explicitly set; development fallback is being used.",
    });
  }

  if (env.ENABLE_TEST_AUTH && !hasRawValue(input.TEST_AUTH_SHARED_SECRET)) {
    issues.push({
      code: "missing_test_auth_secret",
      field: "TEST_AUTH_SHARED_SECRET",
      level: "error",
      message:
        "TEST_AUTH_SHARED_SECRET must be set when ENABLE_TEST_AUTH is enabled.",
    });
  }

  if (env.NODE_ENV === "production" && env.ENABLE_TEST_AUTH && !env.ALLOW_TEST_AUTH_IN_PRODUCTION) {
    issues.push({
      code: "test_auth_blocked_in_production",
      field: "ENABLE_TEST_AUTH",
      level: "error",
      message:
        "ENABLE_TEST_AUTH cannot be enabled in production unless ALLOW_TEST_AUTH_IN_PRODUCTION is also set.",
    });
  }

  if (env.NODE_ENV === "production" && isTestAuthEnabled(env)) {
    issues.push({
      code: "test_auth_override_enabled_in_production",
      field: "ALLOW_TEST_AUTH_IN_PRODUCTION",
      level: "warning",
      message:
        "Test auth is explicitly enabled in production. Use this only for intentional private deployment workflows.",
    });
  }

  if (env.STORAGE_DRIVER === "s3") {
    const requiredS3Fields = [
      "S3_ENDPOINT",
      "S3_REGION",
      "S3_BUCKET",
      "S3_ACCESS_KEY_ID",
      "S3_SECRET_ACCESS_KEY",
      "S3_PUBLIC_BASE_URL",
    ] as const;

    for (const field of requiredS3Fields) {
      if (!hasRawValue(input[field])) {
        issues.push({
          code: "missing_s3_config",
          field,
          level: "error",
          message: `${field} must be set when STORAGE_DRIVER is "s3".`,
        });
      }
    }
  }

  return {
    env,
    issues,
    ok: !issues.some((issue) => issue.level === "error"),
  };
}
