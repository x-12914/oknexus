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

      <div className="flex-1 overflow-y-auto lg:overflow-hidden flex flex-col lg:grid lg:grid-cols-[260px_1fr_300px] lg:grid-rows-[minmax(0,1fr)_220px] gap-px bg-[var(--color-border)]">
        <div className="lg:row-span-2 min-h-[400px] lg:min-h-0 overflow-hidden shrink-0">
          <OrderBook
            pair={pair}
            onPickPrice={(p) => setPresetPrice(p)}
          />
        </div>

        <div className="min-h-[400px] lg:min-h-0 overflow-hidden shrink-0">
          <PriceChart pair={pair} />
        </div>

        <div className="lg:row-span-2 min-h-0 overflow-hidden flex flex-col lg:grid lg:grid-rows-[minmax(0,1fr)_260px] gap-px bg-[var(--color-border)] shrink-0">
          <div className="min-h-[300px] lg:min-h-0 overflow-hidden shrink-0">
            <TradesTape pair={pair} />
          </div>
          <div className="min-h-[400px] lg:min-h-0 overflow-hidden shrink-0">
            <OrderForm
              pair={pair}
              presetPrice={presetPrice}
              onPlaced={() => setRefreshToken((n) => n + 1)}
            />
          </div>
        </div>

        <div className="min-h-[300px] lg:min-h-0 overflow-hidden shrink-0">
          <OpenOrders pair={pair} refreshToken={refreshToken} />
        </div>
      </div>
    </div>
  );
}
