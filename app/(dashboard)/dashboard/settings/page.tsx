import { redirect } from "next/navigation";

import { RolePreset, TaxonomyType } from "@/generated/prisma/client";

import {
  deleteSocialLinkAction,
  deleteTaxonomyTermAction,
  updateInstanceSettingsAction,
  uploadFaviconAction,
  uploadLogoAction,
  upsertSocialLinkAction,
  upsertTaxonomyTermAction,
} from "@/app/_actions/settings/actions";
import { requirePermission } from "@/app/_lib/auth/session";
import { getDashboardSettingsData } from "@/app/_lib/dashboard/queries";
import { PermissionBits } from "@/app/_lib/permissions/bits";
import { storageDriver } from "@/app/_lib/storage";
import { SubmitButton } from "@/app/_components/submit-button";

type PageProps = {
  searchParams: Promise<{
    error?: string;
    notice?: string;
  }>;
};

function parseKeywordList(rawKeywords: string) {
  return rawKeywords
    .split(/[\n,]/)
    .map((keyword) => keyword.trim())
    .filter(Boolean);
}

export default async function DashboardSettingsPage({ searchParams }: PageProps) {
  const user = await requirePermission(PermissionBits.SETTINGS);
  const [params, data] = await Promise.all([
    searchParams,
    getDashboardSettingsData(),
  ]);

  const logoUrl = data.instanceSettings.logoAsset?.storageKey
    ? storageDriver.getPublicUrl(data.instanceSettings.logoAsset.storageKey)
    : null;
  const faviconUrl = data.instanceSettings.faviconAsset?.storageKey
    ? storageDriver.getPublicUrl(data.instanceSettings.faviconAsset.storageKey)
    : null;

  async function updateSettingsFormAction(formData: FormData) {
    "use server";

    const result = await updateInstanceSettingsAction({
      groupName: formData.get("groupName")?.toString() ?? "",
      groupDescription: formData.get("groupDescription")?.toString() ?? "",
      siteTitle: formData.get("siteTitle")?.toString() ?? "",
      siteDescription: formData.get("siteDescription")?.toString() ?? "",
      keywords: parseKeywordList(formData.get("keywords")?.toString() ?? ""),
    });

    if (!result.success) {
      redirect(`/dashboard/settings?error=${encodeURIComponent(result.error)}`);
    }

    redirect(`/dashboard/settings?notice=${encodeURIComponent("Settings saved.")}`);
  }

  async function uploadLogoFormAction(formData: FormData) {
    "use server";

    const result = await uploadLogoAction(formData);

    if (!result.success) {
      redirect(`/dashboard/settings?error=${encodeURIComponent(result.error)}`);
    }

    redirect(`/dashboard/settings?notice=${encodeURIComponent("Logo updated.")}`);
  }

  async function uploadFaviconFormAction(formData: FormData) {
    "use server";

    const result = await uploadFaviconAction(formData);

    if (!result.success) {
      redirect(`/dashboard/settings?error=${encodeURIComponent(result.error)}`);
    }

    redirect(`/dashboard/settings?notice=${encodeURIComponent("Favicon updated.")}`);
  }

  async function createSocialLinkFormAction(formData: FormData) {
    "use server";

    const result = await upsertSocialLinkAction({
      label: formData.get("label")?.toString() ?? "",
      url: formData.get("url")?.toString() ?? "",
      iconType: formData.get("iconType")?.toString() ?? "",
      iconSvg: formData.get("iconSvg")?.toString() ?? "",
    });

    if (!result.success) {
      redirect(`/dashboard/settings?error=${encodeURIComponent(result.error)}`);
    }

    redirect(`/dashboard/settings?notice=${encodeURIComponent("Social link saved.")}`);
  }

  async function updateSocialLinkFormAction(formData: FormData) {
    "use server";

    const result = await upsertSocialLinkAction({
      id: formData.get("id")?.toString() ?? "",
      label: formData.get("label")?.toString() ?? "",
      url: formData.get("url")?.toString() ?? "",
      iconType: formData.get("iconType")?.toString() ?? "",
      iconSvg: formData.get("iconSvg")?.toString() ?? "",
    });

    if (!result.success) {
      redirect(`/dashboard/settings?error=${encodeURIComponent(result.error)}`);
    }

    redirect(`/dashboard/settings?notice=${encodeURIComponent("Social link updated.")}`);
  }

  async function deleteSocialLinkFormAction(formData: FormData) {
    "use server";

    const result = await deleteSocialLinkAction({
      id: formData.get("id")?.toString() ?? "",
    });

    if (!result.success) {
      redirect(`/dashboard/settings?error=${encodeURIComponent(result.error)}`);
    }

    redirect(`/dashboard/settings?notice=${encodeURIComponent("Social link removed.")}`);
  }

  async function createTaxonomyFormAction(formData: FormData) {
    "use server";

    const result = await upsertTaxonomyTermAction({
      name: formData.get("name")?.toString() ?? "",
      slug: formData.get("slug")?.toString() ?? "",
      type:
        formData.get("type")?.toString() === TaxonomyType.TAG
          ? TaxonomyType.TAG
          : TaxonomyType.GENRE,
    });

    if (!result.success) {
      redirect(`/dashboard/settings?error=${encodeURIComponent(result.error)}`);
    }

    redirect(`/dashboard/settings?notice=${encodeURIComponent("Taxonomy saved.")}`);
  }

  async function updateTaxonomyFormAction(formData: FormData) {
    "use server";

    const result = await upsertTaxonomyTermAction({
      id: formData.get("id")?.toString() ?? "",
      name: formData.get("name")?.toString() ?? "",
      slug: formData.get("slug")?.toString() ?? "",
      type:
        formData.get("type")?.toString() === TaxonomyType.TAG
          ? TaxonomyType.TAG
          : TaxonomyType.GENRE,
    });

    if (!result.success) {
      redirect(`/dashboard/settings?error=${encodeURIComponent(result.error)}`);
    }

    redirect(`/dashboard/settings?notice=${encodeURIComponent("Taxonomy updated.")}`);
  }

  async function deleteTaxonomyFormAction(formData: FormData) {
    "use server";

    const result = await deleteTaxonomyTermAction({
      id: formData.get("id")?.toString() ?? "",
    });

    if (!result.success) {
      redirect(`/dashboard/settings?error=${encodeURIComponent(result.error)}`);
    }

    redirect(`/dashboard/settings?notice=${encodeURIComponent("Taxonomy removed.")}`);
  }

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <p className="text-xs uppercase tracking-[0.24em] text-muted">Settings</p>
        <h1 className="font-serif text-4xl">Settings</h1>
      </section>

      {params.notice ? (
        <p className="notice-success rounded-2xl px-4 py-3 text-sm">
          {params.notice}
        </p>
      ) : null}

      {params.error ? (
        <p className="notice-warning rounded-2xl px-4 py-3 text-sm">
          {params.error}
        </p>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)]">
        <article className="panel p-6">
          <form action={updateSettingsFormAction} className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-1">
                <label htmlFor="groupName" className="text-sm font-medium">
                  Group name
                </label>
                <input
                  id="groupName"
                  name="groupName"
                  required
                  defaultValue={data.instanceSettings.groupName}
                  className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-foreground/30"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="siteTitle" className="text-sm font-medium">
                  Site title
                </label>
                <input
                  id="siteTitle"
                  name="siteTitle"
                  required
                  defaultValue={data.instanceSettings.siteTitle}
                  className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-foreground/30"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="groupDescription" className="text-sm font-medium">
                Group description
              </label>
              <textarea
                id="groupDescription"
                name="groupDescription"
                rows={4}
                defaultValue={data.instanceSettings.groupDescription ?? ""}
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm leading-7 outline-none transition focus:border-foreground/30"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="siteDescription" className="text-sm font-medium">
                Site description
              </label>
              <textarea
                id="siteDescription"
                name="siteDescription"
                rows={4}
                defaultValue={data.instanceSettings.siteDescription}
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm leading-7 outline-none transition focus:border-foreground/30"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="keywords" className="text-sm font-medium">
                Keywords
              </label>
              <textarea
                id="keywords"
                name="keywords"
                rows={4}
                defaultValue={data.instanceSettings.keywords.join(", ")}
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm leading-7 outline-none transition focus:border-foreground/30"
              />
            </div>

            <SubmitButton pendingLabel="Saving...">Save settings</SubmitButton>
          </form>
        </article>

        <aside className="space-y-6">
          <article className="panel space-y-4 p-5">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.16em] text-muted">Assets</p>
              <h2 className="font-serif text-2xl">Logo</h2>
            </div>
            <div className="overflow-hidden rounded-[1.25rem] border border-border bg-[var(--surface-muted)]">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="Logo" className="h-40 w-full object-cover" />
              ) : (
                <div className="flex h-40 items-center justify-center font-serif text-sm text-muted">
                  TM
                </div>
              )}
            </div>
            <form action={uploadLogoFormAction} className="space-y-3">
              <input
                name="file"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="block w-full text-sm text-muted file:mr-4 file:rounded-full file:border-0 file:bg-foreground file:px-4 file:py-2 file:text-sm file:text-background"
              />
              <SubmitButton pendingLabel="Uploading...">Upload logo</SubmitButton>
            </form>
          </article>

          <article className="panel space-y-4 p-5">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.16em] text-muted">Assets</p>
              <h2 className="font-serif text-2xl">Favicon</h2>
            </div>
            <div className="overflow-hidden rounded-[1.25rem] border border-border bg-[var(--surface-muted)]">
              {faviconUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={faviconUrl}
                  alt="Favicon"
                  className="h-40 w-full object-contain p-6"
                />
              ) : (
                <div className="flex h-40 items-center justify-center font-serif text-sm text-muted">
                  ICO
                </div>
              )}
            </div>
            <form action={uploadFaviconFormAction} className="space-y-3">
              <input
                name="file"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="block w-full text-sm text-muted file:mr-4 file:rounded-full file:border-0 file:bg-foreground file:px-4 file:py-2 file:text-sm file:text-background"
              />
              <SubmitButton pendingLabel="Uploading...">Upload favicon</SubmitButton>
            </form>
          </article>
        </aside>
      </section>

      <section className="panel p-6">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.16em] text-muted">Links</p>
          <h2 className="font-serif text-3xl">Social links</h2>
        </div>

        <div className="mt-6 space-y-4">
          {data.instanceSettings.socialLinks.length === 0 ? (
            <p className="text-sm text-muted">
              No social links yet. Add the first public link below.
            </p>
          ) : null}

          {data.instanceSettings.socialLinks.map((link) => (
            <div key={link.id} className="rounded-[1.5rem] border border-border p-4">
              <form action={updateSocialLinkFormAction} className="grid gap-4 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)_180px]">
                <input type="hidden" name="id" value={link.id} />
                <input
                  name="label"
                  defaultValue={link.label}
                  className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-foreground/30"
                />
                <input
                  name="url"
                  defaultValue={link.url}
                  className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-foreground/30"
                />
                <div className="space-y-3">
                  <input
                    name="iconType"
                    defaultValue={link.iconType ?? ""}
                    placeholder="icon type"
                    className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-foreground/30"
                  />
                  <SubmitButton pendingLabel="Saving...">Save</SubmitButton>
                </div>
                <div className="xl:col-span-3">
                  <textarea
                    name="iconSvg"
                    rows={3}
                    defaultValue={link.iconSvg ?? ""}
                    placeholder="optional svg"
                    className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm leading-7 outline-none transition focus:border-foreground/30"
                  />
                </div>
              </form>
              <form action={deleteSocialLinkFormAction} className="mt-4">
                <input type="hidden" name="id" value={link.id} />
                <SubmitButton
                  pendingLabel="Removing..."
                  className="danger-outline rounded-full px-4 py-2.5 text-sm transition disabled:cursor-wait disabled:opacity-70"
                >
                  Remove
                </SubmitButton>
              </form>
            </div>
          ))}

          <form action={createSocialLinkFormAction} className="rounded-[1.5rem] border border-dashed border-border p-4">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)_180px]">
              <input
                name="label"
                placeholder="label"
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-foreground/30"
              />
              <input
                name="url"
                placeholder="https://example.com"
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-foreground/30"
              />
              <input
                name="iconType"
                placeholder="icon type"
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-foreground/30"
              />
              <div className="xl:col-span-3">
                <textarea
                  name="iconSvg"
                  rows={3}
                  placeholder="optional svg"
                  className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm leading-7 outline-none transition focus:border-foreground/30"
                />
              </div>
            </div>
            <div className="mt-4">
              <SubmitButton pendingLabel="Adding...">Add link</SubmitButton>
            </div>
          </form>
        </div>
      </section>

      {user.rolePreset === RolePreset.ADMIN ? (
        <section className="panel p-6">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.16em] text-muted">Taxonomy</p>
            <h2 className="font-serif text-3xl">Genres and tags</h2>
          </div>

          <div className="mt-6 space-y-4">
            {data.taxonomyTerms.length === 0 ? (
              <p className="text-sm text-muted">
                No terms exist yet. Add the first genre or tag below.
              </p>
            ) : null}

            {data.taxonomyTerms.map((term) => (
              <div key={term.id} className="rounded-[1.5rem] border border-border p-4">
                <form action={updateTaxonomyFormAction} className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_180px_160px]">
                  <input type="hidden" name="id" value={term.id} />
                  <input
                    name="name"
                    defaultValue={term.name}
                    className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-foreground/30"
                  />
                  <input
                    name="slug"
                    defaultValue={term.slug}
                    className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-foreground/30"
                  />
                  <select
                    name="type"
                    defaultValue={term.type}
                    className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-foreground/30"
                  >
                    <option value={TaxonomyType.GENRE}>Genre</option>
                    <option value={TaxonomyType.TAG}>Tag</option>
                  </select>
                  <SubmitButton pendingLabel="Saving...">Save</SubmitButton>
                </form>
                <form action={deleteTaxonomyFormAction} className="mt-4">
                  <input type="hidden" name="id" value={term.id} />
                  <SubmitButton
                    pendingLabel="Removing..."
                    className="danger-outline rounded-full px-4 py-2.5 text-sm transition disabled:cursor-wait disabled:opacity-70"
                  >
                    Remove
                  </SubmitButton>
                </form>
              </div>
            ))}

            <form action={createTaxonomyFormAction} className="rounded-[1.5rem] border border-dashed border-border p-4">
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_180px]">
                <input
                  name="name"
                  placeholder="name"
                  className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-foreground/30"
                />
                <input
                  name="slug"
                  placeholder="slug"
                  className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-foreground/30"
                />
                <select
                  name="type"
                  defaultValue={TaxonomyType.GENRE}
                  className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-foreground/30"
                >
                  <option value={TaxonomyType.GENRE}>Genre</option>
                  <option value={TaxonomyType.TAG}>Tag</option>
                </select>
              </div>
              <div className="mt-4">
                <SubmitButton pendingLabel="Adding...">Add term</SubmitButton>
              </div>
            </form>
          </div>
        </section>
      ) : null}
    </div>
  );
}
