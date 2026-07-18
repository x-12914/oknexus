import "server-only";
import crypto from "crypto";
import { LedgerType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { withLedger, credit, debit, quantize, InsufficientBalanceError } from "@/lib/ledger";
import { notify } from "@/lib/notifications";

/** A user-facing problem with a transfer (bad recipient, insufficient funds, …). */
export class TransferError extends Error {}

export interface TransferResult {
  symbol: string;
  amount: number;
  toEmail: string;
  toName: string | null;
}

/**
 * Send available balance to another OKNexus user by email. The debit and credit
 * happen in one ledger transaction, so funds can never be lost or duplicated —
 * and the debit's `gte` guard means the sender can't overdraw under concurrency.
 */
export async function sendInternalTransfer(
  fromUserId: string,
  toEmailRaw: string,
  symbol: string,
  amount: number,
  note?: string,
): Promise<TransferResult> {
  const toEmail = toEmailRaw.trim().toLowerCase();
  if (!toEmail) throw new TransferError("Enter the recipient's email.");
  amount = quantize(amount);
  if (!(amount > 0)) throw new TransferError("Enter an amount greater than zero.");

  const [sender, recipient] = await Promise.all([
    prisma.user.findUnique({ where: { id: fromUserId }, select: { email: true } }),
    prisma.user.findUnique({
      where: { email: toEmail },
      select: { id: true, email: true, name: true },
    }),
  ]);
  if (!recipient) throw new TransferError("No OKNexus account uses that email.");
  if (recipient.id === fromUserId) throw new TransferError("You can't send to your own account.");

  const cleanNote = note?.trim().slice(0, 120) || undefined;
  const senderEmail = sender?.email ?? "another user";
  const refId = crypto.randomUUID(); // links the two legs of this one transfer

  try {
    await withLedger(async (tx) => {
      await debit(tx, fromUserId, symbol, amount, {
        type: LedgerType.TRANSFER,
        refId,
        memo: `Sent to ${recipient.email}${cleanNote ? ` · ${cleanNote}` : ""}`,
      });
      await credit(tx, recipient.id, symbol, amount, {
        type: LedgerType.TRANSFER,
        refId,
        memo: `Received from ${senderEmail}${cleanNote ? ` · ${cleanNote}` : ""}`,
      });
    });
  } catch (e) {
    if (e instanceof InsufficientBalanceError) {
      throw new TransferError(`Insufficient ${symbol} balance.`);
    }
    throw e;
  }

  // Tell the recipient they've been paid (best-effort).
  await notify(recipient.id, {
    type: "TRANSFER",
    title: "Payment received",
    body: `You received ${amount} ${symbol} from ${senderEmail}.`,
    href: "/wallet",
  });

  return { symbol, amount, toEmail: recipient.email, toName: recipient.name };
}
