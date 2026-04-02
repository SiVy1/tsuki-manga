import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

import { prisma } from "@/app/_lib/db/client";

const credentialsSchema = z.object({
  providerAccountId: z.string().trim().min(1),
  displayName: z.string().trim().min(1),
  sharedSecret: z.string().optional(),
});

export function createTestAuthProvider(sharedSecret: string | undefined) {
  return Credentials({
    id: "test-auth",
    name: "Test Auth",
    credentials: {
      providerAccountId: { label: "Provider account ID", type: "text" },
      displayName: { label: "Display name", type: "text" },
      sharedSecret: { label: "Shared secret", type: "password" },
    },
    async authorize(rawCredentials) {
      const parsed = credentialsSchema.safeParse(rawCredentials);

      if (!parsed.success) {
        return null;
      }

      if (sharedSecret && parsed.data.sharedSecret !== sharedSecret) {
        return null;
      }

      const existingAccount = await prisma.account.findUnique({
        where: {
          provider_providerAccountId: {
            provider: "test-auth",
            providerAccountId: parsed.data.providerAccountId,
          },
        },
        include: {
          user: true,
        },
      });

      if (existingAccount) {
        if (existingAccount.user.displayName !== parsed.data.displayName) {
          await prisma.user.update({
            where: { id: existingAccount.user.id },
            data: {
              displayName: parsed.data.displayName,
              name: parsed.data.displayName,
            },
          });
        }

        return {
          id: existingAccount.user.id,
          name: existingAccount.user.displayName ?? existingAccount.user.name,
          image: existingAccount.user.image,
          rolePreset: existingAccount.user.rolePreset,
          permissionBits: existingAccount.user.permissionBits,
          displayName: existingAccount.user.displayName,
          themePreference: existingAccount.user.themePreference,
        };
      }

      const createdUser = await prisma.user.create({
        data: {
          displayName: parsed.data.displayName,
          name: parsed.data.displayName,
        },
      });

      await prisma.account.create({
        data: {
          userId: createdUser.id,
          type: "credentials",
          provider: "test-auth",
          providerAccountId: parsed.data.providerAccountId,
        },
      });

      return {
        id: createdUser.id,
        name: createdUser.displayName ?? createdUser.name,
        image: createdUser.image,
        rolePreset: createdUser.rolePreset,
        permissionBits: createdUser.permissionBits,
        displayName: createdUser.displayName,
        themePreference: createdUser.themePreference,
      };
    },
  });
}
