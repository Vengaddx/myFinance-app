"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import Navbar from "@/app/components/Navbar";
import Toast from "@/app/components/toast";
import Footer from "@/app/components/Footer";
import { useTheme } from "@/lib/ThemeContext";

type Snapshot = {
  id: string;
  snapshot_date: string;
  net_worth: number;
  total_assets: number;
  total_liabilities: number;
  invested: number;
  total_pnl: number;
  notes: string | null;
  created_at: string;
};

type DbAssetRow = {
  id: string;
  type: string | null;
  value: number | string | null;
  notes: string | null;
};

type DbLiabilityRow = {
  outstanding_amount: number;
  status: string;
};

type BrokerHolding = {
  quantity: number;
  average_price: number;
  last_price: number;
  tradingsymbol: string;
};

function fmtINR(n: number) {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 10_000_000) return `${sign}₹${(abs / 10_000_000).toFixed(2)} Cr`;
  if (abs >= 100_000) return `${sign}₹${(abs / 100_000).toFixed(1)} L`;
  return `${sign}₹${abs.toLocaleString("en-IN")}`;
}

function fmtDateShort(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
}

function fmtDateFull(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function pctChange(current: number, previous: number) {
  if (previous === 0) return 0;
  return ((current - previous) / Math.abs(previous)) * 100;
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="px-3 py-2.5 rounded-[12px]"
      style={{
        background: "rgba(22,22,24,0.97)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.12)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.45)",
      }}
    >
      <p className="text-[11px] font-medium mb-1" style={{ color: "rgba(255,255,255,0.45)" }}>
        {label ? fmtDateFull(label) : ""}
      </p>
      <p
        className="text-[15px] font-bold text-white"
        style={{ letterSpacing: "-0.02em" }}
      >
        {fmtINR(payload[0].value)}
      </p>
    </div>
  );
}

