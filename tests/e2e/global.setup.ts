import "dotenv/config";

import { rm } from "node:fs/promises";
import path from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient, RolePreset } from "../../generated/prisma/client";
import { getPermissionBitsForPreset } from "../../app/_lib/permissions/bits";

const truncateSql = `
TRUNCATE TABLE
  "_SeriesToTaxonomyTerm",
  "SocialLink",
  "InstanceSettings",
  "ChapterPage",
  "ChapterSlugHistory",
  "SeriesSlugHistory",
  "Chapter",
  "Series",
  "TaxonomyTerm",
  "Asset",
  "Account",
  "Session",
  "VerificationToken",
  "User"
RESTART IDENTITY CASCADE
`;

const seededUsers = [
  {
    id: "10000000-0000-4000-8000-000000000001",
    providerAccountId: "admin-account",
    displayName: "Admin",
    rolePreset: RolePreset.ADMIN,
  },
  {
    id: "10000000-0000-4000-8000-000000000002",
    providerAccountId: "editor-account",
    displayName: "Editor",
    rolePreset: RolePreset.EDITOR,
  },
  {
    id: "10000000-0000-4000-8000-000000000003",
    providerAccountId: "publisher-account",
    displayName: "Publisher",
    rolePreset: RolePreset.PUBLISHER,
  },
] as const;

export default async function globalSetup() {
  process.env.DATABASE_URL =
    process.env.TEST_DATABASE_URL ??
    process.env.DATABASE_URL ??
    "postgresql://postgres:postgres@localhost:5432/tsuki_manga_test";

  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  });

  const prisma = new PrismaClient({
    adapter,
    log: ["error"],
  });

  try {
    await prisma.$executeRawUnsafe(truncateSql);

    await Promise.all(
      seededUsers.map((user) =>
        prisma.user.create({
          data: {
            id: user.id,
            displayName: user.displayName,
            name: user.displayName,
            rolePreset: user.rolePreset,
            permissionBits: getPermissionBitsForPreset(user.rolePreset),
            accounts: {
              create: {
                type: "credentials",
                provider: "test-auth",
                providerAccountId: user.providerAccountId,
              },
            },
          },
        }),
      ),
    );

    await Promise.all([
      rm(path.join(process.cwd(), "public", "media"), {
        force: true,
        recursive: true,
      }),
      rm(path.join(process.cwd(), ".storage", "draft"), {
        force: true,
        recursive: true,
      }),
    ]);
  } finally {
    await prisma.$disconnect();
  }
}
