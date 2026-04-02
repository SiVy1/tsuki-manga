import type { Metadata, Viewport } from "next";
import { Newsreader, Raleway } from "next/font/google";

import { getOptionalSession } from "@/app/_lib/auth/session";
import { themeModeStorageKey, type ThemeModeValue } from "@/app/_lib/theme/shared";
import { ThemeController } from "@/app/_components/theme-controller";
import { buildRootMetadata } from "@/app/_lib/seo/metadata";
import "./globals.css";

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
});

const raleway = Raleway({
  variable: "--font-raleway",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  return buildRootMetadata();
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

function buildThemeInitScript(defaultThemeMode: ThemeModeValue) {
  return `
    (() => {
      const storageKey = ${JSON.stringify(themeModeStorageKey)};
      const defaultMode = ${JSON.stringify(defaultThemeMode)};
      const isThemeMode = (value) => value === "SYSTEM" || value === "LIGHT" || value === "DARK";
      const storedMode = (() => {
        try {
          const value = window.localStorage.getItem(storageKey);
          return isThemeMode(value) ? value : null;
        } catch {
          return null;
        }
      })();
      const themeMode = storedMode ?? defaultMode;
      if (!storedMode && defaultMode !== "SYSTEM") {
        try {
          window.localStorage.setItem(storageKey, defaultMode);
        } catch {}
      }
      const resolvedTheme = themeMode === "DARK" || (
        themeMode === "SYSTEM" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches
      )
        ? "dark"
        : "light";
      document.documentElement.dataset.theme = resolvedTheme;
      document.documentElement.style.colorScheme = resolvedTheme;
    })();
  `;
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getOptionalSession();
  const defaultThemeMode = (session?.user?.themePreference ?? "SYSTEM") as ThemeModeValue;

  return (
    <html
      lang="en"
      data-theme={defaultThemeMode === "DARK" ? "dark" : "light"}
      suppressHydrationWarning
      className={`${newsreader.variable} ${raleway.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: buildThemeInitScript(defaultThemeMode),
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeController defaultThemeMode={defaultThemeMode} />
        {children}
      </body>
    </html>
  );
}
