"use client";

import { useState } from "react";
import Link from "next/link";
import type { CSSProperties } from "react";
import {
  Calculator,
  ArrowRight,
  Info,
  CheckCircle2,
  Sparkles,
  HelpCircle,
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

const PRODUCTS = [
  { id: "spot_maker", label: "Spot (Maker)", rate: 0.001, rateText: "0.10%", target: "/trade/BTC-USDT" },
  { id: "spot_taker", label: "Spot (Taker)", rate: 0.002, rateText: "0.20%", target: "/trade/BTC-USDT" },
  { id: "swap", label: "Instant Swap", rate: 0.0, rateText: "Built into quote", target: "/swap" },
  { id: "buy", label: "Buy & Sell", rate: 0.0, rateText: "Shown in quote", target: "/buy" },
  { id: "otc", label: "OTC Desk", rate: 0.0, rateText: "Firm quote (0%)", target: "/otc" },
];

const PRICES: Record<string, number> = {
  BTC: 64180.4,
  ETH: 3450.2,
  SOL: 182.5,
  BNB: 580.1,
  XRP: 0.62,
  ADA: 0.45,
  USDT: 1.0,
};

const FEE_TABLE = [
  { product: "Spot Trading (maker)", fee: "0.10%", note: "Post resting order on order book" },
  { product: "Spot Trading (taker)", fee: "0.20%", note: "Execute against existing order book liquidity" },
  { product: "Instant Swap", fee: "Built into quoted rate", note: "Zero extra fee, locked rate refreshes every few seconds" },
  { product: "Buy & Sell Crypto", fee: "Shown in quote before confirmation", note: "Includes local bank & card gateway processing" },
  { product: "OTC Desk", fee: "Firm quote, no additional fee", note: "Private execution for large trades with zero market impact" },
  { product: "P2P Marketplace", fee: "0% taker fee", note: "Escrow protected peer-to-peer trading" },
];

export default function RateCalculatorPage() {
  const [product, setProduct] = useState(PRODUCTS[0]);
  const [asset, setAsset] = useState("BTC");
  const [amount, setAmount] = useState<string>("1000");

  const numAmount = parseFloat(amount) || 0;
  const assetPrice = PRICES[asset] || 1;
  const notionalUsd = numAmount * (asset === "USDT" ? 1 : assetPrice);
  const estimatedFeeUsd = notionalUsd * product.rate;
  const netUsd = notionalUsd - estimatedFeeUsd;

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
            <Calculator className="h-3.5 w-3.5" /> Rate &amp; Fee Calculator
          </div>
          <h1 className="mx-auto max-w-4xl text-4xl font-semibold leading-[1.08] tracking-tight text-white sm:text-6xl md:text-7xl">
            Estimate fees <span className="spectrum-text-anim">before you trade</span>
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-relaxed text-[var(--color-muted)] sm:text-xl">
            See exactly what a trade will cost - across Spot Trading, Instant Swap, Buy &amp; Sell, and OTC - before you commit.
          </p>
        </section>

        {/* Calculator Widget */}
        <section className="mt-14 max-w-3xl mx-auto rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-6 md:p-10 backdrop-blur shadow-2xl">
          {/* Product selector */}
          <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)] mb-3">
            1. Select Product
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {PRODUCTS.map((p) => (
              <button
                key={p.id}
                onClick={() => setProduct(p)}
                className={`rounded-xl py-2.5 px-3 text-xs font-semibold transition-all ${
                  product.id === p.id
                    ? "spectrum-bg text-white shadow-lg"
                    : "border border-white/10 bg-white/5 text-[var(--color-muted)] hover:bg-white/10 hover:text-white"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Asset & Amount Inputs */}
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)] mb-2">
                2. Select Asset
              </label>
              <select
                value={asset}
                onChange={(e) => setAsset(e.target.value)}
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-3 text-sm font-semibold text-white outline-none focus:border-[var(--color-accent)]"
              >
                {Object.keys(PRICES).map((symbol) => (
                  <option key={symbol} value={symbol}>
                    {symbol} (${PRICES[symbol].toLocaleString()})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)] mb-2">
                3. Trade Amount ({asset})
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="1000"
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-3 text-sm font-semibold text-white outline-none focus:border-[var(--color-accent)]"
              />
            </div>
          </div>

          {/* Estimation Breakdown */}
          <div className="mt-8 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-2)]/60 p-6 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--color-muted)]">Estimated Notional Value</span>
              <span className="font-semibold text-white tabular-nums">${notionalUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--color-muted)]">Fee Rate</span>
              <span className="font-semibold text-[var(--color-accent)]">{product.rateText}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--color-muted)]">Estimated Fee Amount</span>
              <span className="font-semibold text-[var(--color-down)] tabular-nums">
                {product.rate > 0 ? `$${estimatedFeeUsd.toFixed(2)}` : "$0.00"}
              </span>
            </div>
            <div className="pt-3 border-t border-white/10 flex items-center justify-between text-base font-bold">
              <span className="text-white">Net Settled Value</span>
              <span className="text-[var(--color-up)] tabular-nums">${netUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-[var(--color-muted)]">
              <Info className="h-4 w-4 text-[var(--color-accent)] shrink-0" />
              <span>Calculated live based on platform fee schedule. No surprise charges.</span>
            </div>
            <Link
              href={product.target}
              className="spectrum-bg w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 shrink-0"
            >
              Trade Now <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        {/* How It Works */}
        <section className="mt-20">
          <div className="text-center">
            <span className="text-xs font-semibold uppercase tracking-widest text-[var(--color-accent)]">
              Step-by-step
            </span>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-4xl">
              How the calculator works
            </h2>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {[
              { num: "01", title: "Choose Product & Asset", desc: "Select whether you're trading Spot, Instant Swap, Buy & Sell, or OTC Desk." },
              { num: "02", title: "Enter Amount", desc: "Specify the crypto or fiat volume you plan to execute." },
              { num: "03", title: "Review Fees", desc: "See the exact fee rate, estimated cost, and net settled total instantly." },
            ].map((step) => (
              <div key={step.num} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 p-6">
                <span className="text-2xl font-extrabold text-[var(--color-accent)]">{step.num}</span>
                <h3 className="mt-3 font-semibold text-white">{step.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-[var(--color-muted)]">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Fee Reference Table */}
        <section className="mt-20">
          <div className="text-center">
            <span className="text-xs font-semibold uppercase tracking-widest text-[var(--color-accent)]">
              Official Schedule
            </span>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-4xl">
              Fee reference table
            </h2>
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              Transparent pricing with no hidden costs across every product.
            </p>
          </div>

          <div className="mt-8 overflow-x-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/60">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)]/80 text-xs font-semibold uppercase text-[var(--color-muted)]">
                <tr>
                  <th className="px-6 py-4">Product</th>
                  <th className="px-6 py-4">Fee Rate</th>
                  <th className="px-6 py-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {FEE_TABLE.map((row) => (
                  <tr key={row.product} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 font-semibold text-white">{row.product}</td>
                    <td className="px-6 py-4 font-bold text-[var(--color-accent)]">{row.fee}</td>
                    <td className="px-6 py-4 text-xs text-[var(--color-muted)]">{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
