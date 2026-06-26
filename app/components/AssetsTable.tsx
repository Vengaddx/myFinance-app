"use client";

import { useEffect, useMemo, useState } from "react";
import { AssetCategory } from "../data/assets";
import AddAssetModal, { AssetFormData } from "./AddAssetModal";
import AddLiabilityModal, { LiabilityFormData } from "./AddLiabilityModal";
import AddLendModal, { LendFormData } from "./AddLendModal";
import AddExpenseModal, { ExpenseFormData, EXPENSE_CATEGORIES } from "./AddExpenseModal";
import RepayLiabilityModal from "./RepayLiabilityModal";
import LiabilityLogsModal, { LendLogEntry } from "./LiabilityLogsModal";
import MarkReceivedModal from "./MarkReceivedModal";
import { supabase } from "@/lib/supabase";
import Toast from "./toast";
import { useTheme } from "@/lib/ThemeContext";
import { useAuth } from "@/lib/AuthContext";
import { getLimits, isPremium } from "@/lib/planLimits";
import PremiumUpgradeModal from "./PremiumUpgradeModal";

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
  accountLabel?: string; // only set for Kite holdings
};

type KiteGroupRow = {
  id: string;
  name: string;
  subLabel: string;
  category: string;
  count: number;
  invested: number;
  curVal: number;
  pnl: number;
  pnlPct: number;
  allocation: number;
};

type DbExpenseRow = {
  id: string;
  title: string;
  amount: number;
  category: string;
  expense_date: string;
  month_key: string;
  notes: string | null;
  claim_eligible: boolean;
  claim_submitted: boolean;
  splitwise_applicable: boolean;
  splitwise_added: boolean;
  created_at?: string;
};

type BrokerHolding = {
  tradingsymbol: string;
  exchange: string;
  quantity: number;
  average_price: number;
  last_price: number;
  pnl: number;
  day_change_pct: number;
  synced_at: string;
  account_label: string;
};

const TABS: { label: string; value: AssetCategory | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Stocks & ETFs", value: "stocks" },
  { label: "Gold & Silver", value: "gold" },
  { label: "Fixed Deposits", value: "fd" },
  { label: "Real Estate", value: "realestate" },
  { label: "Bank Account", value: "bank" },
  { label: "Cash", value: "cash" },
  { label: "Crypto", value: "crypto" },
  { label: "Other", value: "other" },
];

const CATEGORY_META: Record<
  AssetCategory,
  { label: string; bg: string; color: string }
> = {
  stocks:     { label: "STOCKS & ETFS",   bg: "#EFF6FF", color: "#2563EB" },
  gold:       { label: "COMMODITY",       bg: "#FFFBEB", color: "#D97706" },
  lended:     { label: "LENDED",          bg: "#F0FDF4", color: "#16A34A" },
  fd:         { label: "FIXED DEPOSITS",  bg: "#EEF2FF", color: "#4F46E5" },
  realestate: { label: "REAL ESTATE",     bg: "#FFF7ED", color: "#EA580C" },
  bank:       { label: "BANK ACCOUNT",    bg: "#F0F9FF", color: "#0284C7" },
  cash:       { label: "CASH",            bg: "#F8FAFC", color: "#64748B" },
  crypto:     { label: "CRYPTO",          bg: "#F5F3FF", color: "#7C3AED" },
  other:      { label: "OTHER",           bg: "#F8FAFC", color: "#71717A" },
};

const EXPENSE_CATEGORY_META: Record<string, { bg: string; color: string }> = {
  food:          { bg: "#FFF7ED", color: "#C2410C" },
  cab:           { bg: "#EFF6FF", color: "#1D4ED8" },
  groceries:     { bg: "#F0FDF4", color: "#15803D" },
  shopping:      { bg: "#FAF5FF", color: "#7E22CE" },
  bills:         { bg: "#FEFCE8", color: "#A16207" },
  travel:        { bg: "#ECFEFF", color: "#0E7490" },
  medical:       { bg: "#FFF1F2", color: "#BE123C" },
  entertainment: { bg: "#FFF0F5", color: "#9D174D" },
  office:        { bg: "#F8FAFC", color: "#475569" },
  other:         { bg: "#F8FAFC", color: "#71717A" },
};

function getExpenseCategoryMeta(cat: string) {
  return EXPENSE_CATEGORY_META[cat.toLowerCase()] ?? EXPENSE_CATEGORY_META.other;
}

function parseExpenseNotes(raw: string | null): { note: string; sarAmount: number | null; sarRate: number | null } {
  if (!raw) return { note: "", sarAmount: null, sarRate: null };
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return {
        note: String(parsed.note ?? ""),
        sarAmount: parsed.sar != null ? Number(parsed.sar) : null,
        sarRate: parsed.rate != null ? Number(parsed.rate) : null,
      };
    }
  } catch { /* plain text */ }
  return { note: raw, sarAmount: null, sarRate: null };
}

function getMonthOptions(): { key: string; label: string }[] {
  const options: { key: string; label: string }[] = [];
  const now = new Date();
  // 11 past months + current + 2 future = 14 total, newest first
  for (let offset = 2; offset >= -11; offset--) {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
    options.push({ key, label });
  }
  return options;
}

// Kite instruments classified under Gold & Silver instead of Stocks
const KITE_GOLD_EXACT = new Set(["SILVERBEES", "GOLDBEES"]);

