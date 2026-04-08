import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import {
  deleteCommentModerationAction,
  hideCommentAction,
  rejectCommentReportAction,
  resolveCommentReportAction,
} from "@/app/_actions/comments/moderation-actions";
import { SubmitButton } from "@/app/_components/submit-button";
import { requireAdmin } from "@/app/_lib/auth/session";
import { getDashboardCommentReportsData } from "@/app/_lib/dashboard/comment-queries";

type PageProps = {
  searchParams: Promise<{
    notice?: string;
    error?: string;
  }>;
};

export default async function DashboardCommentsPage({ searchParams }: PageProps) {
  await requireAdmin();
  const [params, reports, t, common, commonStatus] = await Promise.all([
    searchParams,
    getDashboardCommentReportsData(),
    getTranslations("DashboardComments"),
    getTranslations("Common.actions"),
    getTranslations("Common.status"),
  ]);

  async function hideComment(formData: FormData) {
    "use server";
    const dashboardCommentsT = await getTranslations("DashboardComments");

    const result = await hideCommentAction({
      commentId: formData.get("commentId")?.toString() ?? "",
    });

    if (!result.success) {
      redirect(`/dashboard/comments?error=${encodeURIComponent(result.error)}`);
    }

    redirect(`/dashboard/comments?notice=${encodeURIComponent(dashboardCommentsT("noticeHidden"))}`);
  }

  async function deleteComment(formData: FormData) {
    "use server";
    const dashboardCommentsT = await getTranslations("DashboardComments");

    const result = await deleteCommentModerationAction({
      commentId: formData.get("commentId")?.toString() ?? "",
    });

    if (!result.success) {
      redirect(`/dashboard/comments?error=${encodeURIComponent(result.error)}`);
    }

    redirect(`/dashboard/comments?notice=${encodeURIComponent(dashboardCommentsT("noticeRemoved"))}`);
  }

  async function resolveReport(formData: FormData) {
    "use server";
    const dashboardCommentsT = await getTranslations("DashboardComments");

    const result = await resolveCommentReportAction({
      reportId: formData.get("reportId")?.toString() ?? "",
    });

    if (!result.success) {
      redirect(`/dashboard/comments?error=${encodeURIComponent(result.error)}`);
    }

    redirect(`/dashboard/comments?notice=${encodeURIComponent(dashboardCommentsT("noticeResolved"))}`);
  }

  async function rejectReport(formData: FormData) {
    "use server";
    const dashboardCommentsT = await getTranslations("DashboardComments");

    const result = await rejectCommentReportAction({
      reportId: formData.get("reportId")?.toString() ?? "",
    });

    if (!result.success) {
      redirect(`/dashboard/comments?error=${encodeURIComponent(result.error)}`);
    }

    redirect(`/dashboard/comments?notice=${encodeURIComponent(dashboardCommentsT("noticeRejected"))}`);
  }

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <p className="text-xs uppercase tracking-[0.24em] text-muted">{t("eyebrow")}</p>
        <h1 className="font-serif text-4xl">{t("title")}</h1>
        <p className="max-w-2xl text-sm text-muted">
          {t("description")}
        </p>
      </section>

      {params.notice ? (
        <p className="notice-success rounded-2xl px-4 py-3 text-sm">{params.notice}</p>
      ) : null}
      {params.error ? (
        <p className="notice-warning rounded-2xl px-4 py-3 text-sm">{params.error}</p>
      ) : null}

      <section className="space-y-4">
        {reports.length ? (
          reports.map((entry) => (
            <article key={entry.id} className="panel space-y-5 p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2.5 text-xs uppercase tracking-[0.16em] text-muted">
                    <span>{entry.latestReasonLabel}</span>
                    <span>{"·"}</span>
                    <span>{t("card.reports", { count: entry.reportCount })}</span>
                    <span>{"·"}</span>
                    <span>{entry.latestCreatedAtLabel}</span>
                  </div>
                  <h2 className="font-serif text-2xl">
                    {entry.comment.chapter.seriesTitle} {"·"} Chapter {entry.comment.chapter.number}
                    {entry.comment.chapter.label ? ` ${entry.comment.chapter.label}` : ""}
                  </h2>
                  <p className="text-sm text-muted">
                    {t("card.reportedBy", {
                      author: entry.comment.authorName,
                      date: entry.comment.createdAtLabel,
                    })}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3 text-sm">
                  <Link
                    href={`/chapter/${entry.comment.chapter.id}/${entry.comment.chapter.slug}`}
                    className="rounded-full border border-border px-4 py-2 text-muted transition hover:border-foreground/20 hover:text-foreground"
                  >
                    {common("openChapter")}
                  </Link>
                </div>
              </div>

              <div className="space-y-3 rounded-[1.4rem] bg-[var(--surface-muted)] px-5 py-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted">{t("card.commentLabel")}</p>
                <p className="max-w-3xl whitespace-pre-wrap text-sm leading-7 text-foreground">
                  {entry.comment.excerpt}
                </p>
                {entry.latestDetails ? (
                  <p className="text-sm text-muted">{t("card.moderatorNote", { details: entry.latestDetails })}</p>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-3">
                <form action={hideComment}>
                  <input type="hidden" name="commentId" value={entry.comment.id} />
                  <SubmitButton
                    pendingLabel={commonStatus("hiding")}
                    className="rounded-full border border-border px-4 py-2 text-sm text-foreground transition hover:border-foreground/20 disabled:cursor-wait disabled:opacity-70"
                  >
                    {t("actions.hide")}
                  </SubmitButton>
                </form>

                <form action={deleteComment}>
                  <input type="hidden" name="commentId" value={entry.comment.id} />
                  <SubmitButton
                    pendingLabel={commonStatus("removing")}
                    className="rounded-full border border-border px-4 py-2 text-sm text-foreground transition hover:border-foreground/20 disabled:cursor-wait disabled:opacity-70"
                  >
                    {t("actions.delete")}
                  </SubmitButton>
                </form>

                <form action={resolveReport}>
                  <input type="hidden" name="reportId" value={entry.latestReportId} />
                  <SubmitButton
                    pendingLabel={commonStatus("resolving")}
                    className="rounded-full border border-border px-4 py-2 text-sm text-muted transition hover:border-foreground/20 hover:text-foreground disabled:cursor-wait disabled:opacity-70"
                  >
                    {t("actions.resolve")}
                  </SubmitButton>
                </form>

                <form action={rejectReport}>
                  <input type="hidden" name="reportId" value={entry.latestReportId} />
                  <SubmitButton
                    pendingLabel={commonStatus("rejecting")}
                    className="rounded-full border border-border px-4 py-2 text-sm text-muted transition hover:border-foreground/20 hover:text-foreground disabled:cursor-wait disabled:opacity-70"
                  >
                    {t("actions.reject")}
                  </SubmitButton>
                </form>
              </div>
            </article>
          ))
        ) : (
          <div className="panel space-y-3 p-6">
            <p className="font-medium text-foreground">{t("emptyTitle")}</p>
            <p className="text-sm text-muted">
              {t("emptyDescription")}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
