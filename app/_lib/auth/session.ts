import { AuthError, type Session } from "next-auth";
import { forbidden, unauthorized } from "next/navigation";

import { auth } from "@/app/_lib/auth";
import { hasPermission, canAccessDashboard, type PermissionBit } from "@/app/_lib/permissions/bits";
import { RolePreset } from "@/generated/prisma/client";

export async function getOptionalSession(): Promise<Session | null> {
  try {
    return await auth();
  } catch (error) {
    if (
      error instanceof AuthError &&
      (error.type === "JWTSessionError" || error.type === "SessionTokenError")
    ) {
      return null;
    }

    throw error;
  }
}

export async function requireSessionUser() {
  const session = await getOptionalSession();

  if (!session?.user) {
    unauthorized();
  }

  return session.user;
}

export async function requireDashboardUser() {
  const user = await requireSessionUser();

  if (!canAccessDashboard(user.permissionBits)) {
    forbidden();
  }

  return user;
}

export async function requirePermission(permission: PermissionBit) {
  const user = await requireDashboardUser();

  if (!hasPermission(user.permissionBits, permission)) {
    forbidden();
  }

  return user;
}

export async function requireAdmin() {
  const user = await requireDashboardUser();

  if (user.rolePreset !== RolePreset.ADMIN) {
    forbidden();
  }

  return user;
}
