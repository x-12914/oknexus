import Link from "next/link";
import {
  ShieldCheck,
  Sparkles,
  Lock,
  Globe2,
  CandlestickChart,
  ArrowLeftRight,
  CreditCard,
  BarChart3,
  Briefcase,
  Users,
  ArrowRight,
  Fingerprint,
  Snowflake,
  ShieldAlert,
  Eye,
  Check,
} from "lucide-react";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { LiveMarkets } from "@/components/landing/LiveMarkets";
import { Logo } from "@/components/brand/Logo";

const PILLARS = [
  {
    icon: ShieldCheck,
    title: "Trust",
    desc: "Transparency and reliability in every interaction. Your assets and data are handled with integrity.",
  },
  {
    icon: Sparkles,
    title: "Innovation",
    desc: "Cutting-edge technology and continuous improvement across the entire platform.",
  },
  {
    icon: Lock,
    title: "Security",
    desc: "Multi-layer protection — encryption, 2FA, cold storage, and around-the-clock monitoring.",
  },
  {
    icon: Globe2,
    title: "Accessibility",
    desc: "Digital assets made simple and inclusive — for everyone, everywhere, on any device.",
  },
];

const PRODUCTS = [
  {
    icon: CandlestickChart,
    title: "Spot Trading",
    desc: "Buy, sell, and trade multiple cryptocurrencies on a fast, intuitive engine with real-time charts.",
    href: "/trade/BTC-USDT",
  },
  {
    icon: ArrowLeftRight,
    title: "Instant Swap",
    desc: "Convert between your favorite assets in seconds at a locked, transparent rate.",
    href: "/swap",
  },
  {
    icon: CreditCard,
    title: "Crypto Ramp",
    desc: "Move seamlessly between fiat and crypto with cards, bank transfers, and local rails.",
    href: "/buy",
  },
  {
    icon: BarChart3,
    title: "Deep Liquidity",
    desc: "Real-time order books and market depth across markets, powered by a high-performance engine.",
    href: "/trade/BTC-USDT",
  },
  {
    icon: Briefcase,
    title: "OTC Desk",
    desc: "Execute large-volume trades privately and securely, with minimal market impact.",
    href: "/otc",
  },
  {
    icon: Users,
    title: "P2P Trading",
    desc: "Trade directly with other users, protected end-to-end by automated escrow.",
    href: "/p2p",
  },
];

const SECURITY = [
  { icon: Lock, title: "End-to-end encryption", desc: "SSL and E2E encryption protect every request and session." },
  { icon: Fingerprint, title: "Two-factor authentication", desc: "Layered account protection with 2FA and device verification." },
  { icon: Snowflake, title: "Cold storage", desc: "The majority of assets held offline in secure cold wallets." },
  { icon: ShieldAlert, title: "Fraud detection", desc: "Real-time risk scoring and suspicious-activity monitoring." },
  { icon: Eye, title: "Anti-phishing", desc: "Login alerts, IP monitoring, and anti-phishing safeguards." },
  { icon: ShieldCheck, title: "Compliance-first", desc: "Built to meet global standards with KYC and AML controls." },
];

