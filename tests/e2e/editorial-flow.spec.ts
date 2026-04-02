import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

const testAuthSecret = process.env.TEST_AUTH_SHARED_SECRET ?? "tsuki-test-secret";

const pngBuffer = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9p2vlA0AAAAASUVORK5CYII=",
  "base64",
);

async function signInWithTestAuth(
  page: Page,
  {
    providerAccountId,
    displayName,
    redirectTo = "/dashboard",
  }: {
    providerAccountId: string;
    displayName: string;
    redirectTo?: string;
  },
) {
  await page.goto(`/sign-in?redirectTo=${encodeURIComponent(redirectTo)}`);
  await expect(page.getByLabel("Provider account ID")).toBeVisible();
  await page.getByLabel("Provider account ID").fill(providerAccountId);
  await page.getByLabel("Display name").fill(displayName);
  await page.getByLabel("Shared secret").fill(testAuthSecret);
  await page.getByRole("button", { name: "Continue with test auth" }).click();
}

test("reader has no dashboard access", async ({ page }) => {
  await signInWithTestAuth(page, {
    providerAccountId: "reader-account",
    displayName: "Reader",
  });

  await expect(page.getByRole("heading", { name: "Forbidden" })).toBeVisible();
});

test("test auth can switch from reader to admin", async ({ page }) => {
  await signInWithTestAuth(page, {
    providerAccountId: "reader-account",
    displayName: "Reader",
  });

  await expect(page.getByRole("heading", { name: "Forbidden" })).toBeVisible();

  await signInWithTestAuth(page, {
    providerAccountId: "admin-account",
    displayName: "Admin",
  });

  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
});

test("editor creates draft and publisher publishes it", async ({ page }) => {
  await signInWithTestAuth(page, {
    providerAccountId: "editor-account",
    displayName: "Editor",
    redirectTo: "/dashboard/series/new",
  });

  await expect(page).toHaveURL(/\/dashboard\/series\/new/);

  await page.getByLabel("Title").fill("Moon Harbor");
  await page.getByLabel("Short description").fill("Short note");
  await page.getByRole("button", { name: "Create series" }).click();

  await expect(page.getByRole("heading", { name: "Moon Harbor" })).toBeVisible();

  await page.getByLabel("Chapter number").last().fill("1");
  await page.getByLabel("Optional title").last().fill("Arrival");
  await page.getByRole("button", { name: "Create chapter" }).click();

  await expect(page.getByRole("heading", { name: "Chapter 1" })).toBeVisible();

  await page.locator('input[name="files"]').setInputFiles([
    {
      name: "001.png",
      mimeType: "image/png",
      buffer: pngBuffer,
    },
  ]);
  await page.getByRole("button", { name: "Upload pages" }).click();

  await expect(page.getByText("Pages uploaded.")).toBeVisible();

  await Promise.all([
    page.waitForURL("**/"),
    page.getByRole("button", { name: "Sign out" }).click(),
  ]);

  await signInWithTestAuth(page, {
    providerAccountId: "publisher-account",
    displayName: "Publisher",
    redirectTo: "/dashboard/chapters",
  });

  await page.getByRole("link", { name: /Chapter 1/i }).first().click();
  await page.getByRole("button", { name: "Publish now" }).click();

  await expect(page.getByText("Chapter published.")).toBeVisible();

  await page.goto("/series/moon-harbor");
  await expect(page.getByRole("heading", { name: "Moon Harbor" })).toBeVisible();
  await page.getByRole("link", { name: /Chapter 1/i }).click();
  await expect(page.getByRole("heading", { name: "Chapter 1" })).toBeVisible();
});
