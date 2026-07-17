import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Receipt,
  Gift,
  CreditCard,
  Rocket,
  Code,
  Globe,
  PiggyBank,
  Sparkles,
  Coins,
  ArrowUpRight,
} from "lucide-react";

type Feature = { icon: LucideIcon; title: string; desc: string };

/** Live products, linked so people can jump straight into what already works. */
const LIVE: { href: string; label: string }[] = [
  { href: "/trade/BTC-USDT", label: "Spot Trading" },
  { href: "/convert", label: "Convert" },
  { href: "/buy", label: "Buy & Sell" },
  { href: "/p2p", label: "P2P Marketplace" },
  { href: "/wallet", label: "Wallet" },
];

/** The roadmap, mirrored from the Oknexus preview's "coming soon" section. */
const ROADMAP: Feature[] = [
  { icon: Receipt, title: "Bills Payment", desc: "Pay utility bills, airtime, and data subscriptions directly from your balance — one place for it all." },
  { icon: Gift, title: "Gift Card Marketplace", desc: "Buy and sell gift cards securely within the platform, with the same protections as any other trade." },
  { icon: CreditCard, title: "Crypto Cards", desc: "A modern way to spend digital assets in everyday transactions, wherever cards are accepted." },
  { icon: Rocket, title: "Launchpad", desc: "List and launch new or existing tokens with a straightforward path to market." },
  { icon: Code, title: "Developer API", desc: "Build on top of the ecosystem — integrate trading, wallets, and rates directly into your own products." },
  { icon: Globe, title: "Borderless Payments", desc: "Send and receive payments globally, with speed and security, wherever you're sending from or to." },
  { icon: PiggyBank, title: "Staking", desc: "Put idle balances to work through products built for holders, not just traders." },
  { icon: Sparkles, title: "Exclusive Airdrops", desc: "Early access and reward drops for the users who help shape the platform early." },
  { icon: Coins, title: "OKN Native Token", desc: "One token, unlimited possibilities — the native token at the center of the ecosystem." },
];

const SUB = "We're steadily expanding the ecosystem beyond trading — here's what's landing next.";

const GOLD = "#f5b942";

export function ComingSoonHub() {
  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-6xl">
        {/* Available now */}
        <div className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
          Available now
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {LIVE.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/50 px-3 py-1.5 text-xs font-medium transition-colors hover:border-[var(--color-accent)]"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              {l.label}
              <ArrowUpRight className="h-3 w-3 text-[var(--color-muted)]" />
            </Link>
          ))}
        </div>

        {/* On the roadmap */}
        <div className="mt-12">
          <span
            className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium"
            style={{ color: GOLD, backgroundColor: "rgba(245,185,66,0.12)", borderColor: "rgba(245,185,66,0.3)" }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: GOLD }} />
            On the roadmap
          </span>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight">More ways to move, coming to Oknexus.</h1>
          <p className="mt-3 max-w-2xl leading-relaxed text-[var(--color-muted)]">{SUB}</p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ROADMAP.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/40 p-5 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{ backgroundColor: "rgba(245,185,66,0.12)", color: GOLD }}
                  >
                    <f.icon className="h-5 w-5" />
                  </div>
                  <span
                    className="rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide"
                    style={{ color: GOLD, backgroundColor: "rgba(245,185,66,0.12)", borderColor: "rgba(245,185,66,0.3)" }}
                  >
                    Coming Soon
                  </span>
                </div>
                <h3 className="mt-4 font-semibold">{f.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-[var(--color-muted)]">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
