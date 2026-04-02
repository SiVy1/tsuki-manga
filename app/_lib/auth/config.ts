import { PrismaAdapter } from "@auth/prisma-adapter";
import { RolePreset, ThemeMode } from "@/generated/prisma/client";
import type { NextAuthConfig } from "next-auth";
import Discord from "next-auth/providers/discord";

import { prisma } from "@/app/_lib/db/client";
import { createTestAuthProvider } from "@/app/_lib/auth/test-provider";
import { getPermissionBitsForPreset } from "@/app/_lib/permissions/bits";
import { getEnv } from "@/app/_lib/settings/env";

async function maybeBootstrapDiscordAdmin(userId: string, provider: string, providerAccountId: string) {
  const env = getEnv();

  if (
    provider !== "discord" ||
    !env.DISCORD_BOOTSTRAP_ADMIN_ID ||
    providerAccountId !== env.DISCORD_BOOTSTRAP_ADMIN_ID
  ) {
    return;
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      rolePreset: RolePreset.ADMIN,
      permissionBits: getPermissionBitsForPreset(RolePreset.ADMIN),
    },
  });
}

function buildProviders() {
  const env = getEnv();
  const providers = [];

  if (env.DISCORD_CLIENT_ID && env.DISCORD_CLIENT_SECRET) {
    providers.push(
      Discord({
        clientId: env.DISCORD_CLIENT_ID,
        clientSecret: env.DISCORD_CLIENT_SECRET,
      }),
    );
  }

  if (env.ENABLE_TEST_AUTH) {
    providers.push(createTestAuthProvider(env.TEST_AUTH_SHARED_SECRET || undefined));
  }

  return providers;
}

export const authConfig: NextAuthConfig = {
  trustHost: true,
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
  },
  secret: getEnv().AUTH_SECRET,
  providers: buildProviders(),
  callbacks: {
    async signIn({ user, account }) {
      if (user.id && account?.provider && account.providerAccountId) {
        await maybeBootstrapDiscordAdmin(
          user.id,
          account.provider,
          account.providerAccountId,
        );
      }

      return true;
    },
    async jwt({ token }) {
      if (!token.sub) {
        return token;
      }

      const dbUser = await prisma.user.findUnique({
        where: { id: token.sub },
        select: {
          id: true,
          name: true,
          displayName: true,
          image: true,
          rolePreset: true,
          permissionBits: true,
          themePreference: true,
        },
      });

      if (!dbUser) {
        return token;
      }

      token.name = dbUser.displayName ?? dbUser.name ?? token.name;
      token.picture = dbUser.image ?? token.picture;
      token.rolePreset = dbUser.rolePreset;
      token.permissionBits = dbUser.permissionBits;
      token.displayName = dbUser.displayName;
      token.themePreference = dbUser.themePreference;

      return token;
    },
    async session({ session, token }) {
      if (!session.user || !token.sub || !token.rolePreset) {
        return session;
      }

      session.user.id = token.sub;
      session.user.rolePreset = token.rolePreset as RolePreset;
      session.user.permissionBits = (token.permissionBits as number | undefined) ?? 0;
      session.user.displayName = (token.displayName as string | null | undefined) ?? null;
      session.user.name = token.name ?? session.user.name;
      session.user.image = token.picture ?? session.user.image;
      session.user.themePreference =
        (token.themePreference as ThemeMode | null | undefined) ?? null;

      return session;
    },
  },
};
