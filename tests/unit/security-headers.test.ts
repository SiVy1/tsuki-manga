import { describe, expect, it } from "vitest";

import {
  buildContentSecurityPolicy,
  buildSecurityHeaders,
  resolveOrigin,
  resolvePublicAssetOrigin,
} from "@/app/_lib/security/headers";

describe("security headers", () => {
  it("resolves an origin from a valid public asset base url", () => {
    expect(resolvePublicAssetOrigin("https://cdn.example.com/tsuki/public")).toBe(
      "https://cdn.example.com",
    );
  });

  it("returns null for an invalid public asset base url", () => {
    expect(resolvePublicAssetOrigin("not-a-url")).toBeNull();
  });

  it("resolves an origin from a valid analytics script url", () => {
    expect(resolveOrigin("https://stats.example.com/script.js")).toBe(
      "https://stats.example.com",
    );
  });

  it("builds a baseline content security policy", () => {
    const policy = buildContentSecurityPolicy();

    expect(policy).toContain("default-src 'self'");
    expect(policy).toContain("script-src 'self' 'unsafe-inline'");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain("img-src 'self' data: blob:");
  });

  it("adds the public asset origin to img-src when configured", () => {
    const policy = buildContentSecurityPolicy("https://cdn.example.com/storage/public");

    expect(policy).toContain("img-src 'self' data: blob: https://cdn.example.com");
  });

  it("adds the analytics origin to script-src and connect-src when configured", () => {
    const policy = buildContentSecurityPolicy(
      "https://cdn.example.com/storage/public",
      "https://stats.example.com/script.js",
    );

    expect(policy).toContain("script-src 'self' 'unsafe-inline' https://stats.example.com");
    expect(policy).toContain("connect-src 'self' https://stats.example.com");
  });

  it("returns the expected baseline security headers", () => {
    const headers = buildSecurityHeaders("https://cdn.example.com/storage/public");

    expect(headers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "Content-Security-Policy" }),
        expect.objectContaining({
          key: "X-Content-Type-Options",
          value: "nosniff",
        }),
        expect.objectContaining({
          key: "Referrer-Policy",
          value: "strict-origin-when-cross-origin",
        }),
        expect.objectContaining({
          key: "X-Frame-Options",
          value: "DENY",
        }),
        expect.objectContaining({
          key: "Permissions-Policy",
          value: "camera=(), microphone=(), geolocation=(), payment=()",
        }),
      ]),
    );
  });
});
