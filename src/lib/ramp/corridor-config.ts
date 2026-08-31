import "server-only";
import { bitnobRequest, bitnobConfigured, listPayoutCountries } from "@/lib/bitnob";
import type {
  CorridorCountry,
  CorridorDestination,
  CorridorField,
  CorridorOption,
} from "./corridor-types";

/**
 * Payout corridors, read from the provider rather than hardcoded.
 *
 * The Nigeria path in bitnob-payout.ts pins COUNTRY = "NG" because it was built
 * to prove one corridor end to end. This module is the general form: it asks
 * the provider which countries it serves and, for each destination type, what
 * fields it needs — labels, widgets, options, validation patterns and limits.
 *
 * Doing it this way matters more than it looks. Kenya wants an M-Pesa phone
 * number matching ^(\+?254\d{9}|0\d{9})$; Nigeria wants a ten-digit account and
 * a bank code; the US wants routing details. Encoding those here would mean a
 * deploy every time a provider adjusts a format, and a silent breakage when we
 * missed one.
 */

const TTL_MS = 60 * 60 * 1000;

/**
 * Corridors we have actually completed a payout through.
 *
 * Deliberately narrow. "The provider lists it" and "we have seen money arrive"
 * are different claims, and only the second should ever be shown to a customer
 * as ready.
 */
const PROVEN = new Set(["NGN"]);

interface RawField {
  key: string;
  label: string;
  component?: string;
  required?: boolean;
  pattern?: string;
  placeholder?: string;
  description?: string;
  options?: { label: string; value: string }[];
}

interface RawDestination {
  key: string;
  label: string;
  fields?: RawField[];
  banks?: { code?: string; name?: string; bank_code?: string; bank_name?: string }[];
  limits?: { min_amount?: string; max_amount?: string; currency?: string };
}

interface RawCountry {
  data?: {
    code: string;
    name: string;
    flag?: string;
    dial_code?: string;
    destination_types?: Record<string, RawDestination>;
  };
}

const cache = new Map<string, { at: number; value: CorridorCountry }>();

function toField(f: RawField): CorridorField {
  return {
    key: f.key,
    label: f.label,
    component: f.component ?? "text",
    required: f.required !== false,
    pattern: f.pattern || undefined,
    placeholder: f.placeholder || undefined,
    description: f.description || undefined,
    options: f.options ?? [],
  };
}

function toDestination(d: RawDestination): CorridorDestination {
  return {
    key: d.key,
    label: d.label,
    fields: (d.fields ?? []).map(toField),
    banks: (d.banks ?? []).map((b) => ({
      code: b.code ?? b.bank_code ?? "",
      name: b.name ?? b.bank_name ?? "",
    })).filter((b) => b.code && b.name),
    minAmount: Number.parseFloat(d.limits?.min_amount ?? "0") || 0,
    maxAmount: Number.parseFloat(d.limits?.max_amount ?? "0") || 0,
    currency: d.limits?.currency ?? "",
  };
}

/** Full spec for one country, cached for an hour. */
export async function getCorridorCountry(code: string): Promise<CorridorCountry> {
  const key = code.toUpperCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;

  const res = await bitnobRequest<RawCountry>(
    "GET",
    `/api/payouts/supported-countries/${encodeURIComponent(key)}`,
  );
  const d = res.data?.data;
  if (!res.ok || !d) throw new Error(res.error ?? `No corridor details for ${key}`);

  const destinations = Object.values(d.destination_types ?? {}).map(toDestination);
  const value: CorridorCountry = {
    code: d.code,
    name: d.name,
    flag: d.flag ?? "",
    dialCode: d.dial_code ?? "",
    destinations,
    currencies: [...new Set(destinations.map((x) => x.currency).filter(Boolean))],
  };
  cache.set(key, { at: Date.now(), value });
  return value;
}

/**
 * Every country + currency pair the provider serves.
 *
 * Built from their live list, so a corridor opening or closing on their side
 * appears here without a deploy.
 */
export async function listCorridorOptions(): Promise<CorridorOption[]> {
  if (!bitnobConfigured()) return [];
  const countries = await listPayoutCountries();
  const out: CorridorOption[] = [];
  for (const c of countries) {
    for (const k of c.corridors ?? []) {
      out.push({
        country: c.code,
        countryName: c.name,
        flag: c.flag ?? "",
        currency: k.currency,
        methods: (k.destination_types ?? []).map(prettyMethod),
        proven: PROVEN.has(k.currency),
      });
    }
  }
  // Proven corridors first, then alphabetically — a user scanning the list
  // should meet what actually works before what merely exists.
  return out.sort(
    (a, b) =>
      Number(b.proven) - Number(a.proven) || a.countryName.localeCompare(b.countryName),
  );
}

function prettyMethod(k: string): string {
  const map: Record<string, string> = {
    bank: "Bank transfer",
    mobile_money: "Mobile money",
    paybill: "Paybill",
    paytill: "Till number",
    swift: "SWIFT",
    wire: "Wire",
    ach: "ACH",
  };
  return map[k] ?? k.replace(/_/g, " ");
}
