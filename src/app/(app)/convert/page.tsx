import { ConvertCard } from "@/components/convert/ConvertCard";

export default function ConvertPage() {
  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto mt-8 max-w-md">
        <ConvertCard />
        <p className="mt-4 text-center text-xs leading-relaxed text-[var(--color-muted)]">
          Convert between any two assets at a locked rate. Small orders execute instantly; large
          orders route to our OTC desk automatically for a tighter spread — same screen either way.
        </p>
      </div>
    </div>
  );
}
