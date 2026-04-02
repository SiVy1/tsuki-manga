import { NextResponse } from "next/server";

import { prisma } from "@/app/_lib/db/client";
import { validateRuntimeConfig } from "@/app/_lib/settings/runtime-config";

export async function GET() {
  const config = validateRuntimeConfig();
  let databaseStatus: "ok" | "error" = "ok";
  let databaseMessage: string | null = null;

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    databaseStatus = "error";
    databaseMessage = error instanceof Error ? error.message : "Unknown error";
  }

  const hasConfigErrors = config.issues.some((issue) => issue.level === "error");
  const hasWarnings = config.issues.some((issue) => issue.level === "warning");
  const overallStatus =
    hasConfigErrors || databaseStatus === "error"
      ? "error"
      : hasWarnings
        ? "degraded"
        : "ok";

  const storageStatus =
    config.env?.STORAGE_DRIVER === "s3"
      ? config.issues.some(
            (issue) =>
              issue.level === "error" && issue.code === "missing_s3_config",
          )
        ? "error"
        : "ok"
      : "ok";

  return NextResponse.json(
    {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks: {
        config: {
          status: hasConfigErrors ? "error" : hasWarnings ? "warning" : "ok",
          issues: config.issues,
        },
        database: {
          status: databaseStatus,
          message: databaseMessage,
        },
        storage: {
          status: storageStatus,
          driver: config.env?.STORAGE_DRIVER ?? null,
        },
      },
    },
    {
      status: overallStatus === "error" ? 503 : 200,
    },
  );
}
