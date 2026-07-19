import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function ComingSoon({
  title,
  description,
  bullets,
}: {
  title: string;
  description: string;
  bullets: string[];
}) {
  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-2xl mt-16 rounded-2xl glass p-8">
        <div className="text-xs uppercase tracking-widest text-[var(--color-accent)]">
          Coming next
        </div>
        <h1 className="mt-2 text-3xl font-semibold">{title}</h1>
        <p className="mt-3 text-[var(--color-muted)] leading-relaxed">{description}</p>
        <ul className="mt-6 space-y-2">
          {bullets.map((b) => (
            <li
              key={b}
              className="flex items-start gap-2 text-sm text-[var(--color-foreground)]/80"
            >
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[var(--color-accent)] shrink-0" />
              {b}
            </li>
          ))}
        </ul>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/trade/BTC-USDT"
            className="btn-brand inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium"
          >
            Try Spot Trading <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
