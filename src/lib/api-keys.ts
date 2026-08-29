import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { notify } from "@/lib/notifications";
import { encryptSecret } from "@/lib/totp";

/**
 * Programmatic access keys.
 *
 * Only a SHA-256 hash is stored. The plaintext is returned once, at creation,
 * and cannot be recovered afterwards — a key we can show on demand is a key an
 * attacker can read out of our database.
 *
 * Permissions default to read-only. Trading and withdrawal are opt-in, so a
 * leaked key created for price data can't move funds.
 */
const PREFIX = "okx_";

export class ApiKeyError extends Error {}

/**
 * Whether API keys can be issued.
 *
 * Off until something actually authenticates with them. resolveApiKey() exists
 * but no route calls it, so a key issued today opens no doors — while the UI
 * offers a "can withdraw" scope that implies it moves money. Handing someone a
 * credential that does nothing, and warning them it is dangerous, is worse than
 * not offering it: it teaches them the warning is noise.
 */
export function apiKeysEnabled(): boolean {
  return process.env.ENABLE_API_KEYS === "true";
}

export interface ApiKeyView {
  id: string;
  label: string;
  prefix: string;
  canTrade: boolean;
  canWithdraw: boolean;
  lastUsedAt: number | null;
  createdAt: number;
}

const hash = (key: string) => createHash("sha256").update(key).digest("hex");

export async function listApiKeys(userId: string): Promise<ApiKeyView[]> {
  const rows = await prisma.apiKey.findMany({
    where: { userId, revokedAt: null },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((r) => ({
    id: r.id,
    label: r.label,
    prefix: r.prefix,
    canTrade: r.canTrade,
    canWithdraw: r.canWithdraw,
    lastUsedAt: r.lastUsedAt?.getTime() ?? null,
    createdAt: r.createdAt.getTime(),
  }));
}

export async function createApiKey(
  userId: string,
  label: string,
  perms: { canTrade?: boolean; canWithdraw?: boolean } = {},
): Promise<{ key: string; secret: string; view: ApiKeyView }> {
  if (!apiKeysEnabled()) {
    throw new ApiKeyError("API access isn't available yet.");
  }
  const existing = await prisma.apiKey.count({ where: { userId, revokedAt: null } });
  if (existing >= 10) throw new ApiKeyError("You can have at most 10 active keys.");

  const key = PREFIX + randomBytes(24).toString("hex");
  // The signing secret. Encrypted, not hashed: verifying an HMAC needs the
  // original back. Returned once here and never retrievable again.
  const secret = randomBytes(32).toString("hex");
  const row = await prisma.apiKey.create({
    data: {
      userId,
      label: label.trim().slice(0, 60) || "API key",
      keyHash: hash(key),
      prefix: key.slice(0, PREFIX.length + 6),
      secretEnc: encryptSecret(secret),
      canTrade: Boolean(perms.canTrade),
      // Withdrawal over the API is deliberately not offered. Moving funds
      // programmatically needs an IP allowlist and a withdrawal-address
      // whitelist to be responsible, and neither exists yet. A key that cannot
      // withdraw cannot drain an account if it leaks.
      canWithdraw: false,
    },
  });

  await notify(userId, {
    type: "SECURITY",
    title: "API key created",
    body: `A new API key "${row.label}" was created. If this wasn't you, revoke it now.`,
    href: "/settings/api-keys",
  });

  return {
    key,
    secret,
    view: {
      id: row.id,
      label: row.label,
      prefix: row.prefix,
      canTrade: row.canTrade,
      canWithdraw: row.canWithdraw,
      lastUsedAt: null,
      createdAt: row.createdAt.getTime(),
    },
  };
}

/** Revocation is a soft delete so the audit trail keeps the record. */
export async function revokeApiKey(userId: string, id: string): Promise<void> {
  const res = await prisma.apiKey.updateMany({
    where: { id, userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (res.count === 0) throw new ApiKeyError("Key not found.");
}

/**
 * Resolve a presented key to its row, signing secret included.
 *
 * Used by the request-signing layer. Returns null for unknown or revoked keys,
 * so a caller cannot tell those two cases apart.
 */
export async function resolveApiKeyRow(presented: string) {
  if (!presented.startsWith(PREFIX)) return null;
  const row = await prisma.apiKey.findUnique({ where: { keyHash: hash(presented) } });
  if (!row || row.revokedAt) return null;
  // Best-effort: a failed timestamp update must not reject a valid key.
  prisma.apiKey
    .update({ where: { id: row.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {});
  return row;
}
