import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildChapterPublishedDiscordPayload,
  buildCommentReportedDiscordPayload,
  buildSeriesRemovalRequestDiscordPayload,
  notifyChapterPublished,
  notifyCommentReported,
  notifySeriesRemovalRequestCreated,
} from "@/app/_lib/notifications/discord";

const envState = {
  DISCORD_PUBLIC_WEBHOOK_URL: "",
  DISCORD_PRIVATE_WEBHOOK_URL: "",
};

vi.mock("@/app/_lib/settings/env", () => ({
  getEnv: vi.fn(() => envState),
}));

vi.mock("@/app/_lib/seo/public-url", () => ({
  buildAbsoluteUrl: vi.fn(async (path = "") => `https://tsuki.example/${String(path).replace(/^\/+/, "")}`),
}));

describe("discord notifications", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({
      ok: true,
      status: 204,
    });
    vi.stubGlobal("fetch", fetchMock);
    envState.DISCORD_PUBLIC_WEBHOOK_URL = "";
    envState.DISCORD_PRIVATE_WEBHOOK_URL = "";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("builds a public chapter embed with cover and chapter link", async () => {
    const payload = await buildChapterPublishedDiscordPayload({
      seriesTitle: "Tsuki no Yoru",
      seriesCoverUrl: "https://cdn.example/cover.jpg",
      chapterId: "chapter-1",
      chapterSlug: "arrival",
      chapterNumber: "12",
      chapterLabel: "special",
      chapterTitle: "Arrival",
      publishedByName: "Seweryn",
    });

    expect(payload.username).toBe("Tsuki Manga Releases");
    expect(payload.embeds[0]?.title).toBe("Tsuki no Yoru");
    expect(payload.embeds[0]?.image?.url).toBe("https://cdn.example/cover.jpg");
    expect(payload.embeds[0]?.url).toBe("https://tsuki.example/chapter/chapter-1/arrival");
    expect(payload.embeds[0]?.description).toContain("Chapter 12");
    expect(payload.embeds[0]?.description).toContain("Arrival");
  });

  it("builds a private moderation payload for comment reports", async () => {
    const payload = await buildCommentReportedDiscordPayload({
      seriesTitle: "Moon Garden",
      chapterId: "chapter-2",
      chapterSlug: "echoes",
      chapterNumber: "5",
      chapterLabel: null,
      reasonLabel: "Spam",
    });

    expect(payload.username).toBe("Tsuki Manga Moderation");
    expect(payload.embeds[0]?.title).toBe("Comment reported");
    expect(payload.embeds[0]?.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "Series", value: "Moon Garden" }),
        expect.objectContaining({ name: "Reason", value: "Spam" }),
      ]),
    );
  });

  it("builds a private moderation payload for series removal requests", async () => {
    const payload = await buildSeriesRemovalRequestDiscordPayload({
      seriesTitle: "Quiet Harbor",
      claimantName: "Aki Tan",
    });

    expect(payload.embeds[0]?.title).toBe("Series removal request");
    expect(payload.embeds[0]?.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "Series", value: "Quiet Harbor" }),
        expect.objectContaining({ name: "Claimant", value: "Aki Tan" }),
      ]),
    );
  });

  it("sends public events only to the public webhook", async () => {
    envState.DISCORD_PUBLIC_WEBHOOK_URL = "https://discord.example/public";

    await notifyChapterPublished({
      seriesTitle: "Tsuki no Yoru",
      seriesCoverUrl: null,
      chapterId: "chapter-1",
      chapterSlug: "arrival",
      chapterNumber: "12",
      chapterLabel: null,
      chapterTitle: null,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://discord.example/public",
      expect.objectContaining({
        method: "POST",
      }),
    );
  });

  it("sends private events only to the private webhook", async () => {
    envState.DISCORD_PRIVATE_WEBHOOK_URL = "https://discord.example/private";

    await notifyCommentReported({
      seriesTitle: "Moon Garden",
      chapterId: "chapter-2",
      chapterSlug: "echoes",
      chapterNumber: "5",
      chapterLabel: null,
      reasonLabel: "Spam",
    });

    await notifySeriesRemovalRequestCreated({
      seriesTitle: "Quiet Harbor",
      claimantName: "Aki Tan",
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://discord.example/private",
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://discord.example/private",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("does not throw when the webhook request fails", async () => {
    envState.DISCORD_PRIVATE_WEBHOOK_URL = "https://discord.example/private";
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    await expect(
      notifySeriesRemovalRequestCreated({
        seriesTitle: "Quiet Harbor",
        claimantName: "Aki Tan",
      }),
    ).resolves.toBeUndefined();
  });
});
