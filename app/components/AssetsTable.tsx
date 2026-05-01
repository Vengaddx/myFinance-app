"use client";

import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { AssetCategory } from "../data/assets";
import AddAssetModal, { AssetFormData } from "./AddAssetModal";
import AddLiabilityModal, { LiabilityFormData } from "./AddLiabilityModal";
import AddExpenseModal, { ExpenseFormData, EMPTY_EXPENSE_FORM, EXPENSE_CATEGORIES } from "./AddExpenseModal";
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
  stocks: { label: "STOCKS & ETFS", bg: "#e8eeff", color: "#2c5ae9" },
  gold: { label: "COMMODITY", bg: "#fff8e0", color: "#a67c00" },
  lended: { label: "LENDED", bg: "#e8f5ed", color: "#1e7a3e" },
  fd: { label: "FIXED DEPOSITS", bg: "#e6f4ff", color: "#0055b3" },
  realestate: { label: "REAL ESTATE", bg: "#fff0e6", color: "#c0501a" },
  bank: { label: "BANK ACCOUNT", bg: "#e0f0ff", color: "#0055b3" },
  cash: { label: "CASH", bg: "#f2f2f7", color: "#636366" },
  crypto: { label: "CRYPTO", bg: "#ede8ff", color: "#5b30c0" },
  other: { label: "OTHER", bg: "#f2f2f7", color: "#636366" },
};

const EXPENSE_CATEGORY_META: Record<string, { bg: string; color: string; emoji: string }> = {
  food:          { bg: "#fff3e0", color: "#bf5a00", emoji: "🍜" },
  cab:           { bg: "#e3f2fd", color: "#1565c0", emoji: "🚗" },
  groceries:     { bg: "#e8f5e9", color: "#2e7d32", emoji: "🛒" },
  shopping:      { bg: "#f3e5f5", color: "#6a1b9a", emoji: "🛍️" },
  bills:         { bg: "#fffde7", color: "#f57f17", emoji: "💡" },
  travel:        { bg: "#e0f7fa", color: "#00838f", emoji: "✈️" },
  medical:       { bg: "#fce4ec", color: "#ad1457", emoji: "💊" },
  entertainment: { bg: "#fff0f5", color: "#c2185b", emoji: "🎬" },
  office:        { bg: "#f5f5f5", color: "#424242", emoji: "💼" },
  other:         { bg: "#f2f2f7", color: "#636366", emoji: "📦" },
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
  if (value >= 100_000) return `₹${(value / 100_000).toFixed(1)} L`;
  if (value >= 1_000) return `₹${(value / 1_000).toFixed(1)} K`;
  return `₹${value.toLocaleString("en-IN")}`;
}

function fmtINRFull(n?: number | string | null) {
  const value = Number(n ?? 0);
  return `₹${value.toLocaleString("en-IN")}`;
}

function fmtAmt(amount: number, currency: string = "INR") {
  const sym = currency === "USD" ? "$" : currency === "SAR" ? "﷼" : "₹";
  return `${sym}${amount.toLocaleString("en-IN")}`;
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
    <span className="inline-flex items-center gap-1 text-[11px] font-medium" style={{ color: isActive ? "#34c759" : "#636366" }}>
      <span className="w-[5px] h-[5px] rounded-full shrink-0" style={{ background: isActive ? "#34c759" : "#636366" }} />
      {isActive ? "Active" : "Closed"}
    </span>
  );
}

function LenderTypeBadge({ type }: { type: string }) {
  const isBank = type === "bank";
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium" style={{ color: isBank ? "#007aff" : "#ff9500" }}>
      <span className="w-[5px] h-[5px] rounded-full shrink-0" style={{ background: isBank ? "#007aff" : "#ff9500" }} />
      {isBank ? "Bank" : "Friend"}
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
  stocks:    { bgLight: "rgba(0,122,255,0.10)",   bgDark: "rgba(0,122,255,0.20)",   color: "#007aff" },
  gold:      { bgLight: "rgba(200,148,0,0.12)",   bgDark: "rgba(255,184,0,0.18)",   color: "#b8890a" },
  lended:    { bgLight: "rgba(52,199,89,0.12)",   bgDark: "rgba(52,199,89,0.20)",   color: "#28a745" },
  fd:        { bgLight: "rgba(0,85,179,0.10)",    bgDark: "rgba(0,85,179,0.22)",    color: "#0055b3" },
  realestate:{ bgLight: "rgba(90,122,0,0.10)",    bgDark: "rgba(174,221,0,0.18)",   color: "#5a7a00" },
  bank:      { bgLight: "rgba(0,122,255,0.08)",   bgDark: "rgba(77,168,255,0.18)",  color: "#4da8ff" },
  cash:      { bgLight: "rgba(99,99,102,0.10)",   bgDark: "rgba(99,99,102,0.20)",   color: "#8e8e93" },
  crypto:    { bgLight: "rgba(91,48,192,0.10)",   bgDark: "rgba(91,48,192,0.22)",   color: "#7c4ddb" },
  other:     { bgLight: "rgba(142,142,147,0.10)", bgDark: "rgba(142,142,147,0.18)", color: "#8e8e93" },
};

function AssetIcon({ type, isDark }: { type?: string; isDark?: boolean }) {
  const category = normalizeCategory(type);
  const style = ASSET_ICON_STYLE[category];
  const bg = isDark ? style.bgDark : style.bgLight;

  return (
    <div
      className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0"
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
        className="text-[14px] font-semibold"
        style={{ color: pos ? "#007aff" : "#ff3b30" }}
      >
        {pos ? "+" : ""}
        {fmtINRFull(value)}
      </span>
      <span
        className="text-[12px]"
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
const [loansFilter, setLoansFilter] = useState<"all" | "banks" | "friends">("all");
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
    const outstandingAmount = Number(data.outstanding_amount) || 0;

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
      allocation: totalCurVal > 0 ? Number(((item.curVal / totalCurVal) * 100).toFixed(1)) : 0,
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
      allocation: totalPortfolio > 0 ? Number(((r.curVal / totalPortfolio) * 100).toFixed(1)) : 0,
    }));
  }, [kiteUiAssets, mappedAssets]);

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

// Liabilities tab: bank loans only (friend loans live in Friends tab)
const filteredLiabilities = mappedLiabilities.filter((l) => {
  if (l.liabilityType === "friend") return false;
  const q = search.toLowerCase().trim();
  return (
    l.name.toLowerCase().includes(q) ||
    l.lenderName.toLowerCase().includes(q)
  );
});

