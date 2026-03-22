'use client'

import { useEffect, useMemo, useState } from "react";
import { useTheme } from "@/lib/ThemeContext";
import Navbar from "./components/Navbar";
import NetWorthCard from "./components/NetWorthCard";
import MetricCard from "./components/MetricCard";
import AllocationCard from "./components/AllocationCard";
import AssetsTable from "./components/AssetsTable";
import Footer from "./components/Footer";
import { supabase } from "@/lib/supabase";

type DbAssetRow = {
  id: string;
  name: string;
  type: string | null;
  value: number | string | null;
  notes: string | null;
  created_at?: string;
};

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
  cash: "Cash & Savings",
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

  if (
    v === "cash" ||
    v === "cash & savings" ||
    v === "savings" ||
    v === "bank"
  ) return "cash";

  if (v === "crypto" || v === "bitcoin") return "crypto";

  return "other";
}

export default function Home() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [dbAssets, setDbAssets] = useState<DbAssetRow[]>([]);
  const [dbLiabilities, setDbLiabilities] = useState<{ outstanding_amount: number; status: string }[]>([]);
  const [showStickyBar, setShowStickyBar] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowStickyBar(window.scrollY > 260);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
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

    setDbAssets((data as DbAssetRow[]) ?? []);
  };

  const fetchLiabilities = async () => {
    const { data, error } = await supabase
      .from("liabilities")
      .select("outstanding_amount, status");

    if (!error) setDbLiabilities(data ?? []);
  };

  const refreshAll = () => { fetchAssets(); fetchLiabilities(); };

  useEffect(() => {
    fetchAssets();
    fetchLiabilities();
  }, []);

  const summary = useMemo(() => {
    let totalAssets = 0;
    let invested = 0;

    const byCategory: Record<string, number> = {
      stocks: 0,
      gold: 0,
      lended: 0,
      fd: 0,
      realestate: 0,
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

      invested += Number(parsedNotes.invested ?? parsedNotes.avgPurchasePrice ?? 0);
    }

    const liabilities = dbLiabilities
      .filter((l) => l.status === "active")
      .reduce((sum, l) => sum + Number(l.outstanding_amount ?? 0), 0);
    const netWorth = totalAssets - liabilities;
    const totalPnl = totalAssets - invested;
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

    return {
      totalAssets,
      liabilities,
      netWorth,
      invested,
      totalPnl,
      investedPctOfNetWorth,
      totalPnlPct,
      allocationData,
    };
  }, [dbAssets, dbLiabilities]);


  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <Navbar />

      {/* Sticky compact summary bar */}
      <div
        className="fixed left-0 right-0 z-40 flex justify-center px-4 sm:px-5 lg:px-6"
        style={{
          top: 50,
          transform: showStickyBar ? "translateY(0)" : "translateY(-120%)",
          opacity: showStickyBar ? 1 : 0,
          transition: "transform 380ms cubic-bezier(0.34,1.15,0.64,1), opacity 250ms ease",
          pointerEvents: showStickyBar ? "auto" : "none",
        }}
      >
        <div
          className="w-full max-w-[1320px] flex items-center justify-between px-5 py-2.5 mt-2 rounded-[16px]"
          style={{
            background: isDark ? "rgba(18,18,20,0.28)" : "rgba(255,255,255,0.30)",
            backdropFilter: "blur(60px) saturate(240%) brightness(1.1)",
            WebkitBackdropFilter: "blur(60px) saturate(240%) brightness(1.1)",
            border: isDark ? "1px solid rgba(255,255,255,0.09)" : "1px solid rgba(255,255,255,0.7)",
            boxShadow: isDark
              ? "0 4px 24px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.07)"
              : "0 4px 24px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.95)",
          }}
        >
          {/* Net Worth — primary */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-tertiary)" }}>Net Worth</p>
            <p className="text-[17px] font-bold leading-tight" style={{ color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
              {fmtINR(summary.netWorth)}
            </p>
          </div>

          <div className="hidden sm:flex items-center gap-5">
            <div className="w-px h-7" style={{ background: "var(--separator)" }} />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-tertiary)" }}>Total Assets</p>
              <p className="text-[14px] font-semibold" style={{ color: "var(--text-primary)" }}>{fmtINR(summary.totalAssets)}</p>
            </div>
            <div className="w-px h-7" style={{ background: "var(--separator)" }} />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "rgba(255,59,48,0.65)" }}>Liabilities</p>
              <p className="text-[14px] font-semibold" style={{ color: "#ff3b30" }}>{fmtINR(summary.liabilities)}</p>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-tertiary)" }}>P&L</p>
            <p className="text-[14px] font-semibold" style={{ color: summary.totalPnl >= 0 ? "#34c759" : "#ff3b30" }}>
              {summary.totalPnl >= 0 ? "+" : ""}{fmtINR(summary.totalPnl)}
            </p>
          </div>
        </div>
      </div>

      <main className="max-w-[1320px] mx-auto px-4 sm:px-5 lg:px-6 py-4 sm:py-5 lg:py-6 pb-28 lg:pb-6 flex flex-col gap-3 sm:gap-4">
        <div
          className="
            grid gap-3 sm:gap-3.5
            grid-cols-1
            md:grid-cols-[1fr_200px]
            lg:grid-cols-[450px_200px_1fr]
            items-stretch
          "
        >
          <div className="md:col-start-1 md:row-start-1 md:row-span-2 lg:row-span-1 h-full">
            <NetWorthCard
              netWorth={summary.netWorth}
              invested={summary.invested}
              investedPctOfNetWorth={summary.investedPctOfNetWorth}
              totalPnl={summary.totalPnl}
              totalPnlPct={summary.totalPnlPct}
              netWorthChange={0}
            />
          </div>

          <div className="flex flex-row md:flex-col gap-2 md:col-start-2 md:row-start-1 h-full">
            <MetricCard
              label="Total Assets"
              value={fmtINR(summary.totalAssets)}
              sub="Gross portfolio value"
              subColor="muted"
              className="flex-1"
            />
            <MetricCard
              label="Liabilities"
              value={fmtINR(summary.liabilities)}
              sub="Total owed"
              variant="danger"
              className="flex-1"
            />
          </div>

          <div className="md:col-span-2 lg:col-span-1 lg:col-start-3 lg:row-start-1 h-full">
            <AllocationCard
              allocationData={summary.allocationData}
              totalAssets={summary.totalAssets}
            />
          </div>
        </div>

        <AssetsTable onDataChanged={refreshAll} />
      </main>
      <Footer />
    </div>
  );
}