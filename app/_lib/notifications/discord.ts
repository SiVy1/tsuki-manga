import { prisma } from "@/app/_lib/db/client";
import { getOrCreateDiscordIntegrationConfig } from "@/app/_lib/discord/integration";
import { getEnv } from "@/app/_lib/settings/env";
import { buildAbsoluteUrl } from "@/app/_lib/seo/public-url";

type DiscordEmbedField = {
  name: string;
  value: string;
  inline?: boolean;
};

type DiscordEmbed = {
  title?: string;
  url?: string;
  description?: string;
  color?: number;
  fields?: DiscordEmbedField[];
  image?: {
    url: string;
  };
  timestamp?: string;
};

type DiscordWebhookPayload = {
  username?: string;
  embeds: DiscordEmbed[];
};

type DiscordBotEventEnvelope<T> = {
  eventId: string;
  eventType:
    | "series.created"
    | "chapter.published"
    | "comment.reported"
    | "copyright.reported";
  occurredAt: string;
  schemaVersion: 1;
  config: {
    guildId: string;
    defaultLocale: string;
    rolePrefix: string;
    announcementChannelId: string | null;
    subscriptionChannelId: string | null;
    moderationChannelId: string | null;
    newSeriesChannelId: string | null;
    staffAlertRoleId: string | null;
  };
  data: T;
};

const PUBLIC_EMBED_COLOR = 0x355a4b;
const PRIVATE_EMBED_COLOR = 0x7b5a34;

function compactLabel(parts: Array<string | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

async function postDiscordWebhook(url: string, payload: DiscordWebhookPayload) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const responseText = await response.text().catch(() => "");
    throw new Error(
      `Discord webhook failed with status ${response.status}.${responseText ? ` Response: ${responseText}` : ""}`,
    );
  }
}

async function toAbsoluteAssetUrl(url: string | null | undefined) {
  if (!url) {
    return null;
  }

  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  return buildAbsoluteUrl(url);
}

async function sendWebhookSafely(
  url: string | null | undefined,
  payload: DiscordWebhookPayload,
  label: string,
) {
  if (!url) {
    return;
  }

  try {
    await postDiscordWebhook(url, payload);
  } catch (error) {
    console.error(`Failed to send ${label} Discord notification.`, error);
  }
}

async function createDeliveryLog(input: {
  discordConfigId: string;
  eventId: string;
  eventType: string;
  status: "SENT" | "FAILED" | "SKIPPED";
  message?: string | null;
  targetChannelId?: string | null;
  targetMessageId?: string | null;
}) {
  await prisma.discordDeliveryLog.create({
    data: {
      discordConfigId: input.discordConfigId,
      eventId: input.eventId,
      eventType: input.eventType,
      status: input.status,
      message: input.message ?? null,
      targetChannelId: input.targetChannelId ?? null,
      targetMessageId: input.targetMessageId ?? null,
    },
  });
}

