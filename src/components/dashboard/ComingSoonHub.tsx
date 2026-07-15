import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  GraduationCap,
  Newspaper,
  Calculator,
  ArrowLeftRight,
  Building2,
  Briefcase,
  Heart,
  LifeBuoy,
  Mail,
  LineChart,
  PiggyBank,
  Coins,
  Smartphone,
  ArrowUpRight,
} from "lucide-react";

type Feature = { icon: LucideIcon; title: string; desc: string };
type Group = { label: string; features: Feature[] };

/** Live products, linked so people can jump straight into what already works. */
const LIVE: { href: string; label: string }[] = [
  { href: "/trade/BTC-USDT", label: "Spot Trading" },
  { href: "/swap", label: "Instant Swap" },
  { href: "/buy", label: "Buy & Sell" },
  { href: "/p2p", label: "P2P Marketplace" },
  { href: "/otc", label: "OTC Desk" },
  { href: "/wallet", label: "Wallet" },
];

const GROUPS: Group[] = [
  {
    label: "Learn & tools",
    features: [
      { icon: GraduationCap, title: "Academy", desc: "Guided courses to learn crypto and trading from the ground up." },
      { icon: Newspaper, title: "Blog", desc: "Product news, market insights, and updates from the team." },
      { icon: Calculator, title: "Rate Calculator", desc: "Estimate the fees and returns of a trade before you place it." },
      { icon: ArrowLeftRight, title: "Crypto Converter", desc: "See live conversion rates between any two assets." },
    ],
  },
  {
    label: "Company",
    features: [
      { icon: Building2, title: "About Oknexus", desc: "Our mission to make global finance simple and open." },
      { icon: Briefcase, title: "Careers", desc: "Join the team building the future of finance." },
      { icon: Heart, title: "We Care", desc: "Our community and social-impact initiatives." },
    ],
  },
  {
    label: "Support",
    features: [
      { icon: LifeBuoy, title: "Help Center", desc: "Searchable guides and answers, available around the clock." },
      { icon: Mail, title: "Contact", desc: "Reach our support team whenever you need a hand." },
    ],
  },
  {
    label: "On the roadmap",
    features: [
      { icon: LineChart, title: "Portfolio & PnL", desc: "Your balances, performance, and activity in one dashboard." },
      { icon: PiggyBank, title: "Staking & Earn", desc: "Put idle assets to work with flexible and fixed yield." },
      { icon: Coins, title: "Oknexus Token", desc: "The platform's native utility token and rewards." },
      { icon: Smartphone, title: "Mobile Apps", desc: "Trade and manage your wallet on iOS and Android." },
    ],
  },
];

export function ComingSoonHub() {
  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-5xl">
        <div className="text-xs font-medium uppercase tracking-widest text-[var(--color-accent)]">
          Coming soon
        </div>
        <h1 className="mt-2 text-3xl font-semibold">The full Oknexus experience is on the way</h1>
        <p className="mt-3 max-w-2xl leading-relaxed text-[var(--color-muted)]">
          Trading is live today — spot, swap, buy &amp; sell, OTC, P2P, and your wallet are all ready to
          use. Here&apos;s what we&apos;re building next.
        </p>

        {/* Available now */}
        <div className="mt-6">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
            Available now
          </div>
          <div className="flex flex-wrap gap-2">
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
        </div>

        {/* Coming soon groups */}
        <div className="mt-10 space-y-10">
          {GROUPS.map((g) => (
            <section key={g.label}>
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                {g.label}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {g.features.map((f) => (
                  <div
                    key={f.title}
                    className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/40 p-5 transition-colors hover:border-[var(--color-accent)]/50"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-accent)]/10 text-[var(--color-accent)]">
                        <f.icon className="h-5 w-5" />
                      </div>
                      <span className="rounded-full bg-[var(--color-accent)]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-accent)]">
                        Soon
                      </span>
                    </div>
                    <h3 className="mt-4 font-semibold">{f.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-[var(--color-muted)]">{f.desc}</p>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
