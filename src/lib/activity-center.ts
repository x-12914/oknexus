import "server-only";
import { prisma } from "@/lib/db";
import type { ActivityKind, ActivityRecord } from "@/lib/activity-types";

/**
 * One activity record for every kind of transaction on the platform.
 *
 * Each product wrote to its own table — orders, trades, deposits, withdrawals,
 * swaps, OTC, P2P, fiat payouts, transfers — so answering "what happened on my
 * account?" meant visiting seven screens. This normalises them into a single
 * shape that can be filtered, sorted, searched and exported together.
 *
 * Deliberately reads the domain tables rather than the ledger: the ledger records
 * money moving, but not that an order was cancelled or a withdrawal rejected,
 * and those are exactly the entries people go looking for.
 */

export const ACTIVITY_KINDS: { id: ActivityKind; label: string }[] = [
  { id: "order", label: "Orders" },
  { id: "trade", label: "Trades" },
  { id: "deposit", label: "Deposits" },
  { id: "withdrawal", label: "Withdrawals" },
  { id: "swap", label: "Swaps" },
  { id: "otc", label: "OTC" },
  { id: "p2p", label: "P2P" },
  { id: "fiat", label: "Fiat" },
  { id: "transfer", label: "Transfers" },
];

export interface ActivityQuery {
  kinds?: ActivityKind[];
  status?: string;
  /** Free text over asset, status, reference and the summary line. */
  q?: string;
  from?: number;
  to?: number;
  sort?: "newest" | "oldest";
  limit?: number;
  offset?: number;
}

const n = (v: unknown) => Number(v ?? 0);

async function collect(userId: string): Promise<ActivityRecord[]> {
  const [orders, trades, deposits, withdrawals, swaps, otc, p2p, payouts, ramps, transfers] =
    await Promise.all([
      prisma.order.findMany({ where: { userId }, include: { market: true } }),
      prisma.trade.findMany({ where: { userId }, include: { market: true } }),
      prisma.deposit.findMany({ where: { userId } }),
      prisma.withdrawal.findMany({ where: { userId } }),
      prisma.swapTx.findMany({ where: { userId } }),
      prisma.otcTrade.findMany({ where: { userId } }),
      prisma.p2POrder.findMany({ where: { userId } }),
      prisma.fiatPayout.findMany({ where: { userId } }),
      prisma.rampTx.findMany({ where: { userId } }),
      // Internal transfers only exist as ledger legs, so they're read from there.
      prisma.ledgerEntry.findMany({ where: { userId, type: "TRANSFER" } }),
    ]);

  const out: ActivityRecord[] = [];

  for (const o of orders)
    out.push({
      id: o.id,
      kind: "order",
      status: o.status,
      createdAt: o.createdAt.getTime(),
      asset: o.market.symbol,
      amount: n(o.quantity),
      detail: `${o.side} ${o.type} ${n(o.quantity)} ${o.market.baseSymbol}${o.price ? ` @ ${n(o.price)}` : ""}`,
      reference: o.id,
    });

  for (const t of trades)
    out.push({
      id: t.id,
      kind: "trade",
      status: "FILLED",
      createdAt: t.createdAt.getTime(),
      asset: t.market.symbol,
      amount: n(t.quantity),
      fee: n(t.fee),
      feeAsset: t.feeSymbol ?? undefined,
      detail: `${t.side} ${n(t.quantity)} ${t.market.baseSymbol} @ ${n(t.price)}`,
      reference: t.orderId,
    });

  for (const d of deposits)
    out.push({
      id: d.id,
      kind: "deposit",
      status: d.status,
      createdAt: d.createdAt.getTime(),
      asset: d.symbol,
      amount: n(d.amount),
      detail: `Deposit ${n(d.amount)} ${d.symbol} on ${d.chain}`,
      reference: d.txHash,
    });

  for (const w of withdrawals)
    out.push({
      id: w.id,
      kind: "withdrawal",
      status: w.status,
      createdAt: w.createdAt.getTime(),
      asset: w.symbol,
      amount: n(w.amount),
      fee: n(w.fee),
      feeAsset: w.symbol,
      detail: `Withdraw ${n(w.amount)} ${w.symbol} to ${w.toAddress.slice(0, 10)}…`,
      reference: w.txHash ?? w.id,
    });

  for (const s of swaps)
    out.push({
      id: s.id,
      kind: "swap",
      status: s.status,
      createdAt: s.createdAt.getTime(),
      asset: s.fromSymbol,
      amount: n(s.fromAmount),
      counterAsset: s.toSymbol,
      counterAmount: n(s.toAmount),
      fee: n(s.feeAmount),
      feeAsset: s.feeSymbol ?? undefined,
      detail: `Swap ${n(s.fromAmount)} ${s.fromSymbol} → ${n(s.toAmount)} ${s.toSymbol}`,
    });

  for (const o of otc)
    out.push({
      id: o.id,
      kind: "otc",
      status: o.status,
      createdAt: o.createdAt.getTime(),
      asset: o.baseSymbol,
      amount: n(o.baseAmount),
      counterAsset: o.settleCurrency,
      counterAmount: n(o.totalCost),
      detail: `OTC ${o.side} ${n(o.baseAmount)} ${o.baseSymbol} @ ${n(o.price)}`,
    });

  for (const o of p2p)
    out.push({
      id: o.id,
      kind: "p2p",
      status: o.status,
      createdAt: o.createdAt.getTime(),
      asset: o.asset,
      amount: n(o.assetAmount),
      counterAsset: o.fiat,
      counterAmount: n(o.fiatAmount),
      fee: n(o.fee),
      feeAsset: o.asset,
      detail: `P2P ${o.takerRole} ${n(o.assetAmount)} ${o.asset} for ${n(o.fiatAmount)} ${o.fiat}`,
    });

  for (const p of payouts)
    out.push({
      id: p.id,
      kind: "fiat",
      status: p.status,
      createdAt: p.createdAt.getTime(),
      asset: p.fromSymbol,
      amount: n(p.fromAmount),
      counterAsset: p.fiatCode,
      counterAmount: n(p.fiatAmount),
      fee: n(p.platformFee),
      feeAsset: p.fromSymbol,
      detail: `Bank payout ${n(p.fiatAmount)} ${p.fiatCode} to ${p.bankName}`,
      reference: p.providerQuoteId ?? undefined,
    });

  for (const r of ramps)
    out.push({
      id: r.id,
      kind: "fiat",
      status: r.status,
      createdAt: r.createdAt.getTime(),
      asset: r.cryptoSymbol,
      amount: n(r.cryptoAmount),
      counterAsset: r.fiatCode,
      counterAmount: n(r.fiatAmount),
      detail: `${r.side} ${n(r.cryptoAmount)} ${r.cryptoSymbol} for ${n(r.fiatAmount)} ${r.fiatCode}`,
    });

  for (const l of transfers) {
    const delta = n(l.delta);
    // Both legs of a transfer belong to the same user only on a self-send,
    // which is blocked — so the sign tells us the direction.
    out.push({
      id: l.id,
      kind: "transfer",
      status: "COMPLETED",
      createdAt: l.createdAt.getTime(),
      asset: l.symbol,
      amount: Math.abs(delta),
      detail: `${delta < 0 ? "Sent" : "Received"} ${Math.abs(delta)} ${l.symbol}${l.memo ? ` · ${l.memo}` : ""}`,
    });
  }

  return out;
}

