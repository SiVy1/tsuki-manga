export type SecurityHeader = {
  key: string;
  value: string;
};

function appendIfMissing(values: string[], nextValue: string | null) {
  if (!nextValue || values.includes(nextValue)) {
    return values;
  }

  return [...values, nextValue];
}

export function resolvePublicAssetOrigin(rawPublicBaseUrl: string | undefined) {
  if (!rawPublicBaseUrl) {
    return null;
  }

  try {
    return new URL(rawPublicBaseUrl).origin;
  } catch {
    return null;
  }
}

export function buildContentSecurityPolicy(rawPublicAssetBaseUrl?: string) {
  const imgSources = appendIfMissing(
    ["'self'", "data:", "blob:"],
    resolvePublicAssetOrigin(rawPublicAssetBaseUrl),
  );

  const directives: Array<[string, string[]]> = [
    ["default-src", ["'self'"]],
    ["base-uri", ["'self'"]],
    ["frame-ancestors", ["'none'"]],
    ["object-src", ["'none'"]],
    ["form-action", ["'self'"]],
    ["script-src", ["'self'", "'unsafe-inline'"]],
    ["style-src", ["'self'", "'unsafe-inline'"]],
    ["img-src", imgSources],
    ["font-src", ["'self'", "data:"]],
    ["connect-src", ["'self'"]],
    ["media-src", ["'self'", "blob:"]],
    ["frame-src", ["'none'"]],
  ];

  return directives.map(([name, values]) => `${name} ${values.join(" ")}`).join("; ");
}

export function buildSecurityHeaders(rawPublicAssetBaseUrl?: string): SecurityHeader[] {
  return [
    {
      key: "Content-Security-Policy",
      value: buildContentSecurityPolicy(rawPublicAssetBaseUrl),
    },
    {
      key: "X-Content-Type-Options",
      value: "nosniff",
    },
    {
      key: "Referrer-Policy",
      value: "strict-origin-when-cross-origin",
    },
    {
      key: "X-Frame-Options",
      value: "DENY",
    },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), payment=()",
    },
  ];
}
