import { redirect } from "next/navigation";
import { sessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PortfolioSummary } from "@/components/dashboard/PortfolioSummary";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { AssetList, type AssetRow } from "@/components/dashboard/AssetList";
import { RecentActivity, type ActivityRow } from "@/components/dashboard/RecentActivity";
import { Decimal } from "@prisma/client/runtime/library";

// Rough USD exchange rates for portfolio estimation. In the future these will be
// replaced by a live price oracle.
const MOCK_USD_PRICES: Record<string, number> = {
  BTC: 67_500,
  ETH: 3_450,
  USDT: 1,
  USDC: 1,
  SOL: 155,
  BNB: 620,
  XRP: 0.52,
  DOGE: 0.12,
  ADA: 0.45,
  DOT: 7.2,
  MATIC: 0.72,
  LINK: 14.5,
  AVAX: 36,
  UNI: 9.8,
  LTC: 82,
};

function toNumber(d: Decimal): number {
  return parseFloat(d.toString());
}

export default async function DashboardPage() {
  const u = await sessionUser();
  if (!u) redirect("/login");

  const [wallets, recentLedger, user] = await Promise.all([
    prisma.wallet.findMany({
      where: { userId: u.id },
      orderBy: { symbol: "asc" },
    }),
    prisma.ledgerEntry.findMany({
      where: { userId: u.id },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.user.findUnique({
      where: { id: u.id },
      select: { name: true, email: true },
    }),
  ]);

  // Build asset list
  const assets: AssetRow[] = wallets
    .filter((w) => toNumber(w.balance) > 0 || toNumber(w.locked) > 0)
    .map((w) => ({
      symbol: w.symbol,
      available: toNumber(w.balance).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 8 }),
      locked: toNumber(w.locked).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 8 }),
    }));

  // Estimate total USD
  let totalUsd = 0;
  for (const w of wallets) {
    const bal = toNumber(w.balance) + toNumber(w.locked);
    const price = MOCK_USD_PRICES[w.symbol.toUpperCase()] ?? 0;
    totalUsd += bal * price;
  }
  const totalUsdStr = totalUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Build activity list
  const activity: ActivityRow[] = recentLedger.map((e) => ({
    id: e.id,
    type: e.type,
    symbol: e.symbol,
    delta: toNumber(e.delta).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 8 }),
    memo: e.memo,
    createdAt: e.createdAt.getTime(),
  }));

  const greeting = user?.name ? `Welcome back, ${user.name}` : "Welcome back";

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Greeting */}
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">{greeting}</h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">Here&apos;s an overview of your portfolio.</p>
        </div>

        {/* Top row: Portfolio + Quick Actions */}
        <div className="grid gap-6 lg:grid-cols-2">
          <PortfolioSummary totalUsd={totalUsdStr} />
          <div className="flex flex-col justify-center">
            <h3 className="mb-3 text-sm font-medium text-[var(--color-muted)]">Quick Actions</h3>
            <QuickActions />
          </div>
        </div>

        {/* Bottom row: Assets + Activity */}
        <div className="grid gap-6 lg:grid-cols-2">
          <AssetList assets={assets} />
          <RecentActivity events={activity} />
        </div>
      </div>
    </div>
  );
}
