import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { Readable } from "node:stream";

import { AssetScope, StorageDriver as StorageDriverEnum } from "@/generated/prisma/client";
import { getEnv } from "@/app/_lib/settings/env";
import type { StorageDriver, StoragePutInput } from "@/app/_lib/storage/types";

function getS3ObjectKey(scope: AssetScope, key: string) {
  return `${scope === AssetScope.PUBLIC ? "public" : "draft"}/${key}`;
}

function createS3Client() {
  const env = getEnv();

  return new S3Client({
    region: env.S3_REGION || "us-east-1",
    endpoint: env.S3_ENDPOINT || undefined,
    forcePathStyle: Boolean(env.S3_ENDPOINT),
    credentials:
      env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY
        ? {
            accessKeyId: env.S3_ACCESS_KEY_ID,
            secretAccessKey: env.S3_SECRET_ACCESS_KEY,
          }
        : undefined,
  });
}

async function bodyToWebStream(body: unknown) {
  if (!body) {
    return null;
  }

  if (
    typeof body === "object" &&
    body !== null &&
    "transformToWebStream" in body &&
    typeof body.transformToWebStream === "function"
  ) {
    return body.transformToWebStream() as Promise<ReadableStream<Uint8Array>>;
  }

  if (body instanceof Readable) {
    return Readable.toWeb(body) as ReadableStream<Uint8Array>;
  }

  return null;
}

export class S3StorageDriver implements StorageDriver {
  readonly driver = StorageDriverEnum.S3;
  private readonly client = createS3Client();
  private readonly bucket = getEnv().S3_BUCKET;
  private readonly publicBaseUrl = (getEnv().S3_PUBLIC_BASE_URL || "").replace(/\/+$/, "");

  async put(input: StoragePutInput) {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: getS3ObjectKey(input.scope, input.key),
        Body: input.buffer,
        ContentType: input.contentType,
      }),
    );
  }

  async delete(key: string, scope: AssetScope) {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: getS3ObjectKey(scope, key),
      }),
    );
  }

  async exists(key: string, scope: AssetScope) {
    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: getS3ObjectKey(scope, key),
        }),
      );

      return true;
    } catch {
      return false;
    }
  }

  getPublicUrl(key: string) {
    if (!this.publicBaseUrl) {
      throw new Error("S3_PUBLIC_BASE_URL must be configured when using the s3 driver.");
    }

    return `${this.publicBaseUrl}/${key}`;
  }

  async getDraftObject(key: string) {
    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: getS3ObjectKey(AssetScope.DRAFT, key),
      }),
    );

    const body = await bodyToWebStream(response.Body);

    if (!body) {
      return null;
    }

    return {
      body,
      contentType: response.ContentType || "application/octet-stream",
      contentLength: response.ContentLength,
    };
  }

  async changeScope(key: string, fromScope: AssetScope, toScope: AssetScope) {
    if (fromScope === toScope) {
      return;
    }

    const sourceKey = getS3ObjectKey(fromScope, key);
    const destinationKey = getS3ObjectKey(toScope, key);

    await this.client.send(
      new CopyObjectCommand({
        Bucket: this.bucket,
        CopySource: `${this.bucket}/${sourceKey}`,
        Key: destinationKey,
      }),
    );

    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: sourceKey,
      }),
    );
  }
}
