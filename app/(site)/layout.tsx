import Link from "next/link";

import { signOut } from "@/app/_lib/auth";
import { saveThemePreferenceAction } from "@/app/_actions/preferences/actions";
import { getOptionalSession } from "@/app/_lib/auth/session";
import { canAccessDashboard } from "@/app/_lib/permissions/bits";
import { ThemeToggle } from "@/app/_components/theme-toggle";
import { getInstanceSettings } from "@/app/_lib/settings/instance";
import { storageDriver } from "@/app/_lib/storage";
import { SubmitButton } from "@/app/_components/submit-button";

function getGroupMark(groupName: string) {
  return groupName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default async function SiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [session, instanceSettings] = await Promise.all([
    getOptionalSession(),
    getInstanceSettings(),
  ]);
  const dashboardVisible = session?.user
    ? canAccessDashboard(session.user.permissionBits)
    : false;
  const defaultThemeMode = session?.user?.themePreference ?? "SYSTEM";
  const logoUrl = instanceSettings.logoAsset?.storageKey
    ? storageDriver.getPublicUrl(instanceSettings.logoAsset.storageKey)
    : null;
  const groupMark = getGroupMark(instanceSettings.groupName) || "TM";
  const footerDescription =
    instanceSettings.groupDescription ?? instanceSettings.siteDescription;

  async function signOutAction() {
    "use server";

    await signOut({
      redirectTo: "/",
    });
  }

  return (
    <>
      <header className="border-b border-border/70 bg-background/95">
        <div className="shell flex flex-wrap items-end justify-between gap-x-8 gap-y-3 py-4 md:items-center md:py-5">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt={instanceSettings.groupName}
                className="h-9 w-9 rounded-lg border border-border/70 bg-surface/70 object-cover"
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/70 bg-surface/70 font-serif text-xs">
                {groupMark}
              </div>
            )}
            <div className="min-w-0 space-y-1">
              <p className="text-[0.64rem] uppercase tracking-[0.22em] text-muted">
                Scanlation group
              </p>
              <p className="truncate font-serif text-[1.7rem] leading-none md:text-[1.85rem]">
                {instanceSettings.groupName}
              </p>
            </div>
          </Link>

          <nav className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2 text-sm text-muted">
            <Link
              href="/series"
              className="transition hover:text-foreground"
            >
              Series
            </Link>
            {dashboardVisible ? (
              <Link
                href="/dashboard"
                className="transition hover:text-foreground"
              >
                Dashboard
              </Link>
            ) : null}
            <ThemeToggle
              defaultThemeMode={defaultThemeMode}
              onPersistThemeMode={session?.user ? saveThemePreferenceAction : undefined}
            />
            {session?.user ? (
              <form action={signOutAction}>
                <SubmitButton
                  pendingLabel="Signing out..."
                  className="inline-flex items-center justify-center text-sm text-foreground transition hover:opacity-70 disabled:cursor-wait disabled:opacity-70"
                >
                  Sign out
                </SubmitButton>
              </form>
            ) : (
              <Link
                href="/sign-in"
                className="text-foreground transition hover:opacity-70"
              >
                Sign in
              </Link>
            )}
          </nav>
        </div>
      </header>

      {children}

      <footer className="border-t border-border/70">
        <div className="shell flex flex-col gap-8 py-10 md:flex-row md:items-end md:justify-between md:py-12">
          <div className="max-w-xl space-y-3">
            <p className="text-[0.68rem] uppercase tracking-[0.24em] text-muted">
              Published by
            </p>
            <div className="space-y-2">
              <p className="font-serif text-3xl">{instanceSettings.groupName}</p>
              <p className="max-w-lg text-sm leading-7 text-muted">{footerDescription}</p>
            </div>
          </div>

          <div className="space-y-4 md:text-right">
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted md:justify-end">
              <Link href="/series" className="transition hover:text-foreground">
                Series
              </Link>
              <Link href="/feed.xml" className="transition hover:text-foreground">
                RSS feed
              </Link>
              {!session?.user ? (
                <Link href="/sign-in" className="transition hover:text-foreground">
                  Sign in
                </Link>
              ) : null}
            </div>

            {instanceSettings.socialLinks.length ? (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted md:justify-end">
                {instanceSettings.socialLinks.map((link) => (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="transition hover:text-foreground"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </footer>
    </>
  );
}
