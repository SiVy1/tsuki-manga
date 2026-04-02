import { spawn } from "node:child_process";
import process from "node:process";
import path from "node:path";
import { config as loadEnv } from "dotenv";
import {
  CreateBucketCommand,
  HeadBucketCommand,
  S3Client,
} from "@aws-sdk/client-s3";

const repoRoot = process.cwd();

loadEnv({ path: path.join(repoRoot, ".env") });
loadEnv({ path: path.join(repoRoot, ".env.local"), override: true });
loadEnv({ path: path.join(repoRoot, ".env.test"), override: true });
loadEnv({ path: path.join(repoRoot, ".env.test.local"), override: true });

const requiredEnv = [
  "S3_ENDPOINT",
  "S3_REGION",
  "S3_BUCKET",
  "S3_ACCESS_KEY_ID",
  "S3_SECRET_ACCESS_KEY",
  "S3_PUBLIC_BASE_URL",
];

const testDatabaseUrl =
  process.env.TEST_DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5433/tsuki_manga_test";

for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.error(`Missing ${key}. S3 integration tests require MinIO/S3 configuration.`);
    process.exit(1);
  }
}

const sharedEnv = {
  ...process.env,
  NODE_ENV: "test",
  TEST_DATABASE_URL: testDatabaseUrl,
  DATABASE_URL: testDatabaseUrl,
  USE_TEST_DATABASE: "true",
  STORAGE_DRIVER: "s3",
};

function runCommand(command, args) {
  const executable =
    process.platform === "win32" && command === "pnpm" ? "pnpm.cmd" : command;

  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, {
      cwd: repoRoot,
      env: sharedEnv,
      stdio: "inherit",
      shell: process.platform === "win32",
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(" ")} failed with exit code ${code ?? "unknown"}.`));
    });
  });
}

async function ensureMinioReady() {
  const client = new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION,
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    },
  });

  const deadline = Date.now() + 60_000;

  while (Date.now() < deadline) {
    try {
      await client.send(
        new HeadBucketCommand({
          Bucket: process.env.S3_BUCKET,
        }),
      );
      return;
    } catch {
      try {
        await client.send(
          new CreateBucketCommand({
            Bucket: process.env.S3_BUCKET,
          }),
        );
        return;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 2_000));
      }
    }
  }

  console.error("MinIO/S3 endpoint did not become ready in time.");
  process.exit(1);
}

await runCommand("docker", ["compose", "--profile", "minio", "up", "-d", "minio"]);
await ensureMinioReady();
await runCommand("pnpm", ["exec", "vitest", "run", "--config", "vitest.integration.s3.config.ts"]);
