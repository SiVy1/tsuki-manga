import { Prisma } from "@/generated/prisma/client";

export function isMissingDatabaseStructureError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2021" || error.code === "P2022")
  );
}

export function isDatabaseUnavailableError(error: unknown) {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P1001" || error.code === "P1002" || error.code === "ECONNREFUSED")
  ) {
    return true;
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }

  if (error instanceof Error) {
    return [
      "ECONNREFUSED",
      "DatabaseNotReachable",
      "Can't reach database server",
      "connect ECONNREFUSED",
    ].some((pattern) => error.message.includes(pattern));
  }

  return false;
}

export function isMissingOrUnavailableDatabaseError(error: unknown) {
  return isMissingDatabaseStructureError(error) || isDatabaseUnavailableError(error);
}
