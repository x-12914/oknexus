import "server-only";
import { prisma } from "@/lib/db";
import { getChainAdapter, isChainEnabled } from "./registry";
import { notify } from "@/lib/notifications";
import type { WhitelistEntry } from "@/lib/custody-types";

export type { WhitelistEntry };

/**
 * Withdrawal address whitelist.
 *
 * Restricting withdrawals to saved addresses is only half the control. The half
 * that matters is the delay before a newly saved address can be used: an
 * attacker with a live session can always add their own address, so without a
 * waiting period the whitelist just adds a step to the theft. With one, the
 * owner gets a notification and a window to react.
 *
 * The delay is set at creation and never shortened — allowing it to be edited
 * would hand an attacker the bypass directly.
 */
const DELAY_HOURS = Number(process.env.WITHDRAW_WHITELIST_DELAY_HOURS ?? 24);

export class WhitelistError extends Error {}


function toEntry(r: {
  id: string;
  chain: string;
  address: string;
  label: string;
  activeFrom: Date;
  createdAt: Date;
}): WhitelistEntry {
  return {
    id: r.id,
    chain: r.chain,
    address: r.address,
    label: r.label,
    activeFrom: r.activeFrom.getTime(),
    usable: r.activeFrom.getTime() <= Date.now(),
    createdAt: r.createdAt.getTime(),
  };
}

export async function listWhitelist(userId: string): Promise<WhitelistEntry[]> {
  const rows = await prisma.withdrawalAddress.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toEntry);
}

export async function addWhitelistAddress(
  userId: string,
  chain: string,
  address: string,
  label: string,
): Promise<WhitelistEntry> {
  if (!isChainEnabled(chain)) throw new WhitelistError("Unsupported chain.");
  if (!getChainAdapter(chain).validateAddress(address)) {
    throw new WhitelistError("That doesn't look like a valid address for this network.");
  }
  const clean = label.trim().slice(0, 60) || "Saved address";

  const activeFrom = new Date(Date.now() + DELAY_HOURS * 3600 * 1000);
  try {
    const row = await prisma.withdrawalAddress.create({
      data: { userId, chain, address, label: clean, activeFrom },
    });
    // Telling the owner is the point of the delay — it is their chance to act
    // if they did not do this.
    await notify(userId, {
      type: "SECURITY",
      title: "Withdrawal address added",
      body: `${clean} was added to your whitelist and becomes usable in ${DELAY_HOURS}h. If this wasn't you, remove it and change your password now.`,
      href: "/settings/security",
    });
    return toEntry(row);
  } catch {
    throw new WhitelistError("That address is already saved.");
  }
}

/** Removal is immediate: taking an address away should never be delayed. */
export async function removeWhitelistAddress(userId: string, id: string): Promise<void> {
  const res = await prisma.withdrawalAddress.deleteMany({ where: { id, userId } });
  if (res.count === 0) throw new WhitelistError("Address not found.");
}

export async function setWhitelistOnly(userId: string, on: boolean): Promise<void> {
  await prisma.user.update({ where: { id: userId }, data: { whitelistOnly: on } });
  await notify(userId, {
    type: "SECURITY",
    title: on ? "Whitelist-only withdrawals on" : "Whitelist-only withdrawals off",
    body: on
      ? "Withdrawals can now only go to addresses you've saved."
      : "Withdrawals can now go to any address. Turn this back on for stronger protection.",
    href: "/settings/security",
  });
}

/**
 * Enforce the whitelist for a withdrawal, if the user has it switched on.
 *
 * Called from requestWithdrawal rather than the route so every caller is
 * covered, matching how the KYC and allowlist gates are enforced.
 */
export async function assertWithdrawalAllowed(
  userId: string,
  chain: string,
  address: string,
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { whitelistOnly: true },
  });
  if (!user?.whitelistOnly) return;

  const entry = await prisma.withdrawalAddress.findFirst({
    where: { userId, chain, address },
  });
  if (!entry) {
    throw new WhitelistError(
      "This address isn't on your withdrawal whitelist. Add it first, or turn the whitelist off.",
    );
  }
  if (entry.activeFrom.getTime() > Date.now()) {
    const hours = Math.ceil((entry.activeFrom.getTime() - Date.now()) / 3600_000);
    throw new WhitelistError(
      `That address was added recently and becomes usable in about ${hours}h.`,
    );
  }
}
