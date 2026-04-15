"use server";

import { revalidatePath } from "next/cache";

import { requirePermission } from "@/app/_lib/auth/session";
import {
  callDiscordBotAdminEndpoint,
  getDiscordLinkedAccount,
  getOrCreateDiscordIntegrationConfig,
  resolveDiscordManagerStatus,
} from "@/app/_lib/discord/integration";
import { prisma } from "@/app/_lib/db/client";
import { PermissionBits } from "@/app/_lib/permissions/bits";
import { fail, ok } from "@/app/_lib/utils/action-result";
import {
  discordBotAdminActionInputSchema,
  updateDiscordIntegrationInputSchema,
} from "@/app/_lib/validation/discord-integration";

export async function updateDiscordIntegrationConfigAction(rawInput: unknown) {
  const user = await requirePermission(PermissionBits.SETTINGS);
  const parsed = updateDiscordIntegrationInputSchema.safeParse(rawInput);

  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid Discord integration input.");
  }

  const linkedAccount = await getDiscordLinkedAccount(user.id);

  if (!linkedAccount) {
    return fail("Connect a Discord account before managing the Discord bot.");
  }

  const config = await getOrCreateDiscordIntegrationConfig();

  await prisma.discordIntegrationConfig.update({
    where: { id: config.id },
    data: parsed.data,
  });

  revalidatePath("/dashboard/discord");
  return ok({ id: config.id });
}

export async function runDiscordBotAdminAction(rawInput: unknown) {
  const user = await requirePermission(PermissionBits.SETTINGS);
  const parsed = discordBotAdminActionInputSchema.safeParse(rawInput);

  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid Discord bot action.");
  }

  const [config, managerStatus] = await Promise.all([
    getOrCreateDiscordIntegrationConfig(),
    resolveDiscordManagerStatus(user.id),
  ]);

  if (!managerStatus.linked) {
    return fail("Connect a Discord account before managing the Discord bot.");
  }

  if (!config.guildId) {
    return fail("Save a Discord guild ID first.");
  }

  if (!managerStatus.guildMembership || !managerStatus.managerRoleMatched) {
    return fail(managerStatus.error ?? "Discord manager verification failed.");
  }

  try {
    const publicSeries = await prisma.series.findMany({
      where: {
        deletedAt: null,
        visibility: "PUBLIC",
      },
      select: {
        id: true,
        title: true,
        slug: true,
      },
      orderBy: {
        title: "asc",
      },
    });

    const result = await callDiscordBotAdminEndpoint<{
      ok: boolean;
      message?: string;
      subscriptionMessageIds?: string[];
    }>("/internal/admin/action", {
      action: parsed.data.action,
      guildId: config.guildId,
      rolePrefix: config.rolePrefix,
      defaultLocale: config.defaultLocale,
      channels: {
        announcementChannelId: config.announcementChannelId,
        subscriptionChannelId: config.subscriptionChannelId,
        moderationChannelId: config.moderationChannelId,
        newSeriesChannelId: config.newSeriesChannelId,
      },
      subscriptionMessageIds: config.subscriptionMessageIds,
      publicSeries,
    });

    if (result.subscriptionMessageIds) {
      await prisma.discordIntegrationConfig.update({
        where: { id: config.id },
        data: {
          subscriptionMessageIds: result.subscriptionMessageIds,
        },
      });
    }

    revalidatePath("/dashboard/discord");
    return ok({
      message: result.message ?? "Discord bot action completed.",
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Discord bot action failed.");
  }
}
