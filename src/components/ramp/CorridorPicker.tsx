"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Globe2, Loader2 } from "lucide-react";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type {
  CorridorCountry,
  CorridorDestination,
  CorridorField,
  CorridorOption,
} from "@/lib/ramp/corridor-types";

/**
 * Choose where money should land, and collect whatever that corridor needs.
 *
 * Nothing here knows what a Kenyan phone number looks like, or that Nigerian
 * accounts are ten digits. The provider publishes each destination's fields —
 * label, widget, options, validation pattern and limits — and this renders
 * them. That is the difference between supporting nine currencies and
 * maintaining nine forms.
 */
export function CorridorPicker({
  onChange,
}: {
  /** Fires whenever the selection becomes valid, or stops being valid. */
  onChange: (
    v: {
      country: string;
      currency: string;
      destination: string;
      values: Record<string, string>;
      min: number;
      max: number;
    } | null,
  ) => void;
}) {
  const [corridors, setCorridors] = useState<CorridorOption[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [selected, setSelected] = useState<CorridorOption | null>(null);
  const [country, setCountry] = useState<CorridorCountry | null>(null);
  const [destKey, setDestKey] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    // A timer rather than requestAnimationFrame: rAF is suspended in a hidden
    // tab, which would leave this loading forever in a background tab.
    const timer = setTimeout(() => {
      api
        .payoutCorridors()
        .then((r) => setCorridors(r.corridors))
        .catch(() => setError("Couldn't load payout destinations."));
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const pick = useCallback(async (opt: CorridorOption) => {
    setSelected(opt);
    setCountry(null);
    setDestKey("");
    setValues({});
    try {
      const r = await api.payoutCorridorCountry(opt.country);
      setCountry(r.country);
      // Only one way to receive money? Choose it rather than making the user
      // click a list of one.
      const forCurrency = r.country.destinations.filter((d) => d.currency === opt.currency);
      if (forCurrency.length === 1) setDestKey(forCurrency[0].key);
    } catch {
      setError("Couldn't load that country's requirements.");
    }
  }, []);

  const destinations = useMemo(
    () => (country && selected ? country.destinations.filter((d) => d.currency === selected.currency) : []),
    [country, selected],
  );
  const destination: CorridorDestination | null =
    destinations.find((d) => d.key === destKey) ?? null;

  /** A field is satisfied when it is filled and matches the provider's pattern. */
  const fieldValid = useCallback((f: CorridorField, v: string) => {
    const val = (v ?? "").trim();
    if (!val) return !f.required;
    if (!f.pattern) return true;
    try {
      return new RegExp(f.pattern).test(val);
    } catch {
      // A pattern we cannot compile must not block a legitimate payout; the
      // provider validates again on their side regardless.
      return true;
    }
  }, []);

  const complete = useMemo(
    () =>
      Boolean(destination) &&
      destination!.fields.every((f) => {
        const v = values[f.key] ?? "";
        return (!f.required || v.trim() !== "") && fieldValid(f, v);
      }),
    [destination, values, fieldValid],
  );

  // Held in a ref, and deliberately NOT a dependency below. A parent passing an
  // inline arrow gets a new function identity on every render; depending on it
  // would fire the effect, set state upstream, re-render, and loop forever.
  const onChangeRef = useRef(onChange);
  // Written in an effect, not during render: React forbids touching a ref while
  // rendering, and this is the one place the rule and the pattern meet.
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!selected || !destination || !complete) {
      onChangeRef.current(null);
      return;
    }
    onChangeRef.current({
      country: selected.country,
      currency: selected.currency,
      destination: destination.key,
      values,
      min: destination.minAmount,
      max: destination.maxAmount,
    });
  }, [selected, destination, complete, values]);

  if (error) {
    return <p className="text-sm text-[var(--color-down)]">{error}</p>;
  }
  if (!corridors) {
    return (
      <div className="flex items-center gap-2 py-6 text-sm text-[var(--color-muted)]">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading destinations…
      </div>
    );
  }
  if (corridors.length === 0) {
    return (
      <p className="text-sm text-[var(--color-muted)]">
        No payout destinations are available right now.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 flex items-center gap-1.5 text-xs text-[var(--color-muted)]">
          <Globe2 className="h-3.5 w-3.5" /> Where should the money go?
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {corridors.map((c) => {
            const active = selected?.country === c.country && selected?.currency === c.currency;
            return (
              <button
                key={`${c.country}-${c.currency}`}
                type="button"
                onClick={() => void pick(c)}
                className={cn(
                  "flex items-start gap-3 rounded-xl border p-3 text-left transition",
                  active
                    ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10"
                    : "border-[var(--color-border)] hover:border-[var(--color-accent)]/50",
                )}
              >
                <span className="text-lg leading-none">{c.flag || "🏳"}</span>
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 text-sm font-medium text-[var(--color-foreground)]">
                    {c.currency}
                    {/* Proven means we have watched money arrive, not that the
                        provider lists the corridor. */}
                    {c.proven && (
                      <CheckCircle2 className="h-3.5 w-3.5 text-[var(--color-up)]" aria-label="Proven" />
                    )}
                  </span>
                  <span className="block truncate text-xs text-[var(--color-muted)]">
                    {c.countryName} · {c.methods.join(", ")}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {selected && !country && (
        <div className="flex items-center gap-2 text-sm text-[var(--color-muted)]">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading {selected.countryName}…
        </div>
      )}

      {destinations.length > 1 && (
        <div>
          <p className="mb-2 text-xs text-[var(--color-muted)]">How should it arrive?</p>
          <div className="flex flex-wrap gap-2">
            {destinations.map((d) => (
              <button
                key={d.key}
                type="button"
                onClick={() => {
                  setDestKey(d.key);
                  setValues({});
                }}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium transition",
                  destKey === d.key
                    ? "bg-[var(--color-accent)] text-white"
                    : "border border-[var(--color-border)] text-[var(--color-muted)]",
                )}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {destination && (
        <div className="space-y-3">
          {destination.fields.map((f) => {
            const v = values[f.key] ?? "";
            const bad = v.trim() !== "" && !fieldValid(f, v);
            const opts = f.options.length > 0 ? f.options : destination.banks.map((b) => ({ label: b.name, value: b.code }));
            const asSelect = f.component === "select" || opts.length > 0;
            return (
              <label key={f.key} className="block">
                <span className="text-xs text-[var(--color-muted)]">{f.label}</span>
                {asSelect ? (
                  <select
                    value={v}
                    onChange={(e) => setValues((s) => ({ ...s, [f.key]: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm text-[var(--color-foreground)] outline-none"
                  >
                    <option value="">Select…</option>
                    {opts.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={v}
                    placeholder={f.placeholder}
                    onChange={(e) => setValues((s) => ({ ...s, [f.key]: e.target.value }))}
                    className={cn(
                      "mt-1 w-full rounded-lg border bg-[var(--color-surface-2)] px-3 py-2 text-sm text-[var(--color-foreground)] outline-none",
                      bad ? "border-[var(--color-down)]" : "border-[var(--color-border)]",
                    )}
                  />
                )}
                {/* The provider's own description, shown only when the value is
                    wrong — guidance is most useful at the moment it is needed. */}
                {bad && f.description && (
                  <span className="mt-1 block text-xs text-[var(--color-down)]">{f.description}</span>
                )}
              </label>
            );
          })}

          {destination.minAmount > 0 && (
            <p className="text-xs text-[var(--color-muted)]">
              {destination.currency} payouts must be between{" "}
              {destination.minAmount.toLocaleString()} and {destination.maxAmount.toLocaleString()}.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
