import { RolePreset } from "@/generated/prisma/client";
import { z } from "zod";

import { uuidSchema } from "@/app/_lib/validation/shared";

export const assignRolePresetInputSchema = z.object({
  userId: uuidSchema,
  rolePreset: z.nativeEnum(RolePreset),
});
