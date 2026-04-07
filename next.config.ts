import type { NextConfig } from "next";
import { isIP } from "node:net";

import { buildSecurityHeaders } from "./app/_lib/security/headers";

const remotePatterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [];
let useUnoptimizedImages = false;

function isPrivateHostname(hostname: string) {
  const normalized = hostname.trim().toLowerCase();

  if (
    normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized === "::1" ||
    normalized.endsWith(".localhost")
  ) {
    return true;
  }

  if (isIP(normalized) !== 4) {
    return false;
  }

  const [first, second] = normalized.split(".").map(Number);

  return (
    first === 10 ||
    first === 127 ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  );
}

if (process.env.S3_PUBLIC_BASE_URL) {
  try {
    const s3PublicUrl = new URL(process.env.S3_PUBLIC_BASE_URL);

    remotePatterns.push({
      protocol: s3PublicUrl.protocol.replace(":", "") as "http" | "https",
      hostname: s3PublicUrl.hostname,
      port: s3PublicUrl.port,
      pathname: `${s3PublicUrl.pathname.replace(/\/$/, "")}/**`,
    });

    useUnoptimizedImages = isPrivateHostname(s3PublicUrl.hostname);
  } catch {
    // Ignore invalid build-time S3 URL configuration and keep local storage working.
  }
}

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    authInterrupts: true,
    serverActions: {
      bodySizeLimit: "256mb",
    },
  },
  images: {
    remotePatterns,
    unoptimized: useUnoptimizedImages,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: buildSecurityHeaders(process.env.S3_PUBLIC_BASE_URL),
      },
    ];
  },
};

export default nextConfig;
