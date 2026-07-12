import Link from "next/link";
import { Bell } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { UserMenu } from "./UserMenu";
import { WalletBadge } from "./WalletBadge";

export function TopBar({ userEmail }: { userEmail?: string }) {
  return (
    <header className="h-14 flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--topbar-bg)] backdrop-blur-xl px-4">
      <div className="flex items-center gap-2 text-sm text-[var(--color-muted)]">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-up)] opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--color-up)]" />
        </span>
        <span className="hidden sm:inline">Live market data —</span>{" "}
        <span className="text-[var(--color-foreground)]">Binance</span>
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        {userEmail ? (
          <>
            <WalletBadge />
            <button
              type="button"
              aria-label="Notifications"
              className="p-2 rounded-md hover:bg-[var(--color-surface-2)] text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
            >
              <Bell className="h-4 w-4" />
            </button>
            <UserMenu email={userEmail} />
          </>
        ) : (
          <>
            <Link
              href="/login"
              className="rounded-md px-3 py-1.5 text-sm text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
            >
              Log in
            </Link>
            <Link
              href="/register"
              className="btn-brand rounded-md px-3 py-1.5 text-sm font-medium"
            >
              Sign up
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
