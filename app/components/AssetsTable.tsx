"use client";

import { useState } from "react";
import { assets, Asset, AssetCategory } from "../data/assets";
import AddAssetModal, { AssetFormData } from "./AddAssetModal";

const TABS: { label: string; value: AssetCategory | "all" }[] = [
  { label: "All",            value: "all" },
  { label: "Stocks & ETFs",  value: "stocks" },
  { label: "Gold & Silver",  value: "gold" },
  { label: "Fixed Income",   value: "fixed" },
  { label: "Real Estate",    value: "realestate" },
  { label: "Cash & Savings", value: "cash" },
  { label: "Crypto",         value: "crypto" },
  { label: "Other",          value: "other" },
];

const CATEGORY_META: Record<AssetCategory, { label: string; bg: string; color: string }> = {
  stocks:     { label: "STOCKS & ETFS",  bg: "#e8eeff", color: "#2c5ae9" },
  gold:       { label: "COMMODITY",      bg: "#fff8e0", color: "#a67c00" },
  fixed:      { label: "FIXED INCOME",   bg: "#e8f5ed", color: "#1e7a3e" },
  realestate: { label: "REAL ESTATE",    bg: "#fff0e6", color: "#c0501a" },
  cash:       { label: "CASH & SAVINGS", bg: "#f2f2f7", color: "#636366" },
  crypto:     { label: "CRYPTO",         bg: "#ede8ff", color: "#5b30c0" },
  other:      { label: "OTHER",          bg: "#f2f2f7", color: "#636366" },
};

function fmtINR(n: number) {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(2)} Cr`;
  if (n >= 100_000)    return `₹${(n / 100_000).toFixed(1)} L`;
  if (n >= 1_000)      return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n.toLocaleString("en-IN")}`;
}

function AssetIcon({ asset }: { asset: Asset }) {
  return (
    <div
      className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-[15px] sm:text-[16px] shrink-0 font-bold select-none"
      style={{ background: asset.iconBg, color: asset.iconColor }}
    >
      {asset.iconSymbol}
    </div>
  );
}

function CategoryBadge({ category }: { category: AssetCategory }) {
  const m = CATEGORY_META[category];
  return (
    <span
      className="inline-block text-[9px] font-semibold px-1.5 py-0.5 rounded-full tracking-wider"
      style={{ background: m.bg, color: m.color, letterSpacing: "0.06em" }}
    >
      {m.label}
    </span>
  );
}

function PnlCell({ value, pct }: { value: number; pct: number }) {
  const pos = value >= 0;
  return (
    <div className="flex flex-col items-end gap-0.5">
      <span className="text-[13px] font-semibold" style={{ color: pos ? "#007aff" : "#ff3b30" }}>
        {pos ? "+" : ""}{fmtINR(value)}
      </span>
      <span className="text-[11px]" style={{ color: pos ? "#007aff" : "#ff3b30", opacity: 0.7 }}>
        {pos ? "+" : ""}{pct.toFixed(1)}%
      </span>
    </div>
  );
}

/* ── Icons ── */
function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.35-4.35" />
    </svg>
  );
}
function UploadIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}
function DownloadIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}
function PlusIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M12 4v16M4 12h16" />
    </svg>
  );
}

/* ── Shared stat label for mobile cards ── */
function StatLabel({ label, value, align = "left" }: { label: string; value: string; align?: "left" | "center" | "right" }) {
  return (
    <div className={`flex flex-col gap-0.5 ${align === "center" ? "items-center" : align === "right" ? "items-end" : ""}`}>
      <p className="text-[9.5px] font-semibold uppercase" style={{ color: "#aeaeb2", letterSpacing: "0.08em" }}>
        {label}
      </p>
      <p className="text-[13px] font-medium" style={{ color: "#1d1d1f" }}>{value}</p>
    </div>
  );
}

