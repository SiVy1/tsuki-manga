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
  thumbnail?: {
    url: string;
  };
  image?: {
    url: string;
  };
  timestamp?: string;
};

type DiscordWebhookPayload = {
  username?: string;
  embeds: DiscordEmbed[];
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

export function buildChapterPublishedDiscordPayload(input: {
  seriesTitle: string;
  seriesCoverUrl: string | null;
  chapterId: string;
  chapterSlug: string;
  chapterNumber: string;
  chapterLabel: string | null;
  chapterTitle: string | null;
  publishedAt?: Date | null;
  publishedByName?: string | null;
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
        description: input.chapterTitle
          ? `${chapterLine} · ${input.chapterTitle}`
          : chapterLine,
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

export async function notifyChapterPublished(
  input: Parameters<typeof buildChapterPublishedDiscordPayload>[0],
) {
  const payload = await buildChapterPublishedDiscordPayload(input);
  const env = getEnv();

  await sendWebhookSafely(
    env.DISCORD_PUBLIC_WEBHOOK_URL || null,
    payload,
    "public chapter release",
  );
}

export async function notifyCommentReported(
  input: Parameters<typeof buildCommentReportedDiscordPayload>[0],
) {
  const payload = await buildCommentReportedDiscordPayload(input);
  const env = getEnv();

  await sendWebhookSafely(
    env.DISCORD_PRIVATE_WEBHOOK_URL || null,
    payload,
    "private comment report",
  );
}

export async function notifySeriesRemovalRequestCreated(
  input: Parameters<typeof buildSeriesRemovalRequestDiscordPayload>[0],
) {
  const payload = await buildSeriesRemovalRequestDiscordPayload(input);
  const env = getEnv();

  await sendWebhookSafely(
    env.DISCORD_PRIVATE_WEBHOOK_URL || null,
    payload,
    "private series removal request",
  );
}
