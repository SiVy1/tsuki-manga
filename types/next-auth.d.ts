import { RolePreset, ThemeMode } from "@/generated/prisma/client";
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      rolePreset: RolePreset;
      permissionBits: number;
      displayName: string | null;
      themePreference: ThemeMode | null;
    };
  }

  interface User {
    rolePreset?: RolePreset;
    permissionBits?: number;
    displayName?: string | null;
    themePreference?: ThemeMode | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    rolePreset?: RolePreset;
    permissionBits?: number;
    displayName?: string | null;
    themePreference?: ThemeMode | null;
  }
}
