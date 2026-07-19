"use client";

import { useState } from "react";
import { MarketHeader } from "./MarketHeader";
import { PriceChart } from "./PriceChart";
import { OrderBook } from "./OrderBook";
import { TradesTape } from "./TradesTape";
import { OrderForm } from "./OrderForm";
import { OpenOrders } from "./OpenOrders";

export function TradeWorkspace({ pair }: { pair: string }) {
  const [presetPrice, setPresetPrice] = useState<number | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <MarketHeader pair={pair} />

      <div className="flex-1 min-h-0 grid gap-px bg-[var(--color-border)]" style={{ gridTemplateColumns: "260px 1fr 300px", gridTemplateRows: "minmax(0, 1fr) 220px" }}>
        <div className="row-span-2 min-h-0 overflow-hidden">
          <OrderBook
            pair={pair}
            onPickPrice={(p) => setPresetPrice(p)}
          />
        </div>

        <div className="min-h-0 overflow-hidden">
          <PriceChart pair={pair} />
        </div>

        <div className="row-span-2 min-h-0 overflow-hidden grid grid-rows-[minmax(0,1fr)_260px] gap-px bg-[var(--color-border)]">
          <div className="min-h-0 overflow-hidden">
            <TradesTape pair={pair} />
          </div>
          <div className="min-h-0 overflow-hidden">
            <OrderForm
              pair={pair}
              presetPrice={presetPrice}
              onPlaced={() => setRefreshToken((n) => n + 1)}
            />
          </div>
        </div>

        <div className="min-h-0 overflow-hidden">
          <OpenOrders pair={pair} refreshToken={refreshToken} />
        </div>
      </div>
    </div>
  );
}
