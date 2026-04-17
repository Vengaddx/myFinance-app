"use client";

import { useState, useEffect, useCallback } from "react";
import { useTheme } from "@/lib/ThemeContext";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";

const CATEGORIES = [
  "stocks", "gold", "fd", "realestate", "crypto", "bank", "cash", "lended", "other",
] as const;

const CAT_LABELS: Record<string, string> = {
  stocks: "Stocks & ETFs",
  gold: "Gold & Silver",
  fd: "Fixed Deposits",
  realestate: "Real Estate",
  crypto: "Crypto",
  bank: "Bank",
  cash: "Cash",
  lended: "Lended",
  other: "Other",
};

const CAT_COLORS: Record<string, string> = {
  stocks: "#00C1FF",
  gold: "#FFBB00",
  fd: "#0055b3",
  realestate: "#AEDD00",
  crypto: "#5b30c0",
  bank: "#4DA8FF",
  cash: "#636366",
  lended: "#1e7a3e",
  other: "#8E8E93",
};

type AllocationItem = {
  label: string;
  pct: number;
  amount: number;
  color: string;
};

export type TopHolding = {
  name: string;
  categoryLabel: string;
  color: string;
  value: number;
  pct: number;
};

type Props = {
  allocationData: AllocationItem[];
  totalAssets: number;
  topHoldings: TopHolding[];
  byCategory: Record<string, number>;
};

