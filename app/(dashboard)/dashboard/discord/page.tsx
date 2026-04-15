import { redirect } from "next/navigation";

import {
  runDiscordBotAdminAction,
  updateDiscordIntegrationConfigAction,
} from "@/app/_actions/discord/actions";
import { requirePermission } from "@/app/_lib/auth/session";
import { getDashboardDiscordData } from "@/app/_lib/dashboard/queries";
import { PermissionBits } from "@/app/_lib/permissions/bits";
import { SubmitButton } from "@/app/_components/submit-button";

type PageProps = {
  searchParams: Promise<{
    error?: string;
    notice?: string;
  }>;
};

function parseIdList(raw: string) {
  return raw
    .split(/[\n,]/)
    .map((value) => value.trim())
    .filter(Boolean);
}

export default async function DashboardDiscordPage({ searchParams }: PageProps) {
  const user = await requirePermission(PermissionBits.SETTINGS);
  const [params, data] = await Promise.all([
    searchParams,
    getDashboardDiscordData(user.id),
  ]);

  async function saveConfigAction(formData: FormData) {
    "use server";

    const result = await updateDiscordIntegrationConfigAction({
      guildId: formData.get("guildId")?.toString() ?? "",
      defaultLocale: formData.get("defaultLocale")?.toString() === "pl" ? "pl" : "en",
      announcementChannelId: formData.get("announcementChannelId")?.toString() ?? "",
      subscriptionChannelId: formData.get("subscriptionChannelId")?.toString() ?? "",
      moderationChannelId: formData.get("moderationChannelId")?.toString() ?? "",
      newSeriesChannelId: formData.get("newSeriesChannelId")?.toString() ?? "",
      staffAlertRoleId: formData.get("staffAlertRoleId")?.toString() ?? "",
      allowedManagerRoleIds: parseIdList(
        formData.get("allowedManagerRoleIds")?.toString() ?? "",
      ),
      chapterPublishedEnabled: formData.get("chapterPublishedEnabled") === "on",
      seriesCreatedEnabled: formData.get("seriesCreatedEnabled") === "on",
      commentReportedEnabled: formData.get("commentReportedEnabled") === "on",
      copyrightReportedEnabled: formData.get("copyrightReportedEnabled") === "on",
      rolePrefix: formData.get("rolePrefix")?.toString() ?? "tsuki-series",
    });

    if (!result.success) {
      redirect(`/dashboard/discord?error=${encodeURIComponent(result.error)}`);
    }

    redirect(`/dashboard/discord?notice=${encodeURIComponent("Discord config saved.")}`);
  }

  function makeBotAction(action: "verify-manager-access" | "sync-series-roles" | "publish-subscription-menu" | "refresh-subscription-menu" | "send-test-notification") {
    return async function botAction() {
      "use server";

      const result = await runDiscordBotAdminAction({ action });

      if (!result.success) {
        redirect(`/dashboard/discord?error=${encodeURIComponent(result.error)}`);
      }

      redirect(`/dashboard/discord?notice=${encodeURIComponent(result.data.message)}`);
    };
  }

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <p className="text-xs uppercase tracking-[0.24em] text-muted">Discord</p>
        <h1 className="font-serif text-4xl">Discord bot</h1>
        <p className="max-w-3xl text-sm text-muted">
          Configure channels by ID, verify manager access, sync series roles, and publish the subscription menu.
        </p>
      </section>

      {params.notice ? <p className="notice-success rounded-2xl px-4 py-3 text-sm">{params.notice}</p> : null}
      {params.error ? <p className="notice-warning rounded-2xl px-4 py-3 text-sm">{params.error}</p> : null}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <article className="panel p-6">
          <form action={saveConfigAction} className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-1">
                <label htmlFor="guildId" className="text-sm font-medium">Guild ID</label>
                <input id="guildId" name="guildId" defaultValue={data.config.guildId} className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-foreground/30" />
              </div>
              <div className="space-y-1">
                <label htmlFor="defaultLocale" className="text-sm font-medium">Default locale</label>
                <select id="defaultLocale" name="defaultLocale" defaultValue={data.config.defaultLocale} className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-foreground/30">
                  <option value="en">English</option>
                  <option value="pl">Polski</option>
                </select>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-1">
                <label htmlFor="announcementChannelId" className="text-sm font-medium">Announcement channel ID</label>
                <input id="announcementChannelId" name="announcementChannelId" defaultValue={data.config.announcementChannelId ?? ""} className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-foreground/30" />
              </div>
              <div className="space-y-1">
                <label htmlFor="subscriptionChannelId" className="text-sm font-medium">Subscription channel ID</label>
                <input id="subscriptionChannelId" name="subscriptionChannelId" defaultValue={data.config.subscriptionChannelId ?? ""} className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-foreground/30" />
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-1">
                <label htmlFor="moderationChannelId" className="text-sm font-medium">Moderation channel ID</label>
                <input id="moderationChannelId" name="moderationChannelId" defaultValue={data.config.moderationChannelId ?? ""} className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-foreground/30" />
              </div>
              <div className="space-y-1">
                <label htmlFor="newSeriesChannelId" className="text-sm font-medium">New series channel ID</label>
                <input id="newSeriesChannelId" name="newSeriesChannelId" defaultValue={data.config.newSeriesChannelId ?? ""} className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-foreground/30" />
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-1">
                <label htmlFor="staffAlertRoleId" className="text-sm font-medium">Staff alert role ID</label>
                <input id="staffAlertRoleId" name="staffAlertRoleId" defaultValue={data.config.staffAlertRoleId ?? ""} className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-foreground/30" />
              </div>
              <div className="space-y-1">
                <label htmlFor="rolePrefix" className="text-sm font-medium">Role prefix</label>
                <input id="rolePrefix" name="rolePrefix" defaultValue={data.config.rolePrefix} className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-foreground/30" />
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="allowedManagerRoleIds" className="text-sm font-medium">Allowed manager role IDs</label>
              <textarea id="allowedManagerRoleIds" name="allowedManagerRoleIds" rows={4} defaultValue={data.config.allowedManagerRoleIds.join("\n")} className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm leading-7 outline-none transition focus:border-foreground/30" />
              <p className="text-xs text-muted">One role ID per line or comma separated. Empty list means any guild member linked in app can manage the bot.</p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex items-center gap-3 rounded-2xl border border-border px-4 py-3 text-sm">
                <input type="checkbox" name="chapterPublishedEnabled" defaultChecked={data.config.chapterPublishedEnabled} />
                Chapter published notifications
              </label>
              <label className="flex items-center gap-3 rounded-2xl border border-border px-4 py-3 text-sm">
                <input type="checkbox" name="seriesCreatedEnabled" defaultChecked={data.config.seriesCreatedEnabled} />
                New series notifications
              </label>
              <label className="flex items-center gap-3 rounded-2xl border border-border px-4 py-3 text-sm">
                <input type="checkbox" name="commentReportedEnabled" defaultChecked={data.config.commentReportedEnabled} />
                Comment report notifications
              </label>
              <label className="flex items-center gap-3 rounded-2xl border border-border px-4 py-3 text-sm">
                <input type="checkbox" name="copyrightReportedEnabled" defaultChecked={data.config.copyrightReportedEnabled} />
                Copyright report notifications
              </label>
            </div>

            <SubmitButton pendingLabel="Saving...">Save Discord config</SubmitButton>
          </form>
        </article>

        <aside className="space-y-6">
          <article className="panel space-y-4 p-5">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.16em] text-muted">Access</p>
              <h2 className="font-serif text-2xl">Manager status</h2>
            </div>
            <div className="space-y-2 text-sm">
              <p>Discord linked: {data.managerStatus.linked ? "yes" : "no"}</p>
              <p>Guild configured: {data.managerStatus.guildConfigured ? "yes" : "no"}</p>
              <p>Guild membership: {data.managerStatus.guildMembership ? "yes" : "no"}</p>
              <p>Manager role matched: {data.managerStatus.managerRoleMatched ? "yes" : "no"}</p>
              {data.managerStatus.discordUserId ? <p className="break-all text-muted">Discord user ID: {data.managerStatus.discordUserId}</p> : null}
              {data.managerStatus.error ? <p className="text-muted">{data.managerStatus.error}</p> : null}
            </div>
            <form action={makeBotAction("verify-manager-access")}>
              <SubmitButton pendingLabel="Checking...">Verify manager access</SubmitButton>
            </form>
          </article>

          <article className="panel space-y-4 p-5">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.16em] text-muted">Actions</p>
              <h2 className="font-serif text-2xl">Bot control</h2>
            </div>
            <div className="grid gap-3">
              <form action={makeBotAction("sync-series-roles")}><SubmitButton pendingLabel="Syncing...">Sync series roles</SubmitButton></form>
              <form action={makeBotAction("publish-subscription-menu")}><SubmitButton pendingLabel="Publishing...">Publish subscription menu</SubmitButton></form>
              <form action={makeBotAction("refresh-subscription-menu")}><SubmitButton pendingLabel="Refreshing...">Refresh subscription menu</SubmitButton></form>
              <form action={makeBotAction("send-test-notification")}><SubmitButton pendingLabel="Sending...">Send test notification</SubmitButton></form>
            </div>
          </article>

          <article className="panel space-y-4 p-5">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.16em] text-muted">Delivery</p>
              <h2 className="font-serif text-2xl">Recent events</h2>
            </div>
            {data.deliveryLogs.length ? (
              <div className="space-y-3 text-sm">
                {data.deliveryLogs.map((entry) => (
                  <div key={entry.id} className="rounded-2xl border border-border px-4 py-3">
                    <p className="font-medium">{entry.eventType}</p>
                    <p className="text-muted">Status: {entry.status}</p>
                    <p className="break-all text-muted">Event ID: {entry.eventId}</p>
                    {entry.message ? <p className="text-muted">{entry.message}</p> : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">No Discord delivery events yet.</p>
            )}
          </article>
        </aside>
      </section>
    </div>
  );
}
