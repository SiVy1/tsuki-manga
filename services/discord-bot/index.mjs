import http from "node:http";

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
  EmbedBuilder,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
} from "discord.js";

const env = {
  token: process.env.DISCORD_BOT_TOKEN ?? "",
  clientId: process.env.DISCORD_BOT_CLIENT_ID ?? "",
  port: Number(process.env.DISCORD_BOT_PORT ?? "3001"),
  internalSecret: process.env.DISCORD_BOT_INTERNAL_SECRET ?? "",
};

if (!env.token || !env.clientId || !env.internalSecret) {
  throw new Error("Missing Discord bot environment configuration.");
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

const commands = [
  new SlashCommandBuilder()
    .setName("subscriptions")
    .setDescription("Show current Tsuki Manga subscription roles."),
  new SlashCommandBuilder().setName("bot-help").setDescription("Show bot usage help."),
].map((command) => command.toJSON());

const messages = {
  en: {
    helpTitle: "Tsuki Manga bot",
    helpDescription:
      "Choose the series you want to follow to get Discord notifications about new chapters.",
    subscriptionsNone: "You are not following any series on Discord yet.",
    subscriptionsTitle: "Series you follow on Discord",
    menuPlaceholder: "Choose series to get new chapter notifications",
    menuSaved: "Your Discord series notifications have been updated.",
    chapterPublished: "New chapter published",
    chapterPublishedLead: "A new chapter is now available for this series.",
    newSeries: "New series added",
    newSeriesLead: "A new series has just been added to the catalog.",
    commentReported: "Comment reported",
    copyrightReported: "Copyright report received",
    openChapter: "Read now",
    openSeries: "View series",
    openDashboard: "Open dashboard",
    reason: "Reason",
    claimant: "Claimant",
    series: "Series",
    chapter: "Chapter",
    details: "Details",
    moderationLead: "A new moderation report needs review.",
    copyrightLead: "A new copyright report is waiting for review.",
    testTitle: "Discord bot test",
    testDescription: "Dashboard -> bot connection works.",
  },
  pl: {
    helpTitle: "Bot Tsuki Manga",
    helpDescription:
      "Wybierz serie, o ktorych chcesz dostawac na Discordzie powiadomienia o nowych rozdzialach.",
    subscriptionsNone: "Nie obserwujesz jeszcze zadnej serii na Discordzie.",
    subscriptionsTitle: "Serie, ktore obserwujesz na Discordzie",
    menuPlaceholder: "Wybierz serie, o ktorych chcesz dostawac powiadomienia o nowych rozdzialach",
    menuSaved: "Zaktualizowano serie, o ktorych bedziesz dostawac powiadomienia na Discordzie.",
    chapterPublished: "Opublikowano nowy rozdzial",
    chapterPublishedLead: "Nowy rozdzial tej serii jest juz dostepny.",
    newSeries: "Dodano nowa serie",
    newSeriesLead: "Do katalogu trafila nowa seria.",
    commentReported: "Zgloszono komentarz",
    copyrightReported: "Otrzymano zgloszenie praw autorskich",
    openChapter: "Czytaj teraz",
    openSeries: "Zobacz serie",
    openDashboard: "Otworz panel",
    reason: "Powod",
    claimant: "Zglaszajacy",
    series: "Seria",
    chapter: "Rozdzial",
    details: "Szczegoly",
    moderationLead: "Nowe zgloszenie moderacyjne czeka na sprawdzenie.",
    copyrightLead: "Nowe zgloszenie praw autorskich czeka na sprawdzenie.",
    testTitle: "Test bota Discord",
    testDescription: "Polaczenie dashboard -> bot dziala.",
  },
};

function t(locale, key) {
  const safeLocale = locale === "pl" ? "pl" : "en";
  return messages[safeLocale][key] ?? messages.en[key] ?? key;
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
    });
    req.on("end", () => {
      if (!raw) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json",
  });
  res.end(JSON.stringify(body));
}

