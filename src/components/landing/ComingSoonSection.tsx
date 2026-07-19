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
} from "lucide-react";
import { Reveal } from "@/components/landing/Reveal";

type Feature = { icon: LucideIcon; title: string; desc: string };

const GOLD = "#f5b942";
const GOLD_BG = "rgba(245,185,66,0.12)";
const GOLD_BORDER = "rgba(245,185,66,0.3)";

/** Mirrors the "coming soon" section of the Oknexus preview. */
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

const SUB = "Discover our upcoming products and innovations designed to expand your financial possibilities.";

export function ComingSoonSection() {
  return (
    <section id="explore" className="mx-auto max-w-6xl px-4 py-16 md:py-24 overflow-hidden">
      <div className="max-w-2xl">
        <span
          className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium"
          style={{ color: GOLD, backgroundColor: GOLD_BG, borderColor: GOLD_BORDER }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: GOLD }} />
          Explore
        </span>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white [text-wrap:balance] md:text-4xl">
          Upcoming Products & Innovations
        </h2>
        <p className="mt-4 leading-relaxed text-[var(--color-muted)]">{SUB}</p>
      </div>

      <Reveal>
        <div className="relative mt-12">
          {/* Horizontal scroll container */}
          <div className="-mx-4 flex gap-5 overflow-x-auto px-4 pb-8 pt-4 snap-x snap-mandatory sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {ROADMAP.map((f) => (
              <div
                key={f.title}
                className="w-[85vw] sm:w-[340px] shrink-0 snap-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 p-6 transition-transform duration-300 hover:-translate-y-2 hover:bg-[var(--color-surface)]/80 hover:shadow-lg hover:shadow-[var(--color-accent)]/10"
              >
              <div className="flex items-start justify-between">
                <div
                  className="grid h-11 w-11 place-items-center rounded-xl"
                  style={{ backgroundColor: GOLD_BG, color: GOLD }}
                >
                  <f.icon className="h-5 w-5" />
                </div>
                <span
                  className="rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide"
                  style={{ color: GOLD, backgroundColor: GOLD_BG, borderColor: GOLD_BORDER }}
                >
                  Coming Soon
                </span>
              </div>
              <h3 className="mt-4 font-semibold text-white">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-muted)]">{f.desc}</p>
            </div>
          ))}
          </div>
          
          {/* Fade edges to indicate scrolling */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-[var(--color-background)] to-transparent sm:hidden" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-[var(--color-background)] to-transparent" />
        </div>
      </Reveal>
    </section>
  );
}
