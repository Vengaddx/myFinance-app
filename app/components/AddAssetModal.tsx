"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/lib/ThemeContext";
import { lockScroll, unlockScroll } from "@/lib/scrollLock";

export type AssetFormData = {
  name: string;
  currency: string;
  invested: string;
  currentValue: string;
  assetType: string;
};

const EMPTY_FORM: AssetFormData = {
  name: "",
  currency: "INR",
  invested: "",
  currentValue: "",
  assetType: "",
};

const CURRENCIES = [
  { value: "INR", label: "₹ INR –" },
  { value: "SAR", label: "﷼ SAR –" },
  { value: "USD", label: "$ USD –" },
];

const ASSET_TYPES = [
  { value: "stocks", label: "Stocks & ETFs" },
  { value: "gold", label: "Gold & Silver" },
  { value: "lended", label: "Lended" },
  { value: "fd", label: "Fixed Deposits" },
  { value: "realestate", label: "Real Estate" },
  { value: "bank", label: "Bank Account" },
  { value: "cash", label: "Cash" },
  { value: "crypto", label: "Crypto" },
  { value: "other", label: "Other" },
];

// Bank and Cash — no invested field, just a balance
const SIMPLE_TYPES = new Set(["bank", "cash"]);

function getInvestedLabel(assetType: string): string {
  if (assetType === "fd") return "Principal";
  if (assetType === "lended") return "Amount Lent";
  if (assetType === "realestate") return "Purchase Price";
  return "Invested";
}

function getCurrentValueLabel(assetType: string): string {
  if (assetType === "bank") return "Balance";
  if (assetType === "cash") return "Cash on Hand";
  if (assetType === "realestate") return "Market Value";
  return "Current Value";
}

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (data: AssetFormData, addAnother: boolean) => void | Promise<void>;
  initialData?: AssetFormData | null;
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

