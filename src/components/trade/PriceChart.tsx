"use client";

import { useEffect, useRef, useState } from "react";
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type HistogramData,
  type UTCTimestamp,
} from "lightweight-charts";
import { api } from "@/lib/api-client";
import type { CandleInterval } from "@/lib/exchange/types";
import { cn } from "@/lib/utils";

const INTERVALS: CandleInterval[] = ["1m", "5m", "15m", "1h", "4h", "1d"];

// Reads the chart palette from the theme CSS variables so it follows the toggle.
function readChartColors() {
  const cs = getComputedStyle(document.documentElement);
  const g = (n: string, fallback: string) => cs.getPropertyValue(n).trim() || fallback;
  return {
    bg: g("--chart-bg", "#ffffff"),
    text: g("--chart-text", "#6f6c88"),
    grid: g("--chart-grid", "rgba(26,24,48,0.06)"),
    border: g("--chart-border", "#e4e1f0"),
    up: g("--chart-up", "#0e9f6e"),
    down: g("--chart-down", "#e5484d"),
  };
}

export function PriceChart({ pair }: { pair: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const [interval, setInterval] = useState<CandleInterval>("15m");

  useEffect(() => {
    if (!containerRef.current) return;
    const c = readChartColors();
    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: c.bg },
        textColor: c.text,
      },
      grid: {
        vertLines: { color: c.grid },
        horzLines: { color: c.grid },
      },
      rightPriceScale: { borderColor: c.border },
      timeScale: { borderColor: c.border, timeVisible: true, secondsVisible: false },
      crosshair: { mode: 1 },
      autoSize: true,
    });

    const candle = chart.addSeries(CandlestickSeries, {
      upColor: c.up,
      downColor: c.down,
      borderVisible: false,
      wickUpColor: c.up,
      wickDownColor: c.down,
    });

    const volume = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "",
      color: c.up,
    });
    volume.priceScale().applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    chartRef.current = chart;
    candleRef.current = candle;
    volumeRef.current = volume;

    return () => {
      chart.remove();
      chartRef.current = null;
      candleRef.current = null;
      volumeRef.current = null;
    };
  }, []);

  // Re-theme the chart when the app theme toggles.
  useEffect(() => {
    const apply = () => {
      const c = readChartColors();
      chartRef.current?.applyOptions({
        layout: { background: { color: c.bg }, textColor: c.text },
        grid: { vertLines: { color: c.grid }, horzLines: { color: c.grid } },
        rightPriceScale: { borderColor: c.border },
        timeScale: { borderColor: c.border },
      });
      candleRef.current?.applyOptions({
        upColor: c.up,
        downColor: c.down,
        wickUpColor: c.up,
        wickDownColor: c.down,
      });
      volumeRef.current?.applyOptions({ color: c.up });
    };
    const obs = new MutationObserver(apply);
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const { candles } = await api.candles(pair, interval, 200);
      if (cancelled) return;
      const cData: CandlestickData[] = candles.map((c) => ({
        time: c.time as UTCTimestamp,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }));
      const vData: HistogramData[] = candles.map((c) => ({
        time: c.time as UTCTimestamp,
        value: c.volume,
        color: c.close >= c.open ? "rgba(14,159,110,0.4)" : "rgba(229,72,77,0.4)",
      }));
      candleRef.current?.setData(cData);
      volumeRef.current?.setData(vData);
    };

    load();
    const t = window.setInterval(load, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, [pair, interval]);

  return (
    <div className="h-full flex flex-col bg-[var(--color-surface)]">
      <div className="flex items-center gap-1 px-3 py-2 border-b border-[var(--color-border)]">
        <span className="text-xs text-[var(--color-muted)] mr-2">Interval</span>
        {INTERVALS.map((i) => (
          <button
            key={i}
            type="button"
            onClick={() => setInterval(i)}
            className={cn(
              "text-xs px-2 py-1 rounded hover:bg-[var(--color-surface-2)]",
              interval === i && "bg-[var(--color-surface-2)] text-[var(--color-accent)]",
            )}
          >
            {i}
          </button>
        ))}
      </div>
      <div ref={containerRef} className="flex-1 min-h-0" />
    </div>
  );
}
