"use server";

import { prisma } from "@/app/_lib/db/client";
import { requireAdmin } from "@/app/_lib/auth/session";
import { getPermissionBitsForPreset } from "@/app/_lib/permissions/bits";
import { assignRolePresetInputSchema } from "@/app/_lib/validation/users";
import { fail, ok } from "@/app/_lib/utils/action-result";

export async function listUsersAction() {
  await requireAdmin();

  const users = await prisma.user.findMany({
    orderBy: {
      createdAt: "asc",
    },
    select: {
      id: true,
      name: true,
      displayName: true,
      image: true,
      rolePreset: true,
      permissionBits: true,
      createdAt: true,
    },
  });

  return ok(
    users.map((user) => ({
      ...user,
      createdAt: user.createdAt.toISOString(),
    })),
  );
}

export async function assignRolePresetAction(rawInput: unknown) {
  const actor = await requireAdmin();
  const parsed = assignRolePresetInputSchema.safeParse(rawInput);

  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid role assignment input.");
  }

  if (parsed.data.userId === actor.id) {
    return fail("Users cannot change their own role preset.");
  }

  const updatedUser = await prisma.user.update({
    where: { id: parsed.data.userId },
    data: {
      rolePreset: parsed.data.rolePreset,
      permissionBits: getPermissionBitsForPreset(parsed.data.rolePreset),
    },
    select: {
      id: true,
      rolePreset: true,
      permissionBits: true,
    },
  });

  return ok(updatedUser);
}
