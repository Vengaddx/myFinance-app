"use client";

import { useEffect, useRef, useState } from "react";

export type AssetFormData = {
  name: string;
  currency: string;
  shares: string;
  avgPurchasePrice: string;
  currentValue: string;
  assetType: string;
};

const EMPTY_FORM: AssetFormData = {
  name: "",
  currency: "INR",
  shares: "",
  avgPurchasePrice: "",
  currentValue: "",
  assetType: "",
};

const CURRENCIES = [
  { value: "INR", label: "₹ INR – Indian Rupee" },
  { value: "USD", label: "$ USD – US Dollar" },
  { value: "EUR", label: "€ EUR – Euro" },
  { value: "GBP", label: "£ GBP – British Pound" },
  { value: "JPY", label: "¥ JPY – Japanese Yen" },
  { value: "AED", label: "د.إ AED – UAE Dirham" },
  { value: "SGD", label: "S$ SGD – Singapore Dollar" },
];

const ASSET_TYPES = [
  { value: "stocks",     label: "Stocks & ETFs" },
  { value: "gold",       label: "Gold & Silver" },
  { value: "fixed",      label: "Fixed Income" },
  { value: "realestate", label: "Real Estate" },
  { value: "cash",       label: "Cash & Savings" },
  { value: "crypto",     label: "Crypto" },
  { value: "other",      label: "Other" },
];

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (data: AssetFormData, addAnother: boolean) => void;
};

