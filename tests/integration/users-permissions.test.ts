import { beforeEach, describe, expect, it, vi } from "vitest";

import { RolePreset } from "@/generated/prisma/client";

import { assignRolePresetAction, listUsersAction } from "@/app/_actions/users/actions";
import { prisma } from "@/app/_lib/db/client";
import { getPermissionBitsForPreset } from "@/app/_lib/permissions/bits";
import {
  resetDatabaseAndStorage,
  seedDefaultUsers,
  testUsers,
} from "@/tests/integration/helpers/database";

const { requireAdminMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
}));

vi.mock("@/app/_lib/auth/session", () => ({
  requireAdmin: requireAdminMock,
  requirePermission: vi.fn(),
  requireSessionUser: vi.fn(),
  requireDashboardUser: vi.fn(),
}));

describe("users and permissions actions", () => {
  beforeEach(async () => {
    await resetDatabaseAndStorage();
    await seedDefaultUsers();
    requireAdminMock.mockReset();
    requireAdminMock.mockResolvedValue(testUsers.admin);
  });

  it("lists users for admin views", async () => {
    const result = await listUsersAction();

    expect(result.success).toBe(true);

    if (!result.success) {
      throw new Error("list users failed");
    }

    expect(result.data).toHaveLength(4);
  });

  it("blocks self escalation and allows assigning presets to others", async () => {
    const selfResult = await assignRolePresetAction({
      userId: testUsers.admin.id,
      rolePreset: "READER",
    });

    expect(selfResult.success).toBe(false);

    const assignResult = await assignRolePresetAction({
      userId: testUsers.editor.id,
      rolePreset: RolePreset.PUBLISHER,
    });

    expect(assignResult.success).toBe(true);

    const updatedUser = await prisma.user.findUnique({
      where: {
        id: testUsers.editor.id,
      },
    });

    expect(updatedUser?.rolePreset).toBe("PUBLISHER");
    expect(updatedUser?.permissionBits).toBe(
      getPermissionBitsForPreset(RolePreset.PUBLISHER),
    );
  });
});
