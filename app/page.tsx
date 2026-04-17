'use client'

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/lib/ThemeContext";
import { useAuth } from "@/lib/AuthContext";
import Navbar from "./components/Navbar";
import OnboardingFlow from "./components/OnboardingFlow";
import NetWorthCard from "./components/NetWorthCard";
import AllocationCard, { type TopHolding } from "./components/AllocationCard";
import AssetsTable, { type StickyBarData } from "./components/AssetsTable";
import Footer from "./components/Footer";
import SplashScreen from "./components/SplashScreen";
import { supabase } from "@/lib/supabase";

type DbAssetRow = {
  id: string;
  name: string;
  type: string | null;
  value: number | string | null;
  notes: string | null;
  created_at?: string;
};

type BrokerHolding = {
  tradingsymbol: string;
  quantity: number;
  average_price: number;
  last_price: number;
  pnl: number;
};

const KITE_GOLD_EXACT = new Set(["SILVERBEES", "GOLDBEES"]);
function isKiteGold(tradingsymbol: string) {
  return tradingsymbol.startsWith("SGB") || KITE_GOLD_EXACT.has(tradingsymbol);
}

function fmtINR(n: number) {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(2)} Cr`;
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(1)} L`;
  return `₹${n.toLocaleString("en-IN")}`;
}

const allocationColorMap: Record<string, string> = {
  stocks: "#00C1FF",
  gold: "#FFBB00",
  lended: "#1e7a3e",
  fd: "#0055b3",
  realestate: "#AEDD00",
  bank: "#4DA8FF",
  cash: "#636366",
  crypto: "#5b30c0",
  other: "#8E8E93",
};

const allocationLabelMap: Record<string, string> = {
  stocks: "Stocks & ETFs",
  gold: "Gold & Silver",
  lended: "Lended",
  fd: "Fixed Deposits",
  realestate: "Real Estate",
  bank: "Bank Account",
  cash: "Cash",
  crypto: "Crypto",
  other: "Other",
};

function normalizeCategory(value?: string | null) {
  const v = String(value ?? "").toLowerCase().trim();

  if (
    v === "stocks" ||
    v === "stock" ||
    v === "etf" ||
    v === "equity" ||
    v === "stocks & etfs"
  ) return "stocks";

  if (
    v === "gold" ||
    v === "silver" ||
    v === "commodity" ||
    v === "gold & silver"
  ) return "gold";

  if (v === "lended" || v === "lend" || v === "loan given") return "lended";

  if (
    v === "fd" ||
    v === "fixed deposits" ||
    v === "fixed deposit" ||
    v === "fixed" ||
    v === "fixed income" ||
    v === "bond" ||
    v === "bonds"
  ) return "fd";

  if (
    v === "realestate" ||
    v === "real estate" ||
    v === "property"
  ) return "realestate";

  if (v === "bank" || v === "bank account") return "bank";

  if (
    v === "cash" ||
    v === "cash & savings" ||
    v === "savings"
  ) return "cash";

  if (v === "crypto" || v === "bitcoin") return "crypto";

  return "other";
}

