import { Compass, Rocket, Zap, Smartphone, Globe } from "lucide-react";

export default function ExplorePage() {
  const features = [
    {
      title: "Margin Trading",
      desc: "Trade with up to 100x leverage on top crypto assets with deep liquidity.",
      icon: Rocket,
    },
    {
      title: "Staking Pools",
      desc: "Earn passive income by delegating your tokens to secure proof-of-stake networks.",
      icon: Zap,
    },
    {
      title: "Pro Mobile App",
      desc: "A native application for iOS and Android featuring advanced charting and order types.",
      icon: Smartphone,
    },
    {
      title: "Fiat Gateways",
      desc: "Direct deposits and withdrawals in 50+ local currencies globally via bank transfer.",
      icon: Globe,
    }
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto overflow-y-auto h-full">
      <div className="flex items-center gap-3 mb-8">
        <div className="h-12 w-12 rounded-2xl bg-[var(--color-accent)]/20 flex items-center justify-center text-[var(--color-accent)]">
          <Compass className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-foreground)]">Explore</h1>
          <p className="text-[var(--color-muted)] text-sm mt-1">Discover what's coming next to the platform</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {features.map((f, i) => (
          <div key={i} className="glass p-6 rounded-2xl border border-[var(--color-border)] hover:border-[var(--color-accent)]/50 transition-all hover:-translate-y-1 relative overflow-hidden group">
            <div className="absolute top-4 right-4 bg-[var(--color-surface-2)] text-[var(--color-muted)] text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider group-hover:bg-[var(--color-accent)] group-hover:text-white transition-colors shadow-sm">
              Coming Soon
            </div>
            <div className="h-12 w-12 rounded-xl bg-[var(--color-surface-2)] flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
              <f.icon className="h-6 w-6 text-[var(--color-accent)]" />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-[var(--color-foreground)]">{f.title}</h3>
            <p className="text-[var(--color-muted)] text-sm leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