async function sendBotEvent<T>(
  eventType: DiscordBotEventEnvelope<T>["eventType"],
  enabled: boolean,
  data: T,
  fallback?: () => Promise<void>,
) {
  const env = getEnv();
  const config = await getOrCreateDiscordIntegrationConfig();
  const eventId = crypto.randomUUID();

  if (!enabled) {
    await createDeliveryLog({
      discordConfigId: config.id,
      eventId,
      eventType,
      status: "SKIPPED",
      message: "Discord event type disabled in integration config.",
    });
    return;
  }

  if (env.DISCORD_BOT_INTERNAL_URL && env.DISCORD_BOT_INTERNAL_SECRET && config.guildId) {
    const envelope: DiscordBotEventEnvelope<T> = {
      eventId,
      eventType,
      occurredAt: new Date().toISOString(),
      schemaVersion: 1,
      config: {
        guildId: config.guildId,
        defaultLocale: config.defaultLocale,
        rolePrefix: config.rolePrefix,
        announcementChannelId: config.announcementChannelId,
        subscriptionChannelId: config.subscriptionChannelId,
        moderationChannelId: config.moderationChannelId,
        newSeriesChannelId: config.newSeriesChannelId,
        staffAlertRoleId: config.staffAlertRoleId,
      },
      data,
    };

    try {
      const response = await fetch(`${env.DISCORD_BOT_INTERNAL_URL}/internal/events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.DISCORD_BOT_INTERNAL_SECRET}`,
        },
        body: JSON.stringify(envelope),
        cache: "no-store",
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(
          `Discord bot event failed with status ${response.status}.${text ? ` Response: ${text}` : ""}`,
        );
      }

      const result = (await response.json().catch(() => null)) as
        | {
            targetChannelId?: string;
            targetMessageId?: string;
          }
        | null;

      await createDeliveryLog({
        discordConfigId: config.id,
        eventId,
        eventType,
        status: "SENT",
        targetChannelId: result?.targetChannelId ?? null,
        targetMessageId: result?.targetMessageId ?? null,
      });

      return;
    } catch (error) {
      await createDeliveryLog({
        discordConfigId: config.id,
        eventId,
        eventType,
        status: "FAILED",
        message: error instanceof Error ? error.message : "Discord bot event failed.",
      });
      console.error(`Failed to send ${eventType} to Discord bot.`, error);
      return;
    }
  }

  if (fallback) {
    await fallback();
    await createDeliveryLog({
      discordConfigId: config.id,
      eventId,
      eventType,
      status: "SKIPPED",
      message: "Discord bot internal URL not configured. Legacy webhook fallback used.",
    });
    return;
  }

  await createDeliveryLog({
    discordConfigId: config.id,
    eventId,
    eventType,
    status: "SKIPPED",
    message: "Discord bot integration not configured.",
  });
}

export function buildChapterPublishedDiscordPayload(input: {
  seriesTitle: string;
  seriesCoverUrl: string | null;
  chapterId: string;
  chapterSlug: string;
  chapterNumber: string;
  chapterLabel: string | null;
  chapterTitle: string | null;
  publishedAt?: Date | null;
}) {
  const chapterPath = `/chapter/${input.chapterId}/${input.chapterSlug}`;
  const chapterLine = compactLabel([`Chapter ${input.chapterNumber}`, input.chapterLabel]);

  return Promise.all([
    buildAbsoluteUrl(chapterPath),
    toAbsoluteAssetUrl(input.seriesCoverUrl),
  ]).then(([chapterUrl, seriesCoverUrl]) => ({
    username: "Tsuki Manga Releases",
    embeds: [
      {
        title: input.seriesTitle,
        url: chapterUrl,
        description: input.chapterTitle ? `${chapterLine} · ${input.chapterTitle}` : chapterLine,
        color: PUBLIC_EMBED_COLOR,
        ...(seriesCoverUrl
          ? {
              image: {
                url: seriesCoverUrl,
              },
            }
          : {}),
        timestamp: (input.publishedAt ?? new Date()).toISOString(),
      },
    ],
  }));
}

