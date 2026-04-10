import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { RemovalRequestClaimantRole } from "@/generated/prisma/client";

import { createSeriesRemovalRequestAction } from "@/app/_actions/removal-requests/actions";
import { FormRenderedAtField } from "@/app/_components/form-rendered-at-field";
import { buildAbsoluteUrl } from "@/app/_lib/seo/public-url";
import { SubmitButton } from "@/app/_components/submit-button";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    error?: string;
    notice?: string;
    series?: string;
  }>;
};

export async function generateMetadata(): Promise<Metadata> {
  const canonicalUrl = await buildAbsoluteUrl("report-series");

  return {
    title: "Copyright removal request",
    alternates: {
      canonical: canonicalUrl,
    },
  };
}

export default async function ReportSeriesPage({ searchParams }: PageProps) {
  const [params, commonStatus] = await Promise.all([
    searchParams,
    getTranslations("Common.status"),
  ]);
  async function submitFormAction(formData: FormData) {
    "use server";

    const result = await createSeriesRemovalRequestAction({
      seriesUrl: formData.get("seriesUrl")?.toString() ?? "",
      claimantName: formData.get("claimantName")?.toString() ?? "",
      organizationName: formData.get("organizationName")?.toString() ?? "",
      claimantEmail: formData.get("claimantEmail")?.toString() ?? "",
      claimantRole:
        formData.get("claimantRole")?.toString() === RemovalRequestClaimantRole.AUTHORIZED_AGENT
          ? RemovalRequestClaimantRole.AUTHORIZED_AGENT
          : RemovalRequestClaimantRole.COPYRIGHT_OWNER,
      claimSummary: formData.get("claimSummary")?.toString() ?? "",
      electronicSignature: formData.get("electronicSignature")?.toString() ?? "",
      goodFaithConfirmed: formData.get("goodFaithConfirmed")?.toString() === "on",
      accuracyConfirmed: formData.get("accuracyConfirmed")?.toString() === "on",
      renderedAt: Number(formData.get("renderedAt")?.toString() ?? "0"),
      website: formData.get("website")?.toString() ?? "",
    });

    if (!result.success) {
      redirect(`/report-series?error=${encodeURIComponent(result.error)}`);
    }

    redirect("/report-series?notice=Request submitted for review.");
  }

  return (
    <main className="shell flex-1 py-10 md:py-14">
      <section className="max-w-3xl space-y-8">
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-[0.24em] text-muted">Public notice</p>
          <h1 className="font-serif text-4xl md:text-5xl">Copyright removal request</h1>
          <p className="max-w-2xl text-sm leading-7 text-muted">
            Use this form to submit a formal request about a specific series on this instance.
            Requests are reviewed manually. Submission does not trigger automatic removal.
          </p>
        </header>

        {params.notice ? (
          <p className="notice-success rounded-2xl px-4 py-3 text-sm">{params.notice}</p>
        ) : null}
        {params.error ? (
          <p className="notice-warning rounded-2xl px-4 py-3 text-sm">{params.error}</p>
        ) : null}

        <form action={submitFormAction} className="space-y-8">
          <FormRenderedAtField />
          <div aria-hidden="true" className="hidden">
            <label htmlFor="website">Website</label>
            <input id="website" name="website" autoComplete="off" tabIndex={-1} />
          </div>

          <section className="space-y-4">
            <div className="space-y-1.5">
              <p className="text-xs uppercase tracking-[0.16em] text-muted">Series</p>
              <h2 className="font-serif text-2xl">Reported series</h2>
            </div>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Series URL</span>
              <input
                name="seriesUrl"
                type="text"
                required
                defaultValue={params.series ?? ""}
                placeholder="https://your-instance.example/series/example-series"
                className="w-full rounded-2xl border border-border bg-transparent px-4 py-3 text-sm outline-none transition focus:border-foreground/25"
              />
            </label>
          </section>

          <section className="space-y-4">
            <div className="space-y-1.5">
              <p className="text-xs uppercase tracking-[0.16em] text-muted">Contact</p>
              <h2 className="font-serif text-2xl">Who is submitting this request</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block space-y-1.5">
                <span className="text-sm font-medium">Full name</span>
                <input
                  name="claimantName"
                  required
                  className="w-full rounded-2xl border border-border bg-transparent px-4 py-3 text-sm outline-none transition focus:border-foreground/25"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium">Contact email</span>
                <input
                  name="claimantEmail"
                  type="email"
                  required
                  className="w-full rounded-2xl border border-border bg-transparent px-4 py-3 text-sm outline-none transition focus:border-foreground/25"
                />
              </label>
            </div>

            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Relationship to the rights</span>
              <select
                name="claimantRole"
                defaultValue={RemovalRequestClaimantRole.COPYRIGHT_OWNER}
                className="w-full rounded-2xl border border-border bg-transparent px-4 py-3 text-sm outline-none transition focus:border-foreground/25"
              >
                <option value={RemovalRequestClaimantRole.COPYRIGHT_OWNER}>Copyright owner</option>
                <option value={RemovalRequestClaimantRole.AUTHORIZED_AGENT}>Authorized agent</option>
              </select>
            </label>
          </section>

          <section className="space-y-4">
            <div className="space-y-1.5">
              <p className="text-xs uppercase tracking-[0.16em] text-muted">Details</p>
              <h2 className="font-serif text-2xl">What should we review</h2>
            </div>

            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Short summary</span>
              <textarea
                name="claimSummary"
                rows={6}
                required
                placeholder="Explain what this series is, why you believe it should be removed, and anything we should check."
                className="w-full rounded-2xl border border-border bg-transparent px-4 py-3 text-sm leading-7 outline-none transition focus:border-foreground/25"
              />
            </label>
          </section>

          <section className="space-y-4">
            <div className="space-y-1.5">
              <p className="text-xs uppercase tracking-[0.16em] text-muted">Statements</p>
              <h2 className="font-serif text-2xl">Formal confirmation</h2>
            </div>

            <label className="flex items-start gap-3 rounded-[1.2rem] border border-border px-4 py-3">
              <input
                name="goodFaithConfirmed"
                type="checkbox"
                required
                className="mt-1 h-4 w-4 rounded border-border"
              />
              <span className="text-sm leading-7 text-foreground/90">
                I state in good faith that I believe this material is not authorized by the
                rights owner, its agent, or the law.
              </span>
            </label>

            <label className="flex items-start gap-3 rounded-[1.2rem] border border-border px-4 py-3">
              <input
                name="accuracyConfirmed"
                type="checkbox"
                required
                className="mt-1 h-4 w-4 rounded border-border"
              />
              <span className="text-sm leading-7 text-foreground/90">
                I state that the information in this request is accurate and that I am the
                copyright owner or authorized to act on behalf of the owner.
              </span>
            </label>

            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Electronic signature</span>
              <input
                name="electronicSignature"
                required
                className="w-full rounded-2xl border border-border bg-transparent px-4 py-3 text-sm outline-none transition focus:border-foreground/25"
              />
            </label>
          </section>

          <div className="flex flex-wrap items-center gap-4">
            <SubmitButton
              pendingLabel={commonStatus("sending")}
              className="rounded-full bg-foreground px-5 py-2.5 text-sm text-background transition hover:opacity-90 disabled:cursor-wait disabled:opacity-70"
            >
              Submit request
            </SubmitButton>
            <p className="text-sm text-muted">
              Only complete, good-faith requests will be reviewed.
            </p>
          </div>
        </form>
      </section>
    </main>
  );
}
