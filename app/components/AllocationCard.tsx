import { allocationData, summaryData } from "../data/assets";

function fmtINRShort(n: number) {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(1)} Cr`;
  if (n >= 100_000)    return `₹${(n / 100_000).toFixed(1)} L`;
  return `₹${n.toLocaleString("en-IN")}`;
}

// Uses viewBox so CSS can control the rendered size
function DonutChart() {
  const size = 148;
  const cx = size / 2;
  const cy = size / 2;
  const r = 50;
  const strokeWidth = 13;
  const gap = 2.5;
  const total = allocationData.reduce((s, d) => s + d.pct, 0);

  let angle = -90;
  const slices = allocationData.map((seg) => {
    const degrees = (seg.pct / total) * 360 - gap;
    const startAngle = angle;
    angle += degrees + gap;
    const startRad = (startAngle * Math.PI) / 180;
    const endRad   = ((startAngle + degrees) * Math.PI) / 180;
    const x1 = cx + r * Math.cos(startRad);
    const y1 = cy + r * Math.sin(startRad);
    const x2 = cx + r * Math.cos(endRad);
    const y2 = cy + r * Math.sin(endRad);
    const largeArc = degrees > 180 ? 1 : 0;
    return { ...seg, d: `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}` };
  });

  const totalAssets = summaryData.netWorth + summaryData.liabilities;

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-auto">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f0f0f5" strokeWidth={strokeWidth} />
      {slices.map((s, i) => (
        <path key={i} d={s.d} fill="none" stroke={s.color} strokeWidth={strokeWidth} strokeLinecap="round" />
      ))}
      <text x={cx} y={cy - 7} textAnchor="middle" fontSize="13" fontWeight="700" fill="#1d1d1f">
        {fmtINRShort(totalAssets)}
      </text>
      <text x={cx} y={cy + 8} textAnchor="middle" fontSize="8" fontWeight="500" fill="#aeaeb2" letterSpacing="0.07em">
        TOTAL ASSETS
      </text>
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

type SegmentRowProps = { label: string; pct: number; amount: number; color: string };
function SegmentRow({ label, pct, amount, color }: SegmentRowProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
        <span className="text-[11.5px] font-medium" style={{ color: "#86868b" }}>{label}</span>
      </div>
      <p className="text-[11.5px] font-semibold pl-3" style={{ color: "#1d1d1f" }}>
        {pct}%
        <span className="font-normal ml-1.5" style={{ color: "#aeaeb2" }}>
          · {fmtINRShort(amount)}
        </span>
      </p>
    </div>
  );
}

export default function AllocationCard() {
  return (
    <div
      className="card-lift card-shadow-light flex flex-col h-full rounded-[20px] p-5"
      style={{
        background: "#fff",
        border: "1px solid rgba(60,60,67,0.07)",
      }}
    >
      {/* header */}
      <div className="flex items-center justify-between mb-4 sm:mb-5">
        <p className="text-[14px] font-semibold" style={{ color: "#1d1d1f" }}>Asset Allocation</p>
        <button className="icon-btn text-[#c7c7cc] hover:text-[#86868b]" style={{ transition: "color 150ms ease-out" }}>
          <InfoIcon />
        </button>
      </div>

      {/* Donut + legend */}
      <div className="flex items-center gap-4 sm:gap-7 flex-1">

        {/* Donut: 110px on mobile, 148px on sm+ */}
        <div className="w-[100px] sm:w-[148px] shrink-0">
          <DonutChart />
        </div>

        {/* Legend */}
        <div className="flex flex-1 gap-3 sm:gap-5 min-w-0">

          {/* First column — always visible */}
          <div className="flex flex-col gap-2.5 sm:gap-3.5 flex-1 min-w-0">
            {allocationData.map((seg) => (
              <SegmentRow key={seg.label} {...seg} />
            ))}
          </div>

          {/* Second column — sm and above only */}
          <div className="hidden sm:flex flex-col gap-3.5 flex-1 min-w-0">
            {allocationData.map((seg) => (
              <SegmentRow key={`r-${seg.label}`} {...seg} />
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}
