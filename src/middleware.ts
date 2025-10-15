import { NextRequest, NextResponse } from "next/server";

export const config = { matcher: ["/dashboard/:path*"] };

export default function middleware(req: NextRequest) {
  const session = req.cookies.get("session")?.value;
  if (!session) {
    const url = new URL("/", req.url);
    url.searchParams.set("redirect", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}
