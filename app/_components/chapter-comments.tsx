import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { CommentComposer } from "@/app/_components/comment-composer";
import { CommentThreadList } from "@/app/_components/comment-thread-list";
import { getOptionalSession } from "@/app/_lib/auth/session";
import { getChapterDiscussionData } from "@/app/_lib/comments/queries";

type ChapterCommentsProps = {
  chapterId: string;
  chapterSlug: string;
};

export async function ChapterComments({
  chapterId,
  chapterSlug,
}: ChapterCommentsProps) {
  const [session, t, common] = await Promise.all([
    getOptionalSession(),
    getTranslations("Comments"),
    getTranslations("Common.actions"),
  ]);
  const discussion = await getChapterDiscussionData(
    chapterId,
    chapterSlug,
    session?.user?.id ?? null,
  );
  const signInRedirect = `/sign-in?redirectTo=${encodeURIComponent(
    `/chapter/${chapterId}/${chapterSlug}`,
  )}`;

  return (
    <section className="mx-auto max-w-4xl space-y-6 border-t border-border/60 pt-10 sm:space-y-8 sm:pt-12">
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.24em] text-muted">{t("sectionEyebrow")}</p>
            <h2 className="font-serif text-3xl sm:text-4xl">{t("sectionTitle")}</h2>
          </div>
          <p className="text-sm text-muted">
            {t("count", { count: discussion.totalCount })}
          </p>
        </div>
        <p className="max-w-2xl text-sm leading-6 text-muted">
          {t("sectionDescription")}
        </p>
      </div>

      {discussion.viewer.isSignedIn ? (
        <div className="rounded-[1.5rem] bg-[var(--surface-muted)] px-5 py-5">
          <CommentComposer
            chapterId={chapterId}
            chapterSlug={chapterSlug}
            mode="create"
            submitLabel={t("postComment")}
            placeholder={t("composer.createPlaceholder")}
          />
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] bg-[var(--surface-muted)] px-5 py-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">{t("signInPromptTitle")}</p>
            <p className="text-sm text-muted">
              {t("signInPromptDescription")}
            </p>
          </div>
          <Link
            href={signInRedirect}
            className="inline-flex min-h-11 items-center rounded-full border border-border px-4 py-2 text-sm text-foreground transition hover:border-foreground/20"
          >
            {common("signIn")}
          </Link>
        </div>
      )}

      {discussion.threads.length ? (
        <CommentThreadList
          chapterId={discussion.chapter.id}
          chapterSlug={discussion.chapter.slug}
          threads={discussion.threads}
        />
      ) : (
        <div className="space-y-2 border-t border-border/70 py-6">
          <p className="font-medium text-foreground">{t("emptyTitle")}</p>
          <p className="text-sm text-muted">
            {discussion.viewer.isSignedIn
              ? t("emptySignedIn")
              : t("emptySignedOut")}
          </p>
        </div>
      )}
    </section>
  );
}
