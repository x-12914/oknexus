"use client";

import { useState } from "react";
import { Check } from "lucide-react";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setDone(true);
  };

  if (done) {
    return (
      <div className="flex items-center gap-2 text-sm text-[var(--color-up)]">
        <Check className="h-4 w-4" /> You&rsquo;re on the list — we&rsquo;ll be in touch.
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex w-full max-w-sm items-center gap-2">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@email.com"
        className="min-w-0 flex-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm outline-none focus:border-[var(--color-accent)]"
      />
      <button
        type="submit"
        className="spectrum-bg shrink-0 rounded-full px-4 py-2.5 text-sm font-semibold"
      >
        Subscribe
      </button>
    </form>
  );
}
