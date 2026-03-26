"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/lib/ThemeContext";
import { lockScroll, unlockScroll } from "@/lib/scrollLock";

export type ExpenseFormData = {
  title: string;
  amount: string;       // amount in the selected currency
  currency: string;     // "SAR" | "INR"
  sar_rate: string;     // e.g. "22.5" — only relevant when currency = "SAR"
  category: string;
  expense_date: string;
  notes: string;        // plain text note shown/stored by user
  claim_eligible: boolean;
  claim_submitted: boolean;
  splitwise_applicable: boolean;
  splitwise_added: boolean;
};

export const EXPENSE_CATEGORIES = [
  "Food", "Cab", "Groceries", "Shopping", "Bills",
  "Travel", "Medical", "Entertainment", "Office", "Other",
];

export const DEFAULT_SAR_RATE = "24.2";

export const EMPTY_EXPENSE_FORM: ExpenseFormData = {
  title: "",
  amount: "",
  currency: "SAR",
  sar_rate: DEFAULT_SAR_RATE,
  category: "Food",
  expense_date: "",
  notes: "",
  claim_eligible: false,
  claim_submitted: false,
  splitwise_applicable: false,
  splitwise_added: false,
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (data: ExpenseFormData) => void | Promise<void>;
  initialData?: ExpenseFormData | null;
  mode?: "add" | "edit";
};

function XIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ pointerEvents: "none" }}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function fmtIN(raw: string): string {
  if (!raw) return "";
  const [int, dec] = raw.split(".");
  const lastThree = int.length > 3 ? int.slice(-3) : int;
  const rest = int.length > 3 ? int.slice(0, -3) : "";
  const formatted = rest
    ? rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + lastThree
    : lastThree;
  return dec !== undefined ? formatted + "." + dec : formatted;
}
function rawNum(val: string): string { return val.replace(/,/g, ""); }

