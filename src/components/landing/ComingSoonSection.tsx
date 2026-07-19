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

const SUB = "We're steadily expanding the ecosystem beyond trading — here's what's landing next.";

export function ComingSoonSection() {
  return (
    <section id="coming-soon" className="mx-auto max-w-6xl px-4 py-16 md:py-24">
      <div className="max-w-2xl">
        <span
          className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium"
          style={{ color: GOLD, backgroundColor: GOLD_BG, borderColor: GOLD_BORDER }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: GOLD }} />
          On the roadmap
        </span>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white [text-wrap:balance] md:text-4xl">
          More ways to move, coming to Oknexus.
        </h2>
        <p className="mt-4 leading-relaxed text-[var(--color-muted)]">{SUB}</p>
      </div>

      <Reveal>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ROADMAP.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 p-6"
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
      </Reveal>
    </section>
  );
}
