"use client";

import { useState } from "react";
import Link from "next/link";
import type { CSSProperties } from "react";
import {
  GraduationCap,
  BookOpen,
  LineChart,
  Wallet,
  ShieldCheck,
  Zap,
  Search,
  ArrowRight,
  Clock,
  type LucideIcon,
} from "lucide-react";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { SocialLinks } from "@/components/landing/SocialLinks";
import { Logo } from "@/components/brand/Logo";

const landingStyle = {
  colorScheme: "dark",
  background: "#08060f",
  color: "#f5f3fc",
  "--color-background": "#08060f",
  "--color-surface": "#110d20",
  "--color-surface-2": "#181231",
  "--color-border": "#241d3f",
  "--color-foreground": "#f5f3fc",
  "--color-muted": "#a3a0c4",
  "--color-accent": "#9b6bff",
  "--color-accent-hover": "#ac81ff",
  "--color-up": "#2ee0a8",
  "--color-up-bg": "rgba(46,224,168,0.12)",
  "--color-down": "#ff6a8a",
  "--color-down-bg": "rgba(255,106,138,0.12)",
  "--glass-bg": "rgba(22,17,42,0.62)",
  "--glass-border": "rgba(255,255,255,0.08)",
  "--glass-shadow": "0 24px 70px rgba(0,0,0,0.55)",
  "--topbar-bg": "rgba(8,6,15,0.72)",
} as CSSProperties;

type Track = {
  id: string;
  icon: LucideIcon;
  title: string;
  desc: string;
  articles: { title: string; readTime: string; summary: string; tag: string }[];
};

const TRACKS: Track[] = [
  {
    id: "basics",
    icon: BookOpen,
    title: "Crypto basics",
    desc: "What is a blockchain, what is a wallet, how do deposits and withdrawals actually work.",
    articles: [
      {
        title: "What is Blockchain & How Does Custody Work?",
        readTime: "5 min read",
        summary: "Understand public ledgers, network confirmations, and how deposit addresses work on OKNexus.",
        tag: "Basics",
      },
      {
        title: "Wallets 101: On-Chain vs Off-Ledger Balances",
        readTime: "4 min read",
        summary: "Learn how instant internal transfers differ from standard on-chain blockchain transactions.",
        tag: "Wallets",
      },
    ],
  },
  {
    id: "trading",
    icon: LineChart,
    title: "Trading fundamentals",
    desc: "Market vs. limit orders, reading a candlestick chart, understanding the order book.",
    articles: [
      {
        title: "Understanding Market, Limit, and Stop Orders",
        readTime: "7 min read",
        summary: "Master execution types so you can enter and exit positions at the exact price you intend.",
        tag: "Trading",
      },
      {
        title: "How to Read an Order Book & Depth Chart",
        readTime: "6 min read",
        summary: "Analyze bid-ask spreads, liquidity clusters, and market depth before submitting trades.",
        tag: "Order Book",
      },
    ],
  },
  {
    id: "oknexus",
    icon: Wallet,
    title: "Using OKNexus",
    desc: "Step-by-step guides for Spot Trading, Instant Swap, Buy & Sell, P2P, and the Wallet.",
    articles: [
      {
        title: "Step-by-Step: Trading P2P with Escrow Protection",
        readTime: "5 min read",
        summary: "Learn how crypto is locked in escrow until bank payments are verified by both parties.",
        tag: "P2P",
      },
      {
        title: "Instant Swap Guide: Converting Assets in One Tap",
        readTime: "3 min read",
        summary: "Lock in live quotes with zero slippage or order book reading required.",
        tag: "Swap",
      },
    ],
  },
  {
    id: "security",
    icon: ShieldCheck,
    title: "Safety & security",
    desc: "Recognizing scams, protecting your account, understanding escrow and disputes.",
    articles: [
      {
        title: "Account Security Best Practices & 2FA Setup",
        readTime: "6 min read",
        summary: "Protect your exchange account with authenticator apps, device approvals, and anti-phishing.",
        tag: "Security",
      },
      {
        title: "Avoiding P2P Scams & Navigating Disputes",
        readTime: "8 min read",
        summary: "Essential rules for safe peer-to-peer fiat payments and moderated dispute resolution.",
        tag: "Safety",
      },
    ],
  },
  {
    id: "advanced",
    icon: Zap,
    title: "Advanced topics",
    desc: "OTC execution, market-making basics, understanding fees and spreads.",
    articles: [
      {
        title: "OTC Execution: Institutional Liquidity & Private Quotes",
        readTime: "9 min read",
        summary: "How large volume trades execute privately off the order book to eliminate market impact.",
        tag: "OTC Desk",
      },
      {
        title: "Fee Structures, Spreads & Order Routing",
        readTime: "5 min read",
        summary: "A deep dive into maker/taker schedules, network gas fees, and quote calculations.",
        tag: "Advanced",
      },
    ],
  },
];