export default function AddExpenseModal({ open, onClose, onSave, initialData = null, mode = "add" }: Props) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const overlayRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<ExpenseFormData>({ ...EMPTY_EXPENSE_FORM, expense_date: new Date().toISOString().split("T")[0] });
  const [errors, setErrors] = useState<{ title?: boolean; amount?: boolean }>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(initialData ?? { ...EMPTY_EXPENSE_FORM, expense_date: new Date().toISOString().split("T")[0] });
    setErrors({});
    setSaving(false);
    const t = setTimeout(() => firstInputRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, [open, initialData]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    lockScroll();
    return () => unlockScroll();
  }, [open]);

  const setField = <K extends keyof ExpenseFormData>(field: K, value: ExpenseFormData[K]) => {
    setForm((f) => ({ ...f, [field]: value }));
    if (field === "title" && value) setErrors((e) => ({ ...e, title: false }));
    if (field === "amount" && value) setErrors((e) => ({ ...e, amount: false }));
  };

  const handleSave = async () => {
    const newErrors = {
      title: !form.title.trim(),
      amount: !form.amount.trim() || isNaN(Number(form.amount)) || Number(form.amount) <= 0,
    };
    setErrors(newErrors);
    if (newErrors.title || newErrors.amount) return;
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  // Theme tokens — identical to AddLiabilityModal
  const modalBg = isDark ? "rgba(18,18,20,0.96)" : "rgba(255,255,255,0.94)";
  const modalBorder = isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.06)";
  const titleColor = isDark ? "#ffffff" : "#1d1d1f";
  const labelColor = isDark ? "rgba(235,235,245,0.45)" : "#aeaeb2";
  const dividerColor = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)";
  const closeBg = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)";
  const closeColor = isDark ? "rgba(235,235,245,0.6)" : "#86868b";
  const inputBg = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.03)";
  const inputBorder = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";
  const inputColor = isDark ? "#ffffff" : "#1d1d1f";
  const cancelBg = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)";
  const cancelColor = isDark ? "rgba(235,235,245,0.6)" : "#86868b";
  const sectionBg = isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)";

  const inputStyle = (hasError?: boolean): React.CSSProperties => ({
    width: "100%",
    height: 38,
    padding: "0 12px",
    borderRadius: 10,
    border: `1px solid ${hasError ? "#ff3b30" : inputBorder}`,
    background: hasError ? (isDark ? "rgba(255,59,48,0.08)" : "rgba(255,59,48,0.04)") : inputBg,
    fontSize: 16,
    color: inputColor,
    outline: "none",
    transition: "border-color 160ms ease, box-shadow 160ms ease, background 160ms ease",
    boxSizing: "border-box",
  });

  const onFocusInput = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = "rgba(0,122,255,0.6)";
    e.currentTarget.style.boxShadow = `0 0 0 3px ${isDark ? "rgba(0,122,255,0.2)" : "rgba(0,122,255,0.12)"}`;
    e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.09)" : "rgba(255,255,255,0.9)";
  };

  const onBlurInput = (hasError?: boolean) => (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = hasError ? "#ff3b30" : inputBorder;
    e.currentTarget.style.boxShadow = "none";
    e.currentTarget.style.background = hasError
      ? (isDark ? "rgba(255,59,48,0.08)" : "rgba(255,59,48,0.04)")
      : inputBg;
  };

  const Toggle = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
    <button
      type="button"
      onClick={onChange}
      style={{
        width: 40, height: 24, borderRadius: 12,
        background: checked ? "#34c759" : (isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)"),
        border: "none", cursor: "pointer", position: "relative", flexShrink: 0,
        transition: "background 200ms ease",
      }}
    >
      <span style={{
        position: "absolute",
        left: checked ? 18 : 2, top: 2,
        width: 20, height: 20, borderRadius: "50%",
        background: "#ffffff",
        boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
        transition: "left 200ms ease",
        display: "block",
      }} />
    </button>
  );

  const inrPreview = form.currency === "SAR" && Number(form.amount) > 0
    ? Math.round(Number(form.amount) * Number(form.sar_rate || DEFAULT_SAR_RATE))
    : null;

  return (
    <>
      <style>{`
        .ef-input::placeholder { color: ${isDark ? "rgba(235,235,245,0.28)" : "#aeaeb2"}; }
        .ef-input option { background: ${isDark ? "#1c1c1e" : "#ffffff"}; color: ${inputColor}; }
      `}</style>

      <div
        ref={overlayRef}
        onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
        aria-modal="true"
        role="dialog"
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-3 sm:px-4 pb-4 sm:py-6"
        style={{
          background: isDark ? "rgba(0,0,0,0.72)" : "rgba(0,0,0,0.35)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 200ms ease",
        }}
      >
        <div
          style={{
            background: modalBg,
            backdropFilter: "blur(48px) saturate(200%)",
            WebkitBackdropFilter: "blur(48px) saturate(200%)",
            borderRadius: 20,
            border: modalBorder,
            boxShadow: isDark
              ? "0 40px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.05)"
              : "0 32px 64px rgba(0,0,0,0.12), 0 8px 24px rgba(0,0,0,0.06)",
            width: "100%",
            maxWidth: 480,
            maxHeight: "calc(100dvh - 32px)",
            display: "flex",
            flexDirection: "column",
            transform: open ? "scale(1) translateY(0)" : "scale(0.97) translateY(16px)",
            opacity: open ? 1 : 0,
            transition: "transform 260ms cubic-bezier(0.34,1.2,0.64,1), opacity 200ms ease",
          }}
        >
          {/* Header — compact */}
          <div className="flex items-center justify-between px-5 pt-4 pb-3 shrink-0" style={{ borderBottom: `1px solid ${dividerColor}` }}>
            <h2 className="text-[17px] font-semibold" style={{ color: titleColor, letterSpacing: "-0.02em" }}>
              {mode === "edit" ? "Edit Expense" : "Add Expense"}
            </h2>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-full"
              style={{ background: closeBg, color: closeColor, transition: "background 150ms ease" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = isDark ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.1)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = closeBg; }}
              aria-label="Close"
            >
              <XIcon />
            </button>
          </div>

          {/* Form body — tight spacing, no scroll on most phones */}
          <div className="overflow-y-auto flex-1 px-5 pt-3 pb-2 flex flex-col gap-2.5">

            {/* Title */}
            <input
              ref={firstInputRef}
              type="text"
              placeholder="Title *"
              value={form.title}
              onChange={(e) => setField("title", e.target.value)}
              className="ef-input"
              style={inputStyle(errors.title)}
              onFocus={onFocusInput}
              onBlur={onBlurInput(errors.title)}
            />
            {errors.title && <p className="text-[11px] -mt-1.5" style={{ color: "#ff3b30" }}>Title is required</p>}

            {/* Amount + Currency toggle on same row */}
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="decimal"
                placeholder={`Amount (${form.currency === "SAR" ? "﷼" : "₹"}) *`}
                value={fmtIN(form.amount)}
                onChange={(e) => setField("amount", rawNum(e.target.value))}
                className="ef-input"
                style={{ ...inputStyle(errors.amount), flex: 1 }}
                onFocus={onFocusInput}
                onBlur={onBlurInput(errors.amount)}
              />
              {/* Currency pill */}
              <div
                className="flex rounded-[10px] p-[2px] gap-[2px] shrink-0"
                style={{ background: inputBg, border: `1px solid ${inputBorder}` }}
              >
                {(["SAR", "INR"] as const).map((cur) => (
                  <button
                    key={cur}
                    type="button"
                    onClick={() => setField("currency", cur)}
                    className="rounded-[8px] text-[12px] font-semibold transition-all"
                    style={{
                      width: 46, height: 34,
                      background: form.currency === cur ? "#007aff" : "transparent",
                      color: form.currency === cur ? "#ffffff" : labelColor,
                    }}
                  >
                    {cur === "SAR" ? "﷼" : "₹"}
                  </button>
                ))}
              </div>
            </div>
            {errors.amount && <p className="text-[11px] -mt-1.5" style={{ color: "#ff3b30" }}>Amount is required</p>}

            {/* SAR rate + live preview — compact single row */}
            {form.currency === "SAR" && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-[9px]" style={{ background: "rgba(0,122,255,0.07)", border: "1px solid rgba(0,122,255,0.15)" }}>
                <p className="text-[12px] font-medium shrink-0" style={{ color: "#007aff" }}>1﷼ =</p>
                <input
                  type="number"
                  value={form.sar_rate}
                  onChange={(e) => setField("sar_rate", e.target.value)}
                  className="ef-input"
                  style={{ width: 64, height: 32, fontSize: 16, padding: "0 8px", border: "none", background: "transparent", color: inputColor, outline: "none", boxSizing: "border-box" }}
                />
                <p className="text-[12px] font-medium shrink-0" style={{ color: "#007aff" }}>₹</p>
                {inrPreview !== null && (
                  <>
                    <div className="w-px h-3.5 ml-1 shrink-0" style={{ background: "rgba(0,122,255,0.3)" }} />
                    <p className="text-[12px] font-semibold ml-1 shrink-0" style={{ color: "#007aff" }}>
                      ≈ ₹{inrPreview.toLocaleString("en-IN")}
                    </p>
                  </>
                )}
              </div>
            )}

            {/* Date + Category */}
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={form.expense_date}
                onChange={(e) => setField("expense_date", e.target.value)}
                className="ef-input"
                style={inputStyle()}
                onFocus={onFocusInput}
                onBlur={onBlurInput()}
              />
              <div className="relative">
                <select
                  value={form.category}
                  onChange={(e) => setField("category", e.target.value)}
                  className="ef-input"
                  style={{ ...inputStyle(), paddingRight: 30, appearance: "none", WebkitAppearance: "none", cursor: "pointer" }}
                  onFocus={onFocusInput}
                  onBlur={onBlurInput()}
                >
                  {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: labelColor }}>
                  <ChevronIcon />
                </span>
              </div>
            </div>

            {/* Notes */}
            <input
              type="text"
              placeholder="Notes (optional)"
              value={form.notes}
              onChange={(e) => setField("notes", e.target.value)}
              className="ef-input"
              style={inputStyle()}
              onFocus={onFocusInput}
              onBlur={onBlurInput()}
            />

            {/* Claim + Splitwise — combined compact section */}
            <div style={{ background: sectionBg, borderRadius: 11, overflow: "hidden" }}>
              {/* Claim Eligible */}
              <div className="flex items-center justify-between px-3 py-2.5">
                <p className="text-[13px] font-medium" style={{ color: inputColor }}>Claim Eligible</p>
                <Toggle checked={form.claim_eligible} onChange={() => {
                  setField("claim_eligible", !form.claim_eligible);
                  if (form.claim_eligible) setField("claim_submitted", false);
                }} />
              </div>
              {form.claim_eligible && (
                <div className="flex items-center justify-between px-3 py-2.5" style={{ borderTop: `1px solid ${dividerColor}` }}>
                  <p className="text-[13px] font-medium pl-3" style={{ color: labelColor }}>↳ Submitted</p>
                  <Toggle checked={form.claim_submitted} onChange={() => setField("claim_submitted", !form.claim_submitted)} />
                </div>
              )}
              {/* Splitwise */}
              <div className="flex items-center justify-between px-3 py-2.5" style={{ borderTop: `1px solid ${dividerColor}` }}>
                <p className="text-[13px] font-medium" style={{ color: inputColor }}>Splitwise</p>
                <Toggle checked={form.splitwise_applicable} onChange={() => {
                  setField("splitwise_applicable", !form.splitwise_applicable);
                  if (form.splitwise_applicable) setField("splitwise_added", false);
                }} />
              </div>
              {form.splitwise_applicable && (
                <div className="flex items-center justify-between px-3 py-2.5" style={{ borderTop: `1px solid ${dividerColor}` }}>
                  <p className="text-[13px] font-medium pl-3" style={{ color: labelColor }}>↳ Added</p>
                  <Toggle checked={form.splitwise_added} onChange={() => setField("splitwise_added", !form.splitwise_added)} />
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-5 pb-5 pt-3 gap-3 shrink-0" style={{ borderTop: `1px solid ${dividerColor}` }}>
            <button
              onClick={onClose}
              className="h-10 px-5 rounded-[11px] text-[14px] font-medium"
              style={{ color: cancelColor, background: cancelBg, transition: "background 150ms ease" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = isDark ? "rgba(255,255,255,0.13)" : "rgba(0,0,0,0.09)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = cancelBg; }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="h-10 px-6 rounded-[11px] text-[14px] font-semibold text-white flex-1"
              style={{ background: saving ? "#5ac8fa" : "#007aff", transition: "background 150ms ease, transform 150ms ease" }}
              onMouseEnter={(e) => {
                if (!saving) {
                  (e.currentTarget as HTMLElement).style.background = "#0071eb";
                  (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
                }
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = saving ? "#5ac8fa" : "#007aff";
                (e.currentTarget as HTMLElement).style.transform = "none";
              }}
            >
              {saving ? "Saving..." : mode === "edit" ? "Update Expense" : "Save Expense"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
