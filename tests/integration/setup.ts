Object.assign(process.env, {
  NODE_ENV: process.env.NODE_ENV ?? "test",
  APP_URL: process.env.APP_URL ?? "http://localhost:3000",
  AUTH_SECRET: process.env.AUTH_SECRET ?? "test-auth-secret",
  DATABASE_URL:
    process.env.DATABASE_URL ??
    process.env.TEST_DATABASE_URL ??
    "postgresql://postgres:postgres@localhost:5432/tsuki_manga_test",
  STORAGE_DRIVER: process.env.STORAGE_DRIVER ?? "local",
  ENABLE_TEST_AUTH: process.env.ENABLE_TEST_AUTH ?? "true",
});

afterAll(async () => {
  const { prisma } = await import("@/app/_lib/db/client");
  await prisma.$disconnect();
});
