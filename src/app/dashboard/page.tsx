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
  const chartRef = useRef<HTMLDivElement>(null);

  // 🔍 Fetch crypto suggestions
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (symbol.length < 2) {
        setSuggestions([]);
        return;
      }
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

  // 💰 Live price updates
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

  // 🕯️ Fetch candle data for modal chart
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

  // 🕯️ Chart render inside modal
  useEffect(() => {
    if (!showModal || !chartRef.current || candles.length === 0) return;
    chartRef.current.innerHTML = "";
    const chart: IChartApi = createChart(chartRef.current, {
      layout: { background: { color: "#111" }, textColor: "#fff" },
      grid: { vertLines: { color: "#222" }, horzLines: { color: "#222" } },
      width: chartRef.current.clientWidth,
      height: 380,
      timeScale: { borderColor: "#333", timeVisible: true },
    });

    const candleSeries: ISeriesApi<"Candlestick"> = chart.addCandlestickSeries({
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
    chart.timeScale().fitContent();
  }, [candles, showModal]);

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
                onClick={() => {
                  setSelectedSymbol(t.name);
                  fetchCandles(t.name);
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

      {/* Bottom nav */}
      <nav className="fixed bottom-0 w-full bg-white border-t border-gray-200 py-2 flex justify-around items-center shadow-sm">
        <button
          onClick={() => setActiveTab("portfolio")}
          className={`flex flex-col items-center text-xs ${
            activeTab === "portfolio" ? "text-gray-900" : "text-gray-400"
          }`}
        >
          <BarChart3 className="w-6 h-6" />
          Portfolio
        </button>
        <button
          onClick={() => setActiveTab("add")}
          className="bg-gray-900 text-white rounded-full p-3 active:scale-95 transition"
        >
          <PlusCircle className="w-5 h-5" />
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={`flex flex-col items-center text-xs ${
            activeTab === "settings" ? "text-gray-900" : "text-gray-400"
          }`}
        >
          <Settings className="w-6 h-6" />
          Settings
        </button>
      </nav>

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
            <div ref={chartRef} className="h-[380px] w-full" />
          </div>
        </div>
      )}
    </div>
  );
}
