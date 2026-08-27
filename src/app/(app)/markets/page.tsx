import { MarketsView } from "@/components/markets/MarketsView";

// Public: prices are a reason to visit, not something to gate behind a login.
export default function MarketsPage() {
  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-5xl">
        <MarketsView />
      </div>
    </div>
  );
}
