import { StorageDriver as StorageDriverEnum } from "@/generated/prisma/client";
import { getEnv } from "@/app/_lib/settings/env";
import { LocalStorageDriver } from "@/app/_lib/storage/local-driver";
import { S3StorageDriver } from "@/app/_lib/storage/s3-driver";

const storageDriver =
  getEnv().STORAGE_DRIVER === "s3"
    ? new S3StorageDriver()
    : new LocalStorageDriver();

export { storageDriver };

export function getStorageDriverEnum() {
  return getEnv().STORAGE_DRIVER === "s3"
    ? StorageDriverEnum.S3
    : StorageDriverEnum.LOCAL;
}
