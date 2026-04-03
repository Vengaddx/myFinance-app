import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const apiKey = process.env.KITE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "KITE_API_KEY not set" }, { status: 500 });
  }

  // Which account label is being connected (defaults to "Mine")
  const label = req.nextUrl.searchParams.get("label") ?? "Mine";
  const loginUrl = `https://kite.zerodha.com/connect/login?v=3&api_key=${apiKey}`;

  const response = NextResponse.redirect(loginUrl);
  response.cookies.set("kite_pending_label", label, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10, // 10 min — enough for OAuth round-trip
  });
  return response;
}
