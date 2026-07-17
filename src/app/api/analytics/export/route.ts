import { LedgerAccount } from "@prisma/client";
import { sessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";

function csvCell(s: string): string {
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// Download the signed-in user's activity statement as CSV.
export async function GET() {
  const userId = await sessionUserId();
  if (!userId) return new Response("Not signed in", { status: 401 });

  const rows = await prisma.ledgerEntry.findMany({
    where: { userId, account: LedgerAccount.AVAILABLE },
    orderBy: { createdAt: "desc" },
    take: 10000,
  });

  const header = "Date,Type,Symbol,Amount,BalanceAfter,Memo";
  const body = rows.map((r) =>
    [
      r.createdAt.toISOString(),
      r.type,
      r.symbol,
      Number(r.delta),
      Number(r.balanceAfter),
      csvCell(r.memo ?? ""),
    ].join(","),
  );
  const csv = [header, ...body].join("\n");

  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="oknexus-activity.csv"',
    },
  });
}
