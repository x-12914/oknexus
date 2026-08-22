"use client";

import { useState } from "react";
import Link from "next/link";
import type { CSSProperties } from "react";
import {
  Rocket,
  ShieldCheck,
  Zap,
  Briefcase,
  CheckCircle2,
  Send,
  Loader2,
  Sparkles,
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

const REASONS = [
  {
    icon: Rocket,
    title: "Ship things that matter",
    desc: "Every feature you build touches real money and real people - the bar is high, and so is the impact.",
  },
  {
    icon: ShieldCheck,
    title: "Security-minded culture",
    desc: "We treat security and compliance as core engineering problems, not a checkbox after launch.",
  },
  {
    icon: Zap,
    title: "Move fast, stay accountable",
    desc: "We ship quickly, but nothing goes out without proper review - especially anything touching custody or funds.",
  },
];

export default function CareersPage() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Engineering");
  const [link, setLink] = useState("");
  const [note, setNote] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 800);
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
            <Sparkles className="h-3.5 w-3.5" /> Careers at OKNexus
          </div>
          <h1 className="mx-auto max-w-4xl text-4xl font-semibold leading-[1.08] tracking-tight text-white sm:text-6xl md:text-7xl">
            Help build the <span className="spectrum-text-anim">future of finance</span>
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-relaxed text-[var(--color-muted)] sm:text-xl">
            We're a team of engineers, traders, and compliance specialists building a platform people can
            actually trust. If that sounds like your kind of problem, we'd like to meet you.
          </p>
        </section>

        {/* Why work at OKNexus */}
        <section className="mt-20">
          <div className="text-center">
            <span className="text-xs font-semibold uppercase tracking-widest text-[var(--color-accent)]">
              Culture &amp; Values
            </span>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-4xl">
              Why work at OKNexus
            </h2>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {REASONS.map((r) => (
              <div key={r.title} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 p-7 transition-all hover:-translate-y-1">
                <div className="grid h-12 w-12 place-items-center rounded-xl spectrum-bg text-white">
                  <r.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-white">{r.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">{r.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Open Roles Section */}
        <section className="mt-24 rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)]/70 p-8 md:p-12">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-surface-2)] px-3 py-1.5 text-xs font-semibold text-white">
                <Briefcase className="h-4 w-4 text-[var(--color-accent)]" /> Open Roles &amp; Talent Pool
              </div>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-white md:text-4xl">
                Current Opportunities
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-[var(--color-muted)]">
                We don't have active open roles right now, but we're always interested in meeting exceptional
                engineers, traders, and compliance professionals.
              </p>
              <div className="mt-6 space-y-3 text-xs text-[var(--color-muted)]">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[var(--color-up)]" /> Full-time remote &amp; hybrid positions
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[var(--color-up)]" /> Competitive crypto &amp; fiat compensation
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[var(--color-up)]" /> Direct ownership of high-impact products
                </div>
              </div>
            </div>

            {/* Talent Form */}
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-2)]/60 p-6 md:p-8 backdrop-blur">
              {submitted ? (
                <div className="py-8 text-center">
                  <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[var(--color-up-bg)] text-[var(--color-up)]">
                    <CheckCircle2 className="h-7 w-7" />
                  </div>
                  <h3 className="mt-4 text-xl font-bold text-white">Application Received!</h3>
                  <p className="mt-2 text-sm text-[var(--color-muted)]">
                    Thank you for reaching out. We've added your profile to our talent directory and will contact you when a matching role opens.
                  </p>
                  <button
                    onClick={() => setSubmitted(false)}
                    className="mt-6 text-xs font-semibold text-[var(--color-accent)] hover:underline"
                  >
                    Submit another response
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">Join our Talent Network</h3>
                  <p className="text-xs text-[var(--color-muted)]">
                    Send us your background and we'll reach out when an opening matches.
                  </p>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-medium text-[var(--color-muted)]">Full Name</label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Satoshi Nakamoto"
                        className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none focus:border-[var(--color-accent)]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[var(--color-muted)]">Email Address</label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="satoshi@oknexus.com"
                        className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none focus:border-[var(--color-accent)]"
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-medium text-[var(--color-muted)]">Area of Expertise</label>
                      <select
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none focus:border-[var(--color-accent)]"
                      >
                        <option value="Engineering">Engineering (Backend / Frontend)</option>
                        <option value="Security">Security &amp; Cryptography</option>
                        <option value="Compliance">Compliance &amp; Legal</option>
                        <option value="Trading">Trading &amp; Liquidity</option>
                        <option value="Product">Product &amp; Design</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[var(--color-muted)]">LinkedIn / GitHub / Portfolio</label>
                      <input
                        type="url"
                        value={link}
                        onChange={(e) => setLink(e.target.value)}
                        placeholder="https://github.com/yourprofile"
                        className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none focus:border-[var(--color-accent)]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[var(--color-muted)]">Tell us about what you build</label>
                    <textarea
                      rows={3}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Briefly describe your background, systems you've worked on, or what excites you about OKNexus..."
                      className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none focus:border-[var(--color-accent)]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="spectrum-bg flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Submit Application
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
