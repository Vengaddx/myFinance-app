"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/lib/ThemeContext";

export type AssetBreakdownItem = { label: string; amount: number; color: string };

type Props = {
  netWorth: number;
  invested: number;
  investedPctOfNetWorth: number;
  totalPnl: number;
  totalPnlPct: number;
  totalAssets: number;
  liabilities: number;
  netWorthChange?: number;
  onClick?: () => void;
  assetBreakdown?: AssetBreakdownItem[];
};

function fmtINR(n: number) {
  return `₹ ${n.toLocaleString("en-IN")}`;
}

function fmtShort(n: number) {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(2)} Cr`;
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(1)} L`;
  return `₹${n.toLocaleString("en-IN")}`;
}

function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(0);
  const prevRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = prevRef.current;
    prevRef.current = target;
    if (from === target) { setValue(target); return; }

    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (t < 1) { rafRef.current = requestAnimationFrame(step); }
    };
    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); };
  }, [target, duration]);

  return value;
}

function MetricBlock({
  label,
  value,
  sub,
  valueColor,
  align = "left",
}: {
  label: string;
  value: string;
  sub: string;
  valueColor?: string;
  align?: "left" | "right";
}) {
  return (
    <div className={align === "right" ? "text-right" : ""}>
      <p
        className="text-[10px] font-semibold uppercase mb-1.5"
        style={{ color: "rgba(255,255,255,0.32)", letterSpacing: "0.1em" }}
      >
        {label}
      </p>
      <p
        className="text-[14px] font-semibold leading-none mb-1"
        style={{ color: valueColor ?? "#ffffff", letterSpacing: "-0.015em" }}
      >
        {value}
      </p>
      <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.24)" }}>
        {sub}
      </p>
    </div>
  );
}

export default function NetWorthCard({
  netWorth,
  invested,
  investedPctOfNetWorth,
  totalPnl,
  totalPnlPct,
  totalAssets,
  liabilities,
  netWorthChange = 0,
  onClick,
  assetBreakdown = [],
}: Props) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const displayNetWorth = useCountUp(netWorth);
  const up = netWorthChange >= 0;
  const [showInfo, setShowInfo] = useState(false);
  const infoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showInfo) return;
    const handler = (e: MouseEvent) => {
      if (infoRef.current && !infoRef.current.contains(e.target as Node)) setShowInfo(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showInfo]);

  const bg = isDark ? "#18181B" : "#0F172A";

  return (
    <div
      className="card-lift flex flex-col h-full rounded-lg p-5 sm:p-6 gap-5 relative overflow-hidden"
      style={{
        background: bg,
        border: isDark ? "1px solid #27272A" : "none",
        boxShadow: isDark
          ? "none"
          : "0 4px 24px rgba(0,0,0,0.22), 0 1px 4px rgba(0,0,0,0.14)",
        cursor: onClick ? "pointer" : undefined,
      }}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div ref={infoRef} className="flex items-center gap-1.5 relative">
          <p
            className="text-[10px] font-semibold uppercase"
            style={{ color: "rgba(255,255,255,0.32)", letterSpacing: "0.12em" }}
          >
            Net Worth
          </p>
          <button
            onClick={(e) => { e.stopPropagation(); setShowInfo((v) => !v); }}
            className="w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0"
            style={{ color: "rgba(255,255,255,0.34)" }}
            aria-label="How net worth is calculated"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="11" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          </button>

          {showInfo && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute top-full left-0 mt-2 z-30 w-[250px] rounded-md p-3.5"
              style={{
                background: isDark ? "#27272A" : "#1E293B",
                border: "1px solid rgba(255,255,255,0.10)",
                boxShadow: "0 12px 32px rgba(0,0,0,0.4)",
              }}
            >
              <p className="text-[11px] font-semibold text-white mb-2.5">Net Worth = Assets − Liabilities</p>
              {assetBreakdown.length > 0 && (
                <div className="flex flex-col gap-1 mb-2.5">
                  {assetBreakdown.map((b) => (
                    <div key={b.label} className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-1.5 text-[11px]" style={{ color: "rgba(255,255,255,0.6)" }}>
                        <span className="w-[6px] h-[6px] rounded-full shrink-0" style={{ background: b.color }} />
                        {b.label}
                      </span>
                      <span className="text-[11px] font-medium text-white whitespace-nowrap">{fmtShort(b.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.10)" }} className="pt-2 flex flex-col gap-1">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] font-medium" style={{ color: "rgba(255,255,255,0.7)" }}>Total Assets</span>
                  <span className="text-[11px] font-semibold text-white">{fmtShort(totalAssets)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] font-medium" style={{ color: "rgba(255,255,255,0.7)" }}>Liabilities</span>
                  <span className="text-[11px] font-semibold" style={{ color: "#EF4444" }}>−{fmtShort(liabilities)}</span>
                </div>
              </div>
              <p className="text-[10.5px] mt-2.5 leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }}>
                Assets include equities &amp; Kite holdings, gold, FDs, real estate, bank &amp; cash, crypto, and money lent to others. Liabilities are the outstanding balance on your active loans.
              </p>
            </div>
          )}
        </div>
        {onClick && (
          <span className="text-[11px] font-medium" style={{ color: "rgba(255,255,255,0.24)", letterSpacing: "0.01em" }}>
            Timeline &rsaquo;
          </span>
        )}
      </div>

      {/* Main number */}
      <div>
        <p
          className="text-[36px] sm:text-[40px] font-bold leading-none text-white"
          style={{ letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums" }}
        >
          {fmtINR(displayNetWorth)}
        </p>
        {netWorthChange !== 0 && (
          <div className="flex items-center gap-2 mt-2.5">
            <span
              className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded"
              style={{
                color: up ? "#22C55E" : "#EF4444",
                background: up ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
              }}
            >
              {up ? "+" : ""}{netWorthChange}%
            </span>
            <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.24)" }}>
              vs last snapshot
            </span>
          </div>
        )}
      </div>

      <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }} />

      {/* Invested / P&L */}
      <div className="grid grid-cols-2">
        <MetricBlock
          label="Invested"
          value={fmtINR(invested)}
          sub={`${investedPctOfNetWorth}% of net worth`}
        />
        <MetricBlock
          label="Total P&L"
          value={`${totalPnl >= 0 ? "+" : ""}${fmtINR(totalPnl)}`}
          sub={`${totalPnl >= 0 ? "+" : ""}${totalPnlPct}% return`}
          valueColor={totalPnl >= 0 ? "#22C55E" : "#EF4444"}
          align="right"
        />
      </div>

      <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }} />

      {/* Total Assets / Liabilities */}
      <div className="grid grid-cols-2">
        <MetricBlock
          label="Total Assets"
          value={fmtShort(totalAssets)}
          sub="Gross value"
        />
        <MetricBlock
          label="Liabilities"
          value={fmtShort(liabilities)}
          sub="Total owed"
          valueColor="#EF4444"
          align="right"
        />
      </div>
    </div>
  );
}
