import { NextResponse } from "next/server";
import axios from "axios";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q")?.toLowerCase();

  if (!query || query.length < 2) return NextResponse.json({ results: [] });

  try {
    // 🔍 Use CoinGecko’s search endpoint
    const res = await axios.get(
      `https://api.coingecko.com/api/v3/search?query=${query}`
    );
    const coins = res.data.coins;

    // ✅ Transform to your frontend-friendly format
    const results = coins.map((c: any) => ({
      symbol: `BINANCE:${c.symbol.toUpperCase()}USDT`,
      name: c.name,
    }));

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json({ results: [] });
  }
}