const STATS = [
  { value: "6", label: "Integrated products" },
  { value: "24/7", label: "Global access" },
  { value: "Real-time", label: "Market data" },
  { value: "Bank-grade", label: "Security" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <LandingHeader />

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-14 md:grid-cols-2 md:pt-24">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1 text-xs text-[var(--color-muted)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-up)]" />
                Connecting you to the future of finance
              </span>
              <h1 className="mt-5 text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
                The next-generation <span className="text-gradient">digital asset</span> exchange
              </h1>
              <p className="mt-5 max-w-lg text-lg leading-relaxed text-[var(--color-muted)]">
                OKNexus Exchange is the bridge between traditional finance and the future of
                digital assets — secure, fast, and built for everyone from first-time users to
                institutions.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/trade/BTC-USDT"
                  className="btn-brand inline-flex items-center gap-1.5 rounded-lg px-5 py-3 text-sm font-medium"
                >
                  Start Trading <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/swap"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-3 text-sm font-medium hover:bg-[var(--color-surface-2)]"
                >
                  Try Instant Swap
                </Link>
              </div>
              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-[var(--color-muted)]">
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
            </div>
            <LiveMarkets />
          </div>
        </section>

        {/* Pillars */}
        <section id="pillars" className="mx-auto max-w-6xl px-4 py-16">
          <SectionHeading
            eyebrow="Brand principles"
            title="Built on principles that matter"
            subtitle="Every interaction with OKNexus reflects our dedication to transparency, reliability, and continuous innovation."
          />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PILLARS.map((p) => (
              <div key={p.title} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-[var(--color-accent)]/10 text-[var(--color-accent)]">
                  <p.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-semibold">{p.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-muted)]">{p.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Ecosystem */}
        <section id="ecosystem" className="mx-auto max-w-6xl px-4 py-16">
          <SectionHeading
            eyebrow="The ecosystem"
            title="One platform, a complete ecosystem"
            subtitle="Cryptocurrency trading, fiat on/off ramps, digital asset management, and more — designed to grow with you."
          />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PRODUCTS.map((p) => (
              <Link
                key={p.title}
                href={p.href}
                className="group rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition-colors hover:border-[var(--color-accent)]/40"
              >
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-gradient text-white shadow-[0_6px_18px_rgba(139,92,246,0.35)]">
                  <p.icon className="h-5 w-5" />
                </div>
                <div className="mt-4 flex items-center gap-1.5">
                  <h3 className="font-semibold">{p.title}</h3>
                  <ArrowRight className="h-4 w-4 -translate-x-1 text-[var(--color-muted)] opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-muted)]">{p.desc}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* Security */}
        <section id="security" className="border-y border-[var(--color-border)] bg-[var(--color-surface)]/60">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-[0.9fr_1.1fr] md:items-center">
            <div>
              <span className="text-xs font-medium uppercase tracking-widest text-[var(--color-accent)]">
                Security &amp; compliance
              </span>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
                Security at the core of everything
              </h2>
              <p className="mt-4 max-w-md leading-relaxed text-[var(--color-muted)]">
                We combine robust security with a compliance-first approach, so you can participate
                in the digital economy with confidence. World-class infrastructure protects your
                assets around the clock.
              </p>
              <Link
                href="/trade/BTC-USDT"
                className="btn-brand mt-6 inline-flex items-center gap-1.5 rounded-lg px-5 py-3 text-sm font-medium"
              >
                Explore the platform <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {SECURITY.map((s) => (
                <div key={s.title} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-4">
                  <s.icon className="h-5 w-5 text-[var(--color-accent)]" />
                  <h3 className="mt-3 text-sm font-semibold">{s.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-[var(--color-muted)]">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Company / vision */}
        <section id="company" className="mx-auto max-w-4xl px-4 py-20 text-center">
          <span className="text-xs font-medium uppercase tracking-widest text-[var(--color-accent)]">
            Our vision
          </span>
          <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-tight md:text-4xl">
            We believe the future of finance is{" "}
            <span className="text-gradient">digital, borderless, and powered by innovation</span>.
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[var(--color-muted)]">
            Our mission is to make digital assets simple, accessible, and trustworthy for everyone —
            from first-time users to professional traders and institutional clients. We are building
            a platform that meets global standards while creating new opportunities for financial
            inclusion and economic growth.
          </p>

          <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                <div className="text-2xl font-semibold text-gradient md:text-3xl">{s.value}</div>
                <div className="mt-1 text-xs text-[var(--color-muted)]">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="mx-auto max-w-6xl px-4 pb-20">
          <div className="relative overflow-hidden rounded-3xl border border-[var(--color-border)] bg-brand-gradient px-6 py-14 text-center text-white">
            <div className="relative z-10">
              <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight md:text-4xl">
                Connecting you to the future of finance
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-white/80">
                Join OKNexus Exchange and start trading digital assets with confidence today.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link
                  href="/trade/BTC-USDT"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-[#1a1830] hover:bg-white/90"
                >
                  Get Started <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/p2p"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/40 px-6 py-3 text-sm font-semibold hover:bg-white/10"
                >
                  Explore P2P
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--color-border)]">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="max-w-xs">
              <Logo />
              <p className="mt-3 text-sm leading-relaxed text-[var(--color-muted)]">
                OKNexus Exchange — Connecting You to the Future of Finance.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
              <FooterCol
                title="Products"
                links={[
                  ["Spot Trading", "/trade/BTC-USDT"],
                  ["Instant Swap", "/swap"],
                  ["Crypto Ramp", "/buy"],
                  ["OTC Desk", "/otc"],
                  ["P2P Trading", "/p2p"],
                ]}
              />
              <FooterCol
                title="Company"
                links={[
                  ["Why OKNexus", "#pillars"],
                  ["Ecosystem", "#ecosystem"],
                  ["Security", "#security"],
                  ["Vision", "#company"],
                ]}
              />
              <FooterCol
                title="Get started"
                links={[
                  ["Launch App", "/trade/BTC-USDT"],
                  ["Dashboard", "/dashboard"],
                ]}
              />
            </div>
          </div>
          <div className="mt-10 flex flex-col gap-2 border-t border-[var(--color-border)] pt-6 text-xs text-[var(--color-muted)] sm:flex-row sm:items-center sm:justify-between">
            <span>© {2025} OKNexus Exchange. All rights reserved.</span>
            <span>Demo platform · live market data via Binance · not financial advice.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="max-w-2xl">
      <span className="text-xs font-medium uppercase tracking-widest text-[var(--color-accent)]">
        {eyebrow}
      </span>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">{title}</h2>
      <p className="mt-3 leading-relaxed text-[var(--color-muted)]">{subtitle}</p>
    </div>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <div className="text-sm font-semibold">{title}</div>
      <ul className="mt-3 space-y-2">
        {links.map(([label, href]) => (
          <li key={label}>
            <Link href={href} className="text-sm text-[var(--color-muted)] hover:text-[var(--color-foreground)]">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
