import { describe, expect, it } from "vitest";

import { RolePreset } from "../../generated/prisma/client";
import {
  PermissionBits,
  canAccessDashboard,
  getPermissionBitsForPreset,
  hasPermission,
} from "../../app/_lib/permissions/bits";

describe("permission preset mapping", () => {
  it("maps reader to an empty permission mask", () => {
    expect(getPermissionBitsForPreset(RolePreset.READER)).toBe(0);
    expect(canAccessDashboard(getPermissionBitsForPreset(RolePreset.READER))).toBe(
      false,
    );
  });

  it("maps publisher to editorial and publish permissions", () => {
    const publisherBits = getPermissionBitsForPreset(RolePreset.PUBLISHER);

    expect(hasPermission(publisherBits, PermissionBits.SERIES)).toBe(true);
    expect(hasPermission(publisherBits, PermissionBits.CHAPTERS)).toBe(true);
    expect(hasPermission(publisherBits, PermissionBits.SETTINGS)).toBe(true);
    expect(hasPermission(publisherBits, PermissionBits.PUBLISH)).toBe(true);
    expect(hasPermission(publisherBits, PermissionBits.USERS)).toBe(false);
  });

  it("maps admin to all configured flags", () => {
    const adminBits = getPermissionBitsForPreset(RolePreset.ADMIN);

    expect(hasPermission(adminBits, PermissionBits.USERS)).toBe(true);
    expect(hasPermission(adminBits, PermissionBits.SETTINGS)).toBe(true);
    expect(hasPermission(adminBits, PermissionBits.TAXONOMY)).toBe(true);
    expect(hasPermission(adminBits, PermissionBits.SERIES)).toBe(true);
    expect(hasPermission(adminBits, PermissionBits.CHAPTERS)).toBe(true);
    expect(hasPermission(adminBits, PermissionBits.PUBLISH)).toBe(true);
    expect(canAccessDashboard(adminBits)).toBe(true);
  });

  it("treats missing permission bits as no access", () => {
    expect(canAccessDashboard(undefined as never)).toBe(false);
    expect(hasPermission(undefined as never, PermissionBits.SERIES)).toBe(false);
  });
});
