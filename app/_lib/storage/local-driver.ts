import { mkdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";

import { AssetScope, StorageDriver as StorageDriverEnum } from "@/generated/prisma/client";
import type { StorageDriver, StoragePutInput } from "@/app/_lib/storage/types";

const publicRoot = path.join(process.cwd(), "public", "media");
const draftRoot = path.join(process.cwd(), ".storage", "draft");

function resolveScopeRoot(scope: AssetScope) {
  return scope === AssetScope.PUBLIC ? publicRoot : draftRoot;
}

function resolveKeyPath(scope: AssetScope, key: string) {
  const root = resolveScopeRoot(scope);
  const resolved = path.resolve(root, key);

  if (!resolved.startsWith(path.resolve(root))) {
    throw new Error("Invalid storage key path.");
  }

  return resolved;
}

async function ensureParentDirectory(filePath: string) {
  await mkdir(path.dirname(filePath), { recursive: true });
}

export class LocalStorageDriver implements StorageDriver {
  readonly driver = StorageDriverEnum.LOCAL;

  async put(input: StoragePutInput) {
    const targetPath = resolveKeyPath(input.scope, input.key);
    await ensureParentDirectory(targetPath);
    await writeFile(targetPath, input.buffer);
  }

  async delete(key: string, scope: AssetScope) {
    const targetPath = resolveKeyPath(scope, key);
    await rm(targetPath, { force: true });
  }

  async exists(key: string, scope: AssetScope) {
    const targetPath = resolveKeyPath(scope, key);

    try {
      await stat(targetPath);
      return true;
    } catch {
      return false;
    }
  }

  getPublicUrl(key: string) {
    return `/media/${key.replace(/\\/g, "/")}`;
  }

  async getDraftObject(key: string) {
    const targetPath = resolveKeyPath(AssetScope.DRAFT, key);

    try {
      const fileStats = await stat(targetPath);
      const stream = createReadStream(targetPath);

      return {
        body: Readable.toWeb(stream) as ReadableStream<Uint8Array>,
        contentType: "application/octet-stream",
        contentLength: fileStats.size,
      };
    } catch {
      return null;
    }
  }

  async changeScope(key: string, fromScope: AssetScope, toScope: AssetScope) {
    if (fromScope === toScope) {
      return;
    }

    const fromPath = resolveKeyPath(fromScope, key);
    const toPath = resolveKeyPath(toScope, key);

    await ensureParentDirectory(toPath);
    await rename(fromPath, toPath);
  }
}