export default function Home() {
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { session, loading: authLoading, profile, profileLoading } = useAuth();
  const [dbAssets, setDbAssets] = useState<DbAssetRow[]>([]);
  const [dbLiabilities, setDbLiabilities] = useState<{ outstanding_amount: number; status: string }[]>([]);
  const [brokerHoldings, setBrokerHoldings] = useState<BrokerHolding[]>([]);
  const [showSplash, setShowSplash] = useState(false);
  const [stickyVisible, setStickyVisible] = useState(false);
  const [stickyData, setStickyData] = useState<StickyBarData | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [tableRefreshKey, setTableRefreshKey] = useState(0);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Auth guard — redirect to login and wipe local state if not signed in
  useEffect(() => {
    if (!authLoading && !session) {
      setDbAssets([]);
      setDbLiabilities([]);
      router.replace("/login");
    }
  }, [authLoading, session, router]);

  // Onboarding — driven by profile.onboarding_completed, not asset count
  useEffect(() => {
    if (profileLoading) return;
    setShowOnboarding(profile !== null && !profile.onboarding_completed);
  }, [profile, profileLoading]);

  useEffect(() => {
    const mobile = window.innerWidth < 768;
    const seen = sessionStorage.getItem("mahfin_splash");
    if (mobile && !seen) setShowSplash(true);
  }, []);

  const handleSplashDone = () => {
    sessionStorage.setItem("mahfin_splash", "1");
    setShowSplash(false);
  };

  // Show sticky bar whenever any part of the assets table is visible in the viewport.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setStickyVisible(entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const fetchAssets = async () => {
    const { data, error } = await supabase
      .from("assets")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Summary fetch error:", error);
      return;
    }

    const assets = (data as DbAssetRow[]) ?? [];
    setDbAssets(assets);
    setDataLoaded(true);
  };

  const fetchLiabilities = async () => {
    const { data, error } = await supabase
      .from("liabilities")
      .select("outstanding_amount, status");

    if (!error) setDbLiabilities(data ?? []);
  };

  const fetchBrokerHoldings = async () => {
    const { data, error } = await supabase
      .from("broker_holdings")
      .select("tradingsymbol, quantity, average_price, last_price, pnl");

    if (!error) setBrokerHoldings((data as BrokerHolding[]) ?? []);
  };

  const refreshAll = () => { fetchAssets(); fetchLiabilities(); fetchBrokerHoldings(); };

  useEffect(() => {
    fetchAssets();
    fetchLiabilities();
    fetchBrokerHoldings();
  }, []);

  const summary = useMemo(() => {
    let totalAssets = 0;
    let invested = 0;
    let bankCashValue = 0;

    const byCategory: Record<string, number> = {
      stocks: 0,
      gold: 0,
      lended: 0,
      fd: 0,
      realestate: 0,
      bank: 0,
      cash: 0,
      crypto: 0,
      other: 0,
    };

    for (const asset of dbAssets) {
      const currentValue = Number(asset.value ?? 0);
      totalAssets += currentValue;

      const category = normalizeCategory(asset.type);
      byCategory[category] += currentValue;

      let parsedNotes: Record<string, unknown> = {};
      try {
        parsedNotes = asset.notes ? JSON.parse(asset.notes) : {};
      } catch {
        parsedNotes = {};
      }

      // Bank/cash have no invested amount — P&L is always 0 for those
      const isSimple = category === "bank" || category === "cash";
      if (isSimple) bankCashValue += currentValue;
      invested += isSimple ? 0 : Number(parsedNotes.invested ?? 0);
    }

    // Include Kite broker holdings
    for (const h of brokerHoldings) {
      const currentValue = h.quantity * h.last_price;
      const inv = h.quantity * h.average_price;
      totalAssets += currentValue;
      invested += inv;
      const category = isKiteGold(h.tradingsymbol) ? "gold" : "stocks";
      byCategory[category] += currentValue;
    }

    const liabilities = dbLiabilities
      .filter((l) => l.status === "active")
      .reduce((sum, l) => sum + Number(l.outstanding_amount ?? 0), 0);
    const netWorth = totalAssets - liabilities;
    // Exclude bank/cash balances from P&L — they have no cost basis
    const totalPnl = (totalAssets - bankCashValue) - invested;
    const investedPctOfNetWorth =
      netWorth > 0 ? Number(((invested / netWorth) * 100).toFixed(1)) : 0;
    const totalPnlPct =
      invested > 0 ? Number(((totalPnl / invested) * 100).toFixed(1)) : 0;

    const allocationData = Object.entries(byCategory)
      .filter(([, amount]) => amount > 0)
      .map(([key, amount]) => ({
        label: allocationLabelMap[key] ?? key,
        pct: totalAssets > 0 ? Number(((amount / totalAssets) * 100).toFixed(1)) : 0,
        amount,
        color: allocationColorMap[key] ?? "#8E8E93",
      }))
      .sort((a, b) => b.amount - a.amount);

    const topHoldings: TopHolding[] = [...dbAssets]
      .sort((a, b) => Number(b.value ?? 0) - Number(a.value ?? 0))
      .slice(0, 6)
      .map((a) => {
        const cat = normalizeCategory(a.type);
        const val = Number(a.value ?? 0);
        return {
          name: a.name,
          categoryLabel: allocationLabelMap[cat] ?? cat,
          color: allocationColorMap[cat] ?? "#8E8E93",
          value: val,
          pct: totalAssets > 0 ? (val / totalAssets) * 100 : 0,
        };
      });

    return {
      totalAssets,
      liabilities,
      netWorth,
      invested,
      totalPnl,
      investedPctOfNetWorth,
      totalPnlPct,
      allocationData,
      topHoldings,
      byCategory,
    };
  }, [dbAssets, dbLiabilities, brokerHoldings]);


  // Blank screen while auth resolves or redirecting
  if (authLoading || !session) {
    return <div className="min-h-screen" />;
  }

  return (
    <div className="min-h-screen" style={{ paddingTop: "calc(50px + env(safe-area-inset-top))" }}>
      {showOnboarding && (
        <OnboardingFlow
          onComplete={() => {
            setShowOnboarding(false);
            refreshAll();
            setTableRefreshKey((k) => k + 1);
          }}
        />
      )}
      {showSplash && <SplashScreen onDone={handleSplashDone} />}
      <Navbar />

      {/* Context-aware sticky summary bar */}
      <div
        className="md:hidden fixed left-0 right-0 z-40 flex justify-center px-4 sm:px-5 lg:px-6"
        style={{
          top: "calc(50px + env(safe-area-inset-top))",
          transform: (stickyVisible && stickyData?.categoryLabel !== "All Assets") ? "translateY(0)" : "translateY(-130%)",
          opacity: (stickyVisible && stickyData?.categoryLabel !== "All Assets") ? 1 : 0,
          transition: "transform 360ms cubic-bezier(0.34,1.15,0.64,1), opacity 220ms ease",
          pointerEvents: (stickyVisible && stickyData?.categoryLabel !== "All Assets") ? "auto" : "none",
        }}
      >
        <div
          className="w-full max-w-[1320px] flex flex-col gap-1.5 px-4 py-3 mt-2 rounded-[16px]"
          style={{
            background: isDark ? "rgba(18,18,20,0.55)" : "rgba(255,255,255,0.62)",
            backdropFilter: "blur(48px) saturate(220%) brightness(1.06)",
            WebkitBackdropFilter: "blur(48px) saturate(220%) brightness(1.06)",
            border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(255,255,255,0.78)",
            boxShadow: isDark
              ? "0 8px 28px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.1)"
              : "0 8px 28px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,1)",
          }}
        >
          {/* Row 1: Section label + category */}
          <p className="text-[12px] font-bold" style={{ color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
            {stickyData?.sectionTab === "expenses" ? "Expenses" : stickyData?.sectionTab === "liabilities" ? "Liabilities" : "Assets"}
            {stickyData?.sectionTab === "assets" && stickyData.categoryLabel !== "All Assets" && (
              <span className="ml-1.5 text-[11px] font-semibold" style={{ color: "var(--text-tertiary)" }}>
                · {stickyData.categoryLabel}
              </span>
            )}
          </p>

          {/* Row 2: Metrics */}
          {(!stickyData || stickyData.sectionTab === "assets") && (
            <div className="flex items-center gap-5">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Cur. Value</p>
                <p className="text-[13px] font-semibold" style={{ color: "var(--text-primary)", letterSpacing: "-0.015em" }}>
                  {fmtINR(stickyData?.curVal ?? 0)}
                </p>
              </div>
              <div className="w-px h-6" style={{ background: "var(--separator)" }} />
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>P&L</p>
                <p className="text-[13px] font-semibold" style={{ color: (stickyData?.pnl ?? 0) >= 0 ? "#34c759" : "#ff3b30", letterSpacing: "-0.015em" }}>
                  {(stickyData?.pnl ?? 0) >= 0 ? "+" : ""}{fmtINR(stickyData?.pnl ?? 0)}
                  <span className="text-[11px] font-medium ml-1" style={{ opacity: 0.75 }}>
                    ({(stickyData?.pnlPct ?? 0) >= 0 ? "+" : ""}{(stickyData?.pnlPct ?? 0).toFixed(1)}%)
                  </span>
                </p>
              </div>
            </div>
          )}

          {stickyData?.sectionTab === "liabilities" && (
            <div className="flex items-center gap-5">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Outstanding</p>
                <p className="text-[13px] font-semibold" style={{ color: "#ff3b30", letterSpacing: "-0.015em" }}>
                  {fmtINR(stickyData.outstanding)}
                </p>
              </div>
              <div className="w-px h-6" style={{ background: "var(--separator)" }} />
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Borrowed</p>
                <p className="text-[13px] font-semibold" style={{ color: "var(--text-primary)", letterSpacing: "-0.015em" }}>
                  {fmtINR(stickyData.totalBorrowed)}
                </p>
              </div>
              <div className="w-px h-6" style={{ background: "var(--separator)" }} />
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Count</p>
                <p className="text-[13px] font-semibold" style={{ color: "var(--text-primary)", letterSpacing: "-0.015em" }}>
                  {stickyData.liabilityCount}
                </p>
              </div>
            </div>
          )}

          {stickyData?.sectionTab === "expenses" && (
            <div className="flex items-center gap-5">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Spent</p>
                <p className="text-[13px] font-semibold" style={{ color: "var(--text-primary)", letterSpacing: "-0.015em" }}>
                  {fmtINR(stickyData.expensesTotal ?? 0)}
                </p>
              </div>
              <div className="w-px h-6" style={{ background: "var(--separator)" }} />
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Claim Eligible</p>
                <p className="text-[13px] font-semibold" style={{ color: "#007aff", letterSpacing: "-0.015em" }}>
                  {fmtINR(stickyData.expensesClaimEligible ?? 0)}
                </p>
              </div>
              <div className="w-px h-6" style={{ background: "var(--separator)" }} />
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>SW Pending</p>
                <p className="text-[13px] font-semibold" style={{ color: "#ff9500", letterSpacing: "-0.015em" }}>
                  {fmtINR(stickyData.expensesSplitPending ?? 0)}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <main className="max-w-[1320px] mx-auto px-4 sm:px-5 lg:px-6 py-4 sm:py-5 lg:py-6 lg:pb-6 flex flex-col gap-3 sm:gap-4" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 7rem)" }}>
        <div className="grid gap-3 sm:gap-3.5 grid-cols-1 md:grid-cols-2 items-stretch">
          <NetWorthCard
            netWorth={summary.netWorth}
            invested={summary.invested}
            investedPctOfNetWorth={summary.investedPctOfNetWorth}
            totalPnl={summary.totalPnl}
            totalPnlPct={summary.totalPnlPct}
            totalAssets={summary.totalAssets}
            liabilities={summary.liabilities}
            netWorthChange={0}
            onClick={() => router.push("/snapshots")}
          />
          <div className="hidden md:block h-full">
            <AllocationCard
              allocationData={summary.allocationData}
              totalAssets={summary.totalAssets}
              topHoldings={summary.topHoldings}
              byCategory={summary.byCategory}
            />
          </div>
        </div>

        <div ref={sentinelRef}>
          <AssetsTable onDataChanged={refreshAll} onSummaryChange={setStickyData} refreshKey={tableRefreshKey} />
        </div>
      </main>
      <Footer />
    </div>
  );
}