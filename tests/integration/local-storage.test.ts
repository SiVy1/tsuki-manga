import { beforeEach, describe, expect, it } from "vitest";

import { AssetScope } from "@/generated/prisma/client";

import { LocalStorageDriver } from "@/app/_lib/storage/local-driver";
import { resetDatabaseAndStorage } from "@/tests/integration/helpers/database";

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

describe("local storage driver", () => {
  beforeEach(async () => {
    await resetDatabaseAndStorage();
  });

  it("writes, reads, moves and deletes assets across draft/public scopes", async () => {
    const driver = new LocalStorageDriver();
    const key = "chapter-page/test/example.txt";
    const payload = Buffer.from("hello tsuki");

    await driver.put({
      key,
      buffer: payload,
      contentType: "text/plain",
      scope: AssetScope.DRAFT,
    });

    expect(await driver.exists(key, AssetScope.DRAFT)).toBe(true);
    expect(await driver.exists(key, AssetScope.PUBLIC)).toBe(false);

    const draftObject = await driver.getDraftObject(key);

    expect(draftObject).not.toBeNull();
    expect(await streamToBuffer(draftObject!.body)).toEqual(payload);

    await driver.changeScope(key, AssetScope.DRAFT, AssetScope.PUBLIC);

    expect(await driver.exists(key, AssetScope.DRAFT)).toBe(false);
    expect(await driver.exists(key, AssetScope.PUBLIC)).toBe(true);
    expect(driver.getPublicUrl(key)).toBe("/media/chapter-page/test/example.txt");

    await driver.delete(key, AssetScope.PUBLIC);

    expect(await driver.exists(key, AssetScope.PUBLIC)).toBe(false);
  });
});
