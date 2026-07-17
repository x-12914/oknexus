import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { verifyTotp, decryptSecret } from "@/lib/totp";
import { recordLogin, clientIp } from "@/lib/login-history";
import type { UserRole } from "@prisma/client";

/** The signed-in user's id, or null. Use in route handlers to gate actions. */
export async function sessionUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

/** The signed-in user's id + role, or null. */
export async function sessionUser(): Promise<{ id: string; role: UserRole } | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return { id: session.user.id, role: (session.user.role ?? "USER") as UserRole };
}

/** The signed-in user's id if they're an admin, else null. */
export async function requireAdmin(): Promise<string | null> {
  const u = await sessionUser();
  return u && u.role === "ADMIN" ? u.id : null;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Behind the nginx reverse proxy in production.
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {}, code: {} },
      authorize: async (creds, request) => {
        const email = String(creds?.email ?? "").trim().toLowerCase();
        const password = String(creds?.password ?? "");
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;
        if (user.suspended) throw new Error("This account has been suspended.");

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        // Two-factor: when enabled, a valid current TOTP code is also required.
        if (user.twoFAEnabled) {
          const secret = user.twoFASecret ? decryptSecret(user.twoFASecret) : null;
          if (!secret || !verifyTotp(secret, String(creds?.code ?? ""))) return null;
        }

        // Record the successful sign-in for the account's login history.
        const headers = request instanceof Request ? request.headers : undefined;
        await recordLogin(
          user.id,
          headers ? clientIp(headers) : null,
          headers?.get("user-agent") ?? null,
        );

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = (user as { id: string }).id;
        token.role = (user as { role?: UserRole }).role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
      }
      return session;
    },
  },
});
