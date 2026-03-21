'use client'

import { useEffect, useMemo, useState } from "react";
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
  const [dbAssets, setDbAssets] = useState<DbAssetRow[]>([]);

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

  useEffect(() => {
    fetchAssets();
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

    const liabilities = 0;
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
  }, [dbAssets]);


  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <Navbar />

      <main className="max-w-[1320px] mx-auto px-4 sm:px-5 lg:px-6 py-4 sm:py-5 lg:py-6 flex flex-col gap-3 sm:gap-4">
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

        <AssetsTable onDataChanged={fetchAssets} />
      </main>
      <Footer />
    </div>
  );
}