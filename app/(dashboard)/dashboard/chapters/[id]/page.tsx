import Link from "next/link";

import { ChapterStatus, RolePreset } from "@/generated/prisma/client";

import {
  moveChapterPageRedirectAction,
  publishChapterRedirectAction,
  removeChapterPageRedirectAction,
  replaceChapterPageRedirectAction,
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
  const canPreviewDraft =
    data.chapter.status === ChapterStatus.DRAFT && data.chapter.pages.length > 0;
  const customOrderFormId = `chapter-page-order:${id}`;

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
          {canPreviewDraft ? (
            <Link
              href={`/dashboard/chapters/${id}/preview`}
              className="rounded-full border border-border px-4 py-2 text-muted transition hover:border-foreground/20 hover:text-foreground"
            >
              Open draft preview
            </Link>
          ) : null}
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
              data.chapter.pages.length ? (
                <Link
                  href={`/dashboard/chapters/${id}/preview`}
                  className="inline-flex items-center justify-center rounded-full border border-border px-4 py-2.5 text-sm text-muted transition hover:border-foreground/20 hover:text-foreground"
                >
                  Open draft preview
                </Link>
              ) : (
                <p className="text-sm text-muted">
                  Upload at least one page before opening the draft preview.
                </p>
              )
            ) : null}

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
          <div className="mt-6 space-y-6">
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {data.chapter.pages.map((page, index) => {
                const moveUpAction = moveChapterPageRedirectAction.bind(null, id, page.id, "up");
                const moveDownAction = moveChapterPageRedirectAction.bind(null, id, page.id, "down");
                const removePageAction = removeChapterPageRedirectAction.bind(null, id, page.id);
                const replacePageAction = replaceChapterPageRedirectAction.bind(null, id, page.id);
                const isDraft = data.chapter.status === ChapterStatus.DRAFT;

                return (
                  <article
                    key={page.id}
                    className="space-y-4 rounded-[1.5rem] border border-border bg-background/70 p-4"
                  >
                    <input type="hidden" name="pageIds" value={page.id} form={customOrderFormId} />
                    <div className="overflow-hidden rounded-[1.25rem] border border-border bg-surface">
                      {page.previewUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={page.previewUrl} alt="" className="h-auto w-full" />
                      ) : (
                        <div className="flex aspect-[3/4] items-center justify-center text-sm text-muted">
                          Missing preview
                        </div>
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-xs uppercase tracking-[0.16em] text-muted">
                          Page {index + 1}
                        </p>
                        <p className="text-xs uppercase tracking-[0.16em] text-muted">
                          {page.asset.originalFilename}
                        </p>
                      </div>
                      <p className="text-sm text-muted">Current order: {page.pageOrder}</p>
                    </div>

                    {isDraft ? (
                      <div className="flex flex-wrap gap-2">
                        {index > 0 ? (
                          <form action={moveUpAction}>
                            <SubmitButton
                              pendingLabel="Moving..."
                              className="rounded-full border border-border px-4 py-2 text-sm text-muted transition hover:border-foreground/20 hover:text-foreground disabled:cursor-wait disabled:opacity-70"
                            >
                              Move up
                            </SubmitButton>
                          </form>
                        ) : null}
                        {index < data.chapter.pages.length - 1 ? (
                          <form action={moveDownAction}>
                            <SubmitButton
                              pendingLabel="Moving..."
                              className="rounded-full border border-border px-4 py-2 text-sm text-muted transition hover:border-foreground/20 hover:text-foreground disabled:cursor-wait disabled:opacity-70"
                            >
                              Move down
                            </SubmitButton>
                          </form>
                        ) : null}
                      </div>
                    ) : null}

                    <div className="grid gap-3 md:grid-cols-[110px_minmax(0,1fr)] md:items-center">
                      <label htmlFor={`pageOrder:${page.id}`} className="text-sm font-medium">
                        Custom order
                      </label>
                      <input
                        id={`pageOrder:${page.id}`}
                        name={`pageOrder:${page.id}`}
                        type="number"
                        min={1}
                        defaultValue={page.pageOrder}
                        form={customOrderFormId}
                        disabled={!isDraft}
                        className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-foreground/30 disabled:cursor-not-allowed disabled:opacity-60"
                      />
                    </div>

                    {isDraft ? (
                      <div className="space-y-3 border-t border-border pt-4">
                        <form action={replacePageAction} className="space-y-3">
                          <label className="block text-sm font-medium" htmlFor={`replace:${page.id}`}>
                            Replace page
                          </label>
                          <input
                            id={`replace:${page.id}`}
                            name="file"
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            className="block w-full text-sm text-muted file:mr-4 file:rounded-full file:border-0 file:bg-foreground file:px-4 file:py-2 file:text-sm file:text-background"
                          />
                          <SubmitButton pendingLabel="Replacing...">Replace page</SubmitButton>
                        </form>

                        <form action={removePageAction}>
                          <SubmitButton
                            pendingLabel="Removing..."
                            className="danger-outline rounded-full px-4 py-2.5 text-sm transition disabled:cursor-wait disabled:opacity-70"
                          >
                            Remove page
                          </SubmitButton>
                        </form>
                      </div>
                    ) : (
                      <p className="text-sm text-muted">
                        Page editing is disabled after publish. Return this chapter to draft to adjust pages.
                      </p>
                    )}
                  </article>
                );
              })}
            </div>

            {data.chapter.status === ChapterStatus.DRAFT ? (
              <form
                id={customOrderFormId}
                action={reorderPagesFormAction}
                className="flex flex-wrap items-center justify-between gap-3"
              >
                <p className="text-sm text-muted">
                  Use quick move buttons for small adjustments or save custom numeric positions below.
                </p>
                <SubmitButton pendingLabel="Saving order...">Save custom order</SubmitButton>
              </form>
            ) : (
              <p className="text-sm text-muted">Reorder is disabled for published chapters.</p>
            )}
          </div>
        ) : (
          <p className="mt-6 text-sm text-muted">
            No pages exist yet. Upload the first page set above before publishing this draft.
          </p>
        )}
      </section>
    </div>
  );
}
