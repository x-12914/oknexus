import { healthReport } from "@/lib/monitoring";

export const dynamic = "force-dynamic";

/**
 * Uptime endpoint for an external monitor.
 *
 * Unauthenticated on purpose so a third-party checker can poll it, and it
 * deliberately leaks nothing: counts and titles only, never balances, user data
 * or provider errors. 503 when anything critical is firing, which is what turns
 * a silent failure into a phone call.
 */
export async function GET() {
  try {
    const r = await healthReport();
    return Response.json(
      {
        status: r.ok ? "ok" : "degraded",
        lastCronAt: r.lastCronAt,
        cronStale: r.cronStale,
        critical: r.critical.map((c) => c.title),
        warnings: r.warnings.map((w) => w.title),
      },
      { status: r.ok ? 200 : 503 },
    );
  } catch {
    // If we can't even read our own state, we are not healthy.
    return Response.json({ status: "down" }, { status: 503 });
  }
}
