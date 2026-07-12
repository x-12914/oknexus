"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CandlestickChart,
  ArrowLeftRight,
  CreditCard,
  Briefcase,
  Users,
  LayoutDashboard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/Logo";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/trade/BTC-USDT", label: "Spot Trading", icon: CandlestickChart, match: "/trade" },
  { href: "/swap", label: "Instant Swap", icon: ArrowLeftRight },
  { href: "/buy", label: "Buy Crypto", icon: CreditCard },
  { href: "/otc", label: "OTC Desk", icon: Briefcase },
  { href: "/p2p", label: "P2P Trading", icon: Users },
] as const;

export function SideNav() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:w-56 shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="px-5 py-4 border-b border-[var(--color-border)]">
        <Link href="/">
          <Logo />
        </Link>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {NAV.map((item) => {
          const { href, label, icon: Icon } = item;
          const match = "match" in item ? item.match : undefined;
          const prefix = match ?? href;
          const active = pathname === href || pathname.startsWith(prefix);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-[rgba(139,92,246,0.14)] text-[var(--color-foreground)] ring-1 ring-inset ring-[rgba(139,92,246,0.35)]"
                  : "text-[var(--color-muted)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-surface-2)]",
              )}
            >
              <Icon className={cn("h-4 w-4", active && "text-[var(--color-accent)]")} />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-[var(--color-border)] text-xs text-[var(--color-muted)]">
        <div>v0.1 · Live market data</div>
      </div>
    </aside>
  );
}
