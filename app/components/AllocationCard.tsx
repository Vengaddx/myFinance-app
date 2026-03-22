"use client";

import { useState } from "react";
import { useTheme } from "@/lib/ThemeContext";

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
  pct: number; // % of total assets
};

type Props = {
  allocationData: AllocationItem[];
  totalAssets: number;
  topHoldings: TopHolding[];
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
        <span
          className="text-[10px] font-semibold shrink-0 w-3"
          style={{ color: "var(--text-tertiary)" }}
        >
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

type View = "allocation" | "holdings";

export default function AllocationCard({ allocationData, totalAssets, topHoldings }: Props) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [view, setView] = useState<View>("allocation");

  const firstColumn = allocationData.slice(0, 3);
  const secondColumn = allocationData.slice(3);

  const pillBg = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)";
  const activePillBg = isDark ? "rgba(255,255,255,0.16)" : "#ffffff";
  const activePillShadow = isDark
    ? "0 1px 4px rgba(0,0,0,0.4)"
    : "0 1px 3px rgba(0,0,0,0.12)";

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
          {view === "allocation" ? "Asset Allocation" : "Top Holdings"}
        </p>

        <div className="flex items-center gap-2">
          {/* Toggle pill */}
          <div
            className="flex items-center p-[3px] rounded-[10px]"
            style={{ background: pillBg }}
          >
            {(["allocation", "holdings"] as View[]).map((v) => (
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
                {v === "allocation" ? "Allocation" : "Holdings"}
              </button>
            ))}
          </div>

          <button className="icon-btn" style={{ color: "var(--text-tertiary)" }}>
            <InfoIcon />
          </button>
        </div>
      </div>

      {/* Body — both views always rendered; allocation stays in flow to lock the height,
           holdings fades in as an absolute overlay so the card never resizes */}
      <div className="relative flex-1">

        {/* Allocation — in normal flow, defines card height */}
        <div
          className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 h-full"
          style={{
            opacity: view === "allocation" ? 1 : 0,
            pointerEvents: view === "allocation" ? "auto" : "none",
            transition: "opacity 220ms ease",
          }}
        >
          {/* Chart: larger on mobile (full-width row), fixed on desktop */}
          <div className="w-[200px] sm:w-[180px] shrink-0">
            <DonutChart allocationData={allocationData} totalAssets={totalAssets} isDark={isDark} />
          </div>
          {/* Legend: two-column below chart on mobile, beside chart on desktop */}
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

        {/* Holdings — absolute overlay, fades in without affecting layout */}
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

      </div>
    </div>
  );
}
