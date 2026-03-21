"use client";

import { useEffect, useMemo, useState } from "react";
import { AssetCategory } from "../data/assets";
import AddAssetModal, { AssetFormData } from "./AddAssetModal";
import { supabase } from "@/lib/supabase";
import Toast from "./toast";
import { useTheme } from "@/lib/ThemeContext";

type DbAssetRow = {
  id: string;
  name: string;
  type: string | null;
  value: number | string | null;
  notes: string | null;
  created_at?: string;
};

type UiAsset = {
  id: string;
  name: string;
  ticker: string;
  category: string;
  shares: number;
  invested: number;
  curVal: number;
  pnl: number;
  pnlPct: number;
  allocation: number;
};

const TABS: { label: string; value: AssetCategory | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Stocks & ETFs", value: "stocks" },
  { label: "Gold & Silver", value: "gold" },
  { label: "Lended", value: "lended" },
  { label: "Fixed Deposits", value: "fd" },
  { label: "Real Estate", value: "realestate" },
  { label: "Cash & Savings", value: "cash" },
  { label: "Crypto", value: "crypto" },
  { label: "Other", value: "other" },
];

const CATEGORY_META: Record<
  AssetCategory,
  { label: string; bg: string; color: string }
> = {
  stocks: { label: "STOCKS & ETFS", bg: "#e8eeff", color: "#2c5ae9" },
  gold: { label: "COMMODITY", bg: "#fff8e0", color: "#a67c00" },
  lended: { label: "LENDED", bg: "#e8f5ed", color: "#1e7a3e" },
  fd: { label: "FIXED DEPOSITS", bg: "#e6f4ff", color: "#0055b3" },
  realestate: { label: "REAL ESTATE", bg: "#fff0e6", color: "#c0501a" },
  cash: { label: "CASH & SAVINGS", bg: "#f2f2f7", color: "#636366" },
  crypto: { label: "CRYPTO", bg: "#ede8ff", color: "#5b30c0" },
  other: { label: "OTHER", bg: "#f2f2f7", color: "#636366" },
};

function normalizeCategory(value?: string | null): AssetCategory {
  const v = String(value ?? "").toLowerCase().trim();

  if (
    v === "stocks" ||
    v === "stock" ||
    v === "etf" ||
    v === "equity" ||
    v === "stocks & etfs"
  ) {
    return "stocks";
  }
  if (v === "gold" || v === "silver" || v === "commodity" || v === "gold & silver") {
    return "gold";
  }
  if (v === "lended" || v === "lend" || v === "loan given") {
    return "lended";
  }
  if (v === "fd" || v === "fixed deposits" || v === "fixed deposit" || v === "fixed" || v === "fixed income") {
    return "fd";
  }
  if (v === "realestate" || v === "real estate" || v === "property") {
    return "realestate";
  }
  if (v === "cash" || v === "cash & savings" || v === "savings" || v === "bank") {
    return "cash";
  }
  if (v === "crypto" || v === "bitcoin") {
    return "crypto";
  }
  return "other";
}

function fmtINR(n?: number | string | null) {
  const value = Number(n ?? 0);

  if (value >= 10_000_000) return `₹${(value / 10_000_000).toFixed(2)} Cr`;
  if (value >= 100_000) return `₹${(value / 100_000).toFixed(1)} L`;
  if (value >= 1_000) return `₹${(value / 1_000).toFixed(1)} K`;
  return `₹${value.toLocaleString("en-IN")}`;
}

function AssetIcon({ type }: { type?: string }) {
  const category = normalizeCategory(type);

  const iconMap: Record<
    AssetCategory,
    { symbol: string; bg: string; color: string }
  > = {
    stocks: { symbol: "📈", bg: "#e8eeff", color: "#2c5ae9" },
    gold: { symbol: "🥇", bg: "#fff8e0", color: "#a67c00" },
    lended: { symbol: "🤝", bg: "#e8f5ed", color: "#1e7a3e" },
    fd: { symbol: "🏦", bg: "#e6f4ff", color: "#0055b3" },
    realestate: { symbol: "🏠", bg: "#fff0e6", color: "#c0501a" },
    cash: { symbol: "💵", bg: "#f2f2f7", color: "#636366" },
    crypto: { symbol: "₿", bg: "#ede8ff", color: "#5b30c0" },
    other: { symbol: "📦", bg: "#f2f2f7", color: "#636366" },
  };

  const icon = iconMap[category];

  return (
    <div
      className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-[15px] sm:text-[16px] shrink-0 font-bold select-none"
      style={{ background: icon.bg, color: icon.color }}
    >
      {icon.symbol}
    </div>
  );
}