function buildLinkRow(locale, links) {
  const buttons = links
    .filter((entry) => entry?.url)
    .slice(0, 5)
    .map((entry) =>
      new ButtonBuilder()
        .setStyle(ButtonStyle.Link)
        .setLabel(entry.label)
        .setURL(entry.url),
    );

  if (buttons.length === 0) {
    return [];
  }

  return [new ActionRowBuilder().addComponents(buttons)];
}

function requireAuth(req, res) {
  const header = req.headers.authorization ?? "";

  if (header !== `Bearer ${env.internalSecret}`) {
    sendJson(res, 401, { error: "Unauthorized" });
    return false;
  }

  return true;
}

function buildManagedRoleName(rolePrefix, seriesId, title) {
  const slug = String(seriesId ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

  return `${rolePrefix}:${slug || "series"}`.slice(0, 100);
}

function findSeriesRole(guild, rolePrefix, seriesSlug) {
  return guild.roles.cache.find((role) => role.name === buildManagedRoleName(rolePrefix, seriesSlug)) ?? null;
}

async function ensureSeriesRole(guild, rolePrefix, series) {
  const existing = findSeriesRole(guild, rolePrefix, series.slug);
  const nextName = buildManagedRoleName(rolePrefix, series.slug);

  if (!existing) {
    return guild.roles.create({
      name: nextName,
      mentionable: true,
      reason: "Tsuki Manga series subscription role",
    });
  }

  if (existing.name !== nextName) {
    await existing.edit({
      name: nextName,
      reason: "Tsuki Manga series title sync",
    });
  }

  return existing;
}

async function syncSeriesRoles(guild, rolePrefix, publicSeries) {
  for (const series of publicSeries) {
    await ensureSeriesRole(guild, rolePrefix, series);
  }
}

function chunkArray(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

async function publishSubscriptionMenu({
  guild,
  locale,
  rolePrefix,
  channelId,
  publicSeries,
  existingMessageIds = [],
}) {
  const channel = await guild.channels.fetch(channelId);

  if (!channel?.isTextBased()) {
    throw new Error("Subscription channel is not a text channel.");
  }

  for (const messageId of existingMessageIds) {
    try {
      const existing = await channel.messages.fetch(messageId);
      await existing.delete();
    } catch {
      // Ignore missing old messages.
    }
  }

  const chunks = chunkArray(publicSeries, 25);
  const messageIds = [];

  for (const [index, chunk] of chunks.entries()) {
    const options = chunk.map((series) => ({
      label: series.title.slice(0, 100),
      value: `${rolePrefix}:${series.slug}`,
      description: series.slug.slice(0, 100),
    }));

    const menu = new StringSelectMenuBuilder()
      .setCustomId(`tsuki-subscribe:${index}`)
      .setPlaceholder(t(locale, "menuPlaceholder"))
      .setMinValues(0)
      .setMaxValues(options.length)
      .addOptions(options);

    const row = new ActionRowBuilder().addComponents(menu);
    const message = await channel.send({
      content:
        chunks.length > 1
          ? `${t(locale, "menuPlaceholder")} (${index + 1}/${chunks.length})`
          : t(locale, "menuPlaceholder"),
      components: [row],
    });

    messageIds.push(message.id);
  }

  return messageIds;
}

async function registerGuildCommands(guildId) {
  const rest = new REST({ version: "10" }).setToken(env.token);
  await rest.put(Routes.applicationGuildCommands(env.clientId, guildId), {
    body: commands,
  });
}

client.once("ready", () => {
  console.log(`Discord bot ready as ${client.user?.tag ?? "unknown"}`);
});

client.on("interactionCreate", async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === "subscriptions") {
        const member = await interaction.guild?.members.fetch(interaction.user.id);

        if (!member) {
          await interaction.reply({
            ephemeral: true,
            content: "Guild membership required.",
          });
          return;
        }

        const managedRoles = member.roles.cache
          .filter((role) => /^[^:]+:[^:]+$/.test(role.name))
          .map((role) => role.name.split(":").slice(1).join(":"))
          .filter(Boolean);

        await interaction.reply({
          ephemeral: true,
          content: managedRoles.length
            ? `${t("en", "subscriptionsTitle")}: ${managedRoles.join(", ")}`
            : t("en", "subscriptionsNone"),
        });
        return;
      }

      if (interaction.commandName === "bot-help") {
        await interaction.reply({
          ephemeral: true,
          embeds: [
            new EmbedBuilder()
              .setTitle(t("en", "helpTitle"))
              .setDescription(t("en", "helpDescription")),
          ],
        });
        return;
      }
    }

    if (interaction.isStringSelectMenu() && interaction.customId.startsWith("tsuki-subscribe:")) {
      const guild = interaction.guild;
      const member = interaction.member;

      if (!guild || !member || !("roles" in member)) {
        await interaction.reply({ ephemeral: true, content: "Guild membership required." });
        return;
      }

      const optionSeriesIds = interaction.component.options.map((option) => option.value);
      const selectedSeriesIds = new Set(interaction.values);
      const roleIdsToRemove = [];
      const roleIdsToAdd = [];

      for (const optionValue of optionSeriesIds) {
        const [rolePrefix, ...slugParts] = optionValue.split(":");
        const seriesSlug = slugParts.join(":");
        const role = findSeriesRole(guild, rolePrefix, seriesSlug);

        if (!role) {
          continue;
        }

        if (selectedSeriesIds.has(optionValue)) {
          if (!member.roles.cache.has(role.id)) {
            roleIdsToAdd.push(role.id);
          }
        } else if (member.roles.cache.has(role.id)) {
          roleIdsToRemove.push(role.id);
        }
      }

      if (roleIdsToAdd.length) {
        await member.roles.add(roleIdsToAdd, "Tsuki Manga series subscription update");
      }

      if (roleIdsToRemove.length) {
        await member.roles.remove(roleIdsToRemove, "Tsuki Manga series subscription update");
      }

      await interaction.reply({
        ephemeral: true,
        content: t("en", "menuSaved"),
      });
    }
  } catch (error) {
    console.error("Discord interaction failed.", error);

    if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
      await interaction.reply({
        ephemeral: true,
        content: "Discord action failed.",
      }).catch(() => undefined);
    }
  }
});

