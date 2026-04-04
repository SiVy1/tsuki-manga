import type { NextConfig } from "next";

const remotePatterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [];

if (process.env.S3_PUBLIC_BASE_URL) {
  try {
    const s3PublicUrl = new URL(process.env.S3_PUBLIC_BASE_URL);

    remotePatterns.push({
      protocol: s3PublicUrl.protocol.replace(":", "") as "http" | "https",
      hostname: s3PublicUrl.hostname,
      port: s3PublicUrl.port,
      pathname: `${s3PublicUrl.pathname.replace(/\/$/, "")}/**`,
    });
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
  },
};

export default nextConfig;
