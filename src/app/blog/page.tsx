"use client";

import { useState } from "react";
import Link from "next/link";
import type { CSSProperties } from "react";
import {
  Newspaper,
  Calendar,
  Clock,
  ArrowRight,
  Sparkles,
  Tag,
  Check,
  Send,
  Loader2,
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

type Article = {
  id: string;
  category: "Product updates" | "Market insights" | "Security & compliance" | "Company news";
  title: string;
  summary: string;
  date: string;
  readTime: string;
  featured?: boolean;
};

const ARTICLES: Article[] = [
  {
    id: "1",
    category: "Product updates",
    title: "Introducing OTC Desk & On-Chain Cold Custody Multi-Sig",
    summary:
      "We've upgraded our liquidity pipeline to offer block execution for large orders with zero slippage, integrated directly with cold storage float.",
    date: "Aug 1, 2026",
    readTime: "4 min read",
    featured: true,
  },
  {
    id: "2",
    category: "Security & compliance",
    title: "How OKNexus Protects P2P Trades with Escrow & Automated Disputes",
    summary:
      "A look inside our multi-tiered risk scoring and escrow locking system that ensures safe peer-to-peer fiat settlements.",
    date: "Jul 28, 2026",
    readTime: "5 min read",
  },
  {
    id: "3",
    category: "Market insights",
    title: "Q3 Digital Asset Market Structure & Liquidity Deep Dive",
    summary:
      "Examining order book depth, spot volume distribution, and major crypto asset correlations heading into the second half of the year.",
    date: "Jul 22, 2026",
    readTime: "7 min read",
  },
  {
    id: "4",
    category: "Company news",
    title: "OKNexus Expands Global Support & Zero-Fee Instant Swaps",
    summary:
      "Our latest platform milestone brings expanded fiat gateway options, 24/7 priority support, and optimized execution rates.",
    date: "Jul 15, 2026",
    readTime: "3 min read",
  },
  {
    id: "5",
    category: "Product updates",
    title: "Spot Trading Interface v2: Real-Time Order Books & Depth Visualizer",
    summary:
      "Experience faster order placement, custom chart layouts, and sub-millisecond market data streams powered by live feeds.",
    date: "Jul 08, 2026",
    readTime: "4 min read",
  },
];

const CATEGORIES = ["All", "Product updates", "Market insights", "Security & compliance", "Company news"];

export default function BlogPage() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [subscribed, setSubscribed] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const filteredArticles = ARTICLES.filter((a) => {
    if (activeCategory !== "All" && a.category !== activeCategory) return false;
    return true;
  });

  const featuredArticle = ARTICLES.find((a) => a.featured);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubscribed(true);
    }, 600);
  };

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
            <Newspaper className="h-3.5 w-3.5" /> OKNexus Blog &amp; News
          </div>
          <h1 className="mx-auto max-w-4xl text-4xl font-semibold leading-[1.08] tracking-tight text-white sm:text-6xl md:text-7xl">
            News, insights &amp; <span className="spectrum-text-anim">updates</span>
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-relaxed text-[var(--color-muted)] sm:text-xl">
            Product launches, market commentary, and everything happening across the OKNexus ecosystem - straight from the team.
          </p>
        </section>

        {/* Featured Banner */}
        {featuredArticle && (
          <section className="mt-14">
            <div className="group rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)]/70 p-8 md:p-10 backdrop-blur transition-all hover:border-[var(--color-accent)]">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--color-muted)]">
                <span className="inline-flex items-center gap-1.5 rounded-full spectrum-bg px-3 py-1 font-semibold text-white">
                  <Sparkles className="h-3 w-3" /> Featured Story
                </span>
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {featuredArticle.date}</span>
                  <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {featuredArticle.readTime}</span>
                </div>
              </div>

              <h2 className="mt-5 text-2xl font-bold tracking-tight text-white md:text-4xl group-hover:text-[var(--color-accent)] transition-colors">
                {featuredArticle.title}
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[var(--color-muted)] sm:text-base">
                {featuredArticle.summary}
              </p>

              <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-[var(--color-accent)]">
                Read full article <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1.5" />
              </div>
            </div>
          </section>
        )}

        {/* Category Filter Tabs */}
        <section className="mt-14 flex flex-wrap justify-center gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`rounded-full px-5 py-2 text-xs font-semibold transition-all ${
                activeCategory === cat
                  ? "spectrum-bg text-white"
                  : "border border-white/10 bg-white/5 text-[var(--color-muted)] hover:bg-white/10 hover:text-white"
              }`}
            >
              {cat}
            </button>
          ))}
        </section>

        {/* Article Grid */}
        <section className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredArticles.map((art) => (
            <article
              key={art.id}
              className="group flex flex-col justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 p-6 transition-all hover:-translate-y-1 hover:border-[var(--color-accent)]"
            >
              <div>
                <div className="flex items-center justify-between text-xs text-[var(--color-muted)]">
                  <span className="flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5 font-medium text-white">
                    <Tag className="h-3 w-3 text-[var(--color-accent)]" /> {art.category}
                  </span>
                  <span>{art.readTime}</span>
                </div>

                <h3 className="mt-4 text-lg font-semibold text-white group-hover:text-[var(--color-accent)] transition-colors">
                  {art.title}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-[var(--color-muted)] line-clamp-3">
                  {art.summary}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-xs">
                <span className="text-[var(--color-muted)]">{art.date}</span>
                <span className="flex items-center gap-1 font-semibold text-[var(--color-accent)]">
                  Read <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </article>
          ))}
        </section>

        {/* Newsletter Subscription */}
        <section className="mt-24 rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-8 md:p-12 text-center">
          <div className="mx-auto max-w-xl">
            <h2 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
              Stay ahead with OKNexus Insights
            </h2>
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              Get the latest product updates, security advisories, and crypto market commentary delivered directly to your inbox.
            </p>

            {subscribed ? (
              <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-[var(--color-up-bg)] px-5 py-2.5 text-xs font-semibold text-[var(--color-up)]">
                <Check className="h-4 w-4" /> You're subscribed! We'll keep you updated.
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="mt-6 flex flex-col gap-2 sm:flex-row">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="flex-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] px-5 py-3 text-sm text-white placeholder-[var(--color-muted)] outline-none focus:border-[var(--color-accent)]"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="spectrum-bg flex items-center justify-center gap-2 rounded-full px-7 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Subscribe
                </button>
              </form>
            )}
          </div>
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