function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ pointerEvents: "none" }}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export default function AddAssetModal({ open, onClose, onSave }: Props) {
  const [form, setForm] = useState<AssetFormData>(EMPTY_FORM);
  const firstInputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  /* Focus first field when opened */
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => firstInputRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
  }, [open]);

  /* Escape key */
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  /* Prevent body scroll */
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const set = (field: keyof AssetFormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === overlayRef.current) onClose();
  };

  const handleSave = (addAnother: boolean) => {
    onSave(form, addAnother);
    if (addAnother) setForm(EMPTY_FORM);
    else onClose();
  };

  const reset = () => setForm(EMPTY_FORM);

  return (
    <>
      {/* ── Overlay ── */}
      <div
        ref={overlayRef}
        onClick={handleOverlayClick}
        aria-modal="true"
        role="dialog"
        aria-label="Add Asset"
        className="fixed inset-0 z-50 flex items-center justify-center px-4"
        style={{
          background: "rgba(0,0,0,0.28)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 220ms cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        {/* ── Modal panel ── */}
        <div
          style={{
            background: "rgba(255,255,255,0.82)",
            backdropFilter: "blur(40px) saturate(180%)",
            WebkitBackdropFilter: "blur(40px) saturate(180%)",
            borderRadius: 20,
            border: "1px solid rgba(255,255,255,0.6)",
            boxShadow:
              "0 32px 64px rgba(0,0,0,0.14), 0 8px 24px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.9)",
            width: "100%",
            maxWidth: 480,
            transform: open ? "scale(1) translateY(0)" : "scale(0.96) translateY(8px)",
            opacity: open ? 1 : 0,
            transition: "transform 240ms cubic-bezier(0.34,1.3,0.64,1), opacity 220ms cubic-bezier(0.4,0,0.2,1)",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-6 pt-5 pb-4"
            style={{ borderBottom: "1px solid rgba(60,60,67,0.08)" }}
          >
            <h2 className="text-[17px] font-semibold" style={{ color: "#1d1d1f", letterSpacing: "-0.01em" }}>
              Add Asset
            </h2>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-full transition-colors"
              style={{ background: "rgba(60,60,67,0.08)", color: "#86868b" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(60,60,67,0.14)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(60,60,67,0.08)"; }}
              aria-label="Close"
            >
              <XIcon />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-5 flex flex-col gap-4">
            {/* Name */}
            <Field label="Asset Name">
              <input
                ref={firstInputRef}
                type="text"
                placeholder="e.g. HDFC Bank, Bitcoin, Gold ETF"
                value={form.name}
                onChange={set("name")}
                style={inputStyle}
                onFocus={focusStyle}
                onBlur={blurStyle}
              />
            </Field>

            {/* Currency + Asset Type side by side */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Currency">
                <div className="relative">
                  <select value={form.currency} onChange={set("currency")} style={{ ...inputStyle, paddingRight: 32, appearance: "none", WebkitAppearance: "none" }}
                    onFocus={focusStyle} onBlur={blurStyle}>
                    {CURRENCIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "#aeaeb2" }}>
                    <ChevronIcon />
                  </span>
                </div>
              </Field>

              <Field label="Asset Type">
                <div className="relative">
                  <select value={form.assetType} onChange={set("assetType")} style={{ ...inputStyle, paddingRight: 32, appearance: "none", WebkitAppearance: "none" }}
                    onFocus={focusStyle} onBlur={blurStyle}>
                    <option value="" disabled>Select type</option>
                    {ASSET_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "#aeaeb2" }}>
                    <ChevronIcon />
                  </span>
                </div>
              </Field>
            </div>

            {/* Shares */}
            <Field label="No. of Shares / Units">
              <input
                type="number"
                placeholder="0"
                min="0"
                value={form.shares}
                onChange={set("shares")}
                style={inputStyle}
                onFocus={focusStyle}
                onBlur={blurStyle}
              />
            </Field>

            {/* Avg purchase price + Current value side by side */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Avg Purchase Price">
                <input
                  type="number"
                  placeholder="0.00"
                  min="0"
                  value={form.avgPurchasePrice}
                  onChange={set("avgPurchasePrice")}
                  style={inputStyle}
                  onFocus={focusStyle}
                  onBlur={blurStyle}
                />
              </Field>

              <Field label="Current Value">
                <input
                  type="number"
                  placeholder="0.00"
                  min="0"
                  value={form.currentValue}
                  onChange={set("currentValue")}
                  style={inputStyle}
                  onFocus={focusStyle}
                  onBlur={blurStyle}
                />
              </Field>
            </div>
          </div>

          {/* Footer */}
          <div
            className="flex items-center justify-between px-6 pb-5 pt-4 gap-3"
            style={{ borderTop: "1px solid rgba(60,60,67,0.08)" }}
          >
            <button
              onClick={() => { reset(); onClose(); }}
              className="h-9 px-4 rounded-[10px] text-[13px] font-medium transition-colors"
              style={{ color: "#86868b", background: "rgba(60,60,67,0.07)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(60,60,67,0.12)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(60,60,67,0.07)"; }}
            >
              Cancel
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleSave(true)}
                className="h-9 px-4 rounded-[10px] text-[13px] font-medium transition-colors"
                style={{ color: "#007aff", background: "rgba(0,122,255,0.08)", border: "1px solid rgba(0,122,255,0.18)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(0,122,255,0.14)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(0,122,255,0.08)"; }}
              >
                Save &amp; Add Another
              </button>

              <button
                onClick={() => handleSave(false)}
                className="h-9 px-4 rounded-[10px] text-[13px] font-semibold text-white transition-colors"
                style={{ background: "#007aff" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#0071eb"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "#007aff"; }}
              >
                Save Asset
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ── Field wrapper ── */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-semibold uppercase" style={{ color: "#aeaeb2", letterSpacing: "0.07em" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

/* ── Shared input style ── */
const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 38,
  padding: "0 12px",
  borderRadius: 10,
  border: "1px solid rgba(60,60,67,0.14)",
  background: "rgba(255,255,255,0.7)",
  fontSize: 13,
  color: "#1d1d1f",
  outline: "none",
  transition: "border-color 160ms ease-out, box-shadow 160ms ease-out",
  boxSizing: "border-box",
};

function focusStyle(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.currentTarget.style.borderColor = "rgba(0,122,255,0.5)";
  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,122,255,0.12)";
}

function blurStyle(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.currentTarget.style.borderColor = "rgba(60,60,67,0.14)";
  e.currentTarget.style.boxShadow = "none";
}
