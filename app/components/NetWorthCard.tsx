"use client";

import { useTheme } from "@/lib/ThemeContext";

type Props = {
  netWorth: number;
  invested: number;
  investedPctOfNetWorth: number;
  totalPnl: number;
  totalPnlPct: number;
  netWorthChange?: number;
};

function fmtINR(n: number) {
  return `₹\u202f${n.toLocaleString("en-IN")}`;
}

export default function NetWorthCard({
  netWorth,
  invested,
  investedPctOfNetWorth,
  totalPnl,
  totalPnlPct,
  netWorthChange = 0,
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
      className="card-lift flex flex-col justify-between h-full rounded-[20px] p-6 relative overflow-hidden"
      style={{ background: bg, border, boxShadow: shadow }}
    >
      <div>
        <p
          className="text-[10.5px] font-semibold uppercase mb-2"
          style={{ color: "rgba(255,255,255,0.45)", letterSpacing: "0.13em" }}
        >
          Net Worth
        </p>

        <p
          className="text-[30px] font-bold leading-none text-white"
          style={{ letterSpacing: "-0.025em" }}
        >
          {fmtINR(netWorth)}
          <span
            className="text-[18px] font-normal"
            style={{ color: "rgba(255,255,255,0.35)" }}
          >
            .00
          </span>
        </p>

        <div className="flex items-center gap-2 mt-3">
          <span
            className="inline-flex items-center gap-1 text-[12px] font-bold px-2.5 py-1 rounded-full"
            style={{
              color: up ? "#34c759" : "#ff3b30",
              background: up ? "rgba(52,199,89,0.15)" : "rgba(255,59,48,0.15)",
            }}
          >
            {up ? "▲" : "▼"} {Math.abs(netWorthChange)}%
          </span>
          <span
            className="text-[11.5px]"
            style={{ color: "rgba(255,255,255,0.35)" }}
          >
            from last snapshot
          </span>
        </div>
      </div>

      <div
        className="mt-4 pt-3"
        style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p
              className="text-[10px] font-medium uppercase mb-1"
              style={{ color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em" }}
            >
              Invested
            </p>
            <p
              className="text-[16px] font-bold text-white"
              style={{ letterSpacing: "-0.015em" }}
            >
              {fmtINR(invested)}
            </p>
            <p className="text-[11px] font-medium" style={{ color: "rgba(255,255,255,0.35)" }}>
              {investedPctOfNetWorth}% of Net Worth
            </p>
          </div>

          <div className="text-right">
            <p
              className="text-[10px] font-medium uppercase mb-1"
              style={{ color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em" }}
            >
              Total P&L
            </p>
            <p
              className="text-[18px] font-bold"
              style={{ letterSpacing: "-0.015em", color: totalPnl >= 0 ? "#34c759" : "#ff3b30" }}
            >
              {totalPnl >= 0 ? "+" : ""}{fmtINR(totalPnl)}
            </p>
            <p className="text-[11px] font-medium" style={{ color: "rgba(255,255,255,0.35)" }}>
              {totalPnl >= 0 ? "+" : ""}{totalPnlPct}% ROI
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
