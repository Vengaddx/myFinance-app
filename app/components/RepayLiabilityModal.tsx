"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/lib/ThemeContext";

type Props = {
  open: boolean;
  onClose: () => void;
  onRepay: (amount: number, date: string, remarks: string) => Promise<void>;
  liabilityName: string;
  outstanding: number;
  currency: string;
};

export default function RepayLiabilityModal({ open, onClose, onRepay, liabilityName, outstanding, currency }: Props) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const overlayRef = useRef<HTMLDivElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);

  const today = new Date().toISOString().split("T")[0];
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today);
  const [remarks, setRemarks] = useState("");
  const [errors, setErrors] = useState<{ amount?: boolean; amountExceeds?: boolean }>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setAmount("");
    setDate(today);
    setRemarks("");
    setErrors({});
    setSaving(false);
    setTimeout(() => amountRef.current?.focus(), 80);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const handleSave = async () => {
    const amt = Number(amount);
    const newErrors: typeof errors = {};
    if (!amount || amt <= 0) newErrors.amount = true;
    if (amt > outstanding) newErrors.amountExceeds = true;
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;
    setSaving(true);
    try {
      await onRepay(amt, date, remarks);
    } finally {
      setSaving(false);
    }
  };

  const currencySymbol = currency === "USD" ? "$" : currency === "SAR" ? "﷼" : "₹";

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

  const onFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = "rgba(0,122,255,0.6)";
    e.currentTarget.style.boxShadow = `0 0 0 3px ${isDark ? "rgba(0,122,255,0.2)" : "rgba(0,122,255,0.12)"}`;
    e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.09)" : "rgba(255,255,255,0.9)";
  };

  const onBlur = (hasError?: boolean) => (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = hasError ? "#ff3b30" : inputBorder;
    e.currentTarget.style.boxShadow = "none";
    e.currentTarget.style.background = hasError ? (isDark ? "rgba(255,59,48,0.08)" : "rgba(255,59,48,0.04)") : inputBg;
  };

  return (
    <>
      <style>{`
        .rpf-input::placeholder { color: ${isDark ? "rgba(235,235,245,0.28)" : "#aeaeb2"}; }
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
            maxWidth: 420,
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
                Record Repayment
              </h2>
              <p className="text-[13px] mt-0.5" style={{ color: labelColor }}>{liabilityName}</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full"
              style={{ background: closeBg, color: closeColor, transition: "background 150ms ease" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = isDark ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.1)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = closeBg; }}
              aria-label="Close"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Outstanding info */}
          <div className="px-6 pt-4 pb-1 shrink-0">
            <div
              className="flex items-center justify-between rounded-[12px] px-4 py-3"
              style={{ background: isDark ? "rgba(255,59,48,0.08)" : "rgba(255,59,48,0.05)" }}
            >
              <span className="text-[13px] font-medium" style={{ color: labelColor }}>Outstanding balance</span>
              <span className="text-[15px] font-bold" style={{ color: "#ff3b30" }}>
                {currencySymbol}{outstanding.toLocaleString("en-IN")}
              </span>
            </div>
          </div>

          {/* Form */}
          <div className="overflow-y-auto flex-1 px-6 py-4 flex flex-col gap-4">
            {/* Amount */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-1.5">
                <label className="text-[12px] font-semibold uppercase tracking-widest" style={{ color: (errors.amount || errors.amountExceeds) ? "#ff3b30" : labelColor }}>
                  Repayment Amount
                </label>
                <span className="text-[#ff3b30] text-[12px] leading-none">*</span>
              </div>
              <input
                ref={amountRef}
                type="number"
                placeholder="0.00"
                min="0"
                value={amount}
                onChange={(e) => { setAmount(e.target.value); setErrors({}); }}
                className="rpf-input"
                style={inputStyle(errors.amount || errors.amountExceeds)}
                onFocus={onFocus}
                onBlur={onBlur(errors.amount || errors.amountExceeds)}
              />
              {errors.amount && <p className="text-[12px]" style={{ color: "#ff3b30" }}>Enter a valid amount</p>}
              {errors.amountExceeds && <p className="text-[12px]" style={{ color: "#ff3b30" }}>Cannot exceed outstanding ({currencySymbol}{outstanding.toLocaleString("en-IN")})</p>}
            </div>

            {/* Date */}
            <div className="flex flex-col gap-2">
              <label className="text-[12px] font-semibold uppercase tracking-widest" style={{ color: labelColor }}>Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="rpf-input"
                style={inputStyle()}
                onFocus={onFocus}
                onBlur={onBlur()}
              />
            </div>

            {/* Remarks */}
            <div className="flex flex-col gap-2">
              <label className="text-[12px] font-semibold uppercase tracking-widest" style={{ color: labelColor }}>Remarks</label>
              <input
                type="text"
                placeholder="Optional note"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="rpf-input"
                style={inputStyle()}
                onFocus={onFocus}
                onBlur={onBlur()}
              />
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
              disabled={saving}
              className="h-10 px-6 rounded-[12px] text-[14px] font-semibold text-white"
              style={{
                background: saving ? "#5ac8fa" : "#34c759",
                transition: "background 150ms ease, transform 150ms ease",
              }}
              onMouseEnter={(e) => {
                if (!saving) {
                  (e.currentTarget as HTMLElement).style.background = "#2fb350";
                  (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
                }
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = saving ? "#5ac8fa" : "#34c759";
                (e.currentTarget as HTMLElement).style.transform = "none";
              }}
            >
              {saving ? "Saving..." : "Record Repayment"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
