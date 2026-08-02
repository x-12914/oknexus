"use client";

import { useState } from "react";
import Link from "next/link";
import type { CSSProperties } from "react";
import {
  Heart,
  BookOpen,
  ShieldAlert,
  Globe2,
  Sparkles,
  Send,
  Loader2,
  CheckCircle2,
  Users,
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

const PILLARS = [
  {
    icon: BookOpen,
    title: "Financial Literacy & Education",
    desc: "We fund free workshops, translations, and learning tools so anyone in emerging economies can navigate digital finance safely.",
  },
  {
    icon: ShieldAlert,
    title: "Open Source Security & Research",
    desc: "We sponsor open-source security audits, zero-knowledge research, and developer grants to keep the entire crypto ecosystem safe.",
  },
  {
    icon: Globe2,
    title: "Humanitarian & Disaster Relief",
    desc: "Direct, transparent crypto disbursements to vetted grassroots organizations providing emergency aid during global crises.",
  },
];

export default function WeCarePage() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [cause, setCause] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 750);
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
            <Heart className="h-3.5 w-3.5 text-[var(--color-down)] fill-current" /> OKNexus We Care
          </div>
          <h1 className="mx-auto max-w-4xl text-4xl font-semibold leading-[1.08] tracking-tight text-white sm:text-6xl md:text-7xl">
            Community &amp; <span className="spectrum-text-anim">social impact</span>
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-relaxed text-[var(--color-muted)] sm:text-xl">
            OKNexus exists because of the people who trade, build, and grow with us. We Care is how we give back
            to that community and the wider world.
          </p>
        </section>

        {/* Impact Pillars */}
        <section className="mt-20">
          <div className="text-center">
            <span className="text-xs font-semibold uppercase tracking-widest text-[var(--color-accent)]">
              Our Commitments
            </span>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-4xl">
              How we make a difference
            </h2>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {PILLARS.map((p) => (
              <div key={p.title} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 p-7 transition-all hover:-translate-y-1">
                <div className="grid h-12 w-12 place-items-center rounded-xl spectrum-bg text-white">
                  <p.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-white">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">{p.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Nominate an Initiative */}
        <section className="mt-24 rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)]/70 p-8 md:p-12">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-surface-2)] px-3 py-1.5 text-xs font-semibold text-white">
                <Users className="h-4 w-4 text-[var(--color-accent)]" /> Community Grants Program
              </div>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-white md:text-4xl">
                Nominate a cause or community project
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-[var(--color-muted)]">
                Know an open-source project, local financial literacy campaign, or relief effort that needs funding? We allocate 1% of platform fees directly into community grants.
              </p>
            </div>

            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-2)]/60 p-6 md:p-8 backdrop-blur">
              {submitted ? (
                <div className="py-8 text-center">
                  <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[var(--color-up-bg)] text-[var(--color-up)]">
                    <CheckCircle2 className="h-7 w-7" />
                  </div>
                  <h3 className="mt-4 text-xl font-bold text-white">Nomination Submitted!</h3>
                  <p className="mt-2 text-sm text-[var(--color-muted)]">
                    Thank you for sharing this cause with us. Our We Care committee reviews proposals every month and will follow up via email.
                  </p>
                  <button
                    onClick={() => setSubmitted(false)}
                    className="mt-6 text-xs font-semibold text-[var(--color-accent)] hover:underline"
                  >
                    Nominate another cause
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">Submit a Nomination</h3>

                  <div>
                    <label className="block text-xs font-medium text-[var(--color-muted)]">Your Name</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Alex Rivera"
                      className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none focus:border-[var(--color-accent)]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[var(--color-muted)]">Your Email</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="alex@example.com"
                      className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none focus:border-[var(--color-accent)]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[var(--color-muted)]">Project or Cause Details</label>
                    <textarea
                      rows={3}
                      required
                      value={cause}
                      onChange={(e) => setCause(e.target.value)}
                      placeholder="Describe the initiative, website link, and how OKNexus funding can make an impact..."
                      className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none focus:border-[var(--color-accent)]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="spectrum-bg flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Send Nomination
                  </button>
                </form>
              )}
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
