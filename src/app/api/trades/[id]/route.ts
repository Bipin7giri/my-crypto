import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifySession } from "@/lib/jwt";
import { cookies } from "next/headers";

type Params = { params: { id: string } };

export async function DELETE(_req: Request, { params }: Params) {
  const token = cookies().get("session")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { userId } = await verifySession(token).catch(() => ({ userId: null as any }));
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  db.remove(userId, params.id);
  return NextResponse.json({ ok: true });
}
