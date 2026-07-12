"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PillOption {
  key: string;
  label: string;
  sub?: string;
  leading?: ReactNode;
}

export function PillDropdown({
  value,
  options,
  onChange,
  trigger,
  align = "right",
  widthClass = "w-56",
}: {
  value: string;
  options: PillOption[];
  onChange: (key: string) => void;
  trigger: ReactNode;
  align?: "left" | "right";
  widthClass?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 hover:bg-[var(--color-surface-2)]"
      >
        {trigger}
        <ChevronDown className="h-4 w-4 text-[var(--color-muted)]" />
      </button>
      {open ? (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden />
          <div
            className={cn(
              "absolute z-20 mt-1 max-h-72 overflow-y-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl scrollbar-thin",
              widthClass,
              align === "right" ? "right-0" : "left-0",
            )}
          >
            {options.map((o) => (
              <button
                key={o.key}
                type="button"
                onClick={() => {
                  onChange(o.key);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-[var(--color-surface-2)]",
                  o.key === value && "bg-[var(--color-surface-2)]",
                )}
              >
                {o.leading}
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{o.label}</div>
                  {o.sub ? (
                    <div className="text-xs text-[var(--color-muted)] truncate">{o.sub}</div>
                  ) : null}
                </div>
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

export function FiatBadge({ symbol, size = 24 }: { symbol: string; size?: number }) {
  return (
    <span
      className="grid place-items-center rounded-full bg-[var(--color-surface-2)] border border-[var(--color-border)] shrink-0 font-semibold"
      style={{ width: size, height: size, fontSize: size * 0.5 }}
    >
      {symbol}
    </span>
  );
}
