import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabase-admin";

function parseAccounts(raw: string | undefined): Record<string, string> {
  if (!raw) return {};
  try { return JSON.parse(decodeURIComponent(raw)); } catch { return {}; }
}

export async function POST(req: NextRequest) {
  // Which account to sync
  const body = await req.formData();
  const label = (body.get("label") as string | null) ?? "Mine";

  // Resolve token for this account
  const accounts = parseAccounts(req.cookies.get("kite_accounts")?.value);
  // Backward-compat: old single-account cookie
  if (!accounts["Mine"]) {
    const old = req.cookies.get("kite_access_token")?.value;
    if (old) accounts["Mine"] = old;
  }

  const kiteToken = accounts[label];
  if (!kiteToken) {
    return NextResponse.redirect(new URL("/stocks?sync=error", req.url));
  }

  // Get Supabase user (auth stored in cookies by createBrowserClient)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => req.cookies.getAll(), setAll: () => {} } }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.id) {
    return NextResponse.json({
      error: "not_authenticated",
      hint: "No Supabase session in cookies. Log out and log back in.",
    }, { status: 401 });
  }

  // Fetch from Kite
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  let holdings: Record<string, unknown>[] = [];

  try {
    const res = await fetch("https://api.kite.trade/portfolio/holdings", {
      headers: {
        "X-Kite-Version": "3",
        Authorization: `token ${process.env.KITE_API_KEY!}:${kiteToken}`,
      },
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timer);

    const data = await res.json();
    if (!res.ok) {
      console.error("[kite/sync] Kite error:", data);
      return NextResponse.redirect(new URL("/stocks?sync=error", req.url));
    }
    holdings = data.data ?? [];
  } catch (err) {
    clearTimeout(timer);
    console.error("[kite/sync] fetch error:", err);
    return NextResponse.redirect(new URL("/stocks?sync=error", req.url));
  }

  const now = new Date().toISOString();
  const rows = holdings.map((h) => ({
    user_id:        user.id,
    broker:         "kite",
    account_label:  label,
    tradingsymbol:  h.tradingsymbol as string,
    exchange:       h.exchange as string,
    quantity:       h.quantity as number,
    average_price:  h.average_price as number,
    last_price:     h.last_price as number,
    pnl:            h.pnl as number,
    day_change_pct: h.day_change_percentage as number,
    synced_at:      now,
  }));

  // Delete all holdings for this user + broker + account, then insert fresh batch
  const { error: deleteError } = await supabaseAdmin
    .from("broker_holdings")
    .delete()
    .eq("user_id", user.id)
    .eq("broker", "kite")
    .eq("account_label", label);

  if (deleteError) {
    console.error("[kite/sync] DB delete error:", deleteError.message);
    return NextResponse.redirect(new URL("/stocks?sync=error", req.url));
  }

  if (rows.length > 0) {
    const { error: insertError } = await supabaseAdmin
      .from("broker_holdings")
      .insert(rows);

    if (insertError) {
      console.error("[kite/sync] DB insert error:", insertError.message);
      return NextResponse.redirect(new URL("/stocks?sync=error", req.url));
    }
  }

  return NextResponse.redirect(new URL("/stocks?sync=done", req.url));
}
