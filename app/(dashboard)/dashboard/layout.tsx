import Link from "next/link";

import { RolePreset } from "@/generated/prisma/client";

import { signOut } from "@/app/_lib/auth";
import { requireDashboardUser } from "@/app/_lib/auth/session";
import { DashboardIcon } from "@/app/_components/dashboard-icons";
import { DashboardNavLink } from "@/app/_components/dashboard-nav-link";
import { SubmitButton } from "@/app/_components/submit-button";

const secondaryNavigation = [
  { href: "/dashboard/trash/series", label: "Series trash", icon: "trash" as const },
  { href: "/dashboard/trash/chapters", label: "Chapter trash", icon: "trash" as const },
];

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await requireDashboardUser();
  const navigation = [
    { href: "/dashboard", label: "Overview", icon: "overview" as const },
    { href: "/dashboard/series", label: "Series", icon: "series" as const },
    { href: "/dashboard/chapters", label: "Chapters", icon: "chapters" as const },
    ...(user.rolePreset === RolePreset.ADMIN
      ? [
          { href: "/dashboard/comments", label: "Comments", icon: "comments" as const },
          { href: "/dashboard/removal-requests", label: "Removal requests", icon: "legal" as const },
        ]
      : []),
    { href: "/dashboard/settings", label: "Settings", icon: "settings" as const },
    { href: "/dashboard/users", label: "Users", icon: "users" as const },
  ];

  async function signOutAction() {
    "use server";

    await signOut({
      redirectTo: "/",
    });
  }

  return (
    <div className="shell grid min-h-screen gap-8 py-8 lg:grid-cols-[248px_minmax(0,1fr)] lg:py-10">
      <aside className="h-fit space-y-6 rounded-[1.5rem] bg-surface/70 p-5 lg:sticky lg:top-6">
        <div className="space-y-3">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.24em] text-muted">Dashboard</p>
            <h2 className="font-serif text-2xl">Tsuki Manga</h2>
          </div>
          <div className="px-1 py-1">
            <p className="text-sm font-medium">
              {user.displayName ?? user.name ?? "Dashboard user"}
            </p>
            <p className="mt-1 text-xs uppercase tracking-[0.16em] text-muted">
              {user.rolePreset}
            </p>
          </div>
        </div>
        <nav className="space-y-1.5 text-sm">
          {navigation.map((item) => (
            <DashboardNavLink
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
            />
          ))}
        </nav>
        <div className="space-y-2 pt-2">
          <p className="px-3 text-xs uppercase tracking-[0.16em] text-muted">Archive</p>
          {secondaryNavigation.map((item) => (
            <DashboardNavLink
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
            />
          ))}
        </div>
        <div className="space-y-3 pt-2">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm text-muted transition hover:bg-[var(--surface-hover)] hover:text-foreground"
          >
            <DashboardIcon name="home" className="h-4 w-4" />
            Public home
          </Link>
          <form action={signOutAction}>
            <SubmitButton
              pendingLabel="Signing out..."
              className="w-full rounded-2xl bg-[var(--surface-active)] px-4 py-2.5 text-sm text-foreground transition hover:bg-[var(--surface-strong)] disabled:cursor-wait disabled:opacity-70"
            >
              Sign out
            </SubmitButton>
          </form>
        </div>
      </aside>
      <main className="space-y-6 pb-12">{children}</main>
    </div>
  );
}
