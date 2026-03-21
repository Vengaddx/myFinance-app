import { summaryData } from "../data/assets";

function fmt(n: number, prefix = "$") {
  if (n >= 1_000_000) return `${prefix}${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${prefix}${(n / 1_000).toFixed(1)}K`;
  return `${prefix}${n.toLocaleString()}`;
}

type MetricCardProps = {
  label: string;
  value: string;
  sub?: string;
  subPositive?: boolean;
};

function MetricCard({ label, value, sub, subPositive }: MetricCardProps) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex-1 min-w-0">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">{label}</p>
      <p className="text-2xl font-bold text-gray-900 leading-tight">{value}</p>
      {sub && (
        <p className={`text-xs mt-1 font-medium ${subPositive ? "text-emerald-500" : "text-red-400"}`}>
          {sub}
        </p>
      )}
    </div>
  );
}

export default function SummaryCards() {
  const d = summaryData;
  const pnlPositive = d.totalPnl >= 0;

  return (
    <div className="flex gap-4">
      {/* Net Worth — dark card */}
      <div className="bg-gray-900 rounded-2xl p-6 text-white min-w-[220px] shadow-md">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Net Worth</p>
        <p className="text-3xl font-bold leading-tight">{fmt(d.netWorth)}</p>
        <p className="text-xs text-gray-400 mt-2">as of today</p>
        <div className="mt-4 pt-4 border-t border-gray-700">
          <p className="text-xs text-gray-400">Liabilities</p>
          <p className="text-lg font-semibold text-red-400 mt-0.5">-{fmt(d.liabilities)}</p>
        </div>
      </div>

      {/* Other metric cards */}
      <div className="flex gap-3 flex-1">
        <MetricCard label="Invested" value={fmt(d.invested)} />
        <MetricCard label="Cost Basis" value={fmt(d.costBasis)} />
        <MetricCard
          label="Total P&L"
          value={`${pnlPositive ? "+" : ""}${fmt(d.totalPnl)}`}
          sub={`${pnlPositive ? "+" : ""}${d.totalPnlPct}% overall`}
          subPositive={pnlPositive}
        />
      </div>
    </div>
  );
}
