import "server-only";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import {
  bitnobConfigured,
  createCustomer,
  createVirtualAccount,
  findCustomerByEmail,
  updateCustomer,
  type BitnobCustomerInput,
} from "@/lib/bitnob";

/**
 * Provisioning a user's dedicated NGN account.
 *
 * The bank rail gives us no way to tell whose money just arrived: a transfer
 * carries the sender's details, not ours. A per-user account number is the
 * attribution mechanism — money landing in it is that user's, by construction.
 *
 * The BVN never touches our database. It is required by the provider to open
 * the account, so it passes through this module to their API and is then
 * dropped. We keep only the customer id they hand back. A BVN we do not hold is
 * a BVN we cannot leak, and holding one buys us nothing afterwards.
 */

export interface ProvisionInput {
  firstName: string;
  lastName: string;
  phone: string;
  /** YYYY-MM-DD */
  dateOfBirth: string;
  /** 11-digit Nigerian Bank Verification Number. Not persisted. */
  bvn: string;
}

export interface NgnAccountView {
  accountNumber: string;
  accountName: string;
  bankName: string;
  createdAt: number;
}

export class ProvisionError extends Error {}

const BVN_RE = /^\d{11}$/;
/** Nigerian numbers, with or without the +234 country code. */
const PHONE_RE = /^(\+?234|0)\d{10}$/;

export async function getNgnAccount(userId: string): Promise<NgnAccountView | null> {
  const a = await prisma.ngnAccount.findUnique({ where: { userId } });
  if (!a) return null;
  return {
    accountNumber: a.accountNumber,
    accountName: a.accountName,
    bankName: a.bankName,
    createdAt: a.createdAt.getTime(),
  };
}

/**
 * Create (or reuse) the provider customer, then attach an NGN account.
 *
 * Idempotent on our side: a user who already has an account gets it back rather
 * than a second one. Two account numbers for one user would make attribution
 * ambiguous in exactly the situation it exists to disambiguate.
 */
export async function provisionNgnAccount(
  userId: string,
  input: ProvisionInput,
): Promise<NgnAccountView> {
  if (!bitnobConfigured()) {
    throw new ProvisionError("Naira deposits aren't available right now.");
  }

  const existing = await getNgnAccount(userId);
  if (existing) return existing;

  if (!BVN_RE.test(input.bvn)) {
    throw new ProvisionError("A BVN is 11 digits. Please check and try again.");
  }
  if (!PHONE_RE.test(input.phone.replace(/[\s-]/g, ""))) {
    throw new ProvisionError("Enter a valid Nigerian phone number.");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.dateOfBirth)) {
    throw new ProvisionError("Enter your date of birth as YYYY-MM-DD.");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  if (!user?.email) throw new ProvisionError("Your account needs a verified email first.");

  const payload: BitnobCustomerInput = {
    email: user.email,
    first_name: input.firstName.trim(),
    last_name: input.lastName.trim(),
    phone_number: input.phone.replace(/[\s-]/g, ""),
    date_of_birth: input.dateOfBirth,
    bvn: input.bvn,
  };

  // A customer may already exist from an earlier attempt that failed at the
  // account step. Creating a second one for the same email would orphan the
  // first, so reuse and update instead.
  let customerId: string;
  const found = await findCustomerByEmail(user.email);
  if (found) {
    customerId = found.id;
    const upd = await updateCustomer(customerId, payload);
    if (!upd.ok) throw new ProvisionError(upd.error ?? "Couldn't verify those details.");
  } else {
    const created = await createCustomer(payload);
    const id = created.data?.data?.id;
    if (!created.ok || !id) {
      throw new ProvisionError(created.error ?? "Couldn't verify those details.");
    }
    customerId = id;
  }

  // Ties the provider's record to ours, and makes a retry after a network
  // failure resolve to the same account rather than opening another.
  const reference = `oknexus-ngn-${userId}`;

  const va = await createVirtualAccount(customerId, reference);
  const acct = va.data?.data;
  if (!va.ok || !acct) {
    throw new ProvisionError(va.error ?? "Couldn't open a naira account right now.");
  }

  await prisma.ngnAccount.create({
    data: {
      userId,
      bitnobCustomerId: customerId,
      bitnobAccountId: acct.id,
      accountNumber: acct.account_number,
      accountName: acct.account_name,
      bankName: acct.bank_name,
      reference,
    },
  });

  // Records that provisioning happened, and deliberately records nothing about
  // the identity documents that made it possible.
  await audit({
    actorId: userId,
    action: "ngn:provisioned",
    targetType: "ngnAccount",
    targetId: acct.id,
    metadata: { bank: acct.bank_name },
  });

  return {
    accountNumber: acct.account_number,
    accountName: acct.account_name,
    bankName: acct.bank_name,
    createdAt: Date.now(),
  };
}
