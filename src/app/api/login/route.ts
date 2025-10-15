import { NextResponse } from "next/server";
import { signSession } from "@/lib/jwt";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { email, name } = body as { email?: string; name?: string };

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
  }

  const token = await signSession({ userId: email.toLowerCase(), name: name?.trim() });
  const res = NextResponse.json({ ok: true });
  res.cookies.set("session", token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