function classifyKiteHolding(tradingsymbol: string): "gold" | "stocks" {
  // Sovereign Gold Bonds have symbols starting with "SGB" (e.g. SGBDE31III-GB)
  if (tradingsymbol.startsWith("SGB")) return "gold";
  if (KITE_GOLD_EXACT.has(tradingsymbol)) return "gold";
  return "stocks";
}

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
  if (v === "bank" || v === "bank account") {
    return "bank";
  }
  if (v === "cash" || v === "cash & savings" || v === "savings") {
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
  if (value >= 100_000) return `₹${(value / 100_000).toFixed(2)} L`;
  if (value >= 1_000) return `₹${(value / 1_000).toFixed(2)} K`;
  return `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtINRFull(n?: number | string | null) {
  const value = Number(n ?? 0);
  return `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtAmt(amount: number, currency: string = "INR") {
  const sym = currency === "USD" ? "$" : currency === "SAR" ? "﷼" : "₹";
  return `${sym}${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  const date = new Date(d + "T00:00:00");
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function daysSince(d: string | null | undefined): number | null {
  if (!d) return null;
  const diff = Date.now() - new Date(d + "T00:00:00").getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function StatusBadge({ status }: { status: string }) {
  const isActive = status === "active";
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium" style={{ color: isActive ? "#16A34A" : "#636366" }}>
      <span className="w-[5px] h-[5px] rounded-full shrink-0" style={{ background: isActive ? "#16A34A" : "#636366" }} />
      {isActive ? "Active" : "Closed"}
    </span>
  );
}


const ASSET_ICON_SVG: Record<AssetCategory, React.ReactNode> = {
  stocks: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  ),
  gold: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v1.5M12 15.5V17M10 9.5c0-1.1.9-2 2-2s2 .9 2 2c0 1.1-.9 1.5-2 1.5S10 13 10 14.1c0 1.1.9 2 2 2s2-.9 2-2" />
    </svg>
  ),
  lended: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="23" y1="11" x2="17" y2="11" />
      <polyline points="20 8 23 11 20 14" />
    </svg>
  ),
  fd: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  ),
  realestate: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  bank: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="22" x2="21" y2="22" />
      <line x1="6" y1="18" x2="6" y2="11" />
      <line x1="10" y1="18" x2="10" y2="11" />
      <line x1="14" y1="18" x2="14" y2="11" />
      <line x1="18" y1="18" x2="18" y2="11" />
      <polygon points="12 2 20 7 4 7" />
    </svg>
  ),
  cash: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="2" />
      <path d="M6 12h.01M18 12h.01" />
    </svg>
  ),
  crypto: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 8h6M9 12h6M9 16h4" />
      <path d="M7 4h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
      <path d="M11 4v3M13 4v3M11 17v3M13 17v3" />
    </svg>
  ),
  other: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  ),
};

const ASSET_ICON_STYLE: Record<AssetCategory, { bgLight: string; bgDark: string; color: string }> = {
  stocks:     { bgLight: "rgba(37,99,235,0.09)",   bgDark: "rgba(59,130,246,0.16)",  color: "#2563EB" },
  gold:       { bgLight: "rgba(217,119,6,0.09)",   bgDark: "rgba(245,158,11,0.16)",  color: "#D97706" },
  lended:     { bgLight: "rgba(22,163,74,0.09)",   bgDark: "rgba(34,197,94,0.16)",   color: "#16A34A" },
  fd:         { bgLight: "rgba(79,70,229,0.09)",   bgDark: "rgba(99,102,241,0.16)",  color: "#4F46E5" },
  realestate: { bgLight: "rgba(234,88,12,0.09)",   bgDark: "rgba(249,115,22,0.16)",  color: "#EA580C" },
  bank:       { bgLight: "rgba(2,132,199,0.09)",   bgDark: "rgba(14,165,233,0.16)",  color: "#0284C7" },
  cash:       { bgLight: "rgba(100,116,139,0.09)", bgDark: "rgba(148,163,184,0.16)", color: "#64748B" },
  crypto:     { bgLight: "rgba(124,58,237,0.09)",  bgDark: "rgba(139,92,246,0.16)",  color: "#7C3AED" },
  other:      { bgLight: "rgba(113,113,122,0.09)", bgDark: "rgba(113,113,122,0.16)", color: "#71717A" },
};

function AssetIcon({ type, isDark }: { type?: string; isDark?: boolean }) {
  const category = normalizeCategory(type);
  const style = ASSET_ICON_STYLE[category];
  const bg = isDark ? style.bgDark : style.bgLight;

  return (
    <div
      className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
      style={{ background: bg, color: style.color }}
    >
      {ASSET_ICON_SVG[category]}
    </div>
  );
}

function CategoryBadge({ category }: { category?: string }) {
  const safeCategory = normalizeCategory(category);
  const m = CATEGORY_META[safeCategory];

  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] font-medium"
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

function PnlCell({ value, pct, neutral }: { value: number; pct: number; neutral?: boolean }) {
  if (neutral) {
    return (
      <div className="flex flex-col items-end gap-0.5">
        <span className="text-[14px] font-semibold" style={{ color: "var(--text-tertiary)" }}>—</span>
        <span className="text-[12px]" style={{ color: "var(--text-tertiary)", opacity: 0.6 }}>balance</span>
      </div>
    );
  }
  const pos = value >= 0;
  return (
    <div className="flex flex-col items-end gap-0.5">
      <span
        className="text-[13.5px] font-semibold"
        style={{ color: pos ? "#16A34A" : "#DC2626" }}
      >
        {pos ? "+" : ""}
        {fmtINRFull(value)}
      </span>
      <span
        className="text-[11.5px]"
        style={{ color: pos ? "#16A34A" : "#DC2626", opacity: 0.7 }}
      >
        {pos ? "+" : ""}
        {pct.toFixed(2)}%
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
        className="text-[10.5px] font-semibold uppercase"
        style={{ color: "var(--text-tertiary)", letterSpacing: "0.08em" }}
      >
        {label}
      </p>
      <p className="text-[15px] font-semibold" style={{ color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
        {value}
      </p>
    </div>
  );
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round"
      style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 180ms ease", flexShrink: 0 }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

// ── Shared row renderers — used by both the flat (category-tab) list and the grouped (All-tab) list ──

function AssetMobileCard({
  asset, isDark, isLast, onEdit, onDelete,
}: {
  asset: UiAsset; isDark: boolean; isLast: boolean;
  onEdit: (a: UiAsset) => void; onDelete: (id: string) => void;
}) {
  const isKite = asset.id.startsWith("kite_");
  return (
    <div className="px-4 sm:px-5 py-4" style={{ borderBottom: isLast ? "none" : "1px solid var(--separator-subtle)" }}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <AssetIcon type={asset.category} isDark={isDark} />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-[16px] font-bold truncate" style={{ color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
                {asset.name}
              </p>
              {isKite && (
                <span className="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0"
                  style={{ background: "rgba(174,221,0,0.12)", color: "#5a7a00" }}>
                  {asset.accountLabel ?? "KITE"}
                </span>
              )}
            </div>
            <div className="mt-0.5">
              <CategoryBadge category={asset.category} />
            </div>
          </div>
        </div>
        <PnlCell value={asset.pnl} pct={asset.pnlPct} neutral={asset.category === "bank" || asset.category === "cash"} />
      </div>

      <div className="flex items-start justify-between mt-3 pt-3" style={{ borderTop: "1px solid var(--separator-subtle)" }}>
        <StatLabel label="Cur. Val" value={fmtINRFull(asset.curVal)} />
        <StatLabel label="Alloc." value={`${asset.allocation.toFixed(2)}%`} align="right" />
      </div>

      {!isKite && (
        <div className="flex items-center gap-2 mt-3 pt-3" style={{ borderTop: "1px solid var(--separator-subtle)" }}>
          <button
            onClick={() => onEdit(asset)}
            className="flex items-center gap-1 h-7 px-2.5 rounded-[8px] text-[12px] font-medium"
            style={{ color: "var(--text-secondary)", background: "var(--surface-secondary)" }}
          >
            <EditIcon /> Edit
          </button>
          <button
            onClick={() => onDelete(asset.id)}
            className="icon-btn ml-auto w-7 h-7 flex items-center justify-center rounded-[8px]"
            style={{ color: "var(--text-tertiary)" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#DC2626")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-tertiary)")}
          >
            <TrashIcon />
          </button>
        </div>
      )}
    </div>
  );
}

function KiteMobileCard({ row, isDark, isLast }: { row: KiteGroupRow; isDark: boolean; isLast: boolean }) {
  return (
    <div className="px-4 sm:px-5 py-4" style={{ borderBottom: isLast ? "none" : "1px solid var(--separator-subtle)" }}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <AssetIcon type={row.category} isDark={isDark} />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-[16px] font-bold truncate" style={{ color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
                {row.name}
              </p>
              <span className="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0"
                style={{ background: "rgba(174,221,0,0.12)", color: "#5a7a00" }}>
                KITE SYNC
              </span>
            </div>
            <div className="mt-0.5">
              <CategoryBadge category={row.category} />
            </div>
            <p className="text-[12px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>{row.subLabel}</p>
          </div>
        </div>
        <PnlCell value={row.pnl} pct={row.pnlPct} />
      </div>
      <div className="flex items-start justify-between mt-3 pt-3" style={{ borderTop: "1px solid var(--separator-subtle)" }}>
        <StatLabel label="Cur. Val" value={fmtINRFull(row.curVal)} />
        <StatLabel label="Invested" value={fmtINRFull(row.invested)} align="right" />
      </div>
    </div>
  );
}

function AssetDesktopRow({
  asset, isDark, isLast, onEdit, onDelete,
}: {
  asset: UiAsset; isDark: boolean; isLast: boolean;
  onEdit: (a: UiAsset) => void; onDelete: (id: string) => void;
}) {
  const isKite = asset.id.startsWith("kite_");
  return (
    <tr
      className="cursor-pointer"
      style={{ borderBottom: isLast ? "none" : "1px solid var(--separator-subtle)" }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--row-hover)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
    >
      <td className="pl-6 pr-4 py-3.5">
        <div className="flex items-center gap-3">
          <AssetIcon type={asset.category} isDark={isDark} />
          <div>
            <div className="flex items-center gap-2">
              <p className="text-[15px] font-bold" style={{ color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
                {asset.name}
              </p>
              {isKite && (
                <span className="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                  style={{ background: "rgba(174,221,0,0.12)", color: "#5a7a00" }}>
                  {asset.accountLabel ?? "KITE"}
                </span>
              )}
            </div>
            <div className="mt-1 flex items-center gap-2">
              <CategoryBadge category={asset.category} />
              {!isKite && (
                <>
                  <button
                    onClick={() => onEdit(asset)}
                    className="icon-btn w-5 h-5 flex items-center justify-center rounded-md"
                    style={{ color: "var(--text-tertiary)" }}
                    title="Edit"
                  >
                    <EditIcon />
                  </button>
                  <button
                    onClick={() => onDelete(asset.id)}
                    className="icon-btn w-5 h-5 flex items-center justify-center rounded-md"
                    style={{ color: "var(--text-tertiary)" }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#DC2626")}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-tertiary)")}
                    title="Delete"
                  >
                    <TrashIcon />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </td>

      <td className="px-4 py-3.5 text-right text-[15px] font-bold" style={{ color: "var(--text-primary)", whiteSpace: "nowrap", letterSpacing: "-0.01em" }}>
        {fmtINRFull(asset.curVal)}
      </td>

      <td className="px-4 py-4 text-right">
        <PnlCell value={asset.pnl} pct={asset.pnlPct} neutral={asset.category === "bank" || asset.category === "cash"} />
      </td>

      <td className="pr-6 pl-4 py-4 text-right">
        <div className="flex items-center justify-end gap-2.5">
          <div className="w-14 h-[3px] rounded-full overflow-hidden" style={{ background: "var(--separator)" }}>
            <div className="h-full rounded-full" style={{ width: `${Math.min(asset.allocation, 100)}%`, background: "var(--text-primary)" }} />
          </div>
          <span className="text-[15px] font-bold w-9 text-right" style={{ color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
            {asset.allocation.toFixed(2)}%
          </span>
        </div>
      </td>
    </tr>
  );
}

function KiteDesktopRow({ row, isDark, isLast }: { row: KiteGroupRow; isDark: boolean; isLast: boolean }) {
  return (
    <tr
      style={{ borderBottom: isLast ? "none" : "1px solid var(--separator-subtle)" }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--row-hover)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
    >
      <td className="pl-6 pr-4 py-3.5">
        <div className="flex items-center gap-3">
          <AssetIcon type={row.category} isDark={isDark} />
          <div>
            <div className="flex items-center gap-2">
              <p className="text-[15px] font-bold" style={{ color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
                {row.name}
              </p>
              <span className="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                style={{ background: "rgba(174,221,0,0.12)", color: "#5a7a00" }}>
                KITE SYNC
              </span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <CategoryBadge category={row.category} />
              <span className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>{row.subLabel}</span>
            </div>
          </div>
        </div>
      </td>

      <td className="px-4 py-4 text-right text-[15px] font-bold" style={{ color: "var(--text-primary)", whiteSpace: "nowrap", letterSpacing: "-0.01em" }}>
        {fmtINRFull(row.curVal)}
      </td>

      <td className="px-4 py-4 text-right">
        <PnlCell value={row.pnl} pct={row.pnlPct} />
      </td>

      <td className="pr-6 pl-4 py-4 text-right">
        <div className="flex items-center justify-end gap-2.5">
          <div className="w-14 h-[3px] rounded-full overflow-hidden" style={{ background: "var(--separator)" }}>
            <div className="h-full rounded-full" style={{ width: `${Math.min(row.allocation, 100)}%`, background: "var(--text-primary)" }} />
          </div>
          <span className="text-[15px] font-bold w-9 text-right" style={{ color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
            {row.allocation.toFixed(2)}%
          </span>
        </div>
      </td>
    </tr>
  );
}

function EmptyAssetsState() {
  return (
    <div className="py-16 flex flex-col items-center gap-2">
      <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "var(--surface-secondary)", color: "var(--text-tertiary)" }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      </div>
      <p className="text-[14px] font-semibold mt-1" style={{ color: "var(--text-primary)" }}>No assets yet</p>
      <p className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>Add your first asset to get started</p>
    </div>
  );
}

export type StickyBarData = {
  sectionTab: "assets" | "liabilities" | "expenses";
  categoryLabel: string;
  invested: number;
  curVal: number;
  pnl: number;
  pnlPct: number;
  assetCount: number;
  outstanding: number;
  totalBorrowed: number;
  liabilityCount: number;
  expensesTotal?: number;
  expensesClaimEligible?: number;
  expensesSplitPending?: number;
  expensesCount?: number;
};

type AssetsTableProps = {
  onDataChanged?: () => void;
  onSummaryChange?: (data: StickyBarData) => void;
  refreshKey?: number;
};

export default function AssetsTable({ onDataChanged, onSummaryChange, refreshKey }: AssetsTableProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { session, profile } = useAuth();
  const userId = session?.user?.id ?? "";
  const [activeTab, setActiveTab] = useState<AssetCategory | "all">("all");
  const [search, setSearch] = useState("");
  const [sectionTab, setSectionTab] = useState<"assets" | "liabilities" | "expenses">("assets");

  // Default to expenses on mobile — done in useEffect to avoid SSR/hydration mismatch
  useEffect(() => {
    if (window.innerWidth < 768) setSectionTab("expenses");
  }, []);
  const [expenses, setExpenses] = useState<DbExpenseRow[]>([]);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editingExpenseData, setEditingExpenseData] = useState<ExpenseFormData | null>(null);
  const [expenseMonthKey, setExpenseMonthKey] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState("all");
  const [expenseQuickFilter, setExpenseQuickFilter] = useState<"all" | "claim" | "splitwise">("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [dbAssets, setDbAssets] = useState<DbAssetRow[]>([]);
  const [sortKey, setSortKey] = useState<"curVal" | "pnl" | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [brokerHoldings, setBrokerHoldings] = useState<BrokerHolding[]>([]);
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
const [editingFormData, setEditingFormData] = useState<AssetFormData | null>(null);
const [toastMessage, setToastMessage] = useState("");
const [toastType, setToastType] = useState<"success" | "error" | "info">("info");
const [toastVisible, setToastVisible] = useState(false);
const [liabilities, setLiabilities] = useState<any[]>([]);
const [liabilityModalOpen, setLiabilityModalOpen] = useState(false);
const [editingLiabilityId, setEditingLiabilityId] = useState<string | null>(null);
const [editingLiabilityData, setEditingLiabilityData] = useState<LiabilityFormData | null>(null);
const [repayModalOpen, setRepayModalOpen] = useState(false);
const [repayingLiability, setRepayingLiability] = useState<{ id: string; name: string; outstanding: number; currency: string } | null>(null);
const [logsModalOpen, setLogsModalOpen] = useState(false);
const [viewingLogsLiabilityId, setViewingLogsLiabilityId] = useState<string | null>(null);
const [viewingLogsLiabilityName, setViewingLogsLiabilityName] = useState("");
const [viewingLendLogs, setViewingLendLogs] = useState<LendLogEntry[] | null>(null);
const [receivingLend, setReceivingLend] = useState<{ id: string; name: string; outstanding: number; currency: string } | null>(null);
const [receivedModalOpen, setReceivedModalOpen] = useState(false);
const [lendModalOpen, setLendModalOpen] = useState(false);
const [editingLendId, setEditingLendId] = useState<string | null>(null);
const [editingLendData, setEditingLendData] = useState<LendFormData | null>(null);
const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
const [upgradeContext, setUpgradeContext] = useState<string | undefined>(undefined);

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

  const fetchLiabilities = async () => {
  const { data, error } = await supabase
    .from("liabilities")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    showToast(error.message, "error");
    return;
  }

  setLiabilities(data ?? []);
};

  const fetchExpenses = async () => {
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .order("expense_date", { ascending: false });
    if (error) { console.error(error); return; }
    setExpenses((data as DbExpenseRow[]) ?? []);
  };

  const fetchBrokerHoldings = async () => {
    const { data, error } = await supabase
      .from("broker_holdings")
      .select("tradingsymbol, exchange, quantity, average_price, last_price, pnl, day_change_pct, synced_at, account_label")
      .eq("broker", "kite")
      .order("synced_at", { ascending: false });
    if (!error) setBrokerHoldings((data as BrokerHolding[]) ?? []);
  };

  const handleSaveExpense = async (data: ExpenseFormData) => {
    const monthKey = data.expense_date.slice(0, 7);
    const rate = Number(data.sar_rate) || 24.2;
    const inrAmount = data.currency === "SAR"
      ? Math.round(Number(data.amount) * rate)
      : Number(data.amount);
    // Pack SAR original into notes JSON; keep plain text for INR
    const notesValue = data.currency === "SAR"
      ? JSON.stringify({
          ...(data.notes.trim() ? { note: data.notes.trim() } : {}),
          sar: Number(data.amount),
          rate,
        })
      : (data.notes.trim() || null);

    const payload = {
      title: data.title.trim(),
      amount: inrAmount,
      category: data.category,
      expense_date: data.expense_date,
      month_key: monthKey,
      notes: notesValue,
      claim_eligible: data.claim_eligible,
      claim_submitted: data.claim_eligible ? data.claim_submitted : false,
      splitwise_applicable: data.splitwise_applicable,
      splitwise_added: data.splitwise_applicable ? data.splitwise_added : false,
    };

    if (editingExpenseId) {
      const { error } = await supabase
        .from("expenses")
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq("id", editingExpenseId)
        .eq("user_id", userId);
      if (error) { showToast(error.message, "error"); return; }
      await fetchExpenses();
      showToast("Expense updated successfully", "success");
      onDataChanged?.();
      setEditingExpenseId(null);
      setEditingExpenseData(null);
      setExpenseModalOpen(false);
    } else {
      const { error } = await supabase.from("expenses").insert([{ ...payload, user_id: userId }]);
      if (error) { showToast(error.message, "error"); return; }
      await fetchExpenses();
      showToast("Expense added successfully", "success");
      onDataChanged?.();
      setExpenseMonthKey(monthKey);
      setExpenseModalOpen(false);
    }
  };

  const openEditExpense = (e: DbExpenseRow) => {
    const { note, sarAmount, sarRate } = parseExpenseNotes(e.notes);
    setEditingExpenseId(e.id);
    setEditingExpenseData({
      title: e.title,
      amount: sarAmount !== null ? String(sarAmount) : String(e.amount),
      currency: sarAmount !== null ? "SAR" : "INR",
      sar_rate: sarRate !== null ? String(sarRate) : "24.2",
      category: e.category,
      expense_date: e.expense_date,
      notes: note,
      claim_eligible: e.claim_eligible,
      claim_submitted: e.claim_submitted,
      splitwise_applicable: e.splitwise_applicable,
      splitwise_added: e.splitwise_added,
    });
    setExpenseModalOpen(true);
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm("Delete this expense?")) return;
    const { error } = await supabase.from("expenses").delete().eq("id", id).eq("user_id", userId);
    if (error) { showToast(error.message, "error"); return; }
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    showToast("Expense deleted", "success");
    onDataChanged?.();
  };

  const handleAddLiability = async (data: LiabilityFormData) => {
    const today = new Date().toISOString().split("T")[0];
    const originalAmount = Number(data.original_amount) || 0;
    const outstandingAmount = Number(data.outstanding_amount) || originalAmount;

    const { data: inserted, error } = await supabase
      .from("liabilities")
      .insert([{
        lender_name: data.lender_name,
        lender_type: data.lender_type,
        liability_name: data.liability_name || null,
        original_amount: originalAmount,
        outstanding_amount: outstandingAmount,
        currency: data.currency,
        borrowed_date: data.borrowed_date || null,
        due_date: data.due_date || null,
        notes: data.notes || null,
        status: "active",
        user_id: userId,
      }])
      .select()
      .single();

    if (error) { showToast(error.message, "error"); return; }

    await supabase.from("liability_logs").insert([{
      liability_id: inserted.id,
      action_type: "created",
      amount: originalAmount,
      previous_outstanding: 0,
      new_outstanding: outstandingAmount,
      action_date: data.borrowed_date || today,
      remarks: data.notes || null,
      user_id: userId,
    }]);

    await fetchLiabilities();
    showToast("Liability added successfully", "success");
    onDataChanged?.();
    setLiabilityModalOpen(false);
  };

  const handleEditLiability = async (data: LiabilityFormData) => {
    if (!editingLiabilityId) return;
    const today = new Date().toISOString().split("T")[0];
    const newOutstanding = Number(data.outstanding_amount) || 0;
    const oldLiability = liabilities.find((l) => l.id === editingLiabilityId);
    const oldOutstanding = Number(oldLiability?.outstanding_amount ?? 0);
    const newStatus = newOutstanding === 0 ? "closed" : "active";

    const { error } = await supabase
      .from("liabilities")
      .update({
        lender_name: data.lender_name,
        lender_type: data.lender_type,
        liability_name: data.liability_name || null,
        original_amount: Number(data.original_amount) || 0,
        outstanding_amount: newOutstanding,
        currency: data.currency,
        borrowed_date: data.borrowed_date || null,
        due_date: data.due_date || null,
        notes: data.notes || null,
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", editingLiabilityId)
      .eq("user_id", userId);

    if (error) { showToast(error.message, "error"); return; }

    if (newOutstanding !== oldOutstanding) {
      await supabase.from("liability_logs").insert([{
        liability_id: editingLiabilityId,
        action_type: "adjustment",
        amount: Math.abs(newOutstanding - oldOutstanding),
        previous_outstanding: oldOutstanding,
        new_outstanding: newOutstanding,
        action_date: today,
        remarks: "Outstanding adjusted via edit",
        user_id: userId,
      }]);
    }

    await fetchLiabilities();
    showToast("Liability updated successfully", "success");
    onDataChanged?.();
    setEditingLiabilityId(null);
    setEditingLiabilityData(null);
    setLiabilityModalOpen(false);
  };

  const handleSaveLiability = async (data: LiabilityFormData) => {
    if (editingLiabilityId) {
      await handleEditLiability(data);
    } else {
      await handleAddLiability(data);
    }
  };

  const handleDeleteLiability = async (id: string) => {
    if (!confirm("Are you sure you want to delete this liability?")) return;
    const { error } = await supabase.from("liabilities").delete().eq("id", id).eq("user_id", userId);
    if (error) { showToast(error.message, "error"); return; }
    await fetchLiabilities();
    showToast("Liability deleted", "success");
    onDataChanged?.();
  };

  const handleRepay = async (amount: number, date: string, remarks: string) => {
    if (!repayingLiability) return;
    const oldOutstanding = repayingLiability.outstanding;
    const newOutstanding = Math.max(0, oldOutstanding - amount);
    const newStatus = newOutstanding === 0 ? "closed" : "active";

    const { error } = await supabase
      .from("liabilities")
      .update({ outstanding_amount: newOutstanding, status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", repayingLiability.id)
      .eq("user_id", userId);

    if (error) { showToast(error.message, "error"); return; }

    await supabase.from("liability_logs").insert([{
      liability_id: repayingLiability.id,
      action_type: "repayment",
      amount,
      previous_outstanding: oldOutstanding,
      new_outstanding: newOutstanding,
      action_date: date,
      remarks: remarks || null,
      user_id: userId,
    }]);

    await fetchLiabilities();
    showToast("Repayment recorded", "success");
    onDataChanged?.();
    setRepayModalOpen(false);
    setRepayingLiability(null);
  };

  const handleSaveLend = async (data: LendFormData) => {
    const today = new Date().toISOString().split("T")[0];
    const amount = Number(data.amount) || 0;

    if (editingLendId) {
      const dbRow = dbAssets.find((a) => a.id === editingLendId);
      let parsedNotes: Record<string, unknown> = {};
      try { parsedNotes = dbRow?.notes ? JSON.parse(dbRow.notes) : {}; } catch {}
      const updatedNotes = JSON.stringify({
        ...parsedNotes,
        invested: amount,
        lendDate: data.date || undefined,
        dueDate: data.due_date || undefined,
        lendNotes: data.notes || undefined,
      });
      const { error } = await supabase
        .from("assets")
        .update({ name: data.name, value: amount, notes: updatedNotes })
        .eq("id", editingLendId)
        .eq("user_id", userId);
      if (error) { showToast(error.message, "error"); return; }
      await fetchAssets();
      showToast("Lend updated", "success");
      onDataChanged?.();
      setEditingLendId(null);
      setEditingLendData(null);
      setLendModalOpen(false);
      return;
    }

    const initialLog = {
      date: data.date || today,
      amount,
      previousOutstanding: 0,
      newOutstanding: amount,
      action_type: "created" as const,
    };
    const notes = JSON.stringify({
      invested: amount,
      lendDate: data.date || undefined,
      dueDate: data.due_date || undefined,
      lendNotes: data.notes || undefined,
      lendLogs: [initialLog],
    });
    const { error } = await supabase.from("assets").insert([{
      name: data.name,
      type: "lended",
      value: amount,
      notes,
      user_id: userId,
    }]);
    if (error) { showToast(error.message, "error"); return; }
    await fetchAssets();
    showToast("Lend added", "success");
    onDataChanged?.();
    setLendModalOpen(false);
  };

  const openEditLend = (asset: UiAsset) => {
    const dbRow = dbAssets.find((a) => a.id === asset.id);
    let parsedNotes: Record<string, unknown> = {};
    try { parsedNotes = dbRow?.notes ? JSON.parse(dbRow.notes) : {}; } catch {}
    setEditingLendId(asset.id);
    setEditingLendData({
      name: asset.name,
      amount: String(asset.curVal ?? ""),
      date: String(parsedNotes.lendDate ?? ""),
      due_date: String(parsedNotes.dueDate ?? ""),
      notes: String(parsedNotes.lendNotes ?? ""),
    });
    setLendModalOpen(true);
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
    invested: String(parsedNotes.invested ?? ""),
    currentValue: String(asset.curVal ?? ""),
    assetType: String(dbRow?.type ?? asset.category),
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
      .eq("id", editingAssetId)
      .eq("user_id", userId);

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
      user_id: userId,
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
    fetchLiabilities();
    fetchExpenses();
    fetchBrokerHoldings();
  }, [refreshKey]);

  useEffect(() => {
    const handler = () => {
      if (sectionTab === "expenses") {
        setEditingExpenseId(null);
        setEditingExpenseData(null);
        setExpenseModalOpen(true);
      } else if (sectionTab === "liabilities") {
        setEditingLiabilityId(null);
        setEditingLiabilityData(null);
        setLiabilityModalOpen(true);
      } else {
        setModalOpen(true);
      }
    };
    document.addEventListener("mahfin:open-add", handler);
    return () => document.removeEventListener("mahfin:open-add", handler);
  }, [sectionTab]);

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

      const category = normalizeCategory(a.type);
      const curVal = Number(a.value ?? 0);
      const isSimple = category === "bank" || category === "cash";
      // For bank/cash: no invested cost basis — P&L is always 0
      const invested = isSimple ? 0 : Number(parsedNotes.invested ?? 0);
      const pnl = isSimple ? 0 : curVal - invested;
      const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;

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
      allocation: totalCurVal > 0 ? (item.curVal / totalCurVal) * 100 : 0,
    }));
  }, [dbAssets]);

  // ── Kite holdings as UiAsset items (for category-specific views) ─────────────
  const kiteUiAssets = useMemo<UiAsset[]>(() => {
    return brokerHoldings.map((h) => {
      const invested = h.quantity * h.average_price;
      const curVal   = h.quantity * h.last_price;
      const pnl      = curVal - invested;
      const pnlPct   = invested > 0 ? (pnl / invested) * 100 : 0;
      return {
        id: `kite_${h.account_label}_${h.tradingsymbol}`,
        name: h.tradingsymbol,
        ticker: h.tradingsymbol,
        category: classifyKiteHolding(h.tradingsymbol),
        shares: h.quantity,
        invested,
        curVal,
        pnl,
        pnlPct,
        allocation: 0, // recalculated in filtered
        accountLabel: h.account_label,
      };
    });
  }, [brokerHoldings]);

  // ── Kite grouped summary rows (for ALL view only) ────────────────────────────
  const kiteGroupedRows = useMemo<KiteGroupRow[]>(() => {
    const stocksH = kiteUiAssets.filter((h) => h.category === "stocks");
    const commH   = kiteUiAssets.filter((h) => h.category === "gold");
    const rows: Omit<KiteGroupRow, "allocation">[] = [];

    if (stocksH.length > 0) {
      const inv = stocksH.reduce((s, h) => s + h.invested, 0);
      const cur = stocksH.reduce((s, h) => s + h.curVal, 0);
      const p   = cur - inv;
      rows.push({
        id: "kite_group_stocks",
        name: "Kite Holdings",
        subLabel: `${stocksH.length} position${stocksH.length !== 1 ? "s" : ""} · Stocks & ETFs`,
        category: "stocks",
        count: stocksH.length,
        invested: inv,
        curVal: cur,
        pnl: p,
        pnlPct: inv > 0 ? (p / inv) * 100 : 0,
      });
    }

    if (commH.length > 0) {
      const inv = commH.reduce((s, h) => s + h.invested, 0);
      const cur = commH.reduce((s, h) => s + h.curVal, 0);
      const p   = cur - inv;
      rows.push({
        id: "kite_group_commodities",
        name: "Kite Commodities",
        subLabel: `${commH.length} position${commH.length !== 1 ? "s" : ""} · Gold & Silver`,
        category: "gold",
        count: commH.length,
        invested: inv,
        curVal: cur,
        pnl: p,
        pnlPct: inv > 0 ? (p / inv) * 100 : 0,
      });
    }

    const totalPortfolio =
      mappedAssets.reduce((s, a) => s + a.curVal, 0) +
      kiteUiAssets.reduce((s, a) => s + a.curVal, 0);
    return rows.map((r) => ({
      ...r,
      allocation: totalPortfolio > 0 ? (r.curVal / totalPortfolio) * 100 : 0,
    }));
  }, [kiteUiAssets, mappedAssets]);

  // Kite holdings always render as a single aggregated row — never as individual stock symbols
  const visibleKiteGroupedRows = useMemo(
    () => kiteGroupedRows.filter((r) => activeTab === "all" || r.category === activeTab),
    [kiteGroupedRows, activeTab]
  );

  const mappedLiabilities = liabilities.map((l) => ({
  id: l.id,
  name: l.liability_name || l.lender_name,
  lenderName: l.lender_name,
  liabilityType: l.lender_type,
  originalAmount: Number(l.original_amount ?? 0),
  outstandingAmount: Number(l.outstanding_amount ?? 0),
  currency: l.currency || "INR",
  borrowedDate: l.borrowed_date,
  dueDate: l.due_date,
  status: l.status || "active",
  notes: l.notes || "",
}));


  // Friends tab: lended assets (positive) + friend liabilities (negative)
  const friendsLended = useMemo(() => mappedAssets.filter((a) => a.category === "lended").map((a) => ({
    id: a.id,
    name: a.name,
    amount: a.curVal,
    kind: "lended" as const,
    currency: "INR" as const,
  })), [mappedAssets]);

  // All borrowed (bank + friend) filtered by search — for unified loans view
  const filteredAllBorrowed = useMemo(() => {
    const q = search.toLowerCase().trim();
    return mappedLiabilities.filter((l) =>
      l.lenderName.toLowerCase().includes(q) || l.name.toLowerCase().includes(q)
    );
  }, [mappedLiabilities, search]);

  const filteredAllLent = useMemo(() => {
    const q = search.toLowerCase().trim();
    return friendsLended.filter((f) => f.name.toLowerCase().includes(q));
  }, [friendsLended, search]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (e.month_key !== expenseMonthKey) return false;
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        if (!e.title.toLowerCase().includes(q) && !e.category.toLowerCase().includes(q)) return false;
      }
      if (expenseCategoryFilter !== "all" && e.category.toLowerCase() !== expenseCategoryFilter.toLowerCase()) return false;
      if (expenseQuickFilter === "claim" && !e.claim_eligible) return false;
      if (expenseQuickFilter === "splitwise" && !(e.splitwise_applicable && !e.splitwise_added)) return false;
      return true;
    });
  }, [expenses, expenseMonthKey, search, expenseCategoryFilter, expenseQuickFilter]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();

    const manualBase = mappedAssets.filter((a) => {
      if (a.category === "lended") return false; // lended lives in Friends tab
      const matchTab = activeTab === "all" || a.category === activeTab;
      const matchSearch = a.name.toLowerCase().includes(q) || a.ticker.toLowerCase().includes(q);
      return matchTab && matchSearch;
    });

    // Kite holdings never appear as individual rows — they're always shown as one aggregated row (see kiteGroupedRows)
    // Recompute allocation relative to the visible filtered set
    const totalCurVal = manualBase.reduce((s, a) => s + a.curVal, 0);
    const withAlloc = manualBase.map((a) => ({
      ...a,
      allocation: totalCurVal > 0 ? (a.curVal / totalCurVal) * 100 : 0,
    }));

    if (!sortKey) return withAlloc;
    return [...withAlloc].sort((a, b) => {
      const diff = a[sortKey] - b[sortKey];
      return sortDir === "asc" ? diff : -diff;
    });
  }, [mappedAssets, activeTab, search, sortKey, sortDir]);

  // ── Grouped-by-category view for the "All" tab — collapsible sections instead of one long flat list ──
  type CategoryGroup = {
    category: AssetCategory;
    label: string;
    items: UiAsset[];
    kiteRow: KiteGroupRow | null;
    curVal: number;
    invested: number;
    pnl: number;
    pnlPct: number;
    count: number;
  };

  const groupedAssets = useMemo<CategoryGroup[]>(() => {
    const q = search.toLowerCase().trim();
    const manualAll = mappedAssets.filter((a) => {
      if (a.category === "lended") return false; // lended lives in Friends tab
      return a.name.toLowerCase().includes(q) || a.ticker.toLowerCase().includes(q);
    });

    const totalCurVal = manualAll.reduce((s, a) => s + a.curVal, 0);
    const byCategory = new Map<string, UiAsset[]>();
    for (const a of manualAll) {
      const withAlloc = { ...a, allocation: totalCurVal > 0 ? (a.curVal / totalCurVal) * 100 : 0 };
      const arr = byCategory.get(a.category) ?? [];
      arr.push(withAlloc);
      byCategory.set(a.category, arr);
    }

    return TABS
      .filter((t) => t.value !== "all")
      .map((tab) => {
        const items = byCategory.get(tab.value) ?? [];
        const kiteRow = kiteGroupedRows.find((r) => r.category === tab.value) ?? null;
        const curVal = items.reduce((s, a) => s + a.curVal, 0) + (kiteRow?.curVal ?? 0);
        const invested = items.reduce((s, a) => s + a.invested, 0) + (kiteRow?.invested ?? 0);
        const pnl = items.reduce((s, a) => s + a.pnl, 0) + (kiteRow?.pnl ?? 0);
        return {
          category: tab.value as AssetCategory,
          label: tab.label,
          items,
          kiteRow,
          curVal,
          invested,
          pnl,
          pnlPct: invested > 0 ? (pnl / invested) * 100 : 0,
          count: items.length + (kiteRow ? 1 : 0),
        };
      })
      .filter((g) => g.count > 0)
      .sort((a, b) => b.curVal - a.curVal);
  }, [mappedAssets, search, kiteGroupedRows]);

  // Collapsed by default — only the categories you expand take up scroll space.
  // Searching or having a single category auto-expands, so results are never hidden behind a click.
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const isGroupExpanded = (category: string) =>
    search.trim() !== "" || groupedAssets.length <= 1 || expandedGroups.has(category);
  const toggleGroup = (category: string) =>
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category); else next.add(category);
      return next;
    });

  useEffect(() => {
    if (!onSummaryChange) return;

    if (sectionTab === "expenses") {
      const expensesTotal = filteredExpenses.reduce((s, e) => s + e.amount, 0);
      const expensesClaimEligible = filteredExpenses.filter((e) => e.claim_eligible).reduce((s, e) => s + e.amount, 0);
      const expensesSplitPending = filteredExpenses.filter((e) => e.splitwise_applicable && !e.splitwise_added).reduce((s, e) => s + e.amount, 0);
      onSummaryChange({
        sectionTab: "expenses",
        categoryLabel: "Expenses",
        invested: 0, curVal: 0, pnl: 0, pnlPct: 0, assetCount: 0,
        outstanding: 0, totalBorrowed: 0, liabilityCount: 0,
        expensesTotal,
        expensesClaimEligible,
        expensesSplitPending,
        expensesCount: filteredExpenses.length,
      });
      return;
    }

    // Kite items are never in `filtered` — add their totals (scoped to the active tab) separately
    const kiteForTab = kiteUiAssets.filter((a) => activeTab === "all" || a.category === activeTab);
    const kiteInv = kiteForTab.reduce((s, a) => s + a.invested, 0);
    const kiteCur = kiteForTab.reduce((s, a) => s + a.curVal, 0);
    const kitePnl = kiteForTab.reduce((s, a) => s + a.pnl, 0);
    const invested = filtered.reduce((s, a) => s + a.invested, 0) + kiteInv;
    const curVal   = filtered.reduce((s, a) => s + a.curVal, 0) + kiteCur;
    // Sum individual pnl values (bank/cash assets already carry pnl=0)
    const pnl      = filtered.reduce((s, a) => s + a.pnl, 0) + kitePnl;
    const pnlPct   = invested > 0 ? (pnl / invested) * 100 : 0;
    const activeLibs = liabilities
      .filter((l) => (l.status || "active") === "active")
      .map((l) => ({
        outstanding: Number(l.outstanding_amount ?? 0),
        original:    Number(l.original_amount ?? 0),
      }));
    const outstanding   = activeLibs.reduce((s, l) => s + l.outstanding, 0);
    const totalBorrowed = activeLibs.reduce((s, l) => s + l.original, 0);
    const categoryLabel =
      activeTab === "all"
        ? "All Assets"
        : (CATEGORY_META[activeTab as AssetCategory]?.label ?? activeTab);
    onSummaryChange({
      sectionTab,
      categoryLabel,
      invested,
      curVal,
      pnl,
      pnlPct,
      assetCount: filtered.length,
      outstanding,
      totalBorrowed,
      liabilityCount: activeLibs.length,
    });
  }, [filtered, filteredExpenses, sectionTab, activeTab, liabilities, kiteUiAssets, onSummaryChange]);

  const handleSort = (key: "curVal" | "pnl") => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const handleGlobalDownload = async () => {
    try {
      const ExcelJSModule = await import("exceljs");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ExcelJS: any = (ExcelJSModule as any).default ?? ExcelJSModule;
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "MyFinance";
      workbook.created = new Date();

      // ─── Design tokens ─────────────────────────────────────────
      const C = {
        BLUE:       "FF2563EB",
        BLUE_DARK:  "FF1E3A8A",
        GREEN:      "FF16A34A",
        RED:        "FFDC2626",
        WHITE:      "FFFFFFFF",
        ROW_ALT:    "FFF8FAFC",
        BORDER:     "FFE2E8F0",
        BORDER_HDR: "FF1D4ED8",
        MUTED:      "FF64748B",
      };

      const thin = (argb: string) => ({ style: "thin" as const, color: { argb } });
      const medium = (argb: string) => ({ style: "medium" as const, color: { argb } });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const styleHeader = (row: any) => {
        row.height = 28;
        row.eachCell((cell: any) => {
          cell.font = { bold: true, color: { argb: C.WHITE }, size: 11 };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.BLUE } };
          cell.alignment = { vertical: "middle", horizontal: "center" };
          cell.border = { bottom: medium(C.BORDER_HDR), right: thin(C.BORDER_HDR) };
        });
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const styleDataRow = (row: any, idx: number) => {
        const bg = idx % 2 === 0 ? C.WHITE : C.ROW_ALT;
        row.height = 21;
        row.eachCell({ includeEmpty: true }, (cell: any) => {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
          cell.alignment = { vertical: "middle" };
          cell.border = { top: thin(C.BORDER), left: thin(C.BORDER), bottom: thin(C.BORDER), right: thin(C.BORDER) };
        });
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const styleTotalRow = (row: any) => {
        row.height = 26;
        row.eachCell({ includeEmpty: true }, (cell: any) => {
          cell.font = { bold: true, color: { argb: C.WHITE }, size: 11 };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.BLUE_DARK } };
          cell.alignment = { vertical: "middle" };
          cell.border = { top: medium(C.BORDER_HDR) };
        });
      };

      // ─── SHEET 1: ASSETS ───────────────────────────────────────
      const ws1 = workbook.addWorksheet("Assets", {
        views: [{ state: "frozen", xSplit: 0, ySplit: 1 }],
      });

      ws1.columns = [
        { key: "name",       width: 34, header: "Asset Name" },
        { key: "category",   width: 20, header: "Category" },
        { key: "curVal",     width: 22, header: "Current Value (₹)" },
        { key: "invested",   width: 20, header: "Invested (₹)" },
        { key: "pnl",        width: 18, header: "P&L (₹)" },
        { key: "pnlPct",     width: 13, header: "P&L (%)" },
        { key: "allocation", width: 14, header: "Allocation (%)" },
      ];

      styleHeader(ws1.getRow(1));

      const totalPortfolioVal =
        mappedAssets.reduce((s, a) => s + a.curVal, 0) +
        kiteUiAssets.reduce((s, a) => s + a.curVal, 0);

      const assetsForReport = [
        ...mappedAssets.map((a) => ({
          name: a.name,
          category: CATEGORY_META[a.category as AssetCategory]?.label ?? a.category,
          curVal: a.curVal,
          invested: a.invested,
          pnl: a.pnl,
          pnlPct: a.pnlPct,
          allocation: totalPortfolioVal > 0 ? (a.curVal / totalPortfolioVal) * 100 : 0,
        })),
        ...kiteUiAssets.map((h) => ({
          name: h.name + (h.accountLabel ? ` (${h.accountLabel})` : ""),
          category: "Stocks & ETFs",
          curVal: h.curVal,
          invested: h.invested,
          pnl: h.pnl,
          pnlPct: h.pnlPct,
          allocation: totalPortfolioVal > 0 ? (h.curVal / totalPortfolioVal) * 100 : 0,
        })),
      ];

      assetsForReport.forEach((a, idx) => {
        const row = ws1.addRow({
          name: a.name,
          category: a.category,
          curVal: a.curVal,
          invested: a.invested,
          pnl: a.pnl,
          pnlPct: parseFloat(a.pnlPct.toFixed(2)),
          allocation: parseFloat(a.allocation.toFixed(2)),
        });
        styleDataRow(row, idx);
        row.getCell("curVal").numFmt = "#,##0.00";
        row.getCell("invested").numFmt = "#,##0.00";
        row.getCell("pnl").numFmt = "#,##0.00";
        row.getCell("pnlPct").numFmt = "0.00";
        row.getCell("allocation").numFmt = "0.00";
        const pnlColor = a.pnl >= 0 ? C.GREEN : C.RED;
        row.getCell("pnl").font = { color: { argb: pnlColor } };
        row.getCell("pnlPct").font = { color: { argb: pnlColor } };
      });

      const aTotalCurVal = assetsForReport.reduce((s, a) => s + a.curVal, 0);
      const aTotalInv    = assetsForReport.reduce((s, a) => s + a.invested, 0);
      const aTotalPnl    = aTotalCurVal - aTotalInv;
      const aTotalPnlPct = aTotalInv > 0 ? (aTotalPnl / aTotalInv) * 100 : 0;

      const totRow1 = ws1.addRow({
        name: "TOTAL",
        category: `${assetsForReport.length} assets`,
        curVal: aTotalCurVal,
        invested: aTotalInv,
        pnl: aTotalPnl,
        pnlPct: parseFloat(aTotalPnlPct.toFixed(2)),
        allocation: 100,
      });
      styleTotalRow(totRow1);
      totRow1.getCell("curVal").numFmt = "#,##0.00";
      totRow1.getCell("invested").numFmt = "#,##0.00";
      totRow1.getCell("pnl").numFmt = "#,##0.00";
      totRow1.getCell("pnlPct").numFmt = "0.00";
      totRow1.getCell("allocation").numFmt = "0.00";

      // ─── SHEET 2: LIABILITIES ──────────────────────────────────
      const ws2 = workbook.addWorksheet("Liabilities", {
        views: [{ state: "frozen", xSplit: 0, ySplit: 1 }],
      });

      ws2.columns = [
        { key: "name",        width: 30, header: "Name" },
        { key: "direction",   width: 15, header: "Direction" },
        { key: "type",        width: 12, header: "Type" },
        { key: "original",    width: 22, header: "Original Amount (₹)" },
        { key: "outstanding", width: 22, header: "Outstanding (₹)" },
        { key: "currency",    width: 11, header: "Currency" },
        { key: "dueDate",     width: 14, header: "Due Date" },
        { key: "status",      width: 12, header: "Status" },
      ];

      styleHeader(ws2.getRow(1));

      const lentData = mappedAssets
        .filter((a) => a.category === "lended")
        .map((a) => ({
          name: a.name,
          direction: "You Lent",
          type: "Friend",
          original: a.invested > 0 ? a.invested : a.curVal,
          outstanding: a.curVal,
          currency: "INR",
          dueDate: "",
          status: "Active",
        }));

      const borrowedData = mappedLiabilities.map((l) => ({
        name: l.name,
        direction: "You Borrowed",
        type: l.liabilityType === "friend" ? "Friend" : "Bank",
        original: l.originalAmount,
        outstanding: l.outstandingAmount,
        currency: l.currency,
        dueDate: l.dueDate ?? "",
        status: l.status.charAt(0).toUpperCase() + l.status.slice(1),
      }));

      [...lentData, ...borrowedData].forEach((l, idx) => {
        const row = ws2.addRow(l);
        styleDataRow(row, idx);
        row.getCell("original").numFmt = "#,##0.00";
        row.getCell("outstanding").numFmt = "#,##0.00";
        row.getCell("direction").font = {
          color: { argb: l.direction === "You Lent" ? C.GREEN : C.RED },
          bold: true,
        };
        row.getCell("status").font = {
          color: { argb: l.status.toLowerCase() === "active" ? C.GREEN : C.MUTED },
        };
      });

      const lTotalOriginal    = [...lentData, ...borrowedData].reduce((s, l) => s + l.original, 0);
      const lTotalOutstanding = [...lentData, ...borrowedData].reduce((s, l) => s + l.outstanding, 0);
      const lTotalLent        = lentData.reduce((s, l) => s + l.outstanding, 0);
      const lTotalBorrowed    = borrowedData.reduce((s, l) => s + l.outstanding, 0);

      const totRow2 = ws2.addRow({
        name: "TOTAL",
        direction: `${lentData.length} lent · ${borrowedData.length} borrowed`,
        type: "",
        original: lTotalOriginal,
        outstanding: lTotalOutstanding,
        currency: "",
        dueDate: `Lent: ₹${lTotalLent.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        status: `Owed: ₹${lTotalBorrowed.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      });
      styleTotalRow(totRow2);
      totRow2.getCell("original").numFmt = "#,##0.00";
      totRow2.getCell("outstanding").numFmt = "#,##0.00";

      // ─── Download ───────────────────────────────────────────────
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `myfinance_report_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast("Report downloaded", "success");
    } catch (err) {
      console.error("Report download failed:", err);
      showToast("Failed to generate report", "error");
    }
  };

  const handleAddClick = () => {
    const limits = getLimits(profile?.plan_type);
    const premium = isPremium(profile?.plan_type);

    const showUpgrade = (context: string) => {
      if (!premium) {
        setUpgradeContext(context);
        setUpgradeModalOpen(true);
      } else {
        showToast(context, "error");
      }
    };

    if (sectionTab === "expenses") {
      const now = new Date();
      const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const thisMonthCount = expenses.filter((e) => e.month_key === currentMonthKey).length;
      if (thisMonthCount >= limits.expensesPerMonth) {
        showUpgrade(`You've reached the ${premium ? "premium" : "free"} limit of ${limits.expensesPerMonth} expenses this month.`);
        return;
      }
      setEditingExpenseId(null);
      setEditingExpenseData(null);
      setExpenseModalOpen(true);
    } else if (sectionTab === "liabilities") {
      if (liabilities.length >= limits.liabilities) {
        showUpgrade(`You've reached the ${premium ? "premium" : "free"} limit of ${limits.liabilities} liabilities.`);
        return;
      }
      setEditingLiabilityId(null);
      setEditingLiabilityData(null);
      setLiabilityModalOpen(true);
    } else {
      if (dbAssets.length >= limits.assets) {
        showUpgrade(`You've reached the ${premium ? "premium" : "free"} limit of ${limits.assets} assets.`);
        return;
      }
      setModalOpen(true);
    }
  };

  const handleAddLend = () => {
    const lims = getLimits(profile?.plan_type);
    const prem = isPremium(profile?.plan_type);
    if (dbAssets.length >= lims.assets) {
      if (!prem) { setUpgradeContext(`You've reached the ${prem ? "premium" : "free"} limit of ${lims.assets} assets.`); setUpgradeModalOpen(true); }
      else showToast(`Asset limit reached`, "error");
      return;
    }
    setEditingLendId(null);
    setEditingLendData(null);
    setLendModalOpen(true);
  };

  const handleAddBorrow = () => {
    const lims = getLimits(profile?.plan_type);
    const prem = isPremium(profile?.plan_type);
    if (liabilities.length >= lims.liabilities) {
      if (!prem) { setUpgradeContext(`You've reached the ${prem ? "premium" : "free"} limit of ${lims.liabilities} liabilities.`); setUpgradeModalOpen(true); }
      else showToast(`Liability limit reached`, "error");
      return;
    }
    setEditingLiabilityId(null);
    setEditingLiabilityData(null);
    setLiabilityModalOpen(true);
  };

  const addButton = (
    sectionTab === "liabilities" ? (
      <div className="flex items-center gap-2 shrink-0">
        <button onClick={handleAddLend} className="btn-lift flex items-center gap-1.5 h-[34px] px-3 rounded-md text-[13px] font-semibold text-white shrink-0" style={{ background: "#16A34A" }}>
          <PlusIcon /><span className="hidden sm:inline">Lend</span>
        </button>
        <button onClick={handleAddBorrow} className="btn-lift flex items-center gap-1.5 h-[34px] px-3 rounded-md text-[13px] font-semibold text-white shrink-0" style={{ background: "#DC2626" }}>
          <PlusIcon /><span className="hidden sm:inline">Borrow</span>
        </button>
      </div>
    ) : (
      <button
        onClick={handleAddClick}
        className="btn-lift flex items-center gap-1.5 h-[34px] px-3 sm:px-4 rounded-md text-[13px] sm:text-[13px] font-semibold text-white shrink-0"
        style={{ background: "#2563EB" }}
      >
        <PlusIcon />
        <span className="hidden sm:inline">
          {sectionTab === "expenses" ? "Add Expense" : "Add Asset"}
        </span>
        <span className="sm:hidden">Add</span>
      </button>
    )
  );
  const handleDelete = async (id: string) => {
    const confirmDelete = confirm("Are you sure you want to delete this asset?");
    if (!confirmDelete) return;
    const { error } = await supabase.from("assets").delete().eq("id", id).eq("user_id", userId);
    if (error) { showToast(error.message, "error"); return; }
    setDbAssets((prev) => prev.filter((item) => item.id !== id));
    await fetchAssets();
    showToast("Asset deleted successfully", "success");
    onDataChanged?.();
  };

  const getLendLogs = (assetId: string): LendLogEntry[] => {
    const asset = dbAssets.find((a) => a.id === assetId);
    if (!asset?.notes) return [];
    try {
      const p = JSON.parse(asset.notes);
      return Array.isArray(p.lendLogs) ? p.lendLogs : [];
    } catch { return []; }
  };

  const handleMarkReceived = async (amount: number, date: string, remarks: string) => {
    if (!receivingLend) return;
    const asset = dbAssets.find((a) => a.id === receivingLend.id);
    if (!asset) return;
    let parsedNotes: Record<string, unknown> = {};
    try { parsedNotes = asset.notes ? JSON.parse(asset.notes) : {}; } catch {}
    const currentValue = Number(asset.value ?? 0);
    const newValue = Math.max(0, currentValue - amount);
    const newLog: LendLogEntry = {
      date,
      amount,
      previousOutstanding: currentValue,
      newOutstanding: newValue,
      remarks: remarks || undefined,
      action_type: "received",
    };
    const updatedNotes = JSON.stringify({
      ...parsedNotes,
      originalLent: parsedNotes.originalLent ?? currentValue,
      lendLogs: [...getLendLogs(receivingLend.id), newLog],
    });
    const { error } = await supabase
      .from("assets")
      .update({ value: newValue, notes: updatedNotes })
      .eq("id", receivingLend.id)
      .eq("user_id", userId);
    if (error) { showToast(error.message, "error"); return; }
    await fetchAssets();
    setReceivedModalOpen(false);
    setReceivingLend(null);
    showToast("Payment recorded", "success");
    onDataChanged?.();
  };

  return (

    <>
    <Toast
    message={toastMessage}
    type={toastType}
    visible={toastVisible}
  />
      <PremiumUpgradeModal
        open={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        limitContext={upgradeContext}
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

      <AddLiabilityModal
  open={liabilityModalOpen}
  onClose={() => {
    setLiabilityModalOpen(false);
    setEditingLiabilityId(null);
    setEditingLiabilityData(null);
  }}
  onSave={handleSaveLiability}
  initialData={editingLiabilityData}
  mode={editingLiabilityId ? "edit" : "add"}
/>

      <AddLendModal
  open={lendModalOpen}
  onClose={() => {
    setLendModalOpen(false);
    setEditingLendId(null);
    setEditingLendData(null);
  }}
  onSave={handleSaveLend}
  initialData={editingLendData}
  mode={editingLendId ? "edit" : "add"}
/>

      <AddExpenseModal
  open={expenseModalOpen}
  onClose={() => {
    setExpenseModalOpen(false);
    setEditingExpenseId(null);
    setEditingExpenseData(null);
  }}
  onSave={handleSaveExpense}
  initialData={editingExpenseData}
  mode={editingExpenseId ? "edit" : "add"}
/>

      <RepayLiabilityModal
  open={repayModalOpen}
  onClose={() => { setRepayModalOpen(false); setRepayingLiability(null); }}
  onRepay={handleRepay}
  liabilityName={repayingLiability?.name ?? ""}
  outstanding={repayingLiability?.outstanding ?? 0}
  currency={repayingLiability?.currency ?? "INR"}
/>

      <LiabilityLogsModal
  open={logsModalOpen}
  onClose={() => { setLogsModalOpen(false); setViewingLendLogs(null); setViewingLogsLiabilityId(null); }}
  liabilityId={viewingLendLogs ? null : viewingLogsLiabilityId}
  liabilityName={viewingLogsLiabilityName}
  currency={mappedLiabilities.find((l) => l.id === viewingLogsLiabilityId)?.currency ?? "INR"}
  localLogs={viewingLendLogs ?? undefined}
/>

      <MarkReceivedModal
  open={receivedModalOpen}
  onClose={() => { setReceivedModalOpen(false); setReceivingLend(null); }}
  onReceive={handleMarkReceived}
  friendName={receivingLend?.name ?? ""}
  outstanding={receivingLend?.outstanding ?? 0}
  currency={receivingLend?.currency ?? "INR"}
/>

      <div
        className="rounded-lg overflow-hidden"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--separator)",
          boxShadow: isDark
            ? "none"
            : "0 1px 2px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.04)",
        }}
      >
        <div
          className="flex flex-col md:flex-row md:items-center md:justify-between px-4 sm:px-5 md:px-6 pt-4 sm:pt-5 pb-3 sm:pb-4 gap-3 md:gap-2"
          style={{ borderBottom: "1px solid var(--separator-subtle)" }}
        >
          <div
            className="flex items-center gap-0.5 p-[3px] rounded-lg"
            style={{
              background: isDark ? "rgba(255,255,255,0.05)" : "#F1F5F9",
              border: `1px solid var(--separator)`,
            }}
          >
            {(["assets", "liabilities", "expenses"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setSectionTab(t)}
                className="px-3 sm:px-3.5 py-1.5 rounded-md text-[12.5px] sm:text-[13px] font-semibold capitalize"
                style={{
                  background: sectionTab === t
                    ? (isDark ? "rgba(255,255,255,0.12)" : "#ffffff")
                    : "transparent",
                  color: sectionTab === t ? "var(--text-primary)" : "var(--text-tertiary)",
                  boxShadow: sectionTab === t
                    ? (isDark ? "0 1px 3px rgba(0,0,0,0.4)" : "0 1px 3px rgba(0,0,0,0.10)")
                    : "none",
                  transition: "background 150ms ease, color 150ms ease, box-shadow 150ms ease",
                }}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
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
                placeholder={sectionTab === "expenses" ? "Search expenses..." : sectionTab === "liabilities" ? "Search loans..." : "Search assets..."}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="search-glass flex-1 bg-transparent text-[14px] placeholder:text-[#aeaeb2] min-w-0"
                style={{ color: "var(--text-primary)" }}
              />
            </div>

            <button onClick={handleGlobalDownload} title="Download Full Report" className="icon-btn hidden md:flex w-[34px] h-[34px] items-center justify-center rounded-[10px] text-[#aeaeb2] hover:text-[#1d1d1f] hover:bg-black/5">
              <DownloadIcon />
            </button>

            {addButton}
          </div>
        </div>

        {sectionTab === "assets" && (
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
                className="shrink-0 px-3 sm:px-3.5 py-1 sm:py-1.5 rounded-md text-[12.5px] sm:text-[13px] font-medium"
                style={{
                  background: isActive
                    ? isDark ? "rgba(255,255,255,0.10)" : "#0F172A"
                    : "transparent",
                  color: isActive ? "#ffffff" : "var(--text-secondary)",
                  transition: "background 150ms ease, color 150ms ease",
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
        )}


        {/* Expense: month selector row */}
        {sectionTab === "expenses" && (
          <div
            className="flex items-center gap-1 sm:gap-1.5 px-4 sm:px-5 md:px-6 py-2.5 sm:py-3 overflow-x-auto scrollbar-hide"
            style={{ borderBottom: "1px solid var(--separator-subtle)" }}
          >
            {getMonthOptions().map((m) => {
              const isActive = expenseMonthKey === m.key;
              return (
                <button
                  key={m.key}
                  onClick={() => setExpenseMonthKey(m.key)}
                  className="shrink-0 px-3 sm:px-3.5 py-1 sm:py-1.5 rounded-md text-[12.5px] sm:text-[13px] font-medium"
                  style={{
                    background: isActive ? (isDark ? "rgba(255,255,255,0.10)" : "#0F172A") : "transparent",
                    color: isActive ? "#ffffff" : "var(--text-secondary)",
                    transition: "background 150ms ease, color 150ms ease",
                  }}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Expense: category + quick filter chips */}
        {sectionTab === "expenses" && (
          <div
            className="flex items-center gap-1 sm:gap-1.5 px-4 sm:px-5 md:px-6 py-2 overflow-x-auto scrollbar-hide"
            style={{ borderBottom: "1px solid var(--separator-subtle)" }}
          >
            {/* Category chips */}
            {["all", ...EXPENSE_CATEGORIES].map((cat) => {
              const isActive = expenseCategoryFilter === cat;
              const label = cat === "all" ? "All" : cat;
              return (
                <button
                  key={cat}
                  onClick={() => setExpenseCategoryFilter(cat)}
                  className="shrink-0 px-2.5 py-1 rounded-full text-[12px] font-medium"
                  style={{
                    background: isActive ? (isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)") : "transparent",
                    color: isActive ? "var(--text-primary)" : "var(--text-tertiary)",
                    border: "1px solid transparent",
                    transition: "background 180ms ease-out, color 180ms ease-out",
                  }}
                >
                  {label}
                </button>
              );
            })}
            {/* Divider */}
            <div className="w-px h-4 shrink-0 mx-1" style={{ background: "var(--separator)" }} />
            {/* Quick filters */}
            {([
              { key: "claim", label: "Claim Eligible", color: "#2563EB" },
              { key: "splitwise", label: "SW Pending", color: "#D97706" },
            ] as const).map((qf) => {
              const isActive = expenseQuickFilter === qf.key;
              return (
                <button
                  key={qf.key}
                  onClick={() => setExpenseQuickFilter(isActive ? "all" : qf.key)}
                  className="shrink-0 px-2.5 py-1 rounded-full text-[12px] font-medium"
                  style={{
                    background: isActive ? `${qf.color}20` : "transparent",
                    color: isActive ? qf.color : "var(--text-tertiary)",
                    border: isActive ? `1px solid ${qf.color}40` : "1px solid transparent",
                    transition: "background 180ms ease-out, color 180ms ease-out",
                  }}
                >
                  {qf.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Desktop-only inline summary — always visible above the table */}
        {(() => {
          const kiteForTab = kiteUiAssets.filter((a) => activeTab === "all" || a.category === activeTab);
          const kiteInv = kiteForTab.reduce((s, a) => s + a.invested, 0);
          const kiteCur = kiteForTab.reduce((s, a) => s + a.curVal, 0);
          const kitePnl = kiteForTab.reduce((s, a) => s + a.pnl, 0);
          const inv  = filtered.reduce((s, a) => s + a.invested, 0) + kiteInv;
          const cur  = filtered.reduce((s, a) => s + a.curVal, 0) + kiteCur;
          // Sum individual pnl values so bank/cash (pnl=0) don't inflate P&L
          const pnl  = filtered.reduce((s, a) => s + a.pnl, 0) + kitePnl;
          const pct  = inv > 0 ? (pnl / inv) * 100 : 0;
          const expTotal = filteredExpenses.reduce((s, e) => s + e.amount, 0);
          const expClaim = filteredExpenses.filter((e) => e.claim_eligible).reduce((s, e) => s + e.amount, 0);
          const expSW    = filteredExpenses.filter((e) => e.splitwise_applicable && !e.splitwise_added).reduce((s, e) => s + e.amount, 0);
          const sep = <div className="w-px h-6 shrink-0" style={{ background: "var(--separator)" }} />;
          return (
            <div
              className="hidden md:flex items-center gap-5 px-6 py-3"
              style={{ borderBottom: "1px solid var(--separator-subtle)", background: "var(--surface-secondary)" }}
            >
              {sectionTab === "assets" && (<>
                <div>
                  <p className="text-[9.5px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Cur. Value</p>
                  <p className="text-[19px] font-bold" style={{ color: "var(--text-primary)", letterSpacing: "-0.025em" }}>{fmtINR(cur)}</p>
                </div>
                {sep}
                <div>
                  <p className="text-[9.5px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>P&L</p>
                  <p className="text-[19px] font-bold" style={{ color: pnl >= 0 ? "#16A34A" : "#DC2626", letterSpacing: "-0.025em" }}>
                    {pnl >= 0 ? "+" : ""}{fmtINR(pnl)}
                    <span className="text-[13px] font-medium ml-1.5" style={{ opacity: 0.7 }}>({pct >= 0 ? "+" : ""}{pct.toFixed(2)}%)</span>
                  </p>
                </div>
              </>)}
              {sectionTab === "liabilities" && (() => {
                const lentTotal     = filteredAllLent.reduce((s, f) => s + f.amount, 0);
                const borrowedTotal = filteredAllBorrowed.filter((l) => l.status === "active").reduce((s, l) => s + l.outstandingAmount, 0);
                const net = lentTotal - borrowedTotal;
                return (<>
                  <div>
                    <p className="text-[9.5px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>You Lent</p>
                    <p className="text-[19px] font-bold" style={{ color: "#16A34A", letterSpacing: "-0.025em" }}>+{fmtINR(lentTotal)}</p>
                  </div>
                  {sep}
                  <div>
                    <p className="text-[9.5px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>You Borrowed</p>
                    <p className="text-[19px] font-bold" style={{ color: "#DC2626", letterSpacing: "-0.025em" }}>-{fmtINR(borrowedTotal)}</p>
                  </div>
                  {sep}
                  <div>
                    <p className="text-[9.5px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Net</p>
                    <p className="text-[19px] font-bold" style={{ color: net >= 0 ? "#16A34A" : "#DC2626", letterSpacing: "-0.025em" }}>{net >= 0 ? "+" : ""}{fmtINR(net)}</p>
                  </div>
                </>);
              })()}
              {sectionTab === "expenses" && (<>
                <div>
                  <p className="text-[9.5px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Total Spent</p>
                  <p className="text-[19px] font-bold" style={{ color: "var(--text-primary)", letterSpacing: "-0.025em" }}>{fmtINR(expTotal)}</p>
                </div>
                {sep}
                <div>
                  <p className="text-[9.5px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Claim Eligible</p>
                  <p className="text-[19px] font-bold" style={{ color: "#2563EB", letterSpacing: "-0.025em" }}>{fmtINR(expClaim)}</p>
                </div>
                {sep}
                <div>
                  <p className="text-[9.5px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>SW Pending</p>
                  <p className="text-[19px] font-bold" style={{ color: "#D97706", letterSpacing: "-0.025em" }}>{fmtINR(expSW)}</p>
                </div>
                {sep}
                <div>
                  <p className="text-[9.5px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Count</p>
                  <p className="text-[19px] font-bold" style={{ color: "var(--text-primary)", letterSpacing: "-0.025em" }}>{filteredExpenses.length}</p>
                </div>
              </>)}
            </div>
          );
        })()}

        {sectionTab === "assets" && (<>
        {activeTab === "all" ? (<>
          {/* ── Grouped-by-category view — collapsible sections instead of one long flat list ── */}
          <div className="md:hidden">
            {groupedAssets.map((group) => {
              const expanded = isGroupExpanded(group.category);
              return (
                <div key={group.category}>
                  <button
                    onClick={() => toggleGroup(group.category)}
                    className="w-full flex items-center justify-between gap-3 px-4 sm:px-5 py-3"
                    style={{ background: "var(--surface-secondary)", borderBottom: "1px solid var(--separator-subtle)" }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <AssetIcon type={group.category} isDark={isDark} />
                      <div className="text-left min-w-0">
                        <p className="text-[14.5px] font-bold truncate" style={{ color: "var(--text-primary)" }}>{group.label}</p>
                        <p className="text-[11.5px]" style={{ color: "var(--text-tertiary)" }}>{group.count} asset{group.count !== 1 ? "s" : ""}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                      <div className="text-right">
                        <p className="text-[14px] font-bold" style={{ color: "var(--text-primary)" }}>{fmtINRFull(group.curVal)}</p>
                        {group.invested > 0 && (
                          <p className="text-[11px] font-semibold" style={{ color: group.pnl >= 0 ? "#16A34A" : "#DC2626" }}>
                            {group.pnl >= 0 ? "+" : ""}{group.pnlPct.toFixed(2)}%
                          </p>
                        )}
                      </div>
                      <span style={{ color: "var(--text-tertiary)" }}><ChevronIcon expanded={expanded} /></span>
                    </div>
                  </button>

                  {expanded && (
                    <div>
                      {group.items.map((asset, idx) => (
                        <AssetMobileCard
                          key={asset.id}
                          asset={asset}
                          isDark={isDark}
                          isLast={idx === group.items.length - 1 && !group.kiteRow}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                        />
                      ))}
                      {group.kiteRow && <KiteMobileCard row={group.kiteRow} isDark={isDark} isLast />}
                    </div>
                  )}
                </div>
              );
            })}

            {groupedAssets.length === 0 && <EmptyAssetsState />}
          </div>

          <div className="hidden md:block" style={{ overflowX: "auto", overflowY: "auto", maxHeight: "calc(100dvh - 280px)" }}>
            {groupedAssets.map((group) => {
              const expanded = isGroupExpanded(group.category);
              return (
                <div key={group.category}>
                  <button
                    onClick={() => toggleGroup(group.category)}
                    className="w-full flex items-center justify-between gap-4 px-6 py-3"
                    style={{ background: "var(--surface-secondary)", borderBottom: "1px solid var(--separator-subtle)" }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <ChevronIcon expanded={expanded} />
                      <AssetIcon type={group.category} isDark={isDark} />
                      <p className="text-[14px] font-bold" style={{ color: "var(--text-primary)" }}>{group.label}</p>
                      <span className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>{group.count} asset{group.count !== 1 ? "s" : ""}</span>
                    </div>
                    <div className="flex items-center gap-6">
                      <span className="text-[14px] font-bold" style={{ color: "var(--text-primary)" }}>{fmtINRFull(group.curVal)}</span>
                      {group.invested > 0 && (
                        <span className="text-[13px] font-semibold w-16 text-right" style={{ color: group.pnl >= 0 ? "#16A34A" : "#DC2626" }}>
                          {group.pnl >= 0 ? "+" : ""}{group.pnlPct.toFixed(2)}%
                        </span>
                      )}
                    </div>
                  </button>

                  {expanded && (
                    <table className="w-full">
                      <tbody>
                        {group.items.map((asset, idx) => (
                          <AssetDesktopRow
                            key={asset.id}
                            asset={asset}
                            isDark={isDark}
                            isLast={idx === group.items.length - 1 && !group.kiteRow}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                          />
                        ))}
                        {group.kiteRow && <KiteDesktopRow row={group.kiteRow} isDark={isDark} isLast />}
                      </tbody>
                    </table>
                  )}
                </div>
              );
            })}

            {groupedAssets.length === 0 && <EmptyAssetsState />}
          </div>
        </>) : (<>
          {/* ── Flat list — single category already keeps this short ── */}
          <div className="md:hidden">
            {filtered.map((asset, idx) => (
              <AssetMobileCard
                key={asset.id}
                asset={asset}
                isDark={isDark}
                isLast={idx === filtered.length - 1 && visibleKiteGroupedRows.length === 0}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}

            {/* Kite holdings — always one aggregated row per category, never individual stocks */}
            {visibleKiteGroupedRows.map((row, idx) => (
              <KiteMobileCard key={row.id} row={row} isDark={isDark} isLast={idx === visibleKiteGroupedRows.length - 1} />
            ))}

            {filtered.length === 0 && visibleKiteGroupedRows.length === 0 && <EmptyAssetsState />}
          </div>

          <div className="hidden md:block" style={{ overflowX: "auto", overflowY: "auto", maxHeight: "calc(100dvh - 280px)" }}>
            <table className="w-full">
              <thead style={{
                position: "sticky",
                top: 0,
                zIndex: 10,
                boxShadow: isDark
                  ? "0 1px 0 rgba(255,255,255,0.07), 0 4px 20px rgba(0,0,0,0.4)"
                  : "0 1px 0 rgba(0,0,0,0.07), 0 4px 16px rgba(0,0,0,0.06)",
              }}>
                <tr>
                  <th
                    className="py-3.5 pl-6 pr-4 text-left text-[11px] font-semibold uppercase"
                    style={{ color: "var(--text-tertiary)", letterSpacing: "0.08em", whiteSpace: "nowrap", background: "var(--surface)" }}
                  >
                    ASSET NAME
                  </th>
                  {(
                    [
                      { label: "CUR. VAL", key: "curVal" as const, pad: "px-4" },
                      { label: "P&L", key: "pnl" as const, pad: "px-4" },
                    ] as const
                  ).map((col) => {
                    const isActive = sortKey === col.key;
                    return (
                      <th
                        key={col.key}
                        className={`py-3.5 ${col.pad} text-right text-[11px] font-semibold uppercase cursor-pointer select-none`}
                        style={{ color: isActive ? "var(--text-primary)" : "var(--text-tertiary)", letterSpacing: "0.08em", whiteSpace: "nowrap", background: "var(--surface)" }}
                        onClick={() => handleSort(col.key)}
                      >
                        <span className="inline-flex items-center justify-end gap-1">
                          {col.label}
                          <span style={{ opacity: isActive ? 1 : 0.35, fontSize: 9 }}>
                            {isActive && sortDir === "asc" ? "▲" : "▼"}
                          </span>
                        </span>
                      </th>
                    );
                  })}
                  <th
                    className="py-3.5 pr-6 pl-4 text-right text-[11px] font-semibold uppercase"
                    style={{ color: "var(--text-tertiary)", letterSpacing: "0.08em", whiteSpace: "nowrap", background: "var(--surface)" }}
                  >
                    % ALLOC.
                  </th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((asset, idx) => (
                  <AssetDesktopRow
                    key={asset.id}
                    asset={asset}
                    isDark={isDark}
                    isLast={idx === filtered.length - 1 && visibleKiteGroupedRows.length === 0}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}

                {/* Kite holdings — always one aggregated row per category, never individual stocks */}
                {visibleKiteGroupedRows.map((row, idx) => (
                  <KiteDesktopRow key={row.id} row={row} isDark={isDark} isLast={idx === visibleKiteGroupedRows.length - 1} />
                ))}
              </tbody>
            </table>

            {filtered.length === 0 && visibleKiteGroupedRows.length === 0 && <EmptyAssetsState />}
          </div>
        </>)}
        </>)}

        {sectionTab === "liabilities" && (() => {
          const openEditLiab = (id: string) => {
            const raw = liabilities.find((x) => x.id === id);
            if (!raw) return;
            setEditingLiabilityId(id);
            setEditingLiabilityData({ lender_name: raw.lender_name, lender_type: raw.lender_type, liability_name: raw.liability_name || "", original_amount: String(raw.original_amount ?? ""), outstanding_amount: String(raw.outstanding_amount ?? ""), currency: raw.currency || "INR", borrowed_date: raw.borrowed_date || "", due_date: raw.due_date || "", notes: raw.notes || "" });
            setLiabilityModalOpen(true);
          };
          const sectionHeader = (label: string, color: string) => (
            <div className="px-4 sm:px-5 md:px-6 py-1.5 flex items-center gap-2" style={{ borderBottom: "1px solid var(--separator-subtle)", background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.015)" }}>
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color }}>{label}</span>
            </div>
          );
          const isEmpty = filteredAllLent.length === 0 && filteredAllBorrowed.length === 0;
          return (<>
            {/* ── MOBILE ── */}
            <div className="md:hidden">
              {filteredAllLent.length > 0 && (<>
                {sectionHeader("You Lent", "#16A34A")}
                {filteredAllLent.map((f, idx) => {
                  const isLast = idx === filteredAllLent.length - 1 && filteredAllBorrowed.length === 0;
                  return (
                    <div key={f.id} className="px-4 sm:px-5 py-4" style={{ borderBottom: isLast ? "none" : "1px solid var(--separator-subtle)" }}>
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-[16px] font-bold truncate" style={{ color: "var(--text-primary)", letterSpacing: "-0.02em" }}>{f.name}</p>
                        <p className="text-[17px] font-bold shrink-0" style={{ color: "#16A34A", letterSpacing: "-0.02em" }}>+{fmtAmt(f.amount, f.currency)}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-3 pt-3" style={{ borderTop: "1px solid var(--separator-subtle)" }}>
                        <button onClick={() => { const a = mappedAssets.find((a) => a.id === f.id); if (a) openEditLend(a); }} className="flex items-center gap-1 h-7 px-2.5 rounded-[8px] text-[12px] font-medium" style={{ color: "var(--text-secondary)", background: "var(--surface-secondary)" }}><EditIcon /> Edit</button>
                        {f.amount > 0 && <button onClick={() => { setReceivingLend({ id: f.id, name: f.name, outstanding: f.amount, currency: f.currency }); setReceivedModalOpen(true); }} className="flex items-center gap-1 h-7 px-2.5 rounded-[8px] text-[12px] font-semibold" style={{ color: "#16A34A", background: "rgba(52,199,89,0.1)" }}>Received</button>}
                        <button onClick={() => { setViewingLendLogs(getLendLogs(f.id)); setViewingLogsLiabilityName(f.name); setLogsModalOpen(true); }} className="flex items-center gap-1 h-7 px-2.5 rounded-[8px] text-[12px] font-medium" style={{ color: "var(--text-secondary)", background: "var(--surface-secondary)" }}>Logs</button>
                        <button onClick={() => handleDelete(f.id)} className="icon-btn ml-auto w-7 h-7 flex items-center justify-center rounded-[8px]" style={{ color: "var(--text-tertiary)" }} onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#DC2626")} onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-tertiary)")}><TrashIcon /></button>
                      </div>
                    </div>
                  );
                })}
              </>)}

              {filteredAllBorrowed.length > 0 && (<>
                {sectionHeader("You Borrowed", "#DC2626")}
                {filteredAllBorrowed.map((l, idx) => {
                  const isLast = idx === filteredAllBorrowed.length - 1;
                  return (
                    <div key={l.id} className="px-4 sm:px-5 py-4" style={{ borderBottom: isLast ? "none" : "1px solid var(--separator-subtle)" }}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[16px] font-bold truncate" style={{ color: "var(--text-primary)", letterSpacing: "-0.02em" }}>{l.lenderName}</p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <StatusBadge status={l.status} />
                            {daysSince(l.borrowedDate) != null && <span className="text-[12px] font-semibold" style={{ color: "var(--text-tertiary)" }}>{daysSince(l.borrowedDate)}d ago</span>}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[17px] font-bold" style={{ color: "#DC2626", letterSpacing: "-0.02em" }}>{fmtAmt(l.outstandingAmount, l.currency)}</p>
                          {l.outstandingAmount !== l.originalAmount && <p className="text-[12px] mt-0.5 font-medium" style={{ color: "var(--text-tertiary)" }}>of {fmtAmt(l.originalAmount, l.currency)}</p>}
                        </div>
                      </div>
                      {(l.borrowedDate || l.dueDate) && (
                        <div className="flex items-center gap-4 mt-2">
                          {l.borrowedDate && <div><p className="text-[10px] uppercase font-semibold" style={{ color: "var(--text-tertiary)", letterSpacing: "0.07em" }}>Date</p><p className="text-[13px] font-medium" style={{ color: "var(--text-secondary)" }}>{fmtDate(l.borrowedDate)}</p></div>}
                          {l.dueDate && <div><p className="text-[10px] uppercase font-semibold" style={{ color: "var(--text-tertiary)", letterSpacing: "0.07em" }}>Due</p><p className="text-[13px] font-medium" style={{ color: "var(--text-secondary)" }}>{fmtDate(l.dueDate)}</p></div>}
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-3 pt-3" style={{ borderTop: "1px solid var(--separator-subtle)" }}>
                        <button onClick={() => openEditLiab(l.id)} className="flex items-center gap-1 h-7 px-2.5 rounded-[8px] text-[12px] font-medium" style={{ color: "var(--text-secondary)", background: "var(--surface-secondary)" }}><EditIcon /> Edit</button>
                        {l.status === "active" && <button onClick={() => { setRepayingLiability({ id: l.id, name: l.lenderName, outstanding: l.outstandingAmount, currency: l.currency }); setRepayModalOpen(true); }} className="flex items-center gap-1 h-7 px-2.5 rounded-[8px] text-[12px] font-semibold" style={{ color: "#16A34A", background: "rgba(52,199,89,0.1)" }}>Repay</button>}
                        <button onClick={() => { setViewingLendLogs(null); setViewingLogsLiabilityId(l.id); setViewingLogsLiabilityName(l.lenderName); setLogsModalOpen(true); }} className="flex items-center gap-1 h-7 px-2.5 rounded-[8px] text-[12px] font-medium" style={{ color: "var(--text-secondary)", background: "var(--surface-secondary)" }}>Logs</button>
                        <button onClick={() => handleDeleteLiability(l.id)} className="icon-btn ml-auto w-7 h-7 flex items-center justify-center rounded-[8px]" style={{ color: "var(--text-tertiary)" }} onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#DC2626")} onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-tertiary)")}><TrashIcon /></button>
                      </div>
                    </div>
                  );
                })}
              </>)}

              {isEmpty && (
                <div className="py-16 flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-[22px]" style={{ background: "var(--surface-secondary)" }}>🤝</div>
                  <p className="text-[15px] font-semibold mt-1" style={{ color: "var(--text-primary)" }}>No loans yet</p>
                  <p className="text-[13px]" style={{ color: "var(--text-tertiary)" }}>Track money you lent or borrowed</p>
                </div>
              )}
            </div>

            {/* ── DESKTOP ── */}
            <div className="hidden md:block" style={{ overflowX: "auto", overflowY: "auto", maxHeight: "calc(100dvh - 280px)" }}>
              {/* You Lent */}
              {filteredAllLent.length > 0 && (<>
                {sectionHeader("You Lent", "#16A34A")}
                <table className="w-full">
                  <thead style={{ position: "sticky", top: 0, zIndex: 10, boxShadow: isDark ? "0 1px 0 rgba(255,255,255,0.07)" : "0 1px 0 rgba(0,0,0,0.07)" }}>
                    <tr>
                      <th className="py-3 pl-6 pr-4 text-left text-[11px] font-semibold uppercase" style={{ color: "var(--text-tertiary)", letterSpacing: "0.08em", whiteSpace: "nowrap", background: "var(--surface)" }}>NAME</th>
                      <th className="py-3 px-4 text-right text-[11px] font-semibold uppercase" style={{ color: "var(--text-tertiary)", letterSpacing: "0.08em", whiteSpace: "nowrap", background: "var(--surface)" }}>AMOUNT OWED</th>
                      <th className="py-3 pr-6 pl-4 text-right text-[11px] font-semibold uppercase" style={{ color: "var(--text-tertiary)", letterSpacing: "0.08em", whiteSpace: "nowrap", background: "var(--surface)" }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAllLent.map((f, idx) => (
                      <tr key={f.id} style={{ borderBottom: idx === filteredAllLent.length - 1 ? "none" : "1px solid var(--separator-subtle)" }} onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--row-hover)"; }} onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                        <td className="pl-6 pr-4 py-4"><p className="text-[15px] font-bold" style={{ color: "var(--text-primary)", letterSpacing: "-0.02em" }}>{f.name}</p></td>
                        <td className="px-4 py-4 text-right"><span className="text-[15px] font-bold" style={{ color: "#16A34A", letterSpacing: "-0.01em" }}>+{fmtAmt(f.amount, f.currency)}</span></td>
                        <td className="pr-6 pl-4 py-4"><div className="flex items-center justify-end gap-1.5">
                          <button onClick={() => { const a = mappedAssets.find((a) => a.id === f.id); if (a) openEditLend(a); }} className="icon-btn w-6 h-6 flex items-center justify-center rounded-md" style={{ color: "var(--text-tertiary)" }} title="Edit"><EditIcon /></button>
                          {f.amount > 0 && <button onClick={() => { setReceivingLend({ id: f.id, name: f.name, outstanding: f.amount, currency: f.currency }); setReceivedModalOpen(true); }} className="h-6 px-2 rounded-[6px] text-[11px] font-semibold" style={{ color: "#16A34A", background: "rgba(52,199,89,0.1)" }}>Received</button>}
                          <button onClick={() => { setViewingLendLogs(getLendLogs(f.id)); setViewingLogsLiabilityName(f.name); setLogsModalOpen(true); }} className="h-6 px-2 rounded-[6px] text-[11px] font-semibold" style={{ color: "var(--text-tertiary)", background: "var(--surface-secondary)" }}>Logs</button>
                          <button onClick={() => handleDelete(f.id)} className="icon-btn w-6 h-6 flex items-center justify-center rounded-md" style={{ color: "var(--text-tertiary)" }} onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#DC2626")} onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-tertiary)")}><TrashIcon /></button>
                        </div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>)}

              {/* You Borrowed */}
              {filteredAllBorrowed.length > 0 && (<>
                {sectionHeader("You Borrowed", "#DC2626")}
                <table className="w-full">
                  <thead style={{ position: "sticky", top: 0, zIndex: 10, boxShadow: isDark ? "0 1px 0 rgba(255,255,255,0.07)" : "0 1px 0 rgba(0,0,0,0.07)" }}>
                    <tr>
                      <th className="py-3 pl-6 pr-4 text-left text-[11px] font-semibold uppercase" style={{ color: "var(--text-tertiary)", letterSpacing: "0.08em", whiteSpace: "nowrap", background: "var(--surface)" }}>NAME</th>
                      <th className="py-3 px-4 text-right text-[11px] font-semibold uppercase" style={{ color: "var(--text-tertiary)", letterSpacing: "0.08em", whiteSpace: "nowrap", background: "var(--surface)" }}>OUTSTANDING</th>
                      <th className="py-3 px-4 text-left text-[11px] font-semibold uppercase" style={{ color: "var(--text-tertiary)", letterSpacing: "0.08em", whiteSpace: "nowrap", background: "var(--surface)" }}>DATE</th>
                      <th className="py-3 px-4 text-left text-[11px] font-semibold uppercase" style={{ color: "var(--text-tertiary)", letterSpacing: "0.08em", whiteSpace: "nowrap", background: "var(--surface)" }}>DUE</th>
                      <th className="py-3 px-4 text-left text-[11px] font-semibold uppercase" style={{ color: "var(--text-tertiary)", letterSpacing: "0.08em", whiteSpace: "nowrap", background: "var(--surface)" }}>STATUS</th>
                      <th className="py-3 pr-6 pl-4 text-right text-[11px] font-semibold uppercase" style={{ color: "var(--text-tertiary)", letterSpacing: "0.08em", whiteSpace: "nowrap", background: "var(--surface)" }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAllBorrowed.map((l, idx) => (
                      <tr key={l.id} style={{ borderBottom: idx === filteredAllBorrowed.length - 1 ? "none" : "1px solid var(--separator-subtle)" }} onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--row-hover)"; }} onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                        <td className="pl-6 pr-4 py-4"><p className="text-[15px] font-bold" style={{ color: "var(--text-primary)", letterSpacing: "-0.02em" }}>{l.lenderName}</p></td>
                        <td className="px-4 py-4 text-right">
                          <span className="text-[15px] font-bold" style={{ color: "#DC2626", letterSpacing: "-0.01em" }}>{fmtAmt(l.outstandingAmount, l.currency)}</span>
                          {l.outstandingAmount !== l.originalAmount && <p className="text-[12px] mt-0.5 font-medium" style={{ color: "var(--text-tertiary)" }}>of {fmtAmt(l.originalAmount, l.currency)}</p>}
                        </td>
                        <td className="px-4 py-4 text-[14px] font-medium" style={{ color: "var(--text-secondary)", whiteSpace: "nowrap" }}>{fmtDate(l.borrowedDate)}</td>
                        <td className="px-4 py-4 text-[14px] font-medium" style={{ color: "var(--text-secondary)", whiteSpace: "nowrap" }}>{fmtDate(l.dueDate)}</td>
                        <td className="px-4 py-4"><StatusBadge status={l.status} /></td>
                        <td className="pr-6 pl-4 py-4"><div className="flex items-center justify-end gap-1.5">
                          <button onClick={() => openEditLiab(l.id)} className="icon-btn w-6 h-6 flex items-center justify-center rounded-md" style={{ color: "var(--text-tertiary)" }} title="Edit"><EditIcon /></button>
                          {l.status === "active" && <button onClick={() => { setRepayingLiability({ id: l.id, name: l.lenderName, outstanding: l.outstandingAmount, currency: l.currency }); setRepayModalOpen(true); }} className="h-6 px-2 rounded-[6px] text-[11px] font-semibold" style={{ color: "#16A34A", background: "rgba(52,199,89,0.1)" }}>Repay</button>}
                          <button onClick={() => { setViewingLendLogs(null); setViewingLogsLiabilityId(l.id); setViewingLogsLiabilityName(l.lenderName); setLogsModalOpen(true); }} className="h-6 px-2 rounded-[6px] text-[11px] font-semibold" style={{ color: "var(--text-tertiary)", background: "var(--surface-secondary)" }}>Logs</button>
                          <button onClick={() => handleDeleteLiability(l.id)} className="icon-btn w-6 h-6 flex items-center justify-center rounded-md" style={{ color: "var(--text-tertiary)" }} onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#DC2626")} onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-tertiary)")}><TrashIcon /></button>
                        </div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>)}

              {isEmpty && (
                <div className="py-16 flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-[22px]" style={{ background: "var(--surface-secondary)" }}>🤝</div>
                  <p className="text-[15px] font-semibold mt-1" style={{ color: "var(--text-primary)" }}>No loans yet</p>
                  <p className="text-[13px]" style={{ color: "var(--text-tertiary)" }}>Track money you lent or borrowed</p>
                </div>
              )}
            </div>
          </>);
        })()}

        {/* ── EXPENSES ── */}
        {sectionTab === "expenses" && (<>

          {/* Mobile expense cards */}
          <div className="md:hidden">
            {filteredExpenses.map((e, idx) => {
              const isLast = idx === filteredExpenses.length - 1;
              const meta = getExpenseCategoryMeta(e.category);
              const { sarAmount: mSar } = parseExpenseNotes(e.notes);
              return (
                <div
                  key={e.id}
                  className="px-4 sm:px-5 py-4"
                  style={{ borderBottom: isLast ? "none" : "1px solid var(--separator-subtle)" }}
                >
                  {/* Row 1: title + amount */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-md flex items-center justify-center shrink-0 mt-0.5" style={{ background: meta.bg, color: meta.color }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"/><path d="M7 7h.01"/></svg>
                      </div>
                      <div className="min-w-0">
                      <p className="text-[16px] font-bold truncate" style={{ color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
                        {e.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium" style={{ color: meta.color }}>
                          <span className="w-[5px] h-[5px] rounded-full shrink-0" style={{ background: meta.color }} />
                          {e.category.toUpperCase()}
                        </span>
                        <span className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>{fmtDate(e.expense_date)}</span>
                      </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[18px] font-bold" style={{ color: "var(--text-primary)", letterSpacing: "-0.025em" }}>
                        ₹{e.amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      {mSar !== null && (
                        <p className="text-[12px] font-medium" style={{ color: "var(--text-tertiary)" }}>﷼{mSar.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      )}
                    </div>
                  </div>

                  {/* Row 2: flags */}
                  {(e.claim_eligible || e.splitwise_applicable) && (
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      {e.claim_eligible && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
                          style={{
                            background: e.claim_submitted ? "rgba(52,199,89,0.12)" : "rgba(0,122,255,0.1)",
                            color: e.claim_submitted ? "#16A34A" : "#2563EB",
                          }}>
                          {e.claim_submitted ? "✓ Claimed" : "Claim Pending"}
                        </span>
                      )}
                      {e.splitwise_applicable && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
                          style={{
                            background: e.splitwise_added ? "rgba(52,199,89,0.12)" : "rgba(255,149,0,0.1)",
                            color: e.splitwise_added ? "#16A34A" : "#D97706",
                          }}>
                          {e.splitwise_added ? "✓ SW Done" : "SW Pending"}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Row 3: actions */}
                  <div className="flex items-center gap-2 mt-3 pt-3" style={{ borderTop: "1px solid var(--separator-subtle)" }}>
                    <button onClick={() => openEditExpense(e)}
                      className="flex items-center gap-1 h-7 px-2.5 rounded-[8px] text-[12px] font-medium"
                      style={{ color: "var(--text-secondary)", background: "var(--surface-secondary)" }}>
                      <EditIcon /> Edit
                    </button>
                    <button onClick={() => handleDeleteExpense(e.id)}
                      className="icon-btn ml-auto w-7 h-7 flex items-center justify-center rounded-[8px]"
                      style={{ color: "var(--text-tertiary)" }}
                      onMouseEnter={(ev) => ((ev.currentTarget as HTMLElement).style.color = "#DC2626")}
                      onMouseLeave={(ev) => ((ev.currentTarget as HTMLElement).style.color = "var(--text-tertiary)")}>
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              );
            })}
            {filteredExpenses.length === 0 && (
              <div className="py-16 flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-[22px]" style={{ background: "var(--surface-secondary)" }}>🧾</div>
                <p className="text-[15px] font-semibold mt-1" style={{ color: "var(--text-primary)" }}>No expenses this month</p>
                <p className="text-[13px]" style={{ color: "var(--text-tertiary)" }}>Tap "Add Expense" to log one</p>
              </div>
            )}
          </div>

          {/* Desktop expense table */}
          <div className="hidden md:block" style={{ overflowX: "auto", overflowY: "auto", maxHeight: "calc(100dvh - 280px)" }}>
            <table className="w-full">
              <thead style={{
                position: "sticky", top: 0, zIndex: 10,
                boxShadow: isDark
                  ? "0 1px 0 rgba(255,255,255,0.07), 0 4px 20px rgba(0,0,0,0.4)"
                  : "0 1px 0 rgba(0,0,0,0.07), 0 4px 16px rgba(0,0,0,0.06)",
              }}>
                <tr>
                  <th className="py-3.5 pl-6 pr-4 text-left text-[11px] font-semibold uppercase" style={{ color: "var(--text-tertiary)", letterSpacing: "0.08em", whiteSpace: "nowrap", background: "var(--surface)" }}>EXPENSE</th>
                  <th className="py-3.5 px-4 text-left text-[11px] font-semibold uppercase" style={{ color: "var(--text-tertiary)", letterSpacing: "0.08em", whiteSpace: "nowrap", background: "var(--surface)" }}>DATE</th>
                  <th className="py-3.5 px-4 text-right text-[11px] font-semibold uppercase" style={{ color: "var(--text-tertiary)", letterSpacing: "0.08em", whiteSpace: "nowrap", background: "var(--surface)" }}>AMOUNT</th>
                  <th className="py-3.5 px-4 text-left text-[11px] font-semibold uppercase" style={{ color: "var(--text-tertiary)", letterSpacing: "0.08em", whiteSpace: "nowrap", background: "var(--surface)" }}>CLAIM</th>
                  <th className="py-3.5 px-4 text-left text-[11px] font-semibold uppercase" style={{ color: "var(--text-tertiary)", letterSpacing: "0.08em", whiteSpace: "nowrap", background: "var(--surface)" }}>SPLITWISE</th>
                  <th className="py-3.5 pr-6 pl-4 text-right text-[11px] font-semibold uppercase" style={{ color: "var(--text-tertiary)", letterSpacing: "0.08em", whiteSpace: "nowrap", background: "var(--surface)" }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map((e, idx) => {
                  const isLast = idx === filteredExpenses.length - 1;
                  const meta = getExpenseCategoryMeta(e.category);
                  const { sarAmount: dSar } = parseExpenseNotes(e.notes);
                  return (
                    <tr key={e.id}
                      style={{ borderBottom: isLast ? "none" : "1px solid var(--separator-subtle)" }}
                      onMouseEnter={(ev) => { (ev.currentTarget as HTMLElement).style.background = "var(--row-hover)"; }}
                      onMouseLeave={(ev) => { (ev.currentTarget as HTMLElement).style.background = "transparent"; }}
                    >
                      <td className="pl-6 pr-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-md flex items-center justify-center shrink-0" style={{ background: meta.bg, color: meta.color }}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"/><path d="M7 7h.01"/></svg>
                          </div>
                          <div>
                            <p className="text-[15px] font-bold" style={{ color: "var(--text-primary)", letterSpacing: "-0.02em" }}>{e.title}</p>
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium mt-0.5" style={{ color: meta.color }}>
                              <span className="w-[5px] h-[5px] rounded-full shrink-0" style={{ background: meta.color }} />
                              {e.category.toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-[14px] font-medium" style={{ color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                        {fmtDate(e.expense_date)}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className="text-[15px] font-bold" style={{ color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
                          ₹{e.amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        {dSar !== null && (
                          <p className="text-[12px] font-medium" style={{ color: "var(--text-tertiary)" }}>﷼{dSar.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {e.claim_eligible ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
                            style={{ background: e.claim_submitted ? "rgba(52,199,89,0.12)" : "rgba(0,122,255,0.1)", color: e.claim_submitted ? "#16A34A" : "#2563EB" }}>
                            {e.claim_submitted ? "✓ Claimed" : "Pending"}
                          </span>
                        ) : <span style={{ color: "var(--text-tertiary)" }}>—</span>}
                      </td>
                      <td className="px-4 py-4">
                        {e.splitwise_applicable ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
                            style={{ background: e.splitwise_added ? "rgba(52,199,89,0.12)" : "rgba(255,149,0,0.1)", color: e.splitwise_added ? "#16A34A" : "#D97706" }}>
                            {e.splitwise_added ? "✓ Added" : "Pending"}
                          </span>
                        ) : <span style={{ color: "var(--text-tertiary)" }}>—</span>}
                      </td>
                      <td className="pr-6 pl-4 py-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <button onClick={() => openEditExpense(e)}
                            className="icon-btn w-6 h-6 flex items-center justify-center rounded-md"
                            style={{ color: "var(--text-tertiary)" }} title="Edit">
                            <EditIcon />
                          </button>
                          <button onClick={() => handleDeleteExpense(e.id)}
                            className="icon-btn w-6 h-6 flex items-center justify-center rounded-md"
                            style={{ color: "var(--text-tertiary)" }}
                            onMouseEnter={(ev) => ((ev.currentTarget as HTMLElement).style.color = "#DC2626")}
                            onMouseLeave={(ev) => ((ev.currentTarget as HTMLElement).style.color = "var(--text-tertiary)")}
                            title="Delete">
                            <TrashIcon />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredExpenses.length === 0 && (
              <div className="py-16 flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-[22px]" style={{ background: "var(--surface-secondary)" }}>🧾</div>
                <p className="text-[15px] font-semibold mt-1" style={{ color: "var(--text-primary)" }}>No expenses this month</p>
                <p className="text-[13px]" style={{ color: "var(--text-tertiary)" }}>Tap "Add Expense" to log one</p>
              </div>
            )}
          </div>
        </>)}

      </div>

    </>
  );
}