export async function buildCommentReportedDiscordPayload(input: {
  seriesTitle: string;
  chapterId: string;
  chapterSlug: string;
  chapterNumber: string;
  chapterLabel: string | null;
  reasonLabel: string;
}) {
  const dashboardUrl = await buildAbsoluteUrl("/dashboard/comments");
  const chapterUrl = await buildAbsoluteUrl(`/chapter/${input.chapterId}/${input.chapterSlug}`);

  return {
    username: "Tsuki Manga Moderation",
    embeds: [
      {
        title: "Comment reported",
        color: PRIVATE_EMBED_COLOR,
        fields: [
          {
            name: "Series",
            value: input.seriesTitle,
            inline: true,
          },
          {
            name: "Chapter",
            value: compactLabel([input.chapterNumber, input.chapterLabel]),
            inline: true,
          },
          {
            name: "Reason",
            value: input.reasonLabel,
            inline: true,
          },
          {
            name: "Dashboard",
            value: `[Open moderation queue](${dashboardUrl})`,
          },
          {
            name: "Public context",
            value: `[Open chapter](${chapterUrl})`,
          },
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

export async function buildSeriesRemovalRequestDiscordPayload(input: {
  seriesTitle: string;
  claimantName: string;
}) {
  const dashboardUrl = await buildAbsoluteUrl("/dashboard/removal-requests");

  return {
    username: "Tsuki Manga Moderation",
    embeds: [
      {
        title: "Series removal request",
        color: PRIVATE_EMBED_COLOR,
        fields: [
          {
            name: "Series",
            value: input.seriesTitle,
            inline: true,
          },
          {
            name: "Claimant",
            value: input.claimantName,
            inline: true,
          },
          {
            name: "Dashboard",
            value: `[Open removal requests](${dashboardUrl})`,
          },
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

export async function notifySeriesCreated(input: {
  seriesId: string;
  title: string;
  slug: string;
  descriptionShort?: string | null;
  coverUrl?: string | null;
  visibility: "PUBLIC" | "HIDDEN";
}) {
  if (input.visibility !== "PUBLIC") {
    return;
  }

  const seriesUrl = await buildAbsoluteUrl(`/series/${input.slug}`);
  const coverUrl = await toAbsoluteAssetUrl(input.coverUrl);

  await sendBotEvent("series.created", true, {
    seriesId: input.seriesId,
    title: input.title,
    slug: input.slug,
    url: seriesUrl,
    coverUrl,
    description: input.descriptionShort ?? null,
  });
}

export async function notifyChapterPublished(
  input: Parameters<typeof buildChapterPublishedDiscordPayload>[0] & {
    seriesId?: string;
    seriesSlug?: string | null;
  },
) {
  const chapterUrl = await buildAbsoluteUrl(`/chapter/${input.chapterId}/${input.chapterSlug}`);
  const coverUrl = await toAbsoluteAssetUrl(input.seriesCoverUrl);

  await sendBotEvent(
    "chapter.published",
    (await getOrCreateDiscordIntegrationConfig()).chapterPublishedEnabled,
    {
      seriesId: input.seriesId ?? null,
      seriesTitle: input.seriesTitle,
      seriesSlug: input.seriesSlug ?? null,
      chapterId: input.chapterId,
      chapterSlug: input.chapterSlug,
      chapterNumber: input.chapterNumber,
      chapterLabel: input.chapterLabel,
      chapterTitle: input.chapterTitle,
      chapterUrl,
      coverUrl,
      publishedAt: (input.publishedAt ?? new Date()).toISOString(),
    },
    async () => {
      const payload = await buildChapterPublishedDiscordPayload(input);
      const env = getEnv();
      await sendWebhookSafely(
        env.DISCORD_PUBLIC_WEBHOOK_URL || null,
        payload,
        "public chapter release",
      );
    },
  );
}

export async function notifyCommentReported(
  input: Parameters<typeof buildCommentReportedDiscordPayload>[0],
) {
  const dashboardUrl = await buildAbsoluteUrl("/dashboard/comments");
  const chapterUrl = await buildAbsoluteUrl(`/chapter/${input.chapterId}/${input.chapterSlug}`);

  await sendBotEvent(
    "comment.reported",
    (await getOrCreateDiscordIntegrationConfig()).commentReportedEnabled,
    {
      seriesTitle: input.seriesTitle,
      chapterId: input.chapterId,
      chapterNumber: input.chapterNumber,
      chapterLabel: input.chapterLabel,
      chapterUrl,
      dashboardUrl,
      reasonLabel: input.reasonLabel,
    },
    async () => {
      const payload = await buildCommentReportedDiscordPayload(input);
      const env = getEnv();
      await sendWebhookSafely(
        env.DISCORD_PRIVATE_WEBHOOK_URL || null,
        payload,
        "private comment report",
      );
    },
  );
}

export async function notifySeriesRemovalRequestCreated(
  input: Parameters<typeof buildSeriesRemovalRequestDiscordPayload>[0],
) {
  const dashboardUrl = await buildAbsoluteUrl("/dashboard/removal-requests");

  await sendBotEvent(
    "copyright.reported",
    (await getOrCreateDiscordIntegrationConfig()).copyrightReportedEnabled,
    {
      seriesTitle: input.seriesTitle,
      claimantName: input.claimantName,
      dashboardUrl,
    },
    async () => {
      const payload = await buildSeriesRemovalRequestDiscordPayload(input);
      const env = getEnv();
      await sendWebhookSafely(
        env.DISCORD_PRIVATE_WEBHOOK_URL || null,
        payload,
        "private series removal request",
      );
    },
  );
}