export default function AssetsTable() {
  const [activeTab, setActiveTab] = useState<AssetCategory | "all">("all");
  const [search, setSearch] = useState("");
  const [sectionTab, setSectionTab] = useState<"assets" | "liabilities">("assets");
  const [modalOpen, setModalOpen] = useState(false);

  const handleSave = (data: AssetFormData, addAnother: boolean) => {
    // TODO: persist asset data
    console.log("Asset saved:", data, "addAnother:", addAnother);
  };

  const filtered = assets.filter((a) => {
    const matchTab = activeTab === "all" || a.category === activeTab;
    const matchSearch =
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.ticker.toLowerCase().includes(search.toLowerCase());
    return matchTab && matchSearch;
  });

  const addButton = (
    <button
      onClick={() => setModalOpen(true)}
      className="btn-lift flex items-center gap-1.5 h-[34px] px-3 sm:px-4 rounded-[10px] text-[12px] sm:text-[13px] font-semibold text-white shrink-0"
      style={{ background: "#007aff" }}
    >
      <PlusIcon />
      <span className="hidden sm:inline">Add Asset</span>
      <span className="sm:hidden">Add</span>
    </button>
  );

  return (
    <>
    <AddAssetModal open={modalOpen} onClose={() => setModalOpen(false)} onSave={handleSave} />
    <div
      className="rounded-[16px] sm:rounded-[20px] overflow-hidden"
      style={{
        background: "#fff",
        border: "1px solid rgba(60,60,67,0.08)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 2px 12px rgba(0,0,0,0.04)",
      }}
    >
      {/* ── Toolbar ── */}
      <div
        className="flex flex-col md:flex-row md:items-center md:justify-between px-4 sm:px-5 md:px-6 pt-4 sm:pt-5 pb-3 sm:pb-4 gap-3 md:gap-2"
        style={{ borderBottom: "1px solid rgba(60,60,67,0.06)" }}
      >
        {/* Section tabs */}
        <div className="flex items-center gap-5">
          {(["assets", "liabilities"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setSectionTab(t)}
              className="relative pb-1 text-[13px] sm:text-[14px] font-medium transition-colors capitalize"
              style={{
                color:      sectionTab === t ? "#1d1d1f" : "#aeaeb2",
                fontWeight: sectionTab === t ? 600 : 400,
              }}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
              {sectionTab === t && (
                <span className="absolute bottom-0 left-0 right-0 h-[1.5px] rounded-full" style={{ background: "#1d1d1f" }} />
              )}
            </button>
          ))}
        </div>

        {/* Search + action buttons */}
        <div className="flex items-center gap-2">
          {/* Search — expands full-width on mobile */}
          <div
            className="flex items-center flex-1 md:flex-none md:w-[210px] px-3"
            style={{
              background: "rgba(60,60,67,0.06)",
              borderRadius: 10,
              height: 34,
              transition: "background 180ms ease-out",
            }}
          >
            <span className="text-[#aeaeb2] mr-2 flex items-center shrink-0"><SearchIcon /></span>
            <input
              type="text"
              placeholder="Search assets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-glass flex-1 bg-transparent text-[13px] placeholder:text-[#aeaeb2] min-w-0"
              style={{ color: "#1d1d1f" }}
            />
          </div>

          {/* Upload / Download — desktop only */}
          <button className="icon-btn hidden md:flex w-[34px] h-[34px] items-center justify-center rounded-[10px] text-[#aeaeb2] hover:text-[#1d1d1f] hover:bg-black/5">
            <UploadIcon />
          </button>
          <button className="icon-btn hidden md:flex w-[34px] h-[34px] items-center justify-center rounded-[10px] text-[#aeaeb2] hover:text-[#1d1d1f] hover:bg-black/5">
            <DownloadIcon />
          </button>

          {addButton}
        </div>
      </div>

      {/* ── Category filter tabs ── */}
      <div
        className="flex items-center gap-1 sm:gap-1.5 px-4 sm:px-5 md:px-6 py-2.5 sm:py-3 overflow-x-auto scrollbar-hide"
        style={{ borderBottom: "1px solid rgba(60,60,67,0.06)" }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className="shrink-0 px-3 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-[11.5px] sm:text-[12px] font-medium"
              style={{
                background:  isActive ? "#1d1d1f" : "transparent",
                color:       isActive ? "#fff" : "#86868b",
                transition:  "background 180ms ease-out, color 180ms ease-out",
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Mobile card list (< md) ── */}
      <div className="md:hidden">
        {filtered.map((asset, idx) => {
          const invested   = asset.avgCost * asset.quantity;
          const currentVal = asset.ltp * asset.quantity;
          const pnl        = currentVal - invested;
          const pnlPct     = invested > 0 ? (pnl / invested) * 100 : 0;
          const isLast     = idx === filtered.length - 1;

          return (
            <div
              key={asset.id}
              className="px-4 sm:px-5 py-4"
              style={{ borderBottom: isLast ? "none" : "1px solid rgba(60,60,67,0.05)" }}
            >
              {/* Row 1: icon + name + p&l */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <AssetIcon asset={asset} />
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold truncate" style={{ color: "#1d1d1f" }}>
                      {asset.name}
                    </p>
                    <div className="mt-0.5">
                      <CategoryBadge category={asset.category} />
                    </div>
                  </div>
                </div>
                <PnlCell value={pnl} pct={pnlPct} />
              </div>

              {/* Row 2: metrics */}
              <div
                className="flex items-start justify-between mt-3 pt-3"
                style={{ borderTop: "1px solid rgba(60,60,67,0.055)" }}
              >
                <StatLabel label="Invested"  value={fmtINR(invested)}   />
                <StatLabel label="Cur. Val"  value={fmtINR(currentVal)} align="center" />
                <StatLabel label="Alloc."    value={`${asset.allocation}%`} align="right" />
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="py-14 text-center text-[13px]" style={{ color: "#aeaeb2" }}>
            No assets found
          </div>
        )}
      </div>

      {/* ── Desktop / tablet table (md+) ── */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(60,60,67,0.06)" }}>
              {[
                { label: "ASSET NAME", align: "left",  pad: "pl-6 pr-4" },
                { label: "AVG. COST",  align: "right", pad: "px-4" },
                { label: "LTP",        align: "right", pad: "px-4" },
                { label: "INVESTED",   align: "right", pad: "px-4" },
                { label: "CUR. VAL",   align: "right", pad: "px-4" },
                { label: "P&L",        align: "right", pad: "px-4" },
                { label: "% ALLOC.",   align: "right", pad: "pr-6 pl-4" },
              ].map((col) => (
                <th
                  key={col.label}
                  className={`py-3 ${col.pad} text-${col.align} text-[10px] font-semibold uppercase`}
                  style={{ color: "#aeaeb2", letterSpacing: "0.08em", whiteSpace: "nowrap" }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {filtered.map((asset, idx) => {
              const invested   = asset.avgCost * asset.quantity;
              const currentVal = asset.ltp * asset.quantity;
              const pnl        = currentVal - invested;
              const pnlPct     = invested > 0 ? (pnl / invested) * 100 : 0;
              const isLast     = idx === filtered.length - 1;

              return (
                <tr
                  key={asset.id}
                  className="cursor-pointer"
                  style={{ borderBottom: isLast ? "none" : "1px solid rgba(60,60,67,0.05)" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(60,60,67,0.02)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  <td className="pl-6 pr-4 py-4">
                    <div className="flex items-center gap-3">
                      <AssetIcon asset={asset} />
                      <div>
                        <p className="text-[13px] font-semibold" style={{ color: "#1d1d1f" }}>{asset.name}</p>
                        <div className="mt-1"><CategoryBadge category={asset.category} /></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right text-[13px]" style={{ color: "#86868b", whiteSpace: "nowrap" }}>
                    {fmtINR(asset.avgCost)}
                  </td>
                  <td className="px-4 py-4 text-right text-[13px] font-medium" style={{ color: "#1d1d1f", whiteSpace: "nowrap" }}>
                    {fmtINR(asset.ltp)}
                  </td>
                  <td className="px-4 py-4 text-right text-[13px]" style={{ color: "#86868b", whiteSpace: "nowrap" }}>
                    {fmtINR(invested)}
                  </td>
                  <td className="px-4 py-4 text-right text-[13px] font-medium" style={{ color: "#1d1d1f", whiteSpace: "nowrap" }}>
                    {fmtINR(currentVal)}
                  </td>
                  <td className="px-4 py-4 text-right"><PnlCell value={pnl} pct={pnlPct} /></td>
                  <td className="pr-6 pl-4 py-4 text-right">
                    <div className="flex items-center justify-end gap-2.5">
                      <div className="w-14 h-[3px] rounded-full overflow-hidden" style={{ background: "rgba(60,60,67,0.1)" }}>
                        <div className="h-full rounded-full" style={{ width: `${Math.min(asset.allocation, 100)}%`, background: "#1d1d1f" }} />
                      </div>
                      <span className="text-[13px] font-medium w-9 text-right" style={{ color: "#1d1d1f" }}>
                        {asset.allocation}%
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="py-16 text-center text-[13px]" style={{ color: "#aeaeb2" }}>No assets found</div>
        )}
      </div>
    </div>
    </>
  );
}