// Friends tab: lended assets (positive) + friend liabilities (negative)
const friendsLended = mappedAssets.filter((a) => a.category === "lended").map((a) => ({
  id: a.id,
  name: a.name,
  amount: a.curVal,
  kind: "lended" as const,
  currency: "INR" as const,
}));

const friendsBorrowed = mappedLiabilities.filter((l) => l.liabilityType === "friend").map((l) => ({
  id: l.id,
  name: l.lenderName,
  label: l.name !== l.lenderName ? l.name : undefined,
  amount: l.outstandingAmount,
  originalAmount: l.originalAmount,
  kind: "borrowed" as const,
  currency: l.currency,
  borrowedDate: l.borrowedDate,
  dueDate: l.dueDate,
  status: l.status,
}));

type FriendLended  = typeof friendsLended[number];
type FriendBorrowed = typeof friendsBorrowed[number];
type FriendItem = FriendLended | FriendBorrowed;

const filteredFriends: FriendItem[] = (() => {
  const q = search.toLowerCase().trim();
  const lended  = friendsLended.filter((f)  => f.name.toLowerCase().includes(q));
  const borrowed = friendsBorrowed.filter((f) => f.name.toLowerCase().includes(q));
  return [...lended, ...borrowed];
})();

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

    // In ALL view, kite items are shown as grouped summary rows — not individually
    const kiteBase = activeTab === "all" ? [] : kiteUiAssets.filter((a) => {
      const matchSearch = a.name.toLowerCase().includes(q);
      return a.category === activeTab && matchSearch;
    });

    const combined = [...manualBase, ...kiteBase];

    // Recompute allocation relative to the visible filtered set
    const totalCurVal = combined.reduce((s, a) => s + a.curVal, 0);
    const withAlloc = combined.map((a) => ({
      ...a,
      allocation: totalCurVal > 0 ? Number(((a.curVal / totalCurVal) * 100).toFixed(1)) : 0,
    }));

    if (!sortKey) return withAlloc;
    return [...withAlloc].sort((a, b) => {
      const diff = a[sortKey] - b[sortKey];
      return sortDir === "asc" ? diff : -diff;
    });
  }, [mappedAssets, kiteUiAssets, activeTab, search, sortKey, sortDir]);

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

    // For ALL tab, kite items are not in `filtered` — add their totals separately
    const kiteInv = activeTab === "all" ? kiteUiAssets.reduce((s, a) => s + a.invested, 0) : 0;
    const kiteCur = activeTab === "all" ? kiteUiAssets.reduce((s, a) => s + a.curVal, 0) : 0;
    const kitePnl = activeTab === "all" ? kiteUiAssets.reduce((s, a) => s + a.pnl, 0) : 0;
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
  }, [filtered, filteredExpenses, filteredFriends, sectionTab, activeTab, liabilities, kiteUiAssets, onSummaryChange]);

  const handleSort = (key: "curVal" | "pnl") => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const handleDownload = () => {
    let ws: XLSX.WorkSheet;
    let fileName: string;

    if (sectionTab === "assets") {
      const rows = filtered.map((a) => ({
        Name: a.name,
        Category: CATEGORY_META[a.category as AssetCategory]?.label ?? a.category,
        "Current Value (₹)": a.curVal,
        "P&L (₹)": a.pnl,
        "P&L (%)": parseFloat(a.pnlPct.toFixed(2)),
        "Allocation (%)": a.allocation,
      }));
      ws = XLSX.utils.json_to_sheet(rows);
      fileName = `assets_${new Date().toISOString().slice(0, 10)}.xlsx`;
    } else if (sectionTab === "expenses") {
      const rows = filteredExpenses.map((e) => ({
        Title: e.title,
        Category: e.category,
        "Amount (₹)": e.amount,
        Date: e.expense_date,
        Month: e.month_key,
        "Claim Eligible": e.claim_eligible ? "Yes" : "No",
        "Claim Submitted": e.claim_submitted ? "Yes" : "No",
        "Splitwise Applicable": e.splitwise_applicable ? "Yes" : "No",
        "Splitwise Added": e.splitwise_added ? "Yes" : "No",
        Notes: e.notes ?? "",
      }));
      ws = XLSX.utils.json_to_sheet(rows);
      fileName = `expenses_${expenseMonthKey}.xlsx`;
    } else {
      const rows = filteredLiabilities.map((l) => ({
        Name: l.name,
        Lender: l.lenderName,
        Type: l.liabilityType,
        Currency: l.currency,
        "Original Amount": l.originalAmount,
        "Outstanding Amount": l.outstandingAmount,
        "Borrowed Date": l.borrowedDate ?? "",
        "Due Date": l.dueDate ?? "",
        Status: l.status,
        Notes: l.notes,
      }));
      ws = XLSX.utils.json_to_sheet(rows);
      fileName = `liabilities_${new Date().toISOString().slice(0, 10)}.xlsx`;
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sectionTab === "assets" ? "Assets" : "Liabilities");
    XLSX.writeFile(wb, fileName);
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
    setEditingAssetId(null);
    setEditingFormData(null);
    setModalOpen(true);
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
    sectionTab === "liabilities" && loansFilter === "friends" ? (
      <div className="flex items-center gap-2 shrink-0">
        <button onClick={handleAddLend} className="btn-lift flex items-center gap-1.5 h-[34px] px-3 rounded-[10px] text-[13px] font-semibold text-white shrink-0" style={{ background: "#34c759" }}>
          <PlusIcon /><span className="hidden sm:inline">Lend</span>
        </button>
        <button onClick={handleAddBorrow} className="btn-lift flex items-center gap-1.5 h-[34px] px-3 rounded-[10px] text-[13px] font-semibold text-white shrink-0" style={{ background: "#ff3b30" }}>
          <PlusIcon /><span className="hidden sm:inline">Borrow</span>
        </button>
      </div>
    ) : (
      <button
        onClick={handleAddClick}
        className="btn-lift flex items-center gap-1.5 h-[34px] px-3 sm:px-4 rounded-[10px] text-[13px] sm:text-[14px] font-semibold text-white shrink-0"
        style={{ background: "#007aff" }}
      >
        <PlusIcon />
        <span className="hidden sm:inline">
          {sectionTab === "expenses" ? "Add Expense" : sectionTab === "liabilities" ? (loansFilter === "banks" ? "Add Loan" : "Add Liability") : "Add Asset"}
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
          <div
            className="flex items-center gap-0.5 p-[3px] rounded-[12px]"
            style={{
              background: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)",
              border: isDark ? "1px solid rgba(255,255,255,0.07)" : "1px solid rgba(0,0,0,0.04)",
            }}
          >
            {(["assets", "liabilities", "expenses"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setSectionTab(t)}
                className="px-3 sm:px-4 py-1.5 rounded-[9px] text-[12.5px] sm:text-[13px] font-semibold capitalize"
                style={{
                  background: sectionTab === t
                    ? (isDark ? "rgba(255,255,255,0.14)" : "#ffffff")
                    : "transparent",
                  color: sectionTab === t ? "var(--text-primary)" : "var(--text-tertiary)",
                  boxShadow: sectionTab === t
                    ? (isDark ? "0 1px 4px rgba(0,0,0,0.4)" : "0 1px 3px rgba(0,0,0,0.12)")
                    : "none",
                  transition: "background 180ms ease, color 180ms ease, box-shadow 180ms ease",
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

            <button onClick={handleDownload} title="Download as Excel" className="icon-btn hidden md:flex w-[34px] h-[34px] items-center justify-center rounded-[10px] text-[#aeaeb2] hover:text-[#1d1d1f] hover:bg-black/5">
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
                className="shrink-0 px-3 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-[12.5px] sm:text-[13px] font-medium"
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
        )}

        {/* Loans: All / Banks / Friends sub-filter */}
        {sectionTab === "liabilities" && (
          <div className="flex items-center gap-1 px-4 sm:px-5 md:px-6 py-2.5 overflow-x-auto scrollbar-hide" style={{ borderBottom: "1px solid var(--separator-subtle)" }}>
            {([
              { key: "all",     label: "All" },
              { key: "banks",   label: "Banks" },
              { key: "friends", label: "Friends" },
            ] as const).map((f) => {
              const isActive = loansFilter === f.key;
              return (
                <button
                  key={f.key}
                  onClick={() => setLoansFilter(f.key)}
                  className="shrink-0 px-3 py-1 rounded-full text-[12.5px] font-medium"
                  style={{
                    background: isActive ? (isDark ? "rgba(255,255,255,0.12)" : "#1d1d1f") : "transparent",
                    color: isActive ? "#ffffff" : "var(--text-secondary)",
                    border: isActive && isDark ? "1px solid rgba(255,255,255,0.2)" : "1px solid transparent",
                    transition: "background 180ms ease-out, color 180ms ease-out",
                  }}
                >
                  {f.label}
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
                  className="shrink-0 px-3 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-[12.5px] sm:text-[13px] font-medium"
                  style={{
                    background: isActive ? (isDark ? "rgba(255,255,255,0.12)" : "#1d1d1f") : "transparent",
                    color: isActive ? "#ffffff" : "var(--text-secondary)",
                    border: isActive && isDark ? "1px solid rgba(255,255,255,0.2)" : "1px solid transparent",
                    transition: "background 180ms ease-out, color 180ms ease-out",
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
                  {cat !== "all" && <span className="mr-1">{getExpenseCategoryMeta(cat).emoji}</span>}{label}
                </button>
              );
            })}
            {/* Divider */}
            <div className="w-px h-4 shrink-0 mx-1" style={{ background: "var(--separator)" }} />
            {/* Quick filters */}
            {([
              { key: "claim", label: "Claim Eligible", color: "#007aff" },
              { key: "splitwise", label: "SW Pending", color: "#ff9500" },
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
          const kiteInv = activeTab === "all" ? kiteUiAssets.reduce((s, a) => s + a.invested, 0) : 0;
          const kiteCur = activeTab === "all" ? kiteUiAssets.reduce((s, a) => s + a.curVal, 0) : 0;
          const kitePnl = activeTab === "all" ? kiteUiAssets.reduce((s, a) => s + a.pnl, 0) : 0;
          const inv  = filtered.reduce((s, a) => s + a.invested, 0) + kiteInv;
          const cur  = filtered.reduce((s, a) => s + a.curVal, 0) + kiteCur;
          // Sum individual pnl values so bank/cash (pnl=0) don't inflate P&L
          const pnl  = filtered.reduce((s, a) => s + a.pnl, 0) + kitePnl;
          const pct  = inv > 0 ? (pnl / inv) * 100 : 0;
          const activeFilteredLibs = filteredLiabilities.filter((l) => l.status === "active");
          const outstanding   = activeFilteredLibs.reduce((s, l) => s + l.outstandingAmount, 0);
          const totalBorrowed = activeFilteredLibs.reduce((s, l) => s + l.originalAmount, 0);
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
                  <p className="text-[19px] font-bold" style={{ color: pnl >= 0 ? "#34c759" : "#ff3b30", letterSpacing: "-0.025em" }}>
                    {pnl >= 0 ? "+" : ""}{fmtINR(pnl)}
                    <span className="text-[13px] font-medium ml-1.5" style={{ opacity: 0.7 }}>({pct >= 0 ? "+" : ""}{pct.toFixed(1)}%)</span>
                  </p>
                </div>
              </>)}
              {sectionTab === "liabilities" && (<>
                <div>
                  <p className="text-[9.5px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Outstanding</p>
                  <p className="text-[19px] font-bold" style={{ color: "#ff3b30", letterSpacing: "-0.025em" }}>{fmtINR(outstanding)}</p>
                </div>
                {sep}
                <div>
                  <p className="text-[9.5px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Borrowed</p>
                  <p className="text-[19px] font-bold" style={{ color: "var(--text-primary)", letterSpacing: "-0.025em" }}>{fmtINR(totalBorrowed)}</p>
                </div>
                {sep}
                <div>
                  <p className="text-[9.5px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Count</p>
                  <p className="text-[19px] font-bold" style={{ color: "var(--text-primary)", letterSpacing: "-0.025em" }}>{activeFilteredLibs.length}</p>
                </div>
              </>)}
              {sectionTab === "liabilities" && loansFilter === "friends" && (() => {
                const lentTotal     = filteredFriends.filter((f) => f.kind === "lended").reduce((s, f) => s + f.amount, 0);
                const borrowedTotal = filteredFriends.filter((f) => f.kind === "borrowed").reduce((s, f) => s + f.amount, 0);
                const net = lentTotal - borrowedTotal;
                return (<>
                  <div>
                    <p className="text-[9.5px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>You Lent</p>
                    <p className="text-[19px] font-bold" style={{ color: "#34c759", letterSpacing: "-0.025em" }}>+{fmtINR(lentTotal)}</p>
                  </div>
                  {sep}
                  <div>
                    <p className="text-[9.5px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>You Borrowed</p>
                    <p className="text-[19px] font-bold" style={{ color: "#ff3b30", letterSpacing: "-0.025em" }}>-{fmtINR(borrowedTotal)}</p>
                  </div>
                  {sep}
                  <div>
                    <p className="text-[9.5px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Net</p>
                    <p className="text-[19px] font-bold" style={{ color: net >= 0 ? "#34c759" : "#ff3b30", letterSpacing: "-0.025em" }}>{net >= 0 ? "+" : ""}{fmtINR(net)}</p>
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
                  <p className="text-[19px] font-bold" style={{ color: "#007aff", letterSpacing: "-0.025em" }}>{fmtINR(expClaim)}</p>
                </div>
                {sep}
                <div>
                  <p className="text-[9.5px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>SW Pending</p>
                  <p className="text-[19px] font-bold" style={{ color: "#ff9500", letterSpacing: "-0.025em" }}>{fmtINR(expSW)}</p>
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
        <div className="md:hidden">
          {filtered.map((asset, idx) => {
            const isKite = asset.id.startsWith("kite_");
            const hasKiteRows = activeTab === "all" && kiteGroupedRows.length > 0;
            const isLast = idx === filtered.length - 1;

            return (
              <div
                key={asset.id}
                className="px-4 sm:px-5 py-4"
                style={{
                  borderBottom: isLast && !hasKiteRows ? "none" : "1px solid var(--separator-subtle)",
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <AssetIcon type={asset.category} isDark={isDark} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p
                          className="text-[16px] font-bold truncate"
                          style={{ color: "var(--text-primary)", letterSpacing: "-0.02em" }}
                        >
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

                <div
                  className="flex items-start justify-between mt-3 pt-3"
                  style={{ borderTop: "1px solid var(--separator-subtle)" }}
                >
                  <StatLabel label="Cur. Val" value={fmtINRFull(asset.curVal)} />
                  <StatLabel
                    label="Alloc."
                    value={`${asset.allocation}%`}
                    align="right"
                  />
                </div>

                {!isKite && (
                  <div className="flex items-center gap-2 mt-3 pt-3" style={{ borderTop: "1px solid var(--separator-subtle)" }}>
                    <button
                      onClick={() => handleEdit(asset)}
                      className="flex items-center gap-1 h-7 px-2.5 rounded-[8px] text-[12px] font-medium"
                      style={{ color: "var(--text-secondary)", background: "var(--surface-secondary)" }}
                    >
                      <EditIcon /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(asset.id)}
                      className="icon-btn ml-auto w-7 h-7 flex items-center justify-center rounded-[8px]"
                      style={{ color: "var(--text-tertiary)" }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#ff3b30")}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-tertiary)")}
                    >
                      <TrashIcon />
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {/* Kite grouped summary rows — ALL view only */}
          {activeTab === "all" && kiteGroupedRows.map((row, idx) => {
            const isLast = idx === kiteGroupedRows.length - 1;
            return (
              <div
                key={row.id}
                className="px-4 sm:px-5 py-4"
                style={{ borderBottom: isLast ? "none" : "1px solid var(--separator-subtle)" }}
              >
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
          })}

          {filtered.length === 0 && kiteGroupedRows.length === 0 && (
            <div className="py-16 flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-[22px]" style={{ background: "var(--surface-secondary)" }}>📊</div>
              <p className="text-[15px] font-semibold mt-1" style={{ color: "var(--text-primary)" }}>No assets yet</p>
              <p className="text-[13px]" style={{ color: "var(--text-tertiary)" }}>Tap "Add Asset" to get started</p>
            </div>
          )}
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
              {filtered.map((asset, idx) => {
                const isKite = asset.id.startsWith("kite_");
                const hasKiteRows = activeTab === "all" && kiteGroupedRows.length > 0;
                const isLast = idx === filtered.length - 1;

                return (
                  <tr
                    key={asset.id}
                    className="cursor-pointer"
                    style={{ borderBottom: isLast && !hasKiteRows ? "none" : "1px solid var(--separator-subtle)" }}
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
                          {asset.allocation}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {/* Kite grouped summary rows — ALL view only */}
              {activeTab === "all" && kiteGroupedRows.map((row, idx) => {
                const isLast = idx === kiteGroupedRows.length - 1;
                return (
                  <tr
                    key={row.id}
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
                          {row.allocation}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filtered.length === 0 && kiteGroupedRows.length === 0 && (
            <div className="py-16 flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-[22px]" style={{ background: "var(--surface-secondary)" }}>📊</div>
              <p className="text-[15px] font-semibold mt-1" style={{ color: "var(--text-primary)" }}>No assets yet</p>
              <p className="text-[13px]" style={{ color: "var(--text-tertiary)" }}>Add your first asset to get started</p>
            </div>
          )}
        </div>
        </>)}

        {sectionTab === "liabilities" && (() => {
          // Helper to open edit for a bank/borrowed liability
          const openEditLiab = (id: string) => {
            const raw = liabilities.find((x) => x.id === id);
            if (!raw) return;
            setEditingLiabilityId(id);
            setEditingLiabilityData({ lender_name: raw.lender_name, lender_type: raw.lender_type, liability_name: raw.liability_name || "", original_amount: String(raw.original_amount ?? ""), outstanding_amount: String(raw.outstanding_amount ?? ""), currency: raw.currency || "INR", borrowed_date: raw.borrowed_date || "", due_date: raw.due_date || "", notes: raw.notes || "" });
            setLiabilityModalOpen(true);
          };
          const showBanks   = loansFilter !== "friends";
          const showFriends = loansFilter !== "banks";
          const isAll       = loansFilter === "all";
          const noResults   = (showBanks && filteredLiabilities.length === 0 && !showFriends) || (showFriends && filteredFriends.length === 0 && !showBanks) || (isAll && filteredLiabilities.length === 0 && filteredFriends.length === 0);
          const sectionLabel = (label: string, emoji: string) => (
            <div className="px-4 sm:px-5 md:px-6 py-1.5 flex items-center gap-2" style={{ borderBottom: "1px solid var(--separator-subtle)", background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)" }}>
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-tertiary)" }}>{emoji} {label}</span>
            </div>
          );
          return (<>
            {/* ── MOBILE ── */}
            <div className="md:hidden">
              {showBanks && filteredLiabilities.length > 0 && (<>
                {isAll && sectionLabel("Banks", "🏦")}
                {filteredLiabilities.map((l, idx) => {
                  const isLast = idx === filteredLiabilities.length - 1 && (!showFriends || filteredFriends.length === 0);
                  return (
                    <div key={l.id} className="px-4 sm:px-5 py-4" style={{ borderBottom: isLast ? "none" : "1px solid var(--separator-subtle)" }}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[16px] font-bold truncate" style={{ color: "var(--text-primary)", letterSpacing: "-0.02em" }}>{l.lenderName}</p>
                          {l.name !== l.lenderName && <p className="text-[13px] mt-0.5 truncate" style={{ color: "var(--text-secondary)" }}>{l.name}</p>}
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <LenderTypeBadge type={l.liabilityType} /><StatusBadge status={l.status} />
                            {daysSince(l.borrowedDate) != null && <span className="text-[12px] font-semibold" style={{ color: "var(--text-tertiary)" }}>{daysSince(l.borrowedDate)}d ago</span>}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[17px] font-bold" style={{ color: "#ff3b30", letterSpacing: "-0.02em" }}>{fmtAmt(l.outstandingAmount, l.currency)}</p>
                          <p className="text-[12px] mt-0.5 font-medium" style={{ color: "var(--text-tertiary)" }}>of {fmtAmt(l.originalAmount, l.currency)}</p>
                        </div>
                      </div>
                      {(l.borrowedDate || l.dueDate) && (
                        <div className="flex items-center gap-4 mt-2">
                          {l.borrowedDate && <div><p className="text-[10px] uppercase font-semibold" style={{ color: "var(--text-tertiary)", letterSpacing: "0.07em" }}>Borrowed</p><p className="text-[13px] font-medium" style={{ color: "var(--text-secondary)" }}>{fmtDate(l.borrowedDate)}</p></div>}
                          {l.dueDate && <div><p className="text-[10px] uppercase font-semibold" style={{ color: "var(--text-tertiary)", letterSpacing: "0.07em" }}>Due</p><p className="text-[13px] font-medium" style={{ color: "var(--text-secondary)" }}>{fmtDate(l.dueDate)}</p></div>}
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-3 pt-3" style={{ borderTop: "1px solid var(--separator-subtle)" }}>
                        <button onClick={() => openEditLiab(l.id)} className="flex items-center gap-1 h-7 px-2.5 rounded-[8px] text-[12px] font-medium" style={{ color: "var(--text-secondary)", background: "var(--surface-secondary)" }}><EditIcon /> Edit</button>
                        {l.status === "active" && <button onClick={() => { setRepayingLiability({ id: l.id, name: l.name, outstanding: l.outstandingAmount, currency: l.currency }); setRepayModalOpen(true); }} className="flex items-center gap-1 h-7 px-2.5 rounded-[8px] text-[12px] font-semibold" style={{ color: "#34c759", background: "rgba(52,199,89,0.1)" }}>Repay</button>}
                        <button onClick={() => { setViewingLendLogs(null); setViewingLogsLiabilityId(l.id); setViewingLogsLiabilityName(l.name); setLogsModalOpen(true); }} className="flex items-center gap-1 h-7 px-2.5 rounded-[8px] text-[12px] font-medium" style={{ color: "var(--text-secondary)", background: "var(--surface-secondary)" }}>Logs</button>
                        <button onClick={() => handleDeleteLiability(l.id)} className="icon-btn ml-auto w-7 h-7 flex items-center justify-center rounded-[8px]" style={{ color: "var(--text-tertiary)" }} onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#ff3b30")} onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-tertiary)")}><TrashIcon /></button>
                      </div>
                    </div>
                  );
                })}
              </>)}

              {showFriends && filteredFriends.length > 0 && (<>
                {isAll && sectionLabel("Friends", "🤝")}
                {filteredFriends.map((item, idx) => {
                  const isLast = idx === filteredFriends.length - 1;
                  if (item.kind === "lended") {
                    const f = item as typeof friendsLended[number];
                    return (
                      <div key={f.id} className="px-4 sm:px-5 py-4" style={{ borderBottom: isLast ? "none" : "1px solid var(--separator-subtle)" }}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[16px] font-bold truncate" style={{ color: "var(--text-primary)", letterSpacing: "-0.02em" }}>{f.name}</p>
                            <span className="inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full mt-1" style={{ background: "rgba(52,199,89,0.12)", color: "#1e7a3e" }}>YOU LENT</span>
                          </div>
                          <p className="text-[17px] font-bold shrink-0" style={{ color: "#34c759", letterSpacing: "-0.02em" }}>+{fmtAmt(f.amount, f.currency)}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-3 pt-3" style={{ borderTop: "1px solid var(--separator-subtle)" }}>
                          <button onClick={() => { const a = mappedAssets.find((a) => a.id === f.id); if (a) handleEdit(a); }} className="flex items-center gap-1 h-7 px-2.5 rounded-[8px] text-[12px] font-medium" style={{ color: "var(--text-secondary)", background: "var(--surface-secondary)" }}><EditIcon /> Edit</button>
                          {f.amount > 0 && <button onClick={() => { setReceivingLend({ id: f.id, name: f.name, outstanding: f.amount, currency: f.currency }); setReceivedModalOpen(true); }} className="flex items-center gap-1 h-7 px-2.5 rounded-[8px] text-[12px] font-semibold" style={{ color: "#34c759", background: "rgba(52,199,89,0.1)" }}>Received</button>}
                          <button onClick={() => { setViewingLendLogs(getLendLogs(f.id)); setViewingLogsLiabilityName(f.name); setLogsModalOpen(true); }} className="flex items-center gap-1 h-7 px-2.5 rounded-[8px] text-[12px] font-medium" style={{ color: "var(--text-secondary)", background: "var(--surface-secondary)" }}>Logs</button>
                          <button onClick={() => handleDelete(f.id)} className="icon-btn ml-auto w-7 h-7 flex items-center justify-center rounded-[8px]" style={{ color: "var(--text-tertiary)" }} onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#ff3b30")} onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-tertiary)")}><TrashIcon /></button>
                        </div>
                      </div>
                    );
                  } else {
                    const f = item as typeof friendsBorrowed[number];
                    return (
                      <div key={f.id} className="px-4 sm:px-5 py-4" style={{ borderBottom: isLast ? "none" : "1px solid var(--separator-subtle)" }}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[16px] font-bold truncate" style={{ color: "var(--text-primary)", letterSpacing: "-0.02em" }}>{f.name}</p>
                            {f.label && <p className="text-[13px] mt-0.5 truncate" style={{ color: "var(--text-secondary)" }}>{f.label}</p>}
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className="inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(255,59,48,0.1)", color: "#c0281f" }}>YOU BORROWED</span>
                              <StatusBadge status={f.status} />
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-[17px] font-bold" style={{ color: "#ff3b30", letterSpacing: "-0.02em" }}>-{fmtAmt(f.amount, f.currency)}</p>
                            <p className="text-[12px] mt-0.5 font-medium" style={{ color: "var(--text-tertiary)" }}>of {fmtAmt(f.originalAmount, f.currency)}</p>
                          </div>
                        </div>
                        {(f.borrowedDate || f.dueDate) && (
                          <div className="flex items-center gap-4 mt-2">
                            {f.borrowedDate && <div><p className="text-[10px] uppercase font-semibold" style={{ color: "var(--text-tertiary)", letterSpacing: "0.07em" }}>Borrowed</p><p className="text-[13px] font-medium" style={{ color: "var(--text-secondary)" }}>{fmtDate(f.borrowedDate)}</p></div>}
                            {f.dueDate && <div><p className="text-[10px] uppercase font-semibold" style={{ color: "var(--text-tertiary)", letterSpacing: "0.07em" }}>Due</p><p className="text-[13px] font-medium" style={{ color: "var(--text-secondary)" }}>{fmtDate(f.dueDate)}</p></div>}
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-3 pt-3" style={{ borderTop: "1px solid var(--separator-subtle)" }}>
                          <button onClick={() => openEditLiab(f.id)} className="flex items-center gap-1 h-7 px-2.5 rounded-[8px] text-[12px] font-medium" style={{ color: "var(--text-secondary)", background: "var(--surface-secondary)" }}><EditIcon /> Edit</button>
                          {f.status === "active" && <button onClick={() => { setRepayingLiability({ id: f.id, name: f.label ?? f.name, outstanding: f.amount, currency: f.currency }); setRepayModalOpen(true); }} className="flex items-center gap-1 h-7 px-2.5 rounded-[8px] text-[12px] font-semibold" style={{ color: "#34c759", background: "rgba(52,199,89,0.1)" }}>Repay</button>}
                          <button onClick={() => { setViewingLendLogs(null); setViewingLogsLiabilityId(f.id); setViewingLogsLiabilityName(f.label ?? f.name); setLogsModalOpen(true); }} className="flex items-center gap-1 h-7 px-2.5 rounded-[8px] text-[12px] font-medium" style={{ color: "var(--text-secondary)", background: "var(--surface-secondary)" }}>Logs</button>
                          <button onClick={() => handleDeleteLiability(f.id)} className="icon-btn ml-auto w-7 h-7 flex items-center justify-center rounded-[8px]" style={{ color: "var(--text-tertiary)" }} onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#ff3b30")} onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-tertiary)")}><TrashIcon /></button>
                        </div>
                      </div>
                    );
                  }
                })}
              </>)}

              {noResults && (
                <div className="py-16 flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-[22px]" style={{ background: "var(--surface-secondary)" }}>{loansFilter === "friends" ? "🤝" : "🏦"}</div>
                  <p className="text-[15px] font-semibold mt-1" style={{ color: "var(--text-primary)" }}>No {loansFilter === "friends" ? "friend transactions" : loansFilter === "banks" ? "bank loans" : "loans"}</p>
                  <p className="text-[13px]" style={{ color: "var(--text-tertiary)" }}>{loansFilter === "friends" ? "Track money you lent or borrowed from friends" : "Add a loan or debt to track it here"}</p>
                </div>
              )}
            </div>

            {/* ── DESKTOP ── */}
            <div className="hidden md:block" style={{ overflowX: "auto", overflowY: "auto", maxHeight: "calc(100dvh - 280px)" }}>
              {/* Banks table */}
              {showBanks && filteredLiabilities.length > 0 && (<>
                {isAll && <div className="px-6 py-2 flex items-center gap-2" style={{ borderBottom: "1px solid var(--separator-subtle)", background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)" }}><span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-tertiary)" }}>🏦 Banks</span></div>}
                <table className="w-full">
                  <thead style={{ position: "sticky", top: 0, zIndex: 10, boxShadow: isDark ? "0 1px 0 rgba(255,255,255,0.07)" : "0 1px 0 rgba(0,0,0,0.07)" }}>
                    <tr>
                      <th className="py-3 pl-6 pr-4 text-left text-[11px] font-semibold uppercase" style={{ color: "var(--text-tertiary)", letterSpacing: "0.08em", whiteSpace: "nowrap", background: "var(--surface)" }}>LENDER / LIABILITY</th>
                      <th className="py-3 px-4 text-right text-[11px] font-semibold uppercase" style={{ color: "var(--text-tertiary)", letterSpacing: "0.08em", whiteSpace: "nowrap", background: "var(--surface)" }}>OUTSTANDING</th>
                      <th className="py-3 px-4 text-right text-[11px] font-semibold uppercase" style={{ color: "var(--text-tertiary)", letterSpacing: "0.08em", whiteSpace: "nowrap", background: "var(--surface)" }}>ORIGINAL</th>
                      <th className="py-3 px-4 text-left text-[11px] font-semibold uppercase" style={{ color: "var(--text-tertiary)", letterSpacing: "0.08em", whiteSpace: "nowrap", background: "var(--surface)" }}>BORROWED</th>
                      <th className="py-3 px-4 text-right text-[11px] font-semibold uppercase" style={{ color: "var(--text-tertiary)", letterSpacing: "0.08em", whiteSpace: "nowrap", background: "var(--surface)" }}>DAYS</th>
                      <th className="py-3 px-4 text-left text-[11px] font-semibold uppercase" style={{ color: "var(--text-tertiary)", letterSpacing: "0.08em", whiteSpace: "nowrap", background: "var(--surface)" }}>DUE</th>
                      <th className="py-3 px-4 text-left text-[11px] font-semibold uppercase" style={{ color: "var(--text-tertiary)", letterSpacing: "0.08em", whiteSpace: "nowrap", background: "var(--surface)" }}>STATUS</th>
                      <th className="py-3 pr-6 pl-4 text-right text-[11px] font-semibold uppercase" style={{ color: "var(--text-tertiary)", letterSpacing: "0.08em", whiteSpace: "nowrap", background: "var(--surface)" }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLiabilities.map((l, idx) => (
                      <tr key={l.id} style={{ borderBottom: idx === filteredLiabilities.length - 1 ? "none" : "1px solid var(--separator-subtle)" }} onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--row-hover)"; }} onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                        <td className="pl-6 pr-4 py-4"><div className="flex items-center gap-2"><p className="text-[15px] font-bold" style={{ color: "var(--text-primary)", letterSpacing: "-0.02em" }}>{l.lenderName}</p><LenderTypeBadge type={l.liabilityType} /></div>{l.name !== l.lenderName && <p className="text-[13px] mt-0.5" style={{ color: "var(--text-secondary)" }}>{l.name}</p>}</td>
                        <td className="px-4 py-4 text-right"><span className="text-[15px] font-bold" style={{ color: "#ff3b30", letterSpacing: "-0.01em" }}>{fmtAmt(l.outstandingAmount, l.currency)}</span></td>
                        <td className="px-4 py-4 text-right"><span className="text-[15px] font-semibold" style={{ color: "var(--text-secondary)", letterSpacing: "-0.01em" }}>{fmtAmt(l.originalAmount, l.currency)}</span></td>
                        <td className="px-4 py-4 text-[14px] font-medium" style={{ color: "var(--text-secondary)", whiteSpace: "nowrap" }}>{fmtDate(l.borrowedDate)}</td>
                        <td className="px-4 py-4 text-right">{(() => { const d = daysSince(l.borrowedDate); return d != null ? <span className="text-[15px] font-bold" style={{ color: "var(--text-primary)", letterSpacing: "-0.01em" }}>{d}<span className="text-[12px] font-normal ml-0.5" style={{ color: "var(--text-tertiary)" }}>d</span></span> : <span style={{ color: "var(--text-tertiary)" }}>—</span>; })()}</td>
                        <td className="px-4 py-4 text-[14px] font-medium" style={{ color: "var(--text-secondary)", whiteSpace: "nowrap" }}>{fmtDate(l.dueDate)}</td>
                        <td className="px-4 py-4"><StatusBadge status={l.status} /></td>
                        <td className="pr-6 pl-4 py-4"><div className="flex items-center justify-end gap-1.5">
                          <button onClick={() => openEditLiab(l.id)} className="icon-btn w-6 h-6 flex items-center justify-center rounded-md" style={{ color: "var(--text-tertiary)" }} title="Edit"><EditIcon /></button>
                          {l.status === "active" && <button onClick={() => { setRepayingLiability({ id: l.id, name: l.name, outstanding: l.outstandingAmount, currency: l.currency }); setRepayModalOpen(true); }} className="h-6 px-2 rounded-[6px] text-[11px] font-semibold" style={{ color: "#34c759", background: "rgba(52,199,89,0.1)" }} title="Repay">Repay</button>}
                          <button onClick={() => { setViewingLendLogs(null); setViewingLogsLiabilityId(l.id); setViewingLogsLiabilityName(l.name); setLogsModalOpen(true); }} className="h-6 px-2 rounded-[6px] text-[11px] font-semibold" style={{ color: "var(--text-tertiary)", background: "var(--surface-secondary)" }} title="Logs">Logs</button>
                          <button onClick={() => handleDeleteLiability(l.id)} className="icon-btn w-6 h-6 flex items-center justify-center rounded-md" style={{ color: "var(--text-tertiary)" }} onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#ff3b30")} onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-tertiary)")} title="Delete"><TrashIcon /></button>
                        </div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>)}

              {/* Friends table */}
              {showFriends && filteredFriends.length > 0 && (<>
                {isAll && <div className="px-6 py-2 flex items-center gap-2" style={{ borderTop: filteredLiabilities.length > 0 ? "1px solid var(--separator-subtle)" : "none", borderBottom: "1px solid var(--separator-subtle)", background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)" }}><span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-tertiary)" }}>🤝 Friends</span></div>}
                <table className="w-full">
                  <thead style={{ position: "sticky", top: 0, zIndex: 10, boxShadow: isDark ? "0 1px 0 rgba(255,255,255,0.07)" : "0 1px 0 rgba(0,0,0,0.07)" }}>
                    <tr>
                      <th className="py-3 pl-6 pr-4 text-left text-[11px] font-semibold uppercase" style={{ color: "var(--text-tertiary)", letterSpacing: "0.08em", whiteSpace: "nowrap", background: "var(--surface)" }}>FRIEND</th>
                      <th className="py-3 px-4 text-right text-[11px] font-semibold uppercase" style={{ color: "var(--text-tertiary)", letterSpacing: "0.08em", whiteSpace: "nowrap", background: "var(--surface)" }}>AMOUNT</th>
                      <th className="py-3 px-4 text-left text-[11px] font-semibold uppercase" style={{ color: "var(--text-tertiary)", letterSpacing: "0.08em", whiteSpace: "nowrap", background: "var(--surface)" }}>TYPE</th>
                      <th className="py-3 px-4 text-left text-[11px] font-semibold uppercase" style={{ color: "var(--text-tertiary)", letterSpacing: "0.08em", whiteSpace: "nowrap", background: "var(--surface)" }}>DATE</th>
                      <th className="py-3 px-4 text-left text-[11px] font-semibold uppercase" style={{ color: "var(--text-tertiary)", letterSpacing: "0.08em", whiteSpace: "nowrap", background: "var(--surface)" }}>DUE</th>
                      <th className="py-3 px-4 text-left text-[11px] font-semibold uppercase" style={{ color: "var(--text-tertiary)", letterSpacing: "0.08em", whiteSpace: "nowrap", background: "var(--surface)" }}>STATUS</th>
                      <th className="py-3 pr-6 pl-4 text-right text-[11px] font-semibold uppercase" style={{ color: "var(--text-tertiary)", letterSpacing: "0.08em", whiteSpace: "nowrap", background: "var(--surface)" }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFriends.map((item, idx) => {
                      const isLast = idx === filteredFriends.length - 1;
                      if (item.kind === "lended") {
                        const f = item as typeof friendsLended[number];
                        return (
                          <tr key={f.id} style={{ borderBottom: isLast ? "none" : "1px solid var(--separator-subtle)" }} onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--row-hover)"; }} onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                            <td className="pl-6 pr-4 py-4"><p className="text-[15px] font-bold" style={{ color: "var(--text-primary)", letterSpacing: "-0.02em" }}>{f.name}</p></td>
                            <td className="px-4 py-4 text-right"><span className="text-[15px] font-bold" style={{ color: "#34c759", letterSpacing: "-0.01em" }}>+{fmtAmt(f.amount, f.currency)}</span></td>
                            <td className="px-4 py-4"><span className="inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(52,199,89,0.12)", color: "#1e7a3e" }}>YOU LENT</span></td>
                            <td className="px-4 py-4 text-[14px]" style={{ color: "var(--text-secondary)" }}>—</td>
                            <td className="px-4 py-4 text-[14px]" style={{ color: "var(--text-secondary)" }}>—</td>
                            <td className="px-4 py-4"><span className="inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(52,199,89,0.1)", color: "#34c759" }}>Active</span></td>
                            <td className="pr-6 pl-4 py-4"><div className="flex items-center justify-end gap-1.5">
                              <button onClick={() => { const a = mappedAssets.find((a) => a.id === f.id); if (a) handleEdit(a); }} className="icon-btn w-6 h-6 flex items-center justify-center rounded-md" style={{ color: "var(--text-tertiary)" }} title="Edit"><EditIcon /></button>
                              {f.amount > 0 && <button onClick={() => { setReceivingLend({ id: f.id, name: f.name, outstanding: f.amount, currency: f.currency }); setReceivedModalOpen(true); }} className="h-6 px-2 rounded-[6px] text-[11px] font-semibold" style={{ color: "#34c759", background: "rgba(52,199,89,0.1)" }} title="Mark Received">Received</button>}
                              <button onClick={() => { setViewingLendLogs(getLendLogs(f.id)); setViewingLogsLiabilityName(f.name); setLogsModalOpen(true); }} className="h-6 px-2 rounded-[6px] text-[11px] font-semibold" style={{ color: "var(--text-tertiary)", background: "var(--surface-secondary)" }} title="Logs">Logs</button>
                              <button onClick={() => handleDelete(f.id)} className="icon-btn w-6 h-6 flex items-center justify-center rounded-md" style={{ color: "var(--text-tertiary)" }} onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#ff3b30")} onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-tertiary)")} title="Delete"><TrashIcon /></button>
                            </div></td>
                          </tr>
                        );
                      } else {
                        const f = item as typeof friendsBorrowed[number];
                        return (
                          <tr key={f.id} style={{ borderBottom: isLast ? "none" : "1px solid var(--separator-subtle)" }} onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--row-hover)"; }} onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                            <td className="pl-6 pr-4 py-4"><p className="text-[15px] font-bold" style={{ color: "var(--text-primary)", letterSpacing: "-0.02em" }}>{f.name}</p>{f.label && <p className="text-[13px] mt-0.5" style={{ color: "var(--text-secondary)" }}>{f.label}</p>}</td>
                            <td className="px-4 py-4 text-right"><span className="text-[15px] font-bold" style={{ color: "#ff3b30", letterSpacing: "-0.01em" }}>-{fmtAmt(f.amount, f.currency)}</span><p className="text-[12px] mt-0.5 font-medium text-right" style={{ color: "var(--text-tertiary)" }}>of {fmtAmt(f.originalAmount, f.currency)}</p></td>
                            <td className="px-4 py-4"><span className="inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(255,59,48,0.1)", color: "#c0281f" }}>YOU BORROWED</span></td>
                            <td className="px-4 py-4 text-[14px] font-medium" style={{ color: "var(--text-secondary)", whiteSpace: "nowrap" }}>{fmtDate(f.borrowedDate)}</td>
                            <td className="px-4 py-4 text-[14px] font-medium" style={{ color: "var(--text-secondary)", whiteSpace: "nowrap" }}>{fmtDate(f.dueDate)}</td>
                            <td className="px-4 py-4"><StatusBadge status={f.status} /></td>
                            <td className="pr-6 pl-4 py-4"><div className="flex items-center justify-end gap-1.5">
                              <button onClick={() => openEditLiab(f.id)} className="icon-btn w-6 h-6 flex items-center justify-center rounded-md" style={{ color: "var(--text-tertiary)" }} title="Edit"><EditIcon /></button>
                              {f.status === "active" && <button onClick={() => { setRepayingLiability({ id: f.id, name: f.label ?? f.name, outstanding: f.amount, currency: f.currency }); setRepayModalOpen(true); }} className="h-6 px-2 rounded-[6px] text-[11px] font-semibold" style={{ color: "#34c759", background: "rgba(52,199,89,0.1)" }} title="Repay">Repay</button>}
                              <button onClick={() => { setViewingLendLogs(null); setViewingLogsLiabilityId(f.id); setViewingLogsLiabilityName(f.label ?? f.name); setLogsModalOpen(true); }} className="h-6 px-2 rounded-[6px] text-[11px] font-semibold" style={{ color: "var(--text-tertiary)", background: "var(--surface-secondary)" }} title="Logs">Logs</button>
                              <button onClick={() => handleDeleteLiability(f.id)} className="icon-btn w-6 h-6 flex items-center justify-center rounded-md" style={{ color: "var(--text-tertiary)" }} onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#ff3b30")} onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-tertiary)")} title="Delete"><TrashIcon /></button>
                            </div></td>
                          </tr>
                        );
                      }
                    })}
                  </tbody>
                </table>
              </>)}

              {noResults && (
                <div className="py-16 flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-[22px]" style={{ background: "var(--surface-secondary)" }}>{loansFilter === "friends" ? "🤝" : "🏦"}</div>
                  <p className="text-[15px] font-semibold mt-1" style={{ color: "var(--text-primary)" }}>No {loansFilter === "friends" ? "friend transactions" : loansFilter === "banks" ? "bank loans" : "loans"}</p>
                  <p className="text-[13px]" style={{ color: "var(--text-tertiary)" }}>{loansFilter === "friends" ? "Track money you lent or borrowed from friends" : "Add a loan or debt to track it here"}</p>
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
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[16px] shrink-0 mt-0.5" style={{ background: meta.bg }}>{meta.emoji}</div>
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
                        ₹{e.amount.toLocaleString("en-IN")}
                      </p>
                      {mSar !== null && (
                        <p className="text-[12px] font-medium" style={{ color: "var(--text-tertiary)" }}>﷼{mSar.toLocaleString("en-IN")}</p>
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
                            color: e.claim_submitted ? "#34c759" : "#007aff",
                          }}>
                          {e.claim_submitted ? "✓ Claimed" : "Claim Pending"}
                        </span>
                      )}
                      {e.splitwise_applicable && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
                          style={{
                            background: e.splitwise_added ? "rgba(52,199,89,0.12)" : "rgba(255,149,0,0.1)",
                            color: e.splitwise_added ? "#34c759" : "#ff9500",
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
                      onMouseEnter={(ev) => ((ev.currentTarget as HTMLElement).style.color = "#ff3b30")}
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
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[16px] shrink-0" style={{ background: meta.bg }}>{meta.emoji}</div>
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
                          ₹{e.amount.toLocaleString("en-IN")}
                        </span>
                        {dSar !== null && (
                          <p className="text-[12px] font-medium" style={{ color: "var(--text-tertiary)" }}>﷼{dSar.toLocaleString("en-IN")}</p>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {e.claim_eligible ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
                            style={{ background: e.claim_submitted ? "rgba(52,199,89,0.12)" : "rgba(0,122,255,0.1)", color: e.claim_submitted ? "#34c759" : "#007aff" }}>
                            {e.claim_submitted ? "✓ Claimed" : "Pending"}
                          </span>
                        ) : <span style={{ color: "var(--text-tertiary)" }}>—</span>}
                      </td>
                      <td className="px-4 py-4">
                        {e.splitwise_applicable ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
                            style={{ background: e.splitwise_added ? "rgba(52,199,89,0.12)" : "rgba(255,149,0,0.1)", color: e.splitwise_added ? "#34c759" : "#ff9500" }}>
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
                            onMouseEnter={(ev) => ((ev.currentTarget as HTMLElement).style.color = "#ff3b30")}
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
