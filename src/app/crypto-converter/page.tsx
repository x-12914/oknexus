"use client";

import { useState } from "react";
import Link from "next/link";
import type { CSSProperties } from "react";
import {
  ArrowLeftRight,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Zap,
  Sparkles,
  ShoppingBag,
  Repeat,
  BarChart3,
} from "lucide-react";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { SocialLinks } from "@/components/landing/SocialLinks";
import { Logo } from "@/components/brand/Logo";
import { AssetCoin } from "@/components/swap/AssetSelect";

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

const USD_RATES: Record<string, number> = {
  BTC: 64180.4,
  ETH: 3450.2,
  SOL: 182.5,
  BNB: 580.1,
  XRP: 0.62,
  ADA: 0.45,
  USDT: 1.0,
  USD: 1.0,
  EUR: 1.09,
  GBP: 1.28,
  NGN: 0.00065,
};

const ASSET_NAMES: Record<string, string> = {
  BTC: "Bitcoin",
  ETH: "Ethereum",
  SOL: "Solana",
  BNB: "BNB Smart Chain",
  XRP: "Ripple",
  ADA: "Cardano",
  USDT: "Tether USD",
  USD: "US Dollar",
  EUR: "Euro",
  GBP: "British Pound",
  NGN: "Nigerian Naira",
};

const SUPPORTED_LIST = ["BTC", "ETH", "SOL", "BNB", "XRP", "ADA", "USDT", "USD", "EUR", "GBP", "NGN"];

