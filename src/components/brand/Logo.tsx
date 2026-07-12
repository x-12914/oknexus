import { Waypoints } from "lucide-react";
import { cn } from "@/lib/utils";

/** OKNexus brand lockup: gradient mark + wordmark. */
export function Logo({
  wordmark = true,
  className,
}: {
  wordmark?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-gradient text-white shadow-[0_4px_14px_rgba(139,92,246,0.45)]">
        <Waypoints className="h-[18px] w-[18px]" />
      </span>
      {wordmark ? (
        <span className="text-lg font-semibold tracking-tight text-gradient">OKNexus</span>
      ) : null}
    </span>
  );
}
