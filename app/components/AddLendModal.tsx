"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/lib/ThemeContext";
import { lockScroll, unlockScroll } from "@/lib/scrollLock";

export type LendFormData = {
  name: string;
  amount: string;
  date: string;
  due_date: string;
  notes: string;
};

const EMPTY_FORM: LendFormData = {
  name: "",
  amount: "",
  date: "",
  due_date: "",
  notes: "",
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (data: LendFormData) => void | Promise<void>;
  initialData?: LendFormData | null;
  mode?: "add" | "edit";
};

function XIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

export default function AddLendModal({ open, onClose, onSave, initialData = null, mode = "add" }: Props) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const overlayRef = useRef<HTMLDivElement>(null);
  const mouseDownInPanel = useRef(false);
  const firstInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<LendFormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<{ name?: boolean; amount?: boolean }>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(initialData ?? { ...EMPTY_FORM });
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

  const set = (field: keyof LendFormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const value = e.target.value;
    setForm((f) => ({ ...f, [field]: value }));
    if (field === "name" && value) setErrors((err) => ({ ...err, name: false }));
    if (field === "amount" && value) setErrors((err) => ({ ...err, amount: false }));
  };

  const handleSave = async () => {
    const newErrors = {
      name: !form.name.trim(),
      amount: !form.amount.trim() || isNaN(Number(form.amount)),
    };
    setErrors(newErrors);
    if (newErrors.name || newErrors.amount) return;
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

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

  const onFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.currentTarget.style.borderColor = "rgba(0,122,255,0.6)";
    e.currentTarget.style.boxShadow = `0 0 0 3px ${isDark ? "rgba(0,122,255,0.2)" : "rgba(0,122,255,0.12)"}`;
    e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.09)" : "rgba(255,255,255,0.9)";
  };

  const onBlur = (hasError?: boolean) => (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.currentTarget.style.borderColor = hasError ? "#ff3b30" : inputBorder;
    e.currentTarget.style.boxShadow = "none";
    e.currentTarget.style.background = hasError ? (isDark ? "rgba(255,59,48,0.08)" : "rgba(255,59,48,0.04)") : inputBg;
  };

  return (
    <>
      <style>{`
        .lend-input::placeholder { color: ${isDark ? "rgba(235,235,245,0.28)" : "#aeaeb2"}; }
      `}</style>

      <div
        ref={overlayRef}
        onMouseDown={() => { mouseDownInPanel.current = false; }}
        onClick={() => { if (!mouseDownInPanel.current) onClose(); }}
        aria-modal="true"
        role="dialog"
        className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6"
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
          onMouseDown={(e) => { mouseDownInPanel.current = true; e.stopPropagation(); }}
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
                {mode === "edit" ? "Edit Lend" : "Lend Money"}
              </h2>
              <p className="text-[13px] mt-0.5" style={{ color: labelColor }}>
                {mode === "edit" ? "Update lend details" : "Track money you lent to a friend"}
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
            {/* Friend Name */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-1.5">
                <label className="text-[12px] font-semibold uppercase tracking-widest" style={{ color: errors.name ? "#ff3b30" : labelColor }}>
                  Friend Name
                </label>
                <span className="text-[#ff3b30] text-[12px] leading-none">*</span>
              </div>
              <input
                ref={firstInputRef}
                type="text"
                placeholder="e.g. Priya, Arjun"
                value={form.name}
                onChange={set("name")}
                className="lend-input"
                style={inputStyle(errors.name)}
                onFocus={onFocus}
                onBlur={onBlur(errors.name)}
              />
              {errors.name && <p className="text-[12px]" style={{ color: "#ff3b30" }}>Name is required</p>}
            </div>

            {/* Amount */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-1.5">
                <label className="text-[12px] font-semibold uppercase tracking-widest" style={{ color: errors.amount ? "#ff3b30" : labelColor }}>
                  Amount
                </label>
                <span className="text-[#ff3b30] text-[12px] leading-none">*</span>
              </div>
              <input
                type="number"
                placeholder="0.00"
                min="0"
                value={form.amount}
                onChange={set("amount")}
                className="lend-input"
                style={inputStyle(errors.amount)}
                onFocus={onFocus}
                onBlur={onBlur(errors.amount)}
              />
              {errors.amount && <p className="text-[12px]" style={{ color: "#ff3b30" }}>Valid amount is required</p>}
            </div>

            {/* Date + Due Date */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <label className="text-[12px] font-semibold uppercase tracking-widest" style={{ color: labelColor }}>Date Lent</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={set("date")}
                  className="lend-input"
                  style={inputStyle()}
                  onFocus={onFocus}
                  onBlur={onBlur()}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[12px] font-semibold uppercase tracking-widest" style={{ color: labelColor }}>Due Date</label>
                <input
                  type="date"
                  value={form.due_date}
                  onChange={set("due_date")}
                  className="lend-input"
                  style={inputStyle()}
                  onFocus={onFocus}
                  onBlur={onBlur()}
                />
              </div>
            </div>

            {/* Notes */}
            <div className="flex flex-col gap-2">
              <label className="text-[12px] font-semibold uppercase tracking-widest" style={{ color: labelColor }}>Notes</label>
              <input
                type="text"
                placeholder="Optional — reason, context, etc."
                value={form.notes}
                onChange={set("notes")}
                className="lend-input"
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
                  (e.currentTarget as HTMLElement).style.background = "#2ab54a";
                  (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
                }
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = saving ? "#5ac8fa" : "#34c759";
                (e.currentTarget as HTMLElement).style.transform = "none";
              }}
            >
              {saving ? "Saving..." : mode === "edit" ? "Update" : "Save Lend"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
