import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import PortfolioActions from "@/app/stocks/components/PortfolioActions";
import HoldingsTable from "@/app/stocks/components/HoldingsTable";

interface Holding {
  tradingsymbol: string;
  exchange: string;
  quantity: number;
  average_price: number;
  last_price: number;
  pnl: number;
  day_change_percentage: number;
}

interface HoldingWithAccount extends Holding {
  accountLabel: string;
}

function parseKiteAccounts(raw: string | undefined): Record<string, string> {
  if (!raw) return {};
  try { return JSON.parse(decodeURIComponent(raw)); } catch { return {}; }
}

function makeSupabase(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
}

async function fetchKiteHoldings(accessToken: string): Promise<{ holdings?: Holding[]; error?: string }> {
  // NOTE: returned holdings do not include accountLabel — caller adds it
  try {
    const res = await fetch("https://api.kite.trade/portfolio/holdings", {
      headers: {
        "X-Kite-Version": "3",
        Authorization: `token ${process.env.KITE_API_KEY!}:${accessToken}`,
      },
      cache: "no-store",
    });
    const data = await res.json();
    if (!res.ok) return { error: JSON.stringify(data) };
    return { holdings: data.data ?? [] };
  } catch (e) {
    return { error: String(e) };
  }
}

async function getLastSynced(cookieStore: Awaited<ReturnType<typeof cookies>>): Promise<string | null> {
  try {
    const { data } = await makeSupabase(cookieStore)
      .from("broker_holdings")
      .select("synced_at")
      .eq("broker", "kite")
      .order("synced_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return data?.synced_at ?? null;
  } catch {
    return null;
  }
}

function inr(n: number) {
  return Math.abs(n).toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function StocksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;
  const cookieStore = await cookies();

  // Read multi-account map; fall back to legacy single-account cookie
  let accounts = parseKiteAccounts(cookieStore.get("kite_accounts")?.value);
  const legacyToken = cookieStore.get("kite_access_token")?.value;
  if (Object.keys(accounts).length === 0 && legacyToken) {
    accounts = { Mine: legacyToken };
  }
  const accountLabels = Object.keys(accounts);

  // ── Not connected ─────────────────────────────────────────────────────────────
  if (accountLabels.length === 0) {
    return (
      <div
        className="min-h-screen flex flex-col"
        style={{ paddingTop: "calc(50px + env(safe-area-inset-top))" }}
      >
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-6 py-16">
          <div className="w-full max-w-xs flex flex-col items-center gap-8 text-center">
            <div
              className="w-16 h-16 rounded-[20px] flex items-center justify-center"
              style={{ background: "rgba(174,221,0,0.12)" }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#AEDD00" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </div>
            <div>
              <h1
                className="text-[26px] font-extrabold tracking-tight leading-tight"
                style={{ color: "var(--text-primary)" }}
              >
                Connect Zerodha
              </h1>
              <p
                className="text-[15px] mt-3 leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                Link your Kite account to view live holdings, track P&amp;L, and sync your portfolio.
              </p>
            </div>
            <a
              href="/api/kite/login"
              className="w-full flex items-center justify-center gap-2 rounded-[16px] py-4 px-6 text-[15px] font-semibold"
              style={{ background: "#AEDD00", color: "#000", transition: "opacity 180ms ease" }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
              Connect Kite
            </a>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // ── Fetch holdings from all connected accounts + last synced ─────────────────
  const [accountResults, lastSyncedAt] = await Promise.all([
    Promise.all(
      Object.entries(accounts).map(async ([label, token]) => {
        const res = await fetchKiteHoldings(token);
        return { label, ...res };
      })
    ),
    getLastSynced(cookieStore),
  ]);

  const allSucceeded = accountResults.every((r) => !r.error);
  const allFailed = accountResults.every((r) => !!r.error);

  // Combine holdings from all accounts that succeeded
  const allHoldings: HoldingWithAccount[] = [];
  for (const { label, holdings, error } of accountResults) {
    if (!error && holdings) {
      for (const h of holdings) allHoldings.push({ ...h, accountLabel: label });
    }
  }

  // ── All accounts errored ───────────────────────────────────────────────────────
  if (allFailed) {
    const firstError = accountResults[0]?.error ?? "Unknown error";
    const result = { error: firstError };
    return (
      <div
        className="min-h-screen flex flex-col"
        style={{ paddingTop: "calc(50px + env(safe-area-inset-top))" }}
      >
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-6">
          <div
            className="w-full max-w-sm rounded-[28px] p-10 flex flex-col items-center gap-5 text-center"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--separator)",
              boxShadow: "0 2px 20px rgba(0,0,0,0.06)",
            }}
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: "rgba(255,59,48,0.10)" }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff3b30" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <div>
              <p className="text-[16px] font-semibold" style={{ color: "var(--text-primary)" }}>
                Connection Error
              </p>
              <p className="text-[12px] mt-2 break-all leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                {result.error}
              </p>
            </div>
            <a
              href="/api/kite/login"
              className="inline-flex items-center gap-2 rounded-[12px] py-2.5 px-5 text-[14px] font-semibold"
              style={{ background: "#AEDD00", color: "#000" }}
            >
              Reconnect Kite
            </a>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // ── Portfolio calculations (across all accounts) ─────────────────────────────
  const totalValue    = allHoldings.reduce((s, h) => s + h.last_price * h.quantity, 0);
  const totalInvested = allHoldings.reduce((s, h) => s + h.average_price * h.quantity, 0);
  const totalPnl      = allHoldings.reduce((s, h) => s + h.pnl, 0);
  const totalPnlPct   = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;
  const totalDayChange = allHoldings.reduce(
    (s, h) => s + (h.last_price * h.quantity * h.day_change_percentage) / 100,
    0
  );

  const isUp           = totalPnl >= 0;
  const isDayUp        = totalDayChange >= 0;
  const pnlColor       = isUp    ? "#1f9d55" : "#d9473f";
  const dayColor       = isDayUp ? "#1f9d55" : "#d9473f";
  const prevValue      = totalValue - totalDayChange;
  const totalDayChangePct = prevValue > 0 ? (totalDayChange / prevValue) * 100 : 0;

  const formattedSync = lastSyncedAt
    ? new Date(lastSyncedAt).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const topHolding = [...allHoldings].sort(
    (a, b) => b.last_price * b.quantity - a.last_price * a.quantity
  )[0];

  // Partial-error banner: some accounts failed, others succeeded
  const failedAccounts = accountResults.filter((r) => r.error).map((r) => r.label);

  // Prepare holdings data for the sortable table
  const holdingsForTable = allHoldings.map((h) => {
    const invested = h.average_price * h.quantity;
    return {
      tradingsymbol: h.tradingsymbol,
      exchange: h.exchange,
      quantity: h.quantity,
      averagePrice: h.average_price,
      lastPrice: h.last_price,
      currentValue: h.last_price * h.quantity,
      pnl: h.pnl,
      pnlPct: invested > 0 ? (h.pnl / invested) * 100 : 0,
      dayChangePct: h.day_change_percentage,
      accountLabel: h.accountLabel,
    };
  });

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ paddingTop: "calc(50px + env(safe-area-inset-top))" }}
    >
      <Navbar />
      <main
        className="flex-1 px-4 py-6 max-w-5xl mx-auto w-full"
        style={{ paddingBottom: "calc(80px + env(safe-area-inset-bottom))" }}
      >

        {/* ── Sync feedback ── */}
        {/* Partial-error banner: some accounts failed to fetch live data */}
        {!allSucceeded && failedAccounts.length > 0 && (
          <div
            className="mb-4 flex items-center gap-2 rounded-[18px] px-4 py-3"
            style={{ background: "rgba(217,71,63,0.08)", border: "1px solid rgba(217,71,63,0.14)" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d9473f" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span className="text-[13px] font-medium" style={{ color: "#d9473f" }}>
              {failedAccounts.join(", ")} — token expired. Please reconnect.
            </span>
          </div>
        )}

        {params.sync === "done" && (
          <div
            className="mb-4 flex items-center gap-2 rounded-[18px] px-4 py-3"
            style={{
              background: "rgba(31,157,85,0.10)",
              border: "1px solid rgba(31,157,85,0.16)",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1f9d55" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span className="text-[13px] font-medium" style={{ color: "#1f9d55" }}>
              Portfolio synced successfully
            </span>
          </div>
        )}
        {params.sync === "error" && (
          <div
            className="mb-4 flex items-center gap-2 rounded-[18px] px-4 py-3"
            style={{
              background: "rgba(217,71,63,0.08)",
              border: "1px solid rgba(217,71,63,0.14)",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d9473f" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span className="text-[13px] font-medium" style={{ color: "#d9473f" }}>
              Sync failed — try reconnecting
            </span>
          </div>
        )}

        {/* ── Hero card ── */}
        <section
          className="relative overflow-hidden rounded-[32px] px-5 py-5 md:px-8 md:py-7"
          style={{
            backgroundColor: "var(--surface)",
            backgroundImage: "radial-gradient(ellipse at top left, rgba(174,221,0,0.14), transparent 38%)",
            border: "1px solid var(--separator)",
            boxShadow: "0 4px 32px rgba(0,0,0,0.10)",
          }}
        >
          {/* Decorative glow */}
          <div
            className="pointer-events-none absolute -right-10 top-6 h-40 w-40 rounded-full"
            style={{ background: "rgba(174,221,0,0.09)", filter: "blur(28px)" }}
          />

          <div className="relative flex flex-col gap-5">
            {/* Top row: identity + actions */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-[12px]"
                  style={{ background: "rgba(174,221,0,0.14)" }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#759800" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                  </svg>
                </div>
                <div>
                  <p
                    className="text-[11px] font-semibold uppercase tracking-[0.22em]"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    Mahfin Portfolio
                  </p>
                  <p className="text-[13px] font-medium" style={{ color: "var(--text-secondary)" }}>
                    Live holdings · Zerodha Kite
                    {accountLabels.length > 1 && ` · ${accountLabels.length} accounts`}
                  </p>
                </div>
              </div>
              <PortfolioActions accounts={accountLabels} />
            </div>

            {/* Value + snapshot layout */}
            <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              {/* Left: value */}
              <div>
                <p
                  className="text-[12px] font-semibold uppercase tracking-[0.22em]"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  Total Portfolio Value
                </p>
                <h1
                  className="mt-2.5 text-[42px] font-semibold tracking-[-0.05em] leading-none md:text-[58px]"
                  style={{ color: "var(--text-primary)" }}
                >
                  ₹{inr(totalValue)}
                </h1>

                {/* P&L metrics */}
                <div className="mt-4 flex flex-col gap-2.5">
                  {/* Today's change — primary metric */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="text-[11px] font-semibold uppercase tracking-[0.18em]"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      Today
                    </span>
                    <span
                      className="text-[22px] font-semibold tracking-[-0.03em]"
                      style={{ color: dayColor }}
                    >
                      {isDayUp ? "+" : "−"}₹{inr(totalDayChange)}
                    </span>
                    <span
                      className="rounded-full px-3 py-1 text-[13px] font-semibold"
                      style={{
                        background: isDayUp ? "rgba(31,157,85,0.12)" : "rgba(217,71,63,0.11)",
                        color: dayColor,
                      }}
                    >
                      {isDayUp ? "+" : "−"}{Math.abs(totalDayChangePct).toFixed(2)}%
                    </span>
                  </div>

                  {/* Lifetime P&L — secondary metric */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="text-[11px] font-semibold uppercase tracking-[0.18em]"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      All-time
                    </span>
                    <span className="text-[16px] font-semibold" style={{ color: pnlColor }}>
                      {isUp ? "+" : "−"}₹{inr(totalPnl)}
                    </span>
                    <span
                      className="rounded-full px-2.5 py-0.5 text-[12px] font-semibold"
                      style={{
                        background: isUp ? "rgba(31,157,85,0.10)" : "rgba(217,71,63,0.10)",
                        color: pnlColor,
                      }}
                    >
                      {isUp ? "+" : "−"}{Math.abs(totalPnlPct).toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: snapshot panel */}
              <div
                className="w-full rounded-[22px] p-4 md:max-w-[250px] md:flex-shrink-0"
                style={{
                  backgroundColor: "var(--surface-raised)",
                  border: "1px solid var(--separator)",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
                  backdropFilter: "blur(16px)",
                }}
              >
                <p
                  className="text-[11px] font-semibold uppercase tracking-[0.18em]"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  Portfolio Snapshot
                </p>
                <div className="mt-3 space-y-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
                      Total invested
                    </span>
                    <span className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>
                      ₹{inr(totalInvested)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
                      Holdings
                    </span>
                    <span className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>
                      {allHoldings.length}
                    </span>
                  </div>
                  {topHolding && (
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
                        Largest
                      </span>
                      <span className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>
                        {topHolding.tradingsymbol}
                      </span>
                    </div>
                  )}
                  {formattedSync && (
                    <div
                      className="border-t pt-2.5"
                      style={{ borderColor: "var(--separator-subtle)" }}
                    >
                      <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                        Synced {formattedSync}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Add another Kite account ── */}
        <section className="mt-4 px-1">
          <a
            href="/api/kite/login"
            className="inline-flex items-center gap-2 text-[13px] font-medium"
            style={{ color: "var(--text-tertiary)" }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
            </svg>
            Connect another Kite account
          </a>
        </section>

        {/* ── Holdings table ── */}
        <section className="mt-6">
          <div className="mb-4 flex items-end justify-between gap-3 px-1">
            <div>
              <h2
                className="text-[22px] font-semibold tracking-[-0.03em]"
                style={{ color: "var(--text-primary)" }}
              >
                Holdings
              </h2>
              <p className="mt-0.5 text-[13px]" style={{ color: "var(--text-secondary)" }}>
                {allHoldings.length} {allHoldings.length === 1 ? "open position" : "open positions"} · sorted by P&amp;L
              </p>
            </div>
          </div>

          <HoldingsTable holdings={holdingsForTable} />
        </section>

        {formattedSync && (
          <p
            className="mt-6 text-center text-[12px]"
            style={{ color: "var(--text-tertiary)" }}
          >
            Last synced {formattedSync}
          </p>
        )}

      </main>
      <Footer />
    </div>
  );
}
