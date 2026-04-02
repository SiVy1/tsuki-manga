import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { RolePreset, SeriesVisibility } from "@/generated/prisma/client";

import { createChapterAction } from "@/app/_actions/chapters/actions";
import {
  softDeleteSeriesAction,
  updateSeriesAction,
  uploadSeriesCoverAction,
} from "@/app/_actions/series/actions";
import { requireDashboardUser, requirePermission } from "@/app/_lib/auth/session";
import { getDashboardSeriesDetailData } from "@/app/_lib/dashboard/queries";
import { PermissionBits } from "@/app/_lib/permissions/bits";
import { formatDateTime, humanizeEnumValue } from "@/app/_lib/utils/formatting";
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

export default async function DashboardSeriesDetailPage({
  params,
  searchParams,
}: PageProps) {
  await requirePermission(PermissionBits.SERIES);
  const [{ id }, paramsState, user, data] = await Promise.all([
    params,
    searchParams,
    requireDashboardUser(),
    params.then(({ id: seriesId }) => getDashboardSeriesDetailData(seriesId)),
  ]);

  async function updateSeriesFormAction(formData: FormData) {
    "use server";

    const result = await updateSeriesAction({
      id,
      title: formData.get("title")?.toString() ?? "",
      slug: formData.get("slug")?.toString() ?? "",
      descriptionShort: formData.get("descriptionShort")?.toString() ?? "",
      descriptionLong: formData.get("descriptionLong")?.toString() ?? "",
      visibility:
        formData.get("visibility")?.toString() === SeriesVisibility.HIDDEN
          ? SeriesVisibility.HIDDEN
          : SeriesVisibility.PUBLIC,
      taxonomyTermIds: formData
        .getAll("taxonomyTermIds")
        .map((value) => value.toString())
        .filter(Boolean),
      coverAssetId: data.series.coverAssetId,
    });

    if (!result.success) {
      redirect(`/dashboard/series/${id}?error=${encodeURIComponent(result.error)}`);
    }

    redirect(`/dashboard/series/${id}?notice=${encodeURIComponent("Series updated.")}`);
  }

  async function uploadCoverFormAction(formData: FormData) {
    "use server";

    const result = await uploadSeriesCoverAction(id, formData);

    if (!result.success) {
      redirect(`/dashboard/series/${id}?error=${encodeURIComponent(result.error)}`);
    }

    redirect(`/dashboard/series/${id}?notice=${encodeURIComponent("Cover updated.")}`);
  }

  async function createChapterFormAction(formData: FormData) {
    "use server";

    const result = await createChapterAction({
      seriesId: id,
      number: formData.get("number")?.toString() ?? "",
      label: formData.get("label")?.toString() ?? "",
      title: formData.get("chapterTitle")?.toString() ?? "",
      slug: formData.get("chapterSlug")?.toString() ?? "",
    });

    if (!result.success) {
      redirect(`/dashboard/series/${id}?error=${encodeURIComponent(result.error)}`);
    }

    redirect(
      `/dashboard/chapters/${result.data.id}?notice=${encodeURIComponent("Chapter created.")}`,
    );
  }

  async function softDeleteSeriesFormAction() {
    "use server";

    const result = await softDeleteSeriesAction({ id });

    if (!result.success) {
      redirect(`/dashboard/series/${id}?error=${encodeURIComponent(result.error)}`);
    }

    redirect(
      `/dashboard/trash/series?notice=${encodeURIComponent("Series moved to trash.")}`,
    );
  }

  const selectedTaxonomyIds = new Set(data.series.taxonomyTerms.map((term) => term.id));

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.24em] text-muted">Series detail</p>
          <h1 className="font-serif text-4xl">{data.series.title}</h1>
          <p className="text-sm text-muted">
            Last updated {formatDateTime(data.series.updatedAt)}
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link
            href="/dashboard/series"
            className="rounded-full border border-border px-4 py-2 text-muted transition hover:border-foreground/20 hover:text-foreground"
          >
            Back to series
          </Link>
          <Link
            href={`/series/${data.series.slug}`}
            className="rounded-full border border-border px-4 py-2 text-muted transition hover:border-foreground/20 hover:text-foreground"
          >
            Open public page
          </Link>
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

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_340px]">
        <article className="panel p-6">
          <form action={updateSeriesFormAction} className="space-y-6">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-1">
                <label htmlFor="title" className="text-sm font-medium">
                  Title
                </label>
                <input
                  id="title"
                  name="title"
                  required
                  defaultValue={data.series.title}
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
                  defaultValue={data.series.slug}
                  className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-foreground/30"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="descriptionShort" className="text-sm font-medium">
                Short description
              </label>
              <textarea
                id="descriptionShort"
                name="descriptionShort"
                rows={3}
                defaultValue={data.series.descriptionShort ?? ""}
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm leading-7 outline-none transition focus:border-foreground/30"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="descriptionLong" className="text-sm font-medium">
                Long description
              </label>
              <textarea
                id="descriptionLong"
                name="descriptionLong"
                rows={8}
                defaultValue={data.series.descriptionLong ?? ""}
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm leading-7 outline-none transition focus:border-foreground/30"
              />
            </div>

            <div className="grid gap-5 md:grid-cols-[220px_minmax(0,1fr)]">
              <div className="space-y-1">
                <label htmlFor="visibility" className="text-sm font-medium">
                  Visibility
                </label>
                <select
                  id="visibility"
                  name="visibility"
                  defaultValue={data.series.visibility}
                  className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-foreground/30"
                >
                  <option value={SeriesVisibility.PUBLIC}>Public</option>
                  <option value={SeriesVisibility.HIDDEN}>Hidden</option>
                </select>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium">Taxonomy</p>
                <div className="flex flex-wrap gap-2">
                  {data.taxonomyTerms.map((term) => (
                    <label
                      key={term.id}
                      className="flex items-center gap-2 rounded-full border border-border px-3 py-2 text-sm text-muted transition hover:border-foreground/20 hover:text-foreground"
                    >
                      <input
                        type="checkbox"
                        name="taxonomyTermIds"
                        value={term.id}
                        defaultChecked={selectedTaxonomyIds.has(term.id)}
                        className="h-4 w-4 accent-[var(--accent)]"
                      />
                      <span>
                        {term.name}{" "}
                        <span className="text-xs uppercase tracking-[0.16em]">
                          {term.type}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <SubmitButton pendingLabel="Saving series...">Save series</SubmitButton>
          </form>
        </article>

        <aside className="space-y-6">
          <article className="panel space-y-4 p-5">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.16em] text-muted">Cover</p>
              <h2 className="font-serif text-2xl">Series cover</h2>
            </div>
            <div className="overflow-hidden rounded-[1.5rem] bg-[var(--surface-muted)]">
              {data.series.coverUrl ? (
                <Image
                  src={data.series.coverUrl}
                  alt={data.series.title}
                  width={320}
                  height={426}
                  className="aspect-[3/4] h-auto w-full object-cover"
                />
              ) : (
                <div className="flex aspect-[3/4] items-center justify-center font-serif text-sm text-muted">
                  TM
                </div>
              )}
            </div>
            <form action={uploadCoverFormAction} className="space-y-3">
              <input
                name="file"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="block w-full text-sm text-muted file:mr-4 file:rounded-full file:border-0 file:bg-foreground file:px-4 file:py-2 file:text-sm file:text-background"
              />
              <SubmitButton pendingLabel="Uploading cover...">Upload cover</SubmitButton>
            </form>
          </article>

          <article className="panel space-y-3 p-5">
            <p className="text-xs uppercase tracking-[0.16em] text-muted">State</p>
            <div className="flex items-center gap-3">
              <span
                className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.16em] ${
                  data.series.visibility === "PUBLIC"
                    ? "status-success"
                    : "status-warning"
                }`}
              >
                {humanizeEnumValue(data.series.visibility)}
              </span>
              <span className="text-sm text-muted">
                {data.series.chapters.length} chapter{data.series.chapters.length === 1 ? "" : "s"}
              </span>
            </div>

            {user.rolePreset === RolePreset.ADMIN ? (
              <form action={softDeleteSeriesFormAction}>
                <SubmitButton
                  pendingLabel="Moving to trash..."
                  className="danger-outline rounded-full px-4 py-2.5 text-sm transition disabled:cursor-wait disabled:opacity-70"
                >
                  Move series to trash
                </SubmitButton>
              </form>
            ) : null}
          </article>
        </aside>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <article className="panel p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-muted">Chapters</p>
              <h2 className="mt-2 font-serif text-3xl">Existing chapter list</h2>
            </div>
            <Link href="/dashboard/chapters" className="text-sm text-muted">
              Full chapter view
            </Link>
          </div>

          <div className="mt-6 divide-y divide-border">
            {data.series.chapters.length ? (
              data.series.chapters.map((chapter) => (
                <Link
                  key={chapter.id}
                  href={`/dashboard/chapters/${chapter.id}`}
                  className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
                >
                  <div className="space-y-1">
                    <p className="font-medium">
                      Chapter {chapter.number}
                      {chapter.label ? ` ${chapter.label}` : ""}
                    </p>
                    {chapter.title ? (
                      <p className="text-sm text-muted">{chapter.title}</p>
                    ) : null}
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.16em] ${
                      chapter.status === "PUBLISHED"
                        ? "status-success"
                        : "status-warning"
                    }`}
                  >
                    {chapter.status}
                  </span>
                </Link>
              ))
            ) : (
              <p className="py-4 text-sm text-muted">
                No chapters yet. Create the first draft on the right.
              </p>
            )}
          </div>
        </article>

        <article className="panel p-6">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.16em] text-muted">Create draft</p>
            <h2 className="font-serif text-3xl">Start a new chapter</h2>
          </div>

          <form action={createChapterFormAction} className="mt-6 space-y-4">
            <div className="space-y-1">
              <label htmlFor="number" className="text-sm font-medium">
                Chapter number
              </label>
              <input
                id="number"
                name="number"
                required
                placeholder="1"
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-foreground/30"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <label htmlFor="label" className="text-sm font-medium">
                  Optional label
                </label>
                <input
                  id="label"
                  name="label"
                  placeholder="extra"
                  className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-foreground/30"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="chapterSlug" className="text-sm font-medium">
                  Custom slug
                </label>
                <input
                  id="chapterSlug"
                  name="chapterSlug"
                  className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-foreground/30"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label htmlFor="chapterTitle" className="text-sm font-medium">
                Optional title
              </label>
              <input
                id="chapterTitle"
                name="chapterTitle"
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-foreground/30"
              />
            </div>
            <SubmitButton pendingLabel="Creating chapter...">Create chapter</SubmitButton>
          </form>
        </article>
      </section>
    </div>
  );
}
