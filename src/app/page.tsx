import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import {
  ArrowRight,
  ShieldCheck,
  Lock,
  Fingerprint,
  Snowflake,
  Eye,
  ArrowLeftRight,
  CreditCard,
  Wallet,
  BadgeCheck,
  Radio,
  Globe2,
  Check,
} from "lucide-react";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { LiveMarkets } from "@/components/landing/LiveMarkets";
import { FaqAccordion } from "@/components/landing/FaqAccordion";
import { NewsletterForm } from "@/components/landing/NewsletterForm";
import { SocialLinks } from "@/components/landing/SocialLinks";
import { Reveal } from "@/components/landing/Reveal";
import { ComingSoonSection } from "@/components/landing/ComingSoonSection";
import { Logo } from "@/components/brand/Logo";
import { AssetCoin } from "@/components/swap/AssetSelect";

// Committed dark "Exodus" palette applied inline so it can't be dropped by the
// CSS pipeline; the custom properties cascade to every var(--color-*) descendant.
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

const ASSETS = ["BTC", "ETH", "SOL", "BNB", "XRP", "ADA", "USDT"];

const PRODUCTS = [
  { icon: CreditCard, title: "Buy & Sell", desc: "Move between cash and crypto with cards, bank transfers, and local rails." },
  { icon: ArrowLeftRight, title: "Convert", desc: "Swap any two assets instantly — large orders auto-route to the OTC desk." },
  { icon: Wallet, title: "Deposits & withdrawals", desc: "Real on-chain addresses per user across Ethereum, Solana, and Bitcoin." },
  { icon: Fingerprint, title: "Account security", desc: "Two-factor authentication, device verification, and login monitoring." },
  { icon: BadgeCheck, title: "Identity & compliance", desc: "Built-in KYC and AML controls that meet global standards." },
  { icon: ShieldCheck, title: "Escrow & disputes", desc: "Every P2P trade is escrow-protected, with moderated dispute resolution." },
];

const SECURITY = [
  { icon: Lock, title: "Encryption everywhere", desc: "SSL and end-to-end encryption protect every request and session." },
  { icon: Snowflake, title: "Cold-storage float", desc: "The majority of assets are held offline in secure cold wallets." },
  { icon: Eye, title: "24/7 monitoring", desc: "Real-time risk scoring flags suspicious activity as it happens." },
  { icon: BadgeCheck, title: "Compliance-first", desc: "KYC and AML controls designed to meet global regulatory standards." },
];

