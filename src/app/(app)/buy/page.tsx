import { RampCard } from "@/components/ramp/RampCard";

export default function BuyPage() {
  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-md mt-8">
        <RampCard />
        <p className="mt-4 text-center text-xs text-[var(--color-muted)] leading-relaxed">
          Convert between local fiat and crypto in seconds. Rates lock for 15
          seconds; card and mobile-wallet payments settle instantly.
        </p>
      </div>
    </div>
  );
}
