import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol")?.toLowerCase();

  if (!symbol)
    return NextResponse.json({ error: "Missing symbol" }, { status: 400 });

  try {
    // Step 1️⃣: Extract coin ticker (e.g., BTC from BINANCE:BTCUSDT or ARBTC)
    const ticker = symbol
      .replace("binance:", "")
      .replace("usdt", "")
      .replace("btc", "")
      .replace("usd", "")
      .toLowerCase();

    // Step 2️⃣: Find matching CoinGecko ID
    const listRes = await fetch("https://api.coingecko.com/api/v3/coins/list");
    const list = await listRes.json();

    const match = list.find(
      (coin: any) =>
        coin.symbol.toLowerCase() === ticker ||
        coin.id.toLowerCase() === ticker ||
        coin.name.toLowerCase().includes(ticker)
    );

    if (!match)
      return NextResponse.json(
        { error: `Symbol ${symbol.toUpperCase()} not found on CoinGecko` },
        { status: 404 }
      );

    // Step 3️⃣: Fetch 30 days of candle data
    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/${match.id}/market_chart?vs_currency=usd&days=30`
    );

    if (!res.ok) throw new Error(`CoinGecko returned ${res.status}`);

    const data = await res.json();

    // Step 4️⃣: Transform into candle structure
    const candles = data.prices.map(([timestamp, price]: [number, number]) => ({
      date: new Date(timestamp).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      open: price,
      high: price * 1.02,
      low: price * 0.98,
      close: price,
    }));

    return NextResponse.json({ s: "ok", candles, coin: match.id });
  } catch (err) {
    console.error("❌ CoinGecko candle fetch failed:", err);
    return NextResponse.json(
      { error: "Failed to fetch candle data" },
      { status: 500 }
    );
  }
}