export default function AddAssetModal({ open, onClose, onSave, initialData = null, mode = "add" }: Props) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const overlayRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<AssetFormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<{ name?: boolean; currentValue?: boolean }>({});

  const isSimple = SIMPLE_TYPES.has(form.assetType);
  const investedLabel = getInvestedLabel(form.assetType);
  const currentValueLabel = getCurrentValueLabel(form.assetType);

  useEffect(() => {
    if (!open) return;
    setForm(initialData ?? { ...EMPTY_FORM });
    setErrors({});
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

  const set = (field: keyof AssetFormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const value = e.target.value;
    setForm((f) => ({ ...f, [field]: value }));
    if (field === "name" && value) setErrors((e) => ({ ...e, name: false }));
    if (field === "currentValue" && value) setErrors((e) => ({ ...e, currentValue: false }));
  };

  const handleSave = async () => {
    const newErrors = {
      name: !form.name.trim(),
      currentValue: !form.currentValue.trim(),
    };
    setErrors(newErrors);
    if (newErrors.name || newErrors.currentValue) return;
    await onSave(form, false);
    onClose();
  };

  // Theme tokens
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

  const inputStyle = (hasError?: boolean): React.CSSProperties => ({
    width: "100%",
    height: 42,
    padding: "0 14px",
    borderRadius: 12,
    border: `1px solid ${hasError ? "#ff3b30" : inputBorder}`,
    background: hasError ? (isDark ? "rgba(255,59,48,0.08)" : "rgba(255,59,48,0.04)") : inputBg,
    fontSize: 16,
    color: inputColor,
    outline: "none",
    transition: "border-color 160ms ease, box-shadow 160ms ease, background 160ms ease",
    boxSizing: "border-box",
  });

  const onFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = "rgba(0,122,255,0.6)";
    e.currentTarget.style.boxShadow = `0 0 0 3px ${isDark ? "rgba(0,122,255,0.2)" : "rgba(0,122,255,0.12)"}`;
    e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.09)" : "rgba(255,255,255,0.9)";
  };

  const onBlur = (hasError?: boolean) => (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = hasError ? "#ff3b30" : inputBorder;
    e.currentTarget.style.boxShadow = "none";
    e.currentTarget.style.background = hasError ? (isDark ? "rgba(255,59,48,0.08)" : "rgba(255,59,48,0.04)") : inputBg;
  };

  return (
    <>
      <style>{`
        .mf-input::placeholder { color: ${isDark ? "rgba(235,235,245,0.28)" : "#aeaeb2"}; }
        .mf-input option { background: ${isDark ? "#1c1c1e" : "#ffffff"}; color: ${inputColor}; }
      `}</style>

      <div
        ref={overlayRef}
        onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
        aria-modal="true"
        role="dialog"
        className="fixed inset-0 z-50 flex items-center justify-center px-4"
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
            maxWidth: 460,
            maxHeight: "calc(100dvh - 48px)",
            display: "flex",
            flexDirection: "column",
            transform: open ? "scale(1) translateY(0)" : "scale(0.97) translateY(12px)",
            opacity: open ? 1 : 0,
            transition: "transform 260ms cubic-bezier(0.34,1.2,0.64,1), opacity 200ms ease",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0" style={{ borderBottom: `1px solid ${dividerColor}` }}>
            <div>
              <h2 className="text-[19px] font-semibold" style={{ color: titleColor, letterSpacing: "-0.02em" }}>
                {mode === "edit" ? "Edit Asset" : "Add Asset"}
              </h2>
              <p className="text-[13px] mt-0.5" style={{ color: labelColor }}>
                {mode === "edit" ? "Update asset details" : "Track a new investment"}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full"
              style={{ background: closeBg, color: closeColor, transition: "background 150ms ease" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = isDark ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.1)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = closeBg; }}
              aria-label="Close"
            >
              <XIcon />
            </button>
          </div>

          {/* Form */}
          <div className="overflow-y-auto flex-1 px-6 py-5 flex flex-col gap-4">
            {/* Asset Name */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-1.5">
                <label className="text-[12px] font-semibold uppercase tracking-widest" style={{ color: errors.name ? "#ff3b30" : labelColor }}>
                  Asset Name
                </label>
                <span className="text-[#ff3b30] text-[12px] leading-none">*</span>
              </div>
              <input
                ref={firstInputRef}
                type="text"
                placeholder="e.g. HDFC Bank, Bitcoin, Gold ETF"
                value={form.name}
                onChange={set("name")}
                className="mf-input"
                style={inputStyle(errors.name)}
                onFocus={onFocus}
                onBlur={onBlur(errors.name)}
              />
              {errors.name && <p className="text-[12px]" style={{ color: "#ff3b30" }}>Asset name is required</p>}
            </div>

            {/* Currency + Asset Type */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <label className="text-[12px] font-semibold uppercase tracking-widest" style={{ color: labelColor }}>Currency</label>
                <div className="relative">
                  <select value={form.currency} onChange={set("currency")} className="mf-input"
                    style={{ ...inputStyle(), paddingRight: 36, appearance: "none", WebkitAppearance: "none", cursor: "pointer" }}
                    onFocus={onFocus} onBlur={onBlur()}>
                    {CURRENCIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: labelColor }}><ChevronIcon /></span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[12px] font-semibold uppercase tracking-widest" style={{ color: labelColor }}>Asset Type</label>
                <div className="relative">
                  <select value={form.assetType} onChange={set("assetType")} className="mf-input"
                    style={{ ...inputStyle(), paddingRight: 36, appearance: "none", WebkitAppearance: "none", cursor: "pointer" }}
                    onFocus={onFocus} onBlur={onBlur()}>
                    <option value="" disabled>Select type</option>
                    {ASSET_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: labelColor }}><ChevronIcon /></span>
                </div>
              </div>
            </div>

            {/* Invested — hidden for bank/cash */}
            {!isSimple && (
              <div className="flex flex-col gap-2">
                <label className="text-[12px] font-semibold uppercase tracking-widest" style={{ color: labelColor }}>
                  {investedLabel}
                </label>
                <input
                  type="number"
                  placeholder="0.00"
                  min="0"
                  value={form.invested}
                  onChange={set("invested")}
                  className="mf-input"
                  style={inputStyle()}
                  onFocus={onFocus}
                  onBlur={onBlur()}
                />
              </div>
            )}

            {/* Current Value / Balance */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-1.5">
                <label className="text-[12px] font-semibold uppercase tracking-widest" style={{ color: errors.currentValue ? "#ff3b30" : labelColor }}>
                  {currentValueLabel}
                </label>
                <span className="text-[#ff3b30] text-[12px] leading-none">*</span>
              </div>
              <input
                type="number"
                placeholder="0.00"
                min="0"
                value={form.currentValue}
                onChange={set("currentValue")}
                className="mf-input"
                style={inputStyle(errors.currentValue)}
                onFocus={onFocus}
                onBlur={onBlur(errors.currentValue)}
              />
              {errors.currentValue && (
                <p className="text-[12px]" style={{ color: "#ff3b30" }}>
                  {currentValueLabel} is required
                </p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 pb-6 pt-4 gap-3 shrink-0" style={{ borderTop: `1px solid ${dividerColor}` }}>
            <button
              onClick={onClose}
              className="h-10 px-5 rounded-[12px] text-[14px] font-medium"
              style={{ color: cancelColor, background: cancelBg, transition: "background 150ms ease" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = isDark ? "rgba(255,255,255,0.13)" : "rgba(0,0,0,0.09)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = cancelBg; }}
            >
              Cancel
            </button>

            <button
              onClick={handleSave}
              className="h-10 px-6 rounded-[12px] text-[14px] font-semibold text-white"
              style={{ background: "#007aff", transition: "background 150ms ease, transform 150ms ease" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#0071eb"; (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "#007aff"; (e.currentTarget as HTMLElement).style.transform = "none"; }}
            >
              {mode === "edit" ? "Update Asset" : "Save Asset"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
