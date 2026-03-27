import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const accessToken = req.cookies.get("kite_access_token")?.value;
  const apiKey = process.env.KITE_API_KEY!;

  console.log("[kite/holdings] called — cookie present:", !!accessToken);

  if (!accessToken) {
    return NextResponse.json({ error: "not_connected" }, { status: 401 });
  }


  const controller = new AbortController();
  const timer = setTimeout(() => {
    console.log("[kite/holdings] Kite API timed out after 8s — aborting");
    controller.abort();
  }, 8000);

  try {
    console.log("[kite/holdings] calling Kite API…");
    const res = await fetch("https://api.kite.trade/portfolio/holdings", {
      headers: {
        "X-Kite-Version": "3",
        Authorization: `token ${apiKey}:${accessToken}`,
      },
      signal: controller.signal,
    });
    clearTimeout(timer);

    const text = await res.text();
    console.log("[kite/holdings] Kite status:", res.status, "| body:", text.slice(0, 300));

    let data: Record<string, unknown>;
    try {
      data = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: "bad_json", raw: text.slice(0, 200) }, { status: 500 });
    }

    if (!res.ok) {
      return NextResponse.json({ error: "kite_error", detail: data }, { status: res.status });
    }

    return NextResponse.json({ holdings: (data.data as unknown[]) ?? [] });
  } catch (err: unknown) {
    clearTimeout(timer);
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[kite/holdings] error:", msg);
    return NextResponse.json({ error: "fetch_failed", detail: msg }, { status: 500 });
  }
}
