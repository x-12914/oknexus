"use client";

import { api } from "@/lib/api-client";
import { usePolling } from "@/hooks/usePolling";
import { cn, formatPrice, formatQty } from "@/lib/utils";

export function OpenOrders({
  pair,
  refreshToken,
}: {
  pair: string;
  refreshToken: number;
}) {
  const { data, refresh } = usePolling(
    () => api.openOrders(pair),
    3000,
    [pair, refreshToken],
  );
  const orders = data?.orders ?? [];
  const loading = data === null;

  const cancel = async (id: string) => {
    await api.cancelOrder(id);
    refresh();
  };

  return (
    <div className="h-full flex flex-col bg-[var(--color-surface)]">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--color-border)]">
        <div className="text-sm font-medium">Open Orders ({orders.length})</div>
        {loading ? <div className="text-xs text-[var(--color-muted)]">refreshing…</div> : null}
      </div>
      {orders.length === 0 ? (
        <div className="flex-1 grid place-items-center text-sm text-[var(--color-muted)]">
          No open orders. Place a limit order to see it here.
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
          <table className="w-full text-xs">
            <thead className="text-[10px] uppercase tracking-wider text-[var(--color-muted)] sticky top-0 bg-[var(--color-surface)]">
              <tr>
                <th className="text-left px-3 py-2">Pair</th>
                <th className="text-left px-3 py-2">Side</th>
                <th className="text-left px-3 py-2">Type</th>
                <th className="text-right px-3 py-2">Price</th>
                <th className="text-right px-3 py-2">Amount</th>
                <th className="text-right px-3 py-2">Filled</th>
                <th className="text-right px-3 py-2">Time</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-t border-[var(--color-border)]">
                  <td className="px-3 py-2">{o.symbol}</td>
                  <td className={cn("px-3 py-2 font-medium", o.side === "BUY" ? "text-[var(--color-up)]" : "text-[var(--color-down)]")}>
                    {o.side}
                  </td>
                  <td className="px-3 py-2 text-[var(--color-muted)]">{o.type}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {o.price != null ? formatPrice(o.price, 2) : "MKT"}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatQty(o.quantity, 6)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatQty(o.filledQty, 6)}</td>
                  <td className="px-3 py-2 text-right text-[var(--color-muted)]">
                    {new Date(o.createdAt).toLocaleTimeString()}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => cancel(o.id)}
                      className="text-xs text-[var(--color-muted)] hover:text-[var(--color-down)]"
                    >
                      Cancel
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
