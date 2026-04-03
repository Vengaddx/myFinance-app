import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

function parseAccounts(raw: string | undefined): Record<string, string> {
  if (!raw) return {};
  try { return JSON.parse(decodeURIComponent(raw)); } catch { return {}; }
}

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
  let kiteUserId: string;

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
    const payload = data?.data as Record<string, string> | undefined;
    const token = payload?.access_token;
    const userId = payload?.user_id;

    if (!res.ok || !token || !userId) {
      console.error("[kite/callback] token exchange failed:", data);
      return NextResponse.redirect(new URL("/stocks?kite=error", req.url));
    }

    accessToken = token;
    kiteUserId = userId; // e.g. "WMQ571"
  } catch (err) {
    console.error("[kite/callback] fetch error:", err);
    return NextResponse.redirect(new URL("/stocks?kite=error", req.url));
  }

  // Use Kite user ID as the account label — unique, no user input needed
  const accounts = parseAccounts(req.cookies.get("kite_accounts")?.value);
  accounts[kiteUserId] = accessToken;

  const response = NextResponse.redirect(new URL("/stocks?kite=connected", req.url));
  response.cookies.set("kite_accounts", encodeURIComponent(JSON.stringify(accounts)), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  // Clear legacy cookies
  response.cookies.set("kite_pending_label", "", { httpOnly: true, path: "/", maxAge: 0 });
  response.cookies.set("kite_access_token", "", { httpOnly: true, path: "/", maxAge: 0 });
  return response;
}
