import Link from "next/link";
import { redirect } from "next/navigation";

import { SeriesVisibility } from "@/generated/prisma/client";

import { createSeriesAction } from "@/app/_actions/series/actions";
import { requirePermission } from "@/app/_lib/auth/session";
import { getDashboardSeriesListData } from "@/app/_lib/dashboard/queries";
import { PermissionBits } from "@/app/_lib/permissions/bits";
import { SubmitButton } from "@/app/_components/submit-button";

type PageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function DashboardNewSeriesPage({ searchParams }: PageProps) {
  await requirePermission(PermissionBits.SERIES);
  const [data, params] = await Promise.all([getDashboardSeriesListData(), searchParams]);

  async function createSeriesFormAction(formData: FormData) {
    "use server";

    const result = await createSeriesAction({
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
    });

    if (!result.success) {
      redirect(`/dashboard/series/new?error=${encodeURIComponent(result.error)}`);
    }

    redirect(`/dashboard/series/${result.data.id}?notice=${encodeURIComponent("Series created.")}`);
  }

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <p className="text-xs uppercase tracking-[0.24em] text-muted">Series</p>
        <h1 className="font-serif text-4xl">New series</h1>
      </section>

      <section className="panel p-6">
        <form action={createSeriesFormAction} className="space-y-6">
          {params.error ? (
            <p className="notice-warning rounded-2xl px-4 py-3 text-sm">
              {params.error}
            </p>
          ) : null}

          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-1">
              <label htmlFor="title" className="text-sm font-medium">
                Title
              </label>
              <input
                id="title"
                name="title"
                required
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-foreground/30"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="slug" className="text-sm font-medium">
                Custom slug
              </label>
              <input
                id="slug"
                name="slug"
                placeholder="optional-manual-slug"
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
              rows={6}
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
                defaultValue={SeriesVisibility.PUBLIC}
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-foreground/30"
              >
                <option value={SeriesVisibility.PUBLIC}>Public</option>
                <option value={SeriesVisibility.HIDDEN}>Hidden</option>
              </select>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium">Taxonomy</p>
              <div className="flex flex-wrap gap-2">
                {data.taxonomyTerms.length ? (
                  data.taxonomyTerms.map((term) => (
                    <label
                      key={term.id}
                      className="flex items-center gap-2 rounded-full border border-border px-3 py-2 text-sm text-muted transition hover:border-foreground/20 hover:text-foreground"
                    >
                      <input
                        type="checkbox"
                        name="taxonomyTermIds"
                        value={term.id}
                        className="h-4 w-4 accent-[var(--accent)]"
                      />
                      <span>
                        {term.name}{" "}
                        <span className="text-xs uppercase tracking-[0.16em]">
                          {term.type}
                        </span>
                      </span>
                    </label>
                  ))
                ) : (
                  <p className="text-sm text-muted">
                    No taxonomy terms exist yet. You can add them later in settings.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <SubmitButton pendingLabel="Creating series...">Create series</SubmitButton>
            <Link
              href="/dashboard/series"
              className="rounded-full border border-border px-5 py-2.5 text-sm text-muted transition hover:border-foreground/20 hover:text-foreground"
            >
              Cancel
            </Link>
          </div>
        </form>
      </section>
    </div>
  );
}
