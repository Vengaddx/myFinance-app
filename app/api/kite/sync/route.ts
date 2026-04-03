import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const kiteToken = req.cookies.get("kite_access_token")?.value;
  if (!kiteToken) {
    return NextResponse.redirect(new URL("/stocks?sync=error", req.url));
  }

  // Read Supabase session from cookies (set by createBrowserClient after PKCE login)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => req.cookies.getAll(), setAll: () => {} } }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.id) {
    return NextResponse.json({
      error: "not_authenticated",
      cookies: req.cookies.getAll().map(c => c.name),
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

  // Use service role client to bypass RLS
  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const now = new Date().toISOString();
  const rows = holdings.map((h) => ({
    user_id:        user.id,
    broker:         "kite",
    tradingsymbol:  h.tradingsymbol as string,
    exchange:       h.exchange as string,
    quantity:       h.quantity as number,
    average_price:  h.average_price as number,
    last_price:     h.last_price as number,
    pnl:            h.pnl as number,
    day_change_pct: h.day_change_percentage as number,
    synced_at:      now,
  }));

  // Delete all existing holdings for this user+broker, then insert fresh batch.
  // This avoids duplicates regardless of whether a DB unique constraint exists.
  const { error: deleteError } = await adminSupabase
    .from("broker_holdings")
    .delete()
    .eq("user_id", user.id)
    .eq("broker", "kite");

  if (deleteError) {
    console.error("[kite/sync] DB delete error:", deleteError.message);
    return NextResponse.redirect(new URL("/stocks?sync=error", req.url));
  }

  if (rows.length > 0) {
    const { error: insertError } = await adminSupabase
      .from("broker_holdings")
      .insert(rows);

    if (insertError) {
      console.error("[kite/sync] DB insert error:", insertError.message);
      return NextResponse.redirect(new URL("/stocks?sync=error", req.url));
    }
  }

  return NextResponse.redirect(new URL("/stocks?sync=done", req.url));
}
