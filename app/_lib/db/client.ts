import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";
import { getEnv } from "@/app/_lib/settings/env";

declare global {
  var __tsukiPrisma__: PrismaClient | undefined;
}

function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: getEnv().DATABASE_URL });

  return new PrismaClient({
    adapter,
    log:
      getEnv().NODE_ENV === "development"
        ? ["query", "warn", "error"]
        : ["warn", "error"],
  });
}

export const prisma = globalThis.__tsukiPrisma__ ?? createPrismaClient();

if (getEnv().NODE_ENV !== "production") {
  globalThis.__tsukiPrisma__ = prisma;
}
