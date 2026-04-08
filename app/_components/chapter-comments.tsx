import Link from "next/link";

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
  const session = await getOptionalSession();
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
            <p className="text-xs uppercase tracking-[0.24em] text-muted">Discussion</p>
            <h2 className="font-serif text-3xl sm:text-4xl">Discussion</h2>
          </div>
          <p className="text-sm text-muted">
            {discussion.totalCount} comment{discussion.totalCount === 1 ? "" : "s"}
          </p>
        </div>
        <p className="max-w-2xl text-sm leading-6 text-muted">
          Keep it short, readable, and close to the chapter.
        </p>
      </div>

      {discussion.viewer.isSignedIn ? (
        <div className="rounded-[1.5rem] bg-[var(--surface-muted)] px-5 py-5">
          <CommentComposer
            chapterId={chapterId}
            chapterSlug={chapterSlug}
            mode="create"
            submitLabel="Post comment"
            placeholder="Add a comment about this chapter..."
          />
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] bg-[var(--surface-muted)] px-5 py-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">Sign in to join the discussion</p>
            <p className="text-sm text-muted">
              You can read comments without an account, but posting and reporting require sign in.
            </p>
          </div>
          <Link
            href={signInRedirect}
            className="inline-flex min-h-11 items-center rounded-full border border-border px-4 py-2 text-sm text-foreground transition hover:border-foreground/20"
          >
            Sign in
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
          <p className="font-medium text-foreground">No discussion yet.</p>
          <p className="text-sm text-muted">
            {discussion.viewer.isSignedIn
              ? "Start the first thread for this chapter."
              : "Sign in to leave the first comment for this chapter."}
          </p>
        </div>
      )}
    </section>
  );
}
