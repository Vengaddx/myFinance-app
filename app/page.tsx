import Navbar from "./components/Navbar";
import NetWorthCard from "./components/NetWorthCard";
import MetricCard from "./components/MetricCard";
import AllocationCard from "./components/AllocationCard";
import AssetsTable from "./components/AssetsTable";
import { summaryData } from "./data/assets";

function fmtINR(n: number) {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(2)} Cr`;
  if (n >= 100_000)    return `₹${(n / 100_000).toFixed(1)} L`;
  return `₹${n.toLocaleString("en-IN")}`;
}

export default function Home() {
  const d = summaryData;

  return (
    <div className="min-h-screen" style={{ background: "#f2f2f7" }}>
      <Navbar />

      <main className="max-w-[1320px] mx-auto px-4 sm:px-5 lg:px-6 py-4 sm:py-5 lg:py-6 flex flex-col gap-3 sm:gap-4">

        {/*
          ── Responsive top grid ──
          Mobile  (1 col):  NetWorth → Metrics (2-col flex) → Allocation
          Tablet  (2 col):  [NetWorth spanning 2 rows] [Metrics stacked] / [Allocation full-width]
          Desktop (3 col):  NetWorth | Metrics | Allocation — single row
        */}
        <div className="
          grid gap-3 sm:gap-3.5
          grid-cols-1
          md:grid-cols-[1fr_200px]
          lg:grid-cols-[268px_200px_1fr]
        ">
          {/* Net Worth */}
          <div className="md:col-start-1 md:row-start-1 md:row-span-2 lg:row-span-1">
            <NetWorthCard />
          </div>

          {/* Metrics: side-by-side on mobile, stacked on md+ */}
          <div className="flex flex-row md:flex-col gap-2 md:col-start-2 md:row-start-1">
            <MetricCard
              label="Invested"
              value={fmtINR(d.invested)}
              sub={`${d.investedPctOfNetWorth}% of Net Worth`}
              subColor="muted"
              className="flex-1 md:flex-none"
            />
            <MetricCard
              label="Total P&L"
              value={`+${fmtINR(d.totalPnl)}`}
              sub={`+${d.totalPnlPct}% ROI`}
              subColor="blue"
              className="flex-1 md:flex-none"
            />
          </div>

          {/* Allocation: full-width on mobile/tablet, right col on desktop */}
          <div className="md:col-span-2 lg:col-span-1 lg:col-start-3 lg:row-start-1">
            <AllocationCard />
          </div>
        </div>

        {/* Assets Table */}
        <AssetsTable />

      </main>
    </div>
  );
}
