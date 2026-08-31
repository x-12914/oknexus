import type { NextRequest } from "next/server";
import { sessionUserId } from "@/lib/auth";
import { listCorridorOptions, getCorridorCountry } from "@/lib/ramp/corridor-config";

/**
 * Corridor discovery.
 *
 * Without `country`, lists every country and currency the payout provider
 * serves. With one, returns that country's full destination spec so the client
 * can render the exact fields it requires.
 *
 * Session-gated: each call hits a third party, and an open endpoint would let
 * anyone use us as a free proxy for their corridor data.
 */
export async function GET(req: NextRequest) {
  const userId = await sessionUserId();
  if (!userId) return Response.json({ error: "Please sign in to continue." }, { status: 401 });

  const country = req.nextUrl.searchParams.get("country");
  try {
    if (country) {
      return Response.json({ country: await getCorridorCountry(country) });
    }
    return Response.json({ corridors: await listCorridorOptions() });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}
