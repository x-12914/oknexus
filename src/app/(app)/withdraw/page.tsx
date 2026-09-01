import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { WithdrawPanel } from "@/components/custody/WithdrawPanel";
import { NgnPayoutPanel } from "@/components/ramp/NgnPayoutPanel";
import { CorridorPayoutPanel } from "@/components/ramp/CorridorPayoutPanel";
import { PayoutHistory } from "@/components/ramp/PayoutHistory";

export default async function WithdrawPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return (
    <div className="h-full space-y-6 overflow-y-auto">
      <WithdrawPanel />
      {/* Renders nothing unless the payout provider is reachable and configured,
          so it stays invisible in local dev and during a provider outage. */}
      <NgnPayoutPanel />
      {/* Every other corridor the provider serves. Separate from the naira
          panel on purpose: that one is proven, these are not. */}
      <CorridorPayoutPanel />
      <PayoutHistory />
    </div>
  );
}
