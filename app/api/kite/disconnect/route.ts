import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

function parseAccounts(raw: string | undefined): Record<string, string> {
  if (!raw) return {};
  try { return JSON.parse(decodeURIComponent(raw)); } catch { return {}; }
}

export async function POST(req: NextRequest) {
  const body = await req.formData();
  const label = (body.get("label") as string | null) ?? "Mine";

  // Remove this account from the accounts cookie
  const accounts = parseAccounts(req.cookies.get("kite_accounts")?.value);
  delete accounts[label];

  // Delete holdings for this account from DB (best-effort)
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => req.cookies.getAll(), setAll: () => {} } }
    );
    const { data: { user } } = await supabase.auth.getUser();

    if (user?.id) {
      const adminSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      await adminSupabase
        .from("broker_holdings")
        .delete()
        .eq("user_id", user.id)
        .eq("broker", "kite")
        .eq("account_label", label);
    }
  } catch (err) {
    console.error("[kite/disconnect] DB cleanup error:", err);
  }

  const response = NextResponse.redirect(new URL("/stocks", req.url));

  const remaining = Object.keys(accounts).length;
  if (remaining === 0) {
    response.cookies.set("kite_accounts", "", { httpOnly: true, path: "/", maxAge: 0 });
  } else {
    response.cookies.set("kite_accounts", encodeURIComponent(JSON.stringify(accounts)), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 8,
    });
  }
  // Clear legacy cookie
  response.cookies.set("kite_access_token", "", { httpOnly: true, path: "/", maxAge: 0 });
  return response;
}