function CategoryBadge({ category }: { category?: string }) {
  const safeCategory = normalizeCategory(category);
  const m = CATEGORY_META[safeCategory];

  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-medium"
      style={{ color: m.color }}
    >
      <span className="w-[5px] h-[5px] rounded-full shrink-0" style={{ background: m.color }} />
      {m.label}
    </span>
  );
}

function EditIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

function PnlCell({ value, pct }: { value: number; pct: number }) {
  const pos = value >= 0;
  return (
    <div className="flex flex-col items-end gap-0.5">
      <span
        className="text-[13px] font-semibold"
        style={{ color: pos ? "#007aff" : "#ff3b30" }}
      >
        {pos ? "+" : ""}
        {fmtINR(value)}
      </span>
      <span
        className="text-[11px]"
        style={{ color: pos ? "#007aff" : "#ff3b30", opacity: 0.7 }}
      >
        {pos ? "+" : ""}
        {pct.toFixed(1)}%
      </span>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <path d="M12 4v16M4 12h16" />
    </svg>
  );
}

function StatLabel({
  label,
  value,
  align = "left",
}: {
  label: string;
  value: string;
  align?: "left" | "center" | "right";
}) {
  return (
    <div
      className={`flex flex-col gap-0.5 ${
        align === "center"
          ? "items-center"
          : align === "right"
          ? "items-end"
          : ""
      }`}
    >
      <p
        className="text-[9.5px] font-semibold uppercase"
        style={{ color: "var(--text-tertiary)", letterSpacing: "0.08em" }}
      >
        {label}
      </p>
      <p className="text-[13px] font-medium" style={{ color: "var(--text-primary)" }}>
        {value}
      </p>
    </div>
  );
}

