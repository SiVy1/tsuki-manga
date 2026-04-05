import { rm } from "node:fs/promises";
import path from "node:path";

import { RolePreset } from "@/generated/prisma/client";

import { prisma } from "@/app/_lib/db/client";
import { getPermissionBitsForPreset } from "@/app/_lib/permissions/bits";

export const testUsers = {
  reader: {
    id: "00000000-0000-4000-8000-000000000000",
    rolePreset: RolePreset.READER,
  },
  admin: {
    id: "00000000-0000-4000-8000-000000000001",
    rolePreset: RolePreset.ADMIN,
  },
  editor: {
    id: "00000000-0000-4000-8000-000000000002",
    rolePreset: RolePreset.EDITOR,
  },
  publisher: {
    id: "00000000-0000-4000-8000-000000000003",
    rolePreset: RolePreset.PUBLISHER,
  },
} as const;

const truncateSql = `
TRUNCATE TABLE
  "_SeriesToTaxonomyTerm",
  "SocialLink",
  "InstanceSettings",
  "SavedSeries",
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

export async function resetDatabase() {
  await prisma.$executeRawUnsafe(truncateSql);
}

export async function seedDefaultUsers() {
  for (const user of Object.values(testUsers)) {
    await prisma.user.create({
      data: {
        id: user.id,
        displayName: user.rolePreset.toLowerCase(),
        name: user.rolePreset.toLowerCase(),
        rolePreset: user.rolePreset,
        permissionBits: getPermissionBitsForPreset(user.rolePreset),
      },
    });
  }
}

export async function resetDatabaseAndStorage() {
  await resetDatabase();
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
}
