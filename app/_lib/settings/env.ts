import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.string().url().optional().or(z.literal("")),
  APP_TIMEZONE: z.string().min(1).default("UTC"),
  AUTH_SECRET: z.string().min(1).default("development-auth-secret"),
  DISCORD_CLIENT_ID: z.string().optional().or(z.literal("")),
  DISCORD_CLIENT_SECRET: z.string().optional().or(z.literal("")),
  DISCORD_BOOTSTRAP_ADMIN_ID: z.string().optional().or(z.literal("")),
  ENABLE_TEST_AUTH: z
    .enum(["true", "false", "1", "0", "TRUE", "FALSE"])
    .optional()
    .transform((value) => value === "true" || value === "1" || value === "TRUE")
    .default(false),
  TEST_AUTH_SHARED_SECRET: z.string().optional().or(z.literal("")),
  DATABASE_URL: z
    .string()
    .min(1)
    .default("postgresql://postgres:postgres@localhost:5432/tsuki_manga"),
  STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
  S3_ENDPOINT: z.string().url().optional().or(z.literal("")),
  S3_REGION: z.string().optional().or(z.literal("")),
  S3_BUCKET: z.string().optional().or(z.literal("")),
  S3_ACCESS_KEY_ID: z.string().optional().or(z.literal("")),
  S3_SECRET_ACCESS_KEY: z.string().optional().or(z.literal("")),
  S3_PUBLIC_BASE_URL: z.string().url().optional().or(z.literal("")),
});

export type AppEnv = z.infer<typeof envSchema>;

let cachedEnv: AppEnv | null = null;

export function getEnv(): AppEnv {
  if (cachedEnv) {
    return cachedEnv;
  }

  cachedEnv = envSchema.parse(process.env);
  return cachedEnv;
}