function FilterSummaryBanner({
  assets,
  activeTab,
  totalAssets,
}: {
  assets: UiAsset[];
  activeTab: string;
  totalAssets: number;
}) {
  if (activeTab === "all" || assets.length === 0) return null;

  const invested = assets.reduce((s, a) => s + a.invested, 0);
  const curVal = assets.reduce((s, a) => s + a.curVal, 0);
  const pnl = curVal - invested;
  const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;
  const pos = pnl >= 0;
  const categoryLabel =
    CATEGORY_META[assets[0].category as keyof typeof CATEGORY_META]?.label ??
    activeTab.toUpperCase();

  return (
    <div
      className="mx-4 sm:mx-5 md:mx-6 my-3 rounded-[14px] px-4 sm:px-5 py-4"
      style={{ background: "var(--surface-secondary)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <p
          className="text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: "var(--text-tertiary)", letterSpacing: "0.12em" }}
        >
          {categoryLabel}
        </p>
        <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
          {assets.length} asset{assets.length !== 1 ? "s" : ""}
          {totalAssets > 0 && (
            <span>
              {" · "}
              {((curVal / totalAssets) * 100).toFixed(1)}% of portfolio
            </span>
          )}
        </p>
      </div>

      {/* Metrics */}
      <div className="flex items-start gap-6 sm:gap-10">
        <div className="flex flex-col gap-0.5">
          <p
            className="text-[9.5px] font-semibold uppercase"
            style={{ color: "var(--text-tertiary)", letterSpacing: "0.08em" }}
          >
            Invested
          </p>
          <p
            className="text-[15px] font-semibold"
            style={{ color: "var(--text-primary)", letterSpacing: "-0.015em" }}
          >
            {fmtINR(invested)}
          </p>
        </div>

        <div className="flex flex-col gap-0.5">
          <p
            className="text-[9.5px] font-semibold uppercase"
            style={{ color: "var(--text-tertiary)", letterSpacing: "0.08em" }}
          >
            Current Value
          </p>
          <p
            className="text-[15px] font-semibold"
            style={{ color: "var(--text-primary)", letterSpacing: "-0.015em" }}
          >
            {fmtINR(curVal)}
          </p>
        </div>

        <div className="flex flex-col gap-0.5">
          <p
            className="text-[9.5px] font-semibold uppercase"
            style={{ color: "var(--text-tertiary)", letterSpacing: "0.08em" }}
          >
            P&L
          </p>
          <p
            className="text-[15px] font-semibold"
            style={{ color: pos ? "#34c759" : "#ff3b30", letterSpacing: "-0.015em" }}
          >
            {pos ? "+" : ""}
            {fmtINR(pnl)}
            <span className="text-[11px] font-medium ml-1.5" style={{ opacity: 0.75 }}>
              ({pos ? "+" : ""}{pnlPct.toFixed(1)}%)
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

type AssetsTableProps = {
  onDataChanged?: () => void;
};

export default function AssetsTable({ onDataChanged }: AssetsTableProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [activeTab, setActiveTab] = useState<AssetCategory | "all">("all");
  const [search, setSearch] = useState("");
  const [sectionTab, setSectionTab] = useState<"assets" | "liabilities">(
    "assets"
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [dbAssets, setDbAssets] = useState<DbAssetRow[]>([]);
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
const [editingFormData, setEditingFormData] = useState<AssetFormData | null>(null);
const [toastMessage, setToastMessage] = useState("");
const [toastType, setToastType] = useState<"success" | "error" | "info">("info");
const [toastVisible, setToastVisible] = useState(false);

  const fetchAssets = async () => {
    const { data, error } = await supabase
      .from("assets")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    setDbAssets((data as DbAssetRow[]) ?? []);
  };

  const handleEdit = (asset: UiAsset) => {
  const dbRow = dbAssets.find((item) => item.id === asset.id);

  let parsedNotes: any = {};
  try {
    parsedNotes = dbRow?.notes ? JSON.parse(dbRow.notes) : {};
  } catch {
    parsedNotes = {};
  }

  setEditingAssetId(asset.id);
  setEditingFormData({
    name: asset.name,
    currency: String(parsedNotes.currency ?? "INR"),
    invested: String(parsedNotes.invested ?? parsedNotes.avgPurchasePrice ?? ""),
    currentValue: String(asset.curVal ?? ""),
    assetType: asset.category,
  });

  setModalOpen(true);
};

  const handleSave = async (data: AssetFormData, addAnother: boolean) => {
  const cleanCurrentValue = Number(
    String(data.currentValue ?? "").replace(/,/g, "").trim()
  );

  const notes = JSON.stringify({
    currency: data.currency,
    invested: Number(String(data.invested ?? "").replace(/,/g, "").trim()),
  });

  if (editingAssetId) {
    const { error } = await supabase
      .from("assets")
      .update({
        name: data.name,
        type: data.assetType,
        value: Number.isFinite(cleanCurrentValue) ? cleanCurrentValue : 0,
        notes,
      })
      .eq("id", editingAssetId);

    if (error) {
      showToast(error.message, "error");
      return;
    }

    await fetchAssets();
    showToast("Asset updated successfully", "success");
    onDataChanged?.();
    setEditingAssetId(null);
    setEditingFormData(null);
    setModalOpen(false);
    return;
  }

  const { error } = await supabase.from("assets").insert([
    {
      name: data.name,
      type: data.assetType,
      value: Number.isFinite(cleanCurrentValue) ? cleanCurrentValue : 0,
      notes,
    },
  ]);

  if (error) {
    showToast(error.message, "error");
    return;
  }

  await fetchAssets();
showToast("Asset added successfully", "success");
onDataChanged?.();
  if (!addAnother) {
    setModalOpen(false);
  }
};

  useEffect(() => {
    fetchAssets();
  }, []);

  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
  setToastMessage(message);
  setToastType(type);
  setToastVisible(true);

  setTimeout(() => {
    setToastVisible(false);
  }, 2500);
};

  const mappedAssets = useMemo<UiAsset[]>(() => {
    const base = dbAssets.map((a) => {
      let parsedNotes: Record<string, unknown> = {};

      try {
        parsedNotes = a.notes ? JSON.parse(a.notes) : {};
      } catch {
        parsedNotes = {};
      }

      const invested = Number(parsedNotes.invested ?? parsedNotes.avgPurchasePrice ?? 0);
      const curVal = Number(a.value ?? 0);
      const pnl = curVal - invested;
      const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;
      const category = normalizeCategory(a.type);

      return {
        id: a.id,
        name: a.name ?? "Untitled Asset",
        ticker: a.name ?? "Untitled Asset",
        category,
        shares: 0,
        invested,
        curVal,
        pnl,
        pnlPct,
        allocation: 0,
      };
    });

    const totalCurVal = base.reduce((sum, item) => sum + item.curVal, 0);

    return base.map((item) => ({
      ...item,
      allocation: totalCurVal > 0 ? Number(((item.curVal / totalCurVal) * 100).toFixed(1)) : 0,
    }));
  }, [dbAssets]);

  const filtered = mappedAssets.filter((a) => {
    const matchTab = activeTab === "all" || a.category === activeTab;
    const q = search.toLowerCase().trim();
    const matchSearch =
      a.name.toLowerCase().includes(q) || a.ticker.toLowerCase().includes(q);

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
  const handleDelete = async (id: string) => {
  const confirmDelete = confirm("Are you sure you want to delete this asset?");
  if (!confirmDelete) return;

  const { error } = await supabase
    .from("assets")
    .delete()
    .eq("id", id);

  if (error) {
    showToast(error.message, "error");
    return;
  }

  setDbAssets((prev) => prev.filter((item) => item.id !== id));

  await fetchAssets();

  showToast("Asset deleted successfully", "success");
  onDataChanged?.();
};

  return (

    <>
    <Toast
    message={toastMessage}
    type={toastType}
    visible={toastVisible}
  />
      <AddAssetModal
  open={modalOpen}
  onClose={() => {
    setModalOpen(false);
    setEditingAssetId(null);
    setEditingFormData(null);
  }}
  onSave={handleSave}
  initialData={editingFormData}
  mode={editingAssetId ? "edit" : "add"}
/>

      <div
        className="rounded-[16px] sm:rounded-[20px] overflow-hidden"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--separator)",
          boxShadow: isDark
            ? "0 0 0 1px rgba(255,255,255,0.06), 0 4px 20px rgba(255,255,255,0.03)"
            : "0 1px 3px rgba(0,0,0,0.04), 0 2px 12px rgba(0,0,0,0.04)",
        }}
      >
        <div
          className="flex flex-col md:flex-row md:items-center md:justify-between px-4 sm:px-5 md:px-6 pt-4 sm:pt-5 pb-3 sm:pb-4 gap-3 md:gap-2"
          style={{ borderBottom: "1px solid var(--separator-subtle)" }}
        >
          <div className="flex items-center gap-5">
            {(["assets", "liabilities"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setSectionTab(t)}
                className="relative pb-1 text-[13px] sm:text-[14px] font-medium transition-colors capitalize"
                style={{
                  color: sectionTab === t ? "var(--text-primary)" : "var(--text-tertiary)",
                  fontWeight: sectionTab === t ? 600 : 400,
                }}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
                {sectionTab === t && (
                  <span
                    className="absolute bottom-0 left-0 right-0 h-[1.5px] rounded-full"
                    style={{ background: "var(--text-primary)" }}
                  />
                )}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div
              className="flex items-center flex-1 md:flex-none md:w-[210px] px-3"
              style={{
                background: "var(--surface-secondary)",
                borderRadius: 10,
                height: 34,
                transition: "background 180ms ease-out",
              }}
            >
              <span className="text-[#aeaeb2] mr-2 flex items-center shrink-0">
                <SearchIcon />
              </span>
              <input
                type="text"
                placeholder="Search assets..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="search-glass flex-1 bg-transparent text-[13px] placeholder:text-[#aeaeb2] min-w-0"
                style={{ color: "var(--text-primary)" }}
              />
            </div>

            <button className="icon-btn hidden md:flex w-[34px] h-[34px] items-center justify-center rounded-[10px] text-[#aeaeb2] hover:text-[#1d1d1f] hover:bg-black/5">
              <UploadIcon />
            </button>
            <button className="icon-btn hidden md:flex w-[34px] h-[34px] items-center justify-center rounded-[10px] text-[#aeaeb2] hover:text-[#1d1d1f] hover:bg-black/5">
              <DownloadIcon />
            </button>

            {addButton}
          </div>
        </div>

        <div
          className="flex items-center gap-1 sm:gap-1.5 px-4 sm:px-5 md:px-6 py-2.5 sm:py-3 overflow-x-auto scrollbar-hide"
          style={{ borderBottom: "1px solid var(--separator-subtle)" }}
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className="shrink-0 px-3 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-[11.5px] sm:text-[12px] font-medium"
                style={{
                  background: isActive
                    ? isDark ? "rgba(255,255,255,0.12)" : "#1d1d1f"
                    : "transparent",
                  color: isActive
                    ? isDark ? "#ffffff" : "#ffffff"
                    : "var(--text-secondary)",
                  border: isActive && isDark ? "1px solid rgba(255,255,255,0.2)" : "1px solid transparent",
                  transition: "background 180ms ease-out, color 180ms ease-out",
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <FilterSummaryBanner
          assets={filtered}
          activeTab={activeTab}
          totalAssets={mappedAssets.reduce((s, a) => s + a.curVal, 0)}
        />

        <div className="md:hidden">
          {filtered.map((asset, idx) => {
            const isLast = idx === filtered.length - 1;

            return (
              <div
                key={asset.id}
                className="px-4 sm:px-5 py-4"
                style={{
                  borderBottom: isLast ? "none" : "1px solid var(--separator-subtle)",
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="min-w-0">
                      <p
                        className="text-[13px] font-semibold truncate"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {asset.name}
                      </p>
                      <div className="mt-0.5">
                        <CategoryBadge category={asset.category} />
                      </div>
                    </div>
                  </div>
                  <PnlCell value={asset.pnl} pct={asset.pnlPct} />
                </div>

                <div
                  className="flex items-start justify-between mt-3 pt-3"
                  style={{ borderTop: "1px solid var(--separator-subtle)" }}
                >
                  <StatLabel label="Invested" value={fmtINR(asset.invested)} />
                  <StatLabel
                    label="Cur. Val"
                    value={fmtINR(asset.curVal)}
                    align="center"
                  />
                  <StatLabel
                    label="Alloc."
                    value={`${asset.allocation}%`}
                    align="right"
                  />
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div
              className="py-14 text-center text-[13px]"
              style={{ color: "var(--text-tertiary)" }}
            >
              No assets found
            </div>
          )}
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--separator-subtle)" }}>
                {[
                  { label: "ASSET NAME", align: "left", pad: "pl-6 pr-4" },
                  { label: "INVESTED", align: "right", pad: "px-4" },
                  { label: "CUR. VAL", align: "right", pad: "px-4" },
                  { label: "P&L", align: "right", pad: "px-4" },
                  { label: "% ALLOC.", align: "right", pad: "pr-6 pl-4" },
                ].map((col) => (
                  <th
                    key={col.label}
                    className={`py-3 ${col.pad} text-${col.align} text-[10px] font-semibold uppercase`}
                    style={{
                      color: "var(--text-tertiary)",
                      letterSpacing: "0.08em",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {filtered.map((asset, idx) => {
                const isLast = idx === filtered.length - 1;

                return (
                  <tr
  key={asset.id}
  className="cursor-pointer"
  style={{
    borderBottom: isLast ? "none" : "1px solid var(--separator-subtle)",
  }}
  onMouseEnter={(e) => {
    (e.currentTarget as HTMLElement).style.background =
      "var(--row-hover)";
  }}
  onMouseLeave={(e) => {
    (e.currentTarget as HTMLElement).style.background =
      "transparent";
  }}
>
  <td className="pl-6 pr-4 py-4">
    <div>
      <p
        className="text-[13px] font-semibold"
        style={{ color: "var(--text-primary)" }}
      >
        {asset.name}
      </p>

      <div className="mt-1 flex items-center gap-2">
        <CategoryBadge category={asset.category} />

        <button
          onClick={() => handleEdit(asset)}
          className="icon-btn w-5 h-5 flex items-center justify-center rounded-md"
          style={{ color: "var(--text-tertiary)" }}
          title="Edit"
        >
          <EditIcon />
        </button>

        <button
          onClick={() => handleDelete(asset.id)}
          className="icon-btn w-5 h-5 flex items-center justify-center rounded-md"
          style={{ color: "var(--text-tertiary)" }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#ff3b30")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-tertiary)")}
          title="Delete"
        >
          <TrashIcon />
        </button>
      </div>
    </div>
  </td>

  <td
    className="px-4 py-4 text-right text-[13px]"
    style={{ color: "var(--text-secondary)", whiteSpace: "nowrap" }}
  >
    {fmtINR(asset.invested)}
  </td>

  <td
    className="px-4 py-4 text-right text-[13px] font-medium"
    style={{ color: "var(--text-primary)", whiteSpace: "nowrap" }}
  >
    {fmtINR(asset.curVal)}
  </td>

  <td className="px-4 py-4 text-right">
    <PnlCell value={asset.pnl} pct={asset.pnlPct} />
  </td>

  <td className="pr-6 pl-4 py-4 text-right">
    <div className="flex items-center justify-end gap-2.5">
      <div
        className="w-14 h-[3px] rounded-full overflow-hidden"
        style={{ background: "var(--separator)" }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${Math.min(asset.allocation, 100)}%`,
            background: "var(--text-primary)",
          }}
        />
      </div>
      <span
        className="text-[13px] font-medium w-9 text-right"
        style={{ color: "var(--text-primary)" }}
      >
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
            <div
              className="py-16 text-center text-[13px]"
              style={{ color: "var(--text-tertiary)" }}
            >
              No assets found
            </div>
          )}
        </div>
      </div>
    </>
  );
}
