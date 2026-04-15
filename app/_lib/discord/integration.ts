import { prisma } from "@/app/_lib/db/client";
import { defaultInstanceSettings } from "@/app/_lib/settings/instance";
import { getEnv } from "@/app/_lib/settings/env";

type DiscordBotAdminPayload = Record<string, unknown>;

async function getOrCreateInstanceSettings() {
  const existing = await prisma.instanceSettings.findFirst({
    orderBy: {
      createdAt: "asc",
    },
  });

  if (existing) {
    return existing;
  }

  return prisma.instanceSettings.create({
    data: defaultInstanceSettings,
  });
}

export async function getOrCreateDiscordIntegrationConfig() {
  const settings = await getOrCreateInstanceSettings();
  const candidates = await prisma.discordIntegrationConfig.findMany({
    orderBy: [
      {
        createdAt: "asc",
      },
    ],
  });

  const existing =
    candidates.find(
      (entry) =>
        Boolean(entry.guildId) ||
        Boolean(entry.announcementChannelId) ||
        Boolean(entry.subscriptionChannelId) ||
        Boolean(entry.moderationChannelId) ||
        Boolean(entry.newSeriesChannelId),
    ) ??
    candidates.find((entry) => entry.instanceSettingsId === settings.id) ??
    null;

  if (existing) {
    return existing;
  }

  return prisma.discordIntegrationConfig.create({
    data: {
      instanceSettingsId: settings.id,
      guildId: "",
      defaultLocale: "en",
      allowedManagerRoleIds: [],
      subscriptionMessageIds: [],
      rolePrefix: "tsuki-series",
    },
  });
}

export async function getDiscordLinkedAccount(userId: string) {
  return prisma.account.findFirst({
    where: {
      userId,
      provider: "discord",
    },
    select: {
      providerAccountId: true,
    },
  });
}

export async function callDiscordBotAdminEndpoint<T>(
  path: string,
  payload: DiscordBotAdminPayload,
): Promise<T> {
  const env = getEnv();

  if (!env.DISCORD_BOT_INTERNAL_URL || !env.DISCORD_BOT_INTERNAL_SECRET) {
    throw new Error("Discord bot internal integration is not configured.");
  }

  const response = await fetch(`${env.DISCORD_BOT_INTERNAL_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.DISCORD_BOT_INTERNAL_SECRET}`,
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `Discord bot admin request failed with status ${response.status}.${text ? ` Response: ${text}` : ""}`,
    );
  }

  return response.json() as Promise<T>;
}

export async function resolveDiscordManagerStatus(userId: string) {
  const [config, linkedAccount] = await Promise.all([
    getOrCreateDiscordIntegrationConfig(),
    getDiscordLinkedAccount(userId),
  ]);

  if (!linkedAccount) {
    return {
      linked: false,
      guildConfigured: Boolean(config.guildId),
      guildMembership: false,
      managerRoleMatched: false,
      matchedRoleIds: [] as string[],
      discordUserId: null,
      error: "Connect a Discord account to manage the Discord bot.",
    };
  }

  if (!config.guildId) {
    return {
      linked: true,
      guildConfigured: false,
      guildMembership: false,
      managerRoleMatched: false,
      matchedRoleIds: [] as string[],
      discordUserId: linkedAccount.providerAccountId,
      error: null,
    };
  }

  try {
    const result = await callDiscordBotAdminEndpoint<{
      guildMembership: boolean;
      managerRoleMatched: boolean;
      matchedRoleIds: string[];
    }>("/internal/admin/verify", {
      guildId: config.guildId,
      discordUserId: linkedAccount.providerAccountId,
      allowedManagerRoleIds: config.allowedManagerRoleIds,
    });

    return {
      linked: true,
      guildConfigured: true,
      guildMembership: result.guildMembership,
      managerRoleMatched: result.managerRoleMatched,
      matchedRoleIds: result.matchedRoleIds,
      discordUserId: linkedAccount.providerAccountId,
      error:
        result.guildMembership && result.managerRoleMatched
          ? null
          : "Discord account is missing guild membership or manager role.",
    };
  } catch (error) {
    return {
      linked: true,
      guildConfigured: true,
      guildMembership: false,
      managerRoleMatched: false,
      matchedRoleIds: [] as string[],
      discordUserId: linkedAccount.providerAccountId,
      error: error instanceof Error ? error.message : "Failed to verify Discord manager access.",
    };
  }
}
