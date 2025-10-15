import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol");
  const apiKey = process.env.FINNHUB_API_KEY;

  if (!symbol)
    return NextResponse.json({ error: "Missing symbol" }, { status: 400 });

  try {
    const url = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`;
    const res = await fetch(url);

    if (!res.ok) {
      const text = await res.text();
      console.error("Finnhub HTTP error:", text);
      return NextResponse.json(
        { error: "Finnhub quote request failed" },
        { status: 500 }
      );
    }

    const data = await res.json();

    // Validate Finnhub's JSON
    if (!data.c && !data.current) {
      return NextResponse.json(
        { error: "Invalid response from Finnhub" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      current: data.c,
      high: data.h,
      low: data.l,
      open: data.o,
      prevClose: data.pc,
      change: data.d,
      percent: data.dp,
    });
  } catch (err) {
    console.error("❌ Finnhub quote fetch failed:", err);
    return NextResponse.json(
      { error: "Failed to fetch quote" },
      { status: 500 }
    );
  }
}
