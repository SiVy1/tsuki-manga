import { redirect } from "next/navigation";

import { assignRolePresetAction } from "@/app/_actions/users/actions";
import { requireAdmin } from "@/app/_lib/auth/session";
import { getDashboardUsersData, rolePresetOptions } from "@/app/_lib/dashboard/queries";
import { humanizeEnumValue } from "@/app/_lib/utils/formatting";
import { SubmitButton } from "@/app/_components/submit-button";

type PageProps = {
  searchParams: Promise<{
    error?: string;
    notice?: string;
  }>;
};

export default async function DashboardUsersPage({ searchParams }: PageProps) {
  const actor = await requireAdmin();
  const [params, users] = await Promise.all([searchParams, getDashboardUsersData()]);

  async function assignPresetFormAction(formData: FormData) {
    "use server";

    const result = await assignRolePresetAction({
      userId: formData.get("userId")?.toString() ?? "",
      rolePreset: formData.get("rolePreset")?.toString() ?? "READER",
    });

    if (!result.success) {
      redirect(`/dashboard/users?error=${encodeURIComponent(result.error)}`);
    }

    redirect(`/dashboard/users?notice=${encodeURIComponent("Role updated.")}`);
  }

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <p className="text-xs uppercase tracking-[0.24em] text-muted">Users</p>
        <h1 className="font-serif text-4xl">Users</h1>
      </section>

      {params.notice ? (
        <p className="notice-success rounded-2xl px-4 py-3 text-sm">
          {params.notice}
        </p>
      ) : null}

      {params.error ? (
        <p className="notice-warning rounded-2xl px-4 py-3 text-sm">
          {params.error}
        </p>
      ) : null}

      <section className="panel overflow-hidden">
        <div className="grid gap-4 border-b border-border px-5 py-4 text-xs uppercase tracking-[0.16em] text-muted md:grid-cols-[minmax(0,1.2fr)_220px_220px_170px]">
          <span>User</span>
          <span>Preset</span>
          <span>Accounts</span>
          <span>Created</span>
        </div>

        <div className="divide-y divide-border">
          {users.map((user) => (
            <div
              key={user.id}
              className="grid gap-4 px-5 py-5 md:grid-cols-[minmax(0,1.2fr)_220px_220px_170px]"
            >
              <div className="space-y-2">
                <div>
                  <h2 className="font-medium">
                    {user.displayName ?? user.name ?? "Unnamed user"}
                  </h2>
                  <p className="text-xs text-muted">{user.id}</p>
                </div>
                <form action={assignPresetFormAction} className="flex flex-wrap items-center gap-3">
                  <input type="hidden" name="userId" value={user.id} />
                  <select
                    name="rolePreset"
                    defaultValue={user.rolePreset}
                    disabled={user.id === actor.id}
                    className="rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-foreground/30 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {rolePresetOptions.map((rolePreset) => (
                      <option key={rolePreset} value={rolePreset}>
                        {humanizeEnumValue(rolePreset)}
                      </option>
                    ))}
                  </select>
                  {user.id === actor.id ? (
                    <span className="text-sm text-muted">Current admin</span>
                  ) : (
                    <SubmitButton pendingLabel="Saving...">Save</SubmitButton>
                  )}
                </form>
              </div>

              <div className="text-sm text-muted">{humanizeEnumValue(user.rolePreset)}</div>

              <div className="space-y-1 text-sm text-muted">
                {user.accounts.length ? (
                  user.accounts.map((account) => (
                    <p key={`${account.provider}:${account.providerAccountId}`}>
                      {account.provider}: {account.providerAccountId}
                    </p>
                  ))
                ) : (
                  <p>No accounts</p>
                )}
              </div>

              <div className="text-sm text-muted">{user.createdAt.slice(0, 10)}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
