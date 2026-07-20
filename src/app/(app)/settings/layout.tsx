"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  User,
  ShieldCheck,
  BadgeCheck,
  CreditCard,
  Settings,
  Bell,
  LifeBuoy,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/settings", label: "Profile", icon: User },
  { href: "/settings/security", label: "Security", icon: ShieldCheck },
  { href: "/kyc", label: "Verification & Limits", icon: BadgeCheck },
  { href: "/settings/payment-methods", label: "Payment Methods", icon: CreditCard },
  { href: "/settings/preferences", label: "Preferences", icon: Settings },
  { href: "/settings/notifications", label: "Notifications", icon: Bell },
  { href: "/settings/support", label: "Support", icon: LifeBuoy },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-full flex-col md:flex-row overflow-hidden">
      {/* Sidebar */}
      <aside className="w-full shrink-0 border-r border-[var(--color-border)] bg-[var(--color-surface)]/30 md:w-64 md:flex-col flex overflow-x-auto md:overflow-y-auto [&::-webkit-scrollbar]:hidden">
        <div className="p-4 hidden md:block">
          <h2 className="text-lg font-semibold text-[var(--color-foreground)]">Settings</h2>
          <p className="mt-1 text-xs text-[var(--color-muted)]">Manage your account preferences</p>
        </div>
        <nav className="flex md:flex-col gap-1 p-3 md:p-3">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== "/settings");
            // For the root /settings route, exact match is required
            const isExactActive = item.href === "/settings" ? pathname === "/settings" : isActive;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors shrink-0",
                  isExactActive
                    ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
                    : "text-[var(--color-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)]"
                )}
              >
                <item.icon className={cn("h-4 w-4", isExactActive ? "text-[var(--color-accent)]" : "text-[var(--color-muted)]")} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-[var(--color-background)]">
        {children}
      </main>
    </div>
  );
}
