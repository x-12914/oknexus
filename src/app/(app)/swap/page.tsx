import { SwapCard } from "@/components/swap/SwapCard";

export default function SwapPage() {
  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-md mt-8">
        <SwapCard />
        <p className="mt-4 text-center text-xs text-[var(--color-muted)] leading-relaxed">
          Convert between any two supported assets in one tap at a locked rate.
          Quotes refresh every 15 seconds.
        </p>
      </div>
    </div>
  );
}