async function handleVerify(body, res) {
  const guild = await client.guilds.fetch(body.guildId);
  const member = await guild.members.fetch(body.discordUserId).catch(() => null);

  if (!member) {
    sendJson(res, 200, {
      guildMembership: false,
      managerRoleMatched: false,
      matchedRoleIds: [],
    });
    return;
  }

  const allowedRoleIds = Array.isArray(body.allowedManagerRoleIds)
    ? body.allowedManagerRoleIds.filter(Boolean)
    : [];
  const matchedRoleIds = allowedRoleIds.filter((roleId) => member.roles.cache.has(roleId));

  sendJson(res, 200, {
    guildMembership: true,
    managerRoleMatched: allowedRoleIds.length === 0 || matchedRoleIds.length > 0,
    matchedRoleIds,
  });
}

async function handleAdminAction(body, res) {
  const guild = await client.guilds.fetch(body.guildId);
  await registerGuildCommands(guild.id);

  if (body.action === "verify-manager-access") {
    sendJson(res, 200, { ok: true, message: "Manager access verified." });
    return;
  }

  if (body.action === "sync-series-roles") {
    await syncSeriesRoles(guild, body.rolePrefix, body.publicSeries ?? []);
    sendJson(res, 200, { ok: true, message: "Series roles synced." });
    return;
  }

  if (body.action === "publish-subscription-menu" || body.action === "refresh-subscription-menu") {
    if (!body.channels?.subscriptionChannelId) {
      throw new Error("Subscription channel ID is missing.");
    }

    await syncSeriesRoles(guild, body.rolePrefix, body.publicSeries ?? []);
    const subscriptionMessageIds = await publishSubscriptionMenu({
      guild,
      locale: body.defaultLocale,
      rolePrefix: body.rolePrefix,
      channelId: body.channels.subscriptionChannelId,
      publicSeries: body.publicSeries ?? [],
      existingMessageIds: body.subscriptionMessageIds ?? [],
    });

    sendJson(res, 200, {
      ok: true,
      message:
        body.action === "publish-subscription-menu"
          ? "Subscription menu published."
          : "Subscription menu refreshed.",
      subscriptionMessageIds,
    });
    return;
  }

  if (body.action === "send-test-notification") {
    const channelId = body.channels?.announcementChannelId ?? body.channels?.moderationChannelId;

    if (!channelId) {
      throw new Error("No configured test target channel.");
    }

    const channel = await guild.channels.fetch(channelId);

    if (!channel?.isTextBased()) {
      throw new Error("Configured test target is not a text channel.");
    }

    const message = await channel.send({
      embeds: [
        new EmbedBuilder()
          .setTitle(t(body.defaultLocale, "testTitle"))
          .setDescription(t(body.defaultLocale, "testDescription")),
      ],
    });

    sendJson(res, 200, {
      ok: true,
      message: "Test notification sent.",
      targetChannelId: channel.id,
      targetMessageId: message.id,
    });
    return;
  }

  throw new Error("Unsupported admin action.");
}

