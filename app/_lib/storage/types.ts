import { AssetScope, StorageDriver as StorageDriverEnum } from "@/generated/prisma/client";

export type StoragePutInput = {
  key: string;
  buffer: Buffer;
  contentType: string;
  scope: AssetScope;
};

export type StorageReadResult = {
  body: ReadableStream<Uint8Array>;
  contentType: string;
  contentLength?: number;
};

export interface StorageDriver {
  readonly driver: StorageDriverEnum;
  put(input: StoragePutInput): Promise<void>;
  delete(key: string, scope: AssetScope): Promise<void>;
  exists(key: string, scope: AssetScope): Promise<boolean>;
  getPublicUrl(key: string): string;
  getDraftObject(key: string): Promise<StorageReadResult | null>;
  changeScope(key: string, fromScope: AssetScope, toScope: AssetScope): Promise<void>;
}
