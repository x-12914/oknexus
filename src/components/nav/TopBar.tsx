"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";
import { UserMenu } from "./UserMenu";
import { WalletBadge } from "./WalletBadge";
import { NotificationBell } from "./NotificationBell";
import { cn } from "@/lib/utils";

import { MobileNav } from "./MobileNav";

export function TopBar({ userEmail, isAdmin }: { userEmail?: string; isAdmin?: boolean }) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let lastY = 0;
    const handleScroll = (e: Event) => {
      // Only apply auto-hide on mobile (<768px)
      if (window.innerWidth >= 768) {
        if (hidden) setHidden(false);
        return;
      }
      
      const target = e.target as HTMLElement;
      // We only care about vertical scroll positions
      const currentY = target.scrollTop;
      if (currentY === undefined) return;
      
      // If scrolling down past 50px, hide. If scrolling up, show.
      if (currentY > lastY && currentY > 50) {
        setHidden(true);
      } else if (currentY < lastY) {
        setHidden(false);
      }
      lastY = currentY;
    };
    
    // Use capture phase to catch scroll events from overflow-y-auto children
    window.addEventListener("scroll", handleScroll, true);
    return () => window.removeEventListener("scroll", handleScroll, true);
  }, [hidden]);

  return (
    <header 
      className={cn(
        "h-14 shrink-0 flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--topbar-bg)] backdrop-blur-xl px-4 relative z-50 transition-all duration-300 md:mt-0",
        hidden ? "-mt-14" : "mt-0"
      )}
    >
      <div className="flex-1">
        <MobileNav />
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        {userEmail ? (
          <>
            <WalletBadge />
            <NotificationBell />
            <UserMenu email={userEmail} isAdmin={isAdmin} />
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
