import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const requestToken = searchParams.get("request_token");
  const status = searchParams.get("status");

  if (status !== "success" || !requestToken) {
    return NextResponse.redirect(new URL("/stocks?kite=error", req.url));
  }

  const apiKey = process.env.KITE_API_KEY!;
  const apiSecret = process.env.KITE_API_SECRET!;

  const checksum = crypto
    .createHash("sha256")
    .update(apiKey + requestToken + apiSecret)
    .digest("hex");

  let accessToken: string;

  try {
    const res = await fetch("https://api.kite.trade/session/token", {
      method: "POST",
      headers: {
        "X-Kite-Version": "3",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ api_key: apiKey, request_token: requestToken, checksum }),
    });

    const data = await res.json() as Record<string, unknown>;
    const token = (data?.data as Record<string, string>)?.access_token;

    if (!res.ok || !token) {
      console.error("[kite/callback] token exchange failed:", data);
      return NextResponse.redirect(new URL("/stocks?kite=error", req.url));
    }

    accessToken = token;
  } catch (err) {
    console.error("[kite/callback] fetch error:", err);
    return NextResponse.redirect(new URL("/stocks?kite=error", req.url));
  }

  const response = NextResponse.redirect(new URL("/stocks?kite=connected", req.url));
  response.cookies.set("kite_access_token", accessToken, {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return response;
}
