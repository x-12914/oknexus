"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CreditCard,
  LifeBuoy,
  Search,
  ShieldCheck,
  Users,
  Wallet,
  Receipt,
  CandlestickChart,
} from "lucide-react";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { landingStyle } from "@/components/landing/landingStyle";

const CATEGORIES = [
  { icon: BookOpen, title: "Getting started", body: "Creating an account, verifying your identity, making your first deposit." },
  { icon: CandlestickChart, title: "Trading", body: "Spot trading, Instant Swap, the OTC Desk, and order types explained." },
  { icon: CreditCard, title: "Buying & selling", body: "Payment methods, limits and processing times." },
  { icon: Users, title: "P2P trading", body: "How escrow works, safety tips, and resolving disputes." },
  { icon: Wallet, title: "Wallet", body: "Deposits, withdrawals, Send, supported networks and transaction status." },
  { icon: ShieldCheck, title: "Account & security", body: "Two-factor authentication, device management, password resets." },
  { icon: Receipt, title: "Fees", body: "The full fee schedule by product, and how volume tiers work." },
];

/**
 * FAQ answers are kept factually current rather than aspirational.
 *
 * The supplied copy claimed most assets sit in cold storage, listed three
 * deposit networks, and quoted 0.10%/0.20% trading fees. None of those are true
 * today, and a help centre is the worst place to be wrong — people act on it.
 */
const FAQ = [
  {
    q: "How secure is OKNexus?",
    a: "Your account is protected by two-factor authentication, device and session management, a withdrawal address whitelist with a delay on new addresses, and around-the-clock monitoring. Custody keys are held in Turnkey's secure enclaves rather than on our servers, withdrawals above a threshold need a second person to approve them, and every P2P trade is escrow-protected.",
  },
  {
    q: "What can I trade?",
    a: "Spot trading, instant swaps, an OTC desk and peer-to-peer — all in one account, across BTC, ETH, SOL, BNB, XRP and ADA against USDT, with live market data.",
  },
  {
    q: "How do deposits and withdrawals work?",
    a: "Every account gets a real on-chain deposit address. Ethereum is live today, and further networks are being enabled one at a time so that each is fully supported in both directions before we offer it. Deposits credit automatically after network confirmations, and you can withdraw to any external address.",
  },
  {
    q: "Can I cash out to a bank account?",
    a: "Yes, to any Nigerian bank account. You'll need a verified identity first, and we confirm the account holder's name before anything is sent.",
  },
  {
    q: "Does OKNexus hold my funds?",
    a: "Yes — OKNexus is a custodial exchange. Your balances live in your account, and you can withdraw on-chain at any time.",
  },
  {
    q: "What are the fees?",
    a: "Spot trading starts at 0.25% and falls to 0.10% as your 30-day volume grows. Swap and buy/sell are 0.5%, P2P is 0.25%, and crypto deposits are free. Withdrawal fees track live network cost. Every quote shows the cost before you confirm.",
  },
  {
    q: "Do I need to verify my identity?",
    a: "You can browse markets and explore the platform freely. Verification is required before withdrawing to a bank account, and unlocks higher limits.",
  },
];

export default function HelpPage() {
  const [q, setQ] = useState("");

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return FAQ;
    return FAQ.filter((f) => (f.q + f.a).toLowerCase().includes(s));
  }, [q]);

  return (
    <div className="relative min-h-screen overflow-x-clip" style={landingStyle}>
      <LandingHeader />

      <main className="mx-auto max-w-4xl px-4 pb-24 pt-20 md:pt-28">
        <section className="text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold text-[var(--color-accent)] backdrop-blur">
            <LifeBuoy className="h-3.5 w-3.5" /> Help Center
          </div>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl">
            Guides and answers, 24/7
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-[var(--color-muted)]">
            Find step-by-step help for every part of OKNexus — from your first deposit to your
            first OTC trade.
          </p>

          <div className="mx-auto mt-8 flex max-w-xl items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
            <Search className="h-4 w-4 shrink-0 text-[var(--color-muted)]" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search for an answer…"
              className="w-full bg-transparent text-sm text-white outline-none"
            />
          </div>
        </section>

        {!q && (
          <section className="mt-14 grid gap-3 sm:grid-cols-2">
            {CATEGORIES.map((c) => (
              <div
                key={c.title}
                className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5"
              >
                <c.icon className="h-5 w-5 text-[var(--color-accent)]" />
                <h2 className="mt-3 text-sm font-semibold text-white">{c.title}</h2>
                <p className="mt-1 text-sm leading-relaxed text-[var(--color-muted)]">{c.body}</p>
              </div>
            ))}
          </section>
        )}

        <section className="mt-14">
          <h2 className="text-lg font-semibold text-white">
            {q ? `Results for "${q}"` : "Frequently asked questions"}
          </h2>
          <div className="mt-4 space-y-3">
            {results.map((f) => (
              <details
                key={f.q}
                className="group rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5"
              >
                <summary className="cursor-pointer list-none text-sm font-medium text-white">
                  {f.q}
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-[var(--color-muted)]">{f.a}</p>
              </details>
            ))}
            {results.length === 0 && (
              <p className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 text-sm text-[var(--color-muted)]">
                Nothing matched that. Try a different word, or{" "}
                <Link href="/contact" className="text-[var(--color-accent)] hover:underline">
                  contact support
                </Link>
                .
              </p>
            )}
          </div>
        </section>

        <section className="mt-14 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-center">
          <h2 className="text-lg font-semibold text-white">Still stuck?</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-[var(--color-muted)]">
            If you can&apos;t find the answer here, our support team can help directly.
          </p>
          <Link
            href="/contact"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--color-accent-hover)]"
          >
            Contact support <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      </main>
    </div>
  );
}
