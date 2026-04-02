import { RolePreset } from "@/generated/prisma/client";

export const PermissionBits = {
  USERS: 1 << 0,
  SETTINGS: 1 << 1,
  TAXONOMY: 1 << 2,
  SERIES: 1 << 3,
  CHAPTERS: 1 << 4,
  PUBLISH: 1 << 5,
} as const;

export type PermissionBit =
  (typeof PermissionBits)[keyof typeof PermissionBits];

export const rolePresetPermissionMap: Record<RolePreset, number> = {
  [RolePreset.READER]: 0,
  [RolePreset.EDITOR]:
    PermissionBits.SERIES |
    PermissionBits.CHAPTERS |
    PermissionBits.SETTINGS,
  [RolePreset.PUBLISHER]:
    PermissionBits.SERIES |
    PermissionBits.CHAPTERS |
    PermissionBits.SETTINGS |
    PermissionBits.PUBLISH,
  [RolePreset.ADMIN]:
    PermissionBits.USERS |
    PermissionBits.SETTINGS |
    PermissionBits.TAXONOMY |
    PermissionBits.SERIES |
    PermissionBits.CHAPTERS |
    PermissionBits.PUBLISH,
};

export function getPermissionBitsForPreset(rolePreset: RolePreset) {
  return rolePresetPermissionMap[rolePreset];
}

export function hasPermission(permissionBits: number, permission: PermissionBit) {
  return (permissionBits & permission) === permission;
}

export function canAccessDashboard(permissionBits: number) {
  return permissionBits !== 0;
}
