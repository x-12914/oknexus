import type { DefaultSession } from "next-auth";
import type { UserRole } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      isEmailVerified: boolean;
    } & DefaultSession["user"];
  }
  interface User {
    role?: UserRole;
    tokenVersion?: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: UserRole;
    tokenVersion?: number;
    emailVerified?: boolean;
  }
}
