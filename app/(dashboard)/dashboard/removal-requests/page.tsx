import Link from "next/link";
import { redirect } from "next/navigation";

import { SeriesRemovalRequestStatus } from "@/generated/prisma/client";

import { updateSeriesRemovalRequestStatusAction } from "@/app/_actions/removal-requests/actions";
import { requireAdmin } from "@/app/_lib/auth/session";
import { getDashboardSeriesRemovalRequestsData } from "@/app/_lib/dashboard/removal-request-queries";

type PageProps = {
  searchParams: Promise<{
    notice?: string;
    error?: string;
  }>;
};

function statusTone(status: SeriesRemovalRequestStatus) {
  switch (status) {
    case SeriesRemovalRequestStatus.RESOLVED_ACCEPTED:
      return "status-warning";
    case SeriesRemovalRequestStatus.RESOLVED_REJECTED:
      return "status-success";
    case SeriesRemovalRequestStatus.UNDER_REVIEW:
      return "status-warning";
    default:
      return "surface-strong";
  }
}

export default async function DashboardRemovalRequestsPage({ searchParams }: PageProps) {
  await requireAdmin();
  const [params, requests] = await Promise.all([
    searchParams,
    getDashboardSeriesRemovalRequestsData(),
  ]);

  async function updateStatus(formData: FormData) {
    "use server";

    const nextStatus = formData.get("status")?.toString();
    const normalizedStatus =
      nextStatus === SeriesRemovalRequestStatus.UNDER_REVIEW
        ? SeriesRemovalRequestStatus.UNDER_REVIEW
        : nextStatus === SeriesRemovalRequestStatus.RESOLVED_ACCEPTED
          ? SeriesRemovalRequestStatus.RESOLVED_ACCEPTED
          : nextStatus === SeriesRemovalRequestStatus.RESOLVED_REJECTED
            ? SeriesRemovalRequestStatus.RESOLVED_REJECTED
            : SeriesRemovalRequestStatus.OPEN;

    const result = await updateSeriesRemovalRequestStatusAction({
      requestId: formData.get("requestId")?.toString() ?? "",
      status: normalizedStatus,
      adminNote: formData.get("adminNote")?.toString() ?? "",
      resolutionNote: formData.get("resolutionNote")?.toString() ?? "",
    });

    if (!result.success) {
      redirect(`/dashboard/removal-requests?error=${encodeURIComponent(result.error)}`);
    }

    redirect("/dashboard/removal-requests?notice=Request updated.");
  }

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <p className="text-xs uppercase tracking-[0.24em] text-muted">Legal</p>
        <h1 className="font-serif text-4xl">Removal requests</h1>
        <p className="max-w-2xl text-sm text-muted">
          Review formal public requests without turning them into automatic takedowns.
        </p>
      </section>

      {params.notice ? (
        <p className="notice-success rounded-2xl px-4 py-3 text-sm">{params.notice}</p>
      ) : null}
      {params.error ? (
        <p className="notice-warning rounded-2xl px-4 py-3 text-sm">{params.error}</p>
      ) : null}

      <section className="space-y-4">
        {requests.length ? (
          requests.map((request) => (
            <article key={request.id} className="panel space-y-5 p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2.5 text-xs uppercase tracking-[0.16em] text-muted">
                    <span>{request.createdAtLabel}</span>
                    <span>·</span>
                    <span>{request.claimantRoleLabel}</span>
                    <span>·</span>
                    <span className={`rounded-full px-3 py-1 ${statusTone(request.status as SeriesRemovalRequestStatus)}`}>
                      {request.statusLabel}
                    </span>
                  </div>
                  <h2 className="font-serif text-3xl">{request.series.title}</h2>
                  <p className="text-sm text-muted">
                    {request.claimantName} · {request.claimantEmail}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3 text-sm">
                  <Link
                    href={`/series/${request.series.slug}`}
                    className="rounded-full border border-border px-4 py-2 text-muted transition hover:border-foreground/20 hover:text-foreground"
                  >
                    Open public page
                  </Link>
                  <Link
                    href={`/dashboard/series/${request.series.id}`}
                    className="rounded-full border border-border px-4 py-2 text-muted transition hover:border-foreground/20 hover:text-foreground"
                  >
                    Open series
                  </Link>
                </div>
              </div>

              <div className="space-y-3 rounded-[1.4rem] bg-[var(--surface-muted)] px-5 py-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted">Claim summary</p>
                <p className="whitespace-pre-wrap text-sm leading-7 text-foreground/95">
                  {request.infringementExplanation}
                </p>
              </div>

              <div className="grid gap-5 lg:grid-cols-2">
                <div className="space-y-2 text-sm text-muted">
                  <p>
                    Series visibility: <span className="text-foreground">{request.series.visibility}</span>
                  </p>
                  {request.organizationName ? (
                    <p>
                      Organization: <span className="text-foreground">{request.organizationName}</span>
                    </p>
                  ) : null}
                  <p>
                    Electronic signature: <span className="text-foreground">{request.electronicSignature}</span>
                  </p>
                  {request.reviewedAtLabel ? (
                    <p>
                      Reviewed: <span className="text-foreground">{request.reviewedAtLabel}</span>
                    </p>
                  ) : null}
                  {request.sameIpOpenCount > 1 ? (
                    <p className="text-[var(--warning-foreground)]">
                      Risk signal: {request.sameIpOpenCount} open requests from the same IP hash.
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2 text-sm text-muted">
                  {request.adminNote ? (
                    <p className="whitespace-pre-wrap">
                      Admin note: <span className="text-foreground">{request.adminNote}</span>
                    </p>
                  ) : null}
                  {request.resolutionNote ? (
                    <p className="whitespace-pre-wrap">
                      Resolution note: <span className="text-foreground">{request.resolutionNote}</span>
                    </p>
                  ) : null}
                </div>
              </div>

              <form action={updateStatus} className="space-y-4 border-t border-border pt-5">
                <input type="hidden" name="requestId" value={request.id} />

                <div className="grid gap-4 lg:grid-cols-2">
                  <label className="block space-y-1.5">
                    <span className="text-sm font-medium">Admin note</span>
                    <textarea
                      name="adminNote"
                      rows={4}
                      defaultValue={request.adminNote ?? ""}
                      className="w-full rounded-2xl border border-border bg-transparent px-4 py-3 text-sm leading-7 outline-none transition focus:border-foreground/25"
                    />
                  </label>

                  <label className="block space-y-1.5">
                    <span className="text-sm font-medium">Resolution note</span>
                    <textarea
                      name="resolutionNote"
                      rows={4}
                      defaultValue={request.resolutionNote ?? ""}
                      className="w-full rounded-2xl border border-border bg-transparent px-4 py-3 text-sm leading-7 outline-none transition focus:border-foreground/25"
                    />
                  </label>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="submit"
                    name="status"
                    value={SeriesRemovalRequestStatus.UNDER_REVIEW}
                    className="rounded-full border border-border px-4 py-2 text-sm text-foreground transition hover:border-foreground/20"
                  >
                    Mark under review
                  </button>
                  <button
                    type="submit"
                    name="status"
                    value={SeriesRemovalRequestStatus.RESOLVED_ACCEPTED}
                    className="rounded-full border border-border px-4 py-2 text-sm text-foreground transition hover:border-foreground/20"
                  >
                    Accept and hide series
                  </button>
                  <button
                    type="submit"
                    name="status"
                    value={SeriesRemovalRequestStatus.RESOLVED_REJECTED}
                    className="rounded-full border border-border px-4 py-2 text-sm text-muted transition hover:border-foreground/20 hover:text-foreground"
                  >
                    Reject request
                  </button>
                </div>
              </form>
            </article>
          ))
        ) : (
          <div className="panel space-y-3 p-6">
            <p className="font-medium text-foreground">No removal requests.</p>
            <p className="text-sm text-muted">
              The public takedown queue is empty for now.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