export default function AcademyPage() {
  const [activeTrack, setActiveTrack] = useState<string>("all");
  const [search, setSearch] = useState("");

  const filteredTracks = TRACKS.filter((t) => {
    if (activeTrack !== "all" && t.id !== activeTrack) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      t.title.toLowerCase().includes(q) ||
      t.desc.toLowerCase().includes(q) ||
      t.articles.some((a) => a.title.toLowerCase().includes(q) || a.summary.toLowerCase().includes(q))
    );
  });

  return (
    <div className="relative min-h-screen overflow-x-clip" style={landingStyle}>
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[900px]">
        <div
          className="absolute left-1/2 top-[-160px] h-[520px] w-[820px] -translate-x-1/2 rounded-full blur-3xl"
          style={{ background: "radial-gradient(50% 50% at 50% 50%, rgba(124,92,246,0.25), transparent 70%)" }}
        />
      </div>

      <LandingHeader />

      <main className="mx-auto max-w-6xl px-4 pb-24 pt-20 md:pt-28">
        {/* Hero */}
        <section className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold text-[var(--color-accent)] backdrop-blur mb-6">
            <GraduationCap className="h-3.5 w-3.5" /> OKNexus Academy
          </div>
          <h1 className="mx-auto max-w-4xl text-4xl font-semibold leading-[1.08] tracking-tight text-white sm:text-6xl md:text-7xl">
            Learn crypto <span className="spectrum-text-anim">from the ground up</span>
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-relaxed text-[var(--color-muted)] sm:text-xl">
            Whether you're placing your first trade or exploring OTC execution, Academy breaks down exactly
            what you need to know - no jargon, no assumptions.
          </p>

          {/* Search bar */}
          <div className="mx-auto mt-8 max-w-xl">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--color-muted)]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search topics (e.g. P2P escrow, limit orders, OTC)..."
                className="w-full rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/80 py-3.5 pl-12 pr-4 text-sm text-white placeholder-[var(--color-muted)] outline-none backdrop-blur focus:border-[var(--color-accent)]"
              />
            </div>
          </div>
        </section>

        {/* Category Filters */}
        <section className="mt-12 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => setActiveTrack("all")}
            className={`rounded-full px-5 py-2 text-xs font-semibold transition-all ${
              activeTrack === "all"
                ? "spectrum-bg text-white"
                : "border border-white/10 bg-white/5 text-[var(--color-muted)] hover:bg-white/10 hover:text-white"
            }`}
          >
            All Tracks
          </button>
          {TRACKS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTrack(t.id)}
              className={`rounded-full px-5 py-2 text-xs font-semibold transition-all ${
                activeTrack === t.id
                  ? "spectrum-bg text-white"
                  : "border border-white/10 bg-white/5 text-[var(--color-muted)] hover:bg-white/10 hover:text-white"
              }`}
            >
              {t.title}
            </button>
          ))}
        </section>

        {/* Course Tracks */}
        <section className="mt-14 space-y-12">
          {filteredTracks.map((track) => {
            const Icon = track.icon;
            return (
              <div key={track.id} className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 p-6 md:p-8">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl spectrum-bg text-white">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">{track.title}</h2>
                    <p className="text-xs text-[var(--color-muted)]">{track.desc}</p>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {track.articles.map((art) => (
                    <div
                      key={art.title}
                      className="group rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-2)]/60 p-5 transition-all hover:border-[var(--color-accent)] hover:bg-[var(--color-surface-2)]"
                    >
                      <div className="flex items-center justify-between text-xs text-[var(--color-muted)]">
                        <span className="rounded-full bg-white/10 px-2.5 py-0.5 font-medium text-white">{art.tag}</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {art.readTime}</span>
                      </div>
                      <h3 className="mt-3 font-semibold text-white group-hover:text-[var(--color-accent)] transition-colors">
                        {art.title}
                      </h3>
                      <p className="mt-1.5 text-xs leading-relaxed text-[var(--color-muted)]">
                        {art.summary}
                      </p>
                      <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-[var(--color-accent)]">
                        Read guide <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--color-border)]">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <div className="grid gap-8 grid-cols-2 md:grid-cols-[1.3fr_1fr_1fr_1fr_1fr]">
            <div className="col-span-2 md:col-span-1 max-w-xs">
              <Logo />
              <p className="mt-3 text-sm leading-relaxed text-[var(--color-muted)]">
                A single, secure venue to trade, swap, ramp and move digital assets - built on a compliance-first foundation.
              </p>
              <SocialLinks className="mt-5" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-white">TRADE</div>
              <ul className="mt-3 space-y-2.5 text-sm text-[var(--color-muted)]">
                <li><Link href="/trade/BTC-USDT" className="hover:text-white">Spot Trading</Link></li>
                <li><Link href="/swap" className="hover:text-white">Instant Swap</Link></li>
                <li><Link href="/buy" className="hover:text-white">Buy &amp; Sell Crypto</Link></li>
                <li><Link href="/p2p" className="hover:text-white">P2P Marketplace</Link></li>
                <li><Link href="/otc" className="hover:text-white">OTC Desk</Link></li>
                <li><Link href="/wallet" className="hover:text-white">Wallet</Link></li>
              </ul>
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-white">RESOURCES</div>
              <ul className="mt-3 space-y-2.5 text-sm text-[var(--color-muted)]">
                <li><Link href="/academy" className="hover:text-white">Academy</Link></li>
                <li><Link href="/blog" className="hover:text-white">Blog</Link></li>
                <li><Link href="/settings/support" className="hover:text-white">Help Center</Link></li>
                <li><Link href="/explore" className="hover:text-white">Risk Disclosure</Link></li>
                <li><Link href="/swap" className="hover:text-white">Rate Calculator</Link></li>
                <li><Link href="/convert" className="hover:text-white">Crypto Converter</Link></li>
              </ul>
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-white">COMPANY</div>
              <ul className="mt-3 space-y-2.5 text-sm text-[var(--color-muted)]">
                <li><Link href="/about" className="hover:text-white">About Oknexus</Link></li>
                <li><Link href="/careers" className="hover:text-white">Careers</Link></li>
                <li><Link href="/we-care" className="hover:text-white">We Care</Link></li>
                <li><Link href="/settings/support" className="hover:text-white">Contact</Link></li>
                <li><Link href="/blog" className="hover:text-white">Newsletter</Link></li>
              </ul>
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-white">LEGAL</div>
              <ul className="mt-3 space-y-2.5 text-sm text-[var(--color-muted)]">
                <li><Link href="/privacy" className="hover:text-white">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-white">Terms of Service</Link></li>
                <li><Link href="/explore" className="hover:text-white">AML Policy</Link></li>
                <li><Link href="/kyc" className="hover:text-white">KYC Policy</Link></li>
                <li><Link href="/explore" className="hover:text-white">Risk Disclosure</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 flex flex-col gap-3 border-t border-[var(--color-border)] pt-6 text-xs text-[var(--color-muted)] sm:flex-row sm:items-center sm:justify-between">
            <span>© 2026 OKNexus Exchange. All rights reserved.</span>
            <span>Built for a secure, compliance-first digital asset ecosystem.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
