import { getPayoutConfig, payoutConfigured } from "@/lib/ramp/bitnob-payout";

/** Banks, limits and the beneficiary field spec for the NGN off-ramp. */
export async function GET() {
  if (!payoutConfigured()) {
    return Response.json({ configured: false, config: null });
  }
  try {
    return Response.json({ configured: true, config: await getPayoutConfig() });
  } catch (e) {
    // A provider outage shouldn't 500 the page — the UI hides the panel instead.
    return Response.json({ configured: false, config: null, error: (e as Error).message });
  }
}
