/** Client-safe corridor types. No `server-only` import — the UI reads these. */

/**
 * One input the provider requires for a destination.
 *
 * Mirrors their spec rather than reshaping it, because the point of this is
 * that we never hardcode a country's rules. They tell us the label, the widget,
 * the options and the regex; we render it. A corridor gaining a field, or
 * changing its account format, then needs no deploy from us.
 */
export interface CorridorField {
  key: string;
  label: string;
  /** "text" | "select" — how to render it. */
  component: string;
  required: boolean;
  /** Regex the value must match. Empty when the provider imposes no format. */
  pattern?: string;
  placeholder?: string;
  description?: string;
  options: { label: string; value: string }[];
}

export interface CorridorDestination {
  /** "bank" | "mobile_money" | "paybill" | "paytill" | "swift" | "wire" | "ach" */
  key: string;
  label: string;
  fields: CorridorField[];
  /** Present for bank destinations; empty for mobile money. */
  banks: { code: string; name: string }[];
  minAmount: number;
  maxAmount: number;
  currency: string;
}

export interface CorridorCountry {
  code: string;
  name: string;
  flag: string;
  dialCode: string;
  destinations: CorridorDestination[];
  /** Distinct currencies reachable in this country. */
  currencies: string[];
}

/** A country + currency pair a user can be paid in. */
export interface CorridorOption {
  country: string;
  countryName: string;
  flag: string;
  currency: string;
  /** Human labels of the ways money can arrive, e.g. ["Bank", "Mobile Money"]. */
  methods: string[];
  /** True where we have proven an end-to-end payout. */
  proven: boolean;
}
