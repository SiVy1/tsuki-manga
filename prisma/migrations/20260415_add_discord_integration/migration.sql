CREATE TYPE "DiscordDeliveryStatus" AS ENUM ('SENT', 'FAILED', 'SKIPPED');

CREATE TABLE "DiscordIntegrationConfig" (
    "id" UUID NOT NULL,
    "instanceSettingsId" UUID NOT NULL,
    "guildId" TEXT NOT NULL,
    "defaultLocale" TEXT NOT NULL DEFAULT 'en',
    "announcementChannelId" TEXT,
    "subscriptionChannelId" TEXT,
    "moderationChannelId" TEXT,
    "newSeriesChannelId" TEXT,
    "staffAlertRoleId" TEXT,
    "allowedManagerRoleIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "subscriptionMessageIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "chapterPublishedEnabled" BOOLEAN NOT NULL DEFAULT true,
    "seriesCreatedEnabled" BOOLEAN NOT NULL DEFAULT true,
    "commentReportedEnabled" BOOLEAN NOT NULL DEFAULT true,
    "copyrightReportedEnabled" BOOLEAN NOT NULL DEFAULT true,
    "rolePrefix" TEXT NOT NULL DEFAULT 'tsuki-series',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscordIntegrationConfig_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DiscordDeliveryLog" (
    "id" UUID NOT NULL,
    "discordConfigId" UUID NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "status" "DiscordDeliveryStatus" NOT NULL,
    "message" TEXT,
    "targetChannelId" TEXT,
    "targetMessageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscordDeliveryLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DiscordIntegrationConfig_instanceSettingsId_key" ON "DiscordIntegrationConfig"("instanceSettingsId");
CREATE UNIQUE INDEX "DiscordDeliveryLog_eventId_key" ON "DiscordDeliveryLog"("eventId");
CREATE INDEX "DiscordDeliveryLog_discordConfigId_createdAt_idx" ON "DiscordDeliveryLog"("discordConfigId", "createdAt");
CREATE INDEX "DiscordDeliveryLog_status_createdAt_idx" ON "DiscordDeliveryLog"("status", "createdAt");

ALTER TABLE "DiscordIntegrationConfig" ADD CONSTRAINT "DiscordIntegrationConfig_instanceSettingsId_fkey" FOREIGN KEY ("instanceSettingsId") REFERENCES "InstanceSettings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DiscordDeliveryLog" ADD CONSTRAINT "DiscordDeliveryLog_discordConfigId_fkey" FOREIGN KEY ("discordConfigId") REFERENCES "DiscordIntegrationConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
