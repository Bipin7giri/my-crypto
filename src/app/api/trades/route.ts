import { NextResponse } from "next/server";

let trades: any[] = [];

export async function GET() {
  return NextResponse.json({ items: trades });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("Received body:", body);

    // ✅ validate required fields safely
    if (
      typeof body.symbol !== "string" ||
      typeof body.stockName !== "string" ||
      body.symbol.trim() === "" ||
      body.stockName.trim() === "" ||
      body.leverage === undefined ||
      body.capital === undefined
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // ✅ add safe calculations
    const id = Math.random().toString(36).slice(2);
    const createdAt = new Date().toISOString();
    const pnl = Number(body.pnl || 0);
    const profitPercent = Number(body.profitPercent || 0);
    const type = pnl > 0 ? "profit" : pnl < 0 ? "loss" : "neutral";

    const item = {
      id,
      symbol: body.symbol.trim().toUpperCase(),
      stockName: body.stockName.trim(),
      leverage: Number(body.leverage),
      capital: Number(body.capital),
      pnl,
      profitPercent,
      type,
      createdAt,
    };

    trades.unshift(item);
    return NextResponse.json({ item });
  } catch (err) {
    console.error("POST /api/trades error:", err);
    return NextResponse.json(
      { error: "Invalid JSON or server error" },
      { status: 400 }
    );
  }
}

export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const id = url.pathname.split("/").pop();
  trades = trades.filter((t) => t.id !== id);
  return NextResponse.json({ success: true });
}
