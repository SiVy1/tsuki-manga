import Link from "next/link";

import { signOut } from "@/app/_lib/auth";
import { saveThemePreferenceAction } from "@/app/_actions/preferences/actions";
import { getOptionalSession } from "@/app/_lib/auth/session";
import { canAccessDashboard } from "@/app/_lib/permissions/bits";
import { ThemeToggle } from "@/app/_components/theme-toggle";
import { getInstanceSettings } from "@/app/_lib/settings/instance";
import { storageDriver } from "@/app/_lib/storage";
import { SubmitButton } from "@/app/_components/submit-button";

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

  async function signOutAction() {
    "use server";

    await signOut({
      redirectTo: "/",
    });
  }

  return (
    <>
      <header className="border-b border-border/80 bg-background/90">
        <div className="shell flex flex-wrap items-center justify-between gap-4 py-5">
          <Link href="/" className="flex items-center gap-3">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt={instanceSettings.groupName}
                className="h-10 w-10 rounded-xl border border-border bg-surface object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface font-serif text-sm">
                TM
              </div>
            )}
            <div className="space-y-1">
              <p className="text-[0.68rem] uppercase tracking-[0.24em] text-muted">
                Scanlation group
              </p>
              <p className="font-serif text-2xl">{instanceSettings.groupName}</p>
            </div>
          </Link>

          <nav className="flex flex-wrap items-center gap-3 text-sm">
            <ThemeToggle
              defaultThemeMode={defaultThemeMode}
              onPersistThemeMode={session?.user ? saveThemePreferenceAction : undefined}
            />
            <Link
              href="/series"
              className="rounded-full border border-border px-4 py-2 text-muted transition hover:border-foreground/20 hover:text-foreground"
            >
              Series
            </Link>
            {dashboardVisible ? (
              <Link
                href="/dashboard"
                className="rounded-full border border-border px-4 py-2 text-muted transition hover:border-foreground/20 hover:text-foreground"
              >
                Dashboard
              </Link>
            ) : null}
            {session?.user ? (
              <form action={signOutAction}>
                <SubmitButton
                  pendingLabel="Signing out..."
                  className="inline-flex items-center justify-center rounded-full border border-foreground px-4 py-2 text-sm text-foreground transition hover:bg-foreground hover:text-background disabled:cursor-wait disabled:opacity-70"
                >
                  Sign out
                </SubmitButton>
              </form>
            ) : (
              <Link
                href="/sign-in"
                className="rounded-full bg-foreground px-4 py-2 text-background transition hover:opacity-90"
              >
                Sign in
              </Link>
            )}
          </nav>
        </div>
      </header>

      {children}
    </>
  );
}
