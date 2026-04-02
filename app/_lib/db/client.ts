import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";
import { getEnv } from "@/app/_lib/settings/env";

declare global {
  var __tsukiPrisma__: PrismaClient | undefined;
}

function createPrismaClient() {
  const env = getEnv();
  const connectionString =
    env.USE_TEST_DATABASE && env.TEST_DATABASE_URL
      ? env.TEST_DATABASE_URL
      : env.DATABASE_URL;
  const adapter = new PrismaPg({ connectionString });

  return new PrismaClient({
    adapter,
    log:
      env.NODE_ENV === "development"
        ? ["query", "warn", "error"]
        : ["warn", "error"],
  });
}

export const prisma = globalThis.__tsukiPrisma__ ?? createPrismaClient();

if (getEnv().NODE_ENV !== "production") {
  globalThis.__tsukiPrisma__ = prisma;
}
