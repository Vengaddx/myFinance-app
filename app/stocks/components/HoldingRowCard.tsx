type HoldingRowCardProps = {
  tradingsymbol: string;
  exchange: string;
  quantity: number;
  averagePrice: number;
  lastPrice: number;
  currentValue: number;
  pnl: number;
  pnlPct: number;
};

function inr(n: number) {
  return Math.abs(n).toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

function inrDec(n: number, digits = 2) {
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export default function HoldingRowCard({
  tradingsymbol,
  exchange,
  quantity,
  averagePrice,
  lastPrice,
  currentValue,
  pnl,
  pnlPct,
}: HoldingRowCardProps) {
  const positive = pnl >= 0;
  const tone = positive ? "#1f9d55" : "#d9473f";

  return (
    <div
      className="group rounded-[26px] p-5 transition-all duration-200 hover:-translate-y-0.5"
      style={{
        background: "linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(249,249,251,0.92) 100%)",
        border: "1px solid rgba(120,120,128,0.12)",
        boxShadow: "0 18px 40px rgba(15,23,42,0.06)",
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            <p
              className="truncate text-[17px] font-semibold tracking-[-0.03em]"
              style={{ color: "var(--text-primary)" }}
            >
              {tradingsymbol}
            </p>
            <span
              className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]"
              style={{
                background: "rgba(15,23,42,0.045)",
                color: "var(--text-tertiary)",
              }}
            >
              {exchange}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3">
            <div>
              <p className="text-[11px] font-medium" style={{ color: "var(--text-tertiary)" }}>
                Quantity
              </p>
              <p className="mt-1 text-[14px] font-medium" style={{ color: "var(--text-primary)" }}>
                {quantity}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium" style={{ color: "var(--text-tertiary)" }}>
                Avg Price
              </p>
              <p className="mt-1 text-[14px] font-medium" style={{ color: "var(--text-primary)" }}>
                ₹{inrDec(averagePrice)}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium" style={{ color: "var(--text-tertiary)" }}>
                LTP
              </p>
              <p className="mt-1 text-[14px] font-medium" style={{ color: "var(--text-primary)" }}>
                ₹{inrDec(lastPrice)}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end text-right">
          <p className="text-[11px] font-medium" style={{ color: "var(--text-tertiary)" }}>
            Current Value
          </p>
          <p
            className="mt-1 text-[20px] font-semibold tracking-[-0.03em]"
            style={{ color: "var(--text-primary)" }}
          >
            ₹{inr(currentValue)}
          </p>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-[13px] font-semibold" style={{ color: tone }}>
              {positive ? "+" : "−"}₹{inr(pnl)}
            </span>
            <span
              className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
              style={{
                background: positive ? "rgba(31,157,85,0.10)" : "rgba(217,71,63,0.10)",
                color: tone,
              }}
            >
              {positive ? "+" : "−"}{Math.abs(pnlPct).toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
