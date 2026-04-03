"use client";

import { useState, useMemo } from "react";

type SortKey = "symbol" | "quantity" | "avgPrice" | "ltp" | "pnl" | "dayChange";
type SortDir = "asc" | "desc";

export interface HoldingData {
  tradingsymbol: string;
  exchange: string;
  quantity: number;
  averagePrice: number;
  lastPrice: number;
  currentValue: number;
  pnl: number;
  pnlPct: number;
  dayChangePct: number;
  accountLabel?: string;
}

// Colors assigned per unique account label (stable order)
const ACCOUNT_BADGE_COLORS = [
  { bg: "rgba(174,221,0,0.12)", color: "#5a7a00" },
  { bg: "rgba(0,122,255,0.10)", color: "#007aff" },
  { bg: "rgba(175,82,222,0.10)", color: "#af52de" },
  { bg: "rgba(255,149,0,0.10)", color: "#ff9500" },
];

function inr(n: number) {
  return Math.abs(n).toLocaleString("en-IN", { maximumFractionDigits: 0 });
}
function inrDec(n: number, digits = 2) {
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

interface Column {
  key: SortKey;
  label: string;
  align: "left" | "right";
}

const COLUMNS: Column[] = [
  { key: "symbol",    label: "Stock",     align: "left"  },
  { key: "quantity",  label: "Qty",       align: "right" },
  { key: "avgPrice",  label: "Avg Price", align: "right" },
  { key: "ltp",       label: "LTP",       align: "right" },
  { key: "dayChange", label: "Day",       align: "right" },
  { key: "pnl",       label: "P&L",       align: "right" },
];

const SORT_DEFAULTS: Record<SortKey, SortDir> = {
  symbol:    "asc",
  quantity:  "desc",
  avgPrice:  "desc",
  ltp:       "desc",
  dayChange: "desc",
  pnl:       "desc",
};

function ChevronIcon({ up }: { up: boolean }) {
  return (
    <svg
      width="9"
      height="9"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        display: "inline-block",
        transform: up ? "rotate(180deg)" : "none",
        transition: "transform 180ms ease",
      }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

export default function HoldingsTable({ holdings }: { holdings: HoldingData[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("pnl");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Build a stable color map for each unique account label
  const accountColorMap = useMemo(() => {
    const labels = [...new Set(holdings.map((h) => h.accountLabel).filter(Boolean))] as string[];
    const map: Record<string, { bg: string; color: string }> = {};
    labels.forEach((label, i) => { map[label] = ACCOUNT_BADGE_COLORS[i % ACCOUNT_BADGE_COLORS.length]; });
    return map;
  }, [holdings]);

  const multiAccount = Object.keys(accountColorMap).length > 1;

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(SORT_DEFAULTS[key]);
    }
  }

  const sorted = useMemo(() => {
    return [...holdings].sort((a, b) => {
      let av: number | string;
      let bv: number | string;
      switch (sortKey) {
        case "symbol":    av = a.tradingsymbol; bv = b.tradingsymbol; break;
        case "quantity":  av = a.quantity;      bv = b.quantity;      break;
        case "avgPrice":  av = a.averagePrice;  bv = b.averagePrice;  break;
        case "ltp":       av = a.lastPrice;     bv = b.lastPrice;     break;
        case "dayChange": av = a.dayChangePct;  bv = b.dayChangePct;  break;
        case "pnl":       av = a.pnl;           bv = b.pnl;           break;
        default:          av = 0;               bv = 0;
      }
      if (typeof av === "string") {
        return sortDir === "asc"
          ? av.localeCompare(bv as string)
          : (bv as string).localeCompare(av);
      }
      return sortDir === "asc" ? av - (bv as number) : (bv as number) - av;
    });
  }, [holdings, sortKey, sortDir]);

  // ── Empty state ───────────────────────────────────────────────────────────────
  if (holdings.length === 0) {
    return (
      <div
        className="rounded-[28px] px-6 py-14 text-center"
        style={{
          backgroundColor: "var(--surface)",
          border: "1px solid var(--separator)",
          boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
        }}
      >
        <div
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-[18px]"
          style={{ backgroundColor: "var(--surface-secondary)" }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--text-tertiary)"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <rect x="2" y="7" width="20" height="14" rx="3" />
            <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
          </svg>
        </div>
        <h3
          className="mt-5 text-[22px] font-semibold tracking-[-0.03em]"
          style={{ color: "var(--text-primary)" }}
        >
          No holdings yet
        </h3>
        <p
          className="mx-auto mt-2 max-w-sm text-[14px] leading-relaxed"
          style={{ color: "var(--text-secondary)" }}
        >
          Your synced portfolio is empty right now. Use the Sync control above
          to refresh your Kite positions.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* ── Sort chips — mobile only ─────────────────────────────────── */}
      <div className="mb-3 flex items-center gap-2 overflow-x-auto pb-1 md:hidden">
        {COLUMNS.map((col) => {
          const active = sortKey === col.key;
          return (
            <button
              key={col.key}
              onClick={() => handleSort(col.key)}
              className="flex flex-shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-all duration-150"
              style={{
                backgroundColor: active
                  ? "rgba(174,221,0,0.13)"
                  : "var(--surface-secondary)",
                color: active ? "#5a7a00" : "var(--text-secondary)",
                border: active
                  ? "1px solid rgba(174,221,0,0.26)"
                  : "1px solid transparent",
              }}
            >
              {col.label}
              {active && (
                <span style={{ opacity: 0.8 }}>
                  <ChevronIcon up={sortDir === "asc"} />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Desktop table ────────────────────────────────────────────── */}
      <div
        className="hidden overflow-hidden rounded-[28px] md:block"
        style={{
          border: "1px solid var(--separator)",
          boxShadow: "0 4px 24px rgba(0,0,0,0.10)",
        }}
      >
        {/* Column header */}
        <div
          className="grid gap-x-4 px-6 py-3.5"
          style={{
            gridTemplateColumns: "1fr 52px 96px 96px 80px 128px",
            backgroundColor: "var(--surface-secondary)",
            borderBottom: "1px solid var(--separator-subtle)",
          }}
        >
          {COLUMNS.map((col) => {
            const active = sortKey === col.key;
            return (
              <button
                key={col.key}
                onClick={() => handleSort(col.key)}
                className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] transition-colors duration-150"
                style={{
                  color: active ? "#5a7a00" : "var(--text-tertiary)",
                  justifyContent: col.align === "right" ? "flex-end" : "flex-start",
                }}
              >
                {col.label}
                <span style={{ opacity: active ? 1 : 0.22 }}>
                  <ChevronIcon up={active && sortDir === "asc"} />
                </span>
              </button>
            );
          })}
        </div>

        {/* Rows */}
        {sorted.map((h, i) => {
          const positive = h.pnl >= 0;
          const dayPositive = h.dayChangePct >= 0;
          const tone = positive ? "#1f9d55" : "#d9473f";
          const dayTone = dayPositive ? "#1f9d55" : "#d9473f";
          const isLast = i === sorted.length - 1;
          const acctColor = h.accountLabel ? accountColorMap[h.accountLabel] : null;

          return (
            <div
              key={`${h.accountLabel ?? ""}_${h.tradingsymbol}`}
              className="grid gap-x-4 px-6 py-[14px] transition-colors duration-150"
              style={{
                gridTemplateColumns: "1fr 52px 96px 96px 80px 128px",
                backgroundColor: "var(--surface)",
                borderBottom: isLast ? "none" : "1px solid var(--separator-subtle)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.backgroundColor =
                  "var(--surface-secondary)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.backgroundColor =
                  "var(--surface)";
              }}
            >
              {/* Stock */}
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-[11px] text-[11px] font-bold"
                  style={{
                    backgroundColor: acctColor ? acctColor.bg : "var(--surface-secondary)",
                    color: acctColor ? acctColor.color : "var(--text-secondary)",
                    letterSpacing: "-0.01em",
                  }}
                >
                  {h.tradingsymbol.slice(0, 2)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <p
                      className="truncate text-[14px] font-semibold tracking-[-0.02em]"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {h.tradingsymbol}
                    </p>
                    {multiAccount && acctColor && h.accountLabel && (
                      <span
                        className="flex-shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                        style={{ background: acctColor.bg, color: acctColor.color }}
                      >
                        {h.accountLabel}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                    {h.exchange}
                  </p>
                </div>
              </div>

              {/* Qty */}
              <p
                className="self-center text-right text-[14px] font-medium"
                style={{ color: "var(--text-primary)" }}
              >
                {h.quantity}
              </p>

              {/* Avg Price */}
              <p
                className="self-center text-right text-[13px] font-medium"
                style={{ color: "var(--text-secondary)" }}
              >
                ₹{inrDec(h.averagePrice)}
              </p>

              {/* LTP */}
              <p
                className="self-center text-right text-[14px] font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                ₹{inrDec(h.lastPrice)}
              </p>

              {/* Day Change */}
              <div className="self-center flex justify-end">
                <span
                  className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                  style={{
                    background: dayPositive
                      ? "rgba(31,157,85,0.12)"
                      : "rgba(217,71,63,0.10)",
                    color: dayTone,
                  }}
                >
                  {dayPositive ? "+" : "−"}
                  {Math.abs(h.dayChangePct).toFixed(2)}%
                </span>
              </div>

              {/* P&L */}
              <div className="self-center flex flex-col items-end">
                <span
                  className="text-[14px] font-semibold"
                  style={{ color: tone }}
                >
                  {positive ? "+" : "−"}₹{inr(h.pnl)}
                </span>
                <span
                  className="mt-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                  style={{
                    background: positive
                      ? "rgba(31,157,85,0.12)"
                      : "rgba(217,71,63,0.10)",
                    color: tone,
                  }}
                >
                  {positive ? "+" : "−"}
                  {Math.abs(h.pnlPct).toFixed(1)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Mobile cards ─────────────────────────────────────────────── */}
      <div className="space-y-2.5 md:hidden">
        {sorted.map((h) => {
          const positive = h.pnl >= 0;
          const dayPositive = h.dayChangePct >= 0;
          const tone = positive ? "#1f9d55" : "#d9473f";
          const dayTone = dayPositive ? "#1f9d55" : "#d9473f";
          const acctColor = h.accountLabel ? accountColorMap[h.accountLabel] : null;

          return (
            <div
              key={`${h.accountLabel ?? ""}_${h.tradingsymbol}`}
              className="rounded-[22px] p-4 transition-all duration-200 active:scale-[0.99]"
              style={{
                backgroundColor: "var(--surface)",
                border: "1px solid var(--separator)",
                boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
              }}
            >
              {/* Top row */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[11px] text-[11px] font-bold"
                    style={{
                      backgroundColor: "var(--surface-secondary)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {h.tradingsymbol.slice(0, 2)}
                  </div>
                  <div>
                    <p
                      className="text-[16px] font-semibold tracking-[-0.03em]"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {h.tradingsymbol}
                    </p>
                    <div className="mt-0.5 flex items-center gap-1.5 flex-wrap">
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em]"
                        style={{
                          backgroundColor: "var(--surface-secondary)",
                          color: "var(--text-tertiary)",
                        }}
                      >
                        {h.exchange}
                      </span>
                      {multiAccount && acctColor && h.accountLabel && (
                        <span
                          className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                          style={{ background: acctColor.bg, color: acctColor.color }}
                        >
                          {h.accountLabel}
                        </span>
                      )}
                      <span
                        className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                        style={{
                          background: dayPositive
                            ? "rgba(31,157,85,0.12)"
                            : "rgba(217,71,63,0.10)",
                          color: dayTone,
                        }}
                      >
                        {dayPositive ? "+" : "−"}
                        {Math.abs(h.dayChangePct).toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end text-right">
                  <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                    Current Value
                  </p>
                  <p
                    className="mt-0.5 text-[18px] font-semibold tracking-[-0.03em]"
                    style={{ color: "var(--text-primary)" }}
                  >
                    ₹{inr(h.currentValue)}
                  </p>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span
                      className="text-[13px] font-semibold"
                      style={{ color: tone }}
                    >
                      {positive ? "+" : "−"}₹{inr(h.pnl)}
                    </span>
                    <span
                      className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                      style={{
                        background: positive
                          ? "rgba(31,157,85,0.12)"
                          : "rgba(217,71,63,0.10)",
                        color: tone,
                      }}
                    >
                      {positive ? "+" : "−"}
                      {Math.abs(h.pnlPct).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Stats row */}
              <div
                className="mt-3.5 grid grid-cols-3 gap-3 border-t pt-3.5"
                style={{ borderColor: "var(--separator-subtle)" }}
              >
                <div>
                  <p
                    className="text-[10px] font-medium"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    Qty
                  </p>
                  <p
                    className="mt-0.5 text-[13px] font-semibold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {h.quantity}
                  </p>
                </div>
                <div>
                  <p
                    className="text-[10px] font-medium"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    Avg Price
                  </p>
                  <p
                    className="mt-0.5 text-[13px] font-semibold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    ₹{inrDec(h.averagePrice)}
                  </p>
                </div>
                <div>
                  <p
                    className="text-[10px] font-medium"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    LTP
                  </p>
                  <p
                    className="mt-0.5 text-[13px] font-semibold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    ₹{inrDec(h.lastPrice)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
