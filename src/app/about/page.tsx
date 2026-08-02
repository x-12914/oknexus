import Link from "next/link";
import type { CSSProperties } from "react";
import {
  ShieldCheck,
  Lock,
  BadgeCheck,
  Users,
  ArrowRight,
  Sparkles,
  Zap,
  Globe,
  CheckCircle2,
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

export const metadata = {
  title: "About OKNexus - Connecting You to the Future of Finance",
  description:
    "OKNexus is a digital asset exchange built on speed, transparency, and genuine security. Discover our mission, values, and compliance-first architecture.",
};

const BELIEFS = [
  {
    icon: ShieldCheck,
    title: "Security first",
    desc: "Encryption, cold storage, and 24/7 monitoring aren't optional extras - they're the foundation everything else is built on.",
  },
  {
    icon: BadgeCheck,
    title: "Compliance is a feature, not friction",
    desc: "KYC and AML controls protect our users and the long-term integrity of the platform.",
  },
  {
    icon: Users,
    title: "Access for everyone",
    desc: "From a first-time buyer to an OTC desk client, every product is designed to be usable without sacrificing depth.",
  },
];

const STATS = [
  { value: "100%", label: "On-chain Custody", sub: "Verifiable user balances" },
  { value: "24/7", label: "Real-time Monitoring", sub: "Bank-grade threat detection" },
  { value: "<1ms", label: "Matching Engine", sub: "Ultra-low latency execution" },
  { value: "0", label: "Security Breaches", sub: "Built on battle-tested infrastructure" },
];

export default function AboutPage() {
  return (
    <div className="relative min-h-screen overflow-x-clip" style={landingStyle}>
      {/* Ambient background glow */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[900px]">
        <div
          className="absolute left-1/2 top-[-160px] h-[520px] w-[820px] -translate-x-1/2 rounded-full blur-3xl"
          style={{ background: "radial-gradient(50% 50% at 50% 50%, rgba(124,92,246,0.25), transparent 70%)" }}
        />
      </div>

      <LandingHeader />

      <main className="mx-auto max-w-6xl px-4 pb-24 pt-20 md:pt-28">
        {/* Header Hero */}
        <section className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold text-[var(--color-accent)] backdrop-blur mb-6">
            <Sparkles className="h-3.5 w-3.5" /> About OKNexus
          </div>
          <h1 className="mx-auto max-w-4xl text-4xl font-semibold leading-[1.08] tracking-tight text-white sm:text-6xl md:text-7xl">
            Connecting you to the <span className="spectrum-text-anim">future of finance</span>
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-relaxed text-[var(--color-muted)] sm:text-xl">
            OKNexus is a digital asset exchange built on one idea: trading crypto should be fast,
            transparent, and genuinely safe - not just for professionals, but for everyone.
          </p>
        </section>

        {/* Stats Grid */}
        <section className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 p-6 text-center">
              <div className="text-3xl font-bold tracking-tight text-white sm:text-4xl">{s.value}</div>
              <div className="mt-2 text-sm font-semibold text-[var(--color-foreground)]">{s.label}</div>
              <div className="mt-1 text-xs text-[var(--color-muted)]">{s.sub}</div>
            </div>
          ))}
        </section>

        {/* Mission Section */}
        <section className="mt-24 rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)]/70 p-8 md:p-12">
          <div className="grid gap-8 md:grid-cols-[1fr_1.2fr] md:items-center">
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest text-[var(--color-accent)]">
                Our mission
              </span>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-4xl">
                Built to solve the trust dilemma
              </h2>
              <p className="mt-4 leading-relaxed text-[var(--color-muted)]">
                We built OKNexus because too many exchanges make people choose between ease of use and real security.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm leading-relaxed text-white/90 backdrop-blur">
              <p>
                Our platform brings spot trading, instant swaps, a fiat ramp, an OTC desk, and peer-to-peer
                trading into one unified account - backed by real on-chain custody, cold storage, and compliance controls from day one.
              </p>
              <div className="mt-6 flex flex-wrap gap-4 pt-4 border-t border-white/10 text-xs text-[var(--color-muted)]">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-[var(--color-up)]" /> Real custody
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-[var(--color-up)]" /> Global compliance
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-[var(--color-up)]" /> Unified engine
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* What We Believe */}
        <section className="mt-24">
          <div className="text-center">
            <span className="text-xs font-semibold uppercase tracking-widest text-[var(--color-accent)]">
              Core values
            </span>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-4xl">
              What we believe
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-[var(--color-muted)]">
              The non-negotiable principles that guide every feature we design and every line of code we write.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {BELIEFS.map((b) => (
              <div key={b.title} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 p-7 transition-all hover:-translate-y-1">
                <div className="grid h-12 w-12 place-items-center rounded-xl spectrum-bg text-white">
                  <b.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-white">{b.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">{b.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mt-24 rounded-3xl spectrum-bg p-10 text-center relative overflow-hidden">
          <div className="relative z-10 mx-auto max-w-2xl">
            <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
              Ready to experience a better exchange?
            </h2>
            <p className="mt-4 text-white/85">
              Join thousands of traders using OKNexus for spot trading, swaps, and P2P liquidity.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3 text-sm font-semibold text-[#0b0a12] transition-colors hover:bg-white/90"
              >
                Create free account <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/trade/BTC-USDT"
                className="inline-flex items-center gap-2 rounded-full border border-white/40 px-7 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                Explore markets
              </Link>
            </div>
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
                <li><Link href="/explore" className="hover:text-white">Privacy Policy</Link></li>
                <li><Link href="/explore" className="hover:text-white">Terms of Service</Link></li>
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
