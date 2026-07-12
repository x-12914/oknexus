import { ComingSoon } from "@/components/ComingSoon";

export default function DashboardPage() {
  return (
    <ComingSoon
      title="Dashboard"
      description="Your portfolio, PnL, open orders, and recent activity in one view. Wire it up once the wallet and auth modules land."
      bullets={[
        "Total balance in fiat with 24h change",
        "Per-asset breakdown chart",
        "Open orders and recent fills",
        "Active P2P trades and dispute status",
      ]}
    />
  );
}
