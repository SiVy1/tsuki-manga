import { spawn } from "node:child_process";
import process from "node:process";
import path from "node:path";
import { config as loadEnv } from "dotenv";
import pg from "pg";

const repoRoot = process.cwd();

loadEnv({ path: path.join(repoRoot, ".env") });
loadEnv({ path: path.join(repoRoot, ".env.local"), override: true });
loadEnv({ path: path.join(repoRoot, ".env.test"), override: true });
loadEnv({ path: path.join(repoRoot, ".env.test.local"), override: true });

const testDatabaseUrl = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;

if (!testDatabaseUrl) {
  console.error(
    "Missing TEST_DATABASE_URL or DATABASE_URL. Integration tests require a real PostgreSQL database.",
  );
  process.exit(1);
}

const sharedEnv = {
  ...process.env,
  NODE_ENV: "test",
  DATABASE_URL: testDatabaseUrl,
};

async function ensureDatabaseReachable() {
  const client = new pg.Client({
    connectionString: testDatabaseUrl,
  });

  try {
    await client.connect();
    await client.query("SELECT 1");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown database error";
    console.error(
      `Integration tests require a reachable PostgreSQL database.\nTried: ${testDatabaseUrl}\nError: ${message}`,
    );
    process.exit(1);
  } finally {
    await client.end().catch(() => undefined);
  }
}

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

await ensureDatabaseReachable();
await runCommand("pnpm", ["prisma", "migrate", "deploy"]);
await runCommand("pnpm", ["exec", "vitest", "run", "--config", "vitest.integration.config.ts"]);
