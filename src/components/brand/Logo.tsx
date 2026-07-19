import { cn } from "@/lib/utils";

/** Nexus Exchange emblem: sun arc + layered chevrons. Self-contained SVG. */
export function NexusMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="nx-pink" x1="0.1" y1="0" x2="0.9" y2="1">
          <stop offset="0" stopColor="#FF37B5" />
          <stop offset="0.55" stopColor="#B026E3" />
          <stop offset="1" stopColor="#7A1FE0" />
        </linearGradient>
        <linearGradient id="nx-cyan" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5AE9F6" />
          <stop offset="1" stopColor="#0AA5C7" />
        </linearGradient>
        <linearGradient id="nx-sun" x1="0" y1="0.3" x2="1" y2="0.3">
          <stop offset="0" stopColor="#F7911B" />
          <stop offset="1" stopColor="#FFD429" />
        </linearGradient>
      </defs>
      <circle
        cx="34"
        cy="27"
        r="20"
        fill="none"
        stroke="url(#nx-sun)"
        strokeWidth="6.5"
        strokeLinecap="round"
        strokeDasharray="90 42"
        transform="rotate(125 34 27)"
      />
      <path
        d="M45 11 L21 34 L45 57"
        fill="none"
        stroke="url(#nx-pink)"
        strokeWidth="10.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M56 29 L41 43 L56 57"
        fill="none"
        stroke="url(#nx-cyan)"
        strokeWidth="9.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Brand lockup: mark + wordmark. */
export function Logo({
  wordmark = true,
  className,
}: {
  wordmark?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <NexusMark className="h-8 w-8 shrink-0" />
      {wordmark ? (
        <span className="text-lg font-bold uppercase tracking-wide">
          <span
            style={{
              backgroundImage: "linear-gradient(90deg,#F7911B,#FFD429)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            OK
          </span>
          <span className="text-[var(--color-foreground)]">NEXUS</span>
        </span>
      ) : null}
    </span>
  );
}
