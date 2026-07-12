import { BadgeCheck, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import type { P2PMerchant } from "@/lib/exchange/types";

export function MerchantBadge({
  merchant,
  size = "md",
}: {
  merchant: P2PMerchant;
  size?: "sm" | "md";
}) {
  const initial = merchant.name.charAt(0).toUpperCase();
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="relative shrink-0">
        <div
          className={cn(
            "grid place-items-center rounded-full bg-[var(--color-surface-2)] border border-[var(--color-border)] font-semibold",
            size === "sm" ? "h-7 w-7 text-xs" : "h-9 w-9 text-sm",
          )}
        >
          {initial}
        </div>
        <span
          className={cn(
            "absolute -bottom-0 -right-0 h-2.5 w-2.5 rounded-full border-2 border-[var(--color-surface)]",
            merchant.online ? "bg-[var(--color-up)]" : "bg-[var(--color-muted)]",
          )}
        />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-1">
          <span className="font-medium truncate">{merchant.name}</span>
          {merchant.verified ? (
            <BadgeCheck className="h-4 w-4 text-[var(--color-accent)] shrink-0" />
          ) : null}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-[var(--color-muted)]">
          <span>{merchant.completedTrades.toLocaleString()} trades</span>
          <span>·</span>
          <span>{merchant.completionRatePct}%</span>
          <span className="inline-flex items-center gap-0.5">
            <Star className="h-3 w-3 fill-current text-amber-400" />
            {merchant.rating}
          </span>
        </div>
      </div>
    </div>
  );
}
