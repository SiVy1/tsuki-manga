import NextAuth from "next-auth";

import { authConfig } from "@/app/_lib/auth/config";

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
