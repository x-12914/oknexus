import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { verifyTotpOnce, decryptSecret } from "@/lib/totp";
import { recordLogin, clientIp } from "@/lib/login-history";
import { rateLimit, resetRateLimit } from "@/lib/rate-limit";
import { ensureWallets } from "@/lib/wallet";
import { notify } from "@/lib/notifications";
import { socialAuthProviders, socialProviderDefinition } from "@/lib/social-auth";
import {
  clearTwoFactorChallenge,
  issueTwoFactorChallenge,
  readTwoFactorChallengeFromHeader,
} from "@/lib/oauth-challenge";
import type { Adapter } from "next-auth/adapters";
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

/**
 * Email/password sign-ups lower-case the address before storing it; OAuth
 * profiles arrive in whatever case the provider uses. Normalise on the way in
 * and out of the adapter so "Sam@x.com" from Google resolves to the existing
 * "sam@x.com" account instead of colliding on the unique index.
 */
function normalisingAdapter(base: Adapter): Adapter {
  return {
    ...base,
    createUser: (user) => base.createUser!({ ...user, email: user.email?.toLowerCase() }),
    getUserByEmail: (email) => base.getUserByEmail!(email.toLowerCase()),
  };
}

/** A social provider vouched for the address, so stop nagging the user to verify it. */
async function markEmailVerified(userId: string): Promise<void> {
  await prisma.user.updateMany({
    where: { id: userId, emailVerified: null },
    data: { emailVerified: new Date() },
  });
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Behind the nginx reverse proxy in production.
  trustHost: true,
  adapter: normalisingAdapter(PrismaAdapter(prisma)),
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {}, code: {} },
      authorize: async (creds, request) => {
        const email = String(creds?.email ?? "").trim().toLowerCase();
        const password = String(creds?.password ?? "");
        if (!email || !password) return null;

        const headers = request instanceof Request ? request.headers : undefined;
        const ip = headers ? clientIp(headers) : null;

        // Throttle login attempts per email+IP. Because a wrong 2FA code re-enters
        // authorize, this also caps online TOTP brute-force (the 2FA-bypass vector).
        const rlKey = `login:${email}:${ip ?? "?"}`;
        if (!rateLimit(rlKey, { max: 8, windowMs: 900_000, lockoutMs: 900_000 }).allowed) {
          throw new Error("Too many attempts. Please try again later.");
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;
        if (user.suspended) throw new Error("This account has been suspended.");

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        // Block sign-in until email is verified.
        if (!user.emailVerified) throw new Error("EMAIL_NOT_VERIFIED");

        // Two-factor: when enabled, a valid, not-yet-used current TOTP code is required.
        if (user.twoFAEnabled) {
          const secret = user.twoFASecret ? decryptSecret(user.twoFASecret) : null;
          if (!secret || !verifyTotpOnce(user.id, secret, String(creds?.code ?? ""))) return null;
        }

        // Full success — clear the throttle so earlier typos don't penalise the user.
        resetRateLimit(rlKey);
        await recordLogin(user.id, ip, headers?.get("user-agent") ?? null);

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          role: user.role,
          tokenVersion: user.tokenVersion,
        };
      },
    }),

    // Second leg of a social sign-in for accounts that have 2FA turned on. The
    // OAuth callback parks the user here with a signed challenge cookie rather
    // than issuing a session; only a current authenticator code completes it.
    Credentials({
      id: "oauth-2fa",
      name: "Two-factor",
      credentials: { code: {} },
      authorize: async (creds, request) => {
        const headers = request instanceof Request ? request.headers : undefined;
        const challenge = readTwoFactorChallengeFromHeader(headers?.get("cookie"));
        if (!challenge) return null;

        const ip = headers ? clientIp(headers) : null;
        const rlKey = `oauth-2fa:${challenge.userId}:${ip ?? "?"}`;
        if (!rateLimit(rlKey, { max: 8, windowMs: 900_000, lockoutMs: 900_000 }).allowed) {
          throw new Error("Too many attempts. Please try again later.");
        }

        const user = await prisma.user.findUnique({ where: { id: challenge.userId } });
        if (!user || user.suspended) return null;
        if (!user.twoFAEnabled || !user.twoFASecret) return null;

        const secret = decryptSecret(user.twoFASecret);
        if (!secret || !verifyTotpOnce(user.id, secret, String(creds?.code ?? ""))) return null;

        // Second factor cleared. Link the provider account now — the OAuth
        // callback bailed out before the adapter could — so the next sign-in
        // resolves by provider id rather than by email.
        await prisma.account.upsert({
          where: {
            provider_providerAccountId: {
              provider: challenge.provider,
              providerAccountId: challenge.providerAccountId,
            },
          },
          create: {
            userId: user.id,
            type: challenge.accountType,
            provider: challenge.provider,
            providerAccountId: challenge.providerAccountId,
          },
          update: {},
        });

        if (socialProviderDefinition(challenge.provider)?.verifiesEmail) {
          await markEmailVerified(user.id);
        }

        resetRateLimit(rlKey);
        await clearTwoFactorChallenge();
        await recordLogin(user.id, ip, headers?.get("user-agent") ?? null);

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          role: user.role,
          tokenVersion: user.tokenVersion,
        };
      },
    }),

    ...socialAuthProviders(),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!account || (account.type !== "oauth" && account.type !== "oidc")) return true;

      const definition = socialProviderDefinition(account.provider);
      const email = (user?.email ?? profile?.email ?? "").trim().toLowerCase();
      // Without an address we can neither match nor create an account.
      if (!email) return "/login?error=SocialNoEmail";

      // Where the provider tells us whether it verified the address, insist that it did.
      const claims = profile as { email_verified?: boolean; verified?: boolean } | undefined;
      if (claims?.email_verified === false || claims?.verified === false) {
        return "/login?error=SocialEmailUnverified";
      }

      const existing = await prisma.user.findUnique({
        where: { email },
        select: { id: true, suspended: true, twoFAEnabled: true, twoFASecret: true },
      });
      if (!existing) return true; // brand-new account — the adapter creates it

      if (existing.suspended) return "/login?error=AccountSuspended";

      // Linking a provider from Settings while already signed in as this same
      // user — the second factor was satisfied at that sign-in, so let it through.
      const current = await auth();
      const alreadySignedIn = current?.user?.id === existing.id;

      // Otherwise two-factor stays mandatory: never mint a session straight off
      // an OAuth callback for an account that asked for a second factor.
      if (!alreadySignedIn && existing.twoFAEnabled && existing.twoFASecret) {
        await issueTwoFactorChallenge({
          userId: existing.id,
          provider: account.provider,
          accountType: account.type,
          providerAccountId: account.providerAccountId,
        });
        return "/login/2fa";
      }

      if (definition?.verifiesEmail) await markEmailVerified(existing.id);
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        const seed = user as { id: string; role?: UserRole; tokenVersion?: number };
        token.id = seed.id;
        token.role = seed.role;
        token.tokenVersion = seed.tokenVersion;
      }
      // On every request: enforce global revocation + suspension, and refresh role
      // + email-verified state so admin demotion / suspension take effect immediately.
      if (token.id) {
        const db = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { tokenVersion: true, emailVerified: true, suspended: true, role: true },
        });
        if (!db) return null; // account gone
        if (db.suspended) return null; // suspended mid-session → force logout
        // A fresh OAuth sign-in hands us an adapter user that may predate this
        // field; adopt the current version rather than reading it as revoked.
        if (typeof token.tokenVersion !== "number") token.tokenVersion = db.tokenVersion;
        if (db.tokenVersion !== token.tokenVersion) return null; // signed out everywhere
        token.emailVerified = Boolean(db.emailVerified);
        token.role = db.role; // reflect role changes (e.g. admin demotion) on the next request
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
        session.user.isEmailVerified = Boolean(token.emailVerified);
      }
      return session;
    },
  },
  events: {
    // Fires on a first-time social sign-up. Password sign-ups are provisioned in
    // /api/auth/register instead.
    async createUser({ user }) {
      if (!user.id) return;
      try {
        // Auth.js also fires this when linking a provider to an account that
        // already exists, so skip anyone already holding wallets — otherwise
        // they'd collect a second "welcome" every time they link a provider.
        if ((await prisma.wallet.count({ where: { userId: user.id } })) > 0) return;
        await ensureWallets(user.id);
        await notify(user.id, {
          type: "SYSTEM",
          title: "Welcome to OKNexus",
          body: "Your account is ready. Fund your wallet to start trading.",
          href: "/wallet",
        });
      } catch (err) {
        // Never fail the sign-in over provisioning; wallets are re-seeded lazily.
        console.error("Social sign-up provisioning failed", err);
      }
    },
    async linkAccount({ user, account, profile }) {
      if (!user.id) return;
      // `verifiesEmail` governs whether we'd auto-link on email alone — a stricter
      // question than whether *this* address is verified, which some providers
      // (Discord) state outright even though we won't auto-link them.
      const claims = profile as { email_verified?: boolean; verified?: boolean } | undefined;
      const verified =
        socialProviderDefinition(account.provider)?.verifiesEmail === true ||
        claims?.email_verified === true ||
        claims?.verified === true;
      if (verified) await markEmailVerified(user.id);
    },
  },
});