function fmtINRShort(n: number) {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(1)} Cr`;
  if (n >= 100_000)    return `₹${(n / 100_000).toFixed(1)} L`;
  return `₹${n.toLocaleString("en-IN")}`;
}

function DonutChart({
  allocationData,
  totalAssets,
  isDark,
}: {
  allocationData: AllocationItem[];
  totalAssets: number;
  isDark: boolean;
}) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const r = 68;
  const strokeWidth = 16;
  const hoveredStrokeWidth = 20;
  const gap = 2.5;
  const total = allocationData.reduce((s, d) => s + d.pct, 0);

  let angle = -90;
  const slices = allocationData.map((seg) => {
    const degrees = total > 0 ? (seg.pct / total) * 360 - gap : 0;
    const startAngle = angle;
    angle += degrees + gap;
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = ((startAngle + degrees) * Math.PI) / 180;
    const x1 = cx + r * Math.cos(startRad);
    const y1 = cy + r * Math.sin(startRad);
    const x2 = cx + r * Math.cos(endRad);
    const y2 = cy + r * Math.sin(endRad);
    const largeArc = degrees > 180 ? 1 : 0;
    return { ...seg, d: `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}` };
  });

  const hovered = hoveredIndex !== null ? slices[hoveredIndex] : null;
  const primaryFill = isDark ? "#ffffff" : "#1d1d1f";
  const mutedFill   = isDark ? "rgba(235,235,245,0.4)" : "#aeaeb2";

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-auto" style={{ overflow: "visible" }}>
      <circle cx={cx} cy={cy} r={r} fill="none"
        stroke={isDark ? "rgba(255,255,255,0.08)" : "#f0f0f5"} strokeWidth={strokeWidth} />
      {slices.map((s, i) =>
        s.pct > 0 ? (
          <path key={i} d={s.d} fill="none" stroke={s.color}
            strokeWidth={hoveredIndex === i ? hoveredStrokeWidth : strokeWidth}
            strokeLinecap="round"
            opacity={hoveredIndex !== null && hoveredIndex !== i ? 0.35 : 1}
            style={{ cursor: "pointer", transition: "opacity 180ms ease, stroke-width 150ms ease" }}
            onMouseEnter={() => setHoveredIndex(i)}
            onMouseLeave={() => setHoveredIndex(null)}
          />
        ) : null
      )}
      {hovered ? (
        <>
          <text x={cx} y={cy - 18} textAnchor="middle" fontSize="10" fontWeight="600"
            fill={hovered.color} letterSpacing="0.06em">{hovered.label.toUpperCase()}</text>
          <text x={cx} y={cy + 2} textAnchor="middle" fontSize="16" fontWeight="700"
            fill={primaryFill}>{hovered.pct}%</text>
          <text x={cx} y={cy + 18} textAnchor="middle" fontSize="11" fontWeight="500"
            fill={mutedFill}>{fmtINRShort(hovered.amount)}</text>
        </>
      ) : (
        <>
          <text x={cx} y={cy - 6} textAnchor="middle" fontSize="15" fontWeight="700"
            fill={primaryFill}>{fmtINRShort(totalAssets)}</text>
          <text x={cx} y={cy + 11} textAnchor="middle" fontSize="9" fontWeight="500"
            fill={mutedFill} letterSpacing="0.07em">TOTAL ASSETS</text>
        </>
      )}
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

function SegmentRow({ label, pct, amount, color }: AllocationItem) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
        <span className="text-[12.5px] font-medium" style={{ color: "var(--text-secondary)" }}>{label}</span>
      </div>
      <p className="text-[12.5px] font-semibold pl-3" style={{ color: "var(--text-primary)" }}>
        {pct}%
        <span className="font-normal ml-1.5" style={{ color: "var(--text-tertiary)" }}>· {fmtINRShort(amount)}</span>
      </p>
    </div>
  );
}

function HoldingRow({ holding, rank }: { holding: TopHolding; rank: number }) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-semibold shrink-0 w-3" style={{ color: "var(--text-tertiary)" }}>
          {rank}
        </span>
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: holding.color }} />
        <span className="text-[12.5px] font-medium truncate" style={{ color: "var(--text-secondary)" }}>
          {holding.name}
        </span>
      </div>
      <p className="text-[12.5px] font-semibold" style={{ color: "var(--text-primary)", paddingLeft: "1.125rem" }}>
        {fmtINRShort(holding.value)}
        <span className="font-normal ml-1.5" style={{ color: "var(--text-tertiary)" }}>
          · {holding.pct.toFixed(1)}%
        </span>
      </p>
    </div>
  );
}

function RebalanceView({
  byCategory,
  totalAssets,
}: {
  byCategory: Record<string, number>;
  totalAssets: number;
}) {
  const { user } = useAuth();
  const [targets, setTargets] = useState<Record<string, number>>({});
  const [editMode, setEditMode] = useState(false);
  const [draft, setDraft] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const fetchTargets = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("allocation_targets")
      .select("category, target_pct")
      .eq("user_id", user.id);
    const map: Record<string, number> = {};
    for (const row of (data ?? []) as { category: string; target_pct: number }[]) {
      map[row.category] = row.target_pct;
    }
    setTargets(map);
    setLoaded(true);
  }, [user]);

  useEffect(() => {
    if (user) fetchTargets();
  }, [user, fetchTargets]);

  async function saveTargets() {
    if (!user) return;
    setSaving(true);
    const rows = Object.entries(draft)
      .filter(([, v]) => v > 0)
      .map(([category, target_pct]) => ({ user_id: user.id, category, target_pct }));
    await supabase.from("allocation_targets").delete().eq("user_id", user.id);
    if (rows.length > 0) await supabase.from("allocation_targets").insert(rows);
    await fetchTargets();
    setSaving(false);
    setEditMode(false);
  }

  const activeCategories = CATEGORIES.filter(
    (cat) => (byCategory[cat] ?? 0) > 0 || (targets[cat] ?? 0) > 0
  );

  const drifts = activeCategories.map((cat) => {
    const actualPct = totalAssets > 0 ? ((byCategory[cat] ?? 0) / totalAssets) * 100 : 0;
    const targetPct = targets[cat] ?? 0;
    return { cat, actualPct, targetPct, drift: actualPct - targetPct };
  });

  const alertCount = drifts.filter((d) => d.targetPct > 0 && Math.abs(d.drift) > 5).length;
  const hasTargets = Object.values(targets).some((v) => v > 0);
  const draftTotal = Object.values(draft).reduce((a, b) => a + (b || 0), 0);

  if (!loaded) {
    return <div className="flex-1 flex items-center justify-center" style={{ color: "var(--text-tertiary)", fontSize: 13 }}>Loading…</div>;
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-y-auto" style={{ gap: 0 }}>
      {/* Sub-header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          {alertCount > 0 && (
            <p style={{ margin: 0, fontSize: 12, color: "#ff9500", fontWeight: 600 }}>
              {alertCount} {alertCount === 1 ? "category" : "categories"} drift &gt;5%
            </p>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {editMode ? (
            <>
              <button
                onClick={() => setEditMode(false)}
                className="text-[12px] font-medium px-2.5 py-1 rounded-[7px]"
                style={{ border: "1px solid var(--separator)", background: "none", color: "var(--text-secondary)", cursor: "pointer", fontFamily: "inherit" }}
              >
                Cancel
              </button>
              <button
                onClick={saveTargets}
                disabled={saving}
                className="text-[12px] font-semibold px-2.5 py-1 rounded-[7px]"
                style={{ border: "none", background: "#007aff", color: "#fff", cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: saving ? 0.6 : 1 }}
              >
                {saving ? "…" : "Save"}
              </button>
            </>
          ) : (
            <button
              onClick={() => { setDraft({ ...targets }); setEditMode(true); }}
              className="text-[12px] font-medium px-2.5 py-1 rounded-[7px]"
              style={{ border: "1px solid var(--separator)", background: "none", color: "var(--text-secondary)", cursor: "pointer", fontFamily: "inherit" }}
            >
              Set Targets
            </button>
          )}
        </div>
      </div>

      {editMode ? (
        <div>
          <p style={{ margin: "0 0 10px", fontSize: 11.5, color: "var(--text-tertiary)" }}>
            Enter target % per category. Total should equal 100%.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {CATEGORIES.map((cat) => (
              <div key={cat} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: CAT_COLORS[cat], flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 12.5, color: "var(--text-primary)" }}>{CAT_LABELS[cat]}</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={draft[cat] ?? 0}
                  onChange={(e) => setDraft((p) => ({ ...p, [cat]: parseFloat(e.target.value) || 0 }))}
                  style={{ width: 60, padding: "5px 7px", borderRadius: 7, border: "1px solid var(--separator)", background: "var(--surface)", color: "var(--text-primary)", fontSize: 12.5, textAlign: "right", fontFamily: "inherit" }}
                />
                <span style={{ fontSize: 12.5, color: "var(--text-tertiary)", width: 12 }}>%</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: draftTotal === 100 ? "#34c759" : "#ff9500" }}>
              Total: {draftTotal.toFixed(0)}%
            </span>
          </div>
        </div>
      ) : !hasTargets ? (
        <div style={{ textAlign: "center", padding: "16px 0" }}>
          <p style={{ margin: "0 0 8px", fontSize: 13.5, color: "var(--text-secondary)" }}>No target allocation set.</p>
          <button
            onClick={() => { setDraft({}); setEditMode(true); }}
            style={{ color: "#007aff", background: "none", border: "none", cursor: "pointer", fontSize: 13.5, fontWeight: 600, fontFamily: "inherit" }}
          >
            Set targets →
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          {drifts.map(({ cat, actualPct, targetPct, drift }) => {
            const hasTarget = targetPct > 0;
            const isDrift = hasTarget && Math.abs(drift) > 5;
            return (
              <div key={cat}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: CAT_COLORS[cat] }} />
                    <span style={{ fontSize: 12.5, color: "var(--text-primary)", fontWeight: 500 }}>{CAT_LABELS[cat]}</span>
                    {isDrift && (
                      <span style={{
                        fontSize: 10.5, fontWeight: 700, padding: "1px 5px", borderRadius: 5,
                        background: drift > 0 ? "rgba(255,149,0,0.12)" : "rgba(255,59,48,0.10)",
                        color: drift > 0 ? "#ff9500" : "#ff3b30",
                      }}>
                        {drift > 0 ? "+" : ""}{drift.toFixed(1)}%
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {hasTarget && (
                      <span style={{ fontSize: 11.5, color: "var(--text-tertiary)" }}>target {targetPct}%</span>
                    )}
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: isDrift ? (drift > 0 ? "#ff9500" : "#ff3b30") : "var(--text-primary)" }}>
                      {actualPct.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div style={{ position: "relative", height: 5, borderRadius: 3, background: "var(--surface-secondary, rgba(120,120,128,0.12))", overflow: "visible" }}>
                  <div style={{
                    position: "absolute", left: 0, top: 0, height: "100%",
                    width: `${Math.min(actualPct, 100)}%`, borderRadius: 3,
                    background: CAT_COLORS[cat],
                    transition: "width 600ms cubic-bezier(0.34,1.15,0.64,1)",
                  }} />
                  {hasTarget && (
                    <div style={{
                      position: "absolute", top: -4, width: 2, height: 13,
                      background: isDrift ? "#ff9500" : "var(--text-tertiary)",
                      borderRadius: 1, left: `${Math.min(targetPct, 100)}%`,
                      transform: "translateX(-50%)",
                    }} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

type View = "allocation" | "holdings" | "rebalance";

export default function AllocationCard({ allocationData, totalAssets, topHoldings, byCategory }: Props) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [view, setView] = useState<View>("allocation");

  const firstColumn = allocationData.slice(0, 3);
  const secondColumn = allocationData.slice(3, 6);

  const pillBg = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)";
  const activePillBg = isDark ? "rgba(255,255,255,0.16)" : "#ffffff";
  const activePillShadow = isDark
    ? "0 1px 4px rgba(0,0,0,0.4)"
    : "0 1px 3px rgba(0,0,0,0.12)";

  const TAB_LABELS: Record<View, string> = {
    allocation: "Allocation",
    holdings: "Holdings",
    rebalance: "Rebalance",
  };

  return (
    <div
      className="card-lift flex flex-col h-full rounded-[20px] p-5"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--separator)",
        boxShadow: isDark
          ? "0 0 0 1px rgba(255,255,255,0.06), 0 4px 20px rgba(255,255,255,0.03)"
          : "0 1px 3px rgba(0,0,0,0.04), 0 1px 8px rgba(0,0,0,0.03)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4 sm:mb-5">
        <p className="text-[15px] font-semibold" style={{ color: "var(--text-primary)" }}>
          {TAB_LABELS[view]}
        </p>

        <div className="flex items-center gap-2">
          <div
            className="flex items-center p-[3px] rounded-[10px]"
            style={{ background: pillBg }}
          >
            {(["allocation", "holdings", "rebalance"] as View[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className="px-2.5 py-1 rounded-[8px] text-[11.5px] font-semibold transition-all"
                style={{
                  background: view === v ? activePillBg : "transparent",
                  boxShadow: view === v ? activePillShadow : "none",
                  color: view === v ? "var(--text-primary)" : "var(--text-tertiary)",
                  transition: "background 180ms ease, color 180ms ease, box-shadow 180ms ease",
                }}
              >
                {TAB_LABELS[v]}
              </button>
            ))}
          </div>

          <button className="icon-btn" style={{ color: "var(--text-tertiary)" }}>
            <InfoIcon />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="relative flex-1">

        {/* Allocation */}
        <div
          className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 h-full"
          style={{
            opacity: view === "allocation" ? 1 : 0,
            pointerEvents: view === "allocation" ? "auto" : "none",
            transition: "opacity 220ms ease",
          }}
        >
          <div className="w-[200px] sm:w-[180px] shrink-0">
            <DonutChart allocationData={allocationData} totalAssets={totalAssets} isDark={isDark} />
          </div>
          <div className="w-full sm:flex-1 flex gap-3 sm:gap-5 min-w-0">
            <div className="flex flex-col gap-2.5 sm:gap-3.5 flex-1 min-w-0">
              {firstColumn.map((seg) => <SegmentRow key={seg.label} {...seg} />)}
            </div>
            {secondColumn.length > 0 && (
              <div className="flex flex-col gap-2.5 sm:gap-3.5 flex-1 min-w-0">
                {secondColumn.map((seg) => <SegmentRow key={`r-${seg.label}`} {...seg} />)}
              </div>
            )}
          </div>
        </div>

        {/* Holdings */}
        <div
          className="absolute inset-0 flex items-center gap-6"
          style={{
            opacity: view === "holdings" ? 1 : 0,
            pointerEvents: view === "holdings" ? "auto" : "none",
            transition: "opacity 220ms ease",
          }}
        >
          <div className="flex flex-col gap-2.5 sm:gap-3.5 flex-1 min-w-0">
            {topHoldings.slice(0, 3).map((h, i) => (
              <HoldingRow key={h.name} holding={h} rank={i + 1} />
            ))}
          </div>
          {topHoldings.length > 3 && (
            <div className="flex flex-col gap-2.5 sm:gap-3.5 flex-1 min-w-0">
              {topHoldings.slice(3).map((h, i) => (
                <HoldingRow key={h.name} holding={h} rank={i + 4} />
              ))}
            </div>
          )}
        </div>

        {/* Rebalance */}
        <div
          className="absolute inset-0 flex flex-col"
          style={{
            opacity: view === "rebalance" ? 1 : 0,
            pointerEvents: view === "rebalance" ? "auto" : "none",
            transition: "opacity 220ms ease",
          }}
        >
          <RebalanceView byCategory={byCategory} totalAssets={totalAssets} />
        </div>

      </div>
    </div>
  );
}
