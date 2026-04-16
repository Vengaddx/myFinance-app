"use client";

import { useTheme } from "@/lib/ThemeContext";

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
};

function fmtINR(n: number) {
  return `₹\u202f${n.toLocaleString("en-IN")}`;
}

function fmtShort(n: number) {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(2)} Cr`;
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(1)} L`;
  return `₹${n.toLocaleString("en-IN")}`;
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
        className="text-[10px] font-semibold uppercase mb-1"
        style={{ color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em" }}
      >
        {label}
      </p>
      <p
        className="text-[15px] font-bold leading-none mb-0.5"
        style={{ color: valueColor ?? "#ffffff", letterSpacing: "-0.02em" }}
      >
        {value}
      </p>
      <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.28)" }}>
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
}: Props) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const up = netWorthChange >= 0;

  const bg = isDark ? "rgba(255,255,255,0.04)" : "#1c1c1e";
  const border = isDark ? "1px solid rgba(255,255,255,0.1)" : "none";
  const shadow = isDark
    ? "0 0 0 1px rgba(255,255,255,0.07), 0 8px 40px rgba(255,255,255,0.04)"
    : "0 8px 40px rgba(0,0,0,0.20), 0 1px 3px rgba(0,0,0,0.14)";

  return (
    <div
      className="card-lift flex flex-col h-full rounded-[20px] p-5 gap-4 relative overflow-hidden"
      style={{
        background: bg,
        border,
        boxShadow: shadow,
        cursor: onClick ? "pointer" : undefined,
        transition: "opacity 0.15s",
      }}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <p
          className="text-[11px] font-semibold uppercase"
          style={{ color: "rgba(255,255,255,0.4)", letterSpacing: "0.13em" }}
        >
          Net Worth
        </p>
        {onClick && (
          <span className="text-[11px] font-medium" style={{ color: "rgba(255,255,255,0.28)" }}>
            Timeline ›
          </span>
        )}
      </div>

      {/* Main number + change */}
      <div>
        <p
          className="text-[38px] font-bold leading-none text-white"
          style={{ letterSpacing: "-0.03em" }}
        >
          {fmtINR(netWorth)}
          <span className="text-[20px] font-normal" style={{ color: "rgba(255,255,255,0.25)" }}>
            .00
          </span>
        </p>
        <div className="flex items-center gap-2 mt-2">
          <span
            className="inline-flex items-center gap-1 text-[12px] font-bold px-2.5 py-0.5 rounded-full"
            style={{
              color: up ? "#34c759" : "#ff3b30",
              background: up ? "rgba(52,199,89,0.15)" : "rgba(255,59,48,0.15)",
            }}
          >
            {up ? "▲" : "▼"} {Math.abs(netWorthChange)}%
          </span>
          <span className="text-[12px]" style={{ color: "rgba(255,255,255,0.28)" }}>
            from last snapshot
          </span>
        </div>
      </div>

      <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }} />

      {/* Invested / P&L */}
      <div className="grid grid-cols-2">
        <MetricBlock
          label="Invested"
          value={fmtINR(invested)}
          sub={`${investedPctOfNetWorth}% of Net Worth`}
        />
        <MetricBlock
          label="Total P&L"
          value={`${totalPnl >= 0 ? "+" : ""}${fmtINR(totalPnl)}`}
          sub={`${totalPnl >= 0 ? "+" : ""}${totalPnlPct}% ROI`}
          valueColor={totalPnl >= 0 ? "#34c759" : "#ff3b30"}
          align="right"
        />
      </div>

      <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }} />

      {/* Total Assets / Liabilities */}
      <div className="grid grid-cols-2">
        <MetricBlock
          label="Total Assets"
          value={fmtShort(totalAssets)}
          sub="Gross portfolio value"
        />
        <MetricBlock
          label="Liabilities"
          value={fmtShort(liabilities)}
          sub="Total owed"
          valueColor="#ff3b30"
          align="right"
        />
      </div>
    </div>
  );
}
