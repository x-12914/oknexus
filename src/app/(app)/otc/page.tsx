import { OtcDesk } from "@/components/otc/OtcDesk";

export default function OtcPage() {
  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-lg mt-8">
        <OtcDesk />
        <p className="mt-4 text-center text-xs text-[var(--color-muted)] leading-relaxed">
          Request a firm quote for large blocks and settle privately off the public order book.
          Pricing tightens as size increases.
        </p>
      </div>
    </div>
  );
}