export default function SnapshotsPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();

  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [takingSnapshot, setTakingSnapshot] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error" | "info">("info");
  const [toastVisible, setToastVisible] = useState(false);

  const [currentAssets, setCurrentAssets] = useState<DbAssetRow[]>([]);
  const [currentLiabilities, setCurrentLiabilities] = useState<DbLiabilityRow[]>([]);
  const [currentBrokerHoldings, setCurrentBrokerHoldings] = useState<BrokerHolding[]>([]);

  const showToast = useCallback(
    (message: string, type: "success" | "error" | "info" = "info") => {
      setToastMessage(message);
      setToastType(type);
      setToastVisible(true);
      setTimeout(() => setToastVisible(false), 2500);
    },
    []
  );

  const fetchSnapshots = useCallback(async () => {
    const { data, error } = await supabase
      .from("networth_snapshots")
      .select("*")
      .order("snapshot_date", { ascending: true });

    if (error) {
      showToast("Failed to load snapshots", "error");
    } else {
      setSnapshots((data as Snapshot[]) ?? []);
    }
    setLoading(false);
  }, [showToast]);

  const fetchCurrentData = useCallback(async () => {
    const [assetsRes, liabsRes, brokerRes] = await Promise.all([
      supabase.from("assets").select("id, type, value, notes"),
      supabase.from("liabilities").select("outstanding_amount, status"),
      supabase.from("broker_holdings").select("tradingsymbol, quantity, average_price, last_price"),
    ]);
    if (!assetsRes.error) setCurrentAssets(assetsRes.data ?? []);
    if (!liabsRes.error) setCurrentLiabilities(liabsRes.data ?? []);
    if (!brokerRes.error) setCurrentBrokerHoldings((brokerRes.data as BrokerHolding[]) ?? []);
  }, []);

  useEffect(() => {
    if (!authLoading && !session) {
      setSnapshots([]);
      setCurrentAssets([]);
      setCurrentLiabilities([]);
      router.replace("/login");
      return;
    }
    if (session) {
      fetchSnapshots();
      fetchCurrentData();
    }
  }, [authLoading, session, router, fetchSnapshots, fetchCurrentData]);

  const currentSummary = useMemo(() => {
    let totalAssets = 0;
    let invested = 0;
    let bankCashValue = 0;

    for (const asset of currentAssets) {
      const val = Number(asset.value ?? 0);
      totalAssets += val;
      let notes: Record<string, unknown> = {};
      try {
        notes = asset.notes ? JSON.parse(asset.notes) : {};
      } catch {
        /* ignore */
      }
      const t = String(asset.type ?? "").toLowerCase().trim();
      const isSimple = t === "bank" || t === "bank account" || t === "cash" || t === "cash & savings" || t === "savings";
      if (isSimple) bankCashValue += val;
      invested += isSimple ? 0 : Number(notes.invested ?? 0);
    }

    // Include broker holdings — same as main dashboard
    for (const h of currentBrokerHoldings) {
      const currentValue = h.quantity * h.last_price;
      const inv = h.quantity * h.average_price;
      totalAssets += currentValue;
      invested += inv;
    }

    const totalLiabilities = currentLiabilities
      .filter((l) => l.status === "active")
      .reduce((sum, l) => sum + Number(l.outstanding_amount ?? 0), 0);

    return {
      totalAssets,
      totalLiabilities,
      netWorth: totalAssets - totalLiabilities,
      invested,
      totalPnl: (totalAssets - bankCashValue) - invested,
    };
  }, [currentAssets, currentLiabilities, currentBrokerHoldings]);

  const handleTakeSnapshot = async () => {
    setTakingSnapshot(true);
    const { totalAssets, totalLiabilities, netWorth, invested, totalPnl } =
      currentSummary;

    const { error } = await supabase.from("networth_snapshots").insert([
      {
        snapshot_date: new Date().toISOString().split("T")[0],
        net_worth: netWorth,
        total_assets: totalAssets,
        total_liabilities: totalLiabilities,
        invested,
        total_pnl: totalPnl,
        notes: noteText.trim() || null,
        user_id: session?.user?.id,
      },
    ]);

    setTakingSnapshot(false);
    setShowModal(false);
    setNoteText("");

    if (error) {
      showToast("Failed to save snapshot", "error");
    } else {
      showToast("Snapshot saved!", "success");
      fetchSnapshots();
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const { error } = await supabase
      .from("networth_snapshots")
      .delete()
      .eq("id", id)
      .eq("user_id", session?.user?.id);
    setDeletingId(null);
    setConfirmDeleteId(null);
    if (error) {
      showToast("Failed to delete snapshot", "error");
    } else {
      showToast("Snapshot deleted", "info");
      setSnapshots((prev) => prev.filter((s) => s.id !== id));
    }
  };

  const stats = useMemo(() => {
    if (snapshots.length === 0) return null;
    const sorted = [...snapshots].sort((a, b) =>
      a.snapshot_date.localeCompare(b.snapshot_date)
    );
    const latest = sorted[sorted.length - 1];
    const first = sorted[0];
    const prev = sorted.length > 1 ? sorted[sorted.length - 2] : null;
    const highest = sorted.reduce((a, b) => (a.net_worth > b.net_worth ? a : b));
    const lowest = sorted.reduce((a, b) => (a.net_worth < b.net_worth ? a : b));

    return {
      latest,
      growthFromFirst: pctChange(latest.net_worth, first.net_worth),
      growthFromPrev: prev ? pctChange(latest.net_worth, prev.net_worth) : null,
      highest,
      lowest,
    };
  }, [snapshots]);

  // Deduplicate by date (keep latest per date) then sort chronologically
  const chartData = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of snapshots) {
      map.set(s.snapshot_date, s.net_worth);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, net_worth]) => ({ date, net_worth }));
  }, [snapshots]);

  const history = useMemo(
    () =>
      [...snapshots].sort((a, b) =>
        b.snapshot_date.localeCompare(a.snapshot_date)
      ),
    [snapshots]
  );

  // Design tokens
  const surface = isDark ? "rgba(28,28,30,1)" : "#ffffff";
  const surfaceBorder = isDark
    ? "1px solid rgba(255,255,255,0.08)"
    : "1px solid rgba(0,0,0,0.06)";
  const surfaceShadow = isDark
    ? "0 0 0 1px rgba(255,255,255,0.04), 0 4px 20px rgba(0,0,0,0.3)"
    : "0 2px 12px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)";

  const today = new Date().toISOString().split("T")[0];

  const statCards = stats
    ? ([
        {
          label: "Latest Net Worth",
          value: fmtINR(stats.latest.net_worth),
          sub: fmtDateFull(stats.latest.snapshot_date),
          subColor: "var(--text-tertiary)" as string,
          valueColor: "var(--text-primary)" as string,
        },
        {
          label: "Overall Growth",
          value: `${stats.growthFromFirst >= 0 ? "+" : ""}${stats.growthFromFirst.toFixed(1)}%`,
          sub: "from first snapshot",
          subColor: stats.growthFromFirst >= 0 ? "#34c759" : "#ff3b30",
          valueColor: stats.growthFromFirst >= 0 ? "#34c759" : "#ff3b30",
        },
        ...(stats.growthFromPrev !== null
          ? [
              {
                label: "Last Change",
                value: `${stats.growthFromPrev >= 0 ? "+" : ""}${stats.growthFromPrev.toFixed(1)}%`,
                sub: "from previous snapshot",
                subColor: stats.growthFromPrev >= 0 ? "#34c759" : "#ff3b30",
                valueColor: stats.growthFromPrev >= 0 ? "#34c759" : "#ff3b30",
              },
            ]
          : []),
        {
          label: "All-Time High",
          value: fmtINR(stats.highest.net_worth),
          sub: fmtDateFull(stats.highest.snapshot_date),
          subColor: "var(--text-tertiary)" as string,
          valueColor: "#34c759" as string,
        },
        {
          label: "All-Time Low",
          value: fmtINR(stats.lowest.net_worth),
          sub: fmtDateFull(stats.lowest.snapshot_date),
          subColor: "var(--text-tertiary)" as string,
          valueColor: "#ff3b30" as string,
        },
        {
          label: "Snapshots",
          value: String(snapshots.length),
          sub: "total recorded",
          subColor: "var(--text-tertiary)" as string,
          valueColor: "var(--text-primary)" as string,
        },
      ] as const)
    : [];

  return (
    <div className="min-h-screen" style={{ paddingTop: "calc(50px + env(safe-area-inset-top))" }}>
      <Toast message={toastMessage} type={toastType} visible={toastVisible} />
      <Navbar />

      {/* Take Snapshot Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowModal(false);
          }}
        >
          <div
            className="w-full max-w-md rounded-[22px] p-6 flex flex-col gap-4"
            style={{
              background: surface,
              border: surfaceBorder,
              boxShadow: "0 24px 64px rgba(0,0,0,0.35)",
            }}
          >
            <div>
              <h3
                className="text-[18px] font-bold"
                style={{ color: "var(--text-primary)", letterSpacing: "-0.02em" }}
              >
                Take Snapshot
              </h3>
              <p className="text-[13px] mt-1" style={{ color: "var(--text-secondary)" }}>
                Recording net worth as of {fmtDateFull(today)}
              </p>
            </div>

            {/* Live preview */}
            <div
              className="rounded-[16px] p-4 grid grid-cols-2 gap-y-3 gap-x-4"
              style={{
                background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
                border: isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.05)",
              }}
            >
              {(
                [
                  { label: "Net Worth", value: fmtINR(currentSummary.netWorth) },
                  { label: "Total Assets", value: fmtINR(currentSummary.totalAssets) },
                  { label: "Liabilities", value: fmtINR(currentSummary.totalLiabilities) },
                  { label: "P&L", value: fmtINR(currentSummary.totalPnl) },
                ] as const
              ).map(({ label, value }) => (
                <div key={label}>
                  <p
                    className="text-[10px] font-semibold uppercase tracking-wider mb-0.5"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {label}
                  </p>
                  <p
                    className="text-[14px] font-bold"
                    style={{ color: "var(--text-primary)", letterSpacing: "-0.015em" }}
                  >
                    {value}
                  </p>
                </div>
              ))}
            </div>

            {/* Notes */}
            <div>
              <label
                className="text-[12px] font-semibold block mb-1.5"
                style={{ color: "var(--text-secondary)" }}
              >
                Notes{" "}
                <span style={{ color: "var(--text-tertiary)", fontWeight: 400 }}>
                  (optional)
                </span>
              </label>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="e.g. Post bonus month, market correction…"
                rows={2}
                className="w-full rounded-[12px] px-3 py-2.5 text-[13px] resize-none outline-none"
                style={{
                  background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                  border: isDark
                    ? "1px solid rgba(255,255,255,0.1)"
                    : "1px solid rgba(0,0,0,0.08)",
                  color: "var(--text-primary)",
                }}
              />
            </div>

            <div className="flex gap-2.5">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-3 rounded-[12px] text-[14px] font-semibold"
                style={{
                  background: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)",
                  color: "var(--text-primary)",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleTakeSnapshot}
                disabled={takingSnapshot}
                className="flex-1 py-3 rounded-[12px] text-[14px] font-bold text-white"
                style={{
                  background: "#007aff",
                  opacity: takingSnapshot ? 0.6 : 1,
                  transition: "opacity 0.15s",
                }}
              >
                {takingSnapshot ? "Saving…" : "Save Snapshot"}
              </button>
            </div>
          </div>
        </div>
      )}

      <main
        className="max-w-[1320px] mx-auto px-4 sm:px-5 lg:px-6 py-4 sm:py-5 lg:py-6 flex flex-col gap-4"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 7rem)" }}
      >
        {/* Page header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => router.push("/")}
              className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-[18px]"
              style={{
                background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
                color: "var(--text-secondary)",
              }}
            >
              ‹
            </button>
            <div className="min-w-0">
              <h1
                className="text-[20px] font-bold leading-tight truncate"
                style={{ color: "var(--text-primary)", letterSpacing: "-0.025em" }}
              >
                Net Worth Timeline
              </h1>
              <p className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>
                {loading
                  ? "Loading…"
                  : `${snapshots.length} snapshot${snapshots.length !== 1 ? "s" : ""}`}
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-[12px] text-[13px] font-bold text-white"
            style={{ background: "#007aff" }}
          >
            <span className="text-[17px] leading-none font-normal">+</span>
            Snapshot
          </button>
        </div>

        {/* Loading spinner */}
        {loading && (
          <div className="flex justify-center py-20">
            <div
              className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: "var(--blue)", borderTopColor: "transparent" }}
            />
          </div>
        )}

        {/* Empty state */}
        {!loading && snapshots.length === 0 && (
          <div
            className="rounded-[24px] py-16 px-8 flex flex-col items-center text-center gap-5"
            style={{ background: surface, border: surfaceBorder, boxShadow: surfaceShadow }}
          >
            <div
              className="w-20 h-20 rounded-[24px] flex items-center justify-center text-[36px]"
              style={{
                background: isDark
                  ? "rgba(0,122,255,0.12)"
                  : "rgba(0,122,255,0.07)",
              }}
            >
              📈
            </div>
            <div>
              <h3
                className="text-[18px] font-bold"
                style={{ color: "var(--text-primary)", letterSpacing: "-0.02em" }}
              >
                Start Your Wealth Journey
              </h3>
              <p
                className="text-[13.5px] mt-2 max-w-xs leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                Take your first snapshot to begin tracking your net worth over time. Each snapshot captures a moment in your financial story.
              </p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="px-7 py-3 rounded-[14px] text-[14px] font-bold text-white"
              style={{ background: "#007aff" }}
            >
              Take First Snapshot
            </button>
          </div>
        )}

        {!loading && snapshots.length > 0 && (
          <>
            {/* Chart card — dark always, matching NetWorthCard aesthetic */}
            <div
              className="rounded-[22px] p-5 sm:p-6"
              style={{
                background: isDark ? "rgba(255,255,255,0.04)" : "#1c1c1e",
                border: isDark ? "1px solid rgba(255,255,255,0.1)" : "none",
                boxShadow: isDark
                  ? "0 0 0 1px rgba(255,255,255,0.07), 0 8px 40px rgba(255,255,255,0.04)"
                  : "0 8px 40px rgba(0,0,0,0.20), 0 1px 3px rgba(0,0,0,0.14)",
              }}
            >
              <p
                className="text-[11px] font-semibold uppercase tracking-[0.13em] mb-1"
                style={{ color: "rgba(255,255,255,0.45)" }}
              >
                Net Worth
              </p>
              {stats && (
                <div className="flex items-end gap-3 mb-1">
                  <p
                    className="text-[30px] font-bold text-white leading-none"
                    style={{ letterSpacing: "-0.03em" }}
                  >
                    {fmtINR(stats.latest.net_worth)}
                  </p>
                  {stats.growthFromFirst !== 0 && (
                    <span
                      className="text-[13px] font-semibold mb-0.5"
                      style={{
                        color: stats.growthFromFirst >= 0 ? "#34c759" : "#ff3b30",
                      }}
                    >
                      {stats.growthFromFirst >= 0 ? "▲" : "▼"}{" "}
                      {Math.abs(stats.growthFromFirst).toFixed(1)}% overall
                    </span>
                  )}
                </div>
              )}

              <div className="mt-5" style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chartData}
                    margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="nwGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#007aff" stopOpacity={0.4} />
                        <stop offset="90%" stopColor="#007aff" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(255,255,255,0.06)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="date"
                      tickFormatter={fmtDateShort}
                      tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tickFormatter={(v: number) => fmtINR(v)}
                      tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      width={64}
                    />
                    <Tooltip
                      content={<ChartTooltip />}
                      cursor={{ stroke: "rgba(255,255,255,0.18)", strokeWidth: 1 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="net_worth"
                      stroke="#007aff"
                      strokeWidth={2.5}
                      fill="url(#nwGrad)"
                      dot={false}
                      activeDot={{
                        r: 5,
                        fill: "#007aff",
                        stroke: "rgba(255,255,255,0.35)",
                        strokeWidth: 2,
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Stats grid */}
            {stats && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
                {statCards.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-[18px] p-4"
                    style={{
                      background: surface,
                      border: surfaceBorder,
                      boxShadow: surfaceShadow,
                    }}
                  >
                    <p
                      className="text-[10px] font-semibold uppercase tracking-wider mb-2"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      {stat.label}
                    </p>
                    <p
                      className="text-[15px] font-bold leading-tight"
                      style={{
                        color: stat.valueColor,
                        letterSpacing: "-0.015em",
                      }}
                    >
                      {stat.value}
                    </p>
                    <p
                      className="text-[11px] mt-1 font-medium leading-snug"
                      style={{ color: stat.subColor }}
                    >
                      {stat.sub}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Snapshot history */}
            <div
              className="rounded-[22px] overflow-hidden"
              style={{
                background: surface,
                border: surfaceBorder,
                boxShadow: surfaceShadow,
              }}
            >
              {/* Header */}
              <div
                className="px-5 py-4"
                style={{ borderBottom: "1px solid var(--separator)" }}
              >
                <h2
                  className="text-[15px] font-bold"
                  style={{ color: "var(--text-primary)", letterSpacing: "-0.02em" }}
                >
                  Snapshot History
                </h2>
              </div>

              {/* Desktop column headers */}
              <div
                className="hidden sm:grid px-5 py-2.5 text-[10.5px] font-semibold uppercase tracking-wider"
                style={{
                  gridTemplateColumns: "140px 1fr 1fr 1fr 1fr 1fr 40px",
                  borderBottom: "1px solid var(--separator-subtle)",
                  background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)",
                  color: "var(--text-tertiary)",
                }}
              >
                <span>Date</span>
                <span>Net Worth</span>
                <span>Assets</span>
                <span>Liabilities</span>
                <span>P&L</span>
                <span>Notes</span>
                <span />
              </div>

              {/* Rows */}
              {history.map((snap, i) => (
                <div
                  key={snap.id}
                  className="group px-5 py-4"
                  style={{
                    borderBottom:
                      i < history.length - 1
                        ? "1px solid var(--separator-subtle)"
                        : "none",
                  }}
                >
                  {/* Mobile */}
                  <div className="sm:hidden">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p
                          className="text-[12px] font-semibold"
                          style={{ color: "var(--text-tertiary)" }}
                        >
                          {fmtDateFull(snap.snapshot_date)}
                        </p>
                        <p
                          className="text-[20px] font-bold mt-0.5"
                          style={{
                            color: "var(--text-primary)",
                            letterSpacing: "-0.025em",
                          }}
                        >
                          {fmtINR(snap.net_worth)}
                        </p>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="text-right">
                          <p
                            className="text-[14px] font-semibold"
                            style={{
                              color: snap.total_pnl >= 0 ? "#34c759" : "#ff3b30",
                              letterSpacing: "-0.01em",
                            }}
                          >
                            {snap.total_pnl >= 0 ? "+" : ""}
                            {fmtINR(snap.total_pnl)}
                          </p>
                          <p
                            className="text-[10px] font-medium mt-0.5 uppercase tracking-wider"
                            style={{ color: "var(--text-tertiary)" }}
                          >
                            P&L
                          </p>
                        </div>
                        {/* Delete */}
                        {confirmDeleteId === snap.id ? (
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <button
                              onClick={() => handleDelete(snap.id)}
                              disabled={deletingId === snap.id}
                              className="text-[11px] font-bold px-2.5 py-1.5 rounded-[8px]"
                              style={{ background: "rgba(255,59,48,0.12)", color: "#ff3b30" }}
                            >
                              {deletingId === snap.id ? "…" : "Delete"}
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="text-[11px] font-semibold px-2.5 py-1.5 rounded-[8px]"
                              style={{
                                background: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)",
                                color: "var(--text-secondary)",
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(snap.id)}
                            className="mt-0.5 w-7 h-7 flex items-center justify-center rounded-[8px]"
                            style={{
                              background: isDark ? "rgba(255,59,48,0.1)" : "rgba(255,59,48,0.08)",
                              color: "#ff3b30",
                            }}
                          >
                            <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                              <path d="M2 4h12M5 4V2.5A.5.5 0 0 1 5.5 2h5a.5.5 0 0 1 .5.5V4M6 7v5M10 7v5M3 4l1 9.5A.5.5 0 0 0 4.5 14h7a.5.5 0 0 0 .5-.5L13 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-5">
                      <div>
                        <p
                          className="text-[10px] font-semibold uppercase tracking-wider"
                          style={{ color: "var(--text-tertiary)" }}
                        >
                          Assets
                        </p>
                        <p
                          className="text-[12px] font-semibold"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          {fmtINR(snap.total_assets)}
                        </p>
                      </div>
                      <div>
                        <p
                          className="text-[10px] font-semibold uppercase tracking-wider"
                          style={{ color: "var(--text-tertiary)" }}
                        >
                          Liabilities
                        </p>
                        <p className="text-[12px] font-semibold" style={{ color: "#ff3b30" }}>
                          {fmtINR(snap.total_liabilities)}
                        </p>
                      </div>
                    </div>
                    {snap.notes && (
                      <p
                        className="text-[11px] mt-2 italic"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        {snap.notes}
                      </p>
                    )}
                  </div>

                  {/* Desktop */}
                  <div
                    className="hidden sm:grid items-center gap-2"
                    style={{ gridTemplateColumns: "140px 1fr 1fr 1fr 1fr 1fr 40px" }}
                  >
                    <p
                      className="text-[13px] font-semibold"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {fmtDateFull(snap.snapshot_date)}
                    </p>
                    <p
                      className="text-[13px] font-bold"
                      style={{
                        color: "var(--text-primary)",
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {fmtINR(snap.net_worth)}
                    </p>
                    <p
                      className="text-[13px]"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {fmtINR(snap.total_assets)}
                    </p>
                    <p className="text-[13px]" style={{ color: "#ff3b30" }}>
                      {fmtINR(snap.total_liabilities)}
                    </p>
                    <p
                      className="text-[13px] font-semibold"
                      style={{
                        color: snap.total_pnl >= 0 ? "#34c759" : "#ff3b30",
                      }}
                    >
                      {snap.total_pnl >= 0 ? "+" : ""}
                      {fmtINR(snap.total_pnl)}
                    </p>
                    <p
                      className="text-[11.5px] italic truncate"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      {snap.notes ?? "—"}
                    </p>
                    {/* Delete */}
                    <div className="flex justify-end">
                      {confirmDeleteId === snap.id ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleDelete(snap.id)}
                            disabled={deletingId === snap.id}
                            className="text-[11px] font-bold px-2 py-1 rounded-[7px]"
                            style={{ background: "rgba(255,59,48,0.12)", color: "#ff3b30" }}
                          >
                            {deletingId === snap.id ? "…" : "Yes"}
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="text-[11px] font-semibold px-2 py-1 rounded-[7px]"
                            style={{
                              background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
                              color: "var(--text-secondary)",
                            }}
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(snap.id)}
                          className="w-7 h-7 flex items-center justify-center rounded-[8px] opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{
                            background: isDark ? "rgba(255,59,48,0.1)" : "rgba(255,59,48,0.08)",
                            color: "#ff3b30",
                          }}
                          title="Delete snapshot"
                        >
                          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                            <path d="M2 4h12M5 4V2.5A.5.5 0 0 1 5.5 2h5a.5.5 0 0 1 .5.5V4M6 7v5M10 7v5M3 4l1 9.5A.5.5 0 0 0 4.5 14h7a.5.5 0 0 0 .5-.5L13 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
