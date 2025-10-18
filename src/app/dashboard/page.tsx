"use client";

import { useEffect, useRef, useState } from "react";
import axios from "axios";
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  UTCTimestamp,
} from "lightweight-charts";
import { BarChart3, PlusCircle, Settings, LineChart } from "lucide-react";

type TradeType = "profit" | "loss" | "neutral";

interface Trade {
  id: string;
  symbol: string;
  name: string;
  leverage: number;
  capital: number;
  buyPrice: number;
  currentPrice: number;
  profit: number;
  profitPercent: number;
  type: TradeType;
}

interface Candle {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

export default function DashboardPage() {
  const [symbol, setSymbol] = useState("");
  const [name, setName] = useState("");
  const [leverage, setLeverage] = useState<number>(1);
  const [capital, setCapital] = useState<number>(0);
  const [buyPrice, setBuyPrice] = useState<number>(0);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [suggestions, setSuggestions] = useState<
    { symbol: string; name: string }[]
  >([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState<string>("");
  const [candles, setCandles] = useState<Candle[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState("portfolio");
  const [indicator, setIndicator] = useState<string>("none");

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  // 🔍 Suggestions
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (symbol.length < 2) return setSuggestions([]);
      try {
        const res = await axios.get(
          `https://api.coingecko.com/api/v3/search?query=${symbol}`
        );
        const coins = res.data.coins.map((c: any) => ({
          symbol: c.symbol.toUpperCase(),
          name: c.name,
        }));
        setSuggestions(coins.slice(0, 8));
      } catch (err) {
        console.error("Suggestions error:", err);
      }
    };
    const delay = setTimeout(fetchSuggestions, 400);
    return () => clearTimeout(delay);
  }, [symbol]);

  // 💰 Price updates
  useEffect(() => {
    const fetchPrices = async () => {
      const updated = await Promise.all(
        trades.map(async (t) => {
          try {
            const res = await axios.get(
              `https://api.coingecko.com/api/v3/simple/price?ids=${t.name.toLowerCase()}&vs_currencies=usd`
            );
            const price =
              res.data?.[t.name.toLowerCase()]?.usd || t.currentPrice;
            const diff = (price - t.buyPrice) * t.leverage;
            const profit = diff * (t.capital / t.buyPrice);
            const profitPercent =
              ((price - t.buyPrice) / t.buyPrice) * 100 * t.leverage;
            const type: TradeType =
              profit > 0 ? "profit" : profit < 0 ? "loss" : "neutral";
            return { ...t, currentPrice: price, profit, profitPercent, type };
          } catch {
            return t;
          }
        })
      );
      setTrades(updated);
    };
    if (trades.length > 0) {
      fetchPrices();
      const interval = setInterval(fetchPrices, 15000);
      return () => clearInterval(interval);
    }
  }, [trades.length]);

  // 🕯️ Candle data
  const fetchCandles = async (coin: string) => {
    try {
      const res = await axios.get(
        `https://api.coingecko.com/api/v3/coins/${coin.toLowerCase()}/ohlc?vs_currency=usd&days=7`
      );
      if (Array.isArray(res.data)) {
        const data = res.data.map((c: number[]) => ({
          date: new Date(c[0]).toISOString(),
          open: c[1],
          high: c[2],
          low: c[3],
          close: c[4],
        }));
        setCandles(data);
      }
    } catch (err) {
      console.error("Candle error:", err);
    }
  };

  // 📈 Chart + Indicators
  useEffect(() => {
    if (!showModal || candles.length === 0 || !chartContainerRef.current)
      return;

    chartContainerRef.current.innerHTML = "";
    const chart = createChart(chartContainerRef.current, {
      layout: { background: { color: "#111" }, textColor: "#fff" },
      grid: { vertLines: { color: "#222" }, horzLines: { color: "#222" } },
      width: chartContainerRef.current.clientWidth,
      height: 520,
      timeScale: { borderColor: "#333", timeVisible: true },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: "#22c55e",
      borderUpColor: "#22c55e",
      wickUpColor: "#22c55e",
      downColor: "#ef4444",
      borderDownColor: "#ef4444",
      wickDownColor: "#ef4444",
    });

    const formatted: CandlestickData[] = candles.map((c) => ({
      time: Math.floor(new Date(c.date).getTime() / 1000) as UTCTimestamp,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    candleSeries.setData(formatted);

    // ====== INDICATORS ======

    const prices = candles.map((c) => c.close);

    // 📊 Moving Averages
    const calcMA = (type: "sma" | "ema", period = 7) => {
      const result: number[] = [];
      if (type === "sma") {
        for (let i = 0; i < prices.length; i++) {
          if (i < period) result.push(NaN);
          else
            result.push(
              prices.slice(i - period, i).reduce((a, b) => a + b, 0) / period
            );
        }
      } else {
        const k = 2 / (period + 1);
        let emaPrev = prices[0];
        for (let i = 0; i < prices.length; i++) {
          emaPrev = prices[i] * k + emaPrev * (1 - k);
          result.push(emaPrev);
        }
      }
      return result;
    };

    // 📊 RSI
    const calcRSI = (period = 14) => {
      const gains: number[] = [];
      const losses: number[] = [];
      for (let i = 1; i < prices.length; i++) {
        const diff = prices[i] - prices[i - 1];
        gains.push(Math.max(0, diff));
        losses.push(Math.max(0, -diff));
      }
      const avgGain =
        gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
      const avgLoss =
        losses.slice(0, period).reduce((a, b) => a + b, 0) / period;
      let rs = avgGain / avgLoss;
      const rsiValues: number[] = [100 - 100 / (1 + rs)];
      for (let i = period; i < prices.length; i++) {
        const gain = gains[i] || 0;
        const loss = losses[i] || 0;
        rs =
          (avgGain * (period - 1) + gain) /
          (avgLoss * (period - 1) + loss || 1);
        rsiValues.push(100 - 100 / (1 + rs));
      }
      return rsiValues;
    };

    // 📊 MACD
    const calcMACD = () => {
      const ema12 = calcMA("ema", 12);
      const ema26 = calcMA("ema", 26);
      const macdLine = ema12.map((v, i) => v - ema26[i]);
      const signal = calcMA("ema", 9);
      const histogram = macdLine.map((v, i) => v - signal[i]);
      return { macdLine, signal, histogram };
    };

    // 📊 Bollinger Bands
    const calcBollinger = (period = 20, mult = 2) => {
      const ma = calcMA("sma", period);
      const bands = prices.map((p, i) => {
        if (i < period) return { upper: NaN, lower: NaN };
        const slice = prices.slice(i - period, i);
        const mean = ma[i];
        const variance =
          slice.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / period;
        const std = Math.sqrt(variance);
        return { upper: mean + mult * std, lower: mean - mult * std };
      });
      return { ma, bands };
    };

    // 🎯 Apply Selected Indicator
    if (indicator === "sma" || indicator === "ema") {
      const maValues = calcMA(indicator as "sma" | "ema");
      const lineSeries = chart.addLineSeries({
        color: indicator === "sma" ? "#60a5fa" : "#f59e0b",
        lineWidth: 2,
      });
      lineSeries.setData(
        maValues.map((v, i) => ({
          time: Math.floor(
            new Date(candles[i].date).getTime() / 1000
          ) as UTCTimestamp,
          value: v,
        }))
      );
    }

    if (indicator === "rsi") {
      const rsi = calcRSI();
      const rsiSeries = chart.addLineSeries({
        color: "#34d399",
        lineWidth: 2,
        title: "RSI",
      });
      rsiSeries.setData(
        rsi.map((v, i) => ({
          time: Math.floor(
            new Date(candles[i].date).getTime() / 1000
          ) as UTCTimestamp,
          value: v,
        }))
      );
    }

    if (indicator === "macd") {
      const { macdLine, signal } = calcMACD();
      const macdSeries = chart.addLineSeries({
        color: "#818cf8",
        lineWidth: 2,
      });
      const signalSeries = chart.addLineSeries({
        color: "#f97316",
        lineWidth: 2,
      });
      macdSeries.setData(
        macdLine.map((v, i) => ({
          time: Math.floor(
            new Date(candles[i].date).getTime() / 1000
          ) as UTCTimestamp,
          value: v,
        }))
      );
      signalSeries.setData(
        signal.map((v, i) => ({
          time: Math.floor(
            new Date(candles[i].date).getTime() / 1000
          ) as UTCTimestamp,
          value: v,
        }))
      );
    }

    if (indicator === "bollinger") {
      const { ma, bands } = calcBollinger();
      const upperSeries = chart.addLineSeries({
        color: "#f87171",
        lineWidth: 1,
      });
      const lowerSeries = chart.addLineSeries({
        color: "#60a5fa",
        lineWidth: 1,
      });
      const maSeries = chart.addLineSeries({
        color: "#a3a3a3",
        lineWidth: 1,
      });
      upperSeries.setData(
        bands.map((b, i) => ({
          time: Math.floor(
            new Date(candles[i].date).getTime() / 1000
          ) as UTCTimestamp,
          value: b.upper,
        }))
      );
      lowerSeries.setData(
        bands.map((b, i) => ({
          time: Math.floor(
            new Date(candles[i].date).getTime() / 1000
          ) as UTCTimestamp,
          value: b.lower,
        }))
      );
      maSeries.setData(
        ma.map((v, i) => ({
          time: Math.floor(
            new Date(candles[i].date).getTime() / 1000
          ) as UTCTimestamp,
          value: v,
        }))
      );
    }

    chart.timeScale().fitContent();

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    return () => chart.remove();
  }, [candles, showModal, indicator]);

  // ➕ Add trade
  const addTrade = () => {
    if (!symbol || !name || !capital || !buyPrice) return;
    const id = Math.random().toString(36).slice(2);
    const newTrade: Trade = {
      id,
      symbol: symbol.toUpperCase(),
      name,
      leverage,
      capital,
      buyPrice,
      currentPrice: buyPrice,
      profit: 0,
      profitPercent: 0,
      type: "neutral",
    };
    setTrades((prev) => [newTrade, ...prev]);
    setSymbol("");
    setName("");
    setCapital(0);
    setBuyPrice(0);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-between pb-20">
      {/* Header */}
      <header className="fixed top-0 w-full bg-white border-b border-gray-200 py-3 shadow-sm text-center z-50">
        <h1 className="text-lg font-semibold text-gray-800">
          💹 Crypto Tracker
        </h1>
      </header>

      {/* Main */}
      <main className="w-full max-w-md mx-auto mt-16 px-4 space-y-5 pb-12">
        {/* Input card */}
        <div className="w-full bg-white rounded-3xl shadow-md border border-gray-200 p-4 space-y-3">
          <div className="relative">
            <input
              value={symbol}
              onChange={(e) => {
                setSymbol(e.target.value);
                setShowSuggestions(true);
              }}
              placeholder="Search crypto (e.g. BTC)"
              className="p-3 rounded-xl bg-gray-100 w-full focus:outline-none text-gray-900"
            />
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-xl mt-1 shadow-lg max-h-48 overflow-y-auto">
                {suggestions.map((s) => (
                  <div
                    key={s.symbol}
                    onClick={() => {
                      setSymbol(s.symbol);
                      setName(s.name);
                      setShowSuggestions(false);
                    }}
                    className="px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm"
                  >
                    <span className="font-medium">{s.name}</span>{" "}
                    <span className="text-gray-500">({s.symbol})</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <input
              type="number"
              value={buyPrice || ""}
              onChange={(e) => setBuyPrice(parseFloat(e.target.value))}
              placeholder="Buy Price"
              className="p-3 rounded-xl bg-gray-100 focus:outline-none text-sm"
            />
            <input
              type="number"
              value={capital || ""}
              onChange={(e) => setCapital(parseFloat(e.target.value))}
              placeholder="Capital"
              className="p-3 rounded-xl bg-gray-100 focus:outline-none text-sm"
            />
            <input
              type="number"
              value={leverage || ""}
              onChange={(e) => setLeverage(parseFloat(e.target.value))}
              placeholder="Leverage"
              className="p-3 rounded-xl bg-gray-100 focus:outline-none text-sm"
            />
          </div>

          <button
            onClick={addTrade}
            className="mt-2 w-full py-3 bg-gray-900 text-white font-semibold rounded-xl active:scale-95 transition"
          >
            ➕ Add Trade
          </button>
        </div>

        {/* Trades list */}
        <div className="w-full space-y-3">
          {trades.map((t) => (
            <div
              key={t.id}
              className="p-4 bg-white border border-gray-200 rounded-2xl shadow-sm flex justify-between items-center active:scale-[0.98] transition"
            >
              <div>
                <p className="font-semibold text-lg">{t.symbol}</p>
                <p className="text-sm text-gray-500">{t.name}</p>
              </div>
              <div className="text-right">
                <p className="font-medium text-gray-900">
                  ${t.currentPrice.toFixed(4)}
                </p>
                <p
                  className={`text-sm ${
                    t.type === "profit"
                      ? "text-green-600"
                      : t.type === "loss"
                      ? "text-red-500"
                      : "text-gray-400"
                  }`}
                >
                  {t.profitPercent.toFixed(2)}%
                </p>
              </div>
              <button
                onClick={async () => {
                  setSelectedSymbol(t.name);
                  await fetchCandles(t.name);
                  setShowModal(true);
                }}
                className="ml-3 text-gray-500 active:scale-90"
              >
                <LineChart className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>
      </main>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-zinc-900 rounded-2xl w-[90%] max-w-md p-4 shadow-2xl relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-200"
            >
              ✕
            </button>
            <h2 className="text-lg font-semibold text-white mb-3 text-center">
              {selectedSymbol.toUpperCase()} / USD
            </h2>

            {/* Indicator Selector */}
            <div className="flex justify-center mb-3">
              <select
                value={indicator}
                onChange={(e) => setIndicator(e.target.value)}
                className="bg-zinc-800 text-white px-3 py-2 rounded-lg text-sm border border-zinc-700"
              >
                <option value="none">None</option>
                <option value="sma">Simple MA (7)</option>
                <option value="ema">EMA (7)</option>
                <option value="bollinger">Bollinger Bands</option>
                <option value="rsi">RSI (14)</option>
                <option value="macd">MACD</option>
              </select>
            </div>

            <div ref={chartContainerRef} className="h-[520px] w-full" />
          </div>
        </div>
      )}
    </div>
  );
}
