import { Prisma } from "@/generated/prisma/client";

export function isMissingDatabaseStructureError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2021" || error.code === "P2022")
  );
}
