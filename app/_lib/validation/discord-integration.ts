import { z } from "zod";

const discordIdSchema = z
  .string()
  .trim()
  .regex(/^\d+$/, "Discord IDs must contain digits only.")
  .optional()
  .or(z.literal(""));

function normalizeOptionalDiscordId(value: string | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed;
}

function normalizeDiscordIdList(values: Array<string | undefined>) {
  return values
    .map((value) => value?.trim() ?? "")
    .filter(Boolean);
}

export const updateDiscordIntegrationInputSchema = z
  .object({
    guildId: discordIdSchema,
    defaultLocale: z.enum(["en", "pl"]).default("en"),
    announcementChannelId: discordIdSchema,
    subscriptionChannelId: discordIdSchema,
    moderationChannelId: discordIdSchema,
    newSeriesChannelId: discordIdSchema,
    staffAlertRoleId: discordIdSchema,
    allowedManagerRoleIds: z.array(discordIdSchema).default([]),
    chapterPublishedEnabled: z.boolean().default(true),
    seriesCreatedEnabled: z.boolean().default(true),
    commentReportedEnabled: z.boolean().default(true),
    copyrightReportedEnabled: z.boolean().default(true),
    rolePrefix: z
      .string()
      .trim()
      .min(2, "Role prefix must be at least 2 characters.")
      .max(60, "Role prefix is too long."),
  })
  .transform((value) => ({
    guildId: normalizeOptionalDiscordId(value.guildId),
    defaultLocale: value.defaultLocale,
    announcementChannelId: normalizeOptionalDiscordId(value.announcementChannelId),
    subscriptionChannelId: normalizeOptionalDiscordId(value.subscriptionChannelId),
    moderationChannelId: normalizeOptionalDiscordId(value.moderationChannelId),
    newSeriesChannelId: normalizeOptionalDiscordId(value.newSeriesChannelId),
    staffAlertRoleId: normalizeOptionalDiscordId(value.staffAlertRoleId),
    allowedManagerRoleIds: normalizeDiscordIdList(value.allowedManagerRoleIds),
    chapterPublishedEnabled: value.chapterPublishedEnabled,
    seriesCreatedEnabled: value.seriesCreatedEnabled,
    commentReportedEnabled: value.commentReportedEnabled,
    copyrightReportedEnabled: value.copyrightReportedEnabled,
    rolePrefix: value.rolePrefix,
  }));

export const discordBotAdminActionInputSchema = z.object({
  action: z.enum([
    "verify-manager-access",
    "sync-series-roles",
    "publish-subscription-menu",
    "refresh-subscription-menu",
    "send-test-notification",
  ]),
});
