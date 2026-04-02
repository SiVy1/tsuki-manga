import { randomUUID } from "node:crypto";
import path from "node:path";

import { AssetKind } from "@/generated/prisma/client";

function sanitizeFilename(filename: string) {
  const extension = path.extname(filename).toLowerCase();
  const stem = path
    .basename(filename, extension)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

  return `${stem || "asset"}${extension}`;
}

export function buildAssetStorageKey(kind: AssetKind, ownerId: string, filename: string) {
  return `${kind.toLowerCase()}/${ownerId}/${randomUUID()}-${sanitizeFilename(filename)}`;
}
