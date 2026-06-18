import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

function parseAccounts(raw: string | undefined): Record<string, string> {
  if (!raw) return {};
  try { return JSON.parse(decodeURIComponent(raw)); } catch { return {}; }
}

export async function GET(req: NextRequest) {
  const accounts = parseAccounts(req.cookies.get("kite_accounts")?.value);
  const legacyToken = req.cookies.get("kite_access_token")?.value;

  let labels = Object.keys(accounts);
  if (labels.length === 0 && legacyToken) labels = ["Mine"];

  let lastSyncedAt: string | null = null;
  if (labels.length > 0) {
    try {
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { getAll: () => req.cookies.getAll(), setAll: () => {} } }
      );
      const { data } = await supabase
        .from("broker_holdings")
        .select("synced_at")
        .eq("broker", "kite")
        .order("synced_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      lastSyncedAt = data?.synced_at ?? null;
    } catch { /* ignore */ }
  }

  return NextResponse.json({ connected: labels.length > 0, labels, lastSyncedAt });
}