const FAQ = [
  {
    q: "How secure is OKNexus?",
    a: "OKNexus protects your account with encryption, two-factor authentication, device verification, and around-the-clock monitoring. The majority of assets are kept in cold storage, and every P2P trade is escrow-protected.",
  },
  {
    q: "What can I trade?",
    a: "Spot trading, instant swaps, a fiat buy/sell ramp, an OTC desk, and peer-to-peer — all in one account, across BTC, ETH, SOL, BNB, XRP, ADA, and USDT with live market data.",
  },
  {
    q: "How do deposits and withdrawals work?",
    a: "Every account gets real on-chain deposit addresses on Ethereum, Solana, and Bitcoin. Deposits are credited automatically after network confirmations, and you can withdraw to any external address.",
  },
  {
    q: "Does OKNexus hold my funds?",
    a: "Yes — OKNexus is a custodial exchange. Your balances live in your account and are protected by our security stack, and you can withdraw on-chain at any time.",
  },
  {
    q: "What are the fees?",
    a: "Spot trading is 0.10% maker and 0.20% taker. Swap, ramp, and OTC fees are always shown transparently in the quote before you confirm.",
  },
  {
    q: "Do I need to verify my identity?",
    a: "You can browse markets and explore the platform freely. Identity verification (KYC) unlocks higher limits and is reviewed by our team.",
  },
];

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-x-clip" style={landingStyle}>
      {/* Ambient spectrum glow */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[900px]">
        <div className="absolute left-1/2 top-[-160px] h-[520px] w-[820px] -translate-x-1/2 rounded-full blur-3xl" style={{ background: "radial-gradient(50% 50% at 50% 50%, rgba(124,92,246,0.30), transparent 70%)" }} />
        <div className="lp-float absolute left-[12%] top-[40px] h-[380px] w-[380px] rounded-full blur-3xl" style={{ background: "radial-gradient(50% 50% at 50% 50%, rgba(77,124,255,0.22), transparent 70%)" }} />
        <div className="lp-float2 absolute right-[10%] top-[10px] h-[420px] w-[420px] rounded-full blur-3xl" style={{ background: "radial-gradient(50% 50% at 50% 50%, rgba(224,91,224,0.20), transparent 70%)" }} />
      </div>

      <LandingHeader />

      <main>
        {/* Hero */}
        <section className="relative mx-auto max-w-6xl px-4 pb-8 pt-28 text-center md:pt-40">
          <h1
            className="lp-fade-up mx-auto max-w-4xl text-4xl font-semibold leading-[1.05] tracking-tight text-white [text-wrap:balance] sm:text-6xl md:text-7xl"
            style={{ animationDelay: "60ms" }}
          >
            The exchange that connects you to the{" "}
            <span className="spectrum-text-anim">future of finance</span>
          </h1>
          <p
            className="lp-fade-up mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[var(--color-muted)]"
            style={{ animationDelay: "170ms" }}
          >
            Buy, sell, swap, and trade digital assets on one fast, secure platform — with live market
            data, escrow-protected P2P, and real on-chain custody.
          </p>
          <div
            className="lp-fade-up mt-9 flex flex-wrap items-center justify-center gap-3"
            style={{ animationDelay: "280ms" }}
          >
            <Link
              href="/register"
              className="spectrum-bg inline-flex items-center gap-1.5 rounded-full px-6 py-3.5 text-sm font-semibold"
            >
              Start trading <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/trade/BTC-USDT"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/10"
            >
              Explore markets
            </Link>
          </div>
          <div
            className="lp-fade-up mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-[var(--color-muted)]"
            style={{ animationDelay: "390ms" }}
          >
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-[var(--color-accent)]" /> Bank-grade security
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Check className="h-4 w-4 text-[var(--color-accent)]" /> Compliance-first
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Globe2 className="h-4 w-4 text-[var(--color-accent)]" /> 24/7 access
            </span>
          </div>

          {/* Hero product mockup */}
          <div
            className="lp-fade-up relative mx-auto mt-16 max-w-4xl"
            style={{ animationDelay: "520ms" }}
          >
            <div className="glass rounded-3xl p-2.5 sm:p-3">
              <div className="grid gap-3 md:grid-cols-[1.45fr_1fr]">
                <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/70 p-5 text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                    <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                    <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                  </div>
                  <div className="mt-5 text-xs uppercase tracking-wider text-[var(--color-muted)]">
                    Total balance
                  </div>
                  <div className="mt-1 text-3xl font-semibold tabular-nums text-white sm:text-4xl">
                    $128,940<span className="text-[var(--color-muted)]">.22</span>
                  </div>
                  <div className="mt-1 text-sm font-medium text-[var(--color-up)]">
                    +$3,412.08 &nbsp;(+2.72%) today
                  </div>
                  <div className="mt-4">
                    <AreaChart />
                  </div>
                  <div className="mt-3 flex gap-1.5">
                    {["1H", "1D", "1W", "1M", "1Y"].map((t, i) => (
                      <span
                        key={t}
                        className={
                          i === 1
                            ? "rounded-md bg-white/10 px-2.5 py-1 text-xs text-white"
                            : "rounded-md px-2.5 py-1 text-xs text-[var(--color-muted)]"
                        }
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
                <LiveMarkets />
              </div>
            </div>
          </div>
        </section>

        {/* Trust strip */}
        <section className="mx-auto max-w-6xl px-4 py-10">
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/50 px-6 py-5 text-sm md:grid-cols-4">
            {[
              [Radio, "Live market data", "Priced by Binance"],
              [ArrowLeftRight, "Six products", "One account"],
              [ShieldCheck, "Escrow-protected", "Peer-to-peer trades"],
              [Wallet, "On-chain custody", "Deposit & withdraw"],
            ].map(([Icon, a, b], i) => {
              const I = Icon as typeof Radio;
              return (
                <div key={i} className="flex items-center gap-3">
                  <I className="h-5 w-5 shrink-0 text-[var(--color-accent)]" />
                  <div>
                    <div className="font-medium text-white">{a as string}</div>
                    <div className="text-xs text-[var(--color-muted)]">{b as string}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Alternating features */}
        <section id="products" className="mx-auto max-w-6xl space-y-24 px-4 py-16 md:py-24">
          <FeatureRow
            eyebrow="Spot trading"
            title="Pro-grade trading, made approachable"
            desc="Trade on a fast matching engine with live candlestick charts, a real-time order book, and market and limit orders — the depth professionals expect, in an interface anyone can use."
            cta="Open the trade screen"
            href="/trade/BTC-USDT"
            visual={<SpotMock />}
          />
          <FeatureRow
            flip
            eyebrow="Convert"
            title="Swap any two assets in one tap"
            desc="Convert between assets at a locked, transparent rate that refreshes every few seconds. No order books to read — just choose, review the quote, and confirm."
            cta="Open Convert"
            href="/convert"
            visual={<SwapMock />}
          />
          <FeatureRow
            eyebrow="Peer-to-peer"
            title="Trade directly, protected by escrow"
            desc="Post your own buy and sell ads or take someone else's. Crypto is locked in escrow the moment a trade opens and only released when payment is confirmed — with in-trade chat and dispute support."
            cta="Explore the P2P market"
            href="/p2p"
            visual={<P2PMock />}
          />
        </section>

        {/* Supported assets */}
        <section id="assets" className="border-y border-[var(--color-border)] bg-[var(--color-surface)]/40">
          <div className="mx-auto max-w-6xl px-4 py-16 text-center md:py-20">
            <h2 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">
              Trade the assets that <span className="spectrum-text">actually matter</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-[var(--color-muted)]">
              Every market is priced live, second by second, so you always trade on real numbers.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              {ASSETS.map((s) => (
                <div
                  key={s}
                  className="flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5"
                >
                  <AssetCoin symbol={s} size={26} />
                  <span className="text-sm font-medium text-white">{s}</span>
                </div>
              ))}
            </div>
            <Link
              href="/trade/BTC-USDT"
              className="mt-10 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-accent)] hover:text-white"
            >
              Browse all markets <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        {/* Explore the platform grid */}
        <section className="mx-auto max-w-6xl px-4 py-16 md:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-medium uppercase tracking-widest text-[var(--color-accent)]">
              Explore the platform
            </span>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-4xl">
              Everything you need, in one account
            </h2>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PRODUCTS.map((p) => (
              <div
                key={p.title}
                className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 p-6 transition-transform duration-200 hover:-translate-y-1"
              >
                <div className="grid h-11 w-11 place-items-center rounded-xl spectrum-bg">
                  <p.icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="mt-4 font-semibold text-white">{p.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-muted)]">{p.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* On the roadmap / coming soon */}
        <ComingSoonSection />

        {/* Security */}
        <section id="security" className="mx-auto max-w-6xl px-4 py-16 md:py-20">
          <div className="grid gap-10 md:grid-cols-[0.9fr_1.1fr] md:items-center">
            <div>
              <span className="text-xs font-medium uppercase tracking-widest text-[var(--color-accent)]">
                Security &amp; trust
              </span>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-4xl [text-wrap:balance]">
                Security at the core of everything
              </h2>
              <p className="mt-4 max-w-md leading-relaxed text-[var(--color-muted)]">
                Your assets are protected by layered defenses and a compliance-first approach, so you
                can take part in the digital economy with confidence.
              </p>
              <Link
                href="/register"
                className="spectrum-bg mt-7 inline-flex items-center gap-1.5 rounded-full px-6 py-3 text-sm font-semibold"
              >
                Create your account <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {SECURITY.map((s) => (
                <div key={s.title} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 p-5">
                  <s.icon className="h-5 w-5 text-[var(--color-accent)]" />
                  <h3 className="mt-3 text-sm font-semibold text-white">{s.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-[var(--color-muted)]">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="mx-auto max-w-3xl px-4 py-16 md:py-20">
          <div className="text-center">
            <span className="text-xs font-medium uppercase tracking-widest text-[var(--color-accent)]">
              Common questions
            </span>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-4xl">
              Everything you might be wondering
            </h2>
          </div>
          <div className="mt-10">
            <FaqAccordion items={FAQ} />
          </div>
        </section>

        {/* Final CTA */}
        <section className="mx-auto max-w-6xl px-4 pb-24">
          <Reveal>
            <div className="spectrum-bg relative overflow-hidden rounded-[2rem] px-6 py-16 text-center">
            <div className="relative z-10">
              <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight text-white [text-wrap:balance] md:text-5xl">
                Start your crypto journey with OKNexus
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-white/85">
                Create your free account in seconds and trade from any device.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-1.5 rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-[#14121f] hover:bg-white/90"
                >
                  Get started <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/trade/BTC-USDT"
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/50 px-7 py-3.5 text-sm font-semibold text-white hover:bg-white/10"
                >
                  Explore markets
                </Link>
              </div>
            </div>
          </div>
          </Reveal>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--color-border)]">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
            <div className="max-w-xs">
              <Logo />
              <p className="mt-3 text-sm leading-relaxed text-[var(--color-muted)]">
                Connecting you to the future of finance. One account for spot, swap, ramp, OTC, and P2P.
              </p>
              <div className="mt-5">
                <div className="mb-2 text-sm font-medium text-white">Stay in the loop</div>
                <NewsletterForm />
              </div>
              <SocialLinks className="mt-6" />
            </div>
            <FooterCol
              title="Products"
              links={[
                ["Spot Trading", "/trade/BTC-USDT"],
                ["Convert", "/convert"],
                ["Buy & Sell", "/buy"],
                ["P2P Trading", "/p2p"],
              ]}
            />
            <FooterCol
              title="Platform"
              links={[
                ["Wallet", "/wallet"],
                ["Deposit", "/deposit"],
                ["Withdraw", "/withdraw"],
                ["Verify identity", "/kyc"],
              ]}
            />
            <FooterCol
              title="Resources"
              links={[
                ["Markets", "/trade/BTC-USDT"],
                ["Security", "#security"],
                ["FAQ", "#faq"],
                ["Get started", "/register"],
              ]}
            />
          </div>
          <div className="mt-12 flex flex-col gap-3 border-t border-[var(--color-border)] pt-6 text-xs text-[var(--color-muted)] sm:flex-row sm:items-center sm:justify-between">
            <span>© 2026 OKNexus Exchange. All rights reserved.</span>
            <span>Demo platform · live market data via Binance · not financial advice.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureRow({
  eyebrow,
  title,
  desc,
  cta,
  href,
  visual,
  flip,
}: {
  eyebrow: string;
  title: string;
  desc: string;
  cta: string;
  href: string;
  visual: ReactNode;
  flip?: boolean;
}) {
  return (
    <Reveal>
      <div className="grid items-center gap-10 md:grid-cols-2">
        <div className={flip ? "md:order-2" : ""}>
        <span className="text-xs font-medium uppercase tracking-widest text-[var(--color-accent)]">
          {eyebrow}
        </span>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white [text-wrap:balance] md:text-4xl">
          {title}
        </h2>
        <p className="mt-4 max-w-md leading-relaxed text-[var(--color-muted)]">{desc}</p>
        <Link
          href={href}
          className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-accent)] hover:text-white"
        >
          {cta} <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className={flip ? "md:order-1" : ""}>{visual}</div>
      </div>
    </Reveal>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <div className="text-sm font-semibold text-white">{title}</div>
      <ul className="mt-3 space-y-2.5">
        {links.map(([label, href]) => (
          <li key={label}>
            <Link href={href} className="text-sm text-[var(--color-muted)] transition-colors hover:text-white">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---- Decorative mockups (CSS/SVG) ---- */

function AreaChart() {
  return (
    <svg viewBox="0 0 340 120" className="h-24 w-full" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id="heroArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#9b6bff" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#9b6bff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="heroStroke" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#5b8bff" />
          <stop offset="55%" stopColor="#c64fe8" />
          <stop offset="100%" stopColor="#ff6aa5" />
        </linearGradient>
      </defs>
      <path
        d="M0,92 C34,84 58,54 92,60 C124,66 146,32 178,40 C210,48 236,22 268,28 C300,34 322,18 340,24 L340,120 L0,120 Z"
        fill="url(#heroArea)"
      />
      <path
        d="M0,92 C34,84 58,54 92,60 C124,66 146,32 178,40 C210,48 236,22 268,28 C300,34 322,18 340,24"
        fill="none"
        stroke="url(#heroStroke)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MockShell({ children }: { children: ReactNode }) {
  return (
    <div className="glass rounded-3xl p-4 sm:p-5">
      <div className="flex items-center gap-1.5 pb-3">
        <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
      </div>
      {children}
    </div>
  );
}

function SpotMock() {
  return (
    <MockShell>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AssetCoin symbol="BTC" size={26} />
          <div>
            <div className="text-sm font-semibold text-white">BTC / USDT</div>
            <div className="text-xs text-[var(--color-muted)]">Bitcoin</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold tabular-nums text-white">$64,180.40</div>
          <div className="text-xs font-medium text-[var(--color-up)]">+1.94%</div>
        </div>
      </div>
      <div className="mt-3">
        <AreaChart />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg bg-[var(--color-up-bg)] px-3 py-2 text-[var(--color-up)]">Buy BTC</div>
        <div className="rounded-lg bg-[var(--color-down-bg)] px-3 py-2 text-[var(--color-down)]">Sell BTC</div>
      </div>
    </MockShell>
  );
}

function SwapMock() {
  return (
    <MockShell>
      <div className="text-sm font-semibold text-white">Convert</div>
      <div className="mt-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3">
        <div className="text-xs text-[var(--color-muted)]">You pay</div>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-xl font-semibold tabular-nums text-white">1,000</span>
          <span className="flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-sm text-white">
            <AssetCoin symbol="USDT" size={20} /> USDT
          </span>
        </div>
      </div>
      <div className="my-1.5 flex justify-center">
        <div className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
          <ArrowLeftRight className="h-4 w-4 rotate-90 text-[var(--color-muted)]" />
        </div>
      </div>
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3">
        <div className="text-xs text-[var(--color-muted)]">You receive</div>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-xl font-semibold tabular-nums text-white">0.01558</span>
          <span className="flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-sm text-white">
            <AssetCoin symbol="BTC" size={20} /> BTC
          </span>
        </div>
      </div>
      <div className="mt-3 rounded-full spectrum-bg py-2.5 text-center text-sm font-semibold">Swap</div>
    </MockShell>
  );
}

function P2PMock() {
  return (
    <MockShell>
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-white">Escrow protected</div>
        <span className="rounded-full bg-[var(--color-up-bg)] px-2.5 py-1 text-xs font-medium text-[var(--color-up)]">
          Locked
        </span>
      </div>
      <div className="mt-3 flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3">
        <AssetCoin symbol="USDT" size={30} />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-white">Buy 500 USDT</div>
          <div className="text-xs text-[var(--color-muted)]">₦825,000 · with USDTBaron</div>
        </div>
        <BadgeCheck className="h-4 w-4 text-[var(--color-accent)]" />
      </div>
      <div className="mt-3 space-y-2">
        <div className="flex justify-start">
          <div className="max-w-[80%] rounded-lg bg-[var(--color-surface-2)] px-3 py-1.5 text-xs text-white">
            Payment sent — check your bank.
          </div>
        </div>
        <div className="flex justify-end">
          <div className="max-w-[80%] rounded-lg spectrum-bg px-3 py-1.5 text-xs">Received, releasing now ✓</div>
        </div>
      </div>
    </MockShell>
  );
}
