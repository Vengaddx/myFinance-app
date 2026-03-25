"use client";

import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

// ─── Constants ────────────────────────────────────────────────────────────────

const UPI_ID    = "deeshvenkat98@okicici";
const PAYEE     = "Deesh";
const TXN_NOTE  = "Support for student laptops";
const PRESETS   = [100, 250, 500, 1000] as const;

function buildUpiLink(amount: number): string {
  return `tez://upi/pay?pa=${UPI_ID}&pn=${encodeURIComponent(PAYEE)}&tn=${encodeURIComponent(TXN_NOTE)}&am=${amount}&cu=INR`;
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function HeartIcon({ size = 22, filled = false }: { size?: number; filled?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function CopyIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function DonateModal({ open, onClose }: Props) {
  const [selected, setSelected]   = useState<number>(250);
  const [custom, setCustom]       = useState("");
  const [copied, setCopied]       = useState(false);
  const [visible, setVisible]     = useState(false);
  const customRef                 = useRef<HTMLInputElement>(null);

  // Amount in use
  const customNum = custom === "" ? NaN : Number(custom);
  const amount    = !isNaN(customNum) && customNum > 0 ? customNum : selected;
  const upiLink   = buildUpiLink(amount);

  // Animate in/out
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      const t = setTimeout(() => setVisible(true), 20);
      return () => clearTimeout(t);
    } else {
      setVisible(false);
      const t = setTimeout(() => { document.body.style.overflow = ""; }, 350);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Reset on open
  useEffect(() => {
    if (open) {
      setSelected(250);
      setCustom("");
      setCopied(false);
    }
  }, [open]);

  // Keyboard dismiss
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  function handleCopy() {
    navigator.clipboard.writeText(UPI_ID).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    });
  }

  function handlePay() {
    window.location.href = upiLink;
  }

  function handleCustomChange(val: string) {
    // Only digits
    if (val === "" || /^\d+$/.test(val)) setCustom(val);
    if (val !== "") setSelected(0); // deselect preset
  }

  function handlePresetClick(p: number) {
    setSelected(p);
    setCustom("");
  }

  if (!open && !visible) return null;

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        background: visible ? "rgba(0,0,0,0.50)" : "rgba(0,0,0,0)",
        backdropFilter: visible ? "blur(12px)" : "none",
        WebkitBackdropFilter: visible ? "blur(12px)" : "none",
        transition: "background 320ms ease, backdrop-filter 320ms ease",
        padding: "0 0 0 0",
      }}
    >
      {/* Sheet */}
      <div
        style={{
          background: "var(--surface)",
          borderRadius: "28px 28px 0 0",
          width: "100%",
          maxWidth: 480,
          maxHeight: "92dvh",
          overflowY: "auto",
          padding: "0 0 calc(env(safe-area-inset-bottom) + 24px) 0",
          boxShadow: "0 -2px 60px rgba(0,0,0,0.28), 0 0 0 1px rgba(255,255,255,0.06)",
          transform: visible ? "translateY(0)" : "translateY(100%)",
          transition: "transform 400ms cubic-bezier(0.32, 0.72, 0, 1)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Drag handle */}
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 12, paddingBottom: 4, flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--separator)" }} />
        </div>

        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 24px 0",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ color: "#ff2d55", display: "flex" }}>
              <HeartIcon size={22} filled />
            </div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>
              Donate
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 30,
              height: 30,
              borderRadius: "50%",
              background: "var(--surface-secondary)",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-secondary)",
              fontSize: 18,
              cursor: "pointer",
              lineHeight: 1,
              flexShrink: 0,
            }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: "14px 20px 0", display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Message — compact inline strip */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "9px 12px",
            background: "rgba(255,45,85,0.06)",
            borderRadius: 12,
            border: "1px solid rgba(255,45,85,0.12)",
          }}>
            <span style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.45 }}>
              Contributions help buy laptops for needy students.
            </span>
          </div>

          {/* Amount presets */}
          <div>
            <Label>Choose Amount</Label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 7, marginTop: 8 }}>
              {PRESETS.map((p) => {
                const active = selected === p && custom === "";
                return (
                  <button
                    key={p}
                    onClick={() => handlePresetClick(p)}
                    style={{
                      padding: "9px 4px",
                      borderRadius: 12,
                      border: "1px solid",
                      borderColor: active ? "#ff2d55" : "var(--separator)",
                      background: active ? "rgba(255,45,85,0.08)" : "var(--surface-secondary)",
                      color: active ? "#ff2d55" : "var(--text-primary)",
                      fontWeight: active ? 700 : 500,
                      fontSize: 14,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      transition: "all 140ms ease",
                      boxShadow: active ? "0 2px 8px rgba(255,45,85,0.18)" : "none",
                    }}
                  >
                    ₹{p}
                  </button>
                );
              })}
            </div>

            {/* Custom amount */}
            <div style={{ position: "relative", marginTop: 7 }}>
              <span style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: 14,
                color: "var(--text-secondary)",
                pointerEvents: "none",
              }}>₹</span>
              <input
                ref={customRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={custom}
                onChange={(e) => handleCustomChange(e.target.value)}
                placeholder="Custom amount"
                style={{
                  width: "100%",
                  padding: "9px 12px 9px 24px",
                  borderRadius: 12,
                  border: `1px solid ${custom ? "#ff2d55" : "var(--separator)"}`,
                  background: custom ? "rgba(255,45,85,0.06)" : "var(--surface-secondary)",
                  color: "var(--text-primary)",
                  fontSize: 14,
                  outline: "none",
                  boxSizing: "border-box",
                  fontFamily: "inherit",
                  transition: "border-color 140ms ease, background 140ms ease",
                }}
              />
            </div>
          </div>

          {/* QR + UPI side by side */}
          <div style={{
            display: "flex",
            gap: 14,
            alignItems: "center",
            padding: "14px",
            background: "var(--surface-secondary)",
            borderRadius: 16,
            border: "1px solid var(--separator)",
          }}>
            {/* QR code */}
            <div style={{
              padding: 10,
              background: "#ffffff",
              borderRadius: 14,
              boxShadow: "0 1px 8px rgba(0,0,0,0.10)",
              flexShrink: 0,
              display: "flex",
            }}>
              <QRCodeSVG
                value={upiLink}
                size={108}
                level="M"
                bgColor="#ffffff"
                fgColor="#1d1d1f"
              />
            </div>

            {/* UPI info */}
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
              <Label>UPI ID</Label>
              <span style={{
                fontSize: 13,
                color: "var(--text-primary)",
                fontWeight: 500,
                fontFamily: "monospace, 'SF Mono', Menlo",
                wordBreak: "break-all",
                lineHeight: 1.4,
              }}>
                {UPI_ID}
              </span>
              <button
                onClick={handleCopy}
                style={{
                  alignSelf: "flex-start",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "5px 11px",
                  borderRadius: 9,
                  border: "none",
                  background: copied ? "rgba(52,199,89,0.12)" : "rgba(0,122,255,0.10)",
                  color: copied ? "#34c759" : "#007aff",
                  fontWeight: 600,
                  fontSize: 12,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "all 180ms ease",
                  whiteSpace: "nowrap",
                  marginTop: 2,
                }}
              >
                {copied ? <CheckIcon size={12} /> : <CopyIcon size={12} />}
                {copied ? "Copied!" : "Copy ID"}
              </button>
              <span style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 2 }}>
                ₹{amount.toLocaleString("en-IN")} · Scan or copy to pay
              </span>
            </div>
          </div>

          {/* Pay button */}
          <button
            onClick={handlePay}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: 16,
              background: "linear-gradient(135deg, #ff2d55 0%, #ff6b35 100%)",
              border: "none",
              color: "#fff",
              fontWeight: 700,
              fontSize: 15,
              cursor: "pointer",
              fontFamily: "inherit",
              boxShadow: "0 4px 20px rgba(255,45,85,0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              transition: "opacity 150ms ease, transform 150ms ease",
            }}
            onMouseDown={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.98)"; }}
            onMouseUp={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
          >
            <HeartIcon size={16} filled />
            Pay ₹{amount.toLocaleString("en-IN")} via Google Pay
          </button>
        </div>
      </div>

      {/* Copied toast */}
      {copied && (
        <div
          style={{
            position: "fixed",
            bottom: "calc(env(safe-area-inset-bottom) + 100px)",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(52,199,89,0.95)",
            color: "#fff",
            padding: "9px 20px",
            borderRadius: 24,
            fontSize: 14,
            fontWeight: 600,
            boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
            whiteSpace: "nowrap",
            animation: "bio-fade-in 200ms ease both",
            zIndex: 2100,
          }}
        >
          UPI ID copied!
        </div>
      )}
    </div>
  );
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function Label({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      color: "var(--text-secondary)",
      fontSize: 11,
      fontWeight: 600,
      textTransform: "uppercase",
      letterSpacing: "0.6px",
      ...style,
    }}>
      {children}
    </div>
  );
}
