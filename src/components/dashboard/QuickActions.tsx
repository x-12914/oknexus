import Link from "next/link";
import { ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight, BarChart3 } from "lucide-react";

const ACTIONS = [
  { href: "/deposit",        label: "Deposit",  icon: ArrowDownToLine, color: "var(--color-up)" },
  { href: "/withdraw",       label: "Withdraw", icon: ArrowUpFromLine, color: "var(--color-down)" },
  { href: "/trade/BTC-USDT", label: "Trade",    icon: BarChart3,       color: "var(--color-accent)" },
  { href: "/convert",        label: "Convert",  icon: ArrowLeftRight,  color: "#f5b942" },
];

export function QuickActions() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {ACTIONS.map((a) => (
        <Link
          key={a.href}
          href={a.href}
          className="group flex flex-col items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/40 p-4 transition-all hover:border-[var(--color-accent)] hover:bg-[var(--color-surface)]/70 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[var(--color-accent)]/5"
        >
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full transition-transform group-hover:scale-110"
            style={{ backgroundColor: `color-mix(in srgb, ${a.color} 12%, transparent)`, color: a.color }}
          >
            <a.icon className="h-5 w-5" />
          </div>
          <span className="text-xs font-medium text-[var(--color-foreground)]">{a.label}</span>
        </Link>
      ))}
    </div>
  );
}
