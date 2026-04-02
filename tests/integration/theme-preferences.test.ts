import { beforeEach, describe, expect, it, vi } from "vitest";

import { RolePreset, ThemeMode } from "@/generated/prisma/client";

import { saveThemePreferenceAction } from "@/app/_actions/preferences/actions";
import { authConfig } from "@/app/_lib/auth/config";
import { prisma } from "@/app/_lib/db/client";
import { getPermissionBitsForPreset } from "@/app/_lib/permissions/bits";
import {
  resetDatabaseAndStorage,
  seedDefaultUsers,
  testUsers,
} from "@/tests/integration/helpers/database";

const { requireSessionUserMock } = vi.hoisted(() => ({
  requireSessionUserMock: vi.fn(),
}));

vi.mock("@/app/_lib/auth/session", () => ({
  requireSessionUser: requireSessionUserMock,
  requireAdmin: vi.fn(),
  requirePermission: vi.fn(),
  requireDashboardUser: vi.fn(),
}));

describe("theme preferences", () => {
  beforeEach(async () => {
    await resetDatabaseAndStorage();
    await seedDefaultUsers();
    requireSessionUserMock.mockReset();
    requireSessionUserMock.mockResolvedValue({
      ...testUsers.editor,
      themePreference: null,
    });
  });

  it("saves the signed-in user's theme preference", async () => {
    const result = await saveThemePreferenceAction({
      themeMode: ThemeMode.DARK,
    });

    expect(result.success).toBe(true);

    const user = await prisma.user.findUnique({
      where: { id: testUsers.editor.id },
      select: {
        themePreference: true,
      },
    });

    expect(user?.themePreference).toBe(ThemeMode.DARK);
  });

  it("rejects invalid theme input", async () => {
    const result = await saveThemePreferenceAction({
      themeMode: "MIDNIGHT",
    });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error("theme validation unexpectedly succeeded");
    }
    expect(result.error).toContain("Invalid");
  });

  it("reflects the saved theme preference in jwt and session payloads", async () => {
    await prisma.user.update({
      where: { id: testUsers.editor.id },
      data: {
        themePreference: ThemeMode.LIGHT,
      },
    });

    const jwtCallback = authConfig.callbacks?.jwt;
    const sessionCallback = authConfig.callbacks?.session;

    if (!jwtCallback || !sessionCallback) {
      throw new Error("Auth callbacks are not configured.");
    }

    const token = await jwtCallback({
      token: {
        sub: testUsers.editor.id,
      },
      user: null as never,
      account: null as never,
      profile: null as never,
      trigger: "update",
      session: null as never,
    } as never);

    expect(token?.themePreference).toBe(ThemeMode.LIGHT);

    const session = await sessionCallback({
      session: {
        expires: new Date(Date.now() + 60_000),
        user: {
          id: testUsers.editor.id,
          rolePreset: RolePreset.EDITOR,
          permissionBits: getPermissionBitsForPreset(RolePreset.EDITOR),
          displayName: "editor",
          themePreference: null,
          name: "editor",
          email: undefined,
          image: null,
        },
      },
      token: {
        sub: testUsers.editor.id,
        rolePreset: RolePreset.EDITOR,
        permissionBits: getPermissionBitsForPreset(RolePreset.EDITOR),
        displayName: "editor",
        themePreference: ThemeMode.LIGHT,
      },
      newSession: undefined as never,
      trigger: "update",
      user: null as never,
    } as never);

    expect(session.user?.themePreference).toBe(ThemeMode.LIGHT);
  });
});