async function handleEvent(body, res) {
  const guild = await client.guilds.fetch(body.config.guildId);
  const locale = body.config.defaultLocale === "pl" ? "pl" : "en";
  const rolePrefix = body.config.rolePrefix;

  if (body.eventType === "chapter.published") {
    const channelId = body.config.announcementChannelId;

    if (!channelId) {
      throw new Error("Announcement channel is not configured.");
    }

    const channel = await guild.channels.fetch(channelId);
    if (!channel?.isTextBased()) {
      throw new Error("Announcement channel is not a text channel.");
    }

    const role = body.data.seriesSlug ? findSeriesRole(guild, rolePrefix, body.data.seriesSlug) : null;
    const chapterLabel = `${body.data.chapterNumber}${body.data.chapterLabel ? ` ${body.data.chapterLabel}` : ""}`;
    const embed = new EmbedBuilder()
      .setColor(0x355a4b)
      .setAuthor({
        name: t(locale, "chapterPublished"),
      })
      .setTitle(`${body.data.seriesTitle}`)
      .setURL(body.data.chapterUrl)
      .setDescription([t(locale, "chapterPublishedLead"), body.data.chapterTitle].filter(Boolean).join("\n"))
      .addFields(
        {
          name: t(locale, "chapter"),
          value: chapterLabel,
          inline: true,
        },
        {
          name: t(locale, "series"),
          value: body.data.seriesTitle,
          inline: true,
        },
      )
      .setTimestamp(new Date(body.data.publishedAt));

    if (body.data.coverUrl) {
      embed.setThumbnail(body.data.coverUrl);
    }

    const message = await channel.send({
      content: role ? `<@&${role.id}>` : undefined,
      embeds: [embed],
      components: buildLinkRow(locale, [
        { label: t(locale, "openChapter"), url: body.data.chapterUrl },
        { label: t(locale, "openSeries"), url: body.data.seriesUrl },
      ]),
    });

    sendJson(res, 200, {
      ok: true,
      targetChannelId: channel.id,
      targetMessageId: message.id,
    });
    return;
  }

  if (body.eventType === "series.created") {
    const channelId = body.config.newSeriesChannelId || body.config.announcementChannelId;

    if (!channelId) {
      throw new Error("No channel configured for series notifications.");
    }

    const channel = await guild.channels.fetch(channelId);
    if (!channel?.isTextBased()) {
      throw new Error("Series notification channel is not a text channel.");
    }

    const embed = new EmbedBuilder()
      .setColor(0x4d6a89)
      .setAuthor({
        name: t(locale, "newSeries"),
      })
      .setTitle(body.data.title)
      .setURL(body.data.url)
      .setDescription([t(locale, "newSeriesLead"), body.data.description].filter(Boolean).join("\n\n"))
      .addFields(
        {
          name: t(locale, "series"),
          value: body.data.title,
        },
      );

    if (body.data.coverUrl) {
      embed.setImage(body.data.coverUrl);
    }

    const message = await channel.send({
      embeds: [embed],
      components: buildLinkRow(locale, [
        { label: t(locale, "openSeries"), url: body.data.url },
      ]),
    });

    sendJson(res, 200, {
      ok: true,
      targetChannelId: channel.id,
      targetMessageId: message.id,
    });
    return;
  }

  if (body.eventType === "comment.reported") {
    const channelId = body.config.moderationChannelId;

    if (!channelId) {
      throw new Error("Moderation channel is not configured.");
    }

    const channel = await guild.channels.fetch(channelId);
    if (!channel?.isTextBased()) {
      throw new Error("Moderation channel is not a text channel.");
    }

    const content = body.config.staffAlertRoleId ? `<@&${body.config.staffAlertRoleId}>` : undefined;
    const message = await channel.send({
      content,
      embeds: [
        new EmbedBuilder()
          .setColor(0x7b5a34)
          .setTitle(t(locale, "commentReported"))
          .setDescription(t(locale, "moderationLead"))
          .addFields(
            { name: t(locale, "series"), value: body.data.seriesTitle, inline: true },
            {
              name: t(locale, "chapter"),
              value: `${body.data.chapterNumber}${body.data.chapterLabel ? ` ${body.data.chapterLabel}` : ""}`,
              inline: true,
            },
            { name: t(locale, "reason"), value: body.data.reasonLabel, inline: true },
          )
          .setTimestamp(new Date(body.occurredAt)),
      ],
      components: buildLinkRow(locale, [
        { label: t(locale, "openChapter"), url: body.data.chapterUrl },
        { label: t(locale, "openDashboard"), url: body.data.dashboardUrl },
      ]),
    });

    sendJson(res, 200, {
      ok: true,
      targetChannelId: channel.id,
      targetMessageId: message.id,
    });
    return;
  }

  if (body.eventType === "copyright.reported") {
    const channelId = body.config.moderationChannelId;

    if (!channelId) {
      throw new Error("Moderation channel is not configured.");
    }

    const channel = await guild.channels.fetch(channelId);
    if (!channel?.isTextBased()) {
      throw new Error("Moderation channel is not a text channel.");
    }

    const content = body.config.staffAlertRoleId ? `<@&${body.config.staffAlertRoleId}>` : undefined;
    const message = await channel.send({
      content,
      embeds: [
        new EmbedBuilder()
          .setColor(0x8a4b4b)
          .setTitle(t(locale, "copyrightReported"))
          .setDescription(t(locale, "copyrightLead"))
          .addFields(
            { name: t(locale, "series"), value: body.data.seriesTitle, inline: true },
            { name: t(locale, "claimant"), value: body.data.claimantName, inline: true },
          )
          .setTimestamp(new Date(body.occurredAt)),
      ],
      components: buildLinkRow(locale, [
        { label: t(locale, "openDashboard"), url: body.data.dashboardUrl },
      ]),
    });

    sendJson(res, 200, {
      ok: true,
      targetChannelId: channel.id,
      targetMessageId: message.id,
    });
    return;
  }

  throw new Error("Unsupported event type.");
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "GET" && req.url === "/health") {
      sendJson(res, 200, { ok: true, ready: client.isReady() });
      return;
    }

    if (!requireAuth(req, res)) {
      return;
    }

    const body = await parseJsonBody(req);

    if (req.method === "POST" && req.url === "/internal/admin/verify") {
      await handleVerify(body, res);
      return;
    }

    if (req.method === "POST" && req.url === "/internal/admin/action") {
      await handleAdminAction(body, res);
      return;
    }

    if (req.method === "POST" && req.url === "/internal/events") {
      await handleEvent(body, res);
      return;
    }

    sendJson(res, 404, { error: "Not found" });
  } catch (error) {
    console.error("Discord bot server error.", error);
    sendJson(res, 500, {
      error: error instanceof Error ? error.message : "Discord bot server error.",
    });
  }
});

await client.login(env.token);

server.listen(env.port, () => {
  console.log(`Discord bot internal server listening on ${env.port}`);
});
