import Link from "next/link";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

import { signIn } from "@/app/_lib/auth";
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

function mapAuthError(error: unknown) {
  if (error instanceof AuthError) {
    return "Sign in failed. Check the credentials or enabled provider.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Sign in failed.";
}

export default async function SignInPage({ searchParams }: PageProps) {
  const [session, params] = await Promise.all([getOptionalSession(), searchParams]);
  const redirectTo = resolveRedirectTarget(params.redirectTo);
  const env = getEnv();

  if (session?.user) {
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

    try {
      await signIn("test-auth", {
        providerAccountId: formData.get("providerAccountId")?.toString() ?? "",
        displayName: formData.get("displayName")?.toString() ?? "",
        sharedSecret: formData.get("sharedSecret")?.toString() ?? "",
        redirectTo: target,
      });
    } catch (error) {
      if (error instanceof AuthError) {
        const message = encodeURIComponent(mapAuthError(error));
        redirect(`/sign-in?redirectTo=${encodeURIComponent(target)}&error=${message}`);
      }

      throw error;
    }
  }

  return (
    <main className="shell flex-1 py-16">
      <section className="grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(320px,0.75fr)]">
        <div className="space-y-6">
          <p className="text-xs uppercase tracking-[0.28em] text-muted">
            Public sign in
          </p>
          <h1 className="max-w-2xl font-serif text-5xl leading-tight">Sign in</h1>
          <div className="flex flex-wrap gap-3 text-sm">
            <Link
              href="/"
              className="rounded-full border border-border px-4 py-2 text-muted transition hover:border-foreground/20 hover:text-foreground"
            >
              Back home
            </Link>
            <Link
              href="/series"
              className="rounded-full border border-border px-4 py-2 text-muted transition hover:border-foreground/20 hover:text-foreground"
            >
              Browse catalog
            </Link>
          </div>
        </div>

        <section className="panel space-y-6 p-6">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.24em] text-muted">
              Access
            </p>
            <h2 className="font-serif text-3xl">Sign in to Tsuki Manga</h2>
          </div>

          {params.error ? (
            <p className="notice-warning rounded-2xl px-4 py-3 text-sm">
              {params.error}
            </p>
          ) : null}

          {env.DISCORD_CLIENT_ID && env.DISCORD_CLIENT_SECRET ? (
            <form action={signInWithDiscord}>
              <SubmitButton pendingLabel="Redirecting...">Continue with Discord</SubmitButton>
            </form>
          ) : (
            <div className="rounded-2xl border border-dashed border-border px-4 py-4 text-sm text-muted">
              Discord OAuth is not configured in this environment.
            </div>
          )}

          {env.ENABLE_TEST_AUTH ? (
            <form action={signInWithTestAuth} className="space-y-4 border-t border-border pt-5">
              <input type="hidden" name="redirectTo" value={redirectTo} />
              <div className="space-y-1">
                <label htmlFor="providerAccountId" className="text-sm font-medium">
                  Provider account ID
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
                  Display name
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
                  Shared secret
                </label>
                <input
                  id="sharedSecret"
                  name="sharedSecret"
                  type="password"
                  className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-foreground/30"
                />
              </div>
              <SubmitButton pendingLabel="Signing in...">Continue with test auth</SubmitButton>
            </form>
          ) : null}
        </section>
      </section>
    </main>
  );
}
