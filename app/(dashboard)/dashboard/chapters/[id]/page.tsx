import Link from "next/link";

import { ChapterStatus, RolePreset } from "@/generated/prisma/client";

import {
  publishChapterRedirectAction,
  reorderChapterPagesRedirectAction,
  softDeleteChapterRedirectAction,
  unpublishChapterRedirectAction,
  updateChapterRedirectAction,
  uploadChapterPagesRedirectAction,
} from "@/app/_actions/chapters/actions";
import { requireDashboardUser, requirePermission } from "@/app/_lib/auth/session";
import { getDashboardChapterDetailData } from "@/app/_lib/dashboard/queries";
import { PermissionBits } from "@/app/_lib/permissions/bits";
import { formatDateTime } from "@/app/_lib/utils/formatting";
import { ChapterUploadDropzone } from "@/app/_components/chapter-upload-dropzone";
import { SubmitButton } from "@/app/_components/submit-button";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    error?: string;
    notice?: string;
  }>;
};

export default async function DashboardChapterDetailPage({
  params,
  searchParams,
}: PageProps) {
  await requirePermission(PermissionBits.CHAPTERS);
  const [{ id }, paramsState, user, data] = await Promise.all([
    params,
    searchParams,
    requireDashboardUser(),
    params.then(({ id: chapterId }) => getDashboardChapterDetailData(chapterId)),
  ]);
  const updateChapterFormAction = updateChapterRedirectAction.bind(
    null,
    id,
    data.chapter.series.id,
  );
  const uploadPagesFormAction = uploadChapterPagesRedirectAction.bind(null, id);
  const reorderPagesFormAction = reorderChapterPagesRedirectAction.bind(null, id);
  const publishFormAction = publishChapterRedirectAction.bind(null, id);
  const unpublishFormAction = unpublishChapterRedirectAction.bind(null, id);
  const softDeleteFormAction = softDeleteChapterRedirectAction.bind(null, id);

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.24em] text-muted">Chapter detail</p>
          <h1 className="font-serif text-4xl">
            Chapter {data.chapter.number}
            {data.chapter.label ? ` ${data.chapter.label}` : ""}
          </h1>
          <p className="text-sm text-muted">
            In series{" "}
            <Link href={`/dashboard/series/${data.chapter.series.id}`} className="underline">
              {data.chapter.series.title}
            </Link>
          </p>
        </div>

        <div className="flex flex-wrap gap-3 text-sm">
          <Link
            href="/dashboard/chapters"
            className="rounded-full border border-border px-4 py-2 text-muted transition hover:border-foreground/20 hover:text-foreground"
          >
            Back to chapters
          </Link>
          {data.chapter.status === ChapterStatus.PUBLISHED ? (
            <Link
              href={`/chapter/${data.chapter.id}/${data.chapter.slug}`}
              className="rounded-full border border-border px-4 py-2 text-muted transition hover:border-foreground/20 hover:text-foreground"
            >
              Open public reader
            </Link>
          ) : null}
        </div>
      </section>

      {paramsState.notice ? (
        <p className="notice-success rounded-2xl px-4 py-3 text-sm">
          {paramsState.notice}
        </p>
      ) : null}

      {paramsState.error ? (
        <p className="notice-warning rounded-2xl px-4 py-3 text-sm">
          {paramsState.error}
        </p>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_340px]">
        <article className="panel p-6">
          <form action={updateChapterFormAction} className="space-y-5">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.16em] text-muted">Details</p>
              <h2 className="font-serif text-3xl">Chapter</h2>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-1">
                <label htmlFor="number" className="text-sm font-medium">
                  Chapter number
                </label>
                <input
                  id="number"
                  name="number"
                  required
                  defaultValue={data.chapter.number}
                  className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-foreground/30"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="slug" className="text-sm font-medium">
                  Slug
                </label>
                <input
                  id="slug"
                  name="slug"
                  required
                  defaultValue={data.chapter.slug}
                  className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-foreground/30"
                />
              </div>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-1">
                <label htmlFor="label" className="text-sm font-medium">
                  Optional label
                </label>
                <input
                  id="label"
                  name="label"
                  defaultValue={data.chapter.label ?? ""}
                  className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-foreground/30"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="title" className="text-sm font-medium">
                  Optional title
                </label>
                <input
                  id="title"
                  name="title"
                  defaultValue={data.chapter.title ?? ""}
                  className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-foreground/30"
                />
              </div>
            </div>
            <SubmitButton pendingLabel="Saving chapter...">Save chapter</SubmitButton>
          </form>
        </article>

        <aside className="space-y-6">
          <article className="panel space-y-4 p-5">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.16em] text-muted">Status</p>
              <h2 className="font-serif text-2xl">
                {data.chapter.status === ChapterStatus.PUBLISHED ? "Published" : "Draft"}
              </h2>
            </div>
            <p className="text-sm text-muted">
              {data.chapter.pages.length} page{data.chapter.pages.length === 1 ? "" : "s"}.
              Updated {formatDateTime(data.chapter.updatedAt)}.
            </p>

            {data.chapter.status === ChapterStatus.DRAFT ? (
              <form action={publishFormAction}>
                <SubmitButton pendingLabel="Publishing...">Publish now</SubmitButton>
              </form>
            ) : (
              <form action={unpublishFormAction}>
                <SubmitButton
                  pendingLabel="Reverting..."
                  className="rounded-full border border-foreground px-4 py-2.5 text-sm text-foreground transition hover:bg-foreground hover:text-background disabled:cursor-wait disabled:opacity-70"
                >
                  Return to draft
                </SubmitButton>
              </form>
            )}

            {user.rolePreset === RolePreset.ADMIN ? (
              <form action={softDeleteFormAction}>
                <SubmitButton
                  pendingLabel="Moving to trash..."
                  className="danger-outline rounded-full px-4 py-2.5 text-sm transition disabled:cursor-wait disabled:opacity-70"
                >
                  Move chapter to trash
                </SubmitButton>
              </form>
            ) : null}
          </article>

          <article className="panel space-y-4 p-5">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.16em] text-muted">Upload</p>
              <h2 className="font-serif text-2xl">Pages</h2>
            </div>
            <form action={uploadPagesFormAction} className="space-y-3">
              <ChapterUploadDropzone />
              <SubmitButton pendingLabel="Uploading pages...">Upload pages</SubmitButton>
            </form>
          </article>
        </aside>
      </section>

      <section className="panel p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.16em] text-muted">Pages</p>
            <h2 className="font-serif text-3xl">Pages</h2>
          </div>
        </div>

        {data.chapter.pages.length ? (
          <form action={reorderPagesFormAction} className="mt-6 space-y-6">
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {data.chapter.pages.map((page) => (
                <article key={page.id} className="space-y-3 rounded-[1.5rem] border border-border p-4">
                  <input type="hidden" name="pageIds" value={page.id} />
                  <div className="overflow-hidden rounded-[1.25rem] border border-border bg-surface">
                    {page.previewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={page.previewUrl}
                        alt=""
                        className="h-auto w-full"
                      />
                    ) : (
                      <div className="flex aspect-[3/4] items-center justify-center text-sm text-muted">
                        Missing preview
                      </div>
                    )}
                  </div>
                  <div className="grid gap-3 md:grid-cols-[110px_minmax(0,1fr)] md:items-center">
                    <label
                      htmlFor={`pageOrder:${page.id}`}
                      className="text-sm font-medium"
                    >
                      Page order
                    </label>
                    <input
                      id={`pageOrder:${page.id}`}
                      name={`pageOrder:${page.id}`}
                      type="number"
                      min={1}
                      defaultValue={page.pageOrder}
                      className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-foreground/30"
                    />
                  </div>
                </article>
              ))}
            </div>

            {data.chapter.status === ChapterStatus.DRAFT ? (
              <SubmitButton pendingLabel="Saving order...">Save page order</SubmitButton>
            ) : (
              <p className="text-sm text-muted">Reorder is disabled for published chapters.</p>
            )}
          </form>
        ) : (
          <p className="mt-6 text-sm text-muted">
            No pages exist yet. Upload the first page set above before publishing this draft.
          </p>
        )}
      </section>
    </div>
  );
}