export default function CryptoConverterPage() {
  const [fromAsset, setFromAsset] = useState("BTC");
  const [toAsset, setToAsset] = useState("USDT");
  const [amount, setAmount] = useState<string>("1");

  const numAmount = parseFloat(amount) || 0;
  const fromUsd = USD_RATES[fromAsset] || 1;
  const toUsd = USD_RATES[toAsset] || 1;

  // Amount in USD = numAmount * fromUsd
  // Converted amount = (numAmount * fromUsd) / toUsd
  const convertedValue = (numAmount * fromUsd) / toUsd;
  const singleUnitRate = fromUsd / toUsd;

  const handleSwapDirection = () => {
    setFromAsset(toAsset);
    setToAsset(fromAsset);
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
            <ArrowLeftRight className="h-3.5 w-3.5" /> Crypto Rate Converter
          </div>
          <h1 className="mx-auto max-w-4xl text-4xl font-semibold leading-[1.08] tracking-tight text-white sm:text-6xl md:text-7xl">
            Live rates <span className="spectrum-text-anim">between any assets</span>
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-relaxed text-[var(--color-muted)] sm:text-xl">
            Check the current exchange rate between any two supported assets or currencies - no account required.
          </p>
        </section>

        {/* Interactive Converter Box */}
        <section className="mt-14 max-w-2xl mx-auto rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-6 md:p-10 backdrop-blur shadow-2xl">
          {/* FROM SECTION */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)] mb-2">
              You Convert From
            </label>
            <div className="flex items-center justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="1"
                className="w-full bg-transparent text-2xl font-bold tabular-nums text-white outline-none"
              />
              <div className="flex items-center gap-2 shrink-0 pl-3 border-l border-white/10">
                <AssetCoin symbol={fromAsset} size={24} />
                <select
                  value={fromAsset}
                  onChange={(e) => setFromAsset(e.target.value)}
                  className="bg-transparent text-base font-bold text-white outline-none cursor-pointer"
                >
                  {SUPPORTED_LIST.map((s) => (
                    <option key={s} value={s} className="bg-[#100d1c] text-white">
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* SWAP ICON BUTTON */}
          <div className="my-3 flex justify-center">
            <button
              onClick={handleSwapDirection}
              aria-label="Swap direction"
              className="grid h-10 w-10 place-items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-accent)] transition-transform hover:scale-110 hover:border-[var(--color-accent)]"
            >
              <ArrowLeftRight className="h-4 w-4 rotate-90" />
            </button>
          </div>

          {/* TO SECTION */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)] mb-2">
              You Convert To
            </label>
            <div className="flex items-center justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
              <div className="text-2xl font-bold tabular-nums text-[var(--color-up)]">
                {convertedValue.toLocaleString(undefined, {
                  maximumFractionDigits: convertedValue < 1 ? 6 : 4,
                })}
              </div>
              <div className="flex items-center gap-2 shrink-0 pl-3 border-l border-white/10">
                <AssetCoin symbol={toAsset} size={24} />
                <select
                  value={toAsset}
                  onChange={(e) => setToAsset(e.target.value)}
                  className="bg-transparent text-base font-bold text-white outline-none cursor-pointer"
                >
                  {SUPPORTED_LIST.map((s) => (
                    <option key={s} value={s} className="bg-[#100d1c] text-white">
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Rate Summary */}
          <div className="mt-6 flex items-center justify-between text-xs text-[var(--color-muted)] pt-3 border-t border-white/10">
            <span>Exchange Rate</span>
            <span className="font-semibold text-white tabular-nums">
              1 {fromAsset} = {singleUnitRate.toLocaleString(undefined, { maximumFractionDigits: 6 })} {toAsset}
            </span>
          </div>

          {/* Direct Action Links */}
          <div className="mt-8 pt-6 border-t border-[var(--color-border)]">
            <div className="text-xs font-semibold uppercase tracking-wider text-center text-[var(--color-muted)] mb-4">
              Act on this rate directly
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <Link
                href="/buy"
                className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 py-3 px-2 transition-all hover:border-[var(--color-accent)] hover:bg-white/10"
              >
                <ShoppingBag className="h-4 w-4 text-[var(--color-accent)] mb-1" />
                <span className="text-xs font-semibold text-white">Buy {fromAsset}</span>
              </Link>
              <Link
                href="/swap"
                className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 py-3 px-2 transition-all hover:border-[var(--color-accent)] hover:bg-white/10"
              >
                <Repeat className="h-4 w-4 text-[var(--color-up)] mb-1" />
                <span className="text-xs font-semibold text-white">Swap Now</span>
              </Link>
              <Link
                href="/trade/BTC-USDT"
                className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 py-3 px-2 transition-all hover:border-[var(--color-accent)] hover:bg-white/10"
              >
                <BarChart3 className="h-4 w-4 text-[var(--color-accent)] mb-1" />
                <span className="text-xs font-semibold text-white">Trade Market</span>
              </Link>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="mt-20">
          <div className="text-center">
            <span className="text-xs font-semibold uppercase tracking-widest text-[var(--color-accent)]">
              Converter usage
            </span>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-4xl">
              How it works
            </h2>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {[
              { num: "01", title: "Select Source Asset", desc: "Select the asset or currency you are converting from." },
              { num: "02", title: "Select Target Asset", desc: "Select what you want to convert to." },
              { num: "03", title: "See Live Conversion", desc: "Enter an amount to see the live converted value, updated in real time." },
            ].map((step) => (
              <div key={step.num} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 p-6 text-center sm:text-left">
                <span className="text-2xl font-extrabold text-[var(--color-accent)]">{step.num}</span>
                <h3 className="mt-3 font-semibold text-white">{step.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-[var(--color-muted)]">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Supported Assets Grid */}
        <section className="mt-20">
          <div className="text-center">
            <span className="text-xs font-semibold uppercase tracking-widest text-[var(--color-accent)]">
              Coverage
            </span>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-4xl">
              Supported assets &amp; currencies
            </h2>
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              BTC, ETH, SOL, BNB, XRP, ADA, USDT, and major fiat currencies.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {SUPPORTED_LIST.map((s) => (
              <div
                key={s}
                className="flex items-center gap-2.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5"
              >
                <AssetCoin symbol={s} size={24} />
                <span className="text-sm font-semibold text-white">{s}</span>
                <span className="text-xs text-[var(--color-muted)]">({ASSET_NAMES[s]})</span>
              </div>
            ))}
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
                <li><Link href="/rate-calculator" className="hover:text-white">Rate Calculator</Link></li>
                <li><Link href="/crypto-converter" className="hover:text-white">Crypto Converter</Link></li>
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
