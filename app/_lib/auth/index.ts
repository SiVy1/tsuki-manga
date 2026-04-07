import NextAuth from "next-auth";

import { authConfig } from "@/app/_lib/auth/config";
import { syncAuthEnvironmentFromAppUrl } from "@/app/_lib/auth/env";

syncAuthEnvironmentFromAppUrl();

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