export interface ActivityPage {
  records: ActivityRecord[];
  total: number;
}

export async function listActivity(
  userId: string,
  query: ActivityQuery = {},
): Promise<ActivityPage> {
  let rows = await collect(userId);

  if (query.kinds?.length) {
    const want = new Set(query.kinds);
    rows = rows.filter((r) => want.has(r.kind));
  }
  if (query.status) {
    const s = query.status.toUpperCase();
    rows = rows.filter((r) => r.status.toUpperCase() === s);
  }
  if (query.from) rows = rows.filter((r) => r.createdAt >= query.from!);
  if (query.to) rows = rows.filter((r) => r.createdAt <= query.to!);
  if (query.q) {
    const q = query.q.trim().toLowerCase();
    rows = rows.filter((r) =>
      [r.asset, r.counterAsset, r.status, r.detail, r.reference]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }

  rows.sort((a, b) =>
    query.sort === "oldest" ? a.createdAt - b.createdAt : b.createdAt - a.createdAt,
  );

  const total = rows.length;
  const offset = query.offset ?? 0;
  const limit = Math.min(query.limit ?? 50, 500);
  return { records: rows.slice(offset, offset + limit), total };
}

/** Everything matching the filter, unpaged, for export. */
export async function exportActivityCsv(userId: string, query: ActivityQuery = {}): Promise<string> {
  const { records } = await listActivity(userId, { ...query, limit: 5000, offset: 0 });
  const head = [
    "Date",
    "Type",
    "Status",
    "Asset",
    "Amount",
    "Counter asset",
    "Counter amount",
    "Fee",
    "Fee asset",
    "Details",
    "Reference",
  ];
  // Quote every field and double internal quotes — details contain commas.
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = records.map((r) =>
    [
      new Date(r.createdAt).toISOString(),
      r.kind,
      r.status,
      r.asset,
      r.amount,
      r.counterAsset ?? "",
      r.counterAmount ?? "",
      r.fee ?? "",
      r.feeAsset ?? "",
      r.detail,
      r.reference ?? "",
    ]
      .map(esc)
      .join(","),
  );
  return [head.map(esc).join(","), ...lines].join("\n");
}
