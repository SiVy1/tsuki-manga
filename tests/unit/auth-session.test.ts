import { beforeEach, describe, expect, it, vi } from "vitest";

const { AuthErrorMock, authMock } = vi.hoisted(() => ({
  AuthErrorMock: class AuthErrorMock extends Error {
    type = "AuthError";
  },
  authMock: vi.fn(),
}));

vi.mock("next-auth", () => ({
  AuthError: AuthErrorMock,
}));

vi.mock("@/app/_lib/auth", () => ({
  auth: authMock,
}));

vi.mock("next/navigation", () => ({
  forbidden: vi.fn(),
  unauthorized: vi.fn(),
}));

describe("optional auth session", () => {
  beforeEach(() => {
    authMock.mockReset();
  });

  it("returns the session when auth succeeds", async () => {
    authMock.mockResolvedValue({
      user: {
        id: "user-1",
      },
    });

    const { getOptionalSession } = await import("@/app/_lib/auth/session");

    await expect(getOptionalSession()).resolves.toEqual({
      user: {
        id: "user-1",
      },
    });
  });

  it("returns null when auth throws an auth error", async () => {
    const authError = new AuthErrorMock();
    authError.type = "JWTSessionError";
    authMock.mockRejectedValue(authError);

    const { getOptionalSession } = await import("@/app/_lib/auth/session");

    await expect(getOptionalSession()).resolves.toBeNull();
  });

  it("rethrows non-session auth errors", async () => {
    const authError = new AuthErrorMock();
    authError.type = "AdapterError";
    authMock.mockRejectedValue(authError);

    const { getOptionalSession } = await import("@/app/_lib/auth/session");

    await expect(getOptionalSession()).rejects.toBe(authError);
  });

  it("rethrows unexpected errors", async () => {
    authMock.mockRejectedValue(new Error("database offline"));

    const { getOptionalSession } = await import("@/app/_lib/auth/session");

    await expect(getOptionalSession()).rejects.toThrow("database offline");
  });
});
