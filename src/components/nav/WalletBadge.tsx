"use client";

import Link from "next/link";
import { Wallet } from "lucide-react";
import { api } from "@/lib/api-client";
import { usePolling } from "@/hooks/usePolling";

export function WalletBadge() {
  const { data } = usePolling(() => api.wallet(), 10000, []);
  const total = data?.totalUsd;

  return (
    <Link
      href="/wallet"
      className="hidden sm:inline-flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-1.5 text-sm hover:bg-[var(--color-border)]"
    >
      <Wallet className="h-4 w-4" />
      <span className="tabular-nums">
        {total != null
          ? `$${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          : "$—"}
      </span>
    </Link>
  );
}
