import { Activity } from "lucide-react";

export type ActivityRow = {
  id: string;
  type: string;
  symbol: string;
  delta: string;
  memo: string | null;
  createdAt: number;
};

const TYPE_COLORS: Record<string, string> = {
  DEPOSIT: "var(--color-up)",
  SWAP: "var(--color-accent)",
  SPOT: "#f5b942",
  WITHDRAWAL: "var(--color-down)",
  RAMP: "var(--color-up)",
  TRANSFER: "var(--color-accent)",
  STAKE: "#22d3ee",
};

export function RecentActivity({ events }: { events: ActivityRow[] }) {
  const hasEvents = events.length > 0;

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/40 overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
        <h3 className="font-semibold text-[var(--color-foreground)]">Recent Activity</h3>
      </div>

      {!hasEvents ? (
        <div className="p-8 text-center">
          <Activity className="mx-auto h-8 w-8 text-[var(--color-muted)]" />
          <p className="mt-2 text-sm text-[var(--color-muted)]">No activity yet. Your transactions will appear here.</p>
        </div>
      ) : (
        <div className="divide-y divide-[var(--color-border)]">
          {events.map((e) => {
            const color = TYPE_COLORS[e.type] ?? "var(--color-muted)";
            const isPositive = !e.delta.startsWith("-");
            return (
              <div key={e.id} className="flex items-center justify-between px-4 py-3 hover:bg-[var(--color-surface-2)]/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold"
                    style={{ backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`, color }}
                  >
                    {e.type.slice(0, 2)}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-[var(--color-foreground)]">
                      {e.type.charAt(0) + e.type.slice(1).toLowerCase()}
                    </div>
                    <div className="text-xs text-[var(--color-muted)]">
                      {new Date(e.createdAt).toLocaleDateString()} · {e.symbol}
                    </div>
                  </div>
                </div>
                <span className={`text-sm font-medium ${isPositive ? "text-[var(--color-up)]" : "text-[var(--color-down)]"}`}>
                  {isPositive ? "+" : ""}{e.delta} {e.symbol}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
