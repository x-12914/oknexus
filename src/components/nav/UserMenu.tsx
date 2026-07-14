"use client";

import { useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { ChevronDown, LogOut, ShieldCheck, Cog } from "lucide-react";

export function UserMenu({ email, isAdmin }: { email?: string; isAdmin?: boolean }) {
  const [open, setOpen] = useState(false);
  const initial = (email ?? "U").charAt(0).toUpperCase();
  const itemCls =
    "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-[var(--color-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)]";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2 py-1.5 text-sm hover:bg-[var(--color-border)]"
      >
        <div className="h-6 w-6 rounded-full bg-brand-gradient text-white grid place-items-center text-xs font-bold">
          {initial}
        </div>
        <span className="hidden max-w-[160px] truncate sm:inline">{email}</span>
        <ChevronDown className="h-3 w-3 text-[var(--color-muted)]" />
      </button>
      {open ? (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute right-0 z-20 mt-1 w-48 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-1 shadow-xl">
            <Link href="/kyc" onClick={() => setOpen(false)} className={itemCls}>
              <ShieldCheck className="h-4 w-4" /> Verify identity
            </Link>
            {isAdmin ? (
              <Link href="/admin" onClick={() => setOpen(false)} className={itemCls}>
                <Cog className="h-4 w-4" /> Admin console
              </Link>
            ) : null}
            <button type="button" onClick={() => signOut({ callbackUrl: "/" })} className={itemCls}>
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
