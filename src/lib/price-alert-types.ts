// Client-safe price-alert types (no server imports).

export interface PriceAlertView {
  id: string;
  symbol: string;
  direction: "ABOVE" | "BELOW";
  target: number;
  triggered: boolean;
  createdAt: number;
  triggeredAt: number | null;
}
