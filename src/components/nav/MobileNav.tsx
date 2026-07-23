"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Settings, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV } from "./SideNav";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="md:hidden flex items-center">
      <button
        onClick={() => setOpen(!open)}
        className="p-2 -ml-2 rounded-md text-[var(--color-muted)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-surface-2)]"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {open && (
        <div className="absolute top-14 left-0 w-full bg-[var(--color-surface)] border-b border-[var(--color-border)] shadow-lg z-50 flex flex-col max-h-[calc(100vh-3.5rem)] overflow-y-auto">
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
                  onClick={() => setOpen(false)}
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
          <div className="p-3 border-t border-[var(--color-border)] space-y-2">
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                pathname.startsWith("/settings")
                  ? "bg-[rgba(139,92,246,0.14)] text-[var(--color-foreground)] ring-1 ring-inset ring-[rgba(139,92,246,0.35)]"
                  : "text-[var(--color-muted)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-surface-2)]",
              )}
            >
              <Settings className={cn("h-4 w-4", pathname.startsWith("/settings") && "text-[var(--color-accent)]")} />
              Settings
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
