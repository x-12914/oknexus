import { Coins } from "lucide-react";

export type AssetRow = {
  symbol: string;
  available: string;
  locked: string;
};

export function AssetList({ assets }: { assets: AssetRow[] }) {
  const hasAssets = assets.length > 0;

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/40 overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
        <h3 className="font-semibold text-[var(--color-foreground)]">My Assets</h3>
        <span className="text-xs text-[var(--color-muted)]">{assets.length} asset{assets.length !== 1 ? "s" : ""}</span>
      </div>

      {!hasAssets ? (
        <div className="p-8 text-center">
          <Coins className="mx-auto h-8 w-8 text-[var(--color-muted)]" />
          <p className="mt-2 text-sm text-[var(--color-muted)]">No assets yet. Make your first deposit to get started.</p>
        </div>
      ) : (
        <div className="divide-y divide-[var(--color-border)]">
          {/* Header */}
          <div className="grid grid-cols-3 px-4 py-2.5 text-xs font-medium text-[var(--color-muted)]">
            <span>Asset</span>
            <span className="text-right">Available</span>
            <span className="text-right">Locked</span>
          </div>
          {/* Rows */}
          {assets.map((a) => (
            <div key={a.symbol} className="grid grid-cols-3 px-4 py-3 text-sm hover:bg-[var(--color-surface-2)]/50 transition-colors">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-accent)]/10">
                  <span className="text-[10px] font-bold text-[var(--color-accent)]">{a.symbol.slice(0, 2)}</span>
                </div>
                <span className="font-medium text-[var(--color-foreground)]">{a.symbol}</span>
              </div>
              <span className="text-right text-[var(--color-foreground)]">{a.available}</span>
              <span className="text-right text-[var(--color-muted)]">{a.locked}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
