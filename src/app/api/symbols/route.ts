import { NextResponse } from "next/server";
import axios from "axios";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q");

  if (!query || query.length < 2) {
    return NextResponse.json({ quotes: [] });
  }

  try {
    const res = await axios.get(
      `https://query1.finance.yahoo.com/v1/finance/search?q=${query}&lang=en-US&region=US`
    );

    const quotes = res.data.quotes
      ?.filter((q: any) => q.symbol && (q.shortname || q.longname))
      .slice(0, 10);

    return NextResponse.json({ quotes });
  } catch (err: any) {
    console.error("Yahoo Finance proxy error:", err.message);
    return NextResponse.json({ quotes: [] }, { status: 500 });
  }
}
