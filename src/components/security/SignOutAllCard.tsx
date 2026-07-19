"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { LogOut, Loader2 } from "lucide-react";

export function SignOutAllCard() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signOutAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/logout-all", { method: "POST" });
      if (!res.ok) {
        setError("Could not sign out other devices. Please try again.");
        setLoading(false);
        return;
      }
      // This session's token is now stale too — end it cleanly and return to login.
      await signOut({ callbackUrl: "/login" });
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl glass p-6">
      <h2 className="text-lg font-semibold">Active sessions</h2>
      <p className="mt-1 text-sm text-[var(--color-muted)]">
        Sign out of OKNexus on every device, including this one. Use this if you&apos;ve lost a
        device or think someone else has access — you&apos;ll simply sign in again.
      </p>
      {error ? <div className="mt-3 text-sm text-[var(--color-down)]">{error}</div> : null}
      <button
        type="button"
        onClick={signOutAll}
        disabled={loading}
        className="mt-4 inline-flex items-center gap-2 rounded-lg border border-[var(--color-down)]/40 px-4 py-2 text-sm font-medium text-[var(--color-down)] hover:bg-[var(--color-down)]/10 disabled:opacity-60"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
        Sign out of all devices
      </button>
    </div>
  );
}
