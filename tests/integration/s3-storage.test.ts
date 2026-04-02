import { beforeEach, describe, expect, it } from "vitest";

import {
  DeleteObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";
import { AssetScope } from "@/generated/prisma/client";

import { S3StorageDriver } from "@/app/_lib/storage/s3-driver";

const client = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
  },
});

const bucket = process.env.S3_BUCKET ?? "tsuki-manga";

async function clearBucket(prefix: string) {
  const listed = await client.send(
    new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
    }),
  );

  for (const item of listed.Contents ?? []) {
    if (!item.Key) {
      continue;
    }

    await client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: item.Key,
      }),
    );
  }
}

async function streamToBuffer(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];

  while (true) {
    const result = await reader.read();

    if (result.done) {
      break;
    }

    chunks.push(result.value);
  }

  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
}

describe("s3 storage driver", () => {
  beforeEach(async () => {
    await clearBucket("draft/chapter-page/test/");
    await clearBucket("public/chapter-page/test/");
  });

  it("writes, reads, moves and deletes assets via S3-compatible storage", async () => {
    const driver = new S3StorageDriver();
    const key = "chapter-page/test/example.txt";
    const payload = Buffer.from("hello from minio");

    await driver.put({
      key,
      buffer: payload,
      contentType: "text/plain",
      scope: AssetScope.DRAFT,
    });

    expect(await driver.exists(key, AssetScope.DRAFT)).toBe(true);

    const object = await driver.getDraftObject(key);

    expect(object).not.toBeNull();
    expect(await streamToBuffer(object!.body)).toEqual(payload);

    await driver.changeScope(key, AssetScope.DRAFT, AssetScope.PUBLIC);

    expect(await driver.exists(key, AssetScope.DRAFT)).toBe(false);
    expect(await driver.exists(key, AssetScope.PUBLIC)).toBe(true);
    expect(driver.getPublicUrl(key)).toBe(
      `${process.env.S3_PUBLIC_BASE_URL}/chapter-page/test/example.txt`,
    );

    await driver.delete(key, AssetScope.PUBLIC);

    expect(await driver.exists(key, AssetScope.PUBLIC)).toBe(false);
  });
});
