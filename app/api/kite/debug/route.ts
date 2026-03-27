import { NextRequest, NextResponse } from "next/server";

// Temporary debug endpoint — remove before production
export async function GET(req: NextRequest) {
  const all = req.cookies.getAll();
  const kiteToken = req.cookies.get("kite_access_token")?.value;
  return NextResponse.json({
    kite_connected: !!kiteToken,
    kite_token_preview: kiteToken ? `${kiteToken.slice(0, 8)}…` : null,
    all_cookie_names: all.map((c) => c.name),
  });
}
