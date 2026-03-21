import { summaryData } from "../data/assets";

function fmtINR(n: number) {
  return `₹\u202f${n.toLocaleString("en-IN")}`;
}

export default function NetWorthCard() {
  const d = summaryData;
  const up = d.netWorthChange >= 0;

  return (
    <div
      className="card-lift card-shadow-dark flex flex-col justify-between h-full rounded-[20px] p-6 relative overflow-hidden"
      style={{ background: "#111113" }}
    >
      {/* subtle inner highlight */}
      <div
        className="absolute inset-0 rounded-[20px] pointer-events-none"
        style={{
          background: "linear-gradient(135deg, rgba(255,255,255,0.055) 0%, transparent 55%)",
        }}
      />

      {/* Content */}
      <div>
        <p
          className="text-[10.5px] font-semibold uppercase mb-2"
          style={{ color: "rgba(255,255,255,0.38)", letterSpacing: "0.13em" }}
        >
          Net Worth
        </p>

        <p
          className="text-[30px] font-bold leading-none text-white"
          style={{ letterSpacing: "-0.025em" }}
        >
          {fmtINR(d.netWorth)}
          <span
            className="text-[18px] font-normal"
            style={{ color: "rgba(255,255,255,0.3)" }}
          >
            .00
          </span>
        </p>

        <div className="flex items-center gap-2 mt-3">
          <span
            className="inline-flex items-center gap-1 text-[11.5px] font-semibold px-2 py-0.5 rounded-full"
            style={{
              color:      up ? "#34c759" : "#ff3b30",
              background: up ? "rgba(52,199,89,0.14)" : "rgba(255,59,48,0.14)",
            }}
          >
            {up ? "▲" : "▼"} {Math.abs(d.netWorthChange)}%
          </span>
          <span className="text-[11.5px]" style={{ color: "rgba(255,255,255,0.28)" }}>
            from last quarter
          </span>
        </div>
      </div>

      {/* Footer row */}
      <div
        className="mt-4 pt-3"
        style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p
              className="text-[10px] font-medium uppercase mb-1"
              style={{ color: "rgba(255,255,255,0.28)", letterSpacing: "0.1em" }}
            >
              Total Assets
            </p>
            <p
              className="text-[16px] font-semibold text-white"
              style={{ letterSpacing: "-0.015em" }}
            >
              {fmtINR(d.netWorth + d.liabilities)}
            </p>
          </div>
          <div className="text-right">
            <p
              className="text-[10px] font-medium uppercase mb-1"
              style={{ color: "rgba(255,255,255,0.28)", letterSpacing: "0.1em" }}
            >
              Liabilities
            </p>
            <p
              className="text-[18px] font-semibold"
              style={{ color: "#ff6b6b", letterSpacing: "-0.015em" }}
            >
              {fmtINR(d.liabilities)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
