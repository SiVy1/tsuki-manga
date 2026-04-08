import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

import { signIn, signOut } from "@/app/_lib/auth";
import { isTestAuthEnabled } from "@/app/_lib/auth/test-auth";
import { getOptionalSession } from "@/app/_lib/auth/session";
import { canAccessDashboard } from "@/app/_lib/permissions/bits";
import { getEnv } from "@/app/_lib/settings/env";
import { SubmitButton } from "@/app/_components/submit-button";

type PageProps = {
  searchParams: Promise<{
    error?: string;
    redirectTo?: string;
  }>;
};

function resolveRedirectTarget(rawRedirect: string | undefined) {
  if (!rawRedirect || !rawRedirect.startsWith("/")) {
    return "/dashboard";
  }

  return rawRedirect;
}

function mapAuthError(error: unknown, t: Awaited<ReturnType<typeof getTranslations>>) {
  if (error instanceof AuthError) {
    return t("authError");
  }

  if (error instanceof Error) {
    return error.message;
  }

  return t("signInFailed");
}

export default async function SignInPage({ searchParams }: PageProps) {
  const [session, params, t, common, commonStatus, commonEntities] = await Promise.all([
    getOptionalSession(),
    searchParams,
    getTranslations("SignInPage"),
    getTranslations("Common.actions"),
    getTranslations("Common.status"),
    getTranslations("Common.entities"),
  ]);
  const redirectTo = resolveRedirectTarget(params.redirectTo);
  const env = getEnv();
  const allowTestAuthAccountSwitch = isTestAuthEnabled(env);

  if (session?.user && !allowTestAuthAccountSwitch) {
    redirect(canAccessDashboard(session.user.permissionBits) ? redirectTo : "/");
  }

  async function signInWithDiscord() {
    "use server";

    await signIn("discord", {
      redirectTo,
    });
  }

  async function signInWithTestAuth(formData: FormData) {
    "use server";

    const target = resolveRedirectTarget(formData.get("redirectTo")?.toString());
    const currentSession = await getOptionalSession();

    try {
      if (currentSession?.user) {
        await signOut({
          redirect: false,
        });
      }

      await signIn("test-auth", {
        providerAccountId: formData.get("providerAccountId")?.toString() ?? "",
        displayName: formData.get("displayName")?.toString() ?? "",
        sharedSecret: formData.get("sharedSecret")?.toString() ?? "",
        redirectTo: target,
      });
    } catch (error) {
      if (error instanceof AuthError) {
        const signInTranslations = await getTranslations("SignInPage");
        const message = encodeURIComponent(mapAuthError(error, signInTranslations));
        redirect(`/sign-in?redirectTo=${encodeURIComponent(target)}&error=${message}`);
      }

      throw error;
    }
  }

  async function signOutAction() {
    "use server";

    await signOut({
      redirectTo: "/sign-in",
    });
  }

  return (
    <main className="shell flex-1 py-16">
      <section className="grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(320px,0.75fr)]">
        <div className="space-y-6">
          <p className="text-xs uppercase tracking-[0.28em] text-muted">
            {t("eyebrow")}
          </p>
          <h1 className="max-w-2xl font-serif text-5xl leading-tight">{t("title")}</h1>
          <div className="flex flex-wrap gap-3 text-sm">
            <Link
              href="/"
              className="rounded-full border border-border px-4 py-2 text-muted transition hover:border-foreground/20 hover:text-foreground"
            >
              {common("backHome")}
            </Link>
            <Link
              href="/series"
              className="rounded-full border border-border px-4 py-2 text-muted transition hover:border-foreground/20 hover:text-foreground"
            >
              {common("browseCatalog")}
            </Link>
          </div>
        </div>

        <section className="panel space-y-6 p-6">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.24em] text-muted">
              {t("accessEyebrow")}
            </p>
            <h2 className="font-serif text-3xl">{t("panelTitle")}</h2>
          </div>

          {params.error ? (
            <p className="notice-warning rounded-2xl px-4 py-3 text-sm">
              {params.error}
            </p>
          ) : null}

          {session?.user && allowTestAuthAccountSwitch ? (
            <div className="space-y-4 rounded-2xl border border-border bg-[var(--surface-muted)] px-4 py-4 text-sm">
              <div className="space-y-1">
                <p className="font-medium">
                  {t("signedInAs", {
                    name:
                      session.user.displayName ??
                      session.user.name ??
                      commonEntities("currentUser"),
                  })}
                </p>
                <p className="text-muted">
                  {t("testAuthDescription")}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href={canAccessDashboard(session.user.permissionBits) ? "/dashboard" : "/"}
                  className="rounded-full border border-border px-4 py-2 text-muted transition hover:border-foreground/20 hover:text-foreground"
                >
                  {canAccessDashboard(session.user.permissionBits)
                    ? common("openDashboard")
                    : common("returnHome")}
                </Link>
                <form action={signOutAction}>
                  <SubmitButton
                    pendingLabel={commonStatus("signingOut")}
                    className="inline-flex items-center justify-center rounded-full border border-foreground px-4 py-2 text-sm text-foreground transition hover:bg-foreground hover:text-background disabled:cursor-wait disabled:opacity-70"
                  >
                    {t("signOutFirst")}
                  </SubmitButton>
                </form>
              </div>
            </div>
          ) : null}

          {env.DISCORD_CLIENT_ID && env.DISCORD_CLIENT_SECRET ? (
            <form action={signInWithDiscord}>
              <SubmitButton pendingLabel={commonStatus("redirecting")}>
                {t("continueWithDiscord")}
              </SubmitButton>
            </form>
          ) : (
            <div className="rounded-2xl border border-dashed border-border px-4 py-4 text-sm text-muted">
              {t("discordNotConfigured")}
            </div>
          )}

          {allowTestAuthAccountSwitch ? (
            <form action={signInWithTestAuth} className="space-y-4 border-t border-border pt-5">
              <input type="hidden" name="redirectTo" value={redirectTo} />
              <div className="space-y-1">
                <label htmlFor="providerAccountId" className="text-sm font-medium">
                  {t("testAuth.providerAccountId")}
                </label>
                <input
                  id="providerAccountId"
                  name="providerAccountId"
                  defaultValue="editor-account"
                  className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-foreground/30"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="displayName" className="text-sm font-medium">
                  {t("testAuth.displayName")}
                </label>
                <input
                  id="displayName"
                  name="displayName"
                  defaultValue="Editor"
                  className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-foreground/30"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="sharedSecret" className="text-sm font-medium">
                  {t("testAuth.sharedSecret")}
                </label>
                <input
                  id="sharedSecret"
                  name="sharedSecret"
                  type="password"
                  className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-foreground/30"
                />
              </div>
              <SubmitButton pendingLabel={commonStatus("signingIn")}>
                {t("continueWithTestAuth")}
              </SubmitButton>
            </form>
          ) : null}
        </section>
      </section>
    </main>
  );
}
